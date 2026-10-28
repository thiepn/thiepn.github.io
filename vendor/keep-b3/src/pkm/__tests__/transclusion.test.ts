import { Note } from '../../types';
import { buildVaultIndex, applyIncrementalNoteUpdate } from '../vaultIndex';
import {
  resolveTransclusion,
  extractSection,
  extractBlock,
  stripBlockIdsFromMarkdown,
  MAX_TRANSCLUSION_DEPTH,
} from '../transclusion';
import { parseNote } from '../parser';

interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
}

export function runTransclusionTests(): TestResult {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, desc: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`Assertion failed: ${desc}`);
    }
  }

  function assertEqual(actual: any, expected: any, desc: string) {
    if (actual === expected) {
      passed++;
    } else {
      failed++;
      errors.push(`Assertion failed: ${desc}. Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
    }
  }

  // Helpers to create mock notes
  let noteCounter = 0;
  function createNote(title: string, content: string, aliases: string[] = []): Note {
    noteCounter++;
    const finalContent =
      aliases.length > 0
        ? `---\naliases: [${aliases.join(', ')}]\n---\n${content}`
        : content;

    return {
      id: `note-trans-${noteCounter}`,
      title,
      content: finalContent,
      type: 'text',
      tags: [],
      checklist: [],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      reminderDate: null,
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ==========================================
  // 1. Complete Note Transclusion
  // ==========================================
  {
    const noteA = createNote('Architecture Overview', '# System Architecture\n\nThis is the core engine.\n- Item 1\n- Item 2');
    const noteB = createNote('Daily Journal', 'Today I read the architecture:\n![[Architecture Overview]]');

    const index = buildVaultIndex([noteA, noteB]);

    const res = resolveTransclusion('Architecture Overview', noteB.id, index);
    assertEqual(res.status, 'resolved', 'Complete note embed status should be resolved');
    assertEqual(res.embedType, 'note', 'Embed type should be note');
    assertEqual(res.targetNoteId, noteA.id, 'Target note ID should match');
    assertEqual(res.targetNoteTitle, 'Architecture Overview', 'Target note title should match');
    assert(res.content.includes('This is the core engine.'), 'Transcluded content should match note body');
  }

  // ==========================================
  // 2. Heading Extraction
  // ==========================================
  {
    const noteSource = createNote(
      'Deep Learning',
      `# Deep Learning Guide
Introduction to the guide.

## Transformers
Transformers use self-attention mechanisms.
They process entire sequences simultaneously.

## CNNs
Convolutional networks are used for vision.
`
    );
    const parentNote = createNote('AI Notes', 'Summary:\n![[Deep Learning#Transformers]]');

    const index = buildVaultIndex([noteSource, parentNote]);

    const res = resolveTransclusion('Deep Learning#Transformers', parentNote.id, index);
    assertEqual(res.status, 'resolved', 'Heading embed status should be resolved');
    assertEqual(res.embedType, 'section', 'Embed type should be section');
    assertEqual(res.heading?.text, 'Transformers', 'Heading text matches');
    assert(res.content.includes('Transformers use self-attention mechanisms.'), 'Contains transformer content');
    assert(!res.content.includes('Convolutional networks'), 'Stops before next heading CNNs');
  }

  // ==========================================
  // 3. Nested Headings Extraction
  // ==========================================
  {
    const noteSource = createNote(
      'Software Design',
      `# Top Level
Intro

## Microservices
Overview of microservices.

### Event-Driven
Events propagate state changes.

#### Kafka Details
Kafka uses partitioned logs.

### Service Mesh
Envoy sidecars handle routing.

## Monolith
Monolithic architecture overview.
`
    );
    const parentNote = createNote('Doc', 'Check microservices:\n![[Software Design#Microservices]]');

    const index = buildVaultIndex([noteSource, parentNote]);

    const res = resolveTransclusion('Software Design#Microservices', parentNote.id, index);
    assertEqual(res.status, 'resolved', 'Section embed should resolve');
    assert(res.content.includes('Overview of microservices.'), 'Includes H2 body');
    assert(res.content.includes('Events propagate state changes.'), 'Includes nested H3');
    assert(res.content.includes('Kafka uses partitioned logs.'), 'Includes nested H4');
    assert(res.content.includes('Envoy sidecars handle routing.'), 'Includes sibling nested H3');
    assert(!res.content.includes('Monolithic architecture overview.'), 'Excludes subsequent H2 Monolith');
  }

  // ==========================================
  // 4. Block Reference Extraction
  // ==========================================
  {
    const noteSource = createNote(
      'Quantum Computing',
      `# Quantum Physics
Quantum computers leverage superposition and entanglement.

Shor's algorithm can factor integers in polynomial time. ^shor-factor

Another unrelated paragraph.
`
    );
    const parentNote = createNote('Cryptography', 'Quantum threat:\n![[Quantum Computing#^shor-factor]]');

    const index = buildVaultIndex([noteSource, parentNote]);

    const res = resolveTransclusion('Quantum Computing#^shor-factor', parentNote.id, index);
    assertEqual(res.status, 'resolved', 'Block embed should resolve');
    assertEqual(res.embedType, 'block', 'Embed type should be block');
    assertEqual(res.block?.id, 'shor-factor', 'Block ID matches');
    assertEqual(
      res.content.trim(),
      "Shor's algorithm can factor integers in polynomial time.",
      'Block content extracted and stripped marker'
    );
  }

  // ==========================================
  // 5. Missing References Handling
  // ==========================================
  {
    const noteSource = createNote('Existing Note', '# Head A\nSome content.');
    const parentNote = createNote('Ref Note', 'Embeds');

    const index = buildVaultIndex([noteSource, parentNote]);

    // Missing note
    const resMissingNote = resolveTransclusion('Non Existent Note', parentNote.id, index);
    assertEqual(resMissingNote.status, 'missing_note', 'Reports missing_note status');

    // Missing heading in existing note
    const resMissingHead = resolveTransclusion('Existing Note#NonExistentHeading', parentNote.id, index);
    assertEqual(resMissingHead.status, 'missing_heading', 'Reports missing_heading status');

    // Missing block in existing note
    const resMissingBlock = resolveTransclusion('Existing Note#^non-existent-block', parentNote.id, index);
    assertEqual(resMissingBlock.status, 'missing_block', 'Reports missing_block status');
  }

  // ==========================================
  // 6. Ambiguous Resolution Handling
  // ==========================================
  {
    const note1 = createNote('Project Alpha', 'Alpha in folder 1');
    const note2 = createNote('Project Alpha', 'Alpha in folder 2');
    const parentNote = createNote('Tracker', 'Check: ![[Project Alpha]]');

    const index = buildVaultIndex([note1, note2, parentNote]);

    const res = resolveTransclusion('Project Alpha', parentNote.id, index);
    assertEqual(res.status, 'ambiguous', 'Reports ambiguous status when duplicate titles exist');
    assert(Boolean(res.candidates && res.candidates.length >= 2), 'Provides ambiguous candidate list');
  }

  // ==========================================
  // 7. Recursive Embeds & Cycle Detection
  // ==========================================
  {
    // A -> B -> A cycle
    const noteA = createNote('Note Alpha', 'Alpha embeds Beta:\n![[Note Beta]]');
    const noteB = createNote('Note Beta', 'Beta embeds Alpha:\n![[Note Alpha]]');

    const index = buildVaultIndex([noteA, noteB]);

    // Resolving Note Beta inside Note Alpha (depth 0)
    const resB = resolveTransclusion('Note Beta', noteA.id, index, {
      visitedChain: [noteA.id],
      depth: 0,
    });
    assertEqual(resB.status, 'resolved', 'First step in chain resolves');

    // Resolving Note Alpha inside Note Beta (cycle attempt)
    const resA = resolveTransclusion('Note Alpha', noteB.id, index, {
      visitedChain: [noteA.id, noteB.id],
      depth: 1,
    });
    assertEqual(resA.status, 'circular_dependency', 'Cycle detected when target note already visited');
    assert(Boolean(resA.cycleChain && resA.cycleChain.length > 0), 'Cycle chain provided');

    // Direct self embed (A -> A)
    const selfRes = resolveTransclusion('Note Alpha', noteA.id, index, {
      visitedChain: [noteA.id],
      depth: 0,
    });
    assertEqual(selfRes.status, 'circular_dependency', 'Direct self-embed immediately caught');
  }

  // ==========================================
  // 8. Max Depth Exceeded Protection
  // ==========================================
  {
    const note1 = createNote('L1', 'L1 body');
    const index = buildVaultIndex([note1]);

    const resMax = resolveTransclusion('L1', 'some-parent', index, {
      visitedChain: ['other-1', 'other-2', 'other-3', 'other-4'],
      depth: MAX_TRANSCLUSION_DEPTH,
    });
    assertEqual(resMax.status, 'max_depth_exceeded', 'Stops recursion at MAX_TRANSCLUSION_DEPTH');
  }

  // ==========================================
  // 9. Renamed Source Note Resolution
  // ==========================================
  {
    const noteSource = createNote('Original Title', '# Overview\nFirst draft content.');
    const parentNote = createNote('Index Page', '![[note:' + noteSource.id + ']]');

    const index = buildVaultIndex([noteSource, parentNote]);

    // Initial resolution
    const res1 = resolveTransclusion(`note:${noteSource.id}`, parentNote.id, index);
    assertEqual(res1.status, 'resolved', 'Resolves by note ID initially');

    // Rename source note
    noteSource.title = 'Renamed Master Title';
    applyIncrementalNoteUpdate(noteSource, noteSource.id, index);

    // Subsequent resolution reflects renamed note
    const res2 = resolveTransclusion(`note:${noteSource.id}`, parentNote.id, index);
    assertEqual(res2.status, 'resolved', 'Resolves by note ID after rename');
    assertEqual(res2.targetNoteTitle, 'Renamed Master Title', 'Reflects new title');
  }

  // ==========================================
  // 10. Live Source Note Updates (No Stale Content)
  // ==========================================
  {
    const noteSource = createNote('Sprint Goals', '# Current Sprint\n- Complete P1\n- Complete P2');
    const dashboardNote = createNote('Dashboard', 'Live Goals:\n![[Sprint Goals#Current Sprint]]');

    const index = buildVaultIndex([noteSource, dashboardNote]);

    // Check version 1
    const resV1 = resolveTransclusion('Sprint Goals#Current Sprint', dashboardNote.id, index);
    assert(resV1.content.includes('- Complete P2'), 'V1 content contains P2');
    assert(!resV1.content.includes('- Complete P3'), 'V1 content does not contain P3');

    // Update source note with new item
    noteSource.content = '# Current Sprint\n- Complete P1\n- Complete P2\n- Complete P3 (Transclusion)';
    applyIncrementalNoteUpdate(noteSource, noteSource.id, index);

    // Check version 2
    const resV2 = resolveTransclusion('Sprint Goals#Current Sprint', dashboardNote.id, index);
    assert(resV2.content.includes('- Complete P3 (Transclusion)'), 'V2 reflects updated source note');
  }

  // ==========================================
  // 11. Multiple Embeds in a Single Document
  // ==========================================
  {
    const noteA = createNote('Module A', 'Module A logic');
    const noteB = createNote('Module B', '# Architecture\nModule B architecture');
    const noteC = createNote('Module C', 'Paragraph C. ^key-stat');
    const masterDoc = createNote(
      'Master Spec',
      `## Overview
![[Module A]]

## Deep Dive
![[Module B#Architecture]]

## Key Stat
![[Module C#^key-stat]]
`
    );

    const index = buildVaultIndex([noteA, noteB, noteC, masterDoc]);

    const parsedMaster = parseNote(masterDoc);
    assertEqual(parsedMaster.embeds.length, 3, 'Parser identifies all 3 embeds');

    const resA = resolveTransclusion(parsedMaster.embeds[0].target, masterDoc.id, index);
    assertEqual(resA.status, 'resolved', 'Embed 1 resolves');

    const resB = resolveTransclusion(parsedMaster.embeds[1].target, masterDoc.id, index);
    assertEqual(resB.status, 'resolved', 'Embed 2 resolves');

    const resC = resolveTransclusion(parsedMaster.embeds[2].target, masterDoc.id, index);
    assertEqual(resC.status, 'resolved', 'Embed 3 resolves');
  }

  // ==========================================
  // 12. Block ID Stripping Utility
  // ==========================================
  {
    const textWithIds = `Line 1 with text ^my-block-1\nLine 2 without\nLine 3 at end ^block-2`;
    const stripped = stripBlockIdsFromMarkdown(textWithIds);
    assertEqual(
      stripped,
      `Line 1 with text\nLine 2 without\nLine 3 at end`,
      'Strips ^block-id markers cleanly from all lines'
    );
  }

  return { passed, failed, errors };
}
