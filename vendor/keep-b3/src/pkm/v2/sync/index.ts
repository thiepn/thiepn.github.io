/**
 * PKM V2.5 — Cross-Device Sync, Offline Continuity & Local-First Resilience
 *
 * Public entry point for sync engine, conflict center, device management,
 * attachments, continuity handoff, and diagnostic systems.
 */

export * from './syncTypes';
export * from './syncEngineV2';
export * from './conflicts/conflictCenterV2';
export * from './devices/deviceManagerV2';
export * from './attachments/attachmentSyncEngineV2';
export * from './continuity/crossDeviceContinuityV2';
export * from './diagnostics/syncDiagnosticsV2';
export * from './transport/syncTransport';
export * from './transport/gitTransportAdapter';
export * from './transport/filesystemTransportAdapter';
export * from './transport/p2pTransportAdapter';
