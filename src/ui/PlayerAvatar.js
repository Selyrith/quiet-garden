import { avatarLayout } from './avatar-layout.js';

const roleColors = { gardener: 0x8bc34a, waterer: 0x4fc3f7, harvester: 0xff80ab };

// Маппинг пола → изображение аватара
const avatarTextureByGender = {
  male: 'avatar-male',
  female: 'avatar-female',
};

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
 */
export function createAvatar(scene, playerId, genderId, roleId, tileSize) {
  const layout = avatarLayout(tileSize);
  const color = roleColors[roleId] || 0x9e9e9e;

  const container = scene.add.container(0, 0).setDepth(250);

  // Тень под ногами
  const shadow = scene.add.ellipse(0, layout.shadowY, layout.shadowWidth, layout.shadowHeight, 0x000000)
    .setAlpha(0.25);

  const avatarImg = scene.add.image(0, 0, avatarTextureByGender[genderId] || 'avatar-male')
    .setDisplaySize(layout.size, layout.size);

  container.add([shadow, avatarImg]);

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