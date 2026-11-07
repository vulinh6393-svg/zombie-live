import Phaser from 'phaser';
import { ZombieSnapshot } from '../types.js';

export class ZombieRenderer {
  readonly id: string;
  readonly type: string;
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private hpBar: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private targetX: number;
  private targetY: number;
  private currentHp: number;
  private maxHp: number;
  private isDead: boolean = false;

  constructor(scene: Phaser.Scene, snapshot: ZombieSnapshot) {
    this.scene = scene;
    this.id = snapshot.id;
    this.type = snapshot.type;
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.currentHp = snapshot.hp;
    this.maxHp = snapshot.maxHp;

    const textureKey = this.getTextureKey(snapshot.type);
    this.sprite = scene.add.sprite(0, 0, textureKey);
    this.hpBar = scene.add.graphics();
    this.nameText = scene.add.text(0, -32, snapshot.name, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.container = scene.add.container(snapshot.x, snapshot.y, [
      this.sprite,
      this.hpBar,
      this.nameText,
    ]);

    // Distinct visual traits per type
    this.applyTypeTraits(snapshot.type);
    this.drawHpBar();

    // Spawn animation
    this.container.setScale(0);
    scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 250,
      ease: 'Back.easeOut',
    });
  }

  updateSnapshot(snapshot: ZombieSnapshot): void {
    if (this.isDead) return;
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;

    if (snapshot.hp < this.currentHp) {
      this.playHitAnimation();
    }
    this.currentHp = snapshot.hp;
    this.maxHp = snapshot.maxHp;
    this.drawHpBar();
  }

  update(deltaMs: number): void {
    if (this.isDead) return;
    // Linear interpolation for smooth 60 FPS motion from 10Hz snapshots
    const lerpFactor = Math.min(1, (deltaMs / 100) * 1.5);
    this.container.x = Phaser.Math.Linear(this.container.x, this.targetX, lerpFactor);
    this.container.y = Phaser.Math.Linear(this.container.y, this.targetY, lerpFactor);

    // Subtle walk bobbing animation
    this.sprite.y = Math.sin(this.scene.time.now * 0.008) * 3;
  }

  destroy(): void {
    this.isDead = true;
    this.scene.tweens.add({
      targets: this.container,
      scale: 0.2,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.container.destroy();
      },
    });
  }

  getX(): number {
    return this.container.x;
  }

  getY(): number {
    return this.container.y;
  }

  private playHitAnimation(): void {
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => {
      this.sprite.clearTint();
    });
  }

  private drawHpBar(): void {
    this.hpBar.clear();
    const width = 44;
    const height = 5;
    const x = -width / 2;
    const y = -22;

    // Background
    this.hpBar.fillStyle(0x222222, 0.8);
    this.hpBar.fillRect(x, y, width, height);

    // Health
    const ratio = Math.max(0, Math.min(1, this.currentHp / this.maxHp));
    const hpColor = ratio > 0.5 ? 0x38b000 : ratio > 0.2 ? 0xffb703 : 0xd90429;
    this.hpBar.fillStyle(hpColor, 1);
    this.hpBar.fillRect(x, y, width * ratio, height);
  }

  private getTextureKey(type: string): string {
    const map: Record<string, string> = {
      walker: 'zombie_walker',
      runner: 'zombie_runner',
      armored: 'zombie_armored',
      spitter: 'zombie_spitter',
      healer: 'zombie_healer',
      brute: 'zombie_brute',
      shocker: 'zombie_shocker',
      summoner: 'zombie_summoner',
      shadow: 'zombie_shadow',
      zombie_king: 'zombie_king',
    };
    return map[type] || 'zombie_walker';
  }

  private applyTypeTraits(type: string): void {
    if (type === 'shadow') {
      this.sprite.setAlpha(0.65);
    } else if (type === 'runner') {
      this.sprite.setScale(0.9);
    } else if (type === 'brute') {
      this.nameText.setY(-55);
    }
  }
}
