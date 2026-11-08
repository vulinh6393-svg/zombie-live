import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const conceptDir = path.join(rootDir, 'public/assets/concept');
const brainDir = 'C:\\Users\\admin\\.gemini\antigravity\\brain\\8f087681-8572-4911-976b-b3062eed932e';

function getBase64DataUri(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  const base64 = fs.readFileSync(filePath).toString('base64');
  return `data:${mime};base64,${base64}`;
}

async function renderGrid() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const masterUri = getBase64DataUri(path.join(conceptDir, 'bastion_master_environment.png'));

  const gridCode = `
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1080, 1920);

      // Semi-transparent overlay for grid lines
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
      ctx.lineWidth = 1;
      ctx.font = '12px monospace';
      ctx.fillStyle = '#00ffcc';

      // Vertical grid lines every 100px
      for (let x = 0; x <= 1080; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1920); ctx.stroke();
        ctx.fillText('X=' + x, x + 4, 20);
        ctx.fillText('X=' + x, x + 4, 1900);
      }

      // Horizontal grid lines every 100px
      for (let y = 0; y <= 1920; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1080, y); ctx.stroke();
        ctx.fillText('Y=' + y, 6, y - 4);
        ctx.fillText('Y=' + y, 1020, y - 4);
      }

      // Stronger lane center lines (X=280, X=540, X=800)
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f59e0b';
      for (const lx of [280, 540, 800]) {
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 1920); ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('LANE ' + (lx === 280 ? 'ALPHA' : lx === 540 ? 'BRAVO' : 'CHARLIE') + ' (X=' + lx + ')', lx - 60, 50);
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = args.masterUri;
  `;

  const dataUrl = await page.evaluate(
    ({ masterUri, gridCode }) => {
      return new Promise<string>((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d')!;
        const fn = new Function('canvas', 'ctx', 'args', 'resolve', 'reject', gridCode);
        fn(canvas, ctx, { masterUri }, resolve, reject);
      });
    },
    { masterUri, gridCode }
  );

  const buffer = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(conceptDir, 'bastion_grid_debug.png'), buffer);
  console.log('Grid debug image rendered: bastion_grid_debug.png');
  await browser.close();
}

renderGrid().catch(console.error);
