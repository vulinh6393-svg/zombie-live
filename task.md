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
- [x] Đo lường GPU đa cấp độ 1, 20, 50 entities duy trì 60 FPS
- [x] Git commit: `a7973d7`

## Giai đoạn 02.3: Main Battlefield Visual Integration (CHUYỂN TIẾP SANG 02.3.1)
- [x] Tích hợp sprite thật vào chiến trường chính
- [x] Git commit: `1d89780`

## Giai đoạn 02.3.1: Battlefield Visual Quality Recovery (ĐÃ HOÀN THÀNH TOÀN DIỆN)
- [x] **1. Sửa Triệt Để Lỗi Toàn Màn Hình Bị Phủ Đỏ (P0):**
  - [x] Khắc phục logic `baseHp` sụt giảm liên tục mỗi 100ms trong `MockSnapshotSource.ts`.
  - [x] Xóa bỏ hoàn toàn full-screen red graphics `hitFlash` (1080×1920) trong `BattlefieldScene.ts`.
  - [x] Chuyển thành hiệu ứng cảnh báo cục bộ (localized spark burst + viền đỏ chớp tắt trên thân tường thành y:1480 trong 200ms).
  - [x] Thêm bộ đệm thời gian (cooldown guard) tối thiểu 3 giây giữa các lần nhận cảnh báo va chạm.
  - [x] 100% gameplay bình thường hiển thị màu sắc tự nhiên, trong trẻo, không còn bất kỳ màn đỏ nào.
- [x] **2. Thiết Kế Lại Đội Hình Soldier (P0):**
  - [x] Cập nhật `SquadVisualizer.ts`: Bố trí đúng 3 lính đại diện/lane theo cự ly so le chiến thuật (Staggered V-formation: Point Guard ở giữa, 2 Flankers lùi sau 50px và lệch sang hai bên 68px).
  - [x] Khoảng cách giữa các lính >90px, tuyệt đối không chồng lấn sprite.
  - [x] Ẩn nameplate tĩnh cố định; chỉ hiển thị tên khi có sự kiện JOIN, Kill hoặc MVP.
  - [x] Đặt huy hiệu Squad Badge phía dưới chân tiểu đội (y:1478), không che nòng súng hay nhân vật.
- [x] **3. Hoàn Thiện Tổ Hợp Thành Trì Fortress Bằng Asset Thực (P0):**
  - [x] Bệ bê tông tròn cơ khí vững chắc bên dưới 3 ụ súng Sentry Turret.
  - [x] Cổng thép trung tâm kiên cố có hoa văn sơn sọc vàng đen cảnh báo nguy hiểm (hazard caution stripes).
  - [x] Tường thành bê tông cốt thép dày dặn có các lỗ châu mai phòng thủ.
  - [x] Tuyến rào chắn gỗ kim loại tiền duyên kết hợp nhiều tầng bao cát dã chiến và hòm đạn dược.
- [x] **4. Tối Ưu Lại Bố Cục Chiến Trường 9:16 (P0):**
  - [x] Phân chia 3 phân khu trực quan: Zombie Approach (y: 200–750) ➜ Active Combat Zone (y: 750–1250) ➜ Fortress Defense (y: 1250–1650).
  - [x] Mặt đường nhựa cao tốc ban đêm tự nhiên với vạch vàng đôi ở tim đường, vạch trắng phân làn, vết nứt và vệt cháy dầu loang.
  - [x] Ánh đèn spotlight chiến thuật rọi sáng mềm mại khu vực giao tranh.
- [x] **5. Tối Ưu Gift Alert và HUD (P1):**
  - [x] Đảm bảo Gift Alert không đè lên MVP Leaderboard hoặc Boss Bar.
  - [x] Banner gọn gàng, tự động ẩn sau 2.5s.
- [x] **6. Chuẩn Hóa Zombie & Boss (P1):**
  - [x] Định danh rõ "10 Zombie Walker" trong đợt thử nghiệm, không báo cáo sai lệch thành 10 chủng loại.
  - [x] Ghi rõ trạng thái prototype asset pending cho Boss.
- [x] **7. Đo Lường Hiệu Năng Kéo Dài 300 Frames/Tier:**
  - [x] Benchmark 10, 30, 50 entities chạy liên tục với đầy đủ animation và VFX.
  - [x] Đạt 60 FPS trung bình, p95 16.7–16.8ms, 0 long frames >33ms, JS Heap 42MB.
