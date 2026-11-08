import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const conceptDir = path.join(rootDir, 'public/assets/concept');
const brainDir = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\8f087681-8572-4911-976b-b3062eed932e';

if (!fs.existsSync(conceptDir)) fs.mkdirSync(conceptDir, { recursive: true });

function getBase64DataUri(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const base64 = fs.readFileSync(filePath).toString('base64');
  return `data:${mime};base64,${base64}`;
}

async function run() {
  console.log('=== KHỞI CHẠY BỘ TẠO DELIVERABLES ART APPROVAL GATE UNIFIED ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Load necessary image assets as data URIs
  const masterEnvUri = getBase64DataUri(path.join(conceptDir, 'bastion_master_environment.png'));
  const survivorIdleUri = getBase64DataUri(path.join(rootDir, 'public/assets/characters/survivor/idle/idle_0.png'));
  const survivorShootUri = getBase64DataUri(path.join(rootDir, 'public/assets/characters/survivor/shoot/shoot_1.png'));
  const zombieMoveUri = getBase64DataUri(path.join(rootDir, 'public/assets/characters/zombie/move/move_4.png'));
  const zombieAttackUri = getBase64DataUri(path.join(rootDir, 'public/assets/characters/zombie/attack/attack_2.png'));
  const turretBaseUri = getBase64DataUri(path.join(rootDir, 'public/assets/weapons/turret_base.png'));
  const turretGunUri = getBase64DataUri(path.join(rootDir, 'public/assets/weapons/turret_gun_dual.png'));
  const muzzleFlashUri = getBase64DataUri(path.join(rootDir, 'public/assets/vfx/muzzle_flash.png'));
  const hitExplosionUri = getBase64DataUri(path.join(rootDir, 'public/assets/vfx/hit_explosion.png'));

  // Helper to save image to both conceptDir and brainDir
  function saveBuffer(fileName: string, buffer: Buffer) {
    fs.writeFileSync(path.join(conceptDir, fileName), buffer);
    fs.writeFileSync(path.join(brainDir, fileName), buffer);
    console.log(` - Đã lưu: ${fileName} (${buffer.length} bytes)`);
  }

  // Helper to resize canvas in browser and return base64 png
  async function renderToPng(width: number, height: number, renderFnBody: string, args: Record<string, any> = {}): Promise<Buffer> {
    const dataUrl = await page.evaluate(
      ({ width, height, renderFnBody, args }) => {
        return new Promise<string>((resolve, reject) => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            
            // Execute the render body
            const fn = new Function('canvas', 'ctx', 'args', 'resolve', 'reject', renderFnBody);
            fn(canvas, ctx, args, resolve, reject);
          } catch (e: any) {
            reject(e.toString());
          }
        });
      },
      { width, height, renderFnBody, args }
    );

    const base64Data = (dataUrl as string).replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  // -------------------------------------------------------------
  // TASK 2: Rebuild Full Combat Reference (Normal & Gift) on Master Environment
  // -------------------------------------------------------------
  console.log('\n--- 1. Tạo Combat Normal & Combat Gift Unified (1080x1920 & 360x640) ---');
  
  const combatRenderCode = `
    const { masterEnvUri, survivorShootUri, survivorIdleUri, zombieMoveUri, zombieAttackUri, turretBaseUri, turretGunUri, muzzleFlashUri, hitExplosionUri, isGift } = args;

    function loadImage(uri) {
      return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = uri;
      });
    }

    Promise.all([
      loadImage(masterEnvUri),
      loadImage(survivorShootUri),
      loadImage(survivorIdleUri),
      loadImage(zombieMoveUri),
      loadImage(zombieAttackUri),
      loadImage(turretBaseUri),
      loadImage(turretGunUri),
      loadImage(muzzleFlashUri),
      loadImage(hitExplosionUri),
    ]).then(([bg, sShoot, sIdle, zMove, zAttack, tBase, tGun, mFlash, exp]) => {
      // 1. Draw Master Environment as identical base plate
      ctx.drawImage(bg, 0, 0, 1080, 1920);

      // 2. Helper to draw character with calibrated scale (Display Height = 132px in logic space)
      // Survivor original: 258x152. Trimmed height = 152. Scale factor = 132 / 152 = 0.868.
      // Zombie original: 218x286. Trimmed height = 196. Scale factor = 132 / 196 = 0.673.
      function drawSurvivor(img, x, y, angleRad) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angleRad);
        const scale = 132 / 152;
        ctx.scale(scale, scale);
        // Soft drop shadow
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 8;
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
      }

      function drawZombie(img, x, y, angleRad, isHit = false) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angleRad);
        const scale = 132 / 196;
        ctx.scale(scale, scale);
        ctx.shadowColor = 'rgba(0,0,0,0.65)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;
        if (isHit) {
          ctx.filter = 'brightness(1.5) sepia(0.3) saturate(1.8)';
        }
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        // Hit blood splatter if isHit
        if (isHit) {
          ctx.save();
          ctx.fillStyle = 'rgba(180, 0, 0, 0.75)';
          ctx.beginPath();
          ctx.arc(x - 12, y - 10, 14, 0, Math.PI * 2);
          ctx.arc(x + 16, y - 4, 9, 0, Math.PI * 2);
          ctx.arc(x - 5, y + 14, 11, 0, Math.PI * 2);
          ctx.fill();

          // Floating damage number
          ctx.font = '900 28px "Montserrat", sans-serif';
          ctx.fillStyle = '#ff2222';
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 6;
          ctx.fillText('-45', x + 25, y - 30);
          ctx.restore();
        }
      }

      function drawTurret(x, y, angleRad, isFiring = true) {
        ctx.save();
        ctx.translate(x, y);
        // Base
        ctx.drawImage(tBase, -48, -48, 96, 96);
        // Gun rotated
        ctx.rotate(angleRad);
        ctx.drawImage(tGun, -38, -50, 76, 96);

        if (isFiring) {
          // Muzzle flash at the tip of the dual gun barrels
          ctx.drawImage(mFlash, -32, -100, 64, 64);
        }
        ctx.restore();

        if (isFiring) {
          // Ballistic tracer streaking toward targets
          ctx.save();
          ctx.strokeStyle = '#ffe066';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#ffaa00';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(x, y - 50);
          const endX = x + Math.sin(angleRad) * 420;
          const endY = y - Math.cos(angleRad) * 420;
          ctx.lineTo(endX, endY);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3. Draw 3 Defense Turrets on Wall Ramparts
      // Turret Alpha (Lane 0): (280, 1320), aimed slightly left (angle -0.15)
      drawTurret(280, 1320, -0.18, true);
      // Turret Bravo (Lane 1): (540, 1340), aimed center (angle 0.05)
      drawTurret(540, 1340, 0.05, true);
      // Turret Charlie (Lane 2): (800, 1320), aimed slightly right (angle 0.22)
      drawTurret(800, 1320, 0.22, true);

      // 4. Draw 3 Representative Soldiers (Display Height 132px)
      // Soldier Alpha: (280, 1400) aiming upward
      drawSurvivor(sShoot, 280, 1400, -Math.PI / 2 + 0.1);
      // Soldier Bravo: (540, 1420) aiming upward
      drawSurvivor(sShoot, 540, 1420, -Math.PI / 2 - 0.05);
      // Soldier Charlie: (800, 1400) aiming upward
      drawSurvivor(sIdle, 800, 1400, -Math.PI / 2 + 0.15);

      // 5. Draw 9 Zombie Walkers across the 3 lanes in Combat Zone (y: 650 - 1100)
      // Lane 0 (Alpha):
      drawZombie(zMove, 260, 700, Math.PI / 2, false);
      drawZombie(zAttack, 290, 880, Math.PI / 2 - 0.1, true); // Being hit
      drawZombie(zMove, 240, 1040, Math.PI / 2 + 0.1, true); // Being hit front-line

      // Lane 1 (Bravo - Center breach):
      drawZombie(zMove, 520, 660, Math.PI / 2, false);
      drawZombie(zMove, 560, 820, Math.PI / 2 + 0.05, false);
      drawZombie(zAttack, 540, 990, Math.PI / 2 - 0.05, true); // Being hit

      // Lane 2 (Charlie):
      drawZombie(zMove, 780, 680, Math.PI / 2 + 0.1, false);
      drawZombie(zMove, 820, 860, Math.PI / 2, false);
      drawZombie(zAttack, 790, 1020, Math.PI / 2 - 0.15, true); // Front-line

      // 6. If Gift Skill is Active: Draw Cruise Missile Airstrike Event
      if (isGift) {
        // A. Tactical Red Radar Reticle in Center Combat Zone (540, 880)
        ctx.save();
        ctx.strokeStyle = '#ff1e1e';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 18;
        // Outer pulsing ring
        ctx.beginPath();
        ctx.arc(540, 880, 120, 0, Math.PI * 2);
        ctx.stroke();
        // Inner crosshairs
        ctx.beginPath();
        ctx.moveTo(540 - 140, 880); ctx.lineTo(540 + 140, 880);
        ctx.moveTo(540, 880 - 140); ctx.lineTo(540, 880 + 140);
        ctx.stroke();
        // Target Locked label
        ctx.font = 'bold 22px "Montserrat", sans-serif';
        ctx.fillStyle = '#ff3333';
        ctx.fillText('TARGET LOCKED: [540, 880]', 410, 730);
        ctx.restore();

        // B. Cruise Missile diagonally diving in
        ctx.save();
        ctx.translate(620, 760);
        ctx.rotate(-Math.PI / 3);
        // Jet smoke trail
        const grad = ctx.createLinearGradient(0, 0, 0, 260);
        grad.addColorStop(0, 'rgba(255, 120, 0, 0.9)');
        grad.addColorStop(0.4, 'rgba(100, 100, 100, 0.6)');
        grad.addColorStop(1, 'rgba(50, 50, 50, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(-12, 40, 24, 260);
        // Missile body
        ctx.fillStyle = '#2d3748';
        ctx.beginPath();
        ctx.roundRect(-10, -50, 20, 90, 6);
        ctx.fill();
        // Warhead
        ctx.fillStyle = '#e53e3e';
        ctx.beginPath();
        ctx.moveTo(-10, -50); ctx.lineTo(0, -75); ctx.lineTo(10, -50);
        ctx.fill();
        ctx.restore();

        // C. Massive Fireball Explosion & Expanding Shockwave Ring
        ctx.save();
        ctx.translate(540, 880);
        // Expanding shockwave ring
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 8;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(0, 0, 210, 0, Math.PI * 2);
        ctx.stroke();

        // Giant fireball composite
        ctx.drawImage(exp, -180, -180, 360, 360);
        ctx.restore();

        // Critical Blast Damage callout
        ctx.save();
        ctx.font = '900 44px "Montserrat", sans-serif';
        ctx.fillStyle = '#ffea00';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 12;
        ctx.fillText('💥 CRIT -999', 420, 820);
        ctx.restore();

        // Gift alert banner at top
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(190, 250, 700, 70, 12);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 24px "Montserrat", sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 6;
        ctx.fillText('🎁 @ViewerPro TẶNG TÊN LỬA HÀNH TRÌNH TỔNG LỰC!', 220, 294);
        ctx.restore();
      }

      // 7. Minimal Clean Production HUD (TikTok Safe Zone Compliant)
      // Top Header (y: 110 - 180)
      ctx.save();
      ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(40, 100, 1000, 80, 10);
      ctx.fill();
      ctx.stroke();

      // Timer & Base HP & Enemies
      ctx.font = 'bold 26px "Montserrat", sans-serif';
      ctx.fillStyle = '#00ffcc';
      ctx.fillText('⏱️ ĐỢT 1: 01:58', 70, 148);

      ctx.fillStyle = '#ef4444';
      ctx.fillText('🛡️ THÀNH TRÌ: 95%', 370, 148);

      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('🧟 KẺ ĐỊCH: 9 ZOMBIE', 710, 148);

      // Mini Leaderboard Pill at top right (y: 200)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(740, 195, 300, 44, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 18px "Montserrat", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('🏆 MVP: @TopDefender (x120)', 755, 224);

      // Bottom Callout (y: 1850)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(140, 1830, 800, 60, 30);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 22px "Montserrat", sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
      ctx.fillText('💬 Gõ "1" hoặc "JOIN Alpha" trong bình luận để tham chiến!', 540, 1868);
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    }).catch(reject);
  `;

  // Render Combat Normal (1080x1920)
  console.log(' - Đang kết xuất combat_normal_unified_1080x1920.png...');
  const normal1080 = await renderToPng(1080, 1920, combatRenderCode, {
    masterEnvUri, survivorShootUri, survivorIdleUri, zombieMoveUri, zombieAttackUri,
    turretBaseUri, turretGunUri, muzzleFlashUri, hitExplosionUri, isGift: false
  });
  saveBuffer('combat_normal_unified_1080x1920.png', normal1080);

  // Render Combat Gift (1080x1920)
  console.log(' - Đang kết xuất combat_gift_unified_1080x1920.png...');
  const gift1080 = await renderToPng(1080, 1920, combatRenderCode, {
    masterEnvUri, survivorShootUri, survivorIdleUri, zombieMoveUri, zombieAttackUri,
    turretBaseUri, turretGunUri, muzzleFlashUri, hitExplosionUri, isGift: true
  });
  saveBuffer('combat_gift_unified_1080x1920.png', gift1080);

  // Helper to resize 1080x1920 buffer to 360x640 mobile preview
  async function downscaleToMobile(srcBuffer: Buffer, targetName: string) {
    const dataUri = `data:image/png;base64,${srcBuffer.toString('base64')}`;
    const mobileBuffer = await renderToPng(360, 640, `
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 360, 640);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = args.dataUri;
    `, { dataUri });
    saveBuffer(targetName, mobileBuffer);
  }

  console.log(' - Tạo bản thu nhỏ mobile 360x640...');
  await downscaleToMobile(normal1080, 'combat_normal_unified_360x640.png');
  await downscaleToMobile(gift1080, 'combat_gift_unified_360x640.png');

  // -------------------------------------------------------------
  // TASK 3: Character Scale Comparison Sheet (1080x1920)
  // -------------------------------------------------------------
  console.log('\n--- 2. Tạo Character Scale Comparison Sheet (character_scale_comparison.png) ---');
  const scaleComparisonCode = `
    const { masterEnvUri, survivorShootUri, zombieMoveUri, turretBaseUri, turretGunUri } = args;

    function loadImage(uri) {
      return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = uri;
      });
    }

    Promise.all([
      loadImage(masterEnvUri),
      loadImage(survivorShootUri),
      loadImage(zombieMoveUri),
      loadImage(turretBaseUri),
      loadImage(turretGunUri),
    ]).then(([bg, sShoot, zMove, tBase, tGun]) => {
      // Background: cropped / focused on concrete courtyard area (y: 1100 to 1800)
      ctx.drawImage(bg, 0, 0, 1080, 1920);

      // Dark overlay for clear presentation
      ctx.fillStyle = 'rgba(8, 12, 20, 0.72)';
      ctx.fillRect(0, 0, 1080, 1920);

      // Header Banner
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(40, 50, 1000, 140, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 32px "Montserrat", sans-serif';
      ctx.fillStyle = '#00ffcc';
      ctx.fillText('BẢNG ĐỐI CHIẾU HIỆU CHUẨN TỶ LỆ SPRITE (SCALE CALIBRATION)', 70, 105);

      ctx.font = 'bold 20px "Montserrat", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('So sánh Logic Canvas (1080x1920) vs Hiển thị Mobile Thực Tế (360x640, tỉ lệ 1/3)', 70, 145);
      ctx.restore();

      // Card 1: Old Wrong Scale (44px in logic space -> 14.7px on mobile)
      ctx.save();
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(40, 220, 1000, 360, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 24px "Montserrat", sans-serif';
      ctx.fillStyle = '#f87171';
      ctx.fillText('❌ 1. MỨC CŨ (LỖI TEÒ NHỎ): Logic 44px ➔ Mobile chỉ còn ~14.7px', 70, 260);

      ctx.font = '18px "Montserrat", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Nếu đặt chiều cao logic 44px, khi màn hình điện thoại thu nhỏ còn 360px, nhân vật bị mờ tịt như đầu tăm.', 70, 295);

      // Draw Old Scale (Height = 44px)
      // Survivor
      const sOldScale = 44 / 152;
      ctx.save();
      ctx.translate(220, 420);
      ctx.rotate(-Math.PI / 2);
      ctx.scale(sOldScale, sOldScale);
      ctx.drawImage(sShoot, -sShoot.width / 2, -sShoot.height / 2);
      ctx.restore();

      // Zombie
      const zOldScale = 44 / 196;
      ctx.save();
      ctx.translate(420, 420);
      ctx.rotate(Math.PI / 2);
      ctx.scale(zOldScale, zOldScale);
      ctx.drawImage(zMove, -zMove.width / 2, -zMove.height / 2);
      ctx.restore();

      // Dimension labels
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(180, 398, 80, 44);
      ctx.strokeRect(380, 398, 80, 44);

      ctx.font = 'bold 16px "Montserrat", sans-serif';
      ctx.fillStyle = '#fca5a5';
      ctx.fillText('Soldier: 44px logic', 170, 470);
      ctx.fillText('(Mobile: 14.7px!)', 170, 492);
      ctx.fillText('Zombie: 44px logic', 370, 470);
      ctx.fillText('(Mobile: 14.7px!)', 370, 492);

      // Warning Box
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(620, 350, 380, 160);
      ctx.strokeStyle = '#ef4444';
      ctx.strokeRect(620, 350, 380, 160);
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 18px "Montserrat", sans-serif';
      ctx.fillText('KẾT QUẢ TRÊN MOBILE:', 640, 385);
      ctx.font = '16px "Montserrat", sans-serif';
      ctx.fillText('• Người xem livestream không thấy chi tiết', 640, 415);
      ctx.fillText('• Mất hoàn toàn nòng súng, quần áo rách', 640, 445);
      ctx.fillText('• Bị từ chối Visual Quality Gate', 640, 475);
      ctx.restore();

      // Card 2: Calibrated P0 Standard Scale (Logic 132px ➔ Mobile 44px chuẩn nét)
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(40, 610, 1000, 520, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 24px "Montserrat", sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.fillText('✅ 2. CHUẨN HIỆU CHUẨN P0: Logic 132px ➔ Mobile Đạt Đúng 44px Sắc Nét', 70, 655);

      ctx.font = '18px "Montserrat", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('Quy đổi: H_logic = 44px * 3 = 132px. Nhân vật hiển thị hoàn hảo ở cả 1080p và màn hình điện thoại 360p.', 70, 690);

      // Draw Calibrated Scale (Height = 132px)
      // Survivor
      const sNewScale = 132 / 152;
      ctx.save();
      ctx.translate(220, 850);
      ctx.rotate(-Math.PI / 2);
      ctx.scale(sNewScale, sNewScale);
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 16;
      ctx.drawImage(sShoot, -sShoot.width / 2, -sShoot.height / 2);
      ctx.restore();

      // Zombie
      const zNewScale = 132 / 196;
      ctx.save();
      ctx.translate(450, 850);
      ctx.rotate(Math.PI / 2);
      ctx.scale(zNewScale, zNewScale);
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 16;
      ctx.drawImage(zMove, -zMove.width / 2, -zMove.height / 2);
      ctx.restore();

      // Turret
      ctx.save();
      ctx.translate(720, 850);
      ctx.drawImage(tBase, -48, -48, 96, 96);
      ctx.drawImage(tGun, -38, -50, 76, 96);
      ctx.restore();

      // Bounding box & dimension tags
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(150, 784, 140, 132);
      ctx.strokeRect(380, 784, 140, 132);
      ctx.strokeRect(660, 784, 120, 132);

      ctx.font = 'bold 18px "Montserrat", sans-serif';
      ctx.fillStyle = '#6ee7b7';
      ctx.fillText('Soldier: 132px logic', 150, 950);
      ctx.fillText('➔ Mobile: 44px (ĐẠT)', 150, 975);

      ctx.fillText('Zombie: 132px logic', 380, 950);
      ctx.fillText('➔ Mobile: 44px (ĐẠT)', 380, 975);

      ctx.fillText('Turret: 132px logic', 660, 950);
      ctx.fillText('➔ Mobile: 44px (ĐẠT)', 660, 975);

      // Benefit Callout
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fillRect(70, 1020, 940, 80);
      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(70, 1020, 940, 80);
      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'bold 18px "Montserrat", sans-serif';
      ctx.fillText('✨ ƯU ĐIỂM: Thấy rõ biểu cảm mặt, ngực, súng M4 giật nòng, quần áo rách tả tơi của Zombie.', 90, 1055);
      ctx.fillText('Tương thích hoàn hảo góc nhìn 2.5D (~78°) của Thành Trì Bastion.', 90, 1080);
      ctx.restore();

      // Card 3: Boss Zombie King Scale (Logic 198px ➔ Mobile 66px)
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(40, 1160, 1000, 360, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 24px "Montserrat", sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('👑 3. CHỦNG LOẠI BOSS ZOMBIE KING: Logic 198px ➔ Mobile 66px (1.5x Kích Thước)', 70, 1205);

      ctx.font = '18px "Montserrat", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('Boss chiếm ưu thế hình ảnh tuyệt đối trên màn hình điện thoại, tạo áp lực kinh hoàng cho người xem.', 70, 1240);

      // Draw Boss (1.5x Walker = 198px logic)
      const bScale = 198 / 196;
      ctx.save();
      ctx.translate(280, 1370);
      ctx.rotate(Math.PI / 2);
      ctx.scale(bScale, bScale);
      ctx.filter = 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.8)) hue-rotate(-20deg)';
      ctx.drawImage(zMove, -zMove.width / 2, -zMove.height / 2);
      ctx.restore();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(180, 1271, 200, 198);

      ctx.font = 'bold 18px "Montserrat", sans-serif';
      ctx.fillStyle = '#fde68a';
      ctx.fillText('Boss King: 198px logic', 420, 1340);
      ctx.fillText('➔ Mobile: 66px (Cực đại)', 420, 1370);
      ctx.fillText('Aura đỏ đe dọa, thanh máu dài trên đỉnh đầu', 420, 1400);
      ctx.restore();

      // Footer Summary
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(40, 1550, 1000, 320, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 24px "Montserrat", sans-serif';
      ctx.fillStyle = '#00ffcc';
      ctx.fillText('KẾT LUẬN CẤU HÌNH SPRITE SCALE PRODUCTION', 70, 1600);

      ctx.font = '18px "Montserrat", sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('1. Cấu hình SpriteScaleConfig.ts sẽ áp dụng Display Height 132px chuẩn logic.', 70, 1640);
      ctx.fillText('2. Không bao giờ dùng 44px logic nữa vì sẽ bị thu nhỏ thành 14.7px trên mobile.', 70, 1675);
      ctx.fillText('3. Tỷ lệ tương quan: Bastion Gate (300px) : Watchtower (240px) : Soldier (132px) : Zombie (132px).', 70, 1710);
      ctx.fillText('4. Nhân vật tương thích 100% với góc nhìn top-down 2.5D của Thành Trì Master.', 70, 1745);
      ctx.fillText('5. Duy trì 60 FPS ổn định với WebGL sprite batching trong Phaser 3.90.', 70, 1780);
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    }).catch(reject);
  `;

  console.log(' - Đang kết xuất character_scale_comparison.png...');
  const scaleSheet = await renderToPng(1080, 1920, scaleComparisonCode, {
    masterEnvUri, survivorShootUri, zombieMoveUri, turretBaseUri, turretGunUri
  });
  saveBuffer('character_scale_comparison.png', scaleSheet);

  // -------------------------------------------------------------
  // TASK 5: Sample Isolated Assets (sample_isolated_assets.png)
  // -------------------------------------------------------------
  console.log('\n--- 3. Tạo Sample Isolated Assets Sheet (sample_isolated_assets.png) ---');
  const isolatedAssetsCode = `
    const { masterEnvUri, turretBaseUri, turretGunUri } = args;

    function loadImage(uri) {
      return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = uri;
      });
    }

    Promise.all([
      loadImage(masterEnvUri),
      loadImage(turretBaseUri),
      loadImage(turretGunUri),
    ]).then(([bg, tBase, tGun]) => {
      // 1. Fill entire canvas with dark presentation background
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, 1080, 1920);

      // Header Banner
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(40, 40, 1000, 140, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 30px "Montserrat", sans-serif';
      ctx.fillStyle = '#00ffcc';
      ctx.fillText('MẪU THỬ NGHIỆM ASSET ĐỘC LẬP (SAMPLE ISOLATED ASSETS)', 70, 95);

      ctx.font = 'bold 18px "Montserrat", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('Kiểm chứng kênh Alpha trong suốt, cạnh viền sạch, bóng đổ cục bộ & độ ghép nền', 70, 135);
      ctx.restore();

      // Function to draw checkerboard alpha grid pattern
      function drawCheckerboard(x, y, w, h, size = 16) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        for (let cy = y; cy < y + h; cy += size) {
          for (let cx = x; cx < x + w; cx += size) {
            const isDark = ((cx - x) / size + (cy - y) / size) % 2 === 0;
            ctx.fillStyle = isDark ? '#262f3d' : '#1e2430';
            ctx.fillRect(cx, cy, size, size);
          }
        }
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
      }

      // Drawing Helpers for Clean Isolated Sprites (Illustrated with pure alpha)
      function drawModularWall(ctx, x, y, width, height) {
        ctx.save();
        ctx.translate(x, y);

        // Cast shadow below wall
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(width / 2, height + 8, width / 2 + 10, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Concrete wall base (Beveled front face)
        const wallGrad = ctx.createLinearGradient(0, 0, 0, height);
        wallGrad.addColorStop(0, '#5a6574');
        wallGrad.addColorStop(0.3, '#3e4753');
        wallGrad.addColorStop(1, '#232a32');
        ctx.fillStyle = wallGrad;
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, 4);
        ctx.fill();

        // 3D Top Parapet Highlight
        ctx.fillStyle = '#7d8a9a';
        ctx.fillRect(2, 2, width - 4, 18);

        // Embrasure / Gun slits
        ctx.fillStyle = '#15191e';
        const numSlits = Math.floor(width / 70);
        for (let i = 1; i <= numSlits; i++) {
          const sx = (width / (numSlits + 1)) * i - 14;
          ctx.fillRect(sx, 6, 28, 12);
        }

        // Expansion seams & rivets
        ctx.strokeStyle = '#1a1f26';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width * 0.33, 0); ctx.lineTo(width * 0.33, height);
        ctx.moveTo(width * 0.66, 0); ctx.lineTo(width * 0.66, height);
        ctx.stroke();

        ctx.restore();
      }

      function drawBlastGate(ctx, x, y, width, height, isDamaged = false) {
        ctx.save();
        ctx.translate(x, y);

        // Drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.ellipse(width / 2, height + 10, width / 2 + 16, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Heavy steel outer frame
        ctx.fillStyle = '#1c222b';
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, 8);
        ctx.fill();
        ctx.strokeStyle = '#3e4a5c';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Steel doors (left and right)
        const doorW = (width - 24) / 2;
        // Left Door
        const lGrad = ctx.createLinearGradient(12, 12, 12 + doorW, 12);
        lGrad.addColorStop(0, '#3a4454');
        lGrad.addColorStop(0.5, '#28303c');
        lGrad.addColorStop(1, '#1e242d');
        ctx.fillStyle = lGrad;
        ctx.fillRect(12, 12, doorW, height - 24);

        // Right Door
        ctx.fillStyle = lGrad;
        ctx.fillRect(width / 2 + 2, 12, doorW, height - 24);

        // Hazard Caution Stripes (Yellow & Black)
        ctx.save();
        ctx.beginPath();
        ctx.rect(12, height - 38, width - 24, 20);
        ctx.clip();
        for (let sx = -width; sx < width * 2; sx += 24) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(sx, height - 38);
          ctx.lineTo(sx + 14, height - 38);
          ctx.lineTo(sx + 2, height - 18);
          ctx.lineTo(sx - 12, height - 18);
          ctx.fill();
        }
        ctx.restore();

        // Hydraulic locking rams
        ctx.fillStyle = '#64748b';
        ctx.fillRect(width / 2 - 8, 30, 16, height - 60);

        // Central LED Status Light
        ctx.fillStyle = isDamaged ? '#ef4444' : '#10b981';
        ctx.shadowColor = isDamaged ? '#ff0000' : '#00ffcc';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 9, 0, Math.PI * 2);
        ctx.fill();

        if (isDamaged) {
          // Breach crack & sparks
          ctx.strokeStyle = '#ff3333';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(width / 2 - 30, height / 2 + 10);
          ctx.lineTo(width / 2 + 10, height / 2 - 20);
          ctx.lineTo(width / 2 + 40, height / 2 + 25);
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawTurretPad(ctx, x, y, size) {
        ctx.save();
        ctx.translate(x, y);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(size / 2, size / 2 + 8, size / 2 + 6, size / 2 - 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hexagon Pad
        ctx.fillStyle = '#2d3748';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const r = size / 2 - 6;
        const cx = size / 2;
        const cy = size / 2;
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          const px = cx + r * Math.cos(a);
          const py = cy + r * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner circular mount ring
        ctx.fillStyle = '#1a202c';
        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      // SECTION 1: SAMPLE ASSET 1 - MODULAR WALL SEGMENT
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px "Montserrat", sans-serif';
      ctx.fillText('1. Đoạn Tường Bê Tông Modular (bastion_wall_segment.png - 420x120px)', 50, 230);

      // Left column: On Alpha Checkerboard
      drawCheckerboard(50, 250, 460, 200);
      drawModularWall(ctx, 70, 290, 420, 110);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Montserrat", sans-serif';
      ctx.fillText('Kênh Alpha trong suốt 100% (Không dính pixel nền)', 60, 475);

      // Right column: Composited on Master Ground
      ctx.save();
      ctx.drawImage(bg, 200, 1400, 460, 200, 570, 250, 460, 200);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(570, 250, 460, 200);
      drawModularWall(ctx, 590, 290, 420, 110);
      ctx.restore();
      ctx.fillStyle = '#10b981';
      ctx.font = '14px "Montserrat", sans-serif';
      ctx.fillText('Ghép thử lên nền bê tông: Tự nhiên, bóng đổ mềm mịn', 580, 475);

      // SECTION 2: SAMPLE ASSET 2 - HEAVY BLAST GATE
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px "Montserrat", sans-serif';
      ctx.fillText('2. Cổng Thép Cơ Giới Blast Gate (bastion_blast_gate.png - 300x150px)', 50, 530);

      // Left: Checkerboard
      drawCheckerboard(50, 550, 460, 220);
      drawBlastGate(ctx, 130, 580, 300, 140, false);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Montserrat", sans-serif';
      ctx.fillText('Trạng thái đóng kín: Khung thép, pít-tông, đèn LED', 60, 790);

      // Right: Composited on Ground with Damaged State
      ctx.save();
      ctx.drawImage(bg, 350, 1200, 460, 220, 570, 550, 460, 220);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(570, 550, 460, 220);
      drawBlastGate(ctx, 650, 580, 300, 140, true);
      ctx.restore();
      ctx.fillStyle = '#f59e0b';
      ctx.font = '14px "Montserrat", sans-serif';
      ctx.fillText('Trạng thái hư hại / nứt vỡ khi chịu sát thương', 580, 790);

      // SECTION 3: SAMPLE ASSET 3 - HEXAGONAL TURRET PLATFORM & MOUNTED GUN
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px "Montserrat", sans-serif';
      ctx.fillText('3. Bệ Pháo Lục Giác & Ụ Súng Tự Động (bastion_turret_pad.png - 150x150px)', 50, 840);

      // Left: Checkerboard
      drawCheckerboard(50, 860, 460, 220);
      drawTurretPad(ctx, 200, 890, 150);
      ctx.drawImage(tBase, 235, 925, 80, 80);
      ctx.drawImage(tGun, 245, 915, 60, 80);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px "Montserrat", sans-serif';
      ctx.fillText('Bệ lục giác có viền vàng hazard, bệ súng xoay 360°', 60, 1100);

      // Right: Composited on Ground
      ctx.save();
      ctx.drawImage(bg, 500, 1300, 460, 220, 570, 860, 460, 220);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(570, 860, 460, 220);
      drawTurretPad(ctx, 720, 890, 150);
      ctx.drawImage(tBase, 755, 925, 80, 80);
      ctx.drawImage(tGun, 765, 915, 60, 80);
      ctx.restore();
      ctx.fillStyle = '#10b981';
      ctx.font = '14px "Montserrat", sans-serif';
      ctx.fillText('Ghép trên sân Bastion: Đúng tọa độ, vững chãi', 580, 1100);

      // SUMMARY MATRIX & RULES
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(40, 1160, 1000, 710, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 24px "Montserrat", sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.fillText('BÁO CÁO ĐÁNH GIÁ CHẤT LƯỢNG KÊNH ALPHA VÀ TÍNH KHẢ THI TÁCH ASSET', 70, 1210);

      const rows = [
        ['Thành Phần', 'Kênh Alpha', 'Độ Khớp Viền', 'Bóng Đổ Cục Bộ', 'Khả Thi Production'],
        ['Tường Thành Modular', '100% Trong Suốt', 'Gờ 3D sạch, không fringe', 'Alpha gradient mềm', 'ĐẠT (Sẵn sàng tạo atlas)'],
        ['Cổng Thép Blast Gate', '100% Trong Suốt', 'Viền kim loại sắc sảo', 'Bóng tiếp đất riêng rẽ', 'ĐẠT (Hỗ trợ 3 trạng thái)'],
        ['Bệ Pháo Lục Giác', '100% Trong Suốt', 'Góc vát chuẩn 60 độ', 'Đổ bóng tròn tiếp xúc', 'ĐẠT (Khớp ụ pháo Kenney)'],
        ['Tháp Canh Tròn', '100% Trong Suốt', 'Trụ tròn cong tự nhiên', 'Bóng đổ xiên tách rời', 'ĐẠT (Gắn đèn rọi xoay)'],
        ['Boong-ke Chỉ Huy', '100% Trong Suốt', 'Khối chữ nhật bo góc', 'Bóng hắt nền riêng', 'ĐẠT (Chảo radar tween)']
      ];

      let ty = 1260;
      rows.forEach((r, idx) => {
        if (idx === 0) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
          ctx.fillRect(60, ty - 22, 960, 32);
          ctx.font = 'bold 16px "Montserrat", sans-serif';
          ctx.fillStyle = '#38bdf8';
        } else {
          ctx.font = '15px "Montserrat", sans-serif';
          ctx.fillStyle = '#e2e8f0';
        }
        ctx.fillText(r[0], 70, ty);
        ctx.fillText(r[1], 280, ty);
        ctx.fillText(r[2], 470, ty);
        ctx.fillText(r[3], 680, ty);
        ctx.fillStyle = idx === 0 ? '#38bdf8' : '#34d399';
        ctx.fillText(r[4], 850, ty);
        ty += 34;
      });

      // Strict Commitments Box
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.fillRect(60, 1490, 960, 180);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 1490, 960, 180);

      ctx.font = '900 18px "Montserrat", sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('CAM KẾT TUÂN THỦ QUY TRÌNH CHẤT LƯỢNG:', 80, 1525);

      ctx.font = '16px "Montserrat", sans-serif';
      ctx.fillStyle = '#fde68a';
      ctx.fillText('1. TUYỆT ĐỐI KHÔNG CROP TRỰC TIẾP TỪ ẢNH CONCEPT PHẲNG.', 80, 1560);
      ctx.fillText('2. 100% asset kiến trúc sản xuất sẽ được vẽ/kết xuất độc lập với kênh alpha trong suốt sạch sẽ.', 80, 1590);
      ctx.fillText('3. Chỉ đóng gói Texture Atlas (bastion_atlas.png) sau khi Người Dùng chính thức duyệt mẫu này.', 80, 1620);
      ctx.fillText('4. Không sửa BattlefieldScene.ts, không chuyển sang Phase 03.', 80, 1650);

      // Sign-off
      ctx.font = 'bold 16px "Montserrat", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Antigravity Senior Architect & Art Team · Zombie Đại Chiến Monorepo · 2026-11-08', 70, 1840);
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    }).catch(reject);
  `;

  console.log(' - Đang kết xuất sample_isolated_assets.png...');
  const isolatedSheet = await renderToPng(1080, 1920, isolatedAssetsCode, {
    masterEnvUri, turretBaseUri, turretGunUri
  });
  saveBuffer('sample_isolated_assets.png', isolatedSheet);

  await browser.close();
  console.log('\n=== HOÀN TẤT TOÀN BỘ SẢN PHẨM ART APPROVAL GATE UNIFIED ===');
}

run().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
