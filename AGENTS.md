# Always-on Antigravity rules — Zombie Live

## Source of truth
- Read `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/GAME_BALANCE.json`, `docs/TEST_PLAN.md` before implementation.
- Match the current task in `prompts/`. Do not implement future phases accidentally.
- Language: use Vietnamese for game HUD and dashboard; English for source identifiers, code comments and README commands.

## Stack & architecture
- pnpm monorepo, strict TypeScript, Node.js LTS, Phaser 3.90.x (NOT Phaser 4), Vite, Fastify, Socket.IO, Prisma/PostgreSQL, Redis/BullMQ; Next.js admin added in phase 07.
- Backend owns authoritative match simulation (fixed logical tick 20 Hz). Renderer interpolates snapshots and owns NO scoring/combat rules.
- Use deterministic seeds and fixed-step simulations; 5-minute round time including boss + results; wave timing and transitions in config. All business events are idempotent.
- All external LIVE events MUST pass through LiveEventAdapter and validation, not directly into game state.
- MockAdapter must fully work offline from TikTok. No hardcoded gift prices or fake official API endpoints.

## Engineering quality
- TypeScript strict: true, ESLint/Prettier, Zod schemas for ingress, Vitest tests, Playwright screenshot/smoke tests.
- For each prompt: (a) inspect repository (b) state small execution plan (c) implement (d) run lint/typecheck/tests/build (e) inspect UI in browser (f) fix any errors (g) report modified files, commands, results and remaining issues. Never report passing without running.
- No production secret in git. `.env.example` only; real `.env` gitignored. Never call external paid/unsafe APIs without human approval.
- Never auto-deploy or publish LIVE without approval. Do not open arbitrary public ports. Rate limit admin and mock tools. Admin endpoints require authentication outside local dev.
- Postgres DB uniques, transactional XP/reward updates, event dedupe, gift streak finalization and explicit limits for concurrent skills are mandatory.
- Sanitise username before display, avoid heavy repeated text labels, cap visual entities to preserve FPS. Viewer ID is an opaque platform ID, not display name.

## Product guardrails
- Gift animations are deterministic and explicitly disclosed; no monetary rewards, random-payout purchases, gambling or gifting pressure.
- Free commands remain meaningful. Gift contributions should not dominate competitive rankings. Provide accessible labels and readable HUD.
- TikTok LIVE 24/7 eligibility is unverified and must not be claimed as guaranteed. Provide operator pause, disconnect notice and safe shutdown.

## Definition of done per phase
- The feature runs end-to-end. No TODO, dummy data disguised as real, silent catch, TypeScript errors, dead UI buttons, or mocked test passes.
- Document blockers honestly. Create a Git commit only after passing acceptance tests; do not overwrite changes outside the assigned phase.
