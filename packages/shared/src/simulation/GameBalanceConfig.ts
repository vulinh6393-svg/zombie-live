import { z } from 'zod';

export const ZombieSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  hp: z.number().positive(),
  speed: z.number().positive(), // Multiplier relative to 80px/s
  damage: z.number().positive(),
  firstWave: z.number().int().min(1).max(5),
  armor: z.number().optional(), // Damage reduction percentage 0..1
  attack: z.string().optional(),
  healPerSecond: z.number().optional(),
  stunSeconds: z.number().optional(),
  summonEverySeconds: z.number().optional(),
  summonLimit: z.number().optional(),
  stealthSeconds: z.number().optional(),
  isBoss: z.boolean().optional(),
  stages: z.number().optional(),
});

export type ZombieSpec = z.infer<typeof ZombieSpecSchema>;

export const GameBalanceSchema = z.object({
  version: z.string(),
  round: z.object({
    totalSeconds: z.number(),
    preparationSeconds: z.number(),
    bossStartSeconds: z.number(),
    combatDeadlineSeconds: z.number(),
    resultSeconds: z.number(),
    baseHp: z.number(),
    baseDamageReduction: z.number(),
    waveScheduleSeconds: z.array(z.number()),
  }),
  soldier: z.object({
    hp: z.number(),
    damagePerShot: z.number(),
    shotIntervalMs: z.number(),
    renderCap: z.number(),
    baseSkillEnergyMax: z.number(),
  }),
  zombies: z.array(ZombieSpecSchema),
  commands: z.record(z.string(), z.object({
    cooldownSeconds: z.number(),
    repairProgress: z.number().optional(),
  })),
  giftSkills: z.record(z.string(), z.any()),
  leaderboard: z.object({
    kill: z.number(),
    assist: z.number(),
    repair: z.number(),
    rescue: z.number(),
    bossDamagePerPoint: z.number(),
    paidSkillExcludedFromCompetitiveScore: z.boolean(),
  }),
});

export type GameBalanceConfig = z.infer<typeof GameBalanceSchema>;

/**
 * Cấu hình cân bằng trò chơi chuẩn SSOT theo docs/GAME_BALANCE.json
 */
export const DEFAULT_GAME_BALANCE: GameBalanceConfig = {
  version: '1.0-mvp',
  round: {
    totalSeconds: 300,
    preparationSeconds: 20,
    bossStartSeconds: 240,
    combatDeadlineSeconds: 280,
    resultSeconds: 20,
    baseHp: 10000,
    baseDamageReduction: 0.1,
    waveScheduleSeconds: [20, 80, 140, 200, 240],
  },
  soldier: {
    hp: 100,
    damagePerShot: 15,
    shotIntervalMs: 1000,
    renderCap: 40,
    baseSkillEnergyMax: 100,
  },
  zombies: [
    { id: 'walker', name: 'Zombie Thường', hp: 60, speed: 1.0, damage: 20, firstWave: 1 },
    { id: 'runner', name: 'Zombie Chạy', hp: 40, speed: 2.0, damage: 15, firstWave: 2 },
    { id: 'armored', name: 'Zombie Giáp', hp: 200, speed: 0.6, damage: 30, firstWave: 2, armor: 0.3 },
    { id: 'spitter', name: 'Zombie Độc', hp: 90, speed: 0.9, damage: 10, firstWave: 3, attack: 'dot_3s' },
    { id: 'healer', name: 'Zombie Hồi Máu', hp: 100, speed: 0.7, damage: 8, firstWave: 3, healPerSecond: 10 },
    { id: 'brute', name: 'Zombie Khổng Lồ', hp: 700, speed: 0.35, damage: 100, firstWave: 4 },
    { id: 'shocker', name: 'Zombie Điện', hp: 160, speed: 1.1, damage: 25, firstWave: 4, stunSeconds: 2 },
    { id: 'summoner', name: 'Zombie Triệu Hồi', hp: 250, speed: 0.55, damage: 15, firstWave: 4, summonEverySeconds: 8, summonLimit: 6 },
    { id: 'shadow', name: 'Zombie Bóng Tối', hp: 120, speed: 1.6, damage: 45, firstWave: 5, stealthSeconds: 2 },
    { id: 'zombie_king', name: 'Zombie Vua', hp: 12000, speed: 0.25, damage: 200, firstWave: 5, isBoss: true, stages: 3 },
  ],
  commands: {
    JOIN: { cooldownSeconds: 0 },
    BAN: { cooldownSeconds: 10 },
    SUA: { cooldownSeconds: 15, repairProgress: 15 },
    CUU: { cooldownSeconds: 20 },
    SKILL: { cooldownSeconds: 30 },
    BOSS: { cooldownSeconds: 15 },
  },
  giftSkills: {
    reinforcements: { durationSeconds: 12, maxSoldiers: 12 },
    machinegun: { durationSeconds: 15, maxTurrets: 3 },
    shield: { durationSeconds: 10, damageReduction: 0.3, stack: 'refresh' },
    airstrike: { durationSeconds: 5, pulses: 3, cooldownSeconds: 20 },
    mech: { durationSeconds: 15, maxActive: 1 },
    honor: { durationSeconds: 3, cosmeticOnly: true },
  },
  leaderboard: {
    kill: 10,
    assist: 4,
    repair: 2,
    rescue: 20,
    bossDamagePerPoint: 100,
    paidSkillExcludedFromCompetitiveScore: true,
  },
};

// Validate ngay khi import để bảo đảm dữ liệu luôn đúng chuẩn schema
GameBalanceSchema.parse(DEFAULT_GAME_BALANCE);
