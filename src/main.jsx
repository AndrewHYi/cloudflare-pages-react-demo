import React from "react";
import { createRoot } from "react-dom/client";
import { version } from "./version";
import "./styles.css";

const proofRows = [
  ["Commit SHA", version.commitSha],
  ["Branch", version.branch],
  ["Environment", version.environment],
  ["Build time", version.buildTime],
  ["Repository", version.repository],
  ["Pages project", version.pagesProject || "configured by GitHub Actions"],
];

const comparisonRows = [
  {
    label: "Versioned QA",
    old: "Rails maps ?version=<sha> to S3 index.html:<sha>.",
    current: "Cloudflare serves immutable deployment URLs and branch aliases.",
  },
  {
    label: "Promotion",
    old: "Copy a tested S3 index object into the active index key.",
    current: "Production deploy happens only from protected main.",
  },
  {
    label: "Proof",
    old: "Playwright checks meta[name='portal-react:commit-sha'].",
    current: "The same meta tag and /version.json prove the exact artifact.",
  },
];

function App() {
  const route = window.location.pathname;
  const versionUrl = new URL("/version.json", window.location.origin).toString();

  return (
    <main className="app-shell">
      <section className="proof-panel" aria-labelledby="page-title">
        <div className="eyebrow">Cloudflare Pages prototype</div>
        <div className="title-row">
          <div>
            <h1 id="page-title">Portal deploy proof</h1>
            <p>
              This build is a standalone proof that GitHub Actions can deploy a
              React artifact to Cloudflare Pages and verify the exact commit
              without Rails serving versioned HTML from S3.
            </p>
          </div>
          <StatusBadge environment={version.environment} />
        </div>

        <div className="proof-grid">
          {proofRows.map(([label, value]) => (
            <div className="proof-cell" key={label}>
              <span>{label}</span>
              <strong title={value}>{value}</strong>
            </div>
          ))}
        </div>

        <div className="route-proof">
          <span>Current route</span>
          <code>{route}</code>
        </div>
      </section>

      <section className="flow-panel" aria-labelledby="flow-title">
        <h2 id="flow-title">Deploy control path</h2>
        <div className="flow">
          <FlowStep label="GitHub" detail="PR, staging, or protected main" />
          <FlowStep label="Actions" detail="Build once, stamp metadata" />
          <FlowStep label="Wrangler" detail="pages deploy --commit-hash" />
          <FlowStep label="Pages" detail="Immutable URL and branch alias" />
          <FlowStep label="Proof" detail="Meta tag plus /version.json" />
        </div>
      </section>

      <section className="comparison-panel" aria-labelledby="compare-title">
        <h2 id="compare-title">What changes from the old flow</h2>
        <div className="comparison-table">
          {comparisonRows.map((row) => (
            <article className="comparison-row" key={row.label}>
              <h3>{row.label}</h3>
              <p><span>Old</span>{row.old}</p>
              <p><span>New</span>{row.current}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="checks-panel" aria-labelledby="checks-title">
        <h2 id="checks-title">Stakeholder checks</h2>
        <div className="check-list">
          <code>curl -fsSL {versionUrl}</code>
          <code>node scripts/verify-deployment.mjs &lt;url&gt; {version.commitSha}</code>
          <code>document.querySelector('meta[name="portal-react:commit-sha"]').content</code>
        </div>
        {version.githubRunUrl ? (
          <a className="run-link" href={version.githubRunUrl}>
            View GitHub Actions run
          </a>
        ) : null}
      </section>
    </main>
  );
}

function StatusBadge({ environment }) {
  const normalized = environment.toLowerCase();
  return (
    <div className={`status-badge status-${normalized}`}>
      <span />
      {environment}
    </div>
  );
}

function FlowStep({ label, detail }) {
  return (
    <div className="flow-step">
      <strong>{label}</strong>
      <span>{detail}</span>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
