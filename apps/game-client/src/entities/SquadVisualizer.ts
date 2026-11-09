import Phaser from 'phaser';
import { SoldierRenderer } from './SoldierRenderer.js';
import { SoldierSnapshot } from '../types.js';
import { DEFAULT_SCALE_TIER, ScaleTier } from '../config/SpriteScaleConfig.js';
import { GAME_FONTS } from '../config/FontConfig.js';

export type FormationMode = 'A' | 'B' | 'C';

export interface SquadData {
  id: 'alpha' | 'bravo' | 'charlie';
  name: string;
  laneIndex: number;
  centerX: number;
  centerY: number;
  totalMembers: number; // Total joined viewers backing this squad
  color: string;
}

export interface SquadOverlapReport {
  formationMode: FormationMode;
  totalSoldiersRendered: number;
  totalMembersJoined: number;
  overlapCount: number;
  zeroOverlapVerified: boolean;
  soldierBounds: Array<{
    id: string;
    squadId: string;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  }>;
  intersectionPairs: Array<{
    soldier1: string;
    soldier2: string;
    overlapX: number;
    overlapY: number;
    overlapArea: number;
  }>;
}

export class SquadVisualizer {
  private scene: Phaser.Scene;
  private squads: Map<'alpha' | 'bravo' | 'charlie', SquadData> = new Map();
  private squadBadges: Map<'alpha' | 'bravo' | 'charlie', { container: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text }> = new Map();
  private squadSoldiers: Map<'alpha' | 'bravo' | 'charlie', SoldierRenderer[]> = new Map();
  private formationMode: FormationMode = 'C'; // Default to 1 Soldier đại diện/lane for Phase 02.4
  private debugEntities: boolean = false;

  // Formations specifically designed with calculated visual bounds to guarantee ZERO OVERLAP
  private readonly formations: Record<FormationMode, Array<{ dx: number; dy: number; role: string }>> = {
    // Option A: 3 Soldiers/lane, Wide Deep-V (Point Guard advanced, Flankers pulled wide)
    A: [
      { dx: 0, dy: -55, role: 'Đội Trưởng' },
      { dx: -85, dy: 35, role: 'Xạ Thủ Trái' },
      { dx: 85, dy: 35, role: 'Xạ Thủ Phải' },
    ],
    // Option B: 2 Soldiers/lane (Tactical Defensive Pair)
    B: [
      { dx: -65, dy: -10, role: 'Tiền Vệ' },
      { dx: 65, dy: 20, role: 'Hậu Cần' },
    ],
    // Option C: 1 Hero Representative Soldier/lane (PHASE 02.4 DEFAULT: Ultra-clean TikTok view)
    C: [
      { dx: 0, dy: 0, role: 'Đại Diện' },
    ],
  };

  constructor(scene: Phaser.Scene, initialMode: FormationMode = 'C', debugEntities: boolean = false) {
    this.scene = scene;
    this.formationMode = initialMode;
    this.debugEntities = debugEntities;

    // Defense Line coordinates: Behind fortress wall in courtyard staging area (y: 1030-1050)
    const squadDefs: SquadData[] = [
      { id: 'alpha', name: 'ALPHA', laneIndex: 0, centerX: 280, centerY: 1030, totalMembers: 12, color: '#00f5d4' },
      { id: 'bravo', name: 'BRAVO', laneIndex: 1, centerX: 540, centerY: 1050, totalMembers: 18, color: '#fee440' },
      { id: 'charlie', name: 'CHARLIE', laneIndex: 2, centerX: 800, centerY: 1030, totalMembers: 10, color: '#f72585' },
    ];

    for (const sq of squadDefs) {
      this.squads.set(sq.id, sq);
      this.squadSoldiers.set(sq.id, []);
      this.createSquadBadge(sq);
      this.spawnSoldiersForSquad(sq);
    }
  }

  public setFormationMode(mode: FormationMode): void {
    if (this.formationMode === mode) return;
    this.formationMode = mode;

    // Respawn soldiers with new formation
    for (const sq of this.squads.values()) {
      const list = this.squadSoldiers.get(sq.id) || [];
      for (const s of list) {
        s.destroy();
      }
      this.squadSoldiers.set(sq.id, []);
      this.spawnSoldiersForSquad(sq);
      this.updateBadgeText(sq);
    }
  }

  public getFormationMode(): FormationMode {
    return this.formationMode;
  }

