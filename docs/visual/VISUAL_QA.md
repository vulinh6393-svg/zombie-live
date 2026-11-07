# Tiêu Chuẩn & Nhật Ký Kiểm Thử Chất Lượng Hình Ảnh (Visual QA)

Dự án: **Zombie Đại Chiến: Thành Trì Cuối Cùng**  
Giai đoạn: **Phase 02.1 — Visual Asset & Animation Quality Gate**

---

## 1. Tiêu chuẩn Kiểm tra Bắt buộc (Acceptance Checklist)
- [x] **Không dùng chấm tròn hay hình hộp đơn điệu:** 100% nhân vật lính, tháp, và 10 loại zombie có thiết kế chi tiết, phụ kiện, vũ khí và bóng đổ (shadow).
- [x] **Độ đọc tốt trên màn hình điện thoại (Readability at 360x640):** Người xem nhìn lướt trên điện thoại phân biệt được ngay các đơn vị, không bị chữ đè nhau.
- [x] **Safe-zone chuẩn Livestream:** HUD trên đỉnh và thanh hướng dẫn comment ở đáy cách mép màn hình >= 30px, tránh các vùng nút bình luận và icon quà tặng của TikTok/OBS.
- [x] **Tách bạch Route:**
  - Route `/`: Đầy đủ thanh công cụ kiểm thử nhanh (Dev Control Panel).
  - Route `/overlay`: Tuyệt đối sạch sẽ, không có bất kỳ nút debug, banner FPS hay công cụ test nào.
- [x] **Hiệu năng & FPS:**
  - Giữ mức 60 FPS trong engine Phaser loop.
  - Tối ưu bộ nhớ bằng Object Pooling cho đạn và chữ số sát thương bay.
  - Bộ kiểm thử tự động Playwright không ghi nhận bất kỳ console error nào.

---

## 2. Danh mục 9 Screenshots Nghiệm thu Bắt buộc
Tất cả hình ảnh được chụp thực tế bằng Playwright tự động và lưu tại `apps/game-client/screenshots/`:

1. `early_wave_1080x1920.png`: Chiến trường Đợt 1 (Walker) tỷ lệ 1080x1920 có Dev Panel.
2. `overlay_clean_1080x1920.png`: Route `/overlay` sạch cho OBS Studio.
3. `mid_wave_720x1280.png`: Chiến trường Đợt 3 (Spitter, Healer, Armored) tại 720x1280.
4. `dense_swarm_360x640.png`: Đợt quái đông tại độ phân giải tối thiểu 360x640.
5. `boss_entrance_1080x1920.png`: Trùm Zombie King xuất hiện với vương miện rực lửa và thanh máu trùm.
6. `boss_attack_720x1280.png`: Trận chiến Trùm Cuối tại 720x1280.
7. `victory_1080x1920.png`: Màn hình Chiến thắng khi tiêu diệt được Boss.
8. `defeat_1080x1920.png`: Màn hình Thất thủ khi căn cứ hết máu.
9. `character_contact_sheet.png`: Bảng tổng hợp hiển thị đồng thời toàn bộ 10 loại zombie cạnh nhau để so sánh trực quan silhouette.
