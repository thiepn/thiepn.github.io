/**
 * Phase P41: Sandboxed Plugin Workspace View Component
 * Embeds custom plugin HTML in a secure iframe with theme tokens & RPC handling.
 */

import React, { useEffect, useRef } from 'react';
import { X, RefreshCw, Layout } from 'lucide-react';
import { InstalledPlugin } from '../types';
import { generateHardenedPluginHtml } from '../sandbox/pluginIframeSandbox';
import { capabilityDispatcherRef } from '../registry/pluginRegistryHelper';

interface PluginWorkspaceViewProps {
  plugin: InstalledPlugin;
  viewId: string;
  theme?: 'dark' | 'light';
  onClose: () => void;
}

export const PluginWorkspaceView: React.FC<PluginWorkspaceViewProps> = ({
  plugin,
  viewId,
  theme = 'dark',
  onClose,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const viewContribution = plugin.manifest.contributions?.views?.find((v) => v.id === viewId) || {
    id: viewId,
    title: plugin.manifest.name,
  };

  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.protocol !== 'pkm-plugin/1' || data.pluginId !== plugin.manifest.id) return;

      if (data.type === 'escape_focus') {
        // Focus escape requested via Escape key
        iframeRef.current?.blur();
      } else if (data.type === 'iframe_rpc_call') {
        let result: any;
        let errorMsg: string | undefined;

        try {
          const dispatcher = capabilityDispatcherRef.current;
          if (dispatcher) {
            result = await dispatcher.dispatch(
              plugin.manifest.id,
              plugin.grantedPermissions,
              data.method,
              data.params
            );
          } else {
            errorMsg = 'Dispatcher not initialized';
          }
        } catch (err: any) {
          errorMsg = err.message || 'RPC error';
        }

        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            {
              protocol: 'pkm-plugin/1',
              type: 'iframe_rpc_response',
              id: data.id,
              result,
              error: errorMsg,
            },
            '*'
          );
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [plugin]);

  const rawHtml = plugin.uiHtml || '<div style="padding: 16px;">No UI HTML provided by plugin.</div>';
  const effectiveTheme: 'dark' | 'light' = theme === 'light' ? 'light' : 'dark';
  const hardenedSrcDoc = generateHardenedPluginHtml({
    pluginId: plugin.manifest.id,
    manifest: plugin.manifest,
    grantedPermissions: plugin.grantedPermissions,
    htmlContent: rawHtml,
    theme: effectiveTheme,
    onRpcRequest: async () => ({}),
    onLog: () => {},
  });

  const handleReload = () => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = hardenedSrcDoc;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Title Bar */}
      <div className="h-10 px-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-zinc-200">{viewContribution.title}</span>
          <span className="text-[10px] text-zinc-500 font-mono">({plugin.manifest.id})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReload}
            title="Reload View"
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close View"
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sandboxed Iframe Surface */}
      <div className="flex-1 w-full h-full relative">
        <iframe
          ref={iframeRef}
          title={`${viewContribution.title} - ${plugin.manifest.name}`}
          sandbox="allow-scripts"
          srcDoc={hardenedSrcDoc}
          className="w-full h-full border-none bg-zinc-900"
        />
      </div>
    </div>
  );
};
