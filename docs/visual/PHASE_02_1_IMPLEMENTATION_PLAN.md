# PHASE 02.1 — Kế hoạch Triển khai Visual Asset & Animation Quality Gate

## 1. Mục tiêu và Phạm vi
* **Dự án:** `Zombie Đại Chiến: Thành Trì Cuối Cùng`
* **Vị trí:** `C:\Users\admin\.gemini\antigravity\scratch\zombie-live`
* **Stack:** Phaser 3.90 + TypeScript + Vite.
* **Nguyên tắc bất biến:**
  * Client thuần túy là Snapshot Renderer, tuyệt đối không chứa combat logic, tính sát thương hay tự quyết định thắng/thua.
  * Chỉ sử dụng assets có giấy phép hợp lệ (CC0 / MIT / Project Original Vector). Không sao chép game thương mại.
  * Không dùng chấm tròn, hình khối đơn sơ; mọi đơn vị phải có silhouette, chi tiết vũ khí, trang bị và chuyển động rõ ràng đọc được ở độ phân giải mobile `360x640`.

---

## 2. Danh sách tệp cần tạo và điều chỉnh
1. **Tài liệu & Manifests (`docs/visual/`):**
   * `PHASE_02_1_IMPLEMENTATION_PLAN.md`: Kế hoạch chi tiết.
   * `ASSET_MANIFEST.md`: Bảng kê khai từng asset, nguồn, URL, license, SHA256/kích thước.
   * `CHARACTER_SHEET.md`: Bảng đặc tả silhouette, kích thước, trang bị cho 10 loại zombie & Boss & lính.
   * `ANIMATION_SPECS.md`: Đặc tả chuyển động (frames, duration, timing, easing).
   * `VISUAL_QA.md`: Tiêu chuẩn nghiệm thu hình ảnh và kết quả benchmark FPS.
   * `THIRD_PARTY_LICENSES/`: Bản sao text giấy phép (Kenney CC0, Google Fonts OFL).

2. **Tổ chức thư mục Assets (`apps/game-client/public/assets/`):**
   * `kenney/`: Các asset vector/PNG CC0 đã tải từ kenney.nl.
   * `original/characters/`: Asset lính và zombie nguyên bản vector chất lượng cao.
   * `original/boss/`: Zombie King khổng lồ với các lớp chi tiết (vương miện, giáp, hào quang, mắt rực lửa).
   * `original/vfx/`: Đạn, tia sét, nổ, khói, vòng bảo vệ khiên.
   * `original/maps/`: Giao diện đường phố hoang tàn, rào chắn, vạch kẻ đường.
   * `atlases/`: Texture Atlas JSON + PNG tối ưu hóa cho Phaser 3.

3. **Mã nguồn Renderer (`apps/game-client/src/`):**
   * `assets/AssetRegistry.ts`: Quản lý tập trung mọi asset key, đường dẫn, kích thước và license metadata (không dùng magic string).
   * `renderer/entities/SoldierView.ts`: Entity lính hoàn chỉnh (thân, mũ bảo hiểm, súng, tia đạn, giật súng, nameplate, thanh máu).
   * `renderer/entities/ZombieView.ts`: Entity zombie với 10 biến thể hình dáng đặc thù, chuyển động bước đi, chớp sát thương, tan biến.
   * `renderer/entities/BossView.ts`: Trùm Zombie King với hoạt ảnh tiến vào, hào quang cuồng nộ, đòn đặc biệt, thanh máu trùm 3 giai đoạn.
   * `renderer/entities/TowerView.ts`: 3 loại tháp (Súng máy nòng đôi, Pháo Plasma, Tháp Tesla).
   * `renderer/entities/BaseView.ts`: Căn cứ phòng thủ với 4 trạng thái (Healthy, Damaged, Critical, Destroyed).
   * `renderer/vfx/EffectPool.ts`: Quản lý pool tia đạn, tia lửa nổ, số sát thương bay.
   * `renderer/ui/HUDView.ts`: HUD chuẩn mobile dọc 9:16, safe-zones cho livestream TikTok.
   * `renderer/scenes/BattleScene.ts`: Scene chiến trường trung tâm, tích hợp map, layers, entity interpolation.
   * `renderer/scenes/ContactSheetScene.ts`: Scene kiểm tra contact sheet 10 zombie phục vụ review.

