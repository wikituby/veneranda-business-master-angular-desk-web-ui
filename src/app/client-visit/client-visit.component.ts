import { Component, OnInit, AfterViewInit, OnDestroy, TemplateRef, ViewChild, ViewChildren, QueryList, PipeTransform, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { ApiService, StockDosageRule, StockTransferRequestPayload } from '../services/api.service';
import {
  applyPrescribingPrefillToTreatmentForm,
  DOSAGE_UNIT_SELECT_OPTIONS,
  formatTreatmentPeriodUnit,
  isStandardDosageUnit,
  normalizeDosageUnitForSelect,
  resolveStockPrescribingSource,
} from '../utils/prescribing-prefill.util';
import {
  ensureFromModuleInList,
  normalizeBusinessModules,
  pickDefaultFromModuleId,
  isQueueDischargeDestination,
  QUEUE_DISCHARGE_DESTINATION_ID,
  queueDestinationOptions,
} from '../utils/queue-module.util';
import {
  computePulsePressure,
  formatPulsePressureDisplay,
} from '../utils/vitals-calculations.util';
import { BLOOD_GROUP_OPTIONS } from '../utils/blood-group.util';
import {
  findUnitSellingModelByNameKeyword,
  clientGroupUsesCompassionPricing,
} from '../shared/unit-selling-model-picker/unit-selling-model.interface';
import { CartapiService } from '../services/cartapi.service';
import { DataService } from '../services/data.service';
import { MatDialog, MatDialogContent } from '@angular/material/dialog';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NgForm } from '@angular/forms';
import { PopupComponent } from '../popup/popup.component';
import { HeaderComponent } from '../header/header.component';
 import Decimal from 'decimal.js';
import { Router } from '@angular/router';
import { ItemQuantityDto } from '../interfaces/item-quantity-dto.model';
import { Product } from '../interfaces/product';
import { MatPaginatorModule } from '@angular/material/paginator';
import { NgxPaginationModule } from 'ngx-pagination';

import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

import { NgbCalendar, NgbCollapseModule, NgbDate, NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from '../services/authentication.service';

import { NgbAlertModule, NgbDatepickerModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';


import { AsyncPipe, DecimalPipe, NgFor } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { map, startWith, catchError } from 'rxjs/operators';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';

import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { FilterPipeModule } from 'ngx-filter-pipe';



import * as XLSX from 'xlsx';

import html2canvas from 'html2canvas';

import jsPDF from 'jspdf';
import {
  Document as DocxDocument,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

import { getDownloadURL, ref, uploadBytesResumable, getStorage } from 'firebase/storage';
import { getApp } from 'firebase/app';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileresourceService } from '../fileservice/fileresource.service';
import { FacilityBrandingService } from '../services/facility-branding.service';
import {
  PharmacyVisitSaleEvent,
  PharmacyVisitSyncService,
} from '../services/pharmacy-visit-sync.service';
import { TreatmentDoseAlertService } from '../services/treatment-dose-alert.service';
import { ClientWeightVitalsService } from '../services/client-weight-vitals.service';
import {
  applyPharmacyStockAvailability,
  effectivePharmacyAmountReceived,
  formatPharmacyMoney,
  getPharmacyItemTotalStock,
  isPharmacyQueuePendingStatus,
  pharmacyLineAmount,
  pharmacyNum,
  pharmacyRowStatusLabel,
  pharmacyRowToSaleLine,
  pharmacyRowsToReceiptLines,
  PharmacyPrescriptionLine,
  PharmacyReceiptLine,
} from '../utils/pharmacy-prescription-sale.util';
import {
  applyTreatmentLifecycleFlags,
  isTreatmentDispensed,
  treatmentLifecyclePatch,
  TreatmentLifecycleFlag,
} from '../utils/treatment-lifecycle.util';
import {
  buildPharmacyReceiptPdf,
  pharmacyReceiptPdfBlobUrl,
  pharmacyReceiptPdfFilename,
} from '../utils/pharmacy-receipt-pdf.util';
import {
  downloadPaymentReceiptPdf,
  downloadPaymentStatementPdf,
} from '../utils/payment-receipt-pdf.util';
import {
  formatMoneyWholeDisplay,
  formatUgxPaymentTotalDisplay,
  roundUgxMoneyOptional,
} from '../utils/ugx-money.util';
import {
  BatchSellingModel,
  extractBatchLinePricing,
} from '../utils/stock-batch-pricing.util';
import { AccessControlService } from '../services/access-control.service';

declare var $: any;
declare var bootstrap: any; // Import Bootstrap JS globally if not already done

interface StandardDosageOption {
  title: string;
  matchLabel: string;
  ruleLabel: string;
  calculatedDoseLabel: string;
  doseValue: number;
  doseUnit: string;
  frequencyValue: number;
  frequencyUnit: number;
  durationValue: number;
  durationUnit: number;
  route: string;
  quantity: number;
  totalUnits: number;
  instructions: string;
  warning?: string;
}

@Component({
  selector: 'app-client-visit',
  templateUrl: './client-visit.component.html',
  styleUrls: ['./client-visit.component.css']
})
export class ClientVisitComponent implements AfterViewInit, OnDestroy {

  readonly bloodGroupOptions = BLOOD_GROUP_OPTIONS;

  jsonData: any[] = [];

  markingTreatmentId: number | null = null;
  private pharmacyVisitSyncSub?: Subscription;

  /** Visit pharmacy sale — same flow as OTC dispensary prescriptions tab. */
  pvPharmacySaleProcessing = false;
  pvRxPaymentMethod = 'Cash At Hand';
  pvRxAmountReceived: number | null = null;
  pvRxSaleNotes = 'Pharmacy prescription sale';
  showPvPharmacyReceiptModal = false;
  pvPharmacyReceipt: {
    saleNo: string;
    saleDateLabel: string;
    saleTimeLabel: string;
    facilityName: string;
    clientName?: string;
    receivedBy: string;
    paymentMethod: string;
    notes: string;
    includePrescribing: boolean;
    lines: PharmacyReceiptLine[];
    subtotal: number;
    amountReceived: number;
    changeDue: number;
  } | null = null;

  private get storage() {
    return getStorage(getApp());
  }
  serverDirectoryName:string='';
  image:string=''
  imgSrc: any = '/assets/imgplaceholder.jpg';
  selectedFile: any;

  cartItems: any = [];


  procedureProgress: any;

  profilePic: any = "assets/images/vector.jpg";
  accountUseremail: any = "herdsontisk@gmail.com";

  isCollapsed = true;

  userName:any;

  isDropdownOpen = false;

  isCollapsedPayment = true;

  isCollapsedTaxDiscount = true;

  isCollapsedNewClient = true;

  isCollapsedNewLabTest  = true;

  isCollapsedNewConsultation = true;

  isCollapsedTreatment  = true;

  isCollapsedTreatmentChart  = true;

  invoiceId:any;

  visitCreationStatus: boolean = false;

  visitCreationResponse:any;

  isCollapsedNewLabTestUpDate = true;

  availableQuantity:any = "00";

  soldQuantity:any = "00";

  unitBuy:any = "00";

  lastUnitValue:any;


  isCollapsedNewScan  = true;

  isCollapsedNewOtherProcedure = true;

  isCollapsedNewScanUpDate = true;

  isCollapsedDrop = false;

  isUpdatingLabTest: boolean = false;


  mdUser: boolean = false;


  showDivUpdatedLoader:boolean = false;

  showDivUpdatedLoaderInvoice:boolean = false;

  showDivUpdatedLoaderTaxDiscount:boolean = false;

  showDivUpdatedLoaderPayment:boolean = false;

  showDivUpdatedLoaderServices:boolean = false;

  showDivUpdatedLoaderPharmacy:boolean = false;

  isLoadingClientVisits: boolean = false;


  showDivUpdatedLoaderPharmacyOut:boolean = false;


  showDivUpdatedLoaderVitalOut:boolean = false;



  showDivUpdatedLoaderVitals:boolean = false;

  // Edit Client Modal
  showEditClientModal: boolean = false;
  isUpdatingClientData = false;
  showClientUpdateAlert = false;
  clientUpdateAlertMessage = '';
  editClientFormData: any = {};

  isLoadingNewClientDeleteOut: boolean = true;

  showDivUpdatedLoaderDeleteOut: boolean = false;

  showDivUpdatedLoaderconsultation: boolean = false;


  isLoadingNewClient: boolean = true;
  isLoadingNewClientInvoice: boolean = true;

  isLoadingNewClientTaxDiscount: boolean = true;

  isLoadingNewClientPayment:boolean = true;
  isLoadingNewClientServices: boolean = true;
  isLoadingNewClientPharmacy: boolean = true;
  isLoadingNewClientVitals: boolean = true;
  isLoadingNewClientPharmacyOut: boolean = true;





  unitOfMeasure: any;


  isUpdatingTreatment: boolean = false;

  isUpdatingScan: boolean = false;

  isUpdatingOtherProcedure: boolean = false;

  hoveredDate: NgbDate | null = null;

  fromDate: NgbDate | null;
  toDate: NgbDate | null;

  currentVital: any = {};
  showVitalActionMenu = false;
  vitalActionMenuItem: any = null;
  vitalActionMenuPosition = { top: 0, left: 0 };

  currentLabTest: any = {};

  currentScan: any = {};

  currentProcedure: any = {};

  currentItem: any = {};
  /** Full batch label (BTH/EX/Ph/CS) for dropdown tooltip; button shows short drug name. */
  currentItemFullLabel = '';

  currentScanProcedure: any = {};

  currentOtherProcedure: any = {};

  currentInvoice: any = {};

  currentPayment: any = {};

  currentProcedureRequested: any = {};

  currentTreatmentRequested: any = {};

  currentScanProcedureRequested: any = {};

  consultation: any = {};

  complaintsList: any[] = [];
  complaintTypesList: any[] = [];
  sitesList: any[] = [];
  consultationComplaints: any[] = [];
  showComplaintTypeModal: boolean = false;
  showSiteModal: boolean = false;
  newComplaintType: any = { name: '', description: '' }; // name is used in form, mapped to title in API call
  newSite: any = { name: '', description: '' }; // name is used in form, mapped to title in API call
  
  // Search filters for dropdowns
  complaintTypeSearchFilter: { [key: number]: string } = {};
  siteSearchFilter: { [key: number]: string } = {};
  showComplaintTypeDropdown: { [key: number]: boolean } = {};
  showSiteDropdown: { [key: number]: boolean } = {};

  currentOtherProcedureRequested: any = {
    indication: '',
  };

  otherProcedureRequestedById: any = {};

  currentVitalForUpdate: any = {};

  currentProcedureId: any;

  currentScanProcedureRequestedUnitSellingPrice:any;


  showDivUpdatedLoaderSearch:boolean = true;
  isLoadingNewSearch:boolean = true;


  currentItemId: any;

  /** Stock batch row id when pharmacy treatment is picked from get-all-stock-batches (sent on save/update). */
  currentStockBatchId: any = null;
  selectedUnitSellingModelId: number | null = null;
  selectedServiceUnitSellingModelId: number | null = null;
  /** When true, pharmacy tab shows unit sell model picker (item has configured models). */
  pvUseUnitSellingModelPicker = false;
  /** Stock item id passed to unit-selling-model-picker (may differ from shop item id). */
  pvUnitSellingStockItemId: number | null = null;
  currentServiceProcedureUnitCost: number | null = null;

  currentScanProcedureId: any;

  currentOtherProcedureId: any;

  visit: any = {};

  initialVisit: any = {};

  orderedBy:string = "Ordered By"

  doneBy:string = "Done By"


  labTestOrderedBy:string = "Ordered By"

  labTestDoneBy:string = "Done By"


  treatmentOrderedBy:string = "Ordered By"

  treatmentDoneBy:string = "Done By"

  scanOrderedBy:string = "Ordered By"

  scanDoneBy:string = "Done By"

  totalUnits:any;

  stockAtHandForUpdaters:any;
  checkStockBeforeUpdatingTreatment:any;


  procedureOrderedBy:string = "Ordered By"

  procedureDoneBy: string = "Done By"

  paymentStatus:string = "Status"

  paymentForm:string = "Cash At Hand"

  /** Pay all client debt modal */
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

  taxInvoiceUpdate:any = "Applied Tax"


  station:string = "Station"

  actionButton:string="Action Button"

  currentClientGroup: string = "Chose Group Name";


  title = "Angular Server Post Data Test"

  vitalsPage: number = 1;
  pageServices: number = 1;
  treatmentPage: number = 1;
  paymentsPage: number = 1;


  totalBalance: string = "0.0000000"



  productListInitialVitals: any[] = [];
  productList: any[] = [];
  productListProceduresRequested: any[]= [];

  productListPaymentsMade: any[]= [];

  productListUltrasoundScanRequested: any[] = [];

  productListOtherProcedureRequested: any[] = [];

  otherProceduresRequestedList: any[] = [];

  productListTreatmentRequested: any[] = [];

  /** Treatment requests for the current visit, used by Treatment Chart modal dropdown (loaded when modal opens). */
  treatmentRequestListForChart: any[] = [];

  /** All treatment charts for the current visit (merged when each treatment is selected). */
  treatmentChartsList: any[] = [];
  /** Last treatment selected in the chart modal (restored when modal reopens). */
  lastTreatmentChartRequestId: number | null = null;
  treatmentChartHistoryLoading = false;

  /** Chart id being deleted (disables delete button during request). */
  isDeletingTreatmentChart: number | null = null;

  /** Sundries used on this visit (modal + stock deduction from selected store batch). */
  visitSundriesList: any[] = [];
  visitSundriesLoading = false;
  visitSundriesSaving = false;
  visitSundriesDeletingId: number | null = null;
  visitSundriesMessage = '';
  visitSundriesMessageOk = false;
  sundrySearchText = '';
  sundryDropdownOpen = false;
  selectedSundryBatch: any = null;
  sundryQuantity = 1;
  sundryCatalogLoading = false;
  private sundryStockItemIdSet = new Set<number>();
  private sundryCategoryIdSet = new Set<number>();

  procedureName: any;

  currentClientGroupId = null;

  visitReason: string = "";
  visitType: string = "";
  createVisitFormData: {
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
  } = {
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
    occupation: ''
  };
  showEditVisitModal = false;
  isUpdatingVisitDetails = false;
  isLoadingEditVisitDetails = false;
  editingVisitId: number | null = null;
  editingVisitNumber: string = '';
  editVisitFormData: {
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
  } = {
    visitDate: '',
    visitTime: '',
    visitStatus: 'open',
    visitType: '',
    visitReason: '',
    clientAge: '',
    clientContact: '',
    clientAddress: '',
    nextOfKinName: '',
    nextOfKinAddress: '',
    nextOfKinContact: '',
    relationship: '',
    occupation: ''
  };
  
  totalCostPerItem: number = 0;

  treatmentTotalCost: any = "0.0000";
  invoiceSubtotal: any = "0.0000";
  consultationFee: any = "0.0000";


  discount: any = "0.0000";
  tax: any = "0.0000";
  totalAmount: any = "0.0000";
  balanceDue: any = "0.0000";
  amountPaid: any = "0.0000";
  grandGrandTotalCost:any = "0.0000";
  
  
  

  totalLabTestCost:any = "0.00000";
  totalScanCost:any = "0.00000";
  totalOtherProcedureCost: any = "0.00000";
  totalAmountDue: any = "0.0000000";
  totalCost: any = "0.00";

  currentInitialTriageVitals: any = {}

  data: any[] = [];

  productList2: any[] = [];
  data2: any[] = [];


  filteredUsers: any[] = [];
  category: any;

  itemman: any;
  editModal: boolean = false;
  currentProductId: any;

  idSingleItem: any;

  totalCartNumber: number = 0;

  titleSingleItem: any;

  tableUpdater: boolean = false;

  showDiv: boolean = false;

  showDivAll: boolean = false;

  showDivAddToDataBase: boolean = false;

  currentProcedureCategory:any;

  

  showDivAddToDataBaseLabTest: boolean = false;

  showDivUpdatedLabTest: boolean = false;


  showDivAddToDataBaseTreatment: boolean = false;


  consultationDiagnosis: any;

  consultationMedicalHistory: any;
  consultationClinicalExamination: any;
  consultationDifferentialDiagnosis: any;
  consultationDoneBy: any;
  consultationReport: any;
  consultationChiefComplaint: any;
  consultationHistoryOfPresentingComplaint: any;
  consultationMedicationHistory: any;
  consultationAllergies: any;
  consultationFamilyHistory: any;
  consultationSocialHistory: any;
  consultationPastObstetricHistory: any = '';
  consultationPastGynaecologicalHistory: any = '';
  consultationSystemicExamination: any;
  consultationRespiratoryExamination: any = '';
  consultationCardiovascularExamination: any = '';
  consultationCnsExamination: any = '';
  consultationAbdominalExamination: any = '';
  consultationMusculoskeletalExamination: any = '';
  consultationReviewOfOtherSystems: any = '';
  consultationClinicalImpression: any = '';
  consultationFollowUpInstructions: any;
  consultationNotes: any = '';
  consultationDocuments: any[] = [];
  consultationDocUploading = false;
  consultationDocError = '';
  consultationDocDescription = '';
  readonly consultationDocAccept =
    '.pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  readonly consultationDocMaxBytes = 10 * 1024 * 1024;
  private readonly consultationDocAllowedExtensions = [
    'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx'
  ];
  showProcedureResultsModal: boolean = false;
  isLoadingProcedureResults: boolean = false;
  selectedProcedureResult: any = null;
  showTreatmentChartModal: boolean = false;
  statementExportIncludeNextOfKin = true;
  statementExportIncludePaymentTable = true;
  statementExportIncludeAmountColumns = true;
  statementExportIncludeFooter = true;
  statementExportDocumentType: 'MEDICAL_REPORT' | 'DISCHARGE_FORM' | 'MEDICAL_FORM' = 'MEDICAL_REPORT';
  statementExportSelectedTreatmentIds: number[] = [];
  statementExportSelectedProcedureIds: number[] = [];
  treatmentChartSchedule: any[] = [];
  treatmentChartForm: any = {
    dateGiven: '',
    timeGiven: '',
    givenBy: '',
    timeForNextDosage: '',
    dateForNextDosage: '',
    timeBetweenGivenToNextDosage: '',
    nextDoseIntervalHours: null as number | null,
    nextDoseIntervalMinutes: null as number | null,
    overallTotalDosages: null,
    totalDosagesGiven: null,
    unitsUsed: null,
    totalDosagesRemaining: null,
    status: ''
  };
  /** When true, autofill keeps the nurse-entered hours/minutes until next dose. */
  private treatmentChartIntervalUserSet = false;
  /** When true, manual next-dose date/time edits are kept until interval is changed. */
  private treatmentChartNextDoseUserSet = false;
  selectedTreatmentRequestForChart: any = null;
  treatmentChartId: number | null = null;
  isLoadingTreatmentChart: boolean = false;
  treatmentChartResponseMessage: string = '';
  treatmentChartResponseColor: string = '';
  treatmentChartPendingDelete: any = null;
  searchTextTreatmentChart: string = '';
  treatmentChartDrugDropdownOpen = false;
  private treatmentChartDrugDropdownIgnoreDocumentClose = false;
  showResultMrdtForm: boolean = false;
  showResultGeneralForm: boolean = false;
  showResultUrinalysisForm: boolean = false;
  showResultCbcForm: boolean = false;
  showResultParasitologyStoolForm: boolean = false;

  mrdtResult: any = {
    bs: '',
    mrdt: '',
    notes: '',
    recommendation: '',
    result: '',
    labReportTitle: ''
  };

  generalResult: any = {
    result: '',
    notes: '',
    recommendation: ''
  };

  urinalysisResult: any = {
    ph: '',
    sg: '',
    protein: '',
    glucose: '',
    ketones: '',
    blood: '',
    bilirubin: '',
    urobilinogen: '',
    nitrite: '',
    leukocyteE: '',
    epithelialCells: '',
    pusCellsWbcs: '',
    casts: '',
    redCells: '',
    crystals: '',
    others: '',
    color: '',
    appearance: '',
    volume: ''
  };

  cbcResult: any = {
    wbc: '',
    lymph: '',
    mid: '',
    gran: '',
    lymphPercent: '',
    midPercent: '',
    granPercent: '',
    hgb: '',
    rbc: '',
    hct: '',
    mcv: '',
    mch: '',
    mchc: '',
    rdwCv: '',
    rdwSd: '',
    plt: '',
    mpv: '',
    pdw: '',
    pct: ''
  };

  /** From API labReportTitle; editable in procedure results modal (clinician/doctor only). */
  procedureResultsLabReportTitle = '';

  /** Lab report row id from API — required to PATCH labReportTitle. */
  procedureResultsReportId: any = null;

  isSavingProcedureLabReportTitle = false;

  cbcInterpretation: any = {
    wbc: '',
    lymph: '',
    mid: '',
    gran: '',
    lymphPercent: '',
    midPercent: '',
    granPercent: '',
    hgb: '',
    rbc: '',
    hct: '',
    mcv: '',
    mch: '',
    mchc: '',
    rdwCv: '',
    rdwSd: '',
    plt: '',
    mpv: '',
    pdw: '',
    pct: ''
  };

  parasitologyStoolResult: any = {
    ova: '',
    cysts: '',
    larvae: '',
    color: '',
    consistency: '',
    blood: '',
    mucus: '',
    visibleParasites: '',
    others: ''
  };

  cbcResultFields: Array<{ key: string; label: string; unit: string; ref: string }> = [
    { key: 'wbc', label: 'WBC', unit: '10^9/L', ref: '4.0 - 11.0' },
    { key: 'lymph', label: 'LYMPH', unit: '10^9/L', ref: '0.8 - 4.0' },
    { key: 'mid', label: 'MID', unit: '10^9/L', ref: '0.1 - 1.5' },
    { key: 'gran', label: 'GRAN', unit: '10^9/L', ref: '2.0 - 7.5' },
    { key: 'lymphPercent', label: 'LYMPH %', unit: '%', ref: '20 - 45' },
    { key: 'midPercent', label: 'MID %', unit: '%', ref: '3 - 15' },
    { key: 'granPercent', label: 'GRAN %', unit: '%', ref: '50 - 70' },
    { key: 'hgb', label: 'HGB', unit: 'g/dL', ref: '12.0 - 17.5' },
    { key: 'rbc', label: 'RBC', unit: '10^12/L', ref: '4.2 - 5.9' },
    { key: 'hct', label: 'HCT', unit: '%', ref: '36 - 50' },
    { key: 'mcv', label: 'MCV', unit: 'fL', ref: '80 - 100' },
    { key: 'mch', label: 'MCH', unit: 'pg', ref: '27 - 33' },
    { key: 'mchc', label: 'MCHC', unit: 'g/dL', ref: '32 - 36' },
    { key: 'rdwCv', label: 'RDW-CV', unit: '%', ref: '11 - 15' },
    { key: 'rdwSd', label: 'RDW-SD', unit: 'fL', ref: '35 - 56' },
    { key: 'plt', label: 'PLT', unit: '10^9/L', ref: '150 - 450' },
    { key: 'mpv', label: 'MPV', unit: 'fL', ref: '7.5 - 11.5' },
    { key: 'pdw', label: 'PDW', unit: 'fL', ref: '9 - 17' },
    { key: 'pct', label: 'PCT', unit: '%', ref: '0.1 - 0.3' }
  ];

  private parseCbcRangeForView(ref: string): { low: number; high: number } | null {
    if (!ref) {
      return null;
    }
    const match = String(ref).match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
    if (!match) {
      return null;
    }
    const low = Number(match[1]);
    const high = Number(match[2]);
    if (Number.isNaN(low) || Number.isNaN(high)) {
      return null;
    }
    return { low, high };
  }

  private parseCbcResultValueForView(value: any): number | null {
    if (value == null || value === '') {
      return null;
    }
    const normalized = String(value).replace(/,/g, '').trim();
    const numeric = Number(normalized);
    return Number.isNaN(numeric) ? null : numeric;
  }

  private buildCbcInterpretationForView(resultValue: any, refRange: string): string {
    const parsedValue = this.parseCbcResultValueForView(resultValue);
    const parsedRange = this.parseCbcRangeForView(refRange);
    if (parsedValue == null || !parsedRange) {
      return '';
    }
    if (parsedValue < parsedRange.low) {
      return 'Low';
    }
    if (parsedValue > parsedRange.high) {
      return 'High';
    }
    return 'Normal';
  }

  /** Fills cbcInterpretation from cbcResult vs each field's ref (view popup / read-only). */
  updateCbcInterpretationsFromResults(): void {
    const nextInterp: any = {};
    for (const field of this.cbcResultFields) {
      nextInterp[field.key] = this.buildCbcInterpretationForView(
        this.cbcResult[field.key],
        field.ref
      );
    }
    this.cbcInterpretation = nextInterp;
  }

  /** CBC interpretation row for PDF built from an API report object (not `cbcResult` UI state). */
  private buildCbcInterpretationMapFromReport(report: any): Record<string, string> {
    const out: Record<string, string> = {};
    const rep = report && typeof report === 'object' ? report : {};
    for (const field of this.cbcResultFields) {
      const raw =
        rep[field.key] ??
        (field.key === 'lymphPercent'
          ? rep.lymphPct
          : field.key === 'midPercent'
            ? rep.midPct
            : field.key === 'granPercent'
              ? rep.granPct
              : field.key === 'rdwCv'
                ? rep.rdwCV
                : field.key === 'rdwSd'
                  ? rep.rdwSD
                  : undefined);
      out[field.key] = this.buildCbcInterpretationForView(raw, field.ref);
    }
    return out;
  }

  private setProcedureResultsLabReportTitleFromReport(report: any): void {
    const t = report?.labReportTitle;
    this.procedureResultsLabReportTitle =
      t != null && String(t).trim() !== '' ? String(t).trim() : '';
  }

  get isPharmacist(): boolean {
    const r = (this.userRole ?? sessionStorage.getItem('userrole') ?? '')
      .toString()
      .toLowerCase()
      .trim();
    return r === 'pharmacist' || r === 'pharmacy';
  }

  /** Pharmacy dispense-only UI — disabled when user has full client-visit access. */
  get isPharmacistDispenseOnly(): boolean {
    return this.accessControl.isPharmacistDispenseOnlyMode();
  }

  get canOpenClosedVisit(): boolean {
    return this.accessControl.canOpenClosedVisit();
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

  treatmentStatusClass(status: string | null | undefined): string {
    const label = this.treatmentStatusLabel(status).toLowerCase();
    if (label === 'given') {
      return 'badge bg-success';
    }
    if (label === 'cancelled') {
      return 'badge bg-secondary';
    }
    return 'badge bg-warning text-dark';
  }

  markTreatmentAsGiven(item: any): void {
    if (!item?.id || this.markingTreatmentId != null) {
      return;
    }
    this.onTreatmentPdDspAdmChange(item, 'dispensed', true);
  }

  visitPharmacyPendingRow(item: PharmacyPrescriptionLine | any): boolean {
    return isPharmacyQueuePendingStatus(item?.status);
  }

  /** Rows shown on visit pharmacy tab for dispensing (excludes cancelled / already sold). */
  visitPharmacySaleRows(): PharmacyPrescriptionLine[] {
    return (this.productListTreatmentRequested || []).filter((row) =>
      isPharmacyQueuePendingStatus(row?.status)
    ) as PharmacyPrescriptionLine[];
  }

  private get pharmacyStockLookupList(): any[] {
    if (this.allStockBatchesCache?.length) {
      return this.allStockBatchesCache.map((b) => this.mapStockBatchToTreatmentDropdownItem(b));
    }
    return this.itemList || [];
  }

  private resolveTreatmentRowId(row: any): number | null {
    const candidates = [
      row?.id,
      row?.treatmentRequestedId,
      row?.treatmentRequested_id,
      row?.treatment_requested_id,
    ];
    for (const candidate of candidates) {
      const id = Number(candidate);
      if (Number.isFinite(id) && id > 0) {
        return id;
      }
    }
    return null;
  }

  private normalizePharmacyTreatmentRow(row: any): PharmacyPrescriptionLine {
    const qty = pharmacyNum(row?.quantity);
    const resolvedId = this.resolveTreatmentRowId(row);
    return applyTreatmentLifecycleFlags({
      ...row,
      id: resolvedId ?? 0,
      stockBatchId: row?.stockBatchId != null ? Number(row.stockBatchId) : null,
      prescribedQuantity: qty,
      quantity: qty,
      unitSellingPrice: pharmacyNum(row?.unitSellingPrice),
      unitBuy: pharmacyNum(row?.unitBuy),
      totalAmount: pharmacyNum(row?.totalAmount) || qty * pharmacyNum(row?.unitSellingPrice),
      itemName: row?.itemName || '—',
      status: row?.status || 'pending',
    });
  }

  private applyVisitPharmacyStockAvailability(): void {
    const rows = this.visitPharmacySaleRows();
    if (!rows.length) {
      return;
    }
    applyPharmacyStockAvailability(rows, this.pharmacyStockLookupList);
  }

  visitPharmacyItemTotalStock(row: PharmacyPrescriptionLine): number {
    return getPharmacyItemTotalStock(row, this.pharmacyStockLookupList);
  }

  visitPharmacyRowOutOfStock(row: PharmacyPrescriptionLine): boolean {
    return this.visitPharmacyItemTotalStock(row) <= 0;
  }

  visitPharmacyRowStatusLabel(row: PharmacyPrescriptionLine): string {
    return pharmacyRowStatusLabel(row, this.pharmacyStockLookupList);
  }

  visitPharmacyBillableRows(): PharmacyPrescriptionLine[] {
    return this.visitPharmacySaleRows().filter((r) => r.given && r.id > 0);
  }

  get visitPharmacySubtotal(): number {
    return this.visitPharmacySaleRows()
      .filter((r) => r.given)
      .reduce((sum, row) => sum + pharmacyLineAmount(row), 0);
  }

  get visitPharmacyChangeDue(): number {
    const received = this.pvRxAmountReceived ?? 0;
    return Math.max(0, received - this.visitPharmacySubtotal);
  }

  get canCompleteVisitPharmacySale(): boolean {
    const allRows = this.visitPharmacySaleRows();
    if (!allRows.length) {
      return false;
    }
    const billable = this.visitPharmacyBillableRows();
    if (billable.length) {
      return (
        this.visitPharmacySubtotal > 0 &&
        billable.every(
          (row) => row.quantity > 0 && !this.visitPharmacyQtyExceedsStock(row)
        )
      );
    }
    return allRows.every((row) => this.visitPharmacyItemTotalStock(row) <= 0);
  }

  visitPharmacyQtyExceedsStock(row: PharmacyPrescriptionLine): boolean {
    if (!row.given || row.quantity <= 0) {
      return false;
    }
    return row.quantity > this.visitPharmacyItemTotalStock(row);
  }

  formatPharmacyMoney(amount: number): string {
    return formatPharmacyMoney(amount);
  }

  onVisitPharmacyGivenChange(item: PharmacyPrescriptionLine, checked: boolean): void {
    this.onTreatmentPdDspAdmChange(item, 'paid', checked);
  }

  onTreatmentPdDspAdmChange(
    item: any,
    flag: TreatmentLifecycleFlag,
    checked: boolean
  ): void {
    if (!item?.id) {
      return;
    }
    if (flag === 'dispensed' && checked) {
      const batchId = Number(item.stockBatchId ?? 0);
      if (batchId > 0 && this.visitPharmacyRowOutOfStock(item)) {
        item.dispensed = false;
        this.responseMessage = `${item.itemName} is out of stock and cannot be marked dispensed.`;
        this.responseColor = '#dc2626';
        this.showDivUpdatedTreatment = true;
        setTimeout(() => (this.showDivUpdatedTreatment = false), 3500);
        return;
      }
    }
    const previous = {
      paid: item.paid !== false,
      dispensed: item.dispensed === true,
      administered: item.administered === true,
      given: item.given === true,
      status: item.status,
    };
    const prevSubtotal = this.visitPharmacySubtotal;
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
    this.syncPvRxAmountReceivedToSubtotal(prevSubtotal);
    this.api.updateTreatmentLifecycleFlags(item.id, treatmentLifecyclePatch(flag, checked)).subscribe({
      next: (dto) => {
        if (dto && typeof dto === 'object') {
          applyTreatmentLifecycleFlags(Object.assign(item, dto));
        }
        this.getCostsRegularySeparately();
      },
      error: () => {
        item.paid = previous.paid;
        item.dispensed = previous.dispensed;
        item.administered = previous.administered;
        item.given = previous.given;
        item.status = previous.status;
        this.syncPvRxAmountReceivedToSubtotal();
      },
    });
  }

  onVisitPharmacyQuantityChange(item: PharmacyPrescriptionLine, raw: string | number): void {
    const prevSubtotal = this.visitPharmacySubtotal;
    const qty = Math.max(0, Math.floor(Number(raw) || 0));
    item.quantity = qty;
    item.totalAmount = qty * pharmacyNum(item.unitSellingPrice);
    this.syncPvRxAmountReceivedToSubtotal(prevSubtotal);
  }

  private syncPvRxAmountReceivedToSubtotal(previousSubtotal?: number): void {
    const total = this.visitPharmacySubtotal;
    if (
      this.pvRxAmountReceived == null ||
      (previousSubtotal != null && this.pvRxAmountReceived === previousSubtotal)
    ) {
      this.pvRxAmountReceived = total > 0 ? total : null;
    }
  }

  private parsePharmacyFrequencyUnit(unit: unknown): number | null {
    const n = Number(unit);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private visitPharmacyDosageLabel(row: PharmacyPrescriptionLine): string {
    const parts = [row.amountPerFrequencyValue, row.amountPerFrequencyUnit]
      .filter((v) => v != null && String(v).trim() !== '')
      .join(' ');
    return parts.trim() || String(row.dosage ?? '').trim() || '—';
  }

  completeVisitPharmacySale(): void {
    if (this.pvPharmacySaleProcessing) {
      return;
    }
    const visitId = Number(this.visitId);
    if (!Number.isFinite(visitId) || visitId <= 0) {
      return;
    }
    const allRows = this.visitPharmacySaleRows();
    if (!allRows.length) {
      this.responseMessage = 'No prescription lines to dispense for this visit.';
      this.responseColor = '#dc2626';
      this.showDivUpdatedTreatment = true;
      return;
    }
    const billable = this.visitPharmacyBillableRows();
    if (!billable.length && !allRows.every((row) => this.visitPharmacyItemTotalStock(row) <= 0)) {
      this.responseMessage = 'Mark at least one paid (PD) in-stock drug, or leave unpaid items unchecked.';
      this.responseColor = '#dc2626';
      this.showDivUpdatedTreatment = true;
      return;
    }
    for (const row of billable) {
      if (row.quantity <= 0 || this.visitPharmacyQtyExceedsStock(row)) {
        this.responseMessage = `Check quantity and stock for ${row.itemName}.`;
        this.responseColor = '#dc2626';
        this.showDivUpdatedTreatment = true;
        return;
      }
    }
    const total = this.visitPharmacySubtotal;
    if (billable.length > 0 && total <= 0) {
      this.responseMessage = 'Sale total must be greater than zero.';
      this.responseColor = '#dc2626';
      this.showDivUpdatedTreatment = true;
      return;
    }
    const received =
      billable.length > 0
        ? effectivePharmacyAmountReceived(this.pvRxAmountReceived, total)
        : 0;
    if (billable.length > 0 && received < total) {
      this.responseMessage = 'Amount received is less than total due.';
      this.responseColor = '#dc2626';
      this.showDivUpdatedTreatment = true;
      return;
    }

    const clientName = `${this.clientFirstName || ''} ${this.clientSecondName || ''}`.trim();
    const receivedBy = sessionStorage.getItem('username') || 'Counter';
    this.pvPharmacySaleProcessing = true;

    this.api
      .completeOtcPharmacySale({
        amountReceived: received,
        paymentForm: this.pvRxPaymentMethod,
        receivedBy,
        notes: this.pvRxSaleNotes || 'Pharmacy prescription sale',
        visitId,
        clientName,
        lines: allRows.map((row) =>
          pharmacyRowToSaleLine(
            row,
            (u) => this.parsePharmacyFrequencyUnit(u),
            this.pharmacyUseStockBatch
          )
        ),
      })
      .subscribe({
        next: (res: any) => {
          this.pvPharmacySaleProcessing = false;
          const changeAmt = Math.max(0, received - total);
          const payload = this.extractCompletedPharmacySalePayload(res);
          this.openVisitPharmacyReceiptModal(
            payload,
            allRows,
            total,
            received,
            changeAmt,
            receivedBy,
            clientName
          );
          this.pharmacyVisitSync.notifyPrescriptionSaleCompleted({
            visitId,
            treatmentRequestedIds: allRows.map((row) => row.id).filter((id) => id > 0),
            ...this.extractVisitPaymentFromSaleResponse(res),
          });
          this.pvRxAmountReceived = null;
          this.pvRxSaleNotes = 'Pharmacy prescription sale';
          const notGivenCount = allRows.filter((row) => !row.given).length;
          this.responseMessage =
            (res?.message ||
              `Prescription sale completed — ${this.formatPharmacyMoney(total)}. Change: ${this.formatPharmacyMoney(changeAmt)}.`) +
            (notGivenCount > 0
              ? ` ${notGivenCount} item(s) not given (out of stock) — on receipt, not billed.`
              : '');
          this.responseColor = '#1eb896';
          this.showDivUpdatedTreatment = true;
          setTimeout(() => (this.showDivUpdatedTreatment = false), 4000);
          this.getRequestedTreatmentByVisitSeparately();
          this.getPaymentsByVisitSeparately();
          this.getCostsRegularySeparately();
        },
        error: (err) => {
          this.pvPharmacySaleProcessing = false;
          this.responseMessage =
            err?.error?.message || err?.message || 'Prescription sale could not be completed.';
          this.responseColor = 'red';
          this.showDivUpdatedTreatment = true;
        },
      });
  }

  private openVisitPharmacyReceiptModal(
    saleData: any,
    rows: PharmacyPrescriptionLine[],
    subtotal: number,
    amountReceived: number,
    changeDue: number,
    receivedBy: string,
    clientName?: string
  ): void {
    const lines = pharmacyRowsToReceiptLines(
      rows,
      (row) => this.visitPharmacyDosageLabel(row),
      (name) => String(name ?? '').trim()
    );
    this.pvPharmacyReceipt = {
      saleNo: String(saleData?.saleNo ?? 'RX'),
      saleDateLabel: new Date().toLocaleDateString(),
      saleTimeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      facilityName: this.facilityBranding.getFacilityName(),
      clientName: clientName?.trim() || undefined,
      receivedBy: String(saleData?.receivedBy ?? receivedBy),
      paymentMethod: String(saleData?.paymentForm ?? this.pvRxPaymentMethod),
      notes: String(saleData?.notes ?? this.pvRxSaleNotes ?? '').trim(),
      includePrescribing: true,
      lines,
      subtotal: pharmacyNum(saleData?.totalAmount) || subtotal,
      amountReceived: pharmacyNum(saleData?.amountReceived) || amountReceived,
      changeDue: pharmacyNum(saleData?.changeAmount) ?? changeDue,
    };
    this.showPvPharmacyReceiptModal = true;
    document.body.classList.add('otc-receipt-modal-open');
  }

  closeVisitPharmacyReceiptModal(): void {
    this.showPvPharmacyReceiptModal = false;
    document.body.classList.remove('otc-receipt-modal-open');
  }

  async printVisitPharmacyReceipt(): Promise<void> {
    if (!this.pvPharmacyReceipt) {
      return;
    }
    await this.ensurePdfLogoLoaded();
    const pdf = buildPharmacyReceiptPdf(this.pvPharmacyReceipt, {
      addLogoToPdf: (doc, x, y, w, h) => this.facilityBranding.addLogoToJsPdf(doc, x, y, w, h),
    });
    const filename = pharmacyReceiptPdfFilename(this.pvPharmacyReceipt.saleNo);
    const blobUrl = pharmacyReceiptPdfBlobUrl(pdf);
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      pdf.save(filename);
      this.responseMessage = 'Receipt saved as PDF. Allow pop-ups to print from the browser.';
      this.responseColor = '#1eb896';
      this.showDivUpdatedTreatment = true;
      setTimeout(() => (this.showDivUpdatedTreatment = false), 4000);
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

  async downloadVisitPharmacyReceiptPdf(): Promise<void> {
    if (!this.pvPharmacyReceipt) {
      return;
    }
    await this.ensurePdfLogoLoaded();
    buildPharmacyReceiptPdf(this.pvPharmacyReceipt, {
      addLogoToPdf: (doc, x, y, w, h) => this.facilityBranding.addLogoToJsPdf(doc, x, y, w, h),
    }).save(pharmacyReceiptPdfFilename(this.pvPharmacyReceipt.saleNo));
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

  private extractCompletedPharmacySalePayload(res: any): any {
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

  ngAfterViewInit(): void {
    const openTab = sessionStorage.getItem('clientVisitOpenTab');
    if (openTab === 'pharmacy') {
      sessionStorage.removeItem('clientVisitOpenTab');
      setTimeout(() => {
        const tab = document.getElementById('nav-treatment-tab');
        if (tab) {
          (tab as HTMLButtonElement).click();
        }
      }, 400);
    }
    if (this.isPharmacistDispenseOnly) {
      this.isCollapsedTreatment = true;
      this.isCollapsedTreatmentChart = true;
      if (sessionStorage.getItem('pharmacistDispenseMode') === 'true') {
        sessionStorage.removeItem('pharmacistDispenseMode');
      }
    }

    if (this.isNoVisit) {
      this.activateClientDataTab();
    } else {
      this.activateServicesTab();
    }
  }

  /** Only clinician or doctor may edit Overall Result / Lab Report Title in the procedure results modal. */
  get canEditProcedureLabReportTitle(): boolean {
    const r = (this.userRole ?? sessionStorage.getItem('userrole') ?? '')
      .toString()
      .toLowerCase()
      .trim();
    return r === 'clinician' || r === 'doctor';
  }

  saveProcedureResultsLabReportTitle(): void {
    if (!this.canEditProcedureLabReportTitle || !this.procedureResultsReportId) {
      return;
    }
    this.isSavingProcedureLabReportTitle = true;
    const payload = { labReportTitle: this.procedureResultsLabReportTitle ?? '' };
    const done = () => {
      this.isSavingProcedureLabReportTitle = false;
    };
    const ok = () => {
      if (this.showResultMrdtForm) {
        this.mrdtResult.labReportTitle = this.procedureResultsLabReportTitle;
      }
      done();
    };
    const err = () => {
      done();
    };
    if (this.showResultMrdtForm) {
      this.api.updateLabReport(this.procedureResultsReportId, payload).subscribe(ok, err);
    } else if (this.showResultGeneralForm) {
      this.api.updateGeneralLabReport(this.procedureResultsReportId, payload).subscribe(ok, err);
    } else if (this.showResultUrinalysisForm) {
      this.api.updateUrinalysisReport(this.procedureResultsReportId, payload).subscribe(ok, err);
    } else if (this.showResultCbcForm) {
      this.api.updateCbcReport(this.procedureResultsReportId, payload).subscribe(ok, err);
    } else if (this.showResultParasitologyStoolForm) {
      this.api.updateParasitologyStoolReport(this.procedureResultsReportId, payload).subscribe(ok, err);
    } else {
      done();
    }
  }

  showDivAddToDataBaseTreatmentOut: boolean = false;

  showDivAddToDataBaseVitalOut: boolean = false;



  showDivAddToDataBaseConsultation: boolean = false;

  showDivUpdatedTreatment: boolean = false;


  showDivUpdated: boolean = false;




  showDivAddToDataBaseScan: boolean = false;

  showDivAddToDataBaseOtherProcedure: boolean = false;

  showDivAddToDataBaseOtherProcedureOut:boolean = false


  showDivAddToDataBasePayment: boolean = false;

  showDivAddToDataBaseTaxDiscount: boolean = false;

  showDivUpdatedOtherProcedure: boolean = false;




  showDivUpdatedPayment: boolean = false;


  showDivUpdatedTaxDiscount: boolean = false;

  
  showDivGeneralResponseMessages:boolean = false;

  generalResponseMessage = "";

  dataBaseResponseMessage = "";

  currentInvoiceDebt:any;



  showDivUpdatedScan: boolean = false;

  isUpdatingClientVisit: boolean = false;

  showDivUpdatedLoaderNewVisit: boolean = false;
  isLoadingNewVisit: boolean = true;


  closeModalAdd: boolean = false;

  responseColor = "";

  visitStatusBadgeColor = "";

  responseMessage = "";

  dataBaseResponseColor = "";

  closeModalUpdate: boolean = false;

  testmethod: boolean = false;

  isButtonDisabled: boolean = false;

  searchTerm: any = '';

  jwt: any;
  modelTitle:string="Model Title"

  searchQuery: string = '';

  param1Value: string = '';

  param2Value: string = '';

  param3Value: string = '';

  currentPage: number = 1;

  itemsPerPageTreatment: number = 10;
  itemsPerPagePayments: number = 10;

  itemsPerPageServices: number = 20; // Adjust as needed 

  itemsPerPageVitals: number = 4; // Adjust as needed 


  myModelValue: string = ""

  itemsPerPageNav: number = 1; // Adjust as needed 



  iconChange: string = "bi bi-chevron-down"

  isText: boolean = true;

  eyeIcon: string = "bi bi-funnel";

  eyeIconDrop: string = "bi bi-chevron-down"

  selectedColumnVitals: string = 'all'; // Initialize selectedColumn to 'all'

  selectedColumnProceduresRequested: string = 'all' 

  selectedColumnPaymentDone: string = 'all' 

  selectedColumn: string = 'all'

  dataSource: any;

  totalNoOfUnits:any;

  fakeUrl:any;

  storedFilter: any;

  clientGroupList:any[] = [];

  showQueueClientModal = false;
  showVitalsModal = false;
  showServiceRequestModal = false;
  showTreatmentPlanModal = false;
  showTaxDiscountModal = false;
  showPaymentModal = false;
  queueClientModules: any[] = [];
  queueClientClinics: any[] = [];
  queueClientError = '';
  queueClientSaving = false;
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

  get queueClientDestinationModules(): any[] {
    return queueDestinationOptions(this.queueClientModules);
  }

  labTestList:any[] = [];

  itemList:any[] = [];
  isLoadingDrugList = false;
  /** From business settings — stock batches (default) vs shop products. */
  pharmacyUseStockBatch = true;
  /** All batches (every store) — used to compute stock distribution when a drug is chosen. */
  private allStockBatchesCache: any[] = [];
  pharmacyStoreId: number | null = null;
  pharmacyStoreName = '';
  centralStoreId: number | null = null;
  centralStoreName = '';
  /** Dosage unit dropdown (same options as OTC dispensary). */
  readonly dosageUnitOptions: readonly string[] = DOSAGE_UNIT_SELECT_OPTIONS;
  showStandardDosageModal = false;
  standardDosageOptions: StandardDosageOption[] = [];
  standardDosageMessage = '';
  isLoadingStandardDosageRules = false;
  showStandardDosageRecordWeightModal = false;
  standardDosageRecordWeightValue: number | null = null;
  standardDosageRecordWeightSaving = false;
  standardDosageRecordWeightError = '';
  standardDosageRecordedWeightKg: number | null = null;
  /** Total quantity across all stores for the selected stock item. */
  stockDistributionTotal: number | string = '—';
  stockInPharmacy: number | string = '—';
  /** Per-store on-hand for the selected stock item (full store names). */
  stockDistributionByStore: { storeId: number; storeName: string; quantity: number }[] = [];
  pvStoreList: any[] = [];
  /** Cached grouped dropdown rows — avoids rebuilding on every change detection. */
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
  private stockItemPrefillCache = new Map<number, any>();
  private stockItemDosageRuleCache = new Map<number, StockDosageRule[]>();
  showPvStockTransferModal = false;
  pvStockTransferSaving = false;
  pvStockTransferMessage = '';
  pvStockTransferMessageOk = false;
  pvStockTransferBatchOptions: any[] = [];
  pvStockTransfer = {
    stockBatchId: null as number | null,
    fromStoreId: null as number | null,
    toStoreId: null as number | null,
    qty: null as number | null,
    transferredBy: '',
  };

  scanList:any[] = [];

  procedureList:any[] = [];

  clientGroup:any[] = [];

  InvoicePdf: any;


  clientFirstName: any;
  clientProfilePic:any = "assets/images/vector.jpeg";
  isLoadingProfilePic: boolean = false;
  private readonly defaultClientProfilePic = 'assets/images/vector.jpeg';
  clientFileNo: any;
  clientSecondName: any;
  treatmentId: any;
  
  // Additional client demographics
  clientAge: any;
  clientDateOfBirth: any;
  clientContact: any;
  clientAddress: any;
  clientGender: any;
  clientOccupation: any;
  clientBloodGroup: any;
  clientGroupName: any;
  nextOfKinName: any;
  nextOfKinContact: any;
  nextOfKinAddress: any;
  relationship: any;



  respiratoryRate: any;
  heartRate: any;
  spO2:any;
  height:any;
  weight:any;
  temperature:any;
  bloodPressure:any;
  timeTakenInitialVital:any;
  dateTakenInitialVital:any;
  diagnosis:any;
  clientId:any;
  procedureId:any;

  itemId:any;

  itemSellingPrice:any;

  ItemTemporaryTotal:any;

  currentProcedureRequestedId:any;


  currentTreatmentRequestedId:any;

  currentScanProcedureRequestedId:any;

  currentOtherProcedureRequestedId:any;

  vitalId:any;
  medicalHistory:any;
  clinicalExamination:any;
  visitName:any;
  visitId:any;
  searchText: string = '';
  treatmentDrugSearchText = '';

  userRole:any;

  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('serviceSearchInput') serviceSearchInput!: ElementRef;
  @ViewChildren('treatmentDrugSearchInput') treatmentDrugSearchInputs!: QueryList<ElementRef<HTMLInputElement>>;


  currentClientVisit: string = 'Choose Client Order'


  clientVisitList: any[] = []; // Initialize to hold client orders


  initialTriageVitals: any[] = []; // Store filtered vitals


  saveButtonStatus: string = "Save Client Vitals"

  saveButtonStatusLabTest: string = "Save LabTest"

  saveButtonStatusTreatment: string = "Save Drug"

  itemToDelete: any = null;

  visitStatus:string = "Open";


  isClosed: boolean = false;
  isOpen: boolean = false;
  isNoVisit: boolean = false;
  isLoadingClientBio: boolean = false;
  




  visitAction:string = "Close Order";

  saveButtonStatusOtherProcedure: string = "Save Procedure"

  saveButtonStatusPayment: string = "Save Payment"

  saveButtonStatusTaxDiscount: string = "Save Discount"

  saveButtonStatusScan: string = "Save LabTest"

  saveButtonStatusScanUpdate: string = "Save LabTest"

  visitSaveButtonStatus: string = "Save Visit"



  displayedColumns: string[] = [ "temperature",
        "systolic",
        "diastolic",
        "pulseRate",
        "spO2",
        "respiratoryRate",
        "heartRate",
        "weight",
        "height",
        "bmi",
        "muac",
        "station",
        "takenBy",
        "dateTaken",
        "timeTaken",]

  //@ViewChild('usersFormNewVisit') form!: NgForm;
  @ViewChild('usersForm') form!: NgForm;

  @ViewChild('usersFormLabTest') usersFormLabTest!: NgForm;

  @ViewChild('usersFormScan') usersFormScan!: NgForm;

  @ViewChild('usersFormTreatment') usersFormTreatment!: NgForm;

  @ViewChild('usersFormPayment') usersFormPayment!: NgForm;

  @ViewChild('usersFormTaxDiscount') usersFormTaxDiscount!: NgForm;


  @ViewChild('usersFormOtherProcedure') usersFormOtherProcedure!: NgForm;

  @ViewChild('usersFormConsultation') usersFormConsultation!: NgForm;


  @ViewChild('htmlData') htmlData!: ElementRef;

  constructor(
    private router: Router,
    private api: ApiService,
    private cartApi: CartapiService,
    private dataService: DataService, 
    private dialog: MatDialog, 
    private http: HttpClient, 
    private authService: AuthenticationService,
    private calendar: NgbCalendar, 
    public formatter: NgbDateParserFormatter,
    private fileserver: FileresourceService,
    private facilityBranding: FacilityBrandingService,
    private pharmacyVisitSync: PharmacyVisitSyncService,
    private accessControl: AccessControlService,
    private treatmentDoseAlert: TreatmentDoseAlertService,
    private clientWeightVitals: ClientWeightVitalsService,
    private cdr: ChangeDetectorRef
    ) {
    this.fromDate = calendar.getToday();
    this.toDate = calendar.getNext(calendar.getToday(), 'd', 10);
  }




  private resolveClientProfilePicUrl(item: any): string {
    const raw = item?.clientProfilePic ?? item?.profilePic ?? '';
    const trimmed = String(raw).trim();
    return trimmed || this.defaultClientProfilePic;
  }

  /** Normalize API / list / sessionStorage client shapes for the visit screen. */
  private normalizeClientRecord(raw: any): any {
    if (!raw || typeof raw !== 'object') {
      return {};
    }

    const source = raw.client ?? raw.data ?? raw;
    if (!source || typeof source !== 'object') {
      return {};
    }

    const pick = (...keys: string[]): any => {
      for (const key of keys) {
        const val = source[key];
        if (val != null && String(val).trim() !== '') {
          return val;
        }
      }
      return '';
    };

    const resolvedGroupId =
      source.clientGroup?.id ??
      source.clientGroupId ??
      source.clientGroup?.clientGroupId ??
      source.client_group_id ??
      (typeof source.clientGroup === 'number' ? source.clientGroup : null);

    const groupFromObject =
      (typeof source.clientGroup === 'object' &&
        (source.clientGroup?.groupName ||
          source.clientGroup?.name ||
          source.clientGroup?.groupNameShortForm)) ||
      '';
    const groupFromString = typeof source.clientGroup === 'string' ? source.clientGroup : '';

    const resolvedGroupName =
      pick('clientGroupName', 'groupName', 'groupNameShortForm', 'client_group_name') ||
      groupFromObject ||
      groupFromString ||
      '';

    return {
      ...source,
      id: source.id ?? source.clientId ?? null,
      clientId: source.clientId ?? source.id ?? null,
      clientFirstName: pick('clientFirstName', 'firstName', 'client_first_name'),
      clientSecondName: pick('clientSecondName', 'secondName', 'lastName', 'client_second_name'),
      clientProfilePic: pick('clientProfilePic', 'profilePic', 'client_profile_pic'),
      clientFileNo: pick('clientFileNo', 'fileNo', 'clientFileNumber', 'client_file_no'),
      clientContact: pick('clientContact', 'phone', 'clientPhone', 'client_contact'),
      clientGender: pick('clientGender', 'gender', 'client_gender'),
      clientAddress: pick('clientAddress', 'address', 'client_address'),
      clientAge: pick('clientAge', 'age', 'client_age'),
      clientDateOfBirth: pick('clientDateOfBirth', 'dateOfBirth', 'client_date_of_birth'),
      clientOccupation: pick('clientOccupation', 'occupation', 'client_occupation'),
      bloodGroup: pick('bloodGroup', 'clientBloodGroup', 'blood_group'),
      nextOfKinName: pick('nextOfKinName', 'nextOfKinsName', 'next_of_kin_name', 'nextOfKin'),
      nextOfKinContact: pick('nextOfKinContact', 'nextOfKinsContact', 'next_of_kin_contact'),
      nextOfKinAddress: pick('nextOfKinAddress', 'nextOfKinsAddress', 'next_of_kin_address'),
      relationship: pick('relationship'),
      diagnosis: pick('diagnosis'),
      clientGroupId: resolvedGroupId,
      clientGroupName: resolvedGroupName
    };
  }

  /** Push sessionStorage / list client row into view model (sidebar + Client Data tab). */
  private applyClientDataFromSession(): void {
    let stored: any = {};
    try {
      stored = JSON.parse(sessionStorage.getItem('item') || '{}');
    } catch {
      stored = {};
    }

    const normalized = this.normalizeClientRecord(stored);
    const id = this.clientId || normalized.id || normalized.clientId;
    if (!id) {
      return;
    }

    this.clientId = id;
    this.loadClientDataFromItem(normalized);
  }

  /** Bootstrap tabs: show Client Data pane when there is no active visit. */
  private activateClientDataTab(): void {
    setTimeout(() => {
      const tabBtn = document.getElementById('nav-clientBio-tab');
      const tabPane = document.getElementById('nav-clientBio');
      const tabList = document.querySelectorAll('#nav-tab .nav-link');
      const panes = document.querySelectorAll('#nav-tabContent > .tab-pane');

      tabList.forEach((el) => {
        const link = el as HTMLElement;
        if (link.id === 'nav-clientBio-tab') {
          link.classList.add('active');
          link.setAttribute('aria-selected', 'true');
        } else {
          link.classList.remove('active');
          link.setAttribute('aria-selected', 'false');
        }
      });

      panes.forEach((el) => {
        const pane = el as HTMLElement;
        if (pane.id === 'nav-clientBio') {
          pane.classList.add('active', 'show', 'pv-show-client-bio');
        } else {
          pane.classList.remove('active', 'show', 'pv-show-client-bio');
        }
      });

      if (tabBtn) {
        tabBtn.classList.add('active');
      }
      if (tabPane) {
        tabPane.classList.add('active', 'show', 'pv-show-client-bio');
      }

      this.cdr.detectChanges();
    }, 0);
  }

  /** Bootstrap tabs: show Services pane when a visit is active (default clinical tab). */
  private activateServicesTab(): void {
    setTimeout(() => {
      const tabBtn = document.getElementById('nav-Procedures-tab');
      const tabPane = document.getElementById('nav-Procedures');
      const tabList = document.querySelectorAll('#nav-tab .nav-link');
      const panes = document.querySelectorAll('#nav-tabContent > .tab-pane');

      tabList.forEach((el) => {
        const link = el as HTMLElement;
        if (link.id === 'nav-Procedures-tab') {
          link.classList.add('active');
          link.setAttribute('aria-selected', 'true');
        } else {
          link.classList.remove('active');
          link.setAttribute('aria-selected', 'false');
        }
      });

      panes.forEach((el) => {
        const pane = el as HTMLElement;
        if (pane.id === 'nav-Procedures') {
          pane.classList.add('active', 'show');
        } else {
          pane.classList.remove('active', 'show', 'pv-show-client-bio');
        }
      });

      if (tabBtn) {
        tabBtn.classList.add('active');
      }
      if (tabPane) {
        tabPane.classList.add('active', 'show');
      }

      this.cdr.detectChanges();
    }, 0);
  }

  // Method to load client data from item object
  loadClientDataFromItem(item: any): void {
    const normalized = this.normalizeClientRecord(item);
    console.log("Loading client data from item:", normalized);
    console.log('ClientFirstName', normalized.clientFirstName);
    console.log('ClientSecondName', normalized.clientSecondName);
    console.log('Clientprofilepic', normalized.clientProfilePic);
    console.log('ClientFileNo', normalized.clientFileNo);

    this.clientFirstName = normalized.clientFirstName;
    this.clientSecondName = normalized.clientSecondName;
    
    const nextProfilePic = this.resolveClientProfilePicUrl(normalized);
    if (this.clientProfilePic !== nextProfilePic) {
      this.clientProfilePic = nextProfilePic;
      // Only show spinner when loading a remote image; local fallback is instant/cached.
      this.isLoadingProfilePic = nextProfilePic !== this.defaultClientProfilePic;
    } else {
      this.isLoadingProfilePic = false;
    }
    
    // Client File Number - check multiple paths and property name variations
    this.clientFileNo = normalized.clientFileNo || '';
    
    // Client ID
    this.clientId = normalized.id || normalized.clientId || '';
    
    // Client Contact - check multiple paths
    this.clientContact = normalized.clientContact || '';
    
    // Client Group Name - check multiple paths
    this.clientGroupName = normalized.clientGroupName || '';
    this.currentClientGroupId = normalized.clientGroupId ?? null;
    if (this.clientGroupName) {
      this.currentClientGroup = this.clientGroupName;
    }
    
    // Additional client demographics
    this.clientAge = normalized.clientAge || '';
    this.clientDateOfBirth = normalized.clientDateOfBirth || '';
    this.clientAddress = normalized.clientAddress || '';
    this.clientGender = normalized.clientGender || '';
    this.clientOccupation = normalized.clientOccupation || '';
    this.clientBloodGroup = normalized.bloodGroup || '';
    
    // Next of kin information
    this.nextOfKinName = normalized.nextOfKinName || '';
    this.nextOfKinContact = normalized.nextOfKinContact || '';
    this.nextOfKinAddress = normalized.nextOfKinAddress || '';
    this.relationship = normalized.relationship || '';
    
    // Medical info
    this.diagnosis = normalized.diagnosis || this.diagnosis || '';

    if (this.clientId) {
      this.api.getTotalClientBalanceDue(this.clientId).subscribe((res) => {
        console.log('clientId for totalDebt:', this.clientId);
        this.totalAmountDue = res.TotalAmountDue;
        console.log('total costs:', res.TotalAmountDue);
        console.log('total costs front:', this.totalAmountDue);
      });
    }

    this.cdr.detectChanges();
  }

  /** Obstetric / gynaecological consultation sections are shown only for female clients. */
  isFemaleClient(): boolean {
    const g = ((this.clientGender ?? '') + '').toString().trim().toLowerCase();
    return g === 'female' || g === 'f';
  }

  facilityLogoUrl = 'assets/images/logo.jpg';

  get facilityDisplayName(): string {
    return this.facilityBranding.getFacilityName();
  }

  private applyPharmacyTreatmentSourceFromBusinessSettings(): void {
    const next = this.facilityBranding.getPharmacyUseStockBatch();
    const changed = next !== this.pharmacyUseStockBatch;
    this.pharmacyUseStockBatch = next;
    if (changed && (this.itemList?.length || this.isLoadingDrugList)) {
      this.loadDrugList();
    }
  }

  ngOnInit(): void {
    this.facilityBranding.load().subscribe({
      next: () => {
        this.facilityLogoUrl = this.facilityBranding.getLogoUrlForDisplay();
        this.facilityBranding.loadLogoDataUrl();
        this.applyPharmacyTreatmentSourceFromBusinessSettings();
      },
      error: () => {
        this.facilityLogoUrl = this.facilityBranding.getLogoUrlForDisplay();
        this.applyPharmacyTreatmentSourceFromBusinessSettings();
      },
    });
    this.applyPharmacyTreatmentSourceFromBusinessSettings();

    //console.log("item from sessionStorage:", sessionStorage.getItem('item'));

    //const item = JSON.parse(sessionStorage.getItem("item") || "[]");
    const item = JSON.parse(sessionStorage.getItem("item") || '{}');

    this.initialVisit = JSON.parse(sessionStorage.getItem("initialClientVisit") || '{}');

    console.log("Retrieved initial Visit original from sessionStorage:", JSON.parse(sessionStorage.getItem("initialClientVisit") || '{}'));

    console.log("Retrieved initial Visit from sessionStorage:", this.initialVisit);

    console.log("Retrieved item from sessionStorage:", item);

    // Load client data from sessionStorage immediately, then refresh from API
    this.applyClientDataFromSession();

    //console.log("Client orders", clientVis);

    
    const userRole = sessionStorage.getItem('userrole');

    this.userName = sessionStorage.getItem('username');

    this.userRole = userRole;


    if (this.userName === null) {
      this.router.navigate(['/login']);
    }else{
      if (userRole === "customer"){
        this.router.navigate(['/products']);

      }
    }

    if (userRole === "md") {
      this.mdUser = true;
 
    }
   
    this.resetPageLoadingFlags();

    this.loadComplaintsList();
    this.loadComplaintTypesList();
    this.loadSitesList();
    this.loadInitialTriageVitalsForVisitId(this.initialVisit);
    this.ensureClientDataLoaded();
    this.loadDrugList();

    this.pharmacyVisitSyncSub = this.pharmacyVisitSync.saleCompleted$.subscribe((event) =>
      this.refreshPharmacyDataAfterExternalSale(event)
    );

    void this.ensurePdfLogoLoaded();
  }

  private resetPageLoadingFlags(): void {
    this.isLoadingNewClientDeleteOut = false;
    this.isLoadingNewClient = false;
    this.isLoadingNewClientInvoice = false;
    this.isLoadingNewClientTaxDiscount = false;
    this.isLoadingNewClientPayment = false;
    this.isLoadingNewClientServices = false;
    this.isLoadingNewClientPharmacy = false;
    this.isLoadingNewClientVitals = false;
    this.isLoadingNewClientPharmacyOut = false;
    this.showDivUpdatedLoaderSearch = false;
    this.isLoadingNewSearch = false;
    this.isLoadingNewVisit = false;
    this.setInvoiceActionLoading(false);
    this.setPaymentSaving(false);
    this.setTaxDiscountSaving(false);
    this.showDivUpdatedLoaderNewVisit = false;
  }

  private setPaymentSaving(saving: boolean): void {
    this.showDivUpdatedLoaderPayment = saving;
    this.isLoadingNewClientPayment = saving;
  }

  private setTaxDiscountSaving(saving: boolean): void {
    this.showDivUpdatedLoaderTaxDiscount = saving;
    this.isLoadingNewClientTaxDiscount = saving;
  }

  private setInvoiceActionLoading(loading: boolean): void {
    this.showDivUpdatedLoaderInvoice = loading;
    this.isLoadingNewClientInvoice = loading;
  }

  ngOnDestroy(): void {
    this.pharmacyVisitSyncSub?.unsubscribe();
    this.treatmentDoseAlert.stopModalWatch();
  }

  /** Refresh pharmacy tab when a prescription sale completes on the OTC dispensary page. */
  refreshPharmacyDataAfterExternalSale(event: PharmacyVisitSaleEvent): void {
    const currentVisitId = Number(this.visitId ?? this.visit?.id);
    if (!Number.isFinite(currentVisitId) || currentVisitId !== Number(event.visitId)) {
      return;
    }
    if (event.amountPaid != null) {
      this.amountPaid = event.amountPaid;
    }
    if (event.balanceDue != null) {
      this.applyBalanceDueFromApi(event.balanceDue);
    }
    if (event.totalAmount != null) {
      this.totalAmount = event.totalAmount;
    }
    this.getRequestedTreatmentByVisitSeparately();
    this.getPaymentsByVisitSeparately();
    this.getCostsRegularySeparately();
  }

  // Handle image loading errors
  onImageError(event: any): void {
    console.log('Image failed to load, using fallback');
    event.target.src = this.defaultClientProfilePic;
    this.clientProfilePic = this.defaultClientProfilePic;
    this.isLoadingProfilePic = false;
  }

  // Handle successful image load
  onImageLoad(event: any): void {
    console.log('Image loaded successfully');
    this.isLoadingProfilePic = false;
  }


// load bulk

onFileChange(event: any): void {
  const target: DataTransfer = <DataTransfer>(event.target);
  if (target.files.length !== 1) {
    console.error('Only one file at a time!');
    return;
  }
  const reader: FileReader = new FileReader();
  reader.onload = (e: any) => {
    const bstr: string = e.target.result;
    const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

    const wsname: string = wb.SheetNames[0];
    const ws: XLSX.WorkSheet = wb.Sheets[wsname];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(ws);
    this.jsonData = this.mapToShopItemRequest(data);
  };
  reader.readAsBinaryString(target.files[0]);
}
  // Map Excel headers to ShopItemRequest structure

 

 // Map Excel headers to ShopItemRequest structure
mapToShopItemRequest(data: any[]): any[] {
  return data.map(row => ({
    //category: row['category'],
    subCategory: row['subCategory'],
    title: row['title'],
    unitOfMeasure: row['unitOfMeasure'],
    
    // Number conversion with fallback to 0
    costPrice: Number(row['costPrice']) || 0,
    sellingPrice: Number(row['sellingPrice']) || 0,
    stockAtHand: Number(row['stockAtHand']) || 0,
    
    // OR if you're using decimal.js for high-precision
    //costPrice: new Decimal(row['costPrice'] || 0),
    //sellingPrice: new Decimal(row['sellingPrice'] || 0),
    // stockAtHand: new Decimal(row['stockAtHand'] || 0),
  }));
}

uploadToBackend() {
  this.api.addBulkItems(this.jsonData).subscribe({
    next: res => console.log('Uploaded successfully', res),
    error: err => console.error('Upload failed', err)
  });
}

  

openDeleteModal(item: any) {
  this.itemToDelete = item;
  const modalElement = document.getElementById('deleteConfirmModal');
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

confirmDelete() {
  if (this.itemToDelete) {
    this.deleteItem(this.itemToDelete.id);
  }
  this.itemToDelete = null;
}

deleteItem(id: number) {
  // your delete logic here (API call)
  console.log('Deleted item with ID:', id);
}





  fetchDiscounts() {

    this.api.getInvoiceForVisitId(this.visitId).subscribe((res) => {
     this.currentInvoice = res;
      console.log("invoice", res);


      this.currentInvoice.discount = res.discount;
      this.currentInvoice.tax = res.tax;

    });

  }


    fetchDebt() {

    this.api.getInvoiceForVisitId(this.visitId).subscribe((res) => {
     this.currentInvoice = res;
      console.log("invoice", res);

      this.applyBalanceDueFromApi(res.balanceDue);

    });

  }

  openPayAllClientDebtModal(): void {
    if (!this.clientId) {
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
        setTimeout(() => ($('#payAllClientDebtModal') as any).modal('show'), 0);
      },
      error: () => {
        this.payAllDebtLoading = false;
        this.payAllDebtMessage = 'Could not load client orders.';
        this.payAllDebtMessageOk = false;
        setTimeout(() => ($('#payAllClientDebtModal') as any).modal('show'), 0);
      },
    });
  }

  closePayAllClientDebtModal(): void {
    ($('#payAllClientDebtModal') as any).modal('hide');
  }

  onPayAllDebtAmountChange(): void {
    this.rebuildPayAllDebtAllocation();
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

  rebuildPayAllDebtAllocation(): void {
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
          this.getPaymentsByVisitSeparately();
          this.getCostsRegularySeparately();
          this.fetchDebt();
        }
        if (this.clientId) {
          this.loadClientVisits(this.clientId);
        }
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

  private refreshClientTotalDebt(): void {
    if (!this.clientId) {
      return;
    }
    this.api.getTotalClientBalanceDue(this.clientId).subscribe((res) => {
      this.totalAmountDue = res?.TotalAmountDue ?? this.totalAmountDue;
    });
  }

  payAllDebtTotalOutstanding(): number {
    return (this.payAllDebtVisits || []).reduce((sum, visit) => {
      const due = Number(visit?.balanceDue ?? 0);
      return sum + (Number.isFinite(due) && due > 0 ? due : 0);
    }, 0);
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

  private isPayAllDebtNoOutstandingMessage(message: string): boolean {
    return (message || '').toLowerCase().includes('no outstanding visit balances');
  }

  private getDefaultPayAllDebtAmount(): number | null {
    const visitOutstanding = this.payAllDebtTotalOutstanding();
    if (visitOutstanding > 0) {
      return visitOutstanding;
    }
    return null;
  }





openOtherProcedureDropdown() {
  this.searchText = "";
  this.loadRequestedOtherProcedure();  // your existing function

  setTimeout(() => {
    this.serviceSearchInput?.nativeElement?.focus();
  }, 0);
}




























  loadClientVisit(id: any): void {
    this.api.getInitialTriageVitalsForVisitId(id).subscribe((res) => {
      this.initialTriageVitals = res;
      console.log(this.initialTriageVitals);
      console.log(id);

    });


  }

    loadConsultation(): void {
    this.api.getConsultationsByVisit(this.visitId).subscribe((res) => {
      this.consultation = res || {};
      this.consultationDiagnosis = res.diagnosis || '';
      this.consultationMedicalHistory = res.medicalHistory || '';
      this.consultationClinicalExamination = res.clinicalExamination || '';
      this.consultationDifferentialDiagnosis = res.differentialDiagnosis || '';
      // doneBy is always the logged-in user on save; report field removed from UI
      this.consultationChiefComplaint = res.chiefComplaint || '';
      this.consultationHistoryOfPresentingComplaint = res.historyOfPresentingComplaint || '';
      this.consultationMedicationHistory = res.medicationHistory || '';
      this.consultationAllergies = res.allergies || '';
      this.consultationFamilyHistory = res.familyHistory || '';
      this.consultationSocialHistory = res.socialHistory || '';
      if (this.isFemaleClient()) {
        this.consultationPastObstetricHistory = res.pastObstetricHistory || '';
        this.consultationPastGynaecologicalHistory = res.pastGynaecologicalHistory || '';
      } else {
        this.consultationPastObstetricHistory = '';
        this.consultationPastGynaecologicalHistory = '';
      }
      this.consultationRespiratoryExamination = res.respiratoryExamination || '';
      this.consultationCardiovascularExamination = res.cardiovascularExamination || '';
      this.consultationCnsExamination = res.cnsExamination || '';
      this.consultationAbdominalExamination = res.abdominalExamination || '';
      this.consultationMusculoskeletalExamination = res.musculoskeletalExamination || '';
      this.consultationReviewOfOtherSystems = res.reviewOfOtherSystems || '';
      this.consultationFollowUpInstructions = res.followUpInstructions || '';
      this.consultationNotes = res.notes || '';
      this.consultation.medicalHistory = res.medicalHistory || res.medical_history || res.history || res.clientMedicalHistory || this.consultation.medicalHistory || '';
      this.medicalHistory = this.consultation.medicalHistory;
      // FUTURE: reload complaints when complaints UI is re-enabled (see template *ngIf="false")
      /*
      if (res.complaints && Array.isArray(res.complaints)) {
        this.consultationComplaints = res.complaints.map((comp: any) => ({
          id: comp.id,
          complaintTypeId: comp.complaintType?.id || comp.complaintTypeId || comp.complaintType,
          siteId: comp.site?.id || comp.siteId || comp.site,
          type: comp.type || '',
          duration: comp.duration || '',
          natureCharacter: comp.natureCharacter || '',
          severity: comp.severity || '',
          onset: comp.onset || '',
          courseProgression: comp.courseProgression || '',
          aggravatingFactors: comp.aggravatingFactors || '',
          relievingFactors: comp.relievingFactors || '',
          associatedSymptoms: comp.associatedSymptoms || ''
        }));
      } else {
        this.consultationComplaints = [];
      }
      */
      this.consultationComplaints = [];
      console.log(res);
      this.loadConsultationDocuments();

    });


  }

  loadConsultationDocuments(): void {
    if (!this.visitId) {
      this.consultationDocuments = [];
      return;
    }
    this.api.getConsultationDocumentsByVisit(this.visitId).subscribe({
      next: (res: any) => {
        this.consultationDocuments = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.consultationDocuments = [];
      },
    });
  }

  onConsultationDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file || !this.visitId) {
      return;
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!this.consultationDocAllowedExtensions.includes(ext)) {
      this.consultationDocError =
        'Allowed files: PDF, images (PNG, JPG, GIF, WEBP), Word (.doc, .docx), Excel (.xls, .xlsx).';
      input.value = '';
      return;
    }
    if (file.size > this.consultationDocMaxBytes) {
      this.consultationDocError = 'File must be 10 MB or smaller.';
      input.value = '';
      return;
    }

    this.consultationDocUploading = true;
    this.consultationDocError = '';

    this.api.uploadConsultationDocumentToCloudinary(this.visitId, file).subscribe({
      next: (fileUrl) => {
        const payload = {
          fileName: file.name,
          fileUrl,
          contentType: this.resolveConsultationDocContentType(file, ext),
          fileSizeBytes: file.size,
          description: (this.consultationDocDescription || '').trim(),
          uploadedBy: (this.userName ?? sessionStorage.getItem('username') ?? '').toString().trim(),
        };
        this.api.createConsultationDocument(this.visitId, payload).subscribe({
          next: () => {
            this.consultationDocDescription = '';
            this.loadConsultationDocuments();
            this.consultationDocUploading = false;
            input.value = '';
          },
          error: (err: any) => {
            this.consultationDocError =
              err?.error?.message || err?.message || 'Could not save document record. Please try again.';
            this.consultationDocUploading = false;
            input.value = '';
          },
        });
      },
      error: (err: any) => {
        console.error(err);
        this.consultationDocError =
          err?.message || err?.error?.message || 'Cloudinary upload failed. Please try again.';
        this.consultationDocUploading = false;
        input.value = '';
      },
    });
  }

  private resolveConsultationDocContentType(file: File, ext: string): string {
    if (file.type?.trim()) {
      return file.type;
    }
    const byExt: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return byExt[ext] || 'application/octet-stream';
  }

  removeConsultationDocument(doc: any): void {
    if (!doc?.id) {
      return;
    }
    if (!confirm(`Remove "${doc.fileName}" from this visit?`)) {
      return;
    }
    this.api.deleteConsultationDocument(doc.id).subscribe({
      next: () => this.loadConsultationDocuments(),
      error: (err: any) => {
        this.consultationDocError = err?.error?.message || 'Could not delete document.';
      },
    });
  }

  openConsultationDocument(doc: any): void {
    if (!doc?.fileUrl) {
      return;
    }
    window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
  }

  isConsultationDocImage(doc: any): boolean {
    const type = String(doc?.contentType || '').toLowerCase();
    if (type.startsWith('image/')) {
      return true;
    }
    const name = String(doc?.fileName || '').toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);
  }

  isConsultationDocPdf(doc: any): boolean {
    const type = String(doc?.contentType || '').toLowerCase();
    if (type === 'application/pdf') {
      return true;
    }
    return String(doc?.fileName || '').toLowerCase().endsWith('.pdf');
  }

  formatConsultationDocSize(bytes: number | null | undefined): string {
    if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) {
      return '—';
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  loadComplaintsList(): void {
    this.api.getAllComplaints().subscribe((res: any) => {
      this.complaintsList = res || [];
      console.log('Complaints list loaded:', this.complaintsList);
    });
  }

  loadComplaintTypesList(): void {
    this.api.getAllComplaintTypes().subscribe(
      (res: any) => {
        this.complaintTypesList = res || [];
        console.log('Complaint types list loaded:', this.complaintTypesList);
        console.log('Number of complaint types:', this.complaintTypesList.length);
      },
      (error: any) => {
        console.error('Error loading complaint types list:', error);
        this.complaintTypesList = [];
      }
    );
  }

  loadSitesList(): void {
    this.api.getAllSites().subscribe(
      (res: any) => {
        this.sitesList = res || [];
        console.log('Sites list loaded:', this.sitesList);
        console.log('Number of sites:', this.sitesList.length);
      },
      (error: any) => {
        console.error('Error loading sites list:', error);
        this.sitesList = [];
      }
    );
  }

  getFilteredComplaintTypes(index: number): any[] {
    const searchTerm = (this.complaintTypeSearchFilter[index] || '').toLowerCase();
    if (!searchTerm) {
      return this.complaintTypesList;
    }
    return this.complaintTypesList.filter(compType => 
      compType.title?.toLowerCase().includes(searchTerm)
    );
  }

  getFilteredSites(index: number): any[] {
    const searchTerm = (this.siteSearchFilter[index] || '').toLowerCase();
    if (!searchTerm) {
      return this.sitesList;
    }
    return this.sitesList.filter(site => 
      site.title?.toLowerCase().includes(searchTerm)
    );
  }

  toggleComplaintTypeDropdown(index: number): void {
    this.showComplaintTypeDropdown[index] = !this.showComplaintTypeDropdown[index];
    if (this.showComplaintTypeDropdown[index]) {
      this.complaintTypeSearchFilter[index] = '';
    }
  }

  toggleSiteDropdown(index: number): void {
    this.showSiteDropdown[index] = !this.showSiteDropdown[index];
    if (this.showSiteDropdown[index]) {
      this.siteSearchFilter[index] = '';
    }
  }

  selectComplaintType(complaintIndex: number, complaintTypeId: any): void {
    this.consultationComplaints[complaintIndex].complaintTypeId = complaintTypeId;
    this.showComplaintTypeDropdown[complaintIndex] = false;
    this.complaintTypeSearchFilter[complaintIndex] = '';
  }

  selectSite(complaintIndex: number, siteId: any): void {
    this.consultationComplaints[complaintIndex].siteId = siteId;
    this.showSiteDropdown[complaintIndex] = false;
    this.siteSearchFilter[complaintIndex] = '';
  }

  getSelectedComplaintTypeTitle(complaintIndex: number): string {
    const selectedId = this.consultationComplaints[complaintIndex]?.complaintTypeId;
    if (!selectedId) return 'Select Complaint Type';
    const selected = this.complaintTypesList.find(ct => ct.id === selectedId);
    return selected?.title || 'Select Complaint Type';
  }

  getSelectedSiteTitle(complaintIndex: number): string {
    const selectedId = this.consultationComplaints[complaintIndex]?.siteId;
    if (!selectedId) return 'Select Site';
    const selected = this.sitesList.find(s => s.id === selectedId);
    return selected?.title || 'Select Site';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.pv-vitals-action-menu')) {
      this.closeVitalActionMenu();
    }
    if (!target.closest('.pv-item-dropdown')) {
      this.isDropdownOpen = false;
    }
    if (
      this.showTreatmentChartModal &&
      this.treatmentChartDrugDropdownOpen &&
      !this.treatmentChartDrugDropdownIgnoreDocumentClose &&
      !target.closest('.pv-treatment-chart-drug-dropdown')
    ) {
      this.treatmentChartDrugDropdownOpen = false;
      this.cdr.markForCheck();
    }
    // Close dropdowns when clicking outside
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      Object.keys(this.showComplaintTypeDropdown).forEach(key => {
        this.showComplaintTypeDropdown[parseInt(key)] = false;
      });
      Object.keys(this.showSiteDropdown).forEach(key => {
        this.showSiteDropdown[parseInt(key)] = false;
      });
    }
  }

  closeVitalActionMenu(): void {
    this.showVitalActionMenu = false;
    this.vitalActionMenuItem = null;
  }

  openVitalActionMenu(item: any, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 150;
    this.vitalActionMenuItem = item;
    this.vitalActionMenuPosition = {
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
    };
    this.showVitalActionMenu = true;
  }

  editVitalFromActionMenu(item: any): void {
    this.closeVitalActionMenu();
    this.editVital(item);
  }

  deleteVitalFromActionMenu(id: any): void {
    this.closeVitalActionMenu();
    this.deleteVital(id);
  }

  openSiteModal(): void {
    this.showSiteModal = true;
    this.newSite = { name: '', description: '' };
    // Use Bootstrap modal
    ($('#siteModal') as any).modal('show');
  }

  closeSiteModal(): void {
    this.showSiteModal = false;
    this.newSite = { name: '', description: '' };
    ($('#siteModal') as any).modal('hide');
  }

  saveSite(data: any): void {
    // Map name to title for backend compatibility
    const payload = {
      title: data.name || data.title || '',
      description: data.description || ''
    };

    if (!payload.title || payload.title.trim() === '') {
      this.responseMessage = "Site title is required";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivAddToDataBaseConsultation = true;
      setTimeout(() => {
        this.showDivAddToDataBaseConsultation = false;
      }, 3000);
      return;
    }

    console.log('Data being sent to API:', JSON.stringify(payload, null, 2));
    console.log('Payload object:', payload);

    this.api.createSite(payload).subscribe(
      (response: any) => {
        console.log("Site created:", response);
        if (response && response.message) {
          this.responseColor = "rgb(11, 155, 112)";
          this.responseMessage = response.message;
        } else {
          this.responseColor = "rgb(11, 155, 112)";
          this.responseMessage = "Site created successfully";
        }
        this.showDivAddToDataBaseConsultation = true;
        
        // Reload sites list immediately to update dropdown
        setTimeout(() => {
          this.loadSitesList();
          console.log('Sites list reloaded after creation');
        }, 500);
        
        // Close modal and reset form
        setTimeout(() => {
          this.showDivAddToDataBaseConsultation = false;
          this.closeSiteModal();
        }, 2000);
      },
      (error: any) => {
        console.error("Error creating site:", error);
        this.responseMessage = error.error?.message || "An error occurred while creating site";
        this.responseColor = "rgb(238, 16, 16)";
        this.showDivAddToDataBaseConsultation = true;
        setTimeout(() => {
          this.showDivAddToDataBaseConsultation = false;
        }, 4000);
      }
    );
  }

  openComplaintTypeModal(): void {
    this.showComplaintTypeModal = true;
    this.newComplaintType = { name: '', description: '' };
    // Use Bootstrap modal
    ($('#complaintTypeModal') as any).modal('show');
  }

  closeComplaintTypeModal(): void {
    this.showComplaintTypeModal = false;
    this.newComplaintType = { name: '', description: '' };
    ($('#complaintTypeModal') as any).modal('hide');
  }

  saveComplaintType(data: any): void {
    // Map name to title for backend compatibility
    const payload = {
      title: data.name || data.title || '',
      description: data.description || ''
    };

    if (!payload.title || payload.title.trim() === '') {
      this.responseMessage = "Complaint type title is required";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivAddToDataBaseConsultation = true;
      setTimeout(() => {
        this.showDivAddToDataBaseConsultation = false;
      }, 3000);
      return;
    }

    console.log('Data being sent to API:', JSON.stringify(payload, null, 2));
    console.log('Payload object:', payload);

    this.api.createComplaintType(payload).subscribe(
      (response: any) => {
        console.log("Complaint type created:", response);
        if (response && response.message) {
          this.responseColor = "rgb(11, 155, 112)";
          this.responseMessage = response.message;
        } else {
          this.responseColor = "rgb(11, 155, 112)";
          this.responseMessage = "Complaint type created successfully";
        }
        this.showDivAddToDataBaseConsultation = true;
        
        // Reload complaint types list immediately to update dropdown
        // Add a small delay to ensure backend has processed the creation
        setTimeout(() => {
          this.loadComplaintTypesList();
          console.log('Complaint types list reloaded after creation');
        }, 500);
        
        // Close modal and reset form
        setTimeout(() => {
          this.showDivAddToDataBaseConsultation = false;
          this.closeComplaintTypeModal();
        }, 2000);
      },
      (error: any) => {
        console.error("Error creating complaint type:", error);
        this.responseMessage = error.error?.message || "An error occurred while creating complaint type";
        this.responseColor = "rgb(238, 16, 16)";
        this.showDivAddToDataBaseConsultation = true;
        setTimeout(() => {
          this.showDivAddToDataBaseConsultation = false;
        }, 4000);
      }
    );
  }

  addComplaint(): void {
    this.consultationComplaints.push({
      complaintTypeId: null,
      siteId: null,
      type: '',
      duration: '',
      natureCharacter: '',
      severity: '',
      onset: '',
      courseProgression: '',
      aggravatingFactors: '',
      relievingFactors: '',
      associatedSymptoms: ''
    });
  }

  removeComplaint(index: number): void {
    this.consultationComplaints.splice(index, 1);
  }


  getUserFormDataConsultation(data: any){

    this.showDivUpdatedLoaderconsultation = true;

    if (!this.visitId) {
      this.responseMessage = "Missing visit Id";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivAddToDataBaseConsultation = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBaseConsultation = false;
        }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }

    const loggedInDoneBy = (this.userName ?? sessionStorage.getItem('username') ?? '').toString().trim();

    // Include complaints in the data payload
    const consultationData: any = {
      ...data,
      doneBy: loggedInDoneBy,
      // FUTURE: complaints: this.consultationComplaints,
      complaints: [],
    };
    if (!this.isFemaleClient()) {
      consultationData.pastObstetricHistory = '';
      consultationData.pastGynaecologicalHistory = '';
    }
  
      console.log('Payload being sent:', JSON.stringify(consultationData, null, 2));
      console.log("visit id:", this.visitId);
      console.log("Formatted Data:", consultationData);
  
      this.api.saveConsultation(this.visitId, consultationData).subscribe(
        (response: any) => {
          console.log("Data sent to API:", data);
          this.consultation = response;

  
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            console.log("Message not found!");
            this.responseColor = "rgb(57, 158, 108)"; // Red for error
            this.responseMessage = "Internal server error";
          }

          this.showDivUpdatedLoaderconsultation = false;

  
          this.showDivAddToDataBaseConsultation = true;
          //this.showDivUpdatedTreatment = false;
  
          //this.getRequestedTreatmentByVisitSeparately();
         // this.getCostsRegularySeparately();
          console.log("consultation added successfully");
          //this.getOtherProceduresByVisitSeparately()
          //this.getCostsRegularySeparately()
          //this.getLabTestsSeparately()        
          this.loadConsultation()
  
          setTimeout(() => {
            this.showDivAddToDataBaseConsultation = false;
            //this.showDivUpdatedTreatment = false;
            this.itemId = "";
            //this.saveButtonStatusTreatment = "Save Treatment";
            //this.clearTreatmentForm();
          }, 3000);
        },
        (error: any) => {
          console.error("Error saving consultation:", error);
    
          // Log the full error object for debugging
          console.error("Full error details:", error);
    
          // Extract the error message from the server response
          if (error.error && error.error.message) {
            this.responseMessage = error.error.message; // Use the error message from the server
          } else if (error.error && error.error.error) {
            this.responseMessage = error.error.error; // Fallback to error.error.error
          } else {
            this.responseMessage = "An unexpected error occurred. Please try again.";
          }
          this.responseColor = "rgb(57, 158, 108)"; // Red for error

          this.showDivUpdatedLoaderconsultation = false;

    
          this.showDivAddToDataBaseConsultation = true;
          //this.showDivUpdatedTaxDiscount = false;
    
          setTimeout(() => {
            this.showDivAddToDataBaseConsultation = false;
            //this.showDivUpdatedTaxDiscount = false;
            //this.procedureId = ""
           // this.saveButtonStatusTaxDiscount = "Save Discount"
          }, 5000);
        }
      );
    

    };
  







  
  getUserFormDataTreatment(data: any) {
    this.showDivUpdatedLoaderPharmacy = true;
    this.isLoadingNewClientPharmacy = true;
    console.log("Original data:", data);
  
    // ✅ Convert quantity to a double or set to null
    if (data.quantity === undefined || data.quantity === null || data.quantity === '' || data.quantity <= 0) {
      this.responseMessage = "Quantity cannot be undefined nor null nor less than zero";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderPharmacy = false;
      this.isLoadingNewClientPharmacy = false;

      this.showDivAddToDataBaseTreatment = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBaseTreatment = false;
      }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    } else {
      data.quantity = parseFloat(data.quantity); // Convert to double (JavaScript number)
    }

        // ✅ Convert quantity to a double or set to null
    if (data.totalUnits === undefined || data.totalUnits === null || data.totalUnits === '' || data.totalUnits <= 0) {
      this.responseMessage = "Total units cannot be undefined, null, or less than zero";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderPharmacy = false;
      this.isLoadingNewClientPharmacy = false;

      this.showDivAddToDataBaseTreatment = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBaseTreatment = false;
      }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    } else {
      data.totalUnits = parseFloat(data.totalUnits); // Convert to double (JavaScript number)
    }
  
   // ✅ Convert quantity to a double or set to null
    if (data.durationUnit === undefined || data.durationUnit === null || data.durationUnit === '' || data.durationUnit <= 0) {
      this.responseMessage = "duration Unit cannot be undefined nor null nor empty";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderPharmacy = false;
      this.isLoadingNewClientPharmacy = false;

      this.showDivAddToDataBaseTreatment = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBaseTreatment = false;
      }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }
       // ✅ Convert quantity to a double or set to null
    if (data.frequencyUnit === undefined || data.frequencyUnit === null || data.frequencyUnit === '' || data.frequencyUnit <= 0) {
      this.responseMessage = "frequency Unit cannot be undefined nor null nor empty";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderPharmacy = false;
      this.isLoadingNewClientPharmacy = false;

      this.showDivAddToDataBaseTreatment = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBaseTreatment = false;
      }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }

    if (!this.visitId) {
      this.responseMessage = "Missing visit Id";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderPharmacy = false;
      this.isLoadingNewClientPharmacy = false;

      this.showDivAddToDataBaseTreatment = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBaseTreatment = false;
        }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }

    const requestData = this.buildTreatmentRequestedRequestPayload(data);
    if (!requestData) {
      this.responseMessage =
        this.currentItemId == null || this.currentItemId === ''
          ? 'Please select a drug or treatment item'
          : 'Invalid treatment request data';
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderPharmacy = false;
      this.isLoadingNewClientPharmacy = false;
      this.showDivAddToDataBaseTreatment = true;
      setTimeout(() => {
        this.showDivAddToDataBaseTreatment = false;
      }, 2000);
      return;
    }
  
    if (this.saveButtonStatusTreatment == "Save Drug") {
      
      console.log('Payload being sent:', JSON.stringify(requestData, null, 2));
      console.log("visit id:", this.visitId);
      console.log("Formatted Data:", data);
  
      this.api.saveTreatmentRequested(this.visitId, requestData).subscribe(
        (response: any) => {
          console.log("Data sent to API:", requestData);


  
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            console.log("Message not found!");
            this.responseColor = "rgb(238, 16, 16)"; // Red for error
            this.responseMessage = "Internal server error";
          }

          this.showDivUpdatedLoaderPharmacy = false;
          this.isLoadingNewClientPharmacy = false;

  
          this.showDivAddToDataBaseTreatment = true;
          this.showDivUpdatedTreatment = false;
  
          this.getRequestedTreatmentByVisitSeparately();
          this.getCostsRegularySeparately();
          this.loadDrugList();
          console.log("Treatment added successfully");
  
          setTimeout(() => {
            this.showDivAddToDataBaseTreatment = false;
            this.showDivUpdatedTreatment = false;
            this.itemId = "";
            this.saveButtonStatusTreatment = "Save Drug";
            this.clearTreatmentForm();
          }, 3000);
        },
        (error: any) => {
          console.error("Error saving treatment:", error);
  
          // Display the error message in the div
          this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
          this.responseColor = "rgb(238, 16, 16)"; // Red for error

          this.showDivUpdatedLoaderPharmacy = false;
          this.isLoadingNewClientPharmacy = false;

  
          this.showDivAddToDataBaseTreatment = true;
          this.showDivUpdatedTreatment = false;
  
          setTimeout(() => {
            this.showDivAddToDataBaseTreatment = false;
            this.showDivUpdatedTreatment = false;
          }, 7000);
        }
      );
    } else if (this.saveButtonStatusTreatment == "Update") {

    const requestUpatedData = this.buildTreatmentRequestedRequestPayload(data);
    if (!requestUpatedData) {
      this.responseMessage =
        this.currentItemId == null || this.currentItemId === ''
          ? 'Please select a drug or treatment item'
          : 'Invalid treatment request data';
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderPharmacy = false;
      this.isLoadingNewClientPharmacy = false;
      this.showDivAddToDataBaseTreatment = true;
      setTimeout(() => {
        this.showDivAddToDataBaseTreatment = false;
      }, 2000);
      return;
    }

    const treatmentId = this.resolveTreatmentRowId({ id: this.treatmentId });
    if (treatmentId == null || !Number.isFinite(treatmentId) || treatmentId <= 0) {
      this.responseMessage = 'Cannot update: treatment line has no saved id. Refresh and try again.';
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderPharmacy = false;
      this.isLoadingNewClientPharmacy = false;
      this.showDivAddToDataBaseTreatment = true;
      setTimeout(() => {
        this.showDivAddToDataBaseTreatment = false;
      }, 2000);
      return;
    }


      console.log("currentTreatmentRequestedId id", this.treatmentId);
      console.log("confirm data before sending to api", requestUpatedData);
      console.log("confirm update status", this.saveButtonStatusTreatment);

  
      this.api.updateTreatment(treatmentId, requestUpatedData).subscribe(
        (response: any) => {

          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            this.responseMessage = response.message;
          } else {
            console.log("Message not found!");
            this.responseColor = "rgb(238, 16, 16)"; // Red for error
            this.responseMessage = "Internal server error; Failed to Update";
          }
  
          this.getRequestedTreatmentByVisitSeparately();
          this.getCostsRegularySeparately();
          this.loadDrugList();
          console.log("Treatment Request updated successfully");
          this.showDivUpdatedLoaderPharmacy = false;
          this.isLoadingNewClientPharmacy = false;

  
          this.showDivAddToDataBase = false;
          this.showDivUpdatedTreatment = true;
  
          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdatedTreatment = false;
            this.itemId = "";
            this.saveButtonStatusTreatment = "Save Drug";
            this.clearTreatmentForm();
          }, 3000);
        },
        (error: any) => {
          console.error("Error updating Treatment:", error);
  
          // Display the error message in the div
          this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
          this.responseColor = "rgb(238, 16, 16)"; // Red for error

          this.showDivUpdatedLoaderPharmacy = false;
          this.isLoadingNewClientPharmacy = false;

  
          this.showDivAddToDataBase = true;
          this.showDivUpdated = false;
  
          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdated = false;
          }, 3000);
        }
      );
    }
  }

  /**
   * POST/PUT body for treatment requests — `itemId` is stock item id; `stockBatchId` is the pharmacy batch to dispense from.
   */
  private buildTreatmentRequestedRequestPayload(data: any): {
    quantity: number;
    itemId: number;
    stockBatchId?: number;
    visitId: number;
    durationValue: number;
    durationUnit: number;
    amountPerFrequencyValue: number;
    amountPerFrequencyUnit: string;
    frequencyValue: number;
    totalUnits: number;
    frequencyUnit: number;
    instructions: string;
    route: string;
    unitSellingModelId?: number;
  } | null {
    const itemId = Number(this.currentItemId);
    const visitId = Number(this.visitId);
    if (this.pharmacyUseStockBatch) {
      if (this.currentStockBatchId == null || this.currentStockBatchId === '') {
        this.currentStockBatchId = this.resolveTreatmentStockBatchId(this.currentTreatmentRequested);
      }
    } else {
      this.currentStockBatchId = null;
    }
    let stockBatchId = Number(this.currentStockBatchId);
    if (this.pharmacyUseStockBatch && (!Number.isFinite(stockBatchId) || stockBatchId <= 0)) {
      stockBatchId = Number(
        this.currentTreatmentRequested?.stockBatchId ??
          this.currentTreatmentRequested?.stock_batch_id
      );
    }
    if (!Number.isFinite(itemId) || itemId <= 0 || !Number.isFinite(visitId) || visitId <= 0) {
      return null;
    }
    const hasStockBatch =
      this.pharmacyUseStockBatch && Number.isFinite(stockBatchId) && stockBatchId > 0;

    const quantity =
      typeof data.quantity === 'number' ? data.quantity : parseFloat(String(data.quantity));
    const totalUnits =
      typeof data.totalUnits === 'number' ? data.totalUnits : parseFloat(String(data.totalUnits));
    const durationValue =
      data.durationValue === '' || data.durationValue == null
        ? NaN
        : parseFloat(String(data.durationValue));
    const frequencyValue =
      data.frequencyValue === '' || data.frequencyValue == null
        ? NaN
        : parseFloat(String(data.frequencyValue));
    const amountPerFrequencyValue =
      data.amountPerFrequencyValue === '' || data.amountPerFrequencyValue == null
        ? NaN
        : parseFloat(String(data.amountPerFrequencyValue));
    const durationUnit = parseFloat(String(data.durationUnit));
    const frequencyUnit = parseFloat(String(data.frequencyUnit));

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
      stockBatchId?: number;
      visitId: number;
      durationValue: number;
      durationUnit: number;
      amountPerFrequencyValue: number;
      amountPerFrequencyUnit: string;
      frequencyValue: number;
      totalUnits: number;
      frequencyUnit: number;
      instructions: string;
      route: string;
      unitSellingModelId?: number;
    } = {
      quantity,
      itemId,
      visitId,
      durationValue,
      durationUnit,
      amountPerFrequencyValue,
      amountPerFrequencyUnit: String(data.amountPerFrequencyUnit ?? '').trim(),
      frequencyValue,
      totalUnits,
      frequencyUnit,
      instructions: String(
        data.instructions ?? this.currentTreatmentRequested?.instructions ?? ''
      ).trim(),
      route: String(data.route ?? this.currentTreatmentRequested?.route ?? '').trim(),
    };
    if (hasStockBatch) {
      payload.stockBatchId = stockBatchId;
    }
    if (this.pvUseUnitSellingModelPicker && this.selectedUnitSellingModelId != null) {
      payload.unitSellingModelId = this.selectedUnitSellingModelId;
    }
    return payload;
  }


  /** On update, max prescribable qty = current batch on-hand (save does not reserve stock). */
  private resolveTreatmentStockBatchId(item: any): number | null {
    const explicit = Number(
      item?.stockBatchId ??
      item?.stock_batch_id ??
      item?.stockBatch?.id ??
      item?._stockBatchId
    );
    if (Number.isFinite(explicit) && explicit > 0) {
      return explicit;
    }

    const itemId = Number(
      item?.itemId ??
      item?.stockItemId ??
      item?.consumableItemId ??
      item?.item?.id ??
      this.currentItemId
    );
    if (!Number.isFinite(itemId) || itemId <= 0) {
      return null;
    }

    const pharmacyBatch = this.allStockBatchesCache.find((batch) => {
      const sameItem = Number(this.stockItemIdFromBatch(batch)) === itemId;
      const inPharmacy =
        this.pharmacyStoreId == null ||
        Number(batch?.storeId ?? batch?.store?.id) === Number(this.pharmacyStoreId);
      return sameItem && inPharmacy && this.batchQtyOnHand(batch) > 0;
    });
    if (pharmacyBatch) {
      return this.stockBatchIdFromBatch(pharmacyBatch);
    }

    const anyBatch = this.allStockBatchesCache.find(
      (batch) => Number(this.stockItemIdFromBatch(batch)) === itemId && this.batchQtyOnHand(batch) > 0
    );
    return anyBatch ? this.stockBatchIdFromBatch(anyBatch) : null;
  }

  private refreshTreatmentStockCheckForUpdate(existingLineQty: any): void {
    const batchId = Number(this.currentStockBatchId);
    if (Number.isFinite(batchId) && batchId > 0) {
      const batch = this.allStockBatchesCache.find((b) => Number(b.id) === batchId);
      if (batch) {
        this.checkStockBeforeUpdatingTreatment = this.batchQtyOnHand(batch);
        return;
      }
      this.api.getStockBatchById(batchId).subscribe({
        next: (res: any) => {
          this.checkStockBeforeUpdatingTreatment = this.batchQtyOnHand(res);
        },
        error: () => {
          this.checkStockBeforeUpdatingTreatment = 0;
        },
      });
      return;
    }
    if (this.currentItemId != null) {
      this.getItemById(this.currentItemId, existingLineQty);
    }
  }

getItemById(id:any, quantity:any){

        this.api.getItemByItsId(id).subscribe(
        (response: any) => {
          console.log("stockAtHand:", response.stockAtHand);

          this.stockAtHandForUpdaters = parseFloat(response.stockAtHand);
          this.checkStockBeforeUpdatingTreatment = this.stockAtHandForUpdaters;
          console.log("checkStockBeforeUpdatingTreatment", this.checkStockBeforeUpdatingTreatment);
          this.availableQuantity = this.checkStockBeforeUpdatingTreatment;

  
          if (response && response.message) {
            console.log("Message:", response.message);

          } else {
            console.log("Message not found!");
     
          }

        },
        (error: any) => {
          console.error("Error saving treatment:", error);
  
          // Display the error message in the div
          this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
          this.responseColor = "rgb(238, 16, 16)"; // Red for error

  
        }
      );
    
    }

// print scan report







 // isCollapsedTreatment = true; // or false depending on default state

toggleTreatmentAndPrefill(item: any) {
   this.currentTreatmentRequested.totalAmount = item.totalAmount;
   this.totalCostPerItem = item.totalAmount;
   this.totalCostPerItem = this.currentTreatmentRequested.totalAmount;
  
  if (!this.showTreatmentPlanModal) {
    this.openTreatmentPlanModal();
  }

  
   this.currentItemId =
     item.itemId ??
     item.stockItemId ??
     item.consumableItemId ??
     item.item?.id ??
     this.currentItemId;
   this.currentStockBatchId = this.resolveTreatmentStockBatchId(item);
   this.currentTreatmentRequested.stockBatchId =
     item.stockBatchId ?? item.stock_batch_id ?? this.currentTreatmentRequested.stockBatchId;
   this.refreshTreatmentStockCheckForUpdate(item.quantity);

  this.prefillDataForUpdate(item);
}

openProcedureResultsModal(item: any) {
  this.selectedProcedureResult = item;
  this.procedureResultsLabReportTitle = '';
  this.procedureResultsReportId = null;
  this.showResultMrdtForm = false;
  this.showResultGeneralForm = false;
  this.showResultUrinalysisForm = false;
  this.showResultCbcForm = false;
  this.showResultParasitologyStoolForm = false;

  const category = (item.category || '').toString().toLowerCase().trim();
  const requestName = this.normalizeProcedureRequestedNameForLabRouting(item);

  if (category === "malaria test") {
    this.showResultMrdtForm = true;
    this.loadMrdtResults(item.id);
  } else if (this.isUrinalysisProcedureName(requestName)) {
    this.showResultUrinalysisForm = true;
    this.loadUrinalysisResults(item.id);
  } else if (requestName === "cbc" || requestName.includes("cbc")) {
    this.showResultCbcForm = true;
    this.loadCbcResults(item.id);
  } else if (requestName === "parasitology stool" || requestName === "parasitologystool" || requestName.includes("parasitology stool")) {
    this.showResultParasitologyStoolForm = true;
    this.loadParasitologyStoolResults(item.id);
  } else {
    this.showResultGeneralForm = true;
    this.loadGeneralLabResults(item.id);
  }

  this.showProcedureResultsModal = true;
  setTimeout(() => {
    ($('#procedureResultsModal') as any).modal('show');
  }, 50);
}

closeProcedureResultsModal() {
  this.showProcedureResultsModal = false;
  ($('#procedureResultsModal') as any).modal('hide');
}

openTreatmentChartModal() {
  this.showTreatmentChartModal = true;
  this.startTreatmentChartNextDoseWatch();
  const restoreRequestId =
    this.lastTreatmentChartRequestId ?? this.selectedTreatmentRequestForChart?.id ?? null;
  this.treatmentChartId = null;
  this.searchTextTreatmentChart = '';
  this.treatmentChartDrugDropdownOpen = false;
  this.treatmentChartForm = this.emptyTreatmentChartForm();

  if (!this.visitId) {
    this.treatmentRequestListForChart = [];
    this.treatmentChartsList = [];
    this.buildTreatmentChartSchedule();
    setTimeout(() => {
      ($('#treatmentChartModal') as any).modal('show');
    }, 50);
    return;
  }

  forkJoin({
    treatments: this.api.getTreatmentRequestedByVisit(this.visitId).pipe(
      map((res: any) =>
        Array.isArray(res) ? res : res?.data && Array.isArray(res.data) ? res.data : []
      ),
      catchError(() => of([]))
    ),
    charts: this.api.getTreatmentChartsByVisitId(this.visitId).pipe(
      catchError(() => of([]))
    ),
    batches:
      this.allStockBatchesCache.length > 0
        ? of(this.allStockBatchesCache)
        : this.api.getAllStockBatches().pipe(
            map((batchRes: any) => this.normalizeStockBatchesResponse(batchRes)),
            catchError(() => of([]))
          ),
  }).subscribe(({ treatments, charts, batches }) => {
    if (Array.isArray(batches) && batches.length) {
      this.allStockBatchesCache = batches;
    }
    this.treatmentRequestListForChart = (Array.isArray(treatments) ? treatments : []).map((row) =>
      applyTreatmentLifecycleFlags({ ...row })
    );
    this.treatmentChartsList = Array.isArray(charts) ? charts : [];
    this.buildTreatmentChartSchedule();
    this.restoreTreatmentChartModalSelection(restoreRequestId);
  });

  setTimeout(() => {
    ($('#treatmentChartModal') as any).modal('show');
  }, 50);
}

openVisitSundriesModal(): void {
  this.visitSundriesMessage = '';
  this.sundrySearchText = '';
  this.sundryDropdownOpen = false;
  this.selectedSundryBatch = null;
  this.sundryQuantity = 1;
  if (!this.allStockBatchesCache.length) {
    this.loadDrugList();
  }
  const visitId = Number(this.visitId);
  const visitSundries$ =
    Number.isFinite(visitId) && visitId > 0
      ? this.api.getVisitSundriesByVisitId(visitId).pipe(catchError(() => of([])))
      : of([]);
  this.visitSundriesLoading = true;
  this.sundryCatalogLoading = true;
  forkJoin({
    visitSundries: visitSundries$,
    stockItems: this.api.getAllStockItems().pipe(catchError(() => of([]))),
    categories: this.api.getAllItemCategories().pipe(catchError(() => of([]))),
  }).subscribe({
    next: ({ visitSundries, stockItems, categories }) => {
      this.visitSundriesList = Array.isArray(visitSundries) ? visitSundries : [];
      this.visitSundriesLoading = false;
      this.rebuildSundryCatalog(stockItems, categories);
      this.sundryCatalogLoading = false;
    },
    error: () => {
      this.visitSundriesList = [];
      this.visitSundriesLoading = false;
      this.sundryStockItemIdSet.clear();
      this.sundryCategoryIdSet.clear();
      this.sundryCatalogLoading = false;
    },
  });
  setTimeout(() => {
    ($('#visitSundriesModal') as any).modal('show');
  }, 50);
}

loadVisitSundries(): void {
  const visitId = Number(this.visitId);
  if (!Number.isFinite(visitId) || visitId <= 0) {
    this.visitSundriesList = [];
    return;
  }
  this.visitSundriesLoading = true;
  this.api.getVisitSundriesByVisitId(visitId).subscribe({
    next: (rows) => {
      this.visitSundriesList = Array.isArray(rows) ? rows : [];
      this.visitSundriesLoading = false;
    },
    error: () => {
      this.visitSundriesList = [];
      this.visitSundriesLoading = false;
    },
  });
}

private isSundriesParentCategoryName(name: string | null | undefined): boolean {
  const normalized = String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  return normalized === 'sundries' || normalized === 'sundry' || normalized === 'sandries';
}

private rebuildSundryCatalog(stockItems: any[], categories: any[]): void {
  this.sundryStockItemIdSet.clear();
  this.sundryCategoryIdSet.clear();

  const cats = Array.isArray(categories) ? categories : [];
  const byId = new Map<number, any>();
  for (const cat of cats) {
    const id = Number(cat?.id);
    if (Number.isFinite(id) && id > 0) {
      byId.set(id, cat);
    }
  }

  const resolveTopParent = (categoryId: number): any | null => {
    let current = byId.get(categoryId);
    const visited = new Set<number>();
    while (current) {
      const currentId = Number(current.id);
      if (!Number.isFinite(currentId) || visited.has(currentId)) {
        break;
      }
      visited.add(currentId);
      const parentId = Number(current.parentId ?? current.parent?.id);
      if (!Number.isFinite(parentId) || parentId <= 0) {
        return current;
      }
      const parent = byId.get(parentId);
      if (!parent) {
        return current;
      }
      current = parent;
    }
    return current ?? null;
  };

  for (const cat of cats) {
    const id = Number(cat?.id);
    if (!Number.isFinite(id) || id <= 0) {
      continue;
    }
    const top = resolveTopParent(id);
    if (top && this.isSundriesParentCategoryName(top.name)) {
      this.sundryCategoryIdSet.add(id);
    }
  }

  for (const item of stockItems || []) {
    const stockItemId = Number(item?.id ?? item?.stockItemId);
    if (!Number.isFinite(stockItemId) || stockItemId <= 0) {
      continue;
    }

    const parentLabel =
      item?.lastCategoryName ??
      item?.parentCategoryName ??
      item?.topParentCategoryName ??
      '';
    if (this.isSundriesParentCategoryName(parentLabel)) {
      this.sundryStockItemIdSet.add(stockItemId);
      continue;
    }

    const categoryId = Number(item?.itemCategoryId ?? item?.lastCategoryId);
    if (Number.isFinite(categoryId) && this.sundryCategoryIdSet.has(categoryId)) {
      this.sundryStockItemIdSet.add(stockItemId);
    }
  }
}

private isSundryStockBatch(batch: any): boolean {
  if (this.isSundriesParentCategoryName(batch?.lastCategoryName)) {
    return true;
  }
  const stockItemId = this.stockItemIdFromBatch(batch);
  return stockItemId != null && this.sundryStockItemIdSet.has(stockItemId);
}

allSundryBatches(): any[] {
  return (this.allStockBatchesCache || []).filter((batch) => {
    if (!this.isSundryStockBatch(batch)) {
      return false;
    }
    return this.batchQtyOnHand(batch) > 0;
  });
}

filteredSundryBatches(): any[] {
  const q = String(this.sundrySearchText || '').trim().toLowerCase();
  const batches = this.allSundryBatches();
  if (!q) {
    return batches;
  }
  return batches.filter((batch) => {
    const name = String(batch?.stockItemName ?? '').toLowerCase();
    const batchNo = String(batch?.batchNumber ?? '').toLowerCase();
    const storeName = String(batch?.storeName ?? batch?.store_name ?? '').toLowerCase();
    return name.includes(q) || batchNo.includes(q) || storeName.includes(q);
  });
}

toggleSundryDropdown(event?: Event): void {
  event?.stopPropagation();
  this.sundryDropdownOpen = !this.sundryDropdownOpen;
}

selectSundryBatch(batch: any): void {
  this.selectedSundryBatch = batch;
  this.sundryDropdownOpen = false;
}

sundryBatchLabel(batch: any | null): string {
  if (!batch) {
    return 'Choose sundry item';
  }
  const name = String(batch.stockItemName || 'Product').toUpperCase();
  const qty = this.batchQtyOnHand(batch);
  const uom = batch.unitOfMeasure || 'unit(s)';
  const batchNo = batch.batchNumber ? ` · ${batch.batchNumber}` : '';
  const storeId = Number(batch?.storeId ?? batch?.store_id);
  const storeName = this.resolveStoreDisplayName(
    storeId,
    batch?.storeName ?? batch?.store_name
  );
  return `${name}${batchNo} — ${qty} ${uom} · ${storeName}`;
}

addVisitSundry(): void {
  const visitId = Number(this.visitId);
  const batchId = Number(this.selectedSundryBatch?.id);
  const qty = Number(this.sundryQuantity);
  if (!Number.isFinite(visitId) || visitId <= 0) {
    this.visitSundriesMessage = 'Open a client order first.';
    this.visitSundriesMessageOk = false;
    return;
  }
  if (!Number.isFinite(batchId) || batchId <= 0) {
    this.visitSundriesMessage = 'Select a sundry item.';
    this.visitSundriesMessageOk = false;
    return;
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    this.visitSundriesMessage = 'Enter a valid quantity.';
    this.visitSundriesMessageOk = false;
    return;
  }
  const available = this.batchQtyOnHand(this.selectedSundryBatch);
  if (qty > available) {
    const storeId = Number(this.selectedSundryBatch?.storeId ?? this.selectedSundryBatch?.store_id);
    const storeName = this.resolveStoreDisplayName(
      storeId,
      this.selectedSundryBatch?.storeName ?? this.selectedSundryBatch?.store_name
    );
    this.visitSundriesMessage = `Only ${available} available in ${storeName}.`;
    this.visitSundriesMessageOk = false;
    return;
  }

  this.visitSundriesSaving = true;
  this.visitSundriesMessage = '';
  const usedBy = (sessionStorage.getItem('username') || '').trim();
  this.api.createVisitSundry(visitId, { stockBatchId: batchId, quantity: qty, usedBy }).subscribe({
    next: () => {
      this.visitSundriesSaving = false;
      this.visitSundriesMessageOk = true;
      this.visitSundriesMessage = 'Sundry recorded and stock deducted.';
      this.selectedSundryBatch = null;
      this.sundryQuantity = 1;
      this.sundrySearchText = '';
      this.loadVisitSundries();
      this.loadDrugList();
      this.getCostsRegularySeparately();
      if (this.isPharmacist) {
        this.applyVisitPharmacyStockAvailability();
      }
    },
    error: (err) => {
      this.visitSundriesSaving = false;
      this.visitSundriesMessageOk = false;
      this.visitSundriesMessage =
        err?.error?.message || err?.error?.data?.message || 'Could not record sundry.';
    },
  });
}

removeVisitSundry(row: any): void {
  const id = Number(row?.id);
  if (!Number.isFinite(id) || id <= 0) {
    return;
  }
  this.visitSundriesDeletingId = id;
  this.api.deleteVisitSundry(id).subscribe({
    next: () => {
      this.visitSundriesDeletingId = null;
      this.visitSundriesMessageOk = true;
      this.visitSundriesMessage = 'Sundry removed and stock restored.';
      this.loadVisitSundries();
      this.loadDrugList();
      this.getCostsRegularySeparately();
      if (this.isPharmacist) {
        this.applyVisitPharmacyStockAvailability();
      }
    },
    error: (err) => {
      this.visitSundriesDeletingId = null;
      this.visitSundriesMessageOk = false;
      this.visitSundriesMessage =
        err?.error?.message || err?.error?.data?.message || 'Could not remove sundry.';
    },
  });
}

private emptyTreatmentChartForm(): any {
  return {
    dateGiven: '',
    timeGiven: '',
    givenBy: '',
    timeForNextDosage: '',
    dateForNextDosage: '',
    timeBetweenGivenToNextDosage: '',
    nextDoseIntervalHours: null,
    nextDoseIntervalMinutes: null,
    overallTotalDosages: null,
    totalDosagesGiven: null,
    unitsUsed: null,
    totalDosagesRemaining: null,
    status: '',
  };
}

private restoreTreatmentChartModalSelection(restoreRequestId: number | null): void {
  const source = this.treatmentChartDropdownSource().filter((item) => {
    const matchVisit =
      item.visitId == this.visitId ||
      item.visit?.id == this.visitId ||
      !item.visitId;
    return matchVisit && this.isTreatmentEligibleForChart(item);
  });
  if (!source.length) {
    this.selectedTreatmentRequestForChart = null;
    this.currentTreatmentRequested = {};
    return;
  }

  let treatment =
    restoreRequestId != null
      ? source.find((r: any) => Number(r.id) === Number(restoreRequestId))
      : null;
  if (!treatment) {
    const chartRequestIds = new Set(
      (this.treatmentChartsList || []).map((c: any) => Number(c.treatmentRequestedId))
    );
    treatment =
      source.find((r: any) => chartRequestIds.has(Number(r.id))) || source[0];
  }
  if (treatment) {
    this.selectTreatmentRequestForChart(treatment);
  }
}

loadTreatmentChartsForVisit() {
  if (!this.visitId) {
    this.treatmentChartsList = [];
    return;
  }
  this.api.getTreatmentChartsByVisitId(this.visitId).subscribe({
    next: (list: any) => {
      this.treatmentChartsList = Array.isArray(list) ? list : [];
      if (this.selectedTreatmentRequestForChart) {
        if (!this.treatmentChartId) {
          const latest = this.getLatestChartForRequest(
            Number(this.selectedTreatmentRequestForChart.id)
          );
          this.currentTreatmentRequested = this.buildTreatmentChartDrugFields(
            this.selectedTreatmentRequestForChart,
            latest
          );
        }
        this.applyTreatmentChartAutofill(this.selectedTreatmentRequestForChart, {
          chartId: this.treatmentChartId,
          preserveGivenFields: !!this.treatmentChartId,
        });
      }
    },
    error: () => { this.treatmentChartsList = []; }
  });
}

editTreatmentChart(chart: any) {
  const requestId = chart?.treatmentRequestedId;
  if (requestId == null) return;
  const source = this.treatmentRequestListForChart?.length ? this.treatmentRequestListForChart : (this.productListTreatmentRequested || []);
  let treatmentRequest = source.find((r: any) => r.id == requestId);
  if (!treatmentRequest) {
    treatmentRequest = {
      id: requestId,
      itemName: chart.treatmentName || chart.itemName || 'Treatment',
      title: chart.treatmentName || chart.itemName || 'Treatment',
      visitId: this.visitId,
    };
  }
  this.selectedTreatmentRequestForChart = treatmentRequest;
  this.lastTreatmentChartRequestId = Number(requestId);
  this.currentTreatmentRequested = this.buildTreatmentChartDrugFields(treatmentRequest, chart);
  const t = (v: any) => (v != null && v !== undefined) ? (typeof v === 'string' ? v : String(v).substring(0, 10)) : '';
  const timeStr = (v: any) => (v != null && v !== undefined) ? String(v).substring(0, 5) : '';
  this.treatmentChartId = chart.id;
  this.treatmentChartForm = {
    dateGiven: t(chart.dateGiven),
    timeGiven: timeStr(chart.timeGiven),
    givenBy: chart.givenBy || '',
    timeForNextDosage: timeStr(chart.timeForNextDosage),
    dateForNextDosage: t(chart.dateForNextDosage),
    timeBetweenGivenToNextDosage: chart.timeBetweenGivenToNextDosage || '',
    nextDoseIntervalHours: null,
    nextDoseIntervalMinutes: null,
    overallTotalDosages: chart.overallTotalDosages ?? null,
    totalDosagesGiven: chart.totalDosagesGiven ?? null,
    unitsUsed: chart.unitsUsed ?? null,
    totalDosagesRemaining: chart.totalDosagesRemaining ?? null,
    status: chart.status || '',
  };
  this.loadTreatmentChartIntervalFromChart(chart);
  this.treatmentChartIntervalUserSet = true;
  this.updateTreatmentChartDosageCounts(treatmentRequest, { chartId: chart.id });
  if (this.isTreatmentChartLastDose(treatmentRequest)) {
    this.clearTreatmentChartNextDoseFields();
  }
  this.loadChartHistoryForSelectedTreatment(requestId);
}

deleteTreatmentChart(chart: any, event?: Event) {
  event?.preventDefault();
  event?.stopPropagation();
  if (typeof event?.stopImmediatePropagation === 'function') {
    event.stopImmediatePropagation();
  }
  const id = this.resolveTreatmentChartId(chart);
  if (id == null) {
    this.treatmentChartResponseMessage = 'Cannot delete this chart entry. Missing id.';
    this.treatmentChartResponseColor = 'rgb(238, 16, 16)';
    setTimeout(() => { this.treatmentChartResponseMessage = ''; }, 3000);
    return;
  }
  this.treatmentChartPendingDelete = chart;
}

cancelTreatmentChartDelete(): void {
  if (this.isDeletingTreatmentChart != null) {
    return;
  }
  this.treatmentChartPendingDelete = null;
}

confirmTreatmentChartDelete(): void {
  const chart = this.treatmentChartPendingDelete;
  if (chart) {
    this.performDeleteTreatmentChart(chart);
  }
}

private resolveTreatmentChartId(chart: any): number | null {
  const id = Number(chart?.id ?? chart?.treatmentChartId ?? chart?.chartId);
  return Number.isFinite(id) && id > 0 ? id : null;
}

private performDeleteTreatmentChart(chart: any): void {
  const id = this.resolveTreatmentChartId(chart);
  if (id == null) return;
  this.isDeletingTreatmentChart = id;
  this.api.deleteTreatmentChart(id).subscribe({
    next: () => {
      this.treatmentChartsList = (this.treatmentChartsList || []).filter(
        (c: any) => this.resolveTreatmentChartId(c) !== id
      );
      if (Number(this.treatmentChartId) === id) {
        this.clearTreatmentChartEntryForm();
      }
      this.treatmentChartPendingDelete = null;
      this.isDeletingTreatmentChart = null;
      this.treatmentChartResponseMessage = 'Treatment chart deleted successfully';
      this.treatmentChartResponseColor = 'rgb(11, 155, 112)';
      if (this.selectedTreatmentRequestForChart?.id != null) {
        this.loadChartHistoryForSelectedTreatment(this.selectedTreatmentRequestForChart.id);
      }
      this.loadTreatmentChartsForVisit();
      this.buildTreatmentChartSchedule();
      this.getRequestedTreatmentByVisitSeparately();
      setTimeout(() => { this.treatmentChartResponseMessage = ''; }, 3000);
    },
    error: (err) => {
      this.isDeletingTreatmentChart = null;
      this.treatmentChartResponseMessage = err?.error?.message || 'Failed to delete treatment chart';
      this.treatmentChartResponseColor = 'rgb(238, 16, 16)';
      setTimeout(() => { this.treatmentChartResponseMessage = ''; }, 3000);
    }
  });
}

/** Clear entry form only; keeps selected treatment and chart history visible. */
clearTreatmentChartEntryForm(): void {
  this.treatmentChartId = null;
  this.treatmentChartIntervalUserSet = false;
  this.treatmentChartNextDoseUserSet = false;
  this.treatmentChartForm = this.emptyTreatmentChartForm();
  if (this.selectedTreatmentRequestForChart) {
    this.applyTreatmentChartAutofill(this.selectedTreatmentRequestForChart);
  }
}

resetTreatmentChartForm() {
  this.clearTreatmentChartEntryForm();
  this.selectedTreatmentRequestForChart = null;
  this.lastTreatmentChartRequestId = null;
  this.currentTreatmentRequested = {};
  this.searchTextTreatmentChart = '';
}

private afterTreatmentChartSaved(): void {
  const reqId = this.selectedTreatmentRequestForChart?.id;
  if (reqId != null) {
    this.lastTreatmentChartRequestId = Number(reqId);
  }
  this.treatmentChartId = null;
  this.treatmentChartForm = this.emptyTreatmentChartForm();
  this.selectedTreatmentRequestForChart = null;
  this.currentTreatmentRequested = {};
  this.loadTreatmentChartsForVisit();
  this.loadDrugList();
  this.getRequestedTreatmentByVisitSeparately();
}

private resolveTreatmentRequestRoute(item: any): string {
  if (!item) {
    return '';
  }
  const direct =
    item.route ??
    item.routeOfAdministration ??
    item.routeOfAdminTitle ??
    '';
  if (String(direct).trim()) {
    return String(direct).trim();
  }

  const batchId = Number(item.stockBatchId ?? item.stockBatch?.id ?? 0);
  const itemId = Number(item.itemId ?? item.stockItemId ?? 0);
  for (const batch of this.allStockBatchesCache || []) {
    const bid = Number(batch.id ?? batch._stockBatchId ?? 0);
    const sid = Number(batch.stockItemId ?? batch.itemId ?? 0);
    if ((batchId > 0 && bid === batchId) || (itemId > 0 && sid === itemId)) {
      const route =
        batch.route ??
        batch.routeOfAdminTitle ??
        batch.routeOfAdministration ??
        '';
      if (String(route).trim()) {
        return String(route).trim();
      }
    }
  }
  return '';
}

private isIvRouteOfAdministration(route: string | null | undefined): boolean {
  const normalized = String(route ?? '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '');
  if (!normalized) {
    return false;
  }
  return (
    normalized === 'iv' ||
    normalized.startsWith('iv') ||
    normalized.includes('intravenous') ||
    normalized.includes('intraven') ||
    normalized === 'ivbolus' ||
    normalized.includes('ivinfusion')
  );
}

private enrichTreatmentRequestForChart(item: any): any {
  const route = this.resolveTreatmentRequestRoute(item);
  return {
    ...item,
    route: item.route ?? route,
    routeOfAdministration: item.routeOfAdministration ?? route,
  };
}

private treatmentChartDropdownSource(): any[] {
  const source = this.treatmentRequestListForChart?.length
    ? this.treatmentRequestListForChart
    : this.productListTreatmentRequested || [];
  return (Array.isArray(source) ? source : []).map((item) =>
    this.enrichTreatmentRequestForChart(item)
  );
}

private isTreatmentEligibleForChart(item: any): boolean {
  return isTreatmentDispensed(item);
}

filteredTreatmentRequestedList() {
  const source = this.treatmentChartDropdownSource();
  if (!source.length) {
    return [];
  }

  const chartRequestIds = new Set(
    (this.treatmentChartsList || [])
      .map((c: any) => Number(c.treatmentRequestedId))
      .filter((id: number) => Number.isFinite(id) && id > 0)
  );

  let filtered = source.filter((item: any) => {
    const matchVisit =
      item.visitId == this.visitId ||
      item.visit?.id == this.visitId ||
      !item.visitId;
    if (!matchVisit) {
      return false;
    }
    const reqId = Number(item.id);
    return (
      this.isTreatmentEligibleForChart(item) ||
      (Number.isFinite(reqId) && chartRequestIds.has(reqId))
    );
  });

  if (this.searchTextTreatmentChart) {
    const searchTerm = this.searchTextTreatmentChart.toLowerCase();
    filtered = filtered.filter((item: any) => {
      const name = `${item.itemName ?? item.title ?? ''}`.toLowerCase();
      const route = `${item.route ?? item.routeOfAdministration ?? ''}`.toLowerCase();
      return name.includes(searchTerm) || route.includes(searchTerm);
    });
  }
  return filtered;
}

private mapTreatmentChartFrequencyUnit(u: any, fallback?: any): number {
  const n = Number(u);
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  if (u === 'Minute(s)' || u === 'Minute') return 1 / 1440;
  if (u === 'Hour(s)' || u === 'Hour') return 1 / 24;
  if (u === 'Day' || u === 'Day(s)') return 1;
  if (u === 'Week' || u === 'Week(s)') return 7;
  if (u === 'Month' || u === 'Month(s)') return 30;
  const fb = Number(fallback);
  return Number.isFinite(fb) && fb > 0 ? fb : 1;
}

private mapTreatmentChartDurationUnit(u: any, fallback?: any): number {
  const n = Number(u);
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  if (u === 'Minute(s)' || u === 'Minute') return 1 / 1440;
  if (u === 'Hour(s)' || u === 'Hour') return 1 / 24;
  if (u === 'Day(s)' || u === 'Day') return 1;
  if (u === 'Week(s)' || u === 'Week') return 7;
  if (u === 'Month(s)' || u === 'Month') return 30;
  const fb = Number(fallback);
  return Number.isFinite(fb) && fb > 0 ? fb : 1;
}

private getLatestChartNextDoseDateTime(requestId: number): Date | null {
  const latest = this.getLatestChartForRequest(requestId);
  if (!latest) {
    return null;
  }
  const dateRaw = latest.dateForNextDosage ?? latest.dateForNextDosaage;
  const timeRaw = latest.timeForNextDosage ?? latest.timeForNextDosaage;
  if (dateRaw == null || timeRaw == null || `${dateRaw}`.trim() === '' || `${timeRaw}`.trim() === '') {
    return null;
  }
  const dateStr = this.formatTreatmentChartDate(dateRaw);
  const timeStr = this.formatTreatmentChartTime(timeRaw);
  if (dateStr === '–' || timeStr === '–') {
    return null;
  }
  const dt = new Date(`${dateStr}T${timeStr}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

private getRemainingDosesBeforeNewEntry(
  requestId: number,
  treatmentRequest?: any
): number {
  const reqId = Number(requestId);
  if (!Number.isFinite(reqId) || reqId <= 0) {
    return 0;
  }

  const latest = this.getLatestChartForRequest(reqId);
  if (latest != null) {
    const fromLatest = Number(latest.totalDosagesRemaining);
    if (Number.isFinite(fromLatest)) {
      return Math.max(0, fromLatest);
    }
  }

  const tr = treatmentRequest || this.selectedTreatmentRequestForChart || {};
  const req = this.currentTreatmentRequested || {};
  const overall = this.computeOverallTotalDosages(
    req.frequencyValue ?? tr.frequencyValue,
    req.durationValue ?? tr.durationValue
  );
  const chartsForReq = (this.treatmentChartsList || []).filter(
    (c: any) => Number(c.treatmentRequestedId) === reqId
  );
  return Math.max(0, overall - chartsForReq.length);
}

canAddTreatmentChartDose(requestId?: number | null, treatmentRequest?: any): boolean {
  const id = Number(requestId ?? this.selectedTreatmentRequestForChart?.id);
  if (!Number.isFinite(id) || id <= 0) {
    return false;
  }
  return this.getRemainingDosesBeforeNewEntry(id, treatmentRequest) > 0;
}

private validateTreatmentChartCanGiveNewDose(): { ok: boolean; message?: string } {
  if (this.treatmentChartId) {
    return { ok: true };
  }
  const requestId = Number(this.selectedTreatmentRequestForChart?.id);
  if (!Number.isFinite(requestId) || requestId <= 0) {
    return { ok: false, message: 'Please select a treatment request' };
  }

  const remaining = this.getRemainingDosesBeforeNewEntry(
    requestId,
    this.selectedTreatmentRequestForChart
  );
  if (remaining <= 0) {
    const treatmentName =
      this.selectedTreatmentRequestForChart?.itemName ||
      this.selectedTreatmentRequestForChart?.title ||
      'This treatment';
    return {
      ok: false,
      message: `${treatmentName} has no remaining doses. All scheduled doses have already been recorded.`,
    };
  }

  const latest = this.getLatestChartForRequest(requestId);
  if (!latest) {
    return { ok: true };
  }
  const nextDue = this.getLatestChartNextDoseDateTime(requestId);
  if (!nextDue) {
    return { ok: true };
  }
  const givenAt = this.parseTreatmentChartGivenDateTime() ?? new Date();
  if (givenAt.getTime() >= nextDue.getTime()) {
    return { ok: true };
  }
  const lastGivenDate = this.formatTreatmentChartDate(latest.dateGiven);
  const lastGivenTime = this.formatTreatmentChartTime(latest.timeGiven);
  const nextParts = this.formatTreatmentChartDateTimeParts(nextDue);
  return {
    ok: false,
    message:
      `It is not yet time for the next dose. Last given: ${lastGivenDate} at ${lastGivenTime}. ` +
      `Next dose is due on ${nextParts.date} at ${nextParts.time}.`,
  };
}

private showTreatmentChartValidationMessage(message: string): void {
  this.treatmentChartResponseMessage = message;
  this.treatmentChartResponseColor = 'rgb(238, 16, 16)';
}

private clearTreatmentChartValidationMessageIfAllowed(): void {
  const check = this.validateTreatmentChartCanGiveNewDose();
  if (check.ok) {
    if (this.treatmentChartResponseColor === 'rgb(238, 16, 16)') {
      this.treatmentChartResponseMessage = '';
    }
    return;
  }
  if (check.message) {
    this.showTreatmentChartValidationMessage(check.message);
  }
}

private getLatestChartForRequest(requestId: number): any | null {
  const charts = (this.treatmentChartsList || []).filter(
    (c: any) => Number(c.treatmentRequestedId) === Number(requestId)
  );
  if (!charts.length) {
    return null;
  }
  return this.sortTreatmentCharts(charts)[charts.length - 1];
}

private buildTreatmentChartDrugFields(treatmentRequest: any, chart?: any | null): any {
  const tr = treatmentRequest || {};
  const ch = chart || null;
  return {
    amountPerFrequencyValue:
      ch?.dosageValue ?? tr.amountPerFrequencyValue ?? tr.dosageValue ?? '',
    amountPerFrequencyUnit:
      ch?.dosageUnit || tr.amountPerFrequencyUnit || tr.lastUnitOfMeasure || '',
    frequencyValue: ch?.frequencyValue ?? tr.frequencyValue ?? '',
    frequencyUnit: this.mapTreatmentChartFrequencyUnit(
      ch?.frequencyUnit ?? tr.frequencyUnit,
      tr.frequencyUnit
    ),
    durationValue: tr.durationValue ?? '',
    durationUnit: this.mapTreatmentChartDurationUnit(tr.durationUnit, tr.durationUnit),
    quantity: tr.quantity ?? '',
    totalUnits: tr.totalUnits ?? '',
    estimatedUnits: this.roundEstimatedUnits(tr.totalUnits),
    totalAmount: tr.totalAmount ?? '',
    route: ch?.route || tr.route || '',
    instructions: ch?.instructions || tr.instructions || '',
  };
}

private formatTreatmentChartFrequencyUnitForApi(unit: unknown): string {
  const n = Number(unit);
  if (!Number.isFinite(n) || n <= 0) {
    return '1';
  }
  return String(n);
}

private buildTreatmentChartSavePayload(data: any): any {
  const req = this.currentTreatmentRequested || {};
  const tr = this.selectedTreatmentRequestForChart || {};
  const suppressNextDose = this.isTreatmentChartLastDose(tr);
  return {
    dateGiven: this.treatmentChartForm.dateGiven || data.dateGiven || null,
    timeGiven: this.treatmentChartForm.timeGiven || data.timeGiven || null,
    givenBy: this.treatmentChartForm.givenBy || data.givenBy || '',
    route: req.route || tr.route || data.route || '',
    instructions: req.instructions || tr.instructions || data.instructions || '',
    dosageValue: req.amountPerFrequencyValue ?? tr.amountPerFrequencyValue ?? null,
    dosageUnit: req.amountPerFrequencyUnit || tr.amountPerFrequencyUnit || '',
    frequencyValue: req.frequencyValue ?? tr.frequencyValue ?? null,
    frequencyUnit: this.formatTreatmentChartFrequencyUnitForApi(
      req.frequencyUnit ?? tr.frequencyUnit
    ),
    timeForNextDosage: suppressNextDose
      ? null
      : this.treatmentChartForm.timeForNextDosage || data.timeForNextDosage || null,
    dateForNextDosage: suppressNextDose
      ? null
      : this.treatmentChartForm.dateForNextDosage || data.dateForNextDosage || null,
    timeBetweenGivenToNextDosage: suppressNextDose
      ? null
      : this.treatmentChartForm.timeBetweenGivenToNextDosage ||
        data.timeBetweenGivenToNextDosage ||
        null,
    overallTotalDosages: this.treatmentChartForm.overallTotalDosages ?? null,
    totalDosagesGiven: this.treatmentChartForm.totalDosagesGiven ?? null,
    unitsUsed: this.treatmentChartForm.unitsUsed ?? null,
    totalDosagesRemaining: this.treatmentChartForm.totalDosagesRemaining ?? null,
    status: 'Given',
  };
}

/** Overall doses = frequency × duration (from treatment request). */
computeOverallTotalDosages(
  frequencyValue: unknown,
  durationValue: unknown
): number {
  const freq = Number(frequencyValue);
  const dur = Number(durationValue);
  if (!Number.isFinite(freq) || !Number.isFinite(dur) || freq <= 0 || dur <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(freq * dur));
}

/** Hours between doses from frequency (suggested default only — nurse may override). */
computeHoursBetweenDoses(frequencyValue: unknown, frequencyUnit: unknown): number {
  const freq = Number(frequencyValue);
  if (!Number.isFinite(freq) || freq <= 0) {
    return 24;
  }
  const unit = Number(frequencyUnit);
  const dosesPerDay =
    unit === 7 ? freq / 7 : unit === 30 ? freq / 30 : freq;
  if (dosesPerDay <= 0) {
    return 24;
  }
  return 24 / dosesPerDay;
}

parseIntervalHoursFromLabel(label: unknown): number | null {
  if (label == null || label === '') {
    return null;
  }
  const s = String(label).trim().toLowerCase();
  const hrly = s.match(/^(\d+(?:\.\d+)?)\s*hrly$/);
  if (hrly) {
    return Number(hrly[1]);
  }
  const hm = s.match(/(\d+(?:\.\d+)?)\s*h(?:\s+(\d+)\s*m)?/);
  if (hm) {
    const h = Number(hm[1]);
    const m = hm[2] ? Number(hm[2]) : 0;
    if (Number.isFinite(h) && h >= 0) {
      return h + (Number.isFinite(m) ? m / 60 : 0);
    }
  }
  const plain = Number(s);
  if (Number.isFinite(plain) && plain > 0) {
    return plain;
  }
  return null;
}

splitIntervalHours(totalHours: number): { hours: number; minutes: number } {
  if (!Number.isFinite(totalHours) || totalHours < 0) {
    return { hours: 0, minutes: 0 };
  }
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  if (minutes >= 60) {
    return { hours: hours + 1, minutes: 0 };
  }
  return { hours, minutes };
}

private formatTreatmentChartDateTimeParts(dt: Date): { date: string; time: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
  };
}

parseTreatmentChartGivenDateTime(): Date | null {
  const date = this.treatmentChartForm?.dateGiven;
  const time = this.treatmentChartForm?.timeGiven;
  if (!date || !time) {
    return null;
  }
  const dt = new Date(`${date}T${String(time).substring(0, 5)}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

parseTreatmentChartNextDateTime(): Date | null {
  const date = this.treatmentChartForm?.dateForNextDosage;
  const time = this.treatmentChartForm?.timeForNextDosage;
  if (!date || !time) {
    return null;
  }
  const dt = new Date(`${date}T${String(time).substring(0, 5)}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

getTreatmentChartIntervalTotalHours(): number {
  const h = Number(this.treatmentChartForm?.nextDoseIntervalHours);
  const m = Number(this.treatmentChartForm?.nextDoseIntervalMinutes);
  const hours = Number.isFinite(h) && h >= 0 ? h : 0;
  const minutes = Number.isFinite(m) && m >= 0 ? m : 0;
  return hours + minutes / 60;
}

syncTreatmentChartIntervalLabel(): void {
  const total = this.getTreatmentChartIntervalTotalHours();
  this.treatmentChartForm.timeBetweenGivenToNextDosage =
    total > 0 ? this.formatDoseIntervalLabel(total) : '';
}

applyTreatmentChartNextDoseFromInterval(): void {
  const given = this.parseTreatmentChartGivenDateTime() ?? new Date();
  const totalHours = this.getTreatmentChartIntervalTotalHours();
  if (totalHours <= 0) {
    return;
  }
  const next = new Date(given.getTime() + totalHours * 3600000);
  const parts = this.formatTreatmentChartDateTimeParts(next);
  this.treatmentChartForm.dateForNextDosage = parts.date;
  this.treatmentChartForm.timeForNextDosage = parts.time;
  this.syncTreatmentChartIntervalLabel();
}

applyTreatmentChartIntervalFromNextDose(): void {
  const given = this.parseTreatmentChartGivenDateTime();
  const next = this.parseTreatmentChartNextDateTime();
  if (!given || !next) {
    return;
  }
  const diffMs = next.getTime() - given.getTime();
  if (diffMs < 0) {
    return;
  }
  const split = this.splitIntervalHours(diffMs / 3600000);
  this.treatmentChartForm.nextDoseIntervalHours = split.hours;
  this.treatmentChartForm.nextDoseIntervalMinutes = split.minutes;
  this.syncTreatmentChartIntervalLabel();
}

onTreatmentChartGivenDateTimeChange(): void {
  if (this.isTreatmentChartLastDose()) {
    this.clearTreatmentChartNextDoseFields();
    this.clearTreatmentChartValidationMessageIfAllowed();
    return;
  }
  if (this.treatmentChartNextDoseUserSet && !this.treatmentChartIntervalUserSet) {
    this.applyTreatmentChartIntervalFromNextDose();
  } else if (this.treatmentChartIntervalUserSet || this.getTreatmentChartIntervalTotalHours() > 0) {
    this.treatmentChartNextDoseUserSet = false;
    this.applyTreatmentChartNextDoseFromInterval();
  } else {
    this.applyTreatmentChartIntervalFromNextDose();
  }
  this.clearTreatmentChartValidationMessageIfAllowed();
}

onTreatmentChartIntervalChange(): void {
  if (this.isTreatmentChartLastDose()) {
    this.clearTreatmentChartNextDoseFields();
    return;
  }
  this.treatmentChartIntervalUserSet = true;
  this.treatmentChartNextDoseUserSet = false;
  this.applyTreatmentChartNextDoseFromInterval();
  this.clearTreatmentChartValidationMessageIfAllowed();
}

onTreatmentChartNextDoseChange(): void {
  this.treatmentChartIntervalUserSet = true;
  this.treatmentChartNextDoseUserSet = true;
  this.applyTreatmentChartIntervalFromNextDose();
}

private suggestTreatmentChartIntervalHours(
  treatmentRequest: any,
  requestId: number
): number {
  const latestChart = this.getLatestChartForRequest(requestId);
  const fromLatest = this.parseIntervalHoursFromLabel(
    latestChart?.timeBetweenGivenToNextDosage
  );
  if (fromLatest != null && fromLatest > 0) {
    return fromLatest;
  }
  const tr = treatmentRequest || {};
  const req = this.currentTreatmentRequested || {};
  return this.computeHoursBetweenDoses(
    req.frequencyValue ?? tr.frequencyValue,
    req.frequencyUnit ?? tr.frequencyUnit
  );
}

private setTreatmentChartIntervalHours(totalHours: number, userSet = false): void {
  const split = this.splitIntervalHours(totalHours);
  this.treatmentChartForm.nextDoseIntervalHours = split.hours;
  this.treatmentChartForm.nextDoseIntervalMinutes = split.minutes;
  this.syncTreatmentChartIntervalLabel();
  if (userSet) {
    this.treatmentChartIntervalUserSet = true;
  }
}

private loadTreatmentChartIntervalFromChart(chart: any): void {
  const fromLabel = this.parseIntervalHoursFromLabel(chart?.timeBetweenGivenToNextDosage);
  if (fromLabel != null && fromLabel > 0) {
    this.setTreatmentChartIntervalHours(fromLabel, true);
    return;
  }
  const given = chart?.dateGiven && chart?.timeGiven
    ? new Date(`${String(chart.dateGiven).substring(0, 10)}T${String(chart.timeGiven).substring(0, 5)}`)
    : null;
  const nextDate = chart?.dateForNextDosage ?? chart?.dateForNextDosaage;
  const nextTime = chart?.timeForNextDosage ?? chart?.timeForNextDosaage;
  const next =
    nextDate && nextTime
      ? new Date(`${String(nextDate).substring(0, 10)}T${String(nextTime).substring(0, 5)}`)
      : null;
  if (given && next && !Number.isNaN(given.getTime()) && !Number.isNaN(next.getTime())) {
    const diffMs = next.getTime() - given.getTime();
    if (diffMs > 0) {
      this.setTreatmentChartIntervalHours(diffMs / 3600000, true);
    }
  }
}

formatDoseIntervalLabel(hoursBetween: number): string {
  if (!Number.isFinite(hoursBetween) || hoursBetween <= 0) {
    return '24hrly';
  }
  const rounded = Math.round(hoursBetween * 100) / 100;
  const wholeHours = Math.round(rounded);
  if (Math.abs(rounded - wholeHours) < 0.05 && wholeHours >= 1) {
    return `${wholeHours}hrly`;
  }
  const h = Math.floor(rounded);
  const m = Math.round((rounded - h) * 60);
  if (m <= 0) {
    return `${h}hrly`;
  }
  return `${h}h ${m}m`;
}

private resolveTotalDosagesGivenForChart(
  treatmentRequestedId: number,
  chartId: number | null
): number {
  const chartsForReq = (this.treatmentChartsList || [])
    .filter((c: any) => Number(c.treatmentRequestedId) === Number(treatmentRequestedId))
    .sort((a: any, b: any) => Number(a.id || 0) - Number(b.id || 0));
  if (chartId != null) {
    const idx = chartsForReq.findIndex((c: any) => c.id === chartId);
    if (idx >= 0) {
      return idx + 1;
    }
  }
  return chartsForReq.length + 1;
}

refreshTreatmentChartDerivedFields(): void {
  if (!this.selectedTreatmentRequestForChart) {
    return;
  }
  this.updateTreatmentChartDosageCounts(this.selectedTreatmentRequestForChart, {
    chartId: this.treatmentChartId,
  });
  if (this.isTreatmentChartLastDose()) {
    this.clearTreatmentChartNextDoseFields();
  } else if (!this.treatmentChartNextDoseUserSet) {
    if (this.getTreatmentChartIntervalTotalHours() <= 0) {
      const suggested = this.suggestTreatmentChartIntervalHours(
        this.selectedTreatmentRequestForChart,
        Number(this.selectedTreatmentRequestForChart?.id)
      );
      this.setTreatmentChartIntervalHours(suggested, false);
    }
    this.applyTreatmentChartNextDoseFromInterval();
  }
}

isTreatmentChartSingleDose(treatmentRequest?: any): boolean {
  const req = this.currentTreatmentRequested || {};
  const tr = treatmentRequest || this.selectedTreatmentRequestForChart || {};
  const freqVal = Number(req.frequencyValue ?? tr.frequencyValue);
  const durVal = Number(req.durationValue ?? tr.durationValue);
  const freqUnit = Number(req.frequencyUnit ?? tr.frequencyUnit ?? 1);
  const durUnit = Number(req.durationUnit ?? tr.durationUnit ?? 1);
  return (
    freqVal === 1 &&
    durVal === 1 &&
    freqUnit === 1 &&
    durUnit === 1
  );
}

/** True when the dose being recorded is the final one (no next dose to schedule). */
isTreatmentChartLastDose(treatmentRequest?: any): boolean {
  if (this.isTreatmentChartSingleDose(treatmentRequest)) {
    return true;
  }
  const requestId = Number(
    treatmentRequest?.id ?? this.selectedTreatmentRequestForChart?.id
  );
  if (!Number.isFinite(requestId) || requestId <= 0) {
    return false;
  }
  if (this.treatmentChartId) {
    const remaining = Number(this.treatmentChartForm.totalDosagesRemaining);
    if (Number.isFinite(remaining) && remaining <= 0) {
      return true;
    }
    const overall = Number(this.treatmentChartForm.overallTotalDosages);
    const given = Number(this.treatmentChartForm.totalDosagesGiven);
    return Number.isFinite(overall) && Number.isFinite(given) && given >= overall;
  }
  return this.getRemainingDosesBeforeNewEntry(requestId, treatmentRequest) <= 1;
}

treatmentChartShowsNextDoseFields(treatmentRequest?: any): boolean {
  return !this.isTreatmentChartLastDose(treatmentRequest);
}

private clearTreatmentChartNextDoseFields(): void {
  this.treatmentChartForm = {
    ...this.treatmentChartForm,
    nextDoseIntervalHours: null,
    nextDoseIntervalMinutes: null,
    timeBetweenGivenToNextDosage: '',
    dateForNextDosage: '',
    timeForNextDosage: '',
  };
}

toggleTreatmentChartDrugDropdown(event?: Event): void {
  event?.preventDefault();
  event?.stopPropagation();
  this.treatmentChartDrugDropdownOpen = !this.treatmentChartDrugDropdownOpen;
  if (this.treatmentChartDrugDropdownOpen) {
    this.treatmentChartDrugDropdownIgnoreDocumentClose = true;
    setTimeout(() => {
      this.treatmentChartDrugDropdownIgnoreDocumentClose = false;
    }, 0);
  }
  this.cdr.markForCheck();
}

private closeTreatmentChartDrugDropdown(): void {
  this.treatmentChartDrugDropdownOpen = false;
  this.cdr.markForCheck();
}

private updateTreatmentChartDosageCounts(
  treatmentRequest: any,
  options?: { chartId?: number | null }
): void {
  if (!treatmentRequest) {
    return;
  }
  const tr = treatmentRequest;
  const req = this.currentTreatmentRequested || {};
  const freqVal = req.frequencyValue ?? tr.frequencyValue;
  const durVal = req.durationValue ?? tr.durationValue;
  const overall = this.computeOverallTotalDosages(freqVal, durVal);
  const requestId = Number(tr.id);
  const totalGiven = this.resolveTotalDosagesGivenForChart(
    requestId,
    options?.chartId ?? this.treatmentChartId
  );
  const unitsUsed =
    Number(req.totalUnits ?? tr.totalUnits ?? req.amountPerFrequencyValue ?? tr.amountPerFrequencyValue) ||
    null;
  const remaining = Math.max(0, overall - totalGiven);

  this.treatmentChartForm = {
    ...this.treatmentChartForm,
    overallTotalDosages: overall,
    totalDosagesGiven: totalGiven,
    unitsUsed,
    totalDosagesRemaining: remaining,
    status: this.treatmentChartForm.status || 'Given',
  };

  if (this.isTreatmentChartLastDose(tr)) {
    this.clearTreatmentChartNextDoseFields();
  }
}

applyTreatmentChartAutofill(
  treatmentRequest: any,
  options?: { chartId?: number | null; preserveGivenFields?: boolean }
): void {
  if (!treatmentRequest) {
    return;
  }
  const tr = treatmentRequest;
  const req = this.currentTreatmentRequested || {};
  const requestId = Number(tr.id);

  const now = new Date();
  const nowParts = this.formatTreatmentChartDateTimeParts(now);

  const preserved = options?.preserveGivenFields
    ? {
        dateGiven: this.treatmentChartForm.dateGiven,
        timeGiven: this.treatmentChartForm.timeGiven,
        givenBy: this.treatmentChartForm.givenBy,
        timeForNextDosage: this.treatmentChartForm.timeForNextDosage,
        dateForNextDosage: this.treatmentChartForm.dateForNextDosage,
        nextDoseIntervalHours: this.treatmentChartForm.nextDoseIntervalHours,
        nextDoseIntervalMinutes: this.treatmentChartForm.nextDoseIntervalMinutes,
        timeBetweenGivenToNextDosage: this.treatmentChartForm.timeBetweenGivenToNextDosage,
      }
    : {};

  if (!this.currentTreatmentRequested) {
    this.currentTreatmentRequested = {};
  }
  if (!options?.preserveGivenFields || !this.currentTreatmentRequested.route) {
    this.currentTreatmentRequested.route = req.route || tr.route || '';
  }
  if (!options?.preserveGivenFields || !this.currentTreatmentRequested.instructions) {
    this.currentTreatmentRequested.instructions = req.instructions || tr.instructions || '';
  }

  if (!options?.preserveGivenFields) {
    this.treatmentChartIntervalUserSet = false;
    this.treatmentChartNextDoseUserSet = false;
  }

  this.updateTreatmentChartDosageCounts(treatmentRequest, {
    chartId: options?.chartId ?? this.treatmentChartId,
  });

  const dateGiven = preserved.dateGiven || nowParts.date;
  const timeGiven = preserved.timeGiven || nowParts.time;

  if (!this.treatmentChartIntervalUserSet && !options?.preserveGivenFields) {
    if (this.treatmentChartShowsNextDoseFields(tr)) {
      const suggested = this.suggestTreatmentChartIntervalHours(treatmentRequest, requestId);
      this.setTreatmentChartIntervalHours(suggested, false);
    }
  } else if (
    preserved.nextDoseIntervalHours == null &&
    preserved.nextDoseIntervalMinutes == null &&
    !this.treatmentChartIntervalUserSet &&
    this.treatmentChartShowsNextDoseFields(tr)
  ) {
    const suggested = this.suggestTreatmentChartIntervalHours(treatmentRequest, requestId);
    this.setTreatmentChartIntervalHours(suggested, false);
  }

  this.treatmentChartForm = {
    ...this.treatmentChartForm,
    dateGiven,
    timeGiven,
    givenBy:
      preserved.givenBy ||
      this.userName ||
      sessionStorage.getItem('username') ||
      '',
    nextDoseIntervalHours:
      preserved.nextDoseIntervalHours ?? this.treatmentChartForm.nextDoseIntervalHours,
    nextDoseIntervalMinutes:
      preserved.nextDoseIntervalMinutes ?? this.treatmentChartForm.nextDoseIntervalMinutes,
    timeBetweenGivenToNextDosage:
      preserved.timeBetweenGivenToNextDosage ??
      this.treatmentChartForm.timeBetweenGivenToNextDosage,
  };

  if (this.isTreatmentChartLastDose(tr)) {
    this.clearTreatmentChartNextDoseFields();
  } else if (options?.preserveGivenFields && preserved.timeForNextDosage && preserved.dateForNextDosage) {
    this.treatmentChartForm.timeForNextDosage = preserved.timeForNextDosage;
    this.treatmentChartForm.dateForNextDosage = preserved.dateForNextDosage;
  } else if (this.treatmentChartNextDoseUserSet && this.treatmentChartForm.dateForNextDosage && this.treatmentChartForm.timeForNextDosage) {
    this.applyTreatmentChartIntervalFromNextDose();
  } else {
    this.treatmentChartForm.dateGiven = dateGiven;
    this.treatmentChartForm.timeGiven = timeGiven;
    this.applyTreatmentChartNextDoseFromInterval();
  }
}

selectTreatmentRequestForChart(treatmentRequest: any, event?: Event) {
  event?.preventDefault();
  event?.stopPropagation();
  if (!treatmentRequest) return;

  this.treatmentChartDrugDropdownOpen = false;
  this.searchTextTreatmentChart = '';

  const enriched = this.enrichTreatmentRequestForChart(treatmentRequest);
  this.selectedTreatmentRequestForChart = enriched;
  this.lastTreatmentChartRequestId = Number(enriched.id);

  const latestChart = this.getLatestChartForRequest(Number(enriched.id));
  this.currentTreatmentRequested = this.buildTreatmentChartDrugFields(
    enriched,
    latestChart
  );

  // Multiple chart entries per treatment request; each save records one dose given.
  this.treatmentChartId = null;
  this.treatmentChartIntervalUserSet = false;
  this.treatmentChartNextDoseUserSet = false;
  this.treatmentChartForm = this.emptyTreatmentChartForm();
  this.applyTreatmentChartAutofill(enriched);
  this.loadChartHistoryForSelectedTreatment(enriched.id);
  if (this.showTreatmentChartModal) {
    this.startTreatmentChartNextDoseWatch();
  }
  const doseCheck = this.validateTreatmentChartCanGiveNewDose();
  if (!doseCheck.ok && doseCheck.message) {
    this.showTreatmentChartValidationMessage(doseCheck.message);
  }
  this.cdr.markForCheck();
}

/** All chart rows recorded for the current visit. */
get allTreatmentChartsHistory(): any[] {
  return this.sortTreatmentCharts(this.treatmentChartsList || []);
}

/** Chart rows for the treatment currently selected in the dropdown. */
get selectedTreatmentChartsHistory(): any[] {
  const reqId = this.selectedTreatmentRequestForChart?.id;
  if (reqId == null) {
    return [];
  }
  return this.sortTreatmentCharts(
    (this.treatmentChartsList || []).filter(
      (c: any) => Number(c.treatmentRequestedId) === Number(reqId)
    )
  );
}

private sortTreatmentCharts(charts: any[]): any[] {
  return [...charts].sort((a: any, b: any) => {
    const da = this.chartSortKey(a);
    const db = this.chartSortKey(b);
    if (da !== db) {
      return da - db;
    }
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

private chartSortKey(chart: any): number {
  const dateRaw = chart?.dateGiven;
  const dateStr =
    typeof dateRaw === 'string'
      ? dateRaw.substring(0, 10)
      : dateRaw?.toString?.()?.split('T')?.[0] || '';
  const timeStr = String(chart?.timeGiven || '00:00').substring(0, 5);
  const t = new Date(`${dateStr}T${timeStr}`).getTime();
  return Number.isNaN(t) ? 0 : t;
}

formatTreatmentChartDate(value: unknown): string {
  if (value == null || value === '') {
    return '–';
  }
  if (typeof value === 'string') {
    return value.substring(0, 10);
  }
  return value?.toString?.()?.split('T')?.[0] || '–';
}

formatTreatmentChartTime(value: unknown): string {
  if (value == null || value === '') {
    return '–';
  }
  return String(value).substring(0, 5);
}

formatTreatmentChartNextDate(chart: any): string {
  return this.formatTreatmentChartDate(
    chart?.dateForNextDosage ?? chart?.dateForNextDosaage
  );
}

formatTreatmentChartNextTime(chart: any): string {
  return this.formatTreatmentChartTime(
    chart?.timeForNextDosage ?? chart?.timeForNextDosaage
  );
}

private mergeChartsForRequest(requestId: number, rows: any[]): void {
  const id = Number(requestId);
  const others = (this.treatmentChartsList || []).filter(
    (c: any) => Number(c.treatmentRequestedId) !== id
  );
  const normalized = (Array.isArray(rows) ? rows : []).map((c: any) => ({
    ...c,
    treatmentRequestedId: c.treatmentRequestedId ?? id,
  }));
  this.treatmentChartsList = [...others, ...normalized];
}

loadChartHistoryForSelectedTreatment(requestId: number | null | undefined): void {
  if (requestId == null) {
    return;
  }
  this.treatmentChartHistoryLoading = true;
  this.api.getTreatmentChartsByRequestId(requestId).subscribe({
    next: (list: any[]) => {
      this.mergeChartsForRequest(Number(requestId), list);
      this.treatmentChartHistoryLoading = false;
      if (this.selectedTreatmentRequestForChart?.id == requestId) {
        this.applyTreatmentChartAutofill(this.selectedTreatmentRequestForChart, {
          chartId: this.treatmentChartId,
          preserveGivenFields: !!this.treatmentChartId,
        });
      }
      if (this.showTreatmentChartModal) {
        this.startTreatmentChartNextDoseWatch();
      }
    },
    error: () => {
      this.treatmentChartHistoryLoading = false;
    },
  });
}

loadTreatmentChartForRequest(treatmentRequest: any) {
  if (!treatmentRequest || !treatmentRequest.id) {
    this.treatmentChartId = null;
    this.treatmentChartForm = { dateGiven: '', timeGiven: '', givenBy: '', timeForNextDosage: '', dateForNextDosage: '', timeBetweenGivenToNextDosage: '', overallTotalDosages: null, totalDosagesGiven: null, unitsUsed: null, totalDosagesRemaining: null, status: '' };
    return;
  }

  this.isLoadingTreatmentChart = true;
  this.api.getTreatmentChartByRequestId(treatmentRequest.id).subscribe({
    next: (res: any) => {
      this.isLoadingTreatmentChart = false;
      const chart = res?.data || res || {};

      if (chart && chart.id) {
        this.treatmentChartId = chart.id;
        this.currentTreatmentRequested = this.buildTreatmentChartDrugFields(
          treatmentRequest,
          chart
        );
        this.treatmentChartForm = {
          dateGiven: chart.dateGiven || '',
          timeGiven: chart.timeGiven || '',
          givenBy: chart.givenBy || '',
          timeForNextDosage: chart.timeForNextDosaage || chart.timeForNextDosage || '',
          dateForNextDosage: chart.dateForNextDosaage || chart.dateForNextDosage || '',
          timeBetweenGivenToNextDosage: chart.timeBetweenGivenToNextDosage || '',
          overallTotalDosages: chart.overallTotalDosages ?? null,
          totalDosagesGiven: chart.totalDosagesGiven ?? null,
          unitsUsed: chart.unitsUsed ?? null,
          totalDosagesRemaining: chart.totalDosagesRemaining ?? null,
          status: chart.status || ''
        };
      } else {
        this.treatmentChartId = null;
        this.treatmentChartForm = { dateGiven: '', timeGiven: '', givenBy: '', timeForNextDosage: '', dateForNextDosage: '', timeBetweenGivenToNextDosage: '', overallTotalDosages: null, totalDosagesGiven: null, unitsUsed: null, totalDosagesRemaining: null, status: '' };
      }
    },
    error: (error) => {
      this.isLoadingTreatmentChart = false;
      console.error('Error loading treatment chart:', error);
      this.treatmentChartId = null;
      this.treatmentChartForm = { dateGiven: '', timeGiven: '', givenBy: '', timeForNextDosage: '', dateForNextDosage: '', timeBetweenGivenToNextDosage: '', overallTotalDosages: null, totalDosagesGiven: null, unitsUsed: null, totalDosagesRemaining: null, status: '' };
    }
  });
}

getUserFormDataTreatmentChart(data: any) {
  if (!this.selectedTreatmentRequestForChart || !this.selectedTreatmentRequestForChart.id) {
    this.showTreatmentChartValidationMessage('Please select a treatment request');
    setTimeout(() => {
      this.treatmentChartResponseMessage = '';
    }, 5000);
    return;
  }

  const doseCheck = this.validateTreatmentChartCanGiveNewDose();
  if (!doseCheck.ok) {
    this.showTreatmentChartValidationMessage(doseCheck.message || 'Cannot save this dose.');
    setTimeout(() => {
      if (this.treatmentChartResponseColor === 'rgb(238, 16, 16)') {
        this.treatmentChartResponseMessage = '';
      }
    }, 8000);
    return;
  }

  this.isLoadingTreatmentChart = true;
  this.treatmentChartResponseMessage = '';

  this.syncTreatmentChartIntervalLabel();
  if (this.treatmentChartShowsNextDoseFields()) {
    this.applyTreatmentChartNextDoseFromInterval();
  } else {
    this.clearTreatmentChartNextDoseFields();
  }
  this.updateTreatmentChartDosageCounts(this.selectedTreatmentRequestForChart, {
    chartId: this.treatmentChartId,
  });

  const payload = this.buildTreatmentChartSavePayload(data);

  if (this.treatmentChartId) {
    this.api.updateTreatmentChart(this.treatmentChartId, payload).subscribe({
      next: (res: any) => {
        this.isLoadingTreatmentChart = false;
        this.treatmentChartResponseMessage = res?.message || "Treatment chart updated successfully";
        this.treatmentChartResponseColor = "rgb(11, 155, 112)";
        this.afterTreatmentChartSaved();
        setTimeout(() => {
          this.treatmentChartResponseMessage = '';
        }, 3000);
      },
      error: (error: any) => {
        this.isLoadingTreatmentChart = false;
        this.treatmentChartResponseMessage = "Error updating treatment chart";
        this.treatmentChartResponseColor = "rgb(238, 16, 16)";
        console.error('Error updating treatment chart:', error);
        setTimeout(() => {
          this.treatmentChartResponseMessage = '';
        }, 3000);
      }
    });
  } else {
    this.api.createTreatmentChart(this.selectedTreatmentRequestForChart.id, payload).subscribe({
      next: (res: any) => {
        this.isLoadingTreatmentChart = false;
        this.treatmentChartResponseMessage = res?.message || "Treatment chart created successfully";
        this.treatmentChartResponseColor = "rgb(11, 155, 112)";
        this.afterTreatmentChartSaved();
        setTimeout(() => {
          this.treatmentChartResponseMessage = '';
        }, 3000);
      },
      error: (error: any) => {
        this.isLoadingTreatmentChart = false;
        this.treatmentChartResponseMessage = "Error creating treatment chart";
        this.treatmentChartResponseColor = "rgb(238, 16, 16)";
        console.error('Error creating treatment chart:', error);
        setTimeout(() => {
          this.treatmentChartResponseMessage = '';
        }, 3000);
      }
    });
  }
}

closeTreatmentChartModal() {
  this.treatmentDoseAlert.stopModalWatch();
  this.treatmentChartDrugDropdownOpen = false;
  this.showTreatmentChartModal = false;
  ($('#treatmentChartModal') as any).modal('hide');
}

private startTreatmentChartNextDoseWatch(): void {
  this.treatmentDoseAlert.startModalWatch(
    () => this.getSelectedTreatmentNextDueMs(),
    () => this.buildTreatmentNextDoseAlertMessage()
  );
}

private getSelectedTreatmentNextDueMs(): number | null {
  const list = this.selectedTreatmentChartsHistory;
  if (!list.length) {
    return null;
  }
  const latest = list[list.length - 1];
  const nextDate = this.formatTreatmentChartNextDate(latest);
  const nextTime = this.formatTreatmentChartNextTime(latest);
  if (nextDate === '–' || nextTime === '–') {
    return null;
  }
  const remaining = Number(latest?.totalDosagesRemaining);
  if (Number.isFinite(remaining) && remaining <= 0) {
    return null;
  }
  const due = new Date(`${nextDate}T${nextTime}`).getTime();
  return Number.isNaN(due) ? null : due;
}

private buildTreatmentNextDoseAlertMessage(): string {
  const treatment =
    this.selectedTreatmentRequestForChart?.itemName ||
    this.selectedTreatmentChartsHistory[this.selectedTreatmentChartsHistory.length - 1]
      ?.treatmentName ||
    'Treatment';
  const client =
    `${this.clientFirstName || ''} ${this.clientSecondName || ''}`.trim() ||
    this.visit?.clientName ||
    'Client';
  const nextTime = this.formatTreatmentChartNextTime(
    this.selectedTreatmentChartsHistory[this.selectedTreatmentChartsHistory.length - 1]
  );
  return `${client} — ${treatment} next dose due${nextTime !== '–' ? ' at ' + nextTime : ''}`;
}

buildTreatmentChartSchedule() {
  const treatments = this.productListTreatmentRequested || [];
  const schedule: any[] = [];
  const startDate = this.visit?.visitDate ? new Date(this.visit.visitDate) : new Date();

  treatments.forEach((treatment: any) => {
    const treatmentName = treatment.itemName || treatment.title || 'Unknown Treatment';
    const dosage = `${treatment.amountPerFrequencyValue || ''} ${treatment.amountPerFrequencyUnit || ''}`.trim();
    const routeOfAdmin = treatment.routeOfAdministration || 'Oral';
    const givenBy = treatment.givenBy || treatment.orderedBy || 'N/A';
    
    // Calculate duration in days
    const durationValue = treatment.durationValue || 0;
    const durationUnit = this.getDurationInDays(treatment.durationUnit);
    const totalDays = durationValue * durationUnit;

    // Calculate frequency
    const frequencyValue = treatment.frequencyValue || 1;
    const frequencyUnit = this.getFrequencyInDays(treatment.frequencyUnit);
    const timesPerDay = frequencyUnit === 1 ? frequencyValue : Math.ceil(frequencyUnit / frequencyValue);

    // Generate schedule for each day
    for (let day = 0; day < totalDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      // Generate times for this day based on frequency
      const times = this.getTimesForDay(timesPerDay);
      
      times.forEach((time: string) => {
        schedule.push({
          date: this.formatDate(currentDate),
          dayName: this.getDayName(currentDate),
          month: this.getMonthName(currentDate),
          dayNumber: currentDate.getDate(),
          time: time,
          treatment: treatmentName,
          dosage: dosage,
          routeOfAdministration: routeOfAdmin,
          givenBy: givenBy,
          frequency: `${treatment.frequencyValue || ''} ${this.getFrequencyLabel(treatment.frequencyUnit)}`,
          duration: `${treatment.durationValue || ''} ${this.getDurationLabel(treatment.durationUnit)}`,
          dateValue: currentDate.getTime(),
          timeValue: this.timeToMinutes(time)
        });
      });
    }
  });

  // Sort by date and time
  schedule.sort((a, b) => {
    if (a.dateValue !== b.dateValue) {
      return a.dateValue - b.dateValue;
    }
    return a.timeValue - b.timeValue;
  });

  // Group by date
  this.treatmentChartSchedule = this.groupScheduleByDate(schedule);
}

private getSlotCalendarFields(item: any): {
  date: string;
  dayName: string;
  month: string;
  dayNumber: number;
} {
  if (item?.dateValue != null && Number.isFinite(Number(item.dateValue))) {
    const d = new Date(Number(item.dateValue));
    if (!Number.isNaN(d.getTime())) {
      return {
        date: this.formatDate(d),
        dayName: this.getDayName(d),
        month: this.getMonthName(d),
        dayNumber: d.getDate(),
      };
    }
  }
  return {
    date: item.date,
    dayName: item.dayName,
    month: item.month,
    dayNumber: item.dayNumber,
  };
}

private resolveTreatmentChartNextDoseDateTime(chart: any): Date | null {
  const nextDate = this.formatTreatmentChartNextDate(chart);
  const nextTime = this.formatTreatmentChartNextTime(chart);
  if (nextDate !== '–' && nextTime !== '–') {
    const stored = new Date(`${nextDate}T${nextTime}`);
    if (!Number.isNaN(stored.getTime())) {
      return stored;
    }
  }
  const givenDate = this.formatTreatmentChartDate(chart?.dateGiven);
  const givenTime = this.formatTreatmentChartTime(chart?.timeGiven);
  const intervalHours = this.parseIntervalHoursFromLabel(chart?.timeBetweenGivenToNextDosage);
  if (givenDate !== '–' && givenTime !== '–' && intervalHours != null && intervalHours > 0) {
    const given = new Date(`${givenDate}T${givenTime}`);
    if (!Number.isNaN(given.getTime())) {
      return new Date(given.getTime() + intervalHours * 3600000);
    }
  }
  return null;
}

groupScheduleByDate(schedule: any[]): any[] {
  const grouped: any = {};
  
  schedule.forEach((item: any) => {
    const calendar = this.getSlotCalendarFields(item);
    const dateKey = calendar.date;
    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: calendar.date,
        dayName: calendar.dayName,
        month: calendar.month,
        dayNumber: calendar.dayNumber,
        treatments: []
      };
    }
    grouped[dateKey].treatments.push({ ...item, ...calendar });
  });

  Object.values(grouped).forEach((day: any) => {
    day.treatments.sort((a: any, b: any) => {
      if (a.timeValue != null && b.timeValue != null && a.timeValue !== b.timeValue) {
        return a.timeValue - b.timeValue;
      }
      const byTime = String(a.time || '').localeCompare(String(b.time || ''));
      if (byTime !== 0) {
        return byTime;
      }
      return String(a.treatment || '').localeCompare(String(b.treatment || ''));
    });
  });

  return Object.values(grouped).sort((a: any, b: any) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

/** Schedule cards: all visit chart entries grouped by date, plus one next dose per treatment. */
get treatmentChartScheduleFromCharts(): any[] {
  const allCharts = this.allTreatmentChartsHistory;
  if (allCharts.length === 0) {
    return [];
  }

  const chartsByRequest = new Map<number, any[]>();
  for (const chart of allCharts) {
    const reqId = Number(chart.treatmentRequestedId);
    if (!Number.isFinite(reqId) || reqId <= 0) {
      continue;
    }
    const bucket = chartsByRequest.get(reqId) || [];
    bucket.push(chart);
    chartsByRequest.set(reqId, bucket);
  }

  const allSlots: any[] = [];
  chartsByRequest.forEach((charts) => {
    const sorted = this.sortTreatmentCharts(charts);
    const treatment = this.resolveTreatmentRequestForChart(sorted[sorted.length - 1]);

    for (const chart of sorted) {
      const slot = this.chartEntryToGivenSlot(chart, treatment);
      if (slot) {
        allSlots.push(slot);
      }
    }

    const latest = sorted[sorted.length - 1];
    const nextSlot = this.buildNextDoseSlot(latest, treatment);
    if (nextSlot) {
      allSlots.push(nextSlot);
    }
  });

  allSlots.sort((a, b) => {
    if (a.dateValue !== b.dateValue) {
      return a.dateValue - b.dateValue;
    }
    if (a.timeValue !== b.timeValue) {
      return a.timeValue - b.timeValue;
    }
    return String(a.treatment || '').localeCompare(String(b.treatment || ''));
  });

  return this.groupScheduleByDate(allSlots);
}

private resolveTreatmentRequestForChart(chart: any): any {
  const reqId = Number(chart?.treatmentRequestedId);
  if (!Number.isFinite(reqId) || reqId <= 0) {
    return {
      itemName: chart?.treatmentName || chart?.itemName || 'Treatment',
      routeOfAdministration: chart?.route || 'Oral',
    };
  }

  const fromList = (this.productListTreatmentRequested || []).find(
    (item: any) => Number(item.id) === reqId
  );
  if (fromList) {
    return fromList;
  }

  const fromDropdown = this.treatmentChartDropdownSource().find(
    (item: any) => Number(item.id) === reqId
  );
  if (fromDropdown) {
    return fromDropdown;
  }

  return {
    id: reqId,
    itemName: chart?.treatmentName || chart?.itemName || 'Treatment',
    routeOfAdministration: chart?.route || 'Oral',
    frequencyValue: chart?.frequencyValue,
    frequencyUnit: chart?.frequencyUnit,
    durationValue: chart?.durationValue,
    durationUnit: chart?.durationUnit,
  };
}

private chartEntryToGivenSlot(chart: any, treatment: any): any | null {
  const dateStr = this.formatTreatmentChartDate(chart.dateGiven);
  const timeStr = this.formatTreatmentChartTime(chart.timeGiven);
  if (dateStr === '–') {
    return null;
  }
  const effectiveTime = timeStr === '–' ? '08:00' : timeStr;
  const d = new Date(`${dateStr}T${effectiveTime}`);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const dosage = `${chart.dosageValue ?? ''} ${chart.dosageUnit ?? ''}`.trim() || 'N/A';
  const treatmentName =
    chart.treatmentName || chart.itemName || treatment?.itemName || 'Treatment';
  const frequency =
    chart.frequency ||
    `${chart.frequencyValue ?? ''} ${chart.frequencyUnit ?? ''}`.trim() ||
    `${treatment?.frequencyValue ?? ''} ${this.getFrequencyLabel(treatment?.frequencyUnit)}`.trim() ||
    '–';
  return {
    date: dateStr,
    dayName: this.getDayName(d),
    month: this.getMonthName(d),
    dayNumber: d.getDate(),
    time: effectiveTime,
    treatment: treatmentName,
    dosage,
    routeOfAdministration: chart.route || treatment?.routeOfAdministration || 'Oral',
    givenBy: chart.givenBy || '–',
    frequency,
    status: 'Given',
    doseLabel: 'Given',
    totalDosagesGiven: chart.totalDosagesGiven,
    totalDosagesRemaining: chart.totalDosagesRemaining,
    dateValue: d.getTime(),
    timeValue: this.timeToMinutes(effectiveTime),
    chartId: chart.id,
  };
}

private buildNextDoseSlot(latestChart: any, treatment: any): any | null {
  if (!latestChart) {
    return null;
  }
  const remaining = Number(latestChart.totalDosagesRemaining);
  if (Number.isFinite(remaining) && remaining <= 0) {
    return null;
  }
  const overall = Number(latestChart.overallTotalDosages);
  const given = Number(latestChart.totalDosagesGiven);
  if (Number.isFinite(overall) && Number.isFinite(given) && given >= overall) {
    return null;
  }
  const d = this.resolveTreatmentChartNextDoseDateTime(latestChart);
  if (!d) {
    return null;
  }
  const nextDate = this.formatDate(d);
  const nextTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const dosage =
    `${latestChart.dosageValue ?? ''} ${latestChart.dosageUnit ?? ''}`.trim() || 'N/A';
  const treatmentName =
    latestChart.treatmentName ||
    latestChart.itemName ||
    treatment?.itemName ||
    'Treatment';
  const frequency =
    latestChart.frequency ||
    `${latestChart.frequencyValue ?? ''} ${latestChart.frequencyUnit ?? ''}`.trim() ||
    '–';
  return {
    date: nextDate,
    dayName: this.getDayName(d),
    month: this.getMonthName(d),
    dayNumber: d.getDate(),
    time: nextTime,
    treatment: treatmentName,
    dosage,
    routeOfAdministration:
      latestChart.route || treatment?.routeOfAdministration || 'Oral',
    givenBy: '–',
    frequency,
    status: 'Next dose',
    doseLabel: 'Next dose',
    totalDosagesGiven: latestChart.totalDosagesGiven,
    totalDosagesRemaining: latestChart.totalDosagesRemaining,
    dateValue: d.getTime(),
    timeValue: this.timeToMinutes(nextTime),
    isNextDose: true,
  };
}

private getTreatmentDurationDays(treatment: any, chart?: any): number {
  const tr = treatment || {};
  const ch = chart || {};
  const durationValue = Number(tr.durationValue ?? ch.durationValue ?? 1);
  if (!Number.isFinite(durationValue) || durationValue <= 0) {
    return 1;
  }
  const durationUnitRaw = tr.durationUnit ?? ch.durationUnit;
  const unitDays = this.getDurationInDays(durationUnitRaw);
  return Math.max(1, Math.ceil(durationValue * unitDays));
}

private parseTreatmentChartDateOnly(dateStr: string): Date {
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

private groupTreatmentChartSlotsByDuration(
  slots: any[],
  treatment: any,
  charts: any[]
): any[] {
  if (!slots.length) {
    return [];
  }
  const sortedCharts = this.sortTreatmentCharts(charts);
  const anchorChart = sortedCharts[0];
  const anchorDateStr = this.formatTreatmentChartDate(anchorChart?.dateGiven);
  if (anchorDateStr === '–') {
    return this.groupScheduleByDate(slots);
  }
  const anchorDate = this.parseTreatmentChartDateOnly(anchorDateStr);
  const durationDays = this.getTreatmentDurationDays(treatment, anchorChart);
  const sorted = [...slots].sort((a, b) => {
    if (a.dateValue !== b.dateValue) {
      return a.dateValue - b.dateValue;
    }
    return a.timeValue - b.timeValue;
  });
  if (durationDays <= 1) {
    return this.groupScheduleByDate(sorted);
  }
  const endDate = new Date(anchorDate);
  endDate.setDate(anchorDate.getDate() + durationDays - 1);
  const startMs = anchorDate.getTime();
  const endMs = endDate.getTime();
  const filtered = sorted.filter((s) => {
    if (s.isNextDose) {
      return true;
    }
    const slotDate = this.parseTreatmentChartDateOnly(s.date);
    const t = slotDate.getTime();
    return t >= startMs && t <= endMs;
  });
  return this.groupScheduleByDate(filtered);
}

getDurationInDays(unit: any): number {
  if (typeof unit === 'number') return unit;
  const unitStr = (unit || '').toString().toLowerCase();
  if (unitStr.includes('minute')) return 1 / 1440;
  if (unitStr.includes('hour')) return 1 / 24;
  if (unitStr.includes('week')) return 7;
  if (unitStr.includes('month')) return 30;
  return 1; // days
}

getFrequencyInDays(unit: any): number {
  if (typeof unit === 'number') return unit;
  const unitStr = (unit || '').toString().toLowerCase();
  if (unitStr.includes('minute')) return 1 / 1440;
  if (unitStr.includes('hour')) return 1 / 24;
  if (unitStr.includes('week')) return 7;
  if (unitStr.includes('month')) return 30;
  return 1; // days
}

getTimesForDay(timesPerDay: number): string[] {
  const times = ['08:00', '12:00', '18:00', '22:00'];
  return times.slice(0, Math.min(timesPerDay, 4));
}

formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

getMonthName(date: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[date.getMonth()];
}

getFrequencyLabel(unit: any): string {
  const n = Number(unit);
  if (Number.isFinite(n) && Math.abs(n - 1 / 1440) < 0.000001) return 'Minute';
  if (Number.isFinite(n) && Math.abs(n - 1 / 24) < 0.000001) return 'Hour';
  if (n === 1) return 'Day';
  if (n === 7) return 'Week';
  if (n === 30) return 'Month';
  const unitStr = (unit || '').toString().toLowerCase();
  if (unitStr.includes('minute')) return 'Minute';
  if (unitStr.includes('hour')) return 'Hour';
  return 'Day';
}

getDurationLabel(unit: any): string {
  const n = Number(unit);
  if (Number.isFinite(n) && Math.abs(n - 1 / 1440) < 0.000001) return 'Minute(s)';
  if (Number.isFinite(n) && Math.abs(n - 1 / 24) < 0.000001) return 'Hour(s)';
  if (n === 1) return 'Day(s)';
  if (n === 7) return 'Week(s)';
  if (n === 30) return 'Month(s)';
  const unitStr = (unit || '').toString().toLowerCase();
  if (unitStr.includes('minute')) return 'Minute(s)';
  if (unitStr.includes('hour')) return 'Hour(s)';
  return 'Day(s)';
}

timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

printTreatmentChart() {
  document.body.classList.add('pv-printing-treatment-chart');
  setTimeout(() => {
    window.print();
    document.body.classList.remove('pv-printing-treatment-chart');
  }, 150);
}

loadMrdtResults(requestId: any) {
  this.isLoadingProcedureResults = true;
  this.api.getLabReportByRequestId(requestId).subscribe((res: any) => {
    this.isLoadingProcedureResults = false;
    const report = res?.data ?? res ?? {};
    this.procedureResultsReportId = report.id ?? null;
    this.setProcedureResultsLabReportTitleFromReport(report);
    this.mrdtResult = {
      bs: report.bs || '',
      mrdt: report.mrdt || '',
      notes: report.notes || '',
      recommendation: report.recommendation || '',
      result: report.result || report.report || report.findings || '',
      labReportTitle: report.labReportTitle || ''
    };
  }, () => {
    this.isLoadingProcedureResults = false;
  });
}

loadGeneralLabResults(requestId: any) {
  this.isLoadingProcedureResults = true;
  this.api.getGeneralLabReportByRequestId(requestId).subscribe((res: any) => {
    this.isLoadingProcedureResults = false;
    const report = res?.data ?? res ?? {};
    this.procedureResultsReportId = report.id ?? null;
    this.setProcedureResultsLabReportTitleFromReport(report);
    this.generalResult = {
      result: report.result || report.report || report.findings || '',
      notes: report.notes || '',
      recommendation: report.recommendation || ''
    };
  }, () => {
    this.isLoadingProcedureResults = false;
  });
}

loadUrinalysisResults(requestId: any) {
  this.isLoadingProcedureResults = true;
  this.api.getUrinalysisReportByRequestId(requestId).subscribe((res: any) => {
    this.isLoadingProcedureResults = false;
    const report = res?.data ?? res ?? {};
    this.procedureResultsReportId = report.id ?? null;
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
      volume: report.volume || ''
    };
  }, () => {
    this.isLoadingProcedureResults = false;
  });
}

loadCbcResults(requestId: any) {
  this.isLoadingProcedureResults = true;
  this.api.getCbcReportByRequestId(requestId).subscribe((res: any) => {
    this.isLoadingProcedureResults = false;
    const report = res?.data ?? res ?? {};
    this.procedureResultsReportId = report.id ?? null;
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
      pct: report.pct || ''
    };
    this.updateCbcInterpretationsFromResults();
  }, () => {
    this.isLoadingProcedureResults = false;
  });
}

loadParasitologyStoolResults(requestId: any) {
  this.isLoadingProcedureResults = true;
  this.api.getParasitologyStoolReportByRequestId(requestId).subscribe((res: any) => {
    this.isLoadingProcedureResults = false;
    const report = res?.data ?? res ?? {};
    this.procedureResultsReportId = report.id ?? null;
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
      others: report.others || ''
    };
  }, () => {
    this.isLoadingProcedureResults = false;
  });
}

//get other procedures


prefillDataForUpdate(item:any){


   //this.checkStockBeforeUpdatingTreatment = this.stockAtHandForUpdaters + parseFloat(item.quantity);


   this.totalCostPerItem = item.totalAmount;
   this.currentTreatmentRequested.totalAmount = item.totalAmount;
    console.log("totalCostPerItem:", this.totalCostPerItem);
   

    this.saveButtonStatusTreatment = "Update";
    console.log("item id:", item.id);

    console.log("save button status now:", this.saveButtonStatusTreatment);


    console.log("full item:", item);

          //this.ItemTemporaryTotal = item.
      this.itemSellingPrice = Number(item.unitSellingPrice) || 0;
      this.availableQuantity = item.availableQuantity;
      this.unitBuy = item.unitBuy;
      this.currentItem = item.itemName;

      this.currentItemId =
        item.itemId ??
        item.stockItemId ??
        item.consumableItemId ??
        item.item?.id ??
        this.currentItemId;
      this.updateStockDistributionForItem(this.currentItemId);
     
      this.treatmentId = this.resolveTreatmentRowId(item);
      this.currentTreatmentRequested.stockBatchId =
        item.stockBatchId ?? item.stock_batch_id ?? this.currentTreatmentRequested.stockBatchId;
      this.currentStockBatchId = this.resolveTreatmentStockBatchId(item);
      this.refreshPvUnitSellingMode({
        ...item,
        itemId: this.currentItemId,
        unitSellingPrice: item.unitSellingPrice,
        unitSellingModelId: item.unitSellingModelId ?? item.unit_selling_model_id ?? null,
      });
      this.refreshTreatmentStockCheckForUpdate(item.quantity);
      this.lastUnitValue = item.lastUnitValue;
      this.currentTreatmentRequested.amountPerFrequencyValue = this.lastUnitValue;
      console.log('Selected item name:', this.currentItem);
      console.log('Selected item ID:', this.currentItemId);
      console.log('Selected item name:', item.title);

    this.currentTreatmentRequested.quantity = item.quantity

    this.currentTreatmentRequested.totalUnits = item.totalUnits;
    this.updateEstimatedUnits();

    console.log('totalNoOfUnits:', item.totalUnits);

    if (
      this.currentStockBatchId == null &&
      item.lastStockAtHand != null &&
      item.quantity != null
    ) {
      this.availableQuantity = item.quantity + item.lastStockAtHand;
    }





if (item.durationUnit === 'Day(s)') {
  this.currentTreatmentRequested.durationUnit = 1;
} else if (item.durationUnit === 'Week(s)') {
  this.currentTreatmentRequested.durationUnit = 7;
} else if (item.durationUnit === 'Month(s)') {
  this.currentTreatmentRequested.durationUnit = 30;
} else {
  this.currentTreatmentRequested.durationUnit ==='Day(s)'; // fallback
}

    this.currentTreatmentRequested.durationValue = item.durationValue

    //this.currentTreatmentRequested.frequencyUnit = item.frequencyUnit
if (item.frequencyUnit === 'Day') {
  this.currentTreatmentRequested.frequencyUnit = 1;
} else if (item.frequencyUnit === 'Week') {
  this.currentTreatmentRequested.frequencyUnit = 7;
} else if (item.frequencyUnit === 'Month') {
  this.currentTreatmentRequested.frequencyUnit = 30;
} else {
  this.currentTreatmentRequested.frequencyUnit ==='Day'; // fallback
}


    this.currentTreatmentRequested.frequencyValue = item.frequencyValue
    this.currentTreatmentRequested.amountPerFrequencyUnit = normalizeDosageUnitForSelect(
      String(item.amountPerFrequencyUnit ?? '')
    )
    this.currentTreatmentRequested.amountPerFrequencyValue = item.amountPerFrequencyValue
    this.currentTreatmentRequested.instructions = item.instructions ?? '';
    this.currentTreatmentRequested.route = item.route ?? '';

}




calculateTotalQty() {
  const freq = Number(this.currentTreatmentRequested.frequencyValue) || 0;
  const dur = Number(this.currentTreatmentRequested.durationValue) || 0;
  const dose = Number(this.currentTreatmentRequested.amountPerFrequencyValue) || 0;
  if (freq > 0 && dur > 0 && dose > 0 && this.lastUnitValue > 0) {
    this.currentTreatmentRequested.quantity = (freq * dur * dose) / this.lastUnitValue;
  }
  this.calculateTotal();
}



calculateDurationUnit() {
  this.currentTreatmentRequested.durationUnit = this.currentTreatmentRequested.frequencyUnit;
  console.log('duration unit:', this.currentTreatmentRequested.durationUnit);
  console.log('frequency unit:', this.currentTreatmentRequested.frequencyUnit);
}



calculateNoOfUnits() {
  if (this.currentTreatmentRequested.amountPerFrequencyValue > 0 && this.lastUnitValue > 0) {
    this.currentTreatmentRequested.totalUnits = this.currentTreatmentRequested.amountPerFrequencyValue / this.lastUnitValue;
  } else {
    this.currentTreatmentRequested.totalUnits = 0;
  }
  this.updateEstimatedUnits();
}

updateEstimatedUnits(): void {
  const totalUnits = Number(this.currentTreatmentRequested?.totalUnits);
  this.currentTreatmentRequested.estimatedUnits = this.roundEstimatedUnits(totalUnits);
}

private roundEstimatedUnits(value: any): number {
  const units = Number(value);
  return Number.isFinite(units) && units > 0 ? Math.round(units) : 0;
}



getUserFormDataOtherProcedure(data: any) {
  //console.log("Original Data:", data);


  this.showDivUpdatedLoaderServices = true;

  console.log("Original data:", data);



  const rawOrderedBy = data.orderedBy;
  let orderedBy: string;
  if (rawOrderedBy === 'Client') {
    orderedBy = 'Client';
  } else if (!rawOrderedBy || rawOrderedBy === 'Ordered By') {
    orderedBy = (this.userName ?? sessionStorage.getItem('username') ?? '').toString().trim();
  } else {
    orderedBy = String(rawOrderedBy).trim();
  }

  if (!orderedBy) {
    this.responseMessage = "No logged-in user found; cannot set Ordered By";
    this.responseColor = "rgb(238, 16, 16)";
    this.showDivUpdatedLoaderServices = false;
    this.showDivAddToDataBaseOtherProcedure = true;
    setTimeout(() => {
      this.showDivAddToDataBaseOtherProcedure = false;
    }, 2000);
    return;
  }

  let unitSellingPrice: number | null = null;
  if (data.unitSellingPrice !== undefined && data.unitSellingPrice !== null && data.unitSellingPrice !== '') {
    unitSellingPrice = parseFloat(data.unitSellingPrice);
  }

  const indicationRaw =
    data.indication !== undefined && data.indication !== null ? String(data.indication).trim() : '';
  const indication = indicationRaw === '' ? null : indicationRaw;

  let doneBy: string | null = null;
  if (data.doneBy !== undefined && data.doneBy !== null && data.doneBy !== '' && data.doneBy !== 'Done By') {
    doneBy = String(data.doneBy).trim();
  }

  const requestData = {
    procedureId: this.currentOtherProcedureId,
    quantity: 1,
    unitSellingPrice,
    orderedBy,
    indication,
    doneBy,
  };




    if (!this.visitId) {
      this.responseMessage = "Missing visit Id";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderServices = false;

      this.showDivAddToDataBaseOtherProcedure = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBaseOtherProcedure = false;
        }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }

    if (!requestData.procedureId) {
      this.responseMessage = "Missing procedure Id";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderServices = false;

      this.showDivAddToDataBaseOtherProcedure = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBaseOtherProcedure = false;
        }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }


  console.log("requestData Data:", requestData);

  if (this.saveButtonStatusOtherProcedure == "Save Procedure") {
    console.log('Payload being sent:', JSON.stringify(data, null, 2));

    this.api.saveProcedure(this.visitId, requestData).subscribe(
      (response: any) => {
      console.log("Data sent to API:", requestData);

      if (response && response.message) {
        this.responseColor = "rgb(11, 155, 112)";
        console.log("Message:", response.message);
        this.responseMessage = response.message;
      } else {
        console.log("Message not found!");
        this.responseColor = "rgb(238, 16, 16)";
        this.responseMessage = "Internal server error"
      }

      this.showDivUpdatedLoaderServices = false;

      
      this.showDivAddToDataBaseOtherProcedure = true;
      this.showDivUpdatedOtherProcedure = false;



      this.getOtherProceduresByVisitSeparately()
      this.getCostsRegularySeparately()
      this.getLabTestsSeparately()


      console.log("Procedure added successfully");
      setTimeout(() => {
        this.showDivAddToDataBaseOtherProcedure = false;
        this.showDivUpdatedOtherProcedure = false;
        this.procedureId = ""
        this.saveButtonStatusOtherProcedure = "Save Procedure"
        this.clearOtherProcedureForm();
        this.getUltrasoundScanProceduresByVisitSeparately()

      }, 1000);
      




    
    },
  
  
    (error) => {

      console.error("Error saving service:", error);

      // Log the full error object for debugging
      console.error("Full error details:", error);


      // Extract the error message from the server response
      if (error.error && error.error.message) {
        this.responseMessage = error.error.message; // Use the error message from the server
      } else if (error.error && error.error.error) {
        this.responseMessage = error.error.error; // Fallback to error.error.error
      } else {
        this.responseMessage = "An unexpected error occurred. Please try again.";
      }
      this.responseColor = "rgb(238, 16, 16)"; // Red for error

      this.showDivUpdatedLoaderServices = false;


      this.showDivAddToDataBaseOtherProcedure = true;
      //this.showDivUpdatedTaxDiscount = false;

      setTimeout(() => {
        this.showDivAddToDataBaseOtherProcedure = false;
        //this.showDivUpdatedTaxDiscount = false;
        //this.procedureId = ""
        this.saveButtonStatusOtherProcedure = "Save Procedure"
      }, 6000);
    }
  
  
  
  
  );

    
  } 
  

  
  else if (this.saveButtonStatusOtherProcedure == "UpDate Procedure") {
    console.log("currentOtherProcedureRequestedId id", this.currentOtherProcedureRequestedId);
    console.log("confirm data before sending to api", requestData);

    console.log("confirm update status", this.saveButtonStatusOtherProcedure);

      this.api.updateProcedure(this.currentOtherProcedureRequestedId, requestData).subscribe(
        (response: any) => {
          console.log("response", response);


          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)";
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            console.log("Message not found!");
                  this.responseColor = "rgb(238, 16, 16)";
                  this.responseMessage = "Internal server error; Failed to Update"
          }

          this.getOtherProceduresByVisitSeparately()
          this.getCostsRegularySeparately()            
          console.log("Procedure Requested added successfully");

          this.showDivUpdatedLoaderServices = false;


          this.showDivAddToDataBase = false;
          this.showDivUpdatedOtherProcedure = true;

          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdatedOtherProcedure = false; 
            this.procedureId = ""
            this.saveButtonStatusOtherProcedure = "Save Procedure"
            this.clearOtherProcedureForm();


          }, 2000); 

          // Reload the client list

    
    
        },
        (error: any) => {
          console.error("Error updating Procedure", error);


          this.responseColor = "rgb(238, 16, 16)";
          this.responseMessage = error;
          this.showDivUpdatedLoaderServices = false;


          this.showDivAddToDataBase = false;
          this.showDivUpdated = true;
          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdated = false;  
          }, 3000); 
        }
      );
    


    };
  }



//tax discount




getUserFormDataTaxDiscount(data: any) {
  if (!this.invoiceId) {
    this.responseMessage = "Missing invoice Id";
    this.responseColor = "rgb(238, 16, 16)";
    this.setTaxDiscountSaving(false);
    this.showDivAddToDataBaseTaxDiscount = true;
    setTimeout(() => {
      this.showDivAddToDataBaseTaxDiscount = false;
    }, 2000);
    return;
  }

  this.setTaxDiscountSaving(true);

  console.log("Formatted Data:", data);

  if (this.saveButtonStatusTaxDiscount == "Save Discount") {
    console.log('Payload being sent:', JSON.stringify(data, null, 2));

    this.api.updateInvoiceWithDiscountAndTax(this.invoiceId, data).subscribe(
      (response: any) => {
      console.log("Data sent to API:", data);



      if (response && response.message) {
        this.responseColor = "rgb(11, 155, 112)";
        console.log("Message:", response.message);
        this.responseMessage = response.message;
      } else {
        console.log("Message not found!");
        this.responseColor = "rgb(238, 16, 16)";
        this.responseMessage = "Internal server error"
      }

      this.setTaxDiscountSaving(false);

      
      this.showDivAddToDataBaseTaxDiscount = true;
      this.showDivUpdatedTaxDiscount = false;
      
      //this.getPaymentsByVisitSeparately()
      this.getCostsRegularySeparately()
      console.log("discount added successfully");
      setTimeout(() => {
        this.showDivAddToDataBaseTaxDiscount= false;
        this.showDivUpdatedTaxDiscount = false;
        //this.procedureId = ""
        this.saveButtonStatusTaxDiscount = "Save Discount"

        this.clearTaxDiscountForm();

        this.closeTaxDiscountModal();
      }, 2000);
    
    },

    (error) => {
      console.error("Error saving Discount:", error);
      console.error("Full error details:", error);

      // Extract the error message from the server response
      if (error.error && error.error.message) {
        this.responseMessage = error.error.message; // Use the error message from the server
      } else if (error.error && error.error.error) {
        this.responseMessage = error.error.error; // Fallback to error.error.error
      } else {
        this.responseMessage = "An unexpected error occurred. Please try again.";
      }
      this.responseColor = "rgb(238, 16, 16)"; // Red for error

      this.setTaxDiscountSaving(false);


      this.showDivAddToDataBaseTaxDiscount = true;
      this.showDivUpdatedTaxDiscount = false;

      setTimeout(() => {
        this.showDivAddToDataBaseTaxDiscount = false;
        this.showDivUpdatedTaxDiscount = false;
        //this.procedureId = ""
        this.saveButtonStatusTaxDiscount = "Save Discount"
        this.closeTaxDiscountModal();
      }, 3000);
    }
  );
  
  ;
  } 

  else if (this.saveButtonStatusTaxDiscount== "UpDate") {
    console.log("currentOtherProcedureRequestedId id", this.currentOtherProcedureRequestedId);
    console.log("confirm data before sending to api", data);

    console.log("confirm update status", this.saveButtonStatusOtherProcedure);

      this.api.updateProcedure(this.currentOtherProcedureRequestedId, data).subscribe(
        (response: any) => {
          console.log("response", response);
          this.setTaxDiscountSaving(false);


          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)";
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            console.log("Message not found!");
                  this.responseColor = "rgb(238, 16, 16)";
                  this.responseMessage = "Internal server error; Failed to Update"
          }

          this.getOtherProceduresByVisitSeparately()
          this.getCostsRegularySeparately()            
          console.log("Procedure Requested added successfully");

          this.showDivAddToDataBase = false;
          this.showDivUpdatedOtherProcedure = true;

          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdatedOtherProcedure = false; 
            this.procedureId = ""
            this.saveButtonStatusOtherProcedure = "Save Procedure"
            this.clearOtherProcedureForm();
            this.closeTaxDiscountModal();


          }, 2000); 

          // Reload the client list

  
        },
        (error: any) => {
          console.error("Error updating Procedure", error);

          this.responseColor = "rgb(238, 16, 16)";
          this.responseMessage = error;

          this.setTaxDiscountSaving(false);


          this.showDivAddToDataBase = false;
          this.showDivUpdated = true;
          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdated = false;
            this.closeTaxDiscountModal();  
          }, 3000); 
        }
      );
    


    };
  }



 
 






// payments


getUserFormDataPayments(data: any) {
  console.log("Original data:", data);

  if (data.amountToPay === undefined || data.amountToPay === null || data.amountToPay === '') {
    this.responseMessage = "Missing Payment Amount";
    this.responseColor = "rgb(238, 16, 16)";
    this.setPaymentSaving(false);
    this.showDivAddToDataBasePayment = true;
    setTimeout(() => {
      this.showDivAddToDataBasePayment = false;
    }, 2000);
    return;
  }

  data.amountToPay = parseFloat(data.amountToPay);

  if (data.paymentForm === undefined || data.paymentForm === null || data.paymentForm === '') {
    data.paymentForm = "Cash At Hand";
  }

  if (data.notes === undefined || data.notes === null || data.notes === '') {
    data.notes = "Payment Received with Thanks";
  }

  if (data.status !== "Approved") {
    data.status = "Approved";
  }

  if (!this.visitId) {
    this.responseMessage = "Missing visit Id";
    this.responseColor = "rgb(238, 16, 16)";
    this.setPaymentSaving(false);
    this.showDivAddToDataBasePayment = true;
    setTimeout(() => {
      this.showDivAddToDataBasePayment = false;
    }, 2000);
    return;
  }

  this.setPaymentSaving(true);

  console.log("Formatted Data:", data);

  const requestData = {
  ...data, // Spread existing properties
  receivedBy: this.userName // Update only productId
};


  if (this.saveButtonStatusPayment == "Save Payment") {
    console.log('Payload being sent:', JSON.stringify(requestData, null, 2));

    this.api.savePayment(this.visitId, requestData).subscribe(
      (response: any) => {
      console.log("Data sent to API:", requestData);
      this.setPaymentSaving(false);


      if (response && response.message) {
        this.responseColor = "rgb(11, 155, 112)";
        console.log("Message:", response.message);
        this.responseMessage = response.message;
      } else {
        console.log("Message not found!");
        this.responseColor = "rgb(238, 16, 16)";
        this.responseMessage = "Internal server error"
      }
      
      this.showDivAddToDataBasePayment = true;
      this.showDivUpdatedPayment = false;
      
      this.getPaymentsByVisitSeparately()
      this.getCostsRegularySeparately()
      console.log("payment added successfully");
      setTimeout(() => {
        this.showDivAddToDataBasePayment = false;
        this.showDivUpdatedPayment = false;
        //this.procedureId = ""
        this.saveButtonStatusPayment = "Save Payment"
        this.clearPaymentForm();
        this.closePaymentModal();
      }, 1000);
    
    },

    (error) => {
      console.error("Error saving payment:", error);

      // Log the full error object for debugging
      console.error("Full error details:", error);


      // Extract the error message from the server response
      if (error.error && error.error.message) {
        this.responseMessage = error.error.message; // Use the error message from the server
      } else if (error.error && error.error.error) {
        this.responseMessage = error.error.error; // Fallback to error.error.error
      } else {
        this.responseMessage = "An unexpected error occurred. Please try again.";
      }
      this.responseColor = "rgb(238, 16, 16)"; // Red for error

      this.setPaymentSaving(false);


      this.showDivAddToDataBasePayment = true;
      this.showDivUpdatedPayment = false;

      setTimeout(() => {
        this.showDivAddToDataBasePayment = false;
        this.showDivUpdatedPayment = false;
        //this.procedureId = ""
        this.saveButtonStatusPayment = "Save Payment"
        this.closePaymentModal();
      }, 5000);
    }
  );
  
  ;
  } 

  else if (this.saveButtonStatusOtherProcedure == "UpDate Procedure") {
    console.log("currentOtherProcedureRequestedId id", this.currentOtherProcedureRequestedId);
    console.log("confirm data before sending to api", data);

    console.log("confirm update status", this.saveButtonStatusOtherProcedure);

      this.api.updateProcedure(this.currentOtherProcedureRequestedId, data).subscribe(
        (response: any) => {
          console.log("response", response);
          this.setPaymentSaving(false);


          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)";
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            console.log("Message not found!");
                  this.responseColor = "rgb(238, 16, 16)";
                  this.responseMessage = "Internal server error; Failed to Update"
          }

          this.getOtherProceduresByVisitSeparately()
          this.getCostsRegularySeparately()            
          console.log("Procedure Requested added successfully");

          this.showDivAddToDataBase = false;
          this.showDivUpdatedOtherProcedure = true;

          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdatedOtherProcedure = false; 
            this.procedureId = ""
            this.saveButtonStatusOtherProcedure = "Save Procedure"
            this.clearOtherProcedureForm();
            this.closePaymentModal();


          }, 2000); 

          // Reload the client list

  
        },
        (error: any) => {
          console.error("Error updating Procedure", error);

          this.responseColor = "rgb(238, 16, 16)";
          this.responseMessage = error;

          this.setPaymentSaving(false);


          this.showDivAddToDataBase = false;
          this.showDivUpdated = true;
          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdated = false;
            this.closePaymentModal();  
          }, 3000); 
        }
      );
    


    };
  }












  
  getUserFormDataScan(data: any) {
    //console.log("Original Data:", data);
  
    console.log("Original data:", data);
  

// ✅ Convert clientAge to a double or set to null
if (data.quantity === undefined || data.quantity === null || data.quantity === '' || data.quantity <= 0) {
  data.quantity = 1; // Handle empty age

} else {
  data.quantity = parseFloat(data.quantity); // Convert to double (JavaScript number)

}


if (data.report === undefined || data.report === null || data.report == '') {
  data.report = "Done Successfully"; // Handle empty age

} 

if (data.doneBy === undefined || data.doneBy === null || data.doneBy == '') {
  data.doneBy = "Mr.Reagan.O"; // Handle empty age

}

if (data.orderedBy === undefined || data.orderedBy === null || data.orderedBy == '') {
  data.orderedBy = "Dr.Judith M"; // Handle empty age

}



      if (!this.visitId) {
        this.responseMessage = "Missing visit Id";
        this.responseColor = "rgb(238, 16, 16)";
        this.showDivAddToDataBaseScan = true;  // Show error message
        setTimeout(() => {
          this.showDivAddToDataBaseScan = false;
          }, 2000);
        return;  // 🚨 Stop execution here, preventing save or update
      }

      // Assuming requestData is your existing object
const requestData = {
  ...data, // Spread existing properties
  procedureId: this.currentScanProcedureId // Update only productId
};
  
      // ✅ Check for missing names and STOP execution if found
      if (!requestData.procedureId) {
        this.responseMessage = "Missing SCAN Id";
        this.responseColor = "rgb(238, 16, 16)";
        this.showDivAddToDataBaseScan = true;  // Show error message
        setTimeout(() => {
          this.showDivAddToDataBaseScan = false;
          }, 2000);
        return;  // 🚨 Stop execution here, preventing save or update
      }

    console.log("Formatted Data:", data);
  
    if (this.saveButtonStatusScan == "Save Scan") {
      console.log('Payload being sent:', JSON.stringify(requestData, null, 2));

      this.api.saveProcedure(this.visitId, requestData).subscribe(
        (response: any) => {
          console.log("visit id sent to api:", this.visitId);

        console.log("Data sent to API:", requestData);

        if (response && response.message) {
          this.responseColor = "rgb(11, 155, 112)";
          console.log("Message:", response.message);
          this.responseMessage = response.message;
        } else {
          console.log("Message not found!");
          this.responseColor = "rgb(238, 16, 16)";
          this.responseMessage = "Internal server error"
        }
        
        this.showDivAddToDataBaseScan = true;
        this.showDivUpdatedScan = false;
        
        this.getUltrasoundScanProceduresByVisitSeparately()
        this.getCostsRegularySeparately()
        this.getOtherProceduresByVisitSeparately()
        console.log("Scans added successfully");
        setTimeout(() => {
          this.showDivAddToDataBaseScan = false;
          this.showDivUpdatedScan = false;
          //this.procedureId = ""
          this.saveButtonStatusScan = "Save Scan"
          this.clearScanForm();
        }, 3000);
      
      },

      (error: any) => {

        console.error("Error saving service:", error);
  
        // Log the full error object for debugging
        console.error("Full error details:", error);
  
  
        // Extract the error message from the server response
        if (error.error && error.error.message) {
          this.responseMessage = error.error.message; // Use the error message from the server
        } else if (error.error && error.error.error) {
          this.responseMessage = error.error.error; // Fallback to error.error.error
        } else {
          this.responseMessage = "An unexpected error occurred. Please try again.";
        }
        this.responseColor = "rgb(238, 16, 16)"; // Red for error
  
        this.showDivUpdatedLoader = false;
  
  
        this.showDivAddToDataBaseScan = true;
        //this.showDivUpdatedTaxDiscount = false;
  
        setTimeout(() => {
          this.showDivAddToDataBaseScan = false;
          //this.showDivUpdatedTaxDiscount = false;
          //this.procedureId = ""
          this.saveButtonStatusScan = "Save Scan"
        }, 6000);
      }
    
    
    );
    } else if (this.saveButtonStatusScan == "UpDate Scan") {
      console.log("currentScanProcedureRequestedId id", this.currentScanProcedureRequestedId);
      console.log("confirm data before sending to api", requestData);
  
      console.log("confirm update status", this.saveButtonStatusScan);
  
        this.api.updateProcedure(this.currentScanProcedureRequestedId, requestData).subscribe(
          (response: any) => {
            console.log("response", response);

            if (response && response.message) {
              this.responseColor = "rgb(11, 155, 112)";
              console.log("Message:", response.message);
              this.responseMessage = response.message;
            } else {
              console.log("Message not found!");
                    this.responseColor = "rgb(238, 16, 16)";
                    this.responseMessage = "Internal server error; Failed to Update"
            }

            this.getUltrasoundScanProceduresByVisitSeparately()
            this.getCostsRegularySeparately()            
            console.log("scan procedureRequested added successfully");

            this.showDivAddToDataBase = false;
            this.showDivUpdatedScan = true;

            setTimeout(() => {
              this.showDivAddToDataBase = false;
              this.showDivUpdatedScan = false; 
              this.procedureId = ""
              this.saveButtonStatusScan = "Save Scan"
              this.clearScanForm();


            }, 3000); 
  
            // Reload the client list
  
      
      
          },

          (error: any) => {

            console.error("Error saving service:", error);
      
            // Log the full error object for debugging
            console.error("Full error details:", error);
      
      
            // Extract the error message from the server response
            if (error.error && error.error.message) {
              this.responseMessage = error.error.message; // Use the error message from the server
            } else if (error.error && error.error.error) {
              this.responseMessage = error.error.error; // Fallback to error.error.error
            } else {
              this.responseMessage = "An unexpected error occurred. Please try again.";
            }
            this.responseColor = "rgb(238, 16, 16)"; // Red for error
      
            this.showDivUpdatedLoader = false;
      
      
            this.showDivAddToDataBaseScan = true;
            //this.showDivUpdatedTaxDiscount = false;
      
            setTimeout(() => {
              this.showDivAddToDataBaseScan = false;
              //this.showDivUpdatedTaxDiscount = false;
              //this.procedureId = ""
              this.saveButtonStatusScan = "Save Scan"
            }, 6000);
          }
        );
      
  
  
      };
    }









  
  getUserFormDataLabTest(data: any) {
    //console.log("Original Data:", data);

    this.showDivUpdatedLoader = true;
  
    console.log("Original data:", data);
  

// ✅ Convert clientAge to a double or set to null
if (data.quantity === undefined || data.quantity === null || data.quantity == '' || data.quantity <= 0) {
  data.quantity = 1; // Handle empty age

} else {
  data.quantity = parseFloat(data.quantity); // Convert to double (JavaScript number)

}

if (data.report === undefined || data.report === null || data.report == '') {
  data.report = "Done Successfully"; // Handle empty age

} 

if (data.doneBy === undefined || data.doneBy === null || data.doneBy == '') {
  data.doneBy = "Mr.collins"; // Handle empty age

}

if (data.orderedBy === undefined || data.orderedBy === null || data.orderedBy == '') {
  data.orderedBy = "Dr.Emma"; // Handle empty age

}



 

      if (!this.visitId) {
        this.responseMessage = "Missing visit Id";
        this.responseColor = "rgb(238, 16, 16)";
        this.showDivAddToDataBaseLabTest = true;  // Show error message
        setTimeout(() => {
          this.showDivAddToDataBaseLabTest = false;
          }, 2000);
        return;  // 🚨 Stop execution here, preventing save or update
      }
  

    console.log("Formatted Data:", data);

    const requestData = {
      ...data, // Spread existing properties
      procedureId: this.currentProcedureId // Update only productId
    };


          // ✅ Check for missing names and STOP execution if found
          if (!requestData.procedureId) {
            this.responseMessage = "Missing SCAN Id";
            this.responseColor = "rgb(238, 16, 16)";
            this.showDivAddToDataBaseLabTest = true;  // Show error message
            setTimeout(() => {
              this.showDivAddToDataBaseLabTest = false;
              }, 2000);
            return;  // 🚨 Stop execution here, preventing save or update
          }
  
    if (this.saveButtonStatusLabTest == "Save LabTest") {
      console.log('Payload being sent:', JSON.stringify(requestData, null, 2));

      this.api.saveProcedure(this.visitId, requestData).subscribe(
        (response: any) => {
        console.log("Data sent to API:", requestData);

        this.showDivUpdatedLoader = false;


        if (response && response.message) {
          this.responseColor = "rgb(11, 155, 112)";
          console.log("Message:", response.message);
          this.responseMessage = response.message;
        } else {
          console.log("Message not found!");
          this.responseColor = "rgb(238, 16, 16)";
          this.responseMessage = "Internal server error"
        }
        
        this.showDivAddToDataBaseLabTest = true;
        this.showDivUpdatedLabTest = false;
        
        this.getLabTestsSeparately()
        this.getCostsRegularySeparately()
        this.getOtherProceduresByVisitSeparately()
        
        console.log("labtest added successfully");
        setTimeout(() => {
          this.showDivAddToDataBaseLabTest = false;
          this.showDivUpdatedLabTest = false;
          this.procedureId = ""
          this.saveButtonStatusLabTest = "Save LabTest"
          this.clearLabTestForm();
        }, 3000);
      
      },
        
    (error) => {

      console.error("Error saving service:", error);

      // Log the full error object for debugging
      console.error("Full error details:", error);


      // Extract the error message from the server response
      if (error.error && error.error.message) {
        this.responseMessage = error.error.message; // Use the error message from the server
      } else if (error.error && error.error.error) {
        this.responseMessage = error.error.error; // Fallback to error.error.error
      } else {
        this.responseMessage = "An unexpected error occurred. Please try again.";
      }
      this.responseColor = "rgb(238, 16, 16)"; // Red for error

      this.showDivUpdatedLoader = false;


      this.showDivAddToDataBaseLabTest = true;
      //this.showDivUpdatedTaxDiscount = false;

      setTimeout(() => {
        this.showDivAddToDataBaseLabTest = false;
        //this.showDivUpdatedTaxDiscount = false;
        //this.procedureId = ""
        this.saveButtonStatusLabTest = "Save LabTest"
      }, 6000);
    }
    
    
    
    
    );
    } else if (this.saveButtonStatusLabTest == "UpDate Test") {
      console.log("currentProcedureRequestedId id", this.currentProcedureRequestedId);
      console.log("confirm data before sending to api", requestData);
  
      console.log("confirm update status", this.saveButtonStatusLabTest);
  
        this.api.updateProcedure(this.currentProcedureRequestedId, requestData).subscribe(
          (response: any) => {
            console.log("response", response);
            this.showDivUpdatedLoader = false;


            if (response && response.message) {
              this.responseColor = "rgb(11, 155, 112)";
              console.log("Message:", response.message);
              this.responseMessage = response.message;
            } else {
              console.log("Message not found!");
                    this.responseColor = "rgb(238, 16, 16)";
                    this.responseMessage = "Internal server error; Failed to Update"
            }

            this.getLabTestsSeparately()
            this.getCostsRegularySeparately() 
            this.getOtherProceduresByVisitSeparately()           
            console.log("procedureRequested added successfully");

            this.showDivAddToDataBase = false;
            this.showDivUpdatedLabTest = true;

            setTimeout(() => {
              this.showDivAddToDataBase = false;
              this.showDivUpdatedLabTest = false; 
              this.procedureId = ""
              this.saveButtonStatusLabTest = "Save LabTest"
              this.clearLabTestForm();


            }, 3000); 
  
            // Reload the client list
      
          },
  
          (error: any) => {

            console.error("Error saving service:", error);
      
            // Log the full error object for debugging
            console.error("Full error details:", error);
      
      
            // Extract the error message from the server response
            if (error.error && error.error.message) {
              this.responseMessage = error.error.message; // Use the error message from the server
            } else if (error.error && error.error.error) {
              this.responseMessage = error.error.error; // Fallback to error.error.error
            } else {
              this.responseMessage = "An unexpected error occurred. Please try again.";
            }
            this.responseColor = "rgb(238, 16, 16)"; // Red for error

            console.error("current error:", this.responseMessage);

      
            this.showDivUpdatedLoader = false;
      
      
            this.showDivAddToDataBase = true;
            //this.showDivUpdatedTaxDiscount = false;
      
            setTimeout(() => {
              this.showDivAddToDataBase = false;
              //this.showDivUpdatedTaxDiscount = false;
              //this.procedureId = ""
              this.saveButtonStatusOtherProcedure = "Save Procedure"
            }, 6000);
          }
        );
      
  
  
      };
    } 



  getUserFormData(data: any) {

    this.showDivUpdatedLoaderVitals = true;
    

    // ✅ Convert clientDateOfBirth (Object → String "YYYY-MM-DD") or set to null
    if (data.dateTaken && typeof data.dateTaken === 'object') {
      const { year, month, day } = data.dateTaken;
      data.dateTaken = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    } else {
      data.dateTaken = null; // Handle empty date
    }
  
  // ✅ Convert clientAge to a double or set to null
  if (data.temperature !== undefined && data.temperature !== null && data.temperature !== '') {
    data.temperature = parseFloat(data.temperature); // Convert to double (JavaScript number)
  } else {
    data.temperature = null; // Handle empty age
  }
  
  // ✅ Convert clientAge to a double or set to null
  if (data.diastolic !== undefined && data.diastolic !== null && data.diastolic !== '') {
    data.diastolic = parseFloat(data.diastolic); // Convert to double (JavaScript number)
  } else {
    data.diastolic = null; // Handle empty age
  }
  
  
  // ✅ Convert clientAge to a double or set to null
  if (data.systolic !== undefined && data.systolic !== null && data.systolic !== '') {
    data.systolic = parseFloat(data.systolic); // Convert to double (JavaScript number)
  } else {
    data.systolic = null; // Handle empty age
  }


  
  // ✅ Convert clientAge to a double or set to null
  if (data.weight !== undefined && data.weight !== null && data.weight !== '') {
    data.weight = parseFloat(data.weight); // Convert to double (JavaScript number)
  } else {
    data.weight = null; // Handle empty age
  }
  
  // ✅ Convert clientAge to a double or set to null
  if (data.spO2 !== undefined && data.spO2 !== null && data.spO2 !== '') {
    data.spO2 = parseFloat(data.spO2); // Convert to double (JavaScript number)
  } else {
    data.spO2 = null; // Handle empty age
  }
  
  // ✅ Convert clientAge to a double or set to null
  if (data.pulseRate !== undefined && data.pulseRate !== null && data.pulseRate !== '') {
    data.pulseRate = parseFloat(data.pulseRate);
  } else {
    data.pulseRate = null;
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
  
  
  // ✅ Convert clientAge to a double or set to null
  if (data.height !== undefined && data.height !== null && data.height !== '') {
    data.height = parseFloat(data.height); // Convert to double (JavaScript number)
  } else {
    data.height = null; // Handle empty age
  }

  if (data.muac !== undefined && data.muac !== null && data.muac !== '') {
    data.muac = parseFloat(data.muac);
  } else {
    data.muac = null;
  }

  if (data.station === 'Station' || !data.station) {
    data.station = 'Triage';
  }

  data.takenBy = (this.userName ?? sessionStorage.getItem('username') ?? '').toString().trim() || 'Nurse';
  
  
  
  // ✅ Convert timeTaken to LocalTime format (HH:mm:ss) or set to null
  if (data.timeTaken !== undefined && data.timeTaken !== null && data.timeTaken !== '') {
    const date = new Date(`1970-01-01T${data.timeTaken}`); // Ensure time consistency
    data.timeTaken = date.toISOString().substring(11, 19); // Extract HH:mm:ss part
  } else {
    data.timeTaken = null; // Handle empty time
  }


    if (!this.hasAnyVitalMeasurement(data)) {
      this.dataBaseResponseMessage = 'Enter at least one vital measurement before saving.';
      this.dataBaseResponseColor = 'rgb(238, 16, 16)';
      this.showDivUpdatedLoaderVitals = false;

      this.showDivAddToDataBase = true;
      setTimeout(() => {
        this.showDivAddToDataBase = false;
      }, 2000);
      return;
    }


  if (!this.visitId) {
    this.dataBaseResponseMessage = "Missing visit Id";
    this.dataBaseResponseColor = "rgb(238, 16, 16)";
    this.showDivUpdatedLoaderVitals = false;

    this.showDivAddToDataBase = true;  // Show error message
    setTimeout(() => {
      this.showDivAddToDataBase = false;
      }, 2000);
    return;  // 🚨 Stop execution here, preventing save or update
  }
  
  
  
  
    console.log("Formatted Data:", data);
  
    if (this.saveButtonStatus == "Save Vitals") {
      this.api.takeVitals(this.visitId, data).subscribe(
        (response: any) => {
          console.log("Data sent to API:", data);

  
          if (response && response.message) {
            this.dataBaseResponseColor = "rgb(11, 155, 112)";
            console.log("Message:", response.message);
            this.dataBaseResponseMessage = response.message;
          } else {
            console.log("Message not found!");
            this.dataBaseResponseColor = "rgb(238, 16, 16)";
            this.dataBaseResponseMessage = "Internal server error"
          }
          this.showDivUpdatedLoaderVitals = false;

          
          this.showDivAddToDataBase = true;
          this.showDivUpdatedLabTest = false;
          
          this.getInitialVitalsSeparately()
          this.getCostsRegularySeparately()
          if (this.clientId) {
            this.loadClientVisits(this.clientId);
          }
          console.log("vital added successfully");
          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdatedLabTest = false;
            this.procedureId = ""
            this.saveButtonStatus = "Save Vitals"
            this.clearVitalsForm();
          }, 2000);
      
      },
      (error: any) => {
        console.error("Error saving vital", error);
        this.dataBaseResponseColor = "rgb(238, 16, 16)";




          // Extract the error message from the server response
          if (error.error && error.error.message) {
            this.dataBaseResponseColor = "rgb(238, 16, 16)";

            this.dataBaseResponseMessage = error.error.message; // Use the error message from the server
          } else if (error.error && error.error.error) {
            this.dataBaseResponseColor = "rgb(238, 16, 16)";

            this.dataBaseResponseMessage = error.error.error; // Fallback to error.error.error
          } else {
            this.dataBaseResponseMessage = "An unexpected error occurred. Please try again.";
          }

        this.dataBaseResponseColor = "rgb(238, 16, 16)";
        this.showDivUpdatedLoaderVitals = false;


        this.showDivAddToDataBase = true;
        this.showDivUpdated = false;
        setTimeout(() => {
          this.showDivAddToDataBase = false;
          this.showDivUpdated = false;  
        }, 3000); 
      }
    
    );
    } else { if(this.saveButtonStatus == "UpDate Vitals"){
      console.log("client id", this.vitalId);
      console.log("confirm data before Updating to api", data);
  
  
        this.api.updateVital(this.vitalId, data).subscribe(
          (response: any) => {
            console.log("response", response);


            if (response && response.message) {
              this.dataBaseResponseColor = "rgb(11, 155, 112)";
              console.log("Message:", response.message);
              this.dataBaseResponseMessage = response.message;
            } else {
              console.log("Message not found!");
              this.dataBaseResponseColor = "rgb(238, 16, 16)";
              this.dataBaseResponseMessage = "Internal server error"
            }

            this.getInitialVitalsSeparately()
            this.getCostsRegularySeparately()
            if (this.clientId) {
              this.loadClientVisits(this.clientId);
            }
            console.log("vital added successfully");

            this.showDivUpdatedLoaderVitals = false;


            this.showDivAddToDataBase = true;
            //this.showDivUpdated = true;
            setTimeout(() => {
              this.showDivAddToDataBase = false;
              this.showDivUpdated = false;  
              this.clearVitalsForm();
            }, 2000); 
  
            // Reload the client list
      
          },
          (error: any) => {
            console.error("Error updating client", error);
            this.dataBaseResponseColor = "rgb(238, 16, 16)";
            this.dataBaseResponseMessage =
              error?.error?.message ||
              error?.error?.error ||
              error?.message ||
              'Failed to update vitals. Please try again.';

            this.showDivUpdatedLoaderVitals = false;


  
            this.showDivAddToDataBase = true;
            //this.showDivUpdated = true;
            setTimeout(() => {
              this.showDivAddToDataBase = false;
              this.saveButtonStatus = "Save Vitals"
              
             

              //this.showDivUpdated = false;  
            }, 3000); 
          }
        );
  
  
      };
    } }



//delete treatment


deleteTreatmentRequest(itemOrId: any) {
  const treatmentId =
    typeof itemOrId === 'object' && itemOrId != null
      ? this.resolveTreatmentRowId(itemOrId)
      : Number(itemOrId);
  if (treatmentId == null || !Number.isFinite(treatmentId) || treatmentId <= 0) {
    this.responseColor = "rgb(238, 16, 16)";
    this.responseMessage = 'Cannot delete: treatment line has no saved id. Refresh and try again.';
    this.showDivAddToDataBaseTreatmentOut = true;
    setTimeout(() => {
      this.showDivAddToDataBaseTreatmentOut = false;
    }, 3000);
    return;
  }

  this.showDivUpdatedLoaderPharmacyOut = true;
  this.api.deleteTreatmentRequestById(treatmentId).subscribe({
    next: (response: any) => {
      this.showDivUpdatedLoaderPharmacyOut = false;
      this.responseColor = "rgb(11, 155, 112)";
      this.responseMessage = response?.message || 'Treatment request deleted successfully.';
      this.showDivAddToDataBaseTreatmentOut = true;
      setTimeout(() => {
        this.showDivAddToDataBaseTreatmentOut = false;
      }, 3000);

      this.getRequestedTreatmentByVisitSeparately();
      this.getCostsRegularySeparately();
      if (Number(this.treatmentId) === treatmentId) {
        this.treatmentId = null;
        this.saveButtonStatusTreatment = "Save Drug";
        this.clearTreatmentForm();
      }
    },
    error: (error) => {
      console.error("Error deleting treatment", error);
      this.showDivUpdatedLoaderPharmacyOut = false;
      this.responseColor = "rgb(238, 16, 16)";
      this.responseMessage =
        error?.error?.message || error?.message || 'Failed to delete treatment request.';
      this.showDivAddToDataBaseTreatmentOut = true;
      setTimeout(() => {
        this.showDivAddToDataBaseTreatmentOut = false;
      }, 3000);
      this.getRequestedTreatmentByVisitSeparately();
    },
  });
}



// delete payment


printPaymentReceipt(payment: any): void {
  if (!payment) {
    return;
  }
  const deps = {
    addLogoToPdf: (doc: any, x: number, y: number, w: number, h: number) =>
      this.facilityBranding.addLogoToJsPdf(doc, x, y, w, h),
  };
  void this.ensurePdfLogoLoaded().then(() => {
    downloadPaymentReceiptPdf(
      {
        facilityName: this.facilityBranding.getFacilityName(),
        facilityContactLine: this.facilityBranding.getContactInquiryLine(),
        clientName: `${this.clientFirstName || ''} ${this.clientSecondName || ''}`.trim() || 'Client',
        clientFileNo: this.clientFileNo || '',
        visitNumber: this.visit?.visitNumber ?? this.visitId,
        visitDate: this.visit?.visitDate || '',
        receiptNo: payment?.id != null ? `RCP-${payment.id}` : 'RCP',
        amountPaid: payment?.amountToPay,
        paymentForm: payment?.paymentForm || '',
        status: payment?.status || '',
        notes: payment?.notes || '',
        dateOfPayment: payment?.dateOfPayment || '',
        timeOfPayment: payment?.timeOfPayment || '',
        paidBy: payment?.paidBy || '',
        receivedBy: payment?.receivedBy || this.userName || '',
        invoiceTotal: this.currentInvoice?.totalAmount ?? this.totalAmount,
        invoiceAmountPaid: this.currentInvoice?.amountPaid ?? this.amountPaid,
        balanceDue: this.currentInvoice?.balanceDue ?? this.balanceDue,
      },
      deps
    );
  });
}

printPaymentStatement(): void {
  const rows = Array.isArray(this.productListPaymentsMade) ? this.productListPaymentsMade : [];
  if (!rows.length) {
    this.responseColor = 'rgb(238, 16, 16)';
    this.generalResponseMessage = 'No payment records to print.';
    this.showDivGeneralResponseMessages = true;
    setTimeout(() => (this.showDivGeneralResponseMessages = false), 3000);
    return;
  }
  const deps = {
    addLogoToPdf: (doc: any, x: number, y: number, w: number, h: number) =>
      this.facilityBranding.addLogoToJsPdf(doc, x, y, w, h),
  };
  void this.ensurePdfLogoLoaded().then(() => {
    downloadPaymentStatementPdf(
      {
        facilityName: this.facilityBranding.getFacilityName(),
        facilityContactLine: this.facilityBranding.getContactInquiryLine(),
        clientName: `${this.clientFirstName || ''} ${this.clientSecondName || ''}`.trim() || 'Client',
        clientFileNo: this.clientFileNo || '',
        visitNumber: this.visit?.visitNumber ?? this.visitId,
        visitDate: this.visit?.visitDate || '',
        rows: rows.map((item: any) => ({
          amountPaid: item?.amountToPay,
          paymentForm: item?.paymentForm || '',
          status: item?.status || '',
          notes: item?.notes || '',
          dateOfPayment: item?.dateOfPayment || '',
          timeOfPayment: item?.timeOfPayment || '',
          paidBy: item?.paidBy || '',
          receivedBy: item?.receivedBy || '',
        })),
        subtotal: this.currentInvoice?.subTotal ?? this.invoiceSubtotal,
        discount: this.currentInvoice?.discount ?? this.discount,
        tax: this.currentInvoice?.tax ?? this.tax,
        totalAmount: this.currentInvoice?.totalAmount ?? this.totalAmount,
        amountPaid: this.currentInvoice?.amountPaid ?? this.amountPaid,
        balanceDue: this.currentInvoice?.balanceDue ?? this.balanceDue,
      },
      deps
    );
  });
}

deletePayment(id: any) {
  this.setInvoiceActionLoading(true);

  this.api.deletePayment(id).subscribe(
    (response) => {
      console.log("response", response);

      if (response && response.message) {
        this.responseColor = "rgb(238, 16, 16)";
        console.log("Message:", response.message);
        this.generalResponseMessage = response.message;
      } else {
        console.log("Message not found!");
              this.responseColor = "rgb(238, 16, 16)";
              this.generalResponseMessage = "Internal server error; Failed to delete"
      }
      this.setInvoiceActionLoading(false);


      this.showDivGeneralResponseMessages = true;
      //this.showDivUpdatedPayment = true; 
      setTimeout(() => {
        this.showDivGeneralResponseMessages = false;
        //this.showDivUpdatedPayment = false;  
      }, 3000); 

      this.getPaymentsByVisitSeparately();
      this.getCostsRegularySeparately() 
      console.log(" payment deleted successfully");


    },
    (error) => {
      console.error("Error deleting payment", error);

      this.responseColor = "rgb(238, 16, 16)";
      this.generalResponseMessage = error.message;

      this.setInvoiceActionLoading(false);


      this.showDivGeneralResponseMessages = true;
      //this.showDivUpdatedPayment = true; 
      setTimeout(() => {
        this.showDivGeneralResponseMessages = false;
        //this.showDivUpdatedPayment = true;  
      }, 3000); 

    }
  );
}











    deleteOtherProcedureRequest(id: any) {
      if (!id) {
        return;
      }
      if (!confirm('Remove this service / procedure request from the visit?')) {
        return;
      }

      this.showDivUpdatedLoaderDeleteOut = true;

      this.api.deleteProcedureRequestById(id).subscribe({
        next: (response: any) => {
          this.responseColor = 'rgb(22, 163, 74)';
          this.responseMessage = response?.message || 'Procedure deleted successfully.';
          this.showDivUpdatedLoaderDeleteOut = false;
          this.showDivAddToDataBaseOtherProcedureOut = true;
          setTimeout(() => {
            this.showDivAddToDataBaseOtherProcedureOut = false;
            this.showDivUpdatedOtherProcedure = false;
          }, 3000);
          this.getLabTestsSeparately();
          this.getOtherProceduresByVisitSeparately();
          this.getUltrasoundScanProceduresByVisitSeparately();
          this.getCostsRegularySeparately();
        },
        error: (error: any) => {
          this.responseColor = 'rgb(238, 16, 16)';
          this.responseMessage =
            error?.error?.message || error?.message || 'Could not delete procedure request.';
          this.showDivUpdatedLoaderDeleteOut = false;
          this.showDivAddToDataBaseOtherProcedureOut = true;
          setTimeout(() => {
            this.showDivAddToDataBaseOtherProcedureOut = false;
            this.showDivUpdatedOtherProcedure = false;
          }, 3000);
        },
      });
    }












    deleteScanProcedureRequest(id: any) {
      this.deleteOtherProcedureRequest(id);
    }


    deleteProcedureRequest(id: any) {
      this.deleteOtherProcedureRequest(id);
    }




    deleteVital2(id: any) {

      this.showDivUpdatedLoaderPharmacyOut = true

      this.api.deleteVitalById(id).subscribe(
        (response: any) => {
          console.log("response", response);
    
          this.getInitialVitalsSeparately()
          this.getCostsRegularySeparately()
          if (this.clientId) {
            this.loadClientVisits(this.clientId);
          }
          console.log("vital deleted successfully");
          this.showDivUpdatedLoaderPharmacyOut = false


          this.showDivAddToDataBaseTreatmentOut = true;
    
        },
        (error: any) => {
          console.error("Error deleting item", error);
        }
      );
    }





    deleteVital(id: any) {


      
      

      this.showDivUpdatedLoaderVitalOut = true
      this.api.deleteVitalById(id).subscribe(
        (response: any) => {
          console.log("response", response);
    
          if (response && response.message) {
            this.responseColor = "rgb(238, 16, 16)";
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            console.log("Message not found!");
                  this.responseColor = "rgb(238, 16, 16)";
                  this.responseMessage = "Internal server error; Failed to delete"
          }
          this.showDivUpdatedLoaderVitalOut = false
    
    
          this.showDivAddToDataBaseVitalOut = true;
          setTimeout(() => {
            this.showDivAddToDataBaseVitalOut = false;
          }, 2000); 
    
          this.getInitialVitalsSeparately()

    
    
        },
        (error: any) => {
          console.error("Error deleting treatment", error);
    
          this.responseColor = "rgb(238, 16, 16)";
          this.responseMessage = error.message;
    
          this.showDivUpdatedLoaderVitalOut = false
    
    
          this.showDivAddToDataBaseVitalOut = true;
          setTimeout(() => {
            this.showDivAddToDataBaseVitalOut = false;
          }, 3000); 
    
        }
      );
    }
    



    
    loadProcedure(id: any) {
 
      this.api.getClientGroupByGroupName(id).subscribe((res) => {
        this.clientGroup = res;
        //this.currentClientGroup = this.clientGroup.groupNameShortForm;
        //console.log('group now',this.clientGroup.groupNameShortForm);
        //console.log(clientId);
  
      });  
    }






    editLabTestRequest(item: any) {

      console.log('this is the item item immediately:', item);
  
      this.isCollapsedNewLabTest = false;
  
      this.saveButtonStatusLabTest = "UpDate Test"
  
      console.log('this is the item item :', item);
  
      //console.log('this is the groip id:', item.clientGroupId);
  
      console.log('plain id:', item.id);
  
      this.procedureId = item.procedure.id;
      this.currentProcedureRequestedId = item.id;
      this.currentProcedure = item.procedure;

      this.changeCurrentProcedure(this.currentProcedure)

      //this.currentProcedureRequestedId = item.id;
  
     //this.loadClientGroupByGroupName(item.procedureId)
  
      console.log('procedure id:', this.procedureId);
  
      console.log('the save button status:', this.saveButtonStatusLabTest);

      this.labTestOrderedBy = item.orderedBy;

      this.labTestDoneBy = item.doneBy;
  
      console.log('date before converted:', item.date);

      this.currentProcedureRequested = item;
  
      // Convert clientDateOfBirth to NgbDateStruct
  
      // Convert timeTaken to HH:mm format
  
      // Convert timeTaken to HH:mm format
  
  
  
  // Ensure height is a number
  if (this.currentProcedureRequested.quantity !== undefined && this.currentProcedureRequested.quantity !== null && this.currentProcedureRequested.quantity !== '') {
    this.currentProcedureRequested.quantity = Number(this.currentProcedureRequested.quantity);
  } else {
    this.currentProcedureRequested.quantity = null; // Handle empty values
  }
  
  
  
      console.log('Editing vital:', this.currentProcedureRequested);
  
  
  
      // Dropdown or datepicker-specific logic can be added if necessary
  
      //this.currentClientGroup = item.clientGroupId;  // Update client group dropdown if needed

      this.isUpdatingLabTest = true;

  
    }







    editOtherProcedureRequest(item: any) {

      this.getOtherProceduresByVisitSeparately()


       this.openServiceRequestModal();


        this.saveButtonStatusOtherProcedure = "UpDate Procedure"
    
        console.log('this is the item item :', item);
    
        //console.log('this is the groip id:', item.clientGroupId);
    
        console.log('plain id:', item.id);
    
        this.procedureId = item.procedure.id;
        this.currentOtherProcedureRequestedId = item.id;
        this.currentOtherProcedure = item.procedure;
  
        this.changeCurrentOtherProcedure(this.currentOtherProcedure)
  
        //this.currentProcedureRequestedId = item.id;
    
       //this.loadClientGroupByGroupName(item.procedureId)
    
        console.log('procedure id:', this.procedureId);
    
        console.log('the save button status:', this.saveButtonStatusOtherProcedure);
  
        this.procedureOrderedBy = item.orderedBy || 'Ordered By';
        this.procedureDoneBy = item.doneBy || 'Done By';
  
        console.log('date before converted:', item.date);
  
        this.currentOtherProcedureRequested = {
          ...item,
          indication: item.indication ?? '',
        };

        this.currentScanProcedureRequestedUnitSellingPrice = item.unitSellingPrice;
    
    
    
        console.log('Editing procedure:', this.currentOtherProcedureRequested);
    
    
    
        // Dropdown or datepicker-specific logic can be added if necessary
    
        //this.currentClientGroup = item.clientGroupId;  // Update client group dropdown if needed
  
        this.isUpdatingOtherProcedure = true;
  
    
        this.openServiceRequestModal(); 




  
    }







    editScanRequest(item: any) {

      console.log('this is the item item immediately:', item);
  
      this.isCollapsedNewScan = false;
  
      this.saveButtonStatusScan = "UpDate Scan"
  
      console.log('this is the item item :', item);
  
      //console.log('this is the groip id:', item.clientGroupId);
  
      console.log('plain id:', item.id);
  
      this.procedureId = item.procedure.id;
      this.currentScanProcedureRequestedId = item.id;
      this.currentScanProcedure = item.procedure;

      this.changeCurrentScanProcedure(this.currentScanProcedure)

      //this.currentProcedureRequestedId = item.id;
  
     //this.loadClientGroupByGroupName(item.procedureId)
  
      console.log('procedure id:', this.procedureId);
  
      console.log('the save button status:', this.saveButtonStatusScan);

      this.scanOrderedBy = item.orderedBy;

      this.scanDoneBy = item.doneBy;
  
      console.log('date before converted:', item.date);

      this.currentScanProcedureRequested = item;
  
      // Convert clientDateOfBirth to NgbDateStruct
  
      // Convert timeTaken to HH:mm format
  
      // Convert timeTaken to HH:mm format
  
  
  
  // Ensure height is a number
  if (this.currentScanProcedureRequested.quantity !== undefined && this.currentScanProcedureRequested.quantity !== null && this.currentProcedureRequested.quantity !== '') {
    this.currentScanProcedureRequested.quantity = Number(this.currentScanProcedureRequested.quantity);
  } else {
    this.currentScanProcedureRequested.quantity = null; // Handle empty values
  }
  
  
  
      console.log('Editing scan:', this.currentScanProcedureRequested);
  
  
  
      // Dropdown or datepicker-specific logic can be added if necessary
  
      //this.currentClientGroup = item.clientGroupId;  // Update client group dropdown if needed

      this.isUpdatingScan = true;

  
    }






  editVital(item: any) {

    console.log('this is the item item immediately:', item);

    this.openVitalsModal();

    this.saveButtonStatus = "UpDate Vitals"


    console.log('this is the item item :', item);

    //console.log('this is the groip id:', item.clientGroupId);

    console.log('plain id:', item.id);

    this.vitalId = item.id;

    console.log('this is vital id :', this.vitalId);



   // this.loadClientGroupByGroupName(item.clientGroupId)


    //console.log('client group:', this.currentClientGroup);


    console.log('the save button status:', this.saveButtonStatus);

    this.station = item.station;
    console.log('date before converted:', item.dateTaken);


 


    this.currentVital = item;

    // Convert clientDateOfBirth to NgbDateStruct

    if (this.currentVital.dateTaken) {
      const date = new Date(this.currentVital.dateTaken);
      this.currentVital.dateTaken = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
      };
    }

    console.log('date converted:', this.currentVital.dateTaken);


    // Convert timeTaken to HH:mm format

    // Convert timeTaken to HH:mm format



// Ensure height is a number
if (this.currentVital.height !== undefined && this.currentVital.height !== null && this.currentVital.height !== '') {
  this.currentVital.height = Number(this.currentVital.height);
} else {
  this.currentVital.height = null; // Handle empty values
}


if (this.currentVital.weight !== undefined && this.currentVital.weight !== null && this.currentVital.weight !== '') {
  this.currentVital.weight = Number(this.currentVital.weight);
} else {
  this.currentVital.weight = null;
}

if (this.currentVital.muac !== undefined && this.currentVital.muac !== null && this.currentVital.muac !== '') {
  this.currentVital.muac = Number(this.currentVital.muac);
} else {
  this.currentVital.muac = null;
}

if (this.currentVital.temperature !== undefined && this.currentVital.temperature !== null && this.currentVital.temperature !== '') {
  this.currentVital.temperature = Number(this.currentVital.temperature);
} else {
  this.currentVital.temperature = null;
}

if (this.currentVital.spO2 !== undefined && this.currentVital.spO2 !== null && this.currentVital.spO2 !== '') {
  this.currentVital.spO2 = Number(this.currentVital.spO2);
} else {
  this.currentVital.spO2 = null;
}


if (this.currentVital.pulseRate !== undefined && this.currentVital.pulseRate !== null && this.currentVital.pulseRate !== '') {
  this.currentVital.pulseRate = parseInt(String(this.currentVital.pulseRate), 10);
} else {
  this.currentVital.pulseRate = null;
}

if (this.currentVital.systolic !== undefined && this.currentVital.systolic !== null && this.currentVital.systolic !== '') {
  this.currentVital.systolic = Number(this.currentVital.systolic);
} else {
  this.currentVital.systolic = null;
}

if (this.currentVital.diastolic !== undefined && this.currentVital.diastolic !== null && this.currentVital.diastolic !== '') {
  this.currentVital.diastolic = Number(this.currentVital.diastolic);
} else {
  this.currentVital.diastolic = null;
}

if (this.currentVital.heartRate !== undefined && this.currentVital.heartRate !== null && this.currentVital.heartRate !== '') {
  this.currentVital.heartRate = parseInt(String(this.currentVital.heartRate), 10);
} else {
  this.currentVital.heartRate = null;
}

if (this.currentVital.respiratoryRate !== undefined && this.currentVital.respiratoryRate !== null && this.currentVital.respiratoryRate !== '') {
  this.currentVital.respiratoryRate = parseInt(String(this.currentVital.respiratoryRate), 10);
} else {
  this.currentVital.respiratoryRate = null;
}

if (this.currentVital.timeTaken) {
  this.currentVital.timeTaken = String(this.currentVital.timeTaken).substring(0, 5);
}




    console.log('Converted date taken:', this.currentVital.dateTaken);


    console.log('Editing vital:', this.currentVital);



    // Dropdown or datepicker-specific logic can be added if necessary

    //this.currentClientGroup = item.clientGroupId;  // Update client group dropdown if needed

  }

  deleteClient(id: any) {
    this.api.deleteClientById(id).subscribe(
      (response: any) => {
        console.log("response", response);
  
        // Reload the client list
        this.api.getItems().subscribe((res) => {
          this.productList = res;
          this.data = res;
          this.initializeTableData();
          console.log("Client list reloaded");
        });
  
  
      },
      (error: any) => {
        console.error("Error deleting item", error);
      }
    );
  }





  clearFormShowSaveOtherProcedures(){

    if (this.usersFormOtherProcedure) {
      this.usersFormOtherProcedure.resetForm(); // This will reset all form fields to their default state
    }

    this.isUpdatingOtherProcedure = false; // Enable dropdown for new entries
    this.currentOtherProcedure = "Select a Service"

    //this.currentScanProcedure = "Chose Scan"
    this.saveButtonStatusOtherProcedure = "Save Procedure"
    //this.saveButtonStatus = "Save Client Vitals";
  }

  /** @deprecated Use openServiceRequestModal — kept for any legacy callers. */
  toggleServiceRequestPanel(event?: Event): void {
    if (this.showServiceRequestModal) {
      this.closeServiceRequestModal();
      return;
    }
    this.openServiceRequestModal(event);
  }

  /** @deprecated Use openTreatmentPlanModal — kept for any legacy callers. */
  toggleTreatmentPlanPanel(event?: Event): void {
    if (this.showTreatmentPlanModal) {
      this.closeTreatmentPlanModal();
      return;
    }
    this.openTreatmentPlanModal(event);
  }

  private scrollInlineFormPanelIntoView(panelId: string): void {
    setTimeout(() => {
      document.getElementById(panelId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 0);
  }

  openVitalsModal(): void {
    if (this.showVitalsModal) {
      this.closeVitalsModal();
      return;
    }
    this.clearFormShowSaveClient();
    this.showVitalsModal = true;
    this.isCollapsedNewClient = true;
    this.scrollInlineFormPanelIntoView('pv-vitals-form-panel');
  }

  closeVitalsModal(): void {
    this.showVitalsModal = false;
  }

  openServiceRequestModal(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.showServiceRequestModal) {
      this.closeServiceRequestModal();
      return;
    }
    this.clearFormShowSaveOtherProcedures();
    this.loadRequestedOtherProcedure();
    this.showServiceRequestModal = true;
    this.isCollapsedNewOtherProcedure = true;
    this.scrollInlineFormPanelIntoView('pv-service-request-panel');
  }

  closeServiceRequestModal(): void {
    this.showServiceRequestModal = false;
  }

  openTreatmentPlanModal(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.showTreatmentPlanModal) {
      this.closeTreatmentPlanModal();
      return;
    }
    this.clearFormShowSaveTreatment();
    this.loadDrugList();
    this.showTreatmentPlanModal = true;
    this.isCollapsedTreatment = true;
    this.scrollInlineFormPanelIntoView('pv-treatment-plan-panel');
  }

  closeTreatmentPlanModal(): void {
    this.showTreatmentPlanModal = false;
  }

  openTaxDiscountModal(): void {
    if (this.showTaxDiscountModal) {
      this.closeTaxDiscountModal();
      return;
    }
    this.fetchDiscounts();
    this.showTaxDiscountModal = true;
    this.isCollapsedTaxDiscount = true;
    this.scrollInlineFormPanelIntoView('pv-tax-discount-form-panel');
  }

  closeTaxDiscountModal(): void {
    this.showTaxDiscountModal = false;
  }

  openPaymentModal(): void {
    if (this.showPaymentModal) {
      this.closePaymentModal();
      return;
    }
    this.hideShowPasswordPayment();
    this.fetchDebt();
    this.showPaymentModal = true;
    this.isCollapsedPayment = true;
    this.scrollInlineFormPanelIntoView('pv-payment-form-panel');
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
  }


  clearFormShowSaveScan(){

    if (this.usersFormScan) {
      this.usersFormScan.resetForm(); // This will reset all form fields to their default state
    }

    this.isUpdatingScan = false; // Enable dropdown for new entries
    this.currentScanProcedure = "Chose Scan"

    //this.currentScanProcedure = "Chose Scan"
    this.saveButtonStatusScan = "Save Scan"
    //this.saveButtonStatus = "Save Client Vitals";
  }






  clearFormShowSaveTreatment(){

    if (this.usersFormTreatment) {
      this.usersFormTreatment.resetForm(); // This will reset all form fields to their default state
    }

    this.clearTreatmentForm();

    this.currentItem = 'Choose Treatment'

    this.saveButtonStatusTreatment = "Save Drug"
  }


  clearFormShowSaveLabTest(){

    if (this.usersFormLabTest) {
      this.usersFormLabTest.resetForm(); // This will reset all form fields to their default state
    }

    this.isUpdatingLabTest = false; // Enable dropdown for new entries
    this.currentProcedure = "Chose LabTest"

    this.currentProcedure = "Chose LabTest"
    this.saveButtonStatusLabTest = "Save LabTest"
    //this.saveButtonStatus = "Save Client Vitals";
  }






  clearFormShowSaveClient(){
    this.saveButtonStatus = "Save Vitals";
    this.currentVital = {
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
      dateTaken: null,
      timeTaken: null,
    };
  }

  changeCurrentGroup(clientGroup: any) {
    if (clientGroup && !this.accessControl.canAssignClientToGroup(clientGroup)) {
      alert('You need admin approval to add any client in Veneranda Business group.');
      return;
    }
    if (clientGroup) {
      this.currentClientGroup = clientGroup.groupNameShortForm || clientGroup.groupName || 'Unknown Group';
      this.currentClientGroupId = clientGroup.id || null;
      if (this.editClientFormData) {
        this.editClientFormData.clientGroupId = this.currentClientGroupId;
      }
      console.log('Selected group name:', this.currentClientGroup);
      console.log('Selected group ID:', this.currentClientGroupId);
    } else {
      console.warn('No client group selected');
      this.currentClientGroup = 'Choose Group Name';
    }
  }


  calculateTotal(): number {
    const unitSell = Number(this.itemSellingPrice) || 0;
    const qty = Number(this.currentTreatmentRequested?.quantity) || 0;
    this.totalCostPerItem = qty * unitSell;
    this.currentTreatmentRequested.totalAmount = this.totalCostPerItem;
    return this.totalCostPerItem;
  }

  calculateTotalCost(): void {
    // Calculate TT Cost by summing actual COSTS (not selling prices)
    // TT Cost = Sum of (unitCostPrice * quantity) for services + (unitBuy * quantity) for treatments + consultation fee
    // Reset total to avoid accumulation
    let total = 0;
    let labTestCost = 0;
    let scanCost = 0;
    let otherProcedureCost = 0;
    let treatmentCost = 0;

    // SERVICES: Sum COSTS from lab test procedures (unitCostPrice)
    // Use a Set to track processed items to avoid duplicates
    const processedLabTestIds = new Set();
    if (this.productListProceduresRequested && Array.isArray(this.productListProceduresRequested)) {
      this.productListProceduresRequested.forEach((procedure: any) => {
        // Skip if already processed (avoid duplicates)
        if (procedure.id && processedLabTestIds.has(procedure.id)) {
          return;
        }
        if (procedure.id) {
          processedLabTestIds.add(procedure.id);
        }
        const costPrice = parseFloat(procedure.unitCostPrice?.toString() || '0') || 0;
        const quantity = parseFloat(procedure.quantity?.toString() || '1') || 1;
        const itemTotal = costPrice * quantity;
        labTestCost += itemTotal;
        total += itemTotal;
      });
    }

    // SERVICES: Sum COSTS from scan procedures (unitCostPrice)
    const processedScanIds = new Set();
    if (this.productListUltrasoundScanRequested && Array.isArray(this.productListUltrasoundScanRequested)) {
      this.productListUltrasoundScanRequested.forEach((procedure: any) => {
        // Skip if already processed (avoid duplicates)
        if (procedure.id && processedScanIds.has(procedure.id)) {
          return;
        }
        if (procedure.id) {
          processedScanIds.add(procedure.id);
        }
        const costPrice = parseFloat(procedure.unitCostPrice?.toString() || '0') || 0;
        const quantity = parseFloat(procedure.quantity?.toString() || '1') || 1;
        const itemTotal = costPrice * quantity;
        scanCost += itemTotal;
        total += itemTotal;
      });
    }

    // SERVICES: Sum COSTS from other procedures (unitCostPrice)
    const processedOtherProcedureIds = new Set();
    if (this.otherProceduresRequestedList && Array.isArray(this.otherProceduresRequestedList)) {
      this.otherProceduresRequestedList.forEach((procedure: any) => {
        // Skip if already processed (avoid duplicates)
        if (procedure.id && processedOtherProcedureIds.has(procedure.id)) {
          return;
        }
        if (procedure.id) {
          processedOtherProcedureIds.add(procedure.id);
        }
        const costPrice = parseFloat(procedure.unitCostPrice?.toString() || '0') || 0;
        const quantity = parseFloat(procedure.quantity?.toString() || '1') || 1;
        const itemTotal = costPrice * quantity;
        otherProcedureCost += itemTotal;
        total += itemTotal;
      });
    }

    // TREATMENTS: Sum COSTS from treatment procedures (unitBuy)
    // Only add treatments if there are any treatments requested
    const processedTreatmentIds = new Set();
    const hasTreatments = this.productListTreatmentRequested && 
                         Array.isArray(this.productListTreatmentRequested) && 
                         this.productListTreatmentRequested.length > 0;
    
    if (hasTreatments) {
      this.productListTreatmentRequested.forEach((procedure: any) => {
        // Skip if already processed (avoid duplicates)
        if (procedure.id && processedTreatmentIds.has(procedure.id)) {
          return;
        }
        if (procedure.id) {
          processedTreatmentIds.add(procedure.id);
        }
        const costPrice = parseFloat(procedure.unitBuy?.toString() || '0') || 0;
        const quantity = parseFloat(procedure.quantity?.toString() || '1') || 1;
        const itemTotal = costPrice * quantity;
        treatmentCost += itemTotal;
        total += itemTotal;
      });
    }

    // Add consultation fee (only once)
    const consultation = parseFloat(this.consultationFee?.toString() || '0') || 0;
    total += consultation;
    
    this.totalCost = total.toFixed(2);
    console.log('=== TT Cost Calculation (Actual Costs) ===');
    console.log('Has Treatments:', hasTreatments);
    console.log('Lab Tests Count:', this.productListProceduresRequested?.length || 0, 'Unique:', processedLabTestIds.size);
    console.log('Scans Count:', this.productListUltrasoundScanRequested?.length || 0, 'Unique:', processedScanIds.size);
    console.log('Other Procedures Count:', this.otherProceduresRequestedList?.length || 0, 'Unique:', processedOtherProcedureIds.size);
    console.log('Treatments Count:', this.productListTreatmentRequested?.length || 0, 'Unique:', processedTreatmentIds.size);
    console.log('Consultation Fee:', consultation);
    console.log('Lab Tests Cost (unitCostPrice * qty):', labTestCost.toFixed(2));
    console.log('Scans Cost (unitCostPrice * qty):', scanCost.toFixed(2));
    console.log('Other Procedures Cost (unitCostPrice * qty):', otherProcedureCost.toFixed(2));
    if (hasTreatments) {
      console.log('Treatments Cost (unitBuy * qty):', treatmentCost.toFixed(2));
    } else {
      console.log('Treatments Cost: 0.00 (no treatments requested)');
    }
    console.log('TT Cost (Total of all costs):', this.totalCost);
    console.log('Invoice Subtotal (from backend - likely selling prices):', this.invoiceSubtotal);
  }



returnUnitCost(): number {
  return Number(this.itemSellingPrice) || 0;
}

  /** Prefer unit sell models whose name contains "compassion" for Compassion-group clients. */
  get unitSellingModelNameKeyword(): string | null {
    const groupId = this.currentClientGroupId;
    const group =
      groupId != null
        ? (this.clientGroupList || []).find((g: any) => Number(g?.id) === Number(groupId))
        : (this.clientGroupList || []).find(
            (g: any) =>
              String(g?.groupNameShortForm || '').trim().toLowerCase() ===
                String(this.clientGroupName || this.currentClientGroup || '').trim().toLowerCase() ||
              String(g?.groupName || '').trim().toLowerCase() ===
                String(this.clientGroupName || this.currentClientGroup || '').trim().toLowerCase()
          );
    const fallback = this.clientGroupName || this.currentClientGroup;
    return clientGroupUsesCompassionPricing(group, fallback) ? 'compassion' : null;
  }

  private pickPvUnitSellingModel(models: any[], preferredModelId: any): any | null {
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



  togglePharmacyDrugDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isUpdatingTreatment) {
      return;
    }
    if (this.isDropdownOpen) {
      this.closePharmacyDrugDropdown();
      return;
    }
    this.openDropdown();
  }

  /** Pick a pharmacy treatment item — close dropdown, then pre-fill form fields. */
  selectPharmacyBatch(item: any, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!item) {
      return;
    }
    const isStockBatchItem = item._stockBatchId != null || item.batchLabel;
    if (isStockBatchItem && Number(item.stockAtHand ?? 0) <= 0) {
      return;
    }
    this.isDropdownOpen = false;
    this.resetTreatmentDrugSearch();
    this.changeCurrentItem(item);
  }

  onPharmacyDrugSearchChange(): void {
    // filteredItemList() reacts to treatmentDrugSearchText directly.
  }

  private resetTreatmentDrugSearch(): void {
    this.treatmentDrugSearchText = '';
  }

  onTreatmentDrugSearchFocus(): void {
    if (String(this.treatmentDrugSearchText ?? '').trim() === '0') {
      this.resetTreatmentDrugSearch();
    }
  }

  private closePharmacyDrugDropdown(): void {
    this.isDropdownOpen = false;
  }

  onPvUnitSellingModelPriceChange(price: number): void {
    if (!this.pvUseUnitSellingModelPicker) {
      return;
    }
    const next = Number(price) || 0;
    if (next <= 0 && (Number(this.itemSellingPrice) || 0) > 0) {
      return;
    }
    this.applyUnitSellingModelPrice(next);
  }

  /** Resolve stock item id for unit-selling-model API (shop products may map via batch cache). */
  private resolveUnitSellingStockItemId(item: any): number | null {
    const direct = Number(item?.stockItemId);
    if (Number.isFinite(direct) && direct > 0) {
      return direct;
    }
    if (item?._stockBatchId != null || item?.batchLabel) {
      const fromBatch = this.stockItemIdFromBatch(item);
      if (fromBatch != null && fromBatch > 0) {
        return fromBatch;
      }
    }
    const title = String(item?.title ?? item?.stockItemName ?? item?.itemName ?? '')
      .trim()
      .toLowerCase();
    if (title && this.allStockBatchesCache.length) {
      const match = this.allStockBatchesCache.find((batch) => {
        const name = String(batch?.stockItemName ?? batch?.title ?? '')
          .trim()
          .toLowerCase();
        return name === title;
      });
      const fromMatch = match ? this.stockItemIdFromBatch(match) : null;
      if (fromMatch != null && fromMatch > 0) {
        return fromMatch;
      }
    }
    const fallback = Number(item?.id ?? item?.itemId);
    return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
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

  /** Show unit sell model picker when models exist; otherwise use item selling price. */
  private refreshPvUnitSellingMode(item: any): void {
    const preferredModelId =
      item?.unitSellingModelId ?? item?.unit_selling_model_id ?? null;
    const directPrice = this.resolveDirectUnitSellPrice(item);

    if (!this.pharmacyUseStockBatch) {
      const shopItemId = Number(item?.id ?? item?.itemId ?? this.currentItemId);
      this.pvUnitSellingStockItemId = null;
      if (!Number.isFinite(shopItemId) || shopItemId <= 0) {
        this.pvUseUnitSellingModelPicker = false;
        this.selectedUnitSellingModelId = null;
        this.itemSellingPrice = directPrice;
        this.calculateTotal();
        return;
      }
      this.pvUseUnitSellingModelPicker = true;
      this.api.getShopItemUnitSellingModels(shopItemId, this.unitBuy).subscribe({
        next: (rows) => {
          const models = Array.isArray(rows) ? rows : [];
          if (!models.length) {
            this.selectedUnitSellingModelId = null;
            this.itemSellingPrice = directPrice;
            this.calculateTotal();
            return;
          }
          let selected = this.pickPvUnitSellingModel(models, preferredModelId);
          this.selectedUnitSellingModelId = selected?.id ?? null;
          this.itemSellingPrice = Number(selected?.unitSellingPrice) || directPrice;
          this.calculateTotal();
        },
        error: () => {
          this.selectedUnitSellingModelId = null;
          this.itemSellingPrice = directPrice;
          this.calculateTotal();
        },
      });
      return;
    }

    const stockItemId = this.resolveUnitSellingStockItemId(item);
    this.pvUnitSellingStockItemId = stockItemId;

    if (stockItemId == null) {
      this.pvUseUnitSellingModelPicker = false;
      this.selectedUnitSellingModelId = null;
      this.itemSellingPrice = directPrice;
      this.calculateTotal();
      return;
    }

    this.api.getUnitSellingModels(stockItemId, this.unitBuy).subscribe({
      next: (rows) => {
        const models = Array.isArray(rows) ? rows : [];
        const hasModels = models.length > 0;
        this.pvUseUnitSellingModelPicker = hasModels;

        if (!hasModels) {
          this.selectedUnitSellingModelId = null;
          this.itemSellingPrice = directPrice;
          this.calculateTotal();
          return;
        }

        let selected = this.pickPvUnitSellingModel(models, preferredModelId);
        this.selectedUnitSellingModelId = selected?.id ?? null;
        this.itemSellingPrice =
          Number(selected?.unitSellingPrice) || directPrice;
        this.calculateTotal();
      },
      error: () => {
        this.pvUseUnitSellingModelPicker = false;
        this.selectedUnitSellingModelId = null;
        this.itemSellingPrice = directPrice;
        this.calculateTotal();
      },
    });
  }

  onPvServiceUnitSellingModelPriceChange(price: number): void {
    this.currentScanProcedureRequestedUnitSellingPrice = Number(price) || 0;
  }

  private applyUnitSellingModelPrice(price: number): void {
    this.itemSellingPrice = Number(price) || 0;
    this.calculateTotal();
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

  changeCurrentItem(item: any) {
    if (!item) {
      console.warn('No item selected');
      this.currentItem = 'Choose Treatment';
      this.currentItemFullLabel = '';
      this.currentStockBatchId = null;
      this.pvUseUnitSellingModelPicker = false;
      this.pvUnitSellingStockItemId = null;
      this.resetStockDistributionLabels();
      return;
    }

    const isStockBatchItem = item._stockBatchId != null || item.batchLabel;
    if (!isStockBatchItem) {
      this.availableQuantity = Number(item.stockAtHand) || 0;
      this.unitBuy = Number(item.costPrice) || 0;
      this.unitOfMeasure = item.uintOfMeasure || item.unitOfMeasure || '';
      this.currentItemFullLabel = item.title || '';
      this.currentItem = item.title || 'Unknown Treatment';
      this.currentItemId = item.id ?? null;
      this.currentStockBatchId = null;
      this.lastUnitValue = Number(item.lastUnitValue) > 0 ? Number(item.lastUnitValue) : 1;
      if (!this.currentTreatmentRequested.quantity || this.currentTreatmentRequested.quantity <= 0) {
        this.currentTreatmentRequested.quantity = 1;
      }
      this.applyItemPrescribingPrefill(item);
      this.refreshPvUnitSellingMode(item);
      this.calculateNoOfUnits();
      return;
    }

    if (Number(item.stockAtHand ?? 0) <= 0) {
      return;
    }
    this.availableQuantity = Number(item.stockAtHand) || 0;
    this.unitBuy = Number(item.costPrice) || 0;
    this.unitOfMeasure = item.uintOfMeasure || item.unitOfMeasure || '';
    this.currentItemFullLabel = item.title || '';
    const drugName = item.plainName || this.plainDrugName(item) || 'Unknown Treatment';
    const storePart = item.storeName ? ` · ${item.storeName}` : '';
    const expiryPart = item.expiryLabel ? ` · EX ${item.expiryLabel}` : '';
    this.currentItem = item.batchLabel
      ? `${drugName} — ${item.batchLabel}${expiryPart}${storePart}`
      : drugName;
    this.currentItemId = item.stockItemId ?? item.id ?? null;
    this.currentStockBatchId =
      item._stockBatchId != null && item._stockBatchId !== ''
        ? item._stockBatchId
        : null;
    this.lastUnitValue = Number(item.lastUnitValue) > 0 ? Number(item.lastUnitValue) : 1;
    if (!this.currentTreatmentRequested.quantity || this.currentTreatmentRequested.quantity <= 0) {
      this.currentTreatmentRequested.quantity = 1;
    }
    this.updateStockDistributionForItem(this.currentItemId);
    this.applyItemPrescribingPrefill(item);
    this.refreshPvUnitSellingMode(item);
  }






  private applyItemPrescribingPrefill(item: any): void {
    const recalc = () => {
      this.calculateNoOfUnits();
      this.calculateTotalQty();
      this.calculateTotal();
    };
    if (!this.currentTreatmentRequested.quantity || this.currentTreatmentRequested.quantity <= 0) {
      this.currentTreatmentRequested.quantity = 1;
    }
    applyPrescribingPrefillToTreatmentForm(this.currentTreatmentRequested, item);
    recalc();

    const stockItemId = Number(item?.stockItemId ?? item?.id);
    if (!Number.isFinite(stockItemId) || stockItemId <= 0) {
      return;
    }
    const cached = this.stockItemPrefillCache.get(stockItemId);
    if (cached) {
      applyPrescribingPrefillToTreatmentForm(this.currentTreatmentRequested, {
        ...item,
        ...cached,
      });
      recalc();
      return;
    }
    this.api.getStockItemById(stockItemId).subscribe({
      next: (data) => {
        if (data) {
          this.stockItemPrefillCache.set(stockItemId, data);
        }
        applyPrescribingPrefillToTreatmentForm(this.currentTreatmentRequested, {
          ...item,
          ...(data ?? {}),
        });
        recalc();
      },
      error: () => recalc(),
    });
  }

  openStandardDosageModal(): void {
    const stockItemId = Number(this.currentItemId);
    if (!Number.isFinite(stockItemId) || stockItemId <= 0) {
      this.standardDosageMessage = 'Select a drug first to see standard dosage options.';
      this.standardDosageOptions = [];
      this.showStandardDosageModal = true;
      return;
    }

    this.showStandardDosageModal = true;
    this.standardDosageOptions = [];
    this.standardDosageMessage = 'Loading standard dosage rules...';
    const cachedRules = this.stockItemDosageRuleCache.get(stockItemId);
    if (cachedRules) {
      this.applyStandardDosageRulesOrFallback(cachedRules);
      return;
    }

    this.isLoadingStandardDosageRules = true;
    this.api.getStockItemDosageRules(stockItemId).subscribe({
      next: (rules) => {
        const activeRules = Array.isArray(rules) ? rules : [];
        this.stockItemDosageRuleCache.set(stockItemId, activeRules);
        this.applyStandardDosageRulesOrFallback(activeRules);
        this.isLoadingStandardDosageRules = false;
      },
      error: () => {
        this.standardDosageOptions = this.buildStandardDosageOptions();
        this.standardDosageMessage = this.standardDosageOptions.length
          ? ''
          : 'No standard dosage preset has been prepared for this drug yet. Use the manual fields for now.';
        this.isLoadingStandardDosageRules = false;
      },
    });
  }

  closeStandardDosageModal(): void {
    this.showStandardDosageModal = false;
    this.showStandardDosageRecordWeightModal = false;
    this.standardDosageRecordWeightError = '';
    this.standardDosageRecordedWeightKg = null;
  }

  showStandardDosageRecordWeightButton(): boolean {
    return this.currentClientWeightKg() == null && Number(this.visitId) > 0;
  }

  openStandardDosageRecordWeightDialog(): void {
    if (!this.showStandardDosageRecordWeightButton()) {
      return;
    }
    this.standardDosageRecordWeightValue = null;
    this.standardDosageRecordWeightError = '';
    this.showStandardDosageRecordWeightModal = true;
  }

  closeStandardDosageRecordWeightDialog(): void {
    if (this.standardDosageRecordWeightSaving) {
      return;
    }
    this.showStandardDosageRecordWeightModal = false;
    this.standardDosageRecordWeightError = '';
  }

  saveStandardDosageRecordedWeight(): void {
    const visitId = Number(this.visitId);
    const weight = Number(this.standardDosageRecordWeightValue);
    if (!Number.isFinite(visitId) || visitId <= 0) {
      this.standardDosageRecordWeightError = 'Visit is required to save weight.';
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      this.standardDosageRecordWeightError = 'Enter a valid weight in kg.';
      return;
    }

    this.standardDosageRecordWeightSaving = true;
    this.standardDosageRecordWeightError = '';
    this.clientWeightVitals.saveWeightForVisit(visitId, weight).subscribe({
      next: (savedWeight) => {
        this.standardDosageRecordWeightSaving = false;
        this.showStandardDosageRecordWeightModal = false;
        this.standardDosageRecordedWeightKg = savedWeight;
        this.weight = savedWeight;
        this.getInitialVitalsSeparately();
        this.reloadStandardDosageOptionsAfterWeightSaved();
      },
      error: () => {
        this.standardDosageRecordWeightSaving = false;
        this.standardDosageRecordWeightError = 'Could not save weight. Try again.';
      },
    });
  }

  private reloadStandardDosageOptionsAfterWeightSaved(): void {
    const stockItemId = Number(this.currentItemId);
    if (!Number.isFinite(stockItemId) || stockItemId <= 0) {
      return;
    }
    const cachedRules = this.stockItemDosageRuleCache.get(stockItemId);
    if (cachedRules) {
      this.applyStandardDosageRulesOrFallback(cachedRules);
      return;
    }
    this.isLoadingStandardDosageRules = true;
    this.api.getStockItemDosageRules(stockItemId).subscribe({
      next: (rules) => {
        const activeRules = Array.isArray(rules) ? rules : [];
        this.stockItemDosageRuleCache.set(stockItemId, activeRules);
        this.applyStandardDosageRulesOrFallback(activeRules);
        this.isLoadingStandardDosageRules = false;
      },
      error: () => {
        this.standardDosageOptions = this.buildStandardDosageOptions();
        this.isLoadingStandardDosageRules = false;
      },
    });
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
    this.closeStandardDosageModal();
  }

  selectedStandardDosageClientSummary(): string {
    const age = this.currentClientAgeYears();
    const weight = this.currentClientWeightKg();
    const ageLabel = age != null ? `${age} years` : 'Age not recorded';
    const weightLabel = weight != null ? `${weight} kg` : 'Weight not recorded';
    return `${ageLabel} | ${weightLabel}`;
  }

  private applyStandardDosageRulesOrFallback(rules: StockDosageRule[]): void {
    const dbOptions = rules
      .filter((rule) => rule && rule.active !== false)
      .map((rule) => this.createStandardDosageOptionFromRule(rule))
      .filter((option): option is StandardDosageOption => !!option);

    if (dbOptions.length) {
      this.standardDosageOptions = dbOptions;
      this.standardDosageMessage = '';
      return;
    }

    this.standardDosageOptions = this.buildStandardDosageOptions();
    this.standardDosageMessage = this.standardDosageOptions.length
      ? ''
      : 'No standard dosage preset has been prepared for this drug yet. Use the manual fields for now.';
  }

  private createStandardDosageOptionFromRule(rule: StockDosageRule): StandardDosageOption | null {
    const age = this.currentClientAgeYears();
    const weight = this.currentClientWeightKg();
    if (!this.clientMatchesDosageRule(rule, age, weight)) {
      return null;
    }

    const frequencyValue = this.positiveNumber(rule.frequencyValue, 1);
    const durationValue = this.positiveNumber(rule.durationValue, 1);
    const frequencyUnit = this.positiveInteger(rule.frequencyUnit, 1);
    const durationUnit = this.positiveInteger(rule.durationUnit, 1);
    const doseUnit = normalizeDosageUnitForSelect(
      rule.fixedDoseUnit || rule.weightDoseUnit || this.currentTreatmentRequested?.amountPerFrequencyUnit || this.unitOfMeasure || 'unit(s)'
    );
    const doseResult = this.resolveRuleDose(rule, weight, frequencyValue, doseUnit);
    const totalUnits = this.lastUnitValue > 0 ? doseResult.value / this.lastUnitValue : 1;
    const quantity = this.lastUnitValue > 0
      ? (frequencyValue * durationValue * doseResult.value) / this.lastUnitValue
      : frequencyValue * durationValue;
    const matchLabel = rule.matchLabel || this.buildRuleMatchLabel(rule, age, weight);
    const specialSchedule = String(rule.specialScheduleText || '').trim();
    const instructions = [rule.instructions, specialSchedule].filter(Boolean).join(' ');

    return {
      title: rule.title || 'Standard dose',
      matchLabel,
      ruleLabel: rule.ruleLabel || this.buildRuleLabel(rule, doseUnit),
      calculatedDoseLabel: doseResult.label,
      doseValue: doseResult.value,
      doseUnit,
      frequencyValue,
      frequencyUnit,
      durationValue,
      durationUnit,
      route: rule.route || this.currentTreatmentRequested?.route || 'Oral',
      quantity,
      totalUnits,
      instructions: instructions || 'Use this dosage rule, then adjust any treatment fields as needed.',
      warning: doseResult.warning || rule.warning || undefined,
    };
  }

  private resolveRuleDose(
    rule: StockDosageRule,
    weight: number | null,
    frequencyValue: number,
    doseUnit: string
  ): { value: number; label: string; warning?: string } {
    const calculationType = String(rule.doseCalculationType || '').toUpperCase();
    const fixedDose = this.positiveNumber(rule.fixedDoseValue, this.selectedItemStrengthValue(this.lastUnitValue || 1));
    const weightDose = this.positiveNumber(rule.weightDoseValue, 0);

    if ((calculationType === 'WEIGHT_PER_DOSE' || calculationType === 'WEIGHT_PER_DAY') && weightDose > 0) {
      if (weight == null) {
        return {
          value: fixedDose,
          label: 'Record client weight to calculate exact dose',
          warning: rule.warning || 'Weight is missing, so this rule is only a manual placeholder.',
        };
      }

      const rawDose = calculationType === 'WEIGHT_PER_DAY'
        ? (weight * weightDose) / Math.max(frequencyValue, 1)
        : weight * weightDose;
      const maxDose = this.positiveNumber(rule.maxDoseValue, 0);
      const dose = maxDose > 0 ? Math.min(rawDose, maxDose) : rawDose;
      const cappedLabel = maxDose > 0 && rawDose > maxDose ? `, capped at ${maxDose} ${rule.maxDoseUnit || doseUnit}` : '';
      return {
        value: this.roundToOne(dose),
        label: `${this.roundToOne(rawDose)} ${doseUnit} calculated from ${weight} kg${cappedLabel}`,
      };
    }

    return {
      value: fixedDose,
      label: `${fixedDose} ${doseUnit} per dose`,
    };
  }

  private clientMatchesDosageRule(rule: StockDosageRule, age: number | null, weight: number | null): boolean {
    if (age != null) {
      const minAge = this.optionalNumber(rule.minAgeYears);
      const maxAge = this.optionalNumber(rule.maxAgeYears);
      if (minAge != null && age < minAge) {
        return false;
      }
      if (maxAge != null && age > maxAge) {
        return false;
      }
    }

    if (weight != null) {
      const minWeight = this.optionalNumber(rule.minWeightKg);
      const maxWeight = this.optionalNumber(rule.maxWeightKg);
      if (minWeight != null && weight < minWeight) {
        return false;
      }
      if (maxWeight != null && weight > maxWeight) {
        return false;
      }
    }

    return true;
  }

  private buildRuleMatchLabel(rule: StockDosageRule, age: number | null, weight: number | null): string {
    const labels: string[] = [];
    if (rule.minAgeYears != null || rule.maxAgeYears != null) {
      labels.push(`Age ${rule.minAgeYears ?? '0'}-${rule.maxAgeYears ?? '+'} years`);
    }
    if (rule.minWeightKg != null || rule.maxWeightKg != null) {
      labels.push(`Weight ${rule.minWeightKg ?? '0'}-${rule.maxWeightKg ?? '+'} kg`);
    }
    if (!labels.length) {
      labels.push(this.selectedStandardDosageClientSummary());
    } else if (age == null || weight == null) {
      labels.push('confirm missing age/weight if relevant');
    }
    return labels.join(' | ');
  }

  private buildRuleLabel(rule: StockDosageRule, doseUnit: string): string {
    const calculationType = String(rule.doseCalculationType || '').toUpperCase();
    if (calculationType === 'WEIGHT_PER_DOSE' && rule.weightDoseValue != null) {
      return `${rule.weightDoseValue} ${doseUnit}/kg per dose`;
    }
    if (calculationType === 'WEIGHT_PER_DAY' && rule.weightDoseValue != null) {
      return `${rule.weightDoseValue} ${doseUnit}/kg per day`;
    }
    return `${rule.fixedDoseValue ?? this.selectedItemStrengthValue(this.lastUnitValue || 1)} ${doseUnit} per dose`;
  }

  private positiveNumber(value: any, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  private positiveInteger(value: any, fallback: number): number {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : fallback;
  }

  private optionalNumber(value: any): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private buildStandardDosageOptions(): StandardDosageOption[] {
    const drugName = String(this.currentItem || this.currentItemFullLabel || '').toLowerCase();
    if (drugName.includes('artesunate')) {
      return this.buildArtesunateDosageOptions();
    }
    if (
      drugName.includes('pcm') ||
      drugName.includes('paracetamol') ||
      drugName.includes('acetaminophen')
    ) {
      return this.buildPcmDosageOptions();
    }
    return this.buildCommonFrequencyOptions();
  }

  private buildPcmDosageOptions(): StandardDosageOption[] {
    const age = this.currentClientAgeYears();
    const weight = this.currentClientWeightKg();
    const isChild = (age != null && age < 12) || (weight != null && weight < 40);
    const tabletStrength = this.selectedItemStrengthValue(500);
    const options: StandardDosageOption[] = [];

    if (!isChild) {
      options.push(
        this.createStandardDosageOption({
          title: 'Standard adult dose',
          matchLabel: 'Adult / >= 40 kg',
          ruleLabel: 'PCM oral tab 500 mg: 1 tablet per dose',
          calculatedDoseLabel: '500 mg = 1 tablet',
          doseValue: tabletStrength,
          doseUnit: 'mg(s)',
          frequencyValue: 4,
          durationValue: 3,
          route: 'Oral',
          quantity: 12,
          instructions: 'Take 1 tablet every 6 hours when needed. Do not exceed 4 g per day.',
        }),
        this.createStandardDosageOption({
          title: 'Higher adult dose',
          matchLabel: 'Adult / severe pain or fever',
          ruleLabel: 'PCM oral tab 500 mg: 2 tablets per dose',
          calculatedDoseLabel: '1000 mg = 2 tablets',
          doseValue: tabletStrength * 2,
          doseUnit: 'mg(s)',
          frequencyValue: 3,
          durationValue: 3,
          route: 'Oral',
          quantity: 18,
          instructions: 'Take 2 tablets every 8 hours when needed. Do not exceed 4 g per day.',
        })
      );
      return options;
    }

    if (weight == null) {
      options.push(
        this.createStandardDosageOption({
          title: 'Child dose needs weight',
          matchLabel: 'Child client',
          ruleLabel: 'PCM: 10-15 mg/kg per dose',
          calculatedDoseLabel: 'Record weight to calculate dose',
          doseValue: tabletStrength,
          doseUnit: 'mg(s)',
          frequencyValue: 4,
          durationValue: 3,
          route: 'Oral',
          quantity: 12,
          instructions: 'Confirm client weight before using a tablet dose.',
          warning: 'Weight is missing, so this is only a manual placeholder.',
        })
      );
      return options;
    }

    [10, 15].forEach((mgPerKg) => {
      const calculatedDose = weight * mgPerKg;
      const tabletFraction = this.roundToHalf(calculatedDose / tabletStrength);
      const actualDose = tabletFraction * tabletStrength;
      const totalTabs = tabletFraction * 4 * 3;
      options.push(
        this.createStandardDosageOption({
          title: `${mgPerKg} mg/kg child dose`,
          matchLabel: `Child / ${weight} kg`,
          ruleLabel: `PCM: ${mgPerKg} mg/kg per dose`,
          calculatedDoseLabel: `${this.roundToOne(calculatedDose)} mg calculated, ${this.formatTabletQuantity(tabletFraction)} tablet = ${actualDose} mg`,
          doseValue: actualDose,
          doseUnit: 'mg(s)',
          frequencyValue: 4,
          durationValue: 3,
          route: 'Oral',
          quantity: totalTabs,
          instructions: `Give ${this.formatTabletQuantity(tabletFraction)} PCM 500 mg tablet every 6 hours when needed.`,
          warning: tabletFraction === 0.5 || tabletFraction === 1
            ? undefined
            : 'Check if this tablet fraction is practical; syrup or dispersible PCM may be better.',
        })
      );
    });
    return options;
  }

  private buildArtesunateDosageOptions(): StandardDosageOption[] {
    const weight = this.currentClientWeightKg();
    const vialStrength = this.selectedItemStrengthValue(60);
    if (weight == null) {
      return [
        this.createStandardDosageOption({
          title: 'Weight required',
          matchLabel: 'Artesunate IV dosing',
          ruleLabel: '2.4 mg/kg per dose',
          calculatedDoseLabel: 'Record client weight to calculate exact dose',
          doseValue: vialStrength,
          doseUnit: 'mg(s)',
          frequencyValue: 3,
          durationValue: 1,
          route: 'IV',
          quantity: 3,
          instructions: 'Confirm weight, then give at 0, 12 and 24 hours as per protocol.',
          warning: 'Weight is missing, so this should not be used as an automatic calculated dose.',
        }),
      ];
    }

    const dose = this.roundToOne(weight * 2.4);
    const vialsPerDose = Math.ceil(dose / vialStrength);
    const totalVials = vialsPerDose * 3;
    return [
      this.createStandardDosageOption({
        title: 'Initial severe malaria schedule',
        matchLabel: `${weight} kg client`,
        ruleLabel: 'Artesunate IV: 2.4 mg/kg at 0, 12 and 24 hours',
        calculatedDoseLabel: `${dose} mg per dose; use ${vialsPerDose} vial(s) of ${vialStrength} mg per dose`,
        doseValue: dose,
        doseUnit: 'mg(s)',
        frequencyValue: 3,
        durationValue: 1,
        route: 'IV',
        quantity: totalVials,
        instructions: `Give ${dose} mg IV at 0, 12 and 24 hours. Reconstitute per protocol; ${totalVials} vial(s) cover the first 3 doses.`,
      }),
    ];
  }

  private buildCommonFrequencyOptions(): StandardDosageOption[] {
    const unitValue = this.selectedItemStrengthValue(this.lastUnitValue || 1);
    const unit = normalizeDosageUnitForSelect(
      this.currentTreatmentRequested?.amountPerFrequencyUnit || this.unitOfMeasure || 'unit(s)'
    );
    return [
      this.createStandardDosageOption({
        title: 'Once daily',
        matchLabel: 'Common frequency',
        ruleLabel: '1 dose per day',
        calculatedDoseLabel: `${unitValue} ${unit} per dose`,
        doseValue: unitValue,
        doseUnit: unit,
        frequencyValue: 1,
        durationValue: 3,
        route: this.currentTreatmentRequested?.route || 'Oral',
        quantity: 3,
        instructions: 'Take once daily.',
      }),
      this.createStandardDosageOption({
        title: 'Twice daily',
        matchLabel: 'Common frequency',
        ruleLabel: '2 doses per day',
        calculatedDoseLabel: `${unitValue} ${unit} per dose`,
        doseValue: unitValue,
        doseUnit: unit,
        frequencyValue: 2,
        durationValue: 3,
        route: this.currentTreatmentRequested?.route || 'Oral',
        quantity: 6,
        instructions: 'Take twice daily.',
      }),
      this.createStandardDosageOption({
        title: 'Three times daily',
        matchLabel: 'Common frequency',
        ruleLabel: '3 doses per day',
        calculatedDoseLabel: `${unitValue} ${unit} per dose`,
        doseValue: unitValue,
        doseUnit: unit,
        frequencyValue: 3,
        durationValue: 3,
        route: this.currentTreatmentRequested?.route || 'Oral',
        quantity: 9,
        instructions: 'Take three times daily.',
      }),
    ];
  }

  private createStandardDosageOption(option: Omit<StandardDosageOption, 'frequencyUnit' | 'durationUnit' | 'totalUnits'>): StandardDosageOption {
    return {
      ...option,
      frequencyUnit: 1,
      durationUnit: 1,
      totalUnits: option.frequencyValue * option.durationValue,
    };
  }

  private currentClientWeightKg(): number | null {
    if (this.standardDosageRecordedWeightKg != null) {
      return this.standardDosageRecordedWeightKg;
    }
    const values = [
      this.latestVitalWeightFromList(this.productListInitialVitals),
      this.latestVitalWeightFromList(this.initialTriageVitals),
      this.currentVital?.weight,
      this.weight,
    ];
    for (const value of values) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) {
        return this.roundToOne(n);
      }
    }
    return null;
  }

  private latestVitalWeightFromList(vitals: any[] | null | undefined): number | null {
    const candidates = (Array.isArray(vitals) ? vitals : [])
      .map((vital) => ({
        weight: Number(vital?.weight),
        timestamp: this.vitalTimestamp(vital),
        id: Number(vital?.id),
      }))
      .filter((vital) => Number.isFinite(vital.weight) && vital.weight > 0);

    if (!candidates.length) {
      return null;
    }

    candidates.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return b.timestamp - a.timestamp;
      }
      return (Number.isFinite(b.id) ? b.id : 0) - (Number.isFinite(a.id) ? a.id : 0);
    });

    return this.roundToOne(candidates[0].weight);
  }

  private vitalTimestamp(vital: any): number {
    const dateValue = String(vital?.dateTaken || '').trim();
    const timeValue = String(vital?.timeTaken || '').trim();
    const combined = [dateValue, timeValue].filter(Boolean).join('T');
    const parsed = combined ? Date.parse(combined) : NaN;
    if (Number.isFinite(parsed)) {
      return parsed;
    }

    const fallback = Date.parse(String(vital?.createdAt || vital?.createdDate || vital?.dateCreated || ''));
    return Number.isFinite(fallback) ? fallback : 0;
  }

  private currentClientAgeYears(): number | null {
    const directAge = Number(this.clientAge);
    if (Number.isFinite(directAge) && directAge > 0) {
      return this.roundToOne(directAge);
    }
    const dobValue = this.clientDateOfBirth ? new Date(this.clientDateOfBirth) : null;
    if (!dobValue || Number.isNaN(dobValue.getTime())) {
      return null;
    }
    const today = new Date();
    let age = today.getFullYear() - dobValue.getFullYear();
    const hasNotHadBirthday =
      today.getMonth() < dobValue.getMonth() ||
      (today.getMonth() === dobValue.getMonth() && today.getDate() < dobValue.getDate());
    if (hasNotHadBirthday) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  }

  private selectedItemStrengthValue(fallback: number): number {
    const currentDose = Number(this.currentTreatmentRequested?.amountPerFrequencyValue);
    if (Number.isFinite(currentDose) && currentDose > 0) {
      return currentDose;
    }
    const strength = Number(this.lastUnitValue);
    if (Number.isFinite(strength) && strength > 0) {
      return strength;
    }
    return fallback;
  }

  private roundToOne(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private roundToHalf(value: number): number {
    return Math.max(0.5, Math.round(value * 2) / 2);
  }

  private formatTabletQuantity(value: number): string {
    if (value === 0.5) return '1/2';
    if (value === 1) return '1';
    if (value === 1.5) return '1 1/2';
    return String(value);
  }

  /** Show inventory unit in the list when it is not one of the standard dropdown values. */
  get customPrefilledDosageUnit(): string {
    const v = String(this.currentTreatmentRequested?.amountPerFrequencyUnit ?? '').trim();
    if (!v || isStandardDosageUnit(v)) {
      return '';
    }
    return v;
  }

  changeCurrentProcedure(procedure: any) {
    if (procedure) {
      this.currentProcedure = procedure.procedureName || 'Unknown procedure';
      this.currentProcedureId = procedure.id || null;
      this.currentScanProcedureRequestedUnitSellingPrice = procedure.unitSellingPrice;
      console.log('Selected procedure name:', this.currentProcedure);
      console.log('Selected procedure ID:', this.currentProcedureId);
      console.log('Selected procedure name:', procedure.procedureName);

    } else {
      console.warn('No procedure selected');
      this.currentProcedure = 'Choose LabTest';
    }
  }

  changeCurrentScanProcedure(procedure: any) {
    if (procedure) {
      this.currentProcedureCategory = procedure.category;
      this.currentScanProcedure = procedure.procedureName || 'Unknown procedure';
      this.currentScanProcedureId = procedure.id || null;
      this.currentScanProcedureRequestedUnitSellingPrice = procedure.unitSellingPrice || null;

      console.log('Selected procedure name:', this.currentScanProcedure);
      console.log('Selected procedure ID:', this.currentScanProcedureId);
      console.log('Selected procedure name:', procedure.procedureName);
      console.log('Selected procedure category assigned:', this.currentProcedureCategory);
      console.log('Selected procedure category:', procedure.category);



    } else {
      console.warn('No Scan procedure selected');
      this.currentScanProcedure = 'Choose Scan';
    }
  }








  changeCurrentOtherProcedure(procedure: any) {
    console.log('Selected procedure:', procedure);
  

    if (procedure) {
      this.currentProcedureCategory = procedure.category;
      this.currentOtherProcedure = procedure.procedureName || 'Unknown procedure';
      this.currentOtherProcedureId = procedure.id || null;
      this.currentServiceProcedureUnitCost =
        procedure.unitCostPrice != null && procedure.unitCostPrice !== ''
          ? Number(procedure.unitCostPrice)
          : null;
      this.refreshServiceUnitSellingMode(procedure);
      console.log('Selected procedure name:', this.currentOtherProcedure);
      console.log('Selected procedure ID:', this.currentOtherProcedureId);
      console.log('Selected procedure name:', procedure.procedureName);
      console.log('Selected procedure category:', this.currentProcedureCategory);


    } else {
      console.warn('No procedure selected');
      this.currentOtherProcedure = 'Choose Procedure';
      this.currentOtherProcedureId = null;
      this.currentServiceProcedureUnitCost = null;
      this.selectedServiceUnitSellingModelId = null;
      this.currentScanProcedureRequestedUnitSellingPrice = 0;
    }
  }

  /** After procedure pick: load unit sell models and prefer Compassion pricing when client group uses it. */
  private refreshServiceUnitSellingMode(procedure: any): void {
    const procedureId = Number(procedure?.id);
    const preferredModelId = procedure?.unitSellingModelId ?? null;
    const directPrice =
      Number(procedure?.unitSellingPrice ?? procedure?.sellingPrice ?? 0) || 0;

    if (!Number.isFinite(procedureId) || procedureId <= 0) {
      this.selectedServiceUnitSellingModelId = null;
      this.currentScanProcedureRequestedUnitSellingPrice = directPrice;
      return;
    }

    this.api
      .getProcedureUnitSellingModels(procedureId, this.currentServiceProcedureUnitCost)
      .subscribe({
        next: (rows) => {
          const models = Array.isArray(rows) ? rows : [];
          if (!models.length) {
            this.selectedServiceUnitSellingModelId = null;
            this.currentScanProcedureRequestedUnitSellingPrice = directPrice;
            return;
          }
          const selected = this.pickPvUnitSellingModel(models, preferredModelId);
          this.selectedServiceUnitSellingModelId = selected?.id ?? null;
          this.currentScanProcedureRequestedUnitSellingPrice =
            Number(selected?.unitSellingPrice) || directPrice;
        },
        error: () => {
          this.selectedServiceUnitSellingModelId = null;
          this.currentScanProcedureRequestedUnitSellingPrice = directPrice;
        },
      });
  }



  loadClientGroups(){
    this.api.getClientGroupList().subscribe((res) => {
      this.clientGroupList = res;
      console.log('group list',this.clientGroupList);
      //console.log(clientId);

    });  }

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

  openQueueClientModal(): void {
    if (!this.clientId) {
      alert('No client loaded. Open a client order first.');
      return;
    }
    this.queueClientError = '';
    this.queueClientClinics = [];
    const schemeName = (this.clientGroupName || this.visit?.visitDefaultScheme || '').toString();
    const matchedGroup = (this.clientGroupList || []).find(
      (g: any) =>
        g?.groupName === schemeName ||
        g?.groupNameShortForm === schemeName
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
    document.body.style.overflow = 'hidden';
  }

  closeQueueClientModal(): void {
    this.showQueueClientModal = false;
    this.queueClientError = '';
    this.queueClientSaving = false;
    document.body.style.overflow = '';
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
        next: (entry: any) => {
          this.queueClientSaving = false;
          if (this.queueClientForm.printQueueTicket && entry?.queueNumber) {
            this.printQueueClientTicket(entry);
          }
          this.closeQueueClientModal();
        },
        error: (err: any) => {
          this.queueClientSaving = false;
          this.queueClientError = err?.error?.message || 'Failed to queue client.';
        },
      });
  }

  private printQueueClientTicket(entry: any): void {
    const w = window.open('', '_blank', 'width=420,height=340');
    if (!w) {
      return;
    }
    w.document.write(`
      <html><head><title>Queue Ticket</title></head>
      <body style="font-family:sans-serif;padding:16px">
        <h2>Queue Ticket</h2>
        <p><strong>${entry.queueNumber || ''}</strong></p>
        <p>${this.clientSecondName || ''} ${this.clientFirstName || ''}</p>
        <p>OP: ${this.clientFileNo || ''}</p>
        <p>To: ${entry.toModuleName || ''}</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  }


    loadRequestedLabTests(){
      this.searchText = "";
      this.api.getLabTestList().subscribe((res) => {
        this.labTestList = res;
        console.log('Lab list',this.labTestList);
        //console.log(clientId);
  
      });  
    }




    private normalizeStockBatchesResponse(res: any): any[] {
      if (Array.isArray(res)) {
        return res;
      }
      if (res && Array.isArray(res.data)) {
        return res.data;
      }
      if (res && res.data) {
        return Array.isArray(res.data) ? res.data : [];
      }
      return [];
    }

    private normalizeStoresResponse(res: any): any[] {
      if (Array.isArray(res)) {
        return res;
      }
      if (res && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    }

    /**
     * Prefer `sessionStorage.pharmacyStoreId`, else store named "Pharmacy",
     * else first store whose name contains "pharmacy".
     */
    private resolvePharmacyStore(stores: any[]): { id: number | null; name: string } {
      const list = Array.isArray(stores) ? stores : [];
      const storeIdOf = (s: any) => s?.id ?? s?.storeId;
      const storeNameOf = (s: any) => String(s?.name ?? '').trim();

      const raw = sessionStorage.getItem('pharmacyStoreId');
      if (raw != null && raw !== '') {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n > 0) {
          const match = list.find((s) => Number(storeIdOf(s)) === n);
          return { id: n, name: match ? storeNameOf(match) : 'Pharmacy' };
        }
      }

      const exact = list.find((s) => storeNameOf(s).toLowerCase() === 'pharmacy');
      if (exact != null) {
        const id = storeIdOf(exact);
        if (id != null && !Number.isNaN(Number(id))) {
          return { id: Number(id), name: storeNameOf(exact) };
        }
      }

      const partial = list.find((s) => /pharmacy/i.test(storeNameOf(s)));
      if (partial != null) {
        const id = storeIdOf(partial);
        if (id != null && !Number.isNaN(Number(id))) {
          return { id: Number(id), name: storeNameOf(partial) };
        }
      }

      return { id: null, name: '' };
    }

    private isStockBatchInPharmacyStore(batch: any): boolean {
      if (this.pharmacyStoreId != null) {
        return Number(batch?.storeId) === this.pharmacyStoreId;
      }
      const name = String(batch?.storeName ?? batch?.store_name ?? '').toLowerCase();
      return name.includes('pharmacy');
    }

    private stockItemIdFromBatch(batch: any): number | null {
      const v =
        batch?.stockItemId ??
        batch?.stockItem?.id ??
        batch?.consumableItemId ??
        batch?.consumableItems?.id ??
        batch?.itemId;
      if (v == null || v === '') {
        return null;
      }
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }

    private batchQtyOnHand(batch: any): number {
      const raw =
        batch?.stockAtHand ??
        batch?.stock_at_hand ??
        batch?.quantityOnHand ??
        batch?.qtyOnHand ??
        0;
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }

    private resetStockDistributionLabels(): void {
      this.stockDistributionTotal = '—';
      this.stockInPharmacy = '—';
      this.stockDistributionByStore = [];
    }

    get showPvStockTransferIcon(): boolean {
      const total = Number(this.stockDistributionTotal);
      const pharmacy = Number(this.stockInPharmacy);
      if (!Number.isFinite(total) || total <= 0) {
        return false;
      }
      return !Number.isFinite(pharmacy) || pharmacy <= 0;
    }

    private resolveStoreDisplayName(storeId: number, batchFallback?: string): string {
      const id = Number(storeId);
      if (Number.isFinite(id) && id > 0 && this.pvStoreList?.length) {
        const store = this.pvStoreList.find(
          (s) => Number(s?.id ?? s?.storeId) === id
        );
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

    private sortStockDistributionRows(
      rows: { storeId: number; storeName: string; quantity: number }[]
    ): { storeId: number; storeName: string; quantity: number }[] {
      const rank = (storeId: number) => {
        if (this.pharmacyStoreId != null && storeId === this.pharmacyStoreId) {
          return 0;
        }
        if (this.centralStoreId != null && storeId === this.centralStoreId) {
          return 1;
        }
        return 2;
      };
      return [...rows].sort((a, b) => {
        const diff = rank(a.storeId) - rank(b.storeId);
        if (diff !== 0) {
          return diff;
        }
        return a.storeName.localeCompare(b.storeName, undefined, { sensitivity: 'base' });
      });
    }

    /** Totals for the chosen stock item across every store that holds it. */
    private aggregateStockByStoreForItem(
      stockItemId: number | null
    ): { storeId: number; storeName: string; quantity: number }[] {
      if (stockItemId == null || !this.allStockBatchesCache.length) {
        return [];
      }

      const byStore = new Map<number, { storeId: number; storeName: string; quantity: number }>();
      for (const batch of this.allStockBatchesCache) {
        if (Number(this.stockItemIdFromBatch(batch)) !== Number(stockItemId)) {
          continue;
        }
        const qty = this.batchQtyOnHand(batch);
        if (qty <= 0) {
          continue;
        }
        const storeId = Number(batch?.storeId ?? batch?.store_id ?? 0);
        if (!Number.isFinite(storeId) || storeId <= 0) {
          continue;
        }
        const existing = byStore.get(storeId);
        if (existing) {
          existing.quantity += qty;
        } else {
          byStore.set(storeId, {
            storeId,
            storeName: this.resolveStoreDisplayName(
              storeId,
              batch?.storeName ?? batch?.store_name
            ),
            quantity: qty,
          });
        }
      }

      return this.sortStockDistributionRows(Array.from(byStore.values()));
    }

    private updateStockDistributionForItem(stockItemId: number | null): void {
      const rows = this.aggregateStockByStoreForItem(stockItemId);
      if (!rows.length) {
        this.resetStockDistributionLabels();
        return;
      }

      const total = rows.reduce((sum, row) => sum + row.quantity, 0);
      const pharmacyRow =
        this.pharmacyStoreId != null
          ? rows.find((row) => row.storeId === this.pharmacyStoreId)
          : undefined;

      this.stockDistributionTotal = total;
      this.stockDistributionByStore = rows;
      this.stockInPharmacy = pharmacyRow?.quantity ?? 0;
    }

    private resolveCentralStore(stores: any[]): { id: number | null; name: string } {
      const list = Array.isArray(stores) ? stores : [];
      const storeIdOf = (s: any) => s?.id ?? s?.storeId;
      const storeNameOf = (s: any) => String(s?.name ?? '').trim();

      const raw = sessionStorage.getItem('centralStoreId');
      if (raw != null && raw !== '') {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n > 0) {
          const match = list.find((s) => Number(storeIdOf(s)) === n);
          return { id: n, name: match ? storeNameOf(match) : 'Central store' };
        }
      }

      const exact = list.find((s) => /central\s*store/i.test(storeNameOf(s)));
      if (exact != null) {
        const id = storeIdOf(exact);
        if (id != null && !Number.isNaN(Number(id))) {
          return { id: Number(id), name: storeNameOf(exact) };
        }
      }

      const partial = list.find((s) => /\bcentral\b/i.test(storeNameOf(s)));
      if (partial != null) {
        const id = storeIdOf(partial);
        if (id != null && !Number.isNaN(Number(id))) {
          return { id: Number(id), name: storeNameOf(partial) };
        }
      }

      return { id: null, name: '' };
    }

    private isStockBatchInCentralStore(batch: any): boolean {
      if (this.centralStoreId != null) {
        return Number(batch?.storeId) === this.centralStoreId;
      }
      const name = String(batch?.storeName ?? batch?.store_name ?? '').toLowerCase();
      return name.includes('central');
    }

    private stockBatchIdFromBatch(batch: any): number | null {
      const v = batch?.id ?? batch?.stockBatchId ?? batch?.batchId;
      if (v == null || v === '') {
        return null;
      }
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    }

    private nonPharmacyBatchesForCurrentItem(): any[] {
      if (this.currentItemId == null) {
        return [];
      }
      return this.allStockBatchesCache.filter((b) => {
        if (Number(this.stockItemIdFromBatch(b)) !== Number(this.currentItemId)) {
          return false;
        }
        if (this.isStockBatchInPharmacyStore(b)) {
          return false;
        }
        return this.batchQtyOnHand(b) > 0;
      });
    }

    openPvStockTransferModal(): void {
      const batches = this.nonPharmacyBatchesForCurrentItem();
      if (!batches.length || this.pharmacyStoreId == null) {
        return;
      }
      this.pvStockTransferBatchOptions = batches.map((b) => ({
        ...b,
        _batchId: this.stockBatchIdFromBatch(b),
        _label: `${this.stockBatchTreatmentLabel(b)} — ${b.storeName || 'Store'} (${this.batchQtyOnHand(b)} ${this.unitOfMeasure || ''})`.trim(),
      }));

      const preferCentral = batches.find((b) => this.isStockBatchInCentralStore(b));
      const source = preferCentral ?? batches[0];
      const batchId = this.stockBatchIdFromBatch(source);

      this.pvStockTransfer = {
        stockBatchId: batchId,
        fromStoreId: source?.storeId != null ? Number(source.storeId) : null,
        toStoreId: this.pharmacyStoreId,
        qty: this.batchQtyOnHand(source) || null,
        transferredBy: sessionStorage.getItem('username') || '',
      };
      this.pvStockTransferMessage = '';
      this.showPvStockTransferModal = true;
      document.body.style.overflow = 'hidden';
    }

    closePvStockTransferModal(): void {
      this.showPvStockTransferModal = false;
      this.pvStockTransferSaving = false;
      document.body.style.overflow = '';
    }

    onPvStockTransferBatchChange(): void {
      const id = this.pvStockTransfer.stockBatchId;
      const batch = this.pvStockTransferBatchOptions.find(
        (b) => b._batchId === id || Number(b.id) === Number(id)
      );
      if (!batch) {
        return;
      }
      this.pvStockTransfer.fromStoreId =
        batch.storeId != null ? Number(batch.storeId) : this.pvStockTransfer.fromStoreId;
      const onHand = this.batchQtyOnHand(batch);
      if (!this.pvStockTransfer.qty || this.pvStockTransfer.qty > onHand) {
        this.pvStockTransfer.qty = onHand;
      }
    }

    submitPvStockTransfer(form: NgForm): void {
      const payload: StockTransferRequestPayload = {
        stockBatchId: Number(this.pvStockTransfer.stockBatchId),
        fromStoreId: Number(this.pvStockTransfer.fromStoreId),
        toStoreId: Number(this.pvStockTransfer.toStoreId),
        qty: Number(this.pvStockTransfer.qty),
        transferredBy: String(this.pvStockTransfer.transferredBy ?? '').trim(),
      };
      if (
        !Number.isFinite(payload.stockBatchId) ||
        payload.stockBatchId < 1 ||
        !Number.isFinite(payload.fromStoreId) ||
        !Number.isFinite(payload.toStoreId) ||
        payload.fromStoreId === payload.toStoreId ||
        !Number.isFinite(payload.qty) ||
        payload.qty <= 0
      ) {
        this.pvStockTransferMessageOk = false;
        this.pvStockTransferMessage = 'Please complete all transfer fields with valid values.';
        return;
      }

      this.pvStockTransferSaving = true;
      this.pvStockTransferMessage = '';
      this.api.transferStockBusinessItem(payload).subscribe({
        next: (res: any) => {
          this.pvStockTransferSaving = false;
          this.pvStockTransferMessageOk = true;
          this.pvStockTransferMessage =
            res?.message && String(res.message).includes('success')
              ? String(res.message)
              : 'Stock transferred successfully.';
          this.loadDrugList();
          setTimeout(() => this.closePvStockTransferModal(), 1200);
        },
        error: (err: any) => {
          this.pvStockTransferSaving = false;
          this.pvStockTransferMessageOk = false;
          this.pvStockTransferMessage =
            err?.error?.message || err?.message || 'Stock transfer failed.';
        },
      });
    }

    /** Treatment dropdown: stock batches or shop products per business settings. */
    loadDrugList() {
      this.isLoadingDrugList = true;
      if (!this.pharmacyUseStockBatch) {
        this.api.getAllItems().subscribe({
          next: (items) => {
            this.itemList = Array.isArray(items) ? items : [];
            this.groupedStockItems = [];
            this.isLoadingDrugList = false;

            if (this.currentItemId != null) {
              const selected = this.itemList.find(
                (row) => Number(row?.id) === Number(this.currentItemId)
              );
              if (selected) {
                this.availableQuantity = Number(selected.stockAtHand) || 0;
                this.unitBuy = Number(selected.costPrice) || 0;
                this.unitOfMeasure = selected.uintOfMeasure || selected.unitOfMeasure || '';
              }
            }

            if (this.isPharmacist) {
              this.applyVisitPharmacyStockAvailability();
              this.syncPvRxAmountReceivedToSubtotal();
            }
          },
          error: (err) => {
            console.error('Client order: could not load shop products.', err);
            this.itemList = [];
            this.groupedStockItems = [];
            this.isLoadingDrugList = false;
            this.resetStockDistributionLabels();
          },
        });

        this.loadPharmacyStockBatchesCache();
        return;
      }

      forkJoin({
        stores: this.api.getAllStores().pipe(
          map((res: any) => this.normalizeStoresResponse(res)),
          catchError((err) => {
            console.warn('Client order: could not load stores for pharmacy filter.', err);
            return of([] as any[]);
          })
        ),
        batches: this.api.getAllStockBatches().pipe(
          map((batchRes: any) => this.normalizeStockBatchesResponse(batchRes)),
          catchError((err) => {
            console.error('Client order: could not load stock batches.', err);
            return of([] as any[]);
          })
        ),
      }).subscribe({
        next: ({ stores, batches }) => {
          const pharmacy = this.resolvePharmacyStore(stores);
          this.pharmacyStoreId = pharmacy.id;
          this.pharmacyStoreName = pharmacy.name;
          const central = this.resolveCentralStore(stores);
          this.centralStoreId = central.id;
          this.centralStoreName = central.name;
          this.pvStoreList = Array.isArray(stores) ? stores : [];
          this.allStockBatchesCache = batches;
          this.itemList = batches.map((batch) =>
            this.mapStockBatchToTreatmentDropdownItem(batch)
          );
          this.isLoadingDrugList = false;
          this.refreshGroupedStockItems();

          if (this.currentItemId != null) {
            this.updateStockDistributionForItem(this.currentItemId);
          }

          if (this.isPharmacist) {
            this.applyVisitPharmacyStockAvailability();
            this.syncPvRxAmountReceivedToSubtotal();
          }
        },
        error: () => {
          this.itemList = [];
          this.allStockBatchesCache = [];
          this.groupedStockItems = [];
          this.isLoadingDrugList = false;
          this.resetStockDistributionLabels();
        },
      });
    }

    /** Stock batches for pharmacist availability, sundries, and transfers (not the treatment picker). */
    private loadPharmacyStockBatchesCache(): void {
      forkJoin({
        stores: this.api.getAllStores().pipe(
          map((res: any) => this.normalizeStoresResponse(res)),
          catchError((err) => {
            console.warn('Client order: could not load stores for pharmacy filter.', err);
            return of([] as any[]);
          })
        ),
        batches: this.api.getAllStockBatches().pipe(
          map((batchRes: any) => this.normalizeStockBatchesResponse(batchRes)),
          catchError((err) => {
            console.error('Client order: could not load stock batches.', err);
            return of([] as any[]);
          })
        ),
      }).subscribe({
        next: ({ stores, batches }) => {
          const pharmacy = this.resolvePharmacyStore(stores);
          this.pharmacyStoreId = pharmacy.id;
          this.pharmacyStoreName = pharmacy.name;
          const central = this.resolveCentralStore(stores);
          this.centralStoreId = central.id;
          this.centralStoreName = central.name;
          this.pvStoreList = Array.isArray(stores) ? stores : [];
          this.allStockBatchesCache = batches;

          if (this.currentItemId != null) {
            this.updateStockDistributionForItem(this.currentItemId);
          }

          if (this.isPharmacist) {
            this.applyVisitPharmacyStockAvailability();
            this.syncPvRxAmountReceivedToSubtotal();
          }
        },
        error: () => {
          this.allStockBatchesCache = [];
          this.resetStockDistributionLabels();
        },
      });
    }

  /** Metric label for in-stock chip on the treatment plan form. */
  pvTreatmentStockMetricLabel(): string | number {
    const total = this.stockDistributionTotal;
    if (total !== '—' && total != null && total !== '') {
      return total;
    }
    const qty = Number(this.availableQuantity);
    return Number.isFinite(qty) ? qty : 0;
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

      const batchKey = this.pvStockBatchLineKey(itemKey, batch);
      let line = group.batchLineMap.get(batchKey);
      if (!line) {
        line = {
          batchKey,
          batchLabel: String(batch.batchLabel ?? `Batch ${batch.batchNumber ?? batch._stockBatchId ?? '?'}`).trim(),
          distributions: [],
          storeDistribution: [],
        };
        group.batchLineMap.set(batchKey, line);
      }
      line.distributions.push(batch);
    }

    const result = Array.from(itemMap.values())
      .map((group) => {
        const batchLines = Array.from(group.batchLineMap.values())
          .filter((line) => this.pvBatchLineTotalStock(line.distributions) > 0)
          .map((line) => {
            const expiry = this.pvBatchLineExpiryInfo(line.distributions);
            const pricing = extractBatchLinePricing(line.distributions);
            return {
              batchKey: line.batchKey,
              batchLabel: line.batchLabel,
              expiryLabel: expiry.label,
              expiryTone: expiry.tone,
              totalStock: this.pvBatchLineTotalStock(line.distributions),
              unitCost: pricing.unitCost,
              sellingModels: pricing.sellingModels,
              storeDistribution: this.pvBuildBatchStoreDistribution(line.distributions),
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
    this.groupedStockItems = result;
  }

  groupedStockItemList(): typeof this.groupedStockItems {
    return this.groupedStockItems;
  }

  trackGroupedStockItem(_index: number, group: { itemKey: string }): string {
    return group.itemKey;
  }

  batchLineHasStock(line: { totalStock?: number }): boolean {
    return Number(line?.totalStock ?? 0) > 0;
  }

  distHasSelectableStock(dist: { item?: any | null }): boolean {
    return !!dist?.item && Number(dist.item.stockAtHand ?? 0) > 0;
  }

  formatBatchMoney(amount: number | null | undefined): string {
    return formatMoneyWholeDisplay(amount ?? 0);
  }

  batchExpiryToneClass(tone: string): string {
    if (tone === 'danger') {
      return 'pv-stock-batch-expiry--danger';
    }
    if (tone === 'warning') {
      return 'pv-stock-batch-expiry--warning';
    }
    if (tone === 'safe') {
      return 'pv-stock-batch-expiry--safe';
    }
    return 'pv-stock-batch-expiry--unknown';
  }

  private pvStockBatchLineKey(itemKey: string, batch: any): string {
    const batchNumber = String(batch.batchNumber ?? '').trim();
    if (batchNumber) {
      return `${itemKey}::bn:${batchNumber}`;
    }
    return `${itemKey}::id:${batch._stockBatchId ?? batch.id ?? ''}`;
  }

  private pvBatchLineTotalStock(distributions: any[]): number {
    return distributions.reduce((sum, row) => sum + Number(row?.stockAtHand ?? 0), 0);
  }

  private pvStockBatchQtyBadge(qty: number, uom?: string): string {
    const unit = String(uom ?? '').trim();
    return unit ? `Qty: ${qty} ${unit}` : `Qty: ${qty}`;
  }

  private pvBuildBatchStoreDistribution(distributions: any[]): {
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
        const storeName = String(item.storeName ?? `Store #${storeId}`).trim();
        const qty = Number(item.stockAtHand ?? 0);
        const uom = String(item.uintOfMeasure ?? item.unitOfMeasure ?? defaultUom).trim();
        const qtyLabel = this.pvStockBatchQtyBadge(qty, uom);
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

  private pvBatchLineExpiryInfo(distributions: any[]): {
    label: string;
    tone: 'danger' | 'warning' | 'safe' | 'unknown';
  } {
    for (const row of distributions) {
      const raw =
        row?.expiryDate ?? row?.expiry ?? row?.expireDate ?? row?.expirationDate ?? row?.expiryLabel;
      if (raw == null || raw === '') {
        continue;
      }
      const label = row?.expiryLabel || this.formatBatchExpiryShort(row);
      const dt = Array.isArray(raw) && raw.length >= 3
        ? new Date(Number(raw[0]), Number(raw[1]) - 1, Number(raw[2]))
        : new Date(raw);
      if (Number.isNaN(dt.getTime())) {
        return { label: label || '', tone: 'unknown' };
      }
      const years = (dt.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000);
      let tone: 'danger' | 'warning' | 'safe' = 'safe';
      if (years < 1) {
        tone = 'danger';
      } else if (years < 2) {
        tone = 'warning';
      }
      return { label: label || this.formatBatchExpiryShort(row), tone };
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
    };
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

  private plainDrugName(batch: any): string {
    return String(batch?.stockItemName || batch?.itemName || 'Product').trim();
  }

  private formatBatchExpiryShort(batch: any): string {
    const raw =
      batch?.expiryDate ??
      batch?.expiry ??
      batch?.expireDate ??
      batch?.expirationDate;
    if (raw == null || raw === '') {
      return '';
    }
    if (Array.isArray(raw) && raw.length >= 3) {
      const y = String(raw[0]).slice(-2);
      const m = Number(raw[1]);
      const d = Number(raw[2]);
      return `${d}/${m}/${y}`;
    }
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) {
      return '';
    }
    return `${dt.getDate()}/${dt.getMonth() + 1}/${String(dt.getFullYear()).slice(-2)}`;
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


    loadRequestedScans(){
      this.searchText = "";
      this.api.getScanList().subscribe((res) => {
        this.scanList = res;
        console.log('scan list',this.scanList);
        //console.log(clientId);
  
      });  
    }

    loadRequestedOtherProcedure(){
      this.api.getOtherProcedureList().subscribe((res) => {
        this.procedureList = res;
        console.log('procedure list',this.procedureList);
        //console.log(clientId);
  
      });  
    }



    clearTaxDiscountForm() {

  
      //this.currentOtherProcedure = "Chose Procedure"
      this.saveButtonStatusTaxDiscount = "Save Discount"

      
      this.showDivAddToDataBaseTaxDiscount = false;
    
      // Reset the currentVital object to its initial state
    
      // Reset the form if available
      if (this.usersFormTaxDiscount) {
        this.usersFormTaxDiscount.resetForm(); // This will reset all form fields to their default state
      }
    }






    clearPaymentForm() {

  
      //this.currentOtherProcedure = "Chose Procedure"
      this.saveButtonStatusPayment = "Save Payment"

      
      this.showDivAddToDataBasePayment = false;
    
      // Reset the currentVital object to its initial state
    
      // Reset the form if available
      if (this.usersFormPayment) {
        this.usersFormPayment.resetForm(); // This will reset all form fields to their default state
      }
    }





    clearOtherProcedureForm() {

  
      this.currentOtherProcedure = "Chose Procedure"
      this.saveButtonStatusOtherProcedure = "Save Procedure"
      this.currentOtherProcedureId = null;
      this.procedureOrderedBy = "Ordered By";
      this.procedureDoneBy = "Done By";
      this.currentOtherProcedureRequested = { indication: '' };
      this.currentScanProcedureRequestedUnitSellingPrice = null;
      this.currentServiceProcedureUnitCost = null;
      this.selectedServiceUnitSellingModelId = null;
      
      this.showDivAddToDataBaseOtherProcedure = false;
    
      // Reset the currentVital object to its initial state
    
      // Reset the form if available
      if (this.usersFormOtherProcedure) {
        this.usersFormOtherProcedure.resetForm(); // This will reset all form fields to their default state
      }
    }






      clearScanForm() {

  
        this.currentScanProcedure = "Chose Scan"
        this.saveButtonStatusScan = "Save Scan"
  
        
        this.showDivAddToDataBase = false;
      
        // Reset the currentVital object to its initial state
      
        // Reset the form if available
        if (this.usersFormScan) {
          this.usersFormScan.resetForm(); // This will reset all form fields to their default state
        }
      }






      clearTreatmentForm() {

        this.currentItem = 'Choose Treatment'
        this.currentItemFullLabel = '';
        this.saveButtonStatusTreatment = "Save Drug"

        this.itemSellingPrice = 0.00;
        this.availableQuantity = 0.00;
        this.currentItem = null;
        this.currentItemId = null;
        this.currentStockBatchId = null;
        this.pvUseUnitSellingModelPicker = false;
        this.pvUnitSellingStockItemId = null;
        this.selectedUnitSellingModelId = null;
        this.resetTreatmentDrugSearch();
        this.resetStockDistributionLabels();
  
        
        this.showDivAddToDataBase = false;
      
  
      
        // Reset the form if available
        if (this.usersFormTreatment) {
          this.usersFormTreatment.resetForm(); // This will reset all form fields to their default state
        }
      }






    clearLabTestForm() {

      this.currentProcedure = "Chose LabTest"
      this.saveButtonStatusLabTest = "Save LabTest"

      
      this.showDivAddToDataBase = false;
    
      // Reset the currentVital object to its initial state
      this.currentLabTest = {
        temperature: null,
        diastolic: null,
        systolic: null,
        pulseRate: null,
        spO2: null,
        heartRate: null,
        respiratoryRate: null,
        weight: null,
        height: null,
        dateTaken: null,
        timeTaken: null,
      };
    
      // Reset the form if available
      if (this.usersFormLabTest) {
        this.usersFormLabTest.resetForm(); // This will reset all form fields to their default state
      }
    }





    clearVitalsForm() {

      this.station = "Station"
      this.saveButtonStatus = "Save Vitals"
      this.vitalId = null;
      
      this.showDivAddToDataBase = false;
    
      // Reset the currentVital object to its initial state
      this.currentVital = {
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
        dateTaken: null,
        timeTaken: null,
      };
    
      // Reset the form if available
      if (this.form) {
        this.form.resetForm(); // This will reset all form fields to their default state
      }
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
    

  loadClientGroupByGroupName(id: any) {

      this.api.getClientGroupByGroupName(id).subscribe((res) => {
        this.clientGroup = res;
        //this.currentClientGroup = this.clientGroup.groupNameShortForm;
        //console.log('group now',this.clientGroup.groupNameShortForm);
        //console.log(clientId);
  
      });  
    }


  createNewClientVisits(clientId: any): void {
    this.showDivUpdatedLoaderNewVisit = false;
    this.visitSaveButtonStatus = 'Save Visit';
    this.clientId = clientId;
    this.fillCreateVisitFormFromClient();

    this.visitReason = '';
    this.visitType = 'outpatient';
    setTimeout(() => {
      ($('#createVisitModal') as any).modal('show');
      this.cdr.detectChanges();
    }, 0);

    if (clientId) {
      this.api.getClientById(clientId).subscribe({
        next: (client) => {
          if (client && typeof client === 'object') {
            const normalized = this.normalizeClientRecord(client);
            this.loadClientDataFromItem(normalized);
            sessionStorage.setItem('item', JSON.stringify(normalized));
            this.fillCreateVisitFormClientFields();
          }
        },
        error: (err) => {
          console.error('Error loading client for new visit', err);
        }
      });
    }
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
      occupation: this.clientOccupation || ''
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
      occupation: this.clientOccupation || ''
    };
  }

  closeCreateVisitModal(): void {
    this.showDivUpdatedLoaderNewVisit = false;
    ($('#createVisitModal') as any).modal('hide');
  }

  private buildNewVisitPayload(formValue?: any) {
    const merged = {
      ...this.createVisitFormData,
      visitType: this.visitType,
      visitReason: this.visitReason,
      clientAge: this.clientAge,
      clientContact: this.clientContact,
      clientAddress: this.clientAddress,
      nextOfKinName: this.nextOfKinName,
      nextOfKinAddress: this.nextOfKinAddress,
      nextOfKinContact: this.nextOfKinContact,
      relationship: this.relationship,
      occupation: this.clientOccupation,
      ...(formValue || {})
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
      occupation: merged.occupation || null
    };
  }

  resetCreateVisitForm(): void {
    this.showDivUpdatedLoaderNewVisit = false;
    this.visitSaveButtonStatus = 'Save Visit';
    this.fillCreateVisitFormFromClient();
  }

     loadClientVisits(clientId: any) {
      this.isLoadingClientVisits = true;
  
      this.api.getInitialTriageVitalsForVisitId(clientId).subscribe({
        next: (res) => {
          this.clientVisitList = res;
          console.log('Selected VisitListNow', this.clientVisitList);
          console.log(clientId);
          this.isLoadingClientVisits = false;  // ✅ stop loading when data comes
        },
        error: (err: any) => {
          console.error('Error loading client orders', err);
          this.isLoadingClientVisits = false;  // ✅ even on error, stop loading
        }
      });
  }

  /** Ultrasound / scan imaging rows are listed separately in this app; exclude from combined lab PDF. */
  isUltrasoundScanCategoryProcedure(item: any): boolean {
    if (!item) {
      return false;
    }
    const cat = (item.category || item.procedureCategory || item.serviceCategory || '')
      .toString()
      .toLowerCase();
    const name = (item.procedureRequestedName || '').toString().toLowerCase();
    if (cat.includes('ultrasound')) {
      return true;
    }
    if (cat.includes('ultrasound scan')) {
      return true;
    }
    if (name.includes('ultrasound') && name.includes('scan')) {
      return true;
    }
    return false;
  }

  /** Procedure display name: lowercase, trim, single spaces (routing lab PDF/Word + modal). */
  private normalizeProcedureRequestedNameForLabRouting(item: any): string {
    return (item?.procedureRequestedName || '')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  private isUrinalysisProcedureName(requestName: string): boolean {
    return requestName === 'urinalysis' || requestName.includes('urinalysis');
  }

  private getProcedureReportKindForPdf(item: any): 'mrdt' | 'urinalysis' | 'cbc' | 'parasitology' | 'general' {
    const category = (item?.category || '').toString().toLowerCase().trim();
    const requestName = this.normalizeProcedureRequestedNameForLabRouting(item);
    if (category === 'malaria test') {
      return 'mrdt';
    }
    if (this.isUrinalysisProcedureName(requestName)) {
      return 'urinalysis';
    }
    if (requestName === 'cbc' || requestName.includes('cbc')) {
      return 'cbc';
    }
    if (
      requestName === 'parasitology stool' ||
      requestName === 'parasitologystool' ||
      requestName.includes('parasitology stool')
    ) {
      return 'parasitology';
    }
    return 'general';
  }

  /** True only when procedure `category` is lab test (matches app `labTest` procedures). */
  private isLabTestCategoryProcedureForPdf(item: any): boolean {
    if (!item) {
      return false;
    }
    const cat = (item.category || '').toString().toLowerCase().replace(/\s+/g, '');
    return cat === 'labtest';
  }

  /**
   * After result tables: short gap (~20px) before Done by; labTest → "Lab technician" + Done by + name + Stamp and signature right;
   * else Done by + name left and Stamp and signature right.
   */
  private drawPdfResultsDoneByFooter(pdf: jsPDF, y: number, item: any): number {
    const pageW = 210;
    const margin = 12;
    /* 20px at 96dpi → mm for spacing under the result block */
    const gapBeforeFooterMm = (20 * 25.4) / 96;
    y = this.pdfEnsurePageSpace(pdf, y, gapBeforeFooterMm + 24);
    y += gapBeforeFooterMm;
    const hasName = item?.doneBy != null && String(item.doneBy).trim() !== '';
    const nameRaw = hasName ? String(item.doneBy).trim() : '';
    const lab = this.isLabTestCategoryProcedureForPdf(item);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const stampLabel = 'Stamp and signature';
    const stampW = pdf.getTextWidth(stampLabel);
    const stampRightX = pageW - margin;
    const gapBeforeStampMm = 6;
    if (lab) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Lab technician', margin, y);
      y += 5.5;
      const label = 'Done by: ';
      pdf.setFont('helvetica', 'bold');
      const labelW = pdf.getTextWidth(label);
      pdf.text(label, margin, y);
      pdf.setFont('helvetica', 'normal');
      const nameX = margin + labelW;
      const nameMaxW = Math.max(
        28,
        stampRightX - nameX - stampW - gapBeforeStampMm
      );
      const nameLines = nameRaw
        ? pdf.splitTextToSize(nameRaw, nameMaxW)
        : ['____________________________'];
      pdf.text(nameLines, nameX, y);
      pdf.text(stampLabel, stampRightX, y, { align: 'right' });
      y += Math.max(5, nameLines.length * 4.2);
    } else {
      const label = 'Done by: ';
      pdf.setFont('helvetica', 'bold');
      const labelW = pdf.getTextWidth(label);
      pdf.text(label, margin, y);
      pdf.setFont('helvetica', 'normal');
      const nameX = margin + labelW;
      const nameMaxW = Math.max(
        28,
        stampRightX - nameX - stampW - gapBeforeStampMm
      );
      const nameLines = nameRaw
        ? pdf.splitTextToSize(nameRaw, nameMaxW)
        : ['____________________________'];
      pdf.text(nameLines, nameX, y);
      pdf.text(stampLabel, stampRightX, y, { align: 'right' });
      y += Math.max(5, nameLines.length * 4.2);
    }
    pdf.setFont('helvetica', 'normal');
    return y;
  }

  private fetchProcedureReportForPdf$(item: any) {
    const kind = this.getProcedureReportKindForPdf(item);
    let obs: Observable<any>;
    switch (kind) {
      case 'mrdt':
        obs = this.api.getLabReportByRequestId(item.id);
        break;
      case 'urinalysis':
        obs = this.api.getUrinalysisReportByRequestId(item.id);
        break;
      case 'cbc':
        obs = this.api.getCbcReportByRequestId(item.id);
        break;
      case 'parasitology':
        obs = this.api.getParasitologyStoolReportByRequestId(item.id);
        break;
      default:
        obs = this.api.getGeneralLabReportByRequestId(item.id);
    }
    return obs.pipe(
      map((res: any) => ({
        item,
        kind,
        report: res?.data ?? res ?? {}
      })),
      catchError(() => of({ item, kind, report: null as any }))
    );
  }

  private pdfEnsurePageSpace(pdf: jsPDF, y: number, needMm: number): number {
    const pageH = (pdf as any).internal.pageSize.getHeight?.() ?? (pdf as any).internal.pageSize.height ?? 297;
    if (y + needMm > pageH - 10) {
      pdf.addPage();
      return 18;
    }
    return y;
  }

  private formatAgeForPdf(): string {
    const a = Number(this.clientAge);
    if (Number.isFinite(a)) {
      if (Number.isInteger(a) || a === Math.trunc(a)) {
        return `${Math.trunc(a)}YRS`;
      }
      return `${a}YRS`;
    }
    const s = (this.clientAge ?? '').toString().trim();
    return s ? s.toUpperCase() : '–';
  }

  private formatVisitDateForPdf(): string {
    const v = this.visit?.visitDate;
    if (v == null || v === '') {
      return '–';
    }
    const s = typeof v === 'string' ? v : String(v);
    return s.length >= 10 ? s.slice(0, 10) : s;
  }

  /** Balance due rounded up to the next 100 shillings for final payment. */
  paymentBalanceDueAmount(): number {
    const rounded = roundUgxMoneyOptional(this.balanceDue);
    return rounded ?? 0;
  }

  formatBalanceDue(): string {
    const rounded = this.paymentBalanceDueAmount();
    if (rounded > 0) {
      return formatUgxPaymentTotalDisplay(rounded);
    }
    const n = Number(this.balanceDue);
    if (Number.isFinite(n)) {
      return n.toFixed(2);
    }
    return this.balanceDue != null ? String(this.balanceDue) : '–';
  }

  formatPaymentAmount(amount: number | string | null | undefined): string {
    return formatMoneyWholeDisplay(amount);
  }

  private applyBalanceDueFromApi(rawBalance: number | string | null | undefined): void {
    this.balanceDue = rawBalance;
    if (this.saveButtonStatusPayment !== 'Save Payment') {
      return;
    }
    const rounded = roundUgxMoneyOptional(rawBalance);
    if (rounded != null && rounded > 0) {
      this.currentPayment.amountToPay = rounded;
    }
  }

  private formatBalanceForPdf(): string {
    return this.formatBalanceDue();
  }

  private pdfResult5ColWidths = [48, 32, 24, 38, 44];
  /** Body/header text in 5- and 3-column lab result tables (jsPDF points). */
  private pdfTableCellFontPt = 9;

  /** General lab report: three equal columns (full content width 186 mm). */
  private pdfGeneralLab3ColWidths = [62, 62, 62];

  private pdfCellStr(v: any): string {
    if (v == null) {
      return '';
    }
    const s = String(v).trim();
    return s === '' ? '' : s;
  }

  /** Loads facility logo once for PDF headers. */
  private ensurePdfLogoLoaded(): Promise<void> {
    return this.facilityBranding.loadLogoDataUrl().then(() => undefined);
  }

  /** Draws facility logo or text fallback to the left of the client table. */
  private drawMedicalReportLogo(pdf: jsPDF, brandY: number): void {
    const x = 12;
    const logoW = 32;
    const logoH = 26;
    /* Slightly above row baseline so the image does not sit on the table top edge. */
    const logoY = brandY - 4;
    if (this.facilityBranding.addLogoToJsPdf(pdf, x, logoY, logoW, logoH)) {
      return;
    }
    const name = this.facilityBranding.getFacilityName().toUpperCase();
    const parts = name.split(/\s+/).filter(Boolean);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    if (parts.length >= 2) {
      pdf.text(parts[0].slice(0, 18), x, logoY + 3);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(parts.slice(1).join(' ').slice(0, 22), x, logoY + 7);
    } else {
      pdf.text(name.slice(0, 22), x, logoY + 5);
    }
  }

  /** Height for one demographics cell (horizontal `Label: value`, minimal vertical padding). */
  private measureDemographicsCellHeight(
    pdf: jsPDF,
    w: number,
    label: string,
    value: string
  ): number {
    const padX = 1;
    const padTop = 1.6;
    const padBottom = 0.35;
    const lineHeight = 3.65;
    const lab = `${String(label).toUpperCase()}: `;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    const wLab = pdf.getTextWidth(lab);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const valMaxW = Math.max(6, w - padX * 2 - wLab);
    const valStr = (value == null || String(value).trim() === '' ? '–' : String(value)).toUpperCase();
    const valLines = pdf.splitTextToSize(valStr, valMaxW);
    return padTop + valLines.length * lineHeight + padBottom;
  }

  /** Bordered cell: single horizontal line `LABEL: VALUE` (all caps; label bold). */
  private pdfDemographicsCell(
    pdf: jsPDF,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string
  ): void {
    const padX = 1;
    const padTop = 1.6;
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, w, h);
    const lab = `${String(label).toUpperCase()}: `;
    const baseline0 = y + padTop + 2.85;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    const wLab = pdf.getTextWidth(lab);
    pdf.text(lab, x + padX, baseline0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const valMaxW = Math.max(6, w - padX * 2 - wLab);
    const valStr = (value == null || String(value).trim() === '' ? '–' : String(value)).toUpperCase();
    const valLines = pdf.splitTextToSize(valStr, valMaxW);
    pdf.text(valLines, x + padX + wLab, baseline0);
  }

  /**
   * 3×3 client grid to the right of facility branding (aligned labels/values).
   * @param procedureFootnote e.g. current procedure name for single-report export; otherwise "–".
   */
  private drawClientDemographicsTable(
    pdf: jsPDF,
    topY: number,
    pageW: number,
    opts?: { procedureFootnote?: string }
  ): number {
    const x0 = 50;
    const wTable = pageW - 12 - x0;
    /* First column (client name, address, NOK) wider for long names; remainder split evenly. */
    const cw1 = wTable * 0.4;
    const cw2 = (wTable - cw1) / 2;
    const cw3 = cw2;
    const nm =
      `${(this.clientFirstName || '').toString()} ${(this.clientSecondName || '').toString()}`
        .trim()
        .toUpperCase() || '–';
    const gen = ((this.clientGender || '') + '').toUpperCase() || '–';
    const ageStr = this.formatAgeForPdf();
    const addr = ((this.clientAddress || '') + '').toUpperCase() || '–';
    const phone = (((this.clientContact || '') + '').trim() || '–').toUpperCase();
    const nok = ((this.nextOfKinName || '') + '').toUpperCase() || '–';
    const vdt = this.formatVisitDateForPdf().toUpperCase();
    const bal = this.formatBalanceForPdf().toUpperCase();
    const proc = (opts?.procedureFootnote || '–').toString().toUpperCase();

    let y = topY;
    const row = (
      c1: [string, string],
      c2: [string, string],
      c3: [string, string]
    ) => {
      const h = Math.max(
        5,
        this.measureDemographicsCellHeight(pdf, cw1, c1[0], c1[1]),
        this.measureDemographicsCellHeight(pdf, cw2, c2[0], c2[1]),
        this.measureDemographicsCellHeight(pdf, cw3, c3[0], c3[1])
      );
      let x = x0;
      this.pdfDemographicsCell(pdf, x, y, cw1, h, c1[0], c1[1]);
      x += cw1;
      this.pdfDemographicsCell(pdf, x, y, cw2, h, c2[0], c2[1]);
      x += cw2;
      this.pdfDemographicsCell(pdf, x, y, cw3, h, c3[0], c3[1]);
      y += h;
    };

    row(['Client name', nm], ['Gender', gen], ['Age', ageStr]);
    row(['Address', addr], ['Contact', phone], ['Visit date', vdt]);
    row(['Next of kin', nok], ['Balance due', bal], ['Procedure', proc]);

    pdf.setDrawColor(200);
    pdf.setLineWidth(0.35);
    const gapBeforeSeparatorMm = 4;
    const lineY = y + gapBeforeSeparatorMm;
    pdf.line(12, lineY, pageW - 12, lineY);
    /* Extra gap below separator before following sections (e.g. procedure results). */
    return lineY + 6;
  }

  private drawPdfFiveColumnRow(
    pdf: jsPDF,
    y: number,
    rowH: number,
    cells: string[],
    header: boolean
  ): number {
    let x = 12;
    pdf.setDrawColor(120);
    pdf.setLineWidth(0.15);
    for (let i = 0; i < 5; i++) {
      const w = this.pdfResult5ColWidths[i];
      pdf.rect(x, y, w, rowH);
      pdf.setFont('helvetica', header ? 'bold' : 'normal');
      pdf.setFontSize(this.pdfTableCellFontPt);
      const t = pdf.splitTextToSize(cells[i] ?? '', w - 2);
      const baseline = y + (header ? 5.4 : 5.1);
      pdf.text(t, x + 1, baseline);
      x += w;
    }
    return y + rowH;
  }

  /**
   * General lab: 3 columns — header row + one body row; height follows longest wrapped cell.
   */
  private drawPdfThreeColumnRowSized(
    pdf: jsPDF,
    y: number,
    cells: string[],
    header: boolean
  ): number {
    const pad = 2;
    const lineH = 3.9;
    const widths = this.pdfGeneralLab3ColWidths;
    const wrapped: string[][] = [];
    let maxN = 1;
    for (let i = 0; i < 3; i++) {
      pdf.setFont('helvetica', header ? 'bold' : 'normal');
      pdf.setFontSize(this.pdfTableCellFontPt);
      const raw = cells[i] ?? '';
      const text =
        header ? raw : raw.trim() === '' ? '–' : raw;
      const lines = pdf.splitTextToSize(text, widths[i] - pad);
      wrapped.push(lines);
      maxN = Math.max(maxN, lines.length);
    }
    const rowH = Math.max(header ? 7.5 : 9.5, maxN * lineH + 3.5);
    let x = 12;
    for (let i = 0; i < 3; i++) {
      pdf.setDrawColor(120);
      pdf.setLineWidth(0.15);
      pdf.rect(x, y, widths[i], rowH);
      pdf.setFont('helvetica', header ? 'bold' : 'normal');
      pdf.setFontSize(this.pdfTableCellFontPt);
      pdf.text(wrapped[i], x + 1, y + 5.2);
      x += widths[i];
    }
    return y + rowH;
  }

  /**
   * General lab: RESULTS/FINDINGS | NOTES/CONCLUSION | RECOMMENDATIONS (header + values).
   * Procedure title comes from the document heading; no extra section title here.
   */
  private appendGeneralLabReportTableFromObject(pdf: jsPDF, y: number, report: any): number {
    const r = report && typeof report === 'object' ? report : {};
    y = this.pdfEnsurePageSpace(pdf, y, 12);
    y = this.drawPdfThreeColumnRowSized(pdf, y, [
      'RESULTS / FINDINGS',
      'NOTES / CONCLUSION',
      'RECOMMENDATIONS'
    ], true);
    const v1 = this.pdfCellStr(r.result || r.report || r.findings);
    const v2 = this.pdfCellStr(r.notes);
    const v3 = this.pdfCellStr(r.recommendation);
    y = this.pdfEnsurePageSpace(pdf, y, 12);
    y = this.drawPdfThreeColumnRowSized(pdf, y, [v1, v2, v3], false);
    return y + 4;
  }

  private appendCbcResultsTableToPdf(pdf: jsPDF, y: number): number {
    y = this.pdfEnsurePageSpace(pdf, y, 12);
    y = this.drawPdfFiveColumnRow(
      pdf,
      y,
      8,
      ['PARAMETER', 'RESULT', 'UNITS', 'REF RANGES', 'INTERPRETATION'],
      true
    );
    for (const field of this.cbcResultFields) {
      y = this.pdfEnsurePageSpace(pdf, y, 7);
      y = this.drawPdfFiveColumnRow(
        pdf,
        y,
        8,
        [
          field.label,
          this.pdfCellStr(this.cbcResult[field.key]),
          field.unit,
          field.ref,
          this.pdfCellStr(this.cbcInterpretation[field.key])
        ],
        false
      );
    }
    return y + 4;
  }

  private appendUrinalysisFiveColumnTableToPdf(pdf: jsPDF, y: number): number {
    y = this.pdfEnsurePageSpace(pdf, y, 12);
    const dash = '–';
    const rows: Array<[string, string]> = [
      ['pH', this.urinalysisResult.ph],
      ['SG', this.urinalysisResult.sg],
      ['Protein', this.urinalysisResult.protein],
      ['Glucose', this.urinalysisResult.glucose],
      ['Ketones', this.urinalysisResult.ketones],
      ['Blood', this.urinalysisResult.blood],
      ['Bilirubin', this.urinalysisResult.bilirubin],
      ['Urobilinogen', this.urinalysisResult.urobilinogen],
      ['Nitrite', this.urinalysisResult.nitrite],
      ['Leukocyte E', this.urinalysisResult.leukocyteE],
      ['Epithelial cells', this.urinalysisResult.epithelialCells],
      ['pus cells', this.urinalysisResult.pusCellsWbcs],
      ['Casts', this.urinalysisResult.casts],
      ['Red cells', this.urinalysisResult.redCells],
      ['Crystals', this.urinalysisResult.crystals],
      ['others', this.urinalysisResult.others],
      ['Color', this.urinalysisResult.color],
      ['Appear', this.urinalysisResult.appearance],
      ['Volume', this.urinalysisResult.volume]
    ];
    y = this.drawPdfFiveColumnRow(
      pdf,
      y,
      8,
      ['PARAMETER', 'RESULT', 'UNITS', 'ref:', 'Interprt:'],
      true
    );
    for (const [label, val] of rows) {
      y = this.pdfEnsurePageSpace(pdf, y, 7);
      y = this.drawPdfFiveColumnRow(
        pdf,
        y,
        8,
        [label, this.pdfCellStr(val), dash, dash, dash],
        false
      );
    }
    return y + 4;
  }

  private appendParasitologyFiveColumnTableToPdf(pdf: jsPDF, y: number): number {
    y = this.pdfEnsurePageSpace(pdf, y, 12);
    const dash = '–';
    const rows: Array<[string, string]> = [
      ['Ova', this.parasitologyStoolResult.ova],
      ['Cysts', this.parasitologyStoolResult.cysts],
      ['Larvae', this.parasitologyStoolResult.larvae],
      ['Color', this.parasitologyStoolResult.color],
      ['Consistency', this.parasitologyStoolResult.consistency],
      ['Blood', this.parasitologyStoolResult.blood],
      ['Mucus', this.parasitologyStoolResult.mucus],
      ['Visible parasites', this.parasitologyStoolResult.visibleParasites],
      ['Others', this.parasitologyStoolResult.others]
    ];
    y = this.drawPdfFiveColumnRow(
      pdf,
      y,
      8,
      ['PARAMETER', 'RESULT', 'UNITS', 'REF RANGES', 'INTERPRETATION'],
      true
    );
    for (const [label, val] of rows) {
      y = this.pdfEnsurePageSpace(pdf, y, 7);
      y = this.drawPdfFiveColumnRow(
        pdf,
        y,
        8,
        [label, this.pdfCellStr(val), dash, dash, dash],
        false
      );
    }
    return y + 4;
  }

  /**
   * CBC / urinalysis / parasitology: first row = parameter names (horizontal);
   * first column = row labels (Result, Units, Ref ranges, Interpretation) with values across columns.
   */
  private drawPdfTransposedLabBlock(
    pdf: jsPDF,
    y: number,
    sectionTitle: string,
    paramHeaders: string[],
    rowLabels: string[],
    matrix: string[][]
  ): number {
    const pageW = (pdf as any).internal.pageSize.getWidth?.() ?? 210;
    const margin = 12;
    /* Narrow column for Result / Units / Ref ranges / Interpretation row labels (transposed CBC, etc.). */
    const labelColW = 19;
    const n = Math.max(1, paramHeaders.length);
    const inner = pageW - 2 * margin - labelColW;
    const colW = Math.min(24, Math.max(6.2, inner / n));
    let fs = colW >= 10 ? 7 : colW >= 8 ? 6.5 : 5.8;

    y = this.pdfEnsurePageSpace(pdf, y, 14);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(sectionTitle, margin, y);
    y += 6;

    const pad = 0.9;
    const cellLines = (txt: string, w: number, bold: boolean): string[] => {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setFontSize(fs);
      const s = txt == null || String(txt).trim() === '' ? '–' : String(txt);
      return pdf.splitTextToSize(s, w - 2 * pad);
    };
    const rowHForLines = (linesArr: string[][], labelLines: string[]): number => {
      const lh = fs * 0.42 + 0.15;
      let m = Math.max(5.5, labelLines.length * lh + 2.2);
      for (const ln of linesArr) {
        m = Math.max(m, ln.length * lh + 2.2);
      }
      return m;
    };

    // Header row: blank label cell + parameter names
    const headLineArrays = paramHeaders.map((h) => cellLines(h, colW, true));
    const cornerLabelLines = [''];
    let rh0 = rowHForLines(headLineArrays, cornerLabelLines);
    y = this.pdfEnsurePageSpace(pdf, y, rh0 + 2);
    let x = margin;
    pdf.setDrawColor(110);
    pdf.setLineWidth(0.12);
    pdf.rect(x, y, labelColW, rh0);
    x += labelColW;
    for (let c = 0; c < n; c++) {
      pdf.rect(x, y, colW, rh0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(fs);
      pdf.text(headLineArrays[c], x + pad, y + 4);
      x += colW;
    }
    y += rh0;

    for (let r = 0; r < rowLabels.length; r++) {
      const labelLn = cellLines(rowLabels[r], labelColW, true);
      const valLinesArr: string[][] = [];
      for (let c = 0; c < n; c++) {
        const v = matrix[r]?.[c] ?? '';
        valLinesArr.push(cellLines(v, colW, false));
      }
      const rh = rowHForLines(valLinesArr, labelLn);
      y = this.pdfEnsurePageSpace(pdf, y, rh + 2);
      x = margin;
      pdf.rect(x, y, labelColW, rh);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(fs);
      pdf.text(labelLn, x + pad, y + 4);
      x += labelColW;
      pdf.setFont('helvetica', 'normal');
      for (let c = 0; c < n; c++) {
        pdf.rect(x, y, colW, rh);
        pdf.text(valLinesArr[c], x + pad, y + 4);
        x += colW;
      }
      y += rh;
    }
    return y + 4;
  }

  private getCbcTransposeDataForLabExport(
    report: any,
    procedureLabel: string
  ): { title: string; paramHeaders: string[]; rowLabels: string[]; matrix: string[][] } {
    const rep = report && typeof report === 'object' ? report : {};
    const interp = this.buildCbcInterpretationMapFromReport(rep);
    const headers = this.cbcResultFields.map((f) => f.label);
    const dash = '–';
    const matrix = [
      this.cbcResultFields.map((f) => this.pdfCellStr(rep[f.key])),
      this.cbcResultFields.map((f) => f.unit),
      this.cbcResultFields.map((f) => f.ref),
      this.cbcResultFields.map((f) => this.pdfCellStr(interp[f.key]) || dash),
    ];
    const title = `${procedureLabel.toUpperCase()} — CBC`;
    return {
      title,
      paramHeaders: headers,
      rowLabels: ['Result', 'Units', 'Ref ranges', 'Interpretation'],
      matrix,
    };
  }

  private getUrinalysisTransposeDataForLabExport(
    report: any,
    procedureLabel: string
  ): { title: string; paramHeaders: string[]; rowLabels: string[]; matrix: string[][] } {
    const r = report && typeof report === 'object' ? report : {};
    const dash = '–';
    const pairs: Array<[string, string]> = [
      ['pH', r.ph],
      ['SG', r.sg],
      ['Protein', r.protein],
      ['Glucose', r.glucose],
      ['Ketones', r.ketones],
      ['Blood', r.blood],
      ['Bilirubin', r.bilirubin],
      ['Urobilinogen', r.urobilinogen],
      ['Nitrite', r.nitrite],
      ['Leukocyte E', r.leukocyteE || r.leukocyte],
      ['Epithelial cells', r.epithelialCells],
      ['pus cells', r.pusCellsWbcs || r.pusCells],
      ['Casts', r.casts],
      ['Red cells', r.redCells],
      ['Crystals', r.crystals],
      ['others', r.others || r.microscopicOthers],
      ['Color', r.color],
      ['Appear', r.appearance],
      ['Volume', r.volume],
    ];
    const headers = pairs.map((p) => p[0]);
    const vals = pairs.map((p) => this.pdfCellStr(p[1]));
    const matrix = [vals, headers.map(() => dash), headers.map(() => dash), headers.map(() => dash)];
    const title = `${procedureLabel.toUpperCase()} — URINALYSIS`;
    return {
      title,
      paramHeaders: headers,
      rowLabels: ['Result', 'Units', 'ref:', 'Interprt:'],
      matrix,
    };
  }

  private getParasitologyTransposeDataForLabExport(
    report: any,
    procedureLabel: string
  ): { title: string; paramHeaders: string[]; rowLabels: string[]; matrix: string[][] } {
    const r = report && typeof report === 'object' ? report : {};
    const dash = '–';
    const pairs: Array<[string, string]> = [
      ['Ova', r.ova],
      ['Cysts', r.cysts],
      ['Larvae', r.larvae],
      ['Color', r.color],
      ['Consistency', r.consistency],
      ['Blood', r.blood],
      ['Mucus', r.mucus],
      ['Visible parasites', r.visibleParasites],
      ['Others', r.others],
    ];
    const headers = pairs.map((p) => p[0]);
    const vals = pairs.map((p) => this.pdfCellStr(p[1]));
    const matrix = [vals, headers.map(() => dash), headers.map(() => dash), headers.map(() => dash)];
    const title = `${procedureLabel.toUpperCase()} — PARASITOLOGY STOOL`;
    return {
      title,
      paramHeaders: headers,
      rowLabels: ['Result', 'Units', 'Ref ranges', 'Interpretation'],
      matrix,
    };
  }

  private appendCbcTransposedTableFromReport(pdf: jsPDF, y: number, report: any, procedureLabel: string): number {
    const d = this.getCbcTransposeDataForLabExport(report, procedureLabel);
    return this.drawPdfTransposedLabBlock(pdf, y, d.title, d.paramHeaders, d.rowLabels, d.matrix);
  }

  private appendUrinalysisTransposedTableFromReport(pdf: jsPDF, y: number, report: any, procedureLabel: string): number {
    const d = this.getUrinalysisTransposeDataForLabExport(report, procedureLabel);
    return this.drawPdfTransposedLabBlock(pdf, y, d.title, d.paramHeaders, d.rowLabels, d.matrix);
  }

  private appendParasitologyTransposedTableFromReport(pdf: jsPDF, y: number, report: any, procedureLabel: string): number {
    const d = this.getParasitologyTransposeDataForLabExport(report, procedureLabel);
    return this.drawPdfTransposedLabBlock(pdf, y, d.title, d.paramHeaders, d.rowLabels, d.matrix);
  }

  private docxCellText(v: any): string {
    return v == null || String(v).trim() === '' ? '–' : String(v);
  }

  /** Word `w:sz` half-points; default body ~11pt (22). Lab export uses slightly smaller type. */
  private readonly docxLabFontBodyHalfPt = 20;
  private readonly docxLabFontSectionHalfPt = 22;

  /** In-cell padding (DXA = twentieths of a point): small top / left emphasis. */
  private docxLabTableCellMargins() {
    return {
      marginUnitType: WidthType.DXA,
      top: 48,
      left: 72,
      bottom: 36,
      right: 48,
    } as const;
  }

  private docxLabTableCell(children: readonly (Paragraph | Table)[]): TableCell {
    return new TableCell({
      margins: this.docxLabTableCellMargins(),
      children,
    });
  }

  private docxLabTextRun(
    text: string,
    opts: { bold?: boolean; italics?: boolean; size?: number } = {}
  ): TextRun {
    return new TextRun({
      text,
      size: opts.size ?? this.docxLabFontBodyHalfPt,
      bold: opts.bold,
      italics: opts.italics,
    });
  }

  private pushDocxTransposedLabTable(
    children: unknown[],
    title: string,
    paramHeaders: string[],
    rowLabels: string[],
    matrix: string[][],
    overallTitleLine?: string | null
  ): void {
    const ot =
      overallTitleLine != null && String(overallTitleLine).trim() !== ''
        ? String(overallTitleLine).trim()
        : '';
    const titleRuns: TextRun[] = [
      this.docxLabTextRun(title, { bold: true, size: this.docxLabFontSectionHalfPt }),
    ];
    if (ot !== '') {
      titleRuns.push(
        this.docxLabTextRun(`     Overall title: ${ot}`, {
          italics: true,
          size: this.docxLabFontSectionHalfPt,
        })
      );
    }
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: titleRuns,
      })
    );
    const headerRow = new TableRow({
      children: [
        this.docxLabTableCell([new Paragraph('')]),
        ...paramHeaders.map((h) =>
          this.docxLabTableCell([
            new Paragraph({
              children: [this.docxLabTextRun(this.docxCellText(h), { bold: true })],
            }),
          ])
        ),
      ],
    });
    const bodyRows = rowLabels.map((label, r) => {
      return new TableRow({
        children: [
          this.docxLabTableCell([
            new Paragraph({
              children: [this.docxLabTextRun(label, { bold: true })],
            }),
          ]),
          ...paramHeaders.map((_, c) =>
            this.docxLabTableCell([
              new Paragraph({
                children: [this.docxLabTextRun(this.docxCellText(matrix[r]?.[c]))],
              }),
            ])
          ),
        ],
      });
    });
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...bodyRows],
      })
    );
    children.push(new Paragraph({ text: '' }));
  }

  private pushDocxFourColumnGeneralTable(
    children: unknown[],
    rows: Array<{ procedure: string; findings: string; notes: string; recommendations: string }>
  ): void {
    if (!rows.length) {
      return;
    }
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          this.docxLabTextRun('GENERAL LAB & RELATED REPORTS', {
            bold: true,
            size: this.docxLabFontSectionHalfPt,
          }),
        ],
      })
    );
    const hdrs = ['Procedure', 'Results / findings', 'Conclusion / notes', 'Recommendations'];
    const tableRows: TableRow[] = [
      new TableRow({
        children: hdrs.map((h) =>
          this.docxLabTableCell([
            new Paragraph({
              children: [this.docxLabTextRun(h, { bold: true })],
            }),
          ])
        ),
      }),
    ];
    for (const r of rows) {
      tableRows.push(
        new TableRow({
          children: [
            this.docxLabTableCell([
              new Paragraph({ children: [this.docxLabTextRun(this.docxCellText(r.procedure))] }),
            ]),
            this.docxLabTableCell([
              new Paragraph({ children: [this.docxLabTextRun(this.docxCellText(r.findings))] }),
            ]),
            this.docxLabTableCell([
              new Paragraph({ children: [this.docxLabTextRun(this.docxCellText(r.notes))] }),
            ]),
            this.docxLabTableCell([
              new Paragraph({
                children: [this.docxLabTextRun(this.docxCellText(r.recommendations))],
              }),
            ]),
          ],
        })
      );
    }
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      })
    );
    children.push(new Paragraph({ text: '' }));
  }

  /** One table: Procedure | Results/findings | Notes | Recommendations (variable row height). */
  private appendCombinedGeneralLabFourColumnTable(
    pdf: jsPDF,
    y: number,
    rows: Array<{ procedure: string; findings: string; notes: string; recommendations: string }>
  ): number {
    if (!rows.length) {
      return y;
    }
    const pageW = (pdf as any).internal.pageSize.getWidth?.() ?? 210;
    const margin = 12;
    const inner = pageW - 2 * margin;
    const w0 = inner * 0.22;
    const w1 = inner * 0.33;
    const w2 = inner * 0.225;
    const w3 = inner * 0.225;
    const widths = [w0, w1, w2, w3];
    const headers = ['Procedure', 'Results / findings', 'Conclusion / notes', 'Recommendations'];
    const pad = 1.2;
    const lineH = 3.85;
    const fs = this.pdfTableCellFontPt;

    y = this.pdfEnsurePageSpace(pdf, y, 12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('GENERAL LAB & RELATED REPORTS', margin, y);
    y += 6;

    const wrapRow = (cells: string[], header: boolean): number => {
      pdf.setFont('helvetica', header ? 'bold' : 'normal');
      pdf.setFontSize(fs);
      const wrapped: string[][] = [];
      let maxN = 1;
      for (let i = 0; i < 4; i++) {
        const raw = cells[i] ?? '';
        const text = header ? raw : raw.trim() === '' ? '–' : raw;
        const lines = pdf.splitTextToSize(text, widths[i] - pad * 2);
        wrapped.push(lines);
        maxN = Math.max(maxN, lines.length);
      }
      const rowH = Math.max(header ? 7.5 : 9, maxN * lineH + 3.2);
      let x = margin;
      for (let i = 0; i < 4; i++) {
        pdf.setDrawColor(110);
        pdf.setLineWidth(0.12);
        pdf.rect(x, y, widths[i], rowH);
        pdf.setFont('helvetica', header ? 'bold' : 'normal');
        pdf.setFontSize(fs);
        pdf.text(wrapped[i], x + pad, y + 5);
        x += widths[i];
      }
      return rowH;
    };

    y = this.pdfEnsurePageSpace(pdf, y, 10);
    y += wrapRow(headers, true);
    for (const r of rows) {
      y = this.pdfEnsurePageSpace(pdf, y, 12);
      y += wrapRow([r.procedure, r.findings, r.notes, r.recommendations], false);
    }
    return y + 4;
  }

  private appendMrdtResultsToPdf(pdf: jsPDF, y: number): number {
    y = this.pdfEnsurePageSpace(pdf, y, 8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const blocks: Array<[string, string]> = [
      ['BS', this.mrdtResult.bs],
      ['MRDT', this.mrdtResult.mrdt],
      ['Result', this.mrdtResult.result],
      ['Notes', this.mrdtResult.notes],
      ['Recommendation', this.mrdtResult.recommendation]
    ];
    for (const [lab, txt] of blocks) {
      y = this.pdfEnsurePageSpace(pdf, y, 8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${lab}:`, 12, y);
      y += 4;
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(this.pdfCellStr(txt) || '–', 186);
      pdf.text(lines, 12, y);
      y += lines.length * 4 + 2;
    }
    return y;
  }

  private appendGeneralLabResultsToPdf(pdf: jsPDF, y: number): number {
    return this.appendGeneralLabReportTableFromObject(pdf, y, this.generalResult);
  }

  /**
   * Procedure results modal — build PDF from on-screen form data (no API). Uses facility header + client table + form body.
   */
  exportProcedureResultsModalPdf(): void {
    if (this.isLoadingProcedureResults) {
      return;
    }
    if (!this.selectedProcedureResult) {
      this.responseColor = 'rgb(238, 16, 16)';
      this.responseMessage = 'Open a procedure result before printing.';
      this.showDivUpdated = true;
      setTimeout(() => (this.showDivUpdated = false), 5000);
      return;
    }
    const procName = (this.selectedProcedureResult?.procedureRequestedName || 'Procedure').toString();
    void this.ensurePdfLogoLoaded().then(() => {
      try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        let y = this.drawSystemMedicalReportCover(pdf, {
          procedureFootnote: procName.toUpperCase()
        });
        y = this.pdfEnsurePageSpace(pdf, y, 24);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(`${procName.toUpperCase()} — RESULTS`, 105, y, { align: 'center' });
        y += 7;
        const titleText = (this.procedureResultsLabReportTitle || '').trim();
        if (titleText) {
          y = this.pdfEnsurePageSpace(pdf, y, 14);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.text('Overall result / lab report title:', 12, y);
          y += 5;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(12);
          const tl = pdf.splitTextToSize(titleText, 186);
          pdf.text(tl, 12, y);
          y += tl.length * 4.6 + 4;
        }
        if (this.showResultCbcForm) {
          y = this.appendCbcResultsTableToPdf(pdf, y);
        } else if (this.showResultUrinalysisForm) {
          y = this.appendUrinalysisFiveColumnTableToPdf(pdf, y);
        } else if (this.showResultParasitologyStoolForm) {
          y = this.appendParasitologyFiveColumnTableToPdf(pdf, y);
        } else if (this.showResultMrdtForm) {
          y = this.appendMrdtResultsToPdf(pdf, y);
        } else if (this.showResultGeneralForm) {
          y = this.appendGeneralLabResultsToPdf(pdf, y);
        } else {
          y = this.pdfEnsurePageSpace(pdf, y, 6);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.text('No structured result form is active for this procedure.', 12, y);
        }
        y = this.drawPdfResultsDoneByFooter(pdf, y, this.selectedProcedureResult);
        const safe = procName.replace(/[^\w\-]+/g, '_').slice(0, 36);
        pdf.save(`lab-results-${safe}-${this.selectedProcedureResult?.id ?? 'export'}.pdf`);
      } catch (e) {
        console.error(e);
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = 'Could not create PDF.';
        this.showDivUpdated = true;
        setTimeout(() => (this.showDivUpdated = false), 5000);
      }
    });
  }

  /** Cover block: title, facility lines, branding, client grid (matches facility medical report layout). */
  private drawSystemMedicalReportCover(pdf: jsPDF, opts?: { procedureFootnote?: string }): number {
    const pageW = (pdf as any).internal.pageSize.getWidth?.() ?? (pdf as any).internal.pageSize.width ?? 210;
    const cx = pageW / 2;
    let y = 14;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('SYSTEM GENERATED MEDICAL REPORT', cx, y, { align: 'center' });
    y += 6;
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.35);
    pdf.line(12, y, pageW - 12, y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const facility = this.facilityBranding.getMedicalRecordsHeaderLine();
    const facLines = pdf.splitTextToSize(facility, pageW - 24);
    pdf.text(facLines, cx, y, { align: 'center' });
    y += facLines.length * 4 + 2;
    const contactLine = this.facilityBranding.getContactInquiryLine();
    const cLines = pdf.splitTextToSize(contactLine, pageW - 24);
    pdf.text(cLines, cx, y, { align: 'center' });
    y += cLines.length * 4 + 6;

    const brandY = y;
    this.drawMedicalReportLogo(pdf, brandY);

    y = this.drawClientDemographicsTable(pdf, brandY, pageW, opts);
    return y;
  }

  private buildProcedureReportLines(kind: string, report: any): string[] {
    if (!report || typeof report !== 'object') {
      return [];
    }
    const r = report;
    const out: string[] = [];
    const pushKV = (label: string, val: any) => {
      if (val == null || String(val).trim() === '') {
        return;
      }
      out.push(`${label}: ${val}`);
    };
    switch (kind) {
      case 'mrdt':
        pushKV('BS', r.bs);
        pushKV('MRDT', r.mrdt);
        pushKV('Result', r.result || r.report || r.findings);
        pushKV('Notes', r.notes);
        pushKV('Recommendation', r.recommendation);
        if (r.labReportTitle) {
          pushKV('Report title', r.labReportTitle);
        }
        break;
      case 'general':
        pushKV('Result / findings', r.result || r.report || r.findings);
        pushKV('Notes', r.notes);
        pushKV('Recommendation', r.recommendation);
        if (r.labReportTitle) {
          pushKV('Report title', r.labReportTitle);
        }
        break;
      case 'urinalysis':
        [
          ['pH', r.ph],
          ['SG', r.sg],
          ['Protein', r.protein],
          ['Glucose', r.glucose],
          ['Ketones', r.ketones],
          ['Blood', r.blood],
          ['Bilirubin', r.bilirubin],
          ['Urobilinogen', r.urobilinogen],
          ['Nitrite', r.nitrite],
          ['Leukocyte', r.leukocyteE || r.leukocyte],
          ['Epithelial cells', r.epithelialCells],
          ['pus cells', r.pusCellsWbcs],
          ['Casts', r.casts],
          ['Red cells', r.redCells],
          ['Crystals', r.crystals],
          ['others', r.others || r.microscopicOthers],
          ['Color', r.color],
          ['Appear', r.appearance],
          ['Volume', r.volume]
        ].forEach(([k, v]) => pushKV(k, v));
        if (r.labReportTitle) {
          pushKV('Report title', r.labReportTitle);
        }
        break;
      case 'cbc':
        [
          ['WBC', r.wbc],
          ['Lymph', r.lymph],
          ['Mid', r.mid],
          ['Gran', r.gran],
          ['Lymph %', r.lymphPercent || r.lymphPct],
          ['Mid %', r.midPercent || r.midPct],
          ['Gran %', r.granPercent || r.granPct],
          ['HGB', r.hgb],
          ['RBC', r.rbc],
          ['HCT', r.hct],
          ['MCV', r.mcv],
          ['MCH', r.mch],
          ['MCHC', r.mchc],
          ['RDW-CV', r.rdwCv || r.rdwCV],
          ['RDW-SD', r.rdwSd || r.rdwSD],
          ['PLT', r.plt],
          ['MPV', r.mpv],
          ['PDW', r.pdw],
          ['PCT', r.pct]
        ].forEach(([k, v]) => pushKV(k, v));
        if (r.labReportTitle) {
          pushKV('Report title', r.labReportTitle);
        }
        break;
      case 'parasitology':
        [
          ['Ova', r.ova],
          ['Cysts', r.cysts],
          ['Larvae', r.larvae],
          ['Color', r.color],
          ['Consistency', r.consistency],
          ['Blood', r.blood],
          ['Mucus', r.mucus],
          ['Visible parasites', r.visibleParasites],
          ['Others', r.others]
        ].forEach(([k, v]) => pushKV(k, v));
        if (r.labReportTitle) {
          pushKV('Report title', r.labReportTitle);
        }
        break;
      default:
        pushKV('Result / findings', r.result || r.report || r.findings);
        pushKV('Notes', r.notes);
        pushKV('Recommendation', r.recommendation);
    }
    return out;
  }

  private appendNonScanProcedureToPdf(
    pdf: jsPDF,
    y: number,
    entry: { item: any; kind: string; report: any }
  ): number {
    y = this.pdfEnsurePageSpace(pdf, y, 28);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const meta = `Status: ${entry.item?.status || '–'}  |  Date: ${entry.item?.dateOfProcedure || '–'}  |  Time: ${entry.item?.timeOfProcedure || '–'}  |  Ordered by: ${entry.item?.orderedBy || '–'}`;
    const metaLines = pdf.splitTextToSize(meta, 186);
    pdf.text(metaLines, 12, y);
    y += metaLines.length * 4 + 2;
    if (entry.kind === 'general') {
      y = this.appendGeneralLabReportTableFromObject(pdf, y, entry.report);
    } else {
      let lines = this.buildProcedureReportLines(entry.kind, entry.report);
      const reportTitlePrefix = 'Report title: ';
      const rtIdx = lines.findIndex((l) => l.startsWith(reportTitlePrefix));
      let reportTitleValue: string | null = null;
      if (rtIdx >= 0) {
        reportTitleValue = lines[rtIdx].slice(reportTitlePrefix.length);
        lines = lines.filter((_, i) => i !== rtIdx);
      }
      if (!lines.length && !(reportTitleValue && String(reportTitleValue).trim())) {
        lines = ['No report data on file for this procedure.'];
      }
      for (const line of lines) {
        y = this.pdfEnsurePageSpace(pdf, y, 6);
        const wrapped = pdf.splitTextToSize(line, 186);
        pdf.text(wrapped, 12, y);
        y += wrapped.length * 4 + 0.5;
      }
      if (reportTitleValue != null && String(reportTitleValue).trim() !== '') {
        y = this.pdfEnsurePageSpace(pdf, y, 14);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('Report title', 12, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        const wrappedRt = pdf.splitTextToSize(String(reportTitleValue).trim(), 186);
        pdf.text(wrappedRt, 12, y);
        y += wrappedRt.length * 4.6 + 2;
      }
    }
    y = this.drawPdfResultsDoneByFooter(pdf, y, entry.item);
    y += 3;
    pdf.setDrawColor(220);
    pdf.line(12, y, 198, y);
    y += 4;
    return y;
  }

  /**
   * Services tab — print: PDF with facility header + all non–ultrasound-scan service results for this visit.
   */
  exportCombinedNonScanProceduresReportPdf(): void {
    if (!this.visitId) {
      this.responseColor = 'rgb(238, 16, 16)';
      this.responseMessage = 'Select a visit before exporting the report.';
      this.showDivUpdated = true;
      setTimeout(() => (this.showDivUpdated = false), 5000);
      return;
    }
    const list = (this.otherProceduresRequestedList || []).filter(
      (row) => !this.isUltrasoundScanCategoryProcedure(row)
    );
    if (!list.length) {
      this.responseColor = 'rgb(238, 16, 16)';
      this.responseMessage =
        'No services to export, or only ultrasound/scan procedures are present (those are excluded from this report).';
      this.showDivUpdated = true;
      setTimeout(() => (this.showDivUpdated = false), 6000);
      return;
    }
    this.setInvoiceActionLoading(true);
    const reqs = list.map((item) => this.fetchProcedureReportForPdf$(item));
    forkJoin(reqs).subscribe({
      next: (rows) => {
        this.setInvoiceActionLoading(false);
        void this.ensurePdfLogoLoaded().then(() => {
          try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            let y = this.drawSystemMedicalReportCover(pdf);
            y = this.pdfEnsurePageSpace(pdf, y, 14);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text('PROCEDURE RESULTS (NON-SCAN SERVICES)', 105, y, { align: 'center' });
            y += 8;
            for (const entry of rows) {
              y = this.appendNonScanProcedureToPdf(pdf, y, entry as any);
            }
            pdf.save(`medical-report-visit-${this.visitId}.pdf`);
          } catch (e) {
            console.error(e);
            this.responseColor = 'rgb(238, 16, 16)';
            this.responseMessage = 'Could not build the PDF. Please try again.';
            this.showDivUpdated = true;
            setTimeout(() => (this.showDivUpdated = false), 5000);
          }
        });
      },
      error: (err: any) => {
        this.setInvoiceActionLoading(false);
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err?.message || 'Failed to load procedure reports.';
        this.showDivUpdated = true;
        setTimeout(() => (this.showDivUpdated = false), 5000);
      }
    });
  }

    printScanResults(id:any) {
      this.setInvoiceActionLoading(true);
      console.log('general us id:', id);


      this.api.exportScanResults(id).subscribe((res: Blob) => {
        this.setInvoiceActionLoading(false);

        const blob = new Blob([res], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
      
        // Create a link element and trigger a download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invoice.pdf'; // Specify the file name
        a.click();


      
        // Clean up the object URL
        window.URL.revokeObjectURL(url);
      }, (error) => {
        this.setInvoiceActionLoading(false);
        this.responseColor = "rgb(238, 16, 16)";
        this.responseMessage = error.message;


        console.error('Error generating PDF:', error);
      });
      
    }


    exportInvoicePdf() {
      this.setInvoiceActionLoading(true);
      console.log('VISIT ID FOR PDF:', this.visitId);


      this.api.exportPdf(this.visitId).subscribe((res: Blob) => {
        this.setInvoiceActionLoading(false);

        const blob = new Blob([res], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
      
        // Create a link element and trigger a download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invoice.pdf'; // Specify the file name
        a.click();


      
        // Clean up the object URL
        window.URL.revokeObjectURL(url);
      }, (error) => {
        this.setInvoiceActionLoading(false);
        this.responseColor = "rgb(238, 16, 16)";
        this.responseMessage = error.message;


        console.error('Error generating PDF:', error);
      });
      
    }

    exportStatementPdf() {
      this.openStatementExportModal();
    }

    openStatementExportModal(): void {
      this.statementExportIncludeNextOfKin = true;
      this.statementExportIncludePaymentTable = true;
      this.statementExportIncludeAmountColumns = true;
      this.statementExportIncludeFooter = true;
      this.statementExportDocumentType = 'MEDICAL_REPORT';
      this.statementExportSelectedTreatmentIds = (this.productListTreatmentRequested || [])
        .map((row) => Number(row?.id))
        .filter((id) => Number.isFinite(id) && id > 0);
      this.statementExportSelectedProcedureIds = (this.productListProceduresRequested || [])
        .map((row) => Number(row?.id))
        .filter((id) => Number.isFinite(id) && id > 0);
      setTimeout(() => {
        ($('#statementExportModal') as any).modal('show');
      }, 50);
    }

    closeStatementExportModal(): void {
      ($('#statementExportModal') as any).modal('hide');
    }

    setStatementExportDocumentType(type: 'MEDICAL_REPORT' | 'DISCHARGE_FORM' | 'MEDICAL_FORM'): void {
      this.statementExportDocumentType = type;
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
      const rows = this.productListTreatmentRequested || [];
      if (!rows.length) {
        return false;
      }
      return rows.every((row) => this.isStatementExportTreatmentSelected(row.id));
    }

    toggleAllStatementExportTreatments(checked: boolean): void {
      if (checked) {
        this.statementExportSelectedTreatmentIds = (this.productListTreatmentRequested || [])
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
      const rows = this.productListProceduresRequested || [];
      if (!rows.length) {
        return false;
      }
      return rows.every((row) => this.isStatementExportProcedureSelected(row.id));
    }

    toggleAllStatementExportProcedures(checked: boolean): void {
      if (checked) {
        this.statementExportSelectedProcedureIds = (this.productListProceduresRequested || [])
          .map((row) => Number(row?.id))
          .filter((id) => Number.isFinite(id) && id > 0);
      } else {
        this.statementExportSelectedProcedureIds = [];
      }
    }

    confirmStatementExportPdf(): void {
      const documentType = this.statementExportDocumentType || 'MEDICAL_REPORT';
      const treatmentRequestedIds = [...this.statementExportSelectedTreatmentIds];
      const procedureRequestedIds = [...this.statementExportSelectedProcedureIds];
      const includeNextOfKin = this.statementExportIncludeNextOfKin;
      const includePaymentTable = this.statementExportIncludePaymentTable;
      const includeAmountColumns = this.statementExportIncludeAmountColumns;
      const includeFooter = this.statementExportIncludeFooter;
      this.setInvoiceActionLoading(true);
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
        })
        .subscribe(
          (res: Blob) => {
            this.setInvoiceActionLoading(false);

            const blob = new Blob([res], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'statement.pdf';
            a.click();
            window.URL.revokeObjectURL(url);
          },
          (error) => {
            this.setInvoiceActionLoading(false);
            this.responseColor = 'rgb(238, 16, 16)';
            this.responseMessage = error.message;
            console.error('Error generating statement PDF:', error);
          }
        );
    }

  /**
   * Rows to include in “Lab results” Word export: lab-test invoice table plus matching rows from the
   * “other procedures” services table (urinalysis/CBC/etc. are often stored there). De-duplicates by `id`.
   */
  private getProceduresForCombinedLabDocxExport(): any[] {
    const fromLab = (this.productListProceduresRequested || []).filter(
      (row) => !this.isUltrasoundScanCategoryProcedure(row)
    );
    const fromOther = (this.otherProceduresRequestedList || []).filter(
      (row) =>
        !this.isUltrasoundScanCategoryProcedure(row) &&
        (this.isLabTestCategoryProcedureForPdf(row) ||
          this.getProcedureReportKindForPdf(row) !== 'general')
    );
    const seenIds = new Set<string | number>();
    const out: any[] = [];
    for (const row of fromLab) {
      const id = row?.id;
      if (id != null) {
        if (seenIds.has(id)) {
          continue;
        }
        seenIds.add(id);
      }
      out.push(row);
    }
    for (const row of fromOther) {
      const id = row?.id;
      if (id != null) {
        if (seenIds.has(id)) {
          continue;
        }
        seenIds.add(id);
      }
      out.push(row);
    }
    return out;
  }

  /**
   * Invoice & payment tab — download one Word (.docx) file with all lab tests for the visit (excludes ultrasound/scan).
   * CBC / urinalysis / parasitology use transposed tables; MRDT + general labs share one four-column table.
   */
  exportAllLabResultsDocx(): void {
    if (!this.visitId) {
      this.responseColor = 'rgb(238, 16, 16)';
      this.responseMessage = 'Select a visit before exporting lab results.';
      this.showDivUpdated = true;
      setTimeout(() => (this.showDivUpdated = false), 5000);
      return;
    }
    const labList = this.getProceduresForCombinedLabDocxExport();
    if (!labList.length) {
      this.responseColor = 'rgb(238, 16, 16)';
      this.responseMessage =
        'No lab tests on this visit, or only ultrasound/scan requests are present (scans are excluded).';
      this.showDivUpdated = true;
      setTimeout(() => (this.showDivUpdated = false), 6000);
      return;
    }
    this.setInvoiceActionLoading(true);
    const reqs = labList.map((item) => this.fetchProcedureReportForPdf$(item));
    forkJoin(reqs).subscribe({
      next: (rowsIn) => {
        this.setInvoiceActionLoading(false);
        void (async () => {
          try {
            const children: unknown[] = [];
            const nm = `${(this.clientFirstName || '').toString()} ${(this.clientSecondName || '').toString()}`.trim();
            children.push(
              new Paragraph({
                children: [
                  this.docxLabTextRun(
                    `Client: ${nm || '–'}  |  Visit ID: ${this.visitId}  |  Visit date: ${this.formatVisitDateForPdf()}`
                  ),
                ],
              })
            );

            const generalRows: Array<{
              procedure: string;
              findings: string;
              notes: string;
              recommendations: string;
            }> = [];

            const entries = rowsIn as Array<{ item: any; kind: string; report: any }>;
            for (const entry of entries) {
              const procName = (entry.item?.procedureRequestedName || 'Lab test').toString();
              const rep = entry.report && typeof entry.report === 'object' ? entry.report : {};
              const titleLine = this.pdfCellStr(rep.labReportTitle);

              if (entry.kind === 'cbc') {
                const d = this.getCbcTransposeDataForLabExport(rep, procName);
                this.pushDocxTransposedLabTable(children, d.title, d.paramHeaders, d.rowLabels, d.matrix);
                if (titleLine) {
                  children.push(
                    new Paragraph({
                      children: [
                        this.docxLabTextRun(`Overall title: ${titleLine}`, { italics: true }),
                      ],
                    })
                  );
                }
              } else if (entry.kind === 'urinalysis') {
                const d = this.getUrinalysisTransposeDataForLabExport(rep, procName);
                this.pushDocxTransposedLabTable(
                  children,
                  d.title,
                  d.paramHeaders,
                  d.rowLabels,
                  d.matrix,
                  titleLine || undefined
                );
              } else if (entry.kind === 'parasitology') {
                const d = this.getParasitologyTransposeDataForLabExport(rep, procName);
                this.pushDocxTransposedLabTable(children, d.title, d.paramHeaders, d.rowLabels, d.matrix);
                if (titleLine) {
                  children.push(
                    new Paragraph({
                      children: [
                        this.docxLabTextRun(`Overall title: ${titleLine}`, { italics: true }),
                      ],
                    })
                  );
                }
              } else if (entry.kind === 'mrdt') {
                const parts: string[] = [];
                const bs = this.pdfCellStr(rep.bs);
                const md = this.pdfCellStr(rep.mrdt);
                const rs = this.pdfCellStr(rep.result || rep.report || rep.findings);
                if (bs) {
                  parts.push(`BS: ${bs}`);
                }
                if (md) {
                  parts.push(`MRDT: ${md}`);
                }
                if (rs) {
                  parts.push(`Result: ${rs}`);
                }
                generalRows.push({
                  procedure: procName,
                  findings: parts.length ? parts.join('  |  ') : '–',
                  notes: this.pdfCellStr(rep.notes),
                  recommendations: this.pdfCellStr(rep.recommendation),
                });
              } else if (entry.kind === 'general') {
                generalRows.push({
                  procedure: procName,
                  findings: this.pdfCellStr(rep.result || rep.report || rep.findings),
                  notes: this.pdfCellStr(rep.notes),
                  recommendations: this.pdfCellStr(rep.recommendation),
                });
              }
            }

            this.pushDocxFourColumnGeneralTable(children, generalRows);

            const doc = new DocxDocument({
              sections: [
                {
                  properties: {
                    page: {
                      size: {
                        orientation: PageOrientation.LANDSCAPE,
                      },
                      /* Twips (dxa): ~Word “Narrow” — 0.5" top/bottom, 0.25" left/right */
                      margin: {
                        top: 720,
                        bottom: 720,
                        left: 360,
                        right: 360,
                        header: 360,
                        footer: 360,
                        gutter: 0,
                      },
                    },
                  },
                  children: children as any,
                },
              ],
            });
            const blob = await Packer.toBlob(doc);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lab-results-all-visit-${this.visitId}.docx`;
            a.click();
            window.URL.revokeObjectURL(url);
          } catch (e) {
            console.error(e);
            this.responseColor = 'rgb(238, 16, 16)';
            this.responseMessage = 'Could not build lab results Word document.';
            this.showDivUpdated = true;
            setTimeout(() => (this.showDivUpdated = false), 5000);
          }
        })();
      },
      error: (err: any) => {
        this.setInvoiceActionLoading(false);
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err?.message || 'Failed to load lab reports.';
        this.showDivUpdated = true;
        setTimeout(() => (this.showDivUpdated = false), 5000);
      },
    });
  }

    openVisit(visit:any){
      if (!this.canOpenClosedVisit) {
        this.responseColor = "rgb(238, 16, 16)";
        this.responseMessage = "You do not have permission to open a closed visit.";
        this.showDivUpdated = true;
        setTimeout(() => (this.showDivUpdated = false), 5000);
        return;
      }

      this.isUpdatingClientVisit = true;

    const data = {
      visitStatus: "open",
      userRole: this.userRole // Spread existing properties

    };

    console.log("data to close visit", data);


      
      this.api.updateVisitStatus(this.visitId, data).subscribe(
        (response: any) => {
          console.log("res all", response.data.visitStatus);

          this.visit = response.data;
  
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            this.responseColor = "rgb(238, 16, 16)"; // Red for error
            this.responseMessage = "Internal server error";
          }

          this.isUpdatingClientVisit = false;

  
          this.showDivAddToDataBase = false;

          this.loadClientVisits(this.clientId)

          this.loadInitialTriageVitalsForVisitId(response.data)
  
          setTimeout(() => {
            this.showDivUpdated = false;
            this.openVitalsModal();
          }, 2000);
        },
        (error: any) => {
          console.error("Error updating visit:", error);
  
          // Log the full error object for debugging
          console.error("Full error details:", error);
  
          // Extract the error message from the server response
          if (error.error && error.error.message) {
            this.visitCreationResponse = error.error.message; // Use the error message from the server
          } else if (error.error && error.error.error) {
            this.visitCreationResponse = error.error.error; // Fallback to error.error.error
          } else {
            this.visitCreationResponse = "An unexpected error occurred. Please try again.";
          }
          this.responseColor = "rgb(238, 16, 16)"; // Red for error

          this.isUpdatingClientVisit = false;

  
          this.visitCreationStatus = true;
  
          setTimeout(() => {
            this.visitCreationStatus = false;
          }, 10000);
        }
      );

    }









    closeVisit(visit:any){

      this.isUpdatingClientVisit = true;

    const data = {
      visitStatus: "closed", // Spread existing properties

    };

    console.log("data to close visit", data);


      
      this.api.updateVisitStatus(this.visitId, data).subscribe(
        (response: any) => {
          console.log("res all", response.data.visitStatus);

          this.visit = response.data;
  
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            this.responseColor = "rgb(238, 16, 16)"; // Red for error
            this.responseMessage = "Internal server error";
          }

          this.isUpdatingClientVisit = false;

  
          this.showDivAddToDataBase = false;

          this.loadClientVisits(this.clientId)

          this.loadInitialTriageVitalsForVisitId(response.data)
  
          setTimeout(() => {
            this.showDivUpdated = false;
            this.openVitalsModal();
          }, 2000);
        },
        (error: any) => {
          console.error("Error updating visit:", error);
  
          // Log the full error object for debugging
          console.error("Full error details:", error);
  
          // Extract the error message from the server response
          if (error.error && error.error.message) {
            this.responseMessage = error.error.message; // Use the error message from the server
          } else if (error.error && error.error.error) {
            this.responseMessage = error.error.error; // Fallback to error.error.error
          } else {
            this.responseMessage = "An unexpected error occurred. Please try again.";
          }
          this.responseColor = "rgb(238, 16, 16)"; // Red for error

          this.isUpdatingClientVisit = false;

  
          this.showDivUpdated = true;
  
          setTimeout(() => {
            this.showDivUpdated = false;
          }, 4000);
        }
      );

    }


  //initialTriageVitals: any[] = []; //Store filtered vitals



  loadInitialTriageVitalsForVisitId(visit: any): void {

    if (!visit || visit.id == null) {
      this.setNoActiveVisitState();
      return;
    }

    if (visit.visitStatus === "open") {
      this.visitStatusBadgeColor = "rgb(26, 139, 204)";
      this.isOpen = true;
      this.isClosed = false;
      this.isNoVisit = false;
 
    }

    if (visit.visitStatus === "closed") {

      this.visitStatusBadgeColor = "rgb(26, 139, 204)"; 
      this.isOpen = false;
      this.isClosed = true;
      this.isNoVisit = false;
 
    }

    this.setInvoiceActionLoading(true);


    this.visitId = visit.id;

    this.visitStatus = visit.visitStatus;

    //this.invoiceId = visit.invoice.id;

    console.log('visit status:',this.visitStatus);

    console.log('log visit:',visit);

    this.visit = visit;
    this.loadConsultation();

    // Map visit data directly to component properties if available
    // This ensures data is displayed even if API calls haven't completed yet
    if (visit.subTotal !== undefined && visit.subTotal !== null) {
      this.invoiceSubtotal = visit.subTotal;
    }
    if (visit.totalAmount !== undefined && visit.totalAmount !== null) {
      this.totalAmount = visit.totalAmount;
    }
    if (visit.balanceDue !== undefined && visit.balanceDue !== null) {
      this.applyBalanceDueFromApi(visit.balanceDue);
    }
    if (visit.amountPaid !== undefined && visit.amountPaid !== null) {
      this.amountPaid = visit.amountPaid;
    }
    // Map grandGrandTotalCost from visit if available (check both possible property names)
    const visitGrandTotal = visit.grandGrandTotalCost || visit.GrandGrandTotalCost;
    if (visitGrandTotal !== undefined && visitGrandTotal !== null) {
      this.grandGrandTotalCost = typeof visitGrandTotal === 'number' ? visitGrandTotal.toFixed(2) : visitGrandTotal.toString();
    }
    if (visit.invoice && Array.isArray(visit.invoice) && visit.invoice.length > 0) {
      const invoice = visit.invoice[0];
      if (invoice.id) {
        this.invoiceId = invoice.id;
      }
      // Also check if grandGrandTotalCost is in the invoice object
      const invoiceGrandTotal = invoice.grandGrandTotalCost || invoice.GrandGrandTotalCost;
      if (invoiceGrandTotal !== undefined && invoiceGrandTotal !== null) {
        this.grandGrandTotalCost = typeof invoiceGrandTotal === 'number' ? invoiceGrandTotal.toFixed(2) : invoiceGrandTotal.toString();
      }
    }

    console.log('TYPE MY VISITID:',visit.id);
    console.log('Mapped visit data - subTotal:', visit.subTotal, 'totalAmount:', visit.totalAmount, 'balanceDue:', visit.balanceDue, 'amountPaid:', visit.amountPaid);

    //this.getInitialVitalsSeparately();

    //console.log('initial vitals:',this.productListInitialVitals);

    this.api.getInitialVitalsByVisit(visit.id).subscribe((res) => {

      this.productListInitialVitals = res;


    });

    this.api.getConsultationsByVisit(visit.id).subscribe(
     (res) => {
    // Initialize consultation object if it doesn't exist
    if (res == null) {
        this.consultationDiagnosis = "";
        this.consultationComplaints = [];
    }else{


    this.consultationDiagnosis = res.diagnosis;
    // FUTURE: reload complaints when complaints UI is re-enabled
    /*
    if (res.complaints && Array.isArray(res.complaints)) {
      this.consultationComplaints = res.complaints.map((comp: any) => ({
        id: comp.id,
        complaintTypeId: comp.complaintType?.id || comp.complaintTypeId || comp.complaintType,
        siteId: comp.site?.id || comp.siteId || comp.site,
        type: comp.type || '',
        duration: comp.duration || '',
        natureCharacter: comp.natureCharacter || '',
        severity: comp.severity || '',
        onset: comp.onset || '',
        courseProgression: comp.courseProgression || '',
        aggravatingFactors: comp.aggravatingFactors || '',
        relievingFactors: comp.relievingFactors || '',
        associatedSymptoms: comp.associatedSymptoms || ''
      }));
    } else {
      this.consultationComplaints = [];
    }
    */
    this.consultationComplaints = [];
    console.log('Full consultation response:', res);
    console.log('Diagnosis:', res.diagnosis);
    }

  }

);

// Remove the duplicate call to getConsultationsByVisit




    this.api.getLabTestProceduresByVisit(visit.id).subscribe((res) => {
      this.productListProceduresRequested = res;
      this.calculateTotalCost();
    });



    this.api.getPaymentsMadeByVisit(visit.id).subscribe((res) => {
      this.productListPaymentsMade = res;
      this.setInvoiceActionLoading(false);


    });

    this.api.getOtherProceduresByVisit(visit.id).subscribe((res) => {
      this.otherProceduresRequestedList = res;
      this.calculateTotalCost();
    });
   
    this.api.getTreatmentRequestedByVisit(visit.id).subscribe((res) => {
      this.productListTreatmentRequested = (Array.isArray(res) ? res : []).map((row) =>
        this.normalizePharmacyTreatmentRow(row)
      );
      this.calculateTotalCost();
    });


    this.api.getUltrasoundScanProceduresByVisit(visit.id).subscribe((res) => {
      this.productListUltrasoundScanRequested = res;
      this.calculateTotalCost();
    });


    this.api.getLabTestCostByVisit(visit.id).subscribe((res) => {
      this.totalLabTestCost = res.LabTestTotal;
      this.totalScanCost = res.UltrasoundTotal;
      this.totalOtherProcedureCost = res.OtherProcedureCost;
      this.treatmentTotalCost = res.TreatmentTotalCost;
      this.consultationFee = res.ConsultationFee;
      this.invoiceId = res.InvoiceId;

      console.log('invoice id now:',this.invoiceId);

      this.invoiceSubtotal = res.InvoiceSubtotal;
      
      this.totalAmountDue = res.TotalAmountDue;
      const grandTotal = res.GrandGrandTotalCost || res.grandGrandTotalCost || 0;
      this.grandGrandTotalCost = res.TotalCostPrice;

      this.discount = res.Discount;
      this.tax = res.Tax;
      this.totalAmount = res.TotalAmount;
      this.amountPaid = res.AmountPaid;
      this.applyBalanceDueFromApi(res.BalanceDue);

      // Calculate total cost by summing all service costs
      this.calculateTotalCost();

      console.log('invoice baklance:',res.BalanceDue);
      console.log('invoice grandgrand grand (from API):', res.GrandGrandTotalCost);
      console.log('grandGrandTotalCost property:', this.grandGrandTotalCost);

      console.log('total costs:',res.TotalAmountDue);
      console.log('total costs front:',this.totalAmountDue);

    });


 


    this.currentClientVisit = `Visit ${visit.visitNumber ?? ''} [${this.formatVisitDateDayMonthYear(visit.visitDate)}]`;
    //this.visitId = visit.id;
    //this.productListProceduresRequested = visit.proceduresRequested;
    console.log(this.productListProceduresRequested);


    console.log(visit.id);
    console.log(this.initialTriageVitals);

    console.log('Selected Visit:', this.currentClientVisit);


    if (visit.proceduresRequested && visit.proceduresRequested.length > 0) {
      console.log("----- Procedures Requested -----");
      visit.proceduresRequested.forEach((procedure: any) => {
        //console.log("Procedure ID:", procedure.id);
        //console.log("Quantity:", procedure.quantity);
        //console.log("Unit Selling Price:", procedure.unitSellingPrice);
        //console.log("Total Amount:", procedure.totalAmount);
        //console.log("Report:", procedure.Report);
        //console.log("Ordered By:", procedure.orderedBy);
        //console.log("Done By:", procedure.doneBy);
        if (procedure.procedure) {
          
          this.procedureName = procedure.procedure.procedureName;

          console.log("Procedure Name:", this.procedureName);

          //console.log("Procedure Type:", procedure.procedure.procedureType);
          //console.log("Category:", procedure.procedure.category);
          //console.log("Description:", procedure.procedure.description);
          //console.log("Unit Cost Price:", procedure.procedure.unitCostPrice);
          //console.log("Unit Selling Price:", procedure.procedure.unitSellingPrice);
        }
      });
    }


  }

  private setNoActiveVisitState(): void {
    this.isNoVisit = true;
    this.isOpen = false;
    this.isClosed = false;
    this.visitId = null;
    this.visit = null;
    this.visitStatus = '';
    this.visitStatusBadgeColor = 'rgb(158, 158, 158)';
    this.currentClientVisit = 'No order — create one';
    this.setInvoiceActionLoading(false);
    this.showDivUpdatedLoaderNewVisit = false;
    this.visitSaveButtonStatus = 'Save Visit';
    this.invoiceId = null;
    this.productListInitialVitals = [];
    this.productListProceduresRequested = [];
    this.productListPaymentsMade = [];
    this.otherProceduresRequestedList = [];
    this.productListTreatmentRequested = [];
    this.productListUltrasoundScanRequested = [];
    this.consultationDiagnosis = '';
    this.consultationComplaints = [];

    if (this.clientId) {
      this.loadClientVisits(this.clientId);
    }

    this.applyClientDataFromSession();
    this.activateClientDataTab();
  }

  onClientDataTabOpened(): void {
    this.ensureClientDataLoaded();
  }

  private ensureClientDataLoaded(): void {
    this.applyClientDataFromSession();

    const id = this.clientId;
    if (!id) {
      return;
    }

    if (this.isLoadingClientBio) {
      return;
    }

    this.isLoadingClientBio = true;
    this.api.getClientById(id).subscribe({
      next: (client) => {
        this.isLoadingClientBio = false;
        if (client && typeof client === 'object') {
          const normalized = this.normalizeClientRecord(client);
          this.loadClientDataFromItem(normalized);
          sessionStorage.setItem('item', JSON.stringify(normalized));
        }
        if (this.isNoVisit) {
          this.activateClientDataTab();
        }
      },
      error: (err) => {
        this.isLoadingClientBio = false;
        console.error('Error loading client data', err);
        this.applyClientDataFromSession();
        if (this.isNoVisit) {
          this.activateClientDataTab();
        }
      }
    });
  }

  getInitialVitalsSeparately(){
    this.api.getInitialVitalsByVisit(this.visitId).subscribe((res) => {

      this.productListInitialVitals = res;
      console.log ("all initail vitals",this.productListInitialVitals)


    });
  }

  openDropdown() {
    this.resetTreatmentDrugSearch();
    if (!this.itemList?.length && !this.isLoadingDrugList) {
      this.loadDrugList();
    }
    this.isDropdownOpen = true;

    setTimeout(() => {
      const input = this.treatmentDrugSearchInputs?.first?.nativeElement;
      input?.focus();
    }, 0);
  }





  
 

  getLabTestsSeparately(){
    this.api.getLabTestProceduresByVisit(this.visitId).subscribe((res) => {
      this.productListProceduresRequested = res;
      console.log("labtest from api api:", this.productListProceduresRequested);
      this.calculateTotalCost();
    });

  }






  getPaymentsByVisitSeparately(){

    this.api.getPaymentsMadeByVisit(this.visitId).subscribe((res) => {
      this.productListPaymentsMade = res;

    });

  }


  getOtherProceduresByVisitSeparately(){

    this.api.getOtherProceduresByVisit(this.visitId).subscribe((res) => {

      this.otherProceduresRequestedList = res;
      this.calculateTotalCost();
    });

  }


  updateServicesAfterServiceOrder(){

    this.api.getOtherProceduresByVisit(this.visitId).subscribe((res) => {
      this.otherProceduresRequestedList = res;
      this.calculateTotalCost();
    });

  }




  getRequestedTreatmentByVisitSeparately(){

    this.api.getTreatmentRequestedByVisit(this.visitId).subscribe((res) => {
      this.productListTreatmentRequested = (Array.isArray(res) ? res : []).map((row) =>
        this.normalizePharmacyTreatmentRow(row)
      );
      if (this.isPharmacist) {
        this.applyVisitPharmacyStockAvailability();
        this.syncPvRxAmountReceivedToSubtotal();
      }
      this.calculateTotalCost();
      this.syncTreatmentPaginationPage();
    });

  }



  getUltrasoundScanProceduresByVisitSeparately(){

    this.api.getUltrasoundScanProceduresByVisit(this.visitId).subscribe((res) => {
      this.productListUltrasoundScanRequested = res;
      this.calculateTotalCost();
    });

  }

  getCostsRegularySeparately(){
   this.api.getLabTestCostByVisit(this.visitId).subscribe((res) => {

    this.totalLabTestCost = res.LabTestTotal;
    this.totalScanCost = res.UltrasoundTotal;
    this.totalOtherProcedureCost = res.OtherProcedureCost;
    this.treatmentTotalCost = res.TreatmentTotalCost;
    this.consultationFee = res.ConsultationFee;

    this.invoiceSubtotal = res.InvoiceSubtotal;
    
    //this.totalAmountDue = res.TotalAmountDue;
    //const grandTotal = res.GrandGrandTotalCost || res.grandGrandTotalCost || 0;
    //this.grandGrandTotalCost = typeof grandTotal === 'number' ? grandTotal.toFixed(2) : grandTotal.toString();

    this.totalAmountDue = res.TotalAmountDue;
    const grandTotal = res.GrandGrandTotalCost || res.grandGrandTotalCost || 0;
    this.grandGrandTotalCost = res.TotalCostPrice;

    this.discount = res.Discount;
    this.tax = res.Tax;
    this.totalAmount = res.TotalAmount;
    this.amountPaid = res.AmountPaid;
    this.applyBalanceDueFromApi(res.BalanceDue);

    // Calculate total cost by summing all service costs
    this.calculateTotalCost();

    console.log('invoice baklance:',res.BalanceDue);
    console.log('grandGrandTotalCost (from API):', res.GrandGrandTotalCost || res.grandGrandTotalCost);
    console.log('grandGrandTotalCost property:', this.grandGrandTotalCost);
    console.log('total costs:',res.TotalAmountDue);
    console.log('total costs front:',this.totalAmountDue);

  });}
  
  
  getInitialTriageVitalsByVisitId(visitId: string): any[] {
    const item = JSON.parse(sessionStorage.getItem("item") || "[]");
  
    if (item.clientVisits && item.clientVisits.length > 0) {
      const visit = item.clientVisits.find((v: any) => v.id === visitId);
  
      if (visit && visit.initialTriageVitals) {
        return visit.productList;
      }
    }
  
    return [];
  }



  filteredOtherProcedureList() {
    let filteredOtherProcedureList = this.procedureList ?? [];
  
    // Filter based on search text
    if (this.searchText) {
      filteredOtherProcedureList = filteredOtherProcedureList.filter((procedure) =>
        procedure.procedureName?.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  
    return filteredOtherProcedureList.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }
  




  filteredScanList() {
    let filteredScanList = this.scanList ?? []; // Ensure it's always an array
  
    // Filter based on search text
    if (this.searchText) {
      filteredScanList = filteredScanList.filter((Procedure) =>
        Procedure.procedureName?.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  
    // Sort in descending order by visitNumber
    return filteredScanList.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }

  filteredLabTestList() {
    let filteredLabTestList = this.labTestList ?? []; // Ensure it's always an array
  
    // Filter based on search text
    if (this.searchText) {
      filteredLabTestList = filteredLabTestList.filter((procedure) =>
        procedure.procedureName?.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  
    // Sort in descending order by visitNumber
    return filteredLabTestList.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }







  filteredItemList() {
    if (!Array.isArray(this.itemList)) {
      this.itemList = [];
    }

    let filteredItemList = [...this.itemList];

    if (this.treatmentDrugSearchText && this.treatmentDrugSearchText.trim()) {
      const q = this.treatmentDrugSearchText.toLowerCase().trim();
      filteredItemList = filteredItemList.filter((item) => {
        const title = String(item?.title ?? item?.name ?? '').toLowerCase();
        if (title.includes(q)) {
          return true;
        }
        const blob = [
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

    return filteredItemList.sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0));
  }






  filteredClientGroupList() {
    let filteredGroupList = this.accessControl.filterAssignableClientGroups(this.clientGroupList ?? []);
  
    // Filter based on search text
    if (this.searchText) {
      filteredGroupList = filteredGroupList.filter((clientGroup) =>
        (clientGroup.groupNameShortName || clientGroup.groupNameShortForm || clientGroup.groupName || '')
          .toLowerCase()
          .includes(this.searchText.toLowerCase())
      );
    }
  
    // Sort in descending order by visitNumber
    return filteredGroupList.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }


  filteredClientVisitList() {
    let filteredList = this.clientVisitList ?? [];

    if (this.searchText) {
      const query = this.searchText.toLowerCase().trim();

      filteredList = filteredList.filter((visit) => {
        const visitName = visit.visitName?.toLowerCase() || '';
        const visitNumber = visit.visitNumber !== undefined && visit.visitNumber !== null
          ? String(visit.visitNumber).toLowerCase()
          : '';
        const visitDate = visit.visitDate?.toLowerCase() || '';
        const visitStatus = visit.visitStatus?.toLowerCase() || '';

        return (
          visitName.includes(query) ||
          visitNumber.includes(query) ||
          visitDate.includes(query) ||
          visitStatus.includes(query)
        );
      });
    }

    // Sort in descending order by visitNumber (fallback to 0 if missing)
    return filteredList.sort((a, b) => (b.visitNumber ?? 0) - (a.visitNumber ?? 0));
  }

  formatVisitDateDayMonthYear(value: any): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    }
    const raw = String(value).trim();
    const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
    const parts = datePart.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
    }
    return raw;
  }

  formatVisitNumberTwoDigits(value: any): string {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) {
      return String(Math.trunc(n)).padStart(2, '0');
    }
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '00';
    }
    return raw.padStart(2, '0');
  }

  getVisitStatusPillColor(status: any): string {
    const s = String(status || '').toLowerCase();
    if (s === 'open') {
      return 'rgb(17, 134, 76)';
    }
    if (s === 'closed') {
      return 'rgb(108, 117, 125)';
    }
    return 'rgb(26, 139, 204)';
  }

  openEditVisitModal(visit: any, event?: Event): void {
    event?.stopPropagation();
    if (!visit) {
      return;
    }
    this.editingVisitId = Number(visit.id);
    this.editingVisitNumber = String(visit.visitNumber ?? '');
    this.applyEditVisitFormFromVisitSource(visit);
    this.showEditVisitModal = true;
    setTimeout(() => ($('#editVisitModal') as any).modal('show'), 0);
    this.isLoadingEditVisitDetails = true;
    this.api.getClientVisitByVisitId(visit.id).subscribe({
      next: (detail: any) => {
        this.applyEditVisitFormFromVisitSource(detail && typeof detail === 'object' ? detail : visit, visit);
        this.isLoadingEditVisitDetails = false;
      },
      error: () => {
        this.isLoadingEditVisitDetails = false;
      }
    });
  }

  /** Prefer API/detail object; fall back to list-row `fallback` for ids / missing keys. */
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
    const visitNo =
      row.visitNumber ?? row.visit_number ?? fb.visitNumber ?? fb.visit_number;
    this.editingVisitNumber = visitNo != null && visitNo !== '' ? String(visitNo) : '';
    const visitTypeRaw = String(pick('visitType', 'visit_type') || '').toLowerCase().replace(/\s+/g, '');
    const visitTypeNorm =
      visitTypeRaw === 'inpatient' || visitTypeRaw === 'outpatient' ? visitTypeRaw : '';
    const statusRaw = String(pick('visitStatus', 'visit_status', 'status') || 'open').toLowerCase();
    this.editVisitFormData = {
      visitDate: this.normalizeDateForInput(pick('visitDate', 'visit_date')),
      visitTime: this.normalizeTimeForInput(pick('visitTime', 'visit_time')),
      visitStatus: statusRaw === 'closed' ? 'closed' : 'open',
      visitType: visitTypeNorm,
      visitReason: String(pick('visitReason', 'visit_reason') || ''),
      clientAge: String(pick('clientAge', 'client_age') || ''),
      clientContact: String(pick('clientContact', 'client_contact') || ''),
      clientAddress: String(pick('clientAddress', 'client_address') || ''),
      nextOfKinName: String(
        pick('nextOfKinName', 'nextOfKinsName', 'next_of_kin_name', 'nextOfKin') || ''
      ),
      nextOfKinAddress: String(
        pick('nextOfKinAddress', 'nextOfKinsAddress', 'next_of_kin_address') || ''
      ),
      nextOfKinContact: String(
        pick('nextOfKinContact', 'nextOfKinsContact', 'next_of_kin_contact') || ''
      ),
      relationship: String(pick('relationship') || ''),
      occupation: String(pick('occupation', 'clientOccupation', 'client_occupation') || '')
    };
  }

  closeEditVisitModal(): void {
    this.showEditVisitModal = false;
    this.isUpdatingVisitDetails = false;
    this.isLoadingEditVisitDetails = false;
    this.editingVisitId = null;
    this.editingVisitNumber = '';
    ($('#editVisitModal') as any).modal('hide');
  }

  updateVisitDetails(form: any): void {
    if (!form?.valid || !this.editingVisitId) {
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
      occupation: this.editVisitFormData.occupation || null
    };
    this.api.updateVisit(this.editingVisitId, payload).subscribe({
      next: (res: any) => {
        this.responseColor = 'rgb(11, 155, 112)';
        this.responseMessage = res?.message || 'Visit updated successfully.';
        this.showDivUpdated = true;
        this.isUpdatingVisitDetails = false;
        this.loadClientVisits(this.clientId);
        this.closeEditVisitModal();
        setTimeout(() => (this.showDivUpdated = false), 3500);
      },
      error: (error: any) => {
        this.isUpdatingVisitDetails = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = error?.error?.message || error?.message || 'Could not update visit.';
        this.showDivUpdated = true;
        setTimeout(() => (this.showDivUpdated = false), 5000);
      }
    });
  }

  private normalizeDateForInput(value: any): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    const raw = String(value).trim();
    return raw.includes('T') ? raw.split('T')[0] : raw;
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

  toggleCollapseClearFileds(){

  }

  saveUpDateVisit(){

    
  }
  
  downloadPdf() {

    console.log(this.storedFilter);
    if (this.storedFilter===undefined){
      this.api.getItemsAdvancedSearchDteEmptyPdfUndefined();
    }else{
    

    if (this.storedFilter.datefrom === "" || this.storedFilter.dateto === "") {

      this.api.getItemsAdvancedSearchDteEmpty(this.storedFilter);
          // Handle any errors that occur during the API request
    
    } else {
      // Make an API request using this.api.getItemsAdvancedSearch(data)
      this.api.getItemsAdvancedSearchPdf(this.storedFilter);
    }
  }}

  showPreview($event: any) {
    const reader = new FileReader();
    const fileInput = $event.target;
    const file = fileInput.files[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension) {
        if (fileExtension === 'pdf') {
          this.imgSrc = '/assets/imgplaceholder.jpg';
        } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension)) {
          const reader = new FileReader();
          reader.onload = (e) => {
            this.imgSrc = e.target?.result;
          };
          reader.readAsDataURL(file);
        } else {
          this.imgSrc = '/assets/imgplaceholder.jpg';
        }
      }
    }

    reader.readAsDataURL($event.target.files[0]);
    this.selectedFile = $event.target.files[0];
    console.log(this.selectedFile);
    this.serverDirectoryName = "images";
    this.fileserver.uploadFileMethod(this.serverDirectoryName, this.selectedFile)
      .then((downloadURL) => {
        // Convert downloadURL to a string
        const downloadURLString = String(downloadURL);
        this.image = downloadURLString;
        console.log('Download URL as a string2222222:', downloadURLString);
        console.log(downloadURLString);
        console.log('new variable :', this.image);
        // Now you can use downloadURLString as a string
      })
      .catch((error) => {
        // Handle any errors
        console.error('Error:', error);
      });
  }

  exportToExcel(): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredProductList);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'table-data.xlsx');
  }

  getUserFormDataForAdvancedSearch(data: any) {
    console.log(data);
    this.storedFilter = data;
  

    if (data.datefrom === "" || data.dateto === "") {

      this.api.getItemsAdvancedSearchDteEmpty(data).subscribe(
        (response: any) => {
          this.productList = response;
          // Update 'productList' property with the response data
          this.data = response;

          console.log(this.productList);
        },
        (error: any) => {
          // Handle any errors that occur during the API request
          console.error('API request error:', error);
        }
      );

    } else {
      // Make an API request using this.api.getItemsAdvancedSearch(data)
      this.api.getItemsAdvancedSearch(data).subscribe(
        (response: any) => {
          this.productList = response;
          // Update 'productList' property with the response data
          this.data = response;
          console.log(this.productList);
        },
        (error: any) => {
          // Handle any errors that occur during the API request
          console.error('API request error:', error);
        }
      );
    }
  }

  initializeTableData() {
    this.api.getItems().subscribe((res) => {
      this.productList = res;
      this.data = res;
      //console.log("this this the response "+ res);
      //console.log("this this the data "+ this.data);
      //.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
      this.currentPage = 1;
      //console.log(this.editModal);
    });
  }

  /** Height in metres: UI stores metres (incl. paediatric); still accepts legacy cm or inches. */
  vitalHeightMeters(height: unknown): number | null {
    const h = Number(height);
    if (!isFinite(h) || h <= 0) {
      return null;
    }
    if (h >= 0.25 && h <= 2.8) {
      return h;
    }
    if (h >= 90 && h <= 260) {
      return h / 100;
    }
    if (h >= 20 && h <= 96) {
      return h * 0.0254;
    }
    return null;
  }

  /** Uses API `bmi` when present; otherwise kg and height (m / cm / inches via {@link vitalHeightMeters}). */
  computeVitalBmi(item: any): number | null {
    if (item == null) {
      return null;
    }
    const fromApi = Number(item.bmi);
    if (item.bmi != null && item.bmi !== '' && isFinite(fromApi) && fromApi > 0) {
      return Math.round(fromApi * 10) / 10;
    }
    const w = Number(item.weight);
    const hm = this.vitalHeightMeters(item.height);
    if (!isFinite(w) || w <= 0 || hm == null || hm <= 0) {
      return null;
    }
    const bmi = w / (hm * hm);
    if (!isFinite(bmi)) {
      return null;
    }
    return Math.round(bmi * 10) / 10;
  }

  formatVitalBmiForTable(item: any): string {
    const bmi = this.computeVitalBmi(item);
    return bmi == null ? '-' : String(bmi);
  }

  /** Parse systolic value from blood pressure string (e.g. "120/80"). */
  parseSystolicFromBloodPressure(bloodPressure: any): number | null {
    if (bloodPressure == null || String(bloodPressure).trim() === '') {
      return null;
    }
    const match = String(bloodPressure).trim().match(/^(\d+(?:\.\d+)?)/);
    if (!match) {
      return null;
    }
    const sbp = Number(match[1]);
    return Number.isFinite(sbp) && sbp > 0 ? sbp : null;
  }

  /** Shock Index = heart rate ÷ systolic blood pressure. */
  computeShockIndex(vital: any): number | null {
    if (!vital) {
      return null;
    }
    const hrRaw = vital.heartRate ?? vital.pulseRate;
    const hr = Number(hrRaw);
    let sbp = Number(vital.systolic);
    if (!Number.isFinite(sbp) || sbp <= 0) {
      sbp = this.parseSystolicFromBloodPressure(vital.bloodPressure) ?? NaN;
    }
    if (!Number.isFinite(hr) || hr <= 0 || !Number.isFinite(sbp) || sbp <= 0) {
      return null;
    }
    const index = hr / sbp;
    return Number.isFinite(index) ? Math.round(index * 100) / 100 : null;
  }

  getShockIndexStatus(index: number | null): 'normal' | 'critical' | null {
    if (index == null) {
      return null;
    }
    if (index > 0.9) {
      return 'critical';
    }
    if (index >= 0.5 && index <= 0.7) {
      return 'normal';
    }
    return null;
  }

  get currentShockIndex(): number | null {
    return this.computeShockIndex(this.currentVital);
  }

  get currentShockIndexStatus(): 'normal' | 'critical' | null {
    return this.getShockIndexStatus(this.currentShockIndex);
  }

  formatShockIndexDisplay(index: number | null): string {
    return index == null ? '—' : index.toFixed(2);
  }

  formatShockIndexForTable(item: any): string {
    return this.formatShockIndexDisplay(this.computeShockIndex(item));
  }

  formatPulsePressureForTable(item: any): string {
    return formatPulsePressureDisplay(item);
  }

  get currentPulsePressure(): number | null {
    return computePulsePressure(this.currentVital);
  }

  formatPulsePressureDisplayForForm(): string {
    return formatPulsePressureDisplay(this.currentVital);
  }

  getShockIndexStatusForTable(item: any): 'normal' | 'critical' | null {
    return this.getShockIndexStatus(this.computeShockIndex(item));
  }

  /** Single-cell display for vitals table: date and time together. */
  formatVitalDateTimeDisplay(item: any): string {
    const d = item?.dateTaken;
    const t = item?.timeTaken;
    const ds = d != null && String(d).trim() !== '' ? String(d).trim() : '';
    const ts = t != null && String(t).trim() !== '' ? String(t).trim() : '';
    if (!ds && !ts) {
      return '—';
    }
    if (ds && ts) {
      return `${ds} · ${ts}`;
    }
    return ds || ts;
  }

  get filteredProductList3(): any[] {
    /*setTimeout(() => {
      this.updateDisplayedList();
    });*/
    return this.productListInitialVitals.filter((item) => {
      const query = this.searchQuery.toLowerCase();
      // Check if the selectedColumn is 'all' or a specific column
      if (this.selectedColumnVitals === 'all') {
        // Search in all columns
        return (
          item.bloodPressure.toLowerCase().includes(query) ||
          item.temperature.toString().toLowerCase().includes(query) ||
          item.heartRate.toString().toLowerCase().includes(query) ||
          item.height.toString().toLowerCase().includes(query) ||
          this.formatVitalDateTimeDisplay(item).toLowerCase().includes(query) ||

          item.respiratoryRate.toString().toLowerCase().includes(query) ||
          item.spO2.toString().toLowerCase().includes(query) ||
          item.weight.toString().toLowerCase().includes(query) ||
          String(item.muac ?? '').toLowerCase().includes(query) ||
          this.formatVitalBmiForTable(item).toLowerCase().includes(query)
          // Add conditions for other columns as needed
        );
      } else {
        // Search in the selected column
        switch (this.selectedColumnVitals) {
          case 'bloodPressure':
            return item.bloodPressure.toLowerCase().includes(query);
          case 'temperature':
            return item.temperature.toString().toLowerCase().includes(query);
          case 'heartRate':
            return item.heartRate.toString().toLowerCase().includes(query);
          case 'height':
            return item.height.toString().toLowerCase().includes(query);
          case 'dateTaken':
          case 'timeTaken':
          case 'dateTime':
            return this.formatVitalDateTimeDisplay(item).toLowerCase().includes(query);
          case 'respiratoryRate':
            return item.respiratoryRate.toString().toLowerCase().includes(query);
          case 'spO2':
            return item.spO2.toString().toLowerCase().includes(query);
          case 'weight':
            return item.weight.toString().toLowerCase().includes(query);
          case 'muac':
            return String(item.muac ?? '').toLowerCase().includes(query);
          case 'bmi':
            return this.formatVitalBmiForTable(item).toLowerCase().includes(query);
          default:
            return false; // Invalid column selection
        }
      }
    });
  }

  get filteredProductList(): any[] {
    return this.productListInitialVitals.filter((item) =>
      item.title.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

//payments

  get filteredproductListPaymentsMade(): any[] {
    /*setTimeout(() => {
      this.updateDisplayedList();
    });*/
    return this.productListPaymentsMade.filter((item) => {
      const query = this.searchQuery.toLowerCase();
      // Check if the selectedColumn is 'all' or a specific column
      if (this.selectedColumnPaymentDone === 'all') {
        // Search in all columns
        return (
  
          item.amountToPay.toString().toLowerCase().includes(query) ||
          item.paymentForm.toLowerCase().includes(query) ||
          item.status.toLowerCaase().includes(query) ||
          item.notes.toLowerCase().includes(query) ||
          item.dateOfPayment.toString().toLowerCase().includes(query) ||
          item.timeOfPayment.toString().toLowerCase().includes(query)
  
          // Add conditions for other columns as needed
        );
      } else {
        // Search in the selected column
        switch (this.selectedColumnPaymentDone) {
  
          case 'amountToPay':
            return item.amountToPay.toString().toLowerCase().includes(query);
          case 'paymentForm':
            return item.paymentForm.toLowerCase().includes(query);
          case 'status':
            return item.status.toLowerCase().includes(query);
          case 'notes':
            return item.notes.toLowerCase().includes(query);
            case 'dateOfPayment':
              return item.dateOfPayment.toString().toLowerCase().includes(query);
            case 'timeOfPayment':
              return item.timeOfPayment.toString().toLowerCase().includes(query);
          default:
            return false; // Invalid column selection
        }
      }
    });
  }  

// consultations

get filteredProductListProceduresRequested(): any[] {
  /*setTimeout(() => {
    this.updateDisplayedList();
  });*/
  return this.productListProceduresRequested.filter((item) => {
    const query = this.searchQuery.toLowerCase();
    // Check if the selectedColumn is 'all' or a specific column
    if (this.selectedColumnProceduresRequested === 'all') {
      // Search in all columns
      return (


        item.dateOfProcedure.toString().toLowerCase().includes(query) ||
        item.timeOfProcedure.toString().toLowerCase().includes(query) ||
        item.report.toLowerCase().includes(query) ||
        item.orderedBy.toLowerCase().includes(query) ||
        item.doneBy.toLowerCaase().includes(query) ||
        item.quantity.toString().toLowerCase().includes(query) ||
        item.unitSellingPrice.toString().toLowerCase().includes(query) ||
        item.totalAmount.toString().toLowerCase().includes(query)

        // Add conditions for other columns as needed
      );
    } else {
      // Search in the selected column
      switch (this.selectedColumnProceduresRequested) {
        case 'DateOfProcedure':
          return item.dateOfProcedure.toString().toLowerCase().includes(query);
        case 'TimeOfProcedure':
            return item.timeOfProcedure.toString().toLowerCase().includes(query);
        case 'Report':
          return item.report.toLowerCase().includes(query);
        case 'orderedBy':
          return item.orderedBy.toLowerCase().includes(query);
        case 'doneBy':
          return item.doneBy.toLowerCase().includes(query);
        case 'quantity':
          return item.quantity.toString().toLowerCase().includes(query);
          case 'unitSellingPrice':
            return item.unitSellingPrice.toString().toLowerCase().includes(query);
          case 'totalAmount':
            return item.totalAmount.toString().toLowerCase().includes(query);
        default:
          return false; // Invalid column selection
      }
    }
  });
}

get filteredProductListConsultation(): any[] {
  return this.productListProceduresRequested.filter((item) =>
    item.title.toLowerCase().includes(this.searchQuery.toLowerCase())
  );
}


// other procedures ///

get allVisitProcedureRequests(): any[] {
  const merged = [
    ...(this.productListProceduresRequested || []),
    ...(this.productListUltrasoundScanRequested || []),
    ...(this.otherProceduresRequestedList || []),
  ];
  const byId = new Map<number, any>();
  for (const item of merged) {
    const id = Number(item?.id);
    if (Number.isFinite(id) && id > 0) {
      byId.set(id, item);
    }
  }
  return Array.from(byId.values());
}

get filteredotherProceduresRequestedList(): any[] {
  /*setTimeout(() => {
    this.updateDisplayedList();
  });*/
  return this.allVisitProcedureRequests.filter((item) => {
    const query = this.searchQuery.toLowerCase();
    // Check if the selectedColumn is 'all' or a specific column
    if (this.selectedColumnProceduresRequested === 'all') {
      // Search in all columns
      return (
        item.dateOfProcedure.toString().toLowerCase().includes(query) ||
        item.timeOfProcedure.toString().toLowerCase().includes(query) ||
        (item.report && item.report.toLowerCase().includes(query)) ||
        String(item.indication ?? '').toLowerCase().includes(query) ||
        (item.orderedBy && item.orderedBy.toLowerCase().includes(query)) ||
        (item.doneBy && item.doneBy.toLowerCase().includes(query)) ||
        String(item.quantity ?? '').toLowerCase().includes(query) ||
        item.unitSellingPrice.toString().toLowerCase().includes(query) ||
        item.totalAmount.toString().toLowerCase().includes(query)

        // Add conditions for other columns as needed
      );
    } else {
      // Search in the selected column
      switch (this.selectedColumnProceduresRequested) {
        case 'DateOfProcedure':
          return item.dateOfProcedure.toString().toLowerCase().includes(query);
        case 'TimeOfProcedure':
            return item.timeOfProcedure.toString().toLowerCase().includes(query);
        case 'Report':
          return (item.report && item.report.toLowerCase().includes(query)) || false;
        case 'indication':
          return String(item.indication ?? '').toLowerCase().includes(query);
        case 'orderedBy':
          return item.orderedBy && item.orderedBy.toLowerCase().includes(query);
        case 'doneBy':
          return item.doneBy && item.doneBy.toLowerCase().includes(query);
        case 'quantity':
          return item.quantity.toString().toLowerCase().includes(query);
          case 'unitSellingPrice':
            return item.unitSellingPrice.toString().toLowerCase().includes(query);
          case 'totalAmount':
            return item.totalAmount.toString().toLowerCase().includes(query);
        default:
          return false; // Invalid column selection
      }
    }
  });
}


// treatments//







get filteredproductListTreatmentRequested(): any[] {
  return (this.productListTreatmentRequested || []).filter((item) => {
    const query = (this.searchQuery || '').trim().toLowerCase();
    if (!query) {
      return true;
    }
    const itemName = `${item?.itemName ?? ''}`.toLowerCase();
    const quantity = `${item?.quantity ?? ''}`.toLowerCase();
    const unitSellingPrice = `${item?.unitSellingPrice ?? ''}`.toLowerCase();
    const totalAmount = `${item?.totalAmount ?? ''}`.toLowerCase();

    if (this.selectedColumnProceduresRequested === 'all') {
      return (
        itemName.includes(query) ||
        quantity.includes(query) ||
        unitSellingPrice.includes(query) ||
        totalAmount.includes(query)
      );
    }

    switch (this.selectedColumnProceduresRequested) {
      case 'title':
        return itemName.includes(query);
      case 'quantity':
        return quantity.includes(query);
      case 'unitSellingPrice':
        return unitSellingPrice.includes(query);
      case 'totalAmount':
        return totalAmount.includes(query);
      default:
        return false;
    }
  });
}

resetTreatmentPagination(): void {
  this.treatmentPage = 1;
}

syncTreatmentPaginationPage(): void {
  const total = this.filteredproductListTreatmentRequested.length;
  const perPage = Math.max(1, Number(this.itemsPerPageTreatment) || 1);
  const maxPage = Math.max(1, Math.ceil(total / perPage));
  if (this.treatmentPage > maxPage) {
    this.treatmentPage = maxPage;
  }
  if (this.treatmentPage < 1) {
    this.treatmentPage = 1;
  }
}

treatmentRowSerial(index: number): number {
  return (this.treatmentPage - 1) * this.itemsPerPageTreatment + index + 1;
}








// scan //

get filteredproductListUltrasoundScanRequested(): any[] {
  /*setTimeout(() => {
    this.updateDisplayedList();
  });*/
  return this.productListUltrasoundScanRequested.filter((item) => {
    const query = this.searchQuery.toLowerCase();
    // Check if the selectedColumn is 'all' or a specific column
    if (this.selectedColumnProceduresRequested === 'all') {
      // Search in all columns
      return (

        item.dateOfProcedure.toString().toLowerCase().includes(query) ||
        item.timeOfProcedure.toString().toLowerCase().includes(query) ||
        item.report.toLowerCase().includes(query) ||
        item.orderedBy.toLowerCase().includes(query) ||
        item.doneBy.toLowerCaase().includes(query) ||
        item.quantity.toString().toLowerCase().includes(query) ||
        item.unitSellingPrice.toString().toLowerCase().includes(query) ||
        item.totalAmount.toString().toLowerCase().includes(query)

        // Add conditions for other columns as needed
      );
    } else {
      // Search in the selected column
      switch (this.selectedColumnProceduresRequested) {
        case 'DateOfProcedure':
          return item.dateOfProcedure.toString().toLowerCase().includes(query);
        case 'TimeOfProcedure':
            return item.timeOfProcedure.toString().toLowerCase().includes(query);
        case 'Report':
          return item.report.toLowerCase().includes(query);
        case 'orderedBy':
          return item.orderedBy.toLowerCase().includes(query);
        case 'doneBy':
          return item.doneBy.toLowerCase().includes(query);
        case 'quantity':
          return item.quantity.toString().toLowerCase().includes(query);
          case 'unitSellingPrice':
            return item.unitSellingPrice.toString().toLowerCase().includes(query);
          case 'totalAmount':
            return item.totalAmount.toString().toLowerCase().includes(query);
        default:
          return false; // Invalid column selection
      }
    }
  });
}

get filteredProductListConsiltation2(): any[] {
  return this.productListProceduresRequested.filter((item) =>
    item.title.toLowerCase().includes(this.searchQuery.toLowerCase())
  );
}



















  


  get filteredProductList2(): any[] {
    return this.productListInitialVitals.filter((item) => {
      const query = this.searchQuery.toLowerCase();
      // Check if the selectedColumn is 'all' or a specific column
      switch (this.selectedColumn) {
        case 'title':
          return item.clientFirstName.toLowerCase().includes(query);
        case 'number':
          return item.clientFileNo.toLowerCase().includes(query);
        case 'category':
          return item.clientSecondName.toLowerCase().includes(query);
        case 'description':
          return item.nextOfKinName.toLowerCase().includes(query);
        case 'price':
          return item.clientGender.toLowerCase().includes(query);
        // Add cases for other columns as needed
        default:
          // If 'all' or an invalid column is selected, search in all columns
          return (
            item.clientFirstName.toLowerCase().includes(query) ||
            item.clientFileNo.toLowerCase().includes(query) ||
            item.clientSecondName.toLowerCase().includes(query) ||
            item.nextOfKinName.toLowerCase().includes(query) ||
            item.clientGender.toLowerCase().includes(query)

            // Add conditions for other columns as needed
          );
      }
    });
  }

  Search() {
    if (this.category == "") {
      this.ngOnInit();

    } else {
      this.productList = this.productList.filter(res => {
        return res.category.toLocaleLowerCase().match(this.category.toLocaleLowerCase());
      });
    }
  }

  isCollapsedMethod() {
    this.isCollapsed = false;
    this.isText = !this.isText;
    this.isText ? this.eyeIcon = "bi bi-funnel" : this.eyeIcon = "bi bi-x-square";
    this.isText ? this.eyeIconDrop = "bi bi-chevron-down" : this.eyeIconDrop = "bi bi-chevron-up";
  }

  hideShowPasswordPayment() {
    this.isText = !this.isText;
    this.isText ? this.eyeIcon = "bi bi-funnel" : this.eyeIcon = "bi bi-x-square";
    this.isText ? this.eyeIconDrop = "bi bi-chevron-down" : this.eyeIconDrop = "bi bi-chevron-up";
  }

  hideShowPasswordTaxDiscount() {
    this.isText = !this.isText;
    this.isText ? this.eyeIcon = "bi bi-funnel" : this.eyeIcon = "bi bi-x-square";
    this.isText ? this.eyeIconDrop = "bi bi-chevron-down" : this.eyeIconDrop = "bi bi-chevron-up";
  }

  hideShowPassword() {
    this.isText = !this.isText;
    this.isText ? this.eyeIcon = "bi bi-funnel" : this.eyeIcon = "bi bi-x-square";
    this.isText ? this.eyeIconDrop = "bi bi-chevron-down" : this.eyeIconDrop = "bi bi-chevron-up";
  }


  

  buttonClickIconChange() {
    this.isText = !this.isText;
    this.isText ? this.iconChange = "bi bi-chevron-down" : this.iconChange = "bi bi-chevron-up";
  }

  toggleCollapse() {
    this.isCollapsed = true;
    //this.isCollapsed = false;
    setTimeout(() => {
      this.isCollapsed = false;
    }, 0.0); // 2000 milliseconds = 2 seconds
  }

  toggleDropdown() {
    this.isCollapsedDrop = false;
  }

  handleClick() {
    if (!this.isButtonDisabled) {
      this.isButtonDisabled = true;
      const customDelayInMilliseconds = 300000;
      setTimeout(() => {
        this.isButtonDisabled = false;
      }, customDelayInMilliseconds);
    }
  }

  opennew() {
    this.testmethod = true;
    console.log(this.testmethod);
    //$('#myModalx').modal('show');
  }

  reopen() {
    //this.isButtonDisabled = false;
    this.api.getItems().subscribe((res) => {
      this.productList = res;
      this.data = res;
    });
  }

  reopenClose() {
    this.isButtonDisabled = false;
    this.api.getItems().subscribe((res) => {
      this.productList = res;
      this.data = res;
    });
  }

  openModalDeleteWarning() {
    this.showDivAll = false;
    //$('#myModalDeleteWarning').modal('show');
  }
  closeModalDeleteWarning() {
    $('#myModalDeleteWarning').modal('hide');
    this.reopen();
    this.isButtonDisabled = false;
    // Use Angular method to hide the modal
  }

  openMyModalDeleteWarningSingleItem(id: string, title: string) {
    this.showDiv = false;
    //console.log(id + title);
    this.idSingleItem = id;
    this.titleSingleItem = title;
    //$('#myModalDeleteWarningSingleItem').modal('show');

  }
  closeMyModalDeleteWarningSingleItem() {
    this.showDiv = false;
    $('#myModalDeleteWarningSingleItem').modal('hide');
    this.reopen();
    this.isButtonDisabled = false;

  }
  clearFormAdvancedSearch() {
    this.form.setValue({
      title: "",
      category: "",
      description: "",
      date: "",
      price: "",
      categoryman: "",
      priceman: "",
    })
  }

  closeModalForUpdate() {
    this.showDivUpdated = false;
    $('#myModal').modal('hide');
    this.reopen();
    this.isButtonDisabled = false;
    // Use Angular method to hide the modal
  }

  openModalEdit() {
    $('#myModal').modal('show');
    this.closeModalAdd = false;
  }

  openModalAddNewItem() {

    console.log("modeltitlenewitem before " + this.modelTitle);

    this.form.setValue({
      title: "",
      category: "",
      description: "",
      price: "",
      image: "",
    })

    this.modelTitle = "Add New Product"
    this.imgSrc = '/assets/imgplaceholder.jpg';
    this.actionButton = "Add New Product"
    this.closeModalAdd = true;
    this.closeModalUpdate = false;

    console.log("modeltitlenewitem after " + this.modelTitle);

  }
//////////////////////////////////////////////////////////////////////////////////////////////

  clearForm() {
    this.form.setValue({
      number: "",
      title: "",
      category: "",
      description: "",
      price: "",
      image: "",
    })
    this.editModal = false;
    this.showDivUpdated = false;
    this.showDivAddToDataBase = false;
    this.closeModalUpdate = false,
    this.closeModalAdd = true;
    this.image = "";
    this.imgSrc = '/assets/imgplaceholder.jpg';

    //console.log(this.editModal);
    //this.number = ''; // Clear the form field values
    // You can clear other form fields in a similar way
    this.form.resetForm(); // Reset the entire form
  }

  closeModal() {
    $('#myModal').modal('hide');
    this.reopen();
    this.isButtonDisabled = false;
    // Use Angular method to hide the modal
  }

  closeModalForAdd() {
    this.showDivAddToDataBase = false;
    $('#myModal').modal('hide');
    this.reopen();
    this.isButtonDisabled = false;
  }

  //getUserFormDataForAdvancedSearch(data: any) {
  //console.log(data);
  //this.api.getItemsAdvancedSearch(data).subscribe((res) => {
  //this.productList = res;
  //this.data = res;
  //});
  //this.api.getItems()
  // Make an HTTP GET request with the query parameters
  //console.log(data.category);
  //this.api.getItemsAdvancedSearch(data).subscribe((result) => {
  //console.log(data);
  //console.log(result);
  //this.showDivAddToDataBase = true;
  //this.showDivUpdated = false;
  //this.reopen();
  //this.handleClick();
  //console.log("search query submited successfully");
  //});
  //}

  getUserFormDataNewVisit(data: any) {
    if (this.showDivUpdatedLoaderNewVisit) {
      return;
    }
    this.showDivUpdatedLoaderNewVisit = true;

    const payload = this.buildNewVisitPayload(data);
    console.log('Create visit payload:', payload);

    if (this.visitSaveButtonStatus === 'Save Visit') {
      this.api.createNewVisit(this.clientId, payload).subscribe((response) => {
        console.log("response id", response.id);
        console.log("results", response);

        if (response && response.message) {
          this.responseColor = "rgb(11, 155, 112)";
          console.log("Message:", response.message);
          this.visitCreationResponse = response.message;
        } else {
          this.responseColor = "rgb(238, 16, 16)";
          this.visitCreationResponse = "Internal server error";
        }

        console.log("visit created successfully");

        if (response?.data) {
          sessionStorage.setItem('initialClientVisit', JSON.stringify(response.data));
          this.loadInitialTriageVitalsForVisitId(response.data);
          this.activateServicesTab();
          if (this.clientId) {
            this.loadClientVisits(this.clientId);
          }
        }

        this.showDivUpdatedLoaderNewVisit = false;
        this.visitCreationStatus = true;
        this.closeCreateVisitModal();

        setTimeout(() => {
          this.visitCreationStatus = false;
        }, 2000);
      },
        (error: any) => {
          console.error("Error saving visit:", error);
          console.error("Full error details:", error);

          if (error.error && error.error.message) {
            this.visitCreationResponse = error.error.message;
          } else if (error.error && error.error.error) {
            this.visitCreationResponse = error.error.error;
          } else {
            this.visitCreationResponse = "An unexpected error occurred. Please try again.";
          }
          this.responseColor = "rgb(238, 16, 16)";

          this.showDivUpdatedLoaderNewVisit = false;
          this.visitCreationStatus = true;

          setTimeout(() => {
            this.visitCreationStatus = false;
          }, 10000);
        }
      );

    } else {

      this.api.updateVisit(this.clientId, data).subscribe(
        (response: any) => {
          console.log("response", response);

          this.api.getItems().subscribe((res) => {
            this.productList = res;
            this.data = res;
            this.initializeTableData();
            console.log("Client list reloaded");
          });

          this.showDivUpdatedLoaderNewVisit = false;
        },
        (error: any) => {
          this.showDivUpdatedLoaderNewVisit = false;
          console.error("Error updating client", error);
        }
      );
    }
  }


 





  addtoDetails(item: any) {
    this.dataService.setSharedVariable1(item);
    this.dataService.setSharedVariable2(this.productList);
  }

  deleteProduct() {
    this.showDiv = true;
    this.api.deleteItemById(this.idSingleItem);
    this.reopen();
    console.log("item deleted successfully");
    this.reopen();
    this.handleClick();
  }

  deleteAllProduct() {
    this.showDivAll = true;
    this.api.deleteAllItems();
    this.handleClick();
    this.reopen();
    console.log("all items deleted, therefore your shop is empty");
  }

  editProduct(id: number) {
    console.log("modelTitle before "+ this.modelTitle);

    this.modelTitle="Update Product"
    this.actionButton="Update Product"

   console.log("modelTitle after "+ this.modelTitle);

   console.log("showDivUpdated before "+ this.showDivUpdated);
   console.log("closeModalAdd before "+ this.closeModalAdd);

    this.showDivUpdated = false;
    this.showDivAddToDataBase = false;

    this.closeModalAdd = false;

    this.closeModalUpdate = true;

    console.log("closeupdate after "+ this.closeModalUpdate);
    console.log("closeModalAdd after "+ this.closeModalAdd);


    this.editModal = true;

    console.log(this.editModal);
    this.currentProductId = id;
    let currentProduct = this.filteredProductList3.find((p) => { return p.id === id });
    //this.openModalEdit();
    this.imgSrc = currentProduct.image;
    console.log(currentProduct);
    this.form.setValue({
      title: currentProduct.title,
      category: currentProduct.category,
      description: currentProduct.description,
      price: currentProduct.price,
      image: currentProduct.image,
    });

    /*this.form.patchValue({
      number: currentProduct.number, // Update field1
      category: currentProduct.category, // Update field2
    });*/
  }





  addItemToCart(item:any) {

    //this.cartApi.getTotalqnt(item);

    console.log("This is the product ID: " + item.id);

    // Get the user ID from local storage
    const userId = sessionStorage.getItem('userid');
    console.log("This is the user ID: " + userId);

    // Ensure the userId and itemId are not null, and convert them to numbers (Long)
    if (!userId || !item.id) {
        console.error("User ID or Product ID is missing!");
        return;
    }

    const data = {
        userId: Number(userId), // Convert userId to a number
        shopItemId: Number(item.id) // Convert shopItemId to a number
    };


    this.api.addToCartDb(data).subscribe(
      
        response => {
            console.log("Item added to cart successfully", response);
           // console.log("Item added to cart successfully", response.data.entity.data.items);
            //console.log("Item added to cart successfully", response.data.entity.data.totalQuantity);

            this.cartItems = response.data.entity.data.items;
            //this.totalQuantity = response.data.entity.data.totalQuantity;

            const totalQuantity = Number(response.data.entity.data.totalQuantity); // Convert userId to a number


            this.dataService.setshareCartTotalQuantity(totalQuantity);



            console.log("totalquantity", totalQuantity);



          

            //sessionStorage.setItem('totalQuantity', totalQuantity);


            //this.cartApi.getTotalqnt(this.totalQuantity);

  
            // Log the response to the console
            //console.log('Cart items:', this.cartItems);
            //console.log('Total quantity:', this.totalQuantity);
                        
          },
        error => {
            console.log("Error adding item to cart", error);
        }
    );


}












  openPopup() {
    this.dialog.open(PopupComponent)
  }

  // date fileds here open
  onDateSelection(date: NgbDate) {
    if (!this.fromDate && !this.toDate) {
      this.fromDate = date;
    } else if (this.fromDate && !this.toDate && date && date.after(this.fromDate)) {
      this.toDate = date;
    } else {
      this.toDate = null;
      this.fromDate = date;
    }
  }

  isHovered(date: NgbDate) {
    return (
      this.fromDate && !this.toDate && this.hoveredDate && date.after(this.fromDate) && date.before(this.hoveredDate)
    );
  }

  isInside(date: NgbDate) {
    return this.toDate && date.after(this.fromDate) && date.before(this.toDate);
  }

  isRange(date: NgbDate) {
    return (
      date.equals(this.fromDate) ||
      (this.toDate && date.equals(this.toDate)) ||
      this.isInside(date) ||
      this.isHovered(date)
    );
  }

  validateInput(currentValue: NgbDate | null, input: string): NgbDate | null {
    const parsed = this.formatter.parse(input);
    return parsed && this.calendar.isValid(NgbDate.from(parsed)) ? NgbDate.from(parsed) : currentValue;
  }
  // date fileds here closed

  /**
   * Get contrasting text color (black or white) based on background color
   * @param bgColor - Background color in any format (hex, rgb, rgba, etc.)
   * @returns 'white' or 'black' for optimal contrast
   */
  getContrastColor(bgColor: string): string {
    if (!bgColor) return 'white';
    
    // Convert different color formats to RGB values
    let r: number, g: number, b: number;
    
    if (bgColor.startsWith('#')) {
      // Hex color
      const hex = bgColor.replace('#', '');
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else if (bgColor.startsWith('rgb')) {
      // RGB or RGBA color
      const matches = bgColor.match(/\d+/g);
      if (matches && matches.length >= 3) {
        r = parseInt(matches[0]);
        g = parseInt(matches[1]);
        b = parseInt(matches[2]);
      } else {
        return 'black';
      }
    } else {
      return 'black';
    }
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark backgrounds, black for light backgrounds
    return luminance > 0.5 ? 'black' : 'white';
  }

  // Edit Client Methods
  openEditClientModal(): void {
    const item = JSON.parse(sessionStorage.getItem('item') || '{}');
    const groupId = item.clientGroupId ?? item.clientGroup?.id ?? this.currentClientGroupId ?? null;

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
      bloodGroup: this.clientBloodGroup || '',
      clientGroupId: groupId,
      nextOfKinName: this.nextOfKinName || '',
      nextOfKinContact: this.nextOfKinContact || '',
      nextOfKinAddress: this.nextOfKinAddress || '',
      relationship: this.relationship || ''
    };

    if (groupId) {
      this.currentClientGroupId = groupId;
    }
    this.currentClientGroup = this.clientGroupName || 'Choose Group';
    this.isUpdatingClientData = false;
    this.showClientUpdateAlert = false;
    this.clientUpdateAlertMessage = '';
    this.showEditClientModal = true;
    this.loadClientGroups();

    setTimeout(() => {
      ($('#editClientModal') as any).modal('show');
    }, 100);
  }

  closeEditClientModal(): void {
    this.showEditClientModal = false;
    this.isUpdatingClientData = false;
    this.showClientUpdateAlert = false;
    ($('#editClientModal') as any).modal('hide');
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

  private showClientUpdateFeedback(message: string, isError: boolean): void {
    this.clientUpdateAlertMessage = message;
    this.responseColor = isError ? 'rgb(238, 16, 16)' : 'rgb(11, 155, 112)';
    this.showClientUpdateAlert = true;
  }

  private refreshClientDataAfterUpdate(): void {
    this.api.getItems().subscribe({
      next: (res) => {
        const updatedClient = res.find((p: any) => p.id === this.clientId);
        if (updatedClient) {
          sessionStorage.setItem('item', JSON.stringify(updatedClient));
          this.loadClientDataFromItem(updatedClient);
        }
      },
      error: (err) => console.warn('Could not refresh client after update:', err)
    });
  }

  updateClientData(form: NgForm): void {
    if (!form?.valid || this.isUpdatingClientData) {
      return;
    }

    if (!this.clientId) {
      this.showClientUpdateFeedback('Client ID is missing.', true);
      return;
    }

    const firstName = (this.editClientFormData.clientFirstName || '').trim();
    const secondName = (this.editClientFormData.clientSecondName || '').trim();

    if (!firstName || !secondName) {
      this.showClientUpdateFeedback('First name and second name are required.', true);
      return;
    }

    if (firstName.toLowerCase() === secondName.toLowerCase()) {
      this.showClientUpdateFeedback('First name and second name cannot be the same.', true);
      return;
    }

    this.isUpdatingClientData = true;
    this.showClientUpdateAlert = false;

    const ageVal = this.coerceClientAgeForEdit(this.editClientFormData.clientAge);
    const groupId =
      this.currentClientGroupId ??
      this.editClientFormData.clientGroupId ??
      null;

    const requestData = {
      clientFirstName: firstName,
      clientSecondName: secondName,
      clientContact: (this.editClientFormData.clientContact || '').trim(),
      clientAge: ageVal != null ? Number(ageVal).toFixed(2) : null,
      clientDateOfBirth: this.formatClientDateForApi(this.editClientFormData.clientDateOfBirth),
      clientGender: this.editClientFormData.clientGender || null,
      clientAddress: (this.editClientFormData.clientAddress || '').trim(),
      occupation: (this.editClientFormData.clientOccupation || '').trim(),
      bloodGroup: (this.editClientFormData.bloodGroup || '').trim() || null,
      clientGroupId: groupId,
      nextOfKinName: (this.editClientFormData.nextOfKinName || '').trim(),
      nextOfKinContact: (this.editClientFormData.nextOfKinContact || '').trim(),
      nextOfKinAddress: (this.editClientFormData.nextOfKinAddress || '').trim(),
      relationship: (this.editClientFormData.relationship || '').trim(),
      userRole: this.userRole
    };

    this.api.updateItem(this.clientId, requestData).subscribe({
      next: (response: any) => {
        this.isUpdatingClientData = false;
        const message = response?.message || 'Client data updated successfully.';
        this.responseMessage = message;
        this.responseColor = 'rgb(11, 155, 112)';
        this.showDivUpdated = true;

        this.clientFirstName = requestData.clientFirstName;
        this.clientSecondName = requestData.clientSecondName;
        this.clientContact = requestData.clientContact || '';
        this.clientAge = ageVal != null ? String(ageVal) : '';
        this.clientDateOfBirth = this.editClientFormData.clientDateOfBirth || '';
        this.clientGender = requestData.clientGender || '';
        this.clientAddress = requestData.clientAddress || '';
        this.clientOccupation = requestData.occupation || '';
        this.clientBloodGroup = requestData.bloodGroup || '';
        this.nextOfKinName = requestData.nextOfKinName || '';
        this.nextOfKinContact = requestData.nextOfKinContact || '';
        this.nextOfKinAddress = requestData.nextOfKinAddress || '';
        this.relationship = requestData.relationship || '';

        this.closeEditClientModal();
        this.refreshClientDataAfterUpdate();
        setTimeout(() => (this.showDivUpdated = false), 3500);
      },
      error: (error: any) => {
        this.isUpdatingClientData = false;
        const message =
          error?.error?.message ||
          error?.error?.error ||
          (typeof error?.error === 'string' ? error.error : null) ||
          'Failed to update client data.';
        this.showClientUpdateFeedback(message, true);
      }
    });
  }
}




