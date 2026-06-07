import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^convex-headless-cms\/convex\.config$/,
        replacement: resolve(__dirname, "src/component/convex.config.ts"),
      },
      {
        find: /^convex-headless-cms\/_generated\/component$/,
        replacement: resolve(__dirname, "src/component/_generated/component.ts"),
      },
      {
        find: /^convex-headless-cms\/test$/,
        replacement: resolve(__dirname, "src/test.ts"),
      },
      {
        find: /^convex-headless-cms$/,
        replacement: resolve(__dirname, "src/client/index.ts"),
      },
    ],
  },
  test: {
    environment: "edge-runtime",
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
  },
});
