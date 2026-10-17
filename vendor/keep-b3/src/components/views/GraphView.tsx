import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Tag,
  Folder as FolderIcon,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Play,
  Pause,
  ExternalLink,
  Layers,
  Sparkles,
  Link2,
  X,
  Sliders,
  Cpu,
  DownloadCloud,
  CheckCircle2,
  Info,
  ArrowUpRight,
} from 'lucide-react';
import { Note, Folder, AppSettings } from '../../types';
import { NOTE_COLORS } from '../../utils/colors';
import { extractWikiLinks } from '../../utils/linking';
import { vaultManager, findUnlinkedMentions } from '../../pkm';
import {
  semanticManager,
  SemanticSettings,
  InferredRelation,
  EmbeddingProgress,
} from '../../pkm';

interface GraphNode {
  id: string;
  note: Note;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  linkCount: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'wiki' | 'tag' | 'inferred';
  label?: string;
  score?: number;
  sharedTerms?: string[];
  rationale?: string;
}

interface GraphViewProps {
  notes: Note[];
  allNotes: Note[];
  folders: Folder[];
  settings: AppSettings;
  searchQuery?: string;
  onOpenNote: (note: Note) => void;
  onUpdateNote?: (note: Note) => void;
}

export const GraphView: React.FC<GraphViewProps> = ({
  notes,
  allNotes,
  folders,
  settings,
  searchQuery = '',
  onOpenNote,
  onUpdateNote,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [filterQuery, setFilterQuery] = useState(searchQuery);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showTagLinks, setShowTagLinks] = useState(true);
  const [showInferredLinks, setShowInferredLinks] = useState(true);
  const [isSimulating, setIsSimulating] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedInferredLink, setSelectedInferredLink] = useState<GraphLink | null>(null);
  const [draggedNode, setDraggedNode] = useState<GraphNode | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Semantic settings state
  const [semanticSettings, setSemanticSettings] = useState<SemanticSettings>(
    semanticManager.getSettings()
  );
  const [showSemanticSettingsModal, setShowSemanticSettingsModal] = useState(false);
  const [inferredRelations, setInferredRelations] = useState<InferredRelation[]>([]);
  const [isComputingSemantics, setIsComputingSemantics] = useState(false);
  const [embeddingProgress, setEmbeddingProgress] = useState<EmbeddingProgress | null>(null);

  // Subscribe to semantic settings updates
  useEffect(() => {
    const unsub = semanticManager.subscribe((newSettings) => {
      setSemanticSettings(newSettings);
      setShowInferredLinks(newSettings.enabled);
    });
    return unsub;
  }, []);

  // Filter notes that are active / passed in
  const visibleNotes = useMemo(() => {
    return notes.filter((note) => {
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        const matches =
          note.title.toLowerCase().includes(q) ||
          note.content.toLowerCase().includes(q) ||
          note.tags.some((t) => t.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (selectedTag && !note.tags.includes(selectedTag)) return false;
      if (selectedFolderId && note.folderId !== selectedFolderId) return false;
      return true;
    });
  }, [notes, filterQuery, selectedTag, selectedFolderId]);

  // Compute inferred relationships when visibleNotes or semanticSettings change
  useEffect(() => {
    let isCurrent = true;
    if (!showInferredLinks || visibleNotes.length < 2) {
      setInferredRelations([]);
      return;
    }

    setIsComputingSemantics(true);
    const timeout = setTimeout(async () => {
      try {
        const relations = await semanticManager.computeInferredLinks(visibleNotes);
        if (isCurrent) {
          setInferredRelations(relations);
        }
      } catch (err) {
        console.warn('Failed to compute inferred semantic links:', err);
      } finally {
        if (isCurrent) {
          setIsComputingSemantics(false);
        }
      }
    }, 150);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [visibleNotes, showInferredLinks, semanticSettings]);

  // Extract all unique tags in visible graph
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      for (const t of n.tags) set.add(t);
    }
    return Array.from(set).sort();
  }, [notes]);

  // Build graph nodes and links (explicit + tag + inferred)
  const { initialNodes, initialLinks } = useMemo(() => {
    const noteMap = new Map<string, Note>();
    const titleToIdMap = new Map<string, string>();

    for (const n of visibleNotes) {
      noteMap.set(n.id, n);
      titleToIdMap.set(n.title.trim().toLowerCase(), n.id);
    }

    const links: GraphLink[] = [];
    const linkSet = new Set<string>();
    const linkCountMap = new Map<string, number>();

    // 1. Wiki-links & explicit links
    for (const note of visibleNotes) {
      // Explicit
      if (note.linkedNoteIds) {
        for (const targetId of note.linkedNoteIds) {
          if (noteMap.has(targetId) && targetId !== note.id) {
            const key = [note.id, targetId].sort().join('---');
            if (!linkSet.has(key)) {
              linkSet.add(key);
              links.push({ source: note.id, target: targetId, type: 'wiki' });
              linkCountMap.set(note.id, (linkCountMap.get(note.id) || 0) + 1);
              linkCountMap.set(targetId, (linkCountMap.get(targetId) || 0) + 1);
            }
          }
        }
      }

      // From content [[WikiLinks]]
      const extracted = extractWikiLinks(note.content);
      for (const link of extracted) {
        let targetId: string | undefined;
        if (link.startsWith('note:')) {
          targetId = link.slice(5);
        } else {
          targetId = titleToIdMap.get(link.toLowerCase());
        }

        if (targetId && noteMap.has(targetId) && targetId !== note.id) {
          const key = [note.id, targetId].sort().join('---');
          if (!linkSet.has(key)) {
            linkSet.add(key);
            links.push({ source: note.id, target: targetId, type: 'wiki' });
            linkCountMap.set(note.id, (linkCountMap.get(note.id) || 0) + 1);
            linkCountMap.set(targetId, (linkCountMap.get(targetId) || 0) + 1);
          }
        }
      }
    }

    // 2. Inferred semantic relatedness links (Dashed/Purple)
    if (showInferredLinks && inferredRelations.length > 0) {
      for (const rel of inferredRelations) {
        if (noteMap.has(rel.sourceId) && noteMap.has(rel.targetId) && rel.sourceId !== rel.targetId) {
          const key = [rel.sourceId, rel.targetId].sort().join('---');
          if (!linkSet.has(key)) {
            linkSet.add(key);
            links.push({
              source: rel.sourceId,
              target: rel.targetId,
              type: 'inferred',
              score: rel.score,
              sharedTerms: rel.sharedTerms,
              rationale: rel.rationale,
            });
            linkCountMap.set(rel.sourceId, (linkCountMap.get(rel.sourceId) || 0) + 1);
            linkCountMap.set(rel.targetId, (linkCountMap.get(rel.targetId) || 0) + 1);
          }
        }
      }
    }

    // 3. Shared tags links (optional)
    if (showTagLinks) {
      const tagToNotes = new Map<string, string[]>();
      for (const note of visibleNotes) {
        for (const t of note.tags) {
          const arr = tagToNotes.get(t) || [];
          arr.push(note.id);
          tagToNotes.set(t, arr);
        }
      }

      for (const [t, noteIds] of tagToNotes.entries()) {
        if (noteIds.length > 1 && noteIds.length < 8) {
          for (let i = 0; i < noteIds.length; i++) {
            for (let j = i + 1; j < noteIds.length; j++) {
              const key = [noteIds[i], noteIds[j]].sort().join('---');
              if (!linkSet.has(key)) {
                linkSet.add(key);
                links.push({ source: noteIds[i], target: noteIds[j], type: 'tag', label: `#${t}` });
                linkCountMap.set(noteIds[i], (linkCountMap.get(noteIds[i]) || 0) + 1);
                linkCountMap.set(noteIds[j], (linkCountMap.get(noteIds[j]) || 0) + 1);
              }
            }
          }
        }
      }
    }

    // Build node objects with initial positions
    const width = 800;
    const height = 600;
    const nodes: GraphNode[] = visibleNotes.map((note, idx) => {
      const angle = (idx / visibleNotes.length) * 2 * Math.PI;
      const dist = 100 + Math.random() * 200;
      const count = linkCountMap.get(note.id) || 0;
      const radius = Math.max(12, Math.min(32, 14 + count * 4));
      const colorConfig = NOTE_COLORS[note.color || 'default'] || NOTE_COLORS.default;

      return {
        id: note.id,
        note,
        x: width / 2 + Math.cos(angle) * dist,
        y: height / 2 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius,
        color: colorConfig.hex === '#ffffff' ? '#e2e8f0' : colorConfig.hex,
        linkCount: count,
      };
    });

    return { initialNodes: nodes, initialLinks: links };
  }, [visibleNotes, showTagLinks, showInferredLinks, inferredRelations]);

  // Compute potential unlinked mentions for the selected node inspector
  const potentialLinksForSelected = useMemo(() => {
    if (!selectedNode || !selectedNode.note) return [];
    const index = vaultManager.getIndex();
    return findUnlinkedMentions(selectedNode.note.content, selectedNode.note.id, index);
  }, [selectedNode, allNotes]);

  // Inferred links connected to the selected node
  const inferredLinksForSelected = useMemo(() => {
    if (!selectedNode) return [];
    return initialLinks.filter(
      (l) => l.type === 'inferred' && (l.source === selectedNode.id || l.target === selectedNode.id)
    );
  }, [selectedNode, initialLinks]);

  // Persistent simulated nodes ref
  const nodesRef = useRef<GraphNode[]>(initialNodes);
  const linksRef = useRef<GraphLink[]>(initialLinks);

  useEffect(() => {
    const oldMap = new Map<string, GraphNode>(nodesRef.current.map((n: GraphNode) => [n.id, n]));
    nodesRef.current = initialNodes.map((n) => {
      const old = oldMap.get(n.id);
      if (old) {
        return { ...n, x: old.x, y: old.y, vx: old.vx, vy: old.vy };
      }
      return n;
    });
    linksRef.current = initialLinks;
  }, [initialNodes, initialLinks]);

  // Physics Simulation Step
  const runPhysicsStep = useCallback(() => {
    const nodes = nodesRef.current;
    const links = linksRef.current;
    const nodeMap = new Map<string, GraphNode>(nodes.map((n: GraphNode) => [n.id, n]));

    const kRepel = 2400;
    const kAttractExplicit = 0.04;
    const kAttractInferred = 0.01; // Weak soft attraction for inferred clustering
    const kCenter = 0.005;
    const damping = 0.88;
    const center = { x: 400, y: 300 };

    // 1. Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy || 1;
        const dist = Math.sqrt(distSq);

        if (dist < 400) {
          const force = kRepel / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      }
    }

    // 2. Spring attraction along links
    for (const link of links) {
      const source = nodeMap.get(link.source);
      const target = nodeMap.get(link.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      let desiredDist = 90;
      let kAttract = kAttractExplicit;

      if (link.type === 'tag') {
        desiredDist = 130;
      } else if (link.type === 'inferred') {
        desiredDist = 150;
        kAttract = kAttractInferred;
      }

      const force = (dist - desiredDist) * kAttract;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    // 3. Center Gravity & Position update
    for (const n of nodes) {
      if (draggedNode && draggedNode.id === n.id) {
        n.vx = 0;
        n.vy = 0;
        continue;
      }

      n.vx += (center.x - n.x) * kCenter;
      n.vy += (center.y - n.y) * kCenter;

      n.vx *= damping;
      n.vy *= damping;

      n.x += n.vx;
      n.y += n.vy;
    }
  }, [draggedNode]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      if (isSimulating) {
        runPhysicsStep();
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Apply Pan & Zoom
      ctx.translate(pan.x + rect.width / 2, pan.y + rect.height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-400, -300);

      const nodes = nodesRef.current;
      const links = linksRef.current;
      const nodeMap = new Map<string, GraphNode>(nodes.map((n: GraphNode) => [n.id, n]));
      const isDark = document.documentElement.classList.contains('dark');

      // Draw Edges / Links
      for (const link of links) {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (!s || !t) continue;

        const isHighlighted =
          (hoveredNode && (hoveredNode.id === s.id || hoveredNode.id === t.id)) ||
          (selectedNode && (selectedNode.id === s.id || selectedNode.id === t.id));

        const isExplicitlyActiveInferred =
          selectedInferredLink &&
          ((selectedInferredLink.source === s.id && selectedInferredLink.target === t.id) ||
            (selectedInferredLink.source === t.id && selectedInferredLink.target === s.id));

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (link.type === 'wiki') {
          // Explicit wiki-link (Solid)
          if (isHighlighted) {
            ctx.strokeStyle = isDark ? '#f59e0b' : '#d97706';
            ctx.lineWidth = 2.5;
          } else {
            ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.45)';
            ctx.lineWidth = 1.75;
          }
          ctx.stroke();
        } else if (link.type === 'inferred') {
          // Inferred Semantic link (Dashed purple/violet)
          ctx.setLineDash([5, 4]);
          if (isExplicitlyActiveInferred || isHighlighted) {
            ctx.strokeStyle = isDark ? '#c084fc' : '#9333ea';
            ctx.lineWidth = 2.5;
          } else {
            ctx.strokeStyle = isDark ? 'rgba(192, 132, 252, 0.45)' : 'rgba(147, 51, 234, 0.4)';
            ctx.lineWidth = 1.5;
          }
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Tag link (Dashed grey)
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw Nodes
      for (const n of nodes) {
        const isHovered = hoveredNode && hoveredNode.id === n.id;
        const isSelected = selectedNode && selectedNode.id === n.id;
        const isConnectedToHovered =
          hoveredNode &&
          links.some(
            (l) =>
              (l.source === hoveredNode.id && l.target === n.id) ||
              (l.target === hoveredNode.id && l.source === n.id)
          );
        const isConnectedToSelected =
          selectedNode &&
          links.some(
            (l) =>
              (l.source === selectedNode.id && l.target === n.id) ||
              (l.target === selectedNode.id && l.source === n.id)
          );

        // Glow ring on hover / selection
        if (isHovered || isSelected || isConnectedToHovered || isConnectedToSelected) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + (isSelected ? 7 : isHovered ? 6 : 4), 0, Math.PI * 2);
          ctx.fillStyle = isSelected
            ? isDark
              ? 'rgba(245, 158, 11, 0.45)'
              : 'rgba(217, 119, 6, 0.35)'
            : isHovered
            ? isDark
              ? 'rgba(245, 158, 11, 0.35)'
              : 'rgba(217, 119, 6, 0.25)'
            : isDark
            ? 'rgba(148, 163, 184, 0.2)'
            : 'rgba(100, 116, 139, 0.15)';
          ctx.fill();
        }

        // Main Node Circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();

        // Node Border
        ctx.strokeStyle = isSelected
          ? isDark
            ? '#f59e0b'
            : '#d97706'
          : isHovered
          ? isDark
            ? '#fbbf24'
            : '#b45309'
          : isDark
          ? '#475569'
          : '#cbd5e1';
        ctx.lineWidth = isSelected ? 3 : isHovered ? 2.5 : 1.5;
        ctx.stroke();

        // Pinned badge dot
        if (n.note.pinned) {
          ctx.beginPath();
          ctx.arc(n.x + n.radius * 0.7, n.y - n.radius * 0.7, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Node Label
        ctx.font = `${isHovered ? 'bold ' : ''}11px Inter, system-ui, sans-serif`;
        ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const label = n.note.title || 'Untitled Note';
        const displayLabel = label.length > 18 ? label.slice(0, 16) + '…' : label;
        ctx.fillText(displayLabel, n.x, n.y + n.radius + 4);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, zoom, pan, hoveredNode, selectedNode, selectedInferredLink, runPhysicsStep]);

  // Coordinate Conversion Helper (Screen to Graph Space)
  const getGraphCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const graphX = (screenX - pan.x - rect.width / 2) / zoom + 400;
    const graphY = (screenY - pan.y - rect.height / 2) / zoom + 300;

    return { x: graphX, y: graphY };
  };

  // Mouse / Touch Event Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGraphCoords(e.clientX, e.clientY);
    const clickedNode = nodesRef.current.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });

    if (clickedNode) {
      setDraggedNode(clickedNode);
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGraphCoords(e.clientX, e.clientY);

    if (draggedNode) {
      draggedNode.x = x;
      draggedNode.y = y;
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // Check hover
    const found = nodesRef.current.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });

    setHoveredNode(found || null);
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setIsPanning(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGraphCoords(e.clientX, e.clientY);
    const clickedNode = nodesRef.current.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
      setSelectedInferredLink(null);
    } else {
      // Check if user clicked an inferred edge line
      const nodeMap = new Map<string, GraphNode>(nodesRef.current.map((n) => [n.id, n]));
      let clickedEdge: GraphLink | null = null;

      for (const link of linksRef.current) {
        if (link.type !== 'inferred') continue;
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (!s || !t) continue;

        // Point to line segment distance
        const A = x - s.x;
        const B = y - s.y;
        const C = t.x - s.x;
        const D = t.y - s.y;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        const param = lenSq !== 0 ? Math.max(0, Math.min(1, dot / lenSq)) : -1;
        const xx = s.x + param * C;
        const yy = s.y + param * D;
        const dx = x - xx;
        const dy = y - yy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= 8) {
          clickedEdge = link;
          break;
        }
      }

      if (clickedEdge) {
        setSelectedInferredLink(clickedEdge);
        const sNode = nodeMap.get(clickedEdge.source);
        if (sNode) setSelectedNode(sNode);
      } else {
        setSelectedNode(null);
        setSelectedInferredLink(null);
      }
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getGraphCoords(e.clientX, e.clientY);
    const clickedNode = nodesRef.current.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });

    if (clickedNode) {
      onOpenNote(clickedNode.note);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.max(0.3, Math.min(3.5, prev * zoomFactor)));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Convert Inferred link to Explicit WikiLink
  const handleCreateExplicitLink = (sourceNoteId: string, targetNoteTitle: string) => {
    const noteToUpdate = allNotes.find((n) => n.id === sourceNoteId);
    if (!noteToUpdate || !onUpdateNote) return;

    const linkText = `\n\n[[${targetNoteTitle}]]`;
    const updatedContent = `${noteToUpdate.content.trimEnd()}${linkText}`;
    const updatedNote: Note = {
      ...noteToUpdate,
      content: updatedContent,
      updatedAt: new Date().toISOString(),
    };

    onUpdateNote(updatedNote);
    setSelectedInferredLink(null);
  };

  const inferredLinkCount = useMemo(() => {
    return initialLinks.filter((l) => l.type === 'inferred').length;
  }, [initialLinks]);

  const wikiLinkCount = useMemo(() => {
    return initialLinks.filter((l) => l.type === 'wiki').length;
  }, [initialLinks]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-14rem)] min-h-[500px] bg-stone-50 dark:bg-[#111114] border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-xs flex flex-col"
    >
      {/* Top Floating Graph Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Search & Tag Filter Pills */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white/90 dark:bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-stone-400">
            <Search className="w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search graph nodes..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-32 sm:w-44 bg-transparent text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden"
            />
          </div>

          {availableTags.length > 0 && (
            <div className="flex items-center gap-1 pl-2 border-l border-stone-200 dark:border-stone-700">
              <Tag className="w-3 h-3 text-stone-400" />
              <select
                value={selectedTag || ''}
                onChange={(e) => setSelectedTag(e.target.value || null)}
                className="text-xs bg-transparent text-stone-700 dark:text-stone-300 focus:outline-hidden cursor-pointer max-w-[90px] sm:max-w-none truncate"
              >
                <option value="">All Tags</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {folders.length > 0 && (
            <div className="hidden md:flex items-center gap-1 pl-2 border-l border-stone-200 dark:border-stone-700">
              <FolderIcon className="w-3 h-3 text-stone-400" />
              <select
                value={selectedFolderId || ''}
                onChange={(e) => setSelectedFolderId(e.target.value || null)}
                className="text-xs bg-transparent text-stone-700 dark:text-stone-300 focus:outline-hidden cursor-pointer"
              >
                <option value="">All Folders</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action buttons: Semantic links, Tag links, Settings, Simulation, Zoom, Reset */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-white/90 dark:bg-stone-900/90 backdrop-blur-md p-1 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
          {/* Semantic Inferred Links Toggle */}
          <button
            onClick={() => {
              const nextVal = !showInferredLinks;
              setShowInferredLinks(nextVal);
              semanticManager.updateSettings({ enabled: nextVal });
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showInferredLinks
                ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-300 border border-purple-300/50'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Toggle inferred semantic connections between notes"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isComputingSemantics ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Semantic Edges</span>
            {showInferredLinks && inferredLinkCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-200 dark:bg-purple-900 text-[10px] font-mono">
                {inferredLinkCount}
              </span>
            )}
          </button>

          {/* Semantic Settings Popover Trigger */}
          <button
            onClick={() => setShowSemanticSettingsModal(true)}
            className="p-1.5 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            title="Semantic Relatedness Settings & Engine Config"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Tag links toggle */}
          <button
            onClick={() => setShowTagLinks(!showTagLinks)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              showTagLinks
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300/50'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Toggle links between notes sharing the same tags"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Tag Links</span>
          </button>

          <div className="h-4 w-px bg-stone-200 dark:border-stone-700 mx-0.5" />

          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className="p-1.5 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            title={isSimulating ? 'Pause physics layout' : 'Resume physics layout'}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setZoom((z) => Math.min(3.5, z * 1.2))}
            className="p-1.5 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))}
            className="p-1.5 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetView}
            className="p-1.5 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            title="Reset View"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      />

      {/* Graph Legend & Stats Badge */}
      <div className="absolute bottom-3 left-3 pointer-events-none bg-white/90 dark:bg-stone-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 text-[11px] font-medium text-stone-600 dark:text-stone-400 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>{visibleNotes.length}</strong> nodes • <strong>{wikiLinkCount}</strong> explicit
          </span>
        </div>

        {showInferredLinks && (
          <div className="flex items-center gap-1.5 border-l border-stone-200 dark:border-stone-700 pl-3">
            <span className="w-2.5 h-0.5 border-b-2 border-dashed border-purple-500 inline-block" />
            <span className="text-purple-700 dark:text-purple-300">
              <strong>{inferredLinkCount}</strong> inferred ({semanticSettings.mode === 'embeddings' ? 'Vector' : 'BM25'})
            </span>
          </div>
        )}
      </div>

      {/* Selected Inferred Link / Similarity Inspector Sidebar */}
      {selectedNode && (
        <div className="absolute top-16 right-3 bottom-3 z-30 pointer-events-auto w-72 sm:w-84 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-4 rounded-2xl border border-stone-300 dark:border-stone-800 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-200 text-xs">
          <div className="space-y-3.5">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-2.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">
                    Node Inspector
                  </span>
                  {selectedInferredLink && (
                    <span className="px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-900 text-[9px] font-bold text-purple-700 dark:text-purple-300">
                      Inferred Connection
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 leading-tight mt-0.5">
                  {selectedNode.note.title || 'Untitled Note'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedNode(null);
                  setSelectedInferredLink(null);
                }}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-md transition-colors"
                title="Close inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Note Snippet */}
            {selectedNode.note.content && (
              <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed bg-stone-50 dark:bg-stone-800/60 p-2 rounded-lg font-mono">
                {selectedNode.note.content}
              </p>
            )}

            {/* Inferred Semantic Matches Section */}
            {showInferredLinks && (
              <div className="space-y-2 pt-1 border-t border-stone-200 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 dark:text-purple-200 text-[11px] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Inferred Relatedness ({inferredLinksForSelected.length})</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {semanticSettings.mode === 'embeddings' ? 'Vector Sim' : 'BM25 Lexical'}
                  </span>
                </div>

                {inferredLinksForSelected.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {inferredLinksForSelected.map((link) => {
                      const otherId = link.source === selectedNode.id ? link.target : link.source;
                      const otherNote = allNotes.find((n) => n.id === otherId);
                      if (!otherNote) return null;

                      const scorePct = Math.round((link.score || 0) * 100);

                      return (
                        <div
                          key={`${link.source}-${link.target}`}
                          className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-900/50 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-stone-900 dark:text-stone-100 truncate">
                              {otherNote.title || 'Untitled Note'}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-full bg-purple-200/80 dark:bg-purple-900/80 text-purple-900 dark:text-purple-200 text-[10px] font-mono shrink-0">
                              {scorePct}% match
                            </span>
                          </div>

                          {link.sharedTerms && link.sharedTerms.length > 0 && (
                            <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                              Concepts: {link.sharedTerms.slice(0, 3).map((t) => `#${t}`).join(' ')}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleCreateExplicitLink(
                                  selectedNode.id,
                                  otherNote.title || 'Untitled Note'
                                )
                              }
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[10px] shrink-0 transition-colors shadow-2xs flex items-center gap-1"
                              title={`Add [[${otherNote.title}]] to ${selectedNode.note.title}`}
                            >
                              <Link2 className="w-3 h-3" />
                              <span>Create explicit link</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 italic bg-stone-50 dark:bg-stone-800/40 p-2 rounded-lg">
                    No inferred matches above the current {Math.round(semanticSettings.threshold * 100)}% threshold.
                  </div>
                )}
              </div>
            )}

            {/* Potential Links / Unlinked Mentions */}
            <div className="space-y-2 pt-1 border-t border-stone-200 dark:border-stone-800">
              <span className="font-bold text-stone-800 dark:text-stone-200 text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Link2 className="w-3 h-3 text-amber-500" />
                  <span>Unlinked Mentions</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  {potentialLinksForSelected.length} {potentialLinksForSelected.length === 1 ? 'target' : 'targets'}
                </span>
              </span>

              {potentialLinksForSelected.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {potentialLinksForSelected.map((cand) => (
                    <div
                      key={`${cand.targetNoteId}-${cand.matchedTerm}`}
                      className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-1.5"
                    >
                      <div className="truncate">
                        <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {cand.targetTitle}
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400">
                          {cand.occurrences.length} unlinked mention(s)
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenNote(selectedNode.note)}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[10px] shrink-0 transition-colors shadow-2xs"
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-stone-500 dark:text-stone-400 italic bg-stone-50 dark:bg-stone-800/40 p-2 rounded-lg">
                  No unlinked mentions discovered.
                </div>
              )}
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 mt-2">
            <button
              type="button"
              onClick={() => onOpenNote(selectedNode.note)}
              className="w-full py-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Open in Editor</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Semantic Settings Modal */}
      {showSemanticSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  Semantic Relatedness & Graph Clustering
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSemanticSettingsModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Architecture Mode Selector */}
            <div className="space-y-2">
              <label className="font-bold text-stone-800 dark:text-stone-200 block">
                Analysis Engine
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => semanticManager.updateSettings({ mode: 'lexical' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    semanticSettings.mode === 'lexical'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20'
                      : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">Layer 1: BM25</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-700 font-mono">
                      0 MB
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                    Fast client-side BM25 scoring with title & heading field-weighting. Instant.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => semanticManager.updateSettings({ mode: 'embeddings' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    semanticSettings.mode === 'embeddings'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20'
                      : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-purple-500" />
                      <span>Layer 2: Vectors</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-200/80 dark:bg-purple-900 font-mono">
                      ~23 MB
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                    Transformers.js on-device vector embeddings (WebGPU / WASM).
                  </p>
                </button>
              </div>
            </div>

            {/* Embeddings Opt-in Banner if selected */}
            {semanticSettings.mode === 'embeddings' && (
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 space-y-2 text-stone-700 dark:text-stone-300 text-[11px]">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-purple-950 dark:text-purple-100">
                      On-Device Neural Embeddings
                    </p>
                    <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                      Runs <code>all-MiniLM-L6-v2</code> entirely in your browser using WebGPU with WASM fallback. No note data ever leaves your device. Model weights (~23MB) are cached locally in your browser.
                    </p>
                  </div>
                </div>

                {embeddingProgress && (
                  <div className="space-y-1 pt-1 border-t border-purple-200/60 dark:border-purple-800">
                    <div className="flex justify-between text-[10px] text-stone-500 dark:text-stone-400">
                      <span>{embeddingProgress.status}</span>
                      <span>{Math.round(embeddingProgress.progress)}%</span>
                    </div>
                    <div className="w-full bg-purple-200 dark:bg-purple-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-purple-600 h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${embeddingProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Threshold Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200">
                <span>Similarity Threshold</span>
                <span className="font-mono text-purple-600 dark:text-purple-400">
                  {Math.round(semanticSettings.threshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={semanticSettings.threshold}
                onChange={(e) =>
                  semanticManager.updateSettings({ threshold: parseFloat(e.target.value) })
                }
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>More connections (10%)</span>
                <span>Balanced (30%)</span>
                <span>Strict matches (80%)</span>
              </div>
            </div>

            {/* Max Neighbors Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-bold text-stone-800 dark:text-stone-200">
                <span>Max Inferred Neighbors Per Node</span>
                <span className="font-mono text-purple-600 dark:text-purple-400">
                  {semanticSettings.maxNeighborsPerNode}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={semanticSettings.maxNeighborsPerNode}
                onChange={(e) =>
                  semanticManager.updateSettings({
                    maxNeighborsPerNode: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-purple-600 cursor-pointer"
              />
              <p className="text-[10px] text-stone-400">
                Prevents graph clutter by keeping only top strongest candidate pairs.
              </p>
            </div>

            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSemanticSettingsModal(false)}
                className="px-4 py-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 font-bold rounded-xl shadow-xs transition-colors"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
