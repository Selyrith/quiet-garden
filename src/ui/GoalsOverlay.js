import Phaser from 'phaser';
import { DS } from './DesignSystem.js';
import {
  openOverlay,
  createCard,
  createButton,
  createScrollArea,
  createScrollButtons,
  createProgressBar,
  sectionHeader,
  createEmptyState,
  color,
} from './ui-kit.js';
import { TREE_NODES, STREAK_MULTIPLIERS, getTreeNodeProgress } from '../../shared/goals.js';

/**
 * Цели: ежедневная награда, серия, квесты дня и дерево прогресса.
 *
 * Было: панель 360×540 без прокрутки, поэтому дерево прогресса уходило под
 * нижний край и до него нельзя было добраться. Прогресс дерева считался по
 * `totals[node.check]` (harvestTotal), а сервер отдаёт короткие имена
 * (harvest) — все узлы показывали «0 / N» даже после реальных сборов.
 * Заголовки секций рисовались числовым токеном в `color:` и были невидимы.
 *
 * Стало: один скелет, прокрутка со стрелками, прогресс через общий
 * getTreeNodeProgress(), заметные статусы «можно забрать».
 */

export class GoalsOverlay extends Phaser.GameObjects.Container {
  constructor(scene, goals) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(DS.overlay.goals);
    this.scene = scene;
    this.goals = goals;
    this.isClaiming = false;
    this._destroyed = false;

    this.ui = openOverlay(scene, {
      title: '🎯 Цели',
      subtitle: 'Тихий ритуал на каждый день',
      depth: DS.overlay.goals,
      maxW: 440,
      maxH: 660,
      padding: 20,
      container: this,
      onClose: () => this.destroy(),
    });

