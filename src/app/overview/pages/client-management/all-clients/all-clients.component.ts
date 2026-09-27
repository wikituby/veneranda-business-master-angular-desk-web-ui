import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  ensureFromModuleInList,
  normalizeBusinessModules,
  pickDefaultFromModuleId,
  isQueueDischargeDestination,
  QUEUE_DISCHARGE_DESTINATION_ID,
  queueDestinationOptions,
} from '../../../../utils/queue-module.util';
import { ApiService } from '../../../../services/api.service';
import { ApiConfigService } from '../../../../services/api-config.service';
import { ThemeService } from '../../../../services/theme.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { GlobalFeedbackService } from '../../../../services/global-feedback.service';
import { AccessControlService } from '../../../../services/access-control.service';
import { FacilityBrandingService } from '../../../../services/facility-branding.service';
import { defaultContactValue } from '../../../../utils/phone-contact.util';
import { BLOOD_GROUP_OPTIONS } from '../../../../utils/blood-group.util';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-all-clients',
  templateUrl: './all-clients.component.html',
  styleUrls: ['./all-clients.component.css']
})
export class AllClientsComponent implements OnInit, OnDestroy {

  readonly bloodGroupOptions = BLOOD_GROUP_OPTIONS;

  // Table data properties
  clientList: any[] = [];
  data: any[] = [];
  page: number = 1;
  itemsPerPage: number = 8;
  readonly pageSizeOptions = [8, 15, 25, 50, 100];
  /** Locked default from DB; null = no saved default. */
  lockedRegistryItemsPerPage: number | null = null;
  pageSizeMenuOpen = false;
  pageSizeSaving = false;
  searchQuery: string = '';
  selectedColumn: string = 'all';
  createdDateFrom = '';
  createdDateTo = '';
  selectedClientGroupFilter = 'all';
  selectedDebtFilter: 'all' | 'with-debt' | 'without-debt' = 'all';
  pendingCreatedDateFromStruct: NgbDateStruct | null = null;
  pendingCreatedDateToStruct: NgbDateStruct | null = null;
  pendingClientGroupFilter = 'all';
  pendingDebtFilter: 'all' | 'with-debt' | 'without-debt' = 'all';
  filterGroupDropdownOpen = false;
  filterDebtDropdownOpen = false;
  readonly debtFilterOptions: { value: 'all' | 'with-debt' | 'without-debt'; label: string }[] = [
    { value: 'all', label: 'All clients' },
    { value: 'with-debt', label: 'With debt' },
    { value: 'without-debt', label: 'Without debt' },
  ];
  
  private apiReadySub?: Subscription;
  private lastLoadedApiBase = '';

  // Loading and response properties
  isLoadingService: boolean = false;
  clientLoadError = '';
  responseColor = "";
  responseMessage = "";
  showDivUpdatedOut: boolean = false;
  
  // User permissions
  mdUser: boolean = false;
  userRole: string | null = null;
  
  // UI state properties
  isCollapsed = true;
  iconChange: string = "bi bi-chevron-down";
  eyeIcon: string = "bi bi-funnel";
  eyeIconDrop: string = "bi bi-chevron-down";
  isText: boolean = true;
  isDarkMode: boolean = false;
  
  // Form properties
  currentClient: any = {};
  saveButtonStatus: string = "Add New Client";
  isButtonDisabled: boolean = false;
  showDivAddToDataBaseNewClient: boolean = false;
  showDivUpdatedLoaderNewClient: boolean = false;
  isCollapsedNewClient: boolean = true;
  
  // Editing properties
  isEditingClient: boolean = false;
  editingClientId: number | null = null;
  
  // Client Groups for dropdown
  clientGroupList: any[] = [];
  filteredClientGroupList: any[] = [];
  isClientGroupDropdownOpen: boolean = false;
  clientGroupSearchQuery: string = '';
  
  // Add New Group Modal
  isCollapsedNewGroup: boolean = true;
  currentClientGroup: any = {};
  saveButtonStatusGroup: string = "Add New Client Group";
  isEditingGroup: boolean = false;
  
  // Action Dropdown (fixed overlay — not clipped by table overflow)
  openActionDropdownId: number | null = null;
  actionDropdownClient: any = null;
  actionMenuStyle: { top: string; left: string } = { top: '0px', left: '0px' };
  dropdownDirection: 'up' | 'down' = 'down';
  private readonly actionMenuWidth = 200;
  private readonly actionMenuEstimatedHeight = 188;

  /** While fetching latest visit before navigating to client-visit */
  consultationLoadingClientId: number | null = null;

  /** Read-only client details sheet from the actions menu */
  showClientDetailsModal = false;
  clientDetailsRecord: any = null;

  /** Bulk import from Excel/CSV */
  showImportModal = false;
  importPreviewRows: {
    rowNumber: number;
    data: any;
    errors: string[];
    warnings: string[];
    isValid: boolean;
  }[] = [];
  importFileName = '';
  importUploading = false;
  importParseError = '';

  // Queue client modal (from registry)
  showQueueClientModal = false;
  queueSelectedClient: any = null;
  queueModules: any[] = [];
  queueClinics: any[] = [];
  queueError = '';
  queueSaving = false;
  queueForm = {
    fromModuleId: null as number | null,
    toModuleId: null as number | null,
    clinicId: null as number | null,
    note: '',
    visitDefaultScheme: '',
    clientGroupId: null as number | null,
    emergency: false,
    revisit: false,
    printQueueTicket: false,
  };
  readonly QUEUE_DISCHARGE_DESTINATION_ID = QUEUE_DISCHARGE_DESTINATION_ID;
  readonly isQueueDischargeDestination = isQueueDischargeDestination;

  /** Pay all client debt modal (opened from balance badge) */
  showPayAllDebtModal = false;
  exportDropdownOpen = false;
  payAllDebtClient: any = null;
  payAllDebtClientTotalDue: number | null = null;
  payAllDebtForm: { amountToPay: number | null; paymentForm: string; notes: string } = {
    amountToPay: null,
    paymentForm: 'Cash At Hand',
    notes: 'Pay all client debt',
  };
  payAllDebtVisits: any[] = [];
  payAllDebtAllocation: {
    visitId: number;
    visitNumber: number | null;
    visitDate: string;
    balanceDue: number;
    amountToApply: number;
  }[] = [];
  payAllDebtSaving = false;
  payAllDebtLoading = false;
  payAllDebtMessage = '';
  payAllDebtMessageOk = false;
  payAllDebtResult: any = null;

  get queueDestinationModules(): any[] {
    return queueDestinationOptions(this.queueModules);
  }
  
  // ViewChild references
  @ViewChild('htmlData') htmlData!: ElementRef;

  constructor(
    private router: Router,
    private api: ApiService,
    private apiConfig: ApiConfigService,
    private themeService: ThemeService,
    private globalFeedbackService: GlobalFeedbackService,
    private accessControl: AccessControlService,
    private facilityBranding: FacilityBrandingService,
    private cdr: ChangeDetectorRef
  ) {}

  private showGlobalSuccess(message: string): void {
    this.globalFeedbackService.show(message, 'success');
  }

  private showGlobalError(message: string): void {
    this.globalFeedbackService.show(message, 'error');
  }

  private showGlobalInfo(message: string): void {
    this.globalFeedbackService.show(message, 'info');
  }

  ngOnInit(): void {
    this.userRole = sessionStorage.getItem('userrole');
    const username = sessionStorage.getItem('username');

    // Subscribe to theme changes for real-time updates
    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
    this.facilityBranding.load().subscribe({ next: () => {}, error: () => {} });

    if (this.userRole === "md") {
      this.mdUser = true;
    }

    if (username === null) {
      this.router.navigate(['/login']);
    } else {
      if (this.userRole === "CUSTOMER") {
        this.router.navigate(['/products']);
      }
    }
    
    this.loadClientGroups();
    this.initializeTableData();
    this.loadQueueModules();
    this.applyLockedRegistryPageSize();

    this.apiReadySub = this.apiConfig.state$
      .pipe(filter((state) => state === 'ready'))
      .subscribe(() => {
        const base = this.apiConfig.getBaseUrl();
        if (base && base !== this.lastLoadedApiBase) {
          this.loadClientGroups();
          this.initializeTableData();
        }
      });
  }

