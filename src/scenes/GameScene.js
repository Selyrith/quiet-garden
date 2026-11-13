import Phaser from 'phaser';
import { GameSceneActions } from './GameSceneActions.js';
import { GameSceneTiles } from './GameSceneTiles.js';
import { GameSceneUi } from './GameSceneUi.js';
import { ActivityLayer } from '../ui/ActivityLayer.js';
import { sound } from '../audio/SoundManager.js';
import { AmbienceManager } from '../audio/AmbienceManager.js';
import { drawBackground, updateSky } from '../ui/Background.js';
import { createWorldTint, applyWorldTint, worldIconsString } from '../ui/WorldTint.js';
import { createVignette } from '../ui/Vignette.js';
import { WeatherEffects } from '../ui/WeatherEffects.js';
import { AmbientEffects } from '../ui/AmbientEffects.js';
import { drawGrassTufts, createWetOverlay, updateGrassWind } from '../ui/TileDecor.js';
import { createTopBar } from '../ui/HudTopBar.js';
import { createTeamGoalBar } from '../ui/HudTeamBar.js';
import { createEmotesBar } from '../ui/HudEmotesBar.js';
import { InventoryBar } from '../ui/InventoryBar.js';
import { computeLayout, rowCenters } from '../ui/Layout.js';
import { createAvatar, tintAvatar, updateAvatarLabel } from '../ui/PlayerAvatar.js';
import { avatarStandPosition } from '../ui/avatar-layout.js';
import { generateAllPlantTextures } from '../ui/PlantTextureFactory.js';
import { escapeHtml } from '../ui/escapeHtml.js';
import { DS, drawRoundedRect, drawShadowedRect, createButtonStyle } from '../ui/DesignSystem.js';
import { getDailyQuestion } from '../../shared/pets.js';
import { Onboarding } from '../ui/Onboarding.js';
import { GenderSelectionOverlay } from '../ui/GenderSelectionOverlay.js';
import { StressMetrics } from '../telemetry/StressMetrics.js';

