import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenePath = path.resolve(__dirname, '../src/scenes/GameScene.js');

test('scene should render a subtle vignette for cozy depth (graphics/canvas fallback, no heavy postFX)', () => {
  const src = fs.readFileSync(scenePath, 'utf8');
  assert.ok(/vignette|виньет|createVignette|drawVignette/i.test(src),
    'GameScene should create a vignette overlay for cozier visuals');
});
