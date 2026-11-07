# Báo Cáo Nghiệm Thu Visual Quality Gate — Phase 02.2.1

## 1. Tổng Quan Nghiệm Thu
- **Dự án:** Zombie Đại Chiến: Thành Trì Cuối Cùng
- **Giai đoạn:** Phase 02.2.1 — Quality Lab Visual Presentation Fix
- **Trạng thái:** HOÀN THÀNH — Sẵn sàng nghiệm thu
- **Branch Git:** `feat/phase02-visual-refinement`

---

## 2. Danh Sách Sản Phẩm Nghiệm Thu Thực Tế (Artifacts)

| Loại Tệp | Tên Tệp | Đường Dẫn Thực Tế | Kích Thước / Mô Tả |
| :--- | :--- | :--- | :--- |
| **Ảnh 1080x1920 Clean** | `quality_lab_clean_1080x1920.png` | `apps/game-client/screenshots/quality_lab_clean_1080x1920.png` | 1080×1920, giao diện sạch 100%, không bị Dev Controls che |
| **Ảnh 360x640 Mobile** | `quality_lab_clean_360x640.png` | `apps/game-client/screenshots/quality_lab_clean_360x640.png` | 360×640 preview mobile portrait, tỉ lệ nhân vật rõ ràng |
| **Ảnh Combat Focus** | `quality_lab_combat_focus.png` | `apps/game-client/screenshots/quality_lab_combat_focus.png` | Cận cảnh bắn súng: Muzzle flash + Tracer đạn + Hiệu ứng trúng đạn |
| **Ảnh Scale Comparison**| `walker_soldier_scale_comparison.png` | `apps/game-client/screenshots/walker_soldier_scale_comparison.png` | Đối chiếu tỉ lệ thân Walker (196px alpha) & Soldier (156px alpha) |
| **Video Gameplay Demo** | `combat_animation_demo.webm` | `apps/game-client/recordings/combat_animation_demo.webm` | Video quay màn hình game thực tế >= 15s chu kỳ chiến đấu tự động |
| **Báo Cáo FPS Updated** | `FPS_BENCHMARK_UPDATED.md` | `docs/visual/FPS_BENCHMARK_UPDATED.md` | Benchmark 3 cấp độ: 1 entity, 20 entities, 50 entities |

---

## 3. Kết Quả Khắc Phục Các Điểm Người Dùng Yêu Cầu

### A. Tách Dev Controls Khỏi Màn Hình Gameplay
- Route `/quality-lab` mặc định (`debug=0` hoặc không tham số): hiển thị **100% canvas game sạch**, không có bảng điều khiển HTML và không có hộp thoại header che khuất.
- Route `/quality-lab?debug=1` hoặc `/quality-lab/controls`: hiển thị Dev Controls cố định phía trên/dưới để kiểm thử thủ công và benchmark.
- Tuyệt đối không can thiệp vào route `/overlay` của OBS Livestream.

### B. Sửa Lỗi Tính Toán Scale (Alpha-Trimmed Calibration)
- **Walker Zombie:** Chiều cao thân thực tế sau khi trim alpha = **196px** (texture gốc 288×311).
- **Survivor Soldier:** Chiều cao thân thực tế sau khi trim alpha = **156px** (texture gốc 313×206, không tính phần nòng súng vươn dài).
- **Bảng Chuẩn Hóa Scale Tiers:**
  - **Tier 36px:** Walker Scale = `0.551`, Soldier Scale = `0.692` (Chiều cao thân hiển thị 36px trên điện thoại / 108px logic).
  - **Tier 44px [Recommended]:** Walker Scale = `0.673`, Soldier Scale = `0.846` (Chiều cao thân hiển thị 44px trên điện thoại / 132px logic).
  - **Tier 52px:** Walker Scale = `0.796`, Soldier Scale = `1.000` (Chiều cao thân hiển thị 52px trên điện thoại / 156px logic).
- **Kết quả:** Thân lính và thân zombie có kích thước đồng bộ, không còn hiện tượng lính bị teo nhỏ thành 26px như trước.

### C. Nâng Cấp Chiến Trường & Bầu Không Khí (Visual Art Alignment)
- Dựa trên 3 hình ảnh tham chiếu thực tế:
  - **Mặt đường:** Nhựa đường cao tốc ban đêm (Asphalt) có vạch kẻ vàng đôi ở tim đường, vạch trắng biên đường, rãnh nứt và vết cháy dầu.
  - **Phòng tuyến phòng thủ:** Rào chắn gỗ kim loại, bao cát gia cố kiên cố, hòm đạn tiếp tế quân sự.
  - **Ánh sáng:** Đèn pha spotlight chiếu rọi trực tiếp từ tháp đèn vào khu vực giao tranh, tạo độ tương phản cao và hiệu ứng ánh sáng ban đêm kịch tính.
  - **Khoảng cách:** Đưa vị trí lính (y=1200) và zombie (y=760->960) lại gần nhau, tạo khung hình tập trung hành động rõ nét.

### D. Chu Kỳ Chiến Đấu Tự Động (Autonomous Demonstration Loop)
- Tự động chạy tuần hoàn:
  1. Walker xuất hiện và bước đi dọc theo đường cao tốc (`walker-walk` 17 frames).
  2. Lính ngắm bắn, khai hỏa phát ra tia lửa nòng (`muzzle_flash`).
  3. Đạn vạch đường (`bullet_tracer`) bay tới mục tiêu.
  4. Tháp súng tự động xoay và bắn hỗ trợ với độ giật nòng.
  5. Zombie trúng đạn: tóe lửa (`hit_explosion`), chớp đỏ, giật lùi, bay số sát thương đỏ (`-35`).
  6. Sau 3 phát bắn: Zombie ngã xuống, hiện xác chết (`zombie_corpse_0`), vũng máu lan rộng trên đường nhựa.
  7. Hiển thị thông báo `+50 EXP (TIÊU DIỆT)`.
  8. Nghỉ 3 giây và tự động lặp lại cho lượt mới.

---

## 4. Kiểm Thử Hệ Thống Monorepo
- `pnpm -r run typecheck`: **7/7 packages PASSED (0 errors)**.
- `pnpm test`: **12/12 unit tests PASSED**.
- Không xuất hiện bất kỳ hình khối hình học procedural vector nào thay thế nhân vật. 100% sử dụng sprite animation thực tế.
