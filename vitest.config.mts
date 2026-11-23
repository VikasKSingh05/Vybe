import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
    globals: true,
    // jsdom startup is expensive; cap parallel workers so slower machines do
    // not hit the worker-startup timeout under full-suite load.
    pool: "forks",
    maxWorkers: 2,
    testTimeout: 20_000,
  },
});
