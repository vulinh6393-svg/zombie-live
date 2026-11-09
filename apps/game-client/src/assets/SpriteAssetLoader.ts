import Phaser from 'phaser';

/**
 * Loads verified real sprites and assets into Phaser Loader.
 * No hardcoded paths in scenes.
 */
export class SpriteAssetLoader {
  public static loadAll(scene: Phaser.Scene): void {
    const safeLoad = (key: string, url: string) => {
      if (!scene.textures.exists(key)) {
        scene.load.image(key, url);
      }
    };

    // --- 1. Zombie Walker Frames ---
    for (let i = 0; i < 17; i++) {
      safeLoad(`zombie_idle_${i}`, `assets/characters/zombie/idle/idle_${i}.png`);
      safeLoad(`zombie_move_${i}`, `assets/characters/zombie/move/move_${i}.png`);
    }
    for (let i = 0; i < 9; i++) {
      safeLoad(`zombie_attack_${i}`, `assets/characters/zombie/attack/attack_${i}.png`);
    }
    safeLoad('zombie_corpse_0', 'assets/characters/zombie/corpse/corpse_0.png');

    // --- 2. Survivor Soldier Frames ---
    for (let i = 0; i < 20; i++) {
      safeLoad(`survivor_idle_${i}`, `assets/characters/survivor/idle/idle_${i}.png`);
      safeLoad(`survivor_move_${i}`, `assets/characters/survivor/move/move_${i}.png`);
      safeLoad(`survivor_reload_${i}`, `assets/characters/survivor/reload/reload_${i}.png`);
      safeLoad(`survivor_feet_walk_${i}`, `assets/characters/survivor/feet/feet_walk_${i}.png`);
    }
    for (let i = 0; i < 3; i++) {
      safeLoad(`survivor_shoot_${i}`, `assets/characters/survivor/shoot/shoot_${i}.png`);
    }

    // --- 3. Weapons & Turrets (Kenney CC0) ---
    safeLoad('turret_base', 'assets/weapons/turret_base.png');
    safeLoad('turret_gun_dual', 'assets/weapons/turret_gun_dual.png');
    safeLoad('turret_gun_single', 'assets/weapons/turret_gun_single.png');
    safeLoad('bullet_tracer', 'assets/weapons/bullet_tracer.png');

    // --- 4. Environment & Barricades (Kenney CC0) ---
    safeLoad('barricade_barrier', 'assets/environment/barricade_barrier.png');
    safeLoad('sandbags', 'assets/environment/sandbags.png');
    safeLoad('ammo_crate', 'assets/environment/ammo_crate.png');
    safeLoad('road_asphalt', 'assets/environment/road_asphalt.png');
    safeLoad('road_line', 'assets/environment/road_line.png');

    // --- 5. Fortress Architecture Sprites (Phase 02.5 Asset-First) ---
    safeLoad('fortress_main_gate', 'assets/environment/fortress/fortress_main_gate.png');
    safeLoad('fortress_gate_damaged', 'assets/environment/fortress/fortress_gate_damaged.png');
    safeLoad('fortress_wall_left', 'assets/environment/fortress/fortress_wall_left.png');
    safeLoad('fortress_wall_right', 'assets/environment/fortress/fortress_wall_right.png');
    safeLoad('fortress_turret_platform', 'assets/environment/fortress/fortress_turret_platform.png');
    safeLoad('fortress_sandbags', 'assets/environment/fortress/fortress_sandbags.png');
    safeLoad('fortress_barricade', 'assets/environment/fortress/fortress_barricade.png');
    safeLoad('fortress_ammo_storage', 'assets/environment/fortress/fortress_ammo_storage.png');
    safeLoad('fortress_command_center', 'assets/environment/fortress/fortress_command_center.png');
    safeLoad('fortress_spotlight', 'assets/environment/fortress/fortress_spotlight.png');
    safeLoad('fortress_floor', 'assets/environment/fortress/fortress_floor.png');
    safeLoad('fortress_damage_vfx', 'assets/environment/fortress/fortress_damage_vfx.png');

    // --- 6. VFX & Gift Skills ---
    safeLoad('muzzle_flash', 'assets/vfx/muzzle_flash.png');
    safeLoad('hit_explosion', 'assets/vfx/hit_explosion.png');
    safeLoad('gift_missile', 'assets/vfx/gift_missile.png');
    safeLoad('tactical_reticle', 'assets/vfx/tactical_reticle.png');
  }
}
