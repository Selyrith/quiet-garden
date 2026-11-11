# Phaser 3 v3.90.0 — Tweens (Phaser.Tweens.TweenManager & Tween)

Source: https://docs.phaser.io/api-documentation/3.90.0/class/tweens-tweenmanager

## Access
`this.tweens` — the TweenManager for the scene

## Key method: tweens.add(config)
```js
this.tweens.add({
  targets: gameObject,
  property: value,
  duration: 1000,
  ease: 'Sine.easeInOut',
  yoyo: false,
  repeat: 0,
  delay: 0,
  onComplete: () => {},
  onUpdate: () => {},
  callbackScope: this
});
```

## Tween config properties
| Property | Description | Default |
|----------|-------------|---------|
| `targets` | Object or array to tween | required |
| `duration` | Tween duration in ms | 1000 |
| `ease` | Easing function string | 'Linear' |
| `yoyo` | Tween back and forth | false |
| `repeat` | Number of repeats (-1 = infinite) | 0 |
| `repeatDelay` | Delay between repeats | 0 |
| `delay` | Initial delay | 0 |
| `onComplete` / `onUpdate` / `onStart` | Callbacks | none |
| `callbackScope` | `this` for callbacks | scene |

## Common easing strings
`'Linear'`, `'Sine.easeIn'`, `'Sine.easeOut'`, `'Sine.easeInOut'`, `'Quad.easeInOut'`, `'Cubic.easeInOut'`, `'Expo.easeInOut'`, `'Back.easeInOut'`, `'Elastic.easeInOut'`, `'Bounce.easeInOut'`

## Tween methods
- `tween.stop()` / `tween.pause()` / `tween.resume()`
- `tween.setDelay(value)` / `tween.setDuration(value)` / `tween.setEase(value)`
- `tween.isPlaying()` / `tween.isPaused()`
- `this.tweens.killTweensOf(target)` — stop all tweens affecting a target

## Usage in Quiet Garden
| Feature | Tween usage |
|---------|-------------|
| Watch mode camera breath | `targets: camera`, `zoom`, `duration: 30000`, `yoyo: true`, `repeat: -1`, `ease: 'Sine.easeInOut'` |
| HUD fade in/out | `targets: container`, `alpha: 0→1`, `duration: 800`, `ease: 'Sine.easeInOut'` |
| Sky sun/moon/stars | `alpha` tween over 3000ms on phase change |
| Weather tint | `alpha` tween over 1000–1500ms |
| Tile selection pulse | `scale` yoyo repeat |
| Onboarding hint pulse | `alpha`/`scale` yoyo repeat |

## Camera zoom tween example
```js
this.tweens.add({
  targets: this.cameras.main,
  zoom: { from: 1, to: 1.1 },
  duration: 30000,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut'
});
```
