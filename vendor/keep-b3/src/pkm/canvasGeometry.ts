import {
  CanvasPoint,
  CanvasRect,
  CanvasTransform,
  CanvasNode,
  CanvasStroke,
  CanvasStrokePoint,
  ConnectorSide,
  ConnectorLineStyle,
} from './canvasTypes';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3.5;

/**
 * Converts screen/pointer coordinates into canvas world coordinates
 */
export function screenToWorld(
  screenPt: CanvasPoint,
  transform: CanvasTransform,
  containerOrigin: { left: number; top: number } = { left: 0, top: 0 }
): CanvasPoint {
  return {
    x: (screenPt.x - containerOrigin.left - transform.panX) / transform.zoom,
    y: (screenPt.y - containerOrigin.top - transform.panY) / transform.zoom,
  };
}

/**
 * Converts canvas world coordinates into screen/viewport coordinates
 */
export function worldToScreen(
  worldPt: CanvasPoint,
  transform: CanvasTransform,
  containerOrigin: { left: number; top: number } = { left: 0, top: 0 }
): CanvasPoint {
  return {
    x: worldPt.x * transform.zoom + transform.panX + containerOrigin.left,
    y: worldPt.y * transform.zoom + transform.panY + containerOrigin.top,
  };
}

/**
 * Clamps a number between min and max bounds
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Calculates the bounding box of a list of nodes and strokes
 */
export function calculateBoundingBox(
  nodes: CanvasNode[],
  strokes: CanvasStroke[] = []
): CanvasRect | null {
  if (nodes.length === 0 && strokes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  for (const stroke of strokes) {
    for (const pt of stroke.points) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
  }

  if (!isFinite(minX) || !isFinite(minY)) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Computes the optimal transform (pan & zoom) to fit all elements in viewport
 */
export function calculateZoomToFit(
  nodes: CanvasNode[],
  strokes: CanvasStroke[],
  viewportWidth: number,
  viewportHeight: number,
  padding = 80
): CanvasTransform {
  const bounds = calculateBoundingBox(nodes, strokes);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    return { panX: viewportWidth / 2, panY: viewportHeight / 2, zoom: 1 };
  }

  const availW = Math.max(100, viewportWidth - padding * 2);
  const availH = Math.max(100, viewportHeight - padding * 2);

  const zoomX = availW / bounds.width;
  const zoomY = availH / bounds.height;
  const zoom = clamp(Math.min(zoomX, zoomY), MIN_ZOOM, 1.5);

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  const panX = viewportWidth / 2 - centerX * zoom;
  const panY = viewportHeight / 2 - centerY * zoom;

  return { panX, panY, zoom };
}

/**
 * Returns the anchor point of a node rectangle for a given side
 */
export function getNodeAnchorPoint(
  rect: CanvasRect,
  side: ConnectorSide,
  otherPoint?: CanvasPoint
): CanvasPoint {
  if (side === 'auto' && otherPoint) {
    const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const dx = otherPoint.x - center.x;
    const dy = otherPoint.y - center.y;

    if (Math.abs(dx) * (rect.height / 2) > Math.abs(dy) * (rect.width / 2)) {
      return dx > 0
        ? { x: rect.x + rect.width, y: center.y } // right
        : { x: rect.x, y: center.y }; // left
    } else {
      return dy > 0
        ? { x: center.x, y: rect.y + rect.height } // bottom
        : { x: center.x, y: rect.y }; // top
    }
  }

  switch (side) {
    case 'top':
      return { x: rect.x + rect.width / 2, y: rect.y };
    case 'bottom':
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
    case 'left':
      return { x: rect.x, y: rect.y + rect.height / 2 };
    case 'right':
      return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
    default:
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
}

/**
 * Determines the best connection sides between two rectangles
 */
export function determineBestSides(
  fromRect: CanvasRect,
  toRect: CanvasRect
): { fromSide: ConnectorSide; toSide: ConnectorSide } {
  const fromCenter = { x: fromRect.x + fromRect.width / 2, y: fromRect.y + fromRect.height / 2 };
  const toCenter = { x: toRect.x + toRect.width / 2, y: toRect.y + toRect.height / 2 };

  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  let fromSide: ConnectorSide = 'right';
  let toSide: ConnectorSide = 'left';

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      fromSide = 'right';
      toSide = 'left';
    } else {
      fromSide = 'left';
      toSide = 'right';
    }
  } else {
    if (dy > 0) {
      fromSide = 'bottom';
      toSide = 'top';
    } else {
      fromSide = 'top';
      toSide = 'bottom';
    }
  }

  return { fromSide, toSide };
}

