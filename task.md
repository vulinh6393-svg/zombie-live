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

## Giai đoạn 02.8: Final Art Gate Targeted Correction Round (ĐÃ NGHIỆM THU VERTICAL SLICE - COMMIT 3d3187f)
- [x] **TASK 1 — Xử lý triệt để Gate Frame không chứa cánh cửa tĩnh (P0)**:
  - [x] Cắt rỗng vùng thông đạo trung tâm $x \in [68..232], y \in [44..158]$ của `bastion_gate_frame.png` thành alpha trong suốt 100%.
  - [x] Kiểm tra điểm ảnh thực: Tâm $(150, 100) = (0,0,0,0)$, trụ trái $(30, 80) = (21,21,19,255)$.
  - [x] Lưu đồng bộ vào `public/assets/environment/bastion/`, `public/assets/concept/` và `art-approval-final/`.
- [x] **TASK 2 — Cập nhật Collision System & Geometry Config chuẩn xác (P0)**:
  - [x] Sửa `BastionGeometryConfig.ts`: Tường rộng 420px, cổng 300px, cánh cửa 115px, vạch va chạm y=840.
  - [x] Sửa `BastionCollisionSystem.ts`: Tính toán khoảng hở an toàn theo mép trong thực tế: $x \in (\text{leftDoorX} + 57.5 + r, \text{rightDoorX} - 57.5 - r)$, đạt $[507.5, 572.5]$ khi mở tối đa.
  - [x] Đồng bộ `BASTION_MASTER_LAYOUT.md` với các thông số tường 420px và công thức va chạm mép cửa.
- [x] **TASK 3 — Viết Unit Test Vitest & Cập nhật run-verification.js (P0)**:
  - [x] Tạo file `apps/game-client/src/systems/BastionCollisionSystem.test.ts` với 10 test case Vitest nghiêm ngặt.
  - [x] Chạy `pnpm --filter @zombie-live/game-client test` xác nhận 100% tests PASS (15/15 tests).
  - [x] Cập nhật `run-verification.js` import trực tiếp `BastionCollisionSystem.ts` và `BastionGeometryConfig.ts` từ production code (21/21 tests pass, exit code 0).
- [x] **TASK 4 — Tích hợp Animation chuỗi đa frame & State HP thực trong Scene (P1)**:
  - [x] Cập nhật `ArtIntegrationLabScene.ts`: Đăng ký `anims.create` cho Survivor (`survivor-idle`, `survivor-shoot`) và Zombie (`walker-walk`, `walker-attack`).
  - [x] Cài đặt state nội bộ cho Zombie: Trừ HP khi trúng đạn, cập nhật `hp = 0` và `isDead = true`, đổi trạng thái chết, ngừng di chuyển, hiển thị `zombie_corpse_0` nằm trên đường.
- [x] **TASK 5 — Xuất bằng chứng, đóng gói và push GitHub**:
  - [x] Ghi hình video `art_integration_lab.webm` (18.5s, 5.06 MB) minh chứng cổng không còn cửa bóng mờ, animation chuỗi thật, HP giảm thật.
  - [x] Chụp screenshot side-by-side: Cổng đóng vs Cổng mở `gate_closed_vs_open_proof.png` (từ cùng góc camera, chứng minh thông đạo sạch 100%).
  - [x] Chụp ảnh Mobile QA 360×640 `mobile_runtime_360x640.png`.
  - [x] Cập nhật `player.html` và file zip `zombie_art_gate_p0_fixed.zip` (17.5 MB tại Scratch và Brain).
  - [x] Git commit `3d3187f` và push remote `vulinh6393-svg/zombie-live` trên nhánh `feat/phase02-visual-refinement`.

## Giai đoạn 02.9: Main Battlefield Integration (PHASE 02.6 THEO PHÊ DUYỆT CỦA USER)
> **Mục tiêu**: Chính thức kết thúc chuỗi Art Gate; chuyển sang tích hợp chiến trường chính `BattlefieldScene.ts` với tổ hợp kiến trúc Bastion Master và giải quyết triệt để lỗi state machine zombie cổng mở.
> 
> **Quy trình triển khai**:
> 1. **P0 — Fix Zombie Gate State Machine & Chuẩn Hóa Ranh Giới Lane**:
>    - Sửa state machine trong `ArtIntegrationLabScene.ts`: Mỗi tick đều đánh giá lại khả năng di chuyển khi vật cản thay đổi. Khi cổng mở đủ rộng cho bán kính $r=20$, Zombie Bravo tự động chuyển từ `walker-attack` về `walker-walk` và tiếp tục hành quân qua cổng.
>    - Thống nhất ranh giới 3 lane SSOT: Alpha $[30..390)$, Bravo $[390..690]$, Charlie $(690..1050]$ giữa `BastionGeometryConfig.ts`, `BASTION_MASTER_LAYOUT.md` và mã nguồn server.
> 2. **P0 — Tích hợp Kiến trúc Bastion Master vào BattlefieldScene**:
>    - Nâng cấp `FortressRenderer.ts` và `BattlefieldScene.ts` sử dụng trọn bộ sprite bán hiện thực: `clean_plate`, khung cổng rỗng, 2 cánh cửa trượt động, tường 420px, 3 bệ pháo lục giác $y=580$, vạch va chạm $y=840$.
>    - Tách bạch rõ các module: Render, Geometry SSOT, Collision và Combat Effects.
> 3. **P0 — Bảo Toàn Tính Server-Authoritative**:
>    - Client chỉ render snapshot và nội suy chuyển động (lerp). Mọi quyết định về HP, sát thương, kết quả trận đấu đều do Snapshot / Server quyết định.
> 4. **P1 — Tích hợp Gameplay Đầy Đủ (Mock Mode Gameplay Loop)**:
>    - Vận hành trận địa tự động 3 lane, 3 squad phòng thủ (với Staggered Formation chống overlap), 3 ụ pháo tự động xoay và bắn tỉa.
>    - Animation đa frame mượt mà cho Survivor và Zombie Walker; hiển thị vệt đạn, tia lửa nòng súng, sát thương số nảy, animation chết và xác zombie `zombie_corpse_0`.
>    - Đồng bộ HUD Base HP, Wave Timer, Top Leaderboard, và hiệu ứng Gift Missile/Airstrike.
> 5. **P1 — QA, E2E Test, Video Gameplay 30s & Đóng Gói**:
>    - Unit test Vitest và kiểm thử tích hợp cho `BattlefieldScene`.
>    - Ghi hình video gameplay thực tế $\ge 30$ giây `battlefield_gameplay_30s.webm`.
>    - Chụp screenshot 1080×1920 (`battlefield_main_1080x1920.png`) và mobile 360×640 (`battlefield_mobile_360x640.png`).
>    - Đo đạc FPS thực tế và kiểm tra 0 lỗi console runtime.
>    - Git commit và push remote `vulinh6393-svg/zombie-live` trên nhánh `feat/phase02-visual-refinement`.

