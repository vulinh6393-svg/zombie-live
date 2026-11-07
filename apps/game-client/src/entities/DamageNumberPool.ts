import Phaser from 'phaser';
import { GAME_FONTS } from '../config/FontConfig.js';

export class DamageNumberPool {
  private scene: Phaser.Scene;
  private pool: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, initialSize: number = 30) {
    this.scene = scene;
    for (let i = 0; i < initialSize; i++) {
      const text = this.scene.add.text(0, 0, '', {
        fontFamily: GAME_FONTS.DISPLAY,
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ff3333',
        stroke: '#000000',
        strokeThickness: 3,
      }).setDepth(50);
      text.setActive(false).setVisible(false);
      this.pool.push(text);
    }
  }

  showDamage(x: number, y: number, amount: number, isCritical: boolean = false): void {
    let text = this.pool.find((t) => !t.active);
    if (!text) {
      text = this.scene.add.text(0, 0, '', {
        fontFamily: GAME_FONTS.DISPLAY,
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ff3333',
        stroke: '#000000',
        strokeThickness: 3,
      }).setDepth(50);
      this.pool.push(text);
    }

    text.setText(isCritical ? `-${amount} CHÍ MẠNG!` : `-${amount}`);
    text.setColor(isCritical ? '#fee440' : '#ff3333');
    text.setFontSize(isCritical ? 28 : 22);
    text.setPosition(x + (Math.random() * 20 - 10), y - 20);
    text.setActive(true).setVisible(true).setAlpha(1);

    this.scene.tweens.add({
      targets: text,
      y: y - 70,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        text.setActive(false).setVisible(false);
      },
    });
  }

  clear(): void {
    for (const t of this.pool) {
      t.setActive(false).setVisible(false);
    }
  }
}
