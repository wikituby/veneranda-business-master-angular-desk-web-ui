import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { defaultContactValue } from '../../../../utils/phone-contact.util';
import { NgxPaginationModule } from 'ngx-pagination';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { FilterPipeModule } from 'ngx-filter-pipe';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

declare var $: any;

@Component({
  selector: 'app-suppliers',
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.css']
})
export class SuppliersComponent implements OnInit {

  // Table data properties
  supplierList: any[] = [];
  data: any[] = [];
  page: number = 1;
  itemsPerPage: number = 15;
  searchQuery: string = '';
  selectedColumn: string = 'all';
  
  // Loading and response properties
  isLoadingService: boolean = false;
  responseColor = "";
  responseMessage = "";
  showDivUpdatedOut: boolean = false;
  
  // User permissions
  mdUser: boolean = false;
  deleter: boolean = false;
  
  // UI state properties
  isCollapsed = true;
  iconChange: string = "bi bi-chevron-down";
  eyeIcon: string = "bi bi-funnel";
  eyeIconDrop: string = "bi bi-chevron-down";
  isText: boolean = true;
  isDarkMode: boolean = false;
  
  // Form properties
  currentSupplier: any = {};
  saveButtonStatus: string = "Add New Supplier";
  isButtonDisabled: boolean = false;
  showDivAddToDataBaseNewSupplier: boolean = false;
  showDivUpdatedLoaderNewSupplier: boolean = false;
  isCollapsedNewSupplier: boolean = true;
  
  // ViewChild references
  @ViewChild('htmlData') htmlData!: ElementRef;

  constructor(
    private router: Router,
    private api: ApiService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    const userRole = sessionStorage.getItem('userrole');
    const username = sessionStorage.getItem('username');

    // Subscribe to theme changes for real-time updates
    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    if (userRole === "md") {
      this.mdUser = true;
    }

    if (username === null) {
      this.router.navigate(['/login']);
    } else {
      if (userRole === "CUSTOMER") {
        this.router.navigate(['/products']);
      }
    }
    
    this.initializeTableData();
  }

  initializeTableData() {
    this.isLoadingService = true;
    this.api.getAllSuppliersBusinessItem().subscribe({
      next: (res) => {
        this.isLoadingService = false;
        console.log("Raw suppliers response:", res);
        
        // Ensure we have an array
        if (Array.isArray(res)) {
          this.supplierList = res;
          this.data = res;
        } else if (res && Array.isArray(res.data)) {
          this.supplierList = res.data;
          this.data = res.data;
        } else {
          console.warn("Unexpected response format:", res);
          this.supplierList = [];
          this.data = [];
        }
        
        console.log("Suppliers loaded: ", this.supplierList);
        console.log("Total suppliers:", this.supplierList.length);
        
        if (this.supplierList.length > 0) {
          const firstSupplier = this.supplierList[0];
          console.log("First supplier sample: ", firstSupplier);
          console.log("Supplier fields available: ", Object.keys(firstSupplier));
          console.log("All supplier fields:", JSON.stringify(firstSupplier, null, 2));
          
          // Log each field value
          Object.keys(firstSupplier).forEach(key => {
            console.log(`${key}:`, firstSupplier[key]);
          });
        } else {
          console.log("No suppliers found in response");
        }
        this.page = 1;
      },
      error: (err) => {
        this.isLoadingService = false;
        this.supplierList = [];
        this.data = [];
        console.error("Error loading suppliers: ", err);
        console.error("Error details:", {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error,
          url: err.url
        });
        this.responseColor = "#dc2626";
        const errorMsg = err.error?.message || err.message || "Error loading suppliers. Please try again.";
        this.responseMessage = `Error: ${errorMsg}`;
        this.showDivUpdatedOut = true;
        setTimeout(() => {
          this.showDivUpdatedOut = false;
        }, 5000);
      }
    });
  }