  private applyLockedRegistryPageSize(): void {
    const locked = this.readLockedRegistryPageSizeFromSession();
    this.lockedRegistryItemsPerPage = locked;
    if (locked != null) {
      this.itemsPerPage = locked;
      this.page = 1;
    }
  }

  private readLockedRegistryPageSizeFromSession(): number | null {
    try {
      const raw = sessionStorage.getItem('userDetails');
      if (!raw) return null;
      const user = JSON.parse(raw);
      const value = Number(user?.registryItemsPerPage);
      if (this.pageSizeOptions.includes(value)) return value;
    } catch {
      /* ignore */
    }
    return null;
  }

  private currentUserId(): number | null {
    const fromKey = Number(sessionStorage.getItem('userid'));
    if (Number.isFinite(fromKey) && fromKey > 0) return fromKey;
    try {
      const raw = sessionStorage.getItem('userDetails');
      if (!raw) return null;
      const id = Number(JSON.parse(raw)?.id);
      if (Number.isFinite(id) && id > 0) return id;
    } catch {
      /* ignore */
    }
    return null;
  }

  private syncLockedPageSizeToSession(size: number | null): void {
    try {
      const raw = sessionStorage.getItem('userDetails');
      const user = raw ? JSON.parse(raw) : {};
      user.registryItemsPerPage = size;
      sessionStorage.setItem('userDetails', JSON.stringify(user));
      if (user?.id != null) {
        sessionStorage.setItem('userid', String(user.id));
      }
    } catch {
      /* ignore */
    }
  }

  togglePageSizeMenu(event?: Event): void {
    event?.stopPropagation();
    this.pageSizeMenuOpen = !this.pageSizeMenuOpen;
  }

  closePageSizeMenu(): void {
    this.pageSizeMenuOpen = false;
  }

  onItemsPerPageChange(itemsPerPage: number) {
    const size = Number(itemsPerPage);
    if (!this.pageSizeOptions.includes(size)) return;
    this.itemsPerPage = size;
    this.page = 1;
    this.pageSizeMenuOpen = false;
  }

  lockRegistryPageSize(size: number, event?: Event): void {
    event?.stopPropagation();
    if (!this.pageSizeOptions.includes(size)) return;
    const userId = this.currentUserId();
    if (userId == null) {
      this.showGlobalError('Sign in again to save your page-size default.');
      return;
    }
    this.pageSizeSaving = true;
    this.api.updateUiPreferences(userId, { registryItemsPerPage: size }).subscribe({
      next: () => {
        this.lockedRegistryItemsPerPage = size;
        this.itemsPerPage = size;
        this.page = 1;
        this.syncLockedPageSizeToSession(size);
        this.pageSizeSaving = false;
        this.pageSizeMenuOpen = false;
        this.showGlobalInfo(`Registry default locked at ${size} per page.`);
      },
      error: () => {
        this.pageSizeSaving = false;
        this.showGlobalError('Could not save page-size default.');
      },
    });
  }

  unlockRegistryPageSize(event?: Event): void {
    event?.stopPropagation();
    const userId = this.currentUserId();
    if (userId == null) {
      this.showGlobalError('Sign in again to clear your page-size default.');
      return;
    }
    this.pageSizeSaving = true;
    this.api.updateUiPreferences(userId, { registryItemsPerPage: null }).subscribe({
      next: () => {
        this.lockedRegistryItemsPerPage = null;
        this.syncLockedPageSizeToSession(null);
        this.pageSizeSaving = false;
        this.showGlobalInfo('Registry page-size lock cleared.');
      },
      error: () => {
        this.pageSizeSaving = false;
        this.showGlobalError('Could not clear page-size default.');
      },
    });
  }

  ngOnDestroy(): void {
    this.apiReadySub?.unsubscribe();
  }

  private loadQueueModules(): void {
    this.api.getAllBusinessModules().subscribe({
      next: (res: any) => {
        this.queueModules = normalizeBusinessModules(res);
        this.queueForm.fromModuleId = ensureFromModuleInList(
          this.queueForm.fromModuleId,
          this.queueModules
        );
        if (!this.queueForm.fromModuleId) {
          this.queueForm.fromModuleId = pickDefaultFromModuleId(this.queueModules);
        }
      },
      error: () => {
        this.queueModules = [];
      },
    });
  }

