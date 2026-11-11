import { avatarLayout } from './avatar-layout.js';

const roleColors = { gardener: 0x8bc34a, waterer: 0x4fc3f7, harvester: 0xff80ab };

// Маппинг пола → изображение аватара
const avatarTextureByGender = {
  male: 'avatar-male',
  female: 'avatar-female',
};

/**
 * Подпись над аватаром: ник, а у хоста — ещё и корона.
 * Пустая строка означает «подпись не показывать».
 */
export function formatAvatarLabel(nickname, isHost = false) {
  const clean = (typeof nickname === 'string' ? nickname.trim() : '') || '';
  if (!clean) return '';
  return isHost ? `👑 ${clean}` : clean;
}

/**
 * Создаёт аватара игрока.
 *
 * Аватар — просто картинка нужного размера плюс тень под ногами.
 * Никакой обводки-круга: раньше circle(-10, 34) давал тот самый «круг»
 * вокруг спрайта и визуально раздувал аватара.
 *
 * @param {Phaser.Scene} scene
 * @param {string} playerId
 * @param {string} genderId
 * @param {string} roleId
 * @param {number} tileSize размер грядки, чтобы масштабировать аватара
 * @param {string} nickname ник игрока для подписи
 * @param {boolean} isHost хост ли это (для короны)
 */
export function createAvatar(scene, playerId, genderId, roleId, tileSize, nickname = '', isHost = false) {
  const layout = avatarLayout(tileSize);
  const color = roleColors[roleId] || 0x9e9e9e;

  const container = scene.add.container(0, 0).setDepth(250);

  // Тень под ногами
  const shadow = scene.add.ellipse(0, layout.shadowY, layout.shadowWidth, layout.shadowHeight, 0x000000)
    .setAlpha(0.25);

  const avatarImg = scene.add.image(0, 0, avatarTextureByGender[genderId] || 'avatar-male')
    .setDisplaySize(layout.size, layout.size);

  container.add([shadow, avatarImg]);

  // Подпись с ником (и короной у хоста) — чтобы было видно, кто где.
  const labelText = formatAvatarLabel(nickname, isHost);
  let label = null;
  if (labelText) {
    label = scene.add.text(0, -layout.size / 2 - 6, labelText, {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#3e2723',
      strokeThickness: 3,
    }).setOrigin(0.5, 1);
    container.add(label);
  }

  // Косметика: качание при ходьбе и «дыхание» спрайта.
  // Это отдельные tween-ы, они не трогают позицию контейнера —
  // иначе они конфликтуют с tween-ами перемещения (см. moveAvatarTo).
  const walkTween = scene.tweens.add({
    targets: avatarImg,
    angle: { from: -6, to: 6 },
    duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  const breathTween = scene.tweens.add({
    targets: avatarImg,
    scaleY: { from: avatarImg.scaleY, to: avatarImg.scaleY * 1.05 },
    duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  container.playerId = playerId;
  container.genderId = genderId || 'male';
  container.roleId = roleId;
  container.body = avatarImg;
  container.shadow = shadow;
  container.label = label;
  container.nickname = nickname || '';
  container.isHost = !!isHost;
  container.walkTween = walkTween;
  container.breathTween = breathTween;
  container.roleColor = color;

  return container;
}

export function tintAvatar(avatar, roleId) {
  const color = roleColors[roleId] || 0x9e9e9e;
  avatar.roleId = roleId;
  avatar.roleColor = color;
}

/**
 * Обновляет подпись аватара (ник и корону хоста).
 * Ник может прийти позже, чем сам аватар, поэтому подпись обновляется отдельно.
 */
export function updateAvatarLabel(avatar, nickname, isHost = false) {
  if (!avatar) return;
  const text = formatAvatarLabel(nickname, isHost);
  avatar.nickname = nickname || '';
  avatar.isHost = !!isHost;
  if (!avatar.label) {
    if (!text) return;
    const layout = avatarLayout(avatar.tileSize || 42);
    avatar.label = avatar.scene.add.text(0, -layout.size / 2 - 6, text, {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#3e2723',
      strokeThickness: 3,
    }).setOrigin(0.5, 1);
    avatar.add(avatar.label);
    return;
  }
  avatar.label.setText(text);
  avatar.label.setVisible(!!text);
}