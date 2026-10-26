/**
 * Finance Storage Engine for Phase P53
 * 
 * Manages local persistence for accounts, transactions, categories, budgets,
 * bills, reconciliations, rules, and import batches.
 * Integrates with vault encryption lock-state.
 */

import {
  FinanceAccount,
  FinanceTransaction,
  FinanceCategory,
  FinanceBudget,
  FinanceBill,
  FinanceReconciliation,
  FinanceRule,
  FinanceImportBatch,
} from './financeTypes';
import { createMoney } from './money';

const STORAGE_KEYS = {
  ACCOUNTS: 'pkm_finance_accounts_v1',
  TRANSACTIONS: 'pkm_finance_transactions_v1',
  CATEGORIES: 'pkm_finance_categories_v1',
  BUDGETS: 'pkm_finance_budgets_v1',
  BILLS: 'pkm_finance_bills_v1',
  RECONCILIATIONS: 'pkm_finance_reconciliations_v1',
  RULES: 'pkm_finance_rules_v1',
  IMPORT_BATCHES: 'pkm_finance_import_batches_v1',
};

export const DEFAULT_SYSTEM_CATEGORIES: Array<Omit<FinanceCategory, 'createdAt' | 'updatedAt'>> = [
  // Expense Categories
  { id: 'cat-housing', name: 'Housing & Rent', type: 'expense', color: '#6366f1', isSystem: true, description: 'Rent, mortgage, property tax, maintenance' },
  { id: 'cat-utilities', name: 'Utilities', type: 'expense', color: '#3b82f6', isSystem: true, description: 'Electricity, water, gas, internet, trash' },
  { id: 'cat-groceries', name: 'Groceries & Food', type: 'expense', color: '#10b981', isSystem: true, description: 'Supermarket, produce, household staples' },
  { id: 'cat-dining', name: 'Dining & Restaurants', type: 'expense', color: '#f59e0b', isSystem: true, description: 'Restaurants, takeout, coffee shops' },
  { id: 'cat-transport', name: 'Transportation', type: 'expense', color: '#8b5cf6', isSystem: true, description: 'Public transit, fuel, car maintenance, parking, rideshare' },
  { id: 'cat-health', name: 'Health & Medical', type: 'expense', color: '#ec4899', isSystem: true, description: 'Doctor visits, pharmacy, dental, vision, insurance' },
  { id: 'cat-subscriptions', name: 'Subscriptions & Software', type: 'expense', color: '#06b6d4', isSystem: true, description: 'Streaming services, SaaS, cloud storage, memberships' },
  { id: 'cat-entertainment', name: 'Entertainment & Leisure', type: 'expense', color: '#f43f5e', isSystem: true, description: 'Movies, concerts, gaming, hobbies' },
  { id: 'cat-education', name: 'Education & Books', type: 'expense', color: '#14b8a6', isSystem: true, description: 'Courses, textbooks, tuition, workshops' },
  { id: 'cat-shopping', name: 'Shopping & Gear', type: 'expense', color: '#a855f7', isSystem: true, description: 'Clothing, electronics, home goods' },
  { id: 'cat-personal', name: 'Personal Care', type: 'expense', color: '#f97316', isSystem: true, description: 'Haircut, cosmetics, wellness' },
  { id: 'cat-fees', name: 'Bank Fees & Interest', type: 'expense', color: '#64748b', isSystem: true, description: 'Account fees, wire fees, credit interest' },
  { id: 'cat-gifts', name: 'Gifts & Donations', type: 'expense', color: '#d946ef', isSystem: true, description: 'Charity, birthday gifts, holiday presents' },

  // Income Categories
  { id: 'cat-salary', name: 'Salary & Wages', type: 'income', color: '#22c55e', isSystem: true, description: 'Primary employment earnings' },
  { id: 'cat-freelance', name: 'Freelance & Consulting', type: 'income', color: '#16a34a', isSystem: true, description: 'Contract work, consulting fees, side gigs' },
  { id: 'cat-investments', name: 'Investment Income', type: 'income', color: '#059669', isSystem: true, description: 'Dividends, interest, capital gains' },
  { id: 'cat-other-income', name: 'Other Income', type: 'income', color: '#84cc16', isSystem: true, description: 'Gifts received, sales of old items, reimbursements' },
];

export interface FinanceDataSnapshot {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  budgets: FinanceBudget[];
  bills: FinanceBill[];
  reconciliations: FinanceReconciliation[];
  rules: FinanceRule[];
  importBatches: FinanceImportBatch[];
}

