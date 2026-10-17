/**
 * Adapted from KEEP B3: src/pkm/tasks/taskParser.ts,
 * src/pkm/planning/planningNoteClassifier.ts and projectTaskEngine.ts.
 * Copyright remains with the source project owner.
 *
 * Adapter changes: Hub Note uses body instead of content; metadata is parsed
 * from frontmatter without importing KEEP's encrypted vault/storage services.
 * ALL operations derive from the existing canonical Hub note, never a new store.
 */
import type { Note } from './types';
export type PlanningKind = 'project' | 'goal' | 'area' | 'review';
export interface KeepTask {
  id: string; noteId: string; line: number; rawLine: string;
  text: string; completed: boolean; blockId?: string; dueDate?: string;
  priority?: 'high' | 'urgent' | 'medium' | 'low';
  heading?: string;
}
export interface KeepProjectProgress {
  tasks: KeepTask[]; total: number; completed: number; open: number;
  nextAction: KeepTask | null; percent: number | null; canSuggestCompletion: boolean;
}
const day = (v:string) => /^\d{4}-\d{2}-\d{2}$/u.test(v) &&
  !Number.isNaN(Date.parse(v+'T00:00:00Z')) && new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
function hashString(str:string): string {
  let hash=0;
  for(let i=0;i<str.length;i++) { hash=(hash<<5)-hash+str.charCodeAt(i); hash|=0; }
  return Math.abs(hash).toString(36);
}
export function keepFrontmatter(body:string): Record<string,string> {
  const result:Record<string,string>={};
  const lines=body.split(/\r?\n/u);
  if(lines[0]?.trim()!=='---')return result;
  const end=lines.findIndex((s,i)=>i>0&&s.trim()==='---');
  if(end<1||end>80)return result;
  for(const row of lines.slice(1,end)){
    const match=/^([\w-]+):\s*(.*?)\s*$/u.exec(row);
    if(match)result[match[1]!.toLowerCase()]=match[2]!.replace(/^['"]|['"]$/gu,'');
  }
  return result;
}
export function classifyKeepPlanningNote(note: Pick<Note,'body'>): PlanningKind | null {
  const p=keepFrontmatter(note.body);
  const kind=(p.type??'').toLowerCase().trim();
  const tags=(p.tags??'').toLowerCase().replace(/[\[\]"']/gu,'').split(/[,\s]+/u).map(t=>t.replace(/^#/u,''));
  if(kind==='goal'||tags.includes('goal'))return 'goal';
  if(kind==='project'||tags.includes('project'))return 'project';
  if(kind==='area'||tags.includes('area'))return 'area';
  if(['review','weekly-review','monthly-review'].includes(kind)||tags.includes('review'))return 'review';
  return null;
}
export function keepTasksFromHubNote(note:Note):KeepTask[] {
  const tasks:KeepTask[]=[];
  const fm=keepFrontmatter(note.body);
  const lines=note.body.split(/\r?\n/u);
  let fence: string|null=null, inMath=false, inFrontmatter=lines[0]?.trim()==='---', heading='';
  for(let i=0;i<lines.length;i++){
    const row=lines[i]!;
    if(inFrontmatter) {if(i>0&&row.trim()==='---')inFrontmatter=false;continue;}
    const marker=/^\s*([`~]{3,})/u.exec(row);
    if(marker){const ch=marker[1]![0]!;if(!fence)fence=ch;else if(fence===ch)fence=null;continue;}
    if(fence)continue;
    if(/^\s*\$\$\s*$/u.test(row)){inMath=!inMath;continue;}
    if(inMath)continue;
    const h=/^#{1,6}\s+(.+)$/u.exec(row);if(h){heading=h[1]!.trim();continue;}
    const m=/^(\s*)([-*+])\s+\[([ xX])\]\s*(.*)$/u.exec(row);if(!m)continue;
    const raw=m[4]??'',block=/\^([a-zA-Z0-9_-]+)$/u.exec(raw);
    const text=block?raw.slice(0,block.index).trim():raw.trim();
    const due=/@due\((\d{4}-\d{2}-\d{2})\)|due:(\d{4}-\d{2}-\d{2})|📅\s*(\d{4}-\d{2}-\d{2})/iu.exec(text);
    const date=due?.[1]??due?.[2]??due?.[3]??fm.due??fm.date;
    const rawPriority=/!(urgent|high|medium|med|low)\b/iu.exec(text)?.[1]?.toLowerCase();
    const priority=rawPriority==='med'?'medium':rawPriority;
    tasks.push({id:'task-'+note.id+'-'+i+'-'+hashString(text),
      noteId:note.id,line:i,rawLine:row,text,completed:m[3]!.toLowerCase()==='x',
      ...(block?.[1]?{blockId:block[1]}:{}),
      ...(date&&day(date)?{dueDate:date}:{}),
      ...(priority?{priority:priority as NonNullable<KeepTask['priority']>}:{}),
      ...(heading?{heading}:{})});
  }
  return tasks;
}
/** KEEP P49's explicit task-progress rule: do not invent progress without mode=tasks. */
export function deriveKeepProjectProgress(note:Note):KeepProjectProgress {
  const tasks=keepTasksFromHubNote(note);
  const total=tasks.length, completed=tasks.filter(t=>t.completed).length,open=total-completed;
  const pending=tasks.filter(t=>!t.completed);
  const nextAction=pending.find(t=>t.priority==='urgent'||t.priority==='high')??pending[0]??null;
  const meta=keepFrontmatter(note.body);
  return {tasks,total,completed,open,nextAction,percent:meta.progress==='tasks'?(total?Math.round(completed/total*100):0):null,canSuggestCompletion:total>0&&open===0};
}
/** Original line + source revision required: never fuzzy-match another task. */
export function toggleKeepTaskLine(note:Note,task:KeepTask):string|null {
  if(task.noteId!==note.id)return null;
  const lines=note.body.split(/\r?\n/u);
  if(lines[task.line]!==task.rawLine)return null;
  const marker=/^(\s*[-*+]\s+)\[([ xX])\]/u;
  if(!marker.test(lines[task.line]!))return null;
  lines[task.line]=lines[task.line]!.replace(marker,(_,prefix:string)=>prefix+(task.completed?'[ ]':'[x]'));
  return lines.join('\n');
}