- [x] **8. Xuất Đầy Đủ 10 Sản Phẩm Nghiệm Thu Mới:**
  - [x] `battlefield_normal_fixed.png`
  - [x] `battlefield_minor_damage_fixed.png`
  - [x] `battlefield_gift_fixed.png`
  - [x] `battlefield_squads_fixed.png`
  - [x] `battlefield_fortress_fixed.png`
  - [x] `battlefield_mobile_fixed_360x640.png`
  - [x] `battlefield_tiktok_preview_fixed.png`
  - [x] `battlefield_fixed_demo.webm` (**Video thực tế 48 giây, 18.7MB** ghi trực tiếp từ BattlefieldScene)
  - [x] `docs/visual/BATTLEFIELD_VISUAL_QA_02_3_1.md`
  - [x] `docs/visual/BATTLEFIELD_PERFORMANCE_02_3_1.md`
  - [x] Git commit trên branch `feat/phase02-visual-refinement`

## Giai đoạn 02.3.2: Character Visibility, Formation & Battlefield Recovery (ĐÃ HOÀN THÀNH TOÀN DIỆN)
- [x] **1. Khắc Phục Triệt Để Zombie Rendering (P0.1):**
  - [x] Truy vết nguyên nhân gốc rễ: Client `simulateVisualCombat()` đã tự ý trừ máu và gọi `triggerDeath()`, biến zombie thành decal máu đỏ (`0x660000`) sau 1–2s.
  - [x] Loại bỏ hoàn toàn client damage / client death; việc sống/chết của Zombie 100% do Server/Snapshot quy định.
  - [x] Nâng depth container của Zombie lên Layer 12 (cao hơn mặt đường depth 2 và decal máu depth 6).
  - [x] Bổ sung chế độ `?debugEntities=1` vẽ bounding box xanh lá cây và xuất diagnostic API.
  - [x] Xác nhận: 10/10 zombie sống hiển thị sprite Walker đầy đủ hoạt ảnh bước đi trên đường cao tốc.
- [x] **2. Loại Bỏ Triệt Để Squad Overlap Bằng Visual Bounds Thực Tế (P0.2):**
  - [x] Đo đạc chính xác Visual Bounding Box (AABB) của Soldier sau khi xoay -90° (ngang 80px, dọc 114px).
  - [x] Thiết kế 3 phương án đội hình: A (3 lính/lane Deep-V), B (2 lính/lane Tactical Pair - Khuyên dùng), C (1 lính đại diện/lane).
  - [x] Xuất báo cáo toán học `squad_overlap_report.json`: Xác nhận **Phương án B đạt Zero Overlap tuyệt đối (0 cặp giao nhau, khoảng cách thoáng >50px)**.
- [x] **3. Tái Thiết Kế Kiến Trúc Thành Trì & Bố Cục Chiến Trường (P0.3):**
  - [x] Nén bớt vùng đường cao tốc trống trải, tập trung toàn bộ giao tranh vào trung tâm màn hình (y: 420–1250).
  - [x] Xây dựng tuyến rào chắn quân sự đa tầng: rào cản sọc cam trắng, bao cát dã chiến, hòm đạn.
  - [x] Tường thành bê tông cốt thép dày 65px có gờ highlight trên, bóng đổ chân tường và lỗ châu mai.
  - [x] Cổng thép Blast Gate cơ giới có sọc vàng-đen cảnh báo nguy hiểm.
  - [x] 3 bệ súng Sentry Turret gắn đinh tán thép, nòng súng kép giật nòng uy lực.
  - [x] Khu hậu cần tiếp vận và sở chỉ huy dự bị phía sau tường thành tạo chiều sâu không gian.
- [x] **4. Thống Kê Quân Số & HUD Minh Bạch:**
  - [x] Phân biệt rõ ràng: `Lực Lượng Chi Viện: 40 Người (3 Đội) | Trực Chiến: 6 Lính | Kẻ Địch: 10 Zombie`.
  - [x] Badge từng squad ghi rõ: `ALPHA: 12 CHI VIỆN (2 TRỰC CHIẾN)`.
- [x] **5. Tối Ưu Lớp Phủ TikTok Safe Zone:**
  - [x] Di dời Top HUD Header xuống y: 125 (hoàn toàn không bị Profile Pill hay Viewers Badge che).
  - [x] Khung bình luận TikTok chuyển xuống y: 1580 (nằm ở khu hậu cần/mép dưới, không che tường thành, lính hay vùng giao tranh).
