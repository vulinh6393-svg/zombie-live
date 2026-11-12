import crypto from 'node:crypto';
import { DatabaseClient } from '../db.js';

export interface JournalCommandEntry {
  id: string;
  matchId: string;
  commandId: string;
  seq: number;
  tick: number;
  commandType: string;
  payload: any;
  status: 'PENDING' | 'APPLIED' | 'REJECTED';
  appliedTick?: number;
  createdAt: string;
}

export interface MatchCheckpointEntry {
  id: string;
  matchId: string;
  tick: number;
  lastJournalSeq: number;
  stateSnapshot: any;
  stateHash: string;
  engineVersion: string;
  createdAt: string;
}

/**
 * CommandJournalRepository
 * Cung cấp cơ chế lưu trữ Command Journal có thứ tự tăng dần và Checkpoint Recovery cho Authoritative Engine.
 */
export class CommandJournalRepository {
  constructor(private readonly db: DatabaseClient) {}

  /**
   * Ghi nhận một Command vào Journal với sequence tăng dần trong cùng 1 match.
   * Nếu commandId đã tồn tại trong matchId này, trả về alreadyExists: true mà không chèn trùng.
   */
  public async appendCommand(params: {
    matchId: string;
    commandId: string;
    tick: number;
    commandType: string;
    payload: any;
  }): Promise<{ entry: JournalCommandEntry; alreadyExists: boolean }> {
    return this.db.transaction(async (tx) => {
      // 1. Kiểm tra xem commandId đã được ghi nhận trong matchId chưa
      const existing = await tx.query<any>(
        `SELECT id, match_id as "matchId", command_id as "commandId", seq, tick, command_type as "commandType", payload, status, applied_tick as "appliedTick", created_at as "createdAt"
         FROM match_command_journal 
         WHERE match_id = $1 AND command_id = $2`,
        [params.matchId, params.commandId]
      );

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        return {
          entry: {
            ...row,
            seq: Number(row.seq),
            payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
          },
          alreadyExists: true,
        };
      }

      // 2. Lấy next sequence number nguyên tử bằng row-level upsert counter, đồng bộ hóa tuyệt đối với MAX(seq) hiện hữu
      const counterRes = await tx.query<{ last_seq: string | number }>(
        `INSERT INTO match_command_counters (match_id, last_seq)
         VALUES ($1, (SELECT COALESCE(MAX(seq), 0) + 1 FROM match_command_journal WHERE match_id = $1))
         ON CONFLICT (match_id) DO UPDATE
         SET last_seq = GREATEST(match_command_counters.last_seq + 1, (SELECT COALESCE(MAX(seq), 0) + 1 FROM match_command_journal WHERE match_id = $1))
         RETURNING last_seq`,
        [params.matchId]
      );
      const nextSeq = Number(counterRes.rows[0].last_seq);
      const id = `jrn_${crypto.randomUUID()}`;

      await tx.query(
        `INSERT INTO match_command_journal (id, match_id, command_id, seq, tick, command_type, payload, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', CURRENT_TIMESTAMP)`,
        [
          id,
          params.matchId,
          params.commandId,
          nextSeq,
          params.tick,
          params.commandType,
          JSON.stringify(params.payload),
        ]
      );

      return {
        entry: {
          id,
          matchId: params.matchId,
          commandId: params.commandId,
          seq: nextSeq,
          tick: params.tick,
          commandType: params.commandType,
          payload: params.payload,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        },
        alreadyExists: false,
      };
    });
  }

  /**
   * Lấy sequence lớn nhất hiện tại của Journal cho một match xác định.
   */
  public async getLatestJournalSeq(matchId: string): Promise<number> {
    const res = await this.db.query<{ last_seq: string | number }>(
      `SELECT last_seq FROM match_command_counters WHERE match_id = $1`,
      [matchId]
    );
    if (res.rows.length === 0) {
      const maxRes = await this.db.query<{ max_seq: string | null }>(
        `SELECT MAX(seq) as max_seq FROM match_command_journal WHERE match_id = $1`,
        [matchId]
      );
      return maxRes.rows[0]?.max_seq ? Number(maxRes.rows[0].max_seq) : 0;
    }
    return Number(res.rows[0].last_seq);
  }

  /**
   * Đánh dấu command đã được simulation apply hoặc reject tại tick cụ thể.
   */
  public async markCommandApplied(
    matchId: string,
    commandId: string,
    appliedTick: number,
    status: 'APPLIED' | 'REJECTED' = 'APPLIED',
    reason?: string
  ): Promise<void> {
    await this.db.query(
      `UPDATE match_command_journal
       SET status = $1, applied_tick = $2
       WHERE match_id = $3 AND command_id = $4`,
      [status, appliedTick, matchId, commandId]
    );
  }

  /**
   * Lấy danh sách các lệnh cần replay sau một sequence checkpoint xác định.
   */
  public async getCommandsToReplay(matchId: string, afterSeq: number = 0): Promise<JournalCommandEntry[]> {
    const res = await this.db.query<any>(
      `SELECT id, match_id as "matchId", command_id as "commandId", seq, tick, command_type as "commandType", payload, status, applied_tick as "appliedTick", created_at as "createdAt"
       FROM match_command_journal
       WHERE match_id = $1 AND seq > $2
       ORDER BY seq ASC`,
      [matchId, afterSeq]
    );

    return res.rows.map((row) => ({
      ...row,
      seq: Number(row.seq),
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    }));
  }

  /**
   * Lưu snapshot trạng thái simulation Authoritative vào match_checkpoints.
   */
  public async saveCheckpoint(params: {
    matchId: string;
    tick: number;
    lastJournalSeq: number;
    stateSnapshot: any;
    stateHash: string;
    engineVersion?: string;
  }): Promise<string> {
    const id = `chk_${params.matchId}_${params.tick}`;
    const engineVersion = params.engineVersion || '1.0.0';
    await this.db.query(
      `INSERT INTO match_checkpoints (id, match_id, tick, last_journal_seq, state_snapshot, state_hash, engine_version, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET last_journal_seq = $4, state_snapshot = $5, state_hash = $6, engine_version = $7`,
      [
        id,
        params.matchId,
        params.tick,
        params.lastJournalSeq,
        JSON.stringify(params.stateSnapshot),
        params.stateHash,
        engineVersion,
      ]
    );
    return id;
  }

  /**
   * Lấy checkpoint mới nhất của trận đấu để khôi phục trạng thái simulation.
   */
  public async getLatestCheckpoint(matchId: string): Promise<MatchCheckpointEntry | null> {
    const res = await this.db.query<any>(
      `SELECT id, match_id as "matchId", tick, last_journal_seq as "lastJournalSeq", state_snapshot as "stateSnapshot", state_hash as "stateHash", engine_version as "engineVersion", created_at as "createdAt"
       FROM match_checkpoints
       WHERE match_id = $1
       ORDER BY tick DESC, created_at DESC
       LIMIT 1`,
      [matchId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      lastJournalSeq: Number(row.lastJournalSeq),
      engineVersion: row.engineVersion || '1.0.0',
      stateSnapshot: typeof row.stateSnapshot === 'string' ? JSON.parse(row.stateSnapshot) : row.stateSnapshot,
    };
  }
}
