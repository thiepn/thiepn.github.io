/**
 * Domain Types for Phase P53: Personal Finance, Budgeting, Accounts & Transactions
 */

import { Money } from './money';

export type AccountType =
  | 'checking'
  | 'savings'
  | 'cash'
  | 'credit'
  | 'loan'
  | 'investment'
  | 'asset'
  | 'liability'
  | 'wallet'
  | 'other';

export type AccountStatus = 'active' | 'closed' | 'archived';

export interface FinanceAccount {
  id: string;
  name: string;
  type: AccountType;
  currency: string; // ISO 4217 code (e.g. 'USD', 'EUR')
  institution?: string;
  accountNumberMasked?: string; // e.g. '•••• 4589'
  ibanMasked?: string;
  status: AccountStatus;
  openingBalance: Money; // Initial balance at opening date
  openingDate: string; // ISO YYYY-MM-DD
  color?: string; // Hex or color key
  icon?: string;
  noteId?: string; // Optional linked canonical PKM note
  notes?: string;
  excludeFromNetWorth?: boolean;
  excludeFromBudgets?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'refund'
  | 'fee'
  | 'adjustment';

export type TransactionStatus = 'pending' | 'cleared' | 'reconciled';

export interface TransactionSplit {
  id: string;
  categoryId?: string;
  amount: Money; // Always positive magnitude
  description?: string;
  tags?: string[];
  projectId?: string;
  areaId?: string;
  personId?: string;
}

export interface TransactionSource {
  type: 'manual' | 'import' | 'rule' | 'recurring';
  importBatchId?: string;
  rawRowId?: string;
  ruleId?: string;
  recurringPatternId?: string;
}

export interface FinanceTransaction {
  id: string;
  accountId: string;
  date: string; // ISO YYYY-MM-DD
  postingDate?: string; // ISO YYYY-MM-DD
  type: TransactionType;
  amount: Money; // Stored as positive magnitude; type specifies ledger flow
  payee?: string;
  rawDescription?: string; // Original bank import string
  description?: string; // User memo/notes
  categoryId?: string;
  splits?: TransactionSplit[]; // If present, sum of split amounts MUST equal transaction amount
  transferId?: string; // Paired ID linking both sides of an internal transfer
  transferAccountId?: string; // The other account involved in the transfer
  status: TransactionStatus;
  reconciliationId?: string; // Linked reconciliation session ID
  attachmentIds?: string[]; // P26 media attachments (receipt images, PDF invoices)
  noteId?: string; // Optional linked note
  projectId?: string; // Optional linked P49 Project
  areaId?: string; // Optional linked P49 Area
  personId?: string; // Optional linked P48 Person
  billId?: string; // Optional linked bill or subscription
  tags?: string[];
  source?: TransactionSource;
  createdAt: number;
  updatedAt: number;
}

export interface FinanceCategory {
  id: string;
  name: string;
  parentId?: string | null; // Supports category hierarchy (Parent > Child)
  color?: string;
  icon?: string;
  type: 'expense' | 'income' | 'both';
  isSystem?: boolean;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BudgetCategoryTarget {
  categoryId: string;
  targetAmount: Money;
  rollover?: boolean; // Whether unspent budget carries over into next period
  notes?: string;
}

export interface FinanceBudget {
  id: string;
  name: string;
  period: 'month' | 'year';
  periodKey: string; // e.g. '2026-09' for month or '2026' for year
  currency: string;
  targets: BudgetCategoryTarget[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'custom';

export interface FinanceRecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number; // e.g. every 2 months
  dayOfMonth?: number; // 1-31
  dayOfWeek?: number; // 0-6 (Sun-Sat)
  startDate: string; // ISO YYYY-MM-DD
  endDate?: string; // Optional termination date
}

export interface PriceHistoryEntry {
  effectiveDate: string; // ISO YYYY-MM-DD
  amount: Money;
  reason?: string;
}

export interface FinanceBill {
  id: string;
  name: string;
  type: 'bill' | 'subscription';
  payee?: string;
  amount?: Money; // Fixed, estimated or base amount
  isVariableAmount?: boolean;
  currency: string;
  categoryId?: string;
  accountId?: string;
  recurrence: FinanceRecurrenceRule;
  priceHistory?: PriceHistoryEntry[];
  status: 'active' | 'paused' | 'cancelled' | 'archived';
  cancellationDate?: string;
  autoRenew?: boolean;
  reminderDaysBefore?: number;
  url?: string;
  noteId?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FinanceReconciliation {
  id: string;
  accountId: string;
  statementDate: string; // ISO YYYY-MM-DD
  statementBalance: Money;
  calculatedBalance: Money;
  difference: Money; // statementBalance - calculatedBalance
  reconciledTransactionIds: string[];
  status: 'balanced' | 'discrepancy' | 'completed';
  notes?: string;
  attachmentIds?: string[];
  createdAt: number;
  completedAt?: number;
}

export interface RuleCondition {
  field: 'description' | 'rawDescription' | 'payee' | 'accountId' | 'amount' | 'type';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'matchesRegex' | 'greaterThan' | 'lessThan' | 'between';
  value: string | number | [number, number];
}

export interface RuleAction {
  type: 'setCategory' | 'setPayee' | 'addTags' | 'setType';
  value: string | string[];
}

export interface FinanceRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number; // Lower numbers run first
  matchAllConditions: boolean; // true = AND, false = OR
  conditions: RuleCondition[];
  actions: RuleAction[];
  applyToFutureOnly?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RecurringPatternSuggestion {
  id: string;
  payee: string;
  estimatedAmount: Money;
  frequency: RecurrenceFrequency;
  sampleTransactionIds: string[];
  lastDate: string;
  nextPredictedDate: string;
  matchedCategoryId?: string;
  matchedAccountId?: string;
}

export interface FinanceImportBatch {
  id: string;
  filename: string;
  fileFormat: 'csv' | 'ofx' | 'qfx' | 'qif';
  importedAt: number;
  targetAccountId: string;
  totalRows: number;
  importedCount: number;
  skippedDuplicateCount: number;
  transactionIds: string[];
}

export interface StagedTransactionRow {
  id: string;
  date: string;
  postingDate?: string;
  type: TransactionType;
  amount: Money;
  payee?: string;
  rawDescription: string;
  categoryId?: string;
  fitid?: string;
  referenceNumber?: string;
  isDuplicate: boolean;
  duplicateConfidence?: 'exact' | 'likely' | 'possible';
  duplicateReason?: string;
  existingMatchedTransactionId?: string;
  selected: boolean; // Whether the user chose to include this row in the final import
}

export interface AccountLedgerItem {
  transaction: FinanceTransaction;
  runningBalance: Money;
  signedAmount: Money; // Positive for inflow, negative for outflow
}

export interface CategorySpendingSummary {
  category: FinanceCategory;
  spent: Money; // Total expense minus refunds
  income: Money; // Total income
  transactionCount: number;
  percentageOfTotal: number;
  transactionIds: string[];
}

export interface BudgetPeriodProgress {
  category: FinanceCategory;
  targetAmount: Money;
  actualSpent: Money;
  variance: Money; // target - actual (positive = under budget, negative = over budget)
  percentUsed: number;
  transactionIds: string[];
  isOverBudget: boolean;
}

export interface CashFlowSummary {
  periodKey: string;
  currency: string;
  totalIncome: Money;
  totalExpenses: Money; // Net expenses (expenses minus refunds)
  netCashFlow: Money; // income - expenses
  savingsRatePercent: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
}

export interface TrackedNetWorth {
  currency: string;
  totalAssets: Money;
  totalLiabilities: Money;
  netWorth: Money; // assets - liabilities
  accountsCount: number;
  assetsByAccount: Array<{ account: FinanceAccount; balance: Money }>;
  liabilitiesByAccount: Array<{ account: FinanceAccount; balance: Money }>;
}

export interface FinanceFilterState {
  searchQuery: string;
  accountIds: string[];
  categoryIds: string[];
  types: TransactionType[];
  statuses: TransactionStatus[];
  startDate?: string;
  endDate?: string;
  minAmountMinor?: number;
  maxAmountMinor?: number;
  hasAttachment?: boolean;
  isUncategorized?: boolean;
  tag?: string;
  sortBy: 'date' | 'amount' | 'payee' | 'account' | 'category' | 'status';
  sortOrder: 'asc' | 'desc';
}

export const DEFAULT_FINANCE_FILTER: FinanceFilterState = {
  searchQuery: '',
  accountIds: [],
  categoryIds: [],
  types: [],
  statuses: [],
  sortBy: 'date',
  sortOrder: 'desc',
};
