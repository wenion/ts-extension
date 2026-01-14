import fs from "node:fs/promises";
import { fileURLToPath } from "url";
import path from "node:path";
import Mustache from "mustache";
import "dotenv/config";

// .env > .env.local

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const version = process.env.VERSION || "1.0.0";
  const externallyConnectableMatches = (process.env.EXTERNALLY_CONNECTABLE_MATCHES ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const default_popup = process.env.DEFAULT_POPUP ?? "dist/index.html";
  const web_accessible_matches = (process.env.WEB_ACCESSIBLE_MATCHES ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const host_permissions = (process.env.HOST_PERMISSIONS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const permissions = (process.env.PERMISSIONS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const optional_permissions = (process.env.OPTIONAL_PERMISSIONS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const optional_host_permissions = (process.env.OPTIONAL_HOST_PERMISSIONS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const templatePath = path.resolve(__dirname, "../config/manifest.template.json.mustache");
  const template = await fs.readFile(templatePath, "utf8");

  const data = {
    version: version,
    default_popup: default_popup,
    externally_connectable_matches: JSON.stringify(externallyConnectableMatches),
    web_accessible_matches: JSON.stringify(web_accessible_matches),
    host_permissions: JSON.stringify(host_permissions),
    permissions: JSON.stringify(permissions),
    optional_permissions: JSON.stringify(optional_permissions),
    optional_host_permissions: JSON.stringify(optional_host_permissions),
  };

  const rendered = Mustache.render(template, data);

  // Optional: validate it’s valid JSON
  JSON.parse(rendered);

  const outDir = path.resolve(__dirname, "..");
  await fs.mkdir(outDir, { recursive: true });

  const outPath = path.join(outDir, "manifest.json");
  await fs.writeFile(outPath, rendered, "utf8");

  console.log("✅ Wrote manifest to", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