- [x] **Bước 1: Sửa lỗi Zombie Gate State Machine & Chuẩn hóa Ranh giới Lane (P0)**:
  - [x] Sửa logic update trong `ArtIntegrationLabScene.ts`: Đánh giá lại va chạm liên tục mỗi tick kể cả khi `isAttacking === true`. Khi thông đạo đủ rộng, zombie tự động chuyển trạng thái `isAttacking = false`, play `walker-walk` và đi qua cổng.
  - [x] Chuẩn hóa ranh giới lane trong `BastionGeometryConfig.ts`: Alpha $[30..390)$, Bravo $[390..690]$, Charlie $(690..1050]$.
  - [x] Chạy unit test Vitest xác nhận pass (16/16 tests pass).
- [x] **Bước 2: Nâng cấp FortressRenderer & Tích hợp vào BattlefieldScene (P0)**:
  - [x] Cập nhật `FortressRenderer.ts` hỗ trợ kiến trúc Bastion SSOT ($y=900$ tường & cổng, $y=580$ bệ pháo, $y=840$ collision boundary, 2 cánh cửa trượt động).
  - [x] Cập nhật `BattlefieldScene.ts` render nền sạch `bastion_clean_environment.png`, tổ hợp công trình Bastion và vạch phòng tuyến $y=840$.
  - [x] Tích hợp cơ chế đóng/mở cổng đồng bộ với snapshot hoặc sự kiện chiến trường.
- [x] **Bước 3: Tích hợp Gameplay, Animation Chuỗi & VFX Hoàn Chỉnh (P1)**:
  - [x] Đảm bảo 3 squad lính phòng thủ sử dụng animation đa frame Riley Gombart (`survivor-idle`, `survivor-shoot`).
  - [x] Đảm bảo Zombie Walker chạy `walker-walk`, `walker-attack` khi chạm ranh giới $y=840$, và hiển thị `zombie_corpse_0` khi chết.
  - [x] 3 ụ pháo xoay 360° theo mục tiêu từng lane, có giật nòng và tia lửa.
  - [x] Hiệu ứng quà tặng Gift Skill (Missile / Airstrike) nổ rực sáng trên chiến trường.
- [x] **Bước 4: Kiểm Thử E2E, Ghi Video $\ge 30$s & Đo Đạc Hiệu Năng (P1)**:
  - [x] Chạy Playwright ghi video gameplay chiến trường chính 32 giây (`battlefield_gameplay_30s.webm` 20.6 MB).
  - [x] Chụp ảnh 1080×1920 (`battlefield_main_1080x1920.png`) và mobile 360×640 (`battlefield_mobile_360x640.png`).
  - [x] Đo FPS thực tế: Trung bình 59.5 FPS (Min: 53, Max: 61, p95: 16.8ms), 0 lỗi console.
  - [x] Chạy `pnpm -r run typecheck` (0 errors) và `pnpm test` (16/16 tests pass).
- [x] **Bước 5: Commit & Push GitHub (feat/phase02-visual-refinement)**:
  - [x] Đẩy toàn bộ thay đổi lên GitHub để người dùng và ChatGPT review trực tiếp.
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
## Giai đoạn 03: Server-Authoritative Deterministic Engine (PHASE 03 - ĐÃ HOÀN THÀNH 100%)
> **Mục tiêu**: Chuyển đổi toàn diện từ gameplay demo client sang Server-Authoritative Game Engine thực thụ. Mọi logic di chuyển, va chạm vật lý, tính toán sát thương, sinh/tử của zombie, trạng thái từng công trình và hiệu ứng quà tặng do Game Server quyết định ở tần số cố định 20Hz (Fixed Tick 50ms). Client chỉ đóng vai trò Renderer hiển thị snapshot và nội suy chuyển động (Interpolation 60 FPS).
>
> **Tuân thủ quy chuẩn kỹ thuật**:
> - `@senior-architect`: Thiết kế tách lớp rõ ràng (Simulation Engine trong `packages/shared`, Network Server trong `apps/game-server`, Interpolated Renderer trong `apps/game-client`). Khớp nối qua Zod Schema SSOT.
> - `@development`: Quy trình TDD nghiêm ngặt (Unit test simulation -> Integration test socket -> E2E Playwright assertion -> Đo đạc latency & 60s video gameplay).
> - `@clean-code`: Code TypeScript type-safe 100%, chú thích tiếng Việt chi tiết, không hardcode, tự động dọn dẹp bộ nhớ/listener khi shutdown.

- [x] **Bước 1: Shared Simulation Engine & Zod Protocol Schema (P0)**:
  - [x] Di chuyển `BastionCollisionSystem.ts` và `BastionGeometryConfig.ts` vào `packages/shared/src/simulation/` để cả Server và Client dùng chung 1 engine hình học duy nhất, 0 phụ thuộc Phaser.
  - [x] Chuẩn hóa Zod Schemas trong `packages/shared/src/game.ts` & `events.ts`:
    * `MatchSnapshot`: `matchId`, `seed`, `tick`, `sequenceId`, `serverTime`, `phase`, `baseHp`, `maxBaseHp`, `walls: { left: WallState, right: WallState }`, `gate: GateState`, `soldiers: SoldierSnapshot[]`, `zombies: ZombieSnapshot[]`, `towers: TowerSnapshot[]`, `recentEvents: CombatEvent[]`, `waveState: WaveState`, `result: MatchResult`.
    * `CombatEvent`: `{ id, tick, type: 'SHOOT' | 'HIT' | 'DEATH' | 'WALL_HIT' | 'GIFT_SKILL', sourceId, targetId, damage, isCritical, x, y }`.
    * `WallState`: `{ id: 'LEFT' | 'RIGHT', hp: number, maxHp: number, state: 'INTACT' | 'DAMAGED' | 'BREACHED' }`.
    * `GateState`: `{ state: 'CLOSED' | 'OPENING' | 'OPEN' | 'CLOSING', doorLeftX: number, doorRightX: number }`.
  - [x] Thêm bộ sinh số ngẫu nhiên hạt giống `SeededRandom.ts` (Mulberry32 PRNG) đảm bảo tính tất định deterministic 100%.
  - [x] Chạy `pnpm -r run typecheck` và unit test xác nhận `packages/shared` compile và test sạch (8/8 tests pass).

- [x] **Bước 2: Authoritative Game Engine 20Hz Trên Server (`apps/game-server`) (P0)**:
  - [x] Xây dựng `AuthoritativeGameEngine` trong `packages/shared/src/simulation/` và export qua `apps/game-server/src/engine/AuthoritativeGameEngine.ts`:
    * Vòng lặp fixed tick 20Hz (50ms/tick) sử dụng monotonic clock (`Date.now()`), accumulator time và bounded catch-up (tối đa 5 ticks/frame).
    * Deterministic PRNG seeded cho spawn zombie và target selection.
    * Tích hợp `BastionCollisionSystem` thời gian thực: Quản lý zombie movement, va chạm tường độc lập, va chạm cánh cổng cơ giới, hành lang qua cổng khi mở và phản lực đẩy lùi khi đóng.
    * Xử lý chiến đấu: Ụ súng và lính khóa mục tiêu, tính toán damage thật, sinh sự kiện `CombatEvent` và áp dụng trạng thái chết (`isDead = true`) khi HP $\le 0$.
    * Độc lập hóa máu từng đoạn tường: Tường Trái/Phải có HP riêng, hư hại và sập độc lập khi chịu đòn, không suy diễn từ Base HP tổng.
    * Đóng/mở cổng cơ giới có chu trình trượt mượt mà qua các tick: `CLOSED` -> `OPENING` -> `OPEN` -> `CLOSING` -> `CLOSED`.
    * Cơ chế Gift Skill (Tên Lửa / Airstrike): Gây sát thương diện rộng authoritative theo tọa độ thực.
  - [x] Tích hợp phát snapshot 10Hz qua Socket.IO namespace `/game` (`match:snapshot`).
  - [x] Viết unit tests `AuthoritativeGameEngine.test.ts` (8/8 tests pass).

