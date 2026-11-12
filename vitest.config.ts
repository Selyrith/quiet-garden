import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Phaser's main field points to source which has dev-only requires.
      // Use the pre-built ESM dist instead.
      phaser: path.resolve(__dirname, "node_modules/phaser/dist/phaser.esm.js"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["phaser-test-utils/setup"],
  },
});
