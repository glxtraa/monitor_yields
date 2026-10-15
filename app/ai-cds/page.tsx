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
  grossNotional: number | null;
  netNotional: number | null;
  qoq: number | null;
  yoy: number | null;
  contracts: number | null;
  dtccStatus: string;
};

const dtccTop15Url = "https://files.dtcc.com/download/assets/CDS-Top-15%2BReport-Quarterly-Apr-2026.pdf/4fa7030ea16811f1bdc90af9021c18f2";
const aiBasketUrl = "https://www.edwardconard.com/macro-roundup/dtcc-data-show-the-market-for-cdss-on-debt-tied-to-the-ai-buildout-has-grown-90-since-september-the-cost-of-buying-the-derivatives-on-oracles-debt-has-risen-to-its-highest-level-sin/";
const quoteSources = {
  coreweave: "https://news.bloomberglaw.com/bankruptcy-law/coreweave-risk-gauge-hits-record-pricing-60-odds-of-default",
  reuters: "https://www.investing.com/news/stock-market-news/ai-credit-default-swap-spreads-widen-sharply-4950549",
};

const entities: Entity[] = [
  { name: "CoreWeave, Inc.", ticker: "CRWV", role: "GPU cloud / neocloud", spreadBps: 1194.5, spreadDate: "15 Oct 2026 · intraday high", spreadSource: "Bloomberg / ICE", spreadUrl: quoteSources.coreweave, grossNotional: null, netNotional: null, qoq: null, yoy: null, contracts: null, dtccStatus: "Not in published Top 15 corporate snapshot; check DTCC Top 1,000 activity report" },
  { name: "Oracle Corporation", ticker: "ORCL", role: "Cloud / AI data-centre borrower", spreadBps: 288, spreadDate: "15 Oct 2026", spreadSource: "Reuters / S&P Global MI", spreadUrl: quoteSources.reuters, grossNotional: 23022048258, netNotional: 6010035194, qoq: 22.16, yoy: 465.53, contracts: 1872, dtccStatus: "Top 15 corporate by net notional · week ending 27 Mar 2026" },
  { name: "SoftBank Group Corp.", ticker: "9984.T", role: "AI investor / financing exposure", spreadBps: 424, spreadDate: "15 Oct 2026", spreadSource: "Reuters / S&P Global MI", spreadUrl: quoteSources.reuters, grossNotional: 13045113798, netNotional: 2664916601, qoq: 19.81, yoy: 25.91, contracts: 3711, dtccStatus: "Top 15 corporate by net notional · week ending 27 Mar 2026" },
  { name: "Alphabet Inc.", ticker: "GOOGL", role: "AI platform / Google Cloud", spreadBps: null, spreadDate: "—", spreadSource: "No sourced quote", spreadUrl: "", grossNotional: null, netNotional: null, qoq: null, yoy: null, contracts: null, dtccStatus: "Not in published Top 15 snapshot; Top 1,000 activity report is the next public check" },
  { name: "Amazon.com, Inc.", ticker: "AMZN", role: "AI platform / AWS", spreadBps: null, spreadDate: "—", spreadSource: "No sourced quote", spreadUrl: "", grossNotional: null, netNotional: null, qoq: null, yoy: null, contracts: null, dtccStatus: "Not in published Top 15 snapshot; Top 1,000 activity report is the next public check" },
  { name: "Broadcom Inc.", ticker: "AVGO", role: "AI semiconductors / networking", spreadBps: null, spreadDate: "—", spreadSource: "No sourced quote", spreadUrl: "", grossNotional: null, netNotional: null, qoq: null, yoy: null, contracts: null, dtccStatus: "Not in published Top 15 snapshot; Top 1,000 activity report is the next public check" },
  { name: "Meta Platforms, Inc.", ticker: "META", role: "AI platform / data-centre issuer", spreadBps: null, spreadDate: "—", spreadSource: "No sourced quote", spreadUrl: "", grossNotional: null, netNotional: null, qoq: null, yoy: null, contracts: null, dtccStatus: "Not in published Top 15 snapshot; Top 1,000 activity report is the next public check" },
  { name: "Microsoft Corporation", ticker: "MSFT", role: "AI platform / cloud capacity buyer", spreadBps: null, spreadDate: "—", spreadSource: "No sourced quote", spreadUrl: "", grossNotional: null, netNotional: null, qoq: null, yoy: null, contracts: null, dtccStatus: "Not in published Top 15 snapshot; Top 1,000 activity report is the next public check" },
  { name: "NVIDIA Corporation", ticker: "NVDA", role: "AI compute supplier", spreadBps: null, spreadDate: "—", spreadSource: "No sourced quote", spreadUrl: "", grossNotional: null, netNotional: null, qoq: null, yoy: null, contracts: null, dtccStatus: "Watchlist addition; not named in the FT seven-company AI CDS basket" },
];

