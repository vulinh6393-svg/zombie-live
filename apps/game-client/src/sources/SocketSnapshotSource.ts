import { io, Socket } from 'socket.io-client';
import { GameSnapshotSource, SnapshotListener } from './GameSnapshotSource.js';
import { MatchSnapshot } from '@zombie-live/shared';

export class SocketSnapshotSource implements GameSnapshotSource {
  readonly mode = 'socket' as const;
  private socket: Socket | null = null;
  private listeners: Set<SnapshotListener> = new Set();
  private connected = false;
  private serverUrl: string;
  private lastSequenceId: number = -1;
  private lastMatchId: string = '';

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  connect(): void {
    if (this.socket) return;
    this.socket = io(`${this.serverUrl}/game`, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      // Khi vừa kết nối hoặc reconnect, reset sequence window và yêu cầu full snapshot mới nhất
      this.lastSequenceId = -1;
      console.log('[SocketSnapshotSource] Đã kết nối thành công tới Game Server:', this.serverUrl);
      this.socket?.emit('match:getSnapshot');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('[SocketSnapshotSource] Mất kết nối tới Game Server, đang kích hoạt auto-reconnect...');
    });

    this.socket.on('match:snapshot', (snapshot: MatchSnapshot) => {
      // Khi phát hiện chuyển trận (matchId thay đổi), tự động reset sequence window
      if (snapshot.matchId && snapshot.matchId !== this.lastMatchId) {
        this.lastMatchId = snapshot.matchId;
        this.lastSequenceId = -1;
      }

      // Bảo vệ chống gói tin đến trễ hoặc đảo thứ tự mạng (Out-of-order & Stale Packets)
      if (snapshot.sequenceId !== undefined && snapshot.sequenceId <= this.lastSequenceId) {
        // Bỏ qua snapshot cũ hơn snapshot hiện tại trong cùng một trận
        return;
      }
      this.lastSequenceId = snapshot.sequenceId ?? this.lastSequenceId + 1;

      for (const listener of this.listeners) {
        listener(snapshot as any);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.lastSequenceId = -1;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- ACTIONS (GỬI LỆNH LÊN SERVER AUTHORITATIVE) ---
  public openGate(): void {
    this.socket?.emit('admin:openGate');
  }

  public closeGate(): void {
    this.socket?.emit('admin:closeGate');
  }

  public triggerGift(name: string = 'TÊN LỬA TỔNG LỰC', sender: string = 'VIP_Gamer99'): void {
    this.socket?.emit('admin:giftSkill', { name, sender });
  }

  public damageWall(side: 'LEFT' | 'RIGHT', amount: number = 500): void {
    this.socket?.emit('admin:damageWall', { side, amount });
  }

  public getLastSequenceId(): number {
    return this.lastSequenceId;
  }
}
