import Phaser from 'phaser';
import { SoldierSnapshot } from '../types.js';
import { DEFAULT_SCALE_TIER, ScaleTier } from '../config/SpriteScaleConfig.js';
import { GAME_FONTS } from '../config/FontConfig.js';

export type SoldierState = 'idle' | 'walk' | 'shoot' | 'reload';

export class SoldierRenderer {
  readonly id: string;
  readonly userId: string;
  public squadId: 'alpha' | 'bravo' | 'charlie' = 'bravo';

  private scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  private feetSprite: Phaser.GameObjects.Sprite;
  private mainSprite: Phaser.GameObjects.Sprite;
  private hpBarBg: Phaser.GameObjects.Graphics;
  private hpBarFill: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private debugBox?: Phaser.GameObjects.Graphics;

  private targetX: number;
  private targetY: number;
  public hp: number;
  public maxHp: number;
  private scaleTier: ScaleTier = DEFAULT_SCALE_TIER;
  private currentState: SoldierState = 'idle';
  private debugEntities: boolean = false;

  constructor(scene: Phaser.Scene, snapshot: SoldierSnapshot, scaleTier: ScaleTier = DEFAULT_SCALE_TIER, debugEntities: boolean = false) {
    this.scene = scene;
    this.id = snapshot.id;
    this.userId = snapshot.userId;
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.hp = snapshot.hp;
    this.maxHp = snapshot.maxHp;
    this.scaleTier = scaleTier;
    this.debugEntities = debugEntities;

    // Depth 16: Positioned tactically behind sandbags and defense barricades
    this.container = scene.add.container(snapshot.x, snapshot.y).setDepth(16);

    // 1. Lower body feet layer (Riley Gombart CC-BY)
    this.feetSprite = scene.add.sprite(0, 0, 'survivor_feet_walk_0');
    this.feetSprite.setOrigin(0.5, 0.5);

    // 2. Upper body with assault rifle
    this.mainSprite = scene.add.sprite(0, 0, 'survivor_idle_0');
    this.mainSprite.setOrigin(0.35, 0.5); // Pivot at shoulders/torso for natural gun aiming

    // 3. Compact tactical HP bar
    this.hpBarBg = scene.add.graphics();
    this.hpBarFill = scene.add.graphics();

    // 4. Name Tag with Vietnamese font support
    this.nameText = scene.add.text(0, -60, snapshot.name || '', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#00f5d4',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.nameText.setVisible(false);

    this.container.add([this.feetSprite, this.mainSprite, this.hpBarBg, this.hpBarFill, this.nameText]);

    if (this.debugEntities) {
      this.debugBox = scene.add.graphics();
      this.container.add(this.debugBox);
    }

    // Apply scale & rotation (facing upward toward incoming zombies)
    this.applyScale(this.scaleTier);
    this.setRotation(-Math.PI / 2);
    this.drawHpBar();

    // Start with idle animation
    this.playState('idle');

    // Spawn entrance animation
    this.container.setScale(0.1);
    scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  public applyScale(tier: ScaleTier): void {
    this.scaleTier = tier;
    const mult = tier.soldierScale;
    this.mainSprite.setScale(mult);
    this.feetSprite.setScale(mult * 0.95);

    const yOffset = -mult * 80;
    this.nameText.setY(yOffset - 14);
    this.drawHpBar();
    this.drawDebugBox();
  }

  public setRotation(angleRad: number): void {
    this.mainSprite.setRotation(angleRad);
    this.feetSprite.setRotation(angleRad);
  }

  public getRotation(): number {
    return this.mainSprite.rotation;
  }

  public playState(state: SoldierState): void {
    this.currentState = state;
    switch (state) {
      case 'idle':
        this.mainSprite.play('survivor-rifle-idle');
        this.feetSprite.play('survivor-feet-idle');
        break;
      case 'walk':
        this.mainSprite.play('survivor-rifle-move');
        this.feetSprite.play('survivor-feet-walk');
        break;
      case 'shoot':
        this.mainSprite.play('survivor-rifle-shoot');
        break;
      case 'reload':
        this.mainSprite.play('survivor-rifle-reload');
        break;
    }
  }

  public aimAt(targetX: number, targetY: number): void {
    const angle = Phaser.Math.Angle.Between(this.container.x, this.container.y, targetX, targetY);
    this.setRotation(angle);
  }

  public fireMuzzleFlash(): { flashX: number; flashY: number; angle: number } {
    this.playState('shoot');
    const angle = this.mainSprite.rotation;
    const mult = this.scaleTier.soldierScale;
    const barrelDistance = 56 * mult;
    const flashX = this.container.x + Math.cos(angle) * barrelDistance;
    const flashY = this.container.y + Math.sin(angle) * barrelDistance;

    const flash = this.scene.add.image(flashX, flashY, 'muzzle_flash');
    flash.setScale(0.65 * mult);
    flash.setRotation(angle);
    flash.setDepth(25);
    this.scene.time.delayedCall(45, () => flash.destroy());

    this.scene.time.delayedCall(160, () => {
      if (this.currentState === 'shoot') {
        this.playState('idle');
      }
    });

    return { flashX, flashY, angle };
  }

  public showTemporaryHighlight(color: number = 0x00f5d4, durationMs: number = 2500): void {
    this.nameText.setVisible(true);
    this.drawHpBar(true);

    const aura = this.scene.add.graphics();
    aura.lineStyle(3, color, 0.9);
    aura.strokeCircle(this.container.x, this.container.y, 45 * this.scaleTier.soldierScale);
    aura.setDepth(14);

    this.scene.tweens.add({
      targets: aura,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      duration: 650,
      repeat: 3,
      onComplete: () => aura.destroy(),
    });

    this.scene.time.delayedCall(durationMs, () => {
      this.nameText.setVisible(false);
      this.drawHpBar(false);
    });
  }

  public updateSnapshot(snapshot: SoldierSnapshot): void {
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.hp = snapshot.hp;
    this.maxHp = snapshot.maxHp;
    this.drawHpBar();
    this.drawDebugBox();
  }

  public update(deltaMs: number): void {
    const lerpFactor = Math.min(1, (deltaMs / 100) * 1.5);
    this.container.x = Phaser.Math.Linear(this.container.x, this.targetX, lerpFactor);
    this.container.y = Phaser.Math.Linear(this.container.y, this.targetY, lerpFactor);
  }

  public destroy(): void {
    this.container.destroy();
  }

  public getX(): number {
    return this.container.x;
  }

  public getY(): number {
    return this.container.y;
  }

  /**
   * World-Space Visual Bounding Box (AABB) taking into account
   * alpha-trimmed physical dimensions, display scale, and orientation.
   */
  public getVisualBounds(): { id: string; minX: number; maxX: number; minY: number; maxY: number; width: number; height: number } {
    const mult = this.scaleTier.soldierScale;
    // When aiming upward (-90deg), visual body width is ~100px*mult, height is ~140px*mult (with weapon)
    const visualW = 95 * mult;
    const visualH = 135 * mult;
    const halfW = visualW / 2;
    const halfH = visualH / 2;
    return {
      id: this.id,
      minX: Math.round(this.container.x - halfW),
      maxX: Math.round(this.container.x + halfW),
      minY: Math.round(this.container.y - halfH),
      maxY: Math.round(this.container.y + halfH),
      width: Math.round(visualW),
      height: Math.round(visualH),
    };
  }

  private drawHpBar(forceShow: boolean = false): void {
    this.hpBarBg.clear();
    this.hpBarFill.clear();

    if (!forceShow && this.hp >= this.maxHp) {
      return;
    }

    const mult = this.scaleTier.soldierScale;
    const barW = 48 * mult;
    const barH = 5;
    const barX = -barW / 2;
    const barY = -mult * 80;

    this.hpBarBg.fillStyle(0x0a1128, 0.85);
    this.hpBarBg.fillRect(barX, barY, barW, barH);

    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBarFill.fillStyle(0x00f5d4, 1);
    this.hpBarFill.fillRect(barX, barY, barW * ratio, barH);
  }

  private drawDebugBox(): void {
    if (!this.debugBox) return;
    this.debugBox.clear();
    const b = this.getVisualBounds();
    this.debugBox.lineStyle(2, 0x00ffff, 0.95);
    this.debugBox.strokeRect(-b.width / 2, -b.height / 2, b.width, b.height);
  }
}
