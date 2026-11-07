# BÁO CÁO NGHIỆM THU ĐỊNH HƯỚNG MỸ THUẬT (ART APPROVAL GATE REPORT) — LAYOUT B: BASTION

> **Dự án**: Zombie Đại Chiến: Thành Trì Cuối Cùng (2D 9:16 Server-Authoritative Live Defense Monorepo)  
> **Giai đoạn**: ART APPROVAL GATE  
> **Branch**: `feat/phase02-visual-refinement`  
> **Thời điểm**: 2026-11-07  
> **Trạng thái**: Đã hoàn thành đối chiếu tài nguyên và sản xuất bộ Concept Art High-Fidelity; Đang dừng lại chờ User phê duyệt mỹ thuật trước khi code.

---

## I. Tóm Tắt Bối Cảnh & Mục Tiêu

Tại đợt đánh giá Phase 02.5, các cải tiến kỹ thuật nền tảng (Đồng hồ đếm ngược, Đồng bộ sự kiện tiêu diệt authoritative 10 ➔ 9 zombie, Đội hình 1 lính đại diện/lane, Tên lửa hành trình gift) đã được nghiệm thu kỹ thuật. Tuy nhiên, **chất lượng mỹ thuật của Thành Trì (Fortress) chưa được nghiệm thu**.

Người dùng đã chỉ rõ:
1. Các asset tạo ra bằng Canvas 2D script (`fillRect`, `stroke`, `roundRect`), dù đã xuất thành PNG trong suốt, về bản chất vẫn là các khối hình học phẳng với viền nét, không thể so sánh được với mức độ chi tiết và chất liệu tả thực của sprite nhân vật Survivor và Zombie do Riley Gombart thiết kế.
2. Chọn **Layout B: Fortified Bastion** (Tiền đồn quân sự độc lập với sân tiền duyên, tường bao 3 hướng, 2 tháp canh góc, 3 bệ pháo, sở chỉ huy boong-ke) làm hướng phát triển mỹ thuật chính thức.
3. Yêu cầu **DỪNG MỌI HOẠT ĐỘNG VIẾT CODE GAMEPLAY**, không sửa `BattlefieldScene.ts`, không chuyển sang Phase 03; tập trung hoàn thiện Concept Art và đối chiếu minh bạch tài nguyên.

---

## II. Báo Cáo Đối Chiếu Tài Nguyên & Làm Rõ Sai Lệch (Reconciliation)

### 1. Giải Trình Sự Khác Biệt Giữa 14 PNG Được Tạo và 12 Asset Được Liệt Kê
Tại Phase 02.5, script `generate-fortress-assets.ts` đã tạo ra **14 file PNG**:
- **12 file Môi trường Kiến trúc** được ghi vào `apps/game-client/public/assets/environment/fortress/`:
  `fortress_main_gate.png`, `fortress_gate_damaged.png`, `fortress_wall_left.png`, `fortress_wall_right.png`, `fortress_turret_platform.png`, `fortress_sandbags.png`, `fortress_barricade.png`, `fortress_ammo_storage.png`, `fortress_command_center.png`, `fortress_spotlight.png`, `fortress_floor.png`, `fortress_damage_vfx.png`.
- **2 file Kỹ năng / VFX** được ghi vào `apps/game-client/public/assets/vfx/`:
  `gift_missile.png` (Tên lửa hành trình) và `tactical_reticle.png` (Hồng tâm radar).

*Nguyên nhân gây nhầm lẫn trước đây*: Bản tóm tắt trước chỉ đưa 12 asset thành trì vào bảng thống kê kiến trúc và đặt 2 file còn lại ở mục kỹ năng, khiến người xem cảm thấy thiếu hụt 2 asset so với thông báo "Đã tạo 14 asset". Nay tài liệu `ART_ASSET_AUDIT.md` và `ASSET_LICENSE_MANIFEST.md` đã được đồng bộ hóa chi tiết 100%.

### 2. Phân Loại Toàn Bộ Asset Theo Bản Chất Kỹ Thuật & Thẩm Mỹ
- **Nhóm A — External Production Asset Packs (CC-BY 3.0 & CC0 1.0)**:
  - 55 frames Survivor Player (Riley Gombart - CC-BY 3.0): Hoạt ảnh vẽ tả thực 3D/2D, quần áo, súng trường, đổ bóng chân thực.
  - 49 frames Zombie Walker (Riley Gombart - CC-BY 3.0): Chi tiết cơ thể thối rữa, quần áo tả tơi, bước đi lảo đảo tự nhiên.
  - 11 sprites Vũ khí & Môi trường (Kenney - CC0 1.0): Ụ pháo kép, tia lửa, khói nổ, vệt đạn, bao cát, rào cản.
