import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // The pipeline output is served as static files: /borders/<chunk>.json
  publicDir: "data/processed",
  server: { port: 5173 },
  test: {
    include: ["src/**/*.test.ts", "pipeline/**/*.test.ts"],
    environment: "node",
  },
});
