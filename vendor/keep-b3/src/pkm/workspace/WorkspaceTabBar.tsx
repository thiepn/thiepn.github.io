import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Pin,
  PinOff,
  FileText,
  BookOpen,
  Sparkles,
  Share2,
  Columns3,
  Search,
  Home,
  HardDrive,
  Bookmark,
  Columns2,
  Rows2,
  ArrowLeftRight,
  Sliders,
  ChevronDown,
  Lock,
  Zap,
  Calendar,
  ListTodo,
  Activity,
  LayoutDashboard,
  Layers,
  Users,
  Target,
  Compass,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Crown,
  Stethoscope,
  Archive,
} from 'lucide-react';
import {
  WorkspacePane,
  WorkspaceTab,
  WorkspaceSurfaceType,
  WorkspacePresetKey,
} from '../workspaceTypes';
import { WORKSPACE_PRESETS } from '../workspaceManager';
import { useWorkspace } from '../useWorkspace';
import { navigationHistory, tabShortcutsManager } from '../qol';

export interface WorkspaceTabBarProps {
  pane: WorkspacePane;
  isOnlyPane: boolean;
  onOpenNewNote?: () => void;
}

export const WorkspaceTabBar: React.FC<WorkspaceTabBarProps> = ({
  pane,
  isOnlyPane,
  onOpenNewNote,
}) => {
  const {
    activateTab,
    closeTab,
    togglePinTab,
    openResource,
    splitWorkspace,
    closePane,
    swapPanes,
    applyPreset,
    isSplit,
  } = useWorkspace();

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const presetsMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
      if (presetsMenuRef.current && !presetsMenuRef.current.contains(e.target as Node)) {
        setShowPresetsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [, setHistoryTick] = useState(0);
  useEffect(() => {
    return navigationHistory.subscribe(() => setHistoryTick(t => t + 1));
  }, []);

  useEffect(() => {
    const activeTab = pane.tabs.find(t => t.id === pane.activeTabId);
    if (activeTab && activeTab.type === 'note' && activeTab.resourceId) {
      navigationHistory.push(activeTab.resourceId, activeTab.title || 'Untitled Note');
    }
  }, [pane.activeTabId, pane.tabs]);

  const getSurfaceIcon = (type: WorkspaceSurfaceType) => {
    switch (type) {
      case 'knowledge-explorer':
        return <Search className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'note':
        return <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'pdf':
        return <BookOpen className="w-3.5 h-3.5 text-red-500 shrink-0" />;
      case 'canvas':
        return <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
      case 'graph':
        return <Share2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'kanban':
        return <Columns3 className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'smart-view':
        return <Search className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case 'media':
        return <HardDrive className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'references':
        return <Bookmark className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      case 'automations':
        return <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'calendar':
        return <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'agenda':
        return <ListTodo className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'timeline':
        return <Activity className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case 'collection':
        return <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'dashboard':
        return <LayoutDashboard className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'people':
        return <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'planning-home':
        return <Compass className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
      case 'goals-projects':
        return <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
      case 'routines':
        return <Activity className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'library':
        return <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'finance':
        return <Landmark className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'gamification':
        return <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'home':
      default:
        return <Home className="w-3.5 h-3.5 text-stone-500 shrink-0" />;
    }
  };

  const handleCloseTab = (tab: WorkspaceTab) => {
    if (tab.pinned) return;
    tabShortcutsManager.recordClosedTab({
      resourceId: tab.resourceId || '',
      resourceType: tab.type,
      title: tab.title || tab.type,
    });
    closeTab(pane.id, tab.id);
  };

  return (
    <div className="h-9 bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between px-1.5 gap-1 shrink-0 select-none overflow-x-auto no-scrollbar">
      {/* Back / Forward History Navigation (QoL 4) */}
      <div className="flex items-center gap-0.5 shrink-0 pr-1 mr-0.5 border-r border-stone-200 dark:border-stone-800">
        <button
          type="button"
          disabled={!navigationHistory.canGoBack()}
          onClick={() => {
            const prev = navigationHistory.goBack();
            if (prev) {
              openResource(
                { type: 'note', resourceId: prev.noteId, title: prev.noteTitle },
                { targetPane: pane.id }
              );
            }
          }}
          className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          title="Back (Alt+Left)"
          aria-label="Back"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={!navigationHistory.canGoForward()}
          onClick={() => {
            const next = navigationHistory.goForward();
            if (next) {
              openResource(
                { type: 'note', resourceId: next.noteId, title: next.noteTitle },
                { targetPane: pane.id }
              );
            }
          }}
          className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          title="Forward (Alt+Right)"
          aria-label="Forward"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs List */}
      <div
        role="tablist"
        aria-label="Workspace tabs"
        className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5"
      >
        {pane.tabs.map((tab, idx) => {
          const isActive = tab.id === pane.activeTabId;

          return (
            <div
              key={tab.id}
              role="tab"
              id={`tab-${pane.id}-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              aria-selected={isActive}
              aria-label={tab.title || (tab.type === 'home' ? 'Vault Notes' : tab.type)}
              onClick={() => activateTab(pane.id, tab.id)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  const nextTab = pane.tabs[(idx + 1) % pane.tabs.length];
                  activateTab(pane.id, nextTab.id);
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const prevTab = pane.tabs[(idx - 1 + pane.tabs.length) % pane.tabs.length];
                  activateTab(pane.id, prevTab.id);
                }
              }}
              onMouseDown={(e) => {
                // Middle click closes tab
                if (e.button === 1 && !tab.pinned) {
                  e.preventDefault();
                  handleCloseTab(tab);
                }
              }}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all border shrink-0 max-w-[170px] sm:max-w-[210px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isActive
                  ? 'bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 border-stone-200 dark:border-stone-800 shadow-2xs font-semibold'
                  : 'bg-transparent text-stone-600 dark:text-stone-400 hover:bg-stone-200/70 dark:hover:bg-stone-800/70 border-transparent'
              }`}
              title={tab.title}
            >
              {getSurfaceIcon(tab.type)}
              <span className="truncate flex-1 text-[11px] leading-tight">
                {tab.title || (tab.type === 'home' ? 'Vault Notes' : tab.type)}
              </span>

              {/* Pin Indicator */}
              {tab.pinned && (
                <Pin className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500" aria-label="Pinned Tab" />
              )}

              {/* Close Button (Hidden if pinned) */}
              {!tab.pinned && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab);
                  }}
                  className={`p-0.5 rounded-md text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 transition-opacity focus-visible:opacity-100 ${
                    isActive ? 'opacity-80 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title={`Close Tab: ${tab.title || tab.type}`}
                  aria-label={`Close Tab ${tab.title || tab.type}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add Tab Button & Dropdown */}
        <div className="relative shrink-0" ref={addMenuRef}>
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="p-1 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            title="Open New Tab in Pane"
            aria-label="Open New Tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {showAddMenu && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 py-1 z-40 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (onOpenNewNote) onOpenNewNote();
                  else openResource({ type: 'home' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>New Note</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'knowledge-explorer', title: 'Knowledge & projects' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5 text-amber-500" />
                <span>Knowledge & projects</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'pdf', title: 'PDF Reader' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <BookOpen className="w-3.5 h-3.5 text-red-500" />
                <span>PDF Reader</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'canvas', title: 'Infinite Canvas' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Infinite Canvas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'graph', title: 'Knowledge Graph' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Knowledge Graph</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'kanban', title: 'Kanban Board' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <Columns3 className="w-3.5 h-3.5 text-blue-500" />
                <span>Kanban Board</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'smart-view', title: 'Smart Queries' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5 text-purple-500" />
                <span>Smart Queries</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'media', title: 'Media Library' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                <span>Media Library</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'references', title: 'Reference Library' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <Bookmark className="w-3.5 h-3.5 text-rose-500" />
                <span>Reference Library</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'automations', title: 'Automation Center' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Automations</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'calendar', title: 'Calendar & Agenda' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2 border-t border-stone-200 dark:border-stone-800"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Calendar & Agenda</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'agenda', title: 'Scheduled Agenda' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <ListTodo className="w-3.5 h-3.5 text-emerald-500" />
                <span>Agenda</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'timeline', title: 'Activity Timeline' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <Activity className="w-3.5 h-3.5 text-purple-500" />
                <span>Timeline</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'collection', title: 'Collections' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2 border-t border-stone-200 dark:border-stone-800"
              >
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>Collections</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'dashboard', title: 'Dashboard & Analytics' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-amber-500" />
                <span>Dashboards & Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'people', title: 'People & Relationships' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2 border-t border-stone-200 dark:border-stone-800"
              >
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span>People & Relationships</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'planning-home', title: 'Planning Hub' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2 border-t border-stone-200 dark:border-stone-800"
              >
                <Compass className="w-3.5 h-3.5 text-indigo-500" />
                <span>Planning Hub</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'goals-projects', title: 'Goals & Projects' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <span>Goals, Projects & Areas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'routines', title: 'Routines & Tracking' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                <span>Routines & Tracking</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'library', title: 'Library & Reading' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Library & Reading</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'finance', title: 'Personal Finance' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <Landmark className="w-3.5 h-3.5 text-amber-500" />
                <span>Personal Finance</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openResource({ type: 'gamification', title: 'Knowledge Quests & Mastery' }, { targetPane: pane.id });
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2 border-t border-stone-200 dark:border-stone-800 pt-2"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-amber-400">Knowledge Quests & Mastery</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('pkm_open_health_doctor'));
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                <span>Vault Health Doctor</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('pkm_open_vault_archive'));
                  setShowAddMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <Archive className="w-3.5 h-3.5 text-indigo-400" />
                <span>Standalone Vault Archive</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pane Controls & Presets */}
      <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-stone-200 dark:border-stone-800">
        {/* Workspace Layout Presets Menu */}
        <div className="relative" ref={presetsMenuRef}>
          <button
            type="button"
            onClick={() => setShowPresetsMenu(!showPresetsMenu)}
            className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors flex items-center gap-0.5"
            title="Workspace Layout Presets"
            aria-label="Layout Presets"
          >
            <Sliders className="w-3.5 h-3.5" />
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>

          {showPresetsMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 py-1.5 z-40 text-xs">
              <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Workspace Presets
              </div>
              {Object.values(WORKSPACE_PRESETS).map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => {
                    applyPreset(preset.key);
                    setShowPresetsMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex flex-col"
                >
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {preset.label}
                  </span>
                  <span className="text-[10px] text-stone-500 leading-tight">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Split Right (Horizontal Split) */}
        <button
          type="button"
          onClick={() => splitWorkspace('horizontal')}
          className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          title="Split Right (Alt+\)"
          aria-label="Split Right"
        >
          <Columns2 className="w-3.5 h-3.5" />
        </button>

        {/* Split Down (Vertical Split) */}
        <button
          type="button"
          onClick={() => splitWorkspace('vertical')}
          className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          title="Split Down"
          aria-label="Split Down"
        >
          <Rows2 className="w-3.5 h-3.5" />
        </button>

        {/* Swap Panes (if split) */}
        {isSplit && (
          <button
            type="button"
            onClick={swapPanes}
            className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            title="Swap Left / Right Panes"
            aria-label="Swap Panes"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Close Split Pane */}
        {!isOnlyPane && (
          <button
            type="button"
            onClick={() => closePane(pane.id)}
            className="p-1 rounded-md text-stone-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="Close this split pane"
            aria-label="Close Split Pane"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
