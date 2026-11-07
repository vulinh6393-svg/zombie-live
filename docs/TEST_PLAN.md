# Test plan and acceptance criteria

## Automated
- **Unit**: seeded spawn reproducibility; state transitions exact at clock boundaries; all 10 zombie stats parse; boss phase; base defeat; damage/armor; cooldown; user joins once; overflow squading; sanitization; boss fails at combat deadline.
- **Event**: duplicate eventKey ignored; comments with accents/no accents recognized; gift unknown ID ignored; cumulative streak 1→2→5 final = 5 total, not 8; same final delivered twice = exactly once; concurrent streak groups distinguishable.
- **Persistence**: duplicate completion result not award XP twice; mission period keyed to Asia/Ho_Chi_Minh; server restarts maintain level and state; leaderboard consistent.
- **Security**: mock event endpoint blocked in production, admin denied without login, WebSocket browser-origin policy and payload limit.

## E2E scenario, via browser
1. Launch client+server; no TikTok required, MOCK_MODE=true shown.
2. JOIN for mock-user-1 -> one soldier with sanitized name; repeat JOIN -> still one soldier.
3. BAN -> one special shot; immediate repeat ignored with visible cooldown.
4. Advance virtual time / accelerate sim 10x -> waves and boss; match settles exactly once.
5. Send mock Gift A/B/C/D -> distinct visible skill + recorded contribution; final streak doesn't double-award.
6. Kill base -> defeat; clear boss by deadline -> victory.
7. Restart processes/database; XP, leaderboard and mission progress persist.
8. Open OBS-friendly /overlay; HUD fits 9:16; text readable and no debug controls.

## Performance criteria
- 500 participants / 100 normalized events per second for 10 minutes; zero lost accepted events (except explicitly rate-limited), no duplicate award.
- Game renderer p95 >= 30FPS at target OBS host; target 60FPS normal hardware.
- At 10Hz snapshots, bound payload and network traffic; mass enemy visual batching and name-label throttling.
