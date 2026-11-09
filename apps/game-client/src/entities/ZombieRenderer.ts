import Phaser from 'phaser';
import { ZombieSnapshot } from '../types.js';
import { DEFAULT_SCALE_TIER, ScaleTier } from '../config/SpriteScaleConfig.js';
import { GAME_FONTS } from '../config/FontConfig.js';

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
  private debugBox?: Phaser.GameObjects.Graphics;

  private targetX: number;
  private targetY: number;
  public hp: number;
  public maxHp: number;
  public isDead: boolean = false;
  private scaleTier: ScaleTier = DEFAULT_SCALE_TIER;
  private currentState: ZombieVisualState = 'idle';
  private debugEntities: boolean = false;

  constructor(scene: Phaser.Scene, snapshot: ZombieSnapshot, scaleTier: ScaleTier = DEFAULT_SCALE_TIER, debugEntities: boolean = false) {
    this.scene = scene;
    this.id = snapshot.id;
    this.type = snapshot.type;
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.hp = snapshot.hp;
    this.maxHp = snapshot.maxHp;
    this.scaleTier = scaleTier;
    this.debugEntities = debugEntities;

    // Layer 12: Well above road graphics (depth 1-5) and blood decals (depth 6)
    this.container = scene.add.container(snapshot.x, snapshot.y).setDepth(12);

    // 1. Zombie Walker Real Sprite (Riley Gombart CC0)
    this.sprite = scene.add.sprite(0, 0, 'zombie_idle_0');
    this.sprite.setOrigin(0.5, 0.5);

    // 2. HP Bar and Nameplate with Vietnamese typography support
    this.hpBarBg = scene.add.graphics();
    this.hpBarFill = scene.add.graphics();
    this.nameText = scene.add.text(0, -65, snapshot.name || 'Zombie Walker', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ff5400',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    // Hide name label by default to prevent visual clutter; only show for Boss or Debug
    this.nameText.setVisible(this.type === 'boss' || this.debugEntities);

    this.container.add([this.sprite, this.hpBarBg, this.hpBarFill, this.nameText]);

    if (this.debugEntities) {
      this.debugBox = scene.add.graphics();
      this.container.add(this.debugBox);
    }

    // Apply scale & rotation (facing downward toward fortress)
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

    // Scale modifier for special types
    if (this.type === 'tank') mult *= 1.35;
    else if (this.type === 'runner') mult *= 0.85;
    else if (this.type === 'boss') mult *= 1.7;

    this.sprite.setScale(mult);
    const yOffset = -mult * 105;
    this.nameText.setY(yOffset - 16);
    this.drawHpBar();
    this.drawDebugBox();
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
        if (!this.isDead) {
          this.sprite.clearTint();
        }
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
    this.sprite.clearTint();
    this.nameText.setVisible(false);
    this.hpBarBg.setVisible(false);
    this.hpBarFill.setVisible(false);
    if (this.debugBox) this.debugBox.clear();

    // Lower depth for corpse
    this.container.setDepth(7);

    // 2. Spawn permanent blood pool decal on asphalt (layer 6, below live entities)
    const blood = this.scene.add.graphics();
    blood.fillStyle(0x660000, 0.75);
    blood.fillEllipse(this.container.x, this.container.y, 45, 30);
    blood.fillStyle(0x3d0000, 0.9);
    blood.fillCircle(this.container.x + 6, this.container.y + 4, 18);
    blood.setDepth(6);

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

  public isPermadeath: boolean = false;

  public updateSnapshot(snapshot: ZombieSnapshot): void {
    if (this.isPermadeath) return;

    // If was marked dead but snapshot says it has HP > 0 (re-used ID in mock), resurrect cleanly
    if (this.isDead && snapshot.hp > 0) {
      this.isDead = false;
      this.container.setAlpha(1);
      this.container.setDepth(12);
      this.sprite.setAlpha(1);
      this.nameText.setVisible(true);
      this.hpBarBg.setVisible(true);
      this.hpBarFill.setVisible(true);
      this.playState('walk');
    }

    if (this.isDead) return;

    this.targetX = snapshot.x;
    this.targetY = snapshot.y;

    if (snapshot.hp < this.hp) {
      this.triggerHitFlash();
    }

    this.hp = snapshot.hp;
    this.maxHp = snapshot.maxHp;
    this.drawHpBar();
    this.drawDebugBox();

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

    // Cập nhật hoạt ảnh trạng thái: Tấn công khi chạm ranh giới phòng thủ (y ~ 840), di chuyển khi đang hành quân hoặc thông cổng
    if (this.container.y >= 835 && this.targetY <= 845) {
      if (this.currentState !== 'attack') {
        this.playState('attack');
      }
    } else if (this.container.y < 835 || this.targetY > 850) {
      if (this.currentState === 'attack') {
        this.playState('walk');
      }
    }
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

  public getVisualBounds(): { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number } {
    const mult = this.scaleTier.walkerScale;
    const halfW = (130 * mult) / 2;
    const halfH = (196 * mult) / 2;
    return {
      minX: this.container.x - halfW,
      maxX: this.container.x + halfW,
      minY: this.container.y - halfH,
      maxY: this.container.y + halfH,
      width: halfW * 2,
      height: halfH * 2,
    };
  }

  public getDiagnosticInfo(): {
    id: string;
    type: string;
    hp: number;
    maxHp: number;
    isDead: boolean;
    x: number;
    y: number;
    visible: boolean;
    alpha: number;
    texture: string;
  } {
    return {
      id: this.id,
      type: this.type,
      hp: this.hp,
      maxHp: this.maxHp,
      isDead: this.isDead,
      x: Math.round(this.container.x),
      y: Math.round(this.container.y),
      visible: this.container.visible,
      alpha: this.container.alpha,
      texture: this.sprite.texture.key,
    };
  }

  private drawHpBar(): void {
    this.hpBarBg.clear();
    this.hpBarFill.clear();
    if (this.isDead) return;

    // Only display HP bar when damaged or in debug mode
    if (!this.debugEntities && this.hp >= this.maxHp && this.type !== 'boss') {
      return;
    }

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

  private drawDebugBox(): void {
    if (!this.debugBox || this.isDead) return;
    this.debugBox.clear();
    const mult = this.scaleTier.walkerScale;
    const w = 130 * mult;
    const h = 196 * mult;
    this.debugBox.lineStyle(2, 0x00ff00, 0.9);
    this.debugBox.strokeRect(-w / 2, -h / 2, w, h);
  }
}
