import { ExtendedMatchSnapshot } from '../types.js';

export type SnapshotListener = (snapshot: ExtendedMatchSnapshot) => void;

export interface GameSnapshotSource {
  readonly mode: 'mock' | 'socket';
  connect(): void;
  disconnect(): void;
  isConnected(): boolean;
  subscribe(listener: SnapshotListener): () => void;
}
