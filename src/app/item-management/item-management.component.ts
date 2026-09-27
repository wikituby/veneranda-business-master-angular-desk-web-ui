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

declare var $: any;

@Component({
  selector: 'app-item-management',
  templateUrl: './item-management.component.html',
  styleUrls: ['./item-management.component.css']
})
export class ItemManagementComponent implements OnInit, AfterViewInit, OnDestroy {

  private readonly modalHost = new BootstrapModalHost('app-item-management');

  jsonData: any[] = [];

  private get storage() {
    return getStorage(getApp());
  }
  serverDirectoryName:string='';
  image:string=''
  imgSrc: any = '/assets/imgplaceholder.jpg';
  selectedFile: any;

  cartItems: any = [];

  itemId:any;

  isCollapsedNewItem = true;

  isCollapsedNewClientBulk = true;


  showDivUpdatedLoaderNewItem:boolean = false;

  isLoadingNewItem:boolean = true;


  currentItem: any = {};

  UploadToBackend:string = "Upload To DataBase";

  isLoading: boolean = false;
  isLoadingTable: boolean = false;

  isLoadingEmpty: boolean = false;

  hoveredDate: NgbDate | null = null;

  fromDate: NgbDate | null;
  toDate: NgbDate | null;

  actionButton:string="Action Button"


  title = "Angular Server Post Data Test"

  page: number = 1;

  productList: any[] = [];
  data: any[] = [];

  productList2: any[] = [];
  data2: any[] = [];

  item: any = {};


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

  showDivAddToDataBaseNewItem: boolean = false;

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

  param3Value: string = '';

  currentPage: number = 1;

  itemsPerPage: number = 12; // Adjust as needed 

  myModelValue: string = ""

  itemsPerPageNav: number = 1; // Adjust as needed 

  isCollapsed = true;

  subCategory:string = "subCategory";

  categoryItem:string = "category";
  showDivUpdatedOut: boolean = false;

  unitOfMeasure: string = "unit";
  lastUnitValue:any;

  lastUnitOfMeasure: string = "unit";

  // Category dropdown properties
  isUpdatingParentCategory: boolean = false;
  isUpdatingSubCategory: boolean = false;
  currentParentCategoryId: any;
  currentSubCategoryId: any;
  currentParentCategory: any;
  currentSubCategory: any;
  parentCategoryListForForm: any[] = [];
  subCategoryList: any[] = [];
  parentCategorySearchText: string = '';
  subCategorySearchText: string = '';

  // For category modal
  parentCategoryList: any[] = [];
  parentCategoryId: any;
  parentCategoryLabel: string = '';
  isAddingParentCategory: boolean = false;
  categoryId: any;
  saveButtonNewCategory: string = "Save Category";
  isSavingCategoryModal: boolean = false;
  categoryModalMessage: string = '';
  isCategorySaveSuccess: boolean = false;

  

  isCollapsedDrop = false;

  iconChange: string = "bi bi-chevron-down"

  isText: boolean = true;

  saveButtonStatus: string = "Save Item";


  eyeIcon: string = "bi bi-funnel";

  eyeIconDrop: string = "bi bi-chevron-down"

  selectedColumn: string = 'all'; // Initialize selectedColumn to 'all'

  dataSource: any;

  mdUser: boolean = false;

  fakeUrl:any;

  storedFilter: any;

  displayedColumns: string[] = ["id", "number", "title", "category", "image", "description", "price", "action"]

  @ViewChild('usersForm') form!: NgForm;

  @ViewChild('usersFormNewItem') usersFormNewItem!: NgForm;

  @ViewChild('htmlData') htmlData!: ElementRef;

