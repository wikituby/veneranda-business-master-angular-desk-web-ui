import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';

type CashierTab = 'transactions' | 'receive' | 'debts';

@Component({
  selector: 'app-cashier',
  templateUrl: './cashier.component.html',
  styleUrls: ['./cashier.component.css']
})
export class CashierComponent implements OnInit {
  isDarkMode = false;
  isLoading = false;
  isSaving = false;
  isSearchingVisits = false;
  responseMessage = '';
  responseError = '';

  activeTab: CashierTab = 'debts';
  searchQuery = '';
  statusFilter = '';
  paymentFormFilter = '';
  dateFromFilter = '';
  dateToFilter = '';

  currentPage = 1;
  itemsPerPage = 12;

  payments: any[] = [];
  visitSearchQuery = '';
  visitResults: any[] = [];
  selectedVisit: any = null;
  visitBalance: number | null = null;

  showReceiptModal = false;
  selectedPayment: any = null;

  /** Clients with outstanding debt */
  debtClients: any[] = [];
  debtSearch = '';
  loadingDebtClients = false;

  /** Client → visits drill-down */
  selectedDebtClient: any = null;
  debtVisits: any[] = [];
  loadingDebtVisits = false;

  /** Visit → line items */
  selectedDebtVisit: any = null;
  debtTreatments: any[] = [];
  debtProcedures: any[] = [];
  loadingDebtLines = false;
  /** null = category cards; 'treatment' | 'procedure' = line list */
  debtLineGroupDetail: 'treatment' | 'procedure' | null = null;

  /** Pay modal (FIFO client / visit / line) */
  showDebtPayModal = false;
  debtPayMode: 'client' | 'visit' | 'line' = 'client';
  /** Client targeted by pay modal (does not change drill-down navigation). */
  debtPayClient: any = null;
  debtPayTitle = '';
  debtPaySubtitle = '';
  debtPayTotalDue = 0;
  debtPayForm = {
    amountToPay: null as number | null,
    paymentForm: 'Cash At Hand',
    notes: 'Cashier desk payment',
  };
  debtPayAllocation: { visitNumber: any; balanceDue: number; allocated: number }[] = [];
  private _debtPayVisitsForAlloc: any[] = [];
  debtPaySaving = false;
  debtPayMessage = '';
  debtPayLineLabel = '';

  paymentForm = {
    amountToPay: null as number | null,
    paymentForm: 'Cash At Hand',
    status: 'Approved',
    notes: 'Payment Received with Thanks',
    paidBy: ''
  };

  paymentMethods = [
    { id: 'Cash At Hand', label: 'Cash', icon: 'bi bi-cash' },
    { id: 'Mobile Money', label: 'Mobile Money', icon: 'bi bi-phone' },
    { id: 'Bank Transfer', label: 'Bank Transfer', icon: 'bi bi-bank' },
    { id: 'Card', label: 'Card', icon: 'bi bi-credit-card' }
  ];

  private userName = '';

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

