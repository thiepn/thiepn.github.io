import type {WorkspaceState} from './types';
import type {FolioDeviceSnapshot} from './folio-device';
import type {NotesDeviceSummary} from './notes-device';
import {freshFolioPlanningShare} from './folio-continuity';
import {freshNotesReminderShare} from './notes-reminder-continuity';

export interface LegacyReconciliationPreview {
  readonly status:'no-share'|'partial-preview';
  readonly rows:number;
  readonly possibleSameTitle:number;
  readonly sameIdAcrossOwners:number;
  readonly incomplete:true;
  readonly importable:0;
}
/**
 * Explicit one-tab title-only inventory. No original body, attachment, vault,
 * completed history or source CAS is included in the limited owner shares.
 * Therefore it cannot authorize or execute any import.
 */
export function previewLegacyReconciliation(
  state:Pick<WorkspaceState,'tasks'|'notes'|'events'|'trackers'>,
  folio:FolioDeviceSnapshot|null,notes:NotesDeviceSummary|null,now=Date.now(),
):LegacyReconciliationPreview {
  const f=freshFolioPlanningShare(folio,now),n=freshNotesReminderShare(notes,now);
  const owners=[
    ...(f?[
      ...f.tasks.map(x=>({kind:'task',id:x.id,title:x.title})),
      ...f.events.map(x=>({kind:'event',id:x.id,title:x.title})),
      ...f.notes.map(x=>({kind:'note',id:x.id,title:x.title})),
      ...f.habits.map(x=>({kind:'tracker',id:x.id,title:x.title})),
    ]:[]),
    ...(n?[
      ...n.notes.map(x=>({kind:'note',id:x.id,title:x.title})),
      ...n.reminders.map(x=>({kind:'reminder',id:x.id,title:x.title})),
    ]:[]),
  ];
  const canonical=[
    ...state.tasks.map(x=>({kind:'task',id:x.id,title:x.title})),
    ...state.events.map(x=>({kind:'event',id:x.id,title:x.title})),
    ...state.notes.map(x=>({kind:'note',id:x.id,title:x.title})),
    ...state.trackers.map(x=>({kind:'tracker',id:x.id,title:x.title})),
  ];
  const signature=(x:{kind:string;title:string})=>x.kind+'\u0000'+x.title.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/gu,' ');
  const canonNames=new Set(canonical.map(signature));
  const canonIds=new Set(canonical.map(x=>x.id));
  return {
    status:f||n?'partial-preview':'no-share',
    rows:owners.length,
    possibleSameTitle:owners.filter(x=>canonNames.has(signature(x))).length,
    sameIdAcrossOwners:owners.filter(x=>canonIds.has(x.id)).length,
    incomplete:true,
    importable:0,
  };
}
export function renderLegacyReconciliation(report:LegacyReconciliationPreview):string {
  return '<section class="ws-surface" data-legacy-preview aria-labelledby="legacy-review-heading">'+
    '<h3 id="legacy-review-heading">Migration readiness</h3>'+
    (report.status==='no-share'
      ?'<p>No verified owner summaries are shared in this tab.</p>'
      :'<p>'+report.rows+' bounded source references reviewed · '+
        report.possibleSameTitle+' possible same-title matches · '+
        report.sameIdAcrossOwners+' matching IDs across separate owners</p>')+
    '<p>No records can be imported from these limited summaries. Original export, exact data provenance, attachments, encrypted-vault handling, conflict resolution and an independently verified backup are still required.</p>'+
    '<p>No source data was changed.</p></section>';
}
