// vite.config.maps.js
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, '../../static/maps'),
    minify: true,
    rollupOptions: {
      input: {
        maps: './index-maps.ts',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
        format: 'es'
      }
    }
  }
});
