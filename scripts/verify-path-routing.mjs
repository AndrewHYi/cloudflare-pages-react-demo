import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  isPortalReactPath,
  pagesOriginForPortalRequest,
  pagesPathnameForPortalPath,
  routePortalReactRequest,
} from "../workers/portal-react-path-router.mjs";

const env = {
  BACKEND_ORIGIN: "https://backend.example.test",
  PORTAL_REACT_PAGES_ORIGIN: "https://portal-react-staging.pages.dev",
  PORTAL_REACT_PAGES_ORIGIN_BY_VERSION: JSON.stringify({
    abc123: "https://portal-react-version-abc123.pages.dev",
  }),
};

assertConfiguredWorkerRoute("https://test.seeclickfix.com/web_portal_v2", true);
assertConfiguredWorkerRoute("https://test.seeclickfix.com/web_portal_v2/", true);
assertConfiguredWorkerRoute("https://test.seeclickfix.com/web_portal_v2/4cEcdxWkFJ64K5QdKu99xP93", true);
assertConfiguredWorkerRoute("https://test.seeclickfix.com/web_portal_v2/assets/index.js", true);
assertConfiguredWorkerRoute("https://test.seeclickfix.com/web_portal_v2_test", false);
assertConfiguredWorkerRoute("https://test.seeclickfix.com/api/v2/profile", false);
assertConfiguredWorkerRoute("https://test.seeclickfix.com/assets/index.js", false);

await assertRoute(
  "https://test.seeclickfix.com/web_portal_v2/4cEcdxWkFJ64K5QdKu99xP93?version=abc123",
  "https://portal-react-version-abc123.pages.dev/?version=abc123",
);
await assertRoute(
  "https://test.seeclickfix.com/web_portal_v2",
  "https://portal-react-staging.pages.dev/",
);
await assertRoute(
  "https://test.seeclickfix.com/web_portal_v2/",
  "https://portal-react-staging.pages.dev/",
);
await assertRoute(
  "https://test.seeclickfix.com/web_portal_v2/version.json",
  "https://portal-react-staging.pages.dev/web_portal_v2/version.json",
);
await assertRoute(
  "https://test.seeclickfix.com/web_portal_v2/assets/index.js",
  "https://portal-react-staging.pages.dev/assets/index.js",
);
await assertRoute(
  "https://test.seeclickfix.com/web_portal_v2/favicon.svg",
  "https://portal-react-staging.pages.dev/favicon.svg",
);
await assertRoute(
  "https://test.seeclickfix.com/web_portal_v2_test",
  "https://backend.example.test/web_portal_v2_test",
);
await assertRoute(
  "https://test.seeclickfix.com/api/v2/profile",
  "https://backend.example.test/api/v2/profile",
);
await assertRoute(
  "https://test.seeclickfix.com/assets/index.js",
  "https://backend.example.test/assets/index.js",
);

assert(isPortalReactPath("/web_portal_v2"), "Expected /web_portal_v2 to match");
assert(isPortalReactPath("/web_portal_v2/example"), "Expected nested /web_portal_v2 path to match");
assert(!isPortalReactPath("/web_portal_v2_test"), "Must not match /web_portal_v2_test");
assert(!isPortalReactPath("/api/web_portal_v2/example"), "Must not match nested backend API path");
assert(
  pagesPathnameForPortalPath("/web_portal_v2/assets/index.js") === "/assets/index.js",
  "Expected Worker to rewrite /web_portal_v2/assets/* to Pages /assets/*",
);
assert(
  pagesPathnameForPortalPath("/web_portal_v2/4cEcdxWkFJ64K5QdKu99xP93") === "/",
  "Expected Worker to rewrite portal app shell paths to Pages /",
);
assert(
  pagesOriginForPortalRequest(new URL("https://test.seeclickfix.com/web_portal_v2/example?version=abc123"), env) ===
    "https://portal-react-version-abc123.pages.dev",
  "Expected Worker to resolve ?version=abc123 to the matching Pages deployment target",
);

const indexHtml = readFileSync("dist/index.html", "utf8");
assert(
  !indexHtml.includes('src="/assets/') && !indexHtml.includes('href="/assets/'),
  "Same-host path routing is unsafe when the build emits root /assets URLs",
);
assert(
  indexHtml.includes('src="/web_portal_v2/assets/') ||
    indexHtml.includes('href="/web_portal_v2/assets/'),
  "Expected path-route build assets under /web_portal_v2/assets/",
);
assertReferencedAssetsExistAfterWorkerRewrite(indexHtml);

console.log("Path routing proof OK: exact /web_portal_v2 routes and /web_portal_v2/* child routes use Pages, app shell paths rewrite to Pages /, and path-scoped assets rewrite to existing Pages files.");

async function assertRoute(source, expectedTarget) {
  const request = new Request(source);
  let observedUrl = "";
  await routePortalReactRequest(request, env, async (targetRequest) => {
    observedUrl = targetRequest.url;
    return new Response("ok");
  });
  assert(observedUrl === expectedTarget, `Expected ${source} to route to ${expectedTarget}, got ${observedUrl}`);
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function assertConfiguredWorkerRoute(source, expected) {
  const url = new URL(source);
  const actual =
    url.hostname === "test.seeclickfix.com" &&
    (url.pathname === "/web_portal_v2" || url.pathname.startsWith("/web_portal_v2/"));

  assert(
    actual === expected,
    `Expected configured Worker Routes to ${expected ? "run" : "not run"} for ${source}`,
  );
}

function assertReferencedAssetsExistAfterWorkerRewrite(html) {
  const refs = [...html.matchAll(/(?:src|href)="(\/web_portal_v2\/assets\/[^"]+)"/g)]
    .map((match) => match[1]);

  assert(refs.length > 0, "Expected at least one /web_portal_v2/assets reference");

  for (const ref of refs) {
    const pagesPath = pagesPathnameForPortalPath(ref);
    const filePath = join("dist", pagesPath.replace(/^\//, ""));
    assert(existsSync(filePath), `Expected rewritten Pages asset to exist: ${filePath}`);
  }
}
