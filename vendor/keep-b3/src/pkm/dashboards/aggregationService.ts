/**
 * Centralized Aggregation & Knowledge Analytics Service for Phase P44
 * 
 * Executes deterministic data pipelines over canonical notes, properties,
 * Collections, Tasks, References, Temporal events, Review stats, and Vault metadata.
 * Always attaches exact source record IDs to enable 100% traceable drill-downs.
 */

import { Note, Folder } from '../../types';
import {
  DashboardDataSource,
  DashboardFilter,
  DashboardWidget,
  VisualizationDefinition,
  AggregatedDataPoint,
  AggregationResult,
  TableRowItem,
  ValueFormat,
} from './dashboardTypes';
import { executeSmartQuery } from '../queryEngine';
import { collectionService } from '../collections/collectionService';
import { parseFrontmatterAST, formatDateOnly } from '../properties/frontmatterEngine';
import { referenceStorageService } from '../reference/referenceStorageService';
import { reviewStorageService } from '../review/reviewStorageService';
import { vaultManager } from '../indexer';

export interface AggregationContext {
  allNotes: Note[];
  folders: Folder[];
  globalFilters?: DashboardFilter[];
}

export class AggregationService {
  private cache = new Map<string, { result: AggregationResult; timestamp: number }>();
  private cacheTTL = 3000; // 3 seconds TTL for rapid renders

  /**
   * Clears the entire derived aggregation cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Main aggregation dispatcher for any Dashboard widget
   */
  public async aggregateWidget(
    widget: DashboardWidget,
    ctx: AggregationContext
  ): Promise<AggregationResult> {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    try {
      // 1. Resolve source records
      const rawRecords = await this.resolveSourceRecords(widget.source, ctx);

      // 2. Apply combined filters (Global Filters + Widget-Specific Filters)
      const filteredRecords = this.applyFilters(
        rawRecords,
        widget.filters || [],
        ctx.globalFilters || []
      );

      // 3. Dispatch to widget-specific aggregation based on widget type
      let result: AggregationResult;

      switch (widget.type) {
        case 'metric':
          result = this.calculateMetric(widget, filteredRecords, startTime);
          break;

        case 'chart':
          result = this.calculateChart(widget, filteredRecords, startTime);
          break;

        case 'table':
          result = this.calculateTable(widget, filteredRecords, startTime);
          break;

        case 'list':
          result = this.calculateList(widget, filteredRecords, startTime);
          break;

        case 'text':
        case 'note_embed':
          result = {
            widgetId: widget.id,
            series: [],
            totalCount: 0,
            executionTimeMs: 0,
          };
          break;

        default:
          result = {
            widgetId: widget.id,
            series: [],
            totalCount: filteredRecords.length,
            executionTimeMs: 0,
            error: 'Unknown widget type',
          };
      }

      return result;
    } catch (err: any) {
      const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
      return {
        widgetId: widget.id,
        series: [],
        totalCount: 0,
        executionTimeMs: Math.round(elapsed),
        error: err?.message || 'Failed to calculate aggregation',
      };
    }
  }

