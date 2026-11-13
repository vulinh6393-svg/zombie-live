import { DatabaseClient } from '../db.js';

export interface RevokedSessionRecord {
  sessionId: string;
  revokedAt: Date;
  expiresAt: Date;
  reason?: string;
}

export class SessionRevocationRepository {
  constructor(private db: DatabaseClient) {}

  /**
   * Thu hồi phiên làm việc, lưu trữ bền vững vào database (PostgreSQL/PGlite).
   * Đảm bảo sau khi restart tiến trình, phiên vẫn bị chặn.
   */
  public async revokeSession(sessionId: string, expiresAt: Date, reason: string = 'USER_LOGOUT'): Promise<void> {
    await this.db.query(
      `INSERT INTO revoked_sessions (session_id, expires_at, reason, revoked_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (session_id) DO UPDATE SET
         expires_at = EXCLUDED.expires_at,
         reason = EXCLUDED.reason,
         revoked_at = CURRENT_TIMESTAMP`,
      [sessionId, expiresAt, reason]
    );
  }

  /**
   * Kiểm tra nhanh trạng thái thu hồi của một sessionId.
   */
  public async isSessionRevoked(sessionId: string): Promise<boolean> {
    const res = await this.db.query<{ count: string }>(
      `SELECT count(*)::text as count FROM revoked_sessions 
       WHERE session_id = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [sessionId]
    );
    return parseInt(res.rows[0]?.count || '0', 10) > 0;
  }

  /**
   * Nạp toàn bộ danh sách sessionId đã bị thu hồi và còn trong hạn expire vào memory cache
   * để phục vụ server startup / warm cache.
   */
  public async getActiveRevokedSessionIds(): Promise<string[]> {
    const res = await this.db.query<{ session_id: string }>(
      `SELECT session_id FROM revoked_sessions WHERE expires_at > CURRENT_TIMESTAMP`
    );
    return res.rows.map((r) => r.session_id);
  }

  /**
   * Xóa bỏ các session đã quá hạn lưu trữ để tối ưu dung lượng DB.
   */
  public async cleanExpiredSessions(): Promise<number> {
    const res = await this.db.query(
      `DELETE FROM revoked_sessions WHERE expires_at <= CURRENT_TIMESTAMP`
    );
    return res.rowCount;
  }
}
