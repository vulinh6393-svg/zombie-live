import Phaser from 'phaser';
import { BattlefieldScene } from './scenes/BattlefieldScene.js';
import { ContactSheetScene } from './renderer/scenes/ContactSheetScene.js';
import { QualityLabScene } from './renderer/scenes/QualityLabScene.js';
import { MockSnapshotSource, MockScenario } from './sources/MockSnapshotSource.js';
import { SocketSnapshotSource } from './sources/SocketSnapshotSource.js';
import { GameSnapshotSource } from './sources/GameSnapshotSource.js';
import { GAME_CONFIG } from './config.js';

// Route check: /quality-lab vs /overlay vs /contact-sheet vs / (development)
const isQualityLab = window.location.pathname.startsWith('/quality-lab');
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
  scene: [QualityLabScene, BattlefieldScene, ContactSheetScene],
};

let gameInstance: Phaser.Game | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    gameInstance = new Phaser.Game(phaserGameConfig);

    if (isQualityLab) {
      gameInstance.scene.start('QualityLabScene');
      createQualityLabControlPanel();
    } else if (isContactSheet) {
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

function createQualityLabControlPanel(): void {
  const panel = document.createElement('div');
  panel.id = 'quality-lab-controls';
  panel.style.position = 'fixed';
  panel.style.bottom = '12px';
  panel.style.left = '50%';
  panel.style.transform = 'translateX(-50%)';
  panel.style.backgroundColor = 'rgba(10, 17, 40, 0.95)';
  panel.style.border = '2px solid #00f5d4';
  panel.style.borderRadius = '12px';
  panel.style.padding = '8px 14px';
  panel.style.display = 'flex';
  panel.style.flexWrap = 'wrap';
  panel.style.justifyContent = 'center';
  panel.style.gap = '6px';
  panel.style.alignItems = 'center';
  panel.style.zIndex = '9999';
  panel.style.boxShadow = '0 0 25px rgba(0, 245, 212, 0.4)';
  panel.style.maxWidth = '95vw';

  const title = document.createElement('span');
  title.innerText = '🔬 LAB CONTROLS:';
  title.style.color = '#00f5d4';
  title.style.fontWeight = 'bold';
  title.style.fontSize = '12px';
  panel.appendChild(title);

  const actions: Array<{ label: string; color: string; fn: () => void }> = [
    { label: 'Spawn Walker', color: '#00bbf9', fn: () => (window as any).qualityLab?.spawnWalker() },
    { label: 'Walk', color: '#00bbf9', fn: () => (window as any).qualityLab?.walk() },
    { label: 'Attack', color: '#f72585', fn: () => (window as any).qualityLab?.attack() },
    { label: '💥 Shoot (Combat)', color: '#ff0055', fn: () => (window as any).qualityLab?.shoot() },
    { label: 'Hit', color: '#fee440', fn: () => (window as any).qualityLab?.hit() },
    { label: '☠️ Death', color: '#adb5bd', fn: () => (window as any).qualityLab?.death() },
    { label: '🔄 Reset', color: '#7209b7', fn: () => (window as any).qualityLab?.reset() },
    { label: 'Scale A (32px)', color: '#4cc9f0', fn: () => (window as any).qualityLab?.setScale('A') },
    { label: 'Scale B (40px)', color: '#00f5d4', fn: () => (window as any).qualityLab?.setScale('B') },
    { label: 'Scale C (48px)', color: '#f72585', fn: () => (window as any).qualityLab?.setScale('C') },
  ];

  for (const act of actions) {
    const btn = document.createElement('button');
    btn.innerText = act.label;
    btn.style.backgroundColor = '#162238';
    btn.style.color = '#ffffff';
    btn.style.border = `1px solid ${act.color}`;
    btn.style.borderRadius = '6px';
    btn.style.padding = '5px 10px';
    btn.style.fontSize = '11px';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';

    btn.addEventListener('click', act.fn);
    panel.appendChild(btn);
  }

  document.body.appendChild(panel);
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

    btn.addEventListener('click', () => {
      mock.setScenario(s.id);
    });
    panel.appendChild(btn);
  }

  // Quality Lab Link
  const labLink = document.createElement('a');
  labLink.href = '/quality-lab';
  labLink.innerText = '🔬 Quality Lab';
  labLink.style.color = '#00f5d4';
  labLink.style.fontSize = '12px';
  labLink.style.marginLeft = '8px';
  labLink.style.textDecoration = 'none';
  labLink.style.fontWeight = 'bold';
  panel.appendChild(labLink);

  // Contact Sheet Link
  const contactLink = document.createElement('a');
  contactLink.href = '/contact-sheet';
  contactLink.target = '_blank';
  contactLink.innerText = '📋 Sheet';
  contactLink.style.color = '#fee440';
  contactLink.style.fontSize = '12px';
  contactLink.style.marginLeft = '8px';
  contactLink.style.textDecoration = 'none';
  contactLink.style.fontWeight = 'bold';
  panel.appendChild(contactLink);

  document.body.appendChild(panel);
}
