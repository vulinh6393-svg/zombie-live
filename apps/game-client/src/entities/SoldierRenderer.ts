import Phaser from 'phaser';
import { SoldierSnapshot } from '../types.js';
import { DEFAULT_SCALE_TIER, ScaleTier } from '../config/SpriteScaleConfig.js';

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

  private targetX: number;
  private targetY: number;
  public hp: number;
  public maxHp: number;
  private scaleTier: ScaleTier = DEFAULT_SCALE_TIER;
  private currentState: SoldierState = 'idle';

  constructor(scene: Phaser.Scene, snapshot: SoldierSnapshot, scaleTier: ScaleTier = DEFAULT_SCALE_TIER) {
    this.scene = scene;
    this.id = snapshot.id;
    this.userId = snapshot.userId;
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.hp = snapshot.hp;
    this.maxHp = snapshot.maxHp;
    this.scaleTier = scaleTier;

    this.container = scene.add.container(snapshot.x, snapshot.y);

    // 1. Lower body feet layer (Riley Gombart CC-BY)
    this.feetSprite = scene.add.sprite(0, 0, 'survivor_feet_walk_0');
    this.feetSprite.setOrigin(0.5, 0.5);

    // 2. Upper body with assault rifle
    this.mainSprite = scene.add.sprite(0, 0, 'survivor_idle_0');
    this.mainSprite.setOrigin(0.35, 0.5); // Pivot at shoulders/torso for natural gun aiming

    // 3. HP bar and Name tag
    this.hpBarBg = scene.add.graphics();
    this.hpBarFill = scene.add.graphics();
    this.nameText = scene.add.text(0, -55, snapshot.name || 'Chiến Binh', {
      fontFamily: 'Arial Black',
      fontSize: '13px',
      color: '#00f5d4',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.container.add([this.feetSprite, this.mainSprite, this.hpBarBg, this.hpBarFill, this.nameText]);

    // Apply scale & rotation (facing upward toward zombies)
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
      duration: 250,
      ease: 'Back.easeOut',
    });
  }

  public applyScale(tier: ScaleTier): void {
    this.scaleTier = tier;
    const mult = tier.soldierScale;
    this.mainSprite.setScale(mult);
    this.feetSprite.setScale(mult * 0.95);

    const yOffset = -mult * 90;
    this.nameText.setY(yOffset - 16);
    this.drawHpBar();
  }

  public setRotation(angleRad: number): void {
    this.mainSprite.setRotation(angleRad);
    this.feetSprite.setRotation(angleRad);
  }

  public getRotation(): number {
    return this.mainSprite.rotation;
  }

  public aimAt(targetX: number, targetY: number): void {
    const angle = Phaser.Math.Angle.Between(this.container.x, this.container.y, targetX, targetY);
    this.setRotation(angle);
  }

  public playState(state: SoldierState): void {
    this.currentState = state;
    switch (state) {
      case 'idle':
        this.mainSprite.play('survivor-idle');
        this.feetSprite.stop();
        break;
      case 'walk':
        this.mainSprite.play('survivor-walk');
        this.feetSprite.play('survivor-feet-walk');
        break;
      case 'shoot':
        this.mainSprite.play('survivor-shoot');
        this.mainSprite.once('animationcomplete', () => {
          if (this.currentState === 'shoot') {
            this.playState('idle');
          }
        });
        break;
      case 'reload':
        this.mainSprite.play('survivor-reload');
        this.mainSprite.once('animationcomplete', () => {
          if (this.currentState === 'reload') {
            this.playState('idle');
          }
        });
        break;
    }
  }

  public fireMuzzleFlash(): { flashX: number; flashY: number; angle: number } {
    this.playState('shoot');
    const angle = this.getRotation();
    const barrelDist = 48 * this.scaleTier.soldierScale;
    const flashX = this.container.x + Math.cos(angle) * barrelDist;
    const flashY = this.container.y + Math.sin(angle) * barrelDist;

    const flash = this.scene.add.image(flashX, flashY, 'muzzle_flash');
    flash.setScale(0.7 * this.scaleTier.soldierScale);
    flash.setRotation(angle);
    flash.setDepth(20);
    this.scene.time.delayedCall(60, () => flash.destroy());

    // Gun recoil tween
    this.scene.tweens.add({
      targets: this.mainSprite,
      x: -Math.cos(angle) * 6,
      y: -Math.sin(angle) * 6,
      duration: 50,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.mainSprite.setPosition(0, 0);
      },
    });

    return { flashX, flashY, angle };
  }

  public updateSnapshot(snapshot: SoldierSnapshot): void {
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.hp = snapshot.hp;
    this.maxHp = snapshot.maxHp;
    this.drawHpBar();
  }

  public update(deltaMs: number): void {
    // Interpolation for smooth 60 FPS motion from 10Hz snapshots
    const lerpFactor = Math.min(1, (deltaMs / 100) * 2);
    this.container.x = Phaser.Math.Linear(this.container.x, this.targetX, lerpFactor);
    this.container.y = Phaser.Math.Linear(this.container.y, this.targetY, lerpFactor);
  }

  public highlightReinforcement(): void {
    const aura = this.scene.add.graphics();
    aura.lineStyle(3, 0x00f5d4, 1);
    aura.strokeCircle(this.container.x, this.container.y, 45);
    aura.setDepth(15);

    this.scene.tweens.add({
      targets: aura,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => aura.destroy(),
    });
  }

  public destroy(): void {
    this.scene.tweens.add({
      targets: this.container,
      scale: 0.1,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        this.container.destroy();
      },
    });
  }

  public getX(): number {
    return this.container.x;
  }

  public getY(): number {
    return this.container.y;
  }

  private drawHpBar(): void {
    this.hpBarBg.clear();
    this.hpBarFill.clear();

    const mult = this.scaleTier.soldierScale;
    const barW = 50 * mult;
    const barH = 6;
    const barX = -barW / 2;
    const barY = -mult * 90;

    this.hpBarBg.fillStyle(0x111111, 0.85);
    this.hpBarBg.fillRect(barX, barY, barW, barH);

    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBarFill.fillStyle(0x00f5d4, 1);
    this.hpBarFill.fillRect(barX, barY, barW * ratio, barH);
  }
}
