import Phaser from 'phaser';
import { SoldierSnapshot } from '../types.js';

export class SoldierRenderer {
  readonly id: string;
  readonly userId: string;
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private nameText: Phaser.GameObjects.Text;
  private hpBar: Phaser.GameObjects.Graphics;
  private targetX: number;
  private targetY: number;
  private currentHp: number;
  private maxHp: number;

  constructor(scene: Phaser.Scene, snapshot: SoldierSnapshot) {
    this.scene = scene;
    this.id = snapshot.id;
    this.userId = snapshot.userId;
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.currentHp = snapshot.hp;
    this.maxHp = snapshot.maxHp;

    this.sprite = scene.add.sprite(0, 0, 'soldier_base');
    this.hpBar = scene.add.graphics();
    this.nameText = scene.add.text(0, -28, snapshot.name, {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#00f5d4',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.container = scene.add.container(snapshot.x, snapshot.y, [
      this.sprite,
      this.hpBar,
      this.nameText,
    ]);

    this.drawHpBar();

    // Spawn entrance tween
    this.container.setScale(0);
    scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  updateSnapshot(snapshot: SoldierSnapshot): void {
    this.targetX = snapshot.x;
    this.targetY = snapshot.y;
    this.currentHp = snapshot.hp;
    this.maxHp = snapshot.maxHp;
    this.drawHpBar();
  }

  update(deltaMs: number): void {
    const lerpFactor = Math.min(1, (deltaMs / 100) * 2);
    this.container.x = Phaser.Math.Linear(this.container.x, this.targetX, lerpFactor);
    this.container.y = Phaser.Math.Linear(this.container.y, this.targetY, lerpFactor);
  }

  fireRecoil(): void {
    this.scene.tweens.add({
      targets: this.sprite,
      y: 4,
      duration: 60,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  destroy(): void {
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

  getX(): number {
    return this.container.x;
  }

  getY(): number {
    return this.container.y;
  }

  private drawHpBar(): void {
    this.hpBar.clear();
    const width = 36;
    const height = 4;
    const x = -width / 2;
    const y = -18;

    this.hpBar.fillStyle(0x1a2639, 0.8);
    this.hpBar.fillRect(x, y, width, height);

    const ratio = Math.max(0, Math.min(1, this.currentHp / this.maxHp));
    this.hpBar.fillStyle(0x00f5d4, 1);
    this.hpBar.fillRect(x, y, width * ratio, height);
  }
}
