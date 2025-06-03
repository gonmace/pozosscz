// vite.config.js
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

// Esto reemplaza __dirname en ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, '../../static/js'),
    minify: true,
    rollupOptions: {
      output: {
        entryFileNames: 'main.js',
        format: 'es'
      },
      input: './index-main.ts',
    }
  }
});