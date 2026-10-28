import React, { useEffect, useMemo, useState } from 'react';
import { BookmarkPlus, Link2, Pin, PinOff, ShieldAlert, Copy, X, ArrowUpRight } from 'lucide-react';
import type { Note } from '../../types';
import { buildVaultTasks } from '../../pkm/tasks/taskIndex';
import { favoritesManager } from '../../pkm/personalization/favoritesManager';
import type { FavoriteItem } from '../../pkm/personalization/personalizationTypes';
import { resourceLinks, type KeepResourceLink } from '../../pkm/integration/resourceLinks';
import { collectKeepPins, ensureTaskAnchor, resolveOwnerResource, anchoredTaskId, type ResolvedKeepResource } from '../../pkm/integration/keepResourceSpine';
import { makeOwnerRef, parseOwnerRef, OWNER_SOURCES, RESOURCE_KINDS, SOURCE_ADAPTERS, type OwnerSource, type AnyOwnerKind } from '../../pkm/integration/ownerResourceRefs';

interface Props {
  notes: Note[];
  onOpenNote: (note: Note, cursorLine?: number) => void;
  onSaveNote?: (note: Note) => Promise<unknown>;
  compact?: boolean;
  onOpenSavedView?: (id: string) => void;
}
const button = 'text-xs border border-stone-300 dark:border-stone-700 px-2.5 py-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-amber-600 disabled:opacity-50';
const field = 'w-full min-w-0 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-2.5 py-2 text-sm text-stone-800 dark:text-stone-200';

