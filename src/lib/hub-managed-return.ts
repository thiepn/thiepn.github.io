export const managedQuery=new URLSearchParams(location.search), managedFragment=location.hash;
export const managedCallback=managedQuery.has('state')||managedQuery.has('code')||managedQuery.has('error');
if(managedCallback)history.replaceState(null,'','/home/');
export let managedTarget:string|null=null;
if(managedCallback)try{
 const keys=['thiepn:hub-notes:pkce:v1',...['esv','niv','nlt','hfa','schlachter1951','klb1985','krv1961'].map(id=>'thiepn:hub-tms60:pkce:'+id+':v1')];
 const matching=keys.filter(key=>{const raw=sessionStorage.getItem(key);return raw&&raw.length<=2048&&JSON.parse(raw).state===managedQuery.get('state');});
 if(matching.length===1)managedTarget=matching[0]!;
 else keys.forEach(key=>sessionStorage.removeItem(key));
}catch{managedTarget=null;}
