import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { FacilityBrandingService } from '../../../../services/facility-branding.service';
import { Router } from '@angular/router';

type ExpiredItemsTab = 'expired-list' | 'expired-register';

@Component({
  selector: 'app-expired-items',
  templateUrl: './expired-items.component.html',
  styleUrls: ['./expired-items.component.css'],
})
export class ExpiredItemsComponent implements OnInit {
  isDarkMode = false;
  /** True = stock batches; false = shop products (business setting). */
  inventoryIsStockBatch = true;
  isLoading = false;
  expiredBatches: any[] = [];
  searchQuery = '';
  shopItemList: any[] = [];

  activeTab: ExpiredItemsTab = 'expired-list';
  registerList: any[] = [];
  loadingRegister = false;
  registerSearchQuery = '';
  registerFeedback: string | null = null;
  registerFeedbackError = false;
  registeringBatchId: number | null = null;

  private stockItemNameById = new Map<number, string>();

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
    this.loadRegister();
    this.facilityBranding.load().subscribe({
      next: () => this.applyInventoryType(),
      error: () => this.applyInventoryType(),
    });
  }

  private applyInventoryType(): void {
    this.inventoryIsStockBatch = this.facilityBranding.getPharmacyUseStockBatch();
    this.loadStockItemNames();
    this.loadData();
  }

  loadStockItemNames(): void {
    const request$ = this.inventoryIsStockBatch
      ? this.api.getAllStockItems()
      : this.api.getAllItems();
    request$.subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.shopItemList = this.inventoryIsStockBatch ? this.shopItemList : raw;
        this.stockItemNameById.clear();
        for (const si of raw) {
          const id = Number(si?.id ?? si?.itemId);
          if (!Number.isFinite(id) || id <= 0) {
            continue;
          }
          const label =
            si.stockItemName ||
            si.itemName ||
            si.name ||
            si.genericName ||
            si.title ||
            `Item #${id}`;
          this.stockItemNameById.set(id, String(label));
        }
      },
      error: () => this.stockItemNameById.clear(),
    });
  }

  setTab(tab: ExpiredItemsTab): void {
    this.activeTab = tab;
    this.clearRegisterFeedback();
    if (tab === 'expired-register') {
      this.loadRegister();
    }
  }

  clearRegisterFeedback(): void {
    this.registerFeedback = null;
    this.registerFeedbackError = false;
  }

  loadData(): void {
    this.isLoading = true;
    if (this.inventoryIsStockBatch) {
      this.loadExpiredBatches();
      return;
    }
    this.loadExpiredShopReceives();
  }

  private loadExpiredBatches(): void {
    this.api.getAllStockBatches().subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : [];
        this.expiredBatches = this.sortExpired(
          list.filter((b: any) => this.isBatchExpired(b) && this.hasPositiveStock(b))
        );
        this.isLoading = false;
      },
      error: () => {
        this.expiredBatches = [];
        this.isLoading = false;
      },
    });
  }

  private loadExpiredShopReceives(): void {
    forkJoin({
      items: this.api.getAllItems().pipe(catchError(() => of([]))),
      receives: this.api.getAllStockReceived().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ items, receives }) => {
        const itemList: any[] = Array.isArray(items)
          ? items
          : Array.isArray((items as any)?.data)
            ? (items as any).data
            : [];
        const receiveList: any[] = Array.isArray(receives)
          ? receives
          : Array.isArray((receives as any)?.data)
            ? (receives as any).data
            : [];
        this.shopItemList = itemList;
        this.stockItemNameById.clear();
        for (const si of itemList) {
          const id = Number(si?.id ?? si?.itemId);
          if (Number.isFinite(id) && id > 0) {
            this.stockItemNameById.set(
              id,
              String(si.title || si.name || si.itemName || `Item #${id}`)
            );
          }
        }

        const rows = receiveList
          .map((stock: any) => this.normalizeShopReceiveRow(stock, itemList))
          .filter((row: any) => this.isBatchExpired(row) && this.hasPositiveStock(row));
        this.expiredBatches = this.sortExpired(rows);
        this.isLoading = false;
      },
      error: () => {
        this.expiredBatches = [];
        this.isLoading = false;
      },
    });
  }

  private normalizeShopReceiveRow(stock: any, items: any[]): any {
    const itemId = Number(stock?.itemId ?? stock?.item?.id ?? stock?.shopItemId);
    const item = items.find((it) => Number(it.id ?? it.itemId) === itemId);
    const qty =
      stock?.quantityAvailable ??
      stock?.newQuantity ??
      stock?.stockAtHand ??
      stock?.quantityReceived;
    return {
      ...stock,
      _shopItem: item || null,
      _isShopReceive: true,
      itemId: Number.isFinite(itemId) ? itemId : null,
      stockItemId: Number.isFinite(itemId) ? itemId : stock?.stockItemId,
      stockItemName:
        item?.title ||
        item?.name ||
        stock?.title ||
        stock?.itemTitle ||
        stock?.itemName,
      batchNumber: stock?.brand || stock?.batchNumber || stock?.batch || null,
      storeName: stock?.store || stock?.storeName || null,
      stockAtHand: qty,
    };
  }

  private sortExpired(list: any[]): any[] {
    return list.slice().sort((a: any, b: any) => {
      const da = this.parseExpiryDate(a?.expiryDate)?.getTime() ?? 0;
      const db = this.parseExpiryDate(b?.expiryDate)?.getTime() ?? 0;
      return da - db;
    });
  }

  loadRegister(): void {
    this.loadingRegister = true;
    this.api.getAllExpiryItemRegisters().subscribe({
      next: (rows: any[]) => {
        this.registerList = Array.isArray(rows) ? rows : [];
        this.loadingRegister = false;
      },
      error: () => {
        this.registerList = [];
        this.loadingRegister = false;
      },
    });
  }

  getStockItemIdFromBatch(batch: any): number | null {
    const v =
      batch?.itemId ??
      batch?.stockItemId ??
      batch?.stockItem?.id ??
      batch?.item?.id ??
      batch?.consumableItemId ??
      (!this.inventoryIsStockBatch ? batch?.id : null);
    if (v == null || v === '') {
      return null;
    }
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }

  buildRegisterPayload(batch: any): {
    stockItemId?: number | null;
    itemId?: number | null;
    batchNumber: string | null;
    stockAtHand: number | null;
    expiryDate: string | null;
    removedBy: string | null;
  } | null {
    const stockItemId = this.getStockItemIdFromBatch(batch);
    if (stockItemId == null) {
      return null;
    }
    const qtyRaw = this.getNumericStockAtHand(batch);
    const exp = this.parseExpiryDate(batch?.expiryDate);
    const expiryDate = exp ? this.formatDateYmd(exp) : null;
    const batchNumber =
      batch?.batchNumber != null && String(batch.batchNumber).trim() !== ''
        ? String(batch.batchNumber).trim()
        : batch?.brand
          ? String(batch.brand)
          : batch?.id != null
            ? this.inventoryIsStockBatch
              ? `BATCH-${batch.id}`
              : `RECV-${batch.id}`
            : null;
    const removedBy = sessionStorage.getItem('username') || null;
    const payload: any = {
      batchNumber,
      stockAtHand: qtyRaw,
      expiryDate,
      removedBy,
    };
    if (this.inventoryIsStockBatch) {
      payload.stockItemId = stockItemId;
    } else {
      payload.itemId = stockItemId;
      payload.stockItemId = stockItemId;
    }
    return payload;
  }

  registerBatch(batch: any): void {
    if (batch?.id == null || this.registeringBatchId != null) {
      return;
    }
    const payload = this.buildRegisterPayload(batch);
    if (!payload) {
      this.registerFeedback = this.inventoryIsStockBatch
        ? 'Cannot register: missing stock item id on this batch.'
        : 'Cannot register: missing item id on this receive.';
      this.registerFeedbackError = true;
      return;
    }
    this.clearRegisterFeedback();
    const batchId = Number(batch.id);
    this.registeringBatchId = batchId;
    this.api.addExpiryItemRegister(payload).subscribe({
      next: (regRes: any) => {
        if (this.inventoryIsStockBatch) {
          this.zeroBatchStock(batchId, regRes);
          return;
        }
        this.zeroShopItemStock(batch, batchId, regRes);
      },
      error: (err: any) => {
        this.registeringBatchId = null;
        this.registerFeedback =
          err?.error?.message || err?.message || 'Failed to add to expiry register.';
        this.registerFeedbackError = true;
      },
    });
  }

  private zeroBatchStock(batchId: number, regRes: any): void {
    this.api.updateStockBatch(batchId, { stockAtHand: 0 }).subscribe({
      next: () => {
        this.registeringBatchId = null;
        this.registerFeedback =
          regRes?.message || 'Registered in expiry log and batch stock set to zero.';
        this.registerFeedbackError = false;
        this.removeExpiredRow(batchId);
        this.loadRegister();
      },
      error: (updErr: any) => {
        this.registeringBatchId = null;
        this.registerFeedback =
          (regRes?.message || 'Saved to expiry register.') +
          ' Could not set batch stock to zero — ' +
          (updErr?.error?.message || 'open Stock Batch and set quantity to 0.');
        this.registerFeedbackError = true;
        this.loadRegister();
        this.loadData();
      },
    });
  }

  private zeroShopItemStock(row: any, receiveId: number, regRes: any): void {
    const itemId = this.getStockItemIdFromBatch(row);
    const item =
      row?._shopItem ||
      this.shopItemList.find((i) => Number(i.id ?? i.itemId) === Number(itemId));
    const qty = this.getNumericStockAtHand(row) ?? 0;
    const finish = (message: string, isError: boolean) => {
      this.registeringBatchId = null;
      this.registerFeedback = message;
      this.registerFeedbackError = isError;
      this.removeExpiredRow(receiveId);
      this.loadRegister();
    };

    const afterStockUpdated = () => {
      this.api.deleteStockReceivedById(receiveId).subscribe({
        next: () =>
          finish(
            regRes?.message || 'Registered in expiry log and item stock reduced.',
            false
          ),
        error: () =>
          finish(
            (regRes?.message || 'Registered in expiry log and item stock reduced.') +
              ' Could not remove the receive row — refresh if it still appears.',
            true
          ),
      });
    };

    if (!item || itemId == null) {
      afterStockUpdated();
      return;
    }
    const current = Number(item.stockAtHand ?? 0);
    const next = Math.max(0, (Number.isFinite(current) ? current : 0) - (qty || 0));
    this.api.updateItemById(item.id ?? item.itemId, this.buildShopItemPayload(item, next)).subscribe({
      next: () => afterStockUpdated(),
      error: (updErr: any) =>
        finish(
          (regRes?.message || 'Saved to expiry register.') +
            ' Could not update item stock — ' +
            (updErr?.error?.message || 'open Shop products and set quantity to 0.'),
          true
        ),
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

  private removeExpiredRow(id: number): void {
    this.expiredBatches = this.expiredBatches.filter((b: any) => Number(b?.id) !== Number(id));
  }

  isRegistering(batch: any): boolean {
    return batch?.id != null && Number(batch.id) === Number(this.registeringBatchId);
  }

  formatDateYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  isBatchExpired(batch: any): boolean {
    const d = this.parseExpiryDate(batch?.expiryDate);
    if (!d) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return exp < today;
  }

  getNumericStockAtHand(batch: any): number | null {
    const q =
      batch?.stockAtHand ??
      batch?.stock_at_hand ??
      batch?.quantityOnHand ??
      batch?.quantityAvailable ??
      batch?.newQuantity;
    if (q == null || q === '') {
      return null;
    }
    const n = typeof q === 'number' ? q : parseFloat(String(q).replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  hasPositiveStock(batch: any): boolean {
    const n = this.getNumericStockAtHand(batch);
    return n != null && n > 0;
  }

  parseExpiryDate(value: any): Date | null {
    if (value == null || value === '') {
      return null;
    }
    if (Array.isArray(value) && value.length >= 3) {
      const y = Number(value[0]);
      const m = Number(value[1]);
      const day = Number(value[2]);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) {
        return null;
      }
      const monthIdx = m >= 1 && m <= 12 ? m - 1 : m;
      return new Date(y, monthIdx, day);
    }
    if (typeof value === 'string') {
      const normalized = value.replace(/\//g, '-').substring(0, 10);
      const d = new Date(normalized);
      if (!Number.isNaN(d.getTime())) {
        return d;
      }
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  formatExpiry(value: any): string {
    const d = this.parseExpiryDate(value);
    if (!d) {
      return 'N/A';
    }
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  parseApiDateTime(value: any): Date | null {
    if (value == null || value === '') {
      return null;
    }
    if (Array.isArray(value) && value.length >= 3) {
      const y = Number(value[0]);
      const mo = Number(value[1]);
      const day = Number(value[2]);
      const h = value.length >= 4 ? Number(value[3]) : 0;
      const mi = value.length >= 5 ? Number(value[4]) : 0;
      const s = value.length >= 6 ? Number(value[5]) : 0;
      const monthIdx = mo >= 1 && mo <= 12 ? mo - 1 : mo;
      const d = new Date(y, monthIdx, day, h, mi, s);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  formatRegisterRemoval(row: any): string {
    const d = this.parseApiDateTime(row?.dateOfStockRemoval);
    if (!d) {
      return row?.dateOfStockRemoval != null ? String(row.dateOfStockRemoval) : 'N/A';
    }
    return d.toLocaleString();
  }

  formatRegisterExpiryCell(row: any): string {
    const d = this.parseExpiryDate(row?.expiryDate);
    if (!d) {
      return row?.expiryDate != null ? String(row.expiryDate) : 'N/A';
    }
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  registerItemLabel(row: any): string {
    const id = row?.itemId ?? row?.stockItemId;
    if (id == null) {
      return 'N/A';
    }
    return this.stockItemNameById.get(Number(id)) ?? `Item #${id}`;
  }

  get filteredRows(): any[] {
    const q = (this.searchQuery || '').trim().toLowerCase();
    if (!q) {
      return this.expiredBatches;
    }
    return this.expiredBatches.filter((b: any) => {
      const name = this.itemLabel(b).toLowerCase();
      const batchNo = (b.batchNumber != null ? String(b.batchNumber) : '').toLowerCase();
      const store = (b.storeName || b.store || '').toLowerCase();
      const id = String(b.id ?? '');
      return name.includes(q) || batchNo.includes(q) || store.includes(q) || id.includes(q);
    });
  }

  get filteredRegisterRows(): any[] {
    const q = (this.registerSearchQuery || '').trim().toLowerCase();
    if (!q) {
      return this.registerList;
    }
    return this.registerList.filter((r: any) => {
      const id = String(r.id ?? '');
      const sid = String(r.stockItemId ?? r.itemId ?? '');
      const bn = (r.batchNumber || '').toLowerCase();
      const rb = (r.removedBy || '').toLowerCase();
      const name = this.registerItemLabel(r).toLowerCase();
      return id.includes(q) || sid.includes(q) || bn.includes(q) || rb.includes(q) || name.includes(q);
    });
  }

  itemLabel(batch: any): string {
    return (
      batch?.stockItemName ||
      batch?.itemName ||
      batch?.title ||
      batch?.itemTitle ||
      this.stockItemNameById.get(Number(batch?.itemId ?? batch?.stockItemId)) ||
      `Item #${batch?.itemId ?? batch?.stockItemId ?? '?'}`
    );
  }

  storeLabel(batch: any): string {
    return (
      batch?.storeName ||
      batch?.store ||
      (batch?.storeId != null ? `Store #${batch.storeId}` : 'N/A')
    );
  }

  displayQty(batch: any): string {
    const q = this.getNumericStockAtHand(batch);
    return q == null ? 'N/A' : String(q);
  }

  batchNumberLabel(batch: any): string {
    if (batch?.batchNumber != null && String(batch.batchNumber).trim() !== '') {
      return String(batch.batchNumber);
    }
    if (!this.inventoryIsStockBatch && batch?.brand) {
      return String(batch.brand);
    }
    return batch?.id != null ? `#${batch.id}` : 'N/A';
  }

  displayRegisterQty(row: any): string {
    const q = row?.stockAtHand;
    if (q == null || q === '') {
      return 'N/A';
    }
    return String(q);
  }

  registerIdLabel(row: any): string {
    return String(row?.itemId ?? row?.stockItemId ?? 'N/A');
  }
}
