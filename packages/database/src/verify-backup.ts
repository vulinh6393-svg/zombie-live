import { PGliteDatabaseAdapter } from './db.js';
import path from 'node:path';
import fs from 'node:fs';

/**
 * P0.2 (Final Reliability Gate): Xác minh tính toàn vẹn cơ sở dữ liệu sau khi khôi phục (Restore Verification)
 * Kết nối thực tế vào PGlite, thực thi truy vấn SQL trên toàn bộ các bảng:
 * - players
 * - total_xp
 * - gift_events
 * - outbox_events
 * - match_command_journal
 * - matches
 * - deferred_match_commands
 *
 * Nếu có `--manifest <path>`, đối chiếu 1:1 các số liệu với `preBackupStats` được ghi trong manifest.
 * Nếu bất kỳ bảng nào sai lệch số dòng hoặc tổng XP, fail-closed và thoát với mã lỗi 1.
 */
async function main() {
  const args = process.argv.slice(2);
  let targetDir = path.resolve(process.cwd(), '.data/pglite');
  let manifestPath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--manifest' && args[i + 1]) {
      manifestPath = path.resolve(args[i + 1]);
      i++;
    } else if (!args[i].startsWith('--')) {
      targetDir = path.resolve(args[i]);
    }
  }

  console.log(`[VERIFY DB] Inspecting restored database at: ${targetDir}`);
  if (manifestPath) {
    console.log(`[VERIFY DB] Cross-referencing pre-backup stats from manifest: ${manifestPath}`);
  }

  const db = new PGliteDatabaseAdapter(targetDir);
  await db.init({ runMigrations: true });

  const playersRes = await db.query<{ count: string | number }>(`SELECT count(*) as count FROM players`);
  const xpRes = await db.query<{ total_xp: string | number }>(`SELECT coalesce(sum(xp), 0) as total_xp FROM players`);
  const giftRes = await db.query<{ count: string | number }>(`SELECT count(*) as count FROM gift_events`);
  const outboxRes = await db.query<{ count: string | number }>(`SELECT count(*) as count FROM outbox_events`);
  const journalRes = await db.query<{ count: string | number }>(`SELECT count(*) as count FROM match_command_journal`);
  const matchRes = await db.query<{ count: string | number }>(`SELECT count(*) as count FROM matches`);
  const deferredRes = await db.query<{ count: string | number }>(`SELECT count(*) as count FROM deferred_match_commands`);
  const processedRes = await db.query<{ count: string | number }>(`SELECT count(*) as count FROM processed_events`);

  await db.close();

  const restoredStats = {
    players: Number(playersRes.rows[0]?.count || 0),
    totalXp: Number(xpRes.rows[0]?.total_xp || 0),
    giftEvents: Number(giftRes.rows[0]?.count || 0),
    outboxEvents: Number(outboxRes.rows[0]?.count || 0),
    commandJournal: Number(journalRes.rows[0]?.count || 0),
    matches: Number(matchRes.rows[0]?.count || 0),
    deferredCommands: Number(deferredRes.rows[0]?.count || 0),
    processedEvents: Number(processedRes.rows[0]?.count || 0),
  };

  // Nếu có manifest: thực hiện đối chiếu nghiêm ngặt
  if (manifestPath) {
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`MANIFEST_FILE_NOT_FOUND: ${manifestPath}`);
    }
    let raw = fs.readFileSync(manifestPath, 'utf-8');
    if (raw.charCodeAt(0) === 0xFEFF) {
      raw = raw.slice(1);
    }
    const manifest = JSON.parse(raw);
    const expected = manifest.preBackupStats;

    if (expected) {
      const mismatches: string[] = [];
      if (expected.players !== undefined && expected.players !== restoredStats.players) {
        mismatches.push(`players mismatch: expected ${expected.players}, got ${restoredStats.players}`);
      }
      if (expected.totalXp !== undefined && expected.totalXp !== restoredStats.totalXp) {
        mismatches.push(`totalXp mismatch: expected ${expected.totalXp}, got ${restoredStats.totalXp}`);
      }
      if (expected.giftEvents !== undefined && expected.giftEvents !== restoredStats.giftEvents) {
        mismatches.push(`giftEvents mismatch: expected ${expected.giftEvents}, got ${restoredStats.giftEvents}`);
      }
      if (expected.outboxEvents !== undefined && expected.outboxEvents !== restoredStats.outboxEvents) {
        mismatches.push(`outboxEvents mismatch: expected ${expected.outboxEvents}, got ${restoredStats.outboxEvents}`);
      }
      if (expected.commandJournal !== undefined && expected.commandJournal !== restoredStats.commandJournal) {
        mismatches.push(`commandJournal mismatch: expected ${expected.commandJournal}, got ${restoredStats.commandJournal}`);
      }
      if (expected.matches !== undefined && expected.matches !== restoredStats.matches) {
        mismatches.push(`matches mismatch: expected ${expected.matches}, got ${restoredStats.matches}`);
      }
      if (expected.deferredCommands !== undefined && expected.deferredCommands !== restoredStats.deferredCommands) {
        mismatches.push(`deferredCommands mismatch: expected ${expected.deferredCommands}, got ${restoredStats.deferredCommands}`);
      }
      if (expected.processedEvents !== undefined && expected.processedEvents !== restoredStats.processedEvents) {
        mismatches.push(`processedEvents mismatch: expected ${expected.processedEvents}, got ${restoredStats.processedEvents}`);
      }

      if (mismatches.length > 0) {
        throw new Error(`RESTORE_DATA_MISMATCH: ${mismatches.join('; ')}`);
      }
      console.log(`[VERIFY DB PASS] All 8 table stats matched pre-backup manifest 100%!`);
    }
  }

  const report = {
    status: 'VERIFIED_PASS',
    databaseDir: targetDir,
    ...restoredStats,
  };

  console.log(`[VERIFY SUCCESS] ${JSON.stringify(report)}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`[VERIFY FAILED] Error querying restored database: ${err.message}`);
  process.exit(1);
});
