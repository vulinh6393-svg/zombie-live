import Phaser from 'phaser';
import { ZombieSnapshot } from '../types.js';
import { DEFAULT_SCALE_TIER, ScaleTier } from '../config/SpriteScaleConfig.js';

export type ZombieVisualState = 'idle' | 'walk' | 'attack' | 'death';

export class ZombieRenderer {
  readonly id: string;
  readonly type: string;

  private scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private hpBarBg: Phaser.GameObjects.Graphics;
  private hpBarFill: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;

  private targetX: number;
  private targetY: number;
  public hp: number;
  public maxHp: number;
  public isDead: boolean = false;
  private scaleTier: ScaleTier = DEFAULT_SCALE_TIER;
  private currentState: ZombieVisualState = 'idle';

  constructor(scene: Phaser.Scene, snapshot: ZombieSnapshot, scaleTier: ScaleTier = DEFAULT_SCALE_TIER) {
    this.scene = scene;
    this.id = snapshot.id;
    this.type = snapshot.type;
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.hp = snapshot.hp;
    this.maxHp = snapshot.maxHp;
    this.scaleTier = scaleTier;

    this.container = scene.add.container(snapshot.x, snapshot.y);

    // 1. Zombie Walker Real Sprite (Riley Gombart CC0)
    this.sprite = scene.add.sprite(0, 0, 'zombie_idle_0');
    this.sprite.setOrigin(0.5, 0.5);

    // 2. HP Bar and Nameplate
    this.hpBarBg = scene.add.graphics();
    this.hpBarFill = scene.add.graphics();
    this.nameText = scene.add.text(0, -65, snapshot.name || 'Zombie Walker', {
      fontFamily: 'Arial Black',
      fontSize: '13px',
      color: '#ff5400',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.container.add([this.sprite, this.hpBarBg, this.hpBarFill, this.nameText]);

    // Apply scale & rotation (facing down toward base)
    this.applyScale(this.scaleTier);
    this.setRotation(Math.PI / 2);
    this.drawHpBar();

    // Default to walking animation
    this.playState('walk');

    // Spawn entrance animation
    this.container.setScale(0.1);
    scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });
  }

  public applyScale(tier: ScaleTier): void {
    this.scaleTier = tier;
    let mult = tier.walkerScale;

    // Subtle scale modifier for different types (in Mock/Production)
    if (this.type === 'tank') mult *= 1.3;
    else if (this.type === 'runner') mult *= 0.85;
    else if (this.type === 'boss') mult *= 1.6;

    this.sprite.setScale(mult);
    const yOffset = -mult * 105;
    this.nameText.setY(yOffset - 16);
    this.drawHpBar();
  }

  public setRotation(angleRad: number): void {
    if (this.isDead) return;
    this.sprite.setRotation(angleRad);
  }

  public getRotation(): number {
    return this.sprite.rotation;
  }

  public playState(state: ZombieVisualState): void {
    if (this.isDead && state !== 'death') return;
    this.currentState = state;

    switch (state) {
      case 'idle':
        this.sprite.play('walker-idle');
        break;
      case 'walk':
        this.sprite.play('walker-walk');
        break;
      case 'attack':
        this.sprite.play('walker-attack');
        break;
      case 'death':
        this.triggerDeath();
        break;
    }
  }

  public triggerHitFlash(): void {
    if (this.isDead) return;
    this.sprite.setTint(0xff3333);
    this.scene.tweens.add({
      targets: this.sprite,
      x: '+=6',
      duration: 50,
      yoyo: true,
      onComplete: () => {
        this.sprite.clearTint();
      },
    });
  }

  public triggerDeath(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.hp = 0;
    this.drawHpBar();

    // 1. Switch to corpse frame
    this.sprite.stop();
    this.sprite.setTexture('zombie_corpse_0');
    this.sprite.setAlpha(0.9);
    this.nameText.setVisible(false);
    this.hpBarBg.setVisible(false);
    this.hpBarFill.setVisible(false);

    // 2. Spawn permanent blood pool decal on asphalt
    const blood = this.scene.add.graphics();
    blood.fillStyle(0x660000, 0.75);
    blood.fillEllipse(this.container.x, this.container.y, 45, 30);
    blood.fillStyle(0x3d0000, 0.9);
    blood.fillCircle(this.container.x + 6, this.container.y + 4, 18);
    blood.setDepth(1);

    // 3. Fade out corpse after 8 seconds
    this.scene.tweens.add({
      targets: [this.container, blood],
      alpha: 0,
      delay: 7000,
      duration: 1500,
      onComplete: () => {
        blood.destroy();
        this.container.destroy();
      },
    });
  }

  public updateSnapshot(snapshot: ZombieSnapshot): void {
    if (this.isDead) return;
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;

    if (snapshot.hp < this.hp) {
      this.triggerHitFlash();
    }

    this.hp = snapshot.hp;
    this.maxHp = snapshot.maxHp;
    this.drawHpBar();

    if (this.hp <= 0) {
      this.triggerDeath();
    }
  }

  public update(deltaMs: number): void {
    if (this.isDead) return;
    // Linear interpolation for smooth 60 FPS motion
    const lerpFactor = Math.min(1, (deltaMs / 100) * 1.5);
    this.container.x = Phaser.Math.Linear(this.container.x, this.targetX, lerpFactor);
    this.container.y = Phaser.Math.Linear(this.container.y, this.targetY, lerpFactor);
  }

  public destroy(): void {
    if (!this.isDead) {
      this.container.destroy();
    }
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
    if (this.isDead) return;

    const mult = this.scaleTier.walkerScale;
    const barW = 55 * mult;
    const barH = 6;
    const barX = -barW / 2;
    const barY = -mult * 105;

    this.hpBarBg.fillStyle(0x111111, 0.85);
    this.hpBarBg.fillRect(barX, barY, barW, barH);

    const ratio = Math.max(0, this.hp / this.maxHp);
    const color = ratio > 0.4 ? 0xff5400 : 0xcc0000;
    this.hpBarFill.fillStyle(color, 1);
    this.hpBarFill.fillRect(barX, barY, barW * ratio, barH);
  }
}
