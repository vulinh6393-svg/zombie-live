# Đặc Tả Chuyển Động & Hiệu Ứng (Animation Specs)

Dự án: **Zombie Đại Chiến: Thành Trì Cuối Cùng**  
Engine: **Phaser 3.90 (Sprite, Container, Tweens, Particles)**

---

## 1. Zombie Animation Specs
* **Spawn (Xuất hiện):**
  * Thời lượng: `350ms`.
  * Easing: `Back.easeOut`.
  * Mô tả: Phóng to từ scale 0 lên 1.0 kèm hạt bụi xám bốc lên từ mặt đất.
* **Walk (Di chuyển):**
  * Tần số: `8 Hz` loop.
  * Trục Y: Nhấp nhô `Math.sin(time * 0.008) * 3px`.
  * Trục góc (Rotation): Nghiêng lảo đảo qua lại `-0.05` đến `+0.05` rad.
  * Tốc độ: Điều chỉnh tương ứng theo chỉ số `speed` trong `GAME_BALANCE.json` (Runner bước nhanh gấp đôi Walker).
* **Hit (Trúng đạn):**
  * Thời lượng: `90ms`.
  * Hiệu ứng: `sprite.setTintFill(0xffffff)` sau đó xóa tint; lùi nhẹ `4px` về phía sau (micro-recoil).
* **Death (Tử trận):**
  * Thời lượng: `400ms`.
  * Easing: `Power2.easeIn`.
  * Hiệu ứng: Alpha từ `1.0 -> 0`, thu nhỏ `scale -> 0.2`, phát tán hạt bụi tan biến, sau đó giải phóng container về pool.

---

## 2. Survivor Soldier Animation Specs
* **Idle (Nghỉ/Chờ):**
  * Nhịp thở: Co giãn scale Y từ `1.0 -> 1.03` trong `900ms` yoyo loop.
* **Fire (Bắn súng):**
  * Recoil súng: Giật lùi `5px` trong `60ms`, hồi phục trong `80ms`.
  * Muzzle flash: Tia chớp vàng cam lóe sáng ở đầu nòng trong `70ms`.
  * Projectile tracer: Tia đạn vàng bay với vận tốc `180ms` tới mục tiêu.
* **Hit & Death:**
  * Chớp đỏ khi bị zombie cắn trúng, ngã gục khi hết máu.

---

## 3. Boss Zombie King Specs
* **Entrance (Xuất hiện):**
  * Thời lượng: `1200ms`.
  * Hiệu ứng: Rung chuyển nhẹ màn hình (Camera shake `0.005`), vương miện bùng sáng, vòng hào quang đỏ thẫm mở rộng bán kính từ `0 -> 80px`.
* **Rage Pulse (Hào quang cuồng nộ):**
  * Nhịp tim: Đập phồng co giãn từ `0.95 -> 1.08` chu kỳ `1000ms`.
* **Special Shockwave (Đòn cuồng phong):**
  * Thời lượng: `600ms`.
  * Vòng tròn xung kích đỏ quét lan tỏa bán kính `180px`.

---

## 4. Visual Effects (VFX)
* **Bullet Tracer:** Vệt đạn thon nhọn có đuôi mờ dần, tốc độ bay nhanh.
* **Hit Impact:** 3-5 đốm lửa cam li ti bung ra tại điểm chạm đạn (`120ms`).
* **Damage Numbers:**
  * Sát thương thường: Màu đỏ `#ff3333`, font size 22, bay lên `50px` mờ dần trong `650ms`.
  * Sát thương chí mạng: Màu vàng `#fee440`, font size 28 kèm chữ `CRIT!`.
  * Hồi máu: Màu xanh ngọc `#00f5d4`, font size 22 kèm chữ `+HP`.
* **Shield Dome:** Vòng khiên năng lượng cyan bao bọc căn cứ, giảm 30% sát thương visual.
