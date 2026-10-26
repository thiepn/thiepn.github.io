import {
  Decision,
  DecisionOption,
  DecisionCriterion,
  DecisionAssumption,
  Prediction,
  Experiment,
  DecisionLesson,
  Retrospective,
} from './decisionTypes';

const STORAGE_KEYS = {
  DECISIONS: 'keepnotes_pkm_decisions_v1',
  OPTIONS: 'keepnotes_pkm_decision_options_v1',
  CRITERIA: 'keepnotes_pkm_decision_criteria_v1',
  ASSUMPTIONS: 'keepnotes_pkm_decision_assumptions_v1',
  PREDICTIONS: 'keepnotes_pkm_predictions_v1',
  EXPERIMENTS: 'keepnotes_pkm_experiments_v1',
  LESSONS: 'keepnotes_pkm_decision_lessons_v1',
  RETROSPECTIVES: 'keepnotes_pkm_retrospectives_v1',
};

const INITIAL_DECISIONS: Decision[] = [
  {
    id: 'dec-backend-arch-01',
    title: 'Choose Realtime Backend Architecture for Core Sync',
    status: 'decided',
    decisionDate: '2026-06-15',
    reviewDate: '2026-09-15',
    deadlineDate: '2026-06-20',
    domain: 'Engineering',
    decisionType: 'technical',
    confidence: 85,
    reversibility: 'partially',
    costOfReversal: 'Approx 3 weeks refactoring data replication layer',
    context: 'We need an offline-first sync engine that guarantees local-first privacy with peer-to-peer reconciliation.',
    rationale: 'Cloudflare Workers with local indexedDB cache gave the best latency and zero lock-in on private server code.',
    outcomeStatus: 'positive',
    wouldDecideAgain: 'yes',
    lessonSummary: 'Prioritizing deterministic offline schema synchronization over proprietary cloud backends paid off in reliability.',
    relatedProjectIds: ['proj-sync-p2p'],
    createdAt: '2026-06-10T10:00:00.000Z',
    updatedAt: '2026-06-15T16:30:00.000Z',
  },
  {
    id: 'dec-laptop-upgrade-02',
    title: 'Keep Existing Dev Laptop vs Purchase M3 Max Workstation',
    status: 'decided',
    decisionDate: '2026-07-01',
    reviewDate: '2026-10-01',
    deadlineDate: '2026-07-10',
    domain: 'Hardware / Finance',
    decisionType: 'purchase',
    confidence: 75,
    reversibility: 'easily',
    costOfReversal: 'None if keeping; restocking fee if returned',
    context: 'Current M1 Pro laptop has 16GB RAM and sometimes throttles during local LLM embedding runs.',
    rationale: 'Offloaded heavy vector indexing to local WebGPU and worker thread; saved €3,200 by keeping current machine for another year.',
    outcomeStatus: 'positive',
    wouldDecideAgain: 'yes',
    lessonSummary: 'Software optimization of local batch sizes solved 90% of memory pressure before spending capital.',
    relatedAssetIds: ['asset-laptop-01'],
    createdAt: '2026-06-28T09:00:00.000Z',
    updatedAt: '2026-07-01T14:00:00.000Z',
  },
  {
    id: 'dec-math-course-03',
    title: 'Enroll in Real Analysis III vs Advanced Linear Algebra',
    status: 'considering',
    deadlineDate: '2026-09-20',
    reviewDate: '2026-12-20',
    domain: 'Academics',
    decisionType: 'academic',
    confidence: 60,
    reversibility: 'partially',
    context: 'Need 1 advanced mathematics module for autumn semester to fulfill honours degree criteria.',
    createdAt: '2026-08-25T11:00:00.000Z',
    updatedAt: '2026-08-25T11:00:00.000Z',
  },
];

