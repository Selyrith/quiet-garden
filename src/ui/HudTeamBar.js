import Phaser from 'phaser';
import { DS } from './DesignSystem.js';

export function createTeamGoalBar(scene) {
  const container = scene.add.container(0, 0).setDepth(DS.depth.hud + 5);
  const bg = scene.add.rectangle(0, 0, 300, 26, 0x3d2e20, 0.9).setOrigin(0.5).setStrokeStyle(1, 0x8a7a66);
  const barBg = scene.add.rectangle(-140, 0, 280, 14, 0x8a7a66, 0.4).setOrigin(0, 0.5);
  const bar = scene.add.rectangle(-140, 0, 0, 14, 0xe8c55a).setOrigin(0, 0.5);
  const text = scene.add.text(0, 0, '', { fontSize: '11px', color: '#fcf8f0', fontStyle: 'bold' }).setOrigin(0.5);
  // Подпись-подсказка под шкалой: объясняет правило частичного веса.
  const hint = scene.add.text(0, 17, '', {
    fontSize: '9px', color: '#d9c9b4', fontStyle: 'italic'
  }).setOrigin(0.5).setAlpha(0.85);
  container.add([bg, barBg, bar, text, hint]);
  container.setVisible(false);
  return { container, bg, barBg, bar, text, hint };
}

export function updateTeamGoalBar(bar, team) {
  if (!bar) return;
  if (!team || !team.goal || team.completed) {
    bar.container.setVisible(false);
    return;
  }
  bar.container.setVisible(true);
  const target = Math.max(1, team.goal.target);
  // progress приходит уже целым из serializeTeam, но защищаемся от дробей:
  // иначе полоса могла бы «показать» больше, чем есть.
  const done = Math.max(0, Math.min(target, Math.floor(team.progress || 0)));
  const ratio = Math.min(1, done / target);
  bar.bar.width = 280 * ratio;
  bar.text.setText(`${team.goal.text}  ${done}/${target}`);
  if (bar.hint) bar.hint.setText(teamGoalHint(team));
}

/**
 * Короткая подсказка под шкалой: объясняет, что засчитываются ВСЕ
 * кооперативные действия, а целевое — втройне.
 *
 * Без этого частичный вес (COOP_EVENT_CREDIT) — скрытая механика:
 * игрок видит, что шкала двигается «сама», и не понимает почему.
 */
export function teamGoalHint(team) {
  if (!team || !team.goal || team.completed) return '';
  return `Любое совместное действие двигает шкалу · ${team.goal.text} — ×3`;
}
