import { PILOT_HANDOFFS } from './providers/handoffs';
import { providerAction } from './providers/registry';
export const HUB_ACTIONS = [
  ...PILOT_HANDOFFS.map(action => ({ id: `${action.providerId}-${action.action}`, title: action.label, description: action.description, href: action.href, keywords: action.providerId === 'notes' ? 'note write thought capture text' : action.providerId === 'library' ? 'book read reading resume epub pdf' : 'bible scripture verse memory review' })),
  { id: 'notes-capture-checklist', title: 'New checklist', description: 'Notes handles creating and saving your checklist', href: providerAction('notes', 'capture-checklist')!, keywords: 'task plan list notes checklist' },
] as const;
export function findHubActions(actions: readonly typeof HUB_ACTIONS[number][], query: string) {
  const words = query.normalize('NFKC').toLocaleLowerCase().trim().slice(0, 200).split(/\s+/).filter(Boolean);
  return actions.filter(action => words.every(word => `${action.title} ${action.description} ${action.keywords}`.toLocaleLowerCase().includes(word)));
}
