/**
 * Main Finance Domain Service for Phase P53
 * 
 * Provides deterministic calculations for:
 * - Ledger & Account Balances (Asset vs Liability math)
 * - Atomic Multi-Leg Transfers
 * - Split Transactions
 * - Budget Tracking & Period Rolling
 * - Bills & Subscriptions Recurrence
 * - Recurring Pattern Detection
 * - Reconciliation Sessions
 * - Rule-Based Categorization
 * - Net Worth Tracking & Cash Flow
 */

import {
  FinanceAccount,
  FinanceTransaction,
  FinanceCategory,
  FinanceBudget,
  FinanceBill,
  FinanceReconciliation,
  FinanceRule,
  AccountLedgerItem,
  CategorySpendingSummary,
  BudgetPeriodProgress,
  CashFlowSummary,
  TrackedNetWorth,
  RecurringPatternSuggestion,
  FinanceFilterState,
  DEFAULT_FINANCE_FILTER,
  TransactionType,
} from './financeTypes';
import {
  Money,
  createMoney,
  addMoney,
  subtractMoney,
  sumMoney,
  absMoney,
  negateMoney,
  DEFAULT_CURRENCY,
  compareMoney,
} from './money';
import { financeStorage } from './financeStorage';

export class FinanceService {
  /**
   * ==========================================
   * 1. ACCOUNTS & BALANCES
   * ==========================================
   */

  public getAccounts(): FinanceAccount[] {
    return financeStorage.getAccounts();
  }

  public getAccountById(id: string): FinanceAccount | undefined {
    return this.getAccounts().find((a) => a.id === id);
  }

  public createAccount(data: Omit<FinanceAccount, 'id' | 'createdAt' | 'updatedAt'>): FinanceAccount {
    const now = Date.now();
    const newAccount: FinanceAccount = {
      ...data,
      id: `acc-${now}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    const accounts = [...this.getAccounts(), newAccount];
    financeStorage.saveAccounts(accounts);
    return newAccount;
  }

  public updateAccount(id: string, updates: Partial<FinanceAccount>): FinanceAccount | null {
    const accounts = this.getAccounts();
    const index = accounts.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const updated: FinanceAccount = {
      ...accounts[index],
      ...updates,
      updatedAt: Date.now(),
    };
    accounts[index] = updated;
    financeStorage.saveAccounts(accounts);
    return updated;
  }

  public deleteAccount(id: string, deleteAssociatedTransactions = false): boolean {
    const accounts = this.getAccounts().filter((a) => a.id !== id);
    financeStorage.saveAccounts(accounts);

    if (deleteAssociatedTransactions) {
      const transactions = this.getTransactions().filter(
        (t) => t.accountId !== id && t.transferAccountId !== id
      );
      financeStorage.saveTransactions(transactions);
    }
    return true;
  }

  /**
   * Calculates the current balance of an account.
   * Asset accounts (checking, savings, cash, investment, asset, wallet):
   *   Balance = Opening + Income + Inflow Transfers + Refunds - Expenses - Outflow Transfers - Fees - Adjustments
   * Liability accounts (credit, loan, liability):
   *   Balance (Debt) = Opening + Expenses + Outflow Transfers + Fees - Payments(Inflow Transfers/Income) - Refunds
   */
  public calculateAccountBalance(
    accountId: string,
    options: { upToDate?: string; includePending?: boolean; clearedOnly?: boolean } = {}
  ): Money {
    const account = this.getAccountById(accountId);
    if (!account) return createMoney(0, DEFAULT_CURRENCY);

    const currency = account.currency || DEFAULT_CURRENCY;
    let balanceMinor = account.openingBalance ? account.openingBalance.amountMinor : 0;

    const isLiability = ['credit', 'loan', 'liability'].includes(account.type);

    const allTx = this.getTransactionsForAccount(accountId);

    for (const tx of allTx) {
      if (options.upToDate && tx.date > options.upToDate) continue;
      if (options.clearedOnly && tx.status === 'pending') continue;
      if (options.includePending === false && tx.status === 'pending') continue;

      const txMinor = tx.amount.amountMinor;

      if (!isLiability) {
        // ASSET ACCOUNT MATH
        switch (tx.type) {
          case 'income':
          case 'refund':
            balanceMinor += txMinor;
            break;
          case 'expense':
          case 'fee':
            balanceMinor -= txMinor;
            break;
          case 'transfer':
            // If transferAccountId is set:
            // Check if this transaction is the inflow or outflow leg
            if (tx.transferAccountId && tx.description?.includes('Transfer from')) {
              balanceMinor += txMinor;
            } else if (tx.transferAccountId && tx.description?.includes('Transfer to')) {
              balanceMinor -= txMinor;
            } else {
              // Default heuristic: If amount was created as positive inflow vs outflow
              balanceMinor -= txMinor;
            }
            break;
          case 'adjustment':
            // Stored magnitude with sign
            balanceMinor += txMinor;
            break;
        }
      } else {
        // LIABILITY ACCOUNT MATH (Tracks Debt balance owed)
        switch (tx.type) {
          case 'expense':
          case 'fee':
            balanceMinor += txMinor; // Debt increases
            break;
          case 'income':
          case 'refund':
            balanceMinor -= txMinor; // Debt decreases
            break;
          case 'transfer':
            // Paying a credit card is a transfer into the credit card (reduces debt)
            if (tx.description?.includes('Transfer from') || tx.description?.includes('Payment')) {
              balanceMinor -= txMinor;
            } else {
              balanceMinor += txMinor;
            }
            break;
          case 'adjustment':
            balanceMinor += txMinor;
            break;
        }
      }
    }

    return createMoney(balanceMinor, currency);
  }

  /**
   * Generates a running ledger for an account ordered chronologically
   */
  public getAccountLedger(accountId: string): AccountLedgerItem[] {
    const account = this.getAccountById(accountId);
    if (!account) return [];

    const currency = account.currency || DEFAULT_CURRENCY;
    const isLiability = ['credit', 'loan', 'liability'].includes(account.type);

    const txs = this.getTransactionsForAccount(accountId).sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return a.createdAt - b.createdAt;
    });

    let runningMinor = account.openingBalance ? account.openingBalance.amountMinor : 0;
    const ledger: AccountLedgerItem[] = [];

    for (const tx of txs) {
      const txMinor = tx.amount.amountMinor;
      let signedMinor = 0;

      if (!isLiability) {
        if (tx.type === 'income' || tx.type === 'refund' || (tx.type === 'transfer' && tx.description?.includes('Transfer from'))) {
          signedMinor = txMinor;
        } else {
          signedMinor = -txMinor;
        }
        runningMinor += signedMinor;
      } else {
        // For liability, positive signed amount = new charge (adds debt), negative = payment (reduces debt)
        if (tx.type === 'expense' || tx.type === 'fee') {
          signedMinor = txMinor;
        } else {
          signedMinor = -txMinor;
        }
        runningMinor += signedMinor;
      }

      ledger.push({
        transaction: tx,
        runningBalance: createMoney(runningMinor, currency),
        signedAmount: createMoney(signedMinor, currency),
      });
    }

    return ledger;
  }

  /**
   * ==========================================
   * 2. TRANSACTIONS & SPLITS
   * ==========================================
   */

  public getTransactions(): FinanceTransaction[] {
    return financeStorage.getTransactions();
  }

  public getTransactionById(id: string): FinanceTransaction | undefined {
    return this.getTransactions().find((t) => t.id === id);
  }

  public getTransactionsForAccount(accountId: string): FinanceTransaction[] {
    return this.getTransactions().filter((t) => t.accountId === accountId);
  }

  public createTransaction(
    data: Omit<FinanceTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): FinanceTransaction {
    // Validate split sum if splits are present
    if (data.splits && data.splits.length > 0) {
      this.validateSplits(data.amount, data.splits);
    }

    const now = Date.now();
    const newTx: FinanceTransaction = {
      ...data,
      id: `tx-${now}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };

    // Auto-apply rules if source is manual or import
    const processedTx = this.applyRulesToTransaction(newTx);

    const all = [processedTx, ...this.getTransactions()];
    financeStorage.saveTransactions(all);
    return processedTx;
  }

