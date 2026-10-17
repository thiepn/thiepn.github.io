/** B2 — real source-backed knowledge / planning discovery in the native pane shell. */
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Link2, Pin, PinOff, FolderKanban, ListTodo, ArrowUpRight, Save, Trash2, CalendarDays, ShieldAlert } from 'lucide-react';
import type { Note, Folder } from '../../../types';
import { planningService } from '../../planning/planningService';
import { vaultManager } from '../../indexer';
import { savedViewsManager } from '../../personalization/savedViewsManager';
import { favoritesManager } from '../../personalization/favoritesManager';
import type { FavoriteItem, SavedViewConfig } from '../../personalization/personalizationTypes';
import { resourceLinks, type KeepResourceLink } from '../resourceLinks';
import { makeOwnerRef, parseOwnerRef } from '../ownerResourceRefs';
import { resolveOwnerResource } from '../keepResourceSpine';
import { vaultEncryptionService } from '../../encryption/vaultEncryptionService';
import { KeepProjectDesk } from './KeepProjectDesk';
import { prepareKeepTaskReschedule } from '../keepProjectContext';
import { buildKeepDiscoveryIndex, queryKeepDiscovery, queryExistingSavedView, savedViewDomain, relatedKeepResources, prepareKeepTaskCompletion, type DiscoveryRow, type DiscoveryScope } from '../keepDiscoveryModel';

