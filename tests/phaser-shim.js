/**
 * Мост между двумя мирами импорта Phaser.
 *
 * phaser-test-utils делает `import * as Phaser from 'phaser'` и ждёт
 * именованные экспорты (Phaser.Game, Phaser.HEADLESS). Сборка
 * `dist/phaser.esm.js` их даёт, но у неё НЕТ default-экспорта, а весь код
 * игры написан как `import Phaser from 'phaser'`.
 *
 * Этот файл экспортирует сразу оба вида: именованные — для тест-утилит,
 * default — для игровых модулей. Алиас `phaser` в vitest.config.ts
 * указывает сюда.
 */
import * as Phaser from '../node_modules/phaser/dist/phaser.esm.js';

export * from '../node_modules/phaser/dist/phaser.esm.js';
export default Phaser;