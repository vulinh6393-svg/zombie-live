import { BASTION_GEOMETRY } from './BastionGeometryConfig.js';

export type GateCollisionState = 'CLOSED' | 'OPENING' | 'OPEN' | 'CLOSING';
export type WallCollisionState = 'INTACT' | 'DAMAGED' | 'BREACHED';

export interface CollisionResult {
  readonly collided: boolean;
  readonly resolvedX: number;
  readonly resolvedY: number;
  readonly segment?: 'LEFT_WALL' | 'GATE' | 'RIGHT_WALL';
  readonly passThroughReason?: 'GATE_OPEN' | 'WALL_BREACHED';
}

export interface WallState {
  readonly id: 'LEFT' | 'RIGHT';
  state: WallCollisionState;
  hp: number;
  readonly maxHp: number;
}

/**
 * BASTION DYNAMIC COLLISION SYSTEM — SHARED AUTHORITATIVE ENGINE
 * 
 * Kiểm tra và giải quyết va chạm hình học thời gian thực (Real-time Geometric Collision):
 * - Không phụ thuộc Phaser/DOM, chạy 100% trên Node.js Game Server và Client Renderer.
 * - Tính toán chính xác theo mép vật lý thực của hai cánh cửa (doorWidth = 115px, half-width = 57.5px)
 *   và bán kính thực thể (radius = 20px).
 * - Hành lang an toàn khi mở hoàn toàn (x=430, 650): [507.5, 572.5].
 * - Xử lý va chạm động liên tục trong cả 4 trạng thái: CLOSED, OPENING, OPEN, CLOSING.
 * - Quy tắc xử lý CLOSING: Thực thể ở nửa bắc thông đạo (y <= 890) bị đẩy lùi về y = 820;
 *   thực thể đã qua nửa nam (y > 890) được đẩy tiếp về phía trước sân thành y = 960 (không teleport xuyên tường).
 */
export class BastionCollisionSystem {
  private gateState: GateCollisionState = 'CLOSED';
  private gateDoorLeftX: number;
  private gateDoorRightX: number;

  private leftWall: WallState = { id: 'LEFT', state: 'INTACT', hp: 1000, maxHp: 1000 };
  private rightWall: WallState = { id: 'RIGHT', state: 'INTACT', hp: 1000, maxHp: 1000 };

  readonly collisionLineY = BASTION_GEOMETRY.collisionLineY; // 840
  readonly doorHalfWidth = BASTION_GEOMETRY.blastGate.doorWidth / 2; // 57.5

  constructor() {
    this.gateDoorLeftX = BASTION_GEOMETRY.blastGate.doorLeftClosedX; // 483
    this.gateDoorRightX = BASTION_GEOMETRY.blastGate.doorRightClosedX; // 597
  }

  // --- GATE STATE MUTATORS ---
  public setGateState(state: GateCollisionState) {
    this.gateState = state;
    if (state === 'CLOSED') {
      this.gateDoorLeftX = BASTION_GEOMETRY.blastGate.doorLeftClosedX;
      this.gateDoorRightX = BASTION_GEOMETRY.blastGate.doorRightClosedX;
    } else if (state === 'OPEN') {
      this.gateDoorLeftX = BASTION_GEOMETRY.blastGate.doorLeftOpenX;
      this.gateDoorRightX = BASTION_GEOMETRY.blastGate.doorRightOpenX;
    }
  }

  /**
   * Cập nhật vị trí tức thời của 2 cánh cửa trong quá trình OPENING / CLOSING
   */
  public updateGateDoors(doorLeftX: number, doorRightX: number) {
    this.gateDoorLeftX = doorLeftX;
    this.gateDoorRightX = doorRightX;
  }

  public getGateState(): GateCollisionState {
    return this.gateState;
  }

  public getGateDoorPositions(): { leftX: number; rightX: number } {
    return { leftX: this.gateDoorLeftX, rightX: this.gateDoorRightX };
  }

  /**
   * Tính toán khoảng hở thông đạo an toàn tức thời cho một thực thể có bán kính radius
   * Mép trong cánh trái: gateDoorLeftX + 57.5
   * Mép trong cánh phải: gateDoorRightX - 57.5
   * Khoảng an toàn cho tâm thực thể: [innerEdgeLeft + radius, innerEdgeRight - radius]
   */
  public getSafeCorridorBounds(radius: number = 20): { safeMinX: number; safeMaxX: number; isOpen: boolean } {
    const innerEdgeLeft = this.gateDoorLeftX + this.doorHalfWidth;
    const innerEdgeRight = this.gateDoorRightX - this.doorHalfWidth;
    const safeMinX = innerEdgeLeft + radius;
    const safeMaxX = innerEdgeRight - radius;
    const isOpen = safeMinX < safeMaxX;
    return { safeMinX, safeMaxX, isOpen };
  }

  // --- WALL STATE MUTATORS ---
  public setWallState(id: 'LEFT' | 'RIGHT', state: WallCollisionState, hp?: number) {
    const wall = id === 'LEFT' ? this.leftWall : this.rightWall;
    wall.state = state;
    if (hp !== undefined) wall.hp = Math.max(0, hp);
  }

  public damageWall(id: 'LEFT' | 'RIGHT', damage: number): WallState {
    const wall = id === 'LEFT' ? this.leftWall : this.rightWall;
    wall.hp = Math.max(0, wall.hp - damage);
    if (wall.hp <= 0) {
      wall.state = 'BREACHED';
    } else if (wall.hp < wall.maxHp * 0.6) {
      wall.state = 'DAMAGED';
    } else {
      wall.state = 'INTACT';
    }
    return wall;
  }

