import { plantTile, waterTile, harvestTile, computeState, getStage } from './garden.js';
import { applyActivityEffect } from './activities.js';
import { trackEvent, serializeGoals } from './goals.js';
import { trackTeamEvent } from './team-goals.js';
import {
  broadcastCoins, broadcastCollection, broadcastProgress,
  broadcastUpgrades, broadcastTeam, broadcastInventory,
  broadcastPetState, getTeamGrowthBonus
} from './rooms.js';
import { answerPetQuestion } from './pet-system.js';
import {
  getUpgrade, getUpgradeCost,
  getGrowthBonus, getLuckBonus, getIncomeBonus
} from '../shared/upgrades.js';
import { getWorldState, getGrowthMultiplier } from '../shared/world.js';
import { aggregateRoleBonuses } from '../shared/roles.js';
import { getMutation, getRandomMutation } from '../shared/mutations.js';
import { PACKS, rollPack } from '../shared/packs.js';
import { ACTION_DURATION, HARVEST_MUTATION_RETURN_CHANCE, TREE_NEXT_LEVEL_MULT } from '../shared/balance.js';
import {
  addToCollection, addCoins, addInventory, incrementStat
} from './player-profiles.js';

function applyTeamEvent(io, code, room, event) {
  const result = trackTeamEvent(room, event);
  if (!result) return;
  
  broadcastTeam(io, code, room);
  
  if (result.completed) {
    if (result.reward.coins > 0) broadcastCoins(io, code, room);
    io.to(code).emit('team-completed', {
      goal: result.goal.text,
      reward: result.reward.text
    });
  }
}

export function handleTileAction(io, socket, room, code, data) {
  const { tileX, tileY, action, seedId } = data || {};
  const playerId = socket.handshake.auth.playerId || socket.id;

  if (room.playerJobs.has(playerId)) {
    socket.emit('action-rejected', { reason: 'Подождите, действие выполняется' });
    return;
  }

  if (!Number.isInteger(tileX) || !Number.isInteger(tileY)) return;
  if (tileX < 0 || tileX > 7 || tileY < 0 || tileY > 7) return;
  if (!['plant', 'water', 'harvest'].includes(action)) return;

  const prev = room.players.get(playerId) || { x: 1, y: 1 };
  const fromX = prev.x, fromY = prev.y;
  // НЕ двигаем сразу — только после успеха в applyTileEffect

  const duration = ACTION_DURATION[action];
  const job = {
    action,
    tileKey: `${tileX},${tileY}`,
    seedId,
    endsAt: Date.now() + duration,
    timeoutId: null,
  };
  room.playerJobs.set(playerId, job);

  // Cancel any pending timeout for this player before starting a new action
  const prevJob = room.playerJobs.get(playerId);
  if (prevJob && prevJob.timeoutId) {
    clearTimeout(prevJob.timeoutId);
    prevJob.timeoutId = null;
  }

  io.to(code).emit('action-started', {
    playerId, fromX, fromY, tileX, tileY, action, duration,
  });

  job.timeoutId = setTimeout(() => {
    if (!room.playerJobs.has(playerId)) return;
    room.playerJobs.delete(playerId);
    const ok = applyTileEffect(io, socket, room, code, { tileX, tileY, action, seedId });
    if (ok) {
      room.players.set(playerId, { x: tileX, y: tileY });
      io.to(code).emit('action-completed', { playerId, tileX, tileY, action });
    }
    // при !ok — action-rejected уже отправлен из applyTileEffect, позиция не меняется
  }, duration);
}

