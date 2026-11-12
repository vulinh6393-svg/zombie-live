# Hướng Dẫn Cấu Hình OBS Studio Trên Windows Cho "Zombie Đại Chiến"
## Production Overlay & Live Operations Runbook (Phase 07)

Tài liệu này hướng dẫn chi tiết cách thiết lập **OBS Studio** trên hệ điều hành **Windows** để phát sóng luồng tương tác trực tiếp **TikTok LIVE** định dạng dọc (9:16 Portrait - 1080×1920) với độ trễ thấp và độ ổn định 24/7.

---

## 1. Yêu Cầu Hệ Thống & Cài Đặt Ban Đầu

### 1.1 Yêu Cầu Phần Cứng & Phần Mềm
- **Hệ điều hành:** Windows 10 / Windows 11 (64-bit).
- **OBS Studio:** Phiên bản 30.0 trở lên (khuyến nghị OBS Studio 30.2+ có tích hợp CEF Chromium mới nhất).
- **GPU:** NVIDIA GeForce RTX 2060 trở lên (hỗ trợ NVENC H.264 / HEVC) hoặc tương đương.
- **Node.js & pnpm:** Node.js v20.x LTS, pnpm v9+.

### 1.2 Thiết Lập Video Canvas Trên OBS Studio
1. Mở **OBS Studio** $\rightarrow$ Vào **Settings (Cài đặt)** $\rightarrow$ Tab **Video**:
   - **Base (Canvas) Resolution:** Nhập trực tiếp `1080x1920` (Định dạng dọc 9:16).
   - **Output (Scaled) Resolution:** `1080x1920`.
   - **Downscale Filter:** `Lanczos (Sharpened scaling, 36 samples)`.
   - **Common FPS Values:** `60`.
2. Tab **Advanced (Nâng cao)**:
   - Dưới mục **Sources**: Tích chọn **"Enable Browser Source Hardware Acceleration"** (Bắt buộc để Phaser 3 đạt 60 FPS mượt mà qua GPU WebGL).
   - Nhấn **Apply** $\rightarrow$ **OK**, sau đó khởi động lại OBS nếu được yêu cầu.

---

## 2. Thêm Browser Source Cho Game Overlay

Game Client cung cấp một route chuyên dụng dành riêng cho OBS Browser Source: `/overlay`. Route này tự động ẩn toàn bộ DevTools, Debug Panel, FPS Counter của nhà phát triển và tối ưu hóa tài nguyên hiển thị.

### 2.1 Các Bước Thêm Source Trong OBS
1. Trong bảng điều khiển **Scenes (Cảnh)**, chọn Scene phát trực tiếp của bạn (ví dụ: `TikTok Live Portrait`).
2. Trong bảng **Sources (Nguồn)**, bấm dấu **`+`** $\rightarrow$ Chọn **Browser (Trình duyệt)**.
3. Đặt tên nguồn: `Zombie_Overlay_1080x1920` $\rightarrow$ Nhấn **OK**.
4. Cấu hình bảng thuộc tính (Properties) chính xác theo thông số sau:

| Thuộc tính (Property) | Giá trị cấu hình | Giải thích mục đích |
| :--- | :--- | :--- |
| **URL** | `http://localhost:5174/overlay?server=http://localhost:3000` | Kết nối trực tiếp tới route overlay và game server |
| **Width (Chiều rộng)** | `1080` | Chuẩn ngang TikTok LIVE |
| **Height (Chiều cao)** | `1920` | Chuẩn dọc TikTok LIVE (9:16) |
| **Custom CSS** | Xem bên dưới | Xóa thanh cuộn, nền trong suốt 100% |
| **FPS** | `60` | Đảm bảo hiệu ứng particle và sprite mượt mà |
| **Reroute audio to OBS** | `[x] Checked` | Điều khiển âm thanh game trực tiếp trên OBS Audio Mixer |
| **Shutdown source when not visible** | `[ ] Unchecked` | Giữ kết nối WebSocket không bị ngắt khi chuyển cảnh |
| **Refresh browser when scene becomes active** | `[ ] Unchecked` | Tránh gián đoạn trận đấu khi operator chuyển qua lại scene |

### 2.2 Custom CSS Chuẩn
Dán đoạn CSS sau vào ô **Custom CSS** trong thuộc tính Browser Source:
```css
body {
  background-color: rgba(0, 0, 0, 0);
  margin: 0px auto;
  overflow: hidden;
}
```

> [!TIP]
> Nếu bạn muốn overlay trong suốt hoàn toàn để lồng webcam streamer ở layer bên dưới, hãy truyền tham số `?transparent=1`:
> `http://localhost:5174/overlay?transparent=1&server=http://localhost:3000`

---

## 3. TikTok Safe Zone & Bố Cục Hiển Thị

