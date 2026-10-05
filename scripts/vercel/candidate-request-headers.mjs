export function candidateRequestHeaders({bypass='',headers={}}={}){
  const merged=new Headers(headers);
  merged.set('user-agent','THIEPN-Vercel-P5-Candidate/1');
  if(bypass)merged.set('x-vercel-protection-bypass',bypass);
  return Object.fromEntries(merged.entries());
}
