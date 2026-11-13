# Báo Cáo Kỹ Thuật: Tích Hợp Nguồn Sự Kiện Trực Tiếp (Live Provider Access)

**Tài liệu kỹ thuật Phase 08**  
**Dự án:** Zombie Đại Chiến — Thành Trì Cuối Cùng  
**Phiên bản:** 1.0.0-phase08  
**Trạng thái nghiệm thu:**  
- `MockLiveProvider`: **READY (PASS 100 Viewers Tương Tác Đồng Thời)**
- `ReplayLiveAdapter`: **READY**
- `TikTokLiveAdapter (Real Webcast)`: **BLOCKED / ARCHITECTURAL PLUG ONLY**

---

## 1. Phân Tích Hiện Trạng Giao Thức TikTok LIVE Webcast

Theo tài liệu kỹ thuật và mã nguồn các giải pháp đọc sự kiện TikTok LIVE phổ biến trong cộng đồng (như `TikTokLiveSharp`, `tiktok-live-connector`):

> **CẢNH BÁO PHÁP LÝ & RỦI RO KỸ THUẬT:**  
> Toàn bộ các thư viện Webcast công khai hiện nay đều là **giải pháp phân tích ngược (Reverse-Engineered Community Tools)** dựa trên việc kết nối ngầm vào WebSocket Webcast nội bộ của ứng dụng web TikTok.  
> Đây **KHÔNG PHẢI** là API LIVE chính thức, có tài liệu công khai và được bảo đảm mức độ dịch vụ (SLA) bởi TikTok Inc. hoặc ByteDance.

### Bảng So Sánh Các Nguồn Tích Hợp

| Tiêu Chí | Mock / Replay Adapter | TikTok Webcast (Reverse-Engineered) | TikTok Official Partner API |
| :--- | :--- | :--- | :--- |
| **Bản quyền & Hỗ trợ** | Nội bộ monorepo (Tự chủ 100%) | Không chính thức (Cộng đồng) | Yêu cầu phê duyệt Enterprise Partner |
| **Cam kết SLA** | 99.99% ổn định nội bộ | **Không có SLA** (Có thể đổi giao thức bất kỳ lúc nào) | Cam kết SLA theo hợp đồng |
| **Rủi ro IP / Captcha** | Không | **Rất cao** (Bị chặn IP, Captcha slider, rate-limiting) | Không (Dùng API Key có hạn mức) |
| **Xác thực phòng LIVE** | Tự sinh session ID nội bộ | Bắt buộc phòng đang phát trực tiếp (`uniqueId`/`roomId`) | Webhook URL đăng ký qua Developer Portal |
| **Trạng thái Phase 08** | **READY (Đã nghiệm thu)** | **BLOCKED (Chưa có LIVE thật)** | **CHƯA ĐƯỢC CẤP QUYỀN** |

---

## 2. Kiến Trúc Adapter Có Thể Thay Thế (Pluggable Adapter Architecture)

Để bảo đảm tính linh hoạt và an toàn hệ thống, mã nguồn `apps/live-bridge` được thiết kế theo mô hình Ports & Adapters (Hexagonal Architecture):

```
                   ┌───────────────────────────────────────────┐
                   │           LiveEventAdapter (Port)         │
                   └───────────────────────────────────────────┘
                                         ▲
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
┌───────────────────┐          ┌───────────────────┐            ┌───────────────────┐
│  MockLiveAdapter  │          │ ReplayLiveAdapter │            │ TikTokLiveAdapter │
│   (100 Viewers)   │          │ (Recorded Events) │            │ (Webcast Stream)  │
└───────────────────┘          └───────────────────┘            └───────────────────┘
```

1. **State Machine Chuẩn Hóa:**
   - `DISCONNECTED` $\to$ `CONNECTING` $\to$ `CONNECTED` $\to$ `RECONNECTING` $\to$ `BACKOFF` $\to$ `ERROR`.
   - Cơ chế tự phục hồi: Tự động kết nối lại bằng **Exponential Backoff kèm Full Jitter** khi mạng gián đoạn.
2. **Dedicated Ingress Authentication:**
   - Tách biệt hoàn toàn `LIVE_BRIDGE_INGRESS_TOKEN` khỏi `ADMIN_SECRET_KEY`.
   - Token này chỉ có quyền gửi sự kiện vào `POST /api/live/event`; tuyệt đối không thể thao tác các API quản trị (`/api/admin/*`).
3. **Cumulative vs Incremental Gift Streak Engine:**
   - Xử lý quà chuỗi liên hoàn (streak combo): Chỉ tính toán và kích hoạt kỹ năng tương ứng với số lượng tăng thêm ($\Delta = \text{Current} - \text{Previous}$), triệt tiêu lỗi kích hoạt lặp khi nhận gói tin duplicate hoặc out-of-order.
4. **Boundary Cách Ly Secrets:**
   - Biến môi trường `TIKTOK_SESSION_ID`, `TIKTOK_ROOM_ID` chỉ lưu ở tiến trình backend `live-bridge`, không bao giờ để lộ ra Game Client hoặc OBS Browser Source.

---

## 3. Điều Kiện Nghiệm Thu Để Mở Khóa REAL_TIKTOK_LIVE

Để chuyển trạng thái của `TikTokLiveAdapter` từ `BLOCKED` sang `READY`:
1. Phải có một tài khoản TikTok LIVE hợp lệ đang phát sóng trực tiếp (LIVE đang ON).
2. Kiểm chứng việc nhận tin nhắn chat và quà tặng từ người dùng thật trong tối thiểu 15 phút không bị rớt gói tin hoặc nghẽn backpressure.
3. Trang bị proxy xoay vòng hoặc giải pháp bypass Captcha hợp pháp khi triển khai cụm nhiều luồng livestream đồng thời.

*Trong toàn bộ báo cáo Phase 08, trạng thái kết nối TikTok LIVE thật được ghi nhận trung thực là **BLOCKED**, không dùng kết quả chạy Mock để báo PASS giả lập.*