const GRID = 8;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init() {
    this.socket = this.registry.get('socket');
    this.myPlayerId = this.registry.get('playerId');
    this.roomCode = null;
    this.connected = false;
    this.rolesPrompted = false;
    this.initialStateReceived = false;

    this.tiles = new Map();
    this.gardenCache = new Map(); // client-side cache: key -> { stage, progress, seed, mutationIndex }
    // Уменьшили размер грядок с 50 до 42 для более аккуратного вида
    this.tileSize = 42;

    this.stressMetrics = new StressMetrics();
    this.stressMetrics.start();

    this.selectedTool = 'plant';
    this.selectedSeedId = null;
    this.myRole = null;
    this.roles = {};
    this.players = [];
    this.collection = new Set();
    this.inventory = {};
    this.upgrades = { growth: 0, luck: 0, income: 0 };
    this.coins = 0;
    this.goals = null;
    this.team = null;
    this.totalPlants = 300;
    this.lastWorld = null;

    this.sound = sound;
    this.ambience = null;

    this.bookOverlay = null;
    this.upgradesOverlay = null;
    this.goalsOverlay = null;
    this.shopOverlay = null;
    this.rolesOverlay = null;
    this.menuOverlay = null;
    this.emoteBar = null;
    this.onboarding = null;
    this.settingsOverlay = null;

    this.tree = { level: 0, progress: 0, nextLevelAt: 50 };
    this.teamTreeLevel = 0;
    this.teamTree = null;
    this.treeHit = null;
    this.treeOverlay = null;
    this.treePulseTween = null;
    this.treeMode = 'hudIcon';
    this.treeIconContainer = null;

    // Pet state
    this.pet = null;
    this.petMyAnswer = null; // текст своего ответа на сегодня (null если не отвечал)
    this.petContainer = null;
    this.petSprite = null;
    this.petShadow = null;
    this.petModal = null;
    this.petBtn = null;

    this.signpostDom = null;
    this.signpostBlocker = null;
    this.currentSignpostRaw = '';

    this.toolButtons = new Map();
    this.avatars = new Map();
    this.playerPositions = new Map();
    this.playerGenders = new Map();
    this.jobIndicators = new Map();

    // Watch mode state
    this.watchMode = false;
    this.hudContainers = [];
    this.watchCue = null;
    this.watchHit = null;
    this.watchCameraTween = null;
  }

  preload() {
    this.load.image('avatar-male', '/assets/images/avatar-male.svg');
    this.load.image('avatar-female', '/assets/images/avatar-female.svg');
  }

  create() {
    this.sound.init();
    this.ambience = new AmbienceManager(this.sound.ctx, this.sound.am);
    this.ambience.init();
    this.input.once('pointerdown', () => this.sound.resume());
    this.input.keyboard.once('keydown', () => this.sound.resume());

    // Record all player input for stress-indicator telemetry (calm test).
    this.input.on('pointerdown', () => this.stressMetrics.recordInput());
    this.input.keyboard.on('keydown', () => this.stressMetrics.recordInput());

    this.prefersReducedMotion = !!(
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    // Генерация всех текстур растений (300 текстур) - производительность!
    // ДОЛЖНО БЫТЬ В САМОМ НАЧАЛЕ, до drawGrid() и createTile()
    generateAllPlantTextures(this);

    // Создаем текстуру 'spark_particle' для партикл эмиттера
    if (!this.textures.exists('spark_particle')) {
      const g = this.make.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture('spark_particle', 8, 8);
      g.destroy();
    }

    this.bg = drawBackground(this);
    this.worldTint = createWorldTint(this);
    this.vignette = createVignette(this);

    // Партикл эмиттер для искр (один раз, вместо создания объектов каждый раз)
    this.sparkEmitter = this.add.particles(0, 0, 'spark_particle', {
      speed: { min: 50, max: 100 },
      scale: { start: 1, end: 0 },
      lifespan: 600,
      blendMode: 'ADD',
      emitting: false
    }).setDepth(8);

    const reduceMotion = this.prefersReducedMotion || localStorage.getItem('qg_reduce_motion') === '1';
    if (reduceMotion) {
      this.weather = { update: () => {}, setWeather: () => {}, resize: () => {}, dispose: () => {} };
      this.ambient = { update: () => {}, dispose: () => {} };
    } else {
      this.weather = new WeatherEffects(this);
      this.ambient = new AmbientEffects(this);
    }

    // Единая раскладка считается ОДИН раз на размер экрана.
    // От неё питаются все: сетка, HUD, тулбар, полка инвентаря, боковые кнопки.
    this.layout = computeLayout(this.scale.width, this.scale.height);
    this.tileSize = this.layout.grid.tileSize;

    this.drawGrid();
    this.activityLayer = new ActivityLayer(this, this.tileSize, this.tiles);
    this.createGardenDecor();
    this.avatarLayer = this.add.container(0, 0).setDepth(DS.depth.avatars);

    this.treeHit = this.add.rectangle(0, 0, 80, 120, 0x000000, 0.001)
      .setDepth(60).setInteractive({ useHandCursor: true });
    this.treeHit.on('pointerdown', () => {
      this.sound.click();
      // Bounce анимация
      this.tweens.add({
        targets: this.treeHit,
        scaleX: { from: 1, to: 1.1 },
        scaleY: { from: 1, to: 0.9 },
        duration: 60,
        yoyo: true,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.openTreeOverlay();
        }
      });
    });

    this.teamTree = this.add.graphics().setDepth(50);
    this.drawTeamTree(0);

    this.topBar = createTopBar(this, this.layout);
    if (this.topBar.menuBtn) this.topBar.menuBtn.on('pointerdown', () => this.openMenu());
    if (this.topBar.roomHit) this.topBar.roomHit.on('pointerdown', () => this.copyRoomCode());

    this.teamBar = createTeamGoalBar(this);
    if (this.teamBar && this.teamBar.container) {
      this.teamBar.container.setPosition(this.layout.w / 2, this.layout.hudH + 44);
    }

    // Всплывающие уведомления (под teamBar)
    this.toastText = this.add.text(this.layout.w / 2, this.layout.toastY, '', {
      fontSize: `${DS.font.size.sm}px`,
      color: DS.colors.brand.gold,
      fontFamily: DS.font.family.base,
      fontWeight: DS.font.weight.bold,
      backgroundColor: `${DS.colors.overlay.heavy}`,
      padding: { x: DS.spacing.md, y: DS.spacing.xs },
      wordWrap: { width: Math.min(this.scale.width - 40, 400) },
      align: 'center'
    }).setOrigin(0.5).setDepth(DS.depth.toasts).setAlpha(0);

    // Список игроков (левый верхний угол, под HUD)
    this.playerListText = this.add.text(this.layout.margin, this.layout.hudH + 6, '', {
      fontSize: `${DS.font.size.xs}px`, color: DS.colors.text.muted, fontFamily: DS.font.family.base, fontWeight: DS.font.weight.medium
    }).setDepth(DS.depth.hud + 1);

    // Деревянная табличка для записок (центр сверху, над всеми грядками)
    const sp = this.layout.signpost;
    const spW = sp.w, spH = sp.h;
    const spX = sp.x;
    const spY = sp.y;

    this.signpostBg = this.add.graphics();
    this.signpostBg.setDepth(1000).setScrollFactor(0);
    drawRoundedRect(this.signpostBg, spX - spW / 2, spY, spW, spH, DS.radius.sm, DS.colors.bg.elevated, 1, DS.colors.ui.border, 2);

    this.signpostText = this.add.text(spX, spY + spH / 2, this.formatSignpost(''), {
      fontSize: `${DS.font.size.xs}px`, color: DS.colors.text.secondary, fontFamily: DS.font.family.title, align: 'center'
    }).setOrigin(0.5).setDepth(1001).setScrollFactor(0);

    // Прозрачная зона клика — ровно под визуал
    this.signpostHit = this.add.rectangle(spX, spY + spH / 2, spW, spH, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(1002)
      .setScrollFactor(0);
    this.signpostHit.on('pointerover', () => { this.input.setDefaultCursor('pointer'); });
    this.signpostHit.on('pointerout', () => { this.input.setDefaultCursor('default'); });
    this.signpostHit.on('pointerdown', () => {
      this.openSignpostEditor();
    });

    // 3. Подсказка (внизу, над кнопками)
    this.hintText = this.add.text(this.layout.w / 2, this.layout.hintY, '', {
      fontSize: `${DS.font.size.sm}px`,
      color: DS.colors.text.primary,
      fontFamily: DS.font.family.base,
      fontWeight: DS.font.weight.medium,
      backgroundColor: `${DS.colors.overlay.medium}`,
      padding: { x: DS.spacing.md, y: DS.spacing.xs }
    }).setOrigin(0.5).setDepth(DS.depth.hint);

    GameSceneUi.createToolButtons.call(this);
    this.selectTool = GameSceneUi.selectTool.bind(this);
    this.openMenu = GameSceneUi.openMenu.bind(this);
    this.copyRoomCode = GameSceneActions.copyRoomCode.bind(this);

    this.inventoryBar = new InventoryBar(this, this.layout);
    this.inventoryBar.container.setVisible(false);

    this.createEmoteButton();
    this.createWatchButton();
    this.createPetButton();
    this._registerHudContainers();
    this.setupNetworking();

    this.socket.emit('join-room', {
      roomCode: this.registry.get('roomCode') || undefined
    });

    // Debounce для ресайза (защита от дребезга при открытии клавиатуры на Android)
    this.resizeTimeout = null;
    this.onScaleResize = () => {
      if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.handleResize(), 150);
    };
    this.scale.on('resize', this.onScaleResize);

    this.onVisibility = () => {
      if (document.hidden) this.pauseGame();
    };
    document.addEventListener('visibilitychange', this.onVisibility);

    this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    this.events.on('pause', () => this.sound.pause());
    this.events.on('resume', () => this.sound.resumeFromPause());
    this.events.once('shutdown', () => this.cleanup());

    this.wetEvent = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => this.refreshWetVisuals()
    });

    this.selectTool('plant');

    // Gender selection overlay — показываем перед обучением
    const savedGender = this.registry.get('playerGender') || localStorage.getItem('qg_player_gender') || 'male';
    if (!this.registry.get('playerGender') && !localStorage.getItem('qg_player_gender')) {
      this.genderOverlay = new GenderSelectionOverlay(this, (gender) => {
        this.registry.set('playerGender', gender);
        this.genderOverlay = null;
        this.onboarding = new Onboarding(this);
        this.onboarding.start();
      });
    } else {
      this.registry.set('playerGender', savedGender);
      // Отправляем сохранённый пол на сервер, чтобы аватар создался правильный
      this.socket?.emit('gender-set', { gender: savedGender });
      this.onboarding = new Onboarding(this);
      this.onboarding.start();
    }
  }

  update(_time, delta) {
    this.tickTiles(delta);
    // Ветер: покачивание травы на пустых грядках
    if (this.tiles && !this.watchMode) {
      updateGrassWind(this, this.tiles, delta);
    }
    // Позиция слушателя для пространственного аудио — за игроком (первый аватар или центр)
    if (this.sound) {
      const pos = this.playerPositions.get(this.myPlayerId);
      const c = pos ? this.getTileCenter(pos.x, pos.y) : { x: this.scale.width / 2, y: this.scale.height / 2 };
      this.sound.updateListener(c.x, c.y);
    }
    this.stressMetrics.tick();
  }

  drawGrid() {
    const totalSize = this.tileSize * GRID;
    // Сетка вписана в остаток экрана; координаты — только из единой раскладки.
    const offsetX = this.layout.grid.x;
    const offsetY = this.layout.grid.y;

    this.gridOrigin = { x: offsetX, y: offsetY, size: totalSize };

    // Деревянная рамка вокруг всего сада + дорожки между грядками (cozy frame)
    this.savedFrameRect = this.add.rectangle(offsetX + totalSize / 2, offsetY + totalSize / 2, totalSize + 16, totalSize + 16, 0x3e2723)
      .setStrokeStyle(4, 0x8d6e63)
      .setDepth(0);
    if (!this.gardenPaths) this.gardenPaths = this.add.graphics().setDepth(0);
    this.gardenPaths.clear();
    this.gardenPaths.lineStyle(2, 0xc9a884, 0.28);
    this.gardenPaths.strokeRoundedRect(offsetX - 3, offsetY - 3, totalSize + 6, totalSize + 6, 10);
    this.gardenPaths.lineStyle(1, 0x8d6e63, 0.18);
    for (let i = 1; i < GRID; i++) {
      this.gardenPaths.lineBetween(offsetX + i * this.tileSize, offsetY + 2, offsetX + i * this.tileSize, offsetY + totalSize - 2);
      this.gardenPaths.lineBetween(offsetX + 2, offsetY + i * this.tileSize, offsetX + totalSize - 2, offsetY + i * this.tileSize);
    }

    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        this.createTile(x, y, offsetX + x * this.tileSize, offsetY + y * this.tileSize);
      }
    }
  }

  createTile(x, y, cx, cy) {
    const key = `${x},${y}`;
    const size = this.tileSize;

    // Объёмная грядка: контейнер с текстурой земли + прозрачная зона клика.
    // Контейнер позиционируется в world-центре тайла; всё внутри рисуется
    // в локальных координатах (центр = 0,0).
    const tileContainer = this.add.container(cx + size / 2, cy + size / 2).setDepth(1);

    // Текстура земли — рисуется в локальных координатах относительно центра.
    const dirt = this.add.graphics();
    // Лёгкая тёмная эллипса — тень на земле, придаёт объём.
    dirt.fillStyle(0x2c1b10, 0.4);
    dirt.fillEllipse(0, 4, size - 6, size - 14);
    // Основной слой земли.
    dirt.fillStyle(0x4a2f1f, 1);
    dirt.fillRoundedRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4, 8);
    // Бороздки — детализация поверхности.
    dirt.lineStyle(1.5, 0x2f1c14, 0.5);
    dirt.lineBetween(-size / 3, -size / 4, size / 3, -size / 4);
    dirt.lineBetween(-size / 3, 0, size / 3, 0);
    dirt.lineBetween(-size / 3, size / 4, size / 3, size / 4);
    // Обводка земли.
    dirt.lineStyle(2, 0x2f1c14, 0.8);
    dirt.strokeRoundedRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4, 8);
    tileContainer.add(dirt);

    // Прозрачная зона клика поверх земли — обрабатывает клик по грядке.
    const hitZone = this.add.rectangle(0, 0, size, size, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => this.handleTileTap(x, y));
    tileContainer.add(hitZone);

    // Трава и влажный оверлей переносятся в контейнер
    // (координаты заданы относительно центра контейнера).
    const grassGfx = drawGrassTufts(this, 0, 0, size, x * 31 + y * 7 + 1);
    grassGfx.setDepth(2);
    tileContainer.add(grassGfx);

    // seed для капель зависит от координат тайла, чтобы капли были уникальными.
    const wetOverlay = createWetOverlay(this, 0, 0, size, x * 31 + y * 7 + 7);
    wetOverlay.setDepth(3);
    wetOverlay.setVisible(false);
    tileContainer.add(wetOverlay);

    // Тонкая рамка-обводка в world-координатах: именно её цвет меняется
    // через setStrokeStyle (подсветка ожидания действия, цвет растения и т.п.).
    // Прозрачная заливка — текстура земли просвечивает.
    const rect = this.add.rectangle(cx + size / 2, cy + size / 2, size - 4, size - 4, 0x000000, 0)
      .setStrokeStyle(2, 0x5d4037)
      .setDepth(2);

    const barBg = this.add.rectangle(cx + size / 2, cy + size - 8, size - 12, 4, 0x1a1a1a, 0.7).setDepth(6);
    const bar = this.add.rectangle(cx + size / 2 - (size - 12) / 2, cy + size - 8, 0, 4, 0x4fc3f7)
      .setOrigin(0, 0.5).setDepth(7);
    barBg.setVisible(false);
    bar.setVisible(false);

    // Используем Image с готовой текстурой вместо Graphics (оптимизация)
    const plantImage = this.add.image(cx + size / 2, cy + size / 2 + size * 0.35, 'plant_0')
      .setOrigin(0.5, 1) // Низ по центру (текстура 64x64)
      .setVisible(false)
      .setDepth(8);

    // Тень создается один раз как Image (оптимизация)
    const shadowImage = this.add.ellipse(cx + size / 2, cy + size / 2 + size * 0.35, size * 0.65, size * 0.25, 0x000000, 0.3)
      .setDepth(7).setVisible(false);

    this.tiles.set(key, {
      container: tileContainer,
      dirt,
      rect,
      grassGfx,
      wetOverlay,
      hitZone,
      barBg,
      bar,
      plantImage,
      shadowImage,
      stage: -1,
      progress: 0,
      seed: null,
      mutationIndex: null,
      currentScale: 1,
      targetScale: 1,
      currentShadowScale: 0.1,
      targetShadowScale: 0.1,
      wetUntil: 0,
      swayTween: null,
      bloomFX: null,
      wetTween: null
    });
  }

  createEmoteButton() {
    const S = this.layout.side;
    const x = S.emoteX ?? S.x;
    const y = S.emoteY;
    this.emoteBtn = this.add.text(x, y, '😊', {
      fontSize: '28px'
    }).setOrigin(0.5).setDepth(150).setInteractive({ useHandCursor: true });
    const btn = this.emoteBtn;

    btn.on('pointerdown', () => {
      if (this.emoteBar) {
        try { this.emoteBar.destroy(); } catch {}
        this.emoteBar = null;
        return;
      }
      this.emoteBar = createEmotesBar(this,
        (emote) => { this.socket.emit('emote', { emote }); },
        (text) => { this.socket.emit('quick-message', { text }); }
      );
      this.emoteBar.once('destroy', () => { this.emoteBar = null; });
    });
  }

  createWatchButton() {
    const S = this.layout.side;
    this.watchBtn = this.add.text(S.watchX ?? S.x, S.watchY, '👁️', {
      fontSize: '28px'
    }).setOrigin(0.5).setDepth(150).setInteractive({ useHandCursor: true });

    const btn = this.watchBtn;

    // Подсказка при наведении
    btn.on('pointerover', () => {
      if (!this.watchMode) this.showHint('Режим наблюдения — смотреть и слушать сад');
    });
    btn.on('pointerout', () => {
      if (!this.watchMode) this.showHint('');
    });

    btn.on('pointerdown', () => {
      if (this.watchMode) {
        this.exitWatchMode();
        this.showHint('');
      } else {
        this.enterWatchMode();
        this.showHint('Нажмите в любом месте, чтобы выйти');
      }
    });
  }

  showHint(text) {
    if (!this.hintText) return;
    this.hintText.setText(text);
  }

  createPetButton() {
    const S = this.layout.side;
    this.petBtn = this.add.text(S.petX ?? S.x, S.petY, '🥚', {
      fontSize: '28px'
    }).setOrigin(0.5).setDepth(150).setInteractive({ useHandCursor: true });

    const btn = this.petBtn;

    btn.on('pointerover', () => {
      if (this.pet && this.pet.stage === 'walking') {
        this.showHint(`${this.pet.petEmoji} ${this.pet.petName} гуляет по саду`);
      } else {
        this.showHint('Яйцо питомца — нажмите, чтобы ответить на вопрос');
      }
    });
    btn.on('pointerout', () => {
      this.showHint('');
    });

    btn.on('pointerdown', () => {
      this.sound.click();
      if (this.petModal) return; // уже открыто
      if (!this.pet || this.pet.stage === 'egg') {
        this.openPetQuestionModal();
      } else if (this.pet.stage === 'walking') {
        this.showHint(`${this.pet.petEmoji} ${this.pet.petName} просто прогуливается`);
      }
    });
  }

  openPetQuestionModal() {
    if (this.petModal) return;
    const w = this.scale.width;
    const h = this.scale.height;
    const panelW = Math.min(360, w - 40);
    const panelH = 440;
    const px = w / 2 - panelW / 2;
    const py = h / 2 - panelH / 2;

    const modalGroup = [];

    // Фон за панелью (полупрозрачный overlay на весь экран)
    const backdrop = this.add.rectangle(0, 0, w, h, 0x000000, 0.5)
      .setOrigin(0).setDepth(1999).setScrollFactor(0);
    modalGroup.push(backdrop);

    // Панель модала
    const panel = this.add.graphics().setDepth(2000).setScrollFactor(0);
    panel.fillStyle(0x0f172a, 0.98);
    panel.fillRoundedRect(px, py, panelW, panelH, 16);
    panel.lineStyle(3, UNIFIED.color, 1);
    panel.strokeRoundedRect(px, py, panelW, panelH, 16);
    modalGroup.push(panel);

    // Яйцо питомца (центр вверху панели)
    const eggText = this.add.text(w / 2, py + 60, '🥚', { fontSize: '72px' })
      .setOrigin(0.5).setDepth(2001).setScrollFactor(0);
    modalGroup.push(eggText);

    const eggLabel = this.add.text(w / 2, py + 115, 'Яйцо питомца', {
      fontSize: '16px', color: '#f7ecd2', fontStyle: 'bold', fontFamily: 'Nunito, sans-serif'
    }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);
    modalGroup.push(eggLabel);

    // Статистика: сколько дней ответили из 3
    const daysText = this.pet ? `День ${this.pet.daysAnswered}/3` : 'День 0/3';
    const statsText = this.add.text(w / 2, py + 145, daysText, {
      fontSize: '13px', color: '#d8a494', fontStyle: 'bold', fontFamily: 'Nunito, sans-serif'
    }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);
    modalGroup.push(statsText);

    // Вопрос
    const dayIndex = Math.floor(Date.now() / (10 * 60 * 1000)) % 10;
    const question = getDailyQuestion(dayIndex);

    const qLabel = this.add.text(w / 2, py + 175, 'Вопрос для вас двоих:', {
      fontSize: '12px', color: '#94a3b8', fontFamily: 'Nunito, sans-serif'
    }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);
    modalGroup.push(qLabel);

    const qText = this.add.text(w / 2, py + 200, question.q, {
      fontSize: '16px', color: '#f7ecd2', fontStyle: 'bold', fontFamily: 'Nunito, Georgia, serif', align: 'center'
    }).setOrigin(0.5).setWordWrapWidth(panelW - 60).setDepth(2001).setScrollFactor(0);
    modalGroup.push(qText);

    // Поле ввода ответа (DOM input поверх Phaser, позиция на экране)
    const inputHtml = `
      <div style="text-align: center; font-family: 'Nunito', sans-serif;">
        <input type="text" id="petAnswerInput" maxlength="100"
          placeholder="Ваш ответ..."
          style="
            width: ${Math.min(panelW - 80, 260)}px;
            padding: 10px 14px;
            font-size: 15px;
            border: 2px solid #d8a494;
            border-radius: 10px;
            background: #1e293b;
            color: #f7ecd2;
            text-align: center;
            outline: none;
          " autofocus />
      </div>
    `;

    const inputEl = this.add.dom(w / 2, py + 260).createFromHTML(inputHtml)
      .setDepth(2002).setOrigin(0.5).setScrollFactor(0);
    modalGroup.push(inputEl);

    // Кнопка отправить — крупная, под полем ввода
    const sendY = py + 315;
    const sendGfx = this.add.graphics().setDepth(2002).setScrollFactor(0);
    sendGfx.fillStyle(UNIFIED.color, 1);
    sendGfx.fillRoundedRect(w / 2 - 80, sendY - 20, 160, 44, 12);
    modalGroup.push(sendGfx);

    const sendLabel = this.add.text(w / 2, sendY, 'Отправить', {
      fontSize: '15px', color: '#0f172a', fontStyle: 'bold', fontFamily: 'Nunito, sans-serif'
    }).setOrigin(0.5).setDepth(2003).setScrollFactor(0);
    modalGroup.push(sendLabel);

    const sendHit = this.add.rectangle(w / 2, sendY, 160, 44, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true }).setDepth(2004).setScrollFactor(0);
    modalGroup.push(sendHit);

    // Кнопка закрытия (X) — правый верхний угол панели, крупная, с фоном
    const closeX = px + panelW - 32;
    const closeY = py + 32;
    const closeBg = this.add.circle(closeX, closeY, 22, UNIFIED.color, 0.2)
      .setStrokeStyle(2, UNIFIED.color, 0.5)
      .setDepth(2003).setScrollFactor(0);
    modalGroup.push(closeBg);

    const closeHit = this.add.rectangle(closeX, closeY, 40, 40, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true }).setDepth(2004).setScrollFactor(0);
    modalGroup.push(closeHit);

    const closeLabel = this.add.text(closeX, closeY, '✕', {
      fontSize: '26px', color: '#f7ecd2', fontStyle: 'bold', fontFamily: 'Nunito, sans-serif'
    }).setOrigin(0.5).setDepth(2005).setScrollFactor(0);
    modalGroup.push(closeLabel);

    // Если уже отвечал сегодня — показываем ответ вместо поля ввода
    if (this.petMyAnswer) {
      const inputWrapper = inputEl.node.querySelector('.pet-answer-wrapper') || inputEl.node;
      inputEl.node.innerHTML = `
        <div style="text-align: center; font-family: 'Nunito', sans-serif; padding: 20px 0;">
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">Ваш ответ:</div>
          <div style="font-size: 15px; color: #f7ecd2; background: #1e293b; padding: 12px 16px; border-radius: 10px; border: 1px solid #d8a494; max-width: 240px; margin: 0 auto;">${escapeHtml(this.petMyAnswer)}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 8px;">Придёт ответ партнёра — день засчитается</div>
        </div>
      `;
      sendHit.setVisible(false);
      sendGfx.setVisible(false);
      sendLabel.setVisible(false);
    }

    const commit = () => {
      if (this.petMyAnswer) {
        this.showToast('Вы уже ответили сегодня');
        return;
      }
      const input = inputEl.node.querySelector('#petAnswerInput');
      const val = input ? input.value.trim() : '';
      if (!val) {
        this.showToast('Напишите ответ перед отправкой');
        return;
      }
      this.petMyAnswer = val;
      this.socket.emit('pet-answer', { answerText: val });
      this.closePetModal();
    };

    sendHit.on('pointerdown', commit);

    closeHit.on('pointerdown', () => {
      this.closePetModal();
    });

    // Enter в поле ввода — отправить
    const inputNode = inputEl.node.querySelector('#petAnswerInput');
    if (inputNode && !this.petMyAnswer) {
      inputNode.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.stopPropagation(); commit(); }
        if (e.key === 'Escape') { e.stopPropagation(); this.closePetModal(); }
      });
    }

    // Сохраняем ссылки для очистки
    this.petModal = modalGroup;
    this._petInputEl = inputEl;
  }

  closePetModal() {
    if (this.petModal) {
      this.petModal.forEach(el => {
        try { el.destroy(); } catch {}
      });
      this.petModal = null;
    }
    if (this._petInputEl) {
      try { this._petInputEl.destroy(); } catch {}
      this._petInputEl = null;
    }
  }

  createPetSprite(pet) {
    if (this.petContainer) {
      this.petContainer.destroy();
      this.petContainer = null;
      this.petSprite = null;
      this.petShadow = null;
    }

    const tileKey = `${pet.petX ?? 4},${pet.petY ?? 4}`;
    const tile = this.tiles.get(tileKey);
    if (!tile) return;

    const cx = tile.rect.x;
    const cy = tile.rect.y;

    const container = this.add.container(cx, cy - 20).setDepth(DS.depth.avatars);
    const shadow = this.add.ellipse(0, 6, 20, 8, 0x000000, 0.3);
    const sprite = this.add.text(0, 0, pet.petEmoji, { fontSize: '32px' }).setOrigin(0.5);

    container.add([shadow, sprite]);
    this.petContainer = container;
    this.petSprite = sprite;
    this.petShadow = shadow;

    // Легкое дыхание
    this.tweens.add({
      targets: container,
      y: cy - 24,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  movePetSprite(pet) {
    if (!this.petContainer) return;

    const tileKey = `${pet.petX ?? 4},${pet.petY ?? 4}`;
    const tile = this.tiles.get(tileKey);
    if (!tile) return;

    const cx = tile.rect.x;
    const cy = tile.rect.y;

    this.tweens.killTweensOf(this.petContainer);
    this.tweens.add({
      targets: this.petContainer,
      x: cx,
      y: cy - 20,
      duration: 800,
      ease: 'Sine.easeInOut'
    });

    // Поворот в сторону движения
    if (pet.petDir !== undefined) {
      this.petContainer.setScale(pet.petDir > 0 ? 1 : -1, 1);
    }
  }

  updatePetBtn(pet) {
    if (!this.petBtn) return;
    if (pet.stage === 'egg') {
      this.petBtn.setText('🥚');
    } else if (pet.stage === 'walking') {
      this.petBtn.setText(pet.petEmoji || '🐾');
    }
  }

  _registerHudContainers() {
    this.hudContainers = [
      this.topBar && this.topBar.container ? this.topBar.container : null,
      this.teamBar && this.teamBar.container ? this.teamBar.container : null,
      this.inventoryBar && this.inventoryBar.container ? this.inventoryBar.container : null,
      this.hintText ? this.hintText : null,
      this.toastText ? this.toastText : null,
      this.emoteBtn ? this.emoteBtn : null,
      this.topBar?.roomHit
    ].filter(Boolean);
    this.toolButtons.forEach((entry) => {
      if (entry.container) this.hudContainers.push(entry.container);
    });
    // Watch button hides during Watch mode (fullscreen hit rect handles exit)
    if (this.watchBtn) this.hudContainers.push(this.watchBtn);
    if (this.petBtn) this.hudContainers.push(this.petBtn);
  }

  /**
   * Enter Watch mode: fade out all HUD, duck music to half volume, start
   * camera breathing (30 s cycle), show exit cue. World keeps growing.
   */
  enterWatchMode() {
    if (this.watchMode) return;
    this.watchMode = true;
    this.stressMetrics.enterWatchMode();

    // Disable interactive input on HUD while fading.
    this.hudContainers.forEach((c) => {
      if (c && c.input) c.input.enabled = false;
    });

    // Fade HUD out over 800 ms.
    this.tweens.add({
      targets: this.hudContainers,
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeInOut'
    });

    // Duck music to half volume.
    if (this.sound && typeof this.sound.duckMusic === 'function') {
      this.sound.duckMusic(0.5);
    }

    // Ambience up.
    if (this.ambience && typeof this.ambience.fadeMaster === 'function') {
      this.ambience.fadeMaster(1.0, 800);
    }

    // Camera breathing: 30-second zoom cycle.
    const cam = this.cameras.main;
    this.watchCameraTween = this.tweens.add({
      targets: cam,
      zoom: { from: 1, to: 1.12 },
      duration: 30000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    // Exit cue: single bottom line + full-screen hit rect.
    const cx = cam.width / 2;
    const cy = cam.height - 40;
    this.watchCue = this.add.text(cx, cy, 'press anywhere to return', {
      fontSize: '16px', color: '#f7ecd2', fontStyle: 'bold', fontFamily: 'Nunito, sans-serif'
    }).setOrigin(0.5).setDepth(900).setScrollFactor(0).setAlpha(1);

    this.watchHit = this.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0)
      .setDepth(899).setScrollFactor(0).setInteractive();
    this.watchHit.on('pointerdown', () => this.exitWatchMode());
  }

  /**
   * Exit Watch mode: restore HUD, unduck music, stop camera breathing,
   * remove exit cue, re-enable input.
   */
  exitWatchMode() {
    if (!this.watchMode) return;
    this.watchMode = false;
    this.stressMetrics.exitWatchMode();

    // Stop camera breathing and reset zoom.
    if (this.watchCameraTween) {
      this.tweens.killTweensOf(this.watchCameraTween.targets);
      this.watchCameraTween = null;
    }
    const cam = this.cameras.main;
    if (cam) cam.setZoom(1);

    // Remove exit cue and hit rect.
    if (this.watchCue) { try { this.watchCue.destroy(); } catch {} this.watchCue = null; }
    if (this.watchHit) { try { this.watchHit.destroy(); } catch {} this.watchHit = null; }

    // Clear watch hint.
    if (this.hintText) this.hintText.setText('');

    // Fade HUD back in over 800 ms, re-enable input.
    this.tweens.add({
      targets: this.hudContainers,
      alpha: 1,
      duration: 800,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.hudContainers.forEach((c) => {
          if (c && c.input) c.input.enabled = true;
        });
      }
    });

    // Unduck music.
    if (this.sound && typeof this.sound.unduckMusic === 'function') {
      this.sound.unduckMusic();
    }

    // Ambience down.
    if (this.ambience && typeof this.ambience.fadeMaster === 'function') {
      this.ambience.fadeMaster(0, 800);
    }
  }

  formatSignpost(msg) {
    if (typeof msg !== 'string' || msg.length === 0) return '✎ Записка';
    const clean = msg.replace(/^"|"$/g, '').replace(/^✎\s*/, '');
    if (clean.length === 0) return '✎ Записка';
    return clean.length > 22 ? `"${clean.slice(0, 20)}…"` : `"${clean}"`;
  }

  showToast(message, duration = 2500) {
    if (!this.toastText) return;
    this.toastText.setText(message);
    this.toastText.setAlpha(1);
    if (this.toastTween) this.toastTween.stop();
    this.toastTween = this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: duration,
      duration: 400
    });
  }

  updateCoins(coins) {
    this.coins = coins;
    if (this.topBar && this.topBar.coins) {
      this.topBar.coins.setText(`🪙 ${coins}`);
    }
    if (this.upgradesOverlay && typeof this.upgradesOverlay.update === 'function') {
      this.upgradesOverlay.update(coins, this.upgrades);
    }
  }

  updateCollectionText() {
    // Collection counter moved out of top bar to reduce clutter
    if (this.topBar && this.topBar.collection) {
      this.topBar.collection.setText(`📖 ${this.collection.size}/${this.totalPlants}`);
    }
  }

  updateActivityCount() {
    // Activities counter moved out of top bar to reduce clutter
    if (this.topBar && this.topBar.activities) {
      const n = this.activityLayer ? this.activityLayer.count : 0;
      this.topBar.activities.setText(`🦋 ${n}`);
    }
  }

  applyWorld(world) {
    if (!world) return;
    this.lastWorld = world;
    updateSky(this, this.bg, world);
    applyWorldTint(this, this.worldTint, world);
    if (this.weather && this.weather.update) this.weather.update(world);
    if (this.ambience && this.ambience.update) this.ambience.update(world);
    // Реверб-зона по фазе мира
    if (this.sound) {
      const phase = world.phase?.id || 'day';
      const zone = phase === 'night' ? 'ir_cave' : phase === 'evening' ? 'ir_porch' : 'ir_open';
      this.sound.setReverbZone(zone);
    }
    if (this.topBar && this.topBar.world) {
      this.topBar.world.setText(worldIconsString(world));
    }
  }

  createGardenDecor() {
    // Cozy environment: pond, lanterns, bench, fence - positioned within visible garden area
    const totalSize = this.tileSize * GRID;
    const offsetX = (this.scale.width - totalSize) / 2;
    const offsetY = (this.scale.height - totalSize) / 2 - 10;
    const g = this.add.graphics().setDepth(-5); // Behind garden but visible

    // Пруд в углу сада (внутри границ сада)
    const pondX = offsetX + totalSize * 0.85;
    const pondY = offsetY + totalSize * 0.85;
    const pondW = totalSize * 0.25;
    const pondH = totalSize * 0.15;
    g.fillStyle(0x3f7fbf, 0.35);
    g.fillEllipse(pondX, pondY, pondW, pondH);
    g.fillStyle(0x6fb7e8, 0.25);
    g.fillEllipse(pondX - pondW * 0.1, pondY - pondH * 0.1, pondW * 0.6, pondH * 0.5);
    g.lineStyle(2, 0x2c5f8a, 0.25);
    g.strokeEllipse(pondX, pondY, pondW, pondH);

    // Фонарики по периметру сада (внутри границ)
    const lanterns = [
      [offsetX + totalSize * 0.05, offsetY + totalSize * 0.1],
      [offsetX + totalSize * 0.95, offsetY + totalSize * 0.15],
      [offsetX + totalSize * 0.1, offsetY + totalSize * 0.9],
      [offsetX + totalSize * 0.9, offsetY + totalSize * 0.85]
    ];
    for (const [lx, ly] of lanterns) {
      g.fillStyle(0xfff3b0, 0.25);
      g.fillCircle(lx, ly, 14);
      g.fillStyle(0xffd54f, 0.5);
      g.fillCircle(lx, ly, 6);
      g.fillStyle(0x5d4037, 1);
      g.fillRect(lx - 1.5, ly + 4, 3, 12);
    }

    // Скамейка у пруда (внутри сада)
    const bx = pondX - totalSize * 0.12, by = pondY - totalSize * 0.12;
    g.fillStyle(0x8d6e63, 1);
    g.fillRoundedRect(bx, by, 36, 8, 2);
    g.fillRect(bx + 3, by + 8, 3, 8);
    g.fillRect(bx + 30, by + 8, 3, 8);

    // Лёгкий забор по краям сада
    g.fillStyle(0x6d4c41, 0.7);
    for (let i = 0; i <= 8; i++) {
      const fx = offsetX + i * this.tileSize;
      g.fillRect(fx, offsetY - 6, 4, 6);
      g.fillRect(fx, offsetY + totalSize, 4, 6);
    }
    for (let i = 0; i <= 8; i++) {
      const fy = offsetY + i * this.tileSize;
      g.fillRect(offsetX - 6, fy, 6, 4);
      g.fillRect(offsetX + totalSize, fy, 6, 4);
    }

    this.gardenDecor = g;
  }

  showEmote(playerId, emote) {
    const pos = this.playerPositions.get(playerId);
    if (!pos) return;
    const c = this.getTileCenter(pos.x, pos.y);

    const container = this.add.container(c.x, c.y - 60).setDepth(400);
    const bg = this.add.circle(0, 0, 18, 0x0f172a, 0.9).setStrokeStyle(2, 0xffffff, 0.3);
    const txt = this.add.text(0, 0, emote, { fontSize: '20px' }).setOrigin(0.5);
    container.add([bg, txt]);

    this.tweens.add({
      targets: container,
      y: c.y - 100,
      alpha: 0,
      duration: 1800,
      ease: 'Cubic.easeOut',
      onComplete: () => container.destroy()
    });
  }

  pauseGame() {
    if (this.settingsOverlay) return; // Не ставим на паузу, если открыты настройки
    if (!this.scene.isActive('GameScene')) return;
    this.scene.pause();
    this.scene.launch('PauseScene', { parent: 'GameScene', socket: this.socket });
  }

  rebuildGridLayout() {
    // Позиция сетки приходит из раскладки, а не из «центра экрана».
    const G = this.layout.grid;
    const totalSize = this.tileSize * 8;
    const offsetX = G.x;
    const offsetY = G.y;
    this.gridOrigin = { x: offsetX, y: offsetY, size: totalSize };
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const tile = this.tiles.get(`${x},${y}`);
        if (!tile) continue;
        const cx = offsetX + x * this.tileSize + this.tileSize / 2;
        const cy = offsetY + y * this.tileSize + this.tileSize / 2;
        if (tile.container) tile.container.setPosition(cx, cy);
        if (tile.rect) tile.rect.setPosition(cx, cy);
        if (tile.barBg) tile.barBg.setPosition(cx, offsetY + y * this.tileSize + this.tileSize - 8);
        if (tile.bar) tile.bar.setPosition(cx - (this.tileSize - 12) / 2, offsetY + y * this.tileSize + this.tileSize - 8);
        if (tile.plantImage) tile.plantImage.setPosition(cx, cy + this.tileSize * 0.35);
        if (tile.shadowImage) tile.shadowImage.setPosition(cx, cy + this.tileSize * 0.35);
        if (tile.readyBadge) tile.readyBadge.setPosition(cx, cy - 30);
      }
    }
    // Внешняя рамка сада
    if (this.savedFrameRect) {
      this.savedFrameRect.setPosition(offsetX + totalSize / 2, offsetY + totalSize / 2);
    }
  }

  handleResize() {
    // Единая раскладка пересчитывается ЗДЕСЬ ОДИН РАЗ и раздаётся всем.
    // Раньше у resize была своя арифметика (h - 80, h - 60, w - 30),
    // из-за которой кнопки прыгали относительно create().
    this.layout = computeLayout(this.scale.width, this.scale.height);
    const L = this.layout;
    const w = L.w;
    const h = L.h;

    this.tileSize = L.grid.tileSize;
    this.rebuildGridLayout();

    if (this.hintText) this.hintText.setPosition(w / 2, L.hintY);
    if (this.toastText) {
      this.toastText.setPosition(w / 2, L.toastY);
      this.toastText.setWordWrapWidth(Math.min(w - 40, 400));
    }
    if (this.playerListText) this.playerListText.setPosition(L.margin, L.hudH + 6);

    // Боковые кнопки: одна точка на все три (рельса или ряд).
    if (this.emoteBtn) {
      const x = L.side.emoteX ?? L.side.x;
      this.emoteBtn.setPosition(x, L.side.emoteY);
    }
    if (this.watchBtn) {
      const x = L.side.watchX ?? L.side.x;
      this.watchBtn.setPosition(x, L.side.watchY);
    }
    if (this.petBtn) {
      const x = L.side.petX ?? L.side.x;
      this.petBtn.setPosition(x, L.side.petY);
    }

    // Верхняя панель и полка инвентаря сами берут координаты из layout.
    if (this.topBar && this.topBar.resize) this.topBar.resize(L);
    if (this.inventoryBar) this.inventoryBar.resize(L);
    if (this.weather && this.weather.resize) this.weather.resize();

    if (this.teamBar && this.teamBar.container) {
      this.teamBar.container.setPosition(w / 2, L.hudH + 44);
    }

    // Табличка сада
    const sp = L.signpost;
    if (this.signpostBg) {
      this.signpostBg.clear();
      drawRoundedRect(this.signpostBg, sp.x - sp.w / 2, sp.y, sp.w, sp.h, DS.radius.sm, DS.colors.bg.elevated, 1, DS.colors.ui.border, 2);
      if (this.signpostText) this.signpostText.setPosition(sp.x, sp.y + sp.h / 2);
      if (this.signpostHit) {
        this.signpostHit.setPosition(sp.x, sp.y + sp.h / 2);
        this.signpostHit.setSize(sp.w, sp.h);
      }
    }

    if (this.teamTree) this.drawTeamTree(this.teamTreeLevel || 0);

    // Тулбар
    if (this.toolButtons) {
      const centers = rowCenters(this.toolButtons.size, w / 2, L.toolbar.y, L.toolbar.size, L.toolbar.gap);
      let i = 0;
      this.toolButtons.forEach((btn) => {
        if (!btn.container) return;
        const c = centers[i++];
        if (c) btn.container.setPosition(c.x, c.y);
      });
    }
  }

  getTileCenter(tileX, tileY) {
    const t = this.tiles.get(`${tileX},${tileY}`);
    if (!t || !t.rect) return { x: 0, y: 0 };
    return { x: t.rect.x, y: t.rect.y };
  }

  ensureAvatar(playerId, roleId, genderId) {
    let av = this.avatars.get(playerId);
    if (!av) {
      const info = this.playerInfo?.(playerId);
      av = createAvatar(this, playerId, genderId, roleId, this.tileSize, info?.nickname || '', !!info?.isHost);
      av.tileSize = this.tileSize;
      this.avatarLayer.add(av);
      this.avatars.set(playerId, av);
    }
    const pos = this.playerPositions.get(playerId) || { x: 1, y: 1 };
    const stand = this.avatarStandAt(pos.x, pos.y);
    av.setPosition(stand.x, stand.y);
    return av;
  }

  /**
   * Убирает аватар игрока, который вышел из комнаты.
   * Без этого аватар остаётся висеть на грядке как призрак.
   */
  removeAvatar(playerId) {
    const av = this.avatars.get(playerId);
    if (av) {
      try {
        av.walkTween?.stop();
        av.breathTween?.stop();
        av.destroy();
      } catch {}
      this.avatars.delete(playerId);
    }
    this.playerPositions.delete(playerId);
    this.playerGenders?.delete(playerId);
    this.roles && this.roles[playerId] !== undefined && delete this.roles[playerId];
    this.hideJobIndicator?.(playerId);
  }

  /**
   * Данные об игроке из списка комнаты (ник, хост).
   */
  playerInfo(playerId) {
    if (!this.playerList) return null;
    return this.playerList.find((p) => p && p.id === playerId) || null;
  }

  /**
   * Единая точка, где игрок «стоит» на грядке.
   * Все, кто ставит аватар, обязаны идти через неё — иначе позиция
   * разъезжается (именно из-за этого аватар прыгал выше грядки).
   */
  avatarStandAt(tileX, tileY) {
    return avatarStandPosition(this.getTileCenter(tileX, tileY), this.tileSize);
  }

  moveAvatarTo(playerId, tileX, tileY, duration) {
    const av = this.ensureAvatar(playerId, this.roles[playerId], this.playerGenders.get(playerId) || 'male');
    const target = this.avatarStandAt(tileX, tileY);
    this.playerPositions.set(playerId, { x: tileX, y: tileY });
    // Пауза косметических анимаций на время движения (не убираем tweens, иначе они не восстановятся)
    if (av.walkTween) av.walkTween.pause();
    if (av.breathTween) av.breathTween.pause();
    const walkDur = Math.min(duration * 0.6, 2500);
    this.tweens.add({
      targets: av, x: target.x, y: target.y,
      duration: walkDur, ease: 'Sine.easeInOut',
      onComplete: () => {
        av.setPosition(target.x, target.y);
        if (av.walkTween) av.walkTween.resume();
        if (av.breathTween) av.breathTween.resume();
      },
    });
    this.tweens.add({
      targets: av.body, scaleY: 1.15,
      duration: 200, yoyo: true, repeat: Math.floor(walkDur / 400),
    });
    if (av.shadow) {
      this.tweens.add({
        targets: av.shadow, scaleX: 1.1,
        duration: 200, yoyo: true, repeat: Math.floor(walkDur / 400),
      });
    }
  }

  showJobIndicator(playerId, tileX, tileY, action, duration) {
    this.hideJobIndicator(playerId);
    const tile = this.tiles.get(`${tileX},${tileY}`);
    if (!tile || !tile.rect) return;

    const icon = action === 'plant' ? '🌱' : action === 'water' ? '💧' : '✨';
    const color = action === 'plant' ? 0x8bc34a : action === 'water' ? 0x4fc3f7 : 0xffd54f;

    const container = this.add.container(tile.rect.x, tile.rect.y - 40).setDepth(240);
    const bubble = this.add.circle(0, 0, 16, 0x0f172a, 0.9).setStrokeStyle(2, color);
    const iconText = this.add.text(0, 0, icon, { fontSize: '18px' }).setOrigin(0.5);
    const barBg = this.add.rectangle(0, 22, 36, 4, 0x333333).setOrigin(0.5);
    const bar = this.add.rectangle(-18, 22, 0, 4, color).setOrigin(0, 0.5);
    container.add([bubble, iconText, barBg, bar]);

    this.tweens.add({ targets: bubble, scale: 1.15, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: bar, width: 36, duration, ease: 'Linear' });

    this.time.delayedCall(duration * 0.5, () => {
      const newIcon = action === 'plant' ? '🌿' : action === 'water' ? '💦' : '🌸';
      if (iconText && iconText.active) iconText.setText(newIcon);
    });

    this.jobIndicators.set(playerId, { container, tileKey: `${tileX},${tileY}`, icon });
  }

  hideJobIndicator(playerId) {
    const ind = this.jobIndicators.get(playerId);
    if (ind && ind.container) {
      this.tweens.killTweensOf(ind.container);
      ind.container.destroy();
    }
    this.jobIndicators.delete(playerId);
  }

  markPending(tileKey) {
    const tile = this.tiles.get(tileKey);
    if (tile && tile.rect) tile.rect.setStrokeStyle(2, 0xffd54f, 0.8);
  }

  unmarkPending(tileKey) {
    const tile = this.tiles.get(tileKey);
    if (tile && tile.rect) tile.rect.setStrokeStyle(2, 0x5d4037);
  }

  drawTeamTree(level) {
    if (!this.gridOrigin || !this.teamTree) return;
    const g = this.teamTree;
    g.clear();

    if (this.treePulseTween) {
      try { this.treePulseTween.stop(); } catch {}
      this.treePulseTween = null;
    }

    const totalSize = this.tileSize * 8;
    const gridRight = this.gridOrigin.x + totalSize;
    const spaceOnRight = this.scale.width - gridRight;
    const hasRightSpace = spaceOnRight > 80;

    if (hasRightSpace) {
      const x = gridRight + spaceOnRight / 2;
      const baseY = this.scale.height - 230;
      this.drawTreeShape(g, x, baseY, level, 1.0);
      this.treeMode = 'inField';
      if (this.treeHit) {
        this.treeHit.setPosition(x, baseY - 50);
        this.treeHit.setSize(80, 120);
        this.treeHit.input.hitArea.setSize(this.treeHit.width, this.treeHit.height);
      }
    } else {
      const iconX = this.scale.width - 32;
      const iconY = 125;
      
      // Создаем контейнер для иконки дерева если его нет
      if (!this.treeIconContainer) {
        this.treeIconContainer = this.add.container(iconX, iconY).setDepth(160);
        this.treeHit.setDepth(160);
      }
      
      this.treeIconContainer.setPosition(iconX, iconY);
      
      // Рисуем фон иконки (круг 44x44)
      const iconBg = this.add.graphics();
      iconBg.fillStyle(0x0f172a, 0.7);
      iconBg.fillCircle(0, 12, 22);
      iconBg.lineStyle(2, 0xffca28);
      iconBg.strokeCircle(0, 12, 22);
      
      // Рисуем дерево внутри иконки
      this.drawTreeShape(iconBg, 0, 32, level, 0.55);
      
      // Бейдж уровня
      const badgeGfx = this.add.graphics();
      badgeGfx.fillStyle(0x2ecc71, 1);
      badgeGfx.fillCircle(16, 36, 10);
      const badgeText = this.add.text(16, 36, `Ур.${level}`, {
        fontSize: '9px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'Nunito, sans-serif'
      }).setOrigin(0.5);
      
      // Подпись под иконкой
      const labelText = this.add.text(0, 58, `🌳 Уровень ${level}`, {
        fontSize: '10px', color: '#ffca28', fontFamily: 'Nunito, sans-serif'
      }).setOrigin(0.5);
      
      this.treeIconContainer.removeAll(true);
      this.treeIconContainer.add([iconBg, badgeGfx, badgeText, labelText]);
      
      this.treeMode = 'hudIcon';
      if (this.treeHit) {
        this.treeHit.setPosition(iconX, iconY + 5);
        this.treeHit.setSize(56, 56);
        this.treeHit.input.hitArea.setSize(this.treeHit.width, this.treeHit.height);
      }
      
      // Пульсация если прогресс достиг порога
      if (this.treeIconContainer) {
        const ready = this.tree && this.tree.progress >= this.tree.nextLevelAt;
        if (ready && !this.treePulseTween) {
          this.treePulseTween = this.tweens.add({
            targets: this.treeIconContainer,
            scaleX: { from: 1, to: 1.08 },
            scaleY: { from: 1, to: 1.08 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        } else if (!ready && this.treePulseTween) {
          this.treePulseTween.stop();
          this.treePulseTween = null;
        }
      }
    }
  }

  drawTreeShape(g, x, baseY, level, scale) {
    const trunkH = (20 + level * 8) * scale;
    const trunkW = (6 + level * 1.5) * scale;
    const crownR = (18 + level * 6) * scale;

    // Ствол
    g.fillStyle(0x5d4037, 1);
    g.fillRect(x - trunkW / 2, baseY - trunkH, trunkW, trunkH);
    // Крона (3 круга)
    g.fillStyle(0x3e5a30, 1);
    g.fillCircle(x, baseY - trunkH - crownR * 0.4, crownR);
    g.fillStyle(0x4a6a38, 1);
    g.fillCircle(x - crownR * 0.3, baseY - trunkH - crownR * 0.6, crownR * 0.7);
    g.fillStyle(0x5a7a4a, 1);
    g.fillCircle(x + crownR * 0.25, baseY - trunkH - crownR * 0.5, crownR * 0.6);

    // Плоды (уровень 3+)
    if (level >= 3) {
      const fruitCount = Math.min(6, level - 2);
      for (let i = 0; i < fruitCount; i++) {
        const a = (Math.PI * 2 * i) / fruitCount;
        g.fillStyle(0xffca28, 1);
        g.fillCircle(x + Math.cos(a) * crownR * 0.6, baseY - trunkH - crownR * 0.5 + Math.sin(a) * crownR * 0.6, 3 * scale);
      }
    }
    // Цветы (уровень 5+)
    if (level >= 5) {
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 * i) / 4 + 0.5;
        g.fillStyle(0xff80ab, 1);
        g.fillCircle(x + Math.cos(a) * crownR * 0.7, baseY - trunkH - crownR * 0.5 + Math.sin(a) * crownR * 0.7, 2.5 * scale);
      }
    }
    // Скворечник (уровень 7+)
    if (level >= 7) {
      g.fillStyle(0x8d6e63, 1);
      g.fillRect(x + trunkW / 2 - 4 * scale, baseY - trunkH * 0.7, 8 * scale, 8 * scale);
      g.fillStyle(0x3e2723, 1);
      g.fillCircle(x + trunkW / 2, baseY - trunkH * 0.7 + 4 * scale, 2 * scale);
    }
  }

  openTreeOverlay() {
    if (this.treeOverlay) return;
    const cam = this.cameras.main;
    const overlay = this.add.container(0, 0).setDepth(500);

    const bg = this.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.8).setOrigin(0).setInteractive();
    overlay.add(bg);

    const panelW = Math.min(320, cam.width - 40);
    const panelH = 420;
    const px = cam.width / 2 - panelW / 2;
    const py = cam.height / 2 - panelH / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0xf7ecd2, 0.98);
    panel.fillRoundedRect(px, py, panelW, panelH, 16);
    panel.lineStyle(3, 0xa4713d, 1);
    panel.strokeRoundedRect(px, py, panelW, panelH, 16);
    overlay.add(panel);

    overlay.add(this.add.text(cam.width / 2, py + 24, '🌳 Дерево команды', {
      fontSize: '20px', color: '#3e2723', fontStyle: 'bold', fontFamily: 'Nunito, Georgia, serif'
    }).setOrigin(0.5));

    const bigTree = this.add.graphics();
    bigTree.setPosition(cam.width / 2, py + 280);
    this.drawTreeShape(bigTree, 0, 0, this.teamTreeLevel || 0, 2.2);
    overlay.add(bigTree);

    const t = this.tree || { level: 0, progress: 0, nextLevelAt: 50 };
    overlay.add(this.add.text(cam.width / 2, py + 310, `Уровень ${t.level}`, {
      fontSize: '18px', color: '#3e2723', fontStyle: 'bold', fontFamily: 'Nunito, Georgia, serif'
    }).setOrigin(0.5));

    overlay.add(this.add.text(cam.width / 2, py + 336, `${t.progress} / ${t.nextLevelAt} до следующего уровня`, {
      fontSize: '13px', color: '#5a3a24', fontFamily: 'Nunito, sans-serif'
    }).setOrigin(0.5));

    const closeHit = this.add.rectangle(px + panelW - 24, py + 24, 44, 44, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    const closeBtn = this.add.text(px + panelW - 24, py + 24, '✕', {
      fontSize: '24px', color: '#5a3a24', fontStyle: 'bold'
    }).setOrigin(0.5);
    closeHit.on('pointerdown', () => { overlay.destroy(); this.treeOverlay = null; });
    overlay.add([closeHit, closeBtn]);

    this.treeOverlay = overlay;
  }

  openSignpostEditor() {
    if (this.signpostDom) return;
    const w = this.scale.width;
    const h = this.scale.height;
    const panelW = Math.min(340, w - 40);
    const py = h / 2 - 90;

    const raw = this.currentSignpostRaw || '';
    const html = `
      <div class="note-editor" style="width:${panelW}px">
        <div class="note-title">✎ Оставить записку</div>
        <input type="text" id="noteInput" maxlength="50"
          value="${escapeHtml(raw)}"
          placeholder="Напишите сообщение..." autofocus />
        <div class="note-btns">
          <button id="noteSave" class="note-btn note-btn-save">Сохранить</button>
          <button id="noteCancel" class="note-btn note-btn-cancel">Отмена</button>
        </div>
      </div>
    `;

    let el;
    try {
      el = this.add.dom(w / 2, py).createFromHTML(html).setDepth(2000).setScrollFactor(0);
    } catch (e) {
      const newMsg = window.prompt('Оставить записку (до 50 символов):', raw);
      if (newMsg !== null && this.socket) {
        this.socket.emit('set-message', { message: newMsg.trim() });
      }
      return;
    }
    this.signpostDom = el;

    const input = el.node.querySelector('#noteInput');
    const saveBtn = el.node.querySelector('#noteSave');
    const cancelBtn = el.node.querySelector('#noteCancel');

    const commit = () => {
      const val = input ? input.value.trim() : '';
      if (this.socket) this.socket.emit('set-message', { message: val });
      this.destroySignpostDom();
    };
    const abort = () => this.destroySignpostDom();

    if (saveBtn) saveBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); commit(); });
    if (cancelBtn) cancelBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); abort(); });
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.stopPropagation(); commit(); }
        if (e.key === 'Escape') { e.stopPropagation(); abort(); }
      });
    }

    // Клик вне оверлея — отмена (не блокируем остальной UI)
    const blocker = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0)
      .setDepth(1999).setScrollFactor(0).setInteractive();
    blocker.on('pointerdown', (e) => {
      e.stopPropagation();
      abort();
    });
    this.signpostBlocker = blocker;
  }

  destroySignpostDom() {
    if (this.signpostDom) {
      try { this.signpostDom.destroy(); } catch {}
      this.signpostDom = null;
    }
    if (this.signpostBlocker) {
      try { this.signpostBlocker.destroy(); } catch {}
      this.signpostBlocker = null;
    }
  }

  hideSignpost() {
    if (this.signpostBg) this.signpostBg.setVisible(false);
    if (this.signpostText) this.signpostText.setVisible(false);
    if (this.signpostHit) this.signpostHit.setVisible(false);
  }

  showSignpost() {
    if (this.signpostBg) this.signpostBg.setVisible(true);
    if (this.signpostText) this.signpostText.setVisible(true);
    if (this.signpostHit) this.signpostHit.setVisible(true);
  }

  cleanup() {
    if (this.onScaleResize) {
      this.scale.off('resize', this.onScaleResize);
      this.onScaleResize = null;
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
    if (this.onVisibility) {
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.onVisibility = null;
    }
    if (this.wetEvent) {
      try { this.wetEvent.remove(); } catch {}
      this.wetEvent = null;
    }
    this.destroySignpostDom();
    this.time.removeAllEvents();
    if (this.activityLayer) this.activityLayer.clear();
    if (this.weather && this.weather.dispose) this.weather.dispose();
    if (this.ambient && this.ambient.dispose) this.ambient.dispose();
    if (this.ambience && this.ambience.dispose) this.ambience.dispose();
    if (this.sound && this.sound.pause) this.sound.pause();
    // Cleanup ready badges
    this.tiles.forEach(tile => {
      if (tile.readyBadge) {
        this.tweens.killTweensOf(tile.readyBadge);
        tile.readyBadge.destroy();
        tile.readyBadge = null;
      }
    });
    if (this.onboarding) this.onboarding.dispose();
    if (this.settingsOverlay) this.settingsOverlay.destroy();
  }
}

Object.assign(
  GameScene.prototype,
  GameSceneTiles,
  GameSceneUi,
  GameSceneActions
);