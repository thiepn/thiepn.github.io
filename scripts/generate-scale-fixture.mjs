import fs from 'node:fs';
import path from 'node:path';
const categories = ['tools','learning','games','resources','visualizations','experiments'];
const statuses = ['live','live','live','beta','experiment'];
const projects = Array.from({length:250},(_,index)=>{
  const n=index+1; const category=categories[index%categories.length];
  return {kind:'project',code:`${category==='tools'?'T':category==='learning'?'L':category==='games'?'G':category==='resources'?'R':category==='visualizations'?'V':'X'}-${String(n).padStart(3,'0')}`,slug:`fixture-project-${n}`,title:`Fixture Project ${String(n).padStart(3,'0')}`,subtitle:`${category} scale fixture`,summary:`Synthetic ${category} project used to measure local catalogue filtering and search performance.`,aliases:[`fixture ${n}`,`project ${n}`],category,status:statuses[index%statuses.length],tags:[category==='learning'?'study':category==='games'?'game':'productivity'],collections:[],liveUrl:`https://example.invalid/${n}/`,accentLight:'#345B78',accentDark:'#7BC4F0',updatedAt:new Date(Date.UTC(2026,7,(index%18)+1)).toISOString()};
});
const target=path.resolve('tests/fixtures/catalogue-250.json');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(projects,null,2)+'\n');
console.log(`Generated ${projects.length} fixture projects.`);
