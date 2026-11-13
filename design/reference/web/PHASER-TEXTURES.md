# Phaser 3.90 — DynamicTexture / RenderTexture: запекаем графику

Источник: <https://phaser.io/oss/docs/phaser/concepts/gameobjects/render-texture>,
`node_modules/phaser/src/textures/DynamicTexture.js`, `.../gameobjects/RenderTexture.js`.

## Зачем

Сейчас фон рисуется `Graphics` и при каждой смене фазы дня **перерисовывается** полосами
(`src/ui/Background.js::_recolorSky` — 10 `fillRect` + пересчёт цвета в цикле). Каждый кадр
`Graphics` — это накопление команд и перестройка геометрии; на телефоне это лишняя работа.

**DynamicTexture** — это текстура, в которую можно рисовать: `Graphics`, спрайты, фреймы,
другие текстуры. Результат — обычная текстура, которую показывают **одним `Image`**.

## Ключевые методы

| Метод | Что делает |
|---|---|
| `rt.fill(rgb, alpha, x, y, w, h)` | залить цветом (можно часть) |
| `rt.clear(x, y, w, h)` | очистить |
| `rt.draw(entries, x, y, alpha, tint)` | нарисовать Game Object / Group / Container / display list / текстуру-строку |
| `rt.drawFrame(key, frame, x, y, alpha, tint)` | нарисовать кадр из Texture Manager |
| `rt.stamp(key, frame, x, y, {alpha, tint, angle, rotation, scale, scaleX, scaleY, originX, originY, blendMode, erase, skipBatch})` | полный контроль над вставкой кадра |
| `rt.repeat(key, frame, x, y, w, h, alpha, tint, skipBatch)` | замостить область текстурой |
| `rt.beginDraw()` … `rt.batchDraw(...)` … `rt.endDraw()` | батч без промежуточныхอ่ flush'ей |
| `rt.erase(entries, x, y)` | «вырезать» (для масок/отверстий) |
| `rt.saveTexture(key)` | сохранить копию в Texture Manager под ключом |
| `rt.snapshot(cb)`, `rt.snapshotArea(x,y,w,h,cb)` | снимок в `HTMLImageElement` |
| `rt.snapshotPixel(x, y, cb)` | цвет пикселя |
| `rt.createBitmapMask()` | маска |

- `RenderTexture` — «shim»: `DynamicTexture` + `Image` в одном объекте. Годится, когда текстура
  нужна ровно одному объекту на экране.
- `DynamicTexture` — когда текстура нужна нескольким объектам/сценам (текстуры глобальны).
- `RenderTexture.camera` — внутренняя камера: `.setScroll`, `.setZoom`, `.setAngle`.
- **WebGL1:** framebuffer без антиалиасинга — `Graphics`/`Shape`, нарисованные в текстуру,
  получают «лесенку» по краям. Обход: заранее рисовать фигуру как текстуру в арт-редакторе.

## Пример (перерисовка фона один раз на фазу дня)

```js
// было: 10 fillRect каждый раз + интерполяция цвета в цикле
// станет: одна текстура на фазу дня, показываем одним Image
const key = `sky_${phase}`;
if (!scene.textures.exists(key)) {
  const rt = scene.add.renderTexture(0, 0, W, H).setOrigin(0);
  const g = scene.make.graphics();
  for (let i = 0; i < 24; i++) {           // 24 полосы вместо 10 → плавнее
    const t = i / 23;
    const col = lerpColor(topColor, bottomColor, t);
    g.fillStyle(col, 1);
    g.fillRect(0, Math.floor(H * t), W, Math.ceil(H / 23) + 1);
  }
  rt.draw(g);
  rt.saveTexture(key);
  g.destroy();
  rt.destroy();
}
this.skyImage.setTexture(key);              // один Image, без перерисовки
```

## Что ещё стоит запечь (не перерисовывать каждый кадр)

- небо/градиент по фазам дня (4 текстуры);
- три слоя холмов (3 текстуры, или 1 общая) — сейчас `Graphics` с `fillEllipse`;
- деревянная рамка сада и дорожки между грядками — сейчас `Graphics` + `strokeRoundedRect`
  в `drawGrid()`, пересоздаётся на каждый resize;
- варианты почвы грядки (сухая/влажная/засохшая) — 3 текстуры 48×48 под тайл;
- «указатель сада» и мелкая статика HUD.

Все они неизменны между кадрами — их место в текстуре, а не в per-frame геометрии.

## Ограничение, о котором надо помнить

`Graphics`, нарисованный в текстуру, остаётся растром: масштабировать без потери качества
нельзя (в отличие от векторного `Graphics` на экране). Поэтому запекаем в размере, близком
к целевому (например, 64×64 для тайла 42–52 px), а не «на глаз».