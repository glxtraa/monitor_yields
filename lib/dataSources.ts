import type { Maturity } from "./types";

export const MATURITIES: Maturity[] = [2, 5, 10];

export const FRANCE_SERIES: Record<Maturity, string> = {
  2: "FM.D.FR.EUR.FR2.BB.FRMOYTEC2.HSTA",
  5: "FM.D.FR.EUR.FR2.BB.FRMOYTEC5.HSTA",
  10: "FM.D.FR.EUR.FR2.BB.FRMOYTEC10.HSTA",
};

export const GERMANY_SERIES: Record<Maturity, string> = {
  2: "BBSIS.D.I.ZST.ZI.EUR.S1311.B.A604.R02XX.R.A.A._Z._Z.A",
  5: "BBSIS.D.I.ZST.ZI.EUR.S1311.B.A604.R05XX.R.A.A._Z._Z.A",
  10: "BBSIS.D.I.ZST.ZI.EUR.S1311.B.A604.R10XX.R.A.A._Z._Z.A",
};

const BDF_API_URL =
  "https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets/observations/exports/json";
const BDF_CSV_BASE_URL =
  "https://webstat.banque-france.fr/export/csv/fr/catalog/FM";
const BUNDESBANK_API_URL =
  "https://api.statistiken.bundesbank.de/rest/data/BBSIS";

const CDS_SOURCES = {
  France: {
    symbol: "3xFRTR",
    referenceEntity: "French Republic",
    url: "https://www.boursorama.com/cours/cds/3xFRTR/",
  },
  Germany: {
    symbol: "3xDBR",
    referenceEntity: "Federal Republic of Germany",
    url: "https://www.boursorama.com/cours/cds/3xDBR/",
  },
} as const;

export type Observation = { date: string; value: number };

function parseDelimited(text: string, delimiter: "," | ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  return rows;
}

function parseNumber(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value)
    .trim()
    .replace(/\uFEFF/g, "")
    .replace(/\s/g, "")
    .replace(",", ".");
  if (!normalized || normalized === "." || normalized === "NA") return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function selectColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map((header) =>
    header.trim().replace(/^\uFEFF/, "").toLowerCase(),
  );
  const index = normalized.findIndex((header) =>
    candidates.some((candidate) => header === candidate.toLowerCase()),
  );
  return index;
}

