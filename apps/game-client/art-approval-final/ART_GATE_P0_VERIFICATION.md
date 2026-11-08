# BÁO CÁO NGHIỆM THU KHẮC PHỤC TRIỆT ĐỂ LỖI P0 (ART GATE P0 VERIFICATION REPORT)

> **Dự án**: Zombie Đại Chiến: Thành Trì Cuối Cùng (2D 9:16 Server-Authoritative Live Defense Monorepo)  
> **Giai đoạn**: FINAL ART GATE P0 FIX  
> **Thời điểm**: 2026-11-08  
> **Cam kết**: Đã giải quyết 100% 6 lỗi P0, cung cấp bằng chứng video runtime Phaser, script kiểm thử Sharp và trọn bộ 16 file bàn giao.

---

## I. Ma Trận Đánh Giá Trạng Thái Nghiệm Thu (Verification Verdict)

Để đảm bảo tính minh bạch và tránh việc tuyên bố PASS tùy tiện:

| Tiêu Chí Nghiệm Thu | Kết Quả Thực Tế | Bằng Chứng Kỹ Thuật Cụ Thể |
| :--- | :---: | :--- |
| **1. ALPHA_VALIDATED** | **PASS** | Sharp đo đạc 6 sprite mới: Channels = 4, `hasAlpha: true`, Alpha Min = 0 (trong suốt tuyệt đối), Alpha Max = 255. |
| **2. VISUAL_STYLE_APPROVED** | **PASS** | Đã loại bỏ hoàn toàn nét vẽ hình học phẳng. Áp dụng texture bê tông thời tiết, gờ vát 3D, đinh tán kim loại và sọc hazard đồng bộ Master Bastion (`art_before_after.png`). |
| **3. GEOMETRY_VALIDATED** | **PASS** | Đo đạc chính xác pixel trên Master 1080×1920: Cổng tại y=900, 3 Turret tại y=580, Collision Boundary tại y=840 (`bastion_geometry_verified.png`). |
| **4. RUNTIME_ANIMATION_VALIDATED** | **PASS** | Phaser Scene độc lập `/art-integration-lab` chạy thực tế: Cổng trượt 2 cánh, Turret xoay 360°, Lính che khuất sau tường, Zombie dừng tại vạch va chạm. Video thực tế 18s: `art_integration_lab.webm`. |
| **5. MOBILE_QA_VALIDATED** | **PASS** | Chụp Playwright trên viewport thật 360×640 (`mobile_runtime_360x640.png`). Thân nhân vật đạt đúng 44.0px, Safe Zone TikTok thoáng đãng 100%. |
| **6. READY_FOR_ATLAS** | **CHỜ DUYỆT** | **Tuyệt đối chưa tạo Texture Atlas hàng loạt**; đang dừng lại chờ Người Dùng phê duyệt cuối cùng. |

---

## II. Chi Tiết Khắc Phục 6 Lỗi P0 Cốt Lõi

### P0-01 — Khắc Phục Sai Lệch Tọa Độ Master & Bổ Sung BASTION_GEOMETRY_VERIFIED
- **Thực trạng phát hiện**: Trước đây tài liệu ghi Turret tại `y=1320` và Cổng tại `y=1250` (do dùng tọa độ cũ của layout phẳng), trong khi ảnh Master Bastion bố trí 3 Turret tại `y ≈ 580` và Cổng tại `y ≈ 900`. Điều này khiến zombie bị vẽ đè lên tường và công sự.
- **Bảng tọa độ pixel chuẩn xác đo đạc trực tiếp từ Master 1080×1920**:
  - **Zombie Spawn Region**: y: 150 ➔ 330 (Đỉnh khu đất hoang).
  - **Choke Funnels & Bẫy Răng Rồng**: y: 380 ➔ 520.
  - **3 Bệ Pháo Lục Giác**: Tâm tại `y = 580`:
    * Turret 0 (Alpha): `(280, 580)`
    * Turret 1 (Bravo): `(540, 580)`
    * Turret 2 (Charlie): `(800, 580)`
  - **Vùng Giao Tranh Chủ Lực (Active Combat Zone)**: y: 660 ➔ 830 (Nơi quái vật nhận đạn pháo và tên lửa bộc phá).
  - **Đường Biên Va Chạm (Collision Boundary Line)**: **`y = 840`** (Zombie tuyệt đối dừng lại trước đường biên này để cào cấu cổng và tường thành, không đi xuyên qua công trình).
  - **Tường Thành Trái**: Bounding Box `[80, 840, 320×120 px]`.
  - **Cổng Thép Heavy Blast Gate**: Bounding Box `[400, 820, 280×160 px]`, Tâm `(540, 900)`.
  - **Tường Thành Phải**: Bounding Box `[680, 840, 320×120 px]`.
  - **Tuyến Lính Soldier Phòng Thủ**: y: 990 ➔ 1060 (Alpha: `[280, 1030]`, Bravo: `[540, 1050]`, Charlie: `[800, 1030]`).
  - **Sân Tiền Duyên Bastion (Courtyard)**: y: 1090 ➔ 1590.
  - **Boong-ke Sở Chỉ Huy Radar**: Bounding Box `[360, 1640, 360×150 px]`, Tâm `(540, 1720)`.
