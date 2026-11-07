import Phaser from 'phaser';
import { SpriteAssetLoader } from '../assets/SpriteAssetLoader.js';
import { FortressRenderer } from '../renderer/FortressRenderer.js';
import { TowerRenderer } from '../entities/TowerRenderer.js';
import { SoldierRenderer } from '../entities/SoldierRenderer.js';
import { DEFAULT_SCALE_TIER } from '../config/SpriteScaleConfig.js';
import { GAME_FONTS } from '../config/FontConfig.js';

export class FortressArtScene extends Phaser.Scene {
  private fortress!: FortressRenderer;
  private towers: TowerRenderer[] = [];
  private soldiers: SoldierRenderer[] = [];

  constructor() {
    super({ key: 'FortressArtScene' });
  }

  preload() {
    SpriteAssetLoader.loadAll(this);
  }

  create() {
    const urlParams = new URLSearchParams(window.location.search);
    const layout = urlParams.get('layout') === '2' ? 'bastion' : 'highway';

    // 1. Background ground
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x0c0f15, 1);
    bg.fillRect(0, 0, 1080, 1920);

    // 2. Asphalt road bed
    const road = this.add.graphics().setDepth(2);
    road.fillStyle(0x181c24, 1);
    road.fillRect(140, 220, 800, 1150);

    // Double yellow line
    road.fillStyle(0xebaf25, 0.9);
    road.fillRect(535, 220, 4, 1150);
    road.fillRect(542, 220, 4, 1150);

    // 3. Render Independent Fortress Architecture
    this.fortress = new FortressRenderer(this, layout);

    // 4. Mount 3 Sentry Turrets
    const turretPositions = [
      { id: 'turret_alpha', name: 'Ụ Pháo Alpha', type: 'machinegun' as const, x: 260, y: 1395, level: 1 },
      { id: 'turret_bravo', name: 'Ụ Pháo Bravo', type: 'plasma' as const, x: 540, y: 1370, level: 1 },
      { id: 'turret_charlie', name: 'Ụ Pháo Charlie', type: 'tesla' as const, x: 820, y: 1395, level: 1 },
    ];
    for (const t of turretPositions) {
      this.towers.push(new TowerRenderer(this, t));
    }

    // 5. Place 1 Representative Soldier per Squad (Alpha, Bravo, Charlie)
    const squadReps = [
      { id: 'alpha_rep', name: 'Alpha Xạ Thủ', x: 260, y: 1320, squad: 'alpha' },
      { id: 'bravo_rep', name: 'Bravo Đội Trưởng', x: 540, y: 1300, squad: 'bravo' },
      { id: 'charlie_rep', name: 'Charlie Hỏa Lực', x: 820, y: 1320, squad: 'charlie' },
    ];
    for (const rep of squadReps) {
      const s = new SoldierRenderer(this, {
        id: rep.id,
        userId: 'demo_user',
        name: rep.name,
        x: rep.x,
        y: rep.y,
        hp: 100,
        maxHp: 100,
      }, DEFAULT_SCALE_TIER);
      s.setRotation(-Math.PI / 2);
      this.soldiers.push(s);
    }

    // 6. Title and Telemetry
    this.add.text(540, 100, 'FORTRESS ART DIRECTION QUALITY LAB', {
      fontFamily: GAME_FONTS.DISPLAY,
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#00f5d4',
    }).setOrigin(0.5).setDepth(100);

    this.add.text(540, 140, `Layout: ${layout.toUpperCase()} | 1080x1920 (Mobile 9:16) | Semi-Realistic Top-Down`, {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '15px',
      color: '#94a3b8',
    }).setOrigin(0.5).setDepth(100);

    (window as any).fortressScene = {
      setLayout: (l: 'highway' | 'bastion') => this.fortress.setLayoutVariant(l),
      setHp: (hp: number) => this.fortress.updateHp(hp),
    };
  }
}
