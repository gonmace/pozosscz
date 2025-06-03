#!/bin/bash
# -*- ENCODING: UTF-8 -*-

# Obtener el nombre del directorio actual, que ahora será 'src'
app=$(basename "$PWD")

# Crear el directorio 'src' si no existe y navegar a él
mkdir -p src
cd src

# Iniciar un nuevo proyecto de Node.js y agregar Vite
npm init --y
npm i -D vite @types/node typescript

# Modificar el archivo package.json usando jq para agregar los scripts necesarios
jq '.scripts |= .+ {
      "build": "vite build --watch",
      "build:admin": "vite build -c vite.config.admin.js --watch"
    } | .type = "module"' package.json >temp.json && mv temp.json package.json

# Crear el archivo 'vite.config.js'
cat > vite.config.js <<EOF
// vite.config.js
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    build: {
        outDir: path.resolve(__dirname, '../../static/js'),
        minify: true,
        rollupOptions: {
            output: {
                entryFileNames: '${app}.js',
                format: 'es'
              },
            input: './index-${app}.ts',
        }
    }
});
EOF

cat > index-${app}.ts <<EOF
document.addEventListener("DOMContentLoaded", function(){


});
EOF

# Instalar las dependencias de npm
npm install

# Ejecutar el script de construcción
npm run build