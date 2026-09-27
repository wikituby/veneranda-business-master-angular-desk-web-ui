import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { ThemeService } from '../../../services/theme.service';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { NgForm } from '@angular/forms';
import { UnitSellingModelPickerComponent } from '../../../shared/unit-selling-model-picker/unit-selling-model-picker.component';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-services-management',
  templateUrl: './services-management.component.html',
  styleUrls: ['./services-management.component.css']
})
export class ServicesManagementComponent implements OnInit, OnDestroy {

  // Table data properties
  serviceList: any[] = [];
  data: any[] = [];
  page: number = 1;
  itemsPerPage: number = 15;
  searchQuery: string = '';
  selectedColumn: string = 'all';

  /** Bumped when `serviceList` is replaced so filtered list cache invalidates even if length is unchanged. */
  private serviceListDataEpoch = 0;
  private filteredServicesCacheKey = '';
  private filteredServicesCache: any[] = [];

  /** Flat rows for the open category dropdown; avoids calling `categoryTreeRows()` on every CD cycle. */
  visibleCategoryTreeRows: Array<{ node: any; level: number }> = [];
  /** Flat rows for the open category action parent dropdown. */
  visibleCategoryActionParentRows: Array<{ node: any; level: number }> = [];
  /** Shown next to the category field while categories load during edit. */
  isEditCategoryLookupLoading = false;
  
  // Loading and response properties
  isLoadingService: boolean = false;
  responseColor = "";
  responseMessage = "";
  showDivUpdatedOut: boolean = false;
  
  // User permissions
  mdUser: boolean = false;
  deleter: boolean = false;
  
  // UI state properties
  isCollapsed = true;
  iconChange: string = "bi bi-chevron-down";
  eyeIcon: string = "bi bi-funnel";
  eyeIconDrop: string = "bi bi-chevron-down";
  isText: boolean = true;
  isDarkMode: boolean = false;
  
  // Form properties
  currentService: any = {};
  saveButtonStatus: string = "Add New Service";
  isButtonDisabled: boolean = false;
  showDivAddToDataBaseNewService: boolean = false;
  showDivUpdatedLoaderNewService: boolean = false;
  isCollapsedNewService: boolean = true;
  
  // Editing properties
  isEditingService: boolean = false;
  editingServiceId: number | null = null;
  selectedUnitSellingModelId: number | null = null;
  selectedUnitSellingModel: any = null;
  /** ON = unit sell model; OFF = open price at sale. */
  serviceUseUnitSellingModel = true;
  serviceFreeSellingPrice: number | null = null;
  
  // Delete confirmation modal properties
  showDeleteConfirmModal: boolean = false;
  serviceToDelete: any = null;
  
  // Category dropdowns
  categoryList: any[] = [];
  
  // Category dropdown properties
  filteredCategoryList: any[] = [];
  expandedCategoryIds = new Set<number>();
  selectedCategory: any = null;
  categorySearchQuery: string = '';
  isCategoryDropdownOpen: boolean = false;
  selectedCategoryName: string = '';
  currentCategoryName: string = 'Select category';
  currentCategoryId: any = null;
  // Category quick actions (from Add New Service category dropdown)
  showCategoryActionModal: boolean = false;
  categoryActionMode: 'addRoot' | 'addChild' | 'edit' = 'edit';
  categoryActionTarget: any = null;
  categoryActionForm: any = { name: '', description: '', parentId: null };
  isCategoryActionParentDropdownOpen: boolean = false;
  categoryActionParentSearchQuery: string = '';
  expandedCategoryActionParentIds = new Set<number>();
  categoryActionParentName: string = 'Select parent category';
  isSavingCategoryAction = false;
  showCategoryDeleteConfirm: boolean = false;
  categoryToDelete: any = null;

  /** Unit sell models popover in services table */
  openUnitSellMenuServiceId: number | null = null;
  openUnitSellMenuService: any = null;
  unitSellModelsList: any[] = [];
  unitSellModelsLoading = false;
  unitSellModelsSearchQuery = '';

  /** True while getAllProcedureCategories is in flight (avoids duplicate requests). */
  isCategoriesLoading = false;
  private pendingAfterCategoriesLoad: (() => void)[] = [];
  /** If true, run a full refresh once the current categories request finishes. */
  private pendingForceCategoriesRefresh = false;
  private routerSub?: Subscription;
  
  // ViewChild references
  @ViewChild('htmlData') htmlData!: ElementRef;
  @ViewChild('serviceModalOverlay') serviceModalOverlay?: ElementRef<HTMLElement>;
  @ViewChild('categoryActionModalOverlay') categoryActionModalOverlay?: ElementRef<HTMLElement>;
  @ViewChild('unitSellModelsModalOverlay') unitSellModelsModalOverlay?: ElementRef<HTMLElement>;
  @ViewChild('unitSellModelsPicker') unitSellModelsPicker?: UnitSellingModelPickerComponent;

