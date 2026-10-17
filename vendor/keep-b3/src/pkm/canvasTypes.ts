import { NoteColorKey } from '../types';

export type CanvasToolMode =
  | 'select'
  | 'hand'
  | 'note'
  | 'sticky'
  | 'connector'
  | 'pen'
  | 'group'
  | 'eraser';

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasTransform {
  panX: number;
  panY: number;
  zoom: number;
}

export type ConnectorSide = 'top' | 'right' | 'bottom' | 'left' | 'auto';
export type ConnectorArrowDirection = 'none' | 'forward' | 'backward' | 'both';
export type ConnectorLineStyle = 'curved' | 'orthogonal' | 'straight';

export interface CanvasNodeBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked?: boolean;
}

export interface NoteCanvasNode extends CanvasNodeBase {
  type: 'note';
  noteId: string; // Canonical reference to real Note
  customColor?: NoteColorKey | string;
  showPreview?: boolean;
  collapsed?: boolean;
  previewLength?: 'compact' | 'medium' | 'full';
  hideProperties?: boolean;
  showTasks?: boolean;
}

export interface SectionCanvasNode extends CanvasNodeBase {
  type: 'section';
  noteId: string; // Canonical reference to source Note
  heading: string; // Heading title or query
  headingSlug?: string;
  customColor?: NoteColorKey | string;
  collapsed?: boolean;
}

export interface BlockCanvasNode extends CanvasNodeBase {
  type: 'block';
  noteId: string; // Canonical reference to source Note
  blockId: string; // Stable block ID (^block-id)
  customColor?: NoteColorKey | string;
  collapsed?: boolean;
}

export interface StickyCanvasNode extends CanvasNodeBase {
  type: 'sticky' | 'text';
  text: string;
  color: string;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  align?: 'left' | 'center' | 'right';
}

export interface MediaCanvasNode extends CanvasNodeBase {
  type: 'media';
  mediaType: 'image' | 'pdf' | 'audio';
  attachmentId?: string;
  url?: string;
  title?: string;
  customColor?: string;
}

export interface GroupCanvasNode extends CanvasNodeBase {
  type: 'group';
  label: string;
  color: string;
  containedNodeIds?: string[];
  collapsed?: boolean;
}

export type CanvasNode =
  | NoteCanvasNode
  | SectionCanvasNode
  | BlockCanvasNode
  | StickyCanvasNode
  | MediaCanvasNode
  | GroupCanvasNode;

export interface CanvasSearchMatch {
  nodeId: string;
  title: string;
  snippet?: string;
  type: CanvasNode['type'];
}

export interface CanvasConnector {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromSide?: ConnectorSide;
  toSide?: ConnectorSide;
  arrowDirection: ConnectorArrowDirection;
  lineStyle: ConnectorLineStyle;
  color: string;
  strokeWidth: number;
  label?: string;
}

export interface CanvasStrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface CanvasStroke {
  id: string;
  points: CanvasStrokePoint[];
  color: string;
  width: number;
  isHighlighter?: boolean;
}

export type CanvasBackgroundStyle = 'dots' | 'grid' | 'cross' | 'clean';

export interface CanvasBoard {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  nodes: CanvasNode[];
  connectors: CanvasConnector[];
  strokes: CanvasStroke[];
  transform: CanvasTransform;
  backgroundStyle: CanvasBackgroundStyle;
}

export interface CanvasHistoryStep {
  nodes: CanvasNode[];
  connectors: CanvasConnector[];
  strokes: CanvasStroke[];
}
