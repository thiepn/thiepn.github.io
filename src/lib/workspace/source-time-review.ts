/**
 * Ephemeral cross-owner visual comparison of independently consented Folio time blocks
 * and original Hub calendar events. Not a sync, availability lookup or durable relation.
 */
import { dayKey } from './model';
import type { FolioDeviceSnapshot } from './folio-device';
import type { CalendarEvent } from './types';

export interface CrossSourceCollision {
  hubEventId: string;
  hubTitle: string;
  folioEventId: string;
  folioTitle: string;
  minutes: number;
}
const start=(value:string)=>Date.parse(value);
/** Ignore all-day entries as they do not have a reliable timed availability interval. */
export function compareApprovedFolioTime(
  hubEvents:readonly CalendarEvent[], shared:FolioDeviceSnapshot|null,
):CrossSourceCollision[] {
  if (!shared) return [];
  const result: CrossSourceCollision[]=[];
  for (const hub of hubEvents) {
    if (hub.allDay || !Number.isFinite(start(hub.start)) || !Number.isFinite(start(hub.end))) continue;
    for (const owned of shared.events) {
      if (owned.allDay) continue;
      const beginning=Math.max(start(hub.start),start(owned.start));
      const ending=Math.min(start(hub.end),start(owned.end));
      if (!Number.isFinite(beginning) || !Number.isFinite(ending) || ending<=beginning) continue;
      result.push({hubEventId:hub.id,hubTitle:hub.title,folioEventId:owned.id,
        folioTitle:owned.title,minutes:Math.ceil((ending-beginning)/60000)});
    }
  }
  return result.slice(0,24);
}
export function folioWarningsForProposedEvent(
  candidate:CalendarEvent, shared:FolioDeviceSnapshot|null, zone:string,
):{timed:CrossSourceCollision[];allDayTitles:string[]} {
  if (!shared) return {timed:[],allDayTitles:[]};
  const timed=compareApprovedFolioTime([candidate],shared);
  const allDayTitles=shared.events.filter(event => event.allDay &&
    dayKey(zone,new Date(event.start))<=candidate.date &&
    dayKey(zone,new Date(event.end ? Date.parse(event.end)-1 : event.start))>=candidate.date)
    .slice(0,5).map(event=>event.title);
  return {timed,allDayTitles};
}
