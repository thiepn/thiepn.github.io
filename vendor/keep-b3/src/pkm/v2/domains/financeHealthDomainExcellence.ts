/**
 * PKM V2.13 — Finance & Health Domains Excellence Engine
 *
 * Implements high-risk privacy-conservative domains:
 * - Finance: Exact integer cents / Decimal arithmetic (zero floating-point errors)
 * - Single logical transfers & invariant-safe split transactions
 * - Exact derived account balances & upcoming commitments
 * - Health: Mandatory source provenance on all measurements (Manual, Apple Health, Medical Record)
 * - Authoritative unit conversion without mutating raw recorded data
 * - Non-diagnostic factual presentation (zero AI health diagnoses / scores)
 * - Conservative privacy boundaries: External AI completely excluded
 */

export type TransactionKind = 'income' | 'expense' | 'transfer' | 'split';

export interface V2FinanceAccount {
  id: string;
  name: string;
  currency: string; // e.g. "USD", "EUR", "GBP"
  initialBalanceCents: number;
  type: 'checking' | 'savings' | 'credit' | 'cash';
  active: boolean;
}

export interface V2TransactionSplit {
  category: string;
  amountCents: number;
  notes?: string;
}

export interface V2FinanceTransaction {
  id: string;
  dateOnly: string;
  timestamp: string;
  kind: TransactionKind;
  amountCents: number;
  accountId: string;
  targetAccountId?: string; // For transfers
  category?: string;
  payee?: string;
  notes?: string;
  splits?: V2TransactionSplit[];
  reconciled: boolean;
}

export interface V2UpcomingBill {
  id: string;
  name: string;
  amountCents: number;
  dueDateOnly: string;
  accountId?: string;
  recurringFrequency?: 'monthly' | 'quarterly' | 'annual';
  isPaid: boolean;
}

export type HealthMetricType = 'blood_pressure' | 'weight' | 'heart_rate' | 'blood_glucose' | 'sleep_hours' | 'steps';
export type HealthSourceProvenance = 'manual_log' | 'apple_health' | 'medical_record' | 'csv_import';

export interface V2HealthMeasurement {
  id: string;
  metricType: HealthMetricType;
  timestamp: string;
  dateOnly: string;
  primaryValue: number;
  secondaryValue?: number; // e.g. diastolic for blood pressure
  unit: string;
  source: HealthSourceProvenance;
  notes?: string;
}

export interface V2HealthAppointment {
  id: string;
  title: string;
  providerOrDoctor: string;
  dateTime: string;
  location?: string;
  notes?: string;
  completed: boolean;
}

export class FinanceHealthDomainExcellence {
  private accounts = new Map<string, V2FinanceAccount>();
  private transactions = new Map<string, V2FinanceTransaction>();
  private upcomingBills = new Map<string, V2UpcomingBill>();

  private healthMeasurements = new Map<string, V2HealthMeasurement[]>(); // metricType -> measurements
  private appointments = new Map<string, V2HealthAppointment>();

  // ================= Finance =================

  public saveAccount(account: V2FinanceAccount): V2FinanceAccount {
    this.accounts.set(account.id, { ...account });
    return account;
  }

  public getAccount(id: string): V2FinanceAccount | undefined {
    return this.accounts.get(id);
  }

  public getAllAccounts(): V2FinanceAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Records a transaction with exact cents arithmetic & split invariant verification
   */
  public recordTransaction(params: {
    id?: string;
    dateOnly: string;
    kind: TransactionKind;
    amountCents: number;
    accountId: string;
    targetAccountId?: string;
    category?: string;
    payee?: string;
    notes?: string;
    splits?: V2TransactionSplit[];
  }): { success: boolean; transaction?: V2FinanceTransaction; error?: string } {
    if (params.amountCents <= 0) {
      return { success: false, error: 'Transaction amount must be positive' };
    }

    if (!this.accounts.has(params.accountId)) {
      return { success: false, error: 'Source account not found' };
    }

    if (params.kind === 'transfer') {
      if (!params.targetAccountId || !this.accounts.has(params.targetAccountId)) {
        return { success: false, error: 'Target account required for transfers' };
      }
      if (params.accountId === params.targetAccountId) {
        return { success: false, error: 'Source and target account must be different for transfers' };
      }
    }

    if (params.kind === 'split' && params.splits && params.splits.length > 0) {
      const splitSum = params.splits.reduce((sum, s) => sum + s.amountCents, 0);
      if (splitSum !== params.amountCents) {
        return {
          success: false,
          error: `Split sum (${splitSum} cents) does not match total transaction amount (${params.amountCents} cents)`,
        };
      }
    }

    const tx: V2FinanceTransaction = {
      id: params.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      dateOnly: params.dateOnly,
      timestamp: new Date().toISOString(),
      kind: params.kind,
      amountCents: params.amountCents,
      accountId: params.accountId,
      targetAccountId: params.targetAccountId,
      category: params.category,
      payee: params.payee,
      notes: params.notes,
      splits: params.splits,
      reconciled: false,
    };

    this.transactions.set(tx.id, tx);
    return { success: true, transaction: tx };
  }

