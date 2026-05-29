import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "SpaceRemind",
        short_name: "SpaceRemind",
        description:
          "Track where your items are stored with custom locations, photos, QR codes, and NFC tags.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0f172a",
        theme_color: "#0f172a",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the app shell; SPA fallback so deep links work offline.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        // Firebase Storage photos: serve from cache once fetched.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === "firebasestorage.googleapis.com",
            handler: "CacheFirst",
            options: {
              cacheName: "firebase-storage-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