  public getWallState(id: 'LEFT' | 'RIGHT'): Readonly<WallState> {
    return id === 'LEFT' ? this.leftWall : this.rightWall;
  }

  public getWallStates(): { left: Readonly<WallState>; right: Readonly<WallState> } {
    return { left: this.leftWall, right: this.rightWall };
  }

  /**
   * Kiểm tra và giải quyết va chạm cho thực thể đang di chuyển từ (currX, currY) tới (nextX, nextY)
   * @param currX Tọa độ x hiện tại
   * @param currY Tọa độ y hiện tại
   * @param nextX Tọa độ x dự kiến
   * @param nextY Tọa độ y dự kiến
   * @param radius Bán kính va chạm của thực thể
   */
  public resolveMovement(
    currX: number,
    currY: number,
    nextX: number,
    nextY: number,
    radius: number = 20
  ): CollisionResult {
    const boundaryY = this.collisionLineY; // 840
    const gateThresholdBottomY = boundaryY + 110; // 950 (vùng sâu trong thông đạo cổng)

    // Kiểm tra xem thực thể có đang tương tác với vùng phòng tuyến hay không
    const isCrossingFromNorth = currY <= boundaryY && nextY + radius >= boundaryY;
    const isInsideGateThreshold = currY > boundaryY && currY <= gateThresholdBottomY;

    if (!isCrossingFromNorth && !isInsideGateThreshold) {
      // Ngoài phạm vi va chạm phòng tuyến
      return {
        collided: false,
        resolvedX: nextX,
        resolvedY: nextY,
      };
    }

    // 1. Lane Alpha (Left Wall): x trong [30, 390)
    if (nextX >= BASTION_GEOMETRY.lanes[0].xMin && nextX < BASTION_GEOMETRY.blastGate.corridorXMin) {
      if (this.leftWall.state !== 'BREACHED') {
        return {
          collided: true,
          resolvedX: nextX,
          resolvedY: boundaryY - radius,
          segment: 'LEFT_WALL',
        };
      } else {
        return {
          collided: false,
          resolvedX: nextX,
          resolvedY: nextY,
          passThroughReason: 'WALL_BREACHED',
        };
      }
    }

    // 2. Lane Bravo (Blast Gate): x trong [390, 690]
    if (nextX >= BASTION_GEOMETRY.blastGate.corridorXMin && nextX <= BASTION_GEOMETRY.blastGate.corridorXMax) {
      // Tính toán khoảng hở động tức thời tại tick hiện tại
      const { safeMinX, safeMaxX, isOpen } = this.getSafeCorridorBounds(radius);

      // Cổng đóng hoàn toàn
      if (this.gateState === 'CLOSED' || !isOpen) {
        // Nếu thực thể đang kẹt trong thông đạo khi cửa đóng lại
        if (isInsideGateThreshold) {
          // Quy tắc vật lý xác định: Nếu đã đi qua quá nửa cổng (y > 890), đẩy về phía nam vào sân thành
          // Nếu vẫn ở nửa trước (y <= 890), đẩy lùi về phía bắc trước cổng
          const resolvedY = currY > 890 ? gateThresholdBottomY + 10 : boundaryY - radius;
          // Kẹp x an toàn trong ranh giới cổng, không ép xuyên tường
          const resolvedX = Math.max(BASTION_GEOMETRY.blastGate.portalXMin + radius, Math.min(BASTION_GEOMETRY.blastGate.portalXMax - radius, nextX));
          return {
            collided: true,
            resolvedX,
            resolvedY,
            segment: 'GATE',
          };
        }

        return {
          collided: true,
          resolvedX: nextX,
          resolvedY: boundaryY - radius,
          segment: 'GATE',
        };
      }

      // Kiểm tra thực thể có nằm trọn trong hành lang thông suốt không
      const inClearCorridor = nextX > safeMinX && nextX < safeMaxX;

      if (inClearCorridor) {
        // Thông đạo an toàn, cho phép di chuyển tiếp tục
        return {
          collided: false,
          resolvedX: nextX,
          resolvedY: nextY,
          passThroughReason: 'GATE_OPEN',
        };
      } else {
        // Va vào cánh cửa bên trái hoặc bên phải đang mở dở hoặc đang đóng lại
        // Quy tắc xác định: Đẩy lùi về phía bắc (nếu ở ngoài) hoặc đẩy về hướng an toàn nhất
        let resolvedY = boundaryY - radius;
        if (isInsideGateThreshold) {
          resolvedY = currY > 890 ? gateThresholdBottomY + 10 : boundaryY - radius;
        }
        return {
          collided: true,
          resolvedX: nextX,
          resolvedY,
          segment: 'GATE',
        };
      }
    }

    // 3. Lane Charlie (Right Wall): x trong (690, 1050]
    if (nextX > BASTION_GEOMETRY.blastGate.corridorXMax && nextX <= BASTION_GEOMETRY.lanes[2].xMax) {
      if (this.rightWall.state !== 'BREACHED') {
        return {
          collided: true,
          resolvedX: nextX,
          resolvedY: boundaryY - radius,
          segment: 'RIGHT_WALL',
        };
      } else {
        return {
          collided: false,
          resolvedX: nextX,
          resolvedY: nextY,
          passThroughReason: 'WALL_BREACHED',
        };
      }
    }

    // Ngoài biên bản đồ
    return {
      collided: true,
      resolvedX: nextX,
      resolvedY: boundaryY - radius,
    };
  }
}
