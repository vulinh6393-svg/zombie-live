import { describe, it, expect } from 'vitest';
import { getAdminStatus } from './index.js';

describe('Admin Module Scaffold', () => {
  it('returns valid scaffold metadata', () => {
    const status = getAdminStatus();
    expect(status.module).toBe('admin');
    expect(status.scheduledPhase).toBe(7);
  });
});