const INITIAL_OPTIONS: DecisionOption[] = [
  {
    id: 'opt-cf-01',
    decisionId: 'dec-backend-arch-01',
    title: 'Cloudflare Workers + Local CRDT',
    status: 'selected',
    notes: 'Low cold-start latency, lightweight TypeScript runtime, highly portable.',
    criterionValues: {
      crit_cost: 5,
      crit_privacy: 5,
      crit_complexity: 4,
      crit_offline: 5,
    },
    createdAt: '2026-06-11T10:00:00.000Z',
    updatedAt: '2026-06-15T16:30:00.000Z',
  },
  {
    id: 'opt-supa-02',
    decisionId: 'dec-backend-arch-01',
    title: 'Managed Supabase Instance',
    status: 'rejected',
    notes: 'Great Postgres ecosystem, but unnecessary overhead for purely local-first vault notes.',
    criterionValues: {
      crit_cost: 3,
      crit_privacy: 3,
      crit_complexity: 3,
      crit_offline: 3,
    },
    createdAt: '2026-06-11T10:00:00.000Z',
    updatedAt: '2026-06-15T16:30:00.000Z',
  },
  {
    id: 'opt-fire-03',
    decisionId: 'dec-backend-arch-01',
    title: 'Firebase Firestore Sync',
    status: 'rejected',
    notes: 'Vendor lock-in risk and proprietary document model.',
    criterionValues: {
      crit_cost: 3,
      crit_privacy: 2,
      crit_complexity: 4,
      crit_offline: 4,
    },
    createdAt: '2026-06-11T10:00:00.000Z',
    updatedAt: '2026-06-15T16:30:00.000Z',
  },
  {
    id: 'opt-laptop-keep',
    decisionId: 'dec-laptop-upgrade-02',
    title: 'Keep M1 Pro & Optimize Software',
    status: 'selected',
    notes: 'Zero capital outlay; forces efficient worker batching and memory cleanup.',
    criterionValues: {
      crit_lap_cost: 5,
      crit_lap_perf: 3,
      crit_lap_portability: 4,
    },
    createdAt: '2026-06-29T10:00:00.000Z',
    updatedAt: '2026-07-01T14:00:00.000Z',
  },
  {
    id: 'opt-laptop-buy',
    decisionId: 'dec-laptop-upgrade-02',
    title: 'Buy New M3 Max (64GB RAM)',
    status: 'rejected',
    notes: 'High cost (€3,600), excessive specs for text note operations.',
    criterionValues: {
      crit_lap_cost: 1,
      crit_lap_perf: 5,
      crit_lap_portability: 4,
    },
    createdAt: '2026-06-29T10:00:00.000Z',
    updatedAt: '2026-07-01T14:00:00.000Z',
  },
];

const INITIAL_CRITERIA: DecisionCriterion[] = [
  {
    id: 'crit_cost',
    decisionId: 'dec-backend-arch-01',
    name: 'Cost Efficiency',
    mode: 'rating',
    weight: 4,
    description: 'Monthly cloud infrastructure and maintenance cost',
  },
  {
    id: 'crit_privacy',
    decisionId: 'dec-backend-arch-01',
    name: 'Data Privacy & Local Control',
    mode: 'rating',
    weight: 5,
    description: 'Guarantees end-to-end user data isolation without server snooping',
  },
  {
    id: 'crit_complexity',
    decisionId: 'dec-backend-arch-01',
    name: 'Operational Simplicity',
    mode: 'rating',
    weight: 3,
    description: 'Low cognitive overhead in deployment and disaster recovery',
  },
  {
    id: 'crit_offline',
    decisionId: 'dec-backend-arch-01',
    name: 'Offline-First Compatibility',
    mode: 'rating',
    weight: 5,
    description: 'Flawless operation without continuous internet connection',
  },
  {
    id: 'crit_lap_cost',
    decisionId: 'dec-laptop-upgrade-02',
    name: 'Capital Preservation',
    mode: 'rating',
    weight: 4,
    description: 'Avoid unnecessary cash burn before Q4',
  },
  {
    id: 'crit_lap_perf',
    decisionId: 'dec-laptop-upgrade-02',
    name: 'LLM Embedding Speed',
    mode: 'rating',
    weight: 3,
    description: 'Vector generation duration for 5,000 note corpus',
  },
  {
    id: 'crit_lap_portability',
    decisionId: 'dec-laptop-upgrade-02',
    name: 'Battery Life & Weight',
    mode: 'rating',
    weight: 4,
    description: 'All-day mobile study usage on train trips',
  },
];

