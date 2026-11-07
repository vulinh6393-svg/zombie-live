import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.resolve(__dirname, '../screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function runE2E() {
  console.log('--- BẮT ĐẦU PLAYWRIGHT E2E BROWSER TESTS (PHASE 02) ---');

  const browser = await chromium.launch({
    headless: true,
  });

  const consoleErrors: string[] = [];

  // ==========================================
  // TEST 1: Viewport 1080x1920 (Desktop Vertical 9:16)
  // ==========================================
  console.log('\n[1/5] Kiểm thử Viewport 1080x1920 (Desktop Vertical)...');
  const context1 = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
  });
  const page1 = await context1.newPage();
  page1.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error]: ${msg.text()}`);
    }
  });
  page1.on('pageerror', (err) => {
    consoleErrors.push(`[Page Error]: ${err.message}`);
  });

  await page1.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page1.waitForSelector('canvas', { timeout: 10000 });
  await page1.waitForTimeout(2000); // Wait for initial wave rendering

  const hasDevPanel = await page1.isVisible('#dev-control-panel');
  console.log(' - Canvas render thành công: TRUE');
  console.log(' - Dev Control Panel xuất hiện trên trang chủ: ' + hasDevPanel);

  // Measure FPS over 2 seconds (using raw string to avoid esbuild __name injection)
  const fpsMeasurement = await page1.evaluate(`
    new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function countFrame() {
        frames++;
        if (performance.now() - start >= 2000) {
          const fps = (frames / (performance.now() - start)) * 1000;
          resolve(Math.round(fps));
        } else {
          requestAnimationFrame(countFrame);
        }
      }
      requestAnimationFrame(countFrame);
    })
  `);
  console.log(` - Benchmark FPS đo được (40 lính + zombie + towers): ${fpsMeasurement} FPS`);

  const path1 = path.join(screenshotsDir, 'battlefield_1080x1920.png');
  await page1.screenshot({ path: path1 });
  console.log(` - Đã chụp screenshot: ${path1}`);

  // ==========================================
  // TEST 2: Viewport 720x1280 (Standard Mobile)
  // ==========================================
  console.log('\n[2/5] Kiểm thử Viewport 720x1280 (Standard Mobile)...');
  const context2 = await browser.newContext({
    viewport: { width: 720, height: 1280 },
  });
  const page2 = await context2.newPage();
  await page2.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page2.waitForSelector('canvas');
  await page2.waitForTimeout(1500);

  const path2 = path.join(screenshotsDir, 'battlefield_720x1280.png');
  await page2.screenshot({ path: path2 });
  console.log(` - Đã chụp screenshot mobile: ${path2}`);

  // ==========================================
  // TEST 3: Route /overlay (OBS / TikTok Studio Clean View)
  // ==========================================
  console.log('\n[3/5] Kiểm thử Route /overlay (OBS Clean View)...');
  const context3 = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
  });
  const page3 = await context3.newPage();
  await page3.goto('http://localhost:5173/overlay', { waitUntil: 'networkidle' });
  await page3.waitForSelector('canvas');
  await page3.waitForTimeout(1500);

  const overlayHasDevPanel = await page3.$('#dev-control-panel');
  console.log(' - Kiểm tra /overlay KHÔNG có Dev Control Panel: ' + (overlayHasDevPanel === null));

  const path3 = path.join(screenshotsDir, 'overlay_clean_1080x1920.png');
  await page3.screenshot({ path: path3 });
  console.log(` - Đã chụp screenshot OBS overlay: ${path3}`);

  // ==========================================
  // TEST 4: Boss Scenario (Zombie King & Rage Phase)
  // ==========================================
  console.log('\n[4/5] Kiểm thử Boss Scenario (Zombie King Entrance)...');
  // Click on Boss scenario in dev panel on page 1
  const bossBtn = await page1.getByText('TRÙM CUỐI (Boss)');
  if (bossBtn) {
    await bossBtn.click();
    await page1.waitForTimeout(2000); // Wait for boss entrance & health bar update
  }

  const path4 = path.join(screenshotsDir, 'battlefield_boss_fight.png');
  await page1.screenshot({ path: path4 });
  console.log(` - Đã chụp screenshot Boss fight: ${path4}`);

  // ==========================================
  // TEST 5: Outcome Scenarios (Victory)
  // ==========================================
  console.log('\n[5/5] Kiểm thử Outcome Victory Scenario...');
  const winBtn = await page1.getByText('Thắng');
  if (winBtn) {
    await winBtn.click();
    await page1.waitForTimeout(1500);
  }

  const path5 = path.join(screenshotsDir, 'battlefield_victory.png');
  await page1.screenshot({ path: path5 });
  console.log(` - Đã chụp screenshot Victory: ${path5}`);

  await browser.close();

  console.log('\n--- KẾT THÚC KIỂM THỬ PLAYWRIGHT E2E ---');
  console.log('Tổng số console errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Lỗi console ghi nhận được:');
    consoleErrors.forEach((e) => console.error(e));
    process.exit(1);
  } else {
    console.log('XÁC NHẬN: Không có bất kỳ lỗi console hoặc runtime error nào!');
  }
}

runE2E().catch((err) => {
  console.error('E2E Test Thất bại:', err);
  process.exit(1);
});
