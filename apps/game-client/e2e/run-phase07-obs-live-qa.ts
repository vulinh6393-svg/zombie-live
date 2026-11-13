import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync, ChildProcess } from 'child_process';
import { AdminClient } from '@zombie-live/admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(clientDir, '../..');
const screenshotsDir = path.join(clientDir, 'screenshots');
const recordingsDir = path.join(clientDir, 'recordings');
const brainDir = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\8f087681-8572-4911-976b-b3062eed932e';

if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true });

interface CriteriaResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
  metric?: any;
}

const adminToken = process.env.ADMIN_SECRET_KEY || 'phase07_production_live_ops_admin_token_2026';
const TEST_SERVER_PORT = 3011; // P1.3: Isolated test server port to prevent collision and preserve foreign processes
const testDbDir = path.resolve(repoRoot, '.data/qa_phase07_isolated_' + Date.now());

let serverProc: ChildProcess | null = null;
let clientProc: ChildProcess | null = null;

function killProcessTree(pid?: number) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch {}
}

function spawnGameServer(): ChildProcess {
  console.log(` [SPAWN] Khởi động game-server Authoritative trên cổng độc lập ${TEST_SERVER_PORT}...`);
  const proc = spawn('node', ['apps/game-server/dist/index.js'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: TEST_SERVER_PORT.toString(),
      ADMIN_SECRET_KEY: adminToken,
      ENABLE_MOCK_DASHBOARD: 'true',
      DB_DATA_DIR: testDbDir,
    },
    stdio: 'pipe',
  });
  proc.stdout?.on('data', (d) => process.stdout.write(d));
  proc.stderr?.on('data', (d) => process.stderr.write(d));
  proc.on('error', (err) => console.error('[PROC ERROR]', err));
  proc.on('exit', (code, sig) => console.log(`[PROC EXIT] code=${code}, sig=${sig}`));
  return proc;
}

