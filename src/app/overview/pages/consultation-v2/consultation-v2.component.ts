import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';
import { AccessControlService } from '../../../services/access-control.service';
import { FacilityBrandingService } from '../../../services/facility-branding.service';
import {
  ensureFromModuleInList,
  isQueueDischargeDestination,
  normalizeBusinessModules,
  pickDefaultFromModuleId,
  QUEUE_DISCHARGE_DESTINATION_ID,
  queueDestinationOptions,
} from '../../../utils/queue-module.util';
import { formatTreatmentPeriodUnit, parseTreatmentPeriodUnitToDayFraction, resolveStockPrescribingSource, DOSAGE_UNIT_SELECT_OPTIONS, applyPrescribingPrefillToTreatmentForm, normalizeDosageUnitForSelect, isStandardDosageUnit } from '../../../utils/prescribing-prefill.util';
import { clientGroupUsesCompassionPricing, findUnitSellingModelByNameKeyword } from '../../../shared/unit-selling-model-picker/unit-selling-model.interface';
import { formatMoneyWholeDisplay } from '../../../utils/ugx-money.util';
import {
  computePulsePressure,
  formatPulsePressureDisplay as formatPulsePressureUtil,
} from '../../../utils/vitals-calculations.util';
import { BatchSellingModel, extractBatchLinePricing } from '../../../utils/stock-batch-pricing.util';
import { StandardDosageOption } from '../../../utils/standard-dosage.util';
import { buildCommercialDocumentPdf,
  commercialDocFilename,
  mapSaleToCommercialDoc,
  normalizeCommercialDocType,
} from '../../../utils/commercial-document-pdf.util';
import jsPDF from 'jspdf';
import {
  applyTreatmentLifecycleFlags,
  TreatmentLifecycleFlag,
  treatmentLifecyclePatch,
} from '../../../utils/treatment-lifecycle.util';
import {
  buildAndDownloadAllLabResultsDocx,
  buildCbcInterpretationForView,
  fetchProcedureReportForPdf$,
  filterProceduresForCombinedLabDocxExport,
  getProcedureReportKindForPdf,
  isUltrasoundScanCategoryProcedure,
  isUrinalysisProcedureName,
  normalizeProcedureRequestedNameForLabRouting,
} from '../../../utils/lab-results-docx.util';
import {
  CbcResultField,
  getCbcFieldsForClient,
  getCbcReferenceLabel,
} from '../../../utils/cbc-reference-ranges.util';

type ConsultationTab =
  | 'client'
  | 'quotation'
  | 'proforma'
  | 'sales_invoice'
  | 'payment'
  | 'receipt'
  | 'delivered'
  | 'returned'
  /** @deprecated clinical tabs kept for existing panel markup */
  | 'vitals'
  | 'consultation'
  | 'services'
  | 'pharmacy'
  | 'billing'
  | 'reports';

type VitalTone = 'normal' | 'warning' | 'critical';

interface ConsultationFormModel {
  chiefComplaint: string;
  historyOfPresentingComplaint: string;
  reviewOfOtherSystems: string;
  medicalHistory: string;
  medicationHistory: string;
  allergies: string;
  familyHistory: string;
  socialHistory: string;
  clinicalExamination: string;
  diagnosis: string;
  differentialDiagnosis: string;
  followUpInstructions: string;
  notes: string;
}

interface CreateVisitFormModel {
  visitDate: string;
  visitTime: string;
  visitStatus: string;
  visitType: string;
  visitReason: string;
  clientAge: string;
  clientContact: string;
  clientAddress: string;
  nextOfKinName: string;
  nextOfKinAddress: string;
  nextOfKinContact: string;
  relationship: string;
  occupation: string;
}

@Component({
  selector: 'app-consultation-v2',
  templateUrl: './consultation-v2.component.html',
  styleUrls: ['./consultation-v2.component.css'],
})
export class ConsultationV2Component implements OnInit, OnDestroy {
  readonly tabs: { id: ConsultationTab; label: string; icon: string }[] = [
    { id: 'client', label: 'Client Data', icon: 'bi-person-vcard' },
  ];

  /** Sales transaction progress after Client Data. */
  readonly progressTabs: { id: ConsultationTab; label: string; icon: string }[] = [
    { id: 'quotation', label: 'Quotation', icon: 'bi-file-earmark-text' },
    { id: 'proforma', label: 'Proforma Invoice', icon: 'bi-file-earmark-ruled' },
    { id: 'sales_invoice', label: 'Sales Invoice', icon: 'bi-receipt-cutoff' },
    { id: 'payment', label: 'Payment', icon: 'bi-cash-coin' },
    { id: 'receipt', label: 'Receipt', icon: 'bi-receipt' },
    { id: 'delivered', label: 'Delivered', icon: 'bi-box-seam' },
    { id: 'returned', label: 'Returned', icon: 'bi-arrow-return-left' },
  ];

  activeTab: ConsultationTab = 'client';
  /**
   * Per-stage completion for the progress track.
   * Delivery can mark quotation/proforma/sales invoice without marking payment.
   * Receipt marks quotation → payment → receipt (leaves delivery for seller).
   */
  progressStageDone: Record<string, boolean> = {
    quotation: false,
    proforma: false,
    sales_invoice: false,
    payment: false,
    receipt: false,
    delivered: false,
    returned: false,
  };
  isConfirmingDelivery = false;
  deliveryNoteDraft = '';

  // Client
  clientId: number | null = null;
  clientFirstName = '';
  clientSecondName = '';
  clientFileNo = '';
  clientProfilePic = 'assets/images/vector.jpeg';
  clientGender = '';
  clientAge = '';
  clientContact = '';
  clientAddress = '';
  clientDateOfBirth = '';
  clientOccupation = '';
  clientGroupName = '';
  clientGroupId: number | null = null;
  nextOfKinName = '';
  nextOfKinContact = '';
  nextOfKinAddress = '';
  relationship = '';
  totalAmountDue = 0;
  mdUser = false;

  // Visit
  clientVisitList: any[] = [];
  visitSearchQuery = '';
  isLoadingVisits = false;
  isCreatingVisit = false;
  visitId: number | null = null;
  visit: any = null;
  visitStatus = '';
  isOpenVisit = false;
  isClosedVisit = false;
  hasNoVisit = true;
  isUpdatingClientVisit = false;

  // Modals
  showCreateVisitModal = false;
  showChooseVisitModal = false;
  showEditVisitModal = false;
  showEditClientModal = false;
  showQueueClientModal = false;
  showPayAllDebtModal = false;
  showCloseVisitModal = false;
  showTreatmentChartModal = false;
  facilityDisplayName = '';
  facilityLogoUrl = 'assets/images/logo.jpg';

  createVisitFormData: CreateVisitFormModel = this.emptyCreateVisitForm();
  editVisitFormData: CreateVisitFormModel = this.emptyCreateVisitForm();
  editClientFormData: any = {};
  editClientError = '';
  isUpdatingClientData = false;
  editingVisitId: number | null = null;
  editingVisitNumber = '';
  isUpdatingVisitDetails = false;
  isLoadingEditVisitDetails = false;
  isDeletingVisit = false;

