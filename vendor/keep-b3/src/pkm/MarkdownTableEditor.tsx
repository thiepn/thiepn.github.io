import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Table as TableIcon,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoreHorizontal,
  Undo2,
  Redo2,
  Copy,
  Check,
  Calculator,
  ChevronDown,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  Edit2,
  Eye,
  FileSpreadsheet,
  Download,
  Upload,
  FileUp,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  MarkdownTable,
  TableAlignment,
  TableCalculationType,
  TableSortState,
  TableHistoryEntry,
  ColumnStats,
} from './tableTypes';
import {
  serializeMarkdownTable,
  computeColumnStats,
  formatCalculationValue,
  escapeTableCell,
  unescapeTableCell,
} from './tableParser';
import {
  updateCell,
  addRow,
  deleteRow,
  moveRow,
  addColumn,
  deleteColumn,
  moveColumn,
  setColumnAlignment,
  sortTable,
  downloadTableAsCSV,
  serializeTableToCSV,
  appendRowsFromCSV,
  convertCSVToMarkdownTable,
  parseCSVText,
} from './tableOperations';

interface MarkdownTableEditorProps {
  initialTable: MarkdownTable;
  onSaveTable?: (updatedTable: MarkdownTable, serializedMarkdown: string) => void;
  onOpenNote?: (noteId: string) => void;
  onCreateNote?: (title: string) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export const MarkdownTableEditor: React.FC<MarkdownTableEditorProps> = ({
  initialTable,
  onSaveTable,
  onOpenNote,
  onCreateNote,
  readOnly = false,
  compact = false,
}) => {
  // Working table state
  const [table, setTable] = useState<MarkdownTable>(initialTable);
  // Undo/Redo history
  const [history, setHistory] = useState<TableHistoryEntry[]>([
    { table: initialTable, timestamp: Date.now(), description: 'Initial' },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // View modes
  const [isInteractive, setIsInteractive] = useState(!readOnly);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Active cell editing state: { row: number (-1 for header), col: number } | null
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Sort state
  const [sortState, setSortState] = useState<TableSortState>({
    columnIndex: null,
    direction: null,
    isTemporary: true,
  });

  // Active dropdown menus
  const [activeColMenu, setActiveColMenu] = useState<number | null>(null);
  const [activeRowMenu, setActiveRowMenu] = useState<number | null>(null);

  // Calculation mode overrides
  const [calcModes, setCalcModes] = useState<Record<number, TableCalculationType>>({});

  // CSV Import Modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [importHasHeaders, setImportHasHeaders] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Sync if initialTable changes externally
  useEffect(() => {
    setTable(initialTable);
  }, [initialTable.id, initialTable.rawSource]);

  // Push new state to undo/redo history & notify parent
  const commitChange = useCallback(
    (newTable: MarkdownTable, description: string) => {
      setTable(newTable);

      // Truncate future history and push
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({
        table: newTable,
        timestamp: Date.now(),
        description,
      });

      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      if (onSaveTable) {
        const md = serializeMarkdownTable(newTable);
        onSaveTable(newTable, md);
      }
    },
    [history, historyIndex, onSaveTable]
  );

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const prevTable = history[prevIdx].table;
      setHistoryIndex(prevIdx);
      setTable(prevTable);
      if (onSaveTable) {
        onSaveTable(prevTable, serializeMarkdownTable(prevTable));
      }
    }
  }, [history, historyIndex, onSaveTable]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const nextTable = history[nextIdx].table;
      setHistoryIndex(nextIdx);
      setTable(nextTable);
      if (onSaveTable) {
        onSaveTable(nextTable, serializeMarkdownTable(nextTable));
      }
    }
  }, [history, historyIndex, onSaveTable]);

  // Keyboard shortcut listener for Undo/Redo inside table
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    },
    [handleUndo, handleRedo]
  );

  // Displayed rows: if temporary sort is active, display sorted rows without mutating source
  const displayedRows = useMemo(() => {
    if (sortState.columnIndex === null || sortState.direction === null) {
      return table.rows;
    }
    const sorted = sortTable(table, sortState.columnIndex, sortState.direction);
    return sorted.rows;
  }, [table, sortState]);

  // Statistics for each column
  const columnStats = useMemo(() => {
    return table.headers.map((_, colIdx) => computeColumnStats(table, colIdx));
  }, [table]);

  // Start cell editing
  const startEditingCell = (row: number, col: number) => {
    if (readOnly) return;
    const currentVal = row === -1 ? table.headers[col] || '' : displayedRows[row]?.[col] || '';
    setActiveCell({ row, col });
    setEditingValue(currentVal);
  };

  // Save current editing cell
  const saveActiveCell = () => {
    if (!activeCell) return;
    const { row, col } = activeCell;
    const updated = updateCell(table, row, col, editingValue);
    commitChange(updated, `Edit ${row === -1 ? 'Header' : 'Cell'} (${row}, ${col})`);
    setActiveCell(null);
  };

  // Cancel cell editing
  const cancelActiveCell = () => {
    setActiveCell(null);
    setEditingValue('');
  };

  // Navigate cells with keyboard (Tab / Shift-Tab / Enter / Escape)
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    row: number,
    col: number
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveActiveCell();
      // Move to next row or create one if at bottom
      if (row < table.rows.length - 1) {
        startEditingCell(row + 1, col);
      } else if (row === table.rows.length - 1) {
        // Add row at bottom and edit it
        const withNewRow = addRow(table);
        commitChange(withNewRow, 'Add Row');
        setTimeout(() => startEditingCell(row + 1, col), 50);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveActiveCell();
      if (e.shiftKey) {
        // Navigate backwards
        if (col > 0) {
          startEditingCell(row, col - 1);
        } else if (row > -1) {
          startEditingCell(row - 1, table.headers.length - 1);
        }
      } else {
        // Navigate forwards
        if (col < table.headers.length - 1) {
          startEditingCell(row, col + 1);
        } else if (row < table.rows.length - 1) {
          startEditingCell(row + 1, 0);
        } else {
          // Add new row at end
          const withNewRow = addRow(table);
          commitChange(withNewRow, 'Add Row');
          setTimeout(() => startEditingCell(row + 1, 0), 50);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelActiveCell();
    }
  };

  // Header sort toggle (asc -> desc -> reset)
  const handleHeaderSort = (colIdx: number) => {
    if (sortState.columnIndex === colIdx) {
      if (sortState.direction === 'asc') {
        setSortState({ columnIndex: colIdx, direction: 'desc', isTemporary: true });
      } else if (sortState.direction === 'desc') {
        setSortState({ columnIndex: null, direction: null, isTemporary: true });
      }
    } else {
      setSortState({ columnIndex: colIdx, direction: 'asc', isTemporary: true });
    }
  };

  // Apply temporary sort to note source
  const handleApplySortToSource = () => {
    if (sortState.columnIndex !== null && sortState.direction !== null) {
      const sorted = sortTable(table, sortState.columnIndex, sortState.direction);
      commitChange(sorted, `Sort by ${table.headers[sortState.columnIndex]} (${sortState.direction})`);
      setSortState({ columnIndex: null, direction: null, isTemporary: true });
    }
  };

  // Reset preview sort
  const handleResetSort = () => {
    setSortState({ columnIndex: null, direction: null, isTemporary: true });
  };

  // Toggle column calculation
  const toggleColumnCalculation = (colIdx: number) => {
    const current = calcModes[colIdx] || (columnStats[colIdx]?.isNumeric ? 'sum' : 'count');
    const order: TableCalculationType[] = ['sum', 'avg', 'count', 'min', 'max', 'none'];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    const nextCalc = order[nextIdx];
    setCalcModes((prev) => ({ ...prev, [colIdx]: nextCalc }));
  };

  // Copy table to clipboard
  const handleCopy = (format: 'markdown' | 'csv') => {
    let text = '';
    if (format === 'markdown') {
      text = serializeMarkdownTable(table);
    } else {
      const headerLine = table.headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',');
      const bodyLines = table.rows.map((r) =>
        r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')
      );
      text = [headerLine, ...bodyLines].join('\n');
    }

    navigator.clipboard.writeText(text);
    setCopiedNotification(format === 'markdown' ? 'Markdown copied!' : 'CSV copied!');
    setTimeout(() => setCopiedNotification(null), 2000);
  };

  // Export CSV download
  const handleExportCSV = () => {
    const defaultName = (table.headers[0] || 'table').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    downloadTableAsCSV(table, `${defaultName || 'table'}.csv`);
    setCopiedNotification('CSV file downloaded!');
    setTimeout(() => setCopiedNotification(null), 2000);
  };

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setImportText(text);
        setImportError(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const parsedImportPreview = useMemo(() => {
    if (!importText.trim()) return null;
    try {
      const res = parseCSVText(importText);
      if (res.headers.length === 0) return null;
      return res;
    } catch {
      return null;
    }
  }, [importText]);

  const handleExecuteImport = () => {
    if (!importText.trim()) {
      setImportError('Please provide CSV data or upload a file.');
      return;
    }

    if (importMode === 'replace') {
      const newTable = convertCSVToMarkdownTable(importText);
      if (!newTable || newTable.headers.length === 0) {
        setImportError('Could not parse valid CSV data.');
        return;
      }
      commitChange(newTable, 'Import CSV (Replace)');
    } else {
      const updated = appendRowsFromCSV(table, importText, importHasHeaders);
      if (!updated) {
        setImportError('Failed to append rows from CSV.');
        return;
      }
      commitChange(updated, 'Import CSV (Append)');
    }

    setShowImportModal(false);
    setImportText('');
    setImportError(null);
    setCopiedNotification(importMode === 'replace' ? 'Table replaced from CSV!' : 'Rows appended from CSV!');
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  // Alignment icon helper
  const getAlignIcon = (align: TableAlignment) => {
    switch (align) {
      case 'left':
        return <AlignLeft className="w-3.5 h-3.5" />;
      case 'center':
        return <AlignCenter className="w-3.5 h-3.5" />;
      case 'right':
        return <AlignRight className="w-3.5 h-3.5" />;
      default:
        return <AlignLeft className="w-3.5 h-3.5 opacity-60" />;
    }
  };

  const getAlignClass = (align: TableAlignment) => {
    switch (align) {
      case 'left':
        return 'text-left';
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  return (
    <div
      id={`table-editor-${table.id}`}
      onKeyDown={handleKeyDown}
      className={`my-3 border rounded-xl overflow-hidden transition-all bg-white dark:bg-stone-900 shadow-sm border-stone-200 dark:border-stone-800 ${
        isFullscreen
          ? 'fixed inset-4 z-50 flex flex-col p-4 shadow-2xl bg-white dark:bg-stone-900'
          : 'relative'
      }`}
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-stone-50 dark:bg-stone-950/70 border-stone-200 dark:border-stone-800 flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-stone-700 dark:text-stone-300">
          <TableIcon className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-semibold tracking-tight">Table</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
            {table.headers.length} cols × {table.rows.length} rows
          </span>
          {sortState.direction && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 flex items-center gap-1 font-semibold">
              <ArrowUpDown className="w-3 h-3" />
              Preview Sorted
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Undo / Redo */}
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1 rounded text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 disabled:opacity-30 disabled:pointer-events-none hover:bg-stone-200/70 dark:hover:bg-stone-800"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-1 rounded text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 disabled:opacity-30 disabled:pointer-events-none hover:bg-stone-200/70 dark:hover:bg-stone-800"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-3.5 bg-stone-300 dark:bg-stone-700 mx-1" />
            </>
          )}

          {/* Copy Table */}
          <button
            type="button"
            onClick={() => handleCopy('markdown')}
            className="px-2 py-1 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800 flex items-center gap-1 font-medium transition-colors"
            title="Copy as Markdown Table"
          >
            {copiedNotification?.includes('Markdown') ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Copy MD</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy('csv')}
            className="px-2 py-1 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800 flex items-center gap-1 font-medium transition-colors"
            title="Copy as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy CSV</span>
          </button>

          {/* Export CSV Download */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-2 py-1 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800 flex items-center gap-1 font-medium transition-colors"
            title="Download table as .CSV file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Import CSV */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-2 py-1 rounded text-amber-700 dark:text-amber-400 hover:bg-amber-100/70 dark:hover:bg-amber-950/60 flex items-center gap-1 font-semibold transition-colors"
              title="Import CSV or TSV data into table"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>
          )}

          {/* Interactive Mode Toggle */}
          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsInteractive(!isInteractive)}
              className={`px-2 py-1 rounded flex items-center gap-1 font-semibold transition-colors ${
                isInteractive
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800'
              }`}
              title={isInteractive ? 'Switch to rendered view' : 'Switch to interactive spreadsheet editor'}
            >
              {isInteractive ? <Edit2 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isInteractive ? 'Editing' : 'Preview'}</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/70 dark:hover:bg-stone-800"
            title={isFullscreen ? 'Exit full screen' : 'Expand full screen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Temporary Sort Banner */}
      {sortState.direction && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/70 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>
              Preview sorted by <strong>{table.headers[sortState.columnIndex || 0]}</strong> (
              {sortState.direction === 'asc' ? 'ascending' : 'descending'}). Note source unchanged.
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleApplySortToSource}
              className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-2xs"
            >
              Apply to Note
            </button>
            <button
              type="button"
              onClick={handleResetSort}
              className="px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Spreadsheet Table Container */}
      <div className="overflow-x-auto select-text max-h-[70vh] relative">
        <table className="w-full text-xs text-stone-900 dark:text-stone-100 border-collapse">
          {/* Table Header */}
          <thead>
            <tr className="bg-stone-100/90 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-10">
              {/* Row index header / action header */}
              {isInteractive && !readOnly && (
                <th className="w-10 px-2 py-2 text-center text-[10px] font-mono font-medium text-stone-400 dark:text-stone-500 border-r border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 select-none">
                  #
                </th>
              )}

              {table.headers.map((headerText, colIdx) => {
                const align = table.alignments[colIdx] || 'default';
                const isSortingThisCol = sortState.columnIndex === colIdx;
                const isEditingThisHeader = activeCell?.row === -1 && activeCell?.col === colIdx;

                return (
                  <th
                    key={colIdx}
                    className={`px-3 py-2 font-semibold text-stone-800 dark:text-stone-200 border-r border-stone-200 dark:border-stone-800 relative group min-w-[120px] ${getAlignClass(
                      align
                    )}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      {/* Header Text / Input */}
                      {isEditingThisHeader ? (
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, -1, colIdx)}
                          onBlur={saveActiveCell}
                          autoFocus
                          className="w-full px-1.5 py-0.5 rounded bg-white dark:bg-stone-900 border border-amber-500 text-stone-900 dark:text-white font-semibold text-xs focus:outline-none ring-1 ring-amber-500"
                        />
                      ) : (
                        <div
                          onClick={() => handleHeaderSort(colIdx)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (isInteractive && !readOnly) startEditingCell(-1, colIdx);
                          }}
                          className="flex-1 flex items-center justify-between gap-1 truncate cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 select-none group/hdr"
                          title={`Click to sort by ${headerText || `Column ${colIdx + 1}`} · Double-click to rename`}
                        >
                          <span className="truncate">{headerText || `Column ${colIdx + 1}`}</span>
                          {isInteractive && !readOnly && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingCell(-1, colIdx);
                              }}
                              className="opacity-0 group-hover/hdr:opacity-100 p-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-opacity"
                              title="Rename column"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Header Controls (Sort & Column Menu) */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* Sort button */}
                        <button
                          type="button"
                          onClick={() => handleHeaderSort(colIdx)}
                          className={`p-1 rounded transition-colors ${
                            isSortingThisCol
                              ? 'text-amber-600 bg-amber-100 dark:bg-amber-950 font-bold'
                              : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 opacity-60 group-hover:opacity-100'
                          }`}
                          title={`Sort by ${headerText} (Click to toggle Asc/Desc)`}
                        >
                          {isSortingThisCol ? (
                            sortState.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3" />
                          )}
                        </button>

                        {/* Column menu trigger */}
                        {isInteractive && !readOnly && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveColMenu(activeColMenu === colIdx ? null : colIdx)
                              }
                              className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 opacity-60 group-hover:opacity-100 hover:bg-stone-200 dark:hover:bg-stone-800"
                              title="Column Options"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>

                            {/* Column Context Dropdown Menu */}
                            {activeColMenu === colIdx && (
                              <div
                                className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 p-1.5 z-30 text-xs font-normal"
                                onMouseLeave={() => setActiveColMenu(null)}
                              >
                                <div className="px-2 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                                  Alignment
                                </div>
                                <div className="grid grid-cols-3 gap-1 mb-2">
                                  {(['left', 'center', 'right'] as TableAlignment[]).map((a) => (
                                    <button
                                      key={a}
                                      type="button"
                                      onClick={() => {
                                        const updated = setColumnAlignment(table, colIdx, a);
                                        commitChange(updated, `Align Col ${colIdx + 1} ${a}`);
                                        setActiveColMenu(null);
                                      }}
                                      className={`p-1 flex items-center justify-center rounded border ${
                                        align === a
                                          ? 'bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                          : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300'
                                      }`}
                                      title={`Align ${a}`}
                                    >
                                      {getAlignIcon(a)}
                                    </button>
                                  ))}
                                </div>

                                <div className="px-2 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                                  Reorder / Insert
                                </div>
                                <button
                                  type="button"
                                  disabled={colIdx === 0}
                                  onClick={() => {
                                    const updated = moveColumn(table, colIdx, colIdx - 1);
                                    commitChange(updated, 'Move Column Left');
                                    setActiveColMenu(null);
                                  }}
                                  className="w-full px-2 py-1 rounded text-left flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-40"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" /> Move Left
                                </button>
                                <button
                                  type="button"
                                  disabled={colIdx === table.headers.length - 1}
                                  onClick={() => {
                                    const updated = moveColumn(table, colIdx, colIdx + 1);
                                    commitChange(updated, 'Move Column Right');
                                    setActiveColMenu(null);
                                  }}
                                  className="w-full px-2 py-1 rounded text-left flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-40"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" /> Move Right
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = addColumn(table, colIdx, `Col ${colIdx + 1}`);
                                    commitChange(updated, 'Insert Column Left');
                                    setActiveColMenu(null);
                                  }}
                                  className="w-full px-2 py-1 rounded text-left flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Insert Left
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = addColumn(table, colIdx + 1, `Col ${colIdx + 2}`);
                                    commitChange(updated, 'Insert Column Right');
                                    setActiveColMenu(null);
                                  }}
                                  className="w-full px-2 py-1 rounded text-left flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Insert Right
                                </button>

                                <div className="border-t border-stone-200 dark:border-stone-700 my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    toggleColumnCalculation(colIdx);
                                    setActiveColMenu(null);
                                  }}
                                  className="w-full px-2 py-1 rounded text-left flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 text-amber-700 dark:text-amber-400 font-medium"
                                >
                                  <Calculator className="w-3.5 h-3.5" /> Toggle Calculation
                                </button>

                                <div className="border-t border-stone-200 dark:border-stone-700 my-1" />
                                <button
                                  type="button"
                                  disabled={table.headers.length <= 1}
                                  onClick={() => {
                                    const updated = deleteColumn(table, colIdx);
                                    commitChange(updated, `Delete Col ${colIdx + 1}`);
                                    setActiveColMenu(null);
                                  }}
                                  className="w-full px-2 py-1 rounded text-left flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete Column
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}

              {/* Add Column quick button */}
              {isInteractive && !readOnly && (
                <th className="w-10 px-2 py-2 text-center bg-stone-50 dark:bg-stone-950">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = addColumn(table);
                      commitChange(updated, 'Add Column');
                    }}
                    className="p-1 rounded text-stone-500 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-stone-800 transition-colors"
                    title="Add Column (+)"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {displayedRows.map((rowCells, rowIdx) => {
              return (
                <tr
                  key={rowIdx}
                  className="border-b border-stone-200 dark:border-stone-800 hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors group"
                >
                  {/* Row index & menu */}
                  {isInteractive && !readOnly && (
                    <td className="px-2 py-2 text-center text-[10px] font-mono text-stone-400 dark:text-stone-500 border-r border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/30 select-none relative">
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="group-hover:hidden">{rowIdx + 1}</span>
                        <div className="hidden group-hover:flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveRowMenu(activeRowMenu === rowIdx ? null : rowIdx)
                            }
                            className="p-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"
                            title="Row Actions"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </button>

                          {/* Row menu popup */}
                          {activeRowMenu === rowIdx && (
                            <div
                              className="absolute left-full top-0 ml-1 w-40 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 p-1.5 z-30 text-xs font-normal text-left"
                              onMouseLeave={() => setActiveRowMenu(null)}
                            >
                              <button
                                type="button"
                                disabled={rowIdx === 0}
                                onClick={() => {
                                  const updated = moveRow(table, rowIdx, rowIdx - 1);
                                  commitChange(updated, 'Move Row Up');
                                  setActiveRowMenu(null);
                                }}
                                className="w-full px-2 py-1 rounded flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-40"
                              >
                                <ArrowUp className="w-3.5 h-3.5" /> Move Up
                              </button>
                              <button
                                type="button"
                                disabled={rowIdx === table.rows.length - 1}
                                onClick={() => {
                                  const updated = moveRow(table, rowIdx, rowIdx + 1);
                                  commitChange(updated, 'Move Row Down');
                                  setActiveRowMenu(null);
                                }}
                                className="w-full px-2 py-1 rounded flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-40"
                              >
                                <ArrowDown className="w-3.5 h-3.5" /> Move Down
                              </button>
                              <div className="border-t border-stone-200 dark:border-stone-700 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = addRow(table, rowIdx);
                                  commitChange(updated, 'Insert Row Above');
                                  setActiveRowMenu(null);
                                }}
                                className="w-full px-2 py-1 rounded flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700"
                              >
                                <Plus className="w-3.5 h-3.5" /> Insert Above
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = addRow(table, rowIdx + 1);
                                  commitChange(updated, 'Insert Row Below');
                                  setActiveRowMenu(null);
                                }}
                                className="w-full px-2 py-1 rounded flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700"
                              >
                                <Plus className="w-3.5 h-3.5" /> Insert Below
                              </button>
                              <div className="border-t border-stone-200 dark:border-stone-700 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = deleteRow(table, rowIdx);
                                  commitChange(updated, `Delete Row ${rowIdx + 1}`);
                                  setActiveRowMenu(null);
                                }}
                                className="w-full px-2 py-1 rounded flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Row
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Cell values */}
                  {table.headers.map((_, colIdx) => {
                    const cellVal = rowCells[colIdx] || '';
                    const align = table.alignments[colIdx] || 'default';
                    const isEditing = activeCell?.row === rowIdx && activeCell?.col === colIdx;

                    return (
                      <td
                        key={colIdx}
                        onClick={() => isInteractive && startEditingCell(rowIdx, colIdx)}
                        className={`px-3 py-2 border-r border-stone-200 dark:border-stone-800 ${getAlignClass(
                          align
                        )} ${
                          isInteractive
                            ? 'cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
                            : ''
                        }`}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                            onBlur={saveActiveCell}
                            autoFocus
                            className="w-full px-1.5 py-0.5 rounded bg-white dark:bg-stone-900 border border-amber-500 text-stone-900 dark:text-white text-xs focus:outline-none ring-1 ring-amber-500"
                          />
                        ) : (
                          <div className="min-h-[18px]">
                            {cellVal ? (
                              <span>{cellVal}</span>
                            ) : (
                              <span className="text-stone-300 dark:text-stone-600 italic select-none">
                                {isInteractive ? 'empty' : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Empty cell to balance add col header */}
                  {isInteractive && !readOnly && <td className="w-10 px-2 py-2" />}
                </tr>
              );
            })}
          </tbody>

          {/* Calculations Summary Footer */}
          <tfoot>
            <tr className="bg-stone-100/90 dark:bg-stone-950 border-t-2 border-stone-300 dark:border-stone-700 font-medium text-stone-700 dark:text-stone-300">
              {isInteractive && !readOnly && (
                <td className="px-2 py-2 text-center text-amber-600 dark:text-amber-400 font-bold border-r border-stone-200 dark:border-stone-800">
                  ∑
                </td>
              )}

              {table.headers.map((_, colIdx) => {
                const stats = columnStats[colIdx];
                const align = table.alignments[colIdx] || 'default';
                const calcType =
                  calcModes[colIdx] || (stats?.isNumeric ? 'sum' : 'count');

                let displayVal = '—';
                let label = '';

                if (calcType === 'sum' && stats.sum !== null) {
                  displayVal = formatCalculationValue(stats.sum, 'sum');
                  label = 'Sum';
                } else if (calcType === 'avg' && stats.avg !== null) {
                  displayVal = formatCalculationValue(stats.avg, 'avg');
                  label = 'Avg';
                } else if (calcType === 'count') {
                  displayVal = String(stats.nonEmptyCount);
                  label = 'Count';
                } else if (calcType === 'min' && stats.min !== null) {
                  displayVal = formatCalculationValue(stats.min, 'min');
                  label = 'Min';
                } else if (calcType === 'max' && stats.max !== null) {
                  displayVal = formatCalculationValue(stats.max, 'max');
                  label = 'Max';
                } else if (calcType === 'none') {
                  displayVal = '';
                }

                return (
                  <td
                    key={colIdx}
                    className={`px-3 py-2 border-r border-stone-200 dark:border-stone-800 ${getAlignClass(
                      align
                    )}`}
                  >
                    {calcType !== 'none' && displayVal && (
                      <button
                        type="button"
                        onClick={() => toggleColumnCalculation(colIdx)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-200/80 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-stone-800 dark:text-stone-200 text-[11px] font-semibold transition-colors"
                        title="Click to cycle calculation (Sum -> Avg -> Count -> Min -> Max -> None)"
                      >
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 font-normal uppercase">
                          {label}:
                        </span>
                        <span>{displayVal}</span>
                      </button>
                    )}
                  </td>
                );
              })}

              {isInteractive && !readOnly && <td className="w-10 px-2 py-2" />}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bottom Quick Actions (+ Add Row & + Add Column) */}
      {isInteractive && !readOnly && (
        <div className="flex items-center justify-between px-3 py-2 bg-stone-50/90 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const updated = addRow(table);
                commitChange(updated, 'Add Row');
                setTimeout(() => startEditingCell(table.rows.length, 0), 50);
              }}
              className="px-2.5 py-1 rounded-md text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100/70 dark:hover:bg-amber-950/60 flex items-center gap-1.5 transition-colors border border-amber-300/40 dark:border-amber-700/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const updated = addColumn(table);
                commitChange(updated, 'Add Column');
                setTimeout(() => startEditingCell(-1, table.headers.length), 50);
              }}
              className="px-2.5 py-1 rounded-md text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800 flex items-center gap-1.5 transition-colors border border-stone-300/50 dark:border-stone-700/50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Column</span>
            </button>
          </div>

          <div className="text-[11px] text-stone-400 dark:text-stone-500">
            Press <kbd className="px-1 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-[10px]">Tab</kbd> to navigate,{' '}
            <kbd className="px-1 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-[10px]">Enter</kbd> to save
          </div>
        </div>
      )}

      {/* CSV / TSV Import Modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="csv-import-title"
        >
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="csv-import-title" className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Import CSV / TSV Data
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Upload a file or paste comma/tab-separated values into this table
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* File Upload Zone */}
            <div>
              <input
                type="file"
                ref={csvFileInputRef}
                accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => csvFileInputRef.current?.click()}
                className="w-full py-3 px-4 border border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-xl bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer group"
              >
                <FileUp className="w-5 h-5 text-stone-400 group-hover:text-amber-500 transition-colors" />
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                  Choose a CSV / TSV file from your computer
                </span>
                <span className="text-[10px] text-stone-400">Supports .csv, .tsv, comma and tab delimiters</span>
              </button>
            </div>

            {/* Or Paste Raw Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Or Paste CSV / Spreadsheet Text:
              </label>
              <textarea
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportError(null);
                }}
                placeholder={`Product,Price,Quantity\nApple,1.20,10\nBanana,0.75,25`}
                rows={5}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Preview indicator */}
            {parsedImportPreview && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                <span>
                  Detected: <strong>{parsedImportPreview.headers.length} columns</strong> ×{' '}
                  <strong>{parsedImportPreview.rows.length + 1} total rows</strong>
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-300 truncate max-w-[180px]">
                  Headers: {parsedImportPreview.headers.slice(0, 3).join(', ')}
                  {parsedImportPreview.headers.length > 3 ? '...' : ''}
                </span>
              </div>
            )}

            {importError && (
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Import Mode Options */}
            <div className="flex items-center gap-4 text-xs font-medium text-stone-700 dark:text-stone-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>Replace Table</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>Append as New Rows</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!importText.trim()}
                onClick={handleExecuteImport}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none shadow-xs transition-colors"
              >
                Import Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
