import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tilesPath = path.resolve(__dirname, '../src/scenes/GameSceneTiles.js');

test('ripe stage should add a glow pulse/sparkle beyond the small badge (readability + juice)', () => {
  const src = fs.readFileSync(tilesPath, 'utf8');
  assert.ok(/stage === 3/.test(src), 'tiles should branch on stage 3');
  // Require a ripe glow/sparkle emitter or ADD-blend circle beyond readyBadge
  assert.ok(/ADD|blendMode|particle|spark|glow|свеч|ring/.test(src),
    'ripe visuals should include a glow/spark/ring or ADD-blend effect for stage 3');
});
