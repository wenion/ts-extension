import { defineConfig } from "tsup";
import { cp, rename } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import config from "./config.json";

const loadEnv = () => {
  const envPath = resolve(process.cwd(), ".env");
  try {
    const raw = readFileSync(envPath, "utf8");
    return raw.split("\n").reduce<Record<string, string>>((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return acc;
      const eq = trimmed.indexOf("=");
      if (eq === -1) return acc;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      acc[key] = value;
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const env = loadEnv();
const { PAGE_TAG, INJ_TAG, EXT_TAG, ALLOWED_ORIGINS } = config;
const SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

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
        __SUPABASE_CONFIG__: JSON.stringify({ SUPABASE_URL, SUPABASE_ANON_KEY }), // 👈 inject as global
    },
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
        __MESSENGER_CONFIG__: JSON.stringify({ PAGE_TAG, INJ_TAG, EXT_TAG, ALLOWED_ORIGINS }), // 👈 inject as global
    },
    async onSuccess() {
      // Optional rename so you get content-script.js (no .global)
      await rename("build/content-script.global.js", "build/content-script.js").catch(() => {});
      await cp("injected.js", "build/injected.js").catch(() => {});
      await rename("build/content-script.global.js.map", "build/content-script.js.map").catch(() => {});
    }
  }
]);
