import { readFileSync } from "node:fs";

const indexHtml = readFileSync("dist/index.html", "utf8");
const version = JSON.parse(readFileSync("dist/version.json", "utf8"));
const portalVersion = JSON.parse(readFileSync("dist/web_portal_v2/version.json", "utf8"));
const metaSha = readMeta(indexHtml, "portal-react:commit-sha");
const metaEnvironment = readMeta(indexHtml, "portal-react:deploy-environment");

assert(metaSha, "Missing portal-react:commit-sha meta tag");
assert(version.commitSha, "Missing version.json commitSha");
assert(metaSha === version.commitSha, `Meta SHA ${metaSha} did not match version.json ${version.commitSha}`);
assert(metaEnvironment === version.environment, "Deploy environment meta did not match version.json");
assert(version.versionContract === "cloudflare-pages-deployment-url", "Unexpected version contract");
assert(portalVersion.commitSha === version.commitSha, "Nested /web_portal_v2/version.json did not match root version.json");

console.log(`Proof metadata OK: ${version.commitSha} (${version.environment})`);

function readMeta(html, name) {
  const pattern = new RegExp(`<meta name="${escapeRegExp(name)}" content="([^"]*)"`);
  return pattern.exec(html)?.[1] ?? "";
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
