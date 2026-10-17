/**
 * Phase P36: Rule Summary Generator
 * Generates clear, human-readable, deterministic natural-language summaries for rules.
 */

import { AutomationRule, AutomationTrigger, AutomationCondition, AutomationAction } from './automationTypes';
import { Folder } from '../../types';

export function getTriggerSummary(trigger: AutomationTrigger, folders: Folder[] = []): string {
  const getFolderName = (id?: string | null) => {
    if (!id) return 'any folder';
    const f = folders.find((x) => x.id === id);
    return f ? `"${f.name}"` : `folder "${id}"`;
  };

  switch (trigger.type) {
    case 'note_created':
      return trigger.folderId
        ? `a note is created in ${getFolderName(trigger.folderId)}`
        : 'a new note is created';
    case 'note_updated':
      return 'a note is modified and saved';
    case 'note_renamed':
      return 'a note is renamed';
    case 'note_moved':
      return 'a note is moved';
    case 'note_restored':
      return 'a note is restored from trash';
    case 'note_archived':
      return 'a note is archived';

    case 'property_added':
      return `property "${trigger.propertyKey}" is added to a note`;
    case 'property_changed':
      return `property "${trigger.propertyKey}" changes`;
    case 'property_removed':
      return `property "${trigger.propertyKey}" is removed`;
    case 'property_becomes_value':
      return `property "${trigger.propertyKey}" becomes "${trigger.targetValue}"`;

    case 'tag_added':
      return `tag "#${trigger.tag.replace(/^#/, '')}" is added to a note`;
    case 'tag_removed':
      return `tag "#${trigger.tag.replace(/^#/, '')}" is removed from a note`;

    case 'task_completed':
      return 'a task is checked off';
    case 'task_reopened':
      return 'a task is reopened';
    case 'all_tasks_completed':
      return 'all tasks in a note are completed';

    case 'quick_capture_committed':
      return 'a Quick Capture is committed';
    case 'browser_capture_committed':
      return trigger.sourceHost
        ? `a browser capture from "${trigger.sourceHost}" is committed`
        : 'a browser extension capture is committed';
    case 'pwa_share_committed':
      return 'content is received via PWA Share Target';

    case 'reference_created':
      return 'a new academic reference is added to the library';
    case 'pdf_linked_reference':
      return 'a PDF is attached to a reference';

    case 'schedule_daily':
      return `every day at ${trigger.time}`;
    case 'schedule_weekly':
      return `every ${(trigger.weekdays || []).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(', ')} at ${trigger.time}`;
    case 'schedule_monthly':
      return `on day ${trigger.dayOfMonth} of every month at ${trigger.time}`;
    case 'schedule_interval':
      return `every ${trigger.intervalDays} days at ${trigger.time}`;
    case 'app_open':
      return `the application opens (at most once every ${trigger.minIntervalHours}h)`;

    default:
      return 'an event occurs';
  }
}

