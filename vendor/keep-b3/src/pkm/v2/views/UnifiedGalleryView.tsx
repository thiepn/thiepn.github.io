import React from 'react';
import { ResourceCore } from '../core/resource/resourceCore';
import {
  CheckSquare,
  Square,
  Star,
  BookOpen,
  User,
  Folder,
  Wrench,
  FileText,
} from 'lucide-react';

export interface UnifiedGalleryViewProps {
  items: ResourceCore[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectResource: (id: string) => void;
  visibleColumns?: string[];
}

export const UnifiedGalleryView: React.FC<UnifiedGalleryViewProps> = ({
  items,
  selectedIds,
  onToggleSelect,
  onSelectResource,
  visibleColumns = ['title', 'author', 'progress', 'rating'],
}) => {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-neutral-500 text-sm">
        No resources match the gallery query.
      </div>
    );
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'book': return <BookOpen size={24} className="text-purple-400" />;
      case 'person': return <User size={24} className="text-pink-400" />;
      case 'project': return <Folder size={24} className="text-indigo-400" />;
      case 'asset': return <Wrench size={24} className="text-amber-400" />;
      default: return <FileText size={24} className="text-neutral-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => {
        const isSelected = selectedIds.has(item.id);
        const author = item.author || item.metadata?.author;
        const rating = item.rating !== undefined ? item.rating : item.metadata?.rating;
        const progress = item.progress !== undefined ? item.progress : item.metadata?.progress;
        const status = item.status || item.metadata?.status;

        return (
          <div
            key={item.id}
            onClick={() => onSelectResource(item.id)}
            className={`bg-neutral-950 border rounded-xl overflow-hidden shadow-sm hover:border-neutral-700 transition-all flex flex-col justify-between cursor-pointer group ${
              isSelected ? 'border-amber-500/80 bg-amber-500/5' : 'border-neutral-800'
            }`}
          >
            {/* Header Banner */}
            <div className="h-28 bg-gradient-to-br from-neutral-900 to-neutral-850 p-3 flex flex-col justify-between relative border-b border-neutral-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-950/80 text-neutral-300 border border-neutral-700">
                  {item.type}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(item.id);
                  }}
                  className="p-1 text-neutral-400 hover:text-white rounded bg-neutral-950/60 transition-colors"
                >
                  {isSelected ? (
                    <CheckSquare size={16} className="text-amber-400" />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center opacity-80 group-hover:scale-105 transition-transform">
                {getIconForType(item.type)}
              </div>
            </div>

            {/* Content Body */}
            <div className="p-3.5 flex flex-col justify-between grow">
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-1 mb-1">
                  {item.title || 'Untitled'}
                </h3>

                {author && (
                  <p className="text-xs text-neutral-400 truncate mb-2">
                    by {author}
                  </p>
                )}

                {status && (
                  <span className="text-[10px] capitalize px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800 inline-block mb-2">
                    {String(status).replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Progress & Rating Footer */}
              <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-400">
                {progress !== undefined && (
                  <div className="flex items-center gap-1.5 grow mr-2">
                    <div className="grow bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, Number(progress)))}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-neutral-300">{progress}%</span>
                  </div>
                )}

                {rating !== undefined && (
                  <div className="flex items-center gap-1 text-amber-400 shrink-0">
                    <Star size={12} className="fill-amber-400" />
                    <span className="font-mono font-semibold text-[11px]">{rating}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
