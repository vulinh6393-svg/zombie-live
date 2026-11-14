import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DurableEventQueue } from './queue.js';
import { LiveEventDispatcher } from './dispatcher.js';
import fs from 'node:fs';
import path from 'node:path';

describe('DurableEventQueue & Fault-Injection Resilience (Final Reliability Gate)', () => {
  const testDir = path.resolve(process.cwd(), '.data/test_wal_queue_' + Date.now());
  const testWalFile = path.join(testDir, 'bridge_wal.jsonl');
  const testDlqFile = path.join(testDir, 'bridge_dlq.jsonl');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('1. Crash right after enqueue: zero debounce window persists event immediately to disk', () => {
    // Khởi tạo instance 1
    const queue1 = new DurableEventQueue({
      walFile: testWalFile,
      deadLetterFile: testDlqFile,
      maxQueueSize: 100,
    });

    const enqueued = queue1.enqueue({
      id: 'gift_evt_001',
      eventType: 'GIFT',
      payload: { giftId: 'rose', quantity: 1, userId: 'user_1' },
    });
    expect(enqueued).toBe(true);

    // Mô phỏng tiến trình chết ngay lập tức mà không gọi saveDebounce/persistSync:
    // Kiểm tra trực tiếp file WAL trên đĩa phải có nội dung ngay
    expect(fs.existsSync(testWalFile)).toBe(true);
    const walRaw = fs.readFileSync(testWalFile, 'utf-8');
    expect(walRaw).toContain('gift_evt_001');
    expect(walRaw).toContain('ENQUEUE');

    // Instance 2 khởi động lại (Crash Recovery): nạp lại 100% event chưa ACK
    const queue2 = new DurableEventQueue({
      walFile: testWalFile,
      deadLetterFile: testDlqFile,
    });
    expect(queue2.getQueueLength()).toBe(1);
    const pending = queue2.peekPending();
    expect(pending).not.toBeNull();
    expect(pending?.id).toBe('gift_evt_001');
    expect(pending?.status).toBe('PENDING');
  });

  it('2. Crash during WAL write: handles truncated/corrupted line at EOF, preserves valid records and creates forensic .bak', () => {
    const queue1 = new DurableEventQueue({ walFile: testWalFile, deadLetterFile: testDlqFile });
    queue1.enqueue({ id: 'evt_valid_1', eventType: 'COMMENT', payload: { command: 'BAN' } });
    queue1.enqueue({ id: 'evt_valid_2', eventType: 'COMMENT', payload: { command: 'SUA' } });

    // Mô phỏng crash giữa chừng lúc đang ghi line 3 (file bị cắt cụt dở dang)
    fs.appendFileSync(testWalFile, '{"op":"ENQUEUE","id":"evt_corrupted_3","even\n');

    // Khởi động lại: Không được throw crash toàn hệ thống, không được reset về []
    const queue2 = new DurableEventQueue({ walFile: testWalFile, deadLetterFile: testDlqFile });

    // 2 record hợp lệ vẫn phải được bảo toàn nguyên vẹn
    expect(queue2.getQueueLength()).toBe(2);
    expect(queue2.peekPending()?.id).toBe('evt_valid_1');

    // File forensic backup phải được tạo
    const dirFiles = fs.readdirSync(testDir);
    const backupFile = dirFiles.find((f) => f.includes('corrupt') && f.endsWith('.bak'));
    expect(backupFile).toBeDefined();
  });

  it('3. Corrupted queue file: fails closed and NEVER resets queue to empty', () => {
    const queue1 = new DurableEventQueue({ walFile: testWalFile, deadLetterFile: testDlqFile });
    queue1.enqueue({ id: 'evt_alpha', eventType: 'GIFT', payload: { giftId: 'rocket' } });

    // Thêm chuỗi rác vào file WAL
    fs.appendFileSync(testWalFile, 'CORRUPTED_GARBAGE_BYTES_INVALID_JSON_LINE\n');
    queue1.enqueue({ id: 'evt_bravo', eventType: 'GIFT', payload: { giftId: 'laser' } });

    const queue2 = new DurableEventQueue({ walFile: testWalFile, deadLetterFile: testDlqFile });
    // Phải phục hồi được cả evt_alpha và evt_bravo
    expect(queue2.getQueueLength()).toBe(2);
    const allPending = queue2.getAllPending().map((q) => q.id);
    expect(allPending).toContain('evt_alpha');
    expect(allPending).toContain('evt_bravo');
  });

  it('4. Disk full / permission denied: fails closed and does not report fake success', () => {
    // Trỏ walFile vào một đường dẫn không thể ghi (file con trong 1 file thông thường)
    const blockedFile = path.join(testDir, 'blocking_file');
    fs.writeFileSync(blockedFile, 'blocking_file');
    const impossibleWal = path.join(blockedFile, 'wal.jsonl');

    const queue = new DurableEventQueue({ walFile: impossibleWal });
    expect(() => {
      queue.enqueue({ id: 'unwritable_item', eventType: 'COMMENT', payload: {} });
    }).toThrow();
  });

  it('5. HTTP timeout after DB commit: receives idempotent duplicate ACK and acknowledges streak without duplicate skill', async () => {
    let callCount = 0;
    const mockServerUrl = 'http://127.0.0.1:9999';

    // Mock fetch: lần 1 ném timeout (nhưng DB đã commit), lần 2 trả về idempotentDuplicate: true
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, opts: any) => {
      callCount++;
      if (callCount === 1) {
        throw new Error('HTTP timeout simulated');
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          accepted: false,
          idempotentDuplicate: true,
          reason: 'DUPLICATE_EVENT_ALREADY_SETTLED',
        }),
      } as any;
    }) as any;

    try {
      const dispatcher = new LiveEventDispatcher({
        serverUrl: mockServerUrl,
        queueStorageFile: testWalFile,
        deadLetterFile: testDlqFile,
      });

      // Lần 1: gửi gặp timeout -> vào queue
      const res1 = await dispatcher.handleIncomingEvent({
        type: 'gift',
        provider: 'mock',
        liveSessionId: 'default_session',
        eventKey: 'streak_evt_1',
        userId: 'v_user_1',
        username: 'Viewer 1',
        at: new Date().toISOString(),
        gift: { giftId: 'rose', quantity: 1, isFinal: false, streakGroupId: 'streak_grp_1' },
      });
      expect(res1.accepted).toBe(false);
      expect(dispatcher.getQueue().getQueueLength()).toBe(1);

      // Lần 2: background worker drain queue -> nhận duplicate ACK -> markAcked
      const drained = await dispatcher.drainQueue(true);
      expect(drained).toBe(1);
      expect(dispatcher.getQueue().getQueueLength()).toBe(0);

      // Streak được acknowledge an toàn
      expect(dispatcher.getStreakTracker().getLastSettledQuantity('v_user_1', 'rose', 'default_session', 'streak_grp_1')).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('6. Concurrent retry of same event: single-flight prevents simultaneous dispatches', async () => {
    let concurrentCount = 0;
    let maxConcurrentObserved = 0;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      concurrentCount++;
      maxConcurrentObserved = Math.max(maxConcurrentObserved, concurrentCount);
      await new Promise((r) => setTimeout(r, 50));
      concurrentCount--;
      return {
        ok: true,
        status: 200,
        json: async () => ({ accepted: true }),
      } as any;
    }) as any;

    try {
      const dispatcher = new LiveEventDispatcher({
        serverUrl: 'http://127.0.0.1:9999',
        queueStorageFile: testWalFile,
        deadLetterFile: testDlqFile,
      });

      // Dispatch cùng 1 event ID song song 2 lần
      const p1 = dispatcher.dispatchSingleItem('evt_shared_id', { type: 'COMMENT' });
      const p2 = dispatcher.dispatchSingleItem('evt_shared_id', { type: 'COMMENT' });

      const [res1, res2] = await Promise.all([p1, p2]);
      
      // Một cuộc gọi thành công, cuộc gọi kia bị khóa bởi single-flight
      expect(maxConcurrentObserved).toBe(1);
      const oneLocked = res1.reason === 'CONCURRENT_SINGLE_FLIGHT_LOCKED' || res2.reason === 'CONCURRENT_SINGLE_FLIGHT_LOCKED';
      expect(oneLocked).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('7. Bridge restart and replay: unacked events drain smoothly upon restart', async () => {
    // Tạo 3 events trong queue ở instance 1
    const queue1 = new DurableEventQueue({ walFile: testWalFile, deadLetterFile: testDlqFile });
    queue1.enqueue({ id: 'evt_1', eventType: 'COMMENT', payload: {} });
    queue1.enqueue({ id: 'evt_2', eventType: 'COMMENT', payload: {} });
    queue1.enqueue({ id: 'evt_3', eventType: 'COMMENT', payload: {} });

    // Ack evt_1
    queue1.markAcked('evt_1');
    expect(queue1.getQueueLength()).toBe(2);

    // Mô phỏng restart Bridge
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ accepted: true }),
      } as any;
    }) as any;

    try {
      const dispatcher = new LiveEventDispatcher({
        serverUrl: 'http://127.0.0.1:9999',
        queueStorageFile: testWalFile,
        deadLetterFile: testDlqFile,
      });

      expect(dispatcher.getQueue().getQueueLength()).toBe(2);
      const processed = await dispatcher.drainQueue(true);
      expect(processed).toBe(2);
      expect(dispatcher.getQueue().getQueueLength()).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('8. Gift streak 1 -> 5 -> 10: does not lose delta or double-grant upon intermittent network drops', async () => {
    let failRose5Once = true;
    const receivedDeltas: number[] = [];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, opts: any) => {
      const body = JSON.parse(opts.body);
      if (body.quantity === 5 && failRose5Once) {
        failRose5Once = false;
        throw new Error('Simulated network drop on rose count 5');
      }
      receivedDeltas.push(body.deltaQuantity);
      return {
        ok: true,
        status: 200,
        json: async () => ({ accepted: true, deltaQuantity: body.deltaQuantity }),
      } as any;
    }) as any;

    try {
      const dispatcher = new LiveEventDispatcher({
        serverUrl: 'http://127.0.0.1:9999',
        queueStorageFile: testWalFile,
        deadLetterFile: testDlqFile,
      });

      // Packet 1: Rose count 1 (delta = 1) -> Success
      const r1 = await dispatcher.handleIncomingEvent({
        type: 'gift',
        provider: 'mock',
        liveSessionId: 'default_session',
        eventKey: 'stk_1',
        userId: 'stk_user',
        username: 'StreakUser',
        at: new Date().toISOString(),
        gift: { giftId: 'rose', quantity: 1, isFinal: false, streakGroupId: 'streak_combo' },
      });
      expect(r1.accepted).toBe(true);

      // Packet 2: Rose count 5 (delta = 4) -> Fails network once, enqueued
      const r2 = await dispatcher.handleIncomingEvent({
        type: 'gift',
        provider: 'mock',
        liveSessionId: 'default_session',
        eventKey: 'stk_5',
        userId: 'stk_user',
        username: 'StreakUser',
        at: new Date().toISOString(),
        gift: { giftId: 'rose', quantity: 5, isFinal: false, streakGroupId: 'streak_combo' },
      });
      expect(r2.accepted).toBe(false);
      expect(dispatcher.getQueue().getQueueLength()).toBe(1);

      // Drain queue retry -> Thành công gửi delta = 4
      const drained = await dispatcher.drainQueue(true);
      expect(drained).toBe(1);
      expect(dispatcher.getQueue().getQueueLength()).toBe(0);

      // Packet 3: Rose count 10 (delta = 5) -> Success
      const r3 = await dispatcher.handleIncomingEvent({
        type: 'gift',
        provider: 'mock',
        liveSessionId: 'default_session',
        eventKey: 'stk_10',
        userId: 'stk_user',
        username: 'StreakUser',
        at: new Date().toISOString(),
        gift: { giftId: 'rose', quantity: 10, isFinal: true, streakGroupId: 'streak_combo' },
      });
      expect(r3.accepted).toBe(true);

      // Tổng delta được gửi phải chính xác: 1 + 4 + 5 = 10
      expect(receivedDeltas).toEqual([1, 4, 5]);
      const totalDelta = receivedDeltas.reduce((a, b) => a + b, 0);
      expect(totalDelta).toBe(10);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('9. DLQ exhaust and manual replay: moves to DLQ after max retries and replay restores event to pending', () => {
    const queue = new DurableEventQueue({
      walFile: testWalFile,
      deadLetterFile: testDlqFile,
      maxRetries: 3,
    });

    queue.enqueue({ id: 'dlq_test_1', eventType: 'GIFT', payload: { gift: 'lion' } });
    expect(queue.getQueueLength()).toBe(1);

    // 3 lần thất bại
    queue.markInFlight('dlq_test_1');
    queue.markFailed('dlq_test_1', 'Err 1');
    queue.markInFlight('dlq_test_1');
    queue.markFailed('dlq_test_1', 'Err 2');
    queue.markInFlight('dlq_test_1');
    queue.markFailed('dlq_test_1', 'Err 3');

    // Chuyển sang DLQ
    expect(queue.getQueueLength()).toBe(0);
    expect(queue.getDeadLetterCount()).toBe(1);

    // Replay Dead-Letter
    const replayed = queue.replayDeadLetter('dlq_test_1');
    expect(replayed).toBe(true);
    expect(queue.getQueueLength()).toBe(1);
    expect(queue.getDeadLetterCount()).toBe(0);
    expect(queue.peekPending()?.id).toBe('dlq_test_1');
    expect(queue.peekPending()?.retryCount).toBe(0);
  });
});
