import Phaser from 'phaser';
import { TextureGenerator } from '../graphics/TextureGenerator.js';
import { GameSnapshotSource } from '../sources/GameSnapshotSource.js';
import { ExtendedMatchSnapshot } from '../types.js';
import { SoldierRenderer } from '../entities/SoldierRenderer.js';
import { ZombieRenderer } from '../entities/ZombieRenderer.js';
import { TowerRenderer } from '../entities/TowerRenderer.js';
import { ProjectilePool } from '../entities/ProjectilePool.js';
import { DamageNumberPool } from '../entities/DamageNumberPool.js';
import { HUD } from '../ui/HUD.js';

export interface BattlefieldSceneConfig {
  snapshotSource: GameSnapshotSource;
  isOverlayMode?: boolean;
}

export class BattlefieldScene extends Phaser.Scene {
  private snapshotSource!: GameSnapshotSource;
  private isOverlayMode: boolean = false;

  private soldiers: Map<string, SoldierRenderer> = new Map();
  private zombies: Map<string, ZombieRenderer> = new Map();
  private towers: Map<string, TowerRenderer> = new Map();

  private projectilePool!: ProjectilePool;
  private damagePool!: DamageNumberPool;
  private hud!: HUD;

  // FPS and Benchmark tracking
  private currentFps: number = 60;
  private fpsText?: Phaser.GameObjects.Text;
  private unsubscribeSnapshot?: () => void;
  private fireTimer: number = 0;

  constructor() {
    super('BattlefieldScene');
  }

  init(data: BattlefieldSceneConfig) {
    if (data.snapshotSource) {
      this.snapshotSource = data.snapshotSource;
      this.isOverlayMode = Boolean(data.isOverlayMode);
    }
  }

  create() {
    TextureGenerator.generateAll(this);

    // 1. Draw Battlefield Map
    this.createBattlefieldMap();

    // 2. Pools
    this.projectilePool = new ProjectilePool(this, 60);
    this.damagePool = new DamageNumberPool(this, 40);

    // 3. HUD
    this.hud = new HUD(this);

    // 4. Debug FPS counter (only on development mode, never on /overlay)
    if (!this.isOverlayMode) {
      this.fpsText = this.add.text(35, 195, 'FPS: 60', {
        fontFamily: 'Arial Black',
        fontSize: '16px',
        color: '#00f5d4',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      }).setDepth(100);
    }

    // 5. Connect snapshot source
    if (this.snapshotSource) {
      this.snapshotSource.connect();
      this.unsubscribeSnapshot = this.snapshotSource.subscribe((snapshot) => {
        this.handleSnapshot(snapshot);
      });
    }
  }

  update(_time: number, delta: number) {
    // Measure FPS
    this.currentFps = Math.round(this.game.loop.actualFps);
    if (this.fpsText) {
      this.fpsText.setText(`FPS: ${this.currentFps} | Entities: ${this.soldiers.size + this.zombies.size}`);
    }

    // Update entity interpolation
    for (const soldier of this.soldiers.values()) {
      soldier.update(delta);
    }

    for (const zombie of this.zombies.values()) {
      zombie.update(delta);
    }

    // Visual combat firing simulation (based on snapshot state)
    this.fireTimer += delta;
    if (this.fireTimer >= 350) {
      this.fireTimer = 0;
      this.simulateVisualCombat();
    }
  }

  private handleSnapshot(snapshot: ExtendedMatchSnapshot): void {
    // 1. Sync Soldiers
    const incomingSoldierIds = new Set(snapshot.soldiers.map((s) => s.id));
    // Remove soldiers not in snapshot
    for (const [id, renderer] of this.soldiers.entries()) {
      if (!incomingSoldierIds.has(id)) {
        renderer.destroy();
        this.soldiers.delete(id);
      }
    }
    // Update or add soldiers
    for (const s of snapshot.soldiers) {
      const existing = this.soldiers.get(s.id);
      if (existing) {
        existing.updateSnapshot(s);
      } else {
        const renderer = new SoldierRenderer(this, s);
        this.soldiers.set(s.id, renderer);
      }
    }

    // 2. Sync Zombies
    const incomingZombieIds = new Set(snapshot.zombies.map((z) => z.id));
    for (const [id, renderer] of this.zombies.entries()) {
      if (!incomingZombieIds.has(id)) {
        renderer.destroy();
        this.zombies.delete(id);
      }
    }
    for (const z of snapshot.zombies) {
      const existing = this.zombies.get(z.id);
      if (existing) {
        existing.updateSnapshot(z);
      } else {
        const renderer = new ZombieRenderer(this, z);
        this.zombies.set(z.id, renderer);
      }
    }

    // 3. Sync Towers
    if (snapshot.towers) {
      const incomingTowerIds = new Set(snapshot.towers.map((t) => t.id));
      for (const [id, renderer] of this.towers.entries()) {
        if (!incomingTowerIds.has(id)) {
          renderer.destroy();
          this.towers.delete(id);
        }
      }
      for (const t of snapshot.towers) {
        let renderer = this.towers.get(t.id);
        if (!renderer) {
          renderer = new TowerRenderer(this, t);
          this.towers.set(t.id, renderer);
        }
        // Aim tower at nearest zombie
        const nearest = this.getClosestZombie(renderer.getX(), renderer.getY());
        if (nearest) {
          renderer.aimAt(nearest.getX(), nearest.getY());
        }
      }
    }

    // 4. Update HUD
    this.hud.update(snapshot);
  }

