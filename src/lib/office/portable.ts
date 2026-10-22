import {renderMarkdown} from './markdown';
// The same safe DOM renderer as the in-app preview: untrusted HTML remains text.
export function standaloneHtml(title:string,body:string,host:Document):string{
 if(!title.trim()||title.length>120||body.length>200_000)throw new Error('Document exceeds export limits.');
 const doc=host.implementation.createHTMLDocument(title);
 doc.documentElement.lang='en';
 const policy=doc.createElement('meta');
 policy.setAttribute('http-equiv','Content-Security-Policy');
 policy.setAttribute('content',"default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");
 doc.head.append(policy);
 const styles=doc.createElement('style');
 styles.textContent='@page{margin:18mm}body{max-width:760px;margin:32px auto;padding:0 24px;color:#161616;background:white;font:16px/1.6 system-ui,sans-serif;overflow-wrap:anywhere}h1,h2,h3{line-height:1.25}h1{font-size:2rem}h2{font-size:1.5rem}pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;background:#f4f4f4}code{font-family:ui-monospace,monospace}table{border-collapse:collapse;max-width:100%}th,td{border:1px solid #777;padding:6px;text-align:left}blockquote{border-left:3px solid #777;padding-left:14px}a{color:#194a86}@media print{body{max-width:none;margin:0;padding:0}a{color:inherit}}';
 doc.head.append(styles);
 const main=doc.createElement('main'),heading=doc.createElement('h1'),article=doc.createElement('article');
 heading.textContent=title;renderMarkdown(body,article);
 main.append(heading,article);doc.body.replaceChildren(main);
 return '<!doctype html>\n'+doc.documentElement.outerHTML;
}
