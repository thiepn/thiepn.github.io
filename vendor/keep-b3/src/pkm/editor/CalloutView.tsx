import React, { useState } from 'react';
import {
  Info,
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  Quote as QuoteIcon,
  Bug,
  Flame,
  CheckSquare,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ParsedCallout, CALLOUT_REGISTRY, CalloutType } from './callouts';

interface CalloutViewProps {
  callout: ParsedCallout;
  renderContent: (content: string) => React.ReactNode;
}

export const CalloutView: React.FC<CalloutViewProps> = ({
  callout,
  renderContent,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(
    callout.isCollapsible && callout.defaultCollapsed
  );

  const config = CALLOUT_REGISTRY[callout.type] || CALLOUT_REGISTRY.note;

  const renderIcon = () => {
    const iconClass = 'w-4 h-4 shrink-0';
    switch (callout.type) {
      case 'tip':
        return <Lightbulb className={iconClass} />;
      case 'warning':
        return <AlertTriangle className={iconClass} />;
      case 'important':
        return <AlertOctagon className={iconClass} />;
      case 'caution':
        return <ShieldAlert className={iconClass} />;
      case 'danger':
        return <Flame className={iconClass} />;
      case 'success':
        return <CheckCircle2 className={iconClass} />;
      case 'question':
      case 'faq':
        return <HelpCircle className={iconClass} />;
      case 'quote':
        return <QuoteIcon className={iconClass} />;
      case 'bug':
        return <Bug className={iconClass} />;
      case 'example':
        return <Sparkles className={iconClass} />;
      case 'todo':
        return <CheckSquare className={iconClass} />;
      case 'info':
      case 'note':
      default:
        return <Info className={iconClass} />;
    }
  };

  return (
    <div
      className={`my-3 rounded-xl border-l-4 ${config.borderColor} ${config.bgColorLight} ${config.bgColorDark} border-t border-r border-b border-stone-200/70 dark:border-stone-800/80 shadow-xs overflow-hidden transition-all`}
      role="region"
      aria-label={`${config.label}: ${callout.title}`}
    >
      {/* Callout Header */}
      <div
        className={`flex items-center justify-between px-3.5 py-2 select-none ${
          callout.isCollapsible ? 'cursor-pointer hover:opacity-90' : ''
        }`}
        onClick={
          callout.isCollapsible ? () => setIsCollapsed(!isCollapsed) : undefined
        }
      >
        <div className="flex items-center gap-2 font-semibold text-xs tracking-tight">
          <span className={config.iconColor}>{renderIcon()}</span>
          <span
            className={`${config.titleColorLight} ${config.titleColorDark} font-bold`}
          >
            {callout.title}
          </span>
          {callout.customTitle && (
            <span
              className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${config.badgeBgLight} ${config.badgeBgDark} text-stone-700 dark:text-stone-300`}
            >
              {config.label}
            </span>
          )}
        </div>

        {callout.isCollapsible && (
          <button
            type="button"
            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-md transition-colors"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand callout' : 'Collapse callout'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Callout Body Content */}
      {!isCollapsed && (
        <div className="px-3.5 pb-3 pt-0.5 text-xs text-stone-800 dark:text-stone-200 leading-relaxed border-t border-stone-200/40 dark:border-stone-800/40">
          {renderContent(callout.content)}
        </div>
      )}
    </div>
  );
};
