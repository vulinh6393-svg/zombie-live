# PROMPT 08 — OBS/browser source & safe continuous game engine
Đọc AGENTS.md + docs. Không tự phát LIVE hoặc công bố 24/7 platform permission.
YÊU CẦU:
Create /overlay (9:16 1080x1920, no mock controls, no debug text); no arbitrary keyboard input required.
Provide docs/OBS_SETUP.md: start local services, OBS Browser Source URL, viewport 1080x1920, audio route, OBS scene, local record, video tests; OBS integration by user, no TikTok credentials.
Engine auto-start new match after result; when no participants, idle/training state or reduced spawn, clearly labeled, no fake activity.
Reconnect websocket with backoff, resync snapshots; bridge state machine connected/disconnected/retrying, never claim real connection when mock.
Graceful shutdown, health/ready endpoints, logs and restart policy Docker; checkpoint + safe recovery strategy for interrupted match.
Ability for operator to pause, mute sounds and stop game promptly; alerts if bridge disconnected or queues are backed up.
