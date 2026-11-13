/**
 * Процедурная текстура грядки.
 *
 * Раньше каждая из 64 грядок рисовалась `Graphics`: заливка + 3 линии борозд +
 * обводка. Это 300+ команд геометрии в сцене и плоский вид.
 *
 * Теперь: 4 варианта текстуры запекаются один раз, грядка — обычный `Image`.
 * Объём даёт запечённый свет: светлая кромка сверху-слева, тень снизу-справа,
 * мягкая внутренняя тень по верхнему краю. Никаких шейдеров — работает и в Canvas.
 *
 * Приёмы: design/reference/web/GAME-REFS.md §2 (drop shadows), §3 (ambient occlusion);
 * Slynyrd Pixelblog-43 (слоистость и «срезание» базовой текстуры).
 */

import { DS } from './DesignSystem.js';
import { bakeTexture, hexColor } from './BakeTexture.js';

/** Размер исходника: кратен тайлу и даёт запас на масштабирование. */
export const SOIL_SIZE = 64;

const VARIANTS = 4;

/** Детерминированный генератор — текстуры одинаковы при каждом запуске. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Запекает один вариант почвы.
 * @param {Phaser.Scene} scene
 * @param {number} variant 0..VARIANTS-1
 * @returns {string} ключ текстуры
 */
export function bakeSoilTexture(scene, variant = 0) {
  const v = ((variant % VARIANTS) + VARIANTS) % VARIANTS;
  const key = `garden_soil_${v}`;
  const size = SOIL_SIZE;

  return bakeTexture(scene, key, size, size, (g) => {
    // Почва светлее и теплее токенов: по референсу (Stardew Valley, Garden
    // Story) вспаханная земля — тёплый коричневый (#8A5A33…), а не почти
    // чёрный. Тёмная земля «съедала» и грядки, и растения на них.
    const lighten = (hex, k) => {
      const r = Math.min(255, Math.round(((hex >> 16) & 0xFF) * k));
      const g2 = Math.min(255, Math.round(((hex >> 8) & 0xFF) * k));
      const b = Math.min(255, Math.round((hex & 0xFF) * k));
      return (r << 16) | (g2 << 8) | b;
    };
    const soil = lighten(hexColor(DS.colors.garden.soil), 1.55);
    const soilLight = lighten(hexColor(DS.colors.garden.soilLight), 1.45);
    const soilDark = lighten(hexColor(DS.colors.garden.soilDark), 1.35);
    const rng = mulberry32(1337 + v * 977);

    // Поле вокруг грядки: при тайле 42–64 px прежние 3% давали меньше
    // пикселя зазора, и грядки сливались в сплошную плиту. 7% + тень дают
    // видимую межу и объём на любом размере тайла.
    const pad = size * 0.07;
    const radius = size * 0.17;
    const w = size - pad * 2;

    // Тень под грядкой: грядка «стоит» на земле, а не парит.
    g.fillStyle(soilDark, 0.22);
    g.fillRoundedRect(pad - 1, pad + 3, w + 2, w + 1, radius + 1);
    g.fillStyle(soilDark, 0.38);
    g.fillRoundedRect(pad, pad + 2, w, w, radius);

    // Основной слой земли.
    g.fillStyle(soil, 1);
    g.fillRoundedRect(pad, pad, w, w, radius);

    // Светлая кромка по верхнему краю — «гребень» вспаханной полосы.
    g.fillStyle(soilLight, 0.30);
    g.fillRoundedRect(pad + 1.5, pad + 1.5, w - 3, Math.max(2, w * 0.22), radius - 1);

    // Борозды: 3 углублённые линии с тенью сверху и светом снизу.
    const furrowY = [0.34, 0.5, 0.66];
    for (const fy of furrowY) {
      const y = size * fy;
      g.fillStyle(soilDark, 0.45);
      g.fillRect(size * 0.2, y, size * 0.6, Math.max(1.5, size * 0.028));
      g.fillStyle(soilLight, 0.35);
      g.fillRect(size * 0.2, y + Math.max(1.5, size * 0.028), size * 0.6, 1);
    }

    // Крошки земли: мелкая детализация, у каждого варианта своя.
    for (let i = 0; i < 26; i++) {
      const px = size * (0.12 + rng() * 0.76);
      const py = size * (0.12 + rng() * 0.76);
      const r = 0.6 + rng() * (size * 0.018);
      const light = rng() > 0.5;
      g.fillStyle(light ? soilLight : soilDark, light ? 0.35 : 0.3);
      g.fillCircle(px, py, r);
    }

    // Свет сверху-слева: тонкая светлая кромка по верхнему и левому краю.
    g.lineStyle(Math.max(1, size * 0.022), soilLight, 0.55);
    g.beginPath();
    g.moveTo(pad + radius * 0.4, pad + 1);
    g.lineTo(pad + w - radius * 0.4, pad + 1);
    g.strokePath();
    g.beginPath();
    g.moveTo(pad + 1, pad + radius * 0.6);
    g.lineTo(pad + 1, pad + w - radius * 0.6);
    g.strokePath();

    // Тень снизу-справа (объём).
    g.lineStyle(Math.max(1.5, size * 0.03), soilDark, 0.7);
    g.beginPath();
    g.moveTo(pad + w - radius * 0.4, pad + w - 1);
    g.lineTo(pad + radius * 0.4, pad + w - 1);
    g.strokePath();
    g.beginPath();
    g.moveTo(pad + w - 1, pad + radius * 0.6);
    g.lineTo(pad + w - 1, pad + w - radius * 0.6);
    g.strokePath();
  });
}

/** Запекает все варианты и возвращает их ключи. */
export function bakeSoilVariants(scene) {
  return Array.from({ length: VARIANTS }, (_, i) => bakeSoilTexture(scene, i));
}

/** Ключ варианта для клетки (детерминирован по координатам). */
export function soilKeyFor(x, y) {
  return `garden_soil_${(((x * 31 + y * 17) % VARIANTS) + VARIANTS) % VARIANTS}`;
}
