import { MOCConfig, MOCHierarchyMode, MOCSortField } from './mocTypes';

export interface MOCParseResult {
  config: MOCConfig;
  error?: string;
}

const DEFAULT_MOC_CONFIG: MOCConfig = {
  hierarchy: 'folder',
  depth: 2,
  sort: 'title',
  limit: 100,
  showCounts: true,
};

const VALID_KEYS = new Set([
  'folder',
  'tag',
  'tags',
  'links-to',
  'links_to',
  'linksto',
  'linked-from',
  'linked_from',
  'linkedfrom',
  'hierarchy',
  'mode',
  'depth',
  'sort',
  'order',
  'limit',
  'counts',
  'showcounts',
  'show_counts',
]);

/**
 * Parses fenced MOC code block configuration safely.
 */
export function parseMOCConfig(code: string): MOCParseResult {
  const config: MOCConfig = { ...DEFAULT_MOC_CONFIG };
  if (!code || !code.trim()) {
    return { config };
  }

  const lines = code.trim().split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const rawLine = lines[lineNum].trim();
    if (!rawLine || rawLine.startsWith('#') || rawLine.startsWith('//')) {
      continue;
    }

    const colonIdx = rawLine.indexOf(':');
    if (colonIdx === -1) {
      return {
        config,
        error: `Line ${lineNum + 1}: Malformed MOC rule "${rawLine}". Expected format "key: value"`,
      };
    }

    const rawKey = rawLine.slice(0, colonIdx).trim().toLowerCase();
    let rawValue = rawLine.slice(colonIdx + 1).trim();

    // Strip optional surrounding quotes
    if (
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
    ) {
      rawValue = rawValue.slice(1, -1).trim();
    }

    if (!VALID_KEYS.has(rawKey)) {
      return {
        config,
        error: `Line ${lineNum + 1}: Unknown MOC field "${rawKey}". Supported fields: folder, tag, links-to, linked-from, hierarchy, depth, sort, limit, counts`,
      };
    }

    switch (rawKey) {
      case 'folder':
        config.folder = rawValue;
        break;

      case 'tag':
      case 'tags':
        config.tag = rawValue.startsWith('#') ? rawValue.slice(1) : rawValue;
        break;

      case 'links-to':
      case 'links_to':
      case 'linksto':
        config.linksTo = rawValue.replace(/^\[\[(.*?)\]\]$/, '$1');
        break;

      case 'linked-from':
      case 'linked_from':
      case 'linkedfrom':
        config.linkedFrom = rawValue.replace(/^\[\[(.*?)\]\]$/, '$1');
        break;

      case 'hierarchy':
      case 'mode': {
        const lowerMode = rawValue.toLowerCase();
        if (lowerMode === 'folder' || lowerMode === 'link' || lowerMode === 'flat') {
          config.hierarchy = lowerMode as MOCHierarchyMode;
        } else {
          return {
            config,
            error: `Line ${lineNum + 1}: Invalid hierarchy mode "${rawValue}". Expected "folder", "link", or "flat"`,
          };
        }
        break;
      }

      case 'depth': {
        const d = parseInt(rawValue, 10);
        if (isNaN(d) || d < 1) {
          return {
            config,
            error: `Line ${lineNum + 1}: Depth must be a positive integer between 1 and 5`,
          };
        }
        config.depth = Math.min(5, Math.max(1, d));
        break;
      }

      case 'sort':
      case 'order': {
        const lowerSort = rawValue.toLowerCase();
        if (lowerSort === 'title' || lowerSort === 'updated' || lowerSort === 'created') {
          config.sort = lowerSort as MOCSortField;
        } else {
          return {
            config,
            error: `Line ${lineNum + 1}: Invalid sort field "${rawValue}". Expected "title", "updated", or "created"`,
          };
        }
        break;
      }

      case 'limit': {
        const lim = parseInt(rawValue, 10);
        if (isNaN(lim) || lim < 1) {
          return {
            config,
            error: `Line ${lineNum + 1}: Limit must be a positive number`,
          };
        }
        config.limit = Math.min(500, Math.max(1, lim));
        break;
      }

      case 'counts':
      case 'showcounts':
      case 'show_counts': {
        config.showCounts = rawValue.toLowerCase() === 'true' || rawValue === '1' || rawValue.toLowerCase() === 'yes';
        break;
      }
    }
  }

  return { config };
}
