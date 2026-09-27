import { Component, OnInit, TemplateRef, ViewChild, PipeTransform, ElementRef, inject } from '@angular/core';
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


import { AsyncPipe, DecimalPipe, NgFor } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Observable } from 'rxjs';
import { map, startWith, finalize } from 'rxjs/operators';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';

import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { FilterPipeModule } from 'ngx-filter-pipe';

import * as XLSX from 'xlsx';

import html2canvas from 'html2canvas';

import jsPDF from 'jspdf';

import { Storage, getDownloadURL, ref, uploadBytesResumable } from '@angular/fire/storage';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileresourceService } from '../fileservice/fileresource.service';

declare var $: any;

@Component({
  selector: 'app-services-offered',
  templateUrl: './services-offered.component.html',
  styleUrls: ['./services-offered.component.css']
})
export class ServicesOfferedComponent implements OnInit {

  jsonData: any[] = [];

  private readonly storage: Storage = inject(Storage);
  serverDirectoryName:string='';
  image:string=''
  imgSrc: any = '/assets/imgplaceholder.jpg';
  selectedFile: any;

  cartItems: any = [];

  isCollapsedNewItem = true;

  scanList:any[] = [];

  serviceId:any;
  categoryId:any;
  typeId:any;


  isUpdatingOtherProcedure: boolean = false;
  isUpdatingOtherProcedureType: boolean = false;
  isUpdatingParentCategory: boolean = false;

  currentOtherProcedureId: any;
  currentOtherProcedureTypeId: any;
  currentParentCategoryId: any;

  availableQuantity:any = "00";
  isUpdatingTreatment: boolean = false;
  currentItemId: any;
  currentItem: any = {};
  isDropdownOpen = false;
  itemList:any[] = [];
  itemSellingPrice:any;

  showDivUpdatedLoaderService: boolean = false;
  isLoadingServiceProgress: boolean = true;
  currentOtherProcedure: any;
  currentOtherProcedureType: any;
  currentParentCategory: any;





  isLoadingNewService: boolean = true;




  isCollapsedNewClientBulk = true;

  isCollapsedItemsUsedShow = true;

  isCollapsedCategoryTable = true;

  isCollapsedCategory = true;

  isCollapsedItemsUsed = true;

  currentScanProcedure: any = {};

  procedureList:any[] = [];
  /** Expanded node ids for category tree in Add New Service modal dropdown. */
  expandedServiceCategoryIds = new Set<number>();

  procedureListType:any[] = [];

  currentScanProcedureId: any;

  isUpdatingScan: boolean = false;

  UploadToBackend:string = "Upload To DataBase";

  isLoading: boolean = false;

  searchText: string = '';

  hoveredDate: NgbDate | null = null;

  fromDate: NgbDate | null;
  toDate: NgbDate | null;

  actionButton:string="Action Button"

  isLoadingService: boolean = false;


  title = "Angular Server Post Data Test"

  page: number = 1;

  productList: any[] = [];
  procedureItemUsedList: any[] = [];

  categoryList: any[] = [];
  typeList: any[] = [];


  data: any[] = [];

  productList2: any[] = [];
  data2: any[] = [];

  item: any = {};

  procedure: any = {};

  procedureCategory: any = {};

  procedureType: string = "procedure Type";

  procedureTypeObject: any = {};

  currentItemUsed: any = {};

  // For parent category selection in the "Add Category" modal
  parentCategoryList: any[] = [];
  parentCategoryId: any;
  parentCategoryLabel: string = '';
  parentCategorySearchText: string = '';
  isAddingParentCategory: boolean = false; // Flag to track if adding parent category
  pendingDeleteCategory: any = null;
  isDeletingCategory: boolean = false;
  isSavingCategoryModal: boolean = false;
  categoryModalMessage: string = '';
  isCategorySaveSuccess: boolean = false;

  // For parent category selection in the form
  parentCategoryListForForm: any[] = [];


  filteredUsers: any[] = [];
  category: any;

  itemman: any;
  editModal: boolean = false;
  currentProductId: any;

  idSingleItem: any;

  responseColor = "";

  responseMessage = "";

  totalCartNumber: number = 0;

  titleSingleItem: any;

  tableUpdater: boolean = false;

  showDiv: boolean = false;

  showDivAll: boolean = false;

  showDivAddToDataBaseNewItemseparate: boolean = false;


  showDivAddToDataBaseNewItem: boolean = false;

  currentProcedureCategory:any;

  showDivUpdatedLoaderNewService: boolean = false

  showDivAddToDataBaseNewItemOut: boolean = false;

  showDivAddToDataBase: boolean = false;

  showDivUpdated: boolean = false;

  closeModalAdd: boolean = false;

  closeModalUpdate: boolean = false;

  testmethod: boolean = false;

  isButtonDisabled: boolean = false;

  searchTerm: any = '';

  jwt: any;
  modelTitle:string="Model Title"

  searchQuery: string = '';

  param1Value: string = '';

  param2Value: string = '';

  mdUser: boolean = false;

  deleter: boolean = false;

  param3Value: string = '';

  currentPage: number = 1;

  itemsPerPage: number = 15; // Adjust as needed 

  myModelValue: string = ""

  itemsPerPageNav: number = 1; // Adjust as needed 

  isCollapsed = true;

  subCategory:string = "subCategory";

  //procedure:string = "procedureType";

  categoryItem:string = "category";
  showDivUpdatedOut: boolean = false;

  unitOfMeasure: string = "unit";

  isCollapsedDrop = false;

  iconChange: string = "bi bi-chevron-down"

  currentScanProcedureRequestedUnitSellingPrice:any;

  isText: boolean = true;

  saveButtonStatus: string = "Save Item Used";

  saveButtonStatusNewItem: string = "Save Service";

  saveButtonNewCategory: string = "Save Category";

  saveButtonNewType: string = "Save Type"

  eyeIcon: string = "bi bi-funnel";

  eyeIconDrop: string = "bi bi-chevron-down"

  selectedColumn: string = 'all'; // Initialize selectedColumn to 'all'

  dataSource: any;

  fakeUrl:any;

  storedFilter: any;

  displayedColumns: string[] = ["id", "number", "title", "category", "image", "description", "price", "action"]

  @ViewChild('usersForm') form!: NgForm;

  @ViewChild('usersFormNewItem') usersFormNewItem!: NgForm;

  @ViewChild('usersFormItemUsed') usersFormItemUsed!: NgForm;

  @ViewChild('htmlData') htmlData!: ElementRef;

