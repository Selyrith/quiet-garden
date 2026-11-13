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
import { TOOLS } from './GameSceneActions.js';
import { rowCenters } from '../ui/Layout.js';
import { ICON } from '../ui/Icons.js';

// iconKey — нарисованная иконка (Icons.js), icon — запасной эмодзи,
// если текстуры почему-то нет (например, сцена не успела их запечь).
const TOOL_CONFIG = {
  plant:   { iconKey: ICON.seed,    icon: '🌱', label: 'Посадка',  color: DS.colors.tools.plant },
  water:   { iconKey: ICON.water,   icon: '💧', label: 'Полив',    color: DS.colors.tools.water },
  harvest: { iconKey: ICON.harvest, icon: '✂️', label: 'Сбор',     color: DS.colors.tools.harvest },
  hand:    { iconKey: ICON.hand,    icon: '🤲', label: 'Действие', color: DS.colors.tools.hand },
};

export const GameSceneUi = {
  createToolButtons() {
    // Геометрия — только из единой раскладки: никаких height-130 / height-80.
    const L = this.layout;
    const btnSize = L.toolbar.size;
    const gap = L.toolbar.gap;
    const y = L.toolbar.y;
    const centers = rowCenters(TOOLS.length, L.w / 2, y, btnSize, gap);

    this.toolButtons = new Map();

    Object.entries(TOOL_CONFIG).forEach(([id, cfg], i) => {
      const x = centers[i].x;
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
        
        // Тёмная обводка у КАЖДОЙ кнопки — приём референсов: предмет в мире
        // всегда имеет контур. Сверху она светлая (свет падает сверху).
        if (state === 'pressed') {
          fillColor = cfg.color.bg;
          borderColor = DS.colors.text.primary;
          borderWidth = 3;
        } else if (state === 'hover' || isActive) {
          fillColor = cfg.color.bg;
          borderColor = DS.colors.text.primary;
          borderWidth = isActive ? 3 : 2.5;
        } else {
          fillColor = 0xF7EFE1;
          borderColor = DS.colors.text.primary;
          borderWidth = 2.5;
        }
        
        drawRoundedRect(bg, -btnSize/2, -btnSize/2, btnSize, btnSize, DS.radius.md, fillColor, 1, borderColor, borderWidth);

        // Объём: тень снизу + светлый блик сверху. Плоские плашки читались
        // как веб-кнопки, а не как пояс инструментов в игре.
        bg.fillStyle(0x3D2E20, state === 'pressed' ? 0.10 : 0.20);
        bg.fillRoundedRect(-btnSize/2 + 2, btnSize/2 - 5, btnSize - 4, 5, 3);

        if (state !== 'pressed') {
          bg.fillStyle(0xFFFFFF, isActive ? 0.30 : 0.16);
          bg.fillRoundedRect(-btnSize/2 + 4, -btnSize/2 + 4, btnSize - 8, btnSize / 2 - 2, DS.radius.md - 2);
        } else {
          bg.fillStyle(0x2C1B10, 0.14);
          bg.fillRoundedRect(-btnSize/2 + 3, -btnSize/2 + 3, btnSize - 6, btnSize - 6, DS.radius.md - 1);
        }

        // Активный инструмент: золотое кольцо — сразу видно, чем работаешь.
        if (isActive) {
          bg.lineStyle(2.5, DS.hexToPhaser(DS.colors.brand.secondary), 0.95);
          bg.strokeRoundedRect(-btnSize/2 - 2.5, -btnSize/2 - 2.5, btnSize + 5, btnSize + 5, DS.radius.md + 2);
        }
      };
      drawBtn('idle');
      container.add(bg);

      // Иконка: нарисованная (Icons.js) вместо эмодзи. Размер подобран так,
      // чтобы визуально совпадать с прежним эмодзи — раскладка не меняется.
      const icon = (cfg.iconKey && this.textures.exists(cfg.iconKey))
        ? this.add.image(0, -4, cfg.iconKey).setDisplaySize(Math.round(btnSize * 0.5), Math.round(btnSize * 0.5))
        : this.add.text(0, -4, cfg.icon, { fontSize: `${btnSize * 0.45}px` }).setOrigin(0.5);
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

      this.toolButtons.set(id, { container, bg, icon, label, hit, cfg, drawBtn, baseY: y });
    });

    // Показываем все инструменты сразу
    this.toolButtons.forEach(({ container }) => container.setVisible(true));
  },

  selectTool(toolId) {
    // Onboarding step 3: finish when selecting water tool (check BEFORE changing tool)
    if (this.onboarding?.active && this.onboarding.step === 3 && toolId === 'water') {
      this.onboarding.finish();
    }
    this.selectedTool = toolId;

    // Показываем ВСЕ инструменты (не только активный), подсвечиваем активный
    this.toolButtons.forEach(({ container, bg, icon, label, cfg, drawBtn, baseY }, id) => {
      const isActive = id === toolId;
      
      container.setVisible(true); // все 4 кнопки всегда видны
      
      // Сброс hover-масштаба
      bg.setScale(1);
      drawBtn(isActive ? 'hover' : 'idle'); // active показываем как hover
      
      // Активный инструмент приподнимается на 5 px (и вместе с ним иконка
      // и хит-зона), чтобы выбор читался не только цветом.
      container.y = baseY + (isActive ? -5 : 0);

      if (label) {
        label.setColor(isActive ? cfg.color.label : DS.colors.text.muted);
        label.setFontStyle(isActive ? 'bold' : 'normal');
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