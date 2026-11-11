# Phaser 3 v3.90.0 — Camera (Phaser.Cameras.Scene2D.Camera)

Source: https://docs.phaser.io/api-documentation/3.90.0/class/cameras-scene2d-camera

## Access
`this.cameras.main` — the main camera of the scene

## Key properties
| Property | Description |
|----------|-------------|
| `zoom` | Camera zoom factor (1 = default) |
| `width` / `height` | Camera dimensions |
| `worldView` | World-space view rectangle |
| `x` / `y` | Camera position |
| `scrollX` / `scrollY` | Camera scroll |

## Key methods
| Method | Description |
|--------|-------------|
| `setZoom(value)` | Set zoom level |
| `zoomTo(value, duration, ease, force)` | Tween zoom to value |
| `fade(duration, red, green, blue, force, callback, context)` | Fade camera to color |
| `fadeIn(duration, ...)` / `fadeOut(duration, ...)` | Fade in/out |
| `flash(duration, red, green, blue, force, callback, context)` | Flash color then fade away |
| `shake(duration, intensity, force, callback, context)` | Shake camera |
| `pan(x, y, duration, ease, force, callback, context)` | Pan to position |
| `setScroll(x, y)` | Set scroll position |

## Camera events (CameraManager / Camera)
- `camerafadeinstart`, `camerafadeincomplete`
- `camerafadeoutstart`, `camerafadeoutcomplete`
- `cameraflashstart`, `cameraflashcomplete`
- `camerashakestart`, `camerashakecomplete`
- `camerapanstart`, `camerapanccomplete`
- `camerazoomstart`, `camerazoomcomplete`

## Usage in Quiet Garden (Watch mode)
- Camera zoom breathes with 30-second yoyo tween: `this.tweens.add({targets: camera, zoom: ..., duration: 30000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'})`
- Watch mode enter/exit resets zoom to 1
