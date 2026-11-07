import { z } from 'zod';

export const ZombieConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  hp: z.number().positive(),
  speed: z.number().positive(),
  damage: z.number().positive(),
  firstWave: z.number().int().min(1).max(5),
  armor: z.number().optional(),
  attack: z.string().optional(),
  healPerSecond: z.number().optional(),
  stunSeconds: z.number().optional(),
  summonEverySeconds: z.number().optional(),
  summonLimit: z.number().optional(),
  stealthSeconds: z.number().optional(),
  isBoss: z.boolean().optional(),
  stages: z.number().optional(),
});
export type ZombieConfig = z.infer<typeof ZombieConfigSchema>;

export const RoundConfigSchema = z.object({
  totalSeconds: z.number(),
  preparationSeconds: z.number(),
  bossStartSeconds: z.number(),
  combatDeadlineSeconds: z.number(),
  resultSeconds: z.number(),
  baseHp: z.number().positive(),
  baseDamageReduction: z.number(),
  waveScheduleSeconds: z.array(z.number()),
});

export const SoldierConfigSchema = z.object({
  hp: z.number().positive(),
  damagePerShot: z.number().positive(),
  shotIntervalMs: z.number().positive(),
  renderCap: z.number().int().positive(),
  baseSkillEnergyMax: z.number().positive(),
});

export const GameBalanceSchema = z.object({
  version: z.string(),
  round: RoundConfigSchema,
  soldier: SoldierConfigSchema,
  zombies: z.array(ZombieConfigSchema).length(10),
  commands: z.record(z.object({
    cooldownSeconds: z.number(),
    repairProgress: z.number().optional(),
  })),
  giftSkills: z.record(z.any()),
  leaderboard: z.record(z.any()),
});
export type GameBalance = z.infer<typeof GameBalanceSchema>;

export function parseGameBalance(rawJson: unknown): GameBalance {
  return GameBalanceSchema.parse(rawJson);
}
