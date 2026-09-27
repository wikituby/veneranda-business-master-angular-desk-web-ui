import { Component, HostListener, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CartapiService } from '../services/cartapi.service';
import { DataService } from '../services/data.service';
import { NavigationEnd, Router } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';
import { ApiService } from '../services/api.service';
import { SidebarToggleService } from '../services/sidebar-toggle.service';
import { filter, Subscription } from 'rxjs';
import {
  ActiveRoomService,
  AccessibleDepartment,
  AccessibleRoom,
} from '../services/active-room.service';
import { SubscriptionService } from '../services/subscription.service';
import { AccessControlService } from '../services/access-control.service';
import { HEADER_DEPARTMENT_LINKS } from '../config/header-department-links';
import {
  applyQueuePageModuleToSession,
  buildWorkContextSummary,
  resolvePageContextFromUrl,
} from '../utils/queue-page-context.util';
import { getAllUserRoles, userHasAnyRole } from '../utils/user-roles.util';
import {
  isQueueDischargeDestination,
  queueDestinationOptions,
} from '../utils/queue-module.util';
import {
  HeaderNotification,
  HeaderNotificationService,
} from '../services/header-notification.service';
import {
  HeaderMessagePreview,
  HeaderMessagesService,
} from '../services/header-messages.service';
import { MessagingHubService } from '../services/messaging-hub.service';
import {
  MessagingWebSocketService,
  MessagePushEvent,
} from '../services/messaging-websocket.service';
import { MessageSoundService } from '../services/message-sound.service';
import { ApiConfigService } from '../services/api-config.service';
import { TreatmentDoseAlertService } from '../services/treatment-dose-alert.service';
import { ThemeService } from '../services/theme.service';
import { AUTH_SESSION_CHANGED_EVENT } from '../utils/auth-session.util';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  totalItemNumber: number = 0;
  totalCartItemNumber: number = 0;
  products: any = [];
  accountUserName: any = '';
  accountUserRole: any = "";
  accountUseremail: any;
  iconChangeSideBar ="bi bi-chevron-down"

  businessSettings: boolean = false;
  
  logout: boolean = false;
  account: boolean = false;
  signin: boolean = false;

  isText: boolean = true;
  eyeIcon: string = "bi bi-funnel";

  profilePic: any = "assets/images/vector.jpeg";
  readonly defaultProfilePic = 'assets/images/vector.jpeg';

  totalQuantity: number = 0;

  notifications: HeaderNotification[] = [];
  notificationsLoading = false;

  messagePreviews: HeaderMessagePreview[] = [];
  messagesUnreadTotal = 0;
  messagesLoading = false;
  private messagesHubSub?: Subscription;
  private messagingWsSub?: Subscription;
  private apiReadySub?: Subscription;
  private themeSub?: Subscription;
  /** Prevents re-binding WS / re-fetching badges on every NavigationEnd (avoids request storms). */
  private messagingRealtimeBound = false;
  private headerBadgesInitialized = false;

  iconChange: string = "bi bi-chevron-down"
  helpIcon: string = "bi bi-chevron-down"
  dropDrop:string = "bi bi-chevron-down"
  dropDrop2:string = "bi bi-chevron-down"

  isDropdownOpen = false;
  profession:string = "Veneranda Hospital Staff"
  isDarkMode = false;
  moreMenuOpen = false;
  /** Wide Inventory mega menu (landing-page style). */
  inventoryMenuOpen = false;
  profileMenuOpen = false;
  notificationsMenuOpen = false;
  isAppFullscreen = false;

  openSubmenu: string | null = null;
  openSubmenus = new Set<string>();
  private readonly submenuChildren: Record<string, string[]> = {
    inventory: [],
  };

  /** Classic inventory pages — same app, separate from overview inventory. */
  readonly legacyInventoryLinks: {
    label: string;
    route: string;
    pageKey: string;
    icon: string;
  }[] = [
    {
      label: 'Product Management',
      route: '/overview/shop-item-management',
      pageKey: 'consumable-items',
      icon: 'bi-box',
    },
    {
      label: 'Stock Receive',
      route: '/overview/shop-item-receive',
      pageKey: 'stock-receive',
      icon: 'bi-box-arrow-in-down',
    },
  ];

  /** Overview inventory submodules, grouped for the header mega dropdown. */
  readonly inventoryMegaGroups: {
    title: string;
    links: {
      label: string;
      description: string;
      route: string;
      pageKey: string;
      icon: string;
    }[];
  }[] = [
    {
      title: 'Overview',
      links: [
        {
          label: 'Inventory Dashboard',
          description: 'Stock overview and alerts',
          route: '/overview/inventory-dashboard',
          pageKey: 'inventory-dashboard',
          icon: 'bi-speedometer2',
        },
      ],
    },
    {
      title: 'Products',
      links: [
        {
          label: 'Consumable Products',
          description: 'Products and sellable items',
          route: '/overview/consumable-items',
          pageKey: 'consumable-items',
          icon: 'bi-box',
        },
        {
          label: 'Assets Management',
          description: 'Fixed assets register',
          route: '/overview/asset-management',
          pageKey: 'asset-management',
          icon: 'bi-pc-display',
        },
        {
          label: 'Expired Products',
          description: 'Expired and near-expiry',
          route: '/overview/expired-items',
          pageKey: 'expired-items',
          icon: 'bi-calendar-x',
        },
      ],
    },
    {
      title: 'Stock Management',
      links: [
        {
          label: 'Stock Receive',
          description: 'Receive goods into stores',
          route: '/overview/stock-receive',
          pageKey: 'stock-receive',
          icon: 'bi-box-arrow-in-down',
        },
        {
          label: 'Stock Batch',
          description: 'Batches and expiry',
          route: '/overview/stock-batch',
          pageKey: 'stock-batch',
          icon: 'bi-layers',
        },
        {
          label: 'Stock Transfer',
          description: 'Move stock between stores',
          route: '/overview/stock-transfer',
          pageKey: 'stock-transfer',
          icon: 'bi-arrow-left-right',
        },
        {
          label: 'Stock Tracking',
          description: 'In and out history',
          route: '/overview/stock-tracking',
          pageKey: 'stock-tracking',
          icon: 'bi-clock-history',
        },
        {
          label: 'Stock Verification',
          description: 'Verify on-hand quantities',
          route: '/overview/stock-verification',
          pageKey: 'stock-verification',
          icon: 'bi-check2-square',
        },
        {
          label: 'Stock Initializer',
          description: 'Opening stock setup',
          route: '/overview/stock-initializer',
          pageKey: 'stock-initializer',
          icon: 'bi-play-circle',
        },
        {
          label: 'Stock Taking',
          description: 'Physical count sessions',
          route: '/overview/stock-taking',
          pageKey: 'stock-taking',
          icon: 'bi-clipboard-check',
        },
        {
          label: 'Reorder Levels',
          description: 'Low-stock thresholds',
          route: '/overview/reorder-levels',
          pageKey: 'reorder-levels',
          icon: 'bi-exclamation-triangle',
        },
        {
          label: 'Adjustments',
          description: 'Stock quantity adjustments',
          route: '/overview/adjustments',
          pageKey: 'adjustments',
          icon: 'bi-sliders',
        },
      ],
    },
    {
      title: 'Stores',
      links: [
        {
          label: 'Store Management',
          description: 'Stores and locations',
          route: '/overview/store-management',
          pageKey: 'store-management',
          icon: 'bi-shop',
        },
        {
          label: 'Store Reports',
          description: 'Store stock reports',
          route: '/overview/store-reports',
          pageKey: 'store-reports',
          icon: 'bi-file-earmark-bar-graph',
        },
        {
          label: 'Store Analytics',
          description: 'Store performance',
          route: '/overview/store-analytics',
          pageKey: 'store-analytics',
          icon: 'bi-graph-up',
        },
      ],
    },
    {
      title: 'Partners',
      links: [
        {
          label: 'Stock Suppliers',
          description: 'Supplier directory',
          route: '/overview/suppliers',
          pageKey: 'suppliers',
          icon: 'bi-truck',
        },
        {
          label: 'Manufacturers',
          description: 'Manufacturer directory',
          route: '/overview/manufacturers',
          pageKey: 'manufacturers',
          icon: 'bi-gear',
        },
      ],
    },
  ];

  readonly headerDepartmentLinks = HEADER_DEPARTMENT_LINKS;

  showQueueModal = false;
  queueLoading = false;
  queueEntries: any[] = [];
  queueTab: 'current' | 'discharged' | 'referred' = 'current';
  readonly queueTabs: { id: 'current' | 'discharged' | 'referred'; label: string }[] = [
    { id: 'current', label: 'Current' },
    { id: 'discharged', label: 'Discharged today' },
    { id: 'referred', label: 'Referred today' },
  ];
  queueModules: any[] = [];
  /** All active business modules (unfiltered) — used to match any page to a department. */
  private allHospitalModules: any[] = [];
  showQueueEditModal = false;
  queueEditSaving = false;
  editingQueueEntry: any = null;
  queueVisitLoadingEntryId: number | null = null;
  queueEditForm = {
    status: 'WAITING',
    toModuleId: null as number | null,
    emergency: false,
    note: ''
  };
  readonly queueStatusOptions = ['WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'CANCELLED', 'DISCHARGED'];
  readonly isQueueDischargeDestination = isQueueDischargeDestination;
  private readonly currentRole = (sessionStorage.getItem('userrole') || '').toLowerCase();

  workContextLoading = false;
  workContextSummary = '';
  workContextTitle = '';
  activeDeptShortName = '';
  activeRoomShortName = '';
  accessibleDepartments: AccessibleDepartment[] = [];
  accessibleRooms: AccessibleRoom[] = [];
  showWorkContextModal = false;

  showTakeClientModal = false;
  takeClientStep: 'department' | 'room' = 'department';
  takeClientEntry: any = null;
  takeClientSelectedDept: AccessibleDepartment | null = null;
  takeClientRooms: AccessibleRoom[] = [];
  takeClientDepartmentOptions: AccessibleDepartment[] = [];
  takeClientNavigating = false;

  private routerSub?: Subscription;
  private workContextInitialized = false;
  private readonly onAuthSessionChanged = () => this.refreshAuthChrome();

  constructor(
    private api: ApiService,
    private cartApi: CartapiService,
    private dataService: DataService,
    private router: Router,
    private auth: AuthenticationService,
    private sidebarToggleService: SidebarToggleService,
    private activeRoomService: ActiveRoomService,
    private subscription: SubscriptionService,
    private accessControl: AccessControlService,
    private headerNotifications: HeaderNotificationService,
    private headerMessages: HeaderMessagesService,
    private messagingHub: MessagingHubService,
    private messagingWs: MessagingWebSocketService,
    private messageSound: MessageSoundService,
    private treatmentDoseAlert: TreatmentDoseAlertService,
    private apiConfig: ApiConfigService,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) { }

  get notificationCount(): number {
    return this.notifications.length;
  }

  get canUseQueueAndWorkContext(): boolean {
    if (!this.businessSettings) {
      return false;
    }
    if (userHasAnyRole(['admin', 'md'])) {
      return true;
    }
    return this.subscription.isActive();
  }

  get isMdUser(): boolean {
    return userHasAnyRole(['md']);
  }

  isClinicalRoleBlockedFromDashboard(): boolean {
    return userHasAnyRole(['clinician', 'doctor']);
  }

  /** Primary + secondary roles label for account menu. */
  get accountRolesLabel(): string {
    const roles = getAllUserRoles();
    if (!roles.length) {
      return this.accountUserRole || '—';
    }
    const primary = roles[0];
    const secondary = roles.slice(1);
    return secondary.length ? `${primary} (+${secondary.join(', ')})` : primary;
  }

  getInitials(): string {
    const name = String(this.accountUserName || this.accountUseremail || 'U').trim();
    if (!name) {
      return 'U';
    }
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }

  setTheme(isDark: boolean): void {
    this.themeService.setTheme(isDark);
  }

  ngOnInit(): void {
    this.syncAppFullscreenState();
    this.isDarkMode = this.themeService.getCurrentTheme();
    this.themeSub = this.themeService.isDarkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });
    this.applyAuthStateFromSession();

    if (typeof window !== 'undefined') {
      window.addEventListener(AUTH_SESSION_CHANGED_EVENT, this.onAuthSessionChanged);
    }

    this.cartApi.getProductData().subscribe(res => {
      this.products = res;
      this.totalItemNumber = this.cartApi.getTotalqnt();
      this.totalQuantity = this.dataService.getshareCartTotalQuantity();
      this.applyAuthStateFromSession();
    });

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.applyAuthStateFromSession();
        this.maybeInitWorkContext();
        this.syncWorkContextFromRoute();
      });
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, this.onAuthSessionChanged);
    }
    this.routerSub?.unsubscribe();
    this.messagesHubSub?.unsubscribe();
    this.messagingWsSub?.unsubscribe();
    this.apiReadySub?.unsubscribe();
    this.themeSub?.unsubscribe();
  }

  /** Set header auth chrome from session immediately (not only after cart observable). */
  private refreshAuthChrome(): void {
    this.applyAuthStateFromSession();
  }

  private applyAuthStateFromSession(): void {
    const username = (sessionStorage.getItem('username') || '').trim();
    const userrole = sessionStorage.getItem('userrole');
    const useremail = sessionStorage.getItem('useremail');
    this.profilePic = sessionStorage.getItem('userProfilePic') || this.defaultProfilePic;
    this.accountUserName = username;
    this.accountUserRole = userrole;
    this.accountUseremail = useremail;

    if (!username || username === 'Account') {
      this.businessSettings = false;
      this.logout = false;
      this.account = false;
      this.signin = true;
      this.messagingRealtimeBound = false;
      this.headerBadgesInitialized = false;
      this.apiReadySub?.unsubscribe();
      this.apiReadySub = undefined;
      this.messagingWsSub?.unsubscribe();
      this.messagingWsSub = undefined;
      this.cdr.detectChanges();
      return;
    }

    this.logout = true;
    this.account = true;
    this.signin = false;
    // Hospital logins set userType=AGENT (MySQL or Postgres). Never hide the staff
    // toolbar for them — only pure retail "customer" accounts omit it.
    this.businessSettings = this.shouldShowStaffToolbar();

    if (this.businessSettings) {
      this.accessControl.refreshFromSession();
      this.subscription.refreshFromSession();
      this.maybeInitWorkContext();
      this.bindMessagesUnreadBadge();
      this.bindMessagingRealtime();
      if (!this.headerBadgesInitialized) {
        this.headerBadgesInitialized = true;
        this.initHeaderBadges();
      }
    } else {
      this.messagingRealtimeBound = false;
      this.headerBadgesInitialized = false;
    }
    this.cdr.detectChanges();
  }

  /** Clinical toolbar (Client, Services, More, notifications, messages). */
  private shouldShowStaffToolbar(): boolean {
    const userType = (sessionStorage.getItem('userType') || '').trim().toUpperCase();
    if (userType === 'AGENT' || userType === 'ADMIN' || userType === 'STAFF') {
      return true;
    }
    const roles = getAllUserRoles().map((role) => role.toLowerCase());
    if (!roles.length) {
      // Logged in but role missing from session — still show staff chrome.
      return true;
    }
    // Hide only for pure retail customer accounts (no clinical role).
    return !roles.every((role) => role === 'customer');
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.moreMenuOpen = false;
    this.profileMenuOpen = false;
    this.notificationsMenuOpen = false;
  }

  @HostListener('document:fullscreenchange')
  @HostListener('document:webkitfullscreenchange')
  onFullscreenChange(): void {
    this.syncAppFullscreenState();
  }

  toggleAppFullscreen(event?: Event): void {
    event?.stopPropagation();
    const doc: any = document;
    const el: any = document.documentElement;
    if (this.isAppFullscreen) {
      const exit =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.msExitFullscreen;
      exit?.call(doc)?.catch?.(() => undefined);
    } else {
      const enter =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.msRequestFullscreen;
      enter?.call(el)?.catch?.(() => undefined);
    }
    // State also updates via fullscreenchange; sync immediately for responsive UI.
    setTimeout(() => this.syncAppFullscreenState(), 0);
  }

  private syncAppFullscreenState(): void {
    const doc: any = document;
    this.isAppFullscreen = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.msFullscreenElement
    );
  }

  toggleMoreMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.profileMenuOpen = false;
    this.notificationsMenuOpen = false;
    this.inventoryMenuOpen = false;
    this.moreMenuOpen = !this.moreMenuOpen;
    if (!this.moreMenuOpen) {
      this.closeSubmenu();
    }
  }

  toggleInventoryMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.profileMenuOpen = false;
    this.notificationsMenuOpen = false;
    this.moreMenuOpen = false;
    this.inventoryMenuOpen = !this.inventoryMenuOpen;
  }

  visibleInventoryMegaGroups() {
    return this.inventoryMegaGroups
      .map((group) => ({
        title: group.title,
        links: group.links.filter((link) => this.canAccessDepartment(link.pageKey)),
      }))
      .filter((group) => group.links.length > 0);
  }

  hasAnyInventoryMegaLink(): boolean {
    return this.visibleInventoryMegaGroups().length > 0;
  }

  onInventoryMegaLinkClick(event: MouseEvent): void {
    event.stopPropagation();
    this.inventoryMenuOpen = false;
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.moreMenuOpen = false;
    this.inventoryMenuOpen = false;
    this.notificationsMenuOpen = false;
    this.profileMenuOpen = !this.profileMenuOpen;
    this.buttonClickIconChange();
  }

  toggleNotificationsMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.moreMenuOpen = false;
    this.inventoryMenuOpen = false;
    this.profileMenuOpen = false;
    this.notificationsMenuOpen = !this.notificationsMenuOpen;
    if (this.notificationsMenuOpen) {
      this.refreshNotifications();
    }
  }

  closeToolbarMenus(): void {
    this.moreMenuOpen = false;
    this.inventoryMenuOpen = false;
    this.profileMenuOpen = false;
    this.notificationsMenuOpen = false;
    this.closeSubmenu();
  }

  /** Live message pushes — badge updates instantly like WhatsApp (no polling). */
  private bindMessagingRealtime(): void {
    const connectIfReady = () => {
      if (this.businessSettings && this.account && this.apiConfig.isReady()) {
        this.messagingWs.connect();
        this.messageSound.start();
      }
    };

    if (this.messagingRealtimeBound) {
      connectIfReady();
      return;
    }
    this.messagingRealtimeBound = true;

    connectIfReady();
    this.apiReadySub?.unsubscribe();
    this.apiReadySub = this.apiConfig.state$.subscribe((state) => {
      if (state === 'ready') {
        // Do NOT call applyAuthStateFromSession here — that re-enters this binder
        // via BehaviorSubject and causes Maximum call stack / request storms.
        connectIfReady();
      }
    });

    this.treatmentDoseAlert.startListening();

    this.messagingWsSub?.unsubscribe();
    this.messagingWsSub = this.messagingWs.incoming$.subscribe((event) =>
      this.handleMessagingPush(event)
    );
  }

  private handleMessagingPush(event: MessagePushEvent): void {
    if (event?.type === 'NEW_MESSAGE') {
      this.messagingHub.refreshBadge();
      if (this.messagePreviews.length > 0) {
        this.refreshMessagePreviews();
      }
      return;
    }

    if (event?.type === 'QUEUE_PATIENT' || event?.type === 'STOCK_ALERT') {
      this.refreshNotifications();
    }
  }

  /** Subscribe to badge count updated by the messages page — no background polling. */
  private bindMessagesUnreadBadge(): void {
    this.messagesHubSub?.unsubscribe();
    this.messagesUnreadTotal = this.messagingHub.totalUnread;
    this.messagesHubSub = this.messagingHub.totalUnread$.subscribe((count) => {
      this.messagesUnreadTotal = count;
    });
  }

  /** Load message and notification badge counts once after sign-in (no background polling). */
  private initHeaderBadges(): void {
    if (!this.businessSettings || !this.account) {
      this.notifications = [];
      this.messagingHub.reset();
      return;
    }
    this.notifications = this.headerNotifications.getLocalNotifications();
    this.messagingHub.refreshBadge();
    this.refreshNotifications();
  }

  refreshNotifications(): void {
    if (!this.businessSettings) {
      this.notifications = [];
      return;
    }
    this.notificationsLoading = true;
    const includeQueue = this.canUseQueueAndWorkContext;
    const includeSubscription = !!this.subscription.getExpiryWarningInfo();
    this.headerNotifications
      .fetchNotifications({
        includeStock: true,
        includeQueue,
        includeSubscription: includeSubscription,
      })
      .subscribe({
        next: (list) => {
          this.notifications = list;
          this.notificationsLoading = false;
        },
        error: () => {
          this.notifications = [];
          this.notificationsLoading = false;
        },
      });
  }

  openNotification(item: HeaderNotification): void {
    this.notificationsMenuOpen = false;
    if (item.route) {
      this.router.navigate([item.route]);
    }
  }

  notificationToneClass(tone: HeaderNotification['tone']): string {
    return `header-notification-item--${tone}`;
  }

  refreshMessagePreviews(): void {
    if (!this.businessSettings || !this.account) {
      this.messagePreviews = [];
      this.messagingHub.reset();
      return;
    }
    this.messagesLoading = true;
    this.headerMessages.fetchPreviews(10).subscribe({
      next: ({ previews, totalUnread }) => {
        this.messagePreviews = previews;
        this.messagingHub.setTotalUnread(totalUnread);
        this.messagesLoading = false;
      },
      error: () => {
        this.messagePreviews = [];
        this.messagingHub.reset();
        this.messagesLoading = false;
      },
    });
  }

  onMessagesDropdownShow(): void {
    this.refreshMessagePreviews();
  }

  openMessagePreview(preview: HeaderMessagePreview): void {
    this.router.navigate(['/overview/messages'], { queryParams: { conversation: preview.id } });
  }

  openAllMessages(): void {
    this.router.navigate(['/overview/messages']);
  }

  private maybeInitWorkContext(): void {
    if (!this.canUseQueueAndWorkContext) {
      if (!this.subscription.isActive()) {
        this.workContextInitialized = false;
        this.accessibleDepartments = [];
        this.accessibleRooms = [];
        this.refreshWorkContextLabels();
      }
      return;
    }
    if (this.workContextInitialized || this.workContextLoading) {
      return;
    }
    this.initWorkContext();
  }

  toggleSidebar(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();

    const path = this.router.url.split('?')[0].split('#')[0];
    if (path === '/overview' || path.startsWith('/overview/')) {
      this.sidebarToggleService.requestOverviewSidebarToggle();
      return;
    }

    this.router.navigate(['/overview/main-dashboard']).then(() => {
      setTimeout(() => this.sidebarToggleService.requestOverviewSidebarToggle(), 0);
    });
  }

  get hasWorkContext(): boolean {
    const summary = (this.workContextSummary || '').trim();
    return summary.length > 0 && summary !== 'No department or room';
  }

  get canSwitchWorkContext(): boolean {
    return this.activeRoomService.canSwitchWorkContext();
  }

  initWorkContext(): void {
    if (!this.canUseQueueAndWorkContext) {
      return;
    }
    this.workContextLoading = true;
    this.activeRoomService.initializeFromSession().subscribe({
      next: (state) => {
        this.accessibleDepartments = state.departments;
        this.accessibleRooms = state.rooms;
        this.refreshWorkContextLabels();
        this.workContextLoading = false;
        this.workContextInitialized = true;
        this.loadQueueModules();
        this.syncWorkContextFromRoute();
      },
      error: () => {
        this.accessibleDepartments = [];
        this.accessibleRooms = [];
        this.refreshWorkContextLabels();
        this.workContextLoading = false;
        this.workContextInitialized = false;
      },
    });
  }

  refreshWorkContextLabels(): void {
    this.accessibleRooms = this.activeRoomService.getAccessibleRooms();
    const routeCtx = resolvePageContextFromUrl(
      this.router.url,
      this.getModulesForRouteContext()
    );
    const sessionDept = this.activeRoomService.getActiveDepartment();
    const room = this.activeRoomService.getActiveRoom();
    const deptName =
      routeCtx.departmentLabel ||
      sessionDept?.name ||
      '';
    this.activeDeptShortName = deptName;
    this.activeRoomShortName = room?.name || '';
    this.workContextSummary = buildWorkContextSummary(
      deptName,
      this.activeRoomShortName
    );
    this.workContextTitle = [
      deptName ? `Department: ${deptName}` : '',
      room ? `Room: ${this.activeRoomService.getActiveRoomLabel()}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }

  onWorkContextButtonClick(): void {
    if (!this.canUseQueueAndWorkContext) {
      return;
    }
    if (this.canSwitchWorkContext) {
      this.accessibleRooms = this.activeRoomService.getAccessibleRooms();
      this.showWorkContextModal = true;
    }
  }

  closeWorkContextModal(): void {
    this.showWorkContextModal = false;
  }

  selectActiveDepartment(dept: AccessibleDepartment): void {
    if (this.activeRoomService.setActiveDepartment(dept.id)) {
      this.refreshWorkContextLabels();
      if (this.showQueueModal) {
        this.loadQueueEntries();
      }
    }
  }

  selectActiveRoom(room: AccessibleRoom): void {
    if (this.activeRoomService.setActiveRoom(room.id)) {
      this.refreshWorkContextLabels();
      if (this.showQueueModal) {
        this.loadQueueEntries();
      }
    }
  }

  isActiveDepartment(dept: AccessibleDepartment): boolean {
    return this.activeRoomService.getActiveDepartmentId() === dept.id;
  }

  isActiveRoom(room: AccessibleRoom): boolean {
    return this.activeRoomService.getActiveRoomId() === room.id;
  }

  openQueueModal(): void {
    if (!this.canUseQueueAndWorkContext) {
      return;
    }
    this.showQueueModal = true;
    this.queueTab = 'current';
    this.withQueueModulesReady(() => {
      this.syncWorkContextFromRoute();
      this.loadQueueEntries();
    });
  }

  setQueueTab(tab: 'current' | 'discharged' | 'referred'): void {
    if (this.queueTab === tab) {
      return;
    }
    this.queueTab = tab;
    this.loadQueueEntries();
  }

  get queueEmptyMessage(): string {
    const dept = this.queuePageDepartmentLabel;
    const scope = dept ? ` for ${dept}` : ' for this department';
    switch (this.queueTab) {
      case 'discharged':
        return `No clients discharged today${scope}.`;
      case 'referred':
        return `No clients referred out today${scope}.`;
      default:
        return `No clients in queue${scope}.`;
    }
  }

  /** Department tied to the page currently open (queue destination filter). */
  get queuePageDepartmentLabel(): string {
    const ctx = resolvePageContextFromUrl(
      this.router.url,
      this.getModulesForRouteContext()
    );
    return ctx.departmentLabel || this.activeDeptShortName || '';
  }

  closeQueueModal(): void {
    this.showQueueModal = false;
    this.closeQueueEditModal();
  }

  loadQueueModules(): void {
    this.api.getAllBusinessModules().subscribe({
      next: (res: any) => {
        this.cacheAllHospitalModules(res);
        this.setQueueModulesFromApi(res);
      },
      error: () => {
        this.queueModules = [];
        this.allHospitalModules = [];
      },
    });
  }

  private setQueueModulesFromApi(res: any): void {
    const all = (Array.isArray(res) ? res : []).filter((m: any) => m.active !== false);
    if (!this.allHospitalModules.length) {
      this.allHospitalModules = all;
    }
    const assigned = this.parseAssignedModuleIds();
    if (assigned.length > 0) {
      this.queueModules = all.filter((m: any) => assigned.includes(Number(m.id)));
    } else {
      this.queueModules = all.filter((m: any) => this.isModuleAllowedForRole(m?.allowedRoles));
    }
  }

  private withQueueModulesReady(cb: () => void): void {
    if (this.queueModules.length > 0) {
      cb();
      return;
    }
    this.api.getAllBusinessModules().subscribe({
      next: (res: any) => {
        this.setQueueModulesFromApi(res);
        cb();
      },
      error: () => {
        this.queueModules = [];
        cb();
      },
    });
  }

  /** Departments this user may use for queue “take client” (assigned modules first). */
  private getDepartmentsForTakeClient(): AccessibleDepartment[] {
    const all = this.activeRoomService.getAccessibleDepartments();
    const assignedIds = this.parseAssignedModuleIds();
    if (assignedIds.length > 0) {
      const assigned = all.filter((d) => assignedIds.includes(d.id));
      if (assigned.length > 0) {
        return assigned;
      }
    }
    return all;
  }

  private parseAssignedModuleIds(): number[] {
    const csv = sessionStorage.getItem('assignedModuleIds') || '';
    if (!csv.trim()) {
      return [];
    }
    return csv
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => !Number.isNaN(n));
  }

  private isModuleAllowedForRole(allowedRolesCsv: any): boolean {
    if (this.currentRole === 'admin' || this.currentRole === 'md') {
      return true;
    }
    if (!allowedRolesCsv || typeof allowedRolesCsv !== 'string' || !allowedRolesCsv.trim()) {
      return true;
    }
    const allowed = allowedRolesCsv
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);
    return allowed.includes(this.currentRole);
  }

  /** Match current URL to a hospital module — queue shows only clients sent there (toModule). */
  resolveCurrentPageModuleId(): number | null {
    const ctx = resolvePageContextFromUrl(
      this.router.url,
      this.getModulesForRouteContext()
    );
    if (ctx.moduleId != null) {
      return ctx.moduleId;
    }
    return this.activeRoomService.getActiveDepartmentId();
  }

  private getModulesForRouteContext(): any[] {
    return this.allHospitalModules.length > 0
      ? this.allHospitalModules
      : this.queueModules;
  }

  /** Keep header dept/room and queue scope aligned with the current route. */
  private syncWorkContextFromRoute(): void {
    if (!this.canUseQueueAndWorkContext) {
      return;
    }
    const applyFromModules = (): void => {
      const ctx = resolvePageContextFromUrl(
        this.router.url,
        this.getModulesForRouteContext()
      );
      applyQueuePageModuleToSession(ctx.moduleId);
      if (ctx.moduleId != null) {
        this.activeRoomService.syncDepartmentFromRoute(ctx.moduleId);
      }
      this.refreshWorkContextLabels();
    };

    if (!this.allHospitalModules.length) {
      this.api.getAllBusinessModules().subscribe({
        next: (res: any) => {
          this.cacheAllHospitalModules(res);
          this.setQueueModulesFromApi(res);
          applyFromModules();
        },
        error: () => applyFromModules(),
      });
      return;
    }
    applyFromModules();
  }

  private cacheAllHospitalModules(res: any): void {
    this.allHospitalModules = (Array.isArray(res) ? res : []).filter(
      (m: any) => m.active !== false
    );
  }

  loadQueueEntries(): void {
    const pageModuleId = this.resolveCurrentPageModuleId();
    if (pageModuleId != null) {
      applyQueuePageModuleToSession(pageModuleId);
    }
    this.queueLoading = true;
    this.api.getLatestClientQueueEntries(200, this.queueTab, pageModuleId).subscribe({
      next: (res: any) => {
        const entries = Array.isArray(res) ? res : [];
        this.queueEntries =
          this.queueTab === 'current'
            ? this.sortQueueEntries(entries)
            : entries;
        this.queueLoading = false;
      },
      error: () => {
        this.queueEntries = [];
        this.queueLoading = false;
      },
    });
  }

  private sortQueueEntries(entries: any[]): any[] {
    return [...entries].sort((a, b) => {
      if (!!a.emergency !== !!b.emergency) {
        return a.emergency ? -1 : 1;
      }
      const pa = a.queuePosition ?? Number.MAX_SAFE_INTEGER;
      const pb = b.queuePosition ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) {
        return pa - pb;
      }
      const da = this.queueTimeValue(a.queuedAt);
      const db = this.queueTimeValue(b.queuedAt);
      return da - db;
    });
  }

  private queueTimeValue(value: any): number {
    if (value == null || value === '') {
      return Number.MAX_SAFE_INTEGER;
    }
    if (Array.isArray(value) && value.length >= 3) {
      const y = Number(value[0]);
      const mo = Number(value[1]);
      const d = Number(value[2]);
      const h = value.length > 3 ? Number(value[3]) : 0;
      const mi = value.length > 4 ? Number(value[4]) : 0;
      return new Date(y, mo - 1, d, h, mi).getTime();
    }
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
  }

  /**
   * Green queue action: set header dept/room and go to the staff member's department route.
   */
  takeClientToDepartment(entry: any): void {
    if (!entry || this.takeClientNavigating) {
      return;
    }
    const run = () => {
      this.withQueueModulesReady(() => {
        this.accessibleDepartments = this.activeRoomService.getAccessibleDepartments();
        const depts = this.getDepartmentsForTakeClient();
        if (!depts.length) {
          alert(
            'No department is assigned to your account. Ask an administrator to assign departments in User Management.'
          );
          return;
        }
        this.takeClientEntry = entry;

        const explicit = this.activeRoomService.resolveExplicitAssignedContext();
        if (explicit && depts.some((d) => d.id === explicit.department.id)) {
          this.navigateTakeClientWithWorkContext(explicit.department, explicit.room);
          return;
        }

        if (depts.length === 1) {
          const dept = depts[0];
          const assignedRooms = this.activeRoomService.getAssignedRoomsForDepartment(dept.id);
          if (assignedRooms.length === 1) {
            this.navigateTakeClientWithWorkContext(dept, assignedRooms[0]);
            return;
          }
          if (assignedRooms.length > 1) {
            this.openTakeClientRoomPicker(dept, assignedRooms);
            return;
          }
          this.navigateTakeClientWithWorkContext(dept, null);
          return;
        }

        this.takeClientDepartmentOptions = depts;
        this.takeClientStep = 'department';
        this.takeClientSelectedDept = null;
        this.takeClientRooms = [];
        this.showTakeClientModal = true;
      });
    };
    if (!this.workContextInitialized) {
      this.workContextLoading = true;
      this.activeRoomService.initializeFromSession().subscribe({
        next: (state) => {
          this.accessibleDepartments = state.departments;
          this.accessibleRooms = state.rooms;
          this.refreshWorkContextLabels();
          this.workContextLoading = false;
          this.workContextInitialized = true;
          run();
        },
        error: () => {
          this.workContextLoading = false;
          alert('Could not load your departments. Try again.');
        },
      });
      return;
    }
    run();
  }

  closeTakeClientModal(): void {
    this.showTakeClientModal = false;
    this.takeClientStep = 'department';
    this.takeClientEntry = null;
    this.takeClientSelectedDept = null;
    this.takeClientRooms = [];
    this.takeClientDepartmentOptions = [];
  }

  pickTakeClientDepartment(dept: AccessibleDepartment): void {
    const assignedRooms = this.activeRoomService.getAssignedRoomsForDepartment(dept.id);
    if (assignedRooms.length === 1) {
      this.navigateTakeClientWithWorkContext(dept, assignedRooms[0]);
      return;
    }
    if (assignedRooms.length > 1) {
      this.openTakeClientRoomPicker(dept, assignedRooms);
      return;
    }
    this.navigateTakeClientWithWorkContext(dept, null);
  }

  pickTakeClientRoom(room: AccessibleRoom): void {
    if (!this.takeClientSelectedDept || !this.takeClientEntry) {
      return;
    }
    this.navigateTakeClientWithWorkContext(this.takeClientSelectedDept, room);
  }

  backTakeClientToDepartments(): void {
    this.takeClientStep = 'department';
    this.takeClientSelectedDept = null;
    this.takeClientRooms = [];
  }

  private openTakeClientRoomPicker(dept: AccessibleDepartment, rooms: AccessibleRoom[]): void {
    this.takeClientSelectedDept = dept;
    this.activeRoomService.setActiveDepartment(dept.id);
    this.takeClientRooms = rooms;
    this.takeClientStep = 'room';
    this.showTakeClientModal = true;
    this.refreshWorkContextLabels();
  }

  /** Apply assigned department/room to header context, then open the department page with client. */
  private navigateTakeClientWithWorkContext(
    dept: AccessibleDepartment,
    room: AccessibleRoom | null
  ): void {
    this.activeRoomService.applyWorkContext(dept, room);
    this.refreshWorkContextLabels();
    this.accessibleDepartments = this.activeRoomService.getAccessibleDepartments();
    this.accessibleRooms = this.activeRoomService.getAccessibleRooms();
    this.finalizeTakeClientNavigation(dept);
  }

  private finalizeTakeClientNavigation(dept: AccessibleDepartment): void {
    const entry = this.takeClientEntry;
    if (!entry) {
      return;
    }
    this.takeClientNavigating = true;
    const path = this.resolveDepartmentRoute(dept);
    const go = () => {
      this.closeTakeClientModal();
      this.closeQueueModal();
      this.takeClientNavigating = false;
      this.router.navigate([path]);
    };
    if (!this.departmentRouteNeedsVisitContext(dept)) {
      go();
      return;
    }
    this.storeQueueClientSessionFlags(entry, dept);
    const item = this.buildClientItemFromQueueEntry(entry);
    sessionStorage.setItem('item', JSON.stringify(item));
    const visitId = entry?.clientVisitId;
    const clientId = entry?.clientId ?? entry?.client?.id;
    if (visitId) {
      this.api.getClientVisitByVisitId(visitId).subscribe({
        next: (visitRes) => {
          const initialVisit =
            visitRes != null && typeof visitRes === 'object' ? visitRes : { id: visitId };
          sessionStorage.setItem('initialClientVisit', JSON.stringify(initialVisit));
          go();
        },
        error: () => {
          sessionStorage.setItem('initialClientVisit', JSON.stringify({ id: visitId }));
          go();
        },
      });
      return;
    }
    if (clientId) {
      this.api.getInitialVisitForClientId(clientId).subscribe({
        next: (visitRes) => {
          const initialVisit =
            visitRes != null && typeof visitRes === 'object' && visitRes.id != null ? visitRes : {};
          sessionStorage.setItem('initialClientVisit', JSON.stringify(initialVisit));
          go();
        },
        error: () => {
          sessionStorage.setItem('initialClientVisit', JSON.stringify({}));
          go();
        },
      });
      return;
    }
    go();
  }

  private isPharmacyDepartment(dept: AccessibleDepartment): boolean {
    const mod = this.findModuleForDepartment(dept);
    const routeKey = (mod?.routeKey || '').toString().toLowerCase().trim();
    const code = (mod?.code || dept.code || '').toString().toUpperCase().trim();
    const name = (dept.name || '').toLowerCase();
    return (
      routeKey === 'pharmacy' ||
      routeKey === 'otc-dispensary' ||
      code === 'PHARMACY' ||
      name.includes('pharmacy')
    );
  }

  private departmentRouteNeedsVisitContext(dept: AccessibleDepartment): boolean {
    if (this.isPharmacyDepartment(dept)) {
      return false;
    }
    const mod = this.findModuleForDepartment(dept);
    const routeKey = (mod?.routeKey || dept.code || '').toString().toLowerCase();
    const code = (mod?.code || dept.code || '').toString().toUpperCase();
    return (
      routeKey === 'client-visit' ||
      routeKey === 'consultations-center' ||
      routeKey === 'consultation' ||
      routeKey === 'triage' ||
      code === 'CONSULTATION' ||
      code === 'TRIAGE'
    );
  }

  private storeQueueClientSessionFlags(entry: any, dept: AccessibleDepartment): void {
    if (this.isPharmacyDepartment(dept)) {
      sessionStorage.removeItem('clientVisitOpenTab');
      sessionStorage.removeItem('pharmacistDispenseMode');
      return;
    }
    const mod = this.findModuleForDepartment(dept);
    const routeKey = (mod?.routeKey || dept.code || '').toString().toLowerCase();
    const code = (mod?.code || dept.code || '').toString().toUpperCase();
    const role = (sessionStorage.getItem('userrole') || '').toLowerCase().trim();
    if (
      (role === 'pharmacist' || role === 'pharmacy') &&
      this.accessControl.isPharmacistDispenseOnlyMode()
    ) {
      sessionStorage.setItem('clientVisitOpenTab', 'pharmacy');
      sessionStorage.setItem('pharmacistDispenseMode', 'true');
    } else {
      sessionStorage.removeItem('clientVisitOpenTab');
      sessionStorage.removeItem('pharmacistDispenseMode');
    }
  }

  private findModuleForDepartment(dept: AccessibleDepartment): any {
    return (
      this.queueModules.find((m: any) => Number(m.id) === dept.id) ?? null
    );
  }

  private resolveDepartmentRoute(dept: AccessibleDepartment): string {
    const mod = this.findModuleForDepartment(dept);
    const routeKey = (mod?.routeKey || '').toString().toLowerCase().trim();
    const code = (mod?.code || dept.code || '').toString().toUpperCase().trim();
    if (this.isPharmacyDepartment(dept)) {
      return '/overview/otc-dispensary';
    }

    const byKey: Record<string, string> = {
      'client-visit': '/overview/otc-dispensary',
      'consultations-center': '/overview/otc-dispensary',
      consultation: '/overview/otc-dispensary',
      triage: '/overview/otc-dispensary',
      pharmacy: '/overview/otc-dispensary',
      'otc-dispensary': '/overview/otc-dispensary',
      lab: '/overview/otc-dispensary',
      scan: '/overview/otc-dispensary',
      dental: '/overview/otc-dispensary',
      'lab-mobile': '/overview/otc-dispensary',
      'maternal-child-health-requests': '/overview/otc-dispensary',
      mch: '/overview/otc-dispensary',
      'scan-v2': '/overview/otc-dispensary',
      'lab-v2': '/overview/otc-dispensary',
      'dental-v2': '/overview/otc-dispensary',
      'mch-v2': '/overview/otc-dispensary',
      reception: '/overview/all-clients',
      cashier: '/overview/dashboard',
      dashboard: '/overview/dashboard',
    };
    const byCode: Record<string, string> = {
      PHARMACY: '/overview/otc-dispensary',
      CONSULTATION: '/overview/otc-dispensary',
      TRIAGE: '/overview/otc-dispensary',
      LAB: '/overview/otc-dispensary',
      SCAN: '/overview/otc-dispensary',
      DENTAL: '/overview/otc-dispensary',
      MCH: '/overview/otc-dispensary',
      RECEPTION: '/overview/all-clients',
      CASHIER: '/overview/dashboard',
    };
    if (routeKey && byKey[routeKey]) {
      return byKey[routeKey];
    }
    if (code && byCode[code]) {
      return byCode[code];
    }
    return '/overview/all-clients';
  }

  /**
   * Open client order for a queue row (same sessionStorage flow as all-clients / client list).
   */
  openQueueClientVisit(entry: any): void {
    const clientId = entry?.clientId ?? entry?.client?.id;
    if (!clientId) {
      return;
    }
    if (this.queueVisitLoadingEntryId != null) {
      return;
    }
    this.queueVisitLoadingEntryId = entry.id ?? clientId;
    const item = this.buildClientItemFromQueueEntry(entry);
    const visitId = entry?.clientVisitId;
    const visit$ = visitId
      ? this.api.getClientVisitByVisitId(visitId)
      : this.api.getInitialVisitForClientId(clientId);

    visit$.subscribe({
      next: (visitRes) => {
        const initialVisit =
          visitRes != null && typeof visitRes === 'object' && visitRes.id != null ? visitRes : {};
        sessionStorage.setItem('item', JSON.stringify(item));
        sessionStorage.setItem('initialClientVisit', JSON.stringify(initialVisit));
        this.applyPharmacistVisitNavigationFlags();
        this.queueVisitLoadingEntryId = null;
        this.closeQueueModal();
        this.router.navigate(['/client-visit']);
      },
      error: () => {
        sessionStorage.setItem('item', JSON.stringify(item));
        sessionStorage.setItem('initialClientVisit', JSON.stringify({}));
        this.applyPharmacistVisitNavigationFlags();
        this.queueVisitLoadingEntryId = null;
        this.closeQueueModal();
        this.router.navigate(['/client-visit']);
      },
    });
  }

  private applyPharmacistVisitNavigationFlags(): void {
    const role = (sessionStorage.getItem('userrole') || '').toLowerCase().trim();
    if (
      (role === 'pharmacist' || role === 'pharmacy') &&
      this.accessControl.isPharmacistDispenseOnlyMode()
    ) {
      sessionStorage.setItem('clientVisitOpenTab', 'pharmacy');
      sessionStorage.setItem('pharmacistDispenseMode', 'true');
    } else {
      sessionStorage.removeItem('clientVisitOpenTab');
      sessionStorage.removeItem('pharmacistDispenseMode');
    }
  }

  private buildClientItemFromQueueEntry(entry: any): any {
    const clientId = entry?.clientId ?? entry?.client?.id;
    const otherNames = (entry?.clientOtherNames ?? '').toString().trim();
    const surname = (entry?.clientSurname ?? '').toString().trim();
    return {
      id: clientId,
      clientId,
      clientFirstName: otherNames,
      clientSecondName: surname,
      clientFileNo: entry?.clientFileNo ?? '',
      clientAge: entry?.clientAge ?? null,
      clientGroupId: entry?.clientGroupId ?? null,
      clientGroupName: entry?.visitDefaultScheme ?? entry?.clientGroupName ?? '',
      clientProfilePic: 'assets/images/vector.jpeg',
    };
  }

  openQueueEdit(entry: any): void {
    this.editingQueueEntry = entry;
    this.queueEditForm = {
      status: entry?.status || 'WAITING',
      toModuleId: entry?.toModuleId ?? null,
      emergency: !!entry?.emergency,
      note: entry?.note || '',
    };
    this.showQueueEditModal = true;
  }

  closeQueueEditModal(): void {
    this.showQueueEditModal = false;
    this.editingQueueEntry = null;
    this.queueEditSaving = false;
  }

  saveQueueEdit(): void {
    if (!this.editingQueueEntry?.id) {
      return;
    }
    this.queueEditSaving = true;
    const username = sessionStorage.getItem('username') || this.accountUserName || '';

    if (isQueueDischargeDestination(this.queueEditForm.toModuleId)) {
      this.api.dischargeClientFromQueue({
        clientId: this.editingQueueEntry.clientId,
        note: this.queueEditForm.note,
        dischargedBy: username,
      }).subscribe({
        next: () => {
          this.queueEditSaving = false;
          this.closeQueueEditModal();
          this.loadQueueEntries();
        },
        error: () => {
          this.queueEditSaving = false;
        },
      });
      return;
    }

    const payload: any = {
      status: this.queueEditForm.status,
      emergency: this.queueEditForm.emergency,
      note: this.queueEditForm.note,
      queuedBy: username,
    };
    if (this.queueEditForm.toModuleId != null) {
      payload.toModuleId = this.queueEditForm.toModuleId;
    }
    this.api.updateClientQueueEntry(this.editingQueueEntry.id, payload).subscribe({
      next: () => {
        this.queueEditSaving = false;
        this.closeQueueEditModal();
        this.loadQueueEntries();
      },
      error: () => {
        this.queueEditSaving = false;
      },
    });
  }

  get forwardModuleOptions(): any[] {
    const base = !this.editingQueueEntry?.toModuleId
      ? this.queueModules
      : this.queueModules.filter((m) => m.id !== this.editingQueueEntry.toModuleId);
    return queueDestinationOptions(base);
  }

  formatQueueDate(value: any): string {
    if (value == null || value === '') {
      return '';
    }
    if (Array.isArray(value) && value.length >= 3) {
      const y = Number(value[0]);
      const mo = Number(value[1]);
      const d = Number(value[2]);
      const h = value.length > 3 ? Number(value[3]) : 0;
      const mi = value.length > 4 ? Number(value[4]) : 0;
      const dt = new Date(y, mo - 1, d, h, mi);
      return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleString();
    }
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? String(value) : dt.toLocaleString();
  }

  onProfilePicError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src.includes('vector.jpeg')) {
      return;
    }
    img.src = this.defaultProfilePic;
    this.profilePic = this.defaultProfilePic;
  }

  canAccessDepartment(pageKey: string): boolean {
    return this.accessControl.canAccessPage(pageKey);
  }

  visibleHeaderDepartmentLinks() {
    return this.headerDepartmentLinks.filter((link) => {
      if (link.pageKey === 'dashboard' && this.isClinicalRoleBlockedFromDashboard()) {
        return false;
      }
      return this.canAccessDepartment(link.pageKey);
    });
  }

  hasAnyHeaderDepartmentLink(): boolean {
    return this.visibleHeaderDepartmentLinks().length > 0;
  }

  hasAnyLegacyInventoryLink(): boolean {
    return this.legacyInventoryLinks.some((link) =>
      this.canAccessDepartment(link.pageKey)
    );
  }

  /** Direct routes: /lab, /dashboard, /scan — not /overview/... */
  onDepartmentLinkClick(event: MouseEvent): void {
    event.stopPropagation();
    this.closeMoreDropdown();
  }

  onLegacyInventoryLinkClick(event: MouseEvent): void {
    event.stopPropagation();
    this.closeMoreDropdown();
  }

  onMoreMenuLinkClick(event: MouseEvent): void {
    event.stopPropagation();
    this.closeMoreDropdown();
  }

  onMoreDropdownHidden(): void {
    this.closeSubmenu();
    this.moreMenuOpen = false;
  }

  closeMoreDropdown(): void {
    this.closeSubmenu();
    this.moreMenuOpen = false;
    this.collapseMoreDropdown();
    this.collapseMainNavbar();
  }

  private collapseMoreDropdown(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const trigger = document.getElementById('headerMoreDropdown');
    if (!trigger) {
      return;
    }
    const bs = (window as any).bootstrap;
    if (bs?.Dropdown) {
      const inst = bs.Dropdown.getInstance(trigger);
      inst?.hide();
    }
    trigger.classList.remove('show');
    trigger.setAttribute('aria-expanded', 'false');
    const dropdown = trigger.closest('.dropdown');
    dropdown?.classList.remove('show');
    dropdown?.querySelector('.dropdown-menu')?.classList.remove('show');
  }

  systemUpGrade(){
    this.api.updateSystem().subscribe(res => {
      console.log("this res: ", res);
    })
  }

  logOut(){
    this.messagingHub.reset();
    this.notifications = [];
    this.messagePreviews = [];
    this.messagesUnreadTotal = 0;
    document.cookie = 'sessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    sessionStorage.removeItem('userDetails');
    sessionStorage.removeItem('userType');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('userrole');
    sessionStorage.removeItem('userSecondaryRoles');
    sessionStorage.removeItem('useremail');
    sessionStorage.removeItem('userProfilePic');
    sessionStorage.removeItem('downloadUrl');
    sessionStorage.removeItem('item');
    this.router.navigate(['/login']);
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  get chevron() {
    return this.isDropdownOpen ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
  }

  signIn(){
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  buttonClickIconChange(){
    this.isText = !this.isText;
    this.isText ? this.iconChange = "bi bi-chevron-down" : this.iconChange = "bi bi-chevron-left";
  }

  buttonClickIconHelp(){
    this.isText = !this.isText;
    this.isText ? this.helpIcon = "bi bi-chevron-down" : this.helpIcon = "bi bi-chevron-up";
  }

  dropDropMethod(){
    this.isText = !this.isText;
    this.isText ? this.dropDrop = "bi bi-chevron-down" : this.dropDrop = "bi bi-chevron-up";
  }

  dropDropMethod2(){
    this.isText = !this.isText;
    this.isText ? this.dropDrop2 = "bi bi-chevron-down" : this.dropDrop2 = "bi bi-chevron-up";
  }

  toggleSubmenu(submenuId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const wasOpen = this.openSubmenus.has(submenuId);
    this.openSubmenus.clear();
    this.openSubmenu = null;

    if (!wasOpen) {
      this.openSubmenus.add(submenuId);
      this.openSubmenu = submenuId;
    }
  }

  isSubmenuOpen(submenuId: string): boolean {
    return this.openSubmenus.has(submenuId);
  }

  closeSubmenu(): void {
    this.openSubmenus.clear();
    this.openSubmenu = null;
  }

  collapseMainNavbar(): void {
    this.closeSubmenu();
    if (typeof document === 'undefined') {
      return;
    }
    const el = document.getElementById('navbarSupportedContent');
    const bs = (window as any).bootstrap;
    if (el && bs?.Collapse) {
      const inst = bs.Collapse.getInstance(el);
      if (inst) {
        inst.hide();
      }
    }
  }
}
