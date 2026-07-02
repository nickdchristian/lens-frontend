import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  root: "src",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      manifest: {
        name: "Lens Global Telemetry",
        short_name: "Lens",
        description: "Forgejo Lens Global Telemetry Dashboard",
        theme_color: "#ffffff",
        icons: [
          {
            src: "/favicon.ico",
            sizes: "192x192",
            type: "image/x-icon",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/chart.js") ||
            id.includes("node_modules/chartjs-adapter-date-fns") ||
            id.includes("node_modules/date-fns")
          ) {
            return "vendor-chart";
          }
          if (
            id.includes("node_modules/lit") ||
            id.includes("node_modules/@lit")
          ) {
            return "vendor-lit";
          }
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["../config/vitest.setup.js"],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache", "../tests/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
      exclude: ["../config/**", "../tests/**", "**/*.test.js", "**/mocks/**"],
    },
    env: {
      NODE_ENV: "production",
    },
  },
});