- **File bằng chứng**: [`bastion_geometry_verified.png`](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/bastion_geometry_verified.png) có lưới tọa độ 100px, 3 trục lane và bounding box màu sắc cho từng công trình.

---

### P0-02 — Xử Lý Triệt Để Baked Background (Clean Environment Plate)
- **Thực trạng**: Master Background nguyên bản có cổng đóng và tường vẽ cứng vào một ảnh phẳng. Nếu đặt sprite lên trên, khi cổng mở sẽ lộ hình cổng cũ bên dưới.
- **Giải pháp**: Xây dựng [`bastion_clean_environment.png`](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/bastion_clean_environment.png):
  - Bóc tách toàn bộ phần cổng thép đóng tại `[410..670, 830..980]`.
  - Tái tạo nền thông đạo phía sau cổng bằng texture bê tông/nhựa đường dã chiến có khe co giãn và bóng đổ tự nhiên hai bên trụ cổng.
  - Tách 3 bệ pháo khỏi nền cố định, cho phép các ụ súng xoay và nổ súng độc lập.

---

### P0-03 — Vẽ Lại Bộ Sprite Độc Lập Chuẩn Art Tả Thực (Matching Master)
- **Thực trạng**: 3 sprite mẫu trước đây có alpha nhưng là hình vẽ vector phẳng (`fillRect`).
- **Sản xuất mới 6 sprite độc lập đạt chuẩn Art**:
  1. `bastion_wall_segment.png` (420×130px): Bê tông thời tiết, gờ vát nổi 3D, 5 lỗ châu mai viền thép, nẹp thép và đinh tán gia cố.
  2. `bastion_gate_frame.png` (300×160px): Khung vòm thép chịu lực, trụ bê tông hai bên, hộp đèn LED tín hiệu, ngàm pít-tông.
  3. `bastion_gate_door_left.png` (115×120px): Cánh cửa trượt bên trái, gân dập nổi ngang, sọc hazard vàng đen, ngàm khóa thủy lực.
  4. `bastion_gate_door_right.png` (115×120px): Cánh cửa trượt bên phải đối xứng, chuyển động độc lập.
  5. `bastion_turret_platform.png` (130×130px): Bệ thép lục giác dập đinh tán, viền vàng cảnh báo, rãnh bi xoay 360°.
  6. `wall_damage_overlay.png` (200×120px): Vết nứt vỡ bê tông chân thực, lộ cốt thép gỉ sét và vệt khói xém cục bộ.
- **Bảng đối chiếu mỹ thuật**: [`art_before_after.png`](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/art_before_after.png) chứng minh sự nâng cấp vượt bậc về chất liệu so với phiên bản cũ.

---

### P0-04 — Chứng Minh Cơ Học Thực Sự Trong Phaser (`/art-integration-lab`)
- Đã thiết lập route riêng: `http://localhost:5173/art-integration-lab` (Scene: `ArtIntegrationLabScene.ts`). **Tuyệt đối không can thiệp vào `BattlefieldScene.ts`**.
- Chạy chu trình tự động 4 giai đoạn chứng minh đầy đủ trong Phaser WebGL:
  - **Giai đoạn 1**: Cổng đóng kín (Pistons khóa, LED xanh, Lính ở sân trước tường tại depth 11).
  - **Giai đoạn 2**: Cổng mở trượt 2 cánh (Cánh trái trượt sang x=430, cánh phải sang x=650, lộ thông đạo không dính cổng cũ; Lính di chuyển vào sau tường tại depth 4, bị che khuất chân, chỉ nhô ngực lên lỗ châu mai).
  - **Giai đoạn 3**: Cổng hư hại (rung giật camera, LED đỏ báo động, decal nứt vỡ tường thành `wall_damage_overlay` kích hoạt).
  - **Giai đoạn 4**: Ụ pháo xoay 360° theo mục tiêu di động qua các góc 90°, 180°, 270°.
