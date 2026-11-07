import Phaser from 'phaser';

export class ProjectilePool {
  private scene: Phaser.Scene;
  private projectiles: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene, size: number = 40) {
    this.scene = scene;
    for (let i = 0; i < size; i++) {
      const p = this.scene.add.sprite(0, 0, 'bullet_tracer');
      p.setActive(false).setVisible(false);
      this.projectiles.push(p);
    }
  }

  fireTracer(fromX: number, fromY: number, toX: number, toY: number, speedMs: number = 200): void {
    let p = this.projectiles.find((item) => !item.active);
    if (!p) {
      p = this.scene.add.sprite(0, 0, 'bullet_tracer');
      this.projectiles.push(p);
    }

    const angle = Phaser.Math.Angle.Between(fromX, fromY, toX, toY);
    p.setPosition(fromX, fromY);
    p.setRotation(angle + Math.PI / 2);
    p.setActive(true).setVisible(true).setAlpha(1);

    this.scene.tweens.add({
      targets: p,
      x: toX,
      y: toY,
      duration: speedMs,
      onComplete: () => {
        p.setActive(false).setVisible(false);
        this.createHitImpact(toX, toY);
      },
    });
  }

  private createHitImpact(x: number, y: number): void {
    const spark = this.scene.add.sprite(x, y, 'particle_spark');
    spark.setScale(1.5);
    this.scene.tweens.add({
      targets: spark,
      scale: 0.1,
      alpha: 0,
      duration: 150,
      onComplete: () => spark.destroy(),
    });
  }
}
