import { useState } from "react";

type VolumeSeries = { key: string; label: string; color: string };
type VolumeRow = { date: string; values: Record<string, number>; counts: Record<string, number> };

type VolumeChartProps = {
  title: string;
  dates: string[];
  rows: VolumeRow[];
  series: VolumeSeries[];
};

export default function VolumeChart({ title, dates, rows, series }: VolumeChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 960;
  const height = 340;
  const padding = { top: 24, right: 24, bottom: 48, left: 76 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(0, ...rows.map((row) => series.reduce((sum, item) => sum + (row.values[item.key] ?? 0), 0)));
  if (maxValue <= 0) return null;
  const scaleMax = Math.ceil(maxValue / 10) * 10 || 10;
  const x = (index: number) => padding.left + ((index + 0.5) / Math.max(rows.length, 1)) * plotWidth;
  const y = (value: number) => padding.top + (1 - value / scaleMax) * plotHeight;
  const ticks = [0, scaleMax / 2, scaleMax];
  const dateIndexes = [...new Set([0, Math.floor((dates.length - 1) / 2), dates.length - 1])];
  const barWidth = Math.min(26, (plotWidth / Math.max(rows.length, 1)) * 0.68);
  const handlePointerMove = (event: React.PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
    const index = Math.round((relativeX / bounds.width) * Math.max(rows.length - 1, 1));
    setActiveIndex(index);
  };
  const activeRow = activeIndex === null ? null : rows[activeIndex];
  const activeX = activeIndex === null ? null : x(activeIndex);
  const tooltipEntries = activeRow ? series.filter((item) => (activeRow.values[item.key] ?? 0) > 0) : [];
  const tooltipWidth = 270;
  const tooltipHeight = 46 + tooltipEntries.length * 18;
  const tooltipX = activeX === null ? 0 : activeX + tooltipWidth + 20 > width - padding.right ? activeX - tooltipWidth - 14 : activeX + 14;
  const tooltipY = padding.top + 8;

  return (
    <section className="chart-card volume-chart" aria-label={title}>
      <div className="chart-heading"><h3>{title}</h3><span className="chart-range">USD millions · daily reports</span></div>
      <p className="chart-description">Stacked disclosed USD notional by reference entity. Hover over a date for each name’s disclosed amount and trade count.</p>
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img">
        <title>{title}</title>
        {ticks.map((tick) => <g key={tick}>
          <line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} className="grid-line" />
          <text x={padding.left - 10} y={y(tick) + 4} textAnchor="end" className="axis-label">${tick.toLocaleString()}m</text>
        </g>)}
        {rows.map((row, rowIndex) => {
          let stacked = 0;
          return series.map((item) => {
            const value = row.values[item.key] ?? 0;
            if (value <= 0) return null;
            const segmentTop = stacked + value;
            const rect = <rect key={`${row.date}-${item.key}`} x={x(rowIndex) - barWidth / 2} y={y(segmentTop)} width={barWidth} height={Math.max(0.5, y(stacked) - y(segmentTop))} fill={item.color}>
              <title>{`${row.date} · ${item.label}: $${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}m disclosed · ${row.counts[item.key] ?? 0} trades`}</title>
            </rect>;
            stacked = segmentTop;
            return rect;
          });
        })}
        <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} fill="transparent" className="chart-hover-target" onPointerMove={handlePointerMove} onPointerLeave={() => setActiveIndex(null)} aria-label={`Hover over ${title} to inspect daily volume`} />
        {activeRow && activeX !== null && <g pointerEvents="none">
          <line x1={activeX} x2={activeX} y1={padding.top} y2={height - padding.bottom} className="hover-line" />
          <g transform={`translate(${tooltipX}, ${tooltipY})`}>
            <rect width={tooltipWidth} height={tooltipHeight} rx="8" className="chart-tooltip-box" />
            <text x="12" y="19" className="chart-tooltip-date">{activeRow.date} · ${series.reduce((sum, item) => sum + (activeRow.values[item.key] ?? 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}m</text>
            {tooltipEntries.map((item, index) => <text key={item.key} x="12" y={39 + index * 18} className="chart-tooltip-value" fill={item.color}>
              {item.label}: ${(activeRow.values[item.key] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}m · {activeRow.counts[item.key] ?? 0} trades
            </text>)}
          </g>
        </g>}
        {dateIndexes.map((index) => <text key={`${dates[index]}-${index}`} x={x(index)} y={height - 14} textAnchor="middle" className="axis-label">{dates[index]}</text>)}
      </svg>
      <div className="chart-legend">{series.map((item) => <span className="legend-item" key={item.key}><i style={{ backgroundColor: item.color }} />{item.label}</span>)}</div>
    </section>
  );
}
