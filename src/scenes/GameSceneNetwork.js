import { getRole } from '../../shared/roles.js';
import { PackOpeningOverlay } from '../ui/PackOpeningOverlay.js';
import { updateAvatarLabel } from '../ui/PlayerAvatar.js';
import { findRemovedPlayers } from '../ui/PlayerList.js';

export const GameSceneNetwork = {
  setupNetworking() {
    const s = this.socket;
    if (!s) return;

    s.on('connect', () => { this.connected = true; });
    s.on('disconnect', () => { this.connected = false; this.showToast('Связь потеряна...'); });
    s.on('connect_error', (err) => { console.error('[GameScene] Socket connect_error:', err.message); this.showToast('Ошибка подключения: ' + err.message); });

    s.on('room-code', ({ roomCode }) => {
      this.roomCode = roomCode;
      if (this.topBar && this.topBar.roomCodeText) this.topBar.roomCodeText.setText(`КОД: ${roomCode}`);
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomCode);
      window.history.replaceState({}, '', url);
      this.showToast(`Комната ${roomCode}`);
    });

    s.on('initial-state', (data) => {
      const { garden, coins, collection, inventory, activities, upgrades, goals, roles, players, playerList, hostId, team, world, totalPlants, sinceLastSeen, pet } = data;
      this.updateCoins(coins ?? 0);
      this.totalPlants = totalPlants ?? 300;
      this.collection = new Set(collection ?? []);
      this.inventory = inventory ?? {};
      this.upgrades = upgrades ?? { growth: 0, luck: 0, income: 0 };
      this.goals = goals ?? null;
      this.roles = roles ?? {};
      this.players = players ?? [];
      // Подробный список (с никами и хостом). Если сервер его не прислал —
      // собираем из id, чтобы HUD не был пустым.
      this.playerList = Array.isArray(playerList) && playerList.length
        ? playerList
        : (this.players || []).map((id) => ({ id, nickname: 'Игрок', isHost: id === hostId }));
      this.hostId = hostId ?? null;
      this.team = team ?? null;
      this.myRole = this.roles[this.myPlayerId] || null;

      if (data.tree) {
        this.tree = data.tree;
        this.teamTreeLevel = data.tree.level;
        this.drawTeamTree(data.tree.level);
      }

      if (data.signpostMessage !== undefined) {
        this.currentSignpostRaw = data.signpostMessage || '';
        this.signpostText.setText(this.formatSignpost(this.currentSignpostRaw));
      }

      this.updateCollectionText();
      this.updatePlayerList();
      if (this.inventoryBar) this.inventoryBar.update(this.inventory, this.selectedSeedId);

      if (world) this.applyWorld(world);
      if (this.teamBar) this.updateTeamBar();

      for (const t of garden) {
        this.updateTile(t.key, t.stage, t.progress ?? 0, t.seed ?? null, true, t.mutationIndex ?? null);
        if (t.wetUntil && t.wetUntil > Date.now()) {
          this.markTileWet(t.key, t.wetUntil - Date.now());
        }
      }

      if (this.activityLayer) {
        this.activityLayer.clear();
        for (const a of (activities ?? [])) this.activityLayer.add(a);
      }
      this.updateActivityCount();
      if (data.playerPositions) {
        this.playerGenders.clear();
        for (const p of data.playerPositions) {
          this.playerPositions.set(p.id, { x: p.x, y: p.y });
          this.playerGenders.set(p.id, p.gender || 'male');
          this.ensureAvatar(p.id, this.roles[p.id], p.gender || 'male');
        }
      }
      // Подписи (ники) обновляем после создания аватаров.
      for (const p of this.playerList || []) {
        const av = this.avatars.get(p.id);
        if (av) updateAvatarLabel(av, p.nickname, !!p.isHost);
      }
      if (data.activeJobs) {
        for (const j of data.activeJobs) {
          const [tx, ty] = j.tileKey.split(',').map(Number);
          this.moveAvatarTo(j.playerId, tx, ty, j.remaining);
          this.showJobIndicator(j.playerId, tx, ty, j.action, j.remaining);
        }
      }
      if (pet) {
        this.pet = pet;
        this.updatePetBtn(pet);
        // Извлекаем свой ответ из состояния питомца (при перезаходе)
        if (this.myPlayerId && pet.answers) {
          const today = new Date().toISOString().slice(0, 10);
          const myAns = pet.answers.find(([pid]) => pid === this.myPlayerId);
          const serverAnswer = myAns && myAns[1]?.day === today ? myAns[1]?.answerText : null;
          if (serverAnswer !== null || !this.petMyAnswer) {
            this.petMyAnswer = serverAnswer;
          }
        }
        if (pet.stage === 'walking') {
          this.createPetSprite(pet);
        }
      }

      if (!this.myRole && !this.rolesPrompted) {
        this.rolesPrompted = true;
        this.openRoles(false);
      }

      // P2: "Пока вас не было" — показываем тост с дельтой
      if (sinceLastSeen && sinceLastSeen.readyCount > 0) {
        const mins = Math.round(sinceLastSeen.ms / 60000);
        const timeStr = mins < 60 ? `${mins} мин` : `${Math.round(mins / 60)} ч`;
        this.time.delayedCall(1500, () => {
          this.showToast(`Пока вас не было (${timeStr}): ${sinceLastSeen.readyCount} готовы к сбору`, 4000);
        });
      }
    });

    s.on('action-started', ({ playerId, fromX, fromY, tileX, tileY, action, duration }) => {
      const av = this.ensureAvatar(playerId, this.roles[playerId], this.playerGenders.get(playerId) || 'male');
      const start = this.avatarStandAt(fromX, fromY);
      av.setPosition(start.x, start.y);
      // НЕ трогаем this.playerPositions — сервер подтвердит позицию только при успехе
      this.moveAvatarTo(playerId, tileX, tileY, duration);
      this.showJobIndicator(playerId, tileX, tileY, action, duration);
      this.markPending(`${tileX},${tileY}`);
    });

    s.on('action-completed', ({ playerId, tileX, tileY, action }) => {
      const av = this.avatars.get(playerId);
      if (av) this.tweens.add({ targets: av.body, scaleX: 1.2, scaleY: 0.8, duration: 150, yoyo: true });
      this.hideJobIndicator(playerId);
      if (tileX != null && tileY != null) this.unmarkPending(`${tileX},${tileY}`);
      this.playerPositions.set(playerId, { x: tileX, y: tileY });
      if (playerId === this.myPlayerId && tileX != null && tileY != null) {
        if (action === 'plant') this.sound.plant();
        else if (action === 'water') this.sound.water();
        else if (action === 'harvest') this.sound.harvest();
      }
    });

    s.on('inventory-updated', ({ inventory }) => {
      this.inventory = inventory;
      if (this.selectedSeedId != null && !this.inventory[this.selectedSeedId]) {
        this.selectedSeedId = null;
      }
      if (this.inventoryBar) this.inventoryBar.update(this.inventory, this.selectedSeedId);
    });

    s.on('buy-pack-result', ({ success, seeds, message }) => {
      if (success) { this.sound.harvest(); new PackOpeningOverlay(this, seeds); }
      else { this.sound.error(); this.showToast(message); }
    });

    s.on('world-updated', ({ world }) => { if (world) this.applyWorld(world); });
    s.on('gender-updated', ({ playerId, gender }) => {
      this.playerGenders.set(playerId, gender);
      let av = this.avatars.get(playerId);
      if (!av) {
        // Fallback: аватар не создался в initial-state — создаём здесь
        av = this.ensureAvatar(playerId, this.roles[playerId], gender);
      } else {
        av.genderId = gender;
        const tex = gender === 'female' ? 'avatar-female' : 'avatar-male';
        if (av.body.texture.key !== tex) av.body.setTexture(tex);
      }
    });
    s.on('roles-updated', ({ roles }) => {
      this.myRole = this.roles[this.myPlayerId] || null;
      this.updatePlayerList();
      for (const [pid, roleId] of Object.entries(roles)) {
        const av = this.avatars.get(pid);
        if (av) tintAvatar(av, roleId);
      }
    });
    s.on('team-updated', ({ team }) => { this.team = team; if (this.teamBar) this.updateTeamBar(); });
    s.on('team-completed', ({ goal, reward }) => { this.sound.harvest(); this.showToast(`🏆 ${goal} — ${reward}`); });
    s.on('emote-shown', ({ playerId, emote }) => this.showEmote(playerId, emote));

    s.on('quick-message-shown', ({ playerId, text }) => {
      const pos = this.playerPositions.get(playerId);
      if (!pos) return;
      const c = this.getTileCenter(pos.x, pos.y);
      const container = this.add.container(c.x, c.y - 60).setDepth(400);
      const bg = this.add.rectangle(0, 0, 120, 28, 0x0f172a, 0.95).setStrokeStyle(1.5, 0x4fc3f7);
      const txt = this.add.text(0, 0, text, { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      container.add([bg, txt]);
      this.tweens.add({
        targets: container, y: c.y - 110, alpha: 0,
        duration: 3000, ease: 'Cubic.easeOut',
        onComplete: () => container.destroy()
      });
    });

    s.on('tile-updated', ({ key, stage, progress, seed, mutationIndex, action, byPlayer, earnedCoins, harvestedSeed, harvestedMutIndex, isNewSpecies }) => {
      this.updateTile(key, stage, progress ?? 0, seed ?? null, false, mutationIndex ?? null);
      if (byPlayer && byPlayer !== this.myPlayerId) {
        const roleId = this.roles[byPlayer];
        const role = roleId ? getRole(roleId) : null;
        this.flashTile(key, role ? role.color : 0xffffff);
      }
      if (action === 'plant') {
        if (byPlayer && byPlayer !== this.myPlayerId) {
          const [tx, ty] = key.split(',').map(Number);
          const c = this.getTileCenter(tx, ty);
          this.sound.playAt(`plant-remote-${key}`, 'actions/plant', { volume: 0.35, x: c.x, y: c.y });
        } else {
          this.sound.plant();
        }
      }
      if (action === 'water') {
        if (byPlayer && byPlayer !== this.myPlayerId) {
          const [tx, ty] = key.split(',').map(Number);
          const c = this.getTileCenter(tx, ty);
          this.sound.playAt(`water-remote-${key}`, 'actions/water', { volume: 0.3, x: c.x, y: c.y });
        } else {
          this.sound.water();
        }
        this.spawnParticles(key, 0x4fc3f7);
        this.markTileWet(key, 60000);
      }
      if (action === 'harvest') {
        if (byPlayer && byPlayer !== this.myPlayerId) {
          const [tx, ty] = key.split(',').map(Number);
          const c = this.getTileCenter(tx, ty);
          this.sound.playAt(`harvest-remote-${key}`, 'actions/harvest', { volume: 0.4, x: c.x, y: c.y });
        } else {
          this.sound.harvest();
        }
        this.spawnParticles(key, 0xffd54f);
      }
      if (earnedCoins > 0) this.spawnCoinPopup(key, earnedCoins);
      if (isNewSpecies) this.showToast('+1 новый вид в книге!');
    });

    s.on('coins-updated', ({ coins, tree }) => {
      this.updateCoins(coins);
      if (tree) {
        this.tree = tree;
        if (tree.level !== this.teamTreeLevel) {
          this.teamTreeLevel = tree.level;
          this.drawTeamTree(tree.level);
          this.tweens.add({ targets: this.teamTree, scaleX: 1.1, scaleY: 0.95, duration: 300, yoyo: true });
        }
      }
    });

    s.on('tree-level-up', ({ level }) => {
      this.teamTreeLevel = level;
      this.drawTeamTree(level);
      this.tweens.add({ targets: this.teamTree, alpha: 0.5, duration: 150, yoyo: true });
      if (this.showToast) this.showToast(`🌳 Дерево выросло! Уровень ${level}`);
    });

    s.on('signpost-updated', ({ message }) => {
      if (this.signpostText) {
        this.currentSignpostRaw = message || '';
        this.signpostText.setText(this.formatSignpost(this.currentSignpostRaw));
      }
      if (this.showToast) this.showToast('Записка обновлена!');
    });
    s.on('collection-updated', ({ seeds, total }) => { this.collection = new Set(seeds); this.totalPlants = total ?? this.totalPlants; this.updateCollectionText(); });
    s.on('upgrades-updated', ({ upgrades, coins }) => { this.upgrades = upgrades; if (coins != null) this.updateCoins(coins); if (this.upgradesOverlay) this.upgradesOverlay.update(this.coins, this.upgrades); });
    s.on('upgrade-rejected', ({ reason }) => { this.sound.error(); this.showToast(reason); });
    s.on('goals-updated', ({ goals }) => { this.goals = goals; if (this.goalsOverlay) this.goalsOverlay.update(goals); });

    s.on('daily-result', ({ ok, message }) => {
      const ov = this.goalsOverlay;
      if (ov) ov.isClaiming = false;
      this.sound.harvest();
      if (message) this.showToast(message);
    });
    s.on('quest-result', ({ message }) => { this.sound.harvest(); if (message) this.showToast(message); });
    s.on('tree-result',  ({ message }) => { this.sound.harvest(); if (message) this.showToast(message); });

    s.on('activity-spawned', ({ activity }) => { if (this.activityLayer) this.activityLayer.add(activity); this.updateActivityCount(); });
    s.on('activity-removed', ({ activityId }) => { if (this.activityLayer) this.activityLayer.remove(activityId); this.updateActivityCount(); });
    s.on('activity-result', ({ message }) => { if (message) { this.sound.harvest(); this.showToast(message); } });

    s.on('stage-updates', ({ updates }) => {
      for (const { key, stage, seed } of updates) {
        const tile = this.tiles.get(key);
        const nextProgress = stage >= 3 ? 1 : 0;
        if (tile) this.updateTile(key, stage, nextProgress, seed ?? tile.seed, false, tile.mutationIndex);
      }
    });
    
    s.on('progress-updates', ({ progress }) => { 
      for (const { key, progress: p } of progress) this.setProgress(key, p); 
    });
    
    s.on('action-rejected', ({ reason, key }) => {
      // откат визуала: убрать индикатор actions, рамку pending, вернуть аватар на последнюю известную позицию
      const pid = this.myPlayerId;
      this.hideJobIndicator(pid);
      if (key) this.unmarkPending(key);
      const pos = this.playerPositions.get(pid);
      const av = this.avatars.get(pid);
      if (av && pos) {
        const stand = this.avatarStandAt(pos.x, pos.y);
        this.tweens.add({ targets: av, x: stand.x, y: stand.y, duration: 200 });
      }
      this.sound.error();
      this.showToast(reason);
    });
    s.on('player-list', ({ players, hostId }) => {
      // Сервер шлёт список объектов: {id, nickname, x, y, gender, isHost}.
      // Старый формат (массив id) тоже поддерживаем.
      const raw = Array.isArray(players) ? players : [];
      const known = new Map((this.playerList || []).map((p) => [p.id, p]));
      this.playerList = raw.map((entry) => {
        if (typeof entry === 'string') {
          return { id: entry, nickname: known.get(entry)?.nickname || 'Игрок', isHost: entry === (hostId ?? this.hostId) };
        }
        return entry;
      });
      this.players = this.playerList.map((p) => p.id);
      if (hostId !== undefined) this.hostId = hostId ?? null;

      // Убираем аватары ушедших игроков — иначе они остаются на грядках.
      for (const goneId of findRemovedPlayers(this.avatars ? Array.from(this.avatars.keys()) : [], this.players)) {
        this.removeAvatar(goneId);
      }

      this.updatePlayerList();
      // Ники и позиции приходят вместе со списком: новый игрок должен
      // появиться у всех сразу, а не только у того, кто вошёл.
      for (const p of this.playerList || []) {
        if (p.x != null && p.y != null) {
          const knownPos = this.playerPositions.get(p.id);
          if (!knownPos || knownPos.x !== p.x || knownPos.y !== p.y) {
            this.playerPositions.set(p.id, { x: p.x, y: p.y });
            const av = this.ensureAvatar(p.id, this.roles[p.id], this.playerGenders.get(p.id) || p.gender || 'male');
            const stand = this.avatarStandAt(p.x, p.y);
            av.setPosition(stand.x, stand.y);
          }
        }
        const av = this.avatars.get(p.id);
        if (av) updateAvatarLabel(av, p.nickname, !!p.isHost);
      }
    });

    // Питомец: состояние обновлено
    s.on('pet-state-updated', ({ pet }) => {
      this.pet = pet;
      if (pet) {
        // Проверяем, отвечал ли я сегодня
        if (this.myPlayerId && pet.answers) {
          const today = new Date().toISOString().slice(0, 10);
          const myAns = pet.answers.find(([pid]) => pid === this.myPlayerId);
          const serverAnswer = myAns && myAns[1]?.day === today ? myAns[1]?.answerText : null;
          // Не сбрасываем оптимистичный ответ, если сервер ещё не прислал свои (ответы очищены после нового дня)
          if (serverAnswer !== null || !this.petMyAnswer) {
            this.petMyAnswer = serverAnswer;
          }
        }
        this.updatePetBtn(pet);
        if (pet.stage === 'walking') {
          this.createPetSprite(pet);
        } else if (pet.stage === 'egg' && this.petContainer) {
          this.petContainer.destroy();
          this.petContainer = null;
          this.petSprite = null;
          this.petShadow = null;
        }
      }
    });

    // Питомец вылупился
    s.on('pet-hatched', ({ petId, petEmoji, petName, petColor }) => {
      this.showToast(`🐣 ${petName} вылупился!`);
      this.pet = this.pet || {};
      this.pet.stage = 'walking';
      this.pet.petId = petId;
      this.pet.petEmoji = petEmoji;
      this.pet.petName = petName;
      this.pet.petColor = petColor;
      this.updatePetBtn(this.pet);
      this.createPetSprite(this.pet);
    });

    // Новый день вопросов
    s.on('pet-new-day', ({ dayCount }) => {
      this.showToast(`🥚 День вопросов ${dayCount}/3`);
    });

    // Результат ответа на вопрос питомца
    s.on('pet-answer-result', ({ ok, dayCount, hatched }) => {
      if (!ok) return;
      if (hatched) {
        // обработано через pet-hatched
      } else if (dayCount != null) {
        this.showToast(`🥚 Ответ принят. День ${dayCount}/3`);
      }
    });
  }
};