const INITIAL_ASSUMPTIONS: DecisionAssumption[] = [
  {
    id: 'asm-cf-01',
    decisionId: 'dec-backend-arch-01',
    text: 'Client vector embeddings can run in WebWorker without UI thread freezing',
    confidence: 90,
    status: 'supported',
    provenanceSource: '[[WebWorker Embedding Benchmark 2026]]',
    reviewNotes: 'Verified: On M1, 384-dim embedding takes 12ms per paragraph in background.',
    createdAt: '2026-06-12T11:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
  },
  {
    id: 'asm-cf-02',
    decisionId: 'dec-backend-arch-01',
    text: 'Sync payload sizes will remain under 2MB per delta bundle',
    confidence: 80,
    status: 'supported',
    reviewNotes: 'Average diff payload is 14KB compressed.',
    createdAt: '2026-06-12T11:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
  },
  {
    id: 'asm-lap-01',
    decisionId: 'dec-laptop-upgrade-02',
    text: '16GB Unified RAM will be sufficient for WebGPU quantized embedding models',
    confidence: 70,
    status: 'supported',
    reviewNotes: 'Quantized INT8 model uses only 340MB VRAM.',
    createdAt: '2026-06-30T10:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z',
  },
];

const INITIAL_PREDICTIONS: Prediction[] = [
  {
    id: 'pred-sync-launch-01',
    decisionId: 'dec-backend-arch-01',
    title: 'Offline Sync Implementation Timeline',
    statement: 'The initial offline P2P sync prototype will pass all conflict-resolution test suites before July 10, 2026.',
    predictionType: 'binary',
    confidence: 80,
    createdAt: '2026-06-15T16:00:00.000Z',
    resolutionDate: '2026-07-10',
    status: 'resolved',
    outcome: {
      result: 'correct',
      actualValue: 'Passed all 42 CRDT convergence test suites on July 7, 2026.',
      resolvedAt: '2026-07-08T18:00:00.000Z',
      reflectionNotes: 'Estimating 3 weeks was accurate because we reused existing vector buffer structures.',
    },
    revisionHistory: [],
  },
  {
    id: 'pred-laptop-heat-02',
    decisionId: 'dec-laptop-upgrade-02',
    title: 'Laptop Thermal Throttling Frequency',
    statement: 'Background worker batching will reduce fan noise and throttle incidents to fewer than 1 per week.',
    predictionType: 'binary',
    confidence: 75,
    createdAt: '2026-07-01T14:00:00.000Z',
    resolutionDate: '2026-08-01',
    status: 'resolved',
    outcome: {
      result: 'correct',
      actualValue: 'Zero thermal throttling incidents recorded during July.',
      resolvedAt: '2026-08-02T10:00:00.000Z',
      reflectionNotes: 'Throttling was caused by un-debounced file watchers, not the core CPU load.',
    },
    revisionHistory: [],
  },
  {
    id: 'pred-exam-score-03',
    title: 'Calculus Final Examination Grade',
    statement: 'I will achieve a grade of 88% or higher on the Calculus final exam using daily spaced repetition flashcards.',
    predictionType: 'binary',
    confidence: 70,
    createdAt: '2026-08-01T09:00:00.000Z',
    resolutionDate: '2026-09-18',
    status: 'open',
    revisionHistory: [],
  },
  {
    id: 'pred-reading-habit-04',
    title: 'Quarterly Book Completion Count',
    statement: 'I will finish at least 6 technical books in Q3 by reading 25 minutes every morning.',
    predictionType: 'binary',
    confidence: 85,
    createdAt: '2026-07-01T08:00:00.000Z',
    resolutionDate: '2026-09-30',
    status: 'open',
    revisionHistory: [],
  },
];

