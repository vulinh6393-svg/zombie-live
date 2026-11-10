import { z } from 'zod';
import { GateCollisionState, WallCollisionState, WallState } from './simulation/BastionCollisionSystem.js';

export const MatchPhaseSchema = z.enum([
  'PREPARING',
  'WAVE_1',
  'WAVE_2',
  'WAVE_3',
  'WAVE_4',
  'WAVE_5',
  'BOSS',
  'RESULTS',
  'RESET',
  'PAUSED',
]);
export type MatchPhase = z.infer<typeof MatchPhaseSchema>;

export const MatchResultSchema = z.enum(['VICTORY', 'DEFEAT', 'IN_PROGRESS']);
export type MatchResult = z.infer<typeof MatchResultSchema>;

export const CombatEventTypeSchema = z.enum([
  'SHOOT',
  'HIT',
  'DEATH',
  'WALL_HIT',
  'GIFT_SKILL',
  'COMMAND_FEEDBACK',
]);
export type CombatEventType = z.infer<typeof CombatEventTypeSchema>;

export interface PlayerContribution {
  userId: string;
  userName: string;
  avatarUrl?: string;
  squad: 'alpha' | 'bravo' | 'charlie';
  score: number;
  kills: number;
  assists: number;
  repairs: number;
  rescues: number;
  bossDamage: number;
  lastActionTick: number;
}

export interface CombatEvent {
  id: string; // Unique event ID (e.g. evt_{tick}_{seq})
  tick: number;
  type: CombatEventType;
  sourceId: string;
  targetId?: string;
  damage?: number;
  isCritical?: boolean;
  x: number;
  y: number;
}

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
  isDead?: boolean;
  isAttacking?: boolean;
}

export interface TowerSnapshot {
  id: string;
  type: 'machinegun' | 'plasma' | 'tesla';
  name: string;
  x: number;
  y: number;
  level: number;
  targetZombieId?: string;
}

export interface GateState {
  state: GateCollisionState;
  doorLeftX: number;
  doorRightX: number;
}

export interface WallSnapshotState {
  id: 'LEFT' | 'RIGHT';
  state: WallCollisionState;
  hp: number;
  maxHp: number;
}

export interface GiftSkillState {
  skillId: string;
  name: string;
  remainingSeconds: number;
  senderName?: string;
  targetX?: number;
  targetY?: number;
}

export interface WaveState {
  waveNumber: number;
  remainingSeconds: number;
  totalZombiesInWave: number;
  killedZombiesInWave: number;
}

export interface MatchSnapshot {
  matchId: string;
  seed: number;
  tick: number;
  sequenceId: number; // Monotonically increasing sequence number for out-of-order deduplication
  serverTime: number; // Monotonic or epoch timestamp in ms
  phase: MatchPhase;
  baseHp: number;
  maxBaseHp: number;
  walls: {
    left: WallSnapshotState;
    right: WallSnapshotState;
  };
  gate: GateState;
  soldiers: SoldierSnapshot[];
  zombies: ZombieSnapshot[];
  towers: TowerSnapshot[];
  recentEvents: CombatEvent[];
  activeGiftSkill?: GiftSkillState;
  waveState?: WaveState;
  waveRemainingSeconds?: number;
  activePlayerCount: number;
  bossHp?: number;
  maxBossHp?: number;
  result: MatchResult;
  elapsedSeconds?: number;
  mvpPlayers?: Array<{ name: string; points: number; avatarColor?: number }>;
}
