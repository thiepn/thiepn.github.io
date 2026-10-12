import type { Widget } from './types';
export const WIDGETS = {
    'app-shortcuts': { title: 'App shortcuts', icon: 'squares-four', description: 'Your chosen apps, one click away.', views: ['tiles', 'list', 'compact'], width: 12, height: 20, minWidth: 4, minHeight: 16 },
    continue: { title: 'Continue working', icon: 'book-open', description: 'Return to your local notes and drafts.', views: ['list', 'detailed'], width: 6, height: 34, minWidth: 4, minHeight: 20 },
    capture: { title: 'Quick capture', icon: 'pencil-simple', description: 'Save a thought, note or task on this device.', views: ['editor', 'compact'], width: 6, height: 34, minWidth: 4, minHeight: 20 },
    'tracker-summary': { title: 'Trackers', icon: 'chart-bar', description: 'Goals and progress that you choose to track.', views: ['table', 'progress', 'compact'], width: 6, height: 34, minWidth: 4, minHeight: 20 },
    'tracker-history': { title: 'Weekly rhythm', icon: 'chart-line-up', description: 'See your logged activity over time.', views: ['chart', 'matrix'], width: 6, height: 34, minWidth: 4, minHeight: 24 },
    'recent-activity': { title: 'Recent activity', icon: 'clock-counter-clockwise', description: 'Your recent actions in this workspace.', views: ['list', 'detailed'], width: 12, height: 24, minWidth: 4, minHeight: 16 },
} as const;
export type WidgetType = keyof typeof WIDGETS;
export function specification(type: string) { return Object.hasOwn(WIDGETS, type) ? WIDGETS[type as WidgetType] : undefined; }
export function validWidget(widget: Widget): boolean {
    const spec = specification(widget.type);
    const r = widget.desktop;
    if (!r || ![r.x, r.y, r.w, r.h, widget.order].every(Number.isSafeInteger) || r.x < 0 || r.y < 0 || r.y > 10000 || r.w < 1 || r.x + r.w > 12 || r.h < 8 || r.h > 120 || widget.order < 0)
        return false;
    if (!widget.config || typeof widget.config !== 'object' || Array.isArray(widget.config) || JSON.stringify(widget.config).length > 16384)
        return false;
    if (!spec || widget.typeVersion > 1)
        return true; // Future widgets are retained, never rewritten.
    if (widget.config.title !== undefined && (typeof widget.config.title !== 'string' || !widget.config.title.trim() || widget.config.title.length > 80)) return false;
    if (widget.config.useActions !== undefined && typeof widget.config.useActions !== 'boolean') return false;
    if (!(spec.views as readonly string[]).includes(widget.view) || r.w < spec.minWidth || r.h < spec.minHeight)
        return false;
    const ids = widget.config.appIds ?? widget.config.trackerIds;
    return ids === undefined || (Array.isArray(ids) && ids.length <= (widget.type === 'app-shortcuts' ? 12 : 32) && ids.every(x => typeof x === 'string' && x.length < 128));
}
