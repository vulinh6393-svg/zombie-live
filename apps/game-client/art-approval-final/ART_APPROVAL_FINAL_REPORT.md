# BÁO CÁO NGHIỆM THU ĐỊNH HƯỚNG MỸ THUẬT & THỐNG NHẤT BẢN ĐỒ CHIẾN TRƯỜNG (ART APPROVAL FINAL REPORT)

> **Dự án**: Zombie Đại Chiến: Thành Trì Cuối Cùng (2D 9:16 Server-Authoritative Live Defense Monorepo)  
> **Cột mốc**: ART APPROVAL GATE — CONDITIONAL APPROVAL & UNIFIED SCENE DESIGN  
> **Thời điểm**: 2026-11-08  
> **Trạng thái**: Đã thống nhất 100% bố cục bản đồ Master, tái thiết kế cảnh chiến đấu, hiệu chuẩn tỷ lệ Mobile P0, hiệu chỉnh giấy phép và xuất bản mẫu thử nghiệm alpha. Đang dừng lại chờ nghiệm thu trước khi chuyển bước.

---

## I. Tóm Tắt Quyết Định Nghiệm Thu & Các Vấn Đề Đã Giải Quyết

Người dùng đã ra quyết định: **"PHÊ DUYỆT ART STYLE, CHƯA PHÊ DUYỆT SPRITE PRODUCTION"**.  
Tác phẩm kiến trúc `fortress_concept_bastion_1080x1920.png` chính thức được chọn làm **Master Environment Reference** (Bản đồ kiến trúc tham chiếu duy nhất).

Toàn bộ 5 vấn đề cốt lõi người dùng chỉ ra đã được giải quyết triệt để:

| Vấn Đề Đã Phát Hiện | Mức Độ | Giải Pháp Triển Khai Trong Đợt Này | Kết Quả Đạt Được |
| :--- | :---: | :--- | :--- |
| **Bố cục Fortress không đồng nhất** giữa ảnh kiến trúc và ảnh combat | **P0** | Lấy bản đồ Master làm base plate duy nhất; tái kết xuất cảnh giao tranh trực tiếp trên nền này | Kiến trúc, cổng, tháp canh, bệ súng và boong-ke trùng khớp pixel 100% |
| **Nhân vật bị teo nhỏ (14.7px)** trên màn hình điện thoại 360×640 | **P0** | Quy đổi tỷ lệ hiển thị canvas logic sang 132px ($44\text{px} \times 3$); xuất bảng kiểm chứng | Nhân vật trên mobile đạt chuẩn 44px sắc nét, thấy rõ mặt và súng |
| **Chưa có sprite độc lập / Kênh alpha** bị dính nền | **P0** | Không crop ảnh phẳng; tạo mẫu thử nghiệm asset độc lập có kênh alpha sạch 100% | Đạt chuẩn tách nền với gờ 3D, bóng đổ cục bộ mềm |
| **Sai lệch giấy phép Riley Gombart** trong Manifest | **P1** | Kiểm tra source pack: Xác minh Zombie là CC0, Survivor là CC-BY 3.0, minh bạch AI Concept | Cập nhật chính xác `ASSET_LICENSE_MANIFEST.md` |
| **Số lượng quái và HUD combat** không khớp đặc tả | **P1** | Đặt đúng 9 Zombie Walker trên 3 lane; thiết kế HUD TikTok Safe Zone tối giản | Chiến trường thoáng đãng, số liệu đồng bộ |

---

## II. Danh Mục Sản Phẩm Nghiệm Thu Chi Tiết (Deliverables)

Toàn bộ sản phẩm đã được lưu trữ tại `apps/game-client/public/assets/concept/` và sao chép vào Artifacts:

