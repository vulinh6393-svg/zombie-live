/**
 * Cumulative Gift Streak Tracker (Incremental Delta Engine)
 * Đảm bảo chỉ xử lý phần chênh lệch (delta quantity) khi người xem tặng combo quà.
 * Chống trùng lặp (deduplication) và bảo vệ an toàn trước các gói tin đến trễ / out-of-order.
 * 
 * Chuẩn hóa theo quy trình Prepare - Acknowledge - Retry:
 * 1. prepareStreak(): Tính toán delta dựa trên lastSettledQuantity trong RAM, KHÔNG commit sớm.
 * 2. Khi Game Server xác nhận HTTP thành công (hoặc Idempotent duplicate ACK từ Gift Ledger),
 *    gọi acknowledgeStreak() để ghi nhận mốc số lượng mới.
 * 3. Khi gặp lỗi mạng / timeout, streak RAM không bị đẩy lên, cho phép retry với cùng providerEventId
 *    và payload gốc mà không sợ bị từ chối sai là DUPLICATE_OR_OUT_OF_ORDER_STREAK.
 */

export interface StreakState {
  userId: string;
  giftId: string;
  liveSessionId: string;
  lastSettledQuantity: number;
  lastUpdated: number;
}

export interface StreakDeltaResult {
  valid: boolean;
  deltaQuantity: number;
  currentTotal: number;
  previousTotal: number;
  isNewStreak: boolean;
  reason?: string;
}

export class GiftStreakTracker {
  private streaks: Map<string, StreakState> = new Map();
  private readonly streakTimeoutMs: number;

  constructor(streakTimeoutSeconds: number = 300) {
    this.streakTimeoutMs = streakTimeoutSeconds * 1000;
  }

  private buildKey(userId: string, giftId: string, liveSessionId: string, streakId?: string): string {
    return streakId 
      ? `${userId}_${giftId}_${liveSessionId}_${streakId}`
      : `${userId}_${giftId}_${liveSessionId}`;
  }

  /**
   * Tính toán trước delta cho sự kiện gift tiếp theo trong chuỗi streak (chưa chốt state trong RAM).
   */
  public prepareStreak(
    userId: string,
    giftId: string,
    liveSessionId: string,
    quantity: number,
    streakId?: string
  ): StreakDeltaResult {
    const key = this.buildKey(userId, giftId, liveSessionId, streakId);
    const now = Date.now();
    const existing = this.streaks.get(key);

    // Nếu chưa có streak hoặc đã hết hạn (timeout), bắt đầu streak mới
    if (!existing || now - existing.lastUpdated > this.streakTimeoutMs) {
      return {
        valid: true,
        deltaQuantity: quantity,
        currentTotal: quantity,
        previousTotal: 0,
        isNewStreak: true,
      };
    }

    // Nếu số lượng hiện tại <= số lượng đã ghi nhận: gói tin bị trễ hoặc trùng lặp
    if (quantity <= existing.lastSettledQuantity) {
      return {
        valid: false,
        deltaQuantity: 0,
        currentTotal: existing.lastSettledQuantity,
        previousTotal: existing.lastSettledQuantity,
        isNewStreak: false,
        reason: 'DUPLICATE_OR_OUT_OF_ORDER_STREAK',
      };
    }

    // Tính delta gia tăng
    const delta = quantity - existing.lastSettledQuantity;
    return {
      valid: true,
      deltaQuantity: delta,
      currentTotal: quantity,
      previousTotal: existing.lastSettledQuantity,
      isNewStreak: false,
    };
  }

  /**
   * Xác nhận (ACK) streak sau khi Game Server đã ghi nhận thành công vào Gift Ledger.
   */
  public acknowledgeStreak(
    userId: string,
    giftId: string,
    liveSessionId: string,
    settledQuantity: number,
    streakId?: string
  ): void {
    const key = this.buildKey(userId, giftId, liveSessionId, streakId);
    const now = Date.now();
    const existing = this.streaks.get(key);

    if (!existing) {
      this.streaks.set(key, {
        userId,
        giftId,
        liveSessionId,
        lastSettledQuantity: settledQuantity,
        lastUpdated: now,
      });
    } else {
      existing.lastSettledQuantity = Math.max(existing.lastSettledQuantity, settledQuantity);
      existing.lastUpdated = now;
    }
  }

  /**
   * Phương thức tương thích ngược: tự động tính và commit ngay trong RAM.
   */
  public processGiftStreak(
    userId: string,
    giftId: string,
    liveSessionId: string,
    quantity: number,
    streakId?: string
  ): StreakDeltaResult {
    const prep = this.prepareStreak(userId, giftId, liveSessionId, quantity, streakId);
    if (prep.valid) {
      this.acknowledgeStreak(userId, giftId, liveSessionId, quantity, streakId);
    }
    return prep;
  }

  /**
   * Lấy số lượng đã settle hiện tại của một streak.
   */
  public getLastSettledQuantity(userId: string, giftId: string, liveSessionId: string, streakId?: string): number {
    const key = this.buildKey(userId, giftId, liveSessionId, streakId);
    return this.streaks.get(key)?.lastSettledQuantity ?? 0;
  }

  /**
   * Dọn dẹp các streak đã hết hạn timeout
   */
  public pruneExpiredStreaks(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, state] of this.streaks.entries()) {
      if (now - state.lastUpdated > this.streakTimeoutMs) {
        this.streaks.delete(key);
        pruned++;
      }
    }
    return pruned;
  }

  public clear(): void {
    this.streaks.clear();
  }
}