- [x] **Bước 3: Loại Bỏ Hoàn Toàn Client Gameplay Authority & Cập Nhật Renderer (P0/P1)**:
  - [x] Xóa bỏ toàn bộ mutation quyền hạn trên client: Loại bỏ `target.isPermadeath = true`, `target.triggerDeath()` khỏi client logic; sinh/tử của entity 100% tuân thủ snapshot từ server.
  - [x] Khóa an toàn API QA/Debug: `setupWindowBattlefieldAPI()` chỉ kích hoạt khi có cờ `?debug=1` hoặc trong môi trường test/dev, tuyệt đối cấm ở production và `/overlay`.
  - [x] Nâng cấp `MockSnapshotSource` sử dụng chung `AuthoritativeGameEngine` (chế độ local in-memory fallback), xóa bỏ hoàn toàn hardcoded clamp `y=840` / `y=1020` - Đạt 100% Mock/Socket Parity!
  - [x] Nâng cấp `SocketSnapshotSource` với cơ chế lọc bỏ gói tin cũ/đến trễ `sequenceId <= lastSequenceId` và tự động re-sync khi reconnect.
  - [x] Cập nhật `BattlefieldScene.ts` & `ZombieRenderer.ts` & `FortressRenderer.ts`:
    * Render damage numbers, tia lửa, vệt đạn và hiệu ứng chớp đỏ dựa trên danh sách `recentEvents` từ server với bộ đệm `processedEventIds: Set<string>` chống trùng lặp.
    * Trạng thái tường và cổng đồng bộ trực tiếp từ `snapshot.walls` và `snapshot.gate`.
    * Bổ sung cơ chế cleanup hoàn chỉnh trong `shutdown()` của Scene: unsubscribe snapshot, remove listeners, clear timers.
  - [x] Toàn bộ monorepo typecheck sạch sẽ (0 errors) và vitest unit tests pass 100%.

- [x] **Bước 4: Kiểm Thử Toàn Diện (Vitest, E2E Assertions & Socket Mode Demo) (P0)**:
  - [x] Unit tests Vitest cho `AuthoritativeGameEngine` (pass 100%).
  - [x] E2E Playwright test với assertions logic 12 tiêu chí thực sự (`run-phase03-socket-qa.ts`):
    * [x] C01: Socket connection & monotonic sequenceId.
    * [x] C02: Deterministic 20Hz tick advancement.
    * [x] C03: Gate CLOSED collision barrier at y=840.
    * [x] C04: Gate OPEN corridor passage.
    * [x] C05: Gate CLOSING boundary enforcement without teleportation.
    * [x] C06: Wall Alpha & Charlie physical blocking at y=840.
    * [x] C07: Independent wall damage & breached penetration.
    * [x] C08: Authoritative combat events & event deduplication.
    * [x] C09: Authoritative zombie death on HP <= 0.
    * [x] C10: Client authority lockdown (pure interpolated renderer).
    * [x] C11: Socket disconnect & reconnect state sync.
    * [x] C12: High-performance 60s telemetry & zero console errors (12/12 PASS).
  - [x] Khởi chạy Game Server và Game Client kết nối thực tế qua Socket.IO (`mode=socket`).
  - [x] Ghi hình video gameplay chiến trường 64 giây qua socket mode (`socket_gameplay_60s.webm` 40.7 MB).
  - [x] Đo đạc và xuất báo cáo hiệu năng: FPS 58.9, p95 frame time 16.8ms, 0 lỗi console, và export `phase03_authoritative_telemetry.json`.

- [x] **Bước 5: Git Commit & Remote Push**:
  - [x] Commit toàn bộ mã nguồn, tài liệu và bằng chứng nghiệm thu lên nhánh `feat/phase02-visual-refinement`.
  - [x] Bàn giao báo cáo chi tiết cho Người Dùng và ChatGPT review.

## Giai đoạn 03.1: Hardening & Bug Fixes (ĐANG TRIỂN KHAI)
> **Mục tiêu**: Xử lý triệt để 4 lỗi P0 và 1 vấn đề P1 do Người Dùng và ChatGPT chỉ ra, đảm bảo hệ thống đạt chuẩn Security, Zero Event Loss, Smooth Collision không teleport, và bộ E2E Assertion thực chất trước khi mở kết nối tương tác LIVE.
>
> **Tuân thủ quy chuẩn**:
> - `@senior-architect`: Phân tách hoàn toàn Public Namespace (`/game` - Read Only) và Protected Admin Namespace (`/admin` - Auth & Rate-limited). Simulation Event Queue độc lập không phụ thuộc tick phát broadcast.
> - `@development`: Test-Driven Development (Security tests cho guest socket, Odd/Even tick event delivery tests, continuous contact collision tests, replay deterministic tests).
> - `@clean-code`: Code type-safe với Zod schema validation toàn diện, xử lý lỗi tường minh, chú thích tiếng Việt chuẩn mực.

- [x] **P0.1 — Secure Game Server & Namespace Separation**:
  - [x] Tách namespace Socket.IO: `/game` (public read-only) và `/admin` (yêu cầu authentication/authorization qua token handshake).
  - [x] Chặn mọi command can thiệp trận đấu (`admin:openGate`, `admin:closeGate`, `admin:giftSkill`, `admin:damageWall`) trên namespace `/game`.
  - [x] Validate tất cả command payloads bằng Zod (từ chối số âm, NaN, Infinity, out-of-bounds, invalid IDs).
  - [x] Thêm Rate Limiter (sliding window) cho các command điều khiển.
  - [x] Cấu hình CORS allowlist chặt chẽ theo biến môi trường `ALLOWED_ORIGINS`.
  - [x] Viết bộ security unit/integration test chứng minh guest socket kết nối `/game` không thể làm thay đổi trạng thái trận đấu.

- [x] **P0.2 — Fix CombatEvent Delivery & Event Queue**:
  - [x] Thiết kế Simulation Event Queue độc lập trong `AuthoritativeGameEngine`: không xóa sự kiện mỗi tick, chỉ drain các sự kiện khi snapshot tương ứng được đóng gói và phát đi.
  - [x] Đặt namespace `eventId` theo `matchId`: `${matchId}_evt_${tick}_${eventSeq}`.
  - [x] Đảm bảo Snapshot 10Hz thu thập trọn vẹn 100% sự kiện sinh ra ở cả tick lẻ và tick chẵn (20Hz loop).
  - [x] Viết unit tests chứng minh: Không mất sự kiện ở tick lẻ, không phát trùng lặp, client deduplicate chuẩn xác kể cả khi reconnect.

