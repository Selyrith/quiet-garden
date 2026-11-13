# Phaser 3.90 — свет: Light2D и PointLight

Источники: `node_modules/phaser/src/gameobjects/lights/LightsManager.js`,
`node_modules/phaser/src/renderer/webgl/pipelines/LightPipeline.js`,
`node_modules/phaser/src/renderer/webgl/shaders/src/Light.frag`,
`node_modules/phaser/src/renderer/webgl/shaders/src/PointLight.frag`,
<https://docs.phaser.io/api-documentation/3.90.0/class/gameobjects-lightsmanager>.

## Два разных механизма — не путать

### 1. `Light` + `Light2D` пайплайн (дорогой, «настоящий» свет)

- `this.lights.addLight(x, y, radius, rgb, intensity)` — добавляет источник.
- Чтобы объект **реагировал** на свет, он должен быть отрисован пайплайном `Light2D`:
  `sprite.setPipeline('Light2D')`.
- Шейдер (`Light.frag`) на каждый фрагмент считает:
  - берёт **normal map** объекта (`uNormSampler`) — без него нормаль считается «вверх» и свет
    выглядит плоско;
  - для каждого источника: направление, `diffuseFactor = max(dot(normal, lightNormal), 0)`,
    `attenuation = clamp(1 - dist²/radius², 0, 1)`;
  - суммирует в `uAmbientLightColor + finalColor`.
- **Ограничение `maxLights`** — максимум одновременно обрабатываемых источников, по умолчанию `10`,
  задаётся **только в конфиге игры** (`maxLights`), в рантайме не меняется. Лишние вещи
  отбрасываются по расстоянию от центра камеры (`getLights(camera)` → сортировка → срез).
- **Graphics/Shape нельзя перевести на Light2D** — прямая цитата из документации `LightsPlugin`:
  «Note that you cannot use this pipeline on Graphics Game Objects or Shape Game Objects.»
- Phaser не рисует normal map автоматически: его надо готовить в арт-редакторе и подавать
  объекту отдельным keyed-файлом. У нас 300 процедурных текстур растений и Graphics-грядки —
  нормалей нет и взять их негде.

**Вывод:** Light2D для Quiet Garden не подходит без смены способа рисания мира (текстуры + normal maps).
Не внедряем.

### 2. `PointLight` (дешёвый, «локальный» свет)

- `this.lights.addPointLight(x, y, color, radius, intensity, attenuation)` — создаёт Game Object `PointLight`.
- **Не** требует normal map и **не** влияет на другие объекты: он сам рисует мягкий радиальный
  градиент своим шейдером (`PointLight.frag`: `smoothstep` по расстоянию от центра).
- По документации: «extremely fast to render compared to Lights», рекомендуется батчить
  (Layer из одних PointLight'ов) и не смешивать с обычным списком дисплея, если их много.
- Автоматический куллинг: источники, не пересекающие камеру, пропускаются каждый кадр.
- Только WebGL.
- `attenuation` — сила затухания от центра, маленькие значения (0.1).

**Вывод:** вот это — наш инструмент «уютного свечения»: фонари, светлячки, окна, кристаллы.
Дешёво, без нормалей, работает поверх уже нарисованной картинки (аддитивно, как ореол).

## Псевдо-3D объём почвы без шейдеров

Статичный приём из 2D-практики (Stardew/Hay Day-подобные игры): грядка рисуется текстурой, в которой
запечён свет сверху-слева и тень снизу-справа, плюс «борозды». Это даёт объём без единого шейдера.
У нас сейчас грядка — `Graphics`: плоская заливка `#4a2f1f`, три линии-борозды, тёмная эллипса-тень.
Улучшение без FX: запечь 3–4 варианта текстуры почвы (светлая/влажная/тёмная) в `DynamicTexture`
и подменять `texture` у `Image` — со состоянием «полито/засохло».

## Тёплый свет по фазам дня (без шейдеров)

- «Золотой час» — `WorldTint` уже умеет: полноэкранный прямоугольник с твином цвета/альфы.
- Усиление: поверх — 1–2 `PointLight` у фонарей, у которых альфа/интенсивность растёт к вечеру.
- Ночь: светлячки уже есть (`WeatherEffects.fireflies`, ADD-частицы).

## Чего избегать

- `preFX.addGlow` наmany объектах — известные просадки (issue #6393).
- Light2D без normal maps — свет будет «плоским» и всё равно потребует текстур вместо Graphics.
- `maxLights` > 10 без необходимости — дорогой цикл в шейдере на каждый фрагмент.