import Phaser from 'phaser';
import { UI, drawPanel } from './ui-theme.js';
import { createUnifiedButton } from './ui-unified.js';

export function createTopBar(scene, camW) {
  const container = scene.add.container(0, 0).setDepth(100);

  const bg = scene.add.graphics();
  drawPanel(bg, 0, -10, camW, 60, 16, false);
  bg.lineStyle(1, UI.woodMid, 0.6);
  for(let i=5; i<60; i+=8) bg.lineBetween(0, i, camW, i);
  container.add(bg);

  const coinsBg = scene.add.graphics();
  drawPanel(coinsBg, 10, 8, 90, 34, 8, true);
  container.add(coinsBg);

  const coins = scene.add.text(55, 25, '🪙 0', {
    fontSize: '16px', color: '#5c4a3a', fontStyle: 'bold', fontFamily: UI.fontTitle
  }).setOrigin(0.5);
  container.add(coins);

  const roomBg = scene.add.graphics();
  drawPanel(roomBg, 10, 54, 110, 26, 6, false);
  roomBg.lineStyle(1, UI.gold, 0.8);
  roomBg.strokeRoundedRect(10, 54, 110, 26, 6);
  container.add(roomBg);

  const roomCodeText = scene.add.text(65, 67, 'КОД: ...', {
    fontSize: '12px', color: '#c9a884', fontFamily: UI.fontMono, fontStyle: 'bold'
  }).setOrigin(0.5);
  container.add(roomCodeText);

  const roomHit = scene.add.rectangle(65, 67, 44, 44, 0x000000, 0.001).setInteractive({ useHandCursor: true });
  container.add(roomHit);

  const world = scene.add.text(camW - 160, 25, '', {
    fontSize: '17px', color: '#f8f4ee'
  }).setOrigin(0.5);
  container.add(world);

  const muteBtn = createUnifiedButton(scene, camW - 90, 25, 44, 44, '🔊', () => {
    if (scene.sound) {
      const isEnabled = scene.sound.toggleMute();
      muteBtn.setLabel(isEnabled ? '🔊' : '🔇');
    }
  }, { fontSize: '19px', minTouch: 44 });
  container.add(muteBtn);

  const menuBtn = createUnifiedButton(scene, camW - 40, 25, 44, 44, '☰', () => {
    if (scene.openMenu) scene.openMenu();
  }, { fontSize: '22px', minTouch: 44 });
  container.add(menuBtn);

  return { container, coins, world, menuBtn, bg, roomBg, roomHit, roomCodeText, muteBtn };
}
