# PROMPT 01 — Phân tích, thiết kế và scaffold (dán vào Antigravity)
Bạn đang xây dựng dự án mới Zombie Đại Chiến: Thành Trì Cuối Cùng. Đọc toàn bộ AGENTS.md và docs/PRD.md, docs/ARCHITECTURE.md, docs/GAME_BALANCE.json, docs/TEST_PLAN.md trước.
NHIỆM VỤ:
Khảo sát workspace rỗng; tạo bản implementation plan ngắn gồm kiến trúc, các milestone, sơ đồ luồng event, rủi ro và thứ tự phụ thuộc. Dùng Planning Mode và artifact review nếu môi trường hỗ trợ.
Sau đó thực hiện chỉ scaffold, không vẽ game hoặc triển khai TikTok thật.
Dựng pnpm monorepo apps/game-client (Vite + Phaser 3.90.x), apps/game-server (Fastify + Socket.IO), apps/live-bridge, packages/shared, packages/config, packages/database; để apps/admin cho giai đoạn 07.
TypeScript strict + ESLint + Prettier + Vitest; Docker Compose PostgreSQL + Redis có healthchecks; .env.example, .gitignore, scripts root install/dev/typecheck/lint/test/build/infra:up/db:migrate; GET /health và /ready.
Repo phải có README nêu lệnh chạy Windows, localhost ports, cách không cần TikTok, và cách sửa các lỗi dependency phổ biến.
Tạo một smoke test chạy API, một test config parser; đảm bảo 3 app/module có thể import shared types. Phân định rõ nơi chứa business logic, rendering và integration.
NGHIỆM THU:
pnpm install, pnpm typecheck, pnpm test, pnpm build chạy thành công.
Docker services chạy và /health trả 200; mở trình duyệt thấy trang placeholder game chứ không màn hình trắng.
Không có thư viện Phaser 4 hoặc phụ thuộc TikTok không được phép.
