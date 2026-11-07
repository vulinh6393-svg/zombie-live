# Bảng Thiết Kế Nhân Vật & Quái Vật (Character Sheet)

Dự án: **Zombie Đại Chiến: Thành Trì Cuối Cùng**  
Tỷ lệ đối chiếu ở độ phân giải mobile preview 360 × 640:

---

## 1. Phe Ta: Chiến Binh Sống Sót (Survivor Soldier)
* **Kích thước:** Chiều cao 56px (tỷ lệ 1.0x, hiển thị ~30px ở 360p).
* **Đặc điểm hình thể & trang bị:**
  * Mũ cối chiến thuật màu xanh ngọc (`#00f5d4`) có kính chống độc bảo hộ.
  * Giáp thân Kevlar màu xanh hải quân (`#0077b6`) có viền đen bảo vệ ngực.
  * Súng trường tấn công carbine nòng đen thép kèm đèn ngắm quang học.
  * Nameplate tên người xem hiển thị phía trên đầu kèm thanh HP mini.
* **Hoạt ảnh:**
  * `Idle`: Nhấp nhô ngực thở nhẹ.
  * `Fire`: Súng giật lùi 4px, lóe sáng nòng vàng cam, phóng tia đạn tracer.
  * `Death`: Ngã quỵ và mờ dần.

---

## 2. Phe Địch: 10 Chủng Zombie Riêng Biệt (Dựa trên `GAME_BALANCE.json`)

| STT | Tên mã | Tên tiếng Việt | Tỷ lệ | Silhouette & Dấu hiệu nhận diện đặc trưng | Màu chủ đạo |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **1** | `walker` | Zombie Thường | **1.0x** (52px) | Dáng gù lưng, hai tay giơ thẳng phía trước, đầu to bước đi lảo đảo xiêu vẹo | Xanh lục thối (`#38b000`) |
| **2** | `runner` | Zombie Chạy | **0.9x** (44px) | Thân hình mảnh khảnh, chân dài, thân trên nghiêng dốc về phía trước góc 30 độ | Cam đỏ neon (`#f72585`, `#ff5400`) |
| **3** | `armored` | Zombie Giáp | **1.2x** (62px) | Vai bọc thép gai nhọn, mũ sắt trùm kín đầu, cầm khiên chắn hình chữ nhật trước ngực | Thép xám & vàng kim (`#6c757d`, `#ffd166`) |
| **4** | `spitter` | Zombie Độc | **1.1x** (56px) | Cổ họng và miệng phồng to chứa dịch độc, các túi mủ axit xanh nõn chuối phát sáng trên lưng | Tím độc & chanh nõn (`#7209b7`, `#ccff33`) |
| **5** | `healer` | Zombie Hồi Máu | **1.0x** (52px) | Balo chứa bình truyền hóa chất xanh ngọc, hào quang vòng tròn chữ thập trắng y tế phát sáng | Xanh ngọc bích & trắng (`#06d6a0`, `#ffffff`) |
| **6** | `brute` | Zombie Khổng Lồ | **1.6x** (84px) | Khối lượng cơ bắp khổng lồ, hai nắm đấm to như tảng đá, gai sừng đỏ nhô ra từ bả vai | Tím thẫm & nứt đỏ (`#3a0ca3`, `#d90429`) |
| **7** | `shocker` | Zombie Điện | **1.1x** (56px) | Cuộn dây cao thế trên lưng, tia hồ quang điện vàng nhấp nháy chạy quanh thân | Xanh điện & vàng sét (`#4cc9f0`, `#fee440`) |
| **8** | `summoner` | Zombie Triệu Hồi | **1.25x** (64px) | Áo choàng pháp sư có mũ trùm đầu nhọn, bay lơ lửng quả cầu linh hồn tím và đầu lâu mini | Tím đậm huyền bí (`#240046`, `#9d4edd`) |
| **9** | `shadow` | Zombie Bóng Tối | **1.0x** (48px) | Dáng người thấp, bán trong suốt với làn khói đen mờ bao phủ, chỉ lộ ra đôi mắt xanh cyan sắc lẹm | Đen khói bán trong (`#10002b`, `#00f5d4`) |
| **10**| `zombie_king` | Zombie Vua (BOSS) | **3.0x** (150px) | Trùm khổng lồ, giáp trụ hoàng đế gai góc, đội vương miện vàng nạm hồng ngọc, vòng hào quang cuồng nộ đỏ thẫm | Đỏ máu, tím hoàng gia, vàng kim (`#800f2f`, `#ffb703`) |

> **Nguyên tắc nhận diện:** Người xem có thể phân biệt ngay lập tức cả 10 loại zombie chỉ bằng hình bóng (silhouette) và cấu trúc hình học mà không cần nhìn đến nhãn chữ.