  // Queue client
  clientGroupList: any[] = [];
  queueClientModules: any[] = [];
  queueClientClinics: any[] = [];
  queueClientError = '';
  queueClientSaving = false;
  closeVisitForm = {
    outcome: 'COMPLETED',
    note: '',
  };
  queueClientForm = {
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

  // Pay all debt
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

  // Vitals
  vitalsList: any[] = [];
  isLoadingVitals = false;
  showVitalsModal = false;
  currentVital: any = this.emptyVitalForm();
  vitalStation = 'Triage';
  vitalSaveStatus = 'Save Vitals';
  editingVitalId: number | null = null;
  isSavingVital = false;
  vitalsActionMenuId: number | string | null = null;
  vitalsActionMenuVital: any = null;
  vitalsActionMenuStyle: Record<string, string> = {};
  @ViewChild('vitalsActionMenuPop') vitalsActionMenuPop?: ElementRef<HTMLElement>;
  showVitalsDeleteModal = false;
  vitalPendingDelete: any = null;
  isDeletingVital = false;

  // Consultation
  consultationForm: ConsultationFormModel = this.emptyConsultationForm();
  isSavingConsultation = false;
  isLoadingConsultation = false;
  presentingComplaintsList: any[] = [];
  showPresentingComplaintEditor = false;
  editingPresentingComplaintId: number | null = null;
  isSavingPresentingComplaint = false;
  presentingComplaintDraft = this.emptyPresentingComplaintDraft();
  pcPickerOpen:
    | 'complaint'
    | 'site'
    | 'severity'
    | 'onset'
    | 'course'
    | 'durationUnit'
    | 'nature'
    | 'aggravating'
    | 'alleviating'
    | 'associated'
    | null = null;
  pePickerOpen: 'system' | 'status' | null = null;
  pcPickerSearch = '';
  pePickerSearch = '';
  isSavingPcOption = false;
  pcComplaintTypes: any[] = [];
  pcComplaintSites: any[] = [];
  pcNatureOptions: any[] = [];
  pcAggravatingOptions: any[] = [];
  pcAlleviatingOptions: any[] = [];
  pcAssociatedOptions: any[] = [];
  pcExtraSeverity: string[] = [];
  pcExtraOnset: string[] = [];
  pcExtraCourse: string[] = [];
  pcExtraDurationUnits: { value: string; label: string }[] = [];
  peExtraSystems: string[] = [];
  peExtraStatuses: string[] = [];
  readonly pcSeverityOptions = ['Mild', 'Moderate', 'Severe'];
  readonly pcOnsetOptions = ['Sudden', 'Gradual'];
  readonly pcCourseOptions = ['Improving', 'Worsening', 'Stable', 'Fluctuating'];
  readonly pcDefaultNatures = ['Sharp', 'Dull', 'Throbbing', 'Burning', 'Stabbing', 'Crushing', 'Aching'];
  readonly pcDefaultAggravating = ['Movement', 'Breathing', 'Eating', 'Stress', 'Cold', 'Heat'];
  readonly pcDefaultAlleviating = ['Rest', 'Medication', 'Heat', 'Cold', 'Elevation'];
  readonly pcDefaultAssociated = ['Nausea', 'Vomiting', 'Fever', 'Shortness of breath', 'Dizziness', 'Sweating'];
  readonly pcDurationUnitOptions: { value: string; label: string }[] = [
    { value: 'day', label: 'Day(s)' },
    { value: 'week', label: 'Week(s)' },
    { value: 'month', label: 'Month(s)' },
    { value: 'year', label: 'Year(s)' },
  ];
  readonly peStatusOptions = ['Normal', 'Abnormal'];
  physicalExaminationsList: any[] = [];
  showPhysicalExaminationEditor = false;
  editingPhysicalExaminationId: number | null = null;
  isSavingPhysicalExamination = false;
  physicalExaminationDraft = this.emptyPhysicalExaminationDraft();
  readonly physicalExamSystemOptions = [
    'General',
    'Respiratory',
    'Cardiovascular',
    'CNS',
    'Abdominal',
    'Musculoskeletal',
    'ENT',
    'Genitourinary',
    'Skin',
    'Other',
  ];
  diagnosesList: any[] = [];
  showDiagnosisEditor = false;
  editingDiagnosisId: number | null = null;
  isSavingDiagnosis = false;
  dxPickerOpen: 'name' | 'severity' | null = null;
  dxPickerSearch = '';
  isSavingDxOption = false;
  diagnosisTypesList: any[] = [];
  dxExtraSeverity: string[] = [];
  readonly dxSeverityOptions = ['Mild', 'Moderate', 'Severe'];
  showCatalogEditor = false;
  isSavingCatalog = false;
  catalogEditorKind:
    | 'complaint'
    | 'site'
    | 'severity'
    | 'onset'
    | 'course'
    | 'durationUnit'
    | 'nature'
    | 'aggravating'
    | 'alleviating'
    | 'associated'
    | 'diagnosis'
    | 'dxSeverity'
    | 'peSystem'
    | 'peStatus'
    | null = null;
  catalogEditorId: number | null = null;
  catalogEditorTitle = '';
  catalogEditorOriginalTitle = '';
  catalogEditorMode: 'add' | 'edit' = 'add';
  diagnosisDraft = {
    name: '',
    severity: '',
    kind: 'final' as 'final' | 'differential',
    notes: '',
  };

  // Services
  proceduresList: any[] = [];
  procedureCatalog: any[] = [];
  procedureSearch = '';
  showServiceModal = false;
  serviceDropdownOpen = false;
  orderedByDropdownOpen = false;
  selectedProcedureId: number | null = null;
  selectedProcedureLabel = 'Select service';
  selectedServiceUnitSellingModelId: number | null = null;
  currentServiceProcedureUnitCost: number | null = null;
  serviceForm = { unitSellingPrice: null as number | null, indication: '', orderedBy: '' };
  isSavingService = false;
  isLoadingProcedureCatalog = false;
  isLoadingServices = false;
  serviceActionMenuId: number | string | null = null;
  serviceActionMenuItem: any = null;
  serviceActionMenuStyle: Record<string, string> = {};
  isPrintingScanResults = false;
  showServiceDetailsModal = false;
  showServiceWhenModal = false;
  showServiceDeleteModal = false;
  serviceDetailsItem: any = null;
  serviceWhenItem: any = null;
  servicePendingDelete: any = null;
  isDeletingService = false;
  showServiceResultsModal = false;
  selectedProcedureResult: any = null;
  isLoadingProcedureResults = false;
  procedureResultsLabReportTitle = '';
  showResultGeneralForm = false;
  showResultMrdtForm = false;
  showResultUrinalysisForm = false;
  showResultCbcForm = false;
  showResultParasitologyStoolForm = false;
  showResultScanForm = false;
  generalResult: { result: string; notes: string; recommendation: string } = {
    result: '',
    notes: '',
    recommendation: '',
  };
  mrdtResult: {
    bs: string;
    mrdt: string;
    notes: string;
    recommendation: string;
    result: string;
  } = { bs: '', mrdt: '', notes: '', recommendation: '', result: '' };
  urinalysisResult: Record<string, string> = {};
  parasitologyStoolResult: Record<string, string> = {};
  scanResult: {
    indication: string;
    findings: string;
    impression: string;
    exam: string;
  } = { indication: '', findings: '', impression: '', exam: '' };
  cbcResult: Record<string, string> = {};
  cbcInterpretation: Record<string, string> = {};
  cbcResultFields: CbcResultField[] = getCbcFieldsForClient(null, null, null);
  cbcRefCohortLabel = getCbcReferenceLabel(null, null, null);
  @ViewChild('serviceSearchInput') serviceSearchInput?: ElementRef<HTMLInputElement>;

  // Pharmacy
  pharmacyUseStockBatch = true;
  treatmentsList: any[] = [];
  pharmacyStockItemList: any[] = [];
  pharmacyItemList: any[] = [];
  isLoadingPharmacyItems = false;
  pharmacyStoreList: any[] = [];
  pharmacyGroupedStockItems: {
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
  pharmacyDrugSearchText = '';
  pharmacyDrugDropdownOpen = false;
  pharmacyDiagnosisDropdownOpen = false;
  pharmacySelectedLabel = 'Choose Treatment';
  pharmacySelectedFullLabel = '';
  currentItemId: number | null = null;
  currentStockBatchId: number | null = null;
  selectedUnitSellingModelId: number | null = null;
  unitBuy = 0;
  itemSellingPrice = 0;
  lastUnitValue = 1;
  unitOfMeasure = '';
  availableQuantity = 0;
  pharmacyStockDistributionTotal = 0;
  readonly dosageUnitOptions: readonly string[] = DOSAGE_UNIT_SELECT_OPTIONS;
  pharmacyForm = {
    quantity: 1,
    totalUnits: 1,
    estimatedUnits: 1,
    totalAmount: 0,
    durationValue: null as number | null,
    durationUnit: null as number | null,
    frequencyValue: null as number | null,
    frequencyUnit: null as number | null,
    amountPerFrequencyValue: 1,
    amountPerFrequencyUnit: 'tablet',
    instructions: '',
    route: 'Oral',
    diagnosisId: null as number | null,
  };
  isSavingPharmacy = false;
  isLoadingStock = false;
  isLoadingPharmacy = false;
  showPharmacyModal = false;
  showSundriesModal = false;
  isSavingSundry = false;
  isLoadingSundries = false;
  isDeletingSundryId: number | null = null;
  visitSundries: any[] = [];
  sundryDropdownOpen = false;
  sundryBatchSearch = '';
  sundryForm = {
    stockRefId: null as number | null,
    quantity: 1,
  };
  editingPharmacyTreatmentId: number | null = null;
  pharmacyActionMenuId: number | string | null = null;
  pharmacyActionMenuItem: any = null;
  pharmacyActionMenuStyle: Record<string, string> = {};
  @ViewChild('pharmacyActionMenuPop') pharmacyActionMenuPop?: ElementRef<HTMLElement>;
  showPharmacyDeleteModal = false;
  pharmacyPendingDelete: any = null;
  isDeletingPharmacy = false;

  @ViewChild('pharmacyDrugSearchInput') pharmacyDrugSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('sundrySearchInput') sundrySearchInput?: ElementRef<HTMLInputElement>;

  // Billing
  invoice: any = null;
  invoiceId: number | null = null;
  isLoadingInvoice = false;
  isLoadingBillingSummary = false;
  summaryTreatmentCost: any = '0.00';
  summaryProcedureCost: any = '0.00';
  summaryTtCost: any = '0.00';
  summarySubtotal: any = '0.00';
  summaryDiscount: any = '0.00';
  summaryTax: any = '0.00';
  summaryTotalSell: any = '0.00';
  summaryAmountPaid: any = '0.00';
  summaryBalanceDue: any = '0.00';
  paymentsList: any[] = [];
  isLoadingPayments = false;
  /** Commercial documents (quotations, etc.) for the current order/client. */
  orderQuotations: any[] = [];
  isLoadingOrderQuotations = false;
  /** Proforma / sales invoice / receipt lists keyed by documentType. */
  orderProformas: any[] = [];
  orderSalesInvoices: any[] = [];
  orderReceipts: any[] = [];
  isLoadingOrderProformas = false;
  isLoadingOrderSalesInvoices = false;
  isLoadingOrderReceipts = false;
  orderDocActionMenuId: number | string | null = null;
  orderDocActionMenuDoc: any = null;
  orderDocActionMenuStyle: Record<string, string> = {};
  @ViewChild('orderDocActionMenuPop') orderDocActionMenuPop?: ElementRef<HTMLElement>;
  isPrintingOrderDoc = false;
  showPaymentModal = false;
  showTaxDiscountModal = false;
  editingPaymentId: number | null = null;
  paymentActionMenuId: number | string | null = null;
  paymentActionMenuPayment: any = null;
  paymentActionMenuStyle: Record<string, string> = {};
  @ViewChild('paymentActionMenuPop') paymentActionMenuPop?: ElementRef<HTMLElement>;
  showPaymentDeleteModal = false;
  paymentPendingDelete: any = null;
  isDeletingPayment = false;
  showPaymentReverseModal = false;
  paymentPendingReverse: any = null;
  isReversingPayment = false;
  paymentForm = {
    amountToPay: null as number | null,
    paymentForm: 'Cash At Hand',
    notes: 'Payment Received with Thanks',
    dateOfPayment: '',
    timeOfPayment: '',
  };
  /** Visit-specific balance due shown in receive-payment modal. */
  paymentVisitDueHint: number | null = null;
  taxDiscountForm = {
    discount: null as number | null,
    tax: null as number | null,
    invoiceNotes: '',
  };
  isSavingPayment = false;
  isSavingTaxDiscount = false;
  isExportingInvoice = false;
  isExportingStatement = false;
  isExportingLabResults = false;

  // Statement export
  showStatementExportModal = false;
  statementExportIncludeNextOfKin = true;
  statementExportIncludePaymentTable = true;
  statementExportIncludeAmountColumns = true;
  statementExportIncludeFooter = true;
  statementExportDocumentType: 'MEDICAL_REPORT' | 'DISCHARGE_FORM' | 'MEDICAL_FORM' = 'MEDICAL_REPORT';
  statementExportSelectedTreatmentIds: number[] = [];
  statementExportSelectedProcedureIds: number[] = [];
  readonly statementExportClientFieldOptions: Array<{
    key:
      | 'includeClientName'
      | 'includeClientAddress'
      | 'includeClientGender'
      | 'includeClientAge'
      | 'includeClientContact'
      | 'includeVisitDate'
      | 'includeBalanceDue';
    label: string;
  }> = [
    { key: 'includeClientName', label: 'Full name' },
    { key: 'includeClientAddress', label: 'Address' },
    { key: 'includeClientGender', label: 'Gender' },
    { key: 'includeClientAge', label: 'Age' },
    { key: 'includeClientContact', label: 'Contact' },
    { key: 'includeVisitDate', label: 'Visit date' },
    { key: 'includeBalanceDue', label: 'Balance due' },
  ];
  statementExportClientFields = {
    includeClientName: true,
    includeClientAddress: true,
    includeClientGender: true,
    includeClientAge: true,
    includeClientContact: true,
    includeVisitDate: true,
    includeBalanceDue: true,
  };
  statementExportAccordion: Record<
    'client' | 'document' | 'services' | 'treatments' | 'nextOfKin' | 'payment' | 'amounts' | 'footer',
    boolean
  > = {
    client: true,
    document: false,
    services: false,
    treatments: false,
    nextOfKin: false,
    payment: false,
    amounts: false,
    footer: false,
  };
  consultAccordion: Record<string, boolean> = {
    presenting: true,
    historyPc: false,
    reviewSystems: false,
    medicalHistory: false,
    medicationHistory: false,
    allergies: false,
    familyHistory: false,
    socialHistory: false,
    physicalExam: false,
    diagnoses: false,
    followUp: false,
    notes: false,
  };

  // UI feedback
  statusMessage = '';
  statusTone: 'success' | 'error' | 'info' = 'info';
  showStatus = false;
  private statusTimer?: ReturnType<typeof setTimeout>;

  readonly visitTypeOptions = [
    'inpatient',
    'outpatient',
    'Follow-up consultation',
    'Maternity Visit',
    'Antenatal Visit',
    'Pediatric Visit',
    'Surgical Visit',
    'diagnostic imaging',
    'Family Planing Visit',
  ];

  userName = '';
  private contentScrollEl: HTMLElement | null = null;
  private contentScrollPrevOverflow = '';
  private contentScrollPrevDisplay = '';
  private contentScrollPrevFlexDirection = '';
  private hostScrollEl: HTMLElement | null = null;
  private hostScrollPrevFlex = '';
  private hostScrollPrevMinHeight = '';
  private hostScrollPrevDisplay = '';
  private hostScrollPrevHeight = '';

  constructor(
    private api: ApiService,
    private router: Router,
    private accessControl: AccessControlService,
    private facilityBranding: FacilityBrandingService
  ) {}

  ngOnInit(): void {
    this.userName = sessionStorage.getItem('username') || '';
    const userRole = (sessionStorage.getItem('userrole') || sessionStorage.getItem('userRole') || '').toLowerCase().trim();
    const secondaryRoles = (
      sessionStorage.getItem('userSecondaryRoles') ||
      sessionStorage.getItem('usersecondaryroles') ||
      ''
    ).toLowerCase();
    this.mdUser = userRole === 'md' || secondaryRoles.split(/[,|]/).some((r) => r.trim() === 'md');
    this.accessControl.refreshFromSession();
    this.facilityDisplayName = this.facilityBranding.getFacilityName();
    this.facilityLogoUrl = this.facilityBranding.getLogoUrlForDisplay();
    this.facilityBranding.load().subscribe({
      next: () => {
        this.facilityDisplayName = this.facilityBranding.getFacilityName();
        this.facilityLogoUrl = this.facilityBranding.getLogoUrlForDisplay();
        this.applyPharmacyTreatmentSourceFromBusinessSettings();
      },
      error: () => {
        this.facilityDisplayName = this.facilityBranding.getFacilityName();
        this.facilityLogoUrl = this.facilityBranding.getLogoUrlForDisplay();
        this.applyPharmacyTreatmentSourceFromBusinessSettings();
      },
    });
    this.applyPharmacyTreatmentSourceFromBusinessSettings();
    if (!this.userName) {
      this.router.navigate(['/login']);
      return;
    }

    this.bootstrapFromSession();
    setTimeout(() => this.lockOverviewContentScroll(), 0);
  }

  get canOpenClosedVisit(): boolean {
    return this.accessControl.canOpenClosedVisit();
  }

  /** Unit cost, TT cost, and billing cost totals in pharmacy tab, modals, and summary row. */
  canViewCostColumns(): boolean {
    return this.accessControl.canViewPageComponent('consultation-v2', 'cost-columns');
  }

  ngOnDestroy(): void {
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
    }
    this.closeServiceActionMenu();
    this.closeVitalsActionMenu();
    this.closePharmacyActionMenu();
    this.closePaymentActionMenu();
    this.closeModernPicker();
    this.unlockOverviewContentScroll();
    document.body.style.overflow = '';
  }

  get clientFullName(): string {
    const first = this.clientFirstName || '';
    const second = this.clientSecondName || '';
    return `${first} ${second}`.trim() || 'No client selected';
  }

  get filteredVisits(): any[] {
    const q = this.visitSearchQuery.trim().toLowerCase();
    let list = this.clientVisitList;
    if (q) {
      list = list.filter((visit) => {
        const label = this.formatVisitLabel(visit).toLowerCase();
        const status = (visit?.visitStatus || '').toString().toLowerCase();
        const type = (visit?.visitType || '').toString().toLowerCase();
        return label.includes(q) || status.includes(q) || type.includes(q);
      });
    }
    return this.sortVisitsNewestFirst(list);
  }

  get selectedVisitLabel(): string {
    if (!this.visit) {
      return 'Select order';
    }
    return this.formatVisitLabel(this.visit);
  }

  get visitStatusLabel(): string {
    if (this.hasNoVisit) {
      return 'No order';
    }
    return (this.visitStatus || 'unknown').toString();
  }

  get queueClientDestinationModules(): any[] {
    return queueDestinationOptions(this.queueClientModules);
  }

  get canApplyPayAllClientDebt(): boolean {
    if (this.payAllDebtSaving || this.payAllDebtLoading) {
      return false;
    }
    if (this.payAllDebtTotalOutstanding() <= 0) {
      return false;
    }
    const amount = Number(this.payAllDebtForm.amountToPay);
    if (!Number.isFinite(amount) || amount <= 0) {
      return false;
    }
    return this.payAllDebtAllocation.length > 0;
  }

  get currentShockIndex(): number | null {
    return this.computeShockIndex(this.currentVital);
  }

  get currentShockIndexTone(): VitalTone | null {
    return this.getShockIndexTone(this.currentShockIndex);
  }

  get currentPulsePressure(): number | null {
    return this.pulsePressureForVital(this.currentVital);
  }

  get currentBpTone(): VitalTone | null {
    return this.getBpTone(this.currentVital?.systolic, this.currentVital?.diastolic);
  }

  get currentBmi(): number | null {
    return this.computeVitalBmi(this.currentVital);
  }

  get currentBmiTone(): VitalTone | null {
    return this.getBmiTone(this.currentBmi);
  }

  get currentMuacTone(): VitalTone | null {
    return this.getMuacTone(this.resolveVitalMuac(this.currentVital));
  }

  get filteredProcedureCatalog(): any[] {
    const q = this.procedureSearch.trim().toLowerCase();
    let list = this.procedureCatalog || [];
    if (q) {
      list = list.filter((p) => {
        const name = (p?.procedureName || p?.name || '').toString().toLowerCase();
        const cat = (p?.category || '').toString().toLowerCase();
        return name.includes(q) || cat.includes(q);
      });
    }
    return [...list].sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0));
  }

  setActiveTab(tab: ConsultationTab): void {
    this.closeServiceActionMenu();
    this.activeTab = tab;
    if (!this.visitId && !this.clientId) {
      return;
    }
    if (tab === 'quotation') {
      this.loadOrderQuotations();
    }
    if (tab === 'proforma') {
      this.loadOrderProformas();
    }
    if (tab === 'sales_invoice') {
      this.loadOrderSalesInvoices();
    }
    if (tab === 'payment' || tab === 'sales_invoice' || tab === 'receipt') {
      this.loadInvoice();
      this.loadPayments();
    }
    if (tab === 'payment') {
      // So Payment-tab print/share can reuse the same POS receipt documents.
      this.loadOrderReceipts();
    }
    if (tab === 'receipt') {
      this.loadOrderReceipts();
    }
    if (tab === 'delivered' || tab === 'returned') {
      this.refreshTransactionProgress();
    }
  }

  progressTabState(index: number): 'done' | 'current' | 'upcoming' {
    const tab = this.progressTabs[index];
    if (!tab) {
      return 'upcoming';
    }
    if (this.activeTab === tab.id) {
      return 'current';
    }
    if (this.progressStageDone[tab.id]) {
      return 'done';
    }
    return 'upcoming';
  }

  isProgressTabDone(index: number): boolean {
    const tab = this.progressTabs[index];
    return !!tab && !!this.progressStageDone[tab.id];
  }

  isProgressTabCurrent(index: number): boolean {
    return this.progressTabs[index]?.id === this.activeTab;
  }

  /** Recalculate progress checks from order documents, payments, and delivery flag. */
  refreshTransactionProgress(): void {
    if (!this.visitId) {
      this.resetProgressStageDone();
      return;
    }
    const goodsDelivered = Boolean(this.visit?.goodsDelivered);
    this.api.listOtcSaleDocuments({ visitId: this.visitId }).subscribe({
      next: (rows) => {
        const docs = Array.isArray(rows) ? rows : [];
        const types = new Set(
          docs.map((d) => String(d?.documentType || '').trim().toLowerCase())
        );
        const hasQuotation = types.has('quotation') || types.has('quote');
        const hasProforma = types.has('proforma') || types.has('proforma_invoice');
        const hasSalesInvoice = types.has('sales_invoice') || types.has('invoice');
        const hasReceipt = types.has('receipt');
        const hasPayment =
          (this.paymentsList || []).some((p) => !this.isPaymentReversed(p)) || hasReceipt;

        // Receipt auto-fills commercial + payment stages; delivery is separate.
        this.progressStageDone = {
          quotation: hasQuotation || hasProforma || hasSalesInvoice || hasReceipt || goodsDelivered,
          proforma: hasProforma || hasSalesInvoice || hasReceipt || goodsDelivered,
          sales_invoice: hasSalesInvoice || hasReceipt || goodsDelivered,
          // Delivery must NOT auto-check payment.
          payment: hasPayment,
          receipt: hasReceipt,
          delivered: goodsDelivered,
          returned: false,
        };
      },
      error: () => {
        const goodsDelivered = Boolean(this.visit?.goodsDelivered);
        const hasPayment = (this.paymentsList || []).some((p) => !this.isPaymentReversed(p));
        this.progressStageDone = {
          ...this.progressStageDone,
          payment: hasPayment,
          delivered: goodsDelivered,
          quotation: this.progressStageDone['quotation'] || goodsDelivered,
          proforma: this.progressStageDone['proforma'] || goodsDelivered,
          sales_invoice: this.progressStageDone['sales_invoice'] || goodsDelivered,
        };
      },
    });
  }

  private resetProgressStageDone(): void {
    this.progressStageDone = {
      quotation: false,
      proforma: false,
      sales_invoice: false,
      payment: false,
      receipt: false,
      delivered: false,
      returned: false,
    };
  }

  confirmOrderDelivered(): void {
    if (!this.visitId || this.isConfirmingDelivery) {
      return;
    }
    if (Boolean(this.visit?.goodsDelivered)) {
      this.showStatusMessage('Delivery was already confirmed for this order.', 'info');
      return;
    }
    const note = String(this.deliveryNoteDraft || '').trim();
    if (!note) {
      this.showStatusMessage('Enter a delivery note before confirming goods delivered.', 'error');
      return;
    }
    this.isConfirmingDelivery = true;
    this.api.confirmOtcGoodsDelivery(this.visitId, note).subscribe({
      next: (res: any) => {
        this.isConfirmingDelivery = false;
        const updated = res?.data ?? res;
        if (this.visit && typeof this.visit === 'object') {
          this.visit = {
            ...this.visit,
            goodsDelivered: true,
            deliveryNote: note,
            ...(updated || {}),
          };
        } else {
          this.visit = { id: this.visitId, goodsDelivered: true, deliveryNote: note };
        }
        this.deliveryNoteDraft = '';
        // Delivery confirms quotation → sales invoice path, not payment.
        this.progressStageDone = {
          ...this.progressStageDone,
          quotation: true,
          proforma: true,
          sales_invoice: true,
          delivered: true,
        };
        this.showStatusMessage('Delivery confirmed. Payment remains separate until received.', 'success');
        this.refreshTransactionProgress();
      },
      error: (err) => {
        this.isConfirmingDelivery = false;
        this.showStatusMessage(
          err?.error?.message || 'Could not confirm delivery.',
          'error'
        );
      },
    });
  }

  progressStageTitle(tab: ConsultationTab): string {
    return this.progressTabs.find((t) => t.id === tab)?.label || 'Transaction';
  }

  progressStageIcon(tab: ConsultationTab): string {
    return this.progressTabs.find((t) => t.id === tab)?.icon || 'bi-file-earmark';
  }

  loadOrderQuotations(): void {
    this.loadOrderCommercialDocuments('quotation');
  }

  loadOrderProformas(): void {
    this.loadOrderCommercialDocuments('proforma');
  }

  loadOrderSalesInvoices(): void {
    this.loadOrderCommercialDocuments('sales_invoice');
  }

  loadOrderReceipts(): void {
    this.loadOrderCommercialDocuments('receipt');
  }

  private loadOrderCommercialDocuments(
    documentType: 'quotation' | 'proforma' | 'sales_invoice' | 'receipt'
  ): void {
    if (!this.visitId && !this.clientId) {
      this.setOrderDocsForType(documentType, []);
      return;
    }
    this.setOrderDocsLoading(documentType, true);
    this.api
      .listOtcSaleDocuments({
        // Prefer this order when selected so tabs only show docs for the visit.
        visitId: this.visitId,
        patientId: this.visitId ? null : this.clientId,
        documentType,
      })
      .subscribe({
        next: (rows) => {
          this.setOrderDocsForType(documentType, Array.isArray(rows) ? rows : []);
          this.setOrderDocsLoading(documentType, false);
        },
        error: () => {
          this.setOrderDocsForType(documentType, []);
          this.setOrderDocsLoading(documentType, false);
          this.showStatusMessage(
            `Could not load ${this.progressStageTitle(documentType).toLowerCase()}s for this order.`,
            'error'
          );
        },
      });
  }

  private setOrderDocsForType(
    documentType: 'quotation' | 'proforma' | 'sales_invoice' | 'receipt',
    rows: any[]
  ): void {
    switch (documentType) {
      case 'quotation':
        this.orderQuotations = rows;
        break;
      case 'proforma':
        this.orderProformas = rows;
        break;
      case 'sales_invoice':
        this.orderSalesInvoices = rows;
        break;
      case 'receipt':
        this.orderReceipts = rows;
        break;
    }
  }

  private setOrderDocsLoading(
    documentType: 'quotation' | 'proforma' | 'sales_invoice' | 'receipt',
    loading: boolean
  ): void {
    switch (documentType) {
      case 'quotation':
        this.isLoadingOrderQuotations = loading;
        break;
      case 'proforma':
        this.isLoadingOrderProformas = loading;
        break;
      case 'sales_invoice':
        this.isLoadingOrderSalesInvoices = loading;
        break;
      case 'receipt':
        this.isLoadingOrderReceipts = loading;
        break;
    }
  }

  orderDocsForActiveCommercialTab(): any[] {
    switch (this.activeTab) {
      case 'quotation':
        return this.orderQuotations;
      case 'proforma':
        return this.orderProformas;
      case 'sales_invoice':
        return this.orderSalesInvoices;
      case 'receipt':
        return this.orderReceipts;
      default:
        return [];
    }
  }

  isLoadingOrderDocsForActiveCommercialTab(): boolean {
    switch (this.activeTab) {
      case 'quotation':
        return this.isLoadingOrderQuotations;
      case 'proforma':
        return this.isLoadingOrderProformas;
      case 'sales_invoice':
        return this.isLoadingOrderSalesInvoices;
      case 'receipt':
        return this.isLoadingOrderReceipts;
      default:
        return false;
    }
  }

  refreshOrderDocsForActiveCommercialTab(): void {
    switch (this.activeTab) {
      case 'quotation':
        this.loadOrderQuotations();
        break;
      case 'proforma':
        this.loadOrderProformas();
        break;
      case 'sales_invoice':
        this.loadOrderSalesInvoices();
        break;
      case 'receipt':
        this.loadOrderReceipts();
        break;
      default:
        break;
    }
  }

  orderDocumentTypeBadgeClass(doc: any): string {
    const type = String(doc?.documentType || this.activeTab || 'quotation')
      .trim()
      .toLowerCase();
    if (type === 'proforma' || type === 'proforma_invoice') {
      return 'otc-doc-status--proforma';
    }
    if (type === 'sales_invoice' || type === 'invoice') {
      return 'otc-doc-status--sales-invoice';
    }
    if (type === 'receipt') {
      return 'otc-doc-status--receipt';
    }
    return 'otc-doc-status--quotation';
  }

  orderDocumentTypeLabel(doc: any): string {
    const type = String(doc?.documentType || this.activeTab || 'quotation')
      .trim()
      .toLowerCase();
    if (type === 'proforma' || type === 'proforma_invoice') {
      return 'Proforma';
    }
    if (type === 'sales_invoice' || type === 'invoice') {
      return 'Sales invoice';
    }
    if (type === 'receipt') {
      return 'Receipt';
    }
    return 'Quotation';
  }

  orderDocumentLineCount(doc: any): number {
    const lines = doc?.lines;
    return Array.isArray(lines) ? lines.length : 0;
  }

  orderDocumentStatusLabel(doc: any): string {
    const type = String(doc?.documentType || 'quotation').toLowerCase();
    if (type === 'receipt') {
      return 'Paid';
    }
    if (type === 'sales_invoice' || type === 'invoice') {
      return 'Invoiced';
    }
    if (type === 'proforma' || type === 'proforma_invoice') {
      return 'Proforma';
    }
    return 'Processing';
  }

  formatOrderDocumentDate(doc: any): string {
    const date = doc?.saleDate || '';
    const time = doc?.saleTime || '';
    if (date && time) {
      return `${date} · ${String(time).slice(0, 8)}`;
    }
    return date || time || '—';
  }

  // ── Create visit modal ──────────────────────────────────────────────

  openCreateVisitModal(): void {
    if (!this.clientId) {
      this.showStatusMessage('Select a client first.', 'error');
      return;
    }
    this.fillCreateVisitFormFromClient();
    this.showCreateVisitModal = true;
    this.openCv2ModalLayer();

    this.api.getClientById(this.clientId).subscribe({
      next: (client) => {
        if (client && typeof client === 'object') {
          const normalized = this.normalizeClientRecord(client);
          this.applyClient(normalized);
          sessionStorage.setItem('item', JSON.stringify(normalized));
          this.fillCreateVisitFormClientFields();
        }
      },
      error: () => undefined,
    });
  }

  closeCreateVisitModal(): void {
    this.showCreateVisitModal = false;
    this.isCreatingVisit = false;
    this.restoreBodyScrollUnlessModalOpen();
  }

  resetCreateVisitForm(): void {
    this.fillCreateVisitFormFromClient();
  }

  submitCreateVisit(): void {
    if (!this.clientId || this.isCreatingVisit) {
      return;
    }

    this.isCreatingVisit = true;
    const payload = this.buildNewVisitPayload(this.createVisitFormData);

    this.api.createNewVisit(this.clientId, payload).subscribe({
      next: (response: any) => {
        this.isCreatingVisit = false;
        this.showStatusMessage(response?.message || 'Visit created successfully.', 'success');
        this.closeCreateVisitModal();

        const created = response?.data ?? response;
        if (created?.id) {
          sessionStorage.setItem('initialClientVisit', JSON.stringify(created));
          this.loadClientVisits(this.clientId!, created);
        } else if (this.clientId) {
          this.loadClientVisits(this.clientId);
        }
      },
      error: (err) => {
        this.isCreatingVisit = false;
        this.showStatusMessage(
          err?.error?.message || err?.error?.error || 'Could not create visit.',
          'error'
        );
      },
    });
  }

  // ── Choose visit modal ──────────────────────────────────────────────

  openChooseVisitModal(): void {
    if (!this.clientId) {
      this.showStatusMessage('Select a client first.', 'error');
      return;
    }
    this.visitSearchQuery = '';
    this.showChooseVisitModal = true;
    this.openCv2ModalLayer();
    this.loadClientVisits(this.clientId);
  }

  closeChooseVisitModal(): void {
    this.showChooseVisitModal = false;
    this.restoreBodyScrollUnlessModalOpen();
  }

  selectVisit(visit: any): void {
    this.closeChooseVisitModal();
    this.loadVisit(visit);
  }

  isVisitClosed(visit: any): boolean {
    return String(visit?.visitStatus || '').trim().toLowerCase() === 'closed';
  }

  closeVisitFromList(visit: any, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (!visit?.id) {
      return;
    }
    if (this.isVisitClosed(visit)) {
      this.showStatusMessage('This visit is already closed.', 'info');
      return;
    }
    this.closeChooseVisitModal();
    this.loadVisit(visit);
    this.closeVisit();
  }

  receivePaymentFromList(visit: any, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (!visit?.id) {
      return;
    }
    this.closeChooseVisitModal();
    this.loadVisit(visit);
    this.openPaymentModalForVisit(Number(visit.id), visit);
  }

  openEditVisitModal(visit: any, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (!visit?.id) {
      return;
    }
    this.editingVisitId = Number(visit.id);
    this.editingVisitNumber = String(visit.visitNumber ?? visit.id ?? '');
    this.applyEditVisitFormFromVisitSource(visit);
    this.showEditVisitModal = true;
    this.isLoadingEditVisitDetails = true;
    this.openCv2ModalLayer();

    this.api.getClientVisitByVisitId(visit.id).subscribe({
      next: (detail: any) => {
        this.applyEditVisitFormFromVisitSource(detail && typeof detail === 'object' ? detail : visit, visit);
        this.isLoadingEditVisitDetails = false;
      },
      error: () => {
        this.isLoadingEditVisitDetails = false;
      },
    });
  }

  closeEditVisitModal(): void {
    this.showEditVisitModal = false;
    this.isUpdatingVisitDetails = false;
    this.isLoadingEditVisitDetails = false;
    this.editingVisitId = null;
    this.editingVisitNumber = '';
    this.restoreBodyScrollUnlessModalOpen();
  }

  submitEditVisit(): void {
    if (!this.editingVisitId || this.isUpdatingVisitDetails) {
      return;
    }

    this.isUpdatingVisitDetails = true;
    const payload = {
      visitDate: this.editVisitFormData.visitDate || null,
      visitTime: this.editVisitFormData.visitTime || null,
      visitStatus: this.editVisitFormData.visitStatus,
      visitType: this.editVisitFormData.visitType || null,
      visitReason: this.editVisitFormData.visitReason || null,
      clientAge: this.editVisitFormData.clientAge || null,
      clientContact: this.editVisitFormData.clientContact || null,
      clientAddress: this.editVisitFormData.clientAddress || null,
      nextOfKinName: this.editVisitFormData.nextOfKinName || null,
      nextOfKinAddress: this.editVisitFormData.nextOfKinAddress || null,
      nextOfKinContact: this.editVisitFormData.nextOfKinContact || null,
      relationship: this.editVisitFormData.relationship || null,
      occupation: this.editVisitFormData.occupation || null,
    };

    this.api.updateVisit(this.editingVisitId, payload).subscribe({
      next: (res: any) => {
        const editedId = this.editingVisitId;
        this.isUpdatingVisitDetails = false;
        this.showStatusMessage(res?.message || 'Visit updated successfully.', 'success');
        this.closeEditVisitModal();
        if (this.clientId) {
          this.loadClientVisits(this.clientId);
        }
        if (this.visitId === editedId) {
          this.loadVisit(res?.data ?? { ...this.visit, ...payload, id: editedId });
        }
      },
      error: (err) => {
        this.isUpdatingVisitDetails = false;
        this.showStatusMessage(err?.error?.message || 'Could not update visit.', 'error');
      },
    });
  }

  deleteVisitFromList(visit: any, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    const id = Number(visit?.id);
    if (!id || this.isDeletingVisit) {
      return;
    }

    const label = this.formatVisitLabel(visit);
    if (!confirm(`Delete ${label}? This cannot be undone.`)) {
      return;
    }

    this.isDeletingVisit = true;
    const userRole = sessionStorage.getItem('userRole') || '';
    this.api.deleteClientVisit(id, userRole).subscribe({
      next: (res: any) => {
        this.isDeletingVisit = false;
        this.showStatusMessage(res?.message || 'Visit deleted.', 'success');
        if (this.visitId === id) {
          this.clearVisitState();
        }
        if (this.clientId) {
          this.loadClientVisits(this.clientId);
        }
      },
      error: (err) => {
        this.isDeletingVisit = false;
        this.showStatusMessage(err?.error?.message || 'Could not delete visit.', 'error');
      },
    });
  }

  // ── Edit client modal ──────────────────────────────────────────────

  openEditClientModal(): void {
    if (!this.clientId) {
      this.showStatusMessage('Select a client first.', 'error');
      return;
    }

    let stored: any = {};
    try {
      stored = JSON.parse(sessionStorage.getItem('item') || '{}');
    } catch {
      stored = {};
    }

    const groupId =
      stored.clientGroupId ??
      stored.clientGroup?.id ??
      (this.clientGroupList || []).find(
        (g: any) =>
          g.groupName === this.clientGroupName || g.groupNameShortForm === this.clientGroupName
      )?.id ??
      null;

    this.editClientFormData = {
      clientFirstName: this.clientFirstName || '',
      clientSecondName: this.clientSecondName || '',
      clientFileNo: this.clientFileNo || '',
      clientContact: this.clientContact || '',
      clientAge: this.coerceClientAgeForEdit(this.clientAge),
      clientDateOfBirth: this.normalizeDateForInput(this.clientDateOfBirth),
      clientGender: this.normalizeClientGenderForEdit(this.clientGender),
      clientAddress: this.clientAddress || '',
      clientOccupation: this.clientOccupation || '',
      clientGroupId: groupId,
      nextOfKinName: this.nextOfKinName || '',
      nextOfKinContact: this.nextOfKinContact || '',
      nextOfKinAddress: this.nextOfKinAddress || '',
      relationship: this.relationship || '',
    };

    if (!this.clientGroupList?.length) {
      this.loadClientGroups();
    }

    this.isUpdatingClientData = false;
    this.editClientError = '';
    this.showEditClientModal = true;
    this.openCv2ModalLayer();
  }

  closeEditClientModal(): void {
    this.showEditClientModal = false;
    this.isUpdatingClientData = false;
    this.editClientError = '';
    this.restoreBodyScrollUnlessModalOpen();
  }

  submitEditClient(): void {
    if (!this.clientId || this.isUpdatingClientData) {
      return;
    }

    const firstName = (this.editClientFormData.clientFirstName || '').trim();
    const secondName = (this.editClientFormData.clientSecondName || '').trim();

    if (!firstName || !secondName) {
      this.editClientError = 'First name and second name are required.';
      return;
    }

    if (firstName.toLowerCase() === secondName.toLowerCase()) {
      this.editClientError = 'First name and second name cannot be the same.';
      return;
    }

    this.isUpdatingClientData = true;
    this.editClientError = '';

    const ageVal = this.coerceClientAgeForEdit(this.editClientFormData.clientAge);
    const userRole = sessionStorage.getItem('userRole') || '';
    const requestData = {
      clientFirstName: firstName,
      clientSecondName: secondName,
      clientContact: (this.editClientFormData.clientContact || '').trim(),
      clientAge: ageVal != null ? Number(ageVal).toFixed(2) : null,
      clientDateOfBirth: this.formatClientDateForApi(this.editClientFormData.clientDateOfBirth),
      clientGender: this.editClientFormData.clientGender || null,
      clientAddress: (this.editClientFormData.clientAddress || '').trim(),
      occupation: (this.editClientFormData.clientOccupation || '').trim(),
      clientGroupId: this.editClientFormData.clientGroupId ?? null,
      nextOfKinName: (this.editClientFormData.nextOfKinName || '').trim(),
      nextOfKinContact: (this.editClientFormData.nextOfKinContact || '').trim(),
      nextOfKinAddress: (this.editClientFormData.nextOfKinAddress || '').trim(),
      relationship: (this.editClientFormData.relationship || '').trim(),
      userRole,
    };

    this.api.updateItem(this.clientId, requestData).subscribe({
      next: (response: any) => {
        this.isUpdatingClientData = false;
        this.showStatusMessage(response?.message || 'Client data updated successfully.', 'success');
        this.closeEditClientModal();
        this.api.getClientById(this.clientId!).subscribe({
          next: (res: any) => {
            const fresh = this.normalizeClientRecord(res?.data ?? res);
            sessionStorage.setItem('item', JSON.stringify(fresh));
            this.applyClient(fresh);
          },
        });
      },
      error: (err: any) => {
        this.isUpdatingClientData = false;
        this.editClientError =
          err?.error?.message ||
          err?.error?.error ||
          (typeof err?.error === 'string' ? err.error : null) ||
          'Failed to update client data.';
      },
    });
  }

  // ── Queue client modal ──────────────────────────────────────────────

  openQueueClientModal(): void {
    if (!this.clientId) {
      this.showStatusMessage('No client loaded. Open a client order first.', 'error');
      return;
    }
    this.queueClientError = '';
    this.queueClientClinics = [];
    const schemeName = (this.clientGroupName || this.visit?.visitDefaultScheme || '').toString();
    const matchedGroup = (this.clientGroupList || []).find(
      (g: any) => g?.groupName === schemeName || g?.groupNameShortForm === schemeName
    );
    this.queueClientForm = {
      fromModuleId: pickDefaultFromModuleId(this.queueClientModules),
      toModuleId: null,
      clinicId: null,
      note: '',
      visitDefaultScheme: schemeName,
      clientGroupId: matchedGroup?.id ?? null,
      emergency: false,
      revisit: false,
      printQueueTicket: false,
    };
    if (!this.clientGroupList?.length) {
      this.loadClientGroups();
    }
    this.loadQueueClientModules();
    this.showQueueClientModal = true;
    this.openCv2ModalLayer();
  }

  closeQueueClientModal(): void {
    this.showQueueClientModal = false;
    this.queueClientError = '';
    this.queueClientSaving = false;
    this.restoreBodyScrollUnlessModalOpen();
  }

  onQueueClientToModuleChange(): void {
    this.queueClientForm.clinicId = null;
    if (isQueueDischargeDestination(this.queueClientForm.toModuleId)) {
      this.queueClientClinics = [];
      return;
    }
    if (!this.queueClientForm.toModuleId) {
      this.queueClientClinics = [];
      return;
    }
    this.api.getBusinessClinics(this.queueClientForm.toModuleId).subscribe({
      next: (res: any) => {
        const all = Array.isArray(res) ? res : [];
        this.queueClientClinics = all.filter((c: any) => c.active !== false);
      },
      error: () => {
        this.queueClientClinics = [];
      },
    });
  }

  onQueueClientSchemeChange(): void {
    const g = (this.clientGroupList || []).find((x: any) => x.id === this.queueClientForm.clientGroupId);
    this.queueClientForm.visitDefaultScheme = g?.groupName || '';
  }

  submitQueueClient(): void {
    const clientId = Number(this.clientId);
    const isDischarge = isQueueDischargeDestination(this.queueClientForm.toModuleId);
    if (!clientId) {
      this.queueClientError = 'Select a client first.';
      return;
    }
    if (!isDischarge && !this.queueClientForm.fromModuleId) {
      this.queueClientError = 'Select From department.';
      return;
    }
    if (!this.queueClientForm.toModuleId) {
      this.queueClientError = 'Select destination.';
      return;
    }
    this.queueClientSaving = true;
    this.queueClientError = '';
    const visitId = this.visitId ?? this.visit?.id;
    const username = sessionStorage.getItem('username') || '';

    if (isDischarge) {
      this.api
        .dischargeClientFromQueue({
          clientId,
          note: this.queueClientForm.note,
          dischargedBy: username,
        })
        .subscribe({
          next: () => {
            this.queueClientSaving = false;
            this.showStatusMessage('Client discharged from queue.', 'success');
            this.closeQueueClientModal();
          },
          error: (err: any) => {
            this.queueClientSaving = false;
            this.queueClientError = err?.error?.message || 'Failed to discharge client.';
          },
        });
      return;
    }

    const scheme =
      this.queueClientForm.visitDefaultScheme ||
      (this.clientGroupList || []).find((g: any) => g.id === this.queueClientForm.clientGroupId)?.groupName ||
      '';
    const fromModuleId = this.queueClientForm.fromModuleId;
    const toModuleId = this.queueClientForm.toModuleId;
    if (fromModuleId == null || toModuleId == null) {
      this.queueClientSaving = false;
      this.queueClientError = 'Select From and To departments.';
      return;
    }
    this.api
      .queueClient({
        clientId,
        clientVisitId: visitId != null ? Number(visitId) : undefined,
        fromModuleId,
        toModuleId,
        clinicId: this.queueClientForm.clinicId ?? undefined,
        note: this.queueClientForm.note,
        visitDefaultScheme: scheme,
        clientGroupId: this.queueClientForm.clientGroupId ?? undefined,
        emergency: this.queueClientForm.emergency,
        revisit: this.queueClientForm.revisit,
        queuedBy: username,
      })
      .subscribe({
        next: () => {
          this.queueClientSaving = false;
          this.showStatusMessage('Client queued successfully.', 'success');
          this.closeQueueClientModal();
        },
        error: (err: any) => {
          this.queueClientSaving = false;
          this.queueClientError = err?.error?.message || 'Failed to queue client.';
        },
      });
  }

  // ── Close / open visit ──────────────────────────────────────────────

  closeVisit(): void {
    if (!this.visitId) {
      return;
    }
    this.closeVisitForm = {
      outcome: 'COMPLETED',
      note: '',
    };
    this.showCloseVisitModal = true;
    this.openCv2ModalLayer();
  }

  closeCloseVisitModal(): void {
    if (this.isUpdatingClientVisit) {
      return;
    }
    this.showCloseVisitModal = false;
    this.restoreBodyScrollUnlessModalOpen();
  }

  confirmCloseVisit(): void {
    if (!this.visitId) {
      return;
    }
    this.isUpdatingClientVisit = true;
    const outcome = String(this.closeVisitForm.outcome || 'COMPLETED').trim();
    const note = String(this.closeVisitForm.note || '').trim();
    this.api
      .updateVisitStatus(this.visitId, {
        visitStatus: 'closed',
        closeOutcome: outcome,
        dischargeOutcome: outcome,
        closingNote: note || undefined,
      })
      .subscribe({
      next: (response: any) => {
        this.isUpdatingClientVisit = false;
        this.showCloseVisitModal = false;
        this.visit = response?.data ?? this.visit;
        this.visitStatus = this.visit?.visitStatus || 'closed';
        this.isOpenVisit = false;
        this.isClosedVisit = true;
        this.restoreBodyScrollUnlessModalOpen();
        this.showStatusMessage(response?.message || 'Visit closed.', 'success');
        if (this.clientId) {
          this.loadClientVisits(this.clientId);
        }
        if (response?.data) {
          this.loadVisit(response.data);
        }
      },
      error: (err) => {
        this.isUpdatingClientVisit = false;
        this.showStatusMessage(err?.error?.message || 'Could not close visit.', 'error');
      },
      });
  }

  openVisitAction(): void {
    if (!this.canOpenClosedVisit) {
      this.showStatusMessage('You do not have permission to open a closed visit.', 'error');
      return;
    }
    if (!this.visitId) {
      this.openCreateVisitModal();
      return;
    }
    this.isUpdatingClientVisit = true;
    this.api.updateVisitStatus(this.visitId, { visitStatus: 'open' }).subscribe({
      next: (response: any) => {
        this.isUpdatingClientVisit = false;
        this.visit = response?.data ?? this.visit;
        this.visitStatus = this.visit?.visitStatus || 'open';
        this.isOpenVisit = true;
        this.isClosedVisit = false;
        this.showStatusMessage(response?.message || 'Visit opened.', 'success');
        if (this.clientId) {
          this.loadClientVisits(this.clientId);
        }
        if (response?.data) {
          this.loadVisit(response.data);
        }
      },
      error: (err) => {
        this.isUpdatingClientVisit = false;
        this.showStatusMessage(err?.error?.message || 'Could not open visit.', 'error');
      },
    });
  }

  refreshTotalDebt(): void {
    this.refreshClientTotalDebt();
  }

  // ── Pay all debt modal ──────────────────────────────────────────────

  openPayAllClientDebtModal(): void {
    if (!this.clientId) {
      this.showStatusMessage('Select a client first.', 'error');
      return;
    }
    this.payAllDebtMessage = '';
    this.payAllDebtMessageOk = false;
    this.payAllDebtResult = null;
    this.payAllDebtForm = {
      amountToPay: this.getDefaultPayAllDebtAmount(),
      paymentForm: 'Cash At Hand',
      notes: 'Pay all client debt',
    };
    this.payAllDebtAllocation = [];
    this.payAllDebtLoading = true;
    this.showPayAllDebtModal = true;
    this.openCv2ModalLayer();

    this.api.getInitialTriageVitalsForVisitId(this.clientId).subscribe({
      next: (visits) => {
        this.payAllDebtVisits = this.sortVisitsOldestFirst(Array.isArray(visits) ? visits : []);
        this.payAllDebtForm.amountToPay = this.getDefaultPayAllDebtAmount();
        this.payAllDebtLoading = false;
        this.rebuildPayAllDebtAllocation();
        if (this.payAllDebtTotalOutstanding() <= 0) {
          this.payAllDebtForm.amountToPay = null;
          this.payAllDebtAllocation = [];
        }
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
    this.restoreBodyScrollUnlessModalOpen();
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
    const amount = Number(this.payAllDebtForm.amountToPay);
    if (!this.clientId) {
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
      this.payAllDebtMessage = 'No outstanding visit balances found for this client.';
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
      receivedBy: (this.userName || sessionStorage.getItem('username') || '').trim(),
    };

    this.api.payAllClientDebt(this.clientId, payload).subscribe({
      next: (res: any) => {
        this.payAllDebtSaving = false;
        this.payAllDebtMessageOk = true;
        this.payAllDebtResult = res?.data ?? null;
        this.payAllDebtMessage =
          res?.message ||
          `Payment applied across ${this.payAllDebtResult?.allocations?.length ?? 0} visit(s).`;
        this.refreshClientTotalDebt();
        if (this.visitId) {
          this.loadInvoice();
        }
        if (this.clientId) {
          this.loadClientVisits(this.clientId);
        }
        this.showStatusMessage(this.payAllDebtMessage, 'success');
      },
      error: (err) => {
        this.payAllDebtSaving = false;
        this.payAllDebtMessageOk = false;
        this.payAllDebtMessage =
          err?.error?.message || err?.error?.data?.message || 'Could not apply client debt payment.';
        if (this.isPayAllDebtNoOutstandingMessage(this.payAllDebtMessage)) {
          this.payAllDebtAllocation = [];
          this.payAllDebtForm.amountToPay = null;
        }
      },
    });
  }

  // ── Vitals workflow ─────────────────────────────────────────────────

  openVitalsModal(): void {
    if (!this.visitId) {
      this.showStatusMessage('Select a visit first.', 'error');
      return;
    }
    this.clearVitalsForm();
    this.showVitalsModal = true;
    this.openCv2ModalLayer();
  }

  closeVitalsModal(): void {
    this.showVitalsModal = false;
    this.clearVitalsForm();
    this.restoreBodyScrollUnlessModalOpen();
  }

  submitVitals(): void {
    if (!this.visitId || this.isSavingVital) {
      return;
    }
    const data = this.prepareVitalPayload({ ...this.currentVital, station: this.vitalStation });
    if (!this.hasAnyVitalMeasurement(data)) {
      this.showStatusMessage('Enter at least one vital measurement before saving.', 'error');
      return;
    }

    this.isSavingVital = true;
    const request$ =
      this.vitalSaveStatus === 'Update Vitals' && this.editingVitalId
        ? this.api.updateVital(this.editingVitalId, data)
        : this.api.takeVitals(this.visitId, data);

    request$.subscribe({
      next: (response: any) => {
        this.isSavingVital = false;
        this.showStatusMessage(response?.message || 'Vitals saved.', 'success');
        this.closeVitalsModal();
        this.loadVitals();
        this.loadInvoice();
        if (this.clientId) {
          this.loadClientVisits(this.clientId);
        }
      },
      error: (err) => {
        this.isSavingVital = false;
        this.showStatusMessage(err?.error?.message || 'Could not save vitals.', 'error');
      },
    });
  }

  editVital(vital: any): void {
    if (!vital) {
      return;
    }
    this.closeVitalsActionMenu();
    this.editingVitalId = Number(vital.id) || null;
    this.vitalSaveStatus = 'Update Vitals';
    this.vitalStation = vital.station || 'Triage';
    this.currentVital = {
      temperature: vital.temperature ?? null,
      diastolic: vital.diastolic ?? null,
      systolic: vital.systolic ?? null,
      pulseRate: vital.pulseRate ?? null,
      spO2: vital.spO2 ?? null,
      heartRate: vital.heartRate ?? null,
      respiratoryRate: vital.respiratoryRate ?? null,
      weight: vital.weight ?? null,
      height: vital.height ?? null,
      muac: vital.muac ?? null,
      dateTaken: this.normalizeDateForInput(vital.dateTaken),
      timeTaken: this.normalizeTimeForInput(vital.timeTaken),
    };
    if (this.currentVital.muac == null || this.currentVital.muac === '') {
      this.syncAutoMuacFromWeightHeight();
    }
    this.showVitalsModal = true;
    this.openCv2ModalLayer();
  }

  deleteVital(vital: any): void {
    this.closeVitalsActionMenu();
    const id = Number(vital?.id);
    if (!id) {
      return;
    }
    this.vitalPendingDelete = vital;
    this.showVitalsDeleteModal = true;
    this.openCv2ModalLayer();
  }

  closeVitalsDeleteModal(): void {
    if (this.isDeletingVital) {
      return;
    }
    this.showVitalsDeleteModal = false;
    this.vitalPendingDelete = null;
    this.restoreBodyScrollUnlessModalOpen();
  }

  confirmDeleteVital(): void {
    const id = Number(this.vitalPendingDelete?.id);
    if (!id || this.isDeletingVital) {
      return;
    }
    this.isDeletingVital = true;
    this.api.deleteVitalById(id).subscribe({
      next: (response: any) => {
        this.isDeletingVital = false;
        this.showVitalsDeleteModal = false;
        this.vitalPendingDelete = null;
        this.restoreBodyScrollUnlessModalOpen();
        this.showStatusMessage(response?.message || 'Vital deleted.', 'success');
        if (this.editingVitalId === id) {
          this.closeVitalsModal();
        }
        this.loadVitals();
      },
      error: (err) => {
        this.isDeletingVital = false;
        this.showStatusMessage(err?.error?.message || 'Could not delete vital.', 'error');
      },
    });
  }

  toggleVitalsActionMenu(vital: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const id = vital?.id;
    if (id == null) {
      return;
    }
    const isOpen =
      this.vitalsActionMenuId === id || String(this.vitalsActionMenuId) === String(id);
    this.closePharmacyActionMenu();
    this.closePaymentActionMenu();
    if (isOpen) {
      this.closeVitalsActionMenu();
      return;
    }
    const trigger = (event.currentTarget as HTMLElement) || null;
    const rect = trigger?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const popWidth = 140;
    const popHeight = 96;
    const gap = 4;
    let top = rect.bottom + gap;
    if (top + popHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - popHeight - gap);
    }
    let left = rect.right - popWidth;
    if (left < 8) {
      left = 8;
    }
    if (left + popWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - popWidth - 8);
    }
    this.vitalsActionMenuId = id;
    this.vitalsActionMenuVital = vital;
    this.vitalsActionMenuStyle = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      right: 'auto',
      bottom: 'auto',
      zIndex: '200150',
    };
    setTimeout(() => this.attachVitalsActionMenuToBody(), 0);
  }

  isVitalsActionMenuOpen(vital: any): boolean {
    const id = vital?.id;
    if (id == null || this.vitalsActionMenuId == null) {
      return false;
    }
    return this.vitalsActionMenuId === id || String(this.vitalsActionMenuId) === String(id);
  }

  private closeVitalsActionMenu(): void {
    this.vitalsActionMenuId = null;
    this.vitalsActionMenuVital = null;
    this.vitalsActionMenuStyle = {};
  }

  private attachVitalsActionMenuToBody(): void {
    const menu =
      this.vitalsActionMenuPop?.nativeElement ||
      (document.querySelector('.cv2-action-menu-pop--portaled') as HTMLElement | null);
    if (!menu || !this.vitalsActionMenuVital) {
      return;
    }
    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }
  }

  clearVitalsForm(): void {
    this.vitalStation = 'Triage';
    this.vitalSaveStatus = 'Save Vitals';
    this.editingVitalId = null;
    this.currentVital = this.emptyVitalForm();
  }

  formatShockIndexDisplay(index: number | null): string {
    return index == null ? '—' : index.toFixed(2);
  }

  pulsePressureForVital(vital: any): number | null {
    return computePulsePressure(vital);
  }

  formatPulsePressureDisplay(vital: any): string {
    return formatPulsePressureUtil(vital?.pulsePressure ?? vital);
  }

  shockIndexForVital(vital: any): number | null {
    return this.computeShockIndex(vital);
  }

  onVitalAnthropometryChange(): void {
    this.syncAutoMuacFromWeightHeight();
  }

  vitalToneClass(tone: VitalTone | null | undefined): { [klass: string]: boolean } {
    return {
      'cv2-vital-tone': !!tone,
      'cv2-vital-tone--normal': tone === 'normal',
      'cv2-vital-tone--warning': tone === 'warning',
      'cv2-vital-tone--critical': tone === 'critical',
    };
  }

  bpToneForVital(vital: any): VitalTone | null {
    return this.getBpTone(vital?.systolic, vital?.diastolic);
  }

  shockToneForVital(vital: any): VitalTone | null {
    return this.getShockIndexTone(this.computeShockIndex(vital));
  }

  /** Prefer stored MUAC; otherwise estimate from weight/height for display & color. */
  resolveVitalMuac(vital: any): number | null {
    const stored = Number(vital?.muac);
    if (Number.isFinite(stored) && stored > 0) {
      return Math.round(stored * 10) / 10;
    }
    const bmi = this.computeVitalBmi(vital);
    if (bmi == null) {
      return null;
    }
    return this.estimateMuacFromBmi(bmi);
  }

  muacToneForVital(vital: any): VitalTone | null {
    return this.getMuacTone(this.resolveVitalMuac(vital));
  }

  bmiToneForVital(vital: any): VitalTone | null {
    return this.getBmiTone(this.computeVitalBmi(vital));
  }

  formatVitalBmiDisplay(vital: any): string {
    const bmi = this.computeVitalBmi(vital);
    return bmi == null ? '—' : String(bmi);
  }

  formatVitalMuacDisplay(vital: any): string {
    const muac = this.resolveVitalMuac(vital);
    return muac == null ? '—' : String(muac);
  }

  formatVitalBloodPressure(vital: any): string {
    const sys = vital?.systolic;
    const dia = vital?.diastolic;
    if (sys != null && dia != null) {
      return `${sys}/${dia}`;
    }
    return vital?.bloodPressure || '—';
  }

  formatVitalDateTime(vital: any): string {
    const ds = this.formatVitalDateOnly(vital?.dateTaken);
    const ts = this.formatVitalTimeOnly(vital?.timeTaken);
    if (ds && ts) {
      return `${ds} · ${ts}`;
    }
    return ds || ts || '—';
  }

  private formatVitalDateOnly(value: any): string {
    if (value == null || String(value).trim() === '') {
      return '';
    }
    if (typeof value === 'object' && value.year != null && value.month != null && value.day != null) {
      return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
    }
    const raw = String(value).trim();
    const slashMatch = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (slashMatch) {
      return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
    }
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return raw.includes('T') ? raw.split('T')[0] : raw;
  }

  private formatVitalTimeOnly(value: any): string {
    if (value == null || String(value).trim() === '') {
      return '';
    }
    const raw = String(value).trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/);
    if (match) {
      return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
    }
    if (raw.includes('T')) {
      const timePart = raw.split('T')[1] || '';
      const tMatch = timePart.match(/^(\d{1,2}):(\d{2})/);
      if (tMatch) {
        return `${String(tMatch[1]).padStart(2, '0')}:${tMatch[2]}`;
      }
    }
    return raw;
  }

  // ── Services workflow ───────────────────────────────────────────────

  openServiceModal(): void {
    if (!this.visitId) {
      this.showStatusMessage('Select a visit first.', 'error');
      return;
    }
    this.clearServiceForm();
    this.loadProcedureCatalog();
    this.showServiceModal = true;
    this.openCv2ModalLayer();
  }

  closeServiceModal(): void {
    this.showServiceModal = false;
    this.serviceDropdownOpen = false;
    this.orderedByDropdownOpen = false;
    this.clearServiceForm();
    this.restoreBodyScrollUnlessModalOpen();
  }

  toggleServiceDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.orderedByDropdownOpen = false;
    if (this.serviceDropdownOpen) {
      this.serviceDropdownOpen = false;
      return;
    }
    this.procedureSearch = '';
    this.serviceDropdownOpen = true;
    this.loadProcedureCatalog();
    setTimeout(() => this.serviceSearchInput?.nativeElement?.focus(), 0);
  }

  toggleOrderedByDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.serviceDropdownOpen = false;
    this.orderedByDropdownOpen = !this.orderedByDropdownOpen;
  }

  selectOrderedBy(value: string, event?: Event): void {
    event?.stopPropagation();
    this.serviceForm.orderedBy = value;
    this.orderedByDropdownOpen = false;
  }

  selectServiceProcedure(procedure: any, event?: Event): void {
    event?.stopPropagation();
    if (!procedure?.id) {
      return;
    }
    this.selectedProcedureId = Number(procedure.id);
    this.selectedProcedureLabel = String(procedure.procedureName || procedure.name || 'Service');
    this.currentServiceProcedureUnitCost =
      procedure.unitCostPrice != null && procedure.unitCostPrice !== ''
        ? Number(procedure.unitCostPrice)
        : null;
    this.serviceDropdownOpen = false;
    this.procedureSearch = '';
    this.refreshServiceUnitSellingMode(procedure);
  }

  /** After procedure pick: load unit sell models and prefer Compassion pricing when client group uses it. */
  private refreshServiceUnitSellingMode(procedure: any): void {
    const procedureId = Number(procedure?.id);
    const preferredModelId = procedure?.unitSellingModelId ?? null;
    const directPrice =
      Number(procedure?.unitSellingPrice ?? procedure?.sellingPrice ?? 0) || 0;

    if (!Number.isFinite(procedureId) || procedureId <= 0) {
      this.selectedServiceUnitSellingModelId = null;
      this.serviceForm.unitSellingPrice = directPrice || null;
      return;
    }

    this.api
      .getProcedureUnitSellingModels(procedureId, this.currentServiceProcedureUnitCost)
      .subscribe({
        next: (rows) => {
          const models = Array.isArray(rows) ? rows : [];
          if (!models.length) {
            this.selectedServiceUnitSellingModelId = null;
            this.serviceForm.unitSellingPrice = directPrice || null;
            return;
          }
          const selected = this.pickPharmacyUnitSellingModel(models, preferredModelId);
          this.selectedServiceUnitSellingModelId = selected?.id ?? null;
          this.serviceForm.unitSellingPrice =
            Number(selected?.unitSellingPrice) || directPrice || null;
        },
        error: () => {
          this.selectedServiceUnitSellingModelId = null;
          this.serviceForm.unitSellingPrice = directPrice || null;
        },
      });
  }

  onServiceUnitSellingModelPriceChange(price: number): void {
    this.serviceForm.unitSellingPrice = Number(price) || 0;
  }

  submitServiceRequest(): void {
    if (!this.visitId || this.isSavingService) {
      return;
    }
    if (!this.selectedProcedureId) {
      this.showStatusMessage('Select a service or procedure first.', 'error');
      return;
    }

    const orderedBy = (
      this.serviceForm.orderedBy ||
      this.userName ||
      sessionStorage.getItem('username') ||
      ''
    ).trim();
    if (!orderedBy) {
      this.showStatusMessage('No logged-in user found; cannot set ordered by.', 'error');
      return;
    }

    const requestData = {
      procedureId: this.selectedProcedureId,
      quantity: 1,
      unitSellingPrice: this.serviceForm.unitSellingPrice,
      orderedBy,
      indication: this.serviceForm.indication?.trim() || null,
      doneBy: orderedBy,
    };

    this.isSavingService = true;
    this.api.saveProcedure(this.visitId, requestData).subscribe({
      next: (response: any) => {
        this.isSavingService = false;
        this.showStatusMessage(response?.message || 'Service requested.', 'success');
        this.closeServiceModal();
        this.loadServices();
        this.loadInvoice();
      },
      error: (err) => {
        this.isSavingService = false;
        this.showStatusMessage(err?.error?.message || 'Could not request service.', 'error');
      },
    });
  }

  deleteServiceRequest(item: any): void {
    this.closeServiceActionMenu();
    if (!this.isServiceDeletable(item)) {
      this.showStatusMessage('Only pending service requests can be deleted.', 'error');
      return;
    }
    const id = Number(item?.id ?? item?.procedureRequestedId);
    if (!Number.isFinite(id) || id <= 0) {
      this.showStatusMessage('Could not identify this service request.', 'error');
      return;
    }
    this.servicePendingDelete = item;
    this.showServiceDeleteModal = true;
    this.openCv2ModalLayer();
  }

  closeServiceDeleteModal(): void {
    if (this.isDeletingService) {
      return;
    }
    this.showServiceDeleteModal = false;
    this.servicePendingDelete = null;
    this.restoreBodyScrollUnlessModalOpen();
  }

  confirmDeleteServiceRequest(): void {
    const id = Number(this.servicePendingDelete?.id ?? this.servicePendingDelete?.procedureRequestedId);
    if (!Number.isFinite(id) || id <= 0 || this.isDeletingService) {
      return;
    }
    this.isDeletingService = true;
    this.api.deleteProcedureRequestById(id).subscribe({
      next: (response: any) => {
        this.isDeletingService = false;
        this.showServiceDeleteModal = false;
        this.servicePendingDelete = null;
        this.restoreBodyScrollUnlessModalOpen();
        this.showStatusMessage(response?.message || 'Service removed.', 'success');
        this.loadServices();
        this.loadInvoice();
      },
      error: (err) => {
        this.isDeletingService = false;
        this.showStatusMessage(err?.error?.message || 'Could not remove service.', 'error');
      },
    });
  }

  getProcedureParentCategory(item: any): string {
    const direct = (
      item?.categoryParent ||
      item?.parentCategoryName ||
      item?.parentCategory ||
      item?.procedure?.categoryParent ||
      item?.procedure?.parentCategoryName ||
      ''
    ).toString().trim();
    if (direct) {
      return direct;
    }

    const procedureId = Number(item?.procedureId ?? item?.procedure?.id);
    if (!Number.isFinite(procedureId) || procedureId <= 0) {
      return '—';
    }
    const catalog = (this.procedureCatalog || []).find(
      (p) => Number(p?.id) === procedureId || Number(p?.procedureId) === procedureId
    );
    const fromCatalog = (
      catalog?.categoryParent ||
      catalog?.parentCategoryName ||
      catalog?.parentCategory ||
      ''
    ).toString().trim();
    return fromCatalog || '—';
  }

  serviceLineTotalCost(item: any): number {
    const qty = Number(item?.quantity ?? 1) || 1;
    const unitCost = Number(item?.unitCostPrice ?? item?.cost ?? item?.price ?? 0) || 0;
    return qty * unitCost;
  }

  serviceStatusLabel(item: any): string {
    const raw = (item?.status || item?.procedureStatus || 'requested').toString().trim();
    if (!raw) {
      return 'Requested';
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }

  isServiceDeletable(item: any): boolean {
    const s = (item?.status || item?.procedureStatus || 'pending').toString().trim().toLowerCase();
    return (
      !s ||
      s === 'pending' ||
      s === 'requested' ||
      s === 'ordered' ||
      s === 'waiting'
    );
  }

  serviceStatusPillClass(item: any): string {
    const s = (item?.status || item?.procedureStatus || 'requested').toString().trim().toLowerCase();
    if (
      s === 'done' ||
      s === 'completed' ||
      s === 'complete' ||
      s === 'reported' ||
      s === 'approved' ||
      s === 'resulted'
    ) {
      return 'cv2-pill--success';
    }
    if (s === 'cancelled' || s === 'canceled' || s === 'rejected' || s === 'failed') {
      return 'cv2-pill--danger';
    }
    if (s === 'in progress' || s === 'in-progress' || s === 'processing' || s === 'ongoing') {
      return 'cv2-pill--info';
    }
    if (s === 'pending' || s === 'requested' || s === 'ordered' || s === 'waiting') {
      return 'cv2-pill--warning';
    }
    return 'cv2-pill--info';
  }

  getContrastColor(bgColor: string): string {
    if (!bgColor) {
      return '#ffffff';
    }
    let r = 0;
    let g = 0;
    let b = 0;
    if (bgColor.startsWith('#')) {
      const hex = bgColor.replace('#', '');
      if (hex.length >= 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
    } else if (bgColor.startsWith('rgb')) {
      const matches = bgColor.match(/\d+/g);
      if (matches && matches.length >= 3) {
        r = parseInt(matches[0], 10);
        g = parseInt(matches[1], 10);
        b = parseInt(matches[2], 10);
      }
    } else {
      return '#ffffff';
    }
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#000000' : '#ffffff';
  }

  toggleServiceActionMenu(item: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const id = item?.id ?? item?.procedureRequestedId;
    if (id == null) {
      return;
    }
    const isOpen =
      this.serviceActionMenuId === id || String(this.serviceActionMenuId) === String(id);
    this.closeVitalsActionMenu();
    this.closePaymentActionMenu();
    this.closePharmacyActionMenu();
    this.serviceActionMenuId = null;
    if (isOpen) {
      return;
    }
    this.serviceActionMenuId = id;
    this.serviceActionMenuItem = item;
    const trigger = (event.currentTarget as HTMLElement) || null;
    const rect = trigger?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const popWidth = 140;
    const popHeight = 96;
    const gap = 4;
    let top = rect.bottom + gap;
    if (top + popHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - popHeight - gap);
    }
    let left = rect.right - popWidth;
    if (left < 8) {
      left = 8;
    }
    if (left + popWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - popWidth - 8);
    }
    this.serviceActionMenuStyle = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      right: 'auto',
      bottom: 'auto',
      zIndex: '200150',
    };
    setTimeout(() => this.attachServiceActionMenuToBody(), 0);
  }

  isServiceActionMenuOpen(item: any): boolean {
    const id = item?.id ?? item?.procedureRequestedId;
    if (id == null || this.serviceActionMenuId == null) {
      return false;
    }
    return this.serviceActionMenuId === id || String(this.serviceActionMenuId) === String(id);
  }

  private closeServiceActionMenu(): void {
    this.serviceActionMenuId = null;
    this.serviceActionMenuItem = null;
  }

  private attachServiceActionMenuToBody(): void {
    const menu = document.querySelector('.cv2-service-action-menu-pop--portaled') as HTMLElement | null;
    if (!menu || !this.serviceActionMenuItem) {
      return;
    }
    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }
    Object.assign(menu.style, this.serviceActionMenuStyle);
  }

  openServiceDetailsModal(item: any, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.closeServiceActionMenu();
    this.serviceDetailsItem = item || null;
    this.showServiceDetailsModal = true;
    this.openCv2ModalLayer();
  }

  closeServiceDetailsModal(): void {
    this.showServiceDetailsModal = false;
    this.serviceDetailsItem = null;
    this.restoreBodyScrollUnlessModalOpen();
  }

  openServiceWhenModal(item: any, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.closeServiceActionMenu();
    this.serviceWhenItem = item || null;
    this.showServiceWhenModal = true;
    this.openCv2ModalLayer();
  }

  closeServiceWhenModal(): void {
    this.showServiceWhenModal = false;
    this.serviceWhenItem = null;
    this.restoreBodyScrollUnlessModalOpen();
  }

  openServiceProcedureResults(item: any): void {
    if (!item?.id) {
      this.showStatusMessage('Could not open results for this service.', 'error');
      return;
    }

    this.selectedProcedureResult = item;
    this.procedureResultsLabReportTitle = '';
    this.showResultGeneralForm = false;
    this.showResultMrdtForm = false;
    this.showResultUrinalysisForm = false;
    this.showResultCbcForm = false;
    this.showResultParasitologyStoolForm = false;
    this.showResultScanForm = false;
    this.generalResult = { result: '', notes: '', recommendation: '' };
    this.mrdtResult = { bs: '', mrdt: '', notes: '', recommendation: '', result: '' };
    this.urinalysisResult = {};
    this.parasitologyStoolResult = {};
    this.scanResult = { indication: '', findings: '', impression: '', exam: '' };
    this.cbcResult = {};
    this.cbcInterpretation = {};

    const category = (item.category || '').toString().toLowerCase().trim();
    const requestName = normalizeProcedureRequestedNameForLabRouting(item);

    if (category === 'imaging' || isUltrasoundScanCategoryProcedure(item)) {
      this.showResultScanForm = true;
      this.loadScanResultsForModal(item.id);
    } else if (category === 'malaria test' || getProcedureReportKindForPdf(item) === 'mrdt') {
      this.showResultMrdtForm = true;
      this.loadMrdtResultsForModal(item.id);
    } else if (isUrinalysisProcedureName(requestName)) {
      this.showResultUrinalysisForm = true;
      this.loadUrinalysisResultsForModal(item.id);
    } else if (requestName === 'cbc' || requestName.includes('cbc')) {
      this.showResultCbcForm = true;
      this.loadCbcResultsForModal(item.id);
    } else if (
      requestName === 'parasitology stool' ||
      requestName === 'parasitologystool' ||
      requestName.includes('parasitology stool')
    ) {
      this.showResultParasitologyStoolForm = true;
      this.loadParasitologyStoolResultsForModal(item.id);
    } else {
      this.showResultGeneralForm = true;
      this.loadGeneralLabResultsForModal(item.id);
    }

    this.showServiceResultsModal = true;
    this.openCv2ModalLayer();
  }

  closeServiceResultsModal(): void {
    this.showServiceResultsModal = false;
    this.selectedProcedureResult = null;
    this.isLoadingProcedureResults = false;
    this.restoreBodyScrollUnlessModalOpen();
  }

  printServiceResultsFromModal(): void {
    const id = this.selectedProcedureResult?.id;
    if (id == null) {
      return;
    }
    this.printScanResults(id);
  }

  private setProcedureResultsLabReportTitleFromReport(report: any): void {
    const t = report?.labReportTitle;
    this.procedureResultsLabReportTitle =
      t != null && String(t).trim() !== '' ? String(t).trim() : '';
  }

  private loadScanResultsForModal(requestId: number | string): void {
    this.isLoadingProcedureResults = true;
    this.api.getScanReportByRequestId(Number(requestId)).subscribe({
      next: (res: any) => {
        this.isLoadingProcedureResults = false;
        const report = res?.data ?? res ?? {};
        this.setProcedureResultsLabReportTitleFromReport(report);
        this.scanResult = {
          indication: report.indication || '',
          findings: report.findings || report.result || report.report || '',
          impression: report.impression || '',
          exam: report.exam || report.scanReportTitle || '',
        };
      },
      error: () => {
        this.isLoadingProcedureResults = false;
        this.showStatusMessage('Could not load scan results.', 'error');
      },
    });
  }

  private loadMrdtResultsForModal(requestId: number | string): void {
    this.isLoadingProcedureResults = true;
    this.api.getLabReportByRequestId(Number(requestId)).subscribe({
      next: (res: any) => {
        this.isLoadingProcedureResults = false;
        const report = res?.data ?? res ?? {};
        this.setProcedureResultsLabReportTitleFromReport(report);
        this.mrdtResult = {
          bs: report.bs || '',
          mrdt: report.mrdt || '',
          notes: report.notes || '',
          recommendation: report.recommendation || '',
          result: report.result || report.report || report.findings || '',
        };
      },
      error: () => {
        this.isLoadingProcedureResults = false;
        this.showStatusMessage('Could not load malaria results.', 'error');
      },
    });
  }

  private loadGeneralLabResultsForModal(requestId: number | string): void {
    this.isLoadingProcedureResults = true;
    this.api.getGeneralLabReportByRequestId(Number(requestId)).subscribe({
      next: (res: any) => {
        this.isLoadingProcedureResults = false;
        const report = res?.data ?? res ?? {};
        this.setProcedureResultsLabReportTitleFromReport(report);
        this.generalResult = {
          result: report.result || report.report || report.findings || '',
          notes: report.notes || '',
          recommendation: report.recommendation || '',
        };
      },
      error: () => {
        this.isLoadingProcedureResults = false;
        this.showStatusMessage('Could not load lab results.', 'error');
      },
    });
  }

  private loadUrinalysisResultsForModal(requestId: number | string): void {
    this.isLoadingProcedureResults = true;
    this.api.getUrinalysisReportByRequestId(Number(requestId)).subscribe({
      next: (res: any) => {
        this.isLoadingProcedureResults = false;
        const report = res?.data ?? res ?? {};
        this.setProcedureResultsLabReportTitleFromReport(report);
        this.urinalysisResult = {
          ph: report.ph || '',
          sg: report.sg || '',
          protein: report.protein || '',
          glucose: report.glucose || '',
          ketones: report.ketones || '',
          blood: report.blood || '',
          bilirubin: report.bilirubin || '',
          urobilinogen: report.urobilinogen || '',
          nitrite: report.nitrite || '',
          leukocyteE: report.leukocyteE || report.leukocyte || '',
          epithelialCells: report.epithelialCells || '',
          pusCellsWbcs: report.pusCellsWbcs || '',
          casts: report.casts || '',
          redCells: report.redCells || '',
          crystals: report.crystals || '',
          others: report.others || report.microscopicOthers || '',
          color: report.color || '',
          appearance: report.appearance || '',
          volume: report.volume || '',
        };
      },
      error: () => {
        this.isLoadingProcedureResults = false;
        this.showStatusMessage('Could not load urinalysis results.', 'error');
      },
    });
  }

  private loadCbcResultsForModal(requestId: number | string): void {
    this.isLoadingProcedureResults = true;
    this.api.getCbcReportByRequestId(Number(requestId)).subscribe({
      next: (res: any) => {
        this.isLoadingProcedureResults = false;
        const report = res?.data ?? res ?? {};
        this.setProcedureResultsLabReportTitleFromReport(report);
        this.cbcResult = {
          wbc: report.wbc || '',
          lymph: report.lymph || '',
          mid: report.mid || '',
          gran: report.gran || '',
          lymphPercent: report.lymphPercent || report.lymphPct || '',
          midPercent: report.midPercent || report.midPct || '',
          granPercent: report.granPercent || report.granPct || '',
          hgb: report.hgb || '',
          rbc: report.rbc || '',
          hct: report.hct || '',
          mcv: report.mcv || '',
          mch: report.mch || '',
          mchc: report.mchc || '',
          rdwCv: report.rdwCv || report.rdwCV || '',
          rdwSd: report.rdwSd || report.rdwSD || '',
          plt: report.plt || '',
          mpv: report.mpv || '',
          pdw: report.pdw || '',
          pct: report.pct || '',
        };
        this.refreshCbcReferenceRangesForView();
        const nextInterp: Record<string, string> = {};
        for (const field of this.cbcResultFields) {
          nextInterp[field.key] = buildCbcInterpretationForView(
            this.cbcResult[field.key],
            field.ref
          );
        }
        this.cbcInterpretation = nextInterp;
      },
      error: () => {
        this.isLoadingProcedureResults = false;
        this.showStatusMessage('Could not load CBC results.', 'error');
      },
    });
  }

  private refreshCbcReferenceRangesForView(): void {
    this.cbcResultFields = getCbcFieldsForClient(
      this.clientAge,
      this.clientDateOfBirth,
      this.clientGender
    );
    this.cbcRefCohortLabel = getCbcReferenceLabel(
      this.clientAge,
      this.clientDateOfBirth,
      this.clientGender
    );
  }

  private loadParasitologyStoolResultsForModal(requestId: number | string): void {
    this.isLoadingProcedureResults = true;
    this.api.getParasitologyStoolReportByRequestId(Number(requestId)).subscribe({
      next: (res: any) => {
        this.isLoadingProcedureResults = false;
        const report = res?.data ?? res ?? {};
        this.setProcedureResultsLabReportTitleFromReport(report);
        this.parasitologyStoolResult = {
          ova: report.ova || '',
          cysts: report.cysts || '',
          larvae: report.larvae || '',
          color: report.color || '',
          consistency: report.consistency || '',
          blood: report.blood || '',
          mucus: report.mucus || '',
          visibleParasites: report.visibleParasites || '',
          others: report.others || '',
        };
      },
      error: () => {
        this.isLoadingProcedureResults = false;
        this.showStatusMessage('Could not load parasitology results.', 'error');
      },
    });
  }

  printScanResults(id: number | string | null | undefined): void {
    const procedureId = Number(id);
    if (!Number.isFinite(procedureId) || procedureId <= 0 || this.isPrintingScanResults) {
      return;
    }
    this.isPrintingScanResults = true;
    this.api.exportScanResults(procedureId).subscribe({
      next: (res: Blob) => {
        this.isPrintingScanResults = false;
        const blob = new Blob([res], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'scan-results.pdf';
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isPrintingScanResults = false;
        this.showStatusMessage(err?.message || 'Could not export scan results.', 'error');
      },
    });
  }

  clearServiceForm(): void {
    this.selectedProcedureId = null;
    this.selectedProcedureLabel = 'Select service';
    this.selectedServiceUnitSellingModelId = null;
    this.currentServiceProcedureUnitCost = null;
    this.procedureSearch = '';
    this.serviceDropdownOpen = false;
    this.orderedByDropdownOpen = false;
    const orderedBy = (this.userName || sessionStorage.getItem('username') || '').trim();
    this.serviceForm = { unitSellingPrice: null, indication: '', orderedBy };
  }

  // ── Pharmacy workflow ───────────────────────────────────────────────

  openPharmacyModal(): void {
    if (!this.visitId) {
      this.showStatusMessage('Select a visit first.', 'error');
      return;
    }
    this.editingPharmacyTreatmentId = null;
    this.closePharmacyActionMenu();
    this.clearPharmacyForm();
    this.applyPharmacyTreatmentSourceFromBusinessSettings();
    this.loadPharmacyTreatmentSource();
    this.showPharmacyModal = true;
    this.openCv2ModalLayer();
  }

  closePharmacyModal(): void {
    this.showPharmacyModal = false;
    this.pharmacyDrugDropdownOpen = false;
    this.pharmacyDiagnosisDropdownOpen = false;
    this.editingPharmacyTreatmentId = null;
    this.clearPharmacyForm();
    this.restoreBodyScrollUnlessModalOpen();
  }

  openSundriesModal(): void {
    if (!this.visitId) {
      this.showStatusMessage('Select a visit first.', 'error');
      return;
    }
    this.closePharmacyActionMenu();
    this.applyPharmacyTreatmentSourceFromBusinessSettings();
    this.loadPharmacyTreatmentSource();
    this.loadVisitSundries();
    this.sundryBatchSearch = '';
    this.sundryForm = {
      stockRefId: null,
      quantity: 1,
    };
    this.showSundriesModal = true;
    this.openCv2ModalLayer();
  }

  closeSundriesModal(): void {
    if (this.isSavingSundry) {
      return;
    }
    this.showSundriesModal = false;
    this.sundryDropdownOpen = false;
    this.sundryBatchSearch = '';
    this.visitSundries = [];
    this.isLoadingSundries = false;
    this.isDeletingSundryId = null;
    this.sundryForm = {
      stockRefId: null,
      quantity: 1,
    };
    this.restoreBodyScrollUnlessModalOpen();
  }

  filteredSundryOptions(): any[] {
    const q = (this.sundryBatchSearch || '').trim().toLowerCase();
    const stockBatches = Array.isArray(this.pharmacyStockItemList) ? this.pharmacyStockItemList : [];
    const stockItems = Array.isArray(this.pharmacyItemList) ? this.pharmacyItemList : [];
    const source = this.pharmacyUseStockBatch
      ? stockBatches.filter((item) => this.sundryOptionStock(item) > 0)
      : stockItems.filter((item) => this.sundryOptionStock(item) > 0);
    return source
      .filter((item) => {
        if (!q) return true;
        const blob = [
          item?.title,
          item?.stockItemName,
          item?.itemName,
          item?.name,
          item?.plainName,
          item?.batchNumber != null ? String(item.batchNumber) : '',
          item?._stockBatchId != null ? String(item._stockBatchId) : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      })
      .sort((a, b) =>
        this.sundryBatchLabel(a).localeCompare(this.sundryBatchLabel(b), undefined, { sensitivity: 'base' })
      );
  }

  selectedSundryLabel(): string {
    const refId = Number(this.sundryForm.stockRefId);
    if (!Number.isFinite(refId) || refId <= 0) {
      return this.pharmacyUseStockBatch ? 'Select stock batch' : 'Select stock item';
    }
    const source = this.pharmacyUseStockBatch ? this.pharmacyStockItemList : this.pharmacyItemList;
    const selected = (Array.isArray(source) ? source : []).find(
      (item) => Number(this.sundryOptionValue(item)) === refId
    );
    return selected
      ? this.sundryBatchLabel(selected)
      : this.pharmacyUseStockBatch
        ? 'Select stock batch'
        : 'Select stock item';
  }

  toggleSundryDropdown(event: Event): void {
    event.stopPropagation();
    this.sundryDropdownOpen = !this.sundryDropdownOpen;
    if (!this.sundryDropdownOpen) {
      return;
    }
    if (this.pharmacyUseStockBatch) {
      this.refreshPharmacyGroupedStockItems(this.sundryBatchSearch);
      if (!this.pharmacyStockItemList.length && !this.isLoadingStock) {
        this.loadPharmacyStockBatches();
      }
    } else if (!this.pharmacyItemList.length && !this.isLoadingPharmacyItems) {
      this.loadPharmacyDrugList();
    }
    setTimeout(() => this.sundrySearchInput?.nativeElement?.focus(), 0);
  }

  onSundrySearchChange(): void {
    if (this.pharmacyUseStockBatch) {
      this.refreshPharmacyGroupedStockItems(this.sundryBatchSearch);
    }
  }

  selectSundryOption(item: any, event: Event): void {
    event.stopPropagation();
    if (!item || this.sundryOptionStock(item) <= 0) {
      return;
    }
    this.sundryForm.stockRefId = this.sundryOptionValue(item);
    this.sundryDropdownOpen = false;
  }

  sundryOptionValue(item: any): number | null {
    if (!item) return null;
    if (this.pharmacyUseStockBatch) {
      const batchId = Number(item?._stockBatchId ?? item?.id ?? 0);
      return Number.isFinite(batchId) && batchId > 0 ? batchId : null;
    }
    const itemId = Number(item?.id ?? item?.stockItemId ?? 0);
    return Number.isFinite(itemId) && itemId > 0 ? itemId : null;
  }

  sundryBatchLabel(item: any): string {
    if (!item) return '';
    if (!this.pharmacyUseStockBatch) {
      const name = String(item.itemName || item.stockItemName || item.name || item.plainName || item.title || 'Sundry item').toUpperCase();
      const qty = this.sundryOptionStock(item);
      const uom = String(item?.uintOfMeasure ?? item?.unitOfMeasure ?? 'unit(s)').trim();
      return `${name} — ${qty} ${uom}`;
    }
    return String(item.title || item.stockItemName || item.plainName || 'Stock batch');
  }

  sundryOptionStockLabel(item: any): string {
    const qty = this.sundryOptionStock(item);
    const uom = String(item?.uintOfMeasure ?? item?.unitOfMeasure ?? 'unit(s)').trim();
    return uom ? `Stock: ${qty} ${uom}` : `Stock: ${qty}`;
  }

  private sundryOptionStock(item: any): number {
    return Number(
      item?.stockAtHand ??
        item?.stock_at_hand ??
        item?.quantityOnHand ??
        item?.qtyOnHand ??
        item?.quantity ??
        item?.qty ??
        item?.stockQuantity ??
        0
    ) || 0;
  }

  submitSundryUsed(): void {
    if (!this.visitId) {
      this.showStatusMessage('Select a visit first.', 'error');
      return;
    }
    const refId = Number(this.sundryForm.stockRefId);
    const quantity = Number(this.sundryForm.quantity);
    if (!Number.isFinite(refId) || refId <= 0) {
      this.showStatusMessage(
        this.pharmacyUseStockBatch ? 'Select a stock batch first.' : 'Select a stock item first.',
        'error'
      );
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.showStatusMessage('Enter a valid quantity.', 'error');
      return;
    }
    const payload: { stockBatchId?: number; itemId?: number; quantity: number; usedBy?: string } = {
      quantity,
      usedBy: (this.userName || sessionStorage.getItem('username') || '').trim(),
    };
    if (this.pharmacyUseStockBatch) {
      payload.stockBatchId = refId;
    } else {
      payload.itemId = refId;
    }
    this.isSavingSundry = true;
    this.api
      .createVisitSundry(this.visitId, payload)
      .subscribe({
        next: (res: any) => {
          this.isSavingSundry = false;
          this.showStatusMessage(res?.message || 'Sundry item added.', 'success');
          this.loadVisitSundries();
          this.loadInvoice();
          this.sundryForm = {
            stockRefId: null,
            quantity: 1,
          };
          this.sundryBatchSearch = '';
        },
        error: (err: any) => {
          this.isSavingSundry = false;
          this.showStatusMessage(err?.error?.message || 'Could not add sundry item.', 'error');
        },
      });
  }

  private applyPharmacyTreatmentSourceFromBusinessSettings(): void {
    this.pharmacyUseStockBatch = this.facilityBranding.getPharmacyUseStockBatch();
  }

  private loadVisitSundries(): void {
    if (!this.visitId) {
      this.visitSundries = [];
      this.isLoadingSundries = false;
      return;
    }
    this.isLoadingSundries = true;
    this.api.getVisitSundriesByVisitId(this.visitId).subscribe({
      next: (res: any[]) => {
        this.visitSundries = Array.isArray(res) ? res : [];
        this.isLoadingSundries = false;
      },
      error: () => {
        this.visitSundries = [];
        this.isLoadingSundries = false;
      },
    });
  }

  sundryRowId(row: any): number | null {
    const id = Number(row?.id ?? row?.visitSundryId ?? row?.sundryId ?? null);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  sundryRowName(row: any): string {
    return String(
      row?.itemName ??
        row?.stockItemName ??
        row?.name ??
        row?.drugName ??
        row?.consumableName ??
        'Sundry item'
    );
  }

  sundryRowQuantity(row: any): number {
    return Number(row?.quantityUsed ?? row?.quantity ?? row?.qty ?? row?.usedQuantity ?? 0) || 0;
  }

  sundryRowCostPrice(row: any): number {
    return Number(row?.unitCostPrice ?? row?.costPrice ?? row?.unitCost ?? 0) || 0;
  }

  sundryRowSellingPrice(row: any): number {
    return Number(row?.unitSellingPrice ?? row?.sellingPrice ?? row?.unitPrice ?? row?.unitSell ?? 0) || 0;
  }

  sundryRowTotalCost(row: any): number {
    return this.sundryRowQuantity(row) * this.sundryRowCostPrice(row);
  }

  sundryRowTotalSell(row: any): number {
    const qty = this.sundryRowQuantity(row);
    const total = Number(row?.totalAmount ?? row?.lineTotal ?? row?.amount ?? 0);
    if (Number.isFinite(total) && total > 0) {
      return total;
    }
    return qty * this.sundryRowSellingPrice(row);
  }

  removeSundryUsed(row: any): void {
    const id = this.sundryRowId(row);
    if (!id || this.isDeletingSundryId != null) {
      return;
    }
    this.isDeletingSundryId = id;
    this.api.deleteVisitSundry(id).subscribe({
      next: (res: any) => {
        this.isDeletingSundryId = null;
        this.showStatusMessage(res?.message || 'Sundry item removed.', 'success');
        this.loadVisitSundries();
        this.loadInvoice();
      },
      error: (err: any) => {
        this.isDeletingSundryId = null;
        this.showStatusMessage(err?.error?.message || 'Could not remove sundry item.', 'error');
      },
    });
  }

  openTreatmentChartModal(): void {
    if (!this.visitId) {
      this.showStatusMessage('Select a visit first.', 'error');
      return;
    }
    this.showTreatmentChartModal = true;
  }

  onTreatmentChartClosed(): void {
    this.showTreatmentChartModal = false;
  }

  @HostListener('document:click', ['$event'])
  onPharmacyDrugDropdownDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (this.serviceActionMenuId != null && target && !target.closest('.cv2-action-menu-pop')) {
      this.closeServiceActionMenu();
    }
    if (this.vitalsActionMenuId != null && target && !target.closest('.cv2-action-menu-pop')) {
      this.closeVitalsActionMenu();
    }
    if (this.paymentActionMenuId != null && target && !target.closest('.cv2-action-menu-pop')) {
      this.closePaymentActionMenu();
    }
    if (this.orderDocActionMenuId != null && target && !target.closest('.cv2-action-menu-pop')) {
      this.closeOrderDocActionMenu();
    }
    if (this.pharmacyActionMenuId != null && target && !target.closest('.cv2-action-menu-pop')) {
      this.closePharmacyActionMenu();
    }
    if (this.serviceDropdownOpen && target && !target.closest('.cv2-pharmacy-drug-dropdown')) {
      this.serviceDropdownOpen = false;
    }
    if (this.orderedByDropdownOpen && target && !target.closest('.cv2-service-select')) {
      this.orderedByDropdownOpen = false;
    }
    if (!this.pharmacyDrugDropdownOpen) {
      // continue to diagnosis picker close check
    } else if (target && !target.closest('.cv2-pharmacy-drug-dropdown')) {
      this.pharmacyDrugDropdownOpen = false;
    }
    if (this.sundryDropdownOpen && target && !target.closest('.cv2-sundry-dropdown')) {
      this.sundryDropdownOpen = false;
    }
    if (
      this.pharmacyDiagnosisDropdownOpen &&
      target &&
      !target.closest('.cv2-dx-picker')
    ) {
      this.pharmacyDiagnosisDropdownOpen = false;
    }
    if (
      (this.pcPickerOpen || this.pePickerOpen || this.dxPickerOpen) &&
      !this.showCatalogEditor &&
      target &&
      !target.closest('.cv2-modern-picker')
    ) {
      this.closeModernPicker();
    }
  }

  togglePharmacyActionMenu(item: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const id = item?.id ?? item?.treatmentId;
    if (id == null) {
      return;
    }
    const isOpen =
      this.pharmacyActionMenuId === id || String(this.pharmacyActionMenuId) === String(id);
    this.closeVitalsActionMenu();
    this.closePaymentActionMenu();
    this.serviceActionMenuId = null;
    if (isOpen) {
      this.closePharmacyActionMenu();
      return;
    }
    const trigger = (event.currentTarget as HTMLElement) || null;
    const rect = trigger?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const popWidth = 140;
    const popHeight = 96;
    const gap = 4;
    let top = rect.bottom + gap;
    if (top + popHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - popHeight - gap);
    }
    let left = rect.right - popWidth;
    if (left < 8) {
      left = 8;
    }
    if (left + popWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - popWidth - 8);
    }
    this.pharmacyActionMenuId = id;
    this.pharmacyActionMenuItem = item;
    this.pharmacyActionMenuStyle = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      right: 'auto',
      bottom: 'auto',
      zIndex: '200150',
    };
    // Escape :host/.cv2-page overflow:hidden so last-row menus stay visible.
    setTimeout(() => this.attachPharmacyActionMenuToBody(), 0);
    setTimeout(() => this.attachPharmacyActionMenuToBody(), 32);
  }

  isPharmacyActionMenuOpen(item: any): boolean {
    const id = item?.id ?? item?.treatmentId;
    if (id == null || this.pharmacyActionMenuId == null) {
      return false;
    }
    return this.pharmacyActionMenuId === id || String(this.pharmacyActionMenuId) === String(id);
  }

  private closePharmacyActionMenu(): void {
    this.pharmacyActionMenuId = null;
    this.pharmacyActionMenuItem = null;
    this.pharmacyActionMenuStyle = {};
  }

  private attachPharmacyActionMenuToBody(): void {
    if (!this.pharmacyActionMenuItem) {
      return;
    }
    const el =
      this.pharmacyActionMenuPop?.nativeElement ||
      (document.getElementById('pharmacyActionMenuPop') as HTMLElement | null);
    if (!el) {
      return;
    }
    if (el.parentElement !== document.body) {
      document.body.appendChild(el);
    }
    const rect = el.getBoundingClientRect();
    if (rect.height > 0 && rect.bottom > window.innerHeight - 8) {
      const flippedTop = Math.max(8, window.innerHeight - rect.height - 8);
      this.pharmacyActionMenuStyle = {
        ...this.pharmacyActionMenuStyle,
        top: `${flippedTop}px`,
      };
    }
  }

  editPharmacyItem(item: any): void {
    this.closePharmacyActionMenu();
    if (!this.visitId || !item) {
      return;
    }
    const treatmentId = Number(item.id ?? item.treatmentId);
    if (!Number.isFinite(treatmentId) || treatmentId <= 0) {
      this.showStatusMessage('Could not edit this prescription.', 'error');
      return;
    }

    this.editingPharmacyTreatmentId = treatmentId;
    this.applyPharmacyTreatmentSourceFromBusinessSettings();
    this.loadPharmacyTreatmentSource();
    this.showPharmacyModal = true;
    this.openCv2ModalLayer();

    const drugName = item.itemName || item.drugName || item.stockItemName || 'Unknown Treatment';
    this.pharmacySelectedLabel = String(drugName);
    this.pharmacySelectedFullLabel = String(item.itemName || item.drugName || drugName);
    this.currentItemId = Number(item.itemId ?? item.stockItemId ?? item.item?.id) || null;
    this.currentStockBatchId =
      item.stockBatchId != null && item.stockBatchId !== ''
        ? Number(item.stockBatchId)
        : item.stock_batch_id != null
          ? Number(item.stock_batch_id)
          : null;
    this.unitBuy = Number(item.unitBuy ?? item.unitCostPrice ?? 0) || 0;
    this.unitOfMeasure = String(item.uintOfMeasure ?? item.unitOfMeasure ?? item.uom ?? '').trim();
    this.lastUnitValue = Number(item.lastUnitValue) > 0 ? Number(item.lastUnitValue) : 1;
    this.pharmacyForm = {
      quantity: Number(item.quantity) || 1,
      totalUnits: Number(item.totalUnits) || 1,
      estimatedUnits: Number(item.estimatedUnits ?? item.totalUnits) || 1,
      totalAmount: Number(item.totalAmount) || 0,
      durationValue: item.durationValue != null && item.durationValue !== '' ? Number(item.durationValue) : null,
      durationUnit: parseTreatmentPeriodUnitToDayFraction(item.durationUnit),
      frequencyValue: item.frequencyValue != null && item.frequencyValue !== '' ? Number(item.frequencyValue) : null,
      frequencyUnit: parseTreatmentPeriodUnitToDayFraction(item.frequencyUnit),
      amountPerFrequencyValue: Number(item.amountPerFrequencyValue) || 1,
      amountPerFrequencyUnit: String(item.amountPerFrequencyUnit || 'tablet'),
      instructions: String(item.instructions || ''),
      route: String(item.route || 'Oral'),
      diagnosisId: item.diagnosisId != null ? Number(item.diagnosisId) : null,
    };
    this.refreshPharmacyUnitSellingMode(item);
    this.calculatePharmacyTotal();
  }

  togglePharmacyDrugDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.pharmacyDrugDropdownOpen) {
      this.pharmacyDrugDropdownOpen = false;
      return;
    }
    this.openPharmacyDrugDropdown();
  }

  onPharmacyDrugSearchChange(): void {
    if (this.pharmacyUseStockBatch) {
      this.refreshPharmacyGroupedStockItems();
    }
  }

  isPharmacyTreatmentSourceLoading(): boolean {
    return this.pharmacyUseStockBatch ? this.isLoadingStock : this.isLoadingPharmacyItems;
  }

  pharmacyTreatmentSearchPlaceholder(): string {
    return this.pharmacyUseStockBatch ? 'Search stock batches…' : 'Search items…';
  }

  pharmacyTreatmentLoadingLabel(): string {
    return this.pharmacyUseStockBatch ? 'Loading stock batches…' : 'Loading items…';
  }

  pharmacyTreatmentEmptyLabel(): string {
    return this.pharmacyUseStockBatch ? 'No pharmacy stock batches found.' : 'No items found.';
  }

  private loadPharmacyTreatmentSource(): void {
    if (this.pharmacyUseStockBatch) {
      this.loadPharmacyStockBatches();
      return;
    }
    this.loadPharmacyDrugList();
  }

  private openPharmacyDrugDropdown(): void {
    this.pharmacyDiagnosisDropdownOpen = false;
    this.pharmacyDrugSearchText = '';
    if (this.pharmacyUseStockBatch) {
      this.refreshPharmacyGroupedStockItems();
      if (!this.pharmacyStockItemList.length && !this.isLoadingStock) {
        this.loadPharmacyStockBatches();
      }
    } else if (!this.pharmacyItemList.length && !this.isLoadingPharmacyItems) {
      this.loadPharmacyDrugList();
    }
    this.pharmacyDrugDropdownOpen = true;
    setTimeout(() => this.pharmacyDrugSearchInput?.nativeElement?.focus(), 0);
  }

  filteredPharmacyItemList(): any[] {
    if (!Array.isArray(this.pharmacyItemList)) {
      return [];
    }
    let filtered = this.pharmacyItemList.filter((item) => this.sundryOptionStock(item) > 0);
    if (this.pharmacyDrugSearchText?.trim()) {
      const q = this.pharmacyDrugSearchText.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const title = String(item?.title ?? item?.name ?? '').toLowerCase();
        if (title.includes(q)) {
          return true;
        }
        const blob = [
          item?.stockItemName,
          item?.itemName,
          item?.id != null ? String(item.id) : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      });
    }
    return filtered.sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0));
  }

  pharmacyTreatmentOptionLabel(item: any): string {
    const name = String(item?.title ?? item?.name ?? 'Unknown item').trim();
    const qty = item?.stockAtHand ?? item?.stock_at_hand ?? 0;
    const unit = String(item?.uintOfMeasure ?? item?.unitOfMeasure ?? '').trim();
    return unit ? `${name} — Stock: ${qty} ${unit}` : `${name} — Stock: ${qty}`;
  }

  pharmacyTreatmentOptionStock(item: any): string {
    const qty = item?.stockAtHand ?? item?.stock_at_hand ?? 0;
    const unit = String(item?.uintOfMeasure ?? item?.unitOfMeasure ?? '').trim();
    return unit ? `${qty} ${unit}` : String(qty);
  }

  get pharmacyDiagnosisPickerLabel(): string {
    const id = this.pharmacyForm.diagnosisId;
    if (id == null) {
      return 'No diagnosis (optional)';
    }
    const dx = (this.diagnosesList || []).find((row) => Number(row?.id) === Number(id));
    if (!dx) {
      return 'Selected diagnosis';
    }
    return this.formatDiagnosisStatement(dx) || 'Selected diagnosis';
  }

  get pharmacySelectedDiagnosisKind(): string {
    const id = this.pharmacyForm.diagnosisId;
    if (id == null) {
      return '';
    }
    const dx = (this.diagnosesList || []).find((row) => Number(row?.id) === Number(id));
    if (!dx) {
      return '';
    }
    return dx.kind === 'differential' ? 'Differential' : 'Final';
  }

  togglePharmacyDiagnosisDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.pharmacyDrugDropdownOpen = false;
    this.pharmacyDiagnosisDropdownOpen = !this.pharmacyDiagnosisDropdownOpen;
    if (this.pharmacyDiagnosisDropdownOpen && (!this.diagnosesList || !this.diagnosesList.length)) {
      this.loadDiagnoses();
    }
  }

  selectPharmacyDiagnosis(dx: any | null): void {
    this.pharmacyForm.diagnosisId = dx?.id != null ? Number(dx.id) : null;
    this.pharmacyDiagnosisDropdownOpen = false;
  }

  selectPharmacyBatch(item: any, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!item) {
      return;
    }
    if (Number(item.stockAtHand ?? 0) <= 0) {
      return;
    }
    this.pharmacyDrugDropdownOpen = false;
    this.pharmacyDrugSearchText = '';
    if (this.pharmacyUseStockBatch) {
      this.refreshPharmacyGroupedStockItems();
    }
    this.applySelectedPharmacyBatch(item);
  }

  private applySelectedPharmacyBatch(item: any): void {
    if (!item) {
      this.showStatusMessage('Select a drug or item first.', 'error');
      return;
    }
    if (Number(item.stockAtHand ?? 0) <= 0) {
      this.showStatusMessage('Out of stock.', 'error');
      return;
    }

    if (!this.pharmacyUseStockBatch) {
      this.pharmacySelectedFullLabel = String(item.title || item.name || '');
      this.pharmacySelectedLabel = String(item.title || item.name || 'Unknown Treatment');
      this.currentItemId = item.id != null ? Number(item.id) : null;
      this.currentStockBatchId = null;
      this.unitBuy = Number(item.costPrice) || 0;
      this.unitOfMeasure = String(item.uintOfMeasure ?? item.unitOfMeasure ?? item.uom ?? '').trim();
      this.availableQuantity = Number(item.stockAtHand) || 0;
      this.pharmacyStockDistributionTotal = this.availableQuantity;
      this.lastUnitValue = Number(item.lastUnitValue) > 0 ? Number(item.lastUnitValue) : 1;
      if (!this.pharmacyForm.quantity || this.pharmacyForm.quantity <= 0) {
        this.pharmacyForm.quantity = 1;
      }
      applyPrescribingPrefillToTreatmentForm(this.pharmacyForm as any, item);
      this.refreshPharmacyUnitSellingMode(item);
      this.calculatePharmacyNoOfUnits();
      this.calculatePharmacyTotalQty();
      this.calculatePharmacyTotal();
      return;
    }

    const drugName = item.plainName || this.plainPharmacyDrugName(item) || 'Unknown Treatment';
    const storePart = item.storeName ? ` · ${item.storeName}` : '';
    const expiryPart = item.expiryLabel ? ` · EX ${item.expiryLabel}` : '';
    this.pharmacySelectedFullLabel = item.title || '';
    this.pharmacySelectedLabel = item.batchLabel
      ? `${drugName} — ${item.batchLabel}${expiryPart}${storePart}`
      : drugName;
    this.currentItemId = item.stockItemId ?? item.id ?? null;
    this.currentStockBatchId =
      item._stockBatchId != null && item._stockBatchId !== ''
        ? Number(item._stockBatchId)
        : null;
    this.unitBuy = Number(item.costPrice ?? item.unitCostPrice ?? item.buyPrice ?? 0) || 0;
    this.unitOfMeasure = String(item.uintOfMeasure ?? item.unitOfMeasure ?? item.uom ?? '').trim();
    this.availableQuantity = Number(item.stockAtHand) || 0;
    this.pharmacyStockDistributionTotal = this.pharmacyBatchLineTotalForItem(item);
    this.lastUnitValue = Number(item.lastUnitValue) > 0 ? Number(item.lastUnitValue) : 1;
    if (!this.pharmacyForm.quantity || this.pharmacyForm.quantity <= 0) {
      this.pharmacyForm.quantity = 1;
    }
    applyPrescribingPrefillToTreatmentForm(this.pharmacyForm as any, item);
    this.refreshPharmacyUnitSellingMode(item);
    this.calculatePharmacyNoOfUnits();
    this.calculatePharmacyTotalQty();
    this.calculatePharmacyTotal();

    const stockItemId = Number(item?.stockItemId ?? item?.id);
    if (Number.isFinite(stockItemId) && stockItemId > 0) {
      this.api.getStockItemById(stockItemId).subscribe({
        next: (data) => {
          applyPrescribingPrefillToTreatmentForm(this.pharmacyForm as any, {
            ...item,
            ...(data ?? {}),
          });
          this.calculatePharmacyNoOfUnits();
          this.calculatePharmacyTotalQty();
          this.calculatePharmacyTotal();
        },
        error: () => undefined,
      });
    }
  }

  private resolveClientGroupRecord(): any | null {
    const groupId =
      this.editClientFormData?.clientGroupId ??
      this.queueClientForm?.clientGroupId ??
      this.clientGroupId ??
      this.visit?.clientGroupId ??
      this.visit?.clientGroup?.id ??
      null;
    if (groupId != null) {
      return (
        (this.clientGroupList || []).find((g: any) => Number(g?.id) === Number(groupId)) ?? null
      );
    }
    const name = String(this.clientGroupName || this.visit?.visitDefaultScheme || '')
      .trim()
      .toLowerCase();
    if (!name) {
      return null;
    }
    return (
      (this.clientGroupList || []).find(
        (g: any) =>
          String(g?.groupNameShortForm || '').trim().toLowerCase() === name ||
          String(g?.groupName || '').trim().toLowerCase() === name
      ) ?? null
    );
  }

  private resolveDirectUnitSellPrice(item: any): number {
    return (
      Number(
        item?.sellingPrice ??
          item?.unitSellingPrice ??
          item?.salePrice ??
          item?.unitSalePrice ??
          0
      ) || 0
    );
  }

  private resolvePharmacyUnitSellingStockItemId(item: any): number | null {
    const direct = Number(item?.stockItemId);
    if (Number.isFinite(direct) && direct > 0) {
      return direct;
    }
    const fallback = Number(item?.id ?? item?.itemId);
    return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
  }

  private pickPharmacyUnitSellingModel(models: any[], preferredModelId: any): any | null {
    const keywordMatch = findUnitSellingModelByNameKeyword(models, this.unitSellingModelNameKeyword);
    if (keywordMatch) {
      return keywordMatch;
    }
    if (preferredModelId != null) {
      const preferred = models.find((model) => Number(model?.id) === Number(preferredModelId));
      if (preferred) {
        return preferred;
      }
    }
    return models.find((model) => model?.isDefault) ?? models[0] ?? null;
  }

  /** After drug pick: load unit sell models and prefer Compassion pricing when client group uses it. */
  private refreshPharmacyUnitSellingMode(item: any): void {
    const preferredModelId =
      item?.unitSellingModelId ?? item?.unit_selling_model_id ?? null;
    const directPrice = this.resolveDirectUnitSellPrice(item);

    if (!this.pharmacyUseStockBatch) {
      const shopItemId = Number(item?.id ?? item?.itemId ?? this.currentItemId);
      if (!Number.isFinite(shopItemId) || shopItemId <= 0) {
        this.selectedUnitSellingModelId = null;
        this.itemSellingPrice = directPrice;
        this.calculatePharmacyTotal();
        return;
      }
      this.api.getShopItemUnitSellingModels(shopItemId, this.unitBuy).subscribe({
        next: (rows) => {
          const models = Array.isArray(rows) ? rows : [];
          if (!models.length) {
            this.selectedUnitSellingModelId = null;
            this.itemSellingPrice = directPrice;
            this.calculatePharmacyTotal();
            return;
          }
          const selected = this.pickPharmacyUnitSellingModel(models, preferredModelId);
          this.selectedUnitSellingModelId = selected?.id ?? null;
          this.itemSellingPrice = Number(selected?.unitSellingPrice) || directPrice;
          this.calculatePharmacyTotal();
        },
        error: () => {
          this.selectedUnitSellingModelId = null;
          this.itemSellingPrice = directPrice;
          this.calculatePharmacyTotal();
        },
      });
      return;
    }

    const stockItemId = this.resolvePharmacyUnitSellingStockItemId(item);
    if (stockItemId == null) {
      this.selectedUnitSellingModelId = null;
      this.itemSellingPrice = directPrice;
      this.calculatePharmacyTotal();
      return;
    }

    this.api.getUnitSellingModels(stockItemId, this.unitBuy).subscribe({
      next: (rows) => {
        const models = Array.isArray(rows) ? rows : [];
        if (!models.length) {
          this.selectedUnitSellingModelId = null;
          this.itemSellingPrice = directPrice;
          this.calculatePharmacyTotal();
          return;
        }
        const selected = this.pickPharmacyUnitSellingModel(models, preferredModelId);
        this.selectedUnitSellingModelId = selected?.id ?? null;
        this.itemSellingPrice = Number(selected?.unitSellingPrice) || directPrice;
        this.calculatePharmacyTotal();
      },
      error: () => {
        this.selectedUnitSellingModelId = null;
        this.itemSellingPrice = directPrice;
        this.calculatePharmacyTotal();
      },
    });
  }

  pharmacyBatchLineHasStock(line: { totalStock?: number }): boolean {
    return Number(line?.totalStock ?? 0) > 0;
  }

  pharmacyDistHasSelectableStock(dist: { item?: any | null }): boolean {
    return !!dist?.item && Number(dist.item.stockAtHand ?? 0) > 0;
  }

  formatPharmacyBatchMoney(amount: number | null | undefined): string {
    return formatMoneyWholeDisplay(amount ?? 0);
  }

  pharmacyTreatmentStockMetricLabel(): string {
    const total = Number(this.pharmacyStockDistributionTotal);
    if (Number.isFinite(total) && total > 0) {
      return String(total);
    }
    return String(this.availableQuantity || 0);
  }

  pharmacyUnitSellPrice(): number {
    return Number(this.itemSellingPrice) || 0;
  }

  /** Prefer unit sell models whose name contains "compassion" for Compassion-group clients. */
  get unitSellingModelNameKeyword(): string | null {
    const group = this.resolveClientGroupRecord();
    const fallback =
      this.clientGroupName ||
      this.visit?.visitDefaultScheme ||
      group?.groupNameShortForm ||
      group?.groupName ||
      '';
    return clientGroupUsesCompassionPricing(group, fallback) ? 'compassion' : null;
  }

  pharmacyLineTotal(): number {
    const qty = Number(this.pharmacyForm.quantity) || 0;
    const unitPrice = Number(this.itemSellingPrice) || 0;
    if (qty > 0 && unitPrice > 0) {
      return Math.round(qty * unitPrice * 100) / 100;
    }
    return Math.round((Number(this.pharmacyForm.totalAmount) || 0) * 100) / 100;
  }

  onPharmacyUnitSellingModelPriceChange(price: number): void {
    const next = Number(price) || 0;
    // Don't wipe an existing unit sell when the picker loads with no model selected.
    if (next <= 0 && (Number(this.itemSellingPrice) || 0) > 0) {
      return;
    }
    this.itemSellingPrice = next;
    this.calculatePharmacyTotal();
  }

  calculatePharmacyNoOfUnits(): void {
    const dose = Number(this.pharmacyForm.amountPerFrequencyValue) || 0;
    if (dose > 0 && this.lastUnitValue > 0) {
      this.pharmacyForm.totalUnits = dose / this.lastUnitValue;
    } else {
      this.pharmacyForm.totalUnits = 0;
    }
    this.updatePharmacyEstimatedUnits();
  }

  updatePharmacyEstimatedUnits(): void {
    const totalUnits = Number(this.pharmacyForm.totalUnits) || 0;
    this.pharmacyForm.estimatedUnits = Math.round(totalUnits);
  }

  calculatePharmacyTotalQty(): void {
    const freq = Number(this.pharmacyForm.frequencyValue) || 0;
    const dur = Number(this.pharmacyForm.durationValue) || 0;
    const dose = Number(this.pharmacyForm.amountPerFrequencyValue) || 0;
    if (freq > 0 && dur > 0 && dose > 0 && this.lastUnitValue > 0) {
      this.pharmacyForm.quantity = (freq * dur * dose) / this.lastUnitValue;
    }
    this.calculatePharmacyTotal();
  }

  calculatePharmacyDurationUnit(): void {
    this.pharmacyForm.durationUnit = this.pharmacyForm.frequencyUnit;
  }

  calculatePharmacyTotal(): void {
    const qty = Number(this.pharmacyForm.quantity) || 0;
    const unitSell = Number(this.itemSellingPrice) || 0;
    this.pharmacyForm.totalAmount = Math.round(qty * unitSell * 100) / 100;
  }

  applyPharmacyStandardDosageOption(option: StandardDosageOption): void {
    this.pharmacyForm.amountPerFrequencyValue = option.doseValue;
    this.pharmacyForm.amountPerFrequencyUnit = normalizeDosageUnitForSelect(option.doseUnit);
    this.pharmacyForm.frequencyValue = option.frequencyValue;
    this.pharmacyForm.frequencyUnit = option.frequencyUnit;
    this.pharmacyForm.durationValue = option.durationValue;
    this.pharmacyForm.durationUnit = option.durationUnit;
    this.pharmacyForm.quantity = option.quantity;
    this.pharmacyForm.totalUnits = option.totalUnits;
    this.pharmacyForm.instructions = option.instructions;
    this.pharmacyForm.route = option.route;
    this.calculatePharmacyNoOfUnits();
    this.calculatePharmacyTotalQty();
    this.calculatePharmacyTotal();
  }

  pharmacyStandardDosageClientAge(): number | null {
    const n = Number(this.clientAge);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  pharmacyStandardDosageClientWeight(): number | null {
    const latest = (this.vitalsList || [])[0];
    const w = Number(latest?.weight ?? latest?.weightKg);
    return Number.isFinite(w) && w > 0 ? w : null;
  }

  /** Show inventory unit in the list when it is not one of the standard dropdown values. */
  get customPharmacyDosageUnit(): string {
    const v = String(this.pharmacyForm?.amountPerFrequencyUnit ?? '').trim();
    if (!v || isStandardDosageUnit(v)) {
      return '';
    }
    return v;
  }

  pharmacyBatchExpiryToneClass(tone: string): string {
    if (tone === 'danger') {
      return 'cv2-pharmacy-batch-expiry--danger';
    }
    if (tone === 'warning') {
      return 'cv2-pharmacy-batch-expiry--warning';
    }
    if (tone === 'safe') {
      return 'cv2-pharmacy-batch-expiry--safe';
    }
    return 'cv2-pharmacy-batch-expiry--unknown';
  }

  trackPharmacyGroupedStockItem(_index: number, group: { itemKey: string }): string {
    return group.itemKey;
  }

  private pharmacyBatchLineTotalForItem(item: any): number {
    if (!item) {
      return 0;
    }
    const itemKey = String(item.stockItemId ?? item.stockItemName ?? item.id ?? '').trim();
    if (!itemKey) {
      return Number(item.stockAtHand ?? 0);
    }
    return this.pharmacyStockItemList
      .filter((row) => {
        const rowKey = String(row.stockItemId ?? row.stockItemName ?? row.id ?? '').trim();
        return (
          rowKey === itemKey &&
          this.pharmacyStockBatchLineKey(itemKey, row) === this.pharmacyStockBatchLineKey(itemKey, item)
        );
      })
      .reduce((sum, row) => sum + Number(row?.stockAtHand ?? 0), 0);
  }

  submitPharmacyPrescription(): void {
    if (!this.visitId || this.isSavingPharmacy) {
      return;
    }
    const payload = this.buildTreatmentRequestPayload();
    if (!payload) {
      this.showStatusMessage(this.pharmacyPrescriptionValidationMessage(), 'error');
      return;
    }

    this.isSavingPharmacy = true;
    const editingId = this.editingPharmacyTreatmentId;
    const request$ =
      editingId != null
        ? this.api.updateTreatment(editingId, payload)
        : this.api.saveTreatmentRequested(this.visitId, payload);

    request$.subscribe({
      next: (response: any) => {
        this.isSavingPharmacy = false;
        this.showStatusMessage(
          response?.message || (editingId != null ? 'Prescription updated.' : 'Prescription saved.'),
          'success'
        );
        this.closePharmacyModal();
        this.loadPharmacy();
        this.loadDiagnoses();
        this.loadInvoice();
      },
      error: (err) => {
        this.isSavingPharmacy = false;
        this.showStatusMessage(
          err?.error?.message || (editingId != null ? 'Could not update prescription.' : 'Could not save prescription.'),
          'error'
        );
      },
    });
  }

  deletePharmacyItem(item: any): void {
    this.closePharmacyActionMenu();
    const id = Number(item?.id ?? item?.treatmentId);
    if (!Number.isFinite(id) || id <= 0) {
      this.showStatusMessage('Could not identify this prescription.', 'error');
      return;
    }
    this.pharmacyPendingDelete = item;
    this.showPharmacyDeleteModal = true;
    this.openCv2ModalLayer();
  }

  closePharmacyDeleteModal(): void {
    if (this.isDeletingPharmacy) {
      return;
    }
    this.showPharmacyDeleteModal = false;
    this.pharmacyPendingDelete = null;
    this.restoreBodyScrollUnlessModalOpen();
  }

  confirmDeletePharmacyItem(): void {
    const id = Number(this.pharmacyPendingDelete?.id ?? this.pharmacyPendingDelete?.treatmentId);
    if (!Number.isFinite(id) || id <= 0 || this.isDeletingPharmacy) {
      return;
    }
    this.isDeletingPharmacy = true;
    this.api.deleteTreatmentRequestById(id).subscribe({
      next: (response: any) => {
        this.isDeletingPharmacy = false;
        this.showPharmacyDeleteModal = false;
        this.pharmacyPendingDelete = null;
        this.restoreBodyScrollUnlessModalOpen();
        this.showStatusMessage(response?.message || 'Prescription removed.', 'success');
        this.loadPharmacy();
        this.loadDiagnoses();
        this.loadInvoice();
      },
      error: (err) => {
        this.isDeletingPharmacy = false;
        this.showStatusMessage(err?.error?.message || 'Could not remove prescription.', 'error');
      },
    });
  }

  clearPharmacyForm(): void {
    this.currentStockBatchId = null;
    this.currentItemId = null;
    this.selectedUnitSellingModelId = null;
    this.unitBuy = 0;
    this.itemSellingPrice = 0;
    this.lastUnitValue = 1;
    this.unitOfMeasure = '';
    this.availableQuantity = 0;
    this.pharmacyStockDistributionTotal = 0;
    this.pharmacySelectedLabel = 'Choose Treatment';
    this.pharmacySelectedFullLabel = '';
    this.pharmacyDrugSearchText = '';
    this.pharmacyDrugDropdownOpen = false;
    this.pharmacyDiagnosisDropdownOpen = false;
    this.pharmacyForm = {
      quantity: 1,
      totalUnits: 1,
      estimatedUnits: 1,
      totalAmount: 0,
      durationValue: null,
      durationUnit: null,
      frequencyValue: null,
      frequencyUnit: null,
      amountPerFrequencyValue: 1,
      amountPerFrequencyUnit: 'tablet',
      instructions: '',
      route: 'Oral',
      diagnosisId: null,
    };
  }

  treatmentRowSerial(index: number): number {
    return index + 1;
  }

  rowSerialBadgeColor(index: number): string {
    const colors = ['#14b8a6', '#ef4444', '#8b5cf6', '#f43f5e', '#3b82f6', '#f59e0b', '#10b981', '#6366f1'];
    const i = Number(index);
    if (!Number.isFinite(i) || i < 0) {
      return colors[0];
    }
    return colors[i % colors.length];
  }

  treatmentStatusLabel(status: string | null | undefined): string {
    if (!status) {
      return 'Pending';
    }
    const s = status.toString().trim().toLowerCase();
    if (s === 'given' || s === 'dispensed') {
      return 'Given';
    }
    if (s === 'cancelled') {
      return 'Cancelled';
    }
    return 'Pending';
  }

  treatmentStatusPillClass(status: string | null | undefined): string {
    const label = this.treatmentStatusLabel(status).toLowerCase();
    if (label === 'given') {
      return 'cv2-pill--success';
    }
    if (label === 'cancelled') {
      return 'cv2-pill--danger';
    }
    return 'cv2-pill--warning';
  }

  formatTreatmentPeriodUnit(unit: unknown): string {
    return formatTreatmentPeriodUnit(unit);
  }

  treatmentFrequencyShortLabel(item: any): string {
    const dose = this.formatTreatmentFrequencyPart(
      item?.totalUnits ?? item?.stockUnitsPerDose ?? item?.amountPerFrequencyValue
    );
    const frequency = this.formatTreatmentFrequencyPart(item?.frequencyValue);
    const frequencyUnit = this.formatTreatmentPeriodUnit(item?.frequencyUnit);
    if (dose && frequency) {
      return `${dose} X ${frequency}${frequencyUnit ? ` (${frequencyUnit})` : ''}`;
    }
    return [dose, frequency].filter(Boolean).join(' X ') || '—';
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

  // ── Billing workflow ────────────────────────────────────────────────

  openPaymentModal(): void {
    if (!this.visitId) {
      this.showStatusMessage('Select a visit first.', 'error');
      return;
    }
    this.openPaymentModalForVisit(this.visitId, this.visit);
  }

  /**
   * Receive payment for one visit — amount defaults to that visit's balance due
   * (not total debt across all visits). Date/time editable only for MD.
   */
  openPaymentModalForVisit(visitId: number, visitHint?: any): void {
    this.editingPaymentId = null;
    const hintDue = this.resolveVisitBalanceDue(visitHint);
    this.paymentVisitDueHint = hintDue > 0 ? hintDue : null;
    this.paymentForm = {
      amountToPay: hintDue > 0 ? hintDue : null,
      paymentForm: 'Cash At Hand',
      notes: 'Payment Received with Thanks',
      dateOfPayment: this.todayInputDate(),
      timeOfPayment: this.nowInputTime(),
    };
    this.showPaymentModal = true;
    this.openCv2ModalLayer();

    this.api.getInvoiceForVisitId(visitId).subscribe({
      next: (res: any) => {
        const inv = res?.data ?? res;
        const due = Number(inv?.balanceDue ?? inv?.BalanceDue ?? NaN);
        if (Number.isFinite(due) && due > 0) {
          this.paymentVisitDueHint = due;
          if (this.editingPaymentId == null) {
            this.paymentForm.amountToPay = due;
          }
        } else if (this.paymentVisitDueHint == null) {
          this.paymentVisitDueHint = Number.isFinite(due) ? due : null;
        }
      },
      error: () => {
        /* keep hint / amount from visit list if present */
      },
    });
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.editingPaymentId = null;
    this.paymentVisitDueHint = null;
    this.restoreBodyScrollUnlessModalOpen();
  }

  openTaxDiscountModal(): void {
    if (!this.visitId) {
      this.showStatusMessage('Select a visit first.', 'error');
      return;
    }
    this.taxDiscountForm = {
      discount: this.invoice?.discount ?? null,
      tax: this.invoice?.tax ?? null,
      invoiceNotes: this.invoice?.invoiceNotes ?? this.invoice?.notes ?? '',
    };
    this.showTaxDiscountModal = true;
    this.openCv2ModalLayer();
  }

  closeTaxDiscountModal(): void {
    this.showTaxDiscountModal = false;
    this.restoreBodyScrollUnlessModalOpen();
  }

  submitPayment(): void {
    if (!this.visitId || this.isSavingPayment) {
      return;
    }
    const amount = Number(this.paymentForm.amountToPay);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.showStatusMessage('Enter a valid payment amount.', 'error');
      return;
    }

    this.isSavingPayment = true;
    const payload: any = {
      amountToPay: amount,
      paymentForm: this.paymentForm.paymentForm || 'Cash At Hand',
      status: 'Approved',
      notes: this.paymentForm.notes || 'Payment Received with Thanks',
      receivedBy: this.userName,
      dateOfPayment: this.paymentForm.dateOfPayment || this.todayInputDate(),
      timeOfPayment: this.toApiTime(this.paymentForm.timeOfPayment),
    };

    const request$ =
      this.editingPaymentId != null
        ? this.api.updatePayment(this.editingPaymentId, payload)
        : this.api.savePayment(this.visitId, payload);

    request$.subscribe({
      next: (response: any) => {
        this.isSavingPayment = false;
        this.showStatusMessage(
          response?.message || (this.editingPaymentId != null ? 'Payment updated.' : 'Payment recorded.'),
          'success'
        );
        this.closePaymentModal();
        this.loadPayments();
        this.loadInvoice();
        this.refreshClientTotalDebt();
      },
      error: (err) => {
        this.isSavingPayment = false;
        this.showStatusMessage(
          err?.error?.message || (this.editingPaymentId != null ? 'Could not update payment.' : 'Could not record payment.'),
          'error'
        );
      },
    });
  }

  isPaymentReversed(payment: any): boolean {
    return String(payment?.status || '').trim().toLowerCase() === 'reversed';
  }

  togglePaymentActionMenu(payment: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const id = payment?.id;
    if (id == null) {
      return;
    }
    const isOpen =
      this.paymentActionMenuId === id || String(this.paymentActionMenuId) === String(id);
    this.closePharmacyActionMenu();
    this.closeVitalsActionMenu();
    this.closeOrderDocActionMenu();
    if (isOpen) {
      this.closePaymentActionMenu();
      return;
    }
    const trigger = (event.currentTarget as HTMLElement) || null;
    const rect = trigger?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const popWidth = 168;
    const popHeight = 132;
    const gap = 4;
    let top = rect.bottom + gap;
    if (top + popHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - popHeight - gap);
    }
    let left = rect.right - popWidth;
    if (left < 8) {
      left = 8;
    }
    if (left + popWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - popWidth - 8);
    }
    this.paymentActionMenuId = id;
    this.paymentActionMenuPayment = payment;
    this.paymentActionMenuStyle = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      right: 'auto',
      bottom: 'auto',
      zIndex: '200150',
    };
    setTimeout(() => this.attachPaymentActionMenuToBody(), 0);
  }

  isPaymentActionMenuOpen(payment: any): boolean {
    const id = payment?.id;
    if (id == null || this.paymentActionMenuId == null) {
      return false;
    }
    return this.paymentActionMenuId === id || String(this.paymentActionMenuId) === String(id);
  }

  private closePaymentActionMenu(): void {
    this.paymentActionMenuId = null;
    this.paymentActionMenuPayment = null;
    this.paymentActionMenuStyle = {};
  }

  private attachPaymentActionMenuToBody(): void {
    const menu = this.paymentActionMenuPop?.nativeElement;
    if (!menu || !this.paymentActionMenuPayment) {
      return;
    }
    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }
    Object.assign(menu.style, this.paymentActionMenuStyle);
  }

  editPayment(payment: any): void {
    this.closePaymentActionMenu();
    if (!payment?.id || this.isPaymentReversed(payment)) {
      this.showStatusMessage('This payment cannot be edited.', 'error');
      return;
    }
    this.editingPaymentId = Number(payment.id);
    this.paymentVisitDueHint = null;
    this.paymentForm = {
      amountToPay: Number(payment.amountToPay ?? payment.amount ?? null) || null,
      paymentForm: payment.paymentForm || 'Cash At Hand',
      notes: payment.notes || 'Payment Received with Thanks',
      dateOfPayment: this.toInputDate(payment.dateOfPayment) || this.todayInputDate(),
      timeOfPayment: this.toInputTime(payment.timeOfPayment) || this.nowInputTime(),
    };
    this.showPaymentModal = true;
    this.openCv2ModalLayer();
  }

  requestDeletePayment(payment: any): void {
    this.closePaymentActionMenu();
    if (!payment?.id) {
      return;
    }
    this.paymentPendingDelete = payment;
    this.showPaymentDeleteModal = true;
    this.openCv2ModalLayer();
  }

  closePaymentDeleteModal(): void {
    if (this.isDeletingPayment) {
      return;
    }
    this.showPaymentDeleteModal = false;
    this.paymentPendingDelete = null;
    this.restoreBodyScrollUnlessModalOpen();
  }

  confirmDeletePayment(): void {
    const id = Number(this.paymentPendingDelete?.id);
    if (!id || this.isDeletingPayment) {
      return;
    }
    this.isDeletingPayment = true;
    this.api.deletePayment(id).subscribe({
      next: (response: any) => {
        this.isDeletingPayment = false;
        this.showPaymentDeleteModal = false;
        this.paymentPendingDelete = null;
        this.restoreBodyScrollUnlessModalOpen();
        this.showStatusMessage(response?.message || 'Payment deleted.', 'success');
        this.loadPayments();
        this.loadInvoice();
        this.refreshClientTotalDebt();
      },
      error: (err) => {
        this.isDeletingPayment = false;
        this.showStatusMessage(err?.error?.message || 'Could not delete payment.', 'error');
      },
    });
  }

  requestReversePayment(payment: any): void {
    this.closePaymentActionMenu();
    if (!payment?.id || this.isPaymentReversed(payment)) {
      this.showStatusMessage('This payment is already reversed.', 'error');
      return;
    }
    this.paymentPendingReverse = payment;
    this.showPaymentReverseModal = true;
    this.openCv2ModalLayer();
  }

  closePaymentReverseModal(): void {
    if (this.isReversingPayment) {
      return;
    }
    this.showPaymentReverseModal = false;
    this.paymentPendingReverse = null;
    this.restoreBodyScrollUnlessModalOpen();
  }

  confirmReversePayment(): void {
    const id = Number(this.paymentPendingReverse?.id);
    if (!id || this.isReversingPayment) {
      return;
    }
    this.isReversingPayment = true;
    this.api.updatePayment(id, { status: 'Reversed' }).subscribe({
      next: (response: any) => {
        this.isReversingPayment = false;
        this.showPaymentReverseModal = false;
        this.paymentPendingReverse = null;
        this.restoreBodyScrollUnlessModalOpen();
        this.showStatusMessage(response?.message || 'Payment reversed.', 'success');
        this.loadPayments();
        this.loadInvoice();
        this.refreshClientTotalDebt();
      },
      error: (err) => {
        this.isReversingPayment = false;
        this.showStatusMessage(err?.error?.message || 'Could not reverse payment.', 'error');
      },
    });
  }

  printPaymentReceipt(payment: any): void {
    this.closePaymentActionMenu();
    if (!payment) {
      return;
    }
    void this.resolveCommercialReceiptDocForPayment(payment).then((doc) => {
      if (!doc) {
        this.showStatusMessage('Could not build receipt for this payment.', 'error');
        return;
      }
      return this.printOrderDocument(doc);
    });
  }

  async sharePaymentReceipt(payment?: any): Promise<void> {
    const target = payment || this.paymentActionMenuPayment;
    this.closePaymentActionMenu();
    if (!target) {
      return;
    }
    try {
      const doc = await this.resolveCommercialReceiptDocForPayment(target);
      if (!doc) {
        this.showStatusMessage('Could not build receipt for this payment.', 'error');
        return;
      }
      await this.shareOrderDocument(doc);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      this.showStatusMessage('Could not share payment receipt.', 'error');
    }
  }

  /**
   * Prefer the POS/order receipt document (same as Receipt tab). Fall back to a
   * commercial receipt built from visit product lines so layout stays identical.
   */
  private async resolveCommercialReceiptDocForPayment(payment: any): Promise<any | null> {
    await this.ensureOrderReceiptsLoaded();
    const matched = this.findOrderReceiptMatchingPayment(payment);
    if (matched) {
      return matched;
    }
    return this.buildCommercialReceiptPayloadFromVisitPayment(payment);
  }

  private ensureOrderReceiptsLoaded(): Promise<void> {
    if (!this.visitId) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.api
        .listOtcSaleDocuments({
          visitId: this.visitId,
          documentType: 'receipt',
        })
        .subscribe({
          next: (rows) => {
            this.orderReceipts = Array.isArray(rows) ? rows : [];
            resolve();
          },
          error: () => resolve(),
        });
    });
  }

  private findOrderReceiptMatchingPayment(payment: any): any | null {
    const list = Array.isArray(this.orderReceipts) ? this.orderReceipts : [];
    if (!list.length) {
      return null;
    }
    const payAmt = Number(payment?.amountToPay ?? payment?.amount ?? 0);
    const payDate = String(payment?.dateOfPayment || payment?.paymentDate || '')
      .trim()
      .slice(0, 10);
    const notes = String(payment?.notes || '').toLowerCase();

    const ranked = list
      .map((doc) => {
        let score = 0;
        const received = Number(doc?.amountReceived ?? 0);
        const total = Number(doc?.totalAmount ?? 0);
        if (payAmt > 0 && Math.abs(received - payAmt) < 0.02) {
          score += 3;
        }
        if (payAmt > 0 && Math.abs(total - payAmt) < 0.02) {
          score += 2;
        }
        const docDate = String(doc?.saleDate || '')
          .trim()
          .slice(0, 10);
        if (payDate && docDate && payDate === docDate) {
          score += 1;
        }
        const saleNo = String(doc?.saleNo || '').toLowerCase();
        if (saleNo && notes.includes(saleNo)) {
          score += 4;
        }
        if (notes.includes('otc receipt') || notes.includes('otc counter')) {
          score += 1;
        }
        return { doc, score };
      })
      .sort((a, b) => b.score - a.score);

    if (ranked[0]?.score > 0) {
      return ranked[0].doc;
    }
    if (list.length === 1) {
      return list[0];
    }
    return list[0] || null;
  }

  private buildCommercialReceiptPayloadFromVisitPayment(payment: any): any {
    const payAmt = Number(payment?.amountToPay ?? payment?.amount ?? 0) || 0;
    type ReceiptLine = {
      itemName: string;
      dosage?: string;
      quantity: number;
      unitSellingPrice: number;
      totalAmount: number;
    };
    const treatmentLines: ReceiptLine[] = (this.treatmentsList || [])
      .filter((t) => {
        const status = String(t?.status || '').trim().toLowerCase();
        return status !== 'cancelled' && status !== 'canceled';
      })
      .map((t) => {
        const qty = Number(t?.quantity ?? t?.totalUnits ?? 1) || 1;
        const lineTotal = Number(t?.totalAmount ?? t?.provisionalTotalAmount ?? 0) || 0;
        const unit = Number(t?.unitSellingPrice ?? 0) || (qty > 0 ? lineTotal / qty : lineTotal);
        return {
          itemName: String(t?.itemName || t?.drugName || 'Item'),
          dosage: t?.dosage ? String(t.dosage) : undefined,
          quantity: qty,
          unitSellingPrice: unit,
          totalAmount: lineTotal > 0 ? lineTotal : unit * qty,
        };
      })
      .filter((l) => (l.totalAmount || 0) > 0 || (l.quantity || 0) > 0);

    const lines: ReceiptLine[] =
      treatmentLines.length > 0
        ? treatmentLines
        : [
            {
              itemName: 'Payment received',
              quantity: 1,
              unitSellingPrice: payAmt,
              totalAmount: payAmt,
            },
          ];

    const subtotal = lines.reduce((sum, l) => sum + (Number(l.totalAmount) || 0), 0);
    const total = subtotal > 0 ? subtotal : payAmt;
    const dateRaw = String(payment?.dateOfPayment || payment?.paymentDate || '').trim();
    const timeRaw = String(payment?.timeOfPayment || '').trim();

    return {
      documentType: 'receipt',
      saleNo: payment?.id != null ? `RCP-${payment.id}` : 'RCP',
      saleDate: dateRaw.slice(0, 10) || this.todayInputDate() || '',
      saleTime: timeRaw || undefined,
      patientName: this.clientFullName || '',
      receivedBy: payment?.receivedBy || this.userName || '',
      paymentForm: payment?.paymentForm || '',
      notes: payment?.notes || '',
      totalAmount: total,
      amountReceived: payAmt > 0 ? payAmt : total,
      changeAmount: Math.max(0, (payAmt > 0 ? payAmt : total) - total),
      lines,
    };
  }

  toggleOrderDocActionMenu(doc: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const id = doc?.id ?? doc?.saleNo;
    if (id == null) {
      return;
    }
    const isOpen =
      this.orderDocActionMenuId === id || String(this.orderDocActionMenuId) === String(id);
    this.closePaymentActionMenu();
    this.closePharmacyActionMenu();
    this.closeServiceActionMenu();
    this.closeVitalsActionMenu();
    if (isOpen) {
      this.closeOrderDocActionMenu();
      return;
    }
    const trigger = (event.currentTarget as HTMLElement) || null;
    const rect = trigger?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    this.orderDocActionMenuId = id;
    this.orderDocActionMenuDoc = doc;
    const menuWidth = 180;
    const left = Math.min(window.innerWidth - menuWidth - 8, Math.max(8, rect.right - menuWidth));
    const top = Math.min(window.innerHeight - 120, rect.bottom + 4);
    this.orderDocActionMenuStyle = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: '10050',
    };
    setTimeout(() => this.attachOrderDocActionMenuToBody(), 0);
  }

  isOrderDocActionMenuOpen(doc: any): boolean {
    const id = doc?.id ?? doc?.saleNo;
    if (id == null || this.orderDocActionMenuId == null) {
      return false;
    }
    return this.orderDocActionMenuId === id || String(this.orderDocActionMenuId) === String(id);
  }

  private closeOrderDocActionMenu(): void {
    this.orderDocActionMenuId = null;
    this.orderDocActionMenuDoc = null;
    this.orderDocActionMenuStyle = {};
  }

  private attachOrderDocActionMenuToBody(): void {
    const menu = this.orderDocActionMenuPop?.nativeElement;
    if (!menu || !this.orderDocActionMenuDoc) {
      return;
    }
    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }
    Object.assign(menu.style, this.orderDocActionMenuStyle);
  }

  async printOrderDocument(doc?: any): Promise<void> {
    const target = doc || this.orderDocActionMenuDoc;
    this.closeOrderDocActionMenu();
    if (!target) {
      return;
    }
    if (this.isPrintingOrderDoc) {
      return;
    }
    const label = this.orderDocumentTypeLabel(target);
    this.isPrintingOrderDoc = true;
    try {
      await this.facilityBranding.loadLogoDataUrl();
      const pdf = this.buildOrderCommercialDocPdf(target);
      const filename = commercialDocFilename(
        normalizeCommercialDocType(target.documentType || this.activeTab || 'receipt'),
        target.saleNo || 'document'
      );
      const blobUrl = URL.createObjectURL(pdf.output('blob'));
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        pdf.save(filename);
        this.showStatusMessage(
          `${label} saved as PDF. Allow pop-ups to print from the browser.`,
          'info'
        );
        return;
      }
      const triggerPrint = () => {
        try {
          win.focus();
          win.print();
        } catch {
          /* ignored */
        }
      };
      win.addEventListener('load', triggerPrint);
      setTimeout(triggerPrint, 600);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
    } catch {
      this.showStatusMessage(`Could not print ${label.toLowerCase()}.`, 'error');
    } finally {
      this.isPrintingOrderDoc = false;
    }
  }

  async shareOrderDocument(doc?: any): Promise<void> {
    const target = doc || this.orderDocActionMenuDoc;
    this.closeOrderDocActionMenu();
    if (!target) {
      return;
    }
    const label = this.orderDocumentTypeLabel(target);
    try {
      await this.facilityBranding.loadLogoDataUrl();
      const pdf = this.buildOrderCommercialDocPdf(target);
      const filename = commercialDocFilename(
        normalizeCommercialDocType(target.documentType || this.activeTab || 'receipt'),
        target.saleNo || 'document'
      );
      const blob = pdf.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });
      const title = `${label} ${target.saleNo || ''}`.trim();
      const navAny = navigator as Navigator & {
        share?: (data: ShareData & { files?: File[] }) => Promise<void>;
        canShare?: (data: ShareData & { files?: File[] }) => boolean;
      };
      if (typeof navAny.share === 'function') {
        const payload: ShareData & { files?: File[] } = {
          title,
          text: `${title} for ${target.patientName || this.clientFullName || 'client'}`,
          files: [file],
        };
        if (!navAny.canShare || navAny.canShare(payload)) {
          await navAny.share(payload);
          return;
        }
        await navAny.share({
          title: payload.title,
          text: payload.text,
        });
        pdf.save(filename);
        this.showStatusMessage(
          `${label} PDF downloaded — attach it from your files to share.`,
          'info'
        );
        return;
      }
      pdf.save(filename);
      this.showStatusMessage(`${label} PDF downloaded.`, 'success');
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      this.showStatusMessage(`Could not share ${label.toLowerCase()}.`, 'error');
    }
  }

  private buildOrderCommercialDocPdf(doc: any): jsPDF {
    const lines = Array.isArray(doc?.lines) ? doc.lines : [];
    const branding = this.facilityBranding.getCached();
    const total = Number(doc?.totalAmount ?? 0) || 0;
    const mapped = mapSaleToCommercialDoc({
      docType: normalizeCommercialDocType(doc?.documentType || 'receipt'),
      saleNo: String(doc?.saleNo || '—'),
      saleDateLabel: String(doc?.saleDate || ''),
      saleTimeLabel: doc?.saleTime ? String(doc.saleTime).slice(0, 8) : undefined,
      facilityName: this.facilityBranding.getFacilityName(),
      facilityAddress: branding?.facilityAddress || '',
      facilityContact: this.facilityBranding.getContactInquiryLine() || '',
      clientName: doc?.patientName || this.clientFullName || '',
      receivedBy: doc?.receivedBy || this.userName || '',
      paymentMethod: doc?.paymentForm || '',
      notes: doc?.notes || '',
      thankYouMessage: branding?.thankYouMessage || branding?.thankYouLine,
      paymentTerms: branding?.invoiceFooterMainLine,
      lines: lines.map((l: any) => ({
        itemName: l?.itemName || 'Item',
        dosage: l?.dosage || undefined,
        quantity: Number(l?.quantity ?? 0) || 0,
        unitPrice: Number(l?.unitSellingPrice ?? l?.unitPrice ?? 0) || 0,
        lineTotal: Number(l?.totalAmount ?? l?.lineTotal ?? 0) || 0,
        given: true,
      })),
      subtotal: total,
      amountReceived: Number(doc?.amountReceived ?? total) || total,
      changeDue: Number(doc?.changeAmount ?? doc?.changeDue ?? 0) || 0,
    });
    return buildCommercialDocumentPdf(mapped, {
      addLogoToPdf: (pdf, x, y, w, h) => this.facilityBranding.addLogoToJsPdf(pdf, x, y, w, h),
      formatMoney: (n) => this.formatMoney(n),
    });
  }

  submitTaxDiscount(): void {
    if (!this.invoiceId || this.isSavingTaxDiscount) {
      this.showStatusMessage('Invoice not loaded yet.', 'error');
      return;
    }

    this.isSavingTaxDiscount = true;
    this.api.updateInvoiceWithDiscountAndTax(this.invoiceId, this.taxDiscountForm).subscribe({
      next: (response: any) => {
        this.isSavingTaxDiscount = false;
        this.showStatusMessage(response?.message || 'Invoice updated.', 'success');
        this.closeTaxDiscountModal();
        this.loadInvoice();
      },
      error: (err) => {
        this.isSavingTaxDiscount = false;
        this.showStatusMessage(err?.error?.message || 'Could not update invoice.', 'error');
      },
    });
  }

  exportInvoicePdf(): void {
    if (!this.visitId || this.isExportingInvoice) {
      return;
    }
    this.isExportingInvoice = true;
    this.api.exportPdf(this.visitId).subscribe({
      next: (res: Blob) => {
        this.isExportingInvoice = false;
        const blob = new Blob([res], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-visit-${this.visitId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.showStatusMessage('Invoice PDF downloaded.', 'success');
      },
      error: (err) => {
        this.isExportingInvoice = false;
        this.showStatusMessage(err?.message || 'Could not export invoice PDF.', 'error');
      },
    });
  }

  /** Same Word (.docx) lab export as Consultation Center Printouts. */
  exportAllLabResultsDocx(): void {
    if (!this.visitId || this.isExportingLabResults) {
      return;
    }
    this.isExportingLabResults = true;
    forkJoin({
      lab: this.api.getLabTestProceduresByVisit(this.visitId).pipe(catchError(() => of([]))),
      other: this.api.getOtherProceduresByVisit(this.visitId).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ lab, other }) => {
        const labList = filterProceduresForCombinedLabDocxExport(
          Array.isArray(lab) ? lab : [],
          Array.isArray(other) ? other : this.proceduresList || []
        );
        if (!labList.length) {
          this.isExportingLabResults = false;
          this.showStatusMessage(
            'No lab tests on this visit, or only ultrasound/scan requests are present (scans are excluded).',
            'error'
          );
          return;
        }
        forkJoin(labList.map((item) => fetchProcedureReportForPdf$(this.api, item))).subscribe({
          next: (rows) => {
            void buildAndDownloadAllLabResultsDocx({
              clientName: `${this.clientFirstName || ''} ${this.clientSecondName || ''}`.trim(),
              visitId: this.visitId!,
              visitDate: this.visit?.visitDate || '',
              labProcedureRows: rows,
              clientAge: this.clientAge,
              clientDateOfBirth: this.clientDateOfBirth,
              clientGender: this.clientGender,
            })
              .then(() => {
                this.isExportingLabResults = false;
                this.showStatusMessage('Lab results Word document downloaded.', 'success');
              })
              .catch((e) => {
                console.error(e);
                this.isExportingLabResults = false;
                this.showStatusMessage('Could not build lab results Word document.', 'error');
              });
          },
          error: (err) => {
            this.isExportingLabResults = false;
            this.showStatusMessage(err?.message || 'Failed to load lab reports.', 'error');
          },
        });
      },
      error: (err) => {
        this.isExportingLabResults = false;
        this.showStatusMessage(err?.message || 'Failed to load lab procedures.', 'error');
      },
    });
  }

  exportStatementPdf(): void {
    this.openStatementExportModal();
  }

  openStatementExportModal(): void {
    if (!this.visitId) {
      this.showStatusMessage('Select a visit first.', 'error');
      return;
    }
    this.statementExportIncludeNextOfKin = true;
    this.statementExportIncludePaymentTable = true;
    this.statementExportIncludeAmountColumns = true;
    this.statementExportIncludeFooter = true;
    this.statementExportDocumentType = 'MEDICAL_REPORT';
    this.statementExportClientFields = {
      includeClientName: true,
      includeClientAddress: true,
      includeClientGender: true,
      includeClientAge: true,
      includeClientContact: true,
      includeVisitDate: true,
      includeBalanceDue: true,
    };
    this.statementExportAccordion = {
      client: true,
      document: false,
      services: false,
      treatments: false,
      nextOfKin: false,
      payment: false,
      amounts: false,
      footer: false,
    };
    this.statementExportSelectedTreatmentIds = (this.treatmentsList || [])
      .map((row) => Number(row?.id))
      .filter((id) => Number.isFinite(id) && id > 0);
    this.statementExportSelectedProcedureIds = (this.proceduresList || [])
      .map((row) => Number(row?.id))
      .filter((id) => Number.isFinite(id) && id > 0);
    this.showStatementExportModal = true;
    this.openCv2ModalLayer();
  }

  isStatementExportAccordionOpen(
    section: 'client' | 'document' | 'services' | 'treatments' | 'nextOfKin' | 'payment' | 'amounts' | 'footer'
  ): boolean {
    return !!this.statementExportAccordion[section];
  }

  toggleStatementExportAccordion(
    section: 'client' | 'document' | 'services' | 'treatments' | 'nextOfKin' | 'payment' | 'amounts' | 'footer'
  ): void {
    this.statementExportAccordion[section] = !this.statementExportAccordion[section];
  }

  isConsultAccordionOpen(section: string): boolean {
    return !!this.consultAccordion[section];
  }

  toggleConsultAccordion(section: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.consultAccordion[section] = !this.consultAccordion[section];
    if (!this.consultAccordion[section]) {
      if (section === 'presenting') {
        this.pcPickerOpen = null;
        this.pcPickerSearch = '';
      }
      if (section === 'physicalExam') {
        this.pePickerOpen = null;
        this.pePickerSearch = '';
      }
    }
  }

  openConsultAccordion(section: string): void {
    this.consultAccordion[section] = true;
  }

  closeStatementExportModal(): void {
    this.showStatementExportModal = false;
    this.restoreBodyScrollUnlessModalOpen();
  }

  get statementExportDocumentTitle(): string {
    switch (this.statementExportDocumentType) {
      case 'DISCHARGE_FORM':
        return 'SYSTEM GENERATED DISCHARGE FORM';
      case 'MEDICAL_FORM':
        return 'SYSTEM GENERATED MEDICAL FORM';
      default:
        return 'SYSTEM GENERATED MEDICAL REPORT';
    }
  }

  get allStatementExportClientFieldsSelected(): boolean {
    return this.statementExportClientFieldOptions.every(
      (field) => this.statementExportClientFields[field.key]
    );
  }

  toggleAllStatementExportClientFields(checked: boolean): void {
    for (const field of this.statementExportClientFieldOptions) {
      this.statementExportClientFields[field.key] = checked;
    }
  }

  isStatementExportTreatmentSelected(id: number): boolean {
    return this.statementExportSelectedTreatmentIds.includes(Number(id));
  }

  toggleStatementExportTreatment(id: number): void {
    const treatmentId = Number(id);
    if (this.isStatementExportTreatmentSelected(treatmentId)) {
      this.statementExportSelectedTreatmentIds = this.statementExportSelectedTreatmentIds.filter(
        (value) => value !== treatmentId
      );
    } else {
      this.statementExportSelectedTreatmentIds = [...this.statementExportSelectedTreatmentIds, treatmentId];
    }
  }

  get allStatementExportTreatmentsSelected(): boolean {
    const rows = this.treatmentsList || [];
    if (!rows.length) {
      return false;
    }
    return rows.every((row) => this.isStatementExportTreatmentSelected(row.id));
  }

  toggleAllStatementExportTreatments(checked: boolean): void {
    if (checked) {
      this.statementExportSelectedTreatmentIds = (this.treatmentsList || [])
        .map((row) => Number(row?.id))
        .filter((id) => Number.isFinite(id) && id > 0);
    } else {
      this.statementExportSelectedTreatmentIds = [];
    }
  }

  statementExportTreatmentDescription(row: any): string {
    const parts = [
      row?.amountPerFrequencyValue,
      row?.amountPerFrequencyUnit,
      row?.frequencyValue ? `${row.frequencyValue} X` : '',
      row?.frequencyUnit,
      row?.durationValue ? `FOR ${row.durationValue}` : '',
      row?.durationUnit,
    ]
      .filter((part) => part != null && String(part).trim() !== '')
      .map((part) => String(part).trim());
    return parts.join(' ');
  }

  isStatementExportProcedureSelected(id: number): boolean {
    return this.statementExportSelectedProcedureIds.includes(Number(id));
  }

  toggleStatementExportProcedure(id: number): void {
    const procedureId = Number(id);
    if (this.isStatementExportProcedureSelected(procedureId)) {
      this.statementExportSelectedProcedureIds = this.statementExportSelectedProcedureIds.filter(
        (value) => value !== procedureId
      );
    } else {
      this.statementExportSelectedProcedureIds = [...this.statementExportSelectedProcedureIds, procedureId];
    }
  }

  get allStatementExportProceduresSelected(): boolean {
    const rows = this.proceduresList || [];
    if (!rows.length) {
      return false;
    }
    return rows.every((row) => this.isStatementExportProcedureSelected(row.id));
  }

  toggleAllStatementExportProcedures(checked: boolean): void {
    if (checked) {
      this.statementExportSelectedProcedureIds = (this.proceduresList || [])
        .map((row) => Number(row?.id))
        .filter((id) => Number.isFinite(id) && id > 0);
    } else {
      this.statementExportSelectedProcedureIds = [];
    }
  }

  confirmStatementExportPdf(): void {
    if (!this.visitId || this.isExportingStatement) {
      return;
    }
    const documentType = this.statementExportDocumentType || 'MEDICAL_REPORT';
    const treatmentRequestedIds = [...this.statementExportSelectedTreatmentIds];
    const procedureRequestedIds = [...this.statementExportSelectedProcedureIds];
    const includeNextOfKin = this.statementExportIncludeNextOfKin;
    const includePaymentTable = this.statementExportIncludePaymentTable;
    const includeAmountColumns = this.statementExportIncludeAmountColumns;
    const includeFooter = this.statementExportIncludeFooter;
    const clientFields = { ...this.statementExportClientFields };
    this.isExportingStatement = true;
    this.closeStatementExportModal();
    this.api
      .exportMedicalStatementPdf(this.visitId, {
        treatmentRequestedIds,
        procedureRequestedIds,
        includeNextOfKin,
        includePaymentTable,
        includeAmountColumns,
        includeFooter,
        documentType,
        ...clientFields,
      })
      .subscribe({
        next: (res: Blob) => {
          this.isExportingStatement = false;
          const blob = new Blob([res], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'statement.pdf';
          a.click();
          window.URL.revokeObjectURL(url);
          this.showStatusMessage('Statement PDF downloaded.', 'success');
        },
        error: (error) => {
          this.isExportingStatement = false;
          this.showStatusMessage(error?.message || 'Could not export statement PDF.', 'error');
          console.error('Error generating statement PDF:', error);
        },
      });
  }

  saveConsultation(): void {
    if (!this.visitId) {
      this.showStatusMessage('Select a visit before saving consultation.', 'error');
      return;
    }

    this.isSavingConsultation = true;
    const chiefFromPcs = (this.presentingComplaintsList || [])
      .map((pc) => String(pc?.complaint || '').trim())
      .filter(Boolean)
      .join('; ');
    const examFromList = (this.physicalExaminationsList || [])
      .map((pe) => {
        const system = String(pe?.system || '').trim();
        const findings = String(pe?.findings || '').trim();
        if (!system && !findings) {
          return '';
        }
        if (!system) {
          return findings;
        }
        if (!findings) {
          return system;
        }
        return `${system}: ${findings}`;
      })
      .filter(Boolean)
      .join('; ');
    const payload = {
      ...this.consultationForm,
      chiefComplaint: chiefFromPcs || this.consultationForm.chiefComplaint || '',
      clinicalExamination: examFromList || this.consultationForm.clinicalExamination || '',
      doneBy: this.userName,
      complaints: [],
    };

    this.api.saveConsultation(this.visitId, payload).subscribe({
      next: (response: any) => {
        this.isSavingConsultation = false;
        this.showStatusMessage(response?.message || 'Consultation saved.', 'success');
        this.loadConsultation();
      },
      error: (err) => {
        this.isSavingConsultation = false;
        this.showStatusMessage(err?.error?.message || 'Failed to save consultation.', 'error');
      },
    });
  }

  formatVisitLabel(visit: any): string {
    if (!visit) {
      return 'Select order';
    }
    const number = visit.visitNumber ?? visit.id ?? '';
    const date = visit.visitDate || visit.createdAt || '';
    const dateLabel = date ? ` • ${this.formatVisitDateDayMonthYear(date)}` : '';
    return `Order #${this.formatVisitNumberTwoDigits(number)}${dateLabel}`;
  }

  formatVisitNumberTwoDigits(value: any): string {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return String(value ?? '');
    }
    return n < 10 ? `0${n}` : String(n);
  }

  formatVisitDateDayMonthYear(value: any): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  getVisitStatusPillColor(status: string): string {
    const s = (status || 'open').toLowerCase();
    if (s === 'open') {
      return '#059669';
    }
    if (s === 'closed') {
      return '#dc2626';
    }
    return '#64748b';
  }

  formatDate(value: any): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleDateString();
  }

  formatMoney(value: any): string {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return '0';
    }
    return num.toLocaleString('en-UG');
  }

  private resolveVisitBalanceDue(visit: any): number {
    const due = Number(
      visit?.balanceDue ??
        visit?.BalanceDue ??
        visit?.amountDue ??
        visit?.invoiceBalanceDue ??
        NaN
    );
    return Number.isFinite(due) ? due : 0;
  }

  private todayInputDate(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private nowInputTime(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private toInputDate(value: any): string {
    if (value == null || value === '') {
      return '';
    }
    const raw = String(value).trim().replace(/\//g, '-');
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(0, 10);
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private toInputTime(value: any): string {
    if (value == null || value === '') {
      return '';
    }
    const raw = String(value).trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    return '';
  }

  private toApiTime(value: string | null | undefined): string | null {
    const t = String(value || '').trim();
    if (!t) {
      return null;
    }
    return t.length === 5 ? `${t}:00` : t;
  }

  formatBillingCell(value: any): string {
    if (value == null || value === '') {
      return '—';
    }
    const num = Number(value);
    if (Number.isFinite(num)) {
      if (num === 0) {
        return '0.0000';
      }
      return num.toLocaleString('en-UG', {
        maximumFractionDigits: 0,
      });
    }
    return String(value);
  }

  onProfileImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/vector.jpeg';
  }

  private bootstrapFromSession(): void {
    let stored: any = {};
    try {
      stored = JSON.parse(sessionStorage.getItem('item') || '{}');
    } catch {
      stored = {};
    }

    const client = this.normalizeClientRecord(stored);
    const id = Number(client.id ?? client.clientId);
    if (!Number.isFinite(id) || id <= 0) {
      this.showStatusMessage('Open a client from the registry or queue to start consultation.', 'info');
      return;
    }

    this.applyClient(client);
    this.api.getClientById(id).subscribe({
      next: (res: any) => {
        const fresh = this.normalizeClientRecord(res?.data ?? res);
        if (fresh?.id || fresh?.clientId) {
          this.applyClient(fresh);
        }
      },
      error: () => undefined,
    });

    let initialVisit: any = null;
    try {
      initialVisit = JSON.parse(sessionStorage.getItem('initialClientVisit') || 'null');
    } catch {
      initialVisit = null;
    }

    this.loadClientVisits(id, initialVisit);
    this.loadClientGroups();
  }

  private applyClient(client: any): void {
    this.clientId = Number(client.id ?? client.clientId) || null;
    this.clientFirstName = this.capitalizeNamePart(client.clientFirstName || '');
    this.clientSecondName = this.capitalizeNamePart(client.clientSecondName || '');
    this.clientFileNo = client.clientFileNo || '';
    this.clientProfilePic = client.clientProfilePic || 'assets/images/vector.jpeg';
    this.clientGender = client.clientGender || '';
    this.clientAge = client.clientAge || '';
    this.clientContact = client.clientContact || '';
    this.clientAddress = client.clientAddress || '';
    this.clientDateOfBirth = client.clientDateOfBirth || '';
    this.clientOccupation = client.clientOccupation || '';
    this.clientGroupId =
      client.clientGroupId ??
      client.clientGroup?.id ??
      client.group_id ??
      null;
    this.clientGroupName =
      client.clientGroupName ||
      client.clientGroup?.groupNameShortForm ||
      client.clientGroup?.groupName ||
      '';
    this.nextOfKinName = client.nextOfKinName || '';
    this.nextOfKinContact = client.nextOfKinContact || '';
    this.nextOfKinAddress = client.nextOfKinAddress || '';
    this.relationship = client.relationship || '';

    this.refreshClientTotalDebt();
  }

  private loadClientGroups(): void {
    this.api.getClientGroupList().subscribe({
      next: (res) => {
        this.clientGroupList = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.clientGroupList = [];
      },
    });
  }

  private loadQueueClientModules(): void {
    this.api.getAllBusinessModules().subscribe({
      next: (res: any) => {
        this.queueClientModules = normalizeBusinessModules(res);
        this.queueClientForm.fromModuleId = ensureFromModuleInList(
          this.queueClientForm.fromModuleId,
          this.queueClientModules
        );
        if (!this.queueClientForm.fromModuleId) {
          this.queueClientForm.fromModuleId = pickDefaultFromModuleId(this.queueClientModules);
        }
      },
      error: () => {
        this.queueClientModules = [];
      },
    });
  }

  private loadClientVisits(clientId: number, preferredVisit?: any): void {
    this.isLoadingVisits = true;
    this.api.getInitialTriageVitalsForVisitId(clientId).subscribe({
      next: (res: any) => {
        this.clientVisitList = this.sortVisitsNewestFirst(Array.isArray(res) ? res : []);
        this.isLoadingVisits = false;

        if (preferredVisit?.id) {
          const match = this.clientVisitList.find((v) => Number(v.id) === Number(preferredVisit.id));
          this.loadVisit(match || preferredVisit);
          return;
        }

        if (!this.visitId && this.clientVisitList.length) {
          const openVisit = this.clientVisitList.find((v) => v.visitStatus === 'open');
          this.loadVisit(openVisit || this.clientVisitList[0]);
        }
      },
      error: () => {
        this.clientVisitList = [];
        this.isLoadingVisits = false;
      },
    });
  }

  private loadVisit(visit: any): void {
    if (!visit?.id) {
      this.clearVisitState();
      return;
    }

    this.visit = visit;
    this.visitId = Number(visit.id);
    this.visitStatus = visit.visitStatus || '';
    this.isOpenVisit = visit.visitStatus === 'open';
    this.isClosedVisit = visit.visitStatus === 'closed';
    this.hasNoVisit = false;

    this.loadVitals();
    this.loadConsultation();
    this.loadServices();
    this.loadPharmacy();
    this.loadInvoice();
    this.loadVisitBillingSummary();
    this.loadPayments();
    this.refreshTransactionProgress();
    if (this.activeTab === 'quotation') {
      this.loadOrderQuotations();
    } else if (this.activeTab === 'proforma') {
      this.loadOrderProformas();
    } else if (this.activeTab === 'sales_invoice') {
      this.loadOrderSalesInvoices();
    } else if (this.activeTab === 'receipt') {
      this.loadOrderReceipts();
    }
  }

  private clearVisitState(): void {
    this.visit = null;
    this.visitId = null;
    this.visitStatus = '';
    this.isOpenVisit = false;
    this.isClosedVisit = false;
    this.hasNoVisit = true;
    this.resetProgressStageDone();
    this.vitalsList = [];
    this.consultationForm = this.emptyConsultationForm();
    this.presentingComplaintsList = [];
    this.showPresentingComplaintEditor = false;
    this.editingPresentingComplaintId = null;
    this.closeModernPicker();
    this.physicalExaminationsList = [];
    this.showPhysicalExaminationEditor = false;
    this.editingPhysicalExaminationId = null;
    this.diagnosesList = [];
    this.showDiagnosisEditor = false;
    this.editingDiagnosisId = null;
    this.showCatalogEditor = false;
    this.catalogEditorKind = null;
    this.proceduresList = [];
    this.treatmentsList = [];
    this.invoice = null;
    this.orderQuotations = [];
    this.orderProformas = [];
    this.orderSalesInvoices = [];
    this.orderReceipts = [];
    this.resetVisitBillingSummary();
  }

  private fillCreateVisitFormFromClient(): void {
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.createVisitFormData = {
      visitDate: this.normalizeDateForInput(now),
      visitTime: defaultTime,
      visitStatus: 'open',
      visitType: 'outpatient',
      visitReason: '',
      clientAge: this.clientAge != null && this.clientAge !== '' ? String(this.clientAge) : '',
      clientContact: this.clientContact || '',
      clientAddress: this.clientAddress || '',
      nextOfKinName: this.nextOfKinName || '',
      nextOfKinAddress: this.nextOfKinAddress || '',
      nextOfKinContact: this.nextOfKinContact || '',
      relationship: this.relationship || '',
      occupation: this.clientOccupation || '',
    };
  }

  private fillCreateVisitFormClientFields(): void {
    this.createVisitFormData = {
      ...this.createVisitFormData,
      clientAge: this.clientAge != null && this.clientAge !== '' ? String(this.clientAge) : '',
      clientContact: this.clientContact || '',
      clientAddress: this.clientAddress || '',
      nextOfKinName: this.nextOfKinName || '',
      nextOfKinAddress: this.nextOfKinAddress || '',
      nextOfKinContact: this.nextOfKinContact || '',
      relationship: this.relationship || '',
      occupation: this.clientOccupation || '',
    };
  }

  private buildNewVisitPayload(formValue?: Partial<CreateVisitFormModel>) {
    const merged = {
      ...this.createVisitFormData,
      ...(formValue || {}),
    };

    const ageRaw = merged.clientAge;
    let clientAge: string | null = null;
    if (ageRaw !== undefined && ageRaw !== null && String(ageRaw).trim() !== '') {
      const n = parseFloat(String(ageRaw).replace(',', '.'));
      if (Number.isFinite(n)) {
        clientAge = n.toFixed(2);
      }
    }

    return {
      visitDate: merged.visitDate || null,
      visitTime: merged.visitTime || null,
      visitStatus: merged.visitStatus || 'open',
      visitType: merged.visitType || null,
      visitReason: merged.visitReason || null,
      clientAge,
      clientContact: merged.clientContact || null,
      clientAddress: merged.clientAddress || null,
      nextOfKinName: merged.nextOfKinName || null,
      nextOfKinAddress: merged.nextOfKinAddress || null,
      nextOfKinContact: merged.nextOfKinContact || null,
      relationship: merged.relationship || null,
      occupation: merged.occupation || null,
    };
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

  private sortVisitsNewestFirst(visits: any[]): any[] {
    return [...visits].sort((a, b) => {
      const an = Number(a?.visitNumber ?? a?.id ?? 0);
      const bn = Number(b?.visitNumber ?? b?.id ?? 0);
      if (an !== bn) {
        return bn - an;
      }
      return Number(b?.id ?? 0) - Number(a?.id ?? 0);
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

  private refreshClientTotalDebt(): void {
    if (!this.clientId) {
      return;
    }
    this.api.getTotalClientBalanceDue(this.clientId).subscribe({
      next: (res: any) => {
        this.totalAmountDue = Number(res?.TotalAmountDue ?? res?.totalAmountDue ?? 0) || 0;
      },
      error: () => {
        this.totalAmountDue = 0;
      },
    });
  }

  private getDefaultPayAllDebtAmount(): number | null {
    const visitOutstanding = this.payAllDebtTotalOutstanding();
    if (visitOutstanding > 0) {
      return visitOutstanding;
    }
    return null;
  }

  private isPayAllDebtNoOutstandingMessage(message: string): boolean {
    return (message || '').toLowerCase().includes('no outstanding visit balances');
  }

  private normalizeDateForInput(value: any): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'object' && value.year != null && value.month != null && value.day != null) {
      return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
    }
    const raw = String(value).trim();
    const slashMatch = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (slashMatch) {
      return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
    }
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return raw.includes('T') ? raw.split('T')[0] : raw;
  }

  private normalizeClientGenderForEdit(raw: any): string {
    if (raw == null || String(raw).trim() === '') {
      return '';
    }
    const s = String(raw).trim().toLowerCase();
    if (s === 'female' || s.includes('female') || s === 'f') {
      return 'Female';
    }
    if (s === 'male' || s.includes('male') || s === 'm') {
      return 'Male';
    }
    if (s === 'other') {
      return 'Other';
    }
    return String(raw).trim();
  }

  private coerceClientAgeForEdit(raw: any): number | null {
    if (raw === undefined || raw === null || raw === '') {
      return null;
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === 'string') {
      const n = parseFloat(raw.replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  private formatClientDateForApi(value: any): string | null {
    if (!value || String(value).trim() === '') {
      return null;
    }
    const normalized = this.normalizeDateForInput(value);
    if (!normalized) {
      return null;
    }
    return normalized.replace(/-/g, '/');
  }

  private normalizeTimeForInput(value: any): string {
    if (!value) {
      return '';
    }
    const raw = String(value).trim();
    const timePart = raw.includes('T') ? raw.split('T')[1] : raw;
    const clean = timePart.replace('Z', '').trim();
    const hhmm = clean.slice(0, 5);
    return /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : '';
  }

  private emptyVitalForm(): any {
    const now = new Date();
    return {
      temperature: null,
      diastolic: null,
      systolic: null,
      pulseRate: null,
      spO2: null,
      heartRate: null,
      respiratoryRate: null,
      weight: null,
      height: null,
      muac: null,
      dateTaken: this.normalizeDateForInput(now),
      timeTaken: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    };
  }

  private prepareVitalPayload(raw: any): any {
    const data = { ...raw };
    const numericFields = [
      'temperature',
      'diastolic',
      'systolic',
      'pulseRate',
      'spO2',
      'weight',
      'height',
      'muac',
    ];
    for (const field of numericFields) {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        data[field] = parseFloat(String(data[field]));
      } else {
        data[field] = null;
      }
    }
    if (data.heartRate !== undefined && data.heartRate !== null && data.heartRate !== '') {
      data.heartRate = parseInt(String(data.heartRate), 10);
    } else {
      data.heartRate = null;
    }
    if (data.respiratoryRate !== undefined && data.respiratoryRate !== null && data.respiratoryRate !== '') {
      data.respiratoryRate = parseInt(String(data.respiratoryRate), 10);
    } else {
      data.respiratoryRate = null;
    }
    if (data.pulseRate !== undefined && data.pulseRate !== null && data.pulseRate !== '') {
      data.pulseRate = parseInt(String(data.pulseRate), 10);
    } else {
      data.pulseRate = null;
    }
    if (!data.station || data.station === 'Station') {
      data.station = 'Triage';
    }
    data.takenBy = (this.userName || sessionStorage.getItem('username') || 'Nurse').trim();
    if (data.timeTaken) {
      const date = new Date(`1970-01-01T${data.timeTaken}`);
      data.timeTaken = date.toISOString().substring(11, 19);
    } else {
      data.timeTaken = null;
    }
    // Backend @JsonbDateFormat expects yyyy/MM/dd (not HTML date input yyyy-MM-dd).
    data.dateTaken = this.formatVitalDateForApi(data.dateTaken);
    return data;
  }

  private formatVitalDateForApi(value: any): string | null {
    if (value == null || value === '') {
      return null;
    }
    if (typeof value === 'object' && value.year != null && value.month != null && value.day != null) {
      return `${value.year}/${String(value.month).padStart(2, '0')}/${String(value.day).padStart(2, '0')}`;
    }
    const raw = String(value).trim();
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}/${isoMatch[2]}/${isoMatch[3]}`;
    }
    const slashMatch = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (slashMatch) {
      return `${slashMatch[1]}/${slashMatch[2]}/${slashMatch[3]}`;
    }
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}/${mm}/${dd}`;
    }
    return null;
  }

  private hasAnyVitalMeasurement(data: any): boolean {
    const fields = [
      'temperature',
      'diastolic',
      'systolic',
      'pulseRate',
      'spO2',
      'heartRate',
      'respiratoryRate',
      'weight',
      'height',
      'muac',
    ];
    return fields.some((field) => {
      const value = data?.[field];
      return value !== null && value !== undefined && value !== '';
    });
  }

  private computeShockIndex(vital: any): number | null {
    if (!vital) {
      return null;
    }
    const hrRaw = vital.heartRate ?? vital.pulseRate;
    const hr = Number(hrRaw);
    let sbp = Number(vital.systolic);
    if (!Number.isFinite(sbp) || sbp <= 0) {
      return null;
    }
    if (!Number.isFinite(hr) || hr <= 0) {
      return null;
    }
    const index = hr / sbp;
    return Number.isFinite(index) ? Math.round(index * 100) / 100 : null;
  }

  private getShockIndexTone(index: number | null): VitalTone | null {
    if (index == null) {
      return null;
    }
    if (index > 0.9) {
      return 'critical';
    }
    if (index >= 0.5 && index <= 0.7) {
      return 'normal';
    }
    return 'warning';
  }

  private getBpTone(systolic: any, diastolic: any): VitalTone | null {
    const sys = Number(systolic);
    const dia = Number(diastolic);
    const hasSys = Number.isFinite(sys) && sys > 0;
    const hasDia = Number.isFinite(dia) && dia > 0;
    if (!hasSys && !hasDia) {
      return null;
    }
    if ((hasSys && sys >= 180) || (hasDia && dia >= 120) || (hasSys && sys < 90) || (hasDia && dia < 50)) {
      return 'critical';
    }
    if ((hasSys && sys >= 140) || (hasDia && dia >= 90)) {
      return 'critical';
    }
    if ((hasSys && sys >= 130) || (hasDia && dia >= 80) || (hasSys && sys >= 120 && (!hasDia || dia < 80))) {
      return 'warning';
    }
    if (hasSys && hasDia && sys < 120 && dia < 80) {
      return 'normal';
    }
    if (hasSys && sys < 120) {
      return 'normal';
    }
    return 'warning';
  }

  /** Height in metres: UI stores metres; still accepts legacy cm. */
  private vitalHeightMeters(height: unknown): number | null {
    const h = Number(height);
    if (!Number.isFinite(h) || h <= 0) {
      return null;
    }
    if (h >= 0.25 && h <= 2.8) {
      return h;
    }
    if (h >= 90 && h <= 260) {
      return h / 100;
    }
    return null;
  }

  private computeVitalBmi(vital: any): number | null {
    if (!vital) {
      return null;
    }
    const fromApi = Number(vital.bmi);
    if (vital.bmi != null && vital.bmi !== '' && Number.isFinite(fromApi) && fromApi > 0) {
      return Math.round(fromApi * 10) / 10;
    }
    const w = Number(vital.weight);
    const hm = this.vitalHeightMeters(vital.height);
    if (!Number.isFinite(w) || w <= 0 || hm == null || hm <= 0) {
      return null;
    }
    const bmi = w / (hm * hm);
    if (!Number.isFinite(bmi)) {
      return null;
    }
    return Math.round(bmi * 10) / 10;
  }

  /** WHO-style BMI bands: green normal, yellow under/overweight, red obese/severe underweight. */
  private getBmiTone(bmi: number | null): VitalTone | null {
    if (bmi == null || !Number.isFinite(bmi)) {
      return null;
    }
    if (bmi < 17 || bmi >= 30) {
      return 'critical';
    }
    if (bmi < 18.5 || bmi >= 25) {
      return 'warning';
    }
    return 'normal';
  }

  /**
   * Estimate MUAC (cm) from BMI using inverted adult MUAC–BMI regression
   * (BMI ≈ -7.797 + 1.153 × MUAC).
   */
  private estimateMuacFromBmi(bmi: number): number {
    const muac = (bmi + 7.797) / 1.153;
    return Math.round(muac * 10) / 10;
  }

  private syncAutoMuacFromWeightHeight(): void {
    if (!this.currentVital) {
      return;
    }
    const bmi = this.computeVitalBmi({
      weight: this.currentVital.weight,
      height: this.currentVital.height,
      bmi: null,
    });
    if (bmi == null) {
      return;
    }
    const muac = this.estimateMuacFromBmi(bmi);
    // New object reference so the template always refreshes MUAC + colors.
    this.currentVital = {
      ...this.currentVital,
      muac,
    };
  }

  /** Adult MUAC nutrition bands (cm), aligned with BMI-style green / yellow / red. */
  private getMuacTone(muac: any): VitalTone | null {
    const m = Number(muac);
    if (!Number.isFinite(m) || m <= 0) {
      return null;
    }
    if (m < 19 || m >= 34) {
      return 'critical';
    }
    if (m < 23.5 || m >= 30) {
      return 'warning';
    }
    return 'normal';
  }

  private buildTreatmentRequestPayload(): any | null {
    const itemId = Number(this.currentItemId);
    const visitId = Number(this.visitId);
    const stockBatchId = Number(this.currentStockBatchId);
    if (!Number.isFinite(itemId) || itemId <= 0 || !Number.isFinite(visitId) || visitId <= 0) {
      return null;
    }
    const hasStockBatch = Number.isFinite(stockBatchId) && stockBatchId > 0;
    if (this.pharmacyUseStockBatch && !hasStockBatch) {
      return null;
    }

    const f = this.pharmacyForm;
    const quantity = Number(f.quantity);
    const totalUnits = Number(f.totalUnits);
    const durationValue = Number(f.durationValue);
    const durationUnit = parseTreatmentPeriodUnitToDayFraction(f.durationUnit) ?? Number(f.durationUnit);
    const frequencyValue = Number(f.frequencyValue);
    const frequencyUnit = parseTreatmentPeriodUnitToDayFraction(f.frequencyUnit) ?? Number(f.frequencyUnit);
    const amountPerFrequencyValue = Number(f.amountPerFrequencyValue);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(totalUnits) ||
      totalUnits <= 0 ||
      !Number.isFinite(durationValue) ||
      durationValue < 0 ||
      !Number.isFinite(frequencyValue) ||
      frequencyValue <= 0 ||
      !Number.isFinite(amountPerFrequencyValue) ||
      amountPerFrequencyValue <= 0 ||
      !Number.isFinite(durationUnit) ||
      durationUnit <= 0 ||
      !Number.isFinite(frequencyUnit) ||
      frequencyUnit <= 0
    ) {
      return null;
    }

    const payload: {
      quantity: number;
      itemId: number;
      visitId: number;
      durationValue: number;
      durationUnit: number;
      amountPerFrequencyValue: number;
      amountPerFrequencyUnit: string;
      frequencyValue: number;
      totalUnits: number;
      frequencyUnit: number;
      estimatedUnits: number;
      totalAmount: number;
      unitSellingModelId?: number;
      unitBuy?: number;
      unitSellingPrice?: number;
      instructions: string;
      route: string;
      diagnosisId?: number;
      stockBatchId?: number;
    } = {
      quantity,
      itemId,
      visitId,
      durationValue,
      durationUnit,
      amountPerFrequencyValue,
      amountPerFrequencyUnit: String(f.amountPerFrequencyUnit || 'tablet').trim(),
      frequencyValue,
      totalUnits,
      frequencyUnit,
      estimatedUnits: Number(f.estimatedUnits) || Math.round(totalUnits || 0),
      totalAmount: Number(f.totalAmount) || 0,
      unitSellingModelId: this.selectedUnitSellingModelId ?? undefined,
      unitBuy: this.unitBuy || undefined,
      unitSellingPrice: this.itemSellingPrice || undefined,
      instructions: String(f.instructions || '').trim(),
      route: String(f.route || 'Oral').trim(),
      diagnosisId: f.diagnosisId != null && Number(f.diagnosisId) > 0 ? Number(f.diagnosisId) : undefined,
    };
    if (this.pharmacyUseStockBatch && hasStockBatch) {
      payload.stockBatchId = stockBatchId;
    }
    return payload;
  }

  private pharmacyPrescriptionValidationMessage(): string {
    if (this.pharmacyUseStockBatch && !this.currentStockBatchId) {
      return 'Select a stock batch first.';
    }
    if (!this.pharmacyUseStockBatch && !this.currentItemId) {
      return 'Select a stock item first.';
    }
    if (!this.currentItemId) {
      return 'Select a drug or item first.';
    }
    const f = this.pharmacyForm;
    if (!parseTreatmentPeriodUnitToDayFraction(f.frequencyUnit) && !(Number(f.frequencyUnit) > 0)) {
      return 'Select a frequency unit (Minute / Hour / Day / Week / Month).';
    }
    if (!parseTreatmentPeriodUnitToDayFraction(f.durationUnit) && !(Number(f.durationUnit) > 0)) {
      return 'Select a duration unit (Minute / Hour / Day / Week / Month).';
    }
    if (!(Number(f.quantity) > 0) || !(Number(f.frequencyValue) > 0) || !(Number(f.amountPerFrequencyValue) > 0)) {
      return 'Complete dose, frequency, and quantity before saving.';
    }
    return 'Complete prescription details before saving.';
  }

  private loadProcedureCatalog(): void {
    if (this.procedureCatalog.length || this.isLoadingProcedureCatalog) {
      return;
    }
    this.isLoadingProcedureCatalog = true;
    this.api.getOtherProcedureList().subscribe({
      next: (res: any) => {
        this.procedureCatalog = Array.isArray(res) ? res : [];
        this.isLoadingProcedureCatalog = false;
      },
      error: () => {
        this.procedureCatalog = [];
        this.isLoadingProcedureCatalog = false;
      },
    });
  }

  private loadPharmacyDrugList(): void {
    if (this.isLoadingPharmacyItems) {
      return;
    }
    this.isLoadingPharmacyItems = true;
    this.api.getAllItems().subscribe({
      next: (items: any) => {
        this.pharmacyItemList = Array.isArray(items) ? items : [];
        this.isLoadingPharmacyItems = false;
        if (this.currentItemId != null) {
          const selected = this.pharmacyItemList.find(
            (row) => Number(row?.id) === Number(this.currentItemId)
          );
          if (selected) {
            this.availableQuantity = Number(selected.stockAtHand) || 0;
            this.unitBuy = Number(selected.costPrice) || 0;
            this.unitOfMeasure = selected.uintOfMeasure || selected.unitOfMeasure || '';
            this.pharmacyStockDistributionTotal = this.availableQuantity;
          }
        }
      },
      error: () => {
        this.pharmacyItemList = [];
        this.isLoadingPharmacyItems = false;
      },
    });
  }

  private loadPharmacyStockBatches(): void {
    if (this.isLoadingStock) {
      return;
    }
    this.isLoadingStock = true;
    forkJoin({
      stores: this.api.getAllStores().pipe(
        map((res: any) => (Array.isArray(res) ? res : res?.data ?? [])),
        catchError(() => of([]))
      ),
      batches: this.api.getAllStockBatches().pipe(
        map((res: any) => (Array.isArray(res) ? res : res?.data ?? [])),
        catchError(() => of([]))
      ),
    }).subscribe({
      next: ({ stores, batches }: { stores: any[]; batches: any[] }) => {
        this.pharmacyStoreList = stores || [];
        this.pharmacyStockItemList = (batches || []).map((batch: any) =>
          this.mapPharmacyStockBatchToDropdownItem(batch)
        );
        this.isLoadingStock = false;
        this.refreshPharmacyGroupedStockItems(
          this.showSundriesModal ? this.sundryBatchSearch : this.pharmacyDrugSearchText
        );
      },
      error: () => {
        this.pharmacyStoreList = [];
        this.pharmacyStockItemList = [];
        this.pharmacyGroupedStockItems = [];
        this.isLoadingStock = false;
      },
    });
  }

  private filteredPharmacyStockItemList(searchText?: string): any[] {
    if (!Array.isArray(this.pharmacyStockItemList)) {
      return [];
    }
    let filtered = [...this.pharmacyStockItemList];
    const q = (searchText ?? this.pharmacyDrugSearchText)?.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((item) => {
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
    return filtered.sort(
      (a, b) => (b?._stockBatchId ?? b?.id ?? 0) - (a?._stockBatchId ?? a?.id ?? 0)
    );
  }

  private refreshPharmacyGroupedStockItems(searchText?: string): void {
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

    for (const batch of this.filteredPharmacyStockItemList(searchText)) {
      const itemKey = String(batch.stockItemId ?? batch.stockItemName ?? batch.id ?? '').trim();
      if (!itemKey) {
        continue;
      }
      let group = itemMap.get(itemKey);
      if (!group) {
        group = {
          itemKey,
          stockItemName: String(batch.stockItemName ?? this.plainPharmacyDrugName(batch)).trim(),
          batchLineMap: new Map<string, BatchLine>(),
        };
        itemMap.set(itemKey, group);
      }

      const batchKey = this.pharmacyStockBatchLineKey(itemKey, batch);
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

    this.pharmacyGroupedStockItems = Array.from(itemMap.values())
      .map((group) => {
        const batchLines = Array.from(group.batchLineMap.values())
          .filter((line) => this.pharmacyBatchLineTotalStock(line.distributions) > 0)
          .map((line) => {
            const expiry = this.pharmacyBatchLineExpiryInfo(line.distributions);
            const pricing = extractBatchLinePricing(line.distributions);
            return {
              batchKey: line.batchKey,
              batchLabel: line.batchLabel,
              expiryLabel: expiry.label,
              expiryTone: expiry.tone,
              totalStock: this.pharmacyBatchLineTotalStock(line.distributions),
              unitCost: pricing.unitCost,
              sellingModels: pricing.sellingModels,
              storeDistribution: this.buildPharmacyBatchStoreDistribution(line.distributions),
            };
          })
          .sort((a, b) =>
            a.batchLabel.localeCompare(b.batchLabel, undefined, { sensitivity: 'base', numeric: true })
          );
        return {
          itemKey: group.itemKey,
          stockItemName: group.stockItemName,
          completelyOutOfStock: batchLines.length === 0,
          batchLines,
        };
      })
      .sort((a, b) =>
        a.stockItemName.localeCompare(b.stockItemName, undefined, { sensitivity: 'base' })
      );
  }

  private buildPharmacyBatchStoreDistribution(distributions: any[]): {
    storeId: number;
    storeName: string;
    qtyLabel: string;
    storeLabel: string;
    item: any | null;
  }[] {
    const byStoreId = new Map<number, any>();
    for (const row of distributions) {
      const sid = Number(row?.storeId);
      if (Number.isFinite(sid) && sid > 0 && Number(row?.stockAtHand ?? 0) > 0) {
        byStoreId.set(sid, row);
      }
    }
    const defaultUom = String(
      distributions[0]?.uintOfMeasure ?? distributions[0]?.unitOfMeasure ?? 'unit'
    ).trim();

    return Array.from(byStoreId.values())
      .map((item) => {
        const storeId = Number(item.storeId);
        const storeName = this.resolvePharmacyStoreDisplayName(
          storeId,
          item.storeName ?? item.store_name
        );
        const qty = Number(item.stockAtHand ?? 0);
        const uom = String(item.uintOfMeasure ?? item.unitOfMeasure ?? defaultUom).trim();
        const qtyLabel = uom ? `Qty: ${qty} ${uom}` : `Qty: ${qty}`;
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

  private pharmacyStockBatchLineKey(itemKey: string, batch: any): string {
    const batchNumber = String(batch.batchNumber ?? '').trim();
    if (batchNumber) {
      return `${itemKey}::bn:${batchNumber}`;
    }
    return `${itemKey}::id:${batch._stockBatchId ?? batch.id ?? ''}`;
  }

  private pharmacyBatchLineTotalStock(distributions: any[]): number {
    return distributions.reduce((sum, row) => sum + Number(row?.stockAtHand ?? 0), 0);
  }

  private mapPharmacyStockBatchToDropdownItem(batch: any): any {
    if (!batch) {
      return { id: null, title: '', stockAtHand: 0 };
    }
    const stockItemId =
      batch.stockItemId ??
      batch.stockItem?.id ??
      batch.consumableItemId ??
      batch.consumableItems?.id ??
      batch.itemId;
    const name = this.plainPharmacyDrugName(batch);
    const batchPart =
      batch.batchNumber != null && String(batch.batchNumber).trim() !== ''
        ? `Batch ${batch.batchNumber}`
        : batch.batchNo != null && String(batch.batchNo).trim() !== ''
          ? `Batch ${batch.batchNo}`
          : `Batch #${batch.id ?? '?'}`;
    const expiryLabel = this.formatPharmacyBatchExpiryShort(batch);
    const storeId = Number(batch?.storeId ?? batch?.store_id ?? 0) || null;
    const storeName = this.resolvePharmacyStoreDisplayName(
      storeId ?? 0,
      batch?.storeName ?? batch?.store_name
    );
    const prescribing = resolveStockPrescribingSource(batch);
    const stockAtHand =
      Number(
        batch.stockAtHand ??
          batch.stock_at_hand ??
          batch.quantityOnHand ??
          batch.qtyOnHand ??
          batch.quantity ??
          batch.qty ??
          batch.stockQuantity ??
          0
      ) || 0;
    const title = this.pharmacyStockBatchTreatmentLabel({
      ...batch,
      stockItemName: name,
      batchNumber: batch.batchNumber ?? batch.batchNo,
      storeName,
      stockAtHand,
    });
    return {
      ...prescribing,
      ...batch,
      stockItemId: stockItemId ?? batch.id,
      stockItemName: name,
      storeId,
      storeName,
      batchLabel: batchPart,
      expiryLabel,
      id: stockItemId ?? batch.id,
      title,
      plainName: name,
      stockAtHand,
      uintOfMeasure:
        batch.uintOfMeasure ?? batch.unitOfMeasure ?? batch.uom ?? '',
      _stockBatchId: batch.id,
      unitSellingModelId: batch.unitSellingModelId ?? batch.unit_selling_model_id ?? null,
    };
  }

  private plainPharmacyDrugName(batch: any): string {
    return String(batch?.stockItemName || batch?.itemName || batch?.drugName || 'Product').trim();
  }

  private resolvePharmacyStoreDisplayName(storeId: number, batchFallback?: string): string {
    const id = Number(storeId);
    if (Number.isFinite(id) && id > 0 && this.pharmacyStoreList?.length) {
      const store = this.pharmacyStoreList.find((s) => Number(s?.id ?? s?.storeId) === id);
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

  private pharmacyStockBatchTreatmentLabel(batch: any): string {
    if (!batch) {
      return '';
    }
    const name = this.plainPharmacyDrugName(batch);
    const batchNo =
      batch.batchNumber != null && String(batch.batchNumber).trim() !== ''
        ? String(batch.batchNumber).trim()
        : String(batch.id ?? '?');
    const expiry = batch.expiryLabel || this.formatPharmacyBatchExpiryShort(batch);
    const uom = String(batch.uintOfMeasure ?? batch.unitOfMeasure ?? batch.uom ?? '').trim();
    const uomSuffix = uom ? ` ${uom}` : '';
    const parts = [name, `BTH ${batchNo}`];
    if (expiry) {
      parts.push(`EX ${expiry}`);
    }
    const storeName = String(batch?.storeName ?? batch?.store_name ?? '').trim();
    if (storeName) {
      parts.push(`${storeName} ${Number(batch.stockAtHand ?? 0)}${uomSuffix}`);
    }
    return parts.join(' · ');
  }

  private formatPharmacyBatchExpiryShort(batch: any): string {
    const raw =
      batch?.expiryDate ??
      batch?.expiry ??
      batch?.expireDate ??
      batch?.expirationDate ??
      batch?.expiry_date;
    if (raw == null || raw === '') {
      return '';
    }
    const text = String(raw).trim();
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${Number(isoMatch[3])}/${Number(isoMatch[2])}/${isoMatch[1]}`;
    }
    const slashMatch = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (slashMatch) {
      return `${Number(slashMatch[3])}/${Number(slashMatch[2])}/${slashMatch[1]}`;
    }
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getDate()}/${parsed.getMonth() + 1}/${parsed.getFullYear()}`;
    }
    return text;
  }

  private pharmacyBatchLineExpiryInfo(distributions: any[]): {
    label: string;
    tone: 'danger' | 'warning' | 'safe' | 'unknown';
  } {
    for (const row of distributions) {
      const label = this.formatPharmacyBatchExpiryShort(row);
      if (!label) {
        continue;
      }
      const parsed = this.parsePharmacyExpiryDate(row);
      if (!parsed) {
        return { label, tone: 'unknown' };
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const exp = new Date(parsed);
      exp.setHours(0, 0, 0, 0);
      if (exp.getTime() < today.getTime()) {
        return { label, tone: 'danger' };
      }
      let years = exp.getFullYear() - today.getFullYear();
      const monthDiff = exp.getMonth() - today.getMonth();
      const dayDiff = exp.getDate() - today.getDate();
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        years--;
      }
      if (years < 1) {
        return { label, tone: 'danger' };
      }
      if (years < 2) {
        return { label, tone: 'warning' };
      }
      return { label, tone: 'safe' };
    }
    return { label: '', tone: 'unknown' };
  }

  private parsePharmacyExpiryDate(batch: any): Date | null {
    const raw =
      batch?.expiryDate ??
      batch?.expiry ??
      batch?.expireDate ??
      batch?.expirationDate ??
      batch?.expiry_date;
    if (raw == null || raw === '') {
      return null;
    }
    const text = String(raw).trim();
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const dt = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
      return Number.isNaN(dt.getTime()) ? null : dt;
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private loadPayments(): void {
    if (!this.visitId) {
      return;
    }
    this.isLoadingPayments = true;
    this.api.getPaymentsMadeByVisit(this.visitId).subscribe({
      next: (res: any) => {
        this.paymentsList = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.isLoadingPayments = false;
        this.refreshTransactionProgress();
      },
      error: () => {
        this.paymentsList = [];
        this.isLoadingPayments = false;
        this.refreshTransactionProgress();
      },
    });
  }

  private loadVitals(): void {
    if (!this.visitId) {
      return;
    }
    this.isLoadingVitals = true;
    this.api.getInitialVitalsByVisit(this.visitId).subscribe({
      next: (res: any) => {
        this.vitalsList = Array.isArray(res) ? res : [];
        this.isLoadingVitals = false;
      },
      error: () => {
        this.vitalsList = [];
        this.isLoadingVitals = false;
      },
    });
  }

  private loadConsultation(): void {
    if (!this.visitId) {
      return;
    }
    this.isLoadingConsultation = true;
    this.api.getConsultationsByVisit(this.visitId).subscribe({
      next: (res: any) => {
        this.consultationForm = {
          chiefComplaint: res?.chiefComplaint || '',
          historyOfPresentingComplaint: res?.historyOfPresentingComplaint || '',
          reviewOfOtherSystems: res?.reviewOfOtherSystems || '',
          medicalHistory: res?.medicalHistory || '',
          medicationHistory: res?.medicationHistory || '',
          allergies: res?.allergies || '',
          familyHistory: res?.familyHistory || '',
          socialHistory: res?.socialHistory || '',
          clinicalExamination: res?.clinicalExamination || '',
          diagnosis: res?.diagnosis || '',
          differentialDiagnosis: res?.differentialDiagnosis || '',
          followUpInstructions: res?.followUpInstructions || '',
          notes: res?.notes || '',
        };
        const embeddedPcs = Array.isArray(res?.presentingComplaints) ? res.presentingComplaints : [];
        if (embeddedPcs.length) {
          this.presentingComplaintsList = embeddedPcs;
        } else {
          this.loadPresentingComplaints();
        }
        const embeddedExams = Array.isArray(res?.physicalExaminations) ? res.physicalExaminations : [];
        if (embeddedExams.length) {
          this.physicalExaminationsList = embeddedExams;
        } else {
          this.loadPhysicalExaminations();
        }
        const embedded = Array.isArray(res?.diagnoses) ? res.diagnoses : [];
        if (embedded.length) {
          this.diagnosesList = embedded;
        } else {
          this.loadDiagnoses();
        }
        this.isLoadingConsultation = false;
      },
      error: () => {
        this.consultationForm = this.emptyConsultationForm();
        this.presentingComplaintsList = [];
        this.physicalExaminationsList = [];
        this.diagnosesList = [];
        this.isLoadingConsultation = false;
      },
    });
  }

  private emptyPresentingComplaintDraft() {
    return {
      complaint: '',
      site: '',
      severity: '',
      onset: '',
      durationValue: null as number | null,
      durationUnit: 'day',
      nature: '',
      course: '',
      aggravatingFactors: '',
      alleviatingFactors: '',
      associatedSymptoms: '',
    };
  }

  togglePcPicker(
    which:
      | 'complaint'
      | 'site'
      | 'severity'
      | 'onset'
      | 'course'
      | 'durationUnit'
      | 'nature'
      | 'aggravating'
      | 'alleviating'
      | 'associated',
    event?: Event
  ): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.pePickerOpen = null;
    this.pePickerSearch = '';
    if (this.pcPickerOpen === which) {
      this.closeModernPicker();
      return;
    }
    this.pcPickerSearch = '';
    this.pcPickerOpen = which;
    // Keep modal scroll position when catalogs refresh after opening a picker.
    this.withPreservedPcModalScroll(() => {
      if (
        which === 'complaint' ||
        which === 'site' ||
        which === 'nature' ||
        which === 'aggravating' ||
        which === 'alleviating' ||
        which === 'associated'
      ) {
        this.loadPresentingComplaintCatalogs();
      }
    });
  }

  togglePePicker(which: 'system' | 'status', event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.pcPickerOpen = null;
    this.pcPickerSearch = '';
    if (this.pePickerOpen === which) {
      this.closeModernPicker();
      return;
    }
    this.pePickerSearch = '';
    this.pePickerOpen = which;
  }

  selectPcPickerValue(
    which:
      | 'complaint'
      | 'site'
      | 'severity'
      | 'onset'
      | 'course'
      | 'durationUnit'
      | 'nature'
      | 'aggravating'
      | 'alleviating'
      | 'associated',
    value: string,
    event?: Event
  ): void {
    event?.preventDefault();
    event?.stopPropagation();
    const v = String(value || '').trim();
    this.withPreservedPcModalScroll(() => {
      if (which === 'complaint') {
        this.presentingComplaintDraft.complaint = v;
      } else if (which === 'site') {
        this.presentingComplaintDraft.site = v;
      } else if (which === 'severity') {
        this.presentingComplaintDraft.severity = v;
      } else if (which === 'onset') {
        this.presentingComplaintDraft.onset = v;
      } else if (which === 'course') {
        this.presentingComplaintDraft.course = v;
      } else if (which === 'durationUnit') {
        this.presentingComplaintDraft.durationUnit = v;
      } else if (which === 'nature') {
        this.presentingComplaintDraft.nature = v;
      } else if (which === 'aggravating') {
        this.presentingComplaintDraft.aggravatingFactors = v;
      } else if (which === 'alleviating') {
        this.presentingComplaintDraft.alleviatingFactors = v;
      } else {
        this.presentingComplaintDraft.associatedSymptoms = v;
      }
      this.closeModernPicker();
    });
  }

  selectPePickerValue(which: 'system' | 'status', value: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (which === 'system') {
      this.physicalExaminationDraft.system = value;
    } else {
      this.physicalExaminationDraft.status = value;
    }
    this.closeModernPicker();
  }

  addPcPickerOption(
    which:
      | 'complaint'
      | 'site'
      | 'severity'
      | 'onset'
      | 'course'
      | 'durationUnit'
      | 'nature'
      | 'aggravating'
      | 'alleviating'
      | 'associated',
    event?: Event
  ): void {
    this.openCatalogEditor(which, null, event);
  }

  addPePickerOption(which: 'system' | 'status', event?: Event): void {
    this.openCatalogEditor(which === 'system' ? 'peSystem' : 'peStatus', null, event);
  }

  addDxPickerOption(which: 'name' | 'severity' = 'name', event?: Event): void {
    this.openCatalogEditor(which === 'severity' ? 'dxSeverity' : 'diagnosis', null, event);
  }

  catalogEditorLabel(): string {
    switch (this.catalogEditorKind) {
      case 'complaint':
        return 'complaint type';
      case 'site':
        return 'site';
      case 'severity':
        return 'severity';
      case 'onset':
        return 'onset';
      case 'course':
        return 'course';
      case 'durationUnit':
        return 'duration unit';
      case 'nature':
        return 'nature';
      case 'aggravating':
        return 'aggravating factor';
      case 'alleviating':
        return 'alleviating factor';
      case 'associated':
        return 'associated symptom';
      case 'diagnosis':
        return 'diagnosis';
      case 'dxSeverity':
        return 'diagnosis severity';
      case 'peSystem':
        return 'exam system';
      case 'peStatus':
        return 'exam status';
      default:
        return 'option';
    }
  }

  openCatalogEditor(
    kind:
      | 'complaint'
      | 'site'
      | 'severity'
      | 'onset'
      | 'course'
      | 'durationUnit'
      | 'nature'
      | 'aggravating'
      | 'alleviating'
      | 'associated'
      | 'diagnosis'
      | 'dxSeverity'
      | 'peSystem'
      | 'peStatus',
    existingTitle: string | null,
    event?: Event
  ): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.catalogEditorKind = kind;
    if (existingTitle != null && String(existingTitle).trim()) {
      const title = String(existingTitle).trim();
      this.catalogEditorMode = 'edit';
      this.catalogEditorOriginalTitle = title;
      this.catalogEditorTitle = kind === 'durationUnit' ? this.durationUnitLabel(title) : title;
      this.catalogEditorId = this.findCatalogEntityId(kind, title);
    } else {
      this.catalogEditorMode = 'add';
      this.catalogEditorOriginalTitle = '';
      this.catalogEditorId = null;
      this.catalogEditorTitle = this.activeCatalogSearchPrefill(kind);
    }
    this.showCatalogEditor = true;
    this.openCv2ModalLayer();
  }

  cancelCatalogEditor(): void {
    this.showCatalogEditor = false;
    this.isSavingCatalog = false;
    this.catalogEditorKind = null;
    this.catalogEditorId = null;
    this.catalogEditorTitle = '';
    this.catalogEditorOriginalTitle = '';
    this.catalogEditorMode = 'add';
    this.restoreBodyScrollUnlessModalOpen();
  }

  canDeleteCatalogOption(
    kind:
      | 'complaint'
      | 'site'
      | 'severity'
      | 'onset'
      | 'course'
      | 'durationUnit'
      | 'nature'
      | 'aggravating'
      | 'alleviating'
      | 'associated'
      | 'diagnosis'
      | 'dxSeverity'
      | 'peSystem'
      | 'peStatus',
    title: string
  ): boolean {
    const value = String(title || '').trim();
    if (!value) {
      return false;
    }
    if (this.findCatalogEntityId(kind, value) != null) {
      return true;
    }
    return this.isLocalCatalogExtra(kind, value);
  }

  deleteCatalogOption(
    kind:
      | 'complaint'
      | 'site'
      | 'severity'
      | 'onset'
      | 'course'
      | 'durationUnit'
      | 'nature'
      | 'aggravating'
      | 'alleviating'
      | 'associated'
      | 'diagnosis'
      | 'dxSeverity'
      | 'peSystem'
      | 'peStatus',
    title: string,
    event?: Event
  ): void {
    event?.preventDefault();
    event?.stopPropagation();
    const value = String(title || '').trim();
    if (!value || !this.canDeleteCatalogOption(kind, value)) {
      this.showStatusMessage('Built-in options cannot be deleted.', 'info');
      return;
    }
    if (!confirm(`Delete "${kind === 'durationUnit' ? this.durationUnitLabel(value) : value}"?`)) {
      return;
    }
    const id = this.findCatalogEntityId(kind, value);
    if (id != null) {
      const req$ =
        kind === 'complaint'
          ? this.api.deleteComplaintType(id)
          : kind === 'site'
            ? this.api.deleteSite(id)
            : kind === 'diagnosis'
              ? this.api.deleteDiagnosisType(id)
              : this.api.deleteComplaintOption(id);
      req$.subscribe({
        next: (res: any) => {
          this.showStatusMessage(res?.message || 'Option deleted.', 'success');
          this.clearDraftValueIfMatches(kind, value);
          this.reloadCatalogForKind(kind);
        },
        error: (err) => {
          this.showStatusMessage(err?.error?.message || err?.message || 'Could not delete option.', 'error');
        },
      });
      return;
    }
    this.removeLocalCatalogExtra(kind, value);
    this.clearDraftValueIfMatches(kind, value);
    this.showStatusMessage('Option deleted.', 'success');
  }

  saveCatalogEditor(): void {
    if (!this.catalogEditorKind || this.isSavingCatalog) {
      return;
    }
    const title = String(this.catalogEditorTitle || '').trim();
    if (!title) {
      this.showStatusMessage('Name is required.', 'error');
      return;
    }
    const kind = this.catalogEditorKind;
    this.isSavingCatalog = true;

    if (kind === 'severity' || kind === 'onset' || kind === 'course' || kind === 'peSystem' || kind === 'peStatus' || kind === 'dxSeverity') {
      this.saveLocalStringCatalog(kind, title);
      return;
    }
    if (kind === 'durationUnit') {
      this.saveLocalDurationCatalog(title);
      return;
    }

    const finish = (savedTitle: string) => {
      this.isSavingCatalog = false;
      this.applyCatalogSelection(kind, savedTitle);
      this.reloadCatalogForKind(kind);
      this.cancelCatalogEditor();
    };
    const fail = (err?: any) => {
      this.isSavingCatalog = false;
      this.showStatusMessage(err?.error?.message || err?.message || 'Could not save option.', 'error');
    };

    if (kind === 'complaint') {
      const req$ =
        this.catalogEditorMode === 'edit' && this.catalogEditorId != null
          ? this.api.updateComplaintType(this.catalogEditorId, { title, description: '' })
          : this.api.createComplaintType({ title, description: '' });
      req$.subscribe({
        next: (res: any) => finish(String(res?.data?.title || title)),
        error: fail,
      });
      return;
    }
    if (kind === 'site') {
      const req$ =
        this.catalogEditorMode === 'edit' && this.catalogEditorId != null
          ? this.api.updateSite(this.catalogEditorId, { title, description: '' })
          : this.api.createSite({ title, description: '' });
      req$.subscribe({
        next: (res: any) => finish(String(res?.data?.title || title)),
        error: fail,
      });
      return;
    }
    if (kind === 'diagnosis') {
      const req$ =
        this.catalogEditorMode === 'edit' && this.catalogEditorId != null
          ? this.api.updateDiagnosisType(this.catalogEditorId, { title, description: '' })
          : this.api.createDiagnosisType({ title, description: '' });
      req$.subscribe({
        next: (res: any) => finish(String(res?.data?.title || title)),
        error: fail,
      });
      return;
    }

    const category =
      kind === 'nature'
        ? 'nature'
        : kind === 'aggravating'
          ? 'aggravating'
          : kind === 'alleviating'
            ? 'alleviating'
            : 'associated';
    const req$ =
      this.catalogEditorMode === 'edit' && this.catalogEditorId != null
        ? this.api.updateComplaintOption(this.catalogEditorId, { category, title, description: '' })
        : this.api.createComplaintOption({ category, title, description: '' });
    req$.subscribe({
      next: (res: any) => finish(String(res?.data?.title || title)),
      error: fail,
    });
  }

  private saveLocalStringCatalog(
    kind: 'severity' | 'onset' | 'course' | 'peSystem' | 'peStatus' | 'dxSeverity',
    title: string
  ): void {
    const original = this.catalogEditorOriginalTitle;
    if (kind === 'severity') {
      this.pcExtraSeverity = this.replaceLocalExtra(this.pcExtraSeverity, original, title);
    } else if (kind === 'onset') {
      this.pcExtraOnset = this.replaceLocalExtra(this.pcExtraOnset, original, title);
    } else if (kind === 'course') {
      this.pcExtraCourse = this.replaceLocalExtra(this.pcExtraCourse, original, title);
    } else if (kind === 'peSystem') {
      this.peExtraSystems = this.replaceLocalExtra(this.peExtraSystems, original, title);
    } else if (kind === 'dxSeverity') {
      this.dxExtraSeverity = this.replaceLocalExtra(this.dxExtraSeverity, original, title);
    } else {
      this.peExtraStatuses = this.replaceLocalExtra(this.peExtraStatuses, original, title);
    }
    this.isSavingCatalog = false;
    this.applyCatalogSelection(kind, title);
    this.cancelCatalogEditor();
  }

  private saveLocalDurationCatalog(label: string): void {
    const value = label.toLowerCase().replace(/\s+/g, '_');
    const original = this.catalogEditorOriginalTitle;
    const next = this.pcExtraDurationUnits.filter((row) => row.value !== original && row.value !== value);
    next.push({ value, label });
    this.pcExtraDurationUnits = next;
    this.isSavingCatalog = false;
    this.applyCatalogSelection('durationUnit', value);
    this.cancelCatalogEditor();
  }

  private replaceLocalExtra(list: string[], original: string, next: string): string[] {
    const cleaned = list.filter(
      (row) =>
        row.toLowerCase() !== String(original || '').toLowerCase() &&
        row.toLowerCase() !== next.toLowerCase()
    );
    return [...cleaned, next];
  }

  private activeCatalogSearchPrefill(
    kind:
      | 'complaint'
      | 'site'
      | 'severity'
      | 'onset'
      | 'course'
      | 'durationUnit'
      | 'nature'
      | 'aggravating'
      | 'alleviating'
      | 'associated'
      | 'diagnosis'
      | 'dxSeverity'
      | 'peSystem'
      | 'peStatus'
  ): string {
    if (kind === 'diagnosis') {
      return this.dxPickerSearch.trim();
    }
    if (kind === 'dxSeverity') {
      return this.dxPickerSearch.trim();
    }
    if (kind === 'peSystem' || kind === 'peStatus') {
      return this.pePickerSearch.trim();
    }
    return this.pcPickerSearch.trim();
  }

  private findCatalogEntityId(
    kind:
      | 'complaint'
      | 'site'
      | 'severity'
      | 'onset'
      | 'course'
      | 'durationUnit'
      | 'nature'
      | 'aggravating'
      | 'alleviating'
      | 'associated'
      | 'diagnosis'
      | 'dxSeverity'
      | 'peSystem'
      | 'peStatus',
    title: string
  ): number | null {
    const key = String(title || '').trim().toLowerCase();
    if (!key) {
      return null;
    }
    const matchId = (rows: any[]) => {
      const row = (rows || []).find(
        (item) => String(item?.title || item?.name || '').trim().toLowerCase() === key
      );
      const id = Number(row?.id);
      return Number.isFinite(id) && id > 0 ? id : null;
    };
    if (kind === 'complaint') {
      return matchId(this.pcComplaintTypes);
    }
    if (kind === 'site') {
      return matchId(this.pcComplaintSites);
    }
    if (kind === 'diagnosis') {
      return matchId(this.diagnosisTypesList);
    }
    if (kind === 'nature') {
      return matchId(this.pcNatureOptions);
    }
    if (kind === 'aggravating') {
      return matchId(this.pcAggravatingOptions);
    }
    if (kind === 'alleviating') {
      return matchId(this.pcAlleviatingOptions);
    }
    if (kind === 'associated') {
      return matchId(this.pcAssociatedOptions);
    }
    return null;
  }

  private isLocalCatalogExtra(
    kind:
      | 'complaint'
      | 'site'
      | 'severity'
      | 'onset'
      | 'course'
      | 'durationUnit'
      | 'nature'
      | 'aggravating'
      | 'alleviating'
      | 'associated'
      | 'diagnosis'
      | 'dxSeverity'
      | 'peSystem'
      | 'peStatus',
    title: string
  ): boolean {
    const key = String(title || '').trim().toLowerCase();
    if (kind === 'severity') {
      return this.pcExtraSeverity.some((row) => row.toLowerCase() === key);
    }
    if (kind === 'onset') {
      return this.pcExtraOnset.some((row) => row.toLowerCase() === key);
    }
    if (kind === 'course') {
      return this.pcExtraCourse.some((row) => row.toLowerCase() === key);
    }
    if (kind === 'durationUnit') {
      return this.pcExtraDurationUnits.some((row) => row.value.toLowerCase() === key);
    }
    if (kind === 'peSystem') {
      return this.peExtraSystems.some((row) => row.toLowerCase() === key);
    }
    if (kind === 'peStatus') {
      return this.peExtraStatuses.some((row) => row.toLowerCase() === key);
    }
    if (kind === 'dxSeverity') {
      return this.dxExtraSeverity.some((row) => row.toLowerCase() === key);
    }
    return false;
  }

  private removeLocalCatalogExtra(
    kind:
      | 'complaint'
      | 'site'
      | 'severity'
      | 'onset'
      | 'course'
      | 'durationUnit'
      | 'nature'
      | 'aggravating'
      | 'alleviating'
      | 'associated'
      | 'diagnosis'
      | 'dxSeverity'
      | 'peSystem'
      | 'peStatus',
    title: string
  ): void {
    const key = String(title || '').trim().toLowerCase();
    if (kind === 'severity') {
      this.pcExtraSeverity = this.pcExtraSeverity.filter((row) => row.toLowerCase() !== key);
    } else if (kind === 'onset') {
      this.pcExtraOnset = this.pcExtraOnset.filter((row) => row.toLowerCase() !== key);
    } else if (kind === 'course') {
      this.pcExtraCourse = this.pcExtraCourse.filter((row) => row.toLowerCase() !== key);
    } else if (kind === 'durationUnit') {
      this.pcExtraDurationUnits = this.pcExtraDurationUnits.filter((row) => row.value.toLowerCase() !== key);
    } else if (kind === 'peSystem') {
      this.peExtraSystems = this.peExtraSystems.filter((row) => row.toLowerCase() !== key);
    } else if (kind === 'peStatus') {
      this.peExtraStatuses = this.peExtraStatuses.filter((row) => row.toLowerCase() !== key);
    } else if (kind === 'dxSeverity') {
      this.dxExtraSeverity = this.dxExtraSeverity.filter((row) => row.toLowerCase() !== key);
    }
  }

  private durationUnitLabel(value: string): string {
    const found = this.allPcDurationUnitOptions().find((row) => row.value === value);
    return found?.label || value;
  }

  private applyCatalogSelection(
    kind:
      | 'complaint'
      | 'site'
      | 'severity'
      | 'onset'
      | 'course'
      | 'durationUnit'
      | 'nature'
      | 'aggravating'
      | 'alleviating'
      | 'associated'
      | 'diagnosis'
      | 'dxSeverity'
      | 'peSystem'
      | 'peStatus',
    value: string
  ): void {
    if (kind === 'diagnosis') {
      this.selectDxPickerValue('name', value);
      return;
    }
    if (kind === 'dxSeverity') {
      this.selectDxPickerValue('severity', value);
      return;
    }
    if (kind === 'peSystem') {
      this.selectPePickerValue('system', value);
      return;
    }
    if (kind === 'peStatus') {
      this.selectPePickerValue('status', value);
      return;
    }
    this.selectPcPickerValue(
      kind as
        | 'complaint'
        | 'site'
        | 'severity'
        | 'onset'
        | 'course'
        | 'durationUnit'
        | 'nature'
        | 'aggravating'
        | 'alleviating'
        | 'associated',
      value
    );
  }

  private clearDraftValueIfMatches(
    kind:
      | 'complaint'
      | 'site'
      | 'severity'
      | 'onset'
      | 'course'
      | 'durationUnit'
      | 'nature'
      | 'aggravating'
      | 'alleviating'
      | 'associated'
      | 'diagnosis'
      | 'dxSeverity'
      | 'peSystem'
      | 'peStatus',
    value: string
  ): void {
    const key = value.toLowerCase();
    if (kind === 'diagnosis' && String(this.diagnosisDraft.name || '').toLowerCase() === key) {
      this.diagnosisDraft.name = '';
    } else if (kind === 'dxSeverity' && String(this.diagnosisDraft.severity || '').toLowerCase() === key) {
      this.diagnosisDraft.severity = '';
    } else if (kind === 'peSystem' && String(this.physicalExaminationDraft.system || '').toLowerCase() === key) {
      this.physicalExaminationDraft.system = '';
    } else if (kind === 'peStatus' && String(this.physicalExaminationDraft.status || '').toLowerCase() === key) {
      this.physicalExaminationDraft.status = '';
    } else if (kind === 'complaint' && String(this.presentingComplaintDraft.complaint || '').toLowerCase() === key) {
      this.presentingComplaintDraft.complaint = '';
    } else if (kind === 'site' && String(this.presentingComplaintDraft.site || '').toLowerCase() === key) {
      this.presentingComplaintDraft.site = '';
    } else if (kind === 'severity' && String(this.presentingComplaintDraft.severity || '').toLowerCase() === key) {
      this.presentingComplaintDraft.severity = '';
    } else if (kind === 'onset' && String(this.presentingComplaintDraft.onset || '').toLowerCase() === key) {
      this.presentingComplaintDraft.onset = '';
    } else if (kind === 'course' && String(this.presentingComplaintDraft.course || '').toLowerCase() === key) {
      this.presentingComplaintDraft.course = '';
    } else if (kind === 'durationUnit' && String(this.presentingComplaintDraft.durationUnit || '').toLowerCase() === key) {
      this.presentingComplaintDraft.durationUnit = 'day';
    } else if (kind === 'nature' && String(this.presentingComplaintDraft.nature || '').toLowerCase() === key) {
      this.presentingComplaintDraft.nature = '';
    } else if (kind === 'aggravating' && String(this.presentingComplaintDraft.aggravatingFactors || '').toLowerCase() === key) {
      this.presentingComplaintDraft.aggravatingFactors = '';
    } else if (kind === 'alleviating' && String(this.presentingComplaintDraft.alleviatingFactors || '').toLowerCase() === key) {
      this.presentingComplaintDraft.alleviatingFactors = '';
    } else if (kind === 'associated' && String(this.presentingComplaintDraft.associatedSymptoms || '').toLowerCase() === key) {
      this.presentingComplaintDraft.associatedSymptoms = '';
    }
  }

  private reloadCatalogForKind(
    kind:
      | 'complaint'
      | 'site'
      | 'severity'
      | 'onset'
      | 'course'
      | 'durationUnit'
      | 'nature'
      | 'aggravating'
      | 'alleviating'
      | 'associated'
      | 'diagnosis'
      | 'dxSeverity'
      | 'peSystem'
      | 'peStatus'
  ): void {
    if (kind === 'diagnosis') {
      this.loadDiagnosisTypes();
      return;
    }
    if (
      kind === 'complaint' ||
      kind === 'site' ||
      kind === 'nature' ||
      kind === 'aggravating' ||
      kind === 'alleviating' ||
      kind === 'associated'
    ) {
      this.loadPresentingComplaintCatalogs();
    }
  }

  filteredPcStringOptions(which: 'severity' | 'onset' | 'course'): string[] {
    const q = this.pcPickerSearch.trim().toLowerCase();
    const all = this.allPcStringOptions(which);
    if (!q) {
      return all;
    }
    return all.filter((opt) => opt.toLowerCase().includes(q));
  }

  filteredPcEntityOptions(
    which: 'complaint' | 'site' | 'nature' | 'aggravating' | 'alleviating' | 'associated'
  ): string[] {
    const q = this.pcPickerSearch.trim().toLowerCase();
    const all = this.allPcEntityOptions(which);
    if (!q) {
      return all;
    }
    return all.filter((opt) => opt.toLowerCase().includes(q));
  }

  filteredPcDurationUnitOptions(): { value: string; label: string }[] {
    const q = this.pcPickerSearch.trim().toLowerCase();
    const all = this.allPcDurationUnitOptions();
    if (!q) {
      return all;
    }
    return all.filter(
      (row) => row.label.toLowerCase().includes(q) || row.value.toLowerCase().includes(q)
    );
  }

  filteredPeStringOptions(which: 'system' | 'status'): string[] {
    const q = this.pePickerSearch.trim().toLowerCase();
    const all = this.allPeStringOptions(which);
    if (!q) {
      return all;
    }
    return all.filter((opt) => opt.toLowerCase().includes(q));
  }

  private allPcStringOptions(which: 'severity' | 'onset' | 'course'): string[] {
    const base =
      which === 'severity'
        ? this.pcSeverityOptions
        : which === 'onset'
          ? this.pcOnsetOptions
          : this.pcCourseOptions;
    const extra =
      which === 'severity'
        ? this.pcExtraSeverity
        : which === 'onset'
          ? this.pcExtraOnset
          : this.pcExtraCourse;
    return this.uniqueStrings([...base, ...extra]);
  }

  private allPcEntityOptions(
    which: 'complaint' | 'site' | 'nature' | 'aggravating' | 'alleviating' | 'associated'
  ): string[] {
    if (which === 'complaint') {
      return this.uniqueStrings(this.pcComplaintTypes.map((row) => String(row?.title || row?.name || '')));
    }
    if (which === 'site') {
      return this.uniqueStrings(this.pcComplaintSites.map((row) => String(row?.title || row?.name || '')));
    }
    if (which === 'nature') {
      return this.uniqueStrings([
        ...this.pcDefaultNatures,
        ...this.pcNatureOptions.map((row) => String(row?.title || '')),
      ]);
    }
    if (which === 'aggravating') {
      return this.uniqueStrings([
        ...this.pcDefaultAggravating,
        ...this.pcAggravatingOptions.map((row) => String(row?.title || '')),
      ]);
    }
    if (which === 'alleviating') {
      return this.uniqueStrings([
        ...this.pcDefaultAlleviating,
        ...this.pcAlleviatingOptions.map((row) => String(row?.title || '')),
      ]);
    }
    return this.uniqueStrings([
      ...this.pcDefaultAssociated,
      ...this.pcAssociatedOptions.map((row) => String(row?.title || '')),
    ]);
  }

  private allPeStringOptions(which: 'system' | 'status'): string[] {
    const base = which === 'system' ? this.physicalExamSystemOptions : this.peStatusOptions;
    const extra = which === 'system' ? this.peExtraSystems : this.peExtraStatuses;
    return this.uniqueStrings([...base, ...extra]);
  }

  private allPcDurationUnitOptions(): { value: string; label: string }[] {
    const map = new Map<string, { value: string; label: string }>();
    [...this.pcDurationUnitOptions, ...this.pcExtraDurationUnits].forEach((row) => {
      if (!map.has(row.value)) {
        map.set(row.value, row);
      }
    });
    return Array.from(map.values());
  }

  private uniqueStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    values.forEach((value) => {
      const key = value.trim().toLowerCase();
      if (!key || seen.has(key)) {
        return;
      }
      seen.add(key);
      out.push(value.trim());
    });
    return out;
  }

  private loadPresentingComplaintCatalogs(): void {
    const restoreScroll = () => this.restorePcModalScroll();
    this.api.getAllComplaintTypes().subscribe({
      next: (res: any) => {
        this.pcComplaintTypes = Array.isArray(res) ? res : [];
        restoreScroll();
      },
      error: () => {
        this.pcComplaintTypes = [];
        restoreScroll();
      },
    });
    this.api.getAllSites().subscribe({
      next: (res: any) => {
        this.pcComplaintSites = Array.isArray(res) ? res : [];
        restoreScroll();
      },
      error: () => {
        this.pcComplaintSites = [];
        restoreScroll();
      },
    });
    this.api.getAllComplaintOptions('nature').subscribe({
      next: (res: any) => {
        this.pcNatureOptions = Array.isArray(res) ? res : [];
        restoreScroll();
      },
      error: () => {
        this.pcNatureOptions = [];
        restoreScroll();
      },
    });
    this.api.getAllComplaintOptions('aggravating').subscribe({
      next: (res: any) => {
        this.pcAggravatingOptions = Array.isArray(res) ? res : [];
        restoreScroll();
      },
      error: () => {
        this.pcAggravatingOptions = [];
        restoreScroll();
      },
    });
    this.api.getAllComplaintOptions('alleviating').subscribe({
      next: (res: any) => {
        this.pcAlleviatingOptions = Array.isArray(res) ? res : [];
        restoreScroll();
      },
      error: () => {
        this.pcAlleviatingOptions = [];
        restoreScroll();
      },
    });
    this.api.getAllComplaintOptions('associated').subscribe({
      next: (res: any) => {
        this.pcAssociatedOptions = Array.isArray(res) ? res : [];
        restoreScroll();
      },
      error: () => {
        this.pcAssociatedOptions = [];
        restoreScroll();
      },
    });
  }

  private ensurePcDraftOptionsPresent(): void {
    const severity = String(this.presentingComplaintDraft.severity || '').trim();
    if (severity && !this.allPcStringOptions('severity').some((o) => o.toLowerCase() === severity.toLowerCase())) {
      this.pcExtraSeverity = [...this.pcExtraSeverity, severity];
    }
    const onset = String(this.presentingComplaintDraft.onset || '').trim();
    if (onset && !this.allPcStringOptions('onset').some((o) => o.toLowerCase() === onset.toLowerCase())) {
      this.pcExtraOnset = [...this.pcExtraOnset, onset];
    }
    const course = String(this.presentingComplaintDraft.course || '').trim();
    if (course && !this.allPcStringOptions('course').some((o) => o.toLowerCase() === course.toLowerCase())) {
      this.pcExtraCourse = [...this.pcExtraCourse, course];
    }
    const unit = String(this.presentingComplaintDraft.durationUnit || '').trim();
    if (unit && !this.allPcDurationUnitOptions().some((row) => row.value === unit)) {
      this.pcExtraDurationUnits = [...this.pcExtraDurationUnits, { value: unit, label: unit }];
    }
  }

  private ensurePeDraftOptionsPresent(): void {
    const system = String(this.physicalExaminationDraft.system || '').trim();
    if (system && !this.allPeStringOptions('system').some((o) => o.toLowerCase() === system.toLowerCase())) {
      this.peExtraSystems = [...this.peExtraSystems, system];
    }
    const status = String(this.physicalExaminationDraft.status || '').trim();
    if (status && !this.allPeStringOptions('status').some((o) => o.toLowerCase() === status.toLowerCase())) {
      this.peExtraStatuses = [...this.peExtraStatuses, status];
    }
  }

  private closeModernPicker(): void {
    this.withPreservedPcModalScroll(() => {
      this.pcPickerOpen = null;
      this.pePickerOpen = null;
      this.dxPickerOpen = null;
      this.pcPickerSearch = '';
      this.pePickerSearch = '';
      this.dxPickerSearch = '';
    });
  }

  private pcModalScrollTop = 0;
  private pcModalScrollLeft = 0;

  onPcModalScroll(event: Event): void {
    const el = event.target as HTMLElement | null;
    if (!el) {
      return;
    }
    this.pcModalScrollTop = el.scrollTop;
    this.pcModalScrollLeft = el.scrollLeft;
  }

  private capturePcModalScroll(): void {
    if (!this.showPresentingComplaintEditor) {
      return;
    }
    const el = document.querySelector('.cv2-pc-modal-scroll') as HTMLElement | null;
    if (!el) {
      return;
    }
    this.pcModalScrollTop = el.scrollTop;
    this.pcModalScrollLeft = el.scrollLeft;
  }

  private restorePcModalScroll(): void {
    if (!this.showPresentingComplaintEditor) {
      return;
    }
    const restore = () => {
      const scrollEl = document.querySelector('.cv2-pc-modal-scroll') as HTMLElement | null;
      if (!scrollEl) {
        return;
      }
      // Only correct accidental resets (e.g. jump to top after picker close).
      if (Math.abs(scrollEl.scrollTop - this.pcModalScrollTop) > 2) {
        scrollEl.scrollTop = this.pcModalScrollTop;
      }
      if (Math.abs(scrollEl.scrollLeft - this.pcModalScrollLeft) > 2) {
        scrollEl.scrollLeft = this.pcModalScrollLeft;
      }
    };
    restore();
    queueMicrotask(restore);
    requestAnimationFrame(restore);
    setTimeout(restore, 0);
    setTimeout(restore, 32);
  }

  private withPreservedPcModalScroll(fn: () => void): void {
    this.capturePcModalScroll();
    fn();
    this.restorePcModalScroll();
  }

  pcDurationUnitLabel(): string {
    const unit = this.presentingComplaintDraft.durationUnit || 'day';
    const found = this.allPcDurationUnitOptions().find((row) => row.value === unit);
    return found?.label || unit || 'Day(s)';
  }

  formatPresentingComplaintDuration(pc: any): string {
    if (!pc) {
      return '';
    }
    if (pc.durationValue != null && pc.durationUnit) {
      const n = Number(pc.durationValue);
      const unit = String(pc.durationUnit);
      if (Number.isFinite(n) && n > 0) {
        const label = n === 1 ? unit : `${unit}s`;
        return `${n} ${label}`;
      }
    }
    return String(pc.duration || '').trim();
  }

  private loadPresentingComplaints(): void {
    if (!this.visitId) {
      this.presentingComplaintsList = [];
      return;
    }
    this.api.getPresentingComplaintsByVisit(this.visitId).subscribe({
      next: (res: any) => {
        this.presentingComplaintsList = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.presentingComplaintsList = [];
      },
    });
  }

  startAddPresentingComplaint(): void {
    this.editingPresentingComplaintId = null;
    this.presentingComplaintDraft = this.emptyPresentingComplaintDraft();
    this.closeModernPicker();
    this.loadPresentingComplaintCatalogs();
    this.openConsultAccordion('presenting');
    this.showPresentingComplaintEditor = true;
    this.openCv2ModalLayer();
  }

  editPresentingComplaint(pc: any): void {
    if (!pc?.id) {
      return;
    }
    this.editingPresentingComplaintId = Number(pc.id);
    const parsed = this.parseLegacyDuration(pc);
    this.presentingComplaintDraft = {
      complaint: String(pc.complaint || ''),
      site: String(pc.site || ''),
      severity: String(pc.severity || ''),
      onset: String(pc.onset || ''),
      durationValue:
        pc.durationValue != null && Number.isFinite(Number(pc.durationValue))
          ? Number(pc.durationValue)
          : parsed.value,
      durationUnit: String(pc.durationUnit || parsed.unit || 'day'),
      nature: String(pc.nature || ''),
      course: String(pc.course || ''),
      aggravatingFactors: String(pc.aggravatingFactors || ''),
      alleviatingFactors: String(pc.alleviatingFactors || ''),
      associatedSymptoms: String(pc.associatedSymptoms || ''),
    };
    this.closeModernPicker();
    this.ensurePcDraftOptionsPresent();
    this.loadPresentingComplaintCatalogs();
    this.openConsultAccordion('presenting');
    this.showPresentingComplaintEditor = true;
    this.openCv2ModalLayer();
  }

  private parseLegacyDuration(pc: any): { value: number | null; unit: string } {
    const text = String(pc?.duration || '').trim().toLowerCase();
    const match = text.match(/^(\d+)\s*(day|days|week|weeks|month|months|year|years)\b/);
    if (!match) {
      return { value: null, unit: 'day' };
    }
    const value = Number(match[1]);
    let unit = match[2];
    if (unit.endsWith('s')) {
      unit = unit.slice(0, -1);
    }
    return { value: Number.isFinite(value) ? value : null, unit };
  }

  cancelPresentingComplaintEditor(): void {
    this.showPresentingComplaintEditor = false;
    this.editingPresentingComplaintId = null;
    this.closeModernPicker();
    this.presentingComplaintDraft = this.emptyPresentingComplaintDraft();
    this.restoreBodyScrollUnlessModalOpen();
  }

  savePresentingComplaintDraft(): void {
    if (!this.visitId || this.isSavingPresentingComplaint) {
      return;
    }
    const complaint = String(this.presentingComplaintDraft.complaint || '').trim();
    if (!complaint) {
      this.showStatusMessage('Presenting complaint is required.', 'error');
      return;
    }
    const durationRaw = this.presentingComplaintDraft.durationValue;
    const durationValue =
      durationRaw != null && String(durationRaw).trim() !== '' && Number.isFinite(Number(durationRaw))
        ? Number(durationRaw)
        : null;
    const payload = {
      complaint,
      site: String(this.presentingComplaintDraft.site || '').trim(),
      severity: String(this.presentingComplaintDraft.severity || '').trim(),
      onset: String(this.presentingComplaintDraft.onset || '').trim(),
      durationValue: durationValue != null && durationValue > 0 ? durationValue : null,
      durationUnit: String(this.presentingComplaintDraft.durationUnit || 'day').trim(),
      nature: String(this.presentingComplaintDraft.nature || '').trim(),
      course: String(this.presentingComplaintDraft.course || '').trim(),
      aggravatingFactors: String(this.presentingComplaintDraft.aggravatingFactors || '').trim(),
      alleviatingFactors: String(this.presentingComplaintDraft.alleviatingFactors || '').trim(),
      associatedSymptoms: String(this.presentingComplaintDraft.associatedSymptoms || '').trim(),
    };
    this.isSavingPresentingComplaint = true;
    const req$ = this.editingPresentingComplaintId
      ? this.api.updatePresentingComplaint(this.editingPresentingComplaintId, payload)
      : this.api.createPresentingComplaint(this.visitId, payload);
    req$.subscribe({
      next: (res: any) => {
        this.isSavingPresentingComplaint = false;
        this.showStatusMessage(res?.message || 'Presenting complaint saved.', 'success');
        this.cancelPresentingComplaintEditor();
        this.loadPresentingComplaints();
        this.loadConsultation();
      },
      error: (err) => {
        this.isSavingPresentingComplaint = false;
        this.showStatusMessage(err?.error?.message || err?.message || 'Could not save presenting complaint.', 'error');
      },
    });
  }

  deletePresentingComplaint(pc: any): void {
    const id = Number(pc?.id);
    if (!id || this.isSavingPresentingComplaint) {
      return;
    }
    this.isSavingPresentingComplaint = true;
    this.api.deletePresentingComplaint(id).subscribe({
      next: (res: any) => {
        this.isSavingPresentingComplaint = false;
        this.showStatusMessage(res?.message || 'Presenting complaint deleted.', 'success');
        if (this.editingPresentingComplaintId === id) {
          this.cancelPresentingComplaintEditor();
        }
        this.loadPresentingComplaints();
      },
      error: (err) => {
        this.isSavingPresentingComplaint = false;
        this.showStatusMessage(err?.error?.message || err?.message || 'Could not delete presenting complaint.', 'error');
      },
    });
  }

  private emptyPhysicalExaminationDraft() {
    return {
      system: 'General',
      findings: '',
      site: '',
      status: '',
      inspection: '',
      palpation: '',
      percussion: '',
      auscultation: '',
      notes: '',
    };
  }

  private loadPhysicalExaminations(): void {
    if (!this.visitId) {
      this.physicalExaminationsList = [];
      return;
    }
    this.api.getPhysicalExaminationsByVisit(this.visitId).subscribe({
      next: (res: any) => {
        this.physicalExaminationsList = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.physicalExaminationsList = [];
      },
    });
  }

  startAddPhysicalExamination(): void {
    this.editingPhysicalExaminationId = null;
    this.physicalExaminationDraft = this.emptyPhysicalExaminationDraft();
    this.closeModernPicker();
    this.openConsultAccordion('physicalExam');
    this.showPhysicalExaminationEditor = true;
    this.openCv2ModalLayer();
  }

  editPhysicalExamination(pe: any): void {
    if (!pe?.id) {
      return;
    }
    this.editingPhysicalExaminationId = Number(pe.id);
    this.physicalExaminationDraft = {
      system: String(pe.system || 'General'),
      findings: String(pe.findings || ''),
      site: String(pe.site || ''),
      status: String(pe.status || ''),
      inspection: String(pe.inspection || ''),
      palpation: String(pe.palpation || ''),
      percussion: String(pe.percussion || ''),
      auscultation: String(pe.auscultation || ''),
      notes: String(pe.notes || ''),
    };
    this.closeModernPicker();
    this.ensurePeDraftOptionsPresent();
    this.openConsultAccordion('physicalExam');
    this.showPhysicalExaminationEditor = true;
    this.openCv2ModalLayer();
  }

  cancelPhysicalExaminationEditor(): void {
    this.showPhysicalExaminationEditor = false;
    this.editingPhysicalExaminationId = null;
    this.closeModernPicker();
    this.physicalExaminationDraft = this.emptyPhysicalExaminationDraft();
    this.restoreBodyScrollUnlessModalOpen();
  }

  savePhysicalExaminationDraft(): void {
    if (!this.visitId || this.isSavingPhysicalExamination) {
      return;
    }
    const system = String(this.physicalExaminationDraft.system || '').trim();
    const findings = String(this.physicalExaminationDraft.findings || '').trim();
    if (!system || !findings) {
      this.showStatusMessage('System and findings are required.', 'error');
      return;
    }
    const payload = {
      system,
      findings,
      site: String(this.physicalExaminationDraft.site || '').trim(),
      status: String(this.physicalExaminationDraft.status || '').trim(),
      inspection: String(this.physicalExaminationDraft.inspection || '').trim(),
      palpation: String(this.physicalExaminationDraft.palpation || '').trim(),
      percussion: String(this.physicalExaminationDraft.percussion || '').trim(),
      auscultation: String(this.physicalExaminationDraft.auscultation || '').trim(),
      notes: String(this.physicalExaminationDraft.notes || '').trim(),
    };
    this.isSavingPhysicalExamination = true;
    const req$ = this.editingPhysicalExaminationId
      ? this.api.updatePhysicalExamination(this.editingPhysicalExaminationId, payload)
      : this.api.createPhysicalExamination(this.visitId, payload);
    req$.subscribe({
      next: (res: any) => {
        this.isSavingPhysicalExamination = false;
        this.showStatusMessage(res?.message || 'Physical examination saved.', 'success');
        this.cancelPhysicalExaminationEditor();
        this.loadPhysicalExaminations();
        this.loadConsultation();
      },
      error: (err) => {
        this.isSavingPhysicalExamination = false;
        this.showStatusMessage(err?.error?.message || err?.message || 'Could not save physical examination.', 'error');
      },
    });
  }

  deletePhysicalExamination(pe: any): void {
    const id = Number(pe?.id);
    if (!id || this.isSavingPhysicalExamination) {
      return;
    }
    this.isSavingPhysicalExamination = true;
    this.api.deletePhysicalExamination(id).subscribe({
      next: (res: any) => {
        this.isSavingPhysicalExamination = false;
        this.showStatusMessage(res?.message || 'Physical examination deleted.', 'success');
        if (this.editingPhysicalExaminationId === id) {
          this.cancelPhysicalExaminationEditor();
        }
        this.loadPhysicalExaminations();
      },
      error: (err) => {
        this.isSavingPhysicalExamination = false;
        this.showStatusMessage(err?.error?.message || err?.message || 'Could not delete physical examination.', 'error');
      },
    });
  }

  private loadDiagnoses(): void {
    if (!this.visitId) {
      this.diagnosesList = [];
      return;
    }
    this.api.getDiagnosesByVisit(this.visitId).subscribe({
      next: (res: any) => {
        this.diagnosesList = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.diagnosesList = [];
      },
    });
  }

  startAddDiagnosis(): void {
    this.editingDiagnosisId = null;
    this.diagnosisDraft = { name: '', severity: '', kind: 'final', notes: '' };
    this.dxPickerOpen = null;
    this.dxPickerSearch = '';
    this.openConsultAccordion('diagnoses');
    this.loadDiagnosisTypes();
    this.showDiagnosisEditor = true;
    this.openCv2ModalLayer();
  }

  editDiagnosis(dx: any): void {
    if (!dx?.id) {
      return;
    }
    this.editingDiagnosisId = Number(dx.id);
    this.diagnosisDraft = {
      name: String(dx.name || ''),
      severity: String(dx.severity || ''),
      kind: dx.kind === 'differential' ? 'differential' : 'final',
      notes: String(dx.notes || ''),
    };
    this.dxPickerOpen = null;
    this.dxPickerSearch = '';
    if (this.diagnosisDraft.severity) {
      this.ensureDxSeverityOptionPresent(this.diagnosisDraft.severity);
    }
    this.openConsultAccordion('diagnoses');
    this.loadDiagnosisTypes();
    this.showDiagnosisEditor = true;
    this.openCv2ModalLayer();
  }

  cancelDiagnosisEditor(): void {
    this.showDiagnosisEditor = false;
    this.editingDiagnosisId = null;
    this.dxPickerOpen = null;
    this.dxPickerSearch = '';
    this.diagnosisDraft = { name: '', severity: '', kind: 'final', notes: '' };
    this.restoreBodyScrollUnlessModalOpen();
  }

  toggleDxPicker(which: 'name' | 'severity' = 'name', event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.pcPickerOpen = null;
    this.pePickerOpen = null;
    this.pcPickerSearch = '';
    this.pePickerSearch = '';
    if (this.dxPickerOpen === which) {
      this.dxPickerOpen = null;
      this.dxPickerSearch = '';
      return;
    }
    this.dxPickerSearch = '';
    this.dxPickerOpen = which;
    if (which === 'name') {
      this.loadDiagnosisTypes();
    }
  }

  selectDxPickerValue(which: 'name' | 'severity', value: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const v = String(value || '').trim();
    if (which === 'name') {
      this.diagnosisDraft.name = v;
    } else {
      this.diagnosisDraft.severity = v;
    }
    this.dxPickerOpen = null;
    this.dxPickerSearch = '';
  }

  filteredDiagnosisTypeOptions(): string[] {
    const q = this.dxPickerSearch.trim().toLowerCase();
    const all = this.uniqueStrings(
      this.diagnosisTypesList.map((row) => String(row?.title || row?.name || ''))
    );
    const current = String(this.diagnosisDraft.name || '').trim();
    const merged = current ? this.uniqueStrings([...all, current]) : all;
    if (!q) {
      return merged;
    }
    return merged.filter((opt) => opt.toLowerCase().includes(q));
  }

  filteredDxSeverityOptions(): string[] {
    const q = this.dxPickerSearch.trim().toLowerCase();
    const all = this.uniqueStrings([...this.dxSeverityOptions, ...this.dxExtraSeverity]);
    const current = String(this.diagnosisDraft.severity || '').trim();
    const merged = current ? this.uniqueStrings([...all, current]) : all;
    if (!q) {
      return merged;
    }
    return merged.filter((opt) => opt.toLowerCase().includes(q));
  }

  formatDiagnosisStatement(dx: { name?: string; severity?: string } | null | undefined): string {
    const severity = String(dx?.severity || '').trim();
    const name = String(dx?.name || '').trim();
    if (severity && name) {
      return `${severity} ${name}`;
    }
    return name || severity;
  }

  private ensureDxSeverityOptionPresent(value: string): void {
    const v = String(value || '').trim();
    if (!v) {
      return;
    }
    const all = this.uniqueStrings([...this.dxSeverityOptions, ...this.dxExtraSeverity]);
    if (!all.some((opt) => opt.toLowerCase() === v.toLowerCase())) {
      this.dxExtraSeverity = [...this.dxExtraSeverity, v];
    }
  }

  private loadDiagnosisTypes(): void {
    this.api.getAllDiagnosisTypes().subscribe({
      next: (res: any) => {
        this.diagnosisTypesList = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.diagnosisTypesList = [];
      },
    });
  }

  saveDiagnosisDraft(): void {
    if (!this.visitId || this.isSavingDiagnosis) {
      return;
    }
    const name = String(this.diagnosisDraft.name || '').trim();
    if (!name) {
      this.showStatusMessage('Diagnosis name is required.', 'error');
      return;
    }
    const payload = {
      name,
      severity: String(this.diagnosisDraft.severity || '').trim(),
      kind: this.diagnosisDraft.kind || 'final',
      notes: String(this.diagnosisDraft.notes || '').trim(),
    };
    this.isSavingDiagnosis = true;
    const req$ = this.editingDiagnosisId
      ? this.api.updateDiagnosis(this.editingDiagnosisId, payload)
      : this.api.createDiagnosis(this.visitId, payload);
    req$.subscribe({
      next: (res: any) => {
        this.isSavingDiagnosis = false;
        this.showStatusMessage(res?.message || 'Diagnosis saved.', 'success');
        this.cancelDiagnosisEditor();
        this.loadDiagnoses();
        this.loadConsultation();
      },
      error: (err) => {
        this.isSavingDiagnosis = false;
        this.showStatusMessage(err?.error?.message || err?.message || 'Could not save diagnosis.', 'error');
      },
    });
  }

  deleteDiagnosis(dx: any): void {
    const id = Number(dx?.id);
    if (!id || this.isSavingDiagnosis) {
      return;
    }
    this.isSavingDiagnosis = true;
    this.api.deleteDiagnosis(id).subscribe({
      next: (res: any) => {
        this.isSavingDiagnosis = false;
        this.showStatusMessage(res?.message || 'Diagnosis deleted.', 'success');
        if (this.editingDiagnosisId === id) {
          this.cancelDiagnosisEditor();
        }
        this.loadDiagnoses();
        this.loadPharmacy();
      },
      error: (err) => {
        this.isSavingDiagnosis = false;
        this.showStatusMessage(err?.error?.message || err?.message || 'Could not delete diagnosis.', 'error');
      },
    });
  }

  private loadServices(): void {
    if (!this.visitId) {
      return;
    }
    this.isLoadingServices = true;
    this.api.getOtherProceduresByVisit(this.visitId).subscribe({
      next: (res: any) => {
        this.proceduresList = Array.isArray(res) ? res : [];
        this.isLoadingServices = false;
      },
      error: () => {
        this.proceduresList = [];
        this.isLoadingServices = false;
      },
    });
  }

  loadPharmacy(): void {
    if (!this.visitId) {
      return;
    }
    this.isLoadingPharmacy = true;
    this.api.getTreatmentRequestedByVisit(this.visitId).subscribe({
      next: (res: any) => {
        this.treatmentsList = (Array.isArray(res) ? res : []).map((row) =>
          applyTreatmentLifecycleFlags({ ...row })
        );
        this.isLoadingPharmacy = false;
      },
      error: () => {
        this.treatmentsList = [];
        this.isLoadingPharmacy = false;
      },
    });
  }

  onTreatmentPdDspAdmChange(
    item: any,
    flag: TreatmentLifecycleFlag,
    checked: boolean
  ): void {
    if (!item?.id) {
      return;
    }
    const previous = {
      paid: item.paid !== false,
      dispensed: item.dispensed === true,
      administered: item.administered === true,
      given: item.given === true,
      status: item.status,
    };
    item[flag] = checked;
    if (flag === 'paid') {
      item.given = checked;
    }
    if (flag === 'dispensed' && checked) {
      item.paid = true;
      item.given = true;
      item.status = 'dispensed';
    }
    if (flag === 'dispensed' && !checked) {
      item.status = 'pending';
    }
    this.api.updateTreatmentLifecycleFlags(item.id, treatmentLifecyclePatch(flag, checked)).subscribe({
      next: (dto) => {
        if (dto && typeof dto === 'object') {
          applyTreatmentLifecycleFlags(Object.assign(item, dto));
        }
        this.loadVisitBillingSummary();
      },
      error: () => {
        item.paid = previous.paid;
        item.dispensed = previous.dispensed;
        item.administered = previous.administered;
        item.given = previous.given;
        item.status = previous.status;
      },
    });
  }

  private loadInvoice(): void {
    if (!this.visitId) {
      return;
    }
    this.loadVisitBillingSummary();
    this.isLoadingInvoice = true;
    this.api.getInvoiceForVisitId(this.visitId).subscribe({
      next: (res: any) => {
        this.invoice = res;
        this.invoiceId = Number(res?.id ?? res?.invoiceId ?? null) || null;
        this.isLoadingInvoice = false;
      },
      error: () => {
        this.invoice = null;
        this.isLoadingInvoice = false;
      },
    });
  }

  private resetVisitBillingSummary(): void {
    this.isLoadingBillingSummary = false;
    this.summaryTreatmentCost = '0.00';
    this.summaryProcedureCost = '0.00';
    this.summaryTtCost = '0.00';
    this.summarySubtotal = '0.00';
    this.summaryDiscount = '0.00';
    this.summaryTax = '0.00';
    this.summaryTotalSell = '0.00';
    this.summaryAmountPaid = '0.00';
    this.summaryBalanceDue = '0.00';
  }

  private loadVisitBillingSummary(): void {
    if (!this.visitId) {
      this.resetVisitBillingSummary();
      return;
    }

    this.isLoadingBillingSummary = true;
    this.api.getLabTestCostByVisit(this.visitId).subscribe({
      next: (res: any) => {
        if (!res) {
          this.resetVisitBillingSummary();
          return;
        }

        const labCost = Number(res.LabTestTotal ?? 0) || 0;
        const scanCost = Number(res.UltrasoundTotal ?? 0) || 0;
        const otherProcedureCost = Number(res.OtherProcedureCost ?? 0) || 0;

        this.summaryTreatmentCost = res.TreatmentTotalCost ?? 0;
        this.summaryProcedureCost = labCost + scanCost + otherProcedureCost;
        this.summaryTtCost = res.TotalCostPrice ?? 0;
        this.summarySubtotal = res.InvoiceSubtotal ?? 0;
        this.summaryDiscount = res.Discount ?? 0;
        this.summaryTax = res.Tax ?? 0;
        this.summaryTotalSell = res.TotalAmount ?? 0;
        this.summaryAmountPaid = res.AmountPaid ?? 0;
        this.summaryBalanceDue = res.BalanceDue ?? 0;

        const invoiceFromSummary = Number(res.InvoiceId ?? null);
        if (Number.isFinite(invoiceFromSummary) && invoiceFromSummary > 0) {
          this.invoiceId = invoiceFromSummary;
        }

        this.isLoadingBillingSummary = false;
      },
      error: () => {
        this.resetVisitBillingSummary();
      },
    });
  }

  private applyEditVisitFormFromVisitSource(v: any, fallback?: any): void {
    const row = v && typeof v === 'object' ? v : {};
    const fb = fallback && typeof fallback === 'object' ? fallback : {};
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const val = row[k];
        if (val != null && String(val).trim() !== '') {
          return val;
        }
      }
      for (const k of keys) {
        const val = fb[k];
        if (val != null && String(val).trim() !== '') {
          return val;
        }
      }
      return '';
    };
    const visitNo = row.visitNumber ?? row.visit_number ?? fb.visitNumber ?? fb.visit_number;
    this.editingVisitNumber = visitNo != null && visitNo !== '' ? String(visitNo) : '';
    const statusRaw = String(pick('visitStatus', 'visit_status', 'status') || 'open').toLowerCase();
    this.editVisitFormData = {
      visitDate: this.normalizeDateForInput(pick('visitDate', 'visit_date')),
      visitTime: this.normalizeTimeForInput(pick('visitTime', 'visit_time')),
      visitStatus: statusRaw === 'closed' ? 'closed' : 'open',
      visitType: String(pick('visitType', 'visit_type') || 'outpatient'),
      visitReason: String(pick('visitReason', 'visit_reason') || ''),
      clientAge: String(pick('clientAge', 'client_age') || ''),
      clientContact: String(pick('clientContact', 'client_contact') || ''),
      clientAddress: String(pick('clientAddress', 'client_address') || ''),
      nextOfKinName: String(pick('nextOfKinName', 'nextOfKinsName', 'next_of_kin_name') || ''),
      nextOfKinAddress: String(pick('nextOfKinAddress', 'nextOfKinsAddress', 'next_of_kin_address') || ''),
      nextOfKinContact: String(pick('nextOfKinContact', 'nextOfKinsContact', 'next_of_kin_contact') || ''),
      relationship: String(pick('relationship') || ''),
      occupation: String(pick('occupation', 'clientOccupation', 'client_occupation') || ''),
    };
  }

  private capitalizeNamePart(value: string): string {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }
    return raw
      .toLowerCase()
      .split(/\s+/)
      .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
      .join(' ');
  }

  private normalizeClientRecord(raw: any): any {
    if (!raw || typeof raw !== 'object') {
      return {};
    }
    const source = raw.client ?? raw.data ?? raw;
    const pick = (...keys: string[]): string => {
      for (const key of keys) {
        const val = source?.[key];
        if (val != null && String(val).trim() !== '') {
          return String(val);
        }
      }
      return '';
    };

    return {
      ...source,
      id: source?.id ?? source?.clientId ?? null,
      clientId: source?.clientId ?? source?.id ?? null,
      clientFirstName: this.capitalizeNamePart(pick('clientFirstName', 'firstName')),
      clientSecondName: this.capitalizeNamePart(pick('clientSecondName', 'secondName', 'lastName')),
      clientProfilePic: pick('clientProfilePic', 'profilePic'),
      clientFileNo: pick('clientFileNo', 'fileNo', 'clientFileNumber'),
      clientContact: pick('clientContact', 'phone', 'clientPhone'),
      clientGender: pick('clientGender', 'gender'),
      clientAddress: pick('clientAddress', 'address'),
      clientAge: pick('clientAge', 'age'),
      clientDateOfBirth: pick('clientDateOfBirth', 'dateOfBirth'),
      clientOccupation: pick('clientOccupation', 'occupation'),
      clientGroupId: pick('clientGroupId', 'group_id') || source?.clientGroup?.id || null,
      clientGroupName: pick('clientGroupName', 'groupName', 'groupNameShortForm'),
      nextOfKinName: pick('nextOfKinName', 'nextOfKinsName'),
      nextOfKinContact: pick('nextOfKinContact', 'nextOfKinsContact'),
      nextOfKinAddress: pick('nextOfKinAddress', 'nextOfKinsAddress'),
      relationship: pick('relationship'),
    };
  }

  private emptyCreateVisitForm(): CreateVisitFormModel {
    return {
      visitDate: '',
      visitTime: '',
      visitStatus: 'open',
      visitType: 'outpatient',
      visitReason: '',
      clientAge: '',
      clientContact: '',
      clientAddress: '',
      nextOfKinName: '',
      nextOfKinAddress: '',
      nextOfKinContact: '',
      relationship: '',
      occupation: '',
    };
  }

  private emptyConsultationForm(): ConsultationFormModel {
    return {
      chiefComplaint: '',
      historyOfPresentingComplaint: '',
      reviewOfOtherSystems: '',
      medicalHistory: '',
      medicationHistory: '',
      allergies: '',
      familyHistory: '',
      socialHistory: '',
      clinicalExamination: '',
      diagnosis: '',
      differentialDiagnosis: '',
      followUpInstructions: '',
      notes: '',
    };
  }

  private lockOverviewContentScroll(): void {
    this.contentScrollEl = document.querySelector('.overview-layout .content-body')
      || document.querySelector('.overview-layout .content');
    if (this.contentScrollEl) {
      this.contentScrollPrevOverflow = this.contentScrollEl.style.overflow;
      this.contentScrollPrevDisplay = this.contentScrollEl.style.display;
      this.contentScrollPrevFlexDirection = this.contentScrollEl.style.flexDirection;
      this.contentScrollEl.style.overflow = 'hidden';
      this.contentScrollEl.style.display = 'flex';
      this.contentScrollEl.style.flexDirection = 'column';
    }

    this.hostScrollEl = document.querySelector('app-consultation-v2');
    if (this.hostScrollEl) {
      this.hostScrollPrevFlex = this.hostScrollEl.style.flex;
      this.hostScrollPrevMinHeight = this.hostScrollEl.style.minHeight;
      this.hostScrollPrevDisplay = this.hostScrollEl.style.display;
      this.hostScrollPrevHeight = this.hostScrollEl.style.height;
      this.hostScrollEl.style.flex = '1 1 auto';
      this.hostScrollEl.style.minHeight = '0';
      this.hostScrollEl.style.display = 'block';
      this.hostScrollEl.style.height = '100%';
    }
  }

  private unlockOverviewContentScroll(): void {
    if (this.contentScrollEl) {
      this.contentScrollEl.style.overflow = this.contentScrollPrevOverflow;
      this.contentScrollEl.style.display = this.contentScrollPrevDisplay;
      this.contentScrollEl.style.flexDirection = this.contentScrollPrevFlexDirection;
      this.contentScrollEl = null;
    }

    if (this.hostScrollEl) {
      this.hostScrollEl.style.flex = this.hostScrollPrevFlex;
      this.hostScrollEl.style.minHeight = this.hostScrollPrevMinHeight;
      this.hostScrollEl.style.display = this.hostScrollPrevDisplay;
      this.hostScrollEl.style.height = this.hostScrollPrevHeight;
      this.hostScrollEl = null;
    }
  }

  private openCv2ModalLayer(): void {
    document.body.style.overflow = 'hidden';
    this.scheduleCv2ModalOverlayAttach();
  }

  private scheduleCv2ModalOverlayAttach(): void {
    setTimeout(() => this.attachCv2ModalOverlaysToBody(), 0);
  }

  private attachCv2ModalOverlaysToBody(): void {
    const host = document.querySelector('app-consultation-v2');
    if (!host) {
      return;
    }
    host.querySelectorAll('.cv2-modal-overlay').forEach((node) => {
      const overlay = node as HTMLElement;
      if (overlay.parentElement !== document.body) {
        document.body.appendChild(overlay);
      }
    });
  }

  private restoreBodyScrollUnlessModalOpen(): void {
    if (
      !this.showCreateVisitModal &&
      !this.showChooseVisitModal &&
      !this.showEditVisitModal &&
      !this.showEditClientModal &&
      !this.showQueueClientModal &&
      !this.showPayAllDebtModal &&
      !this.showCloseVisitModal &&
      !this.showVitalsModal &&
      !this.showVitalsDeleteModal &&
      !this.showServiceModal &&
      !this.showServiceDetailsModal &&
      !this.showServiceWhenModal &&
      !this.showServiceDeleteModal &&
      !this.showServiceResultsModal &&
      !this.showPharmacyModal &&
      !this.showSundriesModal &&
      !this.showPharmacyDeleteModal &&
      !this.showPaymentModal &&
      !this.showPaymentDeleteModal &&
      !this.showPaymentReverseModal &&
      !this.showTaxDiscountModal &&
      !this.showStatementExportModal &&
      !this.showPresentingComplaintEditor &&
      !this.showPhysicalExaminationEditor &&
      !this.showDiagnosisEditor &&
      !this.showCatalogEditor
    ) {
      document.body.style.overflow = '';
    }
  }

  private showStatusMessage(message: string, tone: 'success' | 'error' | 'info'): void {
    this.statusMessage = message;
    this.statusTone = tone;
    this.showStatus = true;
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
    }
    this.statusTimer = setTimeout(() => {
      this.showStatus = false;
    }, 4000);
  }
}
