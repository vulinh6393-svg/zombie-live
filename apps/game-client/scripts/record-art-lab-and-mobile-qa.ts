import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const conceptDir = path.join(rootDir, 'public/assets/concept');
const finalDir = path.join(rootDir, 'art-approval-final');
const brainDir = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\8f087681-8572-4911-976b-b3062eed932e';
const tempVideoDir = path.join(rootDir, 'temp-recordings');

if (!fs.existsSync(tempVideoDir)) fs.mkdirSync(tempVideoDir, { recursive: true });

async function run() {
  console.log('=== QUAY VIDEO RUNTIME & CHỤP MOBILE QA TỪ PHASER SCENE ===');
  const browser = await chromium.launch({ headless: true });

  // 1. RECORD RUNTIME VIDEO (1080x1920 logic canvas, 18 seconds)
  console.log(' - Bắt đầu quay video Phaser WebGL tại /art-integration-lab (18.5s)...');
  const videoContext = await browser.newContext({
    viewport: { width: 540, height: 960 },
    recordVideo: {
      dir: tempVideoDir,
      size: { width: 540, height: 960 },
    },
  });

  const page = await videoContext.newPage();
  await page.goto('http://localhost:5173/art-integration-lab', { waitUntil: 'networkidle' });

  // Wait for canvas to load and render
  await page.waitForSelector('canvas');
  console.log(' - Canvas đã hiển thị, đang ghi hình 18.5 giây chu trình 4 trạng thái (9 Zombie, 3 Lane Collision, Cổng mở, Gift)...');

  // Record for 18.5 seconds to capture all 4 phases:
  // Phase 0: 9 Zombie tiến công & dừng tại Collision Boundary 3 Lane (0 - 4.5s)
  // Phase 1: Cổng trượt 2 cánh & Zombie Bravo đột phá, Soldier Alpha nấp sau tường (4.5 - 9.0s)
  // Phase 2: Tường nứt vỡ, 3 Pháo xoay bắn trả Muzzle Flash (9.0 - 13.5s)
  // Phase 3: Gift Airstrike rực sáng quét sạch quái (13.5 - 18.0s)
  await page.waitForTimeout(18500);

  // Close context to save video
  await videoContext.close();

  // Find the generated video file
  const videoFiles = fs.readdirSync(tempVideoDir).filter(f => f.endsWith('.webm'));
  if (videoFiles.length > 0) {
    // Sort by mtime descending
    videoFiles.sort((a, b) => {
      return fs.statSync(path.join(tempVideoDir, b)).mtimeMs - fs.statSync(path.join(tempVideoDir, a)).mtimeMs;
    });
    const latestVideo = path.join(tempVideoDir, videoFiles[0]);
    const videoBuffer = fs.readFileSync(latestVideo);

    const targetNames = ['art_integration_lab.webm'];
    for (const name of targetNames) {
      fs.writeFileSync(path.join(conceptDir, name), videoBuffer);
      fs.writeFileSync(path.join(finalDir, name), videoBuffer);
      fs.writeFileSync(path.join(brainDir, name), videoBuffer);
      console.log(` [VIDEO] Đã lưu ${name} (${videoBuffer.length} bytes, duration: ~18.5s)`);
    }
  }

  // 2. CAPTURE REAL MOBILE VIEWPORT RUNTIME SCREENSHOT (360 x 640)
  // Capture with 9 Zombie, 3 Soldier, 3 Turret, HUD, and Gift Event Active!
  console.log(' - Chụp ảnh runtime Playwright ở viewport thật 360x640 (mật độ 9 Zombie, 3 Soldier, 3 Turret, HUD và Gift)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
    isMobile: true,
  });

  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/art-integration-lab', { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('canvas');

  // Wait until Phase 3 (around 14.5s) where Gift Airstrike is active, or wait 3s for dense 9-zombie formation
  // Let's capture at 14.5s to capture the Gift Banner + Beams + 9 Zombies + 3 Soldiers + 3 Turrets + HUD
  console.log(' - Đang đợi đến thời điểm Gift Airstrike kích hoạt (14.5s)...');
  await mobilePage.waitForTimeout(14200);

  const mobileScreenshot = await mobilePage.screenshot({ type: 'png' });
  const mobileTargetNames = ['mobile_runtime_360x640.png'];
  for (const name of mobileTargetNames) {
    fs.writeFileSync(path.join(conceptDir, name), mobileScreenshot);
    fs.writeFileSync(path.join(finalDir, name), mobileScreenshot);
    fs.writeFileSync(path.join(brainDir, name), mobileScreenshot);
    console.log(` [MOBILE QA] Đã lưu ${name} (${mobileScreenshot.length} bytes)`);
  }

  await mobileContext.close();
  await browser.close();
  console.log('=== HOÀN TẤT GHI HÌNH VÀ CHỤP RUNTIME MOBILE QA ===');
}

run().catch(err => {
  console.error('Lỗi quay video/mobile QA:', err);
  process.exit(1);
});
