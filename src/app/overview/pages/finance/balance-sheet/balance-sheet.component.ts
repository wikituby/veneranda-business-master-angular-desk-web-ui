import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';

interface BalanceLine {
  label: string;
  amount: number;
  indent?: boolean;
  emphasis?: boolean;
  note?: string;
}

interface CategoryRow {
  name: string;
  amount: number;
}

@Component({
  selector: 'app-balance-sheet',
  templateUrl: './balance-sheet.component.html',
  styleUrls: ['./balance-sheet.component.css']
})
export class BalanceSheetComponent implements OnInit {
  isDarkMode = false;
  isLoading = false;
  loadError = '';

  asOfDate = '';
  periodFrom = '';
  periodTo = '';

  /** Snapshot figures */
  cashOnHand = 0;
  mobileMoney = 0;
  bankAndCard = 0;
  accountsReceivable = 0;
  fixedAssetCount = 0;
  totalAssets = 0;

  accountsPayable = 0;
  totalLiabilities = 0;
  retainedEarnings = 0;
  totalEquity = 0;

  /** Period income statement */
  periodRevenue = 0;
  periodOtcRevenue = 0;
  periodExpenses = 0;
  periodNetIncome = 0;

  assetLines: BalanceLine[] = [];
  liabilityLines: BalanceLine[] = [];
  equityLines: BalanceLine[] = [];
  incomeLines: BalanceLine[] = [];

  revenueByMethod: CategoryRow[] = [];
  expensesByCategory: CategoryRow[] = [];

  receivableVisits = 0;
  totalPaymentsCount = 0;
  totalExpenseCount = 0;

  private allPayments: any[] = [];
  private allExpenses: any[] = [];
  private debtVisits: any[] = [];

  constructor(
    private router: Router,
    private api: ApiService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    if (!sessionStorage.getItem('username')) {
      this.router.navigate(['/login']);
      return;
    }

    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    this.initDefaultDates();
    this.loadBalanceSheet();
  }

  initDefaultDates(): void {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.asOfDate = this.toIsoDate(today);
    this.periodFrom = this.toIsoDate(startOfMonth);
    this.periodTo = this.toIsoDate(today);
  }

  loadBalanceSheet(): void {
    this.isLoading = true;
    this.loadError = '';

    const emptyList = of([]);
    const emptySummary = of({});

    forkJoin({
      payments: this.api.getItemsAdvancedSearchDteEmptyDashBoard({
        paidBy: '',
        receivedBy: '',
        paymentForm: ''
      }).pipe(catchError(() => emptyList)),
      expenses: this.api.getAllExpensesMade().pipe(catchError(() => emptyList)),
      summary: this.api.getDashboardSummary().pipe(catchError(() => emptySummary)),
      assets: this.api.getAllAssets().pipe(catchError(() => emptyList)),
      otc: this.api.listOtcPharmacySales(this.periodFrom, this.periodTo).pipe(catchError(() => emptyList))
    }).subscribe({
      next: (res) => {
        this.allPayments = Array.isArray(res.payments) ? res.payments : [];
        this.allExpenses = Array.isArray(res.expenses) ? res.expenses : [];
        this.debtVisits = [];
        const assetList = Array.isArray(res.assets)
          ? res.assets
          : Array.isArray((res.assets as any)?.data)
            ? (res.assets as any).data
            : [];
        const otcSales = Array.isArray(res.otc) ? res.otc : [];
        const summary: any = res.summary || {};

        this.fixedAssetCount = assetList.length;
        this.totalPaymentsCount = this.allPayments.length;
        this.totalExpenseCount = this.allExpenses.length;
        this.accountsReceivable = this.toNumber(
          summary.outstandingPayments ?? summary.OutstandingPayments ?? 0
        );
        this.receivableVisits = this.accountsReceivable > 0 ? 1 : 0;

        this.computeSnapshot();
        this.computePeriodStatement(otcSales);
        this.buildDisplayLines();
        this.isLoading = false;

        if (
          this.allPayments.length === 0 &&
          this.allExpenses.length === 0 &&
          this.fixedAssetCount === 0
        ) {
          this.loadError =
            'No financial records returned. Confirm the app is connected to the backend on port 8080.';
        }
      },
      error: () => {
        this.loadError = 'Could not load financial data. Check your connection and try again.';
        this.isLoading = false;
      }
    });
  }

  applyPeriodPreset(preset: 'month' | 'quarter' | 'year' | 'all'): void {
    const today = new Date();
    let from = new Date(today);

    switch (preset) {
      case 'month':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'quarter': {
        const qMonth = Math.floor(today.getMonth() / 3) * 3;
        from = new Date(today.getFullYear(), qMonth, 1);
        break;
      }
      case 'year':
        from = new Date(today.getFullYear(), 0, 1);
        break;
      case 'all':
        from = new Date(2000, 0, 1);
        break;
    }

    this.periodFrom = this.toIsoDate(from);
    this.periodTo = this.toIsoDate(today);
    this.asOfDate = this.periodTo;
    this.loadBalanceSheet();
  }

