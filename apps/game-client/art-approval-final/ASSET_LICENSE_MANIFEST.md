# BẢNG THỐNG KÊ BẢN QUYỀN VÀ GIẤY PHÉP TÀI NGUYÊN (ASSET LICENSE MANIFEST)

> **Dự án**: Zombie Đại Chiến: Thành Trì Cuối Cùng (2D 9:16 Server-Authoritative Live Defense Monorepo)  
> **Phiên bản hiệu chỉnh**: ART APPROVAL GATE — REVISED & VERIFIED  
> **Thời điểm cập nhật**: 2026-11-08  
> **Cam kết bản quyền**: 100% tài nguyên đồ họa được sử dụng có nguồn gốc xác minh rõ ràng, minh bạch giấy phép (CC0 1.0, CC-BY 3.0) và phân định chính xác nguồn gốc tác quyền của từng gói asset riêng biệt.

---

## I. Xác Minh Giấy Phép Chi Tiết Cho Từng Bộ Asset Nhân Vật

Dựa trên việc kiểm tra trực tiếp các trang phát hành gốc trên OpenGameArt và đối chiếu checksum/cấu trúc file thực tế trong `apps/game-client/public/assets/characters/`:

| Bộ Asset | Tác Giả | Tên Gói Nguyên Bản | Giấy Phép Xác Minh | Trang Nguồn (Source URL) | Tình Trạng Sử Dụng Trong Game |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Kẻ Địch Zombie Walker** | Riley Gombart | **Animated Top Down Zombie** | **CC0 1.0** *(Public Domain)* | [OpenGameArt: Animated Top Down Zombie](https://opengameart.org/content/animated-top-down-zombie) | Đang dùng 49 frames (`idle`, `move`, `attack`, `corpse`) |
| **Lính Sinh Tồn (Survivor)** | Riley Gombart | **Animated Top Down Survivor Player**| **CC-BY 3.0** *(Attribution)* | [OpenGameArt: Survivor Player](https://opengameart.org/content/animated-top-down-survivor-player) | Đang dùng 55 frames (`idle`, `move`, `shoot`, `reload`, `feet`) |
| **Bộ Zombie Khác (Tham Khảo)**| Riley Gombart | *Top Down Animated Zombie Set* | **OGA-BY 3.0** | [OpenGameArt: Top Down Zombie Set](https://opengameart.org/content/top-down-animated-zombie-set) | **KHÔNG DÙNG** (Gói riêng biệt, phân biệt rõ để tránh nhầm lẫn) |

> [!NOTE]
> **Hiệu chỉnh quan trọng**:
> - Trước đây báo cáo ghi chung cả hai gói của Riley Gombart là `CC-BY 3.0`.
> - Qua kiểm tra trang công bố chính thức của tác giả: Bộ **"Animated Top Down Zombie"** được tác giả hiến tặng vào phạm vi công cộng theo giấy phép **CC0 1.0 Universal**.
> - Bộ **"Animated Top Down Survivor Player"** được phát hành theo giấy phép **CC-BY 3.0** (Yêu cầu ghi công tác giả khi phân phối thương mại).

---

## II. Xác Minh Giấy Phép Nhóm Vũ Khí & Môi Trường (Kenney Assets)

| Asset ID | Tên File | Kích Thước | Vai Trò | Tác Giả & Gói | Giấy Phép | Nguồn Cung Cấp |
| :--- | :--- | :---: | :--- | :--- | :---: | :--- |
| **`turret_base`** | `turret_base.png` | 64×64 px | Bệ xoay ụ pháo 360° | Kenney Vleugels (Tower Defense) | **CC0 1.0** | [Kenney.nl](https://kenney.nl/assets/tower-defense-top-down) |
| **`turret_gun_dual`** | `turret_gun_dual.png` | 48×64 px | Nòng súng pháo kép | Kenney Vleugels (Tower Defense) | **CC0 1.0** | [Kenney.nl](https://kenney.nl/assets/tower-defense-top-down) |
| **`muzzle_flash`** | `muzzle_flash.png` | 64×64 px | Tia lửa đầu nòng súng | Kenney Vleugels (Top-Down Shooter)| **CC0 1.0** | [Kenney.nl](https://kenney.nl/assets/top-down-shooter) |
| **`hit_explosion`** | `hit_explosion.png` | 128×128 px | Khói lửa vụ nổ bộc phá | Kenney Vleugels (Top-Down Shooter)| **CC0 1.0** | [Kenney.nl](https://kenney.nl/assets/top-down-shooter) |
| **`bullet_tracer`** | `bullet_tracer.png` | 16×32 px | Vệt đạn phát quang | Kenney Vleugels (Tower Defense) | **CC0 1.0** | [Kenney.nl](https://kenney.nl/assets/tower-defense-top-down) |
| **`sandbags`** | `sandbags.png` | 128×64 px | Bao cát dã chiến phòng thủ | Kenney Vleugels (Top-Down Shooter)| **CC0 1.0** | [Kenney.nl](https://kenney.nl/assets/top-down-shooter) |
| **`barricade_barrier`**| `barricade_barrier.png`| 128×64 px | Rào cản sọc cam-trắng | Kenney Vleugels (Top-Down Shooter)| **CC0 1.0** | [Kenney.nl](https://kenney.nl/assets/top-down-shooter) |
| **`ammo_crate`** | `ammo_crate.png` | 64×64 px | Hòm đạn quân sự xanh rêu | Kenney Vleugels (Top-Down Shooter)| **CC0 1.0** | [Kenney.nl](https://kenney.nl/assets/top-down-shooter) |

---

## III. Nguồn Gốc và Quyền Sử Dụng Các Tác Phẩm Concept Art

Để đảm bảo tính trung thực và minh bạch tuyệt đối, không tự tuyên bố độc quyền khi chưa có căn cứ pháp lý:

| Tác Phẩm | Đường Dẫn File | Công Cụ Tạo Hình | Điều Khoản Sử Dụng (Usage Rights) | Ghi Chú & Vai Trò |
| :--- | :--- | :--- | :--- | :--- |
| **Master Environment Reference** | `bastion_master_environment.png` | Mô hình AI Imagen 3 thông qua pipeline `image-generator` của Antigravity | AI-Generated Conceptual Reference for Game Development | Bản tham chiếu kiến trúc chuẩn mực để định vị bố cục, hướng sáng và màu sắc công trình. |
| **Full Combat Reference (Normal & Gift)** | `combat_normal_unified_*.png`<br>`combat_gift_unified_*.png` | Hệ thống Composite đồ họa trực tiếp trên Master Environment (Playwright / Canvas 2D) | Internal Project Asset Composite | Ghép trực tiếp sprite thật của Riley Gombart, Kenney và VFX lên bản đồ chuẩn để kiểm tra tỷ lệ và trải nghiệm TikTok LIVE. |
| **Mẫu Thử Nghiệm Tách Nền** | `sample_isolated_assets.png` | Thiết kế đồ họa kỹ thuật số nội bộ có alpha trong suốt | Internal Production Prototype | Đo lường độ sạch của kênh alpha, viền biên và tỷ lệ trước khi mở rộng sprite sheet. |

---

## IV. Tuyên Bố Ghi Công Tác Quyền (Attribution Notice)

> *“Animated Top Down Survivor Player” by Riley Gombart is licensed under Creative Commons Attribution 3.0 (CC-BY 3.0).*  
> *“Animated Top Down Zombie” by Riley Gombart is dedicated to the public domain under Creative Commons Zero 1.0 Universal (CC0 1.0).*  
> *“Top-down Shooter” and “Tower Defense (Top-Down)” assets by Kenney (Kenney.nl) are dedicated to the public domain under Creative Commons Zero 1.0 Universal (CC0 1.0).*  
> *All concept art references and scene composites are created strictly as visual references and benchmarks for the Zombie Đại Chiến monorepo.*