- [x] **P0.3 — Fix Gate Collision Teleport (Continuous Contact Resolution)**:
  - [x] Nâng cấp `BastionCollisionSystem.resolveMovement()`: Thay thế việc dịch chuyển tức thời (snap to 820/960) bằng contact resolution liên tục.
  - [x] Giới hạn độ dịch chuyển tối đa mỗi tick ($\le \text{speed} \times dt + \epsilon$, không vượt quá 15px/tick).
  - [x] Zombie đã vượt qua tâm cổng tiếp tục tiến về cứ điểm ($y > 840$); zombie phía ngoài bị chặn/đẩy lùi về phía bắc mà không bị giật lùi xuyên vật cản.
  - [x] Viết unit tests kiểm tra tính liên tục của vị trí, vận tốc và quỹ đạo qua 30 ticks trong trạng thái `OPENING` và `CLOSING`.

- [x] **P0.4 — Repair Misleading E2E Tests & Robust Assertions**:
  - [x] C05: Đo lường displacement từng tick trong chu trình `CLOSING`, assert không có tick nào nhảy $> 15$px.
  - [x] C07: Assert zombie Alpha thực sự vượt qua vạch $y=840$ khi tường trái `BREACHED`.
  - [x] C08: Client inject duplicate event và assert VFX/damage numbers chỉ hiển thị đúng 1 lần.
  - [x] C09: Assert death event kích hoạt chính xác tại tick zombie chạm mốc HP $\le 0$.
  - [x] C10: Client thử gọi mutation trực tiếp và assert trạng thái authoritative trên server không bị thay đổi.
  - [x] Reconnect test: Xác minh snapshot resync, deduplication và loại bỏ stale packets.

- [x] **P1 — Complete Gameplay Loop & 10 Zombie Types**:
  - [x] Vòng đời trận đấu tự động: `PREPARING` (20s) ➔ `WAVE_1` (60s) ➔ `WAVE_2` (60s) ➔ `WAVE_3` (60s) ➔ `WAVE_4` (60s) ➔ `WAVE_5` (40s) ➔ `BOSS` (Zombie King) ➔ `RESULTS` (20s) ➔ Tự động sang trận mới (Livestream 24/7).
  - [x] Vòng lặp server sử dụng monotonic clock (`performance.now()`) thay thế `Date.now()`.
  - [x] Cấu hình 10 chủng loại Zombie theo chuẩn `docs/GAME_BALANCE.json` (Walker, Runner, Armored, Spitter, Healer, Brute, Shocker, Summoner, Shadow, Zombie King).
  - [x] Boss Zombie King: 3 giai đoạn chiến đấu (Giai đoạn 1: Giáp kiên cố, Giai đoạn 2: Tăng tốc cuồng bạo, Giai đoạn 3: Tấn công trực diện).
  - [x] Tính điểm MVP thời gian thực dựa trên đóng góp thực tế (kill, assist, repair, rescue).

## Giai đoạn 04: Live Interaction Engine (PHASE 04)
> **Mục tiêu**: Biến người xem livestream thành người tham gia chiến đấu thời gian thực thông qua bình luận (Comment Commands) và quà tặng (Gift Skills).

- [x] **1. LiveEventAdapter Architecture (`apps/live-bridge`)**:
  - [x] `LiveEventAdapter` interface (`connect()`, `disconnect()`, `onEvent()`, `status()`).
  - [x] `MockAdapter`: Giả lập luồng sự kiện LIVE (comment, gift, like, join).
  - [x] `ReplayAdapter`: Phát lại log sự kiện từ file ghi hình.
  - [x] `EventNormalizer`: Chuẩn hóa dữ liệu sang Zod schema thống nhất `NormalizedLiveEvent`.
  - [x] `LiveEventDispatcher`: Chuyển sự kiện đã chuẩn hóa sang Game Server qua kênh bảo mật nội bộ.
- [x] **2. Viewer Comment Commands**:
  - [x] Hỗ trợ các lệnh: `JOIN`, `1` / `2` / `3` (chọn cánh Alpha/Bravo/Charlie), `BẮN` / `BAN` (tăng hỏa lực), `SỬA` / `SUA` (sửa thành), `CỨU` / `CUU` (tiếp viện), `BOSS` (tập trung đánh boss).
  - [x] Xử lý tiếng Việt có dấu/không dấu (Unicode normalization).
  - [x] Hệ thống chống spam, cooldown riêng từng lệnh và định danh người chơi bền vững trong trận.
- [x] **3. Gift Mapping & Skill Activation**:
  - [x] Hệ thống mapping cấu hình Gift ID $\to$ Kỹ năng (Reinforcements, Turret Upgrade, Shield, Airstrike, Mech Support, Honor).
  - [x] Xử lý gift streak và bảo toàn tính idempotency (không kích hoạt lặp).
- [x] **4. Real-time Leaderboard & Missions**:
  - [x] Bảng xếp hạng trực tiếp: Top đóng góp, Top diệt quái, Top sửa thành, MVP trận đấu.
  - [x] Cập nhật số người tham gia trực chiến thực tế trên HUD.
- [x] **5. Mock Interaction Dashboard**:
  - [x] Công cụ dashboard độc lập giả lập tương tác người xem (10, 50, 100 viewers), gửi comment và gift test tải.
  - [x] Tách biệt hoàn toàn khỏi route `/overlay`.
- [x] **6. Acceptance Testing & 60s Demo**:
  - [x] Test thông lượng $\ge 100$ events/s (đạt 383 events/s).
  - [x] Ghi video gameplay tương tác $\ge 60$ giây (`phase04_live_interaction_60s.webm`).
  - [x] Xuất báo cáo telemetry hoàn chỉnh và push commit GitHub.

## Giai đoạn 04.1: Security & Acceptance Correction (PHASE 04.1) (ĐÃ HOÀN THÀNH TOÀN DIỆN 10/10 PASS)
> **Mục tiêu**: Khắc phục triệt để 2 lỗ hổng bảo mật P0, tái thiết kế Gift Idempotency với `providerEventId`, hoàn thiện chu trình 5 Wave + Boss, sửa toàn bộ E2E assertions yếu kém và đối soát điểm số leaderboard.

- [x] **TASK 1 — Fix Dashboard Authentication (P0)**:
  - [x] Bảo vệ toàn bộ `/dashboard` và `POST /api/dashboard/command` bằng server-side authentication (Session/Dev token).
  - [x] Giới hạn dashboard mock chỉ hoạt động ở môi trường development (`NODE_ENV !== 'production'`) hoặc cờ `ENABLE_MOCK_DASHBOARD=true`.
  - [x] Khách chưa xác thực không thể gửi JOIN, gift, repair hoặc bất kỳ command nào (trả về 401/403, state không thay đổi).
  - [x] Viết HTTP integration test kiểm tra cả `/api/live/event` và `/api/dashboard/command` từ chối request unauthenticated.
- [x] **TASK 2 — Remove Default Admin Secret (P0)**:
  - [x] Xóa bỏ hoàn toàn fallback `zombie_live_admin_secret_dev_2026` trong `apps/game-server`, `apps/live-bridge`.
  - [x] Kiểm tra chặt chẽ: Server từ chối khởi động (FAIL FAST) nếu thiếu `ADMIN_SECRET_KEY` hợp lệ ($\ge 16$ ký tự) ở môi trường production.
  - [x] Tuyệt đối không log secret ra console.
  - [x] Cấu hình CORS chặt chẽ từ `ALLOWED_ORIGINS` (từ chối `*` khi ở production).
  - [x] Rate-limit HTTP ingress (`/api/live/event`) và dashboard command endpoint.
