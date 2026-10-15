"use client";

import { useMemo, useState } from "react";

type Bond = { name: string; issuer: string; project: string; price: number | null; yieldPct: number | null; asOf: string; source: string; url: string; note: string };
type CdsQuote = { issuer: string; spread: number; asOf: string; source: string; url: string; note: string };

const initialBonds: Bond[] = [
  { name: "River Bend · 6.192% due 2042", issuer: "Hut 8 DC LLC", project: "Louisiana · 245 MW campus", price: 93.78, yieldPct: 7.07, asOf: "13 Oct close", source: "BondTerminal", url: "https://bondterminal.com/calculator/US44813DAA46", note: "Senior secured · ISIN US44813DAA46" },
  { name: "Beacon Point · 6.129% due 2042", issuer: "Beacon Point DC LLC", project: "Texas · Nvidia-tenant campus", price: 92, yieldPct: null, asOf: "FT report · 15 Oct", source: "FT screenshot supplied", url: "", note: "Approx. 92¢ · senior secured · ISIN USU0669AAA44" },
  { name: "Project Excalibur", issuer: "QTS / Blackstone", project: "Georgia · Microsoft-tenant campus", price: null, yieldPct: null, asOf: "FT report · 15 Oct", source: "FT screenshot supplied", url: "", note: "Reported below 88¢; exact price and bond tranche not stated" },
  { name: "CoreWeave · 9.625% due 2032", issuer: "CoreWeave, Inc.", project: "Corporate unsecured · USD notes", price: 77.82, yieldPct: 15.57, asOf: "14 Oct close", source: "BondTerminal", url: "https://bondterminal.com/calculator/US21873SAK42", note: "Senior unsecured · ISIN US21873SAK42 · CUSIP 21873SAK4" },
  { name: "APLD ComputeCo 3 · 7.00% due 2031", issuer: "APLD ComputeCo 3 LLC", project: "Applied Digital data center financing", price: 94.1, yieldPct: 8.6, asOf: "14 Oct close", source: "BondTerminal", url: "https://bondterminal.com/calculator/US03790NAA54", note: "Senior secured · ISIN US03790NAA54" },
  { name: "Galaxy Helios DC II · 9.875% due 2031", issuer: "Galaxy Helios Data Centers II LLC", project: "Data center project financing", price: 91.63, yieldPct: 12.29, asOf: "14 Oct close", source: "BondTerminal", url: "https://bondterminal.com/calculator/US36322DAA46", note: "Senior secured · ISIN US36322DAA46" },
  { name: "Beignet Investor", issuer: "Meta project finance", project: "Hyperion megaproject", price: null, yieldPct: null, asOf: "FT chart", source: "FT screenshot supplied", url: "", note: "Chart reference; no numeric quote provided" },
  { name: "RD Michigan", issuer: "Oracle project finance", project: "Michigan campus", price: null, yieldPct: null, asOf: "FT chart", source: "FT screenshot supplied", url: "", note: "Chart reference; no numeric quote provided" },
  { name: "Sopaipilla", issuer: "Meta project finance", project: "El Paso campus", price: null, yieldPct: null, asOf: "FT chart", source: "FT screenshot supplied", url: "", note: "Chart reference; no numeric quote provided" },
];

