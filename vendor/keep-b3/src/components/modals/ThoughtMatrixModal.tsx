import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Grid2X2,
  X,
  Plus,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  FileText,
  Search,
  CheckSquare,
  ArrowRight,
  ChevronDown,
  Layers,
  Sliders,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { fireConfetti } from '../../utils/confetti';

export interface MatrixItem {
  id: string;
  text: string;
  noteId?: string; // If linked to a note in the vault
  noteTitle?: string;
  quadrant: 1 | 2 | 3 | 4; // 1: top-left, 2: top-right, 3: bottom-left, 4: bottom-right
  addedAt: string;
}

export type MatrixFrameworkKey =
  | 'effort-impact'
  | 'urgent-important'
  | 'value-complexity'
  | 'novelty-feasibility'
  | 'custom';

export interface MatrixQuadrantConfig {
  title: string;
  subtitle: string;
  tag: string;
  colorScheme: {
    bg: string;
    border: string;
    badge: string;
    text: string;
    accent: string;
  };
}

export interface MatrixFramework {
  id: MatrixFrameworkKey;
  name: string;
  description: string;
  xAxisLabel: { left: string; right: string };
  yAxisLabel: { top: string; bottom: string };
  quadrants: {
    1: MatrixQuadrantConfig; // Top-Left
    2: MatrixQuadrantConfig; // Top-Right
    3: MatrixQuadrantConfig; // Bottom-Left
    4: MatrixQuadrantConfig; // Bottom-Right
  };
}

