/**
 * vCard (.vcf) Export Modal for Phase P48
 * 
 * Exports canonical Person notes to standard RFC 6350 vCard files.
 * Provides explicit plaintext privacy warnings for encrypted vaults.
 */

import React, { useState } from 'react';
import {
  X,
  Download,
  ShieldAlert,
  Users,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { PersonRecord } from '../peopleTypes';
import { exportPeopleToVCardString, personToVCardString } from '../vcardExporter';
import { Note } from '../../../types';

interface VCardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: PersonRecord[];
  allNotes: Note[];
  isVaultEncrypted?: boolean;
  selectedPersonId?: string;
}

export const VCardExportModal: React.FC<VCardExportModalProps> = ({
  isOpen,
  onClose,
  people,
  allNotes,
  isVaultEncrypted,
  selectedPersonId,
}) => {
  const [exportScope, setExportScope] = useState<'selected' | 'all'>(
    selectedPersonId ? 'selected' : 'all'
  );
  const [includeNoteBody, setIncludeNoteBody] = useState(true);

  if (!isOpen) return null;

  const targetPeople = exportScope === 'selected' && selectedPersonId
    ? people.filter((p) => p.id === selectedPersonId)
    : people.filter((p) => !p.isTrashed);

  const handleDownloadVCard = () => {
    const exportItems = targetPeople.map((p) => {
      const note = allNotes.find((n) => n.id === p.id);
      return {
        person: p,
        markdownBody: includeNoteBody ? note?.content : undefined,
      };
    });

    const vcfContent = exportPeopleToVCardString(exportItems);
    const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const fileName =
      exportScope === 'selected' && targetPeople[0]
        ? `${targetPeople[0].displayName.replace(/\s+/g, '_')}.vcf`
        : `vault_contacts_${new Date().toISOString().slice(0, 10)}.vcf`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">Export Contacts (vCard)</h2>
              <p className="text-xs text-neutral-400">
                Generate an RFC 6350 .vcf file compatible with Apple Contacts, Google, and Outlook
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
          {/* Plaintext Warning if Vault Encrypted */}
          {isVaultEncrypted && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>Unencrypted Plaintext Export Notice</span>
              </div>
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                Your vault is currently encrypted. Exporting contacts will create an unencrypted, portable standard .vcf file on your local device. Ensure you store this file securely.
              </p>
            </div>
          )}

          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Export Scope
            </label>
            <div className="space-y-1.5">
              {selectedPersonId && (
                <label className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-800/40 p-2.5 text-xs text-neutral-200 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={exportScope === 'selected'}
                    onChange={() => setExportScope('selected')}
                    className="border-neutral-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Selected Contact Only ({people.find((p) => p.id === selectedPersonId)?.displayName})</span>
                </label>
              )}

              <label className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-800/40 p-2.5 text-xs text-neutral-200 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={exportScope === 'all'}
                  onChange={() => setExportScope('all')}
                  className="border-neutral-700 text-emerald-500 focus:ring-0"
                />
                <span>All Active Contacts ({people.filter((p) => !p.isTrashed).length} contacts)</span>
              </label>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNoteBody}
                onChange={(e) => setIncludeNoteBody(e.target.checked)}
                className="rounded border-neutral-700 text-emerald-500 focus:ring-0"
              />
              <span>Include Markdown notes in vCard NOTE field</span>
            </label>
          </div>
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
            onClick={handleDownloadVCard}
            disabled={targetPeople.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download .vcf ({targetPeople.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