/** The same widget is used by KEEP Today and the V2 developer Resource overview. */
export const KeepResourceBoard: React.FC<Props> = ({ notes, onOpenNote, onSaveNote, compact = false, onOpenSavedView }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => favoritesManager.getFavorites());
  const [relations, setRelations] = useState<KeepResourceLink[]>(() => resourceLinks.get());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [source, setSource] = useState<OwnerSource>('folio');
  const [kind, setKind] = useState<AnyOwnerKind>('task');
  const [recordId, setRecordId] = useState('');
  const [title, setTitle] = useState('');
  const [linkFrom, setLinkFrom] = useState('');
  const [linkTo, setLinkTo] = useState('');

  useEffect(() => {
    const stopFavorites = favoritesManager.subscribe(setFavorites);
    const stopRelations = resourceLinks.subscribe(setRelations);
    return () => { stopFavorites(); stopRelations(); };
  }, []);

  const pins = useMemo(() => collectKeepPins(notes, favorites), [notes, favorites]);
  const activeNotes = useMemo(() => notes.filter(n => !n.trashed && !n.archived && !n.isLocked), [notes]);
  const noteTasks = useMemo(() => buildVaultTasks(activeNotes).allTasks.filter(t => !t.completed).slice(0, 12), [activeNotes]);
  const noteChoices = useMemo(() => activeNotes.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 40), [activeNotes]);
  const noteById = useMemo(() => new Map(notes.map(n => [n.id, n])), [notes]);
  const linkTargets = useMemo(() => {
    const choices = new Map<string, string>();
    for (const note of noteChoices) {
      const ref = makeOwnerRef('keep', 'note', note.id);
      choices.set(ref.uri, `${note.title || 'Untitled'} (KEEP note)`);
    }
    for (const pin of pins) if (pin.uri && !choices.has(pin.uri)) choices.set(pin.uri, `${pin.title} (${pin.sourceLabel})`);
    return [...choices.entries()];
  }, [noteChoices, pins]);

  const execute = async (action: () => Promise<void>, success: string) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(success); }
    catch (err) { setError(err instanceof Error ? err.message : 'Action failed. Original data was not intentionally changed.'); }
    finally { setBusy(false); }
  };
  const pinNote = (note: Note) => execute(async () => {
    if (!onSaveNote) throw new Error('Native note editing is unavailable here');
    await onSaveNote({ ...note, pinned: true, updatedAt: new Date().toISOString() });
  }, 'Note pinned using its existing KEEP record.');

  const pinTask = (taskId: string) => execute(async () => {
    if (!onSaveNote) throw new Error('Native task editing is unavailable here');
    const task = noteTasks.find(t => t.id === taskId);
    const note = task && noteById.get(task.noteId);
    if (!task || !note) throw new Error('Task source no longer available');
    if (note.type !== 'text') throw new Error('Pinning native checklist items requires a separately verified stable ID; pin the containing note instead');
    const anchor = task.blockId || `keep-${crypto.randomUUID().replace(/-/g, '')}`;
    if (!task.blockId) await onSaveNote(ensureTaskAnchor(note, task, anchor));
    const ref = makeOwnerRef('keep', 'markdown-task', anchoredTaskId(task.noteId, anchor));
    await favoritesManager.addFavorite({ id: crypto.randomUUID(), title: task.text, type: 'markdown-task', resourceId: ref.id, resourceUri: ref.uri });
  }, 'Markdown task pinned with a stable source block anchor.');

  const unpin = (pin: ResolvedKeepResource) => execute(async () => {
    if (pin.note && pin.ref?.source === 'keep' && pin.ref.kind === 'note') {
      if (!onSaveNote) throw new Error('Native note editing is unavailable here');
      await onSaveNote({ ...pin.note, pinned: false, isFavorite: false, updatedAt: new Date().toISOString() });
    }
    if (pin.favoriteId) await favoritesManager.removeFavorite(pin.favoriteId);
  }, 'Shortcut removed; source record retained.');

  const addExternal = () => execute(async () => {
    if (source === 'keep') throw new Error('Open native notes or tasks to pin them');
    const ref = makeOwnerRef(source, kind as never, recordId);
    if (!title.trim() || title.trim().length > 120) throw new Error('Enter a short display label');
    await favoritesManager.addFavorite({ id: crypto.randomUUID(), title: title.trim(), type: kind as FavoriteItem['type'], resourceId: ref.id, resourceUri: ref.uri });
    setRecordId(''); setTitle(''); setAddOpen(false);
  }, 'External owner reference saved locally. Availability remains unverified.');

  const connect = () => execute(async () => {
    const from = makeOwnerRef('keep', 'note', linkFrom);
    const target = parseOwnerRef(linkTo);
    if (!activeNotes.some(n => n.id === linkFrom) || !target) throw new Error('Choose an accessible KEEP note and a valid resource');
    await resourceLinks.connect(from.uri, target.uri);
  }, 'Reference linked. Target remains owned by its original application.');

  const open = (resource: ResolvedKeepResource) => {
    if (resource.status === 'available' && resource.ref?.source === 'keep' && resource.ref.kind === 'saved-view' && onOpenSavedView) onOpenSavedView(resource.ref.id);
    else if (resource.status === 'available' && resource.note) onOpenNote(resource.note, resource.task?.line);
    else if (resource.status === 'unverified-owner' && resource.landing) window.open(resource.landing, '_blank', 'noopener,noreferrer');
  };
  const linkTarget = (uri: string) => {
    const pin = pins.find(p => p.uri === uri);
    if (pin) return pin;
    const ref = parseOwnerRef(uri);
    return ref ? { ...resolveOwnerResource(ref, notes), pinned: false } : null;
  };

  return (
    <section className="space-y-3" aria-label="KEEP unified resource shortcuts and links">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2"><Pin aria-hidden="true" size={16}/> Universal pins & links</h3>
        <button type="button" className={button} aria-expanded={addOpen} onClick={() => setAddOpen(x => !x)}><BookmarkPlus size={14} className="inline mr-1"/> Reference another app</button>
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400">Source-owned shortcuts, not copied tasks or synchronized provider data. KEEP notes and anchored Markdown tasks open in their original editor.</p>
      {error && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="text-xs text-stone-600 dark:text-stone-300">{notice}</p>}
      {addOpen && (
        <form className="border border-stone-300 dark:border-stone-700 p-3 rounded-md grid grid-cols-1 sm:grid-cols-2 gap-2" onSubmit={event => { event.preventDefault(); void addExternal(); }}>
          <label className="text-xs">Owner
            <select className={field} value={source} onChange={e => { const next = e.target.value as OwnerSource; setSource(next); setKind(RESOURCE_KINDS[next][0]); }}>
              {OWNER_SOURCES.filter(x => x !== 'keep').map(id => <option value={id} key={id}>{SOURCE_ADAPTERS[id].label}</option>)}
            </select>
          </label>
          <label className="text-xs">Type
            <select className={field} value={kind} onChange={e => setKind(e.target.value as AnyOwnerKind)}>
              {RESOURCE_KINDS[source].map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <label className="text-xs">Original resource ID (not title or URL)
            <input className={field} value={recordId} maxLength={256} onChange={e => setRecordId(e.target.value)} required placeholder="Existing owner record ID" />
          </label>
          <label className="text-xs">Local display label
            <input className={field} value={title} maxLength={120} onChange={e => setTitle(e.target.value)} required placeholder="Recognizable name" />
          </label>
          <div className="sm:col-span-2 flex items-center gap-2">
            <button type="submit" className={button} disabled={busy}>Save reference</button>
            <button type="button" className={button} onClick={() => setAddOpen(false)}>Cancel</button>
          </div>
          <p className="text-xs text-stone-500 sm:col-span-2">No external data is accessed. Provider record IDs must be obtained from their original application. Source landing pages are only opened where known.</p>
        </form>
      )}
      <div className={`grid gap-2 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {pins.length === 0 && <p className="text-xs text-stone-500">No pins yet. Pin a KEEP note or task, or reference a resource owned by another app.</p>}
        {pins.map((pin, idx) => (
          <div key={pin.uri ?? `legacy-${pin.favoriteId ?? idx}`} className="border border-stone-200 dark:border-stone-800 rounded-md p-2.5 min-w-0">
            <div className="flex items-start justify-between gap-2"><div className="min-w-0">
              <p className="text-xs font-medium text-stone-800 dark:text-stone-100 break-words">{pin.title}</p>
              <p className="text-[11px] text-stone-500">{pin.sourceLabel} · {pin.ref?.kind ?? 'legacy'} · {pin.status === 'unverified-owner' ? 'Not connected' : pin.status}</p>
            </div><button type="button" className={button} onClick={() => void unpin(pin)} disabled={busy} aria-label={`Remove ${pin.title} from pins`}><PinOff size={13}/></button></div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {((pin.status === 'available' && (pin.note || (pin.ref?.kind === 'saved-view' && onOpenSavedView))) || (pin.status === 'unverified-owner' && pin.landing)) && <button type="button" onClick={() => open(pin)} className={button}>Open {pin.status === 'unverified-owner' ? 'app' : 'source'} <ArrowUpRight className="inline" size={12}/></button>}
              {pin.uri && <button type="button" className={button} onClick={() => { if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(pin.uri!); else setNotice(pin.uri!); }} title={pin.uri}><Copy className="inline" size={12}/> Copy ref</button>}
            </div>
          </div>
        ))}
      </div>
      {onSaveNote && (
        <details className="text-xs border-t border-stone-200 dark:border-stone-800 pt-2">
          <summary className="cursor-pointer font-medium">Pin from KEEP source</summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div><p className="font-semibold mb-1">Notes</p>{noteChoices.slice(0, 8).map(note => (
              <div key={note.id} className="flex items-center gap-2 justify-between py-1"><span className="truncate">{note.title || 'Untitled'}</span><button type="button" disabled={busy || note.pinned || note.isFavorite} onClick={() => void pinNote(note)} className={button}>Pin</button></div>
            ))}</div>
            <div><p className="font-semibold mb-1">Open Markdown tasks</p>{noteTasks.slice(0, 8).map(task => (
              <div key={task.id} className="flex items-center gap-2 justify-between py-1"><span className="truncate" title={task.noteTitle}>{task.text}</span><button type="button" disabled={busy || task.id.startsWith('checklist-')} onClick={() => void pinTask(task.id)} className={button} title="Add or reuse a stable Markdown block anchor">Pin</button></div>
            ))}</div>
          </div>
        </details>
      )}
      <details className="text-xs border-t border-stone-200 dark:border-stone-800 pt-2">
        <summary className="cursor-pointer font-medium"><Link2 className="inline mr-1" size={13}/> Connect an existing KEEP note to a resource</summary>
        <form onSubmit={e => {e.preventDefault(); void connect();}} className="mt-2 grid gap-2 sm:grid-cols-2">
          <label>From note
            <select value={linkFrom} onChange={e => setLinkFrom(e.target.value)} className={field}><option value="">Choose a note</option>{noteChoices.map(n => <option value={n.id} key={n.id}>{n.title || 'Untitled'}</option>)}</select>
          </label>
          <label>To note or pinned resource
            <select value={linkTo} onChange={e => setLinkTo(e.target.value)} className={field}><option value="">Choose a resource</option>{linkTargets.map(([uri, label]) => <option key={uri} value={uri}>{label}</option>)}</select>
          </label>
          <div className="sm:col-span-2"><button type="submit" className={button} disabled={busy || !linkFrom || !linkTo}>Connect</button></div>
        </form>
      </details>
      {relations.length > 0 && (
        <div className="border-t border-stone-200 dark:border-stone-800 pt-2">
          <p className="text-xs font-semibold mb-1">Related resources ({relations.length})</p>
          <div className="space-y-1 max-h-40 overflow-auto">
            {relations.map(r => {
              const from = linkTarget(r.fromUri), to = linkTarget(r.toUri);
              return <div key={r.id} className="flex flex-wrap items-center gap-1 text-xs py-1">
                <button type="button" className={button} disabled={!from?.note || from.status !== 'available'} onClick={() => from?.note && onOpenNote(from.note)}>{from?.title ?? 'Missing source'}</button>
                <span className="text-stone-500">→</span>
                <button type="button" className={button} disabled={!to || (!to.note && !to.landing) || !['available','unverified-owner'].includes(to.status)} onClick={() => to && open(to)}>{to?.title ?? 'Missing target'} ({to?.status ?? 'unavailable'})</button>
                <button type="button" className={button} disabled={busy} onClick={() => void execute(() => resourceLinks.remove(r.id), 'Relation removed, no source records changed.')} aria-label="Remove resource link"><X size={12}/></button>
              </div>;
            })}
          </div>
        </div>
      )}
      <p className="text-[11px] text-stone-500 flex gap-1 items-start"><ShieldAlert aria-hidden="true" size={12} className="shrink-0 mt-0.5"/> Favorites and link metadata use existing KEEP preferences on this device. No provider sync, identity grant, source mutation or Hub publication is implied.</p>
    </section>
  );
};
