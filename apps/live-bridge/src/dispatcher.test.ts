import { describe, it, expect, vi } from 'vitest';
import { LiveEventDispatcher } from './dispatcher.js';
import { MockLiveAdapter } from './mock.js';

describe('LiveEventDispatcher & Live Bridge', () => {
  it('normalizes Vietnamese comment diacritics and routes commands', async () => {
    const dispatcher = new LiveEventDispatcher({ serverUrl: 'http://localhost:3001' });
    const mockAdapter = new MockLiveAdapter();
    dispatcher.bindAdapter(mockAdapter);

    // Mock global fetch to verify normalization and payload format
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const body = JSON.parse((init?.body as string) || '{}');
      return {
        ok: true,
        json: async () => ({ accepted: true, squad: 'alpha' }),
      } as any;
    });

    const res = await dispatcher.handleIncomingEvent({
      eventKey: 'evt_1',
      provider: 'mock',
      liveSessionId: 'session_1',
      userId: 'usr_viet_1',
      username: 'TuấnAnhGamer',
      at: new Date().toISOString(),
      type: 'comment',
      comment: 'BẮN',
    });

    expect(res.accepted).toBe(true);
    expect(fetchSpy).toHaveBeenCalled();
    const sentBody = JSON.parse((fetchSpy.mock.calls[0][1]?.body as string) || '{}');
    expect(sentBody.command).toBe('BAN'); // Normalized!

    fetchSpy.mockRestore();
  });

  it('correctly maps shortcut comment "2" to "JOIN 2" for Bravo Squad', async () => {
    const dispatcher = new LiveEventDispatcher();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        json: async () => ({ accepted: true, squad: 'bravo' }),
      } as any;
    });

    await dispatcher.handleIncomingEvent({
      eventKey: 'evt_2',
      provider: 'mock',
      liveSessionId: 'session_1',
      userId: 'usr_2',
      username: 'PlayerBravo',
      at: new Date().toISOString(),
      type: 'comment',
      comment: '2',
    });

    const sentBody = JSON.parse((fetchSpy.mock.calls[0][1]?.body as string) || '{}');
    expect(sentBody.command).toBe('JOIN 2');

    fetchSpy.mockRestore();
  });
});
