# Handoff memory: France–Germany sovereign-risk Colab

## Objective

The user is building a Google Colab notebook that compares French OAT yields with German Bund yields at 2, 5 and 10 years, calculates France–Germany spreads and simple spread-implied default probabilities, and visualizes all time series with Plotly.

The user later requested a public CDS comparison, including notes on USD versus EUR, the referenced bond universe, and CDS limitations such as a Frexit or euro-redenomination scenario.

## Main deliverable

The current deliverable is:

`outputs/france_germany_spread_default_probability_timeseries.ipynb`

The older file is:

`outputs/france_germany_spread_default_probability.ipynb`

The timeseries notebook is the one that should be continued. The CDS work was added to the timeseries notebook only.

## What the notebook does

1. Downloads daily French constant-maturity yields for 2Y, 5Y and 10Y from Banque de France public CSV exports.
2. Downloads German daily Svensson term-structure yields for 2Y, 5Y and 10Y from the Deutsche Bundesbank SDMX endpoint.
3. Keeps observations from `YEAR-01-01` through the run date and uses matched dates.
4. Calculates OAT–Bund yield spreads in basis points.
5. Calculates a simple flat-hazard, spread-implied PD:

   - `LGD = 1 - recovery_rate`
   - `hazard = spread / LGD`
   - `survival(T) = exp(-spread * T / LGD)`
   - `cumulative PD(0,T) = 1 - survival(T)`
   - conditional and unconditional PDs for 2–5Y and 5–10Y intervals

6. Creates Plotly charts for yields, bond spreads, cumulative PDs and interval PDs.
7. Adds a CDS section with Plotly comparisons between bond-spread measures and CDS measures.

## Bond data source fixes already made

The notebook was revised after earlier failures:

- Banque de France Webstat JSON calls can return 404 when no API key is supplied. The notebook now tries the public CSV export first and only uses the authenticated Webstat API as a fallback.
- The Banque de France CSV uses semicolon-separated data and may contain a UTF-8 BOM; the parser strips the BOM and converts decimal commas.
- Bundesbank requests use the SDMX `sdmx_csv` format first, with `csv` as a fallback.
- The Bundesbank flow prefix is separated correctly before constructing the endpoint. The series key should not be prefixed twice with `BBSIS`.
- Bundesbank CSV output contains `TIME_PERIOD` and `OBS_VALUE`; missing observations are represented by `.` and are dropped after numeric conversion.

## CDS implementation

### Source used by the notebook

The notebook uses the public Boursorama quote pages because they returned HTTP 200 during testing and embed daily chart data directly in the HTML:

- France: `https://www.boursorama.com/cours/cds/3xFRTR/`
- Germany: `https://www.boursorama.com/cours/cds/3xDBR/`

The code extracts:

- the quote faceplate for the intended instrument;
- the embedded chart JSON;
- day/month chart labels, reconstructing years across the year boundary;
- daily 5Y CDS values in basis points.

The code records the quote currency as `Not stated on Boursorama page` rather than guessing.

### USD-labelled comparison source

Investing.com exposes comparable instruments explicitly labelled USD:

- France: `FRGV5YUSAC=R`
- Germany: `DEGV5YUSAC=R`

The URLs are documented in the notebook, but the notebook does not silently combine the USD-labelled Investing series with the Boursorama series. Investing was not used as the primary downloader because direct requests were blocked during testing and its displayed values are indicative/delayed and subject to source-use restrictions.

### CDS calculations

For each country, the notebook calculates a simple 5Y CDS-implied PD using the same recovery assumption as the bond model:

`PD_5Y = 1 - exp(-CDS_spread * 5 / LGD)`

It also calculates the France-minus-Germany 5Y CDS spread difference.

The notebook explicitly distinguishes:

- France 5Y CDS PD: an absolute France credit-risk measure;
- Germany 5Y CDS PD: an absolute Germany credit-risk measure;
- OAT–Bund 5Y PD proxy: a relative France-versus-Germany bond-spread measure.

These are not interchangeable and should not be added together.

## Contract interpretation included in the notebook

The appended explanatory section says:

