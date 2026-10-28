import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  MousePointer,
  Hand,
  FileText,
  StickyNote,
  ArrowUpRight,
  PenTool,
  Square,
  Eraser,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  ExternalLink,
  CheckSquare,
  Tag,
  AlertTriangle,
  Folder as FolderIcon,
  ChevronDown,
  X,
  Search,
  Hash,
  Box,
  Image as ImageIcon,
  Edit3,
  Split,
  ListTree,
  Crosshair,
} from 'lucide-react';
import { Note, Folder } from '../types';
import {
  CanvasBoard,
  CanvasNode,
  NoteCanvasNode,
  SectionCanvasNode,
  BlockCanvasNode,
  StickyCanvasNode,
  MediaCanvasNode,
  GroupCanvasNode,
  CanvasConnector,
  CanvasStroke,
  CanvasStrokePoint,
  CanvasToolMode,
  CanvasTransform,
  CanvasPoint,
  CanvasRect,
  ConnectorSide,
  ConnectorLineStyle,
  ConnectorArrowDirection,
  CanvasBackgroundStyle,
  CanvasSearchMatch,
} from './canvasTypes';
import {
  screenToWorld,
  worldToScreen,
  clamp,
  calculateBoundingBox,
  calculateZoomToFit,
  getNodeAnchorPoint,
  determineBestSides,
  generateConnectorPath,
  simplifyStrokePoints,
  generateSvgPathFromStroke,
  isPointInsideRect,
  isRectIntersecting,
  MIN_ZOOM,
  MAX_ZOOM,
} from './canvasGeometry';
import { canvasStorageService, INITIAL_MAIN_BOARD } from './canvasStorage';
import { CanvasHistoryManager } from './canvasHistory';
import { extractSection, extractBlock } from './transclusion';
import { PKMPreviewRenderer } from './PKMPreviewRenderer';
import { toggleTaskInNote } from './tasks/taskMutator';
import { CanvasSearchBar } from './canvas/CanvasSearchBar';
import { CanvasResourcePickerModal } from './canvas/CanvasResourcePickerModal';
import { CanvasObjectOutlineModal } from './canvas/CanvasObjectOutlineModal';
import { CanvasActiveCardEditor } from './canvas/CanvasActiveCardEditor';
import { PKMHeading } from './types';

interface CanvasWorkspaceProps {
  notes: Note[];
  folders: Folder[];
  onOpenCanonicalNote: (noteId: string) => void;
  onOpenNoteBeside?: (noteId: string) => void;
  onOpenLinkedNote?: (noteId: string) => void;
  onSaveNote?: (note: Note) => void;
  onDeleteNote?: (noteId: string) => void;
  onCreateNoteWithTitle?: (title: string) => void;
  onRestoreDeletedNote?: (noteId: string) => void;
}

const STICKY_COLORS = [
  { name: 'Yellow', bg: '#fef08a', text: '#713f12', border: '#fde047' },
  { name: 'Blue', bg: '#bae6fd', text: '#0369a1', border: '#7dd3fc' },
  { name: 'Green', bg: '#bbf7d0', text: '#15803d', border: '#86efac' },
  { name: 'Pink', bg: '#fbcfe8', text: '#be185d', border: '#f472b6' },
  { name: 'Purple', bg: '#e9d5ff', text: '#6b21a8', border: '#c084fc' },
  { name: 'Orange', bg: '#fed7aa', text: '#c2410c', border: '#fdba74' },
  { name: 'Dark / Slate', bg: '#334155', text: '#f8fafc', border: '#475569' },
];