const initialCds: CdsQuote[] = [
  { issuer: "CoreWeave", spread: 1194.5, asOf: "15 Oct 2026 · intraday high", source: "Bloomberg, citing ICE Data Services", url: "https://news.bloomberglaw.com/bankruptcy-law/coreweave-risk-gauge-hits-record-pricing-60-odds-of-default", note: "Headline reported >60% five-year default odds" },
  { issuer: "Oracle", spread: 288, asOf: "15 Oct 2026", source: "Reuters, citing S&P Global Market Intelligence", url: "https://www.investing.com/news/stock-market-news/ai-credit-default-swap-spreads-widen-sharply-4950549", note: "Five-year CDS; record level reported" },
  { issuer: "SoftBank", spread: 424, asOf: "15 Oct 2026", source: "Reuters, citing S&P Global Market Intelligence", url: "https://www.investing.com/news/stock-market-news/ai-credit-default-swap-spreads-widen-sharply-4950549", note: "Five-year CDS; AI funding comparator, not a data center operator" },
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
        <div className="status-badge">Market data · 13–15 Oct 2026</div>
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
        <div className="section-heading"><p className="eyebrow">Quoted instruments</p><h2>CDS market observations</h2><p className="section-note">These are dated market observations, not a continuous live feed. CoreWeave is an intraday high; Oracle and SoftBank are the Reuters-reported five-year levels. Update the bps fields with your preferred data source; PD estimates recalculate immediately.</p></div>
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
          <thead><tr><th>Bond / financing</th><th>Issuer / sponsor</th><th>Project / tenant</th><th>Price (¢)</th><th>Yield</th><th>Quote date / source</th><th>Instrument / note</th></tr></thead>
          <tbody>{bonds.map((bond, index) => <tr key={bond.name}>
            <td>{bond.name}</td><td>{bond.issuer}</td><td>{bond.project}</td>
            <td><input aria-label={`${bond.name} price in cents`} className="table-input" type="number" min="0" max="150" step="0.01" placeholder="—" value={bond.price ?? ""} onChange={(event) => setBonds((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value === "" ? null : Number(event.target.value) } : item))} /></td>
            <td>{bond.yieldPct === null ? "—" : `${fmt(bond.yieldPct, 2)}%`}</td><td>{bond.asOf}<br />{bond.url ? <a href={bond.url} target="_blank" rel="noreferrer">{bond.source} ↗</a> : bond.source}</td><td>{bond.note}</td>
          </tr>)}</tbody>
        </table></div>
      </section>

      <section className="notes-section">
        <div className="section-heading"><p className="eyebrow">Method and sources</p><h2>How to read the estimates</h2></div>
        <p>A CDS-implied PD is a risk-neutral approximation. It treats the quoted spread as expected loss, assumes a flat hazard rate, and uses the selected recovery rate. Real CDS prices include liquidity, counterparty, risk-premium, and contract effects. It is not a forecast of physical default.</p>
        <p>Project bond prices are not used directly to calculate PD: price alone is insufficient without coupon, maturity, seniority, and cash-flow assumptions. CDS quotes shown here refer to the corporate reference entity and do not represent a project bond’s own credit protection.</p>
        <div className="source-list"><strong>References</strong>
          <a href="https://www.ft.com/content/8171ef4a-b291-4375-bc85-87bee0f8bf7b" target="_blank" rel="noreferrer">FT Alphaville: CoreWeave bonds</a>
          <a href="https://news.bloomberglaw.com/bankruptcy-law/coreweave-risk-gauge-hits-record-pricing-60-odds-of-default" target="_blank" rel="noreferrer">Bloomberg / ICE Data Services: CoreWeave CDS</a>
          <a href="https://www.investing.com/news/stock-market-news/ai-credit-default-swap-spreads-widen-sharply-4950549" target="_blank" rel="noreferrer">Reuters / S&P Global Market Intelligence: Oracle and SoftBank CDS</a>
          <a href="https://bondterminal.com/calculator/US21873SAK42" target="_blank" rel="noreferrer">BondTerminal: CoreWeave bond quote</a>
          <a href="https://bondterminal.com/calculator/US44813DAA46" target="_blank" rel="noreferrer">BondTerminal: River Bend bond quote</a>
          <a href="https://markets.ft.markitdigital.com/data/announce/detail?dockey=600-202606091805PR_NEWS_USPRX____FL80065-1" target="_blank" rel="noreferrer">Hut 8 Beacon Point bond announcement ↗</a>
        </div>
      </section>
    </main>
  );
}
