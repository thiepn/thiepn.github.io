import React, { useMemo } from 'react';
import { Note, Folder } from '../../../types';
import {
  Collection,
  CollectionView,
  CollectionRecord,
} from '../collectionTypes';
import { collectionService } from '../collectionService';
import { FileText, Image as ImageIcon, ExternalLink, Calendar, Tag, Star } from 'lucide-react';

export interface CollectionGalleryViewProps {
  collection: Collection;
  view: CollectionView;
  records: CollectionRecord[];
  allNotes: Note[];
  folders: Folder[];
  onOpenNote: (noteId: string) => void;
  onSaveNote: (updatedNote: Note) => void;
  onCreateNewNote?: () => void;
}

export const CollectionGalleryView: React.FC<CollectionGalleryViewProps> = ({
  collection,
  view,
  records,
  allNotes,
  folders,
  onOpenNote,
  onSaveNote,
  onCreateNewNote,
}) => {
  // Extract cover image from note markdown or frontmatter cover property
  const getCoverImage = (record: CollectionRecord): string | null => {
    // 1. Check frontmatter cover
    const coverProp = collectionService.getRecordFieldValue(record, 'cover');
    if (coverProp && typeof coverProp === 'string' && (coverProp.startsWith('http') || coverProp.startsWith('data:'))) {
      return coverProp;
    }

    // 2. Extract first image markdown syntax: ![alt](url) or HTML <img src="...">
    const content = record.note.content || '';
    const mdMatch = content.match(/!\[.*?\]\((https?:\/\/.*?|data:image\/.*?)\)/);
    if (mdMatch) return mdMatch[1];

    const htmlMatch = content.match(/<img\s+[^>]*src=["'](https?:\/\/.*?|data:image\/.*?)["']/i);
    if (htmlMatch) return htmlMatch[1];

    return null;
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 bg-stone-50/50 dark:bg-stone-950">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {records.map((record) => {
          const coverUrl = getCoverImage(record);
          const author = collectionService.getRecordFieldValue(record, 'author');
          const rating = collectionService.getRecordFieldValue(record, 'rating');
          const genre = collectionService.getRecordFieldValue(record, 'genre');
          const status = collectionService.getRecordFieldValue(record, 'status');

          return (
            <div
              key={record.note.id}
              onClick={() => onOpenNote(record.note.id)}
              className="bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col cursor-pointer group"
            >
              {/* Card Cover Image */}
              <div className="h-44 bg-stone-100 dark:bg-stone-800 relative overflow-hidden flex items-center justify-center">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={record.note.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-stone-300 dark:text-stone-650 p-4">
                    <FileText className="w-10 h-10 stroke-1 mb-1.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                      {record.systemValues.folderName}
                    </span>
                  </div>
                )}

                {status && (
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-900/80 backdrop-blur-xs text-white shadow-xs">
                    {String(status).replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {/* Card Details */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {record.note.title || 'Untitled'}
                    </h3>
                  </div>

                  {author && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      by {String(author)}
                    </p>
                  )}

                  {record.note.content && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 line-clamp-2">
                      {record.note.content.replace(/---[\s\S]*?---/, '').trim().slice(0, 120)}
                    </p>
                  )}
                </div>

                {/* Footer tags / rating */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
                  {rating !== null && rating !== undefined ? (
                    <div className="flex items-center gap-1 text-amber-500 font-semibold text-[11px]">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{String(rating)}/5</span>
                    </div>
                  ) : genre ? (
                    <span className="text-[11px] text-stone-400">{String(genre)}</span>
                  ) : (
                    <span className="text-[11px] text-stone-400">{record.systemValues.updatedAtFormatted}</span>
                  )}

                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium group-hover:underline flex items-center gap-0.5">
                    Open <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
