# Cloudflare Pages React Demo

Private proof-of-concept for moving `portal-react` away from the old S3/Rails
deploy path and onto Cloudflare Pages deploys controlled by GitHub Actions.

This repo intentionally uses Andrew's personal Cloudflare account for MVP proof.
The official `SeeClickFix/portal-react` rollout should use a separate
company-owned Cloudflare account connected to work SSO.

## Current Proof

Repository:

- GitHub repo: `AndrewHYi/cloudflare-pages-react-demo`
- Cloudflare Pages project: `portal-react-cloudflare-demo`
- Repo visibility: private
- Cloudflare access: Andrew's personal Cloudflare account

Configured GitHub Actions values:

- Secret: `CLOUDFLARE_API_TOKEN`
- Variables: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT`

Private demo proof. These are not official SeeClickFix environment URLs:

- Staging workflow run:
  `https://github.com/AndrewHYi/cloudflare-pages-react-demo/actions/runs/28393647805`
- Internal staging alias:
  `https://int.portal-react-cloudflare-demo.pages.dev`
- Staging verified SHA:
  `4d99cac343037c94ca318cd83eb700fbb2ce586b`
- Production-style workflow run:
  `https://github.com/AndrewHYi/cloudflare-pages-react-demo/actions/runs/28393883268`
- Internal production proof URL:
  `https://13fba103.portal-react-cloudflare-demo.pages.dev`
- Production verified SHA:
  `173d111b4398ce952149332779d2247d644962c6`

Verification command:

```sh
npm run verify:deployment -- \
  https://int.portal-react-cloudflare-demo.pages.dev \
  4d99cac343037c94ca318cd83eb700fbb2ce586b
```

## What This Proves

- A static React/Vite artifact can be uploaded to Cloudflare Pages from GitHub
  Actions with `wrangler pages deploy`.
- The deployed artifact proves the served commit through:
  - `meta[name="portal-react:commit-sha"]`
  - `/version.json`
  - `/web_portal_v2/version.json`
- A stable staging branch alias can be deployed manually.
- A developer can manually open a PR-like environment from a draft PR branch
  without waiting for the automatic PR preview trigger.
- A production-style deploy can be restricted to a `main` push.
- Developers do not need Cloudflare dashboard access to deploy through GitHub
  Actions.
- The old `?version=<sha>` Rails/S3 lookup can be replaced by a Cloudflare
  deployment URL plus runtime SHA proof.

## Private Repo Notes

Making this GitHub repo private protects the source repository, not the
Cloudflare Pages URLs.

By default, `*.pages.dev` deployments are still publicly reachable. For the
official environment URLs, route traffic through the existing SeeClickFix
hostname and `/web_portal_v2` Cloudflare Worker Routes.

The PR preview workflow only deploys same-repository pull requests:

```yaml
github.event.pull_request.head.repo.full_name == github.repository
```

That keeps forked PRs from receiving deploy secrets.

## Workflows

### CI

`.github/workflows/ci.yml`

Runs on pull requests and pushes:

```sh
npm ci
npm run build
npm run test:proof
```

### Cloudflare Pages Bootstrap

`.github/workflows/cloudflare-pages-bootstrap.yml`

Manual one-time helper for the personal demo. It uses
`CLOUDFLARE_API_TOKEN` to create or verify the Pages project and discover the
Cloudflare account.

Run it with:

```sh
gh workflow run cloudflare-pages-bootstrap.yml \
  --repo AndrewHYi/cloudflare-pages-react-demo \
  --ref main \
  -f project_name=portal-react-cloudflare-demo
```

The workflow cannot always write GitHub repository variables because
`GITHUB_TOKEN` may not have permission to manage Actions variables. If that
happens, set the variables locally with `gh`:

```sh
gh variable set CLOUDFLARE_ACCOUNT_ID \
  --repo AndrewHYi/cloudflare-pages-react-demo \
  --body "<cloudflare-account-id>"

gh variable set CLOUDFLARE_PAGES_PROJECT \
  --repo AndrewHYi/cloudflare-pages-react-demo \
  --body "portal-react-cloudflare-demo"
```

### Cloudflare Pages Deploy

`.github/workflows/cloudflare-pages.yml`

Triggers:

- `pull_request`: deploys a PR preview for same-repo PRs.
- `workflow_dispatch`: deploys staging or a manual PR environment.
- `push` to `main`: deploys production-style demo.

Manual staging deploy:

