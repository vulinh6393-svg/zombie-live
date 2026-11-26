# Báo Cáo Tổng Hợp Nghiệm Thu Trực Quan & Hiệu Chỉnh QA
## Dự Án Zombie Đại Chiến: Thành Trì Cuối Cùng (`zombie-live`)

> **Nhánh**: `feat/phase02-visual-refinement`  
> **Nguồn dữ liệu**: Trích xuất trực tiếp từ `hud_readability_metrics.json`, `formation_comparison_report.json` và `qa_empirical_telemetry.json`.  
> **Nguyên tắc**: Không thay đổi gameplay mặc định (Formation C, sprite Walker CC0, Audio tắt mặc định).

---

## 1. P0 — Mobile HUD Readability (`HUD.ts`, `SquadVisualizer.ts`)

* **Tái phân cấp thông tin**: Ẩn dòng thống kê phụ `entityCountText` khỏi Top HUD để nhường chỗ cho các thông tin cốt lõi (**Wave**, **Timer**, **Base HP**, **JOIN CTA**, **Squad Badges**).
* **Đo đạc trực tiếp trên viewport `360×640` (`hud_readability_metrics.json`)**:
  * `clearOfTiktokTopPill`: **`true`** (`topHudMinYMobilePx = 63px` >= `tiktokTopPillBottomPx = 58px`, không bị host pill/viewer badge che).
  * `anyHorizontalClipping`: **`false`** (không có chữ nào tràn hoặc bị cắt ngang).
  * **Kích thước chữ thực tế sau scale `0.333x` trên màn hình `360×640`**:
    * Wave & Timer (`36px` canvas): **`12.0 px`**
    * Base HP `HP: 9,875 / 10,000 (99%)` (`34px` canvas): **`11.3 px`**
    * Callout `GÕ: "1" ALPHA | "2" BRAVO | "3" CHARLIE` (`34px` canvas): **`11.3 px`**
    * Squad Badges `ALPHA: 12`, `BRAVO: 18`, `CHARLIE: 10` (`32px` canvas): **`10.7 px`**

---

## 2. P0 — QA Evidence Fail-Closed & Đối Soát Hiệu Năng (`qa_empirical_telemetry.json`)

* **Overall Status**: **`PASS`** (`tickRateStatus`: **`VERIFIED_20HZ`**)
* **5/5 Assertions Fail-Closed (Exit code `1` nếu có bất kỳ assertion nào FAIL)**:
  1. `ACTION_BAN_SHOOT`: **PASS** (`responseAccepted: true`, khớp sự kiện `SHOOT` mới).
  2. `ACTION_SUA_REPAIR`: **PASS** (Hạ HP tường `LEFT` xuống `900` qua `admin:damageWall`, gửi `SUA` `accepted: true`, tăng lên `915` ➔ **$\Delta = +15\text{ HP}$**).
  3. `SKILL_AIRSTRIKE`: **PASS** (`accepted: true`, khớp chính xác `sourceId === providerEventId` = `qa_airstrike_1795700259761_ziocy`).
  4. `SKILL_SHIELD`: **PASS** (`accepted: true`, `shieldActive: true`).
  5. `SKILL_OVERCLOCK`: **PASS** (`accepted: true`, `overclockActive: true`).
* **Đo song song Server Simulation vs Client Broadcast**:
  * **Không tải (`no_load_10s`)**: Server delta **`20.6 Hz`**, Server `actualSimulationHz` **`20.1 Hz`**, Client tick **`20.2 Hz`**, Snapshot **`10.1 Hz`**.
  * **Tải 100 Mock Viewers ổn định (`mock_100_viewers_10s`)**: Server delta **`20.1 Hz`**, Server `actualSimulationHz` **`20.1 Hz`**, Client tick **`20.0 Hz`**, Snapshot **`10.0 Hz`**. *(Lưu ý: trong giai đoạn burst lúc mới khởi chạy 100 viewers, server simulation từng ghi nhận tụt tạm thời xuống `13.1–14.0 Hz` do ghi PGlite đồng loạt, xác nhận nguyên nhân nằm ở event loop server lúc burst chứ không phải rớt gói phía client).*
* **Memory Leak**: `NOT MEASURED (Requires rolling Heap/RSS profiling over 30+ minutes)`.

---

## 3. P1 — Formation B vs Formation C Benchmark (`formation_comparison_report.json`)

* **Điều kiện đồng nhất**: Cùng Chromium (`--use-gl=angle --use-angle=swiftshader`), WebGL Renderer `ANGLE (SwiftShader Device, Software Rendering: true)`, warm-up 60 frames + 3 lần đo × 180 frames/lần.
* **Số liệu thực tế (trùng khớp 100% với JSON)**:
  * **Formation C (3 lính - Mặc định)**: Median Avg FPS **`6.4 FPS`**, Median Frame Time **`155.3 ms`**, Median P95 **`176.5 ms`**, Overlap **`0 (0.0%)`**.
  * **Formation B (6 lính - Preview)**: Median Avg FPS **`6.2 FPS`**, Median Frame Time **`159.4 ms`**, Median P95 **`184.2 ms`**, Overlap **`0 (0.0%)`**.
* **Kết luận**: **`INCONCLUSIVE_SOFTWARE_RASTERIZER`** — Môi trường headless chạy bằng SwiftShader CPU rasterizer, không phản ánh hiệu năng GPU thực tế. Giữ nguyên **Formation C** làm mặc định.

---

## 4. Hạng Mục Preview (Chưa Tích Hợp Vào Game Chính)

* **Zombie Sprite Diversity**: Tài liệu spec, roadmap và ảnh preview trong `zombie-sprite-preview/`. Game chính vẫn dùng sprite Walker CC0.
* **Audio SFX Prototype**: `SoundManager.ts` (tắt mặc định `isMuted: true`) và soundboard tương tác trong `audio-sfx-preview/`. *(Lưu ý: Web Audio vẫn có độ trễ xử lý & phát âm thanh của trình duyệt/hệ điều hành, không tuyên bố 0ms).*
