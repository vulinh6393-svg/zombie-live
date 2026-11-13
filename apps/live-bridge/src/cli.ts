#!/usr/bin/env node
import { MockLiveAdapter } from './mock.js';
import { TikTokLiveAdapter } from './tiktok.js';
import { LiveEventDispatcher } from './dispatcher.js';

/**
 * Live Bridge Executable Runner (CLI Entrypoint)
 * Chạy cầu nối tiếp nhận sự kiện TikTok LIVE hoặc giả lập 100 người xem (Mock Provider)
 * Chuyển tiếp tới Game Server Authoritative Engine qua HTTP Ingress Token.
 */
async function main() {
  const gameServerUrl = process.env.GAME_SERVER_URL || 'http://localhost:3001';
  const ingressToken = process.env.LIVE_BRIDGE_INGRESS_TOKEN || 'live_bridge_ingress_secret_2026_token';
  const mode = (process.env.PROVIDER_MODE || 'mock').toLowerCase();
  const mockViewers = parseInt(process.env.MOCK_VIEWERS || '100', 10);
  const eventIntervalMs = parseInt(process.env.EVENT_INTERVAL_MS || '800', 10);

  console.log(`[LIVE BRIDGE] Starting Live Bridge Runner...`);
  console.log(`[LIVE BRIDGE] Target Game Server: ${gameServerUrl}`);
  console.log(`[LIVE BRIDGE] Mode: ${mode.toUpperCase()} (Viewers: ${mockViewers})`);

  const dispatcher = new LiveEventDispatcher({
    serverUrl: gameServerUrl,
    ingressToken: ingressToken,
    streakTimeoutSeconds: 300,
  });

  let adapter: MockLiveAdapter | TikTokLiveAdapter;

  if (mode === 'tiktok') {
    adapter = new TikTokLiveAdapter();
    const status = adapter.getStatus();
    console.warn(`[LIVE BRIDGE] TikTok Provider Status: ${status.status} - ${status.reason || status.disclaimer}`);
    if (status.status === 'BLOCKED') {
      console.error(`[LIVE BRIDGE] ERROR: TikTok LIVE connector is BLOCKED. Synthetic connection is strictly prohibited.`);
      process.exit(1);
    }
  } else {
    adapter = new MockLiveAdapter();
  }

  dispatcher.bindAdapter(adapter);

  // Graceful shutdown handling
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[LIVE BRIDGE] Received ${signal}. Shutting down gracefully...`);
    try {
      await dispatcher.stop();
      console.log(`[LIVE BRIDGE] Disconnected cleanly. Bye!`);
      process.exit(0);
    } catch (err: any) {
      console.error(`[LIVE BRIDGE] Error during shutdown: ${err.message}`);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await dispatcher.start();
    console.log(`[LIVE BRIDGE] Connected successfully to event stream!`);

    if (adapter instanceof MockLiveAdapter) {
      // Bắn burst khởi động ban đầu để 100 viewers gia nhập 3 squad
      console.log(`[LIVE BRIDGE] Emitting initial 100-viewer join burst...`);
      adapter.emit100ViewersBurst();

      // Vòng lặp định kỳ giả lập các hành vi tương tác liên tục: BAN, SUA, CUU, BOSS, GIFT
      let loopCount = 0;
      const intervalTimer = setInterval(() => {
        if (isShuttingDown) {
          clearInterval(intervalTimer);
          return;
        }

        loopCount++;
        // Cứ mỗi 10 chu kỳ bắn thêm 1 burst toàn diện
        if (loopCount % 10 === 0) {
          adapter.emit100ViewersBurst();
        } else {
          // Tạo ngẫu nhiên 3-5 tương tác từ tập 100 viewers
          const count = 3 + Math.floor(Math.random() * 3);
          for (let i = 0; i < count; i++) {
            const vIdx = Math.floor(Math.random() * mockViewers) + 1;
            const rand = Math.random();
            const now = new Date().toISOString();

            if (rand < 0.45) {
              // Comment bắn đạn
              adapter.emitMockEvent({
                eventKey: `mock_ev_${Date.now()}_${i}`,
                liveSessionId: 'mock_live_session',
                type: 'comment',
                userId: `viewer_${vIdx}`,
                username: `Viewer #${vIdx}`,
                comment: 'BAN',
                at: now,
              });
            } else if (rand < 0.65) {
              // Comment sửa thành / cứu viện
              const act = Math.random() < 0.5 ? 'SUA' : 'CUU';
              adapter.emitMockEvent({
                eventKey: `mock_ev_${Date.now()}_${i}`,
                liveSessionId: 'mock_live_session',
                type: 'comment',
                userId: `viewer_${vIdx}`,
                username: `Viewer #${vIdx}`,
                comment: act,
                at: now,
              });
            } else if (rand < 0.75) {
              // Focus Boss
              adapter.emitMockEvent({
                eventKey: `mock_ev_${Date.now()}_${i}`,
                liveSessionId: 'mock_live_session',
                type: 'comment',
                userId: `viewer_${vIdx}`,
                username: `Viewer #${vIdx}`,
                comment: 'BOSS',
                at: now,
              });
            } else {
              // Tặng quà kích hoạt kỹ năng
              const gifts = ['rose', 'heart', 'shield', 'firework', 'missile'];
              const giftId = gifts[Math.floor(Math.random() * gifts.length)];
              adapter.emitMockEvent({
                eventKey: `mock_gift_${Date.now()}_${i}`,
                liveSessionId: 'mock_live_session',
                type: 'gift',
                userId: `viewer_${vIdx}`,
                username: `Viewer #${vIdx}`,
                gift: {
                  giftId,
                  quantity: 1,
                  isFinal: true,
                },
                at: now,
              });
            }
          }
        }
      }, eventIntervalMs);

      // Định kỳ in thông số telemetry của Dispatcher mỗi 5 giây
      const statsTimer = setInterval(() => {
        if (isShuttingDown) {
          clearInterval(statsTimer);
          return;
        }
        const s = dispatcher.getStats();
        console.log(`[LIVE BRIDGE STATS] Dispatched: ${s.dispatchedCount} | Accepted: ${s.acceptedCount} | Rejected: ${s.rejectedCount} | Rate: ${s.eventsPerSecond} ev/s | p95: ${s.p95LatencyMs}ms | Dups: ${s.duplicateStreakCount}`);
      }, 5000);
    }
  } catch (err: any) {
    console.error(`[LIVE BRIDGE FATAL] Failed to start dispatcher: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[LIVE BRIDGE FATAL] Uncaught error: ${err}`);
  process.exit(1);
});
