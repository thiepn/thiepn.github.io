import {MAX_BODY} from './documents';
import {visibleLines} from './footnotes';
import {officeTableCells,officeTableDivider} from './markdown';

export const MAX_OFFICE_TABLES=20;
export const MAX_OFFICE_TABLE_ROWS=40;
export const MAX_OFFICE_TABLE_COLUMNS=8;
export type OfficeTableAction='cell'|'append-row'|'delete-row';
export interface OfficeTableRow{offset:number;line:number;raw:string;ending:string;cells:string[]}
export interface OfficeSourceTable{offset:number;line:number;headers:string[];rows:OfficeTableRow[];newline:string}
export interface OfficeTableEdit{value:string;action:OfficeTableAction;tableLine:number;rowCount:number}

function canonical(line:string):boolean{
 return /^\s*\|.*\|\s*$/.test(line)&&!line.includes('\\|')&&!line.includes('\x60');
}
function cells(line:string,width:number):string[]{
 if(!canonical(line))throw new Error('Table requires ordinary pipe-delimited cells, without escaped pipes or inline code.');
 const out=officeTableCells(line);
 if(out.length!==width)throw new Error('Original table rows must have the same column count.');
 return out;
}
function safeCell(value:string):string{
 if(typeof value!=='string'||value.length>240||/[|\r\n\x00-\x1f\x7f\x60]/.test(value))
  throw new Error('Table cell must be at most 240 characters without pipes, newlines or control characters.');
 return value.trim();
}
/** Only genuine Markdown tables under the existing inert preview's divider rule. */
export function reviewOfficeTables(source:string):OfficeSourceTable[]{
 if(source.length>MAX_BODY)throw new Error('Office source exceeds 200,000 characters.');
 const lines:OfficeTableRow[]=[];
 visibleLines(source,(raw,offset,line)=>{
  if(lines.length>=5000)throw new Error('Source exceeds 5,000 visible lines for table inspection.');
  const ending=source.slice(offset+raw.length).match(/^(\r\n|\r|\n)/)?.[0]??'';
  lines.push({raw,offset,line,ending,cells:[]});
 });
 const tables:OfficeSourceTable[]=[];
 for(let i=0;i<lines.length-1;i++){
  const header=lines[i]!,separator=lines[i+1]!;
  if(!header.raw.includes('|')||!officeTableDivider.test(separator.raw)||
     separator.offset!==header.offset+header.raw.length+header.ending.length)continue;
  if(!canonical(header.raw)||!canonical(separator.raw))
   throw new Error('Table at line '+header.line+' has unsupported delimiter formatting.');
  const headers=officeTableCells(header.raw);
  if(headers.length<2||headers.length>MAX_OFFICE_TABLE_COLUMNS||headers.some(x=>!x||x.length>120))
   throw new Error('Table headers must contain 2–8 nonempty columns of at most 120 characters.');
  const divider=cells(separator.raw,headers.length);
  if(divider.some(x=>!/^:?-{3,}:?$/.test(x)))
   throw new Error('Table divider is not safely editable.');
  if(!header.ending||!separator.ending||header.ending!==separator.ending)
   throw new Error('Table line endings must be consistent.');
  const rows:OfficeTableRow[]=[];
  let previous=separator;
  let j=i+2;
  while(j<lines.length){
   const candidate=lines[j]!;
   if(candidate.offset!==previous.offset+previous.raw.length+previous.ending.length||
      !candidate.raw.trim()||!candidate.raw.includes('|'))break;
   if(rows.length>=MAX_OFFICE_TABLE_ROWS)
    throw new Error('Table exceeds 40 rows; shorten it before editing.');
   if(candidate.ending&&candidate.ending!==header.ending)
    throw new Error('Table line endings must be consistent.');
   rows.push({...candidate,cells:cells(candidate.raw,headers.length)});
   previous=candidate;j++;
  }
  if(!rows.length)throw new Error('Table at line '+header.line+' needs at least one data row.');
  if(tables.length>=MAX_OFFICE_TABLES)
   throw new Error('More than 20 tables; narrow the document before editing.');
  tables.push({offset:header.offset,line:header.line,headers,rows,newline:header.ending});
  i=j-1;
 }
 return tables;
}
export function previewOfficeTableChange(
 source:string,tableOffset:number,action:OfficeTableAction,rowIndex:number,
 columnIndex:number,content:string|string[]
):OfficeTableEdit{
 if(!Number.isSafeInteger(tableOffset)||tableOffset<0)
  throw new Error('Invalid original table selection.');
 const selected=reviewOfficeTables(source).find(row=>row.offset===tableOffset);
 if(!selected)throw new Error('Original table is no longer available.');
 const {rows,headers,newline}=selected;
 let value='';
 if(action==='cell'){
  if(!Number.isSafeInteger(rowIndex)||rowIndex<0||rowIndex>=rows.length||
     !Number.isSafeInteger(columnIndex)||columnIndex<0||columnIndex>=headers.length||
     typeof content!=='string')throw new Error('Choose a genuine table cell.');
  const target=rows[rowIndex]!;
  if(source.slice(target.offset,target.offset+target.raw.length)!==target.raw)
   throw new Error('Original table row changed.');
  const segments=target.raw.split('|'),segment=segments[columnIndex+1]!;
  const current=segment.trim(),replacement=safeCell(content);
  if(current===replacement)throw new Error('Table cell is unchanged.');
  const start=current?segment.indexOf(current):segment.length;
  const updated=current?segment.slice(0,start)+replacement+segment.slice(start+current.length):
    segment.slice(0,start)+replacement+' ';
  segments[columnIndex+1]=updated;
  const modified=segments.join('|');
  if(officeTableCells(modified)[columnIndex]!==replacement)
   throw new Error('Cannot safely rewrite the original table cell.');
  value=source.slice(0,target.offset)+modified+source.slice(target.offset+target.raw.length);
 }else if(action==='append-row'){
  if(rows.length>=MAX_OFFICE_TABLE_ROWS)throw new Error('A table may have at most 40 rows.');
  if(!Array.isArray(content)||content.length!==headers.length)
   throw new Error('Enter a value for each table column.');
  const fresh=content.map(safeCell);
  if(!fresh.some(Boolean))throw new Error('Enter at least one nonempty cell for a new row.');
  const last=rows[rows.length-1]!;
  const at=last.offset+last.raw.length;
  value=source.slice(0,at)+newline+'| '+fresh.join(' | ')+' |'+source.slice(at);
 }else if(action==='delete-row'){
  if(!Number.isSafeInteger(rowIndex)||rowIndex<0||rowIndex>=rows.length)
   throw new Error('Choose a genuine table row.');
  if(rows.length<=1)throw new Error('Keep at least one table data row.');
  const row=rows[rowIndex]!;
  let start=row.offset,end=row.offset+row.raw.length+row.ending.length;
  if(!row.ending){
   start-=newline.length;
   if(start<0||source.slice(start,row.offset)!==newline)
    throw new Error('Original row separator changed.');
  }
  value=source.slice(0,start)+source.slice(end);
 }else throw new Error('Unsupported table operation.');
 if(value.length>MAX_BODY)throw new Error('Table change exceeds Office source limit.');
 const after=reviewOfficeTables(value).find(t=>t.offset===tableOffset);
 if(!after||after.headers.join('\u0000')!==headers.join('\u0000')||
    after.rows.length!==rows.length+(action==='append-row'?1:action==='delete-row'?-1:0))
  throw new Error('Resulting table is no longer recognized by the original Markdown renderer.');
 return {value,action,tableLine:selected.line,rowCount:after.rows.length};
}
