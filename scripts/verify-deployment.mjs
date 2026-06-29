const [deploymentUrl, expectedSha] = process.argv.slice(2);

if (!deploymentUrl || !expectedSha) {
  console.error("Usage: node scripts/verify-deployment.mjs <deployment-url> <expected-sha>");
  process.exit(1);
}

const normalizedUrl = deploymentUrl.replace(/\/+$/g, "");
const versionUrl = `${normalizedUrl}/version.json`;
const indexUrl = `${normalizedUrl}/`;

const versionResponse = await fetch(versionUrl, { cache: "no-store" });
assert(versionResponse.ok, `${versionUrl} returned HTTP ${versionResponse.status}`);
const version = await versionResponse.json();
assert(version.commitSha === expectedSha, `version.json commitSha ${version.commitSha} did not match ${expectedSha}`);

const portalVersionUrl = `${normalizedUrl}/web_portal_v2/version.json`;
const portalVersionResponse = await fetch(portalVersionUrl, { cache: "no-store" });
assert(portalVersionResponse.ok, `${portalVersionUrl} returned HTTP ${portalVersionResponse.status}`);
const portalVersion = await portalVersionResponse.json();
assert(portalVersion.commitSha === expectedSha, `web_portal_v2/version.json commitSha ${portalVersion.commitSha} did not match ${expectedSha}`);

const indexResponse = await fetch(indexUrl, { cache: "no-store" });
assert(indexResponse.ok, `${indexUrl} returned HTTP ${indexResponse.status}`);
const html = await indexResponse.text();
const metaSha = /<meta name="portal-react:commit-sha" content="([^"]*)"/.exec(html)?.[1] ?? "";
assert(metaSha === expectedSha, `index meta SHA ${metaSha || "missing"} did not match ${expectedSha}`);

console.log(`Deployment proof OK: ${normalizedUrl} serves ${expectedSha}`);

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}
