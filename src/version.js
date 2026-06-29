export const version = {
  commitSha: import.meta.env.VITE_DEPLOY_COMMIT_SHA || "local-dev",
  branch: import.meta.env.VITE_DEPLOY_BRANCH || "local",
  environment: import.meta.env.VITE_DEPLOY_ENVIRONMENT || "local",
  buildTime: import.meta.env.VITE_BUILD_TIME || "local",
  githubRunUrl: import.meta.env.VITE_GITHUB_RUN_URL || "",
  pagesProject: import.meta.env.VITE_CLOUDFLARE_PAGES_PROJECT || "",
  repository: import.meta.env.VITE_GITHUB_REPOSITORY || "AndrewHYi/cloudflare-pages-react-demo",
};
