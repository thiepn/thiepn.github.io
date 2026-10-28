export interface MoneyReference {
  amount: number;
  currency: string;
}

export type AssetType =
  | 'device'
  | 'computer'
  | 'phone'
  | 'tablet'
  | 'appliance'
  | 'tool'
  | 'instrument'
  | 'vehicle'
  | 'bicycle'
  | 'furniture'
  | 'equipment'
  | 'document'
  | 'other';

export type AssetStatus =
  | 'active'
  | 'stored'
  | 'loaned'
  | 'repair'
  | 'sold'
  | 'disposed'
  | 'lost'
  | 'archived';

export type AssetOwnership =
  | 'owned'
  | 'borrowed'
  | 'leased'
  | 'rented'
  | 'shared'
  | 'other';

export interface AssetIdentifier {
  id: string;
  type: string; // e.g., 'Serial Number', 'IMEI', 'VIN', 'MAC Address', 'Service Tag', 'Part Number', 'Frame Number', 'SKU'
  value: string;
  isSensitive?: boolean;
}

export interface VehicleDetails {
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  registrationPlate?: string;
  fuelType?: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'plugin_hybrid' | 'lpg' | 'human_powered' | 'other';
  odometerTrackerId?: string; // P50 tracker reference
  currentOdometer?: number;
  odometerUnit?: 'km' | 'mi';
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  ownership: AssetOwnership;

  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  partNumber?: string;
  identifiers: AssetIdentifier[];

  // Purchase & Acquisition
  acquiredAt?: string; // YYYY-MM-DD
  purchasePrice?: MoneyReference;
  purchaseTransactionId?: string; // P53 Finance transaction
  seller?: string;
  receiptAttachmentId?: string; // P26 Attachment/Media
  invoiceAttachmentId?: string;

  // Spatial & Hierarchy
  placeId?: string; // P55 Place / Room location
  parentAssetId?: string; // Parent component/device
  accessoryAssetIds?: string[];
  compatiblePartIds?: string[];

  // Documentation & Canon
  noteId?: string; // Canonical Markdown note
  photoAttachmentId?: string; // Primary asset photo
  manualAttachmentId?: string; // User manual document / PDF
  manualUrl?: string;

  // Specialization
  vehicleDetails?: VehicleDetails;

  // Disposal / Sale
  disposedAt?: string;
  disposalReason?: 'recycled' | 'discarded' | 'donated' | 'sold' | 'other';
  soldPrice?: MoneyReference;
  soldToPersonId?: string; // P48 Person
  saleTransactionId?: string; // P53 Finance transaction

  tags: string[];
  notes?: string;

  createdAt: number;
  updatedAt: number;
}

export interface AssetWarranty {
  id: string;
  assetId: string;
  provider: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  durationMonths?: number;
  type: 'manufacturer' | 'extended' | 'store' | 'lifetime' | 'other';
  documentAttachmentId?: string;
  policyNumber?: string;
  notes?: string;
  claimHistoryNotes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MaintenanceRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom_days';
  interval: number; // e.g. every 6 months -> frequency: 'monthly', interval: 6
}

export interface MaintenanceIntervalMetric {
  type: 'distance' | 'usage-count' | 'hours';
  threshold: number; // e.g. every 15000 km or 100 hours
  unit: string;
  trackerId?: string; // P50 tracker id
}

export interface MaintenanceDefinition {
  id: string;
  assetId: string;
  title: string;
  description?: string;
  recurrence?: MaintenanceRecurrence;
  intervalMetric?: MaintenanceIntervalMetric;
  status: 'active' | 'paused' | 'archived';
  sourceNoteId?: string;
  manualReference?: string; // e.g. "User Manual p. 42"
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  definitionId?: string; // Optional link to definition
  performedAt: string; // YYYY-MM-DD
  title: string;
  serviceType: 'routine' | 'inspection' | 'cleaning' | 'repair' | 'replacement' | 'upgrade' | 'other';
  costAmount?: MoneyReference;
  costTransactionIds?: string[]; // P53 Finance transaction
  partIds?: string[];
  attachmentIds?: string[]; // P26 Receipts, invoices, checklists
  noteId?: string;
  notes?: string;
  performedBy?: string; // Person/Shop name or self
  performedByPersonId?: string; // P48 Person
  odometerAtService?: number;
  createdAt: number;
}

export interface AssetPart {
  id: string;
  name: string;
  manufacturer?: string;
  modelNumber?: string;
  compatibleAssetIds: string[];
  stockQuantity: number;
  minStockThreshold?: number;
  reorderUrl?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AssetLoan {
  id: string;
  assetId: string;
  personId?: string; // P48 Person
  borrowerName?: string; // Text fallback if Person not in CRM
  direction: 'lent' | 'borrowed';
  startedAt: string; // YYYY-MM-DD
  dueAt?: string; // YYYY-MM-DD
  returnedAt?: string; // YYYY-MM-DD
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AssetValuation {
  id: string;
  assetId: string;
  date: string; // YYYY-MM-DD
  value: MoneyReference;
  source: 'manual' | 'document' | 'purchase_derived';
  notes?: string;
  createdAt: number;
}

export interface AssetTimelineEvent {
  id: string;
  assetId: string;
  date: string;
  type:
    | 'acquired'
    | 'moved'
    | 'loaned'
    | 'returned'
    | 'maintenance'
    | 'repair'
    | 'warranty_claim'
    | 'warranty_expired'
    | 'sold'
    | 'disposed'
    | 'status_change'
    | 'valuation';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface MaintenanceDueStatus {
  definition: MaintenanceDefinition;
  asset: Asset;
  isDue: boolean;
  isOverdue: boolean;
  nextDueDate?: string;
  daysUntilDue?: number;
  lastPerformedDate?: string;
  dueReason: string;
}

export interface AssetInventoryReportOptions {
  includeSensitiveSerialNumbers: boolean;
  includePurchasePrices: boolean;
  includeExactLocations: boolean;
  includeReceiptsNotes: boolean;
  filterTypes?: AssetType[];
  filterStatus?: AssetStatus[];
  filterPlaceId?: string;
  format: 'markdown' | 'csv' | 'json' | 'html';
}
