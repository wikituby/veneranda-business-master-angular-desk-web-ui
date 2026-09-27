import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';

import { forkJoin, of } from 'rxjs';

import { catchError } from 'rxjs/operators';

import { ApiService } from '../../../../services/api.service';

import { ThemeService } from '../../../../services/theme.service';

import { SearchableSelectOption } from '../../../../shared/searchable-select/searchable-select.component';



interface HmisTracerRow {

  id: number;

  hmisTracerCode: string;

  tracerName: string;

  stockItemId: number | null;

  shopItemId: number | null;

  stockItemName?: string;

  shopItemName?: string;

  stockBalance?: number;

  dispensedInPeriod?: number;

  active?: boolean;

  saving?: boolean;

}



@Component({

  selector: 'app-hmis-tracer-mapping',

  templateUrl: './hmis-tracer-mapping.component.html',

  styleUrls: ['./hmis-tracer-mapping.component.css'],

})

export class HmisTracerMappingComponent implements OnInit {

  isDarkMode = false;

  loading = false;

  catalogLoading = false;

  savingId: number | null = null;

  message = '';

  messageColor = '';



  tracers: HmisTracerRow[] = [];

  stockItemOptions: SearchableSelectOption[] = [];

  shopItemOptions: SearchableSelectOption[] = [];



  previewFrom = '';

  previewTo = '';



  constructor(

    private router: Router,

    private api: ApiService,

    private themeService: ThemeService,

  ) {}



  ngOnInit(): void {

    if (!sessionStorage.getItem('username')) {

      this.router.navigate(['/login']);

      return;

    }

    this.themeService.isDarkMode$.subscribe((isDark) => (this.isDarkMode = isDark));

    const today = new Date();

    const start = new Date(today.getFullYear(), today.getMonth(), 1);

    this.previewTo = this.formatDate(today);

    this.previewFrom = this.formatDate(start);

    this.loadInventoryCatalogs();

    this.loadTracers();

  }



  loadInventoryCatalogs(): void {

    this.catalogLoading = true;

    forkJoin({

      stock: this.api.getAllStockItems().pipe(catchError(() => of([]))),

      drugs: this.api.getDrugList().pipe(catchError(() => of([]))),

      items: this.api.getAllItems().pipe(catchError(() => of([]))),

    }).subscribe({

      next: ({ stock, drugs, items }) => {

        const stockRows = this.normalizeList(stock);

        this.stockItemOptions = stockRows

          .map((r: any) => ({

            value: Number(r.id),

            label: `${r.stockItemName || r.name || `Stock #${r.id}`} (ID ${r.id})`,

          }))

          .filter((r) => r.value && r.label)

          .sort((a, b) => a.label.localeCompare(b.label));



        const shopRows = this.normalizeItemList(drugs).length

          ? this.normalizeItemList(drugs)

          : this.normalizeItemList(items);

        this.shopItemOptions = shopRows

          .map((r: any) => {

            const id = Number(r.id ?? r.itemId);

            const title = String(r.title || r.name || `Item #${id}`).trim();

            return { value: id, label: `${title} (ID ${id})` };

          })

          .filter((r) => r.value && r.label)

          .sort((a, b) => a.label.localeCompare(b.label));



        this.catalogLoading = false;

        if (!this.shopItemOptions.length) {

          this.messageColor = 'rgb(238, 16, 16)';

          this.message = 'No legacy shop products loaded. Check server connection or add items under Old Inventory → Product Management.';

        }

        this.ensureMappedOptionsPresent();

      },

      error: () => {

        this.catalogLoading = false;

        this.stockItemOptions = [];

        this.shopItemOptions = [];

        this.messageColor = 'rgb(238, 16, 16)';

        this.message = 'Could not load inventory catalogs for mapping.';

      },

    });

  }



