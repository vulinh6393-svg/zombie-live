import Phaser from 'phaser';
import { BattlefieldScene } from './scenes/BattlefieldScene.js';
import { ContactSheetScene } from './renderer/scenes/ContactSheetScene.js';
import { MockSnapshotSource, MockScenario } from './sources/MockSnapshotSource.js';
import { SocketSnapshotSource } from './sources/SocketSnapshotSource.js';
import { GameSnapshotSource } from './sources/GameSnapshotSource.js';
import { GAME_CONFIG } from './config.js';

// Route check: /overlay vs /contact-sheet vs / (development)
const isOverlay = window.location.pathname.startsWith('/overlay');
const isContactSheet = window.location.pathname.startsWith('/contact-sheet');
const urlParams = new URLSearchParams(window.location.search);
const useSocket = urlParams.get('mode') === 'socket';

let snapshotSource: GameSnapshotSource;
let mockSource: MockSnapshotSource | null = null;

if (useSocket) {
  const serverUrl = import.meta.env.VITE_GAME_SERVER_URL || 'http://localhost:3001';
  snapshotSource = new SocketSnapshotSource(serverUrl);
} else {
  mockSource = new MockSnapshotSource();
  snapshotSource = mockSource;
}

export const phaserGameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  parent: 'game-container',
  backgroundColor: '#060913',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  scene: [BattlefieldScene, ContactSheetScene],
};

let gameInstance: Phaser.Game | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    gameInstance = new Phaser.Game(phaserGameConfig);

    if (isContactSheet) {
      gameInstance.scene.start('ContactSheetScene');
    } else {
      gameInstance.scene.start('BattlefieldScene', {
        snapshotSource,
        isOverlayMode: isOverlay,
      });

      if (!isOverlay && mockSource) {
        createDevControlPanel(mockSource);
      }
    }
  });
}

function createDevControlPanel(mock: MockSnapshotSource): void {
  const panel = document.createElement('div');
  panel.id = 'dev-control-panel';
  panel.style.position = 'fixed';
  panel.style.bottom = '12px';
  panel.style.left = '50%';
  panel.style.transform = 'translateX(-50%)';
  panel.style.backgroundColor = 'rgba(10, 17, 40, 0.95)';
  panel.style.border = '2px solid #00f5d4';
  panel.style.borderRadius = '12px';
  panel.style.padding = '10px 18px';
  panel.style.display = 'flex';
  panel.style.gap = '8px';
  panel.style.alignItems = 'center';
  panel.style.zIndex = '9999';
  panel.style.boxShadow = '0 0 20px rgba(0, 245, 212, 0.3)';

  const label = document.createElement('span');
  label.innerText = '🛠️ DEV CONTROLS:';
  label.style.color = '#00f5d4';
  label.style.fontWeight = 'bold';
  label.style.fontSize = '13px';
  panel.appendChild(label);

  const scenarios: Array<{ id: MockScenario; label: string }> = [
    { id: 'wave1', label: 'Đợt 1 (Walker)' },
    { id: 'wave3', label: 'Đợt 3 (Spitter/Healer)' },
    { id: 'wave4', label: 'Đợt 4 (Brute/Shocker)' },
    { id: 'boss', label: 'TRÙM CUỐI (Boss)' },
    { id: 'victory', label: 'Thắng' },
    { id: 'defeat', label: 'Thua' },
  ];

  for (const s of scenarios) {
    const btn = document.createElement('button');
    btn.innerText = s.label;
    btn.style.backgroundColor = '#1a2639';
    btn.style.color = '#ffffff';
    btn.style.border = '1px solid #00bbf9';
    btn.style.borderRadius = '6px';
    btn.style.padding = '6px 12px';
    btn.style.fontSize = '12px';
    btn.style.cursor = 'pointer';
    btn.style.transition = '0.2s';

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = '#00bbf9';
      btn.style.color = '#000000';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = '#1a2639';
      btn.style.color = '#ffffff';
    });

    btn.addEventListener('click', () => {
      mock.setScenario(s.id);
    });
    panel.appendChild(btn);
  }

  // Contact Sheet Link
  const contactLink = document.createElement('a');
  contactLink.href = '/contact-sheet';
  contactLink.target = '_blank';
  contactLink.innerText = '📋 10 Zombie Sheet';
  contactLink.style.color = '#00f5d4';
  contactLink.style.fontSize = '12px';
  contactLink.style.marginLeft = '8px';
  contactLink.style.textDecoration = 'none';
  contactLink.style.fontWeight = 'bold';
  panel.appendChild(contactLink);

  // OBS Overlay link
  const obsLink = document.createElement('a');
  obsLink.href = '/overlay';
  obsLink.target = '_blank';
  obsLink.innerText = '🔗 OBS /overlay';
  obsLink.style.color = '#fee440';
  obsLink.style.fontSize = '12px';
  obsLink.style.marginLeft = '8px';
  obsLink.style.textDecoration = 'none';
  obsLink.style.fontWeight = 'bold';
  panel.appendChild(obsLink);

  document.body.appendChild(panel);
}
