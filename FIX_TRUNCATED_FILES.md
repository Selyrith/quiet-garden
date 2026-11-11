# Fix: восстановлены два обрезанных файла

## Что было

Оба файла пришли усечёнными — Vite не может их распарсить, отсюда
"Failed to parse source for import analysis".

- `src/scenes/GameSceneTiles.js` — обрывался на `export const GameSceneTiles = { updateTile(key, stage, progress = 0, seed = null, instant = false,` без тела.
- `src/ui/PixelArt.js` — обрывался на `if (mut.type === 'gl` посреди строки.

## Что сделано

Оба файла восстановлены. Соблюдены существующие сигнатуры, чтобы не менять
GameScene / GameSceneNetwork / GameSceneUi и все UI-оверлеи, которые вызывают
`drawPixelPlant(...)`.

### `GameSceneTiles.js` — публичный API

- `updateTile(key, stage, progress, seed, instant, mutationIndex)` — вызывается из `initial-state`, `tile-updated`, `stage-updates`.
- `setProgress(key, progress)` — вызывается каждые 2 сек из `progress-updates`, только полоска прогресса, без перерисовки растения.
- `refreshWetVisuals()` — вызывается раз в 500 мс из `time.addEvent`, фейдит wet overlay по `tile.wetUntil`.
- `markTileWet(key, duration)`, `flashTile(key, color)`, `spawnParticles(key, color)`, `spawnCoinPopup(key, amount)` — то, что дергают `tile-updated` и `initial-state` хендлеры.

Что добавлено по сравнению с (утраченным) оригиналом:
- рамка тайла подсвечивается редкостью растения, когда оно созрело (`plantTileColor` — импорт уже был в файле);
- поп-ин и bloom-кольцо при созревании — без них посадка читалась плоско;
- все твины защищены `killTweensOf` — иначе повторный `updateTile` во время анимации сбивает `scale`.

### `PixelArt.js` — публичный API

- `drawPixelPlant(g, plant, scale, sway, mutationIndex, offsetX, offsetY, isOutline)` — та же сигнатура, что и раньше.
- `hsl(h, s, l)` — без изменений.

Что важно по мутациям:
- `color` — подменяет hue;
- `size` — `extraScale = 1.4`;
- `glow` — рисует два полупрозрачных круга позади стебля;
- `gold` — фиксированная золотая палитра;
- `rainbow` — каждый лепесток своего цвета, центр — комплементарный.

`isOutline=true` — четыре смещённых прохода дают чёрный силуэт, потом
рисуется цветной проход (`PlantTextureFactory.js` уже использует эту схему).

## Как проверить

1. `npm start` — больше не должно быть ошибок `import-analysis`.
2. Открой игру, посади семя — оно должно появиться с поп-ин анимацией.
3. Полей — wet overlay с каплями станет видимым и угаснет через 60 сек.
4. Дождись созревания — bloom-кольцо золотого цвета, рамка тайла станет цвета редкости.
5. Собери — партиклы и `+N` всплывают над тайлом.
6. Открой Книгу, зайди в мутацию — растение с мутацией рисуется в правильном цвете.

## Что осталось

- В `drawPixelPlant` я не стал рисовать пиксельные ступеньки (в исходнике их,
  судя по всему, и не было — всё на `fillCircle`). Если нужен строгий pixel-art
  вид — это отдельная задача, за рамками этого фикса.
- `sway` передаётся, но нигде не используется (все вызовы передают 0).
  Логика оставлена на будущее — если захотите покачивание на ветру,
  амплитуда уже зашита в `swayAmp`.
