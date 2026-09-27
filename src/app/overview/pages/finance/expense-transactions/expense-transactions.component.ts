import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { defaultContactValue } from '../../../../utils/phone-contact.util';

@Component({
  selector: 'app-expense-transactions',
  templateUrl: './expense-transactions.component.html',
  styleUrls: ['./expense-transactions.component.css']
})
export class ExpenseTransactionsComponent implements OnInit {
  isDarkMode = false;
  isLoading = false;
  isSaving = false;
  responseMessage = '';
  responseError = '';
  searchQuery = '';
  accountFilter = '';
  dateFrom = '';
  dateTo = '';

  transactions: any[] = [];
  accounts: any[] = [];
  categories: any[] = [];
  clients: any[] = [];

  currentPage = 1;
  itemsPerPage = 10;

  showTransactionModal = false;
  showReverseConfirm = false;
  reverseTarget: any = null;
  editingTransaction: any = null;

  transactionForm = {
    expenseAccountId: null as number | null,
    amountTransacted: null as number | null,
    receiverId: null as number | null,
    receiver: '',
    description: '',
    transactionDate: ''
  };

  expenseAccountDropdownOpen = false;
  expenseAccountSearch = '';
  showAddAccountModal = false;
  quickAccountForm = {
    categoryId: null as number | null,
    accountName: ''
  };

  receiverDropdownOpen = false;
  receiverSearch = '';
  showAddClientModal = false;
  newClientForm = {
    clientFirstName: '',
    clientSecondName: '',
    clientContact: defaultContactValue(),
    clientGender: '',
    clientDateOfBirth: '',
    clientAge: null as number | null,
    occupation: '',
    clientAddress: '',
    nextOfKinName: '',
    nextOfKinContact: defaultContactValue(),
    relationship: '',
    nextOfKinAddress: ''
  };

  private userId: number | null = null;

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
    try {
      const details = JSON.parse(sessionStorage.getItem('userDetails') || '{}');
      const fromDetails = Number(details?.id);
      if (Number.isFinite(fromDetails) && fromDetails > 0) {
        this.userId = fromDetails;
      }
    } catch {
      /* ignore */
    }
    if (this.userId == null) {
      const rawUserId = sessionStorage.getItem('userid') || sessionStorage.getItem('userId');
      const parsed = rawUserId ? Number(rawUserId) : NaN;
      this.userId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
    this.themeService.isDarkMode$.subscribe((isDark) => (this.isDarkMode = isDark));
    this.loadAll();
  }

  get thisMonthTotal(): number {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return this.transactions
      .filter((t) => {
        const d = this.toDate(t.dateOfExpenseTransaction);
        return d != null && d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, t) => sum + this.toNumber(t.amountTransacted), 0);
  }

  get todayTotal(): number {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    return this.transactions
      .filter((t) => {
        const dt = this.toDate(t.dateOfExpenseTransaction);
        return dt != null && dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
      })
      .reduce((sum, t) => sum + this.toNumber(t.amountTransacted), 0);
  }

  get lastMonthTotal(): number {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const targetMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return this.transactions
      .filter((t) => {
        const dt = this.toDate(t.dateOfExpenseTransaction);
        return dt != null && dt.getMonth() === targetMonth && dt.getFullYear() === targetYear;
      })
      .reduce((sum, t) => sum + this.toNumber(t.amountTransacted), 0);
  }

  get filteredTransactions(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.transactions.filter((item) => {
      const matchesSearch =
        !q ||
        [item.referenceNumber, item.expenseAccountName, item.receiver, item.userName, item.description].some(
          (v) => (v || '').toString().toLowerCase().includes(q)
        );
      const matchesAccount = !this.accountFilter || String(item.expenseAccountId) === this.accountFilter;
      const norm = this.normalizeDate(item.dateOfExpenseTransaction);
      const matchesDate =
        (!this.dateFrom || norm >= this.dateFrom) &&
        (!this.dateTo || norm <= this.dateTo);
      return matchesSearch && matchesAccount && matchesDate;
    });
  }