- A CDS is normally quoted as an annual spread in basis points, not as a bond price.
- A USD-labelled quote means the CDS premium and settlement cashflows are denominated in USD; it does not mean the French reference bonds are USD bonds.
- USD and EUR CDS versions can differ because of funding, collateral and FX-basis effects.
- A single-name sovereign CDS references the sovereign entity, not a fixed average basket of the OAT 2Y/5Y/10Y bonds.
- The contract has a reference obligation and eligibility rules for deliverable obligations. Exact ISINs and the full deliverable set are not disclosed by the public quote pages.
- The actual settlement may be cash-settled by auction or otherwise governed by the contract; it is not necessarily physical delivery of one selected OAT.
- A Frexit, government collapse, rating downgrade, bond-price fall or spread widening is not automatically a CDS credit event.
- A euro exit could become relevant if it causes a qualifying failure to pay, restructuring, repudiation/moratorium, or impermissible currency redenomination, but the outcome depends on the exact confirmation, governing law, ISDA definitions and Determinations Committee process.
- The 2014 ISDA definitions addressed currency-redenomination issues and sovereign asset-package delivery.
- The notebook is analytical research code, not a legal opinion on whether a future Frexit would trigger a particular CDS contract.

## Testing performed

The following checks were performed after the CDS section was added:

1. `jq empty outputs/france_germany_spread_default_probability_timeseries.ipynb` succeeded.
2. The notebook contains 31 cells after the CDS additions.
3. Every code cell compiled successfully with Python's `compile` function.
4. The live Boursorama France and Germany pages returned successfully and the CDS parser ran.
5. With `YEAR = 2026`, the CDS test returned 154 matched dates from 1 January through 1 October 2026.
6. The final chart observations in that test were:

   - France CDS: 76.2 bps
   - Germany CDS: 10.8 bps
   - France-minus-Germany CDS difference: 65.4 bps
   - France 5Y CDS-implied PD at 40% recovery: approximately 6.15%
   - Germany 5Y CDS-implied PD at 40% recovery: approximately 0.90%

7. The Banque de France public CSV endpoints for 2Y, 5Y and 10Y returned HTTP 200 during testing.
8. The corrected Bundesbank `sdmx_csv` endpoints for 2Y, 5Y and 10Y returned HTTP 200 during testing.

The full notebook was not executed in the local host because the host environment did not have `nbclient`, `nbformat` or Plotly installed. The new CDS cell itself was executed against the live pages with a synthetic matched bond index, and all new code compiled. A coding agent taking over should run the complete notebook in Google Colab from top to bottom.

## Recommended next steps for the next coding agent

1. Open `outputs/france_germany_spread_default_probability_timeseries.ipynb` in Colab.
2. Run every cell from top to bottom with a clean runtime.
3. Confirm that the current public pages still expose the embedded Boursorama chart JSON.
4. Confirm that the latest date is not silently stale; the chart history can lag the quote faceplate by a day.
5. If the user needs a production-grade CDS series, replace the public HTML scraper with a licensed provider or an explicitly reusable dataset. Do not claim that the public Boursorama/Investing quotes are executable dealer bid/offer prices.
6. If adding a EUR CDS series, keep it as a separate source/series and do not merge it with the USD-labelled Investing series without documenting the currency and contract basis.
7. Preserve the distinction between bond-spread PD proxies and absolute CDS-implied PDs.

## Useful source links

- Banque de France 2Y series: `https://webstat.banque-france.fr/fr/catalogue/fm/FM.D.FR.EUR.FR2.BB.FRMOYTEC2.HSTA`
- Banque de France 5Y series: `https://webstat.banque-france.fr/fr/catalogue/fm/FM.D.FR.EUR.FR2.BB.FRMOYTEC5.HSTA`
- Banque de France 10Y series: `https://webstat.banque-france.fr/fr/catalogue/fm/FM.D.FR.EUR.FR2.BB.FRMOYTEC10.HSTA`
- Deutsche Bundesbank daily term structure: `https://www.bundesbank.de/de/statistiken/geld-und-kapitalmaerkte/zinssaetze-und-renditen/taegliche-zinsstruktur-fuer-boersennotierte-bundeswertpapiere-650724`
- Boursorama France CDS: `https://www.boursorama.com/cours/cds/3xFRTR/`
- Boursorama Germany CDS: `https://www.boursorama.com/cours/cds/3xDBR/`
- Investing France 5Y USD CDS: `https://fr.investing.com/rates-bonds/france-cds-5-years-usd-historical-data`
- Investing Germany 5Y USD CDS: `https://www.investing.com/rates-bonds/germany-cds-5-year-usd-historical-data`
- ISDA 2014 Credit Derivatives Definitions announcement: `https://www.isda.org/2014/02/21/isda-publishes-isda-2014-credit-derivatives-definitions/`
- ISDA sovereign CDS Q&A: `https://www.isda.org/2011/07/27/cds-on-us-sovereign-debt-qa/?subcategories=0`