  constructor(
    private router: Router,
    private api: ApiService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    const userRole = sessionStorage.getItem('userrole');
    const username = sessionStorage.getItem('username');

    // Subscribe to theme changes for real-time updates
    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    if (userRole === "md") {
      this.mdUser = true;
    }

    if (username === null) {
      this.router.navigate(['/login']);
    } else {
      if (userRole === "CUSTOMER") {
        this.router.navigate(['/products']);
      }
    }
    
    this.initializeTableData();
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationStart => event instanceof NavigationStart))
      .subscribe(() => this.closeUnitSellModelsMenu());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.category-dropdown-wrapper')) {
      this.isCategoryDropdownOpen = false;
      this.visibleCategoryTreeRows = [];
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.openUnitSellMenuServiceId == null) {
      return;
    }
    if (this.unitSellModelsPicker?.hasOpenOverlay()) {
      return;
    }
    event.preventDefault();
    this.closeUnitSellModelsMenu();
  }

  initializeTableData() {
    this.isLoadingService = true;
    this.api.getAllServices().subscribe({
      next: (res) => {
        this.isLoadingService = false;
        console.log("Raw services response:", res);
        
        // Ensure we have an array
        if (Array.isArray(res)) {
          this.serviceList = res;
          this.data = res;
        } else if (res && Array.isArray(res.data)) {
          this.serviceList = res.data;
          this.data = res.data;
        } else {
          console.warn("Unexpected services response structure:", res);
          this.serviceList = [];
          this.data = [];
        }
        this.serviceListDataEpoch++;

        console.log("Services loaded:", this.serviceList);
        this.page = 1;
      },
      error: (err: any) => {
        this.isLoadingService = false;
        console.error("Error loading services:", err);
        this.serviceList = [];
        this.data = [];
        this.serviceListDataEpoch++;
        this.responseColor = "#dc2626";
        const errorMsg = err.error?.message || err.message || "Error loading services. Please try again.";
        this.responseMessage = `Error: ${errorMsg}`;
        this.showDivUpdatedOut = true;
        setTimeout(() => {
          this.showDivUpdatedOut = false;
        }, 5000);
      }
    });
  }

  /**
   * Load categories for pickers. Queues callbacks if a request is already in flight.
   */
  loadCategories(onComplete?: () => void, forceRefresh = false): void {
    if (onComplete) {
      this.pendingAfterCategoriesLoad.push(onComplete);
    }

    if (forceRefresh && this.isCategoriesLoading) {
      this.pendingForceCategoriesRefresh = true;
      return;
    }

    if (!forceRefresh && this.categoryList.length > 0) {
      this.runPendingAfterCategoriesLoad();
      return;
    }

    if (this.isCategoriesLoading) {
      return;
    }

    this.fetchCategoriesFromApi();
  }

  /** Always refetch after create/update/delete category so the tree stays current. */
  refreshCategories(onComplete?: () => void): void {
    this.loadCategories(onComplete, true);
  }

  private fetchCategoriesFromApi(): void {
    this.isCategoriesLoading = true;
    this.api.getAllProcedureCategories().subscribe({
      next: (res: any) => {
        this.applyCategoriesResponse(res);
        this.completeCategoriesFetch();
      },
      error: (err: any) => {
        console.error('Error loading categories:', err);
        this.categoryList = [];
        this.filteredCategoryList = [];
        this.completeCategoriesFetch();
      }
    });
  }

  private completeCategoriesFetch(): void {
    this.isCategoriesLoading = false;
    this.runPendingAfterCategoriesLoad();

    if (this.pendingForceCategoriesRefresh) {
      this.pendingForceCategoriesRefresh = false;
      this.fetchCategoriesFromApi();
    }
  }

  private extractCategoryArray(res: any): any[] {
    if (Array.isArray(res)) {
      return res;
    }
    if (Array.isArray(res?.data)) {
      return res.data;
    }
    return [];
  }

  private getCategoryId(cat: any): number | null {
    const raw = cat?.id ?? cat?.procedureCategoryId ?? cat?.categoryId ?? null;
    if (raw == null || raw === '') {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getCategoryParentId(cat: any): number | null {
    const raw = cat?.parentId ?? cat?.parentCategoryId ?? cat?.parent?.id ?? null;
    if (raw == null || raw === '') {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeCategoryRecord(cat: any): any {
    const id = this.getCategoryId(cat);
    const parentId = this.getCategoryParentId(cat);
    const name = String(cat?.name || cat?.procedureCategory || cat?.category || '').trim();
    return {
      ...cat,
      id,
      parentId,
      name
    };
  }

  private applyCategoriesResponse(res: any): void {
    console.log('Raw categories response:', res);
    const raw = this.extractCategoryArray(res);
    this.categoryList = raw
      .map((cat) => this.normalizeCategoryRecord(cat))
      .filter((cat) => cat.id != null);
    this.filteredCategoryList = [...this.categoryList];
    console.log('Categories loaded:', this.categoryList.length);
    if (this.isCategoryDropdownOpen) {
      this.refreshVisibleCategoryTree();
    }
    if (this.isCategoryActionParentDropdownOpen || this.showCategoryActionModal) {
      this.refreshVisibleCategoryActionParentRows();
    }
  }

  private runPendingAfterCategoriesLoad(): void {
    const pending = [...this.pendingAfterCategoriesLoad];
    this.pendingAfterCategoriesLoad = [];
    pending.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    });
  }

  // Helper to get a readable category name from various possible DTO shapes
  getServiceCategoryName(service: any): string {
    if (!service) {
      return 'N/A';
    }

    // Try direct string fields first
    const directName =
      service.categoryName ||
      service.category ||
      service.procedureCategoryName ||
      service.procedureCategory ||
      service.serviceCategory;

    if (directName) {
      return directName.toString();
    }

    // Try nested DTOs
    const nestedName =
      service.categoryDto?.procedureCategory ||
      service.categoryDto?.name ||
      service.procedureCategoryDto?.procedureCategory ||
      service.procedureCategoryDto?.name ||
      service.category?.procedureCategory ||
      service.category?.name;

    if (nestedName) {
      return nestedName.toString();
    }

    return 'N/A';
  }

  getServiceParentCategoryName(service: any): string {
    if (!service) {
      return 'N/A';
    }

    const directName =
      service.categoryParent ||
      service.parentCategoryName ||
      service.parentCategory ||
      service.categoryParentName;

    if (directName) {
      return directName.toString();
    }

    const nestedName =
      service.parentCategoryDto?.name ||
      service.parentCategoryDto?.procedureCategory ||
      service.categoryDto?.parent?.name ||
      service.categoryDto?.parent?.procedureCategory ||
      service.category?.parent?.name;

    if (nestedName) {
      return nestedName.toString();
    }

    const { parentCategoryId, categoryId } = this.getServiceCategoryIds(service);
    if (parentCategoryId != null) {
      const resolved = this.resolveCategoryNameById(parentCategoryId);
      if (resolved) {
        return resolved;
      }
    }

    if (categoryId != null && this.categoryList?.length) {
      const category = this.categoryList.find((c) => this.getCategoryId(c) === categoryId);
      const parentId = category ? this.getCategoryParentId(category) : null;
      if (parentId != null) {
        const resolved = this.resolveCategoryNameById(parentId);
        if (resolved) {
          return resolved;
        }
      }
    }

    return '—';
  }

  getServiceInitials(service: any): string {
    const name = (service?.procedureName || '').trim();
    if (!name) {
      return '?';
    }
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    const word = parts[0];
    return (word.charAt(0) + (word.charAt(1) || word.charAt(0))).toUpperCase();
  }

  getServiceAvatarColor(service: any): string {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6'];
    const name = (service?.procedureName || '').trim();
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  /** Resolve category ids from service/category payloads with fallback shapes. */
  private getServiceCategoryIds(service: any): { categoryId: number | null; parentCategoryId: number | null } {
    const rawCategoryId =
      service?.categoryId ??
      service?.procedureCategoryId ??
      service?.categoryDto?.id ??
      service?.procedureCategoryDto?.id ??
      service?.category?.id;
    const rawParentId =
      service?.parentCategoryId ??
      service?.categoryParentId ??
      service?.categoryDto?.parentId ??
      service?.procedureCategoryDto?.parentId ??
      service?.category?.parentId;

    const categoryId = rawCategoryId != null && rawCategoryId !== '' && Number.isFinite(Number(rawCategoryId))
      ? Number(rawCategoryId)
      : null;
    const parentCategoryId = rawParentId != null && rawParentId !== '' && Number.isFinite(Number(rawParentId))
      ? Number(rawParentId)
      : null;
    return { categoryId, parentCategoryId };
  }

  openProcedureCategoryManager() {
    this.isCategoryDropdownOpen = false;
    this.visibleCategoryTreeRows = [];
    this.router.navigate(['/overview/services-management/service-categories']);
  }

  openNewCategoryFromServiceForm(): void {
    this.isCategoryDropdownOpen = false;
    this.visibleCategoryTreeRows = [];
    this.categoryActionMode = 'addRoot';
    this.categoryActionTarget = null;
    this.categoryActionForm = { name: '', description: '', parentId: null };
    this.categoryActionParentName = 'Top Level (No Parent)';
    this.isCategoryActionParentDropdownOpen = false;
    this.categoryActionParentSearchQuery = '';
    this.loadCategories(() => {
      this.refreshVisibleCategoryActionParentRows();
      this.revealCategoryActionModal();
    }, this.categoryList.length === 0);
  }

  get filteredServiceList(): any[] {
    const key = `${this.searchQuery}\x00${this.selectedColumn}\x00${this.serviceListDataEpoch}`;
    if (key !== this.filteredServicesCacheKey) {
      this.filteredServicesCacheKey = key;
      this.filteredServicesCache = this.computeFilteredServiceList();
    }
    return this.filteredServicesCache;
  }

  private computeFilteredServiceList(): any[] {
    if (!this.searchQuery.trim()) {
      return this.serviceList;
    }

    const query = this.searchQuery.toLowerCase().trim();

    if (this.selectedColumn === 'all') {
      return this.serviceList.filter(service => {
        const categoryName = this.getServiceCategoryName(service).toLowerCase();
        const parentCategoryName = this.getServiceParentCategoryName(service).toLowerCase();
        return (service.procedureName && service.procedureName.toLowerCase().includes(query)) ||
               (categoryName && categoryName.includes(query)) ||
               (parentCategoryName && parentCategoryName !== '—' && parentCategoryName.includes(query)) ||
               (service.description && service.description.toLowerCase().includes(query));
      });
    }

    return this.serviceList.filter(service => {
      let value: any;

      if (this.selectedColumn === 'category') {
        value = this.getServiceCategoryName(service);
      } else {
        value = service[this.selectedColumn];
      }

      return value && value.toString().toLowerCase().includes(query);
    });
  }

  get totalItemsCount(): number {
    return this.filteredServiceList.length;
  }

  // Category dropdown methods
  toggleCategoryDropdown() {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
    if (this.isCategoryDropdownOpen) {
      this.loadCategories(() => {
        this.categorySearchQuery = '';
        this.filterCategories();
      }, this.categoryList.length === 0);
    } else {
      this.visibleCategoryTreeRows = [];
    }
  }

  filterCategories() {
    if (!this.categorySearchQuery.trim()) {
      this.filteredCategoryList = [...this.categoryList];
    } else {
      const query = this.categorySearchQuery.toLowerCase();
      this.filteredCategoryList = this.categoryList.filter(category =>
        this.categoryLabel(category).toLowerCase().includes(query) ||
        String(category?.parentCategoryName || '').toLowerCase().includes(query) ||
        String(category?.categoryDescription || category?.description || '').toLowerCase().includes(query)
      );
    }
    this.refreshVisibleCategoryTree();
  }

  /** Rebuilds `visibleCategoryTreeRows` when the dropdown is open (search, expand/collapse, or data load). */
  private refreshVisibleCategoryTree(): void {
    if (!this.isCategoryDropdownOpen) {
      this.visibleCategoryTreeRows = [];
      return;
    }
    this.visibleCategoryTreeRows = this.categoryTreeRows();
  }

  private categoryLabel(category: any): string {
    return String(category?.name || category?.procedureCategory || category?.category || '').trim();
  }

  private categoryChildren(parentId: number): any[] {
    return (this.categoryList || []).filter(
      (c: any) => this.getCategoryParentId(c) === Number(parentId)
    );
  }

  categoryHasChildren(category: any): boolean {
    const id = this.getCategoryId(category);
    if (id == null) {
      return false;
    }
    return this.categoryChildren(id).length > 0;
  }

  hasSelectableCategoryChildren(category: any): boolean {
    return this.categoryHasChildren(category);
  }

  toggleCategoryNode(category: any, event: Event): void {
    event.stopPropagation();
    const id = this.getCategoryId(category);
    if (id == null) {
      return;
    }
    if (this.expandedCategoryIds.has(id)) {
      this.expandedCategoryIds.delete(id);
    } else {
      this.expandedCategoryIds.add(id);
    }
    this.refreshVisibleCategoryTree();
  }

  onCategoryRowClick(node: any, event: Event): void {
    event.stopPropagation();
    if (this.hasSelectableCategoryChildren(node)) {
      this.toggleCategoryNode(node, event);
      return;
    }
    this.selectCategory(node);
  }

  isCategoryExpanded(category: any): boolean {
    const id = Number(category?.id);
    return Number.isFinite(id) && this.expandedCategoryIds.has(id);
  }

  private topLevelCategories(): any[] {
    return (this.categoryList || []).filter((c: any) => this.getCategoryParentId(c) == null);
  }

  /** Flat rows for tree-style dropdown list. */
  categoryTreeRows(): Array<{ node: any; level: number }> {
    const query = (this.categorySearchQuery || '').toLowerCase().trim();
    const out: Array<{ node: any; level: number }> = [];
    const rows = this.categoryList || [];
    const matches = (c: any) =>
      this.categoryLabel(c).toLowerCase().includes(query) ||
      String(c?.categoryDescription || c?.description || '').toLowerCase().includes(query);

    const subtreeHasMatch = (c: any): boolean => {
      if (!query) return true;
      if (matches(c)) return true;
      const categoryId = this.getCategoryId(c);
      return categoryId != null && this.categoryChildren(categoryId).some((child) => subtreeHasMatch(child));
    };

    const walk = (c: any, level: number): void => {
      if (!subtreeHasMatch(c)) return;
      out.push({ node: c, level });
      const categoryId = this.getCategoryId(c);
      if (categoryId == null) return;
      const children = this.categoryChildren(categoryId);
      if (!children.length) return;
      const expanded = query ? true : this.isCategoryExpanded(c);
      if (!expanded) return;
      const sorted = [...children].sort((a, b) =>
        this.categoryLabel(a).localeCompare(this.categoryLabel(b), undefined, { sensitivity: 'base' })
      );
      sorted.forEach((child) => walk(child, level + 1));
    };

    const roots = this.topLevelCategories().sort((a, b) =>
      this.categoryLabel(a).localeCompare(this.categoryLabel(b), undefined, { sensitivity: 'base' })
    );
    roots.forEach((root) => walk(root, 0));
    return out;
  }

  private buildCategoryRequestPayload(name: string, description: string, parentId: number | null) {
    const trimmedName = String(name || '').trim();
    const trimmedDescription = String(description || '').trim();
    return {
      // New controller fields
      name: trimmedName,
      description: trimmedDescription,
      parentId: parentId,
      // Legacy-compatible fields still used by some request DTOs
      procedureCategory: trimmedName,
      categoryDescription: trimmedDescription,
    };
  }

  openEditCategoryFromDropdown(category: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.categoryActionMode = 'edit';
    this.categoryActionTarget = category;
    this.categoryActionForm = {
      name: this.categoryLabel(category),
      description: category?.categoryDescription || category?.description || '',
      parentId: this.getCategoryParentId(category),
    };
    this.categoryActionParentName = this.resolveCategoryNameById(this.categoryActionForm.parentId) || 'Select parent category';
    this.isCategoryActionParentDropdownOpen = false;
    this.categoryActionParentSearchQuery = '';
    this.loadCategories(() => {
      this.refreshVisibleCategoryActionParentRows();
      this.revealCategoryActionModal();
    }, this.categoryList.length === 0);
  }

  openAddChildCategoryFromDropdown(category: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.categoryActionMode = 'addChild';
    this.categoryActionTarget = category;
    this.categoryActionForm = { name: '', description: '', parentId: this.getCategoryId(category) };
    this.categoryActionParentName = this.categoryLabel(category) || 'Select parent category';
    const parentId = this.getCategoryId(category);
    if (parentId != null) {
      this.expandedCategoryActionParentIds.add(parentId);
    }
    this.isCategoryActionParentDropdownOpen = false;
    this.categoryActionParentSearchQuery = '';
    this.loadCategories(() => {
      this.refreshVisibleCategoryActionParentRows();
      this.revealCategoryActionModal();
    }, this.categoryList.length === 0);
  }

  closeCategoryActionModal(): void {
    this.showCategoryActionModal = false;
    this.isSavingCategoryAction = false;
    this.categoryActionTarget = null;
    this.categoryActionForm = { name: '', description: '', parentId: null };
    this.categoryActionParentName = 'Select parent category';
    this.isCategoryActionParentDropdownOpen = false;
    this.categoryActionParentSearchQuery = '';
    this.visibleCategoryActionParentRows = [];
  }

  getCategoryActionModalTitle(): string {
    if (this.categoryActionMode === 'edit') {
      return 'Edit Category';
    }
    if (this.categoryActionMode === 'addRoot') {
      return 'Add New Category';
    }
    return 'Add Child Category';
  }

  getCategoryActionSaveLabel(): string {
    if (this.categoryActionMode === 'edit') {
      return 'Update Category';
    }
    if (this.categoryActionMode === 'addRoot') {
      return 'Add Category';
    }
    return 'Add Child Category';
  }

  private extractCreatedCategoryEntity(res: any): any | null {
    const payload = res?.data ?? res?.entity ?? res;
    if (payload?.id != null || payload?.name) {
      return payload;
    }
    if (payload?.data?.id != null || payload?.data?.name) {
      return payload.data;
    }
    return null;
  }

  saveCategoryAction(): void {
    const name = String(this.categoryActionForm?.name || '').trim();
    if (!name) {
      this.responseColor = '#dc2626';
      this.responseMessage = 'Category name is required.';
      this.showDivUpdatedOut = true;
      setTimeout(() => (this.showDivUpdatedOut = false), 2500);
      return;
    }
    const description = String(this.categoryActionForm?.description || '').trim();
    const selectedParentIdRaw = this.categoryActionForm?.parentId;
    const selectedParentId = selectedParentIdRaw != null && selectedParentIdRaw !== '' ? Number(selectedParentIdRaw) : null;
    const parentId = Number.isFinite(selectedParentId as number) ? (selectedParentId as number) : null;
    const payload = this.buildCategoryRequestPayload(
      name,
      description,
      Number.isFinite(parentId as number) ? (parentId as number) : null
    );

    const req$ =
      this.categoryActionMode === 'edit'
        ? this.api.updateCategoryById(Number(this.categoryActionTarget?.id), payload)
        : this.api.saveNewCategory(payload);

    this.isSavingCategoryAction = true;
    const actionMode = this.categoryActionMode;
    req$.subscribe({
      next: (res: any) => {
        this.isSavingCategoryAction = false;
        const savedName = name;
        const createdEntity = actionMode === 'edit' ? null : this.extractCreatedCategoryEntity(res);
        this.responseColor = 'rgb(11, 155, 112)';
        this.responseMessage =
          res?.message ||
          (actionMode === 'edit'
            ? 'Category updated successfully.'
            : actionMode === 'addRoot'
              ? 'Category added successfully.'
              : 'Subcategory added successfully.');
        this.showDivUpdatedOut = true;
        this.closeCategoryActionModal();
        this.refreshCategories(() => {
          if (actionMode !== 'edit') {
            const createdId = createdEntity ? this.getCategoryId(createdEntity) : null;
            const match =
              (createdId != null
                ? this.categoryList.find((c) => this.getCategoryId(c) === createdId)
                : null) ||
              this.categoryList.find(
                (c) => this.categoryLabel(c).toLowerCase() === savedName.toLowerCase()
              );
            if (match) {
              this.selectCategory(match);
            }
          }
        });
        setTimeout(() => (this.showDivUpdatedOut = false), 2500);
      },
      error: (err: any) => {
        this.isSavingCategoryAction = false;
        this.responseColor = '#dc2626';
        this.responseMessage = err?.error?.message || 'Failed to save category changes.';
        this.showDivUpdatedOut = true;
        setTimeout(() => (this.showDivUpdatedOut = false), 3500);
      },
    });
  }

  openDeleteCategoryFromDropdown(category: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.categoryToDelete = category;
    this.showCategoryDeleteConfirm = true;
  }

  closeDeleteCategoryConfirm(): void {
    this.showCategoryDeleteConfirm = false;
    this.categoryToDelete = null;
  }

  confirmDeleteCategory(): void {
    const id = Number(this.categoryToDelete?.id);
    if (!Number.isFinite(id)) {
      this.closeDeleteCategoryConfirm();
      return;
    }
    this.api.deleteProcedureCategoryById(id).subscribe({
      next: (res: any) => {
        this.responseColor = 'rgb(11, 155, 112)';
        this.responseMessage = res?.message || 'Category deleted successfully.';
        this.showDivUpdatedOut = true;
        this.closeDeleteCategoryConfirm();
        this.refreshCategories();
        setTimeout(() => (this.showDivUpdatedOut = false), 2500);
      },
      error: (err: any) => {
        this.responseColor = '#dc2626';
        this.responseMessage = err?.error?.message || 'Failed to delete category.';
        this.showDivUpdatedOut = true;
        setTimeout(() => (this.showDivUpdatedOut = false), 3500);
      },
    });
  }

  private resolveCategoryNameById(id: any): string {
    if (id == null || id === '') return '';
    const n = Number(id);
    if (!Number.isFinite(n)) return '';
    const c = (this.categoryList || []).find((x: any) => Number(x?.id) === n);
    return c ? this.categoryLabel(c) : '';
  }

  toggleCategoryActionParentDropdown(): void {
    this.isCategoryActionParentDropdownOpen = !this.isCategoryActionParentDropdownOpen;
    if (this.isCategoryActionParentDropdownOpen) {
      this.categoryActionParentSearchQuery = '';
      this.refreshVisibleCategoryActionParentRows();
    } else {
      this.visibleCategoryActionParentRows = [];
    }
  }

  onCategoryActionParentSearchChange(): void {
    this.refreshVisibleCategoryActionParentRows();
  }

  refreshVisibleCategoryActionParentRows(): void {
    if (!this.isCategoryActionParentDropdownOpen && !this.showCategoryActionModal) {
      this.visibleCategoryActionParentRows = [];
      return;
    }
    this.visibleCategoryActionParentRows = this.buildCategoryActionParentTreeRows();
  }

  private collectDescendantIds(startId: number): Set<number> {
    const out = new Set<number>();
    const walk = (pid: number) => {
      const children = (this.categoryList || []).filter(
        (c: any) => this.getCategoryParentId(c) === pid
      );
      for (const c of children) {
        const id = this.getCategoryId(c);
        if (id != null && !out.has(id)) {
          out.add(id);
          walk(id);
        }
      }
    };
    walk(startId);
    return out;
  }

  private isValidParentCandidate(node: any): boolean {
    const nodeId = Number(node?.id);
    const targetId = Number(this.categoryActionTarget?.id);
    if (!Number.isFinite(nodeId)) return false;
    if (this.categoryActionMode === 'edit' && Number.isFinite(targetId)) {
      if (nodeId === targetId) return false; // cannot parent itself
      const descendants = this.collectDescendantIds(targetId);
      if (descendants.has(nodeId)) return false; // cannot parent to a child/descendant
    }
    return true;
  }

  categoryActionParentHasChildren(node: any): boolean {
    const nodeId = this.getCategoryId(node);
    if (nodeId == null) {
      return false;
    }
    return (this.categoryList || []).some(
      (c: any) => this.getCategoryParentId(c) === nodeId && this.isValidParentCandidate(c)
    );
  }

  toggleCategoryActionParentNode(node: any, event: Event): void {
    event.stopPropagation();
    const id = Number(node?.id);
    if (!Number.isFinite(id)) return;
    if (this.expandedCategoryActionParentIds.has(id)) {
      this.expandedCategoryActionParentIds.delete(id);
    } else {
      this.expandedCategoryActionParentIds.add(id);
    }
    this.refreshVisibleCategoryActionParentRows();
  }

  isCategoryActionParentExpanded(node: any): boolean {
    const id = Number(node?.id);
    return Number.isFinite(id) && this.expandedCategoryActionParentIds.has(id);
  }

  categoryActionParentTreeRows(): Array<{ node: any; level: number }> {
    return this.visibleCategoryActionParentRows;
  }

  private buildCategoryActionParentTreeRows(): Array<{ node: any; level: number }> {
    const q = (this.categoryActionParentSearchQuery || '').toLowerCase().trim();
    const rows = this.categoryList || [];
    const top = rows.filter(
      (c: any) => this.getCategoryParentId(c) == null && this.isValidParentCandidate(c)
    );
    const out: Array<{ node: any; level: number }> = [];
    const matches = (n: any) =>
      this.categoryLabel(n).toLowerCase().includes(q) ||
      String(n?.categoryDescription || n?.description || '').toLowerCase().includes(q);

    const childrenOf = (id: number) =>
      rows.filter((c: any) => this.getCategoryParentId(c) === id && this.isValidParentCandidate(c));

    const subtreeHas = (n: any): boolean => {
      if (!q) return true;
      if (matches(n)) return true;
      const nodeId = this.getCategoryId(n);
      return nodeId != null && childrenOf(nodeId).some((c: any) => subtreeHas(c));
    };

    const walk = (n: any, level: number): void => {
      if (!subtreeHas(n)) return;
      out.push({ node: n, level });
      const nodeId = this.getCategoryId(n);
      if (nodeId == null) return;
      const kids = childrenOf(nodeId);
      if (!kids.length) return;
      const expanded = q ? true : this.isCategoryActionParentExpanded(n);
      if (!expanded) return;
      kids
        .sort((a: any, b: any) => this.categoryLabel(a).localeCompare(this.categoryLabel(b), undefined, { sensitivity: 'base' }))
        .forEach((k: any) => walk(k, level + 1));
    };

    top
      .sort((a: any, b: any) => this.categoryLabel(a).localeCompare(this.categoryLabel(b), undefined, { sensitivity: 'base' }))
      .forEach((r: any) => walk(r, 0));
    return out;
  }

  selectCategoryActionParent(node: any): void {
    if (!node) {
      this.categoryActionForm.parentId = null;
      this.categoryActionParentName = 'Top Level (No Parent)';
    } else {
      this.categoryActionForm.parentId = this.getCategoryId(node);
      this.categoryActionParentName = this.categoryLabel(node) || 'Select parent category';
    }
    this.isCategoryActionParentDropdownOpen = false;
    this.visibleCategoryActionParentRows = [];
  }

  selectTopLevelCategoryActionParent(): void {
    this.selectCategoryActionParent(null);
  }

  onCategoryActionParentRowClick(node: any, event: Event): void {
    event.stopPropagation();
    if (this.categoryActionParentHasChildren(node)) {
      this.toggleCategoryActionParentNode(node, event);
      return;
    }
    this.selectCategoryActionParent(node);
  }

  selectCategory(category: any) {
    if (this.hasSelectableCategoryChildren(category)) {
      return;
    }

    this.selectedCategory = category;
    const categoryName = this.categoryLabel(category) || 'Unknown';
    const categoryId = this.getCategoryId(category);
    this.selectedCategoryName = categoryName;
    this.currentCategoryName = categoryName;
    this.currentCategoryId = categoryId;
    this.currentService.category = categoryName;
    this.currentService.categoryId = categoryId;
    this.currentService.parentCategoryId = this.getCategoryParentId(category);
    this.isCategoryDropdownOpen = false;
    this.visibleCategoryTreeRows = [];
  }

  // Export methods
  exportToExcel() {
    const dataToExport = this.filteredServiceList.map((service, index) => ({
      'SN': index + 1,
      'Service Name': service.procedureName || 'N/A',
      'Category': this.getServiceCategoryName(service),
      'Parent Category': this.getServiceParentCategoryName(service),
      'Unit Sell': service.unitSellingPrice || 'N/A',
      'Unit Cost': service.unitCostPrice || 'N/A',
      'Description': service.description || 'N/A'
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataToExport);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Services');
    XLSX.writeFile(wb, 'services.xlsx');
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
      pdf.save('services.pdf');
    });
  }

  // Service modal methods
  openServiceModal() {
    this.clearFormNewService();
    this.isCollapsedNewService = false;
    document.body.style.overflow = 'hidden';
    this.scheduleOverlayAttach(() => this.serviceModalOverlay);
  }

  clearFormNewService() {
    this.currentService = {
      procedureName: '',
      category: '',
      categoryId: null,
      parentCategoryId: null,
      unitSellingPrice: '',
      unitCostPrice: '',
      description: ''
    };
    this.selectedUnitSellingModelId = null;
    this.selectedUnitSellingModel = null;
    this.serviceUseUnitSellingModel = true;
    this.serviceFreeSellingPrice = null;
    this.selectedCategory = null;
    this.currentCategoryName = 'Select category';
    this.currentCategoryId = null;
    this.saveButtonStatus = "Add New Service";
    this.showDivAddToDataBaseNewService = false;
    this.showDivUpdatedLoaderNewService = false;
    this.isButtonDisabled = false;
    this.isEditingService = false;
    this.editingServiceId = null;
    this.isEditCategoryLookupLoading = false;
  }

  closeServiceModal() {
    this.isCollapsedNewService = true;
    document.body.style.overflow = '';
    this.clearFormNewService();
  }

  editService(service: any) {
    if (!service || !service.id) {
      console.error('Invalid service data for editing');
      return;
    }

    this.isEditingService = true;
    this.editingServiceId = service.id;
    const serviceCategoryName = this.getServiceCategoryName(service);

    this.currentService = {
      procedureName: service.procedureName || '',
      category: serviceCategoryName !== 'N/A' ? serviceCategoryName : '',
      categoryId: null,
      parentCategoryId: null,
      unitSellingPrice: service.unitSellingPrice || '',
      unitCostPrice: service.unitCostPrice || '',
      description: service.description || ''
    };
    this.selectedUnitSellingModelId = service.unitSellingModelId ?? null;
    this.selectedUnitSellingModel = null;
    this.serviceUseUnitSellingModel = service.useUnitSellingModel !== false;
    this.serviceFreeSellingPrice =
      service.unitSellingPrice != null && service.unitSellingPrice !== ''
        ? Number(service.unitSellingPrice)
        : null;

    const ids = this.getServiceCategoryIds(service);
    if (serviceCategoryName && serviceCategoryName !== 'N/A') {
      const existingCategory = this.categoryList.find(
        (c) =>
          (ids.categoryId != null && this.getCategoryId(c) === ids.categoryId) ||
          this.categoryLabel(c).toLowerCase() === serviceCategoryName.toLowerCase()
      );
      if (existingCategory) {
        this.selectCategory(existingCategory);
      } else {
        this.currentCategoryName = serviceCategoryName;
        this.currentCategoryId = ids.categoryId;
        this.currentService.categoryId = ids.categoryId;
        this.currentService.parentCategoryId = ids.parentCategoryId;
      }
    }

    this.saveButtonStatus = 'Update Service';
    this.showDivAddToDataBaseNewService = false;
    this.showDivUpdatedLoaderNewService = false;
    this.isButtonDisabled = false;
    this.isCollapsedNewService = false;
    document.body.style.overflow = 'hidden';
    this.scheduleOverlayAttach(() => this.serviceModalOverlay);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.closeUnitSellModelsMenu();
    document.body.style.overflow = '';
  }

  private revealCategoryActionModal(): void {
    this.showCategoryActionModal = true;
    this.scheduleOverlayAttach(() => this.categoryActionModalOverlay);
  }

  private scheduleOverlayAttach(ref: () => ElementRef<HTMLElement> | undefined): void {
    setTimeout(() => this.attachOverlayToBody(ref()?.nativeElement), 0);
  }

  private attachOverlayToBody(overlay?: HTMLElement | null): void {
    if (!overlay || overlay.parentElement === document.body) {
      return;
    }
    document.body.appendChild(overlay);
  }

  deleteService(service: any) {
    if (!service || !service.id) {
      console.error('Invalid service data for deletion');
      return;
    }

    this.serviceToDelete = service;
    this.showDeleteConfirmModal = true;
    document.body.style.overflow = 'hidden';
  }

  confirmDelete() {
    if (!this.serviceToDelete || !this.serviceToDelete.id) {
      this.closeDeleteConfirmModal();
      return;
    }

    this.isButtonDisabled = true;
    this.showDivUpdatedLoaderNewService = true;
    this.showDivAddToDataBaseNewService = false;
    this.showDeleteConfirmModal = false;

    this.api.deleteServiceById(this.serviceToDelete.id).subscribe({
      next: (res: any) => {
        this.showDivUpdatedLoaderNewService = false;
        this.isButtonDisabled = false;
        this.responseColor = 'rgb(11, 155, 112)';
        this.responseMessage = res?.message || "Service deleted successfully!";
        this.showDivAddToDataBaseNewService = true;

        setTimeout(() => {
          this.initializeTableData();
          this.showDivAddToDataBaseNewService = false;
          this.closeDeleteConfirmModal();
        }, 1000);
      },
      error: (err: any) => {
        this.showDivUpdatedLoaderNewService = false;
        this.isButtonDisabled = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err.error?.message || "Error deleting service. Please try again.";
        this.showDivAddToDataBaseNewService = true;
        console.error("Error deleting service: ", err);
        
        setTimeout(() => {
          this.showDivAddToDataBaseNewService = false;
        }, 4000);
        this.closeDeleteConfirmModal();
      }
    });
  }

  closeDeleteConfirmModal() {
    this.showDeleteConfirmModal = false;
    this.serviceToDelete = null;
    this.isButtonDisabled = false;
    document.body.style.overflow = '';
  }

  onServiceUnitSellChange(price: number): void {
    this.currentService.unitSellingPrice = price;
  }

  toggleUnitSellModelsMenu(service: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const serviceId = Number(service?.id);
    if (!Number.isFinite(serviceId) || serviceId <= 0) {
      return;
    }

    if (this.openUnitSellMenuServiceId === serviceId) {
      this.closeUnitSellModelsMenu();
      return;
    }

    this.openUnitSellMenuServiceId = serviceId;
    this.openUnitSellMenuService = service;
    this.unitSellModelsSearchQuery = '';
    this.unitSellModelsLoading = true;
    this.unitSellModelsList = [];
    document.body.style.overflow = 'hidden';
    this.scheduleOverlayAttach(() => this.unitSellModelsModalOverlay);
    this.reloadUnitSellModelsForModal();
  }

  reloadUnitSellModelsForModal(): void {
    const serviceId = Number(this.openUnitSellMenuServiceId);
    if (!Number.isFinite(serviceId) || serviceId <= 0) {
      return;
    }
    const service = this.openUnitSellMenuService;
    const unitCost = service?.unitCostPrice != null && service?.unitCostPrice !== ''
      ? Number(service.unitCostPrice)
      : null;
    this.unitSellModelsLoading = true;
    this.api.getProcedureUnitSellingModels(serviceId, unitCost).subscribe({
      next: (rows) => {
        this.unitSellModelsList = Array.isArray(rows) ? rows : [];
        this.unitSellModelsLoading = false;
      },
      error: () => {
        this.unitSellModelsList = [];
        this.unitSellModelsLoading = false;
      },
    });
  }

  get filteredUnitSellModelsList(): any[] {
    const q = this.unitSellModelsSearchQuery.trim().toLowerCase();
    if (!q) {
      return this.unitSellModelsList;
    }
    return this.unitSellModelsList.filter((model) =>
      `${model.name} ${model.unitSellingPrice} ${model.bundlePrice ?? ''} ${model.unitsInBundle ?? ''} ${model.profitMargin ?? ''}`
        .toLowerCase()
        .includes(q)
    );
  }

  getOpenServiceUnitCost(): number | null {
    const cost = this.openUnitSellMenuService?.unitCostPrice;
    if (cost == null || cost === '') {
      return null;
    }
    const n = Number(cost);
    return Number.isFinite(n) ? n : null;
  }

  openAddUnitSellModelEditor(): void {
    this.unitSellModelsPicker?.openAddEditorFromParent();
  }

  editUnitSellModelFromModal(model: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.unitSellModelsPicker?.openEditEditorFromParent(model);
  }

  deleteUnitSellModelFromModal(model: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.unitSellModelsPicker?.deleteModelFromParent(model);
  }

  onUnitSellModelsSaved(): void {
    this.reloadUnitSellModelsForModal();
    this.initializeTableData();
  }

  closeUnitSellModelsMenu(): void {
    this.openUnitSellMenuServiceId = null;
    this.openUnitSellMenuService = null;
    this.unitSellModelsList = [];
    this.unitSellModelsSearchQuery = '';
    this.unitSellModelsLoading = false;
    if (!this.showDeleteConfirmModal && this.isCollapsedNewService && !this.showCategoryActionModal) {
      document.body.style.overflow = '';
    }
  }

  isActiveUnitSellModel(model: any): boolean {
    const activeId = Number(this.openUnitSellMenuService?.unitSellingModelId);
    const modelId = Number(model?.id);
    return Number.isFinite(activeId) && Number.isFinite(modelId) && activeId === modelId;
  }

  formatUnitSellModelSummary(model: any): string {
    const units = Number(model?.unitsInBundle);
    const bundleUnits = Number.isFinite(units) && units > 0 ? Math.trunc(units) : 1;
    const bundle = Number(model?.bundlePrice);
    const bundleAmount = Number.isFinite(bundle) && bundle > 0
      ? bundle
      : (Number(model?.unitSellingPrice) || 0) * bundleUnits;
    const unitSell = Number(model?.unitSellingPrice) || 0;
    const margin = model?.profitMargin != null ? ` · Margin ${this.formatServiceMoney(model.profitMargin)}` : '';
    return `${bundleUnits} @ ${this.formatServiceMoney(bundleAmount)} → ${this.formatServiceMoney(unitSell)}/unit${margin}`;
  }

  formatServiceMoney(value: number | null | undefined): string {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return '0.00';
    }
    return n.toFixed(2);
  }

  onServiceUnitSellingModelSelected(model: any): void {
    this.selectedUnitSellingModel = model;
    if (model?.unitSellingPrice != null) {
      this.currentService.unitSellingPrice = model.unitSellingPrice;
    }
  }

  private buildInitialUnitSellingModelPayload(): any | null {
    const model = this.selectedUnitSellingModel;
    if (!model || this.selectedUnitSellingModelId == null || this.selectedUnitSellingModelId > 0) {
      return null;
    }
    return {
      name: model.name,
      unitsInBundle: model.unitsInBundle ?? 1,
      bundlePrice: model.bundlePrice ?? model.unitSellingPrice,
      unitSellingPrice: Number(model.unitSellingPrice) || 0,
      profitMargin: model.profitMargin ?? 0,
      isDefault: true,
    };
  }

  saveService(form: NgForm) {
    if (form.invalid) {
      this.responseColor = "#dc2626";
      this.responseMessage = "Please fill in all required fields.";
      this.showDivAddToDataBaseNewService = true;
      setTimeout(() => {
        this.showDivAddToDataBaseNewService = false;
      }, 4000);
      return;
    }

    if (!this.currentCategoryId) {
      this.responseColor = "#dc2626";
      this.responseMessage = "Please select a category.";
      this.showDivAddToDataBaseNewService = true;
      setTimeout(() => {
        this.showDivAddToDataBaseNewService = false;
      }, 4000);
      return;
    }

    const selectedCategory = this.categoryList.find(
      (c) => this.getCategoryId(c) === Number(this.currentCategoryId)
    );
    if (selectedCategory && this.hasSelectableCategoryChildren(selectedCategory)) {
      this.responseColor = "#dc2626";
      this.responseMessage = "Please select a subcategory. Parent categories with children cannot be used for services.";
      this.showDivAddToDataBaseNewService = true;
      setTimeout(() => {
        this.showDivAddToDataBaseNewService = false;
      }, 4000);
      return;
    }

    if (this.serviceUseUnitSellingModel && this.selectedUnitSellingModelId == null) {
      this.responseColor = "#dc2626";
      this.responseMessage = "Please select a unit selling model, or turn off fixed price.";
      this.showDivAddToDataBaseNewService = true;
      setTimeout(() => {
        this.showDivAddToDataBaseNewService = false;
      }, 4000);
      return;
    }

    if (
      !this.serviceUseUnitSellingModel &&
      !(Number(this.serviceFreeSellingPrice ?? this.currentService.unitSellingPrice) > 0)
    ) {
      this.responseColor = "#dc2626";
      this.responseMessage = "Enter a selling price, or turn on unit sell model pricing.";
      this.showDivAddToDataBaseNewService = true;
      setTimeout(() => {
        this.showDivAddToDataBaseNewService = false;
      }, 4000);
      return;
    }

    this.showDivUpdatedLoaderNewService = true;
    this.isButtonDisabled = true;
    this.showDivAddToDataBaseNewService = false;

    const openPrice = Number(this.serviceFreeSellingPrice ?? this.currentService.unitSellingPrice) || 0;
    const serviceData: any = {
      procedureName: this.currentService.procedureName || '',
      category: this.getServiceCategoryName(this.currentService) || this.currentService.category || '',
      categoryId: Number(this.currentCategoryId),
      parentCategoryId:
        this.currentService?.parentCategoryId != null && this.currentService?.parentCategoryId !== '' &&
        Number.isFinite(Number(this.currentService.parentCategoryId))
          ? Number(this.currentService.parentCategoryId)
          : null,
      unitSellingPrice: this.serviceUseUnitSellingModel
        ? (this.currentService.unitSellingPrice ? Number(this.currentService.unitSellingPrice) : 0)
        : openPrice,
      unitCostPrice: this.currentService.unitCostPrice ? Number(this.currentService.unitCostPrice) : 0,
      description: this.currentService.description || '',
      useUnitSellingModel: this.serviceUseUnitSellingModel !== false,
    };

    if (this.serviceUseUnitSellingModel && this.selectedUnitSellingModelId != null && this.selectedUnitSellingModelId > 0) {
      serviceData.unitSellingModelId = this.selectedUnitSellingModelId;
    }
    const initialModel = this.buildInitialUnitSellingModelPayload();
    if (initialModel) {
      serviceData.initialUnitSellingModel = initialModel;
    }

    console.log("Saving service data:", serviceData);

    if (this.isEditingService && this.editingServiceId) {
      // Update existing service
      this.api.updateServiceById(this.editingServiceId, serviceData).subscribe({
        next: (response) => {
          console.log("Service updated successfully:", response);

          this.showDivUpdatedLoaderNewService = false;
          
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)";
            this.responseMessage = response.message;
          } else {
            this.responseColor = "rgb(11, 155, 112)";
            this.responseMessage = "Service updated successfully!";
          }

          this.showDivAddToDataBaseNewService = true;
          
          this.initializeTableData();

          setTimeout(() => {
            this.showDivAddToDataBaseNewService = false;
            this.closeServiceModal();
            this.isButtonDisabled = false;
          }, 2500);
        },
        error: (error: any) => {
          console.error("Error updating service:", error);
          
          this.showDivUpdatedLoaderNewService = false;
          let errorMessage = "An unexpected error occurred. Please try again.";
          
          if (error.error) {
            if (error.error.message) {
              errorMessage = error.error.message;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            }
          }
          
          this.responseColor = "rgb(238, 16, 16)";
          this.responseMessage = errorMessage;
          this.showDivAddToDataBaseNewService = true;
          this.isButtonDisabled = false;

          setTimeout(() => {
            this.showDivAddToDataBaseNewService = false;
          }, 4000);
        }
      });
    } else {
      // Add new service via create-new-procedure endpoint
      console.log("Calling saveNewService (create-new-procedure endpoint) with data:", serviceData);
      this.api.saveNewService(serviceData).subscribe({
        next: (response) => {
          console.log("Service added successfully:", response);

          this.showDivUpdatedLoaderNewService = false;
          
          if (response && response.message) {
            this.responseColor = "rgb(11, 155, 112)";
            this.responseMessage = response.message;
          } else {
            this.responseColor = "rgb(11, 155, 112)";
            this.responseMessage = "Service added successfully!";
          }

          this.showDivAddToDataBaseNewService = true;
          
          this.initializeTableData();

          setTimeout(() => {
            this.showDivAddToDataBaseNewService = false;
            this.closeServiceModal();
            this.isButtonDisabled = false;
          }, 2500);
        },
        error: (error: any) => {
          console.error("Error adding service:", error);
          
          this.showDivUpdatedLoaderNewService = false;
          let errorMessage = "An unexpected error occurred. Please try again.";
          
          if (error.error) {
            if (error.error.message) {
              errorMessage = error.error.message;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            }
          }
          
          this.responseColor = "rgb(238, 16, 16)";
          this.responseMessage = errorMessage;
          this.showDivAddToDataBaseNewService = true;
          this.isButtonDisabled = false;

          setTimeout(() => {
            this.showDivAddToDataBaseNewService = false;
          }, 4000);
        }
      });
    }
  }

  onPageChange(pageNumber: number) {
    this.page = pageNumber;
  }

  onSearchQueryChange(value: string) {
    this.searchQuery = value;
  }

  onSelectedColumnChange(value: string) {
    this.selectedColumn = value;
  }

  onItemsPerPageChange(value: number) {
    this.itemsPerPage = value;
    this.page = 1; // Reset to first page when changing items per page
  }
}

