import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Columns,
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
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  HelpCircle,
  Award,
  ChevronDown,
  Layers,
  Flame,
  Brain,
  ListOrdered,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import { fireConfetti } from '../../utils/confetti';

export type RecallRating = 'untested' | 'learning' | 'reviewing' | 'mastered';

export interface CornellRow {
  id: string;
  cue: string; // Question, keyword, core term, or prompt
  notes: string; // Detailed notes, explanation, bullets, code
  recallRating: RecallRating;
}

export interface CornellTemplate {
  id: string;
  name: string;
  category: string;
  topic: string;
  essentialQuestion: string;
  sourceOrCourse: string;
  summary: string;
  rows: Omit<CornellRow, 'id' | 'recallRating'>[];
}

export const CORNELL_STARTER_TEMPLATES: CornellTemplate[] = [
  {
    id: 'distributed-cap',
    name: 'Distributed Systems: CAP Theorem',
    category: 'Computer Science',
    topic: 'Distributed Systems & The CAP Theorem',
    essentialQuestion: 'Why must distributed databases trade off consistency for availability during network partitions?',
    sourceOrCourse: 'CS 645: Advanced Distributed Systems',
    summary:
      'Because physical networks are inherently unreliable (network splits and dropped packets are inevitable), a distributed datastore must choose between returning stale data (AP) or rejecting writes to maintain linearizable consistency (CP).',
    rows: [
      {
        cue: 'What does the CAP Theorem state?',
        notes:
          'Formulated by Eric Brewer and formally proven by Gilbert & Lynch; states that any distributed data store can simultaneously provide at most two of three guarantees: Consistency, Availability, and Partition Tolerance.',
      },
      {
        cue: 'Why is Partition Tolerance (P) mandatory in real systems?',
        notes:
          'Network hardware, routers, switches, and cross-datacenter fiber links inevitably experience latency spikes or severed connections. Because partitions cannot be prevented, system architects must choose between CP or AP when partitions occur.',
      },
      {
        cue: 'What is the trade-off in a CP system during netsplit?',
        notes:
          'Prioritizes Consistency: All read requests return the most recent write or error out. If a node cannot verify agreement with the majority quorum, it refuses write requests to avoid split-brain anomalies (e.g. Raft, Paxos, etcd).',
      },
      {
        cue: 'What is the trade-off in an AP system during netsplit?',
        notes:
          'Prioritizes Availability: Every non-failing node returns a response, even if network partitions prevent synchronizing latest state. Uses eventual consistency, CRDTs, or vector clocks (e.g. Cassandra, DynamoDB, CouchDB).',
      },
      {
        cue: 'What does Daniel Abadi’s PACELC Theorem add to CAP?',
        notes:
          'If Partition (P): choose Availability (A) vs Consistency (C);\nElse (E) in normal operation: choose Latency (L) vs Consistency (C). Even without network faults, synchronizing replicas adds latency.',
      },
    ],
  },
  {
    id: 'cognitive-recall',
    name: 'Cognitive Science: Spaced Retrieval',
    category: 'Learning & Memory',
    topic: 'Active Recall & Synaptic Reconsolidation',
    essentialQuestion: 'How does effortful retrieval practice restructure neural synaptic pathways compared to passive review?',
    sourceOrCourse: 'Cognitive Psychology · Learning Architectures',
    summary:
      'Effortful active retrieval triggers synaptic reconsolidation, strengthening associative retrieval cues and dramatically flattening Ebbinghaus forgetting curves. Passive recognition (re-reading, highlighting) produces an illusion of competence without durable storage.',
  rows: [
      {
        cue: 'What is the "Testing Effect" (Retrieval Practice)?',
        notes:
          'Actively quizzing oneself or reconstructing knowledge from memory produces substantially higher long-term retention than spending the equivalent time re-reading notes or textbooks.',
      },
      {
        cue: 'What are "Desirable Difficulties" (Robert Bjork)?',
        notes:
          'Conditions of learning that create challenges for the learner (such as spacing, interleaving, and variation) slow down initial acquisition speed but dramatically enhance long-term transfer and retention.',
      },
      {
        cue: 'How does Spaced Repetition alter Ebbinghaus Decay?',
        notes:
          'Unreinforced memory decays exponentially. Each successful spaced retrieval flattens the decay gradient, effectively doubling the half-life of retention with minimal total time investment.',
      },
      {
        cue: 'Why does Passive Re-reading create an Illusion of Competence?',
        notes:
          'Familiarity with the words on a page is mistaken for generative mastery. When the source material is removed, associative cues fail to trigger because neural retrieval pathways were never exercised.',
      },
    ],
  },
  {
    id: 'first-principles-thinking',
    name: 'Mental Models: First-Principles & Inversion',
    category: 'Strategy & Thinking',
    topic: 'First-Principles Reasoning & Strategic Inversion',
    essentialQuestion: 'How can thinkers dismantle inherited analogies to uncover foundational leverage points?',
    sourceOrCourse: 'Executive Leadership & Decision Systems',
    summary:
      'First-principles reasoning boils problems down to physical and mathematical bedrock truths, while Jacobi inversion guards against fatal unforced errors by systematically identifying and neutralizing failure modes.',
    rows: [
      {
        cue: 'What distinguishes Reasoning by Analogy vs First Principles?',
        notes:
          'Reasoning by analogy copies what others have done with minor incremental tweaks. First principles deconstructs an assertion into fundamental physical or axiomatic truths, rebuilding reasoning upwards from scratch.',
      },
      {
        cue: 'What is the Jacobi Inversion Principle ("Man muss immer umkehren")?',
        notes:
          'Instead of asking "How do we achieve great success?", ask "What conditions would guarantee catastrophic failure?" Systematically prevent and eliminate those failure conditions to ensure resilient progress.',
      },
      {
        cue: 'What is Second-Order Thinking (Howard Marks)?',
        notes:
          'First-order thinking asks: "This is good, let\'s do it." Second-order thinking asks: "And then what happens after that?" It accounts for human reactions, market corrections, feedback loops, and delayed downstream consequences.',
      },
      {
        cue: 'What is Chesterton’s Fence?',
        notes:
          'Never demolish a fence or remove an existing policy until you fully understand why it was built in the first place. Seemingly redundant or friction-inducing rules often defend against subtle historical disasters.',
      },
    ],
  },
];

