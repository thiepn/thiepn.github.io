import React, { useState, useMemo } from 'react';
import { DecisionLesson, Retrospective } from '../decisionTypes';
import { decisionService } from '../decisionService';
import {
  Search,
  BookOpen,
  History,
  Plus,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface RetrospectivesTabProps {
  lessons: DecisionLesson[];
  retrospectives: Retrospective[];
  onNewLesson: () => void;
  onNewRetrospective: () => void;
  onCreateLessonNote?: (title: string, content: string) => void;
}

export const RetrospectivesTab: React.FC<RetrospectivesTabProps> = ({
  lessons,
  retrospectives,
  onNewLesson,
  onNewRetrospective,
  onCreateLessonNote,
}) => {
  const [subTab, setSubTab] = useState<'lessons' | 'retrospectives'>('lessons');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('all');

  const domains = useMemo(() => {
    const set = new Set<string>();
    lessons.forEach((l) => {
      if (l.domain) set.add(l.domain);
    });
    return Array.from(set);
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      const matchesSearch =
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.takeaway.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDomain = selectedDomain === 'all' || l.domain === selectedDomain;
      return matchesSearch && matchesDomain;
    });
  }, [lessons, searchQuery, selectedDomain]);

  const filteredRetros = useMemo(() => {
    return retrospectives.filter((r) => {
      return (
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.whatWentWell.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.whatDidnt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.lessonsLearned.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [retrospectives, searchQuery]);

  const handleDeleteLesson = (id: string) => {
    if (confirm('Delete this extracted lesson?')) {
      decisionService.deleteLesson(id);
    }
  };

  const handleDeleteRetro = (id: string) => {
    if (confirm('Delete this retrospective?')) {
      decisionService.deleteRetrospective(id);
    }
  };

  const handleExportNote = (lesson: DecisionLesson) => {
    if (onCreateLessonNote) {
      const { title, content } = decisionService.extractLessonToNote(lesson);
      onCreateLessonNote(title, content);
    }
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSubTab('lessons')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              subTab === 'lessons'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Extracted Lessons ({lessons.length})
          </button>
          <button
            onClick={() => setSubTab('retrospectives')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              subTab === 'retrospectives'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Retrospectives ({retrospectives.length})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={`Search ${subTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800/60 rounded-lg border border-stone-200 dark:border-stone-700/60 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {subTab === 'lessons' && domains.length > 0 && (
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200"
            >
              <option value="all">All Domains</option>
              {domains.map((dom) => (
                <option key={dom} value={dom}>
                  {dom}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={subTab === 'lessons' ? onNewLesson : onNewRetrospective}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New {subTab === 'lessons' ? 'Lesson' : 'Retro'}
          </button>
        </div>
      </div>

      {/* SUBTAB 1: EXTRACTED LESSONS */}
      {subTab === 'lessons' && (
        <div className="space-y-3">
          {filteredLessons.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
              <BookOpen className="w-12 h-12 mx-auto text-stone-400 dark:text-stone-600 mb-3 stroke-[1.5]" />
              <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200 mb-1">
                No Extracted Lessons Yet
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
                Extract durable principles from completed decisions, experiments, and periodic reviews into reusable notes.
              </p>
              <button
                onClick={onNewLesson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-500 transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Add Durable Lesson
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLessons.map((l) => (
                <div
                  key={l.id}
                  className="p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-500/50 shadow-xs flex flex-col justify-between space-y-3 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {l.domain && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                            {l.domain}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-400 font-mono">
                        {l.createdAt.slice(0, 10)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {l.title}
                    </h4>

                    <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-sans">
                      {l.takeaway}
                    </div>

                    {l.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        {l.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 font-mono"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleExportNote(l)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Create Markdown Note
                    </button>

                    <button
                      onClick={() => handleDeleteLesson(l.id)}
                      className="p-1 text-stone-400 hover:text-rose-500 rounded transition"
                      title="Delete lesson"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: RETROSPECTIVES */}
      {subTab === 'retrospectives' && (
        <div className="space-y-3">
          {filteredRetros.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6">
              <History className="w-12 h-12 mx-auto text-stone-400 dark:text-stone-600 mb-3 stroke-[1.5]" />
              <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200 mb-1">
                No Retrospectives Found
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto mb-4">
                Conduct structured postmortems after projects, key milestones, incidents, or decisions.
              </p>
              <button
                onClick={onNewRetrospective}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-500 transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Record a Retrospective
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRetros.map((r) => (
                <div
                  key={r.id}
                  className="p-4 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 shadow-xs space-y-3 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded font-semibold uppercase bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                        {r.type}
                      </span>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {r.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 font-mono">{r.date}</span>
                      <button
                        onClick={() => handleDeleteRetro(r.id)}
                        className="p-1 text-stone-400 hover:text-rose-500 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 space-y-1">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        What Went Well
                      </span>
                      <p className="text-stone-700 dark:text-stone-300">{r.whatWentWell}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/15 space-y-1">
                      <span className="font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        What Didn't Go Well
                      </span>
                      <p className="text-stone-700 dark:text-stone-300">{r.whatDidnt}</p>
                    </div>
                  </div>

                  {r.lessonsLearned && (
                    <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs space-y-1">
                      <span className="font-semibold text-amber-800 dark:text-amber-200 block">
                        Core Takeaway
                      </span>
                      <p className="text-stone-700 dark:text-stone-300">{r.lessonsLearned}</p>
                    </div>
                  )}

                  {r.nextActions && r.nextActions.length > 0 && (
                    <div className="text-xs space-y-1">
                      <span className="font-semibold text-stone-700 dark:text-stone-300 block">
                        Follow-Up Actions
                      </span>
                      <ul className="list-disc list-inside text-stone-600 dark:text-stone-400 space-y-0.5">
                        {r.nextActions.map((act, idx) => (
                          <li key={idx}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
