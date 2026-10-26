/**
 * Configuration Export & Import Manager
 * 
 * Provides privacy-safe, non-executable backup and sharing of UI/workflow configuration:
 * 
 * STRICT PRIVACY & SAFETY GUARANTEES:
 * - INCLUDED: Workspace presets, Home layout, Shortcuts, Quality Templates,
 *   Saved Views, Workflow Presets, Domain Visibility, Navigation order.
 * - STRICTLY EXCLUDED: Vault notes, raw content, private health/finance records,
 *   encryption keys, biometric secrets, API tokens, connector secrets.
 * - Non-executable: purely declarative JSON structures validated against schema.
 */

import { PersonalizationConfigBundle } from './personalizationTypes';
import { visibilityProfileManager } from './visibilityProfiles';
import { navigationCustomizer } from './navigationCustomizer';
import { favoritesManager } from './favoritesManager';
import { workspacePresetsManager } from './workspacePresetsManager';
import { workflowPresetsManager } from './workflowPresetsManager';
import { keyboardShortcutManager } from './keyboardShortcutManager';
import { homeCustomizer } from './homeCustomizer';
import { savedViewsManager } from './savedViewsManager';
import { qualityTemplateManager } from './qualityTemplateManager';
import { quickCapturePresetsManager } from './quickCapturePresets';
import { preferenceService } from './preferenceService';
import { resourceLinks } from '../integration/resourceLinks';
import { parseOwnerRef } from '../integration/ownerResourceRefs';

export class ConfigExportImportManager {
  /**
   * Generates a sanitized, privacy-safe configuration bundle
   */
  public generateBundle(): PersonalizationConfigBundle {
    return {
      version: '1.6.0',
      exportedAt: new Date().toISOString(),
      domainVisibility: visibilityProfileManager.getConfig(),
      navigation: {
        sidebarItems: navigationCustomizer.getSidebarItems(),
        mobileNav: navigationCustomizer.getMobileBottomNav(),
      },
      favorites: favoritesManager.getFavorites(),
      resourceLinks: resourceLinks.get(),
      workspacePresets: workspacePresetsManager.getPresets().filter((p) => !p.isBuiltIn),
      workflowPresets: workflowPresetsManager.getPresets().filter((p) => !p.isBuiltIn),
      shortcuts: keyboardShortcutManager.getShortcuts().filter((s) => s.isCustom),
      home: homeCustomizer.getConfig(),
      savedViews: savedViewsManager.getSavedViews().filter((v) => v.id.startsWith('sv-custom-')),
      templates: qualityTemplateManager.getTemplates().filter((t) => !t.isBuiltIn),
      quickCapturePresets: quickCapturePresetsManager.getPresets().filter((c) => !c.id.startsWith('cap-')),
    };
  }

  /**
   * Validates and imports a configuration bundle safely
   */
  public async importBundle(rawJson: string, mode: 'merge' | 'replace' = 'merge'): Promise<{ success: boolean; importedCount: number; errors?: string[] }> {
    try {
      const bundle = JSON.parse(rawJson) as PersonalizationConfigBundle;
      if (!bundle || bundle.version !== '1.6.0') {
        return {
          success: false,
          importedCount: 0,
          errors: ['Invalid bundle version or corrupt JSON payload.'],
        };
      }

      let count = 0;

      // 1. Domain Visibility
      if (bundle.domainVisibility) {
        await preferenceService.set('domain_visibility', bundle.domainVisibility, 'global-synced');
        count++;
      }

      // 2. Navigation
      if (bundle.navigation?.sidebarItems) {
        await navigationCustomizer.setSidebarItems(bundle.navigation.sidebarItems);
        count++;
      }
      if (bundle.navigation?.mobileNav) {
        await navigationCustomizer.setMobileBottomNav(bundle.navigation.mobileNav);
        count++;
      }

      // 3. Home Layout
      if (bundle.home) {
        await preferenceService.set('home_customization', bundle.home, 'global-synced');
        count++;
      }

      // 4. Custom Templates
      if (Array.isArray(bundle.templates)) {
        for (const t of bundle.templates) {
          await qualityTemplateManager.saveTemplate(t);
          count++;
        }
      }

      // 5. Custom Workspace Presets
      if (Array.isArray(bundle.workspacePresets)) {
        for (const wp of bundle.workspacePresets) {
          await workspacePresetsManager.saveCustomPreset(wp);
          count++;
        }
      }

      // 6. Custom Workflow Presets
      if (Array.isArray(bundle.workflowPresets)) {
        for (const wf of bundle.workflowPresets) {
          await workflowPresetsManager.saveCustomPreset(wf);
          count++;
        }
      }

      // B1b. Retain legacy favorites; never rewrite record ownership or payload.
      if (Array.isArray(bundle.favorites)) {
        for (const f of bundle.favorites.slice(0, 1000)) {
          if (!f || typeof f.id !== 'string' || !f.id || typeof f.title !== 'string' || f.title.length > 120 || typeof f.type !== 'string' || typeof f.resourceId !== 'string' || !f.resourceId || f.resourceId.length > 256) continue;
          if (f.resourceUri && (!parseOwnerRef(f.resourceUri) || parseOwnerRef(f.resourceUri)?.id !== f.resourceId)) continue;
          if (!f.resourceUri && !['note','project','course','saved-view','dashboard','collection','context'].includes(f.type)) continue;
          await favoritesManager.addFavorite({ id: f.id, title: f.title, type: f.type, resourceId: f.resourceId, resourceUri: f.resourceUri });
          count++;
        }
      }
      if (bundle.resourceLinks) count += await resourceLinks.importVerified(bundle.resourceLinks);

      // 7. Custom Saved Views
      if (Array.isArray(bundle.savedViews)) {
        for (const sv of bundle.savedViews.slice(0, 200)) {
          if (await savedViewsManager.importView(sv) === 'imported') count++;
        }
      }

      return { success: true, importedCount: count };
    } catch (err: any) {
      return {
        success: false,
        importedCount: 0,
        errors: [err?.message || 'Failed to parse configuration bundle.'],
      };
    }
  }
}

export const configExportImportManager = new ConfigExportImportManager();
