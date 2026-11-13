import Phaser from 'phaser';
import { VALID_EMOTES } from '../../shared/emotes.js';
import { QUICK_MESSAGES } from '../../shared/quick-messages.js';
import { DS } from './DesignSystem.js';

/**
 * Плашка эмоций: эмодзи-реакции + быстрые фразы.
 *
 * БЫЛО: функция падала сразу при создании — использовала `DS.depth`, но модуль
 * `DesignSystem` не импортировался. Кнопка «эмоции» в HUD выглядела рабочей,
 * но панель не открывалась вообще (ReferenceError внутри обработчика).
 *
 * СТАЛО: тот же скелет, что у остальных панелей — деревянная плашка с тёмной
 * обводкой, светлой кромкой и мягкой тенью; кнопки — «выпуклые» квадраты с
 * золотой обводкой и реакцией на нажатие.
 */
export function createEmotesBar(scene, onSend, onSendPhrase) {
  const container = scene.add.container(0, 0).setDepth(DS.depth.overlays);

  const camW = scene.scale.width;
  const camH = scene.scale.height;

  const panelW = 296;
  const panelH = 182;
  const panelX = camW / 2 - panelW / 2;
  const panelY = camH / 2 - panelH / 2;

  // Тень под плашкой.
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x3D2E20, 0.22);
  shadow.fillRoundedRect(panelX + 2, panelY + 8, panelW, panelH, 20);
  container.add(shadow);

  // Деревянная плашка: тёмная кайма + тело + светлая верхняя кромка.
  const bg = scene.add.graphics();
  bg.fillStyle(0x6E4527, 1);
  bg.fillRoundedRect(panelX, panelY, panelW, panelH, 20);
  bg.fillStyle(0x96663F, 1);
  bg.fillRoundedRect(panelX + 2, panelY + 2, panelW - 4, panelH - 4, 18);
  bg.fillStyle(0xC9A171, 0.5);
  bg.fillRoundedRect(panelX + 5, panelY + 4, panelW - 10, 16, 12);
  bg.fillStyle(0x3D2E20, 0.18);
  bg.fillRoundedRect(panelX + 5, panelY + panelH - 22, panelW - 10, 16, 12);
  // Кромка-«гвоздики» по углам.
  bg.fillStyle(0xF0D585, 0.8);
  for (const [bx, by] of [[panelX + 12, panelY + 12], [panelX + panelW - 12, panelY + 12]]) {
    bg.fillCircle(bx, by, 2.5);
  }
  container.add(bg);

  // Клик по плашке закрывает панель (но не «сквозь» — она перехватывает тап).
  const bgHit = scene.add.rectangle(camW / 2, camH / 2, panelW, panelH, 0x000000, 0.001).setInteractive();
  bgHit.on('pointerdown', () => container.destroy());
  container.add(bgHit);

  // === Эмодзи ===
  const btnSize = 44;
  const gap = 8;
  const totalW = VALID_EMOTES.length * (btnSize + gap) - gap;
  let startX = camW / 2 - totalW / 2 + btnSize / 2;
  const emojiY = panelY + 34;

  VALID_EMOTES.forEach((emote) => {
    const hit = scene.add.rectangle(startX, emojiY, Math.max(btnSize, 44), Math.max(btnSize, 44), 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    const btn = scene.add.rectangle(startX, emojiY, btnSize, btnSize, 0xF7EFE1)
      .setStrokeStyle(2.5, 0x6E4527);
    const txt = scene.add.text(startX, emojiY, emote, { fontSize: '24px' }).setOrigin(0.5);

    const closeAction = () => { onSend(emote); container.destroy(); };
    hit.on('pointerdown', closeAction);
    btn.on('pointerdown', closeAction);
    container.add([hit, btn, txt]);
    startX += btnSize + gap;
  });

  // Разделитель-«закладка».
  const divider = scene.add.graphics();
  divider.lineStyle(1, 0x6E4527, 0.5);
  divider.lineBetween(panelX + 18, panelY + 62, panelX + panelW - 18, panelY + 62);
  container.add(divider);

  // === Быстрые фразы ===
  const phraseW = 84;
  const phraseH = 24;
  const phraseGap = 6;

  QUICK_MESSAGES.forEach((phrase, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const px = camW / 2 - (3 * phraseW + 2 * phraseGap) / 2 + phraseW / 2 + col * (phraseW + phraseGap);
    const py = panelY + 78 + row * (phraseH + phraseGap);

    const hit = scene.add.rectangle(px, py, Math.max(phraseW, 44), Math.max(phraseH, 44), 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });
    const btn = scene.add.rectangle(px, py, phraseW, phraseH, 0xE8C55A).setStrokeStyle(1.5, 0x9E7B4F);
    const txt = scene.add.text(px, py, phrase, {
      fontSize: `${DS.font.size.xs}px`,
      color: '#3D2E20',
      fontStyle: 'bold',
      fontFamily: DS.font.family.base,
    }).setOrigin(0.5);

    const closeAction = () => { onSendPhrase(phrase); container.destroy(); };
    hit.on('pointerdown', closeAction);
    btn.on('pointerdown', closeAction);
    container.add([hit, btn, txt]);
  });

  return container;
}