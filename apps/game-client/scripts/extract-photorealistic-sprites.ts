import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const brainDir = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\8f087681-8572-4911-976b-b3062eed932e';
const scratchDir = 'C:\\Users\\admin\\.gemini\\antigravity\\scratch\\zombie-live';
const bastionDir = path.join(scratchDir, 'apps/game-client/public/assets/environment/bastion');
const conceptDir = path.join(scratchDir, 'apps/game-client/public/assets/concept');
const finalDir = path.join(scratchDir, 'apps/game-client/art-approval-final');

function chromaExtract(
  data: Buffer,
  width: number,
  height: number,
  options: {
    greenThreshold?: number;
    diffThreshold?: number;
    featherRange?: number;
  } = {}
): Buffer {
  const greenThreshold = options.greenThreshold ?? 110;
  const diffThreshold = options.diffThreshold ?? 45;
  const featherRange = options.featherRange ?? 20;

  const out = Buffer.alloc(width * height * 4);

  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const isGreenish = g > greenThreshold && g > r + 20 && g > b + 20;

    if (isGreenish) {
      const diff = Math.min(g - r, g - b);
      if (diff >= diffThreshold) {
        // Hoàn toàn trong suốt
        out[j] = 0;
        out[j + 1] = 0;
        out[j + 2] = 0;
        out[j + 3] = 0;
      } else if (diff > diffThreshold - featherRange) {
        // Vùng mép khử răng cưa (feathering)
        const t = (diffThreshold - diff) / featherRange;
        const alpha = Math.round(t * 255);
        // De-spill green
        g = Math.min(g, Math.max(r, b));
        out[j] = r;
        out[j + 1] = g;
        out[j + 2] = b;
        out[j + 3] = alpha;
      } else {
        // Thân vật thể có chút ánh xanh -> de-spill
        g = Math.min(g, Math.max(r, b) + 5);
        out[j] = r;
        out[j + 1] = g;
        out[j + 2] = b;
        out[j + 3] = 255;
      }
    } else {
      // 100% thân vật thể (thép, bê tông, sơn vàng hazard, đinh tán)
      // Khử nhẹ green spill nếu có phản xạ môi trường
      if (g > Math.max(r, b) + 10) {
        g = Math.max(r, b);
      }
      out[j] = r;
      out[j + 1] = g;
      out[j + 2] = b;
      out[j + 3] = 255;
    }
  }

  return out;
}

