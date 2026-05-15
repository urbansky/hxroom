import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

// SWC plugin: konsumiert die Decorator-Metadata aus tsconfig.json (emitDecoratorMetadata + experimentalDecorators),
// damit NestJS-DI (Test.createTestingModule, @Injectable etc.) in den Specs funktioniert.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/db/**'],
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
