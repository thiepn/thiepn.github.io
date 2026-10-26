import React from 'react';
import {
  Sliders,
  Users,
  Sparkles,
  GraduationCap,
  BookOpen,
  DollarSign,
  Heart,
  Plane,
  Shield,
  GitBranch,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { moduleRegistryV2 } from '../core/modules/moduleRegistry';
import { V2ModuleManifest } from '../core/modules/moduleContract';

export interface ModuleDisclosureManagerProps {
  onModulesUpdated?: () => void;
}

export const ModuleDisclosureManager: React.FC<ModuleDisclosureManagerProps> = ({
  onModulesUpdated,
}) => {
  const allModules = moduleRegistryV2.getAll();

  const handleToggleModule = (moduleId: string) => {
    const isEnabled = moduleRegistryV2.isEnabled(moduleId);
    moduleRegistryV2.setEnabled(moduleId, !isEnabled);
    if (onModulesUpdated) {
      onModulesUpdated();
    }
  };

  const getModuleIcon = (id: string) => {
    switch (id) {
      case 'people':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'tracking':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'learning':
        return <GraduationCap className="w-4 h-4 text-purple-500" />;
      case 'library':
        return <BookOpen className="w-4 h-4 text-indigo-500" />;
      case 'finance':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'health':
        return <Heart className="w-4 h-4 text-rose-500" />;
      case 'travel':
        return <Plane className="w-4 h-4 text-sky-500" />;
      case 'assets':
        return <Shield className="w-4 h-4 text-orange-500" />;
      case 'decisions':
        return <GitBranch className="w-4 h-4 text-teal-500" />;
      default:
        return <Sliders className="w-4 h-4 text-stone-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
          Domain Modules & Progressive Disclosure
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          Enable domain modules only when your workflow requires them. Disabling a module hides its navigation and cues without deleting any underlying data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {allModules.map((mod) => {
          const isEnabled = moduleRegistryV2.isEnabled(mod.manifest.id);

          return (
            <div
              key={mod.manifest.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                isEnabled
                  ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs'
                  : 'bg-stone-50/60 dark:bg-stone-950/40 border-stone-200/60 dark:border-stone-800/40 opacity-75'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 shrink-0 mt-0.5">
                  {getModuleIcon(mod.manifest.id)}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                      {mod.manifest.name}
                    </span>
                    {isEnabled && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                    {mod.manifest.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleModule(mod.manifest.id)}
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  isEnabled
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 hover:bg-amber-200'
                    : 'bg-stone-200/60 dark:bg-stone-800 text-stone-500 hover:bg-stone-300 dark:hover:bg-stone-700'
                }`}
                title={isEnabled ? 'Disable module' : 'Enable module'}
                aria-label={`Toggle ${mod.manifest.name}`}
              >
                {isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
