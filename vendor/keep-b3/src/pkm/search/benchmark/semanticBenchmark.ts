import { Note } from '../../../types';
import { BENCHMARK_NOTES } from '../../intelligence/benchmarkDataset';
import { intelligentChunkNote } from '../chunker';
import { executeLexicalSearch, executeSemanticVectorSearch, fuseHybridSearchResults } from '../hybridEngine';
import { VectorRecord } from '../searchTypes';
import { getNoteEmbedding } from '../../embeddingsEngine';

export interface BenchmarkCase {
  query: string;
  expectedTopNoteId: string;
  category: 'exact_title' | 'semantic_paraphrase' | 'partial_keyword' | 'cross_domain';
}

export const SEMANTIC_BENCHMARK_CASES: BenchmarkCase[] = [
  // 1. Exact Title Match
  {
    query: 'Neural Networks',
    expectedTopNoteId: 'bm-nn',
    category: 'exact_title',
  },
  // 2. Semantic Paraphrase (No keyword overlap in title, medical/technical concept)
  {
    query: 'gradient calculation in deep networks',
    expectedTopNoteId: 'bm-backprop',
    category: 'semantic_paraphrase',
  },
  // 3. Optimization algorithm for minimizing loss
  {
    query: 'iterative minimization of differentiable loss',
    expectedTopNoteId: 'bm-gd',
    category: 'semantic_paraphrase',
  },
  // 4. Exact Title Match for Specs
  {
    query: 'Project Alpha Requirements',
    expectedTopNoteId: 'bm-dup-orig',
    category: 'exact_title',
  },
  // 5. Culinary Domain Query
  {
    query: 'how to prepare béchamel sauce',
    expectedTopNoteId: 'bm-french',
    category: 'cross_domain',
  },
];

export interface SemanticBenchmarkReport {
  totalCases: number;
  top1Accuracy: number;
  top3Recall: number;
  meanReciprocalRank: number;
  avgLexicalLatencyMs: number;
  avgHybridLatencyMs: number;
  exactMatchPriorityPass: boolean;
  cases: Array<{
    query: string;
    expected: string;
    actualTopNoteId: string;
    actualRank: number;
    hitType: string;
    score: number;
    passed: boolean;
  }>;
}

/**
 * Runs deterministic hybrid and semantic search benchmark on ground-truth corpus
 */
export async function runSemanticSearchBenchmark(corpus: Note[] = BENCHMARK_NOTES): Promise<SemanticBenchmarkReport> {
  const notesMap = new Map(corpus.map((n) => [n.id, n]));
  const foldersMap = new Map();

  // 1. Pre-generate mock / computed vector records for benchmark corpus
  const vectorRecords: VectorRecord[] = [];
  for (const note of corpus) {
    const chunks = intelligentChunkNote(note);
    for (const chunk of chunks) {
      const vec = await getNoteEmbedding(note);
      if (vec) {
        vectorRecords.push({
          id: chunk.id,
          noteId: note.id,
          chunkId: chunk.id,
          hash: chunk.hash,
          vector: Array.from(vec),
          modelId: 'benchmark-model',
          heading: chunk.heading,
          charStart: chunk.charStart,
          charEnd: chunk.charEnd,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  let totalLexicalLatency = 0;
  let totalHybridLatency = 0;
  let top1Hits = 0;
  let top3Hits = 0;
  let mrrSum = 0;
  let exactPrioritySuccess = true;

  const caseResults: SemanticBenchmarkReport['cases'] = [];

  for (const testCase of SEMANTIC_BENCHMARK_CASES) {
    // Measure lexical latency
    const lexStart = performance.now();
    const lexicalHits = executeLexicalSearch(testCase.query, corpus);
    const lexEnd = performance.now();
    totalLexicalLatency += lexEnd - lexStart;

    // Measure hybrid latency & fusion
    const hybStart = performance.now();
    let semanticHits: any[] = [];
    const queryVec = await getNoteEmbedding({
      id: 'query',
      title: testCase.query,
      content: testCase.query,
      type: 'text',
      tags: [],
      checklist: [],
      color: 'default',
      pinned: false,
      archived: false,
      trashed: false,
      folderId: null,
      createdAt: '',
      updatedAt: '',
      reminderDate: null,
      images: [],
    });

    if (queryVec && vectorRecords.length > 0) {
      semanticHits = executeSemanticVectorSearch(queryVec, vectorRecords, notesMap);
    }

    const hybridResults = fuseHybridSearchResults(
      lexicalHits,
      semanticHits,
      notesMap,
      foldersMap,
      testCase.query,
      { mode: 'hybrid', rrfK: 60, titleBoost: 3.0 }
    );
    const hybEnd = performance.now();
    totalHybridLatency += hybEnd - hybStart;

    // Check rank of expected note
    const rank = hybridResults.findIndex((r) => r.noteId === testCase.expectedTopNoteId || (testCase.expectedTopNoteId === 'bm-dup-orig' && (r.noteId === 'bm-dup-orig' || r.noteId === 'bm-dup-copy')));
    const actualTopNoteId = hybridResults[0]?.noteId || 'none';
    const actualRank = rank >= 0 ? rank + 1 : 999;
    const isTop1 = actualRank === 1;
    const isTop3 = actualRank <= 3;

    if (isTop1) top1Hits++;
    if (isTop3) top3Hits++;
    if (rank >= 0) mrrSum += 1.0 / (rank + 1);

    if (testCase.category === 'exact_title' && !isTop1) {
      exactPrioritySuccess = false;
    }

    caseResults.push({
      query: testCase.query,
      expected: testCase.expectedTopNoteId,
      actualTopNoteId,
      actualRank,
      hitType: hybridResults[rank >= 0 ? rank : 0]?.primaryHitType || 'none',
      score: hybridResults[rank >= 0 ? rank : 0]?.combinedScore || 0,
      passed: isTop3,
    });
  }

  const numCases = SEMANTIC_BENCHMARK_CASES.length;

  return {
    totalCases: numCases,
    top1Accuracy: Math.round((top1Hits / numCases) * 100) / 100,
    top3Recall: Math.round((top3Hits / numCases) * 100) / 100,
    meanReciprocalRank: Math.round((mrrSum / numCases) * 100) / 100,
    avgLexicalLatencyMs: Math.round((totalLexicalLatency / numCases) * 100) / 100,
    avgHybridLatencyMs: Math.round((totalHybridLatency / numCases) * 100) / 100,
    exactMatchPriorityPass: exactPrioritySuccess,
    cases: caseResults,
  };
}