/**
 * Generates an SVG path string for a connector between two points
 */
export function generateConnectorPath(
  fromPt: CanvasPoint,
  toPt: CanvasPoint,
  fromSide: ConnectorSide = 'auto',
  toSide: ConnectorSide = 'auto',
  style: ConnectorLineStyle = 'curved'
): string {
  if (style === 'straight') {
    return `M ${fromPt.x} ${fromPt.y} L ${toPt.x} ${toPt.y}`;
  }

  if (style === 'orthogonal') {
    const midX = (fromPt.x + toPt.x) / 2;
    const midY = (fromPt.y + toPt.y) / 2;

    if (fromSide === 'left' || fromSide === 'right') {
      return `M ${fromPt.x} ${fromPt.y} L ${midX} ${fromPt.y} L ${midX} ${toPt.y} L ${toPt.x} ${toPt.y}`;
    } else {
      return `M ${fromPt.x} ${fromPt.y} L ${fromPt.x} ${midY} L ${toPt.x} ${midY} L ${toPt.x} ${toPt.y}`;
    }
  }

  // Curved (Bezier)
  const dx = toPt.x - fromPt.x;
  const dy = toPt.y - fromPt.y;
  const dist = Math.hypot(dx, dy);
  const curvature = Math.min(Math.max(dist * 0.35, 40), 180);

  let cp1 = { ...fromPt };
  let cp2 = { ...toPt };

  switch (fromSide) {
    case 'right':
      cp1.x += curvature;
      break;
    case 'left':
      cp1.x -= curvature;
      break;
    case 'top':
      cp1.y -= curvature;
      break;
    case 'bottom':
      cp1.y += curvature;
      break;
    default:
      cp1.x += dx * 0.4;
      break;
  }

  switch (toSide) {
    case 'right':
      cp2.x += curvature;
      break;
    case 'left':
      cp2.x -= curvature;
      break;
    case 'top':
      cp2.y -= curvature;
      break;
    case 'bottom':
      cp2.y += curvature;
      break;
    default:
      cp2.x -= dx * 0.4;
      break;
  }

  return `M ${fromPt.x} ${fromPt.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${toPt.x} ${toPt.y}`;
}

/**
 * Checks if a point lies inside a rectangle
 */
export function isPointInsideRect(pt: CanvasPoint, rect: CanvasRect): boolean {
  return (
    pt.x >= rect.x &&
    pt.x <= rect.x + rect.width &&
    pt.y >= rect.y &&
    pt.y <= rect.y + rect.height
  );
}

/**
 * Checks if two rectangles intersect
 */
export function isRectIntersecting(r1: CanvasRect, r2: CanvasRect): boolean {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
}

/**
 * Ramer-Douglas-Peucker algorithm for vector stroke point reduction
 */
export function simplifyStrokePoints(
  points: CanvasStrokePoint[],
  tolerance = 1.5
): CanvasStrokePoint[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyStrokePoints(points.slice(0, index + 1), tolerance);
    const right = simplifyStrokePoints(points.slice(index), tolerance);
    return left.slice(0, -1).concat(right);
  } else {
    return [first, last];
  }
}

function perpendicularDistance(
  pt: CanvasStrokePoint,
  lineStart: CanvasStrokePoint,
  lineEnd: CanvasStrokePoint
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y);

  const u = ((pt.x - lineStart.x) * dx + (pt.y - lineStart.y) * dy) / (mag * mag);
  const clampedU = clamp(u, 0, 1);
  const ix = lineStart.x + clampedU * dx;
  const iy = lineStart.y + clampedU * dy;

  return Math.hypot(pt.x - ix, pt.y - iy);
}

/**
 * Generates an SVG path from freehand stroke points with Catmull-Rom smoothing
 */
export function generateSvgPathFromStroke(strokeOrPoints: CanvasStroke | CanvasStrokePoint[]): string {
  const points = Array.isArray(strokeOrPoints) ? strokeOrPoints : strokeOrPoints?.points || [];
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}
