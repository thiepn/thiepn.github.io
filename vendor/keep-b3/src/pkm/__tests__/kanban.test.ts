import { Note, Folder } from '../../types';
import {
  KanbanBoardDef,
  KanbanColumnDef,
  UNASSIGNED_COLUMN_ID,
  DEFAULT_KANBAN_BOARDS,
} from '../kanbanTypes';
import {
  resolveBoardColumns,
  getNoteColumnAssignment,
  moveNoteInBoard,
  getOrderedNotesForColumn,
  updateBoardCustomOrder,
  filterBoardNotes,
  extractCardChecklistStats,
} from '../kanban';

export function runKanbanTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      const msg = `FAIL: ${testName}${details ? ` -> ${details}` : ''}`;
      errors.push(msg);
      console.error(`  ✕ ${msg}`);
    }
  }

  // --- Test Suite 1: Column Resolution & Assignment ---
  {
    const tagBoard = DEFAULT_KANBAN_BOARDS.find((b) => b.id === 'board-task-pipeline')!;
    const cols = resolveBoardColumns(tagBoard, []);

    assert(cols.length === 3, 'Tag board resolves 3 defined columns', `got ${cols.length}`);

    const noteTodo: Note = {
      id: 'n1',
      title: 'Fix bug',
      content: 'Needs attention #todo soon',
      type: 'text',
      checklist: [],
      tags: ['work', 'todo', 'urgent-bug'],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      reminderDate: null,
      images: [],
    };

    const colId = getNoteColumnAssignment(noteTodo, tagBoard, cols);
    assert(colId === 'col-todo', 'Note with #todo matches col-todo', `got ${colId}`);

    const noteUnmatched: Note = {
      ...noteTodo,
      tags: ['personal', 'ideas'],
    };
    const unassignedColId = getNoteColumnAssignment(noteUnmatched, tagBoard, cols);
    assert(
      unassignedColId === UNASSIGNED_COLUMN_ID,
      'Note without pipeline tag matches unassigned column',
      `got ${unassignedColId}`
    );
  }

  // --- Test Suite 2: Tag Pipeline Movement & Unrelated Tag Preservation ---
  {
    const tagBoard = DEFAULT_KANBAN_BOARDS.find((b) => b.id === 'board-task-pipeline')!;
    const cols = resolveBoardColumns(tagBoard, []);

    const originalNote: Note = {
      id: 'n2',
      title: 'Implement PKM Phase',
      content: 'Detailed description #todo with extra info #release-v1',
      type: 'text',
      checklist: [],
      tags: ['engineering', 'todo', 'quarter-1'],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      reminderDate: null,
      images: [],
    };

    // Move from To Do -> In Progress ('doing')
    const movedToDoing = moveNoteInBoard(originalNote, tagBoard, 'col-doing', cols);

    assert(
      movedToDoing.tags.includes('doing'),
      'Moved note includes new pipeline tag "doing"',
      `tags: ${JSON.stringify(movedToDoing.tags)}`
    );
    assert(
      !movedToDoing.tags.includes('todo'),
      'Moved note no longer includes old pipeline tag "todo"',
      `tags: ${JSON.stringify(movedToDoing.tags)}`
    );
    assert(
      movedToDoing.tags.includes('engineering') && movedToDoing.tags.includes('quarter-1'),
      'Preserves unrelated tags ("engineering", "quarter-1")',
      `tags: ${JSON.stringify(movedToDoing.tags)}`
    );
    assert(
      movedToDoing.content.includes('#doing') && !movedToDoing.content.includes('#todo'),
      'Syncs inline markdown hashtag (#todo -> #doing)',
      `content: ${movedToDoing.content}`
    );

    // Move to Unassigned
    const movedToUnassigned = moveNoteInBoard(movedToDoing, tagBoard, UNASSIGNED_COLUMN_ID, cols);
    assert(
      !movedToUnassigned.tags.includes('doing') && !movedToUnassigned.tags.includes('todo'),
      'Moved to unassigned strips pipeline tag completely',
      `tags: ${JSON.stringify(movedToUnassigned.tags)}`
    );
    assert(
      movedToUnassigned.tags.includes('engineering'),
      'Preserves unrelated tags when moved to unassigned',
      `tags: ${JSON.stringify(movedToUnassigned.tags)}`
    );
  }

  // --- Test Suite 3: Folder Board Dynamic Columns & Movement ---
  {
    const mockFolders: Folder[] = [
      { id: 'f-work', name: 'Work Projects', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'f-personal', name: 'Personal', createdAt: '2026-01-01T00:00:00Z' },
    ];

    const folderBoard = DEFAULT_KANBAN_BOARDS.find((b) => b.id === 'board-folders-workflow')!;
    const resolvedFolderCols = resolveBoardColumns(folderBoard, mockFolders);

    assert(
      resolvedFolderCols.length === 2,
      'Folder board dynamically creates columns for user folders',
      `got ${resolvedFolderCols.length}`
    );
    assert(
      resolvedFolderCols[0].title === 'Work Projects' && resolvedFolderCols[0].value === 'f-work',
      'First folder column binds correctly to f-work'
    );

    const folderNote: Note = {
      id: 'n3',
      title: 'Design Spec',
      content: '',
      type: 'text',
      checklist: [],
      tags: [],
      color: 'default',
      folderId: 'f-work',
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      reminderDate: null,
      images: [],
    };

    const assignedCol = getNoteColumnAssignment(folderNote, folderBoard, resolvedFolderCols);
    assert(assignedCol === resolvedFolderCols[0].id, 'Folder note assigns to f-work column');

    // Move to f-personal column
    const movedToPersonal = moveNoteInBoard(
      folderNote,
      folderBoard,
      resolvedFolderCols[1].id,
      resolvedFolderCols
    );
    assert(
      movedToPersonal.folderId === 'f-personal',
      'Moving across folder columns updates canonical folderId to "f-personal"',
      `folderId: ${movedToPersonal.folderId}`
    );

    // Move to unassigned
    const movedToNoFolder = moveNoteInBoard(
      movedToPersonal,
      folderBoard,
      UNASSIGNED_COLUMN_ID,
      resolvedFolderCols
    );
    assert(
      movedToNoFolder.folderId === null,
      'Moving to unassigned clears canonical folderId (sets null)',
      `folderId: ${movedToNoFolder.folderId}`
    );
  }

  // --- Test Suite 4: Priority & Status Metadata Boards ---
  {
    const priorityBoard = DEFAULT_KANBAN_BOARDS.find((b) => b.id === 'board-priority-matrix')!;
    const pCols = resolveBoardColumns(priorityBoard, []);

    const sampleNote: Note = {
      id: 'n4',
      title: 'Critical Server Patch',
      content: 'Urgent security fix',
      type: 'text',
      checklist: [],
      tags: [],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      priority: 'urgent',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      reminderDate: null,
      images: [],
    };

    assert(
      getNoteColumnAssignment(sampleNote, priorityBoard, pCols) === 'col-urgent',
      'Assigns note with priority "urgent" to col-urgent'
    );

    // Move to col-low
    const movedToLow = moveNoteInBoard(sampleNote, priorityBoard, 'col-low', pCols);
    assert(
      movedToLow.priority === 'low',
      'Moving to col-low updates canonical note.priority to "low"',
      `priority: ${movedToLow.priority}`
    );

    // Status Board
    const statusBoard = DEFAULT_KANBAN_BOARDS.find((b) => b.id === 'board-status-flow')!;
    const sCols = resolveBoardColumns(statusBoard, []);

    const statusNote: Note = {
      ...sampleNote,
      status: 'in_progress',
    };
    assert(
      getNoteColumnAssignment(statusNote, statusBoard, sCols) === 'col-status-progress',
      'Assigns note with status "in_progress" to col-status-progress'
    );

    const movedToReview = moveNoteInBoard(statusNote, statusBoard, 'col-status-review', sCols);
    assert(
      movedToReview.status === 'review',
      'Moving to review column updates note.status to "review"',
      `status: ${movedToReview.status}`
    );
  }

  // --- Test Suite 5: Custom Ordering & Sorting ---
  {
    const board: KanbanBoardDef = {
      id: 'test-board',
      name: 'Test Board',
      sourceType: 'tag',
      columns: [{ id: 'col-1', title: 'Col 1', value: 'col1' }],
      includeUnassigned: true,
      customOrder: {
        'col-1': ['note-c', 'note-a', 'note-b'],
      },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const notesInCol: Note[] = [
      { id: 'note-a', title: 'A', content: '', type: 'text', checklist: [], tags: [], color: 'default', folderId: null, pinned: false, archived: false, trashed: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', reminderDate: null, images: [] },
      { id: 'note-b', title: 'B', content: '', type: 'text', checklist: [], tags: [], color: 'default', folderId: null, pinned: false, archived: false, trashed: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', reminderDate: null, images: [] },
      { id: 'note-c', title: 'C', content: '', type: 'text', checklist: [], tags: [], color: 'default', folderId: null, pinned: false, archived: false, trashed: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', reminderDate: null, images: [] },
    ];

    const ordered = getOrderedNotesForColumn(notesInCol, 'col-1', board.customOrder);
    assert(
      ordered[0].id === 'note-c' && ordered[1].id === 'note-a' && ordered[2].id === 'note-b',
      'Orders cards strictly according to customOrder (C -> A -> B)',
      `order: ${ordered.map((n) => n.id).join(', ')}`
    );

    // Move 'note-b' to top (index 0)
    const updatedBoard = updateBoardCustomOrder(board, 'note-b', 'col-1', 0, board.columns);
    const newOrdered = getOrderedNotesForColumn(notesInCol, 'col-1', updatedBoard.customOrder);
    assert(
      newOrdered[0].id === 'note-b' && newOrdered[1].id === 'note-c' && newOrdered[2].id === 'note-a',
      'Reordering updates column customOrder to B -> C -> A',
      `new order: ${newOrdered.map((n) => n.id).join(', ')}`
    );
  }

  // --- Test Suite 6: Checklist Stats Extraction ---
  {
    const checklistNote: Note = {
      id: 'chk-1',
      title: 'Shopping',
      content: '',
      type: 'checklist',
      checklist: [
        { id: '1', text: 'Apples', completed: true },
        { id: '2', text: 'Bread', completed: false },
        { id: '3', text: 'Milk', completed: true },
        { id: '4', text: 'Cheese', completed: false },
      ],
      tags: [],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      reminderDate: null,
      images: [],
    };

    const stats = extractCardChecklistStats(checklistNote);
    assert(
      stats !== null && stats.total === 4 && stats.completed === 2 && stats.percent === 50,
      'Correctly extracts checklist type stats (2/4, 50%)',
      `stats: ${JSON.stringify(stats)}`
    );

    // Markdown tasks
    const mdNote: Note = {
      id: 'md-1',
      title: 'Markdown Tasks',
      content: '# Sprint\n- [x] Write code\n- [ ] Review PR\n- [x] Run tests\n- [x] Deploy',
      type: 'text',
      checklist: [],
      tags: [],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      reminderDate: null,
      images: [],
    };

    const mdStats = extractCardChecklistStats(mdNote);
    assert(
      mdStats !== null && mdStats.total === 4 && mdStats.completed === 3 && mdStats.percent === 75,
      'Correctly parses markdown task lists (- [x] / - [ ]) (3/4, 75%)',
      `mdStats: ${JSON.stringify(mdStats)}`
    );
  }

  // --- Test Suite 7: Board Filtering & Search ---
  {
    const notesPool: Note[] = [
      { id: 'p1', title: 'React Hooks Guide', content: 'Use useEffect wisely', tags: ['frontend', 'react'], type: 'text', checklist: [], color: 'default', folderId: 'f1', pinned: false, archived: false, trashed: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', reminderDate: null, images: [] },
      { id: 'p2', title: 'Serverless Deployments', content: 'Edge computing notes', tags: ['backend', 'cloud'], type: 'text', checklist: [], color: 'default', folderId: 'f2', pinned: false, archived: true, trashed: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', reminderDate: null, images: [] },
      { id: 'p3', title: 'Old Deleted Draft', content: 'Deleted note', tags: [], type: 'text', checklist: [], color: 'default', folderId: null, pinned: false, archived: false, trashed: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', reminderDate: null, images: [] },
    ];

    // Filter by text search
    const searchRes = filterBoardNotes(notesPool, { includeArchived: false }, 'React');
    assert(searchRes.length === 1 && searchRes[0].id === 'p1', 'Search filters by title matching "React"');

    // Filter archived exclusion by default
    const unarchivedRes = filterBoardNotes(notesPool, { includeArchived: false }, '');
    assert(unarchivedRes.length === 1 && unarchivedRes[0].id === 'p1', 'Excludes archived and trashed notes by default');

    // Include archived
    const withArchivedRes = filterBoardNotes(notesPool, { includeArchived: true }, '');
    assert(withArchivedRes.length === 2, 'Includes archived notes when flag is enabled (never trashed)');
  }

  return { passed, failed, errors };
}
