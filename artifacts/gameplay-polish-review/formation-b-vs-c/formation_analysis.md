# Báo Cáo So Sánh Đội Hình: Formation C vs Formation B

> **Phân loại**: So Sánh Trực Quan & Benchmark Thực Nghiệm (Cùng Máy, Cùng Chromium, Cùng Renderer)  
> **Trạng thái mặc định**: Giữ nguyên **Formation C** (1 Soldier / lane).  
> **Trạng thái kết luận hiệu năng GPU**: `INCONCLUSIVE_SOFTWARE_RASTERIZER`

---

## 1. Điều Kiện Benchmark Đồng Nhất

* **Môi trường**: Headless Chromium (`--use-gl=angle --use-angle=swiftshader`)
* **WebGL Renderer thực tế**: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)` (Software Rendering: `true`)
* **Quy trình đo**: Warm-up **60 frames** + **3 lần đo độc lập × 180 frames/lần** cho mỗi phương án.
* **Số lượng Zombie tại thời điểm đo**: Formation C = `null`, Formation B = `0`.

---

## 2. Kết Quả Đo Đạc Thực Tế (Trích Xuất Trực Tiếp Từ JSON)

| Chỉ Số Đo Đạc | Formation C (Mặc Định - 3 Lính) | Formation B (Tactical Pair - 6 Lính) |
| :--- | :---: | :---: |
| **Số lượng lính trực chiến** | 3 lính | 6 lính |
| **Độ trùng lặp Sprite (Overlap)** | 0 cặp (0.0%) | 0 cặp (0.0%) |
| **Median Avg FPS (3 runs)** | **6.4 FPS** | **6.2 FPS** |
| **Median Frame Time** | **155.3 ms** | **159.4 ms** |
| **Median P95 Frame Time** | **176.5 ms** | **184.2 ms** |

### Chi Tiết 3 Lần Đo (Raw Runs)
* **Formation C**: Run 1: 6.1 FPS (median 161.2ms, p95 181.5ms) | Run 2: 6.4 FPS (median 155.3ms, p95 176.5ms) | Run 3: 6.5 FPS (median 150.8ms, p95 166.8ms)
* **Formation B**: Run 1: 6.2 FPS (median 159.4ms, p95 181.9ms) | Run 2: 6.2 FPS (median 159.1ms, p95 184.2ms) | Run 3: 5.9 FPS (median 167.4ms, p95 190.4ms)

---

## 3. Kết Luận Trung Thực

> [!WARNING]
> **Kết luận hiệu năng phần cứng: `INCONCLUSIVE`**
> Do môi trường headless sử dụng bộ dựng hình phần mềm **SwiftShader** (CPU rasterizer), tốc độ khung hình đo được là ~6.4 FPS (C) và ~6.2 FPS (B). Số liệu này **không phản ánh hiệu năng GPU thực tế** khi chạy trên Chrome/OBS có tăng tốc phần cứng, do đó chưa đủ cơ sở kết luận Formation B không làm giảm hiệu năng trên GPU.

* Tiếp tục giữ **Formation C** làm mặc định trong game chính.
