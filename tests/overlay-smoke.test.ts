import { describe, it, afterEach, expect } from 'vitest';
import { bootScene, step } from './harness.js';
import { MainMenuOverlay } from '../src/ui/MainMenuOverlay.js';
import { ShopOverlay } from '../src/ui/ShopOverlay.js';
import { UpgradesOverlay } from '../src/ui/UpgradesOverlay.js';
import { GoalsOverlay } from '../src/ui/GoalsOverlay.js';
import { RolesOverlay } from '../src/ui/RolesOverlay.js';
import { SettingsOverlay } from '../src/ui/SettingsOverlay.js';
import { PlantDetailOverlay } from '../src/ui/PlantDetailOverlay.js';
import { createGoalsState } from '../shared/goals.js';
import { getAllSeeds } from '../shared/plants.js';

/**
 * Ни одно окно не должно падать в конструкторе.
 *
 * Phaser ловит исключения из конструктора контейнера и продолжает кадр,
 * поэтому «окно не открывается» в игре выглядит как молчаливое ничто.
 * Головастый тест создаёт каждый оверлей на настоящем Phaser-инстансе
 * и проверяет, что содержимое собрано и попадает в экран.
 */

function fakeScene(scene) {
  scene.showToast = () => {};
  scene.hideSignpost = () => {};
  scene.showSignpost = () => {};
  scene.roomCode = 'TEST01';
  scene.sound = { uiClick: () => {}, error: () => {} };
  scene.collection = new Set(getAllSeeds().slice(0, 3));
  scene.coins = 500;
  scene.upgrades = { growth: 2, luck: 1, income: 0 };
  scene.goals = createGoalsState();
  scene.goals.daily = { claimed: false };
  scene.goals.streak = { count: 3, multiplier: 1.4, dailyActions: 2, season: { name: 'Неделя семян', icon: '🌱' } };
  scene.goals.quests = [
    { id: 'harvest5', text: 'Собери 5 растений', progress: 3, target: 5, reward: 30 },
    { id: 'water10', text: 'Полей 10 раз', progress: 10, target: 10, reward: 20 },
  ];
  scene.goals.totals = { harvest: 12, plant: 9, activity: 2, upgrade: 1, speciesCount: 3 };
  scene.playerGender = 'male';
  return scene;
}

function assertVisibleInsideScreen(overlay, scene) {
  const ui = overlay.ui;
  expect(ui).toBeTruthy();
  expect(overlay._destroyed).toBeFalsy();
  expect(ui.body.list.length).toBeGreaterThan(2);
  const cam = scene.cameras.main;
  expect(ui.panelX).toBeGreaterThanOrEqual(0);
  expect(ui.panelY).toBeGreaterThanOrEqual(0);
  expect(ui.panelX + ui.panelW).toBeLessThanOrEqual(cam.width);
  expect(ui.panelY + ui.panelH).toBeLessThanOrEqual(cam.height);
}

describe('оверлеи открываются на телефоне', () => {
  let game;

  afterEach(() => {
    try { game?.destroy(true); } catch {}
    game = undefined;
  });

  async function withOverlay(width, height, factory) {
    const handle = await bootScene(width, height);
    game = handle.game;
    fakeScene(handle.scene);
    const overlay = factory(handle.scene);
    step(handle.game, 20);
    return { ...handle, overlay };
  }

  it('главное меню', async () => {
    const { overlay, scene } = await withOverlay(390, 844, (s) => new MainMenuOverlay(s, {}));
    assertVisibleInsideScreen(overlay, scene);
  });

  it('магазин', async () => {
    const { overlay, scene } = await withOverlay(390, 844, (s) => new ShopOverlay(s, 500));
    assertVisibleInsideScreen(overlay, scene);
    // Три набора — три карточки в списке.
    expect(overlay.scroll.view.list.length).toBeGreaterThanOrEqual(3);
  });

  it('улучшения', async () => {
    const { overlay, scene } = await withOverlay(390, 844, (s) => new UpgradesOverlay(s, 500, s.upgrades));
    assertVisibleInsideScreen(overlay, scene);
    expect(overlay.scroll.view.list.length).toBeGreaterThanOrEqual(3);
    // Прокрутка реально измеряет высоту карточек (у контейнеров нет height).
    expect(overlay.scroll.contentH).toBeGreaterThan(300);
  });

  it('цели', async () => {
    const { overlay, scene } = await withOverlay(390, 844, (s) => new GoalsOverlay(s, s.goals));
    assertVisibleInsideScreen(overlay, scene);
    expect(overlay.scroll.contentH).toBeGreaterThan(400);
  });

  it('роли', async () => {
    const { overlay, scene } = await withOverlay(390, 844, (s) => new RolesOverlay(s, 'gardener'));
    assertVisibleInsideScreen(overlay, scene);
  });

  it('настройки', async () => {
    const { overlay, scene } = await withOverlay(390, 844, (s) => new SettingsOverlay(s));
    assertVisibleInsideScreen(overlay, scene);
  });

  it('карточка растения', async () => {
    const seed = getAllSeeds()[0];
    const { overlay, scene } = await withOverlay(390, 844,
      (s) => new PlantDetailOverlay(s, seed, s.collection));
    assertVisibleInsideScreen(overlay, scene);
  });
});