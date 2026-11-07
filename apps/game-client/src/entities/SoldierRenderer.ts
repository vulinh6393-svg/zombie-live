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

    this.container = scene.add.container(snapshot.x, snapshot.y).setDepth(15);

    // 1. Lower body feet layer (Riley Gombart CC-BY)
    this.feetSprite = scene.add.sprite(0, 0, 'survivor_feet_walk_0');
    this.feetSprite.setOrigin(0.5, 0.5);

    // 2. Upper body with assault rifle
    this.mainSprite = scene.add.sprite(0, 0, 'survivor_idle_0');
    this.mainSprite.setOrigin(0.35, 0.5); // Pivot at shoulders/torso for natural gun aiming

    // 3. Compact tactical HP bar (clean micro-indicator, only visible when taking damage)
    this.hpBarBg = scene.add.graphics();
    this.hpBarFill = scene.add.graphics();

    // 4. Name Tag (Hidden by default to prevent screen clutter; shows during highlight events)
    this.nameText = scene.add.text(0, -60, snapshot.name || '', {
      fontFamily: 'Arial Black',
      fontSize: '12px',
      color: '#00f5d4',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.nameText.setVisible(false);

    this.container.add([this.feetSprite, this.mainSprite, this.hpBarBg, this.hpBarFill, this.nameText]);

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
    flash.setDepth(25);
    this.scene.time.delayedCall(50, () => flash.destroy());

    // Gun recoil tween
    this.scene.tweens.add({
      targets: this.mainSprite,
      x: -Math.cos(angle) * 5,
      y: -Math.sin(angle) * 5,
      duration: 45,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.mainSprite.setPosition(0, 0);
      },
    });

    return { flashX, flashY, angle };
  }

  public showTemporaryName(name: string, durationMs: number = 2500): void {
    this.nameText.setText(name);
    this.nameText.setVisible(true);
    this.nameText.setAlpha(1);

    this.scene.tweens.add({
      targets: this.nameText,
      alpha: 0,
      delay: durationMs - 400,
      duration: 400,
      onComplete: () => {
        this.nameText.setVisible(false);
      },
    });
  }

  public updateSnapshot(snapshot: SoldierSnapshot): void {
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.hp = snapshot.hp;
    this.maxHp = snapshot.maxHp;
    this.drawHpBar();
  }

  public update(deltaMs: number): void {
    const lerpFactor = Math.min(1, (deltaMs / 100) * 2);
    this.container.x = Phaser.Math.Linear(this.container.x, this.targetX, lerpFactor);
    this.container.y = Phaser.Math.Linear(this.container.y, this.targetY, lerpFactor);
  }

  public highlightReinforcement(viewerName?: string): void {
    const aura = this.scene.add.graphics();
    aura.lineStyle(3, 0x00f5d4, 1);
    aura.strokeCircle(this.container.x, this.container.y, 42);
    aura.setDepth(20);

    this.scene.tweens.add({
      targets: aura,
      scaleX: 1.7,
      scaleY: 1.7,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => aura.destroy(),
    });

    if (viewerName) {
      this.showTemporaryName(`⭐ @${viewerName}`, 3000);
    }
  }

  public destroy(): void {
    this.scene.tweens.add({
      targets: this.container,
      scale: 0.1,
      alpha: 0,
      duration: 200,
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

    // Only draw HP bar if injured to keep screen ultra-clean
    if (this.hp >= this.maxHp) return;

    const mult = this.scaleTier.soldierScale;
    const barW = 36 * mult;
    const barH = 4;
    const barX = -barW / 2;
    const barY = -mult * 70;

    this.hpBarBg.fillStyle(0x111111, 0.8);
    this.hpBarBg.fillRect(barX, barY, barW, barH);

    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBarFill.fillStyle(0x00f5d4, 1);
    this.hpBarFill.fillRect(barX, barY, barW * ratio, barH);
  }
}