  @ViewChild('searchInput') searchInput!: ElementRef;

  @ViewChild('serviceSearchInput') serviceSearchInput!: ElementRef;
  @ViewChild('parentCategorySearchInput') parentCategorySearchInput!: ElementRef;

  @ViewChild('usersFormNewCategory') usersFormNewCategory!: NgForm;

  @ViewChild('usersFormNewType') usersFormNewType!: NgForm;

  @ViewChild('addCategoryForm') addCategoryForm!: NgForm;



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

    if (userRole === "md") {
      this.mdUser = true;
 
    }

    if (username === null) {
      this.router.navigate(['/login']);
    }else{
      if (userRole === "CUSTOMER"){
        this.router.navigate(['/products']);

      }
    }
    this.initializeTableData()
    
  };


//bulk
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
    procedureType: row['procedureType'],
    //title: row['title'],
    //unitOfMeasure: row['unitOfMeasure'],
    
    // Number conversion with fallback to 0
    unitSellingPrice: Number(row['unitSellingPrice']) || 0,
    //sellingPrice: Number(row['sellingPrice']) || 0,
    //stockAtHand: Number(row['stockAtHand']) || 0,
    
    // OR if you're using decimal.js for high-precision
    //costPrice: new Decimal(row['costPrice'] || 0),
    //sellingPrice: new Decimal(row['sellingPrice'] || 0),
    // stockAtHand: new Decimal(row['stockAtHand'] || 0),
  }));
}

uploadToBackend() {

  this.UploadToBackend = "Loading Please Wait..."
  this.isLoading = true;

  this.api.addBulkServices(this.jsonData).subscribe({
    next: (res: any) => {
      this.UploadToBackend = "Upload To DataBase"
      this.isLoading = false;
      console.log('Uploaded successfully', res);

      if (res && res.message) {
        this.responseColor = "rgb(11, 155, 112)"; // Green for success
        this.responseMessage = res.message;
      } else {
        this.responseColor = "rgb(238, 16, 16)"; // Red for unexpected response
        this.responseMessage = "Unexpected response from server";
      }

      this.showDivUpdatedOut = true;
      //this.showDivNull = false;
      this.initializeTableData()

      setTimeout(() => {
        this.showDivUpdatedOut = false;
      }, 2000);
    },

    error: (err: any) => {
      console.error('Upload failed', err);
      this.responseColor = "rgb(238, 16, 16)"; // Red for error
      this.responseMessage = err?.error?.message || "Internal server error";

      this.showDivUpdatedOut = true;
      //this.showDivNull = false;

      this.reopen();

      setTimeout(() => {
        this.showDivUpdatedOut = false;

      }, 2000);
    }
  });
}



loadDrugList(){
  this.api.getDrugList().subscribe((res) => {
    this.itemList = res;
    console.log('item list',this.itemList);
    //console.log(clientId);

  });  
}


openOtherProcedureDropdown() {
  this.searchText = "";
  this.loadRequestedOtherProcedure();  // your existing function

  setTimeout(() => {
    this.serviceSearchInput?.nativeElement?.focus();
  }, 0);
}

loadRequestedOtherProcedure(){
  this.api.getOtherServiceList().subscribe((res) => {
    this.procedureList = Array.isArray(res) ? res : [];
    // Ensure selected parent is expanded so children are visible immediately.
    if (this.currentParentCategoryId != null && !Number.isNaN(Number(this.currentParentCategoryId))) {
      this.expandedServiceCategoryIds.add(Number(this.currentParentCategoryId));
    }
    console.log('procedure list',this.procedureList);
    //console.log(clientId);

  });  
}

openParentCategoryDropdown() {
  this.parentCategorySearchText = "";
  this.loadRequestedParentCategories();

  setTimeout(() => {
    this.parentCategorySearchInput?.nativeElement?.focus();
  }, 0);
}

loadRequestedParentCategories(){
  this.api.getOtherServiceList().subscribe((res) => {
    this.parentCategoryListForForm = res;
    console.log('parent category list for form',this.parentCategoryListForForm);
  });  
}




openOtherProcedureDropdownType() {
  this.searchText = "";
  this.loadRequestedOtherProcedureType();  // your existing function

  setTimeout(() => {
    this.serviceSearchInput?.nativeElement?.focus();
  }, 0);
}

loadRequestedOtherProcedureType(){
  this.api.getOtherServiceListType().subscribe((res) => {
    this.procedureListType = res;
    console.log('procedure Type list',this.procedureListType);
    //console.log(clientId);

  });  
}





