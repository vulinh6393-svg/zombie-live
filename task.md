# Task List - Zombie Đại Chiến: Thành Trì Cuối Cùng

## Giai đoạn 01: Scaffold & Setup (ĐÃ HOÀN THÀNH NGHIỆM THU)
- [x] Kiểm tra môi trường (Node.js v24.12, pnpm 9.15, Git 2.52)
- [x] Khởi tạo cấu trúc monorepo `zombie-live`
- [x] Lưu trữ đầy đủ tài liệu kiến trúc: `AGENTS.md`, `docs/`, `prompts/`
- [x] Thiết lập root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`
- [x] Thiết lập `packages/shared` (Zod schemas, types, Event contracts, Snapshot contracts, normalizer)
- [x] Thiết lập `packages/config` (GAME_BALANCE.json loader & validator, test 10 zombies)
- [x] Thiết lập `packages/database` (Prisma schema khởi tạo 11 models, client export)
- [x] Thiết lập `apps/game-server` (Fastify, Socket.IO, `/health`, `/ready`, `/api/stream/state`)
- [x] Thiết lập `apps/game-client` (Phaser 3.90, Vite, canvas 1080x1920 9:16)
- [x] Thiết lập `apps/live-bridge` (LiveEventAdapter interface, MockAdapter)
- [x] Thiết lập `apps/admin` (Scaffold Next.js placeholder chuẩn bị cho Phase 07)
- [x] Thiết lập `infra/docker-compose.yml` (PostgreSQL 16, Redis 7 có healthchecks)
- [x] Thiết lập `.env.example`, `.env`, `README.md`
- [x] Kiểm thử tự động: `pnpm install`, `pnpm typecheck`, `pnpm test` (11/11 tests pass), `pnpm build`
- [x] Kiểm thử runtime: `/health` 200 OK, `/ready` 200 OK, Socket.IO `/game` kết nối thành công, Client Preview 5173 nạp đúng giao diện 9:16
- [x] Báo cáo nghiệm thu Giai đoạn 01

## Các giai đoạn tiếp theo (Chưa thực hiện - Đang chờ người dùng review và chỉ thị)
- [ ] Giai đoạn 02: Game client Phaser 9:16 hoàn chỉnh
- [ ] Giai đoạn 03: Server-authoritative deterministic engine
- [ ] Giai đoạn 04: Mock LIVE simulator và realtime player actions
- [ ] Giai đoạn 05: Database, profile, missions & leaderboards
- [ ] Giai đoạn 06: Gift mapping và deterministic skill effects
- [ ] Giai đoạn 07: Web dashboard quản trị Next.js
- [ ] Giai đoạn 08: OBS browser source / continuous engine
- [ ] Giai đoạn 09: QA, load testing và security audit
- [ ] Giai đoạn 10: TikTok LIVE adapter (khi có ủy quyền chính thức)
- [ ] Giai đoạn 11: Final review & handoff
