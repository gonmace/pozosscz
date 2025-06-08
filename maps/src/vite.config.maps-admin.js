// vite.config.maps-admin.js
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
        maps_admin: './index-maps-admin.ts',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
        format: 'es'
      }
    }
  },
  resolve: {
    alias: {
      'jquery': path.resolve(__dirname, 'node_modules/jquery/dist/jquery.js'),
    }
  },
  optimizeDeps: {
    include: ['jquery', 'jquery-ui-dist']
  },
  define: {
    'window.jQuery': 'jQuery',
    'window.$': 'jQuery'
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "jquery-ui/themes/base/all.css";`
      }
    }
  }
});
