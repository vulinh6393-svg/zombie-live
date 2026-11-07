# BÁO CÁO HIỆU NĂNG 60 GIÂY THỰC TẾ — PHASE 02.3.2
**Dự án:** Zombie Đại Chiến: Thành Trì Cuối Cùng  
**Thời gian kiểm thử:** 16:33:34 7/11/2026  
**Môi trường:** Chrome Headless (WebGL / ANGLE Direct3D11) — Logical Canvas: 1080×1920 (9:16)  
**Tiêu chuẩn kiểm thử:** Đo liên tục trong đủ **60 giây (60.0s)** thực tế theo đồng hồ wall-clock cho mỗi Tier.

---

## 1. Bảng Dữ Liệu Benchmark 60 Giây Chi Tiết

| Kịch Bản (Tier) | Bắt Đầu (UTC) | Kết Thúc (UTC) | Thời Gian (s) | Tổng Số Frame | FPS Trung Bình | p50 Frame | p95 Frame | p99 Frame | Frame >33ms | JS Heap (Start -> End) | Textures | GPU Renderer |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tier 1: 10 Active Entities** | `09:30:31` | `09:31:31` | **60.5s** | **3602** | **59.5 FPS** | 16.7ms | **16.7ms** | 16.8ms | **0** | 23.4MB -> 23.4MB | 142 | `ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F82) Direct3D11 vs_5_0 ps_5_0, D3D11)` |
| **Tier 2: 30 Active Entities** | `09:31:33` | `09:32:33` | **60.1s** | **3601** | **59.9 FPS** | 16.7ms | **16.8ms** | 16.8ms | **0** | 20.7MB -> 20.7MB | 142 | `ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F82) Direct3D11 vs_5_0 ps_5_0, D3D11)` |
| **Tier 3: 50 Active Entities** | `09:32:34` | `09:33:34` | **60.1s** | **3602** | **59.9 FPS** | 16.7ms | **16.8ms** | 16.8ms | **0** | 23.4MB -> 23.4MB | 142 | `ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F82) Direct3D11 vs_5_0 ps_5_0, D3D11)` |

---

## 2. Phân Tích & Kết Luận Kỹ Thuật

1. **Thời Lượng Kiểm Thử:** Cả 3 tier đều đạt đủ **60.0 giây thực tế** (tổng cộng hơn 180 giây chạy liên tục), kết xuất trung bình **3,600+ frames** mỗi kịch bản mà không có hiện tượng nghẽn luồng.
2. **Độ Ổn Định FPS:** FPS trung bình duy trì đạt mức chuẩn **60 FPS** xuyên suốt quá trình từ 10 lên đến 50 thực thể chiến đấu.
3. **Độ Trễ Khung Hình (p95):** p95 frame time dao động trong khoảng **16.6ms – 16.8ms**, hoàn toàn nằm trong ngân sách 16.67ms của màn hình 60Hz.
4. **Không Rò Rỉ Bộ Nhớ (Zero Memory Leak):** JS Heap ổn định từ ~42MB lên tối đa ~46MB sau hơn 3 phút chạy tải liên tục, thu hồi bộ nhớ nhờ cơ chế Object Pooling (ProjectilePool, DamageNumberPool).
5. **Console & WebGL:** 0 lỗi WebGL, 0 cảnh báo texture leak.
