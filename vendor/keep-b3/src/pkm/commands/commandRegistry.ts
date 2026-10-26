import { PKMCommand, CommandExecutionContext, CommandCategory } from './commandTypes';

class CommandRegistry {
  private commands: Map<string, PKMCommand> = new Map();

  constructor() {
    this.registerBuiltInCommands();
  }

  public register(command: PKMCommand): void {
    this.commands.set(command.id, command);
  }

  public unregister(commandId: string): void {
    this.commands.delete(commandId);
  }

  public getCommand(commandId: string): PKMCommand | undefined {
    return this.commands.get(commandId);
  }

  public getAllCommands(context?: CommandExecutionContext): PKMCommand[] {
    const list = Array.from(this.commands.values());
    if (!context) return list;
    return list.filter((cmd) => (cmd.isAvailable ? cmd.isAvailable(context) : true));
  }

  public getCommandsByCategory(category: CommandCategory, context?: CommandExecutionContext): PKMCommand[] {
    return this.getAllCommands(context).filter((cmd) => cmd.category === category);
  }

  private registerBuiltInCommands(): void {
    // 1. Create & Capture Actions
    this.register({
      id: 'capture:quick-capture',
      title: 'Quick Capture / Fleeting Note',
      description: 'Rapidly capture an idea, task, quote, or link without context switching',
      category: 'Create',
      shortcut: 'Mod+Shift+C',
      iconName: 'Zap',
      keywords: ['capture', 'quick', 'fleeting', 'inbox', 'brain dump', 'fast', 'clip'],
      execute: (ctx) => {
        if (ctx.openQuickCapture) {
          ctx.openQuickCapture();
        } else {
          ctx.openModal('quick_capture');
        }
      },
    });

    this.register({
      id: 'inbox:open-universal',
      title: 'Open Universal Inbox (Communications & External Flow)',
      description: 'Triage incoming emails, calendar updates, files, and local captures',
      category: 'Navigation',
      iconName: 'Inbox',
      keywords: ['inbox', 'email', 'messages', 'triage', 'gmail', 'calendar', 'external', 'ingest', 'p58'],
      execute: (ctx) => {
        if (ctx.openUniversalInbox) {
          ctx.openUniversalInbox();
        } else {
          ctx.openResource({ type: 'universal-inbox', title: 'Universal Inbox' });
        }
      },
    });

    this.register({
      id: 'daily:open-today',
      title: "Open Today's Daily Note",
      description: "Jump to today's daily log note, creating it from template if missing",
      category: 'Navigation',
      shortcut: 'Alt+D',
      iconName: 'Calendar',
      keywords: ['daily', 'today', 'journal', 'log', 'diary', 'calendar', 'day'],
      execute: async (ctx) => {
        if (ctx.openDailyNote) {
          await ctx.openDailyNote(new Date());
        }
      },
    });

    this.register({
      id: 'daily:open-yesterday',
      title: "Open Yesterday's Daily Note",
      description: "Jump to yesterday's daily log note",
      category: 'Navigation',
      iconName: 'ChevronLeft',
      keywords: ['daily', 'yesterday', 'past', 'journal', 'log'],
      execute: async (ctx) => {
        if (ctx.openDailyNote) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          await ctx.openDailyNote(yesterday);
        }
      },
    });