  get paginatedTransactions(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredTransactions.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTransactions.length / this.itemsPerPage));
  }

  get filteredTotalAmount(): number {
    return this.filteredTransactions.reduce((sum, item) => sum + this.toNumber(item.amountTransacted), 0);
  }

  get filteredAccountsForPicker(): any[] {
    const q = this.expenseAccountSearch.trim().toLowerCase();
    return this.accounts.filter(
      (item) =>
        !q ||
        (item.accountName || '').toLowerCase().includes(q) ||
        (item.expenseCategoryName || '').toLowerCase().includes(q)
    );
  }

  get selectedExpenseAccountLabel(): string {
    const id = this.transactionForm.expenseAccountId;
    if (id == null) return 'Choose expense account';
    const acc = this.accounts.find((a) => Number(a.id) === Number(id));
    if (!acc) return 'Choose expense account';
    const cat = acc.expenseCategoryName ? ` (${acc.expenseCategoryName})` : '';
    return `${acc.accountName}${cat}`;
  }

  get filteredClientsForPicker(): any[] {
    const q = this.receiverSearch.trim().toLowerCase();
    return this.clients.filter(
      (c) =>
        !q ||
        (this.clientFullName(c)).toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
    );
  }

  get selectedReceiverLabel(): string {
    const id = this.transactionForm.receiverId;
    if (id != null) {
      const c = this.clients.find((cl) => Number(cl.id) === Number(id));
      if (c) return this.clientFullName(c);
    }
    if (this.transactionForm.receiver) return this.transactionForm.receiver;
    return 'Choose client / receiver';
  }

  clientFullName(c: any): string {
    const first = c.clientFirstName || c.firstName || c.first_name || '';
    const second = c.clientSecondName || c.secondName || c.lastName || c.last_name || '';
    const full = `${first} ${second}`.trim();
    return full || c.name || c.clientName || 'Unknown';
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.accountFilter = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.currentPage = 1;
  }

  loadAll(): void {
    this.isLoading = true;
    let pending = 4;
    const done = () => { if (--pending <= 0) this.isLoading = false; };

    this.api.getAllExpensesMade().subscribe({
      next: (res: any) => { this.transactions = Array.isArray(res) ? res : []; done(); },
      error: () => { this.transactions = []; this.showError('Failed to load transactions'); done(); }
    });
    this.api.getExpenseAccountList().subscribe({
      next: (res: any) => { this.accounts = Array.isArray(res) ? res : []; done(); },
      error: () => { this.accounts = []; done(); }
    });
    this.api.getExpenseCategoryList().subscribe({
      next: (res: any) => { this.categories = Array.isArray(res) ? res : []; done(); },
      error: () => { this.categories = []; done(); }
    });
    this.api.getAllClients().subscribe({
      next: (res: any) => { this.clients = Array.isArray(res) ? res : []; done(); },
      error: () => { this.clients = []; done(); }
    });
  }

  openTransactionModal(): void {
    this.editingTransaction = null;
    this.transactionForm = { expenseAccountId: null, amountTransacted: null, receiverId: null, receiver: '', description: '', transactionDate: this.currentDateTimeLocal() };
    this.closeExpenseAccountDropdown();
    this.closeReceiverDropdown();
    this.showTransactionModal = true;
  }

  openEditTransaction(item: any): void {
    this.editingTransaction = item;
    const dtLocal = this.buildTransactionDateTimeLocal(item);
    this.transactionForm = {
      expenseAccountId: item.expenseAccountId ? Number(item.expenseAccountId) : null,
      amountTransacted: item.amountTransacted ? Number(item.amountTransacted) : null,
      receiverId: null,
      receiver: item.receiver || '',
      description: item.description || '',
      transactionDate: dtLocal
    };
    const matchedClient = this.clients.find((c) => this.clientFullName(c).toLowerCase() === (item.receiver || '').toLowerCase());
    if (matchedClient) this.transactionForm.receiverId = Number(matchedClient.id);
    this.closeExpenseAccountDropdown();
    this.closeReceiverDropdown();
    this.showTransactionModal = true;
  }

  // Expense account picker
  toggleExpenseAccountDropdown(event: Event): void {
    event.stopPropagation();
    this.closeReceiverDropdown();
    this.expenseAccountDropdownOpen = !this.expenseAccountDropdownOpen;
  }

  closeExpenseAccountDropdown(): void {
    this.expenseAccountDropdownOpen = false;
    this.expenseAccountSearch = '';
  }

  selectExpenseAccount(acc: any, event?: Event): void {
    event?.stopPropagation();
    if (acc?.id != null) {
      this.transactionForm.expenseAccountId = Number(acc.id);
      if (!this.transactionForm.description?.trim() && acc.description) {
        this.transactionForm.description = acc.description;
      }
    }
    this.closeExpenseAccountDropdown();
  }

  openQuickAccountInPicker(event: Event): void {
    event.stopPropagation();
    if (this.categories.length === 0) {
      this.showError('Create at least one expense category first (Categories page).');
      return;
    }
    this.closeExpenseAccountDropdown();
    this.showAddAccountModal = true;
    this.quickAccountForm = { categoryId: this.categories[0]?.id ?? null, accountName: this.expenseAccountSearch.trim() };
  }

  cancelQuickAccountInPicker(event?: Event): void {
    event?.stopPropagation();
    this.showAddAccountModal = false;
  }

  saveQuickAccountFromPicker(event?: Event): void {
    event?.stopPropagation();
    if (!this.quickAccountForm.categoryId) { this.showError('Select a category.'); return; }
    if (!this.quickAccountForm.accountName?.trim()) { this.showError('Account name is required.'); return; }
    const name = this.quickAccountForm.accountName.trim();
    const categoryId = this.quickAccountForm.categoryId;
    this.isSaving = true;
    this.api.saveExpenseAccount({ categoryId, accountName: name, description: '' }).subscribe({
      next: () => {
        this.api.getExpenseAccountList().subscribe({
          next: (list: any) => {
            this.isSaving = false;
            this.accounts = Array.isArray(list) ? list : [];
            const created = this.accounts.find(
              (a) => Number(a.categoryId) === Number(categoryId) && (a.accountName || '').toLowerCase() === name.toLowerCase()
            ) ?? this.accounts[this.accounts.length - 1];
            if (created?.id != null) this.transactionForm.expenseAccountId = Number(created.id);
            this.showAddAccountModal = false;
            this.expenseAccountSearch = '';
            this.showSuccess('Account created and selected');
          },
          error: () => { this.isSaving = false; this.loadAll(); }
        });
      },
      error: (err: any) => { this.isSaving = false; this.showError(err?.error?.message || 'Failed to create account'); }
    });
  }

  // Receiver / Client picker
  toggleReceiverDropdown(event: Event): void {
    event.stopPropagation();
    this.closeExpenseAccountDropdown();
    this.receiverDropdownOpen = !this.receiverDropdownOpen;
  }

  closeReceiverDropdown(): void {
    this.receiverDropdownOpen = false;
    this.receiverSearch = '';
  }

  selectClient(client: any, event?: Event): void {
    event?.stopPropagation();
    this.transactionForm.receiverId = Number(client.id);
    this.transactionForm.receiver = this.clientFullName(client);
    this.closeReceiverDropdown();
  }

  openAddClientModal(event: Event): void {
    event.stopPropagation();
    this.newClientForm = {
      clientFirstName: '',
      clientSecondName: '',
      clientContact: defaultContactValue(),
      clientGender: '',
      clientDateOfBirth: '',
      clientAge: null,
      occupation: '',
      clientAddress: '',
      nextOfKinName: '',
      nextOfKinContact: defaultContactValue(),
      relationship: '',
      nextOfKinAddress: ''
    };
    this.showAddClientModal = true;
  }

  closeAddClientModal(): void {
    if (this.isSaving) return;
    this.showAddClientModal = false;
  }

  saveNewClient(): void {
    if (!this.newClientForm.clientFirstName?.trim()) { this.showError('First name is required.'); return; }
    if (!this.newClientForm.clientSecondName?.trim()) { this.showError('Second name is required.'); return; }
    if (!this.newClientForm.clientContact?.trim()) { this.showError('Contact is required.'); return; }
    if (!this.newClientForm.clientGender?.trim()) { this.showError('Gender is required.'); return; }
    this.isSaving = true;
    const dob = (this.newClientForm.clientDateOfBirth || '').trim();
    let formattedDob: string | null = null;
    if (dob) {
      const date = new Date(dob);
      if (!Number.isNaN(date.getTime())) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        formattedDob = `${y}/${m}/${d}`;
      }
    }
    const payload = {
      clientFirstName: this.newClientForm.clientFirstName.trim(),
      clientSecondName: this.newClientForm.clientSecondName.trim(),
      clientContact: this.newClientForm.clientContact?.trim() || '',
      clientGender: this.newClientForm.clientGender || '',
      clientDateOfBirth: formattedDob,
      clientAge: this.newClientForm.clientAge != null ? Number(this.newClientForm.clientAge) : null,
      occupation: this.newClientForm.occupation?.trim() || '',
      clientAddress: this.newClientForm.clientAddress?.trim() || '',
      nextOfKinName: this.newClientForm.nextOfKinName?.trim() || '',
      nextOfKinContact: this.newClientForm.nextOfKinContact?.trim() || '',
      relationship: this.newClientForm.relationship?.trim() || '',
      nextOfKinAddress: this.newClientForm.nextOfKinAddress?.trim() || ''
    };
    this.api.addClient(payload).subscribe({
      next: () => {
        this.api.getAllClients().subscribe({
          next: (list: any) => {
            this.isSaving = false;
            this.clients = Array.isArray(list) ? list : [];
            const created = this.clients.find(
              (c) => (c.clientFirstName || c.firstName || '').toLowerCase() === this.newClientForm.clientFirstName.trim().toLowerCase()
                && (c.clientSecondName || c.secondName || c.lastName || '').toLowerCase() === this.newClientForm.clientSecondName.trim().toLowerCase()
            ) ?? this.clients[this.clients.length - 1];
            if (created?.id != null) {
              this.transactionForm.receiverId = Number(created.id);
              this.transactionForm.receiver = this.clientFullName(created);
            }
            this.showAddClientModal = false;
            this.closeReceiverDropdown();
            this.showSuccess('Client added and selected');
          },
          error: () => { this.isSaving = false; this.loadAll(); }
        });
      },
      error: (err: any) => { this.isSaving = false; this.showError(err?.error?.message || 'Failed to add client'); }
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.expenseAccountDropdownOpen) this.closeExpenseAccountDropdown();
    if (this.receiverDropdownOpen) this.closeReceiverDropdown();
  }

  closeModals(): void {
    if (this.isSaving) return;
    this.showTransactionModal = false;
    this.showReverseConfirm = false;
    this.showAddAccountModal = false;
    this.reverseTarget = null;
    this.closeExpenseAccountDropdown();
    this.closeReceiverDropdown();
  }

  saveTransaction(): void {
    if (!this.transactionForm.expenseAccountId) { this.showError('Select an expense account.'); return; }
    if (!this.transactionForm.amountTransacted || this.transactionForm.amountTransacted <= 0) { this.showError('Enter a valid amount.'); return; }
    if (!this.transactionForm.receiver?.trim()) { this.showError('Select or enter a receiver / client.'); return; }
    if (!this.userId) { this.showError('User session not found. Please log in again.'); return; }
    this.isSaving = true;
    const payload: any = {
      userId: this.userId,
      expenseAccountId: this.transactionForm.expenseAccountId,
      amountTransacted: Number(this.transactionForm.amountTransacted),
      receiver: this.transactionForm.receiver?.trim() || '',
      description: this.transactionForm.description?.trim() || this.getSelectedAccountDescription() || 'Expense recorded'
    };
    if (this.transactionForm.transactionDate) {
      payload.transactionDateTime = this.transactionForm.transactionDate;
    }

    const request$ = this.editingTransaction
      ? this.api.updateExpenseTransaction(this.editingTransaction.id, payload)
      : this.api.saveExpense(payload);

    request$.subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.showTransactionModal = false;
        this.editingTransaction = null;
        this.showSuccess(res?.message || (this.editingTransaction ? 'Transaction updated' : 'Expense recorded'));
        this.loadAll();
      },
      error: (err: any) => { this.isSaving = false; this.showError(err?.error?.message || 'Failed to save expense'); }
    });
  }

  confirmReverse(item: any): void {
    this.reverseTarget = item;
    this.showReverseConfirm = true;
  }

  reverseTransaction(): void {
    if (!this.reverseTarget?.id) return;
    this.isSaving = true;
    this.api.deleteExpense(this.reverseTarget.id).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.showReverseConfirm = false;
        this.reverseTarget = null;
        this.showSuccess(res?.message || 'Transaction reversed successfully');
        this.loadAll();
      },
      error: (err: any) => { this.isSaving = false; this.showError(err?.error?.message || 'Failed to reverse transaction'); }
    });
  }

  prevPage(): void { if (this.currentPage > 1) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }

  currentDateTimeLocal(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  private buildTransactionDateTimeLocal(item: any): string {
    const rawDate = String(item?.dateOfExpenseTransaction || item?.transactionDate || item?.date || '').trim();
    const rawTime = String(item?.timeOfExpenseTransaction || '').trim();
    if (!rawDate) {
      return this.currentDateTimeLocal();
    }
    const normalizedDate = rawDate.replace(/\//g, '-');
    const hhmm = rawTime ? rawTime.substring(0, 5) : '00:00';
    return `${normalizedDate}T${hhmm}`;
  }

  formatAmount(value: any): string {
    return this.toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  formatDate(value: any): string {
    if (!value) return '\u2014';
    const d = this.toDate(value);
    return d ? d.toLocaleDateString() : String(value);
  }

  private getSelectedAccountDescription(): string {
    const id = this.transactionForm.expenseAccountId;
    if (id == null) return '';
    const acc = this.accounts.find((a) => Number(a.id) === Number(id));
    return acc?.description || '';
  }

  private toNumber(value: any): number { const n = Number(value); return Number.isFinite(n) ? n : 0; }

  private toDate(value: any): Date | null {
    if (!value) return null;
    const d = new Date(String(value).replace(/\//g, '-'));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private normalizeDate(value: any): string {
    const d = this.toDate(value);
    return d ? d.toISOString().slice(0, 10) : '';
  }

  private showSuccess(msg: string): void {
    this.responseMessage = msg; this.responseError = '';
    setTimeout(() => (this.responseMessage = ''), 5000);
  }

  private showError(msg: string): void {
    this.responseError = msg; this.responseMessage = '';
    setTimeout(() => (this.responseError = ''), 6000);
  }
}
