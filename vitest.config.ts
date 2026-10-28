import { defineConfig } from "vitest/config";

// En Docker sobre macOS (virtiofs/osxfs), los eventos inotify del volumen
// montado no siempre llegan al contenedor: el watch mode necesita polling.
const usePolling = process.env.VITEST_WATCH_USE_POLLING === "true";

export default defineConfig({
  server: {
    watch: usePolling ? { usePolling: true, interval: 100 } : undefined,
  },
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.test.ts"],
    // Los tests de integración comparten una sola base de datos y cada uno
    // la vacía con truncateAll en su afterEach: en paralelo se destruirían
    // entre sí de forma intermitente.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
