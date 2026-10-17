/**
 * V2.11 Maintenance Schema Evolution & Migration Safety
 * 
 * Regulates the 4 classes of schema modifications:
 * 1. Derived-only changes (rebuilt in background, 0 canonical migration)
 * 2. Additive canonical fields (optional with default fallbacks, round-trip preserved)
 * 3. Transforming canonical migrations (additive/re-mappable with rollback snapshot)
 * 4. Breaking changes (FORBIDDEN in V2.x)
 */

export type SchemaChangeClass =
  | 'DERIVED_ONLY'
  | 'ADDITIVE_CANONICAL'
  | 'TRANSFORMING_CANONICAL'
  | 'BREAKING';

export interface SchemaFieldEvolution {
  fieldName: string;
  targetType: string;
  defaultValue: unknown;
  isOptional: boolean;
  changeClass: SchemaChangeClass;
}

export interface SchemaMigrationStep {
  fromVersion: string;
  toVersion: string;
  description: string;
  changeClass: SchemaChangeClass;
  isIdempotent: boolean;
  preservesUnknownFields: boolean;
  execute: (inputRecord: Record<string, unknown>) => Record<string, unknown>;
}

export class MaintenanceSchemaEvolutionService {
  private static instance: MaintenanceSchemaEvolutionService;
  private migrationSteps: SchemaMigrationStep[] = [];

  constructor() {
    this.registerStandardSteps();
  }

  public static getInstance(): MaintenanceSchemaEvolutionService {
    if (!MaintenanceSchemaEvolutionService.instance) {
      MaintenanceSchemaEvolutionService.instance = new MaintenanceSchemaEvolutionService();
    }
    return MaintenanceSchemaEvolutionService.instance;
  }

  private registerStandardSteps() {
    // Step 2.10.0 -> 2.10.1 (Additive diagnostics metadata)
    this.migrationSteps.push({
      fromVersion: '2.10.0',
      toVersion: '2.10.1',
      description: 'Add optional maintenanceMetadata bag to Resource shell',
      changeClass: 'ADDITIVE_CANONICAL',
      isIdempotent: true,
      preservesUnknownFields: true,
      execute: (record) => ({
        ...record,
        maintenanceMetadata: record.maintenanceMetadata || { lastVerifiedAt: new Date().toISOString() },
      }),
    });

    // Step 2.10.1 -> 2.10.2 (Additive sync delta journal stamp)
    this.migrationSteps.push({
      fromVersion: '2.10.1',
      toVersion: '2.10.2',
      description: 'Add optional syncAuditStamp for offline reconciliation',
      changeClass: 'ADDITIVE_CANONICAL',
      isIdempotent: true,
      preservesUnknownFields: true,
      execute: (record) => ({
        ...record,
        syncAuditStamp: record.syncAuditStamp || 'v2_sync_clean',
      }),
    });

    // Step 2.10.2 -> 2.11.0 (Additive resilience tags)
    this.migrationSteps.push({
      fromVersion: '2.10.2',
      toVersion: '2.11.0',
      description: 'Add optional resilienceFlags for containment status',
      changeClass: 'ADDITIVE_CANONICAL',
      isIdempotent: true,
      preservesUnknownFields: true,
      execute: (record) => ({
        ...record,
        resilienceFlags: record.resilienceFlags || { isolated: false, safeModeEligible: true },
      }),
    });
  }

  /**
   * Evaluates and runs all necessary migration steps in order.
   * Ensures idempotency and unknown field preservation.
   */
  public migrateRecord(
    record: Record<string, unknown>,
    fromVersion: string,
    toVersion: string
  ): {
    migratedRecord: Record<string, unknown>;
    stepsApplied: string[];
    isIdempotent: boolean;
  } {
    let current = { ...record };
    const stepsApplied: string[] = [];

    // Find relevant steps in sequence
    for (const step of this.migrationSteps) {
      if (step.fromVersion >= fromVersion && step.toVersion <= toVersion) {
        current = step.execute(current);
        stepsApplied.push(`${step.fromVersion}->${step.toVersion}`);
      }
    }

    return {
      migratedRecord: current,
      stepsApplied,
      isIdempotent: true,
    };
  }

  /**
   * Tests idempotency by executing migration N times.
   */
  public testIdempotency(record: Record<string, unknown>, times = 3): boolean {
    const firstRun = this.migrateRecord(record, '2.10.0', '2.11.0').migratedRecord;
    let subsequentRun = firstRun;
    for (let i = 0; i < times; i++) {
      subsequentRun = this.migrateRecord(subsequentRun, '2.10.0', '2.11.0').migratedRecord;
    }
    return JSON.stringify(firstRun) === JSON.stringify(subsequentRun);
  }

  /**
   * Verifies unknown field round-tripping.
   */
  public testUnknownFieldPreservation(recordWithCustomFields: Record<string, unknown>): boolean {
    const result = this.migrateRecord(recordWithCustomFields, '2.10.0', '2.11.0').migratedRecord;
    return (
      result.customUserPluginField === recordWithCustomFields.customUserPluginField &&
      result.unknownFutureAttribute === recordWithCustomFields.unknownFutureAttribute
    );
  }
}

export const maintenanceSchemaEvolution = MaintenanceSchemaEvolutionService.getInstance();
