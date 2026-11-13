import { NormalizedLiveEvent } from '@zombie-live/shared';
import { LiveEventAdapter, ConnectionState } from './adapter.js';

export class ReplayLiveAdapter implements LiveEventAdapter {
  readonly provider = 'replay' as const;
  private connected = false;
  private handlers: Array<(event: NormalizedLiveEvent) => void> = [];
  private events: NormalizedLiveEvent[] = [];
  private playbackTimeout: any = null;

  constructor(events: NormalizedLiveEvent[] = []) {
    this.events = events;
  }

  public loadEvents(events: NormalizedLiveEvent[]): void {
    this.events = events;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout);
      this.playbackTimeout = null;
    }
    this.handlers = [];
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectionState(): ConnectionState {
    return this.connected ? 'CONNECTED' : 'DISCONNECTED';
  }

  onEvent(handler: (event: NormalizedLiveEvent) => void): void {
    this.handlers.push(handler);
  }

  public playAll(intervalMs: number = 50): void {
    if (!this.connected || this.events.length === 0) return;

    let idx = 0;
    const sendNext = () => {
      if (!this.connected || idx >= this.events.length) return;
      const ev = this.events[idx++];
      for (const h of this.handlers) {
        h(ev);
      }
      this.playbackTimeout = setTimeout(sendNext, intervalMs);
    };

    sendNext();
  }
}