  openQueueClientModal(client: any): void {
    this.closeActionDropdown();
    this.queueSelectedClient = client;
    this.queueError = '';
    this.queueClinics = [];
    this.queueForm = {
      fromModuleId: pickDefaultFromModuleId(this.queueModules),
      toModuleId: null,
      clinicId: null,
      note: '',
      visitDefaultScheme: '',
      clientGroupId: client?.clientGroup?.id || null,
      emergency: false,
      revisit: false,
      printQueueTicket: false,
    };
    if (client?.clientGroup?.groupName) {
      this.queueForm.visitDefaultScheme = client.clientGroup.groupName;
    }
    this.showQueueClientModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeQueueClientModal(): void {
    this.showQueueClientModal = false;
    this.queueSelectedClient = null;
    this.queueError = '';
    this.queueSaving = false;
    document.body.style.overflow = '';
  }

  onQueueToModuleChange(): void {
    this.queueForm.clinicId = null;
    if (isQueueDischargeDestination(this.queueForm.toModuleId)) {
      this.queueClinics = [];
      return;
    }
    if (!this.queueForm.toModuleId) {
      this.queueClinics = [];
      return;
    }
    this.api.getBusinessClinics(this.queueForm.toModuleId).subscribe({
      next: (res: any) => {
        const all = Array.isArray(res) ? res : [];
        this.queueClinics = all.filter((c: any) => c.active !== false);
      },
      error: () => {
        this.queueClinics = [];
      },
    });
  }

  onQueueSchemeChange(): void {
    const g = this.clientGroupList.find((x) => x.id === this.queueForm.clientGroupId);
    this.queueForm.visitDefaultScheme = g?.groupName || '';
  }

  submitQueueFromRegistry(): void {
    const isDischarge = isQueueDischargeDestination(this.queueForm.toModuleId);
    if (!this.queueSelectedClient?.id) {
      this.queueError = 'Select a client first.';
      return;
    }
    if (!isDischarge && !this.queueForm.fromModuleId) {
      this.queueError = 'Select client and From department.';
      return;
    }
    if (!this.queueForm.toModuleId) {
      this.queueError = 'Select destination.';
      return;
    }
    this.queueSaving = true;
    this.queueError = '';
    const username = sessionStorage.getItem('username') || '';

    if (isQueueDischargeDestination(this.queueForm.toModuleId)) {
      this.api.dischargeClientFromQueue({
        clientId: this.queueSelectedClient.id,
        note: this.queueForm.note,
        dischargedBy: username,
      }).subscribe({
        next: () => {
          this.queueSaving = false;
          this.showGlobalSuccess('Client discharged from queue.');
          this.closeQueueClientModal();
        },
        error: (err: any) => {
          this.queueSaving = false;
          this.queueError = err?.error?.message || 'Failed to discharge client.';
        },
      });
      return;
    }

    const scheme =
      this.queueForm.visitDefaultScheme ||
      this.clientGroupList.find((g) => g.id === this.queueForm.clientGroupId)?.groupName ||
      '';
    const fromModuleId = this.queueForm.fromModuleId;
    const toModuleId = this.queueForm.toModuleId;
    if (fromModuleId == null || toModuleId == null) {
      this.queueSaving = false;
      this.queueError = 'Select From and To departments.';
      return;
    }

    this.api.queueClient({
      clientId: this.queueSelectedClient.id,
      fromModuleId,
      toModuleId,
      clinicId: this.queueForm.clinicId ?? undefined,
      note: this.queueForm.note,
      visitDefaultScheme: scheme,
      clientGroupId: this.queueForm.clientGroupId ?? undefined,
      emergency: this.queueForm.emergency,
      revisit: this.queueForm.revisit,
      queuedBy: sessionStorage.getItem('username') || '',
    }).subscribe({
      next: (entry: any) => {
        this.queueSaving = false;
        if (this.queueForm.printQueueTicket && entry?.queueNumber) {
          this.printQueueTicket(entry);
        }
        this.showGlobalSuccess('Client queued successfully.');
        this.closeQueueClientModal();
      },
      error: (err: any) => {
        this.queueSaving = false;
        this.queueError = err?.error?.message || 'Failed to queue client.';
      },
    });
  }

  private printQueueTicket(entry: any): void {
    const w = window.open('', '_blank', 'width=420,height=340');
    if (!w) return;
    const p = this.queueSelectedClient;
    w.document.write(`
      <html><head><title>Queue Ticket</title></head>
      <body style="font-family:sans-serif;padding:16px">
        <h2>Queue Ticket</h2>
        <p><strong>${entry.queueNumber || ''}</strong></p>
        <p>${p?.clientSecondName || ''} ${p?.clientFirstName || ''}</p>
        <p>OP: ${p?.clientFileNo || ''}</p>
        <p>To: ${entry.toModuleName || ''}</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  }

  initializeTableData() {
    this.isLoadingService = true;
    this.clientLoadError = '';
    this.lastLoadedApiBase = this.apiConfig.getBaseUrl();
    this.api.getItems().subscribe({
      next: (res) => {
        this.isLoadingService = false;
        const clientList = Array.isArray(res) ? res : [];
        this.clientList = clientList;
        this.data = clientList;
        this.applyBalanceDueFromClientRows();
        if (!clientList.length) {
          this.clientLoadError = 'No clients found on the connected server.';
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isLoadingService = false;
        console.error('Error loading clients:', err);
        this.clientList = [];
        this.data = [];
        this.clientLoadError = this.buildClientLoadErrorMessage(err);
        this.showGlobalError(this.clientLoadError);
        this.cdr.detectChanges();
      }
    });
  }

  private buildClientLoadErrorMessage(err: any): string {
    if (err?.status === 0) {
      return 'Cannot reach the clinic server. Check your connection or pick another server.';
    }
    return err?.error?.message || 'Unable to load clients. Please try again.';
  }

  /**
   * Balance for the table comes from the client list payload (`totalAmountDue`, etc.),
   * so the UI does not wait on N extra `getTotalClientBalanceDue` calls.
   */
  private applyBalanceDueFromClientRows(): void {
    const list = this.clientList;
    if (!list?.length) {
      return;
    }
    this.clientList = list.map((p) => ({
      ...p,
      totalBalanceDue: this.balanceFromClientRow(p)
    }));
    this.data = this.clientList;
  }

  /** Parse balance fields already present on each client from `get-all-patients`. */
  private balanceFromClientRow(p: any): number | null {
    const raw =
      p?.totalAmountDue ??
      p?.TotalAmountDue ??
      p?.totalBalanceDue ??
      p?.balanceDue ??
      p?.BalanceDue;
    if (raw === undefined || raw === null || raw === '') {
      return null;
    }
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
    return Number.isFinite(n) ? n : null;
  }

  /** Balance column: loading, error, zero as 0.0000, otherwise whole-number amount. */
  formatClientBalance(client: any): string {
    if (client?.totalBalanceDue === undefined) {
      return '…';
    }
    if (client.totalBalanceDue === null) {
      return 'N/A';
    }
    const n = Number(client.totalBalanceDue);
    if (!Number.isFinite(n)) {
      return 'N/A';
    }
    if (n === 0) {
      return '0.0000';
    }
    return Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  /** True when balance is loaded and exactly zero (good standing). */
  hasZeroBalance(client: any): boolean {
    if (client?.totalBalanceDue === undefined || client.totalBalanceDue === null) {
      return false;
    }
    const n = Number(client.totalBalanceDue);
    return Number.isFinite(n) && n === 0;
  }

  /** Modifier classes for balance pill (same semantics as former balance-text colors). */
  getBalanceBadgeClasses(client: any): Record<string, boolean> {
    if (client?.totalBalanceDue === undefined) {
      return { 'balance-loading': true };
    }
    if (client.totalBalanceDue === null) {
      return { 'balance-na': true };
    }
    const n = Number(client.totalBalanceDue);
    if (!Number.isFinite(n)) {
      return { 'balance-na': true };
    }
    if (n === 0) {
      return { 'balance-zero': true };
    }
    if (n < 0) {
      return { 'balance-credit': true };
    }
    return { 'balance-due': true };
  }

  /** True when the client has an outstanding balance (debt). */
  hasClientDebt(client: any): boolean {
    if (client?.totalBalanceDue === undefined || client.totalBalanceDue === null) {
      return false;
    }
    const n = Number(client.totalBalanceDue);
    return Number.isFinite(n) && n > 0;
  }

  onBalanceBadgeClick(client: any, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.hasClientDebt(client)) {
      return;
    }
    this.openPayAllClientDebtModal(client);
  }

  openPayAllClientDebtModal(client: any): void {
    if (!client?.id) {
      return;
    }
    this.closeActionDropdown();
    this.payAllDebtClient = client;
    this.payAllDebtClientTotalDue = this.hasClientDebt(client)
      ? Number(client.totalBalanceDue)
      : null;
    this.payAllDebtMessage = '';
    this.payAllDebtMessageOk = false;
    this.payAllDebtResult = null;
    this.payAllDebtForm = {
      amountToPay: this.getDefaultPayAllDebtAmount(),
      paymentForm: 'Cash At Hand',
      notes: 'Pay all client debt',
    };
    this.payAllDebtAllocation = [];
    this.payAllDebtVisits = [];
    this.payAllDebtLoading = true;
    this.showPayAllDebtModal = true;
    document.body.style.overflow = 'hidden';

    this.api.getInitialTriageVitalsForVisitId(client.id).subscribe({
      next: (visits) => {
        this.payAllDebtVisits = this.sortVisitsOldestFirst(Array.isArray(visits) ? visits : []);
        this.payAllDebtForm.amountToPay = this.getDefaultPayAllDebtAmount();
        this.payAllDebtLoading = false;
        this.rebuildPayAllDebtAllocation();
      },
      error: () => {
        this.payAllDebtLoading = false;
        this.payAllDebtMessage = 'Could not load client orders.';
        this.payAllDebtMessageOk = false;
      },
    });
  }

  closePayAllClientDebtModal(): void {
    this.showPayAllDebtModal = false;
    this.payAllDebtClient = null;
    this.payAllDebtClientTotalDue = null;
    this.payAllDebtVisits = [];
    this.payAllDebtAllocation = [];
    this.payAllDebtSaving = false;
    this.payAllDebtLoading = false;
    this.payAllDebtMessage = '';
    this.payAllDebtMessageOk = false;
    this.payAllDebtResult = null;
    if (!this.showQueueClientModal && !this.showClientDetailsModal && this.isCollapsedNewClient) {
      document.body.style.overflow = '';
    }
  }

  onPayAllDebtAmountChange(): void {
    this.rebuildPayAllDebtAllocation();
  }

  payAllDebtTotalOutstanding(): number {
    return (this.payAllDebtVisits || []).reduce((sum, visit) => {
      const due = Number(visit?.balanceDue ?? 0);
      return sum + (Number.isFinite(due) && due > 0 ? due : 0);
    }, 0);
  }

  submitPayAllClientDebt(): void {
    const clientId = this.payAllDebtClient?.id;
    const amount = Number(this.payAllDebtForm.amountToPay);
    if (!clientId) {
      this.payAllDebtMessage = 'Select a client first.';
      this.payAllDebtMessageOk = false;
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      this.payAllDebtMessage = 'Enter a valid payment amount.';
      this.payAllDebtMessageOk = false;
      return;
    }
    if (!this.payAllDebtAllocation.length) {
      this.payAllDebtMessage = 'No outstanding visit balances to pay.';
      this.payAllDebtMessageOk = false;
      return;
    }

    this.payAllDebtSaving = true;
    this.payAllDebtMessage = '';
    const payload = {
      amountToPay: amount,
      paymentForm: this.payAllDebtForm.paymentForm || 'Cash At Hand',
      status: 'Approved',
      notes: (this.payAllDebtForm.notes || 'Pay all client debt').trim(),
      receivedBy: (sessionStorage.getItem('username') || '').trim(),
    };

    this.api.payAllClientDebt(clientId, payload).subscribe({
      next: (res: any) => {
        this.payAllDebtSaving = false;
        this.payAllDebtMessageOk = true;
        this.payAllDebtResult = res?.data ?? null;
        this.payAllDebtMessage =
          res?.message ||
          `Payment applied across ${this.payAllDebtResult?.allocations?.length ?? 0} visit(s).`;
        this.refreshPayAllDebtClientTotal(clientId);
        this.api.getInitialTriageVitalsForVisitId(clientId).subscribe({
          next: (visits) => {
            this.payAllDebtVisits = this.sortVisitsOldestFirst(Array.isArray(visits) ? visits : []);
            this.rebuildPayAllDebtAllocation();
          },
        });
      },
      error: (err) => {
        this.payAllDebtSaving = false;
        this.payAllDebtMessageOk = false;
        this.payAllDebtMessage =
          err?.error?.message || err?.error?.data?.message || 'Could not apply client debt payment.';
      },
    });
  }

  private getDefaultPayAllDebtAmount(): number | null {
    const totalDebt = Number(this.payAllDebtClientTotalDue);
    if (Number.isFinite(totalDebt) && totalDebt > 0) {
      return totalDebt;
    }
    const visitOutstanding = this.payAllDebtTotalOutstanding();
    if (visitOutstanding > 0) {
      return visitOutstanding;
    }
    return null;
  }

  private sortVisitsOldestFirst(visits: any[]): any[] {
    return [...visits].sort((a, b) => {
      const an = Number(a?.visitNumber ?? a?.id ?? 0);
      const bn = Number(b?.visitNumber ?? b?.id ?? 0);
      if (an !== bn) {
        return an - bn;
      }
      return Number(a?.id ?? 0) - Number(b?.id ?? 0);
    });
  }

  private rebuildPayAllDebtAllocation(): void {
    let remaining = Number(this.payAllDebtForm.amountToPay);
    if (!Number.isFinite(remaining) || remaining <= 0) {
      this.payAllDebtAllocation = [];
      return;
    }
    const rows: {
      visitId: number;
      visitNumber: number | null;
      visitDate: string;
      balanceDue: number;
      amountToApply: number;
    }[] = [];
    for (const visit of this.payAllDebtVisits || []) {
      if (remaining <= 0) {
        break;
      }
      const due = Number(visit?.balanceDue ?? 0);
      if (!Number.isFinite(due) || due <= 0) {
        continue;
      }
      const apply = Math.min(remaining, due);
      rows.push({
        visitId: Number(visit.id),
        visitNumber: visit?.visitNumber != null ? Number(visit.visitNumber) : null,
        visitDate: String(visit?.visitDate ?? ''),
        balanceDue: due,
        amountToApply: apply,
      });
      remaining -= apply;
    }
    this.payAllDebtAllocation = rows;
  }

  private refreshPayAllDebtClientTotal(clientId: number): void {
    this.api.getTotalClientBalanceDue(clientId).subscribe({
      next: (res) => {
        const total = res?.TotalAmountDue ?? res?.totalAmountDue ?? null;
        const parsed = total != null ? Number(total) : null;
        this.payAllDebtClientTotalDue = Number.isFinite(parsed as number) ? (parsed as number) : null;
        this.updateClientBalanceInList(clientId, this.payAllDebtClientTotalDue);
        if (this.clientDetailsRecord?.id === clientId) {
          this.clientDetailsRecord = {
            ...this.clientDetailsRecord,
            totalBalanceDue: this.payAllDebtClientTotalDue,
          };
        }
      },
    });
  }

  private updateClientBalanceInList(clientId: number, totalBalanceDue: number | null): void {
    const apply = (list: any[]) =>
      list.map((p) => (p?.id === clientId ? { ...p, totalBalanceDue } : p));
    this.clientList = apply(this.clientList);
    this.data = apply(this.data);
    if (this.payAllDebtClient?.id === clientId) {
      this.payAllDebtClient = { ...this.payAllDebtClient, totalBalanceDue };
    }
  }

  private assignableClientGroups(): any[] {
    return this.accessControl.filterAssignableClientGroups(this.clientGroupList);
  }

  loadClientGroups() {
    this.api.getClientGroupList().subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.clientGroupList = res;
        } else if (res && Array.isArray(res.data)) {
          this.clientGroupList = res.data;
        }
        this.filteredClientGroupList = this.assignableClientGroups();
      },
      error: (err: any) => {
        console.error("Error loading client groups:", err);
        this.clientGroupList = [];
        this.filteredClientGroupList = [];
        this.showGlobalError('Unable to load client groups.');
      }
    });
  }

  // Client Group Dropdown Methods
  toggleClientGroupDropdown() {
    this.isClientGroupDropdownOpen = !this.isClientGroupDropdownOpen;
    if (this.isClientGroupDropdownOpen) {
      this.clientGroupSearchQuery = '';
      this.filteredClientGroupList = this.assignableClientGroups();
    }
  }

  closeClientGroupDropdown() {
    this.isClientGroupDropdownOpen = false;
    this.clientGroupSearchQuery = '';
  }

  filterClientGroups() {
    const query = this.clientGroupSearchQuery.toLowerCase().trim();
    const source = this.assignableClientGroups();
    if (!query) {
      this.filteredClientGroupList = source;
      return;
    }
    this.filteredClientGroupList = source.filter(group => {
      const groupName = (group.groupName || group.name || '').toLowerCase();
      const shortForm = (group.groupNameShortForm || '').toLowerCase();
      return groupName.includes(query) || shortForm.includes(query);
    });
  }

  selectClientGroup(group: any) {
    if (!this.accessControl.canAssignClientToGroup(group)) {
      this.showGlobalError('You need admin approval to add any client in Veneranda Business group.');
      return;
    }
    // Store the group ID for the backend, but display the group name
    this.currentClient.clientGroupId = group.id;
    this.currentClient.clientGroup = group.groupName || group.name; // For display purposes
    this.closeClientGroupDropdown();
  }

  private resolveClientGroupDisplayName(groupId: any): string {
    if (!groupId) {
      return '';
    }

    const matchedGroup = this.clientGroupList.find((group: any) => {
      const id = group?.id ?? group?.clientGroupId;
      return String(id) === String(groupId);
    });

    return matchedGroup?.groupName || matchedGroup?.name || '';
  }

  private loadClientGroupDisplayById(groupId: any): void {
    if (!groupId) {
      return;
    }

    this.api.getClientGroupByGroupName(groupId).subscribe({
      next: (group: any) => {
        const resolvedName = group?.groupName || group?.name || '';
        if (
          resolvedName &&
          String(this.currentClient?.clientGroupId) === String(groupId)
        ) {
          this.currentClient.clientGroup = resolvedName;
        }
      },
      error: (err: any) => {
        console.error('Error loading client group by id:', err);
      }
    });
  }

  // Add New Group Modal Methods
  openAddNewGroupModal() {
    this.closeClientGroupDropdown();
    this.clearFormNewGroup();
    this.isCollapsedNewGroup = false;
    document.body.style.overflow = 'hidden';
  }

  closeAddNewGroupModal() {
    this.isCollapsedNewGroup = true;
    document.body.style.overflow = '';
    this.clearFormNewGroup();
  }

  clearFormNewGroup() {
    this.currentClientGroup = {
      groupName: '',
      groupNameShortForm: '',
      description: ''
    };
    this.saveButtonStatusGroup = "Add New Client Group";
    this.isEditingGroup = false;
  }

  saveGroup(groupData: any) {
    this.isButtonDisabled = true;
    console.log("Client group data to save:", groupData);

    if (this.isEditingGroup) {
      // Update existing group - Note: Update functionality needs to be implemented
      this.isButtonDisabled = false;
      this.responseColor = 'rgb(238, 16, 16)';
      this.responseMessage = "Update functionality is not yet implemented in the backend API.";
      this.showDivAddToDataBaseNewClient = true;
      this.showGlobalInfo(this.responseMessage);
      
      setTimeout(() => {
        this.showDivAddToDataBaseNewClient = false;
      }, 4000);
    } else {
      // Create new group
      this.api.createClientGroup(groupData).subscribe({
        next: (response) => {
          console.log("Client group saved successfully:", response);
          this.isButtonDisabled = false;
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = "Client group added successfully!";
          this.showDivAddToDataBaseNewClient = true;
          this.showGlobalSuccess(this.responseMessage);
          
          // Reload client groups
          this.loadClientGroups();
          
          setTimeout(() => {
            this.showDivAddToDataBaseNewClient = false;
            this.closeAddNewGroupModal();
          }, 2000);
        },
        error: (error) => {
          console.error("Error saving client group:", error);
          this.isButtonDisabled = false;
          this.responseColor = 'rgb(238, 16, 16)';
          this.responseMessage = error.error?.message || "Error saving client group. Please try again.";
          this.showDivAddToDataBaseNewClient = true;
          this.showGlobalError(this.responseMessage);
          
          setTimeout(() => {
            this.showDivAddToDataBaseNewClient = false;
          }, 4000);
        }
      });
    }
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.closeClientGroupDropdown();
    }
    if (
      !target.closest('.action-dropdown-container') &&
      !target.closest('.action-dropdown-menu-fixed')
    ) {
      this.closeActionDropdown();
    }
    if (!target.closest('.client-filter-export-dropdown')) {
      this.closeExportDropdown();
    }
    if (!target.closest('.client-filter-dropdown')) {
      this.closeFilterDropdowns();
    }
    if (!target.closest('.page-size-dropdown')) {
      this.closePageSizeMenu();
    }
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    if (this.openActionDropdownId !== null) {
      this.closeActionDropdown();
    }
  }

  closeActionDropdown(): void {
    this.openActionDropdownId = null;
    this.actionDropdownClient = null;
  }

  toggleActionDropdown(client: any, event: MouseEvent): void {
    event.stopPropagation();
    const clientId = client?.id;
    if (clientId == null) {
      return;
    }
    if (this.openActionDropdownId === clientId) {
      this.closeActionDropdown();
      return;
    }

    const buttonElement = event.currentTarget as HTMLElement;
    const rect = buttonElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openDown =
      spaceBelow >= this.actionMenuEstimatedHeight || spaceBelow >= spaceAbove;

    this.dropdownDirection = openDown ? 'down' : 'up';

    let top = openDown ? rect.bottom + 4 : rect.top - this.actionMenuEstimatedHeight - 4;
    let left = rect.right - this.actionMenuWidth;

    const margin = 8;
    left = Math.max(margin, Math.min(left, viewportWidth - this.actionMenuWidth - margin));
    top = Math.max(
      margin,
      Math.min(top, viewportHeight - this.actionMenuEstimatedHeight - margin)
    );

    this.actionMenuStyle = {
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
    };
    this.actionDropdownClient = client;
    this.openActionDropdownId = clientId;
  }

  get filteredClientList() {
    const searchText = this.searchQuery.toLowerCase().trim();
    const digitsQuery = searchText.replace(/\D/g, '');
    const textFiltered = this.clientList.filter(client => {
      if (!searchText) {
        return true;
      }
      if (this.selectedColumn === 'all') {
        return this.clientMatchesRegistrySearch(client, searchText, digitsQuery);
      }

      if (this.selectedColumn === 'name') {
        const firstName = client.clientFirstName || client.firstName || '';
        const secondName = client.clientSecondName || client.secondName || '';
        const fullName = `${firstName} ${secondName}`;
        return fullName.toLowerCase().includes(searchText);
      }
      if (this.selectedColumn === 'clientContact') {
        return this.valueMatchesSearch(
          client.clientContact || client.phone || client.clientPhone,
          searchText,
          digitsQuery
        );
      }
      if (this.selectedColumn === 'clientGender') {
        const gender = client.clientGender || client.gender || '';
        return gender.toLowerCase().includes(searchText);
      }
      if (this.selectedColumn === 'clientGroup') {
        const group = client.clientGroup?.groupName || client.clientGroup || '';
        return (typeof group === 'string' ? group : '').toLowerCase().includes(searchText);
      }
      const value = client[this.selectedColumn];
      return this.valueMatchesSearch(value, searchText, digitsQuery);
    });

    return textFiltered.filter(client => {
      if (this.selectedDebtFilter === 'with-debt' && !this.hasClientDebt(client)) {
        return false;
      }
      if (this.selectedDebtFilter === 'without-debt' && this.hasClientDebt(client)) {
        return false;
      }
      if (this.selectedClientGroupFilter !== 'all') {
        const clientGroupId = this.getClientGroupId(client);
        if (String(clientGroupId ?? '') !== this.selectedClientGroupFilter) {
          return false;
        }
      }
      const createdAt = this.extractCreatedDate(client);
      if (this.createdDateFrom && (!createdAt || createdAt < this.createdDateFrom)) {
        return false;
      }
      if (this.createdDateTo && (!createdAt || createdAt > this.createdDateTo)) {
        return false;
      }
      return true;
    });
  }

  applyRegistryFilters(): void {
    this.closeFilterDropdowns();
    this.createdDateFrom = this.structToIsoDate(this.pendingCreatedDateFromStruct);
    this.createdDateTo = this.structToIsoDate(this.pendingCreatedDateToStruct);
    this.selectedClientGroupFilter = this.pendingClientGroupFilter || 'all';
    this.selectedDebtFilter = this.pendingDebtFilter || 'all';
    this.page = 1;
  }

  clearAdvancedFilters(): void {
    this.closeFilterDropdowns();
    this.pendingCreatedDateFromStruct = null;
    this.pendingCreatedDateToStruct = null;
    this.pendingClientGroupFilter = 'all';
    this.pendingDebtFilter = 'all';
    this.createdDateFrom = '';
    this.createdDateTo = '';
    this.selectedClientGroupFilter = 'all';
    this.selectedDebtFilter = 'all';
    this.page = 1;
  }

  private structToIsoDate(value: NgbDateStruct | null): string {
    if (!value?.year || !value?.month || !value?.day) {
      return '';
    }
    return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
  }

  toggleFilterGroupDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.filterGroupDropdownOpen = !this.filterGroupDropdownOpen;
    if (this.filterGroupDropdownOpen) {
      this.filterDebtDropdownOpen = false;
    }
  }

  toggleFilterDebtDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.filterDebtDropdownOpen = !this.filterDebtDropdownOpen;
    if (this.filterDebtDropdownOpen) {
      this.filterGroupDropdownOpen = false;
    }
  }

  closeFilterDropdowns(): void {
    this.filterGroupDropdownOpen = false;
    this.filterDebtDropdownOpen = false;
  }

  selectFilterClientGroup(value: string | number): void {
    this.pendingClientGroupFilter = String(value);
    this.closeFilterDropdowns();
  }

  selectFilterDebt(value: 'all' | 'with-debt' | 'without-debt'): void {
    this.pendingDebtFilter = value;
    this.closeFilterDropdowns();
  }

  getPendingClientGroupLabel(): string {
    if (this.pendingClientGroupFilter === 'all') {
      return 'All groups';
    }
    const group = this.clientGroupList.find(
      (item) => String(item?.id) === String(this.pendingClientGroupFilter)
    );
    return group?.groupName || group?.name || 'All groups';
  }

  getPendingDebtLabel(): string {
    return (
      this.debtFilterOptions.find((option) => option.value === this.pendingDebtFilter)?.label ||
      'All clients'
    );
  }

  private extractCreatedDate(client: any): string | null {
    const raw =
      client?.createdAt ??
      client?.dateCreated ??
      client?.createdDate ??
      client?.createdOn ??
      client?.creationDate;
    if (!raw) {
      return null;
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().slice(0, 10);
  }

  private getClientGroupId(client: any): number | string | null {
    return (
      client?.clientGroup?.id ??
      client?.clientGroupId ??
      client?.clientGroup?.clientGroupId ??
      null
    );
  }

  private readonly importTemplateHeaders = [
    'First Name',
    'Second Name',
    'Contact',
    'Gender',
    'Date of Birth',
    'Age',
    'Address',
    'Occupation',
    'Client Group',
    'Next of Kin Name',
    'Next of Kin Contact',
    'Relationship',
    'Next of Kin Address'
  ];

  private readonly importHeaderAliases: Record<string, string> = {
    sn: '_skip',
    balance: '_skip',
    'first name': 'clientFirstName',
    clientfirstname: 'clientFirstName',
    firstname: 'clientFirstName',
    'second name': 'clientSecondName',
    clientsecondname: 'clientSecondName',
    secondname: 'clientSecondName',
    surname: 'clientSecondName',
    contact: 'clientContact',
    phone: 'clientContact',
    clientcontact: 'clientContact',
    gender: 'clientGender',
    clientgender: 'clientGender',
    'date of birth': 'clientDateOfBirth',
    dateofbirth: 'clientDateOfBirth',
    clientdateofbirth: 'clientDateOfBirth',
    dob: 'clientDateOfBirth',
    age: 'clientAge',
    clientage: 'clientAge',
    address: 'clientAddress',
    clientaddress: 'clientAddress',
    occupation: 'occupation',
    'client group': 'clientGroup',
    clientgroup: 'clientGroup',
    group: 'clientGroup',
    'next of kin name': 'nextOfKinName',
    nextofkinname: 'nextOfKinName',
    'next of kin contact': 'nextOfKinContact',
    nextofkincontact: 'nextOfKinContact',
    relationship: 'relationship',
    'next of kin address': 'nextOfKinAddress',
    nextofkinaddress: 'nextOfKinAddress',
    clientgroupid: 'clientGroupId'
  };

  openImportModal(): void {
    this.resetImportState();
    this.showImportModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeImportModal(): void {
    if (this.importUploading) {
      return;
    }
    this.showImportModal = false;
    this.resetImportState();
    document.body.style.overflow = '';
  }

  private resetImportState(): void {
    this.importPreviewRows = [];
    this.importFileName = '';
    this.importParseError = '';
  }

  downloadImportTemplate(): void {
    const sampleRow = {
      'First Name': 'John',
      'Second Name': 'Doe',
      'Contact': '0700123456',
      'Gender': 'Male',
      'Date of Birth': '1990-05-15',
      'Age': 35,
      'Address': 'Kampala',
      'Occupation': 'Teacher',
      'Client Group': '',
      'Next of Kin Name': 'Jane Doe',
      'Next of Kin Contact': '0700654321',
      'Relationship': 'Spouse',
      'Next of Kin Address': 'Kampala'
    };

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([sampleRow], { header: this.importTemplateHeaders });
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clients');
    XLSX.writeFile(wb, 'client-import-template.xlsx');
  }

  onImportFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.importFileName = file.name;
    this.importParseError = '';
    this.importPreviewRows = [];

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result;
        if (!data) {
          this.importParseError = 'Could not read the selected file.';
          return;
        }

        let workbook: XLSX.WorkBook;
        if (file.name.toLowerCase().endsWith('.csv')) {
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
          workbook = XLSX.read(text, { type: 'string' });
        } else {
          workbook = XLSX.read(data, { type: 'array' });
        }

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          this.importParseError = 'The file has no worksheets.';
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        if (!rawRows.length) {
          this.importParseError = 'No client rows found. Use the template and add data from row 2.';
          return;
        }

        this.importPreviewRows = rawRows.map((row, index) => this.buildImportPreviewRow(row, index + 2));
      } catch {
        this.importParseError = 'Failed to parse file. Please use the provided Excel template.';
      } finally {
        input.value = '';
      }
    };

    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  get importValidRows(): any[] {
    return this.importPreviewRows.filter(row => row.isValid).map(row => row.data);
  }

  get importInvalidCount(): number {
    return this.importPreviewRows.filter(row => !row.isValid).length;
  }

  uploadImportedClients(): void {
    const payload = this.importValidRows;
    if (!payload.length) {
      this.showGlobalError('No valid client rows to import. Fix errors in the preview first.');
      return;
    }

    this.importUploading = true;
    this.api.addBulkClients(payload).subscribe({
      next: (res: any) => {
        this.importUploading = false;
        const message = res?.message || `Imported ${payload.length} client(s) successfully.`;
        this.showGlobalSuccess(message);
        this.closeImportModal();
        this.initializeTableData();
      },
      error: (err: any) => {
        this.importUploading = false;
        this.showGlobalError(err?.error?.message || 'Failed to import clients. Check the file and try again.');
      }
    });
  }

  private buildImportPreviewRow(raw: Record<string, any>, rowNumber: number) {
    const normalized = this.normalizeImportRow(raw);
    const errors: string[] = [];
    const warnings: string[] = [];

    const clientFirstName = this.cleanImportText(normalized['clientFirstName']);
    const clientSecondName = this.cleanImportText(normalized['clientSecondName']);
    const clientContact = this.cleanImportText(normalized['clientContact']);
    const clientGender = this.normalizeImportGender(normalized['clientGender']);

    if (!clientFirstName) {
      errors.push('First Name is required');
    }
    if (!clientSecondName) {
      errors.push('Second Name is required');
    }
    if (!clientContact) {
      errors.push('Contact is required');
    }
    if (!clientGender) {
      errors.push('Gender is required (Male, Female, or Other)');
    }

    const clientAge = this.parseImportAge(normalized['clientAge']);
    const formattedDate = this.formatImportDate(normalized['clientDateOfBirth']);
    const clientGroupName = this.cleanImportText(normalized['clientGroup']);
    let clientGroupId: number | null = null;
    if (normalized['clientGroupId'] !== undefined && normalized['clientGroupId'] !== '') {
      const parsedId = Number(normalized['clientGroupId']);
      clientGroupId = Number.isFinite(parsedId) ? parsedId : null;
    } else {
      clientGroupId = this.resolveImportClientGroupId(clientGroupName);
    }

    if (clientGroupName && clientGroupId == null) {
      warnings.push(`Client group "${clientGroupName}" not found — client will be saved without a group`);
    }

    const data = {
      clientFirstName,
      clientSecondName,
      clientAddress: this.cleanImportText(normalized['clientAddress']),
      clientContact,
      clientGender,
      clientDateOfBirth: formattedDate,
      clientAge,
      occupation: this.cleanImportText(normalized['occupation']),
      nextOfKinName: this.cleanImportText(normalized['nextOfKinName']),
      nextOfKinContact: this.cleanImportText(normalized['nextOfKinContact']),
      relationship: this.cleanImportText(normalized['relationship']),
      nextOfKinAddress: this.cleanImportText(normalized['nextOfKinAddress']),
      clientGroupId,
      userRole: this.userRole || null
    };

    return {
      rowNumber,
      data,
      errors,
      warnings,
      isValid: errors.length === 0
    };
  }

  private normalizeImportRow(raw: Record<string, any>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      const field = this.resolveImportHeader(key);
      if (!field || field === '_skip') {
        continue;
      }
      if (normalized[field] === undefined || normalized[field] === '') {
        normalized[field] = value;
      }
    }
    return normalized;
  }

  private resolveImportHeader(header: string): string | null {
    const key = String(header || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!key) {
      return null;
    }
    if (this.importHeaderAliases[key]) {
      return this.importHeaderAliases[key];
    }
    const compact = key.replace(/\s+/g, '');
    return this.importHeaderAliases[compact] || null;
  }

  private cleanImportText(value: any): string {
    if (value === undefined || value === null) {
      return '';
    }
    return String(value).trim();
  }

  private normalizeImportGender(value: any): string {
    const raw = this.cleanImportText(value).toLowerCase();
    if (!raw) {
      return '';
    }
    if (raw === 'm' || raw === 'male') {
      return 'Male';
    }
    if (raw === 'f' || raw === 'female') {
      return 'Female';
    }
    if (raw === 'other') {
      return 'Other';
    }
    const title = raw.charAt(0).toUpperCase() + raw.slice(1);
    return ['Male', 'Female', 'Other'].includes(title) ? title : '';
  }

  private parseImportAge(value: any): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private formatImportDate(value: any): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value === 'number' && value > 20000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      if (!Number.isNaN(date.getTime())) {
        return this.toBackendDateString(date);
      }
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      const slashMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (slashMatch) {
        const year = Number(slashMatch[1]);
        const month = Number(slashMatch[2]);
        const day = Number(slashMatch[3]);
        return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
      }
      const date = new Date(trimmed);
      if (!Number.isNaN(date.getTime())) {
        return this.toBackendDateString(date);
      }
    }

    return null;
  }

  private toBackendDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  private resolveImportClientGroupId(groupName: string): number | null {
    if (!groupName) {
      return null;
    }
    const query = groupName.toLowerCase();
    const match = this.clientGroupList.find(group => {
      const name = (group.groupName || group.name || '').toLowerCase();
      const shortForm = (group.groupNameShortForm || '').toLowerCase();
      return name === query || shortForm === query;
    });
    return match?.id != null ? Number(match.id) : null;
  }

  // Export methods
  toggleExportDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.exportDropdownOpen = !this.exportDropdownOpen;
  }

  closeExportDropdown(): void {
    this.exportDropdownOpen = false;
  }

  exportFilteredClients(format: 'excel' | 'pdf'): void {
    this.closeExportDropdown();
    if (!this.filteredClientList.length) {
      this.showGlobalInfo('No clients to export for the current filters.');
      return;
    }
    if (format === 'excel') {
      this.exportToExcel();
      return;
    }
    this.downloadPdf();
  }

  exportToExcel() {
    const dataToExport = this.filteredClientList.map((client, index) => ({
      'SN': index + 1,
      'First Name': client.clientFirstName || client.firstName || '',
      'Second Name': client.clientSecondName || client.secondName || '',
      'Contact': client.clientContact || client.phone || '',
      'Gender': client.clientGender || client.gender || '',
      'Date of Birth': client.clientDateOfBirth || client.dateOfBirth || '',
      'Age': client.clientAge ?? '',
      'Address': client.clientAddress || client.address || '',
      'Occupation': client.occupation || '',
      'Client Group': (client.clientGroup?.groupName || client.clientGroup || ''),
      'Next of Kin Name': client.nextOfKinName || '',
      'Next of Kin Contact': client.nextOfKinContact || '',
      'Relationship': client.relationship || '',
      'Next of Kin Address': client.nextOfKinAddress || '',
      'Debt': this.formatClientBalance(client)
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clients');
    XLSX.writeFile(wb, 'clients.xlsx');
  }

  downloadPdf() {
    const data = this.htmlData.nativeElement;
    html2canvas(data).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 208;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save('clients.pdf');
    });
  }

  // Client modal methods
  openClientModal() {
    this.clearFormNewClient();
    this.isCollapsedNewClient = false;
    document.body.style.overflow = 'hidden';
  }

  clearFormNewClient() {
    this.currentClient = {
      clientFirstName: '',
      clientSecondName: '',
      clientAddress: '',
      clientContact: defaultContactValue(),
      clientGender: '',
      bloodGroup: '',
      clientDateOfBirth: '',
      clientAge: null,
      occupation: '',
      nextOfKinName: '',
      nextOfKinContact: defaultContactValue(),
      relationship: '',
      nextOfKinAddress: '',
      clientGroupId: null,
      clientGroup: '' // For display only
    };
    // Reset client group dropdown
    this.closeClientGroupDropdown();
    this.saveButtonStatus = "Add New Client";
    this.showDivAddToDataBaseNewClient = false;
    this.showDivUpdatedLoaderNewClient = false;
    this.isButtonDisabled = false;
    this.isEditingClient = false;
    this.editingClientId = null;
  }

  closeClientModal() {
    this.isCollapsedNewClient = true;
    document.body.style.overflow = '';
    this.clearFormNewClient();
  }

  editClient(client: any) {
    if (!client || !client.id) {
      console.error('Invalid client data for editing');
      return;
    }

    this.closeActionDropdown();
    this.isEditingClient = true;
    this.editingClientId = client.id;
    const resolvedGroupId =
      client?.clientGroup?.id ||
      client?.clientGroupId ||
      client?.clientGroup?.clientGroupId ||
      (typeof client?.clientGroup === 'number' ? client.clientGroup : null);

    const groupFromObject =
      (typeof client?.clientGroup === 'object' &&
        (client.clientGroup?.groupName || client.clientGroup?.name)) ||
      '';
    const groupFromString =
      typeof client?.clientGroup === 'string' ? client.clientGroup : '';
    const resolvedGroupName =
      groupFromObject ||
      groupFromString ||
      this.resolveClientGroupDisplayName(resolvedGroupId);

    this.currentClient = {
      clientFirstName: client.clientFirstName || client.firstName || '',
      clientSecondName: client.clientSecondName || client.secondName || '',
      clientAddress: client.clientAddress || client.address || '',
      clientContact: client.clientContact || client.phone || '',
      clientGender: client.clientGender || client.gender || '',
      bloodGroup: client.bloodGroup || '',
      clientDateOfBirth: client.clientDateOfBirth || client.dateOfBirth || '',
      clientAge: client.clientAge || null,
      occupation: client.occupation || '',
      nextOfKinName: client.nextOfKinName || '',
      nextOfKinContact: client.nextOfKinContact || '',
      relationship: client.relationship || '',
      nextOfKinAddress: client.nextOfKinAddress || '',
      clientGroupId: resolvedGroupId,
      clientGroup: resolvedGroupName // For display
    };

    if (resolvedGroupId && !resolvedGroupName) {
      this.loadClientGroupDisplayById(resolvedGroupId);
    }
    this.saveButtonStatus = "Update Client";
    this.showDivAddToDataBaseNewClient = false;
    this.showDivUpdatedLoaderNewClient = false;
    this.isButtonDisabled = false;
    this.isCollapsedNewClient = false;
    document.body.style.overflow = 'hidden';
  }

  /** Row click opens client order (same as Consultation); ignores checkbox and actions column. */
  onClientTableRowClick(client: any, event: MouseEvent): void {
    const el = event.target as HTMLElement | null;
    if (!el || !client?.id) {
      return;
    }
    if (this.consultationLoadingClientId === client.id) {
      return;
    }
    if (
      el.closest('input[type="checkbox"]') ||
      el.closest('.client-row-select-cell') ||
      el.closest('.client-row-actions-cell')
    ) {
      return;
    }
    this.openConsultation(client);
  }

  openClientDetails(client: any) {
    if (!client?.id) {
      console.error('Invalid client data for details view');
      return;
    }
    this.closeActionDropdown();
    this.clientDetailsRecord = {
      ...this.buildClientItemForClientVisit(client),
      totalBalanceDue: client.totalBalanceDue
    };
    this.showClientDetailsModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeClientDetailsModal() {
    this.showClientDetailsModal = false;
    this.clientDetailsRecord = null;
    document.body.style.overflow = '';
  }

  /**
   * Same flow as `client.component.ts` → `clientDetails`: latest visit + full client row in sessionStorage, then `/#/overview/clienttransactions`.
   */
  openConsultation(client: any) {
    if (!client || !client.id) {
      console.error('Invalid client data for consultation');
      return;
    }

    this.closeActionDropdown();
    this.consultationLoadingClientId = client.id;

    const item = this.buildClientItemForClientVisit(client);

    this.api.getInitialVisitForClientId(client.id).subscribe({
      next: (visitRes) => {
        const initialVisit = visitRes != null && typeof visitRes === 'object' && visitRes.id != null ? visitRes : {};
        sessionStorage.setItem('item', JSON.stringify(item));
        sessionStorage.setItem('initialClientVisit', JSON.stringify(initialVisit));
        this.consultationLoadingClientId = null;
        this.router.navigate(['/overview/clienttransactions']);
      },
      error: () => {
        sessionStorage.setItem('item', JSON.stringify(item));
        sessionStorage.setItem('initialClientVisit', JSON.stringify({}));
        this.consultationLoadingClientId = null;
        this.router.navigate(['/overview/clienttransactions']);
      }
    });
  }

  /**
   * Shape expected by `ClientVisitComponent.loadClientDataFromItem` (aligned with client list / edit form).
   */
  private buildClientItemForClientVisit(client: any): any {
    const resolvedGroupId =
      client?.clientGroup?.id ||
      client?.clientGroupId ||
      client?.clientGroup?.clientGroupId ||
      (typeof client?.clientGroup === 'number' ? client.clientGroup : null);

    const groupFromObject =
      (typeof client?.clientGroup === 'object' &&
        (client.clientGroup?.groupName ||
          client.clientGroup?.name ||
          client.clientGroup?.groupNameShortForm)) ||
      '';
    const groupFromString =
      typeof client?.clientGroup === 'string' ? client.clientGroup : '';

    const resolvedGroupName =
      client.clientGroupName ||
      client.groupName ||
      client.groupNameShortForm ||
      groupFromObject ||
      groupFromString ||
      '';

    return {
      ...client,
      id: client.id,
      clientId: client.id,
      clientFirstName: client.clientFirstName || client.firstName || '',
      clientSecondName: client.clientSecondName || client.secondName || '',
      clientProfilePic:
        client.clientProfilePic || client.profilePic || 'assets/images/vector.jpeg',
      clientFileNo:
        client.clientFileNo || client.fileNo || client.clientFileNumber || '',
      clientContact:
        client.clientContact || client.phone || client.clientPhone || '',
      clientGender: client.clientGender || client.gender || '',
      bloodGroup: client.bloodGroup || '',
      clientAddress: client.clientAddress || client.address || '',
      clientAge: client.clientAge ?? client.age ?? null,
      clientDateOfBirth: client.clientDateOfBirth || client.dateOfBirth || '',
      occupation: client.occupation || '',
      nextOfKinName: client.nextOfKinName || '',
      nextOfKinContact: client.nextOfKinContact || '',
      nextOfKinAddress: client.nextOfKinAddress || '',
      relationship: client.relationship || '',
      diagnosis: client.diagnosis || '',
      clientGroupId: resolvedGroupId,
      clientGroupName: resolvedGroupName
    };
  }

  saveClient(data: any) {
    this.showDivUpdatedLoaderNewClient = true;
    this.isButtonDisabled = true;
    this.showDivAddToDataBaseNewClient = false;

    const clientData = {
      // Backend entity fields
      patientFirstName: data.clientFirstName || data.patientFirstName || '',
      patientSecondName: data.clientSecondName || data.patientSecondName || '',
      patientAddress: data.clientAddress || data.patientAddress || '',
      patientContact: data.clientContact || data.patientContact || '',
      patientGender: data.clientGender || data.patientGender || '',
      patientGroupId: this.currentClient?.clientGroupId || this.currentClient?.patientGroupId || null,
      // Business UI aliases (accepted by PatientRequest / PatientUpdateRequest)
      clientFirstName: data.clientFirstName || '',
      clientSecondName: data.clientSecondName || '',
      clientAddress: data.clientAddress || '',
      clientContact: data.clientContact || '',
      clientGender: data.clientGender || '',
      occupation: data.occupation || '',
      nextOfKinName: data.nextOfKinName || '',
      nextOfKinContact: data.nextOfKinContact || '',
      relationship: data.relationship || '',
      nextOfKinAddress: data.nextOfKinAddress || '',
      clientGroupId: this.currentClient?.clientGroupId || this.currentClient?.patientGroupId || null,
      userRole: this.userRole || null
    };

    console.log("Client data to save:", clientData);

    if (this.isEditingClient && this.editingClientId) {
      // Update existing client
      this.api.updateClientById(this.editingClientId, clientData).subscribe({
        next: (response: any) => {
          console.log("Client updated successfully:", response);
          this.showDivUpdatedLoaderNewClient = false;
          this.isButtonDisabled = false;
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = response.message || "Client updated successfully!";
          this.showDivAddToDataBaseNewClient = true;
          this.showGlobalSuccess(this.responseMessage);
          
          // Reload client list
          this.initializeTableData();
          
          setTimeout(() => {
            this.showDivAddToDataBaseNewClient = false;
            this.closeClientModal();
            this.isEditingClient = false;
            this.editingClientId = null;
          }, 2000);
        },
        error: (error: any) => {
          console.error("Error updating client:", error);
          this.showDivUpdatedLoaderNewClient = false;
          this.isButtonDisabled = false;
          this.responseColor = 'rgb(238, 16, 16)';
          this.responseMessage = error.error?.message || "Error updating client. Please try again.";
          this.showDivAddToDataBaseNewClient = true;
          this.showGlobalError(this.responseMessage);
          
          setTimeout(() => {
            this.showDivAddToDataBaseNewClient = false;
          }, 4000);
        }
      });
    } else {
      // Create new client
      this.api.addClient(clientData).subscribe({
        next: (response: any) => {
          console.log("Client saved successfully:", response);
          this.showDivUpdatedLoaderNewClient = false;
          this.isButtonDisabled = false;
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = response.message || "Client added successfully!";
          this.showDivAddToDataBaseNewClient = true;
          this.showGlobalSuccess(this.responseMessage);
          
          // Reload client list
          this.initializeTableData();
          
          setTimeout(() => {
            this.showDivAddToDataBaseNewClient = false;
            this.closeClientModal();
          }, 2000);
        },
        error: (error: any) => {
          console.error("Error saving client:", error);
          this.showDivUpdatedLoaderNewClient = false;
          this.isButtonDisabled = false;
          this.responseColor = 'rgb(238, 16, 16)';
          this.responseMessage = error.error?.message || "Error saving client. Please try again.";
          this.showDivAddToDataBaseNewClient = true;
          this.showGlobalError(this.responseMessage);
          
          setTimeout(() => {
            this.showDivAddToDataBaseNewClient = false;
          }, 4000);
        }
      });
    }
  }

  onPageChange(page: number) {
    this.page = page;
  }

  onSearchQueryChange(query: string) {
    this.searchQuery = query;
    this.page = 1; // Reset to first page when searching
  }

  private clientMatchesRegistrySearch(
    client: any,
    searchText: string,
    digitsQuery: string
  ): boolean {
    const groupName =
      typeof client?.clientGroup === 'string'
        ? client.clientGroup
        : client?.clientGroup?.groupName || '';
    const textFields = [
      client?.clientFirstName || client?.firstName,
      client?.clientSecondName || client?.secondName,
      client?.clientOtherName || client?.otherName || client?.lastName,
      client?.nextOfKinName,
      client?.clientAddress || client?.address,
      client?.nextOfKinAddress,
      client?.clientFileNo || client?.fileNo || client?.clientFileNumber,
      client?.clientNo,
      client?.clientContact || client?.phone || client?.clientPhone,
      client?.nextOfKinContact,
      client?.clientGender || client?.gender,
      groupName,
      this.formatClientBalance(client),
    ];
    if (textFields.some((value) => this.valueMatchesSearch(value, searchText, digitsQuery))) {
      return true;
    }
    const fullName = `${client?.clientFirstName || client?.firstName || ''} ${
      client?.clientSecondName || client?.secondName || ''
    }`.toLowerCase();
    return fullName.includes(searchText);
  }

  private valueMatchesSearch(value: any, searchText: string, digitsQuery: string): boolean {
    if (value == null || value === '') {
      return false;
    }
    const text = String(value).toLowerCase();
    if (text.includes(searchText)) {
      return true;
    }
    if (digitsQuery.length >= 2) {
      const digits = text.replace(/\D/g, '');
      return !!digits && digits.includes(digitsQuery);
    }
    return false;
  }

  onSelectedColumnChange(column: string) {
    this.selectedColumn = column;
    this.page = 1; // Reset to first page when filtering
  }

  get totalItemsCount(): number {
    return this.clientList.length;
  }

  getFullName(client: any): string {
    const firstName = client.clientFirstName || client.firstName || '';
    const secondName = client.clientSecondName || client.secondName || '';
    
    // Capitalize first letter of each name part
    const capitalizeFirst = (str: string): string => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };
    
    const capitalizedFirstName = capitalizeFirst(firstName);
    const capitalizedSecondName = capitalizeFirst(secondName);
    
    const parts = [capitalizedFirstName, capitalizedSecondName].filter(p => p);
    return parts.length > 0 ? parts.join(' ') : 'N/A';
  }

  getInitials(client: any): string {
    const firstName = client.clientFirstName || client.firstName || '';
    const secondName = client.clientSecondName || client.secondName || '';
    const firstInitial = firstName.charAt(0).toUpperCase();
    const secondInitial = secondName.charAt(0).toUpperCase();
    return firstInitial + (secondInitial || '');
  }

  getAvatarColor(client: any): string {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6'];
    const name = this.getFullName(client);
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  formatDate(date: string): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return date;
    }
  }

  formatPhone(phone: string): string {
    if (!phone) {
      return '';
    }
    const cleaned = String(phone).replace(/\D/g, '');
    if (!cleaned) {
      return String(phone).replace(/^\+\s*/, '').trim();
    }
    if (cleaned.startsWith('256') && cleaned.length > 3) {
      return `256 ${cleaned.slice(3)}`;
    }
    return cleaned;
  }

  getClientId(index: number): string {
    const id = (this.page - 1) * this.itemsPerPage + index + 1;
    return 'PS' + String(id).padStart(5, '0');
  }
}
