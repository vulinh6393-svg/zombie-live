import Phaser from 'phaser';
import { SoldierRenderer } from './SoldierRenderer.js';
import { SoldierSnapshot } from '../types.js';
import { DEFAULT_SCALE_TIER, ScaleTier } from '../config/SpriteScaleConfig.js';

export interface SquadData {
  id: 'alpha' | 'bravo' | 'charlie';
  name: string;
  laneIndex: number;
  centerX: number;
  centerY: number;
  totalSoldiers: number;
  color: string;
}

export class SquadVisualizer {
  private scene: Phaser.Scene;
  private squads: Map<'alpha' | 'bravo' | 'charlie', SquadData> = new Map();
  private squadBadges: Map<'alpha' | 'bravo' | 'charlie', { container: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text }> = new Map();
  private squadSoldiers: Map<'alpha' | 'bravo' | 'charlie', SoldierRenderer[]> = new Map();

  // Tactical formation offsets for 4 soldiers per squad (No overlapping!)
  private readonly formationOffsets = [
    { dx: -35, dy: 10 },
    { dx: 35, dy: 10 },
    { dx: -18, dy: -25 },
    { dx: 18, dy: -25 },
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Define 3 tactical squads across 3 lanes
    const squadDefs: SquadData[] = [
      { id: 'alpha', name: 'ALPHA SQUAD', laneIndex: 0, centerX: 260, centerY: 1380, totalSoldiers: 12, color: '#00f5d4' },
      { id: 'bravo', name: 'BRAVO SQUAD', laneIndex: 1, centerX: 540, centerY: 1360, totalSoldiers: 18, color: '#fee440' },
      { id: 'charlie', name: 'CHARLIE SQUAD', laneIndex: 2, centerX: 820, centerY: 1380, totalSoldiers: 10, color: '#f72585' },
    ];

    for (const sq of squadDefs) {
      this.squads.set(sq.id, sq);
      this.squadSoldiers.set(sq.id, []);
      this.createSquadBadge(sq);
      this.spawnRepresentativeSoldiers(sq);
    }
  }

  private createSquadBadge(sq: SquadData): void {
    const container = this.scene.add.container(sq.centerX, sq.centerY + 55).setDepth(25);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a1128, 0.88);
    bg.fillRoundedRect(-95, -14, 190, 28, 6);
    bg.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(sq.color).color, 0.9);
    bg.strokeRoundedRect(-95, -14, 190, 28, 6);

    const text = this.scene.add.text(0, 0, `${sq.name} — ${sq.totalSoldiers} LÍNH`, {
      fontFamily: 'Arial Black',
      fontSize: '12px',
      color: sq.color,
    }).setOrigin(0.5);

    container.add([bg, text]);
    this.squadBadges.set(sq.id, { container, text });
  }

  private spawnRepresentativeSoldiers(sq: SquadData): void {
    const list = this.squadSoldiers.get(sq.id)!;
    for (let i = 0; i < 4; i++) {
      const offset = this.formationOffsets[i];
      const snapshot: SoldierSnapshot = {
        id: `${sq.id}_rep_${i}`,
        userId: `user_${sq.id}_${i}`,
        name: i === 0 ? `${sq.name} Đội Trưởng` : `Chiến Binh #${i}`,
        x: sq.centerX + offset.dx,
        y: sq.centerY + offset.dy,
        hp: 100,
        maxHp: 100,
      };

      const soldier = new SoldierRenderer(this.scene, snapshot, DEFAULT_SCALE_TIER);
      soldier.squadId = sq.id;
      soldier.setRotation(-Math.PI / 2);
      list.push(soldier);
    }
  }

  public updateSquadCount(squadId: 'alpha' | 'bravo' | 'charlie', count: number): void {
    const sq = this.squads.get(squadId);
    if (!sq) return;
    sq.totalSoldiers = count;
    const badge = this.squadBadges.get(squadId);
    if (badge) {
      badge.text.setText(`${sq.name} — ${sq.totalSoldiers} LÍNH`);
    }
  }

  public handleViewerJoin(squadId: 'alpha' | 'bravo' | 'charlie', viewerName: string): void {
    const sq = this.squads.get(squadId);
    if (!sq) return;

    sq.totalSoldiers += 1;
    this.updateSquadCount(squadId, sq.totalSoldiers);

    // 1. Highlight one representative soldier with reinforcement aura
    const soldiers = this.squadSoldiers.get(squadId);
    if (soldiers && soldiers.length > 0) {
      const randomRep = soldiers[Math.floor(Math.random() * soldiers.length)];
      randomRep.highlightReinforcement();
    }

    // 2. Float "+1 Tân Binh: @viewerName" notification over squad
    const joinText = this.scene.add.text(
      sq.centerX,
      sq.centerY - 50,
      `+1 TÂN BINH: @${viewerName}`,
      {
        fontFamily: 'Arial Black',
        fontSize: '16px',
        color: sq.color,
        stroke: '#000000',
        strokeThickness: 3,
      }
    ).setOrigin(0.5).setDepth(30);

    this.scene.tweens.add({
      targets: joinText,
      y: '-=45',
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.Out',
      onComplete: () => joinText.destroy(),
    });
  }

  public getAllSoldiers(): SoldierRenderer[] {
    const all: SoldierRenderer[] = [];
    for (const list of this.squadSoldiers.values()) {
      all.push(...list);
    }
    return all;
  }

  public getSquadSoldiers(squadId: 'alpha' | 'bravo' | 'charlie'): SoldierRenderer[] {
    return this.squadSoldiers.get(squadId) || [];
  }

  public update(deltaMs: number): void {
    for (const list of this.squadSoldiers.values()) {
      for (const s of list) {
        s.update(deltaMs);
      }
    }
  }

  public destroy(): void {
    for (const list of this.squadSoldiers.values()) {
      for (const s of list) s.destroy();
    }
    for (const b of this.squadBadges.values()) {
      b.container.destroy();
    }
  }
}