- [x] **6. Khắc Phục Triệt Để Lỗi Font Chữ Tiếng Việt (Typography):**
  - [x] Tích hợp Google Fonts quốc tế: `Montserrat` (700/800/900) và `Be Vietnam Pro` (700/800).
  - [x] Preload font và await `document.fonts.ready` trước khi Phaser canvas khởi chạy.
  - [x] Cấu hình tập trung `GAME_FONTS` trong `FontConfig.ts` thay thế toàn bộ `Arial Black`.
- [x] **7. Đo Kiểm Hiệu Năng Đầy Đủ 60 Giây / Tier (Task 6):**
  - [x] Tier 1 (10 Entities): 60.5s | 3602 Frames | 59.5 FPS | p95: 16.7ms | >33ms: 0 | Heap: 23.4MB -> 23.4MB.
  - [x] Tier 2 (30 Entities): 60.1s | 3601 Frames | 59.9 FPS | p95: 16.8ms | >33ms: 0 | Heap: 20.7MB -> 20.7MB.
  - [x] Tier 3 (50 Entities): 60.1s | 3602 Frames | 59.9 FPS | p95: 16.8ms | >33ms: 0 | Heap: 23.4MB -> 23.4MB.
  - [x] Chạy liên tục >180 giây không rò rỉ bộ nhớ, 0 lỗi WebGL.
- [x] **8. Xuất Đầy Đủ 11 Sản Phẩm Nghiệm Thu:**
  - [x] `zombie_alive_10_entities.png`
  - [x] `zombie_death_transition.png`
  - [x] `squad_formation_A_B_C.png`
  - [x] `squad_overlap_report.json`
  - [x] `fortress_redesign_1080x1920.png`
  - [x] `fortress_redesign_360x640.png`
  - [x] `tiktok_safezone_before_after.png`
  - [x] `battlefield_full_combat.png`
  - [x] `battlefield_fixed_02_3_2.webm` (48s, 22.4MB)
  - [x] `docs/visual/BATTLEFIELD_QA_02_3_2.md`
  - [x] `docs/visual/BATTLEFIELD_PERFORMANCE_02_3_2.md`
  - [x] Cập nhật trang xem video trực tiếp `player.html` trong Artifacts.

## Giai đoạn 02.4: Battlefield Art Direction & TikTok LIVE Experience (ĐÃ HOÀN THÀNH - CHỜ REVIEW & CHỈ THỊ)
- [x] **A. Sửa cách thể hiện các Squad (1 Soldier đại diện / lane):**
  - [x] Chuyển mặc định sang 1 Soldier đại diện/lane ở kích thước hiện tại (Alpha, Bravo, Charlie).
  - [x] Hiển thị rõ nét từng Soldier kèm huy hiệu quân số chi viện.
  - [x] Khi nhận sự kiện JOIN/Reinforcement: cập nhật badge, phát animation tiếp viện (golden-cyan halo, 1.15x scale pop, weapon salute, floating label), xuất hiện lính hỗ trợ tạm thời 2.5s không gây chồng lấn.
  - [x] Giữ đầy đủ 40 người tham gia trong dữ liệu server.
  - [x] Kiểm tra visual bounds thực tế ở runtime từ container và display scale.
- [x] **B. Thiết kế mới Fortress (Art Direction chuyên nghiệp):**
  - [x] Phong cách: Top-down military zombie survival, semi-realistic 2D painted sprites, weathered concrete, dark asphalt, metal barricades, realistic cast shadows.
  - [x] Cổng thép trung tâm lớn (Heavy Blast Gate) dập gân kim loại, sọc cảnh báo vàng đen và khóa thủy lực.
  - [x] Tường thành bê tông cốt thép khối dày, có gờ bê tông sáng và bóng đổ chân tường.
  - [x] 3 phân khu phòng thủ Alpha, Bravo, Charlie có bệ pháo, bao cát, hàng rào kim loại chướng ngại vật, côn giao thông.
  - [x] Ụ pháo kép có bệ xoay, thân pháo, nòng súng kép giật nòng và đường nạp đạn.
  - [x] Sở chỉ huy và kho tiếp vận phía sau tường thành tạo chiều sâu.
  - [x] Hiệu ứng hư hại thành trì theo mức HP (vết nứt bê tông, tia lửa, khói).
  - [x] Tạo cảnh `FortressArtScene` (`/fortress-lab`) độc lập để kiểm tra độ rõ ràng ở 360×640 trước khi tích hợp vào `BattlefieldScene`.
