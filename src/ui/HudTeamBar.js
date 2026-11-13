import Phaser from 'phaser';
import { DS } from './DesignSystem.js';

export function createTeamGoalBar(scene) {
  const container = scene.add.container(0, 0).setDepth(DS.depth.hud + 5);

  // Тёплая «деревянная» плашка вместо плоской чёрной полосы: у игры про сад
  // HUD тоже должен быть из мира, а не из системного диалога.
  const bg = scene.add.graphics();
  bg.fillStyle(0x3D2E20, 0.9);
  bg.fillRoundedRect(-152, -17, 304, 34, 14);
  bg.lineStyle(2, 0xB08A57, 0.95);
  bg.strokeRoundedRect(-152, -17, 304, 34, 14);

  const barBg = scene.add.rectangle(-140, -1, 280, 13, 0x8A7A66, 0.45)
    .setOrigin(0, 0.5)
    .setStrokeStyle(1, 0x2C1B10, 0.5);
  const bar = scene.add.rectangle(-140, -1, 0, 13, 0xE8C55A, 1)
    .setOrigin(0, 0.5)
    .setStrokeStyle(1.5, 0xB58F2E, 1);

  const text = scene.add.text(0, -1, '', {
    fontSize: `${DS.font.size.xs + 1}px`,
    color: '#FFF6E0',
    fontStyle: 'bold',
    fontFamily: DS.font.family.base,
  }).setOrigin(0.5);
  text.setShadow(0, 1, 'rgba(28,18,10,0.85)', 2, false, true);

  // Подпись-подсказка под шкалой: объясняет правило частичного веса.
  const hint = scene.add.text(0, 22, '', {
    fontSize: `${DS.font.size.xs}px`,
    color: '#E8DCC8',
    fontStyle: 'italic',
    fontFamily: DS.font.family.base,
    align: 'center',
    // Без переноса длинная подсказка уезжала за края экрана и обрезалась.
    wordWrap: { width: 292, useAdvancedWrap: true },
  }).setOrigin(0.5, 0).setAlpha(0.95);

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
