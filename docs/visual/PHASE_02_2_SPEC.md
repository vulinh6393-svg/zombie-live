# Đặc Tả Kỹ Thuật Phase 02.2: Real Sprite Asset & Animation Replacement

## 1. Mục Tiêu & Phạm Vi
Giai đoạn này thay thế toàn bộ hình học procedural/vector đơn giản bằng asset sprite thật và hệ thống Animation Manager chuẩn của Phaser 3, tập trung xây dựng một **Quality Lab** hoàn hảo trước khi nhân rộng ra toàn bộ chiến trường.

---

## 2. Nguồn Asset & Tình Trạng Bản Quyền

| Bộ Asset | Trạng Thái & Nguồn Gốc | Đánh Giá Khả Thi & Quyền Sử Dụng | Giải Pháp Áp Dụng |
| :--- | :--- | :--- | :--- |
| **SmallScaleInt HD 8-Dir Zombie Pack** | Trả phí trên itch.io ($19.99 - $39.99)<br>Link: `https://smallscaleint.itch.io/zombie-pack-hd` | Cần thanh toán bản quyền thương mại và người dùng thao tác mua. Không có link tải tự động công khai. | Báo cáo người dùng nguồn link; không sử dụng khi chưa có file mua bản quyền. |
| **Sova Digital Free Zombie Office Worker** | Mẫu miễn phí trên itch.io (cần web modal)<br>Link: `https://sova-digital.itch.io/free-zombie-office-worker-top-down-8-direction-sprite-hd` | Phụ thuộc vào cơ chế anti-bot và phiên đăng nhập trình duyệt web của itch.io. | Báo cáo nguồn link phục vụ mở rộng trong tương lai. |
| **OpenGameArt Animated Top Down Zombie & Survivor (Riley Gombart)** | Công khai, kiểm tra được trực tiếp PNG.<br>Source: OpenGameArt.org / GitHub `varunparbhakar/Project-115` | **Hợp lệ 100%:**<br>- Zombie: CC0 1.0 Universal (Public Domain)<br>- Survivor: CC-BY 3.0 / CC0<br>- Đầy đủ spritesheet khung hình đi bộ, tấn công, tử trận. | **Asset chính thức cho Phase 02.2** |
| **Top-down Defense Barriers & Boss (Panzer Soldat)** | Công khai kiểm tra được file PNG.<br>Source: Project-115 / OpenGameArt | Đầy đủ sprite rào chắn gỗ/kim loại, đạn, đốm lửa đầu nòng và boss. | **Asset công trình & trùm cho Phase 02.2** |

---

## 3. Kiến Trúc Màn Quality Lab (`/quality-lab`)
Màn Quality Lab là môi trường cô lập để nghiệm thu từng chuyển động và tương tác thị giác với độ chi tiết cao nhất:

1. **Zombie Walker (Top-Down Animated):**
   - Spritesheet: 17 frames walking cycle, 9 frames attacking cycle, Corpse0 death sprite.
   - Phaser Animations:
     - `walker-walk`: 17 fps, lặp vô tận.
     - `walker-attack`: 12 fps, vung tay cào cấu về phía mục tiêu.
     - `walker-hit`: Hiệu ứng chớp đỏ (tint 0xff3333) + giật lùi nhẹ (knockback 4px).
     - `walker-die`: Chuyển sang Corpse0 + vệt máu loang, mờ dần sau 3 giây.
2. **Survivor Soldier (AR Tactical):**
   - Spritesheet: 20 frames moving cycle kèm súng trường carbine, animation bắn súng.
   - Phaser Animations:
     - `soldier-move`: 18 fps, bước chân phối hợp xoay thân súng.
     - `soldier-shoot`: Đốm lửa nòng súng (muzzle flash) + hiệu ứng giật nòng.
     - `soldier-idle`: Nhịp thở sẵn sàng chiến đấu.
3. **Tháp Phòng Thủ (Defense Turret):**
   - Thân tháp gắn chặt trên bệ đá kiên cố.
   - Nòng pháo xoay bám theo góc zombie mục tiêu (`rotation = angleBetween`).
   - Hiệu ứng bắn: Nòng giật lùi (recoil tween), đầu nòng phát tia lửa, phóng viên đạn thực.