  public updateTransaction(
    id: string,
    updates: Partial<FinanceTransaction>
  ): FinanceTransaction | null {
    const all = this.getTransactions();
    const index = all.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const existing = all[index];
    const targetAmount = updates.amount || existing.amount;
    const targetSplits = updates.splits !== undefined ? updates.splits : existing.splits;

    if (targetSplits && targetSplits.length > 0) {
      this.validateSplits(targetAmount, targetSplits);
    }

    const updated: FinanceTransaction = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    all[index] = updated;

    // If this is part of a transfer pair, keep the other leg synchronized
    if (updated.transferId) {
      const otherIndex = all.findIndex(
        (t) => t.transferId === updated.transferId && t.id !== updated.id
      );
      if (otherIndex !== -1) {
        all[otherIndex] = {
          ...all[otherIndex],
          date: updated.date,
          postingDate: updated.postingDate,
          status: updated.status,
          updatedAt: Date.now(),
        };
      }
    }

    financeStorage.saveTransactions(all);
    return updated;
  }

  public deleteTransaction(id: string): boolean {
    const all = this.getTransactions();
    const target = all.find((t) => t.id === id);
    if (!target) return false;

    // If part of transfer pair, delete paired transaction as well to maintain atomic transfer integrity
    let remaining: FinanceTransaction[];
    if (target.transferId) {
      remaining = all.filter((t) => t.transferId !== target.transferId);
    } else {
      remaining = all.filter((t) => t.id !== id);
    }

    financeStorage.saveTransactions(remaining);
    return true;
  }

  public deleteTransactionsBatch(ids: string[]): number {
    const idSet = new Set(ids);
    const all = this.getTransactions();
    const transferIdsToDelete = new Set<string>();

    all.forEach((t) => {
      if (idSet.has(t.id) && t.transferId) {
        transferIdsToDelete.add(t.transferId);
      }
    });

    const remaining = all.filter(
      (t) => !idSet.has(t.id) && (!t.transferId || !transferIdsToDelete.has(t.transferId))
    );
    const count = all.length - remaining.length;
    financeStorage.saveTransactions(remaining);
    return count;
  }

