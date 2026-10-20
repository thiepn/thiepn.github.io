import {officeHeadingReferences,TOC_START,TOC_END} from './toc';
import {analyzeOfficeReferences,withoutCode} from './footnotes';
// Deliberately constrained Markdown: text nodes only, no HTML parsing or raw HTML execution.
export type FormatAction = 'heading'|'bold'|'italic'|'bullet'|'number'|'quote'|'code'|'link'|'table';
export interface FormattedSelection {value:string;start:number;end:number}
export function formatSelection(value:string,start:number,end:number,action:FormatAction):FormattedSelection {
  if(start<0||end<start||end>value.length)throw new Error('Invalid text selection');
  const chosen=value.slice(start,end);
  let left=start,right=end,insert='';
  if(action==='heading'||action==='bullet'||action==='number'||action==='quote'){
    left=value.lastIndexOf('\n',start-1)+1;
    const lineEnd=value.indexOf('\n',end);
    right=lineEnd<0?value.length:lineEnd;
    const original=value.slice(left,right);
    insert=original.split('\n').map((line,i)=>{
      if(action==='heading')return '# '+line.replace(/^#{1,6}\s+/,'');
      if(action==='bullet')return '- '+line.replace(/^\s*(?:[-*+]|\d+\.)\s+/,'');
      if(action==='number')return String(i+1)+'. '+line.replace(/^\s*(?:[-*+]|\d+\.)\s+/,'');
      return '> '+line.replace(/^>\s?/,'');
    }).join('\n');
  }else if(action==='table'){
    insert='| Column 1 | Column 2 |\n| --- | --- |\n| Value | Value |';
    insert=(start>0&&value[start-1]!=='\n'?'\n':'')+insert+(end<value.length&&value[end]!=='\n'?'\n':'');
  }else if(action==='link'){
    // Never encode user-supplied selection as a link target; use an explicit safe placeholder.
    insert='['+(chosen||'link text')+'](https://example.com)';
  }else{
    const marker=action==='bold'?'**':action==='italic'?'*':String.fromCharCode(96);
    insert=marker+(chosen||(action==='bold'?'bold text':action==='italic'?'italic text':'code'))+marker;
  }
  const next=value.slice(0,left)+insert+value.slice(right);
  const caret=left+insert.length;
  return {value:next,start:caret,end:caret};
}
const inlinePattern=/\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+|#office-ref-[a-z0-9-]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\x60([^\x60\n]+)\x60|\[\^([a-z][a-z0-9_-]{0,47})\]/g;
export interface OfficeInlineSourceLink {label:string;href:string;offset:number;hrefOffset:number}
export function officeInlineSourceLinks(line:string):OfficeInlineSourceLink[]{
 const found:OfficeInlineSourceLink[]=[];
 for(const m of withoutCode(line).matchAll(inlinePattern)){
  if(m[1]===undefined||m[2]===undefined||!/^https?:\/\//.test(m[2]))continue;
  try{
   const parsed=new URL(m[2]);
   if((parsed.protocol!=='https:'&&parsed.protocol!=='http:')||!parsed.hostname)continue;
  }catch{continue;}
  const at=m.index??0;
  found.push({label:m[1],href:m[2],offset:at,hrefOffset:at+m[1].length+3});
 }
 return found;
}
function inline(doc:Document,element:Element,content:string,footnoteIds:ReadonlySet<string>){
  let pos=0;
  for(const m of content.matchAll(inlinePattern)){
    const at=m.index??0;
    if(at>pos)element.append(doc.createTextNode(content.slice(pos,at)));
    let child:Element;
    if(m[1]!==undefined&&m[2]!==undefined){
      const href=m[2];
      let allowed=false;
      const internal=/^#office-ref-[a-z0-9-]+$/.test(href);
      if(!internal){try{const parsed=new URL(href);allowed=(parsed.protocol==='https:'||parsed.protocol==='http:')&&!!parsed.hostname;}catch{}}
      child=doc.createElement(allowed||internal?'a':'span');
      if(internal){child.setAttribute('href',href);child.setAttribute('data-office-internal-ref',href.slice(1));}
      else if(allowed){child.setAttribute('href',href);child.setAttribute('rel','noopener noreferrer');child.setAttribute('target','_blank');}
      child.textContent=m[1];
    }else if(m[3]!==undefined){child=doc.createElement('strong');child.textContent=m[3];}
    else if(m[4]!==undefined){child=doc.createElement('em');child.textContent=m[4];}
    else if(m[5]!==undefined){child=doc.createElement('code');child.textContent=m[5];}
    else {const id=m[6]??'';child=doc.createElement('sup');
      if(footnoteIds.has(id)){
        const link=doc.createElement('a');link.setAttribute('href','#office-footnote-'+id);
        link.setAttribute('data-office-footnote-id',id);link.textContent='['+id+']';child.append(link);
      }else child.textContent='['+id+']';
    }
    element.append(child);
    pos=at+m[0].length;
  }
  if(pos<content.length)element.append(doc.createTextNode(content.slice(pos)));
}
function cells(line:string):string[]{
  return line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(s=>s.trim());
}
const divider=/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const heading=/^ {0,3}(#{1,6})\s+(.+)$/;
const ul=/^\s*[-*+]\s+(.+)$/;
const ol=/^\s*\d+\.\s+(.+)$/;
const quote=/^>\s?(.*)$/;
function boundary(line:string):boolean {
  return !line.trim()||heading.test(line)||ul.test(line)||ol.test(line)||quote.test(line)||
    line.startsWith('~~~')||line.startsWith(String.fromCharCode(96).repeat(3))||
    /^---+$/.test(line.trim());
}
export function renderMarkdown(source:string,container:HTMLElement):void {
  const doc=container.ownerDocument,fragment=doc.createDocumentFragment();
  const normalized=source.replace(/\r\n?/g,'\n');
  const lines=normalized.split('\n');
  const headingIds=new Map<number,string>(officeHeadingReferences(normalized).map(heading=>[heading.line,heading.id] as const));
  const footnoteReport=analyzeOfficeReferences(normalized);
  const footnoteIds=new Set(footnoteReport.definitions.filter(row=>row.count===1).map(row=>row.id));
  const appendInline=(tag:string,content:string)=>{
    const node=doc.createElement(tag);inline(doc,node,content,footnoteIds);fragment.append(node);
  };
  const tick=String.fromCharCode(96).repeat(3);
  for(let i=0;i<lines.length;){
    const line=lines[i]!;
    if(!line.trim()||line===TOC_START||line===TOC_END){i++;continue;}
    if(line.startsWith(tick)||line.startsWith('~~~')){
      const fence=line.match(/^(\x60{3,}|~{3,})/)![1]!;i++;
      const parts:string[]=[];
      while(i<lines.length){
        const close=lines[i]!.match(/^ {0,3}(\x60{3,}|~{3,})\s*$/);
        if(close&&close[1]![0]===fence[0]&&close[1]!.length>=fence.length)break;
        parts.push(lines[i++]!);
      }
      if(i<lines.length)i++;
      const pre=doc.createElement('pre'),code=doc.createElement('code');
      code.textContent=parts.join('\n');pre.append(code);fragment.append(pre);continue;
    }
    const h=line.match(heading);
    if(h){const node=doc.createElement('h'+h[1]!.length),id=headingIds.get(i);
      if(id)node.id=id;inline(doc,node,h[2]!,footnoteIds);fragment.append(node);i++;continue;}
    const definition=line.match(/^ {0,3}\[\^([a-z][a-z0-9_-]{0,47})\]:[ \t]*(.*)$/);
    if(definition){
      const element=doc.createElement('p'),id=definition[1]!;
      if(footnoteIds.has(id))element.id='office-footnote-'+id;
      const name=doc.createElement('strong');name.textContent='['+id+'] ';
      element.append(name);inline(doc,element,definition[2]!,footnoteIds);
      if(footnoteIds.has(id)&&footnoteReport.references.some(row=>row.kind==='footnote'&&row.id===id)){
        const back=doc.createElement('button');back.type='button';
        back.setAttribute('data-office-footnote-backref',id);
        back.setAttribute('aria-label','Go to first use of footnote '+id+' in source');
        back.textContent='Back to citation';element.append(doc.createTextNode(' '),back);
      }
      fragment.append(element);i++;continue;
    }
    if(/^---+$/.test(line.trim())){fragment.append(doc.createElement('hr'));i++;continue;}
    if(i+1<lines.length&&line.includes('|')&&divider.test(lines[i+1]!)){
      const headers=cells(line),table=doc.createElement('table'),thead=doc.createElement('thead'),tr=doc.createElement('tr');
      for(const text of headers){const th=doc.createElement('th');th.textContent=text;tr.append(th);}
      thead.append(tr);table.append(thead);i+=2;
      const tbody=doc.createElement('tbody');
      while(i<lines.length&&lines[i]!.trim()&&lines[i]!.includes('|')){
        const row=doc.createElement('tr');
        for(const text of cells(lines[i]!).slice(0,headers.length)){
          const td=doc.createElement('td');td.textContent=text;row.append(td);
        }
        tbody.append(row);i++;
      }
      table.append(tbody);fragment.append(table);continue;
    }
    const listKind=ul.test(line)?'ul':ol.test(line)?'ol':null;
    if(listKind){
      const list=doc.createElement(listKind),pattern=listKind==='ul'?ul:ol;
      while(i<lines.length){
        const match=lines[i]!.match(pattern);
        if(!match)break;
        const li=doc.createElement('li'),task=listKind==='ul'?match[1]!.match(/^\[([ xX])\]\s+(.*)$/):null;
        if(task){
          const check=doc.createElement('input');
          check.type='checkbox';check.checked=task[1]!.toLowerCase()==='x';check.disabled=true;
          check.setAttribute('aria-label',check.checked?'Completed task':'Open task');
          li.append(check);inline(doc,li,task[2]!,footnoteIds);
        }else inline(doc,li,match[1]!,footnoteIds);
        list.append(li);i++;
      }
      fragment.append(list);continue;
    }
    if(quote.test(line)){
      const content:string[]=[];
      while(i<lines.length&&quote.test(lines[i]!)){content.push(lines[i]!.replace(/^>\s?/,''));i++;}
      appendInline('blockquote',content.join(' '));continue;
    }
    const paragraph:string[]=[line];i++;
    while(i<lines.length&&!boundary(lines[i]!)&&
      !(i+1<lines.length&&lines[i]!.includes('|')&&divider.test(lines[i+1]!))){
      paragraph.push(lines[i++]!);
    }
    appendInline('p',paragraph.join(' '));
  }
  container.replaceChildren(fragment);
}