---

## 3. Chiến lược Asset & Bản quyền (Licenses)
* **Nguồn chính P0/P1:**
  * **Kenney Top-Down Shooter & Tower Defense**: License Creative Commons Zero (CC0).
  * **Kenney Sci-Fi UI & Particles**: License CC0.
  * **Project-Original Vector Sprites & Rigs**: Tự tạo cho 10 loại zombie đặc thù theo PRD và Boss Zombie King để đảm bảo silhouette hoàn toàn độc nhất.
* **Quy chuẩn Style:**
  * Nền tối: Asphalt `#34454E`, Ground `#162630`.
  * Phe ta (Survivor): Xanh ngọc `#35C3D8`, Mũ `#93D8F1`, Viền `#09202A`.
  * Phe địch: Xanh zombie `#85D65B`, Độc `#B8F05B`, Boss `#5F3F79`.
  * Hiệu ứng: Vàng cam `#FFC15C`, Nổ `#F47B3F`, Cảnh báo `#EB4D5C`.

---

## 4. Chiến lược Chuyển động (Animation Strategy)
1. **Zombie States:**
   * `spawn`: Zoom in từ 0 -> 1 kèm hiệu ứng chui lên từ mặt đất (0.3s).
   * `walk`: Chu kỳ bước chân nhấp nhô (bobbing), lắc người góc nghiêng (lean) 8 Hz.
   * `attack`: Cú vồ / chém bổ tới (0.3s).
   * `hit`: Flash trắng đỏ (80ms) + độ lùi nhẹ (micro-recoil 5px).
   * `death`: Sụp đổ, tan biến alpha và thu nhỏ về 0 (0.4s).
2. **Soldier States:**
   * `idle`: Thở nhẹ (scale Y nhịp nhàng).
   * `fire`: Recoil nòng súng lùi 4px (80ms), lóe sáng nòng súng (muzzle flash 60ms), phóng đạn tracer.
   * `hit` & `death`: Tương tự.
3. **Boss States:**
   * `entrance`: Hào quang rung chuyển màn hình, vương miện rực sáng (1.2s).
   * `rage aura`: Vòng năng lượng đỏ thẫm đập nhịp nhàng (pulsing).
   * `special attack`: Sóng xung kích lan tỏa (shockwave ring).

---

## 5. Kế hoạch Milestones (M1 -> M6)
* **Milestone 1:** Lập kế hoạch, thiết lập thư mục, manifest và asset registry.
* **Milestone 2:** Hoàn thiện 1 làn mẫu (Single Perfect Lane) gồm 1 Walker, 1 Lính, 1 Tháp, Căn cứ với đầy đủ 5 trạng thái animation.
* **Milestone 3:** Bộ 10 zombie khác biệt hoàn toàn về hình dáng, kích thước và trang bị + Boss Zombie King (Tạo Contact Sheet).
* **Milestone 4:** Chiến trường 3 làn hoang tàn, 3 loại tháp chuyên biệt, căn cứ 4 trạng thái, HUD tối ưu safe-zone.
* **Milestone 5:** Hiệu ứng hình ảnh VFX (Muzzle, sparks, explosions, khiên, đạn, popup text) + Kịch bản Thắng/Thua.
* **Milestone 6:** Kiểm thử Playwright E2E tự động, đo FPS benchmark thực tế, chụp đầy đủ 9 screenshot PNG theo quy định, commit git.

---

## 6. Rủi ro & Giải pháp phòng ngừa
* **Rủi ro mạng không tải được ZIP:** Dự án trang bị sẵn module procedural vector SVG/Canvas HD nguyên bản cho mọi asset để không bị phụ thuộc vào mạng ngoài.
* **Rủi ro sụt giảm FPS khi có nhiều entity:** Triển khai triệt để Object Pooling cho đạn và text sát thương; culling các thực thể ngoài viewport; giới hạn số lượng hạt particle đồng thời <= 100.
