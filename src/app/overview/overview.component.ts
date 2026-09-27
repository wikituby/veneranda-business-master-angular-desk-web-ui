import { Component, OnInit, OnDestroy, AfterViewInit, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { merge, Subscription } from 'rxjs';
import { ThemeService } from '../services/theme.service';
import { ApiService } from '../services/api.service';
import { SidebarToggleService } from '../services/sidebar-toggle.service';
import { AccessControlService } from '../services/access-control.service';
import { SubscriptionService } from '../services/subscription.service';
import { FacilityBrandingService } from '../services/facility-branding.service';
import { defaultContactValue } from '../utils/phone-contact.util';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css'],
  preserveWhitespaces: false
})
export class OverviewComponent implements OnInit, OnDestroy, AfterViewInit {
  /**
   * Stacked mode: false = expanded docked sidebar, true = icon rail (72px) with hover flyouts.
   * Non-stacked mode: defaults to icon rail; false = full docked sidebar (260px).
   */
  isSidebarCollapsed: boolean = false;
  /** From business settings — sidebar shares space with content (default on). */
  sidebarStacked = true;
  /** Phone/tablet shell: drawer menu instead of a docked sidebar. */
  isMobileViewport = false;
  mobileNavOpen = false;
  private readonly mobileShellMaxWidth = 900;
  /** Non-stacked mode: whole sidebar expands while hovering the icon rail. */
  sidebarRailExpanded = false;
  /** Defer heavy sidebar DOM until after the main router-outlet paints. */
  sidebarReady: boolean = false;
  openMenus: Set<string> = new Set(['dashboard']);
  openSubMenus: Set<string> = new Set();
  activeGroup: string | null = 'dashboard';
  activeSubmenu: string | null = null;
  isDarkMode: boolean = false;
  mdUser: boolean = false;
  /** MD and admin users can open User Management & Roles under Administration. */
  canManageUsers: boolean = false;
  canManageAccessControl: boolean = false;
  subscriptionExpiryWarning: ReturnType<SubscriptionService['getExpiryWarningInfo']> = null;
  
  // User profile properties
  username: string = '';
  userProfilePic: string | null = null;
  readonly defaultProfilePic = 'assets/images/vector.jpeg';
  userEmail: string = '';
  facilityDisplayName = 'Veneranda Hospital';
  facilityLogoUrl = 'assets/images/logo.jpg';
  readonly defaultFacilityLogo = 'assets/images/logo.jpg';
  
  // Profile modal properties
  isProfileModalOpen: boolean = false;
  editMode: boolean = false;
  profileFormData: any = {
    username: '',
    email: '',
    phone: defaultContactValue(),
    department: '',
    qualification: '',
    role: ''
  };
  passwordEditMode: boolean = false;
  passwordFormData: { oldPassword: string; newPassword: string } = {
    oldPassword: '',
    newPassword: '',
  };
  passwordUpdateLoading: boolean = false;
  passwordUpdateMessage: string = '';
  passwordUpdateError: string = '';

