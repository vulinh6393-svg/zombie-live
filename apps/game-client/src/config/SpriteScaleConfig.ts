/**
 * Sprite Scale Configuration for Portrait Mobile Livestream
 * 
 * Target Logical Canvas: 1080 x 1920 (9:16)
 * Target Preview on Mobile: 360 x 640 (Scale factor 1/3)
 */

export interface ScalePreset {
  id: 'A' | 'B' | 'C';
  name: string;
  mobileDisplayPx: number; // Pixels on 360x640 preview
  logicalDisplayPx: number; // Pixels on 1080x1920 logical canvas
  scaleMultiplier: number; // Relative scale multiplier for sprites
  description: string;
}

export const SPRITE_SCALE_PRESETS: Record<'A' | 'B' | 'C', ScalePreset> = {
  A: {
    id: 'A',
    name: 'Compact (32px preview)',
    mobileDisplayPx: 32,
    logicalDisplayPx: 96,
    scaleMultiplier: 0.35, // ~96px for ~280px source frame
    description: 'Tương đương 32px trên điện thoại 360x640 - Cho phép hiển thị mật độ cao nhưng chi tiết nhỏ',
  },
  B: {
    id: 'B',
    name: 'Standard (40px preview) [RECOMMENDED]',
    mobileDisplayPx: 40,
    logicalDisplayPx: 120,
    scaleMultiplier: 0.44, // ~120px for ~280px source frame
    description: 'Tương đương 40px trên điện thoại 360x640 - Tối ưu nhận diện chi tiết đầu, thân, vũ khí và bước chân',
  },
  C: {
    id: 'C',
    name: 'Large (48px preview)',
    mobileDisplayPx: 48,
    logicalDisplayPx: 144,
    scaleMultiplier: 0.52, // ~144px for ~280px source frame
    description: 'Tương đương 48px trên điện thoại 360x640 - Cực kỳ rõ ràng, phù hợp cho livestream màn hình nhỏ',
  },
};

export const DEFAULT_SCALE_PRESET = SPRITE_SCALE_PRESETS.B;