export class FinanceStorageService {
  private inMemoryCache: FinanceDataSnapshot | null = null;
  private isLocked = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.ensureDefaultCategories();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error in finance storage subscriber:', err);
      }
    });
  }

  public setLockState(locked: boolean) {
    this.isLocked = locked;
    if (locked) {
      this.inMemoryCache = null;
    }
    this.notify();
  }

  private ensureDefaultCategories() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const raw = window.localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (!raw) {
        const now = Date.now();
        const initialCategories: FinanceCategory[] = DEFAULT_SYSTEM_CATEGORIES.map((c) => ({
          ...c,
          createdAt: now,
          updatedAt: now,
        }));
        window.localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(initialCategories));
      }
    } catch (err) {
      console.warn('Failed to initialize default finance categories:', err);
    }
  }

  public loadSnapshot(): FinanceDataSnapshot {
    if (this.isLocked) {
      return {
        accounts: [],
        transactions: [],
        categories: [],
        budgets: [],
        bills: [],
        reconciliations: [],
        rules: [],
        importBatches: [],
      };
    }

    if (this.inMemoryCache) {
      return this.inMemoryCache;
    }

    try {
      const accounts = this.safeGet<FinanceAccount[]>(STORAGE_KEYS.ACCOUNTS, []);
      const transactions = this.safeGet<FinanceTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
      let categories = this.safeGet<FinanceCategory[]>(STORAGE_KEYS.CATEGORIES, []);

      if (categories.length === 0) {
        const now = Date.now();
        categories = DEFAULT_SYSTEM_CATEGORIES.map((c) => ({
          ...c,
          createdAt: now,
          updatedAt: now,
        }));
      }

      const budgets = this.safeGet<FinanceBudget[]>(STORAGE_KEYS.BUDGETS, []);
      const bills = this.safeGet<FinanceBill[]>(STORAGE_KEYS.BILLS, []);
      const reconciliations = this.safeGet<FinanceReconciliation[]>(STORAGE_KEYS.RECONCILIATIONS, []);
      const rules = this.safeGet<FinanceRule[]>(STORAGE_KEYS.RULES, []);
      const importBatches = this.safeGet<FinanceImportBatch[]>(STORAGE_KEYS.IMPORT_BATCHES, []);

      this.inMemoryCache = {
        accounts,
        transactions,
        categories,
        budgets,
        bills,
        reconciliations,
        rules,
        importBatches,
      };

      return this.inMemoryCache;
    } catch (err) {
      console.error('Error loading finance snapshot:', err);
      return {
        accounts: [],
        transactions: [],
        categories: [],
        budgets: [],
        bills: [],
        reconciliations: [],
        rules: [],
        importBatches: [],
      };
    }
  }

  public saveSnapshot(snapshot: FinanceDataSnapshot) {
    if (this.isLocked) return;

    try {
      this.safeSet(STORAGE_KEYS.ACCOUNTS, snapshot.accounts);
      this.safeSet(STORAGE_KEYS.TRANSACTIONS, snapshot.transactions);
      this.safeSet(STORAGE_KEYS.CATEGORIES, snapshot.categories);
      this.safeSet(STORAGE_KEYS.BUDGETS, snapshot.budgets);
      this.safeSet(STORAGE_KEYS.BILLS, snapshot.bills);
      this.safeSet(STORAGE_KEYS.RECONCILIATIONS, snapshot.reconciliations);
      this.safeSet(STORAGE_KEYS.RULES, snapshot.rules);
      this.safeSet(STORAGE_KEYS.IMPORT_BATCHES, snapshot.importBatches);

      this.inMemoryCache = { ...snapshot };
      this.notify();
    } catch (err) {
      console.error('Failed to save finance snapshot:', err);
    }
  }

  public getAccounts(): FinanceAccount[] {
    return this.loadSnapshot().accounts;
  }

  public saveAccounts(accounts: FinanceAccount[]) {
    const snapshot = this.loadSnapshot();
    snapshot.accounts = accounts;
    this.saveSnapshot(snapshot);
  }

  public getTransactions(): FinanceTransaction[] {
    return this.loadSnapshot().transactions;
  }

  public saveTransactions(transactions: FinanceTransaction[]) {
    const snapshot = this.loadSnapshot();
    snapshot.transactions = transactions;
    this.saveSnapshot(snapshot);
  }

  public getCategories(): FinanceCategory[] {
    return this.loadSnapshot().categories;
  }

  public saveCategories(categories: FinanceCategory[]) {
    const snapshot = this.loadSnapshot();
    snapshot.categories = categories;
    this.saveSnapshot(snapshot);
  }

  public getBudgets(): FinanceBudget[] {
    return this.loadSnapshot().budgets;
  }

  public saveBudgets(budgets: FinanceBudget[]) {
    const snapshot = this.loadSnapshot();
    snapshot.budgets = budgets;
    this.saveSnapshot(snapshot);
  }

  public getBills(): FinanceBill[] {
    return this.loadSnapshot().bills;
  }

  public saveBills(bills: FinanceBill[]) {
    const snapshot = this.loadSnapshot();
    snapshot.bills = bills;
    this.saveSnapshot(snapshot);
  }

  public getReconciliations(): FinanceReconciliation[] {
    return this.loadSnapshot().reconciliations;
  }

  public saveReconciliations(reconciliations: FinanceReconciliation[]) {
    const snapshot = this.loadSnapshot();
    snapshot.reconciliations = reconciliations;
    this.saveSnapshot(snapshot);
  }

  public getRules(): FinanceRule[] {
    return this.loadSnapshot().rules;
  }

  public saveRules(rules: FinanceRule[]) {
    const snapshot = this.loadSnapshot();
    snapshot.rules = rules;
    this.saveSnapshot(snapshot);
  }

  public getImportBatches(): FinanceImportBatch[] {
    return this.loadSnapshot().importBatches;
  }

  public saveImportBatches(batches: FinanceImportBatch[]) {
    const snapshot = this.loadSnapshot();
    snapshot.importBatches = batches;
    this.saveSnapshot(snapshot);
  }

  private safeGet<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined' || !window.localStorage) return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  private safeSet<T>(key: string, value: T) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Failed to write key ${key} to localStorage:`, err);
    }
  }
}

export const financeStorage = new FinanceStorageService();
