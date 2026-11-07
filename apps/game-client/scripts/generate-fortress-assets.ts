import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'public/assets/environment/fortress');
const vfxDir = path.join(rootDir, 'public/assets/vfx');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(vfxDir)) fs.mkdirSync(vfxDir, { recursive: true });

async function generateFortressAssets() {
  console.log('=== KHỞI CHẠY BỘ TẠO ASSET THỰC TẾ CHO FORTRESS (ASSET-FIRST PRODUCTION) ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Helper to render on HTML5 canvas and save as PNG
  async function renderAsset(fileName: string, targetPath: string, width: number, height: number, drawFnBody: string) {
    const dataUrl = await page.evaluate(`
      (() => {
        const canvas = document.createElement('canvas');
        canvas.width = ${width};
        canvas.height = ${height};
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, ${width}, ${height});

        ${drawFnBody}

        return canvas.toDataURL('image/png');
      })()
    `);

    const base64Data = (dataUrl as string).replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));
    console.log(` - Đã tạo asset: ${path.basename(targetPath)} (${width}x${height}px, ${fs.statSync(targetPath).size} bytes)`);
  }

  // 1. fortress_main_gate.png (Heavy Blast Gate with Corrugated Steel & Hazard Stripes & Hydraulics)
  await renderAsset('fortress_main_gate.png', path.join(outDir, 'fortress_main_gate.png'), 260, 120, `
    // Soft outer shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;

    // Heavy steel frame
    ctx.fillStyle = '#1e242d';
    ctx.beginPath();
    ctx.roundRect(10, 10, 240, 100, 6);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Outer frame beveled border
    ctx.strokeStyle = '#3a4454';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Rivets along the frame
    ctx.fillStyle = '#64748b';
    for (let x = 20; x <= 240; x += 22) {
      ctx.beginPath(); ctx.arc(x, 16, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, 104, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    for (let y = 26; y <= 94; y += 17) {
      ctx.beginPath(); ctx.arc(16, y, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(244, y, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Door panels: Left & Right blast leaves
    const drawDoorLeaf = (x, w) => {
      const grad = ctx.createLinearGradient(x, 22, x + w, 98);
      grad.addColorStop(0, '#2d3748');
      grad.addColorStop(0.5, '#1a202c');
      grad.addColorStop(1, '#2d3748');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 22, w, 76);

      // Corrugated steel horizontal ribs
      for (let y = 28; y <= 92; y += 8) {
        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.lineTo(x + w - 4, y); ctx.stroke();
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 4, y + 1.5); ctx.lineTo(x + w - 4, y + 1.5); ctx.stroke();
      }
    };
    drawDoorLeaf(24, 102);
    drawDoorLeaf(134, 102);

    // Hazard caution stripes (Yellow / Black) across middle bar
    ctx.save();
    ctx.beginPath();
    ctx.rect(30, 50, 200, 20);
    ctx.clip();
    ctx.fillStyle = '#eab308';
    ctx.fillRect(30, 50, 200, 20);
    ctx.fillStyle = '#0f172a';
    for (let hx = 20; hx <= 250; hx += 16) {
      ctx.beginPath();
      ctx.moveTo(hx, 70);
      ctx.lineTo(hx + 10, 50);
      ctx.lineTo(hx + 16, 50);
      ctx.lineTo(hx + 6, 70);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 50, 200, 20);

    // Center interlocking teeth & Locking Wheel Hub
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(126, 22, 8, 76);

    // Heavy Circular Locking Hub
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.arc(130, 60, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.stroke();
    // Inner hub lock
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(130, 60, 9, 0, Math.PI * 2); ctx.fill();
    // Glowing red security LED
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(130, 60, 4, 0, Math.PI * 2); ctx.fill();

    // Hydraulic Pistons on sides (Left & Right)
    const drawPiston = (px, py, angle) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      // Piston cylinder
      ctx.fillStyle = '#475569';
      ctx.fillRect(-6, -18, 12, 22);
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.5; ctx.strokeRect(-6, -18, 12, 22);
      // Chrome rod
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-3, 4, 6, 16);
      // Mounting bracket
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(0, 20, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    drawPiston(20, 36, -0.2);
    drawPiston(20, 84, 0.2);
    drawPiston(240, 36, 0.2);
    drawPiston(240, 84, -0.2);
  `);

  // 2. fortress_gate_damaged.png (Damaged variant with breach burns, sparks & bent steel)
  await renderAsset('fortress_gate_damaged.png', path.join(outDir, 'fortress_gate_damaged.png'), 260, 120, `
    // Base gate damaged
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#1e242d';
    ctx.beginPath(); ctx.roundRect(10, 10, 240, 100, 6); ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#3a4454'; ctx.lineWidth = 3; ctx.stroke();

    // Broken Door panels
    ctx.fillStyle = '#222934';
    ctx.fillRect(24, 22, 102, 76);
    ctx.fillRect(134, 22, 102, 76);

    // Torn breach in the center
    ctx.fillStyle = '#0a0d12';
    ctx.beginPath();
    ctx.moveTo(115, 22);
    ctx.lineTo(138, 38);
    ctx.lineTo(110, 65);
    ctx.lineTo(148, 85);
    ctx.lineTo(135, 98);
    ctx.lineTo(120, 98);
    ctx.lineTo(105, 55);
    ctx.closePath();
    ctx.fill();

    // Scorch marks and soot (radial burn)
    const burn = ctx.createRadialGradient(125, 60, 5, 125, 60, 65);
    burn.addColorStop(0, 'rgba(10, 10, 10, 0.95)');
    burn.addColorStop(0.5, 'rgba(30, 20, 10, 0.8)');
    burn.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = burn;
    ctx.beginPath(); ctx.arc(125, 60, 65, 0, Math.PI * 2); ctx.fill();

    // Jagged metal fractures
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(110, 40); ctx.lineTo(125, 55); ctx.lineTo(95, 75);
    ctx.stroke();

    // Red Alarm Warning
    ctx.fillStyle = '#dc2626';
    ctx.beginPath(); ctx.arc(130, 60, 6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10;
    ctx.fill();
  `);

  // 3. fortress_wall_left.png (410x90 Heavy Concrete Wall Section with 3D Parapet & Embrasures)
  await renderAsset('fortress_wall_left.png', path.join(outDir, 'fortress_wall_left.png'), 410, 90, `
    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;

    // Main wall foundation slab
    const wallGrad = ctx.createLinearGradient(0, 10, 0, 80);
    wallGrad.addColorStop(0, '#475569');
    wallGrad.addColorStop(0.2, '#334155');
    wallGrad.addColorStop(0.8, '#1e293b');
    wallGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 10, 410, 70);
    ctx.shadowColor = 'transparent';

    // Top beveled cap / parapet walk (highlight)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 10, 410, 14);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 10, 410, 3); // crisp light edge

    // Vertical expansion joints every 70px
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    for (let x = 65; x < 400; x += 75) {
      ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, 80); ctx.stroke();
      // Highlight on right side of groove
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 1.5, 10); ctx.lineTo(x + 1.5, 80); ctx.stroke();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
    }

    // Defensive Embrasures / Firing Slits
    for (let ex = 35; ex < 390; ex += 75) {
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.roundRect(ex, 38, 28, 14, 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Gun barrel mount pivot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(ex + 14, 45, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Bottom armor plating trim
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 74, 410, 6);
  `);

  // 4. fortress_wall_right.png (410x90 Matching Concrete Wall)
  await renderAsset('fortress_wall_right.png', path.join(outDir, 'fortress_wall_right.png'), 410, 90, `
    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;

    const wallGrad = ctx.createLinearGradient(0, 10, 0, 80);
    wallGrad.addColorStop(0, '#475569');
    wallGrad.addColorStop(0.2, '#334155');
    wallGrad.addColorStop(0.8, '#1e293b');
    wallGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 10, 410, 70);
    ctx.shadowColor = 'transparent';

    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 10, 410, 14);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 10, 410, 3);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    for (let x = 65; x < 400; x += 75) {
      ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, 80); ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 1.5, 10); ctx.lineTo(x + 1.5, 80); ctx.stroke();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
    }

    for (let ex = 35; ex < 390; ex += 75) {
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.roundRect(ex, 38, 28, 14, 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(ex + 14, 45, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 74, 410, 6);
  `);

  // 5. fortress_turret_platform.png (130x130 Octagonal Turntable Pad)
  await renderAsset('fortress_turret_platform.png', path.join(outDir, 'fortress_turret_platform.png'), 130, 130, `
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;

    // Octagonal base foundation
    ctx.fillStyle = '#1e242d';
    ctx.beginPath();
    ctx.arc(65, 65, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Rotating steel turret ring
    const ringGrad = ctx.createLinearGradient(15, 15, 115, 115);
    ringGrad.addColorStop(0, '#334155');
    ringGrad.addColorStop(0.5, '#1e293b');
    ringGrad.addColorStop(1, '#475569');
    ctx.fillStyle = ringGrad;
    ctx.beginPath(); ctx.arc(65, 65, 46, 0, Math.PI * 2); ctx.fill();

    // Circumferential rivets
    ctx.fillStyle = '#94a3b8';
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const rx = 65 + Math.cos(a) * 40;
      const ry = 65 + Math.sin(a) * 40;
      ctx.beginPath(); ctx.arc(rx, ry, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Inner mechanical gear teeth
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(65, 65, 30, 0, Math.PI * 2); ctx.stroke();

    // Center mounting socket
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(65, 65, 18, 0, Math.PI * 2); ctx.fill();

    // Cyan energy core indicator
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath(); ctx.arc(65, 65, 7, 0, Math.PI * 2); ctx.fill();
  `);

  // 6. fortress_sandbags.png (120x60 Stacked Burlap Sandbag Emplacement)
  await renderAsset('fortress_sandbags.png', path.join(outDir, 'fortress_sandbags.png'), 120, 60, `
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    const drawBag = (x, y, w, h, col1, col2) => {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, col1);
      grad.addColorStop(1, col2);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40, 30, 20, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Stitched seam line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath(); ctx.moveTo(x + 4, y + h / 2); ctx.lineTo(x + w - 4, y + h / 2); ctx.stroke();
    };

    // Bottom layer (3 bags)
    drawBag(6, 28, 36, 22, '#8d7b68', '#5b4c3e');
    drawBag(42, 28, 36, 22, '#998675', '#635344');
    drawBag(78, 28, 36, 22, '#8d7b68', '#5b4c3e');

    // Top layer (2 bags staggered)
    ctx.shadowColor = 'transparent';
    drawBag(22, 12, 38, 20, '#a89481', '#736151');
    drawBag(60, 12, 38, 20, '#b29d8a', '#7a6756');
  `);

  // 7. fortress_barricade.png (110x55 Steel / Wood Roadblock with Hazard Stripes)
  await renderAsset('fortress_barricade.png', path.join(outDir, 'fortress_barricade.png'), 110, 55, `
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // Crossed leg supports (Steel I-beams)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(15, 48); ctx.lineTo(30, 10); ctx.stroke();
    ctx.moveTo(35, 48); ctx.lineTo(20, 10); ctx.stroke();
    ctx.moveTo(75, 48); ctx.lineTo(90, 10); ctx.stroke();
    ctx.moveTo(95, 48); ctx.lineTo(80, 10); ctx.stroke();
    ctx.shadowColor = 'transparent';

    // Main horizontal crossbeam
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(5, 16, 100, 18);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 16, 100, 18);

    // Hazard orange / white stripes
    ctx.save();
    ctx.beginPath(); ctx.rect(5, 16, 100, 18); ctx.clip();
    ctx.fillStyle = '#ea580c';
    for (let x = -10; x <= 110; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 34); ctx.lineTo(x + 10, 16); ctx.lineTo(x + 16, 16); ctx.lineTo(x + 6, 34);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  `);

  // 8. fortress_ammo_storage.png (130x80 Military Munitions Crates Depot)
  await renderAsset('fortress_ammo_storage.png', path.join(outDir, 'fortress_ammo_storage.png'), 130, 80, `
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    const drawCrate = (x, y, w, h, col1, col2) => {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, col1); grad.addColorStop(1, col2);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#1a2e1d'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
      // Metal corner brackets
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, y, 6, 6);
      ctx.fillRect(x + w - 6, y, 6, 6);
      ctx.fillRect(x, y + h - 6, 6, 6);
      ctx.fillRect(x + w - 6, y + h - 6, 6, 6);
      // Yellow stenciled label line
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x + 8, y + h / 2 - 1.5, w - 16, 3);
    };

    // Staged ammo boxes
    drawCrate(8, 25, 52, 45, '#3d5236', '#253521');
    drawCrate(64, 20, 56, 50, '#364b30', '#1f2e1a');
    // Top stacked crate
    ctx.shadowColor = 'transparent';
    drawCrate(36, 6, 48, 30, '#4a6342', '#2a3d25');
  `);

  // 9. fortress_command_center.png (280x110 Hardened Military Bunker with Radar & Comms)
  await renderAsset('fortress_command_center.png', path.join(outDir, 'fortress_command_center.png'), 280, 110, `
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;

    // Heavy reinforced roof slab
    const roofGrad = ctx.createLinearGradient(10, 10, 270, 100);
    roofGrad.addColorStop(0, '#334155');
    roofGrad.addColorStop(0.5, '#1e293b');
    roofGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = roofGrad;
    ctx.beginPath(); ctx.roundRect(10, 10, 260, 90, 8); ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#00f5d4'; ctx.lineWidth = 2; ctx.stroke();

    // Camo armor plates
    ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
    ctx.fillRect(20, 20, 110, 70);
    ctx.fillRect(150, 20, 110, 70);

    // Communications Radar Dish (Left)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(70, 55, 24, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2.5; ctx.stroke();
    // Radar crosshairs
    ctx.beginPath(); ctx.moveTo(46, 55); ctx.lineTo(94, 55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(70, 31); ctx.lineTo(70, 79); ctx.stroke();
    // Center glowing beacon
    ctx.fillStyle = '#00f5d4';
    ctx.beginPath(); ctx.arc(70, 55, 5, 0, Math.PI * 2); ctx.fill();

    // Armored Command Windows / Slits (Right)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(165, 35, 80, 14);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(165, 60, 80, 14);
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5;
    ctx.strokeRect(165, 35, 80, 14);
    ctx.strokeRect(165, 60, 80, 14);

    // Radio Antenna Mast
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(135, 50); ctx.lineTo(135, 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(130, 24); ctx.lineTo(140, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(127, 30); ctx.lineTo(143, 30); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(135, 17, 3, 0, Math.PI * 2); ctx.fill();
  `);

  // 10. fortress_spotlight.png (64x64 Tactical Searchlight Pod)
  await renderAsset('fortress_spotlight.png', path.join(outDir, 'fortress_spotlight.png'), 64, 64, `
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // Tripod feet
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(32, 32); ctx.lineTo(14, 54); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, 32); ctx.lineTo(50, 54); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, 32); ctx.lineTo(32, 10); ctx.stroke();
    ctx.shadowColor = 'transparent';

    // Lamp Housing
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(32, 32, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.stroke();

    // High intensity projector lens
    const lens = ctx.createRadialGradient(32, 32, 2, 32, 32, 12);
    lens.addColorStop(0, '#ffffff');
    lens.addColorStop(0.5, '#fef08a');
    lens.addColorStop(1, '#ca8a04');
    ctx.fillStyle = lens;
    ctx.beginPath(); ctx.arc(32, 32, 12, 0, Math.PI * 2); ctx.fill();
  `);

  // 11. fortress_floor.png (256x256 Seamless Heavy Concrete Tiles with Expansion Joints)
  await renderAsset('fortress_floor.png', path.join(outDir, 'fortress_floor.png'), 256, 256, `
    ctx.fillStyle = '#141a24';
    ctx.fillRect(0, 0, 256, 256);

    // 4 Slabs
    const drawTile = (x, y, w, h) => {
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, '#1c2432');
      grad.addColorStop(1, '#111721');
      ctx.fillStyle = grad;
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

      // Noise speckles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let i = 0; i < 40; i++) {
        const sx = x + Math.random() * w;
        const sy = y + Math.random() * h;
        ctx.fillRect(sx, sy, 2, 2);
      }
    };
    drawTile(0, 0, 128, 128);
    drawTile(128, 0, 128, 128);
    drawTile(0, 128, 128, 128);
    drawTile(128, 128, 128, 128);

    // Deep expansion joints
    ctx.strokeStyle = '#090d14'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(128, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 128); ctx.lineTo(256, 128); ctx.stroke();

    // Yellow warning border line
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)'; ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(10, 10, 236, 236);
  `);

  // 12. fortress_damage_vfx.png (128x128 Concrete Impact Crater & Fracture Decal)
  await renderAsset('fortress_damage_vfx.png', path.join(outDir, 'fortress_damage_vfx.png'), 128, 128, `
    // Radial scorch burn
    const scorch = ctx.createRadialGradient(64, 64, 4, 64, 64, 55);
    scorch.addColorStop(0, 'rgba(10, 10, 12, 0.95)');
    scorch.addColorStop(0.5, 'rgba(25, 20, 15, 0.7)');
    scorch.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = scorch;
    ctx.beginPath(); ctx.arc(64, 64, 55, 0, Math.PI * 2); ctx.fill();

    // Jagged concrete impact cracks
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 2.5;
    const cracks = [
      [[64, 64], [80, 45], [95, 30], [112, 24]],
      [[64, 64], [48, 75], [35, 95], [20, 108]],
      [[64, 64], [85, 80], [105, 92]],
      [[64, 64], [42, 45], [25, 38]],
    ];
    for (const line of cracks) {
      ctx.beginPath();
      ctx.moveTo(line[0][0], line[0][1]);
      for (let i = 1; i < line.length; i++) {
        ctx.lineTo(line[i][0], line[i][1]);
      }
      ctx.stroke();
    }
  `);

  // 13. gift_missile.png (48x120 High-Tech Cruise Missile with Exhaust Plume)
  await renderAsset('gift_missile.png', path.join(vfxDir, 'gift_missile.png'), 48, 120, `
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Missile Fuselage
    const fuseGrad = ctx.createLinearGradient(16, 20, 32, 20);
    fuseGrad.addColorStop(0, '#f1f5f9');
    fuseGrad.addColorStop(0.5, '#cbd5e1');
    fuseGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = fuseGrad;
    ctx.fillRect(16, 25, 16, 60);

    // Warhead Nose Cone
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(24, 2);
    ctx.lineTo(32, 25);
    ctx.lineTo(16, 25);
    ctx.closePath();
    ctx.fill();

    // 4 Grid Stabilizer Fins
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.moveTo(16, 70); ctx.lineTo(4, 85); ctx.lineTo(16, 82); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(32, 70); ctx.lineTo(44, 85); ctx.lineTo(32, 82); ctx.closePath(); ctx.fill();

    // Thruster Nozzle
    ctx.fillStyle = '#334155';
    ctx.fillRect(19, 85, 10, 8);

    // Rocket Exhaust Flame Plume
    ctx.shadowColor = '#f97316'; ctx.shadowBlur = 14;
    const flame = ctx.createLinearGradient(24, 93, 24, 118);
    flame.addColorStop(0, '#ffffff');
    flame.addColorStop(0.3, '#facc15');
    flame.addColorStop(0.7, '#ea580c');
    flame.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(20, 93);
    ctx.lineTo(24, 118);
    ctx.lineTo(28, 93);
    ctx.closePath();
    ctx.fill();
  `);

  // 14. tactical_reticle.png (160x160 Tactical Targeting Crosshair)
  await renderAsset('tactical_reticle.png', path.join(vfxDir, 'tactical_reticle.png'), 160, 160, `
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;

    // Outer segmented targeting ring
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(80, 80, 68, 0.15, Math.PI * 0.5 - 0.15); ctx.stroke();
    ctx.beginPath(); ctx.arc(80, 80, 68, Math.PI * 0.5 + 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.beginPath(); ctx.arc(80, 80, 68, Math.PI + 0.15, Math.PI * 1.5 - 0.15); ctx.stroke();
    ctx.beginPath(); ctx.arc(80, 80, 68, Math.PI * 1.5 + 0.15, Math.PI * 2 - 0.15); ctx.stroke();

    // 4 Corner Brackets
    const drawBracket = (x, y, dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * 20, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * 20);
      ctx.stroke();
    };
    drawBracket(20, 20, 1, 1);
    drawBracket(140, 20, -1, 1);
    drawBracket(20, 140, 1, -1);
    drawBracket(140, 140, -1, -1);

    // Inner crosshairs
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(80, 35); ctx.lineTo(80, 60); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(80, 100); ctx.lineTo(80, 125); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(35, 80); ctx.lineTo(60, 80); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(100, 80); ctx.lineTo(125, 80); ctx.stroke();

    // Center lock dot
    ctx.fillStyle = '#fee2e2';
    ctx.beginPath(); ctx.arc(80, 80, 4, 0, Math.PI * 2); ctx.fill();
  `);

  await browser.close();
  console.log('=== HOÀN TẤT TẠO 14 TÀI NGUYÊN PNG THẬT CHO FORTRESS & TÊN LỬA ===');
}

generateFortressAssets().catch((err) => {
  console.error('Lỗi khi tạo asset:', err);
  process.exit(1);
});
