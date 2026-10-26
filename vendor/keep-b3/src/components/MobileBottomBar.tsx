import React from 'react';
import {
  StickyNote,
  Search,
  Zap,
  Calendar,
  Menu,
  Plus,
} from 'lucide-react';
import { FilterState } from '../types';

export interface MobileBottomBarProps {
  filter: FilterState;
  onNavigateHome: () => void;
  onOpenSearch: () => void;
  onOpenQuickCapture: () => void;
  onOpenDailyNote: () => void;
  onOpenNewNote: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  filter,
  onNavigateHome,
  onOpenSearch,
  onOpenQuickCapture,
  onOpenDailyNote,
  onOpenNewNote,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const isHomeActive =
    filter.scope === 'active' &&
    !filter.selectedFolderId &&
    !filter.selectedTag &&
    !filter.selectedColor &&
    !filter.selectedMonth &&
    !filter.searchQuery;

  return (
    <nav
      id="mobile-bottom-nav"
      role="navigation"
      aria-label="Mobile bottom navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md border-t border-stone-200/90 dark:border-stone-800/90 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 px-3 transition-colors shadow-lg"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* 1. Home / Notes */}
        <button
          type="button"
          onClick={onNavigateHome}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl transition-all ${
            isHomeActive
              ? 'text-amber-700 dark:text-amber-400 font-bold'
              : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
          }`}
          aria-label="All Notes"
          aria-current={isHomeActive ? 'page' : undefined}
        >
          <StickyNote className="w-5 h-5 stroke-[2.25]" />
          <span className="text-[10px] mt-0.5 font-medium leading-none">Notes</span>
        </button>

        {/* 2. Search */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white transition-all"
          aria-label="Search and Command Palette"
        >
          <Search className="w-5 h-5 stroke-[2.25]" />
          <span className="text-[10px] mt-0.5 font-medium leading-none">Search</span>
        </button>

        {/* 3. Central New Note / Quick Action */}
        <button
          type="button"
          onClick={onOpenNewNote}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-md transition-all -mt-3 ring-4 ring-white dark:ring-[#121215]"
          title="Create New Note"
          aria-label="Create New Note"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* 4. Quick Capture */}
        <button
          type="button"
          onClick={onOpenQuickCapture}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white transition-all"
          aria-label="Quick Capture Fleeting Note"
        >
          <Zap className="w-5 h-5 stroke-[2.25] text-amber-600 dark:text-amber-400 fill-amber-500/20" />
          <span className="text-[10px] mt-0.5 font-medium leading-none">Capture</span>
        </button>

        {/* 5. More / Navigation Drawer */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl transition-all ${
            isSidebarOpen
              ? 'text-amber-700 dark:text-amber-400 font-bold'
              : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
          }`}
          aria-label={isSidebarOpen ? 'Close Navigation' : 'Open Navigation & Views'}
          aria-expanded={isSidebarOpen}
        >
          <Menu className="w-5 h-5 stroke-[2.25]" />
          <span className="text-[10px] mt-0.5 font-medium leading-none">More</span>
        </button>
      </div>
    </nav>
  );
};
