import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Picks up .env.test.local (gitignored) so live-Postgres credentials
    // never have to be passed inline on the command line.
    setupFiles: ["tests/setup-env.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
    fileParallelism: false,
  },
});
