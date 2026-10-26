import React, { useState, useMemo } from 'react';
import {
  ListTree,
  FileText,
  Hash,
  Box,
  StickyNote,
  Image as ImageIcon,
  Square,
  ArrowUpRight,
  ExternalLink,
  Trash2,
  Crosshair,
  Search,
  X,
  Layers,
} from 'lucide-react';
import { Note } from '../../types';
import { CanvasBoard, CanvasNode, CanvasConnector } from '../canvasTypes';

interface CanvasObjectOutlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: CanvasBoard;
  notes: Note[];
  onFocusNode: (nodeId: string) => void;
  onOpenNote: (noteId: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onRemoveConnector: (connectorId: string) => void;
}

export const CanvasObjectOutlineModal: React.FC<CanvasObjectOutlineModalProps> = ({
  isOpen,
  onClose,
  board,
  notes,
  onFocusNode,
  onOpenNote,
  onRemoveNode,
  onRemoveConnector,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'notes' | 'sections' | 'text' | 'connectors'>('all');

  const notesMap = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);
  const nodeMap = useMemo(() => new Map(board.nodes.map((n) => [n.id, n])), [board.nodes]);

  // Connectors map for quick lookup of edges connected to each node
  const connectionsByNode = useMemo(() => {
    const map = new Map<string, { outgoing: CanvasConnector[]; incoming: CanvasConnector[] }>();
    board.nodes.forEach((n) => map.set(n.id, { outgoing: [], incoming: [] }));

    board.connectors.forEach((c) => {
      const from = map.get(c.fromNodeId);
      if (from) from.outgoing.push(c);
      const to = map.get(c.toNodeId);
      if (to) to.incoming.push(c);
    });

    return map;
  }, [board.nodes, board.connectors]);

  const getNodeTitle = (node: CanvasNode): string => {
    if (node.type === 'note') {
      const n = notesMap.get(node.noteId);
      return n?.title || `Missing Note (${node.noteId})`;
    }
    if (node.type === 'section') {
      const n = notesMap.get(node.noteId);
      return `${n?.title || 'Note'} > #${node.heading}`;
    }
    if (node.type === 'block') {
      const n = notesMap.get(node.noteId);
      return `${n?.title || 'Note'} > ^${node.blockId}`;
    }
    if (node.type === 'sticky' || node.type === 'text') {
      return node.text.split('\n')[0] || 'Empty Text Card';
    }
    if (node.type === 'group') {
      return node.label || 'Unnamed Group Frame';
    }
    if (node.type === 'media') {
      return node.title || `Media (${node.mediaType})`;
    }
    return 'Canvas Object';
  };

  const filteredNodes = useMemo(() => {
    return board.nodes.filter((node) => {
      if (activeTab === 'notes' && node.type !== 'note') return false;
      if (activeTab === 'sections' && node.type !== 'section' && node.type !== 'block') return false;
      if (activeTab === 'text' && node.type !== 'sticky' && node.type !== 'text') return false;

      if (!filterQuery.trim()) return true;
      const title = getNodeTitle(node).toLowerCase();
      return title.includes(filterQuery.toLowerCase().trim());
    });
  }, [board.nodes, activeTab, filterQuery, notesMap]);

  if (!isOpen) return null;

  return (
    <div
      id="canvas-object-outline-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="canvas-object-outline-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Canvas Object List and Structure"
        className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[85vh] text-stone-800 dark:text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850/50">
          <div className="flex items-center gap-2">
            <ListTree className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Canvas Object Outline & Structure
              </h2>
              <p className="text-[11px] text-stone-500">
                {board.nodes.length} objects, {board.connectors.length} connections on board "{board.title}"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter bar & Tabs */}
        <div className="p-3 border-b border-stone-200 dark:border-stone-800 bg-stone-100/40 dark:bg-stone-900/40 flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter cards and objects..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'notes', label: 'Notes' },
                { id: 'sections', label: 'Sections & Blocks' },
                { id: 'text', label: 'Text Cards' },
                { id: 'connectors', label: 'Connectors' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab !== 'connectors' ? (
            filteredNodes.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">No objects found</div>
            ) : (
              filteredNodes.map((node) => {
                const title = getNodeTitle(node);
                const conns = connectionsByNode.get(node.id) || { outgoing: [], incoming: [] };

                return (
                  <div
                    key={node.id}
                    className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-850/40 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden pr-2">
                        {node.type === 'note' && <FileText className="w-4 h-4 text-blue-500 shrink-0" />}
                        {node.type === 'section' && <Hash className="w-4 h-4 text-amber-500 shrink-0" />}
                        {node.type === 'block' && <Box className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {(node.type === 'sticky' || node.type === 'text') && (
                          <StickyNote className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        {node.type === 'group' && <Square className="w-4 h-4 text-indigo-400 shrink-0" />}
                        {node.type === 'media' && <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />}

                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {title}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400 shrink-0">
                          ({Math.round(node.x)}, {Math.round(node.y)})
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onFocusNode(node.id);
                            onClose();
                          }}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-stone-200 dark:hover:bg-stone-750 transition-colors"
                          title="Center and focus on Canvas"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                        </button>

                        {'noteId' in node && node.noteId && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenNote(node.noteId);
                              onClose();
                            }}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-stone-200 dark:hover:bg-stone-750 transition-colors"
                            title="Open note in full editor"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onRemoveNode(node.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-stone-200 dark:hover:bg-stone-750 transition-colors"
                          title="Remove card from canvas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Connected Edges Relationships */}
                    {(conns.outgoing.length > 0 || conns.incoming.length > 0) && (
                      <div className="pt-1 border-t border-stone-200/60 dark:border-stone-800/60 text-[11px] space-y-1 text-stone-600 dark:text-stone-400">
                        {conns.outgoing.map((c) => {
                          const targetNode = nodeMap.get(c.toNodeId);
                          const targetTitle = targetNode ? getNodeTitle(targetNode) : 'Unknown';
                          return (
                            <div key={c.id} className="flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3 text-indigo-500" />
                              <span>Connects to: </span>
                              <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                                {targetTitle}
                              </span>
                              {c.label && <span className="text-[10px] italic">("{c.label}")</span>}
                            </div>
                          );
                        })}

                        {conns.incoming.map((c) => {
                          const sourceNode = nodeMap.get(c.fromNodeId);
                          const sourceTitle = sourceNode ? getNodeTitle(sourceNode) : 'Unknown';
                          return (
                            <div key={c.id} className="flex items-center gap-1 text-stone-500">
                              <span>← Connected from: </span>
                              <span className="font-medium text-stone-700 dark:text-stone-300 truncate">
                                {sourceTitle}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : (
            /* Connectors Tab */
            <div className="space-y-2">
              {board.connectors.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400">No connectors on this board</div>
              ) : (
                board.connectors.map((c) => {
                  const fromNode = nodeMap.get(c.fromNodeId);
                  const toNode = nodeMap.get(c.toNodeId);
                  const fromTitle = fromNode ? getNodeTitle(fromNode) : 'Unknown';
                  const toTitle = toNode ? getNodeTitle(toNode) : 'Unknown';

                  return (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-850/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 overflow-hidden text-xs">
                        <ArrowUpRight className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                          {fromTitle}
                        </span>
                        <span className="text-stone-400 font-mono">→</span>
                        <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                          {toTitle}
                        </span>
                        {c.label && (
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                            {c.label}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveConnector(c.id)}
                        className="p-1 rounded-md text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-stone-200 dark:hover:bg-stone-750 transition-colors"
                        title="Remove connector"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
