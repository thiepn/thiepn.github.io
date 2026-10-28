import React, { memo } from 'react';

/**
 * Extracts individual keywords/phrases to highlight from a search query.
 * Strips filter operator prefixes (e.g. is:, type:, has:, month:, before:, after:, color:).
 */
export function extractHighlightTerms(query: string): string[] {
  if (!query || !query.trim()) return [];
  const terms: string[] = [];
  const tokens = query.trim().split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // Skip structural/boolean filters that don't match literal text content
    if (
      lower.startsWith('is:') ||
      lower.startsWith('type:') ||
      lower.startsWith('has:') ||
      lower.startsWith('month:') ||
      lower.startsWith('before:') ||
      lower.startsWith('after:') ||
      lower.startsWith('color:')
    ) {
      continue;
    }

    if (lower.startsWith('#')) {
      const clean = token.slice(1).trim();
      if (clean) terms.push(clean);
    } else if (lower.startsWith('tag:')) {
      const clean = token.slice(4).trim();
      if (clean) terms.push(clean);
    } else if (lower.startsWith('in:')) {
      const clean = token.slice(3).trim();
      if (clean) terms.push(clean);
    } else if (lower.startsWith('folder:')) {
      const clean = token.slice(7).trim();
      if (clean) terms.push(clean);
    } else {
      terms.push(token);
    }
  }

  // Remove duplicates and sort descending by length so longer phrases match first
  return Array.from(new Set(terms.filter((t) => t.length > 0))).sort(
    (a, b) => b.length - a.length
  );
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface HighlightTextProps {
  text: string;
  searchQuery?: string;
  highlightTerms?: string[];
  className?: string;
}

/**
 * Renders text with yellow highlights over matching search query terms.
 */
export const HighlightText: React.FC<HighlightTextProps> = memo(({
  text,
  searchQuery,
  highlightTerms,
  className = '',
}) => {
  if (!text) return null;

  const terms = highlightTerms || (searchQuery ? extractHighlightTerms(searchQuery) : []);

  if (!terms || terms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  try {
    const escapedTerms = terms.map(escapeRegExp);
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span className={className}>
        {parts.map((part, idx) => {
          const isMatch = terms.some(
            (t) => t.toLowerCase() === part.toLowerCase()
          );

          if (isMatch) {
            return (
              <mark
                key={idx}
                className="bg-yellow-200 dark:bg-yellow-400/40 text-stone-950 dark:text-yellow-100 font-semibold px-0.5 py-0.2 rounded-xs shadow-xs"
              >
                {part}
              </mark>
            );
          }

          return <React.Fragment key={idx}>{part}</React.Fragment>;
        })}
      </span>
    );
  } catch {
    return <span className={className}>{text}</span>;
  }
});
