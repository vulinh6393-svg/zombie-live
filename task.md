# Task List - Zombie Đại Chiến: Thành Trì Cuối Cùng

## Giai đoạn 01: Scaffold & Setup (ĐÃ NGHIỆM THU)
- [x] Khởi tạo cấu trúc monorepo `zombie-live`
- [x] Lưu trữ đầy đủ tài liệu kiến trúc: `AGENTS.md`, `docs/`, `prompts/`
- [x] Thiết lập packages & apps (Phaser 3.90, Fastify, Docker, Prisma, Shared)
- [x] Git commit: `cde171d`

## Giai đoạn 02: Game Renderer Phaser 9:16 (ĐÃ NGHIỆM THU)
- [x] Thiết lập canvas 1080x1920 (9:16), scene chiến trường, lerp interpolation
- [x] Tuyệt đối không chứa combat logic hay tính damage trên client
- [x] Git commit: `65be2ad`

## Giai đoạn 02.1: Visual Asset & Animation Quality Gate (ĐÃ HOÀN THÀNH NGHIỆM THU)
- [x] Tạo branch `feat/phase02-visual-refinement`
- [x] Tạo kế hoạch & tài liệu `docs/visual/`:
  - [x] `PHASE_02_1_IMPLEMENTATION_PLAN.md` (Kế hoạch M1 -> M6)
  - [x] `ASSET_MANIFEST.md` (Bảng kê khai nguồn gốc & license CC0 / Project-Original)
  - [x] `CHARACTER_SHEET.md` (Đặc tả chi tiết hình dáng, kích thước, silhouette 10 zombie & boss)
  - [x] `ANIMATION_SPECS.md` (Đặc tả trạng thái spawn, walk, attack, hit, death)
  - [x] `VISUAL_QA.md` (Tiêu chuẩn nghiệm thu hình ảnh)
  - [x] `THIRD_PARTY_LICENSES/KENNEY_CC0_LICENSE.txt`
- [x] Xây dựng Asset Registry & Procedural Vector Pipeline (`AssetRegistry.ts`, `TextureGenerator.ts`):
  - [x] Nhân vật lính (Survivor): mũ bảo hiểm cyan, giáp ngực, súng trường carbine, nameplate, thanh máu
  - [x] 10 loại zombie riêng biệt: Walker, Runner, Armored, Spitter, Healer, Brute, Shocker, Summoner, Shadow, Zombie King
  - [x] 3 loại tháp: Súng máy nòng đôi, Pháo plasma, Tháp điện Tesla
  - [x] Căn cứ phòng thủ 10,000 HP kiên cố
- [x] Xây dựng `ContactSheetScene`: Bảng tổng hợp đối chiếu trực quan 10 chủng quái vật
- [x] Tích hợp thanh Dev Control Panel trên `/` (Đổi nhanh đợt, trùm cuối, kết quả)
- [x] Đảm bảo route `/overlay` sạch bóng 100% không có bất kỳ nút debug hay công cụ dev
- [x] Kiểm thử tự động & Bằng chứng thực tế:
  - [x] Strict Typecheck: 100% pass trên 8 workspace projects
  - [x] Vitest Unit Tests: 12/12 tests pass
  - [x] Playwright E2E: Đạt 9/9 screenshots thực tế, 0 Console Errors
- [x] Tạo Git commit hoàn thiện Phase 02.1

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
