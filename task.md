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

## Giai đoạn 02.1: Visual Asset & Animation Quality Gate (ĐÃ BỊ TỪ CHỐI CHẤT LƯỢNG)
- [x] Đã chuyển đổi sang Phase 02.2

## Giai đoạn 02.2: Real Sprite Quality Lab (ĐÃ HOÀN THÀNH TÍCH HỢP ASSET)
- [x] Tải và lưu trữ 138 asset sprite PNG thực tế vào `apps/game-client/public/assets/`
- [x] Tạo `SpriteAssetLoader.ts`, `CharacterAnimationRegistry.ts`, `CharacterRenderer.ts`, `SpriteScaleConfig.ts`
- [x] Git commit: `aa0280b`

## Giai đoạn 02.2.1: Quality Lab Visual Presentation Fix (ĐÃ CHẤP THUẬN KỸ THUẬT)
- [x] Tách hoàn toàn Dev Controls ra khỏi màn hình gameplay sạch
- [x] Hiệu chuẩn scale alpha-trimmed chuẩn 36px, 44px (Standard), 52px (Large)
- [x] Tạo video `combat_animation_demo.webm` (17s) và bộ ảnh nghiệm thu
- [x] Đo lường GPU đa cấp độ 1, 20, 50 entities duy trì 60 FPS
- [x] Git commit: `a7973d7`

## Giai đoạn 02.3: Main Battlefield Visual Integration (ĐÃ HOÀN THÀNH TOÀN DIỆN)
- [x] **A. Chuyển Đổi Thực Thể Sang Sprite Thật Trong BattlefieldScene:**
  - [x] Xây dựng `SoldierRenderer` & `ZombieRenderer` sử dụng 100% spritesheet thật (Riley Gombart OGA CC0/CC-BY).
  - [x] Loại bỏ triệt để việc vẽ nhân vật hình học từ `TextureGenerator` trong scene chiến trường production.
  - [x] Minh bạch trạng thái asset cho các quái chưa có spritesheet riêng (không đổi màu vector).
- [x] **B. Thiết Kế Lại Bố Cục Chiến Trường Chuẩn 9:16:**
  - [x] `0% – 10%` (y: 0–190): Top HUD (Wave, Timer, Base HP bar, Boss bar).
  - [x] `10% – 65%` (y: 190–1250): Active Battlefield (3 làn đường nhựa asphalt có vạch kẻ vàng đôi, rãnh nứt, vết dầu; khoảng cách giao tranh thu hẹp, hành động liên tục).
  - [x] `65% – 85%` (y: 1250–1630): Tổ hợp Thành trì Fortress kiên cố (tường bê tông, cổng thép, 3 ụ súng turret, rào chắn, bao cát, hòm đạn, đèn pha spotlight).
  - [x] `85% – 93%` (y: 1630–1785): Player Squads & Status (Khu tập kết 3 tiểu đội Alpha, Bravo, Charlie).
  - [x] `93% – 100%` (y: 1785–1920): Viewer instructions & TikTok LIVE safe zone (`Comment JOIN để tham chiến`).
- [x] **C. Thiết Kế Tổ Hợp Căn Cứ Phòng Thủ (Fortress Architecture):**
  - [x] Tường thành bê tông cốt thép, cổng thép chống càn kiên cố.
  - [x] Tuyến rào chắn gỗ kim loại chống tăng kết hợp bao cát và hòm đạn tiếp tế.
  - [x] 3 ụ súng Turret (Kenney CC0) xoay nòng 360 độ và bắn hỗ trợ dọc 3 làn tiến công.
  - [x] Hệ thống đèn pha phòng thủ (Defense Spotlights) rọi ngược sáng tạo độ tương phản cao.
  - [x] Hiệu ứng Base Hit chớp viền đỏ, rung chấn màn hình khi căn cứ nhận sát thương.
- [x] **D. Trực Quan Hóa Đội Lính (Soldier Squad Visualization):**
  - [x] Xây dựng module `SquadVisualizer` gom lính vào Alpha (Làn 1), Bravo (Làn 2), Charlie (Làn 3).
  - [x] Mỗi squad hiển thị 4 lính đại diện có animation ngắm/bắn súng thật + huy hiệu số lượng quân (VD: `ALPHA SQUAD — 12 LÍNH`).
  - [x] Khi viewer comment `JOIN`: cập nhật quân số và hiển thị hiệu ứng tiếp viện hào quang + tên nổi bật, không spawn 40 tên chồng chéo.
- [x] **E. Tích Hợp Hiệu Ứng Chiến Đấu Toàn Diện (Combat VFX):**
  - [x] Muzzle flash súng trường & tháp súng, đạn tracer bay theo quỹ đạo authoritative.
  - [x] Hiệu ứng nổ tia lửa trúng đạn (`hit_explosion`) và số sát thương nảy lên (`-35`, `-50 CRIT`).
  - [x] Xác chết zombie lưu lại trên mặt đường cùng vũng máu lan rộng.
- [x] **F. Tối Ưu Bố Cục TikTok LIVE Safe Zone:**
  - [x] Xây dựng module `TikTokSafeZone` mô phỏng đầy đủ giao diện LIVE di động (host pill, view count, chat stream, share/like/rose buttons).
  - [x] Đảm bảo Top HUD, MVP Leaderboard, Squad Badges không bị che khuất.
  - [x] Giữ `debug=0` cho `/overlay` (100% sạch cho OBS Livestream).
- [x] **G. Đo Lường Hiệu Năng Kéo Dài (Stress Benchmark ≥ 60s):**
  - [x] Đo kiểm tra 10, 30, 50 entities trong thời gian thực kéo dài với đầy đủ animation và VFX.
  - [x] Đạt 60 FPS trung bình, p95 16.7–16.8ms trên WebGL ANGLE Direct3D11, RAM 42MB.
- [x] **H. Xuất Đầy Đủ 10 Sản Phẩm Nghiệm Thu Thực Tế:**
  - [x] `battlefield_real_sprites_1080x1920.png`
  - [x] `battlefield_real_sprites_360x640.png`
  - [x] `battlefield_10_zombies.png`
  - [x] `battlefield_30_entities.png`
  - [x] `battlefield_boss_preview.png`
  - [x] `battlefield_live_overlay.png`
  - [x] `battlefield_tiktok_safezone_preview.png`
  - [x] `battlefield_gameplay_demo.webm` (**Video thực tế 34 giây, 21.4MB** ghi trực tiếp từ BattlefieldScene)
  - [x] `docs/visual/BATTLEFIELD_VISUAL_QA.md`
  - [x] `docs/visual/BATTLEFIELD_PERFORMANCE.md`
  - [x] Git commit trên branch `feat/phase02-visual-refinement`

## Các giai đoạn tiếp theo (Chưa thực hiện - Đang dừng lại chờ người dùng review và chỉ thị)
- [ ] Giai đoạn 03: Server-authoritative deterministic engine
- [ ] Giai đoạn 04: Mock LIVE simulator và realtime player actions
- [ ] Giai đoạn 05: Database, profile, missions & leaderboards
- [ ] Giai đoạn 06: Gift mapping và deterministic skill effects
- [ ] Giai đoạn 07: Web dashboard quản trị Next.js
- [ ] Giai đoạn 08: OBS browser source / continuous engine
- [ ] Giai đoạn 09: QA, load testing và security audit
- [ ] Giai đoạn 10: TikTok LIVE adapter (khi có ủy quyền chính thức)
- [ ] Giai đoạn 11: Final review & handoff
