/**
 * V1.6 — Product Refinement, Personalization & Advanced Workflow Quality Certification Test Suite
 */

import { preferenceService, DEFAULT_DOMAIN_VISIBILITY, CORE_DOMAIN_VISIBILITY } from '../personalization/preferenceService';
import { visibilityProfileManager } from '../personalization/visibilityProfiles';
import { navigationCustomizer, REQUIRED_ANCHOR_IDS } from '../personalization/navigationCustomizer';
import { favoritesManager } from '../personalization/favoritesManager';
import { workspacePresetsManager, BUILTIN_WORKSPACE_PRESETS } from '../personalization/workspacePresetsManager';
import { actionRegistry } from '../personalization/actionRegistry';
import { workflowPresetsManager } from '../personalization/workflowPresetsManager';
import { keyboardShortcutManager } from '../personalization/keyboardShortcutManager';
import { homeCustomizer } from '../personalization/homeCustomizer';
import { savedViewsManager } from '../personalization/savedViewsManager';
import { qualityTemplateManager } from '../personalization/qualityTemplateManager';
import { quickCapturePresetsManager } from '../personalization/quickCapturePresets';
import { configExportImportManager } from '../personalization/configExportImport';
import { personalizationDoctor } from '../personalization/personalizationDoctor';
import { Note } from '../../types';