```sh
gh workflow run cloudflare-pages.yml \
  --repo AndrewHYi/cloudflare-pages-react-demo \
  --ref main \
  -f target=staging \
  -f branch_alias=int
```

Manual PR environment deploy:

```sh
gh workflow run cloudflare-pages.yml \
  --repo AndrewHYi/cloudflare-pages-react-demo \
  --ref <draft-pr-branch> \
  -f target=pr-preview \
  -f branch_alias=manual-pr-<pr-number>-<name>
```

Example:

```sh
gh workflow run cloudflare-pages.yml \
  --repo AndrewHYi/cloudflare-pages-react-demo \
  --ref main \
  -f target=pr-preview \
  -f branch_alias=manual-pr-readme-proof
```

Use `manual-pr-<number>-<name>` for manually opened environments. Avoid
`pr-<number>` unless you intentionally want to overwrite the automatic PR
preview alias for that PR number.

Production-style demo deploy happens on push to `main`.

## Manual PR Environment Runbook

This is the target flow for individual developers and agents:

1. Developer opens a draft PR.
2. Developer asks an agent: "open a PR environment for this draft PR."
3. Agent reads this README, gets the PR branch name and PR number, and runs:

   ```sh
   gh workflow run cloudflare-pages.yml \
     --repo AndrewHYi/cloudflare-pages-react-demo \
     --ref <draft-pr-branch> \
     -f target=pr-preview \
     -f branch_alias=manual-pr-<pr-number>-<developer-or-topic>
   ```

4. Agent waits for the workflow run to finish.
5. Agent reads the workflow summary or logs for the internal Pages proof URL.
6. Agent verifies the internal artifact:

   ```sh
   npm run verify:deployment -- \
     <internal-cloudflare-pages-url> \
     <workflow-head-sha>
   ```

7. After TEST Worker Routes and version mapping exist, agent reports the
   user-facing PR/preview URL and verified SHA:

   ```text
   https://test.seeclickfix.com/web_portal_v2/<portal-token-or-client-route>?version=<workflow-head-sha>
   ```

The manual PR environment is independent from the automatic PR preview. The
automatic PR preview uses `pr-<number>`. The manual environment should use a
different alias, such as `manual-pr-40-andrew`.

## How Versions Work In Cloudflare Pages

The old portal deploy used Rails and S3 version selection:

```text
/web_portal_v2/<portal-token-or-client-route>?version=<sha>
```

Rails translated that into an S3 object lookup like:

```text
<portal_react_s3_prefix>/index.html:<sha>
```

Cloudflare Pages does not natively select deployments with a
`?version=<sha>` query parameter. It has two artifact concepts:

- Immutable deployment URL: every upload gets a URL like
  `<internal-cloudflare-deployment-url>`.
- Branch alias URL: `--branch int` or `--branch manual-pr-40-andrew` creates a
  stable internal target that points to the latest deployment for that alias.

Re-deploying the same branch alias moves that alias to the newest upload. The
immutable deployment URL is the exact-version proof target. The public
QA/test and PR/preview URLs stay on `test.seeclickfix.com`:

```text
QA/test active:      https://test.seeclickfix.com/web_portal_v2/<portal-token-or-client-route>
PR/preview version: https://test.seeclickfix.com/web_portal_v2/<portal-token-or-client-route>?version=<pr-head-sha>
```

The Worker keeps the public `?version=<sha>` contract and resolves that version
to the correct internal Pages deployment target.

This app also writes its own version proof into the artifact:

- `meta[name="portal-react:commit-sha"]` in `index.html`
- `/version.json`
- `/web_portal_v2/version.json`

`npm run verify:deployment -- <url> <sha>` checks those proof surfaces.

## Local Verification

Install and build:

```sh
npm install
npm run build
npm run test:proof
```

Run locally:

```sh
npm run dev
```

Verify any internal deployed artifact URL:

```sh
npm run verify:deployment -- \
  <internal-cloudflare-pages-url> \
  <expected-commit-sha>
```

`verify:deployment` retries fetches because the first deployment of a new
Cloudflare Pages subdomain can return a TLS handshake failure while Cloudflare
finishes activating the host certificate.

Verify the same-host `/web_portal_v2` routing model:

```sh
npm run build:path-route
npm run verify:path-routing
```

This proof checks these concrete requirements:

- only `/web_portal_v2` and `/web_portal_v2/*` route to Pages;
- path-routed builds emit browser-facing asset URLs under
  `/web_portal_v2/assets/*`;
