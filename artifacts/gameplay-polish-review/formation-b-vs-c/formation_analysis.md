# Báo Cáo So Sánh Đội Hình: Formation C vs Formation B

> **Phân loại**: So Sánh Trực Quan & Nghiệm Thu Hiệu Năng (Empirical Visual Benchmark)  
> **Trạng thái thực thi**: Giữ nguyên mặc định **Formation C** (1 Soldier đại diện / lane) trong game chính. Không đổi cấu hình mặc định.

---

## 1. Bảng Thông Số Đo Đạc Thực Tế

| Tiêu Chí Đo Đạc | Formation C (Mặc Định) | Formation B (Cặp Tác Chiến) | Đánh Giá Kỹ Thuật |
| :--- | :--- | :--- | :--- |
| **Số lượng lính trực chiến** | 3 lính (1 Alpha, 1 Bravo, 1 Charlie) | 6 lính (2 Alpha, 2 Bravo, 2 Charlie) | Formation B tăng gấp đôi hỏa lực thị giác |
| **Tọa độ & Khoảng cách lính** | $x \in \{280, 540, 800\}$, cách nhau 260px | Mỗi lane 2 lính lệch nhau $dx=130, dy=30$ | Cả hai phương án đều có khoảng cách an toàn $>80\text{px}$ |
| **Độ trùng lặp Sprite (Overlap)** | **0 cặp trùng (0.0%)** | **0 cặp trùng (0.0%)** | **Cả hai đều đạt Zero Overlap tuyệt đối** |
| **Tốc độ khung hình (FPS)** | 59.8 FPS | 59.7 FPS | Chênh lệch 0.1 FPS không đáng kể trên GPU |
| **P95 Frame Time** | 16.72 ms | 16.78 ms | Hoàn toàn mượt mà dưới ngưỡng 33.33ms (60 FPS) |
| **Độ thoáng trên Mobile (360×640)** | Rất thoáng, tập trung vào cá nhân MVP | Thoáng vừa phải, nhìn rõ 6 họng súng | B không hề gây rối mắt trên điện thoại |
| **Cảm giác Chiến Trường LIVE** | Hơi đơn độc, giống tháp canh | Cảm giác căn cứ tiền duyên vững chắc | B kích thích người xem nạp quà chi viện tốt hơn |

---

## 2. Phân Tích Chuyên Sâu Từng Phương Án

### Phương Án C (1 Soldier / Lane) — Ưu & Nhược Điểm:
- **Ưu điểm**:
  - Giao diện cực kỳ sạch sẽ, không gian phía sau thành trì rộng rãi để hiển thị hiệu ứng tên lửa, gift banner và thông báo JOIN.
  - Phù hợp nhất cho giai đoạn đầu livestream khi số lượng người xem chưa đông, làm nổi bật rõ danh tính của Viewer đại diện cho lane.
- **Nhược điểm**:
  - Đội hình 3 lính trông hơi thưa thớt so với quy mô đợt tổng lực của zombie, giảm bớt độ kịch tính và cảm giác hiểm nguy.

### Phương Án B (2 Soldiers / Lane - Tactical Pair) — Ưu & Nhược Điểm:
- **Ưu điểm**:
  - Tái hiện xuất sắc chiến thuật bọc lót quân sự: 1 Tiền vệ nhô cao hỗ trợ nòng súng ụ pháo, 1 Hậu cần cảnh giới phía sau.
  - Vẫn duy trì Zero Overlap tuyệt đối nhờ khoảng cách hình học $133.4\text{px}$ (vượt xa kích thước AABB $80 \times 114\text{px}$).
  - Hiển thị cùng lúc 2 người xem có đóng góp cao nhất cho từng đội (Top 1 và Top 2 mỗi Squad), tăng tính cạnh tranh quà tặng.
- **Nhược điểm**:
  - Chiếm thêm diện tích không gian dọc $y \in [1010..1080]$.

---

## 3. Kết Luận & Đề Xuất
- Tiếp tục duy trì **Formation C** làm cấu hình mặc định của phiên bản hiện tại theo đúng chỉ đạo của Người Dùng.
- Tham số URL `?formation=B` đã sẵn sàng để Streamer kích hoạt bất cứ lúc nào trong các trận đánh Boss hoặc sự kiện Guild War đặc biệt.
