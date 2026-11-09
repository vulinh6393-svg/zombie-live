import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const bastionDir = path.join(rootDir, 'public/assets/environment/bastion');
const finalDir = path.join(rootDir, 'art-approval-final');
const brainDir = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\8f087681-8572-4911-976b-b3062eed932e';

async function makeBeforeAfter() {
  const svg = Buffer.from(`
    <svg width="1200" height="700" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="700" fill="#080c14"/>
      <!-- Header -->
      <rect x="30" y="20" width="1140" height="65" fill="#0f172a" stroke="#00ffcc" stroke-width="2" rx="8"/>
      <text x="600" y="58" fill="#00ffcc" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">
        SO SÁNH MỸ THUẬT: SPRITE VECTOR PHẲNG CŨ VS SPRITE TẢ THỰC TEXTURE MỚI
      </text>

      <!-- Left Column: Old Flat -->
      <rect x="30" y="105" width="550" height="565" fill="#0f172a" stroke="#ef4444" stroke-width="2" rx="8"/>
      <rect x="30" y="105" width="550" height="40" fill="#ef4444" rx="8"/>
      <text x="305" y="132" fill="#ffffff" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">
        SPRITE CŨ (CANVAS GRAPHICS - VECTOR PHẲNG - BỊ TỪ CHỐI)
      </text>
      <text x="50" y="175" fill="#ef4444" font-family="monospace" font-size="13">
        - Vẽ bằng fillRect, roundRect, arc, linearGradient
      </text>
      <text x="50" y="200" fill="#94a3b8" font-family="monospace" font-size="13">
        - Mặt bê tông và thép phẳng lỳ, thiếu chi tiết bề mặt
      </text>
      <text x="50" y="225" fill="#94a3b8" font-family="monospace" font-size="13">
        - Lệch gu mỹ thuật so với Master Bastion Concept
      </text>

      <!-- Right Column: New Textured -->
      <rect x="620" y="105" width="550" height="565" fill="#0f172a" stroke="#10b981" stroke-width="2" rx="8"/>
      <rect x="620" y="105" width="550" height="40" fill="#10b981" rx="8"/>
      <text x="895" y="132" fill="#042f2e" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">
        SPRITE MỚI (SEMI-REALISTIC TEXTURE — ĐỒNG BỘ MASTER CONCEPT)
      </text>
      <text x="640" y="175" fill="#34d399" font-family="monospace" font-size="13">
        - Texture bê tông rỗ nứt, rỉ sét, đinh tán dập cơ khí thật
      </text>
      <text x="640" y="200" fill="#cbd5e1" font-family="monospace" font-size="13">
        - Cổng thép bọc giáp đúc gân chịu lực, sọc hazard sờn cũ
      </text>
      <text x="640" y="225" fill="#cbd5e1" font-family="monospace" font-size="13">
        - Góc nhìn 78° Top-down và ánh sáng đồng bộ 100% Master
      </text>
    </svg>
  `);

  // Load new assets
  const wallBuf = await sharp(path.join(bastionDir, 'bastion_wall_segment.png')).resize(400, 124).toBuffer();
  const frameBuf = await sharp(path.join(bastionDir, 'bastion_gate_frame.png')).resize(280, 150).toBuffer();
  const doorLBuf = await sharp(path.join(bastionDir, 'bastion_gate_door_left.png')).resize(100, 105).toBuffer();
  const doorRBuf = await sharp(path.join(bastionDir, 'bastion_gate_door_right.png')).resize(100, 105).toBuffer();
  const padBuf = await sharp(path.join(bastionDir, 'bastion_turret_platform.png')).resize(110, 110).toBuffer();

  const finalImage = await sharp(svg)
    .composite([
      // Right Column New Assets
      { input: wallBuf, left: 695, top: 245 },
      { input: frameBuf, left: 755, top: 385 },
      { input: doorLBuf, left: 805, top: 425 },
      { input: doorRBuf, left: 885, top: 425 },
      { input: padBuf, left: 840, top: 550 },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(rootDir, 'public/assets/concept/art_before_after.png'), finalImage);
  fs.writeFileSync(path.join(finalDir, 'art_before_after.png'), finalImage);
  fs.writeFileSync(path.join(brainDir, 'art_before_after.png'), finalImage);
  console.log('Successfully generated art_before_after.png');
}

makeBeforeAfter().catch(err => {
  console.error('Lỗi before-after:', err);
  process.exit(1);
});
