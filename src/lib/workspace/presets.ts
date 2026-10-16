import { WIDGETS } from './registry';
import { uid, stamp, type Workspace, type Widget } from './types';
export const PRESETS = ['Daily workspace', 'Focus console', 'Personal workbench', 'Blank workspace', 'Action dashboard'] as const;
export function preset(title: string, pins: string[], kind = 0): Workspace {
    // Keep the original six-widget presets byte-for-byte compatible as the catalogue grows.
    const original: (keyof typeof WIDGETS)[] = ['app-shortcuts', 'continue', 'capture', 'tracker-summary', 'tracker-history', 'recent-activity'];
    const action: (keyof typeof WIDGETS)[] = ['task-priorities', 'task-inbox', 'upcoming-commitments', 'quick-plan', 'recent-captures', 'owner-handoffs'];
    const ids = kind === 4 ? action : original;
    const widgets: Widget[] = kind === 3 ? [] : ids.map((type, i) => {
        const spec = WIDGETS[type];
        const positions = kind === 4
            ? [{x:0,y:0,w:6,h:34},{x:6,y:0,w:6,h:34},{x:0,y:34,w:6,h:40},{x:6,y:34,w:6,h:40},{x:0,y:74,w:6,h:32},{x:6,y:74,w:6,h:32}]
            : kind === 1
            ? [{x:0,y:0,w:12,h:20},{x:0,y:56,w:6,h:34},{x:6,y:56,w:6,h:34},{x:0,y:20,w:12,h:36},{x:0,y:90,w:12,h:34},{x:0,y:124,w:12,h:24}]
            : kind === 2
            ? [{x:0,y:0,w:12,h:20},{x:0,y:20,w:4,h:44},{x:4,y:20,w:4,h:44},{x:8,y:20,w:4,h:44},{x:0,y:64,w:12,h:34},{x:0,y:98,w:12,h:24}]
            : [{x:0,y:0,w:12,h:20},{x:0,y:20,w:6,h:34},{x:6,y:20,w:6,h:34},{x:0,y:54,w:6,h:34},{x:6,y:54,w:6,h:34},{x:0,y:88,w:12,h:24}];
        const views = kind === 4 ? ['detailed', 'detailed', 'agenda', 'detailed', 'list', 'compact'] : kind === 1 ? ['compact', 'list', 'compact', 'table', 'matrix', 'list'] : kind === 2 ? ['tiles', 'detailed', 'editor', 'progress', 'matrix', 'detailed'] : ['tiles', 'list', 'editor', 'table', 'chart', 'list'];
        return { id: uid(), type, typeVersion: 1, view: views[i]!, config: type === 'app-shortcuts' ? { appIds: [...pins] } : {}, desktop: positions[i]!, order: i };
    });
    widgets.sort((a,b)=>a.desktop.y-b.desktop.y||a.desktop.x-b.desktop.x).forEach((w,i)=>w.order=i);
    return { schemaVersion: 1, id: uid(), title, revision: 0, widgets, updatedAt: stamp() };
}
