# Phaser 3.90 — встроенные пост-эффекты (FX Pipeline)

Источник: <https://docs.phaser.io/api-documentation/3.90.0/class/gameobjects-components-fx>,
<https://docs.phaser.io/phaser/concepts/fx>, <https://docs.phaser.io/api-documentation/3.90.0/class/gameobjects-lightsmanager>.
Шейдеры, на которых всё построено, лежат в `node_modules/phaser/src/renderer/webgl/shaders/src/`
(`FXBloom.frag`, `FXGlow.frag`, `FXBlurLow/Med/High.frag`, `FXVignette.frag`, `FXShadow.frag`,
`FXShine.frag`, `FXGradient.frag`, `ColorMatrix.frag`).

## Два уровня эффектов

- **`preFX`** — применяется к текстуре объекта до отрисовки. Доступно только
  texture-based объектам: `Image`, `Sprite`, `TileSprite`, `Text`, `RenderTexture`, `Video`.
  Требует `padding` под свечение/тень: `obj.preFX.setPadding(16)`.
- **`postFX`** — применяется после отрисовки, в отдельном framebuffer размером с канвас.
  Доступно **всем** Game Object'ам и **камерам**.

Оба — **только WebGL**. В Canvas-режиме эффекта нет, объект рисуется как обычно.
Любой эффект в проекте обязан иметь не-шейдерный фолбэк.

## Таблица эффектов

| Метод | Подпись | Дефолты | Заметки |
|---|---|---|---|
| `addBloom` | `(color, offsetX, offsetY, blurStrength, strength, steps)` | `0xffffff,1,1,1,1,4` | steps — целое; выше = больше gl-операций, экспоненциально дороже |
| `addGlow` | `(color, outerStrength, innerStrength, knockout, quality, distance)` | `0xffffff,4,0,false,0.1,10` | `quality`/`distance` задаются **только при создании** (postFX). Тяжёлый — см. ниже |
| `addBlur` | `(quality, x, y, strength, color, steps)` | `0,2,2,1,0xffffff` | 0=low, 1=med, 2=high |
| `addBokeh` | `(radius, amount, contrast)` | `0.5,1,0.2` | + `addTiltShift(radius, amount, contrast, blurX, blurY, strength)` |
| `addCircle` | `(thickness, color, backgroundColor, scale, feather)` | `8,0xfeedb6,0xff0000,1,0.005` | кольцо/аватар-рамка |
| `addColorMatrix` | `()` | — | `.saturate(v)`, `.brightness(v)`, `.contrast(v)`, `.hue(deg)`, `.sepia()`, `.night(i)`, `.brown()`, `.vintagePinhole()`, `.kodachrome()` … |
| `addDisplacement` | `(texture, x, y)` | `'__WHITE',0.005,0.005` | карта смещения — целая текстура, не кадр атласа |
| `addGradient` | `(color1, color2, alpha, fromX, fromY, toX, toY, size)` | `0xff0000,0x00ff00,0.2,0,0,0,1,0` | size=0 → плавный, >0 → «чUNKY» ретро-полосы |
| `addPixelate` | `(amount)` | `1` | |
| `addShadow` | `(x, y, decay, power, color, samples, intensity)` | `0,0,0.1,1,0x000000,6,1` | samples 1..12 — целое |
| `addShine` | `(speed, lineWidth, gradient, reveal)` | `0.5,0.5,3,false` | «блик» по поверхности |
| `addVignette` | `(x, y, radius, strength)` | `0.5,0.5,0.5,0.5` | значения нормализованы 0..1 |
| `addWipe` / `addReveal` | `(wipeWidth, direction, axis)` | `0.1,0,0` | `progress` анимируется твином; direction/axis: 0/0 →, 1/0 ←, 1/1 ↓, 0/1 ↑ |

Управление: `effect.setActive(false)`, `obj.preFX.remove(effect)`, `obj.postFX.clear()`,
`obj.clearFX()` (и pre, и post).

## Цена (и почему у нас пока без FX)

- Каждый FX-контроллер = отдельный проход по framebuffer'у. Пост-эффект на объекте
  переводит **весь** объект в отдельный рендер-таргет, размером с объект (preFX) или с канвас (postFX).
- `addBloom(steps=4)` — 4 « Fetch»-прохода с 5 сэмплами каждый. На 64 спрайтах это уже заметно на телефоне.
- **Задокументированная проблема производительности:** `preFX.addGlow` на 1024×896 давал ~8 fps
  (issue phaserjs/phaser#6393, 2023-02). При этом `addVignette`, `addBokeh`, `addBlur` на той же
  картинке держали 60 fps.
- Вывод для нас: **не** вешать glow/bloom на 64 грядки и 300 текстур растений.
  Точечно — на 1–2 «геройских» объекта (созревшее растение, кристалл, фонарь), и только в WebGL.

## Что уже есть в проекте и работает без FX

| Приём | Реализация | Файл |
|---|---|---|
| Виньетка | 6 вложенных `strokeRoundedRect` с затуханием + угловые круги | `src/ui/Vignette.js` |
| Свечение созревшего растения | `circle` + `BlendModes.ADD` + твин альфы/масштаба | `GameSceneTiles.updateTile` |
| Искры | один общий `ParticleEmitter` (`spark_particle`, ADD), `emitParticleAt` | `GameScene.create`, `GameSceneTiles.spawnParticles` |
| Тень растения | `ellipse` с альфой, масштабируется по стадии | `GameScene.createTile`, `tickTiles` |
| Тонирование мира | полноэкранный `rectangle`, твин цвета/альфы | `src/ui/WorldTint.js` |
| Погода | частицы дождя/снега/тумана + полосы «луж» | `src/ui/WeatherEffects.js` |

Все эти приёмы — дешёвые и Canvas-совместимые. Их-minus: плоско, без объёма и без «дорогого» света.