- portal app shell paths such as `/web_portal_v2/<portal-token>` fetch the
  Pages root HTML while the browser URL remains unchanged;
- after the `/web_portal_v2/...` Worker Route has matched, `?version=<sha>`
  resolves to the matching internal Pages deployment target when a version
  mapping exists;
- the Worker routing code rewrites those asset requests to existing Pages files under
  `/assets/*`.

## Personal Cloudflare Setup

This is the setup used for the MVP.

1. Create a Cloudflare API token from the personal Cloudflare account.

   Required permissions:

   - Account: Cloudflare Pages: Edit
   - Account: Account Settings: Read

2. Store it as a GitHub secret. Do not paste the token into docs, issues,
   commits, logs, or chat.

   ```sh
   gh secret set CLOUDFLARE_API_TOKEN \
     --repo AndrewHYi/cloudflare-pages-react-demo
   ```

3. Run the bootstrap workflow.

   ```sh
   gh workflow run cloudflare-pages-bootstrap.yml \
     --repo AndrewHYi/cloudflare-pages-react-demo \
     --ref main \
     -f project_name=portal-react-cloudflare-demo
   ```

4. If bootstrap reports that it could not write repo variables, set them with
   `gh variable set` using the account ID printed in the run log/summary.

5. Run staging deploy.

   ```sh
   gh workflow run cloudflare-pages.yml \
     --repo AndrewHYi/cloudflare-pages-react-demo \
     --ref main \
     -f branch_alias=int
   ```

6. Verify the internal alias URL from the workflow log/summary against the run
   SHA.

   ```sh
   npm run verify:deployment -- \
     <internal-cloudflare-pages-url> \
     "<workflow-head-sha>"
   ```

## How To Set This Up For `portal-react`

The official implementation path is in draft PR:

`https://github.com/SeeClickFix/portal-react/pull/40`

The official repo should not use Andrew's personal Cloudflare account. It
should use a company Cloudflare account tied to work SSO, with SRE owning
account setup, API tokens, Worker Routes, DNS routing, and production
environment protection.

### 1. Create Company Cloudflare Projects

Recommended projects:

- `portal-react-nonprod`
- `portal-react-production`

Use separate projects unless Cloudflare RBAC can prove that the non-production
token cannot deploy the production project.

```sh
npx wrangler pages project create portal-react-nonprod --production-branch main
npx wrangler pages project create portal-react-production --production-branch main
```

SRE can run those commands from an authenticated work Cloudflare session, or
create the projects in the Cloudflare dashboard.

### 2. Create Work-Owned API Tokens

Recommended tokens:

- `portal-react-nonprod-deploy`
- `portal-react-production-deploy`

Minimum deploy permissions:

- Account: Cloudflare Pages: Edit
- Account: Account Settings: Read

DNS and Worker Route setup should stay with SRE-owned credentials:

- Zone: DNS: Edit
- Zone: Zone: Read

Do not reuse Andrew's personal token for the official repo.

### 3. Configure `SeeClickFix/portal-react` GitHub Variables

```sh
gh variable set CLOUDFLARE_NONPROD_ACCOUNT_ID \
  --repo SeeClickFix/portal-react \
  --body "<work-cloudflare-account-id>"

gh variable set CLOUDFLARE_NONPROD_PAGES_PROJECT \
  --repo SeeClickFix/portal-react \
  --body "portal-react-nonprod"

gh variable set CLOUDFLARE_PRODUCTION_ACCOUNT_ID \
  --repo SeeClickFix/portal-react \
  --body "<work-cloudflare-account-id>"

gh variable set CLOUDFLARE_PRODUCTION_PAGES_PROJECT \
  --repo SeeClickFix/portal-react \
  --body "portal-react-production"
```

### 4. Configure `SeeClickFix/portal-react` GitHub Secrets

Non-production token as a repository secret:

```sh
gh secret set CLOUDFLARE_NONPROD_API_TOKEN \
  --repo SeeClickFix/portal-react
```

Production token as a `production` environment secret:

```sh
gh secret set CLOUDFLARE_PRODUCTION_API_TOKEN \
  --repo SeeClickFix/portal-react \
  --env production
```

`portal-react` also needs the existing private package secret:

```text
MUI_SHARED_COMPONENTS_RO_TOKEN
```

### 5. Protect GitHub Environments

Create environments:

- `staging`
- `production`

