import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    outDir: 'dist',
    sourcemap: false,
    manifest: true,
    modulePreload: {
      // WebKit can retain failed modulepreloads across reloads (bug 270357).
      // Keep HTML entry preloads; dynamic imports must remain retryable.
      resolveDependencies: (_file, dependencies, context) =>
        context.hostType === 'js'
          ? dependencies.filter((file) => !file.endsWith('.js'))
          : dependencies,
    },
  },
  optimizeDeps: {
    exclude: [
      '@autotests-simulator/ui',
      '@autotests-simulator/domain',
      '@autotests-simulator/config',
      '@autotests-simulator/sim-kit',
    ],
  },
});
