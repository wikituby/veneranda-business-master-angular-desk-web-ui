import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  ApiService,
  StockAdjustmentRequestPayload,
  AdjustmentTypeRequestPayload,
} from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { FacilityBrandingService } from '../../../../services/facility-branding.service';

type AdjustmentsTab = 'adjustments' | 'types';

@Component({
  selector: 'app-stock-adjustments',
  templateUrl: './stock-adjustments.component.html',
  styleUrls: ['./stock-adjustments.component.css'],
})
export class StockAdjustmentsComponent implements OnInit {
  isDarkMode = false;
  /** True = stock batches; false = shop products (business setting). */
  inventoryIsStockBatch = true;
  activeTab: AdjustmentsTab = 'adjustments';

  adjustmentsList: any[] = [];
  loadingAdjustments = false;
  adjustmentSearch = '';

  stockBatchList: any[] = [];
  shopItemList: any[] = [];
  adjustmentTypesActive: any[] = [];
  private itemNameById = new Map<number, string>();

  showBatchPicker = false;
  batchPickerSearch = '';

  form: {
    stockBatchId: number | null;
    itemId: number | null;
    adjustmentTypeId: number | null;
    quantityChanged: number | null;
    reason: string;
    date: string;
    doneBy: string;
  } = this.emptyForm();

  submitting = false;
  formMessage = '';
  formError = false;

  typesList: any[] = [];
  loadingTypes = false;
  newType: { name: string; code: string; active: boolean } = {
    name: '',
    code: '',
    active: true,
  };
  typeSaving = false;
  typeMessage = '';
  typeError = false;

  page = 1;
  itemsPerPage = 15;

  constructor(
    private router: Router,
    private api: ApiService,
    private themeService: ThemeService,
    private facilityBranding: FacilityBrandingService
  ) {}

  ngOnInit(): void {
    if (sessionStorage.getItem('username') === null) {
      this.router.navigate(['/login']);
      return;
    }
    this.themeService.isDarkMode$.subscribe((d) => (this.isDarkMode = d));
    const user = sessionStorage.getItem('username') || '';
    this.form.doneBy = user;
    this.loadAdjustmentTypesForForm();
    this.loadAdjustments();
    this.loadAllTypes();
    this.facilityBranding.load().subscribe({
      next: () => this.applyInventoryType(),
      error: () => this.applyInventoryType(),
    });
  }

  private applyInventoryType(): void {
    this.inventoryIsStockBatch = this.facilityBranding.getPharmacyUseStockBatch();
    this.form.stockBatchId = null;
    this.form.itemId = null;
    if (this.inventoryIsStockBatch) {
      this.loadBatches();
      return;
    }
    this.loadItems();
  }

  setTab(tab: AdjustmentsTab): void {
    this.activeTab = tab;
    this.clearFormBanner();
    this.clearTypeBanner();
    if (tab === 'types') {
      this.loadAllTypes();
    }
  }

  clearFormBanner(): void {
    this.formMessage = '';
    this.formError = false;
  }

  clearTypeBanner(): void {
    this.typeMessage = '';
    this.typeError = false;
  }

