import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { saveRooms, loadRooms } from '../server/save.js';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'qg-save-'));
}

function fakeRoom(coins = 5) {
  return {
    coins,
    collection: new Set(['seed_a']),
    inventory: { 0: 3 },
    upgrades: { growth: 0, luck: 0, income: 0 },
    garden: new Map([['1,1', { seed: 'seed_a', plantedAt: Date.now(), growSeconds: 100 }]]),
    roles: new Map(),
    team: { currentIndex: 0, progress: 0, claimed: [] },
    tree: { level: 1, progress: 10, nextLevelAt: 50 },
    signpostMessage: 'привет',
    playerGoals: new Map(),
    pet: null,
    lastWeather: 'sunny',
    incomeBonusPermanent: 0,
    maxActivitiesBonus: 0,
    upgradeDiscount: 0,
    gardenRowsBonus: 0,
    lastActivityAt: Date.now(),
  };
}

const createRoom = (code) => ({
  players: new Map(),
  garden: new Map(),
  coins: 0,
  collection: new Set(),
  inventory: {},
  activities: new Map(),
  upgrades: { growth: 0, luck: 0, income: 0 },
  goals: {},
  roles: new Map(),
  team: { currentIndex: 0, progress: 0, claimed: [] },
  playerJobs: new Map(),
  tree: { level: 0, progress: 0, nextLevelAt: 50 },
  signpostMessage: '',
  lastActivityAt: Date.now(),
  pet: null,
});

const createEmptyGarden = () => new Map();

test('комната сохраняется в файл и читается обратно', () => {
  const dir = tmpDir();
  process.env.DATA_DIR = dir;
  const rooms = new Map([['ABC123', fakeRoom(42)]]);

  saveRooms(rooms);
  const loaded = loadRooms(createRoom, createEmptyGarden);

  assert.equal(loaded.size, 1);
  assert.equal(loaded.get('ABC123').coins, 42);
});

test('битый основной файл не теряет данные — есть резервная копия', () => {
  const dir = tmpDir();
  process.env.DATA_DIR = dir;
  const rooms = new Map([['ABC123', fakeRoom(7)]]);

  saveRooms(rooms);
  saveRooms(rooms); // второй раз — чтобы появился .bak

  // Портим основной файл
  fs.writeFileSync(path.join(dir, 'rooms.json'), '{битый json', 'utf8');

  const loaded = loadRooms(createRoom, createEmptyGarden);
  assert.equal(loaded.size, 1, 'комната должна восстановиться из .bak');
  assert.equal(loaded.get('ABC123').coins, 7);
});

test('DATA_DIR из окружения используется как путь к данным', () => {
  const dir = tmpDir();
  process.env.DATA_DIR = dir;
  saveRooms(new Map([['XYZ789', fakeRoom(3)]]));

  const file = path.join(dir, 'rooms.json');
  assert.ok(fs.existsSync(file), 'файл должен быть в DATA_DIR');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(parsed.XYZ789);
});

test('после записи основной файл остаётся валидным JSON', () => {
  const dir = tmpDir();
  process.env.DATA_DIR = dir;
  saveRooms(new Map([['AAA111', fakeRoom(1)], ['BBB222', fakeRoom(2)]]));

  const raw = fs.readFileSync(path.join(dir, 'rooms.json'), 'utf8');
  const parsed = JSON.parse(raw);
  assert.equal(Object.keys(parsed).length, 2);
});
