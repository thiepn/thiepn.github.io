import { Note } from '../../types';

export type SynthesisTemplateType = 'literature' | 'tradeoff' | 'consensus' | 'synthesis';

/**
 * Extracts all tags shared across at least 2 of the provided notes
 */
export function getSharedTags(notes: Note[]): string[] {
  if (notes.length < 2) return [];

  const tagCounts = new Map<string, number>();
  for (const n of notes) {
    const uniqueTags = new Set((n.tags || []).map((t) => t.toLowerCase().replace(/^#/, '')));
    for (const tag of uniqueTags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const shared: string[] = [];
  for (const [tag, count] of tagCounts.entries()) {
    if (count >= 2) shared.push(tag);
  }
  return shared.sort();
}

/**
 * Extracts wikilinks ([[Target]]) that appear in at least 2 of the provided notes
 */
export function getSharedWikilinks(notes: Note[]): string[] {
  if (notes.length < 2) return [];

  const wikiRegex = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
  const linkCounts = new Map<string, number>();

  for (const n of notes) {
    const uniqueInNote = new Set<string>();
    const text = `${n.content || ''}`;
    let match: RegExpExecArray | null;
    while ((match = wikiRegex.exec(text)) !== null) {
      uniqueInNote.add(match[1].trim());
    }

    for (const link of uniqueInNote) {
      const lower = link.toLowerCase();
      linkCounts.set(lower, (linkCounts.get(lower) || 0) + 1);
    }
  }

  const shared: string[] = [];
  for (const [link, count] of linkCounts.entries()) {
    if (count >= 2) shared.push(link);
  }
  return shared.sort();
}

/**
 * Formats a blockquote snippet with source attribution backlink
 */
export function formatQuoteSnippet(noteTitle: string, excerpt: string): string {
  const cleanExcerpt = excerpt.trim();
  const quoteLines = cleanExcerpt.split('\n').map((l) => `> ${l}`).join('\n');
  return `${quoteLines}\n> — *from [[${noteTitle}]]*\n\n`;
}

/**
 * Generates an initial structured markdown synthesis draft
 */
export function generateComparativeOutline(
  notes: Note[],
  templateType: SynthesisTemplateType = 'synthesis'
): string {
  const noteLinks = notes.map((n) => `[[${n.title}]]`).join(', ');
  const today = new Date().toISOString().slice(0, 10);

  if (templateType === 'tradeoff') {
    return `# Trade-off Analysis & Decision Matrix (${today})\n\n**Compared Documents:** ${noteLinks}\n\n## 1. Options Evaluated\n${notes
      .map((n) => `### ${n.title}\n* **Core Strengths:**\n* **Risks & Drawbacks:**\n* **Resource Costs:**\n`)
      .join('\n')}\n## 2. Direct Side-by-Side Comparison\n| Criteria | ${notes.map((n) => n.title).join(' | ')} |\n| --- | ${notes.map(() => '---').join(' | ')} |\n| Complexity | | |\n| Impact | | |\n| Feasibility | | |\n\n## 3. Final Recommendation\n`;
  }

  if (templateType === 'literature') {
    return `# Literature Comparative Synthesis (${today})\n\n**Source Works:** ${noteLinks}\n\n## 1. Divergent Hypotheses & Perspectives\n${notes
      .map((n) => `* **[[${n.title}]]:** [Summary of author's stance]\n`)
      .join('')}\n## 2. Points of Concordance (Agreement)\n* \n\n## 3. Critical Tension & Unresolved Debates\n* \n\n## 4. Synthesized Unified Thesis\n`;
  }

  if (templateType === 'consensus') {
    return `# Stakeholder & Consensus Matrix (${today})\n\n**Inputs Analyzed:** ${noteLinks}\n\n## 1. Key Alignment Points\n* \n\n## 2. Open Contradictions & Action Items\n* [ ] \n\n## 3. Agreed Direction & Next Steps\n`;
  }

  // Default synthesis
  return `# Multi-Note Synthesis & Conceptual Integration (${today})\n\n**Integrated Notes:** ${noteLinks}\n\n## 1. Executive Synthesis\n[Brief summary harmonizing the insights across all source documents]\n\n## 2. Emergent Insights & Patterns\n* \n\n## 3. Key Extracted Arguments & Citations\n\n\n## 4. Open Questions & Future Inquiries\n* \n`;
}
