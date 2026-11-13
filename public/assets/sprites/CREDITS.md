# Sprite credits and asset scope

## Kenney — Tiny Farm
- Source: [Kenney.nl asset pack](https://kenney.nl/assets/tiny-farm)
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- The original `License.txt` is kept in `tiny-farm/`.
- Used here only for the pet-egg icon (`tile_0125.png`); the farm crops and livestock are not mapped onto Quiet Garden's fantasy plants or pets.

## Растительный мир и декор Quiet Garden — процедурные

Всё остальное в игре рисуется кодом, а не берётся из внешних паков:

| Что | Где |
|---|---|
| 300 текстур растений | `src/ui/PlantTextureFactory.js` + `src/ui/PixelArt.js` |
| Почва грядки (4 варианта) | `src/ui/SoilTexture.js` |
| Рамка сада и дорожки | `src/ui/GardenFrame.js` |
| Пруд, фонари, скамейка, кустики, ореолы света | `src/ui/GardenDecor.js` |
| Небо, холмы, солнце, луна, звёзды, облака | `src/ui/Background.js` |
| Частицы погоды и сезонов | `src/ui/WeatherEffects.js`, `src/ui/AmbientEffects.js` |

Причина: единый code-drawn стиль важнее «фотографичности», а у сторонних
наборов спрайтов разные масштаб, палитра и лицензии. Обоснование и
техники — в `design/reference/web/`.

## Удалено

Ранее в `public/assets/sprites/magic-garden/` лежали нарезки из листа,
предоставленного пользователем, и LPC-растения. Они удалены: стиль не совпадал
с процедурной графикой, а лицензия на пользовательский лист не была указана.
Если лист понадобится снова — сначала фиксируем автора и лицензию, потом кладём.
