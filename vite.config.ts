import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/ldraw-lib': {
        target: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/ldraw/officialLibrary',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ldraw-lib/, ''),
      },
    },
  },
});
