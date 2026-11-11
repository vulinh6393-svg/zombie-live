import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGliteDatabaseAdapter } from './db.js';
import { CommandJournalRepository } from './repositories/CommandJournalRepository.js';
import fs from 'node:fs';
import path from 'node:path';

describe('CommandJournalRepository & Simulation Checkpoint Recovery', () => {
  let db: PGliteDatabaseAdapter;
  let journalRepo: CommandJournalRepository;
  const testDir = path.resolve(process.cwd(), '.data/test_journal_' + Date.now());

  beforeAll(async () => {
    db = new PGliteDatabaseAdapter(testDir);
    await db.init({ runMigrations: true });
    journalRepo = new CommandJournalRepository(db);
  });

  afterAll(async () => {
    await db.close();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('appends commands with strictly monotonic sequence numbers for the same match', async () => {
    const matchId = 'match_journal_test_1';

    const c1 = await journalRepo.appendCommand({
      matchId,
      commandId: 'cmd_1',
      tick: 10,
      commandType: 'GIFT_SKILL',
      payload: { skillId: 'airstrike', sender: 'Alice' },
    });
    expect(c1.alreadyExists).toBe(false);
    expect(c1.entry.seq).toBe(1);

    const c2 = await journalRepo.appendCommand({
      matchId,
      commandId: 'cmd_2',
      tick: 15,
      commandType: 'GIFT_SKILL',
      payload: { skillId: 'shield', sender: 'Bob' },
    });
    expect(c2.alreadyExists).toBe(false);
    expect(c2.entry.seq).toBe(2);

    // Duplicate commandId in the same match is recognized
    const c1Dup = await journalRepo.appendCommand({
      matchId,
      commandId: 'cmd_1',
      tick: 20,
      commandType: 'GIFT_SKILL',
      payload: { skillId: 'airstrike', sender: 'Alice' },
    });
    expect(c1Dup.alreadyExists).toBe(true);
    expect(c1Dup.entry.seq).toBe(1);
  });

  it('marks command as APPLIED with applied simulation tick', async () => {
    const matchId = 'match_journal_test_1';
    await journalRepo.markCommandApplied(matchId, 'cmd_1', 10);

    const unapplied = await journalRepo.getCommandsToReplay(matchId, 0);
    const cmd1 = unapplied.find((c) => c.commandId === 'cmd_1');
    expect(cmd1).toBeDefined();
    expect(cmd1?.status).toBe('APPLIED');
    expect(cmd1?.appliedTick).toBe(10);
  });

  it('saves checkpoints and retrieves the latest checkpoint for match recovery', async () => {
    const matchId = 'match_checkpoint_test';

    await journalRepo.saveCheckpoint({
      matchId,
      tick: 50,
      lastJournalSeq: 5,
      stateSnapshot: { tick: 50, baseHp: 9500, waveNumber: 1 },
      stateHash: 'hash_50',
    });

    await journalRepo.saveCheckpoint({
      matchId,
      tick: 100,
      lastJournalSeq: 10,
      stateSnapshot: { tick: 100, baseHp: 8900, waveNumber: 2 },
      stateHash: 'hash_100',
    });

    const latest = await journalRepo.getLatestCheckpoint(matchId);
    expect(latest).toBeDefined();
    expect(latest?.tick).toBe(100);
    expect(latest?.lastJournalSeq).toBe(10);
    expect(latest?.stateHash).toBe('hash_100');
    expect(latest?.stateSnapshot.baseHp).toBe(8900);
  });

  it('recovers unapplied commands strictly after the checkpoint sequence', async () => {
    const matchId = 'match_replay_test';

    for (let i = 1; i <= 5; i++) {
      await journalRepo.appendCommand({
        matchId,
        commandId: `cmd_${i}`,
        tick: i * 10,
        commandType: 'GIFT_SKILL',
        payload: { index: i },
      });
    }

    // Giả sử checkpoint lưu ở seq = 3
    const toReplay = await journalRepo.getCommandsToReplay(matchId, 3);
    expect(toReplay.length).toBe(2);
    expect(toReplay[0].commandId).toBe('cmd_4');
    expect(toReplay[0].seq).toBe(4);
    expect(toReplay[1].commandId).toBe('cmd_5');
    expect(toReplay[1].seq).toBe(5);
  });
});