const LOCAL_STORAGE_SESSION_KEY = 'pkm_cornell_session_v1';

export interface CornellNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  onCreateSynthesizedNote?: (
    title: string,
    content: string,
    linkedNoteIds: string[]
  ) => Promise<void> | void;
  onOpenNote?: (noteId: string) => void;
}

export const CornellNotesModal: React.FC<CornellNotesModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders: _folders,
  onCreateSynthesizedNote,
  onOpenNote,
}) => {
  // Session fields
  const [topic, setTopic] = useState('Distributed Systems & The CAP Theorem');
  const [essentialQuestion, setEssentialQuestion] = useState(
    'Why must distributed databases trade off consistency for availability during network partitions?'
  );
  const [sourceOrCourse, setSourceOrCourse] = useState('CS 645: Advanced Distributed Systems');
  const [summary, setSummary] = useState(
    'Because physical networks are inherently unreliable (network splits and dropped packets are inevitable), a distributed datastore must choose between returning stale data (AP) or rejecting writes to maintain linearizable consistency (CP).'
  );
  const [rows, setRows] = useState<CornellRow[]>(() =>
    CORNELL_STARTER_TEMPLATES[0].rows.map((r, i) => ({
      id: `row-${Date.now()}-${i}`,
      cue: r.cue,
      notes: r.notes,
      recallRating: 'untested',
    }))
  );

  // Active Recall Mode state
  const [isRecallMode, setIsRecallMode] = useState(false);
  const [activeRecallRowIndex, setActiveRecallRowIndex] = useState(0);
  const [revealedRows, setRevealedRows] = useState<Record<string, boolean>>({});
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [notePickerSearch, setNotePickerSearch] = useState('');
  const [selectedVaultNoteId, setSelectedVaultNoteId] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [createdFeedback, setCreatedFeedback] = useState(false);

  // Load saved session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
          setTopic(parsed.topic || 'Distributed Systems & The CAP Theorem');
          setEssentialQuestion(parsed.essentialQuestion || '');
          setSourceOrCourse(parsed.sourceOrCourse || '');
          setSummary(parsed.summary || '');
          setRows(parsed.rows);
          if (parsed.selectedVaultNoteId) setSelectedVaultNoteId(parsed.selectedVaultNoteId);
        }
      }
    } catch {
      // Ignore parse failure
    }
  }, []);

  // Persist session to localStorage
  useEffect(() => {
    try {
      const payload = {
        topic,
        essentialQuestion,
        sourceOrCourse,
        summary,
        rows,
        selectedVaultNoteId,
      };
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [topic, essentialQuestion, sourceOrCourse, summary, rows, selectedVaultNoteId]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showNotePicker) {
          setShowNotePicker(false);
        } else {
          onClose();
        }
      }
      // Space to reveal notes in Active Recall mode if focused on canvas
      if (isRecallMode && e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const currentRow = rows[activeRecallRowIndex];
        if (currentRow) {
          setRevealedRows((prev) => ({
            ...prev,
            [currentRow.id]: !prev[currentRow.id],
          }));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showNotePicker, onClose, isRecallMode, activeRecallRowIndex, rows]);

  // Filter notes for import picker
  const availableNotes = useMemo(() => {
    const q = notePickerSearch.trim().toLowerCase();
    return notes
      .filter((n) => !n.trashed)
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .slice(0, 15);
  }, [notes, notePickerSearch]);

  // Add new blank row
  const handleAddRow = () => {
    const newRow: CornellRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      cue: '',
      notes: '',
      recallRating: 'untested',
    };
    setRows((prev) => [...prev, newRow]);
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Update row fields
  const handleUpdateRow = (id: string, field: 'cue' | 'notes', val: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  // Set recall rating for row
  const handleSetRecallRating = (id: string, rating: RecallRating) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, recallRating: rating } : r))
    );
    // Check if all rows now tested
    const nextRows = rows.map((r) => (r.id === id ? { ...r, recallRating: rating } : r));
    const allDone = nextRows.length > 0 && nextRows.every((r) => r.recallRating !== 'untested');
    if (allDone) {
      fireConfetti();
    }
  };

  // Reset to starter template
  const handleApplyTemplate = (tmpl: CornellTemplate) => {
    setTopic(tmpl.topic);
    setEssentialQuestion(tmpl.essentialQuestion);
    setSourceOrCourse(tmpl.sourceOrCourse);
    setSummary(tmpl.summary);
    setRows(
      tmpl.rows.map((r, i) => ({
        id: `row-${Date.now()}-${i}`,
        cue: r.cue,
        notes: r.notes,
        recallRating: 'untested',
      }))
    );
    setSelectedVaultNoteId(null);
    setRevealedRows({});
    setIsRecallMode(false);
  };

  // Import from vault note
  const handleImportNote = (note: Note) => {
    setSelectedVaultNoteId(note.id);
    setTopic(note.title || 'Imported Study Notes');
    setSourceOrCourse(`Vault Note: [[${note.title}]]`);

    const rawLines = note.content.split('\n');
    const parsedRows: CornellRow[] = [];
    let currentCue = '';
    let currentNotesAccum: string[] = [];
    let foundSummary = '';

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;

      // Detect summary section
      if (line.match(/^#{1,4}\s*(summary|takeaway|conclusion)/i)) {
        // Collect following lines as summary
        const summaryLines: string[] = [];
        for (let j = i + 1; j < rawLines.length; j++) {
          const sLine = rawLines[j].trim();
          if (sLine.startsWith('#')) break;
          if (sLine) summaryLines.push(sLine);
        }
        foundSummary = summaryLines.join(' ');
        break;
      }

      // Check heading or Q:
      if (line.match(/^#{2,4}\s+(.+)$/)) {
        if (currentCue) {
          parsedRows.push({
            id: `row-${Date.now()}-${parsedRows.length}`,
            cue: currentCue,
            notes: currentNotesAccum.join('\n').trim() || 'Key details from note section.',
            recallRating: 'untested',
          });
        }
        currentCue = line.replace(/^#{2,4}\s+/, '').trim();
        currentNotesAccum = [];
      } else if (line.match(/^(?:[-*+]\s+)?(?:\*\*Q:\*\*|Q::|Q:)\s*(.+)$/i)) {
        if (currentCue) {
          parsedRows.push({
            id: `row-${Date.now()}-${parsedRows.length}`,
            cue: currentCue,
            notes: currentNotesAccum.join('\n').trim(),
            recallRating: 'untested',
          });
        }
        currentCue = line.replace(/^(?:[-*+]\s+)?(?:\*\*Q:\*\*|Q::|Q:)\s*/i, '').trim();
        currentNotesAccum = [];
      } else {
        // Regular line
        currentNotesAccum.push(line);
      }
    }

    if (currentCue) {
      parsedRows.push({
        id: `row-${Date.now()}-${parsedRows.length}`,
        cue: currentCue,
        notes: currentNotesAccum.join('\n').trim() || 'Key details from note section.',
        recallRating: 'untested',
      });
    }

    if (parsedRows.length > 0) {
      setRows(parsedRows);
    }
    if (foundSummary) {
      setSummary(foundSummary);
    }

    setShowNotePicker(false);
  };

  // Generate markdown output
  const generateMarkdown = useCallback((): string => {
    const today = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    let md = `---
type: cornell-notes
feature: 10
topic: "${topic.replace(/"/g, '\\"')}"
date: "${today}"
tags: [cornell, study, active-recall, synthesis]
---

# 🎓 ${topic}
**Source / Course:** ${sourceOrCourse || 'General Study'}  
**Date:** ${today}  
${selectedVaultNoteId ? `**Linked Source Note:** [[${notes.find((n) => n.id === selectedVaultNoteId)?.title || 'Source'}]]  \n` : ''}
> ❓ **Essential Question / Core Objective:**  
> ${essentialQuestion || 'What are the fundamental mechanics and non-negotiable principles of this topic?'}

---

## 📋 Cornell Structured Matrix (Cues & Detailed Notes)

| 🎯 Recall Cue / Prompt | 📝 Detailed Notes, Explanations & Examples |
| :--- | :--- |
`;

    for (const row of rows) {
      const cleanCue = row.cue.replace(/\|/g, '\\|').replace(/\n/g, '<br/>');
      const cleanNotes = row.notes.replace(/\|/g, '\\|').replace(/\n/g, '<br/>');
      md += `| **${cleanCue || 'Untitled Cue'}** | ${cleanNotes || 'No notes entered'} |\n`;
    }

    md += `\n---\n\n## 💡 Synthesis & Core Takeaway\n> ${summary || 'No summary entered yet.'}\n\n`;

    // Append standard Q&A flashcard block so SRS card parser can index it automatically
    md += `\n---\n\n## 🧠 Active Recall Flashcards\n`;
    for (const row of rows) {
      if (row.cue.trim() && row.notes.trim()) {
        md += `**Q:** ${row.cue.trim()}\n**A:** ${row.notes.trim()}\n\n`;
      }
    }

    return md;
  }, [topic, sourceOrCourse, selectedVaultNoteId, notes, essentialQuestion, rows, summary]);

  // Copy Markdown to clipboard
  const handleCopyMarkdown = () => {
    const md = generateMarkdown();
    navigator.clipboard.writeText(md).then(() => {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    });
  };

  // Synthesize into Vault Note
  const handleCreateNoteFromCornell = async () => {
    if (!onCreateSynthesizedNote) return;
    const md = generateMarkdown();
    const title = `Cornell Study: ${topic}`;
    const linkedIds = selectedVaultNoteId ? [selectedVaultNoteId] : [];

    await onCreateSynthesizedNote(title, md, linkedIds);
    setCreatedFeedback(true);
    fireConfetti();
    setTimeout(() => {
      setCreatedFeedback(false);
      onClose();
    }, 900);
  };

  // Active recall metrics
  const recallStats = useMemo(() => {
    let mastered = 0;
    let reviewing = 0;
    let learning = 0;
    let untested = 0;
    for (const r of rows) {
      if (r.recallRating === 'mastered') mastered++;
      else if (r.recallRating === 'reviewing') reviewing++;
      else if (r.recallRating === 'learning') learning++;
      else untested++;
    }
    const testedTotal = mastered + reviewing + learning;
    const scorePct = rows.length > 0 ? Math.round((mastered / rows.length) * 100) : 0;
    return { mastered, reviewing, learning, untested, testedTotal, scorePct };
  }, [rows]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cornell Notes & Structured Active Recall Studio (Feature 10)"
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-5xl h-[92vh] bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden text-stone-900 dark:text-stone-100"
      >
        {/* Header Bar */}
        <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0 bg-stone-50/80 dark:bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-xs">
              <Columns className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  Cornell Notes Studio
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  Feature 10
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono text-stone-500 dark:text-stone-400">
                  Alt+C
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Pauk 3-Zone Architecture · Cues, Structured Notes, Synthesis & Active Recall Arena
              </p>
            </div>
          </div>

          {/* Action buttons & Close */}
          <div className="flex items-center gap-2">
            {/* Mode Switcher: Edit Outliner vs Active Recall Arena */}
            <div className="flex items-center bg-stone-200/80 dark:bg-stone-800/80 p-0.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold">
              <button
                id="btn-cornell-mode-outline"
                onClick={() => setIsRecallMode(false)}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  !isRecallMode
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-violet-500" />
                <span>Outliner</span>
              </button>
              <button
                id="btn-cornell-mode-recall"
                onClick={() => {
                  setIsRecallMode(true);
                  // Default mask all rows in recall mode
                  const masks: Record<string, boolean> = {};
                  rows.forEach((r) => (masks[r.id] = false));
                  setRevealedRows(masks);
                }}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  isRecallMode
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Active Recall Arena</span>
                {recallStats.testedTotal > 0 && (
                  <span className="text-[10px] px-1 rounded-full bg-violet-700/60 text-white">
                    {recallStats.mastered}/{rows.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subheader Toolbar: Templates, Vault Note Import, Reset */}
        <div className="px-4 py-2 border-b border-stone-200/80 dark:border-stone-800/80 bg-stone-100/50 dark:bg-stone-900/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-violet-500" /> Starters:
            </span>
            {CORNELL_STARTER_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleApplyTemplate(tmpl)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-violet-400 dark:hover:border-violet-600 text-stone-700 dark:text-stone-300 font-medium text-[11px] transition-colors shrink-0"
              >
                {tmpl.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-import-vault-note"
              onClick={() => setShowNotePicker(true)}
              className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 font-medium text-[11px] flex items-center gap-1 transition-colors"
            >
              <Search className="w-3 h-3" />
              <span>Import from Vault Note</span>
            </button>

            <button
              onClick={() => {
                setRows([]);
                setTopic('Untitled Concept Study');
                setEssentialQuestion('');
                setSourceOrCourse('');
                setSummary('');
                setSelectedVaultNoteId(null);
              }}
              title="Clear all fields"
              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Cornell Zone 1: Header / Topic & Essential Question */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Topic / Conceptual Subject
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Distributed Systems & The CAP Theorem"
                  className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Source / Course Reference
                </label>
                <input
                  type="text"
                  value={sourceOrCourse}
                  onChange={(e) => setSourceOrCourse(e.target.value)}
                  placeholder="e.g. CS 645 / Chapter 4 / Paper"
                  className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> Essential Question / Core Focus
              </label>
              <input
                type="text"
                value={essentialQuestion}
                onChange={(e) => setEssentialQuestion(e.target.value)}
                placeholder="What foundational question or mystery does this study sheet resolve?"
                className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg px-3 py-1.5 text-xs italic text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Cornell Zone 2: Two-Column Cue & Notes Matrix */}
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 overflow-hidden shadow-xs">
            {/* Column Headers */}
            <div className="grid grid-cols-12 border-b border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-900/80 px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300">
              <div className="col-span-12 sm:col-span-4 flex items-center gap-1.5 text-violet-700 dark:text-violet-300">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Recall Cues & Keywords (30%)</span>
              </div>
              <div className="col-span-12 sm:col-span-8 flex items-center justify-between text-stone-700 dark:text-stone-300 pl-0 sm:pl-3">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Main Notes, Details & Explanations (70%)</span>
                </div>
                {isRecallMode && (
                  <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 font-semibold">
                    Press Space to Toggle Reveal
                  </span>
                )}
              </div>
            </div>

            {/* Rows List */}
            {rows.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-stone-400 text-xs">No cues or notes yet. Click below or pick a starter template.</p>
                <button
                  onClick={handleAddRow}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Cue & Note</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-stone-200/80 dark:divide-stone-800/80">
                {rows.map((row, index) => {
                  const isMasked = isRecallMode && !revealedRows[row.id];

                  return (
                    <div
                      key={row.id}
                      className={`grid grid-cols-12 p-3 sm:p-4 gap-3 sm:gap-4 transition-colors ${
                        isRecallMode && activeRecallRowIndex === index
                          ? 'bg-violet-50/50 dark:bg-violet-950/20'
                          : 'hover:bg-stone-50/40 dark:hover:bg-stone-900/30'
                      }`}
                      onClick={() => isRecallMode && setActiveRecallRowIndex(index)}
                    >
                      {/* Left: Cue Column */}
                      <div className="col-span-12 sm:col-span-4 space-y-1.5 sm:border-r sm:border-stone-200 sm:dark:border-stone-800 sm:pr-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-violet-600 dark:text-violet-400">
                            Cue #{index + 1}
                          </span>
                          {!isRecallMode && (
                            <button
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-stone-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {!isRecallMode ? (
                          <textarea
                            rows={3}
                            value={row.cue}
                            onChange={(e) => handleUpdateRow(row.id, 'cue', e.target.value)}
                            placeholder="Key term, formula, question, or recall trigger..."
                            className="w-full bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-lg p-2 text-xs font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-violet-500 resize-none"
                          />
                        ) : (
                          <div className="p-2.5 rounded-lg bg-violet-100/60 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 text-xs font-semibold text-violet-950 dark:text-violet-200">
                            {row.cue || <span className="italic text-stone-400">Blank cue prompt</span>}
                          </div>
                        )}

                        {/* Recall Rating Badge */}
                        {row.recallRating !== 'untested' && (
                          <div className="flex items-center gap-1 pt-1">
                            {row.recallRating === 'mastered' && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                <Award className="w-3 h-3" /> Mastered
                              </span>
                            )}
                            {row.recallRating === 'reviewing' && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                <RotateCcw className="w-3 h-3" /> Getting There
                              </span>
                            )}
                            {row.recallRating === 'learning' && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                                <Brain className="w-3 h-3" /> Needs Practice
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Notes Column */}
                      <div className="col-span-12 sm:col-span-8 space-y-2">
                        {!isRecallMode ? (
                          <textarea
                            rows={3}
                            value={row.notes}
                            onChange={(e) => handleUpdateRow(row.id, 'notes', e.target.value)}
                            placeholder="Detailed notes, bullet points, explanations, examples..."
                            className="w-full bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-lg p-2.5 text-xs text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-violet-500 resize-y min-h-[70px]"
                          />
                        ) : isMasked ? (
                          /* Masked State for Active Recall */
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setRevealedRows((prev) => ({ ...prev, [row.id]: true }));
                            }}
                            className="w-full min-h-[85px] rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-100/70 dark:bg-stone-900/70 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all select-none p-4 text-stone-500 dark:text-stone-400"
                          >
                            <EyeOff className="w-4 h-4 text-violet-500" />
                            <span className="text-xs font-semibold">
                              Notes Concealed for Active Recall
                            </span>
                            <span className="text-[10px] text-stone-400">
                              Click or press Space to reveal answer
                            </span>
                          </div>
                        ) : (
                          /* Revealed State for Active Recall with self-scoring */
                          <div className="space-y-2.5">
                            <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
                              {row.notes}
                            </div>

                            {/* Self-Rating Assessment Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-stone-800/60">
                              <span className="text-[10px] font-semibold text-stone-500">
                                How well did you recall this?
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetRecallRating(row.id, 'learning');
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                                    row.recallRating === 'learning'
                                      ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-rose-50 hover:text-rose-700'
                                  }`}
                                >
                                  🔴 Needs Practice
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetRecallRating(row.id, 'reviewing');
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                                    row.recallRating === 'reviewing'
                                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-amber-50 hover:text-amber-700'
                                  }`}
                                >
                                  🟡 Getting There
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetRecallRating(row.id, 'mastered');
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                                    row.recallRating === 'mastered'
                                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-emerald-50 hover:text-emerald-700'
                                  }`}
                                >
                                  🟢 Mastered
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRevealedRows((prev) => ({ ...prev, [row.id]: false }));
                                  }}
                                  title="Hide notes again"
                                  className="p-1 rounded text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Row Adder Button */}
            {!isRecallMode && (
              <div className="p-3 border-t border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/50">
                <button
                  id="btn-add-cornell-row"
                  onClick={handleAddRow}
                  className="w-full py-2 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 hover:border-violet-500 hover:bg-violet-50/40 dark:hover:bg-violet-950/20 text-stone-600 dark:text-stone-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-violet-500" />
                  <span>Add Cornell Cue & Note Row</span>
                </button>
              </div>
            )}
          </div>

          {/* Cornell Zone 3: Bottom Summary / Synthesis Section */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                <span>Zone 3: Summary & Core Takeaway (Synthesis in your own words)</span>
              </label>
              <span className="text-[10px] text-stone-400">1–3 concise sentences</span>
            </div>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="In 1-3 sentences, what is the fundamental synthesis of this topic that you want to remember permanently?"
              className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg p-2.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-violet-500 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Note Picker Modal Sheet */}
        {showNotePicker && (
          <div className="fixed inset-0 z-60 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-violet-500" />
                  <span>Import Existing Vault Note into Cornell Format</span>
                </h3>
                <button
                  onClick={() => setShowNotePicker(false)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search vault notes..."
                  value={notePickerSearch}
                  onChange={(e) => setNotePickerSearch(e.target.value)}
                  autoFocus
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1">
                {availableNotes.length === 0 ? (
                  <p className="text-center py-4 text-stone-400 text-xs">No matching notes found</p>
                ) : (
                  availableNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => handleImportNote(note)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950/40 border border-transparent hover:border-violet-200 dark:hover:border-violet-800 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                          {note.title || 'Untitled Note'}
                        </p>
                        <p className="text-[10px] text-stone-400 truncate">
                          {note.content.substring(0, 60) || 'Empty note'}
                        </p>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Bar */}
        <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-stone-500 dark:text-stone-400 text-[11px]">
            <span className="font-semibold flex items-center gap-1 text-violet-600 dark:text-violet-400">
              <GraduationCap className="w-3.5 h-3.5" />
              {rows.length} {rows.length === 1 ? 'Row' : 'Rows'}
            </span>
            <span>•</span>
            <span>
              Recall Mastery:{' '}
              <strong className="text-stone-800 dark:text-stone-200">
                {recallStats.scorePct}%
              </strong>{' '}
              ({recallStats.mastered}/{rows.length})
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-copy-cornell-markdown"
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              {copiedMarkdown ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium text-xs transition-colors"
            >
              Close
            </button>

            <button
              id="btn-synthesize-cornell-note"
              onClick={handleCreateNoteFromCornell}
              disabled={createdFeedback}
              className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-md shadow-violet-600/20 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-70"
            >
              {createdFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Created & Opened!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Synthesize into Note</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
