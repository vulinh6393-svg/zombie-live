# Hướng Dẫn Vận Hành & Triển Khai (Production & Local Runbook)

**Tài liệu kỹ thuật Phase 08 — Deployment & Operations**  
**Dự án:** Zombie Đại Chiến: Thành Trì Cuối Cùng  
**Phiên bản:** 1.0.0-phase08

---

## 1. Trạng Thái Môi Trường & Cơ Sở Hạ Tầng (Production Readiness Gates)

| Hạng mục | Trạng thái | Ghi chú & Giải trình kỹ thuật |
| :--- | :--- | :--- |
| **Windows Native Deployment** | **READY (PASS)** | Khởi chạy native thông qua bộ script `scripts/start-production.ps1` và `scripts/health-check.ps1`. |
| **PostgreSQL PGlite Storage** | **READY (PASS)** | Lưu trữ dữ liệu quan hệ bền vững, phục hồi 100% qua restart/crash, đã kiểm thử khôi phục trạng thái. |
| **Docker Compose Deployment** | **BLOCKED (Host Dependent)** | Đã cung cấp đầy đủ `docker-compose.yml`, Dockerfile tách biệt cho 4 dịch vụ; chuyển sang trạng thái READY khi máy chủ cài Docker. |
| **PostgreSQL Standalone (Cluster)**| **BLOCKED (Host Dependent)** | Hỗ trợ cấu hình `DATABASE_URL`; do máy trạm hiện tại chưa cài daemon PostgreSQL nên hệ thống chạy PGlite filesystem persistence. |
| **Soak Test 60 Phút** | **MANUAL_PENDING** | Đã hoàn thành soak test 91.1s tự động trong QA Gate; bài test 60 phút liên tục cần máy chủ chuyên dụng vận hành dài hạn. |
| **Real TikTok LIVE Integration** | **BLOCKED** | Giao thức Webcast chưa có API chính thức và cam kết SLA; chỉ dùng Mock 100 Viewers để kiểm thử authoritative engine. |

---

## 2. Phương Án 1: Triển Khai Native Trên Windows (Khuyên Dùng Cho Demo & OBS Studio)

### Bước 1: Khởi Động Hệ Thống
Mở PowerShell tại thư mục gốc dự án và chạy:
```powershell
.\scripts\start-production.ps1 -ServerPort 3001 -ClientPort 5173
```

Kịch bản sẽ tự động:
1. Thiết lập các khóa bí mật: `ADMIN_SECRET_KEY`, `LIVE_BRIDGE_INGRESS_TOKEN`.
2. Khởi động Game Server (Authoritative 20Hz Simulation Loop) trên cổng `3001`.
3. Khởi động Game Client (Phaser Overlay) trên cổng `5173`.
4. Ghi nhận PID vào `.running_pids.json`.

### Bước 2: Cài Đặt OBS Studio
1. Mở **OBS Studio**, tạo một **Browser Source** mới.
2. Cấu hình tham số:
   - **URL:** `http://localhost:5173/overlay`
   - **Width:** `1080`
   - **Height:** `1920`
   - **FPS:** `60`
   - **Custom CSS:** `body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }`
3. Đánh dấu chọn:
   - `Shutdown source when not visible`
   - `Refresh browser when scene becomes active`

### Bước 3: Kiểm Tra Trạng Thái & Sức Khỏe
```powershell
.\scripts\health-check.ps1
```

### Bước 4: Sao Lưu Dữ Liệu Định Kỳ
```powershell
.\scripts\backup-db.ps1
```

### Bước 5: Dừng Dịch Vụ An Toàn
```powershell
.\scripts\stop-production.ps1
```

---

## 3. Phương Án 2: Triển Khai Bằng Docker Compose (Linux / Cloud Server)

Khi triển khai trên hạ tầng VPS / Cloud có Docker:
```bash
# Khởi chạy toàn bộ 4 container: postgres, game-server, live-bridge, game-client
docker compose up -d

# Xem log theo thời gian thực
docker compose logs -f game-server

# Kiểm tra trạng thái sức khỏe
docker compose ps
```
