export default {
  async fetch(request, env) {
    return routePortalReactRequest(request, env, fetch);
  },
};

export async function routePortalReactRequest(request, env, fetchImpl = fetch) {
  const sourceUrl = new URL(request.url);
  const targetOrigin = isPortalReactPath(sourceUrl.pathname)
    ? requiredEnv(env, "PORTAL_REACT_PAGES_ORIGIN")
    : requiredEnv(env, "BACKEND_ORIGIN");
  const targetPathname = isPortalReactPath(sourceUrl.pathname)
    ? pagesPathnameForPortalPath(sourceUrl.pathname)
    : sourceUrl.pathname;
  const targetUrl = new URL(targetPathname + sourceUrl.search, targetOrigin);

  return fetchImpl(new Request(targetUrl, request));
}

export function isPortalReactPath(pathname) {
  return pathname === "/web_portal_v2" || pathname.startsWith("/web_portal_v2/");
}

export function pagesPathnameForPortalPath(pathname) {
  if (pathname.startsWith("/web_portal_v2/assets/")) {
    return pathname.slice("/web_portal_v2".length);
  }

  if (pathname === "/web_portal_v2/favicon.svg") {
    return "/favicon.svg";
  }

  if (pathname === "/web_portal_v2/version.json") {
    return "/web_portal_v2/version.json";
  }

  return "/";
}

function requiredEnv(env, key) {
  const value = env?.[key];
  if (!value) {
    throw new Error(`Missing required Worker env var ${key}`);
  }
  return value;
}
