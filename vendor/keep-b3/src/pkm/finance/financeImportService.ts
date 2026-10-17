/**
 * Financial Data Import Engine for Phase P53 (CSV, OFX/QFX, QIF)
 * 
 * Supports locale-aware parsing, staging validation, multi-tier duplicate detection,
 * and rollback via import batches.
 */

import {
  StagedTransactionRow,
  FinanceImportBatch,
  FinanceTransaction,
  TransactionType,
} from './financeTypes';
import {
  createMoney,
  parseMoneyInput,
  DEFAULT_CURRENCY,
  absMoney,
  Money,
} from './money';
import { financeService } from './financeService';
import { financeStorage } from './financeStorage';

export interface CSVColumnMapping {
  dateCol: number;
  amountCol?: number;
  debitCol?: number;
  creditCol?: number;
  payeeCol?: number;
  descriptionCol?: number;
  categoryCol?: number;
  referenceCol?: number;
  hasHeader: boolean;
  dateFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'DD.MM.YYYY' | 'auto';
  numberFormat: '1234.56' | '1.234,56' | 'auto';
}

export class FinanceImportService {
  /**
   * Parse CSV content into raw rows
   */
  public parseCSVRaw(content: string, delimiter = ','): string[][] {
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const rows: string[][] = [];

    for (const line of lines) {
      const row: string[] = [];
      let inQuote = false;
      let currentVal = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuote && line[i + 1] === '"') {
            currentVal += '"';
            i++; // skip escaped quote
          } else {
            inQuote = !inQuote;
          }
        } else if (char === delimiter && !inQuote) {
          row.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      row.push(currentVal.trim());
      rows.push(row);
    }

