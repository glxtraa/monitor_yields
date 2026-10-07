import { NextResponse } from "next/server";
import { buildAnalysis } from "@/lib/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  return value !== "false" && value !== "0";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const currentYear = new Date().getUTCFullYear();
  const year = Number.parseInt(url.searchParams.get("year") ?? String(currentYear), 10);
  const recoveryPercent = Number.parseFloat(url.searchParams.get("recovery") ?? "40");
  const endDate = url.searchParams.get("endDate") ?? new Date().toISOString().slice(0, 10);
  const floorNegativeSpreads = parseBoolean(
    url.searchParams.get("floorNegative"),
    true,
  );

  if (!Number.isInteger(year) || year < 1990 || year > currentYear + 1) {
    return NextResponse.json({ error: "Year must be a valid recent calendar year." }, { status: 400 });
  }
  if (!Number.isFinite(recoveryPercent) || recoveryPercent < 0 || recoveryPercent >= 100) {
    return NextResponse.json(
      { error: "Recovery must be between 0 and 99.99 percent." },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: "endDate must use YYYY-MM-DD format." }, { status: 400 });
  }

  try {
    const analysis = await buildAnalysis({
      year,
      endDate,
      recoveryRate: recoveryPercent / 100,
      floorNegativeSpreads,
    });
    return NextResponse.json(analysis, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to build the analysis.",
      },
      { status: 502 },
    );
  }
}
