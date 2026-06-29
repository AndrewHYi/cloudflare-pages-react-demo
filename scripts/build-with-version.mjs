import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const metadata = buildMetadata();
const env = {
  ...process.env,
  VITE_DEPLOY_COMMIT_SHA: metadata.commitSha,
  VITE_DEPLOY_BRANCH: metadata.branch,
  VITE_DEPLOY_ENVIRONMENT: metadata.environment,
  VITE_BUILD_TIME: metadata.buildTime,
  VITE_GITHUB_RUN_URL: metadata.githubRunUrl,
  VITE_CLOUDFLARE_PAGES_PROJECT: metadata.pagesProject,
  VITE_GITHUB_REPOSITORY: metadata.repository,
};

run("vite", ["build"], env);

mkdirSync("dist", { recursive: true });
const versionJson = `${JSON.stringify(metadata, null, 2)}\n`;
writeFileSync(join("dist", "version.json"), versionJson);
mkdirSync(join("dist", "web_portal_v2"), { recursive: true });
writeFileSync(join("dist", "web_portal_v2", "version.json"), versionJson);

function buildMetadata() {
  const repository =
    process.env.GITHUB_REPOSITORY || "AndrewHYi/cloudflare-pages-react-demo";
  const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : "";

  return {
    app: "cloudflare-pages-react-demo",
    commitSha:
      process.env.DEPLOY_COMMIT_SHA ||
      process.env.GITHUB_SHA ||
      process.env.CF_PAGES_COMMIT_SHA ||
      git(["rev-parse", "HEAD"]) ||
      "local-dev",
    branch:
      process.env.DEPLOY_BRANCH ||
      process.env.GITHUB_HEAD_REF ||
      process.env.GITHUB_REF_NAME ||
      process.env.CF_PAGES_BRANCH ||
      git(["branch", "--show-current"]) ||
      "local",
    environment:
      process.env.DEPLOY_ENVIRONMENT ||
      process.env.CF_PAGES_BRANCH ||
      process.env.GITHUB_REF_NAME ||
      "local",
    buildTime: new Date().toISOString(),
    githubRunUrl: runUrl,
    pagesProject: process.env.CLOUDFLARE_PAGES_PROJECT || "",
    repository,
    versionContract: "cloudflare-pages-deployment-url",
  };
}

function git(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}

function run(command, args, commandEnv) {
  const result = spawnSync(command, args, {
    env: commandEnv,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
