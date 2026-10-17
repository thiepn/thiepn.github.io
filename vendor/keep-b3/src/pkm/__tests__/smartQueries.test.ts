import { Note, Folder } from '../../types';
import { parseSmartQuery, tokenizeQuery } from '../queryParser';
import { executeSmartQuery } from '../queryEngine';
import { vaultManager } from '../indexer';

export function runSmartQueryTests(): { passed: number; failed: number; errors: string[] } {
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

  // --- Suite 1: Tokenizer & Parser Grammar ---
  {
    const { tokens } = tokenizeQuery('folder:"Work Projects" tag:#urgent priority:high -status:done');
    assert(tokens.length === 5, 'Tokenizes 4 tokens + EOF', `got ${tokens.length}`);
    assert(tokens[0].fieldKey === 'folder' && tokens[0].fieldValue === 'Work Projects', 'Quoted folder string parsed');
    assert(tokens[1].fieldKey === 'tag' && tokens[1].fieldValue === 'urgent', 'Tag with hash parsed cleanly');
    assert(tokens[2].fieldKey === 'priority' && tokens[2].fieldValue === 'high', 'Priority parsed');
    assert(tokens[3].fieldKey === 'status' && tokens[3].isNegated === true, 'Minus prefix converted to negated field');
  }

  // --- Suite 2: AST Construction & Modifiers ---
  {
    const res = parseSmartQuery('tag:meeting (status:todo OR status:in_progress) sort:priority order:desc limit:10 view:cards');
    assert(!res.error, 'Parse valid boolean query without errors', res.error?.message);
    assert(res.ast !== null, 'AST generated');
    assert(res.ast?.modifiers.sort === 'priority', 'Sort modifier parsed');
    assert(res.ast?.modifiers.order === 'desc', 'Order modifier parsed');
    assert(res.ast?.modifiers.limit === 10, 'Limit modifier parsed');
    assert(res.ast?.modifiers.view === 'cards', 'View modifier parsed');
  }

  // --- Suite 3: Date Expressions ---
  {
    const todayRes = parseSmartQuery('updated:today OR created:>7d');
    assert(!todayRes.error, 'Date comparison and keywords parsed');
    assert(todayRes.ast?.rootClause?.type === 'or', 'Root clause is OR');
  }

  // --- Suite 4: Syntax Error Handling & Suggestions ---
  {
    const errRes = parseSmartQuery('priorty:urgent foler:Personal');
    assert(Boolean(errRes.error), 'Errors caught for misspelled fields');
    assert(errRes.error?.suggestion?.includes('priority:') || false, 'Did you mean suggestion provided');
  }

  // --- Suite 5: Query Execution Against Real Notes ---
  {
    const folders: Folder[] = [
      { id: 'f1', name: 'Engineering', color: 'blue', createdAt: '2026-01-01' },
      { id: 'f2', name: 'Design', color: 'purple', createdAt: '2026-01-01' },
    ];

    const notes: Note[] = [
      {
        id: 'n1',
        title: 'Backend API Spec',
        content: 'RESTful and GraphQL spec. - [x] Auth - [ ] Database',
        type: 'text',
        checklist: [],
        tags: ['backend', 'api'],
        color: 'blue',
        folderId: 'f1',
        pinned: true,
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
        priority: 'urgent',
        status: 'in_progress',
        createdAt: '2026-01-10T00:00:00Z',
        updatedAt: '2026-01-20T00:00:00Z',
      },
      {
        id: 'n2',
        title: 'Figma UI Library',
        content: 'Design components and tokens. [[Backend API Spec]]',
        type: 'text',
        checklist: [],
        tags: ['design', 'tokens'],
        color: 'purple',
        folderId: 'f2',
        pinned: false,
        archived: false,
        trashed: false,
        reminderDate: '2026-02-01T00:00:00Z',
        images: [],
        priority: 'medium',
        status: 'todo',
        createdAt: '2026-01-12T00:00:00Z',
        updatedAt: '2026-01-18T00:00:00Z',
        linkedNoteIds: ['n1'],
      },
      {
        id: 'n3',
        title: 'Quick Scratchpad',
        content: 'Notes without folder',
        type: 'text',
        checklist: [],
        tags: ['misc'],
        color: 'default',
        folderId: null,
        pinned: false,
        archived: false,
        trashed: false,
        reminderDate: null,
        images: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-05T00:00:00Z',
      },
    ];

    vaultManager.rebuildIndex(notes);

    // Folder search
    const engRes = executeSmartQuery('folder:Engineering', { notes, folders });
    assert(engRes.items.length === 1 && engRes.items[0].note.id === 'n1', 'Matches folder by name');

    // Folder none
    const unorgRes = executeSmartQuery('folder:none', { notes, folders });
    assert(unorgRes.items.length === 1 && unorgRes.items[0].note.id === 'n3', 'Matches unorganized note');

    // Priority filter
    const prioRes = executeSmartQuery('priority:urgent', { notes, folders });
    assert(prioRes.items.length === 1 && prioRes.items[0].note.id === 'n1', 'Matches priority:urgent');

    // Status filter with NOT
    const notDoneRes = executeSmartQuery('-status:done', { notes, folders });
    assert(notDoneRes.items.length === 3, 'Matches all non-done notes');

    // Checklist stats detection
    const chkRes = executeSmartQuery('has:tasks', { notes, folders });
    assert(chkRes.items.length === 1 && chkRes.items[0].note.id === 'n1', 'Detects markdown tasks in note');
    assert(chkRes.items[0].checklistStats?.total === 2, 'Extracts task total');
    assert(chkRes.items[0].checklistStats?.completed === 1, 'Extracts task completed count');

    // Has links
    const linkRes = executeSmartQuery('has:links', { notes, folders });
    assert(linkRes.items.length === 1 && linkRes.items[0].note.id === 'n2', 'Detects outgoing links');

    // Sorting by priority
    const sortRes = executeSmartQuery('sort:priority order:desc', { notes, folders });
    assert(sortRes.items[0].note.id === 'n1', 'Sorts urgent priority first');
    assert(sortRes.items[1].note.id === 'n2', 'Sorts medium priority second');
  }

  return { passed, failed, errors };
}
