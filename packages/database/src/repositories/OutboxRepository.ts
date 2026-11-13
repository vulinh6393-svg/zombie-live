import { DatabaseClient } from '../db.js';

export interface OutboxRecord {
  id: string;
  aggregate: string;
  aggregateId: string;
  eventType: string;
  payload: any;
  status: string;
  retryCount: number;
  lockedBy?: string | null;
  lockedUntil?: Date | null;
  createdAt: Date;
}

export class OutboxRepository {
  constructor(private db: DatabaseClient) {}

  public async fetchPendingEvents(batchSize: number = 20): Promise<OutboxRecord[]> {
    const res = await this.db.query<any>(
      `SELECT id, aggregate, aggregate_id as "aggregateId", event_type as "eventType", 
              payload, status, retry_count as "retryCount", locked_by as "lockedBy",
              locked_until as "lockedUntil", created_at as "createdAt"
       FROM outbox_events 
       WHERE status = 'PENDING' OR (status = 'PROCESSING' AND (locked_until IS NOT NULL AND locked_until < CURRENT_TIMESTAMP))
       ORDER BY created_at ASC 
       LIMIT $1`,
      [batchSize]
    );

    return res.rows.map((r) => ({
      ...r,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
    }));
  }

  /**
   * P0: Claim pending/expired events atomically using transaction & row lock.
   * Sets locked_by and locked_until lease (default 30 seconds) to safely recover after worker crashes.
   */
  public async claimPendingEvents(
    batchSize: number = 20,
    workerId: string = 'worker_default',
    leaseSeconds: number = 30
  ): Promise<OutboxRecord[]> {
    return this.db.transaction(async (tx) => {
      const res = await tx.query<any>(
        `SELECT id, aggregate, aggregate_id as "aggregateId", event_type as "eventType", 
                payload, status, retry_count as "retryCount", locked_by as "lockedBy",
                locked_until as "lockedUntil", created_at as "createdAt"
         FROM outbox_events 
         WHERE status = 'PENDING' 
            OR (status = 'PROCESSING' AND (locked_until IS NULL OR locked_until < CURRENT_TIMESTAMP))
         ORDER BY created_at ASC 
         LIMIT $1 FOR UPDATE SKIP LOCKED`,
        [batchSize]
      );

      if (res.rows.length === 0) return [];

      const ids = res.rows.map((r: any) => r.id);
      await tx.query(
        `UPDATE outbox_events 
         SET status = 'PROCESSING', 
             locked_by = $1, 
             locked_until = CURRENT_TIMESTAMP + ($2 || ' seconds')::INTERVAL
         WHERE id = ANY($3::text[])`,
        [workerId, leaseSeconds.toString(), ids]
      );

      return res.rows.map((r: any) => ({
        ...r,
        status: 'PROCESSING',
        lockedBy: workerId,
        payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
      }));
    });
  }

  /**
   * P0.3: ACK Outbox Event as PROCESSED.
   * Yêu cầu nghiêm ngặt (Strict Lease Ownership):
   * - Trạng thái phải là PROCESSING (đã được claim hợp lệ qua transaction/lock).
   * - workerId phải khớp chính xác với locked_by.
   * - Lease chưa hết hạn (locked_until >= CURRENT_TIMESTAMP).
   * Trả về true nếu cập nhật thành công 1 dòng, false nếu vi phạm lease/mất quyền sở hữu.
   */
  public async markProcessed(id: string, workerId?: string, strict: boolean = true): Promise<boolean> {
    if (strict && (!workerId || workerId.trim().length === 0)) {
      throw new Error('STRICT_LEASE_VIOLATION: workerId is mandatory to ACK outbox event in strict mode.');
    }

    const query = strict
      ? `UPDATE outbox_events 
         SET status = 'PROCESSED', locked_by = NULL, locked_until = NULL, processed_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
           AND status = 'PROCESSING'
           AND locked_by = $2
           AND locked_until >= CURRENT_TIMESTAMP`
      : `UPDATE outbox_events 
         SET status = 'PROCESSED', locked_by = NULL, locked_until = NULL, processed_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
           AND (status = 'PROCESSING' OR status = 'PENDING')
           AND ($2::text IS NULL OR locked_by = $2)
           AND (locked_until IS NULL OR locked_until >= CURRENT_TIMESTAMP)`;

    const res = await this.db.query(query, strict ? [id, workerId] : [id, workerId || null]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Tính độ tuổi (ms) của sự kiện outbox đang chờ xử lý lâu nhất (Oldest Pending Age in ms)
   */
  public async getOldestPendingAgeMs(): Promise<number> {
    const res = await this.db.query<{ age_ms: string | number | null }>(
      `SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MIN(created_at))) * 1000 AS age_ms
       FROM outbox_events
       WHERE status = 'PENDING' OR status = 'PROCESSING'`
    );
    return res.rows[0]?.age_ms ? Math.max(0, Math.round(Number(res.rows[0].age_ms))) : 0;
  }

  /**
   * P0.3: Mark Outbox Event as FAILED or retryable PENDING with strict lease verification.
   */
  public async markFailed(id: string, error: string, workerId?: string, strict: boolean = true): Promise<boolean> {
    if (strict && (!workerId || workerId.trim().length === 0)) {
      throw new Error('STRICT_LEASE_VIOLATION: workerId is mandatory to fail outbox event in strict mode.');
    }

    const query = strict
      ? `UPDATE outbox_events 
         SET status = CASE WHEN retry_count >= 3 THEN 'FAILED' ELSE 'PENDING' END,
             retry_count = retry_count + 1,
             locked_by = NULL,
             locked_until = NULL,
             error = $1 
         WHERE id = $2 
           AND status = 'PROCESSING'
           AND locked_by = $3
           AND locked_until >= CURRENT_TIMESTAMP`
      : `UPDATE outbox_events 
         SET status = CASE WHEN retry_count >= 3 THEN 'FAILED' ELSE 'PENDING' END,
             retry_count = retry_count + 1,
             locked_by = NULL,
             locked_until = NULL,
             error = $1 
         WHERE id = $2 
           AND (status = 'PROCESSING' OR status = 'PENDING')
           AND ($3::text IS NULL OR locked_by = $3)
           AND (locked_until IS NULL OR locked_until >= CURRENT_TIMESTAMP)`;

    const res = await this.db.query(query, strict ? [error, id, workerId] : [error, id, workerId || null]);
    return (res.rowCount ?? 0) > 0;
  }

  public async getQueueMetrics(): Promise<{ pendingCount: number; oldestAgeMs: number }> {
    const res = await this.db.query<any>(
      `SELECT count(*) as count, MIN(created_at) as oldest
       FROM outbox_events 
       WHERE status = 'PENDING'`
    );

    const count = parseInt(res.rows[0]?.count || '0', 10);
    const oldest = res.rows[0]?.oldest ? new Date(res.rows[0].oldest).getTime() : Date.now();
    const oldestAgeMs = count > 0 ? Date.now() - oldest : 0;

    return {
      pendingCount: count,
      oldestAgeMs: Math.max(0, oldestAgeMs),
    };
  }
}
