import { Note } from '../../types';
import {
  buildLexicalIndex,
  computeAllLexicalRelatedness,
  computeLexicalRelatednessForDoc,
  tokenizeDocument,
  computeNoteContentHash,
} from '../lexicalRelatedness';
import { isStopWord, cleanAndFilterTokens } from '../stopWords';
import { cosineSimilarity } from '../embeddingsEngine';
import { semanticManager } from '../semanticManager';
import { DEFAULT_SEMANTIC_SETTINGS, SemanticSettings } from '../semanticTypes';

function createMockNote(partial: Partial<Note> & { id: string; title: string; content: string }): Note {
  return {
    type: 'text',
    color: 'default',
    tags: [],
    folderId: null,
    pinned: false,
    archived: false,
    trashed: false,
    checklist: [],
    images: [],
    reminderDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

export function runSemanticRelatednessTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`Assertion failed: ${msg}`);
      console.error(`  ✗ ${msg}`);
    }
  }

  // --- Test 1: Stop Word Filtering & Tokenizer ---
  try {
    assert(isStopWord('the') === true, 'Stopword "the" should be identified');
    assert(isStopWord('database') === false, 'Non-stopword "database" should not be identified');
    assert(isStopWord('a') === true, 'Stopword "a" should be identified');

    const filtered = cleanAndFilterTokens(['The', 'Distributed', 'Database', 'is', 'Fast', 'and', 'Scalable']);
    assert(
      filtered.includes('distributed') &&
        filtered.includes('database') &&
        filtered.includes('fast') &&
        filtered.includes('scalable'),
      'Stopwords filtered out and remaining tokens lowercased'
    );
    assert(!filtered.includes('the') && !filtered.includes('is') && !filtered.includes('and'), 'Stopwords successfully removed');
  } catch (e) {
    failed++;
    errors.push(`Test 1 threw error: ${e}`);
  }

  // --- Test 2: Field-Weighted Tokenization ---
  try {
    const testNote = createMockNote({
      id: 'note-1',
      title: 'Neural Networks Architecture',
      content: '# Deep Learning\nWe study neural networks and backpropagation for machine learning models.',
      tags: ['ai', 'deeplearning'],
    });

    const doc = tokenizeDocument(testNote);
    assert(doc.titleTokens.has('neural') && doc.titleTokens.has('network'), 'Title tokens parsed and stemmed');
    assert(doc.headingTokens.has('deep') && doc.headingTokens.has('learn'), 'Heading tokens parsed and stemmed');
    assert(doc.tagTokens.has('ai') && doc.tagTokens.has('deeplearn'), 'Tag tokens parsed and stemmed');
    assert(doc.allWeightedTokens.has('neural'), 'Weighted token frequency map populated');
    assert((doc.allWeightedTokens.get('neural') || 0) > 1, 'Field weighting increases term frequency for title matches');
  } catch (e) {
    failed++;
    errors.push(`Test 2 threw error: ${e}`);
  }

  // --- Test 3: Related vs Unrelated Notes ---
  try {
    const noteA = createMockNote({
      id: 'note-a',
      title: 'PostgreSQL Query Optimization',
      content: '# Database Indexing\nTechniques for improving Postgres SQL execution plans, B-Tree indexes, and buffer pool caching.',
      tags: ['postgres', 'database', 'sql'],
    });

    const noteB = createMockNote({
      id: 'note-b',
      title: 'Relational Database Performance Tuning',
      content: '# SQL Tuning\nBest practices for database index design, cache hit ratios, and SQL execution tuning in production.',
      tags: ['database', 'performance', 'sql'],
    });

    const noteC = createMockNote({
      id: 'note-c',
      title: 'French Sourdough Bread Recipe',
      content: '# Artisan Baking\nFlour, water, wild sourdough starter yeast, long cold fermentation, and Dutch oven baking crust.',
      tags: ['cooking', 'bread', 'baking'],
    });

    const testVault = [noteA, noteB, noteC];
    const settings: SemanticSettings = {
      ...DEFAULT_SEMANTIC_SETTINGS,
      threshold: 0.25,
    };

    const relations = computeAllLexicalRelatedness(testVault, settings, new Set<string>());

    // Verify Note A and Note B are inferred as related
    const relAB = relations.find(
      (r) => (r.sourceId === 'note-a' && r.targetId === 'note-b') || (r.sourceId === 'note-b' && r.targetId === 'note-a')
    );
    assert(!!relAB, 'Note A and Note B should be inferred as related due to high lexical and tag overlap');
    if (relAB) {
      assert(relAB.score >= 0.25, `Score between Note A and B should be high (got ${relAB.score})`);
      assert(relAB.sharedTerms && relAB.sharedTerms.includes('database'), 'Shared terms should include "database"');
    }

    // Verify Note C (Baking) is NOT related to Note A or Note B
    const relAC = relations.find(
      (r) => (r.sourceId === 'note-a' && r.targetId === 'note-c') || (r.sourceId === 'note-c' && r.targetId === 'note-a')
    );
    const relBC = relations.find(
      (r) => (r.sourceId === 'note-b' && r.targetId === 'note-c') || (r.sourceId === 'note-c' && r.targetId === 'note-b')
    );
    assert(!relAC, 'Note A (Postgres) and Note C (Sourdough) should not be related');
    assert(!relBC, 'Note B (Database) and Note C (Sourdough) should not be related');
  } catch (e) {
    failed++;
    errors.push(`Test 3 threw error: ${e}`);
  }

  // --- Test 4: Exclusion of Existing Explicit [[WikiLinks]] ---
  try {
    const noteX = createMockNote({
      id: 'note-x',
      title: 'Distributed Systems',
      content: 'Consensus protocols and [[Fault Tolerance Architecture]] in distributed systems.',
      tags: ['distributed'],
    });

    const noteY = createMockNote({
      id: 'note-y',
      title: 'Fault Tolerance Architecture',
      content: 'Designing distributed systems with Raft consensus and Byzantine fault tolerance.',
      tags: ['distributed'],
    });

    const existingLinks = new Set<string>(['note-x---note-y', 'note-y---note-x']);
    const relations = computeAllLexicalRelatedness([noteX, noteY], DEFAULT_SEMANTIC_SETTINGS, existingLinks);

    assert(relations.length === 0, 'Existing explicit links should not be duplicated as inferred semantic relations');
  } catch (e) {
    failed++;
    errors.push(`Test 4 threw error: ${e}`);
  }

  // --- Test 5: Tiny Notes & Near-Duplicates ---
  try {
    const tinyNote1 = createMockNote({
      id: 'tiny-1',
      title: 'Hi',
      content: 'ok',
      tags: [],
    });

    const tinyNote2 = createMockNote({
      id: 'tiny-2',
      title: 'Hello',
      content: 'yes',
      tags: [],
    });

    const tinyRelations = computeAllLexicalRelatedness([tinyNote1, tinyNote2], DEFAULT_SEMANTIC_SETTINGS, new Set());
    assert(tinyRelations.length === 0, 'Extremely short notes without meaningful vocabulary do not create false links');

    const duplicate1 = createMockNote({
      id: 'dup-1',
      title: 'Meeting Notes Monday Morning Standup',
      content: 'Discussed sprint goals, backend caching architecture, API latency benchmarks, and frontend release blockers.',
      tags: ['standup'],
    });

    const duplicate2 = createMockNote({
      id: 'dup-2',
      title: 'Meeting Notes Tuesday Morning Standup',
      content: 'Discussed sprint goals, backend caching architecture, API latency benchmarks, and frontend release progress.',
      tags: ['standup'],
    });

    const dupRelations = computeAllLexicalRelatedness([duplicate1, duplicate2], DEFAULT_SEMANTIC_SETTINGS, new Set());
    assert(dupRelations.length > 0, 'Near-duplicate notes should be identified with strong relatedness');
    if (dupRelations.length > 0) {
      assert(dupRelations[0].score > 0.6, 'Near-duplicate notes have high match score (> 60%)');
    }
  } catch (e) {
    failed++;
    errors.push(`Test 5 threw error: ${e}`);
  }

  // --- Test 6: Vector Math & Cosine Similarity ---
  try {
    const vA = [1, 0, 0];
    const vB = [1, 0, 0];
    const vC = [0, 1, 0];
    const vD = [0.7071, 0.7071, 0];

    assert(Math.abs(cosineSimilarity(vA, vB) - 1.0) < 0.001, 'Identical vectors have cosine similarity of 1.0');
    assert(Math.abs(cosineSimilarity(vA, vC) - 0.0) < 0.001, 'Orthogonal vectors have cosine similarity of 0.0');
    assert(Math.abs(cosineSimilarity(vA, vD) - 0.7071) < 0.01, '45-degree vectors have cosine similarity of ~0.707');
  } catch (e) {
    failed++;
    errors.push(`Test 6 threw error: ${e}`);
  }

  // --- Test 7: Large Synthetic Scale Test (1,000 notes) ---
  try {
    const syntheticNotes: Note[] = [];
    const topics = [
      { name: 'database', terms: ['sql', 'postgres', 'index', 'query', 'btree', 'acid', 'transaction'] },
      { name: 'react', terms: ['component', 'hook', 'state', 'props', 'render', 'jsx', 'virtualdom'] },
      { name: 'machinelearning', terms: ['neural', 'model', 'weights', 'loss', 'gradient', 'tensor', 'embedding'] },
      { name: 'devops', terms: ['docker', 'kubernetes', 'container', 'cluster', 'ingress', 'ci', 'pipeline'] },
      { name: 'cryptography', terms: ['cipher', 'hash', 'rsa', 'aes', 'publickey', 'signature', 'encryption'] },
    ];

    const startTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      const topic = topics[i % topics.length];
      const selectedTerms = topic.terms.slice(0, 3 + (i % 4));
      syntheticNotes.push(
        createMockNote({
          id: `synth-${i}`,
          title: `${topic.name.toUpperCase()} Note ${i}`,
          content: `# Guide ${i}\nExploring ${selectedTerms.join(' and ')} in production systems with high throughput.`,
          tags: [topic.name],
        })
      );
    }

    const index = buildLexicalIndex(syntheticNotes);
    const indexTime = performance.now() - startTime;
    assert(Object.keys(index.documents).length === 1000, 'Synthetic index indexed 1,000 documents');
    assert(indexTime < 350, `1,000 notes indexed in < 350ms (took ${indexTime.toFixed(1)}ms)`);

    // Test querying single note neighbors in large vault
    const queryStart = performance.now();
    const neighbors = computeLexicalRelatednessForDoc(
      syntheticNotes[0].id,
      index,
      0.25,
      5,
      new Set<string>()
    );
    const queryTime = performance.now() - queryStart;

    assert(neighbors.length > 0 && neighbors.length <= 5, 'Candidate neighbors correctly bounded by maxNeighbors limit');
    assert(queryTime < 75, `Single node neighbor search in 1k vault took < 75ms (took ${queryTime.toFixed(1)}ms)`);

    // Ensure all top neighbors share the same topic
    const topNeighborNote = syntheticNotes.find((n) => n.id === neighbors[0].targetId);
    assert(topNeighborNote?.tags.includes('database') === true, 'Top neighbor in synthetic cluster belongs to same domain');
  } catch (e) {
    failed++;
    errors.push(`Test 7 threw error: ${e}`);
  }

  // --- Test 8: SemanticManager Settings & Subscription ---
  try {
    const current = semanticManager.getSettings();
    assert(current.threshold >= 0.1 && current.threshold <= 1.0, 'Valid default threshold');

    let notified = false;
    const unsub = semanticManager.subscribe(() => {
      notified = true;
    });

    semanticManager.updateSettings({ threshold: 0.42 });
    assert(semanticManager.getSettings().threshold === 0.42, 'Settings updated');
    assert(notified, 'Subscriber notified of settings change');

    unsub();
    // Restore default
    semanticManager.updateSettings({ threshold: DEFAULT_SEMANTIC_SETTINGS.threshold });
  } catch (e) {
    failed++;
    errors.push(`Test 8 threw error: ${e}`);
  }

  return { passed, failed, errors };
}
