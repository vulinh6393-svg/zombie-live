import { describe, it, expect } from 'vitest';
import { MockLiveAdapter } from './mock.js';
import { GiftStreakTracker } from './streak.js';
import { TikTokLiveAdapter } from './tiktok.js';
import { NormalizedLiveEvent } from '@zombie-live/shared';

describe('Live Bridge & Provider Adapters (Phase 08)', () => {
  describe('1. MockLiveAdapter & 100 Concurrent Viewers', () => {
    it('connects and receives normalized mock events', async () => {
      const adapter = new MockLiveAdapter();
      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
      expect(adapter.getConnectionState()).toBe('CONNECTED');

      const received: NormalizedLiveEvent[] = [];
      adapter.onEvent((e) => received.push(e));

      adapter.emitMockEvent({
        eventKey: 'mock-1',
        liveSessionId: 'sess-1',
        userId: 'user-001',
        username: 'PlayerOne',
        at: new Date().toISOString(),
        type: 'comment',
        comment: 'bắn',
      });

      expect(received.length).toBe(1);
      expect(received[0].provider).toBe('mock');
      expect(received[0].comment).toBe('BAN');

      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.getConnectionState()).toBe('DISCONNECTED');
    });

    it('emits burst events from 100 distinct viewers with stable identities', async () => {
      const adapter = new MockLiveAdapter();
      await adapter.connect();

      const received: NormalizedLiveEvent[] = [];
      adapter.onEvent((e) => received.push(e));

      adapter.emit100ViewersBurst();

      expect(received.length).toBe(100);
      const uniqueUsers = new Set(received.map((e) => e.userId));
      expect(uniqueUsers.size).toBe(100);

      // Verify squads distribution and actions
      const joinEvents = received.filter((e) => e.comment?.startsWith('JOIN'));
      const shootEvents = received.filter((e) => e.comment === 'BAN');
      const repairOrRescueEvents = received.filter((e) => e.comment === 'SUA' || e.comment === 'CUU');
      const giftEvents = received.filter((e) => e.type === 'gift');

      expect(joinEvents.length).toBe(30);
      expect(shootEvents.length).toBe(30);
      expect(repairOrRescueEvents.length).toBe(20);
      expect(giftEvents.length).toBe(20);

      await adapter.disconnect();
    });

    it('handles connection state machine and simulated network drop with backoff', async () => {
      const adapter = new MockLiveAdapter();
      const stateHistory: string[] = [];
      adapter.onStateChange((st) => stateHistory.push(st));

      await adapter.connect();
      expect(adapter.getConnectionState()).toBe('CONNECTED');

      adapter.simulateNetworkDrop();
      expect(adapter.getConnectionState()).toBe('BACKOFF');
      expect(stateHistory).toContain('RECONNECTING');
      expect(stateHistory).toContain('BACKOFF');

      await adapter.disconnect();
      expect(adapter.getConnectionState()).toBe('DISCONNECTED');
    });
  });

  describe('2. Cumulative Gift Streak Tracker (Incremental Delta)', () => {
    it('calculates exact delta quantity for combo streaks and rejects duplicates/out-of-order', () => {
      const tracker = new GiftStreakTracker(60);

      // 1. Initial gift (streak = 1) -> delta = 1
      const res1 = tracker.processGiftStreak('user_vip', 'rose', 'sess_1', 1, 'streak_1');
      expect(res1.valid).toBe(true);
      expect(res1.deltaQuantity).toBe(1);
      expect(res1.currentTotal).toBe(1);

      // 2. Combo increases to 5 -> delta = 4 (5 - 1 = 4)
      const res2 = tracker.processGiftStreak('user_vip', 'rose', 'sess_1', 5, 'streak_1');
      expect(res2.valid).toBe(true);
      expect(res2.deltaQuantity).toBe(4);
      expect(res2.currentTotal).toBe(5);

      // 3. Duplicate packet arrives with total 5 -> Rejected! delta = 0
      const resDup = tracker.processGiftStreak('user_vip', 'rose', 'sess_1', 5, 'streak_1');
      expect(resDup.valid).toBe(false);
      expect(resDup.deltaQuantity).toBe(0);
      expect(resDup.reason).toBe('DUPLICATE_OR_OUT_OF_ORDER_STREAK');

      // 4. Out-of-order packet arrives with total 3 -> Rejected!
      const resOut = tracker.processGiftStreak('user_vip', 'rose', 'sess_1', 3, 'streak_1');
      expect(resOut.valid).toBe(false);
      expect(resOut.deltaQuantity).toBe(0);

      // 5. Final combo pulse to 10 -> delta = 5 (10 - 5 = 5)
      const res3 = tracker.processGiftStreak('user_vip', 'rose', 'sess_1', 10, 'streak_1');
      expect(res3.valid).toBe(true);
      expect(res3.deltaQuantity).toBe(5);
      expect(res3.currentTotal).toBe(10);
    });
  });

  describe('3. TikTokLiveAdapter Status & Boundary Guard', () => {
    it('reports BLOCKED when TIKTOK_UNIQUE_ID is not configured and throws on connect', async () => {
      const adapter = new TikTokLiveAdapter({ uniqueId: '' });
      const status = adapter.getStatus();

      expect(status.status).toBe('BLOCKED');
      expect(status.provider).toBe('tiktok');
      expect(status.reason).toContain('TIKTOK_UNIQUE_ID_NOT_CONFIGURED');

      await expect(adapter.connect()).rejects.toThrow('TIKTOK_LIVE_BLOCKED');
      expect(adapter.getConnectionState()).toBe('ERROR');
    });

    it('normalizes chat and gift webcast events correctly when configured', async () => {
      const adapter = new TikTokLiveAdapter({ uniqueId: 'zombie_live_vietnam' });
      const status = adapter.getStatus();
      expect(status.status).toBe('READY');

      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);

      const received: NormalizedLiveEvent[] = [];
      adapter.onEvent((e) => received.push(e));

      adapter.dispatchRawWebcastEvent({
        eventType: 'chat',
        msgId: 'msg_999',
        user: { userId: 'tt_u1', nickname: 'TikTokGamer' },
        content: 'BẮN',
      });

      expect(received.length).toBe(1);
      expect(received[0].comment).toBe('BAN');
      expect(received[0].provider).toBe('tiktok');

      await adapter.disconnect();
    });
  });
});
