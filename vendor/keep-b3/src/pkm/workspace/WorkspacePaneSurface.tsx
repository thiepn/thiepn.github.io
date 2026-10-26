import React, { useMemo } from 'react';
import {
  WorkspacePane,
  WorkspaceTab,
  WorkspaceSurfaceType,
} from '../workspaceTypes';
import { Note, Folder, AppSettings } from '../../types';
import { NoteWorkspaceView } from './NoteWorkspaceView';
import { PDFWorkspaceView } from './PDFWorkspaceView';
import { SmartViewsWorkspaceView } from './SmartViewsWorkspaceView';
import { SearchWorkspaceView } from './SearchWorkspaceView';
import { MediaLibraryWorkspaceView } from '../media/MediaLibraryWorkspaceView';
import { ReferenceLibraryWorkspaceView } from '../reference/ui/ReferenceLibraryWorkspaceView';
import { AutomationWorkspaceView } from '../automation/ui/AutomationWorkspaceView';
import { CalendarWorkspaceView } from '../temporal/ui/CalendarWorkspaceView';
import { AgendaView } from '../temporal/ui/AgendaView';
import { TimelineView } from '../temporal/ui/TimelineView';
import { ReviewWorkspaceView } from '../review/ui/ReviewWorkspaceView';
import { AICopilotWorkspace } from '../ai/ui/AICopilotWorkspace';
import { CollectionWorkspaceView } from '../collections/ui/CollectionWorkspaceView';
import { DashboardWorkspaceView } from '../dashboards/ui/DashboardWorkspaceView';
import { PeopleWorkspaceView } from '../people/ui/PeopleWorkspaceView';
import { PlanningHomeView } from '../planning/ui/PlanningHomeView';
import { GoalsProjectsWorkspaceView } from '../planning/ui/GoalsProjectsWorkspaceView';
import { KeepKnowledgeExplorer } from '../integration/ui/KeepKnowledgeExplorer';
import { WeeklyReviewWorkspaceModal } from '../planning/ui/WeeklyReviewWorkspaceModal';
import { FocusPickerModal } from '../planning/ui/FocusPickerModal';
import { NewPlanningResourceModal } from '../planning/ui/NewPlanningResourceModal';
import { RoutinesWorkspaceView } from '../tracking/ui/RoutinesWorkspaceView';
import { LearningWorkspaceView } from '../learning/ui/LearningWorkspaceView';
import { CourseDetailView } from '../learning/ui/CourseDetailView';
import { SkillDetailView } from '../learning/ui/SkillDetailView';
import { ExamPrepView } from '../learning/ui/ExamPrepView';
import { LibraryWorkspaceView } from '../library/ui/LibraryWorkspaceView';
import { FinanceWorkspaceView } from '../finance/ui/FinanceWorkspaceView';
import { HealthWorkspaceView } from '../health/ui/HealthWorkspaceView';
import { TravelWorkspaceView } from '../travel/ui/TravelWorkspaceView';
import { AssetsWorkspaceView } from '../assets/ui/AssetsWorkspaceView';
import { DecisionsWorkspaceView } from '../decisions/ui/DecisionsWorkspaceView';
import { UniversalInboxWorkspaceView } from '../inbox/ui/UniversalInboxWorkspaceView';
import { PersonalOSHomeView } from '../context/ui/PersonalOSHomeView';
import { ContextLensPanel } from '../context/ui/ContextLensPanel';
import { ContextSwitcherModal } from '../context/ui/ContextSwitcherModal';
import { contextEngine } from '../context/contextEngine';
import { planningService } from '../planning/planningService';
import { CanvasWorkspace } from '../CanvasWorkspace';
import { GraphView } from '../../components/views/GraphView';
import { KanbanView } from '../../components/views/KanbanView';
import { WorkspaceTabBar } from './WorkspaceTabBar';
import { NoteFavoritesShelf } from '../qol';
import { GamificationHubWorkspaceView } from '../gamification';
import { useWorkspace } from '../useWorkspace';
import { generateLiteratureNoteContent } from '../pdfCitation';
import { FileQuestion, Plus, FileText } from 'lucide-react';

