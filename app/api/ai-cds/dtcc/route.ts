import { inflateRawSync } from "node:zlib";

export const runtime = "nodejs";
export const revalidate = 3600;

type CsvRow = Record<string, string>;

const watchlist = [
  { name: "CoreWeave, Inc.", ticker: "CRWV", aliases: ["COREWEAVE"] },
  { name: "Oracle Corporation", ticker: "ORCL", aliases: ["ORACLE CORPORATION", "ORACLE CORP"] },
  { name: "SoftBank Group Corp.", ticker: "9984.T", aliases: ["SOFTBANK GROUP", "SOFTBANK GROUP CORP"] },
  { name: "Alphabet Inc.", ticker: "GOOGL", aliases: ["ALPHABET INC", "GOOGLE LLC"] },
  { name: "Amazon.com, Inc.", ticker: "AMZN", aliases: ["AMAZON.COM", "AMAZON.COM INC"] },
  { name: "Broadcom Inc.", ticker: "AVGO", aliases: ["BROADCOM INC"] },
  { name: "Meta Platforms, Inc.", ticker: "META", aliases: ["META PLATFORMS", "FACEBOOK INC"] },
  { name: "Microsoft Corporation", ticker: "MSFT", aliases: ["MICROSOFT CORPORATION", "MICROSOFT CORP"] },
  { name: "NVIDIA Corporation", ticker: "NVDA", aliases: ["NVIDIA CORPORATION", "NVIDIA CORP"] },
];

function parseZipCsv(zip: Buffer): string[][] {
  // Read the first central-directory entry and its local-file payload.
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i -= 1) {
    if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("DTCC archive has no ZIP directory.");
  const entries = zip.readUInt16LE(eocd + 10);
  let cursor = zip.readUInt32LE(eocd + 16);
  if (!entries || zip.readUInt32LE(cursor) !== 0x02014b50) throw new Error("DTCC archive contains no CSV file.");
  const method = zip.readUInt16LE(cursor + 10);
  const compressedSize = zip.readUInt32LE(cursor + 20);
  const fileNameLength = zip.readUInt16LE(cursor + 28);
  const extraLength = zip.readUInt16LE(cursor + 30);
  const commentLength = zip.readUInt16LE(cursor + 32);
  const localOffset = zip.readUInt32LE(cursor + 42);
  const localNameLength = zip.readUInt16LE(localOffset + 26);
  const localExtraLength = zip.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + localNameLength + localExtraLength;
  const compressed = zip.subarray(dataStart, dataStart + compressedSize);
  const csv = method === 8 ? inflateRawSync(compressed).toString("utf8") : method === 0 ? compressed.toString("utf8") : "";
  if (!csv) throw new Error("DTCC archive used an unsupported compression method.");
  void fileNameLength; void extraLength; void commentLength;
  return parseCsv(csv);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

function key(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function pick(row: CsvRow, ...names: string[]) {
  for (const name of names) {
    const value = row[key(name)];
    if (value) return value;
  }
  return "";
}

function dateKey(date: Date) {
  return `${date.getUTCFullYear()}_${String(date.getUTCMonth() + 1).padStart(2, "0")}_${String(date.getUTCDate()).padStart(2, "0")}`;
}

export async function GET() {
  const today = new Date();
  let archive: Buffer | null = null;
  let reportDate = "";
  let lastStatus = 0;
  for (let offset = 0; offset < 8; offset += 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);
    reportDate = dateKey(date);
    const url = `https://pddata.dtcc.com/ppd/api/report/cumulative/sec/SEC_CUMULATIVE_CREDITS_${reportDate}.zip`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      lastStatus = response.status;
      if (response.ok) { archive = Buffer.from(await response.arrayBuffer()); break; }
    } catch { /* Try the prior UTC report date. */ }
  }
  if (!archive) {
    return Response.json({ error: `No DTCC SEC credit archive found in the last seven days (last HTTP status ${lastStatus || "unavailable"}).` }, { status: 502 });
  }

  try {
    const [headers = [], ...records] = parseZipCsv(archive);
    const normalizedHeaders = headers.map((header) => key(header.replace(/^\uFEFF/, "")));
    const decoded = records.map((values) => Object.fromEntries(normalizedHeaders.map((header, i) => [header, values[i] ?? ""])) as CsvRow);
    const transactions = decoded.flatMap((row) => {
      const underlierName = pick(row, "Underlying Asset Name", "New UPI Underlier Name", "Underlier Name-Leg 1");
      const searchable = [underlierName, pick(row, "New UPI FISN"), pick(row, "Product name"), pick(row, "Underlier ID-Leg 1")].join(" ").toUpperCase();
      const entity = watchlist.find((item) => item.aliases.some((alias) => searchable.includes(alias)));
      if (!entity) return [];
      return [{
        entity: entity.name,
        ticker: entity.ticker,
        timestamp: pick(row, "Dissemination Timestamp", "Event timestamp", "Execution Timestamp"),
        action: pick(row, "Action type"),
        event: pick(row, "Event type"),
        product: pick(row, "Product name", "New UPI FISN"),
        spread: pick(row, "Spread-Leg 1"),
        spreadCurrency: pick(row, "Spread currency-Leg 1"),
        spreadNotation: pick(row, "Spread notation-Leg 1"),
        notional: pick(row, "Notional amount-Leg 1"),
        currency: pick(row, "Notional currency-Leg 1"),
        underlying: underlierName,
        disseminationId: pick(row, "Dissemination Identifier"),
        effectiveDate: pick(row, "Effective Date"),
        expirationDate: pick(row, "Expiration Date"),
        maturityDate: pick(row, "Maturity date of the underlier"),
        cleared: pick(row, "Cleared"),
      }];
    });
    transactions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return Response.json({ reportDate: reportDate.replaceAll("_", "-"), source: "DTCC Public Price Dissemination · SEC Cumulative Credits", fetchedAt: new Date().toISOString(), transactionCount: transactions.length, transactions }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not parse DTCC credit report." }, { status: 500 });
  }
}