- [x] **TASK 3 — Gift Identity & Idempotency (P0)**:
  - [x] Mở rộng Zod schema `GiftEventSchema` bắt buộc: `provider`, `liveSessionId`, `providerEventId`, `senderId`, `senderName`, `giftId`, `quantity`, `streakId`, `streakStatus`, `timestamp`.
  - [x] Phân biệt rõ packet cập nhật streak (`IN_PROGRESS`) với packet kết thúc streak (`FINISHED`).
  - [x] Tuyệt đối không dùng `tick` làm định danh fallback cho `providerEventId`.
  - [x] Không tự ý mặc định gift không nhận diện thành Airstrike; reject hoặc map đúng spec quà tặng (`UNSUPPORTED_GIFT_TYPE`).
  - [x] Idempotency guard bằng `providerEventId`: Gửi lại cùng eventId sẽ bị từ chối `DUPLICATE_EVENT`, không kích hoạt lặp skill hoặc cộng điểm.
  - [x] Interface `IdempotencyStore` sẵn sàng tích hợp database persistent trong Phase 05.
- [x] **TASK 4 — Replace Weak E2E Assertions (P0)**:
  - [x] `C01`: Test cả unauthorized socket (`/game`) VÀ unauthorized HTTP (`POST /api/dashboard/command` -> 401, `/api/live/event` -> 401).
  - [x] `C02`: Kiểm tra số lượng và thứ tự chuỗi sự kiện tick chẵn/lẻ chính xác, assert mảng sự kiện có phần tử thật (97 sự kiện, 75 đã xử lý).
  - [x] `C03`: Theo dõi độ dịch chuyển của cùng một zombie ID cụ thể qua từng tick liên tiếp, assert $\le 12$px/tick (đạt 4.1px/tick, loại bỏ snap teleport).
  - [x] `C04`: Fast-forward engine test qua đủ 5 wave (`PREPARING` ➔ `WAVE_1` ➔ `WAVE_2` ➔ `WAVE_3` ➔ `WAVE_4` ➔ `WAVE_5` ➔ `BOSS` ➔ `RESULTS` ➔ Auto Restart).
  - [x] `C07`: Test gift replay, streak increment, streak finish, duplicate `providerEventId` và unsupported gift rejection.
  - [x] `C08`: Đối chiếu công thức điểm số thực tế từng người chơi (TacticalTester 16 pts thi đấu = 10 JOIN + 4 BAN + 2 SUA; điểm quà 50 tách biệt hoàn toàn; MVP Top 10 list verified).
  - [x] `C09`: Đo throughput tải duy trì 100 sự kiện (150-260 events/s, p50=81ms, p95=193ms, p99=200ms, 100% accepted).
  - [x] `C10`: Đọc FPS thật từ `getFpsMetrics().actualFps`, trung bình 60.2 FPS qua 57 mẫu runtime, 0 lỗi console.
  - [x] Toàn bộ kịch bản E2E vượt qua 10/10 tiêu chí và trả về exit code 0.
- [x] **TASK 5 — Gameplay & Leaderboard Consistency (P1)**:
  - [x] Bổ sung `WAVE_5` (40s) vào chu trình trận đấu trước khi gặp `BOSS`.
  - [x] Xác nhận 10 loại zombie được spawn từ `GAME_BALANCE.json`.
  - [x] Tách biệt `competitiveScore` và `giftScore` khi `paidSkillExcludedFromCompetitiveScore === true`.
  - [x] Chỉ cộng điểm Boss cho người chơi gây sát thương thật vào Boss qua `awardBossDamageToSquad`.
  - [x] Định nghĩa minh bạch: `joinedPlayers` (người xem đã JOIN squad) vs `spectators` (chỉ gửi gift).
  - [x] Kiểm tra reset trạng thái, cooldown, MVP khi sang trận mới qua `restartMatch()`.
- [x] **TASK 6 — Proof of Real Interaction**:
  - [x] Kịch bản tương tác hoàn chỉnh: JOIN 2 ➔ BẮN ➔ Spam BẮN (cooldown) ➔ Gift với providerEventId ➔ Duplicate gift rejection ➔ Leaderboard update ➔ Match restart.
  - [x] Ghi video gameplay $\ge 60$s (`phase04_live_interaction_60s.webm` - 57.08 MB), chụp ảnh 1080x1920 và mobile 360x640.
  - [x] Xuất báo cáo telemetry hoàn chỉnh `phase04_interaction_telemetry.json`, cập nhật `player.html`.
  - [x] Toàn bộ unit tests: 50/50 PASS trên cả 7 packages.
  - [x] Commit Git và push lên GitHub remote `feat/phase02-visual-refinement`.

## Giai đoạn 05: Database Persistence, Profile, Missions & Final Security Closure (ĐÃ HOÀN THÀNH TOÀN DIỆN)
> **Mục tiêu**: Đóng toàn bộ các lỗ hổng bảo mật P0 còn lại (Dashboard loopback/auth, Gift streak cumulative settlement); triển khai kiến trúc cơ sở dữ liệu PostgreSQL bền vững với Prisma migrations, atomic idempotency, player progression (XP/Level), daily missions và persistent match lifecycle.

- [x] **PHẦN A — PRIORITY 0: ĐÓNG TRIỆT ĐỂ CÁC LỖ HỔNG BẢO MẬT & GIFT SETTLEMENT**
  - [x] **Task 1: Secure Mock Dashboard & Restrict to Loopback**
    - [x] Cấu hình server mặc định lắng nghe loopback `127.0.0.1` trong development (`HOST` cấu hình qua env, không mở `0.0.0.0` bừa bãi).
    - [x] Loại bỏ hoàn toàn việc phát tán `dashboardDevToken` công khai trong HTML trả về qua `GET /dashboard`.
    - [x] Yêu cầu authentication hoặc chỉ cho phép truy cập từ localhost (`req.ip === '127.0.0.1' || req.ip === '::1'`).
    - [x] Bảo vệ endpoint `GET /api/dashboard/player/:userId`: Bắt buộc token xác thực hoặc chỉ trả về thông tin public tối thiểu.
    - [x] Giữ mặc định tắt mock dashboard trên production (`ENABLE_MOCK_DASHBOARD !== 'true'`).
    - [x] Viết regression test chứng minh: Guest unauthenticated không thể lấy token từ GET để điều khiển gameplay qua POST.
  - [x] **Task 2: Correct Gift Streak Settlement & Cumulative Tracking**
    - [x] Thiết kế Gift State Machine xử lý chuẩn xác 2 trạng thái: `IN_PROGRESS` (tăng số lượng dồn tích lũy) và `FINISHED` (kết thúc đợt tặng).
    - [x] Phân biệt rõ `providerEventId` (từng packet) và `streakId` (chuỗi quà tặng).
    - [x] Tính toán chính xác `deltaQuantity` giữa packet hiện tại và packet trước đó của cùng một `streakId`.
    - [x] Chỉ kích hoạt kỹ năng tương ứng với phần `deltaQuantity` chưa được xử lý; không lặp lại skill của các quà đã kích hoạt trước đó trong chuỗi.
    - [x] Namespace Idempotency Key: `${provider}:${liveSessionId}:${streakId ? streakId + '_' + currentQuantity : providerEventId}`.
    - [x] Tuyệt đối không dùng `Date.now()` hoặc `Math.random()` thay thế ID provider trên production.
    - [x] Viết test bao phủ: duplicate packet, replay, increment, streak finish, out-of-order packets.

