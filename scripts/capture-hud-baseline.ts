import { chromium } from 'playwright';
import * as path from 'path';

const outDir = path.resolve('artifacts/gameplay-polish-review/mobile-hud-before-after');

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

      <!-- BOTTOM-LEFT COMMENT STREAM OVERLAY -->
      <div style="position: absolute; bottom: 80px; left: 16px; width: 340px; max-height: 380px; display: flex; flex-direction: column; gap: 8px; justify-content: flex-end;">
        <div style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); border-radius: 12px; padding: 8px 12px; color: #fff; font-size: 13px;">
          <span style="color: #00f5d4; font-weight: 700;">@game_thu:</span> BẮN BẮN dọn đường anh em ơi!
        </div>
        <div style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); border-radius: 12px; padding: 8px 12px; color: #fff; font-size: 13px;">
          <span style="color: #fee440; font-weight: 700;">@chien_binh:</span> SUA 15 máu thành trì kìa!!
        </div>
        <div style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); border-radius: 12px; padding: 8px 12px; color: #fff; font-size: 13px;">
          <span style="color: #f72585; font-weight: 700;">@linh_nga:</span> đã tặng 🚀 Tên Lửa (x10 Streak)
        </div>
        <div style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); border-radius: 12px; padding: 8px 12px; color: #fff; font-size: 13px;">
          <span style="color: #00f5d4; font-weight: 700;">@anh_ba:</span> JOIN 1 vào quân đoàn Alpha
        </div>
      </div>

      <!-- BOTTOM-RIGHT INTERACTION TRAY -->
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

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const resolutions = [
    { name: '1080x1920', width: 1080, height: 1920 },
    { name: '540x960', width: 540, height: 960 },
    { name: '360x640', width: 360, height: 640 }
  ];

  for (const res of resolutions) {
    const page = await browser.newPage({ viewport: { width: res.width, height: res.height } });
    await page.goto('http://127.0.0.1:5174/overlay', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    await page.screenshot({ path: path.join(outDir, `before_${res.name}_raw.png`) });

    await page.evaluate(injectTikTokOverlayScript);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `before_${res.name}_tiktok.png`) });

    await page.close();
  }

  await browser.close();
  console.log('[OK] Captured all BEFORE baseline screenshots.');
}

capture().catch(err => { console.error(err); process.exit(1); });
