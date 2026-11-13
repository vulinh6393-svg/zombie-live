import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

const { Pool } = pg;

export interface DatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
  exec(sql: string): Promise<void>;
  transaction<T>(callback: (tx: DatabaseClient) => Promise<T>): Promise<T>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
  getBackendType(): 'postgres-pool' | 'pglite-filesystem-persistent' | 'pglite-in-memory';
}

/**
 * Versioned Migrations Runner
 * Ensures migrations run exactly once per database using `_migrations` tracking table.
 */
export async function runVersionedMigrations(client: DatabaseClient): Promise<void> {
  await client.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedRes = await client.query<{ id: string }>(`SELECT id FROM _migrations`);
  const appliedSet = new Set(appliedRes.rows.map((r) => r.id));

  const currentDir = path.dirname(fileURLToPath(import.meta.url));

  // Định nghĩa danh sách migrations tuần tự theo thứ tự thời gian
  const migrationsToRun = [
    {
      id: '20261111_init',
      candidates: [
        path.join(currentDir, '../prisma/migrations/20261111_init/migration.sql'),
        path.join(currentDir, '../../prisma/migrations/20261111_init/migration.sql'),
        path.join(process.cwd(), 'packages/database/prisma/migrations/20261111_init/migration.sql'),
        path.join(process.cwd(), 'prisma/migrations/20261111_init/migration.sql'),
      ],
    },
    {
      id: '20261111_outbox_leases',
      candidates: [
        path.join(currentDir, '../prisma/migrations/20261111_outbox_leases/migration.sql'),
        path.join(currentDir, '../../prisma/migrations/20261111_outbox_leases/migration.sql'),
        path.join(process.cwd(), 'packages/database/prisma/migrations/20261111_outbox_leases/migration.sql'),
        path.join(process.cwd(), 'prisma/migrations/20261111_outbox_leases/migration.sql'),
      ],
    },
    {
      id: '20261111_command_journal',
      candidates: [
        path.join(currentDir, '../prisma/migrations/20261111_command_journal/migration.sql'),
        path.join(currentDir, '../../prisma/migrations/20261111_command_journal/migration.sql'),
        path.join(process.cwd(), 'packages/database/prisma/migrations/20261111_command_journal/migration.sql'),
        path.join(process.cwd(), 'prisma/migrations/20261111_command_journal/migration.sql'),
      ],
    },
    {
      id: '20261112_journal_atomic_counters',
      candidates: [
        path.join(currentDir, '../prisma/migrations/20261112_journal_atomic_counters/migration.sql'),
        path.join(currentDir, '../../prisma/migrations/20261112_journal_atomic_counters/migration.sql'),
        path.join(process.cwd(), 'packages/database/prisma/migrations/20261112_journal_atomic_counters/migration.sql'),
        path.join(process.cwd(), 'prisma/migrations/20261112_journal_atomic_counters/migration.sql'),
      ],
    },
    {
      id: '20261112_command_transitions',
      candidates: [
        path.join(currentDir, '../prisma/migrations/20261112_command_transitions/migration.sql'),
        path.join(currentDir, '../../prisma/migrations/20261112_command_transitions/migration.sql'),
        path.join(process.cwd(), 'packages/database/prisma/migrations/20261112_command_transitions/migration.sql'),
        path.join(process.cwd(), 'prisma/migrations/20261112_command_transitions/migration.sql'),
      ],
    },
    {
      id: '20261113_phase08_reliability',
      candidates: [
        path.join(currentDir, '../prisma/migrations/20261113_phase08_reliability/migration.sql'),
        path.join(currentDir, '../../prisma/migrations/20261113_phase08_reliability/migration.sql'),
        path.join(process.cwd(), 'packages/database/prisma/migrations/20261113_phase08_reliability/migration.sql'),
        path.join(process.cwd(), 'prisma/migrations/20261113_phase08_reliability/migration.sql'),
      ],
    },
  ];

  for (const mig of migrationsToRun) {
    if (!appliedSet.has(mig.id)) {
      let sql = '';
      for (const p of mig.candidates) {
        if (fs.existsSync(p)) {
          sql = fs.readFileSync(p, 'utf-8');
          break;
        }
      }
      if (sql) {
        // Atomic migration execution: DDL and _migrations record committed together
        await client.transaction(async (tx) => {
          await tx.exec(sql);
          await tx.query(`INSERT INTO _migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, [mig.id]);
        });
        appliedSet.add(mig.id);
      }
    }
  }

  // Seed script: Apply default missions & gifts if tables are empty
  const countRes = await client.query<{ count: string | number }>(`SELECT count(*) as count FROM missions`);
  const missionCount = Number(countRes.rows[0]?.count || 0);

  if (missionCount === 0) {
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
      await client.exec(seedSql);
    }
  }
}

/**
 * Production PostgreSQL Adapter with Connection Pool, Health Checks & Retries
 */
export class PostgresDatabaseAdapter implements DatabaseClient {
  private pool: pg.Pool;

  constructor(connectionString: string, poolConfig?: { max?: number; idleTimeoutMillis?: number }) {
    this.pool = new Pool({
      connectionString,
      max: poolConfig?.max ?? 20,
      idleTimeoutMillis: poolConfig?.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    const res = await (this.pool as any).query(sql, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount ?? res.rows.length,
    };
  }

  public async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  public async transaction<T>(callback: (tx: DatabaseClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txAdapter: DatabaseClient = {
        query: async <R = any>(sql: string, params: any[] = []) => {
          const r = await (client as any).query(sql, params);
          return { rows: r.rows as R[], rowCount: r.rowCount ?? r.rows.length };
        },
        exec: async (sql: string) => {
          await client.query(sql);
        },
        transaction: async () => {
          throw new Error('Nested transactions not supported');
        },
        healthCheck: async () => true,
        close: async () => {},
        getBackendType: () => 'postgres-pool',
      };

      const result = await callback(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const res = await this.pool.query('SELECT 1 as alive');
      return res.rows.length > 0;
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    resetDatabaseClient();
  }

  public getBackendType(): 'postgres-pool' {
    return 'postgres-pool';
  }
}

/**
 * PGlite Database Adapter (Embedded Postgres Core)
 * Supports persistent filesystem directory (`dataDir`) for cross-process restart persistence.
 */
export class PGliteDatabaseAdapter implements DatabaseClient {
  private pglite: PGlite;
  private dataDir?: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir;
    if (dataDir && dataDir !== ':memory:') {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.pglite = new PGlite(dataDir);
  }

  public async init(opts?: { runMigrations?: boolean; seed?: boolean }): Promise<void> {
    if (opts?.runMigrations) {
      await runVersionedMigrations(this);
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
        healthCheck: async () => true,
        close: async () => {},
        getBackendType: () => this.getBackendType(),
      };
      return callback(txAdapter);
    });
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const res = await this.pglite.query('SELECT 1 as alive');
      return res.rows.length > 0;
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pglite.close();
    resetDatabaseClient();
  }

  public getBackendType(): 'pglite-filesystem-persistent' | 'pglite-in-memory' {
    return this.dataDir && this.dataDir !== ':memory:' ? 'pglite-filesystem-persistent' : 'pglite-in-memory';
  }
}

// Global Singleton for Database Client
let defaultInstance: DatabaseClient | null = null;
let initPromise: Promise<DatabaseClient> | null = null;

export function resetDatabaseClient(): void {
  defaultInstance = null;
  initPromise = null;
}

export interface GetDatabaseOptions {
  databaseUrl?: string;
  dataDir?: string;
  forceNew?: boolean;
}

export async function getDatabaseClient(options?: GetDatabaseOptions | string): Promise<DatabaseClient> {
  const opts: GetDatabaseOptions = typeof options === 'string' ? { dataDir: options } : options || {};

  if (opts.forceNew && defaultInstance) {
    try {
      await defaultInstance.close();
    } catch {}
    resetDatabaseClient();
  }

  if (opts.dataDir && defaultInstance && (defaultInstance as any).dataDir !== opts.dataDir) {
    try {
      await defaultInstance.close();
    } catch {}
    resetDatabaseClient();
  }

  if (defaultInstance) {
    return defaultInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const databaseUrl = opts.databaseUrl || process.env.DATABASE_URL;

    // 1. Thử kết nối PostgreSQL Server thật nếu có DATABASE_URL
    if (databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))) {
      const pgAdapter = new PostgresDatabaseAdapter(databaseUrl);
      const isAlive = await pgAdapter.healthCheck();

      if (isAlive) {
        await runVersionedMigrations(pgAdapter);
        defaultInstance = pgAdapter;
        return pgAdapter;
      }

      if (isProduction) {
        throw new Error(
          `FATAL_DATABASE_ERROR: Cannot connect to PostgreSQL at ${databaseUrl.replace(/:[^:@]+@/, ':***@')} in production environment.`
        );
      }
    } else if (isProduction) {
      throw new Error('FATAL_DATABASE_ERROR: DATABASE_URL must be configured with a valid PostgreSQL URL in production mode.');
    }

    // 2. Local / Development / Test fallback: Persistent disk-backed PGlite
    // Lưu ý: dataDir mặc định lưu vào thư mục .data/pglite trên ổ đĩa, đảm bảo dữ liệu sống qua process restart!
    const defaultDataDir = path.resolve(process.cwd(), '.data/pglite');
    const targetDataDir = opts.dataDir || defaultDataDir;

    let pgliteAdapter: PGliteDatabaseAdapter;
    try {
      pgliteAdapter = new PGliteDatabaseAdapter(targetDataDir);
      await runVersionedMigrations(pgliteAdapter);
    } catch (err: any) {
      if (!isProduction && targetDataDir !== ':memory:') {
        // Tự động phục hồi khi process trước bị kill/crash đột ngột để lại lock
        try {
          fs.rmSync(targetDataDir, { recursive: true, force: true });
        } catch {}
        pgliteAdapter = new PGliteDatabaseAdapter(targetDataDir);
        await runVersionedMigrations(pgliteAdapter);
      } else {
        throw err;
      }
    }
    defaultInstance = pgliteAdapter;
    return pgliteAdapter;
  })();

  const instance = await initPromise;
  return instance;
}

export function resetDatabaseSingleton(): void {
  defaultInstance = null;
  initPromise = null;
}
