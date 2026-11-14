import { NormalizedLiveEvent, normalizeCommand } from '@zombie-live/shared';
import { LiveEventAdapter } from './adapter.js';
import { GiftStreakTracker } from './streak.js';
import { DurableEventQueue, QueuedEventRecord } from './queue.js';

export interface DispatcherOptions {
  serverUrl?: string;
  ingressToken?: string;
  adminSecret?: string; // Legacy fallback in test mode only
  maxQueueSize?: number;
  streakTimeoutSeconds?: number;
  queueStorageFile?: string;
  deadLetterFile?: string;
  maxRetries?: number;
  autoProcessQueue?: boolean;
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
  queueLength: number;
  deadLetterCount: number;
}

export class LiveEventDispatcher {
  private serverUrl: string;
  private ingressToken: string;
  private adapter: LiveEventAdapter | null = null;
  private isRunning: boolean = false;
  private streakTracker: GiftStreakTracker;
  private eventQueue: DurableEventQueue;
  private queueWorkerTimer: NodeJS.Timeout | null = null;
  private isDrainingQueue: boolean = false;

  private stats: DispatcherStats = {
    receivedCount: 0,
    dispatchedCount: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    errorCount: 0,
    eventsPerSecond: 0,
    p95LatencyMs: 0,
    duplicateStreakCount: 0,
    queueLength: 0,
    deadLetterCount: 0,
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
    this.ingressToken = token || 'live_bridge_ingress_secret_2026_token';
    this.streakTracker = new GiftStreakTracker(opts.streakTimeoutSeconds || 300);

    // P0.1 (Phase 08.2): Bền vững hóa hàng đợi trên đĩa
    this.eventQueue = new DurableEventQueue({
      storageFile: opts.queueStorageFile,
      deadLetterFile: opts.deadLetterFile,
      maxQueueSize: opts.maxQueueSize || 1000,
      maxRetries: opts.maxRetries || 5,
    });
  }

  public bindAdapter(adapter: LiveEventAdapter): void {
    this.adapter = adapter;
    this.adapter.onEvent((event) => this.handleIncomingEvent(event));
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Khởi chạy queue worker định kỳ xử lý các event đang chờ (bao gồm cả event phục hồi sau restart)
    this.startQueueWorker();

    if (this.adapter && !this.adapter.isConnected()) {
      await this.adapter.connect();
    }
  }

  public async stop(): Promise<void> {
    this.isRunning = false;

    if (this.queueWorkerTimer) {
      clearInterval(this.queueWorkerTimer);
      this.queueWorkerTimer = null;
    }

    if (this.adapter && this.adapter.isConnected()) {
      await this.adapter.disconnect();
    }

    // Flush trạng thái queue hiện tại xuống đĩa để bảo toàn cho lần khởi động sau
    this.eventQueue.persistSync();
  }

  public getQueue(): DurableEventQueue {
    return this.eventQueue;
  }

  public getStreakTracker(): GiftStreakTracker {
    return this.streakTracker;
  }

  private startQueueWorker(): void {
    if (this.queueWorkerTimer) return;
    this.queueWorkerTimer = setInterval(() => {
      if (this.isRunning) {
        this.drainQueue().catch(() => {});
      }
    }, 200);
  }

  public getStats(): DispatcherStats {
    const now = Date.now();
    this.eventTimes = this.eventTimes.filter((t) => now - t <= 1000);
    this.stats.eventsPerSecond = this.eventTimes.length;

    if (this.latencies.length > 0) {
      const sorted = [...this.latencies].sort((a, b) => a - b);
      const p95Idx = Math.floor(sorted.length * 0.95);
      this.stats.p95LatencyMs = Math.round((sorted[p95Idx] || 0) * 10) / 10;
    }

    this.stats.queueLength = this.eventQueue.getQueueLength();
    this.stats.deadLetterCount = this.eventQueue.getDeadLetterCount();

    return { ...this.stats };
  }

