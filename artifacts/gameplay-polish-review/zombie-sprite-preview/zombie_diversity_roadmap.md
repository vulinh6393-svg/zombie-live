# Lộ Trình Kỹ Thuật Đa Dạng Hóa Sprite Zombie (Zombie Diversity Roadmap)

> **Phân loại**: Nghiên cứu & Preview Kiến Trúc (Research & Technical Preview)  
> **Trạng thái thực thi**: Giữ nguyên Renderer mặc định (`Walker` sprite của Riley Gombart CC0) trong game chính. Không thay đổi code runtime khi chưa có phê duyệt chính thức.

---

## 1. Rà Soát Hiện Trạng (Baseline Audit)

| Chủng Loại Zombie | File Asset Hiện Tại | Hoạt Ảnh Thực Tế | Scale Factor | Hạn Chế Trực Quan Trên Mobile |
| :--- | :--- | :--- | :--- | :--- |
| **Walker** | `characters/zombie/move/move_*.png` | Shambling Bipedal Walk (17 frames) | `1.0x` | Chuẩn cơ bản, dễ nhận biết. |
| **Runner** | `characters/zombie/move/move_*.png` | *Chung sprite Walker* | `0.85x` | Chỉ thu nhỏ kích thước, dáng đi vẫn lừ đừ, không toát lên tốc độ cao. |
| **Tank / Brute** | `characters/zombie/move/move_*.png` | *Chung sprite Walker* | `1.35x` | Chỉ phóng to Walker, thiếu cơ bắp biến dị, giáp trụ và cảm giác đe dọa nặng nề. |
| **Zombie King / Boss** | `characters/zombie/move/move_*.png` | *Chung sprite Walker* | `1.70x` | Phóng to một zombie thường làm mất đi sự hoành tráng của trùm cuối, không kích thích tặng quà diệt boss. |

---

## 2. Thiết Kế 4 Bút Pháp Hình Học (Silhouettes & Color Coding)

```
        [ RUNNER ]               [ WALKER ]                [ TANK ]                    [ BOSS ]
    Khom lưng, 4 chân        2 chân nghiêng ngả        Gù lưng hộ pháp             Khổng lồ thiết giáp
        (21×29 px)               (28×32 px)               (47×45 px)                  (62×60 px)
     Crimson / Blood           Dark Green / Mud        Bone Carapace / Slate        Void Violet / Obsidian
```

### Chi Tiết Từng Chủng Loại:
1. **Walker (Zombie Thường)**:
   - *Dáng dấp*: Đi lảo đảo, tay vươn về phía trước, quần áo rách rưới của thị dân bị nhiễm độc.
   - *Màu sắc nhận diện*: Da xanh rêu nhạt (`#4d6b53`), áo xám rách (`#334155`).
   - *Đặc điểm âm thanh*: Tiếng rên rỉ vô thức, bước chân lết trên mặt đường.

2. **Runner (Kẻ Cuồng Chạy)**:
   - *Dáng dấp*: Khom sát mặt đất (quadrupedal prowl), chân tay móng vuốt cào xé đường nhựa, đuôi mắt vệt sáng đỏ.
   - *Màu sắc nhận diện*: Da đỏ thẫm gân máu (`#881337`), mắt rực lửa (`#ef4444`).
   - *Đặc điểm âm thanh*: Tiếng rít the thé, nhịp chân chạy rầm rập 24 FPS.

3. **Tank / Brute (Quái Vật Thiết Giáp)**:
   - *Dáng dấp*: Bờ vai đồ sộ gấp 3 lần Walker, lưng gù có gai xương mọc xuyên qua da, hai tay to như thân cây.
   - *Màu sắc nhận diện*: Giáp xương ngà voi (`#e2e8f0`), da xanh lục sẫm đầm lầy (`#365314`).
   - *Đặc điểm âm thanh*: Tiếng gầm trầm đục làm rung màn hình, bước đi nặng nề gây chấn động nhẹ (screen rumble 1px).

4. **Zombie King / Nemesis (Chúa Tể Thành Trì)**:
   - *Dáng dấp*: Chiều cao vượt trội, đội mũ giáp gai kim loại, cầm đại đao thanh ray xe lửa rỉ sét, hào quang hắc ám phát sáng.
   - *Màu sắc nhận diện*: Giáp đen hắc diện thạch (`#0f172a`), lõi ngực phát sáng tím thạch anh (`#a855f7`).
   - *Đặc điểm âm thanh*: Tiếng gầm lệnh triệu hồi bầy đàn, còi báo động toàn thành trì đỏ rực.

---

## 3. Lộ Trình Tích Hợp Kỹ Thuật (Architecture & Runtime Roadmap)

1. **Bước 1 — Chuẩn bị Texture Atlases**:
   - Xuất 4 bộ spritesheet độc lập vào `apps/game-client/public/assets/characters/`:
     * `characters/runner/runner_atlas.json`
     * `characters/tank/tank_atlas.json`
     * `characters/boss/boss_atlas.json`
   - Kiểm tra kênh Alpha sạch (0% black halo) và kích thước lũy thừa 2 (Power of Two: 1024×1024 hoặc 2048×2048) để tối ưu GPU VRAM.

2. **Bước 2 — Cập nhật CharacterAnimationRegistry.ts**:
   - Đăng ký animation keys riêng biệt:
     ```typescript
     // Runner
     scene.anims.create({ key: 'runner-sprint', frames: ..., frameRate: 24, repeat: -1 });
     // Tank
     scene.anims.create({ key: 'tank-march', frames: ..., frameRate: 10, repeat: -1 });
     // Boss
     scene.anims.create({ key: 'boss-stride', frames: ..., frameRate: 12, repeat: -1 });
     ```

3. **Bước 3 — Mở Rộng ZombieRenderer.ts Không Phá Vỡ API**:
   - Ánh xạ type snapshot:
     ```typescript
     const ANIM_MAP: Record<ZombieType, Record<ZombieVisualState, string>> = {
       walker: { idle: 'walker-idle', walk: 'walker-walk', attack: 'walker-attack', death: 'walker-corpse' },
       runner: { idle: 'runner-idle', walk: 'runner-sprint', attack: 'runner-pounce', death: 'runner-death' },
       tank:   { idle: 'tank-idle',   walk: 'tank-march',  attack: 'tank-slam',    death: 'tank-collapse' },
       boss:   { idle: 'boss-idle',   walk: 'boss-stride', attack: 'boss-cleave',  death: 'boss-death' }
     };
     ```

4. **Bước 4 — Đo Đạc & Tối Ưu Draw Calls**:
   - Gộp chung các frame vào 1 texture atlas duy nhất `zombies_mega_atlas.png` để duy trì **1 WebGL Draw Call** duy nhất cho toàn bộ bầy zombie 50 con, giữ vững 60 FPS trên thiết bị yếu.