- [x] **C. Bố cục chiến trường 1080×1920 mới (2 phương án Layout):**
  - [x] Thu gọn đường cao tốc, mở rộng không gian chiến trường theo phân tầng dọc:
    - Vùng HUD / LIVE an toàn: y: 0–220
    - Vùng Zombie xuất hiện: y: 220–550
    - Vùng giao tranh chính (Active Combat Zone): y: 550–1150
    - Vùng Thành trì phòng thủ (Fortress Defense): y: 1150–1500
    - Vùng Hậu cần & Sở chỉ huy: y: 1500–1800
  - [x] Cung cấp 2 phương án layout (`?layout=1`: Fortified Highway vs `?layout=2`: Checkpoint Bastion) và chụp preview 360×640.
- [x] **D. Tính đồng bộ nghệ thuật (Art Consistency):**
  - [x] Đồng bộ phong cách giữa Walker, Survivor, Turret, Fortress và môi trường xung quanh (thêm xe tuần tra cảnh sát và thiết giáp quân sự dã chiến trên lề đường).
  - [x] Cập nhật manifest và ghi rõ license cho mọi asset.
- [x] **E. Tối ưu Zombie & Hiệu ứng chiến đấu:**
  - [x] Giữ 10 Walker làm mật độ mock. Bỏ nhãn "Zombie #1", "#2" cố định trong bản phát LIVE.
  - [x] Ẩn thanh máu của zombie khi 100% HP, chỉ hiện khi bị bắn hoặc chọn.
  - [x] Giảm kích thước và thời gian hiển thị damage number xuống 400ms để không che khung hình.
  - [x] Chỉ tạo hit flash khi có sự kiện trúng đạn thật.
  - [x] Viết test xác nhận khi zombie chết thì alive count giảm từ 10 xuống 9 (`apps/game-client/src/client.test.ts`).
- [x] **F. Tái thiết kế TikTok LIVE Visual Hierarchy:**
  - [x] Thiết kế lại Wave, Base HP, MVP Leaderboard, Squad Status, Gift Alert, JOIN Alert, Boss Warning, Comment Callout (`Gõ '1' hoặc 'JOIN Alpha' để tham chiến!`).
  - [x] Đảm bảo Gift Alert nổi bật nhưng ngắn gọn (2.5s) và không che quái hay boss.
  - [x] Kiểm tra hiển thị an toàn trên lớp giả lập TikTok ở 360×640.
- [x] **G. Ghi video gameplay biểu diễn (>= 45 giây):**
  - [x] Quay trực tiếp từ BattlefieldScene: Zombie xuất hiện -> 3 Squad phòng thủ -> Súng & ụ pháo bắn -> Zombie trúng đạn -> 1 Zombie chết thật theo authoritative event -> Viewer JOIN -> Gift airstrike -> Thành trì nhận sát thương -> Khôi phục bình thường (48s, 22.7MB).
- [x] **H. Xuất đầy đủ sản phẩm nghiệm thu Phase 02.4:**
  - [x] `layout_1_highway_1080x1920.png` & `layout_1_highway_360x640.png`
  - [x] `layout_2_bastion_1080x1920.png` & `layout_2_bastion_360x640.png`
  - [x] `fortress_art_preview_1080x1920.png` & `fortress_art_preview_360x640.png`
  - [x] `squad_c_mode_preview.png`
  - [x] `battlefield_full_combat_02_4.png`
  - [x] `tiktok_safezone_preview_02_4.png`
  - [x] `battlefield_gameplay_02_4.webm` (48 giây, 22.7MB)
  - [x] `docs/visual/BATTLEFIELD_QA_02_4.md`
  - [x] `docs/visual/BATTLEFIELD_PERFORMANCE_02_4.md`
  - [x] Cập nhật trang xem video trực tiếp `player.html` trong Artifacts.
  - [x] Git commit trên branch `feat/phase02-visual-refinement`.

