import Phaser from 'phaser';
import { TowerSnapshot } from '../types.js';

export class TowerRenderer {
  readonly id: string;
  readonly type: string;
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private aura: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, snapshot: TowerSnapshot) {
    this.scene = scene;
    this.id = snapshot.id;
    this.type = snapshot.type;

    const textureKey = snapshot.type === 'machinegun'
      ? 'tower_machinegun'
      : snapshot.type === 'plasma'
      ? 'tower_plasma'
      : 'tower_tesla';

    this.sprite = scene.add.sprite(0, 0, textureKey);
    this.aura = scene.add.graphics();

    const label = scene.add.text(0, 42, snapshot.name, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#00bbf9',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.container = scene.add.container(snapshot.x, snapshot.y, [
      this.aura,
      this.sprite,
      label,
    ]);

    // Idle pulse
    scene.tweens.add({
      targets: this.sprite,
      scale: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  aimAt(targetX: number, targetY: number): void {
    const angle = Phaser.Math.Angle.Between(this.container.x, this.container.y, targetX, targetY);
    this.sprite.setRotation(angle + Math.PI / 2);
  }

  destroy(): void {
    this.container.destroy();
  }

  getX(): number {
    return this.container.x;
  }

  getY(): number {
    return this.container.y;
  }
}
