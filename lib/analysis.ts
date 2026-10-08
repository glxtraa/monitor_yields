import {
  downloadBoursoramaCds,
  downloadFrenchElectionProbabilities,
  downloadFranceSeries,
  downloadGermanySeries,
  MATURITIES,
  SOURCE_LINKS,
  type Observation,
} from "./dataSources";
import type { AnalysisResponse, AnalysisRow, Maturity, SummaryItem } from "./types";

export type AnalysisOptions = {
  year: number;
  endDate: string;
  recoveryRate: number;
  floorNegativeSpreads: boolean;
};

function observationMap(observations: Observation[]): Map<string, number> {
  return new Map(observations.map((observation) => [observation.date, observation.value]));
}

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summaryItem(
  measure: string,
  values: number[],
  unit: string,
): SummaryItem {
  const first = values[0];
  const latest = values.at(-1)!;
  return {
    measure,
    first: round(first),
    latest: round(latest),
    change: round(latest - first),
    unit,
  };
}

export async function buildAnalysis(options: AnalysisOptions): Promise<AnalysisResponse> {
  const startDate = `${options.year}-01-01`;
  const sourceJobs = MATURITIES.flatMap((maturity) => [
    downloadFranceSeries(maturity, startDate, options.endDate).then((observations) => ({
      country: "France" as const,
      maturity,
      observations,
    })),
    downloadGermanySeries(maturity, startDate, options.endDate).then((observations) => ({
      country: "Germany" as const,
      maturity,
      observations,
    })),
  ]);
  const sourceResults = await Promise.all(sourceJobs);
  const maps = new Map<string, Map<string, number>>();
  for (const result of sourceResults) {
    maps.set(`${result.country}-${result.maturity}`, observationMap(result.observations));
  }

  const allDates = new Set<string>();
  for (const result of sourceResults) {
    for (const date of result.observations.map((observation) => observation.date)) {
      allDates.add(date);
    }
  }

  const dates = [...allDates].sort();
  const rows: AnalysisRow[] = [];
  const lgd = 1 - options.recoveryRate;
  if (lgd <= 0) throw new Error("Recovery rate must be below 100%.");

  for (const date of dates) {
    const row: AnalysisRow = { date };
    let complete = true;
    for (const maturity of MATURITIES) {
      const france = maps.get(`France-${maturity}`)?.get(date);
      const germany = maps.get(`Germany-${maturity}`)?.get(date);
      if (france === undefined || germany === undefined) {
        complete = false;
        break;
      }
      const spreadBps = (france - germany) * 100;
      const spreadDecimal = options.floorNegativeSpreads
        ? Math.max(spreadBps / 10_000, 0)
        : spreadBps / 10_000;
      const survivalPct = Math.exp((-spreadDecimal * maturity) / lgd) * 100;

      row[`france${maturity}yYieldPct`] = round(france);
      row[`germany${maturity}yYieldPct`] = round(germany);
      row[`spread${maturity}yBps`] = round(spreadBps);
      row[`hazard${maturity}yPctPa`] = round((spreadDecimal / lgd) * 100);
      row[`survival${maturity}yPct`] = round(survivalPct);
      row[`cumulativePd${maturity}yPct`] = round(100 - survivalPct);
    }
    if (!complete) continue;

    const survival2 = Number(row.survival2yPct) / 100;
    const survival5 = Number(row.survival5yPct) / 100;
    const survival10 = Number(row.survival10yPct) / 100;
    row.pd2to5yConditionalPct = round((1 - survival5 / survival2) * 100);
    row.pd2to5yUnconditionalPct = round((survival2 - survival5) * 100);
    row.pd5to10yConditionalPct = round((1 - survival10 / survival5) * 100);
    row.pd5to10yUnconditionalPct = round((survival5 - survival10) * 100);
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error("No matched France/Germany observations were returned.");
  }

  const summary: SummaryItem[] = [];
  for (const maturity of MATURITIES) {
    summary.push(
      summaryItem(
        `France ${maturity}Y yield`,
        rows.map((row) => Number(row[`france${maturity}yYieldPct`])),
        "%",
      ),
      summaryItem(
        `Germany ${maturity}Y yield`,
        rows.map((row) => Number(row[`germany${maturity}yYieldPct`])),
        "%",
      ),
      summaryItem(
        `OAT–Bund ${maturity}Y spread`,
        rows.map((row) => Number(row[`spread${maturity}yBps`])),
        "bps",
      ),
      summaryItem(
        `${maturity}Y cumulative PD`,
        rows.map((row) => Number(row[`cumulativePd${maturity}yPct`])),
        "%",
      ),
    );
  }
  summary.push(
    summaryItem(
      "2–5Y conditional PD",
      rows.map((row) => Number(row.pd2to5yConditionalPct)),
      "%",
    ),
    summaryItem(
      "2–5Y unconditional contribution",
      rows.map((row) => Number(row.pd2to5yUnconditionalPct)),
      "%",
    ),
    summaryItem(
      "5–10Y conditional PD",
      rows.map((row) => Number(row.pd5to10yConditionalPct)),
      "%",
    ),
    summaryItem(
      "5–10Y unconditional contribution",
      rows.map((row) => Number(row.pd5to10yUnconditionalPct)),
      "%",
    ),
  );

  const latest = rows.at(-1)!;
  const sensitivity = [0, 0.4, 0.6].map((recoveryRate) => {
    const sensitivityLgd = 1 - recoveryRate;
    return {
      recoveryRate,
      pd2y: round(
        (1 -
          Math.exp(
            -Math.max(Number(latest.spread2yBps) / 10_000, 0) * 2 / sensitivityLgd,
          )) *
          100,
        4,
      ),
      pd5y: round(
        (1 -
          Math.exp(
            -Math.max(Number(latest.spread5yBps) / 10_000, 0) * 5 / sensitivityLgd,
          )) *
          100,
        4,
      ),
      pd10y: round(
        (1 -
          Math.exp(
            -Math.max(Number(latest.spread10yBps) / 10_000, 0) * 10 / sensitivityLgd,
          )) *
          100,
        4,
      ),
    };
  });

  const warnings: string[] = [];
  let cdsRows: AnalysisResponse["cds"]["rows"] = [];
  try {
    const [franceCds, germanyCds] = await Promise.all([
      downloadBoursoramaCds("France", startDate, options.endDate),
      downloadBoursoramaCds("Germany", startDate, options.endDate),
    ]);
    const franceMap = observationMap(franceCds);
    const germanyMap = observationMap(germanyCds);
    cdsRows = rows
      .map((row) => {
        const france = franceMap.get(row.date);
        const germany = germanyMap.get(row.date);
        if (france === undefined || germany === undefined) return null;
        const francePd =
          (1 - Math.exp(-Math.max(france / 10_000, 0) * 5 / lgd)) * 100;
        const germanyPd =
          (1 - Math.exp(-Math.max(germany / 10_000, 0) * 5 / lgd)) * 100;
        return {
          date: row.date,
          cdsFrance5yBps: round(france),
          cdsGermany5yBps: round(germany),
          cdsFranceMinusGermany5yBps: round(france - germany),
          cdsFrance5yPdPct: round(francePd),
          cdsGermany5yPdPct: round(germanyPd),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  } catch (error) {
    warnings.push(
      `CDS data is unavailable for this request: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let electionRows: AnalysisResponse["election"]["rows"] = [];
  try {
    electionRows = await downloadFrenchElectionProbabilities(startDate, options.endDate);
    if (electionRows.length === 0) {
      warnings.push("French election probability data returned no observations for the selected window.");
    }
  } catch (error) {
    warnings.push(
      `French election probability data is unavailable for this request: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return {
    meta: {
      year: options.year,
      startDate,
      endDate: options.endDate,
      latestDate: rows.at(-1)!.date,
      fetchedAt: new Date().toISOString(),
      observationCount: rows.length,
      recoveryRate: options.recoveryRate,
      floorNegativeSpreads: options.floorNegativeSpreads,
    },
    rows,
    summary,
    sensitivity,
    cds: {
      available: cdsRows.length > 0,
      matchedObservationCount: cdsRows.length,
      rows: cdsRows,
      source: "Boursorama public 5Y sovereign CDS pages",
      quoteCurrency: "Not stated on Boursorama page",
    },
    election: {
      available: electionRows.length > 0,
      matchedObservationCount: electionRows.length,
      rows: electionRows,
      source: "Polymarket winner-contract prices",
      eventUrl: "https://polymarket.com/event/next-french-presidential-election",
    },
    sources: SOURCE_LINKS.map((source) => ({ ...source, status: "Referenced" })),
    warnings,
  };
}
