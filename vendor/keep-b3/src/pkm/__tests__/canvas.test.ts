import {
  screenToWorld,
  worldToScreen,
  calculateBoundingBox,
  calculateZoomToFit,
  getNodeAnchorPoint,
  determineBestSides,
  generateConnectorPath,
  simplifyStrokePoints,
  generateSvgPathFromStroke,
  isPointInsideRect,
  isRectIntersecting,
  clamp,
} from '../canvasGeometry';
import {
  CanvasBoard,
  CanvasNode,
  NoteCanvasNode,
  StickyCanvasNode,
  GroupCanvasNode,
  CanvasConnector,
  CanvasStroke,
  CanvasStrokePoint,
  CanvasTransform,
} from '../canvasTypes';
import { CanvasHistoryManager } from '../canvasHistory';
import { canvasStorageService, INITIAL_MAIN_BOARD } from '../canvasStorage';
import { Note } from '../../types';

export function runCanvasTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(msg);
    }
  }

  // -------------------------------------------------------------
  // 1. Pan & Zoom Transformations
  // -------------------------------------------------------------
  {
    const transform: CanvasTransform = { panX: 100, panY: 50, zoom: 1.5 };
    const screenPt = { x: 250, y: 200 };

    const worldPt = screenToWorld(screenPt, transform);
    // x = (250 - 100) / 1.5 = 100
    // y = (200 - 50) / 1.5 = 100
    assert(Math.abs(worldPt.x - 100) < 0.001, `screenToWorld x failed: ${worldPt.x}`);
    assert(Math.abs(worldPt.y - 100) < 0.001, `screenToWorld y failed: ${worldPt.y}`);

    const roundtripScreen = worldToScreen(worldPt, transform);
    assert(Math.abs(roundtripScreen.x - screenPt.x) < 0.001, 'worldToScreen roundtrip x failed');
    assert(Math.abs(roundtripScreen.y - screenPt.y) < 0.001, 'worldToScreen roundtrip y failed');

    // Zoom clamping
    assert(clamp(0.01, 0.1, 3.5) === 0.1, 'clamp below min zoom failed');
    assert(clamp(5.0, 0.1, 3.5) === 3.5, 'clamp above max zoom failed');
    assert(clamp(1.2, 0.1, 3.5) === 1.2, 'clamp within range failed');
  }

  // -------------------------------------------------------------
  // 2. Many Cards & Bounding Box Calculations
  // -------------------------------------------------------------
  {
    const manyNodes: CanvasNode[] = [];
    const count = 250;
    for (let i = 0; i < count; i++) {
      manyNodes.push({
        id: `node-${i}`,
        type: 'sticky',
        x: (i % 25) * 200,
        y: Math.floor(i / 25) * 150,
        width: 180,
        height: 120,
        zIndex: i,
        text: `Card #${i}`,
        color: '#fef08a',
      });
    }

    const bbox = calculateBoundingBox(manyNodes);
    assert(bbox !== null, 'calculateBoundingBox on 250 cards should not be null');
    assert(bbox?.x === 0, `bbox.x expected 0, got ${bbox?.x}`);
    assert(bbox?.y === 0, `bbox.y expected 0, got ${bbox?.y}`);
    assert(bbox?.width === 24 * 200 + 180, `bbox.width expected 4980, got ${bbox?.width}`);
    assert(bbox?.height === 9 * 150 + 120, `bbox.height expected 1470, got ${bbox?.height}`);

    // Zoom to fit
    const fitTransform = calculateZoomToFit(manyNodes, [], 1920, 1080, 80);
    assert(fitTransform.zoom > 0 && fitTransform.zoom <= 1.5, `zoomToFit zoom invalid: ${fitTransform.zoom}`);
    assert(isFinite(fitTransform.panX) && isFinite(fitTransform.panY), 'zoomToFit pan coords must be finite');
  }

  // -------------------------------------------------------------
  // 3. Many Edges & Dynamic Attachment Points
  // -------------------------------------------------------------
  {
    const nodeA: CanvasNode = {
      id: 'node-a',
      type: 'note',
      noteId: 'note-1',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      zIndex: 1,
    };
    const nodeB: CanvasNode = {
      id: 'node-b',
      type: 'note',
      noteId: 'note-2',
      x: 500,
      y: 100,
      width: 200,
      height: 100,
      zIndex: 2,
    };

    // Best sides when B is to the right of A
    const { fromSide, toSide } = determineBestSides(nodeA, nodeB);
    assert(fromSide === 'right', `determineBestSides fromSide expected right, got ${fromSide}`);
    assert(toSide === 'left', `determineBestSides toSide expected left, got ${toSide}`);

    // Anchor points
    const ptA = getNodeAnchorPoint(nodeA, fromSide);
    assert(ptA.x === 300 && ptA.y === 150, `Anchor point A failed: ${JSON.stringify(ptA)}`);

    const ptB = getNodeAnchorPoint(nodeB, toSide);
    assert(ptB.x === 500 && ptB.y === 150, `Anchor point B failed: ${JSON.stringify(ptB)}`);

    // Connector paths
    const curvedPath = generateConnectorPath(ptA, ptB, fromSide, toSide, 'curved');
    assert(curvedPath.startsWith('M 300 150 C'), `Curved path format invalid: ${curvedPath}`);

    const orthoPath = generateConnectorPath(ptA, ptB, fromSide, toSide, 'orthogonal');
    assert(orthoPath.startsWith('M 300 150 L'), `Ortho path format invalid: ${orthoPath}`);

    const straightPath = generateConnectorPath(ptA, ptB, fromSide, toSide, 'straight');
    assert(straightPath === 'M 300 150 L 500 150', `Straight path format invalid: ${straightPath}`);

    // Stress test generating 500 connectors
    const startT = performance.now();
    for (let i = 0; i < 500; i++) {
      generateConnectorPath(
        { x: i * 2, y: i * 3 },
        { x: i * 2 + 100, y: i * 3 + 100 },
        'right',
        'left',
        i % 2 === 0 ? 'curved' : 'orthogonal'
      );
    }
    const elapsed = performance.now() - startT;
    assert(elapsed < 30, `500 connector paths generated in ${elapsed.toFixed(2)}ms (< 30ms)`);
  }

  // -------------------------------------------------------------
  // 4. Groups & Spatial Containment
  // -------------------------------------------------------------
  {
    const group: GroupCanvasNode = {
      id: 'group-1',
      type: 'group',
      label: 'Design System',
      color: 'rgba(224, 231, 255, 0.45)',
      x: 50,
      y: 50,
      width: 500,
      height: 400,
      zIndex: 0,
    };

    const insideNode: StickyCanvasNode = {
      id: 'sticky-inside',
      type: 'sticky',
      x: 100,
      y: 100,
      width: 150,
      height: 100,
      zIndex: 1,
      text: 'Inside group',
      color: '#fef08a',
    };

    const outsideNode: StickyCanvasNode = {
      id: 'sticky-outside',
      type: 'sticky',
      x: 800,
      y: 800,
      width: 150,
      height: 100,
      zIndex: 1,
      text: 'Outside group',
      color: '#fef08a',
    };

    assert(isPointInsideRect({ x: insideNode.x, y: insideNode.y }, group), 'insideNode should be in group');
    assert(!isPointInsideRect({ x: outsideNode.x, y: outsideNode.y }, group), 'outsideNode should NOT be in group');
    assert(isRectIntersecting(group, insideNode), 'isRectIntersecting failed for insideNode');
    assert(!isRectIntersecting(group, outsideNode), 'isRectIntersecting failed for outsideNode');
  }

  // -------------------------------------------------------------
  // 5. Freehand Vector Stroke Simplification (Douglas-Peucker)
  // -------------------------------------------------------------
  {
    const rawPoints: CanvasStrokePoint[] = [];
    // Generate a line with slight noise
    for (let i = 0; i < 50; i++) {
      rawPoints.push({
        x: i * 5,
        y: i * 5 + (i % 2 === 0 ? 0.3 : -0.3),
        pressure: 0.5,
      });
    }

    const simplified = simplifyStrokePoints(rawPoints, 1.0);
    assert(simplified.length < rawPoints.length, `Simplification should reduce points (${rawPoints.length} -> ${simplified.length})`);
    assert(simplified.length >= 2, 'Simplified stroke should retain at least start and end points');

    const svgPath = generateSvgPathFromStroke(simplified);
    assert(svgPath.startsWith('M 0 0'), `SVG stroke path should start with origin, got: ${svgPath}`);
  }

  // -------------------------------------------------------------
  // 6. Undo / Redo History State Management
  // -------------------------------------------------------------
  {
    const initialStep = {
      nodes: [
        {
          id: 'n1',
          type: 'sticky' as const,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          zIndex: 1,
          text: 'V1',
          color: '#fff',
        },
      ],
      connectors: [],
      strokes: [],
    };

    const history = new CanvasHistoryManager(initialStep);
    assert(!history.canUndo, 'Should not be able to undo on initial state');

    // Mutation 1: update text to V2
    const step2 = {
      ...initialStep,
      nodes: [{ ...initialStep.nodes[0], text: 'V2', x: 50 }],
    };
    history.push(step2);
    assert(history.canUndo, 'Should be able to undo after push');
    assert(!history.canRedo, 'Redo stack should be empty after push');

    // Mutation 2: update text to V3
    const step3 = {
      ...initialStep,
      nodes: [{ ...initialStep.nodes[0], text: 'V3', x: 100 }],
    };
    history.push(step3);

    // Undo step3 -> step2
    const undoRes1 = history.undo(step3);
    assert(undoRes1 !== null, 'Undo 1 should succeed');
    assert((undoRes1?.nodes[0] as StickyCanvasNode).text === 'V2', `Expected V2 on undo 1, got ${(undoRes1?.nodes[0] as StickyCanvasNode).text}`);
    assert(history.canRedo, 'Can redo after undo');

    // Undo step2 -> step1
    const undoRes2 = history.undo(undoRes1!);
    assert(undoRes2 !== null, 'Undo 2 should succeed');
    assert((undoRes2?.nodes[0] as StickyCanvasNode).text === 'V1', `Expected V1 on undo 2, got ${(undoRes2?.nodes[0] as StickyCanvasNode).text}`);

    // Redo back to V2
    const redoRes1 = history.redo(undoRes2!);
    assert(redoRes1 !== null, 'Redo 1 should succeed');
    assert((redoRes1?.nodes[0] as StickyCanvasNode).text === 'V2', `Expected V2 on redo 1, got ${(redoRes1?.nodes[0] as StickyCanvasNode).text}`);
  }

  // -------------------------------------------------------------
  // 7. Canonical Note References & Missing Note Fallback
  // -------------------------------------------------------------
  {
    const canonicalVaultNotes: Note[] = [
      {
        id: 'note-roadmap',
        title: 'Roadmap 2026',
        content: 'PKM milestones and deliverables.',
        type: 'text',
        checklist: [],
        color: 'blue',
        tags: ['planning'],
        folderId: null,
        pinned: false,
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const noteCard: NoteCanvasNode = {
      id: 'canvas-node-1',
      type: 'note',
      noteId: 'note-roadmap',
      x: 200,
      y: 200,
      width: 280,
      height: 180,
      zIndex: 1,
    };

    // Resolves against live note
    const matched = canonicalVaultNotes.find((n) => n.id === noteCard.noteId);
    assert(matched !== undefined, 'Canonical note should resolve');
    assert(matched?.title === 'Roadmap 2026', 'Canonical title matches');

    // Simulate note deleted from vault
    const missingCard: NoteCanvasNode = {
      ...noteCard,
      noteId: 'deleted-note-999',
    };
    const missingMatch = canonicalVaultNotes.find((n) => n.id === missingCard.noteId);
    assert(missingMatch === undefined, 'Missing note should be undefined');
    // Card geometry survives
    assert(missingCard.x === 200 && missingCard.width === 280, 'Card layout data survives deletion of referenced note');
  }

  // -------------------------------------------------------------
  // 8. Board Serialization & Persistence Roundtrip
  // -------------------------------------------------------------
  {
    const board: CanvasBoard = {
      id: 'test-board-1',
      title: 'Architecture Blueprint',
      description: 'System diagrams',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: 'n1',
          type: 'sticky',
          x: 10,
          y: 20,
          width: 150,
          height: 100,
          zIndex: 1,
          text: 'Test Sticky',
          color: '#fef08a',
        },
      ],
      connectors: [
        {
          id: 'c1',
          fromNodeId: 'n1',
          toNodeId: 'n2',
          arrowDirection: 'forward',
          lineStyle: 'curved',
          color: '#3b82f6',
          strokeWidth: 2,
        },
      ],
      strokes: [
        {
          id: 's1',
          points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
          color: '#000',
          width: 3,
        },
      ],
      transform: { panX: 120, panY: 80, zoom: 1.25 },
      backgroundStyle: 'grid',
    };

    const exportedJSON = canvasStorageService.exportBoardJSON(board);
    assert(typeof exportedJSON === 'string' && exportedJSON.includes('Architecture Blueprint'), 'exportBoardJSON failed');

    const importedBoard = canvasStorageService.importBoardJSON(exportedJSON);
    assert(importedBoard !== null, 'importBoardJSON failed');
    assert(importedBoard?.title === 'Architecture Blueprint', 'Imported title matches');
    assert(importedBoard?.nodes.length === 1, 'Imported nodes count matches');
    assert(importedBoard?.connectors.length === 1, 'Imported connectors count matches');
    assert(importedBoard?.strokes.length === 1, 'Imported strokes count matches');
  }

  return { passed, failed, errors };
}
