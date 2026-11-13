/**
 * Cumulative Gift Streak Tracker (Incremental Delta Engine)
 * Đảm bảo chỉ xử lý phần chênh lệch (delta quantity) khi người xem tặng combo quà.
 * Chống trùng lặp (deduplication) và bảo vệ an toàn trước các gói tin đến trễ / out-of-order.
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
   * Tính toán delta cho sự kiện gift tiếp theo trong chuỗi streak.
   */
  public processGiftStreak(
    userId: string,
    giftId: string,
    liveSessionId: string,
    quantity: number,
    streakId?: string
  ): StreakDeltaResult {
    const key = this.buildKey(userId, giftId, liveSessionId, streakId);
    const now = Date.now();
    const existing = this.streaks.get(key);

    // Nếu đã hết hạn (timeout), reset streak mới
    if (!existing || now - existing.lastUpdated > this.streakTimeoutMs) {
      this.streaks.set(key, {
        userId,
        giftId,
        liveSessionId,
        lastSettledQuantity: quantity,
        lastUpdated: now,
      });

      return {
        valid: true,
        deltaQuantity: quantity,
        currentTotal: quantity,
        previousTotal: 0,
        isNewStreak: true,
      };
    }

    // Nếu số lượng hiện tại <= số lượng đã ghi nhận: gói tin bị trễ hoặc trùng lặp (duplicate)
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
    const prev = existing.lastSettledQuantity;
    existing.lastSettledQuantity = quantity;
    existing.lastUpdated = now;

    return {
      valid: true,
      deltaQuantity: delta,
      currentTotal: quantity,
      previousTotal: prev,
      isNewStreak: false,
    };
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
