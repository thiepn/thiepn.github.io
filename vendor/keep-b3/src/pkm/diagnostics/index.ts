// Preserve navigation's BrokenLinkItem as the canonical root PKM export.
// Diagnostics has a distinct shape with the same name; alias it explicitly.
export { vaultHealthService } from './vaultHealthService';
export type {
  BrokenLinkItem as VaultHealthBrokenLinkItem,
  OrphanNoteItem,
  VaultHealthReport,
} from './vaultHealthService';
export * from './VaultHealthDoctorModal';
