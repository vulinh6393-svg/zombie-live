import { BASTION_GEOMETRY } from '../config/BastionGeometryConfig';

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
 * BASTION DYNAMIC COLLISION SYSTEM — SERVER-AUTHORITATIVE COMPATIBLE
 * 
 * Kiểm tra và giải quyết va chạm hình học thời gian thực (Real-time Geometric Collision):
 * - Không dùng tween điểm đích cố định hay tọa độ giả lập.
 * - Tính toán chính xác theo mép vật lý thực của hai cánh cửa (doorWidth = 115px, half-width = 57.5px)
 *   và bán kính thực thể (radius = 20px).
 * - Hành lang an toàn khi mở hoàn toàn (x=430, 650): [507.5, 572.5].
 * - Xử lý va chạm động liên tục trong cả 4 trạng thái: CLOSED, OPENING, OPEN, CLOSING.
 * - Xử lý trường hợp thực thể đang đứng trong thông đạo khi cổng đóng (bị kẹp hoặc đẩy lùi).
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
    if (hp !== undefined) wall.hp = hp;
  }

  public getWallState(id: 'LEFT' | 'RIGHT'): Readonly<WallState> {
    return id === 'LEFT' ? this.leftWall : this.rightWall;
  }

  /**
   * Kiểm tra và giải quyết va chạm cho thực thể đang di chuyển từ (currX, currY) tới (nextX, nextY)
   * @param currX Tọa độ x hiện tại
   * @param currY Tọa độ y hiện tại
   * @param nextX Tọa độ x dự kiến
   * @param nextY Tọa độ y dự kiến
   * @param radius Bán kính va chạm của thực thể (hoặc nửa chiều rộng bounding box)
   */
  public resolveMovement(
    currX: number,
    currY: number,
    nextX: number,
    nextY: number,
    radius: number = 20
  ): CollisionResult {
    const boundaryY = this.collisionLineY; // 840
    const gateThresholdBottomY = boundaryY + 100; // 940 (vùng sâu trong cổng)

    // Kiểm tra xem thực thể có đang tương tác với vùng phòng tuyến hay không
    // Trường hợp 1: Đang từ phía Bắc tiến vào ranh giới y=840
    const isCrossingFromNorth = currY <= boundaryY && nextY + radius >= boundaryY;
    // Trường hợp 2: Đang nằm trong thông đạo cổng [840, 940] khi cổng đóng lại
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
        // Nếu thực thể đang ở trong lòng cổng mà bị kẹp, đẩy lùi về phía trước cổng
        const resolvedY = isInsideGateThreshold ? boundaryY - radius : boundaryY - radius;
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
