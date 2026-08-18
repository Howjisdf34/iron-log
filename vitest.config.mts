import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    pool: "threads",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "e2e/**"],
  },
});
