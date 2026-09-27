import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { FacilityBrandingService } from '../../../../services/facility-branding.service';

interface PendingItem {
  stockBatchId?: number | null;
  stockItemId?: number | null;
  itemId?: number | null;
  itemName?: string;
  storeId?: number | null;
  storeName?: string;
  batchNumber?: string;
  currentStockAtHand?: number;
  draftQuantity?: number | null;
  draftId?: number | null;
}

@Component({
  selector: 'app-stock-initializer',
  templateUrl: './stock-initializer.component.html',
  styleUrls: ['./stock-initializer.component.css']
})
export class StockInitializerComponent implements OnInit {
  isDarkMode = false;
  isLoading = false;
  isSaving = false;
  isFinalizing = false;
  responseMessage = '';
  responseError = '';

  inventoryIsStockBatch = true;
  stores: any[] = [];
  selectedStoreId: number | null = null;

  pendingItems: PendingItem[] = [];
  initializedItems: any[] = [];
  pendingCount = 0;
  initializedCount = 0;

  itemSearch = '';
  isItemDropdownOpen = false;
  selectedItem: PendingItem | null = null;
  initialStock: number | null = null;

  showConfirmModal = false;

  private userId: number | null = null;
  private username = '';

  constructor(
    private router: Router,
    private api: ApiService,
    private themeService: ThemeService,
    private facilityBranding: FacilityBrandingService
  ) {}

  ngOnInit(): void {
    this.username = sessionStorage.getItem('username') || '';
    if (!this.username) {
      this.router.navigate(['/login']);
      return;
    }
    try {
      const details = JSON.parse(sessionStorage.getItem('userDetails') || '{}');
      const id = Number(details?.id);
      if (Number.isFinite(id) && id > 0) this.userId = id;
    } catch { /* ignore */ }

    this.themeService.isDarkMode$.subscribe(v => (this.isDarkMode = v));
    this.facilityBranding.load().subscribe({
      next: () => {
        this.inventoryIsStockBatch = this.facilityBranding.getPharmacyUseStockBatch();
        this.loadStores();
        this.loadDashboard();
      },
      error: () => {
        this.inventoryIsStockBatch = this.facilityBranding.getPharmacyUseStockBatch();
        this.loadStores();
        this.loadDashboard();
      }
    });
  }

  get filteredPendingItems(): PendingItem[] {
    const q = this.itemSearch.trim().toLowerCase();
    if (!q) return this.pendingItems;
    return this.pendingItems.filter(item => {
      const label = this.itemLabel(item).toLowerCase();
      return label.includes(q);
    });
  }

  get modeLabel(): string {
    return this.inventoryIsStockBatch ? 'Stock batches' : 'Shop products';
  }

  itemLabel(item: PendingItem): string {
    const name = item.itemName || 'Unknown item';
    if (this.inventoryIsStockBatch) {
      const parts = [name];
      if (item.storeName) parts.push(item.storeName);
      if (item.batchNumber) parts.push(`Batch ${item.batchNumber}`);
      else if (item.stockBatchId) parts.push(`Batch #${item.stockBatchId}`);
      return parts.join(' · ');
    }
    return name;
  }

  itemKey(item: PendingItem): string {
    if (this.inventoryIsStockBatch) {
      return item.stockBatchId != null
        ? `batch:${item.stockBatchId}`
        : `catalog:${item.stockItemId}:${item.storeId}`;
    }
    return `shop:${item.itemId}`;
  }

  loadStores(): void {
    if (!this.inventoryIsStockBatch) return;
    this.api.getAllStores().subscribe({
      next: (res: any) => {
        this.stores = Array.isArray(res) ? res : (res?.data ?? []);
      },
      error: () => { this.stores = []; }
    });
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.responseMessage = '';
    this.responseError = '';
    this.api.getStockInitializerDashboard(this.selectedStoreId ?? undefined).subscribe({
      next: (data: any) => {
        this.inventoryIsStockBatch = data?.useStockBatch !== false;
        this.pendingItems = Array.isArray(data?.pending) ? data.pending : [];
        this.initializedItems = Array.isArray(data?.initialized) ? data.initialized : [];
        this.pendingCount = Number(data?.pendingCount ?? this.pendingItems.length);
        this.initializedCount = Number(data?.initializedCount ?? this.initializedItems.length);
        this.isLoading = false;
        if (this.selectedItem) {
          const key = this.itemKey(this.selectedItem);
          const stillPending = this.pendingItems.find(p => this.itemKey(p) === key);
          if (stillPending) {
            this.selectItem(stillPending);
          } else {
            this.clearSelection();
          }
        }
      },
      error: () => {
        this.isLoading = false;
        this.responseError = 'Failed to load stock initializer dashboard.';
      }
    });
  }

  toggleItemDropdown(): void {
    this.isItemDropdownOpen = !this.isItemDropdownOpen;
  }

  selectItem(item: PendingItem): void {
    this.selectedItem = item;
    this.initialStock = item.draftQuantity != null ? Number(item.draftQuantity) : null;
    this.isItemDropdownOpen = false;
    this.itemSearch = this.itemLabel(item);
    this.responseMessage = '';
    this.responseError = '';
  }

  clearSelection(): void {
    this.selectedItem = null;
    this.initialStock = null;
    this.itemSearch = '';
    this.isItemDropdownOpen = false;
  }

  onItemSearchInput(): void {
    this.isItemDropdownOpen = true;
    if (this.selectedItem && this.itemSearch !== this.itemLabel(this.selectedItem)) {
      this.selectedItem = null;
    }
  }

  private buildPayload(): any | null {
    if (!this.selectedItem || this.initialStock == null || this.initialStock < 0) {
      this.responseError = 'Select an item and enter a valid initial stock quantity.';
      return null;
    }
    const body: any = {
      quantity: this.initialStock,
      performedByUserId: this.userId,
      performedByUserName: this.username
    };
    if (this.inventoryIsStockBatch) {
      if (this.selectedItem.stockBatchId != null) {
        body.stockBatchId = this.selectedItem.stockBatchId;
      } else {
        body.stockItemId = this.selectedItem.stockItemId;
        body.storeId = this.selectedItem.storeId;
      }
    } else {
      body.itemId = this.selectedItem.itemId;
    }
    return body;
  }

  saveDraft(): void {
    const body = this.buildPayload();
    if (!body) return;
    this.isSaving = true;
    this.responseMessage = '';
    this.responseError = '';
    this.api.saveStockInitializerDraft(body).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.responseMessage = res?.message || 'Draft quantity saved.';
        this.loadDashboard();
      },
      error: (err) => {
        this.isSaving = false;
        this.responseError = err?.error?.message || 'Failed to save draft.';
      }
    });
  }

  openFinalizeConfirm(): void {
    if (!this.buildPayload()) return;
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
  }

  finalizeInitialization(): void {
    const body = this.buildPayload();
    if (!body) return;
    this.isFinalizing = true;
    this.responseMessage = '';
    this.responseError = '';
    this.api.finalizeStockInitializer(body).subscribe({
      next: (res: any) => {
        this.isFinalizing = false;
        this.showConfirmModal = false;
        this.responseMessage = res?.message || 'Stock counted and initialized.';
        this.clearSelection();
        this.loadDashboard();
      },
      error: (err) => {
        this.isFinalizing = false;
        this.showConfirmModal = false;
        this.responseError = err?.error?.message || 'Failed to initialize stock.';
      }
    });
  }
}
