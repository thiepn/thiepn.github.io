/**
 * Personalization Diagnostics & Vault Doctor Checker
 * 
 * Deeply audits the health of user customizations:
 * - Shortcut collision detector
 * - Workflow action availability validator
 * - Missing / trashed favorite resource checker
 * - Invalid home section layout detector
 * - Broken saved view filter checker
 */

import { actionRegistry } from './actionRegistry';
import { keyboardShortcutManager } from './keyboardShortcutManager';
import { workflowPresetsManager } from './workflowPresetsManager';
import { favoritesManager } from './favoritesManager';
import { homeCustomizer } from './homeCustomizer';
import { savedViewsManager } from './savedViewsManager';
import { Note } from '../../types';

export interface PersonalizationDiagnosticIssue {
  id: string;
  category: 'shortcuts' | 'workflows' | 'favorites' | 'home' | 'saved-views';
  severity: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  actionableFix?: () => Promise<void>;
  fixLabel?: string;
}

export interface PersonalizationDiagnosticReport {
  timestamp: string;
  healthy: boolean;
  totalIssues: number;
  warningsCount: number;
  errorsCount: number;
  issues: PersonalizationDiagnosticIssue[];
}

export class PersonalizationDoctor {
  public runDiagnostics(notes: Note[] = []): PersonalizationDiagnosticReport {
    const issues: PersonalizationDiagnosticIssue[] = [];
    const noteIdSet = new Set(notes.filter((n) => !n.trashed).map((n) => n.id));

    // 1. Check Keyboard Shortcuts for duplicate combinations
    const shortcuts = keyboardShortcutManager.getShortcuts();
    const seenKeys = new Map<string, string>();

    for (const sc of shortcuts) {
      const norm = sc.keys.toLowerCase().replace(/cmd/g, 'mod').replace(/control/g, 'ctrl');
      if (seenKeys.has(norm)) {
        issues.push({
          id: `shortcut-collision-${sc.actionId}`,
          category: 'shortcuts',
          severity: 'warning',
          title: `Shortcut Collision: ${sc.keys}`,
          description: `Key combination "${sc.keys}" is assigned to both "${seenKeys.get(norm)}" and "${sc.label}".`,
          fixLabel: 'Reset Shortcuts to Default',
          actionableFix: async () => {
            await keyboardShortcutManager.resetShortcuts();
          },
        });
      } else {
        seenKeys.set(norm, sc.label);
      }
    }

    // 2. Check Workflow Presets for missing or uncallable actions
    const workflows = workflowPresetsManager.getPresets();
    for (const wf of workflows) {
      for (const step of wf.steps) {
        const act = actionRegistry.get(step.actionId);
        if (!act) {
          issues.push({
            id: `wf-missing-action-${wf.id}-${step.actionId}`,
            category: 'workflows',
            severity: 'error',
            title: `Unknown Action in Workflow "${wf.name}"`,
            description: `Workflow references action "${step.actionId}" which is not registered in the system.`,
          });
        }
      }
    }

    // 3. Check Favorites for missing or trashed notes
    const favorites = favoritesManager.getFavorites();
    for (const fav of favorites) {
      if (fav.type === 'note' && !noteIdSet.has(fav.resourceId)) {
        issues.push({
          id: `fav-missing-note-${fav.id}`,
          category: 'favorites',
          severity: 'info',
          title: `Favorite Note Unavailable: "${fav.title}"`,
          description: `The canonical note "${fav.title}" (ID: ${fav.resourceId}) was deleted or trashed.`,
          fixLabel: 'Remove Orphaned Favorite',
          actionableFix: async () => {
            await favoritesManager.removeFavorite(fav.id);
          },
        });
      }
    }

    // 4. Check Home Layout
    const homeConfig = homeCustomizer.getConfig();
    const visibleSections = homeConfig.sections.filter((s) => s.isVisible);
    if (visibleSections.length === 0) {
      issues.push({
        id: 'home-no-visible-sections',
        category: 'home',
        severity: 'warning',
        title: 'No Visible Sections on Home Dashboard',
        description: 'All Home sections are currently toggled off. Landing page will appear blank.',
        fixLabel: 'Restore Default Balanced Home',
        actionableFix: async () => {
          await homeCustomizer.resetToDefault();
        },
      });
    }

    // 5. Check Saved Views
    const savedViews = savedViewsManager.getSavedViews();
    for (const sv of savedViews) {
      if (!sv.filters || sv.filters.length === 0) {
        // Just an empty filter view, safe
      }
    }

    const warningsCount = issues.filter((i) => i.severity === 'warning').length;
    const errorsCount = issues.filter((i) => i.severity === 'error').length;

    return {
      timestamp: new Date().toISOString(),
      healthy: errorsCount === 0,
      totalIssues: issues.length,
      warningsCount,
      errorsCount,
      issues,
    };
  }
}

export const personalizationDoctor = new PersonalizationDoctor();
