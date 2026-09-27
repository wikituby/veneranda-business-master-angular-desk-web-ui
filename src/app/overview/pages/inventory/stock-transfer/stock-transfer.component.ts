import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ApiService, StockTransferRequestPayload } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-stock-transfer',
  templateUrl: './stock-transfer.component.html',
  styleUrls: ['./stock-transfer.component.css']
})
export class StockTransferComponent implements OnInit {
  isDarkMode: boolean = false;
  currentTransfer: any = {};
  isButtonDisabled: boolean = false;
  showDivAddToDataBase: boolean = false;
  showDivUpdatedLoader: boolean = false;
  responseColor = "";
  responseMessage = "";
  isCollapsedNewTransfer: boolean = true;

  // Table data properties
  transferList: any[] = [];
  data: any[] = [];
  page: number = 1;
  itemsPerPage: number = 15;
  searchQuery: string = '';
  selectedColumn: string = 'all';
  
  // Loading and response properties
  isLoadingService: boolean = false;
  showDivUpdatedOut: boolean = false;
  
  // Store and Stock Batch lists
  storeList: any[] = [];
  stockBatchList: any[] = [];

  /** Searchable popup to pick a stock batch (replaces native select). */
  showBatchPicker = false;
  batchPickerSearch = '';
  
  // ViewChild references
  @ViewChild('htmlData') htmlData!: ElementRef;

  constructor(
    private router: Router,
    private api: ApiService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    const username = sessionStorage.getItem('username');
    
    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    if (username === null) {
      this.router.navigate(['/login']);
    }
    
    this.loadStores();
    this.loadStockBatches();
    this.initializeTableData();
  }

  initializeTableData() {
    this.isLoadingService = true;
    this.api.getStockTransfersBusinessItem().subscribe({
      next: (res: any) => {
        this.isLoadingService = false;
        console.log("Raw stock transfers response:", res);
        
        if (Array.isArray(res)) {
          this.transferList = res;
          this.data = res;
        } else if (res && Array.isArray(res.data)) {
          this.transferList = res.data;
          this.data = res.data;
        } else {
          console.warn("Unexpected stock transfers response structure:", res);
          this.transferList = [];
          this.data = [];
        }
      },
      error: (err: any) => {
        this.isLoadingService = false;
        console.error("Error loading stock transfers:", err);
        this.transferList = [];
        this.data = [];
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
      },
      error: (err) => {
        console.error("Error loading stores:", err);
        this.storeList = [];
      }
    });
  }

