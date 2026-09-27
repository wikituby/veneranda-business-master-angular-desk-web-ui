import { Component, OnInit, OnDestroy, AfterViewInit, TemplateRef, ViewChild, PipeTransform, ElementRef } from '@angular/core';
import { BootstrapModalHost } from '../utils/bootstrap-modal-host.util';
import { ApiService } from '../services/api.service';
import { CartapiService } from '../services/cartapi.service';
import { DataService } from '../services/data.service';
import { MatDialog, MatDialogContent } from '@angular/material/dialog';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NgForm } from '@angular/forms';
import { PopupComponent } from '../popup/popup.component';
import { HeaderComponent } from '../header/header.component';
import { Router } from '@angular/router';
import { Product } from '../interfaces/product';
import { MatPaginatorModule } from '@angular/material/paginator';
import { NgxPaginationModule } from 'ngx-pagination';

import { NgbCalendar, NgbCollapseModule, NgbDate, NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from '../services/authentication.service';

import { NgbAlertModule, NgbDatepickerModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';

//import { FormsModule } from '@angular/forms';      // ✅ REQUIRED
import { CommonModule } from '@angular/common'; 


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

declare var $: any;

@Component({
  selector: 'app-stock-receive',
  templateUrl: './stock-receive.component.html',
  styleUrls: ['./stock-receive.component.css']
})

export class StockReceiveComponent implements OnInit, AfterViewInit, OnDestroy {

  private readonly modalHost = new BootstrapModalHost('app-stock-receive');

  private get storage() {
    return getStorage(getApp());
  }

  isCollapsedPayment = true;

  isCollapsedTaxDiscount = true;

  isCollapsedNewClient = true;

  isCollapsedNewLabTest = true;

  isLoadingStockReceive: boolean = false;

  currentStockReceived: any = {
    quantityReceived: 0,
    totalCostPrice: 0
  };

  imgSrc: string = "";

  itemStore: string = "store";

  isCollapsed: boolean = true;



  isCollapsedNewConsultation = true;

  isCollapsedTreatment = true;

  invoiceId: any;

  isCollapsedNewLabTestUpDate = true;

  availableQuantity: any = "00";


  isCollapsedNewScan = true;

  isCollapsedNewOtherProcedure = true;

  isCollapsedNewScanUpDate = true;

  isCollapsedDrop = true;

  isUpdatingLabTest: boolean = false;

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

  currentOtherProcedureRequested: any = {
    quantity: 1,
  };

  otherProcedureRequestedById: any = {};

  currentVitalForUpdate: any = {};

  currentProcedureId: any;

  subCategory: string = "";

  categoryItem: string = "";

  currentItemId: any;

  unitOfMeasure: any = ""

  currentScanProcedureId: any;

  currentOtherProcedureId: any;

  visit: any = {};

  taken: string = "Taken By"

  orderedBy: string = "Ordered By"

  doneBy: string = "Done By"


  labTestOrderedBy: string = "Ordered By"

  labTestDoneBy: string = "Done By"


  treatmentOrderedBy: string = "Ordered By"

  treatmentDoneBy: string = "Done By"

  scanOrderedBy: string = "Ordered By"

  scanDoneBy: string = "Done By"


  procedureOrderedBy: string = "Ordered By"

  paymentStatus: string = "Status"

  procedureDoneBy: string = "Done By"

  paymentForm: string = "Payment Form"

  taxInvoiceUpdate: any = "Applied Tax"


  station: string = "Station"

  actionButton: string = "Action Button"

  currentClientGroup: string = "Chose Group Name";


  title = "Angular Server Post Data Test"

  vitalsPage: number = 1;
  page: number = 1;

  totalBalance: string = "0.0000000"





  productListInitialVitals: any[] = [];
  productList: any[] = [];
  productListProceduresRequested: any[] = [];

  productListPaymentsMade: any[] = [];

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



  showDivUpdatedLoaderNewItem:boolean = false;

  isLoadingNewItem:boolean = true;

  totalLabTestCost: any = "0.00000";
  totalScanCost: any = "0.00000";
  totalOtherProcedureCost: any = "0.00000";
  totalAmountDue: any = "0.0000000";

  currentInitialTriageVitals: any = {}

  data: any[] = [];

  image: string = "";

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



  showDivAddToDataBaseLabTest: boolean = false;

  showDivUpdatedLabTest: boolean = false;


  showDivAddToDataBaseTreatment: boolean = false;

  showDivAddToDataBaseConsultation: boolean = false;

  showDivUpdatedTreatment: boolean = false;


  showDivUpdated: boolean = false;




  showDivAddToDataBaseScan: boolean = false;

  showDivAddToDataBaseOtherProcedure: boolean = false;

  showDivAddToDataBasePayment: boolean = false;

  showDivAddToDataBaseTaxDiscount: boolean = false;

  showDivUpdatedOtherProcedure: boolean = false;


  showDivUpdatedPayment: boolean = false;


  showDivUpdatedTaxDiscount: boolean = false;


  showDivGeneralResponseMessages: boolean = false;

  generalResponseMessage = "";

  dataBaseResponseMessage = "";



  showDivUpdatedScan: boolean = false;

  closeModalAdd: boolean = false;

  responseColor = "";

  responseMessage = "";

  dataBaseResponseColor = "";

  closeModalUpdate: boolean = false;

  testmethod: boolean = false;

  isButtonDisabled: boolean = false;

  searchTerm: any = '';

  jwt: any;
  modelTitle: string = "Model Title"

  searchQuery: string = '';

  param1Value: string = '';

  param2Value: string = '';

  param3Value: string = '';

  currentPage: number = 1;

  itemsPerPage: number = 10; // Adjust as needed 

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

  fakeUrl: any;

  storedFilter: any;

  clientGroupList: any[] = [];

  labTestList: any[] = [];

  itemList: any[] = [];

  scanList: any[] = [];

  procedureList: any[] = [];

  clientGroup: any[] = [];

  InvoicePdf: any;


  clientFirstName: any;
  clientProfilePic: any;
  clientFileNo: any;
  clientSecondName: any;



  respiratoryRate: any;
  heartRate: any;
  spO2: any;
  height: any;
  weight: any;
  temperature: any;
  bloodPressure: any;
  timeTakenInitialVital: any;
  dateTakenInitialVital: any;
  diagnosis: any;
  clientId: any;
  procedureId: any;

  itemId: any;

  itemSellingPrice: any;

  ItemTemporaryTotal: any;

  currentProcedureRequestedId: any;


  currentTreatmentRequestedId: any;

  currentScanProcedureRequestedId: any;

  currentOtherProcedureRequestedId: any;

  vitalId: any;
  medicalHistory: any;
  clinicalExamination: any;
  visitName: any;
  visitId: any;
  searchText: string = '';

  currentClientVisit: string = 'Choose Client Order'


  clientVisitList: any[] = []; // Initialize to hold client orders


  initialTriageVitals: any[] = []; // Store filtered vitals


  saveButtonStatus: string = "Receive Stock"

  itemUnitCostPrice: any;

  itemUnitOfMeasure: any = "EA";

  itemUnitSellingPrice: any;

  saveButtonStatusLabTest: string = "Save LabTest"

  saveButtonStatusTreatment: string = "Save LabTest"

  showDivAddToDataBaseNewItem: boolean = false;

  showDivAddToDataBaseNewItemOut: boolean = false;

  saveButtonStatusOtherProcedure: string = "Save Procedure"

  saveButtonStatusPayment: string = "Save Payment"

  item: any = {};

  isCollapsedNewItem = true;

  editingStockReceiveId: number | null = null;

  saveButtonStatusTaxDiscount: string = "Save Discount"

  saveButtonStatusScan: string = "Save LabTest"

  saveButtonStatusScanUpdate: string = "Save LabTest"

  visitSaveButtonStatus: string = "Save Visit"

  displayedColumns: string[] = ["id", "number", "title", "category", "image", "description", "price", "action"]

  @ViewChild('usersForm') form!: NgForm;

  @ViewChild('usersFormNewItem') usersFormNewItem!: NgForm;

  @ViewChild('htmlData') htmlData!: ElementRef;

  @ViewChild('serviceSearchInput') serviceSearchInput!: ElementRef;


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
    const userRole = sessionStorage.getItem('userrole');

    const username = sessionStorage.getItem('username');
    if (username === null) {
      this.router.navigate(['/login']);
    } else {
      if (userRole === "CUSTOMER") {
        this.router.navigate(['/products']);

      }
    }
    this.initializeTableData()


  };

  ngAfterViewInit(): void {
    this.modalHost.cleanupStrayLayers();
  }

  ngOnDestroy(): void {
    this.modalHost.teardown();
  }

  private parseToNgbDate(value: any): NgbDate | null {
    if (!value) {
      return null;
    }
    if (typeof value === 'object' && value.year) {
      return value as NgbDate;
    }
    const parts = String(value).trim().split(/[\/\-]/).map((part) => parseInt(part, 10));
    if (parts.length >= 3 && parts.every((part) => !isNaN(part))) {
      return new NgbDate(parts[0], parts[1], parts[2]);
    }
    return null;
  }

  downloadPdf() {

    console.log(this.storedFilter);
    if (this.storedFilter === undefined) {
      this.api.getItemsAdvancedSearchDteEmptyPdfUndefined();
    } else {


      if (this.storedFilter.datefrom === "" || this.storedFilter.dateto === "") {

        this.api.getItemsAdvancedSearchDteEmpty(this.storedFilter);
        // Handle any errors that occur during the API request

      } else {
        // Make an API request using this.api.getItemsAdvancedSearch(data)
        this.api.getItemsAdvancedSearchPdf(this.storedFilter);
      }
    }
  }




  exportToExcel(): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredProductList);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'table-data.xlsx');
  }

  loadDrugList() {
    this.api.getDrugList().subscribe((res) => {
      this.itemList = res;
      console.log('item list', this.itemList);
      //console.log(clientId);

    });
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

  changeCurrentItem(item: any) {
    if (item) {
      //this.ItemTemporaryTotal = item.
      this.itemSellingPrice = item.sellingPrice;
      this.availableQuantity = item.stockAtHand;
      this.itemUnitCostPrice = item.costPrice;
      this.itemUnitSellingPrice = item.sellingPrice;
      this.itemUnitOfMeasure = item.unitOfMeasure;
      this.currentStockReceived.unitSellingPrice = item.sellingPrice;

      this.currentItem = item.title || 'Unknown Treatment';
      this.currentItemId = item.id || null;
      console.log('Selected item name:', this.currentItem);
      console.log('Selected item ID:', this.currentItemId);
      console.log('Selected item name:', item.title);

    } else {
      console.warn('No item selected');
      this.currentItem = 'Choose Item';
    }
  }

unitCost: number = 0;
totalCost: number = 0;




calculateTotalCostFromUnitCost() {
  if (this.currentStockReceived.quantityReceived > 0 && this.unitCost >= 0) {
    this.totalCost = this.unitCost * this.currentStockReceived.quantityReceived;
    this.currentStockReceived.totalCostPrice = this.totalCost;
  } else {
    this.totalCost = 0;
    this.currentStockReceived.totalCostPrice = 0;
  }
}

calculateUnitCost() {
  if (this.currentStockReceived.quantityReceived > 0 && this.currentStockReceived.totalCostPrice >= 0) {
    this.unitCost = this.currentStockReceived.totalCostPrice / this.currentStockReceived.quantityReceived;
  } else {
    this.unitCost = 0;
  }
}


onDropdownClick(event: MouseEvent): void {
  if (this.isUpdatingTreatment) {
    event.stopPropagation();
    return;
  }
  this.loadDrugList();
  setTimeout(() => {
    this.serviceSearchInput?.nativeElement?.focus();
  }, 100);
}


  //edit item
  editItem(receive: any): void {
    if (!receive) {
      return;
    }

    this.isCollapsedNewItem = false;
    this.editingStockReceiveId = receive.id ?? null;
    this.saveButtonStatus = 'Update Stock Receive';

    this.currentStockReceived = {
      ...receive,
      quantityReceived: receive.quantityReceived ?? 0,
      totalCostPrice: receive.totalCostPrice ?? 0,
      unitSellingPrice: receive.unitSellingPrice ?? 0,
      notes: receive.notes ?? '',
      brand: receive.brand ?? '',
      packaging: receive.packaging ?? '',
      receiveDate: this.parseToNgbDate(receive.receiveDate),
      expiryDate: this.parseToNgbDate(receive.expiryDate),
    };
    this.unitCost = receive.unitCostPrice ?? 0;
    this.itemStore = receive.store || receive.itemStore || 'main';

    this.currentItemId = receive.itemId ?? null;
    this.currentItem = receive.title || 'Choose Item';
    this.availableQuantity = receive.quantityAvailable ?? receive.newQuantity ?? this.availableQuantity;
    this.itemUnitCostPrice = receive.unitCostPrice;
    this.itemUnitSellingPrice = receive.unitSellingPrice;

    setTimeout(() => {
      document.getElementById('legacy-stock-receive-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 150);
  }

  itemDetails(receive: any): void {
    this.editItem(receive);
  }

  toggleCollapseNewItem() {
    this.saveButtonStatus = "Receive Stock";
    this.editingStockReceiveId = null;

    this.showDivAddToDataBaseNewItem = false;

    // Reset the form if available
    if (this.usersFormNewItem) {
      this.usersFormNewItem.resetForm(); // This will reset all form fields to their default state
    }

  }








  //delete item
  deleteStockReceived(id: any) {


    this.api.deleteStockReceivedById(id).subscribe(
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

        this.showDivAddToDataBaseNewItemOut = true;
        setTimeout(() => {
          this.showDivAddToDataBaseNewItemOut = false;
        }, 3000);


        this.initializeTableData()

      },
      (error) => {
        console.error("Error deleting item", error);

        this.responseColor = "rgb(238, 16, 16)";
        this.responseMessage = error;

        this.showDivAddToDataBaseNewItemOut = true;
        setTimeout(() => {
          this.showDivAddToDataBaseNewItemOut = false;
        }, 3000);

      }
    );
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
    this.isLoadingStockReceive = true;
    this.api.getAllStockReceived().subscribe(
      (res) => {
        // Ensure response is an array, default to empty array if null/undefined
        this.productList = Array.isArray(res) ? res : [];
        this.isLoadingStockReceive = false;
        console.log("Product List:", this.productList); // Log assigned product list

        this.data = this.productList;
        this.currentPage = 1;
      },
      (error) => {
        console.error('Error fetching stock received data:', error);
        this.productList = [];
        this.data = [];
        this.isLoadingStockReceive = false;
      }
    );

    //console.log("Product List filtered:", this.filteredProductList3); // Log assigned product list

  }
  
  get filteredProductList3(): any[] {
    // Ensure productList is an array
    if (!Array.isArray(this.productList)) {
      return [];
    }

    if (!this.searchQuery || this.searchQuery.trim() === '') {
        return this.productList;
    }

    const query = this.searchQuery.toLowerCase().trim();
    
    return this.productList.filter((item) => {
        if (!item) return false;

        // Null-safe field access with fallback to empty string
        // Access title directly from item, not item.item.title
        const title = item.title?.toLowerCase() || '';
        const brand = item.brand?.toLowerCase() || '';
        
        // Combined field search
        const titleBrand = `${title} ${brand}`.trim();

        if (this.selectedColumn === 'all') {
            // Search in both title and brand when 'all' is selected
            return (
                title.includes(query) ||
                brand.includes(query) ||
                titleBrand.includes(query)
            );
        } else {
            // Search in the selected column only
            switch (this.selectedColumn) {
                case 'title':
                    return title.includes(query);
                case 'brand':
                    return brand.includes(query);
                case 'titleBrand':
                    return titleBrand.includes(query);
                default:
                    return true;
            }
        }
    });
}

onSearchChange(): void {
    // Reset to first page when search changes
    this.page = 1;
}

  get filteredProductList(): any[] {
    return this.productList.filter((item) =>
      item.title.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  get filteredProductList2(): any[] {
    return this.productList.filter((item) => {
      const query = this.searchQuery.toLowerCase();
      // Check if the selectedColumn is 'all' or a specific column
      switch (this.selectedColumn) {
        case 'title':
          return item.item.title.toLowerCase().includes(query);
        case 'quantityReceived':
          return item.quantityReceived.toString().toLowerCase().includes(query);
        case 'newQuantity':
          return item.newQuantity.toString().toLowerCase().includes(query);
        case 'quantityAvailable':
          return item.quantityAvailable.toString().toLowerCase().includes(query);
        case 'receiveDate':
          return item.receiveDate.toString().toLowerCase().includes(query);


          case 'totalCostPrice':
            return item.totalCostPrice.toString().toLowerCase().includes(query);
          case 'expiryDate':
            return item.expiryDate.toString().toLowerCase().includes(query);
          case 'brand':
            return item.brand.toLowerCase().includes(query);



            case 'unitCostPrice':
              return item.unitCostPrice.toString().toLowerCase().includes(query);
            case 'unitSellingPrice':
              return item.unitSellingPrice.toString().toLowerCase().includes(query);

              case 'store':
                return item.store.toLowerCase().includes(query);
              case 'packaging':
                return item.packaging.toLowerCase().includes(query);
        // Add cases for other columns as needed
        default:
          // If 'all' or an invalid column is selected, search in all columns
          return (
            item.item.title.toLowerCase().includes(query) ||
            item.quantityReceived.toString().toLowerCase().includes(query) ||
            item.newQuantity.toString().toLowerCase().includes(query) ||
            item.quantityAvailable.toString().toLowerCase().includes(query) ||
            item.receiveDate.toString().toLowerCase().includes(query) ||
            item.totalCostPrice.toString().toLowerCase().includes(query) ||
            item.expiryDate.toString().toLowerCase().includes(query) ||
            item.brand.toLowerCase().includes(query) ||
            item.unitCostPrice.toString().toLowerCase().includes(query) ||
            item.unitSellingPrice.toString().toLowerCase().includes(query)||
            item.packaging.toLowerCase().includes(query) ||
            item.store.toLowerCase().includes(query)

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
    this.modalHost.hideModal('myModalDeleteWarning');
    this.reopen();
    this.isButtonDisabled = false;
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
    this.modalHost.hideModal('myModalDeleteWarningSingleItem');
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
    this.modalHost.hideModal('myModal');
    this.reopen();
    this.isButtonDisabled = false;
  }

  openModalEdit() {
    this.modalHost.showModal('myModal');
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
    this.modalHost.hideModal('myModal');
    this.reopen();
    this.isButtonDisabled = false;
  }

  closeModalForAdd() {
    this.showDivAddToDataBase = false;
    this.modalHost.hideModal('myModal');
    this.reopen();
    this.isButtonDisabled = false;
  }




  // new form
  getUserFormDataNewItem(data: any) {

    this.showDivUpdatedLoaderNewItem = true;

    console.log("this is original data from stock receive", data);


if (data.unitSellingPrice <= this.unitCost) {
  this.responseMessage = "❌ Unit Selling Price must be greater than the Unit Cost Price.";
  this.responseColor = "rgb(238, 16, 16)";

  this.showDivUpdatedLoaderNewItem = false;
  this.showDivAddToDataBaseNewItem = true;

  setTimeout(() => {
    this.showDivAddToDataBaseNewItem = false;
  }, 4000);

  return; // 🚨 Prevent further execution
}



    // ✅ Convert clientDateOfBirth (Object → String "YYYY-MM-DD") or set to null
    if (data.receiveDate && typeof data.receiveDate === 'object') {
      const { year, month, day } = data.receiveDate;
      data.receiveDate = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    } else {
      data.receiveDate = null; // Handle empty date
    }

    // ✅ Convert clientDateOfBirth (Object → String "YYYY-MM-DD") or set to null
    if (data.expiryDate && typeof data.expiryDate === 'object') {
      const { year, month, day } = data.expiryDate;
      data.expiryDate = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    } else {
      data.expiryDate = null; // Handle empty date
    }

 

  



    //see the data

    const requestData = {
      ...data,
      itemId: this.currentItemId ?? data.itemId,
      store: this.itemStore ?? data.store,
    };

    console.log(requestData);


    this.api.receiveNewStock(requestData).subscribe(
      (response) => {
        console.log("Data sent to API:", response);

        if (response && response.message) {
          this.responseColor = "rgb(11, 155, 112)"; // Green for success
          console.log("Message:", response.message);
          this.responseMessage = response.message;
        } else {
          console.log("Message not found!");
          this.responseColor = "rgb(238, 16, 16)"; // Red for error
          this.responseMessage = "Internal server error";
        }

        this.showDivUpdatedLoaderNewItem = false;


        this.showDivAddToDataBaseNewItem = true;

        this.initializeTableData()
        console.log("stock received successfully");

        setTimeout(() => {
          this.showDivAddToDataBaseNewItem = false;
          this.saveButtonStatus = "Receive Stock";
          this.editingStockReceiveId = null;
          this.toggleCollapseNewItem();
        }, 3000);
        

        //console.log("this is the filtered list", this.filteredProductList3);
        
      },
      (error) => {
        console.error("Error Receiving stock:", error);

        // Display the error message in the div
        this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
        this.responseColor = "rgb(238, 16, 16)"; // Red for error

        this.showDivUpdatedLoaderNewItem = false;


        this.showDivAddToDataBaseNewItem = true;


        setTimeout(() => {
          this.showDivAddToDataBaseNewItem = false;
        }, 4000);
      }
    );

  }


  clearFormShowSaveNewItem() {
    this.currentItem = "Chose Item"

  }


  getUserFormData(data: any) {

    console.log(data);


    if (!this.editModal) {
      this.api.addItem(data).subscribe((result) => {
        console.log(data);
        //console.log(result);
        this.showDivAddToDataBase = true;
        this.showDivUpdated = false;
        this.reopen();
        this.handleClick();
        console.log("item added successfully");
      });

    } else {
      this.api.updateItem(this.currentProductId, data)
      this.showDivUpdated = true;
      this.reopen();
      this.handleClick();
      console.log("item updated successfully");
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
    console.log("modelTitle before " + this.modelTitle);

    this.modelTitle = "Update Product"
    this.actionButton = "Update Product"

    console.log("modelTitle after " + this.modelTitle);

    console.log("showDivUpdated before " + this.showDivUpdated);
    console.log("closeModalAdd before " + this.closeModalAdd);

    this.showDivUpdated = false;
    this.showDivAddToDataBase = false;

    this.closeModalAdd = false;

    this.closeModalUpdate = true;

    console.log("closeupdate after " + this.closeModalUpdate);
    console.log("closeModalAdd after " + this.closeModalAdd);


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
      price: currentProduct.sellingPrice,
      image: currentProduct.image,
    });

    /*this.form.patchValue({
      number: currentProduct.number, // Update field1
      category: currentProduct.category, // Update field2
    });*/
  }












  addItemToCart(item: any) {

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

        //this.cartItems = response.data.entity.data.items;
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

