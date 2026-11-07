import { describe, it, expect } from 'vitest';
import { SocketSnapshotSource } from './SocketSnapshotSource.js';

describe('SocketSnapshotSource Reconnection Contract', () => {
  it('manages socket connection and subscription lifecycle', () => {
    const source = new SocketSnapshotSource('http://localhost:3001');
    expect(source.mode).toBe('socket');
    expect(source.isConnected()).toBe(false);

    let received = 0;
    const unsub = source.subscribe(() => {
      received++;
    });

    expect(received).toBe(0);
    source.disconnect();
    expect(source.isConnected()).toBe(false);
    unsub();
  });
});
