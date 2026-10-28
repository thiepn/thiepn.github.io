import { Note, Folder } from '../../types';
import { PKMTask, TaskFilterState, TaskGroup } from './taskTypes';
import { extractTasksFromNote } from './taskParser';

/**
 * Extracts and compiles all tasks across an array of notes
 */
export function buildVaultTasks(notes: Note[], folders: Folder[] = []): {
  allTasks: PKMTask[];
  tasksByNote: Record<string, PKMTask[]>;
  openCount: number;
  completedCount: number;
} {
  const folderMap = new Map<string, Folder>(folders.map((f) => [f.id, f]));
  const allTasks: PKMTask[] = [];
  const tasksByNote: Record<string, PKMTask[]> = {};
  let openCount = 0;
  let completedCount = 0;

  for (const note of notes) {
    if (!note || note.trashed) continue;
    const noteTasks = extractTasksFromNote(note);

    // Attach folder name if folderId exists
    for (const task of noteTasks) {
      if (task.folderId && folderMap.has(task.folderId)) {
        task.folderName = folderMap.get(task.folderId)!.name;
      }
      if (task.completed) completedCount++;
      else openCount++;
      allTasks.push(task);
    }

    if (noteTasks.length > 0) {
      tasksByNote[note.id] = noteTasks;
    }
  }

  return { allTasks, tasksByNote, openCount, completedCount };
}

/**
 * Filters and sorts tasks based on TaskFilterState
 */
export function filterAndSortTasks(
  tasks: PKMTask[],
  filters: TaskFilterState
): PKMTask[] {
  let result = tasks.slice();

  // 1. Status filter
  if (filters.status === 'open') {
    result = result.filter((t) => !t.completed);
  } else if (filters.status === 'completed') {
    result = result.filter((t) => t.completed);
  }

  // 2. Search query filter
  if (filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    result = result.filter(
      (t) =>
        t.text.toLowerCase().includes(q) ||
        t.noteTitle.toLowerCase().includes(q) ||
        (t.parentHeading && t.parentHeading.toLowerCase().includes(q)) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  // 3. Folder filter
  if (filters.selectedFolderId) {
    if (filters.selectedFolderId === 'unorganized') {
      result = result.filter((t) => !t.folderId);
    } else {
      result = result.filter((t) => t.folderId === filters.selectedFolderId);
    }
  }

  // 4. Tag filter
  if (filters.selectedTag) {
    const normTag = filters.selectedTag.toLowerCase().replace(/^#/, '');
    result = result.filter((t) =>
      t.tags.some((tag) => tag.toLowerCase().replace(/^#/, '') === normTag)
    );
  }

  // 5. Note filter
  if (filters.selectedNoteId) {
    result = result.filter((t) => t.noteId === filters.selectedNoteId);
  }

  // 6. Priority filter
  if (filters.selectedPriority) {
    result = result.filter((t) => (t.priority || t.notePriority) === filters.selectedPriority);
  }

  // 7. Sort
  result.sort((a, b) => {
    let cmp = 0;
    switch (filters.sortBy) {
      case 'title':
        cmp = a.text.localeCompare(b.text);
        break;
      case 'updated':
        cmp = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        break;
      case 'date': {
        const dateA = a.dueDate || a.noteDate || '';
        const dateB = b.dueDate || b.noteDate || '';
        if (!dateA && !dateB) cmp = 0;
        else if (!dateA) cmp = 1;
        else if (!dateB) cmp = -1;
        else cmp = dateA.localeCompare(dateB);
        break;
      }
      case 'priority': {
        const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        const prA = a.priority || a.notePriority;
        const prB = b.priority || b.notePriority;
        const pA = prA ? priorityOrder[prA] || 0 : 0;
        const pB = prB ? priorityOrder[prB] || 0 : 0;
        cmp = pB - pA;
        break;
      }
      case 'source':
      default:
        // By note title then by line number
        cmp = a.noteTitle.localeCompare(b.noteTitle);
        if (cmp === 0) cmp = a.line - b.line;
        break;
    }

    return filters.sortOrder === 'desc' ? -cmp : cmp;
  });

  return result;
}

/**
 * Groups a list of filtered tasks by selected criteria
 */
export function groupTasks(
  tasks: PKMTask[],
  groupBy: TaskFilterState['groupBy'],
  folders: Folder[] = []
): TaskGroup[] {
  if (groupBy === 'none') {
    const openCount = tasks.filter((t) => !t.completed).length;
    return [
      {
        id: 'all',
        title: 'All Tasks',
        tasks,
        openCount,
        completedCount: tasks.length - openCount,
      },
    ];
  }

  const groupMap = new Map<string, { title: string; tasks: PKMTask[] }>();
  const folderMap = new Map<string, Folder>(folders.map((f) => [f.id, f]));

  for (const task of tasks) {
    let key = 'Other';
    let title = 'Other';

    switch (groupBy) {
      case 'note':
        key = task.noteId;
        title = task.noteTitle || 'Untitled Note';
        break;
      case 'folder':
        if (task.folderId && folderMap.has(task.folderId)) {
          key = task.folderId;
          title = folderMap.get(task.folderId)!.name;
        } else {
          key = 'unorganized';
          title = 'Unorganized Notes';
        }
        break;
      case 'tag':
        if (task.tags && task.tags.length > 0) {
          key = task.tags[0].toLowerCase();
          title = `#${task.tags[0]}`;
        } else {
          key = 'no-tag';
          title = 'Untagged';
        }
        break;
      case 'status':
        key = task.noteStatus || 'no-status';
        title = task.noteStatus
          ? task.noteStatus.replace('_', ' ').toUpperCase()
          : 'No Status';
        break;
      case 'priority': {
        const p = task.priority || task.notePriority;
        key = p || 'no-priority';
        title = p ? `${p.toUpperCase()} Priority` : 'No Priority';
        break;
      }
      case 'due_date': {
        const d = task.dueDate || task.noteDate;
        if (!d) {
          key = 'no-due-date';
          title = 'No Due Date';
        } else {
          key = d;
          title = d;
        }
        break;
      }
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, { title, tasks: [] });
    }
    groupMap.get(key)!.tasks.push(task);
  }

  return Array.from(groupMap.entries()).map(([id, grp]) => {
    const openCount = grp.tasks.filter((t) => !t.completed).length;
    return {
      id,
      title: grp.title,
      tasks: grp.tasks,
      openCount,
      completedCount: grp.tasks.length - openCount,
    };
  });
}