  private computeSnapshot(): void {
    const asOf = this.asOfDate || this.toIsoDate(new Date());
    const approvedToDate = this.allPayments.filter(
      p => this.isApproved(p) && this.isOnOrBefore(this.normalizeDate(p.dateOfPayment), asOf)
    );
    const expensesToDate = this.allExpenses.filter(
      e => this.isOnOrBefore(this.normalizeDate(e.dateOfExpenseTransaction), asOf)
    );

    this.cashOnHand = this.sumByPaymentForm(approvedToDate, 'Cash At Hand');
    this.mobileMoney = this.sumByPaymentForm(approvedToDate, 'Mobile Money');
    this.bankAndCard =
      this.sumByPaymentForm(approvedToDate, 'Bank Transfer') +
      this.sumByPaymentForm(approvedToDate, 'Card');

    const totalCollected = approvedToDate.reduce(
      (sum, p) => sum + this.toNumber(p.amountToPay),
      0
    );
    const totalPaidOut = expensesToDate.reduce(
      (sum, e) => sum + this.toNumber(e.amountTransacted),
      0
    );

    const netCash = Math.max(0, totalCollected - totalPaidOut);
    const methodTotal = this.cashOnHand + this.mobileMoney + this.bankAndCard;
    if (methodTotal > 0 && methodTotal !== netCash) {
      const ratio = netCash / methodTotal;
      this.cashOnHand *= ratio;
      this.mobileMoney *= ratio;
      this.bankAndCard *= ratio;
    } else if (methodTotal === 0) {
      this.cashOnHand = netCash;
    }

    this.accountsReceivable = this.accountsReceivable || this.debtVisits.reduce(
      (sum, v) => sum + this.toNumber(v.balanceDue ?? v.totalAmountDue),
      0
    );

    this.totalAssets = this.cashOnHand + this.mobileMoney + this.bankAndCard + this.accountsReceivable;
    this.accountsPayable = 0;
    this.totalLiabilities = this.accountsPayable;
    this.retainedEarnings = this.totalAssets - this.totalLiabilities;
    this.totalEquity = this.retainedEarnings;
  }

  private computePeriodStatement(otcSales: any[]): void {
    const from = this.periodFrom;
    const to = this.periodTo || this.asOfDate;

    const periodPayments = this.allPayments.filter(p => {
      if (!this.isApproved(p)) {
        return false;
      }
      if (this.isPharmacyTaggedPayment(p)) {
        return false;
      }
      const d = this.normalizeDate(p.dateOfPayment);
      return this.isInRange(d, from, to);
    });

    this.periodRevenue = periodPayments.reduce(
      (sum, p) => sum + this.toNumber(p.amountToPay),
      0
    );

    // Total sells from items sold (drugs, sundries, all product categories).
    this.periodOtcRevenue = otcSales
      .filter(s => {
        if (this.isReversedSaleLine(s)) {
          return false;
        }
        return this.isInRange(
          this.normalizeDate(s.saleDate ?? s.dateOfSale ?? s.createdAt),
          from,
          to
        );
      })
      .reduce((sum, s) => {
        const lineSell = this.toNumber(s.totalAmount ?? s.lineTotal);
        if (lineSell > 0) {
          return sum + lineSell;
        }
        return sum + this.toNumber(s.quantity) * this.toNumber(s.unitSellingPrice);
      }, 0);

    const periodExpenses = this.allExpenses.filter(e =>
      this.isInRange(this.normalizeDate(e.dateOfExpenseTransaction), from, to)
    );

    this.periodExpenses = periodExpenses.reduce(
      (sum, e) => sum + this.toNumber(e.amountTransacted),
      0
    );

    this.periodNetIncome = this.periodRevenue + this.periodOtcRevenue - this.periodExpenses;

    this.revenueByMethod = this.groupPaymentsByMethod(periodPayments);
    this.expensesByCategory = this.groupExpensesByCategory(periodExpenses);
  }

  private isPharmacyTaggedPayment(payment: any): boolean {
    const notes = String(payment?.notes ?? '').toLowerCase();
    const form = String(payment?.paymentForm ?? '').toLowerCase();
    const receivedBy = String(payment?.receivedBy ?? '').toLowerCase();
    return (
      notes.includes('pharmacy') ||
      notes.includes('prescription') ||
      notes.includes('otc') ||
      notes.includes('dispens') ||
      form.includes('pharmacy') ||
      receivedBy === 'pharmacy'
    );
  }