    this.userName = sessionStorage.getItem('username') || '';
    this.paymentForm.paidBy = this.userName;

    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    this.loadPayments();
    this.loadDebtClients();
  }

  get todayTransactions(): number {
    const today = this.todayIso();
    return this.payments.filter(p => this.normalizeDate(p.dateOfPayment) === today).length;
  }

  get todayAmount(): number {
    const today = this.todayIso();
    return this.payments
      .filter(p => this.normalizeDate(p.dateOfPayment) === today)
      .reduce((sum, p) => sum + this.toNumber(p.amountToPay), 0);
  }

  get pendingPayments(): number {
    return this.payments.filter(p => (p.status || '').toLowerCase() === 'pending').length;
  }

  get approvedToday(): number {
    const today = this.todayIso();
    return this.payments.filter(
      p => this.normalizeDate(p.dateOfPayment) === today && (p.status || '').toLowerCase() === 'approved'
    ).length;
  }

  get filteredPayments(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.payments.filter(item => {
      const matchesSearch = !q || [
        item.receiptNumber,
        item.paidBy,
        item.receivedBy,
        item.paymentForm,
        item.notes,
        item.amountToPay,
        item.dateOfPayment,
        item.timeOfPayment,
        item.status
      ].some(v => (v ?? '').toString().toLowerCase().includes(q));

      const matchesStatus = !this.statusFilter ||
        (item.status || '').toLowerCase() === this.statusFilter.toLowerCase();

      const matchesForm = !this.paymentFormFilter || item.paymentForm === this.paymentFormFilter;

      const paymentDate = this.normalizeDate(item.dateOfPayment);
      const matchesDateFrom = !this.dateFromFilter ||
        (paymentDate !== '' && paymentDate >= this.dateFromFilter);
      const matchesDateTo = !this.dateToFilter ||
        (paymentDate !== '' && paymentDate <= this.dateToFilter);
      const matchesDate = matchesDateFrom && matchesDateTo;

      return matchesSearch && matchesStatus && matchesForm && matchesDate;
    });
  }

  get paginatedPayments(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredPayments.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPayments.length / this.itemsPerPage));
  }

  setTab(tab: CashierTab): void {
    this.activeTab = tab;
    this.searchQuery = '';
    this.statusFilter = '';
    this.paymentFormFilter = '';
    this.dateFromFilter = '';
    this.dateToFilter = '';
    this.currentPage = 1;
    if (tab === 'receive' && this.visitResults.length === 0) {
      this.loadRecentVisits();
    }
    if (tab === 'debts') {
      this.loadDebtClients();
    }
  }

  loadDebtClients(): void {
    this.loadingDebtClients = true;
    this.api.getClientsWithDebt().subscribe({
      next: (rows: any) => {
        const list = Array.isArray(rows) ? rows : [];
        this.debtClients = list
          .filter((p) => this.clientDebt(p) > 0)
          .sort((a, b) => this.clientDebt(b) - this.clientDebt(a));
        this.loadingDebtClients = false;
      },
      error: () => {
        this.debtClients = [];
        this.loadingDebtClients = false;
        this.showError('Failed to load clients with debt');
      },
    });
  }

  get filteredDebtClients(): any[] {
    const q = this.debtSearch.trim().toLowerCase();
    if (!q) {
      return this.debtClients;
    }
    return this.debtClients.filter((p) => {
      const name = this.clientName(p).toLowerCase();
      const phone = String(p?.clientContact ?? p?.phone ?? '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }

  clientDebt(p: any): number {
    return this.toNumber(p?.totalAmountDue ?? p?.totalBalanceDue ?? p?.balanceDue);
  }

  clientName(p: any): string {
    const first = String(p?.clientFirstName ?? '').trim();
    const second = String(p?.clientSecondName ?? '').trim();
    const full = `${first} ${second}`.trim();
    return full || String(p?.clientName ?? `Client #${p?.id ?? ''}`);
  }

  openDebtClient(client: any): void {
    this.selectedDebtClient = client;
    this.selectedDebtVisit = null;
    this.debtLineGroupDetail = null;
    this.debtTreatments = [];
    this.debtProcedures = [];
    this.loadingDebtVisits = true;
    this.api.getInitialTriageVitalsForVisitId(client.id).subscribe({
      next: (visits) => {
        const list = Array.isArray(visits) ? visits : [];
        this.debtVisits = list
          .filter((v) => this.toNumber(v?.balanceDue) > 0)
          .sort((a, b) => {
            const an = this.toNumber(a?.visitNumber ?? a?.id);
            const bn = this.toNumber(b?.visitNumber ?? b?.id);
            return an - bn;
          });
        this.loadingDebtVisits = false;
      },
      error: () => {
        this.debtVisits = [];
        this.loadingDebtVisits = false;
        this.showError('Could not load visits for this client');
      },
    });
  }

  backToDebtClients(): void {
    this.selectedDebtClient = null;
    this.selectedDebtVisit = null;
    this.debtLineGroupDetail = null;
    this.debtVisits = [];
    this.debtTreatments = [];
    this.debtProcedures = [];
    this.loadDebtClients();
  }

  backToDebtVisits(): void {
    this.selectedDebtVisit = null;
    this.debtLineGroupDetail = null;
    this.debtTreatments = [];
    this.debtProcedures = [];
    if (this.selectedDebtClient) {
      this.openDebtClient(this.selectedDebtClient);
    }
  }

  backToDebtVisitGroups(): void {
    this.debtLineGroupDetail = null;
  }

  openDebtVisit(visit: any): void {
    this.selectedDebtVisit = visit;
    this.debtLineGroupDetail = null;
    this.loadingDebtLines = true;
    const visitId = visit?.id;
    this.api.getTreatmentRequestedByVisit(visitId).subscribe({
      next: (rows) => {
        this.debtTreatments = (Array.isArray(rows) ? rows : []).filter(
          (t) => String(t?.status ?? '').toLowerCase() !== 'cancelled' && this.lineAmount(t) > 0
        );
      },
      error: () => {
        this.debtTreatments = [];
      },
    });
    this.api.getOtherProceduresByVisit(visitId).subscribe({
      next: (rows: any) => {
        this.debtProcedures = (Array.isArray(rows) ? rows : []).filter(
          (p) => this.lineAmount(p) > 0
        );
        this.loadingDebtLines = false;
      },
      error: () => {
        this.debtProcedures = [];
        this.loadingDebtLines = false;
      },
    });
  }

  lineAmount(row: any): number {
    const total = this.toNumber(row?.totalAmount);
    if (total > 0) {
      return total;
    }
    return this.toNumber(row?.quantity || 1) * this.toNumber(row?.unitSellingPrice);
  }

  lineName(row: any, kind: 'treatment' | 'procedure'): string {
    if (kind === 'treatment') {
      return String(row?.itemName ?? row?.title ?? 'Treatment');
    }
    const name = String(
      row?.procedureRequestedName ??
        row?.exam ??
        row?.procedureName ??
        row?.itemName ??
        row?.title ??
        row?.name ??
        ''
    ).trim();
    return name || 'Procedure';
  }

  get debtTreatmentsTotal(): number {
    return this.debtTreatments.reduce((sum, row) => sum + this.lineAmount(row), 0);
  }

  get debtProceduresTotal(): number {
    return this.debtProcedures.reduce((sum, row) => sum + this.lineAmount(row), 0);
  }

  openDebtLineGroup(kind: 'treatment' | 'procedure'): void {
    this.debtLineGroupDetail = kind;
  }

  openGroupPay(kind: 'treatment' | 'procedure', event?: Event): void {
    event?.stopPropagation();
    const visitDue = this.toNumber(this.selectedDebtVisit?.balanceDue);
    const groupDue =
      kind === 'treatment' ? this.debtTreatmentsTotal : this.debtProceduresTotal;
    const cap = Math.min(groupDue, visitDue > 0 ? visitDue : groupDue);
    if (!(cap > 0)) {
      return;
    }
    this.debtPayMode = 'line';
    this.debtPayLineLabel = kind === 'treatment' ? 'Treatment given' : 'Procedures done';
    this.debtPayTitle = `Pay ${this.debtPayLineLabel.toLowerCase()}`;
    this.debtPaySubtitle = this.clientName(this.selectedDebtClient);
    this.debtPayTotalDue = cap;
    this.debtPayForm = {
      amountToPay: cap,
      paymentForm: 'Cash At Hand',
      notes: `Cashier desk — ${this.debtPayLineLabel}`,
    };
    this.debtPayAllocation = [];
    this.debtPayMessage = '';
    this.showDebtPayModal = true;
  }

  openClientPay(client: any, event?: Event): void {
    event?.stopPropagation();
    this.debtPayMode = 'client';
    this.debtPayClient = client;
    this.debtPayTitle = `Pay ${this.clientName(client)}`;
    this.debtPaySubtitle = 'Payment applies to the oldest visit first until the amount is used.';
    this.debtPayTotalDue = this.clientDebt(client);
    this.debtPayForm = {
      amountToPay: this.debtPayTotalDue,
      paymentForm: 'Cash At Hand',
      notes: 'Cashier desk — pay client debt',
    };
    this.debtPayMessage = '';
    this.showDebtPayModal = true;
    this.api.getInitialTriageVitalsForVisitId(client.id).subscribe({
      next: (visits) => {
        const withDebt = (Array.isArray(visits) ? visits : [])
          .filter((v) => this.toNumber(v?.balanceDue) > 0)
          .sort((a, b) => this.toNumber(a?.visitNumber ?? a?.id) - this.toNumber(b?.visitNumber ?? b?.id));
        // Only overwrite the visits list when already drilled into this client.
        if (this.selectedDebtClient?.id === client.id) {
          this.debtVisits = withDebt;
        }
        this._debtPayVisitsForAlloc = withDebt;
        this.rebuildDebtPayAllocation();
      },
    });
  }

  openVisitPay(visit: any, event?: Event): void {
    event?.stopPropagation();
    this.debtPayMode = 'visit';
    this.debtPayTitle = `Pay visit #${visit?.visitNumber ?? visit?.id}`;
    this.debtPaySubtitle = this.clientName(this.selectedDebtClient);
    this.debtPayTotalDue = this.toNumber(visit?.balanceDue);
    this.debtPayForm = {
      amountToPay: this.debtPayTotalDue,
      paymentForm: 'Cash At Hand',
      notes: 'Cashier desk — visit payment',
    };
    this.debtPayAllocation = [];
    this.debtPayMessage = '';
    this.selectedDebtVisit = visit;
    this.showDebtPayModal = true;
  }

  openLinePay(row: any, kind: 'treatment' | 'procedure', event?: Event): void {
    event?.stopPropagation();
    const visitDue = this.toNumber(this.selectedDebtVisit?.balanceDue);
    const lineDue = this.lineAmount(row);
    const cap = Math.min(lineDue, visitDue > 0 ? visitDue : lineDue);
    this.debtPayMode = 'line';
    this.debtPayLineLabel = this.lineName(row, kind);
    this.debtPayTitle = `Pay ${kind}`;
    this.debtPaySubtitle = this.debtPayLineLabel;
    this.debtPayTotalDue = cap;
    this.debtPayForm = {
      amountToPay: cap,
      paymentForm: 'Cash At Hand',
      notes: `Cashier desk — ${kind}: ${this.debtPayLineLabel}`,
    };
    this.debtPayAllocation = [];
    this.debtPayMessage = '';
    this.showDebtPayModal = true;
  }

  onDebtPayAmountChange(): void {
    this.rebuildDebtPayAllocation();
  }

  get debtPayRemaining(): number {
    const amount = this.toNumber(this.debtPayForm.amountToPay);
    return Math.max(0, this.debtPayTotalDue - amount);
  }

  rebuildDebtPayAllocation(): void {
    if (this.debtPayMode !== 'client') {
      this.debtPayAllocation = [];
      return;
    }
    let remaining = this.toNumber(this.debtPayForm.amountToPay);
    const out: { visitNumber: any; balanceDue: number; allocated: number }[] = [];
    const visits =
      this._debtPayVisitsForAlloc.length > 0
        ? this._debtPayVisitsForAlloc
        : this.debtVisits;
    for (const v of visits) {
      if (remaining <= 0) {
        break;
      }
      const due = this.toNumber(v?.balanceDue);
      if (due <= 0) {
        continue;
      }
      const allocated = Math.min(remaining, due);
      out.push({
        visitNumber: v?.visitNumber ?? v?.id,
        balanceDue: due,
        allocated,
      });
      remaining -= allocated;
    }
    this.debtPayAllocation = out;
  }

  closeDebtPayModal(): void {
    this.showDebtPayModal = false;
    this.debtPayMessage = '';
    this.debtPayClient = null;
    this._debtPayVisitsForAlloc = [];
  }

  submitDebtPay(): void {
    const amount = this.toNumber(this.debtPayForm.amountToPay);
    if (!(amount > 0)) {
      this.debtPayMessage = 'Enter an amount greater than zero.';
      return;
    }
    if (amount > this.debtPayTotalDue + 0.009) {
      this.debtPayMessage = 'Amount cannot exceed the outstanding balance.';
      return;
    }
    this.debtPaySaving = true;
    this.debtPayMessage = '';
    const receivedBy = (sessionStorage.getItem('username') || '').trim();
    const payload = {
      amountToPay: amount,
      paymentForm: this.debtPayForm.paymentForm || 'Cash At Hand',
      status: 'Approved',
      notes: (this.debtPayForm.notes || 'Cashier desk payment').trim(),
      receivedBy,
    };

    if (this.debtPayMode === 'client') {
      const clientId = this.debtPayClient?.id ?? this.selectedDebtClient?.id;
      if (!clientId) {
        this.debtPaySaving = false;
        this.debtPayMessage = 'Select a client first.';
        return;
      }
      this.api.payAllClientDebt(clientId, payload).subscribe({
        next: (res: any) => {
          this.debtPaySaving = false;
          this.showDebtPayModal = false;
          this.debtPayClient = null;
          this._debtPayVisitsForAlloc = [];
          this.showSuccess(res?.message || 'Client debt payment applied (oldest visits first).');
          this.loadDebtClients();
          if (this.selectedDebtClient) {
            this.openDebtClient(this.selectedDebtClient);
          }
        },
        error: (err) => {
          this.debtPaySaving = false;
          this.debtPayMessage =
            err?.error?.message || 'Could not apply client debt payment.';
        },
      });
      return;
    }

    const visitId = this.selectedDebtVisit?.id;
    if (!visitId) {
      this.debtPaySaving = false;
      this.debtPayMessage = 'Select a visit first.';
      return;
    }
    this.api.savePayment(visitId, {
      ...payload,
      paidBy: receivedBy,
    }).subscribe({
      next: (res: any) => {
        this.debtPaySaving = false;
        this.showDebtPayModal = false;
        this.showSuccess(res?.message || 'Visit payment recorded.');
        if (this.selectedDebtClient) {
          this.openDebtClient(this.selectedDebtClient);
        }
        if (this.debtPayMode === 'line' && this.selectedDebtVisit) {
          this.openDebtVisit(this.selectedDebtVisit);
        }
      },
      error: (err) => {
        this.debtPaySaving = false;
        this.debtPayMessage =
          err?.error?.message || 'Could not record visit payment.';
      },
    });
  }

  loadPayments(): void {
    this.isLoading = true;
    const filter = {
      paidBy: '',
      receivedBy: '',
      paymentForm: ''
    };

    this.api.getItemsAdvancedSearchDteEmptyDashBoard(filter).subscribe({
      next: (res: any) => {
        this.payments = Array.isArray(res) ? res : [];
        this.isLoading = false;
      },
      error: () => {
        this.payments = [];
        this.isLoading = false;
        this.showError('Failed to load payment transactions');
      }
    });
  }

  loadRecentVisits(): void {
    this.isSearchingVisits = true;
    const to = this.todayIso();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const from = fromDate.toISOString().slice(0, 10);

    this.api.filterVisits({ datefrom: from, dateto: to }).subscribe({
      next: (res: any) => {
        this.visitResults = Array.isArray(res) ? res : [];
        this.isSearchingVisits = false;
      },
      error: () => {
        this.visitResults = [];
        this.isSearchingVisits = false;
        this.showError('Failed to load recent visits');
      }
    });
  }

  searchVisits(): void {
    const q = this.visitSearchQuery.trim();
    if (!q) {
      this.loadRecentVisits();
      return;
    }

    this.isSearchingVisits = true;
    const to = this.todayIso();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const from = fromDate.toISOString().slice(0, 10);

    this.api.filterVisits({ clientName: q, datefrom: from, dateto: to }).subscribe({
      next: (res: any) => {
        this.visitResults = Array.isArray(res) ? res : [];
        this.isSearchingVisits = false;
      },
      error: () => {
        this.visitResults = [];
        this.isSearchingVisits = false;
        this.showError('Visit search failed');
      }
    });
  }

  selectVisit(visit: any): void {
    this.selectedVisit = visit;
    this.visitBalance = visit?.balanceDue != null ? this.toNumber(visit.balanceDue) : null;
    this.paymentForm.amountToPay = this.visitBalance && this.visitBalance > 0 ? this.visitBalance : null;

    if (visit?.id) {
      this.api.getLabTestCostByVisit(visit.id).subscribe({
        next: (res: any) => {
          if (res?.balanceDue != null) {
            this.visitBalance = this.toNumber(res.balanceDue);
            if (!this.paymentForm.amountToPay && this.visitBalance > 0) {
              this.paymentForm.amountToPay = this.visitBalance;
            }
          }
        },
        error: () => {}
      });
    }
  }

  clearSelectedVisit(): void {
    this.selectedVisit = null;
    this.visitBalance = null;
    this.resetPaymentForm();
  }

  openReceivePayment(): void {
    this.setTab('receive');
    this.clearSelectedVisit();
  }

  processPayment(): void {
    if (!this.selectedVisit?.id) {
      this.showError('Select a client order first.');
      return;
    }
    if (!this.paymentForm.amountToPay || this.paymentForm.amountToPay <= 0) {
      this.showError('Enter a valid payment amount.');
      return;
    }

    this.isSaving = true;
    const payload = {
      amountToPay: Number(this.paymentForm.amountToPay),
      paymentForm: this.paymentForm.paymentForm || 'Cash At Hand',
      status: this.paymentForm.status || 'Approved',
      notes: this.paymentForm.notes?.trim() || 'Payment Received with Thanks',
      paidBy: this.paymentForm.paidBy?.trim() || this.userName,
      receivedBy: this.userName
    };

    this.api.savePayment(this.selectedVisit.id, payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.showSuccess(res?.message || 'Payment recorded successfully');
        this.clearSelectedVisit();
        this.setTab('transactions');
        this.loadPayments();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.showError(err?.error?.message || 'Failed to record payment');
      }
    });
  }

  viewReceipt(payment: any): void {
    this.selectedPayment = payment;
    this.showReceiptModal = true;
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.selectedPayment = null;
  }

  printReceipt(): void {
    window.print();
  }

  openVisit(visit: any): void {
    if (!visit) {
      return;
    }
    const client = {
      id: visit.clientId,
      clientFirstName: visit.clientName || '',
      clientName: visit.clientName || ''
    };
    sessionStorage.setItem('item', JSON.stringify(client));
    sessionStorage.setItem('initialClientVisit', JSON.stringify(visit));
    this.router.navigate(['/overview/otc-dispensary']);
  }

  openPaymentVisit(payment: any): void {
    if (payment?.visitId) {
      this.api.getClientVisitByVisitId(payment.visitId).subscribe({
        next: (visit: any) => this.openVisit(visit),
        error: () => this.showError('Could not open visit for this receipt')
      });
      return;
    }
    this.showError('Visit link not available for this receipt');
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  formatAmount(value: any): string {
    const num = this.toNumber(value);
    return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  formatDate(value: any): string {
    const normalized = this.normalizeDate(value);
    if (!normalized) {
      return '—';
    }
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
  }

  receiptNumber(payment: any, index?: number): string {
    if (payment?.id != null) {
      return `RCP-${payment.id}`;
    }
    if (payment?.receiptNumber) {
      return payment.receiptNumber;
    }
    return `RCP-${(index ?? 0) + 1}`;
  }

  statusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'approved') {
      return 'status-approved';
    }
    if (s === 'pending') {
      return 'status-pending';
    }
    return 'status-default';
  }

  private resetPaymentForm(): void {
    this.paymentForm = {
      amountToPay: null,
      paymentForm: 'Cash At Hand',
      status: 'Approved',
      notes: 'Payment Received with Thanks',
      paidBy: this.userName
    };
  }

  private toNumber(value: any): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  private normalizeDate(value: any): string {
    if (!value) {
      return '';
    }
    const raw = String(value).replace(/\//g, '-');
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return d.toISOString().slice(0, 10);
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private showSuccess(message: string): void {
    this.responseMessage = message;
    this.responseError = '';
    setTimeout(() => { this.responseMessage = ''; }, 5000);
  }

  private showError(message: string): void {
    this.responseError = message;
    this.responseMessage = '';
    setTimeout(() => { this.responseError = ''; }, 6000);
  }
}
