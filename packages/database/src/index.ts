export const DATABASE_VERSION = '1.0.0';

export * from './db.js';
export * from './repositories/PlayerRepository.js';
export * from './repositories/GiftLedgerRepository.js';
export * from './repositories/MatchRepository.js';
export * from './repositories/MissionRepository.js';
export * from './repositories/OutboxRepository.js';
export * from './repositories/CommandJournalRepository.js';

export interface DatabaseStatus {
  isConfigured: boolean;
  provider: string;
}

export function getDatabaseStatus(): DatabaseStatus {
  return {
    isConfigured: true,
    provider: 'postgresql',
  };
}