  private isReversedSaleLine(row: any): boolean {
    const r = row?.reversed;
    return r === true || r === 1 || `${r}` === '1';
  }

  private buildDisplayLines(): void {
    this.assetLines = [
      { label: 'Current assets', amount: 0, emphasis: true },
      { label: 'Cash on hand', amount: this.cashOnHand, indent: true },
      { label: 'Mobile money', amount: this.mobileMoney, indent: true },
      { label: 'Bank & card', amount: this.bankAndCard, indent: true },
      { label: 'Accounts receivable', amount: this.accountsReceivable, indent: true, note: this.accountsReceivable > 0 ? 'From pending / outstanding payments' : 'No outstanding receivables' },
      { label: 'Total current assets', amount: this.cashOnHand + this.mobileMoney + this.bankAndCard + this.accountsReceivable, emphasis: true },
      { label: 'Non-current assets', amount: 0, emphasis: true },
      { label: 'Fixed assets (register)', amount: 0, indent: true, note: `${this.fixedAssetCount} asset(s) on register` },
      { label: 'Total assets', amount: this.totalAssets, emphasis: true }
    ];

    this.liabilityLines = [
      { label: 'Current liabilities', amount: 0, emphasis: true },
      { label: 'Accounts payable', amount: this.accountsPayable, indent: true, note: 'Not tracked in system' },
      { label: 'Total liabilities', amount: this.totalLiabilities, emphasis: true }
    ];

    this.equityLines = [
      { label: 'Retained earnings / fund balance', amount: this.retainedEarnings, indent: true },
      { label: 'Total equity', amount: this.totalEquity, emphasis: true }
    ];

    this.incomeLines = [
      { label: 'Services payment', amount: this.periodRevenue, indent: true, note: 'Payments from services offered' },
      { label: 'Products sold', amount: this.periodOtcRevenue, indent: true, note: 'Drugs, sundries & all product categories' },
      { label: 'Total income', amount: this.periodRevenue + this.periodOtcRevenue, emphasis: true },
      { label: 'Operating expenses', amount: this.periodExpenses, indent: true },
      { label: 'Net income', amount: this.periodNetIncome, emphasis: true }
    ];
  }

  private groupPaymentsByMethod(payments: any[]): CategoryRow[] {
    const map = new Map<string, number>();
    for (const p of payments) {
      const key = (p.paymentForm || 'Other').trim();
      map.set(key, (map.get(key) || 0) + this.toNumber(p.amountToPay));
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  private groupExpensesByCategory(expenses: any[]): CategoryRow[] {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const key = (e.expenseAccountName || e.expenseCategoryName || 'Uncategorized').trim();
      map.set(key, (map.get(key) || 0) + this.toNumber(e.amountTransacted));
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  private sumByPaymentForm(payments: any[], form: string): number {
    return payments
      .filter(p => (p.paymentForm || '').trim() === form)
      .reduce((sum, p) => sum + this.toNumber(p.amountToPay), 0);
  }

  private isApproved(payment: any): boolean {
    return (payment.status || '').toLowerCase() === 'approved';
  }

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private normalizeDate(value: any): string {
    if (!value) {
      return '';
    }
    let raw = '';
    if (typeof value === 'string') {
      raw = value.trim();
    } else if (value instanceof Date) {
      return this.toIsoDate(value);
    } else {
      raw = String(value).trim();
    }
    // Backend often returns yyyy/MM/dd or yyyy-MM-dd (sometimes with time).
    const match = raw.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, '0');
      const d = match[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return raw.substring(0, 10);
  }

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private isOnOrBefore(date: string, asOf: string): boolean {
    if (!date) {
      return true;
    }
    return date <= asOf;
  }

  private isInRange(date: string, from: string, to: string): boolean {
    if (!date) {
      return false;
    }
    if (from && date < from) {
      return false;
    }
    if (to && date > to) {
      return false;
    }
    return true;
  }

  formatAmount(amount: number): string {
    return `UGX ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  formatPeriodLabel(): string {
    if (this.periodFrom && this.periodTo) {
      return `${this.formatDisplayDate(this.periodFrom)} – ${this.formatDisplayDate(this.periodTo)}`;
    }
    return 'Selected period';
  }

  formatDisplayDate(iso: string): string {
    if (!iso) {
      return '—';
    }
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  isBalanced(): boolean {
    return Math.abs(this.totalAssets - (this.totalLiabilities + this.totalEquity)) < 1;
  }

  goToCashier(): void {
    this.router.navigate(['/overview/cashier']);
  }

  goToExpenses(): void {
    this.router.navigate(['/overview/expenses']);
  }

  printReport(): void {
    window.print();
  }
}
