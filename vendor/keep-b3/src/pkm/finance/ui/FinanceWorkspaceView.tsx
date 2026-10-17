import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  LayoutDashboard,
  CreditCard,
  Receipt,
  PieChart,
  RefreshCw,
  Scale,
  BarChart3,
  UploadCloud,
  SlidersHorizontal,
  Plus,
  ArrowRightLeft,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import {
  FinanceAccount,
  FinanceTransaction,
  FinanceCategory,
  FinanceBudget,
  FinanceBill,
  FinanceReconciliation,
  FinanceRule,
  FinanceImportBatch,
} from '../financeTypes';
import { financeStorage } from '../financeStorage';
import { financeService } from '../financeService';
import { FinanceOverviewTab } from './FinanceOverviewTab';
import { FinanceAccountsTab } from './FinanceAccountsTab';
import { FinanceTransactionsTab } from './FinanceTransactionsTab';
import { FinanceBudgetTab } from './FinanceBudgetTab';
import { FinanceBillsTab } from './FinanceBillsTab';
import { FinanceReconciliationTab } from './FinanceReconciliationTab';
import { FinanceReportsTab } from './FinanceReportsTab';
import { FinanceImportTab } from './FinanceImportTab';
import { FinanceRulesTab } from './FinanceRulesTab';

import { FinanceTransactionModal } from './FinanceTransactionModal';
import { FinanceAccountModal } from './FinanceAccountModal';
import { FinanceBudgetModal } from './FinanceBudgetModal';
import { FinanceBillModal } from './FinanceBillModal';
import { FinanceReconcileModal } from './FinanceReconcileModal';

interface FinanceWorkspaceViewProps {
  onAddNote?: (title: string, content: string, tags?: string[]) => void;
}

