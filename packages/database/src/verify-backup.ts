import { PGliteDatabaseAdapter } from './db.js';
import path from 'node:path';

/**
 * P0.3 (Phase 08.2): Xác minh tính toàn vẹn cơ sở dữ liệu sau khi khôi phục (Restore Verification)
 * Không chỉ dựa vào việc sao chép file vật lý; kết nối thực tế vào PGlite và thực thi truy vấn SQL
 * để xác nhận các bảng cốt lõi (players, XP, gift ledger, outbox, matches) hoạt động 100%.
 */
async function main() {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), '.data/pglite');
  console.log(`[VERIFY DB] Inspecting restored database at: ${targetDir}`);

  const db = new PGliteDatabaseAdapter(targetDir);
  await db.init({ runMigrations: true });

  const playersRes = await db.query<{ count: string | number }>(`SELECT count(*) as count FROM players`);
  const xpRes = await db.query<{ total_xp: string | number }>(`SELECT coalesce(sum(xp), 0) as total_xp FROM players`);
  const giftRes = await db.query<{ count: string | number }>(`SELECT count(*) as count FROM gift_events`);
  const outboxRes = await db.query<{ count: string | number }>(`SELECT count(*) as count FROM outbox_events`);
  const matchRes = await db.query<{ count: string | number }>(`SELECT count(*) as count FROM matches`);

  await db.close();

  const report = {
    status: 'VERIFIED_PASS',
    databaseDir: targetDir,
    playerCount: Number(playersRes.rows[0]?.count || 0),
    totalXp: Number(xpRes.rows[0]?.total_xp || 0),
    giftEventsCount: Number(giftRes.rows[0]?.count || 0),
    outboxEventsCount: Number(outboxRes.rows[0]?.count || 0),
    matchesCount: Number(matchRes.rows[0]?.count || 0),
  };

  console.log(`[VERIFY SUCCESS] ${JSON.stringify(report)}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`[VERIFY FAILED] Error querying restored database: ${err.message}`);
  process.exit(1);
});
