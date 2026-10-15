"use client";

import { useEffect, useState } from "react";

type Entity = {
  name: string;
  ticker: string;
  role: string;
  spreadBps: number | null;
  spreadDate: string;
  spreadSource: string;
  spreadUrl: string;
};

const aiBasketUrl = "https://www.edwardconard.com/macro-roundup/dtcc-data-show-the-market-for-cdss-on-debt-tied-to-the-ai-buildout-has-grown-90-since-september-the-cost-of-buying-the-derivatives-on-oracles-debt-has-risen-to-its-highest-level-sin/";
const quoteSources = {
  coreweave: "https://news.bloomberglaw.com/bankruptcy-law/coreweave-risk-gauge-hits-record-pricing-60-odds-of-default",
  reuters: "https://www.investing.com/news/stock-market-news/ai-credit-default-swap-spreads-widen-sharply-4950549",
};

const entities: Entity[] = [
  { name: "CoreWeave, Inc.", ticker: "CRWV", role: "GPU cloud / neocloud", spreadBps: 1194.5, spreadDate: "15 Oct 2026 · intraday high", spreadSource: "Bloomberg / ICE", spreadUrl: quoteSources.coreweave },
  { name: "Oracle Corporation", ticker: "ORCL", role: "Cloud / AI data-centre borrower", spreadBps: 288, spreadDate: "15 Oct 2026", spreadSource: "Reuters / S&P Global MI", spreadUrl: quoteSources.reuters },
  { name: "SoftBank Group Corp.", ticker: "9984.T", role: "AI investor / financing exposure", spreadBps: 424, spreadDate: "15 Oct 2026", spreadSource: "Reuters / S&P Global MI", spreadUrl: quoteSources.reuters },
  { name: "Alphabet Inc.", ticker: "GOOGL", role: "AI platform / Google Cloud", spreadBps: null, spreadDate: "—", spreadSource: "No sourced quote", spreadUrl: "" },
  { name: "Amazon.com, Inc.", ticker: "AMZN", role: "AI platform / AWS", spreadBps: null, spreadDate: "—", spreadSource: "No sourced quote", spreadUrl: "" },
  { name: "Broadcom Inc.", ticker: "AVGO", role: "AI semiconductors / networking", spreadBps: null, spreadDate: "—", spreadSource: "No sourced quote", spreadUrl: "" },
  { name: "Meta Platforms, Inc.", ticker: "META", role: "AI platform / data-centre issuer", spreadBps: null, spreadDate: "—", spreadSource: "No sourced quote", spreadUrl: "" },
  { name: "Microsoft Corporation", ticker: "MSFT", role: "AI platform / cloud capacity buyer", spreadBps: null, spreadDate: "—", spreadSource: "No sourced quote", spreadUrl: "" },
  { name: "NVIDIA Corporation", ticker: "NVDA", role: "AI compute supplier", spreadBps: null, spreadDate: "—", spreadSource: "No sourced quote", spreadUrl: "" },
];

type DtccTransaction = {
  entity: string; ticker: string; timestamp: string; action: string; event: string; product: string;
  spread: string; spreadCurrency: string; spreadNotation: string; notional: string; currency: string;
  underlying: string; disseminationId: string; effectiveDate: string; expirationDate: string; maturityDate: string; cleared: string;
};
type DtccResponse = { reportDate: string; source: string; fetchedAt: string; transactionCount: number; transactions: DtccTransaction[]; error?: string };

