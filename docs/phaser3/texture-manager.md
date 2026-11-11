# Phaser 3 v3.90.0 — Texture Manager (Phaser.Textures.TextureManager)

Source: https://docs.phaser.io/api-documentation/3.90.0/class/textures-texturemanager

## Access
`this.textures` — the TextureManager for the scene

## Key methods
| Method | Description |
|--------|-------------|
| `exists(key)` | Check if a texture with key exists |
| `get(key)` | Get a texture by key |
| `add(key, source)` | Add a texture |
| `generateTexture(key, width, height)` | Generate texture from canvas/graphics |
| `remove(key)` | Remove a texture |
| `clear()` | Remove all textures |

## Texture
| Property/Method | Description |
|-----------------|-------------|
| `texture.width` / `texture.height` | Texture dimensions |
| `texture.frames` | Map of frames |
| `texture.getFrame(name)` | Get specific frame |

## CanvasTexture / DynamicTexture
- `CanvasTexture` — wraps a canvas element as a texture
- `DynamicTexture` — texture that can be updated dynamically (draw to canvas, then update)

## Usage in Quiet Garden
| File | Usage |
|------|-------|
| `PlantTextureFactory.js` | `scene.textures.exists(key)` check before generating; `g.generateTexture(key, 128, 128)` to bake 300 plant textures |
| `WeatherEffects.js` | `g.generateTexture('raindrop', 2, 12)`, `g.generateTexture('fog_cloud', 32, 32)`, etc. |
| `AmbientEffects.js` | `g.generateTexture('ambient_petal', 8, 8)`, etc. |
| `GameScene.js` | `this.add.image(..., 'plant_0')` — references texture generated in `generateAllPlantTextures` |

## Critical flow (bug investigation)
1. `generateAllPlantTextures(this)` generates `plant_0` through `plant_299`
2. `createTile()` calls `this.add.image(x, y, 'plant_0')` — requires `plant_0` to exist
3. If `generateAllPlantTextures` throws before completing, `plant_0` may be missing → Phaser throws `Texture missing: plant_0`

## Notes
- Textures are stored in GPU memory; generating 300 textures at startup is a one-time cost
- `generateTexture` uses Canvas API; some Graphics features (e.g. `fillGradientStyle`) won't appear on generated textures
