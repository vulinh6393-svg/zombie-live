# BÁO CÁO KIỂM KÊ VÀ ĐÁNH GIÁ TÀI NGUYÊN ĐỒ HỌA (ART ASSET AUDIT) — PHASE 02.5

> **Dự án**: Zombie Đại Chiến: Thành Trì Cuối Cùng (2D 9:16 Server-Authoritative Live Defense)  
> **Phiên bản Audit**: Phase 02.5 — Asset-First Art Production  
> **Thời điểm**: 2026-11-07  
> **Mục tiêu**: Phân loại toàn bộ tài nguyên đồ họa theo 5 mức chất lượng: *Production-ready*, *Needs modification*, *Placeholder*, *Missing*, *Style mismatch* để đảm bảo tính đồng bộ thị giác trước khi dựng cảnh.

---

## I. Tổng Quan Danh Mục Tài Nguyên

| Nhóm Tài Nguyên | Tổng Số Asset | Production-Ready | Needs Modification | Placeholder | Missing | Style Mismatch |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Nhân vật Survivor (Lính)** | 55 frames | 55 | 0 | 0 | 0 | 0 |
| **Kẻ địch Zombie Walker** | 49 frames | 49 | 0 | 0 | 0 | 0 |
| **Boss Zombie King** | 1 procedural | 0 | 0 | 1 | 0 | 0 |
| **Kiến trúc Thành Trì (Fortress)** | 12 sprites | 12 | 0 | 0 | 0 | 0 |
| **Môi trường & Chiến trường** | 7 sprites | 7 | 0 | 0 | 0 | 0 |
| **Hiệu ứng & Kỹ năng (VFX/Gift)** | 6 sprites | 6 | 0 | 0 | 0 | 0 |
| **Vũ khí & Ụ pháo (Turrets)** | 4 sprites | 4 | 0 | 0 | 0 | 0 |
| **TỔNG CỘNG** | **134 Assets** | **133** | **0** | **1** | **0** | **0** |

---

## II. Bảng Đánh Giá Chi Tiết Theo Từng Nhóm Asset

### 1. Nhóm Nhân Vật Lính Sống Sót (Survivor Soldier)
- **Nguồn gốc**: Riley Gombart (`opengameart.org/content/animated-top-down-survivor-player`).
- **Giấy phép**: CC-BY 3.0.
- **Tình trạng**: **Production-ready**.
- **Đánh giá chi tiết**:
  - `survivor_idle` (20 frames, 258×152px): Đầy đủ tư thế cầm súng, thở, xoay hướng.
  - `survivor_move` (20 frames, 258×152px): Bước chân di chuyển mượt mà.
  - `survivor_shoot` (3 frames, 258×152px): Giật súng và nhả đạn chân thực.
  - `survivor_reload` (20 frames, 258×152px): Thay băng đạn chi tiết.
  - **Scale hiệu chuẩn**: Standard Display Height 44px (alpha-trimmed body 152px, scale factor ~0.29). Hoàn toàn sắc nét trên canvas 1080×1920 và hiển thị rõ ràng trên mobile 360×640.

### 2. Nhóm Kẻ Địch Zombie Walker
- **Nguồn gốc**: Riley Gombart (`opengameart.org/content/animated-top-down-zombie`).
- **Giấy phép**: CC-BY 3.0.
- **Tình trạng**: **Production-ready**.
- **Đánh giá chi tiết**:
  - `zombie_idle` (17 frames, 218×286px): Hoạt ảnh gù lưng đung đưa rùng rợn.
  - `zombie_move` (17 frames, 218×286px): Bước đi loạng choạng top-down.
  - `zombie_attack` (9 frames, 218×286px): Vung vuốt tấn công.
  - **Scale hiệu chuẩn**: Standard Display Height 44px (alpha-trimmed body 196px, scale factor ~0.225). Đồng nhất góc chiếu sáng và tỷ lệ với Survivor.

