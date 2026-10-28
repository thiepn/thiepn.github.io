import { commandRegistry } from '../commands/commandRegistry';
import {
  parseMarkdownToSlides,
  extractSpeakerNotes,
  detectSlideLayout,
  extractFragments,
  getPresentationTemplate,
  exportStandaloneHtmlPresentation,
} from '../presentation/slideParser';
import { PRESENTATION_THEMES } from '../presentation/presentationTypes';

export function runFeatureP9PresentationStudioTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      const err = `[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`;
      errors.push(err);
      console.error(err);
    }
  }

  // Gate 1: Command Registration & Discovery
  const cmd = commandRegistry.getCommand('tools:presentation-studio');
  assert(Boolean(cmd), 'tools:presentation-studio command is registered in commandRegistry');
  assert(Boolean(cmd?.title.includes('Presentation & Slide Deck')), 'Command title mentions Presentation & Slide Deck');
  assert(cmd?.shortcut === 'Alt+G', 'Command shortcut is Alt+G');
  assert(Boolean(cmd?.keywords.includes('p9')), 'Keywords include p9');
  assert(Boolean(cmd?.keywords.includes('slides')), 'Keywords include slides');
  assert(Boolean(cmd?.keywords.includes('marp')), 'Keywords include marp');
  assert(cmd?.category === 'Tools & Diagnostics', 'Command category is Tools & Diagnostics');

  // Gate 2: Explicit Slide Delimiter Parsing
  const rawDeck = `# Nexus Pitch Deck
Welcome investors.

---

## The Problem
- Fragmented notes
- Lost ideas

---

## The Solution
- Unified atomic graph
- Zero friction recall
`;

  const parsedSlides = parseMarkdownToSlides(rawDeck);
  assert(parsedSlides.length === 3, 'Splits 3 slides via --- dividers');
  assert(parsedSlides[0].title === 'Nexus Pitch Deck', 'First slide title is parsed correctly');
  assert(parsedSlides[1].title === 'The Problem', 'Second slide title is parsed correctly');
  assert(parsedSlides[2].title === 'The Solution', 'Third slide title is parsed correctly');

  // Gate 3: Auto-Splitting Markdown Notes without Delimiters
  const noteWithoutDelimiters = `# Deep Research Paper

Introduction to non-linear associative graphs.

## Background & Prior Art
Bush (1945) proposed the Memex.
Nelson (1965) coined Hypertext.

## Core Architecture
- Local-first IndexedDB
- Deterministic conflict-free CRDT
`;

  const autoSplitSlides = parseMarkdownToSlides(noteWithoutDelimiters);
  assert(autoSplitSlides.length === 3, 'Auto-splits 3 slides by initial title and ## Headings');
  assert(autoSplitSlides[0].title === 'Deep Research Paper', 'First auto-split section is document title');
  assert(autoSplitSlides[1].title === 'Background & Prior Art', 'Second auto-split section is Heading 2');
  assert(autoSplitSlides[2].title === 'Core Architecture', 'Third auto-split section is second Heading 2');

  // Gate 4: Speaker Notes Extraction
  const slideWithComments = `## Strategic Roadmap
- Q1 Launch
- Q2 Expansion

<!-- note: Remember to emphasize profitability before timeline -->
`;
  const extracted = extractSpeakerNotes(slideWithComments);
  assert(
    extracted.speakerNotes.includes('Remember to emphasize profitability'),
    'Extracts HTML comment speaker notes'
  );
  assert(!extracted.cleanSlide.includes('<!-- note:'), 'Removes note comment syntax from clean slide body');

  const slideWithTrailingNote = `## Architecture Decisions
- Eventual consistency
- Zero cloud reliance

Note: Explain why offline-first beats hosted DBs.
`;
  const extractedTrailing = extractSpeakerNotes(slideWithTrailingNote);
  assert(
    extractedTrailing.speakerNotes.includes('Explain why offline-first beats hosted DBs'),
    'Extracts trailing Note: block'
  );

  // Gate 5: Layout Detection
  const titleLayout = detectSlideLayout('# Big Idea\nSubtitle line', 0);
  assert(titleLayout === 'title', 'Detects title slide layout for index 0');

  const quoteLayout = detectSlideLayout('> "Knowledge is power."\n— Francis Bacon', 1);
  assert(quoteLayout === 'quote', 'Detects quote slide layout');

  const splitLayout = detectSlideLayout('## Comparative Analysis\n::: left\nOption A\n::: right\nOption B', 2);
  assert(splitLayout === 'split', 'Detects split two-column slide layout');

  // Gate 6: Bullet Fragment Detection
  const fragContent = `## Key Objectives
- First objective
- Second objective
* Third objective
1. Fourth objective`;
  const fragments = extractFragments(fragContent);
  assert(fragments.length === 4, 'Extracts 4 bullet fragments for step-by-step reveal');
  assert(fragments[0] === 'First objective', 'Clean fragment text without prefix');

  // Gate 7: Pre-Built Starter Templates
  const pitchTemplate = getPresentationTemplate('pitch-deck');
  assert(pitchTemplate.includes('Nexus Knowledge Engine'), 'Pitch deck template contains title');
  const techTemplate = getPresentationTemplate('technical-architecture');
  assert(techTemplate.includes('System Architecture'), 'Technical architecture template is valid');

  // Gate 8: Standalone HTML Presentation Compilation
  const compiledHtml = exportStandaloneHtmlPresentation(
    'My Test Presentation',
    parsedSlides,
    'obsidian-slate'
  );
  assert(compiledHtml.includes('<!DOCTYPE html>'), 'HTML export has DOCTYPE');
  assert(compiledHtml.includes('My Test Presentation'), 'HTML export contains deck title');
  assert(compiledHtml.includes('nextSlide()'), 'HTML export contains slide navigation scripts');
  assert(compiledHtml.includes('progressBar'), 'HTML export includes progress indicator');

  // Gate 9: Theme Registry
  assert(Boolean(PRESENTATION_THEMES['obsidian-slate']), 'Obsidian Slate theme exists');
  assert(Boolean(PRESENTATION_THEMES['editorial-ivory']), 'Editorial Ivory theme exists');
  assert(Boolean(PRESENTATION_THEMES['midnight-cyber']), 'Midnight Cyber theme exists');
  assert(Object.keys(PRESENTATION_THEMES).length === 6, 'Provides 6 distinct visual themes');

  return { passed, failed, errors };
}
