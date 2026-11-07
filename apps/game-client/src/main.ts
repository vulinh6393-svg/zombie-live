import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { GAME_CONFIG } from './config.js';

export const phaserGameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  parent: 'game-container',
  backgroundColor: '#080c14',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene],
};

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new Phaser.Game(phaserGameConfig);
  });
}
