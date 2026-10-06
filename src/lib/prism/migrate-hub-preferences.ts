import type { HubPreferences } from '../hub-preferences';
import type { HomeView } from '../home-view';
import { createDefaultHomeDocument, type HomeDocumentV2 } from './home-document';

export interface HomeMigrationRemainder {
  sourceVersion: 1;
  legacyHomeView: HomeView;
}

export interface HomeMigrationResult {
  document: HomeDocumentV2;
  remainder: HomeMigrationRemainder;
}

export function migrateHubPreferencesV1(preferences: HubPreferences): HomeMigrationResult {
  const document = createDefaultHomeDocument();

  document.appearance.density = preferences.density === 'comfortable' ? 'comfortable' : 'compact';

  const apps = document.blocks['block-apps'];
  if (apps) {
    apps.settings = {
      ...apps.settings,
      appOrder: [...preferences.pins],
    };
  }

  if (preferences.home.hidden) {
    for (const blockId of ['block-continue', 'block-now', 'block-study', 'block-recent']) {
      const block = document.blocks[blockId];
      if (block) block.hidden = true;
    }
  }

  return {
    document,
    remainder: {
      sourceVersion: 1,
      legacyHomeView: {
        modules: [...preferences.home.modules],
        mode: preferences.home.mode,
        focus: preferences.home.focus,
        timezone: preferences.home.timezone,
        hidden: preferences.home.hidden,
      },
    },
  };
}
