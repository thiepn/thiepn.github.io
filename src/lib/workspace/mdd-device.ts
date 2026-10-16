/** One-shot receiver for the original My Daily Devotion user-click handoff.
 * No source database access, sync, journal text or retained permission.
 */
export const MDD_FD1_MESSAGE='thiepn.mdd.discipline.handoff.v1';
const NONCE=/^[a-f0-9]{32}$/;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export interface MddDeviceSummary {
  date:string;observedAt:string;expiresAt:string;
  reading:{status:'not-enrolled'|'no-assignment'|'assigned';completed:number|null;assigned:number|null};
  reflection:{exists:boolean};
}
export function acceptMddReply(raw:unknown,nonce:string,now=Date.now()):MddDeviceSummary|null{
  if(!obj(raw)||raw.type!==MDD_FD1_MESSAGE||raw.source!=='mdd-device-local'||
    !NONCE.test(nonce)||raw.nonce!==nonce||typeof raw.observedAt!=='string'||
    typeof raw.expiresAt!=='string')return null;
  const observed=Date.parse(raw.observedAt),expires=Date.parse(raw.expiresAt);
  if(!Number.isFinite(observed)||!Number.isFinite(expires)||observed>now+5000||
    expires<=now||expires>observed+60000)return null;
  const e=raw.evidence;
  if(!obj(e)||e.schema!=='thiepn.mdd.discipline.local'||e.version!==1||
    e.coverage!=='device-local'||typeof e.date!=='string'||!DAY.test(e.date))return null;
  const r=e.reading,f=e.reflection;
  if(!obj(r)||!obj(f)||typeof f.exists!=='boolean')return null;
  if(!['assigned','not-enrolled','no-assignment'].includes(String(r.status)))return null;
  if(r.status==='assigned'){
    if(r.assigned!==4||!Number.isSafeInteger(r.completed)||Number(r.completed)<0||Number(r.completed)>4)return null;
  }else if(r.completed!==null||r.assigned!==null)return null;
  return {
    date:e.date,observedAt:raw.observedAt,expiresAt:raw.expiresAt,
    reading:{status:r.status as MddDeviceSummary['reading']['status'],completed:r.completed as number|null,assigned:r.assigned as number|null},
    reflection:{exists:f.exists},
  };
}
