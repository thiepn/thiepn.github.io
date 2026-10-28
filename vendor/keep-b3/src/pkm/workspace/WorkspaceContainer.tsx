import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkspace } from '../useWorkspace';
import { WorkspacePaneSurface } from './WorkspacePaneSurface';
import { Note, Folder, AppSettings } from '../../types';
import { GripVertical, GripHorizontal, Columns2, Rows2, ArrowLeftRight } from 'lucide-react';

export interface WorkspaceContainerProps {
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

export const WorkspaceContainer: React.FC<WorkspaceContainerProps> = ({
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
  const { layout, setSplitRatio, swapPanes, focusPane } = useWorkspace();
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [mobileActivePaneId, setMobileActivePaneId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isSplit = layout.panes.length > 1;
  const orientation = layout.splitOrientation || 'horizontal';
  const ratio = layout.splitRatio || 0.5;

  // Responsive window listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ensure mobile active pane id is valid
  useEffect(() => {
    if (layout.panes.length > 0) {
      if (!mobileActivePaneId || !layout.panes.some((p) => p.id === mobileActivePaneId)) {
        setMobileActivePaneId(layout.panes[0].id);
      }
    }
  }, [layout.panes, mobileActivePaneId]);

  // Dragging handler for pane divider
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDividerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSplitRatio(Math.max(0.2, ratio - 0.05));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setSplitRatio(Math.min(0.8, ratio + 0.05));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSplitRatio(0.5);
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      let newRatio = 0.5;
      if (orientation === 'horizontal') {
        const clientX = e.clientX - rect.left;
        newRatio = clientX / rect.width;
      } else {
        const clientY = e.clientY - rect.top;
        newRatio = clientY / rect.height;
      }

      // Constrain ratio between 20% and 80%
      const clamped = Math.max(0.2, Math.min(0.8, newRatio));
      setSplitRatio(clamped);
    },
    [isDragging, orientation, setSplitRatio]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // If single pane, render directly
  if (!isSplit) {
    const singlePane = layout.panes[0];
    return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-white dark:bg-stone-950">
        <WorkspacePaneSurface
          pane={singlePane}
          isOnlyPane={true}
          notes={notes}
          allNotes={allNotes}
          folders={folders}
          settings={settings}
          onSaveNote={onSaveNote}
          onDeleteNote={onDeleteNote}
          onDuplicateNote={onDuplicateNote}
          onOpenDrawingModal={onOpenDrawingModal}
          onCreateNoteWithTitle={onCreateNoteWithTitle}
          onOpenLiteratureNote={onOpenLiteratureNote}
          onRenderHome={onRenderHome}
          onOpenNewNote={onOpenNewNote}
          onOpenDailyDate={onOpenDailyDate}
          onSaveAsTemplate={onSaveAsTemplate}
        />
      </div>
    );
  }

  const firstPane = layout.panes[0];
  const secondPane = layout.panes[1];

  const firstPercentage = Math.round(ratio * 100);
  const secondPercentage = 100 - firstPercentage;

  // On Mobile: Render Segmented Switcher and only the active pane to preserve screen real estate
  if (isMobileViewport) {
    const currentActivePane =
      layout.panes.find((p) => p.id === mobileActivePaneId) || layout.panes[0];

    return (
      <div className="w-full h-full flex flex-col overflow-hidden bg-white dark:bg-stone-950">
        {/* Mobile Segmented Workspace Pane Switcher */}
        <div
          role="tablist"
          aria-label="Workspace split panes"
          className="flex items-center justify-between px-3 py-1.5 bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 gap-2 shrink-0"
        >
          <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-stone-200/80 dark:bg-stone-800/90 flex-1">
            {layout.panes.map((p, idx) => {
              const activeTab = p.tabs.find((t) => t.id === p.activeTabId);
              const tabTitle = activeTab?.title || (activeTab?.type === 'home' ? 'Home' : `Pane ${idx + 1}`);
              const isSelected = p.id === currentActivePane.id;

              return (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setMobileActivePaneId(p.id);
                    focusPane(p.id);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold truncate transition-all text-center ${
                    isSelected
                      ? 'bg-white dark:bg-stone-950 text-amber-700 dark:text-amber-400 shadow-xs'
                      : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
                  }`}
                >
                  {tabTitle}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => swapPanes()}
            className="p-1.5 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800"
            title="Swap Panes"
            aria-label="Swap Panes"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Render Mobile Active Pane Surface */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <WorkspacePaneSurface
            pane={currentActivePane}
            isOnlyPane={false}
            notes={notes}
            allNotes={allNotes}
            folders={folders}
            settings={settings}
            onSaveNote={onSaveNote}
            onDeleteNote={onDeleteNote}
            onDuplicateNote={onDuplicateNote}
            onOpenDrawingModal={onOpenDrawingModal}
            onCreateNoteWithTitle={onCreateNoteWithTitle}
            onOpenLiteratureNote={onOpenLiteratureNote}
            onRenderHome={onRenderHome}
            onOpenNewNote={onOpenNewNote}
            onOpenDailyDate={onOpenDailyDate}
            onOpenPersonalization={onOpenPersonalization}
            onSaveAsTemplate={onSaveAsTemplate}
            onCompareNote={onCompareNote}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex overflow-hidden relative select-none ${
        orientation === 'horizontal' ? 'flex-col md:flex-row' : 'flex-col'
      } ${isDragging ? 'cursor-col-resize select-none' : ''}`}
    >
      {/* Pane 1 */}
      <div
        style={{
          flexBasis: `${firstPercentage}%`,
          flexGrow: 0,
          flexShrink: 0,
        }}
        className="w-full h-full min-w-0 min-h-0 overflow-hidden flex flex-col"
      >
        <WorkspacePaneSurface
          pane={firstPane}
          isOnlyPane={false}
          notes={notes}
          allNotes={allNotes}
          folders={folders}
          settings={settings}
          onSaveNote={onSaveNote}
          onDeleteNote={onDeleteNote}
          onDuplicateNote={onDuplicateNote}
          onOpenDrawingModal={onOpenDrawingModal}
          onCreateNoteWithTitle={onCreateNoteWithTitle}
          onOpenLiteratureNote={onOpenLiteratureNote}
          onRenderHome={onRenderHome}
          onOpenNewNote={onOpenNewNote}
          onOpenDailyDate={onOpenDailyDate}
          onOpenPersonalization={onOpenPersonalization}
          onSaveAsTemplate={onSaveAsTemplate}
          onCompareNote={onCompareNote}
        />
      </div>

      {/* Resizable & Keyboard Accessible Divider */}
      <div
        role="separator"
        tabIndex={0}
        aria-orientation={orientation}
        aria-valuenow={firstPercentage}
        aria-valuemin={20}
        aria-valuemax={80}
        aria-label={`Workspace split divider. Currently ${firstPercentage}% left, ${secondPercentage}% right. Use arrow keys to adjust.`}
        onMouseDown={handleMouseDown}
        onKeyDown={handleDividerKeyDown}
        onDoubleClick={() => setSplitRatio(0.5)}
        className={`group relative z-30 flex items-center justify-center bg-stone-200 dark:bg-stone-800 hover:bg-amber-500 dark:hover:bg-amber-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
          orientation === 'horizontal'
            ? 'w-1.5 cursor-col-resize hover:w-2 py-2'
            : 'h-1.5 cursor-row-resize hover:h-2 px-2'
        } ${isDragging ? 'bg-amber-500 dark:bg-amber-500 w-2' : ''}`}
        title="Drag or use arrow keys to resize panes (Double click or Home to reset 50/50)"
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-950 dark:text-stone-100 pointer-events-none">
          {orientation === 'horizontal' ? (
            <GripVertical className="w-3 h-3" />
          ) : (
            <GripHorizontal className="w-3 h-3" />
          )}
        </div>
      </div>

      {/* Pane 2 */}
      <div
        style={{
          flexBasis: `${secondPercentage}%`,
          flexGrow: 1,
          flexShrink: 1,
        }}
        className="w-full h-full min-w-0 min-h-0 overflow-hidden flex flex-col"
      >
        <WorkspacePaneSurface
          pane={secondPane}
          isOnlyPane={false}
          notes={notes}
          allNotes={allNotes}
          folders={folders}
          settings={settings}
          onSaveNote={onSaveNote}
          onDeleteNote={onDeleteNote}
          onDuplicateNote={onDuplicateNote}
          onOpenDrawingModal={onOpenDrawingModal}
          onCreateNoteWithTitle={onCreateNoteWithTitle}
          onOpenLiteratureNote={onOpenLiteratureNote}
          onRenderHome={onRenderHome}
          onOpenNewNote={onOpenNewNote}
          onOpenDailyDate={onOpenDailyDate}
          onOpenPersonalization={onOpenPersonalization}
          onSaveAsTemplate={onSaveAsTemplate}
          onCompareNote={onCompareNote}
        />
      </div>
    </div>
  );
};
