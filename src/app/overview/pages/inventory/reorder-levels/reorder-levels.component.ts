import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { FacilityBrandingService } from '../../../../services/facility-branding.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export type ReorderViewMode = 'needs-reorder' | 'needs-config' | 'all';

@Component({
  selector: 'app-reorder-levels',
  templateUrl: './reorder-levels.component.html',
  styleUrls: ['./reorder-levels.component.css'],
})
export class ReorderLevelsComponent implements OnInit {
  /** All batches for the selected store (source for filters and stats). */
  allBatches: any[] = [];
  page = 1;
  itemsPerPage = 15;
  searchQuery = '';
  selectedColumn = 'all';

  viewMode: ReorderViewMode = 'needs-reorder';

  storeList: any[] = [];
  filteredStoreFilterList: any[] = [];
  storeFilterSearchQuery = '';
  selectedStoreId: number | null = null;
  selectedStoreFilterName = 'All stores';

  isLoadingService = false;
  isSavingReorder = false;
  creatingPurchaseOrder = false;
  responseColor = '';
  responseMessage = '';
  showDivUpdatedOut = false;

  showConfigureModal = false;
  editingBatch: any = null;
  reorderForm = {
    reOrderTo: null as number | null,
    reOrderLevel: null as number | null,
    reOrderQuantity: null as number | null,
  };

  mdUser = false;
  isDarkMode = false;
  inventoryIsStockBatch = true;
  exportDropdownOpen = false;

  @ViewChild('htmlData') htmlData!: ElementRef;

  constructor(
    private router: Router,
    private api: ApiService,
    private themeService: ThemeService,
    private facilityBranding: FacilityBrandingService
  ) {}