4. **Căn Cứ & Rào Chắn (Fortress & Barricades):**
   - Barricade sprite gỗ và kim loại che chắn trước căn cứ.
   - Tường thành có texture gạch đá sẫm màu, gắn đèn cảnh báo nhấp nháy.
5. **Đạn & VFX Phản Ứng:**
   - Đạn vàng vạch đường bay (projectile bullet).
   - Số sát thương nảy lên (floating damage text).
   - Vết máu/bụi va chạm tại điểm trúng đạn.

---

## 4. Tối Ưu Độ Rõ Trên Điện Thoại (360×640) & Squad Grouping
- **Kích thước nhân vật:** Điều chỉnh scale để kích thước thực tế hiển thị trên canvas đạt từ 64px đến 96px, đảm bảo trên màn 360×640 người xem vẫn nhìn rõ đầu, thân, súng và chuyển động chân tay.
- **Squad Grouping lính:** Thay vì vẽ đồng thời 40 lính đè lên nhau, hệ thống gom lính theo tiểu đội (Squad Alpha, Bravo, Charlie) và chỉ render 3-5 đại diện tinh nhuệ đứng ở các chòi gác/vị trí chiến lược kèm huy hiệu quân số (ví dụ: `[x10]`, `[x15]`).
- **Boss Zombie King:** Sử dụng sprite thiết giáp Panzer Soldat cỡ lớn (128×128px), silhouette có giáp vai và vũ khí nặng, phân biệt hoàn toàn với zombie thường.

---

## 5. Tái Thiết Kế Chiến Trường (Battlefield Environment)
- Giảm thiểu khoảng trống vô nghĩa bằng các mảng texture đường đất, cát, vết bánh xe, thùng đạn, rào thép gai và chướng ngại vật.
- Tập trung 65% hoạt động tác chiến vào khu vực phòng thủ trung tâm - nơi đặt rào chắn và tầm bắn của tháp.
- Bố trí lại HUD:
  - Header: Top (y: 40 - 180)
  - MVP Mini Leaderboard: Góc phải (x: 820, y: 200, rộng 230, cao 180)
  - Gift Alert: Trung tâm (y: 420 - 480) - không chồng lên MVP
  - Boss Bar: Xuất hiện độc lập tại y: 190 và tự động đẩy các panel phụ xuống.

---

## 6. Điều Tra & Đo Lường Hiệu Năng Thực Tế (FPS Benchmark)
- **Xác định nguyên nhân gốc rễ:** Đo sự khác biệt giữa Chromium Headless (SwiftShader CPU rasterizer) và trình duyệt Chrome thật có GPU Acceleration.
- **Tiêu chuẩn đo lường:**
  - Chạy benchmark ghi nhận ít nhất 600 frames trên Chrome thật.
  - Ghi nhận: GPU Renderer, WebGL Vendor, FPS trung bình, Min FPS, Frame Time (ms), Heap Memory (MB).
  - Yêu cầu ổn định trên 50-60 FPS với số lượng entity tiêu chuẩn của trận đấu.

---

## 7. Sản Phẩm Nghiệm Thu Cần Cung Cấp
1. `quality_lab_1080x1920.png`: Ảnh sắc nét toàn cảnh màn Quality Lab.
2. `quality_lab_360x640.png`: Ảnh kiểm tra khả năng đọc trên điện thoại độ phân giải thấp.
3. `character_contact_sheet_real.png`: Bảng tổng hợp sprite và frame animation thật của Zombie Walker, Survivor, Boss Panzer và Turret.
4. Clip video 10–20 giây (`quality_lab_demo.webm`): Quay chuyển động thực tế (Walk -> Attack -> Shoot -> Hit -> Death).
5. File manifest bản quyền và đường dẫn file PNG thật trên ổ đĩa.
6. Báo cáo kết quả kiểm thử: `typecheck`, `test`, `build` và log benchmark FPS.
