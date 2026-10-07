"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LineChart from "@/components/LineChart";
import type { AnalysisResponse } from "@/lib/types";

const COLORS = {
  france: "#d85b4a",
  germany: "#2f6f9f",
  spread2: "#d97706",
  spread5: "#7c3aed",
  spread10: "#0f766e",
  pd2: "#d85b4a",
  pd5: "#d97706",
  pd10: "#7c3aed",
  cdsFrance: "#b42318",
  cdsGermany: "#175cd3",
  cdsDifference: "#7f56d9",
};

const NOTEBOOK_URL =
  "https://github.com/glxtraa/monitor_yields/blob/main/source/france_germany_spread_default_probability_timeseries.ipynb";
const HANDOFF_URL =
  "https://github.com/glxtraa/monitor_yields/blob/main/source/HANDOFF.md";

function number(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export default function Home() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [recovery, setRecovery] = useState(40);
  const [floorNegative, setFloorNegative] = useState(true);
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      year: String(year),
      recovery: String(recovery),
      floorNegative: String(floorNegative),
    });
    try {
      const response = await fetch(`/api/analysis?${params.toString()}`);
      const payload = (await response.json()) as AnalysisResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The analysis could not be loaded.");
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The analysis could not be loaded.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [floorNegative, recovery, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const dates = useMemo(() => data?.rows.map((row) => row.date) ?? [], [data]);
  const rows = data?.rows ?? [];

  return (
    <main className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Market-implied sovereign risk</p>
          <h1>France–Germany Yield Monitor</h1>
          <p className="lede">
            Compare French OAT and German Bund yields, spreads, and simplified
            spread-implied default probabilities using matched daily observations.
          </p>
          <p className="reference-links">
            <a href={NOTEBOOK_URL} target="_blank" rel="noreferrer">Open the underlying notebook and math ↗</a>
            <a href={HANDOFF_URL} target="_blank" rel="noreferrer">Read the research handoff ↗</a>
          </p>
        </div>
        <div className="status-badge">{loading ? "Updating…" : data ? "Live data" : "Waiting"}</div>
      </header>

      <section className="control-panel" aria-label="Analysis controls">
        <label>
          Start year
          <input type="number" min="1990" max={currentYear + 1} value={year} onChange={(event) => setYear(Number(event.target.value))} />
        </label>
        <label>
          Recovery rate
          <input type="number" min="0" max="99" step="1" value={recovery} onChange={(event) => setRecovery(Number(event.target.value))} />
          <span className="input-suffix">%</span>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={floorNegative} onChange={(event) => setFloorNegative(event.target.checked)} />
          Floor negative spreads for PD calculations
        </label>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {loading ? "Loading…" : "Refresh analysis"}
        </button>
      </section>

      {error && <div className="error-box">{error}</div>}

      {data && (
        <>
          <section className="meta-strip">
            <div><span>Matched dates</span><strong>{data.meta.observationCount.toLocaleString()}</strong></div>
            <div><span>Window</span><strong>{data.meta.startDate} → {data.meta.latestDate}</strong></div>
            <div><span>Recovery / LGD</span><strong>{number(data.meta.recoveryRate * 100, 0)}% / {number((1 - data.meta.recoveryRate) * 100, 0)}%</strong></div>
            <div><span>Last fetch</span><strong>{new Date(data.meta.fetchedAt).toLocaleString()}</strong></div>
          </section>

          {data.warnings.map((warning) => <div className="warning-box" key={warning}>{warning}</div>)}

          <section>
            <div className="section-heading"><p className="eyebrow">Latest matched observation</p><h2>Market snapshot</h2></div>
            <div className="snapshot-grid">
              {([2, 5, 10] as const).map((maturity) => {
                const row = rows.at(-1)!;
                return (
                  <article className="snapshot-card" key={maturity}>
                    <span>{maturity}Y tenor</span>
                    <strong>{number(Number(row[`spread${maturity}yBps`]), 1)} bps</strong>
                    <div>France {number(Number(row[`france${maturity}yYieldPct`]), 3)}%</div>
                    <div>Germany {number(Number(row[`germany${maturity}yYieldPct`]), 3)}%</div>
                    <small>PD proxy {number(Number(row[`cumulativePd${maturity}yPct`]), 2)}%</small>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="chart-grid">
            <LineChart
              title="Daily yields"
              description="Yield is the annualized market return demanded for holding government debt. Compare France and Germany at the same maturity; the lines are percentages, not basis points."
              dates={dates}
              rows={rows}
              unit="%"
              decimals={3}
              series={([2, 5, 10] as const).flatMap((maturity) => [
                { key: `france${maturity}yYieldPct`, label: `France ${maturity}Y`, color: COLORS.france },
                { key: `germany${maturity}yYieldPct`, label: `Germany ${maturity}Y`, color: COLORS.germany },
              ])}
            />
            <LineChart
              title="OAT–Bund spreads"
              description="Spread = French yield minus German yield. A positive number means France yields more than Germany; 100 basis points equals one percentage point."
              dates={dates}
              rows={rows}
              unit="bps"
              decimals={1}
              series={[
                { key: "spread2yBps", label: "2Y spread", color: COLORS.spread2 },
                { key: "spread5yBps", label: "5Y spread", color: COLORS.spread5 },
                { key: "spread10yBps", label: "10Y spread", color: COLORS.spread10 },
              ]}
            />
            <LineChart
              title={`Cumulative spread-implied PD (${number(recovery, 0)}% recovery)`}
              description="Model-implied probability of at least one default by each horizon, calculated from the spread with a flat hazard rate and the selected recovery assumption."
              dates={dates}
              rows={rows}
              unit="%"
              decimals={2}
              series={[
                { key: "cumulativePd2yPct", label: "2Y PD", color: COLORS.pd2 },
                { key: "cumulativePd5yPct", label: "5Y PD", color: COLORS.pd5 },
                { key: "cumulativePd10yPct", label: "10Y PD", color: COLORS.pd10 },
              ]}
            />
            <LineChart
              title="Interval PDs"
              description="Conditional PD is the chance of default during an interval given survival to its start. Unconditional contribution is that interval’s contribution to total PD from today."
              dates={dates}
              rows={rows}
              unit="%"
              decimals={2}
              series={[
                { key: "pd2to5yConditionalPct", label: "2–5Y conditional", color: COLORS.spread2 },
                { key: "pd5to10yConditionalPct", label: "5–10Y conditional", color: COLORS.spread10 },
                { key: "pd2to5yUnconditionalPct", label: "2–5Y unconditional", color: COLORS.pd5 },
                { key: "pd5to10yUnconditionalPct", label: "5–10Y unconditional", color: COLORS.pd10 },
              ]}
            />
          </section>

          <section>
            <div className="section-heading"><p className="eyebrow">Model sensitivity</p><h2>Recovery-rate sensitivity at the latest date</h2><p className="section-note">Lower assumed recovery means a larger loss-given-default, so the same observed spread produces a higher model-implied PD. This table shows how much the latest estimate depends on that assumption.</p></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Recovery</th><th>2Y cumulative PD</th><th>5Y cumulative PD</th><th>10Y cumulative PD</th></tr></thead>
                <tbody>{data.sensitivity.map((item) => <tr key={item.recoveryRate}><td>{number(item.recoveryRate * 100, 0)}%</td><td>{number(item.pd2y, 2)}%</td><td>{number(item.pd5y, 2)}%</td><td>{number(item.pd10y, 2)}%</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          {data.cds.available && (
            <section>
              <div className="section-heading"><p className="eyebrow">Separate credit market measure</p><h2>5Y sovereign CDS</h2><p className="section-note">{data.cds.source}; quote currency: {data.cds.quoteCurrency}. CDS is not interchangeable with the OAT–Bund spread proxy.</p></div>
              <LineChart
                title="Public 5Y CDS observations"
                description="A CDS spread is the annual premium for protection against a defined sovereign credit event. Higher bps means more expensive protection; these public quotes are separate from the bond-spread proxy."
                dates={data.cds.rows.map((row) => row.date)}
                rows={data.cds.rows.map((row) => ({
                  date: row.date,
                  cdsFrance5yBps: row.cdsFrance5yBps,
                  cdsGermany5yBps: row.cdsGermany5yBps,
                  cdsFranceMinusGermany5yBps: row.cdsFranceMinusGermany5yBps,
                }))}
                unit="bps"
                decimals={1}
                series={[
                  { key: "cdsFrance5yBps", label: "France 5Y CDS", color: COLORS.cdsFrance },
                  { key: "cdsGermany5yBps", label: "Germany 5Y CDS", color: COLORS.cdsGermany },
                  { key: "cdsFranceMinusGermany5yBps", label: "CDS difference", color: COLORS.cdsDifference },
                ]}
              />
            </section>
          )}

          <section className="notes-section">
            <div className="section-heading"><p className="eyebrow">Interpretation</p><h2>Read the estimates carefully</h2></div>
            <p>The OAT–Bund spread is a market-implied credit-risk proxy, not a literal forecast of France&apos;s physical default probability. Liquidity, inflation, fiscal expectations, politics, Germany&apos;s safe-haven status, and other premia are embedded in the spread.</p>
            <p>The PD curves use a flat-hazard approximation: hazard = spread / LGD and cumulative PD = 1 − exp(−spread × tenor / LGD). They are intended for relative monitoring, not as standalone actuarial estimates.</p>
            <div className="source-list"><strong>Sources</strong>{data.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.name}</a>)}</div>
          </section>
        </>
      )}
    </main>
  );
}