  ngOnInit(): void {
    const userRole = sessionStorage.getItem('userrole');
    const username = sessionStorage.getItem('username');

    this.themeService.isDarkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });

    if (userRole === 'md') {
      this.mdUser = true;
    }

    if (username === null) {
      this.router.navigate(['/login']);
    } else if (userRole === 'CUSTOMER') {
      this.router.navigate(['/products']);
    }

    this.facilityBranding.load().subscribe({
      next: () => this.applyInventoryType(),
      error: () => this.applyInventoryType(),
    });
  }

  private applyInventoryType(): void {
    this.inventoryIsStockBatch = this.facilityBranding.getPharmacyUseStockBatch();
    if (this.inventoryIsStockBatch) {
      this.loadStores();
      this.loadBatches();
      return;
    }
    this.loadItems();
  }

  loadStores(): void {
    this.api.getAllStores().subscribe({
      next: (res: any) => {
        this.storeList = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.filterStoreFilters();
      },
      error: () => {
        this.storeList = [];
        this.filteredStoreFilterList = [];
      },
    });
  }

  loadItems(): void {
    this.isLoadingService = true;
    this.api.getAllItems().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.allBatches = raw;
        this.page = 1;
        this.isLoadingService = false;
      },
      error: (err: any) => {
        this.allBatches = [];
        this.isLoadingService = false;
        this.showFeedback(err?.error?.message || 'Could not load items.', '#dc2626');
      },
    });
  }

  loadBatches(): void {
    this.isLoadingService = true;
    this.api.getAllStockBatches(this.selectedStoreId ?? undefined).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.allBatches = raw;
        this.page = 1;
        this.isLoadingService = false;
      },
      error: (err: any) => {
        this.allBatches = [];
        this.isLoadingService = false;
        this.showFeedback(
          err?.error?.message || 'Could not load stock batches.',
          '#dc2626'
        );
      },
    });
  }

  setViewMode(mode: ReorderViewMode): void {
    this.viewMode = mode;
    this.page = 1;
  }

  filterStoreFilters(): void {
    const q = this.storeFilterSearchQuery.toLowerCase().trim();
    this.filteredStoreFilterList = this.storeList.filter((s) => {
      const name = String(s?.name ?? '').toLowerCase();
      const loc = String(s?.location ?? '').toLowerCase();
      return !q || name.includes(q) || loc.includes(q);
    });
  }

  selectStoreFilter(store: any | null): void {
    if (store == null) {
      this.selectedStoreId = null;
      this.selectedStoreFilterName = 'All stores';
    } else {
      const id = store.id ?? store.storeId;
      this.selectedStoreId = id != null ? Number(id) : null;
      this.selectedStoreFilterName = store.name ?? `Store #${id}`;
    }
    this.loadBatches();
  }

  refresh(): void {
    if (this.inventoryIsStockBatch) {
      this.loadBatches();
      return;
    }
    this.loadItems();
  }

  createPurchaseOrder(): void {
    const rows = this.filteredReorderBatches.filter((row) => this.isBatchBelowReorderTo(row) && this.qtyToOrder(row) > 0);
    if (!rows.length) {
      this.showFeedback('No products are below their reorder-to level.', '#b45309');
      return;
    }
    const lines = rows.map((row) => ({
      stockItemId: row?.stockItemId ?? row?.stock_item_id ?? row?.itemId ?? null,
      stockItemName: this.displayStockItemName(row),
      storeName: this.inventoryIsStockBatch ? this.displayStore(row) : null,
      batchNumber: this.inventoryIsStockBatch ? this.displayBatchNumber(row) : null,
      inStock: this.getStockAtHandNumber(row),
      reorderTo: this.getReorderToNumber(row),
      quantityOrdered: this.qtyToOrder(row),
    }));
    this.creatingPurchaseOrder = true;
    this.api.createPurchaseOrder({ lines }).subscribe({
      next: (order: any) => {
        this.creatingPurchaseOrder = false;
        const id = order?.id;
        this.showFeedback(`Purchase order ${order?.orderNo || ''} created.`, 'rgb(11, 155, 112)');
        if (id) {
          this.router.navigate(['/overview/pharmacy-purchase-orders'], { queryParams: { id } });
        }
      },
      error: (err: any) => {
        this.creatingPurchaseOrder = false;
        this.showFeedback(err?.error?.message || 'Could not create the purchase order.', '#dc2626');
      },
    });
  }

  goToStockReceive(): void {
    this.router.navigate([
      this.inventoryIsStockBatch ? '/overview/stock-receive' : '/overview/shop-item-receive',
    ]);
  }

  goToStockBatch(): void {
    this.router.navigate([
      this.inventoryIsStockBatch ? '/overview/stock-batch' : '/overview/shop-item-management',
    ]);
  }

  private getReorderToNumber(b: any): number {
    const v = b?.reOrderTo ?? b?.reorderTo ?? b?.reorder_point ?? b?.reorderPoint;
    if (v === null || v === undefined || v === '') {
      return NaN;
    }
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : NaN;
  }

  private getReorderLevelNumber(b: any): number {
    const v = b?.reOrderLevel ?? b?.reorderLevel;
    if (v === null || v === undefined || v === '') {
      return NaN;
    }
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : NaN;
  }

  private getReorderQtyNumber(b: any): number {
    const v = b?.reOrderQuantity ?? b?.reorderQuantity;
    if (v === null || v === undefined || v === '') {
      return NaN;
    }
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : NaN;
  }

  getStockAtHandNumber(b: any): number {
    const v = b?.stockAtHand ?? b?.stock_at_hand ?? b?.quantityAtHand;
    if (v === null || v === undefined || v === '') {
      return NaN;
    }
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : NaN;
  }

  hasReorderTargetConfigured(b: any): boolean {
    const target = this.getReorderToNumber(b);
    return Number.isFinite(target) && target > 0;
  }

  needsConfiguration(b: any): boolean {
    return !this.hasReorderTargetConfigured(b);
  }

  isBatchBelowReorderTo(b: any): boolean {
    const target = this.getReorderToNumber(b);
    const hand = this.getStockAtHandNumber(b);
    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(hand)) {
      return false;
    }
    return hand < target;
  }

  qtyToOrder(b: any): number {
    const target = this.getReorderToNumber(b);
    const hand = this.getStockAtHandNumber(b);
    if (!Number.isFinite(target) || !Number.isFinite(hand)) {
      return 0;
    }
    const suggested = this.getReorderQtyNumber(b);
    const gap = Math.max(0, target - hand);
    if (Number.isFinite(suggested) && suggested > 0) {
      return Math.max(gap, suggested);
    }
    return gap;
  }

  get batchesBelowReorder(): any[] {
    return this.allBatches.filter((b) => this.isBatchBelowReorderTo(b));
  }

  get batchesNeedingConfig(): any[] {
    return this.allBatches.filter((b) => this.needsConfiguration(b));
  }

  get totalQtyToOrder(): number {
    return this.batchesBelowReorder.reduce((sum, b) => sum + this.qtyToOrder(b), 0);
  }

  get displayedBatches(): any[] {
    switch (this.viewMode) {
      case 'needs-config':
        return this.batchesNeedingConfig;
      case 'all':
        return this.allBatches;
      case 'needs-reorder':
      default:
        return this.batchesBelowReorder;
    }
  }

  get filteredReorderBatches(): any[] {
    const list = this.displayedBatches;
    if (!list?.length || !this.searchQuery?.trim()) {
      return list ?? [];
    }
    const query = this.searchQuery.toLowerCase().trim();
    return list.filter((b) => {
      if (!b) {
        return false;
      }
      const item = this.displayStockItemName(b).toLowerCase();
      const store = this.displayStore(b).toLowerCase();
      const batchNo = String(b?.batchNumber ?? '').toLowerCase();
      const blob = `${item} ${store} ${batchNo} ${this.displayReorderTo(b)} ${this.displayInStock(b)}`;
      if (this.selectedColumn === 'all') {
        return blob.includes(query);
      }
      switch (this.selectedColumn) {
        case 'item':
          return item.includes(query);
        case 'store':
          return this.inventoryIsStockBatch && store.includes(query);
        case 'batch':
          return this.inventoryIsStockBatch && batchNo.includes(query);
        default:
          return blob.includes(query);
      }
    });
  }

  displayStockItemName(b: any): string {
    return (
      b?.stockItemName ??
      b?.stock_item_name ??
      b?.itemName ??
      b?.title ??
      'N/A'
    );
  }

  displayStore(b: any): string {
    return b?.storeName ?? b?.store_name ?? 'N/A';
  }

  displayBatchNumber(b: any): string {
    const n = b?.batchNumber;
    return n != null && String(n).trim() !== '' ? String(n) : `#${b?.id ?? '?'}`;
  }

  displayExpiry(b: any): string {
    const d = b?.expiryDate ?? b?.expiry_date;
    return d == null || d === '' ? 'N/A' : String(d);
  }

  displayReorderTo(b: any): string {
    const n = this.getReorderToNumber(b);
    return Number.isFinite(n) ? String(n) : '—';
  }

  displayReorderLevel(b: any): string {
    const n = this.getReorderLevelNumber(b);
    return Number.isFinite(n) ? String(n) : '—';
  }

  displayReorderQuantity(b: any): string {
    const n = this.getReorderQtyNumber(b);
    return Number.isFinite(n) ? String(n) : '—';
  }

  displayInStock(b: any): string {
    const n = this.getStockAtHandNumber(b);
    return Number.isFinite(n) ? String(n) : 'N/A';
  }

  displayQtyToOrder(b: any): string {
    return this.hasReorderTargetConfigured(b) ? String(this.qtyToOrder(b)) : '—';
  }

  statusClass(b: any): string {
    if (this.needsConfiguration(b)) {
      return 'status-unconfigured';
    }
    if (this.isBatchBelowReorderTo(b)) {
      return 'status-critical';
    }
    return 'status-ok';
  }

  statusLabel(b: any): string {
    if (this.needsConfiguration(b)) {
      return 'Not configured';
    }
    if (this.isBatchBelowReorderTo(b)) {
      return 'Below';
    }
    return 'OK';
  }

  openConfigureModal(batch: any): void {
    this.editingBatch = batch;
    this.reorderForm = {
      reOrderTo: this.parseOptionalInt(
        batch?.reOrderTo ?? batch?.reorderTo ?? batch?.reorderPoint
      ),
      reOrderLevel: this.parseOptionalInt(batch?.reOrderLevel ?? batch?.reorderLevel),
      reOrderQuantity: this.parseOptionalInt(
        batch?.reOrderQuantity ?? batch?.reorderQuantity
      ),
    };
    this.showConfigureModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeConfigureModal(): void {
    this.showConfigureModal = false;
    this.editingBatch = null;
    document.body.style.overflow = 'auto';
  }

  saveReorderSettings(_form: NgForm): void {
    if (!this.editingBatch?.id) {
      return;
    }
    const payload: any = {};
    if (this.reorderForm.reOrderTo != null && this.reorderForm.reOrderTo !== ('' as any)) {
      payload.reOrderTo = Number(this.reorderForm.reOrderTo);
    }
    if (
      this.reorderForm.reOrderLevel != null &&
      this.reorderForm.reOrderLevel !== ('' as any)
    ) {
      payload.reOrderLevel = Number(this.reorderForm.reOrderLevel);
    }
    if (
      this.inventoryIsStockBatch &&
      this.reorderForm.reOrderQuantity != null &&
      this.reorderForm.reOrderQuantity !== ('' as any)
    ) {
      payload.reOrderQuantity = Number(this.reorderForm.reOrderQuantity);
    }

    if (Object.keys(payload).length === 0) {
      this.showFeedback('Enter at least one reorder field.', '#dc2626');
      return;
    }

    this.isSavingReorder = true;
    const request$ = this.inventoryIsStockBatch
      ? this.api.updateStockBatch(this.editingBatch.id, payload)
      : this.api.updateItemById(this.editingBatch.id, this.buildItemReorderPayload(this.editingBatch, payload));
    request$.subscribe({
      next: (res: any) => {
        this.isSavingReorder = false;
        this.showFeedback(res?.message || 'Reorder levels saved.', 'rgb(11, 155, 112)');
        this.closeConfigureModal();
        this.refresh();
      },
      error: (err: any) => {
        this.isSavingReorder = false;
        this.showFeedback(
          err?.error?.message || 'Failed to save reorder settings.',
          '#dc2626'
        );
      },
    });
  }

  private buildItemReorderPayload(item: any, reorder: any): any {
    return {
      title: item?.title ?? '',
      description: item?.description ?? '',
      categoryId: item?.category?.id ?? item?.categoryId ?? null,
      parentCategoryId: item?.parentCategory?.id ?? item?.parentCategoryId ?? item?.category?.parent?.id ?? null,
      subCategory: item?.subCategory ?? item?.category?.name ?? '',
      lastUnitOfMeasure: item?.lastUnitOfMeasure,
      lastUnitValue: item?.lastUnitValue,
      image: item?.image,
      unitOfMeasure: item?.unitOfMeasure,
      costPrice: item?.costPrice,
      sellingPrice: item?.sellingPrice,
      stockAtHand: item?.stockAtHand,
      dosage: item?.dosage,
      dosageUnit: item?.dosageUnit,
      frequency: item?.frequency,
      frequencyUnit: item?.frequencyUnit,
      duration: item?.duration,
      durationUnit: item?.durationUnit,
      route: item?.route,
      reOrderTo: reorder.reOrderTo ?? item?.reOrderTo,
      reOrderLevel: reorder.reOrderLevel ?? item?.reOrderLevel,
    };
  }

  private parseOptionalInt(v: any): number | null {
    if (v === null || v === undefined || v === '') {
      return null;
    }
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : null;
  }

  private showFeedback(message: string, color: string): void {
    this.responseMessage = message;
    this.responseColor = color;
    this.showDivUpdatedOut = true;
    setTimeout(() => {
      this.showDivUpdatedOut = false;
    }, 4000);
  }

  exportToExcel(): void {
    try {
      const rows = this.filteredReorderBatches;
      if (!rows.length) {
        this.showFeedback('No rows to export for the current filter.', '#b45309');
        return;
      }
      const dataToExport = rows.map((b, index) => {
        const row: Record<string, string | number> = {
          SN: index + 1,
          Item: this.displayStockItemName(b),
          'In stock': this.displayInStock(b),
          'Reorder to': this.displayReorderTo(b),
          'Reorder level': this.displayReorderLevel(b),
          'Qty to order': this.displayQtyToOrder(b),
          Status: this.statusLabel(b),
        };
        if (this.inventoryIsStockBatch) {
          row['Store'] = this.displayStore(b);
          row['Batch'] = this.displayBatchNumber(b);
          row['Reorder qty'] = this.displayReorderQuantity(b);
        }
        return row;
      });
      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reorder');
      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `reorder-levels-${stamp}.xlsx`);
      this.exportDropdownOpen = false;
      this.showFeedback(`Exported ${dataToExport.length} row(s) to Excel.`, 'rgb(22, 163, 74)');
    } catch (err: any) {
      this.showFeedback(err?.message || 'Excel export failed.', '#dc2626');
    }
  }

  downloadPdf(): void {
    if (!this.htmlData?.nativeElement) {
      this.showFeedback('PDF export is not ready yet. Try again in a moment.', '#b45309');
      return;
    }
    if (!this.filteredReorderBatches.length) {
      this.showFeedback('No rows to export for the current filter.', '#b45309');
      return;
    }
    html2canvas(this.htmlData.nativeElement).then((canvas) => {
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
      pdf.save('reorder-levels.pdf');
      this.exportDropdownOpen = false;
      this.showFeedback('Exported to PDF.', 'rgb(22, 163, 74)');
    }).catch((err: any) => {
      this.showFeedback(err?.message || 'PDF export failed.', '#dc2626');
    });
  }
}