export function applyTileEffect(io, socket, room, code, data) {
  const { tileX, tileY, action, seedId } = data || {};
  if (!Number.isInteger(tileX) || !Number.isInteger(tileY)) return false;
  if (tileX < 0 || tileX > 7 || tileY < 0 || tileY > 7) return false;
  if (!['plant', 'water', 'harvest'].includes(action)) return false;

  const key = `${tileX},${tileY}`;
  const tile = room.garden.get(key);
  const teamBonus = getTeamGrowthBonus(room);
  // ВАЖНО: множитель фазы мира должен совпадать с тем, по которому стадию
  // считают room tick / initial-state. Иначе UI показывает "созрело",
  // а сервер на сборе отвечает "ещё не созрело" — и сбор требует второго тапа.
  const phaseMult = (room.world && room.world.phase && room.world.phase.growthMult) || 1;
  const stage = getStage(tile, Date.now(), teamBonus, phaseMult);
  const playerId = socket.handshake.auth.playerId || socket.id;
  let earnedCoins = 0;
  let harvestedSeed = null;
  let harvestedMutIndex = null;
  let isNewSpecies = false;

  const roleBonus = aggregateRoleBonuses(Object.fromEntries(room.roles));

  if (action === 'plant') {
    if (tile !== null) {
      socket.emit('action-rejected', { key, action, reason: 'Грядка уже занята' });
      return false;
    }
    if (seedId == null || !room.inventory[seedId] || room.inventory[seedId] <= 0) {
      socket.emit('action-rejected', { key, action, reason: 'У вас нет такого семени!' });
      return false;
    }

    room.inventory[seedId]--;
    if (room.inventory[seedId] <= 0) delete room.inventory[seedId];
    broadcastInventory(io, code, room);

    const world = getWorldState();
    const worldMult = getGrowthMultiplier(world);
    // ФИКС: генерируем мутацию при посадке
    const mutationIndex = getRandomMutation(world, getLuckBonus(room.upgrades));

    const result = plantTile(room.garden, key, {
      seed: seedId,
      luckBonus: getLuckBonus(room.upgrades) + (world.season.luckBonus || 0),
      growthBonus: getGrowthBonus(room.upgrades) + roleBonus.growth + (1 - 1 / worldMult),
      mutationIndex
    });

    trackEvent(room, playerId, 'plant');

    // ПРОФИЛЬ: добавляем вид в коллекцию, если новый
    if (!room.collection.has(seedId)) {
      addToCollection(playerId, seedId);
    }
    incrementStat(playerId, 'plantsPlanted');

    if (result && result.mutationIndex !== null) {
      const mut = getMutation(result.seed, result.mutationIndex);
      if (mut) {
        socket.emit('mutation-toast', {
          name: mut.name,
          color: mut.type === 'gold' ? '#ffd54f' : mut.type === 'glow' ? '#b39ddb' : '#ffffff'
        });
      }
    }
  } else if (action === 'water') {
    if (!tile) {
      socket.emit('action-rejected', { key, action, reason: 'Сначала посадите семя' });
      return false;
    }
    if (stage === 3) {
      socket.emit('action-rejected', { key, action, reason: 'Растение уже созрело' });
      return false;
    }
    const waterDuration = 60000 * (1 + roleBonus.waterDuration);
    waterTile(room.garden, key, waterDuration);
    trackEvent(room, playerId, 'water');
  } else if (action === 'harvest') {
    if (!tile || stage !== 3) {
      socket.emit('action-rejected', { key, action, reason: 'Растение ещё не созрело' });
      return false;
    }
    const result = harvestTile(room.garden, key, teamBonus, phaseMult);

    const world = getWorldState();
    const incomeBonus = getIncomeBonus(room.upgrades) + (room.incomeBonusPermanent || 0) +
                        (world.season.incomeBonus || 0) + (world.season.priceBonus || 0) +
                        roleBonus.income;

    let basePrice = result.price;
    harvestedSeed = result.seed;
    harvestedMutIndex = result.mutationIndex;

    if (harvestedMutIndex !== null) {
      const mut = getMutation(harvestedSeed, harvestedMutIndex);
      if (mut) {
        if (mut.type === 'gold' || mut.type === 'rainbow' || mut.type === 'size') {
          basePrice *= mut.mult;
        }

        const mutId = `mut_${harvestedSeed}_${harvestedMutIndex}`;
        if (!room.collection.has(mutId)) {
          room.collection.add(mutId);
          broadcastCollection(io, code, room);
        }
      }
    }

    earnedCoins = Math.round(basePrice * (1 + incomeBonus));
    room.coins += earnedCoins;

    if (!room.tree) room.tree = { level: 0, progress: 0, nextLevelAt: 50 };
    room.tree.progress += 1;
    if (room.tree.progress >= room.tree.nextLevelAt) {
      room.tree.level += 1;
      room.tree.progress = 0;
      room.tree.nextLevelAt = Math.floor(room.tree.nextLevelAt * TREE_NEXT_LEVEL_MULT);
      io.to(code).emit('tree-level-up', { level: room.tree.level });
    }

    trackEvent(room, playerId, 'harvest');
    applyTeamEvent(io, code, room, 'harvest');

    // ПРОФИЛЬ: начисление монет и статистика
    if (earnedCoins > 0) {
      addCoins(playerId, earnedCoins);
      incrementStat(playerId, 'plantsHarvested');
    }

    if (harvestedSeed != null) {
      isNewSpecies = !room.collection.has(harvestedSeed);
      if (isNewSpecies) {
        room.collection.add(harvestedSeed);
        trackEvent(room, playerId, 'newSpecies');
        applyTeamEvent(io, code, room, 'newSpecies');
        broadcastCollection(io, code, room);
      }

      // СТРАХОВОЧНАЯ СЕТКА: 20% шанс вернуть семя
      if (Math.random() < HARVEST_MUTATION_RETURN_CHANCE) {
        room.inventory[harvestedSeed] = (room.inventory[harvestedSeed] || 0) + 1;
        broadcastInventory(io, code, room);
        socket.emit('activity-result', { message: '✨ Бонус: семя вернулось в инвентарь!' });
      }
    }
  }

  const updated = room.garden.get(key);
  const { stage: newStage, progress } = computeState(updated, Date.now(), teamBonus, phaseMult);

  io.to(code).emit('tile-updated', {
    key, stage: newStage, progress, seed: updated?.seed ?? null,
    mutationIndex: updated?.mutationIndex ?? null,
    action, byPlayer: playerId, earnedCoins, harvestedSeed, harvestedMutIndex,
    isNewSpecies: action === 'harvest' ? isNewSpecies : false
  });

  if (earnedCoins > 0) broadcastCoins(io, code, room);
  socket.emit('goals-updated', { goals: serializeGoals(room, playerId) });
  return true;
}

