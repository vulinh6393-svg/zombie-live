# PROMPT 03 — Server-authoritative deterministic engine
Đọc AGENTS.md + docs, giữ API TypeScript chung. Thực hiện gameplay engine CHẠY THẬT ở backend, không giả lập bằng frontend.
YÊU CẦU:
Logical tick 20Hz, deterministic seeded PRNG, waves + boss + results theo lịch 300 giây trong GAME_BALANCE; monotonic clock; pause/replay/accelerated test clock.
State machine PREPARING,WAVE_1,WAVE_2,WAVE_3,WAVE_4,BOSS,RESULTS,RESET,PAUSED (điều chỉnh mapping để đợt 5/boss không mâu thuẫn, giải thích rõ). Một trạng thái duy nhất tại thời điểm bất kỳ.
AI của 10 zombie gồm walker,runner,armored,spitter,healer,brute,shocker,summoner,shadow,king. Có pathfinding đơn giản, range attack, priority, status effect, repair, summoned zombies, stun, invisibility, boss 3 phases. Tính damage/armor/HP thật theo config.
Server quản lý soldiers, user contribution, 40 visible soldiers cap với reserve squad; mục tiêu chống phá căn cứ. Dùng spawn-budget có giới hạn, vừa sức phòng thủ miễn phí.
Socket.IO emit authoritative snapshots 10Hz và phase/result events; renderer chỉ nội suy. Có state sync khi client reconnect.
Kết quả: boss chết + base sống trước deadline => thắng; base <=0 hoặc boss còn sống tại mốc 280s => thua; phát result đúng 1 lần. Giai đoạn 280-300s hiển thị kết quả.
Không dùng quà/tương tác thật ở bước này, dùng synthetic commands từ game tests.
