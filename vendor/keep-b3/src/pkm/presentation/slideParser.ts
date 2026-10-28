import { SlideItem, SlideLayout, SlideThemeId, PRESENTATION_THEMES, PresentationTemplateType } from './presentationTypes';

/**
 * Extracts speaker notes from a raw slide chunk.
 * Supports:
 * - HTML comment syntax: <!-- note: ... --> or <!-- Notes: ... -->
 * - Explicit prefix syntax: Note: ... or Speaker Notes: ...
 */
export function extractSpeakerNotes(rawSlide: string): { cleanSlide: string; speakerNotes: string } {
  let notes: string[] = [];
  let workingSlide = rawSlide;

  // 1. Check for HTML comments: <!-- note: ... --> or <!-- Notes: ... -->
  const commentRegex = /<!--\s*(?:note|notes|speaker\s*notes?):\s*([\s\S]*?)-->/gi;
  let commentMatch: RegExpExecArray | null;
  while ((commentMatch = commentRegex.exec(workingSlide)) !== null) {
    notes.push(commentMatch[1].trim());
  }
  workingSlide = workingSlide.replace(commentRegex, '').trim();

  // 2. Check for trailing Note: or Speaker Notes: section
  const trailingNoteRegex = /(?:\n|^)(?:(?:>\s*)?(?:Note|Speaker\s*Notes?|Presenter\s*Notes?):\s*)([\s\S]*)$/i;
  const trailingMatch = workingSlide.match(trailingNoteRegex);
  if (trailingMatch) {
    notes.push(trailingMatch[1].trim());
    workingSlide = workingSlide.replace(trailingNoteRegex, '').trim();
  }

  return {
    cleanSlide: workingSlide,
    speakerNotes: notes.join('\n\n').trim(),
  };
}

/**
 * Detects the best slide layout from the content.
 */
export function detectSlideLayout(content: string, index: number): SlideLayout {
  const trimmed = content.trim();

  // Quote slide
  if (trimmed.startsWith('>') && !trimmed.includes('\n\n#')) {
    return 'quote';
  }

  // Split slide syntax: ::: col or ::: split or ::: left / ::: right
  if (
    trimmed.includes('::: split') ||
    trimmed.includes('::: col') ||
    (trimmed.includes('::: left') && trimmed.includes('::: right'))
  ) {
    return 'split';
  }

  // First slide title layout
  if (index === 0) {
    const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
    if (lines.length <= 4 && lines[0].startsWith('# ')) {
      return 'title';
    }
  }

  // Section divider layout
  const headingLines = trimmed.split('\n').filter(l => l.trim().startsWith('# '));
  const nonHeadingLines = trimmed.split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('#'));
  if (headingLines.length === 1 && nonHeadingLines.length <= 1) {
    return 'section';
  }

  return 'standard';
}

/**
 * Extracts bullet fragments for progressive slide reveal.
 */
export function extractFragments(content: string): string[] {
  const lines = content.split('\n');
  const bulletFragments: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      bulletFragments.push(trimmed.replace(/^[-*]\s+|\d+\.\s+/, ''));
    }
  }

  return bulletFragments;
}

/**
 * Parses raw markdown into structured slides.
 * If slide dividers (--- or \n--\n) are not present, intelligently splits by ## Headings.
 */
