# Phaser 3 v3.90.0 — Sound Manager (Phaser.Sound.WebAudioSoundManager)

Source: https://docs.phaser.io/api-documentation/3.90.0/class/sound-webaudiosoundmanager

## Access
`this.sound` — the SoundManager for the scene (Phaser.Sound.BaseSoundManager)

## Key methods
| Method | Description |
|--------|-------------|
| `play(key, config)` | Play a sound |
| `stop(key)` | Stop a sound |
| `stopAll()` | Stop all sounds |
| `pauseAll()` / `resumeAll()` | Pause/resume all |
| `mute` / `volume` | Global mute/volume |

## Web Audio context (browser requirement)
- Browsers suspend `AudioContext` until user interacts with the page
- Must call `ctx.resume()` after first user gesture (click/keydown)
- Quiet Garden wraps this: `this.input.once('pointerdown', () => this.sound.resume())`

## SoundManager (custom class in Quiet Garden)
`src/audio/SoundManager.js` wraps Phaser sound with:
- `init()` — creates `AudioContext` and `MusicManager`
- `duckMusic(vol)` — ducks music to `clamp(vol,0,1)*0.15` via `setTargetAtTime`
- `unduckMusic()` — restores music to 0.15
- `click()`, `plant()`, `water()`, `harvest()`, `buy()`, `error()` — procedural SFX via oscillators
- `pause()` / `resumeFromPause()` — visibility change handling

## MusicManager (custom class)
- Procedural/generative music; separate gain node from ambience bus
- `duckMusic` targets `this.music.gainNode.gain`

## Notes
- `setTargetAtTime(target, currentTime, timeConstant)` — exponential approach to target value (smooth, no clicks)
- Ambience bus is separate from music bus (custom `AmbienceManager`)
- All audio is synthesized — no external audio asset files