function observationsFromCsv(
  text: string,
  delimiter: "," | ";",
  startDate: string,
  endDate: string,
  dateCandidates: string[],
  valueCandidates: string[],
): Observation[] {
  const rows = parseDelimited(text, delimiter);
  if (rows.length < 2) throw new Error("The data source returned no CSV rows.");
  const headers = rows[0];
  const dateIndex = selectColumn(headers, dateCandidates);
  const valueIndex = selectColumn(headers, valueCandidates);
  if (dateIndex < 0 || valueIndex < 0) {
    throw new Error(`CSV columns did not contain the expected date/value fields.`);
  }

  return rows
    .slice(1)
    .map((row) => ({
      date: normalizeDate(row[dateIndex]),
      value: parseNumber(row[valueIndex]),
    }))
    .filter(
      (row): row is { date: string; value: number } =>
        typeof row.date === "string" &&
        row.value !== null &&
        row.date >= startDate &&
        row.date <= endDate,
    )
    .sort((left, right) => left.date.localeCompare(right.date));
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(45_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

export async function downloadFranceSeries(
  maturity: Maturity,
  startDate: string,
  endDate: string,
): Promise<Observation[]> {
  const seriesKey = FRANCE_SERIES[maturity];
  const csvUrl = `${BDF_CSV_BASE_URL}/${encodeURIComponent(seriesKey)}`;

  try {
    const csv = await fetchText(csvUrl, { headers: { Accept: "text/csv" } });
    if (csv.toLowerCase().includes("time_period_start")) {
      return observationsFromCsv(
        csv,
        ";",
        startDate,
        endDate,
        ["time_period_start"],
        ["obs_value"],
      );
    }
  } catch {
    // The authenticated API below provides the documented fallback.
  }

  const apiKey = process.env.WEBSTAT_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Banque de France public CSV was unavailable and WEBSTAT_API_KEY is not configured.",
    );
  }

  const params = new URLSearchParams({
    select: "time_period_start,obs_value",
    refine: `series_key:"${seriesKey}"`,
    where: `time_period_start >= date'${startDate}' AND time_period_start <= date'${endDate}'`,
    order_by: "time_period_start",
    limit: "10000",
  });
  const response = await fetch(
    `${BDF_API_URL}?${params.toString()}`,
    {
      headers: { Accept: "application/json", Authorization: `Apikey ${apiKey}` },
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error(`Banque de France API: ${response.status}`);
  const payload = await response.json();
  const records = Array.isArray(payload)
    ? payload
    : payload.results ?? payload.data ?? [];
  return records
    .map((record: Record<string, unknown>) => ({
      date: normalizeDate(record.time_period_start ?? record.date),
      value: parseNumber(record.obs_value ?? record.value),
    }))
    .filter(
      (row: { date: string | null; value: number | null }): row is Observation =>
        typeof row.date === "string" &&
        row.value !== null &&
        row.date >= startDate &&
        row.date <= endDate,
    )
    .sort((left: Observation, right: Observation) => left.date.localeCompare(right.date));
}

export async function downloadGermanySeries(
  maturity: Maturity,
  startDate: string,
  endDate: string,
): Promise<Observation[]> {
  const seriesKey = GERMANY_SERIES[maturity];
  const keyWithoutFlow = seriesKey.split("BBSIS.", 2).at(-1);
  if (!keyWithoutFlow) throw new Error("Invalid Bundesbank series key.");

  let lastError: unknown;
  for (const format of ["sdmx_csv", "csv"]) {
    try {
      const params = new URLSearchParams({
        startPeriod: startDate,
        endPeriod: endDate,
        format,
        lang: "en",
      });
      const csv = await fetchText(`${BUNDESBANK_API_URL}/${keyWithoutFlow}?${params}`,
        { headers: { Accept: "text/csv" } });
      return observationsFromCsv(
        csv,
        ",",
        startDate,
        endDate,
        ["time_period", "time_period_start", "date"],
        ["obs_value", "value"],
      );
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Bundesbank ${maturity}Y request failed: ${String(lastError)}`);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodeJsSingleQuoted(value: string): string {
  return value
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code: string) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    );
}

function periodTokensToDates(tokens: string[], anchorDate: string): string[] {
  if (tokens.length === 0) return [];
  const anchorYear = Number(anchorDate.slice(0, 4));
  const monthDays = tokens.map((token) => {
    const [day, month] = token.split("/").map(Number);
    return { day, month };
  });
  let year = anchorYear - (monthDays[0].month > monthDays.at(-1)!.month ? 1 : 0);
  let previous = { month: monthDays[0].month, day: monthDays[0].day };
  return monthDays.map(({ month, day }) => {
    if (month < previous.month || (month === previous.month && day < previous.day)) year += 1;
    previous = { month, day };
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
}

export async function downloadBoursoramaCds(
  country: "France" | "Germany",
  startDate: string,
  endDate: string,
): Promise<Observation[]> {
  const metadata = CDS_SOURCES[country];
  const page = await fetchText(metadata.url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const faceplate = page.match(
    new RegExp(
      `data-faceplate-symbol="${metadata.symbol}"[\\s\\S]*?data-ist-init="([^"]+)"`,
    ),
  );
  if (!faceplate) throw new Error(`${country} CDS metadata was not found.`);
  const quoteMetadata = JSON.parse(decodeHtml(faceplate[1])) as { tradeDate: string };

  const chartMatch = page.match(/var chart\s*=\s*JSON\.parse\('([\s\S]*?)'\);/);
  if (!chartMatch) throw new Error(`${country} CDS chart data was not found.`);
  const chart = JSON.parse(decodeJsSingleQuoted(chartMatch[1])) as {
    data?: { amChartData?: Record<string, unknown> };
  };
  const candidates = Object.values(chart.data?.amChartData ?? {});
  const series = candidates.find(
    (candidate): candidate is Array<{ period: string; value: string | number }> =>
      Array.isArray(candidate) &&
      candidate.length > 0 &&
      typeof candidate[0] === "object" &&
      candidate[0] !== null &&
      "period" in candidate[0] &&
      "value" in candidate[0],
  );
  if (!series) throw new Error(`${country} CDS time series was not identified.`);

  const dates = periodTokensToDates(
    series.map((item) => item.period),
    quoteMetadata.tradeDate.slice(0, 10),
  );
  return series
    .map((item, index) => ({ date: dates[index], value: parseNumber(item.value) }))
    .filter(
      (row): row is Observation =>
        Boolean(row.date) && row.value !== null && row.date >= startDate && row.date <= endDate,
    )
    .sort((left, right) => left.date.localeCompare(right.date));
}

export const SOURCE_LINKS = [
  {
    name: "Banque de France CNO-TEC",
    url: "https://webstat.banque-france.fr/fr/catalogue/fm/FM.D.FR.EUR.FR2.BB.FRMOYTEC2.HSTA",
  },
  {
    name: "Deutsche Bundesbank term structure",
    url: "https://www.bundesbank.de/de/statistiken/geld-und-kapitalmaerkte/zinssaetze-und-renditen/taegliche-zinsstruktur-fuer-boersennotierte-bundeswertpapiere-650724",
  },
  {
    name: "Boursorama France CDS",
    url: CDS_SOURCES.France.url,
  },
  {
    name: "Boursorama Germany CDS",
    url: CDS_SOURCES.Germany.url,
  },
];
