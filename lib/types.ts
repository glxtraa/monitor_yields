export type Maturity = 2 | 5 | 10;

export type AnalysisRow = {
  date: string;
  [key: string]: string | number | null;
};

export type SummaryItem = {
  measure: string;
  first: number;
  latest: number;
  change: number;
  unit: string;
};

export type CdsRow = {
  date: string;
  cdsFrance5yBps: number | null;
  cdsGermany5yBps: number | null;
  cdsFranceMinusGermany5yBps: number | null;
  cdsFrance5yPdPct: number | null;
  cdsGermany5yPdPct: number | null;
};

export type ElectionProbabilityRow = {
  date: string;
  lePenWinProbabilityPct: number | null;
  melenchonWinProbabilityPct: number | null;
};

export type AnalysisResponse = {
  meta: {
    year: number;
    startDate: string;
    endDate: string;
    latestDate: string;
    fetchedAt: string;
    observationCount: number;
    recoveryRate: number;
    floorNegativeSpreads: boolean;
  };
  rows: AnalysisRow[];
  summary: SummaryItem[];
  sensitivity: Array<{
    recoveryRate: number;
    pd2y: number;
    pd5y: number;
    pd10y: number;
  }>;
  cds: {
    available: boolean;
    matchedObservationCount: number;
    rows: CdsRow[];
    source: string;
    quoteCurrency: string;
  };
  election: {
    available: boolean;
    matchedObservationCount: number;
    rows: ElectionProbabilityRow[];
    source: string;
    eventUrl: string;
  };
  sources: Array<{ name: string; url: string; status: string }>;
  warnings: string[];
};
