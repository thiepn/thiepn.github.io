import {
  Asset,
  AssetType,
  AssetStatus,
  AssetOwnership,
  AssetWarranty,
  MaintenanceDefinition,
  MaintenanceRecord,
  AssetPart,
  AssetLoan,
  AssetValuation,
  AssetTimelineEvent,
  MaintenanceDueStatus,
  AssetInventoryReportOptions,
} from './assetTypes';
import {
  loadAllAssets,
  saveAllAssets,
  loadAllWarranties,
  saveAllWarranties,
  loadAllMaintenanceDefs,
  saveAllMaintenanceDefs,
  loadAllMaintenanceRecords,
  saveAllMaintenanceRecords,
  loadAllParts,
  saveAllParts,
  loadAllLoans,
  saveAllLoans,
  loadAllValuations,
  saveAllValuations,
} from './assetStorage';

function generateId(prefix: string = 'asset'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// ASSET CORE MANAGEMENT
// ---------------------------------------------------------------------------

export function getAssets(): Asset[] {
  return loadAllAssets();
}

export function getAssetById(id: string): Asset | undefined {
  return loadAllAssets().find((a) => a.id === id);
}

export function createAsset(partial: Partial<Asset> & { name: string; type: AssetType }): Asset {
  const assets = loadAllAssets();
  const now = Date.now();
  const newAsset: Asset = {
    id: partial.id || generateId('asset'),
    name: partial.name.trim(),
    type: partial.type,
    status: partial.status || 'active',
    ownership: partial.ownership || 'owned',
    manufacturer: partial.manufacturer?.trim(),
    model: partial.model?.trim(),
    serialNumber: partial.serialNumber?.trim(),
    partNumber: partial.partNumber?.trim(),
    identifiers: partial.identifiers || (partial.serialNumber ? [{ id: generateId('id'), type: 'Serial Number', value: partial.serialNumber.trim(), isSensitive: true }] : []),
    acquiredAt: partial.acquiredAt || new Date().toISOString().slice(0, 10),
    purchasePrice: partial.purchasePrice,
    purchaseTransactionId: partial.purchaseTransactionId,
    seller: partial.seller?.trim(),
    receiptAttachmentId: partial.receiptAttachmentId,
    invoiceAttachmentId: partial.invoiceAttachmentId,
    placeId: partial.placeId,
    parentAssetId: partial.parentAssetId,
    accessoryAssetIds: partial.accessoryAssetIds || [],
    compatiblePartIds: partial.compatiblePartIds || [],
    noteId: partial.noteId,
    photoAttachmentId: partial.photoAttachmentId,
    manualAttachmentId: partial.manualAttachmentId,
    manualUrl: partial.manualUrl?.trim(),
    vehicleDetails: partial.vehicleDetails,
    tags: partial.tags || [],
    notes: partial.notes,
    createdAt: now,
    updatedAt: now,
  };

  assets.push(newAsset);
  saveAllAssets(assets);
  return newAsset;
}

export function updateAsset(id: string, updates: Partial<Asset>): Asset | undefined {
  const assets = loadAllAssets();
  const index = assets.findIndex((a) => a.id === id);
  if (index === -1) return undefined;

  const existing = assets[index];
  const updated: Asset = {
    ...existing,
    ...updates,
    id: existing.id, // Preserve immutable ID
    updatedAt: Date.now(),
  };

  assets[index] = updated;
  saveAllAssets(assets);
  return updated;
}

export function deleteAsset(id: string): boolean {
  const assets = loadAllAssets();
  const filtered = assets.filter((a) => a.id !== id);
  if (filtered.length === assets.length) return false;

  saveAllAssets(filtered);
  // Note: We deliberately do NOT cascade-delete external notes, receipts, or finance transactions!
  return true;
}

export function moveAssetLocation(id: string, placeId?: string): Asset | undefined {
  return updateAsset(id, { placeId });
}

export function changeAssetStatus(
  id: string,
  status: AssetStatus,
  disposalMetadata?: {
    disposalReason?: 'recycled' | 'discarded' | 'donated' | 'sold' | 'other';
    soldPrice?: any;
    soldToPersonId?: string;
    saleTransactionId?: string;
  }
): Asset | undefined {
  const updates: Partial<Asset> = {
    status,
    ...(disposalMetadata || {}),
    disposedAt: ['sold', 'disposed', 'archived'].includes(status)
      ? new Date().toISOString().slice(0, 10)
      : undefined,
  };
  return updateAsset(id, updates);
}

// ---------------------------------------------------------------------------
// DUPLICATE & SEARCH
// ---------------------------------------------------------------------------

export function findDuplicateSerialCandidates(serialNumber?: string, excludeAssetId?: string): Asset[] {
  if (!serialNumber || !serialNumber.trim()) return [];
  const cleanSerial = serialNumber.trim().toLowerCase();
  const assets = loadAllAssets();

  return assets.filter((a) => {
    if (a.id === excludeAssetId) return false;
    if (a.serialNumber && a.serialNumber.trim().toLowerCase() === cleanSerial) {
      return true;
    }
    return a.identifiers?.some(
      (ident) =>
        ident.type.toLowerCase().includes('serial') &&
        ident.value.trim().toLowerCase() === cleanSerial
    );
  });
}

export function searchAssets(query: string, searchSensitiveSerials: boolean = true): Asset[] {
  const q = query.trim().toLowerCase();
  if (!q) return loadAllAssets();

  const assets = loadAllAssets();
  return assets.filter((a) => {
    if (a.name.toLowerCase().includes(q)) return true;
    if (a.manufacturer?.toLowerCase().includes(q)) return true;
    if (a.model?.toLowerCase().includes(q)) return true;
    if (a.type.toLowerCase().includes(q)) return true;
    if (a.tags.some((t) => t.toLowerCase().includes(q))) return true;
    if (a.notes?.toLowerCase().includes(q)) return true;
    if (a.seller?.toLowerCase().includes(q)) return true;

    if (searchSensitiveSerials) {
      if (a.serialNumber?.toLowerCase().includes(q)) return true;
      if (a.partNumber?.toLowerCase().includes(q)) return true;
      if (a.identifiers?.some((id) => id.value.toLowerCase().includes(q))) return true;
      if (a.vehicleDetails?.vin?.toLowerCase().includes(q)) return true;
      if (a.vehicleDetails?.registrationPlate?.toLowerCase().includes(q)) return true;
    }

    return false;
  });
}

// ---------------------------------------------------------------------------
// WARRANTIES
// ---------------------------------------------------------------------------

export function getWarranties(): AssetWarranty[] {
  return loadAllWarranties();
}

export function getWarrantyForAsset(assetId: string): AssetWarranty | undefined {
  return loadAllWarranties().find((w) => w.assetId === assetId);
}

export function saveWarranty(partial: Partial<AssetWarranty> & { assetId: string; provider: string }): AssetWarranty {
  const warranties = loadAllWarranties();
  const now = Date.now();
  const existingIndex = warranties.findIndex((w) => w.assetId === partial.assetId || (partial.id && w.id === partial.id));

  let warranty: AssetWarranty;
  if (existingIndex >= 0) {
    warranty = {
      ...warranties[existingIndex],
      ...partial,
      updatedAt: now,
    };
    warranties[existingIndex] = warranty;
  } else {
    warranty = {
      id: partial.id || generateId('warranty'),
      assetId: partial.assetId,
      provider: partial.provider.trim(),
      startDate: partial.startDate,
      endDate: partial.endDate,
      durationMonths: partial.durationMonths,
      type: partial.type || 'manufacturer',
      documentAttachmentId: partial.documentAttachmentId,
      policyNumber: partial.policyNumber?.trim(),
      notes: partial.notes,
      claimHistoryNotes: partial.claimHistoryNotes,
      createdAt: now,
      updatedAt: now,
    };
    warranties.push(warranty);
  }

  saveAllWarranties(warranties);
  return warranty;
}

export function deleteWarranty(id: string): boolean {
  const warranties = loadAllWarranties();
  const filtered = warranties.filter((w) => w.id !== id);
  if (filtered.length === warranties.length) return false;
  saveAllWarranties(filtered);
  return true;
}

export function isWarrantyActive(warranty?: AssetWarranty): boolean {
  if (!warranty) return false;
  if (warranty.type === 'lifetime') return true;
  if (!warranty.endDate) return false;

  const today = new Date().toISOString().slice(0, 10);
  return warranty.endDate >= today;
}

export function getDaysUntilWarrantyExpiry(warranty?: AssetWarranty): number | null {
  if (!warranty || !warranty.endDate || warranty.type === 'lifetime') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(warranty.endDate);
  end.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// MAINTENANCE DEFINITIONS & DUE CALCULATIONS
// ---------------------------------------------------------------------------

export function getMaintenanceDefs(): MaintenanceDefinition[] {
  return loadAllMaintenanceDefs();
}

export function getMaintenanceDefsForAsset(assetId: string): MaintenanceDefinition[] {
  return loadAllMaintenanceDefs().filter((d) => d.assetId === assetId);
}

export function saveMaintenanceDef(
  partial: Partial<MaintenanceDefinition> & { assetId: string; title: string }
): MaintenanceDefinition {
  const defs = loadAllMaintenanceDefs();
  const now = Date.now();
  const existingIndex = defs.findIndex((d) => partial.id && d.id === partial.id);

  let def: MaintenanceDefinition;
  if (existingIndex >= 0) {
    def = {
      ...defs[existingIndex],
      ...partial,
      updatedAt: now,
    };
    defs[existingIndex] = def;
  } else {
    def = {
      id: partial.id || generateId('maint_def'),
      assetId: partial.assetId,
      title: partial.title.trim(),
      description: partial.description,
      recurrence: partial.recurrence,
      intervalMetric: partial.intervalMetric,
      status: partial.status || 'active',
      sourceNoteId: partial.sourceNoteId,
      manualReference: partial.manualReference,
      note: partial.note,
      createdAt: now,
      updatedAt: now,
    };
    defs.push(def);
  }

  saveAllMaintenanceDefs(defs);
  return def;
}

export function deleteMaintenanceDef(id: string): boolean {
  const defs = loadAllMaintenanceDefs();
  const filtered = defs.filter((d) => d.id !== id);
  if (filtered.length === defs.length) return false;
  saveAllMaintenanceDefs(filtered);
  return true;
}

// ---------------------------------------------------------------------------
// MAINTENANCE RECORDS
// ---------------------------------------------------------------------------

export function getMaintenanceRecords(): MaintenanceRecord[] {
  return loadAllMaintenanceRecords();
}

export function getMaintenanceRecordsForAsset(assetId: string): MaintenanceRecord[] {
  return loadAllMaintenanceRecords()
    .filter((r) => r.assetId === assetId)
    .sort((a, b) => (b.performedAt || '').localeCompare(a.performedAt || ''));
}

export function createMaintenanceRecord(
  partial: Partial<MaintenanceRecord> & { assetId: string; title: string; performedAt: string }
): MaintenanceRecord {
  const records = loadAllMaintenanceRecords();
  const now = Date.now();
  const record: MaintenanceRecord = {
    id: partial.id || generateId('maint_rec'),
    assetId: partial.assetId,
    definitionId: partial.definitionId,
    performedAt: partial.performedAt,
    title: partial.title.trim(),
    serviceType: partial.serviceType || 'routine',
    costAmount: partial.costAmount,
    costTransactionIds: partial.costTransactionIds || [],
    partIds: partial.partIds || [],
    attachmentIds: partial.attachmentIds || [],
    noteId: partial.noteId,
    notes: partial.notes,
    performedBy: partial.performedBy?.trim(),
    performedByPersonId: partial.performedByPersonId,
    odometerAtService: partial.odometerAtService,
    createdAt: now,
  };

  records.push(record);
  saveAllMaintenanceRecords(records);
  return record;
}

export function deleteMaintenanceRecord(id: string): boolean {
  const records = loadAllMaintenanceRecords();
  const filtered = records.filter((r) => r.id !== id);
  if (filtered.length === records.length) return false;
  saveAllMaintenanceRecords(filtered);
  return true;
}

// ---------------------------------------------------------------------------
// MAINTENANCE DUE STATUS CALCULATION
// ---------------------------------------------------------------------------

export function calculateMaintenanceDueStatuses(
  currentDateStr: string = new Date().toISOString().slice(0, 10)
): MaintenanceDueStatus[] {
  const assets = loadAllAssets();
  const defs = loadAllMaintenanceDefs().filter((d) => d.status === 'active');
  const records = loadAllMaintenanceRecords();
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  const today = new Date(currentDateStr);
  today.setHours(0, 0, 0, 0);

  const results: MaintenanceDueStatus[] = [];

  for (const def of defs) {
    const asset = assetMap.get(def.assetId);
    if (!asset || ['sold', 'disposed', 'archived'].includes(asset.status)) {
      continue;
    }

    // Find latest record for this definition (or asset if definitionId not bound)
    const assetRecords = records
      .filter((r) => r.assetId === def.assetId && (!r.definitionId || r.definitionId === def.id))
      .sort((a, b) => b.performedAt.localeCompare(a.performedAt));

    const latestRecord = assetRecords[0];
    const baseDateStr = latestRecord?.performedAt || asset.acquiredAt || new Date(def.createdAt).toISOString().slice(0, 10);

    let nextDueDate: string | undefined;
    let daysUntilDue: number | undefined;
    let isDue = false;
    let isOverdue = false;
    let dueReason = '';

    // 1. Time-based calculation
    if (def.recurrence) {
      const baseDate = new Date(baseDateStr);
      const nextDate = new Date(baseDate);

      const interval = def.recurrence.interval || 1;
      switch (def.recurrence.frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + interval);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + interval * 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + interval);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + interval);
          break;
        case 'custom_days':
          nextDate.setDate(nextDate.getDate() + interval);
          break;
      }

      nextDueDate = nextDate.toISOString().slice(0, 10);
      const diffMs = nextDate.getTime() - today.getTime();
      daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysUntilDue <= 0) {
        isDue = true;
        isOverdue = daysUntilDue < 0;
        dueReason = isOverdue
          ? `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'}`
          : 'Due today';
      } else if (daysUntilDue <= 14) {
        isDue = true;
        dueReason = `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
      } else {
        dueReason = `Scheduled for ${nextDueDate}`;
      }
    }

    // 2. Metric-based calculation (e.g. Odometer / Hours)
    if (def.intervalMetric && asset.vehicleDetails?.currentOdometer !== undefined) {
      const lastServiceOdometer = latestRecord?.odometerAtService || 0;
      const currentOdo = asset.vehicleDetails.currentOdometer;
      const odoDelta = currentOdo - lastServiceOdometer;

      if (odoDelta >= def.intervalMetric.threshold) {
        isDue = true;
        isOverdue = odoDelta > def.intervalMetric.threshold;
        dueReason = `Odometer threshold exceeded (${odoDelta} ${def.intervalMetric.unit} since last service, limit: ${def.intervalMetric.threshold})`;
      }
    }

    results.push({
      definition: def,
      asset,
      isDue,
      isOverdue,
      nextDueDate,
      daysUntilDue,
      lastPerformedDate: latestRecord?.performedAt,
      dueReason: dueReason || 'Active schedule',
    });
  }

  return results.sort((a, b) => (a.daysUntilDue ?? 999999) - (b.daysUntilDue ?? 999999));
}

// ---------------------------------------------------------------------------
// PARTS / CONSUMABLES
// ---------------------------------------------------------------------------

export function getParts(): AssetPart[] {
  return loadAllParts();
}

export function getPartsForAsset(assetId: string): AssetPart[] {
  return loadAllParts().filter((p) => p.compatibleAssetIds.includes(assetId));
}

export function savePart(partial: Partial<AssetPart> & { name: string }): AssetPart {
  const parts = loadAllParts();
  const now = Date.now();
  const existingIndex = parts.findIndex((p) => partial.id && p.id === partial.id);

  let part: AssetPart;
  if (existingIndex >= 0) {
    part = {
      ...parts[existingIndex],
      ...partial,
      updatedAt: now,
    };
    parts[existingIndex] = part;
  } else {
    part = {
      id: partial.id || generateId('part'),
      name: partial.name.trim(),
      manufacturer: partial.manufacturer?.trim(),
      modelNumber: partial.modelNumber?.trim(),
      compatibleAssetIds: partial.compatibleAssetIds || [],
      stockQuantity: partial.stockQuantity ?? 0,
      minStockThreshold: partial.minStockThreshold,
      reorderUrl: partial.reorderUrl?.trim(),
      note: partial.note,
      createdAt: now,
      updatedAt: now,
    };
    parts.push(part);
  }

  saveAllParts(parts);
  return part;
}

export function deletePart(id: string): boolean {
  const parts = loadAllParts();
  const filtered = parts.filter((p) => p.id !== id);
  if (filtered.length === parts.length) return false;
  saveAllParts(filtered);
  return true;
}

export function updatePartStock(id: string, delta: number): AssetPart | undefined {
  const parts = loadAllParts();
  const part = parts.find((p) => p.id === id);
  if (!part) return undefined;

  part.stockQuantity = Math.max(0, part.stockQuantity + delta);
  part.updatedAt = Date.now();
  saveAllParts(parts);
  return part;
}

// ---------------------------------------------------------------------------
// LOANS
// ---------------------------------------------------------------------------

export function getLoans(): AssetLoan[] {
  return loadAllLoans();
}

export function getLoansForAsset(assetId: string): AssetLoan[] {
  return loadAllLoans().filter((l) => l.assetId === assetId);
}

export function getActiveLoanForAsset(assetId: string): AssetLoan | undefined {
  return loadAllLoans().find((l) => l.assetId === assetId && !l.returnedAt);
}

export function getActiveLoansForPerson(personId: string): AssetLoan[] {
  return loadAllLoans().filter((l) => l.personId === personId && !l.returnedAt);
}

export function lendOrBorrowAsset(
  partial: Partial<AssetLoan> & { assetId: string; direction: 'lent' | 'borrowed'; startedAt: string }
): { loan: AssetLoan; conflict?: string } {
  const loans = loadAllLoans();
  const existingActive = loans.find((l) => l.assetId === partial.assetId && !l.returnedAt);
  let conflict: string | undefined;

  if (existingActive) {
    conflict = `Asset is already recorded as actively ${existingActive.direction} since ${existingActive.startedAt}.`;
  }

  const now = Date.now();
  const loan: AssetLoan = {
    id: partial.id || generateId('loan'),
    assetId: partial.assetId,
    personId: partial.personId,
    borrowerName: partial.borrowerName?.trim(),
    direction: partial.direction,
    startedAt: partial.startedAt,
    dueAt: partial.dueAt,
    returnedAt: partial.returnedAt,
    notes: partial.notes,
    createdAt: now,
    updatedAt: now,
  };

  loans.push(loan);
  saveAllLoans(loans);

  // Update asset status to 'loaned' if not already
  if (!loan.returnedAt) {
    updateAsset(loan.assetId, { status: 'loaned' });
  }

  return { loan, conflict };
}

export function returnLoanedAsset(loanId: string, returnedAt: string = new Date().toISOString().slice(0, 10)): AssetLoan | undefined {
  const loans = loadAllLoans();
  const loan = loans.find((l) => l.id === loanId);
  if (!loan) return undefined;

  loan.returnedAt = returnedAt;
  loan.updatedAt = Date.now();
  saveAllLoans(loans);

  // Restore asset status to active if no other active loans exist
  const remainingActive = loans.some((l) => l.assetId === loan.assetId && !l.returnedAt);
  if (!remainingActive) {
    updateAsset(loan.assetId, { status: 'active' });
  }

  return loan;
}

// ---------------------------------------------------------------------------
// TIMELINE & VALUATIONS
// ---------------------------------------------------------------------------

export function getAssetTimeline(assetId: string): AssetTimelineEvent[] {
  const asset = getAssetById(assetId);
  if (!asset) return [];

  const events: AssetTimelineEvent[] = [];

  // Acquired event
  if (asset.acquiredAt) {
    events.push({
      id: `${asset.id}_acquired`,
      assetId: asset.id,
      date: asset.acquiredAt,
      type: 'acquired',
      title: `Acquired ${asset.name}`,
      description: asset.seller ? `Purchased from ${asset.seller}` : undefined,
    });
  }

  // Warranty events
  const warranty = getWarrantyForAsset(asset.id);
  if (warranty) {
    if (warranty.startDate) {
      events.push({
        id: `${warranty.id}_start`,
        assetId: asset.id,
        date: warranty.startDate,
        type: 'acquired',
        title: `Warranty Started (${warranty.provider})`,
      });
    }
    if (warranty.endDate) {
      events.push({
        id: `${warranty.id}_end`,
        assetId: asset.id,
        date: warranty.endDate,
        type: 'warranty_expired',
        title: `Warranty Expiry (${warranty.provider})`,
      });
    }
  }

  // Maintenance records
  const maintenanceRecords = getMaintenanceRecordsForAsset(asset.id);
  for (const rec of maintenanceRecords) {
    events.push({
      id: rec.id,
      assetId: asset.id,
      date: rec.performedAt,
      type: rec.serviceType === 'repair' ? 'repair' : 'maintenance',
      title: rec.title,
      description: rec.notes,
      metadata: { cost: rec.costAmount, performedBy: rec.performedBy },
    });
  }

  // Loans
  const loans = getLoansForAsset(asset.id);
  for (const loan of loans) {
    events.push({
      id: `${loan.id}_start`,
      assetId: asset.id,
      date: loan.startedAt,
      type: 'loaned',
      title: `Item ${loan.direction === 'lent' ? 'lent out' : 'borrowed'}`,
      description: loan.notes,
    });
    if (loan.returnedAt) {
      events.push({
        id: `${loan.id}_return`,
        assetId: asset.id,
        date: loan.returnedAt,
        type: 'returned',
        title: `Item returned`,
      });
    }
  }

  // Disposal
  if (asset.disposedAt) {
    events.push({
      id: `${asset.id}_disposed`,
      assetId: asset.id,
      date: asset.disposedAt,
      type: asset.status === 'sold' ? 'sold' : 'disposed',
      title: asset.status === 'sold' ? 'Asset Sold' : `Asset Disposed (${asset.disposalReason || 'removed'})`,
    });
  }

  return events.sort((a, b) => b.date.localeCompare(a.date));
}

// ---------------------------------------------------------------------------
// QR CODE GENERATION & VALIDATION
// ---------------------------------------------------------------------------

export function generateAssetQRPayload(assetId: string): string {
  return `pkm://asset/${assetId}`;
}

export function parseAssetQRPayload(payload: string): { assetId?: string; isValid: boolean } {
  if (!payload || typeof payload !== 'string') return { isValid: false };
  const trimmed = payload.trim();
  if (trimmed.startsWith('pkm://asset/')) {
    const assetId = trimmed.slice('pkm://asset/'.length).trim();
    if (assetId.length > 0) {
      return { assetId, isValid: true };
    }
  }
  return { isValid: false };
}

// ---------------------------------------------------------------------------
// INVENTORY REPORTS (PRINT / CSV / JSON / MARKDOWN)
// ---------------------------------------------------------------------------

export function generateInventoryReport(options: AssetInventoryReportOptions): string {
  let assets = loadAllAssets();
  const warranties = loadAllWarranties();
  const warrantyMap = new Map(warranties.map((w) => [w.assetId, w]));

  if (options.filterStatus && options.filterStatus.length > 0) {
    assets = assets.filter((a) => options.filterStatus!.includes(a.status));
  }
  if (options.filterTypes && options.filterTypes.length > 0) {
    assets = assets.filter((a) => options.filterTypes!.includes(a.type));
  }
  if (options.filterPlaceId) {
    assets = assets.filter((a) => a.placeId === options.filterPlaceId);
  }

  if (options.format === 'json') {
    const sanitized = assets.map((a) => {
      const copy: any = { ...a };
      if (!options.includeSensitiveSerialNumbers) {
        delete copy.serialNumber;
        delete copy.identifiers;
        if (copy.vehicleDetails) {
          delete copy.vehicleDetails.vin;
          delete copy.vehicleDetails.registrationPlate;
        }
      }
      if (!options.includePurchasePrices) {
        delete copy.purchasePrice;
        delete copy.soldPrice;
      }
      if (!options.includeExactLocations) {
        delete copy.placeId;
      }
      return copy;
    });
    return JSON.stringify(sanitized, null, 2);
  }

  if (options.format === 'csv') {
    const headers = [
      'Name',
      'Type',
      'Status',
      'Manufacturer',
      'Model',
      ...(options.includeSensitiveSerialNumbers ? ['Serial Number'] : []),
      'Acquired Date',
      ...(options.includePurchasePrices ? ['Purchase Price'] : []),
      ...(options.includeExactLocations ? ['Place ID'] : []),
      'Warranty End Date',
    ];

    const rows = assets.map((a) => {
      const w = warrantyMap.get(a.id);
      const cols = [
        `"${(a.name || '').replace(/"/g, '""')}"`,
        `"${a.type}"`,
        `"${a.status}"`,
        `"${(a.manufacturer || '').replace(/"/g, '""')}"`,
        `"${(a.model || '').replace(/"/g, '""')}"`,
        ...(options.includeSensitiveSerialNumbers ? [`"${(a.serialNumber || '').replace(/"/g, '""')}"`] : []),
        `"${a.acquiredAt || ''}"`,
        ...(options.includePurchasePrices ? [`"${a.purchasePrice ? `${a.purchasePrice.currency || '$'}${a.purchasePrice.amount}` : ''}"`] : []),
        ...(options.includeExactLocations ? [`"${a.placeId || ''}"`] : []),
        `"${w?.endDate || ''}"`,
      ];
      return cols.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // Markdown format
  const dateStr = new Date().toLocaleDateString();
  let md = `# Personal Asset & Inventory Report\n\n`;
  md += `*Generated on: ${dateStr}*\n\n`;
  md += `> **Disclaimer:** This document is a user-generated inventory report for personal record-keeping and emergency organization. Recorded purchase prices and values do not constitute an official insurance appraisal or guaranteed market valuation.\n\n`;
  md += `Total Tracked Assets: **${assets.length}**\n\n`;

  md += `| Asset Name | Type | Status | Manufacturer / Model | ${options.includeSensitiveSerialNumbers ? 'Serial | ' : ''}Acquired | ${options.includePurchasePrices ? 'Price | ' : ''}Warranty |\n`;
  md += `|---|---|---|---|${options.includeSensitiveSerialNumbers ? '---|' : ''}---|${options.includePurchasePrices ? '---|' : ''}---|\n`;

  for (const a of assets) {
    const w = warrantyMap.get(a.id);
    const priceStr = a.purchasePrice ? `${a.purchasePrice.currency || '$'}${a.purchasePrice.amount.toLocaleString()}` : '—';
    const serialCol = options.includeSensitiveSerialNumbers ? `${a.serialNumber || '—'} | ` : '';
    const priceCol = options.includePurchasePrices ? `${priceStr} | ` : '';
    const mfgModel = [a.manufacturer, a.model].filter(Boolean).join(' ') || '—';
    const warrantyStr = w?.endDate ? `${w.endDate} (${isWarrantyActive(w) ? 'Active' : 'Expired'})` : '—';

    md += `| **${a.name}** | \`${a.type}\` | ${a.status} | ${mfgModel} | ${serialCol}${a.acquiredAt || '—'} | ${priceCol}${warrantyStr} |\n`;
  }

  return md;
}

// ---------------------------------------------------------------------------
// CSV / JSON IMPORT
// ---------------------------------------------------------------------------

export interface AssetImportPreviewItem {
  asset: Asset;
  hasDuplicateSerial: boolean;
  duplicateConflictName?: string;
}

export function parseAssetCSV(csvText: string): AssetImportPreviewItem[] {
  if (!csvText || typeof csvText !== 'string') return [];
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const existingAssets = loadAllAssets();
  const existingSerials = new Map<string, string>();
  existingAssets.forEach((a) => {
    if (a.serialNumber) existingSerials.set(a.serialNumber.trim().toLowerCase(), a.name);
  });

  const previewItems: AssetImportPreviewItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Basic CSV splitting handling quotes
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"' && (c === 0 || line[c - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim().replace(/^"|"$/g, ''));

    const name = parts[0] || `Imported Asset ${i}`;
    const type = (parts[1]?.toLowerCase() as AssetType) || 'other';
    const manufacturer = parts[3] || undefined;
    const model = parts[4] || undefined;
    const serialNumber = parts[5] || undefined;
    const acquiredAt = parts[6] || undefined;

    const serialClean = serialNumber?.trim().toLowerCase();
    const hasDuplicate = !!serialClean && existingSerials.has(serialClean);

    const asset: Asset = {
      id: generateId('asset_imp'),
      name,
      type,
      status: 'active',
      ownership: 'owned',
      manufacturer,
      model,
      serialNumber,
      identifiers: serialNumber ? [{ id: generateId('id'), type: 'Serial Number', value: serialNumber, isSensitive: true }] : [],
      acquiredAt,
      tags: ['imported'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    previewItems.push({
      asset,
      hasDuplicateSerial: hasDuplicate,
      duplicateConflictName: serialClean ? existingSerials.get(serialClean) : undefined,
    });
  }

  return previewItems;
}

export function getDueMaintenanceItems(): MaintenanceDueStatus[] {
  return calculateMaintenanceDueStatuses().filter((s) => s.isDue || s.isOverdue);
}

export const assetService = {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  moveAssetLocation,
  changeAssetStatus,
  findDuplicateSerialCandidates,
  searchAssets,
  getWarranties,
  getWarrantyForAsset,
  saveWarranty,
  deleteWarranty,
  isWarrantyActive,
  getDaysUntilWarrantyExpiry,
  getMaintenanceDefs,
  getMaintenanceDefsForAsset,
  saveMaintenanceDef,
  deleteMaintenanceDef,
  getMaintenanceRecords,
  getMaintenanceRecordsForAsset,
  createMaintenanceRecord,
  deleteMaintenanceRecord,
  calculateMaintenanceDueStatuses,
  getDueMaintenanceItems,
  getParts,
  getPartsForAsset,
  savePart,
  deletePart,
  updatePartStock,
  getLoans,
  getLoansForAsset,
  getActiveLoanForAsset,
  getActiveLoansForPerson,
  lendOrBorrowAsset,
  returnLoanedAsset,
  getAssetTimeline,
  generateAssetQRPayload,
  parseAssetQRPayload,
  generateInventoryReport,
  parseAssetCSV,
};

