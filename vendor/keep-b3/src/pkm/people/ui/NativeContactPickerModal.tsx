/**
 * Native OS Contact Picker Modal for Phase P48
 * 
 * Privacy-first modal for importing specific contacts via browser/mobile Contact Picker API.
 */

import React, { useState } from 'react';
import {
  X,
  Smartphone,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { NativeContactSelectResult } from '../peopleTypes';
import { isNativeContactPickerSupported, pickNativeContacts } from '../nativeContactPicker';
import { Note } from '../../../types';
import { peopleService } from '../peopleService';

interface NativeContactPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNote: (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  onImportComplete: (count: number) => void;
}

export const NativeContactPickerModal: React.FC<NativeContactPickerModalProps> = ({
  isOpen,
  onClose,
  onCreateNote,
  onImportComplete,
}) => {
  const isSupported = isNativeContactPickerSupported();
  const [pickedContacts, setPickedContacts] = useState<NativeContactSelectResult[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleTriggerPicker = async () => {
    setIsPicking(true);
    setErrorMsg(null);
    try {
      const res = await pickNativeContacts({ multiple: true });
      if (res.success) {
        setPickedContacts(res.contacts);
      } else {
        setErrorMsg(res.error || 'Failed to select contacts.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error opening native contact picker.');
    } finally {
      setIsPicking(false);
    }
  };

  const handleSaveContacts = async () => {
    if (pickedContacts.length === 0) return;
    setIsSaving(true);
    let count = 0;

    for (const contact of pickedContacts) {
      const generated = peopleService.generatePersonNoteContent({
        displayName: contact.displayName,
        givenName: contact.givenName,
        familyName: contact.familyName,
        email: contact.emails[0],
        phone: contact.phones[0],
        organization: contact.organization,
        role: contact.role,
        birthday: contact.birthday,
        location: contact.addresses[0],
      });

      try {
        await onCreateNote({
          title: generated.title,
          content: generated.content,
          tags: generated.tags,
          folderId: null,
          pinned: false,
          archived: false,
          trashed: false,
        });
        count++;
      } catch (err) {
        console.error('Failed to save picked contact:', err);
      }
    }

    setIsSaving(false);
    onImportComplete(count);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">OS Contact Picker</h2>
              <p className="text-xs text-neutral-400">
                Explicit, privacy-preserving single or batch contact selection
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Privacy Guarantee */}
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-emerald-100">Zero Harvesting Privacy Model</span>
              <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                The application never scans or uploads your address book in the background. Only contacts you explicitly choose in the OS dialog will be converted into local Markdown notes.
              </p>
            </div>
          </div>

          {!isSupported ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
              <div className="text-xs font-semibold text-amber-200">
                Contact Picker API Not Available
              </div>
              <p className="text-[11px] text-amber-300/80 max-w-sm mx-auto">
                The native Contact Picker API is supported on mobile devices (Chrome/Android, Safari iOS 14.5+) and Chromium browsers with permissions. You can also import any standard <strong className="text-amber-100">.vcf</strong> file via the vCard Importer.
              </p>
            </div>
          ) : pickedContacts.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <Smartphone className="h-12 w-12 text-neutral-500 mx-auto" />
              <p className="text-xs text-neutral-300 max-w-xs mx-auto">
                Click below to open your device's native contact selector and pick contacts to import.
              </p>
              <button
                type="button"
                onClick={handleTriggerPicker}
                disabled={isPicking}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                <span>{isPicking ? 'Selecting...' : 'Open Device Contacts'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-neutral-300">
                Selected Contacts ({pickedContacts.length}):
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-neutral-800 divide-y divide-neutral-800 bg-neutral-800/30">
                {pickedContacts.map((c, idx) => (
                  <div key={idx} className="p-2.5 text-xs">
                    <div className="font-medium text-neutral-100">{c.displayName}</div>
                    <div className="text-[11px] text-neutral-400">
                      {[c.emails[0], c.phones[0], c.organization].filter(Boolean).join(' • ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {errorMsg}
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
          {pickedContacts.length > 0 && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveContacts}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <span>Add {pickedContacts.length} Contacts to Vault</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
