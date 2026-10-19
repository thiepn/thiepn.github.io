import {customLinks} from './commands';
import {validateHubPinConfig} from './record-pinboard';
import {validOutcomeConfig} from './outcome-board';
import {validDecisionConfig} from './decision-register';
import {validRelationConfig} from './task-event-links';
import type { Widget } from './types';
export const WIDGETS = {
    'app-shortcuts': { title: 'App shortcuts', icon: 'squares-four', description: 'Your chosen apps, one click away.', views: ['tiles', 'list', 'compact'], width: 12, height: 20, minWidth: 4, minHeight: 16 },
    continue: { title: 'Continue working', icon: 'book-open', description: 'Return to your local notes and drafts.', views: ['list', 'detailed'], width: 6, height: 34, minWidth: 4, minHeight: 20 },
    capture: { title: 'Quick capture', icon: 'pencil-simple', description: 'Save a thought, note or task on this device.', views: ['editor', 'compact'], width: 6, height: 34, minWidth: 4, minHeight: 20 },
    'tracker-summary': { title: 'Trackers', icon: 'chart-bar', description: 'Goals and progress that you choose to track.', views: ['table', 'progress', 'compact'], width: 6, height: 34, minWidth: 4, minHeight: 20 },
    'tracker-history': { title: 'Weekly rhythm', icon: 'chart-line-up', description: 'See your logged activity over time.', views: ['chart', 'matrix'], width: 6, height: 34, minWidth: 4, minHeight: 24 },
    'recent-activity': { title: 'Recent activity', icon: 'clock-counter-clockwise', description: 'Your recent actions in this workspace.', views: ['list', 'detailed'], width: 12, height: 24, minWidth: 4, minHeight: 16 },
    'task-inbox': { title: 'Task inbox', icon: 'check-square', description: 'Unscheduled Hub tasks, ready to sort and plan.', views: ['compact', 'detailed'], width: 6, height: 34, minWidth: 4, minHeight: 20 },
    'task-priorities': { title: 'Next priorities', icon: 'check-square', description: 'Due, overdue and high-priority tasks from this device.', views: ['compact', 'detailed'], width: 6, height: 34, minWidth: 4, minHeight: 20 },
    'upcoming-commitments': { title: 'Upcoming commitments', icon: 'calendar-blank', description: 'Local Hub events and task due dates with honest sources.', views: ['agenda', 'compact'], width: 6, height: 40, minWidth: 4, minHeight: 20 },
    'recent-captures': { title: 'Recent captures', icon: 'notebook', description: 'Captured Hub notes and tasks, not external app activity.', views: ['list', 'detailed'], width: 6, height: 32, minWidth: 4, minHeight: 20 },
    'quick-plan': { title: 'Quick planning', icon: 'calendar-blank', description: 'Plan unscheduled tasks using existing Hub task actions.', views: ['compact', 'detailed'], width: 6, height: 36, minWidth: 4, minHeight: 20 },
    'owner-handoffs': { title: 'Connected app handoffs', icon: 'arrow-up-right', description: 'Source-honest owner-app actions and existing access routes.', views: ['compact', 'detailed'], width: 6, height: 28, minWidth: 4, minHeight: 20 },
    'record-pinboard': { title: 'Pinned records', icon: 'pin', description: 'Original Hub tasks, notes, events and trackers saved only by reference.', views: ['detailed', 'compact'], width: 6, height: 34, minWidth: 4, minHeight: 20 },
    'outcome-board': { title: 'Outcomes', icon: 'target', description: 'Long-term groupings of original Hub tasks and tracker logs.', views: ['detailed', 'compact'], width: 6, height: 36, minWidth: 4, minHeight: 20 },
    'decision-register': { title: 'Decision register', icon: 'notebook', description: 'Record alternatives, reasons and follow-up reviews, linked to original Hub records.', views: ['detailed', 'compact'], width: 6, height: 34, minWidth: 4, minHeight: 20 },
    'task-event-links': { title: 'Task–calendar links', icon: 'calendar-blank', description: 'Explicit persistent relationships between original Hub tasks and calendar events.', views: ['detailed','compact'], width: 6, height: 34, minWidth: 4, minHeight: 20 },
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
    if (widget.type === 'record-pinboard' && !validateHubPinConfig(widget.config.pins)) return false;
    if (widget.type === 'outcome-board' && !validOutcomeConfig(widget.config.outcomes)) return false;
    if (widget.type === 'decision-register' && !validDecisionConfig(widget.config.decisions)) return false;
    if (widget.type === 'task-event-links' && !validRelationConfig(widget.config.links)) return false;
    if (widget.config.title !== undefined && (typeof widget.config.title !== 'string' || !widget.config.title.trim() || widget.config.title.length > 80)) return false;
    if (widget.config.useActions !== undefined && typeof widget.config.useActions !== 'boolean') return false;
    if (widget.config.itemLimit !== undefined && (!Number.isSafeInteger(widget.config.itemLimit) || Number(widget.config.itemLimit) < 2 || Number(widget.config.itemLimit) > 12)) return false;
    if (widget.config.dateRange !== undefined && ![3, 7, 14].includes(Number(widget.config.dateRange))) return false;
    if (widget.config.sourceKind !== undefined && !['both', 'notes', 'tasks'].includes(String(widget.config.sourceKind))) return false;
    if (widget.config.ownerSources !== undefined && (!Array.isArray(widget.config.ownerSources) || widget.config.ownerSources.length > 3 || new Set(widget.config.ownerSources).size !== widget.config.ownerSources.length || widget.config.ownerSources.some((id:unknown) => !['notes','library','tms60'].includes(String(id))))) return false;
    if (!(spec.views as readonly string[]).includes(widget.view) || r.w < spec.minWidth || r.h < spec.minHeight)
        return false;
    try {const links=customLinks(widget);if(links.length>12||new Set(links.map(l=>l.id)).size!==links.length)return false;}catch{return false;}
    if(widget.config.shortcutSource!==undefined&&!['pinned','recent','connected'].includes(String(widget.config.shortcutSource)))return false;
    const ids = widget.config.appIds ?? widget.config.trackerIds;
    return ids === undefined || (Array.isArray(ids) && ids.length <= (widget.type === 'app-shortcuts' ? 12 : 32) && ids.every(x => typeof x === 'string' && x.length < 128));
}