async function main() {
  console.log('=== TRÍCH XUẤT SPRITE TẢ THỰC CHẤT LƯỢNG CAO TỪ SOURCE ẢNH AI CHUẨN MASTER ===');

  const wallJpg = path.join(brainDir, 'modular_bastion_wall_horizontal_1794185844935.jpg');
  const gateJpg = path.join(brainDir, 'blast_gate_assembly_1794185825019.jpg');
  const masterPng = path.join(conceptDir, 'bastion_master_environment.png');

  // 1. TRÍCH XUẤT TƯỜNG BÊ TÔNG MODULAR (bastion_wall_segment.png)
  console.log('1. Xử lý Wall Segment...');
  const wallImg = sharp(wallJpg);
  const wallMeta = await wallImg.metadata();
  const { data: wallRaw } = await wallImg.raw().toBuffer({ resolveWithObject: true });

  const wallRgba = chromaExtract(wallRaw, wallMeta.width!, wallMeta.height!);
  const wallPng = await sharp(wallRgba, {
    raw: { width: wallMeta.width!, height: wallMeta.height!, channels: 4 }
  }).png().toBuffer();

  // Trim transparent edges
  const wallTrimmed = await sharp(wallPng).trim().toBuffer();
  // Resize to game logical size: 420 x 130
  const wallFinal = await sharp(wallTrimmed)
    .resize(420, 130, { fit: 'fill' })
    .png()
    .toBuffer();

  saveAsset('bastion_wall_segment.png', wallFinal);

  // 2. TRÍCH XUẤT BLAST GATE (bastion_gate_frame.png, door_left, door_right)
  console.log('2. Xử lý Blast Gate Assembly & Doors...');
  const gateImg = sharp(gateJpg);
  const gateMeta = await gateImg.metadata();
  const { data: gateRaw } = await gateImg.raw().toBuffer({ resolveWithObject: true });

  const gateRgba = chromaExtract(gateRaw, gateMeta.width!, gateMeta.height!);
  const gatePng = await sharp(gateRgba, {
    raw: { width: gateMeta.width!, height: gateMeta.height!, channels: 4 }
  }).png().toBuffer();

  const gateTrimmed = await sharp(gatePng).trim().toBuffer();
  const gateTrimMeta = await sharp(gateTrimmed).metadata();
  const gW = gateTrimMeta.width!;
  const gH = gateTrimMeta.height!;

  // Frame: Archway frame without doors (resize to 300 x 160)
  // Extract left door (x: 25%..48%, y: 25%..85%)
  const doorLBuffer = await sharp(gateTrimmed)
    .extract({
      left: Math.round(gW * 0.26),
      top: Math.round(gH * 0.28),
      width: Math.round(gW * 0.23),
      height: Math.round(gH * 0.58)
    })
    .resize(115, 120, { fit: 'fill' })
    .png()
    .toBuffer();
  saveAsset('bastion_gate_door_left.png', doorLBuffer);

  // Extract right door (x: 51%..74%, y: 25%..85%)
  const doorRBuffer = await sharp(gateTrimmed)
    .extract({
      left: Math.round(gW * 0.51),
      top: Math.round(gH * 0.28),
      width: Math.round(gW * 0.23),
      height: Math.round(gH * 0.58)
    })
    .resize(115, 120, { fit: 'fill' })
    .png()
    .toBuffer();
  saveAsset('bastion_gate_door_right.png', doorRBuffer);

  // Frame: Outer archway
  const frameBuffer = await sharp(gateTrimmed)
    .resize(300, 160, { fit: 'fill' })
    .png()
    .toBuffer();
  saveAsset('bastion_gate_frame.png', frameBuffer);

  // 3. TRÍCH XUẤT TURRET PLATFORM TỪ MASTER BASTION CONCEPT THẬT
  console.log('3. Xử lý Turret Platform...');
  // Extract turret pad from center of master environment (475, 520, 130, 130)
  // Circular/hexagonal mask with soft feathering
  const turretPadCrop = await sharp(masterPng)
    .extract({ left: 475, top: 520, width: 130, height: 130 })
    .png()
    .toBuffer();

  // Create smooth hexagonal / circular alpha mask
  const maskSvg = Buffer.from(`
    <svg width="130" height="130">
      <polygon points="65,4 124,35 124,95 65,126 6,95 6,35" fill="white" />
    </svg>
  `);
  const maskBuffer = await sharp(maskSvg).png().toBuffer();

  const turretPadFinal = await sharp(turretPadCrop)
    .composite([{ input: maskBuffer, blend: 'dest-in' }])
    .png()
    .toBuffer();
  saveAsset('bastion_turret_platform.png', turretPadFinal);

  // 4. DECAL TƯỜNG HƯ HẠI (wall_damage_overlay.png)
  console.log('4. Xử lý Wall Damage Overlay...');
  const crackSvg = Buffer.from(`
    <svg width="200" height="120" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000000" flood-opacity="0.9"/>
        </filter>
      </defs>
      <!-- Deep structural fracture lines -->
      <path d="M40,15 L70,45 L60,65 L95,85 L120,70 L145,105 L175,95" stroke="#05080c" stroke-width="4.5" fill="none" filter="url(#glow)"/>
      <path d="M70,45 L105,35 L135,50" stroke="#080c10" stroke-width="3" fill="none"/>
      <path d="M95,85 L85,110 L65,118" stroke="#0a0e14" stroke-width="3.5" fill="none"/>
      <path d="M120,70 L140,55 L165,60" stroke="#05080c" stroke-width="2.5" fill="none"/>
      
      <!-- Surface impact craters with charred edges -->
      <circle cx="95" cy="85" r="9" fill="#151a20" opacity="0.9"/>
      <circle cx="95" cy="85" r="5" fill="#030406"/>
      <circle cx="70" cy="45" r="7" fill="#151a20" opacity="0.85"/>
      <circle cx="70" cy="45" r="3.5" fill="#030406"/>
      <circle cx="145" cy="105" r="8" fill="#151a20" opacity="0.85"/>
      
      <!-- Exposed rebar wire with rust tint -->
      <line x1="68" y1="42" x2="74" y2="48" stroke="#7c2d12" stroke-width="2"/>
      <line x1="92" y1="83" x2="98" y2="87" stroke="#b45309" stroke-width="1.5"/>
      <line x1="118" y1="68" x2="124" y2="72" stroke="#7c2d12" stroke-width="2"/>
    </svg>
  `);
  const damageFinal = await sharp(crackSvg).png().toBuffer();
  saveAsset('wall_damage_overlay.png', damageFinal);

  console.log('=== HOÀN TẤT TRÍCH XUẤT 5 SPRITE TẢ THỰC ĐỒNG BỘ 100% VỚI MASTER ===');
}

function saveAsset(filename: string, buf: Buffer) {
  fs.writeFileSync(path.join(bastionDir, filename), buf);
  fs.writeFileSync(path.join(conceptDir, filename), buf);
  fs.writeFileSync(path.join(finalDir, filename), buf);
  fs.writeFileSync(path.join(brainDir, filename), buf);
  console.log(` ✔ [SAVED] ${filename.padEnd(30)} (${(buf.length / 1024).toFixed(1)} KB)`);
}

main().catch(err => {
  console.error('Lỗi trích xuất:', err);
  process.exit(1);
});
