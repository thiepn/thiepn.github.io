import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/hub-owner/**/*.test.ts'],
    reporters: ['default', ['junit', { outputFile: 'test-results/h11-owner-integration.xml' }]],
  },
});
