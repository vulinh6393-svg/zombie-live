# Task List - Zombie Đại Chiến: Thành Trì Cuối Cùng

## Giai đoạn 01: Scaffold & Setup (ĐÃ NGHIỆM THU)
- [x] Kiểm tra môi trường (Node.js v24.12, pnpm 9.15, Git 2.52)
- [x] Khởi tạo cấu trúc monorepo `zombie-live`
- [x] Lưu trữ đầy đủ tài liệu kiến trúc: `AGENTS.md`, `docs/`, `prompts/`
- [x] Thiết lập root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`
- [x] Thiết lập `packages/shared`, `packages/config`, `packages/database`
- [x] Thiết lập `apps/game-server`, `apps/game-client`, `apps/live-bridge`, `apps/admin`
- [x] Kiểm thử tự động: `pnpm install`, `pnpm typecheck`, `pnpm test` (11/11 tests pass), `pnpm build`
- [x] Git commit: `cde171d`

## Giai đoạn 02: Game Renderer Phaser 9:16 Hoàn Chỉnh (ĐÃ HOÀN THÀNH NGHIỆM THU)
- [x] 1. Kiến trúc Snapshot-driven & Contracts
  - [x] Thiết lập `GameSnapshotSource` interface
  - [x] Triển khai `MockSnapshotSource` (phát snapshot 10Hz với 6 scenario: wave1, wave3, wave4, boss, victory, defeat)
  - [x] Triển khai `SocketSnapshotSource` (kết nối Socket.IO tới backend game-server `/game`)
- [x] 2. Battlefield & Map Layers (1080x1920)
  - [x] Deep navy background gradient, tech grid lines
  - [x] 3 đường zombie tiến công (Lanes 1, 2, 3) với ranh giới phát sáng và mũi tên cảnh báo
  - [x] Khu vực căn cứ phòng thủ 10,000 HP ở đáy với barricades
  - [x] 3 bệ tháp phòng thủ (Machinegun, Plasma, Tesla)
- [x] 3. Entity Renderers & Procedural Assets
  - [x] `TextureGenerator`: Tạo procedural vector textures cho 10 zombies, lính, 3 tháp, đạn, hiệu ứng
  - [x] 10 loại zombie riêng biệt: Walker, Runner, Armored, Spitter, Healer, Brute, Shocker, Summoner, Shadow, ZombieKing
  - [x] SoldierRenderer (quân phục tác chiến, nameplate tên người chơi, thanh máu)
  - [x] TowerRenderer (3 loại tháp quay nòng ngắm zombie gần nhất, hiệu ứng bắn)
  - [x] BossRenderer (Zombie King kích thước lớn, vương miện rực lửa, hào quang thịnh nộ, thanh HP riêng)
  - [x] `ProjectilePool` & `DamageNumberPool` (Object pooling cho đạn và chữ số sát thương bay)
- [x] 4. Animations & State Transitions
  - [x] Soldier: Idle, Attack recoil, Death dissolve
  - [x] Zombie: Spawn scale, Walk bobbing, Hit flash (tint), Death dissolve
  - [x] Boss: Entrance, Rage aura, Special attack, Thanh HP 3 giai đoạn
  - [x] Snapshot linear interpolation (lerp position) mượt mà
- [x] 5. HUD & Safe-zone Layout
  - [x] Wave phase & countdown timer (05:00)
  - [x] Base HP progress bar có đổi màu theo ngưỡng máu
  - [x] Boss Warning Banner & Boss HP Bar
  - [x] Active entity counter (Lính / 40, Zombie, Viewers)
  - [x] Mini MVP Leaderboard (Top 4 người đóng góp)
  - [x] Gift alert banner tự động ẩn sau 2.5s
  - [x] Thanh hướng dẫn comment bottom an toàn với TikTok LIVE UI (`JOIN`, `BAN`, `SUA`, `CUU`)
- [x] 6. Routing & Views
  - [x] Route `/`: Chế độ Development có thanh Dev Control Panel tương tác nhanh các đợt quái
  - [x] Route `/overlay`: Chế độ OBS / TikTok Studio thuần túy 9:16, sạch bóng debug controls
- [x] 7. Kiểm thử & Đo đạc thực tế
  - [x] Typecheck Strict: 100% pass trên 8 workspace projects
  - [x] Vitest Unit Tests: 12/12 tests pass
  - [x] Playwright E2E: 5/5 kịch bản pass, 0 console errors
  - [x] Screenshots chụp thực tế: 1080x1920, 720x1280, /overlay, Boss, Victory
  - [x] Báo cáo đo FPS trung thực (đạt mục tiêu 60 FPS trong engine, đo đạc môi trường headless)
- [x] 8. Tạo Git commit cho Giai đoạn 02

## Các giai đoạn tiếp theo (Chưa thực hiện - Đang chờ người dùng review và chỉ thị)
- [ ] Giai đoạn 03: Server-authoritative deterministic engine
- [ ] Giai đoạn 04: Mock LIVE simulator và realtime player actions
- [ ] Giai đoạn 05: Database, profile, missions & leaderboards
- [ ] Giai đoạn 06: Gift mapping và deterministic skill effects
- [ ] Giai đoạn 07: Web dashboard quản trị Next.js
- [ ] Giai đoạn 08: OBS browser source / continuous engine
- [ ] Giai đoạn 09: QA, load testing và security audit
- [ ] Giai đoạn 10: TikTok LIVE adapter (khi có ủy quyền chính thức)
- [ ] Giai đoạn 11: Final review & handoff
