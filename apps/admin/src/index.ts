export interface AdminMonitoringResponse {
  server: {
    uptimeSeconds: number;
    memoryUsageMb: number;
    nodeVersion: string;
    environment: string;
  };
  engine: {
    matchId: string;
    tick: number;
    phase: string;
    result: string;
    isPaused: boolean;
    baseHp: number;
    maxBaseHp: number;
    waveNumber: number;
    gateState: string;
    entities: {
      zombies: number;
      soldiers: number;
      players: number;
      mechActive: boolean;
      airstrikesActive: number;
    };
    activeBuffs: {
      shield: boolean;
      overclock: boolean;
    };
  };
  operations: {
    dbConnected: boolean;
    outboxPendingCount: number;
    outboxLag: number;
    latestJournalSeq: number;
    latestCheckpointTick: number;
    simulationHz: number;
  };
}

export interface AdminMatchActionResponse {
  success: boolean;
  matchId?: string;
  phase?: string;
  tick?: number;
  isPaused?: boolean;
  baseHp?: number;
}

export interface AdminGateActionResponse {
  success: boolean;
  gateState: string;
}

export class AdminClient {
  private baseUrl: string;
  private adminToken: string;

  constructor(
    baseUrlOrOpts: string | { serverUrl?: string; baseUrl?: string; adminToken?: string } = 'http://localhost:3001',
    adminToken: string = ''
  ) {
    if (typeof baseUrlOrOpts === 'object') {
      this.baseUrl = (baseUrlOrOpts.serverUrl || baseUrlOrOpts.baseUrl || 'http://localhost:3001').replace(/\/$/, '');
      this.adminToken = baseUrlOrOpts.adminToken || '';
    } else {
      this.baseUrl = baseUrlOrOpts.replace(/\/$/, '');
      this.adminToken = adminToken;
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'x-admin-token': this.adminToken,
      ...((options.headers as Record<string, string>) || {}),
    };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Admin API error (${res.status} ${res.statusText}): ${errText}`);
    }
    return res.json() as Promise<T>;
  }

  public async getMonitoring(): Promise<AdminMonitoringResponse> {
    return this.request<AdminMonitoringResponse>('/api/admin/monitoring', {
      method: 'GET',
    });
  }

  public async startMatch(params?: { matchId?: string; seed?: number }): Promise<AdminMatchActionResponse> {
    return this.request<AdminMatchActionResponse>('/api/admin/match/start', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  public async pauseSimulation(reason?: string): Promise<AdminMatchActionResponse> {
    return this.request<AdminMatchActionResponse>('/api/admin/match/pause', {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Admin pause' }),
    });
  }

  public async resumeSimulation(): Promise<AdminMatchActionResponse> {
    return this.request<AdminMatchActionResponse>('/api/admin/match/resume', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  public async emergencyReset(reason?: string): Promise<AdminMatchActionResponse> {
    return this.request<AdminMatchActionResponse>('/api/admin/match/emergency-reset', {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Admin emergency reset' }),
    });
  }

  public async controlGate(action: 'OPEN' | 'CLOSE'): Promise<AdminGateActionResponse> {
    return this.request<AdminGateActionResponse>('/api/admin/gate', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  public async queryDb(sql: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    return this.request<{ rows: any[]; rowCount: number }>('/api/admin/query', {
      method: 'POST',
      body: JSON.stringify({ sql, params }),
    });
  }
}
