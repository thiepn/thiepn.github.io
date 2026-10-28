import React from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Table,
  Calendar,
  Minus,
  Link2,
  Sigma,
  Workflow,
  Globe,
  BookOpen,
  FileSpreadsheet,
} from 'lucide-react';

interface MarkdownToolbarProps {
  onApplyFormat: (format: string) => void;
  onOpenWebCapture?: () => void;
  onOpenPDFReader?: () => void;
  disabled?: boolean;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  onApplyFormat,
  onOpenWebCapture,
  onOpenPDFReader,
  disabled = false,
}) => {
  const tools = [
    { label: 'Bold', icon: <Bold className="w-3.5 h-3.5" />, format: 'bold' },
    { label: 'Italic', icon: <Italic className="w-3.5 h-3.5" />, format: 'italic' },
    { label: 'Strikethrough', icon: <Strikethrough className="w-3.5 h-3.5" />, format: 'strike' },
    { label: 'Heading 1', icon: <Heading1 className="w-3.5 h-3.5" />, format: 'h1' },
    { label: 'Heading 2', icon: <Heading2 className="w-3.5 h-3.5" />, format: 'h2' },
    { label: 'Heading 3', icon: <Heading3 className="w-3.5 h-3.5" />, format: 'h3' },
    { label: 'Blockquote', icon: <Quote className="w-3.5 h-3.5" />, format: 'quote' },
    { label: 'Callout Box (GFM)', icon: <span className="font-semibold text-[11px] px-1 py-0.2 bg-amber-200/80 dark:bg-amber-900/80 rounded text-amber-800 dark:text-amber-200">![]</span>, format: 'callout' },
    { label: 'Code Block', icon: <Code className="w-3.5 h-3.5" />, format: 'code' },
    { label: 'Inline Math ($...$)', icon: <Sigma className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />, format: 'math' },
    { label: 'Display Math ($$...$$)', icon: <span className="font-mono font-bold text-[11px] text-amber-600 dark:text-amber-400">$$</span>, format: 'mathblock' },
    { label: 'Mermaid Diagram', icon: <Workflow className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />, format: 'mermaid' },
    { label: 'Smart Query Block', icon: <span className="font-mono font-bold text-[11px] text-blue-600 dark:text-blue-400">?q</span>, format: 'query' },
    { label: 'Bullet List', icon: <List className="w-3.5 h-3.5" />, format: 'bullet' },
    { label: 'Numbered List', icon: <ListOrdered className="w-3.5 h-3.5" />, format: 'number' },
    { label: 'Task Item', icon: <CheckSquare className="w-3.5 h-3.5" />, format: 'task' },
    { label: 'Markdown Table', icon: <Table className="w-3.5 h-3.5" />, format: 'table' },
    { label: 'Import CSV as Table', icon: <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />, format: 'import_csv' },
    { label: 'Date Stamp', icon: <Calendar className="w-3.5 h-3.5" />, format: 'date' },
    { label: 'Horizontal Rule', icon: <Minus className="w-3.5 h-3.5" />, format: 'divider' },
    { label: 'Wiki Link', icon: <Link2 className="w-3.5 h-3.5" />, format: 'wikilink' },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Markdown formatting toolbar"
      className="flex items-center gap-0.5 p-1 bg-stone-100/80 dark:bg-stone-800/80 rounded-xl border border-stone-200/80 dark:border-stone-700/80 overflow-x-auto no-scrollbar"
    >
      {tools.map((t) => (
        <button
          key={t.format}
          type="button"
          disabled={disabled}
          onClick={() => onApplyFormat(t.format)}
          className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-white dark:hover:bg-stone-700 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          title={t.label}
          aria-label={t.label}
        >
          {t.icon}
        </button>
      ))}

      {onOpenWebCapture && (
        <>
          <div className="w-px h-4 bg-stone-300 dark:bg-stone-700 mx-0.5 shrink-0" aria-hidden="true" />
          <button
            type="button"
            disabled={disabled}
            onClick={onOpenWebCapture}
            className="p-1.5 min-w-[32px] min-h-[32px] rounded-lg text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100/60 dark:hover:bg-blue-950/50 transition-colors disabled:opacity-40 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Web Capture / Ingest HTML"
            aria-label="Web Capture / Ingest HTML"
          >
            <Globe className="w-3.5 h-3.5" />
          </button>
        </>
      )}

      {onOpenPDFReader && (
        <>
          <div className="w-px h-4 bg-stone-300 dark:bg-stone-700 mx-0.5 shrink-0" aria-hidden="true" />
          <button
            type="button"
            disabled={disabled}
            onClick={onOpenPDFReader}
            className="p-1.5 min-w-[32px] min-h-[32px] rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-100/60 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-40 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            title="PDF Reader & Highlight Extractor"
            aria-label="PDF Reader & Highlight Extractor"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};

