import { NormalizedLiveEvent, normalizeCommand } from '@zombie-live/shared';
import { LiveEventAdapter } from './adapter.js';
import { GiftStreakTracker } from './streak.js';

export interface DispatcherOptions {
  serverUrl?: string;
  ingressToken?: string;
  adminSecret?: string; // Legacy fallback in test mode only
  maxQueueSize?: number;
  streakTimeoutSeconds?: number;
}

export interface DispatcherStats {
  receivedCount: number;
  dispatchedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  errorCount: number;
  eventsPerSecond: number;
  p95LatencyMs: number;
  duplicateStreakCount: number;
}

export class LiveEventDispatcher {
  private serverUrl: string;
  private ingressToken: string;
  private adapter: LiveEventAdapter | null = null;
  private isRunning: boolean = false;
  private streakTracker: GiftStreakTracker;

  private stats: DispatcherStats = {
    receivedCount: 0,
    dispatchedCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    errorCount: 0,
    eventsPerSecond: 0,
    p95LatencyMs: 0,
    duplicateStreakCount: 0,
  };

  private latencies: number[] = [];
  private eventTimes: number[] = [];

  constructor(opts: DispatcherOptions = {}) {
    this.serverUrl = opts.serverUrl || process.env.GAME_SERVER_URL || 'http://localhost:3001';
    const isProd = process.env.NODE_ENV === 'production';
    
    // P0.1: Tách biệt quyền Live Bridge Ingress Token khỏi Admin Secret
    const token = opts.ingressToken || process.env.LIVE_BRIDGE_INGRESS_TOKEN || opts.adminSecret || process.env.ADMIN_SECRET_KEY;
    if (isProd && (!token || token.trim().length < 16)) {
      throw new Error('FATAL_SECURITY_ERROR: LIVE_BRIDGE_INGRESS_TOKEN must be configured with at least 16 characters in production mode.');
    }
    this.ingressToken = token || 'live_bridge_ingress_secret_2026';
    this.streakTracker = new GiftStreakTracker(opts.streakTimeoutSeconds || 300);
  }

  public bindAdapter(adapter: LiveEventAdapter): void {
    this.adapter = adapter;
    this.adapter.onEvent((event) => this.handleIncomingEvent(event));
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    if (this.adapter && !this.adapter.isConnected()) {
      await this.adapter.connect();
    }
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.adapter && this.adapter.isConnected()) {
      await this.adapter.disconnect();
    }
  }

  public getStats(): DispatcherStats {
    const now = Date.now();
    // Lọc các sự kiện trong 1s gần nhất để tính events/s
    this.eventTimes = this.eventTimes.filter((t) => now - t <= 1000);
    this.stats.eventsPerSecond = this.eventTimes.length;

    if (this.latencies.length > 0) {
      const sorted = [...this.latencies].sort((a, b) => a - b);
      const p95Idx = Math.floor(sorted.length * 0.95);
      this.stats.p95LatencyMs = Math.round((sorted[p95Idx] || 0) * 10) / 10;
    }

    return { ...this.stats };
  }

  public async handleIncomingEvent(event: NormalizedLiveEvent): Promise<{ accepted: boolean; reason?: string }> {
    this.stats.receivedCount++;
    const now = Date.now();
    this.eventTimes.push(now);
    const startMs = performance.now();

    try {
      let payload: any = null;

      if (event.type === 'comment' && event.comment) {
        let norm = normalizeCommand(event.comment);
        // Hỗ trợ gõ tắt '1', '2', '3' thành 'JOIN 1', 'JOIN 2', 'JOIN 3'
        if (norm === '1' || norm === 'ALPHA') norm = 'JOIN 1';
        else if (norm === '2' || norm === 'BRAVO') norm = 'JOIN 2';
        else if (norm === '3' || norm === 'CHARLIE') norm = 'JOIN 3';

        payload = {
          type: 'COMMENT',
          userId: event.userId,
          userName: event.username,
          command: norm,
          timestamp: now,
        };
      } else if (event.type === 'gift' && event.gift) {
        const giftId = event.gift.giftId;
        const giftCount = event.gift.quantity;
        const liveSessionId = event.liveSessionId || 'default_session';
        const streakId = event.gift.streakGroupId;

        // B4: Cumulative vs Incremental Gift Streak Calculation
        const streakRes = this.streakTracker.processGiftStreak(
          event.userId,
          giftId,
          liveSessionId,
          giftCount,
          streakId
        );

        if (!streakRes.valid) {
          this.stats.duplicateStreakCount++;
          return { accepted: false, reason: streakRes.reason || 'DUPLICATE_STREAK' };
        }

        const providerEvId = event.eventKey;

        payload = {
          type: 'GIFT',
          provider: event.provider,
          liveSessionId,
          providerEventId: providerEvId,
          userId: event.userId,
          userName: event.username,
          giftId,
          quantity: streakRes.currentTotal,
          deltaQuantity: streakRes.deltaQuantity,
          streakId,
          streakStatus: event.gift.isFinal ? 'FINISHED' : 'IN_PROGRESS',
          timestamp: now,
        };
      }

      if (!payload) {
        this.stats.rejectedCount++;
        return { accepted: false, reason: 'IGNORED_EVENT_TYPE' };
      }

      this.stats.dispatchedCount++;

      // Dispatch tới Authoritative Game Server sử dụng Dedicated Ingress Token (P0.1)
      const res = await fetch(`${this.serverUrl}/api/live/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-live-bridge-token': this.ingressToken,
          'Authorization': `Bearer ${this.ingressToken}`,
        },
        body: JSON.stringify(payload),
      });

      const elapsed = performance.now() - startMs;
      this.latencies.push(elapsed);
      if (this.latencies.length > 200) this.latencies.shift();

      if (!res.ok) {
        this.stats.errorCount++;
        return { accepted: false, reason: `HTTP_${res.status}` };
      }

      const data = await res.json() as any;
      if (data.accepted) {
        this.stats.acceptedCount++;
      } else {
        this.stats.rejectedCount++;
      }

      return { accepted: !!data.accepted, reason: data.reason || data.skillName };
    } catch (err) {
      this.stats.errorCount++;
      return { accepted: false, reason: (err as Error).message };
    }
  }
}
