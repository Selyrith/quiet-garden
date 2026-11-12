import { BookOverlay } from '../ui/BookOverlay.js';
import { UpgradesOverlay } from '../ui/UpgradesOverlay.js';
import { GoalsOverlay } from '../ui/GoalsOverlay.js';
import { RolesOverlay } from '../ui/RolesOverlay.js';
import { ShopOverlay } from '../ui/ShopOverlay.js';
import { MainMenuOverlay } from '../ui/MainMenuOverlay.js';
import { SettingsOverlay } from '../ui/SettingsOverlay.js';
import { updateTeamGoalBar } from '../ui/HudTeamBar.js';
import { updatePlayerList } from '../ui/PlayerList.js';
import { DS, drawRoundedRect, drawShadowedRect, createButtonStyle } from '../ui/DesignSystem.js';

const TOOL_CONFIG = {
  plant:   { icon: '🌱', label: 'Посадка', color: DS.colors.tools.plant },
  water:   { icon: '💧', label: 'Полив',   color: DS.colors.tools.water },
  harvest: { icon: '✂️', label: 'Сбор',    color: DS.colors.tools.harvest },
  hand:    { icon: '🤲', label: 'Действие', color: DS.colors.tools.hand },
};

export const GameSceneUi = {
  createToolButtons() {
    const W = this.scale.width;
    const btnSize = 56;
    const gap = 8;
    const totalW = 4 * btnSize + 3 * gap;
    const startX = W / 2 - totalW / 2 + btnSize / 2;
    const y = this.scale.height - 80; // выше инвентаря

    this.toolButtons = new Map();

    Object.entries(TOOL_CONFIG).forEach(([id, cfg], i) => {
      const x = startX + i * (btnSize + gap);
      const container = this.add.container(x, y).setDepth(DS.depth.toolbar);

      // Тень
      const shadow = this.add.graphics();
      drawShadowedRect(shadow, -btnSize/2, -btnSize/2 + 3, btnSize, btnSize, DS.radius.md, cfg.color.bg, 0.3, 'sm');
      container.add(shadow);

      // Фон кнопки
      const bg = this.add.graphics();
      const drawBtn = (state) => {
        bg.clear();
        let fillColor, borderColor, borderWidth;
        const isActive = this.selectedTool === id;
        
        if (state === 'pressed') {
          fillColor = cfg.color.bg;
          borderColor = cfg.color.icon;
          borderWidth = 3;
        } else if (state === 'hover' || isActive) {
          fillColor = cfg.color.bg;
          borderColor = cfg.color.icon;
          borderWidth = isActive ? 3 : 2;
        } else {
          fillColor = DS.colors.bg.tertiary;
          borderColor = DS.colors.ui.border;
          borderWidth = 1.5;
        }
        
        drawRoundedRect(bg, -btnSize/2, -btnSize/2, btnSize, btnSize, DS.radius.md, fillColor, 1, borderColor, borderWidth);
        
        // Блик
        if (state !== 'pressed') {
          bg.fillStyle(0xffffff, 0.1);
          bg.fillRoundedRect(-btnSize/2 + 4, -btnSize/2 + 4, btnSize - 8, btnSize/2 - 2, DS.radius.md - 2);
        }
      };
      drawBtn('idle');
      container.add(bg);

      // Иконка
      const icon = this.add.text(0, -4, cfg.icon, {
        fontSize: `${btnSize * 0.45}px`,
      }).setOrigin(0.5);
      container.add(icon);

      // Подпись
      const label = this.add.text(0, btnSize/2 - 10, cfg.label, {
        fontSize: `${DS.font.size.xs}px`,
        color: this.selectedTool === id ? cfg.color.label : DS.colors.text.muted,
        fontFamily: DS.font.family.base,
        fontWeight: DS.font.weight.medium,
      }).setOrigin(0.5, 1);
      container.add(label);

      // Хит-зона (48x48 minimum)
      const hit = this.add.rectangle(0, 0, DS.touchTarget.min, DS.touchTarget.min, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true })
        .setDepth(DS.depth.toolbar + 1);
      container.add(hit);

      hit.on('pointerdown', () => {
        if (this.sound) this.sound.uiClick?.();
        this.selectTool(id);
      });
      
      hit.on('pointerover', () => {
        if (this.selectedTool !== id) drawBtn('hover');
        if (this.showHint) this.showHint(`Инструмент: ${cfg.label}`);
        this.tweens.add({ targets: [bg, icon, label], scale: 1.05, duration: DS.motion.fast, ease: DS.motion.easing.decelerate });
      });
      
      hit.on('pointerout', () => {
        if (this.selectedTool !== id) drawBtn('idle');
        if (this.showHint) this.showHint('');
        this.tweens.add({ targets: [bg, icon, label], scale: 1, duration: DS.motion.fast, ease: DS.motion.easing.decelerate });
      });
      
      hit.on('pointerup', () => drawBtn('hover'));
      hit.on('pointerupoutside', () => drawBtn('idle'));

      this.toolButtons.set(id, { container, bg, icon, label, hit, cfg, drawBtn });
    });

    // Изначально скрываем инструменты (показываем при выборе 'plant')
    this.toolButtons.forEach(({ container }) => container.setVisible(false));
  },

  selectTool(toolId) {
    // Onboarding step 3: finish when selecting water tool (check BEFORE changing tool)
    if (this.onboarding?.active && this.onboarding.step === 3 && toolId === 'water') {
      this.onboarding.finish();
    }
    this.selectedTool = toolId;

    this.toolButtons.forEach(({ bg, icon, label, cfg, drawBtn }, id) => {
      const isActive = id === toolId;
      
      // Сброс hover-масштаба
      bg.setScale(1);
      drawBtn(isActive ? 'hover' : 'idle'); // active показываем как hover
      
      if (label) {
        label.setColor(isActive ? cfg.color.label : DS.colors.text.muted);
        label.setFontWeight(isActive ? DS.font.weight.bold : DS.font.weight.medium);
      }
    });

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
    const list = this.playerList && this.playerList.length
      ? this.playerList
      : (this.players || []).map((id) => ({ id, nickname: 'Игрок', isHost: id === this.hostId }));
    updatePlayerList(this.playerListText, list, this.roles || {}, this.myPlayerId);
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