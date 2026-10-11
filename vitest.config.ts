import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic", importSource: "preact" } },
  define: {
    __API_BASE_URL__: JSON.stringify("http://127.0.0.1:8787"),
    __TEST__: "true",
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.{ts,mjs}", "tests/**/*.test.{ts,tsx}", "native-host/**/*.test.ts"],
  },
});
