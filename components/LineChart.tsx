"use client";

import { useState } from "react";

type ChartSeries = {
  key: string;
  label: string;
  color: string;
};

type LineChartProps = {
  title: string;
  description?: string;
  dates: string[];
  rows: Array<Record<string, string | number | null>>;
  series: ChartSeries[];
  unit: string;
  decimals?: number;
};

function formatValue(value: number, decimals: number, unit: string) {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })} ${unit}`;
}

export default function LineChart({
  title,
  description,
  dates,
  rows,
  series,
  unit,
  decimals = 2,
}: LineChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 960;
  const height = 300;
  const padding = { top: 24, right: 24, bottom: 42, left: 62 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = series.flatMap((item) =>
    rows
      .map((row) => Number(row[item.key]))
      .filter((value) => Number.isFinite(value)),
  );
  if (values.length === 0) return null;

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const margin = (max - min) * 0.08;
  min -= margin;
  max += margin;

  const x = (index: number) =>
    padding.left + (index / Math.max(rows.length - 1, 1)) * plotWidth;
  const y = (value: number) =>
    padding.top + ((max - value) / (max - min)) * plotHeight;
  const pathFor = (key: string) =>
    rows
      .map((row, index) => {
        const value = Number(row[key]);
        return Number.isFinite(value)
          ? `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(value).toFixed(2)}`
          : "";
      })
      .filter(Boolean)
      .join(" ");

  const tickValues = [max, min + (max - min) / 2, min];
  const dateIndexes = [0, Math.floor((dates.length - 1) / 2), dates.length - 1];
  const tooltipWidth = 214;
  const tooltipHeight = 34 + series.length * 19;
  const activeX = activeIndex === null ? null : x(activeIndex);
  const tooltipX =
    activeX === null
      ? 0
      : Math.min(
          Math.max(activeX + 14, padding.left),
          width - padding.right - tooltipWidth,
        );
  const tooltipY = padding.top + 10;

  const handlePointerMove = (event: React.PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - bounds.left) / bounds.width) * width;
    const relativeX = Math.min(Math.max(svgX - padding.left, 0), plotWidth);
    const index = Math.round(
      (relativeX / plotWidth) * Math.max(rows.length - 1, 1),
    );
    setActiveIndex(index);
  };

  return (
    <section className="chart-card" aria-label={title}>
      <div className="chart-heading">
        <h3>{title}</h3>
        <span className="chart-range">
          {dates[0]} → {dates.at(-1)}
        </span>
      </div>
      {description && <p className="chart-description">{description}</p>}
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img">
        <title>{title}</title>
        {tickValues.map((value, index) => (
          <g key={`tick-${index}`}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(value)}
              y2={y(value)}
              className="grid-line"
            />
            <text x={padding.left - 10} y={y(value) + 4} textAnchor="end" className="axis-label">
              {formatValue(value, decimals, unit)}
            </text>
          </g>
        ))}
        {series.map((item) => (
          <path
            key={item.key}
            d={pathFor(item.key)}
            fill="none"
            stroke={item.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {activeIndex !== null && activeX !== null && (
          <g pointerEvents="none">
            <line
              x1={activeX}
              x2={activeX}
              y1={padding.top}
              y2={height - padding.bottom}
              className="hover-line"
            />
            {series.map((item) => {
              const value = Number(rows[activeIndex]?.[item.key]);
              return Number.isFinite(value) ? (
                <circle
                  key={`active-${item.key}`}
                  cx={activeX}
                  cy={y(value)}
                  r="4.5"
                  fill={item.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              ) : null;
            })}
            <g transform={`translate(${tooltipX}, ${tooltipY})`}>
              <rect
                width={tooltipWidth}
                height={tooltipHeight}
                rx="8"
                className="chart-tooltip-box"
              />
              <text x="12" y="20" className="chart-tooltip-date">
                {dates[activeIndex]}
              </text>
              {series.map((item, index) => {
                const value = Number(rows[activeIndex]?.[item.key]);
                return (
                  <text
                    key={`tooltip-${item.key}`}
                    x="12"
                    y={39 + index * 19}
                    className="chart-tooltip-value"
                  >
                    {item.label}: {Number.isFinite(value) ? formatValue(value, decimals, unit) : "—"}
                  </text>
                );
              })}
            </g>
          </g>
        )}
        {dateIndexes.map((index) => (
          <text key={`date-${index}`} x={x(index)} y={height - 12} textAnchor="middle" className="axis-label">
            {dates[index]}
          </text>
        ))}
        <rect
          x={padding.left}
          y={padding.top}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          className="chart-hover-target"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setActiveIndex(null)}
          aria-label={`Hover over ${title} to inspect individual values`}
        />
      </svg>
      <div className="chart-legend">
        {series.map((item) => {
          const latest = Number(rows.at(-1)?.[item.key]);
          return (
            <span className="legend-item" key={item.key}>
              <i style={{ backgroundColor: item.color }} />
              {item.label}: {formatValue(latest, decimals, unit)}
            </span>
          );
        })}
      </div>
    </section>
  );
}
