import {resolveLaunch} from '../launches/resolver';
import type {WorkspaceState,Widget} from './types';
import {shortcutIds} from './commands';
export function recentLaunches(state:WorkspaceState):string[]{
 return [...new Set(state.activity.filter(a=>a.kind.startsWith('launch:')).map(a=>resolveLaunch(a.kind.slice(7))?.id).filter((id):id is string=>!!id))].slice(0,12);
}
export function selectedShortcuts(state:WorkspaceState,widget:Widget,connected:readonly string[]):string[]{
 if(widget.config.shortcutSource==='recent')return recentLaunches(state);
 if(widget.config.shortcutSource==='connected')return [...new Set(connected)].slice(0,12);
 return shortcutIds(widget);
}