For `production`:

- Required reviewers: SRE/DevOps.
- Prevent self-review: enabled.
- Deployment branches: protected branches only.

Production must not be available through manual workflow dispatch. In PR 40 it
only runs from a push to protected `main` and then waits on the protected
`production` environment.

### 6. Configure Routing

Do not map these existing backend hostnames directly to Pages:

- `test.seeclickfix.com`
- `int.seeclickfix.com`
- `seeclickfix.com`

Those hostnames already serve the Rails/backend app. Cloudflare must preserve
the current path shape:

```text
/web_portal_v2/<portal-token-or-client-route>
```

Non-production:

- Use Cloudflare Pages branch aliases as internal artifact targets behind the
  Worker:
  - `staging`
  - `pr-<number>`
- For same-host TEST, configure these Cloudflare Worker Routes:
  - `test.seeclickfix.com/web_portal_v2`
  - `test.seeclickfix.com/web_portal_v2/*`
- For same-host INT, configure these Cloudflare Worker Routes:
  - `int.seeclickfix.com/web_portal_v2`
  - `int.seeclickfix.com/web_portal_v2/*`
- Leave all other paths on the backend host.

Production:

- For same-host production, configure these Cloudflare Worker Routes:
  - `seeclickfix.com/web_portal_v2`
  - `seeclickfix.com/web_portal_v2/*`
- Leave all other `seeclickfix.com` paths on the backend host.
- Do this only after the protected production workflow, asset-path behavior,
  rollback process, and SRE ownership are verified.

Verified same-host Worker Route requirements:

- Use the exact route plus slash-delimited wildcard shown above. Do not use
  `test.seeclickfix.com/web_portal_v2*` as the only route; Cloudflare route
  docs say a trailing `*` matches suffixes, which would also catch
  `/web_portal_v2_test` at the Worker trigger layer.
- Worker routing code must match `/web_portal_v2` and `/web_portal_v2/*`.
- It must not match `/web_portal_v2_test`, `/api/*`, `/scf/*`, `/assets/*`, or
  `/`.
- The Vite build must use `VITE_BASE_PATH=/web_portal_v2/` or equivalent so
  scripts and styles load from `/web_portal_v2/assets/*`.
- Worker routing code must fetch Pages `/` for portal app shell paths.
- Because Vite still writes files under `dist/assets/*`, Worker routing code must
  rewrite `/web_portal_v2/assets/*` to the Pages origin `/assets/*`.
- This repo verifies the rewrite behavior with `npm run verify:path-routing`.
- This is local proof of build output and Worker routing logic. Live same-host
  proof requires SRE to install the Worker Routes in the company Cloudflare
  zones and then verify the real hostnames.
- The `Cloudflare account proof` workflow checks whether the personal account
  can support live Worker Route proof. Run `28448771133` showed the Pages project
  is accessible, but the account has zero active zones and the existing token
  cannot read Workers scripts. Live Worker Route proof needs an active zone plus
  a token with Workers access.

### 7. Run Official Staging Proof

After SRE configures the official repo variables/secrets:

```sh
gh workflow run cloudflare-pages.yml \
  --repo SeeClickFix/portal-react \
  --ref main \
  -f target=staging
```

Then verify:

```sh
pnpm verify:deployment "<cloudflare-pages-url>" "<expected-commit-sha>"
```

Expected proof endpoints:

- `/version.json`
- `/web_portal_v2/version.json`
- `meta[name="portal-react:commit-sha"]` in `index.html`

### 8. Rails Cleanup After Cutover

Only after Cloudflare serves the intended staging hostname paths and stakeholders
accept the proof command, remove or replace the portal-react-specific Rails S3
proxy.

Candidate Rails cleanup:

- `app/controllers/portal_react/index_controller.rb`
- the `/web_portal_v2` route block in `config/routes.rb`
- `app/helpers/portal_react_routes_helper.rb`, if Rails no longer generates or
  validates React portal URLs
- `portal_react_s3_prefix` entries in `config/aws.yml`
- request/helper specs that lock in portal-react S3 proxy behavior

Do not remove shared Rails deploy/version code just for `portal-react`; CRM,
Direct, and legacy Portal still use it.

## Key Takeaway

For the official migration, developers should deploy through GitHub Actions.
SRE should own Cloudflare account access, API tokens, Worker Routes, protected
production environments, and rollback policy. That gives the team deployability
without handing every developer direct Cloudflare production access.
