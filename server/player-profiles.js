/**
 * Профили игроков — серверное хранилище.
 * Каждый игрок имеет уникальный ник и личный прогресс,
 * который сохраняется независимо от комнат.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPlayerProfile, isValidNickname } from '../shared/player.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'player-profiles.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const profiles = new Map();

function loadProfiles() {
  try {
    if (!fs.existsSync(PROFILES_FILE)) return;
    const raw = fs.readFileSync(PROFILES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    for (const [id, data] of Object.entries(parsed)) {
      profiles.set(id, data);
    }
    console.log(`[player-profiles] Загружено ${profiles.size} профилей.`);
  } catch (e) {
    console.error('[player-profiles] Ошибка загрузки:', e.message);
  }
}

function saveProfiles() {
  try {
    const disk = {};
    for (const [id, profile] of profiles.entries()) {
      disk[id] = profile;
    }
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(disk, null, 2), 'utf8');
  } catch (e) {
    console.error('[player-profiles] Ошибка сохранения:', e.message);
  }
}

loadProfiles();

export function getProfile(playerId) {
  return profiles.get(playerId) || null;
}

export function createProfile(playerId, nickname) {
  if (profiles.has(playerId)) {
    return profiles.get(playerId);
  }
  const profile = createPlayerProfile(playerId, nickname);
  profiles.set(playerId, profile);
  saveProfiles();
  return profile;
}

export function updateProfile(playerId, updates) {
  const profile = profiles.get(playerId);
  if (!profile) return null;
  Object.assign(profile, updates);
  profile.lastSeenAt = Date.now();
  saveProfiles();
  return profile;
}

export function addToCollection(playerId, seedId) {
  const profile = profiles.get(playerId);
  if (!profile) return false;
  if (!profile.collection.includes(seedId)) {
    profile.collection.push(seedId);
    saveProfiles();
  }
  return true;
}

export function addCoins(playerId, amount) {
  const profile = profiles.get(playerId);
  if (!profile) return 0;
  profile.coins += amount;
  saveProfiles();
  return profile.coins;
}

export function addInventory(playerId, seedId, count = 1) {
  const profile = profiles.get(playerId);
  if (!profile) return false;
  profile.inventory[seedId] = (profile.inventory[seedId] || 0) + count;
  saveProfiles();
  return true;
}

export function incrementStat(playerId, statKey, value = 1) {
  const profile = profiles.get(playerId);
  if (!profile) return;
  if (!profile.stats) profile.stats = {};
  profile.stats[statKey] = (profile.stats[statKey] || 0) + value;
  saveProfiles();
}

export function getAllProfiles() {
  return Array.from(profiles.entries());
}

export function setProfileData(playerId, key, value) {
  const profile = profiles.get(playerId);
  if (!profile) return null;
  profile[key] = value;
  profile.lastSeenAt = Date.now();
  saveProfiles();
  return profile;
}
