import { Component, OnInit, TemplateRef, ViewChild, PipeTransform, ElementRef } from '@angular/core';
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

import jsPDF from 'jspdf';

import { getDownloadURL, ref, uploadBytesResumable, getStorage } from 'firebase/storage';
import { getApp } from 'firebase/app';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileresourceService } from '../fileservice/fileresource.service';

import { getAllUserRoles } from '../utils/user-roles.util';

declare var $: any;
declare var bootstrap: any; // Import Bootstrap JS globally if not already done

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {

  jsonData: any[] = [];


  private get storage() {
    return getStorage(getApp());
  }
  serverDirectoryName:string='';
  image:string=''
  imgSrc: any = '/assets/imgplaceholder.jpg';
  selectedFile: any;

  cartItems: any = [];




  profilePic: any = "assets/images/vector.jpg";
  accountUseremail: any = "herdsontisk@gmail.com";

  isCollapsed = true;

  isExpense = true;

  isDropdownOpen = false;

  isCollapsedPayment = true;

  isCollapsedTaxDiscount = true;

  isCollapsedItemsUsedShow = true;

  
  isCollapsedItemsUsedShowExpenseAccount = true;

  itemsPerPageItemUsed: number = 9; // Adjust as needed 

  pageItemUsed: number = 1;

  procedureItemUsedList: any[] = [];


  
  procedureItemUsedListExpenseAccount: any[] = [];


  totalAmountPaidInPeriod:any = 0;

  isCollapsedNewClient = true;

  isCollapsedNewLabTest  = true;

  isCollapsedNewConsultation = true;

  isCollapsedTreatment  = true;

  invoiceId:any;

  isCollapsedNewLabTestUpDate = true;

  availableQuantity:any = "00";


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

  isLoadingNewClientDeleteOut: boolean = true;

  showDivUpdatedLoaderDeleteOut: boolean = false;


  isLoadingNewClient: boolean = true;
  isLoadingNewClientInvoice: boolean = true;

  isLoadingNewClientTaxDiscount: boolean = true;

  isLoadingNewClientPayment:boolean = true;
  isLoadingNewClientServices: boolean = true;
  isLoadingNewClientPharmacy: boolean = true;
  isLoadingNewClientVitals: boolean = true;
  isLoadingNewClientPharmacyOut: boolean = true;



  isUpdatingExpenseCategory: boolean = false;


  isUpdatingExpense: boolean = false;

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

  expenseCategory: any = {};

  currentPayment: any = {};

  currentAccount: any = {};

  currentExpense: any = {};

  currentExpenseCategory: any = {};

  currentProcedureRequested: any = {};

  currentTreatmentRequested: any = {};

  currentScanProcedureRequested: any = {};

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

  currentExpenseId: any;

  currentExpenseCategoryId: any;

  currentScanProcedureId: any;

  currentOtherProcedureId: any;

  visit: any = {};

  initialVisit: any = {};

  taken:string = "Taken By"

  orderedBy:string = "Ordered By"

  doneBy:string = "Done By"


  labTestOrderedBy:string = "Ordered By"

  labTestDoneBy:string = "Done By"


  treatmentOrderedBy:string = "Ordered By"

  treatmentDoneBy:string = "Done By"

  scanOrderedBy:string = "Ordered By"

  scanDoneBy:string = "Done By"


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

  pageExpense: number = 1;


  totalBalance: string = "0.0000000"





  productListInitialVitals: any[] = [];
  productList: any[] = [];
  productListProceduresRequested: any[]= [];

  productListPaymentsMade: any[]= [];

  productListExpenses: any[]= [];


  productListUltrasoundScanRequested: any[] = [];

  productListOtherProcedureRequested: any[] = [];

  otherProceduresRequestedList: any[] = [];

  productListTreatmentRequested: any[] = [];

  procedureName: any;

  currentClientGroupId = null;

  visitReason: string = "";
  visitType: string = "";
  


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



  showDivUpdatedScan: boolean = false;

  isUpdatingClientVisit: boolean = false;

  showDivUpdatedLoaderNewVisit: boolean = false;
  isLoadingNewVisit: boolean = true;


  closeModalAdd: boolean = false;

  responseColor = "";

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

  currentPageExpense: number = 1;

  itemsPerPage: number = 8; // Adjust as needed 

  itemsPerPageExpense: number = 8; // Adjust as needed 

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

  fakeUrl:any;

  storedFilter: any;
  labFilterDateFrom = '';
  labFilterDateTo = '';
  scanFilterDateFrom = '';
  scanFilterDateTo = '';
  proceduresFilterDateFrom = '';
  proceduresFilterDateTo = '';

  clientGroupList:any[] = [];

  labTestList:any[] = [];

  itemList:any[] = [];

  scanList:any[] = [];

  procedureList:any[] = [];

  clientGroup:any[] = [];

  InvoicePdf: any;


  clientFirstName: any;
  clientProfilePic:any = "assets/images/vector.jpg";
  clientFileNo: any;
  clientSecondName: any;

  expenseList: any[] = [];

  expenseCategoryList: any[] = [];

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

  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('serviceSearchInput') serviceSearchInput!: ElementRef;


  currentClientVisit: string = 'Choose Client Order'


  clientVisitList: any[] = []; // Initialize to hold client orders


  initialTriageVitals: any[] = []; // Store filtered vitals


  saveButtonStatus: string = "Save Client Vitals"

  saveButtonStatusLabTest: string = "Save LabTest"

  saveButtonStatusTreatment: string = "Save LabTest"

  itemToDelete: any = null;

  visitStatus:string = "Open";


  isClosed: boolean = false;
  isOpen: boolean = false;
  isNoVisit: boolean = false;

  userId:any;
  




  visitAction:string = "Close Order";

  saveButtonStatusOtherProcedure: string = "Save Procedure"

  saveButtonStatusPayment: string = "Save Payment"

  saveButtonStatusAccount: string = "Save Account"

  saveButtonStatusExpense: string = "Save Expense"

  saveButtonStatusTaxDiscount: string = "Save Discount"



   saveButtonStatusExpenseCategory: string = "Save Category"

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

  @ViewChild('usersFormExpense') usersFormExpense!: NgForm;



  @ViewChild('usersFormOtherProcedure') usersFormOtherProcedure!: NgForm;

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
    private fileserver: FileresourceService
    ) {
    this.fromDate = calendar.getToday();
    this.toDate = calendar.getNext(calendar.getToday(), 'd', 10);
  }




  ngOnInit(): void {

    //console.log("item from sessionStorage:", sessionStorage.getItem('item'));

    //const item = JSON.parse(sessionStorage.getItem("item") || "[]");
    const item = JSON.parse(sessionStorage.getItem("item") || '{}');

    this.initialVisit = JSON.parse(sessionStorage.getItem("initialClientVisit") || '{}');

    console.log("Retrieved initial Visit original from sessionStorage:", JSON.parse(sessionStorage.getItem("initialClientVisit") || '{}'));

    console.log("Retrieved initial Visit from sessionStorage:", this.initialVisit);



    console.log("Retrieved item from sessionStorage:", item);

    console.log('ClientFirstName', item.clientFirstName);
    console.log('ClientSecondName', item.clientSecondName);
    console.log('Clientprofilepic', item.clientProfilePic);
    console.log('ClientFileNo', item.clientFileNo);

    this.clientFirstName = item.clientFirstName;
    this.clientSecondName = item.clientSecondName;
    this.clientProfilePic = item.clientProfilePic;
    this.clientFileNo = item.clientFileNo;
    this.clientId = item.id;


    if (this.clientId) {
      this.api.getTotalClientBalanceDue(this.clientId).subscribe((res) => {

        console.log('clientId for totalDebt:',this.clientId);
    
        
        this.totalAmountDue = res.TotalAmountDue;
    
    
        console.log('total costs:',res.TotalAmountDue);
        console.log('total costs front:',this.totalAmountDue);

       
    
      });
    }

    
    this.getAllExpenseTransactions();

    //console.log("Client orders", clientVis);

    
    const userRole = sessionStorage.getItem('userrole');

    const username = sessionStorage.getItem('username');

    const userId = sessionStorage.getItem('userid');

    this.userId = userId;


    if (username === null) {
      this.router.navigate(['/login']);
    }else{
      if (userRole === "customer"){
        this.router.navigate(['/products']);

      }
    }

    if (userRole === "md") {
      this.mdUser = true;
    } else {
      const roles = getAllUserRoles().map((r) => r.toLowerCase().trim());
      this.mdUser = roles.some((r) => r === 'md' || r === 'admin');
    }

    this.resetPageLoadingFlags();

    const requestData = {
      receivedBy: "",
      datefrom: "", // Spread existing properties
      dateto: "",
      paidBy: "",
      paymentForm: "",
    };
   
    this.getUserFormDataForAdvancedSearch(requestData);

 

  };

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
    this.showDivUpdatedLoader = false;
    this.showDivUpdatedLoaderInvoice = false;
    this.showDivUpdatedLoaderTaxDiscount = false;
    this.showDivUpdatedLoaderPayment = false;
    this.showDivUpdatedLoaderServices = false;
    this.showDivUpdatedLoaderPharmacy = false;
    this.showDivUpdatedLoaderPharmacyOut = false;
    this.showDivUpdatedLoaderVitalOut = false;
    this.showDivUpdatedLoaderVitals = false;
    this.showDivUpdatedLoaderDeleteOut = false;
    this.showDivUpdatedLoaderNewVisit = false;
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


  openConsultation(){
    const data = {
      medicalHistory: "Please write some client medical history here",
      clinicalExamination: "Provide outcome of any examination done",
      differentialDiagnosis: "possible diagnosis",
      diagnosis: "definate cause after investigations"

    };

    if (!this.visitId) {
      this.responseMessage = "Missing visit Id";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivAddToDataBaseConsultation = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBaseConsultation = false;
        }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }

  
      console.log('Payload being sent:', JSON.stringify(data, null, 2));
      console.log("visit id:", this.visitId);
      console.log("Formatted Data:", data);
  
      this.api.saveConsultation(this.visitId, data).subscribe(
        (response) => {
          console.log("Data sent to API:", data);
  
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            console.log("Message not found!");
            this.responseColor = "rgb(238, 16, 16)"; // Red for error
            this.responseMessage = "Internal server error";
          }
  
          this.showDivAddToDataBaseConsultation = true;
          //this.showDivUpdatedTreatment = false;
  
          //this.getRequestedTreatmentByVisitSeparately();
          this.getCostsRegularySeparately();
          console.log("consultation added successfully");
  
          setTimeout(() => {
            this.showDivAddToDataBaseConsultation = false;
            //this.showDivUpdatedTreatment = false;
            this.itemId = "";
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
          this.responseColor = "rgb(238, 16, 16)"; // Red for error
    
          this.showDivAddToDataBaseConsultation = true;
          //this.showDivUpdatedTaxDiscount = false;
    
          setTimeout(() => {
            this.showDivAddToDataBaseConsultation = false;
            //this.showDivUpdatedTaxDiscount = false;
            //this.procedureId = ""
           // this.saveButtonStatusTaxDiscount = "Save Discount"
          }, 4000);
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
  
    if (this.saveButtonStatusTreatment == "Save Treatment") {
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
            this.saveButtonStatusTreatment = "Save Treatment";
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
          }, 4000);
        }
      );
    } else if (this.saveButtonStatusTreatment == "UpDate Order") {
      console.log("currentTreatmentRequestedId id", this.currentTreatmentRequestedId);
      console.log("confirm data before sending to api", requestData);
      console.log("confirm update status", this.saveButtonStatusTreatment);

  
      this.api.updateProcedure(this.currentTreatmentRequestedId, requestData).subscribe(
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
            this.saveButtonStatusTreatment = "Save";
            this.clearOtherProcedureForm();
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
//get other procedures



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
  data.doneBy = "Mr.Reagan. O";
}


if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "dental") {
  data.doneBy = "Dental Officer";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "consultation") {
  data.doneBy = "Dr. Mindra";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "maternity") {
  data.doneBy = "Dr. Mindra";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "familyPlanning") {
  data.doneBy = "Dr. Mindra";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "inpatient") {
  data.doneBy = "Dr. Mindra";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "outClient") {
  data.doneBy = "Dr. Mindra";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "surgery") {
  data.doneBy = "Dr. Mindra";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "Pediatric") {
  data.doneBy = "Dr. Mindra";
}

