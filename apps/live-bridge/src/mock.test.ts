import { describe, it, expect } from 'vitest';
import { MockLiveAdapter } from './mock.js';
import { NormalizedLiveEvent } from '@zombie-live/shared';

describe('MockLiveAdapter', () => {
  it('connects and receives normalized mock events', async () => {
    const adapter = new MockLiveAdapter();
    await adapter.connect();
    expect(adapter.isConnected()).toBe(true);

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
  });
});
