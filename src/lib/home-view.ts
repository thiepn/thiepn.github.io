export const HOME_MODULE_IDS = ['today', 'continue', 'capture', 'faith', 'study', 'routines', 'calendar', 'weather'] as const;
export type HomeModuleId = typeof HOME_MODULE_IDS[number];
export const HOME_TIMEZONES = ['device', 'Europe/Berlin', 'Asia/Seoul', 'Europe/Istanbul', 'UTC'] as const;
export interface HomeView {
  modules: HomeModuleId[];
  mode: 'today' | 'focus';
  focus: 'study' | 'faith';
  timezone: typeof HOME_TIMEZONES[number];
  hidden: boolean;
}
export function defaultHomeView(): HomeView {
  return { modules: ['today', 'continue', 'capture', 'faith', 'study', 'routines'], mode: 'today', focus: 'study', timezone: 'device', hidden: false };
}
export function parseHomeView(value: unknown): HomeView {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaultHomeView();
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(key => !['modules', 'mode', 'focus', 'timezone', 'hidden'].includes(key))
    || !Array.isArray(v.modules) || v.modules.length > HOME_MODULE_IDS.length
    || !v.modules.every(id => HOME_MODULE_IDS.includes(id as HomeModuleId))
    || !['today', 'focus'].includes(String(v.mode)) || !['study', 'faith'].includes(String(v.focus))
    || !HOME_TIMEZONES.includes(v.timezone as HomeView['timezone']) || typeof v.hidden !== 'boolean') return defaultHomeView();
  return { modules: [...new Set(v.modules as HomeModuleId[])], mode: v.mode as HomeView['mode'], focus: v.focus as HomeView['focus'], timezone: v.timezone as HomeView['timezone'], hidden: v.hidden };
}
export function visibleHomeModules(view: HomeView): HomeModuleId[] {
  if (view.hidden) return [];
  return HOME_MODULE_IDS.filter(id => view.modules.includes(id) && (view.mode === 'today' || ['today', 'continue', 'capture', view.focus].includes(id)));
}
export function homeDay(now: Date, timezone: HomeView['timezone'], locale?: string) {
  const zone = timezone === 'device' ? new Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return { key: `${part('year')}-${part('month')}-${part('day')}`, zone, label: new Intl.DateTimeFormat(locale, { timeZone: zone, weekday: 'long', day: 'numeric', month: 'long' }).format(now) };
}