  public bulkCategorize(transactionIds: string[], categoryId: string): number {
    const idSet = new Set(transactionIds);
    const all = this.getTransactions();
    let updatedCount = 0;

    const modified = all.map((t) => {
      if (idSet.has(t.id)) {
        updatedCount++;
        return {
          ...t,
          categoryId,
          updatedAt: Date.now(),
        };
      }
      return t;
    });

    financeStorage.saveTransactions(modified);
    return updatedCount;
  }

  private validateSplits(totalAmount: Money, splits: { amount: Money }[]): void {
    const splitSum = sumMoney(splits.map((s) => s.amount), totalAmount.currency);
    if (splitSum.amountMinor !== totalAmount.amountMinor) {
      throw new Error(
        `Split transaction amounts total (${splitSum.amountMinor}) does not equal transaction total (${totalAmount.amountMinor})`
      );
    }
  }

  /**
   * ==========================================
   * 3. ATOMIC TRANSFERS
   * ==========================================
   */

  public createTransfer(params: {
    fromAccountId: string;
    toAccountId: string;
    date: string;
    amount: Money;
    toAmount?: Money; // For cross-currency transfers
    description?: string;
    payee?: string;
    tags?: string[];
  }): { fromTransaction: FinanceTransaction; toTransaction: FinanceTransaction } {
    const { fromAccountId, toAccountId, date, amount, toAmount, description, payee, tags } = params;

    const fromAccount = this.getAccountById(fromAccountId);
    const toAccount = this.getAccountById(toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error('Invalid from or to account ID for transfer');
    }
    if (fromAccountId === toAccountId) {
      throw new Error('Cannot transfer to the same account');
    }

    const transferId = `trf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    const destAmount = toAmount || (amount.currency === toAccount.currency ? amount : amount);

    // Leg 1: Outflow from source account
    const fromTx: FinanceTransaction = {
      id: `tx-${now}-from`,
      accountId: fromAccountId,
      date,
      type: 'transfer',
      amount: absMoney(amount),
      payee: payee || `Transfer to ${toAccount.name}`,
      description: description ? `${description} (Transfer to ${toAccount.name})` : `Transfer to ${toAccount.name}`,
      transferId,
      transferAccountId: toAccountId,
      status: 'cleared',
      tags: tags || ['transfer'],
      source: { type: 'manual' },
      createdAt: now,
      updatedAt: now,
    };

    // Leg 2: Inflow into destination account
    const toTx: FinanceTransaction = {
      id: `tx-${now}-to`,
      accountId: toAccountId,
      date,
      type: 'transfer',
      amount: absMoney(destAmount),
      payee: payee || `Transfer from ${fromAccount.name}`,
      description: description ? `${description} (Transfer from ${fromAccount.name})` : `Transfer from ${fromAccount.name}`,
      transferId,
      transferAccountId: fromAccountId,
      status: 'cleared',
      tags: tags || ['transfer'],
      source: { type: 'manual' },
      createdAt: now,
      updatedAt: now,
    };

    const all = [fromTx, toTx, ...this.getTransactions()];
    financeStorage.saveTransactions(all);

    return { fromTransaction: fromTx, toTransaction: toTx };
  }

  /**
   * ==========================================
   * 4. CATEGORIES
   * ==========================================
   */

  public getCategories(): FinanceCategory[] {
    return financeStorage.getCategories();
  }

  public getCategoryById(id: string): FinanceCategory | undefined {
    return this.getCategories().find((c) => c.id === id);
  }

  public createCategory(data: Omit<FinanceCategory, 'id' | 'createdAt' | 'updatedAt'>): FinanceCategory {
    const now = Date.now();
    const newCategory: FinanceCategory = {
      ...data,
      id: `cat-${now}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    const all = [...this.getCategories(), newCategory];
    financeStorage.saveCategories(all);
    return newCategory;
  }

  public updateCategory(id: string, updates: Partial<FinanceCategory>): FinanceCategory | null {
    const all = this.getCategories();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const updated: FinanceCategory = {
      ...all[index],
      ...updates,
      updatedAt: Date.now(),
    };
    all[index] = updated;
    financeStorage.saveCategories(all);
    return updated;
  }

  public deleteCategory(id: string, reassignToCategoryId?: string): boolean {
    const categories = this.getCategories().filter((c) => c.id !== id);
    financeStorage.saveCategories(categories);

    // Reassign or unassign transactions
    const transactions = this.getTransactions().map((t) => {
      if (t.categoryId === id) {
        return {
          ...t,
          categoryId: reassignToCategoryId || undefined,
          updatedAt: Date.now(),
        };
      }
      return t;
    });
    financeStorage.saveTransactions(transactions);
    return true;
  }

  /**
   * ==========================================
   * 5. BUDGETS
   * ==========================================
   */

  public getBudgets(): FinanceBudget[] {
    return financeStorage.getBudgets();
  }

  public getBudgetForPeriod(periodKey: string): FinanceBudget | undefined {
    return this.getBudgets().find((b) => b.periodKey === periodKey);
  }

