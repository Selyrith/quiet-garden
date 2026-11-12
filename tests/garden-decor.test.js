import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenePath = path.resolve(__dirname, '../src/scenes/GameScene.js');

test('scene renders cozy garden decor (pond/lantern/bench/fence)', () => {
  const src = fs.readFileSync(scenePath, 'utf8');
  assert.ok(/createGardenDecor/.test(src), 'GameScene should have createGardenDecor');
  assert.ok(/pond|пруд|fillEllipse/.test(src) && /lantern|фонар|fillCircle/.test(src),
    'decor should include pond and lanterns');
  assert.ok(/bench|скамей|fence|забор/.test(src), 'decor should include bench/fence');
});