  private simulateVisualCombat(): void {
    if (this.zombies.size === 0 || this.soldiers.size === 0) return;

    // Pick 3 random soldiers to fire
    const soldierList = Array.from(this.soldiers.values());
    const zombieList = Array.from(this.zombies.values());

    for (let i = 0; i < Math.min(4, soldierList.length); i++) {
      const soldier = soldierList[Math.floor(Math.random() * soldierList.length)];
      const target = zombieList[Math.floor(Math.random() * zombieList.length)];

      soldier.fireRecoil();
      this.projectilePool.fireTracer(soldier.getX(), soldier.getY() - 15, target.getX(), target.getY());

      // Damage number popup
      this.time.delayedCall(200, () => {
        const dmg = Math.floor(Math.random() * 25) + 15;
        this.damagePool.showDamage(target.getX(), target.getY(), dmg, Math.random() > 0.8);
      });
    }

    // Tower firing
    for (const tower of this.towers.values()) {
      const target = this.getClosestZombie(tower.getX(), tower.getY());
      if (target) {
        tower.aimAt(target.getX(), target.getY());
        this.projectilePool.fireTracer(tower.getX(), tower.getY() - 25, target.getX(), target.getY(), 150);
        this.time.delayedCall(150, () => {
          this.damagePool.showDamage(target.getX(), target.getY(), 45, true);
        });
      }
    }
  }

  private getClosestZombie(fromX: number, fromY: number): ZombieRenderer | null {
    let closest: ZombieRenderer | null = null;
    let minDist = Infinity;
    for (const z of this.zombies.values()) {
      const dist = Phaser.Math.Distance.Between(fromX, fromY, z.getX(), z.getY());
      if (dist < minDist) {
        minDist = dist;
        closest = z;
      }
    }
    return closest;
  }

  private createBattlefieldMap(): void {
    const width = 1080;
    const height = 1920;

    // 1. Dark futuristic ground
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x060913, 0x060913, 0x0d1527, 0x0d1527, 1);
    bg.fillRect(0, 0, width, height);

    // 2. Tech grid lines
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x00f5d4, 0.08);
    for (let y = 200; y < height - 320; y += 60) {
      grid.lineBetween(60, y, width - 60, y);
    }
    for (let x = 60; x <= width - 60; x += 80) {
      grid.lineBetween(x, 200, x, height - 320);
    }

    // 3. Three Zombie Attack Lanes
    const lanesGraphics = this.add.graphics();
    const laneX = [260, 540, 820];

    for (let i = 0; i < 3; i++) {
      const lx = laneX[i];
      // Lane roadway surface
      lanesGraphics.fillStyle(0x0f1b29, 0.6);
      lanesGraphics.fillRect(lx - 90, 200, 180, height - 520);

      // Lane glowing boundary lines
      lanesGraphics.lineStyle(2, 0x00bbf9, 0.35);
      lanesGraphics.strokeRect(lx - 90, 200, 180, height - 520);

      // Warning arrows pointing down
      for (let ay = 280; ay < height - 550; ay += 220) {
        lanesGraphics.fillStyle(0xff5400, 0.25);
        lanesGraphics.fillTriangle(lx, ay + 20, lx - 20, ay, lx + 20, ay);
      }

      // Lane tag
      this.add.text(lx, 215, `ĐƯỜNG ${i + 1}`, {
        fontFamily: 'Arial Black',
        fontSize: '15px',
        color: '#00bbf9',
      }).setOrigin(0.5);
    }

    // 4. Base Barricade & Bunker (at y=1620)
    for (let bx = 100; bx < width - 100; bx += 140) {
      this.add.sprite(bx + 60, 1610, 'base_barricade');
    }

    // Base main platform
    const basePlatform = this.add.graphics();
    basePlatform.fillStyle(0x0a1128, 0.95);
    basePlatform.fillRoundedRect(40, 1630, width - 80, 140, 16);
    basePlatform.lineStyle(3, 0x00f5d4, 0.8);
    basePlatform.strokeRoundedRect(40, 1630, width - 80, 140, 16);

    // Defense Bunker Title
    this.add.text(width / 2, 1650, '🛡️ VỊ TRÍ TRIỂN KHAI QUÂN ĐỘI & THÀNH TRÌ PHÒNG THỦ', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#00f5d4',
    }).setOrigin(0.5);
  }

  getFps(): number {
    return this.currentFps;
  }
}
