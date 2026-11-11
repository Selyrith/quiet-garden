import { BookOverlay } from '../ui/BookOverlay.js';
import { UpgradesOverlay } from '../ui/UpgradesOverlay.js';
import { GoalsOverlay } from '../ui/GoalsOverlay.js';
import { RolesOverlay } from '../ui/RolesOverlay.js';
import { ShopOverlay } from '../ui/ShopOverlay.js';
import { MainMenuOverlay } from '../ui/MainMenuOverlay.js';
import { SettingsOverlay } from '../ui/SettingsOverlay.js';
import { updateTeamGoalBar } from '../ui/HudTeamBar.js';
import { updatePlayerList } from '../ui/PlayerList.js';

export const GameSceneUi = {
  selectTool(toolId) {
    this.selectedTool = toolId;

    for (const [id, entry] of this.toolButtons) {
      const { gfx, name, w, h, label } = entry;
      if (!gfx) continue;

      // Сброс hover-масштаба при смене инструмента
      gfx.setScale(1);
      gfx.clear();

      // Тень
      gfx.fillStyle(0x000000, 0.3);
      gfx.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 16);

      if (id === toolId) {
        gfx.fillStyle(0x2ecc71, 1);
        gfx.lineStyle(2, 0xffffff, 0.8);
        if (name) name.setColor('#ffffff');
        if (label) label.setScale(1.2);
      } else {
        gfx.fillStyle(0x1e293b, 0.95);
        gfx.lineStyle(2, 0x475569, 1);
        if (name) name.setColor('#94a3b8');
        if (label) label.setScale(1.0);
      }

      gfx.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
      gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    }

    if (this.inventoryBar) {
      this.inventoryBar.container.setVisible(toolId === 'plant');
    }

    this.updateHint();
  },

  updateHint() {
    if (!this.hintText) return;
    const map = {
      plant: 'Выберите семя внизу и тапните по грядке',
      water: 'Полейте растение, чтобы ускорить рост',
      harvest: 'Соберите созревший цветок',
      hand: 'Тапните по значку активности'
    };
    this.hintText.setText(map[this.selectedTool] || '');
  },

  updatePlayerList() {
    if (!this.playerListText) return;
    updatePlayerList(this.playerListText, this.players || [], this.roles || {}, this.myPlayerId);
  },

  updateTeamBar() {
    if (!this.teamBar) return;
    updateTeamGoalBar(this.teamBar, this.team);
    if (this.teamBar.container && this.cameras.main) {
      this.teamBar.container.setPosition(this.cameras.main.width / 2, 100);
    }
  },

  openBook() {
    if (this.bookOverlay) return;
    this.bookOverlay = new BookOverlay(this, this.collection);
    this.bookOverlay.once('destroy', () => { this.bookOverlay = null; });
  },

  openUpgrades() {
    if (this.upgradesOverlay) return;
    this.upgradesOverlay = new UpgradesOverlay(this, this.coins, this.upgrades);
    this.upgradesOverlay.once('destroy', () => { this.upgradesOverlay = null; });
  },

  openGoals() {
    if (this.goalsOverlay) return;
    if (!this.goals) {
      this.showToast('Цели ещё загружаются…');
      return;
    }
    this.goalsOverlay = new GoalsOverlay(this, this.goals);
    this.goalsOverlay.once('destroy', () => { this.goalsOverlay = null; });
  },

  openRoles() {
    if (this.rolesOverlay) return;
    this.rolesOverlay = new RolesOverlay(this, this.myRole);
    this.rolesOverlay.once('destroy', () => { this.rolesOverlay = null; });
  },

  openMenu() {
    if (this.menuOverlay) return;
    this.menuOverlay = new MainMenuOverlay(this, {
      onBook: () => { this.menuOverlay?.destroy(); this.openBook(); },
      onUpgrades: () => { this.menuOverlay?.destroy(); this.openUpgrades(); },
      onGoals: () => { this.menuOverlay?.destroy(); this.openGoals(); },
      onRoles: () => { this.menuOverlay?.destroy(); this.openRoles(); },
      onShop: () => { this.menuOverlay?.destroy(); this.openShop(); },
      onSettings: () => { this.menuOverlay?.destroy(); this.openSettings(); },
      onPause: () => { this.menuOverlay?.destroy(); this.pauseGame(); }
    });
    this.menuOverlay.once('destroy', () => { this.menuOverlay = null; });
  },

  openSettings() {
    if (this.settingsOverlay) return;
    this.settingsOverlay = new SettingsOverlay(this);
    this.events.once('settings-destroyed', () => { this.settingsOverlay = null; });
  }
};
