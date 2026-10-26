/**
 * Phase P41: Plugin Manifest Validator & Schema Enforcer
 */

import { PluginManifest, PluginPermission } from './types';
import { validatePermissionList } from './permissions';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest?: PluginManifest;
}

const ID_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)+$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;

export function validatePluginManifest(rawJson: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawJson || typeof rawJson !== 'object') {
    return { valid: false, errors: ['Manifest must be a non-null JSON object.'], warnings: [] };
  }

  const obj = rawJson as Record<string, any>;

  // 1. ID Check (Reverse domain notation required)
  if (!obj.id || typeof obj.id !== 'string') {
    errors.push('Manifest "id" is required and must be a string (e.g. "org.pkm.word-count").');
  } else if (!ID_REGEX.test(obj.id)) {
    errors.push(`Manifest "id" ("${obj.id}") must be in reverse domain format (e.g. "com.author.tool" or "org.pkm.word-count") using lowercase alphanumeric characters, dots, and hyphens.`);
  }

  // 2. Name
  if (!obj.name || typeof obj.name !== 'string' || obj.name.trim().length === 0) {
    errors.push('Manifest "name" is required and must be a non-empty string.');
  }

  // 3. Version
  if (!obj.version || typeof obj.version !== 'string') {
    errors.push('Manifest "version" is required (e.g. "1.0.0").');
  } else if (!SEMVER_REGEX.test(obj.version)) {
    warnings.push(`Manifest "version" ("${obj.version}") is not strictly semantic versioning (MAJOR.MINOR.PATCH).`);
  }

  // 4. API Version
  if (!obj.apiVersion || obj.apiVersion !== '1') {
    errors.push(`Unsupported or missing "apiVersion" ("${obj.apiVersion || 'undefined'}"). This application runtime requires apiVersion: "1".`);
  }

  // 5. Description
  const description = typeof obj.description === 'string' ? obj.description : '';

  // 6. Author
  let author: { name: string; url?: string; email?: string } = { name: 'Unknown Author' };
  if (obj.author) {
    if (typeof obj.author === 'string') {
      author = { name: obj.author };
    } else if (typeof obj.author === 'object') {
      author = {
        name: typeof obj.author.name === 'string' ? obj.author.name : 'Unknown Author',
        url: typeof obj.author.url === 'string' ? obj.author.url : undefined,
        email: typeof obj.author.email === 'string' ? obj.author.email : undefined,
      };
    }
  }

  // 7. Category
  const validCategories = ['utility', 'workspace', 'editor', 'import-export', 'theme', 'analytics'];
  const category = validCategories.includes(obj.category) ? obj.category : 'utility';

  // 8. Permissions
  const permissions: PluginPermission[] = validatePermissionList(obj.permissions);
  if (Array.isArray(obj.permissions) && obj.permissions.length > permissions.length) {
    warnings.push('One or more unrecognized permissions were filtered out.');
  }

  // 9. Entry points & File paths (No directory traversal or absolute paths)
  let entryWorker: string | undefined;
  if (obj.entryWorker && typeof obj.entryWorker === 'string') {
    if (obj.entryWorker.includes('..') || obj.entryWorker.startsWith('/') || obj.entryWorker.includes('\\')) {
      errors.push('Security violation: "entryWorker" cannot contain relative traversal ("..") or absolute path delimiters.');
    } else {
      entryWorker = obj.entryWorker;
    }
  }

  let entryUi: string | undefined;
  if (obj.entryUi && typeof obj.entryUi === 'string') {
    if (obj.entryUi.includes('..') || obj.entryUi.startsWith('/') || obj.entryUi.includes('\\')) {
      errors.push('Security violation: "entryUi" cannot contain relative traversal ("..") or absolute path delimiters.');
    } else {
      entryUi = obj.entryUi;
    }
  }

  // Validate contributions
  const contributions: PluginManifest['contributions'] = {};
  if (obj.contributions && typeof obj.contributions === 'object') {
    if (Array.isArray(obj.contributions.commands)) {
      contributions.commands = obj.contributions.commands.filter((c: any) => {
        return c && typeof c === 'object' && typeof c.id === 'string' && typeof c.title === 'string';
      });
    }
    if (Array.isArray(obj.contributions.views)) {
      contributions.views = obj.contributions.views.filter((v: any) => {
        return v && typeof v === 'object' && typeof v.id === 'string' && typeof v.title === 'string';
      });
    }
    if (Array.isArray(obj.contributions.adapters)) {
      contributions.adapters = obj.contributions.adapters.filter((a: any) => {
        return a && typeof a === 'object' && typeof a.id === 'string' && typeof a.name === 'string';
      });
    }
    if (Array.isArray(obj.contributions.settings)) {
      contributions.settings = obj.contributions.settings.filter((s: any) => {
        return s && typeof s === 'object' && typeof s.key === 'string' && typeof s.label === 'string';
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const sanitizedManifest: PluginManifest = {
    id: obj.id,
    name: obj.name.trim(),
    version: obj.version.trim(),
    apiVersion: '1',
    description,
    author,
    category,
    entryWorker,
    entryUi,
    permissions,
    minAppVersion: typeof obj.minAppVersion === 'string' ? obj.minAppVersion : undefined,
    maxApiVersion: typeof obj.maxApiVersion === 'string' ? obj.maxApiVersion : undefined,
    activationEvents: Array.isArray(obj.activationEvents) ? obj.activationEvents.filter((e) => typeof e === 'string') : [],
    contributions,
    supportsMobile: typeof obj.supportsMobile === 'boolean' ? obj.supportsMobile : true,
    license: typeof obj.license === 'string' ? obj.license : 'MIT',
  };

  return {
    valid: true,
    errors: [],
    warnings,
    manifest: sanitizedManifest,
  };
}