  profilePicUploadProgress = 0;
  profilePicUploading = false;
  profilePicUploadMessage = '';
  profilePicUploadError = '';
  showProfilePicChooser = false;
  private readonly profilePicMaxBytes = 5 * 1024 * 1024;
  profilePicHistory: string[] = [];
  private readonly profilePicHistoryLimit = 12;
  private profilePicHistoryLoaded = false;
  private sidebarToggleSubscription?: Subscription;
  private sidebarStackedSubscription?: Subscription;
  private facilityBrandSubscription?: Subscription;
  private themeSubscription?: Subscription;
  private routerSubscription?: Subscription;
  private expiryTicker?: ReturnType<typeof setInterval>;
  private destroyed = false;
  private navScrollHandler: (() => void) | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private themeService: ThemeService,
    private elementRef: ElementRef,
    private api: ApiService,
    private sidebarToggleService: SidebarToggleService,
    private cdr: ChangeDetectorRef,
    private accessControl: AccessControlService,
    private subscription: SubscriptionService,
    private facilityBranding: FacilityBrandingService
  ) {}

  ngOnInit(): void {
    const userRole = sessionStorage.getItem('userrole');

    const userName = sessionStorage.getItem('username');
    
    // Load user profile information
    this.username = userName || 'User';
    this.userProfilePic = sessionStorage.getItem('userProfilePic') || this.defaultProfilePic;
    this.userEmail = sessionStorage.getItem('useremail') || '';
    
    // Attach scroll listener after first paint (collapsed sidebar positioning).
    setTimeout(() => {
      if (this.destroyed) {
        return;
      }
      const navElement = this.elementRef.nativeElement.querySelector('.nav');
      if (navElement) {
        this.navScrollHandler = () => {
          if (this.destroyed || !this.collapsedFlyoutMode || !this.activeGroup) {
            return;
          }
          setTimeout(() => {
            if (!this.destroyed && this.activeGroup) {
              this.positionDropdownElements(this.activeGroup);
            }
          }, 50);
        };
        navElement.addEventListener('scroll', this.navScrollHandler, { passive: true });
      }
    }, 500);
    
    // Initialize profile form data
    this.profileFormData = this.buildProfileFormData(userRole || '');




    if (userName === null) {
      this.router.navigate(['/login']);
    }else{
      if (userRole === "customer"){
        this.router.navigate(['/landingpage']);

      }
    }

    if ((userRole || '').toString().toLowerCase().trim() === 'md') {
      this.mdUser = true;
    }
    const roleNorm = (userRole || '').toString().toLowerCase().trim();
    this.canManageUsers = roleNorm === 'md' || roleNorm === 'admin';
    this.canManageAccessControl = this.canManageUsers;
    this.accessControl.refreshFromSession();
    this.subscription.refreshFromSession();
    this.updateSubscriptionExpiryWarning();
    this.route.queryParamMap.subscribe((params) => {
      if (this.destroyed) {
        return;
      }
      if (params.get('accessDenied')) {
        this.showUnauthorizedAccessMessage();
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { accessDenied: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
    this.subscription.loadStatus().subscribe({
      next: () => this.updateSubscriptionExpiryWarning(),
      error: () => { /* guard falls back to session cache */ }
    });
    this.expiryTicker = setInterval(() => this.updateSubscriptionExpiryWarning(), 60_000);
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    this.updateMobileViewport();
    this.sidebarToggleSubscription = this.sidebarToggleService.overviewSidebarToggle$.subscribe(() => {
      this.toggleSidebar();
    });

    this.applySidebarLayoutMode(this.facilityBranding.getSidebarStacked());
    this.refreshFacilityBrand();
    this.facilityBrandSubscription = merge(
      this.facilityBranding.loginFacilityName$,
      this.facilityBranding.loginFacilityLogo$
    ).subscribe(() => this.refreshFacilityBrand());
    this.facilityBranding.load().subscribe({
      next: () => {
        this.refreshFacilityBrand();
        this.applySidebarLayoutMode(this.facilityBranding.getSidebarStacked());
      },
      error: () => {
        this.refreshFacilityBrand();
        this.applySidebarLayoutMode(this.facilityBranding.getSidebarStacked());
      },
    });
    this.sidebarStackedSubscription = this.facilityBranding.sidebarStacked$.subscribe((stacked) =>
      this.applySidebarLayoutMode(stacked)
    );
    this.syncHeaderSidebarOffset();

    this.applyActiveRoute(this.router.url);
    this.routerSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        if (this.isMobileViewport) {
          this.closeMobileNav();
        } else if (!this.sidebarStacked) {
          this.collapseSidebarToIconRail();
        }
        this.applyActiveRoute(event.urlAfterRedirects);
        return;
      }
      if (event instanceof NavigationStart) {
        this.applyDepartmentSidebarCollapse(this.resolveOverviewSegment(event.url));
      }
    });
  }

  /** Last path segment under /overview/* (e.g. lab, scan). */
  private resolveOverviewSegment(url: string): string {
    const path = url.split('?')[0];
    const routeParts = path.split('/').filter(Boolean);
    if (!routeParts.includes('overview')) {
      return '';
    }
    return routeParts[routeParts.length - 1] || '';
  }

  /** Wide workspace pages that should open on the icon rail. */
  private shouldCollapseSidebarForSegment(segment: string): boolean {
    return (
      segment === 'messages' ||
      segment === 'otc-dispensary' ||
      segment === 'consultation-v2' ||
      segment === 'clienttransactions'
    );
  }

  private isDepartmentSegment(_segment: string): boolean {
    return false;
  }

  /** Pharmacy, Client Transactions, and messages always use a collapsed sidebar for more workspace. */
  private applyDepartmentSidebarCollapse(segment: string): void {
    if (this.shouldCollapseSidebarForSegment(segment)) {
      this.collapseSidebarToIconRail();
    }
  }

  /** Position flyout menus after DOM updates (collapsed icon rail). */
  get collapsedFlyoutMode(): boolean {
    return !this.isMobileViewport && this.sidebarStacked && this.isSidebarCollapsed;
  }

  /** Sidebar username: first letter uppercase, rest lowercase. */
  get displayUsername(): string {
    const raw = String(this.username || '').trim();
    if (!raw) {
      return '';
    }
    const lower = raw.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  /** Sidebar email is always lowercase. */
  get displayUserEmail(): string {
    return String(this.userEmail || '').trim().toLowerCase();
  }

  onSidebarMouseEnter(): void {
    if (this.isMobileViewport) {
      return;
    }
    if (!this.sidebarStacked) {
      this.sidebarRailExpanded = true;
      if (this.activeGroup) {
        this.openMenus.add(this.activeGroup);
      }
    }
  }

  onSidebarMouseLeave(): void {
    if (this.isMobileViewport) {
      return;
    }
    if (!this.sidebarStacked) {
      this.sidebarRailExpanded = false;
      this.openMenus.clear();
    }
  }

  private refreshCollapsedFlyout(): void {
    if (!this.collapsedFlyoutMode || this.openMenus.size === 0) {
      return;
    }
    const menuKey = this.activeGroup || Array.from(this.openMenus)[0];
    if (!menuKey) {
      return;
    }
    setTimeout(() => {
      if (this.destroyed) {
        return;
      }
      this.cdr.detectChanges();
      this.positionDropdownElements(menuKey);
    }, 120);
  }

  isOnDepartmentPage(): boolean {
    return this.isDepartmentSegment(this.activeSubmenu || '');
  }

  /** Keep sidebar highlight/menus in sync when navigating (e.g. from header Inventory links). */
  private applyActiveRoute(url: string): void {
    const path = url.split('?')[0];
    const routeParts = path.split('/').filter(Boolean);
    if (!routeParts.includes('overview')) {
      return;
    }

    const segment = routeParts[routeParts.length - 1] || 'main-dashboard';
    this.activeSubmenu = segment;
    this.applyDepartmentSidebarCollapse(segment);

    const dashboardRoutes = new Set(['overview', 'main-dashboard']);
    if (dashboardRoutes.has(this.activeSubmenu || '')) {
      this.openMenus.add('dashboard');
      this.activeGroup = 'dashboard';
      this.activeSubmenu = this.activeSubmenu === 'overview' ? 'main-dashboard' : this.activeSubmenu;
    }

    if (
      this.activeSubmenu === 'user-management' ||
      this.activeSubmenu === 'department-setup' ||
      this.activeSubmenu === 'business-settings' ||
      this.activeSubmenu === 'website-contact-messages' ||
      this.activeSubmenu === 'special-privileges' ||
      this.activeSubmenu === 'data-backup' ||
      this.activeSubmenu === 'system-documentation' ||
      this.activeSubmenu === 'access-control' ||
      this.activeSubmenu === 'subscription' ||
      this.activeSubmenu === 'momo-settings' ||
      this.activeSubmenu === 'mobile-money-settings' ||
      this.activeSubmenu === 'payment'
    ) {
      this.openMenus.add('administration');
      this.activeGroup = 'administration';
    }

    const financeRoutes = [
      'dashboard',
      'finance-dashboard',
      'service-charges',
      'cashier',
      'insurance-billing',
      'refunds',
      'expenses',
      'expense-categories',
      'expense-accounts',
      'expense-transactions',
      'expense-analytics',
      'loan-management',
      'income-management',
      'income-transactions',
      'income-accounts',
      'income-categories',
      'finance-reports',
      'corporate-billing',
    ];
    if (financeRoutes.includes(this.activeSubmenu || '')) {
      this.openMenus.add('finance');
      this.activeGroup = 'finance';
    }

    const expenseSubRoutes = ['expenses', 'expense-categories', 'expense-accounts', 'expense-transactions', 'expense-analytics'];
    if (expenseSubRoutes.includes(this.activeSubmenu || '')) {
      this.openSubMenus.add('expense-management');
    }

    const incomeSubRoutes = ['income-management', 'income-transactions', 'income-accounts', 'income-categories'];
    if (incomeSubRoutes.includes(this.activeSubmenu || '')) {
      this.openSubMenus.add('income-management');
    }

    if (
      this.activeSubmenu === 'lab-test-requests' ||
      this.activeSubmenu === 'sample-collection' ||
      this.activeSubmenu === 'test-processing' ||
      this.activeSubmenu === 'lab-results' ||
      this.activeSubmenu === 'lab-reports' ||
      this.activeSubmenu === 'lab-equipment-tracking'
    ) {
      this.openMenus.add('laboratory');
      this.activeGroup = 'laboratory';
    }

    const inventoryItemRoutes = ['consumable-items', 'asset-management'];
    const inventoryStockRoutes = [
      'suppliers', 'manufacturers', 'adjustments', 'stock-receive', 'stock-batch',
      'stock-transfer', 'stock-tracking', 'stock-verification', 'stock-initializer', 'stock-taking', 'expired-items', 'reorder-levels',
    ];
    const inventoryStoreRoutes = ['store-management', 'store-reports', 'store-analytics'];
    const inventoryRoutes = [
      ...inventoryItemRoutes,
      ...inventoryStockRoutes,
      ...inventoryStoreRoutes,
      'inventory-dashboard',
    ];

    if (inventoryRoutes.includes(this.activeSubmenu || '')) {
      this.openMenus.add('inventory');
      this.activeGroup = 'inventory';
    }

    if (inventoryStoreRoutes.includes(this.activeSubmenu || '')) {
      this.openSubMenus.add('store-management');
    }

    if (inventoryStockRoutes.includes(this.activeSubmenu || '')) {
      this.openSubMenus.add('stock-management');
    }

    if (inventoryItemRoutes.includes(this.activeSubmenu || '')) {
      this.openSubMenus.add('item-management');
    }

    if (this.activeSubmenu === 'services-management' || this.activeSubmenu === 'service-categories' || this.activeSubmenu === 'service-types') {
      this.openMenus.add('services');
    }

    if (this.activeSubmenu === 'client-groups' || this.activeSubmenu === 'all-clients' || this.activeSubmenu === 'queue-management') {
      this.openMenus.add('client-management');
      this.activeGroup = 'client-management';
    }

    if (this.activeSubmenu === 'otc-dispensary') {
      this.openMenus.add('sales');
      this.activeGroup = 'sales';
    }

    if (
      this.activeSubmenu === 'consultation-v2' ||
      this.activeSubmenu === 'clienttransactions'
    ) {
      this.openMenus.add('consultations-center');
      this.activeGroup = 'consultations-center';
    }

    if (
      this.activeSubmenu === 'pharmacy-dispensing' ||
      this.activeSubmenu === 'pharmacy-pricing' ||
      this.activeSubmenu === 'pharmacy-purchase-orders' ||
      this.activeSubmenu === 'pharmacy-expiry-alerts' ||
      this.activeSubmenu === 'pharmacy-suppliers'
    ) {
      this.openMenus.add('sales');
      this.activeGroup = 'sales';
    }

    if (this.shouldCollapseSidebarForSegment(this.activeSubmenu || '')) {
      this.isSidebarCollapsed = true;
      this.openMenus.clear();
    }

    this.finalizeSidebarMenusAfterRouteSync();
  }

  /** In icon-rail mode, keep route highlight but don't open submenus until the rail expands. */
  private finalizeSidebarMenusAfterRouteSync(): void {
    if (!this.sidebarStacked && !this.sidebarRailExpanded) {
      this.openMenus.clear();
    }
    if (this.collapsedFlyoutMode) {
      this.refreshCollapsedFlyout();
    }
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.destroyed) {
          return;
        }
        this.sidebarReady = true;
        this.cdr.detectChanges();
        this.finalizeSidebarMenusAfterRouteSync();
        this.syncHeaderSidebarOffset();
      });
    });
  }

  applySidebarLayoutMode(stacked: boolean): void {
    const wasStacked = this.sidebarStacked;
    this.sidebarStacked = stacked;
    if (stacked) {
      if (!wasStacked) {
        this.isSidebarCollapsed = false;
      }
    } else {
      this.isSidebarCollapsed = true;
      this.sidebarRailExpanded = false;
      this.openMenus.clear();
    }
    this.cdr.detectChanges();
    this.syncHeaderSidebarOffset();
  }

  onSidebarMenuBtnClick(): void {
    this.toggleSidebar();
  }

  toggleSidebar(): void {
    if (!this.sidebarReady) {
      this.sidebarReady = true;
    }
    if (this.isMobileViewport) {
      this.mobileNavOpen = !this.mobileNavOpen;
      this.cdr.detectChanges();
      return;
    }
    if (!this.sidebarStacked) {
      this.sidebarRailExpanded = !this.sidebarRailExpanded;
      if (!this.sidebarRailExpanded) {
        this.openMenus.clear();
      } else if (this.activeGroup) {
        this.openMenus.add(this.activeGroup);
      }
      this.cdr.detectChanges();
      this.syncHeaderSidebarOffset();
      return;
    }
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    if (this.isSidebarCollapsed) {
      this.openMenus.clear();
      this.activeGroup = null;
    }
    this.cdr.detectChanges();
    this.syncHeaderSidebarOffset();
  }

  /** Collapse docked sidebar back to the icon rail (non-stacked expanded mode). */
  private collapseSidebarToIconRail(): void {
    if (this.sidebarStacked) {
      if (!this.isSidebarCollapsed) {
        this.isSidebarCollapsed = true;
        this.openMenus.clear();
        this.cdr.detectChanges();
        this.syncHeaderSidebarOffset();
      }
      return;
    }
    if (this.sidebarRailExpanded) {
      this.sidebarRailExpanded = false;
    }
    this.openMenus.clear();
    this.cdr.detectChanges();
    this.syncHeaderSidebarOffset();
  }

  /**
   * Keep the global header flush with the docked sidebar column (university-style shell).
   * Rail hover-expand still reserves 72px so the header does not jump.
   */
  private syncHeaderSidebarOffset(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      this.sidebarToggleService.setSidebarOffset(0);
      return;
    }
    let width = 260;
    if (!this.sidebarStacked || this.isSidebarCollapsed) {
      width = 72;
    }
    this.sidebarToggleService.setSidebarOffset(width);
  }

  /**
   * After navigation, non-stacked layout returns to the icon rail for more workspace.
   */
  private closeSidebarIfOverlay(): void {
    if (this.isMobileViewport) {
      this.closeMobileNav();
      return;
    }
    if (!this.sidebarStacked) {
      this.collapseSidebarToIconRail();
    }
  }

  closeMobileNav(): void {
    if (!this.mobileNavOpen) {
      return;
    }
    this.mobileNavOpen = false;
    this.cdr.detectChanges();
  }

  private updateMobileViewport(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const next = window.innerWidth <= this.mobileShellMaxWidth;
    if (this.isMobileViewport === next) {
      return;
    }
    this.isMobileViewport = next;
    if (!next) {
      this.mobileNavOpen = false;
    }
    this.syncHeaderSidebarOffset();
  }

  closeSidebar(): void {
    if (this.isMobileViewport) {
      this.closeMobileNav();
      return;
    }
    this.collapseSidebarToIconRail();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.sidebarToggleService.clearSidebarOffset();
    if (this.expiryTicker) {
      clearInterval(this.expiryTicker);
    }
    this.sidebarToggleSubscription?.unsubscribe();
    this.sidebarStackedSubscription?.unsubscribe();
    this.facilityBrandSubscription?.unsubscribe();
    this.themeSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
    const navElement = this.elementRef.nativeElement.querySelector('.nav');
    if (navElement && this.navScrollHandler) {
      navElement.removeEventListener('scroll', this.navScrollHandler);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  private refreshFacilityBrand(): void {
    this.facilityDisplayName = this.facilityBranding.getFacilityName();
    this.facilityLogoUrl = this.facilityBranding.getLogoUrlForDisplay();
  }

  onFacilityLogoError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src.includes('logo.jpg')) {
      return;
    }
    img.src = this.defaultFacilityLogo;
    this.facilityLogoUrl = this.defaultFacilityLogo;
  }

  toggleMenu(menuKey: string): void {
    // Stacked + collapsed: flyout menus beside the icon rail
    if (this.collapsedFlyoutMode) {
      if (this.openMenus.has(menuKey)) {
        this.openMenus.delete(menuKey);
        this.activeGroup = null;
      } else {
        // Close all other menus first
        this.openMenus.clear();
        this.openMenus.add(menuKey);
        this.activeGroup = menuKey;
        this.refreshCollapsedFlyout();
      }
    } else {
      // Normal behavior when sidebar is expanded
      if (this.openMenus.has(menuKey)) {
        this.openMenus.delete(menuKey);
      } else {
        this.openMenus.add(menuKey);
      }
      this.activeGroup = menuKey;
    }
  }

  positionDropdownElements(menuKey: string): void {
    if (this.destroyed || !this.collapsedFlyoutMode || !menuKey) return;
    
    // Use setTimeout with multiple requestAnimationFrame to ensure Angular has rendered the DOM
    setTimeout(() => {
      if (this.destroyed) return;
      requestAnimationFrame(() => {
        if (this.destroyed) return;
        requestAnimationFrame(() => {
          if (this.destroyed) return;
          // Find nav-group by checking for menu-open class or active class with matching menuKey
          const navGroups = this.elementRef.nativeElement.querySelectorAll('.nav-group');
          let navGroup: HTMLElement | null = null;
          
          // Find the nav-group that has menu-open class or active class with matching activeGroup
          navGroups.forEach((group: Element) => {
            const htmlGroup = group as HTMLElement;
            // Check if this is the active group
            const isActive = htmlGroup.classList.contains('active') && this.activeGroup === menuKey;
            // Check if this group has menu-open class (Angular adds it via binding)
            const isMenuOpen = htmlGroup.classList.contains('menu-open');
            
            if (isActive || isMenuOpen) {
              navGroup = htmlGroup;
            }
          });
          
          if (!navGroup) {
            // Fallback: find any nav-group with menu-open class (should be only one)
            navGroups.forEach((group: Element) => {
              const htmlGroup = group as HTMLElement;
              if (htmlGroup.classList.contains('menu-open')) {
                navGroup = htmlGroup;
              }
            });
          }
          
          if (!navGroup) {
            return; // Silently return if nav-group not found
          }
          
          // Wait a bit more for Angular to render the *ngIf elements
          setTimeout(() => {
            if (this.destroyed) return;
            const titlePopup = navGroup!.querySelector('.menu-title-popup') as HTMLElement;
            const submenu = navGroup!.querySelector('.submenu') as HTMLElement;
            
            if (!titlePopup || !submenu) {
              return; // Silently return if elements not found
            }
            
            const rect = navGroup!.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // Get actual heights after rendering
            const titleHeight = titlePopup.offsetHeight || 40;
            const submenuHeight = submenu.scrollHeight || submenu.offsetHeight || 300;
            
            // Check if menu should be positioned upward
            // Only dropup if nav-group is at more than 60% of viewport height
            const positionPercentage = (rect.top / viewportHeight) * 100;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            const totalHeight = titleHeight + submenuHeight;
            const isUpward = positionPercentage > 60 && spaceBelow < totalHeight && spaceAbove > totalHeight;
            
            // Update menu-upward class
            if (isUpward) {
              navGroup!.classList.add('menu-upward');
            } else {
              navGroup!.classList.remove('menu-upward');
            }
            
            if (isUpward) {
              // Position upward: title div at bottom (closest to nav-group), submenu on top
              // Calculate bottom position from viewport top
              const titleBottom = viewportHeight - rect.top;
              const submenuBottom = titleBottom + titleHeight;
              
              // Position title popup at bottom (closest to nav-group)
              titlePopup.style.top = 'auto';
              titlePopup.style.bottom = `${titleBottom}px`;
              titlePopup.style.left = `${rect.right + 12}px`;
              titlePopup.style.display = 'block';
              
              // Position submenu above title popup
              submenu.style.top = 'auto';
              submenu.style.bottom = `${submenuBottom}px`;
              submenu.style.left = `${rect.right + 12}px`;
              submenu.style.display = 'flex';
            } else {
              // Position downward: title popup first, then submenu below it
              titlePopup.style.top = `${rect.top}px`;
              titlePopup.style.bottom = 'auto';
              titlePopup.style.left = `${rect.right + 12}px`;
              titlePopup.style.display = 'block';
              
              submenu.style.top = `${rect.top + titleHeight}px`;
              submenu.style.bottom = 'auto';
              submenu.style.left = `${rect.right + 12}px`;
              submenu.style.display = 'flex';
            }
          }, 50);
        });
      });
    }, 10);
  }


  checkDropdownPosition(menuKey: string): void {
    if (!this.collapsedFlyoutMode) return;
    
    // This function is now handled by positionDropdownElements
    // Keeping it for backward compatibility but the logic is in positionDropdownElements
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateMobileViewport();
    this.syncHeaderSidebarOffset();
    if (this.collapsedFlyoutMode && this.openMenus.size > 0) {
      const menuKey = Array.from(this.openMenus)[0];
      this.checkDropdownPosition(menuKey);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isMobileViewport && this.mobileNavOpen) {
      this.closeMobileNav();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.collapsedFlyoutMode && this.openMenus.size > 0) {
      const menuKey = Array.from(this.openMenus)[0];
      this.checkDropdownPosition(menuKey);
    }
  }
  
  isMenuOpen(menuKey: string): boolean {
    return this.openMenus.has(menuKey);
  }

  toggleSubMenu(subMenuKey: string): void {
    if (this.openSubMenus.has(subMenuKey)) {
      this.openSubMenus.delete(subMenuKey);
    } else {
      this.openSubMenus.add(subMenuKey);
    }
  }

  isSubMenuOpen(subMenuKey: string): boolean {
    return this.openSubMenus.has(subMenuKey);
  }

  navigateTo(route: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    const normalizedRoute = route.replace(/^\//, '');
    const routeParts = normalizedRoute.split('/').filter(Boolean);
    const segment = routeParts[routeParts.length - 1];

    if (segment && !this.canAccessPage(segment)) {
      this.showUnauthorizedAccessMessage();
      return;
    }

    this.activeSubmenu = segment;
    this.closeSidebarIfOverlay();
    this.router.navigate(['/', ...routeParts]);
  }

  showUnauthorizedAccessMessage(): void {
    window.alert(AccessControlService.UNAUTHORIZED_MESSAGE);
  }

  canAccessPage(pageKey: string): boolean {
    return this.accessControl.canAccessPage(pageKey);
  }

  canAccessNavGroup(groupKey: string): boolean {
    return this.subscription.canAccessNavGroup(groupKey);
  }

  isMdUser(): boolean {
    const role = (sessionStorage.getItem('userrole') || '').toLowerCase().trim();
    return role === 'md';
  }

  updateSubscriptionExpiryWarning(): void {
    this.subscriptionExpiryWarning = this.subscription.getExpiryWarningInfo();
  }

  goToSubscriptionRenewal(): void {
    this.closeSidebarIfOverlay();
    this.router.navigate(['/overview/subscription']);
  }

  dismissSubscriptionExpiryBanner(): void {
    this.subscription.dismissExpiryBanner();
    this.updateSubscriptionExpiryWarning();
  }

  get subscriptionExpiryEndLabel(): string {
    return this.subscription.formatPeriodEndDate(this.subscriptionExpiryWarning?.periodEnd);
  }

  /** True for roles that must not use the legacy Balance Sheet /dashboard route. */
  isClinicalRoleBlockedFromDashboard(): boolean {
    const role = (sessionStorage.getItem('userrole') || '')
      .toString()
      .toLowerCase()
      .trim();
    return role === 'clinician' || role === 'doctor';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Only handle clicks outside if flyout menus are open (stacked collapsed mode)
    if (this.collapsedFlyoutMode && this.openMenus.size > 0) {
      const target = event.target as HTMLElement;
      const sidebarElement = this.elementRef.nativeElement.querySelector('.sidebar');
      const navGroupElements = this.elementRef.nativeElement.querySelectorAll('.nav-group');
      
      // Check if click is inside sidebar or on popup menus
      let clickedInsideMenu = false;
      
      // Check if click is inside the sidebar itself (including icon area)
      if (sidebarElement && sidebarElement.contains(target)) {
        clickedInsideMenu = true;
      }
      
      // Check if click is on any nav group button or its children
      navGroupElements.forEach((navGroup: HTMLElement) => {
        const navGroupButton = navGroup.querySelector('.nav-group-title');
        const submenu = navGroup.querySelector('.submenu');
        const titleSpan = navGroup.querySelector('.nav-group-title span');
        const nestedSubmenu = navGroup.querySelector('.nested-submenu');
        
        // Check if click is on the button or its children (icons, span)
        if (navGroupButton && navGroupButton.contains(target)) {
          clickedInsideMenu = true;
        }
        
        // Check if click is on the popup submenu or any of its items
        if (submenu && submenu.contains(target)) {
          clickedInsideMenu = true;
        }
        
        // Check if click is on the popup title span
        if (titleSpan && titleSpan.contains(target)) {
          clickedInsideMenu = true;
        }
        
        // Check if click is on nested submenu
        if (nestedSubmenu && nestedSubmenu.contains(target)) {
          clickedInsideMenu = true;
        }
      });
      
      // If clicked outside, close all menus
      if (!clickedInsideMenu) {
        this.openMenus.clear();
        this.activeGroup = null;
      }
    }
    // When sidebar is expanded, don't close menus on document click - let them stay open
  }

  openProfileModal(): void {
    this.isProfileModalOpen = true;
    this.editMode = false;
    this.profilePicUploadError = '';
    this.profilePicUploadMessage = '';
    this.profilePicUploadProgress = 0;
    this.passwordEditMode = false;
    this.passwordFormData = { oldPassword: '', newPassword: '' };
    this.passwordUpdateLoading = false;
    this.passwordUpdateMessage = '';
    this.passwordUpdateError = '';

    const rawId = sessionStorage.getItem('userid');
    const userId = rawId != null && rawId !== '' ? Number(rawId) : NaN;
    if (!this.profilePicHistoryLoaded && Number.isFinite(userId) && userId > 0) {
      this.profilePicHistoryLoaded = true;
      this.loadProfilePicHistory(userId);
    }

    // Load current profile data
    this.profileFormData = this.buildProfileFormData(sessionStorage.getItem('userrole') || '');
  }

  private buildProfileFormData(role: string): any {
    return {
      username: this.username,
      email: this.userEmail,
      phone: sessionStorage.getItem('userPhone')?.trim() || defaultContactValue(),
      department: sessionStorage.getItem('userDepartment') || '',
      qualification: this.getStoredQualification(),
      role: role || '',
    };
  }

  private getStoredQualification(): string {
    const fromKey = sessionStorage.getItem('userQualification') || '';
    const raw = sessionStorage.getItem('userDetails');
    if (!raw) {
      return fromKey;
    }
    try {
      const details = JSON.parse(raw);
      return (
        details?.qualification ||
        details?.education ||
        details?.title ||
        fromKey ||
        ''
      );
    } catch {
      return fromKey;
    }
  }

  closeProfileModal(): void {
    this.isProfileModalOpen = false;
    this.editMode = false;
    this.passwordEditMode = false;
  }

  onUserProfilePicError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src.includes('vector.jpeg')) {
      return;
    }
    img.src = this.defaultProfilePic;
    this.userProfilePic = this.defaultProfilePic;
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
  }

  togglePasswordEditMode(): void {
    this.passwordEditMode = !this.passwordEditMode;
    if (!this.passwordEditMode) {
      this.passwordFormData = { oldPassword: '', newPassword: '' };
      this.passwordUpdateMessage = '';
      this.passwordUpdateError = '';
    }
  }

  updatePassword(): void {
    this.passwordUpdateMessage = '';
    this.passwordUpdateError = '';

    const oldPassword = (this.passwordFormData.oldPassword || '').trim();
    const newPassword = (this.passwordFormData.newPassword || '').trim();

    if (!oldPassword || !newPassword) {
      this.passwordUpdateError = 'Please enter old and new password.';
      return;
    }

    const rawId = sessionStorage.getItem('userid');
    const userId = rawId != null && rawId !== '' ? Number(rawId) : NaN;
    if (!Number.isFinite(userId) || userId < 1) {
      this.passwordUpdateError = 'Missing user id. Please sign in again.';
      return;
    }

    this.passwordUpdateLoading = true;
    this.api.updatePassword(userId, oldPassword, newPassword).subscribe({
      next: (res: any) => {
        this.passwordUpdateLoading = false;
        this.passwordUpdateMessage = res?.message || 'Password updated successfully.';
        this.passwordFormData = { oldPassword: '', newPassword: '' };
        this.passwordEditMode = false;
      },
      error: (err: any) => {
        this.passwordUpdateLoading = false;
        this.passwordUpdateError =
          err?.error?.message || err?.message || 'Failed to update password.';
      },
    });
  }

  async onProfilePictureSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.profilePicUploadError = '';
    this.profilePicUploadMessage = '';

    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.profilePicUploadError = 'Please choose an image file.';
      return;
    }
    if (file.size > this.profilePicMaxBytes) {
      this.profilePicUploadError = 'Image must be 5 MB or smaller.';
      return;
    }

    const rawId = sessionStorage.getItem('userid');
    const userId = rawId != null && rawId !== '' ? Number(rawId) : NaN;
    if (!Number.isFinite(userId) || userId < 1) {
      this.profilePicUploadError = 'Missing user id. Please sign in again.';
      return;
    }

    const contentType = file.type || 'image/jpeg';
    const fileName = file.name || 'profile-picture.jpg';

    this.profilePicUploading = true;
    this.profilePicUploadProgress = 10;

    try {
      const croppedFile = await this.cropImageToSquare(file, 512);
      this.profilePicUploadProgress = 30;

      this.api.uploadProfilePictureToCloudinary(croppedFile).subscribe({
        next: (fileUrl: string) => {
          this.profilePicUploadProgress = 70;
          this.api.updateProfilePic(userId, fileUrl).subscribe({
            next: (res: any) => {
              const d = res?.data ?? res;
              const savedProfilePic = d?.profilePic ?? fileUrl;
              this.userProfilePic = savedProfilePic;
              sessionStorage.setItem('userProfilePic', savedProfilePic);
              this.saveProfilePicHistory(userId, savedProfilePic);
              const rawDetails = sessionStorage.getItem('userDetails');
              if (rawDetails) {
                try {
                  const details = JSON.parse(rawDetails);
                  details.profilePic = savedProfilePic;
                  sessionStorage.setItem('userDetails', JSON.stringify(details));
                } catch {
                  /* ignore */
                }
              }
              this.profilePicUploadMessage = 'Profile picture updated.';
              this.profilePicUploadProgress = 100;
              this.profilePicUploading = false;
              this.showProfilePicChooser = false;
            },
            error: (err: any) => {
              this.profilePicUploadError =
                err?.error?.message || err?.message || 'Failed to save profile picture.';
              this.profilePicUploadProgress = 0;
              this.profilePicUploading = false;
            },
          });
        },
        error: (err: any) => {
          this.profilePicUploadError = err?.message || 'Failed to upload image to Cloudinary.';
          this.profilePicUploadProgress = 0;
          this.profilePicUploading = false;
        }
      });
    } catch (err: any) {
      this.profilePicUploadError = err?.message || 'Upload failed while sending image to Cloudinary.';
      this.profilePicUploadProgress = 0;
      this.profilePicUploading = false;
    }
  }

  applyProfilePictureFromHistory(imageUrl: string): void {
    const rawId = sessionStorage.getItem('userid');
    const userId = rawId != null && rawId !== '' ? Number(rawId) : NaN;
    if (!Number.isFinite(userId) || userId < 1) {
      this.profilePicUploadError = 'Missing user id. Please sign in again.';
      return;
    }

    this.profilePicUploadError = '';
    this.profilePicUploadMessage = '';
    this.profilePicUploading = true;
    this.profilePicUploadProgress = 30;

    this.api.updateProfilePic(userId, imageUrl).subscribe({
      next: (res: any) => {
        const d = res?.data ?? res;
        const savedProfilePic = d?.profilePic ?? imageUrl;
        this.userProfilePic = savedProfilePic;
        sessionStorage.setItem('userProfilePic', savedProfilePic);
        this.saveProfilePicHistory(userId, savedProfilePic);
        this.profilePicUploadMessage = 'Profile picture updated.';
        this.profilePicUploadProgress = 100;
        this.profilePicUploading = false;
        this.showProfilePicChooser = false;
      },
      error: (err: any) => {
        this.profilePicUploadError =
          err?.error?.message || err?.message || 'Failed to save profile picture.';
        this.profilePicUploadProgress = 0;
        this.profilePicUploading = false;
      },
    });
  }

  removeProfilePictureFromHistory(imageUrl: string): void {
    const rawId = sessionStorage.getItem('userid');
    const userId = rawId != null && rawId !== '' ? Number(rawId) : NaN;
    if (!Number.isFinite(userId) || userId < 1) {
      return;
    }
    const key = this.getProfilePicHistoryKey(userId);
    this.profilePicHistory = this.profilePicHistory.filter((u) => u !== imageUrl);
    localStorage.setItem(key, JSON.stringify(this.profilePicHistory));
  }

  private getProfilePicHistoryKey(userId: number): string {
    return `profilePicHistory_${userId}`;
  }

  private loadProfilePicHistory(userId: number): void {
    const key = this.getProfilePicHistoryKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      this.profilePicHistory = [];
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      this.profilePicHistory = Array.isArray(parsed) ? parsed.filter((u) => typeof u === 'string') : [];
    } catch {
      this.profilePicHistory = [];
    }
  }

  private saveProfilePicHistory(userId: number, imageUrl: string): void {
    const key = this.getProfilePicHistoryKey(userId);
    const merged = [imageUrl, ...this.profilePicHistory.filter((u) => u !== imageUrl)].slice(
      0,
      this.profilePicHistoryLimit
    );
    this.profilePicHistory = merged;
    localStorage.setItem(key, JSON.stringify(merged));
  }

  private async cropImageToSquare(file: File, size: number = 512): Promise<File> {
    const img = await this.loadImageElement(file);
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    const side = Math.min(srcW, srcH);
    const sx = Math.floor((srcW - side) / 2);
    const sy = Math.floor((srcH - side) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not prepare image crop canvas.');
    }
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to crop image.'));
        },
        'image/jpeg',
        0.9
      );
    });

    const baseName = (file.name || 'profile').replace(/\.[^/.]+$/, '');
    return new File([blob], `${baseName}-square.jpg`, { type: 'image/jpeg' });
  }

  private loadImageElement(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Invalid image file.'));
        img.src = String(reader.result || '');
      };
      reader.onerror = () => reject(new Error('Could not read selected image.'));
      reader.readAsDataURL(file);
    });
  }

  saveProfileChanges(): void {
    // Save profile changes
    this.username = this.profileFormData.username;
    this.userEmail = this.profileFormData.email;
    
    // Update sessionStorage
    sessionStorage.setItem('username', this.profileFormData.username);
    sessionStorage.setItem('useremail', this.profileFormData.email);
    if (this.profileFormData.phone) {
      sessionStorage.setItem('userPhone', this.profileFormData.phone);
    }
    if (this.profileFormData.department) {
      sessionStorage.setItem('userDepartment', this.profileFormData.department);
    }
    sessionStorage.setItem(
      'userQualification',
      String(this.profileFormData.qualification || '').trim()
    );

    const rawDetails = sessionStorage.getItem('userDetails');
    if (rawDetails) {
      try {
        const details = JSON.parse(rawDetails);
        details.username = this.profileFormData.username;
        details.email = this.profileFormData.email;
        if (this.profileFormData.phone) {
          details.phone = this.profileFormData.phone;
          details.contact = this.profileFormData.phone;
        }
        if (this.profileFormData.department) {
          details.department = this.profileFormData.department;
        }
        details.qualification = String(this.profileFormData.qualification || '').trim();
        sessionStorage.setItem('userDetails', JSON.stringify(details));
      } catch {
        // Keep other session keys even if userDetails is corrupt.
      }
    }

    const rawId = sessionStorage.getItem('userid');
    const userId = rawId != null && rawId !== '' ? Number(rawId) : NaN;
    if (Number.isFinite(userId) && userId > 0) {
      const updateData: any = {
        username: this.profileFormData.username,
        email: this.profileFormData.email,
        contact: this.profileFormData.phone,
        qualification: String(this.profileFormData.qualification || '').trim(),
        role: this.profileFormData.role || sessionStorage.getItem('userrole'),
      };
      this.api.updateUser(userId, updateData).subscribe({
        next: () => {
          this.editMode = false;
        },
        error: () => {
          // Local session already updated; allow closing edit mode.
          this.editMode = false;
        },
      });
      return;
    }

    this.editMode = false;
  }
}
