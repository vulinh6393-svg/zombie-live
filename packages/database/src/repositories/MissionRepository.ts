import { DatabaseClient } from '../db.js';
import { calculateLevelFromXp } from './PlayerRepository.js';

export function getVietnamDateString(date: Date = new Date()): string {
  // Chuyển sang múi giờ Asia/Ho_Chi_Minh (UTC+7)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // Định dạng chuẩn YYYY-MM-DD
}

export interface MissionStatus {
  code: string;
  title: string;
  description: string;
  currentValue: number;
  targetValue: number;
  completed: boolean;
  xpReward: number;
  period: string;
}

export class MissionRepository {
  private missionDefsCache = new Map<string, any>();

  constructor(private db: DatabaseClient) {}

  public async recordAction(
    playerId: string,
    action: 'JOIN' | 'BAN' | 'SUA' | 'CUU' | 'BOSS'
  ): Promise<{ actionRecorded: boolean; completedNow: boolean; xpGranted: number }> {
    const codeMap: Record<string, string> = {
      JOIN: 'DAILY_JOIN',
      BAN: 'DAILY_SHOOT',
      SUA: 'DAILY_REPAIR',
      CUU: 'DAILY_RESCUE',
      BOSS: 'DAILY_BOSS',
    };

    const missionCode = codeMap[action];
    if (!missionCode) {
      return { actionRecorded: false, completedNow: false, xpGranted: 0 };
    }

    const period = getVietnamDateString();

    return this.db.transaction(async (tx) => {
      // 1. Lấy thông tin nhiệm vụ (có cache)
      let mission = this.missionDefsCache.get(missionCode);
      if (!mission) {
        const missionRes = await tx.query<any>(
          `SELECT id, code, target_value as "targetValue", xp_reward as "xpReward" 
           FROM missions WHERE code = $1`,
          [missionCode]
        );

        if (missionRes.rows.length === 0) {
          return { actionRecorded: false, completedNow: false, xpGranted: 0 };
        }
        mission = missionRes.rows[0];
        this.missionDefsCache.set(missionCode, mission);
      }

      // 2. Tìm hoặc khởi tạo tiến độ nhiệm vụ trong chu kỳ ngày hiện tại
      let progressRes = await tx.query<any>(
        `SELECT id, current_val as "currentVal", completed 
         FROM mission_progress 
         WHERE player_id = $1 AND mission_id = $2 AND period = $3 FOR UPDATE`,
        [playerId, mission.id, period]
      );

      let currentVal = 0;
      let completed = false;
      let progressId = '';

      if (progressRes.rows.length === 0) {
        progressId = `mp_${playerId}_${mission.id}_${period}`;
        await tx.query(
          `INSERT INTO mission_progress (id, player_id, mission_id, period, current_val, completed, updated_at)
           VALUES ($1, $2, $3, $4, 0, false, CURRENT_TIMESTAMP)`,
          [progressId, playerId, mission.id, period]
        );
      } else {
        progressId = progressRes.rows[0].id;
        currentVal = progressRes.rows[0].currentVal;
        completed = progressRes.rows[0].completed;
      }

      // Nếu đã hoàn thành nhiệm vụ trong ngày hôm nay, không cộng thêm
      if (completed) {
        return { actionRecorded: true, completedNow: false, xpGranted: 0 };
      }

      currentVal += 1;
      let completedNow = false;
      let xpGranted = 0;

      if (currentVal >= mission.targetValue) {
        completedNow = true;
        xpGranted = mission.xpReward;
        currentVal = mission.targetValue;

        // Cập nhật trạng thái hoàn thành
        await tx.query(
          `UPDATE mission_progress 
           SET current_val = $1, completed = true, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [currentVal, progressId]
        );

        // Ghi nhận trả thưởng với unique source_key
        const sourceKey = `${playerId}_${mission.code}_${period}`;
        const grantId = `rg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const grantRes = await tx.query(
          `INSERT INTO reward_grants (id, source_key, player_id, xp_granted, granted_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
           ON CONFLICT (source_key) DO NOTHING`,
          [grantId, sourceKey, playerId, xpGranted]
        );

        // Chỉ cộng XP vào người chơi nếu reward grant được tạo mới thành công
        if (grantRes.rowCount > 0) {
          const pRes = await tx.query<any>(
            `SELECT xp FROM players WHERE id = $1 FOR UPDATE`,
            [playerId]
          );

          if (pRes.rows.length > 0) {
            const newXp = pRes.rows[0].xp + xpGranted;
            const newLevel = calculateLevelFromXp(newXp);
            await tx.query(
              `UPDATE players SET xp = $1, level = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
              [newXp, newLevel, playerId]
            );
          }
        }
      } else {
        await tx.query(
          `UPDATE mission_progress SET current_val = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [currentVal, progressId]
        );
      }

      return {
        actionRecorded: true,
        completedNow,
        xpGranted,
      };
    });
  }

  public async getPlayerMissions(playerId: string): Promise<MissionStatus[]> {
    const period = getVietnamDateString();
    const res = await this.db.query<any>(
      `SELECT m.code, m.title, m.description, m.target_value as "targetValue", m.xp_reward as "xpReward",
              COALESCE(mp.current_val, 0) as "currentValue",
              COALESCE(mp.completed, false) as "completed"
       FROM missions m
       LEFT JOIN mission_progress mp ON mp.mission_id = m.id AND mp.player_id = $1 AND mp.period = $2
       ORDER BY m.code ASC`,
      [playerId, period]
    );

    return res.rows.map((r) => ({
      code: r.code,
      title: r.title,
      description: r.description,
      currentValue: r.currentValue,
      targetValue: r.targetValue,
      completed: r.completed,
      xpReward: r.xpReward,
      period,
    }));
  }
}