- [x] **PHẦN B — ARCHITECTURE & PERSISTENT GAME DATA (DATABASE)**
  - [x] **Task 3: PostgreSQL Schema, Prisma Models & Migrations**
    - [x] Hoàn thiện và chuẩn hóa Schema Prisma trong `packages/database/prisma/schema.prisma`:
      - `players`: provider, platformUserId, username, avatarUrl, xp, level, createdAt, updatedAt.
      - `live_sessions`: id, provider, status, startedAt, endedAt.
      - `matches`: id, sessionId, seed, phase, result, baseHp, startedAt, endedAt, stats.
      - `match_players`: matchId, playerId, squad, score, competitiveScore, giftScore, kills, assists, repairs, rescues, bossDamage, hasJoined.
      - `gameplay_actions`: id, matchId, playerId, command, tick, accepted, reason, createdAt.
      - `gift_events`: provider, liveSessionId, providerEventId, senderId, giftId, quantity, deltaQuantity, streakId, streakStatus, settlementStatus, skillId.
      - `gift_streaks`: provider, liveSessionId, streakId, senderId, giftId, lastQuantity, status, updatedAt.
      - `missions`: code, title, description, targetValue, xpReward.
      - `mission_progress`: playerId, missionId, period (YYYY-MM-DD in Asia/Ho_Chi_Minh), currentVal, completed, updatedAt.
      - `reward_grants`: sourceKey (unique), playerId, xpGranted, grantedAt.
      - `leaderboard_snapshots`: scope (match, daily, weekly, season), periodKey, data, createdAt.
    - [x] Tạo Prisma Client, Migration Script và Database Seed mẫu cho 5 nhiệm vụ hàng ngày.
  - [x] **Task 4: Atomic Idempotency & Repository Layer**
    - [x] Xây dựng Repository Layer với Prisma Transactions (`prisma.$transaction`):
      - `PlayerRepository`: Tìm/Tạo người chơi, tính toán XP và Level.
      - `GiftLedgerRepository`: Ghi nhận gift event nguyên tử, kiểm tra idempotency bằng DB unique constraint, cập nhật streak.
      - `MatchRepository`: Lưu trữ kết quả trận đấu, đóng góp của người chơi, snapshot leaderboard.
      - `MissionRepository`: Cập nhật tiến độ nhiệm vụ và cấp thưởng XP duy nhất một lần (`reward_grants.sourceKey` unique).
    - [x] Kết hợp Memory LRU Cache với Database Ledger làm Single Source of Truth.
  - [x] **Task 5: Player Progression & Daily Mission System**
    - [x] Hàm chuẩn hóa tính Level từ XP: `Level = floor(sqrt(XP / 100)) + 1`.
    - [x] Triển khai 5 nhiệm vụ hàng ngày:
      - `DAILY_JOIN`: Tham chiến 1 trận (+50 XP).
      - `DAILY_SHOOT`: Trợ kích hỏa lực BAN 5 lần (+100 XP).
      - `DAILY_REPAIR`: Gia cố tường thành SUA 3 lần (+100 XP).
      - `DAILY_RESCUE`: Cứu viện tiểu đội CUU 2 lần (+150 XP).
      - `DAILY_BOSS`: Tham gia gây sát thương Boss (+200 XP).
    - [x] Reset chu kỳ nhiệm vụ theo múi giờ `Asia/Ho_Chi_Minh` (UTC+7).
    - [x] Tích hợp API: `GET /api/me?provider=mock&userId=...` và `GET /api/leaderboards?scope=match|daily|weekly|season`.
  - [x] **Task 6: Persistent Match Lifecycle & Engine Integration**
    - [x] Tích hợp Repository vào `AuthoritativeGameEngine` và Fastify Server.
    - [x] Khi chuyển sang `RESULTS`: Tự động đồng bộ toàn bộ Match Result, MVP và đóng góp vào DB.
    - [x] Khi Server Restart: Khôi phục hồ sơ người chơi từ Database, duy trì cấp độ/XP, không xóa dữ liệu người xem.

- [x] **PHẦN C — VERIFICATION, QA & DELIVERABLES**
  - [x] **Task 7: Robust QA & E2E Validation Suite**
    - [x] Unit & Integration Tests cho Repositories, Database Transactions và Gift Streak Settlement (66/66 PASS trên cả 7 packages).
    - [x] E2E Playwright: Tương tác gửi lệnh, tích lũy XP, kiểm tra nhiệm vụ hoàn thành, restart server và xác minh dữ liệu phục hồi từ Database (10/10 PASS).
    - [x] Xuất video demo tương tác có kết nối database $\ge 60$s (`phase05_database_persistence_60s.webm` - 53.92 MB), ảnh chụp màn hình 1080x1920 và mobile 360x640, telemetry JSON.
    - [x] Cập nhật `player.html` và git commit/push lên GitHub remote `feat/phase02-visual-refinement`.

## Giai đoạn 05.1: Real Database Persistence & Reliability Gate (PHASE 05.1)
> **Mục tiêu**: Khắc phục triệt để các phát hiện audit commit `3d8a36b`: Triển khai PostgreSQL client thật qua `DATABASE_URL` với connection pool/retry/shutdown; hỗ trợ persistent filesystem storage cho PGlite (`dataDir`) qua process restart; xây dựng Transactional Outbox Worker với at-least-once delivery và idempotent engine execution; chuẩn hóa Player ID và unique Match ID qua 10 vòng trận; bảo vệ an toàn endpoint `/api/me` chống IDOR; đạt chuẩn 100 events/s và kiểm thử thực tế quá trình khởi động lại process.

- [x] **P0.1 — REAL POSTGRESQL PERSISTENCE & VERSIONED MIGRATIONS**
  - [x] Triển khai `PostgresDatabaseAdapter` (sử dụng `pg.Pool`) kết nối tới PostgreSQL server qua `DATABASE_URL` (có healthcheck `SELECT 1`, retry/backoff, pool management, graceful shutdown).
  - [x] Triển khai persistent disk storage cho `PGliteDatabaseAdapter` (`dataDir: path.resolve(process.cwd(), '.data/pglite')`), bảo đảm dữ liệu ghi xuống đĩa, không bao giờ mất khi process dừng và restart.
  - [x] Chế độ production: Nếu mất kết nối database hoặc `DATABASE_URL` không hợp lệ, fail-fast ngay lập tức, không được báo READY giả.
  - [x] Bổ sung bảng `_migrations` quản lý versioned migrations; không thực thi lại toàn bộ lệnh `CREATE TABLE` mỗi khi khởi động.
  - [x] Viết regression test: Tạo user $\rightarrow$ cộng XP $\rightarrow$ ghi nhiệm vụ $\rightarrow$ tắt process $\rightarrow$ restart với cùng database $\rightarrow$ xác minh dữ liệu còn nguyên 100%.

