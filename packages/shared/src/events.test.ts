import { describe, it, expect } from 'vitest';
import { normalizeCommand, NormalizedLiveEventSchema } from './events.js';

describe('Shared Event Utilities', () => {
  it('normalizes Vietnamese diacritic commands correctly', () => {
    expect(normalizeCommand('bắn')).toBe('BAN');
    expect(normalizeCommand(' BẮN ')).toBe('BAN');
    expect(normalizeCommand('sửa')).toBe('SUA');
    expect(normalizeCommand('cứu')).toBe('CUU');
    expect(normalizeCommand('join')).toBe('JOIN');
  });

  it('validates a correct NormalizedLiveEvent schema', () => {
    const validEvent = {
      eventKey: 'mock-evt-1',
      provider: 'mock',
      liveSessionId: 'session-01',
      userId: 'mock-user-1',
      username: 'NguyenVanA',
      at: new Date().toISOString(),
      type: 'comment',
      comment: 'BẮN',
    };

    const parsed = NormalizedLiveEventSchema.safeParse(validEvent);
    expect(parsed.success).toBe(true);
  });
});