export const FinanceWorkspaceView: React.FC<FinanceWorkspaceViewProps> = ({ onAddNote }) => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Storage State
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [bills, setBills] = useState<FinanceBill[]>([]);
  const [reconciliations, setReconciliations] = useState<FinanceReconciliation[]>([]);
  const [rules, setRules] = useState<FinanceRule[]>([]);
  const [importBatches, setImportBatches] = useState<FinanceImportBatch[]>([]);

  // Selected Account for drill-down
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Modals state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [defaultTxType, setDefaultTxType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [defaultTxAccountId, setDefaultTxAccountId] = useState<string | undefined>(undefined);

  const [accModalOpen, setAccModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);

  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<FinanceBill | null>(null);

  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [reconcileTargetAccount, setReconcileTargetAccount] = useState<FinanceAccount | null>(null);

  // Current selected month period (e.g. '2026-09')
  const [currentPeriodKey, setCurrentPeriodKey] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
  });

  const reloadData = useCallback(() => {
    const snap = financeStorage.loadSnapshot();
    setAccounts(snap.accounts);
    setTransactions(snap.transactions);
    setCategories(snap.categories);
    setBudgets(snap.budgets);
    setBills(snap.bills);
    setReconciliations(snap.reconciliations);
    setRules(snap.rules);
    setImportBatches(snap.importBatches);
  }, []);

  useEffect(() => {
    reloadData();
    const unsubscribe = financeStorage.subscribe(() => {
      reloadData();
    });
    return () => unsubscribe();
  }, [reloadData]);

  const handleOpenNewTransaction = (
    type: 'expense' | 'income' | 'transfer' = 'expense',
    accountId?: string
  ) => {
    setEditingTransaction(null);
    setDefaultTxType(type);
    setDefaultTxAccountId(accountId);
    setTxModalOpen(true);
  };

  const handleEditTransaction = (tx: FinanceTransaction) => {
    setEditingTransaction(tx);
    setDefaultTxType(tx.type as any);
    setDefaultTxAccountId(tx.accountId);
    setTxModalOpen(true);
  };

  const handleOpenNewAccount = () => {
    setEditingAccount(null);
    setAccModalOpen(true);
  };

  const handleEditAccount = (acc: FinanceAccount) => {
    setEditingAccount(acc);
    setAccModalOpen(true);
  };

  const handleOpenReconcile = (acc: FinanceAccount) => {
    setReconcileTargetAccount(acc);
    setReconcileModalOpen(true);
  };

  const handleOpenNewBill = () => {
    setEditingBill(null);
    setBillModalOpen(true);
  };

  const handleEditBill = (bill: FinanceBill) => {
    setEditingBill(bill);
    setBillModalOpen(true);
  };

  const handleGenerateReviewNote = (markdown: string, title: string) => {
    if (onAddNote) {
      onAddNote(title, markdown, ['finance', 'monthly-review']);
    }
  };

  // Tab definitions
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'accounts', label: 'Accounts & Ledger', icon: Landmark, count: accounts.length },
    { id: 'transactions', label: 'Transactions', icon: Receipt, count: transactions.length },
    { id: 'budget', label: 'Budget', icon: PieChart },
    { id: 'bills', label: 'Bills & Subscriptions', icon: RefreshCw, count: bills.length },
    { id: 'reconcile', label: 'Reconcile', icon: Scale },
    { id: 'reports', label: 'Reports & Cash Flow', icon: BarChart3 },
    { id: 'import', label: 'Import', icon: UploadCloud },
    { id: 'rules', label: 'Rules', icon: SlidersHorizontal, count: rules.length },
  ];

  return (
    <div className="min-h-full bg-stone-50/50 dark:bg-stone-950/40 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-sm">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                Personal Finance & Accounts
              </h1>
              <p className="text-xs text-stone-500">
                Local-first private ledger, deterministic budgets, accounts, and subscriptions
              </p>
            </div>
          </div>
        </div>

        {/* Global Quick Actions Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenNewTransaction('expense')}
            className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            + Expense
          </button>
          <button
            type="button"
            onClick={() => handleOpenNewTransaction('income')}
            className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 transition-colors"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            + Income
          </button>
          <button
            type="button"
            onClick={() => handleOpenNewTransaction('transfer')}
            className="px-3 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Transfer
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="border-b border-stone-200 dark:border-stone-800 overflow-x-auto">
        <div className="flex items-center gap-1 pb-px min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-xl flex items-center gap-2 border-b-2 transition-all ${
                  isActive
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-stone-900 shadow-2xs'
                    : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100/60 dark:hover:bg-stone-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab View */}
      <div>
        {activeTab === 'overview' && (
          <FinanceOverviewTab
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            bills={bills}
            budgets={budgets}
            currentPeriodKey={currentPeriodKey}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenNewTransaction={handleOpenNewTransaction}
            onOpenNewAccount={handleOpenNewAccount}
            onOpenNewBill={handleOpenNewBill}
            onEditTransaction={handleEditTransaction}
          />
        )}

        {activeTab === 'accounts' && (
          <FinanceAccountsTab
            accounts={accounts}
            transactions={transactions}
            selectedAccountId={selectedAccountId}
            onSelectAccount={(id) => setSelectedAccountId(id)}
            onOpenNewAccount={handleOpenNewAccount}
            onEditAccount={handleEditAccount}
            onOpenReconciliation={handleOpenReconcile}
            onOpenNewTransaction={handleOpenNewTransaction}
            onEditTransaction={handleEditTransaction}
          />
        )}

        {activeTab === 'transactions' && (
          <FinanceTransactionsTab
            accounts={accounts}
            categories={categories}
            transactions={transactions}
            onOpenNewTransaction={handleOpenNewTransaction}
            onEditTransaction={handleEditTransaction}
          />
        )}

        {activeTab === 'budget' && (
          <FinanceBudgetTab
            categories={categories}
            transactions={transactions}
            budgets={budgets}
            currentPeriodKey={currentPeriodKey}
            onChangePeriod={(p) => setCurrentPeriodKey(p)}
            onOpenEditBudget={() => setBudgetModalOpen(true)}
          />
        )}

        {activeTab === 'bills' && (
          <FinanceBillsTab
            bills={bills}
            categories={categories}
            accounts={accounts}
            transactions={transactions}
            onOpenNewBill={handleOpenNewBill}
            onEditBill={handleEditBill}
          />
        )}

        {activeTab === 'reconcile' && (
          <FinanceReconciliationTab
            accounts={accounts}
            reconciliations={reconciliations}
            onOpenReconcileModal={handleOpenReconcile}
          />
        )}

        {activeTab === 'reports' && (
          <FinanceReportsTab
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            budgets={budgets}
            currentPeriodKey={currentPeriodKey}
            onGenerateReviewNote={handleGenerateReviewNote}
          />
        )}

        {activeTab === 'import' && (
          <FinanceImportTab
            accounts={accounts}
            categories={categories}
            importBatches={importBatches}
            onImportCommitted={reloadData}
          />
        )}

        {activeTab === 'rules' && (
          <FinanceRulesTab
            rules={rules}
            categories={categories}
            onRulesUpdated={reloadData}
          />
        )}
      </div>

      {/* Transaction Modal */}
      <FinanceTransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        accounts={accounts}
        categories={categories}
        initialTransaction={editingTransaction}
        defaultAccountId={defaultTxAccountId}
        defaultType={defaultTxType}
        onSave={() => reloadData()}
      />

      {/* Account Modal */}
      <FinanceAccountModal
        isOpen={accModalOpen}
        onClose={() => setAccModalOpen(false)}
        initialAccount={editingAccount}
        onSave={() => reloadData()}
      />

      {/* Budget Modal */}
      <FinanceBudgetModal
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        periodKey={currentPeriodKey}
        categories={categories}
        currentBudget={financeService.getBudgetForPeriod(currentPeriodKey)}
        onSave={() => reloadData()}
      />

      {/* Bill & Subscription Modal */}
      <FinanceBillModal
        isOpen={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        categories={categories}
        accounts={accounts}
        initialBill={editingBill}
        onSave={() => reloadData()}
      />

      {/* Reconciliation Modal */}
      {reconcileTargetAccount && (
        <FinanceReconcileModal
          isOpen={reconcileModalOpen}
          onClose={() => {
            setReconcileModalOpen(false);
            setReconcileTargetAccount(null);
          }}
          account={reconcileTargetAccount}
          onCompleted={() => reloadData()}
        />
      )}
    </div>
  );
};
