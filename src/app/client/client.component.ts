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

import { HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';


import { NgbCalendar, NgbCollapseModule, NgbDate, NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from '../services/authentication.service';
import { AccessControlService } from '../services/access-control.service';
import { defaultContactValue } from '../utils/phone-contact.util';
import { BLOOD_GROUP_OPTIONS } from '../utils/blood-group.util';

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

import { Storage, getDownloadURL, ref, uploadBytesResumable } from '@angular/fire/storage';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileresourceService } from '../fileservice/fileresource.service';

declare var $: any;

@Component({
  selector: 'app-client',
  templateUrl: './client.component.html',
  styleUrls: ['./client.component.css']
})
export class ClientComponent implements OnInit {

  jsonData: any[] = [];

  private readonly storage: Storage = inject(Storage);
  serverDirectoryName:string='';
  image:string=''
  imgSrc: any = '/assets/imgplaceholder.jpg';
  selectedFile: any;

  cartItems: any = [];

  showDivNull: boolean = false;

  hoveredDate: NgbDate | null = null;

  fromDate: NgbDate | null;

  showDivAddToDataBaseNewItemOut:boolean = false;
  toDate: NgbDate | null;

  actionButton:string="Action Button"


  title = "Angular Server Post Data Test"

  page: number = 1;

  pageItemUsed: number = 1;


  clientGroupList: any[] = []; // Initialize to hold client groups


  productList: any[] = [];
  data: any[] = [];

  productList2: any[] = [];
  data2: any[] = [];

  clientGroup: any;
  totalAmountDue:any;


  isCollapsedItemsUsedShow = true;

  isCollapsedItemsUsed = true;


  filteredUsers: any[] = [];
  procedureItemUsedList: any[] = [];

  category: any;
  saveButtonStatus = "save"

  saveButtonStatusGroup = "Save Group"

  showDivAddToDataBaseNewItemseparate: boolean = false;
  showDivUpdatedLoaderNewService: boolean = false
  isLoadingNewService: boolean = true;


  

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
  showDivAddToDataBaseDelete: boolean = false;


  responseColor = "";

  responseMessage = "";

  showDivUpdated: boolean = false;


  showDivUpdatedLoaderNewClient: boolean = false;

  showDivUpdatedLoaderDeleteClient: boolean = false;

  isLoadingNewClient: boolean = true;


  showDivUpdatedOut: boolean = false;

  closeModalAdd: boolean = false;

  closeModalUpdate: boolean = false;

  testmethod: boolean = false;

  isButtonDisabled: boolean = false;

  searchTerm: any = '';

  UploadToBackend:string = "Upload To DataBase";

  jwt: any;
  modelTitle:string="Model Title"

  searchQuery: string = '';

  param1Value: string = '';

  param2Value: string = '';

  param3Value: string = '';

  currentPage: number = 1;

  itemsPerPage: number = 12; // Adjust as needed 

  itemsPerPageItemUsed: number = 9; // Adjust as needed 

  myModelValue: string = ""

  itemsPerPageNav: number = 1; // Adjust as needed 

  isCollapsed = true;

  initialClientVisit: any = {};

  isCollapsedNewClient = true;
  isCollapsedNewClientBulk = true;

  isCollapsedDrop = false;

  iconChange: string = "bi bi-chevron-down"

  isText: boolean = true;

  eyeIcon: string = "bi bi-funnel";

  eyeIconDrop: string = "bi bi-chevron-down"

  selectedColumn: string = 'all'; // Initialize selectedColumn to 'all'

  dataSource: any;
  searchText: string = '';

  clientId: any;

  userRole:any;

  isLoadingClient: boolean = false;


  isLoading: boolean = false;

  currentClientGroup: string = "Group Name";

  currentClientGroupId = null;
  
  mdUser: boolean = false;


  fakeUrl:any;

  storedFilter: any;

  currentClient: any = {
    clientContact: defaultContactValue(),
    nextOfKinContact: defaultContactValue(),
    bloodGroup: '',
  };

  readonly bloodGroupOptions = BLOOD_GROUP_OPTIONS;

  currentGroup: any = {
    groupContact: defaultContactValue(),
  };

  clientGender: string = "gender";

  relationship: string = "relationship"

  


  displayedColumns: string[] = ["clientFirstName", "clientSecondName", "clientContact", "clientAddress", "clientGender", "clientAge", "clientDateOfBirth", "nextOfKinName", "nextOfKinContact", "relationship","nextOfKinAddress","clientGroupId"]

  @ViewChild('usersForm') form!: NgForm;

  @ViewChild('usersFormNewGroup') usersFormNewGroup!: NgForm;

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
    private accessControl: AccessControlService
    ) {
    this.fromDate = calendar.getToday();
    this.toDate = calendar.getNext(calendar.getToday(), 'd', 10);
  }

  ngOnInit(): void {
    const userRole = sessionStorage.getItem('userrole');

    const username = sessionStorage.getItem('username');

    this.userRole = userRole;


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

    this.api.getTotalClientBalanceDue(this.clientId).subscribe((res) => {

      console.log('clientId for totalDebt:',this.clientId);
  
      
      this.totalAmountDue = res.TotalAmountDue;
  
  
      console.log('total costs:',res.TotalAmountDue);
      console.log('total costs front:',this.totalAmountDue);
  
    });


    this.initializeTableData();
    this.loadClientGroups();
  };


// bulk



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
    clientFirstName: row['clientFirstName'],
    clientSecondName: row['clientSecondName'],
    //unitOfMeasure: row['unitOfMeasure'],
    
    // Number conversion with fallback to 0
    //costPrice: Number(row['costPrice']) || 0,
    //sellingPrice: Number(row['sellingPrice']) || 0,
    //stockAtHand: Number(row['stockAtHand']) || 0,
    
    // OR if you're using decimal.js for high-precision
    //costPrice: new Decimal(row['costPrice'] || 0),
    //sellingPrice: new Decimal(row['sellingPrice'] || 0),
    // stockAtHand: new Decimal(row['stockAtHand'] || 0),
  }));
}



