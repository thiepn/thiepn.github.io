import {describe,it,expect} from 'vitest';
import {newDocument,nextDocument} from '../../src/lib/office/documents';
import {searchOfficeHistory,compareOfficeSavedVersions,MAX_HISTORY_QUERY} from '../../src/lib/office/history-explorer';
const at='2026-10-18T18:00:00Z';
function document(){
 const a=newDocument('original-office-id',at);
 const b=nextDocument(a,0,'Draft sources','## Alpha\nfirst terminology',at);
 const c=nextDocument(b,1,'Second revision','## Beta\n한국어 old',at);
 return nextDocument(c,2,'Final revision','## Beta\n한국어 new',at);
}
describe('Office O14 source-only history search and cross-revision comparison',()=>{
 it('searches original saved title and Markdown, returns real revision numbers newest first',()=>{
  const doc=document();
  expect(searchOfficeHistory(doc,'').map(x=>x.revision)).toEqual([3,2,1,0]);
  expect(searchOfficeHistory(doc,'sources').map(x=>[x.revision,x.match])).toEqual([[1,'title']]);
  expect(searchOfficeHistory(doc,'한국어').map(x=>x.revision)).toEqual([3,2]);
  expect(searchOfficeHistory(doc,'ALPHA').map(x=>x.revision)).toEqual([1]);
  expect(searchOfficeHistory(doc,'ALPHA',true)).toEqual([]);
 });
 it('returns bounded inert source snippets, never interprets HTML',()=>{
  const before=nextDocument(newDocument('id',at),0,'Subject','prefix <script>alert(1)</script> suffix',at);
  const result=searchOfficeHistory(before,'<script>');
  expect(result).toHaveLength(1);
  expect(result[0]?.snippet).toContain('<script>alert(1)</script>');
  expect(result[0]!.snippet.length).toBeLessThanOrEqual(160);
  expect(()=>searchOfficeHistory(before,'q'.repeat(MAX_HISTORY_QUERY+1))).toThrow('120');
 });
 it('compares arbitrary two original retained versions without mutating source',()=>{
  const doc=document(),before=JSON.stringify(doc);
  const pair=compareOfficeSavedVersions(doc,1,3);
  expect(pair).toMatchObject({leftRevision:1,rightRevision:3,leftTitle:'Draft sources',rightTitle:'Final revision',titleChanged:true,identicalBodies:false});
  expect(pair.hunks.length).toBeGreaterThan(0);
  expect(JSON.stringify(doc)).toBe(before);
  expect(compareOfficeSavedVersions(doc,2,3).hunks[0]?.historicalSample.join(' ')).toContain('old');
 });
 it('rejects same or missing retained revisions, including pruned history',()=>{
  const doc=document();
  expect(()=>compareOfficeSavedVersions(doc,2,2)).toThrow('different');
  expect(()=>compareOfficeSavedVersions(doc,1,99)).toThrow('no longer retained');
  let current=doc;
  for(let i=0;i<15;i++)current=nextDocument(current,current.revision,'Update '+i,'body '+i,at);
  expect(()=>compareOfficeSavedVersions(current,1,current.revision)).toThrow('no longer retained');
 });
 it('provides explicit approximate fallback for large revisions without unbounded DP',()=>{
  const left='old\n'+Array.from({length:810},(_,i)=>'same '+i).join('\n');
  const right='new\n'+Array.from({length:810},(_,i)=>'same '+i).join('\n');
  const doc=nextDocument(nextDocument(newDocument('id',at),0,'Old',left,at),1,'New',right,at);
  const pair=compareOfficeSavedVersions(doc,1,2);
  expect(pair.summaryOnly).toBe(true);
  expect(pair.hunks).toHaveLength(1);
 });
});
