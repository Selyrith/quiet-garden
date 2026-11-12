import Phaser from 'phaser';

/**
 * Lightweight cozy vignette using layered soft rectangles/circles at screen edges.
 * Avoids heavy postFX shaders; depth above world, below most HUD.
 */
export function createVignette(scene) {
  const cam = scene.cameras.main;
  const w = cam.width;
  const h = cam.height;
  const g = scene.add.graphics().setDepth(79).setScrollFactor(0);

  // Soft edge darkening: layered semi-transparent rectangles on edges
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const a = 0.08 * (1 - i / steps);
    const inset = i * 14;
    g.lineStyle(28, 0x2c1b10, a);
    g.strokeRoundedRect(inset, inset, w - inset * 2, h - inset * 2, 40);
  }

  // Gentle corner glows
  g.fillStyle(0x2c1b10, 0.10);
  g.fillCircle(0, 0, 120);
  g.fillCircle(w, 0, 120);
  g.fillCircle(0, h, 140);
  g.fillCircle(w, h, 140);

  return g;
}
