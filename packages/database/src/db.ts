import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

export interface DatabaseClient {
  query<T = any>(query: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
  exec(sql: string): Promise<void>;
  transaction<T>(callback: (tx: DatabaseClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export class PGliteDatabaseAdapter implements DatabaseClient {
  private pglite: PGlite;
  private initialized = false;

  constructor(dataDir?: string) {
    this.pglite = new PGlite(dataDir);
  }

  public async init(options?: { runMigrations?: boolean; seed?: boolean }): Promise<void> {
    if (this.initialized) return;

    if (options?.runMigrations !== false) {
      await this.applyMigrations();
    }

    if (options?.seed) {
      await this.applySeed();
    }

    this.initialized = true;
  }

  private async applyMigrations(): Promise<void> {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const migrationCandidates = [
      path.join(currentDir, '../prisma/migrations/20261111_init/migration.sql'),
      path.join(currentDir, '../../prisma/migrations/20261111_init/migration.sql'),
      path.join(process.cwd(), 'packages/database/prisma/migrations/20261111_init/migration.sql'),
      path.join(process.cwd(), 'prisma/migrations/20261111_init/migration.sql'),
    ];

    let migrationSql = '';
    for (const p of migrationCandidates) {
      if (fs.existsSync(p)) {
        migrationSql = fs.readFileSync(p, 'utf-8');
        break;
      }
    }

    if (migrationSql) {
      await this.pglite.exec(migrationSql);
    }
  }

  private async applySeed(): Promise<void> {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const seedCandidates = [
      path.join(currentDir, '../prisma/seed.sql'),
      path.join(currentDir, '../../prisma/seed.sql'),
      path.join(process.cwd(), 'packages/database/prisma/seed.sql'),
      path.join(process.cwd(), 'prisma/seed.sql'),
    ];

    let seedSql = '';
    for (const p of seedCandidates) {
      if (fs.existsSync(p)) {
        seedSql = fs.readFileSync(p, 'utf-8');
        break;
      }
    }

    if (seedSql) {
      await this.pglite.exec(seedSql);
    }
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    const res = await this.pglite.query<T>(sql, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount ?? res.rows.length,
    };
  }

  public async exec(sql: string): Promise<void> {
    await this.pglite.exec(sql);
  }

  public async transaction<T>(callback: (tx: DatabaseClient) => Promise<T>): Promise<T> {
    return this.pglite.transaction(async (tx) => {
      const txAdapter: DatabaseClient = {
        query: async <R = any>(sql: string, params: any[] = []) => {
          const r = await tx.query<R>(sql, params);
          return { rows: r.rows, rowCount: r.rowCount ?? r.rows.length };
        },
        exec: async (sql: string) => {
          await tx.exec(sql);
        },
        transaction: async () => {
          throw new Error('Nested transactions not supported');
        },
        close: async () => {},
      };
      return callback(txAdapter);
    });
  }

  public async close(): Promise<void> {
    await this.pglite.close();
  }
}

// Global Singleton for the application
let defaultInstance: DatabaseClient | null = null;

export async function getDatabaseClient(dataDir?: string): Promise<DatabaseClient> {
  if (!defaultInstance) {
    const adapter = new PGliteDatabaseAdapter(dataDir);
    await adapter.init({ runMigrations: true, seed: true });
    defaultInstance = adapter;
  }
  return defaultInstance;
}
