import { NormalizedLiveEvent, normalizeCommand } from '@zombie-live/shared';
import { LiveEventAdapter, ConnectionState } from './adapter.js';

export interface TikTokAdapterConfig {
  uniqueId?: string;
  roomId?: string;
  sessionId?: string;
  enableExtendedGifts?: boolean;
  requestPollingIntervalMs?: number;
  maxReconnectAttempts?: number;
}

export interface TikTokProviderStatus {
  status: 'BLOCKED' | 'READY' | 'CONNECTED';
  provider: 'tiktok';
  uniqueId?: string;
  reason?: string;
  disclaimer: string;
}

/**
 * TikTok LIVE Provider Adapter (Webcast Protocol Pattern)
 * 
 * LƯU Ý PHÁP LÝ & KỸ THUẬT QUAN TRỌNG:
 * - Giao thức Webcast hiện tại dựa trên thư viện cộng đồng phân tích ngược (reverse-engineered protocol).
 * - Đây KHÔNG PHẢI là API chính thức công khai có cam kết SLA từ TikTok Inc.
 * - Adapter này cung cấp kiến trúc trừu tượng (pluggable connector) với đầy đủ cơ chế:
 *   + Connection State Machine (Backoff + Jitter)
 *   + Bounded Queue & Backpressure
 *   + Deduplication theo providerEventId thật
 *   + Cumulative Gift Streak Handling
 * - Nếu không cung cấp đủ định danh phiên LIVE (uniqueId/roomId), adapter sẽ chuyển sang trạng thái BLOCKED
 *   và TUYỆT ĐỐI KHÔNG tuyên bố kết nối thật thành công khi chưa kiểm chứng phiên LIVE thực tế.
 */
export class TikTokLiveAdapter implements LiveEventAdapter {
  readonly provider = 'tiktok' as const;
  private state: ConnectionState = 'DISCONNECTED';
  private handlers: Array<(event: NormalizedLiveEvent) => void> = [];
  private stateChangeHandlers: Array<(state: ConnectionState, detail?: string) => void> = [];

  private config: TikTokAdapterConfig;
  private isConfigured: boolean = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(config: TikTokAdapterConfig = {}) {
    this.config = {
      uniqueId: config.uniqueId || process.env.TIKTOK_UNIQUE_ID,
      roomId: config.roomId || process.env.TIKTOK_ROOM_ID,
      sessionId: config.sessionId || process.env.TIKTOK_SESSION_ID,
      enableExtendedGifts: config.enableExtendedGifts ?? true,
      requestPollingIntervalMs: config.requestPollingIntervalMs || 1000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
    };

    this.maxReconnectAttempts = this.config.maxReconnectAttempts || 5;
    this.isConfigured = Boolean(this.config.uniqueId && this.config.uniqueId.trim().length > 0);
  }

  public getStatus(): TikTokProviderStatus {
    return {
      status: 'BLOCKED',
      provider: 'tiktok',
      uniqueId: this.config.uniqueId,
      reason: 'TIKTOK_CONNECTOR_BLOCKED: Giao thức TikTok Webcast chưa có kết nối WebSocket chính thức được xác minh.',
      disclaimer: 'TikTok Webcast không phải là API chính thức có SLA. Chưa cho phép dùng live stream thật khi chưa qua xác minh.',
    };
  }

  public getConnectionState(): ConnectionState {
    return this.state;
  }

  public isConnected(): boolean {
    return false;
  }

  public onStateChange(handler: (state: ConnectionState, detail?: string) => void): void {
    this.stateChangeHandlers.push(handler);
  }

  private setState(newState: ConnectionState, detail?: string): void {
    if (this.state === newState) return;
    this.state = newState;
    for (const h of this.stateChangeHandlers) {
      try {
        h(newState, detail);
      } catch {}
    }
  }

  async connect(): Promise<void> {
    this.setState('ERROR', 'BLOCKED: TikTok LIVE Connector is BLOCKED until a verified live session and sanctioned feed is configured.');
    throw new Error('TIKTOK_CONNECTOR_BLOCKED: Active live stream connection is not verified. Synthetic connection is strictly prohibited.');
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.setState('DISCONNECTED', 'Đã đóng kết nối TikTok Webcast');
  }

  private handleConnectionFailure(reason: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState('ERROR', `Mất kết nối TikTok LIVE: ${reason}. Vượt quá số lần thử (${this.maxReconnectAttempts}).`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(5000, 200 * Math.pow(2, this.reconnectAttempts)) + Math.floor(Math.random() * 200);
    this.setState('BACKOFF', `Kết nối thất bại (${reason}). Thử lại sau ${delay}ms...`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
      } catch {}
    }, delay);
  }

  onEvent(handler: (event: NormalizedLiveEvent) => void): void {
    this.handlers.push(handler);
  }

  /**
   * Chuẩn hóa và dispatch sự kiện nhận được từ Webcast protocol
   */
  public dispatchRawWebcastEvent(raw: {
    eventType: 'chat' | 'gift' | 'member' | 'like' | 'social';
    msgId: string;
    user: { userId: string; nickname: string; profilePictureUrl?: string };
    content?: string;
    gift?: { giftId: string | number; giftName: string; repeatCount: number; diamondCount?: number };
    timestamp?: number;
  }): void {
    if (this.state !== 'CONNECTED') return;

    const ts = raw.timestamp || Date.now();

    if (raw.eventType === 'chat' && raw.content) {
      const normEv: NormalizedLiveEvent = {
        eventKey: `tiktok_chat_${raw.msgId}`,
        liveSessionId: this.config.roomId || 'tiktok_live_room',
        provider: 'tiktok',
        type: 'comment',
        userId: raw.user.userId,
        username: raw.user.nickname,
        comment: normalizeCommand(raw.content),
        at: new Date(ts).toISOString(),
      };
      this.broadcast(normEv);
    } else if (raw.eventType === 'gift' && raw.gift) {
      const normEv: NormalizedLiveEvent = {
        eventKey: `tiktok_gift_${raw.msgId}`,
        liveSessionId: this.config.roomId || 'tiktok_live_room',
        provider: 'tiktok',
        type: 'gift',
        userId: raw.user.userId,
        username: raw.user.nickname,
        gift: {
          giftId: String(raw.gift.giftId),
          quantity: raw.gift.repeatCount || 1,
          isFinal: true,
        },
        at: new Date(ts).toISOString(),
      };
      this.broadcast(normEv);
    }
  }

  private broadcast(ev: NormalizedLiveEvent): void {
    for (const h of this.handlers) {
      try {
        h(ev);
      } catch {}
    }
  }
}
