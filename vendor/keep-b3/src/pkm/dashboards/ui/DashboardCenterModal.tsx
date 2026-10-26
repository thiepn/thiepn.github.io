import React, { useState } from 'react';
import { Dashboard } from '../dashboardTypes';
import { dashboardService } from '../dashboardService';
import {
  LayoutDashboard,
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  X,
  Search,
  CheckSquare,
  BookOpen,
  PieChart,
} from 'lucide-react';

interface DashboardCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDashboard: (dashboardId: string, name: string) => void;
}

export const DashboardCenterModal: React.FC<DashboardCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenDashboard,
}) => {
  const [dashboards, setDashboards] = useState<Dashboard[]>(() =>
    dashboardService.getAllDashboards()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  if (!isOpen) return null;

  const reload = () => {
    setDashboards(dashboardService.getAllDashboards());
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const created = dashboardService.createDashboard(newName, newDesc);
    setIsCreating(false);
    setNewName('');
    setNewDesc('');
    reload();
    onOpenDashboard(created.id, created.name);
    onClose();
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dashboardService.duplicateDashboard(id);
    reload();
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Delete Dashboard "${name}"?\n\nNotes, Collections, and all source data will NOT be deleted.`
      )
    ) {
      dashboardService.deleteDashboard(id);
      reload();
    }
  };

  const filtered = dashboards.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'CheckSquare':
        return <CheckSquare className="w-5 h-5 text-emerald-500" />;
      case 'BookOpen':
        return <BookOpen className="w-5 h-5 text-indigo-500" />;
      case 'PieChart':
      default:
        return <LayoutDashboard className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Dashboards & Knowledge Analytics
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search dashboards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Dashboard</span>
          </button>
        </div>

        {/* Inline Create Form */}
        {isCreating && (
          <form
            onSubmit={handleCreate}
            className="p-4 bg-amber-50/40 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-800/30 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-150 text-xs"
          >
            <div className="font-semibold text-stone-900 dark:text-stone-100">
              Create New Dashboard
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Dashboard name (e.g. Sprint Ops)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
              />
              <input
                type="text"
                placeholder="Optional description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded shadow-xs"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* Dashboards List */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 p-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400 text-xs">
              No dashboards found
            </div>
          ) : (
            filtered.map((d) => (
              <div
                key={d.id}
                onClick={() => {
                  onOpenDashboard(d.id, d.name);
                  onClose();
                }}
                className="group flex items-center justify-between p-3.5 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5 truncate pr-4">
                  <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 group-hover:bg-white dark:group-hover:bg-stone-700 shadow-xs transition-colors shrink-0">
                    {getIcon(d.icon)}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {d.name}
                    </span>
                    <span className="text-xs text-stone-400 dark:text-stone-500 truncate">
                      {d.description || 'Custom dashboard view'} • {d.widgets?.length || 0} widgets
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => handleDuplicate(d.id, e)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors"
                    title="Duplicate Dashboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(d.id, d.name, e)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors"
                    title="Delete Dashboard"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="ml-2 flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
