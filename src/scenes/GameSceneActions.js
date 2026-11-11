import { GameSceneNetwork } from './GameSceneNetwork.js';
import { ShopOverlay } from '../ui/ShopOverlay.js';

export const TOOLS = [
  { id: 'plant',   label: '🌱', name: 'Посадить', validFor: [-1] },
  { id: 'water',   label: '💧', name: 'Полить',   validFor: [0, 1, 2] },
  { id: 'harvest', label: '🌸', name: 'Собрать',  validFor: [3] },
  { id: 'hand',    label: '✋', name: 'Рука',     validFor: [] }
];

export const GameSceneActions = {
  ...GameSceneNetwork, // Подключаем сетевую логику

  copyRoomCode() {
    if (!this.roomCode) { this.showToast('Код ещё не готов'); return; }
    const url = `${window.location.origin}${window.location.pathname}?room=${this.roomCode}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => this.showToast('Ссылка скопирована')).catch(() => this.showToast(`Код: ${this.roomCode}`));
    } else this.showToast(`Код: ${this.roomCode}`);
  },

  openShop() {
    if (this.shopOverlay) return;
    this.shopOverlay = new ShopOverlay(this, this.coins);
    this.shopOverlay.once('destroy', () => { this.shopOverlay = null; });
  },

  handleTileTap(x, y) {
    // Onboarding step 2: тап по грядке (2,3)
    if (this.onboarding?.active && this.onboarding.step === 2) {
      const key = `${x},${y}`;
      const tile = this.tiles.get(key);
      if (key === '2,3' && tile && tile.stage === -1) {
        this.onboarding.next();
        // не return — чтобы посадка семени выполнилась обычной логикой ниже
      }
    }

    const key = `${x},${y}`;
    const tile = this.tiles.get(key);
    if (!tile) return;

    // Визуальный отклик на тап: вспышка + частицы
    this.flashTile(key, 0xffffff);
    this.spawnParticles(key, 0xffd54f);

    if (this.selectedTool === 'hand') {
      const activityId = this.activityLayer ? this.activityLayer.findByTile(key) : null;
      if (activityId) this.socket.emit('activity-action', { activityId });
      else { this.sound.error(); this.showToast('Здесь нет активности'); }
      return;
    }

    const tool = TOOLS.find((t) => t.id === this.selectedTool);
    if (!tool) return;

    if (!tool.validFor.includes(tile.stage)) {
      this.sound.error();
      const tip = tile.stage === -1 ? 'Сначала посадите семя' : tile.stage === 3 ? 'Растение готово — соберите его' : 'Сначала полейте растущее растение';
      this.showToast(tip);
      return;
    }

    // ФИКС: используем == null, чтобы разрешить seedId = 0 (валидный базовый вид).
    if (this.selectedTool === 'plant' && this.selectedSeedId == null) {
      this.sound.error();
      this.showToast('Выберите семя в инвентаре!');
      return;
    }

    // Onboarding step 3: выбор инструмента "water"
    if (this.onboarding?.active && this.onboarding.step === 3 && this.selectedTool === 'water') {
      this.onboarding.finish();
    }

    // ФИКС: tileY (а не y) — именно это поле ждёт сервер.
    this.socket.emit('tile-action', {
      tileX: x,
      tileY: y,
      action: this.selectedTool,
      seedId: this.selectedTool === 'plant' ? this.selectedSeedId : null
    });
  }
};
