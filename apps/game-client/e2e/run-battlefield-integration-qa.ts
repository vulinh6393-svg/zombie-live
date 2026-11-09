import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, '..');
const screenshotsDir = path.join(clientDir, 'screenshots');
const recordingsDir = path.join(clientDir, 'recordings');
const brainDir = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\8f087681-8572-4911-976b-b3062eed932e';

if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true });

async function runBattlefieldIntegrationQA() {
  console.log('========================================================================');
  console.log('  BATTLEFIELD INTEGRATION QA & 30s+ GAMEPLAY VIDEO RECORDING RUNNER     ');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=default',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
      '--no-sandbox',
    ],
  });

  const consoleErrors: string[] = [];
  const fpsSamples: number[] = [];

  // =========================================================================
  // 1. RECORD >= 30s MAIN BATTLEFIELD GAMEPLAY VIDEO (1080x1920)
  // =========================================================================
  console.log('--- 1. BẮT ĐẦU GHI HÌNH GAMEPLAY CHIẾN TRƯỜNG CHÍNH (>= 30 GIÂY) ---');
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    recordVideo: {
      dir: recordingsDir,
      size: { width: 1080, height: 1920 },
    },
  });

  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error(` [BROWSER ERROR] ${msg.text()}`);
    }
  });

  await page.goto('http://localhost:5173/?layout=bastion&formation=C', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => typeof (window as any).battlefield !== 'undefined', { timeout: 15000 });

  console.log(' [OK] BattlefieldScene loaded with Bastion Master layout.');

  // Measure initial FPS and state
  let metrics = await page.evaluate(() => (window as any).battlefield.getFpsMetrics());
  console.log(` [INIT METRICS] FPS: ${metrics.actualFps} | Lính: ${metrics.soldierCount} | Zombie: ${metrics.zombieCount}`);

  // Action schedule across 32 seconds:
  // t = 0..5s: Standard combat (turrets & squads firing at advancing zombies)
  for (let s = 0; s < 5; s++) {
    await page.waitForTimeout(1000);
    const m = await page.evaluate(() => (window as any).battlefield.getFpsMetrics());
    fpsSamples.push(m.actualFps);
  }

  // t = 5s: Chụp ảnh gameplay 1080x1920
  const ss1080Path = path.join(screenshotsDir, 'battlefield_main_1080x1920.png');
  await page.screenshot({ path: ss1080Path, fullPage: false });
  console.log(` [SCREENSHOT] Đã lưu ảnh chiến trường chính 1080x1920: ${ss1080Path}`);

  // t = 6s: Mở cổng Blast Gate
  console.log(' [ACTION @ 6s] Mở cổng Blast Gate (window.battlefield.openGate())...');
  await page.evaluate(() => (window as any).battlefield.openGate());

  // t = 6..15s: Cổng mở, zombie Lane Bravo tràn qua thông đạo vào sân thành
  for (let s = 0; s < 9; s++) {
    await page.waitForTimeout(1000);
    const m = await page.evaluate(() => (window as any).battlefield.getFpsMetrics());
    fpsSamples.push(m.actualFps);
  }

  // t = 15s: Kích hoạt Gift Skill (Tên Lửa Tổng Lực)
  console.log(' [ACTION @ 15s] Kích hoạt Gift Skill Tên Lửa Tổng Lực (window.battlefield.triggerGift())...');
  await page.evaluate(() => (window as any).battlefield.triggerGift('TÊN LỬA TỔNG LỰC'));

  // t = 15..21s: Shockwave nổ, rung màn hình, damage bay
  for (let s = 0; s < 6; s++) {
    await page.waitForTimeout(1000);
    const m = await page.evaluate(() => (window as any).battlefield.getFpsMetrics());
    fpsSamples.push(m.actualFps);
  }

  // t = 21s: Tiêu diệt zombie authoritative
  console.log(' [ACTION @ 21s] Tiêu diệt zombie authoritative (window.battlefield.triggerZombieDeath())...');
  const deathResult = await page.evaluate(() => (window as any).battlefield.triggerZombieDeath());
  console.log(`   Kết quả tiêu diệt: ${JSON.stringify(deathResult)}`);

  // t = 22..26s: Quan sát decal thi thể zombie_corpse_0 và vũng máu
  for (let s = 0; s < 5; s++) {
    await page.waitForTimeout(1000);
    const m = await page.evaluate(() => (window as any).battlefield.getFpsMetrics());
    fpsSamples.push(m.actualFps);
  }

  // t = 26s: Đóng cổng Blast Gate lại
  console.log(' [ACTION @ 26s] Đóng cổng Blast Gate (window.battlefield.closeGate())...');
  await page.evaluate(() => (window as any).battlefield.closeGate());

  // t = 26..32s: Cổng đóng, khóa chốt, ranh giới y=840 chặn đứng
  for (let s = 0; s < 6; s++) {
    await page.waitForTimeout(1000);
    const m = await page.evaluate(() => (window as any).battlefield.getFpsMetrics());
    fpsSamples.push(m.actualFps);
  }

  const finalMetrics = await page.evaluate(() => (window as any).battlefield.getFpsMetrics());
  console.log(` [FINAL METRICS] FPS: ${finalMetrics.actualFps} | p95: ${finalMetrics.p95FrameTime.toFixed(1)}ms`);

  await page.close();
  await context.close();

  // Tìm và đổi tên video vừa ghi
  const videoFiles = fs.readdirSync(recordingsDir).filter((f) => f.endsWith('.webm') && f.startsWith('page@'));
  const targetVideo = path.join(recordingsDir, 'battlefield_gameplay_30s.webm');
  if (videoFiles.length > 0) {
    const latestVideo = videoFiles.sort((a, b) => {
      return fs.statSync(path.join(recordingsDir, b)).mtimeMs - fs.statSync(path.join(recordingsDir, a)).mtimeMs;
    })[0];
    fs.copyFileSync(path.join(recordingsDir, latestVideo), targetVideo);
    fs.unlinkSync(path.join(recordingsDir, latestVideo));
    console.log(` [VIDEO SAVED] ${targetVideo} (${fs.statSync(targetVideo).size} bytes)`);

    // Sao chép sang brain artifact
    const brainVideo = path.join(brainDir, 'battlefield_gameplay_30s.webm');
    fs.copyFileSync(targetVideo, brainVideo);
    console.log(` [VIDEO COPIED TO BRAIN] ${brainVideo}`);
  }

  // Sao chép screenshot 1080x1920 sang brain artifact
  const brainSs1080 = path.join(brainDir, 'battlefield_main_1080x1920.png');
  fs.copyFileSync(ss1080Path, brainSs1080);

  // =========================================================================
  // 2. CHỤP ẢNH MOBILE RUNTIME (360x640 @2x DPR = 720x1280)
  // =========================================================================
  console.log('\n--- 2. CHỤP ẢNH MOBILE RUNTIME 360x640 ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/?layout=bastion&formation=C', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForSelector('canvas', { timeout: 15000 });
  await mobilePage.waitForFunction(() => typeof (window as any).battlefield !== 'undefined', { timeout: 15000 });
  await mobilePage.waitForTimeout(3000);

  const ssMobilePath = path.join(screenshotsDir, 'battlefield_mobile_360x640.png');
  await mobilePage.screenshot({ path: ssMobilePath, fullPage: false });
  console.log(` [SCREENSHOT] Đã lưu ảnh mobile 360x640: ${ssMobilePath}`);

  const brainSsMobile = path.join(brainDir, 'battlefield_mobile_360x640.png');
  fs.copyFileSync(ssMobilePath, brainSsMobile);

  await mobilePage.close();
  await mobileContext.close();
  await browser.close();

  // =========================================================================
  // 3. TÍNH TOÁN VÀ XUẤT BÁO CÁO TELEMETRY
  // =========================================================================
  const avgFps = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
  const minFps = Math.min(...fpsSamples);
  const maxFps = Math.max(...fpsSamples);

  const report = {
    totalDurationSeconds: 32,
    fpsMetrics: {
      averageFps: Math.round(avgFps * 10) / 10,
      minFps,
      maxFps,
      samplesCount: fpsSamples.length,
      p95FrameTimeMs: finalMetrics.p95FrameTime,
    },
    consoleErrorsCount: consoleErrors.length,
    consoleErrors,
    videoFile: 'battlefield_gameplay_30s.webm',
    videoSizeBytes: fs.existsSync(targetVideo) ? fs.statSync(targetVideo).size : 0,
    screenshots: {
      main1080x1920: 'battlefield_main_1080x1920.png',
      mobile360x640: 'battlefield_mobile_360x640.png',
    },
    verdict: consoleErrors.length === 0 && avgFps >= 55 ? 'PASS' : 'WARN',
  };

  const reportPath = path.join(clientDir, 'art-approval-final', 'battlefield_integration_telemetry.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n [TELEMETRY REPORT] ${reportPath}`);
  console.log(`   - FPS trung bình: ${report.fpsMetrics.averageFps} (Min: ${minFps}, Max: ${maxFps})`);
  console.log(`   - Console Errors: ${consoleErrors.length}`);
  console.log(`   - Video Size: ${(report.videoSizeBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - VERDICT: ${report.verdict}`);

  if (report.consoleErrorsCount > 0) {
    console.error(' [WARNING] Có console errors xảy ra!');
  }
}

runBattlefieldIntegrationQA().catch((err) => {
  console.error('[FATAL QA ERROR]', err);
  process.exit(1);
});
