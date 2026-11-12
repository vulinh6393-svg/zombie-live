import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminClient } from './index.js';

describe('AdminClient (OBS Live Operations Admin SDK)', () => {
  const secretKey = 'test_ultra_secret_admin_token_2026';
  let client: AdminClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new AdminClient('http://localhost:3001', secretKey);
  });

  it('includes x-admin-token in request headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        server: { uptimeSeconds: 120, memoryUsageMb: 85, nodeVersion: 'v24.12.0', environment: 'development' },
        engine: { matchId: 'match_100', tick: 500, phase: 'WAVE_2', isPaused: false },
        operations: { dbConnected: true, outboxPendingCount: 0, outboxLag: 0, latestJournalSeq: 5, latestCheckpointTick: 500, simulationHz: 20 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const monitoring = await client.getMonitoring();
    expect(monitoring.engine.matchId).toBe('match_100');
    expect(monitoring.engine.isPaused).toBe(false);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/admin/monitoring',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-admin-token': secretKey,
        }),
      })
    );
  });

  it('handles pause and resume simulation requests', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, phase: 'PAUSED', tick: 120, isPaused: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, phase: 'WAVE_1', tick: 120, isPaused: false }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const pauseRes = await client.pauseSimulation();
    expect(pauseRes.success).toBe(true);
    expect(pauseRes.isPaused).toBe(true);

    const resumeRes = await client.resumeSimulation();
    expect(resumeRes.success).toBe(true);
    expect(resumeRes.isPaused).toBe(false);
  });

  it('handles emergency reset requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, matchId: 'match_reset_1', phase: 'PREPARING', tick: 0, baseHp: 10000 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const resetRes = await client.emergencyReset();
    expect(resetRes.success).toBe(true);
    expect(resetRes.phase).toBe('PREPARING');
  });

  it('controls blast gate state', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, gateState: 'OPEN' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const gateRes = await client.controlGate('OPEN');
    expect(gateRes.success).toBe(true);
    expect(gateRes.gateState).toBe('OPEN');
  });

  it('throws descriptive error on 401 Unauthorized', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => JSON.stringify({ error: 'UNAUTHORIZED_ADMIN_TOKEN' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(client.getMonitoring()).rejects.toThrow('Admin API error (401 Unauthorized)');
  });
});
