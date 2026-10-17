import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileQuestion,
  Link2Off,
  RefreshCw,
  Plus,
  ArrowRight,
  X,
  FileText,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Note } from '../../types';
import {
  vaultHealthService,
  VaultHealthReport,
  BrokenLinkItem,
} from './vaultHealthService';
import { soundscapeService } from '../../utils/soundscapes';

interface VaultHealthDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSaveNote: (note: Note) => void;
  onOpenNote: (noteId: string, title?: string) => void;
}

export const VaultHealthDoctorModal: React.FC<VaultHealthDoctorModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSaveNote,
  onOpenNote,
}) => {
  const [reportKey, setReportKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'broken' | 'orphans'>('broken');

  const report: VaultHealthReport = useMemo(() => {
    return vaultHealthService.scanVault(notes);
  }, [notes, reportKey]);

  if (!isOpen) return null;

  const handleCreateStub = (item: BrokenLinkItem) => {
    const stub = vaultHealthService.createStubNoteForBrokenLink(
      item.targetTitle,
      item.sourceNoteTitle
    ) as Note;
    onSaveNote(stub);
    soundscapeService.playSuccessChime();
    setReportKey((k) => k + 1);
  };

  const handleUnlink = (item: BrokenLinkItem) => {
    const sourceNote = notes.find((n) => n.id === item.sourceNoteId);
    if (!sourceNote) return;

    const healedContent = vaultHealthService.healBrokenLinkInContent(
      sourceNote.content || '',
      item.targetTitle
    );
    onSaveNote({
      ...sourceNote,
      content: healedContent,
      updatedAt: new Date().toISOString(),
    });
    soundscapeService.playSuccessChime();
    setReportKey((k) => k + 1);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
    if (score >= 70) return 'text-amber-400 border-amber-500/40 bg-amber-950/20';
    return 'text-rose-400 border-rose-500/40 bg-rose-950/20';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-stone-100 animate-fade-in font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Vault Health & Integrity Doctor
              </h2>
              <p className="text-xs text-stone-400">
                Automated link integrity analysis, broken wiki-link healer, and orphan note resurfacer.
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

        {/* Health Score Overview HUD */}
        <div className="p-6 border-b border-stone-800 grid grid-cols-1 sm:grid-cols-4 gap-4 bg-stone-950/40">
          {/* Score Gauge */}
          <div
            className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${getScoreColor(
              report.healthScore
            )}`}
          >
            <div className="text-3xl font-extrabold font-mono tracking-tight">
              {report.healthScore}%
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider mt-0.5">
              Health Rating
            </div>
          </div>

          {/* Broken Links Counter */}
          <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col justify-center">
            <div className="text-[10px] font-mono uppercase text-stone-500">Broken Links</div>
            <div
              className={`text-2xl font-bold mt-0.5 ${
                report.brokenLinks.length > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {report.brokenLinks.length}
            </div>
            <div className="text-[10px] text-stone-400">Missing target notes</div>
          </div>

          {/* Orphan Notes Counter */}
          <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col justify-center">
            <div className="text-[10px] font-mono uppercase text-stone-500">Orphan Notes</div>
            <div className="text-2xl font-bold text-amber-400 mt-0.5">
              {report.orphanNotes.length}
            </div>
            <div className="text-[10px] text-stone-400">0 incoming & 0 outgoing</div>
          </div>

          {/* Total Density */}
          <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex flex-col justify-center">
            <div className="text-[10px] font-mono uppercase text-stone-500">Graph Density</div>
            <div className="text-2xl font-bold text-white mt-0.5">{report.totalLinks}</div>
            <div className="text-[10px] text-stone-400">Active connections</div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-stone-800 bg-stone-900/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('broken')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'broken'
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              <Link2Off className="w-3.5 h-3.5" />
              <span>Broken Links ({report.brokenLinks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('orphans')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'orphans'
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              <FileQuestion className="w-3.5 h-3.5" />
              <span>Orphan Notes ({report.orphanNotes.length})</span>
            </button>
          </div>

          <button
            onClick={() => setReportKey((k) => k + 1)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors flex items-center gap-1 text-xs"
            title="Re-run health check sweep"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Re-scan</span>
          </button>
        </div>

        {/* Body List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {activeTab === 'broken' && (
            <>
              {report.brokenLinks.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-bold text-white">No Broken Links Detected</p>
                  <p className="text-xs text-stone-500 mt-1">
                    Every wiki-link in your knowledge vault connects cleanly to an existing note.
                  </p>
                </div>
              ) : (
                report.brokenLinks.map((item, idx) => (
                  <div
                    key={`${item.sourceNoteId}-${item.targetTitle}-${idx}`}
                    className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-400">
                          [[{item.targetTitle}]]
                        </span>
                        <span className="text-stone-600">in</span>
                        <button
                          onClick={() => {
                            onOpenNote(item.sourceNoteId, item.sourceNoteTitle);
                            onClose();
                          }}
                          className="text-xs text-amber-400/90 hover:underline truncate"
                        >
                          {item.sourceNoteTitle}
                        </button>
                      </div>
                      <div className="text-[11px] font-mono text-stone-500 mt-1 truncate">
                        {item.lineSnippet}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCreateStub(item)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-colors"
                        title="Create a new note with this title to resolve the link"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Note</span>
                      </button>

                      <button
                        onClick={() => handleUnlink(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
                        title="Remove [[ ]] brackets and keep plain text"
                      >
                        Unlink
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'orphans' && (
            <>
              {report.orphanNotes.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-bold text-white">No Orphan Notes Found</p>
                  <p className="text-xs text-stone-500 mt-1">
                    All notes are actively linked into the knowledge web.
                  </p>
                </div>
              ) : (
                report.orphanNotes.map((note) => (
                  <div
                    key={note.noteId}
                    className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-stone-200 truncate">
                        {note.noteTitle}
                      </div>
                      <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                        {note.wordCount} words · Last edited{' '}
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onOpenNote(note.noteId, note.noteTitle);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-stone-850 hover:bg-stone-750 text-amber-400 font-medium text-xs flex items-center gap-1 transition-colors"
                    >
                      <span>Open Note</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/70 flex items-center justify-between text-xs text-stone-500">
          <span>Automated Vault Hygiene Protocol</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