- **Nhóm B — Script-Generated Procedural PNGs (Canvas 2D Prototype)**:
  - 12 sprites Thành trì và 2 sprites Gift tạo bằng mã lệnh vẽ HTML5 Canvas.
  - *Đánh giá thực tế*: Là giải pháp kỹ thuật tạm thời (functional mock), có tính hình học cao, thiếu độ sần bê tông, vết nứt tự nhiên và độ chuyển màu phong hóa. Sẽ được thay thế bằng việc cắt sprite (slicing) từ Concept Art đã được duyệt.
- **Nhóm C — High-Fidelity Concept Art (Layout B: Bastion)**:
  - Hai tác phẩm concept art hoàn chỉnh ở độ phân giải 1080×1920 và bản thu nhỏ 360×640 nhằm định hình thẩm mỹ chuẩn mực cho game.
- **Nhóm D — Temporary Placeholders**:
  - Boss Zombie King (vector procedural prototype).

---

## III. Trình Bày Concept Art — Layout B: Fortified Bastion

### 1. Ảnh 1 — Concept Kiến Trúc Thành Trì (Fortress Standalone)
- **Đường dẫn file**:
  - Bản gốc 1080×1920: [fortress_concept_bastion_1080x1920.png](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/fortress_concept_bastion_1080x1920.png)
  - Bản mobile 360×640: [fortress_concept_bastion_360x640.png](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/fortress_concept_bastion_360x640.png)
