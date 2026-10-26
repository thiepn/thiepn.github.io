import React, { useMemo } from 'react';
import {
  Brain,
  CheckCircle2,
  Clock,
  TrendingUp,
  Layers,
  Sparkles,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { reviewService } from '../reviewService';
import { cardIndex } from '../cardIndex';

export const ReviewAnalyticsView: React.FC = () => {
  const analytics = useMemo(() => reviewService.getAnalyticsData(), []);
  const totalCards = cardIndex.totalCardsCount;

  return (
    <div className="flex flex-col space-y-6 max-w-4xl mx-auto w-full p-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Studied Today</div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {analytics.cardsStudiedToday}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            {analytics.reviewsCompletedToday} review{analytics.reviewsCompletedToday === 1 ? '' : 's'} logged
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Estimated Retention</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {analytics.estimatedRetention}%
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">FSRS-4.5 memory stability</div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Mature Knowledge</div>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
            {analytics.maturityBreakdown.mature}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Interval ≥ 21 days</div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Total Vault Cards</div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {totalCards}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Across all notes</div>
        </div>
      </div>

      {/* Breakdown Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Knowledge State Distribution */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-neutral-500" />
            <span>Card Lifecycle Breakdown</span>
          </h4>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-600 dark:text-neutral-400">New (Unstudied)</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">
                  {analytics.stateBreakdown.new}
                </span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                <div
                  className="bg-sky-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${totalCards > 0 ? (analytics.stateBreakdown.new / totalCards) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-600 dark:text-neutral-400">Learning / Relearning</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">
                  {analytics.stateBreakdown.learning + analytics.stateBreakdown.relearning}
                </span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      totalCards > 0
                        ? ((analytics.stateBreakdown.learning + analytics.stateBreakdown.relearning) / totalCards) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-600 dark:text-neutral-400">Review (Active Retention)</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">
                  {analytics.stateBreakdown.review}
                </span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${totalCards > 0 ? (analytics.stateBreakdown.review / totalCards) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-600 dark:text-neutral-400">Suspended</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">
                  {analytics.stateBreakdown.suspended}
                </span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${totalCards > 0 ? (analytics.stateBreakdown.suspended / totalCards) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Algorithm Integrity & Memory Information */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-neutral-500" />
              <span>Scheduling Engine (FSRS-4.5)</span>
            </h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Reviews use the Free Spaced Repetition Scheduler (FSRS-4.5). Intervals are calculated deterministically from stability and difficulty formulas without requiring external cloud services.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 space-y-1">
            <div className="flex justify-between">
              <span>Target Retention:</span>
              <span className="font-medium text-neutral-700 dark:text-neutral-300">90%</span>
            </div>
            <div className="flex justify-between">
              <span>Average Response Time:</span>
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {analytics.averageResponseTimeSec > 0 ? `${analytics.averageResponseTimeSec}s` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
