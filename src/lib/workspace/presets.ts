import { WIDGETS } from './registry';
import { uid, stamp, type Workspace, type Widget } from './types';
export const PRESETS = ['Daily workspace', 'Focus console', 'Personal workbench', 'Blank workspace'] as const;
export function preset(title: string, pins: string[], kind = 0): Workspace {
    const ids = Object.keys(WIDGETS) as (keyof typeof WIDGETS)[];
    const widgets: Widget[] = kind === 3 ? [] : ids.map((type, i) => {
        const spec = WIDGETS[type];
        const positions = kind === 1
            ? [{x:0,y:0,w:12,h:16},{x:0,y:46,w:6,h:34},{x:6,y:46,w:6,h:34},{x:0,y:16,w:12,h:30},{x:0,y:80,w:12,h:30},{x:0,y:110,w:12,h:24}]
            : kind === 2
            ? [{x:0,y:0,w:12,h:20},{x:0,y:20,w:4,h:44},{x:4,y:20,w:4,h:44},{x:8,y:20,w:4,h:44},{x:0,y:64,w:12,h:30},{x:0,y:94,w:12,h:24}]
            : [{x:0,y:0,w:12,h:20},{x:0,y:20,w:6,h:34},{x:6,y:20,w:6,h:34},{x:0,y:54,w:6,h:34},{x:6,y:54,w:6,h:34},{x:0,y:88,w:12,h:24}];
        const views = kind === 1 ? ['compact', 'list', 'compact', 'table', 'matrix', 'list'] : kind === 2 ? ['tiles', 'detailed', 'editor', 'progress', 'matrix', 'detailed'] : ['tiles', 'list', 'editor', 'table', 'chart', 'list'];
        return { id: uid(), type, typeVersion: 1, view: views[i]!, config: type === 'app-shortcuts' ? { appIds: [...pins] } : {}, desktop: positions[i]!, order: i };
    });
    widgets.sort((a,b)=>a.desktop.y-b.desktop.y||a.desktop.x-b.desktop.x).forEach((w,i)=>w.order=i);
    return { schemaVersion: 1, id: uid(), title, revision: 0, widgets, updatedAt: stamp() };
}