const INITIAL_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-pomodoro-study-01',
    title: '50-Minute Notification-Free Study Blocks',
    question: 'Does silencing non-essential mobile notifications and studying in 50m/10m blocks increase daily focused study time?',
    hypothesis: 'If I silence all non-urgent notifications during morning hours, completed deep work blocks will increase by at least 30%.',
    intervention: 'Phone placed in another room between 08:30 and 12:30; 50-minute timer with 10-minute walk break.',
    baseline: 'Averaging 1.8 deep focus blocks per morning with frequent phone pickups (6.2 interruptions/day).',
    startDate: '2026-08-10',
    endDate: '2026-08-24',
    reviewDate: '2026-08-25',
    status: 'completed',
    linkedTrackerIds: ['tracker-focus-blocks'],
    targetMetrics: [
      { name: 'Completed Morning Blocks', baselineValue: '1.8 / day', targetValue: '3.0 / day', currentValue: '3.4 / day' },
      { name: 'Subjective Distraction Level', baselineValue: '7/10', targetValue: '< 3/10', currentValue: '2/10' },
    ],
    resultsNotes: 'Average focus blocks increased to 3.4 per morning over 14 consecutive weekdays.',
    conclusionsNotes: 'Physical separation from the phone removed subconscious checking impulse entirely.',
    limitationsNotes: 'Sample size is limited to 14 days and conducted during a summer semester with fewer ad-hoc meetings.',
    createdAt: '2026-08-09T18:00:00.000Z',
    updatedAt: '2026-08-25T14:00:00.000Z',
  },
  {
    id: 'exp-morning-walk-02',
    title: '15-Minute Outdoor Sunlight Walk Upon Waking',
    question: 'Does viewing morning sunlight within 30 minutes of waking improve evening sleep onset latency?',
    hypothesis: 'If I walk outside for 15 minutes before 08:00, sleep onset time will decrease below 20 minutes.',
    intervention: '15-minute outdoor walk without sunglasses immediately after drinking a glass of water.',
    baseline: 'Sleep onset latency averaged 42 minutes with restless tossing in bed.',
    startDate: '2026-09-01',
    endDate: '2026-09-21',
    reviewDate: '2026-09-22',
    status: 'running',
    targetMetrics: [
      { name: 'Sleep Onset Latency', baselineValue: '42 mins', targetValue: '< 20 mins', currentValue: '24 mins' },
    ],
    createdAt: '2026-08-31T20:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
];

const INITIAL_LESSONS: DecisionLesson[] = [
  {
    id: 'lsn-crdt-offline',
    sourceDecisionId: 'dec-backend-arch-01',
    title: 'Deterministic Sync Architecture Outlasts Framework Trends',
    takeaway: 'Designing storage around portable Markdown text and local vector indices prevents costly cloud database rewrites later.',
    domain: 'Engineering',
    tags: ['architecture', 'privacy', 'sync'],
    createdAt: '2026-06-15T16:35:00.000Z',
  },
  {
    id: 'lsn-profiling-first',
    sourceDecisionId: 'dec-laptop-upgrade-02',
    title: 'Profile Software Bottlenecks Before Purchasing Hardware',
    takeaway: 'Before spending capital on faster chips, profile I/O loops and memory leaks. Software optimization often yields 5x improvements for free.',
    domain: 'Hardware / Finance',
    tags: ['finance', 'hardware', 'performance'],
    createdAt: '2026-07-01T14:15:00.000Z',
  },
];

