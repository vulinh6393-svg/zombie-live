export interface AssetMetadata {
  key: string;
  category: 'character' | 'boss' | 'tower' | 'base' | 'vfx' | 'ui';
  width: number;
  height: number;
  origin: 'procedural_vector' | 'kenney_cc0';
  license: 'CC0' | 'Project-Original';
  description: string;
}

export const ASSET_REGISTRY: Record<string, AssetMetadata> = {
  // --- Characters ---
  soldier_tactical: {
    key: 'soldier_tactical',
    category: 'character',
    width: 56,
    height: 56,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Chiến binh survivor với mũ cối ngọc bích, giáp ngực và súng trường carbine',
  },

  // --- 10 Zombie Types ---
  zombie_walker: {
    key: 'zombie_walker',
    category: 'character',
    width: 52,
    height: 52,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Walker 1.0x - Dáng gù lưng, áo rách, hai tay giơ thẳng phía trước',
  },
  zombie_runner: {
    key: 'zombie_runner',
    category: 'character',
    width: 44,
    height: 44,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Runner 0.9x - Thân hình thể thao thon gọn, nghiêng dốc về trước, màu cam neon',
  },
  zombie_armored: {
    key: 'zombie_armored',
    category: 'character',
    width: 62,
    height: 62,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Armored 1.2x - Mũ sắt gai nhọn, giáp vai thép chữ nhật và khiên chắn',
  },
  zombie_spitter: {
    key: 'zombie_spitter',
    category: 'character',
    width: 56,
    height: 56,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Spitter 1.1x - Họng phồng to, các túi độc xanh chanh phát sáng trên lưng',
  },
  zombie_healer: {
    key: 'zombie_healer',
    category: 'character',
    width: 52,
    height: 52,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Healer 1.0x - Balo cứu trợ hóa chất, hào quang chữ thập trắng y tế',
  },
  zombie_brute: {
    key: 'zombie_brute',
    category: 'character',
    width: 88,
    height: 88,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Brute 1.6x - Khối cơ bắp khổng lồ, nắm đấm đá tảng, gai sừng vai đỏ',
  },
  zombie_shocker: {
    key: 'zombie_shocker',
    category: 'character',
    width: 56,
    height: 56,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Shocker 1.1x - Cuộn cao áp sau lưng, tia sét vàng giật quanh thân',
  },
  zombie_summoner: {
    key: 'zombie_summoner',
    category: 'character',
    width: 64,
    height: 64,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Summoner 1.25x - Áo choàng pháp sư có mũ trùm nhọn, quả cầu linh hồn tím',
  },
  zombie_shadow: {
    key: 'zombie_shadow',
    category: 'character',
    width: 48,
    height: 48,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Shadow 1.0x - Dáng thấp bán trong suốt (alpha 0.65), đôi mắt cyan hẹp sắc',
  },
  zombie_king: {
    key: 'zombie_king',
    category: 'boss',
    width: 150,
    height: 150,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Zombie King 3.0x - Trùm khổng lồ, vương miện hoàng gia nạm ngọc, hào quang cuồng nộ',
  },

  // --- Towers ---
  tower_rapid_mg: {
    key: 'tower_rapid_mg',
    category: 'tower',
    width: 76,
    height: 76,
    origin: 'kenney_cc0',
    license: 'CC0',
    description: 'Tháp súng máy nòng đôi bắn liên thanh',
  },
  tower_plasma: {
    key: 'tower_plasma',
    category: 'tower',
    width: 76,
    height: 76,
    origin: 'kenney_cc0',
    license: 'CC0',
    description: 'Pháo plasma năng lượng tụ điện',
  },
  tower_tesla: {
    key: 'tower_tesla',
    category: 'tower',
    width: 76,
    height: 76,
    origin: 'kenney_cc0',
    license: 'CC0',
    description: 'Tháp điện Tesla phóng hồ quang sấm sét',
  },

  // --- Base & Map ---
  base_fortress: {
    key: 'base_fortress',
    category: 'base',
    width: 980,
    height: 180,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Pháo đài căn cứ thép kiên cố 4 trạng thái HP',
  },
  road_asphalt: {
    key: 'road_asphalt',
    category: 'base',
    width: 180,
    height: 360,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Mặt đường nhựa hoang tàn có vạch kẻ làn',
  },

  // --- VFX ---
  vfx_bullet: {
    key: 'vfx_bullet',
    category: 'vfx',
    width: 6,
    height: 20,
    origin: 'kenney_cc0',
    license: 'CC0',
    description: 'Tia đạn tracer vàng',
  },
  vfx_spark: {
    key: 'vfx_spark',
    category: 'vfx',
    width: 12,
    height: 12,
    origin: 'kenney_cc0',
    license: 'CC0',
    description: 'Đốm lửa tia lửa nổ',
  },
  vfx_shield: {
    key: 'vfx_shield',
    category: 'vfx',
    width: 140,
    height: 140,
    origin: 'procedural_vector',
    license: 'Project-Original',
    description: 'Vòng khiên phòng thủ năng lượng',
  },
};
