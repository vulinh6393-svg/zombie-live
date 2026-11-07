import { describe, it, expect } from 'vitest';
import { parseGameBalance } from './parser.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const balancePath = path.resolve(__dirname, '../../../docs/GAME_BALANCE.json');
const balanceJson = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));

describe('Game Balance Config Parser', () => {
  it('successfully parses GAME_BALANCE.json with 10 zombies', () => {
    const balance = parseGameBalance(balanceJson);
    expect(balance.version).toBe('1.0-mvp');
    expect(balance.zombies.length).toBe(10);
    expect(balance.round.baseHp).toBe(10000);
    expect(balance.soldier.renderCap).toBe(40);
  });

  it('verifies zombie king has isBoss flag and stages', () => {
    const balance = parseGameBalance(balanceJson);
    const king = balance.zombies.find((z) => z.id === 'zombie_king');
    expect(king).toBeDefined();
    expect(king?.isBoss).toBe(true);
    expect(king?.stages).toBe(3);
  });
});
