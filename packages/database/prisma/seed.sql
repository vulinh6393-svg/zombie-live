-- Seed Initial Daily Missions
INSERT INTO "missions" ("id", "code", "title", "description", "target_value", "xp_reward") VALUES
('m_daily_join', 'DAILY_JOIN', 'Tham chiến bảo vệ thành trì', 'Gia nhập một trong 3 tiểu đội Alpha, Bravo hoặc Charlie', 1, 50),
('m_daily_shoot', 'DAILY_SHOOT', 'Xả đạn trợ kích hỏa lực', 'Gửi lệnh BAN để tăng cường hỏa lực phòng thủ 5 lần', 5, 100),
('m_daily_repair', 'DAILY_REPAIR', 'Hàn gắn gia cố tường thành', 'Gửi lệnh SUA để sửa chữa tường thành khi bị hư hại 3 lần', 3, 100),
('m_daily_rescue', 'DAILY_RESCUE', 'Tiếp viện cứu trợ đồng đội', 'Gửi lệnh CUU để hồi sinh lực cho binh lính trực chiến 2 lần', 2, 150),
('m_daily_boss', 'DAILY_BOSS', 'Chiến đấu diệt Zombie King', 'Gửi lệnh BOSS để tập trung toàn bộ ụ súng tiêu diệt Boss', 1, 200)
ON CONFLICT ("code") DO NOTHING;

-- Seed Default Gift Mappings
INSERT INTO "gift_mappings" ("id", "provider", "gift_id", "skill_id", "enabled", "cooldown_seconds", "per_trigger_cap") VALUES
('gm_shield', 'mock', 'gift_shield', 'shield', true, 15, 1),
('gm_missile', 'mock', 'gift_missile', 'airstrike', true, 20, 1),
('gm_mech', 'mock', 'gift_mech', 'mech', true, 30, 1),
('gm_tiktok_rose', 'tiktok', '5655', 'shield', true, 10, 1),
('gm_tiktok_gun', 'tiktok', '5658', 'airstrike', true, 20, 1)
ON CONFLICT ("provider", "gift_id") DO NOTHING;
