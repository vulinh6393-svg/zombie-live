import { MatchSnapshot, SoldierSnapshot, ZombieSnapshot, MatchPhase, MatchResult } from '@zombie-live/shared';

export interface TowerSnapshot {
  id: string;
  type: 'machinegun' | 'plasma' | 'tesla';
  name: string;
  x: number;
  y: number;
  targetId?: string;
  level: number;
}

export interface ExtendedMatchSnapshot extends MatchSnapshot {
  towers?: TowerSnapshot[];
  giftSkillActive?: {
    skillId: string;
    name: string;
    remainingSeconds: number;
    senderName?: string;
  };
  mvpPlayers?: Array<{
    name: string;
    points: number;
    avatarColor?: number;
  }>;
}

export type { MatchSnapshot, SoldierSnapshot, ZombieSnapshot, MatchPhase, MatchResult };
