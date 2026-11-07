import Phaser from 'phaser';

/**
 * Loads verified real sprites and assets into Phaser Loader.
 * No hardcoded paths in scenes.
 */
export class SpriteAssetLoader {
  public static loadAll(scene: Phaser.Scene): void {
    // --- 1. Zombie Walker Frames ---
    for (let i = 0; i < 17; i++) {
      scene.load.image(`zombie_idle_${i}`, `assets/characters/zombie/idle/idle_${i}.png`);
      scene.load.image(`zombie_move_${i}`, `assets/characters/zombie/move/move_${i}.png`);
    }
    for (let i = 0; i < 9; i++) {
      scene.load.image(`zombie_attack_${i}`, `assets/characters/zombie/attack/attack_${i}.png`);
    }
    scene.load.image('zombie_corpse_0', 'assets/characters/zombie/corpse/corpse_0.png');

    // --- 2. Survivor Soldier Frames ---
    for (let i = 0; i < 20; i++) {
      scene.load.image(`survivor_idle_${i}`, `assets/characters/survivor/idle/idle_${i}.png`);
      scene.load.image(`survivor_move_${i}`, `assets/characters/survivor/move/move_${i}.png`);
      scene.load.image(`survivor_reload_${i}`, `assets/characters/survivor/reload/reload_${i}.png`);
      scene.load.image(`survivor_feet_walk_${i}`, `assets/characters/survivor/feet/feet_walk_${i}.png`);
    }
    for (let i = 0; i < 3; i++) {
      scene.load.image(`survivor_shoot_${i}`, `assets/characters/survivor/shoot/shoot_${i}.png`);
    }

    // --- 3. Weapons & Turrets (Kenney CC0) ---
    scene.load.image('turret_base', 'assets/weapons/turret_base.png');
    scene.load.image('turret_gun_dual', 'assets/weapons/turret_gun_dual.png');
    scene.load.image('turret_gun_single', 'assets/weapons/turret_gun_single.png');
    scene.load.image('bullet_tracer', 'assets/weapons/bullet_tracer.png');

    // --- 4. Environment & Barricades (Kenney CC0) ---
    scene.load.image('barricade_barrier', 'assets/environment/barricade_barrier.png');
    scene.load.image('sandbags', 'assets/environment/sandbags.png');
    scene.load.image('ammo_crate', 'assets/environment/ammo_crate.png');
    scene.load.image('road_asphalt', 'assets/environment/road_asphalt.png');
    scene.load.image('road_line', 'assets/environment/road_line.png');

    // --- 5. VFX ---
    scene.load.image('muzzle_flash', 'assets/vfx/muzzle_flash.png');
    scene.load.image('hit_explosion', 'assets/vfx/hit_explosion.png');
  }
}
