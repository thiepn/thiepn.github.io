import { Note } from '../../types';
import {
  LocalGraphData,
  LocalGraphNode,
  LocalGraphEdge,
  LocalGraphFilters,
  DEFAULT_LOCAL_GRAPH_FILTERS,
} from './localGraphTypes';
import { vaultManager } from '../indexer';
import { semanticManager } from '../semanticManager';

class LocalGraphService {
  private currentOperationId = 0;

  /**
   * Computes the local graph data for a given center note with race safety.
   */
  public async computeLocalGraph(
    centerNoteId: string,
    allNotes: Note[],
    filters: LocalGraphFilters = DEFAULT_LOCAL_GRAPH_FILTERS
  ): Promise<{ data: LocalGraphData; operationId: number }> {
    const opId = ++this.currentOperationId;

    const noteMap = new Map<string, Note>(allNotes.map((n) => [n.id, n]));
    const centerNote = noteMap.get(centerNoteId);

    if (!centerNote) {
      return {
        data: {
          centerNode: null,
          nodes: [],
          edges: [],
          outgoingCount: 0,
          backlinkCount: 0,
          embedCount: 0,
          inferredCount: 0,
          totalNeighborsCount: 0,
          hiddenCount: 0,
        },
        operationId: opId,
      };
    }

    const index = vaultManager.getIndex();

    const nodesMap = new Map<string, LocalGraphNode>();
    const edgesMap = new Map<string, LocalGraphEdge>();

    // 1. Center Node (hop 0)
    const centerGraphNode: LocalGraphNode = {
      id: centerNote.id,
      title: centerNote.title || 'Untitled Note',
      isCenter: true,
      hop: 0,
      color: centerNote.color,
      note: centerNote,
      linkCount: 0,
    };
    nodesMap.set(centerNote.id, centerGraphNode);

    let outgoingCount = 0;
    let backlinkCount = 0;
    let embedCount = 0;
    let inferredCount = 0;

    // Helper to get or create node
    const getOrCreateNode = (note: Note, hop: number): LocalGraphNode => {
      let node = nodesMap.get(note.id);
      if (!node) {
        node = {
          id: note.id,
          title: note.title || 'Untitled Note',
          isCenter: false,
          hop,
          color: note.color,
          note,
          linkCount: 0,
        };
        nodesMap.set(note.id, node);
      }
      return node;
    };

    // Helper to add edge
    const addEdge = (
      sourceId: string,
      targetId: string,
      type: 'explicit' | 'embed' | 'inferred',
      extra?: Partial<LocalGraphEdge>
    ) => {
      const edgeKey = `${sourceId}->${targetId}:${type}`;
      if (!edgesMap.has(edgeKey)) {
        edgesMap.set(edgeKey, {
          id: edgeKey,
          source: sourceId,
          target: targetId,
          type,
          ...extra,
        });
      }
    };

    // Helper to resolve note from wiki link target
    const resolveTargetNote = (targetStr: string): Note | undefined => {
      if (!targetStr) return undefined;
      if (targetStr.startsWith('note:')) {
        return noteMap.get(targetStr.slice(5));
      }
      const direct = noteMap.get(targetStr);
      if (direct) return direct;
      const resIds = index.titleToNoteIds[targetStr.toLowerCase().trim()];
      if (resIds && resIds.length > 0) {
        return noteMap.get(resIds[0]);
      }
      return undefined;
    };

    // 2. Direct Explicit Outgoing Links & Embeds from Center Note
    const parsedCenter = index.notes[centerNote.id];

    if (filters.showExplicit && parsedCenter?.outgoingLinks) {
      for (const link of parsedCenter.outgoingLinks) {
        const targetNote = resolveTargetNote(link.target);
        if (targetNote && targetNote.id !== centerNote.id && !targetNote.trashed) {
          getOrCreateNode(targetNote, 1);
          addEdge(centerNote.id, targetNote.id, 'explicit', {
            label: link.alias || undefined,
          });
          outgoingCount++;
        }
      }
    }

    if (filters.showEmbeds && parsedCenter?.embeds) {
      for (const embed of parsedCenter.embeds) {
        const targetNote = resolveTargetNote(embed.target);
        if (targetNote && targetNote.id !== centerNote.id && !targetNote.trashed) {
          getOrCreateNode(targetNote, 1);
          addEdge(centerNote.id, targetNote.id, 'embed');
          embedCount++;
        }
      }
    }

    // 3. Direct Incoming Backlinks to Center Note
    if (filters.showBacklinks) {
      const backlinks = index.backlinks[centerNote.id] || [];
      for (const backlink of backlinks) {
        const sourceNote = noteMap.get(backlink.sourceNoteId);
        if (sourceNote && sourceNote.id !== centerNote.id && !sourceNote.trashed) {
          getOrCreateNode(sourceNote, 1);
          addEdge(sourceNote.id, centerNote.id, 'explicit', {
            label: backlink.link?.alias || undefined,
          });
          backlinkCount++;
        }
      }
    }

    // 4. Inferred Semantic Relationships
    if (filters.showInferred) {
      try {
        const semanticResults = semanticManager.getSimilarNotesForNote(
          centerNote.id,
          allNotes,
          { threshold: filters.semanticThreshold }
        );

        for (const rel of semanticResults) {
          const targetNote = noteMap.get(rel.targetId);
          if (targetNote && targetNote.id !== centerNote.id && !targetNote.trashed) {
            getOrCreateNode(targetNote, 1);
            addEdge(centerNote.id, targetNote.id, 'inferred', {
              score: rel.score,
              sharedTerms: rel.sharedTerms,
              rationale: rel.rationale,
            });
            inferredCount++;
          }
        }
      } catch (err) {
        console.warn('[LocalGraphService] Inferred relations error:', err);
      }
    }

    // 5. Depth 2 Expansion (optional)
    if (filters.depth === 2) {
      const hop1Nodes = Array.from(nodesMap.values()).filter((n) => n.hop === 1);

      for (const hop1Node of hop1Nodes) {
        if (nodesMap.size >= filters.maxNodes) break;

        // Outgoing from hop1
        if (filters.showExplicit) {
          const parsedHop1 = index.notes[hop1Node.id];
          const outLinks = parsedHop1?.outgoingLinks || [];
          for (const link of outLinks) {
            if (nodesMap.size >= filters.maxNodes) break;

            const targetNote = resolveTargetNote(link.target);
            if (targetNote && !targetNote.trashed) {
              getOrCreateNode(targetNote, 2);
              addEdge(hop1Node.id, targetNote.id, 'explicit', {
                label: link.alias || undefined,
              });
            }
          }
        }
      }
    }

    // Calculate total degree / linkCount per node
    for (const edge of edgesMap.values()) {
      const src = nodesMap.get(edge.source);
      const tgt = nodesMap.get(edge.target);
      if (src) src.linkCount = (src.linkCount || 0) + 1;
      if (tgt) tgt.linkCount = (tgt.linkCount || 0) + 1;
    }

    const allNodesList = Array.from(nodesMap.values());
    const totalNeighborsCount = allNodesList.length - 1;

    // Cap to maxNodes if needed
    let finalNodes = allNodesList;
    let hiddenCount = 0;

    if (allNodesList.length > filters.maxNodes) {
      // Keep center node + highest degree neighbors
      const otherNodes = allNodesList.filter((n) => !n.isCenter);
      otherNodes.sort((a, b) => (b.linkCount || 0) - (a.linkCount || 0));

      const keptOthers = otherNodes.slice(0, filters.maxNodes - 1);
      hiddenCount = otherNodes.length - keptOthers.length;

      finalNodes = [centerGraphNode, ...keptOthers];

      const keptIds = new Set(finalNodes.map((n) => n.id));
      // Filter edges that only connect kept nodes
      const finalEdges = Array.from(edgesMap.values()).filter(
        (e) => keptIds.has(e.source) && keptIds.has(e.target)
      );

      return {
        data: {
          centerNode: centerGraphNode,
          nodes: finalNodes,
          edges: finalEdges,
          outgoingCount,
          backlinkCount,
          embedCount,
          inferredCount,
          totalNeighborsCount,
          hiddenCount,
        },
        operationId: opId,
      };
    }

    return {
      data: {
        centerNode: centerGraphNode,
        nodes: finalNodes,
        edges: Array.from(edgesMap.values()),
        outgoingCount,
        backlinkCount,
        embedCount,
        inferredCount,
        totalNeighborsCount,
        hiddenCount: 0,
      },
      operationId: opId,
    };
  }
}

export const localGraphService = new LocalGraphService();
