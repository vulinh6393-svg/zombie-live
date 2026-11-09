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
 * BASTION DYNAMIC COLLISION SYSTEM
 * 
 * Kiểm tra và giải quyết va chạm hình học thời gian thực (Real-time Geometric Collision):
 * - Không dùng tween điểm đích cố định.
 * - Tính toán dựa trên tọa độ thực, bán kính thực thể và trạng thái của cổng / tường.
 * - Server-Authoritative compatible: Client chạy prediction & visual simulation,
 *   server giữ chân lý collision mask.
 */
export class BastionCollisionSystem {
  private gateState: GateCollisionState = 'CLOSED';
  private gateDoorLeftX: number;
  private gateDoorRightX: number;

  private leftWall: WallState = { id: 'LEFT', state: 'INTACT', hp: 1000, maxHp: 1000 };
  private rightWall: WallState = { id: 'RIGHT', state: 'INTACT', hp: 1000, maxHp: 1000 };

  readonly collisionLineY = BASTION_GEOMETRY.collisionLineY; // 840

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

  public updateGateDoors(doorLeftX: number, doorRightX: number) {
    this.gateDoorLeftX = doorLeftX;
    this.gateDoorRightX = doorRightX;
  }

  public getGateState(): GateCollisionState {
    return this.gateState;
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
   * @param radius Bán kính va chạm của thực thể (hoặc nửa chiều cao)
   */
  public resolveMovement(
    currX: number,
    currY: number,
    nextX: number,
    nextY: number,
    radius: number = 20
  ): CollisionResult {
    const boundaryY = this.collisionLineY; // 840

    // Thực thể đang đi từ Bắc xuống Nam và phần đầu vượt qua vạch 840
    const wasAbove = currY <= boundaryY;
    const isCrossing = nextY + radius >= boundaryY;

    if (!wasAbove || !isCrossing) {
      // Chưa chạm vạch va chạm
      return {
        collided: false,
        resolvedX: nextX,
        resolvedY: nextY,
      };
    }

    // 1. Phân vùng kiểm tra theo Lane & Kiến Trúc
    // Lane Alpha (Left Wall): x trong [80, 410]
    if (nextX >= BASTION_GEOMETRY.lanes[0].xMin && nextX < BASTION_GEOMETRY.blastGate.corridorXMin) {
      if (this.leftWall.state !== 'BREACHED') {
        // Bị tường trái chặn cứng tại 840
        return {
          collided: true,
          resolvedX: nextX,
          resolvedY: boundaryY - radius,
          segment: 'LEFT_WALL',
        };
      } else {
        // Tường đã vỡ hoàn toàn, cho phép đi qua
        return {
          collided: false,
          resolvedX: nextX,
          resolvedY: nextY,
          passThroughReason: 'WALL_BREACHED',
        };
      }
    }

    // Lane Bravo (Blast Gate): x trong [410, 670]
    if (nextX >= BASTION_GEOMETRY.blastGate.corridorXMin && nextX <= BASTION_GEOMETRY.blastGate.corridorXMax) {
      if (this.gateState === 'CLOSED' || this.gateState === 'CLOSING') {
        // Cổng đóng: Chặn cứng mọi thực thể tại 840
        return {
          collided: true,
          resolvedX: nextX,
          resolvedY: boundaryY - radius,
          segment: 'GATE',
        };
      }

      if (this.gateState === 'OPEN' || this.gateState === 'OPENING') {
        // Kiểm tra xem thực thể có lọt vào giữa khoảng trống của 2 cánh cửa không
        // Khoảng trống an toàn: từ (gateDoorLeftX + radius) đến (gateDoorRightX - radius)
        const inClearCorridor = nextX > this.gateDoorLeftX + radius && nextX < this.gateDoorRightX - radius;

        if (inClearCorridor) {
          // Thông đạo thông suốt, cho phép xuyên qua cổng tiến vào sân trong
          return {
            collided: false,
            resolvedX: nextX,
            resolvedY: nextY,
            passThroughReason: 'GATE_OPEN',
          };
        } else {
          // Va vào cánh cửa trượt đang mở dở
          return {
            collided: true,
            resolvedX: nextX,
            resolvedY: boundaryY - radius,
            segment: 'GATE',
          };
        }
      }
    }

    // Lane Charlie (Right Wall): x trong [670, 1000]
    if (nextX > BASTION_GEOMETRY.blastGate.corridorXMax && nextX <= BASTION_GEOMETRY.lanes[2].xMax) {
      if (this.rightWall.state !== 'BREACHED') {
        // Bị tường phải chặn cứng tại 840
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

    // Mặc định bên ngoài map
    return {
      collided: true,
      resolvedX: nextX,
      resolvedY: boundaryY - radius,
    };
  }
}
