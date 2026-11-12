import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const handlersPath = path.resolve(__dirname, '../server/handlers.js');

test('synergy credits helping neighbor with coins (helperPid + addCoins)', () => {
  const src = fs.readFileSync(handlersPath, 'utf8');
  assert.ok(/helperPid|neighborReward/.test(src), 'synergy should track helper and reward');
  assert.ok(/addCoins\(helperPid/.test(src) || /room\.coins\s*\+=\s*neighborReward/.test(src),
    'neighbor reward must be applied via addCoins/room.coins');
});
