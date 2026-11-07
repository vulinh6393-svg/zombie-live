import { describe, it, expect } from 'vitest';
import { GAME_CONFIG } from './config.js';

describe('Game Client Configuration', () => {
  it('has 1080x1920 logical canvas size for 9:16 layout', () => {
    expect(GAME_CONFIG.width).toBe(1080);
    expect(GAME_CONFIG.height).toBe(1920);
    expect(GAME_CONFIG.scaleMode).toBe('FIT');
  });

  it('runs with mockMode enabled by default', () => {
    expect(GAME_CONFIG.mockMode).toBe(true);
  });
});
