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
const inlinePattern=/\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\x60([^\x60\n]+)\x60/g;
function inline(doc:Document,element:Element,content:string){
  let pos=0;
  for(const m of content.matchAll(inlinePattern)){
    const at=m.index??0;
    if(at>pos)element.append(doc.createTextNode(content.slice(pos,at)));
    let child:Element;
    if(m[1]!==undefined&&m[2]!==undefined){
      const href=m[2];
      let allowed=false;
      try{const parsed=new URL(href);allowed=(parsed.protocol==='https:'||parsed.protocol==='http:')&&!!parsed.hostname;}catch{}
      child=doc.createElement(allowed?'a':'span');
      if(allowed){child.setAttribute('href',href);child.setAttribute('rel','noopener noreferrer');child.setAttribute('target','_blank');}
      child.textContent=m[1];
    }else if(m[3]!==undefined){child=doc.createElement('strong');child.textContent=m[3];}
    else if(m[4]!==undefined){child=doc.createElement('em');child.textContent=m[4];}
    else {child=doc.createElement('code');child.textContent=m[5]??'';}
    element.append(child);
    pos=at+m[0].length;
  }
  if(pos<content.length)element.append(doc.createTextNode(content.slice(pos)));
}
function cells(line:string):string[]{
  return line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(s=>s.trim());
}
const divider=/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const heading=/^(#{1,6})\s+(.+)$/;
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
  const lines=source.replace(/\r\n?/g,'\n').split('\n');
  const appendInline=(tag:string,content:string)=>{
    const node=doc.createElement(tag);inline(doc,node,content);fragment.append(node);
  };
  const tick=String.fromCharCode(96).repeat(3);
  for(let i=0;i<lines.length;){
    const line=lines[i]!;
    if(!line.trim()){i++;continue;}
    if(line.startsWith(tick)||line.startsWith('~~~')){
      const fence=line.slice(0,3);i++;
      const parts:string[]=[];
      while(i<lines.length&&!lines[i]!.startsWith(fence))parts.push(lines[i++]!);
      if(i<lines.length)i++;
      const pre=doc.createElement('pre'),code=doc.createElement('code');
      code.textContent=parts.join('\n');pre.append(code);fragment.append(pre);continue;
    }
    const h=line.match(heading);
    if(h){appendInline('h'+h[1]!.length,h[2]!);i++;continue;}
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
          li.append(check);inline(doc,li,task[2]!);
        }else inline(doc,li,match[1]!);
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
