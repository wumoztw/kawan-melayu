import { defineConfig } from 'vite';

export default defineConfig({
  base: '/kawan-melayu/',
  test: {
    environment: 'jsdom',
  },
});
