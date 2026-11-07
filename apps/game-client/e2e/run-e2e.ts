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
  console.log('=== BẮT ĐẦU PLAYWRIGHT E2E BROWSER VALIDATION (PHASE 02.1) ===');

  const browser = await chromium.launch({
    headless: true,
  });

  const consoleErrors: string[] = [];
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[Console Error]: ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleErrors.push(`[Page Error]: ${err.message}`));

  // ==========================================
  // 1. / early_wave_1080x1920.png
  // ==========================================
  console.log('\n[1/9] Chụp / early_wave_1080x1920.png...');
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  const wave1Btn = page.getByText('Đợt 1 (Walker)');
  if (await wave1Btn.count() > 0) await wave1Btn.click();
  await page.waitForTimeout(1500);

  const path1 = path.join(screenshotsDir, 'early_wave_1080x1920.png');
  await page.screenshot({ path: path1 });
  console.log(` - Đã lưu: ${path1}`);

  // ==========================================
  // 2. /overlay overlay_clean_1080x1920.png
  // ==========================================
  console.log('\n[2/9] Chụp /overlay overlay_clean_1080x1920.png (OBS Clean)...');
  await page.goto('http://localhost:5173/overlay', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const hasDevPanel = await page.$('#dev-control-panel');
  if (hasDevPanel !== null) {
    throw new Error('FAIL: Phát hiện dev control panel trên route /overlay!');
  }
  const path2 = path.join(screenshotsDir, 'overlay_clean_1080x1920.png');
  await page.screenshot({ path: path2 });
  console.log(` - Đã lưu: ${path2} (Xác nhận 0 debug tool)`);

  // ==========================================
  // 3. /overlay mid_wave_720x1280.png
  // ==========================================
  console.log('\n[3/9] Chụp /overlay mid_wave_720x1280.png...');
  await page.setViewportSize({ width: 720, height: 1280 });
  await page.waitForTimeout(1500);

  const path3 = path.join(screenshotsDir, 'mid_wave_720x1280.png');
  await page.screenshot({ path: path3 });
  console.log(` - Đã lưu: ${path3}`);

  // ==========================================
  // 4. /overlay dense_swarm_360x640.png
  // ==========================================
  console.log('\n[4/9] Chụp /overlay dense_swarm_360x640.png (Mobile Preview)...');
  await page.setViewportSize({ width: 360, height: 640 });
  await page.waitForTimeout(1500);

  const path4 = path.join(screenshotsDir, 'dense_swarm_360x640.png');
  await page.screenshot({ path: path4 });
  console.log(` - Đã lưu: ${path4}`);

  // ==========================================
  // 5. / boss_entrance_1080x1920.png
  // ==========================================
  console.log('\n[5/9] Chụp boss_entrance_1080x1920.png (Zombie King Entrance)...');
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  const bossBtn = page.getByText('TRÙM CUỐI (Boss)');
  if (await bossBtn.count() > 0) await bossBtn.click();
  await page.waitForTimeout(2000);

  const path5 = path.join(screenshotsDir, 'boss_entrance_1080x1920.png');
  await page.screenshot({ path: path5 });
  console.log(` - Đã lưu: ${path5}`);

  // ==========================================
  // 6. boss_attack_720x1280.png
  // ==========================================
  console.log('\n[6/9] Chụp boss_attack_720x1280.png...');
  await page.setViewportSize({ width: 720, height: 1280 });
  await page.waitForTimeout(1500);

  const path6 = path.join(screenshotsDir, 'boss_attack_720x1280.png');
  await page.screenshot({ path: path6 });
  console.log(` - Đã lưu: ${path6}`);

  // ==========================================
  // 7. victory_1080x1920.png
  // ==========================================
  console.log('\n[7/9] Chụp victory_1080x1920.png...');
  await page.setViewportSize({ width: 1080, height: 1920 });
  const winBtn = page.getByText('Thắng');
  if (await winBtn.count() > 0) await winBtn.click();
  await page.waitForTimeout(1500);

  const path7 = path.join(screenshotsDir, 'victory_1080x1920.png');
  await page.screenshot({ path: path7 });
  console.log(` - Đã lưu: ${path7}`);

  // ==========================================
  // 8. defeat_1080x1920.png
  // ==========================================
  console.log('\n[8/9] Chụp defeat_1080x1920.png...');
  const defeatBtn = page.getByText('Thua');
  if (await defeatBtn.count() > 0) await defeatBtn.click();
  await page.waitForTimeout(1500);

  const path8 = path.join(screenshotsDir, 'defeat_1080x1920.png');
  await page.screenshot({ path: path8 });
  console.log(` - Đã lưu: ${path8}`);

  // ==========================================
  // 9. character_contact_sheet.png
  // ==========================================
  console.log('\n[9/9] Chụp character_contact_sheet.png (10 Chủng Zombie & Lính)...');
  await page.goto('http://localhost:5173/contact-sheet', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const path9 = path.join(screenshotsDir, 'character_contact_sheet.png');
  await page.screenshot({ path: path9 });
  console.log(` - Đã lưu: ${path9}`);

  await browser.close();

  console.log('\n=== HOÀN THÀNH TOÀN BỘ 9 SCREENSHOTS THỰC TẾ ===');
  console.log('Tổng số console errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('LỖI CONSOLE:', consoleErrors);
    process.exit(1);
  } else {
    console.log('XÁC NHẬN: 0 Console Errors!');
  }
}

runE2E().catch((err) => {
  console.error('E2E Runner Thất Bại:', err);
  process.exit(1);
});
