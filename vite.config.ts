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
      '/ldraw': {
        target: 'https://library.ldraw.org/library/official',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ldraw/, ''),
      },
    },
  },
});
