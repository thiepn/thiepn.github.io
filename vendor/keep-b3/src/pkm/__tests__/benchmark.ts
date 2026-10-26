import { Note } from '../../types';
import { buildVaultIndex, applyIncrementalNoteUpdate } from '../vaultIndex';
import { PKMResolver } from '../resolver';
import { parseNote } from '../parser';

/**
 * Generates a realistic synthetic vault with N notes
 */
export function generateSyntheticVault(noteCount: number): Note[] {
  const notes: Note[] = [];
  const tagPool = [
    'engineering',
    'product',
    'design',
    'architecture',
    'frontend',
    'backend',
    'database',
    'infra',
    'notes/daily',
    'ideas',
  ];

  for (let i = 0; i < noteCount; i++) {
    const id = `synth-note-${i}`;
    const title = `Synthetic Topic ${i}`;

    // Select random links to existing notes
    const linkCount = Math.min(i, Math.floor(Math.random() * 5) + 1);
    const linkTargets: string[] = [];
    for (let l = 0; l < linkCount; l++) {
      const targetIdx = Math.floor(Math.random() * Math.max(1, i));
      if (targetIdx !== i) {
        linkTargets.push(`Synthetic Topic ${targetIdx}`);
      }
    }

    const assignedTags = [
      tagPool[i % tagPool.length],
      tagPool[(i * 3) % tagPool.length],
    ];

    const content = `---
aliases: [Alias-${i}-A, Alias-${i}-B]
tags: [${assignedTags.join(', ')}]
---

# ${title}

This is a synthetic PKM test document representing node ${i} in the knowledge graph.

## Architecture Section
Here we discuss technical requirements. Refer to ${linkTargets.map((t) => `[[${t}]]`).join(' and ')}.

And an embed transclusion:
![[Synthetic Topic ${Math.floor(Math.random() * Math.max(1, i))}#Key Points]]

### Implementation Block
Paragraph with block identifier for granular referencing. ^block-${i}

\`\`\`typescript
// Code snippet inside document
function computeNode_${i}() {
  return ${i} * 42;
}
\`\`\`

$$f(x) = x^2 + ${i}$$
`;

    notes.push({
      id,
      title,
      content,
      type: 'text',
      checklist: [],
      color: 'default',
      tags: assignedTags,
      folderId: i % 5 === 0 ? `folder-${i % 4}` : null,
      pinned: i % 20 === 0,
      archived: false,
      trashed: false,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - i * 1800000).toISOString(),
      reminderDate: null,
      images: [],
    });
  }

  return notes;
}

export interface BenchmarkResult {
  scale: number;
  totalBuildTimeMs: number;
  avgParseTimePerNoteMs: number;
  incrementalUpdateP50Ms: number;
  incrementalUpdateP95Ms: number;
  incrementalUpdateMaxMs: number;
  resolutionLookupsPerSec: number;
  totalLinksCount: number;
  totalBacklinksCount: number;
}

/**
 * Runs performance benchmark on a given scale
 */
export function benchmarkScale(scale: number): BenchmarkResult {
  const notes = generateSyntheticVault(scale);

  // 1. Benchmark full vault index build
  const buildStart = performance.now();
  const index = buildVaultIndex(notes);
  const buildEnd = performance.now();
  const totalBuildTimeMs = buildEnd - buildStart;
  const avgParseTimePerNoteMs = totalBuildTimeMs / scale;

  // Count total links & backlinks
  let totalLinksCount = 0;
  let totalBacklinksCount = 0;
  for (const targets of Object.values(index.forwardLinks)) {
    totalLinksCount += targets.length;
  }
  for (const blList of Object.values(index.backlinks)) {
    totalBacklinksCount += blList.length;
  }

  // 2. Benchmark incremental updates (50 sample mutations across the vault)
  const sampleIterations = Math.min(scale, 50);
  const incrementalLatencies: number[] = [];

  for (let i = 0; i < sampleIterations; i++) {
    const targetIdx = Math.floor(Math.random() * scale);
    const originalNote = notes[targetIdx];

    const mutatedNote: Note = {
      ...originalNote,
      content: originalNote.content + `\n\nAppended line with link to [[Synthetic Topic 0]] ^mut-${i}`,
      updatedAt: new Date().toISOString(),
    };

    const incStart = performance.now();
    applyIncrementalNoteUpdate(mutatedNote, originalNote.id, index);
    const incEnd = performance.now();

    incrementalLatencies.push(incEnd - incStart);
  }

  incrementalLatencies.sort((a, b) => a - b);
  const p50Idx = Math.floor(incrementalLatencies.length * 0.5);
  const p95Idx = Math.floor(incrementalLatencies.length * 0.95);

  const incrementalUpdateP50Ms = incrementalLatencies[p50Idx] || 0;
  const incrementalUpdateP95Ms = incrementalLatencies[p95Idx] || 0;
  const incrementalUpdateMaxMs = incrementalLatencies[incrementalLatencies.length - 1] || 0;

  // 3. Benchmark Link Resolution Throughput (10,000 queries)
  const queryCount = 10000;
  const resStart = performance.now();
  for (let q = 0; q < queryCount; q++) {
    const queryIdx = q % scale;
    PKMResolver.resolveLink(`Synthetic Topic ${queryIdx}#Architecture Section`, index);
  }
  const resEnd = performance.now();
  const resDurationSec = (resEnd - resStart) / 1000;
  const resolutionLookupsPerSec = Math.round(queryCount / resDurationSec);

  return {
    scale,
    totalBuildTimeMs: Math.round(totalBuildTimeMs * 100) / 100,
    avgParseTimePerNoteMs: Math.round(avgParseTimePerNoteMs * 1000) / 1000,
    incrementalUpdateP50Ms: Math.round(incrementalUpdateP50Ms * 1000) / 1000,
    incrementalUpdateP95Ms: Math.round(incrementalUpdateP95Ms * 1000) / 1000,
    incrementalUpdateMaxMs: Math.round(incrementalUpdateMaxMs * 1000) / 1000,
    resolutionLookupsPerSec,
    totalLinksCount,
    totalBacklinksCount,
  };
}