//delete item
deleteItemUsed(id: any) {

  this.showDivUpdatedLoaderNewClient = true;


  this.api.deleteGroupById(id).subscribe(
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

      this.showDivUpdatedLoaderNewClient = false;


      this.showDivAddToDataBaseNewItemOut = true;
      setTimeout(() => {
        this.showDivAddToDataBaseNewItemOut = false;
        this.clearFormShowNewClientGroup();

      }, 3000); 



    },
    (error) => {
      console.error("Error deleting item", error);

      this.responseColor = "rgb(238, 16, 16)";
      this.responseMessage = error.error.message;


      this.showDivUpdatedLoaderNewClient = false;


      this.showDivAddToDataBaseNewItemOut = true;
      setTimeout(() => {
        this.showDivAddToDataBaseNewItemOut = false;
      }, 3000); 

    }
  );
}

uploadToBackend() {

  this.UploadToBackend = "Loading Please Wait..."
  this.isLoading = true;

  this.api.addBulkClients(this.jsonData).subscribe({
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
      this.reopen();

      setTimeout(() => {
        this.showDivUpdatedOut = false;
        this.isCollapsedNewClientBulk = !this.isCollapsedNewClientBulk;
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


debtedClients(){
      this.showDivUpdatedLoaderDeleteClient = true;

      this.api.getClientsWithDebt().subscribe((res) => {
      this.isLoadingClient = false;
      this.productList = res;
      this.showDivUpdatedLoaderDeleteClient = false;

      this.data = res;
      //console.log("this this the response "+ res);
      //console.log("this this the data "+ this.data);
      //.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
      this.currentPage = 1;
      //console.log(this.editModal);
    });
}


groupedClients(){
      this.showDivUpdatedLoaderDeleteClient = true;

      this.api.getClientsInGroup(this.currentClientGroupId).subscribe((res) => {
      this.isLoadingClient = false;
      this.productList = res;
      this.showDivUpdatedLoaderDeleteClient = false;

      this.data = res;
      //console.log("this this the response "+ res);
      //console.log("this this the data "+ this.data);
      //.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
      this.currentPage = 1;
      //console.log(this.editModal);
    });
}









  getAllClientGroupsForShow() {
    this.showDivUpdatedLoaderNewService = true;
    this.api.getAllClientGroups().subscribe((res) => {

      this.showDivUpdatedLoaderNewService = false;
      this.procedureItemUsedList = res;

   
      //this.data = res;
      console.log("this this the response "+ res);
      //console.log("this this the data "+ this.data);
      //.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
      this.currentPage = 1;
      //console.log(this.editModal);
    });
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

    
  }

  initializeTableData() {
    this.isLoadingClient = true;
    this.api.getItems().subscribe((res) => {
      this.isLoadingClient = false;
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
    if (!this.productList || !this.searchQuery?.trim()) return this.productList;
  
    const query = this.searchQuery.toLowerCase().trim();
  
    return this.productList.filter(item => {
      if (!item) return false;
  
      const firstName = item.clientFirstName?.toLowerCase() || '';
      const lastName = item.clientSecondName?.toLowerCase() || '';
      const fullName = `${firstName} ${lastName}`.trim();
  
      switch (this.selectedColumn) {
        case 'clientFirstName':
          return firstName.includes(query);
        case 'clientSecondName':
          return lastName.includes(query);
        case 'clientName':
          return fullName.includes(query);
        case 'all':
          return firstName.includes(query) || lastName.includes(query) || fullName.includes(query);
        default:
          return false;
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



  toggleCollapseNewGroup() {
    this.saveButtonStatus = "Save Client";
    this.currentClientGroup = "Chose Group Name";
    this.clientGender = "gender";
    this.relationship = "Relationship";
    if (this.form) {
      this.form.resetForm();  // Reset the form to clear all fields
    }}

  

  toggleCollapseNewClient() {
    this.saveButtonStatus = "Save Client";
    this.currentClientGroup = "Chose Group Name";
    this.clientGender = "gender";
    this.relationship = "Relationship";
    if (this.form) {
      this.form.resetForm();  // Reset the form to clear all fields
    }

    this.form.setValue({
      clientFirstName: null,
      clientSecondName: null,
      clientContact: defaultContactValue(),
      clientAddress: null,
      clientGender: null,
      clientAge: null,
      clientDateOfBirth: null,
      nextOfKinName: null,
      nextOfKinContact: defaultContactValue(),
      relationship: null,
      nextOfKinAddress: null,
      clientGroupId: null,

    })
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
    this.isLoadingClient = true;
    //this.isButtonDisabled = false;
    this.api.getItems().subscribe((res) => {
      this.isLoadingClient = false;
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

  clearFormShowSaveClient(){


    this.clientGender = "gender";
    this.relationship = "Relationship";

    this.saveButtonStatus = "Save Client"
    this.showDivAddToDataBase = false;
    this.currentClientGroup = "Chose Group Name";

    //this.currentClientGroup = "Chose Group Name";
    if (this.form) {
      this.form.resetForm();  // Reset the form to clear all fields

    }
    console.log("drop nature:", this.isCollapsedNewClient);
    

    this.form.setValue({
      clientFirstName: null,
      clientSecondName: null,
      clientContact: defaultContactValue(),
      clientAddress: null,
      clientGender: "gender",
      clientAge: null,
      clientDateOfBirth: null,
      nextOfKinName: null,
      nextOfKinContact: defaultContactValue(),
      relationship: "Relationship",
      nextOfKinAddress: null,
      clientGroupId: null,

    })


  }



  clearFormShowNewClientGroup(){

    this.getAllClientGroupsForShow();

    this.currentGroup = {
      groupContact: defaultContactValue(),
    };

    //this.currentClientGroup = "Chose Group Name";
    if (this.usersFormNewGroup) {
      this.usersFormNewGroup.resetForm();  // Reset the form to clear all fields

    }
    
  }


  


  clearFields(){
    this.saveButtonStatus = "Save Client"
    this.currentClientGroup = "Chose Group Name";
  }





  getUserFormDataNewGroup(data: any) {

    this.showDivUpdatedLoaderNewClient = true;

     console.log("Original data:", data);
  
    
  
    if (this.saveButtonStatusGroup == "Save Group") {
      this.api.createClientGroup(data).subscribe(
        (response) => {
          console.log("Data sent to API:", data);
          console.log("res all", response);
  
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            this.responseColor = "rgb(238, 16, 16)"; // Red for error
            this.responseMessage = "Internal server error";
          
          }
  
          this.showDivUpdatedLoaderNewClient = false;

          this.showDivAddToDataBaseDelete = true;
  
          setTimeout(() => {
            this.showDivAddToDataBaseDelete = false;
            this.clearFormShowNewClientGroup();
          }, 3000);
  
        },
        (error) => {
          console.error("Error saving group:", error);
  
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

          this.showDivUpdatedLoaderNewClient = false;

  
          this.showDivAddToDataBaseDelete = true;
  
          setTimeout(() => {
            this.showDivAddToDataBaseDelete = false;
          }, 4000);
        }
      );
    } else if (this.saveButtonStatus == "UpDate") {
      console.log("client id", this.clientId);
      console.log("confirm data before sending to api", data);
  
      this.api.updateItem(this.clientId, data).subscribe(
        (response) => {
          console.log("res all", response);
  
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            this.responseColor = "rgb(238, 16, 16)"; // Red for error
            this.responseMessage = "Internal server error";
          }

          this.showDivUpdatedLoaderNewClient = false;

  
          this.showDivAddToDataBase = false;
          this.showDivUpdated = true;
          this.showDivNull = false;
  
          // Reload the client list
          this.api.getItems().subscribe((res) => {
            this.productList = res;
            this.data = res;
            this.initializeTableData();
            console.log("Client list reloaded");
          });
  
          setTimeout(() => {
            this.showDivUpdated = false;
            this.showDivNull = false;
            this.saveButtonStatus = "Save Client";
            this.toggleCollapseNewClient();
            this.isCollapsedNewClient = false;
            this.clientId = "";
          }, 2000);
        },
        (error) => {
          console.error("Error updating client:", error);
  
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

          this.showDivUpdatedLoaderNewClient = false;

  
          this.showDivAddToDataBaseDelete = true;
  
          setTimeout(() => {
            this.showDivAddToDataBaseDelete = false;
          }, 4000);
        }
      );
    }
  }





  getUserFormData(data: any) {

    this.showDivUpdatedLoaderNewClient = true;

 
    console.log("Original id:", data.id);
    console.log("Original data:", data);

    if (
      (data.clientAge === undefined ||
        data.clientAge === null ||
        data.clientAge === '') &&
      this.currentClient?.clientAge != null &&
      this.currentClient.clientAge !== ''
    ) {
      data.clientAge = this.coerceClientAgeForForm(this.currentClient.clientAge);
    }

    const rawGender = data.clientGender;
    if (
      rawGender === undefined ||
      rawGender === null ||
      rawGender === '' ||
      rawGender === 'gender'
    ) {
      if (this.clientGender != null && this.clientGender !== 'gender') {
        data.clientGender = this.clientGender;
      } else if (this.currentClient?.clientGender != null) {
        data.clientGender = this.normalizeGenderForSelect(this.currentClient.clientGender);
      }
    } else {
      data.clientGender = this.normalizeGenderForSelect(rawGender);
    }
  
    // ✅ Convert clientDateOfBirth (Object → String "YYYY-MM-DD") or set to null
    if (data.clientDateOfBirth && typeof data.clientDateOfBirth === 'object') {
      const { year, month, day } = data.clientDateOfBirth;
      data.clientDateOfBirth = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    } else {
      data.clientDateOfBirth = null; // Handle empty date
    }
  
    // ✅ Convert clientAge to BigDecimal or set to null
    if (data.clientAge !== undefined && data.clientAge !== null && data.clientAge !== '') {
      data.clientAge = Number(data.clientAge).toFixed(2); // Convert to BigDecimal format
    } else {
      data.clientAge = null; // Handle empty age
    }
  
    console.log("Formatted Data:", data);
  
    // ✅ Check for missing names and STOP execution if found
    if (!data.clientFirstName || !data.clientSecondName) {
      this.responseMessage = "First name and second name are required.";
      this.responseColor = "rgb(238, 16, 16)"; // Red for error
      this.showDivUpdatedLoaderNewClient = false;

      this.showDivUpdated = true;  // Show error message
      setTimeout(() => {
        this.showDivUpdated = false; // Hide after 2 seconds
      }, 2000);
      return;  // 🚨 Stop execution here, preventing save or update
    }

        // ✅ Check for missing names and STOP execution if found
        if (data.clientFirstName == data.clientSecondName) {
          this.responseMessage = "First name and second name can't be the same.";
          this.responseColor = "rgb(238, 16, 16)"; // Red for error
          this.showDivUpdatedLoaderNewClient = false;

          this.showDivUpdated = true;  // Show error message
          setTimeout(() => {
            this.showDivUpdated = false; // Hide after 2 seconds
          }, 2000);
          return;  // 🚨 Stop execution here, preventing save or update
        }


       
    const groupId =
      this.currentClientGroupId != null && this.currentClientGroupId !== ''
        ? this.currentClientGroupId
        : data.clientGroupId != null && data.clientGroupId !== ''
          ? data.clientGroupId
          : this.currentClient?.clientGroupId ?? null;

    const requestData = {
      ...data,
      clientGroupId: groupId,
      userRole: this.userRole,
    };
 


  
    if (this.saveButtonStatus == "Save Client") {
      this.api.addClient(requestData).subscribe(
        (response) => {
          console.log("Data sent to API:", data);
          console.log("res all", response);


  
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            this.responseColor = "rgb(238, 16, 16)"; // Red for error
            this.responseMessage = "Internal server error";
          
          }
  
          this.showDivUpdatedLoaderNewClient = false;

          this.showDivUpdated = true;
          this.showDivNull = false;
  
          this.reopen();
          this.handleClick();
  
          setTimeout(() => {
            this.showDivAddToDataBase = false;
            this.showDivNull = false;
            this.showDivUpdated = false;
            this.toggleCollapseNewClient();
            this.isCollapsedNewClient = !this.isCollapsedNewClient;
          }, 3000);
  
    
        },
        (error) => {
          console.error("Error saving client:", error);
  
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

          this.showDivUpdatedLoaderNewClient = false;

  
          this.showDivUpdated = true;
          this.showDivNull = false;
  
          setTimeout(() => {
            this.showDivUpdated = false;
             this.isCollapsedNewClient = !this.isCollapsedNewClient;
          }, 8000);
        }
      );
    } else if (this.saveButtonStatus == "UpDate") {
      console.log("client id", this.clientId);
      console.log("confirm data before sending to api", data);
  
      this.api.updateItem(this.clientId, requestData).subscribe(
        (response) => {
          console.log("res all", response);
  
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            this.responseColor = "rgb(238, 16, 16)"; // Red for error
            this.responseMessage = "Internal server error";
          }

          this.showDivUpdatedLoaderNewClient = false;

  
          this.showDivAddToDataBase = false;
          this.showDivUpdated = true;
          this.showDivNull = false;
  
          // Reload the client list
          this.api.getItems().subscribe((res) => {
            this.productList = res;
            this.data = res;
            this.initializeTableData();
            console.log("Client list reloaded");
          });
  
          setTimeout(() => {
            this.showDivUpdated = false;
            this.showDivNull = false;
            this.saveButtonStatus = "Save Client";
            this.toggleCollapseNewClient();
            this.isCollapsedNewClient = false;
            this.clientId = "";
             this.isCollapsedNewClient = !this.isCollapsedNewClient;
          }, 8000);
        },
        (error) => {
          console.error("Error updating client:", error);
  
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

          this.showDivUpdatedLoaderNewClient = false;

  
          this.showDivUpdated = true;
          this.showDivNull = false;
  
          setTimeout(() => {
            this.showDivUpdated = false;
             this.isCollapsedNewClient = !this.isCollapsedNewClient;
          }, 6000);
        }
      );
    }
  }





    deleteClient(id: any) {

      this.showDivUpdatedLoaderDeleteClient = true;
      this.api.deleteClientById(id).subscribe(
        (response) => {
          console.log("response", response);

          if (response && response.message) {
            this.responseColor = "rgb(238, 16, 16)"; // Green for success
            console.log("Message:", response.message);
            this.responseMessage = response.message;
          } else {
            this.responseColor = "rgb(238, 16, 16)"; // Red for error
            this.responseMessage = "Internal server error";
          }
          this.showDivUpdatedLoaderDeleteClient = false;

  
          this.showDivAddToDataBaseDelete = true;

          // Reload the client list
          this.api.getItems().subscribe((res) => {
            this.productList = res;
            this.data = res;
            this.initializeTableData();
            console.log("Client list reloaded");
          });

          setTimeout(() => {
            this.showDivAddToDataBaseDelete = false;
          }, 2000);
    
    
        },
        (error) => {
          console.error("Error deleting client:", error);
  
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

          this.showDivUpdatedLoaderDeleteClient = false;

  
          this.showDivAddToDataBaseDelete = true;

  
          setTimeout(() => {
            this.showDivAddToDataBaseDelete = false;
          }, 3000);
        }
      );
    }

    changeCurrentGroup(clientGroup: any) {
      if (clientGroup && !this.accessControl.canAssignClientToGroup(clientGroup)) {
        alert('You need admin approval to add any client in Veneranda Business group.');
        return;
      }
      if (clientGroup) {
        this.currentClientGroup = clientGroup.groupNameShortForm || 'Unknown Group';
        this.currentClientGroupId = clientGroup.id || null;
        if (this.currentClient) {
          this.currentClient.clientGroupId = this.currentClientGroupId;
        }
        console.log('Selected group name:', this.currentClientGroup);
        console.log('Selected group ID:', this.currentClientGroupId);
      } else {
        console.warn('No client group selected');
        this.currentClientGroup = 'Choose Group Name';
      }
    }

    /**
     * First letter of the client's group (client table name column badge).
     */
    getClientGroupInitial(item: any): string {
      if (!item) {
        return '';
      }
      const label = this.resolveClientGroupDisplayName(item);
      let s = String(label || '').trim();
      if (s.length > 0) {
        return s.charAt(0).toUpperCase();
      }
      const gid = item.clientGroupId ?? item.clientGroup?.id;
      if (gid != null && gid !== '' && Array.isArray(this.clientGroupList)) {
        const g = this.clientGroupList.find((pg: any) => String(pg?.id) === String(gid));
        if (g) {
          s = String(
            this.groupRecordDisplayName(g) || ''
          ).trim();
          if (s.length > 0) {
            return s.charAt(0).toUpperCase();
          }
        }
      }
      return '';
    }

    private resolveClientGroupDisplayName(item: any): string {
      const nested = item.clientGroup ?? item.group;
      return (
        item.groupNameShortForm ||
        nested?.groupNameShortForm ||
        item.groupName ||
        (nested && this.groupRecordDisplayName(nested)) ||
        item.groupNameShortName ||
        item.companyName ||
        ''
      );
    }

    private groupRecordDisplayName(g: any): string {
      if (!g) {
        return '';
      }
      return g.groupNameShortForm || g.groupName || g.groupNameShortName || g.name || '';
    }

    /** Client registration / creation timestamp from API (field names vary by backend). */
    getClientCreatedDisplay(item: any): string {
      if (!item) {
        return 'N/A';
      }
      const raw =
        item.creationDate ??
        item.CreationDate ??
        item.createdAt ??
        item.createdDate ??
        item.dateCreated ??
        item.registrationDate ??
        item.registeredAt ??
        item.clientCreatedAt ??
        item.created_at ??
        item.date_created;
      if (raw == null || raw === '') {
        return 'N/A';
      }
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        return String(raw);
      }
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }

    loadClientGroups(){
      this.api.getClientGroupList().subscribe((res) => {
        this.clientGroupList = res;
        console.log('group list',this.clientGroupList);
        //console.log(clientId);
  
      });  }

    /**
     * Map API / legacy gender strings to select values: male | female | gender (placeholder).
     * Handles "Male"/"MALE", single-letter M/F, etc. (female checked before male — "female" contains "male").
     */
    private normalizeGenderForSelect(raw: any): string {
      if (raw == null || String(raw).trim() === '') {
        return 'gender';
      }
      const s = String(raw).trim().toLowerCase();
      if (s === 'female' || s.includes('female') || s === 'f' || s === 'woman') {
        return 'female';
      }
      if (s === 'male' || s.includes('male') || s === 'm' || s === 'man') {
        return 'male';
      }
      return 'gender';
    }

    /** Coerce API age (string, decimal, Mongo-style) for number input + update payload. */
    private coerceClientAgeForForm(raw: any): number | null {
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
      if (typeof raw === 'object' && raw !== null) {
        if ('$numberDecimal' in raw) {
          return this.coerceClientAgeForForm((raw as any).$numberDecimal);
        }
        if ('value' in raw) {
          return this.coerceClientAgeForForm((raw as any).value);
        }
      }
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }

    loadClientGroupByGroupName(id: any) {
      if (id == null || id === '') {
        this.currentClientGroupId = null;
        this.currentClientGroup = 'Choose Group';
        return;
      }
      this.currentClientGroupId = id;
      this.api.getClientGroupByGroupName(id).subscribe({
        next: (res) => {
          this.clientGroup = res;
          if (res) {
            this.currentClientGroup =
              res.groupNameShortForm || res.groupName || 'Unknown Group';
            if (res.id != null) {
              this.currentClientGroupId = res.id;
            }
            if (this.currentClient) {
              this.currentClient.clientGroupId = this.currentClientGroupId;
            }
            console.log('group now', this.currentClientGroup);
          }
        },
        error: () => {
          this.currentClientGroup = 'Choose Group';
        },
      });
    }
  
      

  editClient(item: any) {

    this.initializeTableData()

    this.isCollapsedNewClient = true;

      this.saveButtonStatus = "UpDate"
   
      console.log('this is the item item :', item);
    
      console.log('plain id:', item.id);
  
      this.clientId = item.id;

      this.clientGender = this.normalizeGenderForSelect(item.clientGender);
      this.currentClient = { ...item };
      this.currentClient.clientGender = this.clientGender;

      if (item.relationship != null) {
      this.relationship = item.relationship;
      }

      const ageVal = this.coerceClientAgeForForm(this.currentClient.clientAge);
      this.currentClient.clientAge = ageVal;

      if (item.clientGroupId != null && item.clientGroupId !== '') {
        this.loadClientGroupByGroupName(item.clientGroupId);
      } else {
        this.currentClientGroupId = null;
        this.currentClientGroup = 'Choose Group';
        this.currentClient.clientGroupId = null;
      }
  
      console.log('the save button status:', this.saveButtonStatus);
  
      // Convert clientDateOfBirth to NgbDateStruct
      if (this.currentClient.clientDateOfBirth != null) {
        const date = new Date(this.currentClient.clientDateOfBirth);
        if (!Number.isNaN(date.getTime())) {
          this.currentClient.clientDateOfBirth = {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
          };
        }
      }
  
  
      console.log('Converted Date of Birth:', this.currentClient.clientDateOfBirth);
  
  
      console.log('Editing client:', this.currentClient);

      this.isCollapsedNewClient = false;



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
    //console.log(currentProduct);
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


  clientDetails(item: any) {
    this.showDivUpdatedLoaderDeleteClient = true;
    this.api.getInitialVisitForClientId(item.id).subscribe({
      next: (res) => {
        this.initialClientVisit = res ?? {};
        console.log('initial client order', this.initialClientVisit);
        console.log(item.id);

        sessionStorage.setItem('item', JSON.stringify(item));
        sessionStorage.setItem('initialClientVisit', JSON.stringify(this.initialClientVisit));
        this.showDivUpdatedLoaderDeleteClient = false;
        this.router.navigate(['/overview/clienttransactions']);
      },
      error: () => {
        sessionStorage.setItem('item', JSON.stringify(item));
        sessionStorage.setItem('initialClientVisit', JSON.stringify({}));
        this.showDivUpdatedLoaderDeleteClient = false;
        this.router.navigate(['/overview/clienttransactions']);
      }
    });
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