  @ViewChild('parentCategorySearchInput') parentCategorySearchInput!: ElementRef;
  @ViewChild('subCategorySearchInput') subCategorySearchInput!: ElementRef;
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
      if (userRole === "customer"){
        this.router.navigate(['/products']);

      }
    }
    this.initializeTableData();
    this.loadParentCategories();
  };

  ngAfterViewInit(): void {
    this.modalHost.cleanupStrayLayers();
  }

  ngOnDestroy(): void {
    this.modalHost.teardown();
  }

  get isDrugParentCategorySelected(): boolean {
    return (this.currentParentCategory || '').toString().trim().toLowerCase() === 'drug';
  }

  private resetDrugFields(): void {
    this.currentItem.dosage = null;
    this.currentItem.dosageUnit = '';
    this.currentItem.frequency = null;
    this.currentItem.frequencyUnit = '';
    this.currentItem.duration = null;
    this.currentItem.durationUnit = '';
    this.currentItem.route = '';
  }


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

  this.UploadToBackend = "Loading Please Wait..."
  this.isLoading = true;

  this.api.addBulkItems(this.jsonData).subscribe({
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



//edit item

  onShopItemUnitSellPrice(price: number): void {
    const next = Number(price);
    if (Number.isFinite(next) && next > 0) {
      this.currentItem.sellingPrice = next;
    }
  }

editItem(item: any) {

  this.isCollapsedNewItem = false;

  this.saveButtonStatus = "UpDate Item"
 
  console.log('this is the item item :', item);
  
  console.log('plain id:', item.id);

  this.itemId = item.id;

  // Set other fields first

  // Set other fields first
  this.unitOfMeasure = item.unitOfMeasure;
  this.lastUnitOfMeasure = item.lastUnitOfMeasure;
  this.currentItem.lastUnitValue = item.lastUnitValue;
  this.currentItem = { ...item };

  console.log('the save button status:', this.saveButtonStatus);

  console.log('Editing item:', this.currentItem);

  // Load categories and set values after loading
  this.api.getAllItemCategories().subscribe((res: any) => {
    this.parentCategoryListForForm = res;
    this.parentCategoryList = res;
    this.subCategoryList = res;

    // Find parent category - try by ID first, then by name
    let parentCat = null;
    if (item.categoryId) {
      parentCat = this.parentCategoryListForForm.find((cat: any) => 
        cat.id === item.categoryId && (!cat.parentId || cat.parentId === null || cat.parentId === undefined)
      );
    }
    
    // If not found by ID, try by name (case-insensitive)
    if (!parentCat && item.category) {
      parentCat = this.parentCategoryListForForm.find((cat: any) => {
        const catName = cat.name?.toString().toLowerCase().trim();
        const itemCategory = item.category?.toString().toLowerCase().trim();
        return catName === itemCategory && (!cat.parentId || cat.parentId === null || cat.parentId === undefined);
      });
    }

    if (parentCat) {
      this.currentParentCategoryId = parentCat.id;
      this.currentParentCategory = parentCat.name;
      this.categoryItem = parentCat.name;
      
      // Now find subcategory from the already loaded list
      let subCat = null;
      
      // Try by ID first
      if (item.subCategoryId) {
        subCat = this.subCategoryList.find((cat: any) => 
          cat.id === item.subCategoryId && cat.parentId === this.currentParentCategoryId
        );
      }
      
      // If not found by ID, try by name (case-insensitive)
      if (!subCat && item.subCategory) {
        subCat = this.subCategoryList.find((cat: any) => {
          const catName = cat.name?.toString().toLowerCase().trim();
          const itemSubCategory = item.subCategory?.toString().toLowerCase().trim();
          return catName === itemSubCategory && cat.parentId === this.currentParentCategoryId;
        });
      }
      
      if (subCat) {
        this.currentSubCategoryId = subCat.id;
        this.currentSubCategory = subCat.name;
        this.subCategory = subCat.name;
      } else {
        // Clear subcategory if not found
        this.currentSubCategoryId = null;
        this.currentSubCategory = '';
        this.subCategory = '';
      }
    } else {
      // Clear parent category if not found
      this.currentParentCategoryId = null;
      this.currentParentCategory = '';
      this.categoryItem = '';
      this.currentSubCategoryId = null;
      this.currentSubCategory = '';
      this.subCategory = '';
    }
  });

  setTimeout(() => {
    document.getElementById('legacy-item-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}

itemDetails(item: any): void {
  this.addtoDetails(item);
  this.router.navigate(['/product-details']);
}

toggleCollapseNewItem(){
  this.saveButtonStatus = "Save Item"

  this.subCategory = "subCategory";
  this.categoryItem = "category";
  this.currentParentCategory = '';
  this.currentParentCategoryId = null;
  this.currentSubCategory = '';
  this.currentSubCategoryId = null;
  this.parentCategorySearchText = '';
  this.subCategorySearchText = '';
  this.resetDrugFields();
  
  this.showDivAddToDataBaseNewItem = false;

  // Reset the form if available
  if (this.usersFormNewItem) {
    this.usersFormNewItem.resetForm(); // This will reset all form fields to their default state
  }

}








//delete item
  deleteItem(id: any) {


    this.api.deleteItemById(id).subscribe(
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

  
        // Reload the client list
        this.api.getItems().subscribe((res) => {
          this.productList = res;
          this.data = res;
          this.initializeTableData();
          console.log("item list reloaded");
        });

  
  
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
  

    if (data.datefrom === "" || data.dateto === "" ) {

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
    this.isLoadingEmpty = false;
    this.isLoadingTable = true;
    this.api.getItemsz().subscribe((res) => {
      this.isLoadingTable = false;
      this.productList = res;

      if(!this.productList || this.productList.length === 0) {
        this.isLoadingEmpty = true;

      }

      this.data = res;
      //console.log("this this the response "+ res);
      //console.log("this this the data "+ this.data);
      //.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
      this.currentPage = 1;
      //console.log(this.editModal);
    });
  }

  get filteredProductList3(): any[] {
    if (!this.productList || !this.searchQuery) return this.productList;
    
    const query = this.searchQuery.toLowerCase().trim();
  
    return this.productList.filter((item) => {
      if (!item) return false;
  
      // Combine title, brand, and generic name for the first column search
      const titleBrandGeneric = `${item.title?.toLowerCase() || ''} ${item.brand?.toLowerCase() || ''}`.trim();
      
      // Combine category and sub-category for the second column search
      const categorySubCategory = `${item.category?.toLowerCase() || ''} ${item.subCategory?.toLowerCase() || ''}`.trim();
  
      if (this.selectedColumn === 'all') {
        return (
          titleBrandGeneric.includes(query) ||  // Searches first column (TITLE | BRAND)
          categorySubCategory.includes(query)   // Searches second column (CATEGORY | SUB-CATEGORY)
        );
      } else {
        switch (this.selectedColumn) {
          case 'title': 
            return titleBrandGeneric.includes(query);
          case 'subCategory':
            return item.subCategory?.toLowerCase().includes(query) || false;
          case 'category':
            return item.category?.toLowerCase().includes(query) || false;

          case 'shelfNumber':
            return item.shelfNumber?.toLowerCase().includes(query) || false;
          default:
            return false;
        }
      }
    });
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
  getUserFormDataNewItem(data:any){

    this.showDivUpdatedLoaderNewItem = true;

    console.log(data);

    // Update data with category IDs instead of names
    if (this.currentParentCategoryId) {
      data.categoryId = this.currentParentCategoryId;
      data.category = this.currentParentCategory;
    }
    if (this.currentSubCategoryId) {
      data.subCategoryId = this.currentSubCategoryId;
      data.subCategory = this.currentSubCategory;
    }

    if (!this.isDrugParentCategorySelected) {
      this.resetDrugFields();
      data.dosage = null;
      data.dosageUnit = '';
      data.frequency = null;
      data.frequencyUnit = '';
      data.duration = null;
      data.durationUnit = '';
      data.route = '';
    }

    if(this.saveButtonStatus == "Save Item"){

    this.api.saveItem(data).subscribe(
      (response) => {
        console.log("Data sent to API:", data);

        if (response && response.message) {
          this.responseColor = "rgb(11, 155, 112)"; // Green for success
          console.log("Message:", response.message);
          this.responseMessage = response.message;
          const savedId = Number(response?.data?.id ?? response?.data);
          if (Number.isFinite(savedId) && savedId > 0) {
            this.itemId = savedId;
          }
        } else {
          console.log("Message not found!");
          this.responseColor = "rgb(238, 16, 16)"; // Red for error
          this.responseMessage = "Internal server error";
        }

        this.showDivUpdatedLoaderNewItem = false

        this.showDivAddToDataBaseNewItem = true;

        this.initializeTableData()
        console.log("item added successfully");

        setTimeout(() => {
          this.showDivAddToDataBaseNewItem = false;
          this.saveButtonStatus = "Save Item";
          this.toggleCollapseNewItem();
        }, 3000);
      },
      (error) => {
        console.error("Error saving treatment:", error);

        // Display the error message in the div
        this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
        this.responseColor = "rgb(238, 16, 16)"; // Red for error

        this.showDivUpdatedLoaderNewItem = false


        this.showDivAddToDataBaseNewItem = true;
       

        setTimeout(() => {
          this.showDivAddToDataBaseNewItem = false;
        }, 4000);
      }
    );
  }else{

    if(this.saveButtonStatus == "UpDate Item"){
      this.api.updateItemById(this.itemId, data).subscribe(
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

          this.showDivUpdatedLoaderNewItem = false

  
          this.showDivAddToDataBaseNewItem = true;
  
          this.initializeTableData()
          console.log("item added successfully");
  
          setTimeout(() => {
            this.showDivAddToDataBaseNewItem = false;
            this.saveButtonStatus = "Save Item";
            this.toggleCollapseNewItem();
          }, 3000);
        },
        (error) => {
          console.error("Error saving item:", error);
  
          // Display the error message in the div
          this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
          this.responseColor = "rgb(238, 16, 16)"; // Red for error

          this.showDivUpdatedLoaderNewItem = false

  
          this.showDivAddToDataBaseNewItem = true;
         
  
          setTimeout(() => {
            this.showDivAddToDataBaseNewItem = false;
          }, 4000);
        }
      );
  
    }
  }

}

  


  clearFormShowSaveNewItem(){
    
  }

  openAddNewItemPanel(): void {
    this.isCollapsedNewItem = !this.isCollapsedNewItem;
    if (!this.isCollapsedNewItem) {
      this.clearFormShowSaveNewItem();
      this.saveButtonStatus = 'Save Item';
    }
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
    const currentProduct = this.filteredProductList3.find((p) => p.id === id);
    if (!currentProduct) {
      return;
    }
    this.imgSrc = currentProduct.image;
    console.log(currentProduct);
    this.form.setValue({
      title: currentProduct.title,
      category: currentProduct.category,
      description: currentProduct.description,
      price: currentProduct.sellingPrice,
      image: currentProduct.image,
      reOrderLevel:currentProduct.reOrderLevel
    });

    this.modalHost.showModal('myModal');

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

  // Category dropdown methods
  loadParentCategories() {
    this.api.getAllItemCategories().subscribe((res: any) => {
      this.parentCategoryListForForm = res;
      this.parentCategoryList = res;
      console.log('Parent category list', this.parentCategoryListForForm);
    });
  }

  openParentCategoryDropdown() {
    this.parentCategorySearchText = "";
    this.loadParentCategories();

    setTimeout(() => {
      this.parentCategorySearchInput?.nativeElement?.focus();
    }, 0);
  }

  openSubCategoryDropdown() {
    this.subCategorySearchText = "";
    this.loadSubCategories();

    setTimeout(() => {
      this.subCategorySearchInput?.nativeElement?.focus();
    }, 0);
  }

  loadSubCategories() {
    this.api.getAllItemCategories().subscribe((res: any) => {
      this.subCategoryList = res;
      console.log('Subcategory list', this.subCategoryList);
    });
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
        category.name?.toLowerCase().includes(this.parentCategorySearchText.toLowerCase())
      );
    }

    return filteredList.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }

  filteredSubCategoryList() {
    let filteredList = this.subCategoryList ?? [];

    // If no parent category is selected, return empty array
    if (!this.currentParentCategoryId) {
      return [];
    }

    // Filter to show only categories WITH parentId (child categories) that match the selected parent
    filteredList = filteredList.filter((category) => {
      if (category.parentId == null || category.parentId === undefined) {
        return false;
      }
      // Compare as both string and number to handle type differences
      const categoryParentId = category.parentId;
      const selectedParentId = this.currentParentCategoryId;
      return categoryParentId == selectedParentId || 
             String(categoryParentId) === String(selectedParentId) ||
             Number(categoryParentId) === Number(selectedParentId);
    });

    // Filter based on search text
    if (this.subCategorySearchText) {
      filteredList = filteredList.filter((category) =>
        category.name?.toLowerCase().includes(this.subCategorySearchText.toLowerCase())
      );
    }

    return filteredList.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }

  changeCurrentParentCategoryForForm(parentCategory: any) {
    console.log('Selected parent category:', parentCategory);

    if (parentCategory) {
      this.currentParentCategory = parentCategory.name;
      this.currentParentCategoryId = parentCategory.id || null;
      this.categoryItem = parentCategory.name;
      console.log('Selected parent category name:', this.currentParentCategory);
      console.log('Selected parent category ID:', this.currentParentCategoryId);
      
      // Clear SubCategory selection when parent category changes
      this.currentSubCategory = '';
      this.currentSubCategoryId = null;
      this.subCategory = '';
      this.subCategorySearchText = '';
      this.parentCategorySearchText = '';
      if (this.parentCategorySearchInput?.nativeElement) {
        this.parentCategorySearchInput.nativeElement.value = '';
        this.parentCategorySearchInput.nativeElement.dispatchEvent(new Event('input'));
      }
      if (this.subCategorySearchInput?.nativeElement) {
        this.subCategorySearchInput.nativeElement.value = '';
        this.subCategorySearchInput.nativeElement.dispatchEvent(new Event('input'));
      }
      
      // Reload the subcategory list
      this.loadSubCategories();

      if (!this.isDrugParentCategorySelected) {
        this.resetDrugFields();
      }
    } else {
      console.warn('No parent category selected');
      this.currentParentCategory = 'Select Parent Category';
      this.currentParentCategoryId = null;
      this.categoryItem = '';
      
      // Clear SubCategory selection when parent category is cleared
      this.currentSubCategory = '';
      this.currentSubCategoryId = null;
      this.subCategory = '';
      this.subCategorySearchText = '';
      this.parentCategorySearchText = '';
      if (this.parentCategorySearchInput?.nativeElement) {
        this.parentCategorySearchInput.nativeElement.value = '';
        this.parentCategorySearchInput.nativeElement.dispatchEvent(new Event('input'));
      }
      if (this.subCategorySearchInput?.nativeElement) {
        this.subCategorySearchInput.nativeElement.value = '';
        this.subCategorySearchInput.nativeElement.dispatchEvent(new Event('input'));
      }

      this.resetDrugFields();
    }
  }

  changeCurrentSubCategory(subCategory: any) {
    console.log('Selected subcategory:', subCategory);

    if (subCategory) {
      this.currentSubCategory = subCategory.name;
      this.currentSubCategoryId = subCategory.id || null;
      this.subCategory = subCategory.name;
      console.log('Selected subcategory name:', this.currentSubCategory);
      console.log('Selected subcategory ID:', this.currentSubCategoryId);
      this.subCategorySearchText = '';
      if (this.subCategorySearchInput?.nativeElement) {
        this.subCategorySearchInput.nativeElement.value = '';
        this.subCategorySearchInput.nativeElement.dispatchEvent(new Event('input'));
      }
    } else {
      console.warn('No subcategory selected');
      this.currentSubCategory = 'Select SubCategory';
      this.subCategory = '';
    }
  }

  // Category modal methods
  openAddParentCategoryModal() {
    this.isAddingParentCategory = true;
    this.parentCategoryId = null;
    this.parentCategoryLabel = '';
    this.parentCategorySearchText = '';
    this.categoryId = null;
    this.saveButtonNewCategory = "Save Category";
    this.categoryModalMessage = '';
    this.isCategorySaveSuccess = false;
    this.loadParentCategories();
    this.modalHost.showModal('addCategoryModal');
  }

  openAddSubCategoryModal() {
    if (!this.currentParentCategoryId) {
      alert('Please select a parent category first');
      return;
    }
    this.isAddingParentCategory = false;
    this.parentCategoryId = this.currentParentCategoryId;
    this.parentCategoryLabel = this.currentParentCategory;
    this.parentCategorySearchText = '';
    this.categoryId = null;
    this.saveButtonNewCategory = "Save Category";
    this.categoryModalMessage = '';
    this.isCategorySaveSuccess = false;
    this.loadParentCategories();
    this.modalHost.showModal('addCategoryModal');
  }

  closeAddCategoryModal() {
    this.modalHost.hideModal('addCategoryModal');
    this.isAddingParentCategory = false;
    this.parentCategoryId = null;
    this.parentCategoryLabel = '';
    this.parentCategorySearchText = '';
    this.categoryId = null;
    this.categoryModalMessage = '';
    this.isCategorySaveSuccess = false;
    if (this.addCategoryForm) {
      this.addCategoryForm.resetForm();
    }
  }

  filteredParentCategoryList() {
    let filteredList = this.parentCategoryList ?? [];

    // Filter to show only categories WITHOUT parentId (parent categories)
    filteredList = filteredList.filter((category) =>
      category.parentId == null || category.parentId === undefined
    );

    // Filter based on search text
    if (this.parentCategorySearchText) {
      filteredList = filteredList.filter((category) =>
        category.name?.toLowerCase().includes(this.parentCategorySearchText.toLowerCase())
      );
    }

    return filteredList.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }

  changeCurrentParentCategory(category: any) {
    if (category) {
      this.parentCategoryId = category.id;
      this.parentCategoryLabel = category.name;
    }
  }

  submitAddCategoryFromModal(form: NgForm) {
    if (form.invalid) {
      return;
    }

    this.isSavingCategoryModal = true;
    this.categoryModalMessage = '';

    const formData = form.value;
    const categoryData: any = {
      name: formData.name,
      description: formData.description || ''
    };

    if (!this.isAddingParentCategory && this.parentCategoryId) {
      categoryData.parentId = this.parentCategoryId;
    }

    if (this.categoryId && this.saveButtonNewCategory === "UpDate Category") {
      // Update existing category
      this.api.updateItemCategory(this.categoryId, categoryData).subscribe(
        (response: any) => {
          this.isSavingCategoryModal = false;
          if (response && response.message) {
            this.isCategorySaveSuccess = true;
            this.categoryModalMessage = response.message;
            this.loadParentCategories();
            this.loadSubCategories();
            setTimeout(() => {
              this.closeAddCategoryModal();
            }, 1500);
          } else {
            this.isCategorySaveSuccess = false;
            this.categoryModalMessage = "Failed to update category";
          }
        },
        (error: any) => {
          this.isSavingCategoryModal = false;
          this.isCategorySaveSuccess = false;
          this.categoryModalMessage = error.error?.message || "Failed to update category";
        }
      );
    } else {
      // Create new category
      this.api.addItemCategory(categoryData).subscribe(
        (response: any) => {
          this.isSavingCategoryModal = false;
          if (response && response.message) {
            this.isCategorySaveSuccess = true;
            this.categoryModalMessage = response.message;
            this.loadParentCategories();
            this.loadSubCategories();
            setTimeout(() => {
              this.closeAddCategoryModal();
            }, 1500);
          } else {
            this.isCategorySaveSuccess = false;
            this.categoryModalMessage = "Failed to create category";
          }
        },
        (error: any) => {
          this.isSavingCategoryModal = false;
          this.isCategorySaveSuccess = false;
          this.categoryModalMessage = error.error?.message || "Failed to create category";
        }
      );
    }
  }

  editCategoryFromDropdown(category: any, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    
    // Close the dropdown
    $('.dropdown-menu').removeClass('show');
    
    // Open the modal in edit mode
    this.isAddingParentCategory = !category.parentId; // Check if it's a parent category
    this.categoryId = category.id;
    this.saveButtonNewCategory = "UpDate Category";
    
    // Pre-fill the form with category data
    if (category.parentId) {
      this.parentCategoryId = category.parentId;
      // Find parent category name
      const parentCat = this.parentCategoryList.find(cat => cat.id === category.parentId);
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
    this.modalHost.showModal('addCategoryModal');
    
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
          descInput.value = category.description || '';
          // Trigger input event to update ngModel
          descInput.dispatchEvent(new Event('input'));
        }
      }
    }, 200);
  }

  deleteCategoryFromDropdown(category: any, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }
    
    // Close the dropdown
    $('.dropdown-menu').removeClass('show');
    
    this.api.deleteItemCategory(category.id).subscribe(
      (response: any) => {
        if (response && response.message) {
          alert(response.message);
          this.loadParentCategories();
          this.loadSubCategories();
          // Clear selections if deleted category was selected
          if (this.currentParentCategoryId === category.id) {
            this.currentParentCategory = '';
            this.currentParentCategoryId = null;
            this.categoryItem = '';
          }
          if (this.currentSubCategoryId === category.id) {
            this.currentSubCategory = '';
            this.currentSubCategoryId = null;
            this.subCategory = '';
          }
        }
      },
      (error: any) => {
        alert(error.error?.message || "Failed to delete category");
      }
    );
  }
}
