import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';
import { ApiConfigService } from '../../../services/api-config.service';
import { ThemeService } from '../../../services/theme.service';
import { AccessControlService } from '../../../services/access-control.service';

declare const Chart: any;

@Component({
  selector: 'app-main-dashboard',
  templateUrl: './main-dashboard.component.html',
  styleUrls: ['./main-dashboard.component.css']
})
export class MainDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  isLoading: boolean = true;
  errorMessage: string = '';
  isDarkMode: boolean = false;
  chartsReady: boolean = false;
  periodSide: 'this' | 'last' | 'custom' = 'this';
  periodUnit: 'day' | 'week' | 'month' | 'year' = 'month';
  customFrom = '';
  customTo = '';

  totalServices: number = 0;
  totalCategories: number = 0;
  totalClients: number = 0;
  totalItems: number = 0;
  totalVisits: number = 0;
  totalVisitsLast30: number = 0;
  totalReorderItems: number = 0;
  totalPaymentsReceived: number = 0;
  totalPaymentsReceivedFormatted: string = '0.00';

  clientsTrend: number[] = [];
  itemsTrend: number[] = [];
  servicesTrend: number[] = [];
  visitsTrend: number[] = [];
  paymentsTrend: number[] = [];
  reorderTrend: number[] = [];

  clientsPath: string = '';
  itemsPath: string = '';
  servicesPath: string = '';
  visitsPath: string = '';
  paymentsPath: string = '';
  reorderPath: string = '';

  clientsAreaPath: string = '';
  servicesAreaPath: string = '';
  visitsAreaPath: string = '';
  paymentsAreaPath: string = '';
  reorderAreaPath: string = '';

  itemsCategoryLabels: string[] = [];
  itemsCategoryData: number[] = [];

  clientsAgeLabels: string[] = [];
  clientsAgeData: number[] = [];

  // Hospital-specific metrics
  todayAppointments: number = 0;
  pendingAppointments: number = 0;
  completedAppointments: number = 0;
  
  admittedClients: number = 0;
  newAdmissionsToday: number = 0;
  dischargesToday: number = 0;
  
  pendingLabTests: number = 0;
  completedLabTests: number = 0;
  pendingScanTests: number = 0;
  completedScanTests: number = 0;
  
  criticalStockItems: number = 0;
  nearExpiryItems: number = 0;
  lowConfidenceStockItems: number = 0;
  
  todayRevenue: number = 0;
  todayRevenueFormatted: string = '0.00';
  weekRevenue: number = 0;
  weekRevenueFormatted: string = '0.00';
  outstandingPayments: number = 0;
  outstandingPaymentsFormatted: string = '0.00';
  
  emergencyCases: number = 0;
  criticalClients: number = 0;
  
  recentActivities: any[] = [];
  upcomingAppointments: any[] = [];

  private readonly dashboardSectionsStorageKey = 'mainDashboardSectionExpanded';
  private readonly allDashboardSectionIds = [
    'summary',
    'pendingTasks',
    'quickLinks',
    'businessMetrics',
    'hospitalMetrics',
    'charts',
    'appointments',
    'activities',
  ] as const;
  expandedDashboardSections = new Set<string>([
    'summary',
    'pendingTasks',
    'quickLinks',
    'businessMetrics',
    'charts',
    'appointments',
    'activities',
  ]);

  quickLinks = [
    { label: 'Client Registry', icon: 'bi-people', route: '/overview/all-clients', color: '#2563eb' },
    { label: 'Point of Sale', icon: 'bi-cart-check', route: '/overview/otc-dispensary', color: '#059669' },
    { label: 'Cashier', icon: 'bi-cash-register', route: '/overview/cashier', color: '#0d9488' },
    { label: 'Expenses', icon: 'bi-wallet2', route: '/overview/expenses', color: '#d97706' },
    { label: 'Stock Receive', icon: 'bi-box-arrow-in-down', route: '/overview/stock-receive', color: '#0891b2' },
    { label: 'Reorder Levels', icon: 'bi-exclamation-triangle', route: '/overview/reorder-levels', color: '#dc2626' },
    { label: 'Stock Verification', icon: 'bi-clipboard2-check', route: '/overview/stock-verification', color: '#0d9488' },
    { label: 'Services', icon: 'bi-grid', route: '/overview/services-management', color: '#4f46e5' },
    { label: 'Purchase Orders', icon: 'bi-truck', route: '/overview/pharmacy-purchase-orders', color: '#db2777' },
  ];

  private themeSubscription?: Subscription;
  private apiReadySub?: Subscription;
  private lastLoadedApiBase = '';
  private chartInstances: any[] = [];

  constructor(
    private api: ApiService,
    private apiConfig: ApiConfigService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService,
    private accessControl: AccessControlService
  ) {}

  ngOnInit(): void {
    this.loadDashboardSectionState();

    this.themeSubscription = this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    // Wait for overview shell to paint before API + charts work.
    setTimeout(() => this.loadCounts(), 250);

    this.apiReadySub = this.apiConfig.state$
      .pipe(filter((state) => state === 'ready'))
      .subscribe(() => {
        const base = this.apiConfig.getBaseUrl();
        if (base && base !== this.lastLoadedApiBase) {
          this.loadCounts();
        }
      });
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
    this.apiReadySub?.unsubscribe();
    this.destroyCharts();
  }

  get greetingName(): string {
    const raw = String(sessionStorage.getItem('username') || 'there').trim();
    const first = raw.split(/\s+/)[0] || 'there';
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }

  get greetingText(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good Morning';
    }
    if (hour < 17) {
      return 'Good Afternoon';
    }
    return 'Good Evening';
  }

  get dashboardDateLabel(): string {
    return new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  get averageOrderValueFormatted(): string {
    const orders = this.todayAppointments || 0;
    const revenue = this.isMdUser() ? this.todayRevenue : 0;
    if (!orders || !revenue) {
      return '0';
    }
    return (revenue / orders).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });
  }

  get categorySlices(): { label: string; value: number; pct: number; color: string }[] {
    const colors = ['#7c3aed', '#22c55e', '#3b82f6', '#f97316', '#ef4444'];
    const pairs = this.itemsCategoryLabels
      .map((label, index) => ({
        label: String(label || 'Other').trim() || 'Other',
        value: Number(this.itemsCategoryData[index]) || 0,
      }))
      .filter((pair) => pair.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const total = pairs.reduce((sum, pair) => sum + pair.value, 0) || 1;
    return pairs.map((pair, index) => ({
      ...pair,
      pct: Math.round((pair.value / total) * 100),
      color: colors[index % colors.length],
    }));
  }

  get categoryDonutBackground(): string {
    const slices = this.categorySlices;
    if (!slices.length) {
      return 'conic-gradient(#e8edf3 0 100%)';
    }
    let cursor = 0;
    const stops = slices.map((slice) => {
      const start = cursor;
      cursor += slice.pct;
      return `${slice.color} ${start}% ${cursor}%`;
    });
    if (cursor < 100) {
      stops.push(`#e8edf3 ${cursor}% 100%`);
    }
    return `conic-gradient(${stops.join(', ')})`;
  }

  get categoryTotal(): number {
    const total = this.categorySlices.reduce((sum, slice) => sum + slice.value, 0);
    return total || this.totalVisits || 0;
  }

  get topCategories(): { label: string; value: number; color: string }[] {
    const colors = ['#7c3aed', '#22c55e', '#3b82f6', '#f97316', '#ef4444'];
    return this.itemsCategoryLabels
      .map((label, index) => ({
        label: String(label || 'Other').trim() || 'Other',
        value: Number(this.itemsCategoryData[index]) || 0,
        color: colors[index % colors.length],
      }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }

  get orderStatusParts(): { label: string; count: number; pct: number; color: string }[] {
    const parts = [
      { label: 'Completed', count: this.completedAppointments, color: '#22a06b' },
      { label: 'Open', count: this.pendingAppointments, color: '#f5b301' },
      { label: 'In progress', count: this.pendingLabTests + this.pendingScanTests, color: '#ff6a2a' },
      { label: 'Needs stock', count: this.criticalStockItems, color: '#94a3b8' },
    ];
    const total = parts.reduce((sum, part) => sum + part.count, 0) || 1;
    return parts.map((part) => ({
      ...part,
      pct: Math.round((part.count / total) * 100),
    }));
  }

  get orderStatusBackground(): string {
    let cursor = 0;
    const stops = this.orderStatusParts.map((part) => {
      const start = cursor;
      cursor += part.pct;
      return `${part.color} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  get completedShareLabel(): string {
    const done = this.completedAppointments;
    const open = this.pendingAppointments + this.pendingLabTests + this.pendingScanTests;
    const total = done + open;
    if (!total) {
      return '0%';
    }
    return `${((done / total) * 100).toFixed(1)}%`;
  }

  get barScale(): number {
    return Math.max(...this.topCategories.map((row) => row.value), 1);
  }

  sparkPath(index: number): string {
    const paths = [this.visitsPath, this.paymentsPath, this.clientsPath, this.servicesPath, this.reorderPath];
    return paths[index % paths.length] || '';
  }

  printDashboard(): void {
    window.print();
  }

  choosePeriod(side: 'this' | 'last', unit: string): void {
    if (unit !== 'day' && unit !== 'week' && unit !== 'month' && unit !== 'year') {
      return;
    }
    this.periodSide = side;
    this.periodUnit = unit;
    this.customFrom = '';
    this.customTo = '';
    this.loadCounts();
  }

  chooseCustom(): void {
    if (!this.customFrom || !this.customTo) {
      return;
    }
    this.periodSide = 'custom';
    this.loadCounts();
  }

  get periodRangeLabel(): string {
    const range = this.resolvePeriodRange();
    if (range.from === range.to) {
      return this.formatChipDate(range.from);
    }
    return `${this.formatChipDate(range.from)} – ${this.formatChipDate(range.to)}`;
  }

  get topCategoryLabel(): string {
    return this.topCategories[0]?.label || '—';
  }

  trendDelta(series: number[]): { text: string; up: boolean } {
    if (!series || series.length < 2) {
      return { text: '—', up: true };
    }
    const previous = Number(series[series.length - 2]) || 0;
    const latest = Number(series[series.length - 1]) || 0;
    if (!previous) {
      return { text: latest ? 'New' : '0%', up: latest >= previous };
    }
    const pct = ((latest - previous) / Math.abs(previous)) * 100;
    return { text: `${Math.abs(pct).toFixed(1)}%`, up: pct >= 0 };
  }

  ngAfterViewInit(): void {
    // Charts will be initialized after data loads
  }

  navigateTo(route: string): void {
    const normalized = (route || '').replace(/^\//, '');
    const parts = normalized.split('/').filter(Boolean);
    const segment = parts[parts.length - 1];
    if (segment && !this.accessControl.canAccessPage(segment)) {
      window.alert(
        'You are not authorised to view content on this page. Contact admin for permission.'
      );
      return;
    }
    this.router.navigate([route]);
  }

  /** Financial summary cards on the main dashboard are MD-only. */
  isMdUser(): boolean {
    const role = (sessionStorage.getItem('userrole') || '').toLowerCase().trim();
    return role === 'md';
  }

  isDashboardSectionExpanded(sectionId: string): boolean {
    return this.expandedDashboardSections.has(sectionId);
  }

  toggleDashboardSection(sectionId: string): void {
    if (this.expandedDashboardSections.has(sectionId)) {
      this.expandedDashboardSections.delete(sectionId);
    } else {
      this.expandedDashboardSections.add(sectionId);
    }
    this.saveDashboardSectionState();
  }

  private loadDashboardSectionState(): void {
    try {
      const raw = localStorage.getItem(this.dashboardSectionsStorageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }
      const valid = parsed.filter(
        (id): id is string => typeof id === 'string' && this.allDashboardSectionIds.includes(id as any)
      );
      if (valid.length) {
        this.expandedDashboardSections = new Set(valid);
      }
    } catch {
      // ignore invalid saved state
    }
  }

  private saveDashboardSectionState(): void {
    localStorage.setItem(
      this.dashboardSectionsStorageKey,
      JSON.stringify([...this.expandedDashboardSections])
    );
  }

  getTimeAgo(dateStr: any): string {
    if (!dateStr) return '';
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  getPriorityClass(priority: string): string {
    const p = (priority || '').toLowerCase();
    if (p.includes('emergency') || p.includes('urgent')) return 'priority-urgent';
    if (p.includes('high')) return 'priority-high';
    return 'priority-normal';
  }

  get pendingTasks(): { label: string; count: number; icon: string; route: string; tone: string; isAmount?: boolean }[] {
    const tasks = [
      { label: 'Reorder Products', count: this.totalReorderItems, icon: 'bi-exclamation-triangle', route: '/overview/reorder-levels', tone: 'orange' },
      { label: 'Outstanding Payments', count: this.outstandingPayments, icon: 'bi-cash-stack', route: '/overview/cashier', tone: 'teal', isAmount: true },
      { label: 'Near Expiry Stock', count: this.nearExpiryItems, icon: 'bi-hourglass-split', route: '/overview/expired-items', tone: 'red' },
      { label: 'Low Confidence Stock', count: this.lowConfidenceStockItems, icon: 'bi-shield-exclamation', route: '/overview/stock-verification', tone: 'red' },
      { label: 'Open Service Orders', count: this.pendingLabTests + this.pendingScanTests, icon: 'bi-bag-check', route: '/overview/services-management', tone: 'purple' },
      { label: 'Low Stock Products', count: this.criticalStockItems, icon: 'bi-box-seam', route: '/overview/reorder-levels', tone: 'blue' },
    ];
    if (!this.isMdUser()) {
      return tasks.filter((t) => t.label !== 'Outstanding Payments');
    }
    return tasks;
  }

  formatTaskCount(task: { count: number; isAmount?: boolean }): string {
    if (task.isAmount) {
      return this.outstandingPaymentsFormatted;
    }
    return String(task.count ?? 0);
  }

  openQuickLink(route: string): void {
    this.router.navigate([route]);
  }

  private loadStockVerificationAlerts(): void {
    this.api.getStockVerificationDashboard().subscribe({
      next: (data: any) => {
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        this.lowConfidenceStockItems = rows.filter((row: any) =>
          (row?.currentPreview?.confidenceLevelCode || '').toUpperCase() === 'LOW'
        ).length;
        this.cdr.detectChanges();
      },
      error: () => {
        this.lowConfidenceStockItems = 0;
      }
    });
  }

  private loadCounts(): void {
    if (!this.chartsReady) {
      this.isLoading = true;
      this.errorMessage = '';
    }
    this.lastLoadedApiBase = this.apiConfig.getBaseUrl();
    const range = this.resolvePeriodRange();

    this.api.getDashboardSummary(range.from, range.to).subscribe({
      next: (summary) => {
        this.applySummaryResponse(summary || {});
        this.loadStockVerificationAlerts();
        this.isLoading = false;
        this.chartsReady = true;
        this.cdr.detectChanges();
        this.scheduleChartRender();
      },
      error: (err) => this.handleDashboardLoadError(err),
    });
  }

  private applySummaryResponse(summary: any): void {
    this.totalServices = Number(summary.totalServices) || 0;
    this.totalCategories = Number(summary.totalCategories) || 0;
    this.totalClients = Number(summary.totalClients) || 0;
    this.totalItems = Number(summary.totalItems) || 0;
    this.totalVisits = Number(summary.totalVisits) || 0;
    this.totalVisitsLast30 = Number(summary.totalVisitsLast30) || 0;
    this.totalReorderItems = Number(summary.totalReorderItems) || 0;

    this.clientsTrend = this.toNumberArray(summary.clientsTrend);
    this.itemsTrend = this.toNumberArray(summary.itemsTrend);
    this.servicesTrend = this.toNumberArray(summary.servicesTrend);
    this.visitsTrend = this.toNumberArray(summary.visitsTrend);
    this.paymentsTrend = this.toNumberArray(summary.paymentsTrend);
    this.reorderTrend = this.toNumberArray(summary.reorderTrend);

    this.itemsCategoryLabels = Array.isArray(summary.itemsCategoryLabels) ? summary.itemsCategoryLabels : [];
    this.itemsCategoryData = this.toNumberArray(summary.itemsCategoryData);
    this.clientsAgeLabels = Array.isArray(summary.clientsAgeLabels) ? summary.clientsAgeLabels : [];
    this.clientsAgeData = this.toNumberArray(summary.clientsAgeData);

    this.todayAppointments = Number(summary.todayAppointments) || 0;
    this.pendingAppointments = Number(summary.pendingAppointments) || 0;
    this.completedAppointments = Number(summary.completedAppointments) || 0;
    this.admittedClients = Number(summary.admittedClients) || 0;
    this.newAdmissionsToday = Number(summary.newAdmissionsToday) || 0;
    this.dischargesToday = Number(summary.dischargesToday) || 0;
    this.pendingLabTests = Number(summary.pendingLabTests) || 0;
    this.completedLabTests = Number(summary.completedLabTests) || 0;
    this.pendingScanTests = Number(summary.pendingScanTests) || 0;
    this.completedScanTests = Number(summary.completedScanTests) || 0;
    this.criticalStockItems = Number(summary.criticalStockItems) || 0;
    this.nearExpiryItems = Number(summary.nearExpiryItems) || 0;
    this.emergencyCases = Number(summary.emergencyCases) || 0;
    this.criticalClients = Number(summary.criticalClients) || 0;

    this.totalPaymentsReceived = Number(summary.totalPaymentsReceived) || 0;
    this.todayRevenue = Number(summary.todayRevenue) || 0;
    this.weekRevenue = Number(summary.weekRevenue) || 0;
    this.outstandingPayments = Number(summary.outstandingPayments) || 0;

    this.totalPaymentsReceivedFormatted = this.totalPaymentsReceived.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    this.todayRevenueFormatted = this.todayRevenue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    this.weekRevenueFormatted = this.weekRevenue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    this.outstandingPaymentsFormatted = this.outstandingPayments.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    this.recentActivities = Array.isArray(summary.recentActivities) ? summary.recentActivities : [];
    this.upcomingAppointments = Array.isArray(summary.upcomingAppointments) ? summary.upcomingAppointments : [];

    this.buildSparklinePaths();
  }

  private resolvePeriodRange(): { from: string; to: string } {
    if (this.periodSide === 'custom' && this.customFrom && this.customTo) {
      return this.customFrom <= this.customTo
        ? { from: this.customFrom, to: this.customTo }
        : { from: this.customTo, to: this.customFrom };
    }
    const today = this.startOfDay(new Date());
    let from = today;
    let to = today;
    if (this.periodSide === 'last' && this.periodUnit === 'day') {
      from = this.addDays(today, -1);
      to = from;
    } else if (this.periodUnit === 'week') {
      const thisWeek = this.startOfWeek(today);
      from = this.periodSide === 'last' ? this.addDays(thisWeek, -7) : thisWeek;
      to = this.addDays(from, 6);
    } else if (this.periodUnit === 'month') {
      const monthOffset = this.periodSide === 'last' ? -1 : 0;
      from = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      to = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0);
    } else if (this.periodUnit === 'year') {
      const year = today.getFullYear() + (this.periodSide === 'last' ? -1 : 0);
      from = new Date(year, 0, 1);
      to = new Date(year, 11, 31);
    }
    return { from: this.toIso(from), to: this.toIso(to) };
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private startOfWeek(date: Date): Date {
    const start = this.startOfDay(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return this.addDays(start, diff);
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
  }

  private toIso(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private formatChipDate(iso: string): string {
    const [year, month, day] = iso.split('-').map((part) => Number(part));
    if (!year || !month || !day) {
      return iso;
    }
    return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private toNumberArray(value: any): number[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((entry) => Number(entry) || 0);
  }

  private buildSparklinePaths(): void {
    const buildPath = (data: number[], width = 140, height = 36, padding = 2): string => {
      if (!data.length) return '';
      const maxVal = Math.max(...data, 1);
      const step = (width - padding * 2) / (data.length - 1 || 1);
      return data
        .map((v, i) => {
          const x = padding + i * step;
          const y = height - padding - (v / maxVal) * (height - padding * 2);
          return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');
    };
    const toArea = (d: string, width = 140, height = 36): string =>
      d ? `${d} L ${width},${height} L 0,${height} Z` : '';

    this.clientsPath = buildPath(this.clientsTrend);
    this.itemsPath = buildPath(this.itemsTrend);
    this.servicesPath = buildPath(this.servicesTrend);
    this.visitsPath = buildPath(this.visitsTrend);
    this.paymentsPath = buildPath(this.paymentsTrend);
    this.reorderPath = buildPath(this.reorderTrend);

    this.clientsAreaPath = toArea(this.clientsPath);
    this.servicesAreaPath = toArea(this.servicesPath);
    this.visitsAreaPath = toArea(this.visitsPath);
    this.paymentsAreaPath = toArea(this.paymentsPath);
    this.reorderAreaPath = toArea(this.reorderPath);
  }

  private scheduleChartRender(): void {
    const run = () => requestAnimationFrame(() => this.renderCharts());
    const win = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(run, { timeout: 600 });
    } else {
      setTimeout(run, 150);
    }
  }

  private handleDashboardLoadError(err: any): void {
    console.error('API Error:', err);
    if (err?.status === 0) {
      this.errorMessage =
        'Cannot reach the business server (network blocked or offline). Use Change server, or check that the API is running.';
    } else {
      this.errorMessage =
        'Failed to load summary data. ' +
        (err?.error?.message || err?.message || 'Please check your connection and try again.');
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private destroyCharts(): void {
    this.chartInstances.forEach((chart) => {
      try {
        chart.destroy();
      } catch {
        /* chart already released */
      }
    });
    this.chartInstances = [];
  }

  private renderCharts(): void {
    this.destroyCharts();
    const ChartLib = (window as any).Chart;
    const canvas = document.getElementById('revenueOrdersChart') as HTMLCanvasElement | null;
    if (!canvas || !ChartLib) {
      return;
    }
    const labels = ['M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'Now'].slice(-Math.max(this.visitsTrend.length, this.paymentsTrend.length, 1));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const revenueFill = ctx.createLinearGradient(0, 0, 0, 220);
    revenueFill.addColorStop(0, 'rgba(255, 106, 42, 0.28)');
    revenueFill.addColorStop(1, 'rgba(255, 106, 42, 0.02)');
    const ordersFill = ctx.createLinearGradient(0, 0, 0, 220);
    ordersFill.addColorStop(0, 'rgba(34, 160, 107, 0.22)');
    ordersFill.addColorStop(1, 'rgba(34, 160, 107, 0.02)');

    const chart = new ChartLib(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue',
            data: this.paymentsTrend.length ? this.paymentsTrend : [0],
            borderColor: '#ff6a2a',
            backgroundColor: revenueFill,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            borderWidth: 2.5,
            yAxisID: 'y',
          },
          {
            label: 'Orders',
            data: this.visitsTrend.length ? this.visitsTrend : [0],
            borderColor: '#22a06b',
            backgroundColor: ordersFill,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            borderWidth: 2.5,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } },
          },
          y: {
            position: 'left',
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.15)' },
            ticks: { color: '#94a3b8', font: { size: 11 } },
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            ticks: { color: '#94a3b8', font: { size: 11 } },
          },
        },
      },
    });
    this.chartInstances.push(chart);
  }
}