Màn hình TikTok LIVE trên điện thoại có nhiều phần bị che khuất bởi giao diện ứng dụng (Avatar streamer, bình luận, quà tặng, thanh nhập liệu). Game được thiết kế tuân thủ nghiêm ngặt vùng an toàn:

```
0px ────────────────────────────────────────────────────────
    VÙNG NGUY HIỂM ĐỈNH (Top App Header & Streamer Info)
150px ──────────────────────────────────────────────────────
    [HUD ĐỈNH]: Máu Thành Trì (Base HP), Thời Gian & Đợt Zombie
300px ──────────────────────────────────────────────────────
    
    [BÀN CỜ CHIẾN ĐẤU CHÍNH - BATTLEFIELD]:
    - Hàng rào phòng thủ & Cổng thành (Gate)
    - Trụ phòng thủ (Turrets) & Biệt đội Tiên phong (Squads)
    - Đường tiến công của Zombie (Normal, Fast, Tank, Boss)
    - Hiệu ứng kỹ năng (Bão Lửa, Sấm Sét, Pháo Kích, Tiếp Viện)
    
1250px ─────────────────────────────────────────────────────
    [SAFE ZONE BANNER - VÙNG THÔNG BÁO QUÀ & KỸ NĂNG]
    - Nơi hiển thị Gift Announcement & VIP Supporter
    - Tọa độ Y: 1250px - 1350px (Không bị che bởi bình luận)
1420px ─────────────────────────────────────────────────────
    VÙNG BÌNH LUẬN & TƯƠNG TÁC TIKTOK (Chat stream, nút quà)
1920px ─────────────────────────────────────────────────────
```

---

## 4. Trang Điều Hành Trực Tiếp (Admin Operations Dashboard)

Bên cạnh OBS Browser Source (dành cho người xem), Operator / Streamer sử dụng Dashboard điều hành tại:
```
http://localhost:3000/admin
```

### 4.1 Tính Năng Bảng Điều Hành
- **Giám Sát 20Hz Real-Time:** Hiển thị Tick, FPS Engine, Thời gian trận, Trạng thái Cổng Thành, Máu Thành, Trạng thái Outbox / Database.
- **Tạm Dừng Trận (Pause Simulation):** Đóng băng mô phỏng khi streamer cần nghỉ ngơi hoặc xử lý sự cố.
- **Tiếp Tục Trận (Resume Simulation):** Tiếp tục tick mô phỏng với trạng thái bảo toàn nguyên vẹn.
- **Khởi Động Lại Khẩn Cấp (Emergency Reset):** Đưa trận đấu về trạng thái `PREPARING`, hồi phục 100% máu thành trì và dọn sạch quái trên sân.
- **Đóng/Mở Cổng Thành (Gate Toggle):** Thao tác khẩn cấp hạ cổng hoặc nâng cổng thành.
- **Tạo Trận Mới (Start Match):** Khởi tạo `matchId` mới cùng hạt giống sinh ngẫu nhiên (seed).

### 4.2 Thiết Lập Bảo Mật Admin
Mọi thao tác quản trị trên Dashboard hoặc API `/api/admin/*` đều yêu cầu `ADMIN_SECRET_KEY` (tối thiểu 16 ký tự).
Trong file `.env` của server:
```env
ADMIN_SECRET_KEY="production_super_secret_admin_key_2026"
```
Tại màn hình `/admin`, dán token này vào ô **Admin Secret Key** và nhấn **"Authenticate"** để kích hoạt quyền điều khiển.

---

## 5. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

### 5.1 Browser Source Hiện Màn Hình Đen
1. Kiểm tra xem Game Server đã khởi động chưa: mở trình duyệt truy cập `http://localhost:3000/ready`. Kết quả trả về phải có `"status": "ready"`.
2. Kiểm tra xem Game Client Vite server đã chạy chưa (`http://localhost:5174/overlay`).
3. Chuột phải vào `Zombie_Overlay_1080x1920` trong OBS $\rightarrow$ Chọn **Interact (Tương tác)** $\rightarrow$ Nhấn phím `F12` để mở Chrome DevTools kiểm tra lỗi console hoặc network.

### 5.2 Khôi Phục Kết Nối Khi Server Khởi Động Lại (Auto-Reconnect)
- Hệ thống Client được trang bị cơ chế **Instant Resync**: Khi Game Server restart, Socket Client tự động kết nối lại, reset sequence ID về `-1`, và tự động đồng bộ tức thì với Snapshot đầu tiên của server mới.
- Operator **không cần reload** lại Browser Source trong OBS.

### 5.3 Tụt Khung Hình (Drop FPS Dưới 60)
1. Xác nhận tùy chọn **"Enable Browser Source Hardware Acceleration"** trong OBS Settings đã được bật.
2. Kiểm tra tải GPU trong Windows Task Manager. Đảm bảo GPU không bị nghẽn bởi các phần mềm đồ họa khác.
3. Không mở đồng thời nhiều tab Client render WebGL trên trình duyệt thông thường trong lúc OBS đang capture.
