import {
  Asset,
  AssetWarranty,
  MaintenanceDefinition,
  MaintenanceRecord,
  AssetPart,
  AssetLoan,
  AssetValuation,
} from './assetTypes';

const STORAGE_KEYS = {
  ASSETS: 'keepnotes_pkm_assets_v1',
  WARRANTIES: 'keepnotes_pkm_asset_warranties_v1',
  MAINTENANCE_DEFS: 'keepnotes_pkm_asset_maintenance_defs_v1',
  MAINTENANCE_RECORDS: 'keepnotes_pkm_asset_maintenance_records_v1',
  PARTS: 'keepnotes_pkm_asset_parts_v1',
  LOANS: 'keepnotes_pkm_asset_loans_v1',
  VALUATIONS: 'keepnotes_pkm_asset_valuations_v1',
};

type AssetEventListener = () => void;
const listeners = new Set<AssetEventListener>();

export function subscribeToAssetChanges(listener: AssetEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyAssetChange() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error notifying asset listener:', e);
    }
  });
}

function safeLoad<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load ${key} from localStorage:`, err);
    return defaultValue;
  }
}

function safeSave<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    notifyAssetChange();
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
}

// Assets Storage
export function loadAllAssets(): Asset[] {
  return safeLoad<Asset[]>(STORAGE_KEYS.ASSETS, []);
}

export function saveAllAssets(assets: Asset[]): void {
  safeSave(STORAGE_KEYS.ASSETS, assets);
}

// Warranties Storage
export function loadAllWarranties(): AssetWarranty[] {
  return safeLoad<AssetWarranty[]>(STORAGE_KEYS.WARRANTIES, []);
}

export function saveAllWarranties(warranties: AssetWarranty[]): void {
  safeSave(STORAGE_KEYS.WARRANTIES, warranties);
}

// Maintenance Definitions Storage
export function loadAllMaintenanceDefs(): MaintenanceDefinition[] {
  return safeLoad<MaintenanceDefinition[]>(STORAGE_KEYS.MAINTENANCE_DEFS, []);
}

export function saveAllMaintenanceDefs(defs: MaintenanceDefinition[]): void {
  safeSave(STORAGE_KEYS.MAINTENANCE_DEFS, defs);
}

// Maintenance Records Storage
export function loadAllMaintenanceRecords(): MaintenanceRecord[] {
  return safeLoad<MaintenanceRecord[]>(STORAGE_KEYS.MAINTENANCE_RECORDS, []);
}

export function saveAllMaintenanceRecords(records: MaintenanceRecord[]): void {
  safeSave(STORAGE_KEYS.MAINTENANCE_RECORDS, records);
}

// Parts Storage
export function loadAllParts(): AssetPart[] {
  return safeLoad<AssetPart[]>(STORAGE_KEYS.PARTS, []);
}

export function saveAllParts(parts: AssetPart[]): void {
  safeSave(STORAGE_KEYS.PARTS, parts);
}

// Loans Storage
export function loadAllLoans(): AssetLoan[] {
  return safeLoad<AssetLoan[]>(STORAGE_KEYS.LOANS, []);
}

export function saveAllLoans(loans: AssetLoan[]): void {
  safeSave(STORAGE_KEYS.LOANS, loans);
}

// Valuations Storage
export function loadAllValuations(): AssetValuation[] {
  return safeLoad<AssetValuation[]>(STORAGE_KEYS.VALUATIONS, []);
}

export function saveAllValuations(valuations: AssetValuation[]): void {
  safeSave(STORAGE_KEYS.VALUATIONS, valuations);
}

// Purge all asset-related data (e.g. for vault encryption lock)
export function purgeAssetStorage(): void {
  Object.values(STORAGE_KEYS).forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch (e) {
      console.error(`Failed to purge ${k}:`, e);
    }
  });
  notifyAssetChange();
}
