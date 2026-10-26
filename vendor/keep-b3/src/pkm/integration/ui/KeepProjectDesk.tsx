/** KEEP B3: project, study and dated-work dashboard over original source records. */
import React, {useMemo, useState} from 'react';
import {ArrowUpRight, CalendarDays, GraduationCap, ListChecks, FolderKanban, Link2} from 'lucide-react';
import type {VaultIndex} from '../../types';
import type {ProjectRecord, GoalRecord, AreaRecord} from '../../planning/planningTypes';
import type {DiscoveryIndex, DiscoveryRow} from '../keepDiscoveryModel';
import type {KeepResourceLink} from '../resourceLinks';
import {buildProjectContext, buildKeepPlanningDays, keepLocalDate} from '../keepProjectContext';

interface Props {
  index: DiscoveryIndex;
  projects: readonly ProjectRecord[];
  goals: readonly GoalRecord[];
  areas: readonly AreaRecord[];
  links: readonly KeepResourceLink[];
  graph?: VaultIndex;
  onOpenNote: (noteId:string,line?:number)=>void;
  onCompleteTask: (row:DiscoveryRow)=>void;
  onRescheduleTask: (row:DiscoveryRow,day:string)=>void;
  busy?: boolean;
  onOpenCalendar: ()=>void;
  onOpenTasks: ()=>void;
  onInspectProject: (id:string)=>void;
}
const btn='border border-stone-300 dark:border-stone-700 rounded-md px-2.5 py-1.5 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-amber-600';
const DatedTask:React.FC<{row:DiscoveryRow;busy:boolean;open:(id:string,line?:number)=>void;complete:(row:DiscoveryRow)=>void;reschedule:(row:DiscoveryRow,day:string)=>void;}>=({row,busy,open,complete,reschedule})=>{
  const [day,setDay]=useState(row.dueDate||'');
  React.useEffect(()=>setDay(row.dueDate||''),[row.key,row.dueDate]);
  return <div className="flex flex-wrap gap-1.5 items-center text-xs border-b border-stone-200 dark:border-stone-800 pb-1.5">
    <button className="text-left underline min-w-24 flex-1" onClick={()=>open(row.noteId,row.line)}>{row.title}</button>
    {row.line!==undefined&&<><label className="sr-only" htmlFor={`due-${row.key}`}>Due date for {row.title}</label><input id={`due-${row.key}`} type="date" value={day} onChange={e=>setDay(e.target.value)} className="max-w-36 bg-transparent border border-stone-300 dark:border-stone-700 rounded px-1 py-1"/><button className={btn} disabled={busy||!day||day===row.dueDate} onClick={()=>reschedule(row,day)}>Set date</button><button className={btn} disabled={busy} onClick={()=>complete(row)}>Done</button></>}
  </div>;
};
export const KeepProjectDesk: React.FC<Props> = ({index,projects,goals,areas,links,graph,onOpenNote,onCompleteTask,onRescheduleTask,busy=false,onOpenCalendar,onOpenTasks,onInspectProject})=>{
  const [areaId,setAreaId]=useState('');
  const [projectId,setProjectId]=useState('');
  const currentProjects=useMemo(()=>projects.filter(p=>index.noteById.has(p.noteId)&&(!areaId||p.areaId===areaId)),[projects,index,areaId]);
  const selectedProject=currentProjects.find(p=>p.noteId===projectId)||currentProjects[0];
  const project=useMemo(()=>selectedProject?buildProjectContext(selectedProject.noteId,index,projects,goals,areas,links,graph):null,[selectedProject,index,projects,goals,areas,links,graph]);
  const days=useMemo(()=>buildKeepPlanningDays(index,keepLocalDate(),14),[index]);
  const activeProjects=currentProjects.filter(p=>!['cancelled','completed'].includes(p.status));
  const openTasks=project?.tasks.filter(t=>!t.completed)||[];
  return <div className="space-y-4" aria-label="KEEP source-backed project desk">
    <section className="border-y border-stone-200 dark:border-stone-800 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><div><h3 className="font-semibold text-base flex gap-2 items-center"><FolderKanban size={17}/> Project desk</h3><p className="text-xs text-stone-500">Projects, study materials and actions linked to your actual KEEP notes.</p></div><div className="flex gap-2"><button className={btn} onClick={onOpenTasks}><ListChecks size={13} className="inline mr-1"/> Agenda</button><button className={btn} onClick={onOpenCalendar}><CalendarDays size={13} className="inline mr-1"/> Calendar</button></div></div>
      <div className="flex flex-wrap gap-2 items-center mb-3"><label className="text-xs text-stone-600 dark:text-stone-400">Area <select aria-label="Filter projects by canonical area" value={areaId} onChange={e=>{setAreaId(e.target.value);setProjectId('');}} className={`${btn} ml-2 bg-transparent`}><option value="">All areas</option>{areas.filter(a=>index.noteById.has(a.noteId)).map(a=><option value={a.noteId} key={a.noteId}>{a.title}</option>)}</select></label><span className="text-xs text-stone-500">{activeProjects.length} unfinished of {currentProjects.length} source projects</span></div>
      {currentProjects.length===0?<p className="p-3 text-sm text-stone-500">No source-backed projects in this area. Create a KEEP note with <code>type: project</code> frontmatter and link it to an Area to build this desk.</p>:<div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,0.36fr)_minmax(0,1fr)] gap-4">
        <div className="max-h-96 overflow-auto space-y-1" role="list" aria-label="Projects">
          {currentProjects.map(p=><div role="listitem" key={p.noteId}><button aria-pressed={p.noteId===selectedProject?.noteId} className={`w-full text-left border rounded-md p-2.5 ${p.noteId===selectedProject?.noteId?'border-amber-600 bg-amber-50/40 dark:bg-stone-900':'border-stone-200 dark:border-stone-800'}`} onClick={()=>setProjectId(p.noteId)}><span className="text-[11px] uppercase text-stone-500">{p.status} · {p.areaTitle||'No area'}{p.due?` · Due ${p.due}`:''}</span><strong className="text-sm block truncate">{p.title}</strong><span className="text-xs text-stone-500">{p.progressText||`${p.openTasksCount} open source tasks`}</span></button></div>)}
        </div>
        {project&&<article className="min-w-0 space-y-3" aria-label="Selected project details">
          <div className="flex items-start justify-between gap-3"><div><div className="text-[11px] uppercase tracking-wide text-stone-500">{project.status.replaceAll('-',' ')} · {project.project.status}</div><h4 className="text-lg font-semibold break-words">{project.project.title}</h4><p className="text-xs text-stone-500">{project.area?.title||project.project.areaTitle||'No area assigned'}{project.goals.length?` · ${project.goals.length} verified goals`:''}</p></div><div className="flex flex-wrap gap-1"><button className={btn} onClick={()=>onInspectProject(project.project.noteId)}>Inspect relationships</button><button className={btn} onClick={()=>onOpenNote(project.project.noteId)}>Open note <ArrowUpRight size={12} className="inline"/></button></div></div>
          {project.project.progressPercent!==null && project.project.progressPercent!==undefined&&<div><div className="text-xs mb-1">{project.project.progressText||`${project.project.progressPercent}%`} · source progress</div><progress aria-label="Project progress" className="w-full" max="100" value={Math.max(0,Math.min(100,project.project.progressPercent))}/></div>}
          {project.goals.length>0&&<div><h5 className="text-xs font-medium">Related goals</h5><div className="flex flex-wrap gap-1.5 mt-1">{project.goals.map(g=><button className={btn} key={g.noteId} onClick={()=>onOpenNote(g.noteId)}>{g.title}</button>)}</div></div>}
          <div className="grid sm:grid-cols-2 gap-3"><div><h5 className="text-xs uppercase font-semibold flex items-center gap-1 mb-2"><ListChecks size={14}/> Source tasks ({openTasks.length} open)</h5><div className="space-y-1 max-h-56 overflow-auto">{openTasks.slice(0,18).map(t=><DatedTask key={t.key} row={t} busy={busy} open={onOpenNote} complete={onCompleteTask} reschedule={onRescheduleTask}/>)}{!openTasks.length&&<p className="text-xs text-stone-500">No open tasks in this project or its explicitly linked knowledge notes.</p>}{openTasks.length>18&&<p className="text-xs text-stone-500">First 18 shown. Open Agenda for the complete source list.</p>}</div></div>
            <div><h5 className="text-xs uppercase font-semibold flex items-center gap-1 mb-2"><GraduationCap size={14}/> Linked knowledge / study materials ({project.linkedNotes.length})</h5><div className="space-y-1 max-h-56 overflow-auto">{project.linkedNotes.slice(0,18).map(n=><button className="text-left text-xs underline block border-b border-stone-200 dark:border-stone-800 pb-1.5 w-full" key={n.key} onClick={()=>onOpenNote(n.noteId)}>{n.title}<span className="text-stone-500 block truncate no-underline">{n.summary}</span></button>)}{!project.linkedNotes.length&&<p className="text-xs text-stone-500">Link a reading, lecture or research note to this project using Wikilinks or the context inspector. KEEP does not infer membership from folder names.</p>}</div></div></div>
          <div><h5 className="text-xs uppercase font-semibold flex items-center gap-1 mb-1"><CalendarDays size={14}/> Dated commitments ({project.upcoming.length})</h5><div className="flex flex-wrap gap-1.5">{project.upcoming.slice(0,12).map(t=><button key={t.key} onClick={()=>onOpenNote(t.noteId,t.line)} className={`${btn} text-left ${t.overdue?'border-red-400 dark:border-red-700':''}`}>{t.day} · {t.kind.replaceAll('-',' ')} · {t.title}</button>)}{!project.upcoming.length&&<p className="text-xs text-stone-500">No dated project tasks, deadline or note reminders.</p>}</div>{project.undatedOpenTasks>0&&<p className="text-xs mt-1 text-stone-500">{project.undatedOpenTasks} open tasks have no date; they are not placed onto the calendar.</p>}</div>
          <p className="text-[11px] text-stone-500"><Link2 size={12} className="inline mr-1"/>Related material is found from canonical note links, checked Wikilinks or explicit resource relationships. External providers are not synchronized.</p>
        </article>}
      </div>}
    </section>
    <section aria-label="Next fourteen days of KEEP tasks and reminders"><div className="flex flex-wrap justify-between gap-2 mb-2"><h3 className="font-semibold text-sm">Next 14 days — KEEP source preview</h3><button className={btn} onClick={onOpenCalendar}>Open real calendar</button></div><div className="flex gap-2 overflow-x-auto pb-2">{days.filter(d=>d.tasks.length||d.projects.length||d.reminders.length).slice(0,14).map(d=><div key={d.day} className="border border-stone-200 dark:border-stone-800 rounded-md p-2 min-w-48 max-w-56"><h4 className="text-xs font-semibold mb-2">{d.day}</h4>{d.tasks.slice(0,4).map(t=><button key={t.key} onClick={()=>onOpenNote(t.noteId,t.line)} className="block text-xs text-left underline mb-1 truncate max-w-full">Task: {t.title}</button>)}{d.projects.map(p=><button key={p.key} onClick={()=>onOpenNote(p.noteId)} className="block text-xs text-left underline mb-1 truncate max-w-full">Deadline: {p.title}</button>)}{d.reminders.map(n=><button key={n.noteId} onClick={()=>onOpenNote(n.noteId)} className="block text-xs text-left underline mb-1 truncate max-w-full">Reminder: {n.title}</button>)}{d.tasks.length>4&&<span className="text-[10px] text-stone-500">+{d.tasks.length-4} more in Agenda</span>}</div>)}{!days.some(d=>d.tasks.length||d.projects.length||d.reminders.length)&&<p className="text-xs text-stone-500">No dated KEEP tasks, project deadlines or note reminders in the next 14 days. This is not a live Folio or Calendar feed.</p>}</div></section>
  </div>;
};