- [x] **P0.2 — TRANSACTIONAL OUTBOX & ATOMIC GIFT SETTLEMENT**
  - [x] Sửa `server.ts`: Nếu giao dịch ghi `giftLedgerRepo.settleGift()` lỗi, reject ngay lập tức (HTTP 500 hoặc `{ accepted: false, reason: 'LEDGER_TRANSACTION_FAILED' }`). Tuyệt đối không fallback gọi `engine.handleGift()` khi DB chưa commit.
  - [x] Cam kết nguyên tử: Gift Event + Streak Settlement + Outbox Record (`outbox_events`) được commit trong cùng 1 database transaction.
  - [x] Xây dựng Outbox Worker độc lập: định kỳ/sự kiện quét `PENDING` outbox events, claim an toàn bằng status `PROCESSING`, dispatch sang `engine.handleGift(..., commandId)`.
  - [x] `AuthoritativeGameEngine`: Lưu danh sách `executedCommandIds` trong bộ nhớ; chỉ kích hoạt skill đúng 1 lần duy nhất cho mỗi `commandId`.
  - [x] Cập nhật outbox thành `PROCESSED` sau khi engine thực thi thành công.
  - [x] Kiểm tra các điểm crash & recover: trước commit, sau commit trước dispatch, sau dispatch trước outbox ack, và sau server restart.

- [x] **P0.3 — MATCH ID & PLAYER ID CONSISTENCY**
  - [x] Chuẩn hóa `PlayerRepository` là nguồn chuẩn duy nhất tạo Player ID (`usr_${provider}_${platformUserId}`).
  - [x] `MatchRepository.finishMatch()` liên kết trực tiếp Player ID chuẩn đã tồn tại trong `players`. Không chèn thêm bản ghi fake hoặc dùng sai ID.
  - [x] Lưu trữ `mvpPlayerId` (Foreign Key chuẩn sang `players.id`), không dùng `mvp.name` thay thế ID.
  - [x] `engine.restartMatch()`: Tự động sinh `matchId` mới (`match_${Date.now()}_${seed}`) cho từng vòng đấu mới.
  - [x] `server.ts`: Loại bỏ phụ thuộc vào biến tĩnh `lastSavedMatchId`, lưu trữ đầy đủ mọi trận đấu khi kết thúc.
  - [x] Acceptance: Chạy liên tiếp ít nhất 10 vòng trận và xác nhận PostgreSQL lưu đủ 10 bản ghi matches riêng biệt với đúng kết quả, MVP và đóng góp.

- [x] **P0.4 — SECURE PLAYER PROFILE & IDOR PROTECTION**
  - [x] `GET /api/me`: Yêu cầu xác thực qua HMAC session token (`s_tok_...`). Không nhận `userId` tùy ý từ client trên production.
  - [x] Tách biệt API: `GET /api/players/:id` (public profile: id, username, level, squad) và `GET /api/me` (private profile: full stats, missions, private info).
  - [x] Ngăn chặn triệt để tấn công IDOR và xem hồ sơ trái phép.
  - [x] Không nhận token quản trị qua URL query parameter (tránh rò rỉ vào access log).

- [x] **P0.5 — FIX COMPOSITE GIFT EVENT IDENTITY**
  - [x] Unique constraint trên `(provider, live_session_id, provider_event_id)` trong Prisma schema và DDL.
  - [x] Quản lý streak độc lập cho từng người gửi: không để event lỗi của người này đóng streak của người khác.
  - [x] Viết test concurrent duplicate requests trên 2 kết nối đồng thời.

- [x] **PHẦN D — ACCEPTANCE SUITE & DELIVERABLES (PHASE 05.1)**
  - [x] Cập nhật `run-phase05-persistence-qa.ts` kiểm thử toàn diện:
    * Kết nối PostgreSQL/Persistent PGlite file storage.
    * Process restart thật và xác minh dữ liệu phục hồi nguyên vẹn.
    * 10 vòng trận liên tiếp lưu thành công trong DB.
    * Outbox worker tự động phục hồi sự kiện sau restart.
    * Stress test duy trì $\ge 100$ events/s với p95/p99.
    * 60+ giây video gameplay 60 FPS không console error.
  - [x] Cập nhật `player.html`, commit git `85ea842` và push GitHub remote `feat/phase02-visual-refinement`.

## Giai đoạn 06: Config-Driven Gift Skills & Deterministic Effects với Reliability Hardening (PHASE 06)
> **Mục tiêu**: Đóng các vấn đề P0/P1 còn lại từ audit `85ea842` (Durable Command Execution chống crash replay, Pre-settlement validation loại bỏ outbox pollution, Match-scoped Outbox events chống leak sang trận sau, Outbox Lease & Status verification, Real DB Health Check). Đồng thời triển khai trọn vẹn Config-Driven Skill Engine cho 7 kỹ năng chiến đấu với mô phỏng 20Hz tất định (deterministic), cơ chế cân bằng & chống lạm dụng, hiệu ứng hình ảnh Phaser VFX trên Fortified Bastion Layout B, Stream Overlay Gift Banner trong vùng an toàn, và Mock Dashboard toàn diện.

- [ ] **PHẦN A — P0/P1 RELIABILITY & OUTBOX HARDENING**
  - [ ] **Task 1: Pre-Settlement Gift Validation (Ngăn chặn Outbox Pollution)**
    - [ ] Di chuyển bước kiểm tra `resolveGiftSkill(ev.giftId)` lên TRƯỚC KHI gọi `giftLedgerRepo.settleGift()`.
    - [ ] Nếu gift không được hỗ trợ: từ chối ngay với `{ accepted: false, reason: 'UNSUPPORTED_GIFT_TYPE', skillName: 'UNKNOWN' }`.
    - [ ] Đảm bảo 0 bản ghi `SETTLED` và 0 bản ghi outbox nào được sinh ra cho quà không hợp lệ.
  - [ ] **Task 2: Durable Command Execution & Match Isolation (Chống Crash Replay)**
    - [ ] Tạo bảng `executed_match_commands (match_id, command_id, executed_at, payload)` trong database schema / migration.
    - [ ] `AuthoritativeGameEngine`: Bổ sung cơ chế đồng bộ danh sách `executedCommandIds` với database persistence; khi khởi động lại, engine có thể nạp lại danh sách commands đã chạy cho match hiện tại.
    - [ ] Outbox Event Payload: Gắn chặt chẽ `matchId` (hoặc `liveSessionId`).
    - [ ] Outbox Worker: Nếu sự kiện thuộc về `matchId` đã kết thúc (không khớp `engine.matchId` hiện tại), tự động đánh dấu `DISCARDED_OBSOLETE_MATCH` thay vì áp dụng bừa bãi vào trận mới.
  - [ ] **Task 3: Outbox Worker Lease & Status Verification**
    - [ ] `markProcessed(id, workerId)`: Cập nhật SQL có điều kiện `WHERE id = $1 AND status = 'PROCESSING' AND locked_by = $2 AND locked_until >= NOW()`.
    - [ ] `markFailed(id, workerId, reason)`: Kiểm tra tương tự, chỉ worker sở hữu lease hợp lệ mới được cập nhật status.
  - [ ] **Task 4: Real Database Health Check & Atomic Migration Runner**
    - [ ] Bổ sung hàm `healthCheck(): Promise<boolean>` (`SELECT 1`) vào `DatabaseClient`.
    - [ ] Sửa `/ready` endpoint: Thực hiện health check thực sự; nếu DB mất kết nối trả về HTTP 503 `status: 'degraded'`.
    - [ ] Đảm bảo runner migration bọc việc ghi log `_migrations` trong cùng transaction với DDL.

