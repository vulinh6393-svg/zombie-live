import { buildServer } from './server.js';
import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '0.0.0.0';

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
