import React, { useState, useEffect, useMemo } from 'react';
import {
  CitationStyleKey,
  SUPPORTED_CITATION_STYLES,
  Reference,
} from '../referenceTypes';
import { extractCitations } from '../citationParser';
import { formatBibliographyEntry } from '../citationFormatter';
import { referenceStorageService } from '../referenceStorageService';
import { BookOpen, Copy, Check, SlidersHorizontal, AlertCircle } from 'lucide-react';

interface BibliographyBlockViewProps {
  code: string; // The content inside the ```bibliography block
  sourceNoteContent?: string; // The full markdown of the current note
  onOpenReference?: (referenceId: string) => void;
}

export const BibliographyBlockView: React.FC<BibliographyBlockViewProps> = ({
  code,
  sourceNoteContent = '',
  onOpenReference,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<CitationStyleKey>('apa');
  const [version, setVersion] = useState(0);

  // Subscribe to reference changes
  useEffect(() => {
    const unsub = referenceStorageService.subscribe(() => {
      setVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  // Parse block options (e.g. style: apa)
  const parsedStyle: CitationStyleKey = useMemo(() => {
    const lines = (code || '').split('\n');
    for (const line of lines) {
      const match = line.match(/^style\s*:\s*([a-zA-Z0-9_-]+)/i);
      if (match) {
        const styleName = match[1].toLowerCase() as CitationStyleKey;
        if (SUPPORTED_CITATION_STYLES.some((s) => s.key === styleName)) {
          return styleName;
        }
      }
    }
    return selectedStyle;
  }, [code, selectedStyle]);

  // Extract all citations from note content
  const uniqueCitationKeys = useMemo(() => {
    if (!sourceNoteContent) return [];
    const { citations } = extractCitations(sourceNoteContent);
    const set = new Set<string>();
    for (const c of citations) {
      set.add(c.citationKey.toLowerCase());
    }
    return Array.from(set);
  }, [sourceNoteContent]);

  // Resolve references
  const resolvedEntries: Array<{ key: string; reference?: Reference; formatted: string }> = useMemo(() => {
    const list: Array<{ key: string; reference?: Reference; formatted: string }> = [];
    let ieeeCounter = 1;

    for (const key of uniqueCitationKeys) {
      const ref = referenceStorageService.getReferenceByCitationKey(key);
      if (ref) {
        const formatted = formatBibliographyEntry(ref, parsedStyle, parsedStyle === 'ieee' ? ieeeCounter : undefined);
        list.push({ key, reference: ref, formatted });
        ieeeCounter++;
      } else {
        list.push({
          key,
          formatted: `[Missing citation: ${key}]`,
        });
      }
    }

    // Sort entries alphabetically unless IEEE numeric style
    if (parsedStyle !== 'ieee') {
      list.sort((a, b) => a.formatted.localeCompare(b.formatted));
    }

    return list;
  }, [uniqueCitationKeys, parsedStyle, version]);

  const handleCopyBibliography = async () => {
    const plainText = resolvedEntries.map((e, idx) => {
      // Strip markdown asterisks for clean text copy
      return e.formatted.replace(/\*/g, '');
    }).join('\n\n');

    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (uniqueCitationKeys.length === 0) {
    return (
      <div className="my-4 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 text-xs text-stone-500">
        <div className="flex items-center gap-2 mb-1 text-stone-700 dark:text-stone-300 font-semibold">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span>Bibliography</span>
        </div>
        <p className="text-[11px] text-stone-400">
          No citations found in this note. Add citations like <code className="px-1 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-mono text-[10px]">[@citationKey]</code> to automatically generate a bibliography list.
        </p>
      </div>
    );
  }

  return (
    <div className="my-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 overflow-hidden shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-stone-100 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 text-xs">
        <div className="flex items-center gap-2 font-bold text-stone-800 dark:text-stone-200">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span>Bibliography</span>
          <span className="px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-700 text-[10px] font-mono text-stone-600 dark:text-stone-400 font-medium">
            {resolvedEntries.length} {resolvedEntries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Style Selector */}
          <div className="flex items-center gap-1 text-[11px] text-stone-500">
            <SlidersHorizontal className="w-3 h-3 text-stone-400" />
            <select
              value={parsedStyle}
              onChange={(e) => setSelectedStyle(e.target.value as CitationStyleKey)}
              className="bg-transparent border-0 text-stone-700 dark:text-stone-300 font-medium cursor-pointer focus:ring-0 text-[11px] pr-2 py-0.5"
              title="Change bibliography citation style"
            >
              {SUPPORTED_CITATION_STYLES.map((style) => (
                <option key={style.key} value={style.key} className="bg-stone-100 dark:bg-stone-800">
                  {style.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleCopyBibliography}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 font-medium text-[11px] transition-colors"
            title="Copy bibliography to clipboard"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Bibliography entries list */}
      <div className="p-4 space-y-3 divide-y divide-stone-200/60 dark:divide-stone-800/60">
        {resolvedEntries.map((entry, idx) => {
          const isMissing = !entry.reference;

          return (
            <div
              key={`bib-${entry.key}-${idx}`}
              className={`pt-2.5 first:pt-0 text-xs leading-relaxed ${
                isMissing ? 'text-amber-700 dark:text-amber-400' : 'text-stone-800 dark:text-stone-200'
              }`}
            >
              {isMissing ? (
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    Missing reference for citation key{' '}
                    <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950 font-mono text-[11px]">
                      @{entry.key}
                    </code>
                  </span>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3 group">
                  <div className="flex-1">
                    {/* Render italic/bold markdown */}
                    <p
                      className="text-xs"
                      dangerouslySetInnerHTML={{
                        __html: entry.formatted
                          .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
                          .replace(
                            /(https?:\/\/[^\s]+)/g,
                            '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-amber-600 dark:text-amber-400 underline underline-offset-2">$1</a>'
                          ),
                      }}
                    />
                  </div>

                  {onOpenReference && entry.reference && (
                    <button
                      type="button"
                      onClick={() => onOpenReference(entry.reference!.id)}
                      className="opacity-0 group-hover:opacity-100 shrink-0 px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 hover:bg-amber-500 hover:text-white text-stone-600 dark:text-stone-400 text-[10px] font-medium transition-all"
                      title="Open in Reference Library"
                    >
                      View Ref
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