  loadBatches(): void {
    this.api.getAllStockBatches().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.stockBatchList = raw;
      },
      error: () => {
        this.stockBatchList = [];
      },
    });
  }

  loadItems(): void {
    this.api.getAllItems().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.shopItemList = raw;
        this.itemNameById.clear();
        for (const item of raw) {
          const id = Number(item?.id ?? item?.itemId);
          if (!Number.isFinite(id) || id <= 0) {
            continue;
          }
          this.itemNameById.set(id, this.shopItemLabel(item));
        }
      },
      error: () => {
        this.shopItemList = [];
        this.itemNameById.clear();
      },
    });
  }

  loadAdjustmentTypesForForm(): void {
    this.api.getActiveAdjustmentTypes().subscribe({
      next: (list: any[]) => {
        this.adjustmentTypesActive = Array.isArray(list) ? [...list] : [];
      },
      error: () => {
        this.adjustmentTypesActive = [];
      },
    });
  }

  loadAdjustments(): void {
    this.loadingAdjustments = true;
    this.api.getAllStockAdjustments().subscribe({
      next: (list: any[]) => {
        this.adjustmentsList = Array.isArray(list) ? list : [];
        this.loadingAdjustments = false;
      },
      error: () => {
        this.adjustmentsList = [];
        this.loadingAdjustments = false;
      },
    });
  }

  loadAllTypes(): void {
    this.loadingTypes = true;
    this.api.getAllAdjustmentTypes().subscribe({
      next: (list: any[]) => {
        this.typesList = Array.isArray(list) ? [...list] : [];
        this.loadingTypes = false;
      },
      error: () => {
        this.typesList = [];
        this.loadingTypes = false;
      },
    });
  }

  refreshAll(): void {
    if (this.inventoryIsStockBatch) {
      this.loadBatches();
    } else {
      this.loadItems();
    }
    this.loadAdjustmentTypesForForm();
    this.loadAdjustments();
    this.loadAllTypes();
  }

  get filteredAdjustments(): any[] {
    const q = (this.adjustmentSearch || '').trim().toLowerCase();
    let rows = this.adjustmentsList || [];
    if (!q) {
      return rows;
    }
    return rows.filter((a) => {
      const id = a?.id != null ? String(a.id) : '';
      const bid = a?.stockBatchId != null ? String(a.stockBatchId) : '';
      const iid = a?.itemId != null ? String(a.itemId) : '';
      const target = this.adjustmentTargetLabel(a).toLowerCase();
      const typeName = (a?.adjustmentTypeName || '').toLowerCase();
      const typeCode = (a?.adjustmentTypeCode || '').toLowerCase();
      const reason = (a?.reason || '').toLowerCase();
      const by = (a?.doneBy || '').toLowerCase();
      return (
        id.includes(q) ||
        bid.includes(q) ||
        iid.includes(q) ||
        target.includes(q) ||
        typeName.includes(q) ||
        typeCode.includes(q) ||
        reason.includes(q) ||
        by.includes(q)
      );
    });
  }

  openBatchPicker(): void {
    this.batchPickerSearch = '';
    this.showBatchPicker = true;
  }

  closeBatchPicker(): void {
    this.showBatchPicker = false;
    this.batchPickerSearch = '';
  }

  onBatchPickerBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeBatchPicker();
    }
  }

  selectStockBatch(row: any): void {
    const id = Number(row?.id ?? row?.itemId);
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }
    if (this.inventoryIsStockBatch) {
      this.form.stockBatchId = id;
      this.form.itemId = null;
    } else {
      this.form.itemId = id;
      this.form.stockBatchId = null;
    }
    this.closeBatchPicker();
  }

  get selectedBatchSummary(): string {
    if (this.inventoryIsStockBatch) {
      const id = this.form.stockBatchId;
      if (id == null) {
        return '';
      }
      const batch = this.stockBatchList.find((b) => Number(b.id) === Number(id));
      return batch ? this.getStockBatchOptionLabel(batch) : `Batch #${id}`;
    }
    const id = this.form.itemId;
    if (id == null) {
      return '';
    }
    const item = this.shopItemList.find((i) => Number(i.id ?? i.itemId) === Number(id));
    return item ? this.getShopItemOptionLabel(item) : `Item #${id}`;
  }

  get pickerTitle(): string {
    return this.inventoryIsStockBatch ? 'Select stock batch' : 'Select item';
  }

  get pickerEmptyLabel(): string {
    return this.inventoryIsStockBatch ? 'No batches match.' : 'No items match.';
  }

  get pickerPlaceholder(): string {
    return this.inventoryIsStockBatch ? 'Choose stock batch…' : 'Choose item…';
  }

  get filteredStockBatchesForPicker(): any[] {
    const q = (this.batchPickerSearch || '').trim().toLowerCase();
    const list = this.inventoryIsStockBatch ? this.stockBatchList || [] : this.shopItemList || [];
    if (!q) {
      return list;
    }
    return list.filter((row) => {
      const label = this.inventoryIsStockBatch
        ? this.getStockBatchOptionLabel(row)
        : this.getShopItemOptionLabel(row);
      const idStr = String(row.id ?? row.itemId ?? '');
      const extra = this.inventoryIsStockBatch
        ? `${row.batchNumber ?? ''} ${row.stockItemName ?? ''}`
        : `${row.title ?? ''} ${row.name ?? ''}`;
      return `${label} ${idStr} ${extra}`.toLowerCase().includes(q);
    });
  }

  trackBatchById(_index: number, row: any): any {
    return row?.id ?? row?.itemId;
  }

  getStockBatchOptionLabel(batch: any): string {
    if (!batch) {
      return '';
    }
    const name = batch.stockItemName || 'Unknown item';
    const hasBatchNo = batch.batchNumber != null && String(batch.batchNumber).trim() !== '';
    const batchPart = hasBatchNo ? `Batch ${batch.batchNumber}` : `Batch #${batch.id ?? '?'}`;
    const exp = this.formatExpiryDate(batch.expiryDate);
    const expPart = exp ? ` · Exp: ${exp}` : '';
    const store =
      batch.storeName != null && String(batch.storeName).trim() !== ''
        ? String(batch.storeName).trim()
        : '';
    const storePart = store ? ` · Store: ${store}` : '';
    const hand = this.formatStockAtHandDisplay(batch.stockAtHand ?? batch.stock_at_hand);
    const handPart = hand !== '' ? ` · On hand: ${hand}` : '';
    return `${name} — ${batchPart}${expPart}${storePart}${handPart}`;
  }

  getShopItemOptionLabel(item: any): string {
    if (!item) {
      return '';
    }
    const name = this.shopItemLabel(item);
    const hand = this.formatStockAtHandDisplay(item.stockAtHand ?? item.stock_at_hand);
    const uom = item.unitOfMeasure ? String(item.unitOfMeasure).toUpperCase() : '';
    const handPart = hand !== '' ? ` · On hand: ${hand}${uom ? ' ' + uom : ''}` : '';
    return `${name}${handPart}`;
  }

  pickerRowLabel(row: any): string {
    return this.inventoryIsStockBatch
      ? this.getStockBatchOptionLabel(row)
      : this.getShopItemOptionLabel(row);
  }

  shopItemLabel(item: any): string {
    return String(item?.title || item?.name || item?.itemName || `Item #${item?.id ?? item?.itemId ?? '?'}`);
  }

  adjustmentTargetLabel(row: any): string {
    if (!this.inventoryIsStockBatch) {
      const id = Number(row?.itemId ?? row?.shopItemId);
      if (Number.isFinite(id) && id > 0 && this.itemNameById.has(id)) {
        return this.itemNameById.get(id) as string;
      }
      return (
        row?.itemName ||
        row?.itemTitle ||
        row?.title ||
        (id > 0 ? `Item #${id}` : '—')
      );
    }
    return row?.stockBatchId != null ? String(row.stockBatchId) : 'N/A';
  }

  formatStockAtHandDisplay(value: any): string {
    if (value == null || value === '') {
      return '';
    }
    const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
    if (!Number.isFinite(n)) {
      return String(value);
    }
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9) {
      return String(Math.round(n));
    }
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  formatExpiryDate(value: any): string {
    if (value == null || value === '') {
      return '';
    }
    if (Array.isArray(value) && value.length >= 3) {
      const y = value[0];
      const m = Number(value[1]);
      const d = Number(value[2]);
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return String(value);
  }

  formatAdjustmentDate(value: any): string {
    if (value == null || value === '') {
      return 'N/A';
    }
    if (Array.isArray(value) && value.length >= 3) {
      const y = value[0];
      const mo = Number(value[1]);
      const d = Number(value[2]);
      const h = value.length > 3 ? Number(value[3]) : 0;
      const mi = value.length > 4 ? Number(value[4]) : 0;
      const dt = new Date(y, mo - 1, d, h, mi);
      return Number.isNaN(dt.getTime()) ? String(value) : dt.toLocaleString();
    }
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? String(value) : dt.toLocaleString();
  }

  formatQty(value: any): string {
    if (value == null || value === '') {
      return 'N/A';
    }
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? String(n) : String(value);
  }

  submitAdjustment(): void {
    this.clearFormBanner();
    const targetId = this.inventoryIsStockBatch ? this.form.stockBatchId : this.form.itemId;
    if (
      targetId == null ||
      this.form.adjustmentTypeId == null ||
      this.form.quantityChanged == null ||
      Number.isNaN(Number(this.form.quantityChanged))
    ) {
      this.formError = true;
      this.formMessage = this.inventoryIsStockBatch
        ? 'Please select a stock batch, adjustment type, and a valid quantity change.'
        : 'Please select an item, adjustment type, and a valid quantity change.';
      return;
    }

    const qtyChange = Number(this.form.quantityChanged);
    if (!this.inventoryIsStockBatch) {
      const item = this.shopItemList.find(
        (i) => Number(i.id ?? i.itemId) === Number(this.form.itemId)
      );
      const current = Number(item?.stockAtHand ?? 0);
      if (Number.isFinite(current) && current + qtyChange < 0) {
        this.formError = true;
        this.formMessage = `Quantity change would make stock negative (on hand ${current}).`;
        return;
      }
    }

    const payload: StockAdjustmentRequestPayload = {
      adjustmentTypeId: Number(this.form.adjustmentTypeId),
      quantityChanged: qtyChange,
      reason: this.form.reason?.trim() || undefined,
      date: this.form.date?.trim() || undefined,
      doneBy: this.form.doneBy?.trim() || undefined,
    };
    if (this.inventoryIsStockBatch) {
      payload.stockBatchId = Number(this.form.stockBatchId);
    } else {
      payload.itemId = Number(this.form.itemId);
    }

    this.submitting = true;
    if (this.inventoryIsStockBatch) {
      this.api.addStockAdjustment(payload).subscribe({
        next: () => this.onAdjustmentSaved(),
        error: (err: any) => this.onAdjustmentError(err),
      });
      return;
    }

    this.applyShopItemStockChange(Number(this.form.itemId), qtyChange, () => {
      this.api.addStockAdjustment(payload).subscribe({
        next: () => this.onAdjustmentSaved(),
        error: () =>
          this.onAdjustmentSaved(
            'Stock on hand updated. Adjustment history could not be recorded on the server.'
          ),
      });
    });
  }

  private applyShopItemStockChange(
    itemId: number,
    qtyChange: number,
    onDone: () => void
  ): void {
    const item = this.shopItemList.find((i) => Number(i.id ?? i.itemId) === Number(itemId));
    if (!item) {
      this.submitting = false;
      this.formError = true;
      this.formMessage = 'Selected item was not found. Refresh and try again.';
      return;
    }
    const current = Number(item.stockAtHand ?? 0);
    const next = (Number.isFinite(current) ? current : 0) + qtyChange;
    this.api.updateItemById(item.id ?? item.itemId, this.buildShopItemPayload(item, next)).subscribe({
      next: () => onDone(),
      error: (err: any) => this.onAdjustmentError(err),
    });
  }

  private buildShopItemPayload(item: any, stockAtHand: number): any {
    return {
      title: item?.title ?? '',
      description: item?.description ?? '',
      categoryId: item?.category?.id ?? item?.categoryId ?? null,
      parentCategoryId:
        item?.parentCategory?.id ?? item?.parentCategoryId ?? item?.category?.parent?.id ?? null,
      subCategory: item?.subCategory ?? item?.category?.name ?? '',
      lastUnitOfMeasure: item?.lastUnitOfMeasure,
      lastUnitValue: item?.lastUnitValue,
      image: item?.image,
      unitOfMeasure: item?.unitOfMeasure,
      costPrice: item?.costPrice,
      sellingPrice: item?.sellingPrice,
      stockAtHand,
      dosage: item?.dosage,
      dosageUnit: item?.dosageUnit,
      frequency: item?.frequency,
      frequencyUnit: item?.frequencyUnit,
      duration: item?.duration,
      durationUnit: item?.durationUnit,
      route: item?.route,
      reOrderTo: item?.reOrderTo,
      reOrderLevel: item?.reOrderLevel,
    };
  }

  private onAdjustmentSaved(message?: string): void {
    this.submitting = false;
    this.formError = false;
    this.formMessage = message || 'Stock adjustment recorded successfully.';
    const user = sessionStorage.getItem('username') || '';
    this.form = this.emptyForm();
    this.form.doneBy = user;
    this.loadAdjustments();
    if (this.inventoryIsStockBatch) {
      this.loadBatches();
    } else {
      this.loadItems();
    }
  }

  private onAdjustmentError(err: any): void {
    this.submitting = false;
    this.formError = true;
    const msg =
      err?.error?.message || err?.error?.data || err?.message || 'Failed to record adjustment.';
    this.formMessage = typeof msg === 'string' ? msg : JSON.stringify(msg);
  }

  private emptyForm() {
    return {
      stockBatchId: null as number | null,
      itemId: null as number | null,
      adjustmentTypeId: null as number | null,
      quantityChanged: null as number | null,
      reason: '',
      date: '',
      doneBy: '',
    };
  }

  addNewType(): void {
    this.clearTypeBanner();
    const name = (this.newType.name || '').trim();
    const code = (this.newType.code || '').trim();
    if (!name || !code) {
      this.typeError = true;
      this.typeMessage = 'Name and code are required.';
      return;
    }
    const body: AdjustmentTypeRequestPayload = {
      name,
      code,
      active: this.newType.active,
    };
    this.typeSaving = true;
    this.api.addAdjustmentType(body).subscribe({
      next: () => {
        this.typeSaving = false;
        this.typeError = false;
        this.typeMessage = 'Adjustment type created.';
        this.newType = { name: '', code: '', active: true };
        this.loadAllTypes();
        this.loadAdjustmentTypesForForm();
      },
      error: (err: any) => {
        this.typeSaving = false;
        this.typeError = true;
        const msg = err?.error?.message || err?.message || 'Failed to create type.';
        this.typeMessage = typeof msg === 'string' ? msg : JSON.stringify(msg);
      },
    });
  }

  toggleTypeActive(t: any): void {
    if (t?.id == null) {
      return;
    }
    const next = !Boolean(t.active);
    this.api.updateAdjustmentType(Number(t.id), { active: next }).subscribe({
      next: () => {
        this.loadAllTypes();
        this.loadAdjustmentTypesForForm();
      },
      error: (err: any) => {
        this.typeError = true;
        this.typeMessage = err?.error?.message || err?.message || 'Failed to update type.';
      },
    });
  }

  deleteType(t: any): void {
    if (t?.id == null) {
      return;
    }
    if (!confirm(`Delete adjustment type "${t.name}"? Only allowed if unused.`)) {
      return;
    }
    this.api.deleteAdjustmentType(Number(t.id)).subscribe({
      next: () => {
        this.typeMessage = 'Type deleted.';
        this.typeError = false;
        this.loadAllTypes();
        this.loadAdjustmentTypesForForm();
      },
      error: (err: any) => {
        this.typeError = true;
        this.typeMessage = err?.error?.message || err?.message || 'Failed to delete type.';
      },
    });
  }
}
