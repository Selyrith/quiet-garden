import Phaser from 'phaser';
import { UI, drawPanel } from './ui-theme.js';
import { TREE_NODES, STREAK_MULTIPLIERS } from '../../shared/goals.js';
import { createUnifiedButton, createUnifiedBadge } from './ui-unified.js';
import { UNIFIED } from './ui-unified.js';

export class GoalsOverlay extends Phaser.GameObjects.Container {
  constructor(scene, goals) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(520);
    this.scene = scene;
    this.goals = goals;
    this.isClaiming = false;

    scene.hideSignpost?.();
    if (scene.signpostDom) { scene.signpostDom.destroy(); scene.signpostDom = null; }

    const cam = scene.cameras.main;
    this.bg = scene.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.8)
      .setOrigin(0).setInteractive();
    this.add(this.bg);

    const panelW = Math.min(360, cam.width - 20);
    const panelH = Math.min(540, cam.height - 20);
    this.panel = scene.add.graphics();
    drawPanel(this.panel, cam.width / 2 - panelW / 2, cam.height / 2 - panelH / 2, panelW, panelH, 16, true);
    this.add(this.panel);

    this.title = scene.add.text(
      cam.width / 2, cam.height / 2 - panelH / 2 + 12, 'Цели',
      { fontSize: '18px', color: UI.textDark, fontStyle: 'bold', fontFamily: UI.fontTitle }
    ).setOrigin(0.5, 0);
    this.add(this.title);

    this.closeHit = scene.add.rectangle(cam.width / 2 + panelW / 2 - 24, cam.height / 2 - panelH / 2 + 24, 44, 44, UNIFIED.color).setInteractive({ useHandCursor: true });
    this.closeHit.setStrokeStyle(2, UNIFIED.colorHi);
    this.closeBtn = scene.add.text(cam.width / 2 + panelW / 2 - 24, cam.height / 2 - panelH / 2 + 24, '✕', {
      fontSize: '22px', color: '#3e2723', fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this.closeHit.on('pointerdown', () => this.destroy());
    this.add([this.closeHit, this.closeBtn]);

    this.content = scene.add.container(0, 0);
    this.add(this.content);

    this.render();
  }

  render() {
    this.content.removeAll(true);
    const cam = this.scene.cameras.main;
    const panelW = Math.min(360, cam.width - 20);
    const panelH = Math.min(540, cam.height - 20);
    const startY = cam.height / 2 - panelH / 2 + 44;
    const startX = cam.width / 2 - panelW / 2 + 16;
    const w = panelW - 32;

    let y = startY;

    // --- Daily reward ---
    y = this.sectionTitle(startX, y, '🎁 Ежедневная награда');
    const daily = this.goals.daily || { claimed: true };
    const streak = this.goals.streak || { count: 0, multiplier: 1, dailyActions: 0, season: { name: 'Сезон', color: '#fff' } };

    this.content.add(this.scene.add.text(startX + w, y - 20, streak.season.name, { fontSize: '11px', color: '#c9a884', fontStyle: 'italic' }).setOrigin(1, 0.5));

    // 7-day calendar — unified badge circles
    const calY = y + 20;
    const circleR = 12;
    const gap = 6;
    const totalW = 7 * (circleR * 2) + 6 * gap;
    const startCalX = startX + w / 2 - totalW / 2 + circleR;
    const activeIdx = Math.max(0, (streak.count - 1) % 7);

    for (let i = 0; i < 7; i++) {
      const cx = startCalX + i * (circleR * 2 + gap);
      const isClaimed = (i < activeIdx) || (i === activeIdx && daily.claimed);
      const isToday = i === activeIdx && !daily.claimed;

      const isActive = isToday && streak.dailyActions > 0;

      const circle = createUnifiedBadge(this.scene, cx, calY, '', {
        radius: circleR,
        disabled: isClaimed,
      });
      // claimed → muted unified color, today → unified color hi, inactive → secondary
      if (isClaimed) {
        circle.setDisabled(true);
      } else if (isActive) {
        // highlight today: use unified colorHi via fill override
        const bg = circle.getAt(0);
        bg.setFillStyle(UNIFIED.colorHi, 1);
      }
      this.content.add(circle);

      const dayMult = STREAK_MULTIPLIERS[i];
      const multColor = isClaimed ? '#5c4a3a' : isActive ? '#ffffff' : '#aaaaaa';
      this.content.add(this.scene.add.text(cx, calY, `x${dayMult}`, { fontSize: '10px', color: multColor, fontStyle: 'bold' }).setOrigin(0.5));

      if (isActive && streak.dailyActions > 0) {
        this.scene.tweens.add({ targets: circle, scale: 1.15, duration: 500, yoyo: true, repeat: -1 });
      }
    }

    y += 44;

    // Claim button — unified color
    const canClaim = !daily.claimed && streak.dailyActions > 0;
    let statusText = 'Получено сегодня';
    let btnDisabled = true;

    if (!daily.claimed) {
      if (streak.dailyActions > 0) {
        statusText = `Забрать +${Math.floor(50 * streak.multiplier)} 🪙`;
        btnDisabled = false;
      } else {
        statusText = 'Сначала полейте грядку';
        btnDisabled = true;
      }
    }

    const btnY = y + 10;
    const btnW = w;
    const btnH = 34;

    const dailyHit = this.scene.add.rectangle(startX + w / 2, btnY + btnH / 2, Math.max(btnW, 44), Math.max(btnH, 44), 0x000000, 0.001);
    dailyHit.setInteractive({ useHandCursor: !btnDisabled });
    this.content.add(dailyHit);

    if (!btnDisabled) {
      dailyHit.on('pointerdown', () => {
        if (this.isClaiming) return;
        this.isClaiming = true;
        this.scene.socket?.emit('daily-claim');
      });
    }

    const dailyBtnBg = this.scene.add.graphics();
    const fillColor = btnDisabled ? UNIFIED.color : UNIFIED.color;
    const fillAlpha = btnDisabled ? UNIFIED.colorDisabledAlpha : 1;
    dailyBtnBg.fillStyle(fillColor, fillAlpha);
    dailyBtnBg.fillRoundedRect(startX, btnY, btnW, btnH, 8);
    dailyBtnBg.lineStyle(1, 0xc9a884, 0.3);
    dailyBtnBg.strokeRoundedRect(startX, btnY, btnW, btnH, 8);
    this.content.add(dailyBtnBg);
    this.content.add(this.scene.add.text(
      startX + w / 2, btnY + btnH / 2, statusText,
      { fontSize: '14px', color: btnDisabled ? '#aaaaaa' : '#ffffff', fontStyle: 'bold', fontFamily: UI.fontBody }
    ).setOrigin(0.5));

    y += 50;

    // --- Quests ---
    y = this.sectionTitle(startX, y, '📋 Квесты дня');
    const quests = this.goals.quests || [];
    quests.forEach((q) => {
      const rowY = y + 20;
      const done = (q.progress || 0) >= q.target;
      const canClaim = done && !q.claimed;

      this.content.add(this.scene.add.text(startX, y, q.text, {
        fontSize: '13px', color: UI.textLight, fontFamily: UI.fontBody
      }));
      y += 20;

      const barW = w - 80;
      const bg = this.scene.add.rectangle(startX, y, barW, 8, 0x5c4a3a).setOrigin(0, 0.5);
      const fill = this.scene.add.rectangle(
        startX, y, Math.min(barW, barW * ((q.progress || 0) / q.target)), 8,
        q.claimed ? UNIFIED.secondary : UNIFIED.color
      ).setOrigin(0, 0.5);
      this.content.add(bg);
      this.content.add(fill);

      const progText = this.scene.add.text(startX + barW + 8, y,
        q.claimed ? '✓' : `${q.progress || 0}/${q.target}`,
        { fontSize: '12px', color: canClaim ? UNIFIED.color : '#aaaaaa' });
      this.content.add(progText);

      if (canClaim) {
        const qBtnX = startX + w - 66;
        const qBtnY = y - 12;
        const qHit = this.scene.add.rectangle(qBtnX + 22, qBtnY + 12, 44, 44, 0x000000, 0.001).setInteractive({ useHandCursor: true });
        this.content.add(qHit);
        const qBtn = this.scene.add.graphics();
        qBtn.fillStyle(UNIFIED.color, 1);
        qBtn.fillRoundedRect(qBtnX, qBtnY, 44, 24, 6);
        qBtn.lineStyle(1, 0xc9a884, 0.4);
        qBtn.strokeRoundedRect(qBtnX, qBtnY, 44, 24, 6);
        this.content.add(qBtn);
        qHit.on('pointerdown', () => this.scene.socket?.emit('quest-claim', { questId: q.id }));
        this.content.add(this.scene.add.text(
          qBtnX + 22, qBtnY + 12, `+${q.reward}`,
          { fontSize: '10px', color: '#ffffff', fontStyle: 'bold' }
        ).setOrigin(0.5));
      }
      y += 30;
    });

    if (quests.length === 0) {
      this.content.add(this.scene.add.text(startX, y, 'Квесты загрузятся…', {
        fontSize: '12px', color: '#888888'
      }));
      y += 24;
    }

    // --- Tree ---
    y = this.sectionTitle(startX, y + 4, '🌳 Дерево прогресса');
    const totals = this.goals.totals || {};
    TREE_NODES.forEach((node) => {
      const key = node.check;
      const value = key === 'speciesCount'
        ? (totals.speciesCount ?? room.collection?.size ?? 0)
        : (totals[key] ?? 0);
      const done = value >= node.target;
      const claimed = (this.goals.treeClaimed || []).includes(node.id);
      const rowY = y + 8;
      const color = claimed ? '#666666' : done ? 0xd8a494 : '#aaaaaa';
      this.content.add(this.scene.add.text(startX, rowY, node.text, {
        fontSize: '12px', color
      }));
      this.content.add(this.scene.add.text(startX + w - 8, rowY, claimed ? '✓' : `${value}/${node.target}`, {
        fontSize: '11px', color, align: 'right'
      }).setOrigin(1, 0));

      if (done && !claimed) {
        const treeBtnY = rowY + 22;
        const treeHit = this.scene.add.rectangle(startX + w / 2, treeBtnY + 12, Math.max(w, 44), Math.max(24, 44), 0x000000, 0.001).setInteractive({ useHandCursor: true });
        this.content.add(treeHit);
        const treeBtn = this.scene.add.graphics();
        treeBtn.fillStyle(UNIFIED.color, 1);
        treeBtn.fillRoundedRect(startX, treeBtnY, w, 24, 6);
        treeBtn.lineStyle(1, 0xc9a884, 0.4);
        treeBtn.strokeRoundedRect(startX, treeBtnY, w, 24, 6);
        this.content.add(treeBtn);
        treeHit.on('pointerdown', () => this.scene.socket?.emit('tree-claim', { nodeId: node.id }));
        this.content.add(this.scene.add.text(
          startX + w / 2, treeBtnY + 12, `Забрать: ${node.reward}`,
          { fontSize: '11px', color: '#ffffff' }
        ).setOrigin(0.5));
        y += 50;
      } else {
        y += 24;
      }
    });
  }

  sectionTitle(x, y, text) {
    this.content.add(this.scene.add.text(x, y, text, {
      fontSize: '14px', color: 0xd8a494, fontStyle: 'bold', fontFamily: UI.fontTitle
    }));
    return y + 24;
  }

  destroy() {
    this.scene.showSignpost?.();
    super.destroy();
  }

  update(goals) {
    this.isClaiming = false;
    this.goals = goals;
    this.render();
  }
}
