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

Live proof:

- Staging workflow run:
  `https://github.com/AndrewHYi/cloudflare-pages-react-demo/actions/runs/28393647805`
- Staging alias:
  `https://int.portal-react-cloudflare-demo.pages.dev`
- Staging verified SHA:
  `4d99cac343037c94ca318cd83eb700fbb2ce586b`
- Production-style workflow run:
  `https://github.com/AndrewHYi/cloudflare-pages-react-demo/actions/runs/28393883268`
- Production proof URL:
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
- A production-style deploy can be restricted to a `main` push.
- Developers do not need Cloudflare dashboard access to deploy through GitHub
  Actions.
- The old `?version=<sha>` Rails/S3 lookup can be replaced by a Cloudflare
  deployment URL plus runtime SHA proof.

## Private Repo Notes

Making this GitHub repo private protects the source repository, not the
Cloudflare Pages URLs.

By default, `*.pages.dev` deployments are still publicly reachable. If preview
or staging URLs need company-only access, put Cloudflare Access in front of the
Pages project or route traffic through a protected worker/custom domain.

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
- `workflow_dispatch`: deploys staging.
- `push` to `main`: deploys production-style demo.

Manual staging deploy:

```sh
gh workflow run cloudflare-pages.yml \
  --repo AndrewHYi/cloudflare-pages-react-demo \
  --ref main \
  -f branch_alias=int
```

Production-style demo deploy happens on push to `main`.

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

Verify any deployed URL:

```sh
npm run verify:deployment -- \
  https://<deployment-or-alias>.pages.dev \
  <expected-commit-sha>
```

`verify:deployment` retries fetches because the first deployment of a new
Cloudflare Pages subdomain can return a TLS handshake failure while Cloudflare
finishes activating the host certificate.

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

6. Verify the alias URL against the run SHA.

   ```sh
   npm run verify:deployment -- \
     https://int.portal-react-cloudflare-demo.pages.dev \
     "<workflow-head-sha>"
   ```

## How To Set This Up For `portal-react`

The official implementation path is in draft PR:

`https://github.com/SeeClickFix/portal-react/pull/40`

The official repo should not use Andrew's personal Cloudflare account. It
should use a company Cloudflare account tied to work SSO, with SRE owning
account setup, API tokens, domains, and production environment protection.

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

DNS/custom-domain setup should stay with SRE-owned credentials:

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

### 6. Configure Domains

Non-production options:

- Use Cloudflare Pages branch aliases first:
  - `https://staging.<project>.pages.dev`
  - `https://pr-<number>.<project>.pages.dev`
- Then map official domains:
  - `test.seeclickfix.com`
  - `int.seeclickfix.com`

Production:

- Only map `seeclickfix.com` after the protected production workflow,
  rollback process, and SRE ownership are verified.

If `test.seeclickfix.com/web_portal_v2` must stay on the exact same host and
path, SRE likely needs either:

- a Cloudflare Worker route that proxies `/web_portal_v2*` to the Pages
  deployment, or
- Cloudflare zone/routing changes that let Pages own that path safely.

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

Only after Cloudflare serves the intended staging domains and stakeholders
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
SRE should own Cloudflare account access, API tokens, custom domains, protected
production environments, and rollback policy. That gives the team deployability
without handing every developer direct Cloudflare production access.
