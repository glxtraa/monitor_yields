"use client";

import { useMemo, useState } from "react";

type Bond = { name: string; issuer: string; project: string; price: number | null; note: string };
type CdsQuote = { issuer: string; spread: number; asOf: string; source: string; url: string; note: string };

const initialBonds: Bond[] = [
  { name: "River Bend project bonds", issuer: "Hut 8", project: "Louisiana · 245 MW campus", price: 94, note: "Around 94¢, as reported by FT" },
  { name: "Beacon Point project bonds", issuer: "Hut 8", project: "Texas · Nvidia-tenant campus", price: 92, note: "Around 92¢, as reported by FT" },
  { name: "Project Excalibur", issuer: "QTS / Blackstone", project: "Georgia · Microsoft-tenant campus", price: 87.9, note: "Below 88¢, as reported by FT" },
  { name: "Unsecured notes", issuer: "CoreWeave", project: "Corporate debt · 2032 maturity", price: 75, note: "As low as 75¢, per FT report" },
  { name: "Beignet Investor", issuer: "Meta project finance", project: "Hyperion megaproject", price: null, note: "Chart reference; no numeric quote provided" },
  { name: "RD Michigan", issuer: "Oracle project finance", project: "Michigan campus", price: null, note: "Chart reference; no numeric quote provided" },
  { name: "Sopaipilla", issuer: "Meta project finance", project: "El Paso campus", price: null, note: "Chart reference; no numeric quote provided" },
];

const initialCds: CdsQuote[] = [
  { issuer: "CoreWeave", spread: 1118, asOf: "15 Oct 2026 · intraday report", source: "Reported above 1,000 bps; 1,118 bps cited as a high reading", url: "https://startupfortune.com/coreweave-default-odds-hit-60-percent-as-credit-swaps-top-1000-basis-points/", note: "Indicative, distressed-market quote" },
  { issuer: "Oracle", spread: 288, asOf: "15 Oct 2026", source: "Reuters report via GuruFocus / Yahoo Finance", url: "https://finance.yahoo.com/markets/stocks/articles/oracles-default-insurance-hits-record-122137367.html", note: "Five-year CDS" },
];

function fmt(value: number, digits = 1) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function cumulativePd(spreadBps: number, recoveryPct: number, years = 5) {
  const lgd = 1 - recoveryPct / 100;
  if (lgd <= 0) return 0;
  return (1 - Math.exp(-(spreadBps / 10_000) * years / lgd)) * 100;
}

