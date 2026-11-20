import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const OUT_DIR = path.resolve('artifacts/gameplay-polish-review/zombie-sprite-preview');
const BRAIN_DIR = path.resolve('C:/Users/admin/.gemini/antigravity/brain/8f087681-8572-4911-976b-b3062eed932e/zombie-sprite-preview');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

// Read the base walker sprite as base64
const walkerPath = path.resolve('apps/game-client/public/assets/characters/zombie/move/move_0.png');
let walkerBase64 = '';
if (fs.existsSync(walkerPath)) {
  walkerBase64 = `data:image/png;base64,${fs.readFileSync(walkerPath).toString('base64')}`;
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  // 1. Generate Full Infographic Comparison (1920x1080)
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 20%, #0d1527 0%, #050811 100%);
      color: #e2e8f0;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      padding: 40px 60px;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .title-group h1 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #00f5d4;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-preview {
      background: rgba(247, 37, 133, 0.2);
      border: 1px solid #f72585;
      color: #f72585;
      font-size: 14px;
      padding: 4px 12px;
      border-radius: 999px;
      font-weight: 700;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 16px;
      margin-top: 6px;
    }
    .meta-tag {
      background: #0f172a;
      border: 1px solid #334155;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      color: #38bdf8;
      font-weight: 600;
    }

    .main-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      height: calc(100% - 150px);
    }

    .card {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      position: relative;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .card.walker { border-color: #4ade80; }
    .card.runner { border-color: #f43f5e; }
    .card.tank { border-color: #fbbf24; }
    .card.boss { border-color: #c084fc; }

    .card-title {
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card.walker .card-title { color: #4ade80; }
    .card.runner .card-title { color: #f43f5e; }
    .card.tank .card-title { color: #fbbf24; }
    .card.boss .card-title { color: #c084fc; }

    .card-subtitle {
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .visual-viewport {
      background: #070b14;
      border: 1px dashed #334155;
      border-radius: 10px;
      height: 340px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .grid-lines {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 20px 20px;
    }

    .sprite-box {
      z-index: 2;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .specs-list {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 13px;
    }
    .spec-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding-bottom: 6px;
    }
    .spec-label { color: #94a3b8; }
    .spec-val { font-weight: 700; color: #f1f5f9; }

    .silhouette-preview {
      margin-top: 10px;
      padding: 10px;
      background: rgba(0,0,0,0.4);
      border-radius: 8px;
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-group">
      <h1>🧟 Zombie Archetype Diversity & Silhouette Spec</h1>
      <span class="badge-preview">RESEARCH & PREVIEW ONLY</span>
    </div>
    <div class="meta-tag">
      Target: 1080×1920 Native Canvas • 360×640 Mobile Viewport
    </div>
  </div>

  <div class="main-grid">
    <!-- Walker -->
    <div class="card walker">
      <div class="card-title">
        <span>WALKER</span>
        <span style="font-size:14px;">1.0x Scale</span>
      </div>
      <div class="card-subtitle">Bộ Hành Cơ Bản (Swarm Fodder)</div>
      <div class="visual-viewport">
        <div class="grid-lines"></div>
        <div class="sprite-box">
          <img src="${walkerBase64}" style="width: 84px; height: 96px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(74, 222, 128, 0.4));" />
        </div>
      </div>
      <div class="specs-list">
        <div class="spec-row"><span class="spec-label">Máu cơ bản (HP):</span><span class="spec-val">100 HP</span></div>
        <div class="spec-row"><span class="spec-label">Tốc độ hành quân:</span><span class="spec-val">35 px/s</span></div>
        <div class="spec-row"><span class="spec-label">Kích thước Canvas (1080):</span><span class="spec-val">84 × 96 px</span></div>
        <div class="spec-row"><span class="spec-label">Kích thước Mobile (360):</span><span class="spec-val">28 × 32 px</span></div>
        <div class="spec-row"><span class="spec-label">Asset Nguồn:</span><span class="spec-val">Riley Gombart CC0</span></div>
      </div>
      <div class="silhouette-preview">
        <strong>Dáng hình:</strong> Đi lảo đảo hai chân, hai tay giơ thẳng phía trước, quần áo rách rưới thị dân.
      </div>
    </div>

    <!-- Runner -->
    <div class="card runner">
      <div class="card-title">
        <span>RUNNER</span>
        <span style="font-size:14px;">0.85x Scale</span>
      </div>
      <div class="card-subtitle">Cuồng Nộ Tốc Độ (Flanker)</div>
      <div class="visual-viewport">
        <div class="grid-lines"></div>
        <div class="sprite-box">
          <!-- Vector silhouette simulation of low feral quadruped -->
          <svg width="70" height="90" viewBox="0 0 70 90" style="filter: drop-shadow(0 0 12px rgba(244, 63, 94, 0.6));">
            <ellipse cx="35" cy="55" rx="20" ry="26" fill="#881337" />
            <circle cx="35" cy="24" r="14" fill="#9f1239" />
            <!-- Glowing red eyes -->
            <circle cx="31" cy="21" r="2.5" fill="#ef4444" />
            <circle cx="39" cy="21" r="2.5" fill="#ef4444" />
            <!-- Feral crawling claws -->
            <path d="M18 45 L5 25 L10 20 L25 40 Z" fill="#881337" />
            <path d="M52 45 L65 25 L60 20 L45 40 Z" fill="#881337" />
            <path d="M22 70 L8 85 L14 88 L28 72 Z" fill="#4c0519" />
            <path d="M48 70 L62 85 L56 88 L42 72 Z" fill="#4c0519" />
            <!-- Spine spikes -->
            <path d="M35 38 L32 46 L38 46 Z" fill="#f43f5e" />
            <path d="M35 50 L32 58 L38 58 Z" fill="#f43f5e" />
          </svg>
        </div>
      </div>
      <div class="specs-list">
        <div class="spec-row"><span class="spec-label">Máu cơ bản (HP):</span><span class="spec-val">60 HP</span></div>
        <div class="spec-row"><span class="spec-label">Tốc độ hành quân:</span><span class="spec-val">85 px/s (Nhanh gấp 2.4x)</span></div>
        <div class="spec-row"><span class="spec-label">Kích thước Canvas (1080):</span><span class="spec-val">64 × 88 px</span></div>
        <div class="spec-row"><span class="spec-label">Kích thước Mobile (360):</span><span class="spec-val">21 × 29 px</span></div>
        <div class="spec-row"><span class="spec-label">Hoạt ảnh dự kiến:</span><span class="spec-val">Chạy bò 4 chân 24 FPS</span></div>
      </div>
      <div class="silhouette-preview">
        <strong>Dáng hình:</strong> Khom rạp sát đất, tứ chi cào đường nhựa, vệt gân đỏ phát sáng rực rỡ.
      </div>
    </div>

    <!-- Tank -->
    <div class="card tank">
      <div class="card-title">
        <span>TANK / BRUTE</span>
        <span style="font-size:14px;">1.45x Scale</span>
      </div>
      <div class="card-subtitle">Đột Biến Hộ Pháp (Breacher)</div>
      <div class="visual-viewport">
        <div class="grid-lines"></div>
        <div class="sprite-box">
          <!-- Vector silhouette simulation of heavy brute -->
          <svg width="130" height="130" viewBox="0 0 130 130" style="filter: drop-shadow(0 0 14px rgba(251, 191, 36, 0.5));">
            <!-- Massive torso -->
            <path d="M35 45 C35 30 95 30 95 45 C105 75 95 105 65 110 C35 105 25 75 35 45 Z" fill="#365314" />
            <!-- Bone carapace on shoulders -->
            <ellipse cx="65" cy="55" rx="36" ry="24" fill="#475569" stroke="#cbd5e1" stroke-width="2" />
            <!-- Head sunken in shoulders -->
            <circle cx="65" cy="38" r="16" fill="#1e293b" />
            <circle cx="60" cy="36" r="2.5" fill="#facc15" />
            <circle cx="70" cy="36" r="2.5" fill="#facc15" />
            <!-- Huge tree-trunk arms -->
            <ellipse cx="22" cy="70" rx="16" ry="28" fill="#14532d" />
            <ellipse cx="108" cy="70" rx="16" ry="28" fill="#14532d" />
            <!-- Bone spikes -->
            <polygon points="65,30 61,42 69,42" fill="#e2e8f0" />
            <polygon points="50,38 46,50 54,50" fill="#e2e8f0" />
            <polygon points="80,38 76,50 84,50" fill="#e2e8f0" />
          </svg>
        </div>
      </div>
      <div class="specs-list">
        <div class="spec-row"><span class="spec-label">Máu cơ bản (HP):</span><span class="spec-val">450 HP (Trâu gấp 4.5x)</span></div>
        <div class="spec-row"><span class="spec-label">Tốc độ hành quân:</span><span class="spec-val">22 px/s (Chậm chắc)</span></div>
        <div class="spec-row"><span class="spec-label">Kích thước Canvas (1080):</span><span class="spec-val">142 × 136 px</span></div>
        <div class="spec-row"><span class="spec-label">Kích thước Mobile (360):</span><span class="spec-val">47 × 45 px</span></div>
        <div class="spec-row"><span class="spec-label">Hoạt ảnh dự kiến:</span><span class="spec-val">Bước nện đất, đấm 2 tay</span></div>
      </div>
      <div class="silhouette-preview">
        <strong>Dáng hình:</strong> Vai u thịt bắp khổng lồ, giáp gai xương nhô khỏi sống lưng, cánh tay to bằng cột nhà.
      </div>
    </div>

    <!-- Boss -->
    <div class="card boss">
      <div class="card-title">
        <span>ZOMBIE KING</span>
        <span style="font-size:14px;">1.85x Scale</span>
      </div>
      <div class="card-subtitle">Chúa Tể Thành Trì (Raid Climax)</div>
      <div class="visual-viewport">
        <div class="grid-lines"></div>
        <div class="sprite-box">
          <!-- Vector silhouette simulation of Boss King -->
          <svg width="160" height="160" viewBox="0 0 160 160" style="filter: drop-shadow(0 0 18px rgba(192, 132, 252, 0.7));">
            <!-- Aura circle -->
            <circle cx="80" cy="80" r="72" fill="none" stroke="#a855f7" stroke-width="2" stroke-dasharray="8 4" opacity="0.6" />
            <!-- Armored Body -->
            <polygon points="80,35 120,60 110,120 50,120 40,60" fill="#0f172a" stroke="#6b21a8" stroke-width="2" />
            <!-- Skull horned crest -->
            <circle cx="80" cy="48" r="20" fill="#18181b" />
            <!-- Crown horns -->
            <polygon points="65,30 70,45 60,45" fill="#a855f7" />
            <polygon points="95,30 90,45 100,45" fill="#a855f7" />
            <polygon points="80,22 75,40 85,40" fill="#c084fc" />
            <!-- Glowing Void Core -->
            <circle cx="80" cy="78" r="12" fill="#c084fc" />
            <circle cx="80" cy="78" r="6" fill="#ffffff" />
            <!-- Giant Cleaver weapon in right hand -->
            <rect x="122" y="20" width="12" height="110" fill="#64748b" transform="rotate(15 122 20)" />
            <polygon points="122,20 148,40 135,90 120,80" fill="#94a3b8" />
          </svg>
        </div>
      </div>
      <div class="specs-list">
        <div class="spec-row"><span class="spec-label">Máu cơ bản (HP):</span><span class="spec-val">2,500 HP</span></div>
        <div class="spec-row"><span class="spec-label">Tốc độ hành quân:</span><span class="spec-val">18 px/s</span></div>
        <div class="spec-row"><span class="spec-label">Kích thước Canvas (1080):</span><span class="spec-val">185 × 180 px</span></div>
        <div class="spec-row"><span class="spec-label">Kích thước Mobile (360):</span><span class="spec-val">62 × 60 px</span></div>
        <div class="spec-row"><span class="spec-label">Kỹ năng đặc biệt:</span><span class="spec-val">Gầm triệu hồi + Đại đao chém cổng</span></div>
      </div>
      <div class="silhouette-preview">
        <strong>Dáng hình:</strong> Thân hình hộ pháp bọc giáp gai, cầm đại đao thanh ray xe lửa, lõi hư vô tím sáng rực.
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(htmlContent);
  await page.waitForTimeout(500);

  const previewPngPath = path.join(OUT_DIR, 'zombie_diversity_preview.png');
  await page.screenshot({ path: previewPngPath, fullPage: true });
  fs.copyFileSync(previewPngPath, path.join(BRAIN_DIR, 'zombie_diversity_preview.png'));
  console.log(`[TASK 2] Generated: ${previewPngPath}`);

  // 2. Generate Silhouette Comparison (1200x500)
  const silPage = await browser.newPage({ viewport: { width: 1200, height: 500 } });
  const silContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #020617;
      color: #fff;
      font-family: sans-serif;
      padding: 30px;
      width: 1200px;
      height: 500px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    h2 { color: #38bdf8; font-size: 24px; margin-bottom: 8px; text-transform: uppercase; }
    p { color: #94a3b8; font-size: 14px; margin-bottom: 30px; }
    .sil-row {
      display: flex;
      gap: 50px;
      align-items: flex-end;
      height: 320px;
      background: rgba(255,255,255,0.02);
      border-bottom: 3px solid #334155;
      padding: 0 60px 20px 60px;
      border-radius: 8px;
    }
    .sil-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .sil-label {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <h2>Silhouette Contrast & Recognition at Distance</h2>
  <p>Độ tương phản bóng đổ giúp người xem TikTok LIVE phân biệt quái ngay trên màn hình nhỏ mà không cần đọc chữ</p>
  <div class="sil-row">
    <div class="sil-item">
      <svg width="60" height="80" viewBox="0 0 70 90">
        <ellipse cx="35" cy="55" rx="20" ry="26" fill="#fff" />
        <circle cx="35" cy="24" r="14" fill="#fff" />
        <path d="M18 45 L5 25 L10 20 L25 40 Z" fill="#fff" />
        <path d="M52 45 L65 25 L60 20 L45 40 Z" fill="#fff" />
        <path d="M22 70 L8 85 L14 88 L28 72 Z" fill="#fff" />
        <path d="M48 70 L62 85 L56 88 L42 72 Z" fill="#fff" />
      </svg>
      <div class="sil-label" style="color: #f43f5e;">RUNNER (21×29px)</div>
    </div>

    <div class="sil-item">
      <svg width="75" height="100" viewBox="0 0 84 96">
        <ellipse cx="42" cy="55" rx="22" ry="30" fill="#fff" />
        <circle cx="42" cy="24" r="16" fill="#fff" />
        <rect x="18" y="25" width="12" height="40" rx="6" fill="#fff" transform="rotate(-15 18 25)" />
        <rect x="54" y="25" width="12" height="40" rx="6" fill="#fff" transform="rotate(15 54 25)" />
        <rect x="28" y="65" width="10" height="28" rx="4" fill="#fff" />
        <rect x="46" y="65" width="10" height="28" rx="4" fill="#fff" />
      </svg>
      <div class="sil-label" style="color: #4ade80;">WALKER (28×32px)</div>
    </div>

    <div class="sil-item">
      <svg width="120" height="130" viewBox="0 0 130 130">
        <path d="M35 45 C35 30 95 30 95 45 C105 75 95 105 65 110 C35 105 25 75 35 45 Z" fill="#fff" />
        <ellipse cx="65" cy="55" rx="36" ry="24" fill="#fff" />
        <circle cx="65" cy="38" r="16" fill="#fff" />
        <ellipse cx="22" cy="70" rx="16" ry="28" fill="#fff" />
        <ellipse cx="108" cy="70" rx="16" ry="28" fill="#fff" />
      </svg>
      <div class="sil-label" style="color: #fbbf24;">TANK / BRUTE (47×45px)</div>
    </div>

    <div class="sil-item">
      <svg width="150" height="160" viewBox="0 0 160 160">
        <polygon points="80,35 120,60 110,120 50,120 40,60" fill="#fff" />
        <circle cx="80" cy="48" r="20" fill="#fff" />
        <polygon points="65,30 70,45 60,45" fill="#fff" />
        <polygon points="95,30 90,45 100,45" fill="#fff" />
        <polygon points="80,22 75,40 85,40" fill="#fff" />
        <rect x="122" y="20" width="12" height="110" fill="#fff" transform="rotate(15 122 20)" />
        <polygon points="122,20 148,40 135,90 120,80" fill="#fff" />
      </svg>
      <div class="sil-label" style="color: #c084fc;">ZOMBIE KING (62×60px)</div>
    </div>
  </div>
</body>
</html>
  `;
  await silPage.setContent(silContent);
  await silPage.waitForTimeout(300);
  const silPngPath = path.join(OUT_DIR, 'silhouette_comparison.png');
  await silPage.screenshot({ path: silPngPath });
  fs.copyFileSync(silPngPath, path.join(BRAIN_DIR, 'silhouette_comparison.png'));
  console.log(`[TASK 2] Generated: ${silPngPath}`);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
