# PROMPT 05 — Database, profile, missions & leaderboards
Đọc AGENTS.md + docs, implement PostgreSQL Prisma models migration + seed. Không thay đổi game art.
YÊU CẦU:
Models: players (provider+stable_id unique), live_sessions, matches, match_players, event_log (eventKey unique), gift_mappings, missions, mission_progress, reward_grants (source_key unique), player_inventory, leaderboard_snapshots.
Repository layer with transactions/idempotency and safe migrations. Không xóa dữ liệu có sẵn; seed demo riêng, theo môi trường.
XP/level calculation function, mission tracking gồm 5 nhiệm vụ cá nhân; match-level scoring có kills,assists,repairs,rescues,bossDamage; gift-induced damage tracked separately, excluded/capped in competitive score.
Match leaderboard + daily helpers + weekly boss damage + seasonal progression. Reset ngày theo Asia/Ho_Chi_Minh, UTC timestamps lưu DB.
Result settle transactional only once, mission completion once, reward_grants unique; preserve player state on restart.
API GET /api/me?provider=mock&userId=... local demo, GET /api/leaderboards?scope=match|daily|weekly|season with safe validation; no arbitrary private user info.
