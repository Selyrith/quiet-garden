import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Phaser's ESM dist has NO default export, а весь код игры импортирует
      // `import Phaser from 'phaser'`. Шим отдаёт и default, и именованные
      // экспорты (см. tests/phaser-shim.js).
      phaser: path.resolve(__dirname, "tests/phaser-shim.js"),
    },
  },
  test: {
    environment: "jsdom",
  },
});