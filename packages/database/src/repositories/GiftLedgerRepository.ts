import { DatabaseClient } from '../db.js';

export interface SettleGiftParams {
  provider: string;
  liveSessionId: string;
  matchId?: string;
  providerEventId: string;
  senderId: string;
  senderName: string;
  giftId: string;
  quantity: number;
  quantityMode?: 'cumulative' | 'incremental';
  streakId?: string;
  streakStatus?: 'IN_PROGRESS' | 'FINISHED';
  skillId?: string;
}

export interface SettleGiftResult {
  success: boolean;
  reason?: string;
  deltaQuantity: number;
  skillId?: string;
  eventId?: string;
}

export class GiftLedgerRepository {
  constructor(private db: DatabaseClient) {}

  public async settleGift(params: SettleGiftParams): Promise<SettleGiftResult> {
    const {
      provider,
      liveSessionId,
      providerEventId,
      senderId,
      senderName,
      giftId,
      quantity,
      quantityMode = 'cumulative',
      streakId,
      streakStatus = 'FINISHED',
      skillId,
    } = params;

    if (!providerEventId) {
      return { success: false, reason: 'MISSING_PROVIDER_EVENT_ID', deltaQuantity: 0 };
    }

    return this.db.transaction(async (tx) => {
      // 1. Chống trùng lặp tuyệt đối qua composite (provider, live_session_id, provider_event_id)
      const dupCheck = await tx.query<any>(
        `SELECT id, provider_event_id FROM gift_events 
         WHERE provider = $1 AND live_session_id = $2 AND provider_event_id = $3`,
        [provider, liveSessionId, providerEventId]
      );

      if (dupCheck.rows.length > 0) {
        return { success: false, reason: 'DUPLICATE_EVENT', deltaQuantity: 0 };
      }

      let deltaQuantity = quantity;

      // 2. Xử lý Gift Streak State Machine (cô lập độc lập theo từng sender_id)
      if (streakId) {
        const streakCheck = await tx.query<any>(
          `SELECT id, last_settled_quantity, status FROM gift_streaks 
           WHERE provider = $1 AND live_session_id = $2 AND streak_id = $3 AND sender_id = $4 FOR UPDATE`,
          [provider, liveSessionId, streakId, senderId]
        );

        if (streakCheck.rows.length > 0) {
          const streak = streakCheck.rows[0];

          // Nếu streak đã đóng (FINISHED), từ chối mọi packet trễ (out-of-order)
          if (streak.status === 'FINISHED') {
            return { success: false, reason: 'STREAK_ALREADY_FINISHED', deltaQuantity: 0 };
          }

          if (quantityMode === 'cumulative') {
            deltaQuantity = Math.max(0, quantity - streak.last_settled_quantity);
          } else {
            deltaQuantity = quantity;
          }

          if (deltaQuantity <= 0) {
            // Không có phần quà mới gia tăng trong packet này
            const eventId = `gevt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            await tx.query(
              `INSERT INTO gift_events (
                id, provider, live_session_id, provider_event_id, sender_id, sender_name, gift_id,
                quantity, delta_quantity, quantity_mode, streak_id, streak_status, settlement_status, skill_id, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, 'NO_DELTA', $12, CURRENT_TIMESTAMP)`,
              [eventId, provider, liveSessionId, providerEventId, senderId, senderName, giftId, quantity, quantityMode, streakId, streakStatus, skillId || null]
            );

            if (streakStatus === 'FINISHED') {
              await tx.query(
                `UPDATE gift_streaks SET status = 'FINISHED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [streak.id]
              );
            }

            return { success: true, reason: 'NO_DELTA_QUANTITY', deltaQuantity: 0, skillId, eventId };
          }

          const newLastQuantity = quantityMode === 'cumulative' ? quantity : streak.last_settled_quantity + deltaQuantity;
          await tx.query(
            `UPDATE gift_streaks 
             SET last_settled_quantity = $1, status = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3`,
            [newLastQuantity, streakStatus, streak.id]
          );
        } else {
          // Bắt đầu streak mới
          const streakDbId = `strk_${provider}_${liveSessionId}_${streakId}`;
          await tx.query(
            `INSERT INTO gift_streaks (
              id, provider, live_session_id, streak_id, sender_id, sender_name, gift_id,
              last_settled_quantity, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [streakDbId, provider, liveSessionId, streakId, senderId, senderName, giftId, quantity, streakStatus]
          );
          deltaQuantity = quantity;
        }
      }

      // 3. Ghi nhận sự kiện vào Sổ Cái Quà Tặng (Gift Ledger)
      const eventId = `gevt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await tx.query(
        `INSERT INTO gift_events (
          id, provider, live_session_id, provider_event_id, sender_id, sender_name, gift_id,
          quantity, delta_quantity, quantity_mode, streak_id, streak_status, settlement_status, skill_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'SETTLED', $13, CURRENT_TIMESTAMP)`,
        [eventId, provider, liveSessionId, providerEventId, senderId, senderName, giftId, quantity, deltaQuantity, quantityMode, streakId || null, streakStatus, skillId || null]
      );

      // 4. Tạo Transactional Outbox Event cho Engine xử lý bất đồng bộ
      const outboxId = `outbox_${eventId}`;
      const payloadJson = JSON.stringify({
        provider,
        liveSessionId,
        matchId: params.matchId || liveSessionId,
        providerEventId,
        senderId,
        senderName,
        giftId,
        deltaQuantity,
        skillId,
        streakId,
        streakStatus,
      });

      await tx.query(
        `INSERT INTO outbox_events (
          id, aggregate, aggregate_id, event_type, payload, status, retry_count, created_at
        ) VALUES ($1, 'GIFT', $2, 'GIFT_SKILL_TRIGGER', $3, 'PENDING', 0, CURRENT_TIMESTAMP)`,
        [outboxId, providerEventId, payloadJson]
      );

      return {
        success: true,
        deltaQuantity,
        skillId,
        eventId,
      };
    });
  }

  public async isEventProcessed(provider: string, liveSessionId: string, providerEventId: string): Promise<boolean> {
    const res = await this.db.query<any>(
      `SELECT id FROM gift_events WHERE provider = $1 AND live_session_id = $2 AND provider_event_id = $3`,
      [provider, liveSessionId, providerEventId]
    );
    return res.rows.length > 0;
  }
}
