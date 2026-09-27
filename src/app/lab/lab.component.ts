import { Component, OnInit, AfterViewInit, OnDestroy, TemplateRef, ViewChild, PipeTransform, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../services/api.service';
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
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

import { NgbCalendar, NgbCollapseModule, NgbDate, NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from '../services/authentication.service';

import { NgbAlertModule, NgbDatepickerModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';


import { AsyncPipe, DecimalPipe, NgFor } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';

import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { FilterPipeModule } from 'ngx-filter-pipe';



import * as XLSX from 'xlsx';

import html2canvas from 'html2canvas';

//import jsPDF from 'jspdf';

import { getDownloadURL, ref, uploadBytesResumable, getStorage } from 'firebase/storage';
import { getApp } from 'firebase/app';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileresourceService } from '../fileservice/fileresource.service';
import { BootstrapModalHost } from '../utils/bootstrap-modal-host.util';
import { BLOOD_GROUP_OPTIONS } from '../utils/blood-group.util';
import { ClientDisplayService } from '../services/client-display.service';

declare var $: any;
declare var bootstrap: any; // Import Bootstrap JS globally if not already done

@Component({
  selector: 'app-lab',
  templateUrl: './lab.component.html',
  styleUrls: ['./lab.component.css']
})
export class LabComponent implements OnInit, AfterViewInit, OnDestroy {

  readonly bloodGroupOptions = BLOOD_GROUP_OPTIONS;

  jsonData: any[] = [];
  private readonly modalHost = new BootstrapModalHost('app-lab');

  private get storage() {
    return getStorage(getApp());
  }
  serverDirectoryName:string='';
  image:string=''
  imgSrc: any = '/assets/imgplaceholder.jpg';
  selectedFile: any;

  cartItems: any = [];
  selectedScanRequest: any = null;

  procedureProgress: any = "Progress";

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

  sono: boolean = false;


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

  isLoadingNewClientDeleteOut: boolean = true;

  showDivUpdatedLoaderDeleteOut: boolean = false;

  showDivUpdatedLoaderconsultation: boolean = false;

  showMrdtForm:boolean = false;
  showGeneralForm:boolean = false;
  showUrinalysisForm:boolean = false;
  showCbcForm:boolean = false;
  showParasitologyStoolForm:boolean = false;


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

  currentLabTest: any = {};

  currentScan: any = {};

  currentProcedure: any = {};

  currentItem: any = {};

  currentScanProcedure: any = {};

  currentOtherProcedure: any = {};

  currentInvoice: any = {};

  currentPayment: any = {};

  currentProcedureRequested: any = {};

  currentTreatmentRequested: any = {};

  currentScanProcedureRequested: any = {};

  consultation: any = {};
  consultationListByVisit: any[] = [];
  consultationDiagnosis: any;
  consultationMedicalHistory: any;
  consultationClinicalExamination: any;
  consultationDifferentialDiagnosis: any;
  consultationChiefComplaint: any;
  consultationHistoryOfPresentingComplaint: any;
  consultationAllergies: any;
  consultationFamilyHistory: any;
  consultationSocialHistory: any;
  consultationPastObstetricHistory: any = '';
  consultationPastGynaecologicalHistory: any = '';
  consultationRespiratoryExamination: any = '';
  consultationCardiovascularExamination: any = '';
  consultationCnsExamination: any = '';
  consultationAbdominalExamination: any = '';
  consultationMusculoskeletalExamination: any = '';
  consultationReviewOfOtherSystems: any = '';
  consultationFollowUpInstructions: any;
  consultationNotes: any = '';

  generalUs: any = {
    findings: '',
    test: '',
    labReportTitle: '',
    recommendation: '',
    result: ''
  };

  urinalysis: any = {
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
    pusCells: '',
    casts: '',
    redCells: '',
    crystals: '',
    others: '',
    color: '',
    appearance: '',
    volume: ''
  };

  cbc: any = {
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

  parasitologyStool: any = {
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

  cbcFields: Array<{ key: string; label: string; unit: string; ref: string }> = [
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

  private parseCbcRange(ref: string): { low: number; high: number } | null {
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

  private parseCbcResultValue(value: any): number | null {
    if (value == null || value === '') {
      return null;
    }
    const normalized = String(value).replace(/,/g, '').trim();
    const numeric = Number(normalized);
    return Number.isNaN(numeric) ? null : numeric;
  }

  private buildCbcInterpretation(resultValue: any, refRange: string): string {
    const parsedValue = this.parseCbcResultValue(resultValue);
    const parsedRange = this.parseCbcRange(refRange);
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

  updateAllCbcInterpretations(): void {
    const nextInterp: any = {};
    for (const field of this.cbcFields) {
      nextInterp[field.key] = this.buildCbcInterpretation(this.cbc[field.key], field.ref);
    }
    this.cbcInterpretation = nextInterp;
  }



  currentOtherProcedureRequested: any = {
    quantity: 1,
  };

  otherProcedureRequestedById: any = {};

  currentVitalForUpdate: any = {};

  currentProcedureId: any;

  currentScanProcedureRequestedUnitSellingPrice:any;


  showDivUpdatedLoaderSearch:boolean = true;
  isLoadingNewSearch:boolean = true;


  currentItemId: any;

  currentScanProcedureId: any;

  currentOtherProcedureId: any;

  visit: any = {};

  scanRequest: any = {};

  scanReport: any = {};


  initialVisit: any = {};

  taken:string = "Taken By"

  orderedBy:string = "Ordered By"

  doneBy:string = "Done By"

  summaryOfTheFindings:string = "";


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

  paymentStatus:string = "Status"

  procedureDoneBy:string = "Done By"

  paymentForm:string = "Cash At Hand"

  taxInvoiceUpdate:any = "Applied Tax"


  station:string = "Station"

  actionButton:string="Action Button"

  currentClientGroup: string = "Chose Group Name";


  title = "Angular Server Post Data Test"

  vitalsPage: number = 1;
  pageServices: number = 1;
  page: number = 1;


  totalBalance: string = "0.0000000"





  productListInitialVitals: any[] = [];
  productList: any[] = [];
  productListProceduresRequested: any[]= [];

  productListPaymentsMade: any[]= [];

  productListUltrasoundScanRequested: any[] = [];

  productListOtherProcedureRequested: any[] = [];

  otherProceduresRequestedList: any[] = [];

  productListTreatmentRequested: any[] = [];

  procedureName: any;

  currentClientGroupId = null;

  visitReason: string = "";
  visitType: string = "";
  
  totalCostPerItem: number = 0;

  treatmentTotalCost: any = "0.00000";
  invoiceSubtotal: any = "0.00000";
  consultationFee: any = "0.00000";


  discount: any = "0.00000";
  tax: any = "0.00000";
  totalAmount: any = "0.00000";
  balanceDue: any = "0.00000";
  amountPaid: any = "0.00000";
  
  
  

  totalLabTestCost:any = "0.00000";
  totalScanCost:any = "0.00000";
  totalOtherProcedureCost: any = "0.00000";
  totalAmountDue: any = "0.0000000";

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
  showEditClientModal: boolean = false;
  editClientFormData: any = {};
  showDivUpdatedLoaderClient: boolean = false;

  scanRequestId:any;

  dataBaseResponseColor = "";

  closeModalUpdate: boolean = false;

  testmethod: boolean = false;

  isButtonDisabled: boolean = false;

  searchTerm: any = '';

  jwt: any;
  modelTitle:string="Model Title"

  searchQuery: string = '';

  scanReportId:any;

  param1Value: string = '';

  param2Value: string = '';

  param3Value: string = '';

  currentPage: number = 1;

  itemsPerPage: number = 10; // Adjust as needed 

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

  labTestList:any[] = [];

  itemList:any[] = [];

  scanList:any[] = [];

  procedureList:any[] = [];

  clientGroup:any[] = [];

  InvoicePdf: any;


  clientFirstName: any;
  clientProfilePic:any = "assets/images/vector.jpeg";
  isLoadingProfilePic: boolean = false;
  clientFileNo: any;
  clientSecondName: any;
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
  treatmentId: any;


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

  userRole:any;

  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('serviceSearchInput') serviceSearchInput!: ElementRef;


  currentClientVisit: string = 'Choose Client Order'


  clientVisitList: any[] = []; // Initialize to hold client orders

  scanRequestsList: any[] = []; // Initialize to hold client orders
  scanRequestDateFilter: 'all' | 'today' | 'last_week' | 'this_week' | 'last_month' | 'this_month' | 'this_year' = 'all';


  initialTriageVitals: any[] = []; // Store filtered vitals


  saveButtonStatus: string = "Save Client Vitals"

  saveButtonStatusLabTest: string = "Save LabTest"

  saveButtonStatusTreatment: string = "Save Drug"

  itemToDelete: any = null;

  visitStatus:string = "Open";


  isClosed: boolean = false;
  isOpen: boolean = false;
  isNoVisit: boolean = false;
  




  visitAction:string = "Close Order";

  saveButtonStatusOtherProcedure: string = "Save Procedure"

  saveButtonStatusPayment: string = "Save Payment"

  saveButtonStatusTaxDiscount: string = "Save Discount"

  saveButtonStatusScan: string = "Save LabTest"

  saveButtonStatusScanUpdate: string = "Save LabTest"

  visitSaveButtonStatus: string = "Save Visit"



  displayedColumns: string[] = [ "temperature",
        "diastolic",
        "systolic",
        "pulseRate",
        "spO2",
        "heartRate",
        "respiratoryRate",
        "weight",
        "height",
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
    private clientDisplay: ClientDisplayService,
    private cdr: ChangeDetectorRef,
    ) {
    this.fromDate = calendar.getToday();
    this.toDate = calendar.getNext(calendar.getToday(), 'd', 10);
  }

  // Check if screen is small (mobile/tablet)
  isSmallScreen(): boolean {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 992; // Bootstrap's lg breakpoint (992px)
    }
    return false;
  }

  // Listen to window resize events
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    const userRole = (sessionStorage.getItem('userrole') || '').toString().trim().toLowerCase();
    const currentRoute = this.router.url;
    
    // Only redirect if user has 'lab' role
    if (userRole?.toLowerCase() === 'lab') {
      if (this.isSmallScreen() && (currentRoute.includes('/lab') && !currentRoute.includes('/lab-mobile'))) {
        this.router.navigate(this.labMobileRoute());
      } else if (!this.isSmallScreen() && currentRoute.includes('/lab-mobile')) {
        this.router.navigate(this.labDesktopRoute());
      }
    }
  }

  private labMobileRoute(): string[] {
    return ['/overview/lab-mobile'];
  }

  private labDesktopRoute(): string[] {
    return ['/overview/lab-v2'];
  }




  ngOnInit(): void {
    const item = JSON.parse(sessionStorage.getItem("item") || '{}');

    this.initialVisit = JSON.parse(sessionStorage.getItem("initialClientVisit") || '{}');

    this.clientFirstName = item.clientFirstName;
    this.clientSecondName = item.clientSecondName;
    this.clientProfilePic = item.clientProfilePic;
    this.clientFileNo = item.clientFileNo;
    this.clientId = item.id;


    if (this.clientId) {
      this.api.getTotalClientBalanceDue(this.clientId).subscribe((res) => {
        this.totalAmountDue = res.TotalAmountDue;
      });
    }

    
    //console.log("Client orders", clientVis);

    
    const userRole = sessionStorage.getItem('userrole');

    this.userName = sessionStorage.getItem('username');

    this.userRole = userRole;
    this.mdUser = (userRole || '').toLowerCase().trim() === 'md';


    if (this.userName === null) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.isSmallScreen() && userRole?.toLowerCase() === 'lab') {
      this.router.navigate(this.labMobileRoute());
      return;
    }

    if (this.initialVisit?.id) {
      this.loadInitialTriageVitalsForVisitId(this.initialVisit);
    }

    this.resetPageLoadingFlags();
    setTimeout(() => this.loadScanRequests(), 0);
  }

  ngAfterViewInit(): void {
    this.modalHost.cleanupStrayLayers();
    setTimeout(() => {
      const tabTriggers = document.querySelectorAll('#nav-tab [data-bs-toggle="tab"]');
      tabTriggers.forEach((trigger) => {
        trigger.addEventListener('shown.bs.tab', () => this.resetLabTabScrollPosition());
      });
      this.resetLabTabScrollPosition();
    }, 0);
  }

  ngOnDestroy(): void {
    this.modalHost.teardown();
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
    this.showDivUpdatedLoaderInvoice = false;
  }

  private resetLabTabScrollPosition(): void {
    const mainPane = document.getElementById('labMainContentPane');
    const tabContent = document.getElementById('nav-tabContent');
    const activeTabPane = document.querySelector('#nav-tabContent .tab-pane.active.show') as HTMLElement | null;

    if (mainPane) mainPane.scrollTop = 0;
    if (tabContent) tabContent.scrollTop = 0;
    if (activeTabPane) activeTabPane.scrollTop = 0;
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


      this.currentPayment.amountToPay = res.balanceDue;
      

    });

  }


  // Helper method to get client profile picture with fallback
  getClientProfilePic(): string {
    return this.clientProfilePic || 'assets/images/vector.jpeg';
  }

  // Handle image loading errors
  onImageError(event: any): void {
    console.log('Image failed to load, using fallback');
    event.target.src = 'assets/images/vector.jpeg';
    this.clientProfilePic = 'assets/images/vector.jpeg';
    this.isLoadingProfilePic = false;
  }

  // Handle successful image load
  onImageLoad(event: any): void {
    console.log('Image loaded successfully');
    this.isLoadingProfilePic = false;
  }

selectScanRequest(scanRequest: any) {

  console.log("scan request category",scanRequest.category);

  this.showMrdtForm = false;
  this.showGeneralForm = false;
  this.showUrinalysisForm = false;
  this.showCbcForm = false;
  this.showParasitologyStoolForm = false;

  if (scanRequest.category == "malaria test") {
    this.showMrdtForm = true;
    this.showGeneralForm = false;
  } else {
     const requestName = (scanRequest.procedureRequestedName || '').toString().toLowerCase();
     if(requestName == "urinalysis"){
      this.showUrinalysisForm = true;

    }else{
       if (requestName == "cbc" || requestName.includes("cbc")) {
         this.showCbcForm = true;
       } else {
         if (requestName == "parasitology stool" || requestName == "parasitologystool" || requestName.includes("parasitology stool")) {
           this.showParasitologyStoolForm = true;
         } else {
           this.showMrdtForm = false;
           this.showUrinalysisForm = false;
           this.showGeneralForm = true;
         }
       }
    }

  }



  this.selectedScanRequest = scanRequest;
  this.loadVisitClinicalDataFromLabRequest(scanRequest);
  
  // Extract client information from scanRequest (checking both direct properties and nested client object)
  if (scanRequest) {
    // Debug: Log the scanRequest structure to see what's available
    console.log('scanRequest object:', scanRequest);
    console.log('scanRequest pic:', scanRequest.clientProfilePic);
    console.log('scanRequest.visit:', scanRequest.visit);
    console.log('scanRequest.visit?.client:', scanRequest.visit?.client);
    console.log('scanRequest.visit?.client?.clientFileNo:', scanRequest.visit?.client?.clientFileNo);

    // Basic client info
    this.clientFirstName = scanRequest.clientFirstName || scanRequest.client?.clientFirstName || scanRequest.visit?.client?.clientFirstName || '';
    this.clientSecondName = scanRequest.clientSecondName || scanRequest.client?.clientSecondName || scanRequest.visit?.client?.clientSecondName || '';

    // Client Profile Picture - prioritize visit.client.clientProfilePic
    // Reset first to force image reload when switching between requests
    const newProfilePic = scanRequest.visit?.client?.clientProfilePic ||
                         scanRequest.clientProfilePic ||
                         scanRequest.client?.clientProfilePic ||
                         'assets/images/vector.jpeg';

    // Set loading state when image changes
    if (this.clientProfilePic !== newProfilePic) {
      this.isLoadingProfilePic = true;
      this.clientProfilePic = '';
      setTimeout(() => {
        this.clientProfilePic = newProfilePic;
      }, 0);
    } else {
      this.clientProfilePic = newProfilePic;
      this.isLoadingProfilePic = false;
    }

    console.log('Extracted clientProfilePic:', this.clientProfilePic);
    console.log('scanRequest.visit?.client?.clientProfilePic:', scanRequest.visit?.client?.clientProfilePic);

    // Client File Number - check multiple paths and property name variations
    this.clientFileNo = scanRequest.visit?.client?.clientFileNo ||
                         scanRequest.visit?.client?.clientFileNumber ||
                         scanRequest.clientFileNo ||
                         scanRequest.clientFileNumber ||
                         scanRequest.client?.clientFileNo ||
                         scanRequest.client?.clientFileNumber ||
                         '';

    console.log('Extracted clientFileNo:', this.clientFileNo);

    // Client ID - prioritize visit.client.id as per API response structure
    this.clientId = scanRequest.visit?.client?.id ||
                     scanRequest.visit?.client?.clientId ||
                     scanRequest.clientId ||
                     scanRequest.client?.id ||
                     '';

    console.log('Extracted clientId:', this.clientId);
    console.log('scanRequest.visit?.client?.id:', scanRequest.visit?.client?.id);

    // Additional client demographics
    this.clientAge = scanRequest.clientAge || scanRequest.client?.clientAge || scanRequest.visit?.client?.clientAge || '';
    this.clientDateOfBirth = scanRequest.clientDateOfBirth || scanRequest.client?.clientDateOfBirth || scanRequest.visit?.client?.clientDateOfBirth || '';

    // Client Contact - prioritize visit.client.clientContact as per API response structure
    this.clientContact = scanRequest.visit?.client?.clientContact ||
                         scanRequest.clientContact ||
                         scanRequest.client?.clientContact ||
                         scanRequest.clientPhone ||
                         scanRequest.client?.phone ||
                         scanRequest.visit?.client?.phone ||
                         scanRequest.visit?.client?.clientPhone ||
                         '';

    console.log('Extracted clientContact:', this.clientContact);
    console.log('scanRequest.visit?.client?.clientContact:', scanRequest.visit?.client?.clientContact);

    // Client Group Name - check multiple paths
    this.clientGroupName = scanRequest.visit?.client?.clientGroupName ||
                           scanRequest.visit?.client?.clientGroup?.groupNameShortForm ||
                           scanRequest.visit?.client?.clientGroup?.groupName ||
                           scanRequest.clientGroupName ||
                           scanRequest.client?.clientGroupName ||
                           scanRequest.client?.clientGroup?.groupNameShortForm ||
                           scanRequest.client?.clientGroup?.groupName ||
                           scanRequest.clientGroup?.groupNameShortForm ||
                           scanRequest.clientGroup?.groupName ||
                           '';

    this.clientAddress = scanRequest.clientAddress || scanRequest.client?.clientAddress || scanRequest.visit?.client?.clientAddress || '';
    this.clientGender = scanRequest.clientGender || scanRequest.client?.clientGender || scanRequest.visit?.client?.clientGender || scanRequest.gender || scanRequest.client?.gender || scanRequest.visit?.client?.gender || '';
    this.clientOccupation = scanRequest.clientOccupation || scanRequest.client?.clientOccupation || scanRequest.visit?.client?.clientOccupation || scanRequest.occupation || scanRequest.client?.occupation || scanRequest.visit?.client?.occupation || '';
    this.clientBloodGroup = scanRequest.bloodGroup || scanRequest.client?.bloodGroup || scanRequest.visit?.client?.bloodGroup || '';

    // Next of kin information
    this.nextOfKinName = scanRequest.nextOfKinName || scanRequest.client?.nextOfKinName || scanRequest.visit?.client?.nextOfKinName || '';
    this.nextOfKinContact = scanRequest.nextOfKinContact || scanRequest.client?.nextOfKinContact || scanRequest.visit?.client?.nextOfKinContact || '';
    this.nextOfKinAddress = scanRequest.nextOfKinAddress || scanRequest.client?.nextOfKinAddress || scanRequest.visit?.client?.nextOfKinAddress || '';
    this.relationship = scanRequest.relationship || scanRequest.client?.relationship || scanRequest.visit?.client?.relationship || '';

    // Medical info
    this.diagnosis = scanRequest.diagnosis || scanRequest.client?.diagnosis || scanRequest.visit?.client?.diagnosis || '';
    this.refreshSelectedClientFromEntity(scanRequest);
  }

  if (this.showMrdtForm) {
    this.loadScanReportForThatRquest(scanRequest);
  } else if (this.showUrinalysisForm) {
    this.loadUrinalysisReportForRequest(scanRequest);
  } else if (this.showCbcForm) {
    this.loadCbcReportForRequest(scanRequest);
  } else if (this.showParasitologyStoolForm) {
    this.loadParasitologyStoolReportForRequest(scanRequest);
  } else {
    this.loadGeneralLabReportForRequest(scanRequest);
  }
}

getRequestClientName(request: any): string {
  return this.clientDisplay.getDisplayName(request);
}

private applyClientProfileFromEntity(client: any): void {
  if (!client) {
    return;
  }

  this.clientFirstName = client.clientFirstName || '';
  this.clientSecondName = client.clientSecondName || '';
  this.clientFileNo = client.clientFileNo || this.clientFileNo || '';
  this.clientContact = client.clientContact || this.clientContact || '';
  this.clientAge = client.clientAge || this.clientAge || '';
  this.clientDateOfBirth = client.clientDateOfBirth || this.clientDateOfBirth || '';
  this.clientGender = client.clientGender || this.clientGender || '';
  this.clientAddress = client.clientAddress || this.clientAddress || '';
  this.clientOccupation = client.clientOccupation || this.clientOccupation || '';
  this.clientBloodGroup = client.bloodGroup || this.clientBloodGroup || '';
  this.nextOfKinName = client.nextOfKinName || this.nextOfKinName || '';
  this.nextOfKinContact = client.nextOfKinContact || this.nextOfKinContact || '';
  this.nextOfKinAddress = client.nextOfKinAddress || this.nextOfKinAddress || '';
  this.relationship = client.relationship || this.relationship || '';
  this.diagnosis = client.diagnosis || this.diagnosis || '';

  if (client.clientProfilePic) {
    const normalizedPic = client.clientProfilePic;
    if (this.clientProfilePic !== normalizedPic) {
      this.isLoadingProfilePic = true;
      this.clientProfilePic = '';
      setTimeout(() => {
        this.clientProfilePic = normalizedPic;
      }, 0);
    } else {
      this.clientProfilePic = normalizedPic;
    }
  }
}

private refreshSelectedClientFromEntity(scanRequest: any): void {
  const clientId = this.clientDisplay.extractClientId(scanRequest);
  if (!clientId) {
    return;
  }

  this.clientId = clientId;
  const cached = this.clientDisplay.getCachedClient(clientId);
  if (cached) {
    this.applyClientProfileFromEntity(cached);
  }

  this.clientDisplay.refreshClient(clientId).subscribe((client) => {
    if (client) {
      this.applyClientProfileFromEntity(client);
      this.cdr.detectChanges();
    }
  });
}

private loadVisitClinicalDataFromLabRequest(labRequest: any): void {
  const visitObj = labRequest?.visit;
  const visitId =
    visitObj?.id ??
    labRequest?.visitId ??
    labRequest?.clientVisitId ??
    null;

  if (!visitId) {
    this.productListInitialVitals = [];
    this.consultationListByVisit = [];
    this.consultation = {};
    return;
  }

  this.visitId = visitId;

  this.api.getInitialVitalsByVisit(visitId).subscribe({
    next: (res: any) => {
      this.productListInitialVitals = Array.isArray(res) ? res : [];
    },
    error: () => {
      this.productListInitialVitals = [];
    }
  });

  this.loadConsultation();
}

formatVitalDateTimeDisplay(item: any): string {
  const date = (item?.dateTaken || '').toString().trim();
  const time = (item?.timeTaken || '').toString().trim();
  if (date && time) return `${date} ${time}`;
  return date || time || '-';
}

formatVitalBmiForTable(item: any): string {
  const bmiRaw = item?.bmi;
  if (bmiRaw !== undefined && bmiRaw !== null && bmiRaw !== '') {
    const n = Number(bmiRaw);
    return Number.isFinite(n) ? n.toFixed(2) : `${bmiRaw}`;
  }
  const h = Number(item?.height);
  const w = Number(item?.weight);
  if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) return '-';
  // Support legacy inputs where height may be in centimeters.
  const heightMeters = h > 3 ? h / 100 : h;
  if (heightMeters <= 0) return '-';
  return (w / (heightMeters * heightMeters)).toFixed(2);
}

loadParasitologyStoolReportForRequest(scanRequest: any) {
  this.isLoadingClientVisits = true;
  this.scanRequestId = scanRequest.id;
  this.scanRequest = scanRequest;

  this.api.getParasitologyStoolReportByRequestId(scanRequest.id).subscribe((res: any) => {
    this.isLoadingClientVisits = false;
    const report = res?.data ?? res ?? {};
    this.scanReport = report;
    this.parasitologyStool = {
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
    this.generalUs.labReportTitle = report.labReportTitle || '';
    this.scanReportId = report.id;

    if (res && res.message) {
      this.responseColor = "rgb(11, 155, 112)";
      this.visitCreationResponse = res.message;
    } else {
      this.responseColor = "rgb(238, 16, 16)";
      this.visitCreationResponse = "Internal server error";
    }
    this.visitCreationStatus = true;
    setTimeout(() => {
      this.visitCreationStatus = false;
    }, 4000);
  }, () => {
    this.isLoadingClientVisits = false;
  });
}

createParasitologyStoolReportForRequest(scanRequest: any) {
  const fallbackPayload = {
    doneBy: this.userName || '',
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

  this.api.createParasitologyStoolReportByRequest(scanRequest).subscribe(
    (res: any) => {
      const report = res?.data ?? res ?? {};
      this.scanReport = report;
      this.parasitologyStool = {
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
      this.scanReportId = report.id || this.scanReportId;
    },
    () => {
      this.api.createParasitologyStoolReportByRequestId(scanRequest.id, fallbackPayload).subscribe((res: any) => {
        const report = res?.data ?? res ?? {};
        this.scanReport = report;
        this.parasitologyStool = {
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
        this.scanReportId = report.id || this.scanReportId;
      });
    }
  );
}

loadCbcReportForRequest(scanRequest: any) {
  this.isLoadingClientVisits = true;
  this.scanRequestId = scanRequest.id;
  this.scanRequest = scanRequest;

  this.api.getCbcReportByRequestId(scanRequest.id).subscribe((res: any) => {
    this.isLoadingClientVisits = false;
    const report = res?.data ?? res ?? {};
    this.scanReport = report;
    this.cbc = {
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
    this.generalUs.labReportTitle = report.labReportTitle || '';
    this.updateAllCbcInterpretations();
    this.scanReportId = report.id;

    if (res && res.message) {
      this.responseColor = "rgb(11, 155, 112)";
      this.visitCreationResponse = res.message;
    } else {
      this.responseColor = "rgb(238, 16, 16)";
      this.visitCreationResponse = "Internal server error";
    }
    this.visitCreationStatus = true;
    setTimeout(() => {
      this.visitCreationStatus = false;
    }, 4000);
  }, () => {
    this.isLoadingClientVisits = false;
  });
}

loadUrinalysisReportForRequest(scanRequest: any) {
  this.isLoadingClientVisits = true;
  this.scanRequestId = scanRequest.id;
  this.scanRequest = scanRequest;

  this.api.getUrinalysisReportByRequestId(scanRequest.id).subscribe((res: any) => {
    this.isLoadingClientVisits = false;
    const report = res?.data ?? res ?? {};
    this.scanReport = report;
    
    this.urinalysis = {
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
      pusCells: report.pusCellsWbcs || res?.data?.pusCellsWbcs || res?.pusCellsWbcs || '',
      casts: report.casts || '',
      redCells: report.redCells || '',
      crystals: report.crystals || '',
      others: report.others || report.microscopicOthers || '',
      color: report.color || '',
      appearance: report.appearance || '',
      volume: report.volume || ''
    };
    this.generalUs.labReportTitle = report.labReportTitle || '';
    this.scanReportId = report.id;

    if (res && res.message) {
      this.responseColor = "rgb(11, 155, 112)"; // Green for success
      console.log("Message:", res.message);
      this.visitCreationResponse = res.message;
    } else {
      this.responseColor = "rgb(238, 16, 16)"; // Red for error
      this.visitCreationResponse = "Internal server error";
    }

    this.visitCreationStatus = true;

    setTimeout(() => {
      this.visitCreationStatus = false;
    }, 4000);
  }, () => {
    this.isLoadingClientVisits = false;
  });
}

createUrinalysisReportForRequest(scanRequest: any) {
  const fallbackPayload = {
    doneBy: this.userName || '',
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
    pusCells: '',
    casts: '',
    redCells: '',
    crystals: '',
    others: '',
    color: '',
    appearance: '',
    volume: ''
  };

  const loadCreated = () => {
      this.api.getUrinalysisReportByRequestId(scanRequest.id).subscribe((res: any) => {
      const report = res?.data ?? res ?? {};
      this.scanReport = report;
      
      this.urinalysis = {
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
        pusCells: report.pusCellsWbcs || res?.data?.pusCellsWbcs || res?.pusCellsWbcs || '',
        casts: report.casts || '',
        redCells: report.redCells || '',
        crystals: report.crystals || '',
        others: report.others || report.microscopicOthers || '',
        color: report.color || '',
        appearance: report.appearance || '',
        volume: report.volume || ''
      };
      this.scanReportId = report.id || this.scanReportId;
    });
  };

  this.api.createUrinalysisReportByRequest(scanRequest).subscribe(
    () => loadCreated(),
    () => {
      this.api.createUrinalysisReportByRequestId(scanRequest.id, fallbackPayload).subscribe(() => {
        loadCreated();
      });
    }
  );
}

loadGeneralLabReportForRequest(scanRequest: any) {


  this.isLoadingClientVisits = true;
  this.scanRequestId = scanRequest.id;
  this.scanRequest = scanRequest;

  this.api.getGeneralLabReportByRequestId(scanRequest.id).subscribe((res: any) => {
    this.isLoadingClientVisits = false;
    const report = res?.data ?? res ?? {};
    if (!report || !report.id || (typeof report?.message === 'string' && report.message.toLowerCase().includes('not found'))) {
      this.createGeneralLabReportForRequest(scanRequest);
      return;
    }
    this.scanReport = report;
    this.generalUs.result = report.result || report.report || report.findings || '';
    this.generalUs.notes = report.notes || '';
    this.generalUs.recommendation = report.recommendation || '';
    this.scanReportId = report.id;


    if (res && res.message) {
      this.responseColor = "rgb(11, 155, 112)"; // Green for success
      console.log("Message:", res.message);
      this.visitCreationResponse = res.message;
    } else {
      this.responseColor = "rgb(238, 16, 16)"; // Red for error
      this.visitCreationResponse = "Internal server error";
    }

    this.visitCreationStatus = true;


    setTimeout(() => {
      this.visitCreationStatus = false;
    }, 4000);


  },);
}

  createGeneralLabReportForRequest(scanRequest: any) {
    const fallbackPayload = {
      doneBy: this.userName || '',
      recommendation: '',
      result: '',
      notes: ''
    };

    //this.api.createGeneralLabReportByRequest(scanRequest.id,fallbackPayload).subscri

   
      this.api.createGeneralLabReportByRequestId(scanRequest.id, fallbackPayload).subscribe((res: any) => {
        const report = res?.data ?? res ?? {};
        this.scanReport = report;
        this.generalUs.result = report.result || report.report || report.findings || '';
        this.generalUs.notes = report.notes || '';
        this.generalUs.recommendation = report.recommendation || '';
        this.scanReportId = report.id || this.scanReportId;

        if (res && res.message) {
          this.responseColor = "rgb(11, 155, 112)"; // Green for success
          console.log("Message:", res.message);
          this.visitCreationResponse = res.message;
        } else {
          this.responseColor = "rgb(238, 16, 16)"; // Red for error
          this.visitCreationResponse = "Internal server error";
        }
    
        this.visitCreationStatus = true;
    
    
        setTimeout(() => {
          this.visitCreationStatus = false;
        }, 4000);
      });
    

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
      const consultations = this.normalizeConsultationResponse(res);
      this.consultationListByVisit = consultations;
      const latestConsultation = consultations[0] || {};
      this.consultation = latestConsultation;
      this.consultationDiagnosis = latestConsultation.diagnosis || '';
      this.consultationMedicalHistory = latestConsultation.medicalHistory || '';
      this.consultationClinicalExamination = latestConsultation.clinicalExamination || '';
      this.consultationDifferentialDiagnosis = latestConsultation.differentialDiagnosis || '';
      this.consultationChiefComplaint = latestConsultation.chiefComplaint || '';
      this.consultationHistoryOfPresentingComplaint = latestConsultation.historyOfPresentingComplaint || '';
      this.consultationAllergies = latestConsultation.allergies || '';
      this.consultationFamilyHistory = latestConsultation.familyHistory || '';
      this.consultationSocialHistory = latestConsultation.socialHistory || '';
      if (this.isFemaleClient()) {
        this.consultationPastObstetricHistory = latestConsultation.pastObstetricHistory || '';
        this.consultationPastGynaecologicalHistory = latestConsultation.pastGynaecologicalHistory || '';
      } else {
        this.consultationPastObstetricHistory = '';
        this.consultationPastGynaecologicalHistory = '';
      }
      this.consultationRespiratoryExamination = latestConsultation.respiratoryExamination || '';
      this.consultationCardiovascularExamination = latestConsultation.cardiovascularExamination || '';
      this.consultationCnsExamination = latestConsultation.cnsExamination || '';
      this.consultationAbdominalExamination = latestConsultation.abdominalExamination || '';
      this.consultationMusculoskeletalExamination = latestConsultation.musculoskeletalExamination || '';
      this.consultationReviewOfOtherSystems = latestConsultation.reviewOfOtherSystems || '';
      this.consultationFollowUpInstructions = latestConsultation.followUpInstructions || '';
      this.consultationNotes = latestConsultation.notes || '';
      console.log(res);

    });
  }

  private normalizeConsultationResponse(res: any): any[] {
    if (Array.isArray(res)) return res;
    return res ? [res] : [];
  }

  isFemaleClient(): boolean {
    const gender = (this.clientGender ?? '').toString().trim().toLowerCase();
    return gender === 'female' || gender === 'f';
  }


  getUserFormDataConsultation(data: any){

    this.responseColor = "";

   console.log("data for scan report", data);


    this.showDivUpdatedLoaderconsultation = true;

    if (!this.scanReportId) {
      this.responseMessage = "Missing scanReport Id";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivAddToDataBaseConsultation = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBaseConsultation = false;
        }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }

    if (!this.userName) {
      this.responseMessage = "Missing labtechnician's initials";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivAddToDataBaseConsultation = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBaseConsultation = false;
        }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }


        const cbcPayload = this.showCbcForm ? (() => {
          this.updateAllCbcInterpretations();
          const interpretations: Record<string, string> = {};
          for (const field of this.cbcFields) {
            const v = this.cbcInterpretation[field.key];
            interpretations[field.key] =
              v != null && v !== '' ? String(v) : '';
          }
          return {
            wbc: this.cbc.wbc,
            lymph: this.cbc.lymph,
            mid: this.cbc.mid,
            gran: this.cbc.gran,
            lymphPercent: this.cbc.lymphPercent,
            midPercent: this.cbc.midPercent,
            granPercent: this.cbc.granPercent,
            hgb: this.cbc.hgb,
            rbc: this.cbc.rbc,
            hct: this.cbc.hct,
            mcv: this.cbc.mcv,
            mch: this.cbc.mch,
            mchc: this.cbc.mchc,
            rdwCv: this.cbc.rdwCv,
            rdwSd: this.cbc.rdwSd,
            plt: this.cbc.plt,
            mpv: this.cbc.mpv,
            pdw: this.cbc.pdw,
            pct: this.cbc.pct,
            labReportTitle: this.generalUs.labReportTitle,
            interpretations
          };
        })() : {};

        const parasitologyPayload = this.showParasitologyStoolForm ? {
          ova: this.parasitologyStool.ova,
          cysts: this.parasitologyStool.cysts,
          larvae: this.parasitologyStool.larvae,
          color: this.parasitologyStool.color,
          consistency: this.parasitologyStool.consistency,
          blood: this.parasitologyStool.blood,
          mucus: this.parasitologyStool.mucus,
          visibleParasites: this.parasitologyStool.visibleParasites,
          others: this.parasitologyStool.others
        } : {};

        const requestData = {
      ...data, // Spread existing properties
      ...cbcPayload,
      ...parasitologyPayload,
      doneBy: this.userName // Update only productId
    };


  
      console.log('Payload being sent:', JSON.stringify(requestData, null, 2));
      console.log("scanreport id:", this.scanReportId);
      console.log("Formatted Data:", requestData);
  
      const updateRequest = this.showUrinalysisForm
        ? this.api.updateUrinalysisReport(this.scanReportId, requestData)
        : (this.showCbcForm
          ? this.api.updateCbcReport(this.scanReportId, requestData)
          : (this.showParasitologyStoolForm
            ? this.api.updateParasitologyStoolReport(this.scanReportId, requestData)
            : (this.showGeneralForm
              ? this.api.updateGeneralLabReport(this.scanReportId, requestData)
              : this.api.updateLabReport(this.scanReportId, requestData))));

      updateRequest.subscribe(
        (response) => {
          console.log("Data sent to API:", requestData);
          this.consultation = response;
          this.responseColor = ""; // Green for success
  
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            console.log("Message not found!");
            this.responseColor = "rgb(214, 80, 80)"; // Red for error
            this.responseMessage = "Internal server error";
          }

          this.showDivUpdatedLoaderconsultation = false;

  
          this.showDivAddToDataBaseConsultation = true;
          //this.showDivUpdatedTreatment = false;
 
          // Reload lab requests list and current report so UI reflects latest changes
          this.loadScanRequests();
          //this.loadScanReportForThatRquest(this.scanRequest);
          //this.printScanResults()
 
          setTimeout(() => {
            this.showDivAddToDataBaseConsultation = false;
            //this.showDivUpdatedTreatment = false;
            this.responseColor = ""; // Green for success
            //this.saveButtonStatusTreatment = "Save Treatment";
            //this.clearTreatmentForm();
          }, 3000);
        },
        (error) => {
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
          this.responseColor = "rgb(201, 87, 67)"; // Red for error

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
    console.log("Original data:", data);
  
    // ✅ Convert quantity to a double or set to null
    if (data.quantity === undefined || data.quantity === null || data.quantity === '' || data.quantity <= 0) {
      this.responseMessage = "Quantity cannot be undefined nor null nor less than zero";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderPharmacy = false;

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
      this.responseMessage = "Quantity cannot be undefined nor null nor less than zero";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderPharmacy = false;

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

      this.showDivAddToDataBaseTreatment = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBaseTreatment = false;
        }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }

      // ✅ Validate durationUnit vs frequencyUnit
  if (data.durationUnit !== data.frequencyUnit) {
    this.responseMessage = "Units must be the same";
    this.responseColor = "rgb(238, 16, 16)";
    this.showDivUpdatedLoaderPharmacy = false;
    this.showDivAddToDataBaseTreatment = true;

    setTimeout(() => {
      this.showDivAddToDataBaseTreatment = false;
    }, 2000);

    return;
  }

    const requestData = {
      ...data, // Spread existing properties
      itemId: this.currentItemId // Update only productId
    };

    if (!requestData.itemId) {
      this.responseMessage = "Missing Product Id";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderPharmacy = false;

      this.showDivAddToDataBaseTreatment = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBaseTreatment = false;
        }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }
  
    if (this.saveButtonStatusTreatment == "Save Drug") {
      
      console.log('Payload being sent:', JSON.stringify(requestData, null, 2));
      console.log("visit id:", this.visitId);
      console.log("Formatted Data:", data);
  
      this.api.saveTreatmentRequested(this.visitId, requestData).subscribe(
        (response) => {
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

  
          this.showDivAddToDataBaseTreatment = true;
          this.showDivUpdatedTreatment = false;
  
          this.getRequestedTreatmentByVisitSeparately();
          this.getCostsRegularySeparately();
          console.log("Treatment added successfully");
  
          setTimeout(() => {
            this.showDivAddToDataBaseTreatment = false;
            this.showDivUpdatedTreatment = false;
            this.itemId = "";
            this.saveButtonStatusTreatment = "Save Drug";
            this.clearTreatmentForm();
          }, 3000);
        },
        (error) => {
          console.error("Error saving treatment:", error);
  
          // Display the error message in the div
          this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
          this.responseColor = "rgb(238, 16, 16)"; // Red for error

          this.showDivUpdatedLoaderPharmacy = false;

  
          this.showDivAddToDataBaseTreatment = true;
          this.showDivUpdatedTreatment = false;
  
          setTimeout(() => {
            this.showDivAddToDataBaseTreatment = false;
            this.showDivUpdatedTreatment = false;
          }, 7000);
        }
      );
    } else if (this.saveButtonStatusTreatment == "Update") {


              // ✅ Validate durationUnit vs frequencyUnit
  if (data.quantity > this.checkStockBeforeUpdatingTreatment) {
    this.responseMessage = "Stock at hand is insufficient";
    this.responseColor = "rgb(238, 16, 16)";
    this.showDivUpdatedLoaderPharmacy = false;
    this.showDivAddToDataBaseTreatment = true;

    setTimeout(() => {
      this.showDivAddToDataBaseTreatment = false;
    }, 2000);

    return;
  }

        // ✅ Validate durationUnit vs frequencyUnit
  if (data.durationUnit !== data.frequencyUnit) {
    this.responseMessage = "Units must be the same";
    this.responseColor = "rgb(238, 16, 16)";
    this.showDivUpdatedLoaderPharmacy = false;
    this.showDivAddToDataBaseTreatment = true;

    setTimeout(() => {
      this.showDivAddToDataBaseTreatment = false;
    }, 2000);

    return;
  }


    const requestUpatedData = {
      ...data, // Spread existing properties
      visitId: this.visitId, // Update only productId
      itemId: this.currentItemId,

    };


      console.log("currentTreatmentRequestedId id", this.treatmentId);
      console.log("confirm data before sending to api", requestUpatedData);
      console.log("confirm update status", this.saveButtonStatusTreatment);

  
      this.api.updateTreatment(this.treatmentId, requestUpatedData).subscribe(
        (response) => {

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
          console.log("Treatment Request updated successfully");
          this.showDivUpdatedLoaderPharmacy = false;

  
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
        (error) => {
          console.error("Error updating Treatment:", error);
  
          // Display the error message in the div
          this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
          this.responseColor = "rgb(238, 16, 16)"; // Red for error

          this.showDivUpdatedLoaderPharmacy = false;

  
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



getItemById(id:any, quantity:any){

        this.api.getItemByItsId(id).subscribe(
        (response) => {
          console.log("stockAtHand:", response.stockAtHand);

          this.stockAtHandForUpdaters = parseFloat(response.stockAtHand);
          this.checkStockBeforeUpdatingTreatment = this.stockAtHandForUpdaters + quantity;
          console.log("checkStockBeforeUpdatingTreatment", this.checkStockBeforeUpdatingTreatment);
          this.availableQuantity = this.checkStockBeforeUpdatingTreatment;

  
          if (response && response.message) {
            console.log("Message:", response.message);

          } else {
            console.log("Message not found!");
     
          }

        },
        (error) => {
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
  
  if (this.isCollapsedTreatment) {
    this.isCollapsedTreatment = false;  // open it if it's closed
  }

  
   this.currentItemId = item.itemId;
   this.getItemById(this.currentItemId, item.quantity)

  this.prefillDataForUpdate(item);
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
      this.itemSellingPrice = item.unitSellingPrice;
      this.availableQuantity = item.availableQuantity;
      this.unitBuy = item.unitBuy;
      this.currentItem = item.itemName;
     
      this.treatmentId = item.id;
      this.lastUnitValue = item.lastUnitValue;
      this.currentTreatmentRequested.amountPerFrequencyValue = this.lastUnitValue;
      this.availableQuantity = item.lastStockAtHand;
      console.log('Selected item name:', this.currentItem);
      console.log('Selected item ID:', this.currentItemId);
      console.log('Selected item name:', item.title);

    this.currentTreatmentRequested.quantity = item.quantity

    this.currentTreatmentRequested.totalUnits = item.totalUnits;

    console.log('totalNoOfUnits:', item.totalUnits);

    this.availableQuantity = item.quantity + item.lastStockAtHand;





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
    this.currentTreatmentRequested.amountPerFrequencyUnit = item.amountPerFrequencyUnit
    this.currentTreatmentRequested.amountPerFrequencyValue = item.amountPerFrequencyValue
    

}




calculateTotalQty() {
  if (this.currentTreatmentRequested.frequencyValue > 0 && this.currentTreatmentRequested.durationValue >= 0) {
    this.currentTreatmentRequested.quantity = this.currentTreatmentRequested.frequencyValue * this.currentTreatmentRequested.durationValue * (this.currentTreatmentRequested.amountPerFrequencyValue / this.lastUnitValue);
  } else {
    this.currentTreatmentRequested.quantity = 0;
  }
}



calculateDurationUnit() {
  this.currentTreatmentRequested.durationUnit = this.currentTreatmentRequested.frequencyUnit;
  console.log('duration unit:', this.currentTreatmentRequested.durationUnit);
  console.log('frequency unit:', this.currentTreatmentRequested.frequencyUnit);
}



calculateNoOfUnits() {
  if (this.currentTreatmentRequested.amountPerFrequencyValue > 0 && this.lastUnitValue >= 0) {
    this.currentTreatmentRequested.totalUnits = this.currentTreatmentRequested.amountPerFrequencyValue / this.lastUnitValue;
  } else {
    this.currentTreatmentRequested.totalUnits = 0;
  }
}



getUserFormDataOtherProcedure(data: any) {
  //console.log("Original Data:", data);


  this.showDivUpdatedLoaderServices = true;

  console.log("Original data:", data);



  data.orderedBy = sessionStorage.getItem('username'); // Handle empty age


// ✅ Convert clientAge to a double or set to null
if (data.quantity === undefined || data.quantity === null || data.quantity == '' || data.quantity <= 0) {
  data.quantity = 1; // Handle empty age

} else {
  data.quantity = parseFloat(data.quantity); // Convert to double (JavaScript number)

}

if (data.report === undefined || data.report === null || data.report == '') {
  data.report = "Done Successfully"; // Handle empty age

} 

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "labTest") {
  data.doneBy = "Mr.Muwanguzi";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "imaging") {
  data.doneBy = "Mr. Joel M";
}


if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "dental") {
  data.doneBy = "Dental Officer";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "consultation") {
  data.doneBy = "Dr. Emma";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "maternity") {
  data.doneBy = "Dr. Emma";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "familyPlanning") {
  data.doneBy = "Claire EN";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "inpatient") {
  data.doneBy = "Dr. Emma";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "outClient") {
  data.doneBy = "Dr. Emma";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "surgery") {
  data.doneBy = "Dr. Emma";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "Pediatric") {
  data.doneBy = "Dr. Emma";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "emergency") {
  data.doneBy = "Dr. Emma";
}


// Assuming requestData is your existing object
const requestData = {
  ...data, // Spread existing properties
  procedureId: this.currentOtherProcedureId // Update only productId
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
      (response) => {
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
        (response) => {
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
        (error) => {
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
  //console.log("Original Data:", data);

  this.showDivUpdatedLoaderTaxDiscount = true;

  //console.log("Original data:", data);

  


  



if (!this.invoiceId) {
  this.responseMessage = "Missing invoice Id";
  this.responseColor = "rgb(238, 16, 16)";
  this.showDivUpdatedLoaderTaxDiscount = false

  this.showDivAddToDataBaseTaxDiscount = true;  // Show error message
  setTimeout(() => {
    this.showDivAddToDataBaseTaxDiscount = false;
    }, 2000);
  return;  // 🚨 Stop execution here, preventing save or update
}




  console.log("Formatted Data:", data);

  if (this.saveButtonStatusTaxDiscount == "Save Discount") {
    console.log('Payload being sent:', JSON.stringify(data, null, 2));

    this.api.updateInvoiceWithDiscountAndTax(this.invoiceId, data).subscribe(
      (response) => {
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

      this.showDivUpdatedLoaderTaxDiscount = false;

      
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

        this.isCollapsedTaxDiscount = !this.isCollapsedTaxDiscount;
      }, 2000);
    
    },

    (error) => {
      console.error("Error saving Discount:", error);
      this.showDivUpdatedLoaderTaxDiscount = true;


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

      this.showDivUpdatedLoaderTaxDiscount = false;


      this.showDivAddToDataBaseTaxDiscount = true;
      this.showDivUpdatedTaxDiscount = false;

      setTimeout(() => {
        this.showDivAddToDataBaseTaxDiscount = false;
        this.showDivUpdatedTaxDiscount = false;
        //this.procedureId = ""
        this.saveButtonStatusTaxDiscount = "Save Discount"
        this.isCollapsedTaxDiscount = !this.isCollapsedTaxDiscount;
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
        (response) => {
          console.log("response", response);
          this.showDivUpdatedLoaderTaxDiscount = false;


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
            this.isCollapsedTaxDiscount = !this.isCollapsedTaxDiscount;


          }, 2000); 

          // Reload the client list

  
        },
        (error) => {
          console.error("Error updating Procedure", error);

          this.showDivUpdatedLoaderTaxDiscount = true;

          this.responseColor = "rgb(238, 16, 16)";
          this.responseMessage = error;

          this.showDivUpdatedLoaderTaxDiscount = false;


          this.showDivAddToDataBase = false;
          this.showDivUpdated = true;
          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdated = false;
            this.isCollapsedTaxDiscount = !this.isCollapsedTaxDiscount;  
          }, 3000); 
        }
      );
    


    };
  }



 
 






// payments


getUserFormDataPayments(data: any) {


  this.showDivUpdatedLoaderPayment = true;


  // Assuming requestData is your existing object

  //console.log("Original Data:", data);

  console.log("Original data:", data);




  // ✅ Convert clientAge to a double or set to null
  if (data.amountToPay === undefined || data.amountToPay === null || data.amountToPay === '') {
    this.responseMessage = "Missing Payment Amount";
    this.responseColor = "rgb(238, 16, 16)";
    this.showDivAddToDataBasePayment = true;  // Show error message
    setTimeout(() => {
      this.showDivAddToDataBasePayment = false;
    }, 2000);
    return;  // 🚨 Stop execution here, preventing save or update
  } else {
    data.amountToPay = parseFloat(data.amountToPay); // Convert to double (JavaScript number)
  }


    // ✅ Convert clientAge to a double or set to null
    if (data.paymentForm === undefined || data.paymentForm === null || data.paymentForm === '') {

      data.paymentForm = "Cash At Hand"
      //this.responseMessage = "Missing Payment Form";
      //this.responseColor = "rgb(238, 16, 16)";
      //this.showDivAddToDataBasePayment = true;  // Show error message
      //setTimeout(() => {
      //  this.showDivAddToDataBasePayment = false;
      //}, 2000);
      //return;  // 🚨 Stop execution here, preventing save or update
    } 


        // ✅ Convert clientAge to a double or set to null
    if (data.notes === undefined || data.notes === null || data.notes === '') {
       data.notes = "Payment Received with Thanks"
    } 

    // ✅ Check for missing names and STOP execution if found
    if (data.status !== "Approved") {
      data.status = "Approved"

    }

    if (!this.visitId) {
      this.responseMessage = "Missing visit Id";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivAddToDataBasePayment = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBasePayment = false;
        

        }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }


  console.log("Formatted Data:", data);

  const requestData = {
  ...data, // Spread existing properties
  receivedBy: this.userName // Update only productId
};


  if (this.saveButtonStatusPayment == "Save Payment") {
    console.log('Payload being sent:', JSON.stringify(requestData, null, 2));

    this.api.savePayment(this.visitId, requestData).subscribe(
      (response) => {
      console.log("Data sent to API:", requestData);
      this.showDivUpdatedLoaderPayment = false;


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
        this.isCollapsedPayment = !this.isCollapsedPayment;
      }, 1000);
    
    },

    (error) => {
     this.showDivUpdatedLoaderPayment = true
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

      this.showDivUpdatedLoaderPayment = false;


      this.showDivAddToDataBasePayment = true;
      this.showDivUpdatedPayment = false;

      setTimeout(() => {
        this.showDivAddToDataBasePayment = false;
        this.showDivUpdatedPayment = false;
        //this.procedureId = ""
        this.saveButtonStatusPayment = "Save Payment"
        this.isCollapsedPayment = !this.isCollapsedPayment;
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
        (response) => {
          console.log("response", response);
          this.showDivUpdatedLoaderPayment = false;


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
            this.isCollapsedPayment = !this.isCollapsedPayment;


          }, 2000); 

          // Reload the client list

  
        },
        (error) => {
          console.error("Error updating Procedure", error);

          this.showDivUpdatedLoaderPayment = true;

          this.responseColor = "rgb(238, 16, 16)";
          this.responseMessage = error;

          this.showDivUpdatedLoaderPayment = false;


          this.showDivAddToDataBase = false;
          this.showDivUpdated = true;
          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdated = false;
            this.isCollapsedPayment = !this.isCollapsedPayment;  
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
        (response) => {
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
          (response) => {
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
        (response) => {
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
          (response) => {
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


    console.log("Original Data:", data);
    

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
    data.pulseRate = parseFloat(data.pulseRate); // Convert to double (JavaScript number)
  } else {
    data.pulseRate = null; // Handle empty age
  }
  
  
  // ✅ Convert clientAge to a double or set to null
  if (data.height !== undefined && data.height !== null && data.height !== '') {
    data.height = parseFloat(data.height); // Convert to double (JavaScript number)
  } else {
    data.height = null; // Handle empty age
  }

  if (data.station == "Station") {
    data.station = "Triage"; // Convert to double (JavaScript number)
  }

  if (data.takenBy == "Taken By") {
    data.station = "Nurse"; // Convert to double (JavaScript number)
  }
  
  
  
  // ✅ Convert timeTaken to LocalTime format (HH:mm:ss) or set to null
  if (data.timeTaken !== undefined && data.timeTaken !== null && data.timeTaken !== '') {
    const date = new Date(`1970-01-01T${data.timeTaken}`); // Ensure time consistency
    data.timeTaken = date.toISOString().substring(11, 19); // Extract HH:mm:ss part
  } else {
    data.timeTaken = null; // Handle empty time
  }


    // ✅ Convert clientAge to a double or set to null
    if (data.systolic == null && data.diastolic == null && data.temperature == null && data.spO2 == null && data.heartRate == null && data.pulseRate == null&& data.respiratoryRate == null) {
      data.systolic = parseFloat(data.systolic); // Convert to double (JavaScript number)
      this.dataBaseResponseMessage = "All filds cant be empty";
      this.dataBaseResponseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderVitals = false;

      this.showDivAddToDataBase = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBase = false;
        }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
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
        (response) => {
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
          console.log("vital added successfully");
          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdatedLabTest = false;
            this.procedureId = ""
            this.saveButtonStatus = "Save Vitals"
            this.clearVitalsForm();
          }, 2000);
      
      },
      (error) => {
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
          (response) => {
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
          (error) => {
            console.error("Error updating client", error);
            this.dataBaseResponseColor = "rgb(238, 16, 16)";
            this.dataBaseResponseMessage = error;

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


deleteTreatmentRequest(id: any) {

  this.showDivUpdatedLoaderPharmacyOut = true
  this.api.deleteTreatmentRequestById(id).subscribe(
    (response) => {
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
      this.showDivUpdatedLoaderPharmacyOut = false


      this.showDivAddToDataBaseTreatmentOut = true;
      setTimeout(() => {
        this.showDivAddToDataBaseTreatmentOut = false;
      }, 3000); 

      this.getRequestedTreatmentByVisitSeparately();
      this.getCostsRegularySeparately() 
      console.log("Requested treatment deleted successfully");


    },
    (error) => {
      console.error("Error deleting treatment", error);

      this.responseColor = "rgb(238, 16, 16)";
      this.responseMessage = error.message;

      this.showDivUpdatedLoaderPharmacyOut = false


      this.showDivAddToDataBaseTreatmentOut = true;
      setTimeout(() => {
        this.showDivAddToDataBaseTreatmentOut = false;
      }, 3000); 

    }
  );
}



// delete payment


deletePayment(id: any) {
  this.showDivUpdatedLoaderInvoice = true;

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
      this.showDivUpdatedLoaderInvoice = false;


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

      this.showDivUpdatedLoaderInvoice = false;


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

      this.showDivUpdatedLoaderDeleteOut = true;


      this.api.deleteProcedureRequestById(id).subscribe(
        (response) => {
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

          this.showDivUpdatedLoaderDeleteOut = false;


          this.showDivAddToDataBaseOtherProcedureOut = true;
          //this.showDivUpdatedOtherProcedure = true; 
          setTimeout(() => {
            this.showDivAddToDataBaseOtherProcedureOut = false;
            this.showDivUpdatedOtherProcedure = false;  
          }, 3000); 
    
          this.getOtherProceduresByVisitSeparately()
          this.getCostsRegularySeparately() 
          this.getUltrasoundScanProceduresByVisitSeparately()

          console.log("Requested Procedure deleted successfully");
    
    
        },
        (error) => {
          console.error("Error deleting item", error);

          this.responseColor = "rgb(238, 16, 16)";
          this.responseMessage = error;

          this.showDivUpdatedLoaderDeleteOut = false;


          this.showDivAddToDataBaseOtherProcedureOut = true;
          this.showDivUpdatedOtherProcedure = true;
          setTimeout(() => {
            this.showDivAddToDataBaseOtherProcedureOut = false;
            this.showDivUpdatedOtherProcedure = false;  
          }, 3000); 
   
        }
      );
    }





    deleteScanProcedureRequest(id: any) {
      this.api.deleteProcedureRequestById(id).subscribe(
        (response) => {
          console.log("response", response);

          if (response && response.message) {
            this.responseColor = "rgb(238, 16, 16)";
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            console.log("Message not found!");
                  this.responseColor = "rgb(238, 16, 16)";
                  this.responseMessage = "Internal server error; Failed to Update"
          }

          this.showDivAddToDataBaseScan = false;
          this.showDivUpdatedScan = true;
          setTimeout(() => {
            this.showDivAddToDataBaseScan = false;
            this.showDivUpdatedScan = false;  
          }, 3000); 
    
          this.getUltrasoundScanProceduresByVisitSeparately()
          this.getCostsRegularySeparately() 
          this.getOtherProceduresByVisitSeparately()

          console.log("Requested Procedure deleted successfully");
    
    
        },
        (error) => {
          console.error("Error deleting item", error);

          this.responseColor = "rgb(238, 16, 16)";
          this.responseMessage = error;

          this.showDivAddToDataBaseScan = false;
          this.showDivUpdatedScan = true;
          setTimeout(() => {
            this.showDivAddToDataBaseScan = false;
            this.showDivUpdatedScan = false;  
          }, 3000); 
   
        }
      );
    }


    deleteProcedureRequest(id: any) {
      this.api.deleteProcedureRequestById(id).subscribe(
        (response) => {
          console.log("response", response);

          if (response && response.message) {
            this.responseColor = "rgb(238, 16, 16)";
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            console.log("Message not found!");
                  this.responseColor = "rgb(238, 16, 16)";
                  this.responseMessage = "Internal server error; Failed to Update"
          }

          this.showDivAddToDataBase = false;
          this.showDivUpdated = true;
          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdated = false;  
          }, 3000); 
    
          this.getLabTestsSeparately()
          this.getCostsRegularySeparately() 
          console.log("Requested Procedure deleted successfully");
    
    
        },
        (error) => {
          console.error("Error deleting item", error);

          this.responseColor = "rgb(238, 16, 16)";
          this.responseMessage = error;

          this.showDivAddToDataBase = false;
          this.showDivUpdated = true;
          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivUpdated = false;  
          }, 3000); 
   
        }
      );
    }




    deleteVital2(id: any) {

      this.showDivUpdatedLoaderPharmacyOut = true

      this.api.deleteVitalById(id).subscribe(
        (response) => {
          console.log("response", response);
    
          this.getInitialVitalsSeparately()
          console.log("vital deleted successfully");
          this.showDivUpdatedLoaderPharmacyOut = false


          this.showDivAddToDataBaseTreatmentOut = true;
    
        },
        (error) => {
          console.error("Error deleting item", error);
        }
      );
    }





    deleteVital(id: any) {


      
      

      this.showDivUpdatedLoaderVitalOut = true
      this.api.deleteVitalById(id).subscribe(
        (response) => {
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
        (error) => {
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


       this.isCollapsedNewOtherProcedure = true; 


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
  
        this.procedureOrderedBy = item.orderedBy;
  
        this.procedureDoneBy = item.doneBy;
    
        console.log('date before converted:', item.date);
  
        this.currentOtherProcedureRequested = item;
    
   
    // Ensure height is a number
    if (this.currentOtherProcedureRequested.quantity !== undefined && this.currentOtherProcedureRequested.quantity !== null && this.currentProcedureRequested.quantity !== '') {
      this.currentOtherProcedureRequested.quantity = Number(this.currentOtherProcedureRequested.quantity);
    } else {
      this.currentOtherProcedureRequested.quantity = null; // Handle empty values
    }
    
    
    
        console.log('Editing procedure:', this.currentOtherProcedureRequested);
    
    
    
        // Dropdown or datepicker-specific logic can be added if necessary
    
        //this.currentClientGroup = item.clientGroupId;  // Update client group dropdown if needed
  
        this.isUpdatingOtherProcedure = true;
  
    
        this.isCollapsedNewOtherProcedure = false; 




  
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

    this.isCollapsedNewClient = false;

    this.saveButtonStatus = "UpDate Vitals"


    console.log('this is the item item :', item);

    //console.log('this is the groip id:', item.clientGroupId);

    console.log('plain id:', item.id);

    this.vitalId = item.id;

    console.log('this is vital id :', this.vitalId);



   // this.loadClientGroupByGroupName(item.clientGroupId)


    //console.log('client group:', this.currentClientGroup);


    console.log('the save button status:', this.saveButtonStatus);

    this.taken = item.takenBy;
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
  this.currentVital.pulseRate = parseInt(this.currentVital.pulseRate, 10);
} else {
  this.currentVital.pulseRate = null;
}




    console.log('Converted date taken:', this.currentVital.dateTaken);


    console.log('Editing vital:', this.currentVital);



    // Dropdown or datepicker-specific logic can be added if necessary

    //this.currentClientGroup = item.clientGroupId;  // Update client group dropdown if needed

  }

  deleteClient(id: any) {
    this.api.deleteClientById(id).subscribe(
      (response) => {
        console.log("response", response);
  
        // Reload the client list
        this.api.getItems().subscribe((res) => {
          this.productList = res;
          this.data = res;
          this.initializeTableData();
          console.log("Client list reloaded");
        });
  
  
      },
      (error) => {
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

    this.currentItem = "Chose Treatment"

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
      dateTaken: null,
      timeTaken: null,
    };
  }

  changeCurrentGroup(clientGroup: any) {
    if (clientGroup) {
      this.currentClientGroup = clientGroup.groupNameShortForm || 'Unknown Group';
      this.currentClientGroupId = clientGroup.id || null;
      console.log('Selected group name:', this.currentClientGroup);
      console.log('Selected group ID:', this.currentClientGroupId);
    } else {
      console.warn('No client group selected');
      this.currentClientGroup = 'Choose Group Name';
    }
  }


  calculateTotal(): number {
    this.totalCostPerItem = (this.currentTreatmentRequested?.quantity || 0) * (this.itemSellingPrice || 0);
    this.currentTreatmentRequested.totalAmount = this.totalCostPerItem;
    return this.totalCostPerItem;
}



returnUnitCost(): number {
  return this.itemSellingPrice;
}



  changeCurrentItem(item: any) {
    if (item) {
      //this.ItemTemporaryTotal = item.
      this.itemSellingPrice = item.sellingPrice;
      this.availableQuantity = item.stockAtHand;
      this.unitBuy = item.costPrice;
      this.unitOfMeasure = item.uintOfMeasure;
      this.currentItem = item.title || 'Unknown Treatment';
      this.currentItemId = item.id || null;
      this.lastUnitValue = item.lastUnitValue;
      this.currentTreatmentRequested.amountPerFrequencyUnit = item.lastUnitOfMeasure;
      this.currentTreatmentRequested.amountPerFrequencyValue = this.lastUnitValue;
      console.log('Selected item name:', this.currentItem);
      console.log('Selected item ID:', this.currentItemId);
      console.log('Selected item name:', item.title);

      this.calculateNoOfUnits();

    } else {
      console.warn('No item selected');
      this.currentItem = 'Choose Treatment';
    }
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
      this.currentScanProcedureRequestedUnitSellingPrice = procedure.unitSellingPrice;
      this.currentOtherProcedureId = procedure.id || null;
      console.log('Selected procedure name:', this.currentOtherProcedure);
      console.log('Selected procedure ID:', this.currentOtherProcedureId);
      console.log('Selected procedure name:', procedure.procedureName);
      console.log('Selected procedure category:', this.currentProcedureCategory);


    } else {
      console.warn('No procedure selected');
      this.currentOtherProcedure = 'Choose Procedure';
    }
  }



  loadClientGroups(){
    this.api.getClientGroupList().subscribe((res) => {
      this.clientGroupList = res;
      console.log('group list',this.clientGroupList);
      //console.log(clientId);

    });  }


    loadRequestedLabTests(){
      this.searchText = "";
      this.api.getLabTestList().subscribe((res) => {
        this.labTestList = res;
        console.log('Lab list',this.labTestList);
        //console.log(clientId);
  
      });  
    }




    loadDrugList(){
      this.api.getDrugList().subscribe((res) => {
        this.itemList = res;
        console.log('item list',this.itemList);
        //console.log(clientId);
  
      });  
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

        this.currentItem = "Chose Treatment"
        this.saveButtonStatusTreatment = "Save Drug"

        this.itemSellingPrice = 0.00;
        this.availableQuantity = 0.00;
        this.currentItem = null;
        this.currentItemId = null;
  
        
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

      this.taken = "Taken By"
      this.station = "Station"
      this.saveButtonStatus = "Save Vitals"
      
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
        dateTaken: null,
        timeTaken: null,
      };
    
      // Reset the form if available
      if (this.form) {
        this.form.resetForm(); // This will reset all form fields to their default state
      }
    }
    

  loadClientGroupByGroupName(id: any) {

      this.api.getClientGroupByGroupName(id).subscribe((res) => {
        this.clientGroup = res;
        //this.currentClientGroup = this.clientGroup.groupNameShortForm;
        //console.log('group now',this.clientGroup.groupNameShortForm);
        //console.log(clientId);
  
      });  
    }


  createNewClientVisits(clientId:any){

    this.visitSaveButtonStatus = "Save Visit"
    this.clientId = clientId;
    this.visitReason = "";
    this.visitType = "outpatient";

     //this.api.getInitialTriageVitalsForVisitId(clientId).subscribe((res) => {
       //this.clientVisitList = res;
       //console.log('Selected VisitListNow',this.clientVisitList);
       //console.log(clientId);
    // });
     }

      loadScanRequests() {
      this.isLoadingClientVisits = true;
      const selectedId = this.selectedScanRequest?.id;
  
      this.api.getAllLabProceduresRequested().subscribe({
        next: (res) => {
          this.scanRequestsList = res;
          console.log('scan request list', this.scanRequestsList);
          this.clientDisplay.refreshClientDirectory().subscribe(() => {
            this.cdr.detectChanges();
          });
          if (selectedId) {
            const match = this.scanRequestsList.find((req: any) => req.id === selectedId);
            if (match) {
              this.selectedScanRequest = match;
            }
          }
          this.isLoadingClientVisits = false;  // ✅ stop loading when data comes
        },
        error: (err) => {
          console.error('Error loading client orders', err);
          this.isLoadingClientVisits = false;  // ✅ even on error, stop loading
        }
      });
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
        error: (err) => {
          console.error('Error loading client orders', err);
          this.isLoadingClientVisits = false;  // ✅ even on error, stop loading
        }
      });
  }
  
  
    printScanResults() {
      this.showDivUpdatedLoaderInvoice = true;
      console.log('general us id:', );


      this.api.exportScanResults(this.scanRequestId).subscribe((res: Blob) => {
        this.showDivUpdatedLoaderInvoice = false;

        const blob = new Blob([res], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
      
        // Create a link element and trigger a download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invoice.pdf'; // Specify the file name
        a.click();


      
        // Clean up the object URL
        window.URL.revokeObjectURL(url);
      }, 
      
      (error) => {
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
      
    }


    exportInvoicePdf() {
      this.showDivUpdatedLoaderInvoice = true;
      console.log('VISIT ID FOR PDF:', this.visitId);


      this.api.exportPdf(this.visitId).subscribe((res: Blob) => {
        this.showDivUpdatedLoaderInvoice = false;

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
        this.responseColor = "rgb(238, 16, 16)";
        this.responseMessage = error.message;


        console.error('Error generating PDF:', error);
      });
      
    }



    openVisit(visit:any){

      this.isUpdatingClientVisit = true;

    const data = {
      visitStatus: "open",
      userRole: this.userRole // Spread existing properties

    };

    console.log("data to close visit", data);


      
      this.api.updateVisitStatus(this.visitId, data).subscribe(
        (response) => {
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
            this.isCollapsedNewClient = false;
          }, 2000);
        },
        (error) => {
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
        (response) => {
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
            this.isCollapsedNewClient = false;
          }, 2000);
        },
        (error) => {
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




  


loadScanReportForThatRquest(scanRequest:any){

  this.isLoadingClientVisits = true;

  this.scanRequestId = scanRequest.id;

  this.scanRequest = scanRequest;
  

this.api.getLabReportByRequestId(scanRequest.id).subscribe((res: any) => 
  {

  this.isLoadingClientVisits = false;
  this.scanReport = res.data; // if backend returns { message, data }
  console.log('scan report:', this.scanReport);

  this.generalUs.mrdt = this.scanReport.mrdt || '';
  this.generalUs.bs = this.scanReport.bs || '';
  this.generalUs.notes = this.scanReport.notes || '';
  this.generalUs.test = this.scanReport.test || '';
  this.generalUs.labReportTitle = this.scanReport.labReportTitle || this.scanReport.labReportTitle || '';
  this.generalUs.recommendation = this.scanReport.recommendation || '';
  this.generalUs.result = this.scanReport.result || this.scanReport.report || this.scanReport.findings || '';
  this.summaryOfTheFindings = this.scanReport.labReportTitle;
  this.scanReportId = this.scanReport.id;


    

         if (res && res.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            console.log("Message:", res.message);
            this.visitCreationResponse = res.message;
          } 

          this.visitCreationStatus = true;

  
          setTimeout(() => {
            this.visitCreationStatus = false;
          }, 4000);
  
},

 (error) => {

  
          console.error("Error loading report:", error);
  
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
          //this.responseColor = "rgb(238, 16, 16)"; // Red for error

           this.isLoadingClientVisits = false;
  

  
          this.visitCreationStatus = true;
  
          setTimeout(() => {
            this.visitCreationStatus = false;
          }, 4000);
        }


);


}



  loadInitialTriageVitalsForVisitId(visit: any): void {

    if (!visit?.id) {
      this.showDivUpdatedLoaderInvoice = false;
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

    this.showDivUpdatedLoaderInvoice = true;


    this.visitId = visit.id;

    this.visitStatus = visit.visitStatus;

    //this.invoiceId = visit.invoice.id;

    console.log('visit status:',this.visitStatus);

    console.log('log visit:',visit);

    this.visit = visit;

    console.log('TYPE MY VISITID:',visit.id);

    //this.getInitialVitalsSeparately();

    //console.log('initial vitals:',this.productListInitialVitals);

    this.api.getInitialVitalsByVisit(visit.id).subscribe((res) => {

      this.productListInitialVitals = res;


    });

    this.api.getLabTestProceduresByVisit(visit.id).subscribe((res) => {
      this.productListProceduresRequested = res;

    });

    this.api.getConsultationsByVisit(this.visitId).subscribe((res) => {
      this.consultation = res;
      console.log('diagnosis:',res.diagnosis);

      

    });


    this.api.getOtherProceduresByVisit(this.visitId).subscribe((res) => {
      this.otherProceduresRequestedList = res;

    });

    this.api.getPaymentsMadeByVisit(visit.id).subscribe({
      next: (res) => {
        this.productListPaymentsMade = res;
        this.showDivUpdatedLoaderInvoice = false;
      },
      error: () => {
        this.showDivUpdatedLoaderInvoice = false;
      }
    });

    this.api.getOtherProceduresByVisit(visit.id).subscribe((res) => {
      this.otherProceduresRequestedList = res;

    });
   
    this.api.getTreatmentRequestedByVisit(visit.id).subscribe((res) => {
      this.productListTreatmentRequested = res;

    });


    this.api.getUltrasoundScanProceduresByVisit(visit.id).subscribe((res) => {
      this.productListUltrasoundScanRequested = res;

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

      this.discount = res.Discount;
      this.tax = res.Tax;
      this.totalAmount = res.TotalAmount;
      this.amountPaid = res.AmountPaid;
      this.balanceDue = res.BalanceDue;

      console.log('invoice baklance:',res.BalanceDue);

      console.log('total costs:',res.TotalAmountDue);
      console.log('total costs front:',this.totalAmountDue);

    });


 


    this.currentClientVisit = visit.visitName + " [" +visit.visitDate + "]"; // Update the visit name on selection
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

  getInitialVitalsSeparately(){
    this.api.getInitialVitalsByVisit(this.visitId).subscribe((res) => {

      this.productListInitialVitals = res;
      console.log ("all initail vitals",this.productListInitialVitals)


    });
  }

  openDropdown() {
    this.searchText = "";
    this.loadDrugList();  // your existing function
    this.isDropdownOpen = true;

    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 0); // Delay allows DOM to render first
  }





  
 

  getLabTestsSeparately(){
    this.api.getLabTestProceduresByVisit(this.visitId).subscribe((res) => {
      this.productListProceduresRequested = res;
      console.log("labtest from api api:", this.productListProceduresRequested);


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

    });

  }


  updateServicesAfterServiceOrder(){

    this.api.getOtherProceduresByVisit(this.visitId).subscribe((res) => {
      this.otherProceduresRequestedList = res;

    });

  }




  getRequestedTreatmentByVisitSeparately(){

    this.api.getTreatmentRequestedByVisit(this.visitId).subscribe((res) => {
      this.productListTreatmentRequested = res;

 



    });

  }



  getUltrasoundScanProceduresByVisitSeparately(){

    this.api.getUltrasoundScanProceduresByVisit(this.visitId).subscribe((res) => {
      this.productListUltrasoundScanRequested = res;

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
    
    this.totalAmountDue = res.TotalAmountDue;

    this.discount = res.Discount;
    this.tax = res.Tax;
    this.totalAmount = res.TotalAmount;
    this.amountPaid = res.AmountPaid;
    this.balanceDue = res.BalanceDue;

    console.log('invoice baklance:',res.BalanceDue);

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
    let filteredItemList = this.itemList ?? []; // Ensure it's always an array
  
    // Filter based on search text
    if (this.searchText) {
      filteredItemList = filteredItemList.filter((item) =>
        item.title?.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  
    // Sort in descending order by visitNumber
    return filteredItemList.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }






  filteredClientGroupList() {
    let filteredGroupList = this.clientGroupList ?? []; // Ensure it's always an array
  
    // Filter based on search text
    if (this.searchText) {
      filteredGroupList = filteredGroupList.filter((clientGroup) =>
        clientGroup.groupNameShortName?.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  
    // Sort in descending order by visitNumber
    return filteredGroupList.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }


  
filteredScanRequestsList() {
    let filteredList = this.scanRequestsList;

    // Filter based on search text
    if (this.searchText) {
        const searchLower = this.searchText.toLowerCase();
        filteredList = this.scanRequestsList.filter((scanRequest) =>
            (this.getRequestClientName(scanRequest)?.toLowerCase().includes(searchLower)) ||
            (scanRequest.report?.toLowerCase().includes(searchLower)) ||
        (scanRequest.exam?.toLowerCase().includes(searchLower)) ||
        (scanRequest.dateOfProcedure?.toLowerCase().includes(searchLower))
        );
    }

    if (this.scanRequestDateFilter !== 'all') {
      filteredList = filteredList.filter((scanRequest) => this.matchesScanRequestDateFilter(scanRequest));
    }

    // Sort in descending order by visitNumber
    return filteredList.sort((a, b) => b.visitNumber - a.visitNumber);
}

setScanRequestDateFilter(filter: 'all' | 'today' | 'last_week' | 'this_week' | 'last_month' | 'this_month' | 'this_year'): void {
  this.scanRequestDateFilter = filter;
}

private matchesScanRequestDateFilter(scanRequest: any): boolean {
  const rawDate = scanRequest?.dateOfProcedure || scanRequest?.visitDate || scanRequest?.dateCreated;
  const d = this.toDateOnly(rawDate);
  if (!d) return false;

  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfThisWeek = new Date(todayDate);
  const day = startOfThisWeek.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  startOfThisWeek.setDate(startOfThisWeek.getDate() + diffToMonday);
  const endOfThisWeek = new Date(startOfThisWeek);
  endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
  const endOfLastWeek = new Date(startOfThisWeek);
  endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);
  const startOfThisMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const endOfThisMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
  const startOfLastMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
  const endOfLastMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0);
  const startOfThisYear = new Date(todayDate.getFullYear(), 0, 1);
  const endOfThisYear = new Date(todayDate.getFullYear(), 11, 31);

  switch (this.scanRequestDateFilter) {
    case 'today':
      return d.getTime() === todayDate.getTime();
    case 'this_week':
      return d >= startOfThisWeek && d <= endOfThisWeek;
    case 'last_week':
      return d >= startOfLastWeek && d <= endOfLastWeek;
    case 'this_month':
      return d >= startOfThisMonth && d <= endOfThisMonth;
    case 'last_month':
      return d >= startOfLastMonth && d <= endOfLastMonth;
    case 'this_year':
      return d >= startOfThisYear && d <= endOfThisYear;
    default:
      return true;
  }
}

private toDateOnly(value: any): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

private scanRequestDate(scanRequest: any): Date | null {
  const raw = scanRequest?.dateOfProcedure || scanRequest?.visitDate || scanRequest?.dateCreated;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d;
}

get analyticsTotalRequests(): number {
  return this.scanRequestsList?.length || 0;
}

get analyticsDoneCount(): number {
  return (this.scanRequestsList || []).filter((r: any) => {
    const s = (r?.status || '').toString().toLowerCase();
    return s === 'done' || s === 'approved' || s === 'completed';
  }).length;
}

get analyticsPendingCount(): number {
  return Math.max(this.analyticsTotalRequests - this.analyticsDoneCount, 0);
}

get analyticsDonePercent(): number {
  if (this.analyticsTotalRequests === 0) return 0;
  return Math.round((this.analyticsDoneCount / this.analyticsTotalRequests) * 100);
}

get analyticsPendingPercent(): number {
  if (this.analyticsTotalRequests === 0) return 0;
  return 100 - this.analyticsDonePercent;
}

get analyticsMonthlyTrend(): Array<{ label: string; count: number; pct: number }> {
  const now = new Date();
  const months: Array<{ key: string; label: string; count: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleString('en-US', { month: 'short' });
    months.push({ key, label, count: 0 });
  }

  for (const req of this.scanRequestsList || []) {
    const d = this.scanRequestDate(req);
    if (!d) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const target = months.find((m) => m.key === key);
    if (target) target.count += 1;
  }

  const max = Math.max(...months.map((m) => m.count), 1);
  return months.map((m) => ({
    label: m.label,
    count: m.count,
    pct: Math.max(Math.round((m.count / max) * 100), m.count > 0 ? 8 : 0),
  }));
}

get analyticsServiceBreakdown(): Array<{ name: string; count: number; pct: number }> {
  const map = new Map<string, number>();
  for (const req of this.scanRequestsList || []) {
    const name = (req?.procedureRequestedName || req?.exam || 'Unspecified').toString().trim();
    if (!name) continue;
    map.set(name, (map.get(name) || 0) + 1);
  }
  const rows = Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  rows.sort((a, b) => b.count - a.count);
  const total = Math.max(rows.reduce((acc, r) => acc + r.count, 0), 1);
  return rows.slice(0, 6).map((r) => ({ ...r, pct: Math.round((r.count / total) * 100) }));
}

get deptLabEmployees(): Array<{ name: string; role: string; title: string; profilePic: string; details: string; lastSeen: number }> {
  const byName = new Map<string, { name: string; role: string; title: string; profilePic: string; details: string; lastSeen: number }>();
  const nowFallback = Date.now();

  for (const req of this.scanRequestsList || []) {
    const lastSeen = this.scanRequestDate(req)?.getTime() || nowFallback;
    const staffCandidates = [
      { name: req?.doneBy, role: req?.doneByRole || req?.role, title: req?.doneByTitle, profilePic: req?.doneByProfilePic || req?.staffProfilePic || req?.profilePic },
      { name: req?.orderedBy, role: req?.orderedByRole || req?.role, title: req?.orderedByTitle, profilePic: req?.orderedByProfilePic || req?.staffProfilePic || req?.profilePic },
      { name: req?.requestedBy, role: req?.requestedByRole || req?.role, title: req?.requestedByTitle, profilePic: req?.requestedByProfilePic || req?.staffProfilePic || req?.profilePic },
      { name: req?.createdBy, role: req?.createdByRole || req?.role, title: req?.createdByTitle, profilePic: req?.createdByProfilePic || req?.staffProfilePic || req?.profilePic },
    ];

    for (const staff of staffCandidates) {
      const name = (staff.name || '').toString().trim();
      const role = (staff.role || '').toString().trim();
      if (!name) continue;
      if (!role.toLowerCase().includes('lab')) continue;

      const prev = byName.get(name);
      const row = {
        name,
        role: role || 'Laboratory Staff',
        title: (staff.title || 'Laboratory Staff').toString(),
        profilePic: (staff.profilePic || 'assets/images/vector.jpeg').toString(),
        details: `Handled ${req?.procedureRequestedName || req?.exam || 'Lab'} request`,
        lastSeen,
      };
      if (!prev || row.lastSeen > prev.lastSeen) byName.set(name, row);
    }
  }

  const rows = Array.from(byName.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  if (rows.length > 0) return rows;

  return [{
    name: 'Laboratory Team',
    role: 'Lab',
    title: 'Laboratory Staff',
    profilePic: 'assets/images/vector.jpeg',
    details: 'No laboratory role activity found yet',
    lastSeen: 0,
  }];
}

get deptServiceButtons(): string[] {
  const source = (this.procedureList || []).map((s: any) => (s?.procedureName || s?.title || '').toString().trim()).filter(Boolean);
  const unique = Array.from(new Set(source));
  if (unique.length === 0) {
    return ['Hematology', 'Urinalysis', 'Biochemistry'];
  }
  return unique.sort((a, b) => a.localeCompare(b));
}




  filteredClientVisitList() {
    let filteredList = this.clientVisitList;
  
    // Filter based on search text
    if (this.searchText) {
      filteredList = this.clientVisitList.filter((visit) =>
        visit.visitName.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  
    // Sort in descending order by visitNumber
    return filteredList.sort((a, b) => b.visitNumber - a.visitNumber);
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
        (response) => {
          this.productList = response;
          // Update 'productList' property with the response data
          this.data = response;

          console.log(this.productList);
        },
        (error) => {
          // Handle any errors that occur during the API request
          console.error('API request error:', error);
        }
      );

    } else {
      // Make an API request using this.api.getItemsAdvancedSearch(data)
      this.api.getItemsAdvancedSearch(data).subscribe(
        (response) => {
          this.productList = response;
          // Update 'productList' property with the response data
          this.data = response;
          console.log(this.productList);
        },
        (error) => {
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
          item.height.toString().toLowerCaase().includes(query) ||
          item.dateTaken.toString().toLowerCase().includes(query) ||

          item.respiratoryRate.toString().toLowerCase().includes(query) ||
          item.spO2.toString().toLowerCase().includes(query) ||
          item.timeTaken.toString().toLowerCase().includes(query) ||
          item.weight.toString().toLowerCase().includes(query)
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
            return item.dateTaken.toString().toLowerCase().includes(query);
          case 'respiratoryRate':
            return item.respiratoryRate.toString().toLowerCase().includes(query);
          case 'spO2':
            return item.spO2.toString().toLowerCase().includes(query);
          case 'timeTaken':
            return item.timeTaken.toString().toLowerCase().includes(query);
          case 'weight':
            return item.weight.toString().toLowerCase().includes(query);
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



get filteredotherProceduresRequestedList(): any[] {
  /*setTimeout(() => {
    this.updateDisplayedList();
  });*/
  return this.otherProceduresRequestedList.filter((item) => {
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


// treatments//







get filteredproductListTreatmentRequested(): any[] {
  /*setTimeout(() => {
    this.updateDisplayedList();
  });*/
  return this.productListTreatmentRequested.filter((item) => {
    const query = this.searchQuery.toLowerCase();
    // Check if the selectedColumn is 'all' or a specific column
    if (this.selectedColumnProceduresRequested === 'all') {
      // Search in all columns
      return (
        item.itemName.toLowerCase().includes(query) ||
        item.quantity.toString().toLowerCase().includes(query) ||
        item.unitSellingPrice.toString().toLowerCase().includes(query) ||
        item.totalAmount.toString().toLowerCase().includes(query)

        // Add conditions for other columns as needed
      );
    } else {
      // Search in the selected column
      switch (this.selectedColumnProceduresRequested) {


        case 'title':
          return item.itemName.toLowerCase().includes(query);
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
    this.showDivUpdatedLoaderNewVisit = true;

    console.log(data);
    

    if (this.saveButtonStatus = "Save Visit ") {
      this.api.createNewVisit(this.clientId, data).subscribe((response) => {
        console.log("response id",response.id);

        console.log("results",response);

         
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            console.log("Message:", response.message);
            this.visitCreationResponse = response.message;
          } else {
            this.responseColor = "rgb(238, 16, 16)"; // Red for error
            this.visitCreationResponse = "Internal server error";
          
          }
  


        console.log("visit created successfully");

        this.loadInitialTriageVitalsForVisitId(response.data)

        this.showDivUpdatedLoaderNewVisit = false;

        this.visitCreationStatus = true;

          setTimeout(() => {
            this.visitCreationStatus = false;
          }, 2000);


      },
        (error) => {
          console.error("Error saving visit:", error);
  
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

        this.showDivUpdatedLoaderNewVisit = false;

  
        this.visitCreationStatus = true;
  
          setTimeout(() => {
            this.visitCreationStatus = false;
          }, 10000);
        }
    );

    } else {

      this.api.updateVisit(this.clientId, data).subscribe(
        (response) => {
          console.log("response", response);

          // Reload the client list
          this.api.getItems().subscribe((res) => {
            this.productList = res;
            this.data = res;
            this.initializeTableData();
            console.log("Client list reloaded");
          });
          
          this.showDivUpdatedLoaderNewVisit = false;

    
        },
        (error) => {
          this.showDivUpdatedLoaderNewVisit = false;

          console.error("Error updating client", error);
        }
      );
  };
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

  // Edit Client Methods
  openEditClientModal(): void {
    // Preload form data with current client data
    this.editClientFormData = {
      clientFirstName: this.clientFirstName || '',
      clientSecondName: this.clientSecondName || '',
      clientFileNo: this.clientFileNo || '',
      clientContact: this.clientContact || '',
      clientAge: this.clientAge || '',
      clientDateOfBirth: this.clientDateOfBirth || '',
      clientGender: this.clientGender || '',
      clientAddress: this.clientAddress || '',
      clientOccupation: this.clientOccupation || '',
      bloodGroup: this.clientBloodGroup || '',
      clientGroupName: this.clientGroupName || '',
      nextOfKinName: this.nextOfKinName || '',
      nextOfKinContact: this.nextOfKinContact || '',
      nextOfKinAddress: this.nextOfKinAddress || '',
      relationship: this.relationship || '',
      diagnosis: this.diagnosis || ''
    };
    this.showEditClientModal = true;
    // Use jQuery to show Bootstrap modal
    setTimeout(() => {
      ($('#editClientModal') as any).modal('show');
    }, 100);
  }

  closeEditClientModal(): void {
    this.showEditClientModal = false;
    ($('#editClientModal') as any).modal('hide');
  }

  updateClientData(form: NgForm): void {
    if (!this.clientId) {
      this.responseMessage = "Client ID is missing";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivUpdatedLoaderClient = true;
      setTimeout(() => {
        this.showDivUpdatedLoaderClient = false;
      }, 2000);
      return;
    }

    this.showDivUpdatedLoaderClient = true;
    const data = form.value;

    // Prepare update data (exclude file number and diagnosis from editing)
    const updateData = {
      clientFirstName: data.clientFirstName || '',
      clientSecondName: data.clientSecondName || '',
      clientContact: data.clientContact || '',
      clientAge: data.clientAge || '',
      clientDateOfBirth: data.clientDateOfBirth || '',
      clientGender: data.clientGender || '',
      clientAddress: data.clientAddress || '',
      occupation: data.clientOccupation || '', // API expects 'occupation', not 'clientOccupation'
      bloodGroup: data.bloodGroup || '',
      clientGroupId: data.clientGroupId || this.currentClientGroupId || null,
      nextOfKinName: data.nextOfKinName || '',
      nextOfKinContact: data.nextOfKinContact || '',
      nextOfKinAddress: data.nextOfKinAddress || '',
      relationship: data.relationship || ''
    };

    // Attach userRole like in client.component.ts
    const requestData = {
      ...updateData,
      userRole: this.userRole
    };

    // Log data before sending to API
    console.log('========== UPDATE PATIENT DATA - LAB COMPONENT ==========');
    console.log('Client ID:', this.clientId);
    console.log('Raw Form Data:', data);
    console.log('Prepared Update Data (with userRole):', requestData);
    console.log('Update Data (JSON):', JSON.stringify(requestData, null, 2));
    console.log('=========================================================');

    this.api.updateItem(this.clientId, requestData).subscribe(
      (response) => {
        console.log('Client updated successfully:', response);
        this.responseMessage = response.message || "Client data updated successfully";
        this.responseColor = "rgb(40, 167, 69)";

        // Update local properties immediately to refresh UI
        this.clientDisplay.invalidateClient(this.clientId);
        this.clientDisplay.upsertClient({
          id: this.clientId,
          ...updateData,
        });
        this.clientFirstName = updateData.clientFirstName;
        this.clientSecondName = updateData.clientSecondName;
        // clientFileNo not editable from this modal; keep existing value
        this.clientContact = updateData.clientContact;
        this.clientAge = updateData.clientAge;
        this.clientDateOfBirth = updateData.clientDateOfBirth;
        this.clientGender = updateData.clientGender;
        this.clientAddress = updateData.clientAddress;
        this.clientOccupation = updateData.occupation;
        this.clientBloodGroup = updateData.bloodGroup;
        // clientGroupId is used for API; name will refresh from API reload
        this.nextOfKinName = updateData.nextOfKinName;
        this.nextOfKinContact = updateData.nextOfKinContact;
        this.nextOfKinAddress = updateData.nextOfKinAddress;
        this.relationship = updateData.relationship;

        console.log('Client data updated in UI. Refreshing lab requests...');

        setTimeout(() => {
          this.showDivUpdatedLoaderClient = false;
          this.closeEditClientModal();
          // Reload lab requests to get fresh data from API and refresh client data tab
          if (this.selectedScanRequest && this.selectedScanRequest.id) {
            const selectedId = this.selectedScanRequest.id;
            this.loadScanRequests();
            // After reloading, re-select the request to refresh client data tab
            setTimeout(() => {
              const refreshedRequest = this.scanRequestsList.find(req => req.id === selectedId);
              if (refreshedRequest) {
                this.selectScanRequest(refreshedRequest);
                console.log('Client data tab refreshed with updated data');
              }
            }, 500);
          }
        }, 2000);
      },
      (error) => {
        console.error('Error updating client:', error);
        this.responseMessage = error.error?.message || "Failed to update client data";
        this.responseColor = "rgb(238, 16, 16)";
        setTimeout(() => {
          this.showDivUpdatedLoaderClient = false;
        }, 2000);
      }
    );
  }
}






