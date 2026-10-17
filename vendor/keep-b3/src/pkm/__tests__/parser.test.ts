import { parseNote, slugify, parseFrontmatter, extractSearchableText } from '../parser';
import { Note } from '../../types';

export function runParserTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`FAIL: ${testName}`);
    }
  }

  // 1. Basic Wiki Links and Aliases
  {
    const note: Note = {
      id: 'n1',
      title: 'Note 1',
      content: 'Here is a link to [[Project Roadmap]] and an alias [[Design Doc|Custom Label]] in text.',
      type: 'text',
      checklist: [],
      color: 'default',
      tags: [],
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-08-31T00:00:00Z',
      updatedAt: '2026-08-31T00:00:00Z',
      reminderDate: null,
      images: [],
    };

    const parsed = parseNote(note);
    assert(parsed.outgoingLinks.length === 2, 'Extracts 2 outgoing wiki links');
    assert(parsed.outgoingLinks[0].target === 'Project Roadmap', 'First link target correct');
    assert(parsed.outgoingLinks[1].target === 'Design Doc', 'Second link target correct');
    assert(parsed.outgoingLinks[1].alias === 'Custom Label', 'Alias extracted properly');
  }

  // 2. Links and Tags inside Code Blocks MUST be Ignored
  {
    const note: Note = {
      id: 'n2',
      title: 'Code Note',
      content: `
Normal link: [[Real Note]]
Normal tag: #realtag

\`\`\`javascript
// This should NOT be a link or tag
const link = "[[Fake Note]]";
const tag = "#faketag";
\`\`\`

Inline code \`[[Fake Inline]]\` and \`#fakeinlinetag\` should be ignored.

~~~python
# Even with tildes
[[Another Fake]]
~~~
`,
      type: 'text',
      checklist: [],
      color: 'default',
      tags: [],
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-08-31T00:00:00Z',
      updatedAt: '2026-08-31T00:00:00Z',
      reminderDate: null,
      images: [],
    };

    const parsed = parseNote(note);
    assert(parsed.outgoingLinks.length === 1, 'Only 1 real link extracted, code links ignored');
    assert(parsed.outgoingLinks[0].target === 'Real Note', 'Correct real link target');
    assert(parsed.tags.includes('realtag'), 'Real tag included');
    assert(!parsed.tags.includes('faketag'), 'Fenced code tag ignored');
    assert(!parsed.tags.includes('fakeinlinetag'), 'Inline code tag ignored');
    assert(parsed.codeBlocks.length === 2, 'Extracted 2 code blocks');
  }

  // 3. Headings and Hierarchy Tree
  {
    const note: Note = {
      id: 'n3',
      title: 'Architecture Spec',
      content: `
# Overview
Some overview text.

## Database Layer
DB details here.

### IndexedDB Storage
IndexedDB specific details.

## Network & Sync
Sync details.
`,
      type: 'text',
      checklist: [],
      color: 'default',
      tags: [],
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-08-31T00:00:00Z',
      updatedAt: '2026-08-31T00:00:00Z',
      reminderDate: null,
      images: [],
    };

    const parsed = parseNote(note);
    assert(parsed.headings.length === 4, 'Parsed 4 headings');
    assert(parsed.headings[0].slug === 'overview', 'Slug generated correctly');
    assert(parsed.headings[1].slug === 'database-layer', 'Slug generated correctly');
    assert(parsed.headingTree.length === 1, 'Top-level root heading node');
    assert(parsed.headingTree[0].children.length === 2, 'Root has 2 H2 children');
    assert(parsed.headingTree[0].children[0].children.length === 1, 'First H2 has 1 H3 child');
  }

  // 4. Transclusions / Embeds with Subpaths & Blocks
  {
    const note: Note = {
      id: 'n4',
      title: 'Dashboard Note',
      content: `
Here is a transclusion:
![[Meeting Notes#Action Items]]

And a block embed:
![[Sprint Plan#^task-99]]

Regular paragraph with block id at the end. ^arch-block-1
`,
      type: 'text',
      checklist: [],
      color: 'default',
      tags: [],
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-08-31T00:00:00Z',
      updatedAt: '2026-08-31T00:00:00Z',
      reminderDate: null,
      images: [],
    };

    const parsed = parseNote(note);
    assert(parsed.embeds.length === 2, 'Extracted 2 embeds');
    assert(parsed.embeds[0].target === 'Meeting Notes', 'Embed 1 target correct');
    assert(parsed.embeds[0].subpath?.type === 'heading', 'Embed 1 is heading subpath');
    assert(parsed.embeds[0].subpath?.target === 'Action Items', 'Embed 1 subpath target correct');
    assert(parsed.embeds[1].subpath?.type === 'block', 'Embed 2 is block subpath');
    assert(parsed.embeds[1].subpath?.target === 'task-99', 'Embed 2 block ID correct');
    assert(parsed.blocks.length === 1, 'Extracted 1 block ID in content');
    assert(parsed.blocks[0].id === 'arch-block-1', 'Block ID matches');
  }

  // 5. Frontmatter parsing
  {
    const note: Note = {
      id: 'n5',
      title: 'Frontmatter Note',
      content: `---
title: Custom Frontmatter Title
aliases: [Alias One, Alias Two]
tags: [work, project/alpha]
author: Alice
---

# Actual Body
Content after frontmatter.
`,
      type: 'text',
      checklist: [],
      color: 'default',
      tags: ['external-tag'],
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-08-31T00:00:00Z',
      updatedAt: '2026-08-31T00:00:00Z',
      reminderDate: null,
      images: [],
    };

    const parsed = parseNote(note);
    assert(parsed.aliases.includes('Alias One'), 'Alias One extracted from frontmatter');
    assert(parsed.aliases.includes('Alias Two'), 'Alias Two extracted from frontmatter');
    assert(parsed.tags.includes('work'), 'Frontmatter tag work included');
    assert(parsed.tags.includes('project/alpha'), 'Frontmatter nested tag included');
    assert(parsed.tags.includes('external-tag'), 'Note object tag merged');
    assert(parsed.headings.length === 1, 'Heading parsed after frontmatter');
    assert(parsed.headings[0].text === 'Actual Body', 'Heading text matches');
  }

  // 6. Math and Query Blocks
  {
    const note: Note = {
      id: 'n6',
      title: 'Math & Queries',
      content: `
$$E = mc^2$$

Inline math is $a^2 + b^2 = c^2$.

\`\`\`query
tag:ideas sort:created
\`\`\`

\`\`\`mermaid
graph TD
A --> B
\`\`\`
`,
      type: 'text',
      checklist: [],
      color: 'default',
      tags: [],
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-08-31T00:00:00Z',
      updatedAt: '2026-08-31T00:00:00Z',
      reminderDate: null,
      images: [],
    };

    const parsed = parseNote(note);
    assert(parsed.mathBlocks.length >= 2, 'Extracted math blocks');
    assert(parsed.codeBlocks.some((c) => c.type === 'query'), 'Extracted query block');
    assert(parsed.codeBlocks.some((c) => c.type === 'mermaid'), 'Extracted mermaid block');
  }

  return { passed, failed, errors };
}