    return rows;
  }

  /**
   * Automatically guesses CSV column mapping from headers and first rows
   */
  public detectCSVMapping(rows: string[][]): CSVColumnMapping {
    const mapping: CSVColumnMapping = {
      dateCol: 0,
      amountCol: 1,
      hasHeader: true,
      dateFormat: 'auto',
      numberFormat: 'auto',
    };

    if (!rows || rows.length === 0) return mapping;

    const firstRow = rows[0].map((h) => h.toLowerCase());

    firstRow.forEach((header, index) => {
      if (header.includes('date') || header.includes('datum') || header.includes('zeit')) {
        mapping.dateCol = index;
      } else if (header.includes('amount') || header.includes('betrag') || header.includes('valeur')) {
        mapping.amountCol = index;
      } else if (header.includes('debit') || header.includes('soll') || header.includes('ausgabe') || header.includes('charge')) {
        mapping.debitCol = index;
      } else if (header.includes('credit') || header.includes('haben') || header.includes('einnahme')) {
        mapping.creditCol = index;
      } else if (
        header.includes('payee') ||
        header.includes('empfänger') ||
        header.includes('merchant') ||
        header.includes('begünstigter') ||
        header.includes('name')
      ) {
        mapping.payeeCol = index;
      } else if (
        header.includes('memo') ||
        header.includes('desc') ||
        header.includes('verwendungszweck') ||
        header.includes('text') ||
        header.includes('details')
      ) {
        mapping.descriptionCol = index;
      } else if (header.includes('cat') || header.includes('kategorie')) {
        mapping.categoryCol = index;
      } else if (header.includes('ref') || header.includes('id') || header.includes('transaktion')) {
        mapping.referenceCol = index;
      }
    });

    return mapping;
  }

  /**
   * Parses standard CSV into Staged Transaction Rows
   */
  public stageCSV(
    content: string,
    targetAccountId: string,
    mapping: CSVColumnMapping,
    currency = DEFAULT_CURRENCY
  ): StagedTransactionRow[] {
    const delimiter = content.includes(';') && !content.includes(',') ? ';' : ',';
    const rows = this.parseCSVRaw(content, delimiter);

    const startIndex = mapping.hasHeader ? 1 : 0;
    const staged: StagedTransactionRow[] = [];

    const existingTxs = financeService.getTransactionsForAccount(targetAccountId);

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (row.length <= Math.max(mapping.dateCol, mapping.amountCol || 0)) continue;

      const rawDate = row[mapping.dateCol] || '';
      const parsedDate = this.parseDateString(rawDate, mapping.dateFormat);
      if (!parsedDate) continue;

      let rawAmountStr = '';
      let isExplicitDebit = false;
      let isExplicitCredit = false;

      if (mapping.amountCol !== undefined && row[mapping.amountCol] !== undefined) {
        rawAmountStr = row[mapping.amountCol];
      } else if (mapping.debitCol !== undefined && row[mapping.debitCol]) {
        rawAmountStr = row[mapping.debitCol];
        isExplicitDebit = true;
      } else if (mapping.creditCol !== undefined && row[mapping.creditCol]) {
        rawAmountStr = row[mapping.creditCol];
        isExplicitCredit = true;
      }

      if (!rawAmountStr) continue;

      const parsedMoney = parseMoneyInput(rawAmountStr, currency);
      if (parsedMoney.amountMinor === 0) continue;

      let type: TransactionType = 'expense';
      let amountMagnitude = absMoney(parsedMoney);

      if (isExplicitCredit) {
        type = 'income';
      } else if (isExplicitDebit) {
        type = 'expense';
      } else if (parsedMoney.amountMinor > 0) {
        type = 'income';
      } else {
        type = 'expense';
      }

      const payee = mapping.payeeCol !== undefined ? row[mapping.payeeCol] || '' : '';
      const description = mapping.descriptionCol !== undefined ? row[mapping.descriptionCol] || '' : '';
      const rawDescription = `${payee} ${description}`.trim() || row.join(' | ');
      const reference = mapping.referenceCol !== undefined ? row[mapping.referenceCol] : undefined;

      // Duplicate Check
      const dupResult = this.detectDuplicate(
        parsedDate,
        amountMagnitude,
        type,
        payee || description,
        reference,
        existingTxs
      );

      staged.push({
        id: `staged-${i}-${Date.now()}`,
        date: parsedDate,
        type,
        amount: amountMagnitude,
        payee: payee || undefined,
        rawDescription,
        referenceNumber: reference,
        isDuplicate: dupResult.isDuplicate,
        duplicateConfidence: dupResult.confidence,
        duplicateReason: dupResult.reason,
        existingMatchedTransactionId: dupResult.matchedId,
        selected: !dupResult.isDuplicate, // Default to skipping duplicates
      });
    }

    return staged;
  }

  /**
   * Parses OFX / QFX statement files into Staged Transaction Rows
   */
  public stageOFX(
    content: string,
    targetAccountId: string,
    currency = DEFAULT_CURRENCY
  ): StagedTransactionRow[] {
    const staged: StagedTransactionRow[] = [];
    const existingTxs = financeService.getTransactionsForAccount(targetAccountId);

    // Extract all <STMTTRN>...</STMTTRN> blocks
    const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = stmttrnRegex.exec(content)) !== null) {
      const block = match[1];
      const trntype = this.extractOFXTag(block, 'TRNTYPE') || 'OTHER';
      const dtposted = this.extractOFXTag(block, 'DTPOSTED') || '';
      const trnamt = this.extractOFXTag(block, 'TRNAMT') || '0';
      const fitid = this.extractOFXTag(block, 'FITID') || '';
      const name = this.extractOFXTag(block, 'NAME') || '';
      const memo = this.extractOFXTag(block, 'MEMO') || '';

      const parsedDate = this.parseOFXDate(dtposted);
      if (!parsedDate) continue;

      const money = parseMoneyInput(trnamt, currency);
      const isPositive = money.amountMinor > 0;
      const type: TransactionType = isPositive ? 'income' : 'expense';
      const amountMagnitude = absMoney(money);

      const rawDescription = `${name} ${memo}`.trim();

      const dupResult = this.detectDuplicate(
        parsedDate,
        amountMagnitude,
        type,
        name || memo,
        fitid,
        existingTxs
      );

      staged.push({
        id: `staged-ofx-${index++}-${Date.now()}`,
        date: parsedDate,
        type,
        amount: amountMagnitude,
        payee: name || undefined,
        rawDescription,
        fitid,
        referenceNumber: fitid,
        isDuplicate: dupResult.isDuplicate,
        duplicateConfidence: dupResult.confidence,
        duplicateReason: dupResult.reason,
        existingMatchedTransactionId: dupResult.matchedId,
        selected: !dupResult.isDuplicate,
      });
    }

    return staged;
  }

  /**
   * Parses QIF files into Staged Transaction Rows
   */
  public stageQIF(
    content: string,
    targetAccountId: string,
    currency = DEFAULT_CURRENCY
  ): StagedTransactionRow[] {
    const staged: StagedTransactionRow[] = [];
    const existingTxs = financeService.getTransactionsForAccount(targetAccountId);

    const items = content.split('^').map((s) => s.trim()).filter(Boolean);
    let index = 0;

    for (const item of items) {
      const lines = item.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let dateStr = '';
      let amountStr = '';
      let payee = '';
      let memo = '';
      let checkNum = '';
      let category = '';

      for (const line of lines) {
        const code = line[0];
        const val = line.substring(1).trim();
        switch (code) {
          case 'D':
            dateStr = val;
            break;
          case 'T':
          case 'U':
            amountStr = val;
            break;
          case 'P':
            payee = val;
            break;
          case 'M':
            memo = val;
            break;
          case 'N':
            checkNum = val;
            break;
          case 'L':
            category = val;
            break;
        }
      }

      const parsedDate = this.parseDateString(dateStr, 'auto');
      if (!parsedDate || !amountStr) continue;

      const money = parseMoneyInput(amountStr, currency);
      const isPositive = money.amountMinor > 0;
      const type: TransactionType = isPositive ? 'income' : 'expense';
      const amountMagnitude = absMoney(money);

      const rawDescription = `${payee} ${memo}`.trim();

      const dupResult = this.detectDuplicate(
        parsedDate,
        amountMagnitude,
        type,
        payee || memo,
        checkNum,
        existingTxs
      );

      staged.push({
        id: `staged-qif-${index++}-${Date.now()}`,
        date: parsedDate,
        type,
        amount: amountMagnitude,
        payee: payee || undefined,
        rawDescription,
        referenceNumber: checkNum,
        isDuplicate: dupResult.isDuplicate,
        duplicateConfidence: dupResult.confidence,
        duplicateReason: dupResult.reason,
        existingMatchedTransactionId: dupResult.matchedId,
        selected: !dupResult.isDuplicate,
      });
    }

    return staged;
  }

  /**
   * Commits staged transactions into the official ledger
   */
  public commitImport(params: {
    targetAccountId: string;
    filename: string;
    fileFormat: 'csv' | 'ofx' | 'qfx' | 'qif';
    stagedRows: StagedTransactionRow[];
  }): FinanceImportBatch {
    const { targetAccountId, filename, fileFormat, stagedRows } = params;

    const selectedRows = stagedRows.filter((r) => r.selected);
    const skippedCount = stagedRows.length - selectedRows.length;

    const batchId = `imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const createdTxIds: string[] = [];

    const newTransactions: FinanceTransaction[] = selectedRows.map((row) => {
      const txId = `tx-${now}-${Math.random().toString(36).slice(2, 7)}`;
      createdTxIds.push(txId);

      const rawTx: FinanceTransaction = {
        id: txId,
        accountId: targetAccountId,
        date: row.date,
        postingDate: row.postingDate,
        type: row.type,
        amount: row.amount,
        payee: row.payee,
        rawDescription: row.rawDescription,
        categoryId: row.categoryId,
        status: 'cleared',
        source: {
          type: 'import',
          importBatchId: batchId,
          rawRowId: row.id,
        },
        createdAt: now,
        updatedAt: now,
      };

      return financeService.applyRulesToTransaction(rawTx);
    });

    const all = [...newTransactions, ...financeService.getTransactions()];
    financeStorage.saveTransactions(all);

    const batch: FinanceImportBatch = {
      id: batchId,
      filename,
      fileFormat,
      importedAt: now,
      targetAccountId,
      totalRows: stagedRows.length,
      importedCount: newTransactions.length,
      skippedDuplicateCount: skippedCount,
      transactionIds: createdTxIds,
    };

    const batches = [batch, ...financeStorage.getImportBatches()];
    financeStorage.saveImportBatches(batches);

    return batch;
  }

  /**
   * Rolls back an entire import batch safely
   */
  public rollbackImport(batchId: string): boolean {
    const batches = financeStorage.getImportBatches();
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return false;

    // Delete all transactions created in this batch
    financeService.deleteTransactionsBatch(batch.transactionIds);

    // Remove batch record
    const remainingBatches = batches.filter((b) => b.id !== batchId);
    financeStorage.saveImportBatches(remainingBatches);

    return true;
  }

  /**
   * Multi-Tier Duplicate Detection Engine
   */
  private detectDuplicate(
    date: string,
    amount: Money,
    type: TransactionType,
    payeeOrDesc: string,
    refId?: string,
    existingTxs: FinanceTransaction[] = []
  ): { isDuplicate: boolean; confidence?: 'exact' | 'likely' | 'possible'; reason?: string; matchedId?: string } {
    const cleanPayee = (payeeOrDesc || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Exact Reference / FITID Match
    if (refId) {
      const match = existingTxs.find(
        (t) =>
          (t.source?.rawRowId === refId ||
            (t.rawDescription && t.rawDescription.includes(refId))) &&
          t.amount.amountMinor === amount.amountMinor
      );
      if (match) {
        return {
          isDuplicate: true,
          confidence: 'exact',
          reason: `Exact match on reference ID "${refId}"`,
          matchedId: match.id,
        };
      }
    }

    // 2. Exact Match on Date + Amount + Payee
    const exactMatch = existingTxs.find(
      (t) =>
        t.date === date &&
        t.amount.amountMinor === amount.amountMinor &&
        t.type === type &&
        cleanPayee &&
        (t.payee || t.rawDescription || '').toLowerCase().replace(/[^a-z0-9]/g, '') === cleanPayee
    );

    if (exactMatch) {
      return {
        isDuplicate: true,
        confidence: 'exact',
        reason: `Existing transaction on ${date} for ${amount.amountMinor / 100} with same payee`,
        matchedId: exactMatch.id,
      };
    }

    // 3. Likely Match on Date (±1 Day) + Amount + Similar Payee
    const targetTime = new Date(date).getTime();
    const likelyMatch = existingTxs.find((t) => {
      const tTime = new Date(t.date).getTime();
      const diffDays = Math.abs(tTime - targetTime) / (1000 * 60 * 60 * 24);
      if (diffDays <= 1 && t.amount.amountMinor === amount.amountMinor && t.type === type) {
        if (!cleanPayee) return true;
        const otherPayee = (t.payee || t.rawDescription || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return otherPayee.includes(cleanPayee) || cleanPayee.includes(otherPayee);
      }
      return false;
    });

    if (likelyMatch) {
      return {
        isDuplicate: true,
        confidence: 'likely',
        reason: `Similar transaction within 1 day (${likelyMatch.date}) for ${amount.amountMinor / 100}`,
        matchedId: likelyMatch.id,
      };
    }

    return { isDuplicate: false };
  }

  private extractOFXTag(block: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
    const match = regex.exec(block);
    return match ? match[1].trim() : null;
  }

  private parseOFXDate(dtposted: string): string | null {
    if (!dtposted || dtposted.length < 8) return null;
    const y = dtposted.substring(0, 4);
    const m = dtposted.substring(4, 6);
    const d = dtposted.substring(6, 8);
    return `${y}-${m}-${d}`;
  }

  private parseDateString(raw: string, format: string): string | null {
    if (!raw) return null;
    const clean = raw.trim();

    // Already ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }

    // DD.MM.YYYY (German / European)
    const dotMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(clean);
    if (dotMatch) {
      const d = dotMatch[1].padStart(2, '0');
      const m = dotMatch[2].padStart(2, '0');
      const y = dotMatch[3];
      return `${y}-${m}-${d}`;
    }

    // MM/DD/YYYY or DD/MM/YYYY
    const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(clean);
    if (slashMatch) {
      const p1 = slashMatch[1].padStart(2, '0');
      const p2 = slashMatch[2].padStart(2, '0');
      const y = slashMatch[3];

      if (format === 'DD/MM/YYYY' || parseInt(p1, 10) > 12) {
        return `${y}-${p2}-${p1}`; // Day first
      }
      return `${y}-${p1}-${p2}`; // Month first default
    }

    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }

    return null;
  }
}

export const financeImportService = new FinanceImportService();
