# PROMPT 06 — Gift mapping và deterministic skill effects
Đọc AGENTS.md + docs. Implement gift service dùng event chuẩn, KHÔNG giả định TikTok LIVE thật.
YÊU CẦU:
Table gift_mappings includes provider+gift_id, skill ID, enabled, per-trigger cap, cooldown. Only enabled + verified IDs trigger effect; unknown gifts get audit log, no side effects. No prices/donation payout calculations.
6 skills per PRD/GAME_BALANCE: reinforcements, machinegun, shield, airstrike, mech, honor. Visual event & gameplay state both rendered; stacking rules explicit, concurrency capped.
Correct cumulative gift streak tracking: interim updates update preview ONLY, final settle delta/total ONCE, duplicate finals ignored. Key streak by room/sender/gift/group ID when available; tricky missing IDs => conservative handling, safe audit, no fabricated count. Distinguish separate identical gift events that are legitimate.
Queue short burst, cap gameplay effect to avoid overwhelming renderer; overflow cosmetic acknowledgment. Emit event skill:triggered and gift:recognized, stream overlay messages <=3s.
Add dev gift tests: non-streak single gift, streak counts 1→2→5 final, duplicate final, two simultaneous streaks, unknown ID, disabled mapping.
