# PROMPT 02 — Game client Phaser 9:16 hoàn chỉnh
Đọc AGENTS.md + docs. Chỉ làm frontend game; chưa kết nối TikTok hay database.
YÊU CẦU:
Phaser 3.90.x, 1080x1920 logical canvas, responsive scale FIT, export overlay /overlay không có debug panel; trang / có local mock dev controls tách riêng.
Vẽ chiến trường top-down/isometric nhẹ: căn cứ chiếm đáy chiến trường; 3 đường zombie xuất hiện từ trên; đường đi rõ; 3 loại tower; soldiers hiển thị với nameplate; popup HP/sát thương, recoil, tracer, explosion, shield, boss warning.
HUD rõ trên điện thoại: tên game, current phase, wave, countdown, base HP, boss HP, top contributors, guide JOIN/BẮN/SỬA/CỨU; giữ safe-zone để TikTok overlay không che.
Chỉ dùng artwork tự tạo đơn giản (SVG/procedural/vector) hoặc placeholder có giấy phép. Không dùng assets sao chép từ PvZ hay game khác. Màu navy, neon lime, cyan, orange; phong cách hoạt hình không gore.
Giữ animation 60FPS mục tiêu, tween/interpolation từ snapshots; giới hạn labels và particles, object pools và culling.
Có mock incoming snapshots (deterministic sample) để demo 10 zombies và win/loss cảnh; nhưng tách rõ MockRendererDemo khỏi API production.
Chế độ browser screenshot desktop, mobile device emulation; không để banner debug trên overlay.