if ((data.doneBy === undefined || data.doneBy === null || data.doneBy === '') && this.currentProcedureCategory === "emergency") {
  data.doneBy = "Dr. Mindra";
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


  console.log("Formatted Data:", data);

  if (this.saveButtonStatusExpenseCategory == "Save Category") {
    console.log('Payload being sent:', JSON.stringify(data, null, 2));

    this.api.createExpenseCategory(data).subscribe(
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
      this.getAllClientGroupsForShow()
      console.log("discount added successfully");
      setTimeout(() => {
        this.showDivAddToDataBaseTaxDiscount= false;
        this.showDivUpdatedTaxDiscount = false;
        //this.procedureId = ""
        this.saveButtonStatusTaxDiscount = "Save Category"
        this.clearTaxDiscountForm();
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
          }, 3000); 
        }
      );
    


    };
  }












getUserFormDataPayments(data: any) {

  this.showDivUpdatedLoaderPayment = true;
  //console.log("Original Data:", data);

  console.log("Original data:", data);


  // ✅ Convert clientAge to a double or set to null
  if (data.accountName === undefined || data.accountName === null || data.accountName === '') {
    this.responseMessage = "Missing accountName ";
    this.responseColor = "rgb(238, 16, 16)";
    this.showDivAddToDataBasePayment = true;  // Show error message
    setTimeout(() => {
      this.showDivAddToDataBasePayment = false;
    }, 2000);
    return;  // 🚨 Stop execution here, preventing save or update
  } 


  

        // ✅ Convert clientAge to a double or set to null
    if (data.description === undefined || data.description === null || data.description === '') {
       data.description = "Account created with Thanks"
    } 

  

    if (!data.categoryId) {
      this.responseMessage = "Missing category Id";
      this.responseColor = "rgb(238, 16, 16)";
      this.showDivAddToDataBasePayment = true;  // Show error message
      setTimeout(() => {
        this.showDivAddToDataBasePayment = false;
        }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }


  console.log("Formatted Data:", data);

  if (this.saveButtonStatusAccount == "Save Account") {
    console.log('Payload being sent:', JSON.stringify(data, null, 2));

    this.api.saveExpenseAccount(data).subscribe(
      (response) => {
      console.log("Data sent to API:", data);
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



      this.getAllClientGroupsForShowExpenseAccount();

      
      this.showDivAddToDataBasePayment = true;
      this.showDivUpdatedPayment = false;
      
      console.log("Account added successfully");
      setTimeout(() => {
        this.showDivAddToDataBasePayment = false;
        this.showDivUpdatedPayment = false;
        //this.procedureId = ""
        this.saveButtonStatusAccount = "Save Account"
        this.clearPaymentFormExpenseAccount();
      }, 2000);
    
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
        this.saveButtonStatusAccount = "Save Account"
      }, 4000);
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
          }, 3000); 
        }
      );
    


    };
  }












