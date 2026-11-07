import Phaser from 'phaser';
import { ScaleTier, DEFAULT_SCALE_TIER } from '../config/SpriteScaleConfig.js';

export type CharacterType = 'walker' | 'survivor';
export type WalkerState = 'idle' | 'walk' | 'attack' | 'hit' | 'death';
export type SurvivorState = 'idle' | 'walk' | 'aim' | 'shoot' | 'reload' | 'hit';

export class CharacterRenderer {
  public scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  public type: CharacterType;

  // Visual sprites
  private feetSprite?: Phaser.GameObjects.Sprite;
  private mainSprite: Phaser.GameObjects.Sprite;
  private hpBarBg: Phaser.GameObjects.Graphics;
  private hpBarFill: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;

  // State
  private currentState: WalkerState | SurvivorState = 'idle';
  private scaleTier: ScaleTier = DEFAULT_SCALE_TIER;
  public hp: number = 100;
  public maxHp: number = 100;
  public isDead: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: CharacterType,
    name: string = '',
    scaleTier: ScaleTier = DEFAULT_SCALE_TIER
  ) {
    this.scene = scene;
    this.type = type;
    this.scaleTier = scaleTier;
    this.container = scene.add.container(x, y);

    if (type === 'survivor') {
      // Lower body feet layer
      this.feetSprite = scene.add.sprite(0, 0, 'survivor_feet_walk_0');
      this.feetSprite.setOrigin(0.5, 0.5);
      this.container.add(this.feetSprite);

      // Upper body with assault rifle
      this.mainSprite = scene.add.sprite(0, 0, 'survivor_idle_0');
      this.mainSprite.setOrigin(0.35, 0.5); // Center near shoulders/torso for accurate rotation
      this.container.add(this.mainSprite);
    } else {
      // Zombie Walker
      this.mainSprite = scene.add.sprite(0, 0, 'zombie_idle_0');
      this.mainSprite.setOrigin(0.5, 0.5);
      this.container.add(this.mainSprite);
    }

    // Health Bar & Nameplate
    this.hpBarBg = scene.add.graphics();
    this.hpBarFill = scene.add.graphics();
    this.nameText = scene.add.text(0, -65, name || (type === 'survivor' ? 'Survivor' : 'Walker'), {
      fontFamily: "'Montserrat', 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif",
      fontSize: '15px',
      fontStyle: 'bold',
      color: type === 'survivor' ? '#00f5d4' : '#ff5400',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.container.add([this.hpBarBg, this.hpBarFill, this.nameText]);
    this.applyScale(this.scaleTier);
    this.updateHpBar();

    // Start with idle animation
    this.playState('idle');
  }

  public applyScale(tier: ScaleTier): void {
    this.scaleTier = tier;
    const mult = this.type === 'walker' ? tier.walkerScale : tier.soldierScale;
    this.mainSprite.setScale(mult);
    if (this.feetSprite) {
      this.feetSprite.setScale(mult * 0.95);
    }

    // Position HP bar & nameplate nicely above character head
    const yOffset = this.type === 'walker' ? -mult * 105 : -mult * 90;
    this.nameText.setY(yOffset - 18);
    this.updateHpBar();
  }

  public setRotation(angleRad: number): void {
    if (this.isDead) return;
    this.mainSprite.setRotation(angleRad);
    if (this.feetSprite) {
      this.feetSprite.setRotation(angleRad);
    }
  }

  public getRotation(): number {
    return this.mainSprite.rotation;
  }

  public playState(state: WalkerState | SurvivorState): void {
    if (this.isDead && state !== 'death') return;
    this.currentState = state;

    if (this.type === 'walker') {
      switch (state) {
        case 'idle':
          this.mainSprite.play('walker-idle');
          break;
        case 'walk':
          this.mainSprite.play('walker-walk');
          break;
        case 'attack':
          this.mainSprite.play('walker-attack');
          break;
        case 'hit':
          this.triggerHitFlash();
          break;
        case 'death':
          this.triggerDeath();
          break;
      }
    } else {
      // Survivor
      switch (state) {
        case 'idle':
        case 'aim':
          this.mainSprite.play('survivor-idle');
          if (this.feetSprite) this.feetSprite.stop();
          break;
        case 'walk':
          this.mainSprite.play('survivor-walk');
          if (this.feetSprite) this.feetSprite.play('survivor-feet-walk');
          break;
        case 'shoot':
          this.mainSprite.play('survivor-shoot');
          this.mainSprite.once('animationcomplete', () => {
            if (!this.isDead && this.currentState === 'shoot') {
              this.playState('idle');
            }
          });
          break;
        case 'reload':
          this.mainSprite.play('survivor-reload');
          this.mainSprite.once('animationcomplete', () => {
            if (!this.isDead && this.currentState === 'reload') {
              this.playState('idle');
            }
          });
          break;
        case 'hit':
          this.triggerHitFlash();
          break;
      }
    }
  }

  public triggerHitFlash(): void {
    this.mainSprite.setTint(0xff3333);
    this.scene.tweens.add({
      targets: this.mainSprite,
      x: '+=8',
      duration: 60,
      yoyo: true,
      onComplete: () => {
        this.mainSprite.clearTint();
      },
    });
  }

  public triggerDeath(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.hp = 0;
    this.updateHpBar();

    // 1. Switch sprite to real corpse frame
    this.mainSprite.stop();
    this.mainSprite.setTexture('zombie_corpse_0');
    this.mainSprite.setAlpha(0.95);
    this.nameText.setVisible(false);
    this.hpBarBg.setVisible(false);
    this.hpBarFill.setVisible(false);

    // 2. Add ground blood puddle under corpse
    const bloodDecal = this.scene.add.graphics();
    bloodDecal.fillStyle(0x7f0000, 0.7);
    bloodDecal.fillCircle(this.container.x, this.container.y, 45);
    bloodDecal.fillStyle(0x4a0000, 0.9);
    bloodDecal.fillCircle(this.container.x + 10, this.container.y + 6, 28);
    bloodDecal.setDepth(1);

    // 3. Gradual fade out after 6 seconds
    this.scene.tweens.add({
      targets: [this.container, bloodDecal],
      alpha: 0,
      delay: 5000,
      duration: 1500,
      onComplete: () => {
        bloodDecal.destroy();
      },
    });
  }

  public takeDamage(dmg: number): void {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - dmg);
    this.updateHpBar();
    this.triggerHitFlash();

    if (this.hp <= 0) {
      this.playState('death');
    }
  }

  public reset(x: number, y: number): void {
    this.isDead = false;
    this.hp = this.maxHp;
    this.container.setPosition(x, y);
    this.container.setAlpha(1);
    this.nameText.setVisible(true);
    this.hpBarBg.setVisible(true);
    this.hpBarFill.setVisible(true);
    this.mainSprite.clearTint();
    this.updateHpBar();
    this.playState('idle');
  }

  private updateHpBar(): void {
    this.hpBarBg.clear();
    this.hpBarFill.clear();
    if (this.isDead) return;

    const mult = this.type === 'walker' ? this.scaleTier.walkerScale : this.scaleTier.soldierScale;
    const barWidth = 70;
    const barHeight = 8;
    const barX = -barWidth / 2;
    const barY = this.type === 'walker' ? -mult * 105 : -mult * 90;

    this.hpBarBg.fillStyle(0x111111, 0.85);
    this.hpBarBg.fillRect(barX, barY, barWidth, barHeight);

    const ratio = Math.max(0, this.hp / this.maxHp);
    const color = this.type === 'survivor' ? 0x00f5d4 : (ratio > 0.4 ? 0xff0055 : 0x770022);
    this.hpBarFill.fillStyle(color, 1);
    this.hpBarFill.fillRect(barX, barY, barWidth * ratio, barHeight);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
