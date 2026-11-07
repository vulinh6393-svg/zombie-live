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

## ART APPROVAL GATE: Fortress Bastion Concept Art & Feasibility Analysis (ĐANG ĐỐI CHIẾU & CHỜ DUYỆT)
> [!IMPORTANT]
> **Quy định nghiêm ngặt từ User**:
> - Đóng gói 4 file concept PNG vào `zombie_art_approval_concepts.zip`.
> - Xuất bản tài liệu `docs/visual/ART_TO_SPRITE_FEASIBILITY.md` đánh giá tính khả thi kỹ thuật chi tiết.
> - KHÔNG crop trực tiếp vật thể từ ảnh concept phẳng khi chưa có alpha sạch.
> - KHÔNG sửa `BattlefieldScene.ts`, KHÔNG slice sprite và KHÔNG chuyển Phase 03.
> - Dừng lại để Người dùng trực tiếp đánh giá và nghiệm thu mỹ thuật.

- [x] **1. Cung cấp 4 File PNG Gốc & Đóng Gói ZIP Nghiệm Thu:**
  - [x] `fortress_concept_bastion_1080x1920.png`
  - [x] `fortress_concept_bastion_360x640.png`
  - [x] `combat_concept_bastion_1080x1920.png`
  - [x] `combat_concept_bastion_360x640.png`
  - [x] Đóng gói thành `zombie_art_approval_concepts.zip` (9.88MB) tại root và artifact dir.
- [x] **2. Bổ Sung Tài Liệu Kỹ Thuật ART_TO_SPRITE_FEASIBILITY.md:**
  - [x] Phân tích đối tượng có thể tách rời vs đối tượng dính nền, bóng đổ, ánh sáng.
  - [x] Khẳng định hiện trạng Source Layer (Single-layer flattened raster, không có PSD đa lớp; khẳng định cấm crop trực tiếp).
  - [x] Danh mục thành phần bắt buộc phải vẽ lại độc lập có kênh alpha sạch (12 sprite kiến trúc).
  - [x] Danh mục animation & trạng thái hư hại (damage states) cần bổ sung.
  - [x] Bảng kích thước (Dimensions) & Điểm neo (Origins) dự kiến trong Phaser.
  - [x] Nguồn gốc và bản quyền thực tế của từng asset.
- [x] **3. Cập nhật Artifact Viewer `player.html` với Link Tải Trực Tiếp File ZIP.**
- [x] **4. Dừng lại chờ User nghiệm thu mỹ thuật (Không sửa code, không slice sprite, không chuyển Phase 03).**

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
