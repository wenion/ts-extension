import { defineConfig } from "tsup";
import { cp, rename } from "node:fs/promises";
import "dotenv/config";

const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

if (!NEXT_PUBLIC_SITE_URL) {
  throw new Error("[env] Missing NEXT_PUBLIC_SITE_URL in .env.local or .env");
}

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
    define: {
        "process.env.NEXT_PUBLIC_SITE_URL": JSON.stringify(NEXT_PUBLIC_SITE_URL),
    },
    clean: true,
    async onSuccess() {
      await cp("manifest.json", "build/manifest.json").catch(() => {});
      await cp("public", "build", { recursive: true }).catch(() => {});
    },
    noExternal: [/@supabase\//, /is-equal-shallow/]
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
        "process.env.NEXT_PUBLIC_SITE_URL": JSON.stringify(NEXT_PUBLIC_SITE_URL),
    },
    async onSuccess() {
      // Optional rename so you get content-script.js (no .global)
      await rename("build/content-script.global.js", "build/content-script.js").catch(() => {});
      await cp("injected.js", "build/injected.js").catch(() => {});
      await rename("build/content-script.global.js.map", "build/content-script.js.map").catch(() => {});
    }
  }
]);
