import { Note } from '../../types';

export type MacroActionType =
  | 'create_note'
  | 'append_daily'
  | 'open_modal'
  | 'play_sound'
  | 'fire_confetti'
  | 'copy_text';

export interface MacroStep {
  id: string;
  action: MacroActionType;
  params: Record<string, any>;
}

export interface MacroDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name or emoji
  shortcut?: string;
  steps: MacroStep[];
  createdAt: string;
  isDefault?: boolean;
}

export interface MacroExecutionContext {
  createNote: (title: string, content: string, tags?: string[]) => Promise<Note> | Promise<void>;
  appendDailyNote: (content: string) => Promise<void>;
  openModal: (modalName: string, payload?: any) => void;
  playSound: () => void;
  fireConfetti: () => void;
  copyText?: (text: string) => Promise<void>;
}

export interface MacroExecutionResult {
  macroId: string;
  success: boolean;
  stepsExecuted: number;
  totalSteps: number;
  logs: string[];
  durationMs: number;
  error?: string;
}

export const MACRO_STORAGE_KEY = 'pkm_user_macros_v1';

/**
 * Pre-configured default macro recipes
 */
export const DEFAULT_MACROS: MacroDefinition[] = [
  {
    id: 'macro-morning-ritual',
    name: '🌅 Morning Startup Ritual',
    description: 'Appends morning intentions to Daily Note, starts a 25-min Pomodoro timer, and plays focus chime',
    icon: 'Sun',
    shortcut: 'Alt+1',
    createdAt: '2026-10-01T00:00:00Z',
    isDefault: true,
    steps: [
      {
        id: 'step-1',
        action: 'append_daily',
        params: {
          content: '\n\n### 🌅 Morning Startup Ritual\n- [ ] Top 1 Priority identified\n- [ ] Deep work session initiated\n- [ ] Distractions cleared\n',
        },
      },
      {
        id: 'step-2',
        action: 'open_modal',
        params: { modalName: 'pomodoro_flow' },
      },
      {
        id: 'step-3',
        action: 'play_sound',
        params: {},
      },
      {
        id: 'step-4',
        action: 'fire_confetti',
        params: {},
      },
    ],
  },
  {
    id: 'macro-meeting-debrief',
    name: '🤝 Rapid Meeting Debrief Note',
    description: 'Creates a structured meeting note, tags it, and links it in your vault',
    icon: 'Users',
    shortcut: 'Alt+2',
    createdAt: '2026-10-01T00:00:00Z',
    isDefault: true,
    steps: [
      {
        id: 'step-1',
        action: 'create_note',
        params: {
          title: 'Meeting Debrief',
          content: '# 🤝 Meeting Debrief\n\n* **Attendees:** \n* **Objectives:** \n\n## 📝 Discussion Key Takeaways\n- \n\n## ⚡ Immediate Next Action Items\n- [ ] \n',
          tags: ['meeting', 'action-items'],
        },
      },
      {
        id: 'step-2',
        action: 'play_sound',
        params: {},
      },
    ],
  },
  {
    id: 'macro-zettel-extraction',
    name: '🗃️ Zettelkasten Concept Extraction Launch',
    description: 'Opens Zettelkasten Studio and triggers celebration sound',
    icon: 'Boxes',
    shortcut: 'Alt+3',
    createdAt: '2026-10-01T00:00:00Z',
    isDefault: true,
    steps: [
      {
        id: 'step-1',
        action: 'open_modal',
        params: { modalName: 'zettelkasten_studio' },
      },
      {
        id: 'step-2',
        action: 'play_sound',
        params: {},
      },
    ],
  },
  {
    id: 'macro-evening-shutdown',
    name: '🌙 Evening Shutdown & Reflection',
    description: 'Appends evening retrospective checklist to Daily Note and opens Chrono Capsule time letters',
    icon: 'Moon',
    shortcut: 'Alt+4',
    createdAt: '2026-10-01T00:00:00Z',
    isDefault: true,
    steps: [
      {
        id: 'step-1',
        action: 'append_daily',
        params: {
          content: '\n\n### 🌙 Evening Shutdown & Reflection\n- [ ] Completed tasks archived\n- [ ] Tomorrow’s leading priority scheduled\n- [ ] Work closed with peace of mind\n',
        },
      },
      {
        id: 'step-2',
        action: 'open_modal',
        params: { modalName: 'chrono_capsule' },
      },
      {
        id: 'step-3',
        action: 'play_sound',
        params: {},
      },
    ],
  },
];

/**
 * Sequential macro execution engine
 */
export async function executeMacro(
  macro: MacroDefinition,
  context: MacroExecutionContext
): Promise<MacroExecutionResult> {
  const startTime = performance.now();
  const logs: string[] = [];
  let stepsExecuted = 0;

  try {
    for (const step of macro.steps) {
      logs.push(`Executing step: ${step.action}...`);

      switch (step.action) {
        case 'create_note': {
          const title = step.params.title || 'Automated Note';
          const content = step.params.content || '';
          const tags = step.params.tags || ['macro'];
          await context.createNote(title, content, tags);
          logs.push(`Created note "${title}"`);
          break;
        }

        case 'append_daily': {
          const content = step.params.content || '';
          await context.appendDailyNote(content);
          logs.push(`Appended content to daily note`);
          break;
        }

        case 'open_modal': {
          const modal = step.params.modalName;
          if (modal) {
            context.openModal(modal, step.params.payload);
            logs.push(`Opened tool: ${modal}`);
          }
          break;
        }

        case 'play_sound': {
          context.playSound();
          logs.push('Triggered soundscape chime');
          break;
        }

        case 'fire_confetti': {
          context.fireConfetti();
          logs.push('Triggered celebration confetti');
          break;
        }

        case 'copy_text': {
          if (context.copyText && step.params.text) {
            await context.copyText(step.params.text);
            logs.push('Copied text to clipboard');
          }
          break;
        }

        default:
          logs.push(`Unknown step action: ${(step as any).action}`);
      }

      stepsExecuted++;
    }

    const durationMs = Math.round(performance.now() - startTime);
    return {
      macroId: macro.id,
      success: true,
      stepsExecuted,
      totalSteps: macro.steps.length,
      logs,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    return {
      macroId: macro.id,
      success: false,
      stepsExecuted,
      totalSteps: macro.steps.length,
      logs,
      durationMs,
      error: err?.message || String(err),
    };
  }
}
