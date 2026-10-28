export type DecisionStatus =
  | 'draft'
  | 'considering'
  | 'decided'
  | 'deferred'
  | 'reversed'
  | 'superseded'
  | 'cancelled'
  | 'reviewed'
  | 'archived';

export type DecisionType =
  | 'strategic'
  | 'purchase'
  | 'technical'
  | 'personal'
  | 'academic'
  | 'travel'
  | 'financial'
  | 'health'
  | 'operational'
  | 'other';

export type Reversibility = 'easily' | 'partially' | 'hard';

export type OutcomeStatus = 'positive' | 'mixed' | 'negative' | 'too_early' | 'unknown';

export type WouldDecideAgain = 'yes' | 'no' | 'unsure';

export type AssumptionStatus = 'untested' | 'supported' | 'contradicted' | 'uncertain';

export type PredictionStatus = 'open' | 'resolved' | 'cancelled' | 'unresolvable';

export type PredictionResult = 'correct' | 'incorrect' | 'partially' | 'unresolvable';

export type PredictionType = 'binary' | 'numeric' | 'date' | 'qualitative';

export type ExperimentStatus =
  | 'draft'
  | 'planned'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'inconclusive'
  | 'archived';

export type RetrospectiveType =
  | 'project'
  | 'decision'
  | 'trip'
  | 'course'
  | 'experiment'
  | 'incident'
  | 'general';

export interface DecisionOption {
  id: string;
  decisionId: string;
  title: string;
  status: 'considered' | 'selected' | 'rejected' | 'deferred';
  notes?: string;
  criterionValues?: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export type CriterionMode = 'text' | 'boolean' | 'number' | 'rating';

export interface DecisionCriterion {
  id: string;
  decisionId: string;
  name: string;
  mode: CriterionMode;
  weight?: number; // 1-5 or 0-100 (optional)
  description?: string;
}

export interface DecisionAssumption {
  id: string;
  decisionId: string;
  text: string;
  confidence?: number; // 0-100% user-entered
  status: AssumptionStatus;
  provenanceSource?: string; // e.g. [[Note Link]] or reference
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PredictionRevision {
  timestamp: string;
  previousStatement: string;
  previousConfidence?: number;
  reason: string;
}

export interface PredictionOutcome {
  result: PredictionResult;
  actualValue?: string;
  resolvedAt: string;
  reflectionNotes?: string;
}

export interface Prediction {
  id: string;
  decisionId?: string;
  title: string;
  statement: string;
  predictionType: PredictionType;
  confidence?: number; // 0-100% user-entered
  createdAt: string;
  resolutionDate?: string;
  status: PredictionStatus;
  outcome?: PredictionOutcome;
  revisionHistory: PredictionRevision[];
  evidenceNoteIds?: string[];
}

export interface ExperimentTargetMetric {
  name: string;
  targetValue?: string;
  baselineValue?: string;
  currentValue?: string;
}

export interface Experiment {
  id: string;
  noteId?: string;
  title: string;
  question: string;
  hypothesis: string;
  intervention: string;
  baseline?: string;
  startDate: string;
  endDate: string;
  reviewDate?: string;
  status: ExperimentStatus;
  linkedTrackerIds?: string[];
  targetMetrics?: ExperimentTargetMetric[];
  resultsNotes?: string;
  conclusionsNotes?: string;
  limitationsNotes?: string;
  followUpExperimentId?: string;
  followUpToExperimentId?: string;
  relatedGoalId?: string;
  relatedProjectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionLesson {
  id: string;
  sourceDecisionId?: string;
  sourceExperimentId?: string;
  sourceReviewId?: string;
  noteId?: string;
  title: string;
  takeaway: string;
  contextSummary?: string;
  domain?: string;
  tags: string[];
  createdAt: string;
}

export interface Retrospective {
  id: string;
  title: string;
  type: RetrospectiveType;
  date: string;
  sourceId?: string;
  whatWentWell: string;
  whatDidnt: string;
  assumptionsReviewed?: string;
  lessonsLearned: string;
  nextActions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Decision {
  id: string;
  noteId?: string;
  title: string;
  status: DecisionStatus;
  decisionDate?: string;
  reviewDate?: string;
  deadlineDate?: string;
  domain?: string;
  decisionType: DecisionType;
  confidence?: number; // 0-100% user-entered
  reversibility: Reversibility;
  costOfReversal?: string;
  context?: string;
  rationale?: string;
  outcomeStatus?: OutcomeStatus;
  wouldDecideAgain?: WouldDecideAgain;
  lessonSummary?: string;

  // Domain Relations
  relatedGoalIds?: string[];
  relatedProjectIds?: string[];
  relatedAreaIds?: string[];
  relatedPersonIds?: string[];
  relatedAssetIds?: string[];
  relatedTripIds?: string[];
  relatedCourseIds?: string[];
  relatedAccountIds?: string[];
  relatedHealthRecordIds?: string[];

  // Supersession chain
  supersedesId?: string;
  supersededById?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CalibrationBucket {
  rangeLabel: string;
  minConfidence: number;
  maxConfidence: number;
  totalPredictions: number;
  resolvedTrueCount: number;
  empiricalRate: number; // 0 to 1
  expectedRate: number; // Midpoint (0 to 1)
}

export interface CalibrationStats {
  buckets: CalibrationBucket[];
  totalResolvedPredictions: number;
  brierScore?: number; // (1/N) * sum((f_t - o_t)^2)
  isLowSample: boolean; // if total < 5
}

export interface OptionScoreBreakdown {
  optionId: string;
  optionTitle: string;
  criterionScores: Record<
    string,
    {
      rawValue: string | number | boolean | undefined;
      normalizedScore: number; // 0 to 1
      weight: number;
      weightedSubtotal: number;
    }
  >;
  totalWeightedScore: number;
}

export interface WeightedScoreCalculation {
  options: OptionScoreBreakdown[];
  highestCalculatedOptionId?: string;
  formulaExplanation: string;
}