    this.render();
  }

  render() {
    const C = this.ui.content;
    this.ui.body.removeAll(true);
    this.scroll && this.scroll.destroy?.();
    this.arrows && this.arrows.destroy?.();

    const scroll = createScrollArea(this.scene, this.ui.body, {
      left: C.left,
      right: C.right,
      top: C.top,
      bottom: C.bottom - 26,
      width: C.width,
    });
    this.scroll = scroll;

    let y = 0;
    y = this.buildDaily(scroll.view, y, C.width);
    y += 16;
    y = this.buildQuests(scroll.view, y, C.width);
    y += 16;
    y = this.buildTree(scroll.view, y, C.width);

    scroll.refresh();

    this.arrows = createScrollButtons(this.scene, this.ui.body, scroll, {
      x: C.left + C.width / 2,
      y: C.bottom - 2,
    });
  }

  // --- Ежедневная награда + серия -----------------------------------------

  buildDaily(parent, y, w) {
    const scene = this.scene;
    const daily = this.goals?.daily || { claimed: true };
    const streak = this.goals?.streak || {
      count: 0, multiplier: 1, dailyActions: 0,
      season: { name: 'Сезон', icon: '🌿' },
    };

    const cardH = 168;
    const card = createCard(scene, 0, y, w, cardH, {
      radius: DS.radius.lg,
      fill: DS.colors.bg.elevated,
      accent: daily.claimed ? DS.colors.ui.border : DS.colors.brand.secondary,
    });
    parent.add(card);

    // Сезон — маленькая подпись справа.
    const season = streak.season || {};
    const seasonText = scene.add.text(w - 14, 14, `${season.icon || '🌿'} ${season.name || ''}`, {
      fontSize: `${DS.font.size.xs}px`,
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: DS.colors.text.accent,
    }).setOrigin(1, 0);
    card.body.add(seasonText);

    const headerText = scene.add.text(16, 14, '🎁 Награда дня', {
      fontSize: `${DS.font.size.md}px`,
      fontFamily: DS.font.family.base,
      fontStyle: 'bold',
      color: DS.colors.text.primary,
    }).setOrigin(0, 0);
    card.body.add(headerText);

    // Семь дней серии — «нотки» с множителем.
    const circleR = 13;
    const gap = 7;
    const totalW = 7 * (circleR * 2) + 6 * gap;
    const startCalX = w / 2 - totalW / 2 + circleR;
    const activeIdx = Math.max(0, ((streak.count || 0) - 1) % 7);
    const calY = 50;

    for (let i = 0; i < 7; i++) {
      const cx = startCalX + i * (circleR * 2 + gap);
      const isClaimed = i < activeIdx || (i === activeIdx && daily.claimed);
      const isToday = i === activeIdx && !daily.claimed;

      const fill = isClaimed
        ? DS.colors.brand.primary
        : isToday
          ? DS.colors.brand.secondary
          : DS.colors.bg.tertiary;
      const ring = isToday ? color(DS.colors.brand.secondary) : color(DS.colors.ui.border);

      const circle = scene.add.circle(cx, calY, circleR, color(fill), 1)
        .setStrokeStyle(isToday ? 2.5 : 1.5, ring, 1);
      card.body.add(circle);

      const mult = STREAK_MULTIPLIERS[i];
      const multText = scene.add.text(cx, calY - 1, `×${mult}`, {
        fontSize: `${DS.font.size.xs - 2}px`,
        fontFamily: DS.font.family.base,
        fontStyle: 'bold',
        color: isClaimed ? DS.colors.text.inverse : isToday ? DS.colors.text.primary : DS.colors.text.muted,
      }).setOrigin(0.5);
      card.body.add(multText);

      if (isToday && (streak.dailyActions || 0) > 0) {
        scene.tweens.add({ targets: circle, scale: 1.12, duration: 700, yoyo: true, repeat: -1 });
      }
    }

    // Кнопка-действие.
    const canClaim = !daily.claimed && (streak.dailyActions || 0) > 0;
    let label = 'Получено сегодня';
    if (!daily.claimed) {
      label = (streak.dailyActions || 0) > 0
        ? `Забрать +${Math.floor(50 * (streak.multiplier || 1))} 🪙`
        : 'Сначала полейте грядку';
    }

    const buttonW = w - 32;
    const buttonH = 46;
    const button = createButton(scene, w / 2, 96 + buttonH / 2, buttonW, buttonH, label, () => {
      if (this.isClaiming) return;
      this.isClaiming = true;
      this.scene.socket?.emit('daily-claim');
    }, {
      variant: canClaim ? 'primary' : 'ghost',
      disabled: !canClaim,
      fontSize: DS.font.size.base,
    });
    card.body.add(button);

    // Сколько дней серии — поясняющая строка под кнопкой.
    const streakLine = (streak.count || 0) > 0
      ? `Серия: ${streak.count} дн. · множитель ×${streak.multiplier || 1}`
      : 'Загляните завтра, чтобы начать серию';
    const sub = scene.add.text(w / 2, 154, streakLine, {
      fontSize: `${DS.font.size.xs}px`,
      fontFamily: DS.font.family.base,
      color: DS.colors.text.muted,
    }).setOrigin(0.5, 0);
    card.body.add(sub);

    return y + cardH;
  }

  // --- Квесты дня ---------------------------------------------------------

  buildQuests(parent, y, w) {
    const scene = this.scene;
    const quests = this.goals?.quests || [];

    const headerH = sectionHeader(scene, parent, 0, y, w, 'Квесты дня');
    y += headerH;

    if (!quests.length) {
      const empty = createEmptyState(scene, w / 2, y + 40, w - 40, {
        icon: '🌙',
        title: 'Квесты ещё в пути',
        hint: 'Они появятся, как только сервер пришлёт новый день.',
      });
      parent.add(empty);
      return y + 100;
    }

    const cardH = 26 + quests.length * 46;
    const card = createCard(scene, 0, y, w, cardH, {
      radius: DS.radius.lg,
      fill: DS.colors.bg.elevated,
    });
    parent.add(card);

    let ry = 14;
    quests.forEach((q) => {
      const done = (q.progress || 0) >= q.target;
      const canClaim = done && !q.claimed;

      const text = scene.add.text(16, ry, q.text, {
        fontSize: `${DS.font.size.sm}px`,
        fontFamily: DS.font.family.base,
        fontStyle: done ? 'bold' : 'normal',
        color: q.claimed ? DS.colors.text.muted : DS.colors.text.primary,
        wordWrap: { width: w - 110 },
      }).setOrigin(0, 0);
      card.body.add(text);

      // Прогресс — тонкая полоса под текстом.
      const barW = w - 32 - (canClaim ? 76 : 0);
      const bar = createProgressBar(scene, 16, ry + 26, barW, 7, {
        value: Math.min(1, (q.progress || 0) / q.target),
        fill: q.claimed ? DS.colors.bg.tertiary : done ? DS.colors.brand.secondary : DS.colors.brand.primary,
      });
      card.body.add(bar);

      const count = scene.add.text(16 + barW + 8, ry + 20, q.claimed ? '✓ забрано' : `${q.progress || 0}/${q.target}`, {
        fontSize: `${DS.font.size.xs}px`,
        fontFamily: DS.font.family.base,
        color: q.claimed ? DS.colors.text.muted : done ? DS.colors.brand.dark : DS.colors.text.muted,
      }).setOrigin(0, 0);
      card.body.add(count);

      if (canClaim) {
        const claimW = 66;
        const claim = createButton(scene, w - 16 - claimW / 2, ry + 16, claimW, 36,
          `+${q.reward}`, () => this.scene.socket?.emit('quest-claim', { questId: q.id }), {
            variant: 'secondary',
            fontSize: DS.font.size.sm,
          });
        card.body.add(claim);
      }

      ry += 46;
    });

    return y + cardH;
  }

  // --- Дерево прогресса ---------------------------------------------------

  buildTree(parent, y, w) {
    const scene = this.scene;
    const totals = this.goals?.totals || {};
    const claimedList = this.goals?.treeClaimed || [];

    const headerH = sectionHeader(scene, parent, 0, y, w, 'Дерево прогресса');
    y += headerH;

    TREE_NODES.forEach((node) => {
      const value = getTreeNodeProgress(node, totals);
      const claimed = claimedList.includes(node.id);
      const done = value >= node.target;
      const canClaim = done && !claimed;

      const cardH = canClaim ? 86 : 62;
      const card = createCard(scene, 0, y, w, cardH, {
        radius: DS.radius.lg,
        fill: canClaim ? DS.colors.bg.elevated : DS.colors.bg.secondary,
        accent: canClaim ? DS.colors.brand.secondary : claimed ? null : DS.colors.ui.border,
      });
      parent.add(card);

      const title = scene.add.text(16, 12, node.text, {
        fontSize: `${DS.font.size.sm}px`,
        fontFamily: DS.font.family.base,
        fontStyle: canClaim ? 'bold' : 'normal',
        color: claimed ? DS.colors.text.muted : DS.colors.text.primary,
      }).setOrigin(0, 0);
      card.body.add(title);

      const rewardText = scene.add.text(w - 16, 12, node.reward, {
        fontSize: `${DS.font.size.xs}px`,
        fontFamily: DS.font.family.base,
        fontStyle: 'bold',
        color: claimed ? DS.colors.text.muted : DS.colors.brand.dark,
      }).setOrigin(1, 0);
      card.body.add(rewardText);

      // Прогресс: полоса + «сделано N из M».
      const barW = w - 32;
      const bar = createProgressBar(scene, 16, 38, barW, 7, {
        value: Math.min(1, value / node.target),
        fill: claimed ? DS.colors.bg.tertiary : done ? DS.colors.brand.secondary : DS.colors.brand.primary,
      });
      card.body.add(bar);

      const progressLabel = claimed ? '✓ получено' : `${Math.min(value, node.target)} / ${node.target}`;
      const progressText = scene.add.text(w - 16, 34, progressLabel, {
        fontSize: `${DS.font.size.xs - 1}px`,
        fontFamily: DS.font.family.base,
        color: claimed ? DS.colors.text.muted : DS.colors.text.secondary,
      }).setOrigin(1, 0);
      card.body.add(progressText);

      if (canClaim) {
        const claimW = w - 32;
        const claim = createButton(scene, w / 2, 64 + 18, claimW, 40, 'Забрать награду', () => {
          this.scene.socket?.emit('tree-claim', { nodeId: node.id });
        }, {
          variant: 'secondary',
          fontSize: DS.font.size.sm,
        });
        card.body.add(claim);
      }

      y += cardH + 8;
    });

    return y;
  }

  destroy(fromScene) {
    if (this._destroyed) return;
    this._destroyed = true;
    this.scroll && this.scroll.destroy?.();
    this.arrows && this.arrows.destroy?.();
    const ui = this.ui;
    this.ui = null;
    if (ui) ui.close();
    try { super.destroy(fromScene); } catch {}
  }

  update(goals) {
    this.isClaiming = false;
    this.goals = goals;
    this.render();
  }
}