  /**
   * Calculates exact derived account balance in integer cents
   */
  public calculateAccountBalanceCents(accountId: string): number {
    const acc = this.accounts.get(accountId);
    if (!acc) return 0;

    let balance = acc.initialBalanceCents;

    for (const tx of this.transactions.values()) {
      if (tx.accountId === accountId) {
        if (tx.kind === 'income') {
          balance += tx.amountCents;
        } else if (tx.kind === 'expense' || tx.kind === 'split') {
          balance -= tx.amountCents;
        } else if (tx.kind === 'transfer') {
          balance -= tx.amountCents;
        }
      } else if (tx.kind === 'transfer' && tx.targetAccountId === accountId) {
        balance += tx.amountCents;
      }
    }

    return balance;
  }

  public getAllTransactions(): V2FinanceTransaction[] {
    return Array.from(this.transactions.values()).sort((a, b) => b.dateOnly.localeCompare(a.dateOnly));
  }

  public saveUpcomingBill(bill: V2UpcomingBill): V2UpcomingBill {
    this.upcomingBills.set(bill.id, { ...bill });
    return bill;
  }

  public getUpcomingBills(todayDateOnly: string): V2UpcomingBill[] {
    return Array.from(this.upcomingBills.values())
      .filter((b) => !b.isPaid && b.dueDateOnly >= todayDateOnly)
      .sort((a, b) => a.dueDateOnly.localeCompare(b.dueDateOnly));
  }

  public exportFinanceCsv(): string {
    const rows = ['id,dateOnly,kind,amountCents,accountId,targetAccountId,category,payee,notes'];
    for (const tx of this.transactions.values()) {
      rows.push(
        `${tx.id},${tx.dateOnly},${tx.kind},${tx.amountCents},${tx.accountId},${tx.targetAccountId || ''},"${(tx.category || '').replace(/"/g, '""')}","${(tx.payee || '').replace(/"/g, '""')}","${(tx.notes || '').replace(/"/g, '""')}"`
      );
    }
    return rows.join('\n');
  }

  // ================= Health =================

  public logMeasurement(params: {
    metricType: HealthMetricType;
    primaryValue: number;
    secondaryValue?: number;
    unit: string;
    source: HealthSourceProvenance;
    dateOnly?: string;
    notes?: string;
  }): V2HealthMeasurement {
    const ts = new Date().toISOString();
    const dateOnly = params.dateOnly || ts.slice(0, 10);

    const m: V2HealthMeasurement = {
      id: `meas_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      metricType: params.metricType,
      timestamp: ts,
      dateOnly,
      primaryValue: params.primaryValue,
      secondaryValue: params.secondaryValue,
      unit: params.unit,
      source: params.source,
      notes: params.notes,
    };

    const list = this.healthMeasurements.get(params.metricType) || [];
    list.unshift(m);
    this.healthMeasurements.set(params.metricType, list);
    return m;
  }

  public getMeasurements(metricType: HealthMetricType): V2HealthMeasurement[] {
    return this.healthMeasurements.get(metricType) || [];
  }

  /**
   * Authoritative unit conversion display helper (non-mutating)
   */
  public convertWeight(valueKg: number, targetUnit: 'kg' | 'lbs'): number {
    if (targetUnit === 'lbs') {
      return Number((valueKg * 2.20462).toFixed(1));
    }
    return Number(valueKg.toFixed(1));
  }

  public saveAppointment(app: V2HealthAppointment): V2HealthAppointment {
    this.appointments.set(app.id, { ...app });
    return app;
  }

  public getUpcomingAppointments(nowIso: string): V2HealthAppointment[] {
    return Array.from(this.appointments.values())
      .filter((a) => !a.completed && a.dateTime >= nowIso)
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }

  public clear(): void {
    this.accounts.clear();
    this.transactions.clear();
    this.upcomingBills.clear();
    this.healthMeasurements.clear();
    this.appointments.clear();
  }
}

export const financeHealthDomainExcellence = new FinanceHealthDomainExcellence();