- **Đặc điểm kiến trúc & Thẩm mỹ**:
  - **Mặt nền & Môi trường**: Quảng trường tiền đồn dã chiến bằng các phiến bê tông quân sự thời tiết, có các khe co giãn, vết rạn nứt tự nhiên, vết dầu loang cơ giới và vạch sơn vàng chevron cảnh báo an toàn.
  - **Tuyến rào cản tiền tiêu**: Chướng ngại vật thép gai cuốn tròn (concertina wire) và răng rồng bê tông (dragon's teeth) phân luồng kẻ địch thành 3 hành lang tiếp cận rõ rệt.
  - **Cổng thép Heavy Blast Gate**: Đúc từ thép tấm hạng nặng dập gân kim loại nổi khối 3D, hệ thống 2 pít-tông thủy lực hai bên, sọc phản quang vàng-đen hazard, ổ khóa trung tâm tích hợp đèn tín hiệu.
  - **Tường thành & Tháp canh**: Tường bê tông cốt thép dày dặn có vát cạnh 3D bevels, lỗ châu mai hướng ra ngoài và bóng đổ đổ dài chân thực. Hai tháp canh góc tròn (corner redoubts) gia cố bằng bao cát dã chiến và đèn pha rọi công suất lớn.
  - **Khu vực phòng thủ & Hậu cần**: 3 bệ pháo xoay lục giác cơ khí lắp đặt sau chiến lũy; phía sau là boong-ke chỉ huy bọc giáp kiên cố có chảo ăng-ten vệ tinh, các cụm hòm đạn gỗ xanh rêu và thùng nhiên liệu dã chiến.
  - **Không chứa nhân vật, zombie hay HUD** — Thể hiện thuần túy không gian mỹ thuật của tiền đồn Bastion.

---

### 2. Ảnh 2 — Concept Trận Chiến Toàn Cảnh (Full Combat Live)
- **Đường dẫn file**:
  - Bản gốc 1080×1920: [combat_concept_bastion_1080x1920.png](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/combat_concept_bastion_1080x1920.png)
  - Bản mobile 360×640: [combat_concept_bastion_360x640.png](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/combat_concept_bastion_360x640.png)
- **Diễn biến chiến đấu trực quan**:
  - **Bầy Zombie Walker**: 8–10 cá thể zombie với hình thể thối rữa, quần áo tả tơi đang tràn qua 3 cửa phễu của chiến lũy tiền tiêu, tạo áp lực mãnh liệt lên tuyến phòng thủ.
  - **3 Lính phòng thủ đại diện**: Đội hình 3 Soldier đứng so le chiến thuật (Staggered V-line), nâng súng trường khai hỏa uy lực, hoàn toàn đồng bộ với tạo hình của Riley Gombart.
  - **Ụ pháo tự động Sentry Turrets**: 3 bệ pháo kép khai hỏa đồng loạt với luồng lửa đầu nòng (muzzle flash) rực sáng và các vệt đạn tracer phát quang lao vút về phía kẻ địch.
  - **Tác động sát thương (Hit FX)**: Zombie hàng đầu bị trúng đạn tạo hiệu ứng giật lùi, tia máu văng và khói lửa.
  - **Cao trào Kỹ năng Gift — Cruise Missile Airstrike**:
    - Hồng tâm radar đỏ rực khóa chặt tọa độ cụm zombie trung tâm.
    - Tên lửa chiến thuật lao xuống theo đường chéo tạo vệt khói lửa phản lực.
    - Vụ nổ bộc phá cực đại với quả cầu lửa rực sáng và vòng sóng xung kích (shockwave ring) quét sạch vùng giao tranh.
  - **Giao diện HUD TikTok LIVE tối giản**:
    - Header đỉnh: Đồng hồ đếm ngược `01:58`, Thanh máu Thành trì `95% HP` sắc nét.
    - Góc trên phải: Mini Leaderboard top người ủng hộ.
    - Khu vực trung tâm: 100% chiến trường thoáng đãng, không bị che khuất bởi chữ debug hay thanh máu thừa thãi.
    - Dưới cùng: Khung bình luận kêu gọi hành động TikTok nằm gọn trong vùng an toàn (Safe Zone).

---

## IV. Bảng Đối Chiếu Thẩm Mỹ Giữa Procedural Script và Concept Art

| Yếu Tố Thị Giác | Phase 02.5 (Script Canvas PNGs) | Concept Art Mới (Layout B: Bastion) | Đánh Giá Cải Thiện |
| :--- | :--- | :--- | :--- |
| **Bố Cục Bản Đồ** | Tuyến đường cao tốc đơn điệu kéo dài | Tiền đồn quân sự biệt lập, tường bao 3 hướng, có chiều sâu không gian | Đột phá về bối cảnh phòng thủ |
| **Chất Liệu Tường** | Khối xám phẳng viền nét đen stroke | Bê tông phong hóa, gờ nổi 3D, lỗ châu mai, vết nứt bê tông và bóng đổ | Đạt chuẩn tả thực semi-realistic |
| **Cổng Căn Cứ** | Khối chữ nhật dập gân đơn giản | Cổng thép cơ giới hạng nặng dập khối, pít-tông thủy lực cơ khí, đèn cảnh báo | Vững chãi, mang tầm vóc pháo đài |
| **Ụ Pháo & Tháp Canh** | Bát giác phẳng, nòng súng nhỏ | 2 Tháp canh góc gia cố bao cát + 3 Bệ pháo nâng cao có tia lửa muzzle rực rỡ | Điểm nhấn phòng thủ hoành tráng |
| **Đồng Bộ Nhân Vật** | Lính & Zombie nổi bật dị biệt so với nền | Nhân vật hòa hợp hoàn hảo vào ánh sáng, màu sắc và độ nhám của môi trường | Đồng nhất thẩm mỹ 100% |
| **Trải Nghiệm TikTok LIVE** | Khó tạo sự cuốn hút khi xem lướt qua | Trận chiến rực lửa, hiệu ứng nổ shockwave mãn nhãn, thu hút người xem giữ mắt | Sẵn sàng cho livestream tương tác |

---

## V. Trình Xem Trực Tiếp Trên Trình Duyệt

Bộ sản phẩm nghiệm thu đã được tích hợp vào công cụ xem trực quan:
- **Trang xem tương tác Artifact**: [player.html](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/player.html)
  - Hỗ trợ chuyển đổi nhanh giữa Tab **Concept Art Bastion** và Tab **Video Gameplay Phase 02.5**.
  - Xem trực tiếp bản full-size 1080×1920 và bản mô phỏng màn hình điện thoại 360×640.

---

## VI. Cam Kết & Kế Hoạch Tiếp Theo (Chờ Phê Duyệt Của Người Dùng)

1. **Cam kết tuân thủ**:
   - Hoàn toàn KHÔNG sửa đổi mã nguồn gameplay hoặc `BattlefieldScene.ts` trong lượt này.
   - Hoàn toàn KHÔNG chuyển sang Phase 03.
   - Giữ nguyên toàn bộ 13/13 unit tests pass và server Vite dev server hoạt động ổn định.
2. **Hành động tiếp theo sau khi Người Dùng phê duyệt Concept Art**:
   - **Bước 1**: Cắt (slice) các thành phần kiến trúc từ bản Concept Art được duyệt thành các modular sprite riêng biệt (Cổng chính, tháp canh góc, bệ pháo, tường thành, kho đạn, boong-ke chỉ huy).
   - **Bước 2**: Đóng gói atlas / sprite sheet tối ưu cho WebGL renderer.
   - **Bước 3**: Cập nhật `FortressRenderer.ts` và `BattlefieldScene.ts` để hiển thị tiền đồn Bastion chuẩn theo Concept Art.
   - **Bước 4**: Kiểm tra hiển thị trên mobile 360×640 và đo hiệu năng 60 FPS trước khi bàn giao.
