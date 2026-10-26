/**
 * vCard (.vcf) Import Modal for Phase P48
 * 
 * Safe, batch importing of RFC 6350 contacts as canonical Markdown notes.
 * Includes duplicate candidate detection, preview breakdown, and recovery point snapshots.
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Users,
  AlertCircle,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldCheck,
  Folder as FolderIcon,
} from 'lucide-react';
import { VCardContact, PersonRecord } from '../peopleTypes';
import { parseVCardText } from '../vcardParser';
import { Note, Folder, SavedSearch, AppSettings } from '../../../types';
import { peopleService } from '../peopleService';
import { recoveryPointService } from '../../resilience/recoveryPointService';

interface VCardImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPeople: PersonRecord[];
  notes: Note[];
  folders: Folder[];
  savedSearches: SavedSearch[];
  settings: AppSettings;
  onCreateNote: (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  onImportComplete: (count: number) => void;
}

export const VCardImportModal: React.FC<VCardImportModalProps> = ({
  isOpen,
  onClose,
  existingPeople,
  notes,
  folders,
  savedSearches,
  settings,
  onCreateNote,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedContacts, setParsedContacts] = useState<VCardContact[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    try {
      const text = await file.text();
      const result = parseVCardText(text);

      setParsedContacts(result.contacts);
      setWarnings(result.warnings);

      // By default, select all non-empty contacts
      const initialSelected = new Set<number>();
      result.contacts.forEach((_, idx) => initialSelected.add(idx));
      setSelectedIndices(initialSelected);
    } catch (err) {
      console.error('Failed to read vCard file:', err);
      setWarnings(['Failed to read vCard file. Please ensure it is a valid .vcf file.']);
    }
  };

  const handleToggleSelect = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndices(next);
  };

  const handleToggleAll = () => {
    if (selectedIndices.size === parsedContacts.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(parsedContacts.map((_, idx) => idx)));
    }
  };

  const handleImport = async () => {
    if (selectedIndices.size === 0) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: selectedIndices.size });

    // 1. Create a pre-import recovery snapshot
    try {
      await recoveryPointService.createRecoveryPoint(
        'before_import',
        `Before importing ${selectedIndices.size} vCard contacts`,
        {
          notes,
          folders,
          savedSearches,
          settings,
        }
      );
    } catch (snapErr) {
      console.warn('Could not take pre-import snapshot:', snapErr);
    }

    let createdCount = 0;
    const indicesList = Array.from(selectedIndices);

    for (let i = 0; i < indicesList.length; i++) {
      const contact = parsedContacts[indicesList[i]];
      const generated = peopleService.generatePersonNoteContent({
        displayName: contact.fn,
        givenName: contact.n?.given,
        familyName: contact.n?.family,
        email: contact.emails[0]?.address,
        phone: contact.phones[0]?.number,
        organization: contact.org,
        role: contact.title,
        birthday: contact.bday,
        website: contact.urls[0],
        location: contact.addresses[0]?.formatted,
        bodyNotes: contact.note,
      });

      try {
        await onCreateNote({
          title: generated.title,
          content: generated.content,
          tags: generated.tags,
          folderId: selectedFolderId,
          pinned: false,
          archived: false,
          trashed: false,
        });
        createdCount++;
      } catch (err) {
        console.error(`Failed to create note for contact "${contact.fn}":`, err);
      }

      setProgress({ current: i + 1, total: indicesList.length });
    }

    setIsProcessing(false);
    onImportComplete(createdCount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">Import Contacts (vCard)</h2>
              <p className="text-xs text-neutral-400">
                Import standard .vcf contacts into your vault as portable Markdown notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {parsedContacts.length === 0 ? (
            /* File Dropzone */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-700 bg-neutral-800/30 p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-neutral-800/60 transition-colors"
            >
              <FileText className="h-10 w-10 text-neutral-500 mb-3" />
              <div className="text-sm font-medium text-neutral-200">
                Click to select a .vcf or .vcard file
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                Supports single or multi-contact address book exports (vCard 3.0 / 4.0)
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".vcf,.vcard,text/vcard"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            /* Parsed Contacts Preview & Configuration */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-300">
                    File: <strong className="text-neutral-100">{fileName}</strong> ({parsedContacts.length} contacts found)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  {selectedIndices.size === parsedContacts.length ? (
                    <>
                      <CheckSquare className="h-3.5 w-3.5" />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <Square className="h-3.5 w-3.5" />
                      <span>Select All</span>
                    </>
                  )}
                </button>
              </div>

              {/* Destination Folder */}
              <div className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-800/40 p-2.5">
                <FolderIcon className="h-4 w-4 text-neutral-400" />
                <label className="text-xs text-neutral-300">Place in folder:</label>
                <select
                  value={selectedFolderId || ''}
                  onChange={(e) => setSelectedFolderId(e.target.value || null)}
                  className="flex-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Root Vault (No folder)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contacts List */}
              <div className="max-h-64 overflow-y-auto rounded-lg border border-neutral-800 divide-y divide-neutral-800/60 bg-neutral-900/60">
                {parsedContacts.map((contact, idx) => {
                  const isSelected = selectedIndices.has(idx);
                  const existingMatch = existingPeople.find(
                    (p) =>
                      p.displayName.toLowerCase() === (contact.fn || '').toLowerCase() ||
                      (contact.emails[0] && p.emails.some((e) => e.address.toLowerCase() === contact.emails[0].address.toLowerCase()))
                  );

                  return (
                    <div
                      key={idx}
                      onClick={() => handleToggleSelect(idx)}
                      className={`flex items-center justify-between p-2.5 text-xs cursor-pointer hover:bg-neutral-800/50 transition-colors ${
                        isSelected ? 'bg-blue-500/5' : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-neutral-700 text-blue-500 focus:ring-0"
                        />
                        <div>
                          <div className="font-medium text-neutral-200">
                            {contact.fn || `${contact.n?.given || ''} ${contact.n?.family || ''}`.trim() || 'Unnamed Contact'}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {[contact.title, contact.org, contact.emails[0]?.address, contact.phones[0]?.number]
                              .filter(Boolean)
                              .join(' • ')}
                          </div>
                        </div>
                      </div>

                      {existingMatch && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/20">
                          <AlertCircle className="h-3 w-3" />
                          Matches existing
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200 space-y-1">
                  {warnings.map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progress Indicator */}
          {isProcessing && progress && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-neutral-300">
                <span>Importing contacts...</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-800 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing || selectedIndices.size === 0}
            onClick={handleImport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <span>Import {selectedIndices.size} Contacts</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
