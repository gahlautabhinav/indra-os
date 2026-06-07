import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@indra/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
      "@indra/design-tokens": path.resolve(__dirname, "../../packages/design-tokens/src/index.ts"),
    },
  },
});
