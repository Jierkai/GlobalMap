import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['packages/adapter-cesium/**', 'jsdom'],
      ['packages/core/**', 'jsdom'],
      ['packages/ui/**', 'jsdom']
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    include: ['packages/**/*.test.ts']
  }
});