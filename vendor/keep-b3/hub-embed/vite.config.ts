import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM-safe paths (the original candidate used __dirname in an ES module).
const here = path.dirname(fileURLToPath(import.meta.url));

// Qualify the entire ORIGINAL KEEP React app as a versioned same-origin JS/CSS
// asset. No externalized crypto, CDN, or source-data migration.
export default defineConfig({
  base: './',
  // Original B3 is packaged in Vite library mode, which intentionally leaves
  // process.env checks unresolved unless defined at build time. No Node global.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(here, '..') } },
  build: {
    outDir: path.resolve(here, 'dist'),
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(here, 'entry.tsx'),
      formats: ['es'],
      fileName: 'keep-b3-original',
      cssFileName: 'keep-b3-original',
    },
  },
});
