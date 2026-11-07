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

## Giai đoạn 02.1: Visual Asset & Animation Quality Gate (ĐÃ BỊ TỪ CHỐI CHẤT LƯỢNG - CHUYỂN TIẾP SANG 02.2)
- [x] Tạo branch `feat/phase02-visual-refinement`
- [x] Tạo tài liệu giai đoạn 02.1
- [x] Người dùng từ chối nghiệm thu do nhân vật còn mang tính hình học đơn giản, thiếu animation spritesheet thực tế, lính chồng chéo, và FPS chưa tối ưu.

## Giai đoạn 02.2: Real Sprite Quality Lab (ĐÃ HOÀN THÀNH TÍCH HỢP ASSET)
- [x] Đọc và đối chiếu các yêu cầu đặc tả bắt buộc
- [x] Khảo sát các bộ sprite theo yêu cầu (SmallScaleInt, Sova Digital, OpenGameArt)
- [x] Tải và lưu trữ 138 asset sprite PNG thực tế vào `apps/game-client/public/assets/`
- [x] Tạo `SpriteAssetLoader.ts`, `CharacterAnimationRegistry.ts`, `CharacterRenderer.ts`, `SpriteScaleConfig.ts`
- [x] Git commit: `aa0280b`

## Giai đoạn 02.2.1: Quality Lab Visual Presentation Fix (ĐÃ HOÀN THÀNH TOÀN DIỆN)
- [x] Tách hoàn toàn Dev Controls ra khỏi màn hình gameplay:
  - [x] Mặc định `debug=0` hiển thị 100% canvas chiến trường sạch (`quality_lab_clean`)
  - [x] Hỗ trợ tham số `?debug=1` để bật bảng điều khiển nằm ngoài vùng chiến đấu
  - [x] Không làm ảnh hưởng route `/overlay` hay `/contact-sheet`
- [x] Thiết kế lại camera và bố cục Quality Lab thu hẹp khu vực giao chiến (Combat-Focus):
  - [x] Đưa vị trí lính (y=1200) và zombie (y=760->960) lại cự ly gần (~200px)
  - [x] Turret (x=690, y=1140) và hệ thống rào chắn barricade kiên cố
  - [x] Khung hình tập trung hành động rõ nét, trực quan trên điện thoại
- [x] Hiệu chuẩn kích thước nhân vật dựa trên pixel thực (Alpha-Trimmed Bounds):
  - [x] Đo đạc phần hình thực sự: Walker (207×196px alpha body), Survivor (258×152px alpha body)
  - [x] Cấu hình 3 mức hiển thị trên preview 360×640: 36px, 44px (Standard), 52px (Large)
  - [x] Đồng bộ tỉ lệ chiều cao thân giữa lính và zombie hoàn hảo
- [x] Nâng cấp môi trường top-down military survival theo 3 hình ảnh tham chiếu:
  - [x] Mặt đường nhựa cao tốc đêm (Asphalt) có vạch vàng đôi, vạch trắng biên đường, rãnh nứt và vệt cháy dầu
  - [x] Tuyến rào chắn gỗ kim loại, bao cát gia cố, thùng đạn tiếp tế quân sự
  - [x] Đèn pha spotlight chiếu rọi trực tiếp từ góc chéo, tạo độ tương phản cao và hiệu ứng ánh sáng ban đêm kịch tính
- [x] Xây dựng chu kỳ tự động trình diễn chiến đấu (Autonomous Combat Loop):
  - [x] Walk → Aim → Shoot (Muzzle flash) → Tracer bullet flight → Hit reaction (Spark & Knockback) → Damage Number (-35) → Death (Corpse & Blood decal) → +50 EXP → Auto Reset
- [x] Xác minh asset thật & lập tài liệu `docs/visual/VISUAL_QA_02_2_1.md`:
  - [x] Liệt kê đầy đủ 138 file PNG, frame counts, texture sizes, display bounds, không fallback hình học
- [x] Đo lường hiệu năng chuyên sâu & lập `docs/visual/FPS_BENCHMARK_UPDATED.md`:
  - [x] Đo riêng 3 cấp độ: 1 entity (60 FPS, p95 16.7ms), 20 entities (60 FPS, p95 16.7ms), 50 entities (60 FPS, p95 16.8ms)
  - [x] WebGL ANGLE Direct3D11 hardware acceleration, JS Heap 42MB
- [x] Xuất đầy đủ 7 sản phẩm nghiệm thu bắt buộc:
  - [x] `quality_lab_clean_1080x1920.png`
  - [x] `quality_lab_clean_360x640.png`
  - [x] `quality_lab_combat_focus.png`
  - [x] `walker_soldier_scale_comparison.png`
  - [x] `combat_animation_demo.webm` (video 17s ghi từ game thật, 2.9MB)
  - [x] `docs/visual/FPS_BENCHMARK_UPDATED.md`
  - [x] `docs/visual/VISUAL_QA_02_2_1.md`
  - [x] Git commit trên branch `feat/phase02-visual-refinement`

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