// payments


getUserFormDataExpenses(data: any) {

  this.showDivUpdatedLoaderPayment = true;
  //console.log("Original Data:", data);

  console.log("Original data:", data);

 


  // ✅ Convert clientAge to a double or set to null
  if (data.amountTransacted === undefined || data.amountTransacted === null || data.amountTransacted === '') {
    this.responseMessage = "Missing Expense Amount";
    this.responseColor = "rgb(238, 16, 16)";
    this.showDivAddToDataBasePayment = true;  // Show error message
    setTimeout(() => {
      this.showDivAddToDataBasePayment = false;
    }, 2000);
    return;  // 🚨 Stop execution here, preventing save or update
  } else {
    data.amountTransacted = parseFloat(data.amountTransacted); // Convert to double (JavaScript number)
  }




        // ✅ Convert clientAge to a double or set to null
    if (data.description === undefined || data.description === null || data.description === '') {
       data.notes = "Expense done successfully"
    } 






  console.log("Formatted Data:", data);



  const requestData = {
  ...data, // Spread existing properties
  userId: this.userId,
  expenseAccountId: this.currentExpenseId
};


  if (this.saveButtonStatusExpense == "Save Expense") {
    console.log('Payload being sent:', JSON.stringify(data, null, 2));

    this.api.saveExpense(requestData).subscribe(
      (response) => {
      console.log("Data sent to API:", data);
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
      
      this.getAllExpenseTransactions();
      console.log("Expense added successfully");
      setTimeout(() => {
        this.showDivAddToDataBasePayment = false;
        this.showDivUpdatedPayment = false;
        //this.procedureId = ""
        this.saveButtonStatusExpense = "Save Expense"
        this.clearPaymentForm();
      }, 2000);
    
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
      }, 4000);
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
  data.orderedBy = "Dr.Judith M"; // Handle empty age

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

// delete expense

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


// delete payment


deleteExpense(item: any) {
  this.showDivUpdatedLoaderInvoice = true;

  console.log(" payment deleted successfully", item);


  this.api.deleteExpense(item.id).subscribe(
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

  
      console.log(" payment deleted successfully");

      this.getAllExpenseTransactions();

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

    this.saveButtonStatusTreatment = "Save Treatment"
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
    return (this.currentTreatmentRequested?.quantity || 0) * (this.itemSellingPrice || 0);
}

returnUnitCost(): number {
  return this.itemSellingPrice;
}



  changeCurrentItem(item: any) {
    if (item) {
      //this.ItemTemporaryTotal = item.
      this.itemSellingPrice = item.sellingPrice;
      this.availableQuantity = item.stockAtHand;
      this.currentItem = item.title || 'Unknown Treatment';
      this.currentItemId = item.id || null;
      console.log('Selected item name:', this.currentItem);
      console.log('Selected item ID:', this.currentItemId);
      console.log('Selected item name:', item.title);

    } else {
      console.warn('No item selected');
      this.currentItem = 'Choose Treatment';
    }
  }



  changeCurrentExpense(item: any) {
    if (item) {
  
      this.currentExpense = item.accountName || 'Unknown Expense';
      this.currentExpenseId = item.id || null;
      console.log('Selected item name:', this.currentExpense);
      console.log('Selected item ID:', this.currentExpenseId);
      console.log('Selected item name:', item.accountName);

    } else {
      console.warn('No Expense Account selected');
      this.currentItem = 'Choose Expense Account';
    }
  }




    changeCurrentExpenseCategory(item: any) {
    if (item) {
  
      this.currentExpenseCategory = item.categoryName || 'Unknown Expense Category';
      this.currentExpenseCategoryId = item.id || null;
      console.log('Selected item name:', this.currentExpenseCategory);
      console.log('Selected item ID:', this.currentExpenseCategoryId);
      console.log('Selected item name:', item.categoryName);

    } else {
      console.warn('No Expense Account selected');
      this.currentItem = 'Choose Expense Account';
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




loadExpenseList(){
      this.api.getExpenseAccountList().subscribe((res) => {
        this.expenseList = res;
        console.log('item list',this.expenseList);
        //console.log(clientId);
  
      });  
    }


loadExpenseCategoryList(){
      this.api.getExpenseCategoryList().subscribe((res) => {
        this.expenseCategoryList = res;
        console.log('item list',this.expenseCategoryList);
        //console.log(clientId);
  
      });  
    }


onDropdownClick(event: MouseEvent): void {
  if (this.isUpdatingExpense) {
    event.stopPropagation();
    return;
  }
  this.loadExpenseList();
  setTimeout(() => {
    this.serviceSearchInput?.nativeElement?.focus();
  }, 100);
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







    
    clearPaymentFormExpense() {

  
      //this.currentOtherProcedure = "Chose Procedure"
      this.saveButtonStatusExpense = "Save Expense"

      
      this.showDivAddToDataBasePayment = false;
    
      // Reset the currentVital object to its initial state
    
      // Reset the form if available
      if (this.usersFormExpense) {
        this.usersFormExpense.resetForm(); // This will reset all form fields to their default state
      }
    }




    clearPaymentFormExpenseAccount() {

  
      //this.currentOtherProcedure = "Chose Procedure"
      this.saveButtonStatusAccount = "Save Account"

      
      this.showDivAddToDataBasePayment = false;
    
      // Reset the currentVital object to its initial state
    
      // Reset the form if available
      if (this.usersFormPayment) {
        this.usersFormPayment.resetForm(); // This will reset all form fields to their default state
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

      if (this.usersFormOtherProcedure) {
        this.usersFormOtherProcedure.resetForm(); // This will reset all form fields to their default state
      }
    }


deleteItemUsed(id:any){

}

  getAllClientGroupsForShow() {

    this.api.getAllExpenseCategories().subscribe((res) => {

      this.procedureItemUsedList = res;

      console.log("this this the response "+ res);

      this.currentPage = 1;

    });
  }



  getAllClientGroupsForShowExpenseAccount() {

    this.api.getAllExpenseCategoriesExpenseAccount().subscribe((res) => {

      this.procedureItemUsedListExpenseAccount = res;

      console.log("this this the response "+ res);

      this.currentPage = 1;

    });
  }





  clearFormShowNewClientGroup(){

    this.getAllClientGroupsForShow();

    //this.currentClientGroup = "Chose Group Name";
    if (this.usersFormTaxDiscount) {
      this.usersFormTaxDiscount.resetForm();  // Reset the form to clear all fields

    }
    
  }



    clearFormShowNewClientGroupExpenseAccount(){

    this.getAllClientGroupsForShowExpenseAccount();

    //this.currentClientGroup = "Chose Group Name";
    if (this.usersFormTaxDiscount) {
      this.usersFormTaxDiscount.resetForm();  // Reset the form to clear all fields

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
        this.saveButtonStatusTreatment = "Save Treatment"

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
    this.visitType = "";

     //this.api.getInitialTriageVitalsForVisitId(clientId).subscribe((res) => {
       //this.clientVisitList = res;
       //console.log('Selected VisitListNow',this.clientVisitList);
       //console.log(clientId);
    // });
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



  loadInitialTriageVitalsForVisitId(visit: any): void {

    if (visit.visitStatus === "open") {
      this.isOpen = true;
      this.isClosed = false;
      this.isNoVisit = false;
 
    }

    if (visit.visitStatus === "closed") {
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


    this.api.getOtherProceduresByVisit(this.visitId).subscribe((res) => {
      this.otherProceduresRequestedList = res;

    });

    this.api.getPaymentsMadeByVisit(visit.id).subscribe((res) => {
      this.productListPaymentsMade = res;
      this.showDivUpdatedLoaderInvoice = false;


    });



//// expenses
      this.api.getAllExpensesMade().subscribe((res) => {
      this.productListExpenses = res;
      this.showDivUpdatedLoaderInvoice = false;

    });

//// expenses




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


getAllExpenseTransactions(){
      this.api.getAllExpensesMade().subscribe((res) => {
      this.productListExpenses = res;
      this.showDivUpdatedLoaderInvoice = false;

    });


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





    filteredExpenseList() {
    let filteredExpenseList = this.expenseList ?? []; // Ensure it's always an array
  
    // Filter based on search text
    if (this.searchText) {
      filteredExpenseList = filteredExpenseList.filter((item) =>
        item.accountName?.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  
    // Sort in descending order by visitNumber
    return filteredExpenseList.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }




      filteredExpenseCategoryList() {
    let filteredExpenseCategoryList = this.expenseCategoryList ?? []; // Ensure it's always an array
  
    // Filter based on search text
    if (this.searchText) {
      filteredExpenseCategoryList = filteredExpenseCategoryList.filter((item) =>
        item.categoryName?.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
  
    // Sort in descending order by visitNumber
    return filteredExpenseCategoryList.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
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




// today filter


filterToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // JavaScript months are 0-based
  const day = today.getDate();

  const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const filterData = {
    datefrom: formattedDate,
    dateto: formattedDate,
    receivedBy: '',
    paidBy: '',
    paymentForm: ''
  };

        console.log("api new data:", filterData);


this.getUserFormDataForAdvancedSearch(filterData);
}









private formatNgbDateToYyyyMmDd(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value.substring(0, 10);
  if (typeof value === 'object' && value.year != null && value.month != null && value.day != null) {
    const y = value.year;
    const m = String(value.month).padStart(2, '0');
    const d = String(value.day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

applyLabDateFilter(data: any): void {
  this.labFilterDateFrom = this.formatNgbDateToYyyyMmDd(data.datefrom);
  this.labFilterDateTo = this.formatNgbDateToYyyyMmDd(data.dateto);
}

applyScanDateFilter(data: any): void {
  this.scanFilterDateFrom = this.formatNgbDateToYyyyMmDd(data.datefrom);
  this.scanFilterDateTo = this.formatNgbDateToYyyyMmDd(data.dateto);
}

applyProceduresDateFilter(data: any): void {
  this.proceduresFilterDateFrom = this.formatNgbDateToYyyyMmDd(data.datefrom);
  this.proceduresFilterDateTo = this.formatNgbDateToYyyyMmDd(data.dateto);
}

clearLabDateFilter(): void {
  this.labFilterDateFrom = '';
  this.labFilterDateTo = '';
}

clearScanDateFilter(): void {
  this.scanFilterDateFrom = '';
  this.scanFilterDateTo = '';
}

clearProceduresDateFilter(): void {
  this.proceduresFilterDateFrom = '';
  this.proceduresFilterDateTo = '';
}

getUserFormDataForAdvancedSearch(data: any) {
  console.log("Before conversion:", data);

  this.storedFilter = data;



  // ✅ Properly handle when either date is missing
  if (!data.datefrom || !data.dateto) {
    this.api.getItemsAdvancedSearchDteEmptyDashBoard(data).subscribe(
      (response) => {
        this.productListPaymentsMade = response;
        this.data = response;
        console.log("Empty date range response:", this.productListPaymentsMade);

// ✅ Calculate total amount paid and format with commas and 2 decimal places
const total = this.productListPaymentsMade.reduce((sum, item) => {
  return sum + (item.amountToPay || 0);
}, 0);

this.totalAmountPaidInPeriod = total.toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});


    console.log("✅ Total amount paid:", this.totalAmountPaidInPeriod);

      },
      (error) => {
        console.error('API request error (empty dates):', error);
      }
    );
  } else {
    this.api.getItemsAdvancedSearchDashBoard(data).subscribe(
      (response) => {
        this.productListPaymentsMade = response;
        this.data = response;
        console.log("Filtered response:", this.productListPaymentsMade);

   // ✅ Calculate total amount paid
    this.totalAmountPaidInPeriod = this.productListPaymentsMade.reduce((sum, item) => {
      return sum + (item.amountToPay || 0);
    }, 0);

    console.log("✅ Total amount paid:", this.totalAmountPaidInPeriod);


      },
      (error) => {
        console.error('API request error (with dates):', error);
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

  //expenses


  get filteredproductListExpenses(): any[] {
    /*setTimeout(() => {
      this.updateDisplayedList();
    });*/
    return this.productListExpenses.filter((item) => {
      const query = this.searchQuery.toLowerCase();
      // Check if the selectedColumn is 'all' or a specific column
      if (this.selectedColumnPaymentDone === 'all') {
        // Search in all columns
        return (
  
          item.amountTransacted.toString().toLowerCase().includes(query) ||

          item.description.toLowerCase().includes(query) ||
          item.dateOfExpenseTransaction.toString().toLowerCase().includes(query) ||
          item.timeOfExpenseTransaction.toString().toLowerCase().includes(query)
  
          // Add conditions for other columns as needed
        );
      } else {
        // Search in the selected column
        switch (this.selectedColumnPaymentDone) {
  
          case 'amountTransacted':
            return item.amountTransacted.toString().toLowerCase().includes(query);

          case 'description':
            return item.description.toLowerCase().includes(query);
            case 'dateOfExpenseTransaction':
              return item.dateOfExpenseTransaction.toString().toLowerCase().includes(query);
            case 'timeOfExpenseTransaction':
              return item.timeOfExpenseTransaction.toString().toLowerCase().includes(query);
          default:
            return false; // Invalid column selection
        }
      }
    });
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
  let list = this.productListProceduresRequested;
  if (this.labFilterDateFrom || this.labFilterDateTo) {
    list = list.filter((item) => {
      const d = item.dateOfProcedure ? String(item.dateOfProcedure).substring(0, 10) : '';
      if (!d) return false;
      if (this.labFilterDateFrom && d < this.labFilterDateFrom) return false;
      if (this.labFilterDateTo && d > this.labFilterDateTo) return false;
      return true;
    });
  }
  return list.filter((item) => {
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
  let list = this.otherProceduresRequestedList;
  if (this.proceduresFilterDateFrom || this.proceduresFilterDateTo) {
    list = list.filter((item) => {
      const d = item.dateOfProcedure ? String(item.dateOfProcedure).substring(0, 10) : '';
      if (!d) return false;
      if (this.proceduresFilterDateFrom && d < this.proceduresFilterDateFrom) return false;
      if (this.proceduresFilterDateTo && d > this.proceduresFilterDateTo) return false;
      return true;
    });
  }
  return list.filter((item) => {
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
  let list = this.productListUltrasoundScanRequested;
  if (this.scanFilterDateFrom || this.scanFilterDateTo) {
    list = list.filter((item) => {
      const d = item.dateOfProcedure ? String(item.dateOfProcedure).substring(0, 10) : '';
      if (!d) return false;
      if (this.scanFilterDateFrom && d < this.scanFilterDateFrom) return false;
      if (this.scanFilterDateTo && d > this.scanFilterDateTo) return false;
      return true;
    });
  }
  return list.filter((item) => {
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
      this.api.createNewVisit(this.clientId, data).subscribe((result) => {
        console.log("results id",result.id);

        console.log("results",result);



        this.showDivUpdatedLoaderNewVisit = false;


        console.log("visit created successfully");

        this.loadInitialTriageVitalsForVisitId(result)


      });

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
    
    
        },
        (error) => {
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
}





