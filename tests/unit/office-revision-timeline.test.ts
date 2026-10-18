import {describe,it,expect} from 'vitest';
import {newDocument,nextDocument} from '../../src/lib/office/documents';
import {officeRevisionTimeline,timelineExcerpt,TIMELINE_PREVIEW_LINES} from '../../src/lib/office/revision-timeline';
const stamp='2026-10-18T18:00:00.000Z';
describe('Office O13 native source revision timeline',()=>{
 it('shows current and historical revisions newest-first with exact original IDs',()=>{
  const base=newDocument('original-uuid',stamp);
  const first=nextDocument(base,0,'Old title','# Original',stamp);
  const second=nextDocument(first,1,'Changed title','# Changed\nText',stamp);
  const rows=officeRevisionTimeline(second);
  expect(rows.map(row=>row.revision)).toEqual([2,1,0]);
  expect(rows[0]).toMatchObject({historical:false,title:'Changed title',lines:2});
  expect(rows[1]).toMatchObject({historical:true,title:'Old title',changedSpan:2,titleChanged:true});
  expect(rows[2].revision).toBe(0);
  expect(second.history.map(row=>row.revision)).toEqual([0,1]);
 });
 it('does not invent missing older history after canonical retention',()=>{
  let doc=newDocument('original-uuid',stamp);
  for(let i=1;i<=20;i++)doc=nextDocument(doc,doc.revision,'Title '+i,'body '+i,stamp);
  const rows=officeRevisionTimeline(doc);
  expect(rows).toHaveLength(13);
  expect(rows[0].revision).toBe(20);
  expect(rows[rows.length-1]?.revision).toBe(8);
 });
 it('presents literal Markdown without interpreting malicious source',()=>{
  const preview=timelineExcerpt('# Notes\n<script>unsafe()</script>\nEnd');
  expect(preview.text).toContain('<script>unsafe()</script>');
  expect(preview).toMatchObject({shownLines:3,totalLines:3,truncated:false});
 });
 it('bounds preview and reports truncation without cutting underlying data',()=>{
  const preview=timelineExcerpt(Array.from({length:TIMELINE_PREVIEW_LINES+15},(_,i)=>'line '+i).join('\n'));
  expect(preview.truncated).toBe(true);
  expect(preview.shownLines).toBe(TIMELINE_PREVIEW_LINES);
  expect(preview.totalLines).toBe(TIMELINE_PREVIEW_LINES+15);
  const long=timelineExcerpt('x'.repeat(9000));
  expect(long.text.length).toBe(5000);
  expect(long.truncated).toBe(true);
 });
});