const control = 'min-w-0 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-2.5 py-2 text-sm text-stone-900 dark:text-stone-100';
const action = 'rounded-md border border-stone-300 dark:border-stone-700 px-2.5 py-1.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-amber-600';
const scopes: DiscoveryScope[] = ['all', 'note', 'project', 'goal', 'area', 'task'];
interface Props {
  notes: Note[];
  folders: Folder[];
  initialSavedViewId?: string;
  onOpenNote: (noteId: string, line?: number) => void;
  onSaveNote: (note: Note) => void | Promise<void>;
  onOpenProjects: () => void;
  onOpenCalendar: () => void;
  onOpenTasks: () => void;
}
export const KeepKnowledgeExplorer: React.FC<Props> = ({ notes, folders, initialSavedViewId, onOpenNote, onSaveNote, onOpenProjects, onOpenCalendar, onOpenTasks }) => {
  const [locked, setLocked] = useState(() => vaultEncryptionService.isVaultLocked());
  const [revision, setRevision] = useState(0);
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => favoritesManager.getFavorites());
  const [links, setLinks] = useState<KeepResourceLink[]>(() => resourceLinks.get());
  const [views, setViews] = useState(() => savedViewsManager.getSavedViews());
  const [query, setQuery] = useState('');
  const [workspaceSection, setWorkspaceSection] = useState<'projects' | 'discovery'>('projects');
  const [scope, setScope] = useState<DiscoveryScope>('all');
  const [status, setStatus] = useState('all');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<'recent' | 'due' | 'title'>('recent');
  const [savedViewId, setSavedViewId] = useState(initialSavedViewId || '');
  const [newViewName, setNewViewName] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [targetUri, setTargetUri] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => vaultEncryptionService.subscribeLockStateChange(() => setLocked(vaultEncryptionService.isVaultLocked())), []);
  useEffect(() => {
    if (locked) return;
    const unsub = planningService.subscribe(() => setRevision(v => v + 1));
    planningService.rebuild(notes.filter(n => !n.isLocked && !n.archived && !n.trashed), folders); // shared P49 note index: no new project store
    return unsub;
  }, [notes, folders, locked]);
  useEffect(() => {
    const stopFavorites = favoritesManager.subscribe(setFavorites);
    const stopLinks = resourceLinks.subscribe(setLinks);
    return () => { stopFavorites(); stopLinks(); };
  }, []);
  useEffect(() => { setSavedViewId(initialSavedViewId || ''); if (initialSavedViewId) setWorkspaceSection('discovery'); }, [initialSavedViewId]);

  const projects = useMemo(() => locked ? [] : planningService.getProjects(), [revision, locked]);
  const goals = useMemo(() => locked ? [] : planningService.getGoals(), [revision, locked]);
  const areas = useMemo(() => locked ? [] : planningService.getAreas(), [revision, locked]);
  const index = useMemo(() => buildKeepDiscoveryIndex(locked ? [] : notes, projects, goals, areas), [notes, projects, goals, areas, locked]);
  const currentView = useMemo(() => views.find(v => v.id === savedViewId), [views, savedViewId]);
  const supportedView = useMemo(() => currentView ? queryExistingSavedView(index.rows, currentView) : null, [index, currentView]);
  const results = useMemo(() => {
    const base = currentView && supportedView ? supportedView : currentView ? [] : index.rows;
    return queryKeepDiscovery(base, { query, scope, status, tag, sort });
  }, [index, query, scope, status, tag, sort, currentView, supportedView]);
  const selected = results.find(row => row.key === selectedKey) || index.rows.find(row => row.key === selectedKey) || null;
  const related = useMemo(() => selected ? relatedKeepResources(selected, index, links, projects, goals, areas, vaultManager.getIndex()) : [], [selected, index, links, projects, goals, areas]);
  const relatedTargets = useMemo(() => {
    const options = new Map<string,string>();
    for (const row of index.rows) if (row.kind !== 'task' && row.uri && row.uri !== selected?.uri) options.set(row.uri, `${row.title} (${row.kind})`);
    for (const f of favorites) if (f.resourceUri && parseOwnerRef(f.resourceUri) && !options.has(f.resourceUri)) options.set(f.resourceUri, `${f.title} (${parseOwnerRef(f.resourceUri)!.source}, not necessarily connected)`);
    return [...options];
  }, [index, favorites, selected]);
  const notify = async (run: () => Promise<unknown>, text: string) => {
    setError(''); setNotice(''); setBusy(true);
    try { await run(); setNotice(text); }
    catch(e) { setError(e instanceof Error ? e.message : 'Operation failed'); }
    finally { setBusy(false); }
  };
  const selectedUri = selected?.uri || (selected ? makeOwnerRef('keep', 'note', selected.noteId).uri : '');
  const openRow = (row: DiscoveryRow) => { if (index.noteById.has(row.noteId)) onOpenNote(row.noteId, row.line); };
  const completeTask = (row: DiscoveryRow) => notify(async () => {
    const task = index.taskById.get(row.key.slice('task:'.length));
    const note = task && index.noteById.get(task.noteId);
    if (!task || !note || note.type !== 'text') throw new Error('Open this task in its original editor.');
    await onSaveNote(prepareKeepTaskCompletion(note, task));
  }, 'Saved task completion through the existing note owner.');
  const rescheduleTask = (row:DiscoveryRow,day:string)=>notify(async()=>{
    if (row.kind !== 'task' || row.line === undefined) throw new Error('Open task in its owner editor.');
    const task = index.taskById.get(row.key.slice('task:'.length));
    const note = task && index.noteById.get(task.noteId);
    if (!task || !note) throw new Error('Task source unavailable; refresh discovery.');
    await onSaveNote(prepareKeepTaskReschedule(note,task,day));
  },'Updated the original Markdown due date. Refresh your calendar for the current source projection.');
  const pinRow = (row: DiscoveryRow) => notify(async () => {
    if (!row.uri) throw new Error('This task has no stable block ID. Pin it from KEEP Today to anchor the source first.');
    await favoritesManager.addFavorite({ id: crypto.randomUUID(), title: row.title, resourceId: parseOwnerRef(row.uri)!.id, type: row.kind === 'goal' || row.kind === 'area' ? 'note' : row.kind === 'task' ? 'markdown-task' : row.kind, resourceUri: row.uri });
  }, 'Pinned source reference.');
  const viewPinUri = currentView ? makeOwnerRef('keep','saved-view',currentView.id).uri : null;
  const viewFavorite = viewPinUri ? favorites.find(f => f.resourceUri === viewPinUri) : undefined;
  const pinView = () => currentView && notify(async () => {
    if (viewFavorite) await favoritesManager.removeFavorite(viewFavorite.id);
    else await favoritesManager.addFavorite({id: crypto.randomUUID(), title: currentView.name, type: 'saved-view', resourceId: currentView.id, resourceUri: viewPinUri! });
  }, viewFavorite ? 'Saved view unpinned.' : 'Saved view pinned to KEEP Today.');
  const saveView = () => notify(async () => {
    const domain = scope === 'all' ? 'keep-workspace' : savedViewDomain(scope);
    if (!domain) throw new Error('This filter cannot be saved as a native KEEP view.');
    if (!newViewName.trim() || newViewName.trim().length > 80) throw new Error('Name the view (1–80 characters).');
    const filters: SavedViewConfig['filters'] = [];
    if (query.trim()) for (const term of query.trim().split(/\s+/u).filter(Boolean)) filters.push({field: 'searchText', operator: 'contains', value: term});
    if (status !== 'all') filters.push({field: 'status', operator: 'equals', value: status});
    if (tag.trim()) filters.push({field: 'tags', operator: 'contains', value: tag.trim().replace(/^#/, '')});
    if (scope === 'goal' || scope === 'area' || scope === 'note') filters.push({field: 'type', operator: 'equals', value: scope});
    const created = await savedViewsManager.saveView({name: newViewName.trim(), domain, description: 'KEEP source-backed discovery', filters, sort: {field:sort==='due'?'dueDate':sort==='title'?'title':'updatedAt', direction:sort==='due'||sort==='title'?'asc':'desc'}, isFavorite:false});
    setViews(savedViewsManager.getSavedViews()); setSavedViewId(created.id); setWorkspaceSection('discovery'); setNewViewName(''); setQuery(''); setTag(''); setStatus('all'); setScope('all');
  }, 'Saved in the existing KEEP Saved Views manager.');
  const removeView = () => currentView?.id.startsWith('sv-custom-') && notify(async () => {
    const id = currentView!.id;
    if (!await savedViewsManager.deleteView(id)) throw new Error('Saved view was not removed');
    setViews(savedViewsManager.getSavedViews()); setSavedViewId('');
    // Existing pinned references intentionally remain inspectable as missing.
  }, 'Saved view removed. Other canonical records are unchanged.');
  const openRelated = (uri: string) => {
    const ref = parseOwnerRef(uri);
    if (!ref || ref.source !== 'keep' || ref.kind === 'saved-view') return;
    const resolved = resolveOwnerResource(ref, notes);
    if (resolved.status === 'available' && resolved.note) onOpenNote(resolved.note.id, resolved.task?.line);
  };
  if (locked) return <section className="p-6 text-sm" aria-label="KEEP discovery locked"><ShieldAlert className="inline mr-2" size={17}/> Unlock your KEEP vault to browse its resources. No titles or results are displayed while locked.</section>;
  return <section className="h-full overflow-y-auto px-3 sm:px-6 py-5 text-stone-900 dark:text-stone-100" aria-label="KEEP knowledge and project discovery">
    <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
      <div><h2 className="text-xl font-semibold">Knowledge & projects</h2><p className="text-xs text-stone-500 mt-1">Your existing notes, anchored tasks, projects, goals and areas. No copied records.</p></div>
      <nav className="flex flex-wrap gap-1.5" aria-label="Planning tools">
        <button className={action} onClick={onOpenProjects}><FolderKanban className="inline mr-1" size={13}/> Projects</button>
        <button className={action} onClick={onOpenTasks}><ListTodo className="inline mr-1" size={13}/> Agenda</button>
        <button className={action} onClick={onOpenCalendar}><CalendarDays className="inline mr-1" size={13}/> Calendar</button>
      </nav>
    </div>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300 my-2">{error}</p>}
    {notice && <p role="status" className="text-xs text-stone-500 my-2">{notice}</p>}
    <div className="flex gap-2 mb-4 border-b border-stone-200 dark:border-stone-800 pb-3" role="group" aria-label="Knowledge workspace sections"><button className={action} aria-pressed={workspaceSection==='projects'} onClick={()=>setWorkspaceSection('projects')}>Project & study desk</button><button className={action} aria-pressed={workspaceSection==='discovery'} onClick={()=>setWorkspaceSection('discovery')}>Discovery & saved views</button></div>
    {workspaceSection==='projects' && <KeepProjectDesk index={index} projects={projects} goals={goals} areas={areas} links={links} graph={vaultManager.getIndex()} onOpenNote={onOpenNote} onCompleteTask={(row)=>void completeTask(row)} onRescheduleTask={(row,day)=>void rescheduleTask(row,day)} busy={busy} onInspectProject={(id)=>{setSavedViewId('');setQuery('');setStatus('all');setTag('');setScope('all');setSelectedKey(`note:${id}`);setWorkspaceSection('discovery');}} onOpenCalendar={onOpenCalendar} onOpenTasks={onOpenTasks}/>}
    {workspaceSection==='discovery' && <>
    <div className="flex flex-wrap gap-2 mb-3 items-center">
      <label className="min-w-[170px] flex-1"><span className="sr-only">Search KEEP resources</span><div className="relative"><Search size={15} className="absolute top-3 left-2 text-stone-500"/><input aria-label="Search KEEP resources" className={`${control} w-full pl-8`} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search titles, tags, next actions…"/></div></label>
      <label><span className="sr-only">Resource type</span><select aria-label="Resource type" className={control} value={scope} onChange={e=>{setScope(e.target.value as DiscoveryScope);setSavedViewId('');}}>{scopes.map(x=><option value={x} key={x}>{x==='all'?'All types':x}</option>)}</select></label>
      <label><span className="sr-only">Status</span><select aria-label="Status" className={control} value={status} onChange={e=>setStatus(e.target.value)}>{['all','active','planned','waiting','paused','completed','open','achieved'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label><span className="sr-only">Sort</span><select aria-label="Sort resources" className={control} value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="recent">Recent</option><option value="due">Due date</option><option value="title">Title</option></select></label>
      <input className={`${control} w-28`} value={tag} onChange={e=>setTag(e.target.value)} aria-label="Filter by tag" placeholder="Tag" />
    </div>
    <div className="border-y border-stone-200 dark:border-stone-800 py-2 mb-4 flex flex-wrap gap-2 items-center">
      <label className="text-xs">Saved views <select aria-label="Saved discovery view" className={`${control} ml-2`} value={savedViewId} onChange={e=>{setSavedViewId(e.target.value);setQuery('');setTag('');setStatus('all');setScope('all');}}><option value="">All source records</option>{views.map(v=><option value={v.id} key={v.id}>{v.name} · {v.domain}</option>)}</select></label>
      {currentView && (supportedView ? <span className="text-xs text-stone-500">Evaluated on actual KEEP {currentView.domain} records.</span> : <span className="text-xs text-amber-700">External domain unavailable in KEEP. No fabricated results.</span>)}
      {currentView && <button className={action} onClick={pinView} disabled={busy}>{viewFavorite ? <PinOff className="inline mr-1" size={13}/> : <Pin className="inline mr-1" size={13}/>} {viewFavorite?'Unpin view':'Pin view'}</button>}
      {currentView?.id.startsWith('sv-custom-') && <button className={action} onClick={removeView} disabled={busy}><Trash2 className="inline mr-1" size={13}/> Delete view</button>}
      {!savedViewId && <form className="flex gap-1.5 items-center min-w-0" onSubmit={e=>{e.preventDefault();void saveView();}}><input className={`${control} w-36`} aria-label="New saved view name" maxLength={80} placeholder="Name this view" value={newViewName} onChange={e=>setNewViewName(e.target.value)} /><button className={action} type="submit" disabled={busy}><Save className="inline mr-1" size={13}/> Save filter</button></form>}
    </div>
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.45fr)]">
      <div className="min-w-0"><p className="text-xs text-stone-500 mb-2">{results.length} source-backed results · {projects.length} project records · {index.rows.filter(x=>x.kind==='task'&&!x.completed).length} open note tasks</p>
        <div className="space-y-1" role="list">{results.slice(0,250).map(row=>{
          const chosen=row.key===selected?.key;
          const pin = row.uri ? favorites.find(f=>f.resourceUri===row.uri) : undefined;
          return <div role="listitem" key={row.key} className={`flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 p-2 ${chosen?'bg-stone-100 dark:bg-stone-900':''}`}>
            <button type="button" className="flex-1 min-w-0 text-left" onClick={()=>setSelectedKey(row.key)} aria-pressed={chosen}><span className="text-[10px] uppercase text-stone-500">{row.kind} · {row.status}{row.dueDate?' · '+row.dueDate:''}</span><strong className="block text-sm truncate font-medium">{row.title}</strong><span className="block text-xs text-stone-500 truncate">{row.summary}</span></button>
            {row.kind==='task' && !row.completed && <button className={action} disabled={busy || row.line === undefined || index.noteById.get(row.noteId)?.type !== 'text'} onClick={()=>void completeTask(row)} aria-label={`Complete ${row.title}`}>Complete</button>}
            <button className={action} onClick={()=>openRow(row)} aria-label={`Open ${row.title}`}><ArrowUpRight size={15}/></button>
            {row.uri && <button className={action} disabled={busy} aria-label={`${pin?'Unpin':'Pin'} ${row.title}`} onClick={()=>pin ? void notify(()=>favoritesManager.removeFavorite(pin.id),'Reference unpinned.') : void pinRow(row)}>{pin?<PinOff size={14}/>:<Pin size={14}/>}</button>}
          </div>;
        })}{results.length===0 && <p className="text-sm text-stone-500 p-3">No matching authorized KEEP resources.</p>}{results.length>250 && <p className="text-xs text-stone-500 p-2">Showing first 250. Narrow your query to see more.</p>}</div>
      </div>
      <aside aria-label="Selected resource context" className="lg:sticky lg:top-0 self-start border-t lg:border-t-0 lg:border-l border-stone-200 dark:border-stone-800 pt-3 lg:pt-0 lg:pl-4 min-w-0">
        {!selected?<p className="text-xs text-stone-500">Select a resource to see its source-backed context, relationships and next action.</p>:<>
          <h3 className="text-base font-semibold break-words">{selected.title}</h3><p className="text-xs text-stone-500">{selected.kind} · {selected.status} · KEEP note {selected.noteId}</p>
          <div className="flex gap-1.5 flex-wrap mt-2"><button className={action} onClick={()=>openRow(selected)}>Open source</button>{selected.kind==='project'&&<button className={action} onClick={onOpenProjects}>Project planner</button>}</div>
          {selected.kind==='project'&&projects.find(p=>p.noteId===selected.noteId)?.nextActionTask && <div className="mt-3 p-3 bg-stone-100 dark:bg-stone-900 text-xs"><strong>Next action · original Markdown task</strong><button className="block text-left underline mt-1" onClick={()=>onOpenNote(selected.noteId, projects.find(p=>p.noteId===selected.noteId)!.nextActionTask!.line)}>{projects.find(p=>p.noteId===selected.noteId)!.nextActionTask!.text}</button></div>}
          <h4 className="text-xs font-semibold uppercase tracking-wide mt-5">Relations and context ({related.length})</h4>
          <div className="mt-2 space-y-1.5 max-h-72 overflow-auto">{related.map(r=>{const ref=parseOwnerRef(r.uri);const local=ref?.source==='keep' ? resolveOwnerResource(ref,index.noteById.size?notes:[]) : null;return <div key={r.uri} className="border-b border-stone-200 dark:border-stone-800 py-1.5"><div className="text-[10px] text-stone-500">{r.direction} · {r.reason}</div><button className="text-sm text-left underline disabled:no-underline disabled:opacity-60" disabled={!local||local.status!=='available'||!local.note} onClick={()=>openRelated(r.uri)}>{local?.title || `${ref?.source || 'Unknown'} resource`}</button>{(!local || local.status!=='available') && <div className="text-[10px] text-stone-500">{ref?.source==='keep'?local?.status:'External owner not connected'}</div>}</div>;})}{!related.length&&<p className="text-xs text-stone-500">No verified local or explicit references.</p>}</div>
          <form className="mt-4 border-t border-stone-200 dark:border-stone-800 pt-3" onSubmit={e=>{e.preventDefault();void notify(async()=>{if(!targetUri) throw new Error('Choose a resource'); await resourceLinks.connect(selectedUri,targetUri);setTargetUri('');},'Relationship stored as a source pointer.');}}><label className="text-xs block mb-1">Link this resource (no content copying)</label><select className={`${control} w-full`} value={targetUri} onChange={e=>setTargetUri(e.target.value)}><option value="">Select target</option>{relatedTargets.map(([uri,label])=><option key={uri} value={uri}>{label}</option>)}</select><button className={`${action} mt-2`} type="submit" disabled={busy||!targetUri}><Link2 size={13} className="inline mr-1"/> Connect</button></form>
          {links.filter(l=>l.fromUri===selectedUri||l.toUri===selectedUri).map(l=><div key={l.id} className="text-xs flex items-center justify-between gap-2 mt-2"><span className="truncate">{l.label} · explicit</span><button className={action} onClick={()=>void notify(()=>resourceLinks.remove(l.id),'Relationship removed.')} disabled={busy}>Remove</button></div>)}
        </>}
        <p className="text-[11px] text-stone-500 mt-5"><ShieldAlert size={12} className="inline mr-1"/>External sources remain owner-controlled. Discovery is device-local, using no new content store.</p>
      </aside>
    </div>
    </>}
  </section>;
};