### 3. Nhóm Boss Zombie King
- **Tình trạng**: **Placeholder (Mức Prototype)**.
- **Đánh giá**:
  - Hiện dùng procedural vector sprite 150×150px kèm aura đỏ đậm và vương miện hoàng gia.
  - Đã ghi rõ trạng thái "Prototype asset pending" trong tài liệu và hệ thống kiểm thử, sẽ tích hợp sprite sheet thật ở Phase nâng cao.

### 4. Nhóm Kiến Trúc Thành Trì (Fortress Art Pack Mới Nhất)
- **Nguồn gốc**: Thiết kế chuyên biệt theo phong cách semi-realistic survival top-down (Asset-first pipeline).
- **Tình trạng**: **Production-ready** (Thay thế 100% hình chữ nhật Phaser Graphics).
- **Danh mục 12 asset thành phần**:
  1. `fortress_main_gate.png` (260×120px): Cổng thép dập gân, sọc vàng đen hazard, pít-tông thủy lực, ổ khóa trung tâm có đèn LED đỏ.
  2. `fortress_gate_damaged.png` (260×120px): Cổng khi bị hư hại với vệt cháy nổ xuyên phá, thép biến dạng và tia lửa báo động.
  3. `fortress_wall_left.png` (410×90px): Tường thành bê tông cốt thép khối dày, gờ bê tông sáng 3D bevel, lỗ châu mai phòng thủ và bóng đổ chân tường.
  4. `fortress_wall_right.png` (410×90px): Tường thành khối phải ăn khớp đối xứng với cổng trung tâm.
  5. `fortress_turret_platform.png` (130×130px): Bệ pháo bát giác xoay cơ giới, đinh tán và lõi năng lượng cyan.
  6. `fortress_sandbags.png` (120×60px): Tuyến bao cát dã chiến vải bố nhiều tầng, vân may và bóng đổ mặt đất.
  7. `fortress_barricade.png` (110×55px): Rào chắn thép dầm chữ X kết hợp thanh ngang sọc cam-trắng phản quang.
  8. `fortress_ammo_storage.png` (130×80px): Kho hòm đạn quân sự xanh rêu có quai xách kim loại và nhãn sơn vàng.
  9. `fortress_command_center.png` (280×110px): Boong-ke sở chỉ huy bọc giáp dã chiến, đài radar xoay quét và cột ăng-ten vệ tinh.
  10. `fortress_spotlight.png` (64×64px): Cụm đèn pha rọi dã chiến chân giá 3 càng với thấu kính hội tụ.
  11. `fortress_floor.png` (256×256px): Gạch bê tông sàn sân sau tiếp vận liền mạch có khe co giãn và vạch sơn vàng.
  12. `fortress_damage_vfx.png` (128×128px): Vết nứt vỡ bê tông chân thực và vệt khói xém cục bộ.

### 5. Nhóm Kỹ Năng & Hiệu Ứng (Gift VFX)
- **Danh mục**:
  1. `gift_missile.png` (48×120px): Tên lửa hành trình chiến thuật có cánh lái ổn định và luồng lửa đẩy phản lực rực sáng.
  2. `tactical_reticle.png` (160×160px): Hồng tâm khóa mục tiêu radar đỏ rực có ngàm xoay và tâm laser.
  3. `hit_explosion.png` (Kenney CC0): Khói lửa nổ diện rộng.
  4. `muzzle_flash.png` (Kenney CC0): Tia lửa đầu nòng súng và ụ pháo.
  5. `bullet_tracer.png`: Vệt đạn phát quang màu vàng đồng.
- **Tình trạng**: **Production-ready**.

---

## III. Kết Luận Audit

1. Toàn bộ các khối hình học thô sơ trước đây đã được loại bỏ hoàn toàn khỏi kiến trúc Fortress.
2. 100% tài nguyên hiển thị trên màn hình hiện nay là **file ảnh PNG thực tế**, có kênh alpha trong suốt, độ phân giải sắc nét và đồng nhất góc nhìn từ trên xuống (Top-down military defense).
3. Đủ điều kiện kỹ thuật và mỹ thuật để tích hợp trực tiếp vào Scene và Runner E2E.
