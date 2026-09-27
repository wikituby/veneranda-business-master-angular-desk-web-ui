import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-stock-batch',
  templateUrl: './stock-batch.component.html',
  styleUrls: ['./stock-batch.component.css']
})
export class StockBatchComponent implements OnInit {

  // Table data properties
  stockBatchList: any[] = [];
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
  currentStockBatch: any = {
    expiryDate: null,
    stockAtHand: null,
    unitCostPrice: null,
    unitSellingPrice: null,
    shelfNumber: null,
    profitMarginForRetail: null,
    profitMarginForWholeSale: null,
    profitMarginForSpecialCase: null,
    reOrderTo: null,
    lastUnitValue: null,
    lastUnitOfMeasure: null
  };
  saveButtonStatus: string = "Update Stock Batch";
  isButtonDisabled: boolean = false;
  showDivAddToDataBaseNewStockBatch: boolean = false;
  showDivUpdatedLoaderNewStockBatch: boolean = false;
  isCollapsedNewStockBatch: boolean = true;
  
  // Editing properties
  isEditingStockBatch: boolean = false;
  editingStockBatchId: number | null = null;
  editingStockItemName: string = '';
  editingUnitCostPrice: number | null = null;
  editingUnitSellingPrice: number | null = null;
  selectedUnitSellingModelId: number | null = null;
  
  // Delete confirmation modal properties
  showDeleteConfirmModal: boolean = false;
  stockBatchToDelete: any = null;
  
  // Details modal properties
  showDetailsModal: boolean = false;
  selectedStockBatchDetails: any = null;
  
  // Dropdown lists
  stockItemList: any[] = [];
  storeList: any[] = [];
  
  // Stock Item dropdown properties
  filteredStockItemList: any[] = [];
  selectedStockItem: any = null;
  stockItemSearchQuery: string = '';
  isStockItemDropdownOpen: boolean = false;
  currentStockItemName: string = 'Select stock item';
  currentStockItemId: any = null;
  
  // Store dropdown properties
  filteredStoreList: any[] = [];
  selectedStore: any = null;
  storeSearchQuery: string = '';
  isStoreDropdownOpen: boolean = false;
  currentStoreName: string = 'Select store';
  currentStoreId: any = null;
  
  // Date properties
  expiryDate: any = null;
  manufacturingDate: any = null;
  