## Giai đoạn 02.5: Asset-First Art Production & LIVE Gameplay Polish (ĐÃ HOÀN THÀNH - CHỜ REVIEW & CHỈ THỊ)
- [x] **1. Asset-First Art Production & Audit (Task 1)**
- [x] **2. Tái Cấu Trúc FortressRenderer & Trang Thử Nghiệm (/fortress-lab) (Task 2)**
- [x] **3. Kiến Trúc 2 Layout Hoàn Toàn Khác Biệt (Task 3)**
- [x] **4. Xác Minh và Kiểm Chứng Authoritative Zombie Death (10 ➔ 9) (Task 4)**
- [x] **5. Nâng Cấp Hiệu Ứng Phản Hồi Gift "Tên Lửa Tổng Lực" (Task 5)**
- [x] **6. Chuẩn Hóa Logic Đồng Hồ (Timer) & LIVE UI Sạch (Task 6)**
- [x] **7. Kiểm Thử Tự Động, Đo Hiệu Năng 60s & Xuất Toàn Bộ Sản Phẩm Nghiệm Thu (Task 7)**

## ART APPROVAL GATE: Fortress Bastion Concept Art & Feasibility Analysis (ĐÃ HOÀN THÀNH REVIEW ĐỢT 1)
- [x] Cung cấp 4 file PNG gốc & đóng gói ZIP `zombie_art_approval_concepts.zip` (9.88MB)
- [x] Bổ sung tài liệu kỹ thuật `ART_TO_SPRITE_FEASIBILITY.md`
- [x] Nhận phản hồi nghiệm thu: ĐÃ DUYỆT ART STYLE, CHƯA DUYỆT SẢN XUẤT SPRITE

## ART APPROVAL GATE — CONDITIONAL APPROVAL & UNIFIED SCENE DESIGN (ĐANG TRIỂN KHAI)
> [!IMPORTANT]
> **Quy định nghiêm ngặt từ User**:
> - Sử dụng `fortress_concept_bastion_1080x1920.png` làm Master Environment Reference duy nhất.
> - Xây dựng lại Full Combat Concept trực tiếp trên Master Environment (2 bản: Normal và Gift Missile).
> - Hiệu chỉnh P0: Quy đổi tỷ lệ sprite logic canvas (1080x1920) vs mobile viewport (360x640) - không để lính/quái còn 14.7px trên điện thoại.
> - Hiệu chỉnh license trong `ASSET_LICENSE_MANIFEST.md`: Riley Gombart Zombie là CC0, Survivor là CC-BY 3.0; minh bạch nguồn gốc concept art.
> - Tạo mẫu thử nghiệm asset độc lập có alpha sạch `sample_isolated_assets.png`.
> - KHÔNG sửa `BattlefieldScene.ts`, KHÔNG tạo toàn bộ texture atlas trước khi duyệt sample, KHÔNG chuyển Phase 03.

## FINAL ART GATE P0 FIX: Master Geometry Alignment, Clean Plate, High-Fidelity Sprites & Phaser Runtime Lab (ĐANG THỰC HIỆN)
> [!IMPORTANT]
> **Chỉ thị nghiêm ngặt từ User**:
> - Không tạo concept mới. Không làm báo cáo mô tả dài dòng.
> - Xử lý 6 lỗi P0 triệt để và cung cấp bằng chứng runtime:
>   1. P0-01: Đo đạc chính xác pixel trên `bastion_master_environment.png` (1080x1920) để sửa sai lệch tọa độ cổng, tường, turret, zombie; xuất `bastion_geometry_verified.png`.
>   2. P0-02: Xây dựng `bastion_clean_environment.png` (bóc tách các công trình động, vẽ tái tạo sàn/lối đi thông suốt, không dùng màu bệt).
>   3. P0-03: Vẽ lại bộ sprite kiến trúc độc lập đạt chuẩn mỹ thuật tả thực đồng bộ Master: `bastion_wall_segment.png`, `bastion_gate_frame.png`, `bastion_gate_door_left.png`, `bastion_gate_door_right.png`, `bastion_turret_platform.png`, `wall_damage_overlay.png`; xuất `art_before_after.png`.
>   4. P0-04: Tạo route riêng `/art-integration-lab` trong Phaser (không sửa `BattlefieldScene.ts`), chạy đầy đủ: Cổng đóng/mở/hư hại, Turret xoay 360°, Lính che khuất trước/sau tường, Zombie dừng tại collision boundary; quay video runtime `art_integration_lab.webm` (>= 15s).
>   5. P0-05: Chạy Playwright với viewport thật 360x640, chụp ảnh runtime `mobile_runtime_360x640.png`, đo visible bounds và xác minh độ thoáng của UI/combat.
>   6. P0-06: Đóng gói toàn bộ test scripts, metrics, mã nguồn lab và báo cáo vào `zombie_art_gate_p0_fixed.zip`.
> - Tuyệt đối không sửa `BattlefieldScene.ts`, không tạo full atlas, không sang Phase 03.

