# Phaser 3 v3.90.0 — Scene Class (Phaser.Scene)

Source: https://docs.phaser.io/api-documentation/3.90.0/class/scene

## Constructor
`new Scene([config])` — config: string | SettingsConfig

## Scene lifecycle callbacks (optional methods you can define)
- `init(data)` — called when scene starts
- `preload()` — queue assets for downloading
- `create(data)` — create game objects after preload
- `update(time, delta)` — called every game step

## Key public members (Scene Injection Map)
| Member | Type | Description |
|--------|------|-------------|
| `add` | GameObjectFactory | Create game objects (image, text, graphics, container, rectangle, particles, etc.) |
| `anims` | AnimationManager | Global animation manager |
| `cache` | CacheManager | Global cache |
| `cameras` | CameraManager | Scene camera manager; `cameras.main` is the main camera |
| `children` | DisplayList | Game object display list |
| `data` | DataManager | Scene-specific data manager |
| `events` | EventEmitter | Scene-specific event emitter |
| `input` | InputPlugin | Input system; pointer events, `on('pointerdown')` |
| `load` | LoaderPlugin | Asset loader |
| `make` | GameObjectCreator | Create game objects without adding to display list (e.g. `make.graphics()`) |
| `registry` | DataManagerPlugin | Global data manager |
| `scale` | ScaleManager | Canvas scaling |
| `sound` | BaseSoundManager | Sound manager |
| `textures` | TextureManager | Texture manager; `exists(key)`, `generateTexture` |
| `time` | Time | Clock, timed events |
| `tweens` | TweenManager | Tween animations |

## Key methods relevant to Quiet Garden
- `this.add.graphics()` / `this.make.graphics()` — create graphics object
- `this.add.image(x, y, key)` — create image from texture
- `this.add.text(x, y, text, style)` — create text
- `this.add.container(x, y)` — create container
- `this.add.rectangle(...)` / `this.add.ellipse(...)` — create shape
- `this.add.particles(...)` — create particle emitter
- `this.cameras.main` — main camera; supports `.zoom`, `.fade()`, `.flash()`, `.shake()`, `.pan()`
- `this.input.on('pointerdown', handler)` / `this.input.once('pointerdown', handler)` — pointer input
- `this.textures.exists(key)` — check if texture exists
- `this.tweens.add({targets, ...})` — create tween
- `this.time.addEvent({delay, callback, loop})` — timed event
- `this.events.on('shutdown', handler)` / `this.events.once('shutdown')` — scene shutdown
- `this.scene.start(key)` / `this.scene.stop(key)` — scene management

## Scene events
- `create`, `destroy`, `pause`, `resume`, `sleep`, `wake`, `shutdown`, `transitioninit`, `transitionstart`, `transitioncomplete`