  // Last Unit of Measure dropdown properties
  lastUnitOfMeasureList: any[] = [];
  filteredLastUnitOfMeasureList: any[] = [];
  selectedLastUnitOfMeasure: any = null;
  lastUnitOfMeasureSearchQuery: string = '';
  isLastUnitOfMeasureDropdownOpen: boolean = false;
  selectedLastUnitOfMeasureName: string = '';
  
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
    this.loadStockItems();
    this.loadStores();
    this.loadLastUnitOfMeasures();
  }

  initializeTableData(storeId?: number) {
    this.isLoadingService = true;
    this.api.getAllStockBatches(storeId).subscribe({
      next: (res) => {
        this.isLoadingService = false;
        console.log("Raw stock batches response:", res);
        
        // Ensure we have an array
        if (Array.isArray(res)) {
          this.stockBatchList = res;
          this.data = res;
        } else if (res && Array.isArray(res.data)) {
          this.stockBatchList = res.data;
          this.data = res.data;
        } else if (res && res.data && Array.isArray(res.data)) {
          this.stockBatchList = res.data;
          this.data = res.data;
        } else {
          console.warn("Unexpected stock batches response structure:", res);
          this.stockBatchList = [];
          this.data = [];
        }
        
        // Log the loaded data for debugging
        console.log("Stock batches loaded:", this.stockBatchList.length, "records", storeId ? `for storeId: ${storeId}` : "");
      },
      error: (err: any) => {
        this.isLoadingService = false;
        console.error("Error loading stock batches:", err);
        console.error("Error details:", err.error);
        console.error("Error status:", err.status);
        this.stockBatchList = [];
        this.data = [];
        this.responseColor = "#dc2626";
        this.responseMessage = err.error?.message || `Error loading stock batch records. Status: ${err.status}`;
        this.showDivUpdatedOut = true;
        setTimeout(() => {
          this.showDivUpdatedOut = false;
        }, 4000);
      }
    });
  }

  // Load dropdown data
  loadStockItems() {
    this.api.getAllStockItems().subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.stockItemList = res;
        } else if (res && Array.isArray(res.data)) {
          this.stockItemList = res.data;
        }
        console.log("Stock items loaded:", this.stockItemList);
      },
      error: (err: any) => {
        console.error("Error loading stock items:", err);
      }
    });
  }

  loadStores() {
    this.api.getAllStores().subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.storeList = res;
        } else if (res && Array.isArray(res.data)) {
          this.storeList = res.data;
        }
        console.log("Stores loaded:", this.storeList);
      },
      error: (err: any) => {
        console.error("Error loading stores:", err);
      }
    });
  }

  // Store filter properties
  selectedStoreFilter: any = null;
  selectedStoreFilterName: string = 'All Stores';
  isStoreFilterDropdownOpen: boolean = false;
  storeFilterSearchQuery: string = '';
  filteredStoreFilterList: any[] = [];

  /** Parsed qty on hand; null if missing or not a finite number. */
  private numericStockAtHand(batch: any): number | null {
    const raw =
      batch?.stockAtHand ?? batch?.stock_at_hand ?? batch?.quantityOnHand ?? batch?.quantity_on_hand;
    if (raw == null || raw === '') {
      return null;
    }
    const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  /** Table lists only batches with stock on hand strictly above zero. */
  private hasStockAboveZero(batch: any): boolean {
    const n = this.numericStockAtHand(batch);
    return n != null && n > 0;
  }

  // Filter methods
  get filteredStockBatchList() {
    let filtered = this.stockBatchList.filter((b) => this.hasStockAboveZero(b));

    // Note: Store filtering is done on the backend via API call
    // Only apply client-side search query filtering here

    // Apply search query
    if (!this.searchQuery.trim()) {
      return filtered;
    }

    const query = this.searchQuery.toLowerCase().trim();
    
    if (this.selectedColumn === 'all') {
      return filtered.filter(batch => {
        return (batch.batchNumber && batch.batchNumber.toLowerCase().includes(query)) ||
               (batch.stockItemName && batch.stockItemName.toLowerCase().includes(query)) ||
               (batch.storeName && batch.storeName.toLowerCase().includes(query)) ||
               (batch.status && batch.status.toLowerCase().includes(query)) ||
               (batch.stockSupplierName && batch.stockSupplierName.toLowerCase().includes(query));
      });
    } else {
      return filtered.filter(batch => {
        const value = batch[this.selectedColumn];
        return value && value.toString().toLowerCase().includes(query);
      });
    }
  }

  get totalItemsCount() {
    return this.filteredStockBatchList.length;
  }

  // Store filter dropdown methods
  toggleStoreFilterDropdown() {
    this.isStoreFilterDropdownOpen = !this.isStoreFilterDropdownOpen;
    if (this.isStoreFilterDropdownOpen) {
      this.storeFilterSearchQuery = '';
      this.filterStoreFilters();
    }
  }

  filterStoreFilters() {
    if (!this.storeFilterSearchQuery.trim()) {
      this.filteredStoreFilterList = [...this.storeList];
    } else {
      const query = this.storeFilterSearchQuery.toLowerCase();
      this.filteredStoreFilterList = this.storeList.filter(store =>
        (store.name && store.name.toLowerCase().includes(query)) ||
        (store.location && store.location.toLowerCase().includes(query))
      );
    }
  }

  selectStoreFilter(store: any) {
    if (store === null) {
      // "All Stores" option - fetch all batches
      this.selectedStoreFilter = null;
      this.selectedStoreFilterName = 'All Stores';
      this.initializeTableData(); // Reload all batches
    } else {
      // Specific store selected - fetch batches filtered by storeId from backend
      this.selectedStoreFilter = store;
      this.selectedStoreFilterName = store.name || 'Unknown';
      this.initializeTableData(store.id); // Reload batches filtered by storeId
    }
    this.isStoreFilterDropdownOpen = false;
    this.page = 1; // Reset to first page when filter changes
  }

  // Stock Item dropdown methods
  toggleStockItemDropdown() {
    this.isStockItemDropdownOpen = !this.isStockItemDropdownOpen;
    if (this.isStockItemDropdownOpen) {
      this.stockItemSearchQuery = '';
      this.filterStockItems();
    }
  }

  filterStockItems() {
    if (!this.stockItemSearchQuery.trim()) {
      this.filteredStockItemList = [...this.stockItemList];
    } else {
      const query = this.stockItemSearchQuery.toLowerCase();
      this.filteredStockItemList = this.stockItemList.filter(item =>
        (item.stockItemName && item.stockItemName.toLowerCase().includes(query)) ||
        (item.name && item.name.toLowerCase().includes(query))
      );
    }
  }

  selectStockItem(item: any) {
    this.selectedStockItem = item;
    this.currentStockItemName = item.stockItemName || item.name || 'Unknown';
    this.currentStockItemId = item.id;
    this.currentStockBatch.stockItemId = item.id;
    this.isStockItemDropdownOpen = false;
  }

  // Store dropdown methods
  toggleStoreDropdown() {
    this.isStoreDropdownOpen = !this.isStoreDropdownOpen;
    if (this.isStoreDropdownOpen) {
      this.storeSearchQuery = '';
      this.filterStores();
    }
  }

  filterStores() {
    if (!this.storeSearchQuery.trim()) {
      this.filteredStoreList = [...this.storeList];
    } else {
      const query = this.storeSearchQuery.toLowerCase();
      this.filteredStoreList = this.storeList.filter(store =>
        (store.name && store.name.toLowerCase().includes(query)) ||
        (store.location && store.location.toLowerCase().includes(query))
      );
    }
  }

  selectStore(store: any) {
    this.selectedStore = store;
    this.currentStoreName = store.name || 'Unknown';
    this.currentStoreId = store.id;
    this.currentStockBatch.storeId = store.id;
    this.isStoreDropdownOpen = false;
  }

  // Last Unit of Measure dropdown methods
  loadLastUnitOfMeasures() {
    this.api.getAllStrengthUnitsBusinessItem().subscribe({
      next: (res) => {
        this.lastUnitOfMeasureList = res || [];
        this.filteredLastUnitOfMeasureList = this.lastUnitOfMeasureList;
        console.log("Last unit of measures loaded: ", this.lastUnitOfMeasureList);
        // Reset search query to show all items
        if (!this.lastUnitOfMeasureSearchQuery.trim()) {
          this.filteredLastUnitOfMeasureList = this.lastUnitOfMeasureList;
        } else {
          this.filterLastUnitOfMeasures();
        }
      },
      error: (err: any) => {
        console.error("Error loading last unit of measures: ", err);
        this.lastUnitOfMeasureList = [];
        this.filteredLastUnitOfMeasureList = [];
      }
    });
  }

  toggleLastUnitOfMeasureDropdown() {
    this.isLastUnitOfMeasureDropdownOpen = !this.isLastUnitOfMeasureDropdownOpen;
    if (this.isLastUnitOfMeasureDropdownOpen) {
      // Always reload to ensure we have the latest data
      this.loadLastUnitOfMeasures();
      // Update filtered list after reload
      setTimeout(() => {
        if (!this.lastUnitOfMeasureSearchQuery.trim()) {
          this.filteredLastUnitOfMeasureList = this.lastUnitOfMeasureList;
        } else {
          this.filterLastUnitOfMeasures();
        }
      }, 100);
    }
  }

  filterLastUnitOfMeasures() {
    if (!this.lastUnitOfMeasureSearchQuery.trim()) {
      this.filteredLastUnitOfMeasureList = this.lastUnitOfMeasureList;
      return;
    }
    const query = this.lastUnitOfMeasureSearchQuery.toLowerCase().trim();
    this.filteredLastUnitOfMeasureList = this.lastUnitOfMeasureList.filter((unit: any) => {
      const title = (unit.title || '').toLowerCase();
      return title.includes(query);
    });
  }

  selectLastUnitOfMeasure(unit: any) {
    this.selectedLastUnitOfMeasure = unit;
    this.selectedLastUnitOfMeasureName = unit.title;
    this.currentStockBatch.lastUnitOfMeasure = unit.title;
    this.isLastUnitOfMeasureDropdownOpen = false;
    this.lastUnitOfMeasureSearchQuery = '';
    this.filteredLastUnitOfMeasureList = this.lastUnitOfMeasureList;
  }

  clearLastUnitOfMeasureSelection() {
    this.selectedLastUnitOfMeasure = null;
    this.selectedLastUnitOfMeasureName = '';
    this.currentStockBatch.lastUnitOfMeasure = null;
  }

  openStrengthUnitModal() {
    // Navigate to consumable items page where strength units can be managed
    this.isLastUnitOfMeasureDropdownOpen = false;
    this.router.navigate(['/overview/consumable-items']);
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.strength-unit-dropdown-wrapper')) {
      this.isLastUnitOfMeasureDropdownOpen = false;
    }
  }

  // Form methods - removed openStockBatchModal as we only allow updates via editStockBatch

  clearFormNewStockBatch() {
    this.currentStockBatch = {
      expiryDate: null,
      stockAtHand: null,
      unitCostPrice: null,
      unitSellingPrice: null,
      shelfNumber: null,
      profitMarginForRetail: null,
      profitMarginForWholeSale: null,
      profitMarginForSpecialCase: null,
      reOrderTo: null,
      lastUnitValue: null,
      lastUnitOfMeasure: null
    };
    this.isEditingStockBatch = false;
    this.editingStockBatchId = null;
    this.editingStockItemName = '';
    this.editingUnitCostPrice = null;
    this.editingUnitSellingPrice = null;
    this.clearLastUnitOfMeasureSelection();
    this.saveButtonStatus = "Update Stock Batch";
    this.responseMessage = "";
    this.showDivAddToDataBaseNewStockBatch = false;
  }

  closeStockBatchModal() {
    this.isCollapsedNewStockBatch = true;
    document.body.style.overflow = 'auto';
    this.clearFormNewStockBatch();
  }

  saveStockBatch(form: NgForm) {
    // Only allow updates, not creation
    if (!this.isEditingStockBatch || !this.editingStockBatchId) {
      this.responseColor = "#dc2626";
      this.responseMessage = "Please select a batch to update.";
      this.showDivAddToDataBaseNewStockBatch = true;
      setTimeout(() => {
        this.showDivAddToDataBaseNewStockBatch = false;
      }, 4000);
      return;
    }

    this.showDivUpdatedLoaderNewStockBatch = true;
    this.isButtonDisabled = true;

    // Prepare request data - only the fields updated by stock batch service
    const requestData: any = {};

    // Only include fields that have values
    if (this.currentStockBatch.stockAtHand != null && this.currentStockBatch.stockAtHand !== '') {
      requestData.stockAtHand = parseFloat(this.currentStockBatch.stockAtHand);
    }
    if (this.currentStockBatch.unitCostPrice != null && this.currentStockBatch.unitCostPrice !== '') {
      requestData.unitCostPrice = parseFloat(this.currentStockBatch.unitCostPrice);
    }
    if (this.currentStockBatch.unitSellingPrice != null && this.currentStockBatch.unitSellingPrice !== '') {
      requestData.unitSellingPrice = parseFloat(this.currentStockBatch.unitSellingPrice);
    }
    if (this.currentStockBatch.expiryDate) {
      requestData.expiryDate = this.formatExpiryForApi(this.currentStockBatch.expiryDate);
    }
    if (this.currentStockBatch.shelfNumber != null && this.currentStockBatch.shelfNumber !== '') {
      requestData.shelfNumber = parseInt(this.currentStockBatch.shelfNumber, 10);
    }
    if (this.selectedUnitSellingModelId != null) {
      requestData.unitSellingModelId = this.selectedUnitSellingModelId;
    }
    if (this.currentStockBatch.reOrderTo != null) {
      requestData.reOrderTo = parseInt(this.currentStockBatch.reOrderTo, 10);
    }
    if (this.currentStockBatch.lastUnitValue != null) {
      requestData.lastUnitValue = parseFloat(this.currentStockBatch.lastUnitValue);
    }
    if (this.currentStockBatch.lastUnitOfMeasure != null && this.currentStockBatch.lastUnitOfMeasure.trim() !== '') {
      requestData.lastUnitOfMeasure = this.currentStockBatch.lastUnitOfMeasure;
    }

    // Call updateStockBatch API
    this.api.updateStockBatch(this.editingStockBatchId, requestData).subscribe({
      next: (response: any) => {
        this.showDivUpdatedLoaderNewStockBatch = false;
        this.isButtonDisabled = false;
        this.responseColor = "rgb(11, 155, 112)";
        this.responseMessage = response.message || "Stock batch updated successfully!";
        this.showDivAddToDataBaseNewStockBatch = true;
        this.initializeTableData();

        setTimeout(() => {
          this.showDivAddToDataBaseNewStockBatch = false;
          this.closeStockBatchModal();
        }, 3000);
      },
      error: (err: any) => {
        console.error("Error updating stock batch:", err);
        this.showDivUpdatedLoaderNewStockBatch = false;
        this.isButtonDisabled = false;
        this.responseColor = "#dc2626";
        this.responseMessage = err.error?.message || "Error updating stock batch. Please try again.";
        this.showDivAddToDataBaseNewStockBatch = true;
        setTimeout(() => {
          this.showDivAddToDataBaseNewStockBatch = false;
        }, 4000);
      }
    });
  }

  editStockBatch(batch: any) {
    console.log("Editing stock batch:", batch);
    
    this.isEditingStockBatch = true;
    this.editingStockBatchId = batch.id;
    const stockItemName = batch.stockItemName || 'N/A';
    // Capitalize first letter
    this.editingStockItemName = stockItemName.charAt(0).toUpperCase() + stockItemName.slice(1);
    this.editingUnitCostPrice = batch.unitCostPrice != null ? batch.unitCostPrice : (batch.buyPrice != null ? batch.buyPrice : null);
    this.editingUnitSellingPrice = batch.unitSellingPrice != null ? batch.unitSellingPrice : (batch.sellPrice != null ? batch.sellPrice : null);
    this.saveButtonStatus = "Update Stock Batch";
    
    // Open modal
    this.isCollapsedNewStockBatch = false;
    document.body.style.overflow = 'hidden';

    // Populate form fields
    this.currentStockBatch = {
      stockItemId: batch.stockItemId ?? null,
      expiryDate: this.toDateInputValue(batch.expiryDate),
      stockAtHand: batch.stockAtHand != null ? batch.stockAtHand : null,
      unitCostPrice:
        batch.unitCostPrice != null
          ? batch.unitCostPrice
          : batch.buyPrice != null
            ? batch.buyPrice
            : null,
      unitSellingPrice:
        batch.unitSellingPrice != null
          ? batch.unitSellingPrice
          : batch.sellPrice != null
            ? batch.sellPrice
            : null,
      shelfNumber: batch.shelfNumber != null ? batch.shelfNumber : null,
      profitMarginForRetail: batch.profitMarginForRetail != null ? batch.profitMarginForRetail : (batch.profitMargin != null ? batch.profitMargin : null),
      profitMarginForWholeSale: batch.profitMarginForWholeSale != null ? batch.profitMarginForWholeSale : null,
      profitMarginForSpecialCase: batch.profitMarginForSpecialCase != null ? batch.profitMarginForSpecialCase : null,
      reOrderTo: batch.reOrderTo != null
        ? batch.reOrderTo
        : (batch.reorderTo != null
            ? batch.reorderTo
            : (batch.reorderPoint != null ? batch.reorderPoint : null)),
      lastUnitValue: batch.lastUnitValue != null ? batch.lastUnitValue : null,
      lastUnitOfMeasure: batch.lastUnitOfMeasure || null
    };

    this.editingUnitCostPrice = this.currentStockBatch.unitCostPrice;
    this.editingUnitSellingPrice = this.currentStockBatch.unitSellingPrice;
    this.selectedUnitSellingModelId = batch.unitSellingModelId ?? null;

    // Set last unit of measure dropdown if value exists
    if (batch.lastUnitOfMeasure) {
      // Try to find matching unit in the list
      setTimeout(() => {
        const matchingUnit = this.lastUnitOfMeasureList.find((unit: any) => 
          unit.title === batch.lastUnitOfMeasure || unit.standardAbbreviation === batch.lastUnitOfMeasure
        );
        if (matchingUnit) {
          this.selectLastUnitOfMeasure(matchingUnit);
        } else {
          // If not found, just set the name
          this.selectedLastUnitOfMeasureName = batch.lastUnitOfMeasure;
        }
      }, 200);
    } else {
      this.clearLastUnitOfMeasureSelection();
    }
  }

  deleteStockBatch(batch: any) {
    this.stockBatchToDelete = batch;
    this.showDeleteConfirmModal = true;
  }

  viewStockBatchDetails(batch: any) {
    this.selectedStockBatchDetails = batch;
    this.showDetailsModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedStockBatchDetails = null;
    document.body.style.overflow = 'auto';
  }

  confirmDeleteStockBatch() {
    if (!this.stockBatchToDelete || !this.stockBatchToDelete.id) {
      return;
    }

    // TODO: Add API call when backend endpoint is ready
    // For now, just show success message
    this.showDeleteConfirmModal = false;
    this.stockBatchToDelete = null;
    this.responseColor = "rgb(11, 155, 112)";
    this.responseMessage = "Stock batch record deleted successfully!";
    this.showDivUpdatedOut = true;
    this.initializeTableData();
    setTimeout(() => {
      this.showDivUpdatedOut = false;
    }, 3000);
  }

  cancelDeleteStockBatch() {
    this.showDeleteConfirmModal = false;
    this.stockBatchToDelete = null;
  }

  // Export methods
  exportToExcel() {
    const dataToExport = this.filteredStockBatchList.map((batch, index) => ({
      'SN': index + 1,
      'Product': batch.stockItemName || 'N/A',
      'Store': batch.storeName || 'N/A',
      'Stock': batch.stockAtHand || 'N/A',
      'Buy Price': batch.buyPrice || batch.unitCostPrice || 'N/A',
      'Sell Price': batch.sellPrice || batch.unitSellingPrice || 'N/A',
      'Batch': batch.batchNumber || 'N/A',
      'Expiry': batch.expiryDate || 'N/A',
      'Shelf': batch.shelfNumber || 'N/A',
      'Supplier': batch.stockSupplierName || 'N/A',
      'Reorder': (batch.reorderLevel && batch.reorderPoint) ? `${batch.reorderLevel} / ${batch.reorderPoint}` : 'N/A',
      'Profit Margin (Retail)': batch.profitMarginForRetail != null ? batch.profitMarginForRetail : (batch.profitMargin != null ? batch.profitMargin : 'N/A'),
      'Profit Margin (Wholesale)': batch.profitMarginForWholeSale != null ? batch.profitMarginForWholeSale : 'N/A',
      'Profit Margin (Special)': batch.profitMarginForSpecialCase != null ? batch.profitMarginForSpecialCase : 'N/A',
      'Last Unit Value': batch.lastUnitValue != null ? batch.lastUnitValue : 'N/A',
      'Last Unit of Measure': batch.lastUnitOfMeasure || 'N/A'
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Batches');
    XLSX.writeFile(wb, 'stock-batches.xlsx');
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
      pdf.save('stock-batches.pdf');
    });
  }

  // UI helper methods
  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.eyeIcon = this.isCollapsed ? "bi bi-funnel" : "bi bi-funnel-fill";
    this.eyeIconDrop = this.isCollapsed ? "bi bi-chevron-down" : "bi bi-chevron-up";
  }

  buttonClickIconChange() {
    this.iconChange = this.iconChange === "bi bi-chevron-down" ? "bi bi-chevron-up" : "bi bi-chevron-down";
  }

  onBatchUnitCostChange(value: number | string | null): void {
    this.currentStockBatch.unitCostPrice = this.toOptionalNumber(value);
    this.editingUnitCostPrice = this.currentStockBatch.unitCostPrice;
    this.syncBatchProfitMarginFromPrices();
  }

  onBatchUnitSellChange(value: number | string | null): void {
    this.currentStockBatch.unitSellingPrice = this.toOptionalNumber(value);
    this.editingUnitSellingPrice = this.currentStockBatch.unitSellingPrice;
    this.syncBatchProfitMarginFromPrices();
  }

  onBatchUnitSellingModelSelected(model: any): void {
    if (!model) {
      return;
    }
    this.currentStockBatch.unitSellingPrice = Number(model.unitSellingPrice) || 0;
    this.editingUnitSellingPrice = this.currentStockBatch.unitSellingPrice;
    const name = String(model.name || '').toLowerCase();
    const margin = Number(model.profitMargin) || 0;
    if (name.includes('retail')) {
      this.currentStockBatch.profitMarginForRetail = margin;
    } else if (name.includes('wholesale')) {
      this.currentStockBatch.profitMarginForWholeSale = margin;
    } else if (name.includes('special')) {
      this.currentStockBatch.profitMarginForSpecialCase = margin;
    }
  }

  private syncBatchProfitMarginFromPrices(): void {
    const cost = this.toOptionalNumber(this.currentStockBatch.unitCostPrice);
    const sell = this.toOptionalNumber(this.currentStockBatch.unitSellingPrice);
    if (cost == null || sell == null) {
      return;
    }
    const margin = sell - cost;
    if (margin > 0) {
      this.currentStockBatch.profitMarginForRetail = margin;
    }
  }

  private toOptionalNumber(value: number | string | null | undefined): number | null {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private toDateInputValue(value: unknown): string | null {
    if (value == null || value === '') {
      return null;
    }
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(0, 10);
    }
    if (/^\d{4}\/\d{2}\/\d{2}/.test(raw)) {
      return raw.replace(/\//g, '-').slice(0, 10);
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return null;
  }

  private formatExpiryForApi(value: string): string {
    const normalized = this.toDateInputValue(value);
    if (!normalized) {
      return value;
    }
    const [year, month, day] = normalized.split('-');
    return `${year}/${month}/${day}`;
  }
}

