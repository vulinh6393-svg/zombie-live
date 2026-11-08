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
  console.log(' - Bắt đầu quay video Phaser WebGL tại /art-integration-lab (18s)...');
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
  console.log(' - Canvas đã hiển thị, đang ghi hình 18 giây chu trình 4 trạng thái...');

  // Record for 18 seconds to capture full 4-phase cycle:
  // Phase 0: Gate Closed (4s)
  // Phase 1: Gate Opens & Soldier moves behind wall (4s)
  // Phase 2: Gate Damaged & Wall crack overlay (4s)
  // Phase 3: Turret 360 rotation & Reset (4s)
  await page.waitForTimeout(18000);

  // Close context to save video
  await videoContext.close();

  // Find the generated video file
  const videoFiles = fs.readdirSync(tempVideoDir).filter(f => f.endsWith('.webm'));
  if (videoFiles.length > 0) {
    const latestVideo = path.join(tempVideoDir, videoFiles[videoFiles.length - 1]);
    const videoBuffer = fs.readFileSync(latestVideo);

    const targetNames = ['art_integration_lab.webm'];
    for (const name of targetNames) {
      fs.writeFileSync(path.join(conceptDir, name), videoBuffer);
      fs.writeFileSync(path.join(finalDir, name), videoBuffer);
      fs.writeFileSync(path.join(brainDir, name), videoBuffer);
      console.log(` [VIDEO] Đã lưu ${name} (${videoBuffer.length} bytes, duration: ~18s)`);
    }
  }

  // 2. CAPTURE REAL MOBILE VIEWPORT RUNTIME SCREENSHOT (360 x 640)
  console.log(' - Chụp ảnh runtime Playwright ở viewport thật 360x640...');
  const mobileContext = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
    isMobile: true,
  });

  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/art-integration-lab', { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('canvas');
  await mobilePage.waitForTimeout(3000); // Wait 3s into the scene

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
