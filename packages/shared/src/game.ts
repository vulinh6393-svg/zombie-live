import { z } from 'zod';

export const MatchPhaseSchema = z.enum([
  'PREPARING',
  'WAVE_1',
  'WAVE_2',
  'WAVE_3',
  'WAVE_4',
  'BOSS',
  'RESULTS',
  'RESET',
  'PAUSED',
]);
export type MatchPhase = z.infer<typeof MatchPhaseSchema>;

export const MatchResultSchema = z.enum(['VICTORY', 'DEFEAT', 'IN_PROGRESS']);
export type MatchResult = z.infer<typeof MatchResultSchema>;

export interface SoldierSnapshot {
  id: string;
  userId: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  targetZombieId?: string;
}

export interface ZombieSnapshot {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  lane: number;
  isBoss?: boolean;
}

export interface MatchSnapshot {
  matchId: string;
  seed: number;
  tick: number;
  elapsedSeconds: number;
  phase: MatchPhase;
  baseHp: number;
  maxBaseHp: number;
  soldiers: SoldierSnapshot[];
  zombies: ZombieSnapshot[];
  activePlayerCount: number;
  bossHp?: number;
  maxBossHp?: number;
  result: MatchResult;
}
