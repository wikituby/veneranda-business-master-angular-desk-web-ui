import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import * as XLSX from 'xlsx';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-pharmacy-purchase-orders',
  templateUrl: './pharmacy-purchase-orders.component.html',
  styleUrls: ['./pharmacy-purchase-orders.component.css']
})
export class PharmacyPurchaseOrdersComponent implements OnInit, OnDestroy {
  isDarkMode = false;
  loading = false;
  saving = false;
  message = '';
  messageColor = '#0f172a';

  orders: any[] = [];
  suppliers: any[] = [];
  order: any = null;
  lines: any[] = [];

  private querySub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeService.isDarkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });
    this.api.getAllSuppliersBusinessItem().subscribe({
      next: (rows: any) => {
        this.suppliers = Array.isArray(rows) ? rows : [];
      },
      error: () => {
        this.suppliers = [];
      },
    });
    this.querySub = this.route.queryParamMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (id) {
        this.loadOrder(id);
      } else {
        this.order = null;
        this.lines = [];
        this.loadList();
      }
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
  }

  get totalQty(): number {
    return this.lines.reduce((sum, line) => sum + (Number(line.quantityOrdered) || 0), 0);
  }

  supplierLabel(supplier: any): string {
    return supplier?.supplierName || supplier?.name || `Supplier #${supplier?.id}`;
  }

  openOrder(item: any): void {
    if (!item?.id) {
      return;
    }
    this.router.navigate(['/overview/pharmacy-purchase-orders'], { queryParams: { id: item.id } });
  }

  backToList(): void {
    this.router.navigate(['/overview/pharmacy-purchase-orders']);
  }

  goToReorder(): void {
    this.router.navigate(['/overview/reorder-levels']);
  }

  onSupplierChange(supplierId: string): void {
    if (!this.order) {
      return;
    }
    const id = supplierId ? Number(supplierId) : null;
    this.order.supplierId = id;
    const match = this.suppliers.find((supplier) => Number(supplier.id) === id);
    if (match) {
      this.order.supplierName = this.supplierLabel(match);
    }
  }

  removeLine(index: number): void {
    this.lines.splice(index, 1);
  }

  save(): void {
    if (!this.order?.id) {
      return;
    }
    const payload = {
      supplierId: this.order.supplierId || null,
      supplierName: this.order.supplierName || null,
      notes: this.order.notes || null,
      lines: this.lines.map((line) => ({
        id: line.id,
        stockItemId: line.stockItemId,
        stockItemName: line.stockItemName,
        storeName: line.storeName,
        batchNumber: line.batchNumber,
        inStock: line.inStock,
        reorderTo: line.reorderTo,
        quantityOrdered: Number(line.quantityOrdered) || 0,
        unitPrice: line.unitPrice === '' || line.unitPrice == null ? null : Number(line.unitPrice),
        lineNotes: line.lineNotes || null,
      })),
    };
    this.saving = true;
    this.api.updatePurchaseOrder(this.order.id, payload).subscribe({
      next: (saved: any) => {
        this.saving = false;
        this.applyOrder(saved);
        this.showMessage('Purchase order saved.', '#0b9b70');
      },
      error: (err: any) => {
        this.saving = false;
        this.showMessage(err?.error?.message || 'Could not save the purchase order.', '#dc2626');
      },
    });
  }

  exportExcel(): void {
    if (!this.order) {
      return;
    }
    const rows: any[][] = [
      ['Purchase order', this.order.orderNo || ''],
      ['Supplier', this.order.supplierName || ''],
      ['Date', this.formatWhen(this.order.createdAt)],
      ['Notes', this.order.notes || ''],
      [],
      ['Product', 'Quantity ordered', 'Store', 'Unit price', 'Notes'],
    ];
    for (const line of this.lines) {
      rows.push([
        line.stockItemName || '',
        Number(line.quantityOrdered) || 0,
        line.storeName || '',
        line.unitPrice === '' || line.unitPrice == null ? '' : Number(line.unitPrice),
        line.lineNotes || '',
      ]);
    }
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 28 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Purchase order');
    const name = (this.order.orderNo || 'purchase-order').replace(/[^\w.-]+/g, '_');
    XLSX.writeFile(book, `${name}.xlsx`);
  }

  formatWhen(value: string): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  }

  lineCount(item: any): number {
    return Array.isArray(item?.lines) ? item.lines.length : 0;
  }

  private loadList(): void {
    this.loading = true;
    this.api.getPurchaseOrders().subscribe({
      next: (rows: any) => {
        this.loading = false;
        this.orders = Array.isArray(rows) ? rows : [];
      },
      error: (err: any) => {
        this.loading = false;
        this.orders = [];
        this.showMessage(err?.error?.message || 'Could not load purchase orders.', '#dc2626');
      },
    });
  }

  private loadOrder(id: number): void {
    this.loading = true;
    this.api.getPurchaseOrder(id).subscribe({
      next: (order: any) => {
        this.loading = false;
        this.applyOrder(order);
      },
      error: (err: any) => {
        this.loading = false;
        this.order = null;
        this.lines = [];
        this.showMessage(err?.error?.message || 'Could not open that purchase order.', '#dc2626');
      },
    });
  }

  private applyOrder(order: any): void {
    this.order = {
      id: order?.id,
      orderNo: order?.orderNo,
      supplierId: order?.supplierId ?? null,
      supplierName: order?.supplierName || '',
      notes: order?.notes || '',
      status: order?.status || 'draft',
      createdAt: order?.createdAt,
    };
    this.lines = (Array.isArray(order?.lines) ? order.lines : []).map((line: any) => ({
      ...line,
      quantityOrdered: line?.quantityOrdered ?? 0,
      unitPrice: line?.unitPrice ?? '',
      lineNotes: line?.lineNotes || '',
    }));
  }

  private showMessage(text: string, color: string): void {
    this.message = text;
    this.messageColor = color;
  }
}
