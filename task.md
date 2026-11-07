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

## Giai đoạn 02.2: Real Sprite Quality Lab (ĐÃ HOÀN THÀNH & SẴN SÀNG NGHIỆM THU)
- [x] Đọc và đối chiếu các yêu cầu đặc tả bắt buộc
- [x] Khảo sát các bộ sprite theo yêu cầu (SmallScaleInt, Sova Digital, OpenGameArt)
- [x] Viết file đặc tả chi tiết `docs/visual/PHASE_02_2_SPEC.md`
- [x] Tải và lưu trữ 138 asset sprite PNG thực tế vào `apps/game-client/public/assets/`
- [x] Tạo `SpriteAssetLoader.ts`, `CharacterAnimationRegistry.ts`, `CharacterRenderer.ts`, `SpriteScaleConfig.ts`
- [x] Xây dựng màn `QualityLabScene` cô lập trên route `/quality-lab`:
  - [x] 1 Zombie Walker với animation thật (idle, walk, attack, hit, death) qua Phaser Animation Manager
  - [x] 1 Survivor Soldier với animation thật (idle, walk, shoot, reload, feet animation)
  - [x] 1 Tháp súng xoay và nòng súng có hiệu ứng recoil/muzzle flash
  - [x] 1 Tuyến phòng thủ highway đêm với rào chắn barricade, sandbags, ammo crates và đèn rọi floodlights
  - [x] Hệ thống đạn tracer bay, nảy số sát thương, phản ứng hit và xác chết tồn lưu trên mặt đường kèm vũng máu
  - [x] Thanh Dev Control Panel đầy đủ các nút tương tác
- [x] Khảo sát khả năng nhận diện trên di động 360×640 với 3 độ phóng đại Scale A (32px), Scale B (40px), Scale C (48px)
- [x] Điều tra hiệu năng FPS thực tế trên Chrome có GPU Acceleration: Đo đạt chuẩn 60 FPS, p50: 16.70ms, p95: 16.80ms
- [x] Tạo đầy đủ 9 sản phẩm nghiệm thu bắt buộc:
  - [x] Screenshot Quality Lab 1080×1920 (`quality_lab_1080x1920.png`)
  - [x] Screenshot Quality Lab 360×640 (`quality_lab_360x640.png`)
  - [x] Contact Sheet nhân vật thật (`character_contact_sheet_real.png`)
  - [x] Video Clip 10–20 giây ghi hình thực tế (`quality_lab_demo.webm`)
  - [x] Ảnh so sánh Scale A, B, C (`scale_a_360x640.png`, `scale_b_360x640.png`, `scale_c_360x640.png`)
  - [x] Kê khai Asset Manifest & License (`ASSET_MANIFEST.md`, `manifest.json`)
  - [x] Báo cáo hiệu năng FPS chi tiết (`FPS_BENCHMARK_REPORT.md`)
  - [x] Kiểm thử tự động: Strict Typecheck PASS 100%, Unit Test 12/12 PASS, Vite Build thành công
  - [x] Tạo Git commit hoàn thiện Phase 02.2

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
