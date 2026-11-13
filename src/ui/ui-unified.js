import Phaser from 'phaser';
import { DS } from './DesignSystem.js';
import { MOBILE, fitTapTarget } from './MobileScale.js';

export const UNIFIED = {
  // Единый цвет для ВСЕХ кнопок и плашек
  color: 0xd8a494,   // базовый (терракотовый)
  colorHi: 0xe8c3a8, // наведение (светлее)
  colorLo: 0xc9a884, // нажатие (темнее)
  colorDisabledAlpha: 0.4,

  // ИЕРАРХИЯ. Раньше все кнопки были одного терракотового цвета, и глазу
  // не за что было зацепиться: интерфейс «сливался в одно».
  // Теперь три уровня: главное действие — насыщенный акцент,
  // второстепенное — контур, третичное — без заливки.
  primary: 0xc9885f,
  primaryHi: 0xd8a494,
  primaryLo: 0xb0734d,
  outline: 0xffffff,
  outlineText: '#5c4a3a',
  text: '#ffffff',
  minTouch: MOBILE.tap,
  radius: MOBILE.radius,

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
  primary = false,
  disabled = false,
  fontSize = '15px',
  fontStyle = 'bold',
  minTouch = UNIFIED.minTouch,
  // Глубина контейнера. Раньше здесь стояло жёстко 9999 — это выше ЛЮБОГО
  // оверлея (max DS.depth.onboarding = 500), поэтому кнопки магазина/меню
  // рисовались поверх тостов и подсказок. По умолчанию — уровень оверлеев.
  depth = DS.overlay.shop,
} = {}) {
  // Вариант primary — единственный «яркий» акцент на экране.
  // Остальные кнопки остаются приглушёнными, чтобы был контраст иерархии.
  const baseColor = primary ? UNIFIED.primary : secondary ? UNIFIED.secondary : UNIFIED.color;
  const textColor = primary ? '#ffffff' : secondary ? UNIFIED.secondaryText : UNIFIED.text;

  // Обёртка контейнера.
  //
  // ВАЖНО про ввод. Phaser обрабатывает только САМЫЙ ВЕРХНИЙ объект под
  // пальцем (InputPlugin.topOnly = true по умолчанию), а порядок считает
  // по позиции в renderList камеры. Когда кнопку делают через
  // scene.add.container(...) и потом add() в контейнер оверлея, её depth
  // остаётся прежним — и она может оказаться НИЖЕ фоновой панели оверлея.
  // Тогда клик достаётся панели, а кнопка выглядит рабочей, но не нажимается.
  //
  // Поэтому: контейнер кнопки получает ту же глубину, что и оверлей,
  // а внутри оверлея кнопка всегда добавляется ПОСЛЕ фона.
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
      textCol = '#a89e94';
    } else if (isPressed) {
      fillColor = primary ? UNIFIED.primaryLo : UNIFIED.colorLo;
    } else if (isHover) {
      fillColor = primary ? UNIFIED.primaryHi : UNIFIED.colorHi;
    }

    g.fillStyle(fillColor, alpha);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, UNIFIED.radius);
    // Обводка: у primary — светлая (отделяет от фона), у остальных — мягкая.
    g.lineStyle(2, primary ? 0xffffff : UNIFIED.colorLo, primary ? 0.55 : 0.6);
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

  // Тач-таргет по мобильным нормам (48dp), но без раздувания: если кнопка
  // шире — берём её ширину, иначе добиваем до 48.
  const fitted = fitTapTarget(w, h);
  const touchW = Math.max(w, minTouch, fitted.w);
  const touchH = Math.max(h, minTouch, fitted.h);
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
