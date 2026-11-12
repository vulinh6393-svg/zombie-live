import { DatabaseClient } from '../db.js';

export interface PlayerMatchStats {
  playerId?: string;
  userId: string;
  username?: string;
  provider?: string;
  squad: string;
  score: number;
  competitiveScore: number;
  giftScore: number;
  kills: number;
  assists: number;
  repairs: number;
  rescues: number;
  bossDamage: number;
  hasJoined: boolean;
}

export class MatchRepository {
  constructor(private db: DatabaseClient) {}

  public async startMatch(
    matchId: string,
    seed: number,
    phase: string,
    baseHp: number,
    sessionId?: string
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO matches (id, session_id, seed, phase, result, base_hp, started_at)
       VALUES ($1, $2, $3, $4, 'IN_PROGRESS', $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      [matchId, sessionId || null, seed, phase, baseHp]
    );
  }

  /**
   * Truy vấn trận đấu đang diễn ra (chưa kết thúc) trong cơ sở dữ liệu để phục hồi sau crash/restart.
   */
  public async getActiveMatch(): Promise<{ id: string; sessionId?: string; seed: number; phase: string; baseHp: number } | null> {
    const res = await this.db.query<any>(
      `SELECT id, session_id as "sessionId", seed, phase, base_hp as "baseHp"
       FROM matches
       WHERE result = 'IN_PROGRESS' AND ended_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      sessionId: r.sessionId,
      seed: Number(r.seed),
      phase: r.phase,
      baseHp: Number(r.baseHp),
    };
  }

  public async finishMatch(
    matchId: string,
    result: string,
    mvpPlayerId: string | null,
    stats: any,
    playerContributions: PlayerMatchStats[]
  ): Promise<{ saved: boolean }> {
    return this.db.transaction(async (tx) => {
      // 1. Kiểm tra trạng thái trận đấu (chống ghi nhận 2 lần)
      const existing = await tx.query<any>(
        `SELECT id, result FROM matches WHERE id = $1 FOR UPDATE`,
        [matchId]
      );

      if (existing.rows.length === 0) {
        // Tạo nếu chưa có
        await tx.query(
          `INSERT INTO matches (id, seed, phase, result, base_hp, mvp_player_id, stats, started_at, ended_at)
           VALUES ($1, 777, 'RESULTS', $2, 10000, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [matchId, result, mvpPlayerId, JSON.stringify(stats)]
        );
      } else if (existing.rows[0].result !== 'IN_PROGRESS') {
        // Trận đấu đã được lưu kết quả trước đó
        return { saved: false };
      } else {
        await tx.query(
          `UPDATE matches 
           SET result = $1, mvp_player_id = $2, stats = $3, ended_at = CURRENT_TIMESTAMP 
           WHERE id = $4`,
          [result, mvpPlayerId, JSON.stringify(stats), matchId]
        );
      }

      // 2. Lưu thành tích từng người chơi trong trận (chuẩn hóa Player ID theo PlayerRepository)
      for (const p of playerContributions) {
        const provider = p.provider || 'mock';
        const platformUserId = p.userId.startsWith(`usr_${provider}_`) ? p.userId.replace(`usr_${provider}_`, '') : p.userId;
        const dbPlayerId = p.playerId || `usr_${provider}_${platformUserId}`;

        // Đảm bảo player đã tồn tại trong bảng players với canonical ID
        await tx.query(
          `INSERT INTO players (id, provider, platform_user_id, username, squad, level, xp, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (provider, platform_user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
          [dbPlayerId, provider, platformUserId, p.username || platformUserId, p.squad || 'bravo']
        );

        await tx.query(
          `INSERT INTO match_players (
            match_id, player_id, squad, score, competitive_score, gift_score, has_joined,
            kills, assists, repairs, rescues, boss_damage, gift_damage
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0)
          ON CONFLICT (match_id, player_id) DO UPDATE SET
            score = EXCLUDED.score,
            competitive_score = EXCLUDED.competitive_score,
            gift_score = EXCLUDED.gift_score,
            kills = EXCLUDED.kills,
            assists = EXCLUDED.assists,
            repairs = EXCLUDED.repairs,
            rescues = EXCLUDED.rescues,
            boss_damage = EXCLUDED.boss_damage`,
          [
            matchId,
            dbPlayerId,
            p.squad || 'bravo',
            p.score || 0,
            p.competitiveScore || 0,
            p.giftScore || 0,
            p.hasJoined !== false,
            p.kills || 0,
            p.assists || 0,
            p.repairs || 0,
            p.rescues || 0,
            p.bossDamage || 0,
          ]
        );
      }

      // 3. Tạo snapshot bảng xếp hạng trận đấu
      const snapshotId = `lbs_match_${matchId}`;
      const snapshotData = JSON.stringify({
        matchId,
        result,
        mvpPlayerId,
        leaderboard: playerContributions
          .filter((p) => p.hasJoined)
          .sort((a, b) => b.competitiveScore - a.competitiveScore)
          .slice(0, 10),
      });

      await tx.query(
        `INSERT INTO leaderboard_snapshots (id, scope, period_key, data, created_at)
         VALUES ($1, 'match', $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO NOTHING`,
        [snapshotId, matchId, snapshotData]
      );

      return { saved: true };
    });
  }

  public async getLeaderboardSnapshot(scope: string, periodKey: string): Promise<any | null> {
    const res = await this.db.query<any>(
      `SELECT data FROM leaderboard_snapshots WHERE scope = $1 AND period_key = $2 ORDER BY created_at DESC LIMIT 1`,
      [scope, periodKey]
    );
    return res.rows[0]?.data || null;
  }
}
