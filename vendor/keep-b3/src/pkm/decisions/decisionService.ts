import {
  Decision,
  DecisionOption,
  DecisionCriterion,
  DecisionAssumption,
  Prediction,
  Experiment,
  DecisionLesson,
  Retrospective,
  WeightedScoreCalculation,
  OptionScoreBreakdown,
  CalibrationStats,
  CalibrationBucket,
  PredictionOutcome,
} from './decisionTypes';
import { decisionStorage } from './decisionStorage';
import { Note } from '../../types';

export class DecisionService {
  // --- Decisions ---
  public getDecisions(): Decision[] {
    return decisionStorage.getDecisions();
  }

  public getDecisionById(id: string): Decision | undefined {
    return decisionStorage.getDecisionById(id);
  }

  public saveDecision(decision: Decision): Decision {
    return decisionStorage.saveDecision(decision);
  }

  public deleteDecision(id: string): boolean {
    return decisionStorage.deleteDecision(id);
  }

  public getDecisionsDueForReview(baseDate = new Date()): Decision[] {
    const todayStr = baseDate.toISOString().slice(0, 10);
    return this.getDecisions().filter(
      (d) =>
        d.reviewDate &&
        d.reviewDate <= todayStr &&
        d.status !== 'reviewed' &&
        d.status !== 'archived' &&
        d.status !== 'superseded' &&
        d.status !== 'cancelled'
    );
  }

  public getDecisionsAwaitingChoice(): Decision[] {
    return this.getDecisions().filter(
      (d) => d.status === 'considering' || d.status === 'draft'
    );
  }

  // --- Supersession & Cycle Detection ---
  public hasSupersessionCycle(fromId: string, targetId: string): boolean {
    if (fromId === targetId) return true;
    const visited = new Set<string>();
    let currentId: string | undefined = targetId;

    while (currentId) {
      if (visited.has(currentId)) return true;
      if (currentId === fromId) return true;
      visited.add(currentId);
      const dec = decisionStorage.getDecisionById(currentId);
      currentId = dec?.supersedesId;
    }
    return false;
  }

