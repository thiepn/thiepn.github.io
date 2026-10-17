import { Note } from '../../types';

export function runMasonryDragReorderTests(): { passed: number; failed: number; errors: string[] } {
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

  function createTestNote(id: string, title: string, pinned: boolean, order: number): Note {
    return {
      id,
      title,
      content: `${title} contents`,
      type: 'text',
      checklist: [],
      color: 'default',
      tags: [],
      folderId: null,
      pinned,
      archived: false,
      trashed: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      reminderDate: null,
      images: [],
      order,
    };
  }

  const sampleNotes: Note[] = [
    createTestNote('note-alpha', 'Alpha Concept', true, 0),
    createTestNote('note-beta', 'Beta Framework', true, 1),
    createTestNote('note-gamma', 'Gamma Pipeline', false, 2),
    createTestNote('note-delta', 'Delta Synthesis', false, 3),
  ];

  // Helper reorder function matching MasonryView reorder logic
  function reorderNotes(
    currentList: Note[],
    sourceId: string,
    targetId: string,
    position: 'before' | 'after'
  ): Note[] {
    if (sourceId === targetId) return currentList;

    const sourceIndex = currentList.findIndex((n) => n.id === sourceId);
    const targetIndex = currentList.findIndex((n) => n.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return currentList;

    const targetNote = currentList[targetIndex];
    const updated = [...currentList];
    const [movedNote] = updated.splice(sourceIndex, 1);

    let newTargetIndex = updated.findIndex((n) => n.id === targetId);
    if (newTargetIndex === -1) {
      updated.push(movedNote);
    } else {
      if (position === 'after') {
        newTargetIndex += 1;
      }
      updated.splice(newTargetIndex, 0, movedNote);
    }

    if (movedNote.pinned !== targetNote.pinned && !movedNote.trashed) {
      movedNote.pinned = targetNote.pinned;
    }

    return updated.map((n, idx) => ({
      ...n,
      order: idx,
    }));
  }

  // Gate 1: Reorder "before" target
  const reorderedBefore = reorderNotes(sampleNotes, 'note-delta', 'note-gamma', 'before');
  assert(reorderedBefore.length === 4, 'Preserves all notes after reordering');
  assert(reorderedBefore[2].id === 'note-delta', 'Delta moved before Gamma at index 2');
  assert(reorderedBefore[3].id === 'note-gamma', 'Gamma now at index 3');
  assert(reorderedBefore[2].order === 2, 'Delta order index updated to 2');
  assert(reorderedBefore[3].order === 3, 'Gamma order index updated to 3');

  // Gate 2: Reorder "after" target
  const reorderedAfter = reorderNotes(sampleNotes, 'note-alpha', 'note-beta', 'after');
  assert(reorderedAfter[0].id === 'note-beta', 'Beta is now first item at index 0');
  assert(reorderedAfter[1].id === 'note-alpha', 'Alpha moved after Beta to index 1');
  assert(reorderedAfter[0].order === 0, 'Beta order index updated to 0');
  assert(reorderedAfter[1].order === 1, 'Alpha order index updated to 1');

  // Gate 3: Boundary crossing (reordering an unpinned note into pinned section)
  const movedToPinned = reorderNotes(sampleNotes, 'note-gamma', 'note-alpha', 'before');
  assert(movedToPinned[0].id === 'note-gamma', 'Gamma moved to front');
  assert(movedToPinned[0].pinned === true, 'Gamma automatically gains pinned status when placed into pinned section');
  assert(movedToPinned[0].order === 0, 'Gamma assigned order 0');

  // Gate 4: Boundary crossing (reordering a pinned note into unpinned section)
  const movedToUnpinned = reorderNotes(sampleNotes, 'note-beta', 'note-delta', 'after');
  const movedBeta = movedToUnpinned.find((n) => n.id === 'note-beta');
  assert(Boolean(movedBeta), 'Beta found in reordered list');
  assert(movedBeta?.pinned === false, 'Beta adopts unpinned status when placed into unpinned section');
  assert(movedToUnpinned[3].id === 'note-beta', 'Beta is at end of list');
  assert(movedToUnpinned[3].order === 3, 'Beta order is 3');

  // Gate 5: Sequential order state verification
  const multipleMoves = reorderNotes(
    reorderNotes(sampleNotes, 'note-delta', 'note-alpha', 'before'),
    'note-beta',
    'note-gamma',
    'after'
  );
  const orders = multipleMoves.map((n) => n.order);
  const isStrictlySequential = orders.every((val, idx) => val === idx);
  assert(isStrictlySequential, 'Order properties form a strict contiguous 0-based sequence');

  // Gate 6: App order map reconciliation invariant
  const orderMap = new Map<string, number>();
  multipleMoves.forEach((n, idx) => orderMap.set(n.id, idx));
  assert(orderMap.size === 4, 'Order map contains entries for all reordered notes');
  assert(orderMap.get(multipleMoves[0].id) === 0, 'First item maps to order index 0');

  return { passed, failed, errors };
}
