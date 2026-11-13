import { DatabaseClient } from '../db.js';

export interface DeferredCommandRecord {
  id: string;
  matchId: string;
  commandPayload: any;
  status: 'DEFERRED' | 'APPLIED' | 'REJECTED' | 'FAILED';
  createdAt: Date;
  appliedAt?: Date;
  targetMatchId?: string;
  transitionReason?: string;
}

export class DeferredCommandRepository {
  constructor(private db: DatabaseClient) {}

  /**
   * Lưu lệnh vào hàng đợi hoãn (deferred queue) một cách bền vững vào database.
   * Chống mất lệnh khi server bị crash trong giai đoạn RESULTS / chuẩn bị đổi trận.
   */
  public async deferCommand(
    id: string,
    matchId: string,
    commandPayload: any,
    reason: string = 'MATCH_IN_RESULTS_PHASE'
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO deferred_match_commands (id, match_id, command_payload, status, transition_reason, created_at)
       VALUES ($1, $2, $3, 'DEFERRED', $4, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         command_payload = EXCLUDED.command_payload,
         status = 'DEFERRED',
         transition_reason = EXCLUDED.transition_reason`,
      [id, matchId, JSON.stringify(commandPayload), reason]
    );
  }

  /**
   * Lấy danh sách các lệnh đang ở trạng thái DEFERRED.
   */
  public async getPendingDeferredCommands(matchId?: string): Promise<DeferredCommandRecord[]> {
    let sql = `SELECT id, match_id, command_payload, status, created_at, applied_at, target_match_id, transition_reason
               FROM deferred_match_commands
               WHERE status = 'DEFERRED'`;
    const params: any[] = [];
    if (matchId) {
      sql += ` AND match_id = $1`;
      params.push(matchId);
    }
    sql += ` ORDER BY created_at ASC`;

    const res = await this.db.query<any>(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      matchId: r.match_id,
      commandPayload: typeof r.command_payload === 'string' ? JSON.parse(r.command_payload) : r.command_payload,
      status: r.status,
      createdAt: new Date(r.created_at),
      appliedAt: r.applied_at ? new Date(r.applied_at) : undefined,
      targetMatchId: r.target_match_id,
      transitionReason: r.transition_reason,
    }));
  }

  /**
   * Chuyển toàn bộ các lệnh đang hoãn sang trận mới một cách nguyên tử trong transaction.
   * Cập nhật status = 'APPLIED', ghi nhận target_match_id và applied_at.
   */
  public async transferDeferredCommandsToMatch(targetMatchId: string): Promise<DeferredCommandRecord[]> {
    return this.db.transaction(async (tx) => {
      // 1. Khóa và lấy các lệnh đang DEFERRED
      const pendingRes = await tx.query<any>(
        `SELECT id, match_id, command_payload, status, created_at, transition_reason
         FROM deferred_match_commands
         WHERE status = 'DEFERRED'
         ORDER BY created_at ASC
         FOR UPDATE`
      );

      if (pendingRes.rows.length === 0) {
        return [];
      }

      const records: DeferredCommandRecord[] = [];
      for (const r of pendingRes.rows) {
        const payload = typeof r.command_payload === 'string' ? JSON.parse(r.command_payload) : r.command_payload;
        // Gắn targetMatchId vào payload
        if (payload) {
          payload.targetMatchId = targetMatchId;
        }

        await tx.query(
          `UPDATE deferred_match_commands
           SET status = 'APPLIED',
               target_match_id = $1,
               applied_at = CURRENT_TIMESTAMP,
               command_payload = $2
           WHERE id = $3`,
          [targetMatchId, JSON.stringify(payload), r.id]
        );

        records.push({
          id: r.id,
          matchId: r.match_id,
          commandPayload: payload,
          status: 'APPLIED',
          createdAt: new Date(r.created_at),
          appliedAt: new Date(),
          targetMatchId,
          transitionReason: r.transition_reason,
        });
      }

      return records;
    });
  }

  /**
   * Từ chối lệnh hoãn có lý do cụ thể (terminal state REJECTED).
   */
  public async rejectDeferredCommand(id: string, reason: string): Promise<void> {
    await this.db.query(
      `UPDATE deferred_match_commands
       SET status = 'REJECTED',
           transition_reason = $1,
           applied_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [reason, id]
    );
  }
}
