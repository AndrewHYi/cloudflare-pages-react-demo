const [deploymentUrl, expectedSha] = process.argv.slice(2);

if (!deploymentUrl || !expectedSha) {
  console.error("Usage: node scripts/verify-deployment.mjs <deployment-url> <expected-sha>");
  process.exit(1);
}

const normalizedUrl = deploymentUrl.replace(/\/+$/g, "");
const versionUrl = `${normalizedUrl}/version.json`;
const indexUrl = `${normalizedUrl}/`;

const versionResponse = await retryFetch(versionUrl);
assert(versionResponse.ok, `${versionUrl} returned HTTP ${versionResponse.status}`);
const version = await versionResponse.json();
assert(version.commitSha === expectedSha, `version.json commitSha ${version.commitSha} did not match ${expectedSha}`);

const portalVersionUrl = `${normalizedUrl}/web_portal_v2/version.json`;
const portalVersionResponse = await retryFetch(portalVersionUrl);
assert(portalVersionResponse.ok, `${portalVersionUrl} returned HTTP ${portalVersionResponse.status}`);
const portalVersion = await portalVersionResponse.json();
assert(portalVersion.commitSha === expectedSha, `web_portal_v2/version.json commitSha ${portalVersion.commitSha} did not match ${expectedSha}`);

const indexResponse = await retryFetch(indexUrl);
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

async function retryFetch(url) {
  const attempts = Number(process.env.DEPLOY_VERIFY_ATTEMPTS || 12);
  const delayMs = Number(process.env.DEPLOY_VERIFY_DELAY_MS || 5000);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, { cache: "no-store" });
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        throw error;
      }
      console.log(`Waiting for ${url} (${attempt}/${attempts}): ${error.message}`);
      await delay(delayMs);
    }
  }

  throw lastError;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
