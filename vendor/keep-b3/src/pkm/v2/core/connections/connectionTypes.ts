import { ResourceType } from '../resource/resourceCore';

export type ConnectionEdgeType =
  | 'wikilink'       // Human-authored markdown [[link]]
  | 'typed_relation' // Explicit structured relationship (e.g. parent, subtask, project_of, attendee)
  | 'citation'       // Literature/PDF citation or highlight reference
  | 'backlink'       // Inverted edge derived from wikilink or relation
  | 'inferred';      // Non-canonical semantic or keyword suggestion

export interface ConnectionEdge {
  id: string;
  sourceId: string;
  sourceType: ResourceType;
  targetId: string;
  targetType: ResourceType;
  edgeType: ConnectionEdgeType;
  relationLabel?: string;     // e.g. "depends_on", "authored_by", "cites", "mentions"
  isBiDirectional?: boolean;
  contextSnippet?: string;    // excerpt around wikilink or reference
  confidence?: number;        // 1.0 for canonical edges, 0.0 - 0.99 for inferred
  createdAt: number;
}

export interface NodeConnections {
  resourceId: string;
  resourceType: ResourceType;
  outgoing: ConnectionEdge[];
  incoming: ConnectionEdge[];
  wikilinks: ConnectionEdge[];
  relations: ConnectionEdge[];
  citations: ConnectionEdge[];
  backlinks: ConnectionEdge[];
  inferred: ConnectionEdge[];
  totalCount: number;
}
