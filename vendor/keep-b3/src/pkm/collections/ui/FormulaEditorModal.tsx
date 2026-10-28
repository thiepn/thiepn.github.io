import React, { useState, useMemo } from 'react';
import { FormulaConfig, CollectionPropertyDefinition } from '../collectionTypes';
import { parseFormula, inspectFormulaDependencies, evaluateFormula } from '../formulaEngine';
import { Calculator, Check, AlertCircle, HelpCircle, Code, Sparkles, Variable } from 'lucide-react';

export interface FormulaEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: FormulaConfig) => void;
  initialConfig?: FormulaConfig;
  availableProperties: CollectionPropertyDefinition[];
  propertyName: string;
}

const SAMPLE_FUNCTIONS = [
  { name: 'prop("key")', desc: 'References a property on this note', category: 'Property' },
  { name: 'today()', desc: 'Returns today\'s date (YYYY-MM-DD)', category: 'Date' },
  { name: 'daysBetween(d1, d2)', desc: 'Calculates number of days between two dates', category: 'Date' },
  { name: 'addDays(d, n)', desc: 'Adds n days to a date', category: 'Date' },
  { name: 'if(cond, a, b)', desc: 'Returns a if condition is true, otherwise b', category: 'Logic' },
  { name: 'coalesce(a, b, ...)', desc: 'Returns the first non-null value', category: 'Safety' },
  { name: 'isEmpty(val)', desc: 'Returns true if property is empty/null', category: 'Safety' },
  { name: 'round(n, decimals)', desc: 'Rounds number to decimal places', category: 'Math' },
  { name: 'min(a, b, ...)', desc: 'Returns minimum of numbers', category: 'Math' },
  { name: 'max(a, b, ...)', desc: 'Returns maximum of numbers', category: 'Math' },
  { name: 'abs(n)', desc: 'Absolute value of number', category: 'Math' },
  { name: 'concat(a, b, ...)', desc: 'Concatenates multiple text values', category: 'Text' },
  { name: 'length(str)', desc: 'Length of string or list', category: 'Text' },
  { name: 'lower(str)', desc: 'Converts text to lowercase', category: 'Text' },
  { name: 'upper(str)', desc: 'Converts text to uppercase', category: 'Text' },
  { name: 'contains(str, needle)', desc: 'Checks if text contains substring', category: 'Text' },
];

export const FormulaEditorModal: React.FC<FormulaEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  availableProperties,
  propertyName,
}) => {
  const [expression, setExpression] = useState(initialConfig?.expression || '');
  const [outputType, setOutputType] = useState<'number' | 'text' | 'boolean' | 'date'>(
    initialConfig?.outputType || 'number'
  );
  const [format, setFormat] = useState<'plain' | 'currency' | 'percent' | 'decimal'>(
    initialConfig?.format || 'plain'
  );
  const [precision, setPrecision] = useState<number>(initialConfig?.precision ?? 2);

  // Sample test state
  const [testContext, setTestContext] = useState<Record<string, any>>({
    budget: 5000,
    spent: 3200,
    due: '2026-10-15',
    priority: 'high',
    title: 'Website Redesign',
  });

  // Real-time evaluation and syntax test
  const validation = useMemo(() => {
    const deps = inspectFormulaDependencies(expression);
    if (!expression.trim()) {
      return { isValid: true, error: undefined, result: null };
    }
    if (!deps.isValid) {
      return { isValid: false, error: deps.errorMessage, result: null };
    }
    const evalResult = evaluateFormula(expression, {
      properties: testContext,
      systemValues: {
        createdAt: '2026-01-01',
        updatedAt: '2026-09-01',
        wordCount: 450,
        taskCount: 8,
        openTaskCount: 3,
        backlinkCount: 4,
      },
      now: new Date(),
    });
    return {
      isValid: !evalResult.error,
      error: evalResult.error,
      result: evalResult.value,
      inferredType: evalResult.type,
    };
  }, [expression, testContext]);

  if (!isOpen) return null;

  const insertSnippet = (snippet: string) => {
    setExpression((prev) => (prev ? `${prev} ${snippet}` : snippet));
  };

  const handleSave = () => {
    onSave({
      expression: expression.trim(),
      outputType,
      format,
      precision,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="formula-editor-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-amber-500" />
            <div>
              <h2 id="formula-editor-title" className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                Formula Expression for "{propertyName}"
              </h2>
              <p className="text-[11px] text-stone-400">
                Deterministic same-record calculations backed by safe AST parser
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Expression Input Area */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Expression
            </label>
            <div className="relative">
              <textarea
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder='e.g. prop("budget") - prop("spent") or daysBetween(today(), prop("due"))'
                rows={3}
                className="w-full font-mono text-xs p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            {/* Validation State Banner */}
            <div className="mt-2 flex items-center justify-between">
              {validation.error ? (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validation.error}</span>
                </div>
              ) : expression.trim() ? (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="w-4 h-4" />
                  <span>Valid Expression</span>
                  <span className="text-stone-400">•</span>
                  <span className="text-stone-500">
                    Preview Result: <strong className="text-stone-800 dark:text-stone-200 font-mono">{String(validation.result ?? 'null')}</strong>
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-stone-400">Enter a formula expression above</div>
              )}
            </div>
          </div>

          {/* Available Property Pills */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">
              Available Properties
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableProperties
                .filter((p) => p.name !== propertyName)
                .map((prop) => (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => insertSnippet(`prop("${prop.id}")`)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 border border-stone-200/80 dark:border-stone-700/80 text-xs text-stone-700 dark:text-stone-300 transition-colors"
                  >
                    <Variable className="w-3 h-3 text-amber-500" />
                    <span>{prop.name}</span>
                    <span className="text-[10px] text-stone-400 font-mono">({prop.type})</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Quick Functions & Operators */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">
              Common Functions
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
              {SAMPLE_FUNCTIONS.map((fn) => (
                <button
                  key={fn.name}
                  type="button"
                  onClick={() => insertSnippet(fn.name)}
                  className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 hover:border-amber-500/50 text-left transition-colors group"
                >
                  <div className="text-[11px] font-mono font-semibold text-stone-800 dark:text-stone-200 group-hover:text-amber-500 truncate">
                    {fn.name}
                  </div>
                  <div className="text-[10px] text-stone-400 truncate mt-0.5">{fn.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Output Formatting */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-stone-100 dark:border-stone-800">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Output Type
              </label>
              <select
                value={outputType}
                onChange={(e) => setOutputType(e.target.value as any)}
                className="w-full p-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100"
              >
                <option value="number">Number</option>
                <option value="text">Text</option>
                <option value="boolean">Boolean</option>
                <option value="date">Date</option>
              </select>
            </div>

            {outputType === 'number' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Number Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full p-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100"
                  >
                    <option value="plain">Plain Number (1234.56)</option>
                    <option value="currency">Currency ($1,234.56)</option>
                    <option value="percent">Percentage (45%)</option>
                    <option value="decimal">Formatted Decimal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Decimals
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={precision}
                    onChange={(e) => setPrecision(Number(e.target.value))}
                    className="w-full p-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!validation.isValid}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
          >
            Save Formula
          </button>
        </div>
      </div>
    </div>
  );
};