const GROUP_COLORS = [
  { name: 'Indigo', bg: 'rgba(224, 231, 255, 0.45)', border: '#818cf8' },
  { name: 'Emerald', bg: 'rgba(209, 250, 229, 0.45)', border: '#34d399' },
  { name: 'Amber', bg: 'rgba(254, 243, 199, 0.45)', border: '#fbbf24' },
  { name: 'Rose', bg: 'rgba(255, 228, 230, 0.45)', border: '#fb7185' },
  { name: 'Slate', bg: 'rgba(241, 245, 249, 0.65)', border: '#94a3b8' },
];

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  notes,
  folders,
  onOpenCanonicalNote,
  onOpenNoteBeside,
  onOpenLinkedNote,
  onSaveNote,
  onDeleteNote,
  onCreateNoteWithTitle,
  onRestoreDeletedNote,
}) => {
  // 1. Board & Spatial Data State
  const [boards, setBoards] = useState<CanvasBoard[]>([INITIAL_MAIN_BOARD]);
  const [activeBoardId, setActiveBoardId] = useState<string>(INITIAL_MAIN_BOARD.id);
  const [boardTitle, setBoardTitle] = useState<string>(INITIAL_MAIN_BOARD.title);
  const [nodes, setNodes] = useState<CanvasNode[]>(INITIAL_MAIN_BOARD.nodes);
  const [connectors, setConnectors] = useState<CanvasConnector[]>(INITIAL_MAIN_BOARD.connectors);
  const [strokes, setStrokes] = useState<CanvasStroke[]>(INITIAL_MAIN_BOARD.strokes);
  const [transform, setTransform] = useState<CanvasTransform>(INITIAL_MAIN_BOARD.transform);
  const [bgStyle, setBgStyle] = useState<CanvasBackgroundStyle>('dots');

  // 2. Active Tool & Selection State
  const [toolMode, setToolMode] = useState<CanvasToolMode>('select');
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);

  // 3. Phase P27 Interaction & Integration States
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [followSelection, setFollowSelection] = useState<boolean>(false);
  const [showResourcePicker, setShowResourcePicker] = useState<boolean>(false);
  const [showObjectOutline, setShowObjectOutline] = useState<boolean>(false);
  const [showFindBar, setShowFindBar] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMatchIndex, setSearchMatchIndex] = useState<number>(0);
  const [showDeleteModalNote, setShowDeleteModalNote] = useState<Note | null>(null);

  // Pen / Drawing settings
  const [penColor, setPenColor] = useState<string>('#3b82f6');
  const [penWidth, setPenWidth] = useState<number>(3);
  const [isHighlighter, setIsHighlighter] = useState<boolean>(false);

  // Connector drawing state
  const [connectorStartNodeId, setConnectorStartNodeId] = useState<string | null>(null);
  const [connectorLineStyle, setConnectorLineStyle] = useState<ConnectorLineStyle>('curved');
  const [connectorArrow, setConnectorArrow] = useState<ConnectorArrowDirection>('forward');

  // UI Panels / Modals
  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  const [showBoardMenu, setShowBoardMenu] = useState<boolean>(false);
  const [activeColorMenuNodeId, setActiveColorMenuNodeId] = useState<string | null>(null);

  // 4. Fast Interaction Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<CanvasTransform>(transform);
  transformRef.current = transform;

  const nodesRef = useRef<CanvasNode[]>(nodes);
  nodesRef.current = nodes;

  const historyManagerRef = useRef<CanvasHistoryManager>(
    new CanvasHistoryManager({
      nodes: INITIAL_MAIN_BOARD.nodes,
      connectors: INITIAL_MAIN_BOARD.connectors,
      strokes: INITIAL_MAIN_BOARD.strokes,
    })
  );

  const dragRef = useRef<{
    isDragging: boolean;
    dragType: 'pan' | 'nodes' | 'resize' | 'marquee' | 'stroke' | 'connector_preview';
    startPointer: CanvasPoint;
    startTransform: CanvasTransform;
    initialNodePositions: Map<string, { x: number; y: number; width: number; height: number }>;
    resizeHandle?: string;
    marqueeStart?: CanvasPoint;
    activeStrokePoints: CanvasStrokePoint[];
    touchDistStart?: number;
    touchCenterStart?: CanvasPoint;
  }>({
    isDragging: false,
    dragType: 'pan',
    startPointer: { x: 0, y: 0 },
    startTransform: { panX: 0, panY: 0, zoom: 1 },
    initialNodePositions: new Map(),
    activeStrokePoints: [],
  });

  const activeStrokePathRef = useRef<SVGPathElement>(null);
  const marqueeBoxRef = useRef<HTMLDivElement>(null);
  const connectorPreviewPathRef = useRef<SVGPathElement>(null);

  // 5. Canonical Lookups (Reactive to note modifications)
  const notesMap = useMemo(() => {
    const map = new Map<string, Note>();
    notes.forEach((n) => map.set(n.id, n));
    return map;
  }, [notes]);

  const foldersMap = useMemo(() => {
    const map = new Map<string, Folder>();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  // Load Boards from Storage on Mount
  useEffect(() => {
    async function load() {
      const allBoards = await canvasStorageService.getAllBoards();
      if (allBoards && allBoards.length > 0) {
        setBoards(allBoards);
        const current = allBoards[0];
        setActiveBoardId(current.id);
        setBoardTitle(current.title);
        setNodes(current.nodes || []);
        setConnectors(current.connectors || []);
        setStrokes(current.strokes || []);
        setTransform(current.transform || { panX: 80, panY: 80, zoom: 1 });
        setBgStyle(current.backgroundStyle || 'dots');

        historyManagerRef.current.reset({
          nodes: current.nodes || [],
          connectors: current.connectors || [],
          strokes: current.strokes || [],
        });
      }
    }
    load();
  }, []);

  // Save changes debounced
  const persistBoard = useCallback(
    (
      newNodes: CanvasNode[],
      newConnectors: CanvasConnector[],
      newStrokes: CanvasStroke[],
      newTransform: CanvasTransform,
      newTitle = boardTitle,
      newBg = bgStyle
    ) => {
      const boardToSave: CanvasBoard = {
        id: activeBoardId,
        title: newTitle,
        nodes: newNodes,
        connectors: newConnectors,
        strokes: newStrokes,
        transform: newTransform,
        backgroundStyle: newBg,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      canvasStorageService.saveBoardDebounced(boardToSave);
    },
    [activeBoardId, boardTitle, bgStyle]
  );

  // Push history snapshot
  const recordHistory = useCallback(
    (newNodes = nodes, newConnectors = connectors, newStrokes = strokes) => {
      historyManagerRef.current.push({
        nodes: newNodes,
        connectors: newConnectors,
        strokes: newStrokes,
      });
      persistBoard(newNodes, newConnectors, newStrokes, transform);
    },
    [nodes, connectors, strokes, transform, persistBoard]
  );

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    const prev = historyManagerRef.current.undo({ nodes, connectors, strokes });
    if (prev) {
      setNodes(prev.nodes);
      setConnectors(prev.connectors);
      setStrokes(prev.strokes);
      setSelectedNodeIds([]);
      setSelectedConnectorId(null);
      persistBoard(prev.nodes, prev.connectors, prev.strokes, transform);
    }
  }, [nodes, connectors, strokes, transform, persistBoard]);

  const handleRedo = useCallback(() => {
    const next = historyManagerRef.current.redo({ nodes, connectors, strokes });
    if (next) {
      setNodes(next.nodes);
      setConnectors(next.connectors);
      setStrokes(next.strokes);
      persistBoard(next.nodes, next.connectors, next.strokes, transform);
    }
  }, [nodes, connectors, strokes, transform, persistBoard]);

  // Zoom to Fit
  const handleZoomToFit = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newTrans = calculateZoomToFit(nodes, strokes, rect.width, rect.height, 80);
    setTransform(newTrans);
    persistBoard(nodes, connectors, strokes, newTrans);
  }, [nodes, strokes, connectors, persistBoard]);

  // Zoom In / Out
  const handleZoom = useCallback(
    (delta: number, focalPoint?: CanvasPoint) => {
      setTransform((prev) => {
        const nextZoom = clamp(prev.zoom * (1 + delta), MIN_ZOOM, MAX_ZOOM);
        if (!containerRef.current) return { ...prev, zoom: nextZoom };

        const rect = containerRef.current.getBoundingClientRect();
        const center = focalPoint || { x: rect.width / 2, y: rect.height / 2 };

        const panX = center.x - (center.x - prev.panX) * (nextZoom / prev.zoom);
        const panY = center.y - (center.y - prev.panY) * (nextZoom / prev.zoom);

        const updated = { panX, panY, zoom: nextZoom };
        persistBoard(nodes, connectors, strokes, updated);
        return updated;
      });
    },
    [nodes, connectors, strokes, persistBoard]
  );

  // Center on a specific Node
  const handleCenterOnNode = useCallback((nodeId: string) => {
    const target = nodesRef.current.find((n) => n.id === nodeId);
    if (!target || !containerRef.current) return;

    const cRect = containerRef.current.getBoundingClientRect();
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;

    const newPanX = cRect.width / 2 - targetCenterX * transformRef.current.zoom;
    const newPanY = cRect.height / 2 - targetCenterY * transformRef.current.zoom;

    const newTrans = { ...transformRef.current, panX: newPanX, panY: newPanY };
    setTransform(newTrans);
    setSelectedNodeIds([nodeId]);
    persistBoard(nodesRef.current, connectors, strokes, newTrans);
  }, [connectors, strokes, persistBoard]);

  // Follow Selection handler: Syncs adjacent pane when followSelection is enabled
  const handleNodeSelect = useCallback(
    (node: CanvasNode) => {
      if (followSelection && 'noteId' in node && node.noteId) {
        if (onOpenNoteBeside) {
          onOpenNoteBeside(node.noteId);
        }
      }
    },
    [followSelection, onOpenNoteBeside]
  );

  // -------------------------------------------------------------
  // Resource Insertion Helpers
  // -------------------------------------------------------------
  const getNextPlacementWorldPoint = useCallback(() => {
    if (!containerRef.current) return { x: 200, y: 200 };
    const rect = containerRef.current.getBoundingClientRect();
    const centerScreen = {
      x: rect.width / 2 + (Math.random() * 80 - 40),
      y: rect.height / 2 + (Math.random() * 80 - 40),
    };
    return screenToWorld(centerScreen, transformRef.current);
  }, []);

  const handleInsertNote = useCallback(
    (note: Note) => {
      const pt = getNextPlacementWorldPoint();
      const newNode: NoteCanvasNode = {
        id: `node-note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'note',
        noteId: note.id,
        x: Math.round(pt.x - 140),
        y: Math.round(pt.y - 90),
        width: 300,
        height: 200,
        zIndex: nodes.length + 1,
        showPreview: true,
      };

      const updated = [...nodes, newNode];
      setNodes(updated);
      setSelectedNodeIds([newNode.id]);
      recordHistory(updated, connectors, strokes);
      setShowResourcePicker(false);
      handleNodeSelect(newNode);
    },
    [nodes, connectors, strokes, getNextPlacementWorldPoint, recordHistory, handleNodeSelect]
  );

  const handleInsertSection = useCallback(
    (note: Note, heading: PKMHeading) => {
      const pt = getNextPlacementWorldPoint();
      const newSection: SectionCanvasNode = {
        id: `node-sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'section',
        noteId: note.id,
        heading: heading.text,
        headingSlug: heading.slug,
        x: Math.round(pt.x - 140),
        y: Math.round(pt.y - 80),
        width: 290,
        height: 180,
        zIndex: nodes.length + 1,
      };

      const updated = [...nodes, newSection];
      setNodes(updated);
      setSelectedNodeIds([newSection.id]);
      recordHistory(updated, connectors, strokes);
      setShowResourcePicker(false);
      handleNodeSelect(newSection);
    },
    [nodes, connectors, strokes, getNextPlacementWorldPoint, recordHistory, handleNodeSelect]
  );

  const handleInsertBlock = useCallback(
    (note: Note, blockId: string) => {
      const pt = getNextPlacementWorldPoint();
      const newBlock: BlockCanvasNode = {
        id: `node-blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'block',
        noteId: note.id,
        blockId: blockId.replace(/^\^/, ''),
        x: Math.round(pt.x - 130),
        y: Math.round(pt.y - 70),
        width: 280,
        height: 160,
        zIndex: nodes.length + 1,
      };

      const updated = [...nodes, newBlock];
      setNodes(updated);
      setSelectedNodeIds([newBlock.id]);
      recordHistory(updated, connectors, strokes);
      setShowResourcePicker(false);
      handleNodeSelect(newBlock);
    },
    [nodes, connectors, strokes, getNextPlacementWorldPoint, recordHistory, handleNodeSelect]
  );

  const handleInsertMedia = useCallback(
    (mediaType: 'image' | 'pdf' | 'audio', url: string, title?: string) => {
      const pt = getNextPlacementWorldPoint();
      const newMedia: MediaCanvasNode = {
        id: `node-media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'media',
        mediaType,
        url,
        title: title || `${mediaType.toUpperCase()} Media`,
        x: Math.round(pt.x - 140),
        y: Math.round(pt.y - 90),
        width: 280,
        height: 200,
        zIndex: nodes.length + 1,
      };

      const updated = [...nodes, newMedia];
      setNodes(updated);
      setSelectedNodeIds([newMedia.id]);
      recordHistory(updated, connectors, strokes);
      setShowResourcePicker(false);
    },
    [nodes, connectors, strokes, getNextPlacementWorldPoint, recordHistory]
  );

  const handleAddSticky = useCallback(
    (color = '#fef08a') => {
      const pt = getNextPlacementWorldPoint();
      const newSticky: StickyCanvasNode = {
        id: `node-sticky-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'sticky',
        text: 'New thought...',
        color,
        fontSize: 'base',
        align: 'left',
        x: Math.round(pt.x - 120),
        y: Math.round(pt.y - 80),
        width: 240,
        height: 160,
        zIndex: nodes.length + 1,
      };

      const updated = [...nodes, newSticky];
      setNodes(updated);
      setSelectedNodeIds([newSticky.id]);
      recordHistory(updated, connectors, strokes);
    },
    [nodes, connectors, strokes, getNextPlacementWorldPoint, recordHistory]
  );

  const handleAddGroup = useCallback(() => {
    const pt = getNextPlacementWorldPoint();
    const newGroup: GroupCanvasNode = {
      id: `node-group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'group',
      label: 'New Frame / Section',
      color: 'rgba(224, 231, 255, 0.45)',
      x: Math.round(pt.x - 180),
      y: Math.round(pt.y - 140),
      width: 360,
      height: 280,
      zIndex: 0,
      containedNodeIds: [],
    };

    const updated = [newGroup, ...nodes];
    setNodes(updated);
    setSelectedNodeIds([newGroup.id]);
    recordHistory(updated, connectors, strokes);
  }, [nodes, connectors, strokes, getNextPlacementWorldPoint, recordHistory]);

  // Convert Sticky/Text Card to Real Canonical Note
  const handleConvertStickyToNote = useCallback(
    (sticky: StickyCanvasNode) => {
      const lines = sticky.text.split('\n');
      const firstLine = lines[0]?.replace(/^[#\s*-_]+/, '').trim();
      const noteTitle = firstLine || 'Note from Canvas';
      const noteContent = sticky.text;

      const newNoteId = `note-${Date.now()}`;
      const newNote: Note = {
        id: newNoteId,
        title: noteTitle,
        content: noteContent,
        type: 'text',
        tags: ['canvas'],
        checklist: [],
        color: 'default',
        trashed: false,
        archived: false,
        pinned: false,
        folderId: null,
        reminderDate: null,
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (onSaveNote) {
        onSaveNote(newNote);
      }

      // Transform sticky node into canonical note card in place
      const updatedNodes: CanvasNode[] = nodes.map((n) => {
        if (n.id === sticky.id) {
          return {
            id: n.id,
            type: 'note',
            noteId: newNoteId,
            x: n.x,
            y: n.y,
            width: n.width,
            height: n.height,
            zIndex: n.zIndex,
            locked: n.locked,
            showPreview: true,
          } as NoteCanvasNode;
        }
        return n;
      });

      setNodes(updatedNodes);
      setEditingNodeId(null);
      recordHistory(updatedNodes, connectors, strokes);
    },
    [nodes, connectors, strokes, onSaveNote, recordHistory]
  );

  // Toggle task checkbox in canonical note directly from Canvas
  const handleToggleTaskInNote = useCallback(
    (noteId: string, lineIndex: number) => {
      const canonicalNote = notesMap.get(noteId);
      if (!canonicalNote || !onSaveNote) return;

      const lines = (canonicalNote.content || '').split('\n');
      if (lineIndex < 0 || lineIndex >= lines.length) return;

      const line = lines[lineIndex];
      const match = line.match(/^(\s*[-*+]\s+\[)([ xX])(\]\s+.*)$/);
      if (match) {
        const isCurrentlyChecked = match[2].toLowerCase() === 'x';
        const newMarker = isCurrentlyChecked ? ' ' : 'x';
        lines[lineIndex] = `${match[1]}${newMarker}${match[3]}`;

        onSaveNote({
          ...canonicalNote,
          content: lines.join('\n'),
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [notesMap, onSaveNote]
  );

  // Duplicate Selected Items
  const handleDuplicateSelected = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    const clones: CanvasNode[] = [];
    const idMap = new Map<string, string>();

    const selectedSet = new Set(selectedNodeIds);
    nodes.forEach((n) => {
      if (selectedSet.has(n.id)) {
        const newId = `node-clone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        idMap.set(n.id, newId);
        clones.push({
          ...n,
          id: newId,
          x: n.x + 30,
          y: n.y + 30,
          zIndex: nodes.length + clones.length + 1,
        });
      }
    });

    const updated = [...nodes, ...clones];
    setNodes(updated);
    setSelectedNodeIds(clones.map((c) => c.id));
    recordHistory(updated, connectors, strokes);
  }, [selectedNodeIds, nodes, connectors, strokes, recordHistory]);

  // Delete Selected Items from Canvas (Removes spatial card reference, note untouched)
  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeIds.length === 0 && !selectedConnectorId && !selectedStrokeId) return;

    let updatedNodes = nodes;
    let updatedConnectors = connectors;
    let updatedStrokes = strokes;

    if (selectedNodeIds.length > 0) {
      const setIds = new Set(selectedNodeIds);
      updatedNodes = nodes.filter((n) => !setIds.has(n.id));
      updatedConnectors = connectors.filter(
        (c) => !setIds.has(c.fromNodeId) && !setIds.has(c.toNodeId)
      );
      setSelectedNodeIds([]);
    }

    if (selectedConnectorId) {
      updatedConnectors = updatedConnectors.filter((c) => c.id !== selectedConnectorId);
      setSelectedConnectorId(null);
    }

    if (selectedStrokeId) {
      updatedStrokes = updatedStrokes.filter((s) => s.id !== selectedStrokeId);
      setSelectedStrokeId(null);
    }

    setNodes(updatedNodes);
    setConnectors(updatedConnectors);
    setStrokes(updatedStrokes);
    recordHistory(updatedNodes, updatedConnectors, updatedStrokes);
  }, [selectedNodeIds, selectedConnectorId, selectedStrokeId, nodes, connectors, strokes, recordHistory]);

  // Update Node Color
  const handleUpdateNodeColor = useCallback(
    (nodeId: string, color: string) => {
      const updated = nodes.map((n) => {
        if (n.id === nodeId) {
          if (n.type === 'sticky') return { ...n, color };
          if (n.type === 'group') return { ...n, color };
          if (n.type === 'note' || n.type === 'section' || n.type === 'block') {
            return { ...n, customColor: color };
          }
        }
        return n;
      });
      setNodes(updated);
      recordHistory(updated, connectors, strokes);
      setActiveColorMenuNodeId(null);
    },
    [nodes, connectors, strokes, recordHistory]
  );

  // In-Canvas Search Matching
  const searchMatches: CanvasSearchMatch[] = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const results: CanvasSearchMatch[] = [];

    nodes.forEach((n) => {
      if (n.type === 'note') {
        const note = notesMap.get(n.noteId);
        if (
          note &&
          (note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q))
        ) {
          results.push({
            nodeId: n.id,
            title: note.title || 'Untitled Note',
            snippet: note.content.slice(0, 80),
            type: 'note',
          });
        }
      } else if (n.type === 'section') {
        const note = notesMap.get(n.noteId);
        if (
          n.heading.toLowerCase().includes(q) ||
          (note && note.title.toLowerCase().includes(q))
        ) {
          results.push({
            nodeId: n.id,
            title: `# ${n.heading} (${note?.title || 'Note'})`,
            type: 'section',
          });
        }
      } else if (n.type === 'block') {
        const note = notesMap.get(n.noteId);
        if (
          n.blockId.toLowerCase().includes(q) ||
          (note && note.title.toLowerCase().includes(q))
        ) {
          results.push({
            nodeId: n.id,
            title: `^${n.blockId} (${note?.title || 'Note'})`,
            type: 'block',
          });
        }
      } else if (n.type === 'sticky' || n.type === 'text') {
        if (n.text.toLowerCase().includes(q)) {
          results.push({
            nodeId: n.id,
            title: n.text.split('\n')[0] || 'Text Card',
            snippet: n.text.slice(0, 80),
            type: 'sticky',
          });
        }
      } else if (n.type === 'group') {
        if (n.label.toLowerCase().includes(q)) {
          results.push({
            nodeId: n.id,
            title: n.label,
            type: 'group',
          });
        }
      }
    });

    return results;
  }, [nodes, searchQuery, notesMap]);

  const handleNextSearchMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const nextIdx = (searchMatchIndex + 1) % searchMatches.length;
    setSearchMatchIndex(nextIdx);
    handleCenterOnNode(searchMatches[nextIdx].nodeId);
  }, [searchMatches, searchMatchIndex, handleCenterOnNode]);

  const handlePrevSearchMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const prevIdx = (searchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setSearchMatchIndex(prevIdx);
    handleCenterOnNode(searchMatches[prevIdx].nodeId);
  }, [searchMatches, searchMatchIndex, handleCenterOnNode]);

  // -------------------------------------------------------------
  // Pointer & Drag Interaction State Machine
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    // Dismiss active color menus when clicking canvas background
    if (activeColorMenuNodeId) setActiveColorMenuNodeId(null);

    const screenPt: CanvasPoint = { x: e.clientX, y: e.clientY };
    const containerRect = containerRef.current.getBoundingClientRect();
    const worldPt = screenToWorld(screenPt, transformRef.current, containerRect);

    // Freehand Pen Drawing
    if (toolMode === 'pen') {
      const initialPoints: CanvasStrokePoint[] = [{ x: worldPt.x, y: worldPt.y, pressure: e.pressure || 0.5 }];
      dragRef.current = {
        isDragging: true,
        dragType: 'stroke',
        startPointer: screenPt,
        startTransform: transformRef.current,
        initialNodePositions: new Map(),
        activeStrokePoints: initialPoints,
      };

      if (activeStrokePathRef.current) {
        activeStrokePathRef.current.setAttribute(
          'd',
          generateSvgPathFromStroke({
            id: 'temp',
            points: initialPoints,
            color: penColor,
            width: penWidth,
            isHighlighter,
          })
        );
        activeStrokePathRef.current.style.display = 'block';
      }
      return;
    }

    // Hand / Pan Tool or Middle Mouse Button or Space Key
    if (toolMode === 'hand' || e.button === 1 || e.spaceKey) {
      dragRef.current = {
        isDragging: true,
        dragType: 'pan',
        startPointer: screenPt,
        startTransform: { ...transformRef.current },
        initialNodePositions: new Map(),
        activeStrokePoints: [],
      };
      return;
    }

    // Eraser Tool on canvas background
    if (toolMode === 'eraser') {
      return;
    }

    // Default Selection Box (Marquee)
    if (e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-background-grid') {
      setSelectedNodeIds([]);
      setSelectedConnectorId(null);
      setSelectedStrokeId(null);
      setEditingNodeId(null);

      dragRef.current = {
        isDragging: true,
        dragType: 'marquee',
        startPointer: screenPt,
        startTransform: transformRef.current,
        initialNodePositions: new Map(),
        marqueeStart: screenPt,
        activeStrokePoints: [],
      };

      if (marqueeBoxRef.current) {
        marqueeBoxRef.current.style.left = `${screenPt.x - containerRect.left}px`;
        marqueeBoxRef.current.style.top = `${screenPt.y - containerRect.top}px`;
        marqueeBoxRef.current.style.width = '0px';
        marqueeBoxRef.current.style.height = '0px';
        marqueeBoxRef.current.style.display = 'block';
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging || !containerRef.current) return;

    const screenPt: CanvasPoint = { x: e.clientX, y: e.clientY };
    const containerRect = containerRef.current.getBoundingClientRect();
    const currentWorldPt = screenToWorld(screenPt, transformRef.current, containerRect);

    // 1. Pan Canvas Move
    if (dragRef.current.dragType === 'pan') {
      const dx = screenPt.x - dragRef.current.startPointer.x;
      const dy = screenPt.y - dragRef.current.startPointer.y;
      const newPanX = dragRef.current.startTransform.panX + dx;
      const newPanY = dragRef.current.startTransform.panY + dy;

      setTransform((prev) => ({ ...prev, panX: newPanX, panY: newPanY }));
      return;
    }

    // 2. Nodes Drag Move
    if (dragRef.current.dragType === 'nodes') {
      const dx = (screenPt.x - dragRef.current.startPointer.x) / transformRef.current.zoom;
      const dy = (screenPt.y - dragRef.current.startPointer.y) / transformRef.current.zoom;

      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          const initPos = dragRef.current.initialNodePositions.get(node.id);
          if (initPos) {
            return {
              ...node,
              x: Math.round(initPos.x + dx),
              y: Math.round(initPos.y + dy),
            };
          }
          return node;
        })
      );
      return;
    }

    // 3. Node Resize Move
    if (dragRef.current.dragType === 'resize') {
      const dx = (screenPt.x - dragRef.current.startPointer.x) / transformRef.current.zoom;
      const dy = (screenPt.y - dragRef.current.startPointer.y) / transformRef.current.zoom;

      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          const initPos = dragRef.current.initialNodePositions.get(node.id);
          if (initPos) {
            const newW = Math.max(160, Math.round(initPos.width + dx));
            const newH = Math.max(100, Math.round(initPos.height + dy));
            return { ...node, width: newW, height: newH };
          }
          return node;
        })
      );
      return;
    }

    // 4. Marquee Selection Move
    if (dragRef.current.dragType === 'marquee' && dragRef.current.marqueeStart) {
      const start = dragRef.current.marqueeStart;
      const minX = Math.min(start.x, screenPt.x);
      const minY = Math.min(start.y, screenPt.y);
      const width = Math.abs(screenPt.x - start.x);
      const height = Math.abs(screenPt.y - start.y);

      if (marqueeBoxRef.current) {
        marqueeBoxRef.current.style.left = `${minX - containerRect.left}px`;
        marqueeBoxRef.current.style.top = `${minY - containerRect.top}px`;
        marqueeBoxRef.current.style.width = `${width}px`;
        marqueeBoxRef.current.style.height = `${height}px`;
      }

      const worldTopLeft = screenToWorld({ x: minX, y: minY }, transformRef.current, containerRect);
      const worldBottomRight = screenToWorld(
        { x: minX + width, y: minY + height },
        transformRef.current,
        containerRect
      );

      const worldRect: CanvasRect = {
        x: worldTopLeft.x,
        y: worldTopLeft.y,
        width: worldBottomRight.x - worldTopLeft.x,
        height: worldBottomRight.y - worldTopLeft.y,
      };

      const selected = nodesRef.current
        .filter((n) =>
          isRectIntersecting(
            { x: n.x, y: n.y, width: n.width, height: n.height },
            worldRect
          )
        )
        .map((n) => n.id);

      setSelectedNodeIds(selected);
      return;
    }

    // 5. Freehand Vector Stroke Drawing
    if (dragRef.current.dragType === 'stroke') {
      dragRef.current.activeStrokePoints.push({
        x: currentWorldPt.x,
        y: currentWorldPt.y,
        pressure: e.pressure || 0.5,
      });

      if (activeStrokePathRef.current) {
        const pathData = generateSvgPathFromStroke({
          id: 'temp',
          points: dragRef.current.activeStrokePoints,
          color: penColor,
          width: penWidth,
          isHighlighter,
        });
        activeStrokePathRef.current.setAttribute('d', pathData);
      }
      return;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging) return;

    // Finish Freehand Stroke
    if (dragRef.current.dragType === 'stroke' && dragRef.current.activeStrokePoints.length > 1) {
      const simplified = simplifyStrokePoints(dragRef.current.activeStrokePoints, 1.2);
      const newStroke: CanvasStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        points: simplified,
        color: penColor,
        width: penWidth,
        isHighlighter,
      };

      const updatedStrokes = [...strokes, newStroke];
      setStrokes(updatedStrokes);
      recordHistory(nodes, connectors, updatedStrokes);

      if (activeStrokePathRef.current) {
        activeStrokePathRef.current.style.display = 'none';
        activeStrokePathRef.current.setAttribute('d', '');
      }
    }

    // Finish Node Drag or Resize -> Persist snapshot
    if (dragRef.current.dragType === 'nodes' || dragRef.current.dragType === 'resize') {
      recordHistory(nodes, connectors, strokes);
    }

    // Finish Marquee
    if (dragRef.current.dragType === 'marquee' && marqueeBoxRef.current) {
      marqueeBoxRef.current.style.display = 'none';
    }

    dragRef.current.isDragging = false;
  };

  // Wheel Zoom & Trackpad Pan
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = -e.deltaY * 0.002;
      handleZoom(zoomFactor, { x: e.clientX, y: e.clientY });
    } else {
      // Pan
      setTransform((prev) => {
        const updated = {
          ...prev,
          panX: prev.panX - e.deltaX,
          panY: prev.panY - e.deltaY,
        };
        persistBoard(nodes, connectors, strokes, updated);
        return updated;
      });
    }
  };

  // Node Pointer Down -> Drag, Selection, Connector Linking, or Eraser
  const handleNodePointerDown = (e: React.PointerEvent<HTMLDivElement>, node: CanvasNode) => {
    e.stopPropagation();

    // Eraser Tool
    if (toolMode === 'eraser') {
      const updatedNodes = nodes.filter((n) => n.id !== node.id);
      const updatedConnectors = connectors.filter(
        (c) => c.fromNodeId !== node.id && c.toNodeId !== node.id
      );
      setNodes(updatedNodes);
      setConnectors(updatedConnectors);
      recordHistory(updatedNodes, updatedConnectors, strokes);
      return;
    }

    // Connector Arrow Creation Tool
    if (toolMode === 'connector') {
      if (!connectorStartNodeId) {
        setConnectorStartNodeId(node.id);
      } else if (connectorStartNodeId !== node.id) {
        const sourceNode = nodes.find((n) => n.id === connectorStartNodeId);
        const targetNode = node;

        if (sourceNode) {
          const { fromSide, toSide } = determineBestSides(sourceNode, targetNode);
          const newConnector: CanvasConnector = {
            id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            fromNodeId: connectorStartNodeId,
            toNodeId: targetNode.id,
            fromSide,
            toSide,
            arrowDirection: connectorArrow,
            lineStyle: connectorLineStyle,
            color: '#6366f1',
            strokeWidth: 2,
          };

          const updatedConnectors = [...connectors, newConnector];
          setConnectors(updatedConnectors);
          recordHistory(nodes, updatedConnectors, strokes);
          setConnectorStartNodeId(null);
          setToolMode('select');
        }
      }
      return;
    }

    // Selection Handling
    const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
    let newSelected = selectedNodeIds;

    if (isMultiSelect) {
      newSelected = selectedNodeIds.includes(node.id)
        ? selectedNodeIds.filter((id) => id !== node.id)
        : [...selectedNodeIds, node.id];
    } else if (!selectedNodeIds.includes(node.id)) {
      newSelected = [node.id];
    }

    setSelectedNodeIds(newSelected);
    setSelectedConnectorId(null);
    setSelectedStrokeId(null);
    handleNodeSelect(node);

    // Initial drag positions of all selected nodes
    const initialPos = new Map<string, { x: number; y: number; width: number; height: number }>();
    nodes.forEach((n) => {
      if (newSelected.includes(n.id)) {
        initialPos.set(n.id, { x: n.x, y: n.y, width: n.width, height: n.height });
      }
    });

    dragRef.current = {
      isDragging: true,
      dragType: 'nodes',
      startPointer: { x: e.clientX, y: e.clientY },
      startTransform: transformRef.current,
      initialNodePositions: initialPos,
      activeStrokePoints: [],
    };
  };

  // Node Resize Handle Pointer Down
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    node: CanvasNode,
    handle: string
  ) => {
    e.stopPropagation();
    const initialPos = new Map<string, { x: number; y: number; width: number; height: number }>();
    initialPos.set(node.id, { x: node.x, y: node.y, width: node.width, height: node.height });

    dragRef.current = {
      isDragging: true,
      dragType: 'resize',
      startPointer: { x: e.clientX, y: e.clientY },
      startTransform: transformRef.current,
      initialNodePositions: initialPos,
      resizeHandle: handle,
      activeStrokePoints: [],
    };
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept shortcuts when actively typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === 'Escape') {
        if (editingNodeId) {
          setEditingNodeId(null);
        } else if (showResourcePicker) {
          setShowResourcePicker(false);
        } else if (showObjectOutline) {
          setShowObjectOutline(false);
        } else if (showFindBar) {
          setShowFindBar(false);
        } else {
          setSelectedNodeIds([]);
          setSelectedConnectorId(null);
          setConnectorStartNodeId(null);
        }
        return;
      }

      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowFindBar(true);
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setShowObjectOutline(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      if (e.key === 'Enter') {
        if (selectedNodeIds.length === 1) {
          e.preventDefault();
          setEditingNodeId(selectedNodeIds[0]);
        }
        return;
      }

      // Tool mode hotkeys
      if (e.key.toLowerCase() === 'v') setToolMode('select');
      if (e.key.toLowerCase() === 'h') setToolMode('hand');
      if (e.key.toLowerCase() === 'c') setToolMode('connector');
      if (e.key.toLowerCase() === 'p') setToolMode('pen');
      if (e.key.toLowerCase() === '0') handleZoomToFit();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editingNodeId,
    showResourcePicker,
    showObjectOutline,
    showFindBar,
    selectedNodeIds,
    handleUndo,
    handleRedo,
    handleDuplicateSelected,
    handleDeleteSelected,
    handleZoomToFit,
  ]);

  // Minimap bounding calculations
  const minimapData = useMemo(() => {
    const bbox = calculateBoundingBox(nodes, strokes) || { x: 0, y: 0, width: 800, height: 600 };
    const pad = 160;
    const mapW = bbox.width + pad * 2;
    const mapH = bbox.height + pad * 2;
    const scale = Math.min(180 / mapW, 120 / mapH);
    return {
      scale,
      offsetX: bbox.x - pad,
      offsetY: bbox.y - pad,
    };
  }, [nodes, strokes]);

  // Viewport bounds calculation for offscreen culling
  const viewportBounds = useMemo(() => {
    if (!containerRef.current) {
      return { minX: -2000, minY: -2000, maxX: 4000, maxY: 4000 };
    }
    const cW = containerRef.current.clientWidth || 1200;
    const cH = containerRef.current.clientHeight || 800;
    const padding = 350; // Buffer around viewport

    const minX = (-transform.panX - padding) / transform.zoom;
    const minY = (-transform.panY - padding) / transform.zoom;
    const maxX = (-transform.panX + cW + padding) / transform.zoom;
    const maxY = (-transform.panY + cH + padding) / transform.zoom;

    return { minX, minY, maxX, maxY };
  }, [transform]);

  const isNodeVisible = (node: CanvasNode): boolean => {
    return (
      node.x + node.width >= viewportBounds.minX &&
      node.x <= viewportBounds.maxX &&
      node.y + node.height >= viewportBounds.minY &&
      node.y <= viewportBounds.maxY
    );
  };

  const isLowLOD = transform.zoom < 0.45;

  return (
    <div
      ref={containerRef}
      id="infinite-canvas-viewport"
      role="region"
      aria-label="Infinite Spatial Canvas"
      className="w-full h-full relative overflow-hidden select-none bg-stone-900 text-stone-100"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      style={{
        cursor:
          toolMode === 'hand'
            ? 'grab'
            : toolMode === 'pen'
            ? 'crosshair'
            : toolMode === 'connector'
            ? 'crosshair'
            : toolMode === 'eraser'
            ? 'cell'
            : 'default',
      }}
    >
      {/* 1. Spatial Background Grid */}
      <div
        id="canvas-background-grid"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            bgStyle === 'dots'
              ? 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)'
              : bgStyle === 'grid'
              ? 'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)'
              : 'none',
          backgroundSize: `${28 * transform.zoom}px ${28 * transform.zoom}px`,
          backgroundPosition: `${transform.panX}px ${transform.panY}px`,
        }}
      />

      {/* 2. World Coordinate Transform Layer */}
      <div
        id="canvas-world-layer"
        className="absolute inset-0 origin-top-left pointer-events-auto"
        style={{
          transform: `translate3d(${transform.panX}px, ${transform.panY}px, 0px) scale(${transform.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* SVG Layer for Dynamic Connectors and Vector Freehand Strokes */}
        <svg
          id="canvas-svg-layer"
          className="absolute inset-0 overflow-visible pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <marker
              id="arrow-head-forward"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
            </marker>
          </defs>

          {/* Render Connectors */}
          {connectors.map((connector) => {
            const fromNode = nodes.find((n) => n.id === connector.fromNodeId);
            const toNode = nodes.find((n) => n.id === connector.toNodeId);
            if (!fromNode || !toNode) return null;

            let fromSide = connector.fromSide || 'auto';
            let toSide = connector.toSide || 'auto';

            if (fromSide === 'auto' || toSide === 'auto') {
              const best = determineBestSides(fromNode, toNode);
              if (fromSide === 'auto') fromSide = best.fromSide;
              if (toSide === 'auto') toSide = best.toSide;
            }

            const startPt = getNodeAnchorPoint(fromNode, fromSide as ConnectorSide);
            const endPt = getNodeAnchorPoint(toNode, toSide as ConnectorSide);
            const pathData = generateConnectorPath(
              startPt,
              endPt,
              fromSide as ConnectorSide,
              toSide as ConnectorSide,
              connector.lineStyle
            );

            const isSelected = selectedConnectorId === connector.id;

            return (
              <g key={connector.id} className="pointer-events-auto cursor-pointer">
                {/* Thick invisible hit area for easy selection */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (toolMode === 'eraser') {
                      const updated = connectors.filter((c) => c.id !== connector.id);
                      setConnectors(updated);
                      recordHistory(nodes, updated, strokes);
                    } else {
                      setSelectedConnectorId(connector.id);
                      setSelectedNodeIds([]);
                    }
                  }}
                />
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? '#38bdf8' : connector.color || '#6366f1'}
                  strokeWidth={isSelected ? (connector.strokeWidth || 2) + 2 : connector.strokeWidth || 2}
                  strokeDasharray={isSelected ? '6 4' : undefined}
                  markerEnd={connector.arrowDirection !== 'none' ? 'url(#arrow-head-forward)' : undefined}
                  className="transition-colors"
                />
                {connector.label && (
                  <text
                    x={(startPt.x + endPt.x) / 2}
                    y={(startPt.y + endPt.y) / 2 - 8}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize={11}
                    fontWeight="bold"
                    className="bg-stone-900 select-none pointer-events-none"
                  >
                    {connector.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Persistent Freehand Strokes */}
          {strokes.map((stroke) => {
            const isSelected = selectedStrokeId === stroke.id;
            const pathData = generateSvgPathFromStroke(stroke);
            return (
              <g key={stroke.id} className="pointer-events-auto cursor-pointer">
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? '#38bdf8' : stroke.color}
                  strokeWidth={isSelected ? stroke.width + 3 : stroke.width}
                  strokeOpacity={stroke.isHighlighter ? 0.35 : 1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (toolMode === 'eraser') {
                      const updated = strokes.filter((s) => s.id !== stroke.id);
                      setStrokes(updated);
                      recordHistory(nodes, connectors, updated);
                    } else {
                      setSelectedStrokeId(stroke.id);
                      setSelectedNodeIds([]);
                    }
                  }}
                />
              </g>
            );
          })}

          {/* Live In-Progress Freehand Stroke Preview */}
          <path
            ref={activeStrokePathRef}
            id="active-stroke-preview"
            fill="none"
            stroke={penColor}
            strokeWidth={penWidth}
            strokeOpacity={isHighlighter ? 0.35 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'none' }}
          />
        </svg>

        {/* Render Spatial Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedNodeIds.includes(node.id);
          const isConnectorSource = connectorStartNodeId === node.id;
          const isEditing = editingNodeId === node.id;

          // Offscreen culling check
          if (!isNodeVisible(node) && !isSelected) {
            return (
              <div
                key={node.id}
                id={`node-${node.id}`}
                className="absolute rounded-xl border border-stone-800 bg-stone-900/40 pointer-events-none"
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                  zIndex: node.zIndex || 1,
                }}
              />
            );
          }

          // A. Group Frame
          if (node.type === 'group') {
            return (
              <div
                key={node.id}
                id={`node-${node.id}`}
                className={`absolute rounded-2xl border-2 transition-all cursor-move flex flex-col ${
                  isSelected
                    ? 'border-blue-500 shadow-xl ring-2 ring-blue-500/40'
                    : 'border-dashed border-stone-600 hover:border-stone-400'
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                  backgroundColor: node.color,
                  zIndex: node.zIndex || 0,
                }}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
              >
                <div className="flex items-center justify-between px-4 py-2 border-b border-stone-500/30">
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate">
                    {node.label}
                  </span>
                </div>
                {isSelected && (
                  <div
                    className="absolute -right-2 -bottom-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white cursor-se-resize shadow-md"
                    onPointerDown={(e) => handleResizePointerDown(e, node, 'se')}
                  />
                )}
              </div>
            );
          }

          // B. Sticky / Local Text Card
          if (node.type === 'sticky' || node.type === 'text') {
            return (
              <div
                key={node.id}
                id={`node-${node.id}`}
                className={`absolute rounded-xl shadow-lg border transition-all cursor-move flex flex-col overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-stone-900 shadow-2xl border-blue-400'
                    : isConnectorSource
                    ? 'ring-2 ring-indigo-500 ring-offset-2 animate-pulse'
                    : 'border-black/10 hover:shadow-xl'
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                  backgroundColor: node.color,
                  zIndex: node.zIndex || 2,
                }}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingNodeId(node.id);
                }}
              >
                {/* Active Editor */}
                {isEditing ? (
                  <CanvasActiveCardEditor
                    node={node}
                    onUpdateStickyText={(id, text) => {
                      const updated = nodes.map((n) => (n.id === id ? { ...n, text } : n));
                      setNodes(updated);
                      recordHistory(updated, connectors, strokes);
                    }}
                    onCloseEditor={() => setEditingNodeId(null)}
                    onConvertToNote={handleConvertStickyToNote}
                  />
                ) : (
                  <>
                    {/* Sticky Header */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/10 bg-black/5">
                      <div className="flex items-center gap-1.5">
                        <StickyNote className="w-3 h-3 text-stone-700" />
                        <span className="text-[10px] font-bold uppercase text-stone-700 tracking-wide">
                          Thought Card
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConvertStickyToNote(node);
                          }}
                          className="px-1.5 py-0.5 rounded bg-black/10 hover:bg-black/20 text-[10px] font-semibold text-stone-800 transition-colors flex items-center gap-1"
                          title="Convert to Canonical Note"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Convert</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNodeId(node.id);
                          }}
                          className="p-1 rounded text-stone-700 hover:bg-black/10"
                          title="Edit Card (Enter)"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Preview Body */}
                    <div className="flex-1 p-3 overflow-y-auto text-xs font-medium text-stone-900 leading-relaxed whitespace-pre-wrap">
                      {node.text}
                    </div>
                  </>
                )}

                {/* Resize handle */}
                {isSelected && (
                  <div
                    className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white cursor-se-resize shadow-md"
                    onPointerDown={(e) => handleResizePointerDown(e, node, 'se')}
                  />
                )}
              </div>
            );
          }

          // C. Canonical Note Reference Card
          if (node.type === 'note') {
            const canonicalNote = notesMap.get(node.noteId);
            const isMissing = !canonicalNote || canonicalNote.trashed;
            const folder = canonicalNote?.folderId ? foldersMap.get(canonicalNote.folderId) : null;

            return (
              <div
                key={node.id}
                id={`node-${node.id}`}
                className={`absolute rounded-xl shadow-md border transition-shadow cursor-move flex flex-col bg-white dark:bg-stone-900 overflow-hidden ${
                  isMissing
                    ? 'border-dashed border-red-500 bg-red-950/20'
                    : isSelected
                    ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-stone-900 shadow-2xl border-blue-400'
                    : isConnectorSource
                    ? 'ring-2 ring-indigo-500 ring-offset-2 animate-pulse'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-700'
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                  zIndex: node.zIndex || 2,
                }}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (!isMissing) setEditingNodeId(node.id);
                }}
              >
                {/* Active Editor on Note Card */}
                {isEditing && !isMissing ? (
                  <CanvasActiveCardEditor
                    node={node}
                    canonicalNote={canonicalNote}
                    onSaveCanonicalNote={onSaveNote}
                    onCloseEditor={() => setEditingNodeId(null)}
                    onOpenCanonicalNote={onOpenCanonicalNote}
                  />
                ) : (
                  <>
                    {/* Note Card Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850">
                      <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {isMissing ? 'Missing Note' : canonicalNote.title || 'Untitled Note'}
                        </span>
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!isMissing && (
                          <>
                            {onOpenNoteBeside && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenNoteBeside(canonicalNote.id);
                                }}
                                className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
                                title="Open Beside in Split Pane"
                              >
                                <Split className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNodeId(node.id);
                              }}
                              className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
                              title="Edit Note (Enter)"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenCanonicalNote(canonicalNote.id);
                              }}
                              className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
                              title="Open in Full Editor"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Note Content Body */}
                    <div className="flex-1 p-3 overflow-y-auto text-xs text-stone-600 dark:text-stone-300 leading-relaxed space-y-2">
                      {isMissing ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-red-400 space-y-2 p-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <p className="font-semibold text-xs">Note reference missing or deleted</p>
                          <div className="flex items-center gap-1.5 pt-1">
                            {onRestoreDeletedNote && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRestoreDeletedNote(node.noteId);
                                }}
                                className="px-2 py-1 bg-red-900/60 hover:bg-red-900 text-white rounded text-[10px] font-bold"
                              >
                                Restore Note
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = nodes.filter((n) => n.id !== node.id);
                                setNodes(updated);
                                recordHistory(updated, connectors, strokes);
                              }}
                              className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] font-bold"
                            >
                              Remove Card
                            </button>
                          </div>
                        </div>
                      ) : isLowLOD ? (
                        /* Low Level-of-Detail for far zoom */
                        <div className="text-stone-400 text-[11px] line-clamp-3 font-mono">
                          {canonicalNote.content.slice(0, 100) || 'Checklist / note body'}
                        </div>
                      ) : (
                        /* Full Interactive Preview */
                        <PKMPreviewRenderer
                          content={canonicalNote.content || ''}
                          sourceNoteId={canonicalNote.id}
                          allNotes={notes}
                          folders={folders}
                          onOpenNote={(targetId) => {
                            if (onOpenLinkedNote) onOpenLinkedNote(targetId);
                            else onOpenCanonicalNote(targetId);
                          }}
                          onContentChange={
                            onSaveNote
                              ? (newContent) =>
                                  onSaveNote({
                                    ...canonicalNote,
                                    content: newContent,
                                    updatedAt: new Date().toISOString(),
                                  })
                              : undefined
                          }
                        />
                      )}
                    </div>
                  </>
                )}

                {/* Resize handle */}
                {isSelected && (
                  <div
                    className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white cursor-se-resize shadow-md"
                    onPointerDown={(e) => handleResizePointerDown(e, node, 'se')}
                  />
                )}
              </div>
            );
          }

          // D. Section / Heading Card
          if (node.type === 'section') {
            const canonicalNote = notesMap.get(node.noteId);
            const isMissingNote = !canonicalNote || canonicalNote.trashed;
            const sectionData = canonicalNote
              ? extractSection(canonicalNote.content, node.heading)
              : null;

            return (
              <div
                key={node.id}
                id={`node-${node.id}`}
                className={`absolute rounded-xl shadow-md border transition-shadow cursor-move flex flex-col bg-white dark:bg-stone-900 overflow-hidden ${
                  isMissingNote || !sectionData
                    ? 'border-dashed border-amber-500 bg-amber-950/20'
                    : isSelected
                    ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-stone-900 shadow-2xl border-amber-400'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-700'
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                  zIndex: node.zIndex || 2,
                }}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (canonicalNote) onOpenCanonicalNote(canonicalNote.id);
                }}
              >
                {/* Section Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 dark:border-stone-800 bg-amber-50/60 dark:bg-amber-950/40">
                  <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                    <Hash className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
                      {node.heading}
                    </span>
                    <span className="text-[10px] text-stone-400 truncate">
                      ({canonicalNote?.title || 'Note'})
                    </span>
                  </div>

                  {canonicalNote && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCanonicalNote(canonicalNote.id);
                      }}
                      className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                      title="Open source note"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Section Body */}
                <div className="flex-1 p-3 overflow-y-auto text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  {!sectionData ? (
                    <div className="p-4 text-center text-amber-500 text-xs">
                      Section or heading not found in note.
                    </div>
                  ) : (
                    <PKMPreviewRenderer
                      content={sectionData.content}
                      sourceNoteId={canonicalNote!.id}
                      allNotes={notes}
                      folders={folders}
                      onOpenNote={onOpenCanonicalNote}
                    />
                  )}
                </div>

                {isSelected && (
                  <div
                    className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white cursor-se-resize"
                    onPointerDown={(e) => handleResizePointerDown(e, node, 'se')}
                  />
                )}
              </div>
            );
          }

          // E. Block Reference Card
          if (node.type === 'block') {
            const canonicalNote = notesMap.get(node.noteId);
            const blockData = canonicalNote
              ? extractBlock(canonicalNote.content, node.blockId)
              : null;

            return (
              <div
                key={node.id}
                id={`node-${node.id}`}
                className={`absolute rounded-xl shadow-md border transition-shadow cursor-move flex flex-col bg-white dark:bg-stone-900 overflow-hidden ${
                  !blockData
                    ? 'border-dashed border-emerald-500 bg-emerald-950/20'
                    : isSelected
                    ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-stone-900 shadow-2xl border-emerald-400'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-700'
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                  zIndex: node.zIndex || 2,
                }}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (canonicalNote) onOpenCanonicalNote(canonicalNote.id);
                }}
              >
                {/* Block Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 dark:border-stone-800 bg-emerald-50/60 dark:bg-emerald-950/40">
                  <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                    <Box className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                    <span className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-200 truncate">
                      ^{node.blockId}
                    </span>
                    <span className="text-[10px] text-stone-400 truncate">
                      ({canonicalNote?.title || 'Note'})
                    </span>
                  </div>

                  {canonicalNote && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCanonicalNote(canonicalNote.id);
                      }}
                      className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                      title="Open source note"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Block Content Body */}
                <div className="flex-1 p-3 overflow-y-auto text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-mono">
                  {blockData ? (
                    <PKMPreviewRenderer
                      content={blockData.content}
                      sourceNoteId={canonicalNote!.id}
                      allNotes={notes}
                      folders={folders}
                      onOpenNote={onOpenCanonicalNote}
                    />
                  ) : (
                    <div className="p-4 text-center text-emerald-500 text-xs">
                      Block ^{node.blockId} not found in note.
                    </div>
                  )}
                </div>

                {isSelected && (
                  <div
                    className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white cursor-se-resize"
                    onPointerDown={(e) => handleResizePointerDown(e, node, 'se')}
                  />
                )}
              </div>
            );
          }

          // F. Media Card
          if (node.type === 'media') {
            return (
              <div
                key={node.id}
                id={`node-${node.id}`}
                className={`absolute rounded-xl shadow-md border transition-shadow cursor-move flex flex-col bg-stone-900 overflow-hidden ${
                  isSelected ? 'ring-2 ring-purple-500 border-purple-400' : 'border-stone-800'
                }`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                  zIndex: node.zIndex || 2,
                }}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
              >
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-stone-800 bg-stone-850">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-bold text-stone-200 truncate">
                      {node.title || 'Media Card'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-2 overflow-hidden bg-stone-950">
                  {node.url ? (
                    <img
                      src={node.url}
                      alt={node.title || 'Canvas Media'}
                      className="max-w-full max-h-full object-contain rounded"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <p className="text-xs text-stone-500">No media URL</p>
                  )}
                </div>

                {isSelected && (
                  <div
                    className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-purple-500 rounded-full border-2 border-white cursor-se-resize"
                    onPointerDown={(e) => handleResizePointerDown(e, node, 'se')}
                  />
                )}
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* 3. Screen-Space Selection Marquee Box */}
      <div
        ref={marqueeBoxRef}
        id="canvas-marquee-box"
        className="absolute pointer-events-none border border-blue-500 bg-blue-500/15 rounded-xs"
        style={{ display: 'none', zIndex: 100 }}
      />

      {/* 4. Top Floating Tooldock */}
      <div
        id="canvas-main-tooldock"
        role="toolbar"
        aria-label="Canvas spatial tools"
        className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 p-1.5 bg-stone-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-800 text-stone-300"
      >
        {/* Tool: Select */}
        <button
          type="button"
          onClick={() => setToolMode('select')}
          className={`p-2 rounded-xl transition-all ${
            toolMode === 'select' ? 'bg-blue-500 text-white shadow-md' : 'hover:bg-stone-800'
          }`}
          title="Select & Move (V)"
          aria-label="Select tool"
        >
          <MousePointer className="w-4 h-4" />
        </button>

        {/* Tool: Hand / Pan */}
        <button
          type="button"
          onClick={() => setToolMode('hand')}
          className={`p-2 rounded-xl transition-all ${
            toolMode === 'hand' ? 'bg-blue-500 text-white shadow-md' : 'hover:bg-stone-800'
          }`}
          title="Hand / Pan Canvas (H)"
          aria-label="Hand tool"
        >
          <Hand className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-stone-800 mx-0.5" />

        {/* Insert Resource (Note, Section, Block, Media) */}
        <button
          type="button"
          onClick={() => setShowResourcePicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold transition-colors"
          title="Insert Note, Section, Block, or Media"
          aria-label="Insert resource"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Insert</span>
        </button>

        {/* Tool: Place Sticky Note */}
        <button
          type="button"
          onClick={() => handleAddSticky()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-stone-800 text-xs font-semibold transition-colors text-amber-400"
          title="Add Thought / Sticky Card"
          aria-label="Add sticky note"
        >
          <StickyNote className="w-4 h-4" />
          <span className="hidden sm:inline">Thought</span>
        </button>

        {/* Tool: Connector Arrow */}
        <button
          type="button"
          onClick={() => {
            setToolMode('connector');
            setConnectorStartNodeId(null);
          }}
          className={`p-2 rounded-xl transition-all ${
            toolMode === 'connector' ? 'bg-indigo-500 text-white shadow-md' : 'hover:bg-stone-800'
          }`}
          title="Connector Arrow (C) - Click source card then target card"
          aria-label="Connector tool"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>

        {/* Tool: Freehand Pen */}
        <button
          type="button"
          onClick={() => setToolMode('pen')}
          className={`p-2 rounded-xl transition-all ${
            toolMode === 'pen' ? 'bg-purple-500 text-white shadow-md' : 'hover:bg-stone-800'
          }`}
          title="Freehand Vector Pen (P)"
          aria-label="Pen tool"
        >
          <PenTool className="w-4 h-4" />
        </button>

        {/* Tool: Frame / Group */}
        <button
          type="button"
          onClick={() => handleAddGroup()}
          className="p-2 rounded-xl hover:bg-stone-800 transition-colors"
          title="Add Group Frame"
          aria-label="Group tool"
        >
          <Square className="w-4 h-4" />
        </button>

        {/* Tool: Eraser */}
        <button
          type="button"
          onClick={() => setToolMode('eraser')}
          className={`p-2 rounded-xl transition-all ${
            toolMode === 'eraser' ? 'bg-rose-500 text-white shadow-md' : 'hover:bg-stone-800'
          }`}
          title="Eraser (click elements to remove)"
          aria-label="Eraser tool"
        >
          <Eraser className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-stone-800 mx-0.5" />

        {/* Follow Selection Toggle */}
        <button
          type="button"
          onClick={() => setFollowSelection(!followSelection)}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            followSelection
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'hover:bg-stone-800 text-stone-400'
          }`}
          title="Follow Selection: Auto-sync selected card into adjacent note pane"
          aria-label="Toggle follow selection"
        >
          <Split className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Follow</span>
        </button>

        {/* Find on Canvas */}
        <button
          type="button"
          onClick={() => setShowFindBar(true)}
          className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
          title="Find on Canvas (Ctrl+F)"
          aria-label="Find on canvas"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Object Outline List */}
        <button
          type="button"
          onClick={() => setShowObjectOutline(true)}
          className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
          title="Object List & Structure Outline (Alt+O)"
          aria-label="Open canvas object outline"
        >
          <ListTree className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-stone-800 mx-0.5" />

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={!historyManagerRef.current.canUndo}
          className="p-2 rounded-xl hover:bg-stone-800 disabled:opacity-30 transition-colors"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={!historyManagerRef.current.canRedo}
          className="p-2 rounded-xl hover:bg-stone-800 disabled:opacity-30 transition-colors"
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* 5. Top Left: Board Selector & Title */}
      <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowBoardMenu(!showBoardMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-stone-900/90 backdrop-blur-md rounded-xl shadow-md border border-stone-800 text-sm font-bold text-stone-200 hover:bg-stone-850 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="max-w-[150px] truncate">{boardTitle}</span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {/* Board Dropdown Menu */}
          {showBoardMenu && (
            <div className="absolute top-12 left-0 w-64 p-2 bg-stone-900 rounded-2xl shadow-2xl border border-stone-800 z-50 space-y-1">
              <div className="px-2 py-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                Spatial Boards
              </div>
              {boards.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setActiveBoardId(b.id);
                    setBoardTitle(b.title);
                    setNodes(b.nodes || []);
                    setConnectors(b.connectors || []);
                    setStrokes(b.strokes || []);
                    setTransform(b.transform || { panX: 80, panY: 80, zoom: 1 });
                    setShowBoardMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                    b.id === activeBoardId
                      ? 'bg-indigo-950/80 text-indigo-300'
                      : 'hover:bg-stone-800 text-stone-300'
                  }`}
                >
                  <span className="truncate">{b.title}</span>
                  <span className="text-[10px] text-stone-400">{b.nodes?.length || 0} items</span>
                </button>
              ))}

              <div className="w-full h-px bg-stone-800 my-1" />

              {/* Create New Board */}
              <button
                type="button"
                onClick={async () => {
                  const newB: CanvasBoard = {
                    id: `board-${Date.now()}`,
                    title: `Spatial Brainstorm #${boards.length + 1}`,
                    nodes: [],
                    connectors: [],
                    strokes: [],
                    transform: { panX: 100, panY: 100, zoom: 1 },
                    backgroundStyle: 'dots',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  await canvasStorageService.saveBoardImmediate(newB);
                  setBoards((prev) => [newB, ...prev]);
                  setActiveBoardId(newB.id);
                  setBoardTitle(newB.title);
                  setNodes([]);
                  setConnectors([]);
                  setStrokes([]);
                  setTransform(newB.transform);
                  setShowBoardMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-950/50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Spatial Board</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 6. In-Canvas Search Bar */}
      <CanvasSearchBar
        isOpen={showFindBar}
        onClose={() => setShowFindBar(false)}
        matches={searchMatches}
        currentMatchIndex={searchMatchIndex}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNextMatch={handleNextSearchMatch}
        onPrevMatch={handlePrevSearchMatch}
        onSelectMatch={handleCenterOnNode}
      />

      {/* 7. Bottom Right: Zoom & Minimap Controls */}
      <div className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {/* Interactive Minimap */}
        {showMinimap && (
          <div
            id="canvas-minimap"
            className="w-48 h-32 bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-800 p-2 overflow-hidden relative cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const clickY = e.clientY - rect.top;
              const targetWorldX = minimapData.offsetX + clickX / minimapData.scale;
              const targetWorldY = minimapData.offsetY + clickY / minimapData.scale;

              if (containerRef.current) {
                const cRect = containerRef.current.getBoundingClientRect();
                setTransform((prev) => ({
                  ...prev,
                  panX: cRect.width / 2 - targetWorldX * prev.zoom,
                  panY: cRect.height / 2 - targetWorldY * prev.zoom,
                }));
              }
            }}
          >
            {/* Miniature nodes */}
            {nodes.map((n) => (
              <div
                key={n.id}
                className="absolute rounded-xs bg-stone-600"
                style={{
                  left: `${(n.x - minimapData.offsetX) * minimapData.scale}px`,
                  top: `${(n.y - minimapData.offsetY) * minimapData.scale}px`,
                  width: `${Math.max(2, n.width * minimapData.scale)}px`,
                  height: `${Math.max(2, n.height * minimapData.scale)}px`,
                }}
              />
            ))}

            {/* Viewport Frame in Minimap */}
            {containerRef.current && (
              <div
                className="absolute border border-blue-500 bg-blue-500/10 rounded-xs pointer-events-none"
                style={{
                  left: `${(-transform.panX / transform.zoom - minimapData.offsetX) * minimapData.scale}px`,
                  top: `${(-transform.panY / transform.zoom - minimapData.offsetY) * minimapData.scale}px`,
                  width: `${(containerRef.current.clientWidth / transform.zoom) * minimapData.scale}px`,
                  height: `${(containerRef.current.clientHeight / transform.zoom) * minimapData.scale}px`,
                }}
              />
            )}
          </div>
        )}

        {/* Zoom Controls Pill */}
        <div className="flex items-center gap-1 p-1 bg-stone-900/90 backdrop-blur-md rounded-xl shadow-lg border border-stone-800 text-stone-300">
          <button
            type="button"
            onClick={() => handleZoom(-0.2)}
            className="p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono font-bold px-2 text-stone-200">
            {Math.round(transform.zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => handleZoom(0.2)}
            className="p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomToFit}
            className="p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
            title="Zoom to Fit (0)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 8. Resource Inserter Modal */}
      <CanvasResourcePickerModal
        isOpen={showResourcePicker}
        onClose={() => setShowResourcePicker(false)}
        notes={notes}
        folders={folders}
        onInsertNote={handleInsertNote}
        onInsertSection={handleInsertSection}
        onInsertBlock={handleInsertBlock}
        onInsertMedia={handleInsertMedia}
      />

      {/* 9. Accessible Canvas Object Outline Modal */}
      <CanvasObjectOutlineModal
        isOpen={showObjectOutline}
        onClose={() => setShowObjectOutline(false)}
        board={{
          id: activeBoardId,
          title: boardTitle,
          nodes,
          connectors,
          strokes,
          transform,
          backgroundStyle: bgStyle,
          createdAt: '',
          updatedAt: '',
        }}
        notes={notes}
        onFocusNode={handleCenterOnNode}
        onOpenNote={onOpenCanonicalNote}
        onRemoveNode={(nodeId) => {
          const updated = nodes.filter((n) => n.id !== nodeId);
          const updatedConns = connectors.filter(
            (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
          );
          setNodes(updated);
          setConnectors(updatedConns);
          recordHistory(updated, updatedConns, strokes);
        }}
        onRemoveConnector={(connId) => {
          const updated = connectors.filter((c) => c.id !== connId);
          setConnectors(updated);
          recordHistory(nodes, updated, strokes);
        }}
      />
    </div>
  );
};
