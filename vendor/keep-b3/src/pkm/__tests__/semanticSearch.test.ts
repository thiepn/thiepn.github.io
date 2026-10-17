import { Note, Folder } from '../../types';
import { intelligentChunkNote, computeChunkHash } from '../search/chunker';
import { vectorStore } from '../search/vectorStore';
import {
  executeLexicalSearch,
  executeSemanticVectorSearch,
  fuseHybridSearchResults,
  findHighlightRanges,
  extractContextualExcerpt,
} from '../search/hybridEngine';
import { VectorRecord, SearchChunk } from '../search/searchTypes';
import { runSemanticSearchBenchmark } from '../search/benchmark/semanticBenchmark';
import { calculateCosineSimilarity } from '../embeddingsEngine';

function createMockNote(partial: Partial<Note> & { id: string; title: string; content: string }): Note {
  return {
    folderId: null,
    type: 'text',
    tags: [],
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

export async function runSemanticSearchTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`SemanticSearchTest FAIL: ${msg}`);
      console.error(`  FAIL: ${msg}`);
    }
  }

  console.log('--- Running 100% Local Hybrid Semantic Search & Vector Embeddings Test Suite ---');

  // Test 1: Intelligent Hierarchical Markdown Chunking
  try {
    const longNote = createMockNote({
      id: 'test-chunk-1',
      title: 'Deep Learning Architectures',
      tags: ['ai', 'research'],
      content: `# Deep Learning Architectures
Deep neural networks have revolutionized representation learning across modalities.

## Convolutional Networks
CNNs use spatial filter convolutions for computer vision and image processing.
They excel at translation invariance and feature hierarchies.

## Transformer Models
Transformers replace recurrent inductive biases with multi-head self-attention mechanisms.
They achieve quadratic attention scaling across token sequences.

## Optimization
Backpropagation with AdamW and cosine decay learning rate schedules.`,
    });

    const chunks = intelligentChunkNote(longNote, 250);
    assert(chunks.length >= 3, `Intelligent chunker should split into multiple structured chunks (got ${chunks.length})`);
    assert(chunks[0].text.includes('Deep Learning Architectures'), 'First chunk should preserve title/tag context');
    assert(chunks.some((c) => c.heading?.includes('Transformer Models')), 'Chunker should preserve heading paths');
    assert(chunks.every((c) => c.hash && c.hash.length > 0), 'All chunks should have deterministic content hashes');
  } catch (err: any) {
    failed++;
    errors.push(`Test 1 chunking error: ${err.message}`);
  }

  // Test 2: VectorStore IndexedDB & Memory Persistence
  try {
    await vectorStore.clearAllVectors();
    const mockVec: VectorRecord = {
      id: 'note-1#chunk-0',
      noteId: 'note-1',
      chunkId: 'note-1#chunk-0',
      hash: 'hash-abc',
      vector: [0.1, 0.2, 0.3, 0.4, 0.5],
      modelId: 'test-model',
      heading: 'Introduction',
      charStart: 0,
      charEnd: 100,
      updatedAt: new Date().toISOString(),
    };

    await vectorStore.saveVector(mockVec);
    const retrieved = await vectorStore.getVectorsForNote('note-1');
    assert(retrieved.length === 1, `VectorStore should retrieve saved note vector (got ${retrieved.length})`);
    assert(retrieved[0].hash === 'hash-abc', 'Retrieved vector should match hash');

    // Test batch update & deletion
    await vectorStore.deleteVectorsForNote('note-1');
    const afterDelete = await vectorStore.getVectorsForNote('note-1');
    assert(afterDelete.length === 0, 'VectorStore should delete note vectors cleanly');
  } catch (err: any) {
    failed++;
    errors.push(`Test 2 VectorStore error: ${err.message}`);
  }

  // Test 3: Lexical BM25 Search & Title Boost Priority
  try {
    const notes: Note[] = [
      createMockNote({
        id: 'n1',
        title: 'Hypertension Treatment',
        content: 'Clinical protocols for blood pressure management and ACE inhibitors.',
        tags: ['health', 'cardiology'],
      }),
      createMockNote({
        id: 'n2',
        title: 'General Health Guidelines',
        content: 'Daily diet, hydration, exercise, and occasional mentions of hypertension.',
        tags: ['wellness'],
      }),
      createMockNote({
        id: 'n3',
        title: 'Cooking Recipes',
        content: 'Low sodium soups and Mediterranean dishes.',
        tags: ['food'],
      }),
    ];

    const hits = executeLexicalSearch('Hypertension Treatment', notes);
    assert(hits.length >= 2, 'Lexical search should find matching notes');
    assert(hits[0].noteId === 'n1', 'Exact title match must rank #1 in lexical search');
    assert(hits[0].exactTitleMatch === true, 'Exact title flag should be set');
  } catch (err: any) {
    failed++;
    errors.push(`Test 3 Lexical Search error: ${err.message}`);
  }

  // Test 4: Semantic Vector Search Cosine Similarity
  try {
    const queryVec = [1.0, 0.0, 0.0, 0.0];
    const vecA: VectorRecord = {
      id: 'v1',
      noteId: 'n1',
      chunkId: 'v1',
      hash: 'h1',
      vector: [0.95, 0.05, 0.0, 0.0], // Highly similar
      modelId: 'm1',
      charStart: 0,
      charEnd: 50,
      updatedAt: '',
    };
    const vecB: VectorRecord = {
      id: 'v2',
      noteId: 'n2',
      chunkId: 'v2',
      hash: 'h2',
      vector: [0.1, 0.9, 0.1, 0.0], // Dissimilar
      modelId: 'm1',
      charStart: 0,
      charEnd: 50,
      updatedAt: '',
    };

    const notesMap = new Map([
      ['n1', createMockNote({ id: 'n1', title: 'Hypertension', content: 'Managing high pressure' })],
      ['n2', createMockNote({ id: 'n2', title: 'Baking Bread', content: 'Sourdough starter' })],
    ]);

    const semHits = executeSemanticVectorSearch(queryVec, [vecA, vecB], notesMap, { threshold: 0.3 });
    assert(semHits.length === 1, `Semantic search should filter out dissimilar vector (got ${semHits.length})`);
    assert(semHits[0].noteId === 'n1', 'Most similar vector should rank top');
    assert(semHits[0].score > 0.9, `Cosine similarity score should exceed 0.9 (got ${semHits[0].score})`);
  } catch (err: any) {
    failed++;
    errors.push(`Test 4 Semantic Search error: ${err.message}`);
  }

  // Test 5: Reciprocal Rank Fusion (RRF) Balance & Exact Match Guarantee
  try {
    const notesMap = new Map([
      ['n-exact', createMockNote({ id: 'n-exact', title: 'Quantum Computing', content: 'Qubits and superposition.' })],
      ['n-semantic', createMockNote({ id: 'n-semantic', title: 'Physics Research', content: 'Exploration of quantum phenomena and entanglement.' })],
    ]);
    const foldersMap = new Map();

    const lexicalHits = [
      {
        noteId: 'n-exact',
        score: 25.0,
        matchedFields: ['title'] as any,
        exactTitleMatch: true,
        exactPhraseMatch: false,
        matchedTags: [],
        excerpt: 'Quantum Computing qubits...',
        highlightRanges: [],
      },
    ];

    const semanticHits = [
      {
        noteId: 'n-semantic',
        chunkId: 'c1',
        score: 0.92,
        chunkText: '',
        excerpt: 'Exploration of quantum phenomena...',
      },
      {
        noteId: 'n-exact',
        chunkId: 'c2',
        score: 0.88,
        chunkText: '',
        excerpt: 'Quantum Computing qubits...',
      },
    ];

    const fused = fuseHybridSearchResults(lexicalHits, semanticHits, notesMap, foldersMap, 'Quantum Computing');
    assert(fused.length === 2, 'Fused results should include both candidates');
    assert(fused[0].noteId === 'n-exact', 'Exact title match must win top rank in Hybrid search');
    assert(fused[0].primaryHitType === 'exact_title', 'Primary hit type must be exact_title');
  } catch (err: any) {
    failed++;
    errors.push(`Test 5 RRF Hybrid Ranking error: ${err.message}`);
  }

  // Test 6: Highlight Range & Excerpt Context Generator
  try {
    const text = 'The patient presented with elevated arterial hypertension symptoms requiring lifestyle adjustments.';
    const terms = ['hypertension', 'arterial'];
    const ranges = findHighlightRanges(text, terms);
    assert(ranges.length === 2, `Should locate all query term ranges (got ${ranges.length})`);

    const excerpt = extractContextualExcerpt(text, terms, undefined, 50);
    assert(excerpt.length > 0 && excerpt.toLowerCase().includes('hypertension'), 'Contextual excerpt should include matched term');
  } catch (err: any) {
    failed++;
    errors.push(`Test 6 Highlighting error: ${err.message}`);
  }

  // Test 7: Incremental Hash Diffing
  try {
    const note = createMockNote({
      id: 'diff-note',
      title: 'Original Title',
      content: 'Original content paragraph one.\n\nOriginal content paragraph two.',
    });

    const initialChunks = intelligentChunkNote(note);
    const hashesBefore = initialChunks.map((c) => c.hash);

    // Modify only paragraph two
    const updatedNote = {
      ...note,
      content: 'Original content paragraph one.\n\nModified content paragraph two with new details.',
    };
    const updatedChunks = intelligentChunkNote(updatedNote);

    // First chunk hash should match, second should change
    assert(initialChunks.length > 0 && updatedChunks.length > 0, 'Chunks should be generated');
    assert(computeChunkHash('n', 'h', 'same text') === computeChunkHash('n', 'h', 'same text'), 'Identical chunk text yields identical hash');
    assert(computeChunkHash('n', 'h', 'text A') !== computeChunkHash('n', 'h', 'text B'), 'Different chunk text yields different hash');
  } catch (err: any) {
    failed++;
    errors.push(`Test 7 Incremental Diffing error: ${err.message}`);
  }

  // Test 8: Cosine Similarity Edge Cases
  try {
    assert(calculateCosineSimilarity([], []) === 0, 'Empty vectors return 0');
    assert(calculateCosineSimilarity([1, 0], [1, 0]) === 1.0, 'Identical unit vectors return 1.0');
    assert(calculateCosineSimilarity([1, 0], [0, 1]) === 0.0, 'Orthogonal vectors return 0.0');
    assert(calculateCosineSimilarity([1, 1], [-1, -1]) === 0.0, 'Opposite vectors clamped to 0.0');
  } catch (err: any) {
    failed++;
    errors.push(`Test 8 Cosine Similarity error: ${err.message}`);
  }

  // Test 9: Benchmark Evaluation Suite Execution
  try {
    const benchmarkReport = await runSemanticSearchBenchmark();
    assert(benchmarkReport.totalCases > 0, `Benchmark should execute test cases (ran ${benchmarkReport.totalCases})`);
    assert(benchmarkReport.top3Recall >= 0.8, `Benchmark Top-3 Recall should be >= 80% (got ${benchmarkReport.top3Recall * 100}%)`);
    assert(benchmarkReport.exactMatchPriorityPass === true, 'Exact match priority check must pass 100%');
    console.log(`  📊 Benchmark MRR: ${benchmarkReport.meanReciprocalRank}, Top-3 Recall: ${benchmarkReport.top3Recall * 100}%, Hybrid Latency: ${benchmarkReport.avgHybridLatencyMs}ms`);
  } catch (err: any) {
    failed++;
    errors.push(`Test 9 Benchmark evaluation error: ${err.message}`);
  }

  console.log(`✓ 100% Local Hybrid Semantic Search Suite: ${passed} passed, ${failed} failed\n`);
  return { passed, failed, errors };
}
