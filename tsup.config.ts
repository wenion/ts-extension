import { defineConfig } from "tsup";
import { cp, rename } from "node:fs/promises";
import config from "./config.json";

export default defineConfig([
  // Background as ESM (MV3 service worker)
  {
    entry: { background: "src/background/index.ts" },
    outDir: "build",
    format: ["esm"],
    splitting: false,
    sourcemap: true,
    target: "es2020",
    platform: "browser",
    clean: true,
    async onSuccess() {
      await cp("manifest.json", "build/manifest.json").catch(() => {});
      await cp("public", "build", { recursive: true }).catch(() => {});
    },
    noExternal: [/@supabase\//]
  },
  // Content script as classic script (IIFE)
  {
    entry: { "content-script": "src/content-script/index.ts" },
    outDir: "build",
    format: ["iife"],
    splitting: false,
    sourcemap: true,
    target: "es2020",
    platform: "browser",
    define: {
        __MESSENGER_CONFIG__: JSON.stringify(config), // 👈 inject as global
    },
    async onSuccess() {
      // Optional rename so you get content-script.js (no .global)
      await rename("build/content-script.global.js", "build/content-script.js").catch(() => {});
      await rename("build/content-script.global.js.map", "build/content-script.js.map").catch(() => {});
    }
  }
]);
