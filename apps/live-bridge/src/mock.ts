import { NormalizedLiveEvent, normalizeCommand } from '@zombie-live/shared';
import { LiveEventAdapter } from './adapter.js';

export class MockLiveAdapter implements LiveEventAdapter {
  readonly provider = 'mock' as const;
  private connected = false;
  private handlers: Array<(event: NormalizedLiveEvent) => void> = [];

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handlers = [];
  }

  isConnected(): boolean {
    return this.connected;
  }

  onEvent(handler: (event: NormalizedLiveEvent) => void): void {
    this.handlers.push(handler);
  }

  emitMockEvent(raw: Omit<NormalizedLiveEvent, 'provider'>): void {
    const event: NormalizedLiveEvent = {
      ...raw,
      provider: 'mock',
      comment: raw.comment ? normalizeCommand(raw.comment) : undefined,
    };
    for (const h of this.handlers) {
      h(event);
    }
  }
}
