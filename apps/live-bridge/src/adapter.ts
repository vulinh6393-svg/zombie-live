import { NormalizedLiveEvent } from '@zombie-live/shared';

export type ConnectionState = 
  | 'DISCONNECTED' 
  | 'CONNECTING' 
  | 'CONNECTED' 
  | 'RECONNECTING' 
  | 'BACKOFF' 
  | 'ERROR';

export interface LiveEventAdapter {
  readonly provider: 'mock' | 'tiktok' | 'replay';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionState(): ConnectionState;
  onStateChange?(handler: (state: ConnectionState, detail?: string) => void): void;
  onEvent(handler: (event: NormalizedLiveEvent) => void): void;
}
