import { DatabaseClient } from '../db.js';

export interface OutboxRecord {
  id: string;
  aggregate: string;
  aggregateId: string;
  eventType: string;
  payload: any;
  status: string;
  retryCount: number;
  createdAt: Date;
}

export class OutboxRepository {
  constructor(private db: DatabaseClient) {}

  public async fetchPendingEvents(batchSize: number = 20): Promise<OutboxRecord[]> {
    const res = await this.db.query<any>(
      `SELECT id, aggregate, aggregate_id as "aggregateId", event_type as "eventType", 
              payload, status, retry_count as "retryCount", created_at as "createdAt"
       FROM outbox_events 
       WHERE status = 'PENDING' 
       ORDER BY created_at ASC 
       LIMIT $1`,
      [batchSize]
    );

    return res.rows.map((r) => ({
      ...r,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
    }));
  }

  public async markProcessed(id: string): Promise<void> {
    await this.db.query(
      `UPDATE outbox_events 
       SET status = 'PROCESSED', processed_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );
  }

  public async markFailed(id: string, error: string): Promise<void> {
    await this.db.query(
      `UPDATE outbox_events 
       SET status = CASE WHEN retry_count >= 3 THEN 'FAILED' ELSE 'PENDING' END,
           retry_count = retry_count + 1,
           error = $1 
       WHERE id = $2`,
      [error, id]
    );
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
