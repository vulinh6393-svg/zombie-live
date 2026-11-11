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

      // 2. Lấy next sequence number nguyên tử cho matchId
      const maxSeqRes = await tx.query<{ max_seq: string | null }>(
        `SELECT MAX(seq) as max_seq FROM match_command_journal WHERE match_id = $1`,
        [params.matchId]
      );
      const nextSeq = (maxSeqRes.rows[0]?.max_seq ? Number(maxSeqRes.rows[0].max_seq) : 0) + 1;
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
   * Đánh dấu command đã được simulation apply tại tick cụ thể.
   */
  public async markCommandApplied(matchId: string, commandId: string, appliedTick: number): Promise<void> {
    await this.db.query(
      `UPDATE match_command_journal
       SET status = 'APPLIED', applied_tick = $1
       WHERE match_id = $2 AND command_id = $3`,
      [appliedTick, matchId, commandId]
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
  }): Promise<string> {
    const id = `chk_${params.matchId}_${params.tick}`;
    await this.db.query(
      `INSERT INTO match_checkpoints (id, match_id, tick, last_journal_seq, state_snapshot, state_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET state_snapshot = $5, state_hash = $6`,
      [
        id,
        params.matchId,
        params.tick,
        params.lastJournalSeq,
        JSON.stringify(params.stateSnapshot),
        params.stateHash,
      ]
    );
    return id;
  }

  /**
   * Lấy checkpoint mới nhất của trận đấu để khôi phục trạng thái simulation.
   */
  public async getLatestCheckpoint(matchId: string): Promise<MatchCheckpointEntry | null> {
    const res = await this.db.query<any>(
      `SELECT id, match_id as "matchId", tick, last_journal_seq as "lastJournalSeq", state_snapshot as "stateSnapshot", state_hash as "stateHash", created_at as "createdAt"
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
      stateSnapshot: typeof row.stateSnapshot === 'string' ? JSON.parse(row.stateSnapshot) : row.stateSnapshot,
    };
  }
}
