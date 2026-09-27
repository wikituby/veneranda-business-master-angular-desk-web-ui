import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { SearchableSelectOption } from '../../../../shared/searchable-select/searchable-select.component';

@Component({
  selector: 'app-shop-item-receive',
  templateUrl: './shop-item-receive.component.html',
  styleUrls: [
    '../shop-item-management/shop-item-management.component.css',
    './shop-item-receive.component.css',
  ],
})
export class ShopItemReceiveComponent implements OnInit {
  items: any[] = [];
  receives: any[] = [];
  searchQuery = '';
  page = 1;
  itemsPerPage = 15;
  isLoading = false;
  isSaving = false;
  isDeleting = false;
  isDarkMode = false;
  receiveFieldsExpanded = true;
  receiveToDelete: any = null;
  responseMessage = '';
  responseColor = '';
  showFeedback = false;
  itemsLoading = false;
  itemOptionsList: SearchableSelectOption[] = [];

  availableQuantity: any = '00';
  itemUnitOfMeasure = '';
  itemUnitCostPrice: any = '';
  itemUnitSellingPrice: any = '';

  readonly storeOptions: SearchableSelectOption[] = [
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'main', label: 'Main' },
  ];

  form: {
    itemId: number | null;
    quantityReceived: number | null;
    totalCostPrice: number | null;
    unitCostPrice: number | null;
    unitSellingPrice: number | null;
    store: string | null;
    receiveDate: string;
    expiryDate: string;
  } = this.emptyForm();

  constructor(
    private api: ApiService,
    private themeService: ThemeService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!sessionStorage.getItem('username')) {
      this.router.navigate(['/login']);
      return;
    }
    this.themeService.isDarkMode$.subscribe((isDark) => (this.isDarkMode = isDark));
    this.form.receiveDate = this.todayIso();
    this.loadItems();
    this.loadReceives();
  }

  toggleReceiveFields(): void {
    this.receiveFieldsExpanded = !this.receiveFieldsExpanded;
  }

  clearForm(): void {
    this.form = this.emptyForm();
    this.form.receiveDate = this.todayIso();
    this.availableQuantity = '00';
    this.itemUnitOfMeasure = '';
    this.itemUnitCostPrice = '';
    this.itemUnitSellingPrice = '';
  }

  get itemOptions(): SearchableSelectOption[] {
    return this.itemOptionsList;
  }

  get filteredReceives(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return this.receives;
    }
    return this.receives.filter((row) =>
      `${this.itemTitle(row)} ${row?.brand ?? ''} ${row?.quantityReceived ?? ''} ${row?.unitCostPrice ?? ''} ${
        row?.unitSellingPrice ?? ''
      } ${row?.expiryDate ?? ''} ${row?.receiveDate ?? ''}`
        .toLowerCase()
        .includes(q)
    );
  }

  get itemMetaLabel(): string {
    const uom = String(this.itemUnitOfMeasure || '').toUpperCase();
    return `In stock: ${this.availableQuantity}${uom ? ' ' + uom + 'S' : ''} · Unit cost: ${
      this.itemUnitCostPrice || '—'
    } · Unit sell: ${this.itemUnitSellingPrice || '—'}`;
  }

  /**
   * Classic stock-receive uses getDrugList → GET /shop-item/get-drugs.
   * Fall back to getAllItems → GET /shop-item/get-all-Items (same data source).
   */
  loadItems(): void {
    if (!this.items.length) {
      this.itemsLoading = true;
    }
    this.api.getDrugList().subscribe({
      next: (res: any) => {
        const list = this.normalizeItemList(res);
        if (list.length) {
          this.setItems(list);
          return;
        }
        this.loadItemsFallback();
      },
      error: () => this.loadItemsFallback(),
    });
  }

  private loadItemsFallback(): void {
    this.api.getAllItems().subscribe({
      next: (res: any) => {
        const list = this.normalizeItemList(res);
        this.setItems(list);
        if (!list.length) {
          this.flash('No shop products found.', true);
        }
      },
      error: (err: any) => {
        this.setItems([]);
        this.flash(err?.error?.message || 'Could not load items.', true);
      },
    });
  }

  private normalizeItemList(res: any): any[] {
    if (Array.isArray(res)) {
      return res;
    }
    if (Array.isArray(res?.data)) {
      return res.data;
    }
    if (Array.isArray(res?.result?.data)) {
      return res.result.data;
    }
    return [];
  }

  private setItems(list: any[]): void {
    this.items = list || [];
    // Latest first (highest id), same as classic stock-receive
    this.itemOptionsList = this.items
      .filter((item) => item?.id != null || item?.itemId != null)
      .slice()
      .sort(
        (a, b) =>
          Number(b?.id ?? b?.itemId ?? 0) - Number(a?.id ?? a?.itemId ?? 0)
      )
      .map((item) => {
        const id = item.id != null ? item.id : item.itemId;
        return {
          value: Number(id),
          label: String(item.title || item.name || `Item #${id}`),
        };
      });
    this.itemsLoading = false;
    this.cdr.detectChanges();
  }

  loadReceives(options: { showLoader?: boolean; preservePage?: boolean } = {}): void {
    // Never blank an already-populated table (keeps the new row visible while refetching).
    const showLoader =
      options.showLoader === true ||
      (options.showLoader !== false && this.receives.length === 0);
    if (showLoader) {
      this.isLoading = true;
    }
    this.api.getAllStockReceived().subscribe({
      next: (res: any) => {
        const serverList = this.normalizeReceives(res);
        if (serverList.length || this.receives.length === 0) {
          this.receives = serverList;
        }
        if (!options.preservePage) {
          this.page = 1;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        if (showLoader && this.receives.length === 0) {
          this.receives = [];
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  refresh(): void {
    this.loadItems();
    this.loadReceives({ showLoader: this.receives.length === 0 });
  }

  /** Newest receives first so a just-saved row appears at the top of the table. */
  private normalizeReceives(res: any): any[] {
    const list = Array.isArray(res)
      ? res
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.result?.data)
          ? res.result.data
          : [];
    return list
      .slice()
      .sort((a: any, b: any) => {
        if (a?._optimistic && !b?._optimistic) {
          return -1;
        }
        if (b?._optimistic && !a?._optimistic) {
          return 1;
        }
        const idDiff = Number(b?.id ?? 0) - Number(a?.id ?? 0);
        if (idDiff !== 0) {
          return idDiff;
        }
        return this.receiveSortTime(b) - this.receiveSortTime(a);
      });
  }

  private receiveSortTime(row: any): number {
    const raw = row?.receiveDate ?? row?.creationDateAndTime ?? row?.createdAt ?? null;
    if (!raw) {
      return 0;
    }
    const parsed = new Date(String(raw).replace(/\//g, '-')).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private isSameReceive(a: any, b: any): boolean {
    if (a?.id != null && b?.id != null && !b?._optimistic && Number(a.id) === Number(b.id)) {
      return true;
    }
    return (
      Number(a?.itemId ?? a?.item?.id ?? 0) === Number(b?.itemId ?? b?.item?.id ?? 0) &&
      Number(a?.quantityReceived ?? 0) === Number(b?.quantityReceived ?? 0) &&
      String(a?.receiveDate ?? '') === String(b?.receiveDate ?? '') &&
      String(a?.brand ?? '') === String(b?.brand ?? '') &&
      Number(a?.totalCostPrice ?? 0) === Number(b?.totalCostPrice ?? 0)
    );
  }

  itemTitle(row: any): string {
    return row?.title || row?.itemTitle || row?.item?.title || '—';
  }

  onItemSelected(itemId: number | null): void {
    this.form.itemId = itemId;
    const item = (this.items || []).find(
      (entry) => Number(entry.id ?? entry.itemId) === Number(itemId)
    );
    if (!item) {
      this.availableQuantity = '00';
      this.itemUnitOfMeasure = '';
      this.itemUnitCostPrice = '';
      this.itemUnitSellingPrice = '';
      return;
    }
    this.availableQuantity = item.stockAtHand ?? '00';
    this.itemUnitOfMeasure = item.unitOfMeasure || '';
    this.itemUnitCostPrice = item.costPrice ?? '';
    this.itemUnitSellingPrice = item.sellingPrice ?? '';
    if (item.sellingPrice != null) {
      this.form.unitSellingPrice = Number(item.sellingPrice);
    }
    if (item.costPrice != null) {
      this.form.unitCostPrice = Number(item.costPrice);
      this.recalcTotalFromUnit();
    }
  }

  onStoreSelected(store: string | null): void {
    this.form.store = store;
  }

  onQuantityChange(value: any): void {
    this.form.quantityReceived = value;
    this.recalcUnitFromTotal();
  }

  onTotalCostChange(value: any): void {
    this.form.totalCostPrice = value;
    this.recalcUnitFromTotal();
  }

  onUnitCostChange(value: any): void {
    this.form.unitCostPrice = value;
    this.recalcTotalFromUnit();
  }

  recalcTotalFromUnit(): void {
    const qty = Number(this.form.quantityReceived);
    const unit = Number(this.form.unitCostPrice);
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(unit) && unit >= 0) {
      this.form.totalCostPrice = Number((qty * unit).toFixed(2));
    }
  }

  recalcUnitFromTotal(): void {
    const qty = Number(this.form.quantityReceived);
    const total = Number(this.form.totalCostPrice);
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(total) && total >= 0) {
      this.form.unitCostPrice = Number((total / qty).toFixed(2));
    }
  }

  receiveStock(_form: NgForm): void {
    if (this.form.itemId == null) {
      this.flash('Select an item.', true);
      return;
    }
    const qty = Number(this.form.quantityReceived);
    if (!Number.isFinite(qty) || qty <= 0) {
      this.flash('Quantity must be greater than zero.', true);
      return;
    }
    const unitCost = Number(this.form.unitCostPrice);
    const totalCost = Number(this.form.totalCostPrice);
    const unitSell = Number(this.form.unitSellingPrice);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      this.flash('Enter a valid unit cost.', true);
      return;
    }
    if (!Number.isFinite(unitSell) || unitSell <= unitCost) {
      this.flash('Unit sell must be greater than unit cost.', true);
      return;
    }

    const payload: any = {
      itemId: this.form.itemId,
      quantityReceived: qty,
      totalCostPrice: Number.isFinite(totalCost) ? totalCost : Number((qty * unitCost).toFixed(2)),
      unitCostPrice: unitCost,
      costPrice: unitCost,
      unitSellingPrice: unitSell,
      sellingPrice: unitSell,
      notes: null,
      brand: null,
      packaging: null,
      store: this.form.store || 'pharmacy',
      receiveDate: this.toApiDate(this.form.receiveDate),
      expiryDate: this.toApiDate(this.form.expiryDate),
    };

    this.isSaving = true;
    this.api.receiveNewStock(payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.flash(res?.message || 'Stock received.', false);
        this.bumpItemStockAtHand(payload);
        this.loadReceives({ showLoader: false, preservePage: true });
      },
      error: (err: any) => {
        this.isSaving = false;
        this.flash(err?.error?.message || 'Could not receive stock.', true);
      },
    });
  }

  private bumpItemStockAtHand(payload: any): void {
    const itemId = Number(payload.itemId);
    const qty = Number(payload.quantityReceived) || 0;
    const item = (this.items || []).find(
      (entry) => Number(entry.id ?? entry.itemId) === itemId
    );
    if (!item || qty <= 0) {
      return;
    }
    const previousStock = Number(item.stockAtHand ?? 0);
    item.stockAtHand = (Number.isFinite(previousStock) ? previousStock : 0) + qty;
    if (payload.unitCostPrice != null) {
      item.costPrice = payload.unitCostPrice;
    }
    if (payload.unitSellingPrice != null) {
      item.sellingPrice = payload.unitSellingPrice;
    }
  }

  confirmDelete(row: any): void {
    this.receiveToDelete = row;
  }

  cancelDelete(): void {
    this.receiveToDelete = null;
    this.isDeleting = false;
  }

  deleteReceive(): void {
    const id = this.receiveToDelete?.id;
    if (id == null) {
      return;
    }
    this.isDeleting = true;
    this.api.deleteStockReceivedById(id).subscribe({
      next: (res: any) => {
        this.isDeleting = false;
        this.receiveToDelete = null;
        this.flash(res?.message || 'Stock receive deleted.', false);
        this.receives = (this.receives || []).filter(
          (row: any) => Number(row?.id) !== Number(id)
        );
        this.loadReceives({ showLoader: true });
        this.loadItems();
      },
      error: (err: any) => {
        this.isDeleting = false;
        this.flash(err?.error?.message || 'Could not delete this stock receive.', true);
      },
    });
  }

  private todayIso(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  private toApiDate(iso: string): string | null {
    if (!iso) {
      return null;
    }
    const parts = String(iso).split('-');
    if (parts.length !== 3) {
      return null;
    }
    return `${parts[0]}/${parts[1]}/${parts[2]}`;
  }

  private emptyForm() {
    return {
      itemId: null as number | null,
      quantityReceived: null as number | null,
      totalCostPrice: null as number | null,
      unitCostPrice: null as number | null,
      unitSellingPrice: null as number | null,
      store: 'pharmacy' as string | null,
      receiveDate: '',
      expiryDate: '',
    };
  }

  private flash(message: string, isError: boolean): void {
    this.responseMessage = message;
    this.responseColor = isError ? '#dc2626' : 'rgb(11, 155, 112)';
    this.showFeedback = true;
    setTimeout(() => (this.showFeedback = false), isError ? 5000 : 4000);
  }
}
