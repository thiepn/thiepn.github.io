/**
 * Phase P41: Permission Matrix & Capability Enforcement
 */

import { PermissionDefinition, PluginPermission } from './types';

export const PERMISSION_REGISTRY: Record<PluginPermission, PermissionDefinition> = {
  'commands.register': {
    id: 'commands.register',
    name: 'Register Commands',
    description: 'Add custom commands to the Command Palette (Mod+K)',
    riskLevel: 'low',
    humanReadableGrant: 'Add custom actions and keyboard shortcuts to the Command Palette.',
  },
  'workspace.view': {
    id: 'workspace.view',
    name: 'Contribute Workspace Views',
    description: 'Open isolated visual panels and tools in the workspace',
    riskLevel: 'low',
    humanReadableGrant: 'Display custom workspace panels inside isolated sandboxes.',
  },
  'notes.read:selected': {
    id: 'notes.read:selected',
    name: 'Read Selected Text',
    description: 'Access only text explicitly highlighted and submitted to the plugin',
    riskLevel: 'low',
    humanReadableGrant: 'Read only text you specifically highlight when invoking the plugin.',
  },
  'notes.read:current': {
    id: 'notes.read:current',
    name: 'Read Current Active Note',
    description: 'Read the title, body, and tags of the note currently open in the editor',
    riskLevel: 'medium',
    humanReadableGrant: 'Read the currently active note while working in the editor.',
    warningNote: 'The plugin will have access to the contents of whichever note is currently opened in your active tab.',
  },
  'notes.read:metadata': {
    id: 'notes.read:metadata',
    name: 'Read Vault Metadata',
    description: 'Read note titles, folders, tags, and timestamps without reading note bodies',
    riskLevel: 'medium',
    humanReadableGrant: 'Inspect note titles, tags, and structure without reading full note contents.',
  },
  'notes.read:all': {
    id: 'notes.read:all',
    name: 'Read All Notes in Vault',
    description: 'Read titles, tags, and full markdown content across all notes in the vault',
    riskLevel: 'high',
    humanReadableGrant: 'Read the complete text and content of all notes in your vault.',
    warningNote: 'Broad access grant: The plugin can inspect your entire notes repository.',
  },
  'notes.write:selected': {
    id: 'notes.write:selected',
    name: 'Replace Selected Text',
    description: 'Replace or format text you have highlighted in the active note',
    riskLevel: 'medium',
    humanReadableGrant: 'Modify or format only the text you highlight in the active note.',
  },
  'notes.write:current': {
    id: 'notes.write:current',
    name: 'Modify Current Active Note',
    description: 'Make canonical edits, additions, or replacements in the currently active note',
    riskLevel: 'high',
    humanReadableGrant: 'Edit the currently open note using canonical versioned transactions.',
    warningNote: 'The plugin can modify the active note content. All edits are tracked in history and undoable.',
  },
  'notes.write:create': {
    id: 'notes.write:create',
    name: 'Create New Notes',
    description: 'Create new canonical notes in the vault',
    riskLevel: 'medium',
    humanReadableGrant: 'Create new notes in your vault.',
  },
  'tasks.read': {
    id: 'tasks.read',
    name: 'Read Tasks & Projects',
    description: 'Read task titles, due dates, statuses, and project groupings',
    riskLevel: 'medium',
    humanReadableGrant: 'Inspect your tasks, due dates, and priorities.',
  },
  'tasks.write': {
    id: 'tasks.write',
    name: 'Create & Modify Tasks',
    description: 'Add new tasks, update statuses, or modify due dates',
    riskLevel: 'medium',
    humanReadableGrant: 'Create and update tasks in your planner.',
  },
  'calendar.read': {
    id: 'calendar.read',
    name: 'Read Calendar Events',
    description: 'Read events and schedules from connected calendars',
    riskLevel: 'medium',
    humanReadableGrant: 'View your scheduled calendar events and meetings.',
  },
  'calendar.write': {
    id: 'calendar.write',
    name: 'Create & Update Calendar Events',
    description: 'Schedule new calendar events or modify existing calendar entries',
    riskLevel: 'high',
    humanReadableGrant: 'Schedule or update events on your calendar.',
  },
  'people.read': {
    id: 'people.read',
    name: 'Read Contacts & CRM',
    description: 'Read contact names, relationships, interaction history, and notes',
    riskLevel: 'medium',
    humanReadableGrant: 'View your contacts and relationship notes.',
  },
  'people.write': {
    id: 'people.write',
    name: 'Update Contacts & CRM',
    description: 'Create new contacts or record interactions',
    riskLevel: 'medium',
    humanReadableGrant: 'Add or update contact records and logs.',
  },
  'finance.read': {
    id: 'finance.read',
    name: 'Read Financial Records (High Risk)',
    description: 'Read accounts, balances, transactions, and budget data',
    riskLevel: 'critical',
    humanReadableGrant: 'Access your private financial accounts, balances, and transaction history.',
    warningNote: 'Sensitive Financial Data: Only grant this permission to extensions you completely trust.',
  },
  'finance.write': {
    id: 'finance.write',
    name: 'Modify Financial Records (High Risk)',
    description: 'Record new transactions or modify budgets',
    riskLevel: 'critical',
    humanReadableGrant: 'Create or update financial ledger transactions and accounts.',
    warningNote: 'Sensitive Financial Action: Direct ledger modification.',
  },
  'health.read': {
    id: 'health.read',
    name: 'Read Health & Vitals (High Risk)',
    description: 'Read health metrics, workouts, symptoms, and medical notes',
    riskLevel: 'critical',
    humanReadableGrant: 'Access your private personal health logs, vitals, and medical notes.',
    warningNote: 'Sensitive Health Data: Only grant this permission to extensions you completely trust.',
  },
  'health.write': {
    id: 'health.write',
    name: 'Record Health Metrics (High Risk)',
    description: 'Log workouts, symptoms, and health measurements',
    riskLevel: 'critical',
    humanReadableGrant: 'Record health entries into your personal health journal.',
  },
  'travel.read': {
    id: 'travel.read',
    name: 'Read Travel Itineraries',
    description: 'Read flights, lodging, bookings, and packing lists',
    riskLevel: 'medium',
    humanReadableGrant: 'View your travel plans and booking confirmations.',
  },
  'travel.write': {
    id: 'travel.write',
    name: 'Update Travel Itineraries',
    description: 'Create or update trips, bookings, and packing lists',
    riskLevel: 'medium',
    humanReadableGrant: 'Modify trip itineraries and packing lists.',
  },
  'assets.read': {
    id: 'assets.read',
    name: 'Read Asset Inventory',
    description: 'Read physical assets, serial numbers, warranties, and maintenance logs',
    riskLevel: 'medium',
    humanReadableGrant: 'Inspect physical asset records and warranties.',
  },
  'assets.write': {
    id: 'assets.write',
    name: 'Update Asset Inventory',
    description: 'Add or update physical assets, items, and warranties',
    riskLevel: 'medium',
    humanReadableGrant: 'Add or edit inventory asset records.',
  },
  'decisions.read': {
    id: 'decisions.read',
    name: 'Read Decision Log',
    description: 'Read logged decisions, rationales, and retrospectives',
    riskLevel: 'medium',
    humanReadableGrant: 'Inspect logged decisions and rationale notes.',
  },
  'decisions.write': {
    id: 'decisions.write',
    name: 'Update Decision Log',
    description: 'Record new decisions or update retrospectives',
    riskLevel: 'medium',
    humanReadableGrant: 'Log new decisions or update reflection notes.',
  },
  'context.read.current': {
    id: 'context.read.current',
    name: 'Read Current Workspace Context',
    description: 'Access active space, active project, and high-level context metadata without full note contents',
    riskLevel: 'low',
    humanReadableGrant: 'Inspect current workspace mode, active project name, and focus context.',
  },
  'ai.invoke': {
    id: 'ai.invoke',
    name: 'Invoke Configured AI Engine',
    description: 'Submit sanitized text payloads to the local or user-configured AI model (without exposing API keys)',
    riskLevel: 'medium',
    humanReadableGrant: 'Invoke AI processing using your configured AI settings without revealing API keys.',
  },
  'network.request': {
    id: 'network.request',
    name: 'External Network Access (High Risk)',
    description: 'Make outbound HTTPS requests to declared external domains',
    riskLevel: 'high',
    humanReadableGrant: 'Connect to external internet services and API endpoints.',
    warningNote: 'Network Connection: The plugin can send and receive data over the internet.',
  },
  'filesystem.import': {
    id: 'filesystem.import',
    name: 'Import Staged Files',
    description: 'Parse user-selected files into staged preview records',
    riskLevel: 'medium',
    humanReadableGrant: 'Parse files you select for import into staged preview items.',
  },
  'notifications.schedule': {
    id: 'notifications.schedule',
    name: 'Schedule Local Notifications',
    description: 'Schedule reminders and background notifications through the system notification service',
    riskLevel: 'low',
    humanReadableGrant: 'Send you local reminders and alert notifications.',
  },
  'search.metadata': {
    id: 'search.metadata',
    name: 'Search Metadata Index',
    description: 'Search for notes matching titles or tags',
    riskLevel: 'low',
    humanReadableGrant: 'Search through note titles and tags in the vault.',
  },
  'import.register': {
    id: 'import.register',
    name: 'Register Import Adapters',
    description: 'Provide custom file format converters for the Universal Migration Hub',
    riskLevel: 'medium',
    humanReadableGrant: 'Convert custom file formats into normalized notes during manual import.',
  },
  'export.register': {
    id: 'export.register',
    name: 'Register Export & Publish Transformers',
    description: 'Provide custom export formats and publication renderers',
    riskLevel: 'low',
    humanReadableGrant: 'Format notes into custom export outputs when requested.',
  },
  'events.subscribe': {
    id: 'events.subscribe',
    name: 'Subscribe to Vault Events',
    description: 'Receive notifications when notes are saved, created, or closed',
    riskLevel: 'medium',
    humanReadableGrant: 'Receive notifications when notes are saved or modified.',
    warningNote: 'The plugin will be notified when actions occur in the vault (only resource IDs, no raw contents).',
  },
  'storage.private': {
    id: 'storage.private',
    name: 'Private Isolated Storage',
    description: 'Store plugin-specific settings and state in an isolated quota-bounded store',
    riskLevel: 'low',
    humanReadableGrant: 'Save plugin-specific preferences and cached state locally.',
  },
  'editor.decorations': {
    id: 'editor.decorations',
    name: 'Editor Visual Decorations',
    description: 'Contribute non-destructive inline highlights or gutter markers',
    riskLevel: 'low',
    humanReadableGrant: 'Highlight words or syntax visually in the editor.',
  },
};

