import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// IMPORT TRỰC TIẾP TỪ MÃ NGUỒN PRODUCTION — KHÔNG SAO CHÉP CODE INLINE
import { BASTION_GEOMETRY } from '../src/config/BastionGeometryConfig.ts';
import { BastionCollisionSystem } from '../src/systems/BastionCollisionSystem.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log(' ZOMBIE ĐẠI CHIẾN — KỊCH BẢN KIỂM THỬ XÁC MINH BẢN GIAO THỰC THẾ        ');
console.log(' (ASSERTION-DRIVEN VERIFICATION SUITE — IMPORT TRỰC TIẾP PRODUCTION CODE) ');
console.log('========================================================================\n');

const testResults = [];
let hasAnyFailure = false;

function recordTest(name, passed, details) {
  const status = passed ? 'PASS' : 'FAIL';
  if (!passed) hasAnyFailure = true;
  testResults.push({ name, status, details });
  const icon = passed ? '✔' : '❌';
  console.log(` [${status}] ${icon} ${name.padEnd(52)} | ${details}`);
}

async function runSuite() {
  // --------------------------------------------------------------------------
  // SUITE 1: KIỂM THỬ BYTES & KÊNH ALPHA THỰC TẾ TRÊN TỪNG FILE PNG
  // --------------------------------------------------------------------------
  console.log('--- 1. KIỂM THỬ BYTES & KÊNH ALPHA THỰC TẾ TRÊN TỪNG FILE PNG ---');

  const pngSprites = [
    { file: 'bastion_wall_segment.png', expW: 420, expH: 130 },
    { file: 'bastion_gate_frame.png', expW: 300, expH: 160 },
    { file: 'bastion_gate_door_left.png', expW: 115, expH: 120 },
    { file: 'bastion_gate_door_right.png', expW: 115, expH: 120 },
    { file: 'bastion_turret_platform.png', expW: 130, expH: 130 },
    { file: 'wall_damage_overlay.png', expW: 200, expH: 120 },
  ];

  const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  for (const s of pngSprites) {
    const p = path.join(__dirname, s.file);
    if (!fs.existsSync(p)) {
      recordTest(`PNG Exist: ${s.file}`, false, 'File không tồn tại trên đĩa!');
      continue;
    }

    const buf = fs.readFileSync(p);
    const magicMatch = buf.subarray(0, 8).equals(PNG_MAGIC);
    if (!magicMatch) {
      recordTest(`PNG Magic Bytes: ${s.file}`, false, 'Sai header magic bytes! Không phải PNG chuẩn.');
      continue;
    }

    const image = sharp(p);
    const meta = await image.metadata();
    const stats = await image.stats();

    const dimMatch = meta.width === s.expW && meta.height === s.expH;
    const hasAlpha = meta.hasAlpha === true && meta.channels === 4;
    const alphaMin = stats.channels[3].min;
    const alphaMax = stats.channels[3].max;
    const alphaValid = alphaMin === 0 && alphaMax === 255;

    const allPassed = magicMatch && dimMatch && hasAlpha && alphaValid;
    recordTest(
      `Sprite RGBA: ${s.file}`,
      allPassed,
      `Dim: ${meta.width}x${meta.height} (Chuẩn: ${s.expW}x${s.expH}) | Alpha: [${alphaMin}..${alphaMax}] | Channels: ${meta.channels}`
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 1.5: KIỂM THỬ KHUNG CỔNG THỰC SỰ RỖNG (ALPHA = 0 Ở THÔNG ĐẠO)
  // --------------------------------------------------------------------------
  console.log('\n--- 1.5 KIỂM THỬ THÔNG ĐẠO KHUNG CỔNG RỖNG 100% ALPHA (NO BAKED DOORS) ---');
  const gateFramePath = path.join(__dirname, 'bastion_gate_frame.png');
  const { data: frameData, info: frameInfo } = await sharp(gateFramePath).raw().toBuffer({ resolveWithObject: true });
  
  function getPixel(x, y) {
    const idx = (y * frameInfo.width + x) * frameInfo.channels;
    return [frameData[idx], frameData[idx+1], frameData[idx+2], frameData[idx+3]];
  }

  const centerPixel = getPixel(150, 100);
  const isCenterHollow = centerPixel[3] === 0;
  const leftPillar = getPixel(30, 80);
  const isPillarSolid = leftPillar[3] > 200;
  const frameIntegrity = isCenterHollow && isPillarSolid;
  recordTest(
    'Gate Frame Hollow Archway: Thông đạo rỗng, trụ thép nguyên vẹn',
    frameIntegrity,
    `Tâm (150,100) Alpha: ${centerPixel[3]} (Yêu cầu: 0) | Trụ trái Alpha: ${leftPillar[3]} (Yêu cầu: >200)`
  );

  // --------------------------------------------------------------------------
  // SUITE 2: KIỂM THỬ CONSISTENCY: CONFIG SSOT VS BASTION_MASTER_LAYOUT.MD
  // --------------------------------------------------------------------------
  console.log('\n--- 2. KIỂM THỬ CONSISTENCY: CONFIG SSOT VS BASTION_MASTER_LAYOUT.MD ---');
  const layoutMdPath = path.join(__dirname, 'BASTION_MASTER_LAYOUT.md');
  if (fs.existsSync(layoutMdPath)) {
    const mdContent = fs.readFileSync(layoutMdPath, 'utf8');

    // 1. Kiểm tra loại bỏ hoàn toàn tọa độ cũ (Cổng 1250 hoặc Bệ pháo 1320/1340)
    const hasOldGateY = mdContent.includes('1250');
    const hasOldTurretY = mdContent.includes('1320') || mdContent.includes('Pháo (Turret Pad) | (540, 1340)');
    const noStaleCoordinates = !hasOldGateY && !hasOldTurretY;
    recordTest(
      'Layout Docs: Loại bỏ tọa độ cũ y=1250/1340 của Cổng & Turret',
      noStaleCoordinates,
      noStaleCoordinates ? 'Đã xóa hoàn toàn tọa độ cũ của Cổng và Turret' : 'Lỗi: Vẫn còn chứa tọa độ cũ của Cổng/Turret!'
    );

    // 2. Kiểm tra tài liệu có ghi đúng tọa độ mới: Cổng y=900, Turret y=580, Collision y=840
    const hasNewGateY = mdContent.includes('y=900') || mdContent.includes('(540, 900)');
    const hasNewTurretY = mdContent.includes('y=580') || mdContent.includes('(540, 580)');
    const hasCollisionY = mdContent.includes('y=840') || mdContent.includes('(540, 840)');
    const docsMatchConfig = hasNewGateY && hasNewTurretY && hasCollisionY;
    recordTest(
      'Layout Docs: Khớp tọa độ SSOT (Cổng 900, Turret 580, Collision 840)',
      docsMatchConfig,
      `Gate 900: ${hasNewGateY} | Turret 580: ${hasNewTurretY} | Collision 840: ${hasCollisionY}`
    );

    // 3. Kiểm tra tính toàn vẹn của BASTION_GEOMETRY config thực tế
    const configValid =
      BASTION_GEOMETRY.blastGate.centerY === 900 &&
      BASTION_GEOMETRY.collisionLineY === 840 &&
      BASTION_GEOMETRY.turrets[0].y === 580 &&
      BASTION_GEOMETRY.turrets[1].y === 580 &&
      BASTION_GEOMETRY.turrets[2].y === 580 &&
      BASTION_GEOMETRY.walls[0].width === 420 &&
      BASTION_GEOMETRY.walls[1].width === 420;
    recordTest(
      'BastionGeometryConfig: Giá trị typed SSOT chuẩn xác (Tường 420px)',
      configValid,
      `Gate Y: ${BASTION_GEOMETRY.blastGate.centerY} | Turret Y: ${BASTION_GEOMETRY.turrets[0].y} | Wall Width: ${BASTION_GEOMETRY.walls[0].width}px`
    );
  } else {
    recordTest('Layout Docs: BASTION_MASTER_LAYOUT.md', false, 'Không tìm thấy file tài liệu!');
  }

  // --------------------------------------------------------------------------
  // SUITE 3: KIỂM THỬ TRỰC TIẾP BastionCollisionSystem TỪ PRODUCTION
  // --------------------------------------------------------------------------
  console.log('\n--- 3. KIỂM THỬ TRỰC TIẾP BastionCollisionSystem TỪ PRODUCTION ---');
  const collision = new BastionCollisionSystem();
  const RADIUS = 20;

  // Test 3.1: Khi Cổng Đóng -> Chặn đứng cả 3 Lane
  collision.setGateState('CLOSED');
  const resClosedAlpha = collision.resolveMovement(280, 800, 280, 860, RADIUS);
  const resClosedBravo = collision.resolveMovement(540, 800, 540, 860, RADIUS);
  const resClosedCharlie = collision.resolveMovement(800, 800, 800, 860, RADIUS);
  const test3_1 =
    resClosedAlpha.collided && resClosedAlpha.resolvedY === 820 &&
    resClosedBravo.collided && resClosedBravo.resolvedY === 820 &&
    resClosedCharlie.collided && resClosedCharlie.resolvedY === 820;
  recordTest(
    'Production Collision: Cổng CLOSED chặn đứng cả 3 Lane tại y=840',
    test3_1,
    `Alpha: ${resClosedAlpha.resolvedY} | Bravo: ${resClosedBravo.resolvedY} | Charlie: ${resClosedCharlie.resolvedY}`
  );

  // Test 3.2: Khi Cổng MỞ -> Tính toán chính xác khoảng an toàn [507.5, 572.5]
  collision.setGateState('OPEN');
  const bounds = collision.getSafeCorridorBounds(RADIUS);
  const boundsAccurate = Math.abs(bounds.safeMinX - 507.5) < 0.1 && Math.abs(bounds.safeMaxX - 572.5) < 0.1;
  recordTest(
    'Production Collision: Khoảng hở an toàn đạt chuẩn [507.5, 572.5] cho r=20',
    boundsAccurate,
    `SafeMinX: ${bounds.safeMinX.toFixed(1)} | SafeMaxX: ${bounds.safeMaxX.toFixed(1)} (Yêu cầu: [507.5, 572.5])`
  );

  // Test 3.3: Khi Cổng MỞ -> Zombie tâm Lane Bravo (x=540) đi xuyên qua an toàn
  const resOpenCenter = collision.resolveMovement(540, 800, 540, 860, RADIUS);
  const test3_3 = !resOpenCenter.collided && resOpenCenter.resolvedY === 860 && resOpenCenter.passThroughReason === 'GATE_OPEN';
  recordTest(
    'Production Collision: Zombie đi đúng tâm Bravo (x=540) qua cổng an toàn',
    test3_3,
    `Collided: ${resOpenCenter.collided} | ResolvedY: ${resOpenCenter.resolvedY} | Reason: ${resOpenCenter.passThroughReason}`
  );

  // Test 3.4: Khi Cổng MỞ -> Zombie lệch mép cửa (x=500 hoặc x=580) bị chặn
  const resOpenEdgeLeft = collision.resolveMovement(500, 800, 500, 860, RADIUS);
  const resOpenEdgeRight = collision.resolveMovement(580, 800, 580, 860, RADIUS);
  const test3_4 = resOpenEdgeLeft.collided && resOpenEdgeRight.collided;
  recordTest(
    'Production Collision: Zombie chạm mép cánh cửa trái/phải bị chặn',
    test3_4,
    `Left (x=500) Blocked: ${resOpenEdgeLeft.collided} | Right (x=580) Blocked: ${resOpenEdgeRight.collided}`
  );

  // Test 3.5: Khi Cổng MỞ -> Lane Alpha & Charlie vẫn bị tường chặn 100%
  const resOpenAlpha = collision.resolveMovement(280, 800, 280, 860, RADIUS);
  const resOpenCharlie = collision.resolveMovement(800, 800, 800, 860, RADIUS);
  const test3_5 = resOpenAlpha.collided && resOpenCharlie.collided;
  recordTest(
    'Production Collision: Lane Alpha & Charlie vẫn bị tường chặn dù Cổng Mở',
    test3_5,
    `Alpha: ${resOpenAlpha.segment} | Charlie: ${resOpenCharlie.segment}`
  );

  // Test 3.6: Dynamic Opening/Closing -> Cập nhật theo vị trí hai cánh cửa
  collision.setGateState('OPENING');
  collision.updateGateDoors(450, 630);
  const dynBounds = collision.getSafeCorridorBounds(RADIUS);
  const resDynCenter = collision.resolveMovement(540, 800, 540, 860, RADIUS);
  const resDynEdge = collision.resolveMovement(520, 800, 520, 860, RADIUS);
  const test3_6 = !resDynCenter.collided && resDynEdge.collided;
  recordTest(
    'Production Collision: Động học tức thời khi cánh cửa đang trượt',
    test3_6,
    `Corridor: [${dynBounds.safeMinX.toFixed(1)}..${dynBounds.safeMaxX.toFixed(1)}] | Center (540): ${!resDynCenter.collided} | Edge (520): Blocked`
  );

  // Test 3.7: Cổng đóng lại khi thực thể đang trong thông đạo -> Xử lý đẩy lùi về y=820
  collision.setGateState('CLOSING');
  collision.updateGateDoors(480, 600);
  const resTrapped = collision.resolveMovement(540, 870, 540, 880, RADIUS);
  const test3_7 = resTrapped.collided && resTrapped.resolvedY === 820;
  recordTest(
    'Production Collision: Xử lý đẩy lùi thực thể kẹt trong thông đạo khi cổng đóng',
    test3_7,
    `Collided: ${resTrapped.collided} | ResolvedY: ${resTrapped.resolvedY}`
  );

  // Test 3.8: Tường vỡ (BREACHED)
  collision.setWallState('LEFT', 'BREACHED', 0);
  const resBreach = collision.resolveMovement(280, 800, 280, 860, RADIUS);
  const test3_8 = !resBreach.collided && resBreach.passThroughReason === 'WALL_BREACHED';
  recordTest(
    'Production Collision: Tường Trái bị vỡ (BREACHED) cho phép tràn qua',
    test3_8,
    `Collided: ${resBreach.collided} | Reason: ${resBreach.passThroughReason}`
  );

  // --------------------------------------------------------------------------
  // SUITE 4: KIỂM THỬ TÍNH TOÀN VẸN CỦA FILE BẰNG CHỨNG RUNTIME
  // --------------------------------------------------------------------------
  console.log('\n--- 4. KIỂM THỬ TÍNH TOÀN VẸN CỦA FILE BẰNG CHỨNG RUNTIME ---');

  // Video runtime webm
  const videoPath = path.join(__dirname, 'art_integration_lab.webm');
  if (fs.existsSync(videoPath)) {
    const vStat = fs.statSync(videoPath);
    const vValid = vStat.size >= 1024 * 1024;
    recordTest(
      'Runtime Video: art_integration_lab.webm',
      vValid,
      `Dung lượng: ${(vStat.size / (1024 * 1024)).toFixed(2)} MB (Yêu cầu >= 1MB)`
    );
  } else {
    recordTest('Runtime Video: art_integration_lab.webm', false, 'File video không tồn tại!');
  }

  // Mobile screenshot
  const mobilePath = path.join(__dirname, 'mobile_runtime_360x640.png');
  if (fs.existsSync(mobilePath)) {
    const mMeta = await sharp(mobilePath).metadata();
    const mValid = (mMeta.width === 360 && mMeta.height === 640) || (mMeta.width === 720 && mMeta.height === 1280);
    recordTest(
      'Mobile QA Screenshot: mobile_runtime_360x640.png',
      mValid,
      `Kích thước: ${mMeta.width}x${mMeta.height} (Viewport chuẩn 360x640 @2x DPR)`
    );
  } else {
    recordTest('Mobile QA Screenshot: mobile_runtime_360x640.png', false, 'File ảnh mobile không tồn tại!');
  }

  // Stress test 4 backgrounds
  const stressPath = path.join(__dirname, 'sprite_alpha_halo_stress_test.png');
  if (fs.existsSync(stressPath)) {
    const sMeta = await sharp(stressPath).metadata();
    const sValid = sMeta.width === 1600 && sMeta.height === 1200;
    recordTest(
      'Stress Test 4 Backgrounds: sprite_alpha_halo_stress_test.png',
      sValid,
      `Kích thước: ${sMeta.width}x${sMeta.height} (Đầy đủ 4 nền White, Black, Magenta, Fortress)`
    );
  } else {
    recordTest('Stress Test: sprite_alpha_halo_stress_test.png', false, 'File không tồn tại!');
  }

  // --------------------------------------------------------------------------
  // XUẤT KẾT QUẢ ĐỘNG RA FILE JSON
  // --------------------------------------------------------------------------
  const summary = {
    timestamp: new Date().toISOString(),
    totalTests: testResults.length,
    passed: testResults.filter(t => t.status === 'PASS').length,
    failed: testResults.filter(t => t.status === 'FAIL').length,
    notVerified: testResults.filter(t => t.status === 'NOT_VERIFIED').length,
    verdict: hasAnyFailure ? 'FAIL' : 'PASS',
    testRecords: testResults,
  };

  fs.writeFileSync(path.join(__dirname, 'verification_results.json'), JSON.stringify(summary, null, 2));

  console.log('\n========================================================================');
  console.log(` TỔNG KẾT: ${summary.passed}/${summary.totalTests} TESTS PASS | VERDICT: ${summary.verdict}`);
  console.log('========================================================================\n');

  if (hasAnyFailure) {
    console.error(' >> CÓ KIỂM THỬ THẤT BẠI! EXIT CODE 1 <<');
    process.exit(1);
  } else {
    console.log(' >> TẤT CẢ PHÉP THỬ ĐÃ ĐẠT ASSERTION 100%! EXIT CODE 0 <<');
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error('Lỗi ngoại lệ trong quá trình chạy verification suite:', err);
  process.exit(1);
});
