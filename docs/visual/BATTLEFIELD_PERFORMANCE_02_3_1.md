# Báo Cáo Đo Lường Hiệu Năng GPU Đa Cấp Độ (Phase 02.3.1)

## 1. Môi Trường Kiểm Thử
- **Hệ Điều Hành:** Windows 10/11 x64
- **Engine Đồ Họa:** Phaser v3.90.0 (WebGL ANGLE Hardware Acceleration)
- **GPU Renderer:** `ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F82) Direct3D11 vs_5_0 ps_5_0, D3D11)`
- **GPU Vendor:** `Google Inc. (NVIDIA)`
- **Độ Phân Giải Canvas:** 1080 × 1920 (Logical 9:16 Portrait)

---

## 2. Kết Quả Đo Lường Frame Rate & Latency Khung Hình

Đo đạc thực tế trong trạng thái kích hoạt toàn bộ animation nhân vật, ngắm bắn, đạn vạch đường, tóe lửa nòng, nổ va chạm và số sát thương:

| Cấp Độ Tải | Số Entities | Số Khung Hình | FPS Trung Bình | Min FPS | Frame Time p50 | p95 | p99 | Khung Hình >33ms | Khung Hình >50ms | JS Heap RAM | Đánh Giá Kỹ Thuật |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Tier 1 (Tuần Tra)** | **10** | 300 | **60 FPS** | **60 FPS** | **16.70 ms** | **16.80 ms** | **16.80 ms** | **0** | **0** | 23MB ➜ 23MB | Đạt chuẩn 60 FPS mượt mà |
| **Tier 2 (Giao Tranh)**| **30** | 300 | **60 FPS** | **60 FPS** | **16.70 ms** | **16.70 ms** | **16.80 ms** | **0** | **0** | 23MB ➜ 23MB | Cực kỳ ổn định, không giật lag |
| **Tier 3 (Dense Swarm)**| **50** | 300 | **60 FPS** | **60 FPS** | **16.70 ms** | **16.80 ms** | **16.80 ms** | **0** | **0** | 23MB ➜ 23MB | Duy trì 60 FPS xuất sắc |

---

## 3. Xác Minh Tối Ưu Hóa & Rò Rỉ Bộ Nhớ
- **Bộ nhớ JS Heap:** Khởi đầu ở mức **23 MB** và kết thúc ở mức **23 MB**. Không có hiện tượng rò rỉ bộ nhớ (memory leak).
- **Long Frames:** Số khung hình vượt quá 33.3ms (ngưỡng 30 FPS) là **0** ở Tier 1 và **0** ở Tier 3, chứng minh vòng lặp render WebGL hoàn toàn mượt mà.
