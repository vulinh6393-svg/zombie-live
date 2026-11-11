import { buildServer } from './server.js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tải cấu hình từ root .env và local .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const isDev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT) || 3001;
// P0.1 Hardening: Giới hạn loopback 127.0.0.1 trong môi trường development để không mở rộng mạng
const host = process.env.HOST || (isDev ? '127.0.0.1' : '0.0.0.0');

const { app } = buildServer({ logger: true });

async function start() {
  try {
    await app.listen({ port, host });
    console.log(`[Zombie Live Server] Running at http://${host}:${port}`);
    console.log(`[Zombie Live Server] Health check: http://localhost:${port}/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
