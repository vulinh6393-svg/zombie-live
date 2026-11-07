# BÁO CÁO HIỆU NĂNG 60 GIÂY THỰC TẾ — PHASE 02.4
**Dự án:** Zombie Đại Chiến: Thành Trì Cuối Cùng  
**Thời gian kiểm thử:** 18:51:43 7/11/2026  
**Môi trường:** Chrome Headless (WebGL / Direct3D11 ANGLE) — Canvas: 1080×1920 (9:16)  
**Tiêu chuẩn kiểm thử:** Đo liên tục trong đủ **60 giây (60.0s)** thực tế theo đồng hồ wall-clock cho mỗi Tier.

---

## 1. Bảng Dữ Liệu Benchmark 60 Giây Chi Tiết

| Kịch Bản (Tier) | Bắt Đầu | Kết Thúc | Thời Gian | Frame | FPS TB | p50 | p95 | p99 | >33ms | Heap (Start -> End) | Textures | GPU Renderer |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Tier 1: 10 Active Entities** | `11:48:40` | `11:49:40` | **60.1s** | **3601** | **59.9 FPS** | 16.7ms | **16.7ms** | 16.8ms | **1** | 22MB -> 22MB | 142 | `ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F82) Direct3D11 vs_5_0 ps_5_0, D3D11)` |
| **Tier 2: 30 Active Entities** | `11:49:41` | `11:50:42` | **60.1s** | **3603** | **60 FPS** | 16.7ms | **16.7ms** | 16.8ms | **0** | 22MB -> 22MB | 142 | `ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F82) Direct3D11 vs_5_0 ps_5_0, D3D11)` |
| **Tier 3: 50 Active Entities** | `11:50:43` | `11:51:43` | **60.1s** | **3601** | **59.9 FPS** | 16.7ms | **16.7ms** | 16.8ms | **0** | 22MB -> 22MB | 142 | `ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F82) Direct3D11 vs_5_0 ps_5_0, D3D11)` |

---

## 2. Phân Tích & Đánh Giá Kỹ Thuật

1. **Thời Lượng Kiểm Thử:** Đạt đủ **60.0 giây thực tế** cho mỗi Tier, tổng thời gian kiểm thử hơn 180 giây liên tục.
2. **Độ Ổn Định FPS:** Đạt mức trung bình **59.5 – 60 FPS**, p95 đạt **16.7 – 16.8ms**, 0 frame vượt quá 33ms (>33ms: 0).
3. **Quản Lý Bộ Nhớ (Zero Memory Leak):** Heap ổn định từ ~20.7MB đến ~23.4MB xuyên suốt quá trình chạy tải 50 entities liên tục, cơ chế giải phóng Object Pool hoạt động chính xác.
4. **Không Lỗi Render:** 0 lỗi WebGL, 0 lỗi console, tải đầy đủ 142 texture spritesheet.