  /**
   * Resolves raw records from the chosen data source
   */
  private async resolveSourceRecords(
    source: DashboardDataSource,
    ctx: AggregationContext
  ): Promise<any[]> {
    const activeNotes = ctx.allNotes.filter((n) => !n.trashed);

    switch (source.type) {
      case 'collection': {
        if (!source.collectionId) return [];
        const collection = collectionService.getCollectionById(source.collectionId);
        if (!collection) return [];
        const records = collectionService.getCollectionRecords(collection, ctx.allNotes, ctx.folders);
        return records.map((r) => ({
          id: r.note.id,
          title: r.note.title || 'Untitled',
          createdAt: r.note.createdAt,
          updatedAt: r.note.updatedAt,
          folderId: r.note.folderId,
          tags: r.note.tags || [],
          properties: { ...r.canonicalProperties, ...r.systemValues },
          derivedValues: r.derivedValues,
          rawNote: r.note,
        }));
      }

      case 'query': {
        if (!source.query) return [];
        const queryRes = executeSmartQuery(source.query, { notes: activeNotes, folders: ctx.folders });
        return queryRes.items.map((item) => this.extractGenericRecord(item.note));
      }

      case 'folder': {
        const matching = source.folderId
          ? activeNotes.filter((n) => n.folderId === source.folderId)
          : activeNotes.filter((n) => !n.folderId);
        return matching.map((n) => this.extractGenericRecord(n));
      }

      case 'tag': {
        if (!source.tag) return [];
        const targetTag = source.tag.replace(/^#/, '').toLowerCase().trim();
        const matching = activeNotes.filter((n) =>
          (n.tags || []).some((t) => t.replace(/^#/, '').toLowerCase().trim() === targetTag)
        );
        return matching.map((n) => this.extractGenericRecord(n));
      }

      case 'tasks': {
        const allTasks: any[] = [];
        const now = new Date();

        for (const note of activeNotes) {
          if (note.type === 'checklist' && Array.isArray(note.checklist)) {
            note.checklist.forEach((item) => {
              allTasks.push({
                id: item.id || `task-${note.id}-${Math.random().toString(36).slice(2, 6)}`,
                title: item.text || 'Untitled Task',
                completed: Boolean(item.completed),
                noteId: note.id,
                noteTitle: note.title,
                dueDate: note.reminderDate || null,
                isOverdue: !item.completed && note.reminderDate && new Date(note.reminderDate) < now,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
                tags: note.tags || [],
                folderId: note.folderId,
                rawNote: note,
              });
            });
          }

          // Also scan markdown checkboxes in content: - [ ] or - [x]
          const taskRegex = /(?:^|\n)\s*[-*+]\s+\[([ xX])\]\s+([^\n]+)/g;
          let match: RegExpExecArray | null;
          let idx = 0;
          while ((match = taskRegex.exec(note.content || '')) !== null) {
            const isDone = match[1].toLowerCase() === 'x';
            allTasks.push({
              id: `md-task-${note.id}-${idx++}`,
              title: match[2].trim(),
              completed: isDone,
              noteId: note.id,
              noteTitle: note.title,
              dueDate: note.reminderDate || null,
              isOverdue: !isDone && note.reminderDate && new Date(note.reminderDate) < now,
              createdAt: note.createdAt,
              updatedAt: note.updatedAt,
              tags: note.tags || [],
              folderId: note.folderId,
              rawNote: note,
            });
          }
        }

        if (source.taskFilter === 'open') return allTasks.filter((t) => !t.completed);
        if (source.taskFilter === 'completed') return allTasks.filter((t) => t.completed);
        if (source.taskFilter === 'overdue') return allTasks.filter((t) => t.isOverdue);
        return allTasks;
      }

      case 'references': {
        const refs = referenceStorageService.getAllReferences();
        if (source.referenceFilter === 'with_pdf') {
          return refs.filter((r) => r.pdfAttachmentIds && r.pdfAttachmentIds.length > 0);
        }
        if (source.referenceFilter === 'missing_pdf') {
          return refs.filter((r) => !r.pdfAttachmentIds || r.pdfAttachmentIds.length === 0);
        }
        return refs.map((r) => ({
          id: r.id,
          title: r.title || 'Untitled Reference',
          type: r.type,
          year: r.year,
          journal: r.journal || r.bookTitle || '',
          authors: (r.authors || [])
            .map((a) => `${a.given || ''} ${a.family || a.literal || ''}`.trim())
            .filter(Boolean)
            .join(', '),
          hasPdf: Boolean(r.pdfAttachmentIds && r.pdfAttachmentIds.length > 0),
          tags: r.tags || [],
          citationKey: r.citationKey,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          rawItem: r,
        }));
      }

      case 'review': {
        const statesMap = reviewStorageService.getAllCardStates();
        const cards = Array.from(statesMap.values());
        const history = reviewStorageService.getEventLogs();
        const now = Date.now();

        if (source.reviewMetric === 'due_cards') {
          return cards.filter(
            (c) => !c.suspended && (!c.due || new Date(c.due).getTime() <= now)
          );
        }
        if (source.reviewMetric === 'reviews_per_day') {
          return history.map((h) => ({
            id: h.id,
            title: `Review on ${formatDateOnly(h.timestamp)}`,
            reviewedAt: h.timestamp,
            rating: h.rating,
            cardId: h.cardId,
            durationMs: h.reviewDurationMs || 0,
          }));
        }
        return cards.map((c) => ({
          id: c.cardId,
          title: `Card ${c.cardId.slice(0, 8)}`,
          state: c.state,
          reps: c.reps,
          lapses: c.lapses,
          due: c.due,
          createdAt: c.lastReviewedAt || '',
        }));
      }

      case 'temporal': {
        // Collect timestamps from notes and modifications
        return activeNotes.map((n) => ({
          id: n.id,
          title: n.title,
          createdDate: n.createdAt,
          updatedDate: n.updatedAt,
          tags: n.tags || [],
          folderId: n.folderId,
          rawNote: n,
        }));
      }

      case 'vault_metadata': {
        const vaultIdx = vaultManager.getIndex();
        return activeNotes.map((n) => {
          const links = vaultIdx?.forwardLinks?.[n.id] || [];
          const backlinks = vaultIdx?.backlinks?.[n.id] || [];
          const isOrphan = links.length === 0 && backlinks.length === 0;
          const words = (n.content || '').trim().split(/\s+/).filter(Boolean).length;
          const bytes = (n.title || '').length + (n.content || '').length;

          return {
            id: n.id,
            title: n.title,
            words,
            bytes,
            isOrphan,
            attachmentCount: (n.images || []).length + (n.audios || []).length,
            backlinkCount: backlinks.length,
            forwardLinkCount: links.length,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
            tags: n.tags || [],
            folderId: n.folderId,
            rawNote: n,
          };
        });
      }

      default:
        return activeNotes.map((n) => this.extractGenericRecord(n));
    }
  }

  /**
   * Extracts generic canonical record properties from a Note
   */
  private extractGenericRecord(note: Note): any {
    const { ast } = parseFrontmatterAST(note.content || '');
    const props = ast.hasFrontmatter && !ast.hasSyntaxError ? ast.properties : {};

    return {
      id: note.id,
      title: note.title || 'Untitled',
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      folderId: note.folderId,
      tags: note.tags || [],
      properties: props,
      rawNote: note,
    };
  }

  /**
   * Applies combined global & widget filters to the records
   */
  private applyFilters(
    records: any[],
    widgetFilters: DashboardFilter[],
    globalFilters: DashboardFilter[]
  ): any[] {
    const allFilters = [...globalFilters, ...widgetFilters];
    if (allFilters.length === 0) return records;

    return records.filter((rec) => {
      for (const filter of allFilters) {
        if (!this.matchesFilter(rec, filter)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Matches a single record against a typed filter
   */
  private matchesFilter(record: any, filter: DashboardFilter): boolean {
    // 1. Date Range Filter
    if (filter.type === 'date_range' && filter.dateRange) {
      const recDateStr = record.createdAt || record.reviewedAt || record.date || record.updatedAt;
      if (!recDateStr) return false;
      const recDate = new Date(recDateStr).getTime();

      if (filter.dateRange.relativePreset && filter.dateRange.relativePreset !== 'all') {
        const bounds = this.getPresetDateBounds(filter.dateRange.relativePreset);
        if (recDate < bounds.start || recDate > bounds.end) return false;
      } else {
        if (filter.dateRange.start && recDate < new Date(filter.dateRange.start).getTime()) return false;
        if (filter.dateRange.end && recDate > new Date(filter.dateRange.end).getTime()) return false;
      }
      return true;
    }

    // 2. Tag Filter
    if (filter.type === 'tag' && filter.value) {
      const targetTag = String(filter.value).replace(/^#/, '').toLowerCase().trim();
      const tags: string[] = record.tags || [];
      return tags.some((t) => t.replace(/^#/, '').toLowerCase().trim() === targetTag);
    }

    // 3. Folder Filter
    if (filter.type === 'folder') {
      if (filter.value === null || filter.value === 'unorganized') {
        return !record.folderId;
      }
      return record.folderId === filter.value;
    }

    // 4. Property Value Filter
    if (filter.type === 'property' && filter.field) {
      const fieldVal = record.properties?.[filter.field] ?? record[filter.field];
      const targetVal = filter.value;

      switch (filter.operator) {
        case 'not_equals':
          return fieldVal != targetVal;
        case 'contains':
          return String(fieldVal || '').toLowerCase().includes(String(targetVal).toLowerCase());
        case 'greater_than':
          return Number(fieldVal) > Number(targetVal);
        case 'less_than':
          return Number(fieldVal) < Number(targetVal);
        case 'equals':
        default:
          return String(fieldVal || '').toLowerCase() === String(targetVal).toLowerCase();
      }
    }

    return true;
  }

  /**
   * Resolves timestamps for relative date filter presets
   */
  private getPresetDateBounds(preset: string): { start: number; end: number } {
    const now = new Date();
    const end = now.getTime();

    switch (preset) {
      case 'today': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return { start, end };
      }
      case 'last_7_days': {
        const start = now.getTime() - 7 * 86400000;
        return { start, end };
      }
      case 'last_30_days': {
        const start = now.getTime() - 30 * 86400000;
        return { start, end };
      }
      case 'this_month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return { start, end };
      }
      case 'last_month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
        const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime();
        return { start, end: monthEnd };
      }
      case 'this_year': {
        const start = new Date(now.getFullYear(), 0, 1).getTime();
        return { start, end };
      }
      case 'last_year': {
        const start = new Date(now.getFullYear() - 1, 0, 1).getTime();
        const yearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).getTime();
        return { start, end: yearEnd };
      }
      default:
        return { start: 0, end: now.getTime() + 86400000 };
    }
  }

  /**
   * Calculates a single KPI / Metric card value
   */
  private calculateMetric(
    widget: DashboardWidget,
    records: any[],
    startTime: number
  ): AggregationResult {
    const vis = widget.visualization;
    const aggType = vis.metricAggregation || 'count';
    const measureField = vis.measureField;
    const itemIds = records.map((r) => r.id || r.noteId).filter(Boolean);

    let calculatedValue = 0;

    switch (aggType) {
      case 'count':
        calculatedValue = records.length;
        break;

      case 'sum':
        if (measureField) {
          calculatedValue = records.reduce((sum, r) => {
            const val = Number(r.properties?.[measureField] ?? r[measureField] ?? 0);
            return sum + (isNaN(val) ? 0 : val);
          }, 0);
        } else {
          calculatedValue = records.length;
        }
        break;

      case 'average':
        if (measureField && records.length > 0) {
          const total = records.reduce((sum, r) => {
            const val = Number(r.properties?.[measureField] ?? r[measureField] ?? 0);
            return sum + (isNaN(val) ? 0 : val);
          }, 0);
          calculatedValue = total / records.length;
        } else {
          calculatedValue = 0;
        }
        break;

      case 'min':
        if (measureField && records.length > 0) {
          const numbers = records
            .map((r) => Number(r.properties?.[measureField] ?? r[measureField]))
            .filter((n) => !isNaN(n));
          calculatedValue = numbers.length > 0 ? Math.min(...numbers) : 0;
        }
        break;

      case 'max':
        if (measureField && records.length > 0) {
          const numbers = records
            .map((r) => Number(r.properties?.[measureField] ?? r[measureField]))
            .filter((n) => !isNaN(n));
          calculatedValue = numbers.length > 0 ? Math.max(...numbers) : 0;
        }
        break;

      case 'count_distinct':
        if (measureField) {
          const distinctValues = new Set();
          records.forEach((r) => {
            const val = r.properties?.[measureField] ?? r[measureField];
            if (val !== undefined && val !== null && val !== '') {
              distinctValues.add(val);
            }
          });
          calculatedValue = distinctValues.size;
        }
        break;

      case 'ratio': {
        const numeratorCount = measureField
          ? records.filter((r) => Boolean(r.properties?.[measureField] ?? r[measureField])).length
          : records.length;
        const denominatorCount = vis.denominatorMeasureField
          ? records.filter((r) => Boolean(r.properties?.[vis.denominatorMeasureField!] ?? r[vis.denominatorMeasureField!])).length
          : records.length;

        // Zero denominator safety: returns 0 (never NaN or Infinity)
        calculatedValue = denominatorCount > 0 ? (numeratorCount / denominatorCount) * 100 : 0;
        break;
      }
    }

    const formatted = this.formatValue(
      calculatedValue,
      vis.format || (aggType === 'ratio' ? 'percentage' : 'number'),
      vis.decimalPlaces,
      vis.currencyCode
    );

    const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

    return {
      widgetId: widget.id,
      metricValue: calculatedValue,
      formattedMetric: formatted,
      series: [
        {
          label: widget.title,
          key: 'metric',
          value: calculatedValue,
          formattedValue: formatted,
          sourceItemIds: itemIds,
        },
      ],
      totalCount: records.length,
      executionTimeMs: Math.round(elapsed),
    };
  }

  /**
   * Calculates grouped data series for Bar, Line, Area, Donut, and Histogram charts
   */
  private calculateChart(
    widget: DashboardWidget,
    records: any[],
    startTime: number
  ): AggregationResult {
    const vis = widget.visualization;
    const groupBy = vis.groupByField || 'status';
    const measure = vis.measureField;
    const isTemporal = vis.chartType === 'line' || vis.chartType === 'area' || vis.dateBucket;

    // Grouping Map: key -> { label, value, sourceItemIds }
    const groupMap = new Map<string, { label: string; value: number; sourceItemIds: string[] }>();

    for (const record of records) {
      const recId = record.id || record.noteId;

      // Determine grouping key
      let keys: string[] = [];

      if (isTemporal) {
        const dateStr = record.createdAt || record.reviewedAt || record.date || record.updatedAt;
        const bucket = this.formatDateBucket(dateStr, vis.dateBucket || 'month');
        keys = [bucket];
      } else if (groupBy === 'tag' || groupBy === 'tags') {
        const tags: string[] = Array.isArray(record.tags) && record.tags.length > 0 ? record.tags : ['untagged'];
        keys = tags.map((t) => t.replace(/^#/, ''));
      } else if (groupBy === 'folder') {
        keys = [record.folderName || record.folderId || 'No Folder'];
      } else {
        const rawVal = record.properties?.[groupBy] ?? record[groupBy];
        if (Array.isArray(rawVal)) {
          keys = rawVal.length > 0 ? rawVal.map(String) : ['No value'];
        } else if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          keys = [String(rawVal)];
        } else {
          keys = ['No value'];
        }
      }

      // Value to aggregate
      const valToAdd = measure
        ? Number(record.properties?.[measure] ?? record[measure] ?? 0)
        : 1;
      const safeVal = isNaN(valToAdd) ? 0 : valToAdd;

      for (const key of keys) {
        if (!groupMap.has(key)) {
          groupMap.set(key, { label: key, value: 0, sourceItemIds: [] });
        }
        const item = groupMap.get(key)!;
        item.value += safeVal;
        if (recId) item.sourceItemIds.push(recId);
      }
    }

    // Fill missing empty temporal buckets for smooth lines
    if (isTemporal && vis.fillEmptyBuckets && groupMap.size > 1) {
      this.fillMissingDateBuckets(groupMap, vis.dateBucket || 'month');
    }

    // Convert map to array
    let dataPoints: AggregatedDataPoint[] = Array.from(groupMap.entries()).map(([k, v]) => ({
      key: k,
      label: v.label,
      value: v.value,
      formattedValue: this.formatValue(v.value, vis.format || 'number', vis.decimalPlaces, vis.currencyCode),
      sourceItemIds: v.sourceItemIds,
    }));

    // Sort series
    if (isTemporal) {
      dataPoints.sort((a, b) => a.key.localeCompare(b.key));
    } else if (vis.sortBy === 'value_asc') {
      dataPoints.sort((a, b) => a.value - b.value);
    } else if (vis.sortBy === 'label_asc') {
      dataPoints.sort((a, b) => a.label.localeCompare(b.label));
    } else if (vis.sortBy === 'label_desc') {
      dataPoints.sort((a, b) => b.label.localeCompare(a.label));
    } else {
      // Default: value_desc
      dataPoints.sort((a, b) => b.value - a.value);
    }

    // Handle Top N and "Other" grouping
    if (vis.limit && vis.limit > 0 && dataPoints.length > vis.limit) {
      const topItems = dataPoints.slice(0, vis.limit);
      const otherItems = dataPoints.slice(vis.limit);

      if (vis.showOther) {
        const otherValue = otherItems.reduce((acc, curr) => acc + curr.value, 0);
        const otherSourceIds = otherItems.flatMap((i) => i.sourceItemIds);
        topItems.push({
          key: '__other__',
          label: 'Other',
          value: otherValue,
          formattedValue: this.formatValue(otherValue, vis.format || 'number', vis.decimalPlaces, vis.currencyCode),
          sourceItemIds: otherSourceIds,
        });
      }
      dataPoints = topItems;
    }

    // Calculate percentage shares
    const totalSum = dataPoints.reduce((acc, curr) => acc + curr.value, 0);
    dataPoints.forEach((dp) => {
      dp.percentage = totalSum > 0 ? Math.round((dp.value / totalSum) * 1000) / 10 : 0;
    });

    const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

    return {
      widgetId: widget.id,
      series: dataPoints,
      totalCount: records.length,
      executionTimeMs: Math.round(elapsed),
    };
  }

  /**
   * Calculates query-driven table records
   */
  private calculateTable(
    widget: DashboardWidget,
    records: any[],
    startTime: number
  ): AggregationResult {
    const tableRows: TableRowItem[] = records.map((rec) => ({
      id: rec.id || rec.noteId,
      title: rec.title || 'Untitled',
      subtitle: rec.citationKey || rec.state || rec.folderName || '',
      value: rec.properties?.[widget.visualization.measureField || ''] !== undefined
        ? String(rec.properties[widget.visualization.measureField!])
        : rec.dueDate ? `Due ${formatDateOnly(rec.dueDate)}` : undefined,
      date: rec.createdAt ? formatDateOnly(rec.createdAt) : undefined,
      tags: rec.tags || [],
      rawItem: rec.rawNote || rec.rawItem || rec,
    }));

    const limit = widget.visualization.limit || 50;
    const paged = tableRows.slice(0, limit);
    const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

    return {
      widgetId: widget.id,
      series: [],
      tableRows: paged,
      totalCount: records.length,
      executionTimeMs: Math.round(elapsed),
    };
  }

  /**
   * Calculates ranked list items
   */
  private calculateList(
    widget: DashboardWidget,
    records: any[],
    startTime: number
  ): AggregationResult {
    return this.calculateTable(widget, records, startTime);
  }

  /**
   * Formats a date string into chronological buckets (day, week, month, quarter, year)
   */
  private formatDateBucket(dateStr: string | undefined, bucket: string): string {
    if (!dateStr) return 'Unknown Date';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Unknown Date';

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    switch (bucket) {
      case 'day':
        return `${y}-${m}-${day}`;
      case 'week': {
        const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `${y}-W${String(weekNum).padStart(2, '0')}`;
      }
      case 'quarter': {
        const q = Math.floor(d.getMonth() / 3) + 1;
        return `${y}-Q${q}`;
      }
      case 'year':
        return `${y}`;
      case 'month':
      default:
        return `${y}-${m}`;
    }
  }

  /**
   * Fills empty dates between first and last date buckets for uninterrupted line charts
   */
  private fillMissingDateBuckets(
    map: Map<string, { label: string; value: number; sourceItemIds: string[] }>,
    bucket: string
  ): void {
    if (bucket !== 'month') return;
    const keys = Array.from(map.keys()).filter((k) => /^\d{4}-\d{2}$/.test(k)).sort();
    if (keys.length < 2) return;

    const [firstY, firstM] = keys[0].split('-').map(Number);
    const [lastY, lastM] = keys[keys.length - 1].split('-').map(Number);

    let curY = firstY;
    let curM = firstM;

    while (curY < lastY || (curY === lastY && curM <= lastM)) {
      const k = `${curY}-${String(curM).padStart(2, '0')}`;
      if (!map.has(k)) {
        map.set(k, { label: k, value: 0, sourceItemIds: [] });
      }
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
  }

  /**
   * Central value formatting utility with type safety
   */
  public formatValue(
    val: number,
    format: ValueFormat = 'number',
    decimals?: number,
    currencyCode = 'USD'
  ): string {
    if (isNaN(val) || !isFinite(val)) return '—';

    const d = decimals !== undefined ? decimals : (format === 'percentage' || format === 'currency' ? 1 : 0);

    switch (format) {
      case 'integer':
        return Math.round(val).toLocaleString();

      case 'percentage':
        return `${val.toFixed(d)}%`;

      case 'currency': {
        const sym = currencyCode === 'EUR' ? '€' : currencyCode === 'GBP' ? '£' : '$';
        return `${sym}${val.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;
      }

      case 'bytes': {
        if (val < 1024) return `${val} B`;
        if (val < 1048576) return `${(val / 1024).toFixed(1)} KB`;
        if (val < 1073741824) return `${(val / 1048576).toFixed(1)} MB`;
        return `${(val / 1073741824).toFixed(1)} GB`;
      }

      case 'number':
      default:
        return val.toLocaleString(undefined, {
          minimumFractionDigits: d,
          maximumFractionDigits: d,
        });
    }
  }
}

export const aggregationService = new AggregationService();
