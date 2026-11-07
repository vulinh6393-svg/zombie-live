import Phaser from 'phaser';
import { TowerSnapshot } from '../types.js';
import { GAME_FONTS } from '../config/FontConfig.js';

export class TowerRenderer {
  readonly id: string;
  readonly type: string;

  private scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  private mountPad: Phaser.GameObjects.Graphics;
  private baseSprite: Phaser.GameObjects.Image;
  private gunSprite: Phaser.GameObjects.Image;
  private labelText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, snapshot: TowerSnapshot) {
    this.scene = scene;
    this.id = snapshot.id;
    this.type = snapshot.type;

    // Depth 22: Above fortress wall parapet, commanding the line of fire
    this.container = scene.add.container(snapshot.x, snapshot.y).setDepth(22);

    // 1. Reinforced Concrete Bunker / Gun Pit Mount
    this.mountPad = scene.add.graphics();
    this.mountPad.fillStyle(0x1a2130, 0.95);
    this.mountPad.fillCircle(0, 0, 48);
    this.mountPad.lineStyle(3, 0x3e4c66, 1);
    this.mountPad.strokeCircle(0, 0, 48);
    this.mountPad.fillStyle(0x0e131d, 1);
    this.mountPad.fillCircle(0, 0, 32);

    // Steel bolts / rivets around ring
    this.mountPad.fillStyle(0xfee440, 0.7);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      this.mountPad.fillCircle(Math.cos(a) * 40, Math.sin(a) * 40, 2.5);
    }

    // 2. Turret Base (Kenney CC0) - Scaled prominently
    this.baseSprite = scene.add.image(0, 0, 'turret_base').setScale(1.1);

    // 3. Rotating Turret Dual Gun (Kenney CC0)
    this.gunSprite = scene.add.image(0, 0, 'turret_gun_dual').setScale(1.1);
    this.gunSprite.setOrigin(0.28, 0.5); // Center pivot for rotation

    // 4. Identification Label with Vietnamese font
    this.labelText = scene.add.text(0, 44, snapshot.name || 'Ụ Pháo Sentry', {
      fontFamily: GAME_FONTS.TACTICAL,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#00bbf9',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.container.add([this.mountPad, this.baseSprite, this.gunSprite, this.labelText]);
  }

  aimAt(targetX: number, targetY: number): void {
    const angle = Phaser.Math.Angle.Between(this.container.x, this.container.y, targetX, targetY);
    this.gunSprite.setRotation(angle);
  }

  fireMuzzleFlash(): { flashX: number; flashY: number; angle: number } {
    const angle = this.gunSprite.rotation;
    const barrelDist = 58;
    const flashX = this.container.x + Math.cos(angle) * barrelDist;
    const flashY = this.container.y + Math.sin(angle) * barrelDist;

    // Heavy recoil tween
    this.scene.tweens.add({
      targets: this.gunSprite,
      scaleX: 0.95,
      duration: 50,
      yoyo: true,
    });

    const flash = this.scene.add.image(flashX, flashY, 'muzzle_flash');
    flash.setScale(0.9);
    flash.setRotation(angle);
    flash.setDepth(30);
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
