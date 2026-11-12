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

  public async markProcessed(id: string, workerId?: string): Promise<boolean> {
    const res = await this.db.query(
      `UPDATE outbox_events 
       SET status = 'PROCESSED', locked_by = NULL, locked_until = NULL, processed_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
         AND status != 'PROCESSED'
         AND ($2::text IS NULL OR locked_by = $2 OR locked_by IS NULL)`,
      [id, workerId || null]
    );
    return res.rowCount > 0;
  }

  public async markFailed(id: string, error: string, workerId?: string): Promise<boolean> {
    const res = await this.db.query(
      `UPDATE outbox_events 
       SET status = CASE WHEN retry_count >= 3 THEN 'FAILED' ELSE 'PENDING' END,
           retry_count = retry_count + 1,
           locked_by = NULL,
           locked_until = NULL,
           error = $1 
       WHERE id = $2 
         AND (status = 'PROCESSING' OR status = 'PENDING')
         AND ($3::text IS NULL OR locked_by = $3 OR locked_by IS NULL)`,
      [error, id, workerId || null]
    );
    return res.rowCount > 0;
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
