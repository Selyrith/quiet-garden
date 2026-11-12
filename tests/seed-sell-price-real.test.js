import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const netPath = path.resolve(__dirname, '../src/scenes/GameSceneNetwork.js');

test('client gives feedback for sell-seed-result (toast/sound) to complete mobile-friendly UX', () => {
  const src = fs.readFileSync(netPath, 'utf8');
  assert.ok(/s\.on\(['"]sell-seed-result['"]/.test(src),
    'GameSceneNetwork must listen to sell-seed-result and show feedback');
  assert.ok(/showToast|sound\.(harvest|error)/.test(src),
    'sell-seed-result handler should provide toast or sound feedback');
});
