import { ConnectionEdge, ConnectionEdgeType, NodeConnections } from './connectionTypes';
import { ResourceType } from '../resource/resourceCore';

export class ConnectionIndexV2 {
  private edges: Map<string, ConnectionEdge> = new Map();
  private outgoingIndex: Map<string, Set<string>> = new Map(); // sourceId -> Set<edgeId>
  private incomingIndex: Map<string, Set<string>> = new Map(); // targetId -> Set<edgeId>

  public addEdge(edge: ConnectionEdge): void {
    this.edges.set(edge.id, edge);

    if (!this.outgoingIndex.has(edge.sourceId)) {
      this.outgoingIndex.set(edge.sourceId, new Set());
    }
    this.outgoingIndex.get(edge.sourceId)!.add(edge.id);

    if (!this.incomingIndex.has(edge.targetId)) {
      this.incomingIndex.set(edge.targetId, new Set());
    }
    this.incomingIndex.get(edge.targetId)!.add(edge.id);
  }

  public getEdge(edgeId: string): ConnectionEdge | undefined {
    return this.edges.get(edgeId);
  }

  public addWikilink(
    sourceId: string,
    sourceType: ResourceType,
    targetId: string,
    targetType: ResourceType,
    contextSnippet?: string
  ): ConnectionEdge {
    const edge: ConnectionEdge = {
      id: `wiki_${sourceId}_${targetId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceId,
      sourceType,
      targetId,
      targetType,
      edgeType: 'wikilink',
      contextSnippet,
      createdAt: Date.now(),
    };
    this.addEdge(edge);
    return edge;
  }

  public addRelation(
    sourceId: string,
    sourceType: ResourceType,
    targetId: string,
    targetType: ResourceType,
    relationLabel: string
  ): ConnectionEdge {
    const edge: ConnectionEdge = {
      id: `rel_${sourceId}_${targetId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceId,
      sourceType,
      targetId,
      targetType,
      edgeType: 'typed_relation',
      relationLabel,
      createdAt: Date.now(),
    };
    this.addEdge(edge);
    return edge;
  }

  public addCitation(
    sourceId: string,
    sourceType: ResourceType,
    targetId: string,
    targetType: ResourceType,
    citationKey?: string
  ): ConnectionEdge {
    const edge: ConnectionEdge = {
      id: `cite_${sourceId}_${targetId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceId,
      sourceType,
      targetId,
      targetType,
      edgeType: 'citation',
      relationLabel: citationKey,
      createdAt: Date.now(),
    };
    this.addEdge(edge);
    return edge;
  }

  public removeEdge(edgeId: string): boolean {
    const edge = this.edges.get(edgeId);
    if (!edge) return false;

    this.outgoingIndex.get(edge.sourceId)?.delete(edgeId);
    this.incomingIndex.get(edge.targetId)?.delete(edgeId);
    this.edges.delete(edgeId);
    return true;
  }

  public removeEdgesForResource(resourceId: string): void {
    const outgoing = this.outgoingIndex.get(resourceId);
    if (outgoing) {
      for (const edgeId of Array.from(outgoing)) {
        const edge = this.edges.get(edgeId);
        if (edge) {
          this.incomingIndex.get(edge.targetId)?.delete(edgeId);
          this.edges.delete(edgeId);
        }
      }
      this.outgoingIndex.delete(resourceId);
    }

    const incoming = this.incomingIndex.get(resourceId);
    if (incoming) {
      for (const edgeId of Array.from(incoming)) {
        const edge = this.edges.get(edgeId);
        if (edge) {
          this.outgoingIndex.get(edge.sourceId)?.delete(edgeId);
          this.edges.delete(edgeId);
        }
      }
      this.incomingIndex.delete(resourceId);
    }
  }

  public getEdgesForResource(resourceId: string): ConnectionEdge[] {
    const outgoingIds = this.outgoingIndex.get(resourceId) || new Set();
    const incomingIds = this.incomingIndex.get(resourceId) || new Set();
    const result: ConnectionEdge[] = [];

    for (const id of outgoingIds) {
      const edge = this.edges.get(id);
      if (edge) result.push(edge);
    }
    for (const id of incomingIds) {
      const edge = this.edges.get(id);
      if (edge) result.push(edge);
    }
    return result;
  }

  public getConnectionsFor(resourceId: string, resourceType: ResourceType = 'note'): NodeConnections {
    const outgoingIds = this.outgoingIndex.get(resourceId) || new Set();
    const incomingIds = this.incomingIndex.get(resourceId) || new Set();

    const outgoing: ConnectionEdge[] = [];
    for (const id of outgoingIds) {
      const edge = this.edges.get(id);
      if (edge) outgoing.push(edge);
    }

    const incoming: ConnectionEdge[] = [];
    for (const id of incomingIds) {
      const edge = this.edges.get(id);
      if (edge) incoming.push(edge);
    }

    const wikilinks = outgoing.filter((e) => e.edgeType === 'wikilink');
    const relations = [...outgoing, ...incoming].filter((e) => e.edgeType === 'typed_relation');
    const citations = outgoing.filter((e) => e.edgeType === 'citation');
    const backlinks = incoming.filter((e) => e.edgeType === 'wikilink' || e.edgeType === 'backlink');
    const inferred = [...outgoing, ...incoming].filter((e) => e.edgeType === 'inferred');

    return {
      resourceId,
      resourceType,
      outgoing,
      incoming,
      wikilinks,
      relations,
      citations,
      backlinks,
      inferred,
      totalCount: outgoing.length + incoming.length,
    };
  }

  public getNeighbors(resourceId: string, maxDepth: number = 1): Set<string> {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: resourceId, depth: 0 }];
    visited.add(resourceId);

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const outEdges = this.outgoingIndex.get(id) || new Set();
      for (const edgeId of outEdges) {
        const edge = this.edges.get(edgeId);
        if (edge && !visited.has(edge.targetId)) {
          visited.add(edge.targetId);
          queue.push({ id: edge.targetId, depth: depth + 1 });
        }
      }

      const inEdges = this.incomingIndex.get(id) || new Set();
      for (const edgeId of inEdges) {
        const edge = this.edges.get(edgeId);
        if (edge && !visited.has(edge.sourceId)) {
          visited.add(edge.sourceId);
          queue.push({ id: edge.sourceId, depth: depth + 1 });
        }
      }
    }

    visited.delete(resourceId);
    return visited;
  }

  public clear(): void {
    this.edges.clear();
    this.outgoingIndex.clear();
    this.incomingIndex.clear();
  }

  public getTotalEdgesCount(): number {
    return this.edges.size;
  }
}

export const connectionIndexV2 = new ConnectionIndexV2();
