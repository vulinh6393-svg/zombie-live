import { NormalizedLiveEvent, normalizeCommand } from '@zombie-live/shared';
import { LiveEventAdapter, ConnectionState } from './adapter.js';

export interface MockViewerProfile {
  userId: string;
  userName: string;
  avatarUrl?: string;
  squad?: 'alpha' | 'bravo' | 'charlie';
}

export interface MockSimulationOptions {
  viewerCount?: number;
  durationSeconds?: number;
  eventsPerSecond?: number;
  burstMode?: boolean;
}

export class MockLiveAdapter implements LiveEventAdapter {
  readonly provider = 'mock' as const;
  private state: ConnectionState = 'DISCONNECTED';
  private handlers: Array<(event: NormalizedLiveEvent) => void> = [];
  private stateChangeHandlers: Array<(state: ConnectionState, detail?: string) => void> = [];
  
  private simulationInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Danh sách 100 người xem ảo với định danh duy nhất ổn định (stable identity)
  private viewers: MockViewerProfile[] = [];

  constructor() {
    this.init100Viewers(100);
  }

  private init100Viewers(count: number = 100): void {
    this.viewers = [];
    const squads: Array<'alpha' | 'bravo' | 'charlie'> = ['alpha', 'bravo', 'charlie'];
    for (let i = 1; i <= count; i++) {
      const padId = i.toString().padStart(3, '0');
      this.viewers.push({
        userId: `mock_viewer_${padId}`,
        userName: `ChiếnBinh_${padId}`,
        squad: squads[i % 3],
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=viewer_${padId}`,
      });
    }
  }

  public getViewers(): MockViewerProfile[] {
    return [...this.viewers];
  }

  public getConnectionState(): ConnectionState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === 'CONNECTED';
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
    if (this.state === 'CONNECTED') return;
    this.setState('CONNECTING', 'Bắt đầu kết nối Mock Live Adapter');

    // Mô phỏng độ trễ handshake
    await new Promise((res) => setTimeout(res, 50));
    this.reconnectAttempts = 0;
    this.setState('CONNECTED', 'Đã kết nối thành công tới luồng LIVE mô phỏng');
  }

  async disconnect(): Promise<void> {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.setState('DISCONNECTED', 'Đã ngắt kết nối chủ động');
  }

  /**
   * Mô phỏng mất kết nối mạng và tự động reconnect với Exponential Backoff + Full Jitter
   */
  public simulateNetworkDrop(): void {
    if (this.state !== 'CONNECTED') return;
    this.setState('RECONNECTING', 'Mạng gián đoạn! Bắt đầu chu trình tự kết nối lại...');

    this.scheduleReconnectWithBackoff();
  }

  private scheduleReconnectWithBackoff(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState('ERROR', `Vượt quá số lần thử kết nối lại tối đa (${this.maxReconnectAttempts})`);
      return;
    }

    this.reconnectAttempts++;
    // Exponential backoff: base 100ms * 2^attempts + jitter
    const baseDelay = Math.min(2000, 100 * Math.pow(2, this.reconnectAttempts));
    const jitter = Math.floor(Math.random() * (baseDelay * 0.5));
    const delay = baseDelay + jitter;

    this.setState('BACKOFF', `Đang chờ ${delay}ms trước khi thử kết nối lại lần ${this.reconnectAttempts}...`);

    this.reconnectTimeout = setTimeout(async () => {
      this.setState('CONNECTING', `Đang thử kết nối lại lần ${this.reconnectAttempts}...`);
      await new Promise((r) => setTimeout(r, 50));
      this.reconnectAttempts = 0;
      this.setState('CONNECTED', 'Kết nối lại thành công sau sự cố!');
    }, delay);
  }

  onEvent(handler: (event: NormalizedLiveEvent) => void): void {
    this.handlers.push(handler);
  }

  public emitMockEvent(raw: Omit<NormalizedLiveEvent, 'provider'>): void {
    if (this.state !== 'CONNECTED') return;

    const event: NormalizedLiveEvent = {
      ...raw,
      provider: 'mock',
      comment: raw.comment ? normalizeCommand(raw.comment) : undefined,
    };
    for (const h of this.handlers) {
      try {
        h(event);
      } catch {}
    }
  }

  /**
   * Phát đồng thời sự kiện từ 100 viewers ảo riêng biệt
   * Kiểm tra khả năng xử lý đồng thời 100 người dùng có danh tính ổn định
   */
  public emit100ViewersBurst(): void {
    if (this.state !== 'CONNECTED') return;
    const now = Date.now();

    for (let i = 0; i < this.viewers.length; i++) {
      const v = this.viewers[i];
      const evId = `mock_evt_burst_${now}_${v.userId}`;

      // 1. Tham gia trận đấu (JOIN 1/2/3)
      if (i < 30) {
        const lane = v.squad === 'alpha' ? '1' : v.squad === 'charlie' ? '3' : '2';
        this.emitMockEvent({
          eventKey: evId,
          liveSessionId: 'live_session_100_mock',
          type: 'comment',
          comment: `JOIN ${lane}`,
          userId: v.userId,
          username: v.userName,
          at: new Date(now + i).toISOString(),
        });
      } 
      // 2. Bắn hỏa lực (BAN)
      else if (i < 60) {
        this.emitMockEvent({
          eventKey: evId,
          liveSessionId: 'live_session_100_mock',
          type: 'comment',
          comment: 'BAN',
          userId: v.userId,
          username: v.userName,
          at: new Date(now + i).toISOString(),
        });
      }
      // 3. Sửa thành (SUA) hoặc Cứu viện (CUU)
      else if (i < 80) {
        const cmd = i % 2 === 0 ? 'SUA' : 'CUU';
        this.emitMockEvent({
          eventKey: evId,
          liveSessionId: 'live_session_100_mock',
          type: 'comment',
          comment: cmd,
          userId: v.userId,
          username: v.userName,
          at: new Date(now + i).toISOString(),
        });
      }
      // 4. Tặng quà kỹ năng (GIFT với streak combo)
      else {
        const giftList = ['rose', 'gift_shield', 'gift_overclock', 'gift_missile'];
        const giftId = giftList[i % giftList.length];
        const streakCount = 1 + (i % 5);
        this.emitMockEvent({
          eventKey: evId,
          liveSessionId: 'live_session_100_mock',
          type: 'gift',
          gift: {
            giftId,
            quantity: streakCount,
            streakGroupId: `streak_${v.userId}_${giftId}`,
            isFinal: true,
          },
          userId: v.userId,
          username: v.userName,
          at: new Date(now + i).toISOString(),
        });
      }
    }
  }

  /**
   * Khởi động bộ giả lập luồng sự kiện liên tục theo cấu hình
   */
  public startContinuousSimulation(opts: MockSimulationOptions = {}): void {
    const eventsPerSec = opts.eventsPerSecond || 20;
    const intervalMs = Math.max(10, Math.floor(1000 / eventsPerSec));

    if (this.simulationInterval) clearInterval(this.simulationInterval);

    let tickCounter = 0;
    this.simulationInterval = setInterval(() => {
      if (this.state !== 'CONNECTED') return;

      tickCounter++;
      const randomViewer = this.viewers[Math.floor(Math.random() * this.viewers.length)];
      const now = Date.now();
      const evId = `mock_stream_${now}_${tickCounter}_${randomViewer.userId}`;

      // Phân bổ tỷ lệ hành động tự nhiên: 50% BAN, 20% SUA/CUU, 15% JOIN, 15% GIFT
      const roll = Math.random();
      if (roll < 0.5) {
        this.emitMockEvent({
          eventKey: evId,
          liveSessionId: 'live_session_stream_mock',
          type: 'comment',
          comment: 'BAN',
          userId: randomViewer.userId,
          username: randomViewer.userName,
          at: new Date(now).toISOString(),
        });
      } else if (roll < 0.7) {
        this.emitMockEvent({
          eventKey: evId,
          liveSessionId: 'live_session_stream_mock',
          type: 'comment',
          comment: roll < 0.6 ? 'SUA' : 'CUU',
          userId: randomViewer.userId,
          username: randomViewer.userName,
          at: new Date(now).toISOString(),
        });
      } else if (roll < 0.85) {
        const lane = ['1', '2', '3'][Math.floor(Math.random() * 3)];
        this.emitMockEvent({
          eventKey: evId,
          liveSessionId: 'live_session_stream_mock',
          type: 'comment',
          comment: `JOIN ${lane}`,
          userId: randomViewer.userId,
          username: randomViewer.userName,
          at: new Date(now).toISOString(),
        });
      } else {
        const gifts = ['rose', 'gift_shield', 'gift_overclock', 'gift_missile', 'gift_mech'];
        const giftId = gifts[Math.floor(Math.random() * gifts.length)];
        this.emitMockEvent({
          eventKey: evId,
          liveSessionId: 'live_session_stream_mock',
          type: 'gift',
          gift: {
            giftId,
            quantity: 1,
            isFinal: true,
          },
          userId: randomViewer.userId,
          username: randomViewer.userName,
          at: new Date(now).toISOString(),
        });
      }
    }, intervalMs);
  }
}
