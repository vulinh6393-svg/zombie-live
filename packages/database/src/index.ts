export const DATABASE_VERSION = '1.0.0';

export interface DatabaseStatus {
  isConfigured: boolean;
  provider: string;
}

export function getDatabaseStatus(): DatabaseStatus {
  return {
    isConfigured: Boolean(process.env.DATABASE_URL),
    provider: 'postgresql',
  };
}