- [ ] **P0-01 — Master Geometry Measurement & Alignment:**
  - [ ] Đo chính xác tọa độ pixel thực tế trên `bastion_master_environment.png` cho cổng, tường, tháp canh, 3 turret, boong-ke, zombie lanes.
  - [ ] Cập nhật lại `BASTION_MASTER_LAYOUT.md` với số liệu pixel đo đạc thực tế.
  - [ ] Xuất ảnh `bastion_geometry_verified.png` có lưới tọa độ, trục lane và bounding box va chạm.
- [ ] **P0-02 — Clean Environment Plate Generation:**
  - [ ] Tạo `bastion_clean_environment.png` loại bỏ các vật thể động (cổng, turret platform, vết nứt tường).
  - [ ] Tái tạo bề mặt thông đạo và sàn bê tông dã chiến phía sau cổng bằng texture liền mạch.
- [ ] **P0-03 — High-Fidelity Textured Sprites (Đồng bộ mỹ thuật Master):**
  - [ ] Vẽ/kết xuất lại 6 sprite độc lập có texture bê tông/thép thời tiết, gờ 3D bevels, bóng đổ mềm và kênh alpha sạch:
    - `bastion_wall_segment.png`
    - `bastion_gate_frame.png`
    - `bastion_gate_door_left.png`
    - `bastion_gate_door_right.png`
    - `bastion_turret_platform.png`
    - `wall_damage_overlay.png`
  - [ ] Xuất ảnh so sánh trực quan `art_before_after.png` (đối chiếu sprite cũ vs sprite mới).
  - [ ] Chạy script Sharp đo đạc alpha, channels và bounding box thực tế.
- [ ] **P0-04 — Phaser Art Integration Lab (/art-integration-lab) & Runtime Video:**
  - [ ] Tạo scene `ArtIntegrationLabScene.ts` và đăng ký route `/art-integration-lab` trong client.
  - [ ] Tích hợp sprite mới, clean background plate và các tween runtime:
    - Cổng đóng ➔ Cổng mở trượt 2 cánh ➔ Cổng hư hại tia lửa.
    - Turret xoay 360° theo mục tiêu.
    - Lính di chuyển trước/sau tường (occlusion depth sorting).
    - Zombie tiến công và dừng tại collision boundary.
    - Wall damage decal kích hoạt.
  - [ ] Quay video runtime `art_integration_lab.webm` (>= 15s) ghi trực tiếp từ Phaser WebGL.
- [ ] **P0-05 — Mobile Runtime Visual QA (360×640):**
  - [ ] Chụp màn hình runtime Playwright ở viewport thật 360×640: `mobile_runtime_360x640.png`.
  - [ ] Đo lường visible non-transparent bounds và kiểm tra độ thoáng của TikTok Safe Zone.
- [ ] **P0-06 — Packaging & Final Report:**
  - [ ] Xuất bản `docs/visual/ART_GATE_P0_VERIFICATION.md` với đầy đủ ma trận trạng thái tách biệt.
  - [ ] Đóng gói `zombie_art_gate_p0_fixed.zip`.
  - [ ] Cập nhật `player.html`.
  - [ ] Dừng lại chờ User nghiệm thu.

