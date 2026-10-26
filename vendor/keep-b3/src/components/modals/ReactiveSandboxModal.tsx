import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  Table as TableIcon,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  FileText,
  DollarSign,
  Percent,
  Hash,
  Sparkles,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  BookOpen,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import {
  ComputationalTable,
  TableColumn,
  TableRow,
  ReactiveVariable,
  ColumnType,
  ComputeScenarioPreset,
} from '../../pkm/compute/computeTypes';
import {
  computeTableRows,
  computeColumnAggregation,
  tableToMarkdown,
  markdownToTable,
  evaluateReactiveVariables,
  getScenarioPreset,
} from '../../pkm/compute/formulaEngine';

interface ReactiveSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders?: Folder[];
  initialNoteId?: string | null;
  onCreateNote?: (note: Partial<Note>) => Promise<Note>;
  onOpenNote?: (id: string, title: string) => void;
  onInsertMarkdown?: (markdown: string) => void;
}

export const ReactiveSandboxModal: React.FC<ReactiveSandboxModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders = [],
  initialNoteId,
  onCreateNote,
  onOpenNote,
  onInsertMarkdown,
}) => {
  // Current preset
  const [activePreset, setActivePreset] = useState<ComputeScenarioPreset>('startup-runway');

  // Reactive state
  const [table, setTable] = useState<ComputationalTable>(() => getScenarioPreset('startup-runway').table);
  const [rawVariables, setRawVariables] = useState<Array<{ name: string; rawExpression: string; description?: string }>>(
    () => getScenarioPreset('startup-runway').variables
  );

  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialNoteId || null);

  // Evaluate reactive variables
  const reactiveVariables: ReactiveVariable[] = useMemo(() => {
    return evaluateReactiveVariables(rawVariables);
  }, [rawVariables]);

  // Compute table rows (evaluating all row-level formula columns)
  const computedRows: TableRow[] = useMemo(() => {
    return computeTableRows(table);
  }, [table]);

  // Handle preset change
  const handleLoadPreset = (preset: ComputeScenarioPreset) => {
    setActivePreset(preset);
    const data = getScenarioPreset(preset);
    setTable(data.table);
    setRawVariables(data.variables);
    notify(`Loaded ${preset} scenario!`);
  };

  // Import table from note
  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    const targetNote = notes.find(n => n.id === noteId);
    if (targetNote && targetNote.content) {
      const parsed = markdownToTable(targetNote.content, targetNote.title);
      if (parsed) {
        setTable(parsed);
        notify(`Imported table from "${targetNote.title}"!`);
      } else {
        notify('No markdown table found in note; loaded model template.');
      }
    }
  };

  // Variable editing
  const handleUpdateVariableExpr = (index: number, newExpr: string) => {
    setRawVariables(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], rawExpression: newExpr };
      return copy;
    });
  };

  const handleAddVariable = () => {
    setRawVariables(prev => [
      ...prev,
      {
        name: `var_${prev.length + 1}`,
        rawExpression: '100',
        description: 'New parameter',
      },
    ]);
  };

  const handleDeleteVariable = (index: number) => {
    setRawVariables(prev => prev.filter((_, i) => i !== index));
  };

  // Table cell editing
  const handleCellChange = (rowId: string, colId: string, value: any) => {
    setTable(prev => ({
      ...prev,
      rows: prev.rows.map(r => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          cells: {
            ...r.cells,
            [colId]: value,
          },
        };
      }),
    }));
  };

  // Add new row
  const handleAddRow = () => {
    const newRowId = `row_${Date.now()}`;
    const defaultCells: Record<string, any> = {};
    table.columns.forEach(col => {
      if (col.type === 'number' || col.type === 'currency' || col.type === 'percentage') {
        defaultCells[col.id] = 0;
      } else {
        defaultCells[col.id] = '';
      }
    });

    setTable(prev => ({
      ...prev,
      rows: [...prev.rows, { id: newRowId, cells: defaultCells }],
    }));
  };

  const handleDeleteRow = (rowId: string) => {
    setTable(prev => ({
      ...prev,
      rows: prev.rows.filter(r => r.id !== rowId),
    }));
  };

  // Add new column
  const handleAddColumn = () => {
    const newColId = `col_${Date.now()}`;
    const newCol: TableColumn = {
      id: newColId,
      name: `Column ${table.columns.length + 1}`,
      type: 'number',
      aggregation: 'sum',
    };
    setTable(prev => ({
      ...prev,
      columns: [...prev.columns, newCol],
      rows: prev.rows.map(r => ({
        ...r,
        cells: { ...r.cells, [newColId]: 0 },
      })),
    }));
  };

  const handleDeleteColumn = (colId: string) => {
    setTable(prev => ({
      ...prev,
      columns: prev.columns.filter(c => c.id !== colId),
      rows: prev.rows.map(r => {
        const copy = { ...r.cells };
        delete copy[colId];
        return { ...r, cells: copy };
      }),
    }));
  };

  const handleUpdateColumnType = (colId: string, type: ColumnType) => {
    setTable(prev => ({
      ...prev,
      columns: prev.columns.map(c => {
        if (c.id !== colId) return c;
        return {
          ...c,
          type,
          aggregation: type === 'currency' || type === 'number' ? 'sum' : 'none',
        };
      }),
    }));
  };

  const handleUpdateColumnFormula = (colId: string, formula: string) => {
    setTable(prev => ({
      ...prev,
      columns: prev.columns.map(c => (c.id === colId ? { ...c, formula } : c)),
    }));
  };

  const notify = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // Export Table as Markdown
  const markdownOutput = useMemo(() => {
    const tableWithComputed = {
      ...table,
      rows: computedRows,
    };
    return tableToMarkdown(tableWithComputed);
  }, [table, computedRows]);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownOutput);
    notify('Copied Markdown Table to clipboard!');
  };

  const handleSaveAsNote = async () => {
    if (onCreateNote) {
      let content = `# 🧮 ${table.name}\n\n`;
      content += `### Model Parameters & Reactive Variables\n\n`;
      reactiveVariables.forEach(v => {
        content += `- **${v.name}**: \`${v.rawExpression}\` → **${v.computedValue}** ${v.description ? `*(${v.description})*` : ''}\n`;
      });
      content += `\n### Dynamic Data Matrix\n\n${markdownOutput}\n`;

      const newNote = await onCreateNote({
        title: `🧮 ${table.name}`,
        content,
        tags: ['compute', 'data', 'finance', 'p10'],
      });
      notify(`Saved computational note "${newNote.title}"!`);
      if (onOpenNote) {
        onOpenNote(newNote.id, newNote.title);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-hidden">
      <div className="flex flex-col w-full max-w-6xl h-[92vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden text-stone-100">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-stone-800 bg-stone-950/90 select-none">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={table.name}
                  onChange={e => setTable(t => ({ ...t, name: e.target.value }))}
                  className="font-bold text-base bg-transparent border-b border-transparent hover:border-stone-700 focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Model Name"
                />
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  P10 Quant
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Reactive Variables • Dynamic Formula Table • Aggregation Footer • Lossless Markdown Sync
              </p>
            </div>
          </div>

          {/* Quick Actions & Presets */}
          <div className="flex items-center gap-2">
            {/* Scenario Preset Selector */}
            <select
              value={activePreset}
              onChange={e => handleLoadPreset(e.target.value as ComputeScenarioPreset)}
              className="px-2.5 py-1.5 text-xs bg-stone-900 border border-stone-700 rounded-lg text-stone-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="startup-runway">🚀 Startup Runway & Burn Rate</option>
              <option value="compound-interest">📈 Compound Interest Horizon</option>
              <option value="project-velocity">⚡ Project Velocity & Estimation</option>
              <option value="research-statistics">🔬 Research Cohort Statistics</option>
            </select>

            {/* Note Selector */}
            <select
              value={selectedNoteId || ''}
              onChange={e => handleSelectNote(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-stone-900 border border-stone-700 rounded-lg text-stone-200 focus:outline-none focus:border-cyan-500 max-w-[140px] truncate"
            >
              <option value="" disabled>
                Import from Note...
              </option>
              {notes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.title || 'Untitled Note'}
                </option>
              ))}
            </select>

            {/* Copy Markdown */}
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs text-stone-200 transition-colors"
              title="Copy Markdown Table"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              Copy MD
            </button>

            {/* Save as Note */}
            {onCreateNote && (
              <button
                onClick={handleSaveAsNote}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shadow-sm transition-colors"
                title="Save as Note in Vault"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Save Note
              </button>
            )}

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {copiedNotification && (
          <div className="absolute top-16 right-6 z-40 flex items-center gap-2 px-4 py-2 bg-emerald-950 border border-emerald-600 text-emerald-200 text-xs rounded-xl shadow-xl animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{copiedNotification}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
          {/* Section 1: Reactive Variables & Model Parameters */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                <Sliders className="w-4 h-4" />
                <span>Model Parameters & Reactive Variables</span>
              </div>
              <button
                onClick={handleAddVariable}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-200"
              >
                <Plus className="w-3 h-3 text-cyan-400" />
                Add Variable
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {reactiveVariables.map((v, idx) => (
                <div
                  key={idx}
                  className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex flex-col justify-between hover:border-cyan-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-mono text-xs font-bold text-cyan-300 truncate">{v.name}</span>
                    <button
                      onClick={() => handleDeleteVariable(idx)}
                      className="p-1 text-stone-500 hover:text-red-400 transition-colors"
                      title="Remove Variable"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-[11px] text-stone-400 truncate mb-2">{v.description || 'Variable'}</div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={rawVariables[idx]?.rawExpression || ''}
                      onChange={e => handleUpdateVariableExpr(idx, e.target.value)}
                      className="flex-1 bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs font-mono text-stone-200 focus:outline-none focus:border-cyan-500"
                      placeholder="e.g. 5000 * 1.08"
                    />
                  </div>

                  <div className="mt-2 pt-2 border-t border-stone-800 flex items-center justify-between">
                    <span className="text-[10px] text-stone-500 uppercase font-mono">Value:</span>
                    <span
                      className={`font-mono text-sm font-bold ${
                        v.error ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {v.error ? '#ERR' : v.computedValue !== null ? String(v.computedValue) : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Dynamic Spreadsheet & Table Grid */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 flex-1 flex flex-col min-h-[320px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                <TableIcon className="w-4 h-4" />
                <span>Dynamic Database Table Grid</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddColumn}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-200"
                >
                  <Plus className="w-3 h-3 text-cyan-400" />
                  Add Column
                </button>
                <button
                  onClick={handleAddRow}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-xs text-cyan-200 font-semibold"
                >
                  <Plus className="w-3 h-3" />
                  Add Row
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-x-auto border border-stone-800 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-900 border-b border-stone-800 text-stone-300">
                    <th className="p-2.5 w-10 text-center text-stone-500 font-mono">#</th>
                    {table.columns.map(col => (
                      <th key={col.id} className="p-2.5 min-w-[150px] border-r border-stone-800">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <input
                            type="text"
                            value={col.name}
                            onChange={e => {
                              const newName = e.target.value;
                              setTable(t => ({
                                ...t,
                                columns: t.columns.map(c => (c.id === col.id ? { ...c, name: newName } : c)),
                              }));
                            }}
                            className="bg-transparent font-bold text-stone-200 hover:border-b hover:border-stone-600 focus:outline-none focus:border-cyan-500 w-full"
                          />
                          <button
                            onClick={() => handleDeleteColumn(col.id)}
                            className="p-1 text-stone-500 hover:text-red-400"
                            title="Delete Column"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={col.type}
                            onChange={e => handleUpdateColumnType(col.id, e.target.value as ColumnType)}
                            className="text-[10px] bg-stone-950 border border-stone-700 rounded px-1.5 py-0.5 text-stone-400"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="currency">Currency ($)</option>
                            <option value="percentage">Percent (%)</option>
                            <option value="formula">Formula (f=x)</option>
                          </select>
                          {col.type === 'formula' && (
                            <input
                              type="text"
                              value={col.formula || ''}
                              onChange={e => handleUpdateColumnFormula(col.id, e.target.value)}
                              placeholder="e.g. c2 * 1.5"
                              className="text-[10px] font-mono bg-stone-950 border border-stone-700 rounded px-1.5 py-0.5 text-cyan-300 w-24 focus:outline-none focus:border-cyan-500"
                              title="Formula Expression referencing column IDs like c2, c3"
                            />
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="p-2.5 w-12 text-center text-stone-500">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {computedRows.map((row, rIdx) => (
                    <tr
                      key={row.id}
                      className="border-b border-stone-800/60 hover:bg-stone-900/50 transition-colors"
                    >
                      <td className="p-2 text-center text-stone-500 font-mono text-[11px]">{rIdx + 1}</td>
                      {table.columns.map(col => {
                        const val = row.cells[col.id];
                        const isFormula = col.type === 'formula';

                        return (
                          <td key={col.id} className="p-2 border-r border-stone-800/60">
                            {isFormula ? (
                              <div className="font-mono font-bold text-cyan-300 px-2 py-1 bg-cyan-950/30 rounded border border-cyan-900/40">
                                {typeof val === 'number' ? val.toLocaleString() : val || '—'}
                              </div>
                            ) : (
                              <input
                                type={col.type === 'number' || col.type === 'currency' || col.type === 'percentage' ? 'number' : 'text'}
                                value={val !== undefined && val !== null ? val : ''}
                                onChange={e => {
                                  const raw = e.target.value;
                                  const parsed = col.type === 'number' || col.type === 'currency' || col.type === 'percentage' ? parseFloat(raw) : raw;
                                  handleCellChange(row.id, col.id, isNaN(parsed as any) ? raw : parsed);
                                }}
                                className="w-full bg-stone-900/40 border border-transparent hover:border-stone-700 focus:border-cyan-500 rounded px-2 py-1 text-xs font-mono text-stone-200 focus:outline-none"
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 text-stone-500 hover:text-red-400 transition-colors"
                          title="Delete Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Aggregation Summary Footer */}
                <tfoot>
                  <tr className="bg-stone-900 font-bold border-t-2 border-stone-700 text-stone-200">
                    <td className="p-2 text-center text-[10px] text-cyan-400 font-mono">TOTAL</td>
                    {table.columns.map(col => {
                      const agg = computeColumnAggregation(computedRows, col);
                      return (
                        <td key={col.id} className="p-2 border-r border-stone-800 font-mono text-xs text-emerald-400">
                          {agg !== null ? (
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] uppercase text-stone-500">{col.aggregation}:</span>
                              <span>
                                {col.type === 'currency' && typeof agg === 'number' ? `$${agg.toLocaleString()}` : String(agg)}
                              </span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                      );
                    })}
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
