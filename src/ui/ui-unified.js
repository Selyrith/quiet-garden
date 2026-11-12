import Phaser from 'phaser';
import { DS } from './DesignSystem.js';

export const UNIFIED = {
  // Единый цвет для ВСЕХ кнопок и плашек
  color: 0xd8a494,   // базовый (терракотовый)
  colorHi: 0xe8c3a8, // наведение (светлее)
  colorLo: 0xc9a884, // нажатие (темнее)
  colorDisabledAlpha: 0.4,
  text: '#ffffff',
  minTouch: 44,
  radius: 12,

  // Вторичный цвет для закрытия / отклонения (ниже по иерархии)
  secondary: 0x8e7b63,
  secondaryText: '#ffffff',

  // Ошибка — только деструктивные действия (сброс, удаление)
  error: 0xcb8a6b,
  errorText: '#f8f4ee',
};

/**
 * Единая кнопка для всего интерфейса.
 * Состояния: idle / hover / pressed / disabled.
 * Минимальный тач-таргет 44×44.
 */
export function createUnifiedButton(scene, x, y, w, h, label, onClick, {
  secondary = false,
  disabled = false,
  fontSize = '15px',
  fontStyle = 'bold',
  minTouch = UNIFIED.minTouch,
  // Глубина контейнера. Раньше здесь стояло жёстко 9999 — это выше ЛЮБОГО
  // оверлея (max DS.depth.onboarding = 500), поэтому кнопки магазина/меню
  // рисовались поверх тостов и подсказок. По умолчанию — уровень оверлеев.
  depth = DS.overlay.shop,
} = {}) {
  const baseColor = secondary ? UNIFIED.secondary : UNIFIED.color;
  const textColor = secondary ? UNIFIED.secondaryText : UNIFIED.text;

  // Обёртка контейнера
  const container = scene.add.container(x, y);
  container.setDepth(depth);

  // Визуальная кнопка (графика, чтобы управлять состоянием)
  const g = scene.add.graphics();
  const draw = (state) => {
    g.clear();
    const isHover = state === 'hover';
    const isPressed = state === 'pressed';
    const isDisabled = state === 'disabled';

    let fillColor = baseColor;
    let textCol = textColor;
    let alpha = 1;

    if (isDisabled) {
      fillColor = baseColor;
      alpha = UNIFIED.colorDisabledAlpha;
      textCol = '#aaaaaa';
    } else if (isPressed) {
      fillColor = UNIFIED.colorLo;
    } else if (isHover) {
      fillColor = UNIFIED.colorHi;
    }

    g.fillStyle(fillColor, alpha);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, UNIFIED.radius);
    g.lineStyle(2, UNIFIED.colorLo, 0.6);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, UNIFIED.radius);

    // Блик сверху (кроме pressed/disabled)
    if (!isPressed && !isDisabled) {
      g.fillStyle(0xffffff, 0.12);
      g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h / 2 - 4, 8);
    }
  };
  draw('idle');
  container.add(g);

  // Текст метки
  const text = scene.add.text(0, 0, label, {
    fontSize, fontStyle, color: textColor, fontFamily: 'Nunito, sans-serif',
  }).setOrigin(0.5);
  container.add(text);

  // Тач-таргет: минимум 44×44, бинтим на весь контейнер
  const touchW = Math.max(w, minTouch);
  const touchH = Math.max(h, minTouch);
  const hit = scene.add.rectangle(0, 0, touchW, touchH, 0x000000, 0.001);
  hit.setInteractive({ useHandCursor: !disabled });
  container.add(hit);

  // Состояния
  let currentState = disabled ? 'disabled' : 'idle';

  const setState = (state) => {
    if (currentState === state) return;
    currentState = state;
    draw(state);
    if (!disabled) {
      text.setColor(state === 'disabled' ? '#aaaaaa' : textColor);
    }
  };

  hit.on('pointerover', () => { if (!disabled) setState('hover'); });
  hit.on('pointerout', () => { if (!disabled) setState('idle'); });
  hit.on('pointerdown', () => {
    if (disabled) return;
    setState('pressed');
    if (typeof onClick === 'function') onClick();
  });
  hit.on('pointerup', () => { if (!disabled) setState('hover'); });
  hit.on('pointerupoutside', () => { if (!disabled) setState('idle'); });

  // Публичные методы
  container.setDisabled = (val) => {
    disabled = val;
    hit.setInteractive({ useHandCursor: !disabled });
    setState(disabled ? 'disabled' : 'idle');
  };
  container.setLabel = (newLabel) => { text.setText(newLabel); };

  return container;
}

/**
 * Единая плашка (бадж) — круг, единый цвет, используется для мутаций, MAX, статусов.
 */
export function createUnifiedBadge(scene, x, y, text, {
  radius = 10,
  disabled = false,
  fontSize = '10px',
} = {}) {
  const container = scene.add.container(x, y);

  const bg = scene.add.circle(0, 0, radius, UNIFIED.color,
    disabled ? UNIFIED.colorDisabledAlpha : 1);
  bg.setStrokeStyle(1.5, '#ffffff', 1);
  container.add(bg);

  const txt = scene.add.text(0, 0, text, {
    fontSize, fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5);
  if (disabled) txt.setColor('#aaaaaa');
  container.add(txt);

  container.setDisabled = (val) => {
    disabled = val;
    bg.setAlpha(disabled ? UNIFIED.colorDisabledAlpha : 1);
    txt.setColor(disabled ? '#aaaaaa' : '#ffffff');
  };

  return container;
}

/**
 * Единый переключатель (toggle) для настроек.
 * Включён — unified color, выключен — secondary.
 */
export function createUnifiedToggle(scene, x, y, label, isOn, onChange, {
  size = 44,
  trackRadius = 14,
  knobRadius = 10,
  fontSize = '16px',
} = {}) {
  const container = scene.add.container(x, y);

  const track = scene.add.circle(0, 0, trackRadius,
    isOn ? UNIFIED.color : UNIFIED.secondary);
  track.setStrokeStyle(2, UNIFIED.colorLo, 1);
  track.setInteractive({ useHandCursor: true });
  container.add(track);

  const knob = scene.add.circle(isOn ? 8 : -8, 0, knobRadius, 0xffffff);
  container.add(knob);

  const txt = scene.add.text(-size / 2 - 10, 0, label, {
    fontSize, color: '#5c4a3a',
  }).setOrigin(0, 0.5);
  container.add(txt);

  let on = isOn;
  track.on('pointerdown', () => {
    on = !on;
    knob.x = on ? 8 : -8;
    track.fillStyle(on ? UNIFIED.color : UNIFIED.secondary, 1);
    if (typeof onChange === 'function') onChange(on);
  });

  container.setValue = (val) => {
    on = val;
    knob.x = on ? 8 : -8;
    track.fillStyle(on ? UNIFIED.color : UNIFIED.secondary, 1);
  };

  return container;
}
