import React, { useState } from 'react';
import { X, Sparkles, HelpCircle, FileText, Check, Copy } from 'lucide-react';
import { createQACardSnippet, wrapSelectionAsCloze, getNextClozeIndex } from '../cardParser';

export interface CreateCardModalProps {
  initialText?: string;
  noteContent?: string;
  onInsertSnippet: (snippet: string) => void;
  onClose: () => void;
}

export const CreateCardModal: React.FC<CreateCardModalProps> = ({
  initialText = '',
  noteContent = '',
  onInsertSnippet,
  onClose,
}) => {
  const [cardType, setCardType] = useState<'qa' | 'cloze'>('qa');
  const [question, setQuestion] = useState(initialText);
  const [answer, setAnswer] = useState('');
  const [customCardId, setCustomCardId] = useState('');
  const [clozeText, setClozeText] = useState(initialText);
  const [clozeHint, setClozeHint] = useState('');
  const [copied, setCopied] = useState(false);

  const nextClozeNum = getNextClozeIndex(noteContent);

  const generatedSnippet =
    cardType === 'qa'
      ? createQACardSnippet(question || 'Question', answer || 'Answer', customCardId || undefined)
      : `{{c${nextClozeNum}::${clozeText || 'answer'}${clozeHint ? `::${clozeHint}` : ''}}}`;

  const handleInsert = () => {
    onInsertSnippet(generatedSnippet);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Create Review Flashcard
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Card Type Selector */}
          <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-800 p-1 bg-neutral-50 dark:bg-neutral-800/50">
            <button
              onClick={() => setCardType('qa')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                cardType === 'qa'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Question & Answer (Q/A)
            </button>
            <button
              onClick={() => setCardType('cloze')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                cardType === 'cloze'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Cloze Deletion ({`{{c${nextClozeNum}::...}}`})
            </button>
          </div>

          {cardType === 'qa' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Question (Prompt)
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What is the derivative of sin(x)?"
                  rows={2}
                  className="w-full text-sm p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Answer
                </label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g. cos(x)"
                  rows={2}
                  className="w-full text-sm p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Custom Card ID (Optional, e.g. "deriv-sin")
                </label>
                <input
                  type="text"
                  value={customCardId}
                  onChange={(e) => setCustomCardId(e.target.value)}
                  placeholder="card-..."
                  className="w-full text-xs p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Concealed Text (Answer for cloze c{nextClozeNum})
                </label>
                <input
                  type="text"
                  value={clozeText}
                  onChange={(e) => setClozeText(e.target.value)}
                  placeholder="e.g. mitochondria"
                  className="w-full text-sm p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Optional Hint
                </label>
                <input
                  type="text"
                  value={clozeHint}
                  onChange={(e) => setClozeHint(e.target.value)}
                  placeholder="e.g. powerhouse of the cell"
                  className="w-full text-xs p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>
            </div>
          )}

          {/* Generated Markdown Preview */}
          <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700">
            <div className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider mb-1 flex justify-between items-center">
              <span>Markdown Preview</span>
              <button
                onClick={handleCopy}
                className="hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center space-x-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
              {generatedSnippet.trim()}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            className="px-4 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-md transition-colors"
          >
            Insert Card into Note
          </button>
        </div>
      </div>
    </div>
  );
};
