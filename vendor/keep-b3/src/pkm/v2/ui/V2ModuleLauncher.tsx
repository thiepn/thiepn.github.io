import React, { useState, useEffect } from 'react';
import {
  Layers,
  Check,
  Power,
  Shield,
  FileText,
  CheckSquare,
  Calendar,
  Home,
  Users,
  Sparkles,
  GraduationCap,
  BookOpen,
  DollarSign,
  Heart,
  Plane,
  GitBranch,
} from 'lucide-react';
import { moduleRegistryV2 } from '../core/modules/moduleRegistry';
import { V2ModuleInstance } from '../core/modules/moduleContract';

const ICON_MAP: Record<string, any> = {
  FileText,
  CheckSquare,
  Calendar,
  Home,
  Lock: Shield,
  Users,
  Sparkles,
  GraduationCap,
  BookOpen,
  DollarSign,
  Heart,
  Plane,
  Shield,
  GitBranch,
};

export const V2ModuleLauncher: React.FC = () => {
  const [modules, setModules] = useState<V2ModuleInstance[]>([]);

  useEffect(() => {
    setModules(moduleRegistryV2.getAll());
    const unsub = moduleRegistryV2.subscribe(() => {
      setModules(moduleRegistryV2.getAll());
    });
    return unsub;
  }, []);

  const handleToggle = (id: string, current: boolean) => {
    moduleRegistryV2.setEnabled(id, !current);
  };

  const coreModules = modules.filter((m) => m.manifest.isCore);
  const domainModules = modules.filter((m) => !m.manifest.isCore);

  const renderModuleCard = (mod: V2ModuleInstance) => {
    const Icon = ICON_MAP[mod.manifest.iconName] || Layers;

    return (
      <div
        key={mod.manifest.id}
        className={`p-4 rounded-xl border transition-all ${
          mod.isEnabled
            ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-xs'
            : 'bg-neutral-50 dark:bg-neutral-900/30 border-neutral-200/60 dark:border-neutral-800/40 opacity-75'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                mod.isEnabled
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                  : 'bg-neutral-200/50 dark:bg-neutral-800/40 text-neutral-400'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                  {mod.manifest.name}
                </h3>
                {mod.manifest.isCore && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded">
                    Core
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                {mod.manifest.description}
              </p>
            </div>
          </div>

          {!mod.manifest.isCore && (
            <button
              onClick={() => handleToggle(mod.manifest.id, mod.isEnabled)}
              className={`p-1.5 rounded-lg border transition ${
                mod.isEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                  : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-400 hover:text-neutral-600'
              }`}
              title={mod.isEnabled ? 'Disable Module' : 'Enable Module'}
            >
              <Power className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Modular Product Architecture
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Enable or disable modules dynamically. Disabling a module hides its routes and navigation items while preserving 100% of underlying data safely on disk.
        </p>
      </div>

      {/* Domain Modules */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Optional Life Domains ({domainModules.filter((m) => m.isEnabled).length}/{domainModules.length} Active)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {domainModules.map(renderModuleCard)}
        </div>
      </div>

      {/* Core Modules */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Core Foundation Modules (Always Active)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {coreModules.map(renderModuleCard)}
        </div>
      </div>
    </div>
  );
};
