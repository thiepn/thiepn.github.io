import React, { useState } from 'react';
import { AggregationResult, DashboardWidget, AggregatedDataPoint } from '../dashboardTypes';
import { Table, BarChart2 } from 'lucide-react';

interface ChartWidgetViewProps {
  widget: DashboardWidget;
  result: AggregationResult;
  onDrillDown: (title: string, subtitle?: string, itemIds?: string[]) => void;
}

export const ChartWidgetView: React.FC<ChartWidgetViewProps> = ({
  widget,
  result,
  onDrillDown,
}) => {
  const [showDataTable, setShowDataTable] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<AggregatedDataPoint | null>(null);

  const vis = widget.visualization;
  const chartType = vis.chartType || 'bar';
  const data = result.series || [];

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-stone-400 dark:text-stone-500 text-xs">
        <BarChart2 className="w-8 h-8 mb-2 opacity-40 stroke-1" />
        No data available for this chart configuration
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const totalValue = data.reduce((sum, d) => sum + d.value, 0);

  const getBarColor = (index: number) => {
    const palette = vis.colorPalette || 'amber';
    const shades = {
      amber: ['#f59e0b', '#d97706', '#b45309', '#78350f', '#fcd34d'],
      indigo: ['#6366f1', '#4f46e5', '#4338ca', '#312e81', '#a5b4fc'],
      emerald: ['#10b981', '#059669', '#047857', '#064e3b', '#6ee7b7'],
      rose: ['#f43f5e', '#e11d48', '#be123c', '#881337', '#fda4af'],
      teal: ['#14b8a6', '#0d9488', '#0f766e', '#134e4a', '#5eead4'],
      purple: ['#a855f7', '#9333ea', '#7e22ce', '#581c87', '#d8b4fe'],
      neutral: ['#78716c', '#57534e', '#44403c', '#292524', '#a8a29e'],
    };
    const list = shades[palette] || shades.amber;
    return list[index % list.length];
  };

  const handleSegmentClick = (point: AggregatedDataPoint) => {
    onDrillDown(
      `${widget.title} — ${point.label}`,
      `${point.formattedValue} (${point.percentage || 0}%)`,
      point.sourceItemIds
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header controls: Accessible Data Table toggle */}
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setShowDataTable(!showDataTable)}
          className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
          title="Toggle Accessible Data Table"
          aria-label={showDataTable ? 'Show Visual Chart' : 'Show Data Table'}
        >
          {showDataTable ? <BarChart2 className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
          <span>{showDataTable ? 'View Chart' : 'Data Table'}</span>
        </button>
      </div>

      {/* 1. Accessible Data Table Alternative */}
      {showDataTable ? (
        <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800 max-h-56">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300">
              <tr>
                <th className="p-2 font-medium">Category / Bucket</th>
                <th className="p-2 font-medium text-right">Value</th>
                <th className="p-2 font-medium text-right">Share</th>
                <th className="p-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {data.map((dp, idx) => (
                <tr key={dp.key || idx} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                  <td className="p-2 font-medium text-stone-900 dark:text-stone-100">{dp.label}</td>
                  <td className="p-2 text-right text-stone-700 dark:text-stone-300">{dp.formattedValue}</td>
                  <td className="p-2 text-right text-stone-500 dark:text-stone-400">{dp.percentage || 0}%</td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => handleSegmentClick(dp)}
                      className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                    >
                      Inspect ({dp.sourceItemIds?.length || 0})
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* 2. Graphical Visualizations */
        <div className="relative flex-1 min-h-[160px]">
          {/* Tooltip Overlay */}
          {hoveredPoint && (
            <div className="absolute top-0 right-0 bg-stone-900/90 text-white text-xs px-2.5 py-1.5 rounded shadow-lg pointer-events-none z-10 flex items-center gap-2">
              <span className="font-semibold">{hoveredPoint.label}:</span>
              <span>{hoveredPoint.formattedValue}</span>
              {hoveredPoint.percentage !== undefined && (
                <span className="text-stone-300">({hoveredPoint.percentage}%)</span>
              )}
            </div>
          )}

          {/* Bar Chart (Vertical) */}
          {chartType === 'bar' && (
            <div className="flex items-end gap-2 h-44 pt-6 pb-6 px-2">
              {data.map((dp, idx) => {
                const heightPercent = Math.max((dp.value / maxValue) * 100, 4);
                return (
                  <div
                    key={dp.key || idx}
                    className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                    onClick={() => handleSegmentClick(dp)}
                    onMouseEnter={() => setHoveredPoint(dp)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <div
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: getBarColor(idx),
                      }}
                      className="w-full max-w-[48px] rounded-t transition-all duration-200 group-hover:opacity-85 group-hover:scale-y-[1.02] origin-bottom shadow-xs"
                    />
                    <span
                      className="text-[10px] text-stone-500 dark:text-stone-400 truncate w-full text-center mt-1.5"
                      title={dp.label}
                    >
                      {dp.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Horizontal Bar Chart */}
          {chartType === 'horizontal_bar' && (
            <div className="flex flex-col gap-2 py-2">
              {data.map((dp, idx) => {
                const widthPercent = Math.max((dp.value / maxValue) * 100, 3);
                return (
                  <div
                    key={dp.key || idx}
                    className="flex items-center gap-2 group cursor-pointer"
                    onClick={() => handleSegmentClick(dp)}
                    onMouseEnter={() => setHoveredPoint(dp)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <span className="text-xs text-stone-600 dark:text-stone-300 w-28 truncate text-right font-medium">
                      {dp.label}
                    </span>
                    <div className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-full h-4 overflow-hidden p-0.5">
                      <div
                        style={{
                          width: `${widthPercent}%`,
                          backgroundColor: getBarColor(idx),
                        }}
                        className="h-full rounded-full transition-all duration-200 group-hover:opacity-85"
                      />
                    </div>
                    <span className="text-xs text-stone-500 dark:text-stone-400 w-12 text-right">
                      {dp.formattedValue}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Line & Area Chart */}
          {(chartType === 'line' || chartType === 'area') && (
            <div className="h-44 pt-4 pb-6 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                {/* Horizontal grid lines */}
                <line x1="0" y1="20" x2="400" y2="20" stroke="currentColor" strokeDasharray="3 3" className="text-stone-200 dark:text-stone-800" />
                <line x1="0" y1="60" x2="400" y2="60" stroke="currentColor" strokeDasharray="3 3" className="text-stone-200 dark:text-stone-800" />
                <line x1="0" y1="100" x2="400" y2="100" stroke="currentColor" strokeDasharray="3 3" className="text-stone-200 dark:text-stone-800" />

                {/* Calculate SVG Coordinates */}
                {(() => {
                  const pts = data.map((dp, idx) => {
                    const x = data.length === 1 ? 200 : (idx / (data.length - 1)) * 380 + 10;
                    const y = 110 - (dp.value / maxValue) * 95;
                    return { x, y, dp };
                  });

                  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaD = `${pathD} L ${pts[pts.length - 1].x} 115 L ${pts[0].x} 115 Z`;
                  const color = getBarColor(0);

                  return (
                    <>
                      {chartType === 'area' && (
                        <path d={areaD} fill={color} fillOpacity="0.15" />
                      )}
                      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                      {pts.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          fill={color}
                          className="cursor-pointer hover:r-6 transition-all"
                          onClick={() => handleSegmentClick(p.dp)}
                          onMouseEnter={() => setHoveredPoint(p.dp)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      ))}
                    </>
                  );
                })()}
              </svg>

              {/* X Axis Labels */}
              <div className="flex justify-between mt-2 text-[10px] text-stone-400">
                <span>{data[0]?.label}</span>
                {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.label}</span>}
                <span>{data[data.length - 1]?.label}</span>
              </div>
            </div>
          )}

          {/* Donut & Pie Chart */}
          {(chartType === 'donut' || chartType === 'pie') && (
            <div className="flex items-center justify-around h-44 py-2">
              <svg className="w-32 h-32" viewBox="0 0 100 100">
                {(() => {
                  let accumulatedPercent = 0;
                  return data.map((dp, idx) => {
                    const slicePercent = totalValue > 0 ? dp.value / totalValue : 0;
                    const startAngle = accumulatedPercent * 2 * Math.PI - Math.PI / 2;
                    accumulatedPercent += slicePercent;
                    const endAngle = accumulatedPercent * 2 * Math.PI - Math.PI / 2;

                    const r = 40;
                    const innerR = chartType === 'donut' ? 24 : 0;
                    const cx = 50;
                    const cy = 50;

                    const x1 = cx + r * Math.cos(startAngle);
                    const y1 = cy + r * Math.sin(startAngle);
                    const x2 = cx + r * Math.cos(endAngle);
                    const y2 = cy + r * Math.sin(endAngle);

                    const x3 = cx + innerR * Math.cos(endAngle);
                    const y3 = cy + innerR * Math.sin(endAngle);
                    const x4 = cx + innerR * Math.cos(startAngle);
                    const y4 = cy + innerR * Math.sin(startAngle);

                    const largeArc = slicePercent > 0.5 ? 1 : 0;
                    const d = innerR > 0
                      ? `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`
                      : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                    return (
                      <path
                        key={dp.key || idx}
                        d={d}
                        fill={getBarColor(idx)}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleSegmentClick(dp)}
                        onMouseEnter={() => setHoveredPoint(dp)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    );
                  });
                })()}
              </svg>

              {/* Legend */}
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pl-2 text-xs">
                {data.map((dp, idx) => (
                  <div
                    key={dp.key || idx}
                    className="flex items-center gap-2 cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    onClick={() => handleSegmentClick(dp)}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getBarColor(idx) }}
                    />
                    <span className="truncate max-w-[100px] text-stone-700 dark:text-stone-300 font-medium">
                      {dp.label}
                    </span>
                    <span className="text-stone-400 text-[11px] ml-auto">
                      {dp.percentage || 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