## Giai đoạn 02.7: Art Gate Audit Correction & Single Vertical Slice (ĐANG THỰC HIỆN)
> **Mục tiêu**: Xử lý triệt để 5 vấn đề cốt lõi do Người Dùng chỉ ra:
> 1. **Mỹ thuật Thật (Không dùng Procedural Canvas)**: Tạo bộ sprite bán hiện thực tả thực (weathered concrete, heavy steel, bolts, hazard paint) đồng bộ 100% với Master Bastion Concept bằng quy trình đồ họa chất lượng cao (subagent image-generator + alpha extraction sạch).
> 2. **Chuẩn hóa Hình học Duy Nhất (Single Source of Truth Geometry)**: Viết file config TypeScript `BastionGeometryConfig.ts` và đồng bộ từng pixel vào `BASTION_MASTER_LAYOUT.md` (Cổng y=900, Turret y=580, Collision Boundary y=840).
> 3. **Hệ Thống Collision Động Thực Sự (Real Dynamic Collision)**: Xây dựng `BastionCollisionSystem.ts` kiểm tra va chạm hình học thời gian thực (Closed -> Chặn; Open -> Cho qua hành lang; Damaged/Breached -> Cập nhật hitbox). Không dùng tween điểm đích hardcode!
> 4. **Kịch Bản Kiểm Thử Có Assertion Thật Sự (`run-verification.js`)**: Kiểm tra thực tế từng byte PNG, đo đạc alpha, kiểm tra consistency của geometry, chạy unit test assertion cho collision logic, tính toán động PASS/FAIL và trả exit code 1 nếu fail.
> 5. **Vertical Slice Hoàn Chỉnh Trên Phaser**: 1 Tường hoàn chỉnh, 1 Cổng 2 cánh đóng/mở/khóa, 1 Turret xoay bắn, 1 Lính có animation thật, 1 Zombie Walker va chạm và bị tiêu diệt, 1 decal sát thương tường. Quay video 1080×1920 và kiểm tra mobile 360×640.
> 6. **Giữ nguyên commit và đẩy GitHub**: Đóng gói `zombie_art_gate_p0_fixed.zip`, commit, push GitHub để người dùng và ChatGPT review. Tuyệt đối KHÔNG sửa `BattlefieldScene.ts`, KHÔNG tạo Full Atlas, KHÔNG sang Phase 03.

- [x] **Bước 1 — Single Source of Truth Geometry & Layout Docs**:
  - [x] Tạo `apps/game-client/src/config/BastionGeometryConfig.ts` (typed coordinates: Cổng y=900, Turret y=580, Collision y=840, 3 Lanes).
  - [x] Đồng bộ toàn diện `docs/visual/BASTION_MASTER_LAYOUT.md` loại bỏ hoàn toàn tọa độ cũ y=1250/1340.
- [x] **Bước 2 — Sản Xuất Bộ Sprite Bán Hiện Thực Thật (Semi-Realistic Textured Assets)**:
  - [x] Khởi chạy subagent `image-generator` tạo texture bê tông và thép dã chiến chất lượng cao đồng bộ Master Bastion Concept.
  - [x] Cắt ghép, trích xuất Alpha sạch không viền đen cho 5 asset: `bastion_wall_segment.png`, `bastion_gate_frame.png`, `bastion_gate_door_left.png`, `bastion_gate_door_right.png`, `bastion_turret_platform.png`.
  - [x] Kiểm chứng độ hài hòa mỹ thuật khi đặt trên Clean Plate ở tỷ lệ 1:1 gameplay.
- [x] **Bước 3 — Xây Dựng Hệ Thống Collision Động (`BastionCollisionSystem.ts`)**:
  - [x] Cài đặt engine va chạm dựa trên bounding box & segment:
    * Cổng Closed: Lane Bravo bị chặn tại y=840.
    * Cổng Open: Corridor x: [420..660] thông suốt, cho phép Zombie đi qua y=840 vào sâu y=940.
    * Cổng Closing: Zombie chưa qua vạch bị đẩy lùi/chặn lại.
    * Lane Alpha & Charlie: Luôn bị chặn tại y=840 bởi tường thành.
    * Tường hỏng/vỡ: Có thể mở đường va chạm khi HP = 0.
  - [x] Viết test assertion kiểm thử logic va chạm thời gian thực.
- [x] **Bước 4 — Nâng Cấp Vertical Slice Scene (`ArtIntegrationLabScene.ts`)**:
  - [x] Tích hợp sprite bán hiện thực mới.
  - [x] Áp dụng `BastionCollisionSystem` thời gian thực (update loop tính toán vận tốc, va chạm và phản lực).
  - [x] 1 Soldier Riley Gombart bắn animation thật, 1 Turret nhắm bắn, 1 Zombie Walker tiến công theo collision và bị hạ gục.
  - [x] Decal hư hại tường xuất hiện đúng cơ chế.
- [x] **Bước 5 — Viết Lại Kịch Bản Kiểm Thử Bàn Giao Thật Sự (`run-verification.js`)**:
  - [x] Đọc trực tiếp byte PNG, kiểm tra magic bytes `89 50 4E 47`, kích thước thực, min/max alpha, biên vật thể.
  - [x] Kiểm tra consistency giữa `BastionGeometryConfig.ts` và `BASTION_MASTER_LAYOUT.md`.
  - [x] Chạy kiểm thử tự động cho `BastionCollisionSystem` (Closed vs Open vs Re-closed).
  - [x] Tính toán động kết quả `PASS` / `FAIL` (không hardcode) và exit code 0/1.
