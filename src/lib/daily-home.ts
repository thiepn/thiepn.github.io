import { providerAction } from './providers/registry';

export { defaultHomeView, HOME_MODULE_IDS, HOME_TIMEZONES, homeDay, parseHomeView, visibleHomeModules } from './home-view';
export type { HomeModuleId, HomeView } from './home-view';
import type { HomeModuleId } from './home-view';

type HomeAction = { label: string; detail: string; app?: string; href?: string };
export const HOME_MODULES: readonly { id: HomeModuleId; title: string; description: string; actions: readonly HomeAction[] }[] = [
  { id: 'today', title: 'Today', description: 'A starting point for your day.', actions: [
    { label: 'Plan a checklist', detail: 'Notes · Write your priorities in the app', href: providerAction('notes', 'capture-checklist')! },
    { label: 'Choose an app', detail: 'Browse all your tools', href: 'https://thiepn.dev/' },
  ] },
  { id: 'continue', title: 'Continue', description: 'Pick up where you left off inside the app.', actions: [
    { label: 'Continue in Library', detail: 'Library · Find reading progress on this device', href: providerAction('library', 'continue-in-app')! },
    { label: 'Open Notes', detail: 'Notes · Choose a note to return to', app: 'notes' },
  ] },
  { id: 'capture', title: 'Capture', description: 'Choose a format. Notes handles saving.', actions: [
    { label: 'Capture a thought', detail: 'Notes · Open a new text note', href: providerAction('notes', 'capture-text')! },
    { label: 'New checklist', detail: 'Notes · Open a new checklist', href: providerAction('notes', 'capture-checklist')! },
  ] },
  { id: 'faith', title: 'Faith', description: 'Scripture memory and a wider view of missions.', actions: [
    { label: 'Open TMS60', detail: 'TMS60 · Choose a translation and verse', href: providerAction('tms60', 'open')! },
    { label: 'Explore unreached peoples', detail: 'Unreached · Open the app', app: 'unreached' },
  ] },
  { id: 'study', title: 'Study', description: 'Language and mathematics, at your pace.', actions: [
    { label: 'Study French vocabulary', detail: 'French 3000 · Choose your study session', app: 'french-3000' },
    { label: 'Open MathLab', detail: 'MathLab · Explore mathematics', app: 'mathlab' },
  ] },
  { id: 'routines', title: 'Routines', description: 'Your apps keep the schedule and completion history.', actions: [
    { label: 'Open Clean30', detail: 'Clean30 · Check your cleaning routine', app: 'clean30' },
    { label: 'Practice with Steadybar', detail: 'Steadybar · Open your practice tools', app: 'steadybar' },
  ] },
  { id: 'calendar', title: 'Calendar', description: 'Opens Google Calendar. Events are not read by Hub.', actions: [
    { label: 'Open Google Calendar', detail: 'External · Your Calendar session is separate', href: 'https://calendar.google.com/' },
  ] },
  { id: 'weather', title: 'Weather', description: 'Opens the German Weather Service. Choose a location there.', actions: [
    { label: 'Open DWD weather', detail: 'External · Forecasts stay with the source', href: 'https://www.dwd.de/' },
  ] },
];
export function resolveHomeActions(module: typeof HOME_MODULES[number], apps: ReadonlyMap<string, string>) {
  return module.actions.map(action => {
    const href = action.app ? apps.get(action.app) : action.href;
    if (!href || new URL(href).protocol !== 'https:') throw new Error(`Missing reviewed Home action: ${module.id}`);
    return { ...action, href };
  });
}
