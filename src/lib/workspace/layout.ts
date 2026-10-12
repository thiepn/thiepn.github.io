import { specification } from './registry';
import { clone, type Rect, type Widget } from './types';
export function overlaps(a: Rect, b: Rect) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
export function place(widgets: Widget[], id: string, rect: Rect): Widget[] {
    const items = clone(widgets);
    const moving = items.find(w => w.id === id);
    if (!moving)
        return items;
    const spec = specification(moving.type);
    moving.desktop = { x: Math.max(0, Math.min(12 - Math.max(spec?.minWidth ?? 4, rect.w), Math.round(rect.x))), y: Math.max(0, Math.round(rect.y)), w: Math.min(12, Math.max(spec?.minWidth ?? 4, Math.round(rect.w))), h: Math.min(120, Math.max(spec?.minHeight ?? 16, Math.round(rect.h))) };
    moving.desktop.x = Math.min(moving.desktop.x, 12 - moving.desktop.w);
    const settled = [moving];
    for (const widget of items.filter(w => w.id !== id).sort((a, b) => a.desktop.y - b.desktop.y || a.desktop.x - b.desktop.x || a.id.localeCompare(b.id))) {
        let hit: Widget | undefined;
        while ((hit = settled.find(w => overlaps(w.desktop, widget.desktop))))
            widget.desktop.y = hit.desktop.y + hit.desktop.h;
        settled.push(widget);
    }
    items.sort((a, b) => a.desktop.y - b.desktop.y || a.desktop.x - b.desktop.x || a.id.localeCompare(b.id)).forEach((w, i) => w.order = i);
    return items;
}
export function ordered(widgets: Widget[]) { return [...widgets].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)); }