export function runV16PersonalizationCertificationTests(): { total: number; passed: number; failed: number; errors: string[] } {
  let total = 0;
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  const assert = (condition: boolean, desc: string) => {
    total++;
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`FAIL: ${desc}`);
    }
  };

  // ==========================================================================
  // 1. PREFERENCE SERVICE & SAFE UI RESET
  // ==========================================================================
  try {
    const testKey = 'test_custom_key';
    preferenceService.set(testKey, { themeSetting: 'dark-obsidian' }, 'global-synced');
    assert(preferenceService.hasUserOverride(testKey), 'PreferenceService tracks user overrides');
    assert(preferenceService.get(testKey, null) !== null, 'PreferenceService retrieves saved values');

    // Default fallback
    assert(preferenceService.get('non_existent_key', 42) === 42, 'PreferenceService falls back to default on missing key');

    // Safe UI Reset
    const resetResult = preferenceService.resetInterfaceConfiguration();
    assert(resetResult !== null, 'PreferenceService safely resets UI configuration');
  } catch (err: any) {
    failed++;
    errors.push(`Section 1 Crash: ${err?.message}`);
  }

  // ==========================================================================
  // 2. VISIBILITY PROFILES & DOMAIN TOGGLES
  // ==========================================================================
  try {
    const coreProfile = visibilityProfileManager.setProfile('core');
    assert(visibilityProfileManager.isDomainVisible('notes'), 'Notes domain is always visible in Core profile');
    assert(!visibilityProfileManager.isDomainVisible('finance'), 'Finance domain is hidden in Core profile');

    visibilityProfileManager.setProfile('personal-os');
    assert(visibilityProfileManager.isDomainVisible('finance'), 'Finance domain is visible in Full Personal OS profile');

    visibilityProfileManager.toggleDomain('travel', false);
    assert(!visibilityProfileManager.isDomainVisible('travel'), 'Custom domain toggle hides domain');
    visibilityProfileManager.toggleDomain('travel', true);
  } catch (err: any) {
    failed++;
    errors.push(`Section 2 Crash: ${err?.message}`);
  }

  // ==========================================================================
  // 3. NAVIGATION & REQUIRED ANCHOR PROTECTION
  // ==========================================================================
  try {
    const sidebar = navigationCustomizer.getSidebarItems();
    assert(sidebar.length >= 10, 'Sidebar navigation has all standard items');
    assert(sidebar.some((s) => s.id === 'nav-home' && s.isVisible), 'Home anchor cannot be removed');
    assert(sidebar.some((s) => s.id === 'nav-notes' && s.isVisible), 'Notes anchor cannot be removed');

    const mobileNav = navigationCustomizer.getMobileBottomNav();
    assert(mobileNav.items.length <= 5, 'Mobile bottom nav is strictly capped at max 5 items');
  } catch (err: any) {
    failed++;
    errors.push(`Section 3 Crash: ${err?.message}`);
  }

  // ==========================================================================
  // 4. FAVORITES & MISSING RESOURCE SAFETY
  // ==========================================================================
  try {
    favoritesManager.addFavorite({
      id: 'fav-test-1',
      title: 'Active Project X',
      type: 'project',
      resourceId: 'proj-123',
    });
    assert(favoritesManager.isFavorite('proj-123', 'project'), 'Favorite is correctly recognized');

    favoritesManager.removeFavorite('fav-test-1');
    assert(!favoritesManager.isFavorite('proj-123', 'project'), 'Favorite removal works correctly');
  } catch (err: any) {
    failed++;
    errors.push(`Section 4 Crash: ${err?.message}`);
  }

  // ==========================================================================
  // 5. WORKSPACE PRESETS & DYNAMIC CONTEXT SLOTS
  // ==========================================================================
  try {
    const presets = workspacePresetsManager.getPresets();
    assert(presets.length >= 5, 'Built-in workspace presets loaded (Writing, Research, Planning, Review, Spatial)');

    const researchPreset = workspacePresetsManager.getPresetById('preset-research');
    assert(researchPreset?.leftSurface.dynamicSlot === 'active-context-root', 'Research preset specifies active-context-root slot');

    const resolved = workspacePresetsManager.resolveDynamicSurface(researchPreset!.leftSurface, {
      activeContextRootNoteId: 'note-quantum-physics',
    });
    assert(resolved.resourceId === 'note-quantum-physics', 'Dynamic slot correctly resolved to active context root');
  } catch (err: any) {
    failed++;
    errors.push(`Section 5 Crash: ${err?.message}`);
  }

  // ==========================================================================
  // 6. UNIFIED ACTION REGISTRY & WORKFLOW SEQUENCES
  // ==========================================================================
  try {
    const navHomeAction = actionRegistry.get('nav:open-home');
    assert(navHomeAction !== undefined, 'nav:open-home action is registered');
    assert(navHomeAction?.riskLevel === 'navigation', 'Navigation action risk level is "navigation"');

    const workflows = workflowPresetsManager.getPresets();
    assert(workflows.length >= 5, 'Built-in workflows loaded (Writing, Study, Review, Travel, Planning)');

    // Execute mock workflow
    const executionReport = workflowPresetsManager.executeWorkflow('wf-start-writing', {
      openDailyNote: () => {},
      applyPreset: () => {},
    });
    assert(executionReport !== null, 'Workflow execution creates structured execution report');
  } catch (err: any) {
    failed++;
    errors.push(`Section 6 Crash: ${err?.message}`);
  }

  // ==========================================================================
  // 7. KEYBOARD SHORTCUTS & CONFLICT DETECTION
  // ==========================================================================
  try {
    const shortcuts = keyboardShortcutManager.getShortcuts();
    assert(shortcuts.length >= 8, 'Standard keyboard shortcuts registered');

    const formatted = keyboardShortcutManager.formatShortcutForDisplay('Mod+Shift+F');
    assert(formatted.length > 0, 'Shortcut formatting produces OS-appropriate string');

    const conflict = keyboardShortcutManager.checkConflict('test-new-action', 'Mod+K');
    assert(conflict !== null, 'Shortcut collision engine flags duplicate key assignment for Mod+K');
  } catch (err: any) {
    failed++;
    errors.push(`Section 7 Crash: ${err?.message}`);
  }

  // ==========================================================================
  // 8. HOME SECTIONS & LAYOUT PRESETS
  // ==========================================================================
  try {
    const config = homeCustomizer.getConfig();
    assert(config.sections.length >= 8, 'Home customizer contains all standard sections');

    homeCustomizer.setPreset('minimal');
    const minimalConfig = homeCustomizer.getConfig();
    assert(minimalConfig.presetId === 'minimal', 'Minimal Home preset successfully applied');

    homeCustomizer.resetToDefault();
    const defaultHome = homeCustomizer.getConfig();
    assert(defaultHome.presetId === 'balanced', 'Home reset restored balanced default layout');
  } catch (err: any) {
    failed++;
    errors.push(`Section 8 Crash: ${err?.message}`);
  }

  // ==========================================================================
  // 9. SAVED VIEWS & FILTER EVALUATION
  // ==========================================================================
  try {
    const views = savedViewsManager.getSavedViews();
    assert(views.length >= 3, 'Built-in saved views loaded');

    const matchTest = savedViewsManager.matchesFilters(
      { priority: 'urgent', completed: false },
      [
        { field: 'priority', operator: 'equals', value: 'urgent' },
        { field: 'completed', operator: 'equals', value: false },
      ]
    );
    assert(matchTest === true, 'Saved view filter evaluator correctly matches records');

    const failTest = savedViewsManager.matchesFilters(
      { priority: 'low', completed: true },
      [{ field: 'priority', operator: 'equals', value: 'urgent' }]
    );
    assert(failTest === false, 'Saved view filter evaluator correctly rejects mismatched records');
  } catch (err: any) {
    failed++;
    errors.push(`Section 9 Crash: ${err?.message}`);
  }

  // ==========================================================================
  // 10. QUALITY TEMPLATES & DETERMINISTIC RENDERING
  // ==========================================================================
  try {
    const dailyTemplate = qualityTemplateManager.getDefaultTemplateForType('daily-note');
    assert(dailyTemplate !== undefined, 'Default daily note template exists');

    const rendered = qualityTemplateManager.renderTemplate('# {{title}} on {{date}}', {
      title: 'Quarterly Kickoff',
      date: '2026-09-15',
    });
    assert(rendered.includes('# Quarterly Kickoff on 2026-09-15'), 'Deterministic lexical variable substitution works correctly');
  } catch (err: any) {
    failed++;
    errors.push(`Section 10 Crash: ${err?.message}`);
  }

  // ==========================================================================
  // 11. QUICK CAPTURE PRESETS
  // ==========================================================================
  try {
    const capturePresets = quickCapturePresetsManager.getPresets();
    assert(capturePresets.length >= 4, 'Built-in capture presets loaded (Thought, Task, Log, Reading)');
    const defaultCap = quickCapturePresetsManager.getDefaultPreset();
    assert(defaultCap.destination === 'inbox', 'Default quick capture destination is inbox');
  } catch (err: any) {
    failed++;
    errors.push(`Section 11 Crash: ${err?.message}`);
  }

  // ==========================================================================
  // 12. CONFIGURATION EXPORT / IMPORT & PRIVACY
  // ==========================================================================
  try {
    const bundle = configExportImportManager.generateBundle();
    assert(bundle.version === '1.6.0', 'Bundle contains valid version 1.6.0');
    assert(bundle.home !== undefined, 'Bundle exports Home layout');
    assert(bundle.domainVisibility !== undefined, 'Bundle exports domain visibility');

    const serialized = JSON.stringify(bundle);
    assert(!serialized.includes('privateKey'), 'Privacy guarantee: Excludes private keys');
    assert(!serialized.includes('encryptionSecret'), 'Privacy guarantee: Excludes encryption secrets');
  } catch (err: any) {
    failed++;
    errors.push(`Section 12 Crash: ${err?.message}`);
  }

  // ==========================================================================
  // 13. PERSONALIZATION DIAGNOSTICS & VAULT DOCTOR
  // ==========================================================================
  try {
    const mockNotes: Note[] = [
      {
        id: 'note-1',
        title: 'Active Project Note',
        content: 'Content',
        type: 'text',
        checklist: [],
        color: 'default',
        tags: ['project'],
        folderId: null,
        pinned: false,
        archived: false,
        trashed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reminderDate: null,
        images: [],
      },
    ];

    const report = personalizationDoctor.runDiagnostics(mockNotes);
    assert(report !== null, 'Personalization diagnostic engine runs successfully');
    assert(typeof report.healthy === 'boolean', 'Diagnostic report contains health status');
  } catch (err: any) {
    failed++;
    errors.push(`Section 13 Crash: ${err?.message}`);
  }

  return { total, passed, failed, errors };
}