export function isHighRiskPermission(perm: PluginPermission): boolean {
  const def = PERMISSION_REGISTRY[perm];
  return def?.riskLevel === 'high' || def?.riskLevel === 'critical';
}

export function detectPermissionEscalation(
  oldPerms: PluginPermission[],
  newPerms: PluginPermission[]
): { hasEscalation: boolean; newPermissions: PluginPermission[] } {
  const oldSet = new Set(oldPerms);
  const newOnes = newPerms.filter((p) => !oldSet.has(p));
  return {
    hasEscalation: newOnes.length > 0,
    newPermissions: newOnes,
  };
}

export function getPermissionDefinition(perm: PluginPermission): PermissionDefinition {
  return (
    PERMISSION_REGISTRY[perm] || {
      id: perm,
      name: perm,
      description: 'Custom capability',
      riskLevel: 'medium',
      humanReadableGrant: `Access capability: ${perm}`,
    }
  );
}

export function validatePermissionList(permissions: unknown): PluginPermission[] {
  if (!Array.isArray(permissions)) return [];
  const valid: PluginPermission[] = [];
  for (const p of permissions) {
    if (typeof p === 'string' && p in PERMISSION_REGISTRY) {
      if (!valid.includes(p as PluginPermission)) {
        valid.push(p as PluginPermission);
      }
    }
  }
  return valid;
}
