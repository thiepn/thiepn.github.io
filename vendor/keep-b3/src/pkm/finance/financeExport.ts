/**
 * Finance Export & Report Generation for Phase P53
 * 
 * Supports CSV export of ledger, JSON vault export, and Markdown financial report generation.
 */

import { FinanceTransaction, FinanceAccount, FinanceBudget } from './financeTypes';
import { formatMoney, Money, moneyToDecimalString } from './money';
import { financeService } from './financeService';

export class FinanceExportService {
  /**
   * Generates a standard CSV representation of transactions
   */
  public exportTransactionsToCSV(transactions: FinanceTransaction[], accounts: FinanceAccount[]): string {
    const accMap = new Map(accounts.map((a) => [a.id, a.name]));
    const categories = financeService.getCategories();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const headers = [
      'Date',
      'Account',
      'Type',
      'Amount',
      'Currency',
      'Payee',
      'Category',
      'Description',
      'Status',
      'Tags',
      'Transfer Account',
    ];

    const rows: string[][] = [headers];

    transactions.forEach((tx) => {
      const accName = accMap.get(tx.accountId) || tx.accountId;
      const catName = tx.categoryId ? catMap.get(tx.categoryId) || tx.categoryId : '';
      const transferAcc = tx.transferAccountId ? accMap.get(tx.transferAccountId) || tx.transferAccountId : '';
      const amountStr = moneyToDecimalString(tx.amount);

      rows.push([
        tx.date,
        accName,
        tx.type,
        amountStr,
        tx.amount.currency,
        tx.payee || '',
        catName,
        tx.description || tx.rawDescription || '',
        tx.status,
        (tx.tags || []).join('; '),
        transferAcc,
      ]);
    });

    return rows
      .map((row) =>
        row
          .map((field) => {
            const str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      )
      .join('\n');
  }

  /**
   * Generates a rich Markdown Financial Monthly Review Note
   */
  public generateMonthlyReviewMarkdown(periodKey: string): string {
    const cashFlow = financeService.calculateCashFlow(periodKey);
    const budgetProgress = financeService.calculateBudgetProgress(periodKey);
    const netWorth = financeService.calculateTrackedNetWorth();
    const categorySpending = financeService.calculateCategorySpending(periodKey);

    const [year, month] = periodKey.split('-');
    const monthName = new Date(`${year}-${month}-01T00:00:00`).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    let md = `# Financial Review: ${monthName}\n\n`;
    md += `*Generated automatically from KeepNotes Finance Module on ${new Date().toLocaleDateString()}*\n\n`;

    md += `## 1. Cash Flow Summary\n\n`;
    md += `| Metric | Amount |\n`;
    md += `|---|---:|\n`;
    md += `| **Total Income** | ${formatMoney(cashFlow.totalIncome)} |\n`;
    md += `| **Total Expenses** | ${formatMoney(cashFlow.totalExpenses)} |\n`;
    md += `| **Net Cash Flow** | **${formatMoney(cashFlow.netCashFlow, undefined, { forceSign: true })}** |\n`;
    md += `| **Savings Rate** | ${cashFlow.savingsRatePercent}% |\n\n`;

    md += `## 2. Category Spending Breakdown\n\n`;
    md += `| Category | Spent | Share |\n`;
    md += `|---|---:|---:|\n`;
    categorySpending.slice(0, 8).forEach((cat) => {
      md += `| ${cat.category.name} | ${formatMoney(cat.spent)} | ${cat.percentageOfTotal}% |\n`;
    });
    md += `\n`;

    if (budgetProgress.length > 0) {
      md += `## 3. Budget vs. Actual\n\n`;
      md += `| Category | Target | Actual | Variance | Status |\n`;
      md += `|---|---:|---:|---:|---|\n`;
      budgetProgress.forEach((b) => {
        const status = b.isOverBudget ? '⚠️ Over' : '✅ Within';
        md += `| ${b.category.name} | ${formatMoney(b.targetAmount)} | ${formatMoney(b.actualSpent)} | ${formatMoney(b.variance, undefined, { forceSign: true })} | ${status} |\n`;
      });
      md += `\n`;
    }

    md += `## 4. Tracked Net Worth\n\n`;
    md += `* **Total Assets**: ${formatMoney(netWorth.totalAssets)}\n`;
    md += `* **Total Liabilities**: ${formatMoney(netWorth.totalLiabilities)}\n`;
    md += `* **Net Worth**: **${formatMoney(netWorth.netWorth)}**\n\n`;

    md += `## 5. Notes & Action Items\n\n`;
    md += `- [ ] Review recurring subscriptions for next quarter\n`;
    md += `- [ ] Allocate surplus savings to targets\n\n`;

    return md;
  }
}

export const financeExportService = new FinanceExportService();
