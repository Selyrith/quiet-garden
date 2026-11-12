import Phaser from 'phaser';
import { VALID_EMOTES } from '../../shared/emotes.js';
import { QUICK_MESSAGES } from '../../shared/quick-messages.js';
import { UNIFIED } from './ui-unified.js';

export function createEmotesBar(scene, onSend, onSendPhrase) {
  const container = scene.add.container(0, 0).setDepth(DS.depth.overlays);
  const camW = scene.scale.width;
  const camH = scene.scale.height;
  // Расширенный фон для эмодзи + фраз — единый цвет фона
  const bg = scene.add.rectangle(camW / 2, camH / 2 + 20, 280, 170, 0x5c4a3a, 0.95).setStrokeStyle(2, UNIFIED.secondary).setInteractive();
  container.add(bg);

  // Эмодзи (верхняя часть) — unified color, 44×44 min touch
  const btnSize = Math.max(40, 44), gap = 8;
  const totalW = VALID_EMOTES.length * (btnSize + gap) - gap;
  let startX = camW / 2 - totalW / 2 + btnSize / 2;

  VALID_EMOTES.forEach((emote) => {
    const hit = scene.add.rectangle(startX, camH / 2 - 10, Math.max(btnSize, 44), Math.max(btnSize, 44), 0x000000, 0.001).setInteractive({ useHandCursor: true });
    const btn = scene.add.rectangle(startX, camH / 2 - 10, btnSize, btnSize, 0xd8a494).setInteractive({ useHandCursor: true });
    btn.setStrokeStyle(1, 0xc9a884);
    const txt = scene.add.text(startX, camH / 2 - 10, emote, { fontSize: '22px' }).setOrigin(0.5);
    const closeAction = () => {
      onSend(emote);
      container.destroy();
    };
    hit.on('pointerdown', closeAction);
    btn.on('pointerdown', closeAction);
    container.add([hit, btn, txt]);
    startX += btnSize + gap;
  });

  // Разделитель
  const divider = scene.add.text(camW / 2, camH / 2 + 48, '───', { fontSize: '12px', color: '#6b5b4b' }).setOrigin(0.5);
  container.add(divider);

  // Быстрые фразы (нижняя часть) — 2 ряда по 3 — unified color
  const phraseW = 84, phraseH = 24, phraseGap = 6;
  QUICK_MESSAGES.forEach((phrase, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const px = camW / 2 - (3 * phraseW + 2 * phraseGap) / 2 + phraseW / 2 + col * (phraseW + phraseGap);
    const py = camH / 2 + 65 + row * (phraseH + phraseGap);
    const hit = scene.add.rectangle(px, py, Math.max(phraseW, 44), Math.max(phraseH, 44), 0x000000, 0.001).setInteractive({ useHandCursor: true });
    const btn = scene.add.rectangle(px, py, phraseW, phraseH, 0xd8a494).setInteractive({ useHandCursor: true });
    btn.setStrokeStyle(1, 0xc9a884);
    const txt = scene.add.text(px, py, phrase, { fontSize: '11px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    const closeAction = () => {
      onSendPhrase(phrase);
      container.destroy();
    };
    hit.on('pointerdown', closeAction);
    btn.on('pointerdown', closeAction);
    container.add([hit, btn, txt]);
  });

  bg.on('pointerdown', () => container.destroy());
  return container;
}