  get filteredSupplierList(): any[] {
    if (!this.supplierList || !this.searchQuery) return this.supplierList;
    const query = this.searchQuery.toLowerCase().trim();
    return this.supplierList.filter((item) => {
      if (!item) return false;
      if (this.selectedColumn === 'all') {
        return (
          (item.supplierName?.toLowerCase() || '').includes(query) ||
          (item.emailAddress?.toLowerCase() || '').includes(query) ||
          (item.contact?.toLowerCase() || '').includes(query) ||
          (item.physicalAddress?.toLowerCase() || '').includes(query) ||
          (item.webSiteAddress?.toLowerCase() || '').includes(query) ||
          (item.abbreviation?.toLowerCase() || '').includes(query) ||
          (item.description?.toLowerCase() || '').includes(query)
        );
      } else {
        switch (this.selectedColumn) {
          case 'supplierName':
            return (item.supplierName?.toLowerCase() || '').includes(query);
          case 'emailAddress':
            return (item.emailAddress?.toLowerCase() || '').includes(query);
          case 'contact':
            return (item.contact?.toLowerCase() || '').includes(query);
          case 'abbreviation':
            return (item.abbreviation?.toLowerCase() || '').includes(query);
          default:
            return false;
        }
      }
    });
  }

  // Export functionality
  exportToExcel(): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredSupplierList);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'suppliers.xlsx');
  }

  downloadPdf() {
    const element = this.htmlData.nativeElement;
    html2canvas(element).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
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
      pdf.save('suppliers.pdf');
    });
  }

  // UI toggle methods
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
    setTimeout(() => {
      this.isCollapsed = false;
    }, 0.0);
  }

  // Supplier modal methods
  openSupplierModal() {
    this.clearFormNewSupplier();
    this.isCollapsedNewSupplier = false;
    document.body.style.overflow = 'hidden';
  }

  clearFormNewSupplier() {
    this.currentSupplier = {
      supplierName: '',
      emailAddress: '',
      contact: defaultContactValue(),
      physicalAddress: '',
      webSiteAddress: '',
      abbreviation: '',
      description: ''
    };
    this.saveButtonStatus = "Add New Supplier";
    this.showDivAddToDataBaseNewSupplier = false;
    this.showDivUpdatedLoaderNewSupplier = false;
    this.isButtonDisabled = false;
  }

  closeSupplierModal() {
    this.isCollapsedNewSupplier = true;
    document.body.style.overflow = '';
    this.clearFormNewSupplier();
  }

  reopenSupplierModal() {
    this.initializeTableData();
    this.clearFormNewSupplier();
  }

  saveSupplier(data: any) {
    this.showDivUpdatedLoaderNewSupplier = true;
    this.isButtonDisabled = true;
    this.showDivAddToDataBaseNewSupplier = false;

    console.log("Supplier data to save:", data);

    if (this.saveButtonStatus === "Add New Supplier") {
      this.api.saveSupplierBusinessItem(data).subscribe({
        next: (response) => {
          console.log("Supplier saved successfully:", response);

          // Hide loading spinner
          this.showDivUpdatedLoaderNewSupplier = false;
          
          // Show success notification
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            this.responseMessage = response.message;
          } else {
            this.responseColor = "rgb(11, 155, 112)"; // Green for success
            this.responseMessage = "Supplier added successfully!";
          }

          this.showDivAddToDataBaseNewSupplier = true;
          
          // Reload supplier list from the correct endpoint
          this.initializeTableData();

          // Close modal and reset form after showing success message
          setTimeout(() => {
            this.showDivAddToDataBaseNewSupplier = false;
            this.saveButtonStatus = "Add New Supplier";
            this.closeSupplierModal();
            this.isButtonDisabled = false;
          }, 2500);
        },
        error: (error) => {
          console.error("Error saving supplier:", error);
          
          // Hide loading spinner
          this.showDivUpdatedLoaderNewSupplier = false;
          
          // Show error notification
          this.responseMessage = error.error?.message || "An unexpected error occurred. Please try again.";
          this.responseColor = "rgb(238, 16, 16)"; // Red for error
          this.showDivAddToDataBaseNewSupplier = true;
          this.isButtonDisabled = false;

          setTimeout(() => {
            this.showDivAddToDataBaseNewSupplier = false;
          }, 4000);
        }
      });
    } else {
      // Update supplier logic (for future implementation)
      console.log("Update supplier functionality to be implemented");
      this.showDivUpdatedLoaderNewSupplier = false;
      this.isButtonDisabled = false;
    }
  }

  onPageChange(pageNumber: number) {
    this.page = pageNumber;
  }

  onSearchQueryChange(value: string) {
    this.searchQuery = value;
  }

  onSelectedColumnChange(value: string) {
    this.selectedColumn = value;
  }

  onItemsPerPageChange(value: number) {
    this.itemsPerPage = value;
    this.page = 1;
  }
}

