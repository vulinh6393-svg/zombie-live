import { describe, it, expect } from 'vitest';
import { getDatabaseStatus, DATABASE_VERSION } from './index.js';

describe('Database Module Status', () => {
  it('returns valid database configuration metadata', () => {
    const status = getDatabaseStatus();
    expect(status.provider).toBe('postgresql');
    expect(DATABASE_VERSION).toBe('1.0.0');
  });
});
