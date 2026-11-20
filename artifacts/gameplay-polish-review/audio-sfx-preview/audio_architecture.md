# Kiến Trúc Âm Thanh Web Audio & Hướng Dẫn Định Tuyến OBS

> **Phân loại**: Prototype & Hướng Dẫn Kỹ Thuật (Audio Architecture Prototype & Review)  
> **Trạng thái thực thi**: **PREVIEW ONLY** — Tắt âm mặc định (`isMuted: true`). Không tự ý phát âm thanh trong live overlay nếu Streamer chưa cấu hình.

---

## 1. Thiết Kế Hệ Thống Âm Thanh (Sound Architecture)

### 1.1 Nguyên Lý Tổng Hợp Thuần Túy (Zero External Audio Files)
- Toàn bộ 7 hiệu ứng âm thanh cốt lõi được tổng hợp theo thời gian thực (Procedural Web Audio Synthesis) sử dụng `OscillatorNode`, `AudioBufferSourceNode` (white noise generator), `BiquadFilterNode` và `GainNode` envelopes.
- **Lợi ích**:
  * **0 MB tải mạng**: Không tốn dung lượng băng thông tải file MP3/WAV.
  * **0 rủi ro bản quyền âm thanh**: Hoàn toàn do thuật toán sinh ra, miễn nhiễm với gậy bản quyền âm nhạc/sound effect trên TikTok LIVE / YouTube.
  * **Độ trễ 0 ms**: Kích hoạt tức thì ngay khi nhận authoritative event từ server.

### 1.2 Kiểm Soát Âm Lượng & Chống Ô Nhiễm Âm Thanh (Audio Fatigue Mitigation)
- **Giới hạn luồng âm thanh đồng thời (Max Concurrent Voices)**: Cố định tối đa **4 voices** cùng lúc. Khi có 20 lính cùng nổ súng hoặc bầy zombie 50 con tấn công, hệ thống tự động gộp (throttle) và áp dụng cooldown tối thiểu 80ms giữa các phát súng, loại bỏ hoàn toàn hiện tượng chói tai (audio clipping).
- **Phân tầng độ ưu tiên**:
  * *Ưu tiên 1 (Tối cao)*: Báo động Airstrike & Nổ Tên Lửa (chiếm 1 kênh voice chuyên biệt).
  * *Ưu tiên 2*: Tiếng gầm của Boss và Còi cảnh báo thành trì.
  * *Ưu tiên 3*: Khiên năng lượng & Tiếng zombie cắn.
  * *Ưu tiên 4*: Tiếng súng bộ binh (bị giới hạn tối đa 2 phát/lúc).

---

## 2. Danh Mục 7 Hiệu Ứng Âm Thanh

| Sự Kiện | Thuật Toán Tổng Hợp | Dải Tần Số | Thời Lượng | Cảm Giác Trực Quan |
| :--- | :--- | :--- | :--- | :--- |
| **GUNSHOT** | White noise burst + Lowpass filter sweep | $1800\text{Hz} \to 100\text{Hz}$ | $120\text{ms}$ | Đanh gọn, uy lực của súng trường dã chiến |
| **ZOMBIE_ATTACK** | Sawtooth wave + Resonant lowpass | $110\text{Hz} \to 55\text{Hz}$ | $250\text{ms}$ | Tiếng cắn xé gầm gừ trầm đục |
| **AIRSTRIKE_WARNING** | Sine wave glissando siren | $600\text{Hz} \to 1200\text{Hz} \to 600\text{Hz}$ | $800\text{ms}$ | Còi báo động không kích dồn dập |
| **AIRSTRIKE_DETONATION** | Sub-bass boom (sine 25Hz) + Deep noise | $120\text{Hz} \to 25\text{Hz}$ + Noise | $800\text{ms}$ | Vụ nổ rung chuyển màn hình |
| **SHIELD_BUZZ** | Dual detuned triangle + saw | $120\text{Hz} + 242\text{Hz}$ | $400\text{ms}$ | Điện trường hồ quang plasma bảo vệ |
| **BOSS_ROAR** | Multi-sawtooth + Resonant peak filter | $90\text{Hz} \to 130\text{Hz} \to 45\text{Hz}$ | $1200\text{ms}$ | Tiếng gầm chấn động của Chúa Tể |
| **ALARM** | Dual-tone square pulse | $880\text{Hz} \leftrightarrow 659\text{Hz}$ | $700\text{ms}$ | Chuông báo động nguy cấp vỡ tường |

---

## 3. Hướng Dẫn Cấu Hình OBS Studio Để Thu Âm Browser Source

Khi Streamer muốn đưa âm thanh từ Game Overlay (`http://localhost:5174/overlay`) vào luồng phát trực tiếp TikTok LIVE:

1. **Bước 1**: Trong OBS Studio, click đúp vào nguồn **Browser Source** của game.
2. **Bước 2**: Tích chọn ô **"Control audio via OBS"** (Điều khiển âm thanh qua OBS).
3. **Bước 3**: Trên thanh **Audio Mixer** của OBS, xuất hiện thêm thanh điều khiển âm lượng riêng cho Browser Source:
   - Kéo fader ở mức $-6.0\text{ dB}$ để âm thanh game hòa hợp hoàn hảo với giọng nói micro của Streamer.
4. **Bước 4 (Tùy chọn)**: Chuột phải vào Browser Source trong Audio Mixer ➔ **Advanced Audio Properties**:
   - Chọn **Monitor and Output** nếu Streamer muốn vừa nghe tiếng súng qua tai nghe, vừa phát cho khán giả xem LIVE.
