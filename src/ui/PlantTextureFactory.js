import { getPlant } from '../../shared/plants.js';
import { drawPixelPlant } from './PixelArt.js';

/**
 * Генерирует 300 текстур для всех растений при запуске игры.
 * Это занимает немного времени при загрузке, но потом игра летает.
 */
export function generateAllPlantTextures(scene) {
  const size = 128;
  
  for (let i = 0; i < 300; i++) {
    const key = `plant_${i}`;
    if (scene.textures.exists(key)) continue;
    
    const plant = getPlant(i);
    const g = scene.make.graphics();
    
    // Смещение отрисовки: центр по X, низ с отступом 10px по Y
    const ox = size / 2;
    const oy = size - 10;
    const scale = 1.0;
    
    // 1. Контур.
    //
    // БЫЛО: сдвиг на 1 px в 128-пиксельной текстуре. На грядке 42–60 px это
    // 0.3–0.5 экранного пикселя — контур пропадал при уменьшении, и растения
    // выглядели как цветные пятна без формы.
    // СТАЛО: 3 px по осям и 2 px по диагоналям (8 направлений) — после
    // уменьшения остаётся честный тёмный контур ~1 px, как в референсе
    // (Stardew Valley: у каждого объекта тёмный контур).
    const OUT = 3;
    const OUT_D = 2;
    const dirs = [
      [-OUT, 0], [OUT, 0], [0, -OUT], [0, OUT],
      [-OUT_D, -OUT_D], [OUT_D, -OUT_D], [-OUT_D, OUT_D], [OUT_D, OUT_D],
    ];
    for (const [dx, dy] of dirs) {
      drawPixelPlant(g, plant, scale, 0, null, ox + dx, oy + dy, true);
    }
    
    // 2. Рисуем цветное растение
    drawPixelPlant(g, plant, scale, 0, null, ox, oy, false);
    
    // Генерируем текстуру
    g.generateTexture(key, size, size);
    g.destroy();
  }
}