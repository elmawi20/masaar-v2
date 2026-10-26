import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "scratch", "test/e2e/**", ".next/**"],
    fileParallelism: false,
    globalSetup: ["./test/globalSetup.ts"],
  },
});
