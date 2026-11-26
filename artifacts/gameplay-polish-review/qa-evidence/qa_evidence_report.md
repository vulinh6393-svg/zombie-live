# Báo Cáo Đo Đạc Thực Nghiệm & Chuẩn Hóa Bằng Chứng QA

> **Trạng thái tổng thể**: **PASS**  
> **Trạng thái Tick Rate**: `VERIFIED_20HZ`

---

## 1. Kết Quả Kiểm Thử Hướng Trạng Thái (Fail-Closed Assertions)

| Thao Tác / Kỹ Năng | Điều Kiện Kiểm Chứng | Kết Quả |
| :--- | :--- | :---: |
| **ACTION_BAN_SHOOT** | accepted === true AND fresh SHOOT/COMMAND_FEEDBACK event matched for qaUserId | **PASS** |
| **ACTION_SUA_REPAIR** | LEFT wall HP lowered below maxHp, SUA accepted === true, and exact delta === +15 HP observed | **PASS** |
| **SKILL_AIRSTRIKE** | accepted === true AND SKILL_AIRSTRIKE_WARNING/DETONATED matched exact sourceId === providerEventId | **PASS** |
| **SKILL_SHIELD** | accepted === true AND shieldActive === true | **PASS** |
| **SKILL_OVERCLOCK** | accepted === true AND overclockActive === true | **PASS** |

* **Chi tiết SUA**: `leftWallHpBefore = 900` ➔ `leftWallHpAfter = 915` ($Delta = +15$ HP).

---

## 2. Đo Lường Song Song Server Simulation vs Client Broadcast

* **Cửa sổ `no_load_10s` (10.007s)**:
  * **Server Tick Delta**: `206` ticks ➔ **20.6 Hz** (Server `actualSimulationHz`: **20.1 Hz**)
  * **Client Tick Delta**: `202` ticks ➔ **20.2 Hz**
  * **Socket Snapshot Broadcast**: `101` snapshots ➔ **10.1 Hz** (Mục tiêu: 10 Hz)
  * **Test Runner Event Loop Delay (P95)**: `41.62 ms`

* **Cửa sổ `mock_100_viewers_10s` (10.009s)**:
  * **Server Tick Delta**: `201` ticks ➔ **20.1 Hz** (Server `actualSimulationHz`: **20.1 Hz**)
  * **Client Tick Delta**: `200` ticks ➔ **20 Hz**
  * **Socket Snapshot Broadcast**: `100` snapshots ➔ **10 Hz** (Mục tiêu: 10 Hz)
  * **Test Runner Event Loop Delay (P95)**: `34.01 ms`

---

## 3. Tuyên Bố Minh Bạch Về Bộ Nhớ

* **Memory Leak**: `NOT MEASURED (Requires rolling Heap/RSS profiling over 30+ minutes)`
