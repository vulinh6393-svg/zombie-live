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
    const targetY = boundaryY - radius; // 820

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

    const stepDist = Math.abs(nextY - currY);
    const maxPush = Math.max(stepDist * 1.2, 4.0);

    // 1. Lane Alpha (Left Wall): x trong [30, 390)
    if (nextX >= BASTION_GEOMETRY.lanes[0].xMin && nextX < BASTION_GEOMETRY.blastGate.corridorXMin) {
      if (this.leftWall.state !== 'BREACHED') {
        const resolvedY = currY > targetY ? Math.max(targetY, currY - maxPush) : Math.min(nextY, targetY);
        return {
          collided: true,
          resolvedX: nextX,
          resolvedY,
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

      // Cổng đóng hoàn toàn hoặc đang khép cửa không đủ khoảng hở an toàn
      if (this.gateState === 'CLOSED' || !isOpen) {
        // Nếu thực thể đang ở trong khu vực thông đạo khi cửa đóng lại
        if (isInsideGateThreshold) {
          // Continuous contact resolution: Tuyệt đối KHÔNG teleport tức thời
          // 1. Nếu thực thể đã đi qua quá nửa cổng (currY > 890): tiếp tục tiến về nam với vận tốc tự nhiên, không giật lùi
          if (currY > 890) {
            const resolvedY = currY + Math.max(0, nextY - currY);
            const resolvedX = Math.max(
              BASTION_GEOMETRY.blastGate.portalXMin + radius,
              Math.min(BASTION_GEOMETRY.blastGate.portalXMax - radius, nextX)
            );
            return {
              collided: false,
              resolvedX,
              resolvedY,
              passThroughReason: 'GATE_OPEN',
            };
          }

          // 2. Nếu thực thể ở nửa bắc (currY <= 890): Đẩy lùi liên tục về phía bắc với tốc độ trượt mượt mà (smooth contact push-back)
          const resolvedY = Math.max(targetY, currY - maxPush);
          const resolvedX = Math.max(
            BASTION_GEOMETRY.blastGate.portalXMin + radius,
            Math.min(BASTION_GEOMETRY.blastGate.portalXMax - radius, nextX)
          );
          return {
            collided: true,
            resolvedX,
            resolvedY,
            segment: 'GATE',
          };
        }

        // Thực thể ở ngoài cổng (currY <= boundaryY): Chặn đứng tại ranh giới, trượt mượt mà
        const resolvedY = currY > targetY ? Math.max(targetY, currY - maxPush) : Math.min(nextY, targetY);
        return {
          collided: true,
          resolvedX: nextX,
          resolvedY,
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
        if (isInsideGateThreshold) {
          if (currY > 890) {
            // Đã qua nửa cổng: tiếp tục tiến về nam
            return {
              collided: false,
              resolvedX: nextX,
              resolvedY: currY + Math.max(0, nextY - currY),
              passThroughReason: 'GATE_OPEN',
            };
          } else {
            // Chưa qua nửa cổng: đẩy lùi liên tục có giới hạn bước
            const resolvedY = Math.max(targetY, currY - maxPush);
            return {
              collided: true,
              resolvedX: nextX,
              resolvedY,
              segment: 'GATE',
            };
          }
        }

        // Ở ngoài cửa: chặn tại ranh giới mượt mà
        const resolvedY = currY > targetY ? Math.max(targetY, currY - maxPush) : Math.min(nextY, targetY);
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
        const resolvedY = currY > targetY ? Math.max(targetY, currY - maxPush) : Math.min(nextY, targetY);
        return {
          collided: true,
          resolvedX: nextX,
          resolvedY,
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