filteredOtherProcedureList() {
  let filteredOtherProcedureList = this.procedureList ?? [];

  // If no parent category is selected, return empty array
  if (!this.currentParentCategoryId) {
    return [];
  }

  // Filter to show only categories WITH parentId (child categories) that match the selected parent
  // Handle both string and number comparisons
  filteredOtherProcedureList = filteredOtherProcedureList.filter((procedure) => {
    if (procedure.parentId == null || procedure.parentId === undefined) {
      return false;
    }
    // Compare as both string and number to handle type differences
    const procedureParentId = procedure.parentId;
    const selectedParentId = this.currentParentCategoryId;
    return procedureParentId == selectedParentId || 
           String(procedureParentId) === String(selectedParentId) ||
           Number(procedureParentId) === Number(selectedParentId);
  });

  // Filter based on search text
  if (this.searchText) {
    filteredOtherProcedureList = filteredOtherProcedureList.filter((procedure) =>
      procedure.name?.toLowerCase().includes(this.searchText.toLowerCase()) ||
      procedure.procedureCategory?.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  return filteredOtherProcedureList.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
}

private serviceCategoryLabel(category: any): string {
  return String(category?.name ?? category?.procedureCategory ?? '').trim();
}

private serviceCategoryChildren(parentId: number): any[] {
  const rows = this.procedureList ?? [];
  return rows.filter((c: any) => Number(c?.parentId) === Number(parentId));
}

serviceCategoryHasChildren(category: any): boolean {
  if (!category?.id) return false;
  return this.serviceCategoryChildren(Number(category.id)).length > 0;
}

toggleServiceCategoryNode(category: any, event: Event): void {
  event.stopPropagation();
  const id = Number(category?.id);
  if (!Number.isFinite(id)) return;
  if (this.expandedServiceCategoryIds.has(id)) {
    this.expandedServiceCategoryIds.delete(id);
  } else {
    this.expandedServiceCategoryIds.add(id);
  }
}

isServiceCategoryExpanded(category: any): boolean {
  const id = Number(category?.id);
  return Number.isFinite(id) && this.expandedServiceCategoryIds.has(id);
}

/** Flat rows used by tree-like dropdown view (keeps nesting + expand/collapse). */
serviceCategoryTreeRows(): Array<{ node: any; level: number }> {
  const selectedParentId = Number(this.currentParentCategoryId);
  if (!Number.isFinite(selectedParentId)) {
    return [];
  }
  const rows = this.procedureList ?? [];
  const byId = new Map<number, any>();
  rows.forEach((r: any) => {
    const id = Number(r?.id);
    if (Number.isFinite(id)) byId.set(id, r);
  });
  const root = byId.get(selectedParentId);
  if (!root) {
    return [];
  }

  const query = (this.searchText || '').toLowerCase().trim();
  const out: Array<{ node: any; level: number }> = [];

  const labelMatches = (n: any): boolean =>
    this.serviceCategoryLabel(n).toLowerCase().includes(query);

  const includesMatchInSubtree = (n: any): boolean => {
    if (!query) return true;
    if (labelMatches(n)) return true;
    const children = this.serviceCategoryChildren(Number(n?.id));
    for (const child of children) {
      if (includesMatchInSubtree(child)) return true;
    }
    return false;
  };

  const walk = (n: any, level: number): void => {
    if (!includesMatchInSubtree(n)) return;
    out.push({ node: n, level });
    const children = this.serviceCategoryChildren(Number(n?.id));
    if (!children.length) return;
    const expanded = query ? true : this.isServiceCategoryExpanded(n);
    if (!expanded) return;
    const sorted = [...children].sort((a, b) =>
      this.serviceCategoryLabel(a).localeCompare(this.serviceCategoryLabel(b), undefined, { sensitivity: 'base' })
    );
    for (const child of sorted) {
      walk(child, level + 1);
    }
  };

  walk(root, 0);
  return out;
}

filteredParentCategoryListForForm() {
  let filteredList = this.parentCategoryListForForm ?? [];

  // Filter to show only categories WITHOUT parentId (parent categories)
  filteredList = filteredList.filter((category) =>
    category.parentId == null || category.parentId === undefined
  );

  // Filter based on search text
  if (this.parentCategorySearchText) {
    filteredList = filteredList.filter((category) =>
      category.name?.toLowerCase().includes(this.parentCategorySearchText.toLowerCase()) ||
      category.procedureCategory?.toLowerCase().includes(this.parentCategorySearchText.toLowerCase())
    );
  }

  return filteredList.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
}

changeCurrentParentCategoryForForm(parentCategory: any) {
  console.log('Selected parent category:', parentCategory);

  if (parentCategory) {
    this.currentParentCategory = parentCategory.name;
    this.currentParentCategoryId = parentCategory.id || null;
    console.log('Selected parent category name:', this.currentParentCategory);
    console.log('Selected parent category ID:', this.currentParentCategoryId);
    
    // Clear Service Category selection when parent category changes
    this.currentOtherProcedure = '';
    this.currentOtherProcedureId = null;
    this.currentProcedureCategory = null;
    this.searchText = ''; // Clear service category search
    this.parentCategorySearchText = ''; // Clear parent category search
    if (this.parentCategorySearchInput?.nativeElement) {
      this.parentCategorySearchInput.nativeElement.value = '';
      this.parentCategorySearchInput.nativeElement.dispatchEvent(new Event('input'));
    }
    if (this.serviceSearchInput?.nativeElement) {
      this.serviceSearchInput.nativeElement.value = '';
      this.serviceSearchInput.nativeElement.dispatchEvent(new Event('input'));
    }
    
    // Reload the procedure list to ensure we have the latest data
    this.loadRequestedOtherProcedure();
  } else {
    console.warn('No parent category selected');
    this.currentParentCategory = 'Select Parent Category';
    this.currentParentCategoryId = null;
    
    // Clear Service Category selection when parent category is cleared
    this.currentOtherProcedure = '';
    this.currentOtherProcedureId = null;
    this.currentProcedureCategory = null;
    this.searchText = ''; // Clear service category search
    this.parentCategorySearchText = ''; // Clear parent category search
    if (this.parentCategorySearchInput?.nativeElement) {
      this.parentCategorySearchInput.nativeElement.value = '';
      this.parentCategorySearchInput.nativeElement.dispatchEvent(new Event('input'));
    }
    if (this.serviceSearchInput?.nativeElement) {
      this.serviceSearchInput.nativeElement.value = '';
      this.serviceSearchInput.nativeElement.dispatchEvent(new Event('input'));
    }
  }
}

changeCurrentOtherProcedure(procedure: any) {
  console.log('Selected procedure:', procedure);


  if (procedure) {
    this.currentProcedureCategory = procedure;
    this.currentOtherProcedure = this.serviceCategoryLabel(procedure);
    this.currentScanProcedureRequestedUnitSellingPrice = procedure.unitSellingPrice;
    this.currentOtherProcedureId = procedure.id || null;
    console.log('Selected procedure name:', this.currentOtherProcedure);
    console.log('Selected procedure ID:', this.currentOtherProcedureId);
    console.log('Selected procedure name:', procedure.name);
    console.log('Selected procedure category:', this.currentProcedureCategory);
    this.searchText = ''; // Clear service category search after selection
    if (this.serviceSearchInput?.nativeElement) {
      this.serviceSearchInput.nativeElement.value = '';
      this.serviceSearchInput.nativeElement.dispatchEvent(new Event('input'));
    }


  } else {
    console.warn('No procedure selected');
    this.currentOtherProcedure = 'Choose Procedure';
  }
}





filteredOtherProcedureListType() {
  let filteredOtherProcedureListType = this.procedureListType ?? [];

  // Filter based on search text
  if (this.searchText) {
    filteredOtherProcedureListType = filteredOtherProcedureListType.filter((procedureTypeObject) =>
      procedureTypeObject.procedureType?.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  return filteredOtherProcedureListType.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
}

changeCurrentOtherProcedureType(procedure: any) {
  console.log('Selected procedure type:', procedure);

  if (procedure) {
    this.currentProcedureCategory = procedure.category;
    this.currentOtherProcedureType = procedure.procedureType;
    this.currentScanProcedureRequestedUnitSellingPrice = procedure.unitSellingPrice;
    this.currentOtherProcedureTypeId = procedure.id || null;
    console.log('Selected type:', this.currentOtherProcedureType);
    console.log('Selected type ID:', this.currentOtherProcedureTypeId);
    console.log('Selected type category:', this.currentProcedureCategory);
  } else {
    console.warn('No procedure type selected');
    this.currentOtherProcedureType = 'Choose Type';
  }
}













openDropdown() {
  this.loadDrugList();  // your existing function
  this.isDropdownOpen = true;

  setTimeout(() => {
    this.searchText = "";
    this.searchInput?.nativeElement?.focus();
  }, 0); // Delay allows DOM to render first
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



changeCurrentScanProcedure(procedure: any) {
  if (procedure) {
    this.currentScanProcedure = procedure.procedureName || 'Unknown procedure';
    this.currentScanProcedureId = procedure.id || null;
    this.currentScanProcedureRequestedUnitSellingPrice = procedure.unitSellingPrice || null;

    console.log('Selected procedure name:', this.currentScanProcedure);
    console.log('Selected procedure ID:', this.currentScanProcedureId);
    console.log('Selected procedure name:', procedure.procedureName);

    this.getProcedureItemUsedById(this.currentScanProcedureId);

  } else {
    console.warn('No Scan procedure selected');
    this.currentScanProcedure = 'Choose Scan';
  }
}

loadRequestedScans(){
  this.searchText = "";

  this.api.getAllProcedureList().subscribe((res) => {
    this.scanList = res;
    console.log('scan list',this.scanList);
    //console.log(clientId);

  });  
  setTimeout(() => {
    if (this.serviceSearchInput) {
      this.serviceSearchInput.nativeElement.focus();
    }
  }, 0);
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



  updateItemUsed(item: any) {

    //this.initializeTableData()
  
    //this.isCollapsedNewItem = false;
    this.isCollapsedItemsUsed = false;
    this.isCollapsedItemsUsedShow = false;
     this.currentItem = "Chose Item Used"
  
     //this.saveButtonStatusNewItem = "UpDate Service"
   
      console.log('this is the service item :', item);
    
      console.log('plain id:', item.id);
  
      this.serviceId = item.id;
  
      this.procedure = item;
  
      // Lock the service selection to the chosen service
      this.isUpdatingScan = true;
      this.currentScanProcedure = item.procedureName || item.procedureType;
      this.currentScanProcedureId = item.id;
  
      //this.procedureType = item.procedureType;
      console.log('type service:', item.procedureType);
  
      //this.categoryItem = item.category;
  
   
      console.log('Editing service:', this.procedure);
  
      //this.currentScanProcedureRequestedUnitSellingPrice = item.unitSellingPrice || null;
  
      console.log('Selected procedure name:', this.currentScanProcedure);
      console.log('Selected procedure ID:', this.currentScanProcedureId);
      console.log('Selected procedure name:', item.procedureName);
  
      this.getProcedureItemUsedById(this.currentScanProcedureId);
  
  
  }
    





// edit service

editService(item: any) {

  //this.initializeTableData()

  this.isCollapsedNewItem = false;
  //this.isCollapsedItemsUsed = false;
  //this.isCollapsedItemsUsedShow = false;
   this.currentItem = "Chose Item Used"

    this.saveButtonStatusNewItem = "UpDate Service"
 
    console.log('this is the service item :', item);
  
    console.log('plain id:', item.id);

    this.serviceId = item.id;

    this.procedure = item;

    this.currentOtherProcedure = item.category;
    this.currentOtherProcedureId = null;
    this.currentParentCategory = 'Select Parent Category';
    this.currentParentCategoryId = null;

    // Load categories and resolve parent category for the selected service
    this.api.getOtherServiceList().subscribe((res) => {
      this.procedureList = res;
      const selectedCategory = this.procedureList.find((cat: any) =>
        cat?.name === item.category || cat?.procedureCategory === item.category
      );
      if (selectedCategory) {
        this.currentOtherProcedureId = selectedCategory.id || null;
        if (selectedCategory.parentId != null) {
          this.currentParentCategoryId = selectedCategory.parentId;
          const parentCat = this.procedureList.find((cat: any) => cat?.id === selectedCategory.parentId);
          if (parentCat) {
            this.currentParentCategory = parentCat.name;
          }
        }
      }
    });

    this.currentOtherProcedureType = item.procedureType;

    this.currentScanProcedureId = item.id;

    //this.procedureType = item.procedureType;
    console.log('type service:', item.procedureType);

    this.categoryItem = item.category;

 
    console.log('Editing service:', this.procedure);

    this.currentScanProcedureRequestedUnitSellingPrice = item.unitSellingPrice || null;

    console.log('Selected procedure name:', this.currentScanProcedure);
    console.log('Selected procedure ID:', this.currentScanProcedureId);
    console.log('Selected procedure name:', item.procedureName);

   // this.getProcedureItemUsedById(this.currentScanProcedureId);


}
  


toggleCollapseNewItem(){
  this.saveButtonStatus = "Save Service"


  this.categoryItem = "";
  // Reset category selections to default placeholders
  this.currentParentCategory = 'Select Parent Category';
  this.currentParentCategoryId = null;
  this.currentOtherProcedure = 'Select Category';
  this.currentOtherProcedureId = null;
  this.currentProcedureCategory = null;
  this.searchText = '';
  this.parentCategorySearchText = '';
  
  this.showDivAddToDataBaseNewItem = false;

  // Reset the form if available
  if (this.usersFormNewItem) {
    this.usersFormNewItem.resetForm(); // This will reset all form fields to their default state
  }

}

toggleCollapseNewCategory(){
  this.saveButtonNewCategory = "Save Category"


  //this.categoryItem = "";
  
  this.showDivAddToDataBaseNewItem = false;

  // Reset the form if available
  if (this.usersFormNewCategory) {
    this.usersFormNewCategory.resetForm(); // This will reset all form fields to their default state
  }

}


toggleCollapseNewType(){
  this.saveButtonNewCategory = "Save Type"


  //this.categoryItem = "";
  
  this.showDivAddToDataBaseNewItem = false;

  // Reset the form if available
  if (this.usersFormNewType) {
    this.usersFormNewType.resetForm(); // This will reset all form fields to their default state
  }

}






//delete item
editCategory(item:any) {
  console.log("category id", item.id);

  this.categoryId = item.id;
  this.saveButtonNewCategory = "UpDate Category"
  this.procedureCategory = item;

}

// Edit category from dropdown
editCategoryFromDropdown(category: any, event: Event) {
  event.stopPropagation(); // Prevent dropdown item selection
  event.preventDefault();
  
  // Close the dropdown
  $('.dropdown-menu').removeClass('show');
  
  // Open the modal in edit mode
  this.isAddingParentCategory = !category.parentId; // Check if it's a parent category
  this.categoryId = category.id;
  this.saveButtonNewCategory = "UpDate Category";
  this.procedureCategory = category;
  
  // Pre-fill the form with category data
  if (category.parentId) {
    this.parentCategoryId = category.parentId;
    // Find parent category name
    const parentCat = this.parentCategoryListForForm.find(cat => cat.id === category.parentId);
    if (parentCat) {
      this.parentCategoryLabel = parentCat.name;
    }
  } else {
    this.parentCategoryId = null;
    this.parentCategoryLabel = '';
  }
  
  // Load parent categories for the dropdown
  this.loadParentCategories();
  
  // Open modal
  $('#addCategoryModal').modal('show');
  
  // Set form values after a short delay to ensure form is rendered
  setTimeout(() => {
    const form = document.querySelector('#addCategoryModal form') as HTMLFormElement;
    if (form) {
      // Set the values programmatically
      const nameInput = form.querySelector('[name="name"]') as HTMLInputElement;
      const descInput = form.querySelector('[name="description"]') as HTMLTextAreaElement;
      if (nameInput) {
        nameInput.value = category.name || '';
        // Trigger input event to update ngModel
        nameInput.dispatchEvent(new Event('input'));
      }
      if (descInput) {
        descInput.value = category.description || category.categoryDescription || '';
        // Trigger input event to update ngModel
        descInput.dispatchEvent(new Event('input'));
      }
    }
  }, 200);
}

// Add child category quickly from the dropdown row action
openAddSubCategoryFromDropdown(category: any, event: Event) {
  event.stopPropagation();
  event.preventDefault();
  if (!category) {
    return;
  }
  // Set selected parent so the modal opens prefilled for this parent
  this.currentParentCategoryId = category.id ?? null;
  this.currentParentCategory = category.name || category.procedureCategory || '';
  this.parentCategoryId = this.currentParentCategoryId;
  this.parentCategoryLabel = this.currentParentCategory;
  this.openAddCategoryModal();
}

// Delete category from dropdown
deleteCategoryFromDropdown(category: any, event: Event) {
  event.stopPropagation(); // Prevent dropdown item selection
  event.preventDefault();
  this.pendingDeleteCategory = category;
  $('#deleteCategoryModal').modal('show');
}

closeDeleteCategoryModal() {
  this.pendingDeleteCategory = null;
  $('#deleteCategoryModal').modal('hide');
}

confirmDeleteCategory() {
  const category = this.pendingDeleteCategory;
  if (!category) {
    this.closeDeleteCategoryModal();
    return;
  }

  this.isDeletingCategory = true;
  this.api.deleteProcedureCategoryById(category.id).pipe(
    finalize(() => {
      this.isDeletingCategory = false;
    })
  ).subscribe(
    (response: any) => {
      console.log("Category deleted successfully", response);
      
      if (response && response.message) {
        this.responseColor = "rgb(11, 155, 112)"; // Green for success
        this.responseMessage = response.message;
      } else {
        this.responseColor = "rgb(11, 155, 112)";
        this.responseMessage = "Category deleted successfully";
      }
      
      this.showDivAddToDataBaseNewItem = true;
      
      // Reload categories
      this.loadRequestedOtherProcedure();
      this.loadRequestedParentCategories();
      this.getAllCategory();
      
      // Clear selection if deleted category was selected
      if (this.currentParentCategoryId === category.id) {
        this.currentParentCategory = '';
        this.currentParentCategoryId = null;
      }
      if (this.currentOtherProcedureId === category.id) {
        this.currentOtherProcedure = '';
        this.currentOtherProcedureId = null;
      }
      
      setTimeout(() => {
        this.showDivAddToDataBaseNewItem = false;
      }, 3000);
      this.closeDeleteCategoryModal();
    },
    (error: any) => {
      console.error("Error deleting category", error);
      this.responseColor = "rgb(238, 16, 16)"; // Red for error
      this.responseMessage = error.error?.message || "Failed to delete category";
      this.showDivAddToDataBaseNewItem = true;
      
      setTimeout(() => {
        this.showDivAddToDataBaseNewItem = false;
      }, 4000);
    }
  );
}

//delete item
editType(item:any) {
  console.log("type id", item.id);

  this.typeId = item.id;
  this.saveButtonNewType = "UpDate Type"
  this.procedureTypeObject = item;

}








//delete item
deleteItemUsed(id: any) {



  this.api.deleteItemUsedById(id).subscribe(
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


      this.getProcedureItemUsedById(this.currentScanProcedureId);

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





//delete item
  deleteItem(id: any) {


    this.api.deleteServiceById(id).subscribe(
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
    this.isLoadingService = true;
    this.api.getAllServices().subscribe((res) => {
      this.isLoadingService = false;
      this.productList = res;
      this.data = res;
      console.log("this this the response "+ res);
      //console.log("this this the data "+ this.data);
      //.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
      this.currentPage = 1;
      //console.log(this.editModal);
    });
  }

  
  getProcedureItemUsedById(id:any) {
    this.showDivUpdatedLoaderNewService = true;
    this.api.getAllItemsUsedInProcedure(id).subscribe((res) => {
     this.currentPage = 1;
      this.showDivUpdatedLoaderNewService = false;
      this.procedureItemUsedList = res;

   
      //this.data = res;
      console.log("this this the response "+ res);
      //console.log("this this the data "+ this.data);
      //.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
      
      //console.log(this.editModal);
    });
  }




  getAllCategory() {
    //this.showDivUpdatedLoaderNewService = true;
    this.api.getAllCategories().subscribe((res) => {
     //this.currentPage = 1;
      //this.showDivUpdatedLoaderNewService = false;
      this.categoryList = res;

   
      //this.data = res;
      console.log("this this the response "+ res);
      //console.log("this this the data "+ this.data);
      //.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
      
      //console.log(this.editModal);
    });
  }

  // Load categories for the parent category dropdown using getOtherServiceList()
  loadParentCategories() {
    this.api.getOtherServiceList().subscribe((res) => {
      this.parentCategoryList = Array.isArray(res) ? res : [];
      console.log('parent category list', this.parentCategoryList);
    });
  }

  private categoryDisplayName(cat: any): string {
    return cat?.name || cat?.procedureCategory || '';
  }

  // Filter list for the parent category dropdown in the modal
  filteredParentCategoryList() {
    if (!this.parentCategoryList) {
      return [];
    }

    // Same cascading behavior as stock-item category flow:
    // parent dropdown shows only top-level categories.
    let rows = this.parentCategoryList.filter(
      (cat: any) => cat?.parentId == null || cat?.parentId === undefined
    );

    const query = (this.parentCategorySearchText || '').toLowerCase().trim();
    if (!query) {
      return rows;
    }

    return rows.filter((cat: any) =>
      this.categoryDisplayName(cat).toLowerCase().includes(query)
    );
  }

  changeCurrentParentCategory(cat: any) {
    if (!cat) {
      this.parentCategoryId = null;
      this.parentCategoryLabel = '';
      return;
    }

    this.parentCategoryId = cat.id;
    this.parentCategoryLabel = this.categoryDisplayName(cat);
  }

  
  getAllTypes() {
    //this.showDivUpdatedLoaderNewService = true;
    this.api.getAllTypes().subscribe((res) => {
     //this.currentPage = 1;
      //this.showDivUpdatedLoaderNewService = false;
      this.typeList = res;

   
      //this.data = res;
      console.log("this this the response "+ res);
      //console.log("this this the data "+ this.data);
      //.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
      
      //console.log(this.editModal);
    });
  }





  get filteredProductList3(): any[] {
    let result = this.productList;
    
    if (!result || !Array.isArray(result)) return [];
    
    // Apply search filter if search query exists
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase().trim();
      
      result = result.filter((item) => {
        if (!item) return false;
    
        // Convert numbers to strings for searching
        const costPriceStr = item.unitCostPrice?.toString() || '';
        const sellingPriceStr = item.unitSellingPrice?.toString() || '';
    
        if (this.selectedColumn === 'all') {
          return (
            (item.category?.toLowerCase() || '').includes(query) ||
            (item.description?.toLowerCase() || '').includes(query) ||
            (item.procedureName?.toLowerCase() || '').includes(query) ||
            (item.procedureType?.toLowerCase() || '').includes(query) ||
            costPriceStr.includes(query) ||
            sellingPriceStr.includes(query)
          );
        } else {
          switch (this.selectedColumn) {
            case 'category':
              return (item.category?.toLowerCase() || '').includes(query);
            case 'description':
              return (item.description?.toLowerCase() || '').includes(query);
            case 'procedureName':
              return (item.procedureName?.toLowerCase() || '').includes(query);
            case 'procedureType':
              return (item.procedureType?.toLowerCase() || '').includes(query);
            case 'unitCostPrice':
              return costPriceStr.includes(query);
            case 'unitSellingPrice':
              return sellingPriceStr.includes(query);
            default:
              return false;
          }
        }
      });
    }
    
    // Sort in descending order by ID (newest first)
    return result.sort((a, b) => {
      const idA = a.id || 0;
      const idB = b.id || 0;
      return idB - idA; // Descending order
    });
  }

  // Open/close modal for quickly adding a new service category from the dropdown
  openAddCategoryModal() {
    // Ensure we have the latest categories for the parent dropdown
    this.loadParentCategories();
    this.isAddingParentCategory = false; // Regular category mode
    this.isSavingCategoryModal = false;
    this.categoryModalMessage = '';
    this.isCategorySaveSuccess = false;
    if (this.addCategoryForm) {
      this.addCategoryForm.resetForm();
    }
    
    // Pre-fill the parent category if one is already selected
    if (this.currentParentCategoryId) {
      this.parentCategoryId = this.currentParentCategoryId;
      // Use the current parent category name that's already selected
      if (this.currentParentCategory) {
        this.parentCategoryLabel = this.currentParentCategory;
      } else {
        // Find the parent category name from the list
        const parentCat = this.parentCategoryListForForm.find(cat => cat.id === this.currentParentCategoryId);
        if (parentCat) {
          this.parentCategoryLabel = parentCat.name;
        } else {
          // If not in the list, try to find it in the full list
          const allParentCat = this.parentCategoryList.find(cat => cat.id === this.currentParentCategoryId);
          if (allParentCat) {
            this.parentCategoryLabel = allParentCat.name;
          }
        }
      }
    } else {
      // Clear if no parent category is selected
      this.parentCategoryId = null;
      this.parentCategoryLabel = '';
    }
    
    $('#addCategoryModal').modal('show');
  }

  openAddParentCategoryModal() {
    this.isAddingParentCategory = true; // Parent category mode
    // Clear parent category fields since parent categories don't have parentIds
    this.isSavingCategoryModal = false;
    this.categoryModalMessage = '';
    this.isCategorySaveSuccess = false;
    if (this.addCategoryForm) {
      this.addCategoryForm.resetForm();
    }
    this.parentCategoryId = null;
    this.parentCategoryLabel = '';
    this.parentCategorySearchText = '';
    $('#addCategoryModal').modal('show');
  }

  closeAddCategoryModal() {
    $('#addCategoryModal').modal('hide');
    // Reset the flag when closing
    this.isAddingParentCategory = false;
    this.parentCategoryId = null;
    this.parentCategoryLabel = '';
    this.parentCategorySearchText = '';
    this.isSavingCategoryModal = false;
    this.categoryModalMessage = '';
    this.isCategorySaveSuccess = false;
  }

  submitAddCategoryFromModal(form: NgForm) {
    // Re‑use existing new‑category logic with form data
    const data = form.value;
    
    // If adding a parent category, ensure parentId is null
    if (this.isAddingParentCategory) {
      data.parentId = null;
      this.isSavingCategoryModal = true;
      this.categoryModalMessage = '';
      this.api.saveNewCategory(data).pipe(
        finalize(() => {
          this.isSavingCategoryModal = false;
        })
      ).subscribe(
        (response: any) => {
          this.isCategorySaveSuccess = true;
          if (response && response.message) {
            this.categoryModalMessage = response.message;
          } else {
            this.categoryModalMessage = "Saved successfully";
          }
          // Refresh category lists
          this.loadRequestedParentCategories();
          this.loadRequestedOtherProcedure();
          this.getAllCategory();

          setTimeout(() => {
            this.closeAddCategoryModal();
          }, 6000);
        },
        (error: any) => {
          this.isCategorySaveSuccess = false;
          this.categoryModalMessage = error?.error?.message || "Failed to save category";
        }
      );
      return;
    } else {
      // For regular categories, include the selected parent category ID
      if (this.parentCategoryId) {
        data.parentId = this.parentCategoryId;
      }
    }

    this.isSavingCategoryModal = true;
    this.categoryModalMessage = '';
    this.isCategorySaveSuccess = false;

    if (this.saveButtonNewCategory === "UpDate Category") {
      this.api.updateCategoryById(this.categoryId, data).pipe(
        finalize(() => {
          this.isSavingCategoryModal = false;
        })
      ).subscribe(
        (response: any) => {
          this.isCategorySaveSuccess = true;
          this.categoryModalMessage = response?.message || "Updated successfully";
          this.loadRequestedParentCategories();
          this.loadRequestedOtherProcedure();
          this.getAllCategory();
          setTimeout(() => {
            this.closeAddCategoryModal();
          }, 6000);
        },
        (error: any) => {
          this.isCategorySaveSuccess = false;
          this.categoryModalMessage = error?.error?.message || "Failed to update category";
        }
      );
    } else {
      this.api.saveNewCategory(data).pipe(
        finalize(() => {
          this.isSavingCategoryModal = false;
        })
      ).subscribe(
        (response: any) => {
          this.isCategorySaveSuccess = true;
          this.categoryModalMessage = response?.message || "Saved successfully";
          this.loadRequestedParentCategories();
          this.loadRequestedOtherProcedure();
          this.getAllCategory();
          setTimeout(() => {
            this.closeAddCategoryModal();
          }, 6000);
        },
        (error: any) => {
          this.isCategorySaveSuccess = false;
          this.categoryModalMessage = error?.error?.message || "Failed to save category";
        }
      );
    }
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
          return item.title.toLowerCase().includes(query);
        case 'subCategory':
          return item.subCategory.toLowerCase().includes(query);
        case 'category':
          return item.category.toLowerCase().includes(query);

        // Add cases for other columns as needed
        default:
          // If 'all' or an invalid column is selected, search in all columns
          return (
            item.title.toLowerCase().includes(query) ||
            item.subCategory.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query)


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



  // new form
  getUserFormDataNewItem(data:any){
    this.showDivUpdatedLoaderService = true;


// Assuming requestData is your existing object
const requestData = {
  ...data, // Spread existing properties
  category: this.currentOtherProcedure,
  //categoryId: this.currentOtherProcedure,
  //procedureType: this.currentOtherProcedureType
  // Update only productId
};

    console.log(requestData);

    if(this.saveButtonStatusNewItem == "Save Service"){
    this.api.saveNewService(requestData).subscribe(
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
        this.showDivUpdatedLoaderService = false;

        this.showDivAddToDataBaseNewItem = false;


        this.showDivAddToDataBaseNewItem = true;

        this.initializeTableData()
        console.log("item added successfully");

        setTimeout(() => {
          this.showDivAddToDataBaseNewItem = false;
          this.saveButtonStatusNewItem = "Save Service";
          this.toggleCollapseNewItem();
          
          // Clear all fields after successfully adding a new service
          this.currentOtherProcedure = '';
          this.currentOtherProcedureId = null;
          this.currentProcedureCategory = null;
          this.currentOtherProcedureType = '';
          this.currentOtherProcedureTypeId = null;
          
          // Reset the form
          if (this.usersFormNewItem) {
            this.usersFormNewItem.resetForm();
          }
        }, 3000);
      },
      (error) => {
        console.error("Error saving treatment:", error);

        // Display the error message in the div
        this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
        this.responseColor = "rgb(238, 16, 16)"; // Red for error
        this.showDivUpdatedLoaderService = false;


        this.showDivAddToDataBaseNewItem = true;
       

        setTimeout(() => {
          this.showDivAddToDataBaseNewItem = false;
        }, 4000);
      }
    );

  }else{

    

    if(this.saveButtonStatusNewItem == "UpDate Service"){
      console.log("Data sent to API:", requestData);
      this.api.updateServiceById(this.serviceId, requestData).subscribe(
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

          this.showDivUpdatedLoaderService = false;

  
          this.showDivAddToDataBaseNewItem = true;
  
          this.initializeTableData()
          console.log("item added successfully");
  
          setTimeout(() => {
            this.showDivAddToDataBaseNewItem = false;
            this.saveButtonStatusNewItem = "Save Service";
            this.toggleCollapseNewItem();

            // After updating a service, clear all form fields including category selection
            this.currentOtherProcedure = '';
            this.currentOtherProcedureId = null;
            this.currentProcedureCategory = null;
          }, 3000);
        },
        (error) => {
          console.error("Error saving treatment:", error);
  
          // Display the error message in the div
          this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
          this.responseColor = "rgb(238, 16, 16)"; // Red for error

          this.showDivUpdatedLoaderService = false;

  
          this.showDivAddToDataBaseNewItem = true;
         
  
          setTimeout(() => {
            this.showDivAddToDataBaseNewItem = false;
          }, 4000);
        }
      );
  
    }
  }

}








  // new form
  getUserFormDataNewType(data:any){
    this.showDivUpdatedLoaderService = true;
    console.log("new service type data",data);



    if(this.saveButtonNewType == "Save Type"){
    this.api.saveNewType(data).subscribe(
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
        this.showDivUpdatedLoaderService = false;

        this.showDivAddToDataBaseNewItem = false;


        this.showDivAddToDataBaseNewItem = true;

        this.getAllTypes()
        console.log("item added successfully");

        setTimeout(() => {
          this.showDivAddToDataBaseNewItem = false;
          this.saveButtonNewType = "Save Type";
          this.toggleCollapseNewType();
          
          // Clear all fields after successfully adding a new type
          if (this.usersFormNewType) {
            this.usersFormNewType.resetForm();
          }
        }, 3000);
      },
      (error) => {
        console.error("Error saving treatment:", error);

        // Display the error message in the div
        this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
        this.responseColor = "rgb(238, 16, 16)"; // Red for error
        this.showDivUpdatedLoaderService = false;


        this.showDivAddToDataBaseNewItem = true;
       

        setTimeout(() => {
          this.showDivAddToDataBaseNewItem = false;
        }, 4000);
      }
    );

  }else{

    if(this.saveButtonNewType == "UpDate Type"){
      console.log("Data sent to API:", data);
      this.api.updateTypeById(this.typeId, data).subscribe(
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

          this.showDivUpdatedLoaderService = false;

  
          this.showDivAddToDataBaseNewItem = true;
  
          this.getAllTypes()
          console.log("item added successfully");
  
          setTimeout(() => {
            this.showDivAddToDataBaseNewItem = false;
            this.saveButtonNewType = "Save Type";
            this.toggleCollapseNewType();
            
            // Clear all fields after successfully updating a type
            if (this.usersFormNewType) {
              this.usersFormNewType.resetForm();
            }
          }, 3000);
        },
        (error) => {
          console.error("Error saving treatment:", error);
  
          // Display the error message in the div
          this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
          this.responseColor = "rgb(238, 16, 16)"; // Red for error

          this.showDivUpdatedLoaderService = false;

  
          this.showDivAddToDataBaseNewItem = true;
         
  
          setTimeout(() => {
            this.showDivAddToDataBaseNewItem = false;
          }, 4000);
        }
      );
  
    }
  }

}









  // new form
  getUserFormDataNewCategory(data:any){
    this.showDivUpdatedLoaderService = true;
    console.log("new category type data",data);

    if(this.saveButtonNewCategory == "Save Category"){
    this.api.saveNewCategory(data).subscribe(
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
        this.showDivUpdatedLoaderService = false;

        this.showDivAddToDataBaseNewItem = false;


        this.showDivAddToDataBaseNewItem = true;

        this.getAllCategory()
        console.log("item added successfully");

        setTimeout(() => {
          this.showDivAddToDataBaseNewItem = false;
          this.saveButtonNewCategory = "Save Category";
          this.toggleCollapseNewCategory();
          
          // Clear all fields after successfully adding a new category
          this.parentCategoryId = null;
          this.parentCategoryLabel = '';
          this.parentCategorySearchText = '';
          
          if (this.usersFormNewCategory) {
            this.usersFormNewCategory.resetForm();
          }
        }, 3000);
      },
      (error) => {
        console.error("Error saving treatment:", error);

        // Display the error message in the div
        this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
        this.responseColor = "rgb(238, 16, 16)"; // Red for error
        this.showDivUpdatedLoaderService = false;


        this.showDivAddToDataBaseNewItem = true;
       

        setTimeout(() => {
          this.showDivAddToDataBaseNewItem = false;
        }, 4000);
      }
    );

  }else{

    if(this.saveButtonNewCategory == "UpDate Category"){
      console.log("Data sent to API:", data);
      this.api.updateCategoryById(this.categoryId, data).subscribe(
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

          this.showDivUpdatedLoaderService = false;

  
          this.showDivAddToDataBaseNewItem = true;
  
          this.getAllCategory()
          console.log("item added successfully");
  
          setTimeout(() => {
            this.showDivAddToDataBaseNewItem = false;
            this.saveButtonNewCategory = "Save Category";
            this.toggleCollapseNewCategory();
            
            // Clear all fields after successfully updating a category
            this.parentCategoryId = null;
            this.parentCategoryLabel = '';
            this.parentCategorySearchText = '';
            
            if (this.usersFormNewCategory) {
              this.usersFormNewCategory.resetForm();
            }
          }, 3000);
        },
        (error) => {
          console.error("Error saving treatment:", error);
  
          // Display the error message in the div
          this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
          this.responseColor = "rgb(238, 16, 16)"; // Red for error

          this.showDivUpdatedLoaderService = false;

  
          this.showDivAddToDataBaseNewItem = true;
         
  
          setTimeout(() => {
            this.showDivAddToDataBaseNewItem = false;
          }, 4000);
        }
      );
  
    }
  }

}










  // new form
  getUserFormDataItemUsed(data:any){

    this.showDivUpdatedLoaderService = true;




    console.log(data);

    const requestData = {
      ...data, // Spread existing properties
      procedureId: this.serviceId // Update only productId
    };


    if(this.saveButtonStatus == "Save Item Used"){
    this.api.saveItemUsedInService(requestData).subscribe(
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
        this.showDivUpdatedLoaderService = false;


        this.showDivAddToDataBaseNewItemseparate = true;

        this.initializeTableData()
        console.log("item added successfully");

        setTimeout(() => {
          this.showDivAddToDataBaseNewItemseparate = false;
          this.saveButtonStatus = "Save Item Used";
          
          // Clear all fields after successfully adding a new item used
          this.currentItem = '';
          this.currentItemId = null;
          this.itemSellingPrice = null;
          this.availableQuantity = "00";
          
          if (this.usersFormItemUsed) {
            this.usersFormItemUsed.resetForm();
          }
          
          this.getProcedureItemUsedById(this.currentScanProcedureId);
        }, 2000);
      },
      (error) => {
        console.error("Error saving treatment:", error);

        // Display the error message in the div
        this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
        this.responseColor = "rgb(238, 16, 16)"; // Red for error
        this.showDivUpdatedLoaderService = false;


        this.showDivAddToDataBaseNewItemseparate = true;
       

        setTimeout(() => {
          this.showDivAddToDataBaseNewItemseparate = false;
        }, 4000);
      }
    );

  }else{

    if(this.saveButtonStatus == "UpDate Item Used"){
      this.api.updateServiceById(this.serviceId, data).subscribe(
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
  
          this.showDivAddToDataBaseNewItemseparate = true;
  
          this.initializeTableData()
          console.log("item added successfully");
  
          setTimeout(() => {
            this.showDivAddToDataBaseNewItemseparate = false;
            this.saveButtonStatus = "Save Item Used";
            
            // Clear all fields after successfully updating an item used
            this.currentItem = '';
            this.currentItemId = null;
            this.itemSellingPrice = null;
            this.availableQuantity = "00";
            
            if (this.usersFormItemUsed) {
              this.usersFormItemUsed.resetForm();
            }
          }, 3000);
        },
        (error) => {
          console.error("Error saving treatment:", error);
  
          // Display the error message in the div
          this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
          this.responseColor = "rgb(238, 16, 16)"; // Red for error
  
          this.showDivAddToDataBaseNewItemseparate = true;
         
  
          setTimeout(() => {
            this.showDivAddToDataBaseNewItemseparate = false;
          }, 4000);
        }
      );
  
    }
  }

}

clearFormShowSaveUpdateItem(){

      this.currentScanProcedure = "Chose Procedure"
         this.currentItem = "Chose Item Used"

         this.currentScanProcedureId = "";
         this.isUpdatingScan = false;

  if (this.usersFormNewItem) {
    this.usersFormNewItem.resetForm();  // Reset the form to clear all fields

  }

  this.saveButtonStatus = "Save Item Used"

  this.getAllTypes();
  this.getAllCategory();
  
}



  clearFormShowSaveNewItem(){

    if (this.usersFormItemUsed) {
      this.usersFormItemUsed.resetForm();  // Reset the form to clear all fields
    }
    this.usersFormNewItem.resetForm();

    this.saveButtonStatusNewItem = "Save Service"
    this.currentOtherProcedureType = "";
    this.currentOtherProcedure = "";


    console.log("save button updated back",this.saveButtonStatusNewItem);
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
      price: currentProduct.sellingPrice,
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
