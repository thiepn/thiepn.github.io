import { addDays, dayKey, validDate, weekDays, zonedInstant } from './model';
import type { CalendarEvent, Task, WorkspaceState } from './types';

export type AgendaMode = 'day' | 'week';
export interface DayPlan {
    date: string;
    events: CalendarEvent[];
    timed: CalendarEvent[];
    allDay: CalendarEvent[];
    deadlines: Task[];
    overdue: Task[];
    inboxCount: number;
    overlaps: EventOverlap[];
}
export interface EventOverlap { first: string; second: string; minutes: number; }
const priority = { high: 0, medium: 1, low: 2, none: 3 } as const;
const instant = (iso:string) => Date.parse(iso);
const startDay = (e: CalendarEvent,zone:string) => e.allDay ? e.date : dayKey(zone,new Date(e.start));
const endDay = (e: CalendarEvent,zone:string) => e.allDay ? e.endDate :
    dayKey(zone,new Date(instant(e.end)-1)); // End is exclusive: midnight does not occupy the next day.
const contains = (e:CalendarEvent,day:string,zone:string) =>
    startDay(e,zone)<=day && endDay(e,zone)>=day;

/** Read-only potential overlap of timed local Hub events. All-day events are listed separately. */
export function timedOverlaps(events:readonly CalendarEvent[]):EventOverlap[] {
    const timed = events.filter(e=>!e.allDay && Number.isFinite(instant(e.start)) &&
        Number.isFinite(instant(e.end)) && instant(e.end)>instant(e.start));
    const pairs: EventOverlap[]=[];
    for(let i=0;i<timed.length;i++)for(let j=i+1;j<timed.length;j++){
        const a=timed[i]!, b=timed[j]!;
        const minutes=Math.ceil((Math.min(instant(a.end),instant(b.end))-
            Math.max(instant(a.start),instant(b.start)))/60000);
        if(minutes>0)pairs.push({first:a.id,second:b.id,minutes});
    }
    return pairs;
}
export function overlapsForEvent(existing:readonly CalendarEvent[], candidate:CalendarEvent):EventOverlap[] {
    return timedOverlaps([...existing.filter(e=>e.id!==candidate.id),candidate])
        .filter(pair=>pair.first===candidate.id||pair.second===candidate.id);
}
/** Task due date is a deadline, never a reserved time slot. */
export function reviewDay(state:WorkspaceState,date:string):DayPlan {
    const zone=state.preferences.timezone;
    const events=state.events.filter(e=>contains(e,date,zone));
    const byTime=(a:CalendarEvent,b:CalendarEvent)=>
        a.start.localeCompare(b.start)||a.title.localeCompare(b.title);
    const timed=events.filter(e=>!e.allDay).sort(byTime);
    const allDay=events.filter(e=>e.allDay).sort((a,b)=>a.title.localeCompare(b.title));
    const deadlines=state.tasks.filter(t=>!t.completedAt && t.due===date)
        .sort((a,b)=>priority[a.priority]-priority[b.priority]||a.time.localeCompare(b.time)||a.title.localeCompare(b.title));
    const overdue=state.tasks.filter(t=>!t.completedAt && !!t.due && t.due<date)
        .sort((a,b)=>a.due.localeCompare(b.due)||priority[a.priority]-priority[b.priority]||a.title.localeCompare(b.title));
    const inboxCount=state.tasks.filter(t=>!t.completedAt&&!t.due).length;
    const overlaps=timedOverlaps(timed).filter(pair=>{
        const a=timed.find(event=>event.id===pair.first)!;
        const b=timed.find(event=>event.id===pair.second)!;
        const intersectionStart=Math.max(instant(a.start),instant(b.start));
        const intersectionEnd=Math.min(instant(a.end),instant(b.end))-1; // Timed interval is end-exclusive.
        return dayKey(zone,new Date(intersectionStart))<=date &&
            dayKey(zone,new Date(intersectionEnd))>=date;
    });
    return {date,events,timed,allDay,deadlines,overdue,inboxCount,overlaps};
}
export function reviewWeek(state:WorkspaceState,anchor:string):DayPlan[] {
    return weekDays(anchor).map(date=>reviewDay(state,date));
}
export function getWeekAnchor(anchor:string,delta:number):string {
    return addDays(anchor,delta*7);
}
export interface MoveEventRequest {
    date:string;
    endDate:string;
    startTime:string;
    endTime:string;
    allDay:boolean;
    confirmed:boolean;
}
/**
 * Same ID, title and owner; only the explicit local date/time fields can change.
 * Uses the original zonedInstant DST validation and no parallel scheduling authority.
 */
export function reviewedEventMove(original:CalendarEvent,request:MoveEventRequest,zone:string):CalendarEvent {
    if(!request.confirmed)throw new Error('Confirm the event time change explicitly.');
    if(!validDate(request.date)||!validDate(request.endDate)||request.endDate<request.date)
        throw new Error('Choose a valid event date range.');
    if(request.allDay)
        return {...original,date:request.date,endDate:request.endDate,start:'',end:'',zone,allDay:true};
    const start=zonedInstant(request.date,request.startTime,zone);
    const end=zonedInstant(request.endDate,request.endTime,zone);
    if(instant(end)<=instant(start))
        throw new Error('The end must follow the start in the selected timezone.');
    return {...original,date:request.date,endDate:request.endDate,start,end,zone,allDay:false};
}
