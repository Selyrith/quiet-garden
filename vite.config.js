import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3002',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  watch: {
    ignored: ['**/data/**']
  }
});