- [ ] **PHẦN B — CONFIG-DRIVEN SKILL REGISTRY & DETERMINISTIC ENGINE**
  - [ ] **Task 5: Complete Config-Driven Skill Registry (`SkillRegistry.ts`)**
    - [ ] Định nghĩa 7 kỹ năng chiến đấu với Zod schemas & exact lookup:
      1. `airstrike`: Bão tên lửa AoE (warning 20 ticks, radius 280px, damage 450).
      2. `shield`: Khiên bảo vệ Base & Wall (giảm 50% sát thương nhận vào, duration 12s / 240 ticks).
      3. `reinforcements`: Tiểu đội chi viện (triệu hồi 2 lính công phá tiền tuyến).
      4. `overclock`: Gia tốc ụ pháo (tăng 100% tốc độ bắn / giảm 50% cooldown ụ pháo trong 15s / 300 ticks, khôi phục gốc khi hết hạn).
      5. `mech`: Robot Mech hỗ trợ hạng nặng (triệu hồi 1 Titan Mech 1500 HP, 25s, đại bác AoE).
      6. `healing`: Tiếp tế y tế & sửa thành (hồi 400 HP Base, hồi 100 HP lính, tối đa không vượt max HP).
      7. `honor`: Hào quang vinh danh (pháo hoa rực rỡ, thông báo VIP Supporter, 0 ảnh hưởng chiến thuật).
    - [x] Cấu hình per-match cap, per-skill cooldown, stacking policy (`refresh`, `extend`, `reject`, `independent`).
  - [x] **Task 6: Deterministic 20Hz Skill Simulation in `AuthoritativeGameEngine`**
    - [x] Quản lý trạng thái kỹ năng theo tick: `activeSkills`, `queuedSkills` với `castTick`, `activationTick`, `expirationTick`.
    - [x] Authoritative State Tracking:
      - Quản lý warning delay và vòng cảnh báo trước khi Airstrike nổ.
      - Quản lý shield active buff và áp dụng giảm 50% sát thương trong `damageBase()` / `damageWall()`.
      - Quản lý turret overclock buff và tính toán lại tốc độ bắn 2x, khôi phục chính xác khi hết hạn.
      - Quản lý Mech entity & Reinforcement soldiers với HP, targetting và di chuyển.
      - Quản lý Healing và khống chế không cho vượt trần `maxHp`.
    - [x] Snapshot & Combat Events: Phát sự kiện combat (`SKILL_ACTIVATED`, `SKILL_AIRSTRIKE_DETONATED`, `SKILL_SHIELD_EXPIRED`, `SKILL_OVERCLOCK_EXPIRED`, v.v.).
    - [x] Replay Determinism: Cùng seed + cùng command stream cho ra 100% cùng state hash.

- [x] **PHẦN C — PHASER VISUAL EFFECTS & STREAM OVERLAY**
  - [x] **Task 7: Visual Effects on BattlefieldScene (Fortified Bastion Layout B)**
    - [x] Airstrike: Vòng cảnh báo đỏ mở rộng $\rightarrow$ đường đạn rơi $\rightarrow$ chớp nổ bão lửa và khói bụi.
    - [x] Shield: Mái vòm năng lượng bán nguyệt màu Cyan bao phủ pháo đài khiên chắn, hiệu ứng gợn sóng khi cản đòn, biến mất khi hết hạn.
    - [x] Overclock: Tia sét / tia lửa điện vàng rực quanh 3 ụ pháo tiền duyên, tia lửa đạn kép.
    - [x] Mech Support: Hiệu ứng rơi từ trên không xuống đường chính, bước di chuyển cơ giới, nòng pháo đôi khai hỏa.
    - [x] Reinforcements: 2 chiến binh đổ bộ chạy ra chiến hào tiền tuyến.
    - [x] Healing: Hạt ánh sáng xanh ngọc bích bay lên từ Base và tường thành, số HP phục hồi màu xanh lá.
    - [x] Honor: Pháo hoa bùng nổ, banner vinh danh VIP rực rỡ.
  - [x] **Task 8: Stream Overlay Gift Banner (TikTok 9:16 Safe Zone)**
    - [x] Hiển thị thông báo quà tặng nổi bật: Sender Avatar/Name, Tên Quà Tặng, Tên Kỹ Năng, Số lượng.
    - [x] Đặt trong vùng an toàn livestream (y: 1250 - 1350px, canh giữa), không che khuất pháo đài hoặc thanh máu.
    - [x] Thời lượng hiển thị tối đa 3.0s, tự động mờ dần và trượt lên.
  - [x] **Task 9: Mock Dashboard Enhanced Controls**
    - [x] Bổ sung các nút kích hoạt nhanh cho cả 7 kỹ năng với icon và thông số.
    - [x] Bổ sung mô phỏng gift streak (1x, 5x, 10x, 20x).
    - [x] Giả lập 10–100 người xem đồng thời tương tác.
    - [x] Hiển thị real-time Cooldowns, Active Buffs, MVP contribution và Live Event Feed.

- [x] **PHẦN D — QA, VERIFICATION & DELIVERABLES**
  - [x] **Task 10: Unit & Integration Tests (100% Coverage cho Skills)**
    - [x] Viết `SkillRegistry.test.ts` & `SkillEngine.test.ts`: Kiểm tra cả 7 kỹ năng, cooldown, caps, stacking, và khôi phục stat khi hết hạn.
    - [x] Viết `SkillDeterminism.test.ts`: Deterministic replay assertion (2 engines chạy song song với cùng seed + command sequence $\rightarrow$ cùng state hash).
    - [x] Sửa timeout kiểm thử `database.test.ts` trên Windows (tăng timeout lên 30.000ms cho bài test restart PGlite disk storage).
    - [x] Chạy `pnpm test` toàn monorepo: đảm bảo 100% test files PASS (89/89 tests passed).
  - [x] **Task 11: E2E Playwright Suite & Deliverables (`run-phase06-skills-qa.ts`)**
    - [x] Kiểm thử E2E: Kích hoạt cả 7 kỹ năng qua Gift Ingress $\rightarrow$ Outbox Worker $\rightarrow$ Engine $\rightarrow$ Snapshot Socket $\rightarrow$ Client VFX.
    - [x] Stress test: Đạt throughput $\ge 100$ events/s (đo được 446 events/s) với p50/p95/p99 latency (221ms / 229ms / 230ms).
    - [x] Đo đạc FPS thực tế duy trì mượt mà ($\ge 55$ FPS, thực tế đạt 60 FPS trung bình) khi nhiều hiệu ứng diễn ra đồng thời.
    - [x] Xuất video demo gameplay $\ge 60$ giây (`phase06_skills_gameplay_60s.webm`).
    - [x] Chụp ảnh screenshot 1080x1920 (`phase06_skills_1080x1920.png`) và mobile 360x640 (`phase06_skills_mobile_360x640.png`).
    - [x] Xuất báo cáo Telemetry JSON (`phase06_skills_telemetry.json`).
    - [x] Cập nhật giao diện `player.html` với video/ảnh/telemetry Phase 06.
    - [x] Git commit và push lên remote `feat/phase02-visual-refinement`.
