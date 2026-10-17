import type { FolioDeviceSnapshot } from './folio-device';
import type { MddDeviceSummary } from './mdd-device';
import type { FaithTmsDue } from './faith-source-session';

/** Cross-app review guidance over *current authorized observations*.
 * A Today projection is NOT a seven-day history and must never be scored.
 * No private note bodies, prayer text, IDs or source snapshots are persisted.
 */
export interface FaithReviewSignal { source:'folio'|'mdd'|'tms60'; status:'available'|'unavailable'; detail:string; }
export function buildFaithReviewSignals(input:{
  folio:FolioDeviceSnapshot|null;
  mdd:MddDeviceSummary|null;
  tms:FaithTmsDue|null;
},now=Date.now()):FaithReviewSignal[]{
  const {folio,mdd,tms}=input;
  const freshFolio=folio&&Number.isFinite(Date.parse(folio.generatedAt))&&
    Math.abs(now-Date.parse(folio.generatedAt))<=300000?folio:null;
  const freshMdd=mdd&&Date.parse(mdd.expiresAt)>now?mdd:null;
  const freshTms=tms&&Date.parse(tms.expiresAt)>now?tms:null;
  return [
    freshFolio?{
      source:'folio',status:'available',detail:`Folio observation for ${freshFolio.date}: ${freshFolio.habits.filter(h=>h.status==='completed').length} recorded among ${freshFolio.habits.length} explicitly shared habits. Not a weekly total or proof of spiritual growth.`
    }:{source:'folio',status:'unavailable',detail:'Folio history: not authorized or not fresh here. Open the original Folio weekly review.'},
    freshMdd?{
      source:'mdd',status:'available',detail:freshMdd.week?(()=>{
        const rows=freshMdd.week.dates,assigned=rows.filter(row=>row.reading.status==='assigned');
        const observed=assigned.reduce((acc,row)=>acc+Number(row.reading.completed),0);
        const reflectionDays=rows.filter(row=>row.reflection.exists).length;
        const unavailable=rows.filter(row=>row.reading.status==='history-unavailable').length;
        return `Original MDD ${freshMdd.week.from}–${freshMdd.week.through}: ${observed} of ${assigned.length*4} assigned passages currently marked complete across ${assigned.length} dated assignments; reflection recorded on ${reflectionDays} of 7 dates.`+
          (unavailable?` ${unavailable} self-paced historical date(s) unavailable.`:'')+
          ' This is an observed seven-date status, not a completion-time log or spiritual score.';
      })():(freshMdd.reading.status==='assigned'
        ?`Original MDD reading for ${freshMdd.date}: ${freshMdd.reading.completed} of ${freshMdd.reading.assigned} passages; reflection ${freshMdd.reflection.exists?'recorded':'not recorded'}. One-day snapshot only.`
        :`Original MDD: no assigned reading for ${freshMdd.date}; reflection ${freshMdd.reflection.exists?'recorded':'not recorded'}. One-day snapshot only.`)
    }:{source:'mdd',status:'unavailable',detail:'MDD reading and reflection: no currently approved one-time device summary.'},
    freshTms?{
      source:'tms60',status:'available',detail:`TMS60 synced snapshot: ${freshTms.dueTaskCount} currently due review tasks across ${freshTms.dueVerseCount} verses. This is not a weekly-completion measure.`
    }:{source:'tms60',status:'unavailable',detail:'TMS60 review: no currently authorized, unexpired synced summary.'}
  ];
}
