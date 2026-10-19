import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";

interface HttpRequest {
  method?: string;
  headers: Record<string, string | undefined>;
}
import react from "@vitejs/plugin-react";

const localApiOptions: Plugin = {
  name: "local-api-options",
  configureServer(server) {
    server.middlewares.use("/api", (request, response, next) => {
      const httpRequest = request as HttpRequest;
      if (httpRequest.method !== "OPTIONS") {
        next();
        return;
      }
      response.statusCode = 204;
      response.setHeader(
        "Access-Control-Allow-Origin",
        httpRequest.headers.origin ?? "*",
      );
      response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      response.setHeader("Vary", "Origin");
      response.end();
    });
  },
};

export default defineConfig({
  plugins: [react(), localApiOptions],
  build: {
    sourcemap: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "https://el-arrab-edu-eji8.vercel.app",
        changeOrigin: true,
        secure: true,
      },
    },
    watch: {
      ignored: ["**/apkapp/**", "**/dist/**"],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
