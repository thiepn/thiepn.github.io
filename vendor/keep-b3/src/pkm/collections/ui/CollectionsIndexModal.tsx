import React, { useState } from 'react';
import { Collection, CollectionSourceType } from '../collectionTypes';
import { collectionService, DEFAULT_COLLECTIONS } from '../collectionService';
import { Folder } from '../../../types';
import {
  Layers,
  Plus,
  FolderKanban,
  BookOpen,
  Folder as FolderIcon,
  Tag as TagIcon,
  Search,
  Sparkles,
  Trash2,
  Copy,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

export interface CollectionsIndexModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  tags: string[];
  onOpenCollection: (collectionId: string) => void;
}

export const CollectionsIndexModal: React.FC<CollectionsIndexModalProps> = ({
  isOpen,
  onClose,
  folders,
  tags,
  onOpenCollection,
}) => {
  const [collections, setCollections] = useState<Collection[]>(() => collectionService.loadCollections());
  const [search, setSearch] = useState('');

  // Create modal tab
  const [isCreating, setIsCreating] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [sourceType, setSourceType] = useState<CollectionSourceType>('tag');
  const [selectedTag, setSelectedTag] = useState(tags[0] || 'project');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folders[0]?.id || null);

  if (!isOpen) return null;

  const filteredCollections = collections.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = () => {
    if (!newColName.trim()) return;

    let source: any;
    if (sourceType === 'tag') {
      source = { type: 'tag', tag: selectedTag.replace(/^#/, '') };
    } else if (sourceType === 'folder') {
      source = { type: 'folder', folderId: selectedFolderId };
    } else {
      source = { type: 'notes', noteIds: [] };
    }

    const newCol: Collection = {
      id: `col-${Date.now()}`,
      name: newColName.trim(),
      description: newColDesc.trim() || undefined,
      icon: 'Layers',
      source,
      schema: [
        { id: 'status', name: 'Status', type: 'select', options: ['todo', 'in_progress', 'done'] },
        { id: 'priority', name: 'Priority', type: 'select', options: ['high', 'medium', 'low'] },
        { id: 'due', name: 'Due Date', type: 'date' },
      ],
      views: [
        {
          id: `view-${Date.now()}-table`,
          name: 'Table View',
          type: 'table',
          isDefault: true,
          filters: { conjunction: 'and', rules: [] },
          sorts: [{ field: 'title', direction: 'asc' }],
          visiblePropertyIds: ['title', 'status', 'priority', 'due'],
        },
        {
          id: `view-${Date.now()}-board`,
          name: 'Board View',
          type: 'board',
          groupByPropertyId: 'status',
          filters: { conjunction: 'and', rules: [] },
          sorts: [],
          visiblePropertyIds: ['title', 'priority', 'due'],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = collectionService.saveCollection(newCol);
    setCollections(collectionService.loadCollections());
    setIsCreating(false);
    onOpenCollection(saved.id);
    onClose();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this Collection? Note: underlying Markdown notes will NOT be deleted.')) {
      collectionService.deleteCollection(id);
      setCollections(collectionService.loadCollections());
    }
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const dup = collectionService.duplicateCollection(id);
    if (dup) {
      setCollections(collectionService.loadCollections());
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="collections-hub-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-indigo-500" />
            <div>
              <h2 id="collections-hub-title" className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                Collections & Structured Databases
              </h2>
              <p className="text-[11px] text-stone-400">
                Database-like views over your canonical Markdown notes and properties
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!isCreating ? (
            <>
              {/* Search & Actions */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search collections..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Collection
                </button>
              </div>

              {/* Collections Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {filteredCollections.map((col) => (
                  <div
                    key={col.id}
                    onClick={() => {
                      onOpenCollection(col.id);
                      onClose();
                    }}
                    className="p-4 bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-2xl shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                            <Layers className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-xs text-stone-900 dark:text-stone-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {col.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleDuplicate(col.id, e)}
                            className="p-1 hover:bg-stone-100 dark:hover:bg-stone-750 rounded text-stone-400 hover:text-stone-600"
                            title="Duplicate collection"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(col.id, e)}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-stone-400 hover:text-rose-600"
                            title="Delete collection definition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {col.description && (
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-2 line-clamp-2">
                          {col.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-stone-100 dark:border-stone-800 text-[10px] text-stone-400">
                      <span>
                        Source:{' '}
                        <strong>
                          {col.source.type === 'tag'
                            ? `#${col.source.tag}`
                            : col.source.type === 'folder'
                            ? `Folder`
                            : col.source.type}
                        </strong>
                      </span>
                      <span>{col.views.length} views</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Creation Form */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Collection Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sprint Tasks, Research Papers, Client Invoices"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Brief description of the collection purpose"
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Collection Note Source
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType('tag')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${
                      sourceType === 'tag'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <TagIcon className="w-4 h-4 text-indigo-500" />
                    <div>
                      <div className="text-xs font-semibold">By Tag</div>
                      <div className="text-[10px] text-stone-400">Match notes by tag</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('folder')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${
                      sourceType === 'folder'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <FolderIcon className="w-4 h-4 text-indigo-500" />
                    <div>
                      <div className="text-xs font-semibold">By Folder</div>
                      <div className="text-[10px] text-stone-400">Match notes in folder</div>
                    </div>
                  </button>
                </div>
              </div>

              {sourceType === 'tag' ? (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. project or invoice"
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Select Folder
                  </label>
                  <select
                    value={selectedFolderId || ''}
                    onChange={(e) => setSelectedFolderId(e.target.value || null)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100"
                  >
                    <option value="">Root / Unorganized Notes</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newColName.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
                >
                  Create Collection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