  public saveBudget(budget: Omit<FinanceBudget, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): FinanceBudget {
    const all = this.getBudgets();
    const now = Date.now();

    if (budget.id) {
      const index = all.findIndex((b) => b.id === budget.id);
      if (index !== -1) {
        const updated: FinanceBudget = {
          ...all[index],
          ...budget,
          id: budget.id,
          updatedAt: now,
        };
        all[index] = updated;
        financeStorage.saveBudgets(all);
        return updated;
      }
    }

    // Check if budget for periodKey already exists
    const existingIndex = all.findIndex((b) => b.periodKey === budget.periodKey);
    if (existingIndex !== -1) {
      const updated: FinanceBudget = {
        ...all[existingIndex],
        ...budget,
        updatedAt: now,
      };
      all[existingIndex] = updated;
      financeStorage.saveBudgets(all);
      return updated;
    }

    const newBudget: FinanceBudget = {
      ...budget,
      id: `bgt-${now}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    all.push(newBudget);
    financeStorage.saveBudgets(all);
    return newBudget;
  }

  /**
   * Computes the budget vs actual spending progress for a specified month
   */
  public calculateBudgetProgress(periodKey: string, currency = DEFAULT_CURRENCY): BudgetPeriodProgress[] {
    const budget = this.getBudgetForPeriod(periodKey);
    const categories = this.getCategories().filter((c) => c.type !== 'income');
    const targetMap = new Map<string, Money>();

    if (budget) {
      budget.targets.forEach((t) => targetMap.set(t.categoryId, t.targetAmount));
    }

    // Filter transactions for periodKey (e.g. '2026-09')
    const transactions = this.getTransactions().filter(
      (t) => t.date.startsWith(periodKey) && t.type !== 'transfer'
    );

    // Group expenses by category
    const categorySpentMap = new Map<string, { totalMinor: number; txIds: string[] }>();

    transactions.forEach((tx) => {
      if (tx.splits && tx.splits.length > 0) {
        tx.splits.forEach((split) => {
          if (split.categoryId) {
            const current = categorySpentMap.get(split.categoryId) || { totalMinor: 0, txIds: [] };
            current.totalMinor += split.amount.amountMinor;
            current.txIds.push(tx.id);
            categorySpentMap.set(split.categoryId, current);
          }
        });
      } else if (tx.categoryId) {
        const current = categorySpentMap.get(tx.categoryId) || { totalMinor: 0, txIds: [] };
        if (tx.type === 'expense' || tx.type === 'fee') {
          current.totalMinor += tx.amount.amountMinor;
        } else if (tx.type === 'refund') {
          current.totalMinor -= tx.amount.amountMinor; // Refunds reduce spending
        }
        current.txIds.push(tx.id);
        categorySpentMap.set(tx.categoryId, current);
      }
    });

    const results: BudgetPeriodProgress[] = [];

    categories.forEach((cat) => {
      const target = targetMap.get(cat.id) || createMoney(0, currency);
      const spentData = categorySpentMap.get(cat.id) || { totalMinor: 0, txIds: [] };
      const actualSpent = createMoney(Math.max(0, spentData.totalMinor), currency);

      const variance = subtractMoney(target, actualSpent);
      const percentUsed = target.amountMinor > 0
        ? Math.round((actualSpent.amountMinor / target.amountMinor) * 100)
        : actualSpent.amountMinor > 0 ? 100 : 0;

      const isOverBudget = actualSpent.amountMinor > target.amountMinor;

      // Only include if target is set OR there is spending
      if (target.amountMinor > 0 || actualSpent.amountMinor > 0) {
        results.push({
          category: cat,
          targetAmount: target,
          actualSpent,
          variance,
          percentUsed,
          transactionIds: spentData.txIds,
          isOverBudget,
        });
      }
    });

    return results.sort((a, b) => b.actualSpent.amountMinor - a.actualSpent.amountMinor);
  }

  public copyBudgetFromPreviousPeriod(currentPeriodKey: string, previousPeriodKey: string): FinanceBudget | null {
    const prev = this.getBudgetForPeriod(previousPeriodKey);
    if (!prev) return null;

    return this.saveBudget({
      name: `Budget ${currentPeriodKey}`,
      period: prev.period,
      periodKey: currentPeriodKey,
      currency: prev.currency,
      targets: prev.targets.map((t) => ({ ...t })),
      notes: `Copied from ${previousPeriodKey}`,
    });
  }

  /**
   * ==========================================
   * 6. BILLS & SUBSCRIPTIONS
   * ==========================================
   */

  public getBills(): FinanceBill[] {
    return financeStorage.getBills();
  }

  public getBillById(id: string): FinanceBill | undefined {
    return this.getBills().find((b) => b.id === id);
  }

  public createBill(data: Omit<FinanceBill, 'id' | 'createdAt' | 'updatedAt'>): FinanceBill {
    const now = Date.now();
    const newBill: FinanceBill = {
      ...data,
      id: `bill-${now}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    const all = [...this.getBills(), newBill];
    financeStorage.saveBills(all);
    return newBill;
  }

  public updateBill(id: string, updates: Partial<FinanceBill>): FinanceBill | null {
    const all = this.getBills();
    const index = all.findIndex((b) => b.id === id);
    if (index === -1) return null;

    const updated: FinanceBill = {
      ...all[index],
      ...updates,
      updatedAt: Date.now(),
    };
    all[index] = updated;
    financeStorage.saveBills(all);
    return updated;
  }

  public deleteBill(id: string): boolean {
    const all = this.getBills().filter((b) => b.id !== id);
    financeStorage.saveBills(all);
    return true;
  }

  /**
   * Calculates monthly and annual cost equivalents for all active subscriptions
   */
  public calculateSubscriptionCosts(currency = DEFAULT_CURRENCY): {
    totalMonthlyEquivalent: Money;
    totalAnnualEquivalent: Money;
    activeCount: number;
    breakdown: Array<{ bill: FinanceBill; monthlyCost: Money; annualCost: Money }>;
  } {
    const active = this.getBills().filter((b) => b.type === 'subscription' && b.status === 'active');

    let monthlyMinorTotal = 0;
    const breakdown: Array<{ bill: FinanceBill; monthlyCost: Money; annualCost: Money }> = [];

    active.forEach((bill) => {
      const amountMinor = bill.amount ? bill.amount.amountMinor : 0;
      let monthlyMinor = 0;

      switch (bill.recurrence.frequency) {
        case 'weekly':
          monthlyMinor = Math.round((amountMinor * 52) / 12);
          break;
        case 'biweekly':
          monthlyMinor = Math.round((amountMinor * 26) / 12);
          break;
        case 'monthly':
          monthlyMinor = amountMinor;
          break;
        case 'quarterly':
          monthlyMinor = Math.round(amountMinor / 3);
          break;
        case 'biannual':
          monthlyMinor = Math.round(amountMinor / 6);
          break;
        case 'annual':
          monthlyMinor = Math.round(amountMinor / 12);
          break;
        default:
          monthlyMinor = amountMinor;
      }

      monthlyMinorTotal += monthlyMinor;
      const annualMinor = monthlyMinor * 12;

      breakdown.push({
        bill,
        monthlyCost: createMoney(monthlyMinor, currency),
        annualCost: createMoney(annualMinor, currency),
      });
    });

    return {
      totalMonthlyEquivalent: createMoney(monthlyMinorTotal, currency),
      totalAnnualEquivalent: createMoney(monthlyMinorTotal * 12, currency),
      activeCount: active.length,
      breakdown: breakdown.sort((a, b) => b.monthlyCost.amountMinor - a.monthlyCost.amountMinor),
    };
  }

  /**
   * Generates upcoming bill occurrences within a date window
   */
  public getUpcomingBillOccurrences(daysAhead = 30): Array<{
    bill: FinanceBill;
    dueDate: string;
    amount?: Money;
    isPaid: boolean;
  }> {
    const bills = this.getBills().filter((b) => b.status === 'active');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + daysAhead);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    const occurrences: Array<{ bill: FinanceBill; dueDate: string; amount?: Money; isPaid: boolean }> = [];

    bills.forEach((bill) => {
      const nextDates = this.projectNextOccurrenceDates(bill, todayStr, maxDateStr);
      nextDates.forEach((dateStr) => {
        // Check if an actual matching transaction exists around this date
        const isPaid = this.getTransactions().some(
          (t) =>
            t.billId === bill.id &&
            Math.abs(new Date(t.date).getTime() - new Date(dateStr).getTime()) <= 3 * 86400000
        );

        occurrences.push({
          bill,
          dueDate: dateStr,
          amount: bill.amount,
          isPaid,
        });
      });
    });

    return occurrences.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  private projectNextOccurrenceDates(bill: FinanceBill, fromDateStr: string, toDateStr: string): string[] {
    const dates: string[] = [];
    const from = new Date(fromDateStr);
    const to = new Date(toDateStr);
    const start = new Date(bill.recurrence.startDate || fromDateStr);

    let current = new Date(start);

    // Advance current to approximately fromDate
    while (current < from) {
      this.advanceRecurrenceDate(current, bill.recurrence.frequency);
    }

    while (current <= to) {
      if (current >= from) {
        dates.push(current.toISOString().split('T')[0]);
      }
      this.advanceRecurrenceDate(current, bill.recurrence.frequency);
    }

    return dates;
  }

  private advanceRecurrenceDate(date: Date, frequency: string) {
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'biweekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'biannual':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'annual':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
  }

  /**
   * Deterministically scans transactions to detect recurring patterns
   */
  public detectRecurringPatterns(): RecurringPatternSuggestion[] {
    const transactions = this.getTransactions().filter(
      (t) => t.type === 'expense' && (t.payee || t.rawDescription)
    );

    // Group by normalized payee
    const groups = new Map<string, FinanceTransaction[]>();

    transactions.forEach((tx) => {
      const key = (tx.payee || tx.rawDescription || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!key) return;
      const list = groups.get(key) || [];
      list.push(tx);
      groups.set(key, list);
    });

    const suggestions: RecurringPatternSuggestion[] = [];
    const existingBills = this.getBills();

    groups.forEach((txs, key) => {
      if (txs.length < 3) return; // Need at least 3 occurrences

      // Check if already configured as a bill
      const alreadyConfigured = existingBills.some(
        (b) =>
          b.payee &&
          b.payee.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === key
      );
      if (alreadyConfigured) return;

      // Sort by date
      txs.sort((a, b) => a.date.localeCompare(b.date));

      // Calculate intervals between consecutive occurrences
      const intervals: number[] = [];
      for (let i = 1; i < txs.length; i++) {
        const d1 = new Date(txs[i - 1].date).getTime();
        const d2 = new Date(txs[i].date).getTime();
        const days = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        intervals.push(days);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      // Check if monthly pattern (~28 to 32 days)
      let frequency: 'monthly' | 'weekly' | 'annual' | null = null;
      if (avgInterval >= 27 && avgInterval <= 33) {
        frequency = 'monthly';
      } else if (avgInterval >= 6 && avgInterval <= 8) {
        frequency = 'weekly';
      } else if (avgInterval >= 355 && avgInterval <= 375) {
        frequency = 'annual';
      }

      if (frequency) {
        const lastTx = txs[txs.length - 1];
        const nextDate = new Date(lastTx.date);
        this.advanceRecurrenceDate(nextDate, frequency);

        suggestions.push({
          id: `pat-${key}`,
          payee: lastTx.payee || lastTx.rawDescription || 'Unknown Payee',
          estimatedAmount: lastTx.amount,
          frequency,
          sampleTransactionIds: txs.map((t) => t.id),
          lastDate: lastTx.date,
          nextPredictedDate: nextDate.toISOString().split('T')[0],
          matchedCategoryId: lastTx.categoryId,
          matchedAccountId: lastTx.accountId,
        });
      }
    });

    return suggestions;
  }

  /**
   * ==========================================
   * 7. RECONCILIATION
   * ==========================================
   */

  public getReconciliations(): FinanceReconciliation[] {
    return financeStorage.getReconciliations();
  }

  public createReconciliation(data: Omit<FinanceReconciliation, 'id' | 'createdAt'>): FinanceReconciliation {
    const now = Date.now();
    const newRecon: FinanceReconciliation = {
      ...data,
      id: `rec-${now}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
    };

    const all = [...this.getReconciliations(), newRecon];
    financeStorage.saveReconciliations(all);
    return newRecon;
  }

  public finalizeReconciliation(
    reconciliationId: string,
    reconciledTransactionIds: string[]
  ): FinanceReconciliation | null {
    const all = this.getReconciliations();
    const index = all.findIndex((r) => r.id === reconciliationId);
    if (index === -1) return null;

    const recon = all[index];
    const now = Date.now();

    recon.reconciledTransactionIds = reconciledTransactionIds;
    recon.status = recon.difference.amountMinor === 0 ? 'completed' : 'discrepancy';
    recon.completedAt = now;

    all[index] = recon;
    financeStorage.saveReconciliations(all);

    // Update transactions to 'reconciled'
    const idSet = new Set(reconciledTransactionIds);
    const txs = this.getTransactions().map((t) => {
      if (idSet.has(t.id)) {
        return {
          ...t,
          status: 'reconciled' as const,
          reconciliationId,
          updatedAt: now,
        };
      }
      return t;
    });
    financeStorage.saveTransactions(txs);

    return recon;
  }

  /**
   * ==========================================
   * 8. DETERMINISTIC RULES ENGINE
   * ==========================================
   */

  public getRules(): FinanceRule[] {
    return financeStorage.getRules().sort((a, b) => a.priority - b.priority);
  }

  public createRule(data: Omit<FinanceRule, 'id' | 'createdAt' | 'updatedAt'>): FinanceRule {
    const now = Date.now();
    const newRule: FinanceRule = {
      ...data,
      id: `rule-${now}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    const all = [...this.getRules(), newRule];
    financeStorage.saveRules(all);
    return newRule;
  }

  public updateRule(id: string, updates: Partial<FinanceRule>): FinanceRule | null {
    const all = this.getRules();
    const index = all.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const updated: FinanceRule = {
      ...all[index],
      ...updates,
      updatedAt: Date.now(),
    };
    all[index] = updated;
    financeStorage.saveRules(all);
    return updated;
  }

  public deleteRule(id: string): boolean {
    const all = this.getRules().filter((r) => r.id !== id);
    financeStorage.saveRules(all);
    return true;
  }

  public applyRulesToTransaction(tx: FinanceTransaction): FinanceTransaction {
    const rules = this.getRules().filter((r) => r.enabled);
    let modified = { ...tx };

    for (const rule of rules) {
      if (this.matchesRule(modified, rule)) {
        modified = this.executeRuleActions(modified, rule);
      }
    }

    return modified;
  }

  public applyRulesToAllTransactions(): { modifiedCount: number } {
    const transactions = this.getTransactions();
    let count = 0;

    const updated = transactions.map((t) => {
      const processed = this.applyRulesToTransaction(t);
      if (JSON.stringify(processed) !== JSON.stringify(t)) {
        count++;
        return processed;
      }
      return t;
    });

    if (count > 0) {
      financeStorage.saveTransactions(updated);
    }

    return { modifiedCount: count };
  }

  private matchesRule(tx: FinanceTransaction, rule: FinanceRule): boolean {
    if (!rule.conditions || rule.conditions.length === 0) return false;

    const results = rule.conditions.map((cond) => {
      let fieldValue: string | number = '';
      if (cond.field === 'description') fieldValue = tx.description || '';
      else if (cond.field === 'rawDescription') fieldValue = tx.rawDescription || '';
      else if (cond.field === 'payee') fieldValue = tx.payee || '';
      else if (cond.field === 'accountId') fieldValue = tx.accountId;
      else if (cond.field === 'amount') fieldValue = tx.amount.amountMinor;
      else if (cond.field === 'type') fieldValue = tx.type;

      const targetVal = cond.value;

      switch (cond.operator) {
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(targetVal).toLowerCase());
        case 'equals':
          return String(fieldValue).toLowerCase() === String(targetVal).toLowerCase();
        case 'startsWith':
          return String(fieldValue).toLowerCase().startsWith(String(targetVal).toLowerCase());
        case 'endsWith':
          return String(fieldValue).toLowerCase().endsWith(String(targetVal).toLowerCase());
        case 'matchesRegex':
          try {
            const regex = new RegExp(String(targetVal), 'i');
            return regex.test(String(fieldValue));
          } catch {
            return false;
          }
        case 'greaterThan':
          return Number(fieldValue) > Number(targetVal);
        case 'lessThan':
          return Number(fieldValue) < Number(targetVal);
        case 'between':
          if (Array.isArray(targetVal) && targetVal.length === 2) {
            return Number(fieldValue) >= targetVal[0] && Number(fieldValue) <= targetVal[1];
          }
          return false;
        default:
          return false;
      }
    });

    return rule.matchAllConditions ? results.every(Boolean) : results.some(Boolean);
  }

  private executeRuleActions(tx: FinanceTransaction, rule: FinanceRule): FinanceTransaction {
    const modified = { ...tx };

    rule.actions.forEach((action) => {
      switch (action.type) {
        case 'setCategory':
          if (typeof action.value === 'string') {
            modified.categoryId = action.value;
          }
          break;
        case 'setPayee':
          if (typeof action.value === 'string') {
            modified.payee = action.value;
          }
          break;
        case 'addTags':
          if (Array.isArray(action.value)) {
            const current = new Set(modified.tags || []);
            action.value.forEach((t) => current.add(t));
            modified.tags = Array.from(current);
          }
          break;
        case 'setType':
          if (typeof action.value === 'string') {
            modified.type = action.value as TransactionType;
          }
          break;
      }
    });

    return modified;
  }

  /**
   * ==========================================
   * 9. NET WORTH & CASH FLOW AGGREGATIONS
   * ==========================================
   */

  public calculateTrackedNetWorth(currency = DEFAULT_CURRENCY): TrackedNetWorth {
    const accounts = this.getAccounts().filter((a) => a.status === 'active' && !a.excludeFromNetWorth);

    let totalAssetsMinor = 0;
    let totalLiabilitiesMinor = 0;

    const assetsByAccount: Array<{ account: FinanceAccount; balance: Money }> = [];
    const liabilitiesByAccount: Array<{ account: FinanceAccount; balance: Money }> = [];

    accounts.forEach((acc) => {
      const balance = this.calculateAccountBalance(acc.id);
      const isLiability = ['credit', 'loan', 'liability'].includes(acc.type);

      if (isLiability) {
        totalLiabilitiesMinor += balance.amountMinor;
        liabilitiesByAccount.push({ account: acc, balance });
      } else {
        totalAssetsMinor += balance.amountMinor;
        assetsByAccount.push({ account: acc, balance });
      }
    });

    const netWorthMinor = totalAssetsMinor - totalLiabilitiesMinor;

    return {
      currency,
      totalAssets: createMoney(totalAssetsMinor, currency),
      totalLiabilities: createMoney(totalLiabilitiesMinor, currency),
      netWorth: createMoney(netWorthMinor, currency),
      accountsCount: accounts.length,
      assetsByAccount: assetsByAccount.sort((a, b) => b.balance.amountMinor - a.balance.amountMinor),
      liabilitiesByAccount: liabilitiesByAccount.sort((a, b) => b.balance.amountMinor - a.balance.amountMinor),
    };
  }

  public calculateCashFlow(periodKey: string, currency = DEFAULT_CURRENCY): CashFlowSummary {
    const txs = this.getTransactions().filter(
      (t) => t.date.startsWith(periodKey) && t.type !== 'transfer'
    );

    let incomeMinor = 0;
    let expenseMinor = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    txs.forEach((tx) => {
      const minor = tx.amount.amountMinor;
      if (tx.type === 'income') {
        incomeMinor += minor;
        incomeCount++;
      } else if (tx.type === 'expense' || tx.type === 'fee') {
        expenseMinor += minor;
        expenseCount++;
      } else if (tx.type === 'refund') {
        // Refund reduces expense
        expenseMinor -= minor;
      }
    });

    const netMinor = incomeMinor - expenseMinor;
    const savingsRate = incomeMinor > 0 ? Math.max(0, Math.round((netMinor / incomeMinor) * 100)) : 0;

    return {
      periodKey,
      currency,
      totalIncome: createMoney(incomeMinor, currency),
      totalExpenses: createMoney(Math.max(0, expenseMinor), currency),
      netCashFlow: createMoney(netMinor, currency),
      savingsRatePercent: savingsRate,
      incomeTransactionCount: incomeCount,
      expenseTransactionCount: expenseCount,
    };
  }

  public calculateCategorySpending(
    periodKey?: string,
    currency = DEFAULT_CURRENCY
  ): CategorySpendingSummary[] {
    const categories = this.getCategories();
    const catMap = new Map<string, FinanceCategory>(categories.map((c) => [c.id, c]));

    const txs = this.getTransactions().filter((t) => {
      if (t.type === 'transfer') return false;
      if (periodKey && !t.date.startsWith(periodKey)) return false;
      return true;
    });

    let grandTotalExpenseMinor = 0;
    const statsMap = new Map<string, { spentMinor: number; incomeMinor: number; count: number; txIds: string[] }>();

    txs.forEach((tx) => {
      if (tx.splits && tx.splits.length > 0) {
        tx.splits.forEach((split) => {
          const catId = split.categoryId || 'uncategorized';
          const cur = statsMap.get(catId) || { spentMinor: 0, incomeMinor: 0, count: 0, txIds: [] };
          cur.spentMinor += split.amount.amountMinor;
          cur.count++;
          cur.txIds.push(tx.id);
          statsMap.set(catId, cur);
          grandTotalExpenseMinor += split.amount.amountMinor;
        });
      } else {
        const catId = tx.categoryId || 'uncategorized';
        const cur = statsMap.get(catId) || { spentMinor: 0, incomeMinor: 0, count: 0, txIds: [] };

        if (tx.type === 'income') {
          cur.incomeMinor += tx.amount.amountMinor;
        } else if (tx.type === 'expense' || tx.type === 'fee') {
          cur.spentMinor += tx.amount.amountMinor;
          grandTotalExpenseMinor += tx.amount.amountMinor;
        } else if (tx.type === 'refund') {
          cur.spentMinor -= tx.amount.amountMinor;
          grandTotalExpenseMinor -= tx.amount.amountMinor;
        }
        cur.count++;
        cur.txIds.push(tx.id);
        statsMap.set(catId, cur);
      }
    });

    const summaries: CategorySpendingSummary[] = [];

    statsMap.forEach((data, catId) => {
      const category: FinanceCategory =
        catMap.get(catId) || {
          id: 'uncategorized',
          name: 'Uncategorized',
          type: 'expense',
          color: '#94a3b8',
          createdAt: 0,
          updatedAt: 0,
        };

      const pct = grandTotalExpenseMinor > 0
        ? Math.round((Math.max(0, data.spentMinor) / grandTotalExpenseMinor) * 100)
        : 0;

      summaries.push({
        category,
        spent: createMoney(Math.max(0, data.spentMinor), currency),
        income: createMoney(data.incomeMinor, currency),
        transactionCount: data.count,
        percentageOfTotal: pct,
        transactionIds: data.txIds,
      });
    });

    return summaries.sort((a, b) => b.spent.amountMinor - a.spent.amountMinor);
  }

  /**
   * Filter and search transactions
   */
  public filterTransactions(filter: Partial<FinanceFilterState> = {}): FinanceTransaction[] {
    const f: FinanceFilterState = { ...DEFAULT_FINANCE_FILTER, ...filter };
    let list = this.getTransactions();

    if (f.searchQuery) {
      const q = f.searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          (t.payee && t.payee.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.rawDescription && t.rawDescription.toLowerCase().includes(q)) ||
          (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }

    if (f.accountIds && f.accountIds.length > 0) {
      const set = new Set(f.accountIds);
      list = list.filter((t) => set.has(t.accountId) || (t.transferAccountId && set.has(t.transferAccountId)));
    }

    if (f.categoryIds && f.categoryIds.length > 0) {
      const set = new Set(f.categoryIds);
      list = list.filter(
        (t) =>
          (t.categoryId && set.has(t.categoryId)) ||
          (t.splits && t.splits.some((s) => s.categoryId && set.has(s.categoryId)))
      );
    }

    if (f.types && f.types.length > 0) {
      const set = new Set(f.types);
      list = list.filter((t) => set.has(t.type));
    }

    if (f.statuses && f.statuses.length > 0) {
      const set = new Set(f.statuses);
      list = list.filter((t) => set.has(t.status));
    }

    if (f.startDate) {
      list = list.filter((t) => t.date >= f.startDate!);
    }

    if (f.endDate) {
      list = list.filter((t) => t.date <= f.endDate!);
    }

    if (f.isUncategorized) {
      list = list.filter((t) => !t.categoryId && (!t.splits || t.splits.length === 0));
    }

    if (f.hasAttachment) {
      list = list.filter((t) => t.attachmentIds && t.attachmentIds.length > 0);
    }

    if (f.minAmountMinor !== undefined) {
      list = list.filter((t) => t.amount.amountMinor >= f.minAmountMinor!);
    }

    if (f.maxAmountMinor !== undefined) {
      list = list.filter((t) => t.amount.amountMinor <= f.maxAmountMinor!);
    }

    if (f.tag) {
      list = list.filter((t) => t.tags && t.tags.includes(f.tag!));
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (f.sortBy) {
        case 'date':
          cmp = a.date.localeCompare(b.date);
          if (cmp === 0) cmp = a.createdAt - b.createdAt;
          break;
        case 'amount':
          cmp = a.amount.amountMinor - b.amount.amountMinor;
          break;
        case 'payee':
          cmp = (a.payee || '').localeCompare(b.payee || '');
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        default:
          cmp = a.date.localeCompare(b.date);
      }
      return f.sortOrder === 'desc' ? -cmp : cmp;
    });

    return list;
  }
}

export const financeService = new FinanceService();
