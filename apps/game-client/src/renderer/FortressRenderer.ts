import Phaser from 'phaser';
import { GAME_FONTS } from '../config/FontConfig.js';

export interface FortressConfig {
  layoutVariant: 'highway' | 'bastion';
  baseHp: number;
  maxBaseHp: number;
}

/**
 * High-Fidelity Asset-First Military Fortress Renderer
 * Assembled entirely from verified 2D top-down sprite assets:
 * - fortress_wall_left.png & fortress_wall_right.png (Heavy weathered concrete with 3D parapet & embrasures)
 * - fortress_main_gate.png & fortress_gate_damaged.png (Heavy corrugated blast gate with hydraulics)
 * - fortress_turret_platform.png (Octagonal mechanical turntable pads)
 * - fortress_command_center.png (Reinforced bunker with comms dish & radar)
 * - fortress_ammo_storage.png (Military logistics munitions depot)
 * - fortress_sandbags.png & fortress_barricade.png (Forward physical defenses)
 * - fortress_spotlight.png (Searchlight pods)
 * - fortress_floor.png (Tileable staging yard foundation)
 * - fortress_damage_vfx.png (Localized concrete fracture decals)
 */
export class FortressRenderer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private layoutVariant: 'highway' | 'bastion' = 'highway';
  private currentHp: number = 10000;
  private maxHp: number = 10000;

  // Sprite references
  private floorTiles: Phaser.GameObjects.Image[] = [];
  private wallLeft!: Phaser.GameObjects.Image;
  private wallRight!: Phaser.GameObjects.Image;
  private mainGate!: Phaser.GameObjects.Image;
  private commandCenter!: Phaser.GameObjects.Image;
  private ammoDepots: Phaser.GameObjects.Image[] = [];
  private turretPlatforms: Phaser.GameObjects.Image[] = [];
  private sandbags: Phaser.GameObjects.Image[] = [];
  private barricades: Phaser.GameObjects.Image[] = [];
  private spotlights: Phaser.GameObjects.Image[] = [];
  private damageDecals: Phaser.GameObjects.Image[] = [];
  private hqText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, layout: 'highway' | 'bastion' = 'highway') {
    this.scene = scene;
    this.layoutVariant = layout;

    // Depth 6 to 12: Above ground bed (depth 0-4), below mobile entities (depth 15-30)
    this.container = scene.add.container(0, 0).setDepth(8);

    this.buildFortressFromSprites();
  }

  public setLayoutVariant(variant: 'highway' | 'bastion'): void {
    this.layoutVariant = variant;
    this.buildFortressFromSprites();
  }

  public updateHp(hp: number, maxHp: number = 10000): void {
    this.currentHp = hp;
    this.maxHp = maxHp;
    this.updateDamageState();
  }

  public buildFortressFromSprites(): void {
    // Clear previous sprites in container
    this.container.removeAll(true);
    this.floorTiles = [];
    this.ammoDepots = [];
    this.turretPlatforms = [];
    this.sandbags = [];
    this.barricades = [];
    this.spotlights = [];
    this.damageDecals = [];

    const isBastion = this.layoutVariant === 'bastion';
    const width = 1080;

    // =========================================================================
    // 1. REAR STAGING YARD FOUNDATION (y: 1420 to 1760)
    // =========================================================================
    for (let x = 60; x <= width - 60; x += 256) {
      for (let y = 1450; y <= 1700; y += 256) {
        const floor = this.scene.add.image(x + 128, y + 128, 'fortress_floor')
          .setOrigin(0.5)
          .setAlpha(0.95);
        this.floorTiles.push(floor);
        this.container.add(floor);
      }
    }

    // =========================================================================
    // 2. COMMAND CENTER BUNKER & LOGISTICS DEPOTS (y: 1530 to 1660)
    // =========================================================================
    // Hardened Field HQ Bunker in center rear
    this.commandCenter = this.scene.add.image(width / 2, isBastion ? 1590 : 1620, 'fortress_command_center')
      .setOrigin(0.5);
    this.container.add(this.commandCenter);

    this.hqText = this.scene.add.text(width / 2, (isBastion ? 1590 : 1620) + 40, 'SỞ CHỈ HUY QUÂN SỰ TỐI CAO', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#00f5d4',
    }).setOrigin(0.5);
    this.container.add(this.hqText);

    // Flanking Munitions Depots (Left & Right)
    const ammoL = this.scene.add.image(180, 1530, 'fortress_ammo_storage').setOrigin(0.5);
    const ammoR = this.scene.add.image(width - 180, 1530, 'fortress_ammo_storage').setOrigin(0.5);
    this.ammoDepots.push(ammoL, ammoR);
    this.container.add([ammoL, ammoR]);

    // =========================================================================
    // 3. MAIN HEAVY REINFORCED DEFENSIVE WALL & BLAST GATE (y: 1360 to 1380)
    // =========================================================================
    const wallY = isBastion ? 1340 : 1370;

    // Left Concrete Wall Section (410x90px)
    this.wallLeft = this.scene.add.image(205, wallY, 'fortress_wall_left').setOrigin(0.5);
    // Right Concrete Wall Section (410x90px)
    this.wallRight = this.scene.add.image(width - 205, wallY, 'fortress_wall_right').setOrigin(0.5);

    // Center Heavy Corrugated Blast Gate (260x120px)
    this.mainGate = this.scene.add.image(width / 2, wallY, 'fortress_main_gate').setOrigin(0.5);

    this.container.add([this.wallLeft, this.wallRight, this.mainGate]);

    // =========================================================================
    // 4. TURRET MOUNTING PLATFORMS (3 Tactical Lanes)
    // =========================================================================
    const turretCoords = isBastion
      ? [
          { x: 230, y: 1300 },
          { x: width / 2, y: 1260 },
          { x: width - 230, y: 1300 },
        ]
      : [
          { x: 260, y: 1330 },
          { x: width / 2, y: 1310 },
          { x: width - 260, y: 1330 },
        ];

    for (const pos of turretCoords) {
      const pad = this.scene.add.image(pos.x, pos.y, 'fortress_turret_platform').setOrigin(0.5);
      this.turretPlatforms.push(pad);
      this.container.add(pad);
    }

    // =========================================================================
    // 5. TACTICAL SEARCHLIGHT PODS & PERIMETER DEFENSES
    // =========================================================================
    const spotlightL = this.scene.add.image(85, wallY - 45, 'fortress_spotlight').setOrigin(0.5);
    const spotlightR = this.scene.add.image(width - 85, wallY - 45, 'fortress_spotlight').setOrigin(0.5);
    this.spotlights.push(spotlightL, spotlightR);
    this.container.add([spotlightL, spotlightR]);

    // Forward Sandbags & Roadblock Barricades
    const defenseLanes = [260, width / 2, width - 260];
    for (const lx of defenseLanes) {
      const sbL = this.scene.add.image(lx - 55, wallY - 95, 'fortress_sandbags').setOrigin(0.5);
      const sbR = this.scene.add.image(lx + 55, wallY - 95, 'fortress_sandbags').setOrigin(0.5);
      const bar = this.scene.add.image(lx, wallY - 120, 'fortress_barricade').setOrigin(0.5);
      this.sandbags.push(sbL, sbR);
      this.barricades.push(bar);
      this.container.add([sbL, sbR, bar]);
    }

    this.updateDamageState();
  }

  public updateDamageState(): void {
    const hpPercent = this.currentHp / this.maxHp;

    // 1. Gate swap if damaged below 50%
    if (this.mainGate) {
      if (hpPercent < 0.5) {
        this.mainGate.setTexture('fortress_gate_damaged');
      } else {
        this.mainGate.setTexture('fortress_main_gate');
      }
    }

    // 2. Concrete fracture decals if damaged
    // Remove existing decals
    for (const d of this.damageDecals) {
      d.destroy();
    }
    this.damageDecals = [];

    if (hpPercent < 0.75) {
      const decal1 = this.scene.add.image(310, 1370, 'fortress_damage_vfx').setScale(0.8);
      const decal2 = this.scene.add.image(780, 1370, 'fortress_damage_vfx').setScale(0.85);
      this.damageDecals.push(decal1, decal2);
      this.container.add([decal1, decal2]);
    }

    if (hpPercent < 0.4) {
      const decal3 = this.scene.add.image(540, 1370, 'fortress_damage_vfx').setScale(1.1);
      this.damageDecals.push(decal3);
      this.container.add(decal3);
    }
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
