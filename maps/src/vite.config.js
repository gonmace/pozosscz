// vite.config.js
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
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: (assetInfo) => {
                    // Mantener el nombre original del archivo sin hash
                    return `[name][extname]`;
                },
                format: 'es'
            },
            input: {
                maps: './index-maps.ts',
                // maps_admin: './index-maps-admin.ts'
            }
        }
    }
});

