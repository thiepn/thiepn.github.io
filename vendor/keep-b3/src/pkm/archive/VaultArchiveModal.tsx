import React, { useState } from 'react';
import {
  Download,
  FileCode,
  FileText,
  FolderArchive,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { Note, Folder } from '../../types';
import {
  VaultArchiveExporter,
  VaultArchiveManifest,
} from './vaultArchiveExporter';
import { soundscapeService } from '../../utils/soundscapes';

interface VaultArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
}

export const VaultArchiveModal: React.FC<VaultArchiveModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
}) => {
  const [downloadedJSON, setDownloadedJSON] = useState(false);
  const [downloadedHTML, setDownloadedHTML] = useState(false);

  if (!isOpen) return null;

  const manifest: VaultArchiveManifest = VaultArchiveExporter.createManifest(
    notes,
    folders
  );

  const approxSizeKB = Math.round(
    JSON.stringify(manifest).length / 1024
  );

  const handleDownloadJSON = () => {
    VaultArchiveExporter.exportAsJSON(manifest);
    setDownloadedJSON(true);
    soundscapeService.playCompletionChime();
  };

  const handleDownloadHTML = () => {
    VaultArchiveExporter.exportStandaloneHTML(manifest);
    setDownloadedHTML(true);
    soundscapeService.playCompletionChime();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden text-stone-100 animate-fade-in font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Complete Standalone Vault Archive
              </h2>
              <p className="text-xs text-stone-400">
                100% self-contained export for perpetual offline reading and backups.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Manifest Statistics Grid */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-stone-950 border border-stone-800 text-center">
            <div>
              <div className="text-[10px] font-mono uppercase text-stone-500">Active Notes</div>
              <div className="text-xl font-bold text-white mt-0.5">{manifest.totalNotes}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-stone-500">Folders</div>
              <div className="text-xl font-bold text-white mt-0.5">{manifest.totalFolders}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-stone-500">Bundle Size</div>
              <div className="text-xl font-bold text-amber-400 mt-0.5">~{approxSizeKB} KB</div>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            {/* Option 1: Standalone Single-File Offline Web Page */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white">
                    Standalone HTML Archive App
                  </h4>
                </div>
                <p className="text-xs text-stone-400 mt-1 max-w-sm">
                  A single `.html` file with embedded interactive search, dark mode, and sidebar. Opens in any web browser without internet or software dependencies.
                </p>
              </div>

              <button
                onClick={handleDownloadHTML}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {downloadedHTML ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Exported!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download .html</span>
                  </>
                )}
              </button>
            </div>

            {/* Option 2: Full Structured JSON Backup */}
            <div className="p-4 rounded-xl border border-stone-800 bg-stone-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-bold text-white">Full JSON Vault Backup</h4>
                </div>
                <p className="text-xs text-stone-400 mt-1 max-w-sm">
                  Complete serialized database containing all markdown content, tags, folder schemas, and timestamps for programmatic restoration.
                </p>
              </div>

              <button
                onClick={handleDownloadJSON}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors"
              >
                {downloadedJSON ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Exported!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download .json</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/70 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero-lockin Local Data Sovereignty</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