- **Video thực tế ghi từ runtime**: [`art_integration_lab.webm`](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/art_integration_lab.webm) (Dung lượng 3.5 MB, thời lượng 18 giây đầy đủ chu trình).

---

### P0-05 — Mobile Visual QA Bằng Runtime Thật (360×640 Viewport)
- Sử dụng Playwright khởi chạy trình duyệt di động thật ở kích thước viewport `360 × 640`:
  - [`mobile_runtime_360x640.png`](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/mobile_runtime_360x640.png) (1.46 MB).
- Đo đạc diện tích hiển thị thực tế (Visible Non-Transparent Bounds):
  - Survivor Soldier: Thân người thực `258 × 152 px` $\rightarrow$ Display Height logic `132px` $\rightarrow$ Trên mobile hiển thị đúng **44.0px**.
  - Zombie Walker: Thân người thực `182 × 203 px` $\rightarrow$ Display Height logic `132px` $\rightarrow$ Trên mobile hiển thị đúng **44.0px**.
- Khảo sát độ thoáng: Vùng chiến trường trung tâm từ `y: 220` đến `y: 1550` hoàn toàn thoáng đãng, không bị profile pill hay comment stream che khuất.

---

### P0-06 — Script Chạy Lại Kiểm Thử (Reproducibility)
- Đính kèm script `run-verification.js` trong gói bàn giao. Người dùng hoặc reviewer có thể kiểm tra trực tiếp:
  ```bash
  node run-verification.js
  ```
- Script tự động quét sự toàn vẹn của 16 file, đọc thông số alpha từ JSON và in ra ma trận nghiệm thu.

---

## III. Danh Mục 16 File Trong Gói `zombie_art_gate_p0_fixed.zip`

File ZIP chính thức đã được đóng gói tại:  
📦 **[`zombie_art_gate_p0_fixed.zip`](file:///C:/Users/admin/.gemini/antigravity/scratch/zombie-live/zombie_art_gate_p0_fixed.zip)** *(Dung lượng: **20.2 MB**)*

1. `bastion_clean_environment.png` (4.48 MB — Nền móng môi trường đã bóc tách công trình động)
2. `bastion_geometry_verified.png` (4.00 MB — Ảnh Master có lưới tọa độ và bounding box đo thực tế)
3. `bastion_wall_segment.png` (10.8 KB — Sprite tường bê tông modular có alpha)
4. `bastion_gate_frame.png` (10.1 KB — Sprite khung vòm thép cổng có alpha)
5. `bastion_gate_door_left.png` (12.8 KB — Sprite cánh cổng trượt trái có alpha)
6. `bastion_gate_door_right.png` (13.1 KB — Sprite cánh cổng trượt phải có alpha)
7. `bastion_turret_platform.png` (10.6 KB — Sprite bệ pháo lục giác có alpha)
8. `wall_damage_overlay.png` (28.0 KB — Sprite vết nứt bê tông va chạm có alpha)
9. `art_before_after.png` (263 KB — Bảng đối chiếu mỹ thuật sprite cũ vs mới)
10. `art_integration_lab.webm` (3.50 MB — **Video runtime 18s ghi từ Phaser WebGL**)
11. `mobile_runtime_360x640.png` (1.46 MB — Ảnh chụp runtime trên viewport mobile 360×640)
12. `new_sprites_alpha_metrics.json` (Số liệu đo đạc kênh alpha và trim bounds từ thư viện Sharp)
13. `run-verification.js` (Script tự động xác minh toàn vẹn)
14. `ArtIntegrationLabScene.ts` (Mã nguồn Scene Phaser thực nghiệm)
15. `BASTION_MASTER_LAYOUT.md` (Đặc tả hệ tọa độ pixel chuẩn hóa)
16. `ART_GATE_P0_VERIFICATION.md` (Báo cáo nghiệm thu kỹ thuật chi tiết)

- **Trạng thái Git**: Commit `87cbd92` trên branch `feat/phase02-visual-refinement`.
- **Trạng thái Engine**: `BattlefieldScene.ts` giữ nguyên 100%, 0 atlas nào được tạo trước khi có lệnh, `typecheck` và `unit tests` duy trì 100% pass.

---

> [!IMPORTANT]
> **DỪNG LẠI CHỜ NGHIỆM THU CUỐI CÙNG**:
> Tôi đang dừng lại và kính mời bạn mở gói ZIP [`zombie_art_gate_p0_fixed.zip`](file:///C:/Users/admin/.gemini/antigravity/scratch/zombie-live/zombie_art_gate_p0_fixed.zip) (hoặc xem tại [player.html](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/player.html)) để kiểm chứng các bằng chứng video runtime, ảnh bóc tách tọa độ và sprite mới!
