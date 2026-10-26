import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Link2,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Columns2,
  ArrowUpRight,
  ArrowDownLeft,
  List,
  Eye,
  Layers,
  X,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import {
  LocalGraphData,
  LocalGraphNode,
  LocalGraphEdge,
  LocalGraphFilters,
  DEFAULT_LOCAL_GRAPH_FILTERS,
} from './localGraphTypes';
import { localGraphService } from './localGraphService';
import { vaultManager } from '../indexer';

interface LocalGraphInspectorProps {
  centerNoteId: string;
  allNotes: Note[];
  folders?: Folder[];
  onOpenNote: (noteId: string, options?: any) => void;
  onClose?: () => void;
  className?: string;
}

export const LocalGraphInspector: React.FC<LocalGraphInspectorProps> = ({
  centerNoteId,
  allNotes,
  folders = [],
  onOpenNote,
  onClose,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<LocalGraphFilters>(DEFAULT_LOCAL_GRAPH_FILTERS);
  const [graphData, setGraphData] = useState<LocalGraphData>({
    centerNode: null,
    nodes: [],
    edges: [],
    outgoingCount: 0,
    backlinkCount: 0,
    embedCount: 0,
    inferredCount: 0,
    totalNeighborsCount: 0,
    hiddenCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'accessible-list'>('visual');

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Node positions simulation state
  const nodePositions = useRef<
    Map<string, { x: number; y: number; vx: number; vy: number; radius: number }>
  >(new Map());

  // Compute graph data on center note or filter changes
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    localGraphService
      .computeLocalGraph(centerNoteId, allNotes, filters)
      .then(({ data, operationId }) => {
        if (!isCancelled) {
          setGraphData(data);
          setLoading(false);
          // Initialize layout positions around center
          initializePositions(data);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('[LocalGraphInspector] Computation error:', err);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [centerNoteId, allNotes, filters]);

  // Subscribe to live index updates
  useEffect(() => {
    const unsub = vaultManager.subscribe(() => {
      localGraphService
        .computeLocalGraph(centerNoteId, allNotes, filters)
        .then(({ data }) => {
          setGraphData(data);
        });
    });
    return () => unsub();
  }, [centerNoteId, allNotes, filters]);

  // Initialize node layout positions in polar coordinates
  const initializePositions = (data: LocalGraphData) => {
    const posMap = new Map<string, { x: number; y: number; vx: number; vy: number; radius: number }>();
    if (!data.centerNode) return;

    // Center at 0,0
    posMap.set(data.centerNode.id, { x: 0, y: 0, vx: 0, vy: 0, radius: 14 });

    const hop1Nodes = data.nodes.filter((n) => n.hop === 1);
    const hop2Nodes = data.nodes.filter((n) => n.hop === 2);

    // Distribute hop 1 in an inner ring (radius ~ 100)
    hop1Nodes.forEach((node, idx) => {
      const angle = (idx / Math.max(1, hop1Nodes.length)) * Math.PI * 2;
      const r = 110 + (idx % 2 === 0 ? 15 : -15);
      posMap.set(node.id, {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        radius: 9,
      });
    });

    // Distribute hop 2 in an outer ring (radius ~ 200)
    hop2Nodes.forEach((node, idx) => {
      const angle = (idx / Math.max(1, hop2Nodes.length)) * Math.PI * 2;
      const r = 210 + (idx % 3 === 0 ? 20 : -20);
      posMap.set(node.id, {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        radius: 6,
      });
    });

    nodePositions.current = posMap;
  };

  // Canvas render loop
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.scale(zoom, zoom);

    const positions = nodePositions.current;

    // 1. Draw Edges
    graphData.edges.forEach((edge) => {
      const src = positions.get(edge.source);
      const tgt = positions.get(edge.target);
      if (!src || !tgt) return;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);

      if (edge.type === 'inferred') {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)'; // Purple dashed for inferred
        ctx.lineWidth = 1.2;
      } else if (edge.type === 'embed') {
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)'; // Blue solid for embed
        ctx.lineWidth = 2.0;
      } else {
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)'; // Amber solid for explicit
        ctx.lineWidth = 1.5;
      }

      ctx.stroke();
      ctx.setLineDash([]);
    });

    // 2. Draw Nodes
    graphData.nodes.forEach((node) => {
      const pos = positions.get(node.id);
      if (!pos) return;

      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.radius * (isHovered ? 1.3 : 1), 0, Math.PI * 2);

      if (node.isCenter) {
        ctx.fillStyle = '#d97706'; // Amber center
        ctx.fill();
        ctx.lineWidth = isSelected ? 4 : 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      } else if (node.hop === 1) {
        ctx.fillStyle = isSelected ? '#a855f7' : '#64748b'; // Slate / purple
        ctx.fill();
        ctx.lineWidth = isHovered || isSelected ? 2.5 : 1;
        ctx.strokeStyle = isSelected ? '#a855f7' : '#ffffff';
        ctx.stroke();
      } else {
        ctx.fillStyle = '#94a3b8'; // Light slate for hop 2
        ctx.fill();
      }

      // Draw node label
      const fontSize = node.isCenter ? 12 : node.hop === 1 ? 10 : 8;
      ctx.font = `${node.isCenter || isSelected ? 'bold' : 'normal'} ${fontSize}px sans-serif`;
      ctx.fillStyle = node.isCenter ? '#d97706' : '#475569';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const label = node.title.length > 22 ? node.title.slice(0, 20) + '…' : node.title;
      ctx.fillText(label, pos.x, pos.y + pos.radius + 4);
    });

    ctx.restore();
  }, [graphData, zoom, pan, selectedNodeId, hoveredNodeId]);

  // Request animation frame on state changes
  useEffect(() => {
    let animId: number;
    const render = () => {
      drawGraph();
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [drawGraph]);

  // Handle Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
        drawGraph();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawGraph]);

  // Hit test for nodes
  const getNodeAtCoords = (clientX: number, clientY: number): LocalGraphNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - canvas.width / 2 - pan.x;
    const y = clientY - rect.top - canvas.height / 2 - pan.y;

    const unscaledX = x / zoom;
    const unscaledY = y / zoom;

    for (const node of graphData.nodes) {
      const pos = nodePositions.current.get(node.id);
      if (!pos) continue;
      const dist = Math.hypot(unscaledX - pos.x, unscaledY - pos.y);
      if (dist <= pos.radius + 5) {
        return node;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const node = getNodeAtCoords(e.clientX, e.clientY);
    if (node) {
      setSelectedNodeId(node.id);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else {
      const node = getNodeAtCoords(e.clientX, e.clientY);
      setHoveredNodeId(node ? node.id : null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return graphData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graphData.nodes]);

  // Relationships categorised for accessible textual list
  const categorizedRelations = useMemo(() => {
    const noteMap = new Map<string, Note>(allNotes.map((n) => [n.id, n]));
    const center = graphData.centerNode;
    if (!center) return { outgoing: [], backlinks: [], embeds: [], inferred: [] };

    const outgoing: LocalGraphNode[] = [];
    const backlinks: LocalGraphNode[] = [];
    const embeds: LocalGraphNode[] = [];
    const inferred: { node: LocalGraphNode; edge: LocalGraphEdge }[] = [];

    graphData.edges.forEach((edge) => {
      if (edge.source === center.id) {
        const target = graphData.nodes.find((n) => n.id === edge.target);
        if (target) {
          if (edge.type === 'embed') embeds.push(target);
          else if (edge.type === 'inferred') inferred.push({ node: target, edge });
          else outgoing.push(target);
        }
      } else if (edge.target === center.id) {
        const source = graphData.nodes.find((n) => n.id === edge.source);
        if (source) {
          if (edge.type === 'embed') embeds.push(source);
          else backlinks.push(source);
        }
      }
    });

    return { outgoing, backlinks, embeds, inferred };
  }, [graphData, allNotes]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col h-full w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden text-xs text-stone-900 dark:text-stone-100 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-stone-100/80 dark:bg-stone-850/80 border-b border-stone-200 dark:border-stone-800 shrink-0">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-bold text-stone-900 dark:text-stone-100">Local Graph</span>
          <span className="px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 text-[10px] font-mono text-stone-600 dark:text-stone-300">
            {graphData.totalNeighborsCount} connections
          </span>
          {graphData.hiddenCount > 0 && (
            <span className="text-[10px] text-stone-400">
              (+{graphData.hiddenCount} capped)
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Mode Switcher */}
          <div className="flex items-center bg-stone-200/70 dark:bg-stone-800 p-0.5 rounded-lg mr-1">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === 'visual'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              Graph
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('accessible-list')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === 'accessible-list'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              List
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer ${
              showFiltersPanel ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'hover:bg-stone-200/60 dark:hover:bg-stone-800'
            }`}
            title="Local Graph Settings & Filters"
            aria-label="Local Graph Filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer ml-1"
              aria-label="Close Local Graph"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel Dropdown */}
      {showFiltersPanel && (
        <div className="p-3 bg-stone-100 dark:bg-stone-850 border-b border-stone-200 dark:border-stone-800 space-y-2.5 animate-in fade-in duration-100">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-700 dark:text-stone-300">Traversal Depth</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, depth: 1 }))}
                className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                  filters.depth === 1
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                1 Hop
              </button>
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, depth: 2 }))}
                className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                  filters.depth === 2
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                2 Hops
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showExplicit}
                onChange={(e) => setFilters((f) => ({ ...f, showExplicit: e.target.checked }))}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Explicit Links</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showEmbeds}
                onChange={(e) => setFilters((f) => ({ ...f, showEmbeds: e.target.checked }))}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Transclusions</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showInferred}
                onChange={(e) => setFilters((f) => ({ ...f, showInferred: e.target.checked }))}
                className="rounded border-stone-300 text-purple-600 focus:ring-purple-500"
              />
              <span>Inferred Semantic</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showBacklinks}
                onChange={(e) => setFilters((f) => ({ ...f, showBacklinks: e.target.checked }))}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Backlinks</span>
            </label>
          </div>

          {filters.showInferred && (
            <div className="pt-1 border-t border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                <span>Semantic Threshold</span>
                <span className="font-mono font-bold text-purple-600">
                  {Math.round(filters.semanticThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={filters.semanticThreshold}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, semanticThreshold: parseFloat(e.target.value) }))
                }
                className="w-full accent-purple-600 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* Main Content View */}
      {activeTab === 'visual' ? (
        <div className="relative flex-1 h-full min-h-[220px]">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-full cursor-grab active:cursor-grabbing block"
          />

          {/* Floating Zoom Controls */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 dark:bg-stone-800/90 backdrop-blur-xs border border-stone-200 dark:border-stone-700 rounded-xl p-1 shadow-md">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
              className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              title="Reset View"
              aria-label="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/80 dark:bg-stone-800/80 backdrop-blur-xs border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-[10px] text-stone-500 shadow-2xs pointer-events-none">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-amber-600 rounded"></span> Link
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-blue-500 rounded"></span> Embed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 border-b border-dashed border-purple-500"></span> Inferred
            </span>
          </div>

          {/* Selected Node Details Drawer */}
          {selectedNode && (
            <div className="absolute bottom-3 right-3 max-w-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-3 shadow-xl animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="font-bold text-stone-900 dark:text-stone-100 text-xs truncate">
                  {selectedNode.title}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNodeId(null)}
                  className="p-0.5 text-stone-400 hover:text-stone-600 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="text-[11px] text-stone-500 dark:text-stone-400 mb-2.5">
                {selectedNode.isCenter
                  ? 'Center Active Note'
                  : selectedNode.hop === 1
                  ? 'Direct Neighbor (1 hop)'
                  : 'Second-hop Neighbor (2 hops)'}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenNote(selectedNode.id)}
                  className="flex-1 px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors flex items-center justify-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>Open</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenNote(selectedNode.id, { split: true })}
                  className="px-2 py-1 rounded border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] transition-colors flex items-center gap-1"
                  title="Open Beside"
                >
                  <Columns2 className="w-3 h-3" />
                  <span>Beside</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Parallel Accessible Textual List View */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Outgoing Wikilinks */}
          <div>
            <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100 mb-2">
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
              <span>Outgoing Links ({categorizedRelations.outgoing.length})</span>
            </div>
            {categorizedRelations.outgoing.length === 0 ? (
              <p className="text-[11px] text-stone-400 italic">No outgoing Wikilinks from this note.</p>
            ) : (
              <div className="space-y-1">
                {categorizedRelations.outgoing.map((node) => (
                  <div
                    key={node.id}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-stone-100/70 dark:bg-stone-800/70 hover:bg-amber-500/10 transition-colors"
                  >
                    <span className="font-medium truncate">{node.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenNote(node.id)}
                        className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenNote(node.id, { split: true })}
                        className="px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-600 text-[10px]"
                        title="Open Beside"
                      >
                        Beside
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Incoming Backlinks */}
          <div>
            <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100 mb-2">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>Incoming Backlinks ({categorizedRelations.backlinks.length})</span>
            </div>
            {categorizedRelations.backlinks.length === 0 ? (
              <p className="text-[11px] text-stone-400 italic">No notes link to this note yet.</p>
            ) : (
              <div className="space-y-1">
                {categorizedRelations.backlinks.map((node) => (
                  <div
                    key={node.id}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-stone-100/70 dark:bg-stone-800/70 hover:bg-emerald-500/10 transition-colors"
                  >
                    <span className="font-medium truncate">{node.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenNote(node.id)}
                        className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenNote(node.id, { split: true })}
                        className="px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-600 text-[10px]"
                        title="Open Beside"
                      >
                        Beside
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inferred Semantic Relationships */}
          <div>
            <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Inferred Semantic Relatedness ({categorizedRelations.inferred.length})</span>
            </div>
            {categorizedRelations.inferred.length === 0 ? (
              <p className="text-[11px] text-stone-400 italic">No semantic associations found.</p>
            ) : (
              <div className="space-y-1">
                {categorizedRelations.inferred.map(({ node, edge }) => (
                  <div
                    key={node.id}
                    className="p-2 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {node.title}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {edge.score && (
                          <span className="px-1.5 py-0.2 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 text-[10px] font-mono font-bold">
                            {Math.round(edge.score * 100)}%
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenNote(node.id)}
                          className="px-2 py-0.5 rounded bg-purple-600 text-white text-[10px] font-bold"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                    {edge.sharedTerms && edge.sharedTerms.length > 0 && (
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                        Concepts: {edge.sharedTerms.slice(0, 4).map((t) => `#${t}`).join(' ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