export interface WorkspacePaneSurfaceProps {
  pane: WorkspacePane;
  isOnlyPane: boolean;
  notes: Note[];
  allNotes: Note[];
  folders: Folder[];
  settings: AppSettings;
  onSaveNote: (note: Note) => void | Promise<void>;
  onDeleteNote: (noteId: string) => void;
  onDuplicateNote?: (note: Note) => void;
  onOpenDrawingModal?: (onSaveDrawing: (dataUrl: string) => void) => void;
  onCreateNoteWithTitle?: (title: string) => void;
  onOpenLiteratureNote?: (note: Note) => void;
  onRenderHome: () => React.ReactNode;
  onOpenNewNote?: () => void;
  onOpenDailyDate?: (date: Date) => void;
  onOpenPersonalization?: () => void;
  onSaveAsTemplate?: (note: Note) => void;
  onCompareNote?: (note: Note) => void;
}

export const WorkspacePaneSurface: React.FC<WorkspacePaneSurfaceProps> = ({
  pane,
  isOnlyPane,
  notes,
  allNotes,
  folders,
  settings,
  onSaveNote,
  onDeleteNote,
  onDuplicateNote,
  onOpenDrawingModal,
  onCreateNoteWithTitle,
  onOpenLiteratureNote,
  onRenderHome,
  onOpenNewNote,
  onOpenDailyDate,
  onOpenPersonalization,
  onSaveAsTemplate,
  onCompareNote,
}) => {
  const {
    openNote,
    openPDF,
    openCanvas,
    openResource,
    openDashboard,
    openContextLens,
    closeTab,
    focusPane,
    layout,
  } = useWorkspace();

  const isPaneActive = layout.activePaneId === pane.id;

  const activeTab: WorkspaceTab | undefined = useMemo(() => {
    if (!pane.activeTabId) return pane.tabs[0];
    return pane.tabs.find((t) => t.id === pane.activeTabId) || pane.tabs[0];
  }, [pane]);

  // Find targeted note if surface is 'note'
  const currentNote = useMemo(() => {
    if (!activeTab || activeTab.type !== 'note' || !activeTab.resourceId) return null;
    return allNotes.find((n) => n.id === activeTab.resourceId) || null;
  }, [activeTab, allNotes]);

  const [isReviewModalOpen, setIsReviewModalOpen] = React.useState(false);
  const [isFocusModalOpen, setIsFocusModalOpen] = React.useState(false);
  const [isNewResourceModalOpen, setIsNewResourceModalOpen] = React.useState(false);
  const [newResourceType, setNewResourceType] = React.useState<'project' | 'goal' | 'area'>('project');
  const [isContextSwitcherOpen, setIsContextSwitcherOpen] = React.useState(false);

  const handlePaneClick = () => {
    if (!isPaneActive) {
      focusPane(pane.id);
    }
  };

  const renderSurfaceContent = () => {
    if (!activeTab) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-stone-50 dark:bg-stone-900/40">
          <p className="text-xs text-stone-400 mb-3">No active tab in this pane</p>
          <button
            type="button"
            onClick={() => openResource({ type: 'home' }, { targetPane: pane.id })}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
          >
            Open Vault Home
          </button>
        </div>
      );
    }

    switch (activeTab.type) {
      case 'home':
        return <div className="flex-1 h-full overflow-hidden">{onRenderHome()}</div>;

      case 'note': {
        if (!currentNote) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-stone-50 dark:bg-stone-900/40">
              <div className="w-12 h-12 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 mb-3">
                <FileQuestion className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-1">
                Note Not Found or Deleted
              </h3>
              <p className="text-xs text-stone-500 mb-4 max-w-xs">
                The note in this tab is no longer available in the vault.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => closeTab(pane.id, activeTab.id)}
                  className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 text-xs font-semibold hover:bg-stone-300"
                >
                  Close Tab
                </button>
                {onOpenNewNote && (
                  <button
                    type="button"
                    onClick={onOpenNewNote}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                  >
                    Create Note
                  </button>
                )}
              </div>
            </div>
          );
        }

        return (
          <NoteWorkspaceView
            note={currentNote}
            initialCursorLine={activeTab.viewState?.cursorLine}
            allNotes={allNotes}
            folders={folders}
            onSaveNote={onSaveNote}
            onDeleteNote={(deletedId) => {
              onDeleteNote(deletedId);
              closeTab(pane.id, activeTab.id);
            }}
            onOpenLinkedNote={(targetId, opts) => {
              openNote(targetId, undefined, {
                split: opts?.eventModifier?.altKey,
                background: opts?.eventModifier?.ctrlOrMetaKey,
              });
            }}
            onCreateNoteWithTitle={onCreateNoteWithTitle}
            onOpenPDF={(pdfId, page, highlightId) => {
              openPDF(pdfId, page, highlightId, { split: true });
            }}
            onOpenDrawingModal={onOpenDrawingModal}
            onDuplicateNote={onDuplicateNote}
            onCloseSurface={!isOnlyPane ? () => closeTab(pane.id, activeTab.id) : undefined}
            onOpenDailyDate={onOpenDailyDate}
            onSaveAsTemplate={onSaveAsTemplate}
            onCompareNote={onCompareNote}
          />
        );
      }

      case 'pdf':
        return (
          <PDFWorkspaceView
            pdfAttachmentId={activeTab.resourceId}
            initialPage={activeTab.viewState?.activePage || 1}
            targetHighlightId={activeTab.viewState?.targetHighlightId}
            allNotes={allNotes}
            onOpenNote={(noteId) => openNote(noteId)}
            onOpenNoteBeside={(noteId) => openNote(noteId, undefined, { split: true })}
            onAddHighlightToNote={(snippet) => {
              if (currentNote) {
                onSaveNote({
                  ...currentNote,
                  content: `${currentNote.content}\n\n${snippet}`,
                  updatedAt: new Date().toISOString(),
                });
              }
            }}
            onCreateLiteratureNote={(pdf, annotations) => {
              const litContent = generateLiteratureNoteContent(pdf, annotations);
              const litNote: Note = {
                id: `lit-${Date.now()}`,
                title: `Literature: ${pdf.title || pdf.name}`,
                content: litContent,
                type: 'text',
                tags: ['literature', 'pdf'],
                checklist: [],
                color: 'default',
                trashed: false,
                reminderDate: undefined,
                images: [],
                pinned: false,
                archived: false,
                folderId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              if (onOpenLiteratureNote) {
                onOpenLiteratureNote(litNote);
              } else {
                onSaveNote(litNote);
              }
              openNote(litNote.id, litNote.title, { split: true });
            }}
          />
        );

      case 'canvas':
        return (
          <div className="flex-1 w-full h-full relative overflow-hidden bg-stone-950">
            <CanvasWorkspace
              notes={allNotes}
              folders={folders}
              onOpenCanonicalNote={(noteId) => openNote(noteId, undefined, { split: true })}
            />
          </div>
        );

      case 'graph':
        return (
          <div className="flex-1 w-full h-full relative overflow-hidden bg-white dark:bg-stone-950">
            <GraphView
              notes={allNotes}
              allNotes={allNotes}
              folders={folders}
              settings={settings}
              onOpenNote={(targetNote) => openNote(targetNote.id, targetNote.title, { split: true })}
              onUpdateNote={onSaveNote}
            />
          </div>
        );

      case 'kanban':
        return (
          <div className="flex-1 w-full h-full relative overflow-hidden bg-stone-50 dark:bg-stone-900">
            <KanbanView
              notes={notes}
              allNotes={allNotes}
              folders={folders}
              settings={settings}
              onOpenNote={(targetNote) => openNote(targetNote.id, targetNote.title, { split: true })}
              onUpdateNote={onSaveNote}
              onDeleteNote={onDeleteNote}
              onOpenNewNoteWithAttributes={onOpenNewNote}
            />
          </div>
        );

      case 'smart-view':
        return (
          <SmartViewsWorkspaceView
            allNotes={allNotes}
            folders={folders}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
          />
        );

      case 'search':
        return (
          <SearchWorkspaceView
            allNotes={allNotes}
            folders={folders}
            initialQuery={activeTab.viewState?.searchQuery || ''}
            onOpenNote={(noteId, opts) => openNote(noteId, undefined, { split: opts?.split })}
          />
        );

      case 'media':
        return (
          <MediaLibraryWorkspaceView
            allNotes={allNotes}
            folders={folders}
            activeNoteId={currentNote?.id}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
            onOpenNoteBeside={(noteId) => openNote(noteId, undefined, { split: true })}
            onOpenPDF={(pdfId, page, highlightId) => openPDF(pdfId, page, highlightId, { split: true })}
            onInsertMarkdown={(snippet) => {
              if (currentNote) {
                onSaveNote({
                  ...currentNote,
                  content: `${currentNote.content}\n\n${snippet}`,
                  updatedAt: new Date().toISOString(),
                });
              }
            }}
          />
        );

      case 'references':
        return (
          <ReferenceLibraryWorkspaceView
            allNotes={allNotes}
            folders={folders}
            activeNoteId={currentNote?.id}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
            onOpenPDF={(pdfId, page) => openPDF(pdfId, page, undefined, { split: true })}
            onInsertMarkdown={(snippet) => {
              if (currentNote) {
                onSaveNote({
                  ...currentNote,
                  content: `${currentNote.content}\n\n${snippet}`,
                  updatedAt: new Date().toISOString(),
                });
              }
            }}
            onCreateLiteratureNote={(noteData) => {
              const newNote: Note = {
                id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                title: noteData.title,
                content: noteData.content,
                folderId: noteData.folderId || null,
                tags: noteData.tags || [],
                type: 'text',
                checklist: [],
                color: 'default',
                pinned: false,
                archived: false,
                trashed: false,
                reminderDate: null,
                images: [],
                audios: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              onSaveNote(newNote);
              openNote(newNote.id, newNote.title, { split: true });
            }}
          />
        );

      case 'automations':
        return (
          <AutomationWorkspaceView
            allNotes={allNotes}
            folders={folders}
            activeNoteId={currentNote?.id}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
          />
        );

      case 'calendar':
        return (
          <CalendarWorkspaceView
            notes={allNotes}
            folders={folders}
            appSettings={settings}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
            onOpenDailyNote={(date) => {
              if (onOpenDailyDate && date) {
                onOpenDailyDate(date);
              } else if (onOpenNewNote) {
                onOpenNewNote();
              }
            }}
            onUpdateNoteContent={async (noteId, newContent) => {
              const target = allNotes.find((n) => n.id === noteId);
              if (target) {
                onSaveNote({
                  ...target,
                  content: newContent,
                  updatedAt: new Date().toISOString(),
                });
              }
            }}
          />
        );

      case 'agenda':
        return (
          <AgendaView
            notes={allNotes}
            folders={folders}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
            onOpenDailyNote={() => {
              if (onOpenDailyDate) onOpenDailyDate(new Date());
              else if (onOpenNewNote) onOpenNewNote();
            }}
            onUpdateNoteContent={async (noteId, newContent) => {
              const target = allNotes.find((n) => n.id === noteId);
              if (target) {
                onSaveNote({
                  ...target,
                  content: newContent,
                  updatedAt: new Date().toISOString(),
                });
              }
            }}
          />
        );

      case 'timeline':
        return (
          <TimelineView
            notes={allNotes}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
          />
        );

      case 'review':
        return (
          <ReviewWorkspaceView
            notes={allNotes}
            folders={folders}
            activeNoteId={currentNote?.id}
            onOpenNote={(noteId, line) => {
              openNote(noteId, undefined, { split: true, viewState: { cursorLine: line } });
            }}
          />
        );

      case 'copilot':
        return (
          <AICopilotWorkspace
            allNotes={allNotes}
            folders={folders}
            activeNote={currentNote}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
            onCreateNewNote={(title, content) => {
              onCreateNoteWithTitle?.(title);
            }}
            onInsertIntoNote={(text) => {
              if (currentNote) {
                onSaveNote({
                  ...currentNote,
                  content: `${currentNote.content}\n\n${text}`,
                  updatedAt: new Date().toISOString(),
                });
              }
            }}
          />
        );

      case 'collection':
        return (
          <CollectionWorkspaceView
            collectionId={activeTab.resourceId}
            allNotes={allNotes}
            folders={folders}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
            onSaveNote={onSaveNote}
            onCreateNewNote={(title, folderId, tags, initialContent) => {
              const newNote: Note = {
                id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                title: title || 'Untitled Note',
                content: initialContent || '',
                type: 'text',
                checklist: [],
                tags: tags || [],
                color: 'default',
                folderId: folderId || null,
                pinned: false,
                archived: false,
                trashed: false,
                reminderDate: null,
                images: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              onSaveNote(newNote);
              openNote(newNote.id, newNote.title);
            }}
            onBulkTrashNotes={(noteIds) => {
              noteIds.forEach((id) => onDeleteNote(id));
            }}
          />
        );

      case 'dashboard':
        return (
          <DashboardWorkspaceView
            dashboardId={activeTab.resourceId}
            allNotes={allNotes}
            folders={folders}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
            onSwitchDashboard={(id, name) => {
              openDashboard(id, name);
            }}
          />
        );

      case 'people':
        return (
          <PeopleWorkspaceView
            notes={allNotes}
            folders={folders}
            savedSearches={[]}
            settings={settings}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
            onCreateNote={async (noteData) => {
              const newNote: Note = {
                id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                title: noteData.title || 'Untitled Note',
                content: noteData.content || '',
                type: 'text',
                checklist: [],
                tags: noteData.tags || [],
                color: 'default',
                folderId: noteData.folderId || null,
                pinned: false,
                archived: false,
                trashed: false,
                reminderDate: null,
                images: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              onSaveNote(newNote);
              return newNote;
            }}
            onUpdateNote={async (note) => {
              onSaveNote(note);
            }}
            onDeleteNote={async (noteId) => {
              onDeleteNote(noteId);
            }}
          />
        );

      case 'planning-home':
        return (
          <PersonalOSHomeView
            notes={allNotes}
            folders={folders}
            appSettings={settings}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
            onOpenDailyNote={() => {
              if (onOpenDailyDate) {
                onOpenDailyDate(new Date());
              } else if (onOpenNewNote) {
                onOpenNewNote();
              }
            }}
            onOpenGoalsProjectsWorkspace={(tab) => {
              openResource({ type: 'goals-projects', title: 'Goals & Projects' });
            }}
            onOpenWeeklyReview={() => setIsReviewModalOpen(true)}
            onOpenFocusPicker={() => setIsFocusModalOpen(true)}
            onOpenNewResource={(type) => {
              setNewResourceType(type);
              setIsNewResourceModalOpen(true);
            }}
            onOpenPeopleWorkspace={() => openResource({ type: 'people', title: 'People & Contacts' })}
            onOpenRoutines={() => openResource({ type: 'routines', title: 'Routines & Tracking' })}
            onOpenLearning={() => openResource({ type: 'learning', title: 'Learning & Curriculum' })}
            onOpenLibrary={() => openResource({ type: 'library', title: 'Library & Reading' })}
            onOpenFinance={() => openResource({ type: 'finance', title: 'Personal Finance' })}
            onOpenHealth={() => openResource({ type: 'health', title: 'Health & Fitness' })}
            onOpenTravel={() => openResource({ type: 'travel', title: 'Travel & Places' })}
            onOpenAssets={() => openResource({ type: 'assets', title: 'Assets & Inventory' })}
            onOpenDecisions={() => openResource({ type: 'decisions', title: 'Decisions & Reflection' })}
            onOpenUniversalInbox={() => openResource({ type: 'universal-inbox', title: 'Universal Inbox' })}
            onOpenContextSwitcher={() => setIsContextSwitcherOpen(true)}
            onOpenPersonalization={onOpenPersonalization}
            onStartContext={(ctx) => {
              // start active context and optionally open lens
            }}
          />
        );

      case 'knowledge-explorer':
        return <KeepKnowledgeExplorer
          notes={allNotes}
          folders={folders}
          onSaveNote={onSaveNote}
          initialSavedViewId={activeTab.resourceId}
          onOpenNote={(noteId, line) => openNote(noteId, undefined, { split: true, viewState: line === undefined ? undefined : { cursorLine: line } })}
          onOpenProjects={() => openResource({ type: 'goals-projects', title: 'Goals & Projects' })}
          onOpenTasks={() => openResource({ type: 'agenda', title: 'Scheduled Agenda' })}
          onOpenCalendar={() => openResource({ type: 'calendar', title: 'Calendar & Agenda' })}
        />;

      case 'goals-projects':
        return (
          <GoalsProjectsWorkspaceView
            initialTab="projects"
            notes={allNotes}
            folders={folders}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
            onSaveNote={async (note) => onSaveNote(note)}
            onOpenNewResource={(type) => {
              setNewResourceType(type);
              setIsNewResourceModalOpen(true);
            }}
            onOpenWeeklyReview={() => setIsReviewModalOpen(true)}
          />
        );

      case 'routines':
        return <RoutinesWorkspaceView />;

      case 'learning':
        return <LearningWorkspaceView />;

      case 'course':
        return activeTab.resourceId ? (
          <CourseDetailView courseId={activeTab.resourceId} />
        ) : (
          <LearningWorkspaceView />
        );

      case 'skill':
        return activeTab.resourceId ? (
          <SkillDetailView skillId={activeTab.resourceId} />
        ) : (
          <LearningWorkspaceView />
        );

      case 'exam-prep':
        return <ExamPrepView courseId={activeTab.resourceId} />;

      case 'library':
        return (
          <LibraryWorkspaceView
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
            onCreateNote={(title, content, tags) => {
              if (onCreateNoteWithTitle) {
                onCreateNoteWithTitle(title);
              }
            }}
          />
        );

      case 'finance':
        return (
          <FinanceWorkspaceView
            onAddNote={(title, content, tags) => {
              if (onCreateNoteWithTitle) {
                const newNote: Note = {
                  id: `note-fin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  title: title || 'Financial Review',
                  content: content || '',
                  type: 'text',
                  checklist: [],
                  tags: tags || ['finance'],
                  color: 'default',
                  folderId: null,
                  pinned: false,
                  archived: false,
                  trashed: false,
                  reminderDate: null,
                  images: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                onSaveNote(newNote);
                openNote(newNote.id, newNote.title, { split: true });
              }
            }}
          />
        );

      case 'health':
        return <HealthWorkspaceView />;

      case 'travel':
        return (
          <TravelWorkspaceView
            initialTripId={activeTab.resourceId}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
          />
        );

      case 'assets':
        return (
          <AssetsWorkspaceView
            initialAssetId={activeTab.resourceId}
          />
        );

      case 'decisions':
        return (
          <DecisionsWorkspaceView
            initialDecisionId={activeTab.resourceId}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
            onCreateNote={(title, content, tags) => {
              if (onCreateNoteWithTitle) {
                const newNote: Note = {
                  id: `note-dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  title: title || 'Decision Record',
                  content: content || '',
                  type: 'text',
                  checklist: [],
                  tags: tags || ['decision'],
                  color: 'default',
                  folderId: null,
                  pinned: false,
                  archived: false,
                  trashed: false,
                  reminderDate: null,
                  images: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                onSaveNote(newNote);
                openNote(newNote.id, newNote.title, { split: true });
              }
            }}
          />
        );

      case 'universal-inbox':
        return (
          <UniversalInboxWorkspaceView
            allNotes={allNotes}
            allFolders={folders}
            onSaveNote={onSaveNote}
            onNavigateToNote={(noteId) => openNote(noteId, undefined, { split: true })}
          />
        );

      case 'context-lens':
        return (
          <ContextLensPanel
            context={contextEngine.getActiveContext()}
            notes={allNotes}
            folders={folders}
            onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
            onOpenContextSwitcher={() => setIsContextSwitcherOpen(true)}
            onNewNoteInContext={(ctx) => {
              if (onCreateNoteWithTitle) {
                const newNote: Note = {
                  id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  title: `${ctx.title} - Notes`,
                  content: '',
                  type: 'text',
                  checklist: [],
                  tags: [ctx.type],
                  color: 'default',
                  folderId: null,
                  pinned: false,
                  archived: false,
                  trashed: false,
                  reminderDate: null,
                  images: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                onSaveNote(newNote);
                openNote(newNote.id, newNote.title, { split: true });
              }
            }}
          />
        );

      case 'gamification':
        return <GamificationHubWorkspaceView />;

      default:
        return <div className="flex-1 h-full overflow-hidden">{onRenderHome()}</div>;
    }
  };

  return (
    <div
      onMouseDown={handlePaneClick}
      className={`w-full h-full flex flex-col overflow-hidden bg-white dark:bg-stone-950 transition-all ${
        isPaneActive ? 'ring-1 ring-amber-500/50' : 'opacity-95'
      }`}
    >
      {/* Pane Tab Bar */}
      <WorkspaceTabBar
        pane={pane}
        isOnlyPane={isOnlyPane}
        onOpenNewNote={onOpenNewNote}
      />

      {/* QoL 5: Note Favorites & Project Quick Shelf */}
      <NoteFavoritesShelf
        notes={allNotes}
        activeNoteId={currentNote?.id}
        onSelectNote={(noteId, title) => openNote(noteId, title)}
      />

      {/* Surface Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {renderSurfaceContent()}
      </div>

      {/* Planning Companion Modals */}
      <WeeklyReviewWorkspaceModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        notes={allNotes}
        folders={folders}
        projects={planningService.getProjects()}
        goals={planningService.getGoals()}
        onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
        onCreateNote={async (draft) => {
          const newNote: Note = {
            id: `review-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: draft.title || 'Weekly Review',
            content: draft.content || '',
            type: 'text',
            checklist: [],
            tags: draft.tags || ['review', 'weekly'],
            color: 'default',
            folderId: null,
            pinned: false,
            archived: false,
            trashed: false,
            reminderDate: null,
            images: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          onSaveNote(newNote);
          return newNote;
        }}
      />

      <FocusPickerModal
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        notes={allNotes}
        projects={planningService.getProjects()}
        goals={planningService.getGoals()}
      />

      <NewPlanningResourceModal
        isOpen={isNewResourceModalOpen}
        onClose={() => setIsNewResourceModalOpen(false)}
        initialType={newResourceType}
        goals={planningService.getGoals()}
        areas={planningService.getAreas()}
        onCreateNote={async (draft) => {
          const newNote: Note = {
            id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: draft.title || 'Untitled',
            content: draft.content || '',
            type: 'text',
            checklist: [],
            tags: draft.tags || [],
            color: 'default',
            folderId: null,
            pinned: false,
            archived: false,
            trashed: false,
            reminderDate: null,
            images: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          onSaveNote(newNote);
          return newNote;
        }}
        onOpenNote={(noteId) => openNote(noteId, undefined, { split: true })}
      />

      <ContextSwitcherModal
        isOpen={isContextSwitcherOpen}
        onClose={() => setIsContextSwitcherOpen(false)}
        notes={allNotes}
        folders={folders}
        onStartContext={(ctx) => {
          openContextLens(ctx.id, ctx.title, { split: true });
        }}
      />
    </div>
  );
};
