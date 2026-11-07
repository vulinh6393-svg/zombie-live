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

async function processConceptImages() {
  console.log('=== CHUẨN HÓA VÀ XUẤT ẢNH CONCEPT ART (ART APPROVAL GATE) ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const rawFortressPath = path.join(brainDir, 'fortified_bastion_concept_1794068563934.jpg');
  const rawCombatPath = path.join(brainDir, 'bastion_combat_scene_1794068573355.jpg');

  async function resizeAndSave(srcPath: string, targetNames: string[], width: number, height: number) {
    const imgBase64 = fs.readFileSync(srcPath).toString('base64');
    const mime = srcPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUri = `data:${mime};base64,${imgBase64}`;

    const pngBase64 = await page.evaluate(
      ({ dataUri, width, height }) => {
        return new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            // Cover/Fill canvas
            ctx.drawImage(img, 0, 0, width, height);
            const data = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
            resolve(data);
          };
          img.onerror = reject;
          img.src = dataUri;
        });
      },
      { dataUri, width, height }
    );

    const buffer = Buffer.from(pngBase64, 'base64');
    for (const name of targetNames) {
      const publicPath = path.join(conceptDir, name);
      const brainPath = path.join(brainDir, name);
      fs.writeFileSync(publicPath, buffer);
      fs.writeFileSync(brainPath, buffer);
      console.log(` - Đã lưu: ${name} (${width}x${height}px, ${buffer.length} bytes)`);
    }
  }

  // 1. Fortress Bastion Concept
  await resizeAndSave(
    rawFortressPath,
    ['fortress_concept_bastion_1080x1920.png'],
    1080,
    1920
  );
  await resizeAndSave(
    rawFortressPath,
    ['fortress_concept_bastion_360x640.png'],
    360,
    640
  );

  // 2. Full Combat Bastion Concept
  await resizeAndSave(
    rawCombatPath,
    ['combat_concept_bastion_1080x1920.png'],
    1080,
    1920
  );
  await resizeAndSave(
    rawCombatPath,
    ['combat_concept_bastion_360x640.png'],
    360,
    640
  );

  await browser.close();
  console.log('=== HOÀN TẤT XUẤT ẢNH CONCEPT ART ===');
}

processConceptImages().catch((err) => {
  console.error('Lỗi xuất concept:', err);
  process.exit(1);
});