  /**
   * Tiếp nhận sự kiện từ adapter, chuẩn hóa, ghi vào Durable Queue trước khi dispatch.
   */
  public async handleIncomingEvent(event: NormalizedLiveEvent): Promise<{ accepted: boolean; queued?: boolean; reason?: string }> {
    this.stats.receivedCount++;
    const now = Date.now();
    this.eventTimes.push(now);

    try {
      let payload: any = null;
      let eventType: 'COMMENT' | 'GIFT' = 'COMMENT';
      let streakInfo: { userId: string; giftId: string; liveSessionId: string; quantity: number; streakId?: string } | null = null;

      if (event.type === 'comment' && event.comment) {
        let norm = normalizeCommand(event.comment);
        if (norm === '1' || norm === 'ALPHA') norm = 'JOIN 1';
        else if (norm === '2' || norm === 'BRAVO') norm = 'JOIN 2';
        else if (norm === '3' || norm === 'CHARLIE') norm = 'JOIN 3';

        eventType = 'COMMENT';
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

        // P0.5: Prepare streak mà KHÔNG commit RAM sớm
        const streakRes = this.streakTracker.prepareStreak(
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

        streakInfo = {
          userId: event.userId,
          giftId,
          liveSessionId,
          quantity: giftCount,
          streakId,
        };

        eventType = 'GIFT';
        payload = {
          type: 'GIFT',
          provider: event.provider,
          liveSessionId,
          providerEventId: event.eventKey,
          userId: event.userId,
          userName: event.username,
          giftId,
          quantity: streakRes.currentTotal,
          deltaQuantity: streakRes.deltaQuantity,
          streakId,
          streakStatus: event.gift.isFinal ? 'FINISHED' : 'IN_PROGRESS',
          timestamp: now,
          // Lưu lại thông tin streak metadata trong payload để phục vụ retry nhất quán
          _streakMeta: streakInfo,
        };
      }

      if (!payload) {
        this.stats.rejectedCount++;
        return { accepted: false, reason: 'IGNORED_EVENT_TYPE' };
      }

      // 1. Ghi vào Durable Queue trước khi gửi (WAL / Persistent Queue)
      const eventId = event.eventKey;
      const enqueued = this.eventQueue.enqueue({
        id: eventId,
        eventType,
        payload,
      });

      if (!enqueued) {
        // Backpressure khi hàng đợi vượt quá maxQueueSize
        this.stats.errorCount++;
        return { accepted: false, reason: 'QUEUE_FULL_BACKPRESSURE' };
      }

      // 2. Thử dispatch ngay lập tức
      const dispatchRes = await this.dispatchSingleItem(eventId, payload);
      return dispatchRes;
    } catch (err: any) {
      this.stats.errorCount++;
      return { accepted: false, reason: err.message };
    }
  }

  /**
   * Dispatch một event cụ thể qua HTTP Ingress với retry và idempotency
   */
  public async dispatchSingleItem(id: string, payload: any): Promise<{ accepted: boolean; queued?: boolean; reason?: string }> {
    this.stats.dispatchedCount++;
    const startMs = performance.now();
    this.eventQueue.markInFlight(id);

    try {
      const res = await fetch(`${this.serverUrl}/api/live/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-live-bridge-token': this.ingressToken,
          'Authorization': `Bearer ${this.ingressToken}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      const elapsed = performance.now() - startMs;
      this.latencies.push(elapsed);
      if (this.latencies.length > 200) this.latencies.shift();

      if (!res.ok) {
        const status = res.status;
        this.eventQueue.markFailed(id, `HTTP_${status}`);
        this.stats.errorCount++;
        return { accepted: false, queued: true, reason: `HTTP_${status}` };
      }

      const data = await res.json().catch(() => ({}));
      const isAccepted = Boolean(
        data?.accepted || 
        data?.idempotentDuplicate || 
        data?.reason === 'DUPLICATE_EVENT' ||
        data?.reason === 'DUPLICATE_EVENT_ALREADY_SETTLED'
      );

      // Nếu Server đã ghi nhận thành công hoặc Idempotent duplicate:
      if (isAccepted) {
        // Acknowledge streak trong RAM
        const sMeta = payload._streakMeta;
        if (sMeta) {
          this.streakTracker.acknowledgeStreak(
            sMeta.userId,
            sMeta.giftId,
            sMeta.liveSessionId,
            sMeta.quantity,
            sMeta.streakId
          );
        }

        // Đánh dấu hoàn tất và xóa khỏi durable queue
        this.eventQueue.markAcked(id);
        this.stats.acceptedCount++;
        return { accepted: true, reason: data?.reason || data?.skillName };
      } else {
        // Nghiệp vụ server từ chối dứt điểm (ví dụ: gift không hợp lệ)
        this.eventQueue.markAcked(id);
        this.stats.rejectedCount++;
        return { accepted: false, reason: data?.reason || 'REJECTED_BY_SERVER' };
      }
    } catch (err: any) {
      // Mất mạng / timeout HTTP -> Giữ trong durable queue để retry lần sau
      this.eventQueue.markFailed(id, err.message);
      this.stats.errorCount++;
      return { accepted: false, queued: true, reason: `NETWORK_ERROR: ${err.message}` };
    }
  }

  /**
   * Background Queue Drainer: Quét các event PENDING và retry phát lại
   */
  public async drainQueue(force: boolean = false): Promise<number> {
    if (this.isDrainingQueue) return 0;
    this.isDrainingQueue = true;
    let processed = 0;

    try {
      const pendingItems = this.eventQueue.getAllPending();
      for (const item of pendingItems) {
        // Exponential backoff guard: tránh spam server khi đang lỗi (có thể bỏ qua bằng cờ force)
        const backoffDelay = Math.min(5000, 200 * Math.pow(2, item.retryCount));
        if (!force && item.lastAttemptAt && Date.now() - item.lastAttemptAt < backoffDelay) {
          continue;
        }

        const res = await this.dispatchSingleItem(item.id, item.payload);
        if (res.accepted || !res.queued) {
          processed++;
        }
      }
    } finally {
      this.isDrainingQueue = false;
    }

    return processed;
  }
}
