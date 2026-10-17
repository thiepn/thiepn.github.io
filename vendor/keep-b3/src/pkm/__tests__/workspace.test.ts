import {
  createInitialLayout,
  openTab,
  closeTab,
  reopenClosedTab,
  activateTab,
  reorderTabs,
  moveTabToPane,
  togglePinTab,
  updateTabViewState,
  updateTabTitle,
  splitPane,
  closePane,
  swapPanes,
  focusPane,
  setSplitRatio,
  navigateBack,
  navigateForward,
  applyPreset,
  cleanDanglingReferences,
  saveStoredWorkspaceLayout,
  loadStoredWorkspaceLayout,
  WORKSPACE_PRESETS,
  WORKSPACE_STORAGE_KEY,
} from '../workspaceManager';
import { WorkspaceLayout, WorkspaceTab } from '../workspaceTypes';

export function runWorkspaceTests(): { passed: number; failed: number; errors: string[] } {
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

  try {
    localStorage.clear();
    let layout = createInitialLayout();

    // Group 1: Initial Layout & Default State
    assert(
      layout.panes.length === 1 &&
        layout.activePaneId === layout.panes[0].id &&
        layout.panes[0].tabs.length === 1 &&
        layout.panes[0].tabs[0].type === 'home' &&
        layout.panes[0].tabs[0].pinned === true &&
        layout.splitOrientation === 'horizontal' &&
        layout.splitRatio === 0.5 &&
        layout.history.length === 1 &&
        layout.historyIndex === 0,
      'P19.1.1: Creates valid default single-pane layout with home tab'
    );

    // Group 2: Tab Operations
    const l1 = openTab(layout, {
      type: 'note',
      resourceId: 'note-101',
      title: 'Project Roadmap',
    });
    assert(
      l1.panes[0].tabs.length === 2 &&
        l1.panes[0].activeTabId === l1.panes[0].tabs[1].id &&
        l1.panes[0].tabs[1].resourceId === 'note-101' &&
        l1.panes[0].tabs[1].title === 'Project Roadmap' &&
        l1.history.length === 2 &&
        l1.historyIndex === 1,
      'P19.2.1: Opens new note tab in active pane and activates it'
    );

    // Focusing existing tab
    const l2 = openTab(l1, {
      type: 'note',
      resourceId: 'note-101',
      title: 'Project Roadmap Updated',
    });
    assert(
      l2.panes[0].tabs.length === 2 &&
        l2.panes[0].activeTabId === l2.panes[0].tabs[1].id,
      'P19.2.2: Focuses existing tab instead of duplicate'
    );

    // Open in background
    const lBackground = openTab(
      layout,
      {
        type: 'note',
        resourceId: 'note-202',
        title: 'Background Reading',
      },
      { background: true }
    );
    assert(
      lBackground.panes[0].tabs.length === 2 &&
        lBackground.panes[0].activeTabId === lBackground.panes[0].tabs[0].id &&
        lBackground.panes[0].tabs[1].resourceId === 'note-202',
      'P19.2.3: Opens in background without stealing focus'
    );

    // Close tab and select neighboring
    const lMulti1 = openTab(layout, { type: 'note', resourceId: 'n1', title: 'Note 1' });
    const lMulti2 = openTab(lMulti1, { type: 'note', resourceId: 'n2', title: 'Note 2' });
    const tabToClose = lMulti2.panes[0].tabs[2];
    const lMulti3 = closeTab(lMulti2, lMulti2.panes[0].id, tabToClose.id);
    assert(
      lMulti3.panes[0].tabs.length === 2 &&
        lMulti3.panes[0].activeTabId === lMulti3.panes[0].tabs[1].id &&
        lMulti3.closedTabs.length === 1 &&
        lMulti3.closedTabs[0].id === tabToClose.id,
      'P19.2.4: Closes unpinned tab and selects neighboring tab'
    );

    // Pin protection
    const homeTab = layout.panes[0].tabs[0];
    const afterClose = closeTab(layout, layout.panes[0].id, homeTab.id);
    assert(
      afterClose.panes[0].tabs.length === 1,
      'P19.2.5: Pinned tab is protected from closure'
    );

    // Reopen closed tab
    const lReopened = reopenClosedTab(lMulti3);
    assert(
      lReopened.panes[0].tabs.length === 3 &&
        lReopened.closedTabs.length === 0,
      'P19.2.6: Reopens most recently closed tab with Ctrl+Shift+T semantics'
    );

    // Toggle Pin
    const pinToggled1 = togglePinTab(lMulti1, lMulti1.panes[0].id, lMulti1.panes[0].tabs[1].id);
    assert(
      pinToggled1.panes[0].tabs[1].pinned === true,
      'P19.2.7: Toggles pin state on'
    );
    const pinToggled2 = togglePinTab(pinToggled1, pinToggled1.panes[0].id, pinToggled1.panes[0].tabs[1].id);
    assert(
      pinToggled2.panes[0].tabs[1].pinned === false,
      'P19.2.8: Toggles pin state off'
    );

    // Reorder tabs
    let lReorder = openTab(layout, { type: 'note', resourceId: 'n1', title: 'Note 1' });
    lReorder = openTab(lReorder, { type: 'note', resourceId: 'n2', title: 'Note 2' });
    lReorder = openTab(lReorder, { type: 'note', resourceId: 'n3', title: 'Note 3' });
    const reordered = reorderTabs(lReorder, lReorder.panes[0].id, 1, 3);
    assert(
      reordered.panes[0].tabs[1].title === 'Note 2' &&
        reordered.panes[0].tabs[2].title === 'Note 3' &&
        reordered.panes[0].tabs[3].title === 'Note 1',
      'P19.2.9: Reorders tabs within a pane'
    );

    // Tab view state & title updates
    const lPdf = openTab(layout, { type: 'pdf', resourceId: 'pdf-1', title: 'Paper.pdf' });
    const pdfTabId = lPdf.panes[0].tabs[1].id;
    const lPdfUpdated = updateTabViewState(lPdf, pdfTabId, { activePage: 12, zoom: 1.5 });
    const pdfTab = lPdfUpdated.panes[0].tabs.find((t) => t.id === pdfTabId);
    assert(
      pdfTab?.viewState?.activePage === 12 && pdfTab?.viewState?.zoom === 1.5,
      'P19.2.10: Updates tab view state correctly'
    );

    const lRenamed = updateTabTitle(l1, 'note-101', 'note', 'New Renamed Title');
    const renamedTab = lRenamed.panes[0].tabs.find((t) => t.resourceId === 'note-101');
    assert(
      renamedTab?.title === 'New Renamed Title',
      'P19.2.11: Updates tab title dynamically'
    );

    // Group 3: Split Panes & Multi-Pane Layout
    const splitH = splitPane(layout, 'horizontal');
    assert(
      splitH.panes.length === 2 &&
        splitH.splitOrientation === 'horizontal' &&
        splitH.splitRatio === 0.5 &&
        splitH.activePaneId === splitH.panes[1].id,
      'P19.3.1: Splits workspace horizontally'
    );

    const splitV = splitPane(layout, 'vertical');
    assert(
      splitV.panes.length === 2 && splitV.splitOrientation === 'vertical',
      'P19.3.2: Splits workspace vertically'
    );

    const closedSplit = closePane(splitH, splitH.panes[1].id);
    assert(
      closedSplit.panes.length === 1 && closedSplit.activePaneId === closedSplit.panes[0].id,
      'P19.3.3: Closes split pane and merges remaining'
    );

    // Move tab between panes
    let lMove = openTab(layout, { type: 'note', resourceId: 'n1', title: 'Note 1' });
    lMove = splitPane(lMove, 'horizontal');
    const tabToMoveId = lMove.panes[0].tabs[1].id;
    const moved = moveTabToPane(lMove, lMove.panes[0].id, lMove.panes[1].id, tabToMoveId);
    assert(
      !moved.panes[0].tabs.some((t) => t.id === tabToMoveId) &&
        moved.panes[1].tabs.some((t) => t.id === tabToMoveId),
      'P19.3.4: Moves tab between panes'
    );

    // Swap panes
    const swapped = swapPanes(moved);
    assert(
      swapped.panes[0].id === moved.panes[1].id &&
        swapped.panes[1].id === moved.panes[0].id,
      'P19.3.5: Swaps panes cleanly'
    );

    // Split ratio clamping
    let lRatio = splitPane(layout, 'horizontal');
    lRatio = setSplitRatio(lRatio, 0.65);
    assert(lRatio.splitRatio === 0.65, 'P19.3.6: Sets split ratio');
    lRatio = setSplitRatio(lRatio, 0.95);
    assert(lRatio.splitRatio === 0.8, 'P19.3.7: Clamps high split ratio');
    lRatio = setSplitRatio(lRatio, 0.05);
    assert(lRatio.splitRatio === 0.2, 'P19.3.8: Clamps low split ratio');

    // Group 4: Navigation History
    let lHist = openTab(layout, { type: 'note', resourceId: 'n1', title: 'Note 1' });
    lHist = openTab(lHist, { type: 'note', resourceId: 'n2', title: 'Note 2' });
    const back1 = navigateBack(lHist);
    assert(
      back1.historyIndex === 1 &&
        back1.panes[0].activeTabId === lHist.panes[0].tabs[1].id,
      'P19.4.1: Navigates back in history'
    );
    const forward1 = navigateForward(back1);
    assert(
      forward1.historyIndex === 2 &&
        forward1.panes[0].activeTabId === lHist.panes[0].tabs[2].id,
      'P19.4.2: Navigates forward in history'
    );

    // Group 5: Workspace Presets
    const researchPreset = applyPreset(layout, 'research');
    assert(
      researchPreset.panes.length === 2 &&
        researchPreset.panes[0].tabs[0].type === 'note' &&
        researchPreset.panes[1].tabs[0].type === 'pdf',
      'P19.5.1: Applies research preset (Note + PDF)'
    );

    const spatialPreset = applyPreset(layout, 'spatial');
    assert(
      spatialPreset.panes.length === 2 &&
        spatialPreset.panes[0].tabs[0].type === 'note' &&
        spatialPreset.panes[1].tabs[0].type === 'canvas',
      'P19.5.2: Applies spatial preset (Note + Canvas)'
    );

    // Group 6: Dangling reference cleanup & localStorage persistence
    let lDangling = openTab(layout, { type: 'note', resourceId: 'existing-1', title: 'Note 1' });
    lDangling = openTab(lDangling, { type: 'note', resourceId: 'deleted-99', title: 'Deleted Note' });
    const cleaned = cleanDanglingReferences(lDangling, new Set(['existing-1']), new Set());
    assert(
      cleaned.panes[0].tabs.length === 2 &&
        !cleaned.panes[0].tabs.some((t) => t.resourceId === 'deleted-99'),
      'P19.6.1: Cleans dangling references to deleted notes'
    );

    saveStoredWorkspaceLayout(lRatio);
    const loaded = loadStoredWorkspaceLayout();
    assert(
      loaded.panes.length === 2,
      'P19.6.2: Persists and recovers workspace layout safely'
    );

    localStorage.setItem(WORKSPACE_STORAGE_KEY, 'INVALID_JSON_CORRUPTED');
    const fallback = loadStoredWorkspaceLayout();
    assert(
      fallback.panes.length === 1 && fallback.panes[0].tabs[0].type === 'home',
      'P19.6.3: Recovers gracefully from malformed localStorage'
    );
  } catch (err: any) {
    failed++;
    const message = `[FAIL] Workspace tests crashed: ${err.message || err}`;
    errors.push(message);
    console.error(message, err);
  }

  return { passed, failed, errors };
}
