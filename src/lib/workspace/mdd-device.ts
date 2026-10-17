/** Original MDD opt-in owner handoff. No database reads or retained grants.
 * Validate every daily row; never forward untrusted source fields.
 */
export const MDD_FD1_MESSAGE='thiepn.mdd.discipline.handoff.v1';
const NONCE=/^[a-f0-9]{32}$/;
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const day=(v:unknown):v is string=>typeof v==='string'&&
  /^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&
  new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export type MddReadingStatus='not-enrolled'|'no-assignment'|'assigned'|'history-unavailable';
export interface MddDayEvidence{
  date:string;reading:{status:MddReadingStatus;completed:number|null;assigned:number|null};
  reflection:{exists:boolean};
}
export interface MddWeekEvidence{
  from:string;through:string;dates:readonly MddDayEvidence[];
}
export interface MddDeviceSummary extends MddDayEvidence{
  observedAt:string;expiresAt:string;week?:MddWeekEvidence|null;
}
function readDay(source:unknown,historical:boolean):MddDayEvidence|null{
  if(!obj(source)||!day(source.date)||!obj(source.reading)||!obj(source.reflection)||
    typeof source.reflection.exists!=='boolean')return null;
  const r=source.reading;
  const status=r.status;
  if(!['assigned','not-enrolled','no-assignment',...(historical?['history-unavailable']:[])].includes(String(status)))return null;
  if(status==='assigned'){
    if(r.assigned!==4||!Number.isSafeInteger(r.completed)||Number(r.completed)<0||Number(r.completed)>4)return null;
  }else if(r.completed!==null||r.assigned!==null)return null;
  return {date:source.date,reading:{
    status:status as MddReadingStatus,assigned:r.assigned as number|null,completed:r.completed as number|null
  },reflection:{exists:source.reflection.exists}};
}
function readWeek(source:unknown,through:string):MddWeekEvidence|null{
  if(!obj(source)||source.schema!=='thiepn.mdd.discipline.week.local'||
    source.version!==1||source.coverage!=='device-local'||
    !day(source.from)||source.through!==through||!Array.isArray(source.dates)||source.dates.length!==7)return null;
  const days:MddDayEvidence[]=[];
  for(let i=0;i<7;i++){
    const row=readDay(source.dates[i],true);
    if(!row)return null;
    const target=new Date(through+'T12:00:00Z');
    target.setUTCDate(target.getUTCDate()-(6-i));
    if(row.date!==target.toISOString().slice(0,10))return null;
    days.push(row);
  }
  return source.from===days[0]!.date?{from:source.from,through,dates:days}:null;
}
export function acceptMddReply(raw:unknown,nonce:string,now=Date.now()):MddDeviceSummary|null{
  if(!obj(raw)||raw.type!==MDD_FD1_MESSAGE||raw.source!=='mdd-device-local'||
    !NONCE.test(nonce)||raw.nonce!==nonce||typeof raw.observedAt!=='string'||
    typeof raw.expiresAt!=='string')return null;
  const observed=Date.parse(raw.observedAt),expires=Date.parse(raw.expiresAt);
  if(!Number.isFinite(observed)||!Number.isFinite(expires)||observed>now+5000||
    observed<now-120000||expires<=now||expires>observed+60000)return null;
  const e=raw.evidence;
  if(!obj(e)||e.schema!=='thiepn.mdd.discipline.local'||e.version!==1||
    e.coverage!=='device-local')return null;
  const today=readDay(e,false);
  if(!today)return null;
  const week=e.week===undefined?null:readWeek(e.week,today.date);
  // A supplied invalid week is not silently accepted as a weaker daily record.
  if(e.week!==undefined&&!week)return null;
  // Same-day row must reflect the identical owner evidence, or decline the handoff.
  const last=week?.dates[6];
  if(last&&JSON.stringify(last)!==JSON.stringify(today))return null;
  return {...today,observedAt:raw.observedAt,expiresAt:raw.expiresAt,week};
}
