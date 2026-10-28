import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Network,
  GitBranch,
  Plus,
  Trash2,
  Edit2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Download,
  Copy,
  Check,
  X,
  FileText,
  Sparkles,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowRight,
  Split,
  Eye,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import {
  MindMapNode,
  parseMarkdownToMindMap,
  serializeMindMapToMarkdown,
  countTotalNodes,
  addChildNode,
  updateNodeText,
  deleteNode,
  toggleNodeCollapse,
} from '../../pkm/mindmap/mindMapTypes';
import { fireConfetti } from '../../utils/confetti';
import { soundscapeService } from '../../utils/soundscapes';

export interface MindMapStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  initialNoteId?: string;
  onSaveToNote: (noteId: string, updatedContent: string) => Promise<void> | void;
  onCreateNote: (title: string, content: string, tags?: string[]) => Promise<void> | void;
}

interface NodeLayout {
  node: MindMapNode;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

export const MindMapStudioModal: React.FC<MindMapStudioModalProps> = ({
  isOpen,
  onClose,
  notes = [],
  folders = [],
  initialNoteId,
  onSaveToNote,
  onCreateNote,
}) => {
  // Active Source Note
  const [selectedNoteId, setSelectedNoteId] = useState<string>(() => {
    if (initialNoteId) return initialNoteId;
    const active = notes.filter((n) => !n.trashed);
    return active[0]?.id || '';
  });

  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === selectedNoteId);
  }, [notes, selectedNoteId]);

  // Mind map state
  const [mindMapRoot, setMindMapRoot] = useState<MindMapNode>(() => {
    const title = activeNote?.title || 'Knowledge Mind Map';
    const content = activeNote?.content || '## Core Ideas\n- First Principle\n- Second Principle\n## Applications\n- Practical Case Study';
    return parseMarkdownToMindMap(title, content);
  });

  // Synchronized markdown outline
  const [markdownOutline, setMarkdownOutline] = useState<string>(() => {
    return serializeMindMapToMarkdown(mindMapRoot);
  });

  // Selected node for editing
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-root');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Canvas Viewport transform (pan & zoom)
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 400, y: 300 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Side Drawer: Live Markdown Editor
  const [showOutlineDrawer, setShowOutlineDrawer] = useState<boolean>(true);
  const [copiedState, setCopiedState] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // When selected note changes from dropdown, parse it into mindmap
  useEffect(() => {
    if (activeNote) {
      const parsed = parseMarkdownToMindMap(
        activeNote.title || 'Untitled Mind Map',
        activeNote.content || '## Main Topic\n- Key Point'
      );
      setMindMapRoot(parsed);
      setMarkdownOutline(serializeMindMapToMarkdown(parsed));
      setSelectedNodeId('node-root');
    }
  }, [activeNote]);

  // Compute Tree Node Positions for SVG Render
  const { layouts, connections } = useMemo(() => {
    const layoutList: NodeLayout[] = [];
    const connectionList: { from: NodeLayout; to: NodeLayout; color?: string }[] = [];

    const NODE_WIDTH = 150;
    const NODE_HEIGHT = 44;
    const HORIZONTAL_GAP = 90;
    const VERTICAL_GAP = 20;

    let currentLeafY = 0;

    function computeSubtreePositions(node: MindMapNode, depth: number): NodeLayout {
      const isRoot = depth === 0;
      const x = isRoot ? 0 : depth * (NODE_WIDTH + HORIZONTAL_GAP);

      if (node.collapsed || node.children.length === 0) {
        const y = currentLeafY;
        currentLeafY += NODE_HEIGHT + VERTICAL_GAP;
        const currentLayout: NodeLayout = {
          node,
          x,
          y,
          width: isRoot ? 170 : NODE_WIDTH,
          height: NODE_HEIGHT,
          depth,
        };
        layoutList.push(currentLayout);
        return currentLayout;
      }

      // Compute children first
      const childLayouts: NodeLayout[] = [];
      for (const child of node.children) {
        const childLayout = computeSubtreePositions(child, depth + 1);
        childLayouts.push(childLayout);
      }

      // Parent Y is midpoint of first and last child
      const minY = childLayouts[0].y;
      const maxY = childLayouts[childLayouts.length - 1].y;
      const y = (minY + maxY) / 2;

      const currentLayout: NodeLayout = {
        node,
        x,
        y,
        width: isRoot ? 170 : NODE_WIDTH,
        height: NODE_HEIGHT,
        depth,
      };
      layoutList.push(currentLayout);

      // Connect to children
      for (const childLayout of childLayouts) {
        connectionList.push({
          from: currentLayout,
          to: childLayout,
          color: childLayout.node.color || node.color || '#6366f1',
        });
      }

      return currentLayout;
    }

    computeSubtreePositions(mindMapRoot, 0);

    return { layouts: layoutList, connections: connectionList };
  }, [mindMapRoot]);

  // Tree Mutators
  const handleAddChild = (parentId: string) => {
    const updated = addChildNode(mindMapRoot, parentId, 'New Branch Idea');
    setMindMapRoot(updated);
    setMarkdownOutline(serializeMindMapToMarkdown(updated));
    soundscapeService.playCompletionChime();
  };

  const handleDeleteNode = (targetId: string) => {
    if (targetId === 'node-root') return;
    const updated = deleteNode(mindMapRoot, targetId);
    setMindMapRoot(updated);
    setMarkdownOutline(serializeMindMapToMarkdown(updated));
    setSelectedNodeId('node-root');
  };

  const handleToggleCollapse = (targetId: string) => {
    const updated = toggleNodeCollapse(mindMapRoot, targetId);
    setMindMapRoot(updated);
  };

  const handleStartEditing = (node: MindMapNode) => {
    setEditingNodeId(node.id);
    setEditingText(node.text);
  };

  const handleFinishEditing = () => {
    if (editingNodeId && editingText.trim()) {
      const updated = updateNodeText(mindMapRoot, editingNodeId, editingText.trim());
      setMindMapRoot(updated);
      setMarkdownOutline(serializeMindMapToMarkdown(updated));
    }
    setEditingNodeId(null);
  };

  // Sync from Markdown Outline text changes
  const handleMarkdownChange = (newMd: string) => {
    setMarkdownOutline(newMd);
    try {
      const parsed = parseMarkdownToMindMap(mindMapRoot.text, newMd);
      setMindMapRoot(parsed);
    } catch {}
  };

  // Pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-node')) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Save Back to Note
  const handleSaveToActiveNote = async () => {
    if (!activeNote) return;
    await onSaveToNote(activeNote.id, markdownOutline);
    fireConfetti();
    soundscapeService.playCompletionChime();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Create New Note
  const handleCreateNewNote = async () => {
    const title = `🗺️ Mind Map: ${mindMapRoot.text}`;
    await onCreateNote(title, markdownOutline, ['mindmap', 'visual', 'outline']);
    fireConfetti();
    soundscapeService.playCompletionChime();
    onClose();
  };

  // Copy Markdown
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownOutline);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch {}
  };

  // Template Quick-load
  const handleLoadTemplate = (type: 'brainstorm' | 'roadmap' | 'reading') => {
    let tplMd = '';
    let title = '';

    if (type === 'brainstorm') {
      title = 'System Architecture Brainstorm';
      tplMd = `## Core Objectives\n- Local-First Data Sovereignty\n- Instant Search Latency (<10ms)\n## Core Vectors\n- IndexedDB Vault Journal\n- Vector Clocks Multi-Device Sync\n## Risks & Mitigations\n- Storage Quota Limits\n- Split-brain Divergence Defense`;
    } else if (type === 'roadmap') {
      title = 'Q4 Product Launch Roadmap';
      tplMd = `## Phase 1: Engine Foundation\n- Atomic Note Link Indexer\n- Full Text Search Tokenizer\n## Phase 2: User Workflows\n- Pomodoro Interstitial Journaling\n- Spaced Repetition SRS Engine\n## Phase 3: Production Polish\n- WCAG 2.2 AA Accessibility\n- Offline PWA Service Worker`;
    } else {
      title = 'Book Breakdown: How to Take Smart Notes';
      tplMd = `## 1. The Slip-Box Philosophy\n- Writing is not the result, it is the medium\n- Bottom-up emergent thinking\n## 2. Note Types\n- Fleeting notes (ephemeral capture)\n- Literature notes (source citations)\n- Permanent notes (atomic concepts)\n## 3. Knowledge Web\n- Bidirectional wikilinks\n- Index & Map of Content (MOC)`;
    }

    const parsed = parseMarkdownToMindMap(title, tplMd);
    setMindMapRoot(parsed);
    setMarkdownOutline(serializeMindMapToMarkdown(parsed));
    fireConfetti();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visual Mind Map & Concept Outline Tree Studio (P6)"
      className="fixed inset-0 z-60 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Visual Mind Map & Concept Tree Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                  Tool P6
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Visualize note outlines as interactive branching concept trees with two-way markdown synchronization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Note Selector */}
            <div className="hidden sm:flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-xl border border-stone-200 dark:border-stone-700">
              <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
              <select
                value={selectedNoteId}
                onChange={(e) => setSelectedNoteId(e.target.value)}
                className="text-xs font-semibold bg-transparent text-stone-800 dark:text-stone-200 max-w-[170px] truncate focus:outline-hidden"
              >
                {notes
                  .filter((n) => !n.trashed)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title || 'Untitled Note'}
                    </option>
                  ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Bar */}
        <div className="px-6 py-2.5 bg-stone-100/70 dark:bg-stone-950/70 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Templates */}
            <span className="text-stone-400 font-medium">Templates:</span>
            <button
              type="button"
              onClick={() => handleLoadTemplate('brainstorm')}
              className="px-2.5 py-1 rounded-lg bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-cyan-100 dark:hover:bg-cyan-950/60 hover:text-cyan-700 transition-colors"
            >
              🧠 Brainstorm
            </button>
            <button
              type="button"
              onClick={() => handleLoadTemplate('roadmap')}
              className="px-2.5 py-1 rounded-lg bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-cyan-100 dark:hover:bg-cyan-950/60 hover:text-cyan-700 transition-colors"
            >
              🚀 Roadmap
            </button>
            <button
              type="button"
              onClick={() => handleLoadTemplate('reading')}
              className="px-2.5 py-1 rounded-lg bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-cyan-100 dark:hover:bg-cyan-950/60 hover:text-cyan-700 transition-colors"
            >
              📚 Reading
            </button>
          </div>

          {/* Canvas Viewport Controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-stone-400 font-mono">
              {countTotalNodes(mindMapRoot)} nodes
            </span>

            <div className="flex items-center bg-stone-200 dark:bg-stone-800 rounded-lg p-0.5 ml-2">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.4, s - 0.15))}
                className="p-1 text-stone-600 dark:text-stone-300 hover:text-stone-900"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setScale(1);
                  setPan({ x: 300, y: 250 });
                }}
                className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-stone-600 dark:text-stone-300 hover:text-stone-900"
                title="Reset View"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(2.0, s + 0.15))}
                className="p-1 text-stone-600 dark:text-stone-300 hover:text-stone-900"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowOutlineDrawer(!showOutlineDrawer)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                showOutlineDrawer
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Outline</span>
            </button>
          </div>
        </div>

        {/* Main Workspace: Mind Map Canvas + Outline Split */}
        <div className="flex-1 overflow-hidden flex min-h-0 relative">
          {/* Visual Canvas Area */}
          <div
            className="flex-1 bg-stone-50 dark:bg-stone-950 overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* SVG Connector Lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: '0 0',
              }}
            >
              {connections.map((conn, idx) => {
                const startX = conn.from.x + conn.from.width;
                const startY = conn.from.y + conn.from.height / 2;
                const endX = conn.to.x;
                const endY = conn.to.y + conn.to.height / 2;
                const midX = (startX + endX) / 2;

                const pathData = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

                return (
                  <path
                    key={`conn-${idx}`}
                    d={pathData}
                    fill="none"
                    stroke={conn.color || '#6366f1'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                );
              })}
            </svg>

            {/* Rendered Nodes */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: '0 0',
              }}
            >
              {layouts.map((l) => {
                const isRoot = l.depth === 0;
                const isSelected = selectedNodeId === l.node.id;
                const isEditing = editingNodeId === l.node.id;
                const hasChildren = l.node.children.length > 0;

                return (
                  <div
                    key={l.node.id}
                    className={`interactive-node pointer-events-auto absolute rounded-2xl border transition-shadow duration-150 flex items-center justify-between px-3 py-2 ${
                      isRoot
                        ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-800 dark:border-stone-200 shadow-md font-bold'
                        : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800 shadow-xs hover:border-cyan-400'
                    } ${isSelected ? 'ring-2 ring-cyan-500 shadow-md' : ''}`}
                    style={{
                      left: `${l.x}px`,
                      top: `${l.y}px`,
                      width: `${l.width}px`,
                      height: `${l.height}px`,
                      borderLeftWidth: !isRoot ? '4px' : undefined,
                      borderLeftColor: !isRoot ? l.node.color || '#6366f1' : undefined,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(l.node.id);
                    }}
                    onDoubleClick={() => handleStartEditing(l.node)}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={handleFinishEditing}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishEditing();
                          if (e.key === 'Escape') setEditingNodeId(null);
                        }}
                        className="w-full text-xs font-bold bg-transparent focus:outline-hidden"
                      />
                    ) : (
                      <span className="text-xs truncate font-medium flex-1 mr-1">
                        {l.node.text}
                      </span>
                    )}

                    {/* Node Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {hasChildren && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCollapse(l.node.id);
                          }}
                          className="w-4 h-4 rounded-full bg-stone-100 dark:bg-stone-800 text-[10px] flex items-center justify-center text-stone-500 hover:text-stone-900"
                          title={l.node.collapsed ? 'Expand branch' : 'Collapse branch'}
                        >
                          {l.node.collapsed ? '+' : '−'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddChild(l.node.id);
                        }}
                        className="p-1 rounded-md text-stone-400 hover:text-cyan-600 hover:bg-stone-100 dark:hover:bg-stone-800"
                        title="Add child branch"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      {!isRoot && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNode(l.node.id);
                          }}
                          className="p-1 rounded-md text-stone-400 hover:text-rose-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                          title="Delete branch"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Drawer: Live Synchronized Markdown Outline */}
          {showOutlineDrawer && (
            <div className="w-80 sm:w-96 border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col shrink-0">
              <div className="p-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-500" />
                  <span>Two-Way Markdown Outline</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                    title="Copy markdown outline"
                  >
                    {copiedState ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex-1 p-3 flex flex-col min-h-0">
                <textarea
                  value={markdownOutline}
                  onChange={(e) => handleMarkdownChange(e.target.value)}
                  className="w-full flex-1 p-3 text-xs font-mono rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-1 focus:ring-cyan-500 leading-relaxed resize-none"
                  placeholder="# Outline appears here..."
                />
              </div>

              {/* Action Buttons */}
              <div className="p-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 space-y-2 shrink-0">
                {savedSuccess && (
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved outline to note!</span>
                  </div>
                )}

                {activeNote && (
                  <button
                    type="button"
                    onClick={handleSaveToActiveNote}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Update "{activeNote.title}"</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCreateNewNote}
                  className="w-full py-2 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save as New Mind Map Note</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-stone-50/70 dark:bg-stone-950/60 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-700 dark:text-stone-300">Shortcut:</span>
            <kbd className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-800 rounded text-[10px] font-mono">Alt + B</kbd>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
