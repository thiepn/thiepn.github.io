import { resolveLaunch, safeCustomUrl } from '../launches/resolver';
import type { Workspace, Widget } from './types';
export interface CustomLink { id:string; title:string; url:string }
export function customLinks(widget:Widget):CustomLink[] {
 if(!Array.isArray(widget.config.customLinks))return [];
 return widget.config.customLinks.map(value=>{
  if(!value || typeof value!=='object')throw new Error('Invalid custom shortcut');
  const {id,title,url}=value as CustomLink;
  if(typeof id!=='string'||!id.startsWith('custom:')||typeof title!=='string'||!title.trim()||title.length>80)throw new Error('Invalid custom shortcut');
  return {id,title:title.trim(),url:safeCustomUrl(url)};
 });
}
export function shortcutIds(widget:Widget):string[] {
 return Array.isArray(widget.config.appIds)?widget.config.appIds.filter((id):id is string=>typeof id==='string'):[];
}
export function setShortcuts(workspace:Workspace,widgetId:string,ids:string[],links?:CustomLink[]):void {
 const widget=workspace.widgets.find(w=>w.id===widgetId&&w.type==='app-shortcuts');
 if(!widget)throw new Error('This shortcut widget is no longer available.');
 if(ids.length>12||new Set(ids).size!==ids.length)throw new Error('Choose up to 12 different shortcuts.');
 const canonical=ids.map(id=>resolveLaunch(id)?.id??id);
 if(new Set(canonical).size!==canonical.length)throw new Error('Two shortcuts refer to the same app.');
 if(links){const candidate={...widget,config:{...widget.config,customLinks:links}};customLinks(candidate);widget.config.customLinks=links;}
 widget.config.appIds=canonical;
}
export function toggleShortcut(workspace:Workspace,id:string):boolean {
 const launch=resolveLaunch(id);if(!launch)throw new Error('This app is unavailable.');
 const widget=workspace.widgets.find(w=>w.type==='app-shortcuts');
 if(!widget)throw new Error('Add an App shortcuts widget on Home first.');
 const ids=shortcutIds(widget).map(id=>resolveLaunch(id)?.id??id);
 const pinned=ids.includes(launch.id);
 setShortcuts(workspace,widget.id,pinned?ids.filter(id=>id!==launch.id):[...ids,launch.id]);
 return !pinned;
}
