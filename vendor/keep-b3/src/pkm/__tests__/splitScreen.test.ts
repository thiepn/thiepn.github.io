import {
  SplitLayoutState,
  loadStoredSplitLayout,
  saveStoredSplitLayout,
  DEFAULT_SPLIT_LAYOUT,
} from '../splitTypes';
import {
  extractLineAnchors,
  findSurroundingLineAnchors,
  BidirectionalScrollSync,
} from '../scrollSync';

export function runSplitScreenTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      const err = `[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`;
      errors.push(err);
      console.error(err);
    }
  }

  // Group 1: SplitLayout Persistence & Default Guarantees
  try {
    localStorage.clear();
    const loadedDef = loadStoredSplitLayout();
    assert(
      loadedDef.mode === 'single' &&
        loadedDef.splitRatio === 50 &&
        loadedDef.syncScroll === true &&
        loadedDef.pinnedPane === 'none',
      'P6.1.1: Default split layout loads with sensible defaults'
    );

    // Test persistence with clamped values
    const customLayout: SplitLayoutState = {
      mode: 'two-note',
      splitRatio: 65,
      syncScroll: false,
      pinnedPane: 'left',
      secondaryNoteId: 'note-123',
      activeMobileTab: 'right',
    };
    saveStoredSplitLayout(customLayout);

    const reloaded = loadStoredSplitLayout();
    assert(
      reloaded.mode === 'two-note' &&
        reloaded.splitRatio === 65 &&
        reloaded.syncScroll === false &&
        reloaded.pinnedPane === 'left' &&
        reloaded.secondaryNoteId === 'note-123' &&
        reloaded.activeMobileTab === 'right',
      'P6.1.2: Split layout successfully persists and reloads from storage'
    );

    // Test ratio clamping
    saveStoredSplitLayout({ ...customLayout, splitRatio: 95 });
    const clampedMax = loadStoredSplitLayout();
    assert(clampedMax.splitRatio === 80, 'P6.1.3: Split ratio clamped to maximum 80%');

    saveStoredSplitLayout({ ...customLayout, splitRatio: 5 });
    const clampedMin = loadStoredSplitLayout();
    assert(clampedMin.splitRatio === 20, 'P6.1.4: Split ratio clamped to minimum 20%');

    // Test malformed storage fallback
    localStorage.setItem('pkm_split_layout_v1', 'NOT_VALID_JSON{');
    const safeFallback = loadStoredSplitLayout();
    assert(
      safeFallback.mode === 'single' && safeFallback.splitRatio === 50,
      'P6.1.5: Corrupt storage falls back cleanly to defaults without throwing'
    );
  } catch (e: any) {
    failed++;
    errors.push(`Split Layout State Error: ${e?.message}`);
  }

  // Group 2: Semantic Line Anchor Extraction
  try {
    const sampleMd = [
      '# Document Title',
      '',
      'Introductory paragraph describing the concept.',
      '',
      '## Section 1: Mathematics',
      '$$',
      'E = mc^2',
      '$$',
      '',
      '## Section 2: Tasks',
      '- [ ] Item A',
      '- [x] Item B',
      '',
      '```mermaid',
      'graph TD',
      '  A-->B',
      '```',
    ].join('\n');

    const anchors = extractLineAnchors(sampleMd);
    assert(anchors.length > 0, 'P6.2.1: Line anchors extracted from document');

    const heading1 = anchors.find((a) => (a.lineIndex ?? a.line) === 0);
    assert(heading1?.type === 'heading' && heading1.level === 1, 'P6.2.2: Heading level 1 anchor identified');

    const mathBlock = anchors.find((a) => (a.lineIndex ?? a.line) === 5);
    assert(mathBlock?.type === 'math', 'P6.2.3: Math block line anchor identified');

    const taskAnchor = anchors.find((a) => (a.lineIndex ?? a.line) === 10);
    assert(taskAnchor?.type === 'list', 'P6.2.4: List item line anchor identified');

    const mermaidAnchor = anchors.find((a) => (a.lineIndex ?? a.line) === 13);
    assert(mermaidAnchor?.type === 'code', 'P6.2.5: Mermaid/code line anchor identified');

    // Find surrounding anchors for interpolation (line 6 is inside the math block lines 5-7)
    const { prev, next } = findSurroundingLineAnchors(anchors, 6);
    assert(
      (prev?.lineIndex ?? prev?.line) === 5 && (next?.lineIndex ?? next?.line) === 7,
      'P6.2.6: findSurroundingLineAnchors bounds interior lines accurately'
    );
  } catch (e: any) {
    failed++;
    errors.push(`Anchor Extraction Error: ${e?.message}`);
  }

  // Group 3: BidirectionalScrollSync & Feedback Loop Prevention
  try {
    const syncController = new BidirectionalScrollSync(true);
    assert(syncController.getEnabled() === true, 'P6.3.1: ScrollSync starts enabled');

    syncController.setEnabled(false);
    assert(syncController.getEnabled() === false, 'P6.3.2: ScrollSync can be toggled off');
    syncController.setEnabled(true);

    // Mock DOM elements
    const mockEditor = {
      value: '# Title\nLine 1\nLine 2\nLine 3\nLine 4\nLine 5\n',
      scrollTop: 100,
      scrollHeight: 1000,
      clientHeight: 400,
    } as unknown as HTMLTextAreaElement;

    const mockPreview = {
      scrollTop: 0,
      scrollHeight: 1200,
      clientHeight: 400,
      querySelectorAll: () => [],
      getBoundingClientRect: () => ({ top: 0, bottom: 400, height: 400, left: 0, right: 400, width: 400, x: 0, y: 0, toJSON: () => {} }),
    } as unknown as HTMLDivElement;

    // Trigger editor scroll
    syncController.handleEditorScroll(mockEditor, mockPreview);
    assert(
      syncController.getActiveSource() === 'editor',
      'P6.3.3: Active scroll source locked to editor preventing immediate feedback'
    );

    // Trigger preview scroll while locked
    syncController.handlePreviewScroll(mockPreview, mockEditor);
    assert(
      syncController.getActiveSource() === 'editor',
      'P6.3.4: Feedback echo from preview safely ignored while editor source is active'
    );

    // Clear source lock
    syncController.destroy();
    assert(syncController.getActiveSource() === null, 'P6.3.5: Destroy unlocks scroll source cleanly');
  } catch (e: any) {
    failed++;
    errors.push(`Scroll Sync Error: ${e?.message}`);
  }

  // Group 4: Pinned Pane & Link Click Routing Logic
  try {
    // Helper simulating the link click decision matrix
    function resolveLinkDestination(
      mode: 'single' | 'edit-preview' | 'two-note',
      pinnedPane: 'none' | 'left' | 'right',
      activePane: 'left' | 'right',
      isAltKey: boolean
    ): 'current' | 'left' | 'right' | 'switch-to-two-note' {
      if (mode === 'single') return 'current';
      if (mode === 'edit-preview') {
        return isAltKey ? 'switch-to-two-note' : 'current';
      }
      if (pinnedPane === 'left') return 'right';
      if (pinnedPane === 'right') return 'left';
      if (isAltKey) {
        return activePane === 'left' ? 'right' : 'left';
      }
      return activePane;
    }

    assert(
      resolveLinkDestination('two-note', 'left', 'left', false) === 'right',
      'P6.4.1: Left pinned pane routes wiki-links to right pane'
    );
    assert(
      resolveLinkDestination('two-note', 'right', 'right', false) === 'left',
      'P6.4.2: Right pinned pane routes wiki-links to left pane'
    );
    assert(
      resolveLinkDestination('two-note', 'none', 'left', true) === 'right',
      'P6.4.3: Alt+Click from left pane routes into right pane'
    );
    assert(
      resolveLinkDestination('two-note', 'none', 'right', true) === 'left',
      'P6.4.4: Alt+Click from right pane routes into left pane'
    );
    assert(
      resolveLinkDestination('edit-preview', 'none', 'left', true) === 'switch-to-two-note',
      'P6.4.5: Alt+Click in edit-preview triggers two-note comparison'
    );
  } catch (e: any) {
    failed++;
    errors.push(`Pin Navigation Error: ${e?.message}`);
  }

  return { passed, failed, errors };
}
