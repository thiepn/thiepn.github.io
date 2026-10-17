import React, { useState } from 'react';
import {
  DashboardWidget,
  DashboardWidgetType,
  DashboardChartType,
  MetricAggregationType,
  WidgetSize,
  ValueFormat,
  DateBucketUnit,
} from '../dashboardTypes';
import { Collection } from '../../collections/collectionTypes';
import { Folder } from '../../../types';
import { X, Check, BarChart2, Hash, Table, List, Type, Palette } from 'lucide-react';

interface WidgetConfigModalProps {
  isOpen: boolean;
  widget: DashboardWidget | null;
  collections: Collection[];
  folders: Folder[];
  onClose: () => void;
  onSave: (widget: DashboardWidget) => void;
}

export const WidgetConfigModal: React.FC<WidgetConfigModalProps> = ({
  isOpen,
  widget,
  collections,
  folders,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<DashboardWidgetType>(widget?.type || 'metric');
  const [title, setTitle] = useState(widget?.title || 'New Widget');
  const [description, setDescription] = useState(widget?.description || '');
  const [size, setSize] = useState<WidgetSize>(widget?.size || 'medium');
  const [sourceType, setSourceType] = useState(widget?.source.type || 'vault_metadata');
  const [collectionId, setCollectionId] = useState(widget?.source.collectionId || (collections[0]?.id || ''));
  const [query, setQuery] = useState(widget?.source.query || '');
  const [folderId, setFolderId] = useState<string | null>(widget?.source.folderId ?? null);
  const [tag, setTag] = useState(widget?.source.tag || '');
  const [taskFilter, setTaskFilter] = useState<'all' | 'open' | 'completed' | 'overdue'>(widget?.source.taskFilter || 'open');
  const [referenceFilter, setReferenceFilter] = useState<'all' | 'with_pdf' | 'missing_pdf'>(widget?.source.referenceFilter || 'all');
  const [activityType, setActivityType] = useState<'created' | 'edited' | 'tasks_completed' | 'captures'>(widget?.source.activityType || 'created');

  // Visualization
  const [chartType, setChartType] = useState<DashboardChartType>(widget?.visualization.chartType || 'bar');
  const [metricAggregation, setMetricAggregation] = useState<MetricAggregationType>(widget?.visualization.metricAggregation || 'count');
  const [groupByField, setGroupByField] = useState(widget?.visualization.groupByField || 'folder');
  const [dateBucket, setDateBucket] = useState<DateBucketUnit>(widget?.visualization.dateBucket || 'month');
  const [measureField, setMeasureField] = useState(widget?.visualization.measureField || '');
  const [format, setFormat] = useState<ValueFormat>(widget?.visualization.format || 'integer');
  const [currencyCode, setCurrencyCode] = useState(widget?.visualization.currencyCode || 'USD');
  const [colorPalette, setColorPalette] = useState<'amber' | 'indigo' | 'emerald' | 'rose' | 'teal' | 'purple'>(
    widget?.visualization.colorPalette || 'amber'
  );
  const [limit, setLimit] = useState(widget?.visualization.limit || 8);
  const [showOther, setShowOther] = useState(widget?.visualization.showOther ?? true);
  const [textContent, setTextContent] = useState(widget?.textContent || '');

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: DashboardWidget = {
      id: widget?.id || `widget-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      title: title.trim() || 'Untitled Widget',
      description: description.trim() || undefined,
      size,
      source: {
        type: sourceType as any,
        collectionId: sourceType === 'collection' ? collectionId : undefined,
        query: sourceType === 'query' ? query : undefined,
        folderId: sourceType === 'folder' ? folderId : undefined,
        tag: sourceType === 'tag' ? tag : undefined,
        taskFilter: sourceType === 'tasks' ? taskFilter : undefined,
        referenceFilter: sourceType === 'references' ? referenceFilter : undefined,
        activityType: sourceType === 'temporal' ? activityType : undefined,
      },
      visualization: {
        chartType: type === 'chart' ? chartType : undefined,
        metricAggregation: type === 'metric' ? metricAggregation : undefined,
        groupByField: type === 'chart' ? groupByField : undefined,
        dateBucket: type === 'chart' ? dateBucket : undefined,
        measureField: measureField.trim() || undefined,
        format,
        currencyCode: format === 'currency' ? currencyCode : undefined,
        colorPalette,
        limit: limit > 0 ? limit : undefined,
        showOther,
      },
      textContent: type === 'text' ? textContent : undefined,
    };

    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            {widget ? 'Configure Widget' : 'Add New Widget'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* 1. Widget Type Selector */}
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-semibold mb-2">
              Widget Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { t: 'metric', label: 'Metric', icon: Hash },
                { t: 'chart', label: 'Chart', icon: BarChart2 },
                { t: 'table', label: 'Table', icon: Table },
                { t: 'list', label: 'List', icon: List },
                { t: 'text', label: 'Text Note', icon: Type },
              ].map(({ t, label, icon: Icon }) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t as any);
                    if (t === 'metric' && size !== 'small') setSize('small');
                    if (t === 'chart' && size === 'small') setSize('medium');
                  }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                    type === t
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-semibold ring-2 ring-amber-500/20'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. General Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Widget Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Active Projects Count"
                className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Widget Size (Span)
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as WidgetSize)}
                className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="small">Small (3 of 12 columns)</option>
                <option value="medium">Medium (6 of 12 columns)</option>
                <option value="large">Large (8 of 12 columns)</option>
                <option value="full">Full Width (12 of 12 columns)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Count of projects currently in Planning or Active state"
              className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* 3. Static Text Widget Option */}
          {type === 'text' && (
            <div>
              <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1">
                Markdown / Note Content
              </label>
              <textarea
                rows={4}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Write instructions, context, or dashboard goals..."
                className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono text-xs"
              />
            </div>
          )}

          {/* 4. Data Source Configuration (For data-backed widgets) */}
          {type !== 'text' && (
            <div className="p-4 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200/80 dark:border-stone-800 space-y-4">
              <h4 className="font-semibold text-stone-800 dark:text-stone-200">Data Source</h4>

              <div>
                <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                  Source System
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="vault_metadata">Vault Metadata & Telemetry (Notes, Storage, Links)</option>
                  <option value="tasks">Tasks & Checklists</option>
                  <option value="references">References & Citations (Literature)</option>
                  <option value="temporal">Temporal Velocity (Created / Edited by Date)</option>
                  <option value="collection">Structured Collection</option>
                  <option value="folder">Specific Folder</option>
                  <option value="tag">Specific Tag</option>
                  <option value="query">Structured Query AST</option>
                </select>
              </div>

              {sourceType === 'collection' && (
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                    Select Collection
                  </label>
                  <select
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                  >
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sourceType === 'tasks' && (
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                    Task Filter Scope
                  </label>
                  <select
                    value={taskFilter}
                    onChange={(e) => setTaskFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                  >
                    <option value="open">Open (Uncompleted) Tasks</option>
                    <option value="overdue">Overdue Tasks</option>
                    <option value="completed">Completed Tasks</option>
                    <option value="all">All Tasks</option>
                  </select>
                </div>
              )}

              {sourceType === 'folder' && (
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                    Folder
                  </label>
                  <select
                    value={folderId || ''}
                    onChange={(e) => setFolderId(e.target.value || null)}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                  >
                    <option value="">Root / Unorganized Notes</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sourceType === 'tag' && (
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="e.g. project or literature"
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                  />
                </div>
              )}

              {sourceType === 'query' && (
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                    Query Expression
                  </label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder='e.g. tag:project status:active'
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 font-mono text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {/* 5. Visualization & Aggregation Settings */}
          {type !== 'text' && (
            <div className="p-4 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200/80 dark:border-stone-800 space-y-4">
              <h4 className="font-semibold text-stone-800 dark:text-stone-200">
                Visualization & Calculation
              </h4>

              {type === 'chart' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                      Chart Presentation
                    </label>
                    <select
                      value={chartType}
                      onChange={(e) => setChartType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                    >
                      <option value="bar">Vertical Bar Chart</option>
                      <option value="horizontal_bar">Horizontal Bar Chart</option>
                      <option value="line">Temporal Line Chart</option>
                      <option value="area">Area Volume Chart</option>
                      <option value="donut">Donut Distribution</option>
                      <option value="pie">Pie Chart</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                      Group By Dimension
                    </label>
                    <select
                      value={groupByField}
                      onChange={(e) => setGroupByField(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                    >
                      <option value="folder">Folder</option>
                      <option value="tag">Tags</option>
                      <option value="status">Status Property</option>
                      <option value="type">Type / Format</option>
                      <option value="year">Year</option>
                    </select>
                  </div>
                </div>
              )}

              {type === 'metric' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                      Calculation Method
                    </label>
                    <select
                      value={metricAggregation}
                      onChange={(e) => setMetricAggregation(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                    >
                      <option value="count">Count Records</option>
                      <option value="sum">Sum Numeric Property</option>
                      <option value="average">Average Numeric Property</option>
                      <option value="min">Minimum Value</option>
                      <option value="max">Maximum Value</option>
                      <option value="count_distinct">Count Distinct</option>
                      <option value="ratio">Ratio / Percentage</option>
                    </select>
                  </div>

                  {(metricAggregation === 'sum' ||
                    metricAggregation === 'average' ||
                    metricAggregation === 'min' ||
                    metricAggregation === 'max') && (
                    <div>
                      <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                        Measure Property
                      </label>
                      <input
                        type="text"
                        value={measureField}
                        onChange={(e) => setMeasureField(e.target.value)}
                        placeholder="e.g. budget, words, bytes"
                        className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Format and Palette */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                    Value Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                  >
                    <option value="integer">Integer (1,234)</option>
                    <option value="number">Decimal (1,234.5)</option>
                    <option value="percentage">Percentage (42.5%)</option>
                    <option value="currency">Currency ($1,234)</option>
                    <option value="bytes">Storage Bytes (12.4 MB)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-600 dark:text-stone-400 font-medium mb-1">
                    Color Accent Palette
                  </label>
                  <select
                    value={colorPalette}
                    onChange={(e) => setColorPalette(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                  >
                    <option value="amber">Warm Amber</option>
                    <option value="indigo">Classic Indigo</option>
                    <option value="emerald">Vibrant Emerald</option>
                    <option value="rose">Soft Rose</option>
                    <option value="teal">Clean Teal</option>
                    <option value="purple">Royal Purple</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 dark:bg-stone-800/40 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg shadow-xs transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Save Widget</span>
          </button>
        </div>
      </div>
    </div>
  );
};
