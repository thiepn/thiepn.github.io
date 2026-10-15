import manifest from '../../generated/launch-manifest.json';
export type Launch = (typeof manifest.entries)[number];
export const launches: readonly Launch[] = manifest.entries;
export function resolveLaunch(id: string): Launch | undefined {
 const key=id.toLocaleLowerCase();
 return launches.find(entry=>entry.id===key || entry.aliases.some(alias=>alias.toLocaleLowerCase()===key));
}
export function safeCustomUrl(value:string):string {
 const url=new URL(value);
 if(url.protocol!=='https:' || url.username || url.password) throw new Error('Use an HTTPS address without embedded credentials.');
 return url.href;
}
