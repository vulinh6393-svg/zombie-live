import { describe, it, expect, beforeEach } from 'vitest';
import { BastionCollisionSystem } from './BastionCollisionSystem';
import { BASTION_GEOMETRY } from '../config/BastionGeometryConfig';

describe('BastionCollisionSystem (Production Vitest Suite)', () => {
  let collisionSystem: BastionCollisionSystem;
  const ENTITY_RADIUS = 20;

  beforeEach(() => {
    collisionSystem = new BastionCollisionSystem();
  });

  describe('1. Cổng Đóng (CLOSED State)', () => {
    it('chặn cứng toàn bộ 3 Lane Alpha, Bravo, Charlie tại y=840', () => {
      collisionSystem.setGateState('CLOSED');

      // Alpha Lane (x=280)
      const resAlpha = collisionSystem.resolveMovement(280, 800, 280, 860, ENTITY_RADIUS);
      expect(resAlpha.collided).toBe(true);
      expect(resAlpha.resolvedY).toBe(840 - ENTITY_RADIUS);
      expect(resAlpha.segment).toBe('LEFT_WALL');

      // Bravo Lane (x=540)
      const resBravo = collisionSystem.resolveMovement(540, 800, 540, 860, ENTITY_RADIUS);
      expect(resBravo.collided).toBe(true);
      expect(resBravo.resolvedY).toBe(840 - ENTITY_RADIUS);
      expect(resBravo.segment).toBe('GATE');

      // Charlie Lane (x=800)
      const resCharlie = collisionSystem.resolveMovement(800, 800, 800, 860, ENTITY_RADIUS);
      expect(resCharlie.collided).toBe(true);
      expect(resCharlie.resolvedY).toBe(840 - ENTITY_RADIUS);
      expect(resCharlie.segment).toBe('RIGHT_WALL');
    });
  });

  describe('2. Cổng Mở Hoàn Toàn (OPEN State - Mathematical Safe Corridor)', () => {
    beforeEach(() => {
      collisionSystem.setGateState('OPEN');
    });

    it('cho phép thực thể ở tâm Bravo (x=540) đi qua vạch y=840 an toàn', () => {
      const res = collisionSystem.resolveMovement(540, 800, 540, 860, ENTITY_RADIUS);
      expect(res.collided).toBe(false);
      expect(res.resolvedY).toBe(860);
      expect(res.passThroughReason).toBe('GATE_OPEN');
    });

    it('tính toán chính xác khoảng hở an toàn [507.5, 572.5] cho r=20', () => {
      const { safeMinX, safeMaxX, isOpen } = collisionSystem.getSafeCorridorBounds(ENTITY_RADIUS);
      expect(isOpen).toBe(true);
      // doorWidth = 115, doorHalfWidth = 57.5
      // Left open = 430 -> innerEdgeLeft = 487.5 -> safeMinX = 487.5 + 20 = 507.5
      expect(safeMinX).toBeCloseTo(507.5, 1);
      // Right open = 650 -> innerEdgeRight = 592.5 -> safeMaxX = 592.5 - 20 = 572.5
      expect(safeMaxX).toBeCloseTo(572.5, 1);
    });

    it('chặn thực thể lệch tâm vi phạm mép cánh cửa trái (x=500)', () => {
      const res = collisionSystem.resolveMovement(500, 800, 500, 860, ENTITY_RADIUS);
      expect(res.collided).toBe(true);
      expect(res.resolvedY).toBe(840 - ENTITY_RADIUS);
      expect(res.segment).toBe('GATE');
    });

    it('chặn thực thể lệch tâm vi phạm mép cánh cửa phải (x=580)', () => {
      const res = collisionSystem.resolveMovement(580, 800, 580, 860, ENTITY_RADIUS);
      expect(res.collided).toBe(true);
      expect(res.resolvedY).toBe(840 - ENTITY_RADIUS);
      expect(res.segment).toBe('GATE');
    });

    it('vẫn chặn 100% Lane Alpha và Lane Charlie khi cổng mở', () => {
      const resAlpha = collisionSystem.resolveMovement(280, 800, 280, 860, ENTITY_RADIUS);
      expect(resAlpha.collided).toBe(true);
      expect(resAlpha.segment).toBe('LEFT_WALL');

      const resCharlie = collisionSystem.resolveMovement(800, 800, 800, 860, ENTITY_RADIUS);
      expect(resCharlie.collided).toBe(true);
      expect(resCharlie.segment).toBe('RIGHT_WALL');
    });
  });

  describe('3. Cổng Động Trong Quá Trình OPENING / CLOSING', () => {
    it('cập nhật liên tục khoảng hở an toàn theo vị trí 2 cánh cửa', () => {
      collisionSystem.setGateState('OPENING');
      // Cửa đang mở dở ở x=450 và x=630
      collisionSystem.updateGateDoors(450, 630);
      const bounds = collisionSystem.getSafeCorridorBounds(ENTITY_RADIUS);
      // innerEdgeLeft = 450 + 57.5 = 507.5 -> safeMinX = 527.5
      // innerEdgeRight = 630 - 57.5 = 572.5 -> safeMaxX = 552.5
      expect(bounds.safeMinX).toBeCloseTo(527.5, 1);
      expect(bounds.safeMaxX).toBeCloseTo(552.5, 1);

      // x=540 lọt an toàn giữa 527.5 và 552.5
      const resCenter = collisionSystem.resolveMovement(540, 800, 540, 860, ENTITY_RADIUS);
      expect(resCenter.collided).toBe(false);

      // x=520 va chạm với cánh trái đang mở dở
      const resLeft = collisionSystem.resolveMovement(520, 800, 520, 860, ENTITY_RADIUS);
      expect(resLeft.collided).toBe(true);
    });

    it('xử lý thực thể đang đứng trong thông đạo khi cổng đóng (đẩy lùi về y=820)', () => {
      collisionSystem.setGateState('CLOSING');
      // Cửa đóng lại gần như hoàn toàn
      collisionSystem.updateGateDoors(480, 600);
      // Zombie đang ở y=870 (đã qua vạch 840)
      const resTrapped = collisionSystem.resolveMovement(540, 870, 540, 880, ENTITY_RADIUS);
      expect(resTrapped.collided).toBe(true);
      expect(resTrapped.resolvedY).toBe(840 - ENTITY_RADIUS);
      expect(resTrapped.segment).toBe('GATE');
    });

    it('chuyển mượt mà từ bị chặn sang được phép đi tiếp khi cửa mở đủ rộng (CLOSED -> OPENING -> OPEN)', () => {
      // 1. Cổng ban đầu đóng: Zombie bị chặn tại 820
      collisionSystem.setGateState('CLOSED');
      const step1 = collisionSystem.resolveMovement(540, 800, 540, 840, ENTITY_RADIUS);
      expect(step1.collided).toBe(true);
      expect(step1.resolvedY).toBe(820);

      // 2. Cổng bắt đầu mở nhưng chưa đủ rộng (doorLeftX = 475, doorRightX = 605)
      collisionSystem.setGateState('OPENING');
      collisionSystem.updateGateDoors(475, 605);
      const step2 = collisionSystem.resolveMovement(540, 820, 540, 840, ENTITY_RADIUS);
      expect(step2.collided).toBe(true);

      // 3. Cổng tiếp tục mở rộng tới x=440, 640 (khoảng an toàn [517.5, 562.5])
      collisionSystem.updateGateDoors(440, 640);
      const step3 = collisionSystem.resolveMovement(540, 820, 540, 860, ENTITY_RADIUS);
      expect(step3.collided).toBe(false);
      expect(step3.resolvedY).toBe(860);
      expect(step3.passThroughReason).toBe('GATE_OPEN');
    });
  });

  describe('4. Trạng Thái Tường Bị Phá Vỡ (BREACHED Wall)', () => {
    it('cho phép thực thể đi qua khi tường Alpha bị phá vỡ', () => {
      collisionSystem.setWallState('LEFT', 'BREACHED', 0);
      const res = collisionSystem.resolveMovement(280, 800, 280, 860, ENTITY_RADIUS);
      expect(res.collided).toBe(false);
      expect(res.resolvedY).toBe(860);
      expect(res.passThroughReason).toBe('WALL_BREACHED');
    });

    it('cho phép thực thể đi qua khi tường Charlie bị phá vỡ', () => {
      collisionSystem.setWallState('RIGHT', 'BREACHED', 0);
      const res = collisionSystem.resolveMovement(800, 800, 800, 860, ENTITY_RADIUS);
      expect(res.collided).toBe(false);
      expect(res.resolvedY).toBe(860);
      expect(res.passThroughReason).toBe('WALL_BREACHED');
    });
  });
});
