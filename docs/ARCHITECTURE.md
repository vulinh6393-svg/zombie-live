# Architecture and integration contract

## Project folders
- `apps/game-client`: Phaser 3.90/Vite browser source at :5173
- `apps/game-server`: Fastify :3001, Socket.IO, engine tick (20 Hz)
- `apps/live-bridge`: Mock, replay, optional TikTok adapter
- `apps/admin`: Next.js dashboard at :3000 (phase 07)
- `packages/shared`: Zod event/API schemas, TS types
- `packages/config`: Balance configuration and parser
- `packages/database`: Prisma schema/migrations/seeds
- `infra`: Docker Compose with PostgreSQL, Redis

## Authority & timing
- One single-writer engine for each match. Clock uses monotonic time, accumulated delta, bounded catch-up. Avoid multiple setInterval concurrent match loops.
- Seeded PRNG for deterministic spawn/loot decisions. Server snapshots at 10 Hz, renderer 60 FPS via interpolation.
- Match phases: PREPARING, WAVE_1 .. WAVE_5, BOSS, RESULTS, RESET, PAUSED.
- Persist match state or checkpoints at transitions. On restart resume or safely close match and award results once.

## Normalized event contract
```typescript
interface NormalizedLiveEvent {
  eventKey: string; // globally unique provider event key, or stable derived equivalent
  provider: 'mock' | 'tiktok' | 'replay';
  liveSessionId: string;
  userId: string; // stable opaque identifier
  username: string; // display only, sanitized
  at: string; // ISO instant
  type: 'comment' | 'gift' | 'like' | 'follow';
  comment?: string;
  gift?: {
    giftId: string;
    quantity: number;
    streakGroupId?: string;
    cumulativeQuantity?: number;
    isFinal: boolean;
  };
  like?: { delta: number };
  rawRef?: string;
}
```

Normalize uppercase/case-insensitive commands and Vietnamese accentless aliases. Validate via Zod. Rate limit per user + session. eventKey has unique DB index.

## Network contract
- GET /health, GET /ready, GET /api/stream/state (status only), POST /api/dev/events (mock/local only, validated), Socket.IO /game namespace.
- Server emits: `match:snapshot` (10Hz), `match:phase`, `player:joined`, `skill:triggered`, `match:result`, `bridge:status`. Client never sends combat results.
- Game client can request public snapshot and ask to re-sync after reconnect. No direct DB access from client.
