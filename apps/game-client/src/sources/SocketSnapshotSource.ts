import { io, Socket } from 'socket.io-client';
import { GameSnapshotSource, SnapshotListener } from './GameSnapshotSource.js';
import { ExtendedMatchSnapshot } from '../types.js';

export class SocketSnapshotSource implements GameSnapshotSource {
  readonly mode = 'socket' as const;
  private socket: Socket | null = null;
  private listeners: Set<SnapshotListener> = new Set();
  private connected = false;
  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  connect(): void {
    if (this.socket) return;
    this.socket = io(`${this.serverUrl}/game`, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('[SocketSnapshotSource] Connected to game server');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('[SocketSnapshotSource] Disconnected from game server');
    });

    this.socket.on('match:snapshot', (snapshot: ExtendedMatchSnapshot) => {
      for (const listener of this.listeners) {
        listener(snapshot);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
