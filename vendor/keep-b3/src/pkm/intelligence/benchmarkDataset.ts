import { Note } from '../../types';
import { detectVaultDuplicates } from './duplicateDetector';
import { rankWikilinkCandidates } from './wikilinkRanker';
import { suggestTagsForNote } from './tagRecommender';
import { buildLexicalIndex, computeLexicalRelatednessForDoc } from '../lexicalRelatedness';

function makeNote(partial: Partial<Note> & { id: string; title: string; content: string; tags: string[] }): Note {
  return {
    folderId: null,
    type: 'text',
    checklist: [],
    color: 'default',
    pinned: false,
    archived: false,
    trashed: false,
    reminderDate: null,
    images: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

/**
 * Standard Ground-Truth Benchmark Dataset for PKM Knowledge Intelligence
 */
export const BENCHMARK_NOTES: Note[] = [
  // Cluster 1: Machine Learning & Optimization
  makeNote({
    id: 'bm-nn',
    title: 'Neural Networks',
    content: `# Neural Networks\nDeep learning architecture consisting of layers of artificial neurons, activation functions, forward propagation, and backpropagation for parameter optimization.\n#machine-learning #deep-learning #ai`,
    tags: ['machine-learning', 'deep-learning', 'ai'],
    folderId: 'cs/ai',
  }),
  makeNote({
    id: 'bm-backprop',
    title: 'Backpropagation',
    content: `# Backpropagation\nAlgorithm for computing the gradient of the loss function with respect to weights in neural networks using the chain rule of calculus.\n#machine-learning #deep-learning #calculus`,
    tags: ['machine-learning', 'deep-learning', 'calculus'],
    folderId: 'cs/ai',
  }),
  makeNote({
    id: 'bm-gd',
    title: 'Gradient Descent',
    content: `# Gradient Descent\nFirst-order iterative optimization algorithm for finding a local minimum of a differentiable function. Used in neural networks and linear models.\n#optimization #machine-learning #math`,
    tags: ['optimization', 'machine-learning', 'math'],
    folderId: 'cs/ai',
  }),
  makeNote({
    id: 'bm-linreg',
    title: 'Linear Regression',
    content: `# Linear Regression\nStatistical method for modeling the relationship between a dependent scalar variable and independent explanatory variables using ordinary least squares.\n#statistics #machine-learning`,
    tags: ['statistics', 'machine-learning'],
    folderId: 'stats',
  }),
  makeNote({
    id: 'bm-logreg',
    title: 'Logistic Regression',
    content: `# Logistic Regression\nStatistical classification model that estimates the probability of a binary event occurring using a logistic sigmoid function.\n#statistics #machine-learning #classification`,
    tags: ['statistics', 'machine-learning', 'classification'],
    folderId: 'stats',
  }),

  // Duplicate Pair 1 (Exact / Near Exact)
  makeNote({
    id: 'bm-dup-orig',
    title: 'Project Alpha Requirements',
    content: `# Project Alpha Requirements\n1. User Authentication via OAuth\n2. Local SQLite synchronization\n3. Export to PDF and Markdown\n4. Encryption at rest.`,
    tags: ['project-alpha', 'specs'],
    folderId: 'projects',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  }),
  makeNote({
    id: 'bm-dup-copy',
    title: 'Project Alpha Requirements Copy',
    content: `# Project Alpha Requirements\n\n1. User Authentication via OAuth\n2. Local SQLite synchronization\n3. Export to PDF and Markdown\n4. Encryption at rest.\n`,
    tags: ['project-alpha'],
    folderId: 'inbox',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-03T00:00:00Z',
  }),

  // Unrelated Domain: French Cooking & Language
  makeNote({
    id: 'bm-french',
    title: 'French Cooking Techniques',
    content: `# French Cooking Techniques\nClassic techniques including sautéing, poaching, braising, creating roux, and preparing mother sauces like béchamel and hollandaise.\n#cooking #culinary #recipes`,
    tags: ['cooking', 'culinary', 'recipes'],
    folderId: 'personal/culinary',
  }),

  // Multilingual Notes: German, French, Korean, Turkish
  makeNote({
    id: 'bm-de',
    title: 'Künstliche Intelligenz',
    content: `# Künstliche Intelligenz\nKünstliche Intelligenz befasst sich mit der Automatisierung intelligenten Verhaltens und dem maschinellen Lernen.\n#ki #informatik`,
    tags: ['ki', 'informatik'],
  }),
  makeNote({
    id: 'bm-kr',
    title: '인공지능 개론',
    content: `# 인공지능 개론\n기계학습과 심층신경망 역전파 알고리즘을 활용한 현대 인공지능 연구 및 구현 요약.\n#인공지능 #딥러닝`,
    tags: ['인공지능', '딥러닝'],
  }),
  makeNote({
    id: 'bm-tr',
    title: 'Yapay Zeka ve Makine Öğrenimi',
    content: `# Yapay Zeka ve Makine Öğrenimi\nSinir ağları, gradyan inişi ve geri yayılım algoritmaları ile derin öğrenme modelleri eğitimi.\n#yapayzeka #makineogrenimi`,
    tags: ['yapayzeka', 'makineogrenimi'],
  }),
];

/**
 * Runs evaluation metrics across the benchmark corpus
 */
export function runIntelligenceBenchmark(): {
  lexicalLatencyMs: number;
  duplicatePrecision: number;
  duplicateRecall: number;
  falsePositiveDuplicates: number;
  relatednessMRR: number;
} {
  const start = performance.now();

  // 1. Evaluate Duplicate Detection
  const dupResults = detectVaultDuplicates(BENCHMARK_NOTES);
  const detectedPair = dupResults.pairs.find(
    (p) =>
      (p.noteAId === 'bm-dup-orig' && p.noteBId === 'bm-dup-copy') ||
      (p.noteAId === 'bm-dup-copy' && p.noteBId === 'bm-dup-orig')
  );

  // False positive check: Linear Regression vs Logistic Regression MUST NOT be duplicates!
  const falsePositive = dupResults.pairs.find(
    (p) =>
      (p.noteAId === 'bm-linreg' && p.noteBId === 'bm-logreg') ||
      (p.noteAId === 'bm-logreg' && p.noteBId === 'bm-linreg')
  );

  const duplicateRecall = detectedPair ? 1.0 : 0.0;
  const falsePositiveDuplicates = falsePositive ? 1 : 0;
  const duplicatePrecision = dupResults.pairs.length > 0
    ? (dupResults.pairs.length - falsePositiveDuplicates) / dupResults.pairs.length
    : 1.0;

  // 2. Evaluate Relatedness MRR for Backpropagation -> Neural Networks
  const lexicalIndex = buildLexicalIndex(BENCHMARK_NOTES);
  const relatedToBackprop = computeLexicalRelatednessForDoc(
    'bm-backprop',
    lexicalIndex,
    0.1,
    10,
    new Set<string>()
  );
  const nnIndex = relatedToBackprop.findIndex((r) => r.targetId === 'bm-nn');
  const relatednessMRR = nnIndex >= 0 ? 1 / (nnIndex + 1) : 0;

  const end = performance.now();

  return {
    lexicalLatencyMs: Math.round((end - start) * 100) / 100,
    duplicatePrecision,
    duplicateRecall,
    falsePositiveDuplicates,
    relatednessMRR,
  };
}