export const MATRIX_FRAMEWORKS: Record<MatrixFrameworkKey, MatrixFramework> = {
  'effort-impact': {
    id: 'effort-impact',
    name: 'Action Priority (Impact vs. Effort)',
    description: 'Prioritize tasks and projects based on expected leverage vs. execution difficulty',
    xAxisLabel: { left: 'Low Effort', right: 'High Effort' },
    yAxisLabel: { top: 'High Impact', bottom: 'Low Impact' },
    quadrants: {
      1: {
        title: 'Quick Wins',
        subtitle: 'High Impact, Low Effort',
        tag: 'Do Immediately',
        colorScheme: {
          bg: 'bg-emerald-50/70 dark:bg-emerald-950/25',
          border: 'border-emerald-200 dark:border-emerald-800/60',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
          text: 'text-emerald-950 dark:text-emerald-100',
          accent: 'emerald',
        },
      },
      2: {
        title: 'Major Projects',
        subtitle: 'High Impact, High Effort',
        tag: 'Plan & Schedule',
        colorScheme: {
          bg: 'bg-blue-50/70 dark:bg-blue-950/25',
          border: 'border-blue-200 dark:border-blue-800/60',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-300 dark:border-blue-700',
          text: 'text-blue-950 dark:text-blue-100',
          accent: 'blue',
        },
      },
      3: {
        title: 'Fill-Ins / Easy Tasks',
        subtitle: 'Low Impact, Low Effort',
        tag: 'Downtime / Batch',
        colorScheme: {
          bg: 'bg-amber-50/70 dark:bg-amber-950/25',
          border: 'border-amber-200 dark:border-amber-800/60',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          text: 'text-amber-950 dark:text-amber-100',
          accent: 'amber',
        },
      },
      4: {
        title: 'Thankless Tasks',
        subtitle: 'Low Impact, High Effort',
        tag: 'Eliminate / Reconsider',
        colorScheme: {
          bg: 'bg-rose-50/70 dark:bg-rose-950/25',
          border: 'border-rose-200 dark:border-rose-800/60',
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-300 dark:border-rose-700',
          text: 'text-rose-950 dark:text-rose-100',
          accent: 'rose',
        },
      },
    },
  },
  'urgent-important': {
    id: 'urgent-important',
    name: 'Eisenhower Matrix (Urgent vs. Important)',
    description: 'Distinguish between immediate pressure and fundamental long-term value',
    xAxisLabel: { left: 'Urgent', right: 'Not Urgent' },
    yAxisLabel: { top: 'Important', bottom: 'Not Important' },
    quadrants: {
      1: {
        title: 'Do First',
        subtitle: 'Urgent & Important',
        tag: 'Immediate Focus',
        colorScheme: {
          bg: 'bg-emerald-50/70 dark:bg-emerald-950/25',
          border: 'border-emerald-200 dark:border-emerald-800/60',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
          text: 'text-emerald-950 dark:text-emerald-100',
          accent: 'emerald',
        },
      },
      2: {
        title: 'Schedule & Grow',
        subtitle: 'Not Urgent & Important',
        tag: 'Strategic Vision',
        colorScheme: {
          bg: 'bg-indigo-50/70 dark:bg-indigo-950/25',
          border: 'border-indigo-200 dark:border-indigo-800/60',
          badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
          text: 'text-indigo-950 dark:text-indigo-100',
          accent: 'indigo',
        },
      },
      3: {
        title: 'Delegate / Automate',
        subtitle: 'Urgent & Not Important',
        tag: 'Minimize Friction',
        colorScheme: {
          bg: 'bg-amber-50/70 dark:bg-amber-950/25',
          border: 'border-amber-200 dark:border-amber-800/60',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          text: 'text-amber-950 dark:text-amber-100',
          accent: 'amber',
        },
      },
      4: {
        title: 'Eliminate',
        subtitle: 'Not Urgent & Not Important',
        tag: 'Declutter Life',
        colorScheme: {
          bg: 'bg-rose-50/70 dark:bg-rose-950/25',
          border: 'border-rose-200 dark:border-rose-800/60',
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-300 dark:border-rose-700',
          text: 'text-rose-950 dark:text-rose-100',
          accent: 'rose',
        },
      },
    },
  },
  'value-complexity': {
    id: 'value-complexity',
    name: 'Product Architecture (Value vs. Complexity)',
    description: 'Score engineering initiatives, features, or architecture components',
    xAxisLabel: { left: 'Low Complexity', right: 'High Complexity' },
    yAxisLabel: { top: 'High Value', bottom: 'Low Value' },
    quadrants: {
      1: {
        title: 'No-Brainers',
        subtitle: 'High Value, Low Complexity',
        tag: 'Implement First',
        colorScheme: {
          bg: 'bg-emerald-50/70 dark:bg-emerald-950/25',
          border: 'border-emerald-200 dark:border-emerald-800/60',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
          text: 'text-emerald-950 dark:text-emerald-100',
          accent: 'emerald',
        },
      },
      2: {
        title: 'Strategic Architecture',
        subtitle: 'High Value, High Complexity',
        tag: 'Architect Deeply',
        colorScheme: {
          bg: 'bg-cyan-50/70 dark:bg-cyan-950/25',
          border: 'border-cyan-200 dark:border-cyan-800/60',
          badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
          text: 'text-cyan-950 dark:text-cyan-100',
          accent: 'cyan',
        },
      },
      3: {
        title: 'Nice-to-Haves',
        subtitle: 'Low Value, Low Complexity',
        tag: 'Backlog / Quick Polish',
        colorScheme: {
          bg: 'bg-amber-50/70 dark:bg-amber-950/25',
          border: 'border-amber-200 dark:border-amber-800/60',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          text: 'text-amber-950 dark:text-amber-100',
          accent: 'amber',
        },
      },
      4: {
        title: 'Over-Engineered Traps',
        subtitle: 'Low Value, High Complexity',
        tag: 'Avoid / Cut',
        colorScheme: {
          bg: 'bg-rose-50/70 dark:bg-rose-950/25',
          border: 'border-rose-200 dark:border-rose-800/60',
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-300 dark:border-rose-700',
          text: 'text-rose-950 dark:text-rose-100',
          accent: 'rose',
        },
      },
    },
  },
  'novelty-feasibility': {
    id: 'novelty-feasibility',
    name: 'Creativity & Discovery (Novelty vs. Feasibility)',
    description: 'Map breakthrough creative sparks against near-term practicality',
    xAxisLabel: { left: 'High Feasibility', right: 'Low Feasibility' },
    yAxisLabel: { top: 'High Novelty', bottom: 'Low Novelty' },
    quadrants: {
      1: {
        title: 'Breakthrough Ideas',
        subtitle: 'High Novelty, High Feasibility',
        tag: 'Golden Opportunities',
        colorScheme: {
          bg: 'bg-purple-50/70 dark:bg-purple-950/25',
          border: 'border-purple-200 dark:border-purple-800/60',
          badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-300 dark:border-purple-700',
          text: 'text-purple-950 dark:text-purple-100',
          accent: 'purple',
        },
      },
      2: {
        title: 'Moonshots & Blue Sky',
        subtitle: 'High Novelty, Low Feasibility',
        tag: 'Research & Explore',
        colorScheme: {
          bg: 'bg-sky-50/70 dark:bg-sky-950/25',
          border: 'border-sky-200 dark:border-sky-800/60',
          badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 border-sky-300 dark:border-sky-700',
          text: 'text-sky-950 dark:text-sky-100',
          accent: 'sky',
        },
      },
      3: {
        title: 'Proven Conventions',
        subtitle: 'Low Novelty, High Feasibility',
        tag: 'Reliable Standards',
        colorScheme: {
          bg: 'bg-stone-50/70 dark:bg-stone-800/30',
          border: 'border-stone-200 dark:border-stone-700',
          badge: 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border-stone-300 dark:border-stone-600',
          text: 'text-stone-900 dark:text-stone-100',
          accent: 'stone',
        },
      },
      4: {
        title: 'Dead Ends',
        subtitle: 'Low Novelty, Low Feasibility',
        tag: 'Disregard',
        colorScheme: {
          bg: 'bg-rose-50/70 dark:bg-rose-950/25',
          border: 'border-rose-200 dark:border-rose-800/60',
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-300 dark:border-rose-700',
          text: 'text-rose-950 dark:text-rose-100',
          accent: 'rose',
        },
      },
    },
  },
  custom: {
    id: 'custom',
    name: 'Custom 2×2 Matrix',
    description: 'Define custom coordinates to evaluate any domain-specific dilemma',
    xAxisLabel: { left: 'Dimension X (Low / Near)', right: 'Dimension X (High / Far)' },
    yAxisLabel: { top: 'Dimension Y (High / Essential)', bottom: 'Dimension Y (Low / Secondary)' },
    quadrants: {
      1: {
        title: 'Quadrant I (High Y, Low X)',
        subtitle: 'Top-Left Focus Area',
        tag: 'Category 1',
        colorScheme: {
          bg: 'bg-teal-50/70 dark:bg-teal-950/25',
          border: 'border-teal-200 dark:border-teal-800/60',
          badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 border-teal-300 dark:border-teal-700',
          text: 'text-teal-950 dark:text-teal-100',
          accent: 'teal',
        },
      },
      2: {
        title: 'Quadrant II (High Y, High X)',
        subtitle: 'Top-Right Strategic Area',
        tag: 'Category 2',
        colorScheme: {
          bg: 'bg-indigo-50/70 dark:bg-indigo-950/25',
          border: 'border-indigo-200 dark:border-indigo-800/60',
          badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
          text: 'text-indigo-950 dark:text-indigo-100',
          accent: 'indigo',
        },
      },
      3: {
        title: 'Quadrant III (Low Y, Low X)',
        subtitle: 'Bottom-Left Tactical Area',
        tag: 'Category 3',
        colorScheme: {
          bg: 'bg-amber-50/70 dark:bg-amber-950/25',
          border: 'border-amber-200 dark:border-amber-800/60',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          text: 'text-amber-950 dark:text-amber-100',
          accent: 'amber',
        },
      },
      4: {
        title: 'Quadrant IV (Low Y, High X)',
        subtitle: 'Bottom-Right Deprioritized Area',
        tag: 'Category 4',
        colorScheme: {
          bg: 'bg-rose-50/70 dark:bg-rose-950/25',
          border: 'border-rose-200 dark:border-rose-800/60',
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-300 dark:border-rose-700',
          text: 'text-rose-950 dark:text-rose-100',
          accent: 'rose',
        },
      },
    },
  },
};

