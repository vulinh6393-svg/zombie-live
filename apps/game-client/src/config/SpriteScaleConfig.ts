/**
 * Sprite Scale Configuration for Portrait Mobile Livestream
 * 
 * Target Logical Canvas: 1080 x 1920 (9:16)
 * Target Preview on Mobile: 360 x 640 (Scale factor 1/3)
 * 
 * CALIBRATION CRITERIA (Phase 02.2.1):
 * - Measurements are based on actual alpha-trimmed body dimensions (torso + head + legs):
 *   * Walker alpha-trimmed body height: 196 px (raw texture 288x311)
 *   * Soldier alpha-trimmed body height: 156 px (raw texture 313x206, excluding outstretched rifle barrel)
 * - Scale multipliers are calibrated individually so BOTH characters have matched display body heights
 *   at 36px, 44px, and 52px on mobile 360x640 preview (108px, 132px, 156px on 1080x1920 canvas).
 */

export interface ScaleTier {
  id: '36px' | '44px' | '52px';
  name: string;
  mobileBodyHeightPx: number; // Pixels on 360x640 preview
  logicalBodyHeightPx: number; // Pixels on 1080x1920 canvas
  walkerScale: number; // Exact multiplier for Walker
  soldierScale: number; // Exact multiplier for Soldier
  description: string;
}

export const SPRITE_SCALE_TIERS: Record<'36px' | '44px' | '52px', ScaleTier> = {
  '36px': {
    id: '36px',
    name: 'Compact (Thân 36px di động / 108px logic)',
    mobileBodyHeightPx: 36,
    logicalBodyHeightPx: 108,
    walkerScale: 0.551, // 108 / 196
    soldierScale: 0.692, // 108 / 156
    description: 'Thân cao 36px trên điện thoại - Mật độ cao, hiển thị được nhiều đơn vị',
  },
  '44px': {
    id: '44px',
    name: 'Standard [RECOMMENDED] (Thân 44px di động / 132px logic)',
    mobileBodyHeightPx: 44,
    logicalBodyHeightPx: 132,
    walkerScale: 0.673, // 132 / 196
    soldierScale: 0.846, // 132 / 156
    description: 'Thân cao 44px trên điện thoại - Cân đối hoàn hảo giữa chi tiết nhận diện và bố cục',
  },
  '52px': {
    id: '52px',
    name: 'Large (Thân 52px di động / 156px logic)',
    mobileBodyHeightPx: 52,
    logicalBodyHeightPx: 156,
    walkerScale: 0.796, // 156 / 196
    soldierScale: 1.000, // 156 / 156
    description: 'Thân cao 52px trên điện thoại - Cực kỳ nổi bật, thấy rõ từng chuyển động ngón tay và nòng súng',
  },
};

export const DEFAULT_SCALE_TIER = SPRITE_SCALE_TIERS['44px'];