export default function AiDataCenterMonitor() {
  const [recovery, setRecovery] = useState(40);
  const [bonds, setBonds] = useState(initialBonds);
  const [cds, setCds] = useState(initialCds);
  const latest = useMemo(() => [...cds].sort((a, b) => cumulativePd(b.spread, recovery) - cumulativePd(a.spread, recovery)), [cds, recovery]);

  return (
    <main className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Corporate and project credit</p>
          <h1>AI Data Center Bond Monitor</h1>
          <p className="lede">Track reported bond prices for AI data center projects alongside five-year CDS quotes and a transparent, recovery-adjusted default-probability estimate.</p>
          <nav className="reference-links" aria-label="Monitor navigation">
            <a href="/">France–Germany Yield Monitor ↗</a>
            <a href="https://www.ft.com/content/8171ef4a-b291-4375-bc85-87bee0f8bf7b" target="_blank" rel="noreferrer">FT Alphaville: CoreWeave bonds ↗</a>
          </nav>
        </div>
        <div className="status-badge">Reference quotes · 15 Oct 2026</div>
      </header>

      <section className="control-panel" aria-label="Default probability assumptions">
        <label>
          Assumed recovery
          <input type="number" min="0" max="99" step="1" value={recovery} onChange={(event) => setRecovery(Math.max(0, Math.min(99, Number(event.target.value))))} />
          <span className="input-suffix">%</span>
        </label>
        <p className="section-note">PDs update from the CDS spread and recovery input. Edit quotes in the tables to explore scenarios; edits stay in this page session.</p>
      </section>

      <section>
        <div className="section-heading"><p className="eyebrow">Risk snapshot</p><h2>Five-year CDS and implied default probability</h2><p className="section-note">CDS spreads are annual premiums in basis points. The probability uses a flat hazard rate: cumulative PD = 1 − exp(−spread × 5 / (1 − recovery)).</p></div>
        <div className="snapshot-grid">
          {latest.map((quote) => <article className="snapshot-card" key={quote.issuer}>
            <span>{quote.issuer} · 5Y CDS</span>
            <strong>{fmt(quote.spread, 0)} bps</strong>
            <div>Five-year cumulative PD proxy: <b>{fmt(cumulativePd(quote.spread, recovery), 1)}%</b></div>
            <small>{quote.asOf}</small>
          </article>)}
        </div>
      </section>

      <section>
        <div className="section-heading"><p className="eyebrow">Quoted instruments</p><h2>CDS market observations</h2><p className="section-note">These are reported market observations, not a continuous live feed. Update the bps fields with your preferred data source; PD estimates recalculate immediately.</p></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Reference entity</th><th>Tenor</th><th>Spread (bps)</th><th>As of</th><th>5Y PD proxy</th><th>Source / context</th></tr></thead>
          <tbody>{cds.map((quote, index) => <tr key={quote.issuer}>
            <td>{quote.issuer}</td><td>5Y</td>
            <td><input aria-label={`${quote.issuer} CDS spread in basis points`} className="table-input" type="number" min="0" step="1" value={quote.spread} onChange={(event) => setCds((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, spread: Math.max(0, Number(event.target.value)) } : item))} /></td>
            <td>{quote.asOf}</td><td><strong>{fmt(cumulativePd(quote.spread, recovery), 1)}%</strong></td>
            <td><a href={quote.url} target="_blank" rel="noreferrer">{quote.source} ↗</a><br /><small>{quote.note}</small></td>
          </tr>)}</tbody>
        </table></div>
      </section>

      <section>
        <div className="section-heading"><p className="eyebrow">Project debt</p><h2>Bond price monitor</h2><p className="section-note">Prices are cents per dollar of par. Edit values to record new observations. The FT screenshot supplied with this request gives approximate prices for four instruments; chart-only series are included with blank prices because their exact values are not stated in the excerpt.</p></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Bond / financing</th><th>Issuer / sponsor</th><th>Project / tenant</th><th>Price (¢)</th><th>Reported reference</th></tr></thead>
          <tbody>{bonds.map((bond, index) => <tr key={bond.name}>
            <td>{bond.name}</td><td>{bond.issuer}</td><td>{bond.project}</td>
            <td><input aria-label={`${bond.name} price in cents`} className="table-input" type="number" min="0" max="150" step="0.1" placeholder="—" value={bond.price ?? ""} onChange={(event) => setBonds((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value === "" ? null : Number(event.target.value) } : item))} /></td>
            <td>{bond.note}</td>
          </tr>)}</tbody>
        </table></div>
      </section>

      <section className="notes-section">
        <div className="section-heading"><p className="eyebrow">Method and sources</p><h2>How to read the estimates</h2></div>
        <p>A CDS-implied PD is a risk-neutral approximation. It treats the quoted spread as expected loss, assumes a flat hazard rate, and uses the selected recovery rate. Real CDS prices include liquidity, counterparty, risk-premium, and contract effects. It is not a forecast of physical default.</p>
        <p>Project bond prices are not used directly to calculate PD: price alone is insufficient without coupon, maturity, seniority, and cash-flow assumptions. CDS quotes shown here refer to the corporate reference entity and do not represent a project bond’s own credit protection.</p>
        <div className="source-list"><strong>References</strong>
          <a href="https://www.ft.com/content/8171ef4a-b291-4375-bc85-87bee0f8bf7b" target="_blank" rel="noreferrer">FT Alphaville: CoreWeave bonds</a>
          <span>FT supplied screenshot: data centre bond prices (15 Oct 2026)</span>
          <a href="https://markets.ft.markitdigital.com/data/announce/detail?dockey=600-202606091805PR_NEWS_USPRX____FL80065-1" target="_blank" rel="noreferrer">Hut 8 Beacon Point bond announcement ↗</a>
          <a href="https://startupfortune.com/coreweave-default-odds-hit-60-percent-as-credit-swaps-top-1000-basis-points/" target="_blank" rel="noreferrer">CoreWeave CDS reporting</a>
          <a href="https://finance.yahoo.com/markets/stocks/articles/oracles-default-insurance-hits-record-122137367.html" target="_blank" rel="noreferrer">Oracle CDS reporting</a>
        </div>
      </section>
    </main>
  );
}
