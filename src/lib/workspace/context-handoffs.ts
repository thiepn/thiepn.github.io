import { validDate, zonedInstant } from './model';
import { uid, type Task, type Note, type CalendarEvent } from './types';

export type WorkOrigin = { kind: 'task' | 'note' | 'event'; id: string; epoch: number };
export type CalendarProposal = {
    taskId: string;
    title: string;
    date: string;
    time: string;
    duration: number;
    allDay: boolean;
    confirmed: boolean;
};
export type ReviewableCalendarEvent = { event: CalendarEvent; sourceTaskId: string };

/** Only a reviewed, confirmed local Hub event can be prepared. No links are persisted. */
export function prepareTaskCalendarEvent(task: Task, proposal: CalendarProposal, zone: string): ReviewableCalendarEvent {
    if (task.id !== proposal.taskId || task.title !== proposal.title || task.completedAt)
        throw new Error('The source task changed or was completed. Reopen planning before creating an event.');
    if (!proposal.confirmed)
        throw new Error('Review and explicitly confirm the separate local calendar event.');
    if (!validDate(proposal.date))
        throw new Error('Choose a valid date for this local event.');
    if (!proposal.title.trim() || proposal.title.length > 240)
        throw new Error('The event title is invalid.');
    if (![30, 45, 60, 90, 120].includes(proposal.duration))
        throw new Error('Choose a supported event duration.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(proposal.time))
        throw new Error('Choose a valid start time.');
    if (proposal.allDay)
        return { sourceTaskId: task.id, event: {
            id: uid(), title: proposal.title, date: proposal.date, endDate: proposal.date,
            start: '', end: '', zone, allDay: true,
        } };
    const [hour, minute] = proposal.time.split(':').map(Number);
    const endMinutes = hour! * 60 + minute! + proposal.duration;
    if (endMinutes >= 1440)
        throw new Error('This event would cross midnight. Choose an earlier start time.');
    const endTime = String(Math.floor(endMinutes/60)).padStart(2,'0')+':'+String(endMinutes%60).padStart(2,'0');
    const start = zonedInstant(proposal.date, proposal.time, zone);
    const end = zonedInstant(proposal.date, endTime, zone);
    if (Date.parse(end) <= Date.parse(start))
        throw new Error('The selected local time is ambiguous around a clock change. Choose a different time.');
    return { sourceTaskId: task.id, event: {
        id: uid(), title: proposal.title, date: proposal.date, endDate: proposal.date,
        start, end, zone, allDay: false,
    }};
}

/** Reject repeated identical slots without creating an event-to-task relation. */
export function identicalLocalEvent(existing: readonly CalendarEvent[], candidate: CalendarEvent): boolean {
    return existing.some(item => item.title === candidate.title &&
        item.date === candidate.date && item.endDate === candidate.endDate &&
        item.allDay === candidate.allDay && item.start === candidate.start &&
        item.end === candidate.end && item.zone === candidate.zone);
}
export function taskNoteSeed(task:Task): {title:string;body:string} {
    return {title:task.title.slice(0,240),
        body:task.notes.trim() ? 'Task context copied in Hub:\n'+task.notes.trim()+'\n\nWorking notes:\n' : 'Working notes:\n'};
}
export function noteTaskSeed(note:Note): {title:string;notes:string} {
    return {title:note.title.slice(0,240),notes:note.body.trim().slice(0,2000)};
}
