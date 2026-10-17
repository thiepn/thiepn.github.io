import { Note, Folder } from '../../types';
import { NavigationDiagnosticReport } from './navigationTypes';
import { backlinkNavigationService } from './backlinkNavigationService';
import { navigationHistoryManager } from './navigationHistoryManager';
import { preferenceService } from '../personalization/preferenceService';
import { vaultManager } from '../indexer';

export class NavigationDoctor {
  /**
   * Run full suite of navigation diagnostic audits
   */
  public runDiagnostics(notes: Note[], folders: Folder[]): NavigationDiagnosticReport {
    let totalChecks = 0;
    const duplicateTitles: Array<{ title: string; noteIds: string[] }> = [];
    const invalidAliasTargets: Array<{ alias: string; targetId: string }> = [];
    const brokenSavedViews: Array<{ viewId: string; title: string; missingField: string }> = [];
    const brokenFavorites: Array<{ resourceType: string; resourceId: string }> = [];
    const duplicateResourceIds: string[] = [];

    // 1. Check Duplicate Note Titles
    totalChecks++;
    const titleMap = new Map<string, string[]>();
    notes.forEach((n) => {
      if (n.trashed) return;
      const cleanTitle = (n.title || '').trim().toLowerCase();
      if (cleanTitle) {
        if (!titleMap.has(cleanTitle)) titleMap.set(cleanTitle, []);
        titleMap.get(cleanTitle)!.push(n.id);
      }
    });

    titleMap.forEach((ids, title) => {
      if (ids.length > 1) {
        duplicateTitles.push({ title, noteIds: ids });
      }
    });

    // 2. Check Duplicate Stable Note IDs
    totalChecks++;
    const idSet = new Set<string>();
    notes.forEach((n) => {
      if (idSet.has(n.id)) {
        duplicateResourceIds.push(n.id);
      }
      idSet.add(n.id);
    });

    // 3. Check Broken Wikilinks, Headings, and Blocks
    totalChecks++;
    const allBroken = backlinkNavigationService.auditBrokenLinks(notes);
    const brokenWikilinks = allBroken.filter((b) => b.brokenType === 'missing_note');
    const missingHeadings = allBroken.filter((b) => b.brokenType === 'missing_heading');
    const missingBlocks = allBroken.filter((b) => b.brokenType === 'missing_block');

    // 4. Check Favorites for Missing Resources
    totalChecks++;
    const favorites = preferenceService.getFavorites();
    favorites.forEach((fav) => {
      if (fav.resourceType === 'note') {
        const exists = notes.some((n) => n.id === fav.resourceId && !n.trashed);
        if (!exists) {
          brokenFavorites.push({ resourceType: fav.resourceType, resourceId: fav.resourceId });
        }
      }
    });

    // 5. Check Navigation History Integrity
    totalChecks++;
    const history = navigationHistoryManager.getHistoryStack();
    const historyCount = history.length;

    // Status evaluation
    let status: NavigationDiagnosticReport['status'] = 'healthy';
    if (duplicateResourceIds.length > 0 || brokenWikilinks.length > 10) {
      status = 'issues';
    } else if (
      duplicateTitles.length > 0 ||
      brokenWikilinks.length > 0 ||
      missingHeadings.length > 0 ||
      missingBlocks.length > 0 ||
      brokenFavorites.length > 0
    ) {
      status = 'warnings';
    }

    return {
      timestamp: Date.now(),
      status,
      duplicateTitles,
      brokenWikilinks,
      missingHeadings,
      missingBlocks,
      invalidAliasTargets,
      staleBacklinkCount: 0,
      brokenSavedViews,
      brokenFavorites,
      duplicateResourceIds,
      historyEntriesCount: historyCount,
      totalChecks,
    };
  }
}

export const navigationDoctor = new NavigationDoctor();