  public supersedeDecision(
    originalId: string,
    newDecisionDraft: Omit<Decision, 'id' | 'createdAt' | 'updatedAt' | 'supersedesId'>
  ): { success: boolean; newDecision?: Decision; error?: string } {
    const original = decisionStorage.getDecisionById(originalId);
    if (!original) {
      return { success: false, error: 'Original decision not found' };
    }

    const newId = `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (this.hasSupersessionCycle(newId, originalId)) {
      return { success: false, error: 'Supersession cycle detected' };
    }

    const newDecision: Decision = {
      ...newDecisionDraft,
      id: newId,
      supersedesId: originalId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const savedNew = decisionStorage.saveDecision(newDecision);

    // Update original to superseded
    const updatedOriginal: Decision = {
      ...original,
      status: 'superseded',
      supersededById: savedNew.id,
      updatedAt: new Date().toISOString(),
    };
    decisionStorage.saveDecision(updatedOriginal);

    return { success: true, newDecision: savedNew };
  }

  // --- Options & Criteria ---
  public getOptionsForDecision(decisionId: string): DecisionOption[] {
    return decisionStorage.getOptionsForDecision(decisionId);
  }

  public saveOption(option: DecisionOption): DecisionOption {
    return decisionStorage.saveOption(option);
  }

  public deleteOption(id: string): boolean {
    return decisionStorage.deleteOption(id);
  }

  public getCriteriaForDecision(decisionId: string): DecisionCriterion[] {
    return decisionStorage.getCriteriaForDecision(decisionId);
  }

  public saveCriterion(criterion: DecisionCriterion): DecisionCriterion {
    return decisionStorage.saveCriterion(criterion);
  }

  public deleteCriterion(id: string): boolean {
    return decisionStorage.deleteCriterion(id);
  }

  // --- Assumptions ---
  public getAssumptionsForDecision(decisionId: string): DecisionAssumption[] {
    return decisionStorage.getAssumptionsForDecision(decisionId);
  }

  public saveAssumption(assumption: DecisionAssumption): DecisionAssumption {
    return decisionStorage.saveAssumption(assumption);
  }

  public deleteAssumption(id: string): boolean {
    return decisionStorage.deleteAssumption(id);
  }

  // --- Transparent Weighted Scoring Calculation ---
  /**
   * Transparently calculates option scores according to user weights.
   * STRICT PRINCIPLE: This NEVER auto-selects or labels any option as "winner".
   */
  public calculateWeightedScores(decisionId: string): WeightedScoreCalculation {
    const options = this.getOptionsForDecision(decisionId);
    const criteria = this.getCriteriaForDecision(decisionId);

    const optionBreakdowns: OptionScoreBreakdown[] = [];
    let highestScore = -Infinity;
    let highestOptionId: string | undefined = undefined;

    for (const opt of options) {
      const criterionScores: OptionScoreBreakdown['criterionScores'] = {};
      let totalWeighted = 0;

      for (const crit of criteria) {
        const rawVal = opt.criterionValues?.[crit.id];
        const weight = crit.weight !== undefined ? crit.weight : 1;
        let normalized = 0;

        if (crit.mode === 'rating') {
          const num = typeof rawVal === 'number' ? rawVal : Number(rawVal) || 0;
          normalized = Math.min(Math.max(num / 5, 0), 1);
        } else if (crit.mode === 'number') {
          const num = typeof rawVal === 'number' ? rawVal : Number(rawVal) || 0;
          normalized = num;
        } else if (crit.mode === 'boolean') {
          normalized = rawVal === true || rawVal === 'true' ? 1 : 0;
        } else {
          // text criterion has no numeric scoring contribution
          normalized = 0;
        }

        const weightedSubtotal = normalized * weight;
        criterionScores[crit.id] = {
          rawValue: rawVal,
          normalizedScore: normalized,
          weight,
          weightedSubtotal,
        };
        totalWeighted += weightedSubtotal;
      }

      optionBreakdowns.push({
        optionId: opt.id,
        optionTitle: opt.title,
        criterionScores,
        totalWeightedScore: Math.round(totalWeighted * 100) / 100,
      });

      if (totalWeighted > highestScore) {
        highestScore = totalWeighted;
        highestOptionId = opt.id;
      }
    }

    return {
      options: optionBreakdowns,
      highestCalculatedOptionId: highestOptionId,
      formulaExplanation:
        'Total Weighted Score = Sum of (Normalized Criterion Score × Criterion Weight). Rating scales are normalized to 0–1 (1=0.2, 5=1.0). Text criteria are qualitative only.',
    };
  }

  // --- Predictions & Revision Audit ---
  public getPredictions(): Prediction[] {
    return decisionStorage.getPredictions();
  }

  public getPredictionsForDecision(decisionId: string): Prediction[] {
    return this.getPredictions().filter((p) => p.decisionId === decisionId);
  }

  public getPredictionById(id: string): Prediction | undefined {
    return decisionStorage.getPredictionById(id);
  }

  public getDuePredictions(baseDate = new Date()): Prediction[] {
    const todayStr = baseDate.toISOString().slice(0, 10);
    return this.getPredictions().filter(
      (p) => p.status === 'open' && p.resolutionDate && p.resolutionDate <= todayStr
    );
  }

  public savePrediction(prediction: Prediction): Prediction {
    return decisionStorage.savePrediction(prediction);
  }

  public updatePredictionWithAudit(
    id: string,
    patch: Partial<Prediction>,
    reasonForChange?: string
  ): Prediction | undefined {
    const existing = decisionStorage.getPredictionById(id);
    if (!existing) return undefined;

    const isStatementChanged =
      patch.statement !== undefined && patch.statement !== existing.statement;
    const isConfidenceChanged =
      patch.confidence !== undefined && patch.confidence !== existing.confidence;

    const newRevisionHistory = [...(existing.revisionHistory || [])];

    if (isStatementChanged || isConfidenceChanged) {
      newRevisionHistory.push({
        timestamp: new Date().toISOString(),
        previousStatement: existing.statement,
        previousConfidence: existing.confidence,
        reason: reasonForChange || 'User updated prediction parameters',
      });
    }

    const updated: Prediction = {
      ...existing,
      ...patch,
      revisionHistory: newRevisionHistory,
    };

    return decisionStorage.savePrediction(updated);
  }

  public resolvePrediction(
    id: string,
    outcome: PredictionOutcome
  ): Prediction | undefined {
    const existing = decisionStorage.getPredictionById(id);
    if (!existing) return undefined;

    const updated: Prediction = {
      ...existing,
      status: 'resolved',
      outcome,
    };

    return decisionStorage.savePrediction(updated);
  }

  public deletePrediction(id: string): boolean {
    return decisionStorage.deletePrediction(id);
  }

  // --- Probabilistic Calibration Engine ---
  public calculateCalibrationStats(): CalibrationStats {
    const all = this.getPredictions().filter(
      (p) => p.status === 'resolved' && p.outcome && p.confidence !== undefined
    );

    const bucketDefinitions: Array<{ label: string; min: number; max: number }> = [
      { label: '50–59%', min: 50, max: 59 },
      { label: '60–69%', min: 60, max: 69 },
      { label: '70–79%', min: 70, max: 79 },
      { label: '80–89%', min: 80, max: 89 },
      { label: '90–100%', min: 90, max: 100 },
    ];

    const buckets: CalibrationBucket[] = bucketDefinitions.map((b) => {
      const matching = all.filter((p) => {
        const c = p.confidence || 0;
        return c >= b.min && c <= b.max;
      });
      const resolvedTrue = matching.filter(
        (p) => p.outcome?.result === 'correct'
      ).length;
      const empirical = matching.length > 0 ? resolvedTrue / matching.length : 0;
      const expected = (b.min + b.max) / 200; // e.g. 0.75 for 70-79%

      return {
        rangeLabel: b.label,
        minConfidence: b.min,
        maxConfidence: b.max,
        totalPredictions: matching.length,
        resolvedTrueCount: resolvedTrue,
        empiricalRate: Math.round(empirical * 100) / 100,
        expectedRate: expected,
      };
    });

    // Brier Score calculation for binary probabilistic forecasts:
    // (1/N) * sum((f_t - o_t)^2) where f_t is forecasted probability (0-1), o_t is outcome (1 if correct, 0 if incorrect)
    let brierSum = 0;
    let brierCount = 0;
    for (const p of all) {
      if (p.confidence !== undefined && p.outcome) {
        const f = p.confidence / 100;
        const o = p.outcome.result === 'correct' ? 1 : 0;
        brierSum += Math.pow(f - o, 2);
        brierCount++;
      }
    }

    const brierScore = brierCount > 0 ? Math.round((brierSum / brierCount) * 1000) / 1000 : undefined;

    return {
      buckets,
      totalResolvedPredictions: all.length,
      brierScore,
      isLowSample: all.length < 5,
    };
  }

  // --- Experiments ---
  public getExperiments(): Experiment[] {
    return decisionStorage.getExperiments();
  }

  public getExperimentById(id: string): Experiment | undefined {
    return decisionStorage.getExperimentById(id);
  }

  public getRunningExperiments(): Experiment[] {
    return this.getExperiments().filter((e) => e.status === 'running');
  }

  public saveExperiment(experiment: Experiment): Experiment {
    return decisionStorage.saveExperiment(experiment);
  }

  public deleteExperiment(id: string): boolean {
    return decisionStorage.deleteExperiment(id);
  }

  public createFollowUpExperiment(
    previousExperimentId: string,
    title: string,
    adjustedHypothesis: string,
    intervention: string
  ): Experiment | undefined {
    const prev = decisionStorage.getExperimentById(previousExperimentId);
    if (!prev) return undefined;

    const newId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const todayStr = new Date().toISOString().slice(0, 10);
    const endStr = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

    const followUp: Experiment = {
      id: newId,
      title,
      question: prev.question,
      hypothesis: adjustedHypothesis,
      intervention,
      baseline: `Follow-up to previous experiment: "${prev.title}". Previous result: ${prev.resultsNotes || 'Inconclusive'}`,
      startDate: todayStr,
      endDate: endStr,
      status: 'planned',
      followUpToExperimentId: previousExperimentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = decisionStorage.saveExperiment(followUp);
    // Link backward
    decisionStorage.saveExperiment({
      ...prev,
      followUpExperimentId: saved.id,
    });

    return saved;
  }

  // --- Lessons & Retrospectives ---
  public getLessons(): DecisionLesson[] {
    return decisionStorage.getLessons();
  }

  public saveLesson(lesson: DecisionLesson): DecisionLesson {
    return decisionStorage.saveLesson(lesson);
  }

  public deleteLesson(id: string): boolean {
    return decisionStorage.deleteLesson(id);
  }

  public getRetrospectives(): Retrospective[] {
    return decisionStorage.getRetrospectives();
  }

  public saveRetrospective(retrospective: Retrospective): Retrospective {
    return decisionStorage.saveRetrospective(retrospective);
  }

  public deleteRetrospective(id: string): boolean {
    return decisionStorage.deleteRetrospective(id);
  }

  // --- Extract Lesson to Canonical Markdown Note ---
  public extractLessonToNote(lesson: DecisionLesson): {
    title: string;
    content: string;
  } {
    const title = `Lesson: ${lesson.title}`;
    const dateStr = lesson.createdAt.slice(0, 10);

    const content = `---
type: lesson
domain: ${lesson.domain || 'General'}
created: ${dateStr}
tags:
  - lesson
  - reflection
  ${lesson.tags.map((t) => `- ${t}`).join('\n  ')}
---

# ${lesson.title}

## Durable Takeaway
${lesson.takeaway}

## Context & Provenance
${lesson.contextSummary || 'Extracted from decision reflection review.'}

${lesson.sourceDecisionId ? `- Source Decision: \`#${lesson.sourceDecisionId}\`` : ''}
${lesson.sourceExperimentId ? `- Source Experiment: \`#${lesson.sourceExperimentId}\`` : ''}

## Reflection Notes
- When applying this insight in future choices, remember to verify the initial assumptions against fresh local observations.
`;

    return { title, content };
  }

  // --- Export Helpers ---
  public exportPredictionsToCSV(): string {
    const predictions = this.getPredictions();
    const headers = [
      'ID',
      'Title',
      'Statement',
      'Confidence',
      'Created Date',
      'Resolution Date',
      'Status',
      'Outcome Result',
      'Actual Value',
      'Resolved At',
      'Reflection Notes',
      'Revision Count',
    ];

    const rows = predictions.map((p) => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      `"${p.statement.replace(/"/g, '""')}"`,
      p.confidence !== undefined ? `${p.confidence}%` : '',
      p.createdAt.slice(0, 10),
      p.resolutionDate || '',
      p.status,
      p.outcome?.result || '',
      `"${(p.outcome?.actualValue || '').replace(/"/g, '""')}"`,
      p.outcome?.resolvedAt || '',
      `"${(p.outcome?.reflectionNotes || '').replace(/"/g, '""')}"`,
      p.revisionHistory?.length || 0,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  public exportDecisionLogMarkdown(): string {
    const decisions = this.getDecisions();
    const predictions = this.getPredictions();
    const experiments = this.getExperiments();
    const lessons = this.getLessons();

    const sections: string[] = [];

    sections.push('# Decisions & Reflection Vault Log\n');
    sections.push(`_Generated on ${new Date().toLocaleDateString()}_ — ${decisions.length} Decisions, ${predictions.length} Predictions, ${experiments.length} Experiments.\n`);

    sections.push('## Decisions\n');
    for (const d of decisions) {
      const options = this.getOptionsForDecision(d.id);
      const selected = options.find((o) => o.status === 'selected');
      sections.push(`### ${d.title}`);
      sections.push(`- **Status**: ${d.status.toUpperCase()} | **Date**: ${d.decisionDate || d.createdAt.slice(0, 10)} | **Domain**: ${d.domain || 'General'}`);
      if (selected) {
        sections.push(`- **Selected Choice**: ${selected.title}`);
      }
      if (d.rationale) {
        sections.push(`- **Rationale**: ${d.rationale}`);
      }
      if (d.outcomeStatus) {
        sections.push(`- **Outcome Evaluation**: ${d.outcomeStatus.toUpperCase()} (Would decide again: ${d.wouldDecideAgain || '—'})`);
      }
      if (d.lessonSummary) {
        sections.push(`- **Lesson**: ${d.lessonSummary}`);
      }
      sections.push('');
    }

    sections.push('## Experiments\n');
    for (const e of experiments) {
      sections.push(`### ${e.title}`);
      sections.push(`- **Status**: ${e.status.toUpperCase()} (${e.startDate} to ${e.endDate})`);
      sections.push(`- **Hypothesis**: ${e.hypothesis}`);
      if (e.resultsNotes) sections.push(`- **Results**: ${e.resultsNotes}`);
      if (e.conclusionsNotes) sections.push(`- **Conclusions**: ${e.conclusionsNotes}`);
      sections.push('');
    }

    sections.push('## Extracted Lessons\n');
    for (const l of lessons) {
      sections.push(`- **${l.title}**: ${l.takeaway}`);
    }

    return sections.join('\n');
  }
}

export const decisionService = new DecisionService();
export const getDecisions = (): Decision[] => decisionService.getDecisions();
export const getDecisionById = (id: string): Decision | undefined =>
  decisionService.getDecisionById(id);
export const getPredictions = (): Prediction[] => decisionService.getPredictions();
export const getExperiments = (): Experiment[] => decisionService.getExperiments();
export const getLessons = (): DecisionLesson[] => decisionService.getLessons();
