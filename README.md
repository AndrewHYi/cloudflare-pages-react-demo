# Cloudflare Pages React Demo

Proof-of-concept React app for replacing the old portal-react S3/Rails deploy
path with Cloudflare Pages deploys controlled by GitHub Actions.

## What This Proves

- A built artifact exposes the exact deployed commit in both
  `meta[name="portal-react:commit-sha"]` and `/version.json`.
- GitHub Actions can deploy the prebuilt `dist/` folder with
  `wrangler pages deploy --commit-hash`.
- Preview and staging URLs can be verified without changing production.
- Production deploy can be restricted to protected `main` pushes instead of
  allowing manual production deploys.

## Local Verification

```sh
npm install
npm run build
npm run test:proof
```

Run the app locally:

```sh
npm run dev
```

Build metadata defaults to the local git branch and commit. CI overrides it with
GitHub and Cloudflare deployment context.

## Cloudflare Setup

For the personal MVP, create a Cloudflare Pages project and add these GitHub
secrets and variables before running deploy workflows:

```text
CLOUDFLARE_ACCOUNT_ID     # variable preferred, secret accepted by workflows
CLOUDFLARE_API_TOKEN      # secret
CLOUDFLARE_PAGES_PROJECT  # variable required to enable production deploy
```

Use a Cloudflare API token scoped to Account > Cloudflare Pages > Edit. For the
company migration, SRE should replace the personal user token with an
account-owned token where available.

## Deployment Proof

After a Pages deployment, verify the artifact from any machine:

```sh
curl -fsSL https://<deployment>.pages.dev/version.json
curl -fsSL https://<deployment>.pages.dev/web_portal_v2/version.json
node scripts/verify-deployment.mjs https://<deployment>.pages.dev <commit-sha>
```

The old deploy used `?version=<sha>` to make Rails fetch
`index.html:<sha>` from S3. This prototype uses the Cloudflare Pages deployment
URL itself as the immutable version address.