    this.register({
      id: 'daily:open-tomorrow',
      title: "Open Tomorrow's Daily Note",
      description: "Jump to tomorrow's daily planning note",
      category: 'Navigation',
      iconName: 'ChevronRight',
      keywords: ['daily', 'tomorrow', 'future', 'journal', 'planning'],
      execute: async (ctx) => {
        if (ctx.openDailyNote) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          await ctx.openDailyNote(tomorrow);
        }
      },
    });

    this.register({
      id: 'create:new-note',
      title: 'New Note',
      description: 'Create a new blank text note in the active pane',
      category: 'Create',
      shortcut: 'Mod+N',
      iconName: 'FileText',
      keywords: ['create', 'new', 'note', 'document', 'write', 'draft'],
      execute: async (ctx) => {
        await ctx.handleCreateNote('text');
      },
    });

    this.register({
      id: 'create:new-checklist',
      title: 'New Checklist / Task List',
      description: 'Create a new interactive checklist note',
      category: 'Create',
      iconName: 'CheckSquare',
      keywords: ['create', 'new', 'checklist', 'todo', 'task', 'list'],
      execute: async (ctx) => {
        await ctx.handleCreateNote('checklist');
      },
    });

    this.register({
      id: 'create:from-template',
      title: 'Note Templates Library',
      description: 'Choose a pre-designed structure or custom template for a new note',
      category: 'Create',
      iconName: 'LayoutTemplate',
      shortcut: 'Mod+Shift+T',
      keywords: ['template', 'library', 'scaffold', 'meeting', 'daily', 'review'],
      execute: (ctx) => {
        if (ctx.openTemplates) {
          ctx.openTemplates();
        } else {
          ctx.openModal('templates');
        }
      },
    });

    this.register({
      id: 'tasks:vault-task-center',
      title: 'Open Vault Task Center (Global Action Items & Agenda)',
      description: 'View, filter, complete, and manage all action items and todos across every note in your vault',
      category: 'Navigation',
      iconName: 'ListTodo',
      shortcut: 'Mod+Alt+T',
      keywords: ['tasks', 'todo', 'checklist', 'actions', 'agenda', 'overdue', 'due', 'items'],
      execute: (ctx) => {
        if (ctx.openTasks) {
          ctx.openTasks();
        } else {
          ctx.openModal('vault_tasks');
        }
      },
    });

    this.register({
      id: 'tools:template-creator',
      title: 'Template Creator (Design Reusable Note Template)',
      description: 'Open the visual Template Creator studio to design or extract templates with variables',
      category: 'Tools & Diagnostics',
      iconName: 'Sparkles',
      keywords: ['template', 'creator', 'builder', 'design', 'variables', 'extract', 'reusable'],
      execute: (ctx) => {
        if (ctx.openTemplates) {
          ctx.openTemplates();
        } else {
          ctx.openModal('templates');
        }
      },
    });

    this.register({
      id: 'note:save-as-template',
      title: 'Save Active Note as Template',
      description: 'Extract and save the active note structure, outline, and checklists as a reusable template',
      category: 'Note Actions',
      iconName: 'LayoutTemplate',
      isAvailable: (ctx) => Boolean(ctx.activeNote),
      keywords: ['template', 'save', 'extract', 'structure', 'convert', 'reusable'],
      execute: (ctx) => {
        if (ctx.activeNote) {
          if (ctx.openTemplates) {
            ctx.openTemplates(ctx.activeNote);
          } else {
            ctx.openModal('templates');
          }
        }
      },
    });

    this.register({
      id: 'note:compare-and-merge',
      title: 'Compare & Merge Notes (Visual Diff & Consolidation)',
      description: 'Side-by-side note comparison, line-by-line diffs, cherry-picking, and link-safe merging',
      category: 'Tools & Diagnostics',
      iconName: 'GitMerge',
      shortcut: 'Mod+Alt+M',
      keywords: ['compare', 'diff', 'merge', 'duplicate', 'reconcile', 'side by side', 'consolidate'],
      execute: (ctx) => {
        if (ctx.openNoteCompare) {
          ctx.openNoteCompare(ctx.activeNote?.id);
        } else {
          ctx.openModal('note_compare');
        }
      },
    });

    this.register({
      id: 'note:zen-mode',
      title: 'Zen Focus Mode (Distraction-Free Editor)',
      description: 'Open the active note in immersive distraction-free fullscreen Zen mode',
      category: 'Note Actions',
      iconName: 'Sparkles',
      shortcut: 'Alt+Z',
      keywords: ['zen', 'focus', 'distraction free', 'fullscreen', 'typewriter', 'editor', 'writing'],
      isAvailable: (ctx) => Boolean(ctx.activeNote),
      execute: (ctx) => {
        if (ctx.openZenMode) {
          ctx.openZenMode();
        } else {
          ctx.openModal('zen_mode', ctx.activeNote);
        }
      },
    });

    this.register({
      id: 'create:drawing',
      title: 'New Drawing / Sketch',
      description: 'Create a new hand-drawn sketch attachment',
      category: 'Create',
      iconName: 'Palette',
      keywords: ['drawing', 'sketch', 'paint', 'canvas', 'illustration'],
      execute: (ctx) => {
        ctx.openModal('drawing');
      },
    });

    // 2. Navigation & Views
    this.register({
      id: 'nav:vault-search',
      title: 'Open Vault Search',
      description: 'Open dedicated full-text search & query explorer',
      category: 'Navigation',
      shortcut: 'Mod+Shift+F',
      iconName: 'Search',
      keywords: ['search', 'find', 'query', 'filter', 'lookup', 'grep'],
      execute: (ctx) => {
        ctx.openSearch();
      },
    });

    this.register({
      id: 'nav:home-notes',
      title: 'Open Vault Notes (Home Feed)',
      description: 'Switch to the primary vault notes masonry/list grid',
      category: 'Navigation',
      iconName: 'Home',
      keywords: ['home', 'vault', 'notes', 'feed', 'grid', 'overview'],
      execute: (ctx) => {
        ctx.openHome();
      },
    });

    this.register({
      id: 'nav:smart-views',
      title: 'Open Smart Queries',
      description: 'Browse and run structured live Smart Views',
      category: 'Navigation',
      iconName: 'Sparkles',
      keywords: ['smart', 'queries', 'views', 'filters', 'saved'],
      execute: (ctx) => {
        ctx.openSmartViews();
      },
    });

    this.register({
      id: 'nav:knowledge-graph',
      title: 'Open Knowledge Graph',
      description: 'Visualize interactive 2D node-link network of all note links',
      category: 'Navigation',
      iconName: 'Network',
      keywords: ['graph', 'nodes', 'network', 'links', 'connections', 'visualize'],
      execute: (ctx) => {
        ctx.openGraph();
      },
    });

    this.register({
      id: 'graph:local-graph',
      title: 'Open Local Graph Inspector',
      description: 'Inspect immediate 1-hop and 2-hop neighborhood of active note',
      category: 'Navigation',
      shortcut: 'Mod+Shift+G',
      iconName: 'Share2',
      keywords: ['local graph', 'neighborhood', 'hops', 'inspector', 'subgraph', 'related'],
      execute: (ctx) => {
        if (ctx.openLocalGraph) {
          ctx.openLocalGraph();
        }
      },
    });

    this.register({
      id: 'extraction:extract-to-note',
      title: 'Extract Selection to Note',
      description: 'Decompose selected text into a new atomic note with link/embed',
      category: 'Note Actions',
      shortcut: 'Mod+Shift+E',
      iconName: 'Scissors',
      keywords: ['extract', 'atomic', 'refactor', 'split', 'selection', 'decompose'],
      execute: (ctx) => {
        if (ctx.openExtraction) {
          ctx.openExtraction();
        }
      },
    });

    this.register({
      id: 'flashback:resurface',
      title: 'Knowledge Resurfacing (Flashback)',
      description: 'Resurface meaningful notes from 7 days, 1 month, or 1 year ago',
      category: 'Navigation',
      iconName: 'History',
      keywords: ['flashback', 'resurface', 'on this day', 'review', 'memory', 'older notes'],
      execute: (ctx) => {
        if (ctx.openFlashback) {
          ctx.openFlashback();
        }
      },
    });

    this.register({
      id: 'nav:kanban-board',
      title: 'Open Kanban Board',
      description: 'Manage tasks and notes in columns by status or priority',
      category: 'Navigation',
      iconName: 'Kanban',
      keywords: ['kanban', 'board', 'status', 'columns', 'agile', 'tasks', 'todo'],
      execute: (ctx) => {
        ctx.openKanban();
      },
    });

    this.register({
      id: 'nav:calendar',
      title: 'Open Calendar & Temporal View',
      description: 'Monthly and weekly visual calendar across notes, daily notes, and tasks',
      category: 'Navigation',
      iconName: 'Calendar',
      keywords: ['calendar', 'month', 'week', 'schedule', 'temporal', 'dates', 'agenda'],
      execute: (ctx) => {
        if (ctx.openCalendar) {
          ctx.openCalendar();
        } else {
          ctx.openResource({ type: 'calendar', title: 'Calendar & Agenda' });
        }
      },
    });

    this.register({
      id: 'nav:agenda',
      title: 'Open Scheduled Agenda',
      description: 'Review overdue, today, this week, and upcoming scheduled tasks and milestones',
      category: 'Navigation',
      iconName: 'ListTodo',
      keywords: ['agenda', 'schedule', 'overdue', 'today', 'upcoming', 'due', 'tasks', 'milestones'],
      execute: (ctx) => {
        if (ctx.openAgenda) {
          ctx.openAgenda();
        } else {
          ctx.openResource({ type: 'agenda', title: 'Scheduled Agenda' });
        }
      },
    });

    this.register({
      id: 'nav:timeline',
      title: 'Open Activity Timeline',
      description: 'Chronological timeline of created, edited, and completed notes and tasks',
      category: 'Navigation',
      iconName: 'Activity',
      keywords: ['timeline', 'chronology', 'activity', 'history', 'stream', 'log'],
      execute: (ctx) => {
        if (ctx.openTimeline) {
          ctx.openTimeline();
        } else {
          ctx.openResource({ type: 'timeline', title: 'Activity Timeline' });
        }
      },
    });

    this.register({
      id: 'nav:infinite-canvas',
      title: 'Open Infinite Canvas',
      description: 'Spatial whiteboarding with canonical notes, transclusions, and freeform layouts',
      category: 'Navigation',
      shortcut: 'Alt+C',
      iconName: 'Compass',
      keywords: ['canvas', 'whiteboard', 'spatial', 'mindmap', 'cards', 'board', 'diagram'],
      execute: (ctx) => {
        ctx.openCanvas();
      },
    });

    this.register({
      id: 'canvas:find',
      title: 'Canvas: Find on Canvas',
      description: 'Search cards, sections, blocks, and text on active spatial canvas',
      category: 'Navigation',
      shortcut: 'Mod+F',
      iconName: 'Search',
      keywords: ['canvas', 'find', 'search', 'cards', 'notes'],
      execute: (ctx) => {
        ctx.openCanvas();
      },
    });

    this.register({
      id: 'canvas:object-outline',
      title: 'Canvas: Object List & Structure Outline',
      description: 'Accessible overview of all cards, sections, blocks, and connectors',
      category: 'Navigation',
      shortcut: 'Alt+O',
      iconName: 'ListTree',
      keywords: ['canvas', 'outline', 'objects', 'list', 'accessible', 'structure'],
      execute: (ctx) => {
        ctx.openCanvas();
      },
    });

    this.register({
      id: 'nav:pdf-reader',
      title: 'Open PDF Reader',
      description: 'View PDF documents, extract text, and make highlights',
      category: 'Navigation',
      iconName: 'FileText',
      keywords: ['pdf', 'document', 'paper', 'reader', 'annotate', 'highlight'],
      execute: (ctx) => {
        ctx.openPDF();
      },
    });

    this.register({
      id: 'nav:media-library',
      title: 'Open Media & Attachments Library',
      description: 'Inspect vault media assets, PDFs, images, audio notes, and unreferenced files',
      category: 'Navigation',
      iconName: 'HardDrive',
      keywords: ['media', 'attachments', 'images', 'audio', 'recordings', 'files', 'library', 'assets'],
      execute: (ctx) => {
        if (ctx.openMedia) {
          ctx.openMedia();
        } else {
          ctx.openResource({ type: 'media', title: 'Media Library' });
        }
      },
    });

    this.register({
      id: 'media:record-audio',
      title: 'Record Audio Note',
      description: 'Record encrypted browser-native voice note and attach to note or vault',
      category: 'Create',
      shortcut: 'Alt+Shift+R',
      iconName: 'Mic',
      keywords: ['audio', 'record', 'voice', 'mic', 'sound', 'memo', 'speech'],
      execute: (ctx) => {
        ctx.openModal('audio_recorder');
      },
    });

    // 3. Workspace & Panes
    this.register({
      id: 'workspace:split-vertical',
      title: 'Split Workspace (Side by Side)',
      description: 'Split the active workspace horizontally into two columns',
      category: 'Workspace',
      shortcut: 'Alt+\\',
      iconName: 'Columns',
      keywords: ['split', 'columns', 'vertical', 'side by side', 'pane', 'dual'],
      execute: (ctx) => {
        ctx.splitWorkspace('horizontal');
      },
    });

    this.register({
      id: 'workspace:split-horizontal',
      title: 'Split Workspace (Stacked Up/Down)',
      description: 'Split the active workspace vertically into two stacked rows',
      category: 'Workspace',
      iconName: 'Rows3',
      keywords: ['split', 'rows', 'horizontal', 'stacked', 'pane', 'dual'],
      execute: (ctx) => {
        ctx.splitWorkspace('vertical');
      },
    });

    this.register({
      id: 'workspace:close-split',
      title: 'Close Split (Collapse to Single Pane)',
      description: 'Merge back into a single pane view',
      category: 'Workspace',
      iconName: 'Minimize2',
      keywords: ['close split', 'merge pane', 'single pane', 'unsplit'],
      execute: (ctx) => {
        ctx.closeSplit();
      },
    });

    this.register({
      id: 'workspace:swap-panes',
      title: 'Swap Left & Right Panes',
      description: 'Exchange the contents of the primary and secondary panes',
      category: 'Workspace',
      iconName: 'ArrowLeftRight',
      keywords: ['swap', 'switch', 'panes', 'exchange'],
      execute: (ctx) => {
        ctx.swapPanes();
      },
    });

    this.register({
      id: 'workspace:close-tab',
      title: 'Close Active Tab',
      description: 'Close the currently focused tab in the active pane',
      category: 'Workspace',
      shortcut: 'Alt+W',
      iconName: 'X',
      keywords: ['close', 'tab', 'dismiss', 'exit'],
      execute: (ctx) => {
        ctx.closeActiveTab();
      },
    });

    this.register({
      id: 'workspace:reopen-closed-tab',
      title: 'Reopen Closed Tab',
      description: 'Restore the most recently closed workspace tab',
      category: 'Workspace',
      shortcut: 'Mod+Shift+T',
      iconName: 'RotateCcw',
      keywords: ['reopen', 'restore', 'undo close', 'closed tab'],
      execute: (ctx) => {
        ctx.reopenClosedTab();
      },
    });

    this.register({
      id: 'workspace:navigate-back',
      title: 'Navigate Back in History',
      description: 'Go to the previous workspace view',
      category: 'Workspace',
      shortcut: 'Alt+Left',
      iconName: 'ArrowLeft',
      keywords: ['back', 'previous', 'history'],
      execute: (ctx) => {
        ctx.navigateBack();
      },
    });

    this.register({
      id: 'workspace:navigate-forward',
      title: 'Navigate Forward in History',
      description: 'Go to the next workspace view in forward history',
      category: 'Workspace',
      shortcut: 'Alt+Right',
      iconName: 'ArrowRight',
      keywords: ['forward', 'next', 'history'],
      execute: (ctx) => {
        ctx.navigateForward();
      },
    });

    // 4. Workspace Presets
    this.register({
      id: 'preset:research',
      title: 'Apply Workspace: Research Setup (PDF + Notes)',
      description: 'Split pane layout with PDF document and note editor',
      category: 'Workspace',
      iconName: 'BookOpen',
      keywords: ['preset', 'research', 'pdf', 'notes', 'layout'],
      execute: (ctx) => {
        ctx.applyPreset('research');
      },
    });

    this.register({
      id: 'preset:knowledge',
      title: 'Apply Workspace: Knowledge Hub (Note + Graph)',
      description: 'Split pane layout with active note and knowledge graph',
      category: 'Workspace',
      iconName: 'Network',
      keywords: ['preset', 'knowledge', 'graph', 'notes', 'layout'],
      execute: (ctx) => {
        ctx.applyPreset('knowledge');
      },
    });

    this.register({
      id: 'preset:planning',
      title: 'Apply Workspace: Planning Hub (Kanban + Note)',
      description: 'Split pane layout with Kanban board and note editor',
      category: 'Workspace',
      iconName: 'Kanban',
      keywords: ['preset', 'planning', 'kanban', 'tasks', 'layout'],
      execute: (ctx) => {
        ctx.applyPreset('planning');
      },
    });

    this.register({
      id: 'preset:spatial',
      title: 'Apply Workspace: Spatial Canvas Hub (Canvas + Note)',
      description: 'Split pane layout with Infinite Canvas and note editor',
      category: 'Workspace',
      iconName: 'Compass',
      keywords: ['preset', 'spatial', 'canvas', 'notes', 'layout'],
      execute: (ctx) => {
        ctx.applyPreset('spatial');
      },
    });

    this.register({
      id: 'preset:default-clean',
      title: 'Apply Workspace: Clean Single Pane',
      description: 'Reset workspace to a clean single pane view',
      category: 'Workspace',
      iconName: 'Square',
      keywords: ['preset', 'clean', 'reset', 'single', 'layout'],
      execute: (ctx) => {
        ctx.applyPreset('default-clean');
      },
    });

    // 5. View Mode Changes
    this.register({
      id: 'view:masonry',
      title: 'Set View Mode: Masonry Grid',
      description: 'Display notes in dynamic multi-column masonry grid',
      category: 'View & Layout',
      iconName: 'LayoutGrid',
      keywords: ['view', 'masonry', 'grid', 'cards', 'layout'],
      execute: (ctx) => {
        ctx.handleUpdateSettings({ viewMode: 'masonry' });
      },
    });

    this.register({
      id: 'view:list',
      title: 'Set View Mode: Compact List',
      description: 'Display notes in dense, single-row list layout',
      category: 'View & Layout',
      iconName: 'List',
      keywords: ['view', 'list', 'compact', 'dense', 'rows'],
      execute: (ctx) => {
        ctx.handleUpdateSettings({ viewMode: 'list' });
      },
    });

    this.register({
      id: 'view:stacked',
      title: 'Set View Mode: Stacked Cards',
      description: 'Display notes in expanded single-column card stack',
      category: 'View & Layout',
      iconName: 'Rows3',
      keywords: ['view', 'stacked', 'stream', 'cards'],
      execute: (ctx) => {
        ctx.handleUpdateSettings({ viewMode: 'stacked' });
      },
    });

    this.register({
      id: 'view:calendar',
      title: 'Set View Mode: Calendar Timeline',
      description: 'Display notes organized by creation or reminder dates',
      category: 'View & Layout',
      iconName: 'Calendar',
      keywords: ['view', 'calendar', 'dates', 'timeline', 'schedule'],
      execute: (ctx) => {
        ctx.handleUpdateSettings({ viewMode: 'calendar' });
      },
    });

    this.register({
      id: 'theme:toggle',
      title: 'Toggle Dark / Light Theme',
      description: 'Switch between dark and light color themes',
      category: 'View & Layout',
      iconName: 'SunMoon',
      keywords: ['theme', 'dark', 'light', 'mode', 'color', 'night'],
      execute: (ctx) => {
        const nextTheme = ctx.settings.theme === 'dark' ? 'light' : 'dark';
        ctx.handleUpdateSettings({ theme: nextTheme });
      },
    });

    // 6. Tools, Sync & Diagnostics
    this.register({
      id: 'tools:vault-doctor',
      title: 'Run Vault Doctor Diagnostics',
      description: 'Inspect vault health, dead links, unreferenced assets, and index anomalies',
      category: 'Tools & Diagnostics',
      iconName: 'Activity',
      keywords: ['doctor', 'diagnostics', 'health', 'broken links', 'check', 'repair'],
      execute: (ctx) => {
        ctx.openModal('vault_doctor');
      },
    });

    this.register({
      id: 'tools:recovery-center',
      title: 'Data Resilience & Recovery Points',
      description: 'Manage recovery points, emergency Markdown snapshots, storage quotas, and atomic journal',
      category: 'Tools & Diagnostics',
      iconName: 'ShieldCheck',
      keywords: ['recovery', 'resilience', 'snapshots', 'backup', 'emergency', 'journal', 'restore', 'quota', 'p29'],
      execute: (ctx) => {
        ctx.openModal('recovery_center');
      },
    });

    this.register({
      id: 'tools:sync-git',
      title: 'Sync & Versioning (Git / Remote)',
      description: 'Commit changes, sync with remote Git repository or WebDAV/S3',
      category: 'Tools & Diagnostics',
      iconName: 'FolderSync',
      keywords: ['sync', 'git', 'versioning', 'backup', 'remote', 'commit', 'push'],
      execute: (ctx) => {
        ctx.openModal('sync');
      },
    });

    this.register({
      id: 'tools:import-takeout',
      title: 'Import Notes (Google Takeout / Markdown / JSON)',
      description: 'Import notes and archives from Keep Takeout or Markdown files',
      category: 'Tools & Diagnostics',
      iconName: 'Upload',
      keywords: ['import', 'takeout', 'markdown', 'zip', 'json', 'archive', 'upload'],
      execute: (ctx) => {
        ctx.openModal('import');
      },
    });

    this.register({
      id: 'tools:manage-folders',
      title: 'Manage Folders & Hierarchy',
      description: 'Create, rename, color-code, and organize vault folders',
      category: 'Tools & Diagnostics',
      iconName: 'Folder',
      keywords: ['folders', 'directories', 'organize', 'categories', 'management'],
      execute: (ctx) => {
        ctx.openModal('manage_folders');
      },
    });

    this.register({
      id: 'tools:manage-tags',
      title: 'Manage Tags (Rename, Merge, Delete)',
      description: 'Clean up tag library, rename or delete tags across all notes, merge case variations',
      category: 'Tools & Diagnostics',
      iconName: 'Tag',
      keywords: ['tags', 'manage', 'rename', 'delete', 'merge', 'clean', 'hashtags', 'labels'],
      execute: (ctx) => {
        ctx.openModal('manage_tags');
      },
    });

    this.register({
      id: 'tools:settings',
      title: 'App Settings & Preferences',
      description: 'Configure fonts, spacing, auto-save, defaults, and hotkeys',
      category: 'Tools & Diagnostics',
      iconName: 'Settings',
      keywords: ['settings', 'preferences', 'configuration', 'options'],
      execute: (ctx) => {
        ctx.openModal('settings');
      },
    });

    this.register({
      id: 'tools:shortcuts',
      title: 'Keyboard Shortcuts Cheatsheet',
      description: 'View all keyboard shortcuts and navigation commands',
      category: 'Tools & Diagnostics',
      shortcut: '?',
      iconName: 'Keyboard',
      keywords: ['shortcuts', 'keyboard', 'hotkeys', 'cheatsheet', 'help'],
      execute: (ctx) => {
        ctx.openModal('shortcuts');
      },
    });

    this.register({
      id: 'tools:extension-settings',
      title: 'Browser Extension & Universal Capture Bridge',
      description: 'Manage extension pairing, secret tokens, trusted origins, and capture bridge',
      category: 'Tools & Diagnostics',
      iconName: 'Bookmark',
      keywords: ['extension', 'chrome', 'firefox', 'clipper', 'web capture', 'pair', 'bridge', 'p34'],
      execute: (ctx) => {
        ctx.openModal('extension_settings');
      },
    });

    this.register({
      id: 'tools:pair-extension',
      title: 'Pair Browser Extension',
      description: 'Open extension pairing dialog and view connection secret token',
      category: 'Tools & Diagnostics',
      iconName: 'Key',
      keywords: ['pair', 'extension', 'token', 'secret', 'connect', 'clipper'],
      execute: (ctx) => {
        ctx.openModal('extension_settings');
      },
    });

    // 6b. Academic Research & Reference Management (Phase P35)
    this.register({
      id: 'references:open-library',
      title: 'Open Reference Library & Academic Citations',
      description: 'Open the comprehensive academic reference library with DOI, arXiv, BibTeX and PDF linkages',
      category: 'Navigation',
      iconName: 'Bookmark',
      keywords: ['references', 'citations', 'bibliography', 'academic', 'doi', 'arxiv', 'bibtex', 'papers', 'literature', 'p35'],
      execute: (ctx) => {
        if (ctx.openResource) {
          ctx.openResource({ type: 'references', title: 'Reference Library' });
        } else {
          ctx.openModal('reference_library');
        }
      },
    });

    this.register({
      id: 'references:add-by-identifier',
      title: 'Add Reference by Identifier (DOI / arXiv / ISBN)',
      description: 'Fetch complete bibliographic metadata from DOI, arXiv ID, or ISBN/PMID',
      category: 'Create',
      iconName: 'Plus',
      keywords: ['doi', 'arxiv', 'isbn', 'crossref', 'lookup', 'fetch', 'reference', 'citation', 'paper'],
      execute: (ctx) => {
        ctx.openModal('reference_add_identifier');
      },
    });

    this.register({
      id: 'references:import-bibtex',
      title: 'Import BibTeX File (.bib)',
      description: 'Import references, citation keys, and abstracts from a .bib or .bibtex file',
      category: 'Tools & Diagnostics',
      iconName: 'Upload',
      keywords: ['bibtex', 'bib', 'zotero', 'mendeley', 'import', 'references', 'citations'],
      execute: (ctx) => {
        ctx.openModal('reference_import_bibtex');
      },
    });

    this.register({
      id: 'references:insert-bibliography',
      title: 'Insert Bibliography Block',
      description: 'Insert an auto-generating ```bibliography code block into the current note',
      category: 'Note Actions',
      iconName: 'List',
      keywords: ['bibliography', 'references', 'citations', 'sources', 'apa', 'ieee', 'chicago', 'block'],
      execute: (ctx) => {
        if (ctx.insertMarkdownSnippet) {
          ctx.insertMarkdownSnippet('\n```bibliography\nstyle: apa\n```\n');
        }
      },
    });

    this.register({
      id: 'references:find-duplicates',
      title: 'Find & Merge Duplicate References',
      description: 'Scan library for duplicate papers, DOIs, and titles with interactive merge review',
      category: 'Tools & Diagnostics',
      iconName: 'GitMerge',
      keywords: ['duplicates', 'merge', 'clean', 'deduplicate', 'references', 'citations'],
      execute: (ctx) => {
        ctx.openModal('reference_duplicates');
      },
    });

    // 6c. Local Automation, Rules & Workflows (Phase P36)
    this.register({
      id: 'automation:open-center',
      title: 'Open Automation Center',
      description: 'View and manage local automation rules, recurring workflows, execution logs, and recipes',
      category: 'Tools & Diagnostics',
      iconName: 'Zap',
      keywords: ['automation', 'rules', 'workflows', 'recurring', 'schedule', 'cron', 'triggers', 'actions', 'p36'],
      execute: (ctx) => {
        if (ctx.openResource) {
          ctx.openResource({ type: 'automations', title: 'Automation Center' });
        }
      },
    });

    this.register({
      id: 'automation:create-rule',
      title: 'Create New Automation Rule',
      description: 'Open the visual rule builder to configure triggers, conditions, and actions',
      category: 'Create',
      iconName: 'Plus',
      keywords: ['automation', 'new rule', 'rule builder', 'create workflow', 'schedule', 'p36'],
      execute: (ctx) => {
        if (ctx.openResource) {
          ctx.openResource({ type: 'automations', title: 'Automation Center' });
        }
      },
    });

    // 7. Security & Encryption
    this.register({
      id: 'security:vault-encryption',
      title: 'Vault Encryption Settings',
      description: 'Configure zero-knowledge AES-256-GCM encryption for the entire vault',
      category: 'Vault & Security',
      iconName: 'Shield',
      keywords: ['encryption', 'security', 'password', 'crypto', 'protect', 'zero knowledge'],
      execute: (ctx) => {
        ctx.openModal('vault_encryption');
      },
    });

    this.register({
      id: 'sync:p2p-device-sync',
      title: 'P2P Device Sync (Experimental)',
      description: 'Synchronize notes directly with another personal device using WebRTC & QR pairing',
      category: 'Vault & Security',
      iconName: 'Radio',
      keywords: ['p2p', 'device', 'sync', 'webrtc', 'pair', 'qr', 'phone', 'laptop', 'offline'],
      execute: (ctx) => {
        ctx.openModal('device_sync');
      },
    });

    this.register({
      id: 'security:lock-vault',
      title: 'Lock Vault Now',
      description: 'Instantly lock the encrypted vault and clear sensitive session keys',
      category: 'Vault & Security',
      iconName: 'Lock',
      keywords: ['lock', 'secure', 'encrypt', 'logout', 'session'],
      isAvailable: (ctx) => Boolean(ctx.lockVault),
      execute: (ctx) => {
        if (ctx.lockVault) {
          ctx.lockVault();
        }
      },
    });

    // 8. Spaced Repetition & Knowledge Review (Phase P38)
    this.register({
      id: 'review:open-workspace',
      title: 'Open Knowledge Review & Card Browser',
      description: 'Review due flashcards, browse active recall items, and inspect memory retention',
      category: 'Navigation',
      iconName: 'Brain',
      keywords: ['review', 'spaced repetition', 'anki', 'flashcard', 'fsrs', 'recall', 'study', 'quiz', 'p38'],
      execute: (ctx) => {
        if (ctx.openReview) {
          ctx.openReview();
        } else if (ctx.openResource) {
          ctx.openResource({ type: 'review', title: 'Knowledge Review' });
        }
      },
    });

    this.register({
      id: 'review:insert-qa-card',
      title: 'Insert Review Card: Question & Answer',
      description: 'Insert a standard active recall question and answer card into the active note',
      category: 'Note Actions',
      iconName: 'HelpCircle',
      keywords: ['flashcard', 'qa', 'question', 'answer', 'card', 'spaced repetition', 'recall'],
      isAvailable: (ctx) => Boolean(ctx.activeNote && ctx.insertMarkdownSnippet),
      execute: (ctx) => {
        if (ctx.insertMarkdownSnippet) {
          ctx.insertMarkdownSnippet('**Q:** What is the concept?\n**A:** Detailed explanation here.\n^card-' + Date.now().toString(36));
        }
      },
    });

    this.register({
      id: 'review:insert-cloze-card',
      title: 'Insert Review Card: Cloze Deletion',
      description: 'Insert an active recall cloze deletion into the active note',
      category: 'Note Actions',
      iconName: 'Sparkles',
      keywords: ['cloze', 'deletion', 'fill in blank', 'flashcard', 'mask', 'recall'],
      isAvailable: (ctx) => Boolean(ctx.activeNote && ctx.insertMarkdownSnippet),
      execute: (ctx) => {
        if (ctx.insertMarkdownSnippet) {
          ctx.insertMarkdownSnippet('The key principle is {{c1::insert hidden fact here::optional hint}}.\n^card-' + Date.now().toString(36));
        }
      },
    });

    // 9. Publishing, Export & Static Site Generation (Phase P39)
    this.register({
      id: 'publish:open-manager',
      title: 'Publish & Export Manager',
      description: 'Configure and compile static websites, manage digital gardens, and run privacy audits',
      category: 'Tools & Diagnostics',
      shortcut: 'Mod+Shift+P',
      iconName: 'Globe',
      keywords: ['publish', 'export', 'static site', 'digital garden', 'ssg', 'html', 'sitemap', 'rss', 'p39'],
      execute: (ctx) => {
        if (ctx.openPublishing) {
          ctx.openPublishing();
        } else {
          ctx.openModal('publication_manager');
        }
      },
    });

    this.register({
      id: 'publish:export-current-note-html',
      title: 'Export Active Note as Standalone HTML',
      description: 'Export the currently active note as a self-contained portable HTML file',
      category: 'Note Actions',
      iconName: 'FileCode',
      keywords: ['export', 'html', 'save html', 'single note', 'webpage', 'standalone'],
      isAvailable: (ctx) => Boolean(ctx.activeNote),
      execute: (ctx) => {
        if (ctx.openSingleNoteExport) {
          ctx.openSingleNoteExport(ctx.activeNote || undefined);
        } else {
          ctx.openModal('single_note_export');
        }
      },
    });

    this.register({
      id: 'publish:export-current-note-md-zip',
      title: 'Export Active Note as Markdown Package',
      description: 'Bundle active note with its YAML frontmatter and attachments into a ZIP package',
      category: 'Note Actions',
      iconName: 'Archive',
      keywords: ['export', 'markdown', 'zip', 'package', 'bundle', 'attachments'],
      isAvailable: (ctx) => Boolean(ctx.activeNote),
      execute: (ctx) => {
        if (ctx.openSingleNoteExport) {
          ctx.openSingleNoteExport(ctx.activeNote || undefined);
        } else {
          ctx.openModal('single_note_export');
        }
      },
    });

    // 10. Universal Import & Migration Hub (Phase P40)
    this.register({
      id: 'migration:open-hub',
      title: 'Universal Import & Migration Hub',
      description: 'Migrate vaults and notes from Obsidian, Notion, Evernote, Joplin, and BibTeX',
      category: 'Tools & Diagnostics',
      shortcut: 'Mod+Shift+M',
      iconName: 'UploadCloud',
      keywords: ['import', 'migrate', 'migration', 'obsidian', 'notion', 'evernote', 'enex', 'joplin', 'bibtex', 'p40'],
      execute: (ctx) => {
        ctx.openModal('migration_hub');
      },
    });

    this.register({
      id: 'migration:import-obsidian',
      title: 'Import Obsidian Vault',
      description: 'Import Obsidian notes, wikilinks, canvas whiteboards, and callouts',
      category: 'Tools & Diagnostics',
      iconName: 'Layers',
      keywords: ['obsidian', 'vault', 'import', 'canvas', 'wikilinks'],
      execute: (ctx) => {
        ctx.openModal('migration_hub');
      },
    });

    this.register({
      id: 'migration:import-notion',
      title: 'Import Notion Export (Markdown & CSV)',
      description: 'Import Notion pages, subpages, databases, and properties',
      category: 'Tools & Diagnostics',
      iconName: 'Database',
      keywords: ['notion', 'export', 'database', 'csv', 'subpage'],
      execute: (ctx) => {
        ctx.openModal('migration_hub');
      },
    });

    this.register({
      id: 'migration:import-evernote',
      title: 'Import Evernote (.enex)',
      description: 'Parse Evernote notebooks, attachments, and ENML notes',
      category: 'Tools & Diagnostics',
      iconName: 'BookOpen',
      keywords: ['evernote', 'enex', 'notebook', 'import'],
      execute: (ctx) => {
        ctx.openModal('migration_hub');
      },
    });

    // 11. Sandboxed Plugin Architecture & Extensions (Phase P41)
    this.register({
      id: 'plugin:open-manager',
      title: 'Plugins: Open Plugin Manager',
      description: 'Manage sandboxed plugins, permissions, developer tools, and extensions',
      category: 'Tools & Diagnostics',
      shortcut: 'Mod+Shift+P',
      iconName: 'Puzzle',
      keywords: ['plugins', 'extensions', 'addons', 'sandbox', 'developer', 'packages', 'p41'],
      execute: (ctx) => {
        ctx.openModal('plugin_manager');
      },
    });

    this.register({
      id: 'plugin:safe-mode',
      title: 'Plugins: Toggle Plugin Safe Mode',
      description: 'Immediately disable all third-party plugins for safe troubleshooting',
      category: 'Vault & Security',
      iconName: 'ShieldAlert',
      keywords: ['plugin', 'safe mode', 'troubleshoot', 'disable extensions', 'security'],
      execute: () => {
        const isSafe = localStorage.getItem('keepnotes_pkm_plugin_safe_mode') === 'true';
        if (isSafe) {
          localStorage.removeItem('keepnotes_pkm_plugin_safe_mode');
          window.location.reload();
        } else {
          localStorage.setItem('keepnotes_pkm_plugin_safe_mode', 'true');
          window.location.reload();
        }
      },
    });

    // 12. Local AI Workspace, RAG & Knowledge Copilot (Phase P42)
    this.register({
      id: 'ai:open-copilot',
      title: 'AI: Open Knowledge Copilot',
      description: 'Open the privacy-conscious AI workspace to ask questions grounded in your vault notes',
      category: 'Tools & Diagnostics',
      shortcut: 'Mod+Shift+A',
      iconName: 'Sparkles',
      keywords: ['ai', 'copilot', 'rag', 'ask', 'assistant', 'chat', 'grounded', 'citations', 'p42'],
      execute: (ctx) => {
        ctx.openModal('ai_copilot');
      },
    });

    this.register({
      id: 'ai:ask-current-note',
      title: 'AI: Ask About Current Note',
      description: 'Open AI Copilot focused exclusively on the active note',
      category: 'Tools & Diagnostics',
      iconName: 'Sparkles',
      keywords: ['ai', 'ask note', 'current note', 'summarize note'],
      execute: (ctx) => {
        ctx.openModal('ai_copilot');
      },
    });

    this.register({
      id: 'ai:writing-assistant',
      title: 'AI: Writing Assistant & Transformations',
      description: 'Rewrite, summarize, explain, or outline selected note text with visual diffs',
      category: 'Note Actions',
      shortcut: 'Alt+Shift+W',
      iconName: 'Sparkles',
      keywords: ['ai', 'rewrite', 'writing', 'summarize', 'outline', 'diff', 'transform'],
      execute: (ctx) => {
        ctx.openModal('ai_writing_assistant');
      },
    });

    this.register({
      id: 'ai:settings',
      title: 'AI: Configure Knowledge Copilot Settings',
      description: 'Configure Local On-Device AI, External API keys, scope exclusions, and privacy options',
      category: 'Tools & Diagnostics',
      iconName: 'Settings',
      keywords: ['ai settings', 'local model', 'openrouter', 'gemini', 'api key', 'privacy'],
      execute: (ctx) => {
        ctx.openModal('ai_settings');
      },
    });

    // 13. Structured Collections, Relations, Formulas & Database Views (Phase P43)
    this.register({
      id: 'collections:open-hub',
      title: 'Collections: Browse & Manage Databases',
      description: 'Open all structured database collections over canonical Markdown notes',
      category: 'Navigation',
      shortcut: 'Mod+Shift+D',
      iconName: 'Layers',
      keywords: ['collection', 'database', 'table', 'board', 'gallery', 'records', 'p43', 'notion', 'views'],
      execute: (ctx) => {
        ctx.openModal('collections_index');
      },
    });

    this.register({
      id: 'collections:open-projects',
      title: 'Collections: Open Projects Database',
      description: 'Open the default project tracker collection with formulas and rollups',
      category: 'Navigation',
      iconName: 'FolderKanban',
      keywords: ['projects', 'collection', 'database', 'tasks', 'roadmap'],
      execute: (ctx) => {
        if (ctx.openCollection) {
          ctx.openCollection('col-projects', 'Projects & Deliverables');
        } else {
          ctx.openModal('collections_index');
        }
      },
    });

    this.register({
      id: 'collections:open-reading',
      title: 'Collections: Open Reading List Database',
      description: 'Open the books, papers, and articles reading database',
      category: 'Navigation',
      iconName: 'BookOpen',
      keywords: ['books', 'reading', 'papers', 'literature', 'collection'],
      execute: (ctx) => {
        if (ctx.openCollection) {
          ctx.openCollection('col-reading-list', 'Reading & Literature');
        } else {
          ctx.openModal('collections_index');
        }
      },
    });

    // 14. Dashboards, Charts, Reports & Knowledge Analytics (Phase P44)
    this.register({
      id: 'dashboards:open-hub',
      title: 'Dashboards: Open Analytics & Reports',
      description: 'Open knowledge dashboards, metric KPI cards, charts, and printable reports',
      category: 'Navigation',
      shortcut: 'Mod+Shift+B',
      iconName: 'LayoutDashboard',
      keywords: ['dashboards', 'analytics', 'charts', 'metrics', 'kpi', 'reports', 'visualize', 'p44'],
      execute: (ctx) => {
        if (ctx.openDashboard) {
          ctx.openDashboard();
        } else {
          ctx.openResource({ type: 'dashboard', title: 'Dashboard & Analytics' });
        }
      },
    });

    this.register({
      id: 'dashboards:open-vault-overview',
      title: 'Dashboards: Open Vault Overview',
      description: 'Open vault health, notes distribution, and telemetry metrics',
      category: 'Navigation',
      iconName: 'PieChart',
      keywords: ['vault overview', 'telemetry', 'storage', 'distribution', 'dashboard'],
      execute: (ctx) => {
        if (ctx.openDashboard) {
          ctx.openDashboard('dash-vault-overview', 'Vault Overview & Analytics');
        }
      },
    });

    this.register({
      id: 'dashboards:open-task-ops',
      title: 'Dashboards: Open Task Operations',
      description: 'Open task velocity, completion distribution, and overdue tracker',
      category: 'Navigation',
      iconName: 'CheckSquare',
      keywords: ['tasks', 'operations', 'velocity', 'overdue', 'todo', 'dashboard'],
      execute: (ctx) => {
        if (ctx.openDashboard) {
          ctx.openDashboard('dash-task-ops', 'Task Operations & Velocity');
        }
      },
    });

    this.register({
      id: 'dashboards:open-research-analytics',
      title: 'Dashboards: Open Research Analytics',
      description: 'Open research reference metrics, literature sources, and PDF library analytics',
      category: 'Navigation',
      iconName: 'BookOpen',
      keywords: ['research', 'references', 'citations', 'literature', 'dashboard'],
      execute: (ctx) => {
        if (ctx.openDashboard) {
          ctx.openDashboard('dash-research-analytics', 'Research & Literature Analytics');
        }
      },
    });

    // 13. Phase P45: Native Filesystem Vault Bridge Commands
    this.register({
      id: 'filesystem:open-bridge-settings',
      title: 'Filesystem Vault Bridge: Open Settings',
      description: 'Configure external folder mirroring, live sync, and permissions',
      category: 'Tools & Diagnostics',
      iconName: 'HardDrive',
      keywords: ['filesystem', 'folder', 'mirror', 'obsidian', 'vscode', 'external', 'disk'],
      execute: (ctx) => {
        if (ctx.openFilesystemBridge) {
          ctx.openFilesystemBridge();
        } else {
          ctx.openModal('filesystem_bridge');
        }
      },
    });

    this.register({
      id: 'filesystem:sync-folder-now',
      title: 'Filesystem Vault Bridge: Sync Folder Now',
      description: 'Perform immediate scan and 3-way synchronization with external folder',
      category: 'Tools & Diagnostics',
      shortcut: 'Mod+Shift+S',
      iconName: 'FolderSync',
      keywords: ['sync', 'filesystem', 'folder', 'mirror', 'reconcile', 'scan'],
      execute: (ctx) => {
        if (ctx.openFilesystemBridge) {
          ctx.openFilesystemBridge();
        } else {
          ctx.openModal('filesystem_bridge');
        }
      },
    });

    // 14. Phase P46: Native Desktop App & OS Integration Commands
    this.register({
      id: 'desktop:quick-capture',
      title: 'Desktop: Global Quick Capture',
      description: 'Open dedicated floating capture window to jot notes, tasks, or links',
      category: 'Create',
      shortcut: 'Mod+Shift+Space',
      iconName: 'Zap',
      keywords: ['desktop', 'quick capture', 'capture', 'global', 'floating', 'fleeting'],
      execute: (ctx) => {
        ctx.openModal('desktop_quick_capture');
      },
    });

    this.register({
      id: 'desktop:diagnostics',
      title: 'Desktop: Run Subsystem Diagnostics',
      description: 'Verify native bridge integrity, path security guards, and OS capabilities',
      category: 'Tools & Diagnostics',
      iconName: 'Activity',
      keywords: ['desktop', 'diagnostics', 'doctor', 'tauri', 'native', 'security', 'keychain'],
      execute: (ctx) => {
        ctx.openModal('desktop_diagnostics');
      },
    });

    // 15. Phase P47: Native Mobile App, Share Sheet, Widgets & Mobile OS Integration
    this.register({
      id: 'mobile:share-inbox',
      title: 'Mobile: Open Share Staging Queue',
      description: 'Review and ingest incoming shares from other mobile apps',
      category: 'Tools & Diagnostics',
      iconName: 'Share2',
      keywords: ['mobile', 'share', 'staging', 'inbox', 'android', 'ios', 'intent', 'p47'],
      execute: (ctx) => {
        ctx.openModal('mobile_share_inbox');
      },
    });

    this.register({
      id: 'mobile:diagnostics',
      title: 'Mobile: Run Capability Diagnostics & Audit',
      description: 'Audit mobile Share Sheet, Widgets, Notifications, and Biometric security',
      category: 'Tools & Diagnostics',
      iconName: 'Smartphone',
      keywords: ['mobile', 'doctor', 'diagnostics', 'widgets', 'biometrics', 'p47'],
      execute: (ctx) => {
        ctx.openModal('mobile_diagnostics');
      },
    });

    // 16. Phase P48: People, Contacts & Relationship Knowledge System
    this.register({
      id: 'people:open-directory',
      title: 'Open People & Relationships Directory',
      description: 'Explore contacts, organizations, follow-up queues, and birthdays',
      category: 'Navigation',
      iconName: 'Users',
      keywords: ['people', 'contacts', 'directory', 'crm', 'relationships', 'friends', 'colleagues', 'p48'],
      execute: (ctx) => {
        if (ctx.openPeople) {
          ctx.openPeople();
        } else {
          ctx.openResource({ type: 'people', title: 'People & Relationships' });
        }
      },
    });

    this.register({
      id: 'people:log-interaction',
      title: 'Log Interaction / Touchpoint',
      description: 'Quickly record a meeting, call, message, or conversation with linked people',
      category: 'Create',
      shortcut: 'Alt+Shift+I',
      iconName: 'MessageSquare',
      keywords: ['interaction', 'meeting', 'call', 'touchpoint', 'log', 'conversation', 'people', 'p48'],
      execute: (ctx) => {
        ctx.openModal('people_log_interaction');
      },
    });

    this.register({
      id: 'people:import-vcard',
      title: 'Import Contacts (vCard .vcf)',
      description: 'Import contacts from RFC 6350 .vcf files into canonical Markdown notes',
      category: 'Tools & Diagnostics',
      iconName: 'Upload',
      keywords: ['vcard', 'vcf', 'import', 'contacts', 'address book', 'people', 'p48'],
      execute: (ctx) => {
        ctx.openModal('people_import_vcard');
      },
    });

    this.register({
      id: 'people:export-vcard',
      title: 'Export Contacts (vCard .vcf)',
      description: 'Export canonical Person notes to a standard .vcf address book file',
      category: 'Tools & Diagnostics',
      iconName: 'Download',
      keywords: ['vcard', 'vcf', 'export', 'contacts', 'address book', 'people', 'p48'],
      execute: (ctx) => {
        ctx.openModal('people_export_vcard');
      },
    });

    this.register({
      id: 'people:native-picker',
      title: 'Pick Contacts from OS Device',
      description: 'Import specific contacts directly from browser/mobile Contact Picker',
      category: 'Tools & Diagnostics',
      iconName: 'Smartphone',
      keywords: ['contact picker', 'mobile contacts', 'os contacts', 'picker', 'p48'],
      execute: (ctx) => {
        ctx.openModal('people_native_picker');
      },
    });

    this.register({
      id: 'people:scan-duplicates',
      title: 'Scan Duplicate Contacts & Review Merges',
      description: 'Detect potential duplicate person notes and run safe atomic merges',
      category: 'Tools & Diagnostics',
      iconName: 'GitMerge',
      keywords: ['duplicates', 'merge', 'contacts', 'people', 'deduplicate', 'p48'],
      execute: (ctx) => {
        ctx.openModal('people_duplicates');
      },
    });

    // 17. Phase P49: Goals, Projects, Areas & Personal Planning System
    this.register({
      id: 'planning:open-hub',
      title: 'Open Planning Hub',
      description: 'Personal operating system dashboard for planning, focus, and review',
      category: 'Navigation',
      iconName: 'Compass',
      keywords: ['planning', 'hub', 'dashboard', 'focus', 'review', 'today', 'weekly', 'p49'],
      execute: (ctx) => {
        if (ctx.openPlanningHome) {
          ctx.openPlanningHome();
        } else {
          ctx.openResource({ type: 'planning-home', title: 'Planning Hub' });
        }
      },
    });

    this.register({
      id: 'planning:open-goals-projects',
      title: 'Open Goals, Projects & Areas',
      description: 'Unified management view for long-term goals, active projects, and areas',
      category: 'Navigation',
      iconName: 'Target',
      keywords: ['goals', 'projects', 'areas', 'para', 'milestones', 'planning', 'okr', 'p49'],
      execute: (ctx) => {
        if (ctx.openGoalsProjects) {
          ctx.openGoalsProjects();
        } else {
          ctx.openResource({ type: 'goals-projects', title: 'Goals & Projects' });
        }
      },
    });

    this.register({
      id: 'planning:start-weekly-review',
      title: 'Start Weekly Planning & Review',
      description: 'Interactive step-by-step weekly review for inbox, goals, projects, and commitments',
      category: 'Tools & Diagnostics',
      iconName: 'CalendarCheck2',
      keywords: ['weekly review', 'review', 'planning', 'reflection', 'gtd', 'audit', 'p49'],
      execute: (ctx) => {
        if (ctx.openPlanningHome) {
          ctx.openPlanningHome();
        } else {
          ctx.openResource({ type: 'planning-home', title: 'Planning Hub' });
        }
      },
    });

    // 18. Phase P51: Learning, Courses, Skills, Study Sessions & Curriculum System
    this.register({
      id: 'learning:open-hub',
      title: 'Open Learning & Curriculum Hub',
      description: 'Central operating workspace for active courses, deliberate practice skills, study logs, and exam prep',
      category: 'Navigation',
      iconName: 'GraduationCap',
      keywords: ['learning', 'courses', 'skills', 'curriculum', 'study', 'exam', 'practice', 'p51'],
      execute: (ctx) => {
        if (ctx.openLearning) {
          ctx.openLearning();
        } else {
          ctx.openResource({ type: 'learning', title: 'Learning & Curriculum' });
        }
      },
    });

    this.register({
      id: 'learning:log-study-session',
      title: 'Log Study Session',
      description: 'Record deliberate study, reading, lecture, or practice session with elapsed time and notes',
      category: 'Create',
      iconName: 'Clock',
      keywords: ['study', 'session', 'log', 'practice', 'timer', 'learning', 'p51'],
      execute: (ctx) => {
        if (ctx.openLearning) {
          ctx.openLearning();
        } else {
          ctx.openResource({ type: 'learning', title: 'Learning & Curriculum' });
        }
      },
    });

    this.register({
      id: 'learning:open-exam-cockpit',
      title: 'Open Exam Preparation Cockpit',
      description: 'Audit syllabus coverage, mock exams, flashcard readiness, and target exam deadlines',
      category: 'Navigation',
      iconName: 'Calendar',
      keywords: ['exam', 'test', 'prep', 'cockpit', 'study', 'learning', 'p51'],
      execute: (ctx) => {
        if (ctx.openExamPrep) {
          ctx.openExamPrep();
        } else {
          ctx.openResource({ type: 'exam-prep', title: 'Exam Preparation' });
        }
      },
    });

    this.register({
      id: 'learning:new-course',
      title: 'Create New Course Note',
      description: 'Create a canonical course note with curriculum structure and progress tracking',
      category: 'Create',
      iconName: 'BookOpen',
      keywords: ['new course', 'course', 'curriculum', 'syllabus', 'learning', 'p51'],
      execute: (ctx) => {
        if (ctx.createNote) {
          ctx.createNote({
            title: 'New Course',
            content: `---\ntype: course\nstatus: active\nprogress-mode: curriculum\n---\n\n# New Course\n\n## Overview\n\n- \n\n## Syllabus & Modules\n\n- \n`,
          });
        }
      },
    });

    this.register({
      id: 'learning:new-skill',
      title: 'Create New Skill Note',
      description: 'Create a canonical skill note for deliberate practice tracking and proficiency notes',
      category: 'Create',
      iconName: 'Award',
      keywords: ['new skill', 'skill', 'practice', 'proficiency', 'learning', 'p51'],
      execute: (ctx) => {
        if (ctx.createNote) {
          ctx.createNote({
            title: 'New Skill',
            content: `---\ntype: skill\nstatus: active\nlevel: Beginner\n---\n\n# New Skill\n\n## Overview & Scope\n\n- \n\n## Practice Routine\n\n- \n`,
          });
        }
      },
    });

    // 19. Phase P52: Library & Reading Management System
    this.register({
      id: 'library:open-hub',
      title: 'Open Library & Reading Hub',
      description: 'Unified vault library for physical books, epubs, audiobooks, and highlights',
      category: 'Navigation',
      iconName: 'BookOpen',
      keywords: ['library', 'reading', 'books', 'literature', 'audiobooks', 'highlights', 'p52'],
      execute: (ctx) => {
        if (ctx.openLibrary) {
          ctx.openLibrary();
        } else {
          ctx.openResource({ type: 'library', title: 'Library & Reading' });
        }
      },
    });

    // 20. Phase P53: Personal Finance & Ledger Management System
    this.register({
      id: 'finance:open-hub',
      title: 'Open Personal Finance Hub',
      description: 'Accounts, balances, double-entry ledgers, subscriptions, budgets, and net worth tracker',
      category: 'Navigation',
      iconName: 'Landmark',
      keywords: ['finance', 'money', 'budget', 'accounts', 'ledger', 'net worth', 'expenses', 'p53'],
      execute: (ctx) => {
        if (ctx.openFinance) {
          ctx.openFinance();
        } else {
          ctx.openResource({ type: 'finance', title: 'Personal Finance' });
        }
      },
    });

    // 21. Phase P54: Health, Fitness, Wellness & Personal Body Data
    this.register({
      id: 'health:open-hub',
      title: 'Open Health, Fitness & Body Data Vault',
      description: 'Private personal health tracker: workouts, body metrics, sleep, nutrition, vitals, medications & labs',
      category: 'Navigation',
      iconName: 'Heart',
      keywords: ['health', 'fitness', 'workout', 'exercise', 'weight', 'body', 'sleep', 'vitals', 'medications', 'labs', 'p54'],
      execute: (ctx) => {
        if (ctx.openHealth) {
          ctx.openHealth();
        } else {
          ctx.openResource({ type: 'health', title: 'Health & Fitness' });
        }
      },
    });

    this.register({
      id: 'health:log-measurement',
      title: 'Log Health Measurement / Vital',
      description: 'Record body weight, blood pressure, resting heart rate, or blood glucose',
      category: 'Create',
      iconName: 'Scale',
      keywords: ['health', 'weight', 'blood pressure', 'glucose', 'heart rate', 'vitals', 'measurement', 'p54'],
      execute: (ctx) => {
        if (ctx.openHealth) {
          ctx.openHealth();
        } else {
          ctx.openResource({ type: 'health', title: 'Health & Fitness' });
        }
      },
    });

    this.register({
      id: 'health:start-workout',
      title: 'Start Workout Session',
      description: 'Open workout tracker with active set logging and resting timer',
      category: 'Create',
      iconName: 'Dumbbell',
      keywords: ['workout', 'exercise', 'gym', 'training', 'sets', 'reps', 'fitness', 'p54'],
      execute: (ctx) => {
        if (ctx.openHealth) {
          ctx.openHealth();
        } else {
          ctx.openResource({ type: 'health', title: 'Health & Fitness' });
        }
      },
    });

    // 22. Phase P59: Unified Context Engine & Attention Layer
    this.register({
      id: 'context:open-lens',
      title: 'Open Context Lens (Working Set & Explainability)',
      description: 'Inspect current active working set, timeline diffs, and context attention items',
      category: 'Navigation',
      iconName: 'Layers',
      shortcut: 'Cmd+Shift+L',
      keywords: ['context', 'lens', 'working set', 'focus', 'attention', 'p59'],
      execute: (ctx) => {
        if ((ctx as any).openContextLens) {
          (ctx as any).openContextLens();
        } else {
          ctx.openResource({ type: 'context-lens', title: 'Context Lens' });
        }
      },
    });

    this.register({
      id: 'context:open-personal-os-home',
      title: 'Open Personal OS Landing Hub (Now, Continue, Attention)',
      description: 'Unified command center showing active workstreams, priorities, and factual attention signals',
      category: 'Navigation',
      iconName: 'Sparkles',
      keywords: ['home', 'personal os', 'continue', 'resume', 'attention', 'now', 'p59'],
      execute: (ctx) => {
        if (ctx.openPlanningHome) {
          ctx.openPlanningHome();
        } else {
          ctx.openResource({ type: 'planning-home', title: 'Personal OS Home' });
        }
      },
    });

    // 23. Personalization & Workflows Hub
    this.register({
      id: 'personalization:open-settings',
      title: 'Open Personalization & Workflows Settings',
      description: 'Configure visibility profiles, navigation, workspace presets, home layout, and shortcuts',
      category: 'Tools & Diagnostics',
      iconName: 'SlidersHorizontal',
      shortcut: 'Mod+Alt+P',
      keywords: ['personalization', 'customization', 'workflows', 'presets', 'shortcuts', 'navigation', 'home layout'],
      execute: (ctx) => {
        ctx.openModal('personalization');
      },
    });

    // 24. Export, Publishing, Sharing & Interoperability Center
    this.register({
      id: 'export:open-center',
      title: 'Open Export & Sharing Center',
      description: 'Unified export pipeline for Markdown, standalone HTML, static sites, BibTeX, ICS, and standard data interchange',
      category: 'Tools & Diagnostics',
      iconName: 'Share2',
      shortcut: 'Mod+Shift+E',
      keywords: ['export', 'share', 'publish', 'interoperability', 'matrix', 'markdown', 'html', 'zip'],
      execute: (ctx) => {
        if (ctx.openExportCenter) {
          ctx.openExportCenter(ctx.activeNote?.id);
        } else {
          ctx.openModal('export_center');
        }
      },
    });

    this.register({
      id: 'export:quick-share',
      title: 'Quick Share Active Note',
      description: 'Fast share sheet to copy clean Markdown, download HTML, or trigger system share',
      category: 'Note Actions',
      iconName: 'Share2',
      shortcut: 'Mod+Alt+S',
      keywords: ['share', 'quick share', 'copy markdown', 'airdrop', 'print'],
      execute: (ctx) => {
        if (ctx.openShareSheet && ctx.activeNote) {
          ctx.openShareSheet(ctx.activeNote);
        } else {
          ctx.openModal('share_sheet');
        }
      },
    });

    this.register({
      id: 'export:run-certification',
      title: 'Run Export & Interchange Certification Suite',
      description: 'Test "Leave the App" portability, deterministic checksums, secret scanners, and sanitization',
      category: 'Tools & Diagnostics',
      iconName: 'ShieldCheck',
      keywords: ['certification', 'export test', 'portability', 'interoperability', 'checksum'],
      execute: (ctx) => {
        if (ctx.openExportCenter) {
          ctx.openExportCenter();
        } else {
          ctx.openModal('export_center');
        }
      },
    });

    this.register({
      id: 'tools:developer-observatory',
      title: 'Developer Observatory & Performance Engine',
      description: 'Live task coordinator queues, bounded LRU caches, benchmark budgets & technical debt ledger',
      category: 'Tools & Diagnostics',
      iconName: 'Activity',
      shortcut: 'Mod+Alt+Shift+D',
      keywords: ['developer', 'observatory', 'performance', 'benchmark', 'budget', 'cache', 'tasks', 'diagnostics', 'debt'],
      execute: (ctx) => {
        if (ctx.openDeveloperObservatory) {
          ctx.openDeveloperObservatory();
        } else {
          ctx.openModal('developer_observatory');
        }
      },
    });

    this.register({
      id: 'tools:v2_7-performance-diagnostics',
      title: 'Open Performance & Resource Diagnostics Console',
      description: 'Inspect Runtime Governor queue, cache regions, I/O write amplification, and run 100k scale benchmarks',
      category: 'Tools & Diagnostics',
      iconName: 'Zap',
      shortcut: 'Mod+Alt+P',
      keywords: ['performance', 'governor', 'cache', 'benchmarks', 'extreme scale', 'diagnostics', 'runtime', 'workers'],
      execute: (ctx) => {
        if (ctx.openPerformanceDiagnostics) {
          ctx.openPerformanceDiagnostics();
        } else {
          ctx.openModal('performance_diagnostics_v2');
        }
      },
    });

    this.register({
      id: 'tools:v2_8-security-diagnostics',
      title: 'Open Security & Privacy Diagnostics Hub',
      description: 'Inspect execution capabilities, trust boundaries, zero-telemetry egress matrix, and red team defenses',
      category: 'Tools & Diagnostics',
      iconName: 'ShieldCheck',
      shortcut: 'Mod+Alt+S',
      keywords: ['security', 'privacy', 'trust', 'sandbox', 'egress', 'audit', 'diagnostics', 'capabilities', 'telemetry'],
      execute: (ctx) => {
        ctx.openModal('v2_security_diagnostics');
      },
    });

    this.register({
      id: 'tools:v2_15-power-user-efficiency',
      title: 'Open Sustainable Evolution & Power-User Efficiency Hub',
      description: 'Inspect 12 evolution gates, high-frequency workflow friction audit, 1-3 pane workspaces, declarative templates, and deterministic switcher',
      category: 'Tools & Diagnostics',
      iconName: 'Zap',
      shortcut: 'Mod+Shift+U',
      keywords: ['efficiency', 'power user', 'workspaces', 'templates', 'switcher', 'command palette', 'friction', 'panes', 'evolution'],
      execute: (ctx) => {
        ctx.openModal('v2_power_user_efficiency');
      },
    });

    this.register({
      id: 'tools:v2_14-quality-ceiling',
      title: 'Open Quality Ceiling & Readiness Hub',
      description: 'Inspect Master Quality Ledger, 8 mental models, 13-subsystem architecture health, 3-year OS simulation, and readiness determination',
      category: 'Tools & Diagnostics',
      iconName: 'ShieldCheck',
      shortcut: 'Mod+Shift+Q',
      keywords: ['quality', 'ceiling', 'readiness', 'ledger', 'consolidation', 'simulation', 'architecture'],
      execute: (ctx) => {
        ctx.openModal('v2_quality_ceiling');
      },
    });

    this.register({
      id: 'tools:v2_13-domain-excellence',
      title: 'Open First-Party Domain Excellence Hub',
      description: 'Inspect 11 first-party domain workflows, anti-duplication relation graph, guided weekly review, and 7-day OS simulation',
      category: 'Tools & Diagnostics',
      iconName: 'Sparkles',
      shortcut: 'Mod+Shift+E',
      keywords: ['domain', 'excellence', 'people', 'projects', 'finance', 'health', 'travel', 'assets', 'decisions', 'inbox', 'review', 'simulation'],
      execute: (ctx) => {
        ctx.openModal('v2_domain_excellence');
      },
    });

    this.register({
      id: 'tools:v2_12-platform-ecosystem',
      title: 'Open Native Platform & Ecosystem Hub',
      description: 'Inspect 8-platform matrix, desktop menus, IME safety, universal capture, plugin sandboxes, and everyday workflow friction optimization',
      category: 'Tools & Diagnostics',
      iconName: 'ShieldCheck',
      shortcut: 'Mod+Alt+P',
      keywords: ['platform', 'ecosystem', 'native', 'desktop', 'mobile', 'tablet', 'plugins', 'connectors', 'friction', 'capture'],
      execute: (ctx) => {
        ctx.openModal('v2_platform_ecosystem');
      },
    });

    this.register({
      id: 'tools:v2_11-maintenance-diagnostics',
      title: 'Open Post-Launch Stability & Maintenance Hub',
      description: 'Inspect 16 maintenance failure vectors, production issue ledger, fault containment boundaries, and privacy-first diagnostics snapshot',
      category: 'Tools & Diagnostics',
      iconName: 'Wrench',
      shortcut: 'Mod+Alt+M',
      keywords: ['maintenance', 'diagnostics', 'patch', 'ledger', 'vectors', 'safe mode', 'sanitized', 'resilience', 'hardening'],
      execute: (ctx) => {
        ctx.openModal('v2_maintenance_diagnostics');
      },
    });

    this.register({
      id: 'tools:zen-focus-dock',
      title: 'Show Zen Focus Dock (Mini-Player Mode)',
      description: 'Open the floating Zen micro-dock for ambient soundscapes, mechanical typewriter audio, and sprint timer',
      category: 'Tools & Diagnostics',
      iconName: 'Sparkles',
      shortcut: 'Mod+Alt+Z',
      keywords: ['zen', 'focus', 'dock', 'soundscape', 'typewriter', 'timer', 'ambient', 'rain', 'waves', 'audio', 'sprint', 'mini', 'player'],
      execute: () => {
        window.dispatchEvent(new CustomEvent('keepnotes_restore_zen_dock'));
      },
    });

    this.register({
      id: 'tools:writing-sprint',
      title: 'Launch Writing Sprint & Focus Arena',
      description: 'Start a timed, distraction-free writing sprint session with target word counts and live pacing',
      category: 'Tools & Diagnostics',
      iconName: 'Timer',
      shortcut: 'Alt+W',
      keywords: ['writing', 'sprint', 'focus', 'timer', 'words', 'flow'],
      execute: (ctx) => {
        ctx.openModal('writing_sprint');
      },
    });

    this.register({
      id: 'tools:idea-spark',
      title: 'Mind Sparks · Idea Combinator Studio',
      description: 'Randomly collide notes to ignite unexpected ideas and synthesize new cross-domain connections',
      category: 'Tools & Diagnostics',
      iconName: 'Dices',
      shortcut: 'Alt+I',
      keywords: ['idea', 'spark', 'combinator', 'creativity', 'synthesize', 'dice'],
      execute: (ctx) => {
        ctx.openModal('idea_spark');
      },
    });

    this.register({
      id: 'tools:thought-matrix',
      title: 'Thought Matrix · 2×2 Decision & Priority Studio',
      description: 'Spatially organize ideas, prioritize actions, and resolve trade-offs across 2x2 decision matrices',
      category: 'Tools & Diagnostics',
      iconName: 'Grid2X2',
      shortcut: 'Alt+M',
      keywords: ['matrix', 'thought', 'decision', 'priority', 'eisenhower', 'impact', 'effort', 'quadrant', 'strategy', 'feature 9'],
      execute: (ctx) => {
        ctx.openModal('thought_matrix');
      },
    });

    this.register({
      id: 'tools:cornell-notes',
      title: 'Cornell Notes · Structured Study & Active Recall Studio',
      description: 'Pauk 3-zone note layout with interactive active recall testing, cue masking, and automatic flashcard extraction',
      category: 'Tools & Diagnostics',
      iconName: 'Columns',
      shortcut: 'Alt+C',
      keywords: ['cornell', 'study', 'recall', 'active recall', 'cues', 'learning', 'flashcards', 'feature 10', 'notes', 'outliner'],
      execute: (ctx) => {
        ctx.openModal('cornell_notes');
      },
    });

    this.register({
      id: 'tools:pomodoro-flow',
      title: 'Pomodoro Deep Work Flow & Interstitial Journaling Hub (P1)',
      description: 'Run distraction-free focus intervals with interstitial reflection journaling, micro-tasks, and daily note logging',
      category: 'Tools & Diagnostics',
      iconName: 'Timer',
      shortcut: 'Alt+P',
      keywords: ['pomodoro', 'flow', 'interstitial', 'journaling', 'focus', 'deep work', 'timer', 'sprint', 'p1', 'tasks'],
      execute: (ctx) => {
        ctx.openModal('pomodoro_flow');
      },
    });

    this.register({
      id: 'tools:zettelkasten-studio',
      title: 'Zettelkasten Atomic Slip-Box & Concept Extraction Studio (P2)',
      description: 'Decompose source literature into autonomous atomic ideas linked in a permanent slip-box web',
      category: 'Tools & Diagnostics',
      iconName: 'Boxes',
      shortcut: 'Alt+Z',
      keywords: ['zettelkasten', 'zettel', 'slip-box', 'atomic', 'extract', 'luhmann', 'folgezettel', 'p2', 'permanent', 'literature'],
      execute: (ctx) => {
        ctx.openModal('zettelkasten_studio');
      },
    });

    this.register({
      id: 'tools:chrono-capsule',
      title: 'Chrono Capsule & Spaced Incremental Reading Studio (P3)',
      description: 'Review literature incrementally with spaced intervals and seal time-locked capsules to your future self',
      category: 'Tools & Diagnostics',
      iconName: 'Hourglass',
      shortcut: 'Alt+K',
      keywords: ['chrono', 'capsule', 'reading', 'incremental', 'spaced', 'future', 'time lock', 'letter', 'p3'],
      execute: (ctx) => {
        ctx.openModal('chrono_capsule');
      },
    });

    this.register({
      id: 'tools:synthesis-matrix',
      title: 'Multi-Note Parallel Comparison & Synthesis Matrix (P4)',
      description: 'Cross-examine 2 to 4 documents side-by-side with synchronized scrolling and generate unified synthesis notes',
      category: 'Tools & Diagnostics',
      iconName: 'Scale',
      shortcut: 'Alt+X',
      keywords: ['matrix', 'compare', 'comparison', 'synthesis', 'parallel', 'side-by-side', 'tradeoff', 'cross-reference', 'p4'],
      execute: (ctx) => {
        ctx.openModal('synthesis_matrix');
      },
    });

    this.register({
      id: 'tools:voice-memo-studio',
      title: 'Voice Memo Transcriber & Audio Snippet Studio (P5)',
      description: 'Record voice memos with client-side waveform visualizer, live speech transcription, and timestamp bookmarks',
      category: 'Tools & Diagnostics',
      iconName: 'Mic',
      shortcut: 'Alt+V',
      keywords: ['voice', 'audio', 'record', 'transcript', 'speech', 'speech-to-text', 'memo', 'dictation', 'p5'],
      execute: (ctx) => {
        ctx.openModal('voice_memo_studio');
      },
    });

    this.register({
      id: 'tools:mind-map-studio',
      title: 'Visual Mind Map & Concept Outline Studio (P6)',
      description: 'Visualize note outlines as interactive branching concept trees with two-way markdown synchronization',
      category: 'Tools & Diagnostics',
      iconName: 'Network',
      shortcut: 'Alt+B',
      keywords: ['mindmap', 'mind map', 'outline', 'tree', 'branch', 'brainstorm', 'visual', 'concept', 'p6'],
      execute: (ctx) => {
        ctx.openModal('mind_map_studio');
      },
    });

    this.register({
      id: 'tools:macro-automation',
      title: 'Hotkey Super-Palette & Macro Automation Engine (P7)',
      description: 'Record, compose, automate, and trigger multi-step productivity pipelines with custom hotkeys',
      category: 'Tools & Diagnostics',
      iconName: 'Zap',
      shortcut: 'Alt+Y',
      keywords: ['macro', 'automation', 'pipeline', 'workflow', 'hotkey', 'super-palette', 'alfred', 'raycast', 'p7'],
      execute: (ctx) => {
        ctx.openModal('macro_automation');
      },
    });

    this.register({
      id: 'tools:vault-stats',
      title: 'Vault Statistics & 52-Week Writing Activity Heatmap',
      description: 'Analyze vault word counts, completion metrics, and year-long writing activity density',
      category: 'Tools & Diagnostics',
      iconName: 'Activity',
      shortcut: 'Alt+H',
      keywords: ['stats', 'statistics', 'heatmap', 'activity', 'words', 'metrics'],
      execute: (ctx) => {
        ctx.openModal('vault_stats');
      },
    });

    this.register({
      id: 'tools:flashcard-review',
      title: 'Spaced Repetition Flashcard Generation & Active Recall Studio (P8)',
      description: 'Review active recall cards using FSRS-4.5 spaced repetition and auto-extract flashcards & clozes from notes',
      category: 'Tools & Diagnostics',
      iconName: 'GraduationCap',
      shortcut: 'Alt+F',
      keywords: ['flashcard', 'review', 'srs', 'recall', 'spaced repetition', 'cards', 'cloze', 'anki', 'fsrs', 'p8'],
      execute: (ctx) => {
        ctx.openModal('flashcard_review');
      },
    });

    this.register({
      id: 'tools:presentation-studio',
      title: 'Markdown Presentation & Slide Deck Studio (P9)',
      description: 'Transform any note into an interactive slideshow presentation with presenter notes, themes, slide transitions, and export',
      category: 'Tools & Diagnostics',
      iconName: 'Presentation',
      shortcut: 'Alt+G',
      keywords: ['presentation', 'slides', 'deck', 'marp', 'slideshow', 'pitch', 'reveal', 'presenter', 'laser', 'p9'],
      execute: (ctx) => {
        ctx.openModal('presentation_studio');
      },
    });

    this.register({
      id: 'tools:reactive-sandbox',
      title: 'Reactive Computational Sandbox & Formula Matrix (P10)',
      description: 'Model reactive formulas, variables, and dynamic database spreadsheets with live calculations and Markdown sync',
      category: 'Tools & Diagnostics',
      iconName: 'Calculator',
      shortcut: 'Alt+Q',
      keywords: ['math', 'formula', 'reactive', 'spreadsheet', 'table', 'database', 'calculator', 'runway', 'quant', 'p10'],
      execute: (ctx) => {
        ctx.openModal('reactive_sandbox');
      },
    });

    this.register({
      id: 'tools:quick-switcher',
      title: 'Quick Switcher & Instant Jump (QoL 9)',
      description: 'Search and jump to any note in the vault instantly in milliseconds',
      category: 'Navigation',
      iconName: 'Search',
      shortcut: 'Ctrl+O',
      keywords: ['quick', 'switch', 'jump', 'open', 'finder', 'switcher', 'qol9', 'qol'],
      execute: () => {
        window.dispatchEvent(new CustomEvent('pkm_open_quick_switcher'));
      },
    });

    this.register({
      id: 'navigation:history-back',
      title: 'Navigate Back in Note History (QoL 4)',
      description: 'Traverse backward to the previously focused note in the history stack',
      category: 'Navigation',
      iconName: 'ChevronLeft',
      shortcut: 'Alt+Left',
      keywords: ['back', 'history', 'previous', 'navigation', 'qol4', 'qol'],
      execute: () => {
        window.dispatchEvent(new CustomEvent('pkm_navigate_history_back'));
      },
    });

    this.register({
      id: 'navigation:history-forward',
      title: 'Navigate Forward in Note History (QoL 4)',
      description: 'Traverse forward to the next note in the navigation history stack',
      category: 'Navigation',
      iconName: 'ChevronRight',
      shortcut: 'Alt+Right',
      keywords: ['forward', 'history', 'next', 'navigation', 'qol4', 'qol'],
      execute: () => {
        window.dispatchEvent(new CustomEvent('pkm_navigate_history_forward'));
      },
    });

    this.register({
      id: 'editor:toggle-typewriter',
      title: 'Toggle Centered Typewriter Mode (QoL 10)',
      description: 'Keep the cursor line locked at vertical center with paragraph focus dimming',
      category: 'Note Actions',
      iconName: 'AlignLeft',
      shortcut: 'Alt+T',
      keywords: ['typewriter', 'center', 'scroll', 'dimming', 'focus', 'qol10', 'qol'],
      execute: () => {
        window.dispatchEvent(new CustomEvent('pkm_toggle_typewriter'));
      },
    });

    this.register({
      id: 'tools:gamification-hub',
      title: 'Knowledge Quests & Gamification Hub',
      description: 'Open the 5-branch Knowledge Skill Tree, active quests, and achievement showcase',
      category: 'Tools & Diagnostics',
      iconName: 'Crown',
      shortcut: 'Alt+Shift+G',
      keywords: ['game', 'gamification', 'quest', 'skill tree', 'xp', 'streak', 'levels', 'trophy', 'badges'],
      execute: (ctx) => {
        ctx.openResource({ type: 'gamification', title: 'Knowledge Quests & Mastery' });
      },
    });

    this.register({
      id: 'tools:vault-health-doctor',
      title: 'Vault Health & Link Integrity Doctor',
      description: 'Audit broken wiki-links with 1-click auto-healing, detect orphan notes, and view health rating',
      category: 'Tools & Diagnostics',
      iconName: 'ShieldCheck',
      shortcut: 'Alt+Shift+H',
      keywords: ['doctor', 'health', 'broken links', 'orphan', 'repair', 'integrity', 'audit', 'heal'],
      execute: () => {
        window.dispatchEvent(new CustomEvent('pkm_open_health_doctor'));
      },
    });

    this.register({
      id: 'tools:vault-archive-exporter',
      title: 'Complete Standalone Vault Archive Exporter',
      description: 'Export 100% self-contained standalone offline HTML app and complete JSON backup bundle',
      category: 'Tools & Diagnostics',
      iconName: 'FolderArchive',
      shortcut: 'Alt+Shift+E',
      keywords: ['archive', 'backup', 'export', 'html', 'json', 'offline', 'standalone', 'bundle'],
      execute: () => {
        window.dispatchEvent(new CustomEvent('pkm_open_vault_archive'));
      },
    });

    this.register({
      id: 'tools:serendipity',
      title: 'Serendipity Oracle & Random Note Explorer',
      description: 'Resurface surprising connections, thought-provoking axioms, and serendipitous note pairs',
      category: 'Tools & Diagnostics',
      iconName: 'Compass',
      shortcut: 'Alt+R',
      keywords: ['serendipity', 'random', 'oracle', 'discovery', 'explore', 'axioms', 'shuffle'],
      execute: (ctx) => {
        if (ctx.openSerendipity) {
          ctx.openSerendipity();
        } else {
          ctx.openModal('serendipity');
        }
      },
    });

    this.register({
      id: 'tools:theme-creator',
      title: 'Theme Studio & Palette Customizer',
      description: 'Design custom color palettes, adjust contrast, and preview UI themes live',
      category: 'Tools & Diagnostics',
      iconName: 'Palette',
      shortcut: 'Alt+T',
      keywords: ['theme', 'palette', 'colors', 'dark mode', 'creator', 'customizer', 'style'],
      execute: (ctx) => {
        if (ctx.openThemeCreator) {
          ctx.openThemeCreator();
        } else {
          ctx.openModal('theme_creator');
        }
      },
    });

    this.register({
      id: 'tools:v2_10-stable-release-hub',
      title: 'Open Stable Release & Certification Hub',
      description: 'View official Stable Certification, frozen Stability Contracts, release artifact manifests, and 0 S0/S1 blocker ledger',
      category: 'Tools & Diagnostics',
      iconName: 'ShieldCheck',
      shortcut: 'Mod+Shift+R',
      keywords: ['release', 'stable', 'certification', 'contracts', 'manifest', 'artifacts', 'launch', 'ledger', 'blockers'],
      execute: (ctx) => {
        ctx.openModal('v2_stable_release_hub');
      },
    });

    this.register({
      id: 'tools:v2_9-release-candidate-hub',
      title: 'Open Whole-System Stabilization & Release Candidate Hub',
      description: 'Inspect 13 cross-domain workflows, domain invariant checks, 90-day multi-device simulation, and master stabilization ledger',
      category: 'Tools & Diagnostics',
      iconName: 'ShieldCheck',
      shortcut: 'Mod+Alt+R',
      keywords: ['release', 'candidate', 'stabilization', 'audit', 'workflows', 'ledger', 'simulation', 'invariants', 'rc'],
      execute: (ctx) => {
        ctx.openModal('v2_rc_diagnostics');
      },
    });

    this.register({
      id: 'tools:v2_16-interoperability-hub',
      title: 'Open Interoperability & Ecosystem Hub',
      description: 'Inspect open format matrices, 8-stage import pipeline, connectors lifecycle, and plugin sandbox security',
      category: 'Tools & Diagnostics',
      iconName: 'Globe',
      shortcut: 'Mod+Shift+O',
      keywords: ['interoperability', 'formats', 'import', 'export', 'connectors', 'plugins', 'open standards', 'vcard', 'ics', 'bibtex', 'csv'],
      execute: (ctx) => {
        ctx.openModal('v2_unified_interoperability');
      },
    });

    this.register({
      id: 'tools:external-integrations-hub',
      title: 'Integrations & External Connectors Hub',
      description: 'Manage GitHub, Google Calendar, Outlook, Readwise, RSS feeds, and REST webhooks',
      category: 'Tools & Diagnostics',
      iconName: 'Zap',
      keywords: ['integrations', 'connectors', 'github', 'calendar', 'outlook', 'readwise', 'rss', 'webhooks', 'api', 'sync'],
      execute: (ctx) => {
        ctx.openModal('v2_unified_interoperability');
      },
    });

    this.register({
      id: 'tools:v2_27-reliability-security-center',
      title: 'Open Reliability, Security & Data Integrity Center',
      description: 'Audit canonical storage partitioning, recovery journal, sync fuzzing, disaster drills, AES-256-GCM crypto & adversarial security',
      category: 'Tools & Diagnostics',
      iconName: 'Shield',
      shortcut: 'Mod+Shift+S',
      keywords: ['reliability', 'security', 'data integrity', 'hardening', 'vault doctor', 'recovery journal', 'sync', 'fuzz', 'crypto', 'adversarial', 'drills'],
      execute: (ctx) => {
        ctx.openModal('v2_reliability_security');
      },
    });

    this.register({
      id: 'tools:v2_28-performance-accessibility-center',
      title: 'Open Performance, Accessibility & Platform Hardening Center',
      description: 'Audit latency budgets, scale fixtures, WCAG 2.2 AA non-drag alternatives, Korean IME safety, and cross-platform runtimes',
      category: 'Tools & Diagnostics',
      iconName: 'Gauge',
      shortcut: 'Mod+Shift+P',
      keywords: ['performance', 'accessibility', 'a11y', 'wcag', 'ime', 'korean', 'turkish', 'rtl', 'latency', 'budgets', 'workers', 'platforms'],
      execute: (ctx) => {
        ctx.openModal('v2_performance_accessibility');
      },
    });

    this.register({
      id: 'tools:v2_29-release-candidate-1-center',
      title: 'Open Release Candidate 1 Center',
      description: 'Inspect RC1 version freeze, artifact manifests, SHA-256 integrity, fresh installs, lossless upgrades, Backup/Restore, and zero blockers',
      category: 'Tools & Diagnostics',
      iconName: 'PackageCheck',
      shortcut: 'Mod+Shift+C',
      keywords: ['rc1', 'release candidate', 'artifacts', 'manifest', 'checksum', 'sha256', 'upgrade matrix', 'backup', 'restore', 'sync', 'burndown', 'handoff'],
      execute: (ctx) => {
        ctx.openModal('v2_release_candidate_1');
      },
    });

    this.register({
      id: 'tools:v2_30-stable-ship-center',
      title: 'Open Stable Ship & Gold Master Center',
      description: 'Inspect Gold Master release manifest, 7 signed distributables, SHA-256 checksums, lossless migrations, and final Stable Ship certification',
      category: 'Tools & Diagnostics',
      iconName: 'Award',
      shortcut: 'Mod+Shift+G',
      keywords: ['stable', 'gold master', 'release', 'ship', 'manifest', 'artifacts', 'checksum', 'sha256', 'upgrade matrix', 'backup', 'restore', 'sync', 'burndown', 'certification'],
      execute: (ctx) => {
        ctx.openModal('v2_stable_ship');
      },
    });

    this.register({
      id: 'tools:architecture-certification',
      title: 'Run Technical Architecture Certification Suite',
      description: 'Execute automated verification across layer boundaries, bounded memory, worker cancellation, and schema matrix',
      category: 'Tools & Diagnostics',
      iconName: 'ShieldCheck',
      keywords: ['architecture', 'certification', 'maintainability', 'bounds', 'migrations', 'suite'],
      execute: (ctx) => {
        if (ctx.openDeveloperObservatory) {
          ctx.openDeveloperObservatory();
        } else {
          ctx.openModal('developer_observatory');
        }
      },
    });

    // Smart Assistant & Knowledge Commands (100% Offline Local Engine)
    this.register({
      id: 'assistant:open-workspace',
      title: 'Vault Assistant: Open Knowledge Workspace',
      description: 'Search, cross-reference, and synthesize your local vault offline',
      category: 'Workspace',
      shortcut: 'Mod+Shift+K',
      iconName: 'Sparkles',
      keywords: ['assistant', 'copilot', 'search', 'local', 'offline', 'cross-reference', 'synthesis', 'vault query'],
      execute: (ctx) => {
        if (ctx.openCopilot) {
          ctx.openCopilot();
        } else {
          ctx.openModal('ai_copilot');
        }
      },
    });

    this.register({
      id: 'assistant:configure-settings',
      title: 'Knowledge Assistant Settings',
      description: 'Manage local search parameters, exclusions, and retrieval indexing',
      category: 'Tools & Diagnostics',
      iconName: 'Sparkles',
      keywords: ['assistant', 'settings', 'local', 'search', 'privacy', 'index'],
      execute: (ctx) => {
        ctx.openModal('settings');
      },
    });
  }
}



export const commandRegistry = new CommandRegistry();
