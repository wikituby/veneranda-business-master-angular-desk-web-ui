import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { defaultContactValue } from '../../../../utils/phone-contact.util';
import { findCreatedInList } from '../../../../utils/inventory-dropdown.util';
import {
  formatMoney2DecimalsDisplay,
  roundMoney2Decimals,
  roundMoney2DecimalsOptional,
} from '../../../../utils/ugx-money.util';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-stock-receive',
  templateUrl: './stock-receive.component.html',
  styleUrls: ['./stock-receive.component.css']
})
export class StockReceiveComponent implements OnInit {

  // Table data properties
  stockReceiveList: any[] = [];
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
  currentStockReceive: any = {
    quantityReceived: null,
    totalCostPrice: null,
    unitCostPrice: null,
    unitSellingPrice: null
  };
  /** UI-only: unit sell = unit cost + retail profit margin */
  profitMarginForRetail: number | null = null;
  selectedUnitSellingModelId: number | null = null;
  saveButtonStatus: string = "Add New Stock Receive";
  isButtonDisabled: boolean = false;
  showDivAddToDataBaseNewStockReceive: boolean = false;
  showDivUpdatedLoaderNewStockReceive: boolean = false;
  isCollapsedNewStockReceive: boolean = true;
  /** Field names shown in the Add Stock Receive modal when validation fails. */
  stockReceiveMissingFields: string[] = [];
  
  // Editing properties
  isEditingStockReceive: boolean = false;
  editingStockReceiveId: number | null = null;
  
  // Delete confirmation modal properties
  showDeleteConfirmModal: boolean = false;
  stockReceiveToDelete: any = null;
  
  // Details modal properties
  showDetailsModal: boolean = false;
  selectedStockReceiveDetails: any = null;
  
  // Dropdown lists
  stockItemList: any[] = [];
  stockBatchList: any[] = [];
  storeList: any[] = [];
  supplierList: any[] = [];
  
  // Stock Item dropdown properties
  filteredStockItemList: any[] = [];
  selectedStockItem: any = null;
  stockItemSearchQuery: string = '';
  isStockItemDropdownOpen: boolean = false;
  selectedStockItemName: string = '';
  currentStockItemName: string = 'Select stock item';
  currentStockItemId: any = null;
  /** Latest batch/receive pricing for the selected stock item (display + prefill). */
  selectedStockItemPreviousPricing: {
    unitCost: number;
    unitSell: number;
    profitMargin: number;
  } | null = null;
  
  // Store dropdown properties
  filteredStoreList: any[] = [];
  selectedStore: any = null;
  storeSearchQuery: string = '';
  isStoreDropdownOpen: boolean = false;
  selectedStoreName: string = '';
  currentStoreName: string = 'Select store';
  currentStoreId: any = null;
  
  // Supplier dropdown properties
  filteredSupplierList: any[] = [];
  selectedSupplier: any = null;
  supplierSearchQuery: string = '';
  isSupplierDropdownOpen: boolean = false;
  selectedSupplierName: string = '';
  currentSupplierName: string = 'Select supplier';
  currentSupplierId: any = null;

  purchaseOrderList: any[] = [];
  filteredPurchaseOrderList: any[] = [];
  purchaseOrderSearchQuery = '';
  isPurchaseOrderDropdownOpen = false;
  currentPurchaseOrderNo = '';
  
  // Date properties
  receiveDate: any = null;
  expiryDate: any = null;
  
  // Date filter properties
  filterStartDate: string = '';
  filterEndDate: string = '';

  // Add supplier modal properties
  isCollapsedNewSupplier: boolean = true;
  currentSupplier: any = {};
  showDivAddToDataBaseNewSupplier: boolean = false;
  showDivUpdatedLoaderNewSupplier: boolean = false;
  isButtonDisabledSupplier: boolean = false;
  
  // Add store modal properties
  isCollapsedNewStore: boolean = true;
  currentStore: any = {};
  showDivAddToDataBaseNewStore: boolean = false;
  showDivUpdatedLoaderNewStore: boolean = false;
  isButtonDisabledStore: boolean = false;
  
