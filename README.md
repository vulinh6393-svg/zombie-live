# Zombie Đại Chiến: Thành Trì Cuối Cùng

> 2D 9:16 Server-Authoritative Live Defense Game (Monorepo)

## 1. Yêu cầu hệ thống
- **Node.js**: LTS (khuyến nghị v20+ hoặc v24+)
- **pnpm**: v9+ (`corepack enable` hoặc `npm i -g pnpm`)
- **Docker Desktop**: Chạy PostgreSQL 16 và Redis 7 (tùy chọn trong môi trường local mock)
- **Hệ điều hành**: Windows 11 / macOS / Linux

## 2. Cấu trúc Monorepo
```
zombie-live/
├── apps/
│   ├── game-client/       # Phaser 3.90.x + Vite (Port 5173, Canvas 1080x1920 9:16)
│   ├── game-server/       # Fastify + Socket.IO (Port 3001, Tick 20 Hz, Snapshots 10 Hz)
│   ├── live-bridge/       # MockAdapter & LiveEventAdapter interface
│   └── admin/             # Dashboard quản trị Next.js (Triển khai giai đoạn 07)
├── packages/
│   ├── shared/            # Zod schemas, NormalizedLiveEvent, TypeScript types
│   ├── config/            # Parser & validator cho GAME_BALANCE.json
│   └── database/          # Prisma ORM schema & migrations (PostgreSQL)
├── infra/
│   └── docker-compose.yml # PostgreSQL 16 & Redis 7 có healthchecks
├── docs/                  # PRD, ARCHITECTURE, GAME_BALANCE, TEST_PLAN
├── prompts/               # Kịch bản các giai đoạn phát triển (01 - 11)
├── AGENTS.md              # Quy tắc kiến trúc bất biến
└── task.md                # Bảng kế hoạch và tiến độ thực thi
```

## 3. Cổng dịch vụ (Ports)
- **Game Client**: `http://localhost:5173`
- **Game Server API & Health**: `http://localhost:3001/health`
- **Stream State API**: `http://localhost:3001/api/stream/state`
- **Admin Dashboard**: `http://localhost:3000` (Giai đoạn 07)
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

## 4. Hướng dẫn chạy trên Windows (CMD / PowerShell)

### Bước 1: Chuẩn bị file môi trường
```powershell
copy .env.example .env
```

### Bước 2: Cài đặt thư viện
```powershell
pnpm install
```

### Bước 3: Khởi động Hạ tầng Docker (PostgreSQL & Redis)
```powershell
pnpm infra:up
```

### Bước 4: Kiểm tra Typecheck & Chạy Unit Tests
```powershell
pnpm typecheck
pnpm test
pnpm build
```

### Bước 5: Chạy chế độ phát triển (Dev Mode)
Chạy đồng thời cả Game Server và Game Client:
```powershell
pnpm dev
```
Hoặc mở ở 2 terminal riêng biệt:
- Terminal 1 (Server): `pnpm dev:server`
- Terminal 2 (Client): `pnpm dev:client`

## 5. Chế độ Mock Mode (Không cần TikTok LIVE)
Hệ thống được thiết kế hoàn toàn hoạt động offline với `MOCK_MODE=true`:
- Không phụ thuộc bất kỳ API TikTok trái phép nào.
- Dữ liệu người xem và sự kiện được giả lập chuẩn xác qua `MockLiveAdapter` với đầy đủ định danh opaque ID, queue deduplication và rate-limiting.

## 6. Xử lý sự cố thường gặp (Troubleshooting)
- **Lỗi cổng 3001 hoặc 5173 bị chiếm**: Kiểm tra tiến trình đang chạy bằng `netstat -ano | findstr :3001` và dừng tiến trình.
- **Lỗi Docker chưa bật**: Khi chưa khởi động Docker Desktop, server vẫn có thể chạy kiểm thử và chạy mock mode với bộ nhớ tạm (in-memory).
- **Lỗi pnpm workspace**: Chạy `pnpm store prune` rồi `pnpm install` lại nếu cache dependency bị xung đột.