export function getConditionSummary(condition: AutomationCondition, folders: Folder[] = []): string {
  const getFolderName = (id?: string | null) => {
    if (!id) return 'Root / Unassigned';
    const f = folders.find((x) => x.id === id);
    return f ? `"${f.name}"` : `folder "${id}"`;
  };

  let str = '';
  switch (condition.type) {
    case 'folder_equals':
      str = `folder is ${getFolderName(condition.value)}`;
      break;
    case 'folder_under':
      str = `folder is under ${getFolderName(condition.value)}`;
      break;
    case 'title_contains':
      str = `title contains "${condition.value}"`;
      break;
    case 'title_starts_with':
      str = `title starts with "${condition.value}"`;
      break;
    case 'is_daily_note':
      str = condition.value !== false ? 'note is a Daily Note' : 'note is NOT a Daily Note';
      break;
    case 'is_template':
      str = condition.value !== false ? 'note is a template' : 'note is NOT a template';
      break;
    case 'has_attachments':
      str = 'note has image or audio attachments';
      break;
    case 'has_open_tasks':
      str = 'note contains unfinished tasks';
      break;
    case 'is_archived':
      str = 'note is archived';
      break;
    case 'has_tag':
      str = `has tag "#${String(condition.value || '').replace(/^#/, '')}"`;
      break;
    case 'does_not_have_tag':
      str = `does not have tag "#${String(condition.value || '').replace(/^#/, '')}"`;
      break;
    case 'property_exists':
      str = `property "${condition.field}" exists`;
      break;
    case 'property_equals':
      str = `property "${condition.field}" equals "${condition.value}"`;
      break;
    case 'property_not_equals':
      str = `property "${condition.field}" does NOT equal "${condition.value}"`;
      break;
    case 'property_numeric_cmp':
      str = `property "${condition.field}" ${condition.operator || '=='} ${condition.value}`;
      break;
    case 'property_date_cmp':
      str = `property "${condition.field}" is ${condition.operator || 'equals'} "${condition.value}"`;
      break;
    case 'all_tasks_completed':
      str = 'all tasks in note are completed';
      break;
    case 'open_task_count':
      str = `open task count ${condition.operator || '=='} ${condition.value}`;
      break;
    case 'has_pdf':
      str = 'reference has PDF attachment';
      break;
    case 'reference_type_equals':
      str = `reference type is "${condition.value}"`;
      break;
    case 'source_host_contains':
      str = `source URL contains "${condition.value}"`;
      break;
    case 'origin_equals':
      str = `event origin is ${condition.value}`;
      break;
    default:
      str = `${condition.type}`;
  }

  if (condition.negate) {
    return `NOT (${str})`;
  }
  return str;
}

export function getActionSummary(action: AutomationAction, folders: Folder[] = []): string {
  const getFolderName = (id?: string | null) => {
    if (!id) return 'Root / Unassigned';
    const f = folders.find((x) => x.id === id);
    return f ? `"${f.name}"` : `folder "${id}"`;
  };

  switch (action.type) {
    case 'create_note':
      return `create note "${action.titleTemplate}" in ${getFolderName(action.folderId)}`;
    case 'move_note':
      return `move note to ${getFolderName(action.targetFolderId)}`;
    case 'rename_note':
      return `rename note to "${action.titleTemplate}"`;
    case 'apply_template':
      return `apply template "${action.templateId}" (${action.mode})`;
    case 'append_markdown':
      return `append markdown to note`;
    case 'prepend_markdown':
      return `prepend markdown to note`;
    case 'insert_under_heading':
      return `insert content under heading "## ${action.heading}"`;
    case 'archive_note':
      return action.archive ? 'archive note' : 'unarchive note';
    case 'move_to_trash':
      return 'move note to trash';
    case 'set_property':
      return `set property "${action.key}" = "${action.value}"`;
    case 'remove_property':
      return `remove property "${action.key}"`;
    case 'add_tag':
      return `add tag "#${action.tag.replace(/^#/, '')}"`;
    case 'remove_tag':
      return `remove tag "#${action.tag.replace(/^#/, '')}"`;
    case 'add_task':
      return `add task "- [ ] ${action.taskText}"`;
    case 'complete_all_tasks':
      return 'mark all tasks in note as complete';
    case 'show_in_app_notification':
      return `show notification: "${action.message}"`;
    case 'suggest_action':
      return `suggest "${action.title}"`;
    default:
      return (action as any).type;
  }
}

/**
 * Generates a full natural-language sentence describing the rule
 */
export function generateRuleSummary(rule: AutomationRule, folders: Folder[] = []): string {
  const whenPart = `When ${getTriggerSummary(rule.trigger, folders)}`;

  let ifPart = '';
  if (rule.conditions && rule.conditions.length > 0) {
    const condList = rule.conditions.map((c) => getConditionSummary(c, folders));
    const joiner = rule.conditionGroup === 'ANY' ? ' or ' : ', and ';
    ifPart = `, if ${condList.join(joiner)}`;
  }

  let thenPart = '';
  if (rule.actions && rule.actions.length > 0) {
    const actList = rule.actions.map((a) => getActionSummary(a, folders));
    thenPart = `, then ${actList.join(', and ')}`;
  } else {
    thenPart = ', do nothing';
  }

  return `${whenPart}${ifPart}${thenPart}.`;
}
