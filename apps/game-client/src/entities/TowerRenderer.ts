import Phaser from 'phaser';
import { TowerSnapshot } from '../types.js';

export class TowerRenderer {
  readonly id: string;
  readonly type: string;

  private scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  private baseSprite: Phaser.GameObjects.Image;
  private gunSprite: Phaser.GameObjects.Image;
  private labelText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, snapshot: TowerSnapshot) {
    this.scene = scene;
    this.id = snapshot.id;
    this.type = snapshot.type;

    this.container = scene.add.container(snapshot.x, snapshot.y).setDepth(6);

    // 1. Turret Base (Kenney CC0)
    this.baseSprite = scene.add.image(0, 0, 'turret_base').setScale(0.8);

    // 2. Rotating Turret Dual Gun (Kenney CC0)
    this.gunSprite = scene.add.image(0, 0, 'turret_gun_dual').setScale(0.8);
    this.gunSprite.setOrigin(0.3, 0.5); // Center pivot for rotation

    // 3. Identification Label
    this.labelText = scene.add.text(0, 38, snapshot.name || 'Sentry Turret', {
      fontFamily: 'Arial Black',
      fontSize: '12px',
      color: '#00bbf9',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.container.add([this.baseSprite, this.gunSprite, this.labelText]);
  }

  aimAt(targetX: number, targetY: number): void {
    const angle = Phaser.Math.Angle.Between(this.container.x, this.container.y, targetX, targetY);
    this.gunSprite.setRotation(angle);
  }

  fireMuzzleFlash(): { flashX: number; flashY: number; angle: number } {
    const angle = this.gunSprite.rotation;
    const barrelDist = 42;
    const flashX = this.container.x + Math.cos(angle) * barrelDist;
    const flashY = this.container.y + Math.sin(angle) * barrelDist;

    // Recoil tween
    this.scene.tweens.add({
      targets: this.gunSprite,
      scaleX: 0.72,
      duration: 45,
      yoyo: true,
    });

    const flash = this.scene.add.image(flashX, flashY, 'muzzle_flash');
    flash.setScale(0.75);
    flash.setRotation(angle);
    flash.setDepth(20);
    this.scene.time.delayedCall(50, () => flash.destroy());

    return { flashX, flashY, angle };
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
