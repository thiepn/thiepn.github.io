import React, { useMemo } from 'react';
import { decisionService } from '../decisionService';
import {
  BarChart3,
  Target,
  Sparkles,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export const CalibrationTab: React.FC = () => {
  const stats = useMemo(() => {
    return decisionService.calculateCalibrationStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Intro Box */}
      <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Probabilistic Calibration & Brier Evaluation
          </h3>
        </div>
        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-sans">
          Calibration measures how well your subjective confidence matches empirical reality. When you are 80% confident across many predictions, approximately 80% of those events should turn out to be true.
        </p>
      </div>

      {/* Low Sample Warning if < 5 */}
      {stats.isLowSample && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Limited Sample Size Notice</span>
            You currently have {stats.totalResolvedPredictions} resolved prediction{stats.totalResolvedPredictions === 1 ? '' : 's'}. Calibration curves become meaningful once you have resolved 15–20+ predictions.
          </div>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Resolved Predictions
          </span>
          <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
            {stats.totalResolvedPredictions}
          </div>
          <p className="text-[11px] text-stone-400">
            Explicit forecasts with recorded outcomes
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Brier Accuracy Score
          </span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {stats.brierScore !== undefined ? stats.brierScore : '—'}
          </div>
          <p className="text-[11px] text-stone-400">
            Mean squared error (0 = perfect calibration, 0.25 = random coin flip)
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Calibration Standard
          </span>
          <div className="text-xs font-medium text-stone-800 dark:text-stone-200 pt-1">
            "With What I Knew Then"
          </div>
          <p className="text-[11px] text-stone-400">
            Evaluate foresight, not post-hoc hindsight bias
          </p>
        </div>
      </div>

      {/* Calibration Buckets Table */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-stone-200 dark:border-stone-800 font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center justify-between">
          <span>Forecast Confidence vs Empirical Accuracy</span>
          <span className="text-[11px] font-normal text-stone-500">
            Normalized across confidence tiers
          </span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400">
              <th className="p-3 font-semibold">Confidence Tier</th>
              <th className="p-3 font-semibold">Forecasts</th>
              <th className="p-3 font-semibold">Resolved True</th>
              <th className="p-3 font-semibold">Empirical Rate</th>
              <th className="p-3 font-semibold">Visual Calibration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {stats.buckets.map((b) => {
              const empiricalPercent = Math.round(b.empiricalRate * 100);
              const expectedPercent = Math.round(b.expectedRate * 100);

              return (
                <tr key={b.rangeLabel} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
                  <td className="p-3 font-bold font-mono text-stone-900 dark:text-stone-100">
                    {b.rangeLabel}
                  </td>
                  <td className="p-3 font-mono text-stone-700 dark:text-stone-300">
                    {b.totalPredictions}
                  </td>
                  <td className="p-3 font-mono text-stone-700 dark:text-stone-300">
                    {b.resolvedTrueCount}
                  </td>
                  <td className="p-3 font-mono font-bold">
                    {b.totalPredictions > 0 ? (
                      <span
                        className={
                          Math.abs(empiricalPercent - expectedPercent) <= 15
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }
                      >
                        {empiricalPercent}%
                      </span>
                    ) : (
                      <span className="text-stone-400 font-normal">No samples</span>
                    )}
                  </td>
                  <td className="p-3 min-w-[200px]">
                    {b.totalPredictions > 0 ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono">
                          <span>Target: ~{expectedPercent}%</span>
                          <span>Actual: {empiricalPercent}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden relative">
                          {/* Target marker */}
                          <div
                            className="absolute top-0 bottom-0 w-1 bg-stone-400 dark:bg-stone-600 z-10"
                            style={{ left: `${expectedPercent}%` }}
                          />
                          {/* Actual bar */}
                          <div
                            className={`h-full rounded-full ${
                              Math.abs(empiricalPercent - expectedPercent) <= 15
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${empiricalPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-stone-400 text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Formula & Methodological Note */}
      <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 space-y-1">
        <span className="font-bold text-stone-800 dark:text-stone-200 block">
          Transparent Brier Score Formula:
        </span>
        <p className="font-mono text-[11px] text-stone-700 dark:text-stone-300">
          Brier Score = (1 / N) × ∑ (f_i - o_i)²
        </p>
        <p>
          Where <em>f_i</em> is your forecast probability (0.0–1.0) and <em>o_i</em> is the binary outcome (1 if true, 0 if false). Lower scores indicate higher calibration accuracy.
        </p>
      </div>
    </div>
  );
};
