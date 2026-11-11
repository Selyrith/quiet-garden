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
    
    // 1. Рисуем контур (4 стороны) со смещением
    drawPixelPlant(g, plant, scale, 0, null, ox - 1, oy, true);
    drawPixelPlant(g, plant, scale, 0, null, ox + 1, oy, true);
    drawPixelPlant(g, plant, scale, 0, null, ox, oy - 1, true);
    drawPixelPlant(g, plant, scale, 0, null, ox, oy + 1, true);
    
    // 2. Рисуем цветное растение
    drawPixelPlant(g, plant, scale, 0, null, ox, oy, false);
    
    // Генерируем текстуру
    g.generateTexture(key, size, size);
    g.destroy();
  }
}