  loadTracers(): void {

    this.loading = true;

    if (!this.message || this.messageColor !== 'rgb(238, 16, 16)') {

      this.message = '';

    }

    this.api.getHmisTracerItems(this.previewFrom, this.previewTo).subscribe({

      next: (rows) => {

        this.tracers = (rows || []).map((row: any) => ({

          id: Number(row.id),

          hmisTracerCode: row.hmisTracerCode || '',

          tracerName: row.tracerName || '',

          stockItemId: row.stockItemId != null ? Number(row.stockItemId) : null,

          shopItemId: row.shopItemId != null ? Number(row.shopItemId) : null,

          stockItemName: row.stockItemName || '',

          shopItemName: row.shopItemName || '',

          stockBalance: row.stockBalance != null ? Number(row.stockBalance) : 0,

          dispensedInPeriod: row.dispensedInPeriod != null ? Number(row.dispensedInPeriod) : 0,

          active: row.active !== false,

        }));

        this.ensureMappedOptionsPresent();

        this.loading = false;

      },

      error: (err) => {

        this.loading = false;

        this.messageColor = 'rgb(238, 16, 16)';

        this.message = err?.error?.message || err?.message || 'Could not load HMIS tracer mappings.';

      },

    });

  }



  applyPreviewRange(): void {

    this.loadTracers();

  }



  onStockSelected(row: HmisTracerRow, itemId: number | null): void {

    row.stockItemId = itemId != null ? Number(itemId) : null;

    const match = this.stockItemOptions.find((i) => Number(i.value) === row.stockItemId);

    row.stockItemName = match ? this.stripIdSuffix(match.label) : '';

  }



  onShopSelected(row: HmisTracerRow, itemId: number | null): void {

    row.shopItemId = itemId != null ? Number(itemId) : null;

    const match = this.shopItemOptions.find((i) => Number(i.value) === row.shopItemId);

    row.shopItemName = match ? this.stripIdSuffix(match.label) : '';

  }



  saveRow(row: HmisTracerRow): void {

    this.savingId = row.id;

    this.message = '';

    this.api.updateHmisTracerItem(row.id, {

      stockItemId: row.stockItemId,

      shopItemId: row.shopItemId,

    }).subscribe({

      next: (updated) => {

        row.stockItemId = updated?.stockItemId != null ? Number(updated.stockItemId) : null;

        row.shopItemId = updated?.shopItemId != null ? Number(updated.shopItemId) : null;

        row.stockItemName = updated?.stockItemName || row.stockItemName;

        row.shopItemName = updated?.shopItemName || row.shopItemName;

        row.stockBalance = updated?.stockBalance != null ? Number(updated.stockBalance) : 0;

        this.savingId = null;

        this.messageColor = 'rgb(22, 163, 74)';

        this.message = `Saved mapping for ${row.hmisTracerCode}.`;

        this.ensureMappedOptionsPresent();

        this.loadTracers();

      },

      error: (err) => {

        this.savingId = null;

        this.messageColor = 'rgb(238, 16, 16)';

        this.message = err?.error?.message || err?.message || 'Could not save tracer mapping.';

      },

    });

  }



  private ensureMappedOptionsPresent(): void {

    for (const row of this.tracers) {

      if (row.stockItemId != null && !this.stockItemOptions.some((o) => Number(o.value) === row.stockItemId)) {

        const name = row.stockItemName || `Stock item #${row.stockItemId}`;

        this.stockItemOptions.push({ value: row.stockItemId, label: `${name} (ID ${row.stockItemId})` });

      }

      if (row.shopItemId != null && !this.shopItemOptions.some((o) => Number(o.value) === row.shopItemId)) {

        const name = row.shopItemName || `Shop item #${row.shopItemId}`;

        this.shopItemOptions.push({ value: row.shopItemId, label: `${name} (ID ${row.shopItemId})` });

      }

    }

    this.stockItemOptions.sort((a, b) => a.label.localeCompare(b.label));

    this.shopItemOptions.sort((a, b) => a.label.localeCompare(b.label));

  }



  private normalizeList(res: any): any[] {

    if (Array.isArray(res)) {

      return res;

    }

    if (Array.isArray(res?.data)) {

      return res.data;

    }

    return [];

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



  private stripIdSuffix(label: string): string {

    return label.replace(/\s+\(ID\s+\d+\)\s*$/i, '').trim();

  }



  private formatDate(d: Date): string {

    const y = d.getFullYear();

    const m = String(d.getMonth() + 1).padStart(2, '0');

    const day = String(d.getDate()).padStart(2, '0');

    return `${y}-${m}-${day}`;

  }

}

