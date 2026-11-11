import { z } from 'zod';

export const SkillCategorySchema = z.enum([
  'airstrike',
  'shield',
  'reinforcements',
  'overclock',
  'mech',
  'healing',
  'honor'
]);
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export const SkillConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: SkillCategorySchema,
  cooldownSeconds: z.number().nonnegative(),
  durationSeconds: z.number().nonnegative(),
  perMatchCap: z.number().int().positive(),
  stackPolicy: z.enum(['refresh', 'extend', 'reject', 'independent']),
  maxConcurrentInstances: z.number().int().positive(),
  warningDelayTicks: z.number().int().nonnegative().optional().default(20), // 1.0s warning marker before AoE detonation
  damageAoE: z.number().nonnegative().optional().default(0),
  damageRadius: z.number().nonnegative().optional().default(0),
  damageReductionPercent: z.number().min(0).max(1).optional().default(0),
  healAmount: z.number().nonnegative().optional().default(0),
  soldierHealAmount: z.number().nonnegative().optional().default(100),
  maxSoldiers: z.number().int().positive().optional().default(4),
  mechHp: z.number().nonnegative().optional().default(1500),
  turretFireRateMultiplier: z.number().positive().optional().default(1),
  cosmeticOnly: z.boolean().optional().default(false),
  bannerColor: z.string().optional().default('#00f5d4'),
  description: z.string(),
});
export type SkillConfig = z.input<typeof SkillConfigSchema>;

export const SKILL_REGISTRY: Record<string, SkillConfig> = {
  airstrike: {
    id: 'airstrike',
    name: 'TÊN LỬA TỔNG LỰC',
    category: 'airstrike',
    cooldownSeconds: 15,
    durationSeconds: 5,
    perMatchCap: 20,
    stackPolicy: 'independent',
    maxConcurrentInstances: 3,
    warningDelayTicks: 20, // 1s warning ring
    damageAoE: 450,
    damageRadius: 280,
    bannerColor: '#ff0055',
    description: 'Gọi bão tên lửa không kích tiêu diệt zombie trong vùng tâm chấn 280px.',
  },
  shield: {
    id: 'shield',
    name: 'KHIÊN CHẮN NĂNG LƯỢNG',
    category: 'shield',
    cooldownSeconds: 20,
    durationSeconds: 12,
    perMatchCap: 15,
    stackPolicy: 'refresh',
    maxConcurrentInstances: 1,
    damageReductionPercent: 0.5, // 50% damage reduction
    bannerColor: '#00f5d4',
    description: 'Tạo mái vòm bảo vệ giảm 50% toàn bộ sát thương tác động lên căn cứ và thành trì.',
  },
  overclock: {
    id: 'overclock',
    name: 'GIA TỐC Ụ PHÁO',
    category: 'overclock',
    cooldownSeconds: 20,
    durationSeconds: 15,
    perMatchCap: 15,
    stackPolicy: 'refresh',
    maxConcurrentInstances: 1,
    turretFireRateMultiplier: 2.0, // 2x fire rate (half cooldown ticks)
    bannerColor: '#ffbe0b',
    description: 'Tăng 100% tốc độ xả đạn của cả 3 ụ pháo tiền duyên trong 15 giây.',
  },
  reinforcements: {
    id: 'reinforcements',
    name: 'TIỂU ĐỘI CHI VIỆN',
    category: 'reinforcements',
    cooldownSeconds: 25,
    durationSeconds: 20,
    perMatchCap: 10,
    stackPolicy: 'extend',
    maxConcurrentInstances: 2,
    bannerColor: '#8338ec',
    description: 'Điều động 2 lính biệt kích tinh nhuệ trang bị súng trường công phá tiền tuyến.',
  },
  mech: {
    id: 'mech',
    name: 'ROBOT MECH HỖ TRỢ',
    category: 'mech',
    cooldownSeconds: 40,
    durationSeconds: 25,
    perMatchCap: 5,
    stackPolicy: 'reject',
    maxConcurrentInstances: 1,
    damageAoE: 80,
    damageRadius: 160,
    bannerColor: '#3a86ff',
    description: 'Đổ bộ 1 Titan Mech cơ giới hạng nặng càn quét zombie bằng đại bác đôi.',
  },
  healing: {
    id: 'healing',
    name: 'TIẾP TẾ & SỬA THÀNH',
    category: 'healing',
    cooldownSeconds: 0,
    durationSeconds: 0,
    perMatchCap: 100,
    stackPolicy: 'independent',
    maxConcurrentInstances: 10,
    healAmount: 400,
    soldierHealAmount: 100,
    bannerColor: '#10b981',
    description: 'Hồi ngay 400 HP cho Base và 100 HP cho toàn bộ chiến sĩ trực chiến.',
  },
  honor: {
    id: 'honor',
    name: 'HÀO QUANG VINH DANH',
    category: 'honor',
    cooldownSeconds: 5,
    durationSeconds: 4,
    perMatchCap: 50,
    stackPolicy: 'independent',
    maxConcurrentInstances: 5,
    cosmeticOnly: true,
    bannerColor: '#ffd166',
    description: 'Bắn pháo hoa rực rỡ và phát loa vinh danh VIP Supporter trên toàn chiến trường.',
  },
};

/**
 * Tra cứu chính xác Skill ID từ Provider Gift ID (Exact match)
 */
export const GIFT_ID_TO_SKILL_ID: Record<string, string> = {
  // Missile / Airstrike
  gift_missile: 'airstrike',
  missile: 'airstrike',
  airstrike: 'airstrike',

  // Shield
  gift_shield: 'shield',
  shield: 'shield',

  // Machinegun / Overclock
  gift_doughnut: 'overclock',
  doughnut: 'overclock',
  gift_overclock: 'overclock',
  overclock: 'overclock',
  machinegun: 'overclock',

  // Reinforcements
  gift_reinforce: 'reinforcements',
  reinforce: 'reinforcements',
  gift_reinforcements: 'reinforcements',
  reinforcements: 'reinforcements',
  gift_rose: 'reinforcements',
  rose: 'reinforcements',

  // Mech
  gift_mech: 'mech',
  mech: 'mech',
  gift_lion: 'mech',
  lion: 'mech',
  titan_mech: 'mech',

  // Healing / Repair
  gift_heart: 'healing',
  heart: 'healing',
  heal: 'healing',
  repair: 'healing',
  healing: 'healing',

  // Honor
  gift_honor: 'honor',
  honor: 'honor',
  gift_crown: 'honor',
  crown: 'honor',
  gift_firework: 'honor',
  firework: 'honor',
};

/**
 * Hàm tra cứu và validate Gift sang SkillConfig hợp lệ
 */
export function resolveGiftSkill(rawGiftId: string): SkillConfig | null {
  if (!rawGiftId) return null;
  const normalized = rawGiftId.toLowerCase().trim();
  const skillId = GIFT_ID_TO_SKILL_ID[normalized];
  if (!skillId) return null;
  return SKILL_REGISTRY[skillId] || null;
}
