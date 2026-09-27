import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { defaultContactValue } from '../../../../utils/phone-contact.util';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-manufacturers',
  templateUrl: './manufacturers.component.html',
  styleUrls: ['./manufacturers.component.css']
})
export class ManufacturersComponent implements OnInit {

  // Table data properties
  manufacturerList: any[] = [];
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
  currentManufacturer: any = {};
  saveButtonStatus: string = "Add New Manufacturer";
  isButtonDisabled: boolean = false;
  showDivAddToDataBaseNewManufacturer: boolean = false;
  showDivUpdatedLoaderNewManufacturer: boolean = false;
  isCollapsedNewManufacturer: boolean = true;
  
  // Editing properties
  isEditingManufacturer: boolean = false;
  editingManufacturerId: number | null = null;
  
  // Delete confirmation modal properties
  showDeleteConfirmModal: boolean = false;
  manufacturerToDelete: any = null;
  
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
    this.api.getAllManufacturersBusinessItem().subscribe({
      next: (res) => {
        this.isLoadingService = false;
        console.log("Raw manufacturers response:", res);
        console.log("Response type:", typeof res);
        console.log("Is array:", Array.isArray(res));
        
        // Ensure we have an array
        if (Array.isArray(res)) {
          this.manufacturerList = res;
          this.data = res;
        } else if (res && Array.isArray(res.data)) {
          this.manufacturerList = res.data;
          this.data = res.data;
        } else {
          console.warn("Unexpected manufacturers response structure:", res);
          this.manufacturerList = [];
          this.data = [];
        }
        
        console.log("Manufacturers loaded: ", this.manufacturerList);
        console.log("Total manufacturers:", this.manufacturerList.length);
        
        // Log first manufacturer structure to see DTO field names
        if (this.manufacturerList.length > 0) {
          const firstManufacturer = this.manufacturerList[0];
          console.log("First manufacturer sample: ", firstManufacturer);
          console.log("Manufacturer fields available: ", Object.keys(firstManufacturer));
          console.log("All manufacturer fields:", JSON.stringify(firstManufacturer, null, 2));
          
          // Log each field value to understand DTO structure
          Object.keys(firstManufacturer).forEach(key => {
            console.log(`Manufacturer.${key}:`, firstManufacturer[key]);
          });
        } else {
          console.log("No manufacturers found in response");
        }
        
        this.page = 1;
      },
      error: (err) => {
        this.isLoadingService = false;
        console.error("Error loading manufacturers:", err);
        console.error("Error details:", {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          error: err.error
        });
        this.manufacturerList = [];
        this.data = [];
      }
    });
  }

  // Helper method to get manufacturer field value (handles DTO field name variations)
  getManufacturerField(manufacturer: any, fieldName: string): any {
    // Try exact field name first
    if (manufacturer[fieldName] !== undefined && manufacturer[fieldName] !== null) {
      return manufacturer[fieldName];
    }
    
    // Try camelCase variations (e.g., manufacturerName, emailAddress)
    const camelCaseVariations = [
      `manufacturer${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`,
      `manufacturer${fieldName}`,
      fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
    ];
    
    for (const variation of camelCaseVariations) {
      if (manufacturer[variation] !== undefined && manufacturer[variation] !== null) {
        return manufacturer[variation];
      }
    }
    
    // Try lowercase
    if (manufacturer[fieldName.toLowerCase()] !== undefined && manufacturer[fieldName.toLowerCase()] !== null) {
      return manufacturer[fieldName.toLowerCase()];
    }
    
    return null;
  }

  get filteredManufacturerList() {
    if (!this.searchQuery.trim()) {
      return this.manufacturerList;
    }

    const query = this.searchQuery.toLowerCase().trim();
    
    if (this.selectedColumn === 'all') {
      return this.manufacturerList.filter(manufacturer => {
        const name = this.getManufacturerField(manufacturer, 'name') || '';
        const address = this.getManufacturerField(manufacturer, 'address') || '';
        const countryOfOrigin = this.getManufacturerField(manufacturer, 'countryOfOrigin') || '';
        const phone = this.getManufacturerField(manufacturer, 'phone') || '';
        const email = this.getManufacturerField(manufacturer, 'email') || '';
        const contactPerson = this.getManufacturerField(manufacturer, 'contactPerson') || '';
        const description = this.getManufacturerField(manufacturer, 'description') || '';
        
        return name.toString().toLowerCase().includes(query) ||
               address.toString().toLowerCase().includes(query) ||
               countryOfOrigin.toString().toLowerCase().includes(query) ||
               phone.toString().toLowerCase().includes(query) ||
               email.toString().toLowerCase().includes(query) ||
               contactPerson.toString().toLowerCase().includes(query) ||
               description.toString().toLowerCase().includes(query);
      });
    } else {
      return this.manufacturerList.filter(manufacturer => {
        const value = this.getManufacturerField(manufacturer, this.selectedColumn);
        return value && value.toString().toLowerCase().includes(query);
      });
    }
  }

  // Export methods
  exportToExcel() {
    const dataToExport = this.filteredManufacturerList.map((manufacturer, index) => ({
      'SN': index + 1,
      'Manufacturer Name': this.getManufacturerField(manufacturer, 'name') || manufacturer.manufacturerName || manufacturer.name || 'N/A',
      'Address': this.getManufacturerField(manufacturer, 'address') || manufacturer.address || manufacturer.physicalAddress || 'N/A',
      'Country of Origin': this.getManufacturerField(manufacturer, 'countryOfOrigin') || manufacturer.countryOfOrigin || 'N/A',
      'Phone': this.getManufacturerField(manufacturer, 'phone') || manufacturer.phone || manufacturer.contact || 'N/A',
      'Email': this.getManufacturerField(manufacturer, 'email') || manufacturer.email || manufacturer.emailAddress || 'N/A',
      'Website': this.getManufacturerField(manufacturer, 'website') || manufacturer.website || manufacturer.webSiteAddress || 'N/A',
      'Contact Person': this.getManufacturerField(manufacturer, 'contactPerson') || manufacturer.contactPerson || 'N/A',
      'Description': this.getManufacturerField(manufacturer, 'description') || manufacturer.description || 'N/A',
      'Creation Date': manufacturer.creationDate || manufacturer.createdAt || manufacturer.createdDate || 'N/A'
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Manufacturers');
    XLSX.writeFile(wb, 'manufacturers.xlsx');
  }

  downloadPdf() {
    const data = this.htmlData.nativeElement;
    html2canvas(data).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 208;
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
      pdf.save('manufacturers.pdf');
    });
  }

  // Manufacturer modal methods
  openManufacturerModal() {
    this.clearFormNewManufacturer();
    this.isCollapsedNewManufacturer = false;
    document.body.style.overflow = 'hidden';
  }

  clearFormNewManufacturer() {
    this.currentManufacturer = {
      name: '',
      address: '',
      countryOfOrigin: '',
      phone: defaultContactValue(),
      email: '',
      website: '',
      contactPerson: '',
      description: ''
    };
    this.saveButtonStatus = "Add New Manufacturer";
    this.showDivAddToDataBaseNewManufacturer = false;
    this.showDivUpdatedLoaderNewManufacturer = false;
    this.isButtonDisabled = false;
    this.isEditingManufacturer = false;
    this.editingManufacturerId = null;
  }

  closeManufacturerModal() {
    this.isCollapsedNewManufacturer = true;
    document.body.style.overflow = '';
    this.clearFormNewManufacturer();
  }

  editManufacturer(manufacturer: any) {
    const manufacturerId = manufacturer.id || manufacturer.manufacturerId;
    if (!manufacturer || !manufacturerId) {
      console.error('Invalid manufacturer data for editing', manufacturer);
      return;
    }

    this.isEditingManufacturer = true;
    this.editingManufacturerId = manufacturerId;
    this.currentManufacturer = {
      name: this.getManufacturerField(manufacturer, 'name') || manufacturer.manufacturerName || manufacturer.name || '',
      address: this.getManufacturerField(manufacturer, 'address') || manufacturer.address || manufacturer.physicalAddress || '',
      countryOfOrigin: this.getManufacturerField(manufacturer, 'countryOfOrigin') || manufacturer.countryOfOrigin || '',
      phone: this.getManufacturerField(manufacturer, 'phone') || manufacturer.phone || manufacturer.contact || '',
      email: this.getManufacturerField(manufacturer, 'email') || manufacturer.email || manufacturer.emailAddress || '',
      website: this.getManufacturerField(manufacturer, 'website') || manufacturer.website || manufacturer.webSiteAddress || '',
      contactPerson: this.getManufacturerField(manufacturer, 'contactPerson') || manufacturer.contactPerson || '',
      description: this.getManufacturerField(manufacturer, 'description') || manufacturer.description || ''
    };
    this.saveButtonStatus = "Update Manufacturer";
    this.showDivAddToDataBaseNewManufacturer = false;
    this.showDivUpdatedLoaderNewManufacturer = false;
    this.isButtonDisabled = false;
    this.isCollapsedNewManufacturer = false;
    document.body.style.overflow = 'hidden';
  }

  deleteManufacturer(manufacturer: any) {
    const manufacturerId = manufacturer.id || manufacturer.manufacturerId;
    if (!manufacturer || !manufacturerId) {
      console.error('Invalid manufacturer data for deletion', manufacturer);
      return;
    }

    this.manufacturerToDelete = manufacturer;
    this.showDeleteConfirmModal = true;
    document.body.style.overflow = 'hidden';
  }

  confirmDelete() {
    if (!this.manufacturerToDelete) {
      this.closeDeleteConfirmModal();
      return;
    }

    const manufacturerId = this.manufacturerToDelete.id || this.manufacturerToDelete.manufacturerId;
    if (!manufacturerId) {
      console.error('Invalid manufacturer ID for deletion', this.manufacturerToDelete);
      this.closeDeleteConfirmModal();
      return;
    }

    this.isButtonDisabled = true;
    this.showDivUpdatedLoaderNewManufacturer = true;
    this.showDivAddToDataBaseNewManufacturer = false;
    this.showDeleteConfirmModal = false;

    this.api.deleteManufacturerBusinessItem(manufacturerId).subscribe({
      next: (res: any) => {
        this.showDivUpdatedLoaderNewManufacturer = false;
        this.isButtonDisabled = false;
        this.responseColor = 'rgb(11, 155, 112)';
        this.responseMessage = res?.message || "Manufacturer deleted successfully!";
        this.showDivAddToDataBaseNewManufacturer = true;

        setTimeout(() => {
          this.initializeTableData();
          this.showDivAddToDataBaseNewManufacturer = false;
          this.closeDeleteConfirmModal();
        }, 1000);
      },
      error: (err) => {
        this.showDivUpdatedLoaderNewManufacturer = false;
        this.isButtonDisabled = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err.error?.message || "Error deleting manufacturer. Please try again.";
        this.showDivAddToDataBaseNewManufacturer = true;
        console.error("Error deleting manufacturer: ", err);
        
        setTimeout(() => {
          this.showDivAddToDataBaseNewManufacturer = false;
        }, 4000);
        this.closeDeleteConfirmModal();
      }
    });
  }

  closeDeleteConfirmModal() {
    this.showDeleteConfirmModal = false;
    this.manufacturerToDelete = null;
    this.isButtonDisabled = false;
    document.body.style.overflow = '';
  }

  saveManufacturer(data: any) {
    this.showDivUpdatedLoaderNewManufacturer = true;
    this.isButtonDisabled = true;
    this.showDivAddToDataBaseNewManufacturer = false;

    const manufacturerData = {
      name: data.name || '',
      address: data.address || '',
      countryOfOrigin: data.countryOfOrigin || '',
      phone: data.phone || '',
      email: data.email || '',
      website: data.website || '',
      contactPerson: data.contactPerson || '',
      description: data.description || ''
    };

    console.log("Manufacturer data to save:", manufacturerData);

    if (this.isEditingManufacturer && this.editingManufacturerId) {
      // Update existing manufacturer
      this.api.updateManufacturerBusinessItem(this.editingManufacturerId, manufacturerData).subscribe({
        next: (response) => {
          console.log("Manufacturer updated successfully:", response);

          this.showDivUpdatedLoaderNewManufacturer = false;
          
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)";
            this.responseMessage = response.message;
          } else {
            this.responseColor = "rgb(11, 155, 112)";
            this.responseMessage = "Manufacturer updated successfully!";
          }

          this.showDivAddToDataBaseNewManufacturer = true;
          
          this.initializeTableData();

          setTimeout(() => {
            this.showDivAddToDataBaseNewManufacturer = false;
            this.closeManufacturerModal();
            this.isButtonDisabled = false;
          }, 2500);
        },
        error: (error) => {
          console.error("Error updating manufacturer:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
          console.error("Manufacturer data that was sent:", manufacturerData);
          
          this.showDivUpdatedLoaderNewManufacturer = false;
          let errorMessage = "An unexpected error occurred. Please try again.";
          
          if (error.error) {
            if (error.error.message) {
              errorMessage = error.error.message;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.error) {
              errorMessage = error.error.error;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.responseMessage = errorMessage;
          this.responseColor = "rgb(238, 16, 16)";
          this.showDivAddToDataBaseNewManufacturer = true;
          this.isButtonDisabled = false;

          setTimeout(() => {
            this.showDivAddToDataBaseNewManufacturer = false;
          }, 4000);
        }
      });
    } else {
      // Create new manufacturer
      this.api.addManufacturerBusinessItem(manufacturerData).subscribe({
        next: (response) => {
          console.log("Manufacturer saved successfully:", response);

          this.showDivUpdatedLoaderNewManufacturer = false;
          
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)";
            this.responseMessage = response.message;
          } else {
            this.responseColor = "rgb(11, 155, 112)";
            this.responseMessage = "Manufacturer added successfully!";
          }

          this.showDivAddToDataBaseNewManufacturer = true;
          
          this.initializeTableData();

          setTimeout(() => {
            this.showDivAddToDataBaseNewManufacturer = false;
            this.closeManufacturerModal();
            this.isButtonDisabled = false;
          }, 2500);
        },
        error: (error) => {
          console.error("Error saving manufacturer:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
          console.error("Manufacturer data that was sent:", manufacturerData);
          
          this.showDivUpdatedLoaderNewManufacturer = false;
          let errorMessage = "An unexpected error occurred. Please try again.";
          
          if (error.error) {
            if (error.error.message) {
              errorMessage = error.error.message;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.error) {
              errorMessage = error.error.error;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.responseMessage = errorMessage;
          this.responseColor = "rgb(238, 16, 16)";
          this.showDivAddToDataBaseNewManufacturer = true;
          this.isButtonDisabled = false;

          setTimeout(() => {
            this.showDivAddToDataBaseNewManufacturer = false;
          }, 4000);
        }
      });
    }
  }
}

