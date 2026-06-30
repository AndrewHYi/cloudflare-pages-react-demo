const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID");
const apiToken = requiredEnv("CLOUDFLARE_API_TOKEN");
const pagesProject = requiredEnv("CLOUDFLARE_PAGES_PROJECT");

const baseUrl = "https://api.cloudflare.com/client/v4";

const checks = [];

await check("pages project is accessible", async () => {
  const response = await cloudflare(
    `/accounts/${accountId}/pages/projects/${encodeURIComponent(pagesProject)}`,
  );
  const project = response.result;
  return `name=${project.name}; subdomain=${project.subdomain}`;
});

await check("account zones are readable", async () => {
  const response = await cloudflare(`/zones?account.id=${accountId}&per_page=50`);
  const zones = response.result ?? [];
  const activeZones = zones.filter((zone) => zone.status === "active");

  if (activeZones.length === 0) {
    return {
      status: "blocked",
      detail: `zones=${zones.length}; active=${activeZones.length}; route_ready=no`,
    };
  }

  return {
    status: "pass",
    detail: `zones=${zones.length}; active=${activeZones.length}; route_ready=yes`,
  };
});

await check("workers scripts are readable", async () => {
  const response = await cloudflare(`/accounts/${accountId}/workers/scripts`);
  const scripts = Array.isArray(response.result) ? response.result : [];
  return `scripts=${scripts.length}`;
});

console.log("\nCloudflare account proof summary:");
for (const checkResult of checks) {
  console.log(`- ${checkResult.name}: ${checkResult.status}${checkResult.detail ? ` (${checkResult.detail})` : ""}`);
}

if (checks.some((checkResult) => checkResult.status !== "pass")) {
  process.exitCode = 1;
}

async function check(name, callback) {
  try {
    const result = await callback();
    if (typeof result === "object") {
      checks.push({ name, status: result.status, detail: result.detail });
    } else {
      checks.push({ name, status: "pass", detail: result });
    }
  } catch (error) {
    checks.push({ name, status: "blocked", detail: error.message });
  }
}

async function cloudflare(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  });
  const body = await response.json();

  if (!response.ok || body.success === false) {
    const message = body.errors?.map((error) => `${error.code}: ${error.message}`).join("; ");
    throw new Error(message || `HTTP ${response.status}`);
  }

  return body;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}