export function parseMarkdownToSlides(markdown: string): SlideItem[] {
  if (!markdown || !markdown.trim()) {
    return [
      {
        id: 'slide-0',
        index: 0,
        rawContent: '# Welcome to Slide Deck Studio\n\nAdd your ideas with `---` dividers.',
        title: 'Welcome to Slide Deck Studio',
        body: 'Add your ideas with `---` dividers.',
        speakerNotes: '',
        layout: 'title',
        fragments: [],
      },
    ];
  }

  let rawChunks: string[] = [];

  // Check if standard horizontal divider '---' exists (surrounded by newlines)
  if (/(?:^|\n)---\s*(?:\n|$)/.test(markdown)) {
    rawChunks = markdown
      .split(/(?:^|\n)---\s*(?:\n|$)/)
      .map(c => c.trim())
      .filter(c => c.length > 0);
  } else if (/(?:^|\n)##\s+/.test(markdown)) {
    // If no --- dividers, auto-split by ## Headings
    const lines = markdown.split('\n');
    let currentChunk: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith('## ') && currentChunk.length > 0) {
        rawChunks.push(currentChunk.join('\n').trim());
        currentChunk = [line];
      } else {
        currentChunk.push(line);
      }
    }
    if (currentChunk.length > 0) {
      rawChunks.push(currentChunk.join('\n').trim());
    }
  } else {
    // Single slide
    rawChunks = [markdown.trim()];
  }

  return rawChunks.map((chunk, index) => {
    const { cleanSlide, speakerNotes } = extractSpeakerNotes(chunk);
    const layout = detectSlideLayout(cleanSlide, index);
    const fragments = extractFragments(cleanSlide);

    // Extract title (first heading or first line)
    const lines = cleanSlide.split('\n');
    let title = `Slide ${index + 1}`;
    let bodyLines: string[] = [];

    const headingMatch = cleanSlide.match(/^#{1,4}\s+(.+)$/m);
    if (headingMatch) {
      title = headingMatch[1].trim();
      // Remove first matched heading line from body
      let found = false;
      for (const line of lines) {
        if (!found && line.match(/^#{1,4}\s+/)) {
          found = true;
          continue;
        }
        bodyLines.push(line);
      }
    } else {
      title = lines[0]?.trim() || `Slide ${index + 1}`;
      bodyLines = lines.slice(1);
    }

    let leftCol: string | undefined;
    let rightCol: string | undefined;

    if (layout === 'split') {
      const splitParts = cleanSlide.split(/:::\s*(?:col|right|left|split)/i);
      if (splitParts.length >= 2) {
        leftCol = splitParts[0].trim();
        rightCol = splitParts[1].trim();
      }
    }

    let quoteAuthor: string | undefined;
    if (layout === 'quote') {
      const authorMatch = cleanSlide.match(/(?:—|--|-)\s*([A-Za-z0-9\s.,]+)$/m);
      if (authorMatch) {
        quoteAuthor = authorMatch[1].trim();
      }
    }

    return {
      id: `slide-${index}`,
      index,
      rawContent: chunk,
      title,
      body: bodyLines.join('\n').trim(),
      speakerNotes,
      layout,
      fragments,
      leftColumn: leftCol,
      rightColumn: rightCol,
      quoteAuthor,
    };
  });
}

/**
 * Builds starter templates for quick presentation authoring.
 */
export function getPresentationTemplate(type: PresentationTemplateType): string {
  switch (type) {
    case 'pitch-deck':
      return `# Nexus Knowledge Engine
## The Unified Second Brain for High-Velocity Research & Creative Synthesis

Presented by Research & Architecture Team
<!-- note: Introduce the presentation, welcome investors and advisors. Highlight current fragmentation in note tools. -->

---

## The Core Problem
- Knowledge is fragmented across browser tabs, PDFs, and siloed note apps
- Context switching drains up to 40% of cognitive throughput daily
- Traditional tools force rigid folder hierarchies that choke organic discovery
- Linear notes fail to spark cross-domain creative synthesis

<!-- note: Emphasize personal pain points. Ask audience if they've ever lost an insightful thought between tools. -->

---

## The Breakthrough Solution
::: left
### Dynamic Atomic Zettelkasten
- Self-organizing bi-directional links
- Frictionless Luhmann indexing
- Zero-friction semantic recall
::: right
### Integrated Cognitive Suite
- Synchronized multi-note comparative matrix
- SuperMemo spaced incremental reading
- Deterministic FSRS-4.5 active recall
:::

<!-- note: Walk through the architectural diagram and the dual-engine approach. -->

---

> "Simplicity does not precede complexity, but follows it. The ultimate goal of thought is not storage, but effortless generation."
> — Systems Philosophy & Modern Cybernetics

<!-- note: Allow quote to linger for 3 seconds before advancing. -->

---

## Traction & Roadmap
1. **P1–P4**: Core Focus, Zettelkasten & Comparative Synthesis Engine
2. **P5–P8**: Voice Memos, Visual Mind Maps, Macros & Active Recall
3. **P9+**: Interactive Slide Deck Studio & Cross-Device Sync

<!-- note: Wrap up with next steps and open the floor for Q&A. -->`;

    case 'research-talk':
      return `# Emergent Synthesis in Complex Note Networks
## Quantitative Evaluation of Bi-directional Knowledge Topology

Department of Cognitive Computer Science
<!-- note: Thank the organizers and introduction committee. State thesis statement clearly. -->

---

## Hypothesis & Research Question
- How does non-linear hypertext linking alter knowledge retention rates?
- Can graph centrality predict unexpected breakthrough discoveries?
- What is the optimum density of atomic literature references?

<!-- note: Review the primary literature by Luhmann (1981) and Bush (1945). -->

---

## Experimental Methodology
- Monitored 10,000 interlinked research entries over 180 days
- Measured retrievability via spaced FSRS-4.5 intervals
- Compared isolated hierarchical folders against associative graphs

<!-- note: Highlight control groups and sample size validation. -->

---

## Key Results & Discussion
- **3.4x Faster Synthesis**: Cross-referencing occurred in <2 minutes vs 7 minutes
- **42% Retention Gain**: Active recall cues generated from note blocks
- **Zero Orphaned Notes**: Graph topology guided proactive backlinking

<!-- note: Direct audience to graph visualization on screen. -->`;

    case 'team-sync':
      return `# Weekly Product Engineering Sync
## Sprint Alignment, Metrics & Velocity Report

<!-- note: Welcome team, keep update brisk and actionable under 15 minutes. -->

---

## Completed This Sprint
- 🚀 Shipped P8 Active Recall & Flashcard Studio
- ⚡ Sub-millisecond graph query caching benchmarks
- 🛡️ Verified lossless backup & data recovery suite
- 🎨 Polished dark/light editorial theme contrast

<!-- note: Celebrate individual contributor wins. -->

---

## Focus for Upcoming Sprint
- 📑 Launching P9 Slide Deck & Presentation Studio
- 🛠️ Macro command palette shortcut optimizations
- 🔍 Enhanced regex query filtering

<!-- note: Ask leads for blocker escalations. -->`;

    case 'technical-architecture':
      return `# System Architecture & Data Topology
## Local-First, Zero-Knowledge Private Knowledge Engine

Engineering Architecture Review
<!-- note: State architecture goals: 100% offline-first, client-side encryption, sub-5ms latency. -->

---

## Architecture Principles
1. **Local-First Authoritative Storage**: Browser IndexedDB with deterministic journal
2. **Lossless Markdown Interoperability**: Human-readable text without proprietary lock-in
3. **Zero Telemetry & Private Compute**: 100% client-side vector search and graph analysis

<!-- note: Emphasize security posture and user sovereignty. -->

---

## Engine Hierarchy
::: left
### Storage & Graph Layer
- Tri-gram lexical index
- Bounded LRU cache eviction
- CRDT LWW sync convergence
::: right
### Cognitive Extensions
- Multi-pane comparative matrix
- FSRS-4.5 spaced review engine
- Instant slide deck renderer
:::

<!-- note: Take architecture questions now. -->`;
  }
}

/**
 * Generates a self-contained, standalone HTML presentation file.
 * Opens offline in any modern browser with full keyboard navigation and themes!
 */
export function exportStandaloneHtmlPresentation(
  deckTitle: string,
  slides: SlideItem[],
  themeId: SlideThemeId
): string {
  const theme = PRESENTATION_THEMES[themeId] || PRESENTATION_THEMES['obsidian-slate'];

  const slidesJson = JSON.stringify(
    slides.map(s => ({
      title: s.title,
      body: s.body,
      speakerNotes: s.speakerNotes,
      layout: s.layout,
      leftColumn: s.leftColumn,
      rightColumn: s.rightColumn,
      quoteAuthor: s.quoteAuthor,
    }))
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(deckTitle)} - Presentation Deck</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${theme.isDark ? '#0a0a0c' : '#f8f9fa'};
      color: ${theme.isDark ? '#f1f1f4' : '#1a1a1c'};
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      user-select: none;
    }
    .deck-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      position: relative;
    }
    .slide-card {
      width: 100%;
      max-width: 1100px;
      min-height: 580px;
      padding: 3.5rem;
      border-radius: 1.25rem;
      background: ${theme.isDark ? 'rgba(24, 24, 28, 0.95)' : '#ffffff'};
      border: 1px solid ${theme.isDark ? '#2e2e38' : '#e2e4e8'};
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, ${theme.isDark ? '0.5' : '0.1'});
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
    }
    h1 { font-size: 2.75rem; font-weight: 800; line-height: 1.2; margin-bottom: 1.5rem; color: ${theme.isDark ? '#ffffff' : '#0f172a'}; }
    h2 { font-size: 2.2rem; font-weight: 700; line-height: 1.25; margin-bottom: 1.25rem; }
    p, li { font-size: 1.35rem; line-height: 1.7; opacity: 0.92; margin-bottom: 0.75rem; }
    ul { list-style-position: inside; margin-top: 0.5rem; }
    blockquote {
      border-left: 6px solid #8b5cf6;
      padding-left: 1.5rem;
      font-size: 1.75rem;
      font-style: italic;
      line-height: 1.6;
      margin: 1.5rem 0;
      color: ${theme.isDark ? '#e2e8f0' : '#334155'};
    }
    .split-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-top: 1rem;
    }
    .split-col {
      padding: 1.5rem;
      border-radius: 0.75rem;
      background: ${theme.isDark ? '#141418' : '#f1f5f9'};
    }
    .footer-bar {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
      border-top: 1px solid ${theme.isDark ? '#222' : '#e2e8f0'};
      font-size: 0.95rem;
      opacity: 0.8;
    }
    .controls { display: flex; gap: 0.75rem; }
    button {
      background: ${theme.isDark ? '#2d2d38' : '#e2e8f0'};
      color: inherit;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover { opacity: 0.85; }
    .progress-line {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 4px;
      background: #8b5cf6;
      transition: width 0.3s ease;
    }
  </style>
</head>
<body>
  <div class="deck-container">
    <div class="slide-card" id="slideCard"></div>
    <div class="progress-line" id="progressBar"></div>
  </div>

  <div class="footer-bar">
    <span id="deckInfo">${escapeHtml(deckTitle)}</span>
    <span id="slideCounter">1 / 1</span>
    <div class="controls">
      <button onclick="prevSlide()">◀ Prev (Left)</button>
      <button onclick="nextSlide()">Next (Space / Right) ▶</button>
      <button onclick="toggleFullscreen()">⛶ Fullscreen</button>
    </div>
  </div>

  <script>
    const slides = ${slidesJson};
    let currentIdx = 0;

    function render() {
      const s = slides[currentIdx];
      const card = document.getElementById('slideCard');
      let html = '';

      if (s.layout === 'quote') {
        html += '<blockquote>' + escape(s.body || s.title) + '</blockquote>';
        if (s.quoteAuthor) {
          html += '<p style="text-align: right; font-weight: bold; margin-top: 1rem;">— ' + escape(s.quoteAuthor) + '</p>';
        }
      } else if (s.layout === 'split' && s.leftColumn && s.rightColumn) {
        html += '<h2>' + escape(s.title) + '</h2>';
        html += '<div class="split-grid">';
        html += '<div class="split-col">' + renderLines(s.leftColumn) + '</div>';
        html += '<div class="split-col">' + renderLines(s.rightColumn) + '</div>';
        html += '</div>';
      } else {
        html += '<h2>' + escape(s.title) + '</h2>';
        html += '<div>' + renderLines(s.body) + '</div>';
      }

      card.innerHTML = html;
      document.getElementById('slideCounter').textContent = (currentIdx + 1) + ' / ' + slides.length;
      document.getElementById('progressBar').style.width = (((currentIdx + 1) / slides.length) * 100) + '%';
    }

    function renderLines(text) {
      if (!text) return '';
      return text.split('\\n').map(line => {
        const t = line.trim();
        if (!t) return '';
        if (t.startsWith('- ') || t.startsWith('* ')) {
          return '<li>' + escape(t.substring(2)) + '</li>';
        }
        if (t.startsWith('### ')) {
          return '<h3 style=\"margin-top: 1rem; margin-bottom: 0.5rem;\">' + escape(t.substring(4)) + '</h3>';
        }
        return '<p>' + escape(t) + '</p>';
      }).join('');
    }

    function escape(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function nextSlide() {
      if (currentIdx < slides.length - 1) {
        currentIdx++;
        render();
      }
    }

    function prevSlide() {
      if (currentIdx > 0) {
        currentIdx--;
        render();
      }
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        prevSlide();
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    });

    render();
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