- [x] **Bước 6 — Thu Thập Bằng Chứng Runtime, Đóng Gói & Đẩy GitHub**:
  - [x] Ghi hình video runtime WebGL 1080×1920 mới: `art_integration_lab.webm`.
  - [x] Chụp ảnh runtime Mobile 360×640: `mobile_runtime_360x640.png`.
  - [x] Đóng gói `zombie_art_gate_p0_fixed.zip`.
  - [x] Commit Git và push lên GitHub `vulinh6393-svg/zombie-live`.
> **Mục tiêu**: Thực thi và cung cấp trọn bộ bằng chứng kỹ thuật theo 5 yêu cầu cốt lõi của Người Dùng:
> 1. Kiểm tra triệt để lỗi viền đen (black halo) và mất chi tiết màu tối trên 4 nền: Trắng (#fff), Đen (#000), Magenta (#ff00ff) và Fortress.
> 2. Xác minh cơ chế động trên nền Clean Plate: Cổng đóng/mở trượt 2 cánh không lộ cổng cũ, turret xoay 360° đồng trục, soldier/zombie occlusion Z-order.
> 3. Kiểm tra ranh giới va chạm (collision boundary) độc lập trên cả 3 Lane (Alpha, Bravo, Charlie) tại y=840.
> 4. Kiểm tra Mobile Runtime 360×640 ở mật độ chuẩn: 9 Zombie, 3 Soldier, 3 Turret, HUD TikTok và Hiệu ứng Gift.
> 5. Cập nhật mã nguồn ArtIntegrationLabScene, ghi hình video WebGL 18s mới, đo đạc metrics Sharp, đóng gói `zombie_art_gate_p0_fixed.zip`, commit và push GitHub để nghiệm thu.

- [x] Phân tích yêu cầu và lập kế hoạch chi tiết (Planning).
- [x] Xây dựng kịch bản kiểm tra Alpha Halo Stress Test trên 4 nền (White, Black, Magenta, Fortress) cho 6 sprite kiến trúc; xuất `sprite_alpha_halo_stress_test.png` và `sprite_halo_metrics.json`.
- [x] Nâng cấp `ArtIntegrationLabScene.ts` hỗ trợ:
  - [x] Mật độ 9 Zombie (3 zombie/lane), 3 Soldier (1 lính/lane), 3 Turret.
  - [x] Hệ thống Collision Boundary độc lập cho cả 3 lane tại y=840.
  - [x] Hiệu ứng Gift tương tác (Airstrike/Orbital Flare) và HUD chuẩn TikTok.
  - [x] Chu trình động 4 pha hoàn chỉnh trên Clean Plate.
- [x] Ghi hình video runtime WebGL 18.5 giây mới: `art_integration_lab.webm`.
- [x] Chụp ảnh Mobile Runtime 360×640 mật độ 9 Zombie + 3 Soldier + 3 Turret + Gift: `mobile_runtime_360x640.png`.
- [x] Cập nhật kịch bản xác minh tự động `run-verification.js`.
- [x] Đóng gói lại `zombie_art_gate_p0_fixed.zip` (14.7 MB tại cả Scratch và Artifact Brain).
- [x] Git commit và push lên GitHub (`vulinh6393-svg/zombie-live`).
- [x] Cung cấp đầy đủ đường link tải file và tài liệu trực tuyến để Người Dùng và ChatGPT review.
- [ ] Giai đoạn 03: Server-authoritative deterministic engine
- [ ] Giai đoạn 04: Mock LIVE simulator và realtime player actions
- [ ] Giai đoạn 05: Database, profile, missions & leaderboards
- [ ] Giai đoạn 06: Gift mapping và deterministic skill effects
- [ ] Giai đoạn 07: Web dashboard quản trị Next.js
- [ ] Giai đoạn 08: OBS browser source / continuous engine
- [ ] Giai đoạn 09: QA, load testing và security audit
- [ ] Giai đoạn 10: TikTok LIVE adapter (khi có ủy quyền chính thức)
- [ ] Giai đoạn 11: Final review & handoff
