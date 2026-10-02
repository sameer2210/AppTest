import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensionAlias: {
      ".js": [".ts", ".js"],
    },
  } as Record<string, unknown>,
  test: {
    environment: "node",
    setupFiles: ["./src/test-helpers/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/validators/**/*.ts",
        "src/features/**/validators/**/*.ts",
        "src/middleware/validate.middleware.ts",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