  // Add stock item modal properties
  isCollapsedNewStockItem: boolean = true;
  currentStockItem: any = {};
  showDivAddToDataBaseNewStockItem: boolean = false;
  showDivUpdatedLoaderNewStockItem: boolean = false;
  isButtonDisabledStockItem: boolean = false;
  
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
    this.loadStockBatches();
    this.loadStores();
    this.loadSuppliers();
  }

  initializeTableData() {
    this.isLoadingService = true;
    this.api.getAllStockReceivedBusinessItem().subscribe({
      next: (res) => {
        this.isLoadingService = false;
        console.log("Raw stock receives response:", res);
        
        // Ensure we have an array
        if (Array.isArray(res)) {
          this.stockReceiveList = res;
          this.data = res;
        } else if (res && Array.isArray(res.data)) {
          this.stockReceiveList = res.data;
          this.data = res.data;
        } else {
          console.warn("Unexpected stock receives response structure:", res);
          this.stockReceiveList = [];
          this.data = [];
        }
      },
      error: (err) => {
        this.isLoadingService = false;
        console.error("Error loading stock receives:", err);
        this.stockReceiveList = [];
        this.data = [];
        this.responseColor = "#dc2626";
        this.responseMessage = "Error loading stock receive records. Please try again.";
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
        this.filteredStockItemList = [...this.stockItemList];
        console.log("Stock items loaded:", this.stockItemList);
      },
      error: (err) => {
        console.error("Error loading stock items:", err);
      }
    });
  }

  loadStockBatches() {
    this.api.getAllStockBatches().subscribe({
      next: (res: any) => {
        this.stockBatchList = Array.isArray(res) ? res : [];
      },
      error: (err) => {
        console.error('Error loading stock batches:', err);
        this.stockBatchList = [];
      },
    });
  }

  loadStores(): Promise<void> {
    return new Promise((resolve) => {
      this.api.getAllStores().subscribe({
        next: (res: any) => {
          if (Array.isArray(res)) {
            this.storeList = res;
          } else if (res && Array.isArray(res.data)) {
            this.storeList = res.data;
          }
          console.log("Stores loaded:", this.storeList);
          resolve();
        },
        error: (err) => {
          console.error("Error loading stores:", err);
          resolve();
        }
      });
    });
  }

  loadSuppliers(): Promise<void> {
    return new Promise((resolve) => {
      console.log("Loading suppliers...");
      this.api.getAllSuppliersBusinessItem().subscribe({
        next: (res: any) => {
          console.log("Raw suppliers response:", res);
          if (Array.isArray(res)) {
            this.supplierList = res;
          } else if (res && Array.isArray(res.data)) {
            this.supplierList = res.data;
          } else if (res && res.data && !Array.isArray(res.data)) {
            console.warn("Unexpected data format (not array):", res.data);
            this.supplierList = [];
          } else {
            console.warn("Unexpected response format:", res);
            this.supplierList = [];
          }

          this.filteredSupplierList = [...this.supplierList];
          console.log("Suppliers loaded:", this.supplierList);
          resolve();
        },
        error: (err) => {
          console.error("Error loading suppliers:", err);
          this.supplierList = [];
          this.filteredSupplierList = [];
          resolve();
        }
      });
    });
  }

  private async reloadAndSelectAfterCreate(
    reload: () => Promise<void>,
    list: () => any[],
    response: any,
    select: (item: any) => void,
    options?: { requestedName?: string }
  ): Promise<void> {
    await reload();
    const item = findCreatedInList(list(), {
      response,
      requestedName: options?.requestedName,
    });
    if (item) {
      select(item);
    }
  }

  // Filter methods
  get filteredStockReceiveList() {
    let filtered = this.stockReceiveList;

    // Apply date filter first
    if (this.filterStartDate || this.filterEndDate) {
      filtered = filtered.filter(receive => {
        if (!receive.receiveDateAndTime) return false;
        
        // Parse the receive date from the record
        // Handle different date formats (e.g., "2025-01-15", "2025/01/15", "2025-01-15 10:30:00")
        const receiveDateStr = receive.receiveDateAndTime.toString();
        let receiveDate: Date | null = null;
        
        // Try to parse the date (handle various formats)
        if (receiveDateStr.includes('T')) {
          receiveDate = new Date(receiveDateStr);
        } else if (receiveDateStr.includes('-')) {
          // Format: YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
          const datePart = receiveDateStr.split(' ')[0];
          const [year, month, day] = datePart.split('-').map(Number);
          receiveDate = new Date(year, month - 1, day);
        } else if (receiveDateStr.includes('/')) {
          // Format: YYYY/MM/DD
          const [year, month, day] = receiveDateStr.split('/').map(Number);
          receiveDate = new Date(year, month - 1, day);
        }
        
        if (!receiveDate || isNaN(receiveDate.getTime())) {
          return false; // Invalid date, exclude from results
        }
        
        // Set time to start of day for comparison
        receiveDate.setHours(0, 0, 0, 0);
        
        // Check start date filter
        if (this.filterStartDate) {
          const startDate = new Date(this.filterStartDate);
          startDate.setHours(0, 0, 0, 0);
          if (receiveDate < startDate) {
            return false;
          }
        }
        
        // Check end date filter
        if (this.filterEndDate) {
          const endDate = new Date(this.filterEndDate);
          endDate.setHours(23, 59, 59, 999);
          if (receiveDate > endDate) {
            return false;
          }
        }
        
        return true;
      });
    }

    // Apply search query filter
    if (!this.searchQuery.trim()) {
      return filtered;
    }

    const query = this.searchQuery.toLowerCase().trim();
    
    if (this.selectedColumn === 'all') {
      return filtered.filter(receive => {
        return (receive.stockItemName && receive.stockItemName.toLowerCase().includes(query)) ||
               (receive.storeName && receive.storeName.toLowerCase().includes(query)) ||
               (receive.batchNumber && receive.batchNumber.toLowerCase().includes(query)) ||
               (receive.supplierName && receive.supplierName.toLowerCase().includes(query)) ||
               (receive.invoiceNumber && receive.invoiceNumber.toLowerCase().includes(query)) ||
               (receive.receiveDateAndTime && receive.receiveDateAndTime.toLowerCase().includes(query));
      });
    } else {
      return filtered.filter(receive => {
        const value = receive[this.selectedColumn];
        return value && value.toString().toLowerCase().includes(query);
      });
    }
  }
  
  // Method to clear date filters
  clearDateFilters() {
    this.filterStartDate = '';
    this.filterEndDate = '';
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.stock-item-dropdown-wrapper') && 
        !target.closest('.store-dropdown-wrapper') && 
        !target.closest('.supplier-dropdown-wrapper')) {
      this.isStockItemDropdownOpen = false;
      this.isStoreDropdownOpen = false;
      this.isSupplierDropdownOpen = false;
      this.isPurchaseOrderDropdownOpen = false;
    }
  }

  // Stock Item dropdown methods
  toggleStockItemDropdown() {
    this.isStockItemDropdownOpen = !this.isStockItemDropdownOpen;
    if (this.isStockItemDropdownOpen) {
      this.isStoreDropdownOpen = false; // Close other dropdowns
      this.isSupplierDropdownOpen = false;
      this.isPurchaseOrderDropdownOpen = false;
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

  /** Resolve stock item from a receive row (API has stockItemName/stockBatchId, not stockItemId). */
  private findStockItemForReceive(receive: any): any | null {
    if (!receive || !this.stockItemList.length) {
      return null;
    }

    const findById = (id: unknown) =>
      this.stockItemList.find((item) => Number(item.id) === Number(id));

    if (receive.stockItemId != null) {
      const byDirectId = findById(receive.stockItemId);
      if (byDirectId) {
        return byDirectId;
      }
    }

    if (receive.stockBatchId != null && this.stockBatchList.length) {
      const batch = this.stockBatchList.find(
        (b) => Number(b.id) === Number(receive.stockBatchId)
      );
      if (batch?.stockItemId != null) {
        const byBatch = findById(batch.stockItemId);
        if (byBatch) {
          return byBatch;
        }
      }
    }

    const receiveName = (receive.stockItemName || '').trim().toLowerCase();
    if (!receiveName) {
      return null;
    }

    return this.stockItemList.find((item) => {
      const itemName = (item.stockItemName || item.name || '').trim().toLowerCase();
      return itemName === receiveName;
    }) ?? null;
  }

  selectStockItem(item: any) {
    this.clearStockReceiveModalValidationError();
    this.selectedStockItem = item;
    this.selectedStockItemName = item.stockItemName || item.name || 'Unknown';
    this.currentStockItemName = this.selectedStockItemName;
    this.currentStockItemId = item.id;
    this.currentStockReceive.stockItemId = item.id;
    this.isStockItemDropdownOpen = false;

    const previous = this.resolvePreviousPricingForItem(item);
    this.selectedStockItemPreviousPricing = previous;

    if (!this.isEditingStockReceive && previous) {
      if (previous.profitMargin > 0) {
        this.profitMarginForRetail = this.roundMoney(previous.profitMargin);
      }
      if (previous.unitSell > 0) {
        this.currentStockReceive.unitSellingPrice = this.roundMoney(previous.unitSell);
      }
    }
  }

  /** Latest batch pricing for item; falls back to most recent stock receive by name. */
  private resolvePreviousPricingForItem(item: any): {
    unitCost: number;
    unitSell: number;
    profitMargin: number;
  } | null {
    if (!item?.id) {
      return null;
    }

    const batch = this.findLatestBatchForStockItem(item.id);
    if (batch) {
      return this.buildPricingSnapshot(
        batch.unitCostPrice,
        batch.unitSellingPrice,
        batch.profitMarginForRetail
      );
    }

    const itemName = (item.stockItemName || item.name || '').trim().toLowerCase();
    if (!itemName || !this.stockReceiveList.length) {
      return null;
    }

    const receive = this.stockReceiveList.find(
      (r) => (r.stockItemName || '').trim().toLowerCase() === itemName
    );
    if (!receive) {
      return null;
    }

    return this.buildPricingSnapshot(
      receive.unitCostPrice,
      receive.unitSellingPrice,
      null
    );
  }

  private findLatestBatchForStockItem(stockItemId: number): any | null {
    const matches = this.stockBatchList.filter(
      (b) => Number(b.stockItemId) === Number(stockItemId)
    );
    if (!matches.length) {
      return null;
    }

    return matches.sort((a, b) => {
      const aTime = this.batchSortTime(a);
      const bTime = this.batchSortTime(b);
      if (bTime !== aTime) {
        return bTime - aTime;
      }
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    })[0];
  }

  private batchSortTime(batch: any): number {
    const raw =
      batch?.creationDateAndTime ??
      batch?.upDateDateAndTime ??
      batch?.receiveDate ??
      null;
    if (!raw) {
      return 0;
    }
    const parsed = new Date(raw).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private buildPricingSnapshot(
    unitCostRaw: unknown,
    unitSellRaw: unknown,
    profitMarginRaw: unknown
  ): { unitCost: number; unitSell: number; profitMargin: number } | null {
    const unitCost = this.roundMoney(Number(unitCostRaw) || 0);
    const unitSell = this.roundMoney(Number(unitSellRaw) || 0);
    let profitMargin = this.roundMoney(Number(profitMarginRaw) || 0);

    if (profitMargin <= 0 && unitSell > unitCost) {
      profitMargin = this.roundMoney(unitSell - unitCost);
    }

    if (unitCost <= 0 && unitSell <= 0 && profitMargin <= 0) {
      return null;
    }

    return { unitCost, unitSell, profitMargin };
  }

  formatMoneyDisplay(value: number | null | undefined): string {
    return formatMoney2DecimalsDisplay(value);
  }

  onTotalCostPriceBlur(): void {
    this.currentStockReceive.totalCostPrice = roundMoney2DecimalsOptional(
      this.currentStockReceive.totalCostPrice
    );
    this.calculateUnitCost();
  }

  onUnitCostPriceBlur(): void {
    this.currentStockReceive.unitCostPrice = roundMoney2DecimalsOptional(
      this.currentStockReceive.unitCostPrice
    );
    this.calculateTotalCost();
  }

  onUnitSellingPriceBlur(): void {
    this.currentStockReceive.unitSellingPrice = roundMoney2DecimalsOptional(
      this.currentStockReceive.unitSellingPrice
    );
    this.syncProfitMarginFromUnitSell();
  }

  onProfitMarginForRetailBlur(): void {
    this.profitMarginForRetail = roundMoney2DecimalsOptional(this.profitMarginForRetail);
    this.applyUnitSellFromProfitMargin();
  }

  // Store dropdown methods
  toggleStoreDropdown() {
    this.isStoreDropdownOpen = !this.isStoreDropdownOpen;
    if (this.isStoreDropdownOpen) {
      this.isStockItemDropdownOpen = false; // Close other dropdowns
      this.isSupplierDropdownOpen = false;
      this.isPurchaseOrderDropdownOpen = false;
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
    this.clearStockReceiveModalValidationError();
    this.selectedStore = store;
    this.selectedStoreName = store.name || 'Unknown';
    this.currentStoreName = this.selectedStoreName;
    this.currentStoreId = store.id;
    this.currentStockReceive.storeId = store.id;
    this.isStoreDropdownOpen = false;
  }

  togglePurchaseOrderDropdown() {
    this.isPurchaseOrderDropdownOpen = !this.isPurchaseOrderDropdownOpen;
    if (this.isPurchaseOrderDropdownOpen) {
      this.isStockItemDropdownOpen = false;
      this.isStoreDropdownOpen = false;
      this.isSupplierDropdownOpen = false;
      this.purchaseOrderSearchQuery = '';
      this.loadPurchaseOrders();
    }
  }

  loadPurchaseOrders() {
    this.api.getPurchaseOrders().subscribe({
      next: (rows: any) => {
        this.purchaseOrderList = Array.isArray(rows) ? rows : [];
        this.filterPurchaseOrders();
      },
      error: () => {
        this.purchaseOrderList = [];
        this.filteredPurchaseOrderList = [];
      },
    });
  }

  filterPurchaseOrders() {
    const query = (this.purchaseOrderSearchQuery || '').trim().toLowerCase();
    const list = Array.isArray(this.purchaseOrderList) ? this.purchaseOrderList : [];
    this.filteredPurchaseOrderList = !query
      ? [...list]
      : list.filter((order) =>
          String(order?.orderNo || '').toLowerCase().includes(query) ||
          String(order?.supplierName || '').toLowerCase().includes(query)
        );
  }

  selectPurchaseOrder(order: any) {
    this.clearStockReceiveModalValidationError();
    if (!order) {
      this.currentPurchaseOrderNo = '';
      this.currentStockReceive.purchaseOrderId = null;
      this.currentStockReceive.purchaseOrderNo = null;
    } else {
      this.currentPurchaseOrderNo = String(order.orderNo || '');
      this.currentStockReceive.purchaseOrderId = order.id;
      this.currentStockReceive.purchaseOrderNo = order.orderNo;
      if (order.supplierId && !this.currentSupplierId) {
        const supplier = (this.supplierList || []).find(
          (row: any) => Number(row?.id) === Number(order.supplierId)
        );
        if (supplier) {
          this.selectSupplier(supplier);
        }
      }
    }
    this.isPurchaseOrderDropdownOpen = false;
  }

  openNewPurchaseOrder(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.closeStockReceiveModal();
    this.router.navigate(['/overview/pharmacy-purchase-orders']);
  }

  // Supplier dropdown methods
  toggleSupplierDropdown() {
    this.isSupplierDropdownOpen = !this.isSupplierDropdownOpen;
    if (this.isSupplierDropdownOpen) {
      this.isStockItemDropdownOpen = false; // Close other dropdowns
      this.isStoreDropdownOpen = false;
      this.isPurchaseOrderDropdownOpen = false;
      // Load suppliers if not already loaded
      if (this.supplierList.length === 0) {
        this.loadSuppliers();
      }
      this.supplierSearchQuery = '';
      this.filterSuppliers();
    }
  }

  filterSuppliers() {
    if (!this.supplierSearchQuery.trim()) {
      this.filteredSupplierList = [...this.supplierList];
    } else {
      const query = this.supplierSearchQuery.toLowerCase();
      this.filteredSupplierList = this.supplierList.filter(supplier =>
        (supplier.supplierName && supplier.supplierName.toLowerCase().includes(query)) ||
        (supplier.name && supplier.name.toLowerCase().includes(query)) ||
        (supplier.companyName && supplier.companyName.toLowerCase().includes(query)) ||
        (supplier.abbreviation && supplier.abbreviation.toLowerCase().includes(query)) ||
        (supplier.contact && supplier.contact.toLowerCase().includes(query)) ||
        (supplier.phone && supplier.phone.toLowerCase().includes(query)) ||
        (supplier.phoneNumber && supplier.phoneNumber.toLowerCase().includes(query)) ||
        (supplier.emailAddress && supplier.emailAddress.toLowerCase().includes(query)) ||
        (supplier.email && supplier.email.toLowerCase().includes(query))
      );
    }
    console.log("Filtered suppliers:", this.filteredSupplierList);
    console.log("Filtered suppliers count:", this.filteredSupplierList.length);
  }

  selectSupplier(supplier: any) {
    this.clearStockReceiveModalValidationError();
    this.selectedSupplier = supplier;
    this.selectedSupplierName = supplier.supplierName || supplier.name || supplier.companyName || 'Unknown';
    this.currentSupplierName = this.selectedSupplierName;
    this.currentSupplierId = supplier.id || supplier.supplierId;
    this.currentStockReceive.supplierId = supplier.id || supplier.supplierId;
    this.isSupplierDropdownOpen = false;
    console.log("Selected supplier:", supplier);
    console.log("Selected supplier ID:", this.currentSupplierId);
  }

  trackBySupplierId(index: number, supplier: any): any {
    return supplier.id || supplier.supplierId || index;
  }

  // Supplier modal methods
  openSupplierModal() {
    this.clearFormNewSupplier();
    this.isCollapsedNewSupplier = false;
    this.isSupplierDropdownOpen = false; // Close supplier dropdown
    document.body.style.overflow = 'hidden';
  }

  closeSupplierModal() {
    this.isCollapsedNewSupplier = true;
    document.body.style.overflow = '';
    this.clearFormNewSupplier();
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
    this.showDivAddToDataBaseNewSupplier = false;
    this.showDivUpdatedLoaderNewSupplier = false;
    this.isButtonDisabledSupplier = false;
  }

  saveSupplier(form: NgForm) {
    const missing = this.collectInvalidFormFieldLabels(form, {
      supplierName: 'Supplier Name',
      contact: 'Contact',
    });
    if (missing.length) {
      this.responseColor = "#dc2626";
      this.responseMessage = `Please fill in: ${missing.join(', ')}.`;
      this.showDivAddToDataBaseNewSupplier = true;
      setTimeout(() => {
        this.showDivAddToDataBaseNewSupplier = false;
      }, 4000);
      return;
    }

    this.showDivUpdatedLoaderNewSupplier = true;
    this.isButtonDisabledSupplier = true;
    this.showDivAddToDataBaseNewSupplier = false;

    const supplierData = {
      supplierName: this.currentSupplier.supplierName || '',
      contact: this.currentSupplier.contact || '',
      emailAddress: this.currentSupplier.emailAddress || '',
      physicalAddress: this.currentSupplier.physicalAddress || '',
      webSiteAddress: this.currentSupplier.webSiteAddress || '',
      abbreviation: this.currentSupplier.abbreviation || '',
      description: this.currentSupplier.description || ''
    };

    console.log("Supplier data to save:", supplierData);

    this.api.saveSupplierBusinessItem(supplierData).subscribe({
      next: (response) => {
        console.log("Supplier saved successfully:", response);
        this.showDivUpdatedLoaderNewSupplier = false;
        this.isButtonDisabledSupplier = false;

        if (response && response.message) {
          this.responseColor = response.message.includes('successfully') || response.message.includes('saved') ? 'rgb(11, 155, 112)' : 'rgb(238, 16, 16)';
          this.responseMessage = response.message;
        } else {
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = "Supplier added successfully!";
        }

        this.showDivAddToDataBaseNewSupplier = true;

        void this.reloadAndSelectAfterCreate(
          () => this.loadSuppliers(),
          () => this.supplierList,
          response,
          (item) => this.selectSupplier(item),
          { requestedName: supplierData.supplierName }
        ).then(() => {
          this.showDivAddToDataBaseNewSupplier = false;
          this.closeSupplierModal();
          this.isButtonDisabledSupplier = false;
        });
      },
      error: (error) => {
        console.error("Error saving supplier:", error);
        this.showDivUpdatedLoaderNewSupplier = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = error.error?.message || "An error occurred while saving the supplier. Please try again.";
        this.showDivAddToDataBaseNewSupplier = true;
        this.isButtonDisabledSupplier = false;

        setTimeout(() => {
          this.showDivAddToDataBaseNewSupplier = false;
        }, 4000);
      }
    });
  }

  // Store modal methods
  openStoreModal() {
    this.clearFormNewStore();
    this.isCollapsedNewStore = false;
    this.isStoreDropdownOpen = false; // Close store dropdown
    document.body.style.overflow = 'hidden';
  }

  closeStoreModal() {
    this.isCollapsedNewStore = true;
    document.body.style.overflow = '';
    this.clearFormNewStore();
  }

  clearFormNewStore() {
    this.currentStore = {
      name: '',
      location: '',
      description: ''
    };
    this.showDivAddToDataBaseNewStore = false;
    this.showDivUpdatedLoaderNewStore = false;
    this.isButtonDisabledStore = false;
  }

  saveStore(form: NgForm) {
    const missing = this.collectInvalidFormFieldLabels(form, {
      name: 'Store Name',
      location: 'Location',
    });
    if (missing.length) {
      this.responseColor = "#dc2626";
      this.responseMessage = `Please fill in: ${missing.join(', ')}.`;
      this.showDivAddToDataBaseNewStore = true;
      setTimeout(() => {
        this.showDivAddToDataBaseNewStore = false;
      }, 4000);
      return;
    }

    this.showDivUpdatedLoaderNewStore = true;
    this.isButtonDisabledStore = true;
    this.showDivAddToDataBaseNewStore = false;

    const storeData = {
      name: this.currentStore.name || '',
      location: this.currentStore.location || '',
      description: this.currentStore.description || ''
    };

    console.log("Store data to save:", storeData);

    this.api.createStore(storeData).subscribe({
      next: (response: any) => {
        console.log("Store saved successfully:", response);
        this.showDivUpdatedLoaderNewStore = false;
        this.isButtonDisabledStore = false;

        if (response && response.message) {
          this.responseColor = response.message.includes('successfully') || response.message.includes('saved') ? 'rgb(11, 155, 112)' : 'rgb(238, 16, 16)';
          this.responseMessage = response.message;
        } else {
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = "Store added successfully!";
        }

        this.showDivAddToDataBaseNewStore = true;

        void this.reloadAndSelectAfterCreate(
          () => this.loadStores(),
          () => this.storeList,
          response,
          (item) => this.selectStore(item),
          { requestedName: storeData.name }
        ).then(() => {
          this.showDivAddToDataBaseNewStore = false;
          this.closeStoreModal();
          this.isButtonDisabledStore = false;
        });
      },
      error: (error: any) => {
        console.error("Error saving store:", error);
        this.showDivUpdatedLoaderNewStore = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = error.error?.message || "An error occurred while saving the store. Please try again.";
        this.showDivAddToDataBaseNewStore = true;
        this.isButtonDisabledStore = false;

        setTimeout(() => {
          this.showDivAddToDataBaseNewStore = false;
        }, 4000);
      }
    });
  }

  // Stock item modal methods
  openStockItemModal() {
    this.clearFormNewStockItem();
    this.isCollapsedNewStockItem = false;
    this.isStockItemDropdownOpen = false; // Close stock item dropdown
    document.body.style.overflow = 'hidden';
  }

  closeStockItemModal() {
    this.isCollapsedNewStockItem = true;
    document.body.style.overflow = '';
    this.clearFormNewStockItem();
  }

  clearFormNewStockItem() {
    this.currentStockItem = {};
    this.showDivAddToDataBaseNewStockItem = false;
    this.showDivUpdatedLoaderNewStockItem = false;
    this.isButtonDisabledStockItem = false;
  }

  navigateToConsumableItems(event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.isStockItemDropdownOpen = false; // Close the dropdown
    this.router.navigate(['/overview/consumable-items']);
  }

  // Calculation methods
  onQuantityReceivedChange(value: number | string | null): void {
    this.clearStockReceiveModalValidationError();
    this.currentStockReceive.quantityReceived = this.toOptionalNumber(value);
    this.calculateUnitCost();
  }

  onTotalCostPriceChange(value: number | string | null): void {
    this.clearStockReceiveModalValidationError();
    this.currentStockReceive.totalCostPrice = this.toOptionalNumber(value);
    this.calculateUnitCost();
  }

  calculateUnitCost() {
    const qty = this.toOptionalNumber(this.currentStockReceive.quantityReceived);
    const total = this.toOptionalNumber(this.currentStockReceive.totalCostPrice);
    if (qty == null || total == null || qty <= 0) {
      return;
    }
    this.currentStockReceive.unitCostPrice = this.roundMoney(total / qty);
    this.applyUnitSellFromProfitMargin();
  }

  calculateTotalCost() {
    const qty = this.toOptionalNumber(this.currentStockReceive.quantityReceived);
    const unitCost = this.toOptionalNumber(this.currentStockReceive.unitCostPrice);
    if (qty == null || unitCost == null || qty <= 0) {
      return;
    }
    this.currentStockReceive.totalCostPrice = this.roundMoney(qty * unitCost);
    this.applyUnitSellFromProfitMargin();
  }

  onProfitMarginForRetailChange(value: number | string | null): void {
    this.clearStockReceiveModalValidationError();
    this.profitMarginForRetail = this.toOptionalNumber(value);
    this.applyUnitSellFromProfitMargin();
  }

  onUnitCostPriceChange(value: number | string | null): void {
    this.clearStockReceiveModalValidationError();
    this.currentStockReceive.unitCostPrice = this.toOptionalNumber(value);
    this.calculateTotalCost();
  }

  onUnitSellingPriceChange(value: number | string | null): void {
    this.clearStockReceiveModalValidationError();
    this.currentStockReceive.unitSellingPrice = this.toOptionalNumber(value);
    this.syncProfitMarginFromUnitSell();
  }

  onUnitSellingModelSelected(model: any): void {
    if (!model) {
      return;
    }
    this.currentStockReceive.unitSellingPrice = this.roundMoney(Number(model.unitSellingPrice) || 0);
    this.profitMarginForRetail = this.roundMoney(Number(model.profitMargin) || 0);
  }

  onUnitSellingModelPriceChange(price: number): void {
    this.currentStockReceive.unitSellingPrice = this.roundMoney(Number(price) || 0);
    this.syncProfitMarginFromUnitSell();
  }

  /** Unit selling price = unit cost + profit margin (sent to API). */
  applyUnitSellFromProfitMargin(): void {
    const cost = this.toOptionalNumber(this.currentStockReceive.unitCostPrice);
    const margin = this.toOptionalNumber(this.profitMarginForRetail);
    if (cost == null || margin == null) {
      return;
    }
    this.currentStockReceive.unitSellingPrice = this.roundMoney(cost + margin);
  }

  private syncProfitMarginFromUnitSell(): void {
    const sell = this.toOptionalNumber(this.currentStockReceive.unitSellingPrice);
    const cost = this.toOptionalNumber(this.currentStockReceive.unitCostPrice);
    if (sell == null) {
      this.profitMarginForRetail = null;
      return;
    }
    if (cost == null) {
      this.profitMarginForRetail = this.roundMoney(sell);
      return;
    }
    this.profitMarginForRetail = this.roundMoney(Math.max(0, sell - cost));
  }

  private toOptionalNumber(value: number | string | null | undefined): number | null {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  /** Round money fields to 2 decimal places. */
  private roundMoney(value: number): number {
    return roundMoney2Decimals(value);
  }

  private normalizeAllMoneyFields(): void {
    this.currentStockReceive.totalCostPrice = roundMoney2DecimalsOptional(
      this.currentStockReceive.totalCostPrice
    );
    this.currentStockReceive.unitCostPrice = roundMoney2DecimalsOptional(
      this.currentStockReceive.unitCostPrice
    );
    this.currentStockReceive.unitSellingPrice = roundMoney2DecimalsOptional(
      this.currentStockReceive.unitSellingPrice
    );
    this.profitMarginForRetail = roundMoney2DecimalsOptional(this.profitMarginForRetail);

    if (
      this.toOptionalNumber(this.currentStockReceive.unitCostPrice) != null &&
      this.toOptionalNumber(this.profitMarginForRetail) != null
    ) {
      this.applyUnitSellFromProfitMargin();
    } else if (this.toOptionalNumber(this.currentStockReceive.unitSellingPrice) != null) {
      this.syncProfitMarginFromUnitSell();
    }
  }

  // Form methods
  openStockReceiveModal() {
    this.clearFormNewStockReceive();
    // Ensure suppliers are loaded when modal opens
    if (this.supplierList.length === 0) {
      this.loadSuppliers();
    }
    this.isCollapsedNewStockReceive = false;
    document.body.style.overflow = 'hidden';
  }

  clearFormNewStockReceive() {
    this.currentStockReceive = {
      quantityReceived: null,
      totalCostPrice: null,
      unitCostPrice: null,
      unitSellingPrice: null
    };
    this.profitMarginForRetail = null;
    this.selectedUnitSellingModelId = null;
    this.selectedStockItemPreviousPricing = null;
    this.selectedStockItem = null;
    this.selectedStore = null;
    this.selectedSupplier = null;
    this.currentStockItemName = 'Select stock item';
    this.currentStoreName = 'Select store';
    this.currentSupplierName = 'Select supplier';
    this.currentStockItemId = null;
    this.currentStoreId = null;
    this.currentSupplierId = null;
    this.currentPurchaseOrderNo = '';
    this.isPurchaseOrderDropdownOpen = false;
    this.purchaseOrderSearchQuery = '';
    this.receiveDate = null;
    this.expiryDate = null;
    this.isEditingStockReceive = false;
    this.editingStockReceiveId = null;
    this.saveButtonStatus = "Add New Stock Receive";
    this.responseMessage = "";
    this.stockReceiveMissingFields = [];
    this.showDivAddToDataBaseNewStockReceive = false;
  }

  closeStockReceiveModal() {
    this.isCollapsedNewStockReceive = true;
    document.body.style.overflow = 'auto';
    this.clearFormNewStockReceive();
  }

  saveStockReceive(form: NgForm) {
    this.syncStockReceiveFormBeforeSave(form);

    const missing = this.collectStockReceiveValidationErrors(form);
    if (missing.length) {
      this.showStockReceiveModalValidationError(missing);
      return;
    }

    this.clearStockReceiveModalValidationError();
    this.normalizeAllMoneyFields();

    const unitCost = this.toOptionalNumber(this.currentStockReceive.unitCostPrice) ?? 0;
    let unitSell = this.toOptionalNumber(this.currentStockReceive.unitSellingPrice) ?? 0;
    if (unitSell > 0) {
      this.syncProfitMarginFromUnitSell();
    } else {
      this.applyUnitSellFromProfitMargin();
      unitSell = this.toOptionalNumber(this.currentStockReceive.unitSellingPrice) ?? 0;
    }

    if (unitSell <= unitCost) {
      this.showStockReceiveModalValidationError(
        ['Unit Sell', 'Unit Cost Price'],
        'Unit sell must be greater than unit cost.'
      );
      return;
    }

    if (this.profitMarginForRetail == null || this.profitMarginForRetail <= 0) {
      this.showStockReceiveModalValidationError(
        ['Unit sell model', 'Unit Sell'],
        'Select a unit sell model with a price above unit cost.'
      );
      return;
    }

    if (this.selectedUnitSellingModelId == null) {
      this.showStockReceiveModalValidationError(
        ['Unit sell model'],
        'Select a unit sell model.'
      );
      return;
    }

    this.showDivUpdatedLoaderNewStockReceive = true;
    this.isButtonDisabled = true;

    const stockItemId = parseInt(String(this.currentStockItemId), 10);
    const storeId = parseInt(String(this.currentStoreId), 10);
    const stockSupplierId = parseInt(String(this.currentSupplierId), 10);

    if (isNaN(stockItemId) || isNaN(storeId) || isNaN(stockSupplierId)) {
      this.showDivUpdatedLoaderNewStockReceive = false;
      this.isButtonDisabled = false;
      this.showStockReceiveModalValidationError(
        ['Stock Item', 'Store', 'Supplier'],
        'Invalid Stock Item, Store, or Supplier selection.'
      );
      return;
    }

    // Prepare request data - copy approach from old stock receive component
    // Convert dates - use YYYY/MM/DD format (same as old component)
    const formData: any = {
      ...this.currentStockReceive,
      stockItemId: this.currentStockItemId,
      storeId: this.currentStoreId,
      stockSupplierId: this.currentSupplierId
    };

    // Convert receiveDate (Object → String "YYYY/MM/DD") or set to null
    if (this.receiveDate && typeof this.receiveDate === 'object' && this.receiveDate.year) {
      const { year, month, day } = this.receiveDate;
      formData.receiveDate = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    } else if (this.receiveDate && typeof this.receiveDate === 'string') {
      formData.receiveDate = this.receiveDate;
    } else {
      formData.receiveDate = null;
    }

    // Convert expiryDate (Object → String "YYYY/MM/DD") or set to null
    if (this.expiryDate && typeof this.expiryDate === 'object' && this.expiryDate.year) {
      const { year, month, day } = this.expiryDate;
      formData.expiryDate = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    } else if (this.expiryDate && typeof this.expiryDate === 'string') {
      formData.expiryDate = this.expiryDate;
    } else {
      formData.expiryDate = null;
    }

    formData.unitCostPrice = this.roundMoney(formData.unitCostPrice);
    formData.unitSellingPrice = this.roundMoney(formData.unitSellingPrice);
    formData.totalCostPrice = this.roundMoney(formData.totalCostPrice);

    const requestData = {
      ...formData,
      unitSellingModelId: this.selectedUnitSellingModelId,
      profitMarginForRetail: this.profitMarginForRetail != null
        ? this.roundMoney(this.profitMarginForRetail)
        : null,
    };

    console.log("Sending stock receive data:", requestData);
    console.log("JWT Token:", this.api.getSessionToken());

    this.api.receiveNewStockBusinessItem(requestData).subscribe({
      next: (response: any) => {
        this.showDivUpdatedLoaderNewStockReceive = false;
        this.isButtonDisabled = false;

        if (response && response.message) {
          this.responseColor = "rgb(11, 155, 112)";
          this.responseMessage = response.message;
        } else {
          this.responseColor = "rgb(11, 155, 112)";
          this.responseMessage = "Stock receive record saved successfully!";
        }

        this.showDivAddToDataBaseNewStockReceive = true;
        this.initializeTableData();
        this.loadStockBatches();

        setTimeout(() => {
          this.showDivAddToDataBaseNewStockReceive = false;
          this.closeStockReceiveModal();
        }, 3000);
      },
      error: (err) => {
        console.error("Error saving stock receive:", err);
        console.error("Error status:", err.status);
        console.error("Error error object:", err.error);
        
        this.showDivUpdatedLoaderNewStockReceive = false;
        this.isButtonDisabled = false;
        this.responseColor = "#dc2626";
        
        // Extract error message from various possible formats
        let errorMessage = "An unexpected error occurred. Please try again.";
        if (err.error) {
          if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.error) {
            errorMessage = err.error.error;
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        this.responseMessage = errorMessage;
        this.showDivAddToDataBaseNewStockReceive = true;
        setTimeout(() => {
          this.showDivAddToDataBaseNewStockReceive = false;
        }, 5000);
      }
    });
  }

  editStockReceive(receive: any) {
    console.log("Editing stock receive:", receive);
    
    this.isEditingStockReceive = true;
    this.editingStockReceiveId = receive.id;
    this.saveButtonStatus = "Update Stock Receive";
    
    // Open modal
    this.isCollapsedNewStockReceive = false;
    document.body.style.overflow = 'hidden';

    // Populate form fields
    this.currentStockReceive = {
      quantityReceived: receive.quantityReceived ?? null,
      totalCostPrice: receive.totalCostPrice ?? null,
      unitCostPrice: receive.unitCostPrice ?? null,
      unitSellingPrice: receive.unitSellingPrice ?? null,
      invoiceNumber: receive.invoiceNumber || '',
      notes: receive.notes || '',
      brand: receive.brand || '',
      packaging: receive.packaging || '',
      purchaseOrderId: receive.purchaseOrderId ?? null,
      purchaseOrderNo: receive.purchaseOrderNo || null,
    };
    this.currentPurchaseOrderNo = receive.purchaseOrderNo || '';
    this.syncProfitMarginFromUnitSell();
    this.normalizeAllMoneyFields();

    // Set dropdowns (receive rows expose stockItemName/stockBatchId, not stockItemId)
    const stockItem = this.findStockItemForReceive(receive);
    if (stockItem) {
      this.selectStockItem(stockItem);
    } else if (receive.stockItemName) {
      this.currentStockItemName = receive.stockItemName;
      this.selectedStockItemName = receive.stockItemName;
    }

    if (receive.storeId != null) {
      const store = this.storeList.find(
        (s) => Number(s.id) === Number(receive.storeId)
      );
      if (store) {
        this.selectStore(store);
      } else if (receive.storeName) {
        this.currentStoreName = receive.storeName;
      }
    }

    if (receive.supplierId != null) {
      const supplier = this.supplierList.find(
        (s) => Number(s.id ?? s.supplierId) === Number(receive.supplierId)
      );
      if (supplier) {
        this.selectSupplier(supplier);
      } else if (receive.supplierName) {
        this.currentSupplierName = receive.supplierName;
      }
    }

    // TODO: Parse dates if needed
  }

  deleteStockReceive(receive: any) {
    this.stockReceiveToDelete = receive;
    this.showDeleteConfirmModal = true;
  }

  viewStockReceiveDetails(receive: any) {
    this.selectedStockReceiveDetails = receive;
    this.showDetailsModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedStockReceiveDetails = null;
    document.body.style.overflow = 'auto';
  }

  confirmDeleteStockReceive() {
    if (!this.stockReceiveToDelete || !this.stockReceiveToDelete.id) {
      return;
    }

    this.api.deleteStockReceivedByIdBusinessItem(this.stockReceiveToDelete.id).subscribe({
      next: (response: any) => {
        this.showDeleteConfirmModal = false;
        this.stockReceiveToDelete = null;
        this.responseColor = "rgb(11, 155, 112)";
        this.responseMessage = "Stock receive record deleted successfully!";
        this.showDivUpdatedOut = true;
        this.initializeTableData();
        setTimeout(() => {
          this.showDivUpdatedOut = false;
        }, 3000);
      },
      error: (err) => {
        this.responseColor = "#dc2626";
        this.responseMessage = err.error?.message || "Error deleting stock receive record. Please try again.";
        this.showDivUpdatedOut = true;
        setTimeout(() => {
          this.showDivUpdatedOut = false;
        }, 4000);
      }
    });
  }

  cancelDeleteStockReceive() {
    this.showDeleteConfirmModal = false;
    this.stockReceiveToDelete = null;
  }

  // Export methods
  exportToExcel() {
    const dataToExport = this.filteredStockReceiveList.map((receive, index) => ({
      'SN': index + 1,
      'Stock Item': receive.stockItemName || 'N/A',
      'Store': receive.storeName || 'N/A',
      'QTY RCVD': receive.quantityReceived || 'N/A',
      'QTY AVAIL': receive.quantityAvailable != null ? receive.quantityAvailable : 'N/A',
      'New QTY': receive.newQuantity != null ? receive.newQuantity : 'N/A',
      'Unit Cost': receive.unitCostPrice || 'N/A',
      'Total Cost': receive.totalCostPrice || 'N/A',
      'Supplier': receive.supplierName || 'N/A',
      'INV NO': receive.invoiceNumber || 'N/A',
      'Receive Date': receive.receiveDateAndTime || 'N/A',
      'Expiry Date': receive.expiryDate || 'N/A',
      'BATCH NO': receive.batchNumber || 'N/A'
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Receives');
    XLSX.writeFile(wb, 'stock-receives.xlsx');
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
      pdf.save('stock-receives.pdf');
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

  /** Keep dropdown selections and derived prices in sync before validation/submit. */
  private syncStockReceiveFormBeforeSave(form?: NgForm): void {
    this.currentStockReceive.stockItemId =
      this.currentStockItemId ?? this.currentStockReceive.stockItemId;
    this.currentStockReceive.storeId =
      this.currentStoreId ?? this.currentStockReceive.storeId;
    this.currentStockReceive.supplierId =
      this.currentSupplierId ?? this.currentStockReceive.supplierId;

    if (this.toOptionalNumber(this.currentStockReceive.unitSellingPrice) != null) {
      this.syncProfitMarginFromUnitSell();
    } else if (this.toOptionalNumber(this.profitMarginForRetail) != null) {
      this.applyUnitSellFromProfitMargin();
    }

    if (form) {
      this.patchFormControl(form, 'stockItemId', this.currentStockReceive.stockItemId);
      this.patchFormControl(form, 'storeId', this.currentStockReceive.storeId);
      this.patchFormControl(form, 'supplierId', this.currentStockReceive.supplierId);
      this.patchFormControl(form, 'quantityReceived', this.currentStockReceive.quantityReceived);
      this.patchFormControl(form, 'totalCostPrice', this.currentStockReceive.totalCostPrice);
      this.patchFormControl(form, 'unitCostPrice', this.currentStockReceive.unitCostPrice);
      this.patchFormControl(form, 'unitSellingPrice', this.currentStockReceive.unitSellingPrice);
      this.patchFormControl(form, 'profitMarginForRetail', this.profitMarginForRetail);
    }
  }

  private showStockReceiveModalValidationError(
    fields: string[],
    message?: string
  ): void {
    this.stockReceiveMissingFields = [...new Set(fields)];
    this.responseColor = 'rgb(238, 16, 16)';
    this.responseMessage =
      message ||
      `Please fill in: ${this.stockReceiveMissingFields.join(', ')}.`;
    this.showDivAddToDataBaseNewStockReceive = true;
  }

  private clearStockReceiveModalValidationError(): void {
    this.stockReceiveMissingFields = [];
    if (this.responseColor === 'rgb(238, 16, 16)' || this.responseColor === '#dc2626') {
      this.showDivAddToDataBaseNewStockReceive = false;
      this.responseMessage = '';
    }
  }

  private patchFormControl(form: NgForm, name: string, value: unknown): void {
    const control = form.controls[name];
    if (!control) {
      return;
    }
    control.setValue(value);
    control.updateValueAndValidity();
  }

  private collectStockReceiveValidationErrors(form: NgForm): string[] {
    const labels: Record<string, string> = {
      stockItemId: 'Stock Item',
      storeId: 'Store',
      supplierId: 'Supplier',
      quantityReceived: 'Quantity Received',
      totalCostPrice: 'Total Cost Price',
      unitCostPrice: 'Unit Cost Price',
      unitSellingPrice: 'Unit Sell',
      profitMarginForRetail: 'Profit margin (retail)',
    };

    const missing = new Set<string>();

    if (!this.currentStockItemId && !this.currentStockReceive.stockItemId) {
      missing.add('Stock Item');
    }
    if (!this.currentStoreId && !this.currentStockReceive.storeId) {
      missing.add('Store');
    }
    if (!this.currentSupplierId && !this.currentStockReceive.supplierId) {
      missing.add('Supplier');
    }

    for (const label of this.collectInvalidFormFieldLabels(form, labels)) {
      missing.add(label);
    }

    const qty = this.toOptionalNumber(this.currentStockReceive.quantityReceived);
    if (qty == null || qty <= 0) {
      missing.add('Quantity Received');
    }

    const totalCost = this.toOptionalNumber(this.currentStockReceive.totalCostPrice);
    if (totalCost == null || totalCost < 0) {
      missing.add('Total Cost Price');
    }

    const unitCost = this.toOptionalNumber(this.currentStockReceive.unitCostPrice);
    if (unitCost == null || unitCost < 0) {
      missing.add('Unit Cost Price');
    }

    const unitSell = this.toOptionalNumber(this.currentStockReceive.unitSellingPrice);
    if (unitSell == null || unitSell <= 0) {
      missing.add('Unit Sell');
    }

    const margin = this.toOptionalNumber(this.profitMarginForRetail);
    if (margin == null || margin <= 0) {
      missing.add('Profit margin (retail)');
    }

    return Array.from(missing);
  }

  private collectInvalidFormFieldLabels(
    form: NgForm,
    labels: Record<string, string>
  ): string[] {
    const missing: string[] = [];
    if (!form?.controls) {
      return missing;
    }
    for (const key of Object.keys(form.controls)) {
      const control = form.controls[key];
      if (control?.invalid) {
        missing.push(labels[key] || this.humanizeFieldName(key));
      }
    }
    return missing;
  }

  private humanizeFieldName(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }
}