export function handleActivityAction(io, socket, room, code, data) {
  const playerId = socket.handshake.auth.playerId || socket.id;
  const { activityId } = data || {};
  const activity = room.activities.get(activityId);
  if (!activity) {
    socket.emit('activity-result', { message: 'Активность уже исчезла' });
    return;
  }
  
  const result = applyActivityEffect(room, activity, getTeamGrowthBonus(room));
  room.activities.delete(activityId);
  io.to(code).emit('activity-removed', { activityId });
  
  if (result.coins > 0) {
    room.coins += result.coins;
    broadcastCoins(io, code, room);
  }
  if (result.affectedTiles.length > 0) broadcastProgress(io, code, room);
  
  trackEvent(room, playerId, 'activity');
  applyTeamEvent(io, code, room, 'activity');
  
  socket.emit('goals-updated', { goals: serializeGoals(room, playerId) });
  socket.emit('activity-result', {
    type: activity.type, coins: result.coins, message: result.message
  });
}

export function handleUpgradeBuy(io, socket, room, code, data) {
  const playerId = socket.handshake.auth.playerId || socket.id;
  const { upgradeId } = data || {};
  if (typeof upgradeId !== 'string') return;
  const def = getUpgrade(upgradeId);
  if (!def) return;
  
  const current = room.upgrades[upgradeId] || 0;
  if (current >= def.maxLevel) {
    socket.emit('upgrade-rejected', { reason: 'Максимальный уровень' });
    return;
  }
  
  const baseCost = getUpgradeCost(upgradeId, current);
  const maxDiscount = 0.8; // Максимум 80% скидки
  const discount = Math.min(room.upgradeDiscount || 0, maxDiscount);
  const cost = Math.round(baseCost * (1 - discount));
  if (room.coins < cost) {
    socket.emit('upgrade-rejected', { reason: 'Недостаточно монет' });
    return;
  }
  
  room.coins -= cost;
  room.upgrades[upgradeId] = current + 1;
  
  trackEvent(room, playerId, 'upgrade');
  applyTeamEvent(io, code, room, 'upgrade');
  
  broadcastUpgrades(io, code, room);
  socket.emit('goals-updated', { goals: serializeGoals(room, playerId) });
}

export function handleBuyPack(io, socket, room, code, data) {
  const playerId = socket.handshake.auth.playerId || socket.id;
  const { packId } = data || {};
  if (typeof packId !== 'string') return;
  if (!Object.prototype.hasOwnProperty.call(PACKS, packId)) return;
  const pack = PACKS[packId];
  if (!pack || typeof pack.price !== 'number' || typeof pack.count !== 'number') return;

  if (room.coins < pack.price) {
    socket.emit('buy-pack-result', { success: false, message: 'Недостаточно монет' });
    return;
  }

  room.coins -= pack.price;
  const seeds = rollPack(packId);

  for (const seed of seeds) {
    room.inventory[seed] = (room.inventory[seed] || 0) + 1;
  }

  broadcastCoins(io, code, room);
  broadcastInventory(io, code, room);
  
  // ПРОФИЛЬ: добавляем семена в личный инвентарь
  for (const seed of seeds) {
    addInventory(playerId, seed, 1);
  }

  socket.emit('buy-pack-result', { success: true, seeds, message: 'Пак открыт!' });
}

export function handleSetMessage(io, socket, room, code, data) {
  const { message } = data || {};
  if (typeof message !== 'string' || message.length > 50) return;
  room.signpostMessage = message;
  io.to(code).emit('signpost-updated', { message });
}

export function handlePetAnswer(io, socket, room, code, data) {
  const { answerText } = data || {};
  const playerId = socket.handshake.auth.playerId || socket.id;

  if (typeof answerText !== 'string' || answerText.trim().length === 0) {
    socket.emit('pet-answer-result', { ok: false, reason: 'Напишите ответ' });
    return;
  }

  const result = answerPetQuestion(room, playerId, answerText.trim());

  if (!result.ok) {
    socket.emit('pet-answer-result', { ok: false, reason: result.reason });
    return;
  }

  broadcastPetState(io, code, room);

  if (result.hatched) {
    io.to(code).emit('pet-hatched', {
      petId: room.pet.petId,
      petEmoji: room.pet.petEmoji,
      petName: room.pet.petName,
      petColor: room.pet.petColor
    });
  } else if (result.newDay) {
    io.to(code).emit('pet-new-day', { dayCount: result.dayCount });
  } else {
    io.to(code).emit('pet-answer-result', {
      ok: true,
      dayCount: result.dayCount,
      hatched: result.hatched
    });
  }
}
