import Phaser from 'phaser';
import { GAME_FONTS } from '../config/FontConfig.js';

export interface FortressConfig {
  layoutVariant: 'highway' | 'bastion';
  baseHp: number;
  maxBaseHp: number;
}

/**
 * High-Fidelity Military Fortress Renderer
 * Semi-realistic 2D top-down military defense architecture:
 * - Weathered reinforced concrete wall with 3D thickness and drop shadow
 * - Heavy industrial blast gate with hazard caution stripes and hydraulic hinges
 * - 3 Dedicated tactical defensive sectors (Alpha, Bravo, Charlie)
 * - Multi-tiered sandbag emplacements, metal barricades & supply depots
 * - Dynamic HP damage state (fractures, smoke, emergency beacons)
 */
export class FortressRenderer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private wallGraphics: Phaser.GameObjects.Graphics;
  private blastGateGraphics: Phaser.GameObjects.Graphics;
  private rearYardGraphics: Phaser.GameObjects.Graphics;
  private damageDecalsGraphics: Phaser.GameObjects.Graphics;
  private smokeEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private layoutVariant: 'highway' | 'bastion' = 'highway';
  private currentHp: number = 10000;
  private maxHp: number = 10000;

  constructor(scene: Phaser.Scene, layout: 'highway' | 'bastion' = 'highway') {
    this.scene = scene;
    this.layoutVariant = layout;

    // Depth 5 to 22: Placed above ground/road (depth 0-4), below entities (depth 12-25)
    this.container = scene.add.container(0, 0).setDepth(10);
    this.rearYardGraphics = scene.add.graphics();
    this.wallGraphics = scene.add.graphics();
    this.blastGateGraphics = scene.add.graphics();
    this.damageDecalsGraphics = scene.add.graphics();

    this.container.add([
      this.rearYardGraphics,
      this.wallGraphics,
      this.blastGateGraphics,
      this.damageDecalsGraphics,
    ]);

    this.renderArchitecture();
  }

  public setLayoutVariant(variant: 'highway' | 'bastion'): void {
    this.layoutVariant = variant;
    this.renderArchitecture();
  }

  public updateHp(hp: number, maxHp: number = 10000): void {
    this.currentHp = hp;
    this.maxHp = maxHp;
    this.renderWallDamage();
  }

  public renderArchitecture(): void {
    const width = 1080;
    const height = 1920;

    this.rearYardGraphics.clear();
    this.wallGraphics.clear();
    this.blastGateGraphics.clear();
    this.damageDecalsGraphics.clear();

    const isBastion = this.layoutVariant === 'bastion';

    // =========================================================================
    // 1. REAR COMMAND YARD & LOGISTICS BASE (y: 1450 to 1750)
    // =========================================================================
    // Heavy concrete slab foundation
    this.rearYardGraphics.fillStyle(0x111622, 1);
    this.rearYardGraphics.fillRect(40, 1450, width - 80, 290);

    // Weathered floor tiles & expansion joints
    this.rearYardGraphics.lineStyle(1.5, 0x1f293d, 0.8);
    for (let x = 60; x < width - 60; x += 110) {
      this.rearYardGraphics.lineBetween(x, 1450, x, 1740);
    }
    for (let y = 1450; y < 1740; y += 60) {
      this.rearYardGraphics.lineBetween(40, y, width - 40, y);
    }

    // Border trim
    this.rearYardGraphics.lineStyle(2, 0x334155, 0.9);
    this.rearYardGraphics.strokeRect(40, 1450, width - 80, 290);

    // Logistics parking zones (yellow dashed boundaries)
    this.rearYardGraphics.lineStyle(2, 0xfee440, 0.5);
    this.rearYardGraphics.strokeRect(60, 1480, 240, 95);
    this.rearYardGraphics.strokeRect(width - 300, 1480, 240, 95);

    // Command Headquarters Tent / Radar Station (center rear)
    this.rearYardGraphics.fillStyle(0x192231, 1);
    this.rearYardGraphics.fillRoundedRect(width / 2 - 130, 1585, 260, 90, 8);
    this.rearYardGraphics.lineStyle(2, 0x00f5d4, 0.7);
    this.rearYardGraphics.strokeRoundedRect(width / 2 - 130, 1585, 260, 90, 8);

    // Radar Dish / Satellite Comms indicator
    this.rearYardGraphics.fillStyle(0x0e1726, 1);
    this.rearYardGraphics.fillCircle(width / 2, 1630, 26);
    this.rearYardGraphics.lineStyle(2, 0x00f5d4, 1);
    this.rearYardGraphics.strokeCircle(width / 2, 1630, 26);
    this.rearYardGraphics.lineBetween(width / 2 - 18, 1630, width / 2 + 18, 1630);
    this.rearYardGraphics.lineBetween(width / 2, 1630 - 18, width / 2, 1630 + 18);

    // HQ Labels
    this.scene.add.text(width / 2, 1600, 'SỞ CHỈ HUY QUÂN SỰ TỐI CAO', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#00f5d4',
    }).setOrigin(0.5).setDepth(11);

    this.scene.add.text(180, 1530, 'KHO TIẾP LIỆU ALPHA', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '10px',
      color: '#94a3b8',
    }).setOrigin(0.5).setDepth(11);

    this.scene.add.text(width - 180, 1530, 'KHO ĐẠN DƯỢC CHARLIE', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '10px',
      color: '#94a3b8',
    }).setOrigin(0.5).setDepth(11);

    // =========================================================================
    // 2. MAIN WEATHERED REINFORCED CONCRETE DEFENSE WALL (y: 1370 to 1450)
    // =========================================================================
    const wallY = 1375;
    const wallH = 75;

    // Realistic Wall Cast Shadow onto rear yard
    this.wallGraphics.fillStyle(0x05080e, 0.9);
    this.wallGraphics.fillRect(35, wallY + wallH, width - 70, 22);

    // Front Wall Face (Reinforced weathered gray concrete)
    this.wallGraphics.fillStyle(0x232b3b, 1);
    this.wallGraphics.fillRoundedRect(35, wallY, width - 70, wallH, 8);
    this.wallGraphics.lineStyle(3, 0x3d4a63, 1);
    this.wallGraphics.strokeRoundedRect(35, wallY, width - 70, wallH, 8);

    // Upper Parapet Rim / Walkway (Illuminated top bevel)
    this.wallGraphics.fillStyle(0x3a465c, 1);
    this.wallGraphics.fillRect(38, wallY + 2, width - 76, 16);

    // Parapet crenellations & embrasures (firing slits)
    this.wallGraphics.fillStyle(0x0e131d, 1);
    for (let x = 60; x < width - 60; x += 55) {
      // Leave space around central blast gate (x: 430 to 650)
      if (x > 420 && x < 660) continue;
      this.wallGraphics.fillRect(x, wallY + 20, 24, 15);
    }

    // Steel rebar joint plates along the concrete wall
    this.wallGraphics.fillStyle(0x475569, 1);
    const jointX = [180, 340, 740, 900];
    for (const jx of jointX) {
      this.wallGraphics.fillRect(jx, wallY + 2, 8, wallH - 4);
      // Rivets on plate
      this.wallGraphics.fillStyle(0xfee440, 0.8);
      this.wallGraphics.fillCircle(jx + 4, wallY + 12, 2);
      this.wallGraphics.fillCircle(jx + 4, wallY + wallH - 12, 2);
      this.wallGraphics.fillStyle(0x475569, 1);
    }

    // Bastion Variant: Additional Flanking Bastion Wings
    if (isBastion) {
      // Left Guard Bastion (x: 50 to 220, extends forward to y: 1320)
      this.wallGraphics.fillStyle(0x1d2433, 1);
      this.wallGraphics.fillRoundedRect(50, 1310, 170, 130, 8);
      this.wallGraphics.lineStyle(2, 0x00f5d4, 0.8);
      this.wallGraphics.strokeRoundedRect(50, 1310, 170, 130, 8);

      // Right Guard Bastion (x: 860 to 1030)
      this.wallGraphics.fillStyle(0x1d2433, 1);
      this.wallGraphics.fillRoundedRect(width - 220, 1310, 170, 130, 8);
      this.wallGraphics.lineStyle(2, 0x00f5d4, 0.8);
      this.wallGraphics.strokeRoundedRect(width - 220, 1310, 170, 130, 8);
    }

    // =========================================================================
    // 3. CENTRAL HEAVY INDUSTRIAL BLAST GATE (x: 540, y: 1370 to 1450)
    // =========================================================================
    const gateW = 200;
    const gateH = 75;
    const gateX = width / 2 - gateW / 2;
    const gateY = wallY;

    // Recessed gate bay shadow
    this.blastGateGraphics.fillStyle(0x06090e, 1);
    this.blastGateGraphics.fillRect(gateX - 8, gateY - 4, gateW + 16, gateH + 8);

    // Heavy reinforced steel frame
    this.blastGateGraphics.fillStyle(0x121722, 1);
    this.blastGateGraphics.fillRoundedRect(gateX, gateY, gateW, gateH, 6);
    this.blastGateGraphics.lineStyle(3, 0xfee440, 1);
    this.blastGateGraphics.strokeRoundedRect(gateX, gateY, gateW, gateH, 6);

    // Hydraulic piston housings on left and right of gate
    this.blastGateGraphics.fillStyle(0x273142, 1);
    this.blastGateGraphics.fillRect(gateX - 12, gateY + 12, 12, 50);
    this.blastGateGraphics.fillRect(gateX + gateW, gateY + 12, 12, 50);

    // Hazard caution diagonal stripes across gate panels
    this.blastGateGraphics.fillStyle(0xfee440, 0.95);
    for (let sx = gateX + 8; sx < gateX + gateW - 12; sx += 26) {
      this.blastGateGraphics.beginPath();
      this.blastGateGraphics.moveTo(sx, gateY + gateH - 4);
      this.blastGateGraphics.lineTo(sx + 14, gateY + 4);
      this.blastGateGraphics.lineTo(sx + 22, gateY + 4);
      this.blastGateGraphics.lineTo(sx + 8, gateY + gateH - 4);
      this.blastGateGraphics.fillPath();
    }

    // Center interlocking blast door seam
    this.blastGateGraphics.fillStyle(0x000000, 1);
    this.blastGateGraphics.fillRect(width / 2 - 2, gateY, 4, gateH);

    // Central Identification Plate
    const gateTag = this.scene.add.text(width / 2, gateY + 38, '⚡ CỔNG THÉP TRUNG TÂM #01 ⚡', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#00f5d4',
      backgroundColor: '#0a1128ee',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setDepth(24);

    // =========================================================================
    // 4. FORWARD DEFENSE PERIMETER (y: 1220 to 1280)
    // =========================================================================
    // Sandbags, metal barrier horses, ammo crates across Alpha, Bravo, Charlie
    const sectors = [
      { x: 260, label: 'ALPHA SECTOR' },
      { x: 540, label: 'BRAVO SECTOR' },
      { x: 820, label: 'CHARLIE SECTOR' },
    ];

    for (const sec of sectors) {
      // Wood/metal barrier horses
      this.scene.add.image(sec.x - 65, 1235, 'barricade_barrier').setScale(0.95).setDepth(8);
      this.scene.add.image(sec.x + 65, 1235, 'barricade_barrier').setScale(0.95).setDepth(8);

      // Stacked curved sandbags
      this.scene.add.image(sec.x - 38, 1260, 'sandbags').setScale(1.05).setDepth(9);
      this.scene.add.image(sec.x + 38, 1260, 'sandbags').setScale(1.05).setDepth(9);

      // Heavy ammo crates
      this.scene.add.image(sec.x - 98, 1270, 'ammo_crate').setScale(0.9).setDepth(9);
      this.scene.add.image(sec.x + 98, 1270, 'ammo_crate').setScale(0.9).setDepth(9);
    }

    this.renderWallDamage();
  }

  private renderWallDamage(): void {
    this.damageDecalsGraphics.clear();
    const width = 1080;
    const ratio = Math.max(0, this.currentHp / this.maxHp);

    if (ratio < 0.75) {
      // Moderate damage: Minor fractures along the wall
      this.damageDecalsGraphics.lineStyle(2, 0x111622, 0.9);
      this.damageDecalsGraphics.beginPath();
      this.damageDecalsGraphics.moveTo(220, 1385); this.damageDecalsGraphics.lineTo(240, 1405); this.damageDecalsGraphics.lineTo(265, 1395);
      this.damageDecalsGraphics.moveTo(760, 1390); this.damageDecalsGraphics.lineTo(790, 1415); this.damageDecalsGraphics.lineTo(820, 1400);
      this.damageDecalsGraphics.strokePath();
    }

    if (ratio < 0.4) {
      // Critical damage: Heavy cracks, blast scorch marks, warning tint
      this.damageDecalsGraphics.fillStyle(0x0a0c10, 0.85);
      this.damageDecalsGraphics.fillCircle(240, 1400, 22);
      this.damageDecalsGraphics.fillCircle(800, 1405, 25);
      this.damageDecalsGraphics.fillCircle(540, 1385, 30);

      this.damageDecalsGraphics.lineStyle(3, 0xff0055, 0.8);
      this.damageDecalsGraphics.strokeRoundedRect(35, 1375, width - 70, 75, 8);
    }
  }

  public destroy(): void {
    this.container.destroy();
  }
}
