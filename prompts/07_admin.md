# PROMPT 07 — Web dashboard quản trị
Đọc AGENTS.md + docs. Bổ sung apps/admin Next.js TS giao diện tiếng Việt, server API có auth.
YÊU CẦU:
Dashboard: live bridge status; game health/wave/base HP, event rate, player count, active skills; pause/resume/restart match as controlled actions.
Gift Mapping: list/add/disable gift IDs, skill mapping/caps, audit trail, no hardcoded coin prices.
Game Balance: read/update selected limits with version history, changes apply next match only, not retroactively mid-match.
Moderation: ban/timeout user from game actions; nickname sanitize; protect against spoofed dev endpoints.
Analytics: basic spectators if available, unique participants, return participants, processed gifts, duplicates/errors, server FPS/tick lag. Clearly mark unavailable TikTok metrics.
Admin login with secure password hashed (not plaintext) and rate limiting, secure session cookies; local bootstrap flow via env + scripted setup; no public defaults.
