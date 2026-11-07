import Phaser from 'phaser';

/**
 * Creates and registers all frame-by-frame animations into Phaser Animation Manager.
 * No tween-based character locomotion substitution.
 */
export class CharacterAnimationRegistry {
  private static registered = false;

  public static registerAll(scene: Phaser.Scene): void {
    if (this.registered) return;

    // --- 1. Zombie Walker Animations ---
    const zombieIdleFrames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 17; i++) {
      zombieIdleFrames.push({ key: `zombie_idle_${i}` });
    }
    scene.anims.create({
      key: 'walker-idle',
      frames: zombieIdleFrames,
      frameRate: 12,
      repeat: -1,
    });

    const zombieMoveFrames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 17; i++) {
      zombieMoveFrames.push({ key: `zombie_move_${i}` });
    }
    scene.anims.create({
      key: 'walker-walk',
      frames: zombieMoveFrames,
      frameRate: 16,
      repeat: -1,
    });

    const zombieAttackFrames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 9; i++) {
      zombieAttackFrames.push({ key: `zombie_attack_${i}` });
    }
    scene.anims.create({
      key: 'walker-attack',
      frames: zombieAttackFrames,
      frameRate: 14,
      repeat: -1,
    });

    // --- 2. Survivor Soldier Animations ---
    const survivorIdleFrames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 20; i++) {
      survivorIdleFrames.push({ key: `survivor_idle_${i}` });
    }
    scene.anims.create({
      key: 'survivor-idle',
      frames: survivorIdleFrames,
      frameRate: 12,
      repeat: -1,
    });

    const survivorMoveFrames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 20; i++) {
      survivorMoveFrames.push({ key: `survivor_move_${i}` });
    }
    scene.anims.create({
      key: 'survivor-walk',
      frames: survivorMoveFrames,
      frameRate: 18,
      repeat: -1,
    });

    const survivorFeetFrames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 20; i++) {
      survivorFeetFrames.push({ key: `survivor_feet_walk_${i}` });
    }
    scene.anims.create({
      key: 'survivor-feet-walk',
      frames: survivorFeetFrames,
      frameRate: 18,
      repeat: -1,
    });

    const survivorShootFrames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 3; i++) {
      survivorShootFrames.push({ key: `survivor_shoot_${i}` });
    }
    scene.anims.create({
      key: 'survivor-shoot',
      frames: survivorShootFrames,
      frameRate: 20,
      repeat: 0,
    });

    const survivorReloadFrames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let i = 0; i < 20; i++) {
      survivorReloadFrames.push({ key: `survivor_reload_${i}` });
    }
    scene.anims.create({
      key: 'survivor-reload',
      frames: survivorReloadFrames,
      frameRate: 16,
      repeat: 0,
    });

    this.registered = true;
  }
}
