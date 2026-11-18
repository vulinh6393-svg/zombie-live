import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const outDir = path.resolve('artifacts/visual-acceptance/audit');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function runAudit() {
  console.log('[AUDIT] Starting Playwright Gameplay & Visual Acceptance Audit...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox']
  });

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    resolutionsTested: [],
    combatInteractions: [],
    occlusionAnalysis: {},
    visualObservations: {}
  };

  // Helper to inject realistic TikTok LIVE UI Overlay
  const injectTikTokOverlayScript = `
    (function() {
      const existing = document.getElementById('tiktok-sim-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'tiktok-sim-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '99999';
      overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      overlay.innerHTML = \`
        <!-- TOP HEADER: HOST PILL & VIEWERS -->
        <div style="position: absolute; top: 16px; left: 16px; display: flex; align-items: center; background: rgba(0,0,0,0.55); border-radius: 24px; padding: 4px 12px 4px 4px; color: #fff;">
          <div style="width: 34px; height: 34px; border-radius: 50%; background: #ff0050; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; margin-right: 8px;">LIVE</div>
          <div>
            <div style="font-size: 13px; font-weight: 700; line-height: 1.2;">Zombie Defense VN</div>
            <div style="font-size: 10px; color: #cbd5e1;">❤️ 124.5K Thích</div>
          </div>
          <div style="margin-left: 10px; background: #fe2c55; border-radius: 12px; padding: 2px 8px; font-size: 11px; font-weight: 700;">+ Follow</div>
        </div>

        <div style="position: absolute; top: 16px; right: 16px; display: flex; align-items: center; gap: 8px;">
          <div style="background: rgba(0,0,0,0.55); border-radius: 16px; padding: 6px 12px; color: #fff; font-size: 12px; font-weight: 600;">👥 1,420</div>
          <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px;">✕</div>
        </div>

        <!-- BOTTOM-LEFT COMMENT STREAM OVERLAY (y: ~1350 to 1750 in 1080x1920) -->
        <div style="position: absolute; bottom: 80px; left: 16px; width: 340px; max-height: 380px; display: flex; flex-direction: column; gap: 8px; justify-content: flex-end;">
          <div style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); border-radius: 12px; padding: 8px 12px; color: #fff; font-size: 13px;">
            <span style="color: #38bdf8; font-weight: 700;">@game thủ_hà_nội:</span> BẮN BẮN dọn đường anh em ơi!
          </div>
          <div style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); border-radius: 12px; padding: 8px 12px; color: #fff; font-size: 13px;">
            <span style="color: #4ade80; font-weight: 700;">@chiến_binh_sao_vàng:</span> SUA 15 máu thành trì kìa!!
          </div>
          <div style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); border-radius: 12px; padding: 8px 12px; color: #fff; font-size: 13px;">
            <span style="color: #f472b6; font-weight: 700;">@linh_nga:</span> đã tặng 🚀 Tên Lửa (x10 Streak)
          </div>
          <div style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); border-radius: 12px; padding: 8px 12px; color: #fff; font-size: 13px;">
            <span style="color: #facc15; font-weight: 700;">@anh_ba_miền_tây:</span> JOIN 1 vào quân đoàn Alpha
          </div>
        </div>

        <!-- BOTTOM-RIGHT INTERACTION TRAY (GIFT, SHARE, LIKE) -->
        <div style="position: absolute; bottom: 80px; right: 16px; display: flex; flex-direction: column; align-items: center; gap: 14px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 24px;">🎁</div>
          <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 22px;">↗️</div>
          <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(254,44,85,0.85); display: flex; align-items: center; justify-content: center; font-size: 24px;">❤️</div>
        </div>

        <!-- BOTTOM INPUT BAR -->
        <div style="position: absolute; bottom: 16px; left: 16px; right: 16px; display: flex; gap: 12px;">
          <div style="flex: 1; height: 44px; background: rgba(0,0,0,0.6); border-radius: 22px; padding: 0 16px; display: flex; align-items: center; color: #94a3b8; font-size: 14px;">
            Thêm bình luận... (JOIN / BAN / SUA)
          </div>
        </div>
      \`;

      document.body.appendChild(overlay);
    })();
  `;

  // --- PART 1: 3 RESOLUTIONS CHECK (1080x1920, 540x960, 360x640) ---
  const resolutions = [
    { name: '1080x1920_desktop_obs', width: 1080, height: 1920, scale: 1 },
    { name: '540x960_tablet_scaled', width: 540, height: 960, scale: 0.5 },
    { name: '360x640_mobile_viewport', width: 360, height: 640, scale: 0.333 }
  ];

  for (const res of resolutions) {
    console.log(`[AUDIT] Testing resolution: ${res.name} (${res.width}x${res.height})...`);
    const page = await browser.newPage({
      viewport: { width: res.width, height: res.height },
      deviceScaleFactor: 1
    });

    await page.goto('http://127.0.0.1:5174/overlay', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000); // Wait for canvas and socket connection

    // Take clean raw screenshot
    const rawPath = path.join(outDir, `audit_${res.name}_raw.png`);
    await page.screenshot({ path: rawPath });

    // Inject simulated TikTok Live Overlay
    await page.evaluate(injectTikTokOverlayScript);
    await page.waitForTimeout(500);

    // Take overlaid screenshot
    const overlaidPath = path.join(outDir, `audit_${res.name}_tiktok_overlay.png`);
    await page.screenshot({ path: overlaidPath });

    diagnostics.resolutionsTested.push({
      resolution: res.name,
      dimensions: `${res.width}x${res.height}`,
      rawScreenshot: rawPath,
      tiktokOverlayScreenshot: overlaidPath
    });

    await page.close();
  }

  // --- PART 2: RUNTIME CANVAS & ENTITY INSPECTION (AT 1080x1920) ---
  console.log('[AUDIT] Inspecting live game scene, sprites, and animations on 1080x1920...');
  const gamePage = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1
  });
  await gamePage.goto('http://127.0.0.1:5174/overlay', { waitUntil: 'networkidle' });
  await gamePage.waitForTimeout(3000);

  // Open Dashboard in a second page to trigger interactions
  const dashPage = await browser.newPage();
  await dashPage.goto('http://127.0.0.1:3001/dashboard?token=admin_super_secret_production_2026_key', { waitUntil: 'networkidle' });
  await dashPage.waitForTimeout(1000);

  // Check initial game state
  const sceneInspection: any = await gamePage.evaluate(`
    (function() {
      const phaserGame = window.__PHASER_GAME__ || (window.Phaser && window.Phaser.GAMES && window.Phaser.GAMES[0]);
      if (!phaserGame) return { error: 'Phaser game instance not found on window' };

      const scene = phaserGame.scene.keys['BattlefieldScene'] || phaserGame.scene.scenes[0];
      if (!scene) return { error: 'BattlefieldScene not active' };

      const children = scene.children ? scene.children.list : [];
      const counts = {
        totalDisplayObjects: children.length,
        sprites: children.filter(c => c.type === 'Sprite').length,
        images: children.filter(c => c.type === 'Image').length,
        containers: children.filter(c => c.type === 'Container').length,
        textObjects: children.filter(c => c.type === 'Text').length,
        graphics: children.filter(c => c.type === 'Graphics').length
      };

      // Examine texts (HUD, Wave, Squads)
      const texts = children
        .filter(c => c.type === 'Text')
        .map(t => ({ text: t.text, x: t.x, y: t.y, visible: t.visible, style: { fontSize: t.style?.fontSize, color: t.style?.color } }));

      return {
        sceneKey: scene.scene.key,
        displayCounts: counts,
        hudTexts: texts,
        rendererType: phaserGame.renderer.type === 1 ? 'CANVAS' : 'WEBGL'
      };
    })()
  `);

  diagnostics.sceneInspection = sceneInspection;

  // --- PART 3: TRIGGER INTERACTIVE ACTIONS & CAPTURE EVIDENCE ---
  console.log('[AUDIT] Interacting with Dashboard commands: BAN, SUA, CUU, BOSS, GIFTS...');

  // 1. Join some players first
  console.log('[AUDIT] Joining players into ALPHA, BRAVO, CHARLIE...');
  await dashPage.click("button[onclick*=\"simulateJoin('alpha')\"]");
  await dashPage.waitForTimeout(300);
  await dashPage.click("button[onclick*=\"simulateJoin('bravo')\"]");
  await dashPage.waitForTimeout(300);
  await dashPage.click("button[onclick*=\"simulateJoin('charlie')\"]");
  await dashPage.waitForTimeout(500);

  // 2. Send BAN (Shoot)
  console.log('[AUDIT] Triggering BAN (Shoot)...');
  await dashPage.click("button[onclick*=\"sendAction('BAN')\"]");
  await gamePage.waitForTimeout(800);
  const banImg = path.join(outDir, 'audit_action_ban_shoot.png');
  await gamePage.screenshot({ path: banImg });
  diagnostics.combatInteractions.push({ action: 'BAN', screenshot: banImg, description: 'Gunfire tracers and damage numbers on zombies' });

  // 3. Send SUA (Repair)
  console.log('[AUDIT] Triggering SUA (Repair)...');
  await dashPage.click("button[onclick*=\"sendAction('SUA')\"]");
  await gamePage.waitForTimeout(800);
  const suaImg = path.join(outDir, 'audit_action_sua_repair.png');
  await gamePage.screenshot({ path: suaImg });
  diagnostics.combatInteractions.push({ action: 'SUA', screenshot: suaImg, description: 'Base repair particles (+15 HP) on gate' });

  // 4. Send Gift Shield
  console.log('[AUDIT] Triggering Gift Shield...');
  await dashPage.click("button[onclick*=\"gift_shield\"]");
  await gamePage.waitForTimeout(1000);
  const shieldImg = path.join(outDir, 'audit_skill_shield_active.png');
  await gamePage.screenshot({ path: shieldImg });
  diagnostics.combatInteractions.push({ action: 'GIFT_SHIELD', screenshot: shieldImg, description: 'Energy barrier dome covering bastion gate' });

  // 5. Send Gift Overclock (Doughnut)
  console.log('[AUDIT] Triggering Gift Overclock...');
  await dashPage.click("button[onclick*=\"gift_doughnut\"]");
  await gamePage.waitForTimeout(1000);
  const ocImg = path.join(outDir, 'audit_skill_overclock_active.png');
  await gamePage.screenshot({ path: ocImg });
  diagnostics.combatInteractions.push({ action: 'GIFT_OVERCLOCK', screenshot: ocImg, description: 'Turret rate-of-fire boost and aura' });

  // 6. Send Gift Missile (Airstrike)
  console.log('[AUDIT] Triggering Gift Missile (Airstrike)...');
  await dashPage.click("button[onclick*=\"gift_missile\"]");
  await gamePage.waitForTimeout(1500);
  const missileImg = path.join(outDir, 'audit_skill_missile_airstrike.png');
  await gamePage.screenshot({ path: missileImg });
  diagnostics.combatInteractions.push({ action: 'GIFT_MISSILE', screenshot: missileImg, description: 'Airstrike reticle, red AoE circle and detonation shockwave' });

  // Save full diagnostics JSON
  fs.writeFileSync(path.join(outDir, 'audit_diagnostics.json'), JSON.stringify(diagnostics, null, 2));

  await gamePage.close();
  await dashPage.close();
  await browser.close();

  console.log('[AUDIT COMPLETE] All screenshots and diagnostics captured in artifacts/visual-acceptance/audit/');
}

runAudit().catch(err => {
  console.error('[AUDIT FAILED]', err);
  process.exit(1);
});