type DtccTransaction = {
  entity: string; ticker: string; timestamp: string; action: string; event: string; product: string;
  spread: string; spreadCurrency: string; spreadNotation: string; notional: string; currency: string;
  underlying: string; disseminationId: string;
};
type DtccResponse = { reportDate: string; source: string; fetchedAt: string; transactionCount: number; transactions: DtccTransaction[]; error?: string };

function number(value: number | null, digits = 1) {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function money(value: number | null) {
  if (value === null) return "—";
  return `$${(value / 1_000_000_000).toFixed(2)}bn`;
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
          <h1>AI CDS Monitor</h1>
          <p className="lede">Track market-reported CDS spreads alongside DTCC’s free public measures of outstanding risk and trading activity.</p>
          <nav className="reference-links" aria-label="Monitor navigation">
            <a href="/">France–Germany Yield Monitor ↗</a>
            <a href="/ai-data-centers">AI Data Center Bond Monitor ↗</a>
          </nav>
        </div>
        <div className="status-badge">DTCC snapshot · 27 Mar 2026</div>
      </header>

      <section className="snapshot-grid">
        <article className="snapshot-card"><span>DTCC public CDS data</span><strong>Free</strong><div>Quarterly Top 15 notional tables</div><small>Top 1,000 activity report also published</small></article>
        <article className="snapshot-card"><span>Latest corporate snapshot</span><strong>Oracle · $6.01bn</strong><div>Net notional outstanding</div><small>1,872 contracts · week ending 27 Mar 2026</small></article>
        <article className="snapshot-card"><span>Published spread quotes</span><strong>3 issuers</strong><div>CoreWeave · Oracle · SoftBank</div><small>Separate market reporting; not DTCC Top 15 pricing</small></article>
      </section>

      <section>
        <div className="section-heading">
          <p className="eyebrow">Daily transaction tape</p>
          <h2>DTCC public CDS reports</h2>
          <p className="section-note">Loads the latest available SEC cumulative credit report from DTCC and filters transactions to the watchlist entities below. Fields are shown as DTCC reported them; transaction spreads can differ by tenor, contract terms and restructuring clause, so they are not blended into one issuer quote.</p>
        </div>
        <div className="control-panel">
          <div><strong>{dtccLoading ? "Loading DTCC report…" : dtcc ? `${dtcc.reportDate} UTC · ${dtcc.transactionCount} matching rows` : "DTCC report unavailable"}</strong><br /><small>{dtcc?.source ?? "Source: DTCC Public Price Dissemination"}</small></div>
          <button type="button" onClick={() => void loadDtcc()} disabled={dtccLoading}>{dtccLoading ? "Loading…" : "Refresh DTCC data"}</button>
        </div>
        {dtccError && <div className="warning-box">{dtccError} The DTCC dashboard remains available from the source link below.</div>}
        {dtcc && dtcc.transactions.length === 0 && <p className="section-note">No matching watchlist trades were found in this report date. This can mean no publicly disseminated reportable trade for these entities on that date; it does not mean no CDS contracts are outstanding.</p>}
        {dtcc && dtcc.transactions.length > 0 && <div className="table-wrap"><table>
          <thead><tr><th>Disseminated</th><th>Reference entity</th><th>Action / event</th><th>Product</th><th>Reported spread</th><th>Reported notional</th><th>DTCC record</th></tr></thead>
          <tbody>{dtcc.transactions.map((trade, index) => <tr key={`${trade.disseminationId}-${index}`}>
            <td>{trade.timestamp || dtcc.reportDate}</td><td>{trade.entity}<br /><small>{trade.ticker}</small></td>
            <td>{trade.action || "—"}{trade.event ? ` / ${trade.event}` : ""}</td><td>{trade.product || "—"}</td>
            <td>{trade.spread || "—"}{trade.spread ? ` ${trade.spreadCurrency} ${trade.spreadNotation}` : ""}</td>
            <td>{trade.notional || "—"}{trade.currency ? ` ${trade.currency}` : ""}</td>
            <td>{trade.disseminationId || "—"}</td>
          </tr>)}</tbody>
        </table></div>}
      </section>

      <section>
        <div className="section-heading">
          <p className="eyebrow">Reference entity watchlist</p>
          <h2>AI-linked single-name CDS</h2>
          <p className="section-note">The seven-company AI basket is the set identified in FT reporting on CDS activity: Alphabet, Amazon, Broadcom, CoreWeave, Meta, Microsoft and Oracle. SoftBank is included as an AI-financing comparator; NVIDIA is a watchlist addition. The DTCC public Top 15 report measures notional and contracts, not spread prices. A missing Top 15 row does not mean no CDS trading.</p>
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>Reference entity</th><th>AI link</th><th>5Y spread</th><th>5Y PD proxy</th><th>Quote date / source</th><th>DTCC gross notional</th><th>DTCC net notional</th><th>QoQ / YoY net</th><th>Contracts</th></tr></thead>
          <tbody>{entities.map((entity) => <tr key={entity.ticker}>
            <td><strong>{entity.name}</strong><br /><small>{entity.ticker}</small></td>
            <td>{entity.role}</td>
            <td>{entity.spreadBps === null ? "—" : `${number(entity.spreadBps, 1)} bps`}</td>
            <td>{entity.spreadBps === null ? "—" : `${number(fiveYearPd(entity.spreadBps), 1)}%`}</td>
            <td>{entity.spreadDate}<br />{entity.spreadUrl ? <a href={entity.spreadUrl} target="_blank" rel="noreferrer">{entity.spreadSource} ↗</a> : entity.spreadSource}</td>
            <td>{money(entity.grossNotional)}</td><td>{money(entity.netNotional)}</td>
            <td>{entity.qoq === null ? "—" : `${number(entity.qoq)}% / ${number(entity.yoy)}%`}</td>
            <td>{entity.contracts?.toLocaleString() ?? "—"}<br /><small>{entity.dtccStatus}</small></td>
          </tr>)}</tbody>
        </table></div>
      </section>

      <section className="notes-section">
        <div className="section-heading"><p className="eyebrow">Data notes</p><h2>What DTCC provides for free</h2></div>
        <p>DTCC’s free quarterly CDS Top 15 reports provide gross and net notional outstanding, quarter and year changes in net notional, and contract counts. DTCC also publishes a broader six-month Top 1,000 single-name activity report with average weekly trading activity. The separate SEC Public Price Dissemination feed is daily and contains individual transaction and pricing fields; it gives reported trades, not a continuous bid/ask quote or a complete spread curve.</p>
        <p>The spread-based PD is calculated as 1 − exp(−spread × 5 / (1 − recovery)). It is a risk-neutral proxy, not a forecast of physical default. Quoted spreads include liquidity and risk premia.</p>
        <div className="source-list"><strong>Data sources</strong>
          <a href={dtccTop15Url} target="_blank" rel="noreferrer">DTCC CDS Top 15 Report · April 2026 (week ending 27 Mar) ↗</a>
          <a href="https://www.dtcc.com/market-index-data" target="_blank" rel="noreferrer">DTCC Market &amp; Index Data · free Top 1,000 and quarterly reports ↗</a>
          <a href="https://www.dtcc.com/products-and-services/data-services/cds-kinetics-insights" target="_blank" rel="noreferrer">DTCC CDS Kinetics reports and data product details ↗</a>
          <a href="https://pddata.dtcc.com/ppd/secdashboard" target="_blank" rel="noreferrer">DTCC daily SEC credit report dashboard ↗</a>
          <a href="https://kgc0418-tdw-data-0.s3.amazonaws.com/gtr/static/gtr/docs/RT_PPD_quick_ref_guide.pdf" target="_blank" rel="noreferrer">DTCC Public Price Dissemination user guide and field definitions ↗</a>
          <a href={aiBasketUrl} target="_blank" rel="noreferrer">Reprint of FT reporting: AI-company CDS activity and the seven-company basket ↗</a>
          <a href="https://pddata.dtcc.com/ppd/" target="_blank" rel="noreferrer">DTCC Public Price Dissemination Dashboard ↗</a>
        </div>
      </section>
    </main>
  );
}
