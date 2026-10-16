import type { Note, Task } from './types';

// KEEP B3 src/utils/linking.ts semantics (alias/heading-aware targets) over ORIGINAL Hub records.
// No extra database, derived task or external provider access.
export interface KnowledgeLink {
  raw: string;
  title: string;
  targetId: string | null;
  status: 'resolved' | 'ambiguous' | 'missing';
}
export interface KnowledgeDesk {
  matches: Note[];
  selected: Note | null;
  outgoing: KnowledgeLink[];
  backlinks: Note[];
  tasks: Task[];
}
const norm = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
const LINK = /\[\[([^\[\]\r\n]{1,240})\]\]/gu;
export function wikiTargets(body: string): string[] {
  const result: string[] = [];
  let fence: string | null = null;
  for (const line of body.split(/\r?\n/u)) {
    const opening = /^\s*([`~]{3,})/u.exec(line);
    if (opening) {
      if (!fence) fence = opening[1]![0]!;
      else if (opening[1]![0] === fence) fence = null;
      continue;
    }
    if (fence) continue;
    for (const match of line.replace(/`[^`\r\n]*`/gu, '').matchAll(LINK)) {
      const target = match[1]?.split('|')[0]?.split('#')[0]?.trim();
      if (target) result.push(target);
    }
  }
  return result;
}
export function resolveWiki(note: Note, notes: readonly Note[]): KnowledgeLink[] {
  const names = new Map<string, Note[]>();
  for (const n of notes) {
    const key=norm(n.title), matches=names.get(key)??[];
    if(key) { matches.push(n); names.set(key,matches); }
  }
  return wikiTargets(note.body).map(raw=>{
    const byId=raw.startsWith('note:')?raw.slice(5):null;
    const matches=byId?notes.filter(n=>n.id===byId):names.get(norm(raw))??[];
    const status:KnowledgeLink['status']=matches.length===1?'resolved':matches.length?'ambiguous':'missing';
    return {raw,status,targetId:status==='resolved'?matches[0]!.id:null,title:status==='resolved'?matches[0]!.title:raw};
  });
}
export function knowledgeDesk(notes:readonly Note[],tasks:readonly Task[],selectedId:string|null,query=''):KnowledgeDesk {
  const term=norm(query);
  const matches=notes.filter(n=>!term||norm(n.title+' '+n.body).includes(term))
    .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
  const selected=notes.find(n=>n.id===selectedId)??null;
  if(!selected)return {matches,selected:null,outgoing:[],backlinks:[],tasks:[]};
  const backlinks=notes.filter(n=>n.id!==selected.id&&resolveWiki(n,notes).some(link=>link.targetId===selected.id));
  const related=tasks.filter(t=>wikiTargets(t.notes).some(raw=>{
    if(raw.startsWith('note:'))return raw.slice(5)===selected.id;
    return norm(raw)===norm(selected.title)&&notes.filter(n=>norm(n.title)===norm(raw)).length===1;
  }));
  return {matches,selected,outgoing:resolveWiki(selected,notes),
    backlinks:backlinks.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),
    tasks:related.sort((a,b)=>Number(!!a.completedAt)-Number(!!b.completedAt)||(a.due||'9999').localeCompare(b.due||'9999'))};
}
