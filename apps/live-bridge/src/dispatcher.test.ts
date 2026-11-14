import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveEventDispatcher } from './dispatcher.js';
import { MockLiveAdapter } from './mock.js';
import { DurableEventQueue } from './queue.js';
import fs from 'node:fs';
import path from 'node:path';

describe('LiveEventDispatcher & Durable Queue (Phase 08.2)', () => {
  const testStorageFile = path.resolve(process.cwd(), '.data/test_bridge_queue_' + Date.now() + '.json');
  const testDlqFile = path.resolve(process.cwd(), '.data/test_bridge_dlq_' + Date.now() + '.json');

  afterEach(() => {
    try {
      if (fs.existsSync(testStorageFile)) fs.unlinkSync(testStorageFile);
      if (fs.existsSync(testDlqFile)) fs.unlinkSync(testDlqFile);
    } catch {}
  });

  it('normalizes Vietnamese comment diacritics and routes commands', async () => {
    const dispatcher = new LiveEventDispatcher({
      serverUrl: 'http://localhost:3001',
      queueStorageFile: testStorageFile,
      deadLetterFile: testDlqFile,
    });
    const mockAdapter = new MockLiveAdapter();
    dispatcher.bindAdapter(mockAdapter);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      return {
        ok: true,
        json: async () => ({ accepted: true, squad: 'alpha' }),
      } as any;
    });

    const res = await dispatcher.handleIncomingEvent({
      eventKey: 'evt_1',
      provider: 'mock',
      liveSessionId: 'session_1',
      userId: 'usr_viet_1',
      username: 'TuấnAnhGamer',
      at: new Date().toISOString(),
      type: 'comment',
      comment: 'BẮN',
    });

    expect(res.accepted).toBe(true);
    expect(fetchSpy).toHaveBeenCalled();
    const sentBody = JSON.parse((fetchSpy.mock.calls[0][1]?.body as string) || '{}');
    expect(sentBody.command).toBe('BAN');

    fetchSpy.mockRestore();
    await dispatcher.stop();
  });

  it('correctly maps shortcut comment "2" to "JOIN 2" for Bravo Squad', async () => {
    const dispatcher = new LiveEventDispatcher({
      queueStorageFile: testStorageFile,
      deadLetterFile: testDlqFile,
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        json: async () => ({ accepted: true, squad: 'bravo' }),
      } as any;
    });

    await dispatcher.handleIncomingEvent({
      eventKey: 'evt_2',
      provider: 'mock',
      liveSessionId: 'session_1',
      userId: 'usr_2',
      username: 'PlayerBravo',
      at: new Date().toISOString(),
      type: 'comment',
      comment: '2',
    });

    const sentBody = JSON.parse((fetchSpy.mock.calls[0][1]?.body as string) || '{}');
    expect(sentBody.command).toBe('JOIN 2');

    fetchSpy.mockRestore();
    await dispatcher.stop();
  });

  it('P0.1 Durable Queue: preserves unacked events on disk across process restart', async () => {
    const qStorage = path.resolve(process.cwd(), '.data/test_persist_q_' + Date.now() + '.json');
    const qDlq = path.resolve(process.cwd(), '.data/test_persist_dlq_' + Date.now() + '.json');

    try {
      // Dispatcher 1 gặp lỗi mạng (503 Service Unavailable)
      const fetchSpyFail = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return { ok: false, status: 503 } as any;
      });

      const d1 = new LiveEventDispatcher({
        queueStorageFile: qStorage,
        deadLetterFile: qDlq,
      });

      const res = await d1.handleIncomingEvent({
        eventKey: 'evt_durable_gift_100',
        provider: 'mock',
        liveSessionId: 'sess_dur',
        userId: 'u_donor',
        username: 'VipDonor',
        at: new Date().toISOString(),
        type: 'gift',
        gift: { giftId: 'rose', quantity: 1, isFinal: false },
      });

      expect(res.accepted).toBe(false);
      expect(res.queued).toBe(true);
      expect(d1.getStats().queueLength).toBe(1);

      // Dừng d1 và flush xuống đĩa
      await d1.stop();
      fetchSpyFail.mockRestore();

      // Dispatcher 2 khởi động lại từ đĩa (Crash/Restart recovery)
      const fetchSpySuccess = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return { ok: true, json: async () => ({ accepted: true, skillName: 'TIẾP TẾ' }) } as any;
      });

      const d2 = new LiveEventDispatcher({
        queueStorageFile: qStorage,
        deadLetterFile: qDlq,
      });

      // Event từ lần trước đã được nạp tự động vào queue
      expect(d2.getStats().queueLength).toBe(1);

      // Drain queue phát lại thành công (với cờ force = true để bỏ qua backoff timer trong test)
      const drained = await d2.drainQueue(true);
      expect(drained).toBe(1);
      expect(d2.getStats().queueLength).toBe(0);

      fetchSpySuccess.mockRestore();
      await d2.stop();
    } finally {
      if (fs.existsSync(qStorage)) fs.unlinkSync(qStorage);
      if (fs.existsSync(qDlq)) fs.unlinkSync(qDlq);
    }
  });

  it('P0.1 Streak Resilience: handles streak 1 -> 5 -> 10 when timeout occurs after DB commit', async () => {
    const dispatcher = new LiveEventDispatcher({
      queueStorageFile: testStorageFile,
      deadLetterFile: testDlqFile,
    });

    let callCount = 0;
    // Giả lập:
    // Lần 1 (gift qty 1): Server trả 200 OK
    // Lần 2 (gift qty 5): Server ghi DB thành công nhưng kết nối bị drop/timeout!
    // Lần 3 (retry qty 5): Server trả Idempotent Duplicate ACK (DUPLICATE_EVENT)
    // Lần 4 (gift qty 10): Server trả 200 OK
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      callCount++;
      const body = JSON.parse((init?.body as string) || '{}');

      if (body.quantity === 1) {
        return { ok: true, json: async () => ({ accepted: true, deltaQuantity: 1 }) } as any;
      }

      if (body.quantity === 5) {
        if (callCount === 2) {
          // Timeout sau khi DB đã commit
          throw new Error('Connection timeout');
        } else {
          // Retry với cùng providerEventId -> Server báo duplicate hợp lệ
          return {
            ok: true,
            json: async () => ({
              accepted: false,
              idempotentDuplicate: true,
              reason: 'DUPLICATE_EVENT',
              skillName: 'ALREADY_PROCESSED',
            }),
          } as any;
        }
      }

      if (body.quantity === 10) {
        return { ok: true, json: async () => ({ accepted: true, deltaQuantity: 5 }) } as any;
      }

      return { ok: true, json: async () => ({ accepted: true }) } as any;
    });

    // 1. Combo 1
    const res1 = await dispatcher.handleIncomingEvent({
      eventKey: 'gift_stk_evt_1',
      provider: 'mock',
      liveSessionId: 'sess_stk',
      userId: 'u_streak_gamer',
      username: 'Gamer',
      at: new Date().toISOString(),
      type: 'gift',
      gift: { giftId: 'missile', quantity: 1, streakGroupId: 'stk_grp_1', isFinal: false },
    });
    expect(res1.accepted).toBe(true);

    // 2. Combo 5 (Lần đầu timeout)
    const res2 = await dispatcher.handleIncomingEvent({
      eventKey: 'gift_stk_evt_2',
      provider: 'mock',
      liveSessionId: 'sess_stk',
      userId: 'u_streak_gamer',
      username: 'Gamer',
      at: new Date().toISOString(),
      type: 'gift',
      gift: { giftId: 'missile', quantity: 5, streakGroupId: 'stk_grp_1', isFinal: false },
    });
    expect(res2.accepted).toBe(false);
    expect(res2.queued).toBe(true);

    // 3. Retry combo 5 qua drainQueue -> Nhận duplicate ACK -> Acknowledge streak thành công
    const drained = await dispatcher.drainQueue(true);
    expect(drained).toBe(1);

    // 4. Combo 10 -> Delta được tính đúng = 5 (10 - 5)
    const res3 = await dispatcher.handleIncomingEvent({
      eventKey: 'gift_stk_evt_3',
      provider: 'mock',
      liveSessionId: 'sess_stk',
      userId: 'u_streak_gamer',
      username: 'Gamer',
      at: new Date().toISOString(),
      type: 'gift',
      gift: { giftId: 'missile', quantity: 10, streakGroupId: 'stk_grp_1', isFinal: true },
    });
    expect(res3.accepted).toBe(true);

    fetchSpy.mockRestore();
    await dispatcher.stop();
  });

  it('enforces maxQueueSize backpressure and dead-letter queue limits', async () => {
    const queue = new DurableEventQueue({
      storageFile: testStorageFile,
      deadLetterFile: testDlqFile,
      maxQueueSize: 2,
      maxRetries: 2,
    });

    expect(queue.enqueue({ id: 'item_1', eventType: 'COMMENT', payload: {} })).toBe(true);
    expect(queue.enqueue({ id: 'item_2', eventType: 'COMMENT', payload: {} })).toBe(true);
    // Vượt quá maxQueueSize (2) -> Backpressure từ chối
    expect(queue.enqueue({ id: 'item_3', eventType: 'COMMENT', payload: {} })).toBe(false);

    // DLQ test: Thử thất bại quá 2 lần
    queue.markInFlight('item_1');
    queue.markFailed('item_1', 'Network timeout 1');
    queue.markInFlight('item_1');
    queue.markFailed('item_1', 'Network timeout 2');

    expect(queue.getDeadLetterCount()).toBe(1);
    expect(queue.getQueueLength()).toBe(1); // item_2 còn lại
  });
});
