import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { FacilityBrandingService } from '../../../../services/facility-branding.service';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-stock-verification',
  templateUrl: './stock-verification.component.html',
  styleUrls: ['./stock-verification.component.css']
})
export class StockVerificationComponent implements OnInit {
  isDarkMode = false;
  /** True until inventory mode (batch vs item) is resolved and first dashboard load finishes. */
  isLoading = true;
  isSaving = false;
  responseMessage = '';
  responseError = '';
  searchQuery = '';
  stores: any[] = [];
  selectedStoreId: number | null = null;
  rows: any[] = [];
  catalog: any = { statuses: [], reasons: [], confidenceLevels: [] };
  /**
   * From facility settings / catalog / dashboard — true = stockBatchId, false = itemId.
   * Do not assume batch mode until {@link modeResolved} is true.
   */
  useStockBatch = true;
  /** False until branding or API confirms pharmacyUseStockBatch. */
  modeResolved = false;

  showVerifyModal = false;
  activeRow: any = null;
  preview: any = null;
  verifyForm = {
    physicalQuantity: null as number | null,
    verificationStatusId: null as number | null,
    verificationReasonId: null as number | null,
    description: ''
  };

  private userId: number | null = null;
  private username = '';
  /** Prevents reload loops when dashboard mode disagrees with the first guess. */
  private modeReloadAttempted = false;

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
    // Resolve inventory mode first (branding), then catalog/dashboard override from server.
    this.applyInventoryMode(this.facilityBranding.getPharmacyUseStockBatch(), false);
    this.facilityBranding.load().subscribe({
      next: () => {
        this.applyInventoryMode(this.facilityBranding.getPharmacyUseStockBatch(), true);
        this.loadAll();
      },
      error: () => {
        // Catalog still carries authoritative useStockBatch from the verification API.
        this.loadAll();
      }
    });
  }

  /** Apply batch vs item mode; never leave the UI stuck on batch-only empty state. */
  private applyInventoryMode(useStockBatch: boolean | null | undefined, markResolved = true): void {
    if (typeof useStockBatch === 'boolean') {
      const changed = this.modeResolved && this.useStockBatch !== useStockBatch;
      this.useStockBatch = useStockBatch;
      if (markResolved) {
        this.modeResolved = true;
      }
      if (changed && !useStockBatch) {
        this.selectedStoreId = null;
        this.stores = [];
      }
    }
  }

  /** Infer mode from dashboard rows when older APIs omit useStockBatch. */
  private inferModeFromRows(rows: any[]): void {
    if (!rows?.length || this.modeResolved) return;
    const sample = rows[0];
    if (sample?.itemId != null && sample?.stockBatchId == null) {
      this.applyInventoryMode(false, true);
    } else if (sample?.stockBatchId != null) {
      this.applyInventoryMode(true, true);
    }
  }

  get unitLabel(): string {
    return this.useStockBatch ? 'batch' : 'item';
  }

  get unitLabelPlural(): string {
    return this.useStockBatch ? 'batches' : 'products';
  }

  get filteredRows(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(r =>
      `${r.stockItemName} ${r.storeName || ''} ${r.batchNumber || ''}`.toLowerCase().includes(q)
    );
  }

  get totalBatches(): number {
    return this.rows.length;
  }

  get tallyingCount(): number {
    return this.rows.filter(r => (r.lastVerification?.verificationStatusCode || '').toUpperCase() === 'TALLYING').length;
  }

  get attentionCount(): number {
    return this.rows.filter(r => {
      const code = (r.lastVerification?.verificationStatusCode || '').toUpperCase();
      return code.includes('NOT_TALLYING') || !r.lastVerification;
    }).length;
  }

  get lowConfidenceCount(): number {
    return this.rows.filter(r => (r.currentPreview?.confidenceLevelCode || '').toUpperCase() === 'LOW').length;
  }

  get projectedVariance(): number {
    const expected = Number(this.preview?.expectedQuantity ?? 0);
    const physical = Number(this.verifyForm.physicalQuantity ?? 0);
    if (!Number.isFinite(expected) || !Number.isFinite(physical)) return 0;
    return physical - expected;
  }

  loadAll(): void {
    this.isLoading = true;
    const afterCatalog = () => {
      // Always branch on resolved mode before fetching rows (batch vs item).
      if (this.useStockBatch) {
        this.api.getAllStores().subscribe({
          next: (stores: any) => {
            this.stores = Array.isArray(stores) ? stores : stores?.data ?? [];
            this.loadDashboard();
          },
          error: () => {
            this.stores = [];
            this.loadDashboard();
          }
        });
      } else {
        this.stores = [];
        this.selectedStoreId = null;
        this.loadDashboard();
      }
    };

    this.api.getStockVerificationCatalog().subscribe({
      next: (cat: any) => {
        this.catalog = cat || { statuses: [], reasons: [], confidenceLevels: [] };
        // Server catalog is authoritative for pharmacyUseStockBatch.
        this.applyInventoryMode(cat?.useStockBatch, true);
        afterCatalog();
      },
      error: () => {
        if (!this.modeResolved) {
          this.applyInventoryMode(this.facilityBranding.getPharmacyUseStockBatch(), true);
        }
        afterCatalog();
      }
    });
  }

  loadDashboard(): void {
    this.isLoading = true;
    const storeId = this.useStockBatch ? (this.selectedStoreId ?? undefined) : undefined;
    this.api.getStockVerificationDashboard(storeId).subscribe({
      next: (data: any) => {
        const previousMode = this.useStockBatch;
        this.applyInventoryMode(data?.useStockBatch, true);
        this.rows = Array.isArray(data?.rows) ? data.rows : [];
        this.inferModeFromRows(this.rows);
        // If server mode flipped after we already chose store vs item path, reload once.
        if (
          this.modeResolved &&
          previousMode !== this.useStockBatch &&
          !this.modeReloadAttempted
        ) {
          this.modeReloadAttempted = true;
          this.loadAll();
          return;
        }
        this.isLoading = false;
      },
      error: () => {
        this.rows = [];
        this.isLoading = false;
        if (!this.modeResolved) {
          this.applyInventoryMode(this.facilityBranding.getPharmacyUseStockBatch(), true);
        }
        this.showError('Failed to load verification dashboard.');
      }
    });
  }

  openVerify(row: any): void {
    this.activeRow = row;
    this.preview = row?.currentPreview || null;
    this.verifyForm = {
      physicalQuantity: Number(row?.stockAtHand ?? this.preview?.expectedQuantity ?? 0),
      verificationStatusId: this.preview?.suggestedStatusId ?? null,
      verificationReasonId: null,
      description: ''
    };
    this.showVerifyModal = true;
    if (this.preview) return;

    if (this.useStockBatch && row?.stockBatchId) {
      this.api.previewStockVerification(row.stockBatchId).subscribe({
        next: (p: any) => this.applyPreview(p)
      });
    } else if (!this.useStockBatch && row?.itemId) {
      this.api.previewStockVerificationItem(row.itemId).subscribe({
        next: (p: any) => this.applyPreview(p)
      });
    }
  }

  private applyPreview(p: any): void {
    this.preview = p;
    if (!this.verifyForm.verificationStatusId) {
      this.verifyForm.verificationStatusId = p?.suggestedStatusId ?? null;
    }
  }

  closeModal(): void {
    if (this.isSaving) return;
    this.showVerifyModal = false;
    this.activeRow = null;
    this.preview = null;
  }

  saveVerification(): void {
    if (this.verifyForm.physicalQuantity == null) {
      this.showError('Enter a physical quantity.');
      return;
    }
    const payload: any = {
      physicalQuantity: Number(this.verifyForm.physicalQuantity),
      verificationStatusId: this.verifyForm.verificationStatusId,
      verificationReasonId: this.verifyForm.verificationReasonId,
      description: this.verifyForm.description?.trim() || '',
      performedByUserId: this.userId,
      performedByUserName: this.username
    };
    if (this.useStockBatch) {
      if (!this.activeRow?.stockBatchId) {
        this.showError('Select a stock batch to verify.');
        return;
      }
      payload.stockBatchId = this.activeRow.stockBatchId;
    } else {
      if (!this.activeRow?.itemId) {
        this.showError('Select an item to verify.');
        return;
      }
      payload.itemId = this.activeRow.itemId;
    }
    this.isSaving = true;
    this.api.createStockVerification(payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.showVerifyModal = false;
        this.showSuccess(res?.message || 'Verification recorded.');
        this.loadDashboard();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.showError(err?.error?.message || 'Failed to record verification.');
      }
    });
  }

  statusClass(code?: string): string {
    const c = (code || '').toUpperCase();
    if (c === 'TALLYING') return 'pill pill-ok';
    if (c.includes('GENUINE')) return 'pill pill-warn';
    if (c.includes('WITHOUT')) return 'pill pill-bad';
    return 'pill pill-pending';
  }

  statusIcon(code?: string): string {
    const c = (code || '').toUpperCase();
    if (c === 'TALLYING') return 'bi-check-circle-fill';
    if (c.includes('GENUINE')) return 'bi-exclamation-circle-fill';
    if (c.includes('WITHOUT')) return 'bi-x-circle-fill';
    return 'bi-clock-history';
  }

  confidenceClass(code?: string): string {
    const c = (code || '').toUpperCase();
    if (c === 'HIGH') return 'pill pill-ok';
    if (c === 'MEDIUM') return 'pill pill-warn';
    if (c === 'LOW') return 'pill pill-bad';
    return 'pill';
  }

  formatQty(v: any): string {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString() : '0';
  }

  formatVariance(v: number): string {
    if (!Number.isFinite(v) || v === 0) return '0';
    return v > 0 ? `+${this.formatQty(v)}` : `−${this.formatQty(Math.abs(v))}`;
  }

  formatDateTime(v: any): string {
    if (!v) return '-';
    const d = new Date(String(v).replace(/\//g, '-'));
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
  }

  private showSuccess(msg: string): void {
    this.responseMessage = msg;
    this.responseError = '';
    setTimeout(() => (this.responseMessage = ''), 5000);
  }

  private showError(msg: string): void {
    this.responseError = msg;
    this.responseMessage = '';
    setTimeout(() => (this.responseError = ''), 6000);
  }
}
