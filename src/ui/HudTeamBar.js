import Phaser from 'phaser';
import { DS } from './DesignSystem.js';

export function createTeamGoalBar(scene) {
  const container = scene.add.container(0, 0).setDepth(DS.depth.hud + 5);
  const bg = scene.add.rectangle(0, 0, 300, 26, 0x5c4a3a, 0.9).setOrigin(0.5).setStrokeStyle(1, 0x8e7b63);
  const barBg = scene.add.rectangle(-140, 0, 280, 14, 0x8e7b63, 0.4).setOrigin(0, 0.5);
  const bar = scene.add.rectangle(-140, 0, 0, 14, 0xd8a494).setOrigin(0, 0.5);
  const text = scene.add.text(0, 0, '', { fontSize: '11px', color: '#f8f4ee', fontStyle: 'bold' }).setOrigin(0.5);
  container.add([bg, barBg, bar, text]);
  container.setVisible(false);
  return { container, bg, barBg, bar, text };
}

export function updateTeamGoalBar(bar, team) {
  if (!bar) return;
  if (!team || !team.goal || team.completed) {
    bar.container.setVisible(false);
    return;
  }
  bar.container.setVisible(true);
  const ratio = Math.min(1, team.progress / team.goal.target);
  bar.bar.width = 280 * ratio;
  bar.text.setText(`${team.goal.text}  ${team.progress}/${team.goal.target}`);
}
