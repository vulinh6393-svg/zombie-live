import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const outDir = path.resolve('artifacts/gameplay-polish-review/mobile-hud-before-after');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

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
      <div id="tt-top-pill" style="position: absolute; top: 16px; left: 16px; display: flex; align-items: center; background: rgba(0,0,0,0.55); border-radius: 24px; padding: 4px 12px 4px 4px; color: #fff;">
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

      <!-- BOTTOM-LEFT COMMENT STREAM OVERLAY -->
      <div style="position: absolute; bottom: 80px; left: 16px; width: 260px; max-height: 220px; display: flex; flex-direction: column; gap: 6px; justify-content: flex-end;">
        <div style="background: rgba(0,0,0,0.6); border-radius: 10px; padding: 6px 10px; color: #fff; font-size: 12px;">
          <span style="color: #00f5d4; font-weight: 700;">@game_thu:</span> BẮN dọn đường!
        </div>
        <div style="background: rgba(0,0,0,0.6); border-radius: 10px; padding: 6px 10px; color: #fff; font-size: 12px;">
          <span style="color: #fee440; font-weight: 700;">@chien_binh:</span> SUA +15 HP!
        </div>
        <div style="background: rgba(0,0,0,0.6); border-radius: 10px; padding: 6px 10px; color: #fff; font-size: 12px;">
          <span style="color: #f72585; font-weight: 700;">@linh_nga:</span> tặng 🚀 Tên Lửa
        </div>
      </div>

      <!-- BOTTOM-RIGHT INTERACTION TRAY -->
      <div style="position: absolute; bottom: 80px; right: 16px; display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <div style="width: 42px; height: 42px; border-radius: 50%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 20px;">🎁</div>
        <div style="width: 42px; height: 42px; border-radius: 50%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 18px;">↗️</div>
        <div style="width: 42px; height: 42px; border-radius: 50%; background: rgba(254,44,85,0.85); display: flex; align-items: center; justify-content: center; font-size: 20px;">❤️</div>
      </div>

      <!-- BOTTOM INPUT BAR -->
      <div style="position: absolute; bottom: 16px; left: 16px; right: 16px; display: flex; gap: 12px;">
        <div style="flex: 1; height: 40px; background: rgba(0,0,0,0.6); border-radius: 20px; padding: 0 16px; display: flex; align-items: center; color: #94a3b8; font-size: 13px;">
          Thêm bình luận... (JOIN / BAN / SUA)
        </div>
      </div>
    \`;

    document.body.appendChild(overlay);
  })();
`;

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const resolutions = [
    { name: '1080x1920', width: 1080, height: 1920 },
    { name: '540x960', width: 540, height: 960 },
    { name: '360x640', width: 360, height: 640 }
  ];

  let hudMetrics: any = null;

  for (const res of resolutions) {
    const page = await browser.newPage({ viewport: { width: res.width, height: res.height } });
    await page.goto('http://127.0.0.1:5174/overlay', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);

    await page.screenshot({ path: path.join(outDir, `after_${res.name}_raw.png`) });

    await page.evaluate(injectTikTokOverlayScript);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `after_${res.name}_tiktok.png`) });

    if (res.name === '360x640') {
      hudMetrics = await page.evaluate(`
        (function() {
          const game = window.__PHASER_GAME__;
          const scene = game && game.scene && game.scene.keys && game.scene.keys['BattlefieldScene'];
          const canvas = document.querySelector('canvas');
          const canvasRect = canvas ? canvas.getBoundingClientRect() : { width: 360, height: 640 };
          const scaleFactor = canvasRect.width / 1080;
          const topPill = document.getElementById('tt-top-pill');
          const topPillRect = topPill ? topPill.getBoundingClientRect() : null;

          if (!scene || !scene.children) return { error: 'Scene not found' };
          const texts = scene.children.list
            .filter(c => c.type === 'Text' && c.visible)
            .map(t => {
              const b = t.getBounds();
              const fs = parseFloat(t.style && t.style.fontSize ? t.style.fontSize : '0');
              return {
                text: t.text,
                canvasFontSizePx: fs,
                mobileScaledFontSizePx: Math.round(fs * scaleFactor * 10) / 10,
                boundsCanvas: { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) },
                boundsMobilePx: {
                  x: Math.round(b.x * scaleFactor * 10) / 10,
                  y: Math.round(b.y * scaleFactor * 10) / 10,
                  width: Math.round(b.width * scaleFactor * 10) / 10,
                  height: Math.round(b.height * scaleFactor * 10) / 10
                },
                clippedHorizontally: (b.x < 0 || (b.x + b.width) > 1080)
              };
            });

          // Also inspect container texts (topContainer, squadBadges)
          const containerTexts = [];
          scene.children.list.filter(c => c.type === 'Container' && c.visible).forEach(cont => {
            if (!cont.list) return;
            cont.list.forEach(child => {
              if (child.type === 'Text' && child.visible) {
                const b = child.getBounds();
                const fs = parseFloat(child.style && child.style.fontSize ? child.style.fontSize : '0');
                containerTexts.push({
                  text: child.text,
                  canvasFontSizePx: fs,
                  mobileScaledFontSizePx: Math.round(fs * scaleFactor * 10) / 10,
                  boundsCanvas: { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) },
                  boundsMobilePx: {
                    x: Math.round(b.x * scaleFactor * 10) / 10,
                    y: Math.round(b.y * scaleFactor * 10) / 10,
                    width: Math.round(b.width * scaleFactor * 10) / 10,
                    height: Math.round(b.height * scaleFactor * 10) / 10
                  },
                  clippedHorizontally: (b.x < 0 || (b.x + b.width) > 1080)
                });
              }
            });
          });

          const allTexts = [...texts, ...containerTexts];
          const topHudMinY = Math.min(...allTexts.filter(t => t.boundsCanvas.y >= 100 && t.boundsCanvas.y < 360).map(t => t.boundsMobilePx.y));
          const topPillBottom = topPillRect ? Math.round(topPillRect.bottom * 10) / 10 : 58;

          return {
            viewport: '360x640',
            canvasRectWidth: canvasRect.width,
            scaleFactor: Math.round(scaleFactor * 1000) / 1000,
            tiktokTopPillBottomPx: topPillBottom,
            topHudMinYMobilePx: topHudMinY,
            clearOfTiktokTopPill: topHudMinY >= topPillBottom,
            anyHorizontalClipping: allTexts.some(t => t.clippedHorizontally),
            elements: allTexts
          };
        })()
      `);
    }

    await page.close();
  }

  if (hudMetrics) {
    fs.writeFileSync(path.join(outDir, 'hud_readability_metrics.json'), JSON.stringify(hudMetrics, null, 2), 'utf8');
    console.log('[OK] Saved hud_readability_metrics.json');
  }

  await browser.close();
  console.log('[OK] Captured all AFTER screenshots with redesigned HUD.');
}

capture().catch(err => { console.error(err); process.exit(1); });
