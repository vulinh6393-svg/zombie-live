import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildServer } from './server.js';
import { getDatabaseClient, MatchRepository, CommandJournalRepository } from '@zombie-live/database';

describe('Server Crash Recovery & Active Match Restoration (P0.1)', () => {
  let testDataDir: string;
  let stopFn: (() => void) | null = null;
  let activeApp: any = null;

  beforeEach(() => {
    testDataDir = path.join(os.tmpdir(), `zombie_recovery_test_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    fs.mkdirSync(testDataDir, { recursive: true });
  });

  afterEach(async () => {
    if (stopFn) {
      stopFn();
      stopFn = null;
    }
    if (activeApp) {
      await activeApp.close();
      activeApp = null;
    }
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    } catch {}
  });

  it('restores active match, checkpoint state, and replays unapplied journal commands after crash', async () => {
    const matchId = `match_crash_test_${Date.now()}`;
    const seed = 777;
    const adminSecret = 'recovery_secret_key_12345';

    // 1. Khởi động Server 1 (Instance ban đầu)
    const server1 = buildServer({
      adminSecret,
      engineSeed: seed,
      matchId,
      dbDataDir: testDataDir,
      logger: false,
      disableAutoTick: true,
    });
    stopFn = server1.stopEngine;
    activeApp = server1.app;

    await server1.app.ready();
    const engine1 = server1.engine;

    // Giả lập trận đấu bước đến tick 50
    for (let t = 0; t < 50; t++) {
      engine1.step();
    }
    expect(engine1.tick).toBe(50);

    const db1 = await getDatabaseClient({ dataDir: testDataDir });
    const journalRepo1 = new CommandJournalRepository(db1);

    // Kích hoạt một lệnh kỹ năng trước checkpoint: Shield tại tick 50
    await journalRepo1.appendCommand({
      matchId,
      commandId: 'cmd_pre_chk_shield',
      tick: 50,
      commandType: 'GIFT_SKILL',
      payload: {
        senderId: 'user_tanker',
        senderName: 'Bảo Vệ Thành',
        skillId: 'shield',
        deltaQuantity: 1,
      },
    });

    const cmd1Result = engine1.applySkillCommand({
      commandId: 'cmd_pre_chk_shield',
      matchId,
      seq: 1,
      targetTick: 50,
      sourceUserId: 'user_tanker',
      sourceUserName: 'Bảo Vệ Thành',
      skillId: 'shield',
      quantity: 1,
    });
    expect(cmd1Result.success).toBe(true);

    // Bước tiếp từ tick 50 đến tick 100 (Tại tick 100, onCheckpointNeeded tự động lưu checkpoint vào DB)
    for (let t = 50; t < 100; t++) {
      engine1.step();
    }
    expect(engine1.tick).toBe(100);

    // Chờ checkpoint được ghi nhận vào database
    await new Promise((r) => setTimeout(r, 100));

    // Sau checkpoint: Thêm 2 commands vào journal ở tick 110 và tick 120
    await journalRepo1.appendCommand({
      matchId,
      commandId: 'cmd_post_chk_reinf',
      tick: 110,
      commandType: 'GIFT_SKILL',
      payload: {
        senderId: 'user_supporter',
        senderName: 'Tiếp Viện 1',
        skillId: 'reinforcements',
        deltaQuantity: 1,
      },
    });

    engine1.queueSkillCommand({
      commandId: 'cmd_post_chk_reinf',
      matchId,
      seq: 2,
      targetTick: 110,
      sourceUserId: 'user_supporter',
      sourceUserName: 'Tiếp Viện 1',
      skillId: 'reinforcements',
      quantity: 1,
    });

    for (let t = 100; t < 120; t++) {
      if (t === 119) {
        // Command 3: Healing tại tick 120
        await journalRepo1.appendCommand({
          matchId,
          commandId: 'cmd_post_chk_heal',
          tick: 120,
          commandType: 'GIFT_SKILL',
          payload: {
            senderId: 'user_medic',
            senderName: 'Y Tá Chiến Trường',
            skillId: 'healing',
            deltaQuantity: 1,
          },
        });

        engine1.queueSkillCommand({
          commandId: 'cmd_post_chk_heal',
          matchId,
          seq: 3,
          targetTick: 120,
          sourceUserId: 'user_medic',
          sourceUserName: 'Y Tá Chiến Trường',
          skillId: 'healing',
          quantity: 1,
        });
      }
      engine1.step();
    }
    expect(engine1.tick).toBe(120);

    // Ghi nhận hash chuẩn tại tick 120 của Server 1 trước khi crash
    const expectedStateHash = engine1.getStateHash();
    const expectedBaseHp = engine1.baseHp;

    // 2. CRASH SERVER 1 (Đột ngột tắt / đóng kết nối)
    server1.stopEngine();
    await server1.app.close();
    stopFn = null;
    activeApp = null;

    // 3. Khởi động Server 2 (Instance phục hồi sau Crash)
    // Server 2 khởi động với matchId mặc định mới, nhưng DB chứa active match cũ
    const server2 = buildServer({
      adminSecret,
      engineSeed: seed,
      dbDataDir: testDataDir,
      logger: false,
      disableAutoTick: true,
    });
    stopFn = server2.stopEngine;
    activeApp = server2.app;

    // Chờ onReady hook hoàn tất quá trình phục hồi từ DB
    await server2.app.ready();
    const engine2 = server2.engine;

    // Xác minh P0.1: Server 2 đã tự động nhận diện active matchId cũ
    expect(engine2.matchId).toBe(matchId);
    expect(engine2.seed).toBe(seed);

    // Sau khi nạp checkpoint (tick 100) và replay journal commands (seq 2 và seq 3),
    // bước engine2 đến tick 120 để hoàn thành chu trình phục hồi
    while (engine2.tick < 120) {
      engine2.step();
    }

    // Xác minh tính tương đương tuyệt đối của trạng thái phục hồi
    expect(engine2.tick).toBe(120);
    expect(engine2.baseHp).toBe(expectedBaseHp);
    expect(engine2.getStateHash()).toBe(expectedStateHash);

    // Xác minh chống thực thi trùng lặp (Deduplication)
    const duplicateReinf = engine2.applySkillCommand({
      commandId: 'cmd_post_chk_reinf',
      matchId,
      targetTick: 125,
      sourceUserId: 'user_supporter',
      sourceUserName: 'Tiếp Viện 1',
      skillId: 'reinforcements',
      quantity: 1,
    });
    expect(duplicateReinf.success).toBe(false);
    expect(duplicateReinf.reason).toBe('COMMAND_ALREADY_EXECUTED');
  });
});
