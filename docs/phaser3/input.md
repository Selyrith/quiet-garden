# Phaser 3 v3.90.0 — Input (Phaser.Input.InputPlugin & Pointer)

Source: https://docs.phaser.io/api-documentation/3.90.0/class/input-inputplugin

## Access
`this.input` — the InputPlugin for the scene

## Key methods
| Method | Description |
|--------|-------------|
| `on(event, listener, context)` | Listen to input event |
| `once(event, listener, context)` | Listen once |
| `off(event, listener)` | Remove listener |
| `setDefaultCursor(cursor)` | Set default CSS cursor |
| `onPointerDown(pointer, ...)` / `onPointerUp(...)` | Internal pointer handlers |

## Key input events
| Event | Description |
|-------|-------------|
| `pointerdown` | Pointer pressed down |
| `pointerup` | Pointer released |
| `pointermove` | Pointer moved |
| `pointerover` / `pointerout` | Pointer enters/leaves game object |
| `pointerdrag` / `pointerdragstart` / `pointerdragend` | Drag events |

## Pointer class
`Phaser.Input.Pointer` — represents a touch/mouse pointer
| Property | Description |
|----------|-------------|
| `x` / `y` | Pointer position in world space |
| `worldX` / `worldY` | World-space position |
| `isDown` | Whether pointer is pressed |
| `duration` | How long pointer has been down |
| `buttons` | Which mouse buttons are pressed |

## Game object interactivity
Call `.setInteractive({ useHandCursor: true })` on any game object to make it respond to input events:
```js
const rect = this.add.rectangle(x, y, w, h, color, alpha)
  .setInteractive({ useHandCursor: true });
rect.on('pointerdown', () => { ... });
```

## Important note (from community)
When using `on('pointerdown', function() { ... })`, you must pass `this` as the context (third argument) or use an arrow function, otherwise `this` inside the callback won't refer to the scene:
```js
// Correct:
hit.on('pointerdown', () => { this.handleTileTap(x, y); });
// Or:
hit.on('pointerdown', function() { ... }, this);
```

## Usage in Quiet Garden
- `this.input.once('pointerdown', () => this.sound.resume())` — resume audio context on first interaction (browser requirement)
- `this.input.on('pointerdown', () => this.stressMetrics.recordInput())` — stress telemetry
- Tile hit zones: `hitZone.on('pointerdown', () => this.handleTileTap(x, y))`
- Full-screen hit rect for Watch mode exit cue