  loadStockBatches(storeId?: number) {
    this.api.getAllStockBatches(storeId).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.stockBatchList = res;
        } else if (res && Array.isArray(res.data)) {
          this.stockBatchList = res.data;
        } else {
          this.stockBatchList = [];
        }
        console.log("Stock batches loaded:", this.stockBatchList);
      },
      error: (err: any) => {
        console.error("Error loading stock batches:", err);
        this.stockBatchList = [];
      }
    });
  }

  /**
   * When "from store" changes manually, clear the batch unless it already belongs to that store.
   * (Selecting a batch sets from store from the batch — then we keep both in sync.)
   */
  onFromStoreChange() {
    this.closeBatchPicker();

    const raw = this.currentTransfer.fromStoreId;
    const fromId =
      raw != null && raw !== '' ? Number(raw) : null;

    if (fromId == null || Number.isNaN(fromId)) {
      this.currentTransfer.stockBatchId = null;
      this.loadStockBatches();
      return;
    }

    const batchId = this.currentTransfer.stockBatchId;
    if (batchId != null) {
      const selectedBatch = this.stockBatchList.find(
        b => b.id === batchId || b.id === Number(batchId)
      );
      const batchStoreRaw =
        selectedBatch?.storeId ?? selectedBatch?.store_id;
      if (selectedBatch != null && batchStoreRaw != null) {
        const batchStore = Number(batchStoreRaw);
        if (!Number.isNaN(batchStore) && batchStore === fromId) {
          this.loadStockBatches(fromId);
          return;
        }
      }
      this.currentTransfer.stockBatchId = null;
    }

    this.loadStockBatches(fromId);
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

  selectStockBatch(batch: any): void {
    if (!batch?.id) return;
    const sidRaw = batch.storeId ?? batch.store_id;
    const sid =
      sidRaw != null && sidRaw !== '' ? Number(sidRaw) : null;

    // Set batch first so when fromStoreId updates, onFromStoreChange sees a matching batch/store.
    this.currentTransfer.stockBatchId = batch.id;
    if (sid != null && !Number.isNaN(sid)) {
      this.currentTransfer.fromStoreId = sid;
    }

    this.closeBatchPicker();
  }

  get selectedStockBatchSummary(): string {
    const id = this.currentTransfer?.stockBatchId;
    if (id == null) return '';
    const batch = this.stockBatchList.find(
      b => b.id === id || b.id === Number(id)
    );
    return batch ? this.getStockBatchOptionLabel(batch) : `Batch #${id}`;
  }

  get filteredStockBatchesForPicker(): any[] {
    const q = (this.batchPickerSearch || '').trim().toLowerCase();
    const list = this.stockBatchList || [];
    if (!q) return list;
    return list.filter(b => {
      const label = this.getStockBatchOptionLabel(b).toLowerCase();
      const idStr = b.id != null ? String(b.id) : '';
      const batchNo = b.batchNumber != null ? String(b.batchNumber).toLowerCase() : '';
      const item = (b.stockItemName || '').toLowerCase();
      return (
        label.includes(q) ||
        idStr.includes(q) ||
        batchNo.includes(q) ||
        item.includes(q)
      );
    });
  }

  trackBatchById(_index: number, batch: any): any {
    return batch?.id;
  }

  getStockBatchName(stockBatchId: any): string {
    if (!stockBatchId) return 'N/A';
    const batch = this.stockBatchList.find(b => b.id === stockBatchId || b.id === Number(stockBatchId));
    return batch ? this.getStockBatchOptionLabel(batch) : `Batch ${stockBatchId}`;
  }

  /** Label for stock batch dropdown: item, batch, expiry, store, stock at hand. */
  getStockBatchOptionLabel(batch: any): string {
    if (!batch) return '';
    const name = batch.stockItemName || 'Unknown item';
    const hasBatchNo = batch.batchNumber != null && String(batch.batchNumber).trim() !== '';
    const batchPart = hasBatchNo ? `Batch ${batch.batchNumber}` : `Batch #${batch.id ?? '?'}`;
    const exp = this.formatExpiryDate(batch.expiryDate);
    const expPart = exp ? ` · Exp: ${exp}` : '';

    const storeFromBatch =
      batch.storeName != null && String(batch.storeName).trim() !== ''
        ? String(batch.storeName).trim()
        : '';
    const storeResolved = storeFromBatch || this.getStoreName(batch.storeId);
    const storePart =
      storeResolved && storeResolved !== 'N/A' ? ` · Store: ${storeResolved}` : '';

    const hand = this.formatStockAtHandDisplay(batch.stockAtHand ?? batch.stock_at_hand);
    const handPart = hand !== '' ? ` · On hand: ${hand}` : '';

    return `${name} — ${batchPart}${expPart}${storePart}${handPart}`;
  }

  /** Readable quantity for dropdown (handles number, string, BigDecimal-like JSON). */
  formatStockAtHandDisplay(value: any): string {
    if (value == null || value === '') return '';
    const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
    if (!Number.isFinite(n)) return String(value);
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9) {
      return String(Math.round(n));
    }
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  /** API may return ISO string, LocalDate as [y,m,d], or plain string. */
  formatExpiryDate(value: any): string {
    if (value == null || value === '') return '';
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

  /** Backend DTO uses `quantity`; form / legacy uses `qty`. */
  getTransferQuantity(transfer: any): string | number {
    if (!transfer) return 'N/A';
    const q = transfer.quantity ?? transfer.qty;
    return q != null && q !== '' ? q : 'N/A';
  }

  get filteredTransferList() {
    if (!this.searchQuery.trim()) {
      return this.transferList;
    }

    const query = this.searchQuery.toLowerCase().trim();
    
    if (this.selectedColumn === 'all') {
      return this.transferList.filter(transfer => {
        const fromStore = this.getStoreName(transfer.fromStoreId);
        const toStore = this.getStoreName(transfer.toStoreId);
        return fromStore.toLowerCase().includes(query) ||
               toStore.toLowerCase().includes(query) ||
               (transfer.transferredBy && transfer.transferredBy.toLowerCase().includes(query)) ||
               (transfer.id && transfer.id.toString().includes(query));
      });
    } else {
      return this.transferList.filter(transfer => {
        if (this.selectedColumn === 'fromStore') {
          return this.getStoreName(transfer.fromStoreId).toLowerCase().includes(query);
        } else if (this.selectedColumn === 'toStore') {
          return this.getStoreName(transfer.toStoreId).toLowerCase().includes(query);
        } else if (this.selectedColumn === 'transferredBy') {
          return (transfer.transferredBy || '').toLowerCase().includes(query);
        }
        const value = transfer[this.selectedColumn];
        return value && value.toString().toLowerCase().includes(query);
      });
    }
  }

  getStoreName(storeId: any): string {
    if (!storeId) return 'N/A';
    const store = this.storeList.find(s => s.id === storeId || s.id === Number(storeId));
    return store ? (store.name || 'N/A') : `Store ${storeId}`;
  }

  onPageChange(page: number) {
    this.page = page;
  }

  onSearchQueryChange(query: string) {
    this.searchQuery = query;
    this.page = 1;
  }

  onSelectedColumnChange(column: string) {
    this.selectedColumn = column;
    this.page = 1;
  }

  onItemsPerPageChange(itemsPerPage: number) {
    this.itemsPerPage = itemsPerPage;
    this.page = 1;
  }

  exportToExcel() {
    const dataToExport = this.filteredTransferList.map((transfer, index) => ({
      'SN': index + 1,
      'Transfer ID': transfer.id || 'N/A',
      'Stock Batch ID': transfer.stockBatchId || 'N/A',
      'From Store': this.getStoreName(transfer.fromStoreId),
      'To Store': this.getStoreName(transfer.toStoreId),
      'Quantity': this.getTransferQuantity(transfer),
      'Transferred By': transfer.transferredBy || 'N/A',
      'Transfer Date': transfer.transferDate || transfer.createdAt || 'N/A'
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Transfers');
    XLSX.writeFile(wb, 'stock-transfers.xlsx');
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
      pdf.save('stock-transfers.pdf');
    });
  }

  openTransferModal() {
    this.clearForm();
    this.isCollapsedNewTransfer = false;
    document.body.style.overflow = 'hidden';
    // Load all stock batches when modal opens
    this.loadStockBatches();
  }

  clearForm() {
    const username = sessionStorage.getItem('username') || '';
    this.closeBatchPicker();
    this.currentTransfer = {
      stockBatchId: null,
      fromStoreId: null,
      toStoreId: null,
      qty: null,
      transferredBy: username
    };
    this.showDivAddToDataBase = false;
    this.showDivUpdatedLoader = false;
    this.isButtonDisabled = false;
    // Reload all stock batches when form is cleared
    this.loadStockBatches();
  }

  closeTransferModal() {
    this.closeBatchPicker();
    this.isCollapsedNewTransfer = true;
    document.body.style.overflow = '';
    this.clearForm();
  }

  /**
   * Build JSON body matching backend StockTransferRequest (Long/Long/Long/BigDecimal/String).
   */
  private buildStockTransferPayload(raw: Record<string, unknown>): { ok: true; payload: StockTransferRequestPayload } | { ok: false; error: string } {
    const parsePositiveLong = (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = typeof v === 'number' ? v : Number(String(v).trim());
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
      return n;
    };

    const parseQty = (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const s = typeof v === 'string' ? v.replace(',', '.').trim() : String(v);
      const n = parseFloat(s);
      if (!Number.isFinite(n) || n <= 0) return null;
      return n;
    };

    const stockBatchId = parsePositiveLong(raw['stockBatchId']);
    const fromStoreId = parsePositiveLong(raw['fromStoreId']);
    const toStoreId = parsePositiveLong(raw['toStoreId']);
    const qty = parseQty(raw['qty']);
    const transferredBy = String(raw['transferredBy'] ?? '').trim();

    if (stockBatchId == null) {
      return { ok: false, error: 'Please select a valid stock batch.' };
    }
    if (fromStoreId == null) {
      return { ok: false, error: 'Please select a valid source store.' };
    }
    if (toStoreId == null) {
      return { ok: false, error: 'Please select a valid destination store.' };
    }
    if (fromStoreId === toStoreId) {
      return { ok: false, error: 'Source and destination store must be different.' };
    }
    if (qty == null) {
      return { ok: false, error: 'Please enter a quantity greater than zero.' };
    }

    const payload: StockTransferRequestPayload = {
      stockBatchId,
      fromStoreId,
      toStoreId,
      qty,
      transferredBy,
    };
    return { ok: true, payload };
  }

  transferStock(form: NgForm) {
    this.showDivAddToDataBase = false;

    // Do not gate on form.invalid: template-driven selects often stay "invalid" while
    // values are correct ([value] vs number, placeholder options). Payload validation is authoritative.
    form.form.updateValueAndValidity({ onlySelf: false, emitEvent: false });

    const raw = { ...form.value, ...this.currentTransfer } as Record<string, unknown>;
    const built = this.buildStockTransferPayload(raw);
    if (!built.ok) {
      form.form.markAllAsTouched();
      this.responseColor = 'rgb(238, 16, 16)';
      this.responseMessage = built.error;
      this.showDivAddToDataBase = true;
      return;
    }

    this.isButtonDisabled = true;
    this.showDivUpdatedLoader = true;
    this.showDivAddToDataBase = false;

    console.log('[Stock transfer] POST /Business-item/transfer-stock — payload:', JSON.stringify(built.payload, null, 2));

    this.api.transferStockBusinessItem(built.payload).subscribe({
      next: (res: any) => {
        this.showDivUpdatedLoader = false;
        this.isButtonDisabled = false;

        if (res && res.message) {
          this.responseColor = res.message.includes('successfully') ? 'rgb(11, 155, 112)' : 'rgb(238, 16, 16)';
          this.responseMessage = res.message;
        } else {
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = "Stock transferred successfully!";
        }

        this.showDivAddToDataBase = true;

        // Reload transfers list
        this.initializeTableData();

        setTimeout(() => {
          this.closeTransferModal();
        }, 1500);
      },
      error: (err) => {
        this.showDivUpdatedLoader = false;
        this.isButtonDisabled = false;
        this.responseColor = 'rgb(238, 16, 16)';
        const e = err?.error;
        const msg =
          (typeof e === 'string' ? e : null) ||
          e?.message ||
          e?.detail ||
          e?.title ||
          err?.message ||
          "Error transferring stock. Please try again.";
        this.responseMessage = msg;
        this.showDivAddToDataBase = true;
        console.error("Error transferring stock: ", err);
      }
    });
  }
}
