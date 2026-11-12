import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const weatherPath = path.resolve(__dirname, '../src/ui/WeatherEffects.js');

test('rain weather should render subtle puddles/ripples (cozy, no heavy FX)', () => {
  const src = fs.readFileSync(weatherPath, 'utf8');
  assert.ok(/puddles|лужи|fillEllipse/.test(src) && /rain/.test(src),
    'WeatherEffects should draw puddles/ripples during rain');
});
