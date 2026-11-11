# Phaser 3 v3.90.0 — Graphics Class (Phaser.GameObjects.Graphics)

Source: https://docs.phaser.io/api-documentation/3.90.0/class/gameobjects-graphics

## Description
A Graphics object draws primitive shapes (rectangles, circles, polygons, lines, arcs, curves). Initially empty. Specify line/fill style, draw shapes, then fill/stroke.

## Key methods
| Method | Description |
|--------|-------------|
| `lineStyle(width, color, alpha)` | Set line style |
| `fillStyle(color, alpha)` | Set fill style |
| `fillRect(x, y, w, h)` / `strokeRect(...)` | Draw/stroke rectangle |
| `fillCircle(x, y, r)` / `strokeCircle(...)` | Draw/stroke circle |
| `fillEllipse(x, y, w, h)` / `strokeEllipse(...)` | Draw/stroke ellipse |
| `fillTriangle(...)` / `strokeTriangle(...)` | Draw/stroke triangle |
| `fillRoundedRect(x, y, w, h, radius)` | Draw rounded rectangle |
| `strokeRoundedRect(...)` | Stroke rounded rectangle |
| `lineBetween(x1, y1, x2, y2)` | Draw line between two points |
| `beginPath()` / `closePath()` / `moveTo()` / `lineTo()` / `arc()` | Path-based drawing |
| `fillPath()` / `strokePath()` | Fill/stroke current path |
| `clear()` | Clear all graphics commands |
| `generateTexture(key, width, height)` | Bake Graphics into a Texture in the Texture Manager |
| `setDepth(value)` / `setScrollFactor(value)` | Rendering properties |

## generateTexture (critical for Quiet Garden)
- Bakes a Graphics object into a Texture and adds it to the Texture Manager under `key`
- If `key` already exists, behavior depends on version — check for conflicts
- Texture is created via Canvas API; some features like `fillGradientStyle` won't appear on the generated texture
- Returns the Graphics object (chainable)

## Usage pattern in Quiet Garden
`PlantTextureFactory.js` uses:
```js
const g = scene.make.graphics();
// ... draw plant pixels ...
g.generateTexture(`plant_${i}`, 128, 128);
g.destroy();
```

## Notes
- Graphics objects that don't change should use `generateTexture` for performance
- Frequently updating Graphics should NOT call `generateTexture` each frame (memory cost)
- `scene.make.graphics()` creates without adding to display list; `scene.add.graphics()` adds to display list