function number(value: number | null, digits = 1) {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function fiveYearPd(spreadBps: number, recoveryPct = 40) {
  const hazard = (spreadBps / 10_000) / (1 - recoveryPct / 100);
  return (1 - Math.exp(-hazard * 5)) * 100;
}

export default function AiCdsMonitor() {
  const [dtcc, setDtcc] = useState<DtccResponse | null>(null);
  const [dtccLoading, setDtccLoading] = useState(true);
  const [dtccError, setDtccError] = useState<string | null>(null);
  const loadDtcc = async () => {
    setDtccLoading(true);
    setDtccError(null);
    try {
      const response = await fetch("/api/ai-cds/dtcc", { cache: "no-store" });
      const payload = (await response.json()) as DtccResponse;
      if (!response.ok) throw new Error(payload.error ?? "DTCC data could not be loaded.");
      setDtcc(payload);
    } catch (error) {
      setDtccError(error instanceof Error ? error.message : "DTCC data could not be loaded.");
    } finally { setDtccLoading(false); }
  };
  useEffect(() => { void loadDtcc(); }, []);

  return (
    <main className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">AI infrastructure · credit derivatives</p>
          <h1>AI CDS Trade Monitor</h1>
          <p className="lede">Search and follow individually disseminated CDS transactions for AI infrastructure and the companies financing it.</p>
          <nav className="reference-links" aria-label="Monitor navigation">
            <a href="/">France–Germany Yield Monitor ↗</a>
            <a href="/ai-data-centers">AI Data Center Bond Monitor ↗</a>
          </nav>
        </div>
        <div className="status-badge">DTCC Public Price Dissemination</div>
      </header>


      <section>
        <div className="section-heading">
          <p className="eyebrow">Trade by trade · SEC public reports</p>
          <h2>Daily CDS transaction tape</h2>
          <p className="section-note">Loads the latest DTCC SEC cumulative credit file and filters individual disclosures to the AI reference entity watchlist. Each row is a published transaction record; the spread is specific to that contract and tenor.</p>
        </div>
        <div className="control-panel">
          <div><strong>{dtccLoading ? "Loading DTCC report…" : dtcc ? `${dtcc.reportDate} UTC · ${dtcc.transactionCount} matching rows` : "DTCC report unavailable"}</strong><br /><small>{dtcc?.source ?? "Source: DTCC Public Price Dissemination"}</small></div>
          <button type="button" onClick={() => void loadDtcc()} disabled={dtccLoading}>{dtccLoading ? "Loading…" : "Refresh DTCC data"}</button>
        </div>
        {dtccError && <div className="warning-box">{dtccError} The DTCC dashboard remains available from the source link below.</div>}
        {dtcc && dtcc.transactions.length === 0 && <p className="section-note">No matching watchlist trades were found in this report date. This can mean no publicly disseminated reportable trade for these entities on that date; it does not mean no CDS contracts are outstanding.</p>}
        {dtcc && dtcc.transactions.length > 0 && <div className="table-wrap"><table>
          <thead><tr><th>Disseminated (UTC)</th><th>Reference entity</th><th>Action / event</th><th>Product</th><th>Spread</th><th>Notional</th><th>Effective → expiry</th><th>Cleared</th><th>DTCC record</th></tr></thead>
          <tbody>{dtcc.transactions.map((trade, index) => <tr key={`${trade.disseminationId}-${index}`}>
            <td>{trade.timestamp || dtcc.reportDate}</td><td>{trade.entity}<br /><small>{trade.ticker}</small></td>
            <td>{trade.action || "—"}{trade.event ? ` / ${trade.event}` : ""}</td><td>{trade.product || "—"}</td>
            <td>{trade.spread || "—"}{trade.spread ? ` ${trade.spreadCurrency} ${trade.spreadNotation}` : ""}</td>
            <td>{trade.notional || "—"}{trade.currency ? ` ${trade.currency}` : ""}</td>
            <td>{trade.effectiveDate || "—"} → {trade.expirationDate || trade.maturityDate || "—"}</td><td>{trade.cleared || "—"}</td>
            <td>{trade.disseminationId || "—"}</td>
          </tr>)}</tbody>
        </table></div>}
      </section>

      <section>
        <div className="section-heading">
          <p className="eyebrow">Reference entity watchlist</p>
          <h2>AI-linked single-name CDS</h2>
          <p className="section-note">The seven-company AI basket identified in FT reporting comprises Alphabet, Amazon, Broadcom, CoreWeave, Meta, Microsoft and Oracle. SoftBank is an AI-financing comparator; NVIDIA is an additional watchlist name.</p>
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>Reference entity</th><th>AI link</th><th>Market-reported CDS spread</th><th>5Y PD proxy</th><th>Quote date / source</th></tr></thead>
          <tbody>{entities.map((entity) => <tr key={entity.ticker}>
            <td><strong>{entity.name}</strong><br /><small>{entity.ticker}</small></td>
            <td>{entity.role}</td>
            <td>{entity.spreadBps === null ? "—" : `${number(entity.spreadBps, 1)} bps`}</td>
            <td>{entity.spreadBps === null ? "—" : `${number(fiveYearPd(entity.spreadBps), 1)}%`}</td>
            <td>{entity.spreadDate}<br />{entity.spreadUrl ? <a href={entity.spreadUrl} target="_blank" rel="noreferrer">{entity.spreadSource} ↗</a> : entity.spreadSource}</td>
          </tr>)}</tbody>
        </table></div>
      </section>

      <section className="notes-section">
        <div className="section-heading"><p className="eyebrow">Access &amp; methodology</p><h2>How to access individual DTCC CDS trades</h2></div>
        <p>Open DTCC’s SEC Dashboard, choose the Credits asset class, then use <strong>Search</strong> to query transaction terms or the cumulative reports to download a day’s ZIP/CSV. In Search, select SEC jurisdiction and Credits, set the dissemination date range, and choose Web Page or CSV output; CSV results appear under Report Center → My Scheduled Searches. The monitor reads the public daily SEC cumulative Credits file and filters the disclosed rows to the names above.</p>
        <p>DTCC disseminates transaction terms and prices, but the public file does not identify counterparties. Large single-name credit trades may have published notional capped at $5m, so the disclosed amount may not equal the full trade size. Daily files are UTC-date based and available for 366 days. The spread-based PD is calculated as 1 − exp(−spread × 5 / (1 − recovery)), assuming 40% recovery; it is a risk-neutral proxy, not a forecast of physical default. Market-reported quotes may not match the tenor or terms of a particular DTCC trade.</p>
        <div className="source-list"><strong>Data sources</strong>
          <a href="https://pddata.dtcc.com/ppd/secdashboard" target="_blank" rel="noreferrer">Open DTCC SEC Dashboard ↗</a>
          <a href="https://kgc0418-tdw-data-0.s3.amazonaws.com/gtr/static/gtr/docs/RT_PPD_quick_ref_guide.pdf" target="_blank" rel="noreferrer">DTCC Public Price Dissemination user guide and field definitions ↗</a>
          <a href="https://www.dtcc.com/-/media/Files/Downloads/legal/rules/DDR_Rulebook.pdf" target="_blank" rel="noreferrer">DTCC Data Repository Rulebook · public dissemination limits ↗</a>
          <a href={aiBasketUrl} target="_blank" rel="noreferrer">Reprint of FT reporting: AI-company CDS activity and the seven-company basket ↗</a>
          <a href="https://pddata.dtcc.com/ppd/" target="_blank" rel="noreferrer">DTCC Public Price Dissemination Dashboard ↗</a>
        </div>
      </section>
    </main>
  );
}