  private createSquadBadge(sq: SquadData): void {
    // Positioned below the soldiers at y: centerY + 82 (on fortified parapet)
    const container = this.scene.add.container(sq.centerX, sq.centerY + 82).setDepth(28);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a1128, 0.94);
    bg.fillRoundedRect(-100, -13, 200, 26, 6);
    bg.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(sq.color).color, 0.95);
    bg.strokeRoundedRect(-100, -13, 200, 26, 6);

    const repCount = this.formations[this.formationMode].length;
    const label = repCount === 1 ? `${sq.name} SQUAD: ${sq.totalMembers} CHI VIỆN` : `${sq.name}: ${sq.totalMembers} CHI VIỆN (${repCount} TRỰC CHIẾN)`;
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '11px',
      fontStyle: 'bold',
      color: sq.color,
    }).setOrigin(0.5);

    container.add([bg, text]);
    this.squadBadges.set(sq.id, { container, text });
  }

  private updateBadgeText(sq: SquadData): void {
    const badge = this.squadBadges.get(sq.id);
    if (!badge) return;
    const repCount = this.formations[this.formationMode].length;
    const label = repCount === 1 ? `${sq.name} SQUAD: ${sq.totalMembers} CHI VIỆN` : `${sq.name}: ${sq.totalMembers} CHI VIỆN (${repCount} TRỰC CHIẾN)`;
    badge.text.setText(label);
  }

  private spawnSoldiersForSquad(sq: SquadData): void {
    const offsets = this.formations[this.formationMode];
    const list = this.squadSoldiers.get(sq.id)!;

    for (let i = 0; i < offsets.length; i++) {
      const offset = offsets[i];
      const snapshot: SoldierSnapshot = {
        id: `${sq.id}_soldier_${i}`,
        userId: `user_${sq.id}_${i}`,
        name: `${sq.name} ${offset.role}`,
        x: sq.centerX + offset.dx,
        y: sq.centerY + offset.dy,
        hp: 100,
        maxHp: 100,
      };

      const soldier = new SoldierRenderer(this.scene, snapshot, DEFAULT_SCALE_TIER, this.debugEntities);
      soldier.squadId = sq.id;
      soldier.setRotation(-Math.PI / 2);
      list.push(soldier);
    }
  }

  public updateSquadMembers(squadId: 'alpha' | 'bravo' | 'charlie', count: number): void {
    const sq = this.squads.get(squadId);
    if (!sq) return;
    sq.totalMembers = count;
    this.updateBadgeText(sq);
  }

  public handleViewerJoin(squadId: 'alpha' | 'bravo' | 'charlie', viewerName: string): void {
    const list = this.squadSoldiers.get(squadId);
    if (!list || list.length === 0) return;

    // Trigger reinforcement animation on the representative soldier
    const target = list[0];
    target.triggerReinforcementAnimation(viewerName);

    const sq = this.squads.get(squadId)!;
    sq.totalMembers++;
    this.updateBadgeText(sq);

    // In 1-soldier mode, spawn a temporary tactical reinforcement trooper who assists for 2.5s and fades away
    if (this.formationMode === 'C') {
      const tempSnapshot: SoldierSnapshot = {
        id: `temp_reinf_${Date.now()}`,
        userId: `user_${Date.now()}`,
        name: viewerName,
        x: sq.centerX + 70,
        y: sq.centerY + 15,
        hp: 100,
        maxHp: 100,
      };

      const tempSoldier = new SoldierRenderer(this.scene, tempSnapshot, DEFAULT_SCALE_TIER);
      tempSoldier.setRotation(-Math.PI / 2);
      tempSoldier.container.setAlpha(0);

      this.scene.tweens.add({
        targets: tempSoldier.container,
        alpha: 1,
        duration: 200,
        onComplete: () => {
          tempSoldier.fireMuzzleFlash();
          this.scene.time.delayedCall(300, () => tempSoldier.fireMuzzleFlash());
        },
      });

      this.scene.time.delayedCall(2500, () => {
        this.scene.tweens.add({
          targets: tempSoldier.container,
          alpha: 0,
          duration: 400,
          onComplete: () => tempSoldier.destroy(),
        });
      });
    }
  }

  public update(deltaMs: number): void {
    for (const list of this.squadSoldiers.values()) {
      for (const s of list) {
        s.update(deltaMs);
      }
    }
  }

  public getAllSoldiers(): SoldierRenderer[] {
    const result: SoldierRenderer[] = [];
    for (const list of this.squadSoldiers.values()) {
      result.push(...list);
    }
    return result;
  }

  /**
   * Evaluates AABB Rectangle Intersection between every pair of soldiers
   * to mathematically verify ZERO OVERLAP.
   */
  public generateOverlapReport(): SquadOverlapReport {
    const all = this.getAllSoldiers();
    const boundsList = all.map((s) => ({
      ...s.getVisualBounds(),
      squadId: s.squadId,
    }));

    const intersections: SquadOverlapReport['intersectionPairs'] = [];

    for (let i = 0; i < boundsList.length; i++) {
      for (let j = i + 1; j < boundsList.length; j++) {
        const b1 = boundsList[i];
        const b2 = boundsList[j];

        const overlapX = Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX);
        const overlapY = Math.min(b1.maxY, b2.maxY) - Math.max(b1.minY, b2.minY);

        if (overlapX > 0 && overlapY > 0) {
          intersections.push({
            soldier1: b1.id,
            soldier2: b2.id,
            overlapX: Math.round(overlapX),
            overlapY: Math.round(overlapY),
            overlapArea: Math.round(overlapX * overlapY),
          });
        }
      }
    }

    let totalMembers = 0;
    for (const sq of this.squads.values()) {
      totalMembers += sq.totalMembers;
    }

    return {
      formationMode: this.formationMode,
      totalSoldiersRendered: all.length,
      totalMembersJoined: totalMembers,
      overlapCount: intersections.length,
      zeroOverlapVerified: intersections.length === 0,
      soldierBounds: boundsList,
      intersectionPairs: intersections,
    };
  }
}