const INITIAL_RETROSPECTIVES: Retrospective[] = [
  {
    id: 'retro-q2-sync-review',
    title: 'Q2 Core Architecture & Sync Retrospective',
    type: 'project',
    date: '2026-06-30',
    sourceId: 'dec-backend-arch-01',
    whatWentWell: 'The decision to prioritize local-first sqlite/indexeddb allowed instant search and zero cloud latency for users.',
    whatDidnt: 'Initial conflict testing was delayed by 1 week due to mock data generation complexities.',
    assumptionsReviewed: 'Assumed WebWorkers would require postMessage serialization overhead; in practice, SharedArrayBuffers made it negligible.',
    lessonsLearned: 'Keep data structures binary-aligned for fast worker transfers.',
    nextActions: ['Draft formal recovery runbook', 'Add automated fuzz testing for network splits'],
    createdAt: '2026-06-30T17:00:00.000Z',
    updatedAt: '2026-06-30T17:00:00.000Z',
  },
];

export class DecisionStorage {
  private decisions: Map<string, Decision> = new Map();
  private options: Map<string, DecisionOption> = new Map();
  private criteria: Map<string, DecisionCriterion> = new Map();
  private assumptions: Map<string, DecisionAssumption> = new Map();
  private predictions: Map<string, Prediction> = new Map();
  private experiments: Map<string, Experiment> = new Map();
  private lessons: Map<string, DecisionLesson> = new Map();
  private retrospectives: Map<string, Retrospective> = new Map();

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof localStorage === 'undefined') return;

      const rawDecisions = localStorage.getItem(STORAGE_KEYS.DECISIONS);
      if (rawDecisions) {
        const parsed: Decision[] = JSON.parse(rawDecisions);
        this.decisions.clear();
        parsed.forEach((d) => this.decisions.set(d.id, d));
      } else {
        INITIAL_DECISIONS.forEach((d) => this.decisions.set(d.id, d));
        this.saveDecisions();
      }

      const rawOptions = localStorage.getItem(STORAGE_KEYS.OPTIONS);
      if (rawOptions) {
        const parsed: DecisionOption[] = JSON.parse(rawOptions);
        this.options.clear();
        parsed.forEach((o) => this.options.set(o.id, o));
      } else {
        INITIAL_OPTIONS.forEach((o) => this.options.set(o.id, o));
        this.saveOptions();
      }

      const rawCriteria = localStorage.getItem(STORAGE_KEYS.CRITERIA);
      if (rawCriteria) {
        const parsed: DecisionCriterion[] = JSON.parse(rawCriteria);
        this.criteria.clear();
        parsed.forEach((c) => this.criteria.set(c.id, c));
      } else {
        INITIAL_CRITERIA.forEach((c) => this.criteria.set(c.id, c));
        this.saveCriteria();
      }

      const rawAssumptions = localStorage.getItem(STORAGE_KEYS.ASSUMPTIONS);
      if (rawAssumptions) {
        const parsed: DecisionAssumption[] = JSON.parse(rawAssumptions);
        this.assumptions.clear();
        parsed.forEach((a) => this.assumptions.set(a.id, a));
      } else {
        INITIAL_ASSUMPTIONS.forEach((a) => this.assumptions.set(a.id, a));
        this.saveAssumptions();
      }

      const rawPredictions = localStorage.getItem(STORAGE_KEYS.PREDICTIONS);
      if (rawPredictions) {
        const parsed: Prediction[] = JSON.parse(rawPredictions);
        this.predictions.clear();
        parsed.forEach((p) => this.predictions.set(p.id, p));
      } else {
        INITIAL_PREDICTIONS.forEach((p) => this.predictions.set(p.id, p));
        this.savePredictions();
      }

      const rawExperiments = localStorage.getItem(STORAGE_KEYS.EXPERIMENTS);
      if (rawExperiments) {
        const parsed: Experiment[] = JSON.parse(rawExperiments);
        this.experiments.clear();
        parsed.forEach((e) => this.experiments.set(e.id, e));
      } else {
        INITIAL_EXPERIMENTS.forEach((e) => this.experiments.set(e.id, e));
        this.saveExperiments();
      }

      const rawLessons = localStorage.getItem(STORAGE_KEYS.LESSONS);
      if (rawLessons) {
        const parsed: DecisionLesson[] = JSON.parse(rawLessons);
        this.lessons.clear();
        parsed.forEach((l) => this.lessons.set(l.id, l));
      } else {
        INITIAL_LESSONS.forEach((l) => this.lessons.set(l.id, l));
        this.saveLessons();
      }

      const rawRetros = localStorage.getItem(STORAGE_KEYS.RETROSPECTIVES);
      if (rawRetros) {
        const parsed: Retrospective[] = JSON.parse(rawRetros);
        this.retrospectives.clear();
        parsed.forEach((r) => this.retrospectives.set(r.id, r));
      } else {
        INITIAL_RETROSPECTIVES.forEach((r) => this.retrospectives.set(r.id, r));
        this.saveRetrospectives();
      }
    } catch (e) {
      console.error('Failed to load decision records from storage', e);
    }
  }

  private saveDecisions() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEYS.DECISIONS,
          JSON.stringify(Array.from(this.decisions.values()))
        );
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save decisions', e);
    }
  }

  private saveOptions() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEYS.OPTIONS,
          JSON.stringify(Array.from(this.options.values()))
        );
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save options', e);
    }
  }

  private saveCriteria() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEYS.CRITERIA,
          JSON.stringify(Array.from(this.criteria.values()))
        );
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save criteria', e);
    }
  }

  private saveAssumptions() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEYS.ASSUMPTIONS,
          JSON.stringify(Array.from(this.assumptions.values()))
        );
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save assumptions', e);
    }
  }

  private savePredictions() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEYS.PREDICTIONS,
          JSON.stringify(Array.from(this.predictions.values()))
        );
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save predictions', e);
    }
  }

  private saveExperiments() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEYS.EXPERIMENTS,
          JSON.stringify(Array.from(this.experiments.values()))
        );
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save experiments', e);
    }
  }

  private saveLessons() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEYS.LESSONS,
          JSON.stringify(Array.from(this.lessons.values()))
        );
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save lessons', e);
    }
  }

  private saveRetrospectives() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEYS.RETROSPECTIVES,
          JSON.stringify(Array.from(this.retrospectives.values()))
        );
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save retrospectives', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error('Decision listener error', e);
      }
    });
  }

  // --- Decision CRUD ---
  public getDecisions(): Decision[] {
    return Array.from(this.decisions.values()).sort((a, b) =>
      (b.decisionDate || b.createdAt).localeCompare(a.decisionDate || a.createdAt)
    );
  }

  public getDecisionById(id: string): Decision | undefined {
    return this.decisions.get(id);
  }

  public saveDecision(decision: Decision): Decision {
    const updated = {
      ...decision,
      updatedAt: new Date().toISOString(),
    };
    this.decisions.set(updated.id, updated);
    this.saveDecisions();
    return updated;
  }

  public deleteDecision(id: string): boolean {
    const res = this.decisions.delete(id);
    if (res) {
      // Clean up child options, criteria, assumptions
      for (const [optId, opt] of this.options.entries()) {
        if (opt.decisionId === id) this.options.delete(optId);
      }
      for (const [critId, crit] of this.criteria.entries()) {
        if (crit.decisionId === id) this.criteria.delete(critId);
      }
      for (const [asmId, asm] of this.assumptions.entries()) {
        if (asm.decisionId === id) this.assumptions.delete(asmId);
      }
      this.saveDecisions();
      this.saveOptions();
      this.saveCriteria();
      this.saveAssumptions();
    }
    return res;
  }

  // --- Options CRUD ---
  public getOptionsForDecision(decisionId: string): DecisionOption[] {
    return Array.from(this.options.values()).filter((o) => o.decisionId === decisionId);
  }

  public getOptionById(id: string): DecisionOption | undefined {
    return this.options.get(id);
  }

  public saveOption(option: DecisionOption): DecisionOption {
    const updated = {
      ...option,
      updatedAt: new Date().toISOString(),
    };
    this.options.set(updated.id, updated);
    this.saveOptions();
    return updated;
  }

  public deleteOption(id: string): boolean {
    const res = this.options.delete(id);
    if (res) this.saveOptions();
    return res;
  }

  // --- Criteria CRUD ---
  public getCriteriaForDecision(decisionId: string): DecisionCriterion[] {
    return Array.from(this.criteria.values()).filter((c) => c.decisionId === decisionId);
  }

  public saveCriterion(criterion: DecisionCriterion): DecisionCriterion {
    this.criteria.set(criterion.id, criterion);
    this.saveCriteria();
    return criterion;
  }

  public deleteCriterion(id: string): boolean {
    const res = this.criteria.delete(id);
    if (res) this.saveCriteria();
    return res;
  }

  // --- Assumptions CRUD ---
  public getAssumptionsForDecision(decisionId: string): DecisionAssumption[] {
    return Array.from(this.assumptions.values()).filter((a) => a.decisionId === decisionId);
  }

  public saveAssumption(assumption: DecisionAssumption): DecisionAssumption {
    const updated = {
      ...assumption,
      updatedAt: new Date().toISOString(),
    };
    this.assumptions.set(updated.id, updated);
    this.saveAssumptions();
    return updated;
  }

  public deleteAssumption(id: string): boolean {
    const res = this.assumptions.delete(id);
    if (res) this.saveAssumptions();
    return res;
  }

  // --- Predictions CRUD ---
  public getPredictions(): Prediction[] {
    return Array.from(this.predictions.values()).sort((a, b) =>
      (b.resolutionDate || b.createdAt).localeCompare(a.resolutionDate || a.createdAt)
    );
  }

  public getPredictionById(id: string): Prediction | undefined {
    return this.predictions.get(id);
  }

  public savePrediction(prediction: Prediction): Prediction {
    this.predictions.set(prediction.id, prediction);
    this.savePredictions();
    return prediction;
  }

  public deletePrediction(id: string): boolean {
    const res = this.predictions.delete(id);
    if (res) this.savePredictions();
    return res;
  }

  // --- Experiments CRUD ---
  public getExperiments(): Experiment[] {
    return Array.from(this.experiments.values()).sort((a, b) =>
      (b.startDate || b.createdAt).localeCompare(a.startDate || a.createdAt)
    );
  }

  public getExperimentById(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  public saveExperiment(experiment: Experiment): Experiment {
    const updated = {
      ...experiment,
      updatedAt: new Date().toISOString(),
    };
    this.experiments.set(updated.id, updated);
    this.saveExperiments();
    return updated;
  }

  public deleteExperiment(id: string): boolean {
    const res = this.experiments.delete(id);
    if (res) this.saveExperiments();
    return res;
  }

  // --- Lessons CRUD ---
  public getLessons(): DecisionLesson[] {
    return Array.from(this.lessons.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  public saveLesson(lesson: DecisionLesson): DecisionLesson {
    this.lessons.set(lesson.id, lesson);
    this.saveLessons();
    return lesson;
  }

  public deleteLesson(id: string): boolean {
    const res = this.lessons.delete(id);
    if (res) this.saveLessons();
    return res;
  }

  // --- Retrospectives CRUD ---
  public getRetrospectives(): Retrospective[] {
    return Array.from(this.retrospectives.values()).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }

  public saveRetrospective(retrospective: Retrospective): Retrospective {
    const updated = {
      ...retrospective,
      updatedAt: new Date().toISOString(),
    };
    this.retrospectives.set(updated.id, updated);
    this.saveRetrospectives();
    return updated;
  }

  public deleteRetrospective(id: string): boolean {
    const res = this.retrospectives.delete(id);
    if (res) this.saveRetrospectives();
    return res;
  }
}

export const decisionStorage = new DecisionStorage();
export const subscribeToDecisionsChanges = (listener: () => void) =>
  decisionStorage.subscribe(listener);