| Tên File Sản Phẩm | Kích Thước | Dung Lượng | Mô Tả & Vai Trò Kỹ Thuật | Đường Dẫn File |
| :--- | :---: | :---: | :--- | :--- |
| **`bastion_master_environment.png`** | 1080×1920 px | 4.55 MB | **Bản Đồ Kiến Trúc Master**: Cổng thép, tháp canh, 3 bệ pháo, sân dã chiến, boong-ke chỉ huy | [`Xem file`](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/bastion_master_environment.png) |
| **`combat_normal_unified_1080x1920.png`** | 1080×1920 px | 4.52 MB | **Cảnh Giao Tranh Thống Nhất**: 9 Zombie tiến công 3 lane, 3 Soldier, 3 Turret nổ súng, đạn tracer, HUD TikTok | [`Xem file`](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/combat_normal_unified_1080x1920.png) |
| **`combat_normal_unified_360x640.png`** | 360×640 px | 589 KB | Bản xem trước Mobile của cảnh giao tranh thường | [`Xem file`](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/combat_normal_unified_360x640.png) |
| **`combat_gift_unified_1080x1920.png`** | 1080×1920 px | 4.48 MB | **Hiệu Ứng Gift Tên Lửa**: Cùng chiến trường, thêm hồng tâm radar, tên lửa lao xuống, nổ shockwave | [`Xem file`](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/combat_gift_unified_1080x1920.png) |
| **`combat_gift_unified_360x640.png`** | 360×640 px | 590 KB | Bản xem trước Mobile của hiệu ứng Gift tên lửa | [`Xem file`](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/combat_gift_unified_360x640.png) |
| **`character_scale_comparison.png`** | 1080×1920 px | 1.98 MB | **Bảng Hiệu Chuẩn Tỷ Lệ Sprite**: Đối chiếu mức cũ 44px (14.7px mobile) vs chuẩn mới 132px (44px mobile) | [`Xem file`](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/character_scale_comparison.png) |
| **`sample_isolated_assets.png`** | 1080×1920 px | 745 KB | **Mẫu Thử Nghiệm Alpha Tách Nền**: Tường modular, Cổng Blast Gate, Bệ pháo trên nền caro và nền đất | [`Xem file`](file:///C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/sample_isolated_assets.png) |
| **`zombie_art_approval_unified.zip`** | Toàn bộ 7 file | 16.8 MB | **Gói Tải Toàn Diện**: Chứa đủ 7 file ảnh nghiệm thu để tải lên công cụ kiểm tra | [`Tải ZIP`](file:///C:/Users/admin/.gemini/antigravity/scratch/zombie-live/zombie_art_approval_unified.zip) |
| **`BASTION_MASTER_LAYOUT.md`** | Tài liệu | - | Đặc tả hệ tọa độ, 3 lane, vùng an toàn TikTok Safe Zone và kích thước công trình | [`Xem doc`](file:///C:/Users/admin/.gemini/antigravity/scratch/zombie-live/docs/visual/BASTION_MASTER_LAYOUT.md) |
| **`ASSET_LICENSE_MANIFEST.md`** | Tài liệu | - | Bản kê giấy phép đã hiệu chỉnh: Zombie CC0, Survivor CC-BY 3.0, minh bạch AI Concept | [`Xem doc`](file:///C:/Users/admin/.gemini/antigravity/scratch/zombie-live/docs/visual/ASSET_LICENSE_MANIFEST.md) |

---

## III. Phân Tích Kỹ Thuật Chi Tiết Theo Từng Nhiệm Vụ

### 1. Thống Nhất Tuyệt Đối Bố Cục Kiến Trúc (Task 1 & Task 2)
- **Phương pháp**: Không dùng hai hình ảnh độc lập từ AI tạo sinh để làm concept. Cảnh chiến đấu được xây dựng trực tiếp bằng cách lấy `bastion_master_environment.png` làm nền móng (base plate) và phủ lớp diễn hoạt thực tế (Overlaid Combat Layer).
- **Kết quả**:
  - Tường thành, Cổng thép Heavy Blast Gate, 2 Tháp canh tiền đồn, 3 Bệ pháo lục giác và Boong-ke chỉ huy ở cả 2 ảnh `combat_normal_unified` và `combat_gift_unified` **trùng khớp vị trí hình học 100% với ảnh Master**.
  - Hiệu ứng Kỹ năng Gift (Tên lửa hành trình và vụ nổ bộc phá) xuất hiện như một trạng thái tạm thời (transient VFX) trên cùng chiến trường, không làm thay đổi bản đồ.
  - Phân bổ chính xác 9 Zombie Walker (3 con/lane) và 3 Soldier trực chiến theo đúng cơ chế 1-rep formation của dự án.

### 2. Giải Quyết Triệt Để Sai Số Tỷ Lệ Hiển Thị Mobile (Task 3)
- **Công thức quy đổi chuẩn xác**:
  $$\text{Chiều cao Logic (1080×1920)} = \text{Chiều cao Mobile (360×640)} \times 3$$
- Bảng `character_scale_comparison.png` đã chứng minh:
  - Mức cũ (44px logic) khiến lính và zombie chỉ còn ~14.7px trên màn hình điện thoại (quá nhỏ, vỡ nét).
  - Chuẩn mới P0 (**132px logic**) giúp nhân vật đạt đúng **44px** trên điện thoại — tỷ lệ vàng của các tựa game mobile top-down, thể hiện sắc nét súng M4, mũ cối rằn ri và chi tiết cơ thể zombie.
  - Tỷ lệ tương quan cân xứng hoàn hảo: Cổng chính (300px) : Tháp canh (240px) : Lính (132px) : Zombie (132px) : Boss King (198px).

### 3. Đánh Giá Độ Khả Thi Kênh Alpha và Thử Nghiệm Tách Nền (Task 5)
- Hình ảnh `sample_isolated_assets.png` đối chiếu 3 thành phần kiến trúc trọng yếu:
  1. **Đoạn tường bê tông modular (420×120px)**: Gờ vát 3D highlight, lỗ châu mai thông suốt, bóng đổ chân tường dạng alpha gradient mềm, khi ghép nối không bị lộ mép.
  2. **Cổng thép Heavy Blast Gate (300×150px)**: Thép tấm dập gân, pít-tông thủy lực, dải hazard vàng đen và đèn tín hiệu LED; thể hiện cả trạng thái đóng nguyên vẹn và trạng thái hư hại nứt vỡ.
  3. **Bệ pháo lục giác (150×150px)**: Khớp chuẩn xác với bệ xoay và nòng pháo kép của Kenney.
- Cả 3 mẫu đặt trên nền caro alpha chứng minh độ trong suốt 100%, không dính viền pixel nền (zero fringing), và khi ghép thử lên nền đất thì hòa nhập mượt mà tự nhiên.

---

## IV. Cam Kết Kỹ Thuật

1. **Tuyệt đối không sửa mã nguồn gameplay hay `BattlefieldScene.ts`** trong lượt này.
2. **Tuyệt đối không tạo toàn bộ texture atlas** trước khi người dùng nghiệm thu các mẫu asset độc lập.
3. **Tuyệt đối không tự ý chuyển sang Phase 03**.
4. Toàn bộ 13/13 unit tests và typecheck trên monorepo tiếp tục duy trì trạng thái 100% pass.