async function waitForServerHealthy(timeoutMs = 25000): Promise<boolean> {
  const start = Date.now();
  let lastErr = '';
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${TEST_SERVER_PORT}/health`);
      if (res.ok) return true;
    } catch (e: any) {
      lastErr = e.message;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error(` [WAIT TIMEOUT] lastErr: ${lastErr}`);
  return false;
}

async function ensureServersRunning() {
  serverProc = spawnGameServer();
  const serverUp = await waitForServerHealthy();
  if (!serverUp) {
    throw new Error(`FATAL: Không thể khởi động game-server trên cổng ${TEST_SERVER_PORT}`);
  }
  console.log(' [OK] Game-server đã sẵn sàng.');

  let clientUp = false;
  try {
    const res = await fetch('http://localhost:5174');
    const txt = await res.text();
    if (res.ok && txt.includes('Zombie')) clientUp = true;
  } catch {}

  if (!clientUp) {
    console.log(' [START] Khởi động game-client preview trên cổng 5174...');
    clientProc = spawn('npx', ['vite', 'preview', '--port', '5174', '--strictPort'], {
      cwd: clientDir,
      stdio: 'pipe',
      shell: true,
    });
    clientProc.stdout?.pipe(process.stdout);
    clientProc.stderr?.pipe(process.stderr);

    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const res = await fetch('http://localhost:5174');
        const txt = await res.text();
        if (res.ok && txt.includes('Zombie')) {
          console.log(' [OK] Game-client preview đã sẵn sàng.');
          clientUp = true;
          break;
        }
      } catch {}
    }
  }
}

async function runPhase07OpsLiveQA() {
  console.log('================================================================');
  console.log(' ZOMBIE ĐẠI CHIẾN — PHASE 07.2 FINAL CRITICAL FIXES & QA GATE');
  console.log('================================================================');

  await ensureServersRunning();

  const results: CriteriaResult[] = [];
  const adminClient = new AdminClient({
    serverUrl: `http://127.0.0.1:${TEST_SERVER_PORT}`,
    adminToken,
  });

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=default',
      '--no-sandbox',
    ],
  });

  const recordPath = path.join(recordingsDir, 'phase07_obs_gameplay_60s.webm');
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: recordingsDir,
      size: { width: 1080, height: 1920 },
    },
  });

  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    console.log(` [BROWSER ${msg.type()}]`, msg.text());
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    console.error(` [BROWSER PAGEERROR]`, err.message);
    consoleErrors.push(err.message);
  });

  // -------------------------------------------------------------------------
  // CRITERIA 1: OBS BROWSER SOURCE ROUTE (/overlay) CLEANLINESS & RESOLUTION
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 1] OBS Browser Source Overlay Route Inspection ---');
  await page.goto(`http://localhost:5174/overlay?server=http://127.0.0.1:${TEST_SERVER_PORT}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  // Wait for canvas and snapshot reception via QA introspection
  await page.waitForFunction(() => {
    return (window as any).__BATTLEFIELD_QA__?.hasReceivedSnapshot() === true;
  }, { timeout: 20000 });

  const pageTitle = await page.title();
  const hasDevOverlay = await page.$('.dev-overlay, .admin-panel, #debug-panel, .debug-stats');
  const canvasElement = await page.$('#game-container canvas');
  const canvasBox = canvasElement ? await canvasElement.boundingBox() : null;
  const initialSocketStatus = await page.evaluate(() => (window as any).__BATTLEFIELD_QA__.getSocketStatus());

  // Also check mobile 360x640 preview isolation
  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 360, height: 640 });
  await mobilePage.goto(`http://localhost:5174/overlay?server=http://127.0.0.1:${TEST_SERVER_PORT}`, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForFunction(() => (window as any).__BATTLEFIELD_QA__?.hasReceivedSnapshot() === true, { timeout: 20000 });
  const screenshot360Path = path.join(screenshotsDir, 'phase07_obs_mobile_360x640.png');
  await mobilePage.screenshot({ path: screenshot360Path });
  await mobilePage.close();

  const isOverlayClean =
    !hasDevOverlay &&
    consoleErrors.length === 0 &&
    canvasBox !== null &&
    initialSocketStatus.connected === true &&
    initialSocketStatus.snapshotCount > 0;

  results.push({
    id: 'CRIT_1_OBS_OVERLAY_CLEANLINESS',
    name: 'OBS Browser Source Route (/overlay) 1080x1920 Cleanliness & Live Snapshot',
    status: isOverlayClean ? 'PASS' : 'FAIL',
    details: isOverlayClean
      ? `Canvas=${canvasBox?.width}x${canvasBox?.height}, SnapshotCount=${initialSocketStatus.snapshotCount}, 0 debug controls, 0 console errors.`
      : `Failed: Debug panels present, disconnected, or errors: ${consoleErrors.join('; ')}`,
    metric: { pageTitle, canvasBox, initialSocketStatus, consoleErrorCount: consoleErrors.length },
  });
  console.log(`[CRIT_1] ${isOverlayClean ? 'PASS' : 'FAIL'} - ${pageTitle}`);

  // -------------------------------------------------------------------------
  // CRITERIA 2: ADMIN LIVE OPERATIONS CONTROLS & RBAC (Pause, Resume, Gate, Reset)
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 2] Admin Operations Controls & RBAC Verification ---');
  let adminControlsPass = true;
  const adminDetails: string[] = [];

  // 1. Guest access to /admin must be rejected with 401
  const guestAdminRes = await fetch(`http://127.0.0.1:${TEST_SERVER_PORT}/admin`);
  if (guestAdminRes.status !== 401) {
    adminControlsPass = false;
    adminDetails.push(`Guest /admin returned ${guestAdminRes.status} instead of 401`);
  } else {
    adminDetails.push('Guest /admin blocked with 401');
  }

  // 2. Pause
  const pauseRes = await adminClient.pauseSimulation('QA Pause Test');
  adminDetails.push(`Pause=${pauseRes.isPaused}`);
  if (!pauseRes.isPaused) adminControlsPass = false;

  await page.waitForTimeout(1000);
  const monPaused = await adminClient.getMonitoring();
  adminDetails.push(`MonitoringIsPaused=${monPaused.engine.isPaused}`);
  if (!monPaused.engine.isPaused) adminControlsPass = false;

  // 3. Resume
  const resumeRes = await adminClient.resumeSimulation();
  adminDetails.push(`ResumeIsPaused=${resumeRes.isPaused}`);
  if (resumeRes.isPaused) adminControlsPass = false;

  // 4. Gate Control
  const gateRes = await adminClient.controlGate('OPEN');
  adminDetails.push(`GateAction=${gateRes.gateState}`);

  // 5. Emergency Reset
  const resetRes = await adminClient.emergencyReset('QA Emergency Reset');
  adminDetails.push(`ResetBaseHp=${resetRes.baseHp},Phase=${resetRes.phase}`);
  if (resetRes.phase !== 'PREPARING' || resetRes.baseHp !== 10000) adminControlsPass = false;

  results.push({
    id: 'CRIT_2_ADMIN_OPERATIONS_CONTROLS',
    name: 'Authoritative Admin Operations, RBAC Session Protection & Emergency Reset',
    status: adminControlsPass ? 'PASS' : 'FAIL',
    details: adminDetails.join(' | '),
    metric: { pauseRes, resumeRes, gateRes, resetRes, guestStatus: guestAdminRes.status },
  });
  console.log(`[CRIT_2] ${adminControlsPass ? 'PASS' : 'FAIL'} - ${adminDetails.join(' | ')}`);

  // -------------------------------------------------------------------------
  // CRITERIA 3: OBS REAL AUTO-RECONNECT (Kill & Restart Server Process)
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 3] Real OBS Auto-Reconnect & Resync (Killing & Restarting Server) ---');
  const statusBefore = await page.evaluate(() => (window as any).__BATTLEFIELD_QA__.getSocketStatus());
  console.log(` [STATUS BEFORE KILL] Connected=${statusBefore.connected}, Match=${statusBefore.matchId}, Snapshots=${statusBefore.snapshotCount}`);

  // Kill game-server process
  console.log(' [KILL] Tắt tiến trình game-server...');
  killProcessTree(serverProc?.pid);
  serverProc = null;

  // Wait for client in Chromium context to recognize disconnection
  let sawDisconnect = false;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(300);
    const s = await page.evaluate(() => (window as any).__BATTLEFIELD_QA__.getSocketStatus());
    if (!s.connected) {
      sawDisconnect = true;
      break;
    }
  }
  console.log(` [DISCONNECT OBSERVED] ${sawDisconnect ? 'PASS' : 'WARN - Disconnect pending'}`);

  // Wait 1.5s for Windows socket handles to be cleanly released
  await new Promise((r) => setTimeout(r, 1500));

  // Restart game-server process
  console.log(' [RESTART] Khởi động lại game-server process trên cùng DB...');
  serverProc = spawnGameServer();
  const serverBack = await waitForServerHealthy(25000);
  if (!serverBack) {
    throw new Error('FATAL: Không thể restart game-server sau khi kill');
  }

  // Client must reconnect automatically without page reload
  let sawReconnect = false;
  let statusAfter: any = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(500);
    const s = await page.evaluate(() => (window as any).__BATTLEFIELD_QA__.getSocketStatus());
    if (s.connected && s.snapshotCount > statusBefore.snapshotCount) {
      sawReconnect = true;
      statusAfter = s;
      break;
    }
  }

  const reconnectPass = sawReconnect && statusAfter !== null;
  results.push({
    id: 'CRIT_3_REAL_OBS_RECONNECT',
    name: 'Real Process Kill & Reconnect with Snapshot Resync (No Page Reload)',
    status: reconnectPass ? 'PASS' : 'FAIL',
    details: reconnectPass
      ? `Reconnected successfully without reload: Snapshots advanced from ${statusBefore.snapshotCount} to ${statusAfter.snapshotCount}, Match=${statusAfter.matchId}`
      : 'Failed: Client did not reconnect or did not receive subsequent snapshots',
    metric: { statusBefore, statusAfter, sawDisconnect, sawReconnect },
  });
  console.log(`[CRIT_3] ${reconnectPass ? 'PASS' : 'FAIL'} - Reconnect verified: snapshots ${statusBefore.snapshotCount} -> ${statusAfter?.snapshotCount}`);

  // -------------------------------------------------------------------------
  // CRITERIA 4: REAL TIKTOK SAFE ZONE VERIFICATION (Phaser Active Banner Introspection)
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 4] Real TikTok Safe Zone Verification (Y: 1250-1350px, Fail-Closed) ---');
  // Trigger a Gift Skill (airstrike)
  await fetch(`http://127.0.0.1:${TEST_SERVER_PORT}/api/live/event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken,
    },
    body: JSON.stringify({
      type: 'GIFT',
      provider: 'mock',
      liveSessionId: 'obs_session_1',
      providerEventId: `obs_gift_${Date.now()}`,
      userId: 'obs_donor_99',
      userName: 'OBS_VIP_User',
      giftId: 'rose',
      quantity: 5,
    }),
  });

  // Poll real active banner directly from Phaser container (Zero DOM simulation, Fail-closed)
  let activeBanner: any = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(100);
    const b = await page.evaluate(() => (window as any).__BATTLEFIELD_QA__.getActiveBanner());
    if (b && b.visible) {
      activeBanner = b;
      break;
    }
  }

  let safeZonePass = false;
  let safeZoneDetails = '';
  if (!activeBanner) {
    safeZonePass = false;
    safeZoneDetails = 'FAIL_CLOSED: Gift Banner was NOT detected in Phaser canvas within 4s window. Synthetic fallback eliminated.';
  } else {
    // Exact safe zone verification: Top >= 1250px and Bottom <= 1350px
    const isWithinSafeZone = activeBanner.top >= 1250 && activeBanner.bottom <= 1350;

    // Verify auto-disappearance within 3 seconds
    let bannerDisappeared = false;
    for (let j = 0; j < 35; j++) {
      await page.waitForTimeout(100);
      const bNow = await page.evaluate(() => (window as any).__BATTLEFIELD_QA__.getActiveBanner());
      if (!bNow || !bNow.visible) {
        bannerDisappeared = true;
        break;
      }
    }
    const isDurationCompliant = bannerDisappeared;
    safeZonePass = isWithinSafeZone && isDurationCompliant;
    safeZoneDetails = safeZonePass
      ? `PASS: Active Phaser Banner top=${activeBanner.top}px, bottom=${activeBanner.bottom}px, y=${activeBanner.y}px (strictly inside 1250-1350px), auto-fade verified within 3s.`
      : `FAIL: Bounds check (top=${activeBanner.top}px >= 1250, bottom=${activeBanner.bottom}px <= 1350: ${isWithinSafeZone}) or auto-fade compliance (${isDurationCompliant})`;
  }

  results.push({
    id: 'CRIT_4_TIKTOK_SAFE_ZONE',
    name: 'TikTok LIVE 9:16 Safe Zone Banner Layout Bounds (1250-1350px, <= 3s auto fade)',
    status: safeZonePass ? 'PASS' : 'FAIL',
    details: safeZoneDetails,
    metric: activeBanner,
  });
  console.log(`[CRIT_4] ${safeZonePass ? 'PASS' : 'FAIL'} - ${safeZoneDetails}`);

  // -------------------------------------------------------------------------
  // CRITERIA 5: 60-SECOND MULTI-ROUND LIVE OPERATIONS SIMULATION & STREAMING
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 5] Continuous 60s Live Operations Simulation & Real FPS Telemetry ---');
  const fpsSamples: number[] = [];
  const frameDeltas: number[] = [];
  const testUsers = ['alpha_lead', 'bravo_sniper', 'charlie_medic', 'delta_scout'];

  // Stream viewer actions helper
  const sendLiveAction = async (cmd: string, user: string) => {
    try {
      await fetch(`http://127.0.0.1:${TEST_SERVER_PORT}/api/live/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({
          type: 'COMMENT',
          provider: 'mock',
          liveSessionId: 'obs_session_1',
          providerEventId: `ev_${Date.now()}_${Math.random()}`,
          userId: user,
          userName: `Viewer_${user}`,
          command: cmd,
        }),
      });
    } catch {}
  };

  for (const u of testUsers) {
    await sendLiveAction('JOIN 1', u);
  }

  // Run for 62 continuous seconds to guarantee >= 60s recording duration
  const DURATION_SECONDS = 62;
  console.log(` [SIMULATION] Đo đạc hiệu năng liên tục trong ${DURATION_SECONDS} giây (Zero fallback)...`);

  for (let sec = 1; sec <= DURATION_SECONDS; sec++) {
    await page.waitForTimeout(1000);
    const perf = await page.evaluate(() => (window as any).__BATTLEFIELD_QA__.getPerformanceStats());
    if (typeof perf.actualFps !== 'number' || isNaN(perf.actualFps) || perf.actualFps <= 0) {
      throw new Error(`CRITICAL_QA_ERROR: Cannot measure real FPS from Phaser loop (received: ${perf.actualFps})`);
    }
    const fps = Math.round(perf.actualFps);
    fpsSamples.push(fps);
    if (typeof perf.deltaMs === 'number' && !isNaN(perf.deltaMs)) {
      frameDeltas.push(perf.deltaMs);
    }

    // Periodically trigger comments and gifts to maintain combat activity
    if (sec % 3 === 0) {
      await sendLiveAction('BAN', testUsers[sec % testUsers.length]);
      await sendLiveAction('SUA', testUsers[(sec + 1) % testUsers.length]);
    }
    if (sec % 10 === 0) {
      await fetch(`http://127.0.0.1:${TEST_SERVER_PORT}/api/live/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({
          type: 'GIFT',
          provider: 'mock',
          liveSessionId: 'obs_session_1',
          providerEventId: `stream_gift_${sec}_${Date.now()}`,
          userId: testUsers[0],
          userName: 'Stream_VIP',
          giftId: sec % 20 === 0 ? 'galaxy' : 'rose',
          quantity: 2,
        }),
      });
    }

    if (sec % 15 === 0 || sec === DURATION_SECONDS) {
      console.log(`   * Giây ${sec}/${DURATION_SECONDS} | FPS: ${fps} | Mẫu: ${fpsSamples.length}`);
    }
  }

  const finalMon = await adminClient.getMonitoring();
  if (frameDeltas.length === 0) {
    throw new Error('FATAL_QA_ERROR: Zero frame delta samples collected from Phaser loop. Fail-closed on missing telemetry (Zero Synthetic Fallback).');
  }
  const sortedDeltas = [...frameDeltas].sort((a, b) => a - b);
  const p95FrameTimeMs = Math.round(sortedDeltas[Math.floor(sortedDeltas.length * 0.95)] * 10) / 10;
  const avgFps = Math.round(fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length);
  const minFps = Math.min(...fpsSamples);
  const maxFps = Math.max(...fpsSamples);
  const sortedFps = [...fpsSamples].sort((a, b) => a - b);
  const p5Fps = sortedFps[Math.floor(sortedFps.length * 0.05)];

  // P1.1: Yêu cầu tối thiểu >= 55 FPS trung bình (Strict SLA, Zero fallback)
  const fpsPass = avgFps >= 55 && minFps >= 30;

  // -------------------------------------------------------------------------
  // CAPTURE HIGH-RES ARTIFACTS & FINALIZE VIDEO
  // -------------------------------------------------------------------------
  console.log('\n--- [TEST 6] Capturing High-Res OBS Screenshots & Finalizing Video ---');
  const screenshot1080Path = path.join(screenshotsDir, 'phase07_obs_overlay_1080x1920.png');
  await page.screenshot({ path: screenshot1080Path });
  console.log(` [SAVED] 1080x1920 Screenshot: ${screenshot1080Path}`);

  // Retrieve exact video handle recorded for this page context
  const videoHandle = page.video();
  await page.close();

  if (videoHandle) {
    await videoHandle.saveAs(recordPath);
    console.log(` [SAVED] 60s Video Recording: ${recordPath}`);
  }
  await context.close();
  await browser.close();

  // P1.1: Kiểm tra metadata thời lượng WebM thực tế bằng ffprobe
  let realVideoDurationSeconds = 0;
  try {
    const probeOut = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${recordPath}"`, { encoding: 'utf-8' }).trim();
    realVideoDurationSeconds = Math.round(parseFloat(probeOut) * 10) / 10;
    console.log(` [FFPROBE] Verified Video Duration: ${realVideoDurationSeconds}s`);
  } catch (probeErr: any) {
    console.warn(` [FFPROBE WARN] Không thể đọc metadata: ${probeErr.message}`);
  }

  const isVideoDurationValid = realVideoDurationSeconds >= 60.0;
  const crit5OverallPass = fpsPass && isVideoDurationValid;

  results.push({
    id: 'CRIT_5_SIMULATION_STABILITY_AND_FPS',
    name: 'Multi-Round Continuous Live Simulation & 60s Verified Telemetry (>=55 FPS, ffprobe duration)',
    status: crit5OverallPass ? 'PASS' : 'FAIL',
    details: `Duration=${DURATION_SECONDS}s, ffprobeDuration=${realVideoDurationSeconds}s (Valid >= 60s: ${isVideoDurationValid}), Avg FPS=${avgFps} (>=55), Min FPS=${minFps}, Max FPS=${maxFps}, p5 FPS=${p5Fps}, p95 FrameTime=${p95FrameTimeMs}ms, Server Uptime=${finalMon.server.uptimeSeconds}s, Memory=${finalMon.server.memoryUsageMb}MB, Journal Watermark=${finalMon.operations.lastAppliedJournalSeq}`,
    metric: { avgFps, minFps, maxFps, p5Fps, p95FrameTimeMs, durationSeconds: DURATION_SECONDS, realVideoDurationSeconds, sampleCount: fpsSamples.length, samples: fpsSamples, memoryUsageMb: finalMon.server.memoryUsageMb, watermark: finalMon.operations.lastAppliedJournalSeq },
  });
  console.log(`[CRIT_5] ${crit5OverallPass ? 'PASS' : 'FAIL'} - Avg FPS: ${avgFps}, Min: ${minFps}, p5: ${p5Fps}, p95 delta: ${p95FrameTimeMs}ms, ffprobe: ${realVideoDurationSeconds}s`);

  // Copy artifacts to Brain Directory
  if (fs.existsSync(brainDir)) {
    fs.copyFileSync(screenshot1080Path, path.join(brainDir, 'phase07_obs_overlay_1080x1920.png'));
    if (fs.existsSync(screenshot360Path)) {
      fs.copyFileSync(screenshot360Path, path.join(brainDir, 'phase07_obs_mobile_360x640.png'));
    }
    if (fs.existsSync(recordPath)) {
      fs.copyFileSync(recordPath, path.join(brainDir, 'phase07_obs_gameplay_60s.webm'));
    }
  }

  // Save Telemetry JSON
  const telemetry = {
    timestamp: new Date().toISOString(),
    phase: 'Phase 07.2: Final Critical Fixes & Phase 08 Handoff',
    overallStatus: results.every((r) => r.status === 'PASS') ? 'PASS' : 'FAIL',
    criteriaCount: results.length,
    passedCount: results.filter((r) => r.status === 'PASS').length,
    criteria: results,
    runtimeTelemetry: finalMon,
    summary: {
      averageFps: avgFps,
      minFps,
      maxFps,
      p5Fps,
      p95FrameTimeMs,
      recordedDurationSeconds: DURATION_SECONDS,
      verifiedVideoDurationSeconds: realVideoDurationSeconds,
      sampleCount: fpsSamples.length,
      serverUptimeSeconds: finalMon.server.uptimeSeconds,
      memoryUsageMb: finalMon.server.memoryUsageMb,
      simulationHz: finalMon.operations.simulationHz,
      outboxLag: finalMon.operations.outboxLag,
      lastAppliedJournalSeq: finalMon.operations.lastAppliedJournalSeq,
    },
  };

  const telemetryPath = path.join(clientDir, 'phase07_live_ops_telemetry.json');
  fs.writeFileSync(telemetryPath, JSON.stringify(telemetry, null, 2));
  fs.writeFileSync(path.join(clientDir, 'phase07_1_live_ops_telemetry.json'), JSON.stringify(telemetry, null, 2));

  if (fs.existsSync(brainDir)) {
    fs.writeFileSync(path.join(brainDir, 'phase07_live_ops_telemetry.json'), JSON.stringify(telemetry, null, 2));
    fs.writeFileSync(path.join(brainDir, 'phase07_1_live_ops_telemetry.json'), JSON.stringify(telemetry, null, 2));
  }
  console.log(` [SAVED] Telemetry JSON: ${telemetryPath}`);

  console.log('\n================================================================');
  console.log(` PHASE 07.2 AUDIT SUMMARY: ${telemetry.passedCount}/${telemetry.criteriaCount} CRITERIA PASSED`);
  console.log('================================================================');

  if (serverProc) killProcessTree(serverProc.pid);
  if (clientProc) killProcessTree(clientProc.pid);
  try {
    if (fs.existsSync(testDbDir)) fs.rmSync(testDbDir, { recursive: true, force: true });
  } catch {}

  if (telemetry.overallStatus !== 'PASS') {
    process.exit(1);
  }
}

runPhase07OpsLiveQA().catch((err) => {
  console.error('Fatal Phase 07.2 QA error:', err);
  if (serverProc) killProcessTree(serverProc.pid);
  if (clientProc) killProcessTree(clientProc.pid);
  try {
    if (fs.existsSync(testDbDir)) fs.rmSync(testDbDir, { recursive: true, force: true });
  } catch {}
  process.exit(1);
});
