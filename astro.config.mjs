import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://thiepn.dev',
  output: 'static',
  trailingSlash: 'always',
  vite: {
    build: {
      target: 'es2022',
    },
  },
});
