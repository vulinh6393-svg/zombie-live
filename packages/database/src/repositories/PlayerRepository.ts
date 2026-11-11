import { DatabaseClient } from '../db.js';

export interface PlayerRecord {
  id: string;
  provider: string;
  platformUserId: string;
  username: string;
  avatarUrl: string | null;
  squad: string;
  level: number;
  xp: number;
  createdAt: Date;
  updatedAt: Date;
}

export function calculateLevelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export class PlayerRepository {
  private playerCache = new Map<string, PlayerRecord>();

  constructor(private db: DatabaseClient) {}

  public async findOrCreate(
    provider: string,
    platformUserId: string,
    username: string,
    squad: string = 'bravo',
    avatarUrl?: string
  ): Promise<PlayerRecord> {
    const cacheKey = `${provider}:${platformUserId}`;
    const cached = this.playerCache.get(cacheKey);
    if (cached && (!username || cached.username === username)) {
      return cached;
    }

    const existing = await this.db.query<any>(
      `SELECT id, provider, platform_user_id as "platformUserId", username, avatar_url as "avatarUrl", 
              squad, level, xp, created_at as "createdAt", updated_at as "updatedAt"
       FROM players 
       WHERE provider = $1 AND platform_user_id = $2`,
      [provider, platformUserId]
    );

    if (existing.rows.length > 0) {
      // Cập nhật tên nếu có thay đổi và username mới không phải fallback platformUserId
      if (username && username !== platformUserId && existing.rows[0].username !== username) {
        await this.db.query(
          `UPDATE players SET username = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [username, existing.rows[0].id]
        );
        existing.rows[0].username = username;
      }
      this.playerCache.set(cacheKey, existing.rows[0]);
      return existing.rows[0];
    }

    const id = `usr_${provider}_${platformUserId}`;
    await this.db.query(
      `INSERT INTO players (id, provider, platform_user_id, username, avatar_url, squad, level, xp, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (provider, platform_user_id) DO UPDATE SET username = EXCLUDED.username`,
      [id, provider, platformUserId, username, avatarUrl || null, squad]
    );

    const inserted = await this.db.query<any>(
      `SELECT id, provider, platform_user_id as "platformUserId", username, avatar_url as "avatarUrl", 
              squad, level, xp, created_at as "createdAt", updated_at as "updatedAt"
       FROM players 
       WHERE id = $1`,
      [id]
    );

    const record = inserted.rows[0];
    this.playerCache.set(cacheKey, record);
    return record;
  }

  public async addXp(
    playerId: string,
    xpAmount: number
  ): Promise<{ oldXp: number; newXp: number; oldLevel: number; newLevel: number; leveledUp: boolean }> {
    return this.db.transaction(async (tx) => {
      const res = await tx.query<any>(
        `SELECT id, xp, level FROM players WHERE id = $1 FOR UPDATE`,
        [playerId]
      );

      if (res.rows.length === 0) {
        throw new Error(`Player ${playerId} not found`);
      }

      const oldXp = res.rows[0].xp;
      const oldLevel = res.rows[0].level;
      const newXp = oldXp + xpAmount;
      const newLevel = calculateLevelFromXp(newXp);
      const leveledUp = newLevel > oldLevel;

      await tx.query(
        `UPDATE players SET xp = $1, level = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [newXp, newLevel, playerId]
      );

      for (const p of this.playerCache.values()) {
        if (p.id === playerId) {
          p.xp = newXp;
          p.level = newLevel;
        }
      }

      return { oldXp, newXp, oldLevel, newLevel, leveledUp };
    });
  }

  public async getProfile(provider: string, platformUserId: string): Promise<PlayerRecord | null> {
    const res = await this.db.query<any>(
      `SELECT id, provider, platform_user_id as "platformUserId", username, avatar_url as "avatarUrl", 
              squad, level, xp, created_at as "createdAt", updated_at as "updatedAt"
       FROM players 
       WHERE provider = $1 AND platform_user_id = $2`,
      [provider, platformUserId]
    );
    return res.rows[0] || null;
  }

  public async getPublicProfile(playerId: string): Promise<{ id: string; username: string; level: number; squad: string; avatarUrl: string | null } | null> {
    const res = await this.db.query<any>(
      `SELECT id, username, level, squad, avatar_url as "avatarUrl" FROM players WHERE id = $1`,
      [playerId]
    );
    return res.rows[0] || null;
  }
}