interface ThoughtMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  onCreateSynthesizedNote: (title: string, content: string, linkedNoteIds: string[]) => void;
}

const STORAGE_KEY = 'keepnotes_thought_matrix_state_v1';

export const ThoughtMatrixModal: React.FC<ThoughtMatrixModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  onCreateSynthesizedNote,
}) => {
  const [selectedFramework, setSelectedFramework] = useState<MatrixFrameworkKey>('effort-impact');
  const [items, setItems] = useState<MatrixItem[]>([]);
  const [inputValues, setInputValues] = useState<Record<number, string>>({
    1: '',
    2: '',
    3: '',
    4: '',
  });
  const [showNotePickerQuad, setShowNotePickerQuad] = useState<number | null>(null);
  const [notePickerSearch, setNotePickerSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverQuad, setDragOverQuad] = useState<number | null>(null);

  // Load persisted state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.framework && MATRIX_FRAMEWORKS[parsed.framework as MatrixFrameworkKey]) {
          setSelectedFramework(parsed.framework as MatrixFrameworkKey);
        }
        if (Array.isArray(parsed.items)) {
          setItems(parsed.items);
        }
      } else {
        // Populate with helpful initial seed if empty
        setItems([
          {
            id: 'item-seed-1',
            text: 'Refactor core indexing for 10x query velocity',
            quadrant: 1,
            addedAt: new Date().toISOString(),
          },
          {
            id: 'item-seed-2',
            text: 'Full cross-device sync end-to-end audit',
            quadrant: 2,
            addedAt: new Date().toISOString(),
          },
          {
            id: 'item-seed-3',
            text: 'Tweak subtle button padding in mobile view',
            quadrant: 3,
            addedAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Save state on change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          framework: selectedFramework,
          items,
        })
      );
    } catch {
      // storage unavailable
    }
  }, [selectedFramework, items]);

  const currentFramework = MATRIX_FRAMEWORKS[selectedFramework];

  // Group items by quadrant
  const quadrantItems = useMemo(() => {
    const map: Record<1 | 2 | 3 | 4, MatrixItem[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const item of items) {
      if (map[item.quadrant]) {
        map[item.quadrant].push(item);
      }
    }
    return map;
  }, [items]);

  // Filter notes for the note picker modal
  const availableNotes = useMemo(() => {
    const q = notePickerSearch.toLowerCase().trim();
    return notes
      .filter((n) => !n.trashed)
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
        );
      })
      .slice(0, 15);
  }, [notes, notePickerSearch]);

  const handleAddItem = (quadrant: 1 | 2 | 3 | 4, text: string, note?: Note) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newItem: MatrixItem = {
      id: `matrix-item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: trimmed,
      noteId: note?.id,
      noteTitle: note?.title,
      quadrant,
      addedAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, newItem]);
    setInputValues((prev) => ({ ...prev, [quadrant]: '' }));
    setShowNotePickerQuad(null);
    setNotePickerSearch('');
  };

  const handleMoveItem = (itemId: string, targetQuadrant: 1 | 2 | 3 | 4) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quadrant: targetQuadrant } : item))
    );
  };

  const handleDeleteItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleClearMatrix = () => {
    if (items.length === 0) return;
    if (window.confirm('Are you sure you want to clear all items in this matrix?')) {
      setItems([]);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingItemId(itemId);
  };

  const handleDragOver = (e: React.DragEvent, quad: 1 | 2 | 3 | 4) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverQuad !== quad) {
      setDragOverQuad(quad);
    }
  };

  const handleDrop = (e: React.DragEvent, quad: 1 | 2 | 3 | 4) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain') || draggingItemId;
    if (itemId) {
      handleMoveItem(itemId, quad);
    }
    setDraggingItemId(null);
    setDragOverQuad(null);
  };

  const handleDragEnd = () => {
    setDraggingItemId(null);
    setDragOverQuad(null);
  };

  // Markdown Synthesis Generator
  const generateMarkdownReport = useCallback((): { title: string; content: string; linkedIds: string[] } => {
    const today = new Date().toISOString().split('T')[0];
    const title = `Thought Matrix: ${currentFramework.name} (${today})`;

    const linkedIds: string[] = [];
    for (const it of items) {
      if (it.noteId && !linkedIds.includes(it.noteId)) {
        linkedIds.push(it.noteId);
      }
    }

    let md = `## 📊 Thought Matrix: ${currentFramework.name}\n\n`;
    md += `> **Framework Context**: ${currentFramework.description}\n`;
    md += `> **Evaluation Axes**: Horizontal (${currentFramework.xAxisLabel.left} ↔ ${currentFramework.xAxisLabel.right}) | Vertical (${currentFramework.yAxisLabel.top} ↔ ${currentFramework.yAxisLabel.bottom})\n\n`;

    md += `### 🎯 Strategic Quadrants Breakdown\n\n`;

    const quadKeys: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
    for (const q of quadKeys) {
      const cfg = currentFramework.quadrants[q];
      const quadList = quadrantItems[q];
      md += `#### Q${q}: ${cfg.title} — *${cfg.subtitle}* (${cfg.tag})\n`;
      if (quadList.length === 0) {
        md += `*(No items assigned)*\n\n`;
      } else {
        for (const it of quadList) {
          const noteRef = it.noteTitle ? ` — linked to [[${it.noteTitle}]]` : '';
          md += `- [ ] **${it.text}**${noteRef}\n`;
        }
        md += `\n`;
      }
    }

    // Synthesis Insights
    md += `---\n\n### ⚡ Recommended Next Actions\n`;
    const q1Items = quadrantItems[1];
    if (q1Items.length > 0) {
      md += `**Immediate Execution Queue (Quadrant 1)**:\n`;
      for (const it of q1Items) {
        md += `1. **${it.text}**\n`;
      }
    } else {
      md += `No items currently in Q1. Review items in Q2 to break them down into actionable quick wins.\n`;
    }

    md += `\n*Generated via KeepNotes Thought Matrix Studio (Feature 9).*`;
    return { title, content: md, linkedIds };
  }, [currentFramework, items, quadrantItems]);

  const handleCreateNoteFromMatrix = () => {
    const report = generateMarkdownReport();
    onCreateSynthesizedNote(report.title, report.content, report.linkedIds);
    fireConfetti();
    onClose();
  };

  const handleCopyMarkdown = async () => {
    const report = generateMarkdownReport();
    try {
      await navigator.clipboard.writeText(report.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thought Matrix 2x2 Decision and Priority Studio"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/65 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-4 sm:p-6 text-xs flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Grid2X2 className="w-5 h-5 stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Thought Matrix · 2×2 Decision & Priority Studio
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  Feature 9
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Spatially prioritize ideas, resolve trade-offs, and map multi-variable decisions into high-leverage outcomes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Framework Selector */}
            <div className="relative">
              <select
                id="select-matrix-framework"
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value as MatrixFrameworkKey)}
                className="appearance-none bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 py-1.5 pl-3 pr-8 rounded-xl font-medium text-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {Object.values(MATRIX_FRAMEWORKS).map((fw) => (
                  <option key={fw.id} value={fw.id}>
                    {fw.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500" />
            </div>

            <button
              id="btn-matrix-copy-md"
              onClick={handleCopyMarkdown}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors flex items-center gap-1.5"
              title="Copy Matrix as Markdown"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              id="btn-matrix-clear"
              onClick={handleClearMatrix}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-600 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1.5"
              title="Clear Matrix items"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              id="btn-close-thought-matrix"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Close Thought Matrix"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Matrix Coordinate Legend Banner */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-stone-100/70 dark:bg-stone-800/40 rounded-xl text-[11px] text-stone-600 dark:text-stone-300 shrink-0 font-medium border border-stone-200/60 dark:border-stone-700/60">
          <div className="flex items-center gap-2">
            <span className="text-stone-400 dark:text-stone-500">X-Axis:</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {currentFramework.xAxisLabel.left}
            </span>
            <span className="text-stone-400">↔</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {currentFramework.xAxisLabel.right}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-stone-500 dark:text-stone-400">
            <span>Total Items:</span>
            <span className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 font-mono font-bold text-stone-800 dark:text-stone-200">
              {items.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-400 dark:text-stone-500">Y-Axis:</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {currentFramework.yAxisLabel.top}
            </span>
            <span className="text-stone-400">↕</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {currentFramework.yAxisLabel.bottom}
            </span>
          </div>
        </div>

        {/* The 2x2 Quadrant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 flex-1 overflow-y-auto py-1 min-h-[420px]">
          {([1, 2, 3, 4] as const).map((quad) => {
            const cfg = currentFramework.quadrants[quad];
            const quadItems = quadrantItems[quad];
            const isDropTarget = dragOverQuad === quad;

            return (
              <div
                key={quad}
                id={`matrix-quadrant-${quad}`}
                onDragOver={(e) => handleDragOver(e, quad)}
                onDrop={(e) => handleDrop(e, quad)}
                className={`flex flex-col rounded-2xl border-2 transition-all p-3 sm:p-4 min-h-[200px] ${
                  isDropTarget
                    ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/30'
                    : `${cfg.colorScheme.border} ${cfg.colorScheme.bg}`
                }`}
              >
                {/* Quadrant Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5 dark:border-white/5 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 font-mono text-[10px] font-bold text-stone-700 dark:text-stone-300">
                      Q{quad}
                    </span>
                    <div>
                      <h4 className={`font-bold text-xs sm:text-sm ${cfg.colorScheme.text}`}>
                        {cfg.title}
                      </h4>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400">
                        {cfg.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${cfg.colorScheme.badge}`}
                    >
                      {cfg.tag}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-stone-600 dark:text-stone-300 font-bold">
                      {quadItems.length}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[80px]">
                  {quadItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-6 text-stone-400 dark:text-stone-500">
                      <p className="text-[11px] italic">No items in this quadrant</p>
                      <p className="text-[10px]">Type below or drag an item here</p>
                    </div>
                  ) : (
                    quadItems.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragEnd={handleDragEnd}
                        className="group bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl p-2.5 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex items-start justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-stone-800 dark:text-stone-100 font-medium break-words leading-snug">
                            {item.text}
                          </p>
                          {item.noteTitle && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                              <FileText className="w-2.5 h-2.5" />
                              <span>[[{item.noteTitle}]]</span>
                            </span>
                          )}
                        </div>

                        {/* Card controls */}
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                          {/* Move to another quadrant picker */}
                          <div className="relative group/move">
                            <button
                              aria-label="Move item to another quadrant"
                              className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-[10px] font-mono font-bold"
                              title="Move quadrant"
                            >
                              ⇄
                            </button>
                            <div className="absolute right-0 top-full hidden group-hover/move:flex bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-xl p-1 z-30 gap-1">
                              {([1, 2, 3, 4] as const).map((qTarget) => (
                                <button
                                  key={qTarget}
                                  onClick={() => handleMoveItem(item.id, qTarget)}
                                  className={`w-5 h-5 rounded font-mono text-[9px] font-bold ${
                                    item.quadrant === qTarget
                                      ? 'bg-indigo-600 text-white'
                                      : 'hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                                  }`}
                                >
                                  {qTarget}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Delete item */}
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            aria-label="Delete item"
                            className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 text-stone-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Quadrant Quick Input Bar */}
                <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-center gap-1.5 shrink-0">
                  <input
                    type="text"
                    placeholder={`Add item to Q${quad}... (Press Enter)`}
                    value={inputValues[quad]}
                    onChange={(e) =>
                      setInputValues((prev) => ({ ...prev, [quad]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem(quad, inputValues[quad]);
                      }
                    }}
                    className="flex-1 bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />

                  <button
                    onClick={() => handleAddItem(quad, inputValues[quad])}
                    disabled={!inputValues[quad].trim()}
                    className="p-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
                    title="Add item"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setShowNotePickerQuad(quad);
                      setNotePickerSearch('');
                    }}
                    className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors shrink-0"
                    title="Link note from vault"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note Picker Modal Sheet */}
        {showNotePickerQuad !== null && (
          <div className="fixed inset-0 z-60 bg-stone-950/50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-4 space-y-3 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
                <h4 className="font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Link Vault Note into Q{showNotePickerQuad}</span>
                </h4>
                <button
                  onClick={() => setShowNotePickerQuad(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search notes in vault..."
                  value={notePickerSearch}
                  onChange={(e) => setNotePickerSearch(e.target.value)}
                  autoFocus
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1">
                {availableNotes.length === 0 ? (
                  <p className="text-center py-4 text-stone-400 text-xs">No matching notes found</p>
                ) : (
                  availableNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => handleAddItem(showNotePickerQuad as 1 | 2 | 3 | 4, note.title, note)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                          {note.title || 'Untitled Note'}
                        </p>
                        <p className="text-[10px] text-stone-400 truncate">
                          {note.content.substring(0, 50) || 'Empty note'}
                        </p>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-200 dark:border-stone-800 shrink-0 mt-2">
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              Items auto-persist locally. Synthesizing creates a permanent decision note with wikilinks & action checklist.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium text-xs transition-colors"
            >
              Close
            </button>
            <button
              id="btn-matrix-synthesize"
              onClick={handleCreateNoteFromMatrix}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Synthesize into Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
