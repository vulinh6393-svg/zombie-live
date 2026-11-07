# PROMPT 04 — Mock LIVE simulator và realtime player actions
Đọc AGENTS.md và docs. Xây hạ tầng event giả lập nhưng logic nối hoàn toàn với engine thật.
YÊU CẦU:
Define LiveEventAdapter interface + MockAdapter và ReplayAdapter, contract NormalizedLiveEvent với Zod. Mọi event có provider, live session, user stable ID, eventKey, type, timestamp và payload chuẩn.
Local-only developer panel tạo viewer, gửi JOIN/BAN/SUA/CUU/SKILL/BOSS, mock likes, mock gift A-D, nhiều viewers, bulk events; cho chỉnh tốc độ test clock 1x/10x.
Gia nhập qua JOIN thật, render soldier name đúng ID; không tạo trùng khi gửi lại. User đã JOIN vẫn được bắn, sửa, cứu; cooldown/rate-limit per user theo server.
Queue+dedupe ở ingress; reject input không hợp lệ; normalize tiếng Việt có/không dấu. Thông báo feedback khi bị cooldown.
App phải có trạng thái MOCK MODE dễ nhìn trong dev panel, nhưng /overlay không có tool buttons. Tuyệt đối không gắn giả lập viewer là người thật.
Tạo log viewer command, xử lý lệnh hợp lệ theo thứ tự và tái lập bằng replay.
