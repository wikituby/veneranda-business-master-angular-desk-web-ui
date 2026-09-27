import { ChangeDetectorRef, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, map, switchMap } from 'rxjs/operators';
import { forkJoin, of, Observable } from 'rxjs';
import jsPDF from 'jspdf';
import {
  buildCommercialDocumentPdf,
  buildEfrisTemplateFields,
  commercialDocDeductsStock,
  commercialDocFilename,
  commercialDocIsEfris,
  commercialDocShowsAmountReceived,
  commercialDocTitle,
  CommercialDocType,
  EfrisFiscalFields,
  mapSaleToCommercialDoc,
  normalizeCommercialDocType,
} from '../../../../utils/commercial-document-pdf.util';
import { ThemeService } from '../../../../services/theme.service';
import { ApiService } from '../../../../services/api.service';
import { FacilityBrandingService } from '../../../../services/facility-branding.service';
import {
  PharmacyVisitSyncService,
} from '../../../../services/pharmacy-visit-sync.service';
import {
  applyQueuePageModuleToSession,
  getQueuePageModuleIdFromSession,
  resolveModuleIdForUrl,
} from '../../../../utils/queue-page-context.util';
import {
  ensureFromModuleInList,
  normalizeBusinessModules,
  pickDefaultFromModuleId,
  isQueueDischargeDestination,
  queueDestinationOptions,
} from '../../../../utils/queue-module.util';
import {
  applyTreatmentLifecycleFlags,
  TreatmentLifecycleFlag,
  treatmentLifecyclePatch,
} from '../../../../utils/treatment-lifecycle.util';
import {
  applyPrescribingPrefillToTreatmentForm,
  formatDosageDisplay as formatDosageDisplayLabel,
  formatFrequencyDisplay,
  formatTreatmentPeriodUnit,
  hasPrescribingNumericValue,
  mapPrescribingUnitToDosageUnit,
  normalizeDosageUnitForSelect,
  DOSAGE_UNIT_SELECT_OPTIONS,
  isStandardDosageUnit,
  resolveStockPrescribingSource,
} from '../../../../utils/prescribing-prefill.util';
import {
  formatMoney2DecimalsDisplay,
  formatMoneyWholeDisplay,
  formatUgxPaymentTotalDisplay,
  roundUgxMoney,
} from '../../../../utils/ugx-money.util';
import {
  BatchSellingModel,
  extractBatchLinePricing,
} from '../../../../utils/stock-batch-pricing.util';
import { StandardDosageOption } from '../../../../utils/standard-dosage.util';
import { getPharmacyItemTotalStock } from '../../../../utils/pharmacy-prescription-sale.util';
import { AccessControlService } from '../../../../services/access-control.service';
import { defaultContactValue } from '../../../../utils/phone-contact.util';

/** Aggregated pharmacy order (OTC sale or visit prescriptions). */
export interface PharmacySoldOrder {
  orderKey: string;
  orderNo: string;
  saleSource: 'OTC' | 'RX';
  visitDate: string;
  visitTime: string;
  visitId?: number | null;
  visitNumber?: number;
  clientName?: string;
  /** quotation | sales_order | proforma | sales_invoice | receipt | delivery_note */
  documentType?: string;
  totalCost: number;
  totalSell: number;
  /** Cash received for the sale (order-level; not summed per line). */
  amountReceived: number;
  /** Client / patient id when known from sale rows. */
  patientId?: number | null;
  /** Invoice/sale total when provided by API (else use totalSell). */
  saleTotalAmount?: number;
  /** Visit goods delivery confirmed. */
  goodsDelivered?: boolean;
  deliveryNote?: string;
  /** False when the order has been deactivated. */
  active?: boolean;
  lineCount: number;
  lines: OtcSoldRow[];
  receivedBy?: string;
}

/** One line item within a pharmacy sold order. */
export interface OtcSoldRow {
  saleSource: 'OTC' | 'RX';
  /** OTC: sale line id; RX: treatment request id. */
  lineId: number;
  saleId: number;
  saleNo?: string;
  clientName?: string;
  visitId?: number | null;
  visitNumber?: number;
  visitDate: string;
  visitTime: string;
  receivedBy?: string;
  /** quotation | sales_order | proforma | sales_invoice | receipt */
  documentType?: string;
  itemName: string;
  /** Merged dose label (e.g. 200mg), same as cart Dosage column. */
  dosage: string;
  amountPerFrequencyValue: number | null;
  amountPerFrequencyUnit: string;
  frequencyValue: number | null;
  frequencyUnit: string | number | null;
  durationValue: number | null;
  durationUnit: string | number | null;
  quantity: number;
  totalUnits: number;
  unitBuy: number;
  unitSellingPrice: number;
  totalAmount: number;
  amountReceived?: number;
  saleTotalAmount?: number;
  patientId?: number | null;
  stockBatchId?: number | null;
  itemId?: number | null;
  goodsDelivered?: boolean;
  deliveryNote?: string;
  /** False when the parent sale/order is deactivated. */
  active?: boolean;
}

export interface DoctorPrescriptionRow {
  id: number;
  clientId: number | null;
  visitId: number;
  visitNumber: number;
  visitDate: string;
  visitTime: string;
  clientName: string;
  stockBatchId: number | null;
  /** Shop/stock item id when pharmacyUseStockBatch is false. */
  itemId: number | null;
  /** Marked in Doctor prescriptions tab — included in bill when true. */
  given: boolean;
  paid?: boolean;
  dispensed?: boolean;
  administered?: boolean;
  itemName: string;
  status: string;
  /** Original prescribed quantity from the visit. */
  prescribedQuantity: number;
  quantity: number;
  unitBuy: number;
  unitSellingPrice: number;
  dosage: string;
  amountPerFrequencyValue: number | null;
  amountPerFrequencyUnit: string;
  frequencyValue: number | null;
  frequencyUnit: string | number | null;
  durationValue: number | null;
  durationUnit: string | number | null;
  totalUnits: number;
  totalAmount: number;
  instructions: string;
  route: string;
  /** RX (treatment) or SUNDRY. */
  lineKind?: 'RX' | 'SUNDRY';
  visitSundryId?: number | null;
}

export interface OtcCartLine {
  /** Unique row key for cart operations. */
  cartLineKey: string;
  lineSource: 'OTC' | 'RX';
  /** When false, line is listed but excluded from bill total and completion. */
  given: boolean;
  treatmentRequestedId?: number;
  visitId?: number;
  clientId?: number | null;
  clientName?: string;
  stockBatchId: number | null;
  itemId: number;
  /**
   * When true (or saleCategory Service), complete-sale sends stockItemId
   * instead of shop itemId — no inventoriable batch.
   */
  isService?: boolean;
  itemName: string;
  amountPerFrequencyValue: number | null;
  amountPerFrequencyUnit: string;
  frequencyValue: number | null;
  frequencyUnit: number | null;
  durationValue: number | null;
  durationUnit: number | null;
  quantity: number;
  totalUnits: number | null;
  unitBuy: number;
  unitSellingPrice: number;
  totalAmount: number;
  /** Absolute discount amount applied to this line (0 = none). */
  discountAmount: number;
  /** How the discount was entered. */
  discountMode: 'none' | 'percent' | 'amount';
  /** Percent or fixed amount entered in the discount modal. */
  discountInput: number;
  instructions: string;
  route: string;
  stockAtHand: number;
  unitSellingModelId?: number | null;
  /**
   * When true (default), line price comes from a unit sell model.
   * When false, price is open and editable at POS.
   */
  useUnitSellingModel?: boolean;
  /** Optional product image for cart thumbnails. */
  imageUrl?: string | null;
}

/** Receipt shown in modal after completing an OTC sale. */
export interface OtcReceiptLine {
  itemName: string;
  dosage: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** Absolute discount taken off this line (shown on receipt). */
  discountAmount?: number;
  /** When false, line is listed on receipt but not billed. */
  given?: boolean;
  statusNote?: string;
}

export interface OtcReceiptData {
  saleNo: string;
  saleDateLabel: string;
  saleTimeLabel: string;
  facilityName: string;
  clientName?: string;
  clientAddress?: string;
  clientPhone?: string;
  customerId?: string;
  orderNo?: string;
  receivedBy: string;
  paymentMethod: string;
  notes: string;
  /** When false, receipt shows item / qty / amount only (quantity-only sale). */
  includePrescribing: boolean;
  /** Shared commercial template: Receipt / Invoice / Quotation */
  docType: CommercialDocType;
  lines: OtcReceiptLine[];
  /** Net after line discounts (before overall discount / tax). */
  subtotal: number;
  /** Overall order discount (not line discounts). */
  discount?: number;
  /** Always included on the receipt (may be 0). */
  tax: number;
  /** Tax type label when applicable (e.g. VAT). */
  taxType?: string;
  /** Tax rate percent used for this receipt. */
  taxRatePercent?: number;
  /** subtotal - discount + tax */
  total: number;
  amountReceived: number;
  changeDue: number;
  /** Remaining balance after amount paid (0 when fully paid / overpaid). */
  amountDue?: number;
  /** EFRIS fiscal block (printable template until live URA). */
  efris?: EfrisFiscalFields;
}

@Component({
  selector: 'app-otc-dispensary',
  templateUrl: './otc-dispensary.component.html',
  styleUrls: ['./otc-dispensary.component.css'],
})
export class OtcDispensaryComponent implements OnInit, OnDestroy {
  @ViewChild('otcTreatmentForm') otcTreatmentForm?: NgForm;
  @ViewChild('otcCartScroll') otcCartScroll?: ElementRef<HTMLElement>;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  isDarkMode = false;
  isLoadingDrugList = false;
  processing = false;
  private statusBannerTimer: ReturnType<typeof setTimeout> | null = null;
  /** Debounced PUT update-treatmentRequest when pharmacy edits Rx qty. */
  private rxQtyPersistTimers = new Map<number, ReturnType<typeof setTimeout>>();
  responseMessage = '';
  responseColor = '';
  showStatusBanner = false;

  itemList: any[] = [];
  /** All stores — used to show full distribution on each batch line. */
  storeList: any[] = [];
  allStockBatchesCache: any[] = [];
  /** Master product list (stock items) — POS catalog source of truth. */
  allStockItemsCache: any[] = [];
  groupedStockItems: {
    itemKey: string;
    stockItemName: string;
    completelyOutOfStock: boolean;
    batchLines: {
      batchKey: string;
      batchLabel: string;
      expiryLabel: string;
      expiryTone: 'danger' | 'warning' | 'safe' | 'unknown';
      totalStock: number;
      unitCost: number;
      sellingModels: BatchSellingModel[];
      storeDistribution: {
        storeId: number;
        storeName: string;
        qtyLabel: string;
        storeLabel: string;
        item: any | null;
      }[];
    }[];
  }[] = [];
  cart: OtcCartLine[] = [];
  searchText = '';
  otcDrugDropdownOpen = false;
  pharmacyStoreName = '';

  currentItem: string | null = 'Choose Treatment';
  currentItemFullLabel = '';
  /** Plain drug name for cart / tables (no batch or qty). */
  currentStockItemName = '';
  currentItemId: number | null = null;
  currentStockBatchId: number | null = null;
  /** From business settings — stock batches (default) vs shop products. */
  pharmacyUseStockBatch = true;
  selectedUnitSellingModelId: number | null = null;
  availableQuantity = 0;
  unitBuy = 0;
  unitOfMeasure = '';
  itemSellingPrice = 0;
  lastUnitValue = 1;

  currentTreatmentRequested: any = this.defaultTreatmentForm();

  paymentMethod = 'Cash At Hand';
  amountReceived: number | null = null;
  saleNotes = 'OTC counter sale';

  /** 'prescribing' shows dosage/frequency/duration; 'simple' is quantity-only counter sale. */
  otcSaleMode: 'prescribing' | 'simple' = 'simple';

  activeMainTab: 'counter' | 'sold' = 'counter';

  /** Sales history (OTC counter + doctor prescriptions). */
  filterDateFrom = '';
  filterDateTo = '';
  showSalesDateFilterModal = false;
  salesDateFilterDraft = { from: '', to: '' };
  salesHistoryDrugSearch = '';
  /** Filter Products sold by logged-in staff who completed the sale. */
  salesHistoryStaffFilter = '';
  /** Client-side filter on Products sold: '' = all, OTC, or RX. */
  salesHistorySourceFilter: '' | 'OTC' | 'RX' = '';
  loadingSalesHistory = false;
  salesHistoryError = '';
  soldRows: OtcSoldRow[] = [];
  soldOrders: PharmacySoldOrder[] = [];

  showOrderDetailsModal = false;
  selectedSoldOrder: PharmacySoldOrder | null = null;
  /** While toggling activate/deactivate on a sold order row. */
  soldOrderActiveTogglingKey: string | null = null;
  showSoldOrderActiveModal = false;
  soldOrderActiveTarget: PharmacySoldOrder | null = null;
  soldOrderActiveMakeActive = false;
  /** Document opened from Products sold progress (print / share / edit). */
  receiptOpenedFromSold = false;
  receiptSourceOrder: PharmacySoldOrder | null = null;
  receiptSourcePatientId: number | null = null;
  /** Exact sale document payload when opened from Products sold (for edit preload). */
  receiptSourceSaleDoc: any | null = null;
  /**
   * Snapshot for Edit from any document modal (first sale, update, or sold history).
   * Survives cart clear after sale completes.
   */
  receiptEditContext: {
    cartLines: OtcCartLine[];
    clientId: number | null;
    clientName: string;
    orderId: number | null;
    orderNumber: number | null;
    saleId: number | null;
    docType: CommercialDocType;
    notes: string;
    paymentMethod: string;
    amountReceived: number;
    orderNo: string;
  } | null = null;
  /**
   * When set, cart is editing an existing sold document — Complete skips the
   * document-type picker and saves as this type.
   */
  lockedDocumentType: CommercialDocType | null = null;
  editingSoldSaleId: number | null = null;
  deletingSoldLineId: number | null = null;
  showDeleteSoldLineConfirm = false;
  deleteSoldLineTarget: { row: OtcSoldRow; order: PharmacySoldOrder } | null = null;
  /** Receive payment on a sold order (Paid column). */
  showOrderPaymentModal = false;
  orderPaymentTarget: PharmacySoldOrder | null = null;
  orderPaymentLoading = false;
  orderPaymentSaving = false;
  orderPaymentError = '';
  orderPaymentList: any[] = [];
  orderPaymentForm: {
    amountToPay: number | null;
    paymentForm: string;
    notes: string;
  } = {
    amountToPay: null,
    paymentForm: 'Cash At Hand',
    notes: 'Payment Received with Thanks',
  };
  /** Confirm reverse of a payment in the order payment history list. */
  showOrderPaymentReverseModal = false;
  orderPaymentPendingReverse: any = null;
  orderPaymentReversing = false;
  /** Confirm create missing pipeline document (Q / PF / INV / …). */
  showCreatePipelineDocModal = false;
  createPipelineDocSaving = false;
  createPipelineDocDraft: {
    order: PharmacySoldOrder;
    visitId: number;
    docType: CommercialDocType;
    stepLabel: string;
    currentStage: string;
  } | null = null;
  userRole = '';

  loadingDoctorPrescriptions = false;
  doctorPrescriptionsError = '';
  doctorPrescriptionRows: DoctorPrescriptionRow[] = [];
  openingPrescriptionVisitId: number | null = null;
  selectedPrescriptionVisitId: number | null = null;
  /** Rows for the visit currently open in the details panel (set directly on Details click). */
  selectedPrescriptionDetailRows: DoctorPrescriptionRow[] = [];
  prescriptionSundriesLoading = false;
  prescriptionSundriesRows: any[] = [];
  rxPaymentMethod = 'Cash At Hand';
  rxAmountReceived: number | null = null;
  rxSaleNotes = 'Pharmacy prescription sale';
  showRxQueueModal = false;
  rxQueueSaving = false;
  rxQueueError = '';
  rxQueueClinics: { id?: number; name?: string }[] = [];
  rxQueueClientGroups: { id?: number; groupName?: string }[] = [];
  rxQueueTarget: {
    visitId: number;
    visitNumber: number;
    clientName: string;
    clientId: number;
  } | null = null;
  rxQueueForm: {
    fromModuleId: number | null;
    toModuleId: number | null;
    clinicId: number | null;
    note: string;
    visitDefaultScheme: string;
    clientGroupId: number | null;
    emergency: boolean;
    revisit: boolean;
    printQueueTicket: boolean;
  } = {
    fromModuleId: null,
    toModuleId: null,
    clinicId: null,
    note: '',
    visitDefaultScheme: '',
    clientGroupId: null,
    emergency: false,
    revisit: false,
    printQueueTicket: false,
  };
  businessModules: { id?: number; name?: string; code?: string; routeKey?: string }[] = [];
  pharmacyModuleId: number | null = null;
  readonly isQueueDischargeDestination = isQueueDischargeDestination;

  get rxQueueDestinationModules(): { id?: number; name?: string; code?: string; routeKey?: string }[] {
    return queueDestinationOptions(this.businessModules);
  }

  /** Visits with a completed prescription sale — shown as Done until queued to the next station. */
  private completedPrescriptionVisitIds = new Set<number>();
  /** Snapshot of sold visit rows so Done clients stay visible after API reload. */
  private soldPrescriptionVisitSnapshots = new Map<number, DoctorPrescriptionRow[]>();

  /** Cached client names / visit numbers for Products sold Rx orders (incl. legacy rows). */
  private soldOrderClientNameCache = new Map<number, string>();
  private soldOrderVisitNumberCache = new Map<number, number>();
  private soldOrderClientNameLoading = new Set<number>();

  showReceiptModal = false;
  receipt: OtcReceiptData | null = null;

  private pharmacyStoreId: number | null = null;

  /** Dropdown choices when dosage unit is empty or user changes selection. */
  readonly dosageUnitOptions: readonly string[] = DOSAGE_UNIT_SELECT_OPTIONS;

  constructor(
    private themeService: ThemeService,
    private api: ApiService,
    private facilityBranding: FacilityBrandingService,
    private router: Router,
    private pharmacyVisitSync: PharmacyVisitSyncService,
    private accessControl: AccessControlService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  facilityLogoUrl = 'assets/images/logo.jpg';

  ngOnInit(): void {
    this.userRole = (sessionStorage.getItem('userrole') || '').toString().trim();
    this.themeService.isDarkMode$.subscribe((isDark) => (this.isDarkMode = isDark));
    this.applyOtcSaleModeFromBusinessSettings();
    this.facilityBranding.load().subscribe({
      next: () => {
        this.facilityLogoUrl = this.facilityBranding.getLogoUrlForDisplay();
        this.facilityBranding.loadLogoDataUrl();
        this.applyOtcSaleModeFromBusinessSettings();
      },
      error: () => {
        this.facilityLogoUrl = this.facilityBranding.getLogoUrlForDisplay();
        this.applyOtcSaleModeFromBusinessSettings();
      },
    });
    this.loadPharmacyStock();
    this.loadSalesHistoryLast7Days();
  }

  ngOnDestroy(): void {
    if (this.statusBannerTimer) {
      clearTimeout(this.statusBannerTimer);
      this.statusBannerTimer = null;
    }
    for (const timer of this.rxQtyPersistTimers.values()) {
      clearTimeout(timer);
    }
    this.rxQtyPersistTimers.clear();
  }

  /** Default OTC sale mode from facility business settings (staff may override on this page). */
  private applyOtcSaleModeFromBusinessSettings(): void {
    this.otcSaleMode = this.facilityBranding.getOtcIncludePrescribing()
      ? 'prescribing'
      : 'simple';
    const nextUseStockBatch = this.facilityBranding.getPharmacyUseStockBatch();
    const modeChanged = nextUseStockBatch !== this.pharmacyUseStockBatch;
    this.pharmacyUseStockBatch = nextUseStockBatch;
    if (modeChanged) {
      this.clearCurrentTreatmentSelection();
      this.loadPharmacyStock();
    }
  }

  private clearCurrentTreatmentSelection(): void {
    this.currentItem = 'Choose Treatment';
    this.currentItemFullLabel = '';
    this.currentStockItemName = '';
    this.currentItemId = null;
    this.currentStockBatchId = null;
    this.selectedUnitSellingModelId = null;
    this.availableQuantity = 0;
    this.unitBuy = 0;
    this.itemSellingPrice = 0;
  }

  setMainTab(tab: 'counter' | 'sold'): void {
    this.activeMainTab = tab;
    if (tab === 'sold') {
      this.loadSalesHistory();
    }
  }

  filteredSoldOrders(): PharmacySoldOrder[] {
    let orders = this.soldOrders;
    if (this.salesHistorySourceFilter) {
      orders = orders.filter((order) => order.saleSource === this.salesHistorySourceFilter);
    }
    const staff = (this.salesHistoryStaffFilter || '').trim().toLowerCase();
    if (staff) {
      orders = orders.filter((order) =>
        this.soldOrderStaffLabel(order).toLowerCase() === staff
      );
    }
    const q = (this.salesHistoryDrugSearch || '').trim().toLowerCase();
    if (!q) {
      return orders;
    }
    return orders.filter((order) => this.orderMatchesSearch(order, q));
  }

  get salesHistoryStaffOptions(): string[] {
    const seen = new Set<string>();
    const options: string[] = [];
    for (const order of this.soldOrders) {
      const label = this.soldOrderStaffLabel(order);
      if (!label || label === '—') {
        continue;
      }
      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        options.push(label);
      }
    }
    return options.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  get hasSoldHistoryClientFilters(): boolean {
    return (
      !!this.salesHistoryDrugSearch.trim() ||
      !!this.salesHistorySourceFilter ||
      !!this.salesHistoryStaffFilter.trim()
    );
  }

  soldOrderStaffLabel(order: PharmacySoldOrder | null | undefined): string {
    const value = (order?.receivedBy || '').trim();
    return value || '—';
  }

  private loggedInStaffName(): string {
    const username = (sessionStorage.getItem('username') || '').trim();
    const email = (sessionStorage.getItem('useremail') || '').trim();
    return username || email || 'Counter';
  }

  private orderMatchesSearch(order: PharmacySoldOrder, q: string): boolean {
    const stage = this.soldOrderDocumentStageLabel(order).toLowerCase();
    const orderHay = [
      order.orderNo,
      order.clientName,
      order.saleSource,
      order.visitDate,
      order.receivedBy,
      order.documentType,
      stage,
    ]
      .map((v) => String(v ?? '').toLowerCase())
      .join(' ');
    if (orderHay.includes(q)) {
      return true;
    }
    return order.lines.some((row) =>
      [row.itemName, row.clientName, row.saleNo, row.documentType]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')
        .includes(q)
    );
  }

  openSoldOrderDetails(order: PharmacySoldOrder): void {
    this.selectedSoldOrder = order;
    this.showOrderDetailsModal = true;
    this.ensureSoldOrderClientName(order);
  }

  isSoldOrderActive(order: PharmacySoldOrder | null | undefined): boolean {
    return order?.active !== false;
  }

  /** True when the opened sold document belongs to an active (editable) order. */
  canEditOpenedSoldDocument(): boolean {
    return this.isSoldOrderActive(this.receiptSourceOrder);
  }

  requestToggleSoldOrderActive(order: PharmacySoldOrder, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (!order || this.soldOrderActiveTogglingKey) {
      return;
    }
    const visitId = this.soldOrderResolveVisitId(order);
    const saleId = Number(order.lines?.[0]?.saleId) || 0;
    if (!(visitId != null && visitId > 0) && !(saleId > 0)) {
      this.flashStatus('Cannot change this order — missing visit/sale id.', true);
      return;
    }
    this.soldOrderActiveTarget = order;
    this.soldOrderActiveMakeActive = !this.isSoldOrderActive(order);
    this.showSoldOrderActiveModal = true;
  }

  closeSoldOrderActiveModal(): void {
    if (this.soldOrderActiveTogglingKey) {
      return;
    }
    this.showSoldOrderActiveModal = false;
    this.soldOrderActiveTarget = null;
  }

  confirmToggleSoldOrderActive(): void {
    const order = this.soldOrderActiveTarget;
    if (!order || this.soldOrderActiveTogglingKey) {
      return;
    }
    const makeActive = this.soldOrderActiveMakeActive;
    const visitId = this.soldOrderResolveVisitId(order);
    const saleId = Number(order.lines?.[0]?.saleId) || 0;
    this.soldOrderActiveTogglingKey = order.orderKey;
    this.api
      .setOtcOrderActive({
        visitId: visitId != null && visitId > 0 ? visitId : null,
        saleId: saleId > 0 ? saleId : null,
        active: makeActive,
      })
      .subscribe({
        next: (res: any) => {
          this.soldOrderActiveTogglingKey = null;
          order.active = makeActive;
          for (const line of order.lines || []) {
            line.active = makeActive;
          }
          this.showSoldOrderActiveModal = false;
          this.soldOrderActiveTarget = null;
          this.flashStatus(
            res?.message || (makeActive ? 'Order turned on.' : 'Order turned off.'),
            false
          );
          this.loadSalesHistory();
        },
        error: (err) => {
          this.soldOrderActiveTogglingKey = null;
          this.flashStatus(
            this.extractApiErrorMessage(
              err,
              makeActive ? 'Could not turn on this order.' : 'Could not turn off this order.'
            ),
            true
          );
        },
      });
  }

  closeSoldOrderDetailsModal(): void {
    this.showOrderDetailsModal = false;
    this.selectedSoldOrder = null;
    this.deletingSoldLineId = null;
  }

  requestDeleteSoldLine(row: OtcSoldRow, order: PharmacySoldOrder): void {
    if (!this.isMdUser()) {
      this.flashStatus('Only MD can delete sold item lines.', true);
      return;
    }
    if (this.deletingSoldLineId != null) {
      return;
    }
    const lineId = this.resolveSoldLineDeleteId(row);
    if (!lineId) {
      this.flashStatus('Cannot delete this line — missing id.', true);
      return;
    }
    this.deleteSoldLineTarget = { row, order };
    this.showDeleteSoldLineConfirm = true;
  }

  closeDeleteSoldLineConfirm(): void {
    if (this.deletingSoldLineId != null) {
      return;
    }
    this.showDeleteSoldLineConfirm = false;
    this.deleteSoldLineTarget = null;
  }

  confirmDeleteSoldLine(): void {
    const target = this.deleteSoldLineTarget;
    if (!target || this.deletingSoldLineId != null) {
      return;
    }
    this.deleteSoldLine(target.row, target.order);
  }

  isDeletingSoldRow(row: OtcSoldRow): boolean {
    const lineId = this.resolveSoldLineDeleteId(row);
    return lineId > 0 && this.deletingSoldLineId === lineId;
  }

  deleteSoldLineTargetLabel(): string {
    return (this.deleteSoldLineTarget?.row.itemName || 'this item').toUpperCase();
  }

  deleteSoldLineTargetQty(): number {
    return this.num(this.deleteSoldLineTarget?.row.quantity);
  }

  deleteSoldLineTargetRemovesOrder(): boolean {
    const target = this.deleteSoldLineTarget;
    return !!target && target.order.lines.length <= 1;
  }

  private deleteSoldLine(row: OtcSoldRow, order: PharmacySoldOrder): void {
    const lineId = this.resolveSoldLineDeleteId(row);
    if (!lineId) {
      this.flashStatus('Cannot delete this line — missing id.', true);
      return;
    }

    this.deletingSoldLineId = lineId;
    this.api.deletePharmacySoldLine(lineId, row.saleSource).subscribe({
      next: () => {
        this.deletingSoldLineId = null;
        this.showDeleteSoldLineConfirm = false;
        this.deleteSoldLineTarget = null;
        this.removeSoldLineFromState(row, order);
        this.loadPharmacyStock();
        this.loadDoctorPrescriptions();
        this.flashStatus('Sold line removed and stock restored. DSP cleared when fully reversed.', false);
      },
      error: (err) => {
        this.deletingSoldLineId = null;
        this.flashStatus(
          this.extractApiErrorMessage(err, 'Failed to delete sold line.'),
          true
        );
      },
    });
  }

  private removeSoldLineFromState(row: OtcSoldRow, order: PharmacySoldOrder): void {
    const rowKey = this.soldRowKey(row);
    const orderKey = order.orderKey;

    this.soldRows = this.soldRows.filter((line) => this.soldRowKey(line) !== rowKey);

    const orderIndex = this.soldOrders.findIndex((item) => item.orderKey === orderKey);
    if (orderIndex < 0) {
      if (this.selectedSoldOrder?.orderKey === orderKey) {
        this.closeSoldOrderDetailsModal();
      }
      return;
    }

    const remainingLines = this.soldOrders[orderIndex].lines.filter(
      (line) => this.soldRowKey(line) !== rowKey
    );

    if (!remainingLines.length) {
      this.soldOrders = this.soldOrders.filter((item) => item.orderKey !== orderKey);
      if (this.selectedSoldOrder?.orderKey === orderKey) {
        this.closeSoldOrderDetailsModal();
      }
      return;
    }

    const linesSell = remainingLines.reduce((sum, line) => sum + this.num(line.totalAmount), 0);
    const updatedOrder: PharmacySoldOrder = {
      ...this.soldOrders[orderIndex],
      lines: remainingLines,
      lineCount: remainingLines.length,
      totalCost: remainingLines.reduce(
        (sum, line) => sum + this.num(line.quantity) * this.num(line.unitBuy),
        0
      ),
      totalSell: linesSell,
      saleTotalAmount: linesSell,
    };

    this.soldOrders = [
      ...this.soldOrders.slice(0, orderIndex),
      updatedOrder,
      ...this.soldOrders.slice(orderIndex + 1),
    ];

    if (this.selectedSoldOrder?.orderKey === orderKey) {
      this.selectedSoldOrder = updatedOrder;
    }
  }

  private resolveSoldLineDeleteId(row: OtcSoldRow): number {
    if (row.saleSource === 'RX') {
      return row.lineId > 0 ? row.lineId : row.saleId;
    }
    return row.lineId > 0 ? row.lineId : 0;
  }

  private soldRowKey(row: OtcSoldRow): string {
    const deleteId = this.resolveSoldLineDeleteId(row);
    return `${row.saleSource}:${row.saleId}:${deleteId}`;
  }

  orderSourceLabel(_order: PharmacySoldOrder): string {
    return 'Order';
  }

  orderSourceBadgeClass(_order: PharmacySoldOrder): string {
    return 'sale-source-otc';
  }

  soldOrderDrugCountLabel(order: PharmacySoldOrder): string {
    const count = order.lineCount;
    return count === 1 ? '1 product' : `${count} products`;
  }

  soldOrderSummaryText(order: PharmacySoldOrder): string {
    return this.soldOrderDrugCountLabel(order);
  }

  /**
   * Commercial document pipeline for Products sold.
   * Reaching a later stage means earlier stages are done
   * (e.g. Sales Invoice ⇒ Quotation is complete).
   */
  readonly soldDocPipelineSteps: { code: string; short: string; label: string }[] = [
    { code: 'quotation', short: 'Q', label: 'Quotation' },
    { code: 'proforma', short: 'PF', label: 'Proforma' },
    { code: 'sales_invoice', short: 'INV', label: 'Sales Invoice' },
    { code: 'receipt', short: 'REC', label: 'Receipt' },
    { code: 'delivery_note', short: 'DEL', label: 'Delivery Note' },
  ];

  /**
   * Sales transaction stage for Products sold:
   * Quotation → Proforma → Sales Invoice → Receipt → Delivery Note
   */
  soldOrderDocumentStage(order: PharmacySoldOrder): {
    stage: string;
    state: 'processing' | 'paid';
    code: string;
    stepIndex: number;
  } {
    const code = this.resolveSoldOrderDocumentType(order);
    const stepIndex = this.soldOrderPipelineStepIndex(code);
    switch (code) {
      case 'quotation':
        return { stage: 'Quotation', state: 'processing', code, stepIndex };
      case 'sales_order':
        // Treat sales order as between quotation and proforma for progress.
        return { stage: 'Sales Order', state: 'processing', code, stepIndex };
      case 'proforma':
        return { stage: 'Proforma Invoice', state: 'processing', code, stepIndex };
      case 'sales_invoice':
        return { stage: 'Sales Invoice', state: 'processing', code, stepIndex };
      case 'efris_receipt':
        return { stage: 'EFRIS Receipt', state: 'paid', code, stepIndex };
      case 'delivery_note':
        return { stage: 'Delivery Note', state: 'paid', code, stepIndex };
      case 'receipt':
      default:
        return { stage: 'Receipt', state: 'paid', code: 'receipt', stepIndex };
    }
  }

  /** 0=Quotation … 4=Delivery Note. Higher index means earlier stages are done. */
  soldOrderPipelineStepIndex(docCode: string): number {
    switch (docCode) {
      case 'quotation':
        return 0;
      case 'sales_order':
        return 0; // still at quote/order stage for progress UI
      case 'proforma':
        return 1;
      case 'sales_invoice':
        return 2;
      case 'efris_receipt':
      case 'receipt':
        return 3;
      case 'delivery_note':
        return 4;
      default:
        return 3;
    }
  }

  soldOrderPipelineStepState(
    order: PharmacySoldOrder,
    stepIndex: number
  ): 'done' | 'current' | 'todo' {
    const current = this.soldOrderDocumentStage(order).stepIndex;
    if (stepIndex < current) {
      return 'done';
    }
    if (stepIndex === current) {
      return 'current';
    }
    return 'todo';
  }

  /**
   * Click a progress step (Q / PF / INV / REC / DEL) to open that document for
   * print, share, or edit. Grey (todo) steps open a modal to create from previous docs.
   */
  openSoldDocPipelineStep(order: PharmacySoldOrder, stepIndex: number, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    const step = this.soldDocPipelineSteps[stepIndex];
    if (!step) {
      return;
    }
    const state = this.soldOrderPipelineStepState(order, stepIndex);
    const docType = normalizeCommercialDocType(
      step.code === 'receipt' ? 'receipt' : step.code
    );
    const visitId = this.soldOrderResolveVisitId(order);

    if (state === 'todo') {
      if (!this.isSoldOrderActive(order)) {
        this.flashStatus(
          'This order is turned off. Documents can be viewed but not created or edited.',
          true
        );
        return;
      }
      if (visitId == null || visitId <= 0) {
        this.flashStatus(
          `Cannot create ${step.label} — this order has no linked visit.`,
          true
        );
        return;
      }
      this.createPipelineDocDraft = {
        order,
        visitId,
        docType,
        stepLabel: step.label,
        currentStage: this.soldOrderDocumentStage(order).stage,
      };
      this.createPipelineDocSaving = false;
      this.showCreatePipelineDocModal = true;
      return;
    }

    if (visitId != null && visitId > 0) {
      this.api
        .listOtcSaleDocuments({ visitId, documentType: docType })
        .subscribe({
          next: (docs) => {
            const match = Array.isArray(docs) && docs.length ? docs[0] : null;
            this.openSoldDocumentModal(order, docType, match);
          },
          error: () => this.openSoldDocumentModal(order, docType, null),
        });
      return;
    }
    this.openSoldDocumentModal(order, docType, null);
  }

  closeCreatePipelineDocModal(): void {
    if (this.createPipelineDocSaving) {
      return;
    }
    this.showCreatePipelineDocModal = false;
    this.createPipelineDocDraft = null;
  }

  confirmCreatePipelineDoc(): void {
    const draft = this.createPipelineDocDraft;
    if (!draft || this.createPipelineDocSaving) {
      return;
    }
    this.createPipelineDocSaving = true;
    this.ensureSoldDocPipelineStep(
      draft.order,
      draft.visitId,
      draft.docType,
      draft.stepLabel,
      () => {
        this.createPipelineDocSaving = false;
        this.showCreatePipelineDocModal = false;
        this.createPipelineDocDraft = null;
      },
      () => {
        this.createPipelineDocSaving = false;
      }
    );
  }

  /** Create a missing pipeline document, refresh history, then open it. */
  private ensureSoldDocPipelineStep(
    order: PharmacySoldOrder,
    visitId: number,
    docType: CommercialDocType,
    stepLabel: string,
    onDone?: () => void,
    onError?: () => void
  ): void {
    this.flashStatus(`Creating ${stepLabel}…`, false);
    this.api.ensureOtcOrderDocument(visitId, docType).subscribe({
      next: (res: any) => {
        const payload = res?.data ?? res;
        const createdDoc = payload?.document ?? null;
        this.flashStatus(
          res?.message || `${stepLabel} created from previous documents.`,
          false
        );
        this.loadSalesHistory();
        onDone?.();
        if (createdDoc) {
          this.openSoldDocumentModal(order, docType, createdDoc);
          return;
        }
        this.api.listOtcSaleDocuments({ visitId, documentType: docType }).subscribe({
          next: (docs) => {
            const match = Array.isArray(docs) && docs.length ? docs[0] : null;
            this.openSoldDocumentModal(order, docType, match);
          },
          error: () => this.openSoldDocumentModal(order, docType, null),
        });
      },
      error: (err) => {
        this.flashStatus(
          this.extractApiErrorMessage(err, `Could not create ${stepLabel}.`),
          true
        );
        onError?.();
      },
    });
  }

  private openSoldDocumentModal(
    order: PharmacySoldOrder,
    docType: CommercialDocType,
    saleDoc: any | null
  ): void {
    const saleData = saleDoc || {
      saleNo: order.orderNo,
      saleDate: order.visitDate,
      saleTime: order.visitTime,
      receivedBy: order.receivedBy || this.loggedInStaffName(),
      paymentForm: commercialDocTitle(docType),
      notes: '',
      amountReceived: order.amountReceived,
      changeAmount: 0,
      totalAmount: order.saleTotalAmount || order.totalSell,
      clientName: this.soldOrderClientName(order),
      patientName: this.soldOrderClientName(order),
      documentType: docType,
      lines: order.lines.map((line) => ({
        itemName: line.itemName,
        dosage: line.dosage,
        quantity: line.quantity,
        unitSellingPrice: line.unitSellingPrice,
        totalAmount: line.totalAmount,
        stockBatchId: line.stockBatchId,
        itemId: line.itemId,
        amountPerFrequencyValue: line.amountPerFrequencyValue,
        amountPerFrequencyUnit: line.amountPerFrequencyUnit,
        frequencyValue: line.frequencyValue,
        frequencyUnit: line.frequencyUnit,
        durationValue: line.durationValue,
        durationUnit: line.durationUnit,
        totalUnits: line.totalUnits,
        unitBuy: line.unitBuy,
      })),
    };
    const cartSnapshot = Array.isArray(saleData?.lines) && saleData.lines.length
      ? this.cartFromApiSaleLines(saleData.lines)
      : this.soldOrderToCartSnapshot(order);
    // Paid amounts only indicate on receipt / invoice / delivery note — not quote/proforma.
    const received = commercialDocShowsAmountReceived(docType)
      ? this.num(
          saleData?.amountReceived != null && this.num(saleData.amountReceived) > 0
            ? saleData.amountReceived
            : order.amountReceived
        )
      : 0;
    const total = this.num(saleData?.totalAmount ?? order.saleTotalAmount ?? order.totalSell);
    const changeDue = Math.max(0, received - total);
    this.receiptOpenedFromSold = true;
    this.receiptSourceOrder = order;
    this.receiptSourceSaleDoc = saleDoc;
    this.receiptSourcePatientId =
      Number(saleDoc?.patientId ?? saleDoc?.patient_id) > 0
        ? Number(saleDoc.patientId ?? saleDoc.patient_id)
        : null;
    this.openReceiptModal(
      { ...saleData, documentType: docType, clientName: this.soldOrderClientName(order) },
      cartSnapshot,
      total,
      received,
      changeDue,
      String(saleData?.receivedBy || order.receivedBy || this.loggedInStaffName()),
      this.soldOrderClientName(order) || undefined,
      docType
    );
    // Enrich edit context with order client / order id from Products sold.
    if (this.receiptEditContext) {
      const orderId = this.soldOrderResolveVisitId(order);
      const orderNumber = this.soldOrderResolveVisitNumber(order);
      this.receiptEditContext = {
        ...this.receiptEditContext,
        clientId:
          (this.receiptSourcePatientId != null && this.receiptSourcePatientId > 0
            ? this.receiptSourcePatientId
            : null) || this.receiptEditContext.clientId,
        clientName:
          this.soldOrderClientName(order) || this.receiptEditContext.clientName,
        orderId: orderId || this.receiptEditContext.orderId,
        orderNumber: orderNumber || this.receiptEditContext.orderNumber,
        orderNo: order.orderNo || this.receiptEditContext.orderNo,
        saleId:
          Number(saleDoc?.id ?? saleDoc?.saleId) ||
          Number(order.lines?.[0]?.saleId) ||
          this.receiptEditContext.saleId,
      };
    }
  }

  /**
   * Close document modal → open Current Order with this document's
   * products/services preloaded for edit + update.
   * Works for any document modal: first sale, update, or Products sold.
   */
  editSoldDocumentInCart(): void {
    if (!this.canEditOpenedSoldDocument()) {
      this.flashStatus(
        'This order is turned off. Documents can be viewed but not edited.',
        true
      );
      return;
    }
    const ctx = this.receiptEditContext;
    const order = this.receiptSourceOrder;
    const receipt = this.receipt;
    const saleDoc = this.receiptSourceSaleDoc || ctx;
    const docType = normalizeCommercialDocType(
      ctx?.docType ||
        receipt?.docType ||
        (saleDoc as any)?.documentType ||
        order?.documentType ||
        'receipt'
    );

    const saleId =
      (ctx?.saleId != null && ctx.saleId > 0 ? ctx.saleId : null) ||
      Number((saleDoc as any)?.id ?? (saleDoc as any)?.saleId ?? (saleDoc as any)?.sale_id) ||
      Number(order?.lines?.[0]?.saleId) ||
      null;
    const clientId =
      (ctx?.clientId != null && ctx.clientId > 0 ? ctx.clientId : 0) ||
      Number(
        (saleDoc as any)?.patientId ??
          (saleDoc as any)?.patient_id ??
          (saleDoc as any)?.clientId ??
          (saleDoc as any)?.client_id
      ) ||
      (this.receiptSourcePatientId != null && this.receiptSourcePatientId > 0
        ? this.receiptSourcePatientId
        : 0) ||
      (this.posSaleClientId != null && this.posSaleClientId > 0 ? this.posSaleClientId : 0) ||
      0;
    const clientName = String(
      ctx?.clientName ||
        receipt?.clientName ||
        (saleDoc as any)?.clientName ||
        (saleDoc as any)?.patientName ||
        (order ? this.soldOrderClientName(order) : '') ||
        this.posSaleClientName ||
        ''
    ).trim();
    const orderId =
      (ctx?.orderId != null && ctx.orderId > 0 ? ctx.orderId : null) ||
      Number((saleDoc as any)?.visitId ?? (saleDoc as any)?.visit_id) ||
      (order ? this.soldOrderResolveVisitId(order) : null) ||
      this.posSaleVisitId ||
      null;
    const orderNumber =
      (ctx?.orderNumber != null && ctx.orderNumber > 0 ? ctx.orderNumber : null) ||
      Number((saleDoc as any)?.visitNumber ?? (saleDoc as any)?.visit_number) ||
      (order ? this.soldOrderResolveVisitNumber(order) : null) ||
      this.posSaleVisitNumber ||
      null;
    const notes = String(ctx?.notes ?? receipt?.notes ?? (saleDoc as any)?.notes ?? '').trim();
    const paymentMethod = String(
      ctx?.paymentMethod ??
        receipt?.paymentMethod ??
        (saleDoc as any)?.paymentForm ??
        this.paymentMethod ??
        ''
    ).trim();
    const amountFromDoc = this.num(
      ctx?.amountReceived ??
        receipt?.amountReceived ??
        (saleDoc as any)?.amountReceived ??
        order?.amountReceived
    );
    const orderKey =
      order?.orderKey ||
      String(ctx?.orderNo || receipt?.saleNo || (saleDoc as any)?.saleNo || 'doc');
    const orderNo =
      order?.orderNo ||
      String(ctx?.orderNo || receipt?.saleNo || (saleDoc as any)?.saleNo || '');

    let lines: OtcCartLine[] = [];
    try {
      if (ctx?.cartLines?.length) {
        lines = ctx.cartLines.map((line) => ({ ...line }));
      } else if (Array.isArray((saleDoc as any)?.lines) && (saleDoc as any).lines.length) {
        lines = this.cartFromApiSaleLines((saleDoc as any).lines);
      } else if (order?.lines?.length) {
        lines = this.soldOrderToCartSnapshot(order);
      } else if (receipt?.lines?.length) {
        lines = this.cartFromReceiptLines(receipt.lines);
      }
    } catch (err) {
      console.error('editSoldDocumentInCart failed', err);
    }

    // Close modal and open Current Order (POS cart).
    this.dismissReceiptModalUi();
    this.closeSoldOrderDetailsModal();
    this.receiptOpenedFromSold = false;
    this.receiptSourceOrder = null;
    this.receiptSourcePatientId = null;
    this.receiptSourceSaleDoc = null;
    // Keep receiptEditContext until cart is loaded, then clear.
    this.setMainTab('counter');
    this.posCartPanelVisible = true;

    if (!lines.length) {
      this.receiptEditContext = null;
      this.flashStatus('This document has no products/services to edit.', true);
      this.cdr.detectChanges();
      return;
    }

    // Business cart lines only (products & services).
    this.cart = lines.map((line, idx) => ({
      ...line,
      cartLineKey: `edit-${orderKey}-${idx}-${Date.now()}`,
      lineSource: 'OTC' as const,
      given: true,
      amountPerFrequencyValue: null,
      amountPerFrequencyUnit: '',
      frequencyValue: null,
      frequencyUnit: null,
      durationValue: null,
      durationUnit: null,
      instructions: '',
      route: '',
      treatmentRequestedId: undefined,
    }));

    this.lockedDocumentType = docType;
    this.editingSoldSaleId = saleId != null && saleId > 0 ? saleId : null;
    this.pendingPosDocType = docType;
    this.overallDiscountAmount = 0;
    this.saleNotes = notes || `Edit ${commercialDocTitle(docType)} ${orderNo}`.trim();
    if (paymentMethod) {
      this.paymentMethod = paymentMethod;
    }
    this.amountReceived =
      amountFromDoc > 0 ? amountFromDoc : this.cartPayableTotal || null;
    // Show document/payment step with Back to order while updating.
    this.posShowPaymentStep = true;

    if (clientId > 0) {
      this.posSaleClientId = clientId;
      this.posSaleClientName = clientName || this.posSaleClientName || 'Client';
    } else if (clientName) {
      this.posSaleClientName = clientName;
    }
    if (orderId != null && orderId > 0) {
      this.posSaleVisitId = orderId;
      this.posSaleVisitNumber =
        orderNumber != null && orderNumber > 0 ? orderNumber : orderId;
    }
    if (!(this.posSaleClientId != null && this.posSaleClientId > 0) && orderId != null && orderId > 0) {
      this.enrichPosClientFromVisit(orderId);
    }

    this.receiptEditContext = null;
    this.posClientSearch = '';
    this.openPosClientPicker();

    this.flashStatus(
      `Current Order: editing ${commercialDocTitle(docType)}${orderNo ? ' ' + orderNo : ''}. Update when done.`,
      false
    );
    this.cdr.detectChanges();
    setTimeout(() => {
      try {
        this.otcCartScroll?.nativeElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      } catch {
        /* ignore */
      }
      this.cdr.detectChanges();
    }, 100);
  }

  /** Remember cart + client + order so Edit works after the cart is cleared. */
  private captureReceiptEditContext(
    cartSnapshot: OtcCartLine[],
    saleData: any,
    docType: CommercialDocType
  ): void {
    const saleId =
      Number(saleData?.id ?? saleData?.saleId ?? saleData?.sale_id) || null;
    const clientId =
      (this.posSaleClientId != null && this.posSaleClientId > 0
        ? this.posSaleClientId
        : null) ||
      Number(saleData?.patientId ?? saleData?.patient_id ?? saleData?.clientId) ||
      null;
    const orderId =
      (this.posSaleVisitId != null && this.posSaleVisitId > 0
        ? this.posSaleVisitId
        : null) ||
      Number(saleData?.visitId ?? saleData?.visit_id) ||
      null;
    const orderNumber =
      (this.posSaleVisitNumber != null && this.posSaleVisitNumber > 0
        ? this.posSaleVisitNumber
        : null) ||
      Number(saleData?.visitNumber ?? saleData?.visit_number) ||
      null;
    const lines =
      cartSnapshot?.length > 0
        ? cartSnapshot.map((line) => ({
            ...line,
            lineSource: 'OTC' as const,
            given: line.given !== false,
          }))
        : Array.isArray(saleData?.lines)
          ? this.cartFromApiSaleLines(saleData.lines)
          : [];
    this.receiptEditContext = {
      cartLines: lines,
      clientId: clientId != null && clientId > 0 ? clientId : null,
      clientName: String(
        saleData?.clientName ??
          saleData?.patientName ??
          this.posSaleClientName ??
          ''
      ).trim(),
      orderId: orderId != null && orderId > 0 ? orderId : null,
      orderNumber: orderNumber != null && orderNumber > 0 ? orderNumber : null,
      saleId: saleId != null && saleId > 0 ? saleId : null,
      docType: normalizeCommercialDocType(docType),
      notes: String(saleData?.notes ?? this.saleNotes ?? '').trim(),
      paymentMethod: String(
        saleData?.paymentForm ?? this.paymentMethod ?? ''
      ).trim(),
      amountReceived: this.num(saleData?.amountReceived ?? this.amountReceived),
      orderNo: String(saleData?.saleNo ?? '').trim(),
    };
  }

  private attachClientFromSoldOrder(
    order: PharmacySoldOrder,
    preferredPatientId?: number | null
  ): void {
    const name = this.soldOrderClientName(order);
    const visitId = this.soldOrderResolveVisitId(order);
    const visitNumber = this.soldOrderResolveVisitNumber(order);
    const patientId =
      (preferredPatientId != null && preferredPatientId > 0
        ? preferredPatientId
        : null) ||
      (this.receiptSourcePatientId != null && this.receiptSourcePatientId > 0
        ? this.receiptSourcePatientId
        : null) ||
      Number((order.lines?.[0] as any)?.patientId) ||
      Number((order.lines?.[0] as any)?.clientId) ||
      null;
    if (patientId != null && patientId > 0) {
      this.posSaleClientId = patientId;
      this.posSaleClientName = name || this.posSaleClientName || 'Client';
    } else if (name) {
      this.posSaleClientName = name;
    }
    if (visitId != null && visitId > 0) {
      this.posSaleVisitId = visitId;
      this.posSaleVisitNumber = visitNumber;
    }
    // Resolve client id from visit when the sale doc did not include patientId.
    if (
      !(this.posSaleClientId != null && this.posSaleClientId > 0) &&
      visitId != null &&
      visitId > 0
    ) {
      this.enrichPosClientFromVisit(visitId);
    }
  }

  private enrichPosClientFromVisit(visitId: number): void {
    this.api.getClientVisitByVisitId(visitId).subscribe({
      next: (visit: any) => {
        const row = visit?.data ?? visit ?? {};
        const lookup = this.mapVisitClientLookup(row, visitId);
        if (lookup.clientName) {
          this.posSaleClientName = lookup.clientName;
        }
        if (lookup.visitNumber > 0) {
          this.posSaleVisitNumber = lookup.visitNumber;
        }
        const patient = row?.patient ?? row?.client ?? {};
        const pid = Number(
          row?.patientId ??
            row?.patient_id ??
            row?.clientId ??
            row?.client_id ??
            patient?.id
        );
        if (Number.isFinite(pid) && pid > 0) {
          this.posSaleClientId = pid;
        }
      },
      error: () => {
        /* keep whatever we already attached */
      },
    });
  }

  private soldOrderToCartSnapshot(order: PharmacySoldOrder): OtcCartLine[] {
    return (order.lines || []).map((row, idx) =>
      this.mapSoldLikeRowToCartLine(row, `sold-${row.lineId || idx}`)
    );
  }

  /** Map API sale document lines (or similar) into POS cart lines. */
  private cartFromApiSaleLines(apiLines: any[]): OtcCartLine[] {
    return (apiLines || []).map((row, idx) =>
      this.mapSoldLikeRowToCartLine(
        {
          itemName: row?.itemName ?? row?.stockItemName ?? 'Item',
          dosage: row?.dosage,
          quantity: row?.quantity,
          totalUnits: row?.totalUnits,
          unitSellingPrice: row?.unitSellingPrice,
          unitBuy: row?.unitBuy,
          totalAmount: row?.totalAmount,
          stockBatchId: row?.stockBatchId ?? row?.stock_batch_id,
          itemId: row?.itemId ?? row?.stockItemId ?? row?.item_id,
          amountPerFrequencyValue: row?.amountPerFrequencyValue,
          amountPerFrequencyUnit: row?.amountPerFrequencyUnit,
          frequencyValue: row?.frequencyValue,
          frequencyUnit: row?.frequencyUnit,
          durationValue: row?.durationValue,
          durationUnit: row?.durationUnit,
          lineId: row?.id ?? row?.lineId ?? idx,
        },
        `sale-doc-${row?.id ?? idx}`
      )
    );
  }

  /** Fallback when only printable receipt lines are available. */
  private cartFromReceiptLines(receiptLines: OtcReceiptLine[]): OtcCartLine[] {
    return (receiptLines || []).map((row, idx) => {
      const match = this.findCatalogIdsForSoldItemName(row.itemName);
      const qty = this.num(row.quantity) || 1;
      const unitSell = this.num(row.unitPrice);
      const total = this.num(row.lineTotal) || qty * unitSell;
      return {
        cartLineKey: `receipt-${idx}`,
        lineSource: 'OTC' as const,
        given: row.given !== false,
        stockBatchId: match.stockBatchId,
        itemId: match.itemId || 0,
        itemName: row.itemName || 'Item',
        amountPerFrequencyValue: null,
        amountPerFrequencyUnit: '',
        frequencyValue: null,
        frequencyUnit: null,
        durationValue: null,
        durationUnit: null,
        quantity: qty,
        totalUnits: qty,
        unitBuy: 0,
        unitSellingPrice: unitSell,
        totalAmount: total,
        discountAmount: this.num(row.discountAmount),
        discountMode: 'none' as const,
        discountInput: 0,
        instructions: '',
        route: '',
        stockAtHand: 9999,
        useUnitSellingModel: false,
      };
    });
  }

  private mapSoldLikeRowToCartLine(
    row: {
      itemName?: string;
      dosage?: string;
      quantity?: number | null;
      totalUnits?: number | null;
      unitSellingPrice?: number | null;
      unitBuy?: number | null;
      totalAmount?: number | null;
      stockBatchId?: number | null;
      itemId?: number | null;
      amountPerFrequencyValue?: number | null;
      amountPerFrequencyUnit?: string | null;
      frequencyValue?: number | null;
      frequencyUnit?: string | number | null;
      durationValue?: number | null;
      durationUnit?: string | number | null;
      lineId?: number | null;
    },
    cartLineKey: string
  ): OtcCartLine {
    let stockBatchId =
      row.stockBatchId != null && Number(row.stockBatchId) > 0
        ? Number(row.stockBatchId)
        : null;
    let itemId = row.itemId != null && Number(row.itemId) > 0 ? Number(row.itemId) : 0;
    if (!itemId && !stockBatchId) {
      const match = this.findCatalogIdsForSoldItemName(row.itemName || '');
      itemId = match.itemId;
      stockBatchId = stockBatchId || match.stockBatchId;
    }
    const qty = this.num(row.quantity) || 1;
    const unitSell = this.num(row.unitSellingPrice);
    const unitBuy = this.num(row.unitBuy);
    const total = this.num(row.totalAmount) || qty * unitSell;
    return {
      cartLineKey,
      lineSource: 'OTC' as const,
      given: true,
      stockBatchId,
      itemId: itemId || 0,
      itemName: row.itemName || 'Item',
      amountPerFrequencyValue: row.amountPerFrequencyValue ?? null,
      amountPerFrequencyUnit: row.amountPerFrequencyUnit || '',
      frequencyValue: row.frequencyValue ?? null,
      frequencyUnit:
        row.frequencyUnit != null && row.frequencyUnit !== ''
          ? Number(row.frequencyUnit)
          : null,
      durationValue: row.durationValue ?? null,
      durationUnit:
        row.durationUnit != null && row.durationUnit !== ''
          ? Number(row.durationUnit)
          : null,
      quantity: qty,
      totalUnits: this.num(row.totalUnits) || qty,
      unitBuy,
      unitSellingPrice: unitSell,
      totalAmount: total,
      discountAmount: 0,
      discountMode: 'none' as const,
      discountInput: 0,
      instructions: '',
      route: '',
      stockAtHand: 9999,
      useUnitSellingModel: false,
    };
  }

  private findCatalogIdsForSoldItemName(itemName: string): {
    itemId: number;
    stockBatchId: number | null;
  } {
    const needle = String(itemName || '')
      .trim()
      .toLowerCase();
    if (!needle) {
      return { itemId: 0, stockBatchId: null };
    }
    const stockItem = (this.allStockItemsCache || []).find((row) => {
      const name = String(row?.stockItemName || row?.itemName || row?.name || '')
        .trim()
        .toLowerCase();
      return name === needle || name.includes(needle) || needle.includes(name);
    });
    if (stockItem) {
      const id = Number(stockItem?.id ?? stockItem?.stockItemId) || 0;
      return { itemId: id, stockBatchId: null };
    }
    const batch = (this.allStockBatchesCache || []).find((row) => {
      const name = String(
        row?.stockItemName || row?.itemName || row?.stockItem?.stockItemName || ''
      )
        .trim()
        .toLowerCase();
      return name === needle || name.includes(needle);
    });
    if (batch) {
      return {
        itemId: Number(batch?.stockItemId ?? batch?.stockItem?.id) || 0,
        stockBatchId: Number(batch?.id) || null,
      };
    }
    return { itemId: 0, stockBatchId: null };
  }

  async shareOtcReceipt(): Promise<void> {
    if (!this.receipt) {
      return;
    }
    await this.facilityBranding.loadLogoDataUrl();
    const pdf = this.buildReceiptPdf(this.receipt);
    const filename = this.receiptPdfFilename(this.receipt);
    const blob = pdf.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });
    const title = this.receiptDocumentTitle(this.receipt);
    try {
      const nav = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
        canShare?: (data: ShareData) => boolean;
      };
      if (typeof nav.share === 'function') {
        const data: ShareData = { title, text: `${title} ${this.receipt.saleNo}`, files: [file] };
        if (!nav.canShare || nav.canShare(data)) {
          await nav.share(data);
          return;
        }
        await nav.share({ title, text: `${title} ${this.receipt.saleNo}` });
        return;
      }
    } catch {
      /* user cancelled or share failed — fall through to download */
    }
    pdf.save(filename);
    this.flashStatus('PDF downloaded — share it from your files.', false);
  }

  soldOrderDocumentStageLabel(order: PharmacySoldOrder): string {
    const info = this.soldOrderDocumentStage(order);
    if (info.state === 'processing') {
      return `${info.stage} · Processing`;
    }
    return info.stage;
  }

  private resolveSoldOrderDocumentType(order: PharmacySoldOrder): string {
    if (
      order.goodsDelivered === true ||
      !!String(order.deliveryNote || '').trim() ||
      order.lines?.some((l) => l.goodsDelivered === true || !!String(l.deliveryNote || '').trim())
    ) {
      const rawDoc = String(order.documentType || order.lines?.[0]?.documentType || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
      if (rawDoc === 'delivery_note' || rawDoc === 'delivery' || rawDoc === 'deliverynote') {
        return 'delivery_note';
      }
      // Delivery confirmed on the visit — progress is past receipt.
      return 'delivery_note';
    }
    const raw = String(order.documentType || order.lines?.[0]?.documentType || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    if (raw) {
      if (raw === 'quotation' || raw === 'quote') {
        return 'quotation';
      }
      if (raw === 'sales_order' || raw === 'salesorder' || raw === 'order') {
        return 'sales_order';
      }
      if (raw === 'proforma' || raw === 'proforma_invoice') {
        return 'proforma';
      }
      if (raw === 'sales_invoice' || raw === 'invoice') {
        return 'sales_invoice';
      }
      if (raw === 'receipt' || raw === 'payment' || raw === 'payments') {
        return 'receipt';
      }
      if (raw === 'efris_receipt' || raw === 'efris' || raw === 'efrisreceipt') {
        return 'efris_receipt';
      }
      if (raw === 'delivery_note' || raw === 'delivery' || raw === 'deliverynote') {
        return 'delivery_note';
      }
    }
    // Legacy rows without documentType: infer from payment.
    const total = this.soldOrderDue(order);
    const paid = this.soldOrderPaid(order);
    if (total > 0 && paid + 0.0001 >= total) {
      return 'receipt';
    }
    if (total > 0) {
      return 'sales_invoice';
    }
    return 'receipt';
  }

  orderTotalQty(order: PharmacySoldOrder): number {
    return order.lines.reduce((s, r) => s + this.num(r.quantity), 0);
  }

  /** Visit display number for prescription (Rx) sold orders. */
  soldOrderVisitNumber(order: PharmacySoldOrder): number | null {
    if (!this.orderLooksLikeRx(order)) {
      return null;
    }
    const visitNumber = Number(order.visitNumber);
    if (Number.isFinite(visitNumber) && visitNumber > 0) {
      return visitNumber;
    }
    const visitId = this.soldOrderResolveVisitId(order);
    if (visitId != null && this.soldOrderVisitNumberCache.has(visitId)) {
      return this.soldOrderVisitNumberCache.get(visitId)!;
    }
    if (visitId != null) {
      return visitId;
    }
    return null;
  }

  soldOrderClientName(order: PharmacySoldOrder): string {
    const fromOrder = (order.clientName || '').trim();
    if (fromOrder) {
      return fromOrder;
    }
    for (const line of order.lines) {
      const name = (line.clientName || '').trim();
      if (name) {
        return name;
      }
    }
    const visitId = this.soldOrderResolveVisitId(order);
    if (visitId != null) {
      const cached = this.soldOrderClientNameCache.get(visitId);
      if (cached) {
        return cached;
      }
    }
    return '';
  }

  /** Business POS — sold history is never treated as prescriptions. */
  orderLooksLikeRx(_order: PharmacySoldOrder): boolean {
    return false;
  }

  soldOrderResolveVisitId(order: PharmacySoldOrder): number | null {
    const fromOrder = Number(order.visitId);
    if (Number.isFinite(fromOrder) && fromOrder > 0) {
      return fromOrder;
    }
    for (const line of order.lines) {
      const fromLine = Number(line.visitId);
      if (Number.isFinite(fromLine) && fromLine > 0) {
        return fromLine;
      }
    }
    return null;
  }

  private soldOrderResolveVisitNumber(order: PharmacySoldOrder): number | null {
    const visitNumber = Number(order.visitNumber);
    if (Number.isFinite(visitNumber) && visitNumber > 0) {
      return visitNumber;
    }
    for (const line of order.lines) {
      const n = Number(line.visitNumber);
      if (Number.isFinite(n) && n > 0) {
        return n;
      }
    }
    return null;
  }

  private parseVisitIdFromLabel(value: string | null | undefined): number | null {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return null;
    }
    const visitMatch = /^VISIT[-_\s#]?(\d+)/i.exec(raw);
    if (visitMatch) {
      const id = Number(visitMatch[1]);
      return Number.isFinite(id) && id > 0 ? id : null;
    }
    return null;
  }

  private ensureSoldOrderClientName(order: PharmacySoldOrder): void {
    if (!this.orderLooksLikeRx(order) || this.soldOrderClientName(order)) {
      return;
    }
    this.requestSoldOrderClientEnrichment(order);
  }

  private enrichSoldOrdersMissingClientNames(orders: PharmacySoldOrder[]): void {
    for (const order of orders) {
      this.ensureSoldOrderClientName(order);
    }
  }

  private requestSoldOrderClientEnrichment(order: PharmacySoldOrder): void {
    const visitId = this.soldOrderResolveVisitId(order);
    const visitNumber = this.soldOrderResolveVisitNumber(order);
    const cacheKey = visitId ?? (visitNumber != null ? -visitNumber : null);
    if (cacheKey == null) {
      return;
    }
    if (visitId != null && this.soldOrderClientNameCache.has(visitId)) {
      this.applySoldOrderClientEnrichment(visitId, this.soldOrderClientNameCache.get(visitId)!, this.soldOrderVisitNumberCache.get(visitId) ?? 0);
      return;
    }
    if (this.soldOrderClientNameLoading.has(cacheKey)) {
      return;
    }
    this.soldOrderClientNameLoading.add(cacheKey);
    this.fetchSoldOrderClientByVisit(visitId, visitNumber, order.visitDate).subscribe({
      next: ({ clientName, visitNumber: resolvedVisitNumber, visitId: resolvedVisitId }) => {
        this.soldOrderClientNameLoading.delete(cacheKey);
        const id = resolvedVisitId || visitId;
        if (id != null && clientName) {
          this.soldOrderClientNameCache.set(id, clientName);
        }
        if (id != null && resolvedVisitNumber > 0) {
          this.soldOrderVisitNumberCache.set(id, resolvedVisitNumber);
        }
        if (id != null) {
          this.applySoldOrderClientEnrichment(id, clientName, resolvedVisitNumber);
        }
      },
      error: () => {
        this.soldOrderClientNameLoading.delete(cacheKey);
      },
    });
  }

  private applySoldOrderClientEnrichment(
    visitId: number,
    clientName: string,
    visitNumber: number
  ): void {
    if (!clientName && visitNumber <= 0 && visitId <= 0) {
      return;
    }
    for (const order of this.soldOrders) {
      if (!this.orderMatchesVisitEnrichment(order, visitId, visitNumber)) {
        continue;
      }
      if (clientName && !order.clientName) {
        order.clientName = clientName;
      }
      if (visitNumber > 0) {
        order.visitNumber = visitNumber;
      }
      order.visitId = order.visitId ?? visitId;
      order.saleSource = 'OTC';
      for (const line of order.lines) {
        if (clientName && !line.clientName) {
          line.clientName = clientName;
        }
        if (visitNumber > 0 && !line.visitNumber) {
          line.visitNumber = visitNumber;
        }
        line.visitId = line.visitId ?? visitId;
      }
    }
    this.soldOrders = [...this.soldOrders];
    if (this.selectedSoldOrder) {
      if (this.orderMatchesVisitEnrichment(this.selectedSoldOrder, visitId, visitNumber)) {
        if (clientName && !this.selectedSoldOrder.clientName) {
          this.selectedSoldOrder.clientName = clientName;
        }
        if (visitNumber > 0) {
          this.selectedSoldOrder.visitNumber = visitNumber;
        }
        if (visitId > 0) {
          this.selectedSoldOrder.visitId = this.selectedSoldOrder.visitId ?? visitId;
        }
      }
    }
  }

  private orderMatchesVisitEnrichment(
    order: PharmacySoldOrder,
    visitId: number,
    visitNumber: number
  ): boolean {
    const orderVisitId = this.soldOrderResolveVisitId(order);
    if (visitId > 0 && orderVisitId === visitId) {
      return true;
    }
    if (visitNumber > 0) {
      const orderVisitNumber = this.soldOrderResolveVisitNumber(order);
      if (orderVisitNumber === visitNumber || Number(order.visitNumber) === visitNumber) {
        return true;
      }
    }
    return false;
  }

  private fetchSoldOrderClientByVisit(
    visitId: number | null,
    visitNumber: number | null,
    visitDate: string
  ): Observable<{ clientName: string; visitNumber: number; visitId: number }> {
    if (visitId != null && visitId > 0) {
      return this.api.getClientVisitByVisitId(visitId).pipe(
        map((visit) => this.mapVisitClientLookup(visit, visitId)),
        switchMap((result) => {
          if (result.clientName) {
            return of(result);
          }
          if (visitNumber != null && visitNumber > 0) {
            return this.fetchSoldOrderClientByVisitNumber(visitNumber, visitDate, visitId);
          }
          return of(result);
        }),
        catchError(() => {
          if (visitNumber != null && visitNumber > 0) {
            return this.fetchSoldOrderClientByVisitNumber(visitNumber, visitDate, visitId);
          }
          return of({ clientName: '', visitNumber: visitNumber ?? 0, visitId: visitId ?? 0 });
        })
      );
    }
    if (visitNumber != null && visitNumber > 0) {
      return this.fetchSoldOrderClientByVisitNumber(visitNumber, visitDate, null);
    }
    return of({ clientName: '', visitNumber: 0, visitId: 0 });
  }

  private fetchSoldOrderClientByVisitNumber(
    visitNumber: number,
    visitDate: string,
    fallbackVisitId: number | null
  ): Observable<{ clientName: string; visitNumber: number; visitId: number }> {
    const date = (visitDate || '').trim();
    const from = date || this.filterDateFrom || this.getLast7DaysRange().from;
    const to = date || this.filterDateTo || this.getLast7DaysRange().to;
    return this.api.filterVisits({ datefrom: from, dateto: to }).pipe(
      map((visits) => {
        const list = Array.isArray(visits) ? visits : [];
        const match =
          list.find((v) => Number(v?.visitNumber ?? v?.visit_number) === visitNumber) ??
          list.find((v) => Number(v?.id ?? v?.visitId) === fallbackVisitId);
        if (!match) {
          return {
            clientName: '',
            visitNumber,
            visitId: fallbackVisitId ?? 0,
          };
        }
        return this.mapVisitClientLookup(
          match,
          fallbackVisitId ?? (Number(match?.id ?? match?.visitId) || 0)
        );
      }),
      catchError(() =>
        of({ clientName: '', visitNumber, visitId: fallbackVisitId ?? 0 })
      )
    );
  }

  private mapVisitClientLookup(
    visit: any,
    fallbackVisitId: number
  ): { clientName: string; visitNumber: number; visitId: number } {
    const clientName = this.extractClientNameFromVisit(visit);
    const visitNumber = this.extractVisitNumberFromVisit(visit);
    const visitId = Number(visit?.id ?? visit?.visitId ?? fallbackVisitId) || fallbackVisitId;
    return {
      clientName,
      visitNumber: visitNumber > 0 ? visitNumber : 0,
      visitId: visitId > 0 ? visitId : 0,
    };
  }

  private extractClientNameFromVisit(visit: any): string {
    if (!visit || typeof visit !== 'object') {
      return '';
    }
    const direct = String(visit.clientName ?? visit.client_name ?? '').trim();
    if (direct) {
      return this.formatDisplayName(direct);
    }
    const first = String(visit.clientFirstName ?? visit.client_first_name ?? '').trim();
    const second = String(visit.clientSecondName ?? visit.client_second_name ?? '').trim();
    const combined = `${first} ${second}`.trim();
    if (combined) {
      return this.formatDisplayName(combined);
    }
    const nested = visit.client ?? visit.clientVisit ?? visit.visit;
    if (nested && typeof nested === 'object' && nested !== visit) {
      return this.extractClientNameFromVisit(nested);
    }
    return '';
  }

  private extractVisitNumberFromVisit(visit: any): number {
    const n = Number(visit?.visitNumber ?? visit?.visit_number);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  private resolveHistoryRowClientName(row: any): string {
    const direct = row?.clientName ?? row?.client_name ?? row?.patientName ?? row?.patient_name;
    if (direct != null && String(direct).trim()) {
      return String(direct).trim();
    }
    const first = String(row?.clientFirstName ?? row?.client_first_name ?? '').trim();
    const second = String(row?.clientSecondName ?? row?.client_second_name ?? '').trim();
    const combined = `${first} ${second}`.trim();
    if (combined) {
      return combined;
    }
    const fromVisit = this.extractClientNameFromVisit(row?.visit ?? row?.clientVisit);
    if (fromVisit) {
      return fromVisit;
    }
    return this.extractClientNameFromVisit(row?.client);
  }

  private resolveHistoryRowDocumentType(row: any): string | undefined {
    const raw = String(row?.documentType ?? row?.document_type ?? row?.docType ?? '').trim();
    return raw || undefined;
  }

  private resolveHistoryRowVisitId(row: any): number | null {
    const id = Number(row?.visitId ?? row?.visit_id ?? row?.clientVisitId);
    if (Number.isFinite(id) && id > 0) {
      return id;
    }
    return null;
  }

  /** Business app: sold rows are always commercial orders (no Rx/treatment source). */
  private resolveHistoryRowSaleSource(_row: any): 'OTC' | 'RX' {
    return 'OTC';
  }

  selectedPrescriptionGroup(): {
    visitId: number;
    visitNumber: number;
    clientName: string;
    visitDate: string;
    visitTime: string;
    rows: DoctorPrescriptionRow[];
  } | null {
    if (this.selectedPrescriptionVisitId == null) {
      return null;
    }
    return (
      this.groupedPrescriptionVisits().find(
        (g) => g.visitId === this.selectedPrescriptionVisitId
      ) ?? null
    );
  }

  selectedPrescriptionRows(): DoctorPrescriptionRow[] {
    if (this.selectedPrescriptionDetailRows.length) {
      return this.selectedPrescriptionDetailRows;
    }
    if (this.selectedPrescriptionVisitId == null) {
      return [];
    }
    return this.doctorPrescriptionRows.filter(
      (r) => r.visitId === this.selectedPrescriptionVisitId
    );
  }

  billablePrescriptionRows(): DoctorPrescriptionRow[] {
    return this.dispensablePrescriptionRows();
  }

  selectPrescriptionVisit(visitId: number, detailRows?: DoctorPrescriptionRow[]): void {
    this.selectedPrescriptionVisitId = visitId;
    const group = this.selectedPrescriptionGroup();
    const rows =
      detailRows?.length
        ? detailRows
        : group?.rows?.length
          ? group.rows
          : this.doctorPrescriptionRows.filter((r) => r.visitId === visitId);
    this.selectedPrescriptionDetailRows = rows;
    if (group) {
      this.rxSaleNotes = `Pharmacy prescription sale — ${group.clientName}`;
      if (group.rows.some((r) => this.prescriptionRowHasPrescribing(r))) {
        this.otcSaleMode = 'prescribing';
      }
      this.applyPrescriptionStockAvailability(group.rows);
    }
    this.loadPrescriptionSundriesForSelectedVisit();
    this.syncRxAmountReceivedToSubtotal();
    this.cdr.detectChanges();
  }

  prescriptionSundryQty(row: any): number {
    return Number(row?.quantityUsed ?? row?.quantity ?? row?.qty ?? 0) || 0;
  }

  prescriptionSundryUnitCost(row: any): number {
    return Number(row?.unitCostPrice ?? row?.unitCost ?? 0) || 0;
  }

  prescriptionSundryUnitSell(row: any): number {
    return Number(row?.unitSellingPrice ?? row?.unitSell ?? 0) || 0;
  }

  prescriptionSundryTotalCost(row: any): number {
    return this.prescriptionSundryQty(row) * this.prescriptionSundryUnitCost(row);
  }

  prescriptionSundryTotalSell(row: any): number {
    const explicit = Number(row?.lineTotal ?? row?.totalSell ?? row?.amount ?? 0);
    if (Number.isFinite(explicit) && explicit > 0) {
      return explicit;
    }
    return this.prescriptionSundryQty(row) * this.prescriptionSundryUnitSell(row);
  }

  selectPrescriptionVisitCard(
    group: {
      visitId: number;
      clientName: string;
      rows: DoctorPrescriptionRow[];
    },
    event?: Event
  ): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.ngZone.run(() => {
      this.selectPrescriptionVisit(group.visitId, group.rows);
      this.cdr.detectChanges();
    });
  }

  viewPrescriptionVisitDetails(
    group: {
      visitId: number;
      clientName: string;
      rows: DoctorPrescriptionRow[];
    },
    event?: Event
  ): void {
    this.selectPrescriptionVisitCard(group, event);
  }

  openRxQueueModal(
    group: {
      visitId: number;
      visitNumber: number;
      clientName: string;
      rows: DoctorPrescriptionRow[];
    },
    event?: Event
  ): void {
    event?.preventDefault();
    event?.stopPropagation();
    const row = group.rows?.[0];
    const clientId = Number(row?.clientId);
    if (!Number.isFinite(clientId) || clientId <= 0) {
      this.flashStatus('Client not found for this prescription visit.', true);
      return;
    }
    this.rxQueueTarget = {
      visitId: group.visitId,
      visitNumber: group.visitNumber,
      clientName: group.clientName,
      clientId,
    };
    this.rxQueueError = '';
    this.rxQueueClinics = [];
    this.ensureBusinessModulesForQueue(() => {
      this.rxQueueForm = {
        fromModuleId: this.pickRxQueueFromModuleId(),
        toModuleId: null,
        clinicId: null,
        note: `Pharmacy prescription — ${group.clientName}`,
        visitDefaultScheme: '',
        clientGroupId: null,
        emergency: false,
        revisit: false,
        printQueueTicket: false,
      };
      this.loadRxQueueClientGroups();
      this.showRxQueueModal = true;
      document.body.style.overflow = 'hidden';
    });
  }

  closeRxQueueModal(): void {
    this.showRxQueueModal = false;
    this.rxQueueTarget = null;
    this.rxQueueError = '';
    this.rxQueueClinics = [];
    document.body.style.overflow = '';
  }

  onRxQueueToModuleChange(): void {
    this.rxQueueForm.clinicId = null;
    if (isQueueDischargeDestination(this.rxQueueForm.toModuleId)) {
      this.rxQueueClinics = [];
      return;
    }
    if (!this.rxQueueForm.toModuleId) {
      this.rxQueueClinics = [];
      return;
    }
    this.api.getBusinessClinics(this.rxQueueForm.toModuleId).subscribe({
      next: (res: any) => {
        const all = Array.isArray(res) ? res : [];
        this.rxQueueClinics = all.filter((c: any) => c.active !== false);
      },
      error: () => {
        this.rxQueueClinics = [];
      },
    });
  }

  onRxQueueSchemeChange(): void {
    const g = this.rxQueueClientGroups.find(
      (x) => x.id === this.rxQueueForm.clientGroupId
    );
    this.rxQueueForm.visitDefaultScheme = g?.groupName || '';
  }

  private loadRxQueueClientGroups(): void {
    if (this.rxQueueClientGroups.length) {
      return;
    }
    this.api.getClientGroupList().subscribe({
      next: (res: any) => {
        this.rxQueueClientGroups = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.rxQueueClientGroups = [];
      },
    });
  }

  rxQueueClientSurname(): string {
    return this.splitRxQueueClientName().surname;
  }

  rxQueueClientOtherNames(): string {
    return this.splitRxQueueClientName().otherNames;
  }

  private splitRxQueueClientName(): { surname: string; otherNames: string } {
    const raw = (this.rxQueueTarget?.clientName || '').trim();
    if (!raw) {
      return { surname: '—', otherNames: '—' };
    }
    const parts = raw.split(/\s+/);
    if (parts.length === 1) {
      return { surname: parts[0], otherNames: '—' };
    }
    return {
      surname: parts[parts.length - 1],
      otherNames: parts.slice(0, -1).join(' '),
    };
  }

  submitRxQueue(): void {
    if (!this.rxQueueTarget) {
      return;
    }
    const fromModuleId = Number(this.rxQueueForm.fromModuleId);
    const toModuleId = Number(this.rxQueueForm.toModuleId);
    if (!Number.isFinite(fromModuleId) || fromModuleId <= 0 || !Number.isFinite(toModuleId)) {
      this.rxQueueError = 'Select both From and destination.';
      return;
    }
    if (!isQueueDischargeDestination(toModuleId) && fromModuleId === toModuleId) {
      this.rxQueueError = 'From and To departments must be different.';
      return;
    }
    const visitId = this.rxQueueTarget.visitId;
    const pharmacyId = this.resolvePharmacyModuleId();
    const username = sessionStorage.getItem('username') || '';
    this.rxQueueSaving = true;
    this.rxQueueError = '';

    if (isQueueDischargeDestination(toModuleId)) {
      this.completePharmacyQueueForVisit(visitId, pharmacyId)
        .pipe(
          switchMap(() =>
            this.api.dischargeClientFromQueue({
              clientId: this.rxQueueTarget!.clientId,
              note: String(this.rxQueueForm.note ?? '').trim() || 'Pharmacy discharge',
              dischargedBy: username,
            })
          )
        )
        .subscribe({
          next: () => {
            this.rxQueueSaving = false;
            this.removePrescriptionVisitFromTable(visitId);
            this.flashStatus('Client discharged from queue.', false);
            this.closeRxQueueModal();
            this.loadDoctorPrescriptions();
          },
          error: (err: any) => {
            this.rxQueueSaving = false;
            this.rxQueueError = err?.error?.message || 'Failed to discharge client.';
          },
        });
      return;
    }

    const scheme =
      this.rxQueueForm.visitDefaultScheme ||
      this.rxQueueClientGroups.find((g) => g.id === this.rxQueueForm.clientGroupId)
        ?.groupName ||
      '';
    this.completePharmacyQueueForVisit(visitId, pharmacyId)
      .pipe(
        switchMap(() =>
          this.api.queueClient({
            clientId: this.rxQueueTarget!.clientId,
            clientVisitId: visitId,
            fromModuleId,
            toModuleId,
            clinicId: this.rxQueueForm.clinicId ?? undefined,
            note: String(this.rxQueueForm.note ?? '').trim() || 'Pharmacy prescription',
            visitDefaultScheme: scheme,
            clientGroupId: this.rxQueueForm.clientGroupId ?? undefined,
            emergency: this.rxQueueForm.emergency,
            revisit: this.rxQueueForm.revisit,
            queuedBy: sessionStorage.getItem('username') || '',
          })
        )
      )
      .subscribe({
        next: (entry: any) => {
          this.rxQueueSaving = false;
          const ticket = entry?.queueNumber ? ` (${entry.queueNumber})` : '';
          if (this.rxQueueForm.printQueueTicket && entry?.queueNumber) {
            this.printRxQueueTicket(entry);
          }
          this.removePrescriptionVisitFromTable(visitId);
          this.flashStatus(`Client queued successfully${ticket}.`, false);
          this.closeRxQueueModal();
          this.loadDoctorPrescriptions();
        },
        error: (err: any) => {
          this.rxQueueSaving = false;
          this.rxQueueError = err?.error?.message || 'Failed to queue client.';
        },
      });
  }

  /** Close the active pharmacy queue board entry so the visit drops off the Rx table. */
  private completePharmacyQueueForVisit(
    visitId: number,
    pharmacyModuleId: number | null
  ): Observable<void> {
    if (pharmacyModuleId == null || visitId <= 0) {
      return of(undefined);
    }
    const activeStatuses = new Set(['WAITING', 'CALLED', 'SERVING']);
    return this.api.getClientQueueEntries(pharmacyModuleId).pipe(
      map((res: any) => {
        const entries = Array.isArray(res) ? res : [];
        return entries.find(
          (e: any) =>
            Number(e.clientVisitId) === visitId &&
            activeStatuses.has(String(e.status ?? '').toUpperCase())
        );
      }),
      switchMap((entry: any) => {
        const entryId = Number(entry?.id);
        if (!Number.isFinite(entryId) || entryId <= 0) {
          return of(undefined);
        }
        return this.api.completeClientQueueEntry(entryId).pipe(
          map(() => undefined),
          catchError(() => of(undefined))
        );
      }),
      catchError(() => of(undefined))
    );
  }

  private printRxQueueTicket(entry: any): void {
    const target = this.rxQueueTarget;
    if (!target) {
      return;
    }
    const w = window.open('', '_blank', 'width=420,height=340');
    if (!w) {
      return;
    }
    w.document.write(`
      <html><head><title>Queue Ticket</title></head>
      <body style="font-family:sans-serif;padding:16px">
        <h2>Queue Ticket</h2>
        <p><strong>${entry.queueNumber || ''}</strong></p>
        <p>${target.clientName || ''}</p>
        <p>Visit: ${target.visitNumber || target.visitId}</p>
        <p>To: ${entry.toModuleName || ''}</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  }

  private ensureBusinessModulesForQueue(done: () => void): void {
    const finish = () => {
      this.resolvePharmacyModuleId();
      done();
    };
    if (this.businessModules.length) {
      finish();
      return;
    }
    this.api.getAllBusinessModules().subscribe({
      next: (res: any) => {
        this.businessModules = normalizeBusinessModules(res);
        this.resolvePharmacyModuleId();
        done();
      },
      error: () => {
        this.businessModules = [];
        done();
      },
    });
  }

  /** Current pharmacy page module — used as default queue "From" department. */
  private resolvePharmacyModuleId(): number | null {
    if (this.pharmacyModuleId != null && this.pharmacyModuleId > 0) {
      return this.pharmacyModuleId;
    }
    const cached = getQueuePageModuleIdFromSession();
    if (cached != null) {
      this.pharmacyModuleId = cached;
      return cached;
    }
    const id = resolveModuleIdForUrl(this.router.url, this.businessModules);
    if (id != null) {
      this.pharmacyModuleId = id;
      applyQueuePageModuleToSession(id);
    }
    return id;
  }

  private pickRxQueueFromModuleId(): number | null {
    const pharmacyId = this.resolvePharmacyModuleId();
    return (
      ensureFromModuleInList(pharmacyId, this.businessModules, pharmacyId) ??
      pickDefaultFromModuleId(this.businessModules, pharmacyId)
    );
  }

  saleSourceLabel(_row: OtcSoldRow | PharmacySoldOrder): string {
    return 'Order';
  }

  saleSourceBadgeClass(_row: OtcSoldRow | PharmacySoldOrder): string {
    return 'sale-source-otc';
  }

  get historyTotalQty(): number {
    return this.filteredSoldOrders().reduce(
      (s, o) => s + o.lines.reduce((ls, r) => ls + this.num(r.quantity), 0),
      0
    );
  }

  get historyTotalCost(): number {
    return this.filteredSoldOrders().reduce((s, o) => s + o.totalCost, 0);
  }

  get historyTotalSell(): number {
    return this.filteredSoldOrders().reduce((s, o) => s + this.soldOrderDue(o), 0);
  }

  get historyTotalReceived(): number {
    return this.filteredSoldOrders().reduce((s, o) => s + this.soldOrderPaid(o), 0);
  }

  get historyTotalBalance(): number {
    return this.filteredSoldOrders().reduce((s, o) => s + this.soldOrderBalance(o), 0);
  }

  /** Sale / invoice total for the order. */
  soldOrderDue(order: PharmacySoldOrder): number {
    const fromSale = this.num(order.saleTotalAmount);
    if (fromSale > 0) {
      return fromSale;
    }
    return this.num(order.totalSell);
  }

  /**
   * Amount actually paid toward the bill (not cash tendered).
   * Example: total 50,000, client hands 100,000 → paid = 50,000 (change is not “paid”).
   */
  soldOrderPaid(order: PharmacySoldOrder): number {
    const due = this.soldOrderDue(order);
    const tendered = this.num(order.amountReceived);
    if (due <= 0) {
      return Math.max(0, tendered);
    }
    return Math.min(Math.max(0, tendered), due);
  }

  soldOrderBalance(order: PharmacySoldOrder): number {
    return Math.max(0, this.soldOrderDue(order) - this.soldOrderPaid(order));
  }

  openSoldOrderPaymentModal(order: PharmacySoldOrder, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (!order) {
      return;
    }
    const visitId = Number(order.visitId);
    if (!Number.isFinite(visitId) || visitId <= 0) {
      this.flashStatus('This order has no linked visit to receive payment on.', true);
      return;
    }
    this.orderPaymentTarget = order;
    this.orderPaymentError = '';
    this.orderPaymentList = [];
    const due = this.soldOrderBalance(order);
    this.orderPaymentForm = {
      amountToPay: due > 0 ? due : null,
      paymentForm: 'Cash At Hand',
      notes: 'Payment Received with Thanks',
    };
    this.showOrderPaymentModal = true;
    document.body.classList.add('otc-receipt-modal-open');
    this.loadOrderPaymentHistory(visitId);
  }

  openFirstSoldOrderWithDebtPayment(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    const withDebt = this.filteredSoldOrders().find(
      (o) => this.soldOrderBalance(o) > 0 && Number(o.visitId) > 0
    );
    if (!withDebt) {
      this.flashStatus('No orders with outstanding debt in the current list.', true);
      return;
    }
    this.openSoldOrderPaymentModal(withDebt);
  }

  closeOrderPaymentModal(): void {
    if (this.orderPaymentReversing) {
      return;
    }
    this.showOrderPaymentModal = false;
    this.orderPaymentTarget = null;
    this.orderPaymentList = [];
    this.orderPaymentError = '';
    this.orderPaymentSaving = false;
    this.orderPaymentLoading = false;
    this.showOrderPaymentReverseModal = false;
    this.orderPaymentPendingReverse = null;
    if (!this.showReceiptModal) {
      document.body.classList.remove('otc-receipt-modal-open');
    }
  }

  /** Open the order receipt from the payment modal (view / print). */
  openOrderReceiptFromPaymentModal(order: PharmacySoldOrder): void {
    if (!order) {
      return;
    }
    this.closeOrderPaymentModal();
    this.openUpdatedReceiptAfterOrderPayment(order);
  }

  private loadOrderPaymentHistory(visitId: number): void {
    this.orderPaymentLoading = true;
    this.api.getPaymentsMadeByVisit(visitId).subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.orderPaymentList = [...rows].sort((a, b) => {
          const da = String(a?.dateOfPayment ?? a?.date_of_payment ?? '');
          const db = String(b?.dateOfPayment ?? b?.date_of_payment ?? '');
          const ta = String(a?.timeOfPayment ?? a?.time_of_payment ?? '');
          const tb = String(b?.timeOfPayment ?? b?.time_of_payment ?? '');
          const cmp = da.localeCompare(db);
          return cmp !== 0 ? cmp : ta.localeCompare(tb);
        });
        this.orderPaymentLoading = false;
        // Paid / Debt must follow real payment records, not phantom sale.amountReceived.
        this.reconcileOrderPaidFromPaymentHistory(visitId);
      },
      error: () => {
        this.orderPaymentList = [];
        this.orderPaymentLoading = false;
        this.orderPaymentError = 'Could not load payment history for this order.';
      },
    });
  }

  /**
   * Align the open order's Paid figure with the sum of visit payments so the
   * receive-payment form is offered whenever there is real outstanding debt.
   */
  private reconcileOrderPaidFromPaymentHistory(visitId: number): void {
    const order = this.orderPaymentTarget;
    if (!order || Number(order.visitId) !== Number(visitId)) {
      return;
    }
    const paidFromHistory = this.orderPaymentList.reduce((sum, p) => {
      if (this.isOrderPaymentReversed(p)) {
        return sum;
      }
      return sum + this.num(p?.amountToPay ?? p?.amount_to_pay ?? p?.amount ?? 0);
    }, 0);
    order.amountReceived = Math.max(0, paidFromHistory);
    const due = this.soldOrderBalance(order);
    this.orderPaymentForm = {
      ...this.orderPaymentForm,
      amountToPay: due > 0 ? due : null,
    };
  }

  isOrderPaymentReversed(payment: any): boolean {
    return String(payment?.status || '').trim().toLowerCase() === 'reversed';
  }

  requestReverseOrderPayment(payment: any): void {
    if (!payment?.id || this.isOrderPaymentReversed(payment) || this.orderPaymentReversing) {
      return;
    }
    this.orderPaymentPendingReverse = payment;
    this.showOrderPaymentReverseModal = true;
  }

  closeOrderPaymentReverseModal(): void {
    if (this.orderPaymentReversing) {
      return;
    }
    this.showOrderPaymentReverseModal = false;
    this.orderPaymentPendingReverse = null;
  }

  confirmReverseOrderPayment(): void {
    const payment = this.orderPaymentPendingReverse;
    const id = Number(payment?.id);
    const order = this.orderPaymentTarget;
    const visitId = order ? Number(order.visitId) : 0;
    if (!id || this.orderPaymentReversing) {
      return;
    }
    this.orderPaymentReversing = true;
    this.orderPaymentError = '';
    this.api.updatePayment(id, { status: 'Reversed' }).subscribe({
      next: (res: any) => {
        const finish = (): void => {
          this.orderPaymentReversing = false;
          this.showOrderPaymentReverseModal = false;
          this.orderPaymentPendingReverse = null;
          this.flashStatus(res?.message || 'Payment reversed.', false);
          if (visitId > 0) {
            this.loadOrderPaymentHistory(visitId);
          }
          this.loadSalesHistory();
        };
        if (visitId > 0) {
          this.api.reconcileOtcOrderPaid(visitId).subscribe({
            next: () => finish(),
            error: () => finish(),
          });
        } else {
          finish();
        }
      },
      error: (err) => {
        this.orderPaymentReversing = false;
        this.orderPaymentError = this.extractApiErrorMessage(
          err,
          'Could not reverse this payment.'
        );
      },
    });
  }

  get orderPaymentBalanceAfter(): number {
    const order = this.orderPaymentTarget;
    if (!order) {
      return 0;
    }
    const due = this.soldOrderBalance(order);
    const pay = Math.max(0, this.num(this.orderPaymentForm.amountToPay));
    return Math.max(0, roundUgxMoney(due - pay));
  }

  submitOrderPayment(): void {
    const order = this.orderPaymentTarget;
    if (!order || this.orderPaymentSaving) {
      return;
    }
    const visitId = Number(order.visitId);
    if (!Number.isFinite(visitId) || visitId <= 0) {
      this.orderPaymentError = 'Order visit is missing.';
      return;
    }
    const amount = this.num(this.orderPaymentForm.amountToPay);
    if (!(amount > 0)) {
      this.orderPaymentError = 'Enter an amount greater than zero.';
      return;
    }
    const outstanding = this.soldOrderBalance(order);
    if (outstanding <= 0) {
      this.orderPaymentError = 'This order has no outstanding debt.';
      return;
    }
    if (amount > outstanding + 0.009) {
      this.orderPaymentError = 'Amount cannot exceed the outstanding balance.';
      return;
    }
    this.orderPaymentSaving = true;
    this.orderPaymentError = '';
    const receivedBy = this.loggedInStaffName();
    this.api
      .payOtcOrderDebt(visitId, {
        amountToPay: amount,
        paymentForm: this.orderPaymentForm.paymentForm || 'Cash At Hand',
        status: 'Approved',
        notes: (this.orderPaymentForm.notes || 'Order payment').trim(),
        receivedBy,
        paidBy: receivedBy,
      })
      .subscribe({
        next: (res: any) => {
          this.orderPaymentSaving = false;
          const paidNow = this.soldOrderPaid(order) + amount;
          order.amountReceived = paidNow;
          if (this.soldOrderDue(order) > 0) {
            order.amountReceived = Math.min(paidNow, this.soldOrderDue(order));
          }
          const payload = res?.data ?? res;
          this.flashStatus(
            res?.message || `Payment of ${this.formatMoney(amount)} recorded.`,
            false
          );
          this.loadOrderPaymentHistory(visitId);
          const stillDue = this.soldOrderBalance(order);
          this.orderPaymentForm.amountToPay = stillDue > 0 ? stillDue : null;
          this.closeOrderPaymentModal();
          this.loadSalesHistory();
          // Refresh and open the updated receipt for this order.
          this.openUpdatedReceiptAfterOrderPayment(order, payload);
        },
        error: (err) => {
          this.orderPaymentSaving = false;
          this.orderPaymentError = this.extractApiErrorMessage(
            err,
            'Could not record payment on this order.'
          );
        },
      });
  }

  /** After debt payment, reload and show the order receipt with new amount received. */
  private openUpdatedReceiptAfterOrderPayment(order: PharmacySoldOrder, payload?: any): void {
    const visitId = Number(order.visitId);
    if (!Number.isFinite(visitId) || visitId <= 0) {
      return;
    }
    const preferredType = normalizeCommercialDocType(
      payload?.documentType ||
        payload?.receipt?.documentType ||
        order.documentType ||
        'receipt'
    );
    const tryTypes: CommercialDocType[] =
      preferredType === 'efris_receipt'
        ? ['efris_receipt', 'receipt']
        : preferredType === 'sales_invoice'
          ? ['receipt', 'efris_receipt', 'sales_invoice']
          : ['receipt', 'efris_receipt', 'sales_invoice'];

    const tryNext = (index: number): void => {
      if (index >= tryTypes.length) {
        return;
      }
      const docType = tryTypes[index];
      this.api.listOtcSaleDocuments({ visitId, documentType: docType }).subscribe({
        next: (docs) => {
          const match = Array.isArray(docs) && docs.length ? docs[0] : null;
          if (match) {
            // Prefer live totals from the payment response when present.
            const receiptPayload = payload?.receipt ?? payload;
            const merged =
              receiptPayload &&
              (Number(receiptPayload.saleId ?? receiptPayload.id) === Number(match.id) ||
                Number(receiptPayload.id) === Number(match.id) ||
                !receiptPayload.id)
                ? {
                    ...match,
                    amountReceived:
                      receiptPayload.amountReceived ?? match.amountReceived,
                    totalAmount: receiptPayload.totalAmount ?? match.totalAmount,
                    paymentForm: receiptPayload.paymentForm ?? match.paymentForm,
                    changeAmount: receiptPayload.changeAmount ?? match.changeAmount,
                    notes: receiptPayload.notes ?? match.notes,
                  }
                : match;
            order.amountReceived = this.num(
              merged.amountReceived ?? order.amountReceived
            );
            if (this.num(merged.totalAmount) > 0) {
              order.saleTotalAmount = this.num(merged.totalAmount);
            }
            this.openSoldDocumentModal(order, docType, merged);
            return;
          }
          tryNext(index + 1);
        },
        error: () => tryNext(index + 1),
      });
    };
    tryNext(0);
  }

  formatOrderPaymentAmount(row: any): string {
    return this.formatSoldMoney(
      this.num(row?.amountToPay ?? row?.amount_to_pay ?? row?.amount ?? 0)
    );
  }

  formatOrderPaymentDate(row: any): string {
    const d = String(row?.dateOfPayment ?? row?.date_of_payment ?? '').trim();
    const t = String(row?.timeOfPayment ?? row?.time_of_payment ?? '').trim();
    if (d && t) {
      return `${d} · ${t.length > 8 ? t.slice(0, 8) : t}`;
    }
    return d || t || '—';
  }

  get historyOrderCount(): number {
    return this.filteredSoldOrders().length;
  }

  get historyTotalProfit(): number {
    return this.historyTotalSell - this.historyTotalCost;
  }

  isMdUser(): boolean {
    const role = (this.userRole || sessionStorage.getItem('userrole') || '')
      .toString()
      .toLowerCase()
      .trim();
    return role === 'md';
  }

  /** Profit on Products sold summary — MD only when component access allows. */
  get canViewSoldHistoryProfit(): boolean {
    return this.isMdUser() && this.canViewSoldSummaryFooter() && this.canViewPharmacyCostColumns();
  }

  /** Unit cost, TT cost, and total cost fields across pharmacy tabs and modals. */
  canViewPharmacyCostColumns(): boolean {
    return this.accessControl.canViewPageComponent('otc-dispensary', 'cost-columns');
  }

  /** Cost / TT cost columns in sell details popup. */
  canViewSoldOrderModalCostColumns(order: PharmacySoldOrder | null | undefined): boolean {
    return this.canViewPharmacyCostColumns();
  }

  /** Footer row in sell details popup when any financial column is visible. */
  canViewSoldOrderModalFooter(order: PharmacySoldOrder | null | undefined): boolean {
    return this.canViewSoldOrderModalCostColumns(order) || this.canViewSoldOrderModalFinancials(order);
  }

  /** Lower totals bar on Products sold tab. */
  canViewSoldSummaryFooter(): boolean {
    return this.accessControl.canViewPageComponent('otc-dispensary', 'sold-summary-footer');
  }

  /** Total cost / total sell columns in sold orders table. */
  canViewSoldTableCostSell(): boolean {
    return this.accessControl.canViewPageComponent('otc-dispensary', 'sold-table-cost-sell');
  }

  /** Cost/sell/total fields in sell details popup (respects 5+ hour rule when frozen). */
  canViewSoldOrderModalFinancials(order: PharmacySoldOrder | null | undefined): boolean {
    if (!order) {
      return false;
    }
    return this.accessControl.canViewPageComponent('otc-dispensary', 'sold-order-modal-financials', {
      orderAgeHours: this.soldOrderAgeHours(order),
    });
  }

  soldOrderAgeHours(order: PharmacySoldOrder): number {
    const when = this.parseSoldOrderDate(order);
    if (!when) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.max(0, (Date.now() - when.getTime()) / (1000 * 60 * 60));
  }

  private parseSoldOrderDate(order: PharmacySoldOrder): Date | null {
    const datePart = (order.visitDate || '').trim();
    if (!datePart) {
      return null;
    }
    const timePart = (order.visitTime || '').trim();
    const combined = timePart ? `${datePart} ${timePart}` : datePart;
    const parsed = new Date(combined);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
    const isoTry = new Date(`${datePart}T${timePart || '00:00:00'}`);
    return Number.isNaN(isoTry.getTime()) ? null : isoTry;
  }

  /** Delete sold line — MD only. */
  get canDeleteSoldLine(): boolean {
    return this.isMdUser();
  }

  get otcIncludePrescribing(): boolean {
    // Business POS: prescription fields disabled.
    return false;
  }

  onOtcPrescriptionFieldsToggle(_enabled: boolean): void {
    this.otcSaleMode = 'simple';
  }

  givenCartLines(): OtcCartLine[] {
    return this.otcOnlyCart.filter((line) => line.given);
  }

  get cartSubtotal(): number {
    const raw = this.givenCartLines().reduce((sum, line) => sum + this.cartLineAmount(line), 0);
    return raw > 0 ? roundUgxMoney(raw) : 0;
  }

  get cartGrossSubtotal(): number {
    const raw = this.givenCartLines().reduce((sum, line) => sum + this.cartLineGrossAmount(line), 0);
    return raw > 0 ? roundUgxMoney(raw) : 0;
  }

  get cartDiscountTotal(): number {
    const raw = this.givenCartLines().reduce((sum, line) => sum + this.cartLineDiscountAmount(line), 0);
    return raw > 0 ? roundUgxMoney(raw) : 0;
  }

  /**
   * Overall order discount (POS totals Discount column).
   * Product-level discounts stay on cart lines; this is cart-wide only.
   */
  overallDiscountAmount = 0;

  /** Uganda VAT-style rate applied on every POS receipt / payable total. */
  posTaxRatePercent = 18;
  posTaxType: 'VAT' | 'Sales Tax' | 'None' = 'VAT';

  /** Taxable base after line discounts and overall discount. */
  get cartTaxableBase(): number {
    return Math.max(0, roundUgxMoney(this.cartSubtotal - this.cartOverallDiscount));
  }

  /** Overall discount capped to cart subtotal (after line discounts). */
  get cartOverallDiscount(): number {
    const raw = Math.max(0, Number(this.overallDiscountAmount) || 0);
    if (raw <= 0) {
      return 0;
    }
    return Math.min(this.cartSubtotal, roundUgxMoney(raw));
  }

  get cartTax(): number {
    return this.computeTaxOnBase(this.cartTaxableBase, this.posTaxRatePercent, this.posTaxType);
  }

  /** Amount due including tax, after overall discount. */
  get cartPayableTotal(): number {
    return roundUgxMoney(this.cartTaxableBase + this.cartTax);
  }

  private computeTaxOnBase(
    base: number,
    ratePercent: number,
    taxType: 'VAT' | 'Sales Tax' | 'None'
  ): number {
    if (taxType === 'None' || base <= 0) {
      return 0;
    }
    const rate = Math.max(0, Number(ratePercent) || 0);
    if (rate <= 0) {
      return 0;
    }
    return roundUgxMoney((base * rate) / 100);
  }

  get changeDue(): number {
    const received = this.amountReceived ?? 0;
    return Math.max(0, received - this.cartPayableTotal);
  }

  /** Remainder still owed on Current Order (edit or partial tender). */
  get cartAmountDue(): number {
    const total = this.cartPayableTotal;
    const received = Math.max(0, this.num(this.amountReceived));
    return Math.max(0, roundUgxMoney(total - received));
  }

  get hasBillableCartLines(): boolean {
    return this.givenCartLines().length > 0;
  }

  get otcOnlyCart(): OtcCartLine[] {
    return this.cart.filter((c) => c.lineSource === 'OTC');
  }

  get prescriptionSubtotal(): number {
    const raw = this.dispensablePrescriptionRows()
      .reduce((sum, row) => sum + this.prescriptionLineAmount(row), 0);
    return raw > 0 ? roundUgxMoney(raw) : 0;
  }

  get prescriptionChangeDue(): number {
    const received = this.rxAmountReceived ?? 0;
    return Math.max(0, received - this.prescriptionSubtotal);
  }

  get hasBillablePrescriptionLines(): boolean {
    return this.canCompletePrescriptionSale;
  }

  /** True when the selected visit can be finalized (in-stock lines with qty ready to dispense). */
  get canCompletePrescriptionSale(): boolean {
    const allRows = this.selectedPrescriptionRows();
    if (
      this.selectedPrescriptionVisitId == null ||
      !allRows.length ||
      this.isPrescriptionVisitSaleDone(this.selectedPrescriptionVisitId)
    ) {
      return false;
    }
    const billable = this.dispensablePrescriptionRows();
    if (billable.length) {
      return (
        this.prescriptionSubtotal > 0 &&
        billable.every(
          (row) => row.quantity > 0 && !this.prescriptionQtyExceedsStock(row)
        )
      );
    }
    return allRows.every((row) => this.prescriptionItemTotalStock(row) <= 0);
  }

  /** In-stock prescription lines ready to dispense (DSP is set by the dispense buttons). */
  dispensablePrescriptionRows(): DoctorPrescriptionRow[] {
    return this.selectedPrescriptionRows().filter(
      (r) =>
        r.id > 0 &&
        this.num(r.quantity) > 0 &&
        r.dispensed !== true &&
        !this.isPrescriptionStatusGiven(r.status) &&
        (this.isSundryPrescriptionRow(r) || this.prescriptionItemTotalStock(r) > 0)
    );
  }

  isSundryPrescriptionRow(row: DoctorPrescriptionRow | null | undefined): boolean {
    if (!row) {
      return false;
    }
    return (
      row.lineKind === 'SUNDRY' ||
      (row.visitSundryId != null && row.visitSundryId > 0) ||
      String(row.route || '').toUpperCase() === 'SUNDRY'
    );
  }

  prescriptionRowKey(row: DoctorPrescriptionRow): string {
    return this.isSundryPrescriptionRow(row)
      ? `sundry-${row.visitSundryId || row.id}`
      : `rx-${row.id}`;
  }

  private samePrescriptionRow(a: DoctorPrescriptionRow, b: DoctorPrescriptionRow): boolean {
    return this.prescriptionRowKey(a) === this.prescriptionRowKey(b);
  }

  get rxTabIncludePrescribing(): boolean {
    return (
      this.otcIncludePrescribing ||
      this.selectedPrescriptionRows().some((r) => this.prescriptionRowHasPrescribing(r))
    );
  }

  groupedPrescriptionVisits(): {
    visitId: number;
    visitNumber: number;
    clientName: string;
    visitDate: string;
    visitTime: string;
    rows: DoctorPrescriptionRow[];
  }[] {
    const map = new Map<number, {
      visitId: number;
      visitNumber: number;
      clientName: string;
      visitDate: string;
      visitTime: string;
      rows: DoctorPrescriptionRow[];
    }>();
    for (const row of this.doctorPrescriptionRows) {
      let group = map.get(row.visitId);
      if (!group) {
        group = {
          visitId: row.visitId,
          visitNumber: row.visitNumber,
          clientName: row.clientName,
          visitDate: row.visitDate,
          visitTime: row.visitTime,
          rows: [],
        };
        map.set(row.visitId, group);
      }
      group.rows.push(row);
    }
    return Array.from(map.values()).sort((a, b) => {
      const da = `${a.visitDate} ${a.visitTime}`;
      const db = `${b.visitDate} ${b.visitTime}`;
      return db.localeCompare(da);
    });
  }

  isPrescriptionVisitSaleDone(visitId: number | null | undefined): boolean {
    return visitId != null && this.completedPrescriptionVisitIds.has(visitId);
  }

  /** Visit order status for the prescriptions queue table. */
  prescriptionVisitOrderStatus(
    group: { visitId: number; rows: DoctorPrescriptionRow[] }
  ): 'done' | 'pending' {
    return this.isPrescriptionVisitSaleDone(group.visitId) ? 'done' : 'pending';
  }

  prescriptionVisitOrderStatusLabel(
    group: { visitId: number; rows: DoctorPrescriptionRow[] }
  ): string {
    return this.prescriptionVisitOrderStatus(group) === 'done' ? 'Done' : 'Pending';
  }

  prescriptionVisitOrderStatusClass(
    group: { visitId: number; rows: DoctorPrescriptionRow[] }
  ): string {
    return this.prescriptionVisitOrderStatus(group) === 'done'
      ? 'otc-rx-order-status otc-rx-order-status--done'
      : 'otc-rx-order-status otc-rx-order-status--pending';
  }

  prescriptionRowOutOfStock(row: DoctorPrescriptionRow): boolean {
    return this.prescriptionItemTotalStock(row) <= 0;
  }

  prescriptionRowStatusLabel(row: DoctorPrescriptionRow): string {
    if (row.given) {
      return 'Given';
    }
    if (this.prescriptionRowOutOfStock(row)) {
      return 'Not given · Out of stock';
    }
    return row.status || 'Not given';
  }

  onPrescriptionGivenChange(row: DoctorPrescriptionRow, checked: boolean): void {
    this.onPrescriptionPdDspAdmChange(row, 'dispensed', checked);
  }

  prescriptionRowsEligibleForDispense(): DoctorPrescriptionRow[] {
    return this.selectedPrescriptionDetailRows.filter(
      (row) => row.id > 0 && this.prescriptionItemTotalStock(row) > 0
    );
  }

  allPrescriptionDispensedSelected(): boolean {
    const eligible = this.prescriptionRowsEligibleForDispense();
    return eligible.length > 0 && eligible.every((row) => row.dispensed === true);
  }

  somePrescriptionDispensedSelected(): boolean {
    const eligible = this.prescriptionRowsEligibleForDispense();
    return eligible.some((row) => row.dispensed === true);
  }

  canToggleAllPrescriptionDispensed(): boolean {
    return (
      !this.processing &&
      this.selectedPrescriptionVisitId != null &&
      !this.isPrescriptionVisitSaleDone(this.selectedPrescriptionVisitId) &&
      this.prescriptionRowsEligibleForDispense().length > 0
    );
  }

  toggleAllPrescriptionDispensed(checked: boolean): void {
    if (!this.canToggleAllPrescriptionDispensed()) {
      return;
    }
    for (const row of this.prescriptionRowsEligibleForDispense()) {
      if ((row.dispensed === true) !== checked) {
        this.onPrescriptionPdDspAdmChange(row, 'dispensed', checked);
      }
    }
    this.cdr.detectChanges();
  }

  onPrescriptionPdDspAdmChange(
    row: DoctorPrescriptionRow,
    flag: TreatmentLifecycleFlag,
    checked: boolean
  ): void {
    if (!row?.id) {
      return;
    }
    if (flag === 'dispensed' && checked && this.prescriptionItemTotalStock(row) <= 0) {
      row.dispensed = false;
      this.flashStatus(
        `${row.itemName} is out of stock and cannot be marked dispensed.`,
        true
      );
      return;
    }
    const previous = {
      paid: row.paid !== false,
      dispensed: row.dispensed === true,
      administered: row.administered === true,
      given: row.given,
      status: row.status,
    };
    const prevSubtotal = this.prescriptionSubtotal;
    (row as any)[flag] = checked;
    if (flag === 'paid') {
      row.given = checked;
      row.paid = checked;
    }
    if (flag === 'dispensed' && checked) {
      row.paid = true;
      row.given = true;
      row.status = 'dispensed';
    }
    if (flag === 'dispensed' && !checked) {
      row.status = 'pending';
    }
    const cartLine = this.cart.find(
      (c) => c.lineSource === 'RX' && c.treatmentRequestedId === row.id
    );
    if (cartLine && flag === 'paid') {
      const prevPayable = this.cartPayableTotal;
      cartLine.given = checked;
      this.syncAmountReceivedToSubtotal(prevPayable);
    }
    this.syncRxAmountReceivedToSubtotal(prevSubtotal);
    this.api.updateTreatmentLifecycleFlags(row.id, treatmentLifecyclePatch(flag, checked)).subscribe({
      next: (dto) => {
        if (dto && typeof dto === 'object') {
          applyTreatmentLifecycleFlags(Object.assign(row, dto));
        }
      },
      error: () => {
        row.paid = previous.paid;
        row.dispensed = previous.dispensed;
        row.administered = previous.administered;
        row.given = previous.given;
        row.status = previous.status;
        this.syncRxAmountReceivedToSubtotal();
      },
    });
  }

  onCartGivenChange(line: OtcCartLine, checked: boolean): void {
    const prevPayable = this.cartPayableTotal;
    line.given = checked;
    if (line.lineSource === 'RX' && line.treatmentRequestedId) {
      const rx = this.doctorPrescriptionRows.find((r) => r.id === line.treatmentRequestedId);
      if (rx) {
        rx.given = checked;
        this.syncRxAmountReceivedToSubtotal(this.prescriptionSubtotal);
      }
    }
    this.syncAmountReceivedToSubtotal(prevPayable);
  }

  /** Billable sell amount for a prescription row (qty × unit sell price). */
  prescriptionLineAmount(row: DoctorPrescriptionRow): number {
    return this.num(row.quantity) * this.num(row.unitSellingPrice);
  }

  /** Total stock for this drug (stock batches or shop products, per facility setting). */
  prescriptionItemTotalStock(row: DoctorPrescriptionRow): number {
    if (this.isSundryPrescriptionRow(row)) {
      // Stock already deducted when the sundry was recorded.
      return Math.max(this.num(row.quantity), this.num(row.prescribedQuantity), 1);
    }
    return getPharmacyItemTotalStock(row, this.itemList);
  }

  onPrescriptionQuantityChange(row: DoctorPrescriptionRow, raw: string | number): void {
    if (this.isSundryPrescriptionRow(row)) {
      return;
    }
    const prevSubtotal = this.prescriptionSubtotal;
    const qty = Math.max(0, Math.floor(Number(raw) || 0));
    row.quantity = qty;
    row.totalAmount = qty * this.num(row.unitSellingPrice);
    const cartLine = this.cart.find(
      (line) => line.lineSource === 'RX' && line.treatmentRequestedId === row.id
    );
    if (cartLine) {
      cartLine.quantity = qty;
      cartLine.totalAmount = row.totalAmount;
      cartLine.totalUnits = qty;
    }
    this.syncRxAmountReceivedToSubtotal(prevSubtotal);
    this.schedulePrescriptionQuantityPersist(row);
  }

  /** Persist qty to treatmentrequested and refresh visit balance/totals. */
  private schedulePrescriptionQuantityPersist(row: DoctorPrescriptionRow): void {
    if (!row?.id || this.isSundryPrescriptionRow(row)) {
      return;
    }
    const existing = this.rxQtyPersistTimers.get(row.id);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      this.rxQtyPersistTimers.delete(row.id);
      this.persistPrescriptionQuantity(row);
    }, 400);
    this.rxQtyPersistTimers.set(row.id, timer);
  }

  private persistPrescriptionQuantity(row: DoctorPrescriptionRow): void {
    const qty = Math.max(0, Math.floor(Number(row.quantity) || 0));
    if (qty <= 0) {
      return;
    }
    if (!row.stockBatchId && !row.itemId) {
      this.flashStatus('Cannot update quantity: drug batch/item is missing.', true);
      return;
    }
    const payload: Record<string, unknown> = {
      quantity: qty,
      totalUnits: qty,
      visitId: row.visitId,
      amountPerFrequencyValue: row.amountPerFrequencyValue ?? 0,
      amountPerFrequencyUnit: row.amountPerFrequencyUnit || '',
      frequencyValue: row.frequencyValue ?? 0,
      durationValue: row.durationValue ?? 0,
      instructions: row.instructions || '',
      route: row.route || '',
    };
    if (row.stockBatchId) {
      payload['stockBatchId'] = row.stockBatchId;
    }
    if (row.itemId) {
      payload['itemId'] = row.itemId;
    }
    this.api.updateTreatment(row.id, payload).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        if (data?.totalAmount != null) {
          row.totalAmount = this.num(data.totalAmount);
        }
        if (data?.quantity != null) {
          row.quantity = this.num(data.quantity);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          err?.message ||
          'Could not update prescription quantity on the visit.';
        this.flashStatus(String(msg), true);
      },
    });
  }

  prescriptionQtyExceedsStock(row: DoctorPrescriptionRow): boolean {
    if (row.quantity <= 0) {
      return false;
    }
    const available = this.prescriptionItemTotalStock(row);
    return row.quantity > available;
  }

  cartLineGrossAmount(line: OtcCartLine): number {
    return Math.max(0, (Number(line.quantity) || 0) * (Number(line.unitSellingPrice) || 0));
  }

  cartLineDiscountAmount(line: OtcCartLine): number {
    return Math.max(0, Math.min(this.cartLineGrossAmount(line), Number(line.discountAmount) || 0));
  }

  cartLineAmount(line: OtcCartLine): number {
    return Math.max(0, this.cartLineGrossAmount(line) - this.cartLineDiscountAmount(line));
  }

  /** Keep line.totalAmount in sync with qty / price / discount. */
  private refreshCartLineTotals(line: OtcCartLine): void {
    const gross = this.cartLineGrossAmount(line);
    const discount = Math.max(0, Math.min(gross, Number(line.discountAmount) || 0));
    line.discountAmount = discount;
    if (discount <= 0) {
      line.discountMode = 'none';
      line.discountInput = 0;
    }
    line.totalAmount = Math.max(0, gross - discount);
  }

  private syncRxAmountReceivedToSubtotal(previousSubtotal?: number): void {
    const total = this.prescriptionSubtotal;
    if (
      this.rxAmountReceived == null ||
      (previousSubtotal != null && this.rxAmountReceived === previousSubtotal)
    ) {
      this.rxAmountReceived = total > 0 ? total : null;
    }
  }

  /** Keep amount received aligned with total due on OTC counter.
   * When editing an existing receipt/document, keep the original paid amount so
   * added products become amount due instead of forcing a full re-tender.
   */
  private syncAmountReceivedToSubtotal(previousPayable?: number): void {
    if (this.isEditingSoldDocument) {
      return;
    }
    const total = this.cartPayableTotal;
    if (
      this.amountReceived == null ||
      (previousPayable != null &&
        Math.abs(this.num(this.amountReceived) - this.num(previousPayable)) < 0.01)
    ) {
      this.amountReceived = total > 0 ? total : null;
    }
  }

  /** Force amount received to match current payable (payment step / after cart changes). */
  private forceAmountReceivedToPayable(): void {
    if (this.isEditingSoldDocument) {
      return;
    }
    const total = this.cartPayableTotal;
    this.amountReceived = total > 0 ? total : null;
  }

  private buildReceiptMoneyBreakdown(netSubtotal: number): {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  } {
    const subtotal = netSubtotal > 0 ? roundUgxMoney(netSubtotal) : 0;
    const discount = Math.max(
      0,
      Math.min(subtotal, roundUgxMoney(this.overallDiscountAmount || 0))
    );
    const taxable = Math.max(0, roundUgxMoney(subtotal - discount));
    const tax = this.computeTaxOnBase(taxable, this.posTaxRatePercent, this.posTaxType);
    return {
      subtotal,
      discount,
      tax,
      total: roundUgxMoney(taxable + tax),
    };
  }

  prescriptionRowHasPrescribing(row: DoctorPrescriptionRow): boolean {
    const dosage = String(row.dosage ?? '').trim();
    if (dosage && dosage !== '—' && dosage !== '0') {
      return true;
    }
    if (
      hasPrescribingNumericValue(row.amountPerFrequencyValue) &&
      String(row.amountPerFrequencyUnit ?? '').trim()
    ) {
      return true;
    }
    if (hasPrescribingNumericValue(row.frequencyValue)) {
      return true;
    }
    if (hasPrescribingNumericValue(row.durationValue)) {
      return true;
    }
    return false;
  }

  /** Cap quantity by stock. Do not change PD / DSP / ADM flags. */
  private applyPrescriptionStockAvailability(rows: DoctorPrescriptionRow[]): void {
    for (const row of rows) {
      if (row.dispensed === true || this.isPrescriptionStatusGiven(row.status)) {
        continue;
      }
      const prescribed =
        row.prescribedQuantity > 0 ? row.prescribedQuantity : Math.max(0, row.quantity);
      if (row.prescribedQuantity <= 0) {
        row.prescribedQuantity = prescribed;
      }

      const stock = this.prescriptionItemTotalStock(row);
      if (stock > 0) {
        const targetQty = prescribed > 0 ? prescribed : 1;
        row.quantity = Math.min(targetQty, stock);
      } else {
        row.quantity = prescribed;
      }
      row.totalAmount = this.num(row.quantity) * this.num(row.unitSellingPrice);
    }
  }

  private prescriptionRowsToCartSnapshot(rows: DoctorPrescriptionRow[]): OtcCartLine[] {
    return rows.map((row) => {
      const freqUnit = this.parseRxFrequencyUnit(row.frequencyUnit);
      const durUnit = this.parseRxFrequencyUnit(row.durationUnit);
      const line: OtcCartLine = {
        cartLineKey: `rx-${row.id}`,
        lineSource: 'RX',
        given: row.given,
        treatmentRequestedId: row.id,
        visitId: row.visitId,
        clientId: row.clientId,
        clientName: row.clientName,
        stockBatchId: row.stockBatchId ?? null,
        itemId: row.itemId ?? 0,
        itemName: row.itemName,
        amountPerFrequencyValue: row.amountPerFrequencyValue,
        amountPerFrequencyUnit: String(row.amountPerFrequencyUnit ?? ''),
        frequencyValue: row.frequencyValue,
        frequencyUnit: freqUnit,
        durationValue: row.durationValue,
        durationUnit: durUnit,
        quantity: row.quantity,
        totalUnits: row.totalUnits,
        unitBuy: row.unitBuy,
        unitSellingPrice: row.unitSellingPrice,
        totalAmount: row.given ? row.totalAmount : 0,
        discountAmount: 0,
        discountMode: 'none',
        discountInput: 0,
        instructions: row.instructions || '',
        route: row.route || '',
        stockAtHand: this.prescriptionItemTotalStock(row),
      };
      return line;
    });
  }

  private parseRxFrequencyUnit(unit: string | number | null): number | null {
    const n = Number(unit);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  cartLineHasPrescribing(line: OtcCartLine): boolean {
    if (
      hasPrescribingNumericValue(line.amountPerFrequencyValue) &&
      String(line.amountPerFrequencyUnit ?? '').trim()
    ) {
      return true;
    }
    if (hasPrescribingNumericValue(line.frequencyValue)) {
      return true;
    }
    if (hasPrescribingNumericValue(line.durationValue)) {
      return true;
    }
    return false;
  }

  /** Qty badge label for stock batch dropdown rows. */
  stockBatchQtyLabel(item: { stockAtHand?: number; uintOfMeasure?: string; unitOfMeasure?: string }): string {
    const qty = Number(item?.stockAtHand ?? 0);
    const uom = String(item?.uintOfMeasure ?? item?.unitOfMeasure ?? '').trim();
    return this.stockBatchQtyBadge(qty, uom);
  }

  stockBatchQtyBadge(qty: number, uom?: string): string {
    const unit = String(uom ?? '').trim();
    return unit ? `Qty: ${qty} ${unit}` : `Qty: ${qty}`;
  }

  /** True when a store chip on a batch line can be selected for sale. */
  distHasSelectableStock(dist: { item?: any | null }): boolean {
    return !!dist?.item && Number(dist.item.stockAtHand ?? 0) > 0;
  }

  /** Batch line is sellable when combined stock across stores is greater than zero. */
  batchLineHasStock(line: { totalStock?: number }): boolean {
    return Number(line?.totalStock ?? 0) > 0;
  }

  private batchLineTotalStock(distributions: any[]): number {
    return distributions.reduce((sum, row) => sum + Number(row?.stockAtHand ?? 0), 0);
  }

  /** Combined stock for the same item + batch across all stores. */
  batchLineTotalForItem(item: any): number {
    if (!item) {
      return 0;
    }
    const itemKey = String(item.stockItemId ?? item.stockItemName ?? item.id ?? '').trim();
    if (!itemKey) {
      return Number(item.stockAtHand ?? 0);
    }
    return this.itemList
      .filter((row) => {
        const rowKey = String(row.stockItemId ?? row.stockItemName ?? row.id ?? '').trim();
        return rowKey === itemKey && this.stockBatchLineKey(itemKey, row) === this.stockBatchLineKey(itemKey, item);
      })
      .reduce((sum, row) => sum + Number(row?.stockAtHand ?? 0), 0);
  }

  private availableStockForCartLine(line: OtcCartLine): number {
    if (line.stockBatchId != null && line.stockBatchId > 0) {
      const batch = this.itemList.find((row) => row._stockBatchId === line.stockBatchId);
      if (!batch) {
        return Number(line.stockAtHand ?? 0);
      }
      return this.batchLineTotalForItem(batch);
    }
    const item = this.itemList.find((row) => Number(row?.id) === Number(line.itemId));
    return Number(item?.stockAtHand ?? line.stockAtHand ?? 0);
  }

  formatBatchMoney(amount: number | null | undefined): string {
    return formatMoneyWholeDisplay(amount ?? 0);
  }

  /** Expiry badge: red under 1y, yellow 1–2y, green 2y+ (calendar years). */
  batchExpiryToneClass(tone: string): string {
    if (tone === 'danger') {
      return 'otc-stock-batch-expiry--danger';
    }
    if (tone === 'warning') {
      return 'otc-stock-batch-expiry--warning';
    }
    if (tone === 'safe') {
      return 'otc-stock-batch-expiry--safe';
    }
    return 'otc-stock-batch-expiry--unknown';
  }

  filteredItemList(): any[] {
    if (!Array.isArray(this.itemList)) {
      return [];
    }

    let filteredItemList = [...this.itemList];

    if (this.searchText && this.searchText.trim()) {
      const q = this.searchText.toLowerCase().trim();
      filteredItemList = filteredItemList.filter((item) => {
        const blob = [
          item?.title,
          item?.name,
          item?.stockItemName,
          item?.itemName,
          item?.storeName,
          item?.store?.name,
          item?.batchNumber != null ? String(item.batchNumber) : '',
          item?._stockBatchId != null ? String(item._stockBatchId) : '',
          item?.id != null ? String(item.id) : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      });
    }

    return filteredItemList.sort(
      (a, b) =>
        (b?._stockBatchId ?? b?.id ?? 0) - (a?._stockBatchId ?? a?.id ?? 0)
    );
  }

  /** Rebuild grouped dropdown rows when item list or search filter changes. */
  refreshGroupedStockItems(): void {
    type StoreDist = {
      storeId: number;
      storeName: string;
      qtyLabel: string;
      storeLabel: string;
      item: any | null;
    };
    type BatchLine = {
      batchKey: string;
      batchLabel: string;
      distributions: any[];
      storeDistribution: StoreDist[];
    };
    type ItemGroup = { itemKey: string; stockItemName: string; batchLineMap: Map<string, BatchLine> };
    const itemMap = new Map<string, ItemGroup>();

    for (const batch of this.filteredItemList()) {
      const itemKey = String(batch.stockItemId ?? batch.stockItemName ?? batch.id ?? '').trim();
      if (!itemKey) {
        continue;
      }
      let group = itemMap.get(itemKey);
      if (!group) {
        group = {
          itemKey,
          stockItemName: String(batch.stockItemName ?? this.plainDrugName(batch)).trim(),
          batchLineMap: new Map<string, BatchLine>(),
        };
        itemMap.set(itemKey, group);
      }

      const batchKey = this.stockBatchLineKey(itemKey, batch);
      let line = group.batchLineMap.get(batchKey);
      if (!line) {
        line = {
          batchKey,
          batchLabel: String(
            batch.batchLabel ?? `Batch ${batch.batchNumber ?? batch._stockBatchId ?? '?'}`
          ).trim(),
          distributions: [],
          storeDistribution: [],
        };
        group.batchLineMap.set(batchKey, line);
      }
      line.distributions.push(batch);
    }

    this.groupedStockItems = Array.from(itemMap.values())
      .map((group) => {
        const batchLines = Array.from(group.batchLineMap.values())
          .map((line) => {
            const expiry = this.batchLineExpiryInfo(line.distributions);
            const pricing = extractBatchLinePricing(line.distributions);
            return {
              batchKey: line.batchKey,
              batchLabel: line.batchLabel,
              expiryLabel: expiry.label,
              expiryTone: expiry.tone,
              totalStock: this.batchLineTotalStock(line.distributions),
              unitCost: pricing.unitCost,
              sellingModels: pricing.sellingModels,
              storeDistribution: this.buildBatchStoreDistribution(line.distributions),
            };
          })
          .sort((a, b) => {
            // In-stock first, then by batch label
            if ((b.totalStock > 0) !== (a.totalStock > 0)) {
              return b.totalStock > 0 ? 1 : -1;
            }
            return a.batchLabel.localeCompare(b.batchLabel, undefined, { sensitivity: 'base', numeric: true });
          });
        return {
          itemKey: group.itemKey,
          stockItemName: group.stockItemName,
          completelyOutOfStock: batchLines.every((line) => this.num(line.totalStock) <= 0),
          batchLines,
        };
      })
      .sort((a, b) =>
        a.stockItemName.localeCompare(b.stockItemName, undefined, { sensitivity: 'base' })
      );
  }

  groupedStockItemList(): typeof this.groupedStockItems {
    return this.groupedStockItems;
  }

  trackGroupedStockItem(_index: number, group: { itemKey: string }): string {
    return group.itemKey;
  }

  private buildBatchStoreDistribution(distributions: any[]): {
    storeId: number;
    storeName: string;
    qtyLabel: string;
    storeLabel: string;
    item: any | null;
  }[] {
    const byStoreId = new Map<number, any>();
    for (const row of distributions) {
      const sid = Number(row?.storeId);
      if (!Number.isFinite(sid) || sid <= 0) {
        continue;
      }
      const existing = byStoreId.get(sid);
      const qty = Number(row?.stockAtHand ?? 0);
      // Keep a row even when qty is 0 so out-of-stock products still have a selectable sourceItem.
      if (!existing || qty > Number(existing?.stockAtHand ?? 0)) {
        byStoreId.set(sid, row);
      }
    }
    // No store-tagged rows — still expose the first batch distribution so OOS cards work.
    if (!byStoreId.size && distributions.length) {
      const row = distributions[0];
      const sid = Number(row?.storeId ?? 0) || 0;
      byStoreId.set(sid > 0 ? sid : -1, row);
    }
    const defaultUom = String(
      distributions[0]?.uintOfMeasure ?? distributions[0]?.unitOfMeasure ?? 'unit'
    ).trim();

    return Array.from(byStoreId.values())
      .map((item) => {
        const storeId = Number(item.storeId) || 0;
        const storeName = String(item.storeName ?? (storeId > 0 ? `Store #${storeId}` : 'Store')).trim();
        const qty = Number(item.stockAtHand ?? 0);
        const uom = String(item.uintOfMeasure ?? item.unitOfMeasure ?? defaultUom).trim();
        const qtyLabel = this.stockBatchQtyBadge(qty, uom);
        return {
          storeId,
          storeName,
          qtyLabel,
          storeLabel: `${storeName} ${qtyLabel}`,
          item,
        };
      })
      .sort((a, b) => a.storeName.localeCompare(b.storeName, undefined, { sensitivity: 'base' }));
  }

  private stockBatchLineKey(itemKey: string, batch: any): string {
    const batchNumber = String(batch.batchNumber ?? '').trim();
    if (batchNumber) {
      return `${itemKey}::bn:${batchNumber}`;
    }
    return `${itemKey}::id:${batch._stockBatchId ?? batch.id ?? ''}`;
  }

  loadPharmacyStock(): void {
    this.isLoadingDrugList = true;
    if (!this.pharmacyUseStockBatch) {
      forkJoin({
        items: this.api.getAllItems().pipe(catchError(() => of([]))),
        stockItems: this.api.getAllStockItems().pipe(
          map((res: any) => this.normalizeList(res)),
          catchError(() => of([]))
        ),
      }).subscribe({
        next: ({ items, stockItems }: { items: any; stockItems: any[] }) => {
          this.itemList = Array.isArray(items) ? items : [];
          this.allStockBatchesCache = [];
          this.allStockItemsCache = Array.isArray(stockItems) ? stockItems : [];
          this.groupedStockItems = [];
          this.rebuildPosStockItemImageCache(stockItems, this.itemList);
          this.isLoadingDrugList = false;
          if (this.doctorPrescriptionRows.length) {
            this.applyPrescriptionStockAvailability(this.doctorPrescriptionRows);
            if (this.selectedPrescriptionVisitId != null) {
              this.syncRxAmountReceivedToSubtotal();
            }
          }
        },
        error: () => {
          this.isLoadingDrugList = false;
          this.itemList = [];
          this.allStockBatchesCache = [];
          this.allStockItemsCache = [];
          this.groupedStockItems = [];
          this.flashStatus('Could not load pharmacy items.', true);
        },
      });
      return;
    }

    forkJoin({
      stores: this.api.getAllStores().pipe(
        map((res: any) => this.normalizeList(res)),
        catchError(() => of([]))
      ),
      batches: this.api.getAllStockBatches().pipe(
        map((res: any) => this.normalizeList(res)),
        catchError(() => of([]))
      ),
      stockItems: this.api.getAllStockItems().pipe(
        map((res: any) => this.normalizeList(res)),
        catchError(() => of([]))
      ),
    }).subscribe({
      next: ({ stores, batches, stockItems }: { stores: any[]; batches: any[]; stockItems: any[] }) => {
        const pharmacy = this.resolvePharmacyStore(stores);
        this.pharmacyStoreId = pharmacy.id;
        this.pharmacyStoreName = pharmacy.name;
        this.storeList = stores;
        this.allStockBatchesCache = batches;
        this.allStockItemsCache = Array.isArray(stockItems) ? stockItems : [];
        this.itemList = batches.map((batch: any) =>
          this.mapStockBatchToTreatmentDropdownItem(batch)
        );
        this.rebuildPosStockItemImageCache(stockItems, this.itemList);
        this.isLoadingDrugList = false;
        this.refreshGroupedStockItems();
        if (this.doctorPrescriptionRows.length) {
          this.applyPrescriptionStockAvailability(this.doctorPrescriptionRows);
          if (this.selectedPrescriptionVisitId != null) {
            this.syncRxAmountReceivedToSubtotal();
          }
        }
      },
      error: () => {
        this.isLoadingDrugList = false;
        this.itemList = [];
        this.allStockBatchesCache = [];
        this.allStockItemsCache = [];
        this.groupedStockItems = [];
        this.storeList = [];
        this.flashStatus('Could not load pharmacy stock.', true);
      },
    });
  }

  private rebuildPosStockItemImageCache(stockItems: any[], fallbackRows: any[] = []): void {
    const next = new Map<
      number,
      {
        image: string | null;
        image2: string | null;
        image3: string | null;
        imageLocal: string | null;
        imageLocal2: string | null;
        imageLocal3: string | null;
        description: string | null;
      }
    >();
    const put = (rawId: any, row: any) => {
      const id = Number(rawId);
      if (!Number.isFinite(id) || id <= 0 || !row) {
        return;
      }
      const image = String(row.image || row.imageUrl || row.image_url || '').trim() || null;
      const image2 = String(row.image2 || '').trim() || null;
      const image3 = String(row.image3 || '').trim() || null;
      const imageLocal = String(row.imageLocal || row.image_local || '').trim() || null;
      const imageLocal2 = String(row.imageLocal2 || row.image_local2 || '').trim() || null;
      const imageLocal3 = String(row.imageLocal3 || row.image_local3 || '').trim() || null;
      const description = String(row.description || '').trim() || null;
      if (!image && !image2 && !image3 && !imageLocal && !imageLocal2 && !imageLocal3 && !description) {
        return;
      }
      const prev = next.get(id);
      next.set(id, {
        image: image || prev?.image || null,
        image2: image2 || prev?.image2 || null,
        image3: image3 || prev?.image3 || null,
        imageLocal: imageLocal || prev?.imageLocal || null,
        imageLocal2: imageLocal2 || prev?.imageLocal2 || null,
        imageLocal3: imageLocal3 || prev?.imageLocal3 || null,
        description: description || prev?.description || null,
      });
    };
    for (const row of stockItems || []) {
      put(row?.id ?? row?.stockItemId, row);
    }
    for (const row of fallbackRows || []) {
      put(row?.stockItemId ?? row?.id, row);
    }
    this.posStockItemImageById = next;
  }

  private rememberPosStockItemImages(
    stockItemId: number,
    image: string | null,
    image2: string | null,
    image3: string | null,
    imageLocal?: string | null,
    imageLocal2?: string | null,
    imageLocal3?: string | null
  ): void {
    if (!Number.isFinite(stockItemId) || stockItemId <= 0) {
      return;
    }
    const prev = this.posStockItemImageById.get(stockItemId);
    const nextLocal = imageLocal !== undefined ? imageLocal || null : prev?.imageLocal || null;
    const nextLocal2 = imageLocal2 !== undefined ? imageLocal2 || null : prev?.imageLocal2 || null;
    const nextLocal3 = imageLocal3 !== undefined ? imageLocal3 || null : prev?.imageLocal3 || null;
    this.posStockItemImageById.set(stockItemId, {
      image: image || null,
      image2: image2 || null,
      image3: image3 || null,
      imageLocal: nextLocal,
      imageLocal2: nextLocal2,
      imageLocal3: nextLocal3,
      description: prev?.description || null,
    });
    const display = this.api.resolveLocalProductImageUrl(nextLocal) || image || null;
    // Patch in-memory batch/item rows so cards refresh without waiting for next full reload
    for (const row of this.itemList || []) {
      const rowId = Number(row?.stockItemId ?? row?.id);
      if (rowId === stockItemId) {
        row.image = image;
        row.image2 = image2;
        row.image3 = image3;
        row.imageLocal = nextLocal;
        row.imageLocal2 = nextLocal2;
        row.imageLocal3 = nextLocal3;
        row.imageUrl = display;
      }
    }
    for (const row of this.allStockItemsCache || []) {
      const rowId = Number(row?.id ?? row?.stockItemId);
      if (rowId === stockItemId) {
        row.image = image;
        row.image2 = image2;
        row.image3 = image3;
        row.imageLocal = nextLocal;
        row.imageLocal2 = nextLocal2;
        row.imageLocal3 = nextLocal3;
        row.imageUrl = display;
      }
    }
    this.posCatalogFrontEntries = (this.posCatalogFrontEntries || []).map((entry) => {
      const entryId = this.resolvePosStockItemId(entry.sourceItem) || Number(entry.key);
      if (entryId === stockItemId) {
        return { ...entry, imageUrl: display || entry.imageUrl };
      }
      return entry;
    });
  }

  /** Keep the in-memory product master list in sync after create/edit/image save. */
  private upsertAllStockItemsCache(item: any): void {
    if (!item) {
      return;
    }
    const id = Number(item.id ?? item.stockItemId);
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }
    const next = { ...item, id, stockItemId: item.stockItemId ?? id };
    const list = Array.isArray(this.allStockItemsCache) ? [...this.allStockItemsCache] : [];
    const idx = list.findIndex((row) => Number(row?.id ?? row?.stockItemId) === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...next };
    } else {
      list.unshift(next);
    }
    this.allStockItemsCache = list;
  }

  toggleOtcDrugDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.otcDrugDropdownOpen) {
      this.otcDrugDropdownOpen = false;
      return;
    }
    this.openOtcDrugDropdown();
  }

  onOtcDrugSearchChange(): void {
    if (this.pharmacyUseStockBatch) {
      this.refreshGroupedStockItems();
    }
  }

  private openOtcDrugDropdown(): void {
    this.searchText = '';
    if (!this.itemList?.length && !this.isLoadingDrugList) {
      this.loadPharmacyStock();
    } else if (this.pharmacyUseStockBatch) {
      this.refreshGroupedStockItems();
    }
    this.otcDrugDropdownOpen = true;
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 0);
  }

  /** Pick a batch + store — close dropdown, then pre-fill form fields. */
  selectOtcBatch(item: any, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!item) {
      return;
    }
    this.otcDrugDropdownOpen = false;
    this.changeCurrentItem(item);
  }

  /** Pick a shop item (item-mode) — close dropdown, then pre-fill form fields. */
  selectOtcItem(item: any, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!item) {
      return;
    }
    this.otcDrugDropdownOpen = false;
    this.applySelectedOtcShopItem(item);
  }

  filteredOtcItemList(): any[] {
    if (!Array.isArray(this.itemList)) {
      return [];
    }
    let filtered = [...this.itemList];
    const q = (this.searchText || '').trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((item) => {
        const blob = [
          item?.title,
          item?.name,
          item?.itemName,
          item?.stockItemName,
          item?.batchNumber,
          item?.storeName,
        ]
          .map((v) => String(v ?? '').toLowerCase())
          .join(' ');
        return blob.includes(q);
      });
    }
    return filtered;
  }

  otcItemOptionLabel(item: any): string {
    return String(item?.title || item?.name || item?.itemName || 'Product');
  }

  otcItemOptionStock(item: any): string {
    const qty = Number(item?.stockAtHand ?? 0);
    const uom = String(item?.uintOfMeasure || item?.unitOfMeasure || '').trim();
    return uom ? `${qty} ${uom}` : String(qty);
  }

  changeCurrentItem(item: any): void {
    if (!item) {
      this.clearCurrentTreatmentSelection();
      return;
    }
    if (!this.pharmacyUseStockBatch) {
      this.applySelectedOtcShopItem(item);
      return;
    }
    this.itemSellingPrice = 0;
    this.availableQuantity = Number(item.stockAtHand) || 0;
    this.unitBuy = Number(item.costPrice) || 0;
    this.unitOfMeasure = item.uintOfMeasure || item.unitOfMeasure || '';
    this.currentItemFullLabel = item.title || item.name || '';
    const drugName = item.plainName || this.plainDrugName(item) || item.title || item.name || 'Unknown Treatment';
    this.currentStockItemName = drugName;
    const storePart = item.storeName ? ` · ${item.storeName}` : '';
    const expiryPart = item.expiryLabel ? ` · EX ${item.expiryLabel}` : '';
    this.currentItem = item.batchLabel
      ? `${drugName} — ${item.batchLabel}${expiryPart}${storePart}`
      : drugName;
    this.currentItemId = item.stockItemId ?? item.id ?? null;
    this.currentStockBatchId =
      item._stockBatchId != null && item._stockBatchId !== '' ? item._stockBatchId : null;
    this.selectedUnitSellingModelId = item.unitSellingModelId ?? null;
    this.lastUnitValue = Number(item.lastUnitValue) > 0 ? Number(item.lastUnitValue) : 1;
    if (!this.currentTreatmentRequested.quantity || this.currentTreatmentRequested.quantity <= 0) {
      this.currentTreatmentRequested.quantity = 1;
    }
    this.applyItemPrescribingPrefill(item);
    this.calculateTotal();
  }

  /** Shop-item mode: capture Item.id only — never look up StockItem. */
  private applySelectedOtcShopItem(item: any): void {
    if (!item) {
      this.clearCurrentTreatmentSelection();
      return;
    }
    const name = String(item.title || item.name || item.itemName || 'Unknown Treatment').trim();
    this.currentItemFullLabel = name;
    this.currentStockItemName = name;
    this.currentItem = name;
    this.currentItemId = Number(item.id ?? item.itemId) || null;
    this.currentStockBatchId = null;
    this.selectedUnitSellingModelId = item.unitSellingModelId ?? item.unit_selling_model_id ?? null;
    this.availableQuantity = Number(item.stockAtHand) || 0;
    this.unitBuy = Number(item.costPrice) || 0;
    this.itemSellingPrice =
      Number(item.sellingPrice ?? item.unitSellingPrice ?? item.salePrice ?? 0) || 0;
    this.unitOfMeasure = item.uintOfMeasure || item.unitOfMeasure || '';
    this.lastUnitValue = Number(item.lastUnitValue) > 0 ? Number(item.lastUnitValue) : 1;
    if (!this.currentTreatmentRequested.quantity || this.currentTreatmentRequested.quantity <= 0) {
      this.currentTreatmentRequested.quantity = 1;
    }
    applyPrescribingPrefillToTreatmentForm(this.currentTreatmentRequested, item);
    if (this.otcIncludePrescribing) {
      this.calculateNoOfUnits();
      this.calculateTotalQty();
    }
    this.calculateTotal();
  }

  private applyItemPrescribingPrefill(item: any): void {
    const recalc = () => {
      if (this.otcIncludePrescribing) {
        this.calculateNoOfUnits();
        this.calculateTotalQty();
      }
      this.calculateTotal();
    };

    if (!this.currentTreatmentRequested.quantity) {
      this.currentTreatmentRequested.quantity = 1;
    }

    applyPrescribingPrefillToTreatmentForm(this.currentTreatmentRequested, item);
    recalc();

    if (!this.pharmacyUseStockBatch) {
      return;
    }

    const stockItemId = Number(item?.stockItemId ?? item?.id);
    if (!Number.isFinite(stockItemId) || stockItemId <= 0) {
      return;
    }

    this.api.getStockItemById(stockItemId).subscribe({
      next: (data) => {
        applyPrescribingPrefillToTreatmentForm(this.currentTreatmentRequested, {
          ...item,
          ...(data ?? {}),
        });
        recalc();
      },
      error: () => recalc(),
    });
  }

  calculateNoOfUnits(): void {
    const dose = Number(this.currentTreatmentRequested.amountPerFrequencyValue) || 0;
    if (dose > 0 && this.lastUnitValue > 0) {
      this.currentTreatmentRequested.totalUnits = dose / this.lastUnitValue;
    } else {
      this.currentTreatmentRequested.totalUnits = 0;
    }
  }

  applyStandardDosageOption(option: StandardDosageOption): void {
    this.currentTreatmentRequested.amountPerFrequencyValue = option.doseValue;
    this.currentTreatmentRequested.amountPerFrequencyUnit = normalizeDosageUnitForSelect(option.doseUnit);
    this.currentTreatmentRequested.frequencyValue = option.frequencyValue;
    this.currentTreatmentRequested.frequencyUnit = option.frequencyUnit;
    this.currentTreatmentRequested.durationValue = option.durationValue;
    this.currentTreatmentRequested.durationUnit = option.durationUnit;
    this.currentTreatmentRequested.quantity = option.quantity;
    this.currentTreatmentRequested.totalUnits = option.totalUnits;
    this.currentTreatmentRequested.instructions = option.instructions;
    this.currentTreatmentRequested.route = option.route;
    this.calculateNoOfUnits();
    this.calculateTotalQty();
    this.calculateTotal();
  }

  otcStandardDosageClientAge(): number | null {
    return null;
  }

  otcStandardDosageClientWeight(): number | null {
    return null;
  }

  calculateTotalQty(): void {
    const freq = Number(this.currentTreatmentRequested.frequencyValue) || 0;
    const dur = Number(this.currentTreatmentRequested.durationValue) || 0;
    const dose = Number(this.currentTreatmentRequested.amountPerFrequencyValue) || 0;
    if (freq > 0 && dur > 0 && dose > 0 && this.lastUnitValue > 0) {
      this.currentTreatmentRequested.quantity = (freq * dur * dose) / this.lastUnitValue;
    }
    this.calculateTotal();
  }

  calculateDurationUnit(): void {
    this.currentTreatmentRequested.durationUnit = this.currentTreatmentRequested.frequencyUnit;
  }

  get lineTotalAmount(): number {
    const qty = Number(this.currentTreatmentRequested.quantity) || 0;
    const unitPrice = Number(this.itemSellingPrice) || 0;
    if (qty > 0 && unitPrice > 0) {
      return Math.round(qty * unitPrice * 100) / 100;
    }
    return Number(this.currentTreatmentRequested.totalAmount) || 0;
  }

  /** Qty changed — update line total sell. */
  calculateTotalFromQuantity(): void {
    const unitPrice = Number(this.itemSellingPrice) || 0;
    const total = (Number(this.currentTreatmentRequested.quantity) || 0) * unitPrice;
    this.currentTreatmentRequested.totalAmount = total;
  }

  /** Total sell changed — derive qty from amount ÷ unit sell price. */
  calculateQuantityFromTotalSell(): void {
    const unitPrice = this.itemSellingPrice || 0;
    const totalSell = Number(this.currentTreatmentRequested.totalAmount);
    if (unitPrice <= 0 || !Number.isFinite(totalSell) || totalSell <= 0) {
      return;
    }

    let qty = totalSell / unitPrice;
    qty = Math.round(qty * 10000) / 10000;

    this.currentTreatmentRequested.quantity = qty;
    if (this.otcIncludePrescribing) {
      this.currentTreatmentRequested.totalUnits = qty;
    }
  }

  calculateTotal(): number {
    this.calculateTotalFromQuantity();
    return this.lineTotalAmount;
  }

  returnUnitCost(): number {
    return Number(this.itemSellingPrice) || 0;
  }

  onOtcUnitSellingModelPriceChange(price: number): void {
    this.applyUnitSellingModelPrice(price);
  }

  private applyUnitSellingModelPrice(price: number): void {
    this.itemSellingPrice = Number(price) || 0;
    this.calculateTotal();
  }

  addToSaleList(formValue: any): void {
    if (!this.currentItemId) {
      this.flashStatus('Select a treatment / drug from the list first.', true);
      return;
    }
    const allowOutOfStock = !!formValue?.allowOutOfStock;
    if (this.pharmacyUseStockBatch && !this.currentStockBatchId && !allowOutOfStock) {
      // Try to recover a batch id from the loaded list before failing.
      const recovered = (this.itemList || []).find(
        (row) =>
          Number(row?.stockItemId ?? row?.id) === Number(this.currentItemId) &&
          Number(row?._stockBatchId) > 0
      );
      if (recovered) {
        this.currentStockBatchId = recovered._stockBatchId;
      }
    }
    if (this.pharmacyUseStockBatch && !this.currentStockBatchId && !allowOutOfStock) {
      this.flashStatus('Select a stock batch / store from the list first.', true);
      return;
    }

    const data = { ...this.currentTreatmentRequested, ...formValue };
    const qty = Number(data.quantity);
    if (!qty || qty <= 0) {
      this.flashStatus('Total quantity must be greater than zero.', true);
      return;
    }
    if (this.availableQuantity <= 0) {
      this.flashStatus('Added out-of-stock item — stock will be checked at goods delivery.', false);
    } else if (qty > this.availableQuantity) {
      this.flashStatus(
        `Quantity exceeds stock (${this.availableQuantity}). Allowed — stock will be checked at goods delivery.`,
        false
      );
    }
    const freqUnit = this.optionalPrescribingNumber(data.frequencyUnit);
    const durUnit = this.optionalPrescribingNumber(data.durationUnit);
    if (
      this.otcIncludePrescribing &&
      freqUnit != null &&
      durUnit != null &&
      freqUnit !== durUnit
    ) {
      this.flashStatus('Duration unit and frequency unit must match.', true);
      return;
    }

    const itemId = Number(this.currentItemId);
    const batchId =
      this.pharmacyUseStockBatch && this.currentStockBatchId != null
        ? Number(this.currentStockBatchId)
        : null;
    const hasBatch = batchId != null && Number.isFinite(batchId) && batchId > 0;
    const cartLineKey = hasBatch ? `otc-batch-${batchId}` : `otc-item-${itemId}`;
    const stockRow =
      (this.allStockItemsCache || []).find(
        (row) => Number(row?.id ?? row?.stockItemId) === itemId
      ) || null;
    const isService =
      this.isPosServiceSaleCategory(stockRow) ||
      (!hasBatch &&
        this.pharmacyUseStockBatch &&
        this.isPosServiceSaleCategory(
          (this.itemList || []).find((i) => Number(i?.stockItemId ?? i?.id) === itemId)
        ));
    const prevPayable = this.cartPayableTotal;
    const lineBase = {
      cartLineKey,
      lineSource: 'OTC' as const,
      given: true,
      stockBatchId: hasBatch ? batchId : null,
      itemId,
      isService: !!isService,
      itemName:
        this.currentStockItemName ||
        this.otcPlainItemName({ title: this.currentItem }) ||
        'Product',
      quantity: qty,
      unitBuy: this.unitBuy,
      unitSellingPrice: this.itemSellingPrice,
      totalAmount: Number(data.totalAmount) || qty * this.itemSellingPrice,
      discountAmount: 0,
      discountMode: 'none' as const,
      discountInput: 0,
      stockAtHand: this.availableQuantity,
      unitSellingModelId: this.selectedUnitSellingModelId,
      useUnitSellingModel: this.posCartLineUsesUnitSellingModel(),
      imageUrl: this.posProductImageUrl(
        this.pharmacyUseStockBatch
          ? this.itemList.find((i) => i._stockBatchId === batchId)
          : this.itemList.find((i) => Number(i?.id) === itemId),
        this.pharmacyUseStockBatch
          ? Number(
              this.itemList.find((i) => i._stockBatchId === batchId)?.stockItemId ??
                this.itemList.find((i) => i._stockBatchId === batchId)?.id
            )
          : itemId
      ),
    };
    const line: OtcCartLine = this.otcIncludePrescribing
      ? {
          ...lineBase,
          amountPerFrequencyValue: this.optionalPrescribingNumber(data.amountPerFrequencyValue),
          amountPerFrequencyUnit: String(data.amountPerFrequencyUnit ?? '').trim(),
          frequencyValue: this.optionalPrescribingNumber(data.frequencyValue),
          frequencyUnit: freqUnit,
          durationValue: this.optionalPrescribingNumber(data.durationValue),
          durationUnit: durUnit,
          totalUnits: this.optionalPrescribingNumber(data.totalUnits),
          instructions: String(data.instructions ?? '').trim(),
          route: String(data.route ?? '').trim(),
        }
      : {
          ...lineBase,
          amountPerFrequencyValue: null,
          amountPerFrequencyUnit: '',
          frequencyValue: null,
          frequencyUnit: null,
          durationValue: null,
          durationUnit: null,
          totalUnits: qty,
          instructions: String(data.instructions ?? '').trim(),
          route: String(data.route ?? '').trim(),
        };

    const existing = this.cart.find(
      (c) =>
        c.lineSource === 'OTC' &&
        (hasBatch
          ? c.stockBatchId === line.stockBatchId
          : c.itemId === line.itemId && (c.stockBatchId == null || c.stockBatchId <= 0))
    );
    if (existing) {
      const newQty = existing.quantity + line.quantity;
      const maxStock = this.availableStockForCartLine(existing);
      if (maxStock <= 0 || newQty > maxStock) {
        this.flashStatus(
          'Quantity exceeds stock — allowed; stock will be checked at goods delivery.',
          false
        );
      }
      existing.quantity = newQty;
      existing.stockAtHand = maxStock;
      existing.totalUnits = line.totalUnits;
      if (!existing.imageUrl && line.imageUrl) {
        existing.imageUrl = line.imageUrl;
      }
      if (existing.discountMode === 'percent' && this.num(existing.discountInput) > 0) {
        const gross = newQty * this.num(existing.unitSellingPrice);
        existing.discountAmount = Math.min(
          gross,
          (gross * this.num(existing.discountInput)) / 100
        );
      }
      this.refreshCartLineTotals(existing);
      existing.amountPerFrequencyValue = line.amountPerFrequencyValue;
      existing.amountPerFrequencyUnit = line.amountPerFrequencyUnit;
      existing.frequencyValue = line.frequencyValue;
      existing.frequencyUnit = line.frequencyUnit;
      existing.durationValue = line.durationValue;
      existing.durationUnit = line.durationUnit;
      existing.route = line.route;
      existing.instructions = line.instructions;
      // Keep most recently touched line at the top of the cart.
      this.cart = [existing, ...this.cart.filter((c) => c !== existing)];
    } else {
      this.cart = [line, ...this.cart];
    }

    this.flashStatus('Added to counter sale list.', false);
    this.clearTreatmentForm();
    this.syncAmountReceivedToSubtotal(prevPayable);
  }

  removeLine(line: OtcCartLine): void {
    this.cart = this.cart.filter((c) => c.cartLineKey !== line.cartLineKey);
  }

  requestRemoveCartLine(line: OtcCartLine, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!line || this.processing) {
      return;
    }
    this.posRemoveCartLineTarget = line;
    this.showPosRemoveCartLineModal = true;
  }

  cancelRemoveCartLine(): void {
    this.showPosRemoveCartLineModal = false;
    this.posRemoveCartLineTarget = null;
  }

  confirmRemoveCartLine(): void {
    const line = this.posRemoveCartLineTarget;
    this.showPosRemoveCartLineModal = false;
    this.posRemoveCartLineTarget = null;
    if (!line) {
      return;
    }
    const prevPayable = this.cartPayableTotal;
    this.removeLine(line);
    this.syncAmountReceivedToSubtotal(prevPayable);
  }

  editLine(line: OtcCartLine): void {
    const item =
      line.stockBatchId != null && line.stockBatchId > 0
        ? this.itemList.find((i) => i._stockBatchId === line.stockBatchId)
        : this.itemList.find((i) => Number(i?.id) === Number(line.itemId));
    if (item) {
      this.changeCurrentItem(item);
    }
    this.currentTreatmentRequested = {
      amountPerFrequencyValue: line.amountPerFrequencyValue,
      amountPerFrequencyUnit: line.amountPerFrequencyUnit,
      frequencyValue: line.frequencyValue,
      frequencyUnit: line.frequencyUnit,
      durationValue: line.durationValue,
      durationUnit: line.durationUnit,
      quantity: line.quantity,
      totalUnits: line.totalUnits,
      totalAmount: line.totalAmount,
      instructions: line.instructions,
      route: line.route,
    };
    this.removeLine(line);
  }

  clearTreatmentForm(): void {
    this.currentItem = 'Choose Treatment';
    this.currentItemFullLabel = '';
    this.currentStockItemName = '';
    this.currentItemId = null;
    this.currentStockBatchId = null;
    this.selectedUnitSellingModelId = null;
    this.availableQuantity = 0;
    this.unitBuy = 0;
    this.itemSellingPrice = 0;
    this.unitOfMeasure = '';
    this.currentTreatmentRequested = this.defaultTreatmentForm();
    this.otcTreatmentForm?.resetForm(this.defaultTreatmentForm());
  }

  clearCart(): void {
    this.cart = [];
    this.overallDiscountAmount = 0;
    this.amountReceived = null;
    this.showStatusBanner = false;
    this.posShowPaymentStep = false;
    this.clearPosSaleClient();
    this.clearDocumentEditMode();
  }

  clearDocumentEditMode(): void {
    this.lockedDocumentType = null;
    this.editingSoldSaleId = null;
    this.receiptOpenedFromSold = false;
    this.receiptSourceOrder = null;
    this.receiptSourcePatientId = null;
    this.receiptSourceSaleDoc = null;
  }

  get isEditingSoldDocument(): boolean {
    return this.lockedDocumentType != null;
  }

  get checkoutActionLabel(): string {
    if (this.processing) {
      return this.isEditingSoldDocument ? 'Updating...' : 'Processing...';
    }
    if (this.lockedDocumentType) {
      return `Update ${commercialDocTitle(this.lockedDocumentType)}`;
    }
    return `Create ${commercialDocTitle(this.selectedCheckoutDocType)}`;
  }

  /** Document type chosen on the payment step (or locked while editing). */
  get selectedCheckoutDocType(): CommercialDocType {
    if (this.lockedDocumentType) {
      return normalizeCommercialDocType(this.lockedDocumentType);
    }
    return normalizeCommercialDocType(this.pendingPosDocType);
  }

  /** Radios on the payment step (includes locked type when editing EFRIS / delivery note). */
  get checkoutDocTypeRadios(): { type: CommercialDocType; title: string }[] {
    const base = this.posCheckoutDocTypeOptions;
    if (!this.lockedDocumentType) {
      return base;
    }
    const locked = normalizeCommercialDocType(this.lockedDocumentType);
    if (base.some((o) => o.type === locked)) {
      return base;
    }
    return [...base, { type: locked, title: commercialDocTitle(locked) }];
  }

  /** Payment fields on the cart step — available for every document type including quotation. */
  get posPaymentFieldsEnabled(): boolean {
    return true;
  }

  /** Quotation may be saved without tender; other types default amount received to payable. */
  private shouldPrefillAmountReceivedForDoc(docType: CommercialDocType | string): boolean {
    return normalizeCommercialDocType(docType) !== 'quotation';
  }

  /** Active category chip on the POS product grid (`All` = no filter). */
  posSelectedCategory = 'All';
  /** Products vs services catalog mode (category dropdown tabs). */
  posCatalogKind: 'products' | 'services' = 'products';
  /** Category dropdown open state. */
  posCategoryDropdownOpen = false;
  /** Search text inside the category dropdown. */
  posCategorySearch = '';
  /** Locally added product categories (session). */
  posCustomCategories: string[] = [];
  /** Locally added service categories (session). */
  posCustomServiceCategories: string[] = [];
  /** Inline category rename target. */
  posEditingCategory: string | null = null;
  posEditingCategoryName = '';
  /** Show inline add-category form. */
  posAddingCategory = false;
  posNewCategoryName = '';
  /** Category picker inside add/edit product modals. */
  posFormCategoryContext: 'add' | 'edit' | null = null;
  posFormCategoryDropdownOpen = false;
  posFormCategorySearch = '';
  posFormAddingCategory = false;
  posFormNewCategoryName = '';
  /** Unit picker inside add/edit product modals (same UX as category). */
  posFormUnitContext: 'add' | 'edit' | null = null;
  posFormUnitDropdownOpen = false;
  posFormUnitSearch = '';
  posFormAddingUnit = false;
  posFormNewUnitName = '';
  posCustomUnits: string[] = [];
  private readonly posDefaultUnits = ['pc', 'box', 'pack', 'bottle', 'kg', 'g', 'L', 'ml', 'dozen'];
  /** After Continue to Payment, show payment fields in the order panel. */
  posShowPaymentStep = false;
  /** Document type selected on the payment step (replaces the old choose-type modal). */
  pendingPosDocType: CommercialDocType = 'receipt';
  /** Radios shown beside Back to order: Quotation / Proforma / Sales Invoice / Receipt. */
  readonly posCheckoutDocTypeOptions: { type: CommercialDocType; title: string }[] = [
    { type: 'quotation', title: 'Quotation' },
    { type: 'proforma', title: 'Proforma' },
    { type: 'sales_invoice', title: 'Sales invoice' },
    { type: 'receipt', title: 'Receipt' },
  ];
  /** Kept for any leftover references; EFRIS / delivery note still open from progress pipeline. */
  readonly posDocTypeOptions: {
    type: CommercialDocType;
    title: string;
    hint: string;
  }[] = [
    {
      type: 'quotation',
      title: 'Quotation',
      hint: 'Estimate only — stock is not deducted',
    },
    {
      type: 'proforma',
      title: 'Proforma Invoice',
      hint: 'Provisional invoice — stock is not deducted',
    },
    {
      type: 'sales_invoice',
      title: 'Sales Invoice',
      hint: 'Completes the sale and deducts stock',
    },
    {
      type: 'receipt',
      title: 'Receipt',
      hint: 'Payment receipt — completes the sale and deducts stock',
    },
    {
      type: 'efris_receipt',
      title: 'EFRIS Receipt',
      hint: 'URA e-receipt template (FDN, verification, QR) — completes sale & deducts stock',
    },
    {
      type: 'delivery_note',
      title: 'Delivery Note',
      hint: 'Confirms goods delivered — stock already handled at sale/delivery confirm',
    },
  ];
  /** Required client attached to the counter sale. */
  posSaleClientId: number | null = null;
  posSaleClientName = '';
  /** Client order (visit) linked when a POS client is attached. */
  posSaleVisitId: number | null = null;
  posSaleVisitNumber: number | null = null;
  posSaleOrderAttaching = false;
  /** When false, cart + payment totals column is hidden (catalog expands). */
  posCartPanelVisible = true;
  /** New-order modal after attaching a client. */
  showPosOrderPickerModal = false;
  posOrderPickerCreating = false;
  /** True only for an order created in this checkout and not yet used by a document. */
  private posOrderReadyForNextDocument = false;
  /** Date/time used when creating a new order from the picker. */
  posOrderPickerNewDate = '';
  posOrderPickerNewTime = '';
  posClientSearch = '';
  posClientPickerOpen = false;
  posClientOptions: { id: number; name: string }[] = [];
  posClientLoading = false;
  private posClientCache: { id: number; name: string }[] = [];
  private posClientLoadAttempted = false;

  /** POS add-new-client modal */
  showPosAddClientModal = false;
  posAddClientSaving = false;
  posAddClientGroupsLoading = false;
  posAddClientGroups: any[] = [];
  posAddClientDraft: {
    clientFirstName: string;
    clientSecondName: string;
    clientContact: string;
    clientGender: string;
    occupation: string;
    clientAddress: string;
    clientGroupId: number | null;
    clientGroup: string;
    nextOfKinName: string;
    nextOfKinContact: string;
    relationship: string;
    nextOfKinAddress: string;
  } = this.emptyPosAddClientDraft();

  /** Line discount modal. */
  showLineDiscountModal = false;
  discountTargetLine: OtcCartLine | null = null;
  discountDraftMode: 'percent' | 'amount' = 'amount';
  discountDraftValue: number | null = null;

  /** Overall (order-level) discount modal. */
  showOverallDiscountModal = false;
  overallDiscountDraftValue: number | null = null;

  /** Tax settings modal. */
  showPosTaxModal = false;
  taxDraftType: 'VAT' | 'Sales Tax' | 'None' = 'VAT';
  taxDraftRatePercent: number | null = 18;

  /** Out-of-stock add confirmation */
  showPosOosConfirmModal = false;
  private pendingOosAdd:
    | {
        mode: 'quick' | 'detail';
        product: any;
      }
    | null = null;

  /** Confirm remove cart line */
  showPosRemoveCartLineModal = false;
  posRemoveCartLineTarget: OtcCartLine | null = null;

  /** Cart line unit selling model modal */
  showPosCartSellModelModal = false;
  posCartSellModelLine: OtcCartLine | null = null;

  /** POS product edit modal */
  showPosProductEditModal = false;
  posProductEditLoading = false;
  posProductEditSaving = false;
  posProductEditId: number | null = null;
  posProductEditDraft: {
    stockItemName: string;
    description: string;
    barcode: string;
    businessCategory: string;
    saleCategory?: string | null;
    unit: string;
    costPrice: number | null;
    sellingPrice: number | null;
    unitSellingModelId: number | null;
    /** true = fixed unit sell model; false = open price at POS */
    useUnitSellingModel: boolean;
    reorderLevel: number | null;
    restockTo: number | null;
    shelfNumber: string;
    image: string | null;
    image2: string | null;
    image3: string | null;
  } | null = null;

  /** POS add new product / service modal */
  showPosAddProductModal = false;
  /** Which tab is active in the add modal (default product). */
  posAddModalKind: 'product' | 'service' = 'product';
  posAddProductSaving = false;
  /** Similar-name warning before creating a near-duplicate product. */
  showPosSimilarProductModal = false;
  posSimilarProductNames: string[] = [];
  private posAddProductAllowSimilar = false;
  /** Draft sell model chosen while creating a product (persisted after create). */
  private posAddPendingSellModel: {
    name?: string;
    unitsInBundle?: number;
    bundlePrice?: number;
    unitSellingPrice?: number;
    isDraft?: boolean;
    id?: number;
  } | null = null;
  posAddProductDraft: {
    stockItemName: string;
    description: string;
    sku: string;
    barcode: string;
    businessCategory: string;
    unit: string;
    costPrice: number | null;
    sellingPrice: number | null;
    unitSellingModelId: number | null;
    /** true = fixed unit sell model; false = open price at POS */
    useUnitSellingModel: boolean;
    reorderLevel: number | null;
    restockTo: number | null;
    shelfNumber: string;
  } | null = null;
  /** Recently added stock item ids (most recent first) — pin to top of POS catalog. */
  private posCatalogPinIds: number[] = [];
  /** Optimistic catalog rows for items not yet present in batch/stock lists. */
  private posCatalogFrontEntries: Array<{
    key: string;
    name: string;
    description: string;
    category: string;
    price: number;
    unitLabel: string;
    stockQty: number;
    imageUrl: string | null;
    outOfStock: boolean;
    lowStock: boolean;
    sourceItem: any;
  }> = [];

  /** POS product detail (Alibaba-style) page */
  showPosProductDetail = false;
  posProductDetailLoading = false;
  posProductDetailQty = 1;
  posProductDetailImageIndex = 0;
  posProductDetailImages: string[] = [];
  posProductDetail: {
    key: string;
    name: string;
    description: string;
    category: string;
    price: number;
    unitLabel: string;
    stockQty: number;
    imageUrl: string | null;
    outOfStock: boolean;
    sourceItem: any;
    barcode?: string;
    shelfNumber?: string;
    businessCategory?: string;
  } | null = null;

  /** POS product images modal (max 3) */
  showPosProductImagesModal = false;
  posProductImagesName = '';
  posProductImagesId: number | null = null;
  posProductImageDrafts: string[] = [];
  /** Parallel local folder URLs for each draft slot (relative /stock-item/local-images/...). */
  posProductImageLocalDrafts: string[] = [];
  posProductImageActiveIndex = 0;
  posProductImageZoomUrl: string | null = null;
  showPosProductImageFullscreen = false;
  posProductImageUploading = false;
  posProductImageUploadProgress = 0;
  posProductImageSaving = false;
  private posProductImagesFullDraft: any = null;
  /** stockItemId -> primary image URL (and extras) + description for POS cards */
  private posStockItemImageById = new Map<
    number,
    {
      image: string | null;
      image2: string | null;
      image3: string | null;
      imageLocal: string | null;
      imageLocal2: string | null;
      imageLocal3: string | null;
      description: string | null;
    }
  >();
  /** Dedupe in-flight web→local cache requests. */
  private posLocalImageCacheInFlight = new Set<string>();

  /** Quick receive-stock modal from product card */
  showPosReceiveStockModal = false;
  posReceiveStockSaving = false;
  posReceiveStockProductName = '';
  posReceiveStockItemId: number | null = null;
  posReceiveStockDraft: {
    quantityReceived: number | null;
    unitCostPrice: number | null;
    totalCostPrice: number | null;
    unitSellingPrice: number | null;
    unitSellingModelId: number | null;
    /** true = fixed unit sell model; false = open selling price */
    useUnitSellingModel: boolean;
    receiveDate: string;
    expiryDate: string;
    storeId: number | null;
    storeName: string;
    brand: string;
    batchNumber: string;
    purchaseOrderId: number | null;
    purchaseOrderNo: string;
    purchaseOrderSupplierId: number | null;
  } | null = null;
  posReceivePurchaseOrders: any[] = [];
  posReceivePoDropdownOpen = false;
  posReceivePoSearch = '';
  posReceiveStoreDropdownOpen = false;
  posReceiveStoreSearch = '';
  posReceiveAddingStore = false;
  posReceiveNewStoreName = '';
  posReceiveStoreSaving = false;

  posCategoryOptions(): string[] {
    const cats = new Set<string>();
    for (const p of this.buildPosCatalogProducts(false)) {
      const c = (p.category || '').trim();
      if (c) {
        cats.add(c);
      }
    }
    const custom =
      this.posCatalogKind === 'services' ? this.posCustomServiceCategories : this.posCustomCategories;
    for (const customCat of custom) {
      const c = (customCat || '').trim();
      if (c) {
        cats.add(this.toTitleCase(c));
      }
    }
    return ['All', ...Array.from(cats).sort((a, b) => a.localeCompare(b))];
  }

  /** Categories for add/edit product selects (no "All"; includes current value if missing). */
  posProductFormCategoryOptions(currentCategory?: string | null): string[] {
    const kind = this.resolvePosFormCategoryKind();
    const cats = new Set<string>();
    for (const p of this.buildPosCatalogProducts(false, kind)) {
      const c = (p.category || '').trim();
      if (c) cats.add(c);
    }
    const custom =
      kind === 'services' ? this.posCustomServiceCategories : this.posCustomCategories;
    for (const customCat of custom) {
      const c = (customCat || '').trim();
      if (c) cats.add(this.toTitleCase(c));
    }
    const current = this.toTitleCase(String(currentCategory || '').trim());
    if (current) cats.add(current);
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }

  private resolvePosFormCategoryKind(): 'products' | 'services' {
    if (this.posFormCategoryContext === 'add') {
      return this.posAddModalKind === 'service' ? 'services' : 'products';
    }
    if (this.posFormCategoryContext === 'edit' && this.posProductEditDraft) {
      return this.isPosServiceSaleCategory(this.posProductEditDraft) ? 'services' : 'products';
    }
    return this.posCatalogKind;
  }

  isPosServiceSaleCategory(item: any): boolean {
    return String(item?.saleCategory || '').trim().toLowerCase() === 'service';
  }

  isPosCatalogService(product: { sourceItem?: any } | null | undefined): boolean {
    return this.isPosServiceSaleCategory(product?.sourceItem);
  }

  setPosCatalogKind(kind: 'products' | 'services', event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.posCatalogKind === kind) {
      return;
    }
    this.posCatalogKind = kind;
    this.posSelectedCategory = 'All';
    this.posAddingCategory = false;
    this.posNewCategoryName = '';
    this.posCategorySearch = '';
    this.cancelEditPosCategory();
  }

  setPosAddModalKind(kind: 'product' | 'service'): void {
    this.posAddModalKind = kind;
    if (!this.posAddProductDraft) {
      return;
    }
    if (kind === 'service') {
      this.posAddProductDraft.reorderLevel = 0;
      this.posAddProductDraft.restockTo = 0;
      this.posAddProductDraft.shelfNumber = '';
    } else if (!String(this.posAddProductDraft.sku || '').trim()) {
      this.posAddProductDraft.sku = this.generatePosProductSku();
    }
    // Clear category when switching kinds — product/service lists differ.
    this.posAddProductDraft.businessCategory = '';
    this.closePosFormCategoryDropdown();
  }

  startEditPosCategory(category: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!category || category === 'All') {
      return;
    }
    this.posEditingCategory = category;
    this.posEditingCategoryName = category;
  }

  cancelEditPosCategory(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.posEditingCategory = null;
    this.posEditingCategoryName = '';
  }

  confirmEditPosCategory(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const from = String(this.posEditingCategory || '').trim();
    const to = this.toTitleCase(String(this.posEditingCategoryName || '').trim());
    if (!from || !to || from.toLowerCase() === to.toLowerCase()) {
      this.cancelEditPosCategory();
      return;
    }
    this.renamePosCategory(from, to);
    this.cancelEditPosCategory();
  }

  deletePosCategory(category: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const name = this.toTitleCase(String(category || '').trim());
    if (!name || name === 'All') {
      return;
    }
    if (!confirm(`Delete category "${name}"? Items using it will be uncategorized.`)) {
      return;
    }
    this.renamePosCategory(name, '');
    if (this.posSelectedCategory === name) {
      this.posSelectedCategory = 'All';
    }
  }

  private renamePosCategory(fromRaw: string, toRaw: string): void {
    const from = this.toTitleCase(String(fromRaw || '').trim());
    const to = toRaw ? this.toTitleCase(String(toRaw).trim()) : '';
    if (!from) {
      return;
    }
    const isServices = this.posCatalogKind === 'services';
    const customKey = isServices ? 'posCustomServiceCategories' : 'posCustomCategories';
    const customList = isServices ? this.posCustomServiceCategories : this.posCustomCategories;
    const nextCustom = customList
      .map((c) => (c.toLowerCase() === from.toLowerCase() ? to : c))
      .filter((c) => !!c);
    if (to && !nextCustom.some((c) => c.toLowerCase() === to.toLowerCase())) {
      nextCustom.push(to);
    }
    if (isServices) {
      this.posCustomServiceCategories = nextCustom;
    } else {
      this.posCustomCategories = nextCustom;
    }
    void customKey;

    for (const row of this.allStockItemsCache || []) {
      const rowIsService = this.isPosServiceSaleCategory(row);
      if (isServices !== rowIsService) {
        continue;
      }
      const cat = this.toTitleCase(String(row?.businessCategory || '').trim());
      if (cat.toLowerCase() !== from.toLowerCase()) {
        continue;
      }
      row.businessCategory = to || null;
      const id = Number(row?.id ?? row?.stockItemId);
      if (Number.isFinite(id) && id > 0) {
        this.api
          .updateStockItem(id, {
            ...row,
            businessCategory: to || null,
          })
          .subscribe({ next: () => undefined, error: () => undefined });
      }
    }
    for (const entry of this.posCatalogFrontEntries || []) {
      const entryIsService = this.isPosCatalogService(entry);
      if (isServices !== entryIsService) {
        continue;
      }
      if (this.toTitleCase(entry.category || '').toLowerCase() === from.toLowerCase()) {
        entry.category = to || 'Uncategorized';
        if (entry.sourceItem) {
          entry.sourceItem.businessCategory = to || null;
        }
      }
    }
    if (this.posSelectedCategory === from) {
      this.posSelectedCategory = to || 'All';
    }
  }

  /** Map a free-text category onto a known option value when casing differs. */
  private normalizePosProductCategory(raw: string | null | undefined): string {
    const current = this.toTitleCase(String(raw || '').trim());
    if (!current) {
      return '';
    }
    const match = this.posProductFormCategoryOptions(current).find(
      (c) => c.toLowerCase() === current.toLowerCase()
    );
    return match || current;
  }

  filteredPosCategories(): string[] {
    const q = (this.posCategorySearch || '').trim().toLowerCase();
    const options = this.posCategoryOptions();
    if (!q) {
      return options;
    }
    return options.filter((c) => c.toLowerCase().includes(q));
  }

  filteredPosFormCategories(currentCategory?: string | null): string[] {
    const q = (this.posFormCategorySearch || '').trim().toLowerCase();
    const options = this.posProductFormCategoryOptions(currentCategory);
    if (!q) {
      return options;
    }
    return options.filter((c) => c.toLowerCase().includes(q));
  }

  togglePosFormCategoryDropdown(event: Event, context: 'add' | 'edit'): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.posFormCategoryDropdownOpen && this.posFormCategoryContext === context) {
      this.closePosFormCategoryDropdown();
      return;
    }
    this.closePosFormUnitDropdown();
    this.posFormCategoryContext = context;
    this.posFormCategoryDropdownOpen = true;
    this.posFormAddingCategory = false;
    this.posFormNewCategoryName = '';
    this.posFormCategorySearch = '';
  }

  closePosFormCategoryDropdown(): void {
    this.posFormCategoryDropdownOpen = false;
    this.posFormCategoryContext = null;
    this.posFormAddingCategory = false;
    this.posFormNewCategoryName = '';
    this.posFormCategorySearch = '';
  }

  startAddPosFormCategory(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.posFormAddingCategory = true;
    this.posFormNewCategoryName = (this.posFormCategorySearch || '').trim();
  }

  confirmAddPosFormCategory(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const name = this.toTitleCase((this.posFormNewCategoryName || '').trim());
    if (!name) {
      return;
    }
    const kind = this.resolvePosFormCategoryKind();
    if (kind === 'services') {
      if (!this.posCustomServiceCategories.some((c) => c.toLowerCase() === name.toLowerCase())) {
        this.posCustomServiceCategories = [...this.posCustomServiceCategories, name];
      }
    } else if (!this.posCustomCategories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      this.posCustomCategories = [...this.posCustomCategories, name];
    }
    this.selectPosFormCategory(name);
  }

  selectPosFormCategory(category: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const value = category ? this.toTitleCase(String(category).trim()) : '';
    if (this.posFormCategoryContext === 'edit' && this.posProductEditDraft) {
      this.posProductEditDraft.businessCategory = value;
    } else if (this.posFormCategoryContext === 'add' && this.posAddProductDraft) {
      this.posAddProductDraft.businessCategory = value;
    }
    this.closePosFormCategoryDropdown();
  }

  posProductFormUnitOptions(currentUnit?: string | null): string[] {
    const units = new Set<string>();
    for (const u of this.posDefaultUnits) {
      if (u) units.add(u);
    }
    for (const p of this.buildPosCatalogProducts(false)) {
      const u = String(p.unitLabel || '').trim();
      if (u) units.add(u);
    }
    for (const custom of this.posCustomUnits) {
      const u = String(custom || '').trim();
      if (u) units.add(u);
    }
    const current = String(currentUnit || '').trim();
    if (current) units.add(current);
    return Array.from(units).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  filteredPosFormUnits(currentUnit?: string | null): string[] {
    const q = (this.posFormUnitSearch || '').trim().toLowerCase();
    const options = this.posProductFormUnitOptions(currentUnit);
    if (!q) {
      return options;
    }
    return options.filter((u) => u.toLowerCase().includes(q));
  }

  togglePosFormUnitDropdown(event: Event, context: 'add' | 'edit'): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.posFormUnitDropdownOpen && this.posFormUnitContext === context) {
      this.closePosFormUnitDropdown();
      return;
    }
    this.closePosFormCategoryDropdown();
    this.posFormUnitContext = context;
    this.posFormUnitDropdownOpen = true;
    this.posFormAddingUnit = false;
    this.posFormNewUnitName = '';
    this.posFormUnitSearch = '';
  }

  closePosFormUnitDropdown(): void {
    this.posFormUnitDropdownOpen = false;
    this.posFormUnitContext = null;
    this.posFormAddingUnit = false;
    this.posFormNewUnitName = '';
    this.posFormUnitSearch = '';
  }

  startAddPosFormUnit(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.posFormAddingUnit = true;
    this.posFormNewUnitName = (this.posFormUnitSearch || '').trim();
  }

  confirmAddPosFormUnit(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const name = String(this.posFormNewUnitName || '').trim();
    if (!name) {
      return;
    }
    if (!this.posCustomUnits.some((u) => u.toLowerCase() === name.toLowerCase())) {
      this.posCustomUnits = [...this.posCustomUnits, name];
    }
    this.selectPosFormUnit(name);
  }

  selectPosFormUnit(unit: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const value = String(unit || '').trim();
    if (this.posFormUnitContext === 'edit' && this.posProductEditDraft) {
      this.posProductEditDraft.unit = value;
    } else if (this.posFormUnitContext === 'add' && this.posAddProductDraft) {
      this.posAddProductDraft.unit = value;
    }
    this.closePosFormUnitDropdown();
  }

  onPosProductFormClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.otc-pos-form-category-dd') || target?.closest('.otc-pos-form-unit-dd')) {
      return;
    }
    if (this.posFormCategoryDropdownOpen) {
      this.closePosFormCategoryDropdown();
    }
    if (this.posFormUnitDropdownOpen) {
      this.closePosFormUnitDropdown();
    }
  }

  togglePosCategoryDropdown(event?: Event): void {
    event?.stopPropagation();
    this.posCategoryDropdownOpen = !this.posCategoryDropdownOpen;
    if (!this.posCategoryDropdownOpen) {
      this.posAddingCategory = false;
      this.posNewCategoryName = '';
      this.posCategorySearch = '';
    }
  }

  startAddPosCategory(): void {
    this.posAddingCategory = true;
    this.posNewCategoryName = '';
  }

  confirmAddPosCategory(): void {
    const name = this.toTitleCase((this.posNewCategoryName || '').trim());
    if (!name) {
      return;
    }
    const exists = this.posCategoryOptions().some((c) => c.toLowerCase() === name.toLowerCase());
    if (!exists) {
      if (this.posCatalogKind === 'services') {
        this.posCustomServiceCategories = [...this.posCustomServiceCategories, name];
      } else {
        this.posCustomCategories = [...this.posCustomCategories, name];
      }
    }
    this.selectPosCategory(name);
    this.posAddingCategory = false;
    this.posNewCategoryName = '';
  }

  @HostListener('document:click')
  onDocumentClickClosePosCategory(): void {
    if (this.posCategoryDropdownOpen) {
      this.posCategoryDropdownOpen = false;
      this.posAddingCategory = false;
      this.posNewCategoryName = '';
      this.posCategorySearch = '';
      this.cancelEditPosCategory();
    }
    if (this.posFormCategoryDropdownOpen) {
      this.closePosFormCategoryDropdown();
    }
    if (this.posFormUnitDropdownOpen) {
      this.closePosFormUnitDropdown();
    }
    if (this.posReceiveStoreDropdownOpen) {
      this.closePosReceiveStoreDropdown();
    }
    if (this.posClientPickerOpen) {
      this.posClientPickerOpen = false;
    }
  }

  selectPosCategory(category: string): void {
    this.posSelectedCategory = category || 'All';
    this.posCategoryDropdownOpen = false;
    this.posAddingCategory = false;
    this.posNewCategoryName = '';
    this.posCategorySearch = '';
  }

  posCatalogProducts(): Array<{
    key: string;
    name: string;
    description: string;
    category: string;
    price: number;
    unitLabel: string;
    stockQty: number;
    imageUrl: string | null;
    outOfStock: boolean;
    lowStock: boolean;
    sourceItem: any;
  }> {
    const built = this.buildPosCatalogProducts(true);
    const builtIds = new Set<number>();
    for (const p of built) {
      const id = this.resolvePosStockItemId(p.sourceItem);
      if (id != null) {
        builtIds.add(id);
      }
    }
    const q = (this.searchText || '').trim().toLowerCase();
    const selectedCat = (this.posSelectedCategory || 'All').trim();
    const front = this.posCatalogFrontEntries.filter((p) => {
      const id = this.resolvePosStockItemId(p.sourceItem);
      if (id != null && builtIds.has(id)) {
        return false;
      }
      const isService = this.isPosCatalogService(p);
      if (this.posCatalogKind === 'services' ? !isService : isService) {
        return false;
      }
      if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) {
        return false;
      }
      if (selectedCat !== 'All' && p.category !== selectedCat) {
        return false;
      }
      return true;
    });
    const merged = [...front, ...built];
    // Always newest → oldest so reload and in-session order stay the same.
    return [...merged].sort((a, b) => this.comparePosCatalogNewestFirst(a, b));
  }

  private buildPosCatalogProducts(
    applyCategoryFilter: boolean,
    kindOverride?: 'products' | 'services'
  ): Array<{
    key: string;
    name: string;
    description: string;
    category: string;
    price: number;
    unitLabel: string;
    stockQty: number;
    imageUrl: string | null;
    outOfStock: boolean;
    lowStock: boolean;
    sourceItem: any;
  }> {
    const q = (this.searchText || '').trim().toLowerCase();
    const selectedCat = (this.posSelectedCategory || 'All').trim();
    const catalogKind = kindOverride || this.posCatalogKind;
    const products: Array<{
      key: string;
      name: string;
      description: string;
      category: string;
      price: number;
      unitLabel: string;
      stockQty: number;
      imageUrl: string | null;
      outOfStock: boolean;
      lowStock: boolean;
      sourceItem: any;
    }> = [];

    if (this.pharmacyUseStockBatch) {
      const stockItems = Array.isArray(this.allStockItemsCache) ? this.allStockItemsCache : [];
      const groupByItemId = new Map<number, (typeof this.groupedStockItems)[0]>();
      for (const group of this.groupedStockItems || []) {
        const gid = Number(group.itemKey);
        if (Number.isFinite(gid) && gid > 0) {
          groupByItemId.set(gid, group);
        }
      }

      for (const stockItem of stockItems) {
        const stockItemId = Number(stockItem?.id ?? stockItem?.stockItemId);
        if (!Number.isFinite(stockItemId) || stockItemId <= 0) {
          continue;
        }
        const isService = this.isPosServiceSaleCategory(stockItem);
        if (catalogKind === 'services' ? !isService : isService) {
          continue;
        }
        const group = groupByItemId.get(stockItemId);
        const firstLine = group?.batchLines?.[0];
        let sourceItem: any = null;
        let stockQty = 0;

        if (firstLine?.storeDistribution?.length) {
          for (const dist of firstLine.storeDistribution) {
            const qty = this.num(dist?.item?.stockAtHand);
            if (dist?.item && qty > 0) {
              sourceItem = dist.item;
              stockQty = this.num(firstLine.totalStock) || qty;
              break;
            }
          }
        }
        if (!sourceItem && firstLine?.storeDistribution?.length) {
          sourceItem = firstLine.storeDistribution.find((d) => d?.item)?.item || null;
          stockQty = this.num(firstLine?.totalStock);
        }
        if (!sourceItem) {
          sourceItem =
            (this.itemList || []).find(
              (row) => Number(row?.stockItemId ?? row?.id) === stockItemId
            ) || null;
          stockQty = this.num(firstLine?.totalStock ?? sourceItem?.stockAtHand);
        }
        if (!sourceItem) {
          const models = firstLine?.sellingModels || [];
          sourceItem = {
            id: stockItemId,
            stockItemId,
            title: stockItem.stockItemName || stockItem.name,
            stockItemName: stockItem.stockItemName || stockItem.name,
            stockAtHand: 0,
            sellingPrice:
              this.num(models[0]?.unitSellingPrice) ||
              this.num(stockItem.sellingPrice ?? stockItem.unitSellingPrice),
            costPrice: this.num(stockItem.costPrice),
            businessCategory: stockItem.businessCategory,
            description: stockItem.description,
            unit: stockItem.unit || stockItem.unitShort,
            uintOfMeasure: stockItem.unit || stockItem.unitShort || 'pc',
            image: stockItem.image || stockItem.imageUrl || null,
            image2: stockItem.image2 || null,
            image3: stockItem.image3 || null,
            _stockBatchId: null,
          };
          stockQty = 0;
        } else {
          // Keep product identity on the source row (not batch id as product id).
          sourceItem = {
            ...sourceItem,
            stockItemId,
            id: stockItemId,
            stockItemName:
              stockItem.stockItemName ||
              stockItem.name ||
              sourceItem.stockItemName ||
              sourceItem.title,
            businessCategory:
              stockItem.businessCategory ||
              sourceItem.businessCategory ||
              sourceItem.categoryName,
            description: stockItem.description || sourceItem.description,
            image: stockItem.image || stockItem.imageUrl || sourceItem.image || sourceItem.imageUrl,
            image2: stockItem.image2 || sourceItem.image2,
            image3: stockItem.image3 || sourceItem.image3,
          };
          if (!(stockQty > 0) && group) {
            stockQty = (group.batchLines || []).reduce(
              (sum, line) => sum + this.num(line.totalStock),
              0
            );
          }
        }

        const isOutOfStock = !!group?.completelyOutOfStock || stockQty <= 0;
        const reorderLevel = this.num(stockItem?.reorderLevel ?? sourceItem?.reorderLevel);
        const models = firstLine?.sellingModels || [];
        const price =
          this.num(models[0]?.unitSellingPrice) ||
          this.num(sourceItem?.sellingPrice ?? sourceItem?.unitSellingPrice) ||
          this.num(stockItem.sellingPrice ?? stockItem.unitSellingPrice) ||
          0;
        const category = String(
          stockItem?.businessCategory ||
            stockItem?.categoryName ||
            stockItem?.itemCategoryName ||
            sourceItem?.itemCategoryName ||
            sourceItem?.categoryName ||
            sourceItem?.businessCategory ||
            sourceItem?.category ||
            ''
        ).trim();
        const name = this.toTitleCase(
          String(stockItem.stockItemName || stockItem.name || group?.stockItemName || '').trim() ||
            'Product'
        );
        if (q && !name.toLowerCase().includes(q) && !category.toLowerCase().includes(q)) {
          continue;
        }
        if (
          applyCategoryFilter &&
          selectedCat !== 'All' &&
          this.toTitleCase(category || 'Uncategorized') !== selectedCat
        ) {
          continue;
        }
        const sourceWithSale = {
          ...sourceItem,
          saleCategory: stockItem?.saleCategory || sourceItem?.saleCategory || null,
        };
        products.push({
          key: String(stockItemId),
          name,
          description:
            this.posProductDescriptionText(sourceWithSale) ||
            this.capitalizeFirstLetter(String(stockItem.description || '').trim()),
          category: this.toTitleCase(category || 'Uncategorized'),
          price,
          unitLabel:
            String(
              stockItem.unit ||
                stockItem.unitShort ||
                sourceItem?.uintOfMeasure ||
                sourceItem?.unitOfMeasure ||
                'pc'
            ).trim() || 'pc',
          stockQty: isService ? Math.max(stockQty, 1) : stockQty,
          imageUrl: this.posProductImageUrl(sourceWithSale, stockItemId),
          outOfStock: isService ? false : isOutOfStock,
          lowStock: isService ? false : this.isPosLowStock(stockQty, reorderLevel),
          sourceItem: sourceWithSale,
        });
      }
    } else {
      for (const item of this.filteredOtcItemList()) {
        const isService = this.isPosServiceSaleCategory(item);
        if (catalogKind === 'services' ? !isService : isService) {
          continue;
        }
        const name = this.toTitleCase(this.otcItemOptionLabel(item));
        const category = String(
          item?.itemCategoryName ||
            item?.categoryName ||
            item?.businessCategory ||
            item?.category ||
            ''
        ).trim();
        if (applyCategoryFilter && selectedCat !== 'All' && this.toTitleCase(category || 'Uncategorized') !== selectedCat) {
          continue;
        }
        const stockQty = this.num(item?.stockAtHand);
        const reorderLevel = this.num(item?.reorderLevel);
        const isOutOfStock = stockQty <= 0;
        products.push({
          key: String(item?.id ?? name),
          name,
          description: this.posProductDescriptionText(item),
          category: this.toTitleCase(category || 'Uncategorized'),
          price: this.num(item?.sellingPrice ?? item?.unitSellingPrice ?? item?.salePrice),
          unitLabel: String(item?.uintOfMeasure || item?.unitOfMeasure || 'pc').trim() || 'pc',
          stockQty: isService ? Math.max(stockQty, 1) : stockQty,
          imageUrl: this.posProductImageUrl(item, Number(item?.stockItemId ?? item?.id)),
          outOfStock: isService ? false : isOutOfStock,
          lowStock: isService ? false : this.isPosLowStock(stockQty, reorderLevel),
          sourceItem: item,
        });
      }
    }
    return products.sort((a, b) => this.comparePosCatalogNewestFirst(a, b));
  }

  /** Newest products first (higher stock-item id = more recently created). */
  private comparePosCatalogNewestFirst(
    a: { sourceItem?: any; key?: string; name?: string },
    b: { sourceItem?: any; key?: string; name?: string }
  ): number {
    const aid = this.resolvePosStockItemId(a?.sourceItem) ?? (Number(a?.key) || 0);
    const bid = this.resolvePosStockItemId(b?.sourceItem) ?? (Number(b?.key) || 0);
    if (bid !== aid) {
      return bid - aid;
    }
    return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
      sensitivity: 'base',
    });
  }

  /** True when on-hand qty is at or below reorder level (and still has some stock). */
  private isPosLowStock(stockQty: number, reorderLevel: number): boolean {
    return reorderLevel > 0 && stockQty > 0 && stockQty <= reorderLevel;
  }

  /** Product description for catalog cards (empty when none — do not fall back to stock text). */
  private posProductDescriptionText(sourceItem: any): string {
    const fromItem = String(sourceItem?.description ?? '').trim();
    if (fromItem) {
      return this.capitalizeFirstLetter(fromItem);
    }
    const id = this.resolvePosStockItemId(sourceItem);
    if (id != null) {
      const cached = this.posStockItemImageById.get(id)?.description;
      if (cached) {
        return this.capitalizeFirstLetter(cached);
      }
    }
    return '';
  }

  private capitalizeFirstLetter(value: string): string {
    const text = String(value || '').trim();
    if (!text) {
      return '';
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private posProductImageUrl(item: any, stockItemId?: number | null): string | null {
    const id = Number(
      stockItemId ?? item?.stockItemId ?? (this.pharmacyUseStockBatch ? item?.stockItemId : item?.id)
    );
    let local: string | null = null;
    let web: string | null = null;
    if (Number.isFinite(id) && id > 0) {
      const cached = this.posStockItemImageById.get(id);
      if (cached) {
        local = String(cached.imageLocal || '').trim() || null;
        web = String(cached.image || cached.image2 || cached.image3 || '').trim() || null;
      }
    }
    if (!local) {
      local =
        String(item?.imageLocal || item?.image_local || '').trim() || null;
    }
    if (!web) {
      web = String(
        item?.image || item?.imageUrl || item?.image_url || item?.image2 || item?.image3 || ''
      ).trim() || null;
    }
    const localAbs = this.api.resolveLocalProductImageUrl(local);
    if (localAbs) {
      return localAbs;
    }
    if (web && Number.isFinite(id) && id > 0) {
      this.ensurePosLocalImageCached(id, web, 1);
    }
    return web || null;
  }

  /** Prefer local folder URL for gallery display; fall back to web URL. */
  posProductImageDisplayUrl(index: number): string | null {
    const local = this.posProductImageLocalDrafts[index];
    const localAbs = this.api.resolveLocalProductImageUrl(local);
    if (localAbs) {
      return localAbs;
    }
    return this.posProductImageDrafts[index] || null;
  }

  onPosProductCardImageError(
    product: { imageUrl?: string | null; sourceItem?: any; key?: string },
    event: Event
  ): void {
    const img = event?.target as HTMLImageElement | null;
    if (!img) {
      return;
    }
    const id = this.resolvePosStockItemId(product?.sourceItem) || Number(product?.key);
    const web = String(
      product?.sourceItem?.image ||
        product?.sourceItem?.imageUrl ||
        this.posStockItemImageById.get(id)?.image ||
        ''
    ).trim();
    const current = String(img.getAttribute('src') || '').trim();
    const isLocalAttempt = current.includes('/stock-item/local-images/');
    if (isLocalAttempt && web) {
      img.src = web;
      if (Number.isFinite(id) && id > 0) {
        this.ensurePosLocalImageCached(id, web, 1);
      }
      return;
    }
    img.style.display = 'none';
  }

  private ensurePosLocalImageCached(
    stockItemId: number,
    webUrl: string,
    slot: 1 | 2 | 3 = 1
  ): void {
    const web = String(webUrl || '').trim();
    if (!web || !(web.startsWith('http://') || web.startsWith('https://'))) {
      return;
    }
    if (!Number.isFinite(stockItemId) || stockItemId <= 0) {
      return;
    }
    const cached = this.posStockItemImageById.get(stockItemId);
    const existingLocal =
      slot === 2 ? cached?.imageLocal2 : slot === 3 ? cached?.imageLocal3 : cached?.imageLocal;
    if (existingLocal) {
      return;
    }
    const key = `${stockItemId}:${slot}:${web}`;
    if (this.posLocalImageCacheInFlight.has(key)) {
      return;
    }
    this.posLocalImageCacheInFlight.add(key);
    this.api.cacheProductImageFromWebUrl(web, { stockItemId, slot }).subscribe({
      next: (saved) => {
        this.posLocalImageCacheInFlight.delete(key);
        const localUrl = String(saved?.localUrl || '').trim();
        if (!localUrl) {
          return;
        }
        const prev = this.posStockItemImageById.get(stockItemId);
        this.rememberPosStockItemImages(
          stockItemId,
          prev?.image || (slot === 1 ? web : null) || null,
          prev?.image2 || null,
          prev?.image3 || null,
          slot === 1 ? localUrl : prev?.imageLocal,
          slot === 2 ? localUrl : prev?.imageLocal2,
          slot === 3 ? localUrl : prev?.imageLocal3
        );
        if (this.showPosProductImagesModal && this.posProductImagesId === stockItemId) {
          const locals = [...this.posProductImageLocalDrafts];
          while (locals.length < this.posProductImageDrafts.length) {
            locals.push('');
          }
          const idx = slot - 1;
          if (idx >= 0 && idx < Math.max(locals.length, this.posProductImageDrafts.length)) {
            locals[idx] = localUrl;
            this.posProductImageLocalDrafts = locals;
            if (this.posProductImageActiveIndex === idx) {
              this.selectPosProductImage(idx);
            }
          }
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.posLocalImageCacheInFlight.delete(key);
      },
    });
  }

  onPosCatalogSearchChange(): void {
    this.onOtcDrugSearchChange();
  }

  isPosProductInCart(product: { sourceItem?: any }): boolean {
    const src = product?.sourceItem;
    if (!src) {
      return false;
    }
    if (this.pharmacyUseStockBatch) {
      const stockItemId = this.resolvePosStockItemId(src);
      if (stockItemId != null) {
        return this.otcOnlyCart.some(
          (c) => c.lineSource === 'OTC' && Number(c.itemId) === stockItemId
        );
      }
      const batchId = Number(src._stockBatchId);
      if (!Number.isFinite(batchId) || batchId <= 0) {
        return false;
      }
      return this.otcOnlyCart.some(
        (c) => c.lineSource === 'OTC' && Number(c.stockBatchId) === batchId
      );
    }
    const itemId = Number(src.id);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return false;
    }
    return this.otcOnlyCart.some(
      (c) =>
        c.lineSource === 'OTC' &&
        Number(c.itemId) === itemId &&
        (c.stockBatchId == null || Number(c.stockBatchId) <= 0)
    );
  }

  onPosCartIconClick(
    product: { outOfStock: boolean; sourceItem: any; price: number; name: string },
    event?: Event
  ): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.processing) {
      return;
    }
    // Products: block duplicate tap. Services: re-add increments qty in cart.
    if (this.isPosProductInCart(product) && !this.isPosCatalogService(product)) {
      this.flashStatus('Product is already in cart. Edit it from there.', true);
      return;
    }
    if (product.outOfStock && !this.isPosCatalogService(product)) {
      this.pendingOosAdd = { mode: 'quick', product };
      this.showPosOosConfirmModal = true;
      return;
    }
    this.quickAddPosProduct(product);
  }

  openPosProductDetail(
    product: {
      key: string;
      name: string;
      description: string;
      category: string;
      price: number;
      unitLabel: string;
      stockQty: number;
      imageUrl: string | null;
      outOfStock: boolean;
      sourceItem: any;
    },
    event?: Event
  ): void {
    event?.preventDefault();
    event?.stopPropagation();
    const resolvedSource =
      product?.sourceItem ||
      this.resolveCatalogSourceItemFallback(product?.key);
    if (!resolvedSource && !product) {
      return;
    }
    const openProduct = {
      ...product,
      sourceItem: resolvedSource || product.sourceItem,
    };
    this.posProductDetail = { ...openProduct };
    this.posProductDetailQty = 1;
    this.posProductDetailImageIndex = 0;
    this.posProductDetailImages = openProduct.imageUrl ? [openProduct.imageUrl] : [];
    // Show the page immediately from card data; enrich in the background.
    this.posProductDetailLoading = false;
    this.showPosProductDetail = true;
    document.body.style.overflow = 'hidden';
    this.cdr.markForCheck();

    const id = this.resolvePosStockItemId(openProduct.sourceItem) || Number(openProduct.key);
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }
    this.api.getStockItemById(id).subscribe({
      next: (res: any) => {
        if (!this.showPosProductDetail || !this.posProductDetail) {
          return;
        }
        const data = res?.data || res || {};
        const urls = [data.image || data.imageUrl, data.image2, data.image3]
          .map((u: any) => String(u || '').trim())
          .filter((u: string) => !!u)
          .slice(0, 3);
        if (urls.length) {
          this.posProductDetailImages = urls;
          this.rememberPosStockItemImages(id, urls[0] || null, urls[1] || null, urls[2] || null);
        }
        const desc = String(data.description || openProduct.description || '').trim();
        this.posProductDetail = {
          ...this.posProductDetail,
          description: desc,
          barcode: String(data.barcode || '').trim(),
          shelfNumber: String(data.shelfNumber || '').trim(),
          businessCategory: String(
            data.businessCategory || openProduct.category || ''
          ).trim(),
          unitLabel:
            String(data.unit || data.unitShort || openProduct.unitLabel || 'pc').trim() ||
            'pc',
          price:
            data.sellingPrice != null && Number(data.sellingPrice) > 0
              ? Number(data.sellingPrice)
              : openProduct.price,
          imageUrl: urls[0] || this.posProductDetail.imageUrl,
        };
        this.cdr.markForCheck();
      },
      error: () => {
        // Keep the fast card-data view; enrichment is optional.
        this.cdr.markForCheck();
      },
    });
  }

  /** Find any batch/shop row for a catalog key when storeDistribution was empty. */
  private resolveCatalogSourceItemFallback(key: string | number | null | undefined): any | null {
    const stockItemId = Number(key);
    if (!Number.isFinite(stockItemId) || stockItemId <= 0) {
      return null;
    }
    return (
      (this.itemList || []).find(
        (row) => Number(row?.stockItemId ?? row?.id) === stockItemId
      ) || null
    );
  }

  closePosProductDetail(): void {
    this.showPosProductDetail = false;
    this.posProductDetailLoading = false;
    this.posProductDetail = null;
    this.posProductDetailImages = [];
    this.posProductDetailImageIndex = 0;
    this.posProductDetailQty = 1;
    if (
      !this.showPosProductEditModal &&
      !this.showPosProductImagesModal &&
      !this.showPosOrderPickerModal &&
      !this.showReceiptModal &&
      !this.showPosReceiveStockModal &&
      !this.showPosOosConfirmModal
    ) {
      document.body.style.overflow = '';
    }
    this.cdr.markForCheck();
  }

  selectPosProductDetailImage(index: number): void {
    if (!this.posProductDetailImages.length) {
      this.posProductDetailImageIndex = 0;
      return;
    }
    this.posProductDetailImageIndex = Math.max(
      0,
      Math.min(index, this.posProductDetailImages.length - 1)
    );
  }

  posProductDetailImagePrev(): void {
    if (this.posProductDetailImages.length < 2) {
      return;
    }
    const n = this.posProductDetailImages.length;
    this.selectPosProductDetailImage((this.posProductDetailImageIndex - 1 + n) % n);
  }

  posProductDetailImageNext(): void {
    if (this.posProductDetailImages.length < 2) {
      return;
    }
    const n = this.posProductDetailImages.length;
    this.selectPosProductDetailImage((this.posProductDetailImageIndex + 1) % n);
  }

  get posProductDetailActiveImage(): string | null {
    return this.posProductDetailImages[this.posProductDetailImageIndex] || null;
  }

  adjustPosProductDetailQty(delta: number): void {
    const next = Math.max(1, Math.min(9999, (this.posProductDetailQty || 1) + delta));
    this.posProductDetailQty = next;
  }

  normalizePosProductDetailQty(): void {
    const n = Math.floor(Number(this.posProductDetailQty) || 1);
    this.posProductDetailQty = Math.max(1, Math.min(9999, n));
  }

  addPosProductDetailToCart(): void {
    const product = this.posProductDetail;
    if (!product?.sourceItem || this.processing) {
      return;
    }
    if (product.outOfStock) {
      this.pendingOosAdd = { mode: 'detail', product };
      this.showPosOosConfirmModal = true;
      return;
    }
    this.commitPosProductDetailToCart();
  }

  confirmPosOosAddToCart(): void {
    const pending = this.pendingOosAdd;
    this.showPosOosConfirmModal = false;
    this.pendingOosAdd = null;
    if (!pending?.product) {
      return;
    }
    // Always add the confirmed product — never re-check stock at hand.
    if (pending.mode === 'detail') {
      if (!this.posProductDetail) {
        this.posProductDetail = { ...pending.product };
      } else {
        this.posProductDetail = {
          ...this.posProductDetail,
          ...pending.product,
          sourceItem: pending.product.sourceItem || this.posProductDetail.sourceItem,
          outOfStock: true,
        };
      }
      this.commitPosProductDetailToCart(true);
      return;
    }
    this.quickAddPosProduct(pending.product, true);
  }

  cancelPosOosAddToCart(): void {
    this.showPosOosConfirmModal = false;
    this.pendingOosAdd = null;
  }

  private commitPosProductDetailToCart(oosConfirmed = false): void {
    const product = this.posProductDetail;
    if (!product || this.processing) {
      return;
    }
    let source = product.sourceItem || this.resolveCatalogSourceItemFallback(product.key);
    if (!source) {
      this.flashStatus('Could not add product — missing stock item.', true);
      return;
    }
    const isService =
      this.isPosCatalogService(product) || this.isPosServiceSaleCategory(source);
    source = this.ensurePosCartSourceItem(source, product);
    const qty = Math.max(1, Math.floor(Number(this.posProductDetailQty) || 1));
    if (this.pharmacyUseStockBatch) {
      this.selectOtcBatch(source);
    } else {
      this.selectOtcItem(source);
    }
    // OOS / missing batch / service: force selection ids so addToSaleList can proceed.
    if (oosConfirmed || product.outOfStock || isService) {
      this.ensurePosSelectionIds(source, product);
    }
    if (isService) {
      this.currentStockBatchId = null;
      this.availableQuantity = Math.max(1, Number(this.availableQuantity) || 1);
    }
    if (product.price > 0 && !(Number(this.itemSellingPrice) > 0)) {
      this.applyUnitSellingModelPrice(product.price);
    }
    this.currentTreatmentRequested.quantity = qty;
    this.calculateTotal();
    const unitPrice = Number(this.itemSellingPrice) || product.price || 0;
    this.addToSaleList({
      quantity: qty,
      totalAmount: Math.round(unitPrice * qty * 100) / 100,
      allowOutOfStock: true,
    });
    if (!this.posCartPanelVisible) {
      this.posCartPanelVisible = true;
    }
    this.closePosProductDetail();
  }

  /** Ensure batch/shop ids exist for cart add even when stock is zero. */
  private ensurePosCartSourceItem(source: any, product?: { key?: string; name?: string; price?: number }): any {
    if (!source) {
      return source;
    }
    const next = { ...source };
    if (this.pharmacyUseStockBatch && !(Number(next._stockBatchId) > 0)) {
      const stockItemId = Number(next.stockItemId ?? next.id ?? product?.key);
      const match = (this.itemList || []).find(
        (row) =>
          Number(row?.stockItemId ?? row?.id) === stockItemId &&
          Number(row?._stockBatchId) > 0
      );
      if (match) {
        return { ...match, stockAtHand: Number(match.stockAtHand ?? 0) };
      }
      // Synthetic zero-stock line without a batch id — use stock item id only.
      next.stockItemId = stockItemId;
      next.id = stockItemId;
      next.title = next.title || product?.name || 'Product';
      next.sellingPrice = Number(next.sellingPrice ?? product?.price ?? 0);
      next.stockAtHand = Number(next.stockAtHand ?? 0);
    }
    return next;
  }

  private ensurePosSelectionIds(source: any, product?: { key?: string; name?: string; price?: number }): void {
    const stockItemId = Number(
      source?.stockItemId ?? source?.id ?? product?.key
    );
    if (Number.isFinite(stockItemId) && stockItemId > 0) {
      this.currentItemId = stockItemId;
    }
    if (this.pharmacyUseStockBatch) {
      const batchId = Number(source?._stockBatchId);
      if (Number.isFinite(batchId) && batchId > 0) {
        this.currentStockBatchId = batchId;
      } else if (!this.currentStockBatchId) {
        // Allow cart line keyed by item when no batch exists for OOS.
        this.currentStockBatchId = null;
      }
    }
    if (!(Number(this.itemSellingPrice) > 0) && product?.price) {
      this.itemSellingPrice = Number(product.price) || 0;
    }
    if (!this.currentStockItemName) {
      this.currentStockItemName = String(source?.title || product?.name || 'Product');
      this.currentItem = this.currentStockItemName;
    }
    this.availableQuantity = Number(source?.stockAtHand ?? 0);
  }

  editFromPosProductDetail(): void {
    const product = this.posProductDetail;
    if (!product) {
      return;
    }
    this.closePosProductDetail();
    this.openPosProductEditModal(product);
  }

  manageImagesFromPosProductDetail(): void {
    const product = this.posProductDetail;
    if (!product) {
      return;
    }
    this.closePosProductDetail();
    this.openPosProductImagesModal(product);
  }

  private resolvePosStockItemId(sourceItem: any): number | null {
    if (!sourceItem) {
      return null;
    }
    const n = Number(
      sourceItem.stockItemId ??
        (!this.pharmacyUseStockBatch ? sourceItem.id : null) ??
        (this.pharmacyUseStockBatch && !(Number(sourceItem._stockBatchId) > 0)
          ? sourceItem.id
          : null)
    );
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
    // Mapped batch rows set id = stockItemId when available.
    if (this.pharmacyUseStockBatch) {
      const fromId = Number(sourceItem.id);
      const batchId = Number(sourceItem._stockBatchId);
      if (Number.isFinite(fromId) && fromId > 0 && fromId !== batchId) {
        return fromId;
      }
    }
    return null;
  }

  openPosProductEditModal(
    product: { name: string; sourceItem: any },
    event?: Event
  ): void {
    event?.preventDefault();
    event?.stopPropagation();
    const id = this.resolvePosStockItemId(product?.sourceItem);
    if (!id) {
      this.flashStatus('Cannot edit this product — missing stock item id.', true);
      return;
    }
    this.posProductEditId = id;
    this.posProductEditDraft = null;
    this.posProductEditLoading = true;
    this.showPosProductEditModal = true;
    document.body.style.overflow = 'hidden';
    this.api.getStockItemById(id).subscribe({
      next: (res: any) => {
        const data = res?.data || res || {};
        const modelIdRaw = data.unitSellingModelId ?? data.unit_selling_model_id ?? null;
        const modelIdNum = modelIdRaw != null ? Number(modelIdRaw) : NaN;
        this.posProductEditDraft = {
          stockItemName: String(data.stockItemName || product.name || '').trim(),
          description: String(data.description || '').trim(),
          barcode: String(data.barcode || '').trim(),
          businessCategory: this.normalizePosProductCategory(data.businessCategory),
          saleCategory: data.saleCategory || product?.sourceItem?.saleCategory || null,
          unit: String(data.unit || data.unitShort || '').trim(),
          costPrice: data.costPrice != null ? Number(data.costPrice) : null,
          sellingPrice: data.sellingPrice != null ? Number(data.sellingPrice) : null,
          unitSellingModelId: Number.isFinite(modelIdNum) && modelIdNum > 0 ? modelIdNum : null,
          useUnitSellingModel:
            data.useUnitSellingModel === false || data.use_unit_selling_model === false
              ? false
              : data.useUnitSellingModel === true ||
                  data.use_unit_selling_model === true ||
                  (Number.isFinite(modelIdNum) && modelIdNum > 0),
          reorderLevel: data.reorderLevel != null ? Number(data.reorderLevel) : null,
          restockTo: data.restockTo != null ? Number(data.restockTo) : null,
          shelfNumber: String(data.shelfNumber || '').trim(),
          image: data.image || data.imageUrl || null,
          image2: data.image2 || null,
          image3: data.image3 || null,
        };
        this.posProductEditLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.posProductEditLoading = false;
        this.closePosProductEditModal();
        this.flashStatus('Could not load product for editing.', true);
      },
    });
  }

  closePosProductEditModal(): void {
    this.showPosProductEditModal = false;
    this.posProductEditLoading = false;
    this.posProductEditSaving = false;
    this.posProductEditId = null;
    this.posProductEditDraft = null;
    this.closePosFormCategoryDropdown();
    this.closePosFormUnitDropdown();
    document.body.style.overflow = '';
  }

  /** 13-digit barcode-style SKU, unique per new product. */
  private generatePosProductSku(): string {
    const stamp = Date.now().toString();
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const body = (stamp + rand).slice(-12);
    let sum = 0;
    for (let i = 0; i < body.length; i++) {
      const digit = Number(body.charAt(i));
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const check = (10 - (sum % 10)) % 10;
    return body + String(check);
  }

  openPosAddProductModal(): void {
    this.posAddPendingSellModel = null;
    this.posAddModalKind = this.posCatalogKind === 'services' ? 'service' : 'product';
    const isService = this.posAddModalKind === 'service';
    this.posAddProductDraft = {
      stockItemName: '',
      description: '',
      sku: isService ? '' : this.generatePosProductSku(),
      barcode: '',
      businessCategory:
        this.posSelectedCategory !== 'All'
          ? this.normalizePosProductCategory(this.posSelectedCategory)
          : '',
      unit: 'pc',
      costPrice: null,
      sellingPrice: null,
      unitSellingModelId: null,
      useUnitSellingModel: true,
      reorderLevel: isService ? 0 : null,
      restockTo: isService ? 0 : null,
      shelfNumber: '',
    };
    this.posAddProductSaving = false;
    this.posAddProductAllowSimilar = false;
    this.showPosSimilarProductModal = false;
    this.posSimilarProductNames = [];
    this.closePosFormCategoryDropdown();
    this.closePosFormUnitDropdown();
    this.showPosAddProductModal = true;
    document.body.style.overflow = 'hidden';
  }

  closePosAddProductModal(): void {
    this.showPosAddProductModal = false;
    this.posAddProductSaving = false;
    this.posAddProductDraft = null;
    this.posAddModalKind = 'product';
    this.posAddPendingSellModel = null;
    this.posAddProductAllowSimilar = false;
    this.showPosSimilarProductModal = false;
    this.posSimilarProductNames = [];
    this.closePosFormCategoryDropdown();
    this.closePosFormUnitDropdown();
    document.body.style.overflow = '';
  }

  onPosProductEditSellModelSelected(model: { id?: number; unitSellingPrice?: number } | null): void {
    const d = this.posProductEditDraft;
    if (!d) {
      return;
    }
    if (model?.id != null && Number(model.id) > 0) {
      d.unitSellingModelId = Number(model.id);
    }
    const price = Number(model?.unitSellingPrice);
    if (Number.isFinite(price) && price >= 0) {
      d.sellingPrice = price;
    }
  }

  onPosProductEditSellModelPriceChange(price: number): void {
    const d = this.posProductEditDraft;
    if (!d) {
      return;
    }
    const n = Number(price);
    if (Number.isFinite(n) && n >= 0) {
      d.sellingPrice = n;
    }
  }

  onPosAddProductSellModelSelected(
    model: {
      id?: number;
      name?: string;
      unitsInBundle?: number;
      bundlePrice?: number;
      unitSellingPrice?: number;
      isDraft?: boolean;
    } | null
  ): void {
    const d = this.posAddProductDraft;
    if (!d) {
      return;
    }
    this.posAddPendingSellModel = model
      ? {
          id: model.id,
          name: model.name,
          unitsInBundle: model.unitsInBundle,
          bundlePrice: model.bundlePrice,
          unitSellingPrice: model.unitSellingPrice,
          isDraft: model.isDraft === true || (model.id != null && Number(model.id) < 0),
        }
      : null;
    if (model?.id != null && Number(model.id) > 0) {
      d.unitSellingModelId = Number(model.id);
    } else if (model?.id != null && Number(model.id) < 0) {
      d.unitSellingModelId = Number(model.id);
    } else {
      d.unitSellingModelId = null;
    }
    const price = Number(model?.unitSellingPrice);
    if (Number.isFinite(price) && price >= 0) {
      d.sellingPrice = price;
    }
  }

  onPosAddProductSellModelPriceChange(price: number): void {
    const d = this.posAddProductDraft;
    if (!d) {
      return;
    }
    const n = Number(price);
    if (Number.isFinite(n) && n >= 0) {
      d.sellingPrice = n;
      if (this.posAddPendingSellModel) {
        this.posAddPendingSellModel = {
          ...this.posAddPendingSellModel,
          unitSellingPrice: n,
        };
      }
    }
  }

  private persistPosAddDraftSellModel(stockItemId: number, sellingPrice: number): void {
    if (this.posAddProductDraft?.useUnitSellingModel === false) {
      this.posAddPendingSellModel = null;
      return;
    }
    const pending = this.posAddPendingSellModel;
    const unitSell =
      Number(pending?.unitSellingPrice) > 0
        ? Number(pending!.unitSellingPrice)
        : sellingPrice > 0
          ? sellingPrice
          : 0;
    if (!(unitSell > 0)) {
      return;
    }
    const units =
      Number(pending?.unitsInBundle) > 0 ? Math.trunc(Number(pending!.unitsInBundle)) : 1;
    const bundle =
      Number(pending?.bundlePrice) > 0 ? Number(pending!.bundlePrice) : unitSell * units;
    const name = String(pending?.name || 'Retail').trim() || 'Retail';
    this.api
      .createUnitSellingModel(stockItemId, {
        name,
        unitsInBundle: units,
        bundlePrice: bundle,
        unitSellingPrice: unitSell,
      })
      .subscribe({
        next: () => undefined,
        error: () => undefined,
      });
  }

  savePosAddProduct(): void {
    if (!this.posAddProductDraft || this.posAddProductSaving) {
      return;
    }
    const itemLabel = this.posAddModalKind === 'service' ? 'Service' : 'Product';
    const name = String(this.posAddProductDraft.stockItemName || '').trim();
    if (!name) {
      this.flashStatus(`${itemLabel} name is required.`, true);
      return;
    }

    const exact = this.findPosStockItemByExactName(name);
    if (exact) {
      this.flashStatus(`${itemLabel} already exists.`, true);
      return;
    }

    if (!this.posAddProductAllowSimilar) {
      const similar = this.findPosStockItemsWithSimilarName(name);
      if (similar.length) {
        this.posSimilarProductNames = similar
          .map((row) => String(row.stockItemName || row.name || '').trim())
          .filter(Boolean)
          .slice(0, 8);
        this.showPosSimilarProductModal = true;
        return;
      }
    }

    this.commitPosAddProduct();
  }

  cancelPosSimilarProductAdd(): void {
    this.showPosSimilarProductModal = false;
    this.posSimilarProductNames = [];
    this.posAddProductAllowSimilar = false;
  }

  confirmPosSimilarProductAdd(): void {
    this.showPosSimilarProductModal = false;
    this.posAddProductAllowSimilar = true;
    this.commitPosAddProduct();
  }

  private normalizePosProductNameKey(name: string): string {
    return String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private findPosStockItemByExactName(name: string): any | null {
    const key = this.normalizePosProductNameKey(name);
    if (!key) {
      return null;
    }
    return (
      (this.allStockItemsCache || []).find(
        (row) => this.normalizePosProductNameKey(row?.stockItemName || row?.name) === key
      ) || null
    );
  }

  private findPosStockItemsWithSimilarName(name: string): any[] {
    const key = this.normalizePosProductNameKey(name);
    if (!key || key.length < 2) {
      return [];
    }
    return (this.allStockItemsCache || []).filter((row) => {
      const other = this.normalizePosProductNameKey(row?.stockItemName || row?.name);
      if (!other || other === key) {
        return false;
      }
      return this.posProductNamesAreSimilar(key, other);
    });
  }

  private posProductNamesAreSimilar(a: string, b: string): boolean {
    if (!a || !b) {
      return false;
    }
    const shorter = a.length <= b.length ? a : b;
    const longer = a.length <= b.length ? b : a;
    // One name contains the other (e.g. "soap" vs "bath soap")
    if (shorter.length >= 3 && longer.includes(shorter)) {
      return true;
    }
    const distance = this.levenshteinDistance(a, b);
    const maxLen = Math.max(a.length, b.length);
    const threshold = Math.max(2, Math.floor(maxLen * 0.25));
    return distance > 0 && distance <= threshold;
  }

  private levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (!m) {
      return n;
    }
    if (!n) {
      return m;
    }
    const prev = new Array<number>(n + 1);
    const curr = new Array<number>(n + 1);
    for (let j = 0; j <= n; j++) {
      prev[j] = j;
    }
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      const ca = a.charCodeAt(i - 1);
      for (let j = 1; j <= n; j++) {
        const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j <= n; j++) {
        prev[j] = curr[j];
      }
    }
    return prev[n];
  }

  private mirrorPosServiceToProcedureCatalog(
    name: string,
    categoryLabel: string,
    description: string,
    sellingPrice: number,
    costPrice: number
  ): void {
    const catName = this.toTitleCase(String(categoryLabel || 'General Services').trim()) || 'General Services';
    const resolveCategoryId = (cat: any): number | null => {
      const id = Number(cat?.id ?? cat?.procedureCategoryId ?? cat?.categoryId);
      return Number.isFinite(id) && id > 0 ? id : null;
    };
    const categoryLabelOf = (cat: any): string =>
      String(cat?.name || cat?.procedureCategory || cat?.categoryName || '').trim();

    this.api
      .getAllCategories()
      .pipe(
        catchError(() => of([])),
        switchMap((cats: any) => {
          const list = Array.isArray(cats) ? cats : [];
          const match = list.find(
            (c) => categoryLabelOf(c).toLowerCase() === catName.toLowerCase()
          );
          if (match) {
            return of(match);
          }
          return this.api
            .saveNewCategory({
              name: catName,
              description: '',
              parentId: null,
              procedureCategory: catName,
              categoryDescription: '',
            })
            .pipe(
              map((res: any) => res?.data ?? res?.entity ?? res),
              catchError(() => of({ name: catName, procedureCategory: catName }))
            );
        }),
        switchMap((cat: any) => {
          const categoryId = resolveCategoryId(cat);
          const payload: any = {
            procedureName: name,
            category: catName,
            categoryId,
            parentCategoryId: null,
            unitSellingPrice: sellingPrice > 0 ? sellingPrice : 0,
            unitCostPrice: costPrice > 0 ? costPrice : 0,
            description: description || '',
          };
          if (sellingPrice > 0) {
            payload.initialUnitSellingModel = {
              name: 'Retail',
              unitsInBundle: 1,
              bundlePrice: sellingPrice,
              unitSellingPrice: sellingPrice,
            };
          }
          return this.api.saveNewService(payload);
        }),
        catchError((err) => {
          console.warn('Could not mirror POS service to Services Management', err);
          return of(null);
        })
      )
      .subscribe({
        next: (res) => {
          if (res) {
            // Soft confirmation — POS catalog already updated via StockItem.
            console.log('POS service mirrored to Services Management', res);
          }
        },
      });
  }

  private commitPosAddProduct(): void {
    if (!this.posAddProductDraft || this.posAddProductSaving) {
      return;
    }
    const isService = this.posAddModalKind === 'service';
    const itemLabel = isService ? 'Service' : 'Product';
    const name = String(this.posAddProductDraft.stockItemName || '').trim();
    if (!name) {
      this.flashStatus(`${itemLabel} name is required.`, true);
      return;
    }
    // Re-check exact name in case catalog refreshed while the warning was open.
    if (this.findPosStockItemByExactName(name)) {
      this.posAddProductAllowSimilar = false;
      this.flashStatus(`${itemLabel} already exists.`, true);
      return;
    }
    this.posAddProductSaving = true;
    const unit = String(this.posAddProductDraft.unit || '').trim() || 'pc';
    const category = String(this.posAddProductDraft.businessCategory || '').trim();
    const description = String(this.posAddProductDraft.description || '').trim();
    const sellingPrice = this.num(this.posAddProductDraft.sellingPrice);
    const restockTo = isService ? 0 : this.num(this.posAddProductDraft.restockTo);
    const reorderLevel = isService ? 0 : this.num(this.posAddProductDraft.reorderLevel);
    const stockQty = isService ? 1 : 0;
    const payload: any = {
      stockItemName: name,
      description: description || null,
      sku: isService ? null : (String(this.posAddProductDraft.sku || '').trim() || this.generatePosProductSku()),
      barcode: this.posAddProductDraft.barcode || null,
      shelfNumber: isService ? null : this.posAddProductDraft.shelfNumber || null,
      businessCategory: category || null,
      saleCategory: isService ? 'Service' : 'Retail',
      unit,
      unitShort: unit,
      costPrice: this.num(this.posAddProductDraft.costPrice),
      sellingPrice,
      useUnitSellingModel: this.posAddProductDraft.useUnitSellingModel !== false,
      stockQty,
      reorderLevel,
      restockTo,
      image: null,
      image2: null,
      image3: null,
      ingredients: [],
      createOnly: true,
    };
    this.api.createOrUpdateStockItem(payload).subscribe({
      next: (res: any) => {
        const data = res?.data || res || {};
        const id = Number(data.id ?? data.stockItemId);
        if (!Number.isFinite(id) || id <= 0) {
          this.posAddProductSaving = false;
          this.posAddProductAllowSimilar = false;
          this.flashStatus(
            `Server did not return a ${itemLabel.toLowerCase()} id — it may not have been saved. Try again.`,
            true
          );
          return;
        }
        this.persistPosAddDraftSellModel(id, sellingPrice);
        const categoryLabel = this.toTitleCase(category || 'Uncategorized');
        const sourceItem = {
          ...(typeof data === 'object' && data ? data : {}),
          id,
          stockItemId: id,
          stockItemName: name,
          description: description || null,
          businessCategory: category || null,
          saleCategory: isService ? 'Service' : 'Retail',
          unit,
          unitShort: unit,
          sellingPrice,
          stockAtHand: stockQty,
          stockQty,
          sku: this.posAddProductDraft?.sku || data.sku || null,
          barcode: this.posAddProductDraft?.barcode || null,
          shelfNumber: isService ? null : this.posAddProductDraft?.shelfNumber || null,
          costPrice: this.num(this.posAddProductDraft?.costPrice),
          reorderLevel,
          restockTo,
        };
        this.upsertAllStockItemsCache(sourceItem);
        const entry = {
          key: String(id),
          name: this.toTitleCase(name),
          description: this.capitalizeFirstLetter(description || ''),
          category: categoryLabel,
          price: sellingPrice,
          unitLabel: unit,
          stockQty,
          imageUrl: null as string | null,
          outOfStock: isService ? false : true,
          lowStock: false,
          sourceItem,
        };
        this.posCatalogPinIds = [id, ...this.posCatalogPinIds.filter((x) => x !== id)];
        this.posCatalogFrontEntries = [
          entry,
          ...this.posCatalogFrontEntries.filter(
            (e) => this.resolvePosStockItemId(e.sourceItem) !== id
          ),
        ];
        if (category) {
          if (isService) {
            if (
              !this.posCustomServiceCategories.some(
                (c) => c.toLowerCase() === categoryLabel.toLowerCase()
              )
            ) {
              this.posCustomServiceCategories = [...this.posCustomServiceCategories, categoryLabel];
            }
          } else if (
            !this.posCustomCategories.some((c) => c.toLowerCase() === categoryLabel.toLowerCase())
          ) {
            this.posCustomCategories = [...this.posCustomCategories, categoryLabel];
          }
        }
        this.posCatalogKind = isService ? 'services' : 'products';
        if (category) {
          this.posSelectedCategory = categoryLabel;
        }
        const costForMirror = this.num(this.posAddProductDraft?.costPrice);
        this.posAddProductSaving = false;
        this.posAddProductAllowSimilar = false;
        this.closePosAddProductModal();
        this.flashStatus(`${itemLabel} added.`, false);
        if (isService) {
          this.mirrorPosServiceToProcedureCatalog(
            name,
            categoryLabel,
            description,
            sellingPrice,
            costForMirror
          );
        }
        this.loadPharmacyStock();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.posAddProductSaving = false;
        this.posAddProductAllowSimilar = false;
        const status = Number(err?.status);
        if (status === 409) {
          this.flashStatus(`${itemLabel} already exists.`, true);
          return;
        }
        this.flashStatus(
          this.extractApiErrorMessage(err, `Could not add ${itemLabel.toLowerCase()}.`),
          true
        );
      },
    });
  }

  savePosProductEdit(): void {
    if (!this.posProductEditId || !this.posProductEditDraft || this.posProductEditSaving) {
      return;
    }
    const name = String(this.posProductEditDraft.stockItemName || '').trim();
    if (!name) {
      this.flashStatus('Product name is required.', true);
      return;
    }
    this.posProductEditSaving = true;
    const description = String(this.posProductEditDraft.description || '').trim();
    const payload: any = {
      stockItemName: name,
      description: description || null,
      barcode: this.posProductEditDraft.barcode || null,
      shelfNumber: this.isPosServiceSaleCategory(this.posProductEditDraft)
        ? null
        : this.posProductEditDraft.shelfNumber || null,
      businessCategory: this.posProductEditDraft.businessCategory || null,
      saleCategory: this.posProductEditDraft.saleCategory || null,
      unit: this.posProductEditDraft.unit || null,
      unitShort: this.posProductEditDraft.unit || null,
      costPrice: this.num(this.posProductEditDraft.costPrice),
      sellingPrice: this.num(this.posProductEditDraft.sellingPrice),
      useUnitSellingModel: this.posProductEditDraft.useUnitSellingModel !== false,
      reorderLevel: this.isPosServiceSaleCategory(this.posProductEditDraft)
        ? 0
        : this.num(this.posProductEditDraft.reorderLevel),
      restockTo: this.isPosServiceSaleCategory(this.posProductEditDraft)
        ? 0
        : this.num(this.posProductEditDraft.restockTo),
      image: this.posProductEditDraft.image || null,
      image2: this.posProductEditDraft.image2 || null,
      image3: this.posProductEditDraft.image3 || null,
      ingredients: [],
    };
    this.api.updateStockItem(this.posProductEditId, payload).subscribe({
      next: (res: any) => {
        this.posProductEditSaving = false;
        const id = this.posProductEditId!;
        const data = res?.data || res || {};
        const prev = this.posStockItemImageById.get(id);
        this.posStockItemImageById.set(id, {
          image: prev?.image || this.posProductEditDraft?.image || null,
          image2: prev?.image2 || this.posProductEditDraft?.image2 || null,
          image3: prev?.image3 || this.posProductEditDraft?.image3 || null,
          imageLocal: prev?.imageLocal || null,
          imageLocal2: prev?.imageLocal2 || null,
          imageLocal3: prev?.imageLocal3 || null,
          description: description || null,
        });
        this.upsertAllStockItemsCache({
          ...(typeof data === 'object' && data ? data : {}),
          id,
          stockItemId: id,
          stockItemName: name,
          description: description || null,
          barcode: this.posProductEditDraft?.barcode || null,
          shelfNumber: this.posProductEditDraft?.shelfNumber || null,
          businessCategory: this.posProductEditDraft?.businessCategory || null,
          unit: this.posProductEditDraft?.unit || null,
          unitShort: this.posProductEditDraft?.unit || null,
          costPrice: this.num(this.posProductEditDraft?.costPrice),
          sellingPrice: this.num(this.posProductEditDraft?.sellingPrice),
          reorderLevel: this.num(this.posProductEditDraft?.reorderLevel),
          restockTo: this.num(this.posProductEditDraft?.restockTo),
          image: prev?.image || this.posProductEditDraft?.image || null,
          image2: prev?.image2 || this.posProductEditDraft?.image2 || null,
          image3: prev?.image3 || this.posProductEditDraft?.image3 || null,
        });
        this.closePosProductEditModal();
        this.flashStatus('Product updated.', false);
        this.loadPharmacyStock();
      },
      error: (err) => {
        this.posProductEditSaving = false;
        this.flashStatus(this.extractApiErrorMessage(err, 'Could not update product.'), true);
      },
    });
  }

  openPosProductImagesModal(
    product: { name: string; sourceItem: any },
    event?: Event
  ): void {
    event?.preventDefault();
    event?.stopPropagation();
    const id = this.resolvePosStockItemId(product?.sourceItem);
    if (!id) {
      this.flashStatus('Cannot manage images — missing stock item id.', true);
      return;
    }
    this.posProductImagesId = id;
    this.posProductImagesName = this.toTitleCase(product?.name || 'Product');
    this.posProductImageDrafts = [];
    this.posProductImageLocalDrafts = [];
    this.posProductImageActiveIndex = 0;
    this.posProductImageZoomUrl = null;
    this.showPosProductImageFullscreen = false;
    this.posProductImagesFullDraft = null;
    this.showPosProductImagesModal = true;
    document.body.style.overflow = 'hidden';
    this.api.getStockItemById(id).subscribe({
      next: (res: any) => {
        const data = res?.data || res || {};
        this.posProductImagesFullDraft = { ...data };
        const urls = [data.image || data.imageUrl, data.image2, data.image3]
          .map((u: any) => String(u || '').trim())
          .filter((u: string) => !!u)
          .slice(0, 3);
        const locals = [data.imageLocal, data.imageLocal2, data.imageLocal3]
          .map((u: any) => String(u || '').trim());
        this.posProductImageDrafts = urls;
        this.posProductImageLocalDrafts = urls.map((_, i) => locals[i] || '');
        // Backfill missing local copies from web URLs.
        urls.forEach((web, i) => {
          if (web && !this.posProductImageLocalDrafts[i]) {
            this.ensurePosLocalImageCached(id, web, (i + 1) as 1 | 2 | 3);
          }
        });
        this.selectPosProductImage(0);
        this.cdr.markForCheck();
      },
      error: () => {
        this.closePosProductImagesModal();
        this.flashStatus('Could not load product images.', true);
      },
    });
  }

  closePosProductImagesModal(): void {
    this.showPosProductImagesModal = false;
    this.posProductImagesId = null;
    this.posProductImagesName = '';
    this.posProductImageDrafts = [];
    this.posProductImageLocalDrafts = [];
    this.posProductImageActiveIndex = 0;
    this.posProductImageZoomUrl = null;
    this.showPosProductImageFullscreen = false;
    this.posProductImageUploading = false;
    this.posProductImageUploadProgress = 0;
    this.posProductImageSaving = false;
    this.posProductImagesFullDraft = null;
    document.body.style.overflow = '';
  }

  selectPosProductImage(index: number): void {
    if (!this.posProductImageDrafts.length) {
      this.posProductImageActiveIndex = 0;
      this.posProductImageZoomUrl = null;
      return;
    }
    const i = Math.max(0, Math.min(index, this.posProductImageDrafts.length - 1));
    this.posProductImageActiveIndex = i;
    this.posProductImageZoomUrl = this.posProductImageDisplayUrl(i);
  }

  posProductImagePrev(): void {
    if (this.posProductImageDrafts.length < 2) {
      return;
    }
    const next =
      (this.posProductImageActiveIndex - 1 + this.posProductImageDrafts.length) %
      this.posProductImageDrafts.length;
    this.selectPosProductImage(next);
  }

  posProductImageNext(): void {
    if (this.posProductImageDrafts.length < 2) {
      return;
    }
    const next = (this.posProductImageActiveIndex + 1) % this.posProductImageDrafts.length;
    this.selectPosProductImage(next);
  }

  openPosProductImageFullscreen(): void {
    if (!this.posProductImageZoomUrl) {
      return;
    }
    this.showPosProductImageFullscreen = true;
  }

  closePosProductImageFullscreen(): void {
    this.showPosProductImageFullscreen = false;
  }

  @HostListener('document:keydown', ['$event'])
  onPosGalleryFullscreenKeydown(event: KeyboardEvent): void {
    if (!this.showPosProductImageFullscreen) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closePosProductImageFullscreen();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.posProductImagePrev();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.posProductImageNext();
    }
  }

  zoomPosProductImage(url: string): void {
    const idx = this.posProductImageDrafts.indexOf(String(url || '').trim());
    this.selectPosProductImage(idx >= 0 ? idx : 0);
  }

  clearPosProductImageZoom(): void {
    this.posProductImageZoomUrl = null;
  }

  onPosProductImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (input) {
      input.value = '';
    }
    if (!file) {
      return;
    }
    if (this.posProductImageDrafts.length >= 3) {
      this.flashStatus('Maximum of 3 images per product.', true);
      return;
    }
    if (!String(file.type || '').startsWith('image/')) {
      this.flashStatus('Please select an image file.', true);
      return;
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.flashStatus('Image must be 5 MB or smaller.', true);
      return;
    }
    this.posProductImageUploading = true;
    this.posProductImageUploadProgress = 5;
    // 1) Save into the PC product-images folder and store localUrl.
    this.api.saveProductImageLocally(file).subscribe({
      next: (localSaved) => {
        const localUrl = String(localSaved?.localUrl || '').trim();
        this.posProductImageUploadProgress = Math.max(this.posProductImageUploadProgress, 35);
        // Placeholder web slot until Cloudinary finishes (display uses local).
        this.posProductImageDrafts = [...this.posProductImageDrafts, ''].slice(0, 3);
        this.posProductImageLocalDrafts = [...this.posProductImageLocalDrafts, localUrl].slice(0, 3);
        this.selectPosProductImage(this.posProductImageDrafts.length - 1);
        this.cdr.markForCheck();
        // 2) Upload to Cloudinary and store web URL.
        this.api.uploadProductImageToCloudinaryWithProgress(file).subscribe({
          next: (evt) => {
            this.posProductImageUploadProgress = Math.max(
              this.posProductImageUploadProgress,
              35 + Math.round((Number(evt?.progress) || 0) * 0.65)
            );
            if (evt?.done && evt.url) {
              const url = String(evt.url || '').trim();
              const idx = this.posProductImageDrafts.length - 1;
              if (idx >= 0) {
                const next = [...this.posProductImageDrafts];
                next[idx] = url;
                this.posProductImageDrafts = next;
              }
              this.posProductImageUploadProgress = 100;
              this.posProductImageUploading = false;
              if (this.posProductImagesId && this.posProductImageDrafts.length === 1) {
                this.rememberPosStockItemImages(
                  this.posProductImagesId,
                  url,
                  null,
                  null,
                  localUrl,
                  null,
                  null
                );
                this.flashStatus('Primary image saved locally and uploaded — save to keep it permanently.', false);
              }
              this.selectPosProductImage(this.posProductImageActiveIndex);
              this.cdr.markForCheck();
            }
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.posProductImageUploading = false;
            this.posProductImageUploadProgress = 0;
            this.flashStatus(
              err?.message ||
                'Local copy saved, but Cloudinary upload failed. You can retry or save with the local image.',
              true
            );
            this.cdr.markForCheck();
          },
        });
      },
      error: (err: any) => {
        this.posProductImageUploading = false;
        this.posProductImageUploadProgress = 0;
        this.flashStatus(
          err?.error?.message || err?.message || 'Failed to save image to the local product-images folder.',
          true
        );
        this.cdr.markForCheck();
      },
    });
  }

  removePosProductImage(index: number): void {
    if (index < 0 || index >= this.posProductImageDrafts.length) {
      return;
    }
    this.posProductImageDrafts = this.posProductImageDrafts.filter((_, i) => i !== index);
    this.posProductImageLocalDrafts = this.posProductImageLocalDrafts.filter((_, i) => i !== index);
    if (!this.posProductImageDrafts.length) {
      this.posProductImageLocalDrafts = [];
      this.posProductImageActiveIndex = 0;
      this.posProductImageZoomUrl = null;
      this.showPosProductImageFullscreen = false;
      return;
    }
    const nextIndex = Math.min(index, this.posProductImageDrafts.length - 1);
    this.selectPosProductImage(nextIndex);
  }

  /** Move the active gallery image to slot 1 (primary card image). */
  setPosProductImageAsPrimary(index?: number): void {
    const i = index == null ? this.posProductImageActiveIndex : index;
    if (i < 0 || i >= this.posProductImageDrafts.length) {
      return;
    }
    if (i === 0) {
      this.flashStatus('This image is already the primary.', false);
      return;
    }
    const urls = [...this.posProductImageDrafts];
    const locals = [...this.posProductImageLocalDrafts];
    while (locals.length < urls.length) {
      locals.push('');
    }
    const [picked] = urls.splice(i, 1);
    const [pickedLocal] = locals.splice(i, 1);
    this.posProductImageDrafts = [picked, ...urls].slice(0, 3);
    this.posProductImageLocalDrafts = [pickedLocal, ...locals].slice(0, 3);
    this.selectPosProductImage(0);
    if (this.posProductImagesId) {
      this.rememberPosStockItemImages(
        this.posProductImagesId,
        this.posProductImageDrafts[0] || null,
        this.posProductImageDrafts[1] || null,
        this.posProductImageDrafts[2] || null,
        this.posProductImageLocalDrafts[0] || null,
        this.posProductImageLocalDrafts[1] || null,
        this.posProductImageLocalDrafts[2] || null
      );
    }
    this.flashStatus('Primary image updated on the card. Save to keep it.', false);
    this.cdr.markForCheck();
  }

  savePosProductImages(): void {
    if (!this.posProductImagesId || this.posProductImageSaving) {
      return;
    }
    this.posProductImageSaving = true;
    const slots = [...this.posProductImageDrafts, null, null, null].slice(0, 3);
    const localSlots = [...this.posProductImageLocalDrafts, null, null, null].slice(0, 3);
    const savedId = this.posProductImagesId;
    const base = this.posProductImagesFullDraft || {};
    const payload: any = {
      stockItemName: base.stockItemName || this.posProductImagesName || null,
      description: base.description ?? null,
      barcode: base.barcode ?? null,
      sku: base.sku ?? null,
      shelfNumber: base.shelfNumber ?? null,
      businessCategory: base.businessCategory ?? null,
      saleCategory: base.saleCategory ?? null,
      unit: base.unit ?? null,
      unitShort: base.unitShort ?? null,
      costPrice: base.costPrice != null ? Number(base.costPrice) : 0,
      sellingPrice: base.sellingPrice != null ? Number(base.sellingPrice) : 0,
      stockQty: base.stockQty != null ? Number(base.stockQty) : 0,
      reorderLevel: base.reorderLevel != null ? Number(base.reorderLevel) : 0,
      restockTo: base.restockTo != null ? Number(base.restockTo) : 0,
      image: this.api.sanitizeProductImageUrlForDb(slots[0]),
      image2: this.api.sanitizeProductImageUrlForDb(slots[1]),
      image3: this.api.sanitizeProductImageUrlForDb(slots[2]),
      imageLocal: this.api.sanitizeProductImageUrlForDb(localSlots[0]),
      imageLocal2: this.api.sanitizeProductImageUrlForDb(localSlots[1]),
      imageLocal3: this.api.sanitizeProductImageUrlForDb(localSlots[2]),
      ingredients: [],
    };
    this.api.updateStockItem(savedId, payload).subscribe({
      next: (res: any) => {
        const data = res?.data || res || {};
        this.rememberPosStockItemImages(
          savedId,
          this.api.sanitizeProductImageUrlForDb(slots[0]),
          this.api.sanitizeProductImageUrlForDb(slots[1]),
          this.api.sanitizeProductImageUrlForDb(slots[2]),
          this.api.sanitizeProductImageUrlForDb(localSlots[0]),
          this.api.sanitizeProductImageUrlForDb(localSlots[1]),
          this.api.sanitizeProductImageUrlForDb(localSlots[2])
        );
        this.upsertAllStockItemsCache({
          ...base,
          ...(typeof data === 'object' && data ? data : {}),
          id: savedId,
          stockItemId: savedId,
          image: this.api.sanitizeProductImageUrlForDb(slots[0]),
          image2: this.api.sanitizeProductImageUrlForDb(slots[1]),
          image3: this.api.sanitizeProductImageUrlForDb(slots[2]),
          imageLocal: this.api.sanitizeProductImageUrlForDb(localSlots[0]),
          imageLocal2: this.api.sanitizeProductImageUrlForDb(localSlots[1]),
          imageLocal3: this.api.sanitizeProductImageUrlForDb(localSlots[2]),
        });
        this.posProductImageSaving = false;
        this.closePosProductImagesModal();
        this.flashStatus('Product images saved.', false);
        this.cdr.markForCheck();
        this.loadPharmacyStock();
        setTimeout(() => {
          this.rememberPosStockItemImages(
            savedId,
            this.api.sanitizeProductImageUrlForDb(slots[0]),
            this.api.sanitizeProductImageUrlForDb(slots[1]),
            this.api.sanitizeProductImageUrlForDb(slots[2]),
            this.api.sanitizeProductImageUrlForDb(localSlots[0]),
            this.api.sanitizeProductImageUrlForDb(localSlots[1]),
            this.api.sanitizeProductImageUrlForDb(localSlots[2])
          );
          this.cdr.markForCheck();
        }, 800);
      },
      error: (err) => {
        this.posProductImageSaving = false;
        this.flashStatus(this.extractApiErrorMessage(err, 'Could not save product images.'), true);
      },
    });
  }

  openPosReceiveStockModal(
    product: { name: string; sourceItem: any; key?: string; price?: number },
    event?: Event
  ): void {
    event?.preventDefault();
    event?.stopPropagation();
    const source =
      product?.sourceItem || this.resolveCatalogSourceItemFallback(product?.key);
    const id = this.resolvePosStockItemId(source) || Number(product?.key);
    if (!Number.isFinite(id) || id <= 0) {
      this.flashStatus('Cannot receive stock — missing item id.', true);
      return;
    }
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.posReceiveStockItemId = id;
    this.posReceiveStockProductName = this.toTitleCase(product?.name || source?.title || 'Product');
    const defaultStore = this.resolvePosReceiveDefaultStore(source);
    this.posReceiveStockDraft = {
      quantityReceived: 1,
      unitCostPrice: Number(source?.costPrice ?? 0) || null,
      totalCostPrice: Number(source?.costPrice ?? 0) || null,
      unitSellingPrice:
        Number(source?.sellingPrice ?? product?.price ?? 0) || null,
      unitSellingModelId: null,
      useUnitSellingModel: source?.useUnitSellingModel !== false,
      receiveDate: iso,
      expiryDate: '',
      storeId: defaultStore.id,
      storeName: defaultStore.name,
      brand: '',
      batchNumber: '',
      purchaseOrderId: null,
      purchaseOrderNo: '',
      purchaseOrderSupplierId: null,
    };
    this.closePosReceiveStoreDropdown();
    this.closePosReceivePoDropdown();
    this.ensurePosReceiveStoresLoaded();
    this.ensurePosReceivePurchaseOrdersLoaded();
    this.showPosReceiveStockModal = true;
    document.body.style.overflow = 'hidden';
    this.cdr.markForCheck();
  }

  closePosReceiveStockModal(): void {
    this.showPosReceiveStockModal = false;
    this.posReceiveStockSaving = false;
    this.posReceiveStockItemId = null;
    this.posReceiveStockProductName = '';
    this.posReceiveStockDraft = null;
    this.closePosReceiveStoreDropdown();
    this.closePosReceivePoDropdown();
    if (
      !this.showPosProductDetail &&
      !this.showPosProductEditModal &&
      !this.showPosProductImagesModal
    ) {
      document.body.style.overflow = '';
    }
  }

  onPosReceiveQtyOrCostChange(): void {
    const d = this.posReceiveStockDraft;
    if (!d) {
      return;
    }
    const qty = Number(d.quantityReceived);
    const unit = Number(d.unitCostPrice);
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(unit) && unit >= 0) {
      d.totalCostPrice = Number((qty * unit).toFixed(2));
    }
  }

  onPosReceiveTotalChange(): void {
    const d = this.posReceiveStockDraft;
    if (!d) {
      return;
    }
    const qty = Number(d.quantityReceived);
    const total = Number(d.totalCostPrice);
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(total) && total >= 0) {
      d.unitCostPrice = Number((total / qty).toFixed(2));
    }
  }

  private resolvePosReceiveDefaultStore(source: any): { id: number | null; name: string } {
    const storeIdOf = (s: any) => Number(s?.id ?? s?.storeId);
    const storeNameOf = (s: any) => String(s?.name ?? '').trim();
    const list = Array.isArray(this.storeList) ? this.storeList : [];

    const sourceId = Number(source?.storeId ?? source?.store?.id);
    if (Number.isFinite(sourceId) && sourceId > 0) {
      const match = list.find((s) => storeIdOf(s) === sourceId);
      if (match) {
        return { id: sourceId, name: storeNameOf(match) || String(source?.storeName || '').trim() };
      }
      const name = String(source?.storeName || source?.store?.name || '').trim();
      if (name) {
        return { id: sourceId, name };
      }
    }

    const sourceName = String(source?.storeName || source?.store?.name || '').trim().toLowerCase();
    if (sourceName) {
      const byName = list.find((s) => storeNameOf(s).toLowerCase() === sourceName);
      if (byName) {
        return { id: storeIdOf(byName) || null, name: storeNameOf(byName) };
      }
    }

    if (this.pharmacyStoreId != null && this.pharmacyStoreId > 0) {
      const pharmacy = list.find((s) => storeIdOf(s) === this.pharmacyStoreId);
      return {
        id: this.pharmacyStoreId,
        name: pharmacy ? storeNameOf(pharmacy) : this.pharmacyStoreName || 'Pharmacy',
      };
    }

    if (list.length) {
      const first = list[0];
      return { id: storeIdOf(first) || null, name: storeNameOf(first) };
    }

    return { id: null, name: '' };
  }

  private ensurePosReceiveStoresLoaded(): void {
    if (Array.isArray(this.storeList) && this.storeList.length) {
      return;
    }
    this.api.getAllStores().pipe(
      map((res: any) => this.normalizeList(res)),
      catchError(() => of([]))
    ).subscribe({
      next: (stores: any[]) => {
        this.storeList = stores;
        if (!this.pharmacyStoreId) {
          const pharmacy = this.resolvePharmacyStore(stores);
          this.pharmacyStoreId = pharmacy.id;
          this.pharmacyStoreName = pharmacy.name;
        }
        const d = this.posReceiveStockDraft;
        if (d && (d.storeId == null || !d.storeName)) {
          const def = this.resolvePosReceiveDefaultStore(null);
          d.storeId = def.id;
          d.storeName = def.name;
        }
        this.cdr.markForCheck();
      },
    });
  }

  filteredPosReceiveStores(): { id: number; name: string; location?: string }[] {
    const q = (this.posReceiveStoreSearch || '').trim().toLowerCase();
    const list = (Array.isArray(this.storeList) ? this.storeList : [])
      .map((s: any) => ({
        id: Number(s?.id ?? s?.storeId) || 0,
        name: String(s?.name ?? '').trim(),
        location: String(s?.location ?? '').trim() || undefined,
      }))
      .filter((s) => s.id > 0 && s.name)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    if (!q) {
      return list;
    }
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.location && s.location.toLowerCase().includes(q))
    );
  }

  filteredPosReceivePurchaseOrders(): { id: number; orderNo: string; supplierName: string; supplierId: number | null }[] {
    const q = (this.posReceivePoSearch || '').trim().toLowerCase();
    const list = (Array.isArray(this.posReceivePurchaseOrders) ? this.posReceivePurchaseOrders : [])
      .map((order: any) => ({
        id: Number(order?.id) || 0,
        orderNo: String(order?.orderNo || '').trim(),
        supplierName: String(order?.supplierName || '').trim(),
        supplierId: order?.supplierId != null ? Number(order.supplierId) : null,
      }))
      .filter((order) => order.id > 0 && order.orderNo);
    if (!q) {
      return list;
    }
    return list.filter(
      (order) =>
        order.orderNo.toLowerCase().includes(q) ||
        order.supplierName.toLowerCase().includes(q)
    );
  }

  togglePosReceivePoDropdown(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.posReceivePoDropdownOpen) {
      this.closePosReceivePoDropdown();
      return;
    }
    this.closePosReceiveStoreDropdown();
    this.ensurePosReceivePurchaseOrdersLoaded();
    this.posReceivePoDropdownOpen = true;
    this.posReceivePoSearch = '';
  }

  closePosReceivePoDropdown(): void {
    this.posReceivePoDropdownOpen = false;
    this.posReceivePoSearch = '';
  }

  selectPosReceivePurchaseOrder(
    order: { id: number; orderNo: string; supplierId: number | null } | null,
    event?: Event
  ): void {
    event?.preventDefault();
    event?.stopPropagation();
    const d = this.posReceiveStockDraft;
    if (!d) {
      return;
    }
    if (!order) {
      d.purchaseOrderId = null;
      d.purchaseOrderNo = '';
      d.purchaseOrderSupplierId = null;
    } else {
      d.purchaseOrderId = order.id;
      d.purchaseOrderNo = order.orderNo;
      d.purchaseOrderSupplierId =
        order.supplierId != null && Number.isFinite(order.supplierId) ? order.supplierId : null;
    }
    this.closePosReceivePoDropdown();
  }

  openNewPosReceivePurchaseOrder(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.closePosReceiveStockModal();
    this.router.navigate(['/overview/pharmacy-purchase-orders']);
  }

  private ensurePosReceivePurchaseOrdersLoaded(): void {
    this.api.getPurchaseOrders().subscribe({
      next: (rows: any) => {
        this.posReceivePurchaseOrders = Array.isArray(rows) ? rows : [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.posReceivePurchaseOrders = [];
        this.cdr.markForCheck();
      },
    });
  }

  togglePosReceiveStoreDropdown(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.closePosReceivePoDropdown();
    if (this.posReceiveStoreDropdownOpen) {
      this.closePosReceiveStoreDropdown();
      return;
    }
    this.ensurePosReceiveStoresLoaded();
    this.posReceiveStoreDropdownOpen = true;
    this.posReceiveStoreSearch = '';
    this.posReceiveAddingStore = false;
    this.posReceiveNewStoreName = '';
  }

  closePosReceiveStoreDropdown(): void {
    this.posReceiveStoreDropdownOpen = false;
    this.posReceiveStoreSearch = '';
    this.posReceiveAddingStore = false;
    this.posReceiveNewStoreName = '';
    this.posReceiveStoreSaving = false;
  }

  selectPosReceiveStore(store: { id: number; name: string }, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const d = this.posReceiveStockDraft;
    if (!d || !store?.id) {
      return;
    }
    d.storeId = Number(store.id);
    d.storeName = String(store.name || '').trim();
    this.closePosReceiveStoreDropdown();
  }

  startAddPosReceiveStore(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.posReceiveAddingStore = true;
    this.posReceiveNewStoreName = (this.posReceiveStoreSearch || '').trim();
  }

  confirmAddPosReceiveStore(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.posReceiveStoreSaving) {
      return;
    }
    const name = this.toTitleCase((this.posReceiveNewStoreName || '').trim());
    if (!name) {
      this.flashStatus('Enter a store name.', true);
      return;
    }
    const existing = this.filteredPosReceiveStores().find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      this.selectPosReceiveStore(existing);
      return;
    }
    this.posReceiveStoreSaving = true;
    this.api.createStore({ name, location: '', description: '' }).subscribe({
      next: (res: any) => {
        this.posReceiveStoreSaving = false;
        const created =
          res?.data && typeof res.data === 'object' && !Array.isArray(res.data)
            ? res.data
            : res;
        const createdId = Number(created?.id ?? created?.storeId);
        const createdName = String(created?.name || name).trim();
        this.api.getAllStores().pipe(
          map((r: any) => this.normalizeList(r)),
          catchError(() => of([]))
        ).subscribe({
          next: (stores: any[]) => {
            this.storeList = stores;
            let match =
              (Number.isFinite(createdId) && createdId > 0
                ? stores.find((s) => Number(s?.id ?? s?.storeId) === createdId)
                : null) ||
              stores.find(
                (s) => String(s?.name || '').trim().toLowerCase() === name.toLowerCase()
              );
            if (!match && Number.isFinite(createdId) && createdId > 0) {
              match = { id: createdId, name: createdName, location: '' };
              this.storeList = [match, ...stores];
            }
            if (match) {
              this.selectPosReceiveStore({
                id: Number(match.id ?? match.storeId),
                name: String(match.name || createdName).trim(),
              });
            } else {
              this.flashStatus('Store created but could not select it. Search and pick it.', true);
            }
            this.cdr.markForCheck();
          },
        });
      },
      error: (err: any) => {
        this.posReceiveStoreSaving = false;
        this.flashStatus(
          this.extractApiErrorMessage(err, 'Could not create store.'),
          true
        );
        this.cdr.markForCheck();
      },
    });
  }

  onPosReceiveSellModelSelected(model: { id?: number; unitSellingPrice?: number } | null): void {
    const d = this.posReceiveStockDraft;
    if (!d || !model) {
      return;
    }
    d.useUnitSellingModel = true;
    if (model.id != null) {
      d.unitSellingModelId = Number(model.id);
    }
    const price = Number(model.unitSellingPrice);
    if (Number.isFinite(price) && price >= 0) {
      d.unitSellingPrice = price;
    }
  }

  onPosReceiveSellModelPriceChange(price: number): void {
    const d = this.posReceiveStockDraft;
    if (!d) {
      return;
    }
    const n = Number(price);
    if (Number.isFinite(n) && n >= 0) {
      d.unitSellingPrice = n;
    }
  }

  /** Normalize date inputs for LocalDate JSON (ISO yyyy-MM-dd). Empty → null. */
  private toPosReceiveApiDate(value: string | null | undefined): string | null {
    const raw = String(value || '').trim();
    if (!raw) {
      return null;
    }
    const slash = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (slash) {
      return `${slash[1]}-${slash[2]}-${slash[3]}`;
    }
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }
    return raw;
  }

  submitPosReceiveStock(): void {
    if (!this.posReceiveStockItemId || !this.posReceiveStockDraft || this.posReceiveStockSaving) {
      return;
    }
    const d = this.posReceiveStockDraft;
    const qty = Number(d.quantityReceived);
    const unitCost = Number(d.unitCostPrice);
    const unitSell = Number(d.unitSellingPrice);
    const totalCost = Number(d.totalCostPrice);
    if (!Number.isFinite(qty) || qty <= 0) {
      this.flashStatus('Quantity must be greater than zero.', true);
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      this.flashStatus('Enter a valid unit cost.', true);
      return;
    }
    if (d.useUnitSellingModel !== false && d.unitSellingModelId == null) {
      this.flashStatus('Select or create a unit sell model, or turn off fixed price.', true);
      return;
    }
    if (!Number.isFinite(unitSell) || unitSell <= 0) {
      this.flashStatus(
        d.useUnitSellingModel === false
          ? 'Enter a valid selling price.'
          : 'Selected unit sell model must have a valid selling price.',
        true
      );
      return;
    }
    if (d.storeId == null || !Number.isFinite(Number(d.storeId)) || Number(d.storeId) <= 0) {
      this.flashStatus('Select a store.', true);
      return;
    }
    const payload: any = {
      itemId: this.posReceiveStockItemId,
      stockItemId: this.posReceiveStockItemId,
      quantityReceived: qty,
      totalCostPrice: Number.isFinite(totalCost) ? totalCost : Number((qty * unitCost).toFixed(2)),
      unitCostPrice: unitCost,
      costPrice: unitCost,
      unitSellingPrice: unitSell,
      sellingPrice: unitSell,
      unitSellingModelId: d.useUnitSellingModel === false ? null : d.unitSellingModelId,
      useUnitSellingModel: d.useUnitSellingModel !== false,
      storeId: Number(d.storeId),
      store: (d.storeName || '').trim() || null,
      receiveDate: this.toPosReceiveApiDate(d.receiveDate),
      expiryDate: this.toPosReceiveApiDate(d.expiryDate),
      brand: (d.brand || '').trim() || null,
      batchNumber: (d.batchNumber || '').trim() || null,
      purchaseOrderId: d.purchaseOrderId,
      purchaseOrderNo: (d.purchaseOrderNo || '').trim() || null,
      stockSupplierId: d.purchaseOrderSupplierId,
      notes: null,
      packaging: null,
    };
    this.posReceiveStockSaving = true;
    const req$ = this.pharmacyUseStockBatch
      ? this.api.receiveNewStockBusinessItem(payload)
      : this.api.receiveNewStock(payload);
    req$.subscribe({
      next: (res: any) => {
        this.posReceiveStockSaving = false;
        this.closePosReceiveStockModal();
        this.flashStatus(res?.message || 'Stock received.', false);
        this.loadPharmacyStock();
      },
      error: (err: any) => {
        this.posReceiveStockSaving = false;
        this.flashStatus(
          this.extractApiErrorMessage(err, 'Could not receive stock.'),
          true
        );
      },
    });
  }

  /** One-tap add from product card (qty 1). */
  quickAddPosProduct(
    product: {
      outOfStock: boolean;
      sourceItem: any;
      price: number;
      name: string;
      key?: string;
    },
    oosConfirmed = false
  ): void {
    if (this.processing) {
      return;
    }
    let source =
      product?.sourceItem || this.resolveCatalogSourceItemFallback(product?.key);
    if (!source) {
      this.flashStatus('Could not add product — missing stock item.', true);
      return;
    }
    const isService =
      this.isPosCatalogService(product) || this.isPosServiceSaleCategory(source);
    if (product.outOfStock && !oosConfirmed && !isService) {
      this.pendingOosAdd = { mode: 'quick', product: { ...product, sourceItem: source } };
      this.showPosOosConfirmModal = true;
      return;
    }
    source = this.ensurePosCartSourceItem(source, product);
    if (this.pharmacyUseStockBatch) {
      this.selectOtcBatch(source);
    } else {
      this.selectOtcItem(source);
    }
    // Services have no batch/store — force item id and skip batch gate.
    if (oosConfirmed || product.outOfStock || isService) {
      this.ensurePosSelectionIds(source, product);
    }
    if (isService) {
      this.currentStockBatchId = null;
      this.availableQuantity = Math.max(1, Number(this.availableQuantity) || 1);
    }
    if (product.price > 0 && !(Number(this.itemSellingPrice) > 0)) {
      this.applyUnitSellingModelPrice(product.price);
    }
    this.currentTreatmentRequested.quantity = 1;
    this.calculateTotal();
    this.addToSaleList({
      quantity: 1,
      totalAmount: Number(this.itemSellingPrice) || product.price || 0,
      allowOutOfStock: oosConfirmed || product.outOfStock || isService,
    });
    if (!this.posCartPanelVisible) {
      this.posCartPanelVisible = true;
    }
    this.cdr.markForCheck();
  }

  openPosCartSellModelModal(line: OtcCartLine, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!line || line.lineSource !== 'OTC' || this.processing) {
      return;
    }
    if (line.useUnitSellingModel == null) {
      line.useUnitSellingModel = line.unitSellingModelId != null;
    }
    this.posCartSellModelLine = line;
    this.showPosCartSellModelModal = true;
  }

  /** Whether new cart lines should use fixed unit-sell-model pricing. */
  private posCartLineUsesUnitSellingModel(): boolean {
    const itemId = Number(this.currentItemId);
    if (Number.isFinite(itemId) && itemId > 0) {
      const stockRow =
        (this.allStockItemsCache || []).find(
          (row) => Number(row?.id ?? row?.stockItemId) === itemId
        ) || null;
      if (stockRow && stockRow.useUnitSellingModel === false) {
        return false;
      }
      const listRow = (this.itemList || []).find(
        (i) => Number(i?.stockItemId ?? i?.id) === itemId
      );
      if (listRow && listRow.useUnitSellingModel === false) {
        return false;
      }
    }
    // Open price when no model is selected for this add.
    if (this.selectedUnitSellingModelId == null) {
      return false;
    }
    return true;
  }

  closePosCartSellModelModal(): void {
    this.showPosCartSellModelModal = false;
    this.posCartSellModelLine = null;
  }

  onPosCartSellModelSelected(model: { id?: number; unitSellingPrice?: number } | null): void {
    const line = this.posCartSellModelLine;
    if (!line) {
      return;
    }
    line.useUnitSellingModel = true;
    if (model?.id != null) {
      line.unitSellingModelId = Number(model.id);
    }
    const price = Number(model?.unitSellingPrice);
    if (Number.isFinite(price) && price >= 0) {
      const prevPayable = this.cartPayableTotal;
      line.unitSellingPrice = price;
      if (line.discountMode === 'percent' && this.num(line.discountInput) > 0) {
        const gross = this.num(line.quantity) * price;
        line.discountAmount = Math.min(gross, (gross * this.num(line.discountInput)) / 100);
      }
      this.refreshCartLineTotals(line);
      this.syncAmountReceivedToSubtotal(prevPayable);
    }
  }

  onPosCartSellModelPriceChange(price: number): void {
    const line = this.posCartSellModelLine;
    if (!line) {
      return;
    }
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) {
      return;
    }
    const prevPayable = this.cartPayableTotal;
    line.unitSellingPrice = n;
    if (line.useUnitSellingModel === false) {
      line.unitSellingModelId = null;
    }
    if (line.discountMode === 'percent' && this.num(line.discountInput) > 0) {
      const gross = this.num(line.quantity) * n;
      line.discountAmount = Math.min(gross, (gross * this.num(line.discountInput)) / 100);
    }
    this.refreshCartLineTotals(line);
    this.syncAmountReceivedToSubtotal(prevPayable);
  }

  onPosCartUseUnitSellingModelChange(enabled: boolean): void {
    const line = this.posCartSellModelLine;
    if (!line) {
      return;
    }
    line.useUnitSellingModel = enabled;
    if (!enabled) {
      line.unitSellingModelId = null;
    }
  }

  posCartSellModelStockItemId(line: OtcCartLine | null): number | null {
    if (!line || !this.pharmacyUseStockBatch) {
      return null;
    }
    return line.itemId > 0 ? line.itemId : null;
  }

  posCartSellModelShopItemId(line: OtcCartLine | null): number | null {
    if (!line || this.pharmacyUseStockBatch) {
      return null;
    }
    return line.itemId > 0 ? line.itemId : null;
  }

  adjustCartLineQty(line: OtcCartLine, delta: number): void {
    if (!line || line.lineSource !== 'OTC' || this.processing) {
      return;
    }
    const next = Math.max(0, this.num(line.quantity) + delta);
    if (next <= 0) {
      this.removeLine(line);
      this.syncAmountReceivedToSubtotal(this.cartPayableTotal);
      return;
    }
    const prev = this.cartPayableTotal;
    line.quantity = next;
    line.totalUnits = next;
    // Re-apply percent discount against new gross when mode is percent
    if (line.discountMode === 'percent' && this.num(line.discountInput) > 0) {
      const gross = next * this.num(line.unitSellingPrice);
      line.discountAmount = Math.min(gross, (gross * this.num(line.discountInput)) / 100);
    }
    this.refreshCartLineTotals(line);
    this.syncAmountReceivedToSubtotal(prev);
  }

  openLineDiscountModal(line: OtcCartLine, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!line || this.processing) {
      return;
    }
    this.discountTargetLine = line;
    this.discountDraftMode =
      line.discountMode === 'percent' ? 'percent' : 'amount';
    this.discountDraftValue =
      line.discountMode === 'none' ? null : this.num(line.discountInput) || null;
    this.showLineDiscountModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeLineDiscountModal(): void {
    this.showLineDiscountModal = false;
    this.discountTargetLine = null;
    this.discountDraftValue = null;
    this.discountDraftMode = 'amount';
    document.body.style.overflow = '';
  }

  /** Live preview of discount amount for the open modal. */
  get discountDraftPreviewAmount(): number {
    const line = this.discountTargetLine;
    if (!line) {
      return 0;
    }
    const gross = this.cartLineGrossAmount(line);
    const input = Math.max(0, this.num(this.discountDraftValue));
    if (this.discountDraftMode === 'percent') {
      return Math.min(gross, (gross * Math.min(100, input)) / 100);
    }
    return Math.min(gross, input);
  }

  get discountDraftPreviewBillTotal(): number {
    const line = this.discountTargetLine;
    let net: number;
    if (!line) {
      net = this.cartSubtotal;
    } else {
      const withoutThis =
        this.cartSubtotal - (line.given ? this.cartLineAmount(line) : 0);
      const newLineTotal = Math.max(
        0,
        this.cartLineGrossAmount(line) - this.discountDraftPreviewAmount
      );
      net = Math.max(0, withoutThis + (line.given ? newLineTotal : 0));
    }
    const overall = Math.min(net, Math.max(0, Number(this.overallDiscountAmount) || 0));
    const taxable = Math.max(0, roundUgxMoney(net - overall));
    const tax = this.computeTaxOnBase(taxable, this.posTaxRatePercent, this.posTaxType);
    return roundUgxMoney(taxable + tax);
  }

  applyLineDiscountFromModal(): void {
    const line = this.discountTargetLine;
    if (!line) {
      return;
    }
    const prev = this.cartPayableTotal;
    const amount = this.discountDraftPreviewAmount;
    const input = Math.max(0, this.num(this.discountDraftValue));
    if (amount <= 0 || input <= 0) {
      this.flashStatus('Enter a discount greater than zero.', true);
      return;
    }
    line.discountMode = this.discountDraftMode;
    line.discountInput =
      this.discountDraftMode === 'percent' ? Math.min(100, input) : input;
    line.discountAmount = amount;
    this.refreshCartLineTotals(line);
    this.syncAmountReceivedToSubtotal(prev);
    this.closeLineDiscountModal();
    this.flashStatus('Product discount applied.', false);
  }

  removeLineDiscountFromModal(): void {
    const line = this.discountTargetLine;
    if (!line) {
      return;
    }
    const prev = this.cartPayableTotal;
    line.discountAmount = 0;
    line.discountMode = 'none';
    line.discountInput = 0;
    this.refreshCartLineTotals(line);
    this.syncAmountReceivedToSubtotal(prev);
    this.closeLineDiscountModal();
    this.flashStatus('Product discount removed.', false);
  }

  openOverallDiscountModal(): void {
    if (this.processing) {
      return;
    }
    this.overallDiscountDraftValue =
      this.overallDiscountAmount > 0 ? this.overallDiscountAmount : null;
    this.showOverallDiscountModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeOverallDiscountModal(): void {
    this.showOverallDiscountModal = false;
    this.overallDiscountDraftValue = null;
    document.body.style.overflow = '';
  }

  get overallDiscountDraftAmount(): number {
    const input = Math.max(0, this.num(this.overallDiscountDraftValue));
    return Math.min(this.cartSubtotal, input);
  }

  get overallDiscountDraftBillTotal(): number {
    const taxable = Math.max(
      0,
      roundUgxMoney(this.cartSubtotal - this.overallDiscountDraftAmount)
    );
    const tax = this.computeTaxOnBase(taxable, this.posTaxRatePercent, this.posTaxType);
    return roundUgxMoney(taxable + tax);
  }

  applyOverallDiscountFromModal(): void {
    const prev = this.cartPayableTotal;
    const amount = this.overallDiscountDraftAmount;
    this.overallDiscountAmount = amount > 0 ? roundUgxMoney(amount) : 0;
    this.syncAmountReceivedToSubtotal(prev);
    this.closeOverallDiscountModal();
    this.flashStatus(
      this.overallDiscountAmount > 0 ? 'Overall discount applied.' : 'Overall discount cleared.',
      false
    );
  }

  clearOverallDiscountFromModal(): void {
    const prev = this.cartPayableTotal;
    this.overallDiscountAmount = 0;
    this.syncAmountReceivedToSubtotal(prev);
    this.closeOverallDiscountModal();
    this.flashStatus('Overall discount cleared.', false);
  }

  openPosTaxModal(): void {
    if (this.processing) {
      return;
    }
    this.taxDraftType = this.posTaxType;
    this.taxDraftRatePercent = this.posTaxRatePercent;
    this.showPosTaxModal = true;
    document.body.style.overflow = 'hidden';
  }

  closePosTaxModal(): void {
    this.showPosTaxModal = false;
    document.body.style.overflow = '';
  }

  get taxDraftPreviewAmount(): number {
    const rate =
      this.taxDraftType === 'None' ? 0 : Math.max(0, this.num(this.taxDraftRatePercent));
    return this.computeTaxOnBase(this.cartTaxableBase, rate, this.taxDraftType);
  }

  applyPosTaxFromModal(): void {
    const prev = this.cartPayableTotal;
    this.posTaxType = this.taxDraftType;
    if (this.taxDraftType === 'None') {
      this.posTaxRatePercent = 0;
    } else {
      const rate = Math.max(0, Math.min(100, this.num(this.taxDraftRatePercent)));
      this.posTaxRatePercent = rate;
      if (rate <= 0) {
        this.flashStatus('Enter a tax percentage greater than zero, or choose None.', true);
        return;
      }
    }
    this.syncAmountReceivedToSubtotal(prev);
    this.closePosTaxModal();
    this.flashStatus('Tax settings applied.', false);
  }

  receiptTaxLabel(r: OtcReceiptData | null | undefined): string {
    const type = String(r?.taxType || this.posTaxType || 'VAT').trim();
    const rate =
      r?.taxRatePercent != null ? Number(r.taxRatePercent) : this.posTaxRatePercent;
    if (!type || type === 'None' || !Number.isFinite(rate) || rate <= 0) {
      return 'Tax';
    }
    return `Tax (${type} ${rate}%)`;
  }

  continueToPayment(): void {
    if (!this.hasBillableCartLines) {
      this.flashStatus('Add at least one product to the order.', true);
      return;
    }
    if (!this.isEditingSoldDocument) {
      if (!this.hasPosSaleClientAttached()) {
        this.flashStatus('Attach a client before continuing to payment.', true);
        this.openPosClientPicker();
        return;
      }
      if (!this.hasPosSaleOrderReady()) {
        this.flashStatus(
          this.posSaleOrderAttaching
            ? 'Linking client order… please wait.'
            : 'Select or create an order for this client first.',
          true
        );
        if (!this.posSaleOrderAttaching && this.posSaleClientId) {
          this.openPosOrderPickerModal();
        }
        return;
      }
    }
    this.posShowPaymentStep = true;
    if (!this.isEditingSoldDocument) {
      if (!this.pendingPosDocType) {
        this.pendingPosDocType = 'receipt';
      }
      if (this.shouldPrefillAmountReceivedForDoc(this.pendingPosDocType)) {
        this.forceAmountReceivedToPayable();
      } else {
        this.amountReceived = null;
      }
    }
  }

  backFromPaymentStep(): void {
    this.posShowPaymentStep = false;
  }

  onCheckoutDocTypeChange(docType: CommercialDocType | string): void {
    if (this.isEditingSoldDocument) {
      return;
    }
    this.pendingPosDocType = normalizeCommercialDocType(docType);
    if (this.shouldPrefillAmountReceivedForDoc(this.pendingPosDocType)) {
      this.forceAmountReceivedToPayable();
    } else {
      // Quotation: leave amount empty unless the user enters payment.
      this.amountReceived = null;
    }
  }

  get hasPosSaleClient(): boolean {
    return this.hasPosSaleClientAttached();
  }

  /** Client + order attached, or editing a locked document with cart lines. */
  get hasPosSaleReady(): boolean {
    if (this.isEditingSoldDocument && this.otcOnlyCart.length > 0) {
      return true;
    }
    return this.hasPosSaleClientAttached() && this.hasPosSaleOrderReady();
  }

  private hasPosSaleClientAttached(): boolean {
    return this.posSaleClientId != null && this.posSaleClientId > 0 && !!this.posSaleClientName.trim();
  }

  private hasPosSaleOrderReady(): boolean {
    return (
      !this.posSaleOrderAttaching &&
      this.posSaleVisitId != null &&
      this.posSaleVisitId > 0
    );
  }

  clearPosSaleClient(): void {
    const keepOrder =
      this.isEditingSoldDocument && this.posSaleVisitId != null && this.posSaleVisitId > 0;
    const keptVisitId = this.posSaleVisitId;
    const keptVisitNumber = this.posSaleVisitNumber;
    this.posSaleClientId = null;
    this.posSaleClientName = '';
    this.posSaleVisitId = null;
    this.posSaleVisitNumber = null;
    this.posOrderReadyForNextDocument = false;
    this.posSaleOrderAttaching = false;
    this.posClientSearch = '';
    this.posClientPickerOpen = false;
    this.posClientOptions = [];
    if (keepOrder) {
      this.posSaleVisitId = keptVisitId;
      this.posSaleVisitNumber = keptVisitNumber;
    }
    this.closePosOrderPickerModal(false);
  }

  openPosClientPicker(): void {
    this.posClientPickerOpen = true;
    this.posClientSearch = this.isEditingSoldDocument ? '' : this.posSaleClientName || '';
    this.ensurePosClientsLoaded(() => this.filterPosClientOptions());
  }

  closePosClientPicker(): void {
    this.posClientPickerOpen = false;
  }

  openPosAddClientModal(): void {
    this.posClientPickerOpen = false;
    this.posAddClientDraft = this.emptyPosAddClientDraft();
    this.posAddClientSaving = false;
    this.showPosAddClientModal = true;
    this.ensurePosAddClientGroupsLoaded();
  }

  closePosAddClientModal(): void {
    if (this.posAddClientSaving) {
      return;
    }
    this.showPosAddClientModal = false;
    this.posAddClientDraft = this.emptyPosAddClientDraft();
  }

  onPosAddClientGroupChange(groupId: number | null): void {
    if (groupId == null) {
      this.posAddClientDraft.clientGroupId = null;
      this.posAddClientDraft.clientGroup = '';
      return;
    }
    const group = this.posAddClientGroups.find((g) => Number(g?.id) === Number(groupId));
    if (group && !this.accessControl.canAssignClientToGroup(group)) {
      this.flashStatus('You need admin approval to add any client in Veneranda Business group.', true);
      this.posAddClientDraft.clientGroupId = null;
      this.posAddClientDraft.clientGroup = '';
      return;
    }
    this.posAddClientDraft.clientGroupId = Number(groupId);
    this.posAddClientDraft.clientGroup = String(group?.groupName || group?.name || '').trim();
  }

  savePosAddClient(): void {
    if (this.posAddClientSaving) {
      return;
    }
    const draft = this.posAddClientDraft;
    const firstName = (draft.clientFirstName || '').trim();
    const secondName = (draft.clientSecondName || '').trim();
    const contact = (draft.clientContact || '').trim();
    const gender = (draft.clientGender || '').trim();
    if (!firstName || !secondName || !contact || !gender) {
      this.flashStatus('First name, second name, contact, and gender are required.', true);
      return;
    }
    if (!/^256[0-9]{9}$/.test(contact)) {
      this.flashStatus('Contact must start with 256 and have 12 digits.', true);
      return;
    }
    const nokContact = (draft.nextOfKinContact || '').trim();
    if (nokContact && nokContact !== defaultContactValue() && !/^256[0-9]{9}$/.test(nokContact)) {
      this.flashStatus('Next of kin contact must start with 256 and have 12 digits.', true);
      return;
    }
    if (draft.clientGroupId != null) {
      const group = this.posAddClientGroups.find((g) => Number(g?.id) === Number(draft.clientGroupId));
      if (group && !this.accessControl.canAssignClientToGroup(group)) {
        this.flashStatus('You need admin approval to add any client in Veneranda Business group.', true);
        return;
      }
    }

    const clientData = {
      patientFirstName: firstName,
      patientSecondName: secondName,
      patientAddress: (draft.clientAddress || '').trim(),
      patientContact: contact,
      patientGender: gender,
      patientGroupId: draft.clientGroupId,
      clientFirstName: firstName,
      clientSecondName: secondName,
      clientAddress: (draft.clientAddress || '').trim(),
      clientContact: contact,
      clientGender: gender,
      occupation: (draft.occupation || '').trim(),
      nextOfKinName: (draft.nextOfKinName || '').trim(),
      nextOfKinContact: nokContact === defaultContactValue() ? '' : nokContact,
      relationship: (draft.relationship || '').trim(),
      nextOfKinAddress: (draft.nextOfKinAddress || '').trim(),
      clientGroupId: draft.clientGroupId,
      userRole: sessionStorage.getItem('userrole') || null,
    };

    this.posAddClientSaving = true;
    this.api.addClient(clientData).subscribe({
      next: (response: any) => {
        this.posAddClientSaving = false;
        const data = response?.data ?? response;
        const mapped =
          this.mapPosClientOption(data) ||
          ({
            id: Number(data?.id ?? data?.patientId ?? data?.clientId),
            name: `${firstName} ${secondName}`.trim(),
          } as { id: number; name: string });
        if (!Number.isFinite(mapped.id) || mapped.id <= 0) {
          this.flashStatus('Client added, but could not attach automatically. Search for them.', false);
          this.showPosAddClientModal = false;
          this.posAddClientDraft = this.emptyPosAddClientDraft();
          this.posClientCache = [];
          this.openPosClientPicker();
          return;
        }
        this.posClientCache = [
          mapped,
          ...this.posClientCache.filter((c) => c.id !== mapped.id),
        ];
        this.filterPosClientOptions();
        this.showPosAddClientModal = false;
        this.posAddClientDraft = this.emptyPosAddClientDraft();
        this.flashStatus('Client added.', false);
        this.selectPosSaleClient(mapped);
      },
      error: (err: any) => {
        this.posAddClientSaving = false;
        this.flashStatus(this.extractApiErrorMessage(err, 'Could not add client.'), true);
      },
    });
  }

  private emptyPosAddClientDraft(): {
    clientFirstName: string;
    clientSecondName: string;
    clientContact: string;
    clientGender: string;
    occupation: string;
    clientAddress: string;
    clientGroupId: number | null;
    clientGroup: string;
    nextOfKinName: string;
    nextOfKinContact: string;
    relationship: string;
    nextOfKinAddress: string;
  } {
    return {
      clientFirstName: '',
      clientSecondName: '',
      clientContact: defaultContactValue(),
      clientGender: '',
      occupation: '',
      clientAddress: '',
      clientGroupId: null,
      clientGroup: '',
      nextOfKinName: '',
      nextOfKinContact: defaultContactValue(),
      relationship: '',
      nextOfKinAddress: '',
    };
  }

  private ensurePosAddClientGroupsLoaded(): void {
    if (this.posAddClientGroups.length || this.posAddClientGroupsLoading) {
      return;
    }
    this.posAddClientGroupsLoading = true;
    this.api.getClientGroupList().subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.posAddClientGroups = this.accessControl.filterAssignableClientGroups(rows);
        this.posAddClientGroupsLoading = false;
      },
      error: () => {
        this.posAddClientGroups = [];
        this.posAddClientGroupsLoading = false;
        this.flashStatus('Could not load client groups.', true);
      },
    });
  }

  onPosClientSearchChange(): void {
    this.filterPosClientOptions();
  }

  selectPosSaleClient(client: { id: number; name: string }): void {
    const keepExistingOrder =
      this.isEditingSoldDocument && this.posSaleVisitId != null && this.posSaleVisitId > 0;
    this.posSaleClientId = client.id;
    this.posSaleClientName = client.name;
    this.posClientSearch = '';
    this.posClientPickerOpen = false;
    if (keepExistingOrder) {
      this.flashStatus(
        `Client set to ${client.name}. ${this.posAttachedOrderLabel()} stays the same.`,
        false
      );
      this.cdr.markForCheck();
      return;
    }
    this.posSaleVisitId = null;
    this.posSaleVisitNumber = null;
    this.posOrderReadyForNextDocument = false;
    this.openPosOrderPickerModal();
  }

  /** Open the new-order form for the already-attached client. */
  openPosOrderPickerForCurrentClient(event?: Event): void {
    event?.stopPropagation();
    if (!this.posSaleClientId || this.processing || this.isEditingSoldDocument) {
      return;
    }
    this.openPosOrderPickerModal();
  }

  togglePosCartPanel(): void {
    this.posCartPanelVisible = !this.posCartPanelVisible;
    this.cdr.markForCheck();
  }

  posAttachedOrderLabel(): string {
    if (this.posSaleOrderAttaching || this.posOrderPickerCreating) {
      return 'Linking order…';
    }
    if (this.posSaleVisitId == null) {
      return 'New order';
    }
    const no =
      this.posSaleVisitNumber != null && this.posSaleVisitNumber > 0
        ? String(this.posSaleVisitNumber).padStart(2, '0')
        : String(this.posSaleVisitId);
    return `Order #${no}`;
  }

  openPosOrderPickerModal(): void {
    if (!this.posSaleClientId) {
      return;
    }
    this.showPosOrderPickerModal = true;
    this.resetPosOrderPickerDateTime();
    this.posSaleOrderAttaching = false;
    document.body.classList.add('otc-receipt-modal-open');
    this.cdr.markForCheck();
  }

  closePosOrderPickerModal(keepBodyLock = false): void {
    this.showPosOrderPickerModal = false;
    this.posOrderPickerCreating = false;
    this.posSaleOrderAttaching = false;
    if (!keepBodyLock && !this.showReceiptModal) {
      document.body.classList.remove('otc-receipt-modal-open');
    }
    this.cdr.markForCheck();
  }

  createPosOrderFromPicker(): void {
    const clientId = this.posSaleClientId;
    if (!clientId || clientId <= 0 || this.posOrderPickerCreating) {
      return;
    }
    const visitDate = String(this.posOrderPickerNewDate || '').trim() || this.posTodayDateIso();
    const visitTime =
      String(this.posOrderPickerNewTime || '').trim() || this.posNowTimeHm();
    this.posOrderPickerCreating = true;
    this.posSaleOrderAttaching = true;
    const payload = {
      visitDate,
      visitTime,
      visitType: 'outpatient',
      visitReason: 'POS counter order',
      allowConcurrentOpen: true,
    };
    this.api.createNewVisit(clientId, payload).subscribe({
      next: (res: any) => {
        const created = res?.data ?? res;
        if (created && Number(created.id) > 0) {
          this.applyPosSaleVisit(created);
          this.posOrderReadyForNextDocument = true;
          this.closePosOrderPickerModal();
          this.flashStatus(`Created ${this.posAttachedOrderLabel()}.`, false);
        } else {
          this.posOrderPickerCreating = false;
          this.posSaleOrderAttaching = false;
          this.flashStatus('Could not create a new order.', true);
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.posOrderPickerCreating = false;
        this.posSaleOrderAttaching = false;
        this.flashStatus(
          this.extractApiErrorMessage(err, 'Could not create a new order.'),
          true
        );
        this.cdr.markForCheck();
      },
    });
  }

  private applyPosSaleVisit(visit: any): void {
    const id = Number(visit?.id ?? visit?.visitId);
    this.posSaleVisitId = Number.isFinite(id) && id > 0 ? id : null;
    const num = Number(visit?.visitNumber ?? visit?.visit_number);
    this.posSaleVisitNumber = Number.isFinite(num) && num > 0 ? num : this.posSaleVisitId;
  }

  private resetPosOrderPickerDateTime(): void {
    this.posOrderPickerNewDate = this.posTodayDateIso();
    this.posOrderPickerNewTime = this.posNowTimeHm();
  }

  private posNowTimeHm(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  private posTodayDateIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Drop the attached order so the next document creates a new one. */
  private releasePosSaleOrder(): void {
    this.posSaleVisitId = null;
    this.posSaleVisitNumber = null;
    this.posOrderReadyForNextDocument = false;
  }

  /**
   * New documents never reuse an older order. Use the order just created in this
   * checkout, or create one now.
   */
  private ensureNewPosOrderForDocument(onReady: () => void): void {
    if (this.isEditingSoldDocument && this.posSaleVisitId != null && this.posSaleVisitId > 0) {
      onReady();
      return;
    }
    if (this.posOrderReadyForNextDocument && this.hasPosSaleOrderReady()) {
      onReady();
      return;
    }
    const clientId = this.posSaleClientId;
    if (!clientId || clientId <= 0 || this.posOrderPickerCreating) {
      this.flashStatus('Attach a client before creating the document.', true);
      return;
    }
    this.posOrderPickerCreating = true;
    this.posSaleOrderAttaching = true;
    this.flashStatus('Creating a new order…', false);
    const payload = {
      visitDate: this.posTodayDateIso(),
      visitTime: this.posNowTimeHm(),
      visitType: 'outpatient',
      visitReason: 'POS counter order',
      allowConcurrentOpen: true,
    };
    this.api.createNewVisit(clientId, payload).subscribe({
      next: (res: any) => {
        this.posOrderPickerCreating = false;
        this.posSaleOrderAttaching = false;
        const created = res?.data ?? res;
        if (created && Number(created.id) > 0) {
          this.applyPosSaleVisit(created);
          this.posOrderReadyForNextDocument = true;
          onReady();
        } else {
          this.flashStatus('Could not create a new order.', true);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.posOrderPickerCreating = false;
        this.posSaleOrderAttaching = false;
        this.flashStatus(this.extractApiErrorMessage(err, 'Could not create a new order.'), true);
        this.cdr.markForCheck();
      },
    });
  }

  private ensurePosClientsLoaded(done?: () => void): void {
    if (this.posClientCache.length) {
      done?.();
      return;
    }
    if (this.posClientLoading) {
      return;
    }
    this.posClientLoading = true;
    this.posClientLoadAttempted = true;
    this.api.getAllClients().subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res) ? res : [];
        this.posClientCache = rows
          .map((row: any) => this.mapPosClientOption(row))
          .filter((c: { id: number; name: string } | null): c is { id: number; name: string } => !!c);
        this.posClientLoading = false;
        done?.();
      },
      error: () => {
        this.posClientLoading = false;
        this.flashStatus('Could not load clients. Try again.', true);
      },
    });
  }

  private mapPosClientOption(row: any): { id: number; name: string } | null {
    const id = Number(row?.id ?? row?.clientId ?? row?.patientId);
    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }
    const direct = String(row?.clientName ?? row?.patientName ?? row?.name ?? '').trim();
    const combined = [row?.patientFirstName ?? row?.firstName, row?.patientSecondName ?? row?.surname ?? row?.lastName]
      .map((p) => String(p ?? '').trim())
      .filter(Boolean)
      .join(' ');
    const name = this.formatDisplayName(direct || combined);
    if (!name) {
      return null;
    }
    return { id, name };
  }

  private filterPosClientOptions(): void {
    const q = (this.posClientSearch || '').trim().toLowerCase();
    const source = this.posClientCache;
    if (!q) {
      this.posClientOptions = source.slice();
      return;
    }
    this.posClientOptions = source.filter(
      (c) => c.name.toLowerCase().includes(q) || String(c.id).includes(q)
    );
  }

  posProductInitials(name: string): string {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  completePrescriptionSale(collectPayment: boolean = true): void {
    if (this.processing) {
      return;
    }
    if (this.selectedPrescriptionVisitId == null) {
      this.flashStatus('Select a client from the queue first.', true);
      return;
    }
    const allRows = this.selectedPrescriptionRows();
    if (!allRows.length) {
      this.flashStatus('No prescription lines for this visit.', true);
      return;
    }
    const billable = this.dispensablePrescriptionRows();
    if (!billable.length && !allRows.every((row) => this.prescriptionItemTotalStock(row) <= 0)) {
      this.flashStatus('Set a quantity for at least one in-stock drug to dispense.', true);
      return;
    }
    for (const row of billable) {
      if (row.quantity <= 0) {
        this.flashStatus(`Enter a quantity greater than zero for ${row.itemName}.`, true);
        return;
      }
      const available = this.prescriptionItemTotalStock(row);
      if (row.quantity > available) {
        this.flashStatus(
          `${row.itemName}: quantity (${row.quantity}) exceeds available stock (${available}).`,
          true
        );
        return;
      }
    }
    const total = this.prescriptionSubtotal;
    if (billable.length > 0 && total <= 0) {
      this.flashStatus('Sale total must be greater than zero.', true);
      return;
    }
    const received = collectPayment
      ? billable.length > 0
        ? this.effectiveAmountReceived(this.rxAmountReceived, total)
        : 0
      : 0;
    if (collectPayment && billable.length > 0 && received < total) {
      this.flashStatus('Amount received is less than total due.', true);
      return;
    }
    const group = this.selectedPrescriptionGroup();
    const visitId = this.selectedPrescriptionVisitId;
    const clientName = group?.clientName ?? billable[0]?.clientName ?? allRows[0]?.clientName;
    const patientId =
      Number(billable[0]?.clientId ?? allRows[0]?.clientId) || undefined;
    if (!clientName?.trim() && !(patientId && patientId > 0) && visitId == null) {
      this.flashStatus('Attach a client before completing the sale.', true);
      return;
    }

    // Mark lines being dispensed so the backend includes them and DSP is set.
    // Do not mark paid=true when money was not collected.
    for (const row of billable) {
      row.given = true;
      if (collectPayment) {
        row.paid = true;
      }
    }

    this.processing = true;
    this.flashStatus(
      collectPayment
        ? 'Processing dispense with payment…'
        : 'Processing dispense without payment…',
      false
    );
    const receivedBy = this.loggedInStaffName();

    this.api
      .completeOtcPharmacySale({
        amountReceived: received,
        paymentForm: collectPayment ? this.rxPaymentMethod : 'Not paid',
        receivedBy,
        notes: this.rxSaleNotes || (collectPayment
          ? 'Pharmacy prescription sale'
          : 'Pharmacy prescription dispensed — money not received'),
        visitId,
        patientId: patientId && patientId > 0 ? patientId : undefined,
        patientName: clientName,
        clientName,
        recordPayment: collectPayment,
        lines: allRows.map((row) => {
          const inBillable = billable.some((b) => this.samePrescriptionRow(b, row));
          return this.prescriptionRowToSaleLine({
            ...row,
            given: inBillable,
          });
        }),
      })
      .subscribe({
        next: (res: any) => {
          this.processing = false;
          const changeAmt = collectPayment ? Math.max(0, received - total) : 0;
          const cartSnapshot = this.prescriptionRowsToCartSnapshot(
            billable.length ? billable : allRows
          );
          const saleData = this.extractCompletedSalePayload(res);
          const allTreatmentIds = billable
            .filter((row) => !this.isSundryPrescriptionRow(row))
            .map((row) => row.id)
            .filter((id) => id > 0);
          this.markPrescriptionVisitSaleCompleted(visitId, billable.length ? billable : allRows);
          this.notifyClientVisitPharmacyUpdated(visitId, allTreatmentIds, res);
          if (collectPayment) {
            this.openReceiptModal(
              saleData,
              cartSnapshot,
              total,
              received,
              changeAmt,
              receivedBy,
              clientName
            );
          }
          const saleNo = saleData?.saleNo ? ` (${saleData.saleNo})` : '';
          const backendMsg = String(res?.message ?? res?.data?.message ?? '').trim();
          const notGivenCount = allRows.filter(
            (row) => !billable.some((b) => this.samePrescriptionRow(b, row))
          ).length;
          const visitNote = backendMsg.includes('Visit')
            ? collectPayment
              ? ' Visit payment / invoice updated.'
              : ' Visit invoice updated (balance remains until paid).'
            : '';
          const outOfStockNote =
            notGivenCount > 0
              ? ` ${notGivenCount} item(s) not dispensed (out of stock or qty 0).`
              : '';
          this.flashStatus(
            (backendMsg ||
              (collectPayment
                ? `Dispensed with payment${saleNo} — ${this.formatMoney(total)}. Change: ${this.formatMoney(changeAmt)}.`
                : `Dispensed without payment${saleNo} — ${this.formatMoney(total)} on visit balance.`)) +
              outOfStockNote +
              visitNote,
            false
          );
          this.loadDoctorPrescriptions();
          this.loadSalesHistory();
          this.loadPharmacyStock();
        },
        error: (err: any) => {
          this.processing = false;
          for (const row of billable) {
            row.given = row.dispensed === true;
          }
          this.flashStatus(this.extractApiErrorMessage(err, 'Prescription dispense could not be completed.'), true);
        },
      });
  }

  private prescriptionRowToSaleLine(row: DoctorPrescriptionRow): Record<string, unknown> {
    if (this.isSundryPrescriptionRow(row)) {
      return {
        visitSundryId: row.visitSundryId || row.id,
        given: row.given,
        quantity: row.given ? row.quantity : row.prescribedQuantity || row.quantity,
      };
    }
    const line: Record<string, unknown> = {
      treatmentRequestedId: row.id,
      given: row.given,
      quantity: row.given ? row.quantity : row.prescribedQuantity || row.quantity,
      amountPerFrequencyValue: row.amountPerFrequencyValue ?? undefined,
      amountPerFrequencyUnit: row.amountPerFrequencyUnit || undefined,
      frequencyValue: row.frequencyValue ?? undefined,
      frequencyUnit: this.parseRxFrequencyUnit(row.frequencyUnit) ?? undefined,
      durationValue: row.durationValue ?? undefined,
      durationUnit: this.parseRxFrequencyUnit(row.durationUnit) ?? undefined,
      totalUnits: row.totalUnits ?? undefined,
      instructions: row.instructions || undefined,
      route: row.route || undefined,
    };
    if (this.pharmacyUseStockBatch) {
      if (row.stockBatchId != null && row.stockBatchId > 0) {
        line['stockBatchId'] = row.stockBatchId;
      }
    } else if (row.itemId != null && row.itemId > 0) {
      line['itemId'] = row.itemId;
    }
    return line;
  }

  private extractApiErrorMessage(err: any, fallback: string): string {
    const body = err?.error;
    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }
    if (body?.message) {
      return String(body.message);
    }
    if (body?.label) {
      return String(body.label);
    }
    if (err?.message) {
      return String(err.message);
    }
    return fallback;
  }

  completeSale(): void {
    if (this.processing || !this.otcOnlyCart.length) {
      return;
    }
    // Editing a sold document: products are already in Current Order — skip client/order gates.
    if (this.isEditingSoldDocument && this.lockedDocumentType) {
      const billable = this.otcOnlyCart.filter((line) => line.given);
      if (!billable.length) {
        this.flashStatus('Add at least one product or service to update.', true);
        return;
      }
      const total = this.cartPayableTotal;
      if (total <= 0) {
        this.flashStatus('Order total must be greater than zero.', true);
        return;
      }
      const docType = normalizeCommercialDocType(this.lockedDocumentType);
      if (commercialDocDeductsStock(docType)) {
        this.executeStockSale(docType);
      } else {
        this.openDocumentOnlyPreview(docType);
      }
      return;
    }
    if (!this.hasPosSaleClientAttached()) {
      this.flashStatus('Attach a client before completing the sale.', true);
      this.openPosClientPicker();
      return;
    }
    if (this.posSaleOrderAttaching || this.posOrderPickerCreating) {
      this.flashStatus('Creating order… please wait.', true);
      return;
    }
    this.ensureNewPosOrderForDocument(() => this.finishCompleteSale());
  }

  private finishCompleteSale(): void {
    if (this.processing || !this.otcOnlyCart.length) {
      return;
    }
    const billable = this.otcOnlyCart.filter((line) => line.given);
    if (!billable.length) {
      this.flashStatus('Mark at least one line as Given to include it in the bill.', true);
      return;
    }
    const total = this.cartPayableTotal;
    if (total <= 0) {
      this.flashStatus('Sale total must be greater than zero.', true);
      return;
    }
    // Use the document type selected on the payment step (radios).
    const docType = normalizeCommercialDocType(this.pendingPosDocType);
    if (commercialDocDeductsStock(docType)) {
      this.executeStockSale(docType);
    } else {
      this.openDocumentOnlyPreview(docType);
    }
  }

  /** @deprecated Document type is chosen via payment-step radios. */
  closePosDocTypeModal(): void {
    // no-op — modal removed
  }

  selectPendingPosDocType(docType: CommercialDocType): void {
    this.onCheckoutDocTypeChange(docType);
  }

  confirmPosDocTypeAndProceed(): void {
    const docType = normalizeCommercialDocType(this.pendingPosDocType);
    if (commercialDocDeductsStock(docType)) {
      this.executeStockSale(docType);
    } else {
      this.openDocumentOnlyPreview(docType);
    }
  }

  /** Quotation / proforma: save document without stock deduction, then show preview. */
  private openDocumentOnlyPreview(docType: CommercialDocType): void {
    const billable = this.otcOnlyCart.filter((line) => line.given);
    if (!billable.length) {
      this.flashStatus('Add at least one product.', true);
      return;
    }
    if (!this.posSaleClientId && !this.isEditingSoldDocument) {
      this.flashStatus('Attach a client before creating the document.', true);
      return;
    }
    if (!this.hasPosSaleOrderReady() && !(this.isEditingSoldDocument && this.posSaleVisitId)) {
      if (this.isEditingSoldDocument) {
        this.flashStatus('This update needs the original order.', true);
        return;
      }
      this.ensureNewPosOrderForDocument(() => this.openDocumentOnlyPreview(docType));
      return;
    }
    const total = this.cartPayableTotal;
    const receivedBy = this.loggedInStaffName();
    const clientName = this.posSaleClientName.trim() || 'Client';
    const patientId = this.posSaleClientId ?? undefined;
    const visitId = this.posSaleVisitId!;
    const received = Math.max(0, this.num(this.amountReceived));
    // Quotation with cash: create Q→PF→INV→Receipt and record payment.
    // Quotation with no amount: quotation only.
    const takePayment = received > 0;

    this.processing = true;
    this.flashStatus(
      this.isEditingSoldDocument
        ? `Updating ${commercialDocTitle(docType)}…`
        : `Saving ${commercialDocTitle(docType)}…`,
      false
    );

    this.api
      .completeOtcPharmacySale({
        amountReceived: received,
        paymentForm: takePayment ? this.paymentMethod : commercialDocTitle(docType),
        receivedBy,
        notes: this.saleNotes || (docType === 'quotation' ? 'OTC quotation' : 'OTC proforma invoice'),
        patientId,
        patientName: clientName,
        clientName,
        visitId,
        recordPayment: takePayment && !this.isEditingSoldDocument,
        deductStock: false,
        documentType: docType,
        saleId: this.isEditingSoldDocument ? this.editingSoldSaleId : null,
        discount: this.cartOverallDiscount,
        tax: this.cartTax,
        payableTotal: total,
        lines: billable.map((line) => {
          const payload: Record<string, unknown> = {
            given: line.given,
            quantity: line.quantity,
            unitSellingModelId:
              line.useUnitSellingModel === false ? undefined : line.unitSellingModelId ?? undefined,
            unitSellingPrice: (() => {
              const p = this.num(line.unitSellingPrice);
              return p > 0 ? p : undefined;
            })(),
            totalAmount: (() => {
              const t = Math.max(
                0,
                this.num(line.totalAmount) - this.num(line.discountAmount)
              );
              return t > 0 ? t : undefined;
            })(),
          };
          if (line.stockBatchId != null && line.stockBatchId > 0) {
            payload['stockBatchId'] = line.stockBatchId;
          } else if (
            line.itemId != null &&
            line.itemId > 0 &&
            (line.isService || this.pharmacyUseStockBatch)
          ) {
            payload['stockItemId'] = line.itemId;
          } else if (line.itemId != null && line.itemId > 0) {
            payload['itemId'] = line.itemId;
          }
          return payload;
        }),
      })
      .subscribe({
        next: (res: any) => {
          this.processing = false;
          const saleData = this.extractCompletedSalePayload(res);
          const cartSnapshot = billable.map((line) => ({ ...line }));
          const createdNewDocument = !this.isEditingSoldDocument;
          this.clearDocumentEditMode();
          this.cart = [];
          this.overallDiscountAmount = 0;
          this.amountReceived = null;
          this.posShowPaymentStep = false;
          if (createdNewDocument) {
            this.releasePosSaleOrder();
          }
          this.loadSalesHistory();
          this.flashStatus(
            takePayment
              ? `${commercialDocTitle(docType)} saved — payment of ${this.formatMoney(received)} recorded; quotation / proforma / receipt prepared.`
              : `${commercialDocTitle(docType)} saved — stock was not deducted.`,
            false
          );
          // Payment at quote/proforma stage: open the receipt that holds paid amounts.
          if (takePayment && visitId > 0) {
            const orderStub = {
              orderKey: `ORDER:${visitId}`,
              orderNo: saleData?.saleNo || `${docType === 'quotation' ? 'Q' : 'PF'}`,
              saleSource: 'OTC',
              visitDate: '',
              visitTime: '',
              visitId,
              amountReceived: received,
              saleTotalAmount: total,
              totalSell: total,
              totalCost: 0,
              lineCount: cartSnapshot.length,
              documentType: 'receipt',
              clientName,
              receivedBy,
              lines: [],
            } as PharmacySoldOrder;
            this.openUpdatedReceiptAfterOrderPayment(orderStub, {
              ...saleData,
              amountReceived: received,
              totalAmount: total,
              documentType: 'receipt',
            });
            return;
          }
          this.openReceiptModal(
            {
              ...saleData,
              saleNo:
                saleData?.saleNo ||
                `${docType === 'quotation' ? 'Q' : 'PF'}-${Date.now()}`,
              paymentForm: commercialDocTitle(docType),
              notes:
                this.saleNotes ||
                (docType === 'quotation' ? 'OTC quotation' : 'OTC proforma invoice'),
              clientName,
              receivedBy,
              amountReceived: 0,
              changeAmount: 0,
            },
            cartSnapshot,
            total,
            0,
            0,
            receivedBy,
            clientName,
            docType
          );
        },
        error: (err) => {
          this.processing = false;
          this.flashStatus(
            this.extractApiErrorMessage(err, `Could not save ${commercialDocTitle(docType)}.`),
            true
          );
        },
      });
  }

  /** Sales invoice / receipt: complete API sale and deduct stock. */
  private executeStockSale(docType: CommercialDocType): void {
    const billable = this.otcOnlyCart.filter((line) => line.given);
    const total = this.cartPayableTotal;
    const received = this.isEditingSoldDocument
      ? Math.max(0, this.num(this.amountReceived))
      : this.effectiveAmountReceived(this.amountReceived, total);
    const takePayment = received > 0 || commercialDocShowsAmountReceived(docType);
    const hasClientOrOrder =
      (this.posSaleClientId != null && this.posSaleClientId > 0) ||
      (this.posSaleVisitId != null && this.posSaleVisitId > 0);
    if (takePayment && received < total && !hasClientOrOrder) {
      this.flashStatus('Amount received is less than total due. Attach a client to leave the balance as amount due.', true);
      return;
    }
    if (!this.hasPosSaleOrderReady()) {
      if (this.isEditingSoldDocument && this.posSaleVisitId != null && this.posSaleVisitId > 0) {
        // order already attached for edit
      } else if (this.isEditingSoldDocument) {
        this.flashStatus('This update needs the original order.', true);
        return;
      } else {
        this.ensureNewPosOrderForDocument(() => this.executeStockSale(docType));
        return;
      }
    }

    this.processing = true;
    this.flashStatus(this.isEditingSoldDocument ? 'Updating…' : 'Processing sale…', false);
    const receivedBy = this.loggedInStaffName();
    const clientName = this.posSaleClientName.trim() || 'Client';
    const patientId = this.posSaleClientId!;
    const visitId = this.posSaleVisitId!;
    const amountDue = Math.max(0, roundUgxMoney(total - received));
    // On revise, do not re-create the original payment — keep prior tender and roll extras into debt.
    const shouldRecordPayment =
      !this.isEditingSoldDocument &&
      received > 0 &&
      (takePayment ||
        docType === 'receipt' ||
        docType === 'efris_receipt' ||
        docType === 'sales_invoice');

    this.api
      .completeOtcPharmacySale({
        amountReceived: received,
        paymentForm: received > 0 ? this.paymentMethod : commercialDocTitle(docType),
        receivedBy,
        notes:
          this.saleNotes ||
          (docType === 'efris_receipt'
            ? 'OTC EFRIS receipt payment'
            : docType === 'receipt'
              ? 'OTC receipt payment'
              : docType === 'sales_invoice'
                ? 'OTC sales invoice'
                : 'OTC counter sale'),
        patientId,
        patientName: clientName,
        clientName,
        visitId,
        documentType: docType,
        deductStock: true,
        recordPayment: shouldRecordPayment,
        saleId: this.isEditingSoldDocument ? this.editingSoldSaleId : null,
        discount: this.cartOverallDiscount,
        tax: this.cartTax,
        payableTotal: total,
        lines: billable.map((line) => {
          const payload: Record<string, unknown> = {
            treatmentRequestedId: line.treatmentRequestedId,
            given: line.given,
            quantity: line.quantity,
            amountPerFrequencyValue: line.amountPerFrequencyValue ?? undefined,
            amountPerFrequencyUnit: line.amountPerFrequencyUnit || undefined,
            frequencyValue: line.frequencyValue ?? undefined,
            frequencyUnit: line.frequencyUnit ?? undefined,
            durationValue: line.durationValue ?? undefined,
            durationUnit: line.durationUnit ?? undefined,
            totalUnits: line.totalUnits ?? undefined,
            instructions: line.instructions || undefined,
            route: line.route || undefined,
            unitSellingModelId:
              line.useUnitSellingModel === false ? undefined : line.unitSellingModelId ?? undefined,
            unitSellingPrice: (() => {
              const p = this.num(line.unitSellingPrice);
              return p > 0 ? p : undefined;
            })(),
            totalAmount: (() => {
              const t = Math.max(
                0,
                this.num(line.totalAmount) - this.num(line.discountAmount)
              );
              return t > 0 ? t : undefined;
            })(),
          };
          if (line.stockBatchId != null && line.stockBatchId > 0) {
            payload['stockBatchId'] = line.stockBatchId;
          } else if (
            line.itemId != null &&
            line.itemId > 0 &&
            (line.isService || this.pharmacyUseStockBatch)
          ) {
            payload['stockItemId'] = line.itemId;
          } else if (line.itemId != null && line.itemId > 0) {
            payload['itemId'] = line.itemId;
          }
          return payload;
        }),
      })
      .subscribe({
        next: (res: any) => {
          this.processing = false;
          const receivedAmt = received;
          const changeAmt = Math.max(0, receivedAmt - total);
          const cartSnapshot = billable.map((line) => ({ ...line }));
          const saleData = this.extractCompletedSalePayload(res);
          this.openReceiptModal(
            saleData,
            cartSnapshot,
            total,
            receivedAmt,
            changeAmt,
            receivedBy,
            clientName,
            docType
          );
          const saleNo = saleData?.saleNo ? ` (${saleData.saleNo})` : '';
          const dueNote =
            amountDue > 0.009
              ? ` Amount due: ${this.formatMoney(amountDue)}.`
              : '';
          this.flashStatus(
            this.isEditingSoldDocument
              ? `Updated${saleNo} — ${this.formatMoney(total)}.${dueNote}`
              : `Sale completed${saleNo} — ${this.formatMoney(total)}. Change: ${this.formatMoney(changeAmt)}.${dueNote}`,
            false
          );
          this.clearCart();
          this.loadPharmacyStock();
          this.loadSalesHistory();
          this.loadDoctorPrescriptions();
        },
        error: (err: any) => {
          this.processing = false;
          this.flashStatus(this.extractApiErrorMessage(err, 'Sale could not be completed.'), true);
        },
      });
  }

  loadSalesHistoryLast7Days(): void {
    this.filterDateFrom = '';
    this.filterDateTo = '';
    const { from, to } = this.getLast7DaysRange();
    this.fetchSalesHistory(from, to);
  }

  applySalesDateFilter(): void {
    const from = (this.filterDateFrom || '').trim();
    const to = (this.filterDateTo || '').trim();
    if (from && to) {
      this.fetchSalesHistory(from, to);
    } else if (!from && !to) {
      this.loadSalesHistoryLast7Days();
    } else {
      this.fetchSalesHistory(from || undefined, to || undefined);
    }
  }

  salesDateFilterSummary(): string {
    const from = (this.filterDateFrom || '').trim();
    const to = (this.filterDateTo || '').trim();
    if (from && to) {
      return `${from} → ${to}`;
    }
    if (from) {
      return `From ${from}`;
    }
    if (to) {
      return `To ${to}`;
    }
    return 'Last 7 days';
  }

  openSalesDateFilterModal(): void {
    const range = this.getLast7DaysRange();
    this.salesDateFilterDraft = {
      from: (this.filterDateFrom || '').trim() || range.from,
      to: (this.filterDateTo || '').trim() || range.to,
    };
    this.showSalesDateFilterModal = true;
  }

  closeSalesDateFilterModal(): void {
    this.showSalesDateFilterModal = false;
  }

  applySalesDateFilterFromModal(): void {
    this.filterDateFrom = (this.salesDateFilterDraft.from || '').trim();
    this.filterDateTo = (this.salesDateFilterDraft.to || '').trim();
    this.showSalesDateFilterModal = false;
    this.applySalesDateFilter();
  }

  applySalesDatePreset(kind: 'today' | 'lastMonth' | 'last7'): void {
    const range =
      kind === 'today'
        ? this.getTodayRange()
        : kind === 'lastMonth'
          ? this.getLastMonthRange()
          : this.getLast7DaysRange();
    this.salesDateFilterDraft = { from: range.from, to: range.to };
    this.filterDateFrom = range.from;
    this.filterDateTo = range.to;
    this.showSalesDateFilterModal = false;
    this.fetchSalesHistory(range.from, range.to);
  }

  clearSalesFilters(): void {
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.salesHistoryDrugSearch = '';
    this.salesHistoryStaffFilter = '';
    this.salesHistorySourceFilter = '';
    this.loadSalesHistoryLast7Days();
  }

  loadSalesHistory(): void {
    const from = (this.filterDateFrom || '').trim();
    const to = (this.filterDateTo || '').trim();
    if (from || to) {
      this.applySalesDateFilter();
      return;
    }
    const { from: f, to: t } = this.getLast7DaysRange();
    this.fetchSalesHistory(f, t);
  }

  private fetchSalesHistory(fromDate?: string, toDate?: string): void {
    this.loadingSalesHistory = true;
    this.salesHistoryError = '';
    const range = {
      from: (fromDate || '').trim() || this.getLast7DaysRange().from,
      to: (toDate || '').trim() || this.getLast7DaysRange().to,
    };

    this.api
      .listOtcPharmacySales(range.from, range.to)
      .pipe(
        map((rows) =>
          (Array.isArray(rows) ? rows : [])
            .map((r) => this.mapHistoryRow(r))
            .sort((a, b) => this.compareSoldRows(b, a))
        ),
        catchError((err) => {
          this.salesHistoryError = err?.message || 'Failed to load sales history.';
          return of([] as OtcSoldRow[]);
        })
      )
      .subscribe((rows) => {
        this.soldRows = rows;
        this.soldOrders = this.groupRowsIntoOrders(rows);
        this.enrichSoldOrdersMissingClientNames(this.soldOrders);
        this.loadingSalesHistory = false;
      });
  }

  private groupRowsIntoOrders(rows: OtcSoldRow[]): PharmacySoldOrder[] {
    const map = new Map<string, PharmacySoldOrder>();
    for (const row of rows) {
      const key = this.soldOrderGroupKey(row);
      let order = map.get(key);
      if (!order) {
        order = {
          orderKey: key,
          orderNo: this.formatSoldOrderNo(row),
          saleSource: row.saleSource,
          visitDate: row.visitDate,
          visitTime: row.visitTime,
          visitId: row.visitId,
          visitNumber: row.visitNumber,
          clientName: row.clientName,
          documentType: row.documentType,
          totalCost: 0,
          totalSell: 0,
          amountReceived: this.num(row.amountReceived),
          saleTotalAmount: this.num(row.saleTotalAmount) || undefined,
          patientId: row.patientId != null && row.patientId > 0 ? row.patientId : null,
          goodsDelivered: row.goodsDelivered === true,
          deliveryNote: row.deliveryNote,
          active: row.active !== false,
          lineCount: 0,
          lines: [],
          receivedBy: this.normalizeReceivedBy(row.receivedBy),
        };
        map.set(key, order);
      }
      order.lines.push(row);
      if (row.active === false) {
        order.active = false;
      }
      if (!order.receivedBy) {
        order.receivedBy = this.normalizeReceivedBy(row.receivedBy);
      }
      if (!order.clientName && row.clientName) {
        order.clientName = row.clientName;
      }
      if (row.goodsDelivered === true) {
        order.goodsDelivered = true;
      }
      if (!order.deliveryNote && row.deliveryNote) {
        order.deliveryNote = row.deliveryNote;
      }
      if (!order.visitId && row.visitId) {
        order.visitId = row.visitId;
      }
      if (!order.visitNumber && row.visitNumber) {
        order.visitNumber = row.visitNumber;
      }
      if (
        !(order.patientId != null && order.patientId > 0) &&
        row.patientId != null &&
        row.patientId > 0
      ) {
        order.patientId = row.patientId;
      }
      // Keep furthest pipeline document type while collecting (finalized below).
      const rowDoc = String(row.documentType || '').trim();
      const curDoc = String(order.documentType || '').trim();
      if (
        rowDoc &&
        this.soldOrderPipelineStepIndex(this.docTypeCodeForPipeline(rowDoc)) >
          this.soldOrderPipelineStepIndex(this.docTypeCodeForPipeline(curDoc || 'quotation'))
      ) {
        order.documentType = row.documentType;
      } else if (!order.documentType && row.documentType) {
        order.documentType = row.documentType;
      }
    }
    // One order row: use the furthest document's lines/totals (not every Q/PF/INV/REC copy).
    for (const order of map.values()) {
      this.collapseOrderToPrimaryDocument(order);
    }
    return Array.from(map.values()).sort((a, b) => this.compareSoldOrders(b, a));
  }

  /** Map raw documentType to pipeline code used by progress steps. */
  private docTypeCodeForPipeline(raw: string): string {
    const t = String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    if (t === 'quotation' || t === 'quote' || t === 'sales_order' || t === 'salesorder') {
      return t === 'sales_order' || t === 'salesorder' ? 'sales_order' : 'quotation';
    }
    if (t === 'proforma' || t === 'proforma_invoice') {
      return 'proforma';
    }
    if (t === 'sales_invoice' || t === 'invoice') {
      return 'sales_invoice';
    }
    if (t === 'efris_receipt' || t === 'efris' || t === 'efrisreceipt') {
      return 'efris_receipt';
    }
    if (t === 'delivery_note' || t === 'delivery' || t === 'deliverynote') {
      return 'delivery_note';
    }
    if (t === 'receipt' || t === 'payment' || t === 'payments') {
      return 'receipt';
    }
    return t || 'quotation';
  }

  /**
   * When an order has quotation + proforma + invoice + receipt lines, keep one set of
   * product lines (furthest stage) and payment totals from the receipt when present.
   */
  private collapseOrderToPrimaryDocument(order: PharmacySoldOrder): void {
    const lines = order.lines || [];
    if (!lines.length) {
      return;
    }

    const bySale = new Map<number, OtcSoldRow[]>();
    for (const line of lines) {
      const saleId = Number(line.saleId) || 0;
      const bucket = bySale.get(saleId);
      if (bucket) {
        bucket.push(line);
      } else {
        bySale.set(saleId, [line]);
      }
    }

    let primarySaleId = Number(lines[0].saleId) || 0;
    let primaryRank = -1;
    let paymentSaleId = primarySaleId;
    let paymentRank = -1;

    bySale.forEach((saleLines, saleId) => {
      const rawDoc = String(saleLines[0]?.documentType || order.documentType || 'receipt');
      const code = this.docTypeCodeForPipeline(rawDoc);
      const rank = this.soldOrderPipelineStepIndex(code);
      if (rank > primaryRank || (rank === primaryRank && saleId > primarySaleId)) {
        primaryRank = rank;
        primarySaleId = saleId;
      }
      if (code === 'receipt' || code === 'efris_receipt') {
        if (rank >= paymentRank) {
          paymentRank = rank;
          paymentSaleId = saleId;
        }
      }
    });

    const primaryLines = bySale.get(primarySaleId) || lines;
    const paymentLines = bySale.get(paymentSaleId) || primaryLines;
    const primary = primaryLines[0];
    const payment = paymentLines[0];

    order.lines = primaryLines;
    order.lineCount = primaryLines.length;
    order.documentType = primary?.documentType || order.documentType;
    order.saleTotalAmount =
      this.num(primary?.saleTotalAmount) > 0
        ? this.num(primary.saleTotalAmount)
        : undefined;
    // Prefer receipt amounts for Paid / Debt when that document exists.
    order.amountReceived = this.num(payment?.amountReceived);
    if (
      this.num(payment?.saleTotalAmount) > 0 &&
      (paymentSaleId === primarySaleId || !(this.num(order.saleTotalAmount) > 0))
    ) {
      order.saleTotalAmount = this.num(payment.saleTotalAmount);
    }
    order.totalCost = primaryLines.reduce(
      (sum, line) => sum + this.num(line.quantity) * this.num(line.unitBuy),
      0
    );
    const saleTotal = this.num(order.saleTotalAmount);
    order.totalSell =
      saleTotal > 0
        ? saleTotal
        : primaryLines.reduce((sum, line) => sum + this.num(line.totalAmount), 0);

    if (primary?.visitDate) {
      order.visitDate = primary.visitDate;
    }
    if (primary?.visitTime) {
      order.visitTime = primary.visitTime;
    }
    const staff = this.normalizeReceivedBy(primary?.receivedBy);
    if (staff) {
      order.receivedBy = staff;
    }
    if (order.visitNumber != null && order.visitNumber > 0) {
      order.orderNo = `ORDER-${order.visitNumber}`;
    } else if (order.visitId != null && order.visitId > 0) {
      order.orderNo = `ORDER-${order.visitId}`;
    } else if (primary?.saleNo) {
      order.orderNo = this.formatSoldOrderNo(primary);
    }
  }

  private formatSoldOrderNo(row: OtcSoldRow): string {
    const visitNumber = Number(row.visitNumber);
    if (Number.isFinite(visitNumber) && visitNumber > 0) {
      return `ORDER-${visitNumber}`;
    }
    const visitId = Number(row.visitId);
    if (Number.isFinite(visitId) && visitId > 0) {
      return `ORDER-${visitId}`;
    }
    const raw = String(row.saleNo || '').trim();
    if (raw) {
      // Display Order-N for client orders (legacy VISIT-N stored values included).
      return raw.replace(/^VISIT([-_\s]?)/i, 'ORDER$1');
    }
    if (row.saleSource === 'RX') {
      const n = row.visitNumber ?? row.visitId ?? row.saleId;
      return `ORDER-${n}`;
    }
    return `OTC-${row.saleId}`;
  }

  /** One Products sold row per client order (visit), not per commercial document. */
  private soldOrderGroupKey(row: OtcSoldRow): string {
    const visitId = Number(row.visitId);
    if (Number.isFinite(visitId) && visitId > 0) {
      return `ORDER:${visitId}`;
    }
    if (row.saleSource === 'RX') {
      const saleId = Number(row.saleId);
      if (Number.isFinite(saleId) && saleId > 0) {
        return `RX-SALE:${saleId}`;
      }
      return `RX:${row.saleNo || row.lineId}`;
    }
    return `OTC:${row.saleId || row.saleNo}`;
  }

  private compareSoldOrders(a: PharmacySoldOrder, b: PharmacySoldOrder): number {
    const da = `${a.visitDate} ${a.visitTime}`;
    const db = `${b.visitDate} ${b.visitTime}`;
    return da.localeCompare(db);
  }

  loadDoctorPrescriptions(): void {
    this.loadingDoctorPrescriptions = true;
    this.doctorPrescriptionsError = '';
    const runLoad = (toModuleId: number | null) => {
      this.api
      .listPendingDoctorPrescriptions(toModuleId)
      .pipe(
        map((rows) =>
          (Array.isArray(rows) ? rows : [])
            .filter((r) => this.isPrescriptionQueuePendingStatus(r?.status))
            .map((r) => this.mapDoctorPrescriptionRow(r))
        ),
        catchError((err) => {
          this.doctorPrescriptionsError =
            err?.error?.message || err?.message || 'Failed to load doctor prescriptions.';
          return of([] as DoctorPrescriptionRow[]);
        })
      )
      .subscribe((rows: DoctorPrescriptionRow[]) => {
        const pendingRows = rows.filter(
          (row) => !this.completedPrescriptionVisitIds.has(row.visitId)
        );
        const doneRows: DoctorPrescriptionRow[] = [];
        for (const visitId of this.completedPrescriptionVisitIds) {
          const snapshot = this.soldPrescriptionVisitSnapshots.get(visitId);
          if (snapshot?.length) {
            doneRows.push(...snapshot);
          }
        }
        this.doctorPrescriptionRows = [...pendingRows, ...doneRows];
        this.applyPrescriptionStockAvailability(pendingRows);
        this.loadingDoctorPrescriptions = false;
        const visits = this.groupedPrescriptionVisits();
        if (!visits.length) {
          this.selectedPrescriptionVisitId = null;
          this.selectedPrescriptionDetailRows = [];
          this.prescriptionSundriesRows = [];
          this.prescriptionSundriesLoading = false;
          return;
        }
        const stillSelected = visits.some(
          (g) => g.visitId === this.selectedPrescriptionVisitId
        );
        if (!stillSelected) {
          const first = visits[0];
          this.selectPrescriptionVisit(first.visitId, first.rows);
        } else if (this.selectedPrescriptionVisitId != null) {
          this.selectPrescriptionVisit(this.selectedPrescriptionVisitId);
        }
      });
    };

    const cached = getQueuePageModuleIdFromSession();
    if (cached) {
      this.pharmacyModuleId = cached;
      runLoad(cached);
      return;
    }
    this.api.getAllBusinessModules().subscribe({
      next: (res: any) => {
        const modules = normalizeBusinessModules(res);
        this.businessModules = modules;
        const id = resolveModuleIdForUrl(this.router.url, modules);
        this.pharmacyModuleId = id;
        applyQueuePageModuleToSession(id);
        runLoad(id);
      },
      error: () => runLoad(null),
    });
  }

  private loadPrescriptionSundriesForSelectedVisit(): void {
    const visitId = Number(this.selectedPrescriptionVisitId);
    if (!Number.isFinite(visitId) || visitId <= 0) {
      this.prescriptionSundriesRows = [];
      this.prescriptionSundriesLoading = false;
      return;
    }
    this.prescriptionSundriesLoading = true;
    this.api.getVisitSundriesByVisitId(visitId).subscribe({
      next: (rows: any[]) => {
        const list = Array.isArray(rows) ? rows : [];
        this.prescriptionSundriesRows = list;
        this.prescriptionSundriesLoading = false;
        // Fallback for backends that do not yet return sundries in pending Rx list:
        // merge undispensed sundries into the dispense item lines.
        const alreadyHasSundry = this.selectedPrescriptionDetailRows.some((r) =>
          this.isSundryPrescriptionRow(r)
        );
        if (alreadyHasSundry) {
          this.cdr.markForCheck();
          return;
        }
        const group = this.selectedPrescriptionGroup();
        const mapped = list
          .filter((s) => s && s.dispensed !== true && s.dispensed !== 1 && `${s.dispensed}` !== '1')
          .map((s) =>
            this.mapDoctorPrescriptionRow({
              ...s,
              id: s.id,
              visitSundryId: s.id,
              lineKind: 'SUNDRY',
              quantity: s.quantityUsed ?? s.quantity,
              unitBuy: s.unitCostPrice,
              unitSellingPrice: s.unitSellingPrice,
              totalAmount: s.lineTotal,
              visitId,
              visitNumber: group?.visitNumber ?? 0,
              visitDate: group?.visitDate ?? '',
              visitTime: group?.visitTime ?? '',
              clientName: group?.clientName ?? '',
              clientId: this.selectedPrescriptionDetailRows[0]?.clientId ?? null,
              status: 'pending',
              paid: true,
              dispensed: false,
              route: 'SUNDRY',
              dosage: 'Sundry',
            })
          )
          .filter((r) => r.id > 0 && this.num(r.quantity) > 0);
        if (mapped.length) {
          this.selectedPrescriptionDetailRows = [
            ...this.selectedPrescriptionDetailRows,
            ...mapped,
          ];
          this.syncRxAmountReceivedToSubtotal();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.prescriptionSundriesRows = [];
        this.prescriptionSundriesLoading = false;
      },
    });
  }

  openPrescriptionVisit(row: DoctorPrescriptionRow): void {
    const clientId = row?.clientId;
    const visitId = row?.visitId;
    if (!clientId || !visitId) {
      this.flashStatus('Client or visit not found for this prescription.', true);
      return;
    }
    if (this.openingPrescriptionVisitId != null) {
      return;
    }
    this.openingPrescriptionVisitId = visitId;
    const parts = (row.clientName || '').trim().split(/\s+/);
    const item = {
      id: clientId,
      clientId,
      clientFirstName: parts.slice(1).join(' ') || parts[0] || '',
      clientSecondName: parts.length > 1 ? parts[0] : '',
      clientFileNo: '',
      clientProfilePic: 'assets/images/vector.jpeg',
    };
    this.api.getClientVisitByVisitId(visitId).subscribe({
      next: (visitRes) => {
        const initialVisit = visitRes != null && typeof visitRes === 'object' ? visitRes : { id: visitId };
        sessionStorage.setItem('item', JSON.stringify(item));
        sessionStorage.setItem('initialClientVisit', JSON.stringify(initialVisit));
        sessionStorage.setItem('clientVisitOpenTab', 'pharmacy');
        sessionStorage.setItem('pharmacistDispenseMode', 'true');
        this.openingPrescriptionVisitId = null;
        this.router.navigate(['/overview/otc-dispensary']);
      },
      error: () => {
        sessionStorage.setItem('item', JSON.stringify(item));
        sessionStorage.setItem('initialClientVisit', JSON.stringify({ id: visitId }));
        sessionStorage.setItem('clientVisitOpenTab', 'pharmacy');
        sessionStorage.setItem('pharmacistDispenseMode', 'true');
        this.openingPrescriptionVisitId = null;
        this.router.navigate(['/overview/otc-dispensary']);
      },
    });
  }

  private formatDisplayName(name: string | null | undefined): string {
    const raw = String(name ?? '').trim();
    if (!raw || raw === '—') {
      return raw;
    }
    return raw
      .split(/\s+/)
      .map((part) =>
        part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ''
      )
      .join(' ');
  }

  private mapDoctorPrescriptionRow(row: any): DoctorPrescriptionRow {
    const time = row?.visitTime != null ? String(row.visitTime) : '';
    const rawUnit = String(row?.amountPerFrequencyUnit ?? '').trim();
    const mappedUnit = rawUnit ? mapPrescribingUnitToDosageUnit(rawUnit) : '';
    const dosageLabel = String(row?.dosage ?? '').trim();
    const lineKindRaw = String(row?.lineKind ?? row?.line_kind ?? '').trim().toUpperCase();
    const visitSundryId =
      row?.visitSundryId != null
        ? Number(row.visitSundryId)
        : row?.visit_sundry_id != null
          ? Number(row.visit_sundry_id)
          : null;
    const isSundry =
      lineKindRaw === 'SUNDRY' ||
      (visitSundryId != null && visitSundryId > 0) ||
      String(row?.route ?? '').toUpperCase() === 'SUNDRY';
    return {
      id: Number(row?.id) || 0,
      clientId: row?.clientId != null ? Number(row.clientId) : null,
      visitId: Number(row?.visitId) || 0,
      visitNumber: Number(row?.visitNumber) || 0,
      visitDate: row?.visitDate != null ? String(row.visitDate) : '',
      visitTime: time.length > 8 ? time.slice(0, 8) : time,
      clientName: this.formatDisplayName(row?.clientName) || '—',
      stockBatchId: row?.stockBatchId != null ? Number(row.stockBatchId) : null,
      itemId: row?.itemId != null ? Number(row.itemId) : null,
      given: row?.paid !== false,
      paid: row?.paid !== false,
      dispensed: row?.dispensed === true || this.isPrescriptionStatusGiven(row?.status),
      administered: row?.administered === true,
      itemName: row?.itemName || (isSundry ? 'Sundry item' : '—'),
      status: row?.status || 'pending',
      prescribedQuantity: this.num(row?.quantity ?? row?.quantityUsed),
      quantity: this.num(row?.quantity ?? row?.quantityUsed),
      unitBuy: this.num(row?.unitBuy ?? row?.unitCostPrice),
      unitSellingPrice: this.num(row?.unitSellingPrice),
      dosage: isSundry
        ? 'Sundry'
        : this.otcPrescribingLabel(
            dosageLabel,
            row?.amountPerFrequencyValue,
            mappedUnit || rawUnit
          ),
      amountPerFrequencyValue: this.numOrNull(row?.amountPerFrequencyValue),
      amountPerFrequencyUnit: mappedUnit || rawUnit,
      frequencyValue: this.numOrNull(row?.frequencyValue),
      frequencyUnit: row?.frequencyUnit ?? null,
      durationValue: this.numOrNull(row?.durationValue),
      durationUnit: row?.durationUnit ?? null,
      totalUnits: this.num(row?.totalUnits ?? row?.quantity ?? row?.quantityUsed),
      totalAmount: this.prescriptionLineAmountFromApi(row),
      instructions: row?.instructions || '',
      route: isSundry ? 'SUNDRY' : row?.route || '',
      lineKind: isSundry ? 'SUNDRY' : 'RX',
      visitSundryId: isSundry ? visitSundryId || Number(row?.id) || null : null,
    };
  }

  private prescriptionLineAmountFromApi(row: any): number {
    const stored = this.num(row?.totalAmount ?? row?.lineTotal);
    if (stored > 0) {
      return stored;
    }
    return this.num(row?.quantity ?? row?.quantityUsed) * this.num(row?.unitSellingPrice);
  }

  private mapHistoryRow(row: any): OtcSoldRow {
    const time = row?.saleTime != null ? String(row.saleTime) : '';
    const qty = this.num(row?.quantity);
    const rawUnit = String(row?.amountPerFrequencyUnit ?? '').trim();
    const mappedUnit = rawUnit ? mapPrescribingUnitToDosageUnit(rawUnit) : '';
    const dosageLabel = String(row?.dosage ?? '').trim();
    const dosage = this.otcPrescribingLabel(
      dosageLabel,
      row?.amountPerFrequencyValue,
      mappedUnit || rawUnit
    );
    const source = this.resolveHistoryRowSaleSource(row);
    const visitId = this.resolveHistoryRowVisitId(row);
    const rawLineId = Number(row?.lineId ?? row?.line_id) || 0;
    const saleId = Number(row?.saleId) || 0;
    const lineId =
      rawLineId > 0 ? rawLineId : source === 'RX' ? saleId : 0;
    return {
      saleSource: source,
      lineId,
      saleId,
      saleNo: row?.saleNo != null ? String(row.saleNo) : '',
      clientName: this.resolveHistoryRowClientName(row),
      documentType: this.resolveHistoryRowDocumentType(row),
      visitId,
      visitNumber: Number(row?.visitNumber ?? row?.visit_number) || 0,
      visitDate: row?.saleDate != null ? String(row.saleDate) : '',
      visitTime: time.length > 8 ? time.slice(0, 8) : time,
      itemName: row?.itemName || '—',
      dosage,
      amountPerFrequencyValue: this.numOrNull(row?.amountPerFrequencyValue),
      amountPerFrequencyUnit: mappedUnit || rawUnit,
      frequencyValue: this.numOrNull(row?.frequencyValue),
      frequencyUnit: row?.frequencyUnit ?? null,
      durationValue: this.numOrNull(row?.durationValue),
      durationUnit: row?.durationUnit ?? null,
      quantity: qty,
      totalUnits: this.num(row?.totalUnits) || qty,
      unitBuy: this.num(row?.unitBuy),
      unitSellingPrice: this.num(row?.unitSellingPrice),
      totalAmount: this.num(row?.totalAmount),
      amountReceived: this.num(row?.amountReceived ?? row?.amount_received),
      saleTotalAmount: this.num(row?.saleTotalAmount ?? row?.sale_total_amount) || undefined,
      patientId: (() => {
        const id = Number(row?.patientId ?? row?.patient_id ?? row?.clientId ?? row?.client_id);
        return Number.isFinite(id) && id > 0 ? id : null;
      })(),
      stockBatchId:
        row?.stockBatchId != null
          ? Number(row.stockBatchId)
          : row?.stock_batch_id != null
            ? Number(row.stock_batch_id)
            : null,
      itemId:
        row?.itemId != null
          ? Number(row.itemId)
          : row?.stockItemId != null
            ? Number(row.stockItemId)
            : row?.item_id != null
              ? Number(row.item_id)
              : null,
      goodsDelivered:
        row?.goodsDelivered === true ||
        row?.goods_delivered === true ||
        String(row?.goodsDelivered ?? row?.goods_delivered ?? '').toLowerCase() === 'true',
      deliveryNote: String(row?.deliveryNote ?? row?.delivery_note ?? '').trim() || undefined,
      receivedBy: this.normalizeReceivedBy(
        row?.receivedBy ?? row?.received_by ?? row?.servedBy ?? row?.served_by
      ),
      active:
        row?.active !== false &&
        row?.active !== 0 &&
        String(row?.active ?? 'true').toLowerCase() !== 'false',
    };
  }

  private normalizeReceivedBy(value: unknown): string {
    const text = String(value ?? '').trim();
    return text || '';
  }

  private compareSoldRows(a: OtcSoldRow, b: OtcSoldRow): number {
    const da = `${a.visitDate} ${a.visitTime}`;
    const db = `${b.visitDate} ${b.visitTime}`;
    return da.localeCompare(db);
  }

  private getLast7DaysRange(): { from: string; to: string } {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 7);
    return {
      from: this.formatLocalDate(from),
      to: this.formatLocalDate(to),
    };
  }

  private getTodayRange(): { from: string; to: string } {
    const today = this.formatLocalDate(new Date());
    return { from: today, to: today };
  }

  /** First day through last day of the previous calendar month. */
  private getLastMonthRange(): { from: string; to: string } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      from: this.formatLocalDate(from),
      to: this.formatLocalDate(to),
    };
  }

  private formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private numOrNull(v: unknown): number | null {
    return hasPrescribingNumericValue(v) ? this.num(v) : null;
  }

  private optionalPrescribingNumber(v: unknown): number | null {
    return hasPrescribingNumericValue(v) ? this.num(v) : null;
  }

  /** POS amounts — whole numbers, no .00 */
  formatPosMoney(amount: number): string {
    return formatMoneyWholeDisplay(amount ?? 0);
  }

  /** Discount / tax cells — show 0.0000 when zero. */
  formatPosZeroPlaceholder(amount: number): string {
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) {
      return '0.0000';
    }
    return this.formatPosMoney(n);
  }

  /** Resolve a small cart thumbnail image for a line. */
  cartLineImageUrl(line: OtcCartLine | null | undefined): string | null {
    if (!line) {
      return null;
    }
    const stored = String(line.imageUrl || '').trim();
    if (stored) {
      return stored;
    }
    let row: any = null;
    if (line.stockBatchId != null && Number(line.stockBatchId) > 0) {
      row = this.itemList.find((i) => Number(i?._stockBatchId) === Number(line.stockBatchId));
    } else {
      row = this.itemList.find((i) => Number(i?.id) === Number(line.itemId));
    }
    const stockItemId = Number(row?.stockItemId ?? row?.id ?? line.itemId);
    return this.posProductImageUrl(row, stockItemId);
  }

  toTitleCase(value: string | null | undefined): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\b([a-z])/g, (m) => m.toUpperCase());
  }

  /** Line items, costs, and history — always 2 decimal places. */
  formatMoney(amount: number): string {
    return formatMoney2DecimalsDisplay(amount ?? 0);
  }

  /** Products sold tab totals — whole shillings, no decimals. */
  formatSoldMoney(amount: number): string {
    return formatMoneyWholeDisplay(amount ?? 0);
  }

  /** Final payment total due — rounded up to the next 100 shillings. */
  formatPaymentTotal(amount: number): string {
    return formatUgxPaymentTotalDisplay(amount);
  }

  private defaultTreatmentForm(): any {
    return {
      amountPerFrequencyValue: null,
      amountPerFrequencyUnit: '',
      frequencyValue: null,
      frequencyUnit: null,
      durationValue: null,
      durationUnit: null,
      quantity: 1,
      totalUnits: null,
      totalAmount: 0,
      instructions: '',
      route: '',
    };
  }

  /** Treat empty/zero input as "pay exact total" (avoids blocking Complete when field is blank). */
  private effectiveAmountReceived(value: number | null | undefined, total: number): number {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
    return total;
  }

  private flashStatus(message: string, isError: boolean): void {
    this.responseMessage = message;
    this.responseColor = isError ? 'rgb(238, 16, 16)' : 'rgb(11, 155, 112)';
    this.showStatusBanner = true;
    if (this.statusBannerTimer) {
      clearTimeout(this.statusBannerTimer);
      this.statusBannerTimer = null;
    }
    const hideMs = isError ? 5000 : message === 'Added to counter sale list.' ? 2200 : 4000;
    if (isError || !this.processing) {
      this.statusBannerTimer = setTimeout(() => (this.showStatusBanner = false), hideMs);
    }
  }

  private normalizeList(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  }

  private resolvePharmacyStore(stores: any[]): { id: number | null; name: string } {
    const list = Array.isArray(stores) ? stores : [];
    const storeIdOf = (s: any) => s?.id ?? s?.storeId;
    const storeNameOf = (s: any) => String(s?.name ?? '').trim();
    const raw = sessionStorage.getItem('pharmacyStoreId');
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n > 0) {
        const match = list.find((s) => Number(storeIdOf(s)) === n);
        return { id: n, name: match ? storeNameOf(match) : 'Pharmacy' };
      }
    }
    const exact = list.find((s) => storeNameOf(s).toLowerCase() === 'pharmacy');
    if (exact) {
      const id = storeIdOf(exact);
      return { id: id != null ? Number(id) : null, name: storeNameOf(exact) };
    }
    const partial = list.find((s) => /pharmacy/i.test(storeNameOf(s)));
    if (partial) {
      const id = storeIdOf(partial);
      return { id: id != null ? Number(id) : null, name: storeNameOf(partial) };
    }
    return { id: null, name: '' };
  }

  private batchStoreId(batch: any): number | null {
    const sid =
      batch?.storeId ?? batch?.store?.id ?? batch?.stockStoreId ?? batch?.locationStoreId;
    const n = Number(sid);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private batchStoreLabel(batch: any, stores: any[]): string {
    const fromBatch = String(batch?.storeName ?? batch?.store?.name ?? '').trim();
    if (fromBatch) {
      return this.formatDisplayName(fromBatch);
    }
    const sid = this.batchStoreId(batch);
    if (sid == null) {
      return 'Unknown store';
    }
    const storeIdOf = (s: any) => s?.id ?? s?.storeId;
    const storeNameOf = (s: any) => String(s?.name ?? '').trim();
    const match = stores.find((s) => Number(storeIdOf(s)) === sid);
    const label = match ? storeNameOf(match) || `Store #${sid}` : `Store #${sid}`;
    return this.formatDisplayName(label);
  }

  formatTreatmentPeriodUnit(unit: unknown): string {
    return formatTreatmentPeriodUnit(unit);
  }

  formatFrequencyDisplay(
    totalUnits: unknown,
    frequencyValue: unknown,
    frequencyUnit: unknown
  ): string {
    return formatFrequencyDisplay(totalUnits, frequencyValue, frequencyUnit);
  }

  formatDosageDisplay(value: unknown, unit: unknown): string {
    return this.otcPrescribingLabel('', value, unit);
  }

  formatFrequencyDisplayForTable(
    totalUnits: unknown,
    frequencyValue: unknown,
    frequencyUnit: unknown
  ): string {
    const label = formatFrequencyDisplay(totalUnits, frequencyValue, frequencyUnit);
    return label === '—' ? '' : label;
  }

  formatCartDurationDisplay(item: OtcCartLine): string {
    if (!hasPrescribingNumericValue(item.durationValue)) {
      return '';
    }
    const period = this.formatTreatmentPeriodUnit(item.durationUnit);
    return `${item.durationValue}${period ? ` ${period}` : ''}`.trim();
  }

  private otcPrescribingLabel(
    existing: string,
    value: unknown,
    unit: unknown
  ): string {
    const trimmed = String(existing ?? '').trim();
    if (trimmed && trimmed !== '—' && trimmed !== '0') {
      return trimmed;
    }
    const built = formatDosageDisplayLabel(value, unit);
    return built === '—' || built === '0' ? '' : built;
  }

  /** True when a sold row has prescription details (not a quantity-only line). */
  soldRowHasPrescribing(row: OtcSoldRow): boolean {
    const dosage = String(row.dosage ?? '').trim();
    if (dosage && dosage !== '—' && dosage !== '0') {
      return true;
    }
    if (
      hasPrescribingNumericValue(row.amountPerFrequencyValue) &&
      String(row.amountPerFrequencyUnit ?? '').trim()
    ) {
      return true;
    }
    if (hasPrescribingNumericValue(row.frequencyValue)) {
      return true;
    }
    if (hasPrescribingNumericValue(row.durationValue)) {
      return true;
    }
    return false;
  }

  soldRowDosage(row: OtcSoldRow): string {
    if (!this.otcIncludePrescribing || !this.soldRowHasPrescribing(row)) {
      return '';
    }
    return row.dosage;
  }

  soldRowFrequency(row: OtcSoldRow): string {
    if (!this.otcIncludePrescribing || !this.soldRowHasPrescribing(row)) {
      return '';
    }
    return this.formatFrequencyDisplayForTable(
      row.totalUnits,
      row.frequencyValue,
      row.frequencyUnit
    );
  }

  soldRowDuration(row: OtcSoldRow): string {
    if (!this.otcIncludePrescribing || !this.soldRowHasPrescribing(row)) {
      return '';
    }
    if (!hasPrescribingNumericValue(row.durationValue)) {
      return '';
    }
    const period = this.formatTreatmentPeriodUnit(row.durationUnit);
    return `${row.durationValue}${period ? ` ${period}` : ''}`.trim();
  }

  prescriptionRowDosage(row: DoctorPrescriptionRow): string {
    const built = this.formatDosageDisplay(row.amountPerFrequencyValue, row.amountPerFrequencyUnit);
    if (built) {
      return built;
    }
    const fallback = String(row.dosage ?? '').trim();
    return fallback || '—';
  }

  prescriptionRowFrequency(row: DoctorPrescriptionRow): string {
    const dose = this.formatTreatmentFrequencyPart(row.totalUnits ?? row.amountPerFrequencyValue);
    const frequency = this.formatTreatmentFrequencyPart(row.frequencyValue);
    const frequencyUnit = this.formatTreatmentPeriodUnit(row.frequencyUnit);
    if (dose && frequency) {
      return `${dose} X ${frequency}${frequencyUnit ? ` (${frequencyUnit})` : ''}`;
    }
    const label = [dose, frequency].filter(Boolean).join(' X ');
    return label || '—';
  }

  prescriptionRowDuration(row: DoctorPrescriptionRow): string {
    if (!hasPrescribingNumericValue(row.durationValue)) {
      return '—';
    }
    const period = this.formatTreatmentPeriodUnit(row.durationUnit);
    return `${row.durationValue}${period ? ` ${period}` : ''}`.trim();
  }

  prescriptionRowTtCost(row: DoctorPrescriptionRow): number {
    return (row.quantity || 0) * (row.unitBuy || 0);
  }

  prescriptionRowTtSell(row: DoctorPrescriptionRow): number {
    if (row.given) {
      return this.prescriptionLineAmount(row);
    }
    return row.totalAmount || 0;
  }

  private formatTreatmentFrequencyPart(value: unknown): string {
    if (value == null || value === '') {
      return '';
    }
    const n = Number(value);
    if (Number.isFinite(n)) {
      return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
    }
    return String(value).trim();
  }

  /** Close receipt UI only — keeps edit / source state for callers that need it. */
  private dismissReceiptModalUi(): void {
    this.showReceiptModal = false;
    document.body.classList.remove('otc-receipt-modal-open');
  }

  closeReceiptModal(): void {
    this.dismissReceiptModalUi();
    this.receiptOpenedFromSold = false;
    this.receiptSourceOrder = null;
    this.receiptSourcePatientId = null;
    this.receiptSourceSaleDoc = null;
    this.receiptEditContext = null;
  }

  /** Build receipt PDF and open print dialog (falls back to download if pop-ups blocked). */
  async printOtcReceipt(): Promise<void> {
    if (!this.receipt) {
      return;
    }
    await this.facilityBranding.loadLogoDataUrl();
    const pdf = this.buildReceiptPdf(this.receipt);
    const filename = this.receiptPdfFilename(this.receipt);
    const blobUrl = this.pdfBlobUrlString(pdf);
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      pdf.save(filename);
      this.flashStatus('Receipt saved as PDF. Allow pop-ups to print from the browser.', false);
      return;
    }
    const triggerPrint = () => {
      try {
        win.focus();
        win.print();
      } catch {
        /* print may be blocked until PDF loads */
      }
    };
    win.addEventListener('load', triggerPrint);
    setTimeout(triggerPrint, 600);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
  }

  async downloadReceiptPdf(): Promise<void> {
    if (!this.receipt) {
      return;
    }
    await this.facilityBranding.loadLogoDataUrl();
    this.buildReceiptPdf(this.receipt).save(this.receiptPdfFilename(this.receipt));
  }

  private receiptPdfFilename(r: OtcReceiptData): string {
    return commercialDocFilename(r.docType || 'receipt', r.saleNo);
  }

  private pdfBlobUrlString(pdf: jsPDF): string {
    const out = pdf.output('bloburl');
    if (typeof out === 'string') {
      return out;
    }
    if (out instanceof URL) {
      return out.href;
    }
    return String(out);
  }

  setReceiptDocType(docType: CommercialDocType): void {
    if (!this.receipt) {
      return;
    }
    this.receipt = { ...this.receipt, docType: normalizeCommercialDocType(docType) };
  }

  receiptDocumentTitle(r: OtcReceiptData | null = this.receipt): string {
    return commercialDocTitle(r?.docType || 'receipt');
  }

  commercialDocTitleLabel(docType: CommercialDocType): string {
    return commercialDocTitle(docType);
  }

  receiptThankYouMessage(r: OtcReceiptData | null = this.receipt): string {
    const docType = normalizeCommercialDocType(r?.docType);
    if (docType === 'quotation' || docType === 'proforma') {
      return 'We look forward to your order.';
    }
    if (docType === 'efris_receipt') {
      return 'Thank you. Verify this e-receipt with URA EFRIS (QR / FDN).';
    }
    if (docType === 'delivery_note') {
      return 'Thank you for your business!';
    }
    const branding = this.facilityBranding.getCached();
    return (
      branding?.thankYouMessage?.trim() ||
      branding?.thankYouLine?.trim() ||
      'Thank you.'
    );
  }

  receiptDocNoLabel(r: OtcReceiptData): string {
    switch (normalizeCommercialDocType(r.docType)) {
      case 'quotation':
        return 'QUOTATION';
      case 'proforma':
        return 'PROFORMA';
      case 'sales_invoice':
        return 'SALES INVOICE';
      case 'efris_receipt':
        return 'EFRIS FDN';
      case 'delivery_note':
        return 'DELIVERY NOTE';
      default:
        return 'RECEIPT';
    }
  }

  receiptShowsAmountReceived(r: OtcReceiptData): boolean {
    return commercialDocShowsAmountReceived(r.docType);
  }

  /** QR image for printable EFRIS template (placeholder until live URA qrCode). */
  efrisQrImageUrl(payload: string | null | undefined): string | null {
    const text = String(payload || '').trim();
    if (!text) {
      return null;
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=` + encodeURIComponent(text);
  }

  private facilityAddressLine(): string {
    const b = this.facilityBranding.getCached();
    try {
      return (
        b?.facilityAddress?.trim() ||
        sessionStorage.getItem('facilityAddress')?.trim() ||
        localStorage.getItem('facilityAddress')?.trim() ||
        ''
      );
    } catch {
      return b?.facilityAddress?.trim() || '';
    }
  }

  facilityAddressForDoc(): string {
    return this.facilityAddressLine() || '—';
  }

  facilityContactForDoc(): string {
    return this.facilityContactLine() || '—';
  }

  deliveryNoteEnquiryPhone(): string {
    const b = this.facilityBranding.getCached();
    return (
      b?.phonePrimary?.trim() ||
      b?.phoneSecondary?.trim() ||
      this.facilityContactLine().split(/[|,]/)[0]?.replace(/^Tel:\s*/i, '').trim() ||
      '—'
    );
  }

  private facilityContactLine(): string {
    const b = this.facilityBranding.getCached();
    const fromBrand =
      b?.contactInquiryLine?.trim() ||
      b?.invoiceFooterContactLine?.trim() ||
      [b?.phonePrimary, b?.email].filter(Boolean).join(' | ');
    if (fromBrand) {
      return fromBrand;
    }
    try {
      return this.facilityBranding.getContactInquiryLine() || '';
    } catch {
      return '';
    }
  }

  private buildReceiptPdf(r: OtcReceiptData): jsPDF {
    const branding = this.facilityBranding.getCached();
    const phone =
      branding?.phonePrimary?.trim() ||
      branding?.phoneSecondary?.trim() ||
      '';
    const mapped = mapSaleToCommercialDoc({
      docType: r.docType || 'receipt',
      saleNo: r.saleNo,
      saleDateLabel: r.saleDateLabel,
      saleTimeLabel: r.saleTimeLabel,
      facilityName: r.facilityName,
      facilityAddress: this.facilityAddressLine(),
      facilityContact: this.facilityContactLine(),
      facilitySlogan: branding?.subsidiaryLabel?.trim() || undefined,
      clientName: r.clientName,
      clientAddress: r.clientAddress,
      clientPhone: r.clientPhone,
      orderNo: r.orderNo || r.saleNo,
      customerId: r.customerId,
      shippingMethod: 'Hand delivery',
      despatchDateLabel: r.saleDateLabel,
      enquiryContactName: r.receivedBy,
      enquiryContactPhone: phone,
      receivedBy: r.receivedBy,
      paymentMethod: r.paymentMethod,
      notes: r.notes,
      thankYouMessage:
        normalizeCommercialDocType(r.docType) === 'delivery_note'
          ? 'Thank you for your business!'
          : branding?.thankYouMessage || branding?.thankYouLine,
      paymentTerms: branding?.invoiceFooterMainLine,
      lines: r.lines.map((l) => ({
        itemName: l.itemName,
        dosage: r.includePrescribing ? l.dosage : undefined,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        discountAmount: l.discountAmount,
        given: l.given,
      })),
      subtotal: r.subtotal,
      discount: r.discount || 0,
      tax: r.tax,
      total: r.total,
      amountReceived: r.amountReceived,
      changeDue: r.changeDue,
      amountDue: r.amountDue,
      efris: r.efris,
    });
    return buildCommercialDocumentPdf(mapped, {
      addLogoToPdf: (pdf, x, y, w, h) => this.facilityBranding.addLogoToJsPdf(pdf, x, y, w, h),
      formatMoney: (n) => this.formatPosMoney(n),
    });
  }
  private extractCompletedSalePayload(res: any): any {
    const payload = res?.data ?? res;
    if (payload?.sale != null) {
      return payload.sale;
    }
    if (payload?.saleNo != null || Array.isArray(payload?.lines)) {
      return payload;
    }
    if (payload?.data != null) {
      return payload.data;
    }
    return payload;
  }

  private isPrescriptionStatusGiven(status: unknown): boolean {
    const s = String(status ?? '').toLowerCase();
    return s === 'given' || s === 'dispensed';
  }

  /** Pending queue — exclude rows already dispensed or paid. */
  private isPrescriptionQueuePendingStatus(status: unknown): boolean {
    const s = String(status ?? '').toLowerCase();
    return (
      s !== 'given' &&
      s !== 'dispensed' &&
      s !== 'paid' &&
      s !== 'completed' &&
      s !== 'sold'
    );
  }

  /** After a successful sale: mark Done and keep the client in the table. */
  private markPrescriptionVisitSaleCompleted(
    visitId: number,
    soldRows: DoctorPrescriptionRow[]
  ): void {
    this.completedPrescriptionVisitIds.add(visitId);
    const snapshot = soldRows.map((row) => ({
      ...row,
      status: row.given ? 'dispensed' : String(row.status || 'pending'),
      dispensed: row.given || row.dispensed === true,
      paid: row.given || row.paid !== false,
    }));
    this.soldPrescriptionVisitSnapshots.set(visitId, snapshot);
    for (const row of this.doctorPrescriptionRows) {
      if (row.visitId !== visitId) {
        continue;
      }
      const updated = snapshot.find((s) => s.id === row.id);
      if (updated) {
        row.given = updated.given;
        row.paid = updated.paid;
        row.dispensed = updated.dispensed;
        row.administered = updated.administered;
        row.status = updated.status;
      }
    }
    this.clearPrescriptionVisitCart(visitId, true);
  }

  /** Remove a visit from the table after queuing to the next station. */
  private removePrescriptionVisitFromTable(visitId: number): void {
    this.completedPrescriptionVisitIds.delete(visitId);
    this.soldPrescriptionVisitSnapshots.delete(visitId);
    this.doctorPrescriptionRows = this.doctorPrescriptionRows.filter(
      (row) => row.visitId !== visitId
    );
    this.clearPrescriptionVisitCart(visitId, true);
  }

  private clearPrescriptionVisitCart(visitId: number, deselect: boolean): void {
    this.cart = this.cart.filter(
      (line) => !(line.lineSource === 'RX' && line.visitId === visitId)
    );
    if (deselect && this.selectedPrescriptionVisitId === visitId) {
      this.selectedPrescriptionVisitId = null;
      this.selectedPrescriptionDetailRows = [];
      this.rxAmountReceived = null;
    }
  }

  /** @deprecated Use removePrescriptionVisitFromTable — kept for partial legacy callers. */
  private removeCompletedPrescriptionFromQueue(
    visitId: number,
    soldTreatmentIds: number[]
  ): void {
    if (!soldTreatmentIds.length) {
      return;
    }
    const soldSet = new Set(soldTreatmentIds);
    this.doctorPrescriptionRows = this.doctorPrescriptionRows.filter(
      (row) => !(row.visitId === visitId && soldSet.has(row.id))
    );
    this.cart = this.cart.filter(
      (line) =>
        !(
          line.lineSource === 'RX' &&
          line.visitId === visitId &&
          line.treatmentRequestedId != null &&
          soldSet.has(line.treatmentRequestedId)
        )
    );
    const visitStillQueued = this.doctorPrescriptionRows.some((row) => row.visitId === visitId);
    if (!visitStillQueued && this.selectedPrescriptionVisitId === visitId) {
      this.selectedPrescriptionVisitId = null;
      this.selectedPrescriptionDetailRows = [];
      this.rxAmountReceived = null;
    }
  }

  private notifyClientVisitPharmacyUpdated(
    visitId: number,
    treatmentRequestedIds: number[],
    res: any
  ): void {
    const payment = this.extractVisitPaymentFromSaleResponse(res);
    this.pharmacyVisitSync.notifyPrescriptionSaleCompleted({
      visitId,
      treatmentRequestedIds,
      amountPaid: payment.amountPaid,
      balanceDue: payment.balanceDue,
      totalAmount: payment.totalAmount,
      visitPaymentRecorded: payment.visitPaymentRecorded,
    });
  }

  private extractVisitPaymentFromSaleResponse(res: any): {
    amountPaid?: number | string;
    balanceDue?: number | string;
    totalAmount?: number | string;
    visitPaymentRecorded?: boolean;
  } {
    const payload = res?.data ?? res;
    const visit = payload?.visit ?? payload?.visitUpdate ?? payload?.clientVisit;
    const invoice = payload?.invoice ?? visit?.invoice;
    return {
      amountPaid:
        visit?.amountPaid ??
        invoice?.amountPaid ??
        payload?.amountPaid ??
        payload?.AmountPaid,
      balanceDue:
        visit?.balanceDue ??
        invoice?.balanceDue ??
        payload?.balanceDue ??
        payload?.BalanceDue,
      totalAmount:
        visit?.totalAmount ??
        invoice?.totalAmount ??
        payload?.totalAmount ??
        payload?.TotalAmount,
      visitPaymentRecorded: payload?.visitPaymentRecorded === true,
    };
  }

  private openReceiptModal(
    saleData: any,
    cartSnapshot: OtcCartLine[],
    subtotal: number,
    amountReceived: number,
    changeDue: number,
    receivedBy: string,
    clientName?: string,
    docType: CommercialDocType = 'receipt'
  ): void {
    const lines = this.buildReceiptLines(saleData?.lines, cartSnapshot);
    const resolvedClient =
      clientName?.trim() ||
      String(saleData?.clientName ?? '').trim() ||
      undefined;
    const receiptPrescribing =
      this.otcIncludePrescribing ||
      cartSnapshot.some((l) => this.cartLineHasPrescribing(l));
    const netFromCart = cartSnapshot.length
      ? roundUgxMoney(
          cartSnapshot
            .filter((l) => l.given !== false)
            .reduce(
              (sum, l) =>
                sum +
                Math.max(0, this.num(l.totalAmount) - this.num(l.discountAmount)),
              0
            )
        )
      : 0;
    // Net before tax — prefer cart lines; API totalAmount is line net (not payable).
    const net =
      netFromCart > 0
        ? netFromCart
        : this.num(saleData?.totalAmount) > 0
          ? this.num(saleData?.totalAmount)
          : this.num(subtotal);
    const money = this.buildReceiptMoneyBreakdown(net);
    const normalizedDoc = normalizeCommercialDocType(docType);
    const saleNo = String(saleData?.saleNo ?? 'OTC');
    const saleDateLabel = this.formatReceiptDate(saleData?.saleDate);
    const saleTimeLabel = this.formatReceiptTime(saleData?.saleTime);
    const facilityName = this.facilityBranding.getFacilityName();
    // Prefer API payable total when present (already includes discount + tax).
    const apiPayable = this.num(saleData?.totalAmount ?? saleData?.payableTotal);
    const receiptTotal =
      apiPayable > 0 && Math.abs(apiPayable - money.total) > 0.009 && !cartSnapshot.length
        ? apiPayable
        : money.total;
    const receivedAmt = Math.max(
      0,
      this.num(saleData?.amountReceived) || this.num(amountReceived)
    );
    const changeAmt = Math.max(0, receivedAmt - receiptTotal);
    const dueAmt = Math.max(0, receiptTotal - receivedAmt);
    // Capture cart/client/order BEFORE caller clears the cart so Edit works.
    this.captureReceiptEditContext(cartSnapshot, saleData, normalizedDoc);
    this.receipt = {
      saleNo,
      saleDateLabel,
      saleTimeLabel,
      facilityName,
      clientName: resolvedClient,
      clientAddress: String(
        saleData?.clientAddress ??
          saleData?.patientAddress ??
          saleData?.address ??
          ''
      ).trim() || undefined,
      clientPhone: String(
        saleData?.clientPhone ?? saleData?.phone ?? saleData?.patientPhone ?? ''
      ).trim() || undefined,
      customerId:
        saleData?.patientId != null
          ? String(saleData.patientId)
          : saleData?.clientId != null
            ? String(saleData.clientId)
            : this.posSaleClientId != null
              ? String(this.posSaleClientId)
              : undefined,
      orderNo: String(saleData?.orderNo ?? saleData?.visitId ?? saleNo).trim(),
      receivedBy: String(saleData?.receivedBy ?? receivedBy),
      paymentMethod: String(saleData?.paymentForm ?? this.paymentMethod),
      notes: String(saleData?.notes ?? this.saleNotes ?? '').trim(),
      includePrescribing: receiptPrescribing,
      docType: normalizedDoc,
      lines,
      subtotal: money.subtotal,
      discount: money.discount || 0,
      tax: money.tax,
      taxType: this.posTaxType,
      taxRatePercent: this.posTaxRatePercent,
      total: receiptTotal,
      amountReceived: receivedAmt,
      changeDue: changeAmt,
      amountDue: dueAmt,
      efris:
        normalizedDoc === 'efris_receipt'
          ? buildEfrisTemplateFields({
              saleNo,
              facilityName,
              dateLabel: saleDateLabel,
              timeLabel: saleTimeLabel,
              sellerTin: this.facilityTinForEfris(),
            })
          : undefined,
    };
    this.showReceiptModal = true;
    document.body.classList.add('otc-receipt-modal-open');
  }

  /** Optional TIN from branding / storage until EFRIS settings exist. */
  private facilityTinForEfris(): string | null {
    const b = this.facilityBranding.getCached() as any;
    const fromBrand = String(b?.tin || b?.sellerTin || b?.taxTin || '').trim();
    if (fromBrand) {
      return fromBrand;
    }
    try {
      return (
        sessionStorage.getItem('facilityTin')?.trim() ||
        localStorage.getItem('facilityTin')?.trim() ||
        null
      );
    } catch {
      return null;
    }
  }

  private buildReceiptLines(apiLines: unknown, cartSnapshot: OtcCartLine[]): OtcReceiptLine[] {
    if (cartSnapshot.length) {
      return cartSnapshot.map((l) => ({
        itemName: this.cartItemDisplayName(l),
        dosage: this.formatDosageDisplay(l.amountPerFrequencyValue, l.amountPerFrequencyUnit),
        quantity: l.quantity,
        unitPrice: l.unitSellingPrice,
        lineTotal: l.given ? this.cartLineAmount(l) : 0,
        discountAmount: l.given ? this.cartLineDiscountAmount(l) : 0,
        given: l.given,
        statusNote: l.given ? undefined : 'Not given · Not billed',
      }));
    }
    if (Array.isArray(apiLines) && apiLines.length) {
      return apiLines.map((l: any) => {
        const given = l?.given !== false;
        const qty = this.num(l?.quantity);
        const unitPrice = this.num(l?.unitSellingPrice);
        const lineTotal = given
          ? this.num(l?.totalAmount) || qty * unitPrice
          : 0;
        return {
          itemName: this.otcPlainItemName({ itemName: l?.itemName }),
          dosage:
            String(l?.dosage ?? '').trim() ||
            this.formatDosageDisplay(l?.amountPerFrequencyValue, l?.amountPerFrequencyUnit),
          quantity: qty,
          unitPrice,
          lineTotal,
          given,
          statusNote: given ? undefined : 'Not given · Not billed',
        };
      });
    }
    return [];
  }

  private formatReceiptDate(value: unknown): string {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toLocaleDateString();
    }
    if (!value) {
      return new Date().toLocaleDateString();
    }
    const s = String(value).slice(0, 10);
    const d = new Date(s + 'T12:00:00');
    return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString();
  }

  private formatReceiptTime(value: unknown): string {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (!value) {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const s = String(value);
    if (/^\d{1,2}:\d{2}/.test(s)) {
      return s.slice(0, 8);
    }
    return s;
  }

  /** Show inventory unit in the list when it is not one of the standard dropdown values. */
  get customPrefilledDosageUnit(): string {
    const v = String(this.currentTreatmentRequested?.amountPerFrequencyUnit ?? '').trim();
    if (!v || isStandardDosageUnit(v)) {
      return '';
    }
    return v;
  }

  /** Drug name only — strips batch / qty suffix from dropdown title. */
  cartItemDisplayName(line: { itemName?: string }): string {
    return this.otcPlainItemName({ itemName: line?.itemName, title: line?.itemName });
  }

  private otcPlainItemName(source: any): string {
    const name = String(source?.stockItemName ?? source?.itemName ?? '').trim();
    if (name && !name.includes(' — ')) {
      return name;
    }
    const title = String(source?.title ?? name ?? '').trim();
    const sep = title.indexOf(' — ');
    if (sep > 0) {
      return title.slice(0, sep).trim();
    }
    return title.replace(/\s*·\s*Qty:.*$/i, '').trim() || 'Product';
  }

  private formatBatchExpiryShort(batch: any): string {
    const dt = this.parseBatchExpiryDate(batch);
    return dt ? this.formatExpiryDateLabel(dt) : '';
  }

  private formatExpiryDateLabel(dt: Date): string {
    return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;
  }

  private parseBatchExpiryDate(batch: any): Date | null {
    const raw =
      batch?.expiryDate ??
      batch?.expiry ??
      batch?.expireDate ??
      batch?.expirationDate ??
      batch?.expiry_date;
    return this.parseExpiryValue(raw);
  }

  /** Parse API expiry values (ISO, YYYY/MM/DD, Java LocalDate array, {year,month,day}). */
  private parseExpiryValue(raw: unknown): Date | null {
    if (raw == null || raw === '') {
      return null;
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as { year?: unknown; month?: unknown; day?: unknown };
      if (obj.year != null && obj.month != null && obj.day != null) {
        return this.buildExpiryDate(Number(obj.year), Number(obj.month), Number(obj.day));
      }
      return null;
    }
    if (Array.isArray(raw) && raw.length >= 3) {
      let y = Number(raw[0]);
      let m = Number(raw[1]);
      let d = Number(raw[2]);
      if (y <= 31 && d >= 100) {
        [y, d] = [d, y];
      }
      return this.buildExpiryDate(y, m, d);
    }
    if (typeof raw === 'number' && raw >= 19000101 && raw <= 29991231) {
      const s = String(Math.trunc(raw));
      if (s.length === 8) {
        return this.buildExpiryDate(Number(s.slice(0, 4)), Number(s.slice(4, 6)), Number(s.slice(6, 8)));
      }
    }
    const text = String(raw).trim();
    const slashMatch = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (slashMatch) {
      return this.buildExpiryDate(
        Number(slashMatch[1]),
        Number(slashMatch[2]),
        Number(slashMatch[3])
      );
    }
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return this.buildExpiryDate(
        Number(isoMatch[1]),
        Number(isoMatch[2]),
        Number(isoMatch[3])
      );
    }
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }
    return null;
  }

  private buildExpiryDate(year: number, month: number, day: number): Date | null {
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }
    const monthIdx = month >= 1 && month <= 12 ? month - 1 : month;
    const dt = new Date(year, monthIdx, day);
    dt.setHours(0, 0, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  private batchExpiryToneFromDate(expiry: Date): 'danger' | 'warning' | 'safe' {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiry);
    exp.setHours(0, 0, 0, 0);
    if (exp.getTime() < today.getTime()) {
      return 'danger';
    }
    const fullYears = this.fullYearsUntil(exp, today);
    if (fullYears < 1) {
      return 'danger';
    }
    if (fullYears < 2) {
      return 'warning';
    }
    return 'safe';
  }

  private fullYearsUntil(expiry: Date, today: Date): number {
    let years = expiry.getFullYear() - today.getFullYear();
    const monthDiff = expiry.getMonth() - today.getMonth();
    const dayDiff = expiry.getDate() - today.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      years--;
    }
    return years;
  }

  private batchLineExpiryInfo(distributions: any[]): {
    label: string;
    tone: 'danger' | 'warning' | 'safe' | 'unknown';
  } {
    for (const row of distributions) {
      const dt = this.parseBatchExpiryDate(row);
      if (!dt) {
        continue;
      }
      return {
        label: this.formatExpiryDateLabel(dt),
        tone: this.batchExpiryToneFromDate(dt),
      };
    }
    return { label: '', tone: 'unknown' };
  }

  private mapStockBatchToTreatmentDropdownItem(batch: any): any {
    if (!batch) {
      return { id: null, title: '', sellingPrice: 0, stockAtHand: 0, costPrice: 0, uintOfMeasure: '' };
    }
    const stockItemId =
      batch.stockItemId ??
      batch.stockItem?.id ??
      batch.consumableItemId ??
      batch.consumableItems?.id ??
      batch.itemId;
    const name = this.plainDrugName(batch);
    const batchPart =
      batch.batchNumber != null && String(batch.batchNumber).trim() !== ''
        ? `Batch ${batch.batchNumber}`
        : `Batch #${batch.id ?? '?'}`;
    const expiryLabel = this.formatBatchExpiryShort(batch);
    const storeId = Number(batch?.storeId ?? batch?.store_id ?? 0) || null;
    const storeName = this.resolveStoreDisplayName(
      storeId ?? 0,
      batch?.storeName ?? batch?.store_name
    );
    const title = this.stockBatchTreatmentLabel(batch);
    const prescribing = resolveStockPrescribingSource(batch);
    const prescribingUnit =
      batch.lastUnitOfPrescribingMeasureStrengthUnitTitle ??
      batch.amountPerFrequencyUnit ??
      batch.dosageUnit ??
      prescribing['lastUnitOfPrescribingMeasureStrengthUnitTitle'] ??
      prescribing['amountPerFrequencyUnit'] ??
      '';
    return {
      ...prescribing,
      ...batch,
      stockItemId: stockItemId ?? batch.id,
      stockItemName: name,
      storeId,
      storeName,
      batchLabel: batchPart,
      expiryLabel,
      lastUnitOfPrescribingMeasureStrengthUnitTitle: prescribingUnit,
      amountPerFrequencyUnit: prescribingUnit || batch.amountPerFrequencyUnit,
      dosageUnit: prescribingUnit || batch.dosageUnit,
      id: stockItemId ?? batch.id,
      title,
      plainName: name,
      sellingPrice:
        batch.sellingPrice ??
        batch.unitSellingPrice ??
        batch.salePrice ??
        batch.unitSalePrice ??
        0,
      stockAtHand:
        batch.stockAtHand ??
        batch.stock_at_hand ??
        batch.quantityOnHand ??
        batch.qtyOnHand ??
        0,
      costPrice:
        batch.costPrice ??
        batch.unitCostPrice ??
        batch.buyPrice ??
        0,
      uintOfMeasure:
        batch.uintOfMeasure ??
        batch.unitOfMeasure ??
        batch.uom ??
        '',
      lastUnitValue: batch.lastUnitValue,
      _stockBatchId: batch.id,
      unitSellingModelId: batch.unitSellingModelId ?? batch.unit_selling_model_id ?? null,
      image: batch.image || batch.imageUrl || null,
      imageUrl: batch.image || batch.imageUrl || null,
      image2: batch.image2 || null,
      image3: batch.image3 || null,
    };
  }

  private plainDrugName(batch: any): string {
    return String(batch?.stockItemName || batch?.itemName || 'Product').trim();
  }

  private resolveStoreDisplayName(storeId: number, batchFallback?: string): string {
    const id = Number(storeId);
    if (Number.isFinite(id) && id > 0 && this.storeList?.length) {
      const store = this.storeList.find((s) => Number(s?.id ?? s?.storeId) === id);
      if (store) {
        const name = String(store?.name ?? store?.storeName ?? '').trim();
        if (name) {
          return name;
        }
      }
    }
    const fromBatch = String(batchFallback ?? '').trim();
    if (fromBatch) {
      return fromBatch;
    }
    return Number.isFinite(id) && id > 0 ? `Store #${id}` : 'Unknown store';
  }

  private stockBatchTreatmentLabel(batch: any): string {
    if (!batch) {
      return '';
    }
    const name = this.plainDrugName(batch);
    const batchNo =
      batch.batchNumber != null && String(batch.batchNumber).trim() !== ''
        ? String(batch.batchNumber).trim()
        : String(batch.id ?? '?');
    const expiry = this.formatBatchExpiryShort(batch);
    const uom = String(
      batch.uintOfMeasure ?? batch.unitOfMeasure ?? batch.uom ?? this.unitOfMeasure ?? ''
    ).trim();
    const uomSuffix = uom ? ` ${uom}` : '';
    const parts = [name, `BTH ${batchNo}`];
    if (expiry) {
      parts.push(`EX ${expiry}`);
    }
    const storeName = String(batch?.storeName ?? batch?.store_name ?? '').trim();
    const hand = Number(batch?.stockAtHand ?? batch?.stock_at_hand ?? 0);
    if (storeName && hand > 0) {
      parts.push(`${storeName} ${hand}${uomSuffix}`);
    }
    return parts.join(' · ');
  }
}
