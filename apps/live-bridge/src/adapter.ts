import { NormalizedLiveEvent } from '@zombie-live/shared';

export interface LiveEventAdapter {
  readonly provider: 'mock' | 'tiktok' | 'replay';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  onEvent(handler: (event: NormalizedLiveEvent) => void): void;
}
