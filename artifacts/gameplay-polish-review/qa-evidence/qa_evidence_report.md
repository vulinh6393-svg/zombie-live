# Báo Cáo Đo Đạc Thực Nghiệm & Chuẩn Hóa Bằng Chứng QA (Task 5)

> **Mục tiêu**: Xóa bỏ toàn bộ các tuyên bố chủ quan/marketing; thiết lập bộ assertion hướng trạng thái (State-Driven) và sự kiện (Event-Driven) nghiêm ngặt; minh bạch dữ liệu đo lường.

---

## 1. Kết Quả Kiểm Thử Hướng Trạng Thái (State-Driven Assertions)

Toàn bộ ảnh chụp bằng chứng kỹ thuật trong thư mục `artifacts/gameplay-polish-review/qa-evidence/` đều được chụp **SAU KHI** code assert thành công điều kiện trạng thái thực tế trên Game Engine / Snapshot Stream:

| Thao Tác / Kỹ Năng | Điều Kiện Kiểm Chứng (Assertion Rule) | Dữ Liệu Đo Đạc Thực Tế | Kết Quả | Ảnh Minh Chứng |
| :--- | :--- | :--- | :--- | :--- |
| **BẮN (BAN)** | Bắt buộc có sự kiện `SHOOT` trong danh sách `__ALL_VFX_EVENTS__` | Phát hiện sự kiện `SHOOT` trong stream sự kiện authoritative | **PASS (100%)** | [verified_action_ban.png](file:///C:/Users/admin/.gemini/antigravity/scratch/zombie-live/artifacts/gameplay-polish-review/qa-evidence/verified_action_ban.png) |
| **SỬA THÀNH (SUA)** | Base HP tăng đúng $+15\text{ HP}$ (hoặc chạm trần $10,000\text{ HP}$) | $\Delta\text{HP} = +15$ verified | **PASS (100%)** | [verified_action_sua.png](file:///C:/Users/admin/.gemini/antigravity/scratch/zombie-live/artifacts/gameplay-polish-review/qa-evidence/verified_action_sua.png) |
| **KHIÊN NĂNG LƯỢNG (SHIELD)** | `shieldActive === true` hoặc `SKILL_SHIELD_ACTIVATED` verified | Nhận sự kiện `SKILL_SHIELD_ACTIVATED` & kích hoạt vòm khiên | **PASS (100%)** | [verified_skill_shield.png](file:///C:/Users/admin/.gemini/antigravity/scratch/zombie-live/artifacts/gameplay-polish-review/qa-evidence/verified_skill_shield.png) |
| **ÉP XUNG Ụ PHÁO (OVERCLOCK)** | `overclockActive === true` hoặc `SKILL_OVERCLOCK_ACTIVATED` verified | Nhận sự kiện `SKILL_OVERCLOCK_ACTIVATED` & kích hoạt hào quang | **PASS (100%)** | [verified_skill_overclock.png](file:///C:/Users/admin/.gemini/antigravity/scratch/zombie-live/artifacts/gameplay-polish-review/qa-evidence/verified_skill_overclock.png) |
| **KHÔNG KÍCH TÊN LỬA (AIRSTRIKE)** | Bắt buộc nhận `SKILL_AIRSTRIKE_WARNING` hoặc `SKILL_AIRSTRIKE_DETONATED` | Nhận sự kiện `SKILL_AIRSTRIKE_WARNING` & hiển thị vòng AoE | **PASS (100%)** | [verified_skill_airstrike.png](file:///C:/Users/admin/.gemini/antigravity/scratch/zombie-live/artifacts/gameplay-polish-review/qa-evidence/verified_skill_airstrike.png) |

---

## 2. Đo Lường Nhịp Tick Phiên Thực Tế (Session Delta Ticks)

- **Phương pháp đo**: Ghi nhận `initialTick` tại $t_0$, đợi 5.005 giây, ghi nhận `endingTick` tại $t_1$.
- **Số liệu đo đạc thực tế**:
  * `initialTick`: 1,264,033
  * `endingTick`: 1,264,114
  * $\Delta\text{Ticks}$: **81 ticks**
  * Thời gian trôi qua: **5.005 giây**
  * Tần số đo được: **16.2 Hz** (Target lý tưởng: 20 Hz, duy trì liên tục dưới tải 100 viewers mock).

---

## 3. Tuyên Bố Minh Bạch Về Bộ Nhớ (Memory Profiling Disclosure)

> [!IMPORTANT]
> **Trạng thái kiểm tra Memory Leak**: `NOT MEASURED (Requires rolling Heap/RSS profiling over 30+ minutes)`
> 
> Một lần đọc heap snapshot đơn lẻ tại một thời điểm **không thể chứng minh** hệ thống không có memory leak. Để khẳng định không rò rỉ bộ nhớ, cần kịch bản đo đạc chuỗi thời gian (time-series rolling heap/RSS) kéo dài ít nhất 30 đến 60 phút dưới tải bão hòa (100+ viewers dispatching liên tục). Antigravity ghi nhận trung thực trạng thái này theo đúng chuẩn mực QA.
