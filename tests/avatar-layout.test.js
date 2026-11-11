import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AVATAR_DEFAULT_TILE_SIZE, avatarLayout, avatarStandPosition } from '../src/ui/avatar-layout.js';

test('размер аватара — 80% от размера тайла (меньше грядки, без круга)', () => {
  const layout = avatarLayout(42);
  assert.equal(layout.size, 34);
  assert.ok(layout.size < 42);
});

test('размер никогда не превышает тайл даже на крупной сетке', () => {
  assert.ok(avatarLayout(64).size < 64);
});

test('тень лежит ниже центра спрайта, а не отдельным кругом-обводкой', () => {
  const layout = avatarLayout(42);
  assert.ok(layout.shadowY > 0);
  assert.ok(layout.shadowWidth < layout.size);
});

test('аватар стоит над центром грядки ровно на один и тот же оффсет', () => {
  const center = { x: 100, y: 200 };
  const pos = avatarStandPosition(center, 42);
  assert.equal(pos.x, center.x);
  assert.equal(pos.y, center.y + avatarLayout(42).standOffsetY);
});

test('оффсет стояния не зависит от того, каким способом пришёл игрок', () => {
  const posA = avatarStandPosition({ x: 10, y: 10 }, AVATAR_DEFAULT_TILE_SIZE);
  const posB = avatarStandPosition({ x: 70, y: 90 }, AVATAR_DEFAULT_TILE_SIZE);
  assert.equal(posA.y - 10, posB.y - 90);
});