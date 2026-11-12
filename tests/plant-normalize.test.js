import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const handlersPath = path.resolve(__dirname, '../server/handlers.js');
const netPath = path.resolve(__dirname, '../src/scenes/GameSceneNetwork.js');

test('plant action normalizes inventory key (number/string) and uses invKey for delete', () => {
  const src = fs.readFileSync(handlersPath, 'utf8');
  assert.ok(/const invKey =/.test(src), 'should compute invKey for plant');
  assert.ok(/room\.inventory\[invKey\]--/.test(src) && /delete room\.inventory\[invKey\]/.test(src),
    'delete should use invKey to avoid leftover/incorrect removal');
  assert.ok(/seed:\s*Number\(seedId\)/.test(src), 'plantTile should receive numeric seed');
});

test('client auto-selects first available seed on initial-state so plant works immediately', () => {
  const src = fs.readFileSync(netPath, 'utf8');
  assert.ok(/selectedSeedId\s*==\s*null/.test(src) && /invKeys/.test(src),
    'client should auto-select a seed if none selected after inventory load');
});
