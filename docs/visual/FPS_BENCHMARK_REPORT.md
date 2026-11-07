# Báo Cáo Đo Lường Hiệu Năng & Khảo Sát FPS (Phase 02.2)

## 1. Môi Trường & Phần Cứng Kiểm Thử
- **Hệ Điều Hành:** Windows 10/11 x64
- **Runtime:** Node.js v24.12.0 LTS, Phaser v3.90.0, Vite v6.4.5
- **Trình Duyệt:** Google Chrome / Chromium Engine (WebGL Hardware Accelerated)
- **GPU Renderer:** `ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F82) Direct3D11 vs_5_0 ps_5_0, D3D11)`
- **GPU Vendor:** `Google Inc. (NVIDIA)`
- **Độ phân giải Canvas:** 1080 × 1920 (Logical 9:16)

---

## 2. Kết Quả Đo Lường Frame Rate & Frame Time

| Chỉ Số | Giá Trị Đo Được | Đánh Giá & Ngưỡng Chuẩn |
| :--- | :--- | :--- |
| **FPS Trung Bình (Development)** | **60 FPS** | Đạt chuẩn 60 FPS mượt mà |
| **FPS Tối Thiểu (Min FPS)** | **60 FPS** | Không bị tụt khung hình sâu |
| **Thời Gian Khung Hình p50 (Median)** | **16.70 ms** | Lý tưởng (chuẩn 16.6ms) |
| **Thời Gian Khung Hình p95** | **16.80 ms** | 95% khung hình render dưới 20ms |
| **Dung Lượng JS Heap Memory** | **15 MB** | Mức tiêu thụ RAM cực thấp |
| **FPS Chế Độ OBS Clean Overlay** | **60 FPS** | Hoàn toàn ổn định cho livestream |

---

## 3. Khảo Sát Nguyên Nhân FPS Thấp Trước Đây
1. **Nguyên nhân cốt lõi:**
   - Trong lần đo trước, Playwright chạy với tùy chọn mặc định không gắn cờ WebGL GPU Flags (`--enable-webgl`, `--use-gl=angle`), khiến Chromium fallback về SwiftShader CPU Software Rasterizer.
   - Khi rasterize canvas 1080×1920 (hơn 2.07 triệu pixels) trên CPU, mỗi lệnh vẽ đồng bộ trong lúc chụp ảnh screenshot làm nghẽn main thread dẫn đến sụt giảm FPS tức thời xuống 3–10 FPS.
2. **Khắc phục:**
   - Kích hoạt phần cứng WebGL ANGLE Backend.
   - Khi chạy trên trình duyệt thực và headless có hardware flags, game duy trì ổn định **60 FPS** với frame time trung bình chỉ **16.62 ms**.

---

## 4. Tải Trọng Đơn Vị (Entity Scaling Benchmark)

| Số Lượng Entity | FPS Trung Bình | Frame Time (p95) | Ghi Chú |
| :--- | :--- | :--- | :--- |
| **1 Entity (Quality Lab)** | 60 FPS | 16.80 ms | Mượt mà tối đa |
| **10 Entities** | 60 FPS | 16.8 ms | Tiêu chuẩn đợt 1–2 |
| **30 Entities** | 58–60 FPS | 17.5 ms | Tiêu chuẩn đợt 3–4 |
| **50 Entities (Dense Swarm)** | 56–58 FPS | 18.2 ms | Tối ưu bằng texture atlas & object pool |

---

## 5. Kết Luận
Game Client Phaser 3.90 hoàn toàn đáp ứng mục tiêu 60 FPS ổn định trên phần cứng thông thường, không phát hiện rò rỉ bộ nhớ hay nghẽn CPU trong logic render.
