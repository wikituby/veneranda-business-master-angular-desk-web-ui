import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, StockDosageRule, StockDosageRulePayload } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { FilterPipeModule } from 'ngx-filter-pipe';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { findCreatedInList } from '../../../../utils/inventory-dropdown.util';
import {
  PRESCRIBING_DOSAGE_PROFILE_LABELS,
  PRESCRIBING_FREQUENCY_FIXED_OPTIONS,
  PRESCRIBING_PERIOD_BASIS_OPTIONS,
  PrescribingDosageProfiles,
  PrescribingFrequencyMode,
  PrescribingPeriodBasis,
  defaultPrescribingDosageProfiles,
  formatPrescribingFrequencyLabel,
  formatPrescribingPeriodBasisLabel,
  parseCustomFrequencyHours,
  parsePrescribingDosageJson,
  serializeCustomFrequencyHours,
  serializePrescribingDosageProfiles,
} from '../../../../config/stock-item-prescribing.config';

declare var $: any;

type StockDosageRuleFormRow = StockDosageRulePayload & {
  id?: number | null;
  _delete?: boolean;
  expanded?: boolean;
};

@Component({
  selector: 'app-consumable-items',
  templateUrl: './consumable-items.component.html',
  styleUrls: ['./consumable-items.component.css']
})
export class ConsumableItemsComponent implements OnInit {

  // Table data properties
  stockItemList: any[] = [];
  data: any[] = [];
  page: number = 1;
  itemsPerPage: number = 15;
  searchQuery: string = '';
  selectedColumn: string = 'all';
  
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
  currentStockItem: any = {};
  saveButtonStatus: string = "Add New Consumable Item";
  isButtonDisabled: boolean = false;
  showDivAddToDataBaseNewStockItem: boolean = false;
  showDivUpdatedLoaderNewStockItem: boolean = false;
  isCollapsedNewStockItem: boolean = true;

  /** Flutter-aligned sale / business category defaults for consumable products. */
  saleCategoryOptions: string[] = ['Retail', 'Wholesale', 'Service'];
  businessCategoryOptions: string[] = ['Supermarket', 'Hardware'];
  
  // Editing properties
  isEditingStockItem: boolean = false;
  editingStockItemId: number | null = null;
  
  // Delete confirmation modal properties
  showDeleteConfirmModal: boolean = false;
  stockItemToDelete: any = null;
  
  // Details modal properties
  showDetailsModal: boolean = false;
  selectedStockItemDetails: any = null;
  
  // Brand dropdown properties
  brandList: any[] = [];
  filteredBrandList: any[] = [];
  selectedBrand: any = null;
  brandSearchQuery: string = '';
  isBrandDropdownOpen: boolean = false;
  selectedBrandName: string = '';
  currentBrandName: string = 'Select brand'; // Display name for Bootstrap dropdown
  currentBrandId: any = null; // ID for Bootstrap dropdown
  
  // Add brand modal properties
  isCollapsedNewBrand: boolean = true;
  currentBrand: any = {};
  showDivAddToDataBaseNewBrand: boolean = false;
  showDivUpdatedLoaderNewBrand: boolean = false;
  isButtonDisabledBrand: boolean = false;
  isEditingBrand: boolean = false;
  editingBrandId: number | null = null;
  
  // Manufacturer dropdown properties (for stock item)
  manufacturerList: any[] = [];
  filteredManufacturerList: any[] = [];
  selectedManufacturer: any = null;
  manufacturerSearchQuery: string = '';
  isManufacturerDropdownOpen: boolean = false;
  selectedManufacturerName: string = '';
  currentManufacturerName: string = 'Select manufacturer';
  currentManufacturerId: any = null;

  // Brand manufacturer dropdown properties
  brandManufacturerSearchQuery: string = '';
  isBrandManufacturerDropdownOpen: boolean = false;
  currentBrandManufacturerName: string = 'Select manufacturer';
  currentBrandManufacturerId: any = null;
  manufacturerModalOpenedFromBrand: boolean = false;
  
  // Add manufacturer modal properties
  isCollapsedNewManufacturer: boolean = true;
  currentManufacturer: any = {};
  showDivAddToDataBaseNewManufacturer: boolean = false;
  showDivUpdatedLoaderNewManufacturer: boolean = false;
  isButtonDisabledManufacturer: boolean = false;
  isEditingManufacturer: boolean = false;
  editingManufacturerId: number | null = null;
  
  // Formulation dropdown properties
  formulationList: any[] = [];
  filteredFormulationList: any[] = [];
  selectedFormulation: any = null;
  formulationSearchQuery: string = '';
  isFormulationDropdownOpen: boolean = false;
  selectedFormulationName: string = '';
  
  // Add formulation modal properties
  isCollapsedNewFormulation: boolean = true;
  currentFormulation: any = {};
  showDivAddToDataBaseNewFormulation: boolean = false;
  showDivUpdatedLoaderNewFormulation: boolean = false;
  isButtonDisabledFormulation: boolean = false;
  isEditingFormulation: boolean = false;
  editingFormulationId: number | null = null;
  
  // Lowest Package dropdown properties
  lowestPackageList: any[] = [];
  filteredLowestPackageList: any[] = [];
  selectedLowestPackage: any = null;
  lowestPackageSearchQuery: string = '';
  isLowestPackageDropdownOpen: boolean = false;
  selectedLowestPackageName: string = '';
  
  // Unit of Sell Measure dropdown (uses same list/endpoint as Lowest Package)
  filteredSellMeasureLowestPackageList: any[] = [];
  sellMeasureLowestPackageSearchQuery: string = '';
  isSellMeasureLowestPackageDropdownOpen: boolean = false;
  selectedSellMeasureLowestPackageName: string = '';
  private openLowestPackageFromSellMeasure: boolean = false;
  
  // Add lowest package modal properties
  isCollapsedNewLowestPackage: boolean = true;
  currentLowestPackage: any = {};
  showDivAddToDataBaseNewLowestPackage: boolean = false;
  showDivUpdatedLoaderNewLowestPackage: boolean = false;
  isButtonDisabledLowestPackage: boolean = false;
  isEditingLowestPackage: boolean = false;
  editingLowestPackageId: number | null = null;
  
  // Category dropdown properties
  categoryList: any[] = [];
  categoryTree: any[] = []; // Hierarchical tree structure
  filteredCategoryList: any[] = [];
  filteredCategoryTree: any[] = []; // Filtered hierarchical tree
  selectedCategory: any = null;
  categorySearchQuery: string = '';
  isCategoryDropdownOpen: boolean = false;
  selectedCategoryName: string = '';
  selectedCategoryTopParentName: string = '';
  expandedCategoryIds: Set<number> = new Set<number>();
  expandedItemModalCategoryIds: Set<number> = new Set<number>();
  expandedCategoryParentIds: Set<number> = new Set<number>();
  
  // Add category modal properties
  isCollapsedNewCategory: boolean = true;
  isCategoryModalFromItemModal: boolean = false;
  /** Which dropdown opened the category modal (controls auto-select after save). */
  categoryModalSource: 'main' | 'item' | 'parent' = 'main';
  currentCategory: any = {};
  showDivAddToDataBaseNewCategory: boolean = false;
  showDivUpdatedLoaderNewCategory: boolean = false;
  isButtonDisabledCategory: boolean = false;
  isEditingCategory: boolean = false;
  editingCategoryId: number | null = null;
  showDeleteCategoryConfirmModal = false;
  categoryToDelete: any = null;
  categoryDeletePreview: { id: number; name: string; level: number; isRoot: boolean }[] = [];
  private categoryDeleteOrder: number[] = [];
  isDeletingCategory = false;
  isPreparingCategoryDelete = false;
  categoryDeleteProgress = { current: 0, total: 0, name: '' };
  /** Preserves category picker dropdown state across add/edit/delete flows. */
  private categoryDropdownSession: {
    mainOpen: boolean;
    itemOpen: boolean;
    parentOpen: boolean;
    focusParentId: number | null;
  } | null = null;
  
  // Category modal parent category dropdown properties
  isCategoryModalParentDropdownOpen: boolean = false;
  selectedCategoryModalParent: any = null;
  selectedCategoryModalParentName: string = '';
  categoryModalParentSearchQuery: string = '';
  filteredCategoryModalParentList: any[] = [];
  
  // Route of Admin dropdown properties
  routeOfAdminList: any[] = [];
  filteredRouteOfAdminList: any[] = [];
  selectedRouteOfAdmin: any = null;
  routeOfAdminSearchQuery: string = '';
  isRouteOfAdminDropdownOpen: boolean = false;
  selectedRouteOfAdminName: string = '';
  
  // Add route of admin modal properties
  isCollapsedNewRouteOfAdmin: boolean = true;
  currentRouteOfAdmin: any = {};
  showDivAddToDataBaseNewRouteOfAdmin: boolean = false;
  showDivUpdatedLoaderNewRouteOfAdmin: boolean = false;
  isButtonDisabledRouteOfAdmin: boolean = false;
  isEditingRouteOfAdmin: boolean = false;
  editingRouteOfAdminId: number | null = null;
  
  // Strength Unit (Composition Unit) dropdown properties
  strengthUnitList: any[] = [];
  filteredStrengthUnitList: any[] = [];
  selectedStrengthUnit: any = null;
  strengthUnitSearchQuery: string = '';
  isStrengthUnitDropdownOpen: boolean = false;
  selectedStrengthUnitName: string = '';
  
  // Sell Measure Strength Unit dropdown
  isSellMeasureStrengthUnitDropdownOpen: boolean = false;
  selectedSellMeasureStrengthUnitName: string = '';
  sellMeasureStrengthUnitSearchQuery: string = '';
  private openStrengthUnitFromSellMeasure: boolean = false;
  private openStrengthUnitFromPrescribing: boolean = false;
  private openStrengthUnitFromReconstitution: boolean = false;
  private currentIngredientIndexForNewUnit: number = -1;
  
  // Prescribing Strength Unit dropdown
  isPrescribingStrengthUnitDropdownOpen: boolean = false;
  selectedPrescribingStrengthUnitName: string = '';
  prescribingStrengthUnitSearchQuery: string = '';

  /** Default prescription profile on consumable item (drug category only). */
  prescribingPeriodBasisOptions = PRESCRIBING_PERIOD_BASIS_OPTIONS;
  prescribingFrequencyFixedOptions = PRESCRIBING_FREQUENCY_FIXED_OPTIONS;
  prescribingDosageProfileLabels = PRESCRIBING_DOSAGE_PROFILE_LABELS;
  prescribingPeriodBasis: PrescribingPeriodBasis = 'DAY';
  prescribingDosageProfiles: PrescribingDosageProfiles = defaultPrescribingDosageProfiles();
  prescribingFrequencyMode: PrescribingFrequencyMode = 'FIXED_INTERVAL';
  prescribingFrequencyFixed = 'OD';
  prescribingCustomHours: number[] = [];
  stockDosageRuleRows: StockDosageRuleFormRow[] = [];
  deletedStockDosageRuleIds: number[] = [];
  isLoadingStockDosageRules = false;
  private dosageRulesLoadToken = 0;
  dosageRuleCalculationTypes = [
    { value: 'FIXED', label: 'Fixed dose' },
    { value: 'WEIGHT_PER_DOSE', label: 'Weight per dose' },
    { value: 'WEIGHT_PER_DAY', label: 'Weight per day' },
  ];
  dosageRulePeriodUnits = [
    { value: 1 / 1440, label: 'Minute(s)' },
    { value: 1 / 24, label: 'Hour(s)' },
    { value: 1, label: 'Day' },
    { value: 7, label: 'Week' },
    { value: 30, label: 'Month' },
  ];
  
  // Add strength unit modal properties
  isCollapsedNewStrengthUnit: boolean = true;
  currentStrengthUnit: any = {};
  showDivAddToDataBaseNewStrengthUnit: boolean = false;
  showDivUpdatedLoaderNewStrengthUnit: boolean = false;
  isButtonDisabledStrengthUnit: boolean = false;
  isEditingStrengthUnit: boolean = false;
  editingStrengthUnitId: number | null = null;
  
  // Reconstitution Unit dropdown properties
  reconstitutionUnitList: any[] = [];
  filteredReconstitutionUnitList: any[] = [];
  selectedReconstitutionUnit: any = null;
  reconstitutionUnitSearchQuery: string = '';
  isReconstitutionUnitDropdownOpen: boolean = false;
  selectedReconstitutionUnitName: string = '';
  showReconstitutionFields: boolean = false;
  
  // Active Ingredients & Strengths properties
  ingredients: any[] = [];
  private ingredientRowSeq = 1;
  /** Multiple indication entities for the consumable item modal */
  indicationRows: { rowId: number; id: number | null; text: string }[] = [];
  private indicationRowSeq = 1;
  itemList: any[] = [];
  filteredItemList: any[] = [];
  ingredientUnitList: any[] = [];
  filteredIngredientUnitList: any[] = [];
  
  // Add Product modal properties
  isCollapsedNewItem: boolean = true;
  currentItem: any = {};
  showDivAddToDataBaseNewItem: boolean = false;
  showDivUpdatedLoaderNewItem: boolean = false;
  isButtonDisabledItem: boolean = false;
  currentIngredientIndexForNewItem: number = -1; // Track which ingredient row opened the modal
  isEditingItem: boolean = false;
  editingItemId: number | null = null;
  
  // Item modal category dropdown properties
  isItemModalCategoryDropdownOpen: boolean = false;
  selectedItemModalCategory: any = null;
  selectedItemModalCategoryName: string = '';
  itemModalCategorySearchQuery: string = '';
  
  // ViewChild references
  @ViewChild('htmlData') htmlData!: ElementRef;

  // Bulk import properties
  showImportModal = false;
  importPreviewRows: Array<{
    rowNumber: number;
    data: any;
    preview: { brand: string; formulation: string; category: string };
    errors: string[];
    warnings: string[];
    isValid: boolean;
  }> = [];
  importFileName = '';
  importParseError = '';
  importUploading = false;
  importProgress = { current: 0, total: 0 };
  private importLookupsReady = false;

  private readonly importTemplateHeaders = [
    'Brand',
    'Formulation',
    'Lowest Package',
    'Route of Admin',
    'Category',
    'Total Composition Value',
    'Total Composition Unit',
    'Active Ingredient 1',
    'Strength 1',
    'Ingredient Unit 1',
    'Active Ingredient 2',
    'Strength 2',
    'Ingredient Unit 2',
    'Description',
    'Indication',
    'Notes'
  ];

  private readonly importHeaderAliases: Record<string, string> = {
    sn: '_skip',
    brand: 'brand',
    brandname: 'brand',
    formulation: 'formulation',
    lowestpackage: 'lowestPackage',
    'lowest package': 'lowestPackage',
    routeofadmin: 'routeOfAdmin',
    'route of admin': 'routeOfAdmin',
    route: 'routeOfAdmin',
    category: 'category',
    itemcategory: 'category',
    totalcompositionvalue: 'totalCompositionValue',
    'total composition value': 'totalCompositionValue',
    totalcompositionunit: 'totalCompositionUnit',
    'total composition unit': 'totalCompositionUnit',
    activeingredient1: 'activeIngredient1',
    'active ingredient 1': 'activeIngredient1',
    activeingredient: 'activeIngredient1',
    'active ingredient': 'activeIngredient1',
    strength1: 'strength1',
    'strength 1': 'strength1',
    ingredientunit1: 'ingredientUnit1',
    'ingredient unit 1': 'ingredientUnit1',
    activeingredient2: 'activeIngredient2',
    'active ingredient 2': 'activeIngredient2',
    strength2: 'strength2',
    'strength 2': 'strength2',
    ingredientunit2: 'ingredientUnit2',
    'ingredient unit 2': 'ingredientUnit2',
    description: 'description',
    indication: 'indication',
    notes: 'notes'
  };

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
    this.loadCategories();
  }

  initializeTableData() {
    this.isLoadingService = true;

    this.api.getAllStockItems().subscribe({
      next: (res) => {
        this.isLoadingService = false;
        this.stockItemList = res || [];
        this.data = res || [];
        console.log("Stock items loaded: ", this.stockItemList);
        this.page = 1;
      },
      error: (err) => {
        this.isLoadingService = false;
        this.stockItemList = [];
        this.data = [];
        console.error("Error loading stock items: ", err);
        this.responseColor = "#dc2626";
        this.responseMessage = "Error loading consumable items. Please try again.";
        this.showDivUpdatedOut = true;
        setTimeout(() => {
          this.showDivUpdatedOut = false;
        }, 5000);
      }
    });
  }

  get filteredStockItemList(): any[] {
    if (!this.stockItemList || !this.searchQuery) return this.stockItemList;
    const query = this.searchQuery.toLowerCase().trim();
    return this.stockItemList.filter((item) => {
      if (!item) return false;
      const stockItemName = this.getStockItemDisplayName(item).toLowerCase();
      
      switch (this.selectedColumn) {
        case 'all':
          return stockItemName.includes(query);
        case 'stockItemName':
          return stockItemName.includes(query);
        default:
          return false;
      }
    });
  }

  // Export functionality
  exportToExcel(): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredStockItemList);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'consumable-items.xlsx');
  }

  downloadPdf() {
    const element = this.htmlData.nativeElement;
    html2canvas(element).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
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
      pdf.save('consumable-items.pdf');
    });
  }

  openImportModal(): void {
    this.resetImportState();
    this.showImportModal = true;
    document.body.style.overflow = 'hidden';
    void this.ensureImportLookupsLoaded();
  }

  closeImportModal(): void {
    if (this.importUploading) {
      return;
    }
    this.showImportModal = false;
    this.resetImportState();
    document.body.style.overflow = '';
  }

  private resetImportState(): void {
    this.importPreviewRows = [];
    this.importFileName = '';
    this.importParseError = '';
    this.importProgress = { current: 0, total: 0 };
  }

  private async ensureImportLookupsLoaded(): Promise<void> {
    if (this.importLookupsReady) {
      return;
    }
    await Promise.all([
      this.loadBrands(),
      this.loadFormulations(),
      this.loadLowestPackages(),
      this.loadCategories(),
      this.loadRoutesOfAdmin(),
      this.loadStrengthUnits(),
      this.loadItems(),
      this.loadIngredientUnits()
    ]);
    this.importLookupsReady = true;
  }

  downloadImportTemplate(): void {
    const sampleRow = {
      Brand: 'Example Brand',
      Formulation: 'Tablet',
      'Lowest Package': 'Strip',
      'Route of Admin': 'Oral',
      Category: 'Consumables',
      'Total Composition Value': 500,
      'Total Composition Unit': 'mg',
      'Active Ingredient 1': 'Paracetamol',
      'Strength 1': 500,
      'Ingredient Unit 1': 'mg',
      'Active Ingredient 2': '',
      'Strength 2': '',
      'Ingredient Unit 2': '',
      Description: 'Sample consumable item',
      Indication: '',
      Notes: ''
    };

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([sampleRow], { header: this.importTemplateHeaders });
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consumables');
    XLSX.writeFile(wb, 'consumable-items-import-template.xlsx');
  }

  onImportFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.importFileName = file.name;
    this.importParseError = '';
    this.importPreviewRows = [];

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      void this.ensureImportLookupsLoaded().then(() => {
        try {
          const data = e.target?.result;
          if (!data) {
            this.importParseError = 'Could not read the selected file.';
            return;
          }

          let workbook: XLSX.WorkBook;
          if (file.name.toLowerCase().endsWith('.csv')) {
            const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
            workbook = XLSX.read(text, { type: 'string' });
          } else {
            workbook = XLSX.read(data, { type: 'array' });
          }

          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            this.importParseError = 'The file has no worksheets.';
            return;
          }

          const sheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
          if (!rawRows.length) {
            this.importParseError = 'No rows found. Use the template and add data from row 2.';
            return;
          }

          this.importPreviewRows = rawRows.map((row, index) => this.buildImportPreviewRow(row, index + 2));
        } catch {
          this.importParseError = 'Failed to parse file. Please use the provided Excel template.';
        } finally {
          input.value = '';
        }
      });
    };

    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  get importValidRows(): any[] {
    return this.importPreviewRows.filter((row) => row.isValid).map((row) => row.data);
  }

  get importInvalidCount(): number {
    return this.importPreviewRows.filter((row) => !row.isValid).length;
  }

  async uploadImportedConsumables(): Promise<void> {
    const rows = this.importValidRows;
    if (!rows.length) {
      this.responseColor = 'rgb(238, 16, 16)';
      this.responseMessage = 'No valid rows to import. Fix errors in the preview first.';
      this.showDivUpdatedOut = true;
      setTimeout(() => { this.showDivUpdatedOut = false; }, 5000);
      return;
    }

    this.importUploading = true;
    this.importProgress = { current: 0, total: rows.length };
    let successCount = 0;
    const failures: string[] = [];

    for (const row of rows) {
      this.importProgress.current += 1;
      try {
        await firstValueFrom(this.api.createOrUpdateStockItem(row.payload));
        successCount += 1;
      } catch (err: any) {
        const message = err?.error?.message || err?.message || 'Unknown error';
        failures.push(`Row ${row.rowNumber}: ${message}`);
      }
    }

    this.importUploading = false;
    this.importProgress = { current: 0, total: 0 };

    if (successCount > 0) {
      this.initializeTableData();
    }

    if (failures.length === 0) {
      this.responseColor = 'rgb(11, 155, 112)';
      this.responseMessage = `Imported ${successCount} consumable item(s) successfully.`;
      this.showDivUpdatedOut = true;
      this.closeImportModal();
      setTimeout(() => { this.showDivUpdatedOut = false; }, 5000);
      return;
    }

    this.responseColor = 'rgb(238, 16, 16)';
    this.responseMessage = failures.length === rows.length
      ? `Import failed. ${failures[0]}`
      : `Imported ${successCount} of ${rows.length}. ${failures.slice(0, 3).join(' ')}`;
    this.showDivUpdatedOut = true;
    setTimeout(() => { this.showDivUpdatedOut = false; }, 8000);
  }

  private buildImportPreviewRow(raw: Record<string, any>, rowNumber: number) {
    const normalized = this.normalizeImportRow(raw);
    const errors: string[] = [];
    const warnings: string[] = [];

    const brandName = this.cleanImportText(normalized['brand']);
    const formulationName = this.cleanImportText(normalized['formulation']);
    const lowestPackageName = this.cleanImportText(normalized['lowestPackage']);
    const routeOfAdminName = this.cleanImportText(normalized['routeOfAdmin']);
    const categoryName = this.cleanImportText(normalized['category']);
    const description = this.cleanImportText(normalized['description']);
    const indication = this.cleanImportText(normalized['indication']);
    const notes = this.cleanImportText(normalized['notes']);

    if (!brandName) {
      errors.push('Brand is required');
    }

    const brandId = this.resolveImportBrandId(brandName);
    if (brandName && brandId == null) {
      errors.push(`Brand "${brandName}" not found`);
    }

    const formulationId = this.resolveImportFormulationId(formulationName);
    if (formulationName && formulationId == null) {
      warnings.push(`Formulation "${formulationName}" not found`);
    }

    const lowestPackageId = this.resolveImportLowestPackageId(lowestPackageName);
    if (lowestPackageName && lowestPackageId == null) {
      warnings.push(`Lowest package "${lowestPackageName}" not found`);
    }

    const routeOfAdminId = this.resolveImportRouteOfAdminId(routeOfAdminName);
    if (routeOfAdminName && routeOfAdminId == null) {
      warnings.push(`Route of admin "${routeOfAdminName}" not found`);
    }

    const itemCategoryId = this.resolveImportCategoryId(categoryName);
    if (categoryName && itemCategoryId == null) {
      warnings.push(`Category "${categoryName}" not found`);
    }

    const totalCompositionValue = this.parseImportNumber(normalized['totalCompositionValue']);
    const totalCompositionUnitName = this.cleanImportText(normalized['totalCompositionUnit']);
    const totalCompositionUnitId = this.resolveImportStrengthUnitId(totalCompositionUnitName);
    if (totalCompositionUnitName && totalCompositionUnitId == null) {
      warnings.push(`Total composition unit "${totalCompositionUnitName}" not found`);
    }
    if (totalCompositionValue != null && totalCompositionUnitId == null) {
      errors.push('Total composition unit is required when a composition value is provided');
    }

    const ingredients = this.buildImportIngredients(normalized, errors, warnings);

    const payload = {
      brandId,
      formulationId,
      lowestPackageId,
      routeOfAdminId,
      itemCategoryId,
      totalCompositionValue,
      totalCompositionUnitId,
      description: description || null,
      indication: indication || null,
      notes: notes || null,
      ingredients
    };

    return {
      rowNumber,
      data: { rowNumber, payload },
      preview: {
        brand: brandName || '—',
        formulation: formulationName || '—',
        category: categoryName || '—'
      },
      errors,
      warnings,
      isValid: errors.length === 0
    };
  }

  private buildImportIngredients(
    normalized: Record<string, unknown>,
    errors: string[],
    warnings: string[]
  ): Array<{ activeIngredientId: number; strength: number; unitId: number }> {
    const ingredients: Array<{ activeIngredientId: number; strength: number; unitId: number }> = [];

    for (const slot of [1, 2] as const) {
      const ingredientName = this.cleanImportText(normalized[`activeIngredient${slot}`]);
      const strength = this.parseImportNumber(normalized[`strength${slot}`]);
      const unitName = this.cleanImportText(normalized[`ingredientUnit${slot}`]);

      if (!ingredientName && strength == null && !unitName) {
        continue;
      }

      if (!ingredientName || strength == null || !unitName) {
        errors.push(`Active ingredient ${slot} requires name, strength, and unit`);
        continue;
      }

      const activeIngredientId = this.resolveImportActiveIngredientId(ingredientName);
      const unitId = this.resolveImportStrengthUnitId(unitName);

      if (activeIngredientId == null) {
        errors.push(`Active ingredient "${ingredientName}" not found`);
      }
      if (unitId == null) {
        errors.push(`Ingredient unit "${unitName}" not found`);
      }
      if (activeIngredientId != null && unitId != null) {
        ingredients.push({ activeIngredientId, strength, unitId });
      } else if (activeIngredientId == null || unitId == null) {
        warnings.push(`Skipped active ingredient ${slot}`);
      }
    }

    return ingredients;
  }

  private normalizeImportRow(raw: Record<string, any>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      const field = this.resolveImportHeader(key);
      if (!field || field === '_skip') {
        continue;
      }
      if (normalized[field] === undefined || normalized[field] === '') {
        normalized[field] = value;
      }
    }
    return normalized;
  }

  private resolveImportHeader(header: string): string | null {
    const key = String(header || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!key) {
      return null;
    }
    if (this.importHeaderAliases[key]) {
      return this.importHeaderAliases[key];
    }
    const compact = key.replace(/\s+/g, '');
    return this.importHeaderAliases[compact] || null;
  }

  private cleanImportText(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }
    return String(value).trim();
  }

  private parseImportNumber(value: unknown): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private normalizeImportLookup(value: unknown): string {
    return this.cleanImportText(value).toLowerCase();
  }

  private resolveImportBrandId(name: string): number | null {
    const target = this.normalizeImportLookup(name);
    if (!target) {
      return null;
    }
    const match = this.brandList.find((item) => this.normalizeImportLookup(item?.name) === target);
    return match?.id != null ? Number(match.id) : null;
  }

  private resolveImportFormulationId(name: string): number | null {
    const target = this.normalizeImportLookup(name);
    if (!target) {
      return null;
    }
    const match = this.formulationList.find((item) => this.normalizeImportLookup(item?.name) === target);
    return match?.id != null ? Number(match.id) : null;
  }

  private resolveImportLowestPackageId(name: string): number | null {
    const target = this.normalizeImportLookup(name);
    if (!target) {
      return null;
    }
    const match = this.lowestPackageList.find((item) => {
      const title = this.normalizeImportLookup(item?.title || item?.name);
      return title === target;
    });
    return match?.id != null ? Number(match.id) : null;
  }

  private resolveImportRouteOfAdminId(name: string): number | null {
    const target = this.normalizeImportLookup(name);
    if (!target) {
      return null;
    }
    const match = this.routeOfAdminList.find((item) => {
      const title = this.normalizeImportLookup(item?.title || item?.name);
      return title === target;
    });
    return match?.id != null ? Number(match.id) : null;
  }

  private resolveImportCategoryId(name: string): number | null {
    const target = this.normalizeImportLookup(name);
    if (!target) {
      return null;
    }
    const exact = this.categoryList.find((item) => this.normalizeImportLookup(item?.name) === target);
    if (exact?.id != null) {
      return Number(exact.id);
    }
    const breadcrumbMatch = this.categoryList.find((item) => {
      const breadcrumb = this.normalizeImportLookup(item?.breadcrumb || item?.name);
      return breadcrumb === target || breadcrumb.endsWith(`> ${target}`) || breadcrumb.endsWith(target);
    });
    return breadcrumbMatch?.id != null ? Number(breadcrumbMatch.id) : null;
  }

  private resolveImportStrengthUnitId(name: string): number | null {
    const target = this.normalizeImportLookup(name);
    if (!target) {
      return null;
    }
    const match = this.strengthUnitList.find((item) => {
      const title = this.normalizeImportLookup(item?.title || item?.name);
      const abbreviation = this.normalizeImportLookup(item?.standardAbbreviation);
      return title === target || abbreviation === target;
    });
    return match?.id != null ? Number(match.id) : null;
  }

  private resolveImportActiveIngredientId(name: string): number | null {
    const target = this.normalizeImportLookup(name);
    if (!target) {
      return null;
    }
    const match = this.itemList.find((item) => {
      const genericName = this.normalizeImportLookup(item?.genericName || item?.name || item?.title);
      return genericName === target;
    });
    return match?.id != null ? Number(match.id) : null;
  }

  // UI toggle methods
  hideShowPassword() {
    this.isText = !this.isText;
    this.isText ? this.eyeIcon = "bi bi-funnel" : this.eyeIcon = "bi bi-x-square";
    this.isText ? this.eyeIconDrop = "bi bi-chevron-down" : this.eyeIconDrop = "bi bi-chevron-up";
  }

  buttonClickIconChange() {
    this.isText = !this.isText;
    this.isText ? this.iconChange = "bi bi-chevron-down" : this.iconChange = "bi bi-chevron-up";
  }

  toggleCollapse() {
    this.isCollapsed = true;
    setTimeout(() => {
      this.isCollapsed = false;
    }, 0.0);
  }

  // Stock Item modal methods
  openStockItemModal() {
    this.clearFormNewStockItem();
    this.isCollapsedNewStockItem = false;
    document.body.style.overflow = 'hidden';
    this.loadBrands();
    this.loadFormulations();
    this.loadLowestPackages();
    this.loadCategories();
    this.loadRoutesOfAdmin();
    this.loadStrengthUnits();
    this.loadItems();
    this.loadIngredientUnits();
    // Initialize with one empty ingredient row
    if (this.ingredients.length === 0) {
      this.addIngredient();
    }
  }

  loadBrands(): Promise<void> {
    return new Promise((resolve) => {
      this.api.getAllBrandsBusinessItem().subscribe({
        next: (res) => {
          this.brandList = res || [];
          this.filteredBrandList = this.brandList;
          console.log("Brands loaded: ", this.brandList);
          if (!this.brandSearchQuery.trim()) {
            this.filteredBrandList = this.brandList;
          } else {
            this.filterBrands();
          }
          resolve();
        },
        error: (err) => {
          console.error("Error loading brands: ", err);
          this.brandList = [];
          this.filteredBrandList = [];
          resolve();
        }
      });
    });
  }

  // Load brand by ID and set it as selected (like loadClientGroupByGroupName)
  loadBrandById(id: any) {
    if (!id) {
      this.clearBrandSelection();
      return;
    }
    
    // First ensure brands are loaded
    if (this.brandList.length === 0) {
      this.api.getAllBrandsBusinessItem().subscribe({
        next: (res) => {
          this.brandList = res || [];
          this.filteredBrandList = this.brandList;
          // Now find and select the brand
          const brand = this.brandList.find(b => Number(b.id) === Number(id) || b.id === id);
          if (brand) {
            this.changeCurrentBrand(brand);
            console.log('Brand loaded by ID:', this.currentBrandName);
          } else {
            console.warn('Brand not found with ID:', id);
            this.clearBrandSelection();
          }
        },
        error: (err) => {
          console.error("Error loading brands: ", err);
          this.clearBrandSelection();
        }
      });
    } else {
      // Brands already loaded, just find and select
      const brand = this.brandList.find(b => Number(b.id) === Number(id) || b.id === id);
      if (brand) {
        this.changeCurrentBrand(brand);
        console.log('Brand loaded by ID:', this.currentBrandName);
      } else {
        console.warn('Brand not found with ID:', id);
        this.clearBrandSelection();
      }
    }
  }

  // Close all dropdowns in the add/edit consumable item modal so only one stays open at a time
  private closeAllStockItemModalDropdowns(): void {
    this.isBrandDropdownOpen = false;
    this.isFormulationDropdownOpen = false;
    this.isLowestPackageDropdownOpen = false;
    this.isSellMeasureLowestPackageDropdownOpen = false;
    this.isCategoryDropdownOpen = false;
    this.isRouteOfAdminDropdownOpen = false;
    this.isStrengthUnitDropdownOpen = false;
    this.isSellMeasureStrengthUnitDropdownOpen = false;
    this.isPrescribingStrengthUnitDropdownOpen = false;
    this.isReconstitutionUnitDropdownOpen = false;
    this.ingredients.forEach(ing => {
      ing.isItemDropdownOpen = false;
      ing.isUnitDropdownOpen = false;
    });
  }

  // Brand dropdown methods
  toggleBrandDropdown() {
    const wasOpen = this.isBrandDropdownOpen;
    this.closeAllStockItemModalDropdowns();
    this.isBrandDropdownOpen = !wasOpen;
    // Brands will be loaded on click via HTML (click)="toggleBrandDropdown(); loadBrands()"
    // This matches the client component pattern where loadClientGroups() is called on click
    if (this.isBrandDropdownOpen) {
      this.brandSearchQuery = '';
      this.filterBrands();
    }
  }

  closeBrandDropdown() {
    setTimeout(() => {
      this.isBrandDropdownOpen = false;
    }, 200);
  }

  // Filter brands list (like filteredClientGroupList)
  filteredBrandListMethod() {
    let filteredList = this.brandList ?? [];
    
    // Filter based on search text
    if (this.brandSearchQuery) {
      const query = this.brandSearchQuery.toLowerCase().trim();
      filteredList = filteredList.filter((brand: any) => {
        const name = (brand.name || '').toLowerCase();
        const manufacturer = (brand.manufacturer || '').toLowerCase();
        return name.includes(query) || manufacturer.includes(query);
      });
    }
    
    return filteredList;
  }

  filterBrands() {
    // This method is kept for compatibility but filteredBrandListMethod() is used in template
    if (!this.brandSearchQuery.trim()) {
      this.filteredBrandList = this.brandList;
      return;
    }
    const query = this.brandSearchQuery.toLowerCase().trim();
    this.filteredBrandList = this.brandList.filter((brand: any) => {
      const name = (brand.name || '').toLowerCase();
      const manufacturer = (brand.manufacturer || '').toLowerCase();
      return name.includes(query) || manufacturer.includes(query);
    });
  }

  // Change current brand (like changeCurrentGroup)
  changeCurrentBrand(brand: any) {
    if (brand) {
      this.currentBrandName = brand.name || 'Unknown Brand';
      this.currentBrandId = brand.id || null;
      this.selectedBrand = brand;
      this.selectedBrandName = brand.name;
      this.currentStockItem.brandId = brand.id;
      this.isBrandDropdownOpen = false; // Close dropdown after selection
      this.brandSearchQuery = ''; // Clear search
      console.log('Selected brand name:', this.currentBrandName);
      console.log('Selected brand ID:', this.currentBrandId);
    } else {
      console.warn('No brand selected');
      this.currentBrandName = 'Select brand';
      this.currentBrandId = null;
    }
  }

  selectBrand(brand: any) {
    this.changeCurrentBrand(brand);
  }

  clearBrandSelection() {
    this.selectedBrand = null;
    this.selectedBrandName = '';
    this.currentBrandName = 'Select brand';
    this.currentBrandId = null;
    this.currentStockItem.brandId = null;
  }

  // Manufacturer methods
  loadManufacturers(): Promise<void> {
    return new Promise((resolve) => {
      this.api.getAllManufacturersBusinessItem().subscribe({
        next: (res) => {
          this.manufacturerList = res || [];
          this.filteredManufacturerList = this.manufacturerList;
          console.log("Manufacturers loaded: ", this.manufacturerList);
          if (!this.manufacturerSearchQuery.trim()) {
            this.filteredManufacturerList = this.manufacturerList;
          } else {
            this.filterManufacturers();
          }
          resolve();
        },
        error: (err) => {
          console.error("Error loading manufacturers: ", err);
          this.manufacturerList = [];
          this.filteredManufacturerList = [];
          resolve();
        }
      });
    });
  }

  loadManufacturerById(id: any) {
    if (!id) {
      this.clearManufacturerSelection();
      return;
    }
    
    if (this.manufacturerList.length === 0) {
      this.api.getAllManufacturersBusinessItem().subscribe({
        next: (res) => {
          this.manufacturerList = res || [];
          this.filteredManufacturerList = this.manufacturerList;
          const manufacturer = this.manufacturerList.find(m => Number(m.id) === Number(id) || m.id === id);
          if (manufacturer) {
            this.changeCurrentManufacturer(manufacturer);
            console.log('Manufacturer loaded by ID:', this.currentManufacturerName);
          } else {
            console.warn('Manufacturer not found with ID:', id);
            this.clearManufacturerSelection();
          }
        },
        error: (err) => {
          console.error("Error loading manufacturers: ", err);
          this.clearManufacturerSelection();
        }
      });
    } else {
      const manufacturer = this.manufacturerList.find(m => Number(m.id) === Number(id) || m.id === id);
      if (manufacturer) {
        this.changeCurrentManufacturer(manufacturer);
        console.log('Manufacturer loaded by ID:', this.currentManufacturerName);
      } else {
        console.warn('Manufacturer not found with ID:', id);
        this.clearManufacturerSelection();
      }
    }
  }

  toggleManufacturerDropdown() {
    this.isManufacturerDropdownOpen = !this.isManufacturerDropdownOpen;
    if (this.isManufacturerDropdownOpen) {
      this.manufacturerSearchQuery = '';
      this.filterManufacturers();
    }
  }

  closeManufacturerDropdown() {
    setTimeout(() => {
      this.isManufacturerDropdownOpen = false;
    }, 200);
  }

  filteredManufacturerListMethod() {
    let filteredList = this.manufacturerList ?? [];
    
    if (this.manufacturerSearchQuery) {
      const query = this.manufacturerSearchQuery.toLowerCase().trim();
      filteredList = filteredList.filter((manufacturer: any) => {
        const name = (manufacturer.name || '').toLowerCase();
        return name.includes(query);
      });
    }
    
    return filteredList;
  }

  filterManufacturers() {
    if (!this.manufacturerSearchQuery.trim()) {
      this.filteredManufacturerList = this.manufacturerList;
      return;
    }
    const query = this.manufacturerSearchQuery.toLowerCase().trim();
    this.filteredManufacturerList = this.manufacturerList.filter((manufacturer: any) => {
      const name = (manufacturer.name || '').toLowerCase();
      return name.includes(query);
    });
  }

  changeCurrentManufacturer(manufacturer: any) {
    if (manufacturer) {
      this.currentManufacturerName = manufacturer.name || 'Unknown Manufacturer';
      this.currentManufacturerId = manufacturer.id || null;
      this.selectedManufacturer = manufacturer;
      this.selectedManufacturerName = manufacturer.name;
      this.currentStockItem.manufacturerId = manufacturer.id;
      this.isManufacturerDropdownOpen = false;
      this.manufacturerSearchQuery = '';
      console.log('Selected manufacturer name:', this.currentManufacturerName);
      console.log('Selected manufacturer ID:', this.currentManufacturerId);
    } else {
      console.warn('No manufacturer selected');
      this.currentManufacturerName = 'Select manufacturer';
      this.currentManufacturerId = null;
    }
  }

  selectManufacturer(manufacturer: any) {
    this.changeCurrentManufacturer(manufacturer);
  }

  clearManufacturerSelection() {
    this.currentManufacturerName = 'Select manufacturer';
    this.selectedManufacturer = null;
    this.selectedManufacturerName = '';
    this.currentManufacturerId = null;
    this.currentStockItem.manufacturerId = null;
  }

  // Brand Manufacturer dropdown methods
  toggleBrandManufacturerDropdown() {
    this.isBrandManufacturerDropdownOpen = !this.isBrandManufacturerDropdownOpen;
    if (this.isBrandManufacturerDropdownOpen) {
      this.brandManufacturerSearchQuery = '';
      this.filterBrandManufacturers();
    }
  }

  filterBrandManufacturers() {
    if (!this.brandManufacturerSearchQuery.trim()) {
      return;
    }
    const query = this.brandManufacturerSearchQuery.toLowerCase().trim();
    // Filtering is handled in filteredBrandManufacturerListMethod()
  }

  filteredBrandManufacturerListMethod() {
    let filteredList = this.manufacturerList ?? [];
    
    if (this.brandManufacturerSearchQuery) {
      const query = this.brandManufacturerSearchQuery.toLowerCase().trim();
      filteredList = filteredList.filter((manufacturer: any) => {
        const name = (manufacturer.name || manufacturer.manufacturerName || '').toLowerCase();
        return name.includes(query);
      });
    }
    
    return filteredList;
  }

  changeBrandManufacturer(manufacturer: any) {
    if (manufacturer) {
      this.currentBrandManufacturerName = manufacturer.name || manufacturer.manufacturerName || 'Unknown Manufacturer';
      this.currentBrandManufacturerId = manufacturer.id || manufacturer.manufacturerId || null;
      this.currentBrand.manufacturerId = this.currentBrandManufacturerId;
      this.isBrandManufacturerDropdownOpen = false;
      this.brandManufacturerSearchQuery = '';
      console.log('Selected brand manufacturer name:', this.currentBrandManufacturerName);
      console.log('Selected brand manufacturer ID:', this.currentBrandManufacturerId);
    } else {
      console.warn('No manufacturer selected');
      this.currentBrandManufacturerName = 'Select manufacturer';
      this.currentBrandManufacturerId = null;
      this.currentBrand.manufacturerId = null;
    }
  }

  loadBrandManufacturerById(id: any) {
    if (!id) {
      this.currentBrandManufacturerName = 'Select manufacturer';
      this.currentBrandManufacturerId = null;
      return;
    }
    
    if (this.manufacturerList.length === 0) {
      this.api.getAllManufacturersBusinessItem().subscribe({
        next: (res) => {
          this.manufacturerList = res || [];
          const manufacturer = this.manufacturerList.find(m => 
            Number(m.id) === Number(id) || 
            Number(m.manufacturerId) === Number(id) || 
            m.id === id || 
            m.manufacturerId === id
          );
          if (manufacturer) {
            this.changeBrandManufacturer(manufacturer);
            console.log('Brand manufacturer loaded by ID:', this.currentBrandManufacturerName);
          } else {
            console.warn('Brand manufacturer not found with ID:', id);
            this.currentBrandManufacturerName = 'Select manufacturer';
            this.currentBrandManufacturerId = null;
          }
        },
        error: (err) => {
          console.error("Error loading manufacturers:", err);
          this.currentBrandManufacturerName = 'Select manufacturer';
          this.currentBrandManufacturerId = null;
        }
      });
    } else {
      const manufacturer = this.manufacturerList.find(m => 
        Number(m.id) === Number(id) || 
        Number(m.manufacturerId) === Number(id) || 
        m.id === id || 
        m.manufacturerId === id
      );
      if (manufacturer) {
        this.changeBrandManufacturer(manufacturer);
        console.log('Brand manufacturer loaded by ID:', this.currentBrandManufacturerName);
      } else {
        console.warn('Brand manufacturer not found with ID:', id);
        this.currentBrandManufacturerName = 'Select manufacturer';
        this.currentBrandManufacturerId = null;
      }
    }
  }

  // Add Brand modal methods
  private async reloadAndSelectAfterCreate(
    reload: () => Promise<void>,
    list: () => any[],
    response: any,
    select: (item: any) => void,
    options?: { editingId?: number | string | null; requestedName?: string }
  ): Promise<void> {
    await reload();
    const item = findCreatedInList(list(), {
      response,
      editingId: options?.editingId,
      requestedName: options?.requestedName,
    });
    if (item) {
      select(item);
    }
  }

  private applyNewCategorySelection(category: any): void {
    if (!category) {
      return;
    }
    if (this.categoryModalSource === 'item') {
      this.selectItemModalCategory(category);
    } else if (this.categoryModalSource === 'parent') {
      this.selectCategoryModalParent(category);
    } else {
      this.selectCategory(category);
    }
  }

  openBrandModal() {
    this.clearBrandForm();
    this.isCollapsedNewBrand = false;
    this.isBrandDropdownOpen = false;
    this.loadManufacturers(); // Load manufacturers when opening brand modal
  }

  clearBrandForm() {
    this.currentBrand = {
      name: '',
      manufacturerId: null,
      description: ''
    };
    this.currentBrandManufacturerName = 'Select manufacturer';
    this.currentBrandManufacturerId = null;
    this.brandManufacturerSearchQuery = '';
    this.isBrandManufacturerDropdownOpen = false;
    this.showDivAddToDataBaseNewBrand = false;
    this.showDivUpdatedLoaderNewBrand = false;
    this.isButtonDisabledBrand = false;
    this.isEditingBrand = false;
    this.editingBrandId = null;
  }

  closeBrandModal() {
    this.isCollapsedNewBrand = true;
    this.clearBrandForm();
  }

  saveBrand(data: any) {
    this.isButtonDisabledBrand = true;
    this.showDivUpdatedLoaderNewBrand = true;
    this.showDivAddToDataBaseNewBrand = false;

    const existingBrand =
      this.isEditingBrand && this.editingBrandId
        ? this.brandList.find((b: any) => b.id === this.editingBrandId)
        : null;

    const brandData: any = {
      name: data.name || '',
      manufacturerId: data.manufacturerId ? Number(data.manufacturerId) : null,
      description: data.description || ''
    };

    // Fields removed from UI; keep existing values on edit so they are not cleared server-side.
    if (existingBrand) {
      brandData.manufacturerAddress = existingBrand.manufacturerAddress || '';
      brandData.countryOfOrigin = existingBrand.countryOfOrigin || '';
    } else {
      brandData.manufacturerAddress = '';
      brandData.countryOfOrigin = '';
    }

    const apiCall = this.isEditingBrand && this.editingBrandId
      ? this.api.updateBrandBusinessItem(this.editingBrandId, brandData)
      : this.api.addBrandBusinessItem(brandData);

    const requestedBrandName = (brandData.name || '').toString().trim().toLowerCase();

    apiCall.subscribe({
      next: (res: any) => {
        this.showDivUpdatedLoaderNewBrand = false;
        this.isButtonDisabledBrand = false;

        if (res && res.message) {
          this.responseColor = res.message.includes('successfully') || res.message.includes('updated') || res.message.includes('saved') ? 'rgb(11, 155, 112)' : 'rgb(238, 16, 16)';
          this.responseMessage = res.message;
        } else {
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = this.isEditingBrand ? "Brand updated successfully!" : "Brand added successfully!";
        }

        this.showDivAddToDataBaseNewBrand = true;

        void this.reloadAndSelectAfterCreate(
          () => this.loadBrands(),
          () => this.brandList,
          res,
          (item) => this.selectBrand(item),
          {
            editingId: this.isEditingBrand ? this.editingBrandId : null,
            requestedName: requestedBrandName,
          }
        ).then(() => {
          this.closeBrandModal();
        });
      },
      error: (err) => {
        this.showDivUpdatedLoaderNewBrand = false;
        this.isButtonDisabledBrand = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err.error?.message || (this.isEditingBrand ? "Error updating brand. Please try again." : "Error saving brand. Please try again.");
        this.showDivAddToDataBaseNewBrand = true;
        console.error("Error saving brand: ", err);
      }
    });
  }

  // Add Manufacturer modal methods
  openManufacturerModal() {
    this.clearManufacturerForm();
    this.isCollapsedNewManufacturer = false;
    this.isManufacturerDropdownOpen = false;
    // Track if opened from brand form
    this.manufacturerModalOpenedFromBrand = !this.isCollapsedNewBrand;
    // Close brand manufacturer dropdown if open
    this.isBrandManufacturerDropdownOpen = false;
  }

  clearManufacturerForm() {
    this.currentManufacturer = {
      name: '',
      address: '',
      country: '',
      description: ''
    };
    this.showDivAddToDataBaseNewManufacturer = false;
    this.showDivUpdatedLoaderNewManufacturer = false;
    this.isButtonDisabledManufacturer = false;
    this.isEditingManufacturer = false;
    this.editingManufacturerId = null;
  }

  closeManufacturerModal() {
    this.isCollapsedNewManufacturer = true;
    this.clearManufacturerForm();
    this.manufacturerModalOpenedFromBrand = false;
  }

  saveManufacturer(data: any) {
    this.isButtonDisabledManufacturer = true;
    this.showDivUpdatedLoaderNewManufacturer = true;
    this.showDivAddToDataBaseNewManufacturer = false;

    const manufacturerData = {
      name: data.name || '',
      address: data.address || '',
      country: data.country || '',
      description: data.description || ''
    };
    const requestedManufacturerName = (manufacturerData.name || '').trim();
    const openedFromBrandForm = this.manufacturerModalOpenedFromBrand;

    const apiCall = this.isEditingManufacturer && this.editingManufacturerId
      ? this.api.updateManufacturerBusinessItem(this.editingManufacturerId, manufacturerData)
      : this.api.addManufacturerBusinessItem(manufacturerData);

    apiCall.subscribe({
      next: (res: any) => {
        this.showDivUpdatedLoaderNewManufacturer = false;
        this.isButtonDisabledManufacturer = false;

        if (res && res.message) {
          this.responseColor = res.message.includes('successfully') || res.message.includes('updated') || res.message.includes('saved') ? 'rgb(11, 155, 112)' : 'rgb(238, 16, 16)';
          this.responseMessage = res.message;
        } else {
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = this.isEditingManufacturer ? "Manufacturer updated successfully!" : "Manufacturer added successfully!";
        }

        this.showDivAddToDataBaseNewManufacturer = true;

        void this.reloadAndSelectAfterCreate(
          () => this.loadManufacturers(),
          () => this.manufacturerList,
          res,
          (item) => {
            if (openedFromBrandForm) {
              this.changeBrandManufacturer(item);
            } else {
              this.selectManufacturer(item);
            }
          },
          {
            editingId: this.isEditingManufacturer ? this.editingManufacturerId : null,
            requestedName: requestedManufacturerName,
          }
        ).then(() => {
          this.manufacturerModalOpenedFromBrand = false;
          this.closeManufacturerModal();
        });
      },
      error: (err) => {
        this.showDivUpdatedLoaderNewManufacturer = false;
        this.isButtonDisabledManufacturer = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err.error?.message || (this.isEditingManufacturer ? "Error updating manufacturer. Please try again." : "Error saving manufacturer. Please try again.");
        this.showDivAddToDataBaseNewManufacturer = true;
        console.error("Error saving manufacturer: ", err);
      }
    });
  }

  editManufacturer(manufacturer: any) {
    if (!manufacturer || !manufacturer.id) {
      console.error('Invalid manufacturer data for editing');
      return;
    }
    
    this.isEditingManufacturer = true;
    this.editingManufacturerId = manufacturer.id;
    this.currentManufacturer = {
      name: manufacturer.name || '',
      address: manufacturer.address || '',
      country: manufacturer.country || '',
      description: manufacturer.description || ''
    };
    this.openManufacturerModal();
  }

  deleteManufacturer(manufacturer: any) {
    if (!manufacturer || !manufacturer.id) {
      console.error('Invalid manufacturer data for deletion');
      return;
    }

    if (confirm(`Are you sure you want to delete "${manufacturer.name}"?`)) {
      this.showDivUpdatedLoaderNewManufacturer = true;
      this.isButtonDisabledManufacturer = true;

      this.api.deleteManufacturerBusinessItem(manufacturer.id).subscribe({
        next: (res: any) => {
          this.showDivUpdatedLoaderNewManufacturer = false;
          this.isButtonDisabledManufacturer = false;
          
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = res?.message || "Manufacturer deleted successfully!";
          this.showDivAddToDataBaseNewManufacturer = true;

          setTimeout(() => {
            this.loadManufacturers();
            this.showDivAddToDataBaseNewManufacturer = false;
          }, 2000);
        },
        error: (err) => {
          this.showDivUpdatedLoaderNewManufacturer = false;
          this.isButtonDisabledManufacturer = false;
          this.responseColor = 'rgb(238, 16, 16)';
          this.responseMessage = err.error?.message || "Error deleting manufacturer. Please try again.";
          this.showDivAddToDataBaseNewManufacturer = true;
          console.error("Error deleting manufacturer: ", err);
          
          setTimeout(() => {
            this.showDivAddToDataBaseNewManufacturer = false;
          }, 4000);
        }
      });
    }
  }

  clearFormNewStockItem() {
    this.resetPrescribingProfileFields();
    this.currentStockItem = {
      stockItemName: '',
      barcode: '',
      sku: '',
      shelfNumber: '',
      businessCategory: null,
      saleCategory: null,
      unit: '',
      unitShort: '',
      costPrice: null,
      sellingPrice: null,
      unitSellingModelId: null,
      useUnitSellingModel: true,
      stockQty: null,
      reorderLevel: null,
      restockTo: null,
      image: null,
      image2: null,
      image3: null,
      imageUrl: null,
      itemCategoryId: null,
      brandId: null,
      formulationId: null,
      lowestPackageId: null,
      routeOfAdminId: null,
    };
    this.clearBrandSelection();
    this.clearFormulationSelection();
    this.clearLowestPackageSelection();
    this.clearSellMeasureLowestPackageSelection();
    this.clearCategorySelection();
    this.clearRouteOfAdminSelection();
    this.clearStrengthUnitSelection();
    this.clearSellMeasureStrengthUnitSelection();
    this.clearPrescribingStrengthUnitSelection();
    this.clearReconstitutionUnitSelection();
    this.isBrandDropdownOpen = false;
    this.isManufacturerDropdownOpen = false;
    this.isFormulationDropdownOpen = false;
    this.isLowestPackageDropdownOpen = false;
    this.isSellMeasureLowestPackageDropdownOpen = false;
    this.isCategoryDropdownOpen = false;
    this.isRouteOfAdminDropdownOpen = false;
    this.isStrengthUnitDropdownOpen = false;
    this.isReconstitutionUnitDropdownOpen = false;
    this.showReconstitutionFields = false;
    this.saveButtonStatus = "Add New Consumable Item";
    this.showDivAddToDataBaseNewStockItem = false;
    this.showDivUpdatedLoaderNewStockItem = false;
    this.isButtonDisabled = false;
    // Clear ingredients
    this.ingredientRowSeq = 1;
    this.ingredients = [];
    this.indicationRowSeq = 1;
    this.indicationRows = [];
    // Reset editing state
    this.isEditingStockItem = false;
    this.editingStockItemId = null;
  }

  closeStockItemModal() {
    this.isCollapsedNewStockItem = true;
    document.body.style.overflow = '';
    this.clearFormNewStockItem();
  }

  viewStockItemDetails(stockItem: any) {
    if (!stockItem || !stockItem.id) {
      console.error('Invalid stock item data for viewing details');
      return;
    }

    // Load full details from API
    this.api.getStockItemById(stockItem.id).subscribe({
      next: (itemData: any) => {
        const data = itemData?.data || itemData;
        this.selectedStockItemDetails = data;
        
        // Load all dropdown lists to get display names
        if (this.brandList.length === 0) this.loadBrands();
        if (this.formulationList.length === 0) this.loadFormulations();
        if (this.lowestPackageList.length === 0) this.loadLowestPackages();
        if (this.categoryList.length === 0) this.loadCategories();
        if (this.routeOfAdminList.length === 0) this.loadRoutesOfAdmin();
        if (this.strengthUnitList.length === 0) this.loadStrengthUnits();
        
        this.showDetailsModal = true;
        document.body.style.overflow = 'hidden';
      },
      error: (err) => {
        console.error("Error loading stock item details:", err);
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = "Error loading stock item details. Please try again.";
        this.showDivUpdatedOut = true;
        setTimeout(() => {
          this.showDivUpdatedOut = false;
        }, 4000);
      }
    });
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedStockItemDetails = null;
    document.body.style.overflow = '';
  }

  editStockItem(stockItem: any) {


    //this.changeCurrentBrand(stockItem.brandId)
    this.currentBrandId = stockItem.brandId;
    this.currentBrandName = stockItem.brandName;
    this.editingStockItemId = stockItem.id;


    console.log("=== EDIT BUTTON CLICKED ===");
    console.log("StockItem object received:", stockItem);
    
    if (!stockItem || !stockItem.id) {
      console.error('Invalid stock item data for editing');
      return;
    }

    // Set editing state and button status (like client component)
    this.isEditingStockItem = true;
    this.editingStockItemId = stockItem.id;
    this.saveButtonStatus = "Update Consumable Item";
    
    // Open the modal first (like client component)
    this.isCollapsedNewStockItem = false;
    document.body.style.overflow = 'hidden';

    // Fetch the stock item details
    this.api.getStockItemById(stockItem.id).subscribe({
      next: (itemData: any) => {
        console.log("=== STOCK ITEM API RESPONSE ===");
        console.log("Raw response:", itemData);
        
        // Handle response structure - check if data is nested
        const data = itemData?.data || itemData;
        console.log("Processed data:", data);
        
        const immediateCategoryId = this.extractImmediateCategoryId(data);
        // Populate form fields with Flutter-aligned product fields
        this.currentStockItem = {
          id: data?.id != null ? Number(data.id) : stockItem.id,
          stockItemName: data?.stockItemName || '',
          barcode: data?.barcode || '',
          sku: data?.sku || '',
          shelfNumber: data?.shelfNumber || '',
          businessCategory: data?.businessCategory || null,
          saleCategory: data?.saleCategory || null,
          unit: data?.unit || '',
          unitShort: data?.unitShort || '',
          costPrice: data?.costPrice != null ? Number(data.costPrice) : null,
          sellingPrice: data?.sellingPrice != null ? Number(data.sellingPrice) : null,
          unitSellingModelId:
            data?.unitSellingModelId != null && Number(data.unitSellingModelId) > 0
              ? Number(data.unitSellingModelId)
              : null,
          useUnitSellingModel: data?.useUnitSellingModel !== false,
          stockQty: data?.stockQty != null ? Number(data.stockQty) : null,
          reorderLevel: data?.reorderLevel != null ? Number(data.reorderLevel) : null,
          restockTo: data?.restockTo != null ? Number(data.restockTo) : null,
          imageUrl: data?.imageUrl || data?.image || null,
          image: data?.image || data?.imageUrl || null,
          image2: data?.image2 || null,
          image3: data?.image3 || null,
          itemCategoryId: immediateCategoryId,
          brandId: data?.brandId != null ? Number(data.brandId) : null,
        };

        this.ensureCategoryOption(this.businessCategoryOptions, this.currentStockItem.businessCategory);
        this.ensureCategoryOption(this.saleCategoryOptions, this.currentStockItem.saleCategory);
        
        console.log("=== FORM FIELDS POPULATED ===");
        console.log("currentStockItem:", this.currentStockItem);

        // Load categories for any remaining reference (non-blocking)
        this.loadCategories().then(() => {
          this.applyEditCategorySelection(data, immediateCategoryId);
        });
        this.loadBrands();

      },
      error: (err) => {
        console.error("Error loading stock item:", err);
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = "Error loading stock item data. Please try again.";
        this.showDivAddToDataBaseNewStockItem = true;
        setTimeout(() => {
          this.showDivAddToDataBaseNewStockItem = false;
        }, 4000);
      }
    });
  }

  // Helper method to load compositions/ingredients
  loadCompositions(stockItemId: number) {
    this.api.getCompositionsByStockItemIdBusinessItem(stockItemId).subscribe({
      next: (compositions: any[]) => {
        console.log("Compositions loaded:", compositions);
        
        // Wait for items and units to load before processing compositions
        const loadIngredients = () => {
          if (this.itemList.length === 0 || this.ingredientUnitList.length === 0) {
            setTimeout(loadIngredients, 200);
            return;
          }

          // Fetch strength details for each composition
          if (compositions && compositions.length > 0) {
            this.api.getAllStrengthsBusinessItem().subscribe({
              next: (strengths: any[]) => {
                this.ingredients = [];
                const seenIngredientRows = new Set<string>();
                
                compositions.forEach(comp => {
                  const strength = strengths.find(s => s.id === comp.strengthId);
                  if (strength) {
                    const ingredientIdRaw = strength.activeIngredientId != null ? strength.activeIngredientId : strength.itemId;
                    const ingredientId = ingredientIdRaw != null ? Number(ingredientIdRaw) : null;
                    const strengthValue = strength.strengthValue != null ? Number(strength.strengthValue) : null;
                    const unitId = strength.strengthUnitId != null ? Number(strength.strengthUnitId) : null;
                    const dedupeKey = `${ingredientId ?? 'x'}::${strengthValue ?? 'x'}::${unitId ?? 'x'}`;
                    if (seenIngredientRows.has(dedupeKey)) {
                      return;
                    }
                    seenIngredientRows.add(dedupeKey);

                    const item = this.itemList.find(i => Number(i.id) === ingredientId);
                    const unit = this.ingredientUnitList.find(u => Number(u.id) === unitId);
                    
                    this.ingredients.push(this.createIngredientRow({
                      itemId: ingredientId,
                      itemName: item ? (item.genericName || item.title || item.name) : '',
                      strength: strengthValue,
                      unitId: unitId,
                      unitName: unit ? unit.title : '',
                    }));
                  }
                });
                
                // If no ingredients, add one empty row
                if (this.ingredients.length === 0) {
                  this.addIngredient();
                }
              },
              error: (err) => {
                console.error("Error loading strengths:", err);
                this.addIngredient(); // Add empty row if error
              }
            });
          } else {
            // No compositions, add one empty ingredient row
            this.addIngredient();
          }
        };

        setTimeout(loadIngredients, 500);
      },
      error: (err) => {
        console.error("Error loading compositions:", err);
        this.addIngredient(); // Add empty row if error
      }
    });
  }

  deleteStockItem(stockItem: any) {
    if (!stockItem || !stockItem.id) {
      console.error('Invalid stock item data for deletion');
      return;
    }

    this.stockItemToDelete = stockItem;
    this.showDeleteConfirmModal = true;
    document.body.style.overflow = 'hidden';
  }

  confirmDeleteStockItem() {
    if (!this.stockItemToDelete || !this.stockItemToDelete.id) {
      this.closeDeleteConfirmModal();
      return;
    }

    this.isButtonDisabled = true;
    this.showDivUpdatedLoaderNewStockItem = true;
    this.showDivAddToDataBaseNewStockItem = false;
    this.showDeleteConfirmModal = false;

    this.api.deleteStockItem(this.stockItemToDelete.id).subscribe({
      next: (res: any) => {
        this.showDivUpdatedLoaderNewStockItem = false;
        this.isButtonDisabled = false;
        this.responseColor = 'rgb(11, 155, 112)';
        this.responseMessage = res?.message || "Consumable item deleted successfully!";
        this.showDivAddToDataBaseNewStockItem = true;

        setTimeout(() => {
          this.initializeTableData();
          this.showDivAddToDataBaseNewStockItem = false;
          this.closeDeleteConfirmModal();
        }, 1000);
      },
      error: (err) => {
        this.showDivUpdatedLoaderNewStockItem = false;
        this.isButtonDisabled = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err.error?.message || "Error deleting consumable item. Please try again.";
        this.showDivAddToDataBaseNewStockItem = true;
        console.error("Error deleting stock item: ", err);
        
        setTimeout(() => {
          this.showDivAddToDataBaseNewStockItem = false;
        }, 4000);
        this.closeDeleteConfirmModal();
      }
    });
  }

  closeDeleteConfirmModal() {
    this.showDeleteConfirmModal = false;
    this.stockItemToDelete = null;
    this.isButtonDisabled = false;
    document.body.style.overflow = '';
  }

  saveStockItem(data: any) {
    this.isButtonDisabled = true;
    this.showDivUpdatedLoaderNewStockItem = true;
    this.showDivAddToDataBaseNewStockItem = false;

    const name = (this.currentStockItem?.stockItemName || data?.stockItemName || '').trim();
    if (!name) {
      this.isButtonDisabled = false;
      this.showDivUpdatedLoaderNewStockItem = false;
      this.responseColor = 'rgb(238, 16, 16)';
      this.responseMessage = 'Name is required.';
      this.showDivAddToDataBaseNewStockItem = true;
      return;
    }

    const isService = this.isServiceSaleCategory;
    const stockItemData: any = {
      stockItemName: name,
      barcode: this.currentStockItem?.barcode || null,
      sku: this.currentStockItem?.sku || null,
      shelfNumber: this.currentStockItem?.shelfNumber || null,
      businessCategory: this.currentStockItem?.businessCategory || null,
      saleCategory: this.currentStockItem?.saleCategory || null,
      unit: this.currentStockItem?.unit || null,
      unitShort: this.currentStockItem?.unitShort || null,
      costPrice: this.toNumberOrZero(this.currentStockItem?.costPrice),
      sellingPrice: this.toNumberOrZero(this.currentStockItem?.sellingPrice),
      useUnitSellingModel: this.currentStockItem?.useUnitSellingModel !== false,
      stockQty: isService
        ? (this.isEditingStockItem ? this.toNumberOrZero(this.currentStockItem?.stockQty) : 1)
        : this.toNumberOrZero(this.currentStockItem?.stockQty),
      reorderLevel: isService ? 0 : this.toNumberOrZero(this.currentStockItem?.reorderLevel),
      restockTo: isService ? 0 : this.toNumberOrZero(this.currentStockItem?.restockTo),
      image: this.currentStockItem?.image || this.currentStockItem?.imageUrl || null,
      image2: this.currentStockItem?.image2 || null,
      image3: this.currentStockItem?.image3 || null,
      ingredients: [],
    };

    // Use update endpoint if editing, otherwise use create-or-update
    const apiCall = this.isEditingStockItem && this.editingStockItemId
      ? this.api.updateStockItem(this.editingStockItemId, stockItemData)
      : this.api.createOrUpdateStockItem(stockItemData);

    apiCall.subscribe({
      next: async (res: any) => {
        this.showDivUpdatedLoaderNewStockItem = false;
        this.isButtonDisabled = false;

        if (res && res.message) {
          this.responseColor = res.message.includes('successfully') ? 'rgb(11, 155, 112)' : 'rgb(238, 16, 16)';
          this.responseMessage = res.message;
        } else {
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = this.isEditingStockItem ? "Consumable item updated successfully!" : "Consumable item saved successfully!";
        }

        this.showDivAddToDataBaseNewStockItem = true;

        // Reload the table data after a short delay
        setTimeout(() => {
          this.initializeTableData();
          setTimeout(() => {
            this.closeStockItemModal();
          }, 1500);
        }, 1000);
      },
      error: (err) => {
        this.showDivUpdatedLoaderNewStockItem = false;
        this.isButtonDisabled = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err.error?.message || "Error saving consumable item. Please try again.";
        this.showDivAddToDataBaseNewStockItem = true;
        console.error("Error saving stock item: ", err);
      }
    });
  }

  get isServiceSaleCategory(): boolean {
    return String(this.currentStockItem?.saleCategory || '').trim().toLowerCase() === 'service';
  }

  onSaleCategoryChange(_value: string | null): void {
    if (this.isServiceSaleCategory && !this.isEditingStockItem) {
      this.currentStockItem.stockQty = 1;
      this.currentStockItem.reorderLevel = 0;
      this.currentStockItem.restockTo = 0;
    }
  }

  private ensureCategoryOption(list: string[], value: string | null | undefined): void {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return;
    }
    if (!list.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      list.push(trimmed);
    }
  }

  private toNumberOrZero(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  // Formulation methods
  loadFormulations(): Promise<void> {
    return new Promise((resolve) => {
      this.api.getAllFormulationsBusinessItem().subscribe({
        next: (res) => {
          this.formulationList = res || [];
          this.filteredFormulationList = this.formulationList;
          console.log("Formulations loaded: ", this.formulationList);
          if (!this.formulationSearchQuery.trim()) {
            this.filteredFormulationList = this.formulationList;
          } else {
            this.filterFormulations();
          }
          resolve();
        },
        error: (err) => {
          console.error("Error loading formulations: ", err);
          this.formulationList = [];
          this.filteredFormulationList = [];
          resolve();
        }
      });
    });
  }

  toggleFormulationDropdown() {
    const wasOpen = this.isFormulationDropdownOpen;
    this.closeAllStockItemModalDropdowns();
    this.isFormulationDropdownOpen = !wasOpen;
    if (this.isFormulationDropdownOpen) {
      // Always reload to ensure we have the latest data
      if (this.formulationList.length === 0) {
        this.loadFormulations();
      } else {
        // Refresh filtered list even if already loaded
        this.filteredFormulationList = this.formulationList;
        if (this.formulationSearchQuery.trim()) {
          this.filterFormulations();
        }
      }
    }
  }

  filterFormulations() {
    if (!this.formulationSearchQuery.trim()) {
      this.filteredFormulationList = this.formulationList;
      return;
    }
    const query = this.formulationSearchQuery.toLowerCase().trim();
    this.filteredFormulationList = this.formulationList.filter((formulation: any) => {
      const name = (formulation.name || '').toLowerCase();
      return name.includes(query);
    });
  }

  selectFormulation(formulation: any) {
    this.selectedFormulation = formulation;
    this.selectedFormulationName = formulation.name;
    this.currentStockItem.formulationId = formulation.id;
    this.isFormulationDropdownOpen = false;
    this.formulationSearchQuery = '';
    this.filteredFormulationList = this.formulationList;
  }

  clearFormulationSelection() {
    this.selectedFormulation = null;
    this.selectedFormulationName = '';
    this.currentStockItem.formulationId = null;
  }

  openFormulationModal() {
    this.clearFormulationForm();
    this.isCollapsedNewFormulation = false;
    this.isFormulationDropdownOpen = false;
  }

  clearFormulationForm() {
    this.currentFormulation = { name: '', description: '' };
    this.showDivAddToDataBaseNewFormulation = false;
    this.showDivUpdatedLoaderNewFormulation = false;
    this.isButtonDisabledFormulation = false;
    this.isEditingFormulation = false;
    this.editingFormulationId = null;
  }

  closeFormulationModal() {
    this.isCollapsedNewFormulation = true;
    this.clearFormulationForm();
  }

  saveFormulation(data: any) {
    this.isButtonDisabledFormulation = true;
    this.showDivUpdatedLoaderNewFormulation = true;
    this.showDivAddToDataBaseNewFormulation = false;

    const formulationData = { name: data.name || '', description: data.description || '' };
    const requestedFormulationName = (formulationData.name || '').trim();

    const apiCall = this.isEditingFormulation && this.editingFormulationId
      ? this.api.updateFormulationBusinessItem(this.editingFormulationId, formulationData)
      : this.api.addFormulationBusinessItem(formulationData);

    apiCall.subscribe({
      next: (res: any) => {
        this.showDivUpdatedLoaderNewFormulation = false;
        this.isButtonDisabledFormulation = false;

        if (res && res.message) {
          this.responseColor = res.message.includes('successfully') || res.message.includes('updated') || res.message.includes('saved') ? 'rgb(11, 155, 112)' : 'rgb(238, 16, 16)';
          this.responseMessage = res.message;
        } else {
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = this.isEditingFormulation ? "Formulation updated successfully!" : "Formulation added successfully!";
        }

        this.showDivAddToDataBaseNewFormulation = true;

        void this.reloadAndSelectAfterCreate(
          () => this.loadFormulations(),
          () => this.formulationList,
          res,
          (item) => this.selectFormulation(item),
          {
            editingId: this.isEditingFormulation ? this.editingFormulationId : null,
            requestedName: requestedFormulationName,
          }
        ).then(() => {
          this.closeFormulationModal();
          this.isFormulationDropdownOpen = false;
        });
      },
      error: (err) => {
        this.showDivUpdatedLoaderNewFormulation = false;
        this.isButtonDisabledFormulation = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err.error?.message || (this.isEditingFormulation ? "Error updating formulation. Please try again." : "Error saving formulation. Please try again.");
        this.showDivAddToDataBaseNewFormulation = true;
        console.error("Error saving formulation: ", err);
      }
    });
  }

  // Lowest Package methods
  loadLowestPackages(): Promise<void> {
    return new Promise((resolve) => {
      this.api.getAllLowestPackagesBusinessItem().subscribe({
        next: (res) => {
          this.lowestPackageList = res || [];
          this.filteredLowestPackageList = this.lowestPackageList;
          this.filteredSellMeasureLowestPackageList = this.lowestPackageList;
          console.log("Lowest packages loaded: ", this.lowestPackageList);
          if (!this.lowestPackageSearchQuery.trim()) {
            this.filteredLowestPackageList = this.lowestPackageList;
          } else {
            this.filterLowestPackages();
          }
          if (!this.sellMeasureLowestPackageSearchQuery.trim()) {
            this.filteredSellMeasureLowestPackageList = this.lowestPackageList;
          } else {
            this.filterSellMeasureLowestPackages();
          }
          resolve();
        },
        error: (err) => {
          console.error("Error loading lowest packages: ", err);
          this.lowestPackageList = [];
          this.filteredLowestPackageList = [];
          this.filteredSellMeasureLowestPackageList = [];
          resolve();
        }
      });
    });
  }

  toggleLowestPackageDropdown() {
    const wasOpen = this.isLowestPackageDropdownOpen;
    this.closeAllStockItemModalDropdowns();
    this.isLowestPackageDropdownOpen = !wasOpen;
    if (this.isLowestPackageDropdownOpen) {
      // Always reload to ensure we have the latest data
      if (this.lowestPackageList.length === 0) {
        this.loadLowestPackages();
      } else {
        // Refresh filtered list even if already loaded
        this.filteredLowestPackageList = this.lowestPackageList;
        if (this.lowestPackageSearchQuery.trim()) {
          this.filterLowestPackages();
        }
      }
    }
  }

  filterLowestPackages() {
    if (!this.lowestPackageSearchQuery.trim()) {
      this.filteredLowestPackageList = this.lowestPackageList;
      return;
    }
    const query = this.lowestPackageSearchQuery.toLowerCase().trim();
    this.filteredLowestPackageList = this.lowestPackageList.filter((pkg: any) => {
      const title = (pkg.title || '').toLowerCase();
      return title.includes(query);
    });
  }

  selectLowestPackage(pkg: any) {
    this.selectedLowestPackage = pkg;
    this.selectedLowestPackageName = pkg.title;
    this.currentStockItem.lowestPackageId = pkg.id;
    this.isLowestPackageDropdownOpen = false;
    this.lowestPackageSearchQuery = '';
    this.filteredLowestPackageList = this.lowestPackageList;
  }

  clearLowestPackageSelection() {
    this.selectedLowestPackage = null;
    this.selectedLowestPackageName = '';
    this.currentStockItem.lowestPackageId = null;
  }

  toggleSellMeasureLowestPackageDropdown() {
    const wasOpen = this.isSellMeasureLowestPackageDropdownOpen;
    this.closeAllStockItemModalDropdowns();
    this.isSellMeasureLowestPackageDropdownOpen = !wasOpen;
    if (this.isSellMeasureLowestPackageDropdownOpen) {
      if (this.lowestPackageList.length === 0) {
        this.loadLowestPackages();
      } else {
        this.filteredSellMeasureLowestPackageList = this.lowestPackageList;
        if (this.sellMeasureLowestPackageSearchQuery.trim()) {
          this.filterSellMeasureLowestPackages();
        }
      }
    }
  }

  filterSellMeasureLowestPackages() {
    if (!this.sellMeasureLowestPackageSearchQuery.trim()) {
      this.filteredSellMeasureLowestPackageList = this.lowestPackageList;
      return;
    }
    const query = this.sellMeasureLowestPackageSearchQuery.toLowerCase().trim();
    this.filteredSellMeasureLowestPackageList = this.lowestPackageList.filter((pkg: any) => {
      const title = (pkg.title || '').toLowerCase();
      return title.includes(query);
    });
  }

  selectSellMeasureLowestPackage(pkg: any) {
    this.selectedSellMeasureLowestPackageName = pkg.title;
    this.currentStockItem.lastUnitOfSellMeasure = pkg.title;
    this.isSellMeasureLowestPackageDropdownOpen = false;
    this.sellMeasureLowestPackageSearchQuery = '';
    this.filteredSellMeasureLowestPackageList = this.lowestPackageList;
  }

  clearSellMeasureLowestPackageSelection() {
    this.selectedSellMeasureLowestPackageName = '';
    this.currentStockItem.lastUnitOfSellMeasure = null;
  }

  openLowestPackageModal() {
    this.clearLowestPackageForm();
    this.isCollapsedNewLowestPackage = false;
    this.isLowestPackageDropdownOpen = false;
    this.openLowestPackageFromSellMeasure = false;
  }

  openSellMeasureLowestPackageModal() {
    this.clearLowestPackageForm();
    this.isCollapsedNewLowestPackage = false;
    this.isSellMeasureLowestPackageDropdownOpen = false;
    this.openLowestPackageFromSellMeasure = true;
  }

  clearLowestPackageForm() {
    this.currentLowestPackage = { title: '', standardAbbreviation: '', description: '' };
    this.showDivAddToDataBaseNewLowestPackage = false;
    this.showDivUpdatedLoaderNewLowestPackage = false;
    this.isButtonDisabledLowestPackage = false;
    this.isEditingLowestPackage = false;
    this.editingLowestPackageId = null;
  }

  closeLowestPackageModal() {
    this.isCollapsedNewLowestPackage = true;
    this.openLowestPackageFromSellMeasure = false;
    this.clearLowestPackageForm();
  }

  saveLowestPackage(data: any) {
    this.isButtonDisabledLowestPackage = true;
    this.showDivUpdatedLoaderNewLowestPackage = true;
    this.showDivAddToDataBaseNewLowestPackage = false;

    const packageData = {
      title: data.title || '',
      standardAbbreviation: data.standardAbbreviation || '',
      description: data.description || ''
    };
    const requestedPackageTitle = (packageData.title || '').trim();
    const fromSellMeasure = this.openLowestPackageFromSellMeasure;

    const apiCall = this.isEditingLowestPackage && this.editingLowestPackageId
      ? this.api.updateLowestPackageBusinessItem(this.editingLowestPackageId, packageData)
      : this.api.addLowestPackageBusinessItem(packageData);

    apiCall.subscribe({
      next: (res: any) => {
        this.showDivUpdatedLoaderNewLowestPackage = false;
        this.isButtonDisabledLowestPackage = false;

        if (res && res.message) {
          this.responseColor = res.message.includes('successfully') ? 'rgb(11, 155, 112)' : 'rgb(238, 16, 16)';
          this.responseMessage = res.message;
        } else {
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = this.isEditingLowestPackage ? "Lowest package updated successfully!" : "Lowest package added successfully!";
        }

        this.showDivAddToDataBaseNewLowestPackage = true;

        void this.reloadAndSelectAfterCreate(
          () => this.loadLowestPackages(),
          () => this.lowestPackageList,
          res,
          (item) => {
            if (fromSellMeasure) {
              this.selectSellMeasureLowestPackage(item);
            } else {
              this.selectLowestPackage(item);
            }
          },
          {
            editingId: this.isEditingLowestPackage ? this.editingLowestPackageId : null,
            requestedName: requestedPackageTitle,
          }
        ).then(() => {
          this.closeLowestPackageModal();
          this.isLowestPackageDropdownOpen = false;
        });
      },
      error: (err) => {
        this.showDivUpdatedLoaderNewLowestPackage = false;
        this.isButtonDisabledLowestPackage = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err.error?.message || (this.isEditingLowestPackage ? "Error updating lowest package. Please try again." : "Error saving lowest package. Please try again.");
        this.showDivAddToDataBaseNewLowestPackage = true;
        console.error("Error saving lowest package: ", err);
      }
    });
  }

  editLowestPackage(pkg: any) {
    if (!pkg || !pkg.id) {
      console.error('Invalid lowest package data for editing');
      return;
    }
    
    this.isEditingLowestPackage = true;
    this.editingLowestPackageId = pkg.id;
    this.currentLowestPackage = {
      title: pkg.title || '',
      standardAbbreviation: pkg.standardAbbreviation || '',
      description: pkg.description || ''
    };
    this.showDivAddToDataBaseNewLowestPackage = false;
    this.showDivUpdatedLoaderNewLowestPackage = false;
    this.isButtonDisabledLowestPackage = false;
    this.isCollapsedNewLowestPackage = false;
    this.isLowestPackageDropdownOpen = false;
  }

  deleteLowestPackage(pkg: any) {
    if (!pkg || !pkg.id) {
      console.error('Invalid lowest package data for deletion');
      return;
    }

    const packageName = pkg.title || 'this lowest package';
    if (confirm(`Are you sure you want to delete "${packageName}"? This action cannot be undone.`)) {
      this.isButtonDisabledLowestPackage = true;
      this.showDivUpdatedLoaderNewLowestPackage = true;
      this.showDivAddToDataBaseNewLowestPackage = false;

      this.api.deleteLowestPackageBusinessItem(pkg.id).subscribe({
        next: (res: any) => {
          this.showDivUpdatedLoaderNewLowestPackage = false;
          this.isButtonDisabledLowestPackage = false;
          
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = res?.message || "Lowest package deleted successfully!";
          this.showDivAddToDataBaseNewLowestPackage = true;

          setTimeout(() => {
            this.loadLowestPackages();
            if (this.selectedLowestPackage && this.selectedLowestPackage.id === pkg.id) {
              this.clearLowestPackageSelection();
            }
            setTimeout(() => {
              this.showDivAddToDataBaseNewLowestPackage = false;
            }, 2000);
          }, 500);
        },
        error: (err) => {
          this.showDivUpdatedLoaderNewLowestPackage = false;
          this.isButtonDisabledLowestPackage = false;
          this.responseColor = 'rgb(238, 16, 16)';
          this.responseMessage = err.error?.message || "Error deleting lowest package. Please try again.";
          this.showDivAddToDataBaseNewLowestPackage = true;
          console.error("Error deleting lowest package: ", err);
          setTimeout(() => {
            this.showDivAddToDataBaseNewLowestPackage = false;
          }, 3000);
        }
      });
    }
  }

  // Category methods
  loadCategories(options?: {
    preserveExpandState?: boolean;
    removeDeletedIds?: Set<number>;
    focusParentId?: number | null;
  }): Promise<void> {
    return new Promise((resolve) => {
      this.api.getAllItemCategoriesBusinessItem().subscribe({
        next: (res) => {
          const categories = res || [];
          this.applyLoadedCategories(categories, options);
          resolve();
        },
        error: (err) => {
          console.error("Error loading categories: ", err);
          this.applyLoadedCategories([], options);
          resolve();
        }
      });
    });
  }

  private applyLoadedCategories(
    categories: any[],
    options?: {
      preserveExpandState?: boolean;
      removeDeletedIds?: Set<number>;
      focusParentId?: number | null;
    }
  ): void {
    const prevMainExpanded = options?.preserveExpandState
      ? this.cloneExpandedSet(this.expandedCategoryIds, options.removeDeletedIds)
      : null;
    const prevItemExpanded = options?.preserveExpandState
      ? this.cloneExpandedSet(this.expandedItemModalCategoryIds, options.removeDeletedIds)
      : null;
    const prevParentExpanded = options?.preserveExpandState
      ? this.cloneExpandedSet(this.expandedCategoryParentIds, options.removeDeletedIds)
      : null;

    this.categoryList = categories.map((cat) => this.normalizeCategoryRecord(cat));
    this.buildCategoryTree();

    if (options?.preserveExpandState) {
      this.expandedCategoryIds = prevMainExpanded ?? new Set<number>();
      this.expandedItemModalCategoryIds = prevItemExpanded ?? new Set<number>();
      this.expandedCategoryParentIds = prevParentExpanded ?? new Set<number>();

      if (options.focusParentId != null) {
        this.expandCategoryAncestors(options.focusParentId, 'main');
        this.expandCategoryAncestors(options.focusParentId, 'item');
        this.expandCategoryAncestors(options.focusParentId, 'parent');
      } else {
        this.expandRootCategories(this.expandedCategoryIds);
        this.expandRootCategories(this.expandedItemModalCategoryIds);
        this.expandRootCategories(this.expandedCategoryParentIds);
      }
    } else {
      this.expandedCategoryIds.clear();
      this.expandedItemModalCategoryIds.clear();
      this.expandedCategoryParentIds.clear();
      this.expandRootCategories(this.expandedCategoryIds);
      this.expandRootCategories(this.expandedItemModalCategoryIds);
      this.expandRootCategories(this.expandedCategoryParentIds);
    }

    this.filteredCategoryList = this.categoryList;
    this.filteredCategoryModalParentList = this.categoryList;

    if (!this.categorySearchQuery.trim() && !this.itemModalCategorySearchQuery.trim() && !this.categoryModalParentSearchQuery.trim()) {
      this.filteredCategoryList = this.categoryList;
      this.filteredCategoryTree = this.categoryTree;
    } else {
      this.filterCategories();
      this.filterItemModalCategories();
      this.filterCategoryModalParents();
    }
  }

  private cloneExpandedSet(source: Set<number>, removeIds?: Set<number>): Set<number> {
    const next = new Set<number>();
    source.forEach((id) => {
      if (!removeIds?.has(id)) {
        next.add(id);
      }
    });
    return next;
  }

  private expandCategoryAncestors(categoryId: number, mode: 'main' | 'item' | 'parent'): void {
    const targetSet =
      mode === 'item'
        ? this.expandedItemModalCategoryIds
        : mode === 'parent'
          ? this.expandedCategoryParentIds
          : this.expandedCategoryIds;

    let currentId: number | null = Number(categoryId);
    const seen = new Set<number>();
    while (currentId != null && !seen.has(currentId)) {
      seen.add(currentId);
      targetSet.add(currentId);
      const current = this.categoryList.find((cat) => Number(cat.id) === currentId);
      currentId = current ? this.getCategoryParentId(current) : null;
    }
    this.expandRootCategories(targetSet);
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
    return {
      ...cat,
      parentId: this.getCategoryParentId(cat)
    };
  }

  private findCategoryInTree(tree: any[], categoryId: number): any | null {
    for (const node of tree) {
      if (Number(node.id) === Number(categoryId)) {
        return node;
      }
      if (node.children?.length) {
        const found = this.findCategoryInTree(node.children, categoryId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  private getCategoryChildren(node: any): any[] {
    if (node?.children?.length) {
      return [...node.children].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return this.categoryList
      .filter((cat) => this.getCategoryParentId(cat) === Number(node.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  private async refreshCategoriesForDelete(): Promise<void> {
    const list = await firstValueFrom(this.api.getAllItemCategoriesBusinessItem());
    this.applyLoadedCategories(Array.isArray(list) ? list : [], { preserveExpandState: true });
  }

  private captureCategoryDropdownSession(focusParentId: number | null = null): void {
    this.categoryDropdownSession = {
      mainOpen: this.isCategoryDropdownOpen,
      itemOpen: this.isItemModalCategoryDropdownOpen,
      parentOpen: this.isCategoryModalParentDropdownOpen,
      focusParentId,
    };
  }

  private restoreCategoryDropdownSession(): void {
    const session = this.categoryDropdownSession;
    if (!session) {
      return;
    }
    this.isCategoryDropdownOpen = session.mainOpen;
    this.isItemModalCategoryDropdownOpen = session.itemOpen;
    this.isCategoryModalParentDropdownOpen = session.parentOpen;
  }

  private clearCategoryDropdownSession(): void {
    this.categoryDropdownSession = null;
  }

  private async refreshCategoriesPreservingDropdown(
    focusParentId: number | null,
    removeDeletedIds?: Set<number>
  ): Promise<void> {
    await this.loadCategories({
      preserveExpandState: true,
      removeDeletedIds,
      focusParentId,
    });

    if (focusParentId != null) {
      this.expandedCategoryIds.add(focusParentId);
      this.expandedItemModalCategoryIds.add(focusParentId);
      this.expandedCategoryParentIds.add(focusParentId);
      if (this.categorySearchQuery.trim()) {
        this.filterCategories();
      }
      if (this.itemModalCategorySearchQuery.trim()) {
        this.filterItemModalCategories();
      }
      if (this.categoryModalParentSearchQuery.trim()) {
        this.filterCategoryModalParents();
      }
    }
  }

  private resolveCategoryNode(category: any): any | null {
    if (!category?.id) {
      return null;
    }
    return (
      this.findCategoryInTree(this.categoryTree, Number(category.id)) ||
      this.categoryList.find((cat) => Number(cat.id) === Number(category.id)) ||
      category
    );
  }

  isCategoryTreeNodeSelected(category: any, mode: 'main' | 'item' | 'parent' = 'main'): boolean {
    if (!category?.id) {
      return false;
    }
    const id = Number(category.id);
    if (mode === 'item') {
      return Number(this.selectedItemModalCategory?.id) === id;
    }
    if (mode === 'parent') {
      return Number(this.selectedCategoryModalParent?.id) === id;
    }
    return Number(this.selectedCategory?.id) === id;
  }

  selectCategoryFromTree(category: any, event: MouseEvent, mode: 'main' | 'item' | 'parent' = 'main'): void {
    event.stopPropagation();
    const resolved = this.resolveCategoryNode(category);
    if (!resolved) {
      return;
    }
    if (mode === 'item') {
      this.selectItemModalCategory(resolved);
      return;
    }
    if (mode === 'parent') {
      this.selectCategoryModalParent(resolved);
      return;
    }
    this.selectCategory(resolved);
  }

  // Get category name by ID
  getCategoryName(categoryId: any): string {
    if (!categoryId || !this.categoryList || this.categoryList.length === 0) {
      return 'N/A';
    }
    const category = this.categoryList.find((c: any) => Number(c.id) === Number(categoryId) || c.id === categoryId);
    return category ? (category.name || 'N/A') : 'N/A';
  }

  /** Prefer category names returned on the stock item DTO (no separate category fetch needed). */
  getItemCategoryLabel(item: any): string {
    const fromDto = (item?.itemCategoryName || '').toString().trim();
    if (fromDto) {
      return fromDto;
    }
    return this.getCategoryName(this.getDisplayCategoryId(item));
  }

  getItemLastCategoryLabel(item: any): string {
    const fromDto = (item?.lastCategoryName || '').toString().trim();
    if (fromDto) {
      return fromDto;
    }
    return this.getLastCategoryName(this.getDisplayCategoryId(item));
  }

  private extractImmediateCategoryId(source: any): number | null {
    if (!source) return null;
    const candidates = [
      source?.itemCategoryId,
      source?.itemCategory?.id,
      source?.lastCategoryId,
      source?.lastCategory?.id,
      source?.categoryId,
      source?.category?.id,
    ];
    for (const candidate of candidates) {
      if (candidate == null || candidate === '') continue;
      const parsed = Number(candidate);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return null;
  }

  getDisplayCategoryId(source: any): number | null {
    return this.extractImmediateCategoryId(source);
  }

  getLastCategoryName(categoryId: any): string {
    if (!categoryId || !this.categoryList || this.categoryList.length === 0) {
      return 'N/A';
    }
    const topParent = this.resolveTopParentCategoryById(categoryId);
    return topParent ? (topParent.name || 'N/A') : 'N/A';
  }
  
  // Check if selected category is drug
  isDrugCategory(): boolean {
    const categoryName = (this.selectedCategoryTopParentName || this.selectedCategoryName || '').toLowerCase().trim();
    if (!categoryName) return false;
    return categoryName === 'drug' || categoryName === 'drugs';
  }
  
  // Check if selected category is sundries
  isSundriesCategory(): boolean {
    const categoryName = (this.selectedCategoryTopParentName || this.selectedCategoryName || '').toLowerCase().trim();
    if (!categoryName) return false;
    return categoryName === 'sundries';
  }
  
  // Check if selected category is non-drug (not drug and not sundries)
  isNonDrugCategory(): boolean {
    const categoryName = (this.selectedCategoryTopParentName || this.selectedCategoryName || '').toLowerCase().trim();
    if (!categoryName) return false;
    return categoryName !== 'drug' && categoryName !== 'drugs' && categoryName !== 'sundries';
  }

  private resolveTopParentCategoryById(categoryId: any): any {
    const byId = (id: any) =>
      this.categoryList.find((c: any) => Number(c.id) === Number(id) || c.id === id);

    let current = byId(categoryId);
    const visited = new Set<number>();

    while (current && current.parentId != null) {
      const currentIdNum = Number(current.id);
      if (Number.isFinite(currentIdNum)) {
        if (visited.has(currentIdNum)) break;
        visited.add(currentIdNum);
      }
      const parent = byId(current.parentId);
      if (!parent) break;
      current = parent;
    }

    return current || null;
  }

  getBrandName(brandId: any): string {
    if (!brandId || !this.brandList || this.brandList.length === 0) {
      return 'N/A';
    }
    const brand = this.brandList.find((b: any) => Number(b.id) === Number(brandId) || b.id === brandId);
    return brand ? (brand.name || 'N/A') : 'N/A';
  }

  getManufacturerName(manufacturerId: any): string {
    if (!manufacturerId || !this.manufacturerList || this.manufacturerList.length === 0) {
      return 'N/A';
    }
    const manufacturer = this.manufacturerList.find((m: any) => Number(m.id) === Number(manufacturerId) || m.id === manufacturerId);
    return manufacturer ? (manufacturer.name || 'N/A') : 'N/A';
  }

  getFormulationName(formulationId: any): string {
    if (!formulationId || !this.formulationList || this.formulationList.length === 0) {
      return 'N/A';
    }
    const formulation = this.formulationList.find((f: any) => Number(f.id) === Number(formulationId) || f.id === formulationId);
    return formulation ? (formulation.name || 'N/A') : 'N/A';
  }

  getLowestPackageName(lowestPackageId: any): string {
    if (!lowestPackageId || !this.lowestPackageList || this.lowestPackageList.length === 0) {
      return 'N/A';
    }
    const pkg = this.lowestPackageList.find((p: any) => Number(p.id) === Number(lowestPackageId) || p.id === lowestPackageId);
    return pkg ? (pkg.title || pkg.name || 'N/A') : 'N/A';
  }

  getRouteOfAdminName(routeOfAdminId: any): string {
    if (!routeOfAdminId || !this.routeOfAdminList || this.routeOfAdminList.length === 0) {
      return 'N/A';
    }
    const route = this.routeOfAdminList.find((r: any) => Number(r.id) === Number(routeOfAdminId) || r.id === routeOfAdminId);
    return route ? (route.title || route.name || 'N/A') : 'N/A';
  }

  getStrengthUnitName(unitId: any): string {
    if (!unitId || !this.strengthUnitList || this.strengthUnitList.length === 0) {
      return '';
    }
    const unit = this.strengthUnitList.find((u: any) => Number(u.id) === Number(unitId) || u.id === unitId);
    return unit ? (unit.title || unit.name || '') : '';
  }

  getStockItemDisplayName(item: any): string {
    if (!item) {
      return 'N/A';
    }
    const built = this.buildStockItemDisplayName(item);
    if (built) {
      return built;
    }
    const stored = String(item.stockItemName || '').trim();
    return stored || 'N/A';
  }

  private buildStockItemDisplayName(item: any): string {
    const parts = this.buildStockItemBaseDisplayParts(item);
    parts.push(...this.formatStockItemIngredientParts(item));
    return parts.length ? parts.join(', ') : '';
  }

  private buildStockItemBaseDisplayParts(item: any): string[] {
    const parts: string[] = [];
    const push = (value: any) => {
      const text = String(value ?? '').trim();
      if (text && text.toLowerCase() !== 'n/a') {
        parts.push(text);
      }
    };

    // Brand, Formulation, Last Unit of Sell Measure, Route, Total Composition
    push(item.brandName || this.getBrandName(item.brandId));
    push(item.formulationName || this.getFormulationName(item.formulationId));
    push(
      item.lastUnitOfSellMeasure ||
        item.lastUnitOfSellMeasureTitle ||
        this.getLowestPackageName(item.lastUnitOfSellMeasure)
    );
    push(item.routeOfAdminTitle || this.getRouteOfAdminName(item.routeOfAdminId));

    const totalComposition = this.formatCompositionStrength(
      item.totalCompositionValue,
      item.totalCompositionUnitTitle || this.getStrengthUnitName(item.totalCompositionUnitId)
    );
    if (totalComposition) {
      parts.push(totalComposition);
    }

    return parts;
  }

  private formatCompositionStrength(value: any, unitTitle: any): string {
    if (value === '' || value == null) {
      return '';
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return '';
    }
    const formatted =
      Number.isInteger(numeric) || numeric % 1 === 0
        ? String(Math.trunc(numeric))
        : String(numeric);
    const unit = this.abbreviateStrengthUnit(unitTitle);
    return unit ? `${formatted} ${unit}` : formatted;
  }

  private abbreviateStrengthUnit(unitTitle: any): string {
    const normalized = String(unitTitle ?? '')
      .trim()
      .toLowerCase()
      .replace(/s\b/g, '') // milliliters → milliliter, grams → gram
      .replace(/\s+/g, ' ');
    const map: Record<string, string> = {
      milligram: 'mg',
      mg: 'mg',
      gram: 'g',
      g: 'g',
      microgram: 'mcg',
      mcg: 'mcg',
      kilogram: 'kg',
      kg: 'kg',
      millilitre: 'ml',
      milliliter: 'ml',
      ml: 'ml',
      litre: 'l',
      liter: 'l',
      l: 'l',
    };
    return map[normalized] || String(unitTitle ?? '').trim();
  }

  private formatStockItemIngredientParts(item: any): string[] {
    const compositions = item?.compositions;
    if (!Array.isArray(compositions) || compositions.length === 0) {
      return this.extractIngredientPartsFromStockItemName(item);
    }

    const seen = new Set<string>();
    const parts: string[] = [];
    for (const comp of compositions) {
      const strength = comp?.strength || comp;
      const ingredientId =
        strength?.activeIngredientId ?? strength?.itemId ?? comp?.activeIngredientId ?? comp?.itemId;
      const fromCatalog = ingredientId != null
        ? this.itemList.find((i: any) => Number(i.id) === Number(ingredientId))
        : null;
      const ingredientName = String(
        strength?.activeIngredient?.genericName ||
          fromCatalog?.genericName ||
          comp?.genericName ||
          strength?.activeIngredient?.name ||
          strength?.activeIngredient?.title ||
          fromCatalog?.title ||
          fromCatalog?.name ||
          comp?.itemName ||
          ''
      ).trim();
      if (!ingredientName) {
        continue;
      }

      const strengthValue = strength?.strengthValue ?? comp?.strengthValue ?? comp?.strength;
      const unitTitle =
        comp?.unitName ||
        strength?.unitName ||
        this.getStrengthUnitName(strength?.strengthUnitId ?? strength?.unitId);
      const strengthPart = this.formatCompositionStrength(strengthValue, unitTitle);
      const label = strengthPart ? `${ingredientName} ${strengthPart}` : ingredientName;
      const key = label.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      parts.push(label);
    }
    return parts;
  }

  private extractIngredientPartsFromStockItemName(item: any): string[] {
    const stored = String(item?.stockItemName || '').trim();
    if (!stored) {
      return [];
    }

    const storedParts = stored.split(',').map((part) => part.trim()).filter(Boolean);
    if (!storedParts.length) {
      return [];
    }

    const baseParts = this.buildStockItemBaseDisplayParts(item);
    const remaining = [...storedParts];

    for (const base of baseParts) {
      if (!remaining.length) {
        break;
      }
      if (this.areDisplayNamePartsEquivalent(remaining[0], base)) {
        remaining.shift();
        continue;
      }
      // Older names may insert lowest-package / reconstitution tokens before this base part.
      if (remaining.length > 1 && this.areDisplayNamePartsEquivalent(remaining[1], base)) {
        remaining.shift();
        remaining.shift();
        continue;
      }
      break;
    }

    // Drop leftover value+unit tokens (e.g. old reconstitution) before ingredient names.
    while (remaining.length > 1 && this.isCompositionOnlyPart(remaining[0])) {
      remaining.shift();
    }

    return remaining
      .map((part) => this.expandTruncatedIngredientPart(part))
      .filter(Boolean);
  }

  private areDisplayNamePartsEquivalent(left: string, right: string): boolean {
    const a = this.normalizeDisplayNamePart(left);
    const b = this.normalizeDisplayNamePart(right);
    if (!a || !b) {
      return false;
    }
    if (a === b) {
      return true;
    }
    const matchA = a.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
    const matchB = b.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
    if (matchA && matchB && matchA[1] === matchB[1]) {
      return (
        this.abbreviateStrengthUnit(matchA[2]).toLowerCase() ===
        this.abbreviateStrengthUnit(matchB[2]).toLowerCase()
      );
    }
    return false;
  }

  private normalizeDisplayNamePart(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private isCompositionOnlyPart(part: string): boolean {
    return /^\d+(?:\.\d+)?\s+\S+$/.test(String(part || '').trim());
  }

  /**
   * If a stored fragment looks truncated (e.g. "xacin 500 mg"), recover the full
   * active-ingredient generic name from the catalog when possible.
   */
  private expandTruncatedIngredientPart(part: string): string {
    const text = String(part || '').trim();
    if (!text || !this.itemList?.length) {
      return text;
    }

    const match = text.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+(.+)$/);
    if (!match) {
      return text;
    }

    const rawName = match[1].trim();
    const strength = match[2];
    const unit = match[3].trim();
    const rawLower = rawName.toLowerCase();

    const exact = this.itemList.find((item: any) => {
      const generic = String(item?.genericName || item?.title || item?.name || '')
        .trim()
        .toLowerCase();
      return generic === rawLower;
    });
    if (exact) {
      const full = String(exact.genericName || exact.title || exact.name || rawName).trim();
      return `${full} ${strength} ${unit}`;
    }

    // Suffix match: "xacin" → "Levofloxacin"
    const suffixHits = this.itemList.filter((item: any) => {
      const generic = String(item?.genericName || item?.title || item?.name || '')
        .trim()
        .toLowerCase();
      return generic.length > rawLower.length && generic.endsWith(rawLower);
    });
    if (suffixHits.length === 1) {
      const full = String(
        suffixHits[0].genericName || suffixHits[0].title || suffixHits[0].name || rawName
      ).trim();
      return `${full} ${strength} ${unit}`;
    }

    return text;
  }

  getReconstitutionUnitName(unitId: any): string {
    if (!unitId || !this.reconstitutionUnitList || this.reconstitutionUnitList.length === 0) {
      return '';
    }
    const unit = this.reconstitutionUnitList.find((u: any) => Number(u.id) === Number(unitId) || u.id === unitId);
    return unit ? (unit.title || unit.name || '') : '';
  }

  // Build hierarchical tree structure from flat list
  buildCategoryTree() {
    const categoryMap = new Map<number, any>();
    const rootCategories: any[] = [];

    // First pass: create map and add children array
    this.categoryList.forEach((cat: any) => {
      categoryMap.set(cat.id, { ...cat, children: [], breadcrumb: cat.name });
      if (!cat.parentId) {
        rootCategories.push(categoryMap.get(cat.id)!);
      }
    });

    // Second pass: build tree structure
    this.categoryList.forEach((cat: any) => {
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        const child = categoryMap.get(cat.id);
        if (parent && child) {
          parent.children.push(child);
          // Build breadcrumb path
          child.breadcrumb = this.buildBreadcrumb(categoryMap, cat.id);
        }
      }
    });

    // Sort root categories and their children
    rootCategories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    rootCategories.forEach(cat => {
      cat.children.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    });

    this.categoryTree = rootCategories;
    this.filteredCategoryTree = [...this.categoryTree];
  }

  // Build breadcrumb path for a category
  buildBreadcrumb(categoryMap: Map<number, any>, categoryId: number): string {
    const category = categoryMap.get(categoryId);
    if (!category || !category.parentId) {
      return category.name;
    }
    const parent = categoryMap.get(category.parentId);
    if (parent) {
      return this.buildBreadcrumb(categoryMap, category.parentId) + ' > ' + category.name;
    }
    return category.name;
  }

  // Flatten tree for display (with hierarchy info)
  flattenCategoryTree(tree: any[], level: number = 0): any[] {
    let result: any[] = [];
    tree.forEach(category => {
      // Add parent category
      result.push({
        ...category,
        displayLevel: level,
        isParent: category.children && category.children.length > 0,
        hasChildren: category.children && category.children.length > 0
      });
      
      // Add children recursively
      if (category.children && category.children.length > 0) {
        category.children.forEach((child: any) => {
          result.push({
            ...child,
            displayLevel: level + 1,
            isChild: true,
            parentName: category.name
          });
        });
      }
    });
    return result;
  }

  toggleCategoryDropdown() {
    const wasOpen = this.isCategoryDropdownOpen;
    this.closeAllStockItemModalDropdowns();
    this.isCategoryDropdownOpen = !wasOpen;
    if (this.isCategoryDropdownOpen) {
      // Always reload to ensure we have the latest data
      if (this.categoryList.length === 0) {
        this.loadCategories();
      } else {
        // Refresh filtered list even if already loaded
        this.filteredCategoryList = this.categoryList;
        this.filteredCategoryTree = [...this.categoryTree];
        this.expandRootCategories(this.expandedCategoryIds);
        if (this.categorySearchQuery.trim()) {
          this.filterCategories();
        }
      }
    }
  }

  filterCategories() {
    if (!this.categorySearchQuery.trim()) {
      this.filteredCategoryList = this.categoryList;
      this.filteredCategoryTree = [...this.categoryTree];
      return;
    }
    const query = this.categorySearchQuery.toLowerCase().trim();
    
    // Filter flat list for backward compatibility
    this.filteredCategoryList = this.categoryList.filter((category: any) => {
      const name = (category.name || '').toLowerCase();
      const breadcrumb = (category.breadcrumb || category.name || '').toLowerCase();
      return name.includes(query) || breadcrumb.includes(query);
    });

    // Filter tree structure - include parent if any child matches
    this.filteredCategoryTree = this.filterCategoryTree(this.categoryTree, query);
    this.expandAllFromTree(this.filteredCategoryTree, this.expandedCategoryIds);
  }

  // Filter category tree recursively
  filterCategoryTree(tree: any[], query: string): any[] {
    return tree
      .map(category => {
        const matchesQuery = (category.name || '').toLowerCase().includes(query);
        const filteredChildren = category.children && category.children.length > 0
          ? this.filterCategoryTree(category.children, query)
          : [];
        
        // Include category if it matches or has matching children
        if (matchesQuery || filteredChildren.length > 0) {
          return {
            ...category,
            children: filteredChildren
          };
        }
        return null;
      })
      .filter((cat): cat is any => cat !== null);
  }

  selectCategory(category: any) {
    const resolved = this.resolveCategoryNode(category);
    if (!resolved?.id) {
      this.clearCategorySelection();
      return;
    }

    this.isCategoryDropdownOpen = false;
    this.categorySearchQuery = '';
    this.filteredCategoryList = this.categoryList;
    this.filteredCategoryTree = [...this.categoryTree];

    // Parent or leaf — any category can be assigned to a consumable item.
    this.selectedCategory = resolved;
    this.selectedCategoryName = resolved.name || '';
    this.currentStockItem.itemCategoryId = resolved.id;

    this.api.getHighestParentItemCategoryBusinessItem(Number(resolved.id)).subscribe({
      next: (highestParent: any) => {
        const topCategory = highestParent || this.resolveTopParentCategoryById(resolved.id) || resolved;
        this.selectedCategoryTopParentName = (topCategory?.name || resolved.name || '').toString();
      },
      error: (err) => {
        console.error('Error loading highest parent category: ', err);
        const topCategory = this.resolveTopParentCategoryById(resolved.id) || resolved;
        this.selectedCategoryTopParentName = (topCategory?.name || resolved.name || '').toString();
      }
    });
  }

  private applyEditCategorySelection(data: any, immediateCategoryId: number | null): void {
    if (immediateCategoryId == null) {
      this.clearCategorySelection();
      return;
    }

    const category =
      this.categoryList.find((c) => Number(c.id) === Number(immediateCategoryId)) ||
      this.findCategoryInTree(this.categoryTree, Number(immediateCategoryId));

    if (category) {
      this.forceSetEditCategory(category);
      return;
    }

    // Keep the saved category id in the form even if the category list has not returned that row.
    this.selectedCategory = null;
    this.currentStockItem.itemCategoryId = immediateCategoryId;
    this.selectedCategoryName =
      data?.itemCategoryName ||
      data?.lastCategoryName ||
      data?.categoryName ||
      data?.itemCategory?.name ||
      data?.category?.name ||
      '';
    this.selectedCategoryTopParentName =
      data?.topParentCategoryName ||
      data?.highestParentCategoryName ||
      data?.parentCategoryName ||
      this.selectedCategoryName;
  }

  private forceSetEditCategory(category: any): void {
    this.selectedCategory = category;
    this.selectedCategoryName = category?.name || '';
    this.currentStockItem.itemCategoryId = category?.id ?? null;
    this.isCategoryDropdownOpen = false;
    this.categorySearchQuery = '';
    this.filteredCategoryList = this.categoryList;
    this.filteredCategoryTree = this.categoryTree;

    if (!category?.id) {
      this.selectedCategoryTopParentName = '';
      return;
    }

    this.api.getHighestParentItemCategoryBusinessItem(Number(category.id)).subscribe({
      next: (highestParent: any) => {
        const resolvedCategory = highestParent || this.resolveTopParentCategoryById(category.id) || category;
        this.selectedCategoryTopParentName = (resolvedCategory?.name || category.name || '').toString();
      },
      error: (err) => {
        console.error('Error loading highest parent category: ', err);
        const resolvedCategory = this.resolveTopParentCategoryById(category.id) || category;
        this.selectedCategoryTopParentName = (resolvedCategory?.name || category.name || '').toString();
      }
    });

    console.log("Category selected:", this.selectedCategoryName);
  }

  private expandRootCategories(targetSet: Set<number>): void {
    if (targetSet.size > 0) return;
    this.categoryTree.forEach((node: any) => {
      if (node?.id != null) {
        targetSet.add(Number(node.id));
      }
    });
  }

  private expandAllFromTree(tree: any[], targetSet: Set<number>): void {
    tree.forEach((node: any) => {
      if (node?.id != null && node?.children?.length) {
        targetSet.add(Number(node.id));
        this.expandAllFromTree(node.children, targetSet);
      }
    });
  }

  isNodeExpanded(category: any, mode: 'main' | 'item' | 'parent' = 'main'): boolean {
    if (!category?.id) return false;
    const targetSet =
      mode === 'item'
        ? this.expandedItemModalCategoryIds
        : mode === 'parent'
          ? this.expandedCategoryParentIds
          : this.expandedCategoryIds;
    return targetSet.has(Number(category.id));
  }

  toggleCategoryNode(category: any, event: MouseEvent, mode: 'main' | 'item' | 'parent' = 'main'): void {
    event.stopPropagation();
    if (!category?.id || !category?.children?.length) return;

    const targetSet =
      mode === 'item'
        ? this.expandedItemModalCategoryIds
        : mode === 'parent'
          ? this.expandedCategoryParentIds
          : this.expandedCategoryIds;

    const id = Number(category.id);
    if (targetSet.has(id)) {
      targetSet.delete(id);
    } else {
      targetSet.add(id);
    }
  }

  hasSelectableCategoryChildren(category: any): boolean {
    if (!category?.id) {
      return false;
    }

    const treeNode = this.findCategoryInTree(this.categoryTree, Number(category.id)) || category;
    return !!(treeNode?.children?.length);
  }

  /** @deprecated Use selectCategoryFromTree — kept for any legacy template references. */
  onItemCategoryRowClick(category: any, event: MouseEvent, mode: 'main' | 'item' = 'main'): void {
    this.selectCategoryFromTree(category, event, mode);
  }

  openAddSubCategoryModal(parentCategory: any, source: 'main' | 'item' | 'parent' = 'main', event?: MouseEvent): void {
    event?.stopPropagation();
    if (!parentCategory?.id) return;

    this.captureCategoryDropdownSession(Number(parentCategory.id));
    this.categoryModalSource = source;

    if (source === 'item') {
      this.isItemModalCategoryDropdownOpen = false;
    } else if (source === 'parent') {
      this.isCategoryModalParentDropdownOpen = false;
    } else {
      this.isCategoryDropdownOpen = false;
    }

    this.openCategoryModal(source === 'item', { skipSessionCapture: true });
    this.selectCategoryModalParent(parentCategory);
  }

  clearCategorySelection() {
    this.selectedCategory = null;
    this.selectedCategoryName = '';
    this.selectedCategoryTopParentName = '';
    this.currentStockItem.itemCategoryId = null;
  }

  openCategoryModal(fromItemModal: boolean = false, options?: { skipSessionCapture?: boolean }) {
    if (!options?.skipSessionCapture) {
      this.captureCategoryDropdownSession(null);
    }
    this.clearCategoryForm();
    this.isCategoryModalFromItemModal = fromItemModal;
    if (!options?.skipSessionCapture) {
      this.categoryModalSource = fromItemModal ? 'item' : 'main';
    }
    this.isCollapsedNewCategory = false;
    this.isCategoryDropdownOpen = false;
    // Ensure categories are loaded for parent dropdown
    if (this.categoryList.length === 0) {
      this.loadCategories();
    }
  }

  clearCategoryForm() {
    this.currentCategory = { name: '', description: '', parentId: null };
    this.showDivAddToDataBaseNewCategory = false;
    this.showDivUpdatedLoaderNewCategory = false;
    this.isButtonDisabledCategory = false;
    this.isEditingCategory = false;
    this.editingCategoryId = null;
    // Clear parent category selection
    this.clearCategoryModalParentSelection();
  }

  // Category modal parent category dropdown methods
  toggleCategoryModalParentDropdown() {
    this.isCategoryModalParentDropdownOpen = !this.isCategoryModalParentDropdownOpen;
    // Close main category dropdown if open
    this.isCategoryDropdownOpen = false;
    // Ensure categories are loaded
    if (this.categoryList.length === 0) {
      this.loadCategories();
    } else if (this.isCategoryModalParentDropdownOpen) {
      this.expandRootCategories(this.expandedCategoryParentIds);
    }
  }

  filterCategoryModalParents() {
    const query = this.categoryModalParentSearchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredCategoryModalParentList = [...this.categoryList];
      this.filteredCategoryTree = [...this.categoryTree];
    } else {
      this.filteredCategoryModalParentList = this.categoryList.filter(cat => 
        (cat.name || '').toLowerCase().includes(query)
      );
      this.filteredCategoryTree = this.filterCategoryTree(this.categoryTree, query);
      this.expandAllFromTree(this.filteredCategoryTree, this.expandedCategoryParentIds);
    }
  }

  selectCategoryModalParent(category: any) {
    const resolved = this.resolveCategoryNode(category);
    if (!resolved?.id) {
      this.clearCategoryModalParentSelection();
      return;
    }

    this.selectedCategoryModalParent = resolved;
    this.selectedCategoryModalParentName = resolved.name || '';
    this.currentCategory.parentId = resolved.id;
    this.isCategoryModalParentDropdownOpen = false;
    this.categoryModalParentSearchQuery = '';
    this.filterCategoryModalParents();
  }

  clearCategoryModalParentSelection() {
    this.selectedCategoryModalParent = null;
    this.selectedCategoryModalParentName = '';
    this.currentCategory.parentId = null;
    this.categoryModalParentSearchQuery = '';
    this.filteredCategoryModalParentList = [...this.categoryList];
  }

  closeCategoryModal() {
    this.isCollapsedNewCategory = true;
    this.isCategoryModalFromItemModal = false;
    this.categoryModalSource = 'main';
    this.clearCategoryForm();
    this.restoreCategoryDropdownSession();
    this.clearCategoryDropdownSession();
  }

  saveCategory(data: any) {
    const categoryName = (data?.name ?? this.currentCategory?.name ?? '').toString().trim();
    if (!categoryName) {
      this.responseColor = 'rgb(238, 16, 16)';
      this.responseMessage = 'Category name is required.';
      this.showDivAddToDataBaseNewCategory = true;
      this.showDivUpdatedLoaderNewCategory = false;
      this.isButtonDisabledCategory = false;
      return;
    }

    this.isButtonDisabledCategory = true;
    this.showDivUpdatedLoaderNewCategory = true;
    this.showDivAddToDataBaseNewCategory = false;

    let categoryData: any;
    if (this.isEditingCategory && this.editingCategoryId) {
      // For update, use ItemCategoryUpdateRequest format
      categoryData = {
        categoryId: this.editingCategoryId,
        name: categoryName,
        parentId: data.parentId ? Number(data.parentId) : null
      };
    } else {
      // For add, use CategoryRequest format
      categoryData = { 
        name: categoryName,
        parentId: data.parentId ? Number(data.parentId) : null 
      };
    }

    const apiCall = this.isEditingCategory && this.editingCategoryId
      ? this.api.updateItemCategoryBusinessItem(this.editingCategoryId, categoryData)
      : this.api.addItemCategoryBusinessItem(categoryData);

    apiCall.subscribe({
      next: (res: any) => {
        this.showDivUpdatedLoaderNewCategory = false;
        this.isButtonDisabledCategory = false;

        if (res && res.message) {
          this.responseColor = res.message.includes('successfully') || res.message.includes('updated') || res.message.includes('saved') ? 'rgb(11, 155, 112)' : 'rgb(238, 16, 16)';
          this.responseMessage = res.message;
        } else {
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = this.isEditingCategory ? "Category updated successfully!" : "Category added successfully!";
        }

        this.showDivAddToDataBaseNewCategory = true;

        const focusParentId = categoryData.parentId != null ? Number(categoryData.parentId) : null;
        const hadDropdownSession = !!this.categoryDropdownSession;

        void this.refreshCategoriesPreservingDropdown(
          focusParentId ?? this.categoryDropdownSession?.focusParentId ?? null
        ).then(() => {
          this.isCollapsedNewCategory = true;
          this.isCategoryModalFromItemModal = false;
          this.categoryModalSource = 'main';
          this.clearCategoryForm();
          this.restoreCategoryDropdownSession();
          this.clearCategoryDropdownSession();

          if (!hadDropdownSession) {
            void this.reloadAndSelectAfterCreate(
              () => Promise.resolve(),
              () => this.categoryList,
              res,
              (item) => this.applyNewCategorySelection(item),
              {
                editingId: this.isEditingCategory ? this.editingCategoryId : null,
                requestedName: categoryName,
              }
            );
          }
        });
      },
      error: (err) => {
        this.showDivUpdatedLoaderNewCategory = false;
        this.isButtonDisabledCategory = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err.error?.message || "Error saving category. Please try again.";
        this.showDivAddToDataBaseNewCategory = true;
        console.error("Error saving category: ", err);
      }
    });
  }

  // Route of Admin methods
  formatRouteOfAdminDisplay(route: any): string {
    const title = (route?.title || route?.name || '').toString().trim();
    const abbr = (route?.standardAbbreviation || '').toString().trim();
    if (abbr && title) {
      return `${abbr} (${title})`;
    }
    return abbr || title || 'N/A';
  }

  loadRoutesOfAdmin(): Promise<void> {
    return new Promise((resolve) => {
      this.api.getAllRoutesOfAdminBusinessItem().subscribe({
        next: (res) => {
          this.routeOfAdminList = res || [];
          this.filteredRouteOfAdminList = this.routeOfAdminList;
          console.log("Routes of admin loaded: ", this.routeOfAdminList);
          if (!this.routeOfAdminSearchQuery.trim()) {
            this.filteredRouteOfAdminList = this.routeOfAdminList;
          } else {
            this.filterRoutesOfAdmin();
          }
          resolve();
        },
        error: (err) => {
          console.error("Error loading routes of admin: ", err);
          this.routeOfAdminList = [];
          this.filteredRouteOfAdminList = [];
          resolve();
        }
      });
    });
  }

  toggleRouteOfAdminDropdown() {
    const wasOpen = this.isRouteOfAdminDropdownOpen;
    this.closeAllStockItemModalDropdowns();
    this.isRouteOfAdminDropdownOpen = !wasOpen;
    if (this.isRouteOfAdminDropdownOpen) {
      // Always reload to ensure we have the latest data
      if (this.routeOfAdminList.length === 0) {
        this.loadRoutesOfAdmin();
      } else {
        // Refresh filtered list even if already loaded
        this.filteredRouteOfAdminList = this.routeOfAdminList;
        if (this.routeOfAdminSearchQuery.trim()) {
          this.filterRoutesOfAdmin();
        }
      }
    }
  }

  filterRoutesOfAdmin() {
    if (!this.routeOfAdminSearchQuery.trim()) {
      this.filteredRouteOfAdminList = this.routeOfAdminList;
      return;
    }
    const query = this.routeOfAdminSearchQuery.toLowerCase().trim();
    this.filteredRouteOfAdminList = this.routeOfAdminList.filter((route: any) => {
      const title = (route.title || '').toLowerCase();
      const abbr = (route.standardAbbreviation || '').toLowerCase();
      return title.includes(query) || abbr.includes(query);
    });
  }

  selectRouteOfAdmin(route: any) {
    this.selectedRouteOfAdmin = route;
    this.selectedRouteOfAdminName = this.formatRouteOfAdminDisplay(route);
    this.currentStockItem.routeOfAdminId = route.id;
    this.isRouteOfAdminDropdownOpen = false;
    this.routeOfAdminSearchQuery = '';
    this.filteredRouteOfAdminList = this.routeOfAdminList;
  }

  clearRouteOfAdminSelection() {
    this.selectedRouteOfAdmin = null;
    this.selectedRouteOfAdminName = '';
    this.currentStockItem.routeOfAdminId = null;
  }

  openRouteOfAdminModal() {
    this.clearRouteOfAdminForm();
    this.isCollapsedNewRouteOfAdmin = false;
    this.isRouteOfAdminDropdownOpen = false;
  }

  clearRouteOfAdminForm() {
    this.currentRouteOfAdmin = { title: '', standardAbbreviation: '', description: '' };
    this.showDivAddToDataBaseNewRouteOfAdmin = false;
    this.showDivUpdatedLoaderNewRouteOfAdmin = false;
    this.isButtonDisabledRouteOfAdmin = false;
    this.isEditingRouteOfAdmin = false;
    this.editingRouteOfAdminId = null;
  }

  closeRouteOfAdminModal() {
    this.isCollapsedNewRouteOfAdmin = true;
    this.clearRouteOfAdminForm();
  }

  saveRouteOfAdmin(data: any) {
    this.isButtonDisabledRouteOfAdmin = true;
    this.showDivUpdatedLoaderNewRouteOfAdmin = true;
    this.showDivAddToDataBaseNewRouteOfAdmin = false;

    const routeData = {
      title: data.title || '',
      standardAbbreviation: data.standardAbbreviation || '',
      description: data.description || ''
    };
    const requestedRouteTitle = (routeData.title || '').trim();

    const apiCall = this.isEditingRouteOfAdmin && this.editingRouteOfAdminId
      ? this.api.updateRouteOfAdminBusinessItem(this.editingRouteOfAdminId, routeData)
      : this.api.addRouteOfAdminBusinessItem(routeData);

    apiCall.subscribe({
      next: (res: any) => {
        this.showDivUpdatedLoaderNewRouteOfAdmin = false;
        this.isButtonDisabledRouteOfAdmin = false;

        if (res && res.message) {
          this.responseColor = res.message.includes('successfully') || res.message.includes('updated') || res.message.includes('saved') ? 'rgb(11, 155, 112)' : 'rgb(238, 16, 16)';
          this.responseMessage = res.message;
        } else {
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = this.isEditingRouteOfAdmin ? "Route of admin updated successfully!" : "Route of admin added successfully!";
        }

        this.showDivAddToDataBaseNewRouteOfAdmin = true;

        void this.reloadAndSelectAfterCreate(
          () => this.loadRoutesOfAdmin(),
          () => this.routeOfAdminList,
          res,
          (item) => this.selectRouteOfAdmin(item),
          {
            editingId: this.isEditingRouteOfAdmin ? this.editingRouteOfAdminId : null,
            requestedName: requestedRouteTitle,
          }
        ).then(() => {
          this.closeRouteOfAdminModal();
          this.isRouteOfAdminDropdownOpen = false;
        });
      },
      error: (err) => {
        this.showDivUpdatedLoaderNewRouteOfAdmin = false;
        this.isButtonDisabledRouteOfAdmin = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err.error?.message || (this.isEditingRouteOfAdmin ? "Error updating route of admin. Please try again." : "Error saving route of admin. Please try again.");
        this.showDivAddToDataBaseNewRouteOfAdmin = true;
        console.error("Error saving route of admin: ", err);
      }
    });
  }

  // Strength Unit (Composition Unit) methods
  loadStrengthUnits(): Promise<void> {
    return new Promise((resolve) => {
      this.api.getAllStrengthUnitsBusinessItem().subscribe({
        next: (res) => {
          this.strengthUnitList = res || [];
          this.filteredStrengthUnitList = this.strengthUnitList;
          console.log("Strength units loaded: ", this.strengthUnitList);
          if (!this.strengthUnitSearchQuery.trim()) {
            this.filteredStrengthUnitList = this.strengthUnitList;
          } else {
            this.filterStrengthUnits();
          }
          resolve();
        },
        error: (err) => {
          console.error("Error loading strength units: ", err);
          this.strengthUnitList = [];
          this.filteredStrengthUnitList = [];
          resolve();
        }
      });
    });
  }

  toggleStrengthUnitDropdown() {
    const wasOpen = this.isStrengthUnitDropdownOpen;
    this.closeAllStockItemModalDropdowns();
    this.isStrengthUnitDropdownOpen = !wasOpen;
    if (this.isStrengthUnitDropdownOpen) {
      // Always reload to ensure we have the latest data
      this.loadStrengthUnits();
      // Update filtered list after reload
      setTimeout(() => {
        if (!this.strengthUnitSearchQuery.trim()) {
          this.filteredStrengthUnitList = this.strengthUnitList;
        } else {
          this.filterStrengthUnits();
        }
      }, 100);
    }
  }

  filterStrengthUnits() {
    if (!this.strengthUnitSearchQuery.trim()) {
      this.filteredStrengthUnitList = this.strengthUnitList;
      return;
    }
    const query = this.strengthUnitSearchQuery.toLowerCase().trim();
    this.filteredStrengthUnitList = this.strengthUnitList.filter((unit: any) => {
      const title = (unit.title || '').toLowerCase();
      return title.includes(query);
    });
  }

  selectStrengthUnit(unit: any) {
    this.selectedStrengthUnit = unit;
    this.selectedStrengthUnitName = unit.title;
    this.currentStockItem.totalCompositionUnitId = unit.id;
    this.isStrengthUnitDropdownOpen = false;
    this.strengthUnitSearchQuery = '';
    this.filteredStrengthUnitList = this.strengthUnitList;
  }

  clearStrengthUnitSelection() {
    this.selectedStrengthUnit = null;
    this.selectedStrengthUnitName = '';
    this.currentStockItem.totalCompositionUnitId = null;
  }
  
  // Sell Measure Strength Unit methods
  toggleSellMeasureStrengthUnitDropdown() {
    const wasOpen = this.isSellMeasureStrengthUnitDropdownOpen;
    this.closeAllStockItemModalDropdowns();
    this.isSellMeasureStrengthUnitDropdownOpen = !wasOpen;
    if (this.isSellMeasureStrengthUnitDropdownOpen) {
      // Load strength units
      this.loadStrengthUnits();
      setTimeout(() => {
        if (!this.sellMeasureStrengthUnitSearchQuery.trim()) {
          this.filteredStrengthUnitList = this.strengthUnitList;
        } else {
          this.filterSellMeasureStrengthUnits();
        }
      }, 100);
    }
  }
  
  filterSellMeasureStrengthUnits() {
    if (!this.sellMeasureStrengthUnitSearchQuery.trim()) {
      this.filteredStrengthUnitList = this.strengthUnitList;
      return;
    }
    const query = this.sellMeasureStrengthUnitSearchQuery.toLowerCase().trim();
    this.filteredStrengthUnitList = this.strengthUnitList.filter((unit: any) => {
      const title = (unit.title || '').toLowerCase();
      return title.includes(query);
    });
  }
  
  selectSellMeasureStrengthUnit(unit: any) {
    this.selectedSellMeasureStrengthUnitName = unit.title;
    this.currentStockItem.lastUnitOfSellMeasureStrengthUnit = unit.id;
    this.isSellMeasureStrengthUnitDropdownOpen = false;
    this.sellMeasureStrengthUnitSearchQuery = '';
    this.filteredStrengthUnitList = this.strengthUnitList;
  }
  
  clearSellMeasureStrengthUnitSelection() {
    this.selectedSellMeasureStrengthUnitName = '';
    this.currentStockItem.lastUnitOfSellMeasureStrengthUnit = null;
  }
  
  // Prescribing Strength Unit methods
  togglePrescribingStrengthUnitDropdown() {
    const wasOpen = this.isPrescribingStrengthUnitDropdownOpen;
    this.closeAllStockItemModalDropdowns();
    this.isPrescribingStrengthUnitDropdownOpen = !wasOpen;
    if (this.isPrescribingStrengthUnitDropdownOpen) {
      // Load strength units
      this.loadStrengthUnits();
      setTimeout(() => {
        if (!this.prescribingStrengthUnitSearchQuery.trim()) {
          this.filteredStrengthUnitList = this.strengthUnitList;
        } else {
          this.filterPrescribingStrengthUnits();
        }
      }, 100);
    }
  }
  
  filterPrescribingStrengthUnits() {
    if (!this.prescribingStrengthUnitSearchQuery.trim()) {
      this.filteredStrengthUnitList = this.strengthUnitList;
      return;
    }
    const query = this.prescribingStrengthUnitSearchQuery.toLowerCase().trim();
    this.filteredStrengthUnitList = this.strengthUnitList.filter((unit: any) => {
      const title = (unit.title || '').toLowerCase();
      return title.includes(query);
    });
  }
  
  selectPrescribingStrengthUnit(unit: any) {
    this.selectedPrescribingStrengthUnitName = unit.title;
    this.currentStockItem.lastUnitOfPrescribingMeasureStrengthUnit = unit.id;
    this.isPrescribingStrengthUnitDropdownOpen = false;
    this.prescribingStrengthUnitSearchQuery = '';
    this.filteredStrengthUnitList = this.strengthUnitList;
  }
  
  clearPrescribingStrengthUnitSelection() {
    this.selectedPrescribingStrengthUnitName = '';
    this.currentStockItem.lastUnitOfPrescribingMeasureStrengthUnit = null;
  }

  resetPrescribingProfileFields(): void {
    this.prescribingPeriodBasis = 'DAY';
    this.prescribingDosageProfiles = defaultPrescribingDosageProfiles();
    this.prescribingFrequencyMode = 'FIXED_INTERVAL';
    this.prescribingFrequencyFixed = 'OD';
    this.prescribingCustomHours = [];
    this.stockDosageRuleRows = [];
    this.deletedStockDosageRuleIds = [];
    this.isLoadingStockDosageRules = false;
  }

  hydratePrescribingProfileFromData(data: any): void {
    this.prescribingPeriodBasis = (data?.prescribingPeriodBasis || 'DAY') as PrescribingPeriodBasis;
    this.prescribingDosageProfiles = parsePrescribingDosageJson(data?.prescribingDosageJson);
    this.prescribingFrequencyMode = (data?.prescribingFrequencyMode || 'FIXED_INTERVAL') as PrescribingFrequencyMode;
    this.prescribingFrequencyFixed = data?.prescribingFrequencyFixed || 'OD';
    this.prescribingCustomHours = parseCustomFrequencyHours(data?.prescribingFrequencyCustomHours);
  }

  buildPrescribingProfilePayload(): Record<string, string | null> {
    const mode = this.prescribingFrequencyMode || 'FIXED_INTERVAL';
    return {
      prescribingPeriodBasis: this.prescribingPeriodBasis || null,
      prescribingDosageJson: serializePrescribingDosageProfiles(this.prescribingDosageProfiles),
      prescribingFrequencyMode: mode,
      prescribingFrequencyFixed: mode === 'FIXED_INTERVAL' ? this.prescribingFrequencyFixed || null : null,
      prescribingFrequencyCustomHours:
        mode === 'CUSTOM_HOURS' ? serializeCustomFrequencyHours(this.prescribingCustomHours) || null : null,
    };
  }

  addStockDosageRuleRow(seed: Partial<StockDosageRuleFormRow> = {}): void {
    this.stockDosageRuleRows = [
      ...this.stockDosageRuleRows,
      {
        title: '',
        matchLabel: '',
        ruleLabel: '',
        doseCalculationType: 'FIXED',
        fixedDoseValue: null,
        fixedDoseUnit: this.selectedPrescribingStrengthUnitName || this.selectedStrengthUnitName || 'mg',
        weightDoseValue: null,
        weightDoseUnit: 'mg/kg',
        maxDoseValue: null,
        maxDoseUnit: '',
        minAgeYears: null,
        maxAgeYears: null,
        minWeightKg: null,
        maxWeightKg: null,
        route: this.selectedRouteOfAdminName || '',
        frequencyValue: 1,
        frequencyUnit: 1,
        durationValue: 3,
        durationUnit: 1,
        quantity: null,
        quantityUnit: '',
        stockUnitsPerDose: null,
        stockUnitLabel: '',
        instructions: '',
        specialScheduleText: '',
        warning: '',
        active: true,
        sortOrder: this.stockDosageRuleRows.length + 1,
        expanded: true,
        ...seed,
      },
    ];
  }

  toggleStockDosageRuleRow(index: number): void {
    this.stockDosageRuleRows = this.stockDosageRuleRows.map((row, i) => ({
      ...row,
      expanded: i === index ? !row.expanded : row.expanded,
    }));
  }

  stockDosageRuleSummary(row: StockDosageRuleFormRow): string {
    const calculationType = String(row.doseCalculationType || 'FIXED');
    const dose =
      calculationType === 'FIXED'
        ? [row.fixedDoseValue, row.fixedDoseUnit].filter((v) => v != null && String(v).trim() !== '').join(' ')
        : [row.weightDoseValue, row.weightDoseUnit].filter((v) => v != null && String(v).trim() !== '').join(' ');
    const frequency = row.frequencyValue
      ? `${row.frequencyValue} per ${this.dosageRulePeriodUnitLabel(row.frequencyUnit)}`
      : '';
    const route = String(row.route || '').trim();
    return [dose, frequency, route].filter(Boolean).join(' | ') || 'No dose details yet';
  }

  dosageRulePeriodUnitLabel(value: any): string {
    const unit = this.dosageRulePeriodUnits.find((u) => Math.abs(Number(u.value) - Number(value)) < 0.000001);
    return unit?.label || 'Day';
  }

  removeStockDosageRuleRow(index: number): void {
    const row = this.stockDosageRuleRows[index];
    if (!row) {
      return;
    }
    if (row.id) {
      this.deletedStockDosageRuleIds = [...this.deletedStockDosageRuleIds, row.id];
    }
    this.stockDosageRuleRows = this.stockDosageRuleRows.filter((_, i) => i !== index);
  }

  onStockDosageRuleCalculationTypeChange(row: StockDosageRuleFormRow): void {
    if (row.doseCalculationType === 'FIXED') {
      row.weightDoseValue = null;
      row.weightDoseUnit = 'mg/kg';
      return;
    }
    row.fixedDoseValue = null;
    if (!row.weightDoseUnit) {
      row.weightDoseUnit = row.doseCalculationType === 'WEIGHT_PER_DAY' ? 'mg/kg/day' : 'mg/kg';
    }
  }

  loadStockItemDosageRules(stockItemId: number): void {
    if (!stockItemId) {
      this.stockDosageRuleRows = [];
      return;
    }
    const loadToken = ++this.dosageRulesLoadToken;
    this.isLoadingStockDosageRules = true;
    this.api.getStockItemDosageRules(stockItemId, false).subscribe({
      next: (rules: StockDosageRule[]) => {
        if (loadToken !== this.dosageRulesLoadToken) {
          return;
        }
        this.stockDosageRuleRows = this.normalizeStockDosageRules(rules || []).map((rule) =>
          this.mapStockDosageRuleToFormRow(rule)
        );
        this.deletedStockDosageRuleIds = [];
        this.isLoadingStockDosageRules = false;
      },
      error: (err) => {
        if (loadToken !== this.dosageRulesLoadToken) {
          return;
        }
        console.error('Error loading dosage rules:', err);
        this.stockDosageRuleRows = [];
        this.deletedStockDosageRuleIds = [];
        this.isLoadingStockDosageRules = false;
      },
    });
  }

  private normalizeStockDosageRules(rules: StockDosageRule[]): StockDosageRule[] {
    const bestBySignature = new Map<string, StockDosageRule>();

    for (const rule of rules || []) {
      if (!rule) {
        continue;
      }
      const signature = this.stockDosageRuleSignature(rule);
      const existing = bestBySignature.get(signature);
      if (!existing) {
        bestBySignature.set(signature, rule);
        continue;
      }

      const existingId = this.nullableNumber(existing.id) ?? Number.MAX_SAFE_INTEGER;
      const currentId = this.nullableNumber(rule.id) ?? Number.MAX_SAFE_INTEGER;
      if (currentId < existingId) {
        bestBySignature.set(signature, rule);
      }
    }

    return Array.from(bestBySignature.values()).sort(
      (a, b) => (this.nullableNumber(a.sortOrder) ?? 0) - (this.nullableNumber(b.sortOrder) ?? 0)
    );
  }

  private stockDosageRuleSignature(rule: Partial<StockDosageRule>): string {
    return [
      String(rule.title || '').trim().toLowerCase(),
      String(rule.doseCalculationType || ''),
      String(rule.fixedDoseValue ?? ''),
      String(rule.fixedDoseUnit || '').trim().toLowerCase(),
      String(rule.weightDoseValue ?? ''),
      String(rule.weightDoseUnit || '').trim().toLowerCase(),
      String(rule.sortOrder ?? ''),
      String(rule.route || '').trim().toLowerCase(),
    ].join('::');
  }

  private hasPersistedDosageRuleId(id: number | null | undefined): id is number {
    return id != null && Number.isFinite(id) && id > 0;
  }

  private extractDosageRuleId(res: any): number | null {
    const candidates = [res?.data?.id, res?.id, res?.data?.data?.id];
    for (const candidate of candidates) {
      const id = this.nullableNumber(candidate);
      if (id != null && id > 0) {
        return id;
      }
    }
    return null;
  }

  private mapStockDosageRuleToFormRow(rule: StockDosageRule): StockDosageRuleFormRow {
    const id = this.nullableNumber(rule.id);
    return {
      id: id != null && id > 0 ? id : undefined,
      title: rule.title || '',
      matchLabel: rule.matchLabel || '',
      ruleLabel: rule.ruleLabel || '',
      doseCalculationType: rule.doseCalculationType || 'FIXED',
      fixedDoseValue: this.nullableNumber(rule.fixedDoseValue),
      fixedDoseUnit: rule.fixedDoseUnit || '',
      weightDoseValue: this.nullableNumber(rule.weightDoseValue),
      weightDoseUnit: rule.weightDoseUnit || '',
      maxDoseValue: this.nullableNumber(rule.maxDoseValue),
      maxDoseUnit: rule.maxDoseUnit || '',
      minAgeYears: this.nullableNumber(rule.minAgeYears),
      maxAgeYears: this.nullableNumber(rule.maxAgeYears),
      minWeightKg: this.nullableNumber(rule.minWeightKg),
      maxWeightKg: this.nullableNumber(rule.maxWeightKg),
      route: rule.route || '',
      frequencyValue: this.nullableNumber(rule.frequencyValue),
      frequencyUnit: this.nullableNumber(rule.frequencyUnit) || 1,
      durationValue: this.nullableNumber(rule.durationValue),
      durationUnit: this.nullableNumber(rule.durationUnit) || 1,
      quantity: null,
      quantityUnit: '',
      stockUnitsPerDose: null,
      stockUnitLabel: '',
      instructions: rule.instructions || '',
      specialScheduleText: rule.specialScheduleText || '',
      warning: rule.warning || '',
      active: rule.active !== false,
      sortOrder: this.nullableNumber(rule.sortOrder),
      expanded: false,
    };
  }

  private buildStockDosageRulePayload(row: StockDosageRuleFormRow, index: number): StockDosageRulePayload | null {
    const title = String(row.title || '').trim();
    if (!title) {
      return null;
    }
    const calculationType = row.doseCalculationType || 'FIXED';
    return {
      title,
      matchLabel: this.blankToNull(row.matchLabel),
      ruleLabel: this.blankToNull(row.ruleLabel),
      doseCalculationType: calculationType,
      fixedDoseValue: calculationType === 'FIXED' ? this.nullableNumber(row.fixedDoseValue) : null,
      fixedDoseUnit: calculationType === 'FIXED' ? this.blankToNull(row.fixedDoseUnit) : null,
      weightDoseValue: calculationType !== 'FIXED' ? this.nullableNumber(row.weightDoseValue) : null,
      weightDoseUnit: calculationType !== 'FIXED' ? this.blankToNull(row.weightDoseUnit) : null,
      maxDoseValue: this.nullableNumber(row.maxDoseValue),
      maxDoseUnit: this.blankToNull(row.maxDoseUnit),
      minAgeYears: this.nullableNumber(row.minAgeYears),
      maxAgeYears: this.nullableNumber(row.maxAgeYears),
      minWeightKg: this.nullableNumber(row.minWeightKg),
      maxWeightKg: this.nullableNumber(row.maxWeightKg),
      route: this.blankToNull(row.route),
      frequencyValue: this.nullableNumber(row.frequencyValue),
      frequencyUnit: this.nullableNumber(row.frequencyUnit),
      durationValue: this.nullableNumber(row.durationValue),
      durationUnit: this.nullableNumber(row.durationUnit),
      quantity: null,
      quantityUnit: null,
      stockUnitsPerDose: null,
      stockUnitLabel: null,
      instructions: this.blankToNull(row.instructions),
      specialScheduleText: this.blankToNull(row.specialScheduleText),
      warning: this.blankToNull(row.warning),
      active: row.active !== false,
      sortOrder: this.nullableNumber(row.sortOrder) || index + 1,
    };
  }

  private async saveStockItemDosageRules(stockItemId: number): Promise<void> {
    if (!stockItemId) {
      return;
    }

    for (const ruleId of this.deletedStockDosageRuleIds) {
      await firstValueFrom(this.api.deleteStockItemDosageRule(ruleId));
    }

    const rowsToSave = this.stockDosageRuleRows
      .map((row, index) => ({ row, payload: this.buildStockDosageRulePayload(row, index) }))
      .filter((entry): entry is { row: StockDosageRuleFormRow; payload: StockDosageRulePayload } => !!entry.payload);

    const keepIds = new Set<number>(
      rowsToSave
        .map((entry) => entry.row.id)
        .filter((id): id is number => this.hasPersistedDosageRuleId(id))
    );

    const existingRules = await firstValueFrom(this.api.getStockItemDosageRules(stockItemId, false));
    for (const existing of existingRules || []) {
      const existingId = this.nullableNumber(existing?.id);
      if (
        existingId != null &&
        existingId > 0 &&
        !keepIds.has(existingId) &&
        !this.deletedStockDosageRuleIds.includes(existingId)
      ) {
        await firstValueFrom(this.api.deleteStockItemDosageRule(existingId));
      }
    }

    for (const entry of rowsToSave) {
      if (this.hasPersistedDosageRuleId(entry.row.id)) {
        await firstValueFrom(this.api.updateStockItemDosageRule(entry.row.id, entry.payload));
      } else {
        const res = await firstValueFrom(this.api.createStockItemDosageRule(stockItemId, entry.payload));
        const createdId = this.extractDosageRuleId(res);
        if (createdId != null) {
          entry.row.id = createdId;
          keepIds.add(createdId);
        }
      }
    }

    this.deletedStockDosageRuleIds = [];
  }

  private extractSavedStockItemId(res: any): number | null {
    const candidates = [
      res?.data?.id,
      res?.data?.stockItemId,
      res?.id,
      res?.stockItemId,
      this.editingStockItemId,
      this.currentStockItem?.id,
    ];
    for (const candidate of candidates) {
      const n = Number(candidate);
      if (Number.isFinite(n) && n > 0) {
        return n;
      }
    }
    return null;
  }

  private nullableNumber(value: any): number | null {
    if (value === '' || value == null) {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private blankToNull(value: any): string | null {
    const text = String(value ?? '').trim();
    return text ? text : null;
  }

  onPrescribingFrequencyModeChange(): void {
    if (this.prescribingFrequencyMode === 'CUSTOM_HOURS' && !this.prescribingCustomHours.length) {
      this.prescribingCustomHours = [0, 12, 24];
    }
  }

  addPrescribingCustomHour(): void {
    const last = this.prescribingCustomHours[this.prescribingCustomHours.length - 1];
    const next = Number.isFinite(last) ? Math.min(24, last + 6) : 0;
    this.prescribingCustomHours = [...this.prescribingCustomHours, next];
  }

  removePrescribingCustomHour(index: number): void {
    this.prescribingCustomHours = this.prescribingCustomHours.filter((_, i) => i !== index);
  }

  prescribingPeriodBasisLabel(value?: string | null): string {
    return formatPrescribingPeriodBasisLabel(value);
  }

  prescribingFrequencySummary(details: any): string {
    return formatPrescribingFrequencyLabel(
      details?.prescribingFrequencyMode,
      details?.prescribingFrequencyFixed,
      details?.prescribingFrequencyCustomHours
    );
  }

  enabledPrescribingDosageLines(details: any): string[] {
    const profiles = parsePrescribingDosageJson(details?.prescribingDosageJson);
    return this.prescribingDosageProfileLabels
      .filter((row) => profiles[row.key]?.enabled && (profiles[row.key]?.dose || profiles[row.key]?.unit))
      .map((row) => {
        const line = profiles[row.key];
        const dose = String(line.dose || '').trim();
        const unit = String(line.unit || '').trim();
        const text = [dose, unit].filter(Boolean).join(' ');
        return `${row.label}: ${text || '—'}`;
      });
  }

  // Reconstitution Unit methods (reuses StrengthUnit API)
  loadReconstitutionUnits(): Promise<void> {
    return new Promise((resolve) => {
      this.api.getAllStrengthUnitsBusinessItem().subscribe({
        next: (res) => {
          this.reconstitutionUnitList = res || [];
          this.filteredReconstitutionUnitList = this.reconstitutionUnitList;
          console.log("Reconstitution units loaded: ", this.reconstitutionUnitList);
          if (!this.reconstitutionUnitSearchQuery.trim()) {
            this.filteredReconstitutionUnitList = this.reconstitutionUnitList;
          } else {
            this.filterReconstitutionUnits();
          }
          resolve();
        },
        error: (err) => {
          console.error("Error loading reconstitution units: ", err);
          this.reconstitutionUnitList = [];
          this.filteredReconstitutionUnitList = [];
          resolve();
        }
      });
    });
  }

  toggleReconstitutionUnitDropdown() {
    const wasOpen = this.isReconstitutionUnitDropdownOpen;
    this.closeAllStockItemModalDropdowns();
    this.isReconstitutionUnitDropdownOpen = !wasOpen;
    if (this.isReconstitutionUnitDropdownOpen) {
      // Always reload to ensure we have the latest data
      this.loadReconstitutionUnits();
      // Update filtered list after reload
      setTimeout(() => {
        if (!this.reconstitutionUnitSearchQuery.trim()) {
          this.filteredReconstitutionUnitList = this.reconstitutionUnitList;
        } else {
          this.filterReconstitutionUnits();
        }
      }, 100);
    }
  }

  filterReconstitutionUnits() {
    if (!this.reconstitutionUnitSearchQuery.trim()) {
      this.filteredReconstitutionUnitList = this.reconstitutionUnitList;
      return;
    }
    const query = this.reconstitutionUnitSearchQuery.toLowerCase().trim();
    this.filteredReconstitutionUnitList = this.reconstitutionUnitList.filter((unit: any) => {
      const title = (unit.title || '').toLowerCase();
      return title.includes(query);
    });
  }

  selectReconstitutionUnit(unit: any) {
    this.selectedReconstitutionUnit = unit;
    this.selectedReconstitutionUnitName = unit.title;
    this.currentStockItem.reconstitutionUnitId = unit.id;
    this.isReconstitutionUnitDropdownOpen = false;
    this.reconstitutionUnitSearchQuery = '';
    this.filteredReconstitutionUnitList = this.reconstitutionUnitList;
  }

  clearReconstitutionUnitSelection() {
    this.selectedReconstitutionUnit = null;
    this.selectedReconstitutionUnitName = '';
    this.currentStockItem.reconstitutionUnitId = null;
  }

  onReconstitutionSectionToggle(enabled: boolean): void {
    if (!enabled) {
      this.currentStockItem.reconstitutionValue = null;
      this.clearReconstitutionUnitSelection();
      this.isReconstitutionUnitDropdownOpen = false;
      this.reconstitutionUnitSearchQuery = '';
    }
  }

  openStrengthUnitModal() {
    this.clearStrengthUnitForm();
    this.isCollapsedNewStrengthUnit = false;
    this.isStrengthUnitDropdownOpen = false;
    this.openStrengthUnitFromSellMeasure = false;
    this.openStrengthUnitFromPrescribing = false;
    this.openStrengthUnitFromReconstitution = false;
    this.currentIngredientIndexForNewUnit = -1;
  }

  openReconstitutionStrengthUnitModal() {
    this.clearStrengthUnitForm();
    this.isCollapsedNewStrengthUnit = false;
    this.isReconstitutionUnitDropdownOpen = false;
    this.openStrengthUnitFromSellMeasure = false;
    this.openStrengthUnitFromPrescribing = false;
    this.openStrengthUnitFromReconstitution = true;
    this.currentIngredientIndexForNewUnit = -1;
  }

  openIngredientStrengthUnitModal(index: number) {
    this.clearStrengthUnitForm();
    this.isCollapsedNewStrengthUnit = false;
    this.openStrengthUnitFromSellMeasure = false;
    this.openStrengthUnitFromPrescribing = false;
    this.openStrengthUnitFromReconstitution = false;
    this.currentIngredientIndexForNewUnit = index;
    if (index >= 0 && index < this.ingredients.length) {
      this.ingredients[index].isUnitDropdownOpen = false;
    }
  }

  openSellMeasureStrengthUnitModal() {
    this.clearStrengthUnitForm();
    this.isCollapsedNewStrengthUnit = false;
    this.isSellMeasureStrengthUnitDropdownOpen = false;
    this.openStrengthUnitFromSellMeasure = true;
    this.openStrengthUnitFromPrescribing = false;
    this.openStrengthUnitFromReconstitution = false;
    this.currentIngredientIndexForNewUnit = -1;
  }

  openPrescribingStrengthUnitModal() {
    this.clearStrengthUnitForm();
    this.isCollapsedNewStrengthUnit = false;
    this.isPrescribingStrengthUnitDropdownOpen = false;
    this.openStrengthUnitFromSellMeasure = false;
    this.openStrengthUnitFromPrescribing = true;
    this.openStrengthUnitFromReconstitution = false;
    this.currentIngredientIndexForNewUnit = -1;
  }

  clearStrengthUnitForm() {
    this.currentStrengthUnit = { title: '', standardAbbreviation: '', description: '' };
    this.showDivAddToDataBaseNewStrengthUnit = false;
    this.showDivUpdatedLoaderNewStrengthUnit = false;
    this.isButtonDisabledStrengthUnit = false;
    this.isEditingStrengthUnit = false;
    this.editingStrengthUnitId = null;
  }

  closeStrengthUnitModal() {
    this.isCollapsedNewStrengthUnit = true;
    this.openStrengthUnitFromSellMeasure = false;
    this.openStrengthUnitFromPrescribing = false;
    this.openStrengthUnitFromReconstitution = false;
    this.currentIngredientIndexForNewUnit = -1;
    this.clearStrengthUnitForm();
  }

  private selectCreatedStrengthUnit(unit: any): void {
    if (!unit) {
      return;
    }
    if (this.openStrengthUnitFromReconstitution) {
      this.selectReconstitutionUnit(unit);
    } else if (
      this.currentIngredientIndexForNewUnit >= 0 &&
      this.currentIngredientIndexForNewUnit < this.ingredients.length
    ) {
      this.selectIngredientUnit(this.currentIngredientIndexForNewUnit, unit);
    } else if (this.openStrengthUnitFromSellMeasure) {
      this.selectSellMeasureStrengthUnit(unit);
    } else if (this.openStrengthUnitFromPrescribing) {
      this.selectPrescribingStrengthUnit(unit);
    } else {
      this.selectStrengthUnit(unit);
    }
  }

  saveStrengthUnit(data: any) {
    this.isButtonDisabledStrengthUnit = true;
    this.showDivUpdatedLoaderNewStrengthUnit = true;
    this.showDivAddToDataBaseNewStrengthUnit = false;

    const unitData = {
      title: data.title || '',
      standardAbbreviation: data.standardAbbreviation || '',
      description: data.description || ''
    };
    const requestedUnitTitle = (unitData.title || '').trim();

    const apiCall = this.isEditingStrengthUnit && this.editingStrengthUnitId
      ? this.api.updateStrengthUnitBusinessItem(this.editingStrengthUnitId, unitData)
      : this.api.addStrengthUnitBusinessItem(unitData);

    apiCall.subscribe({
      next: (res: any) => {
        this.showDivUpdatedLoaderNewStrengthUnit = false;
        this.isButtonDisabledStrengthUnit = false;

        if (res && res.message) {
          this.responseColor = res.message.includes('successfully') || res.message.includes('updated') || res.message.includes('saved') ? 'rgb(11, 155, 112)' : 'rgb(238, 16, 16)';
          this.responseMessage = res.message;
        } else {
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = this.isEditingStrengthUnit ? "Strength unit updated successfully!" : "Strength unit added successfully!";
        }

        this.showDivAddToDataBaseNewStrengthUnit = true;

        void (async () => {
          await this.loadStrengthUnits();
          await this.loadReconstitutionUnits();
          await this.loadIngredientUnits();
          this.ingredients.forEach((ing) => {
            ing.filteredUnitList = [...this.ingredientUnitList];
          });

          const item = findCreatedInList(this.strengthUnitList, {
            response: res,
            editingId: this.isEditingStrengthUnit ? this.editingStrengthUnitId : null,
            requestedName: requestedUnitTitle,
          });
          this.selectCreatedStrengthUnit(item);

          this.closeStrengthUnitModal();
          this.isStrengthUnitDropdownOpen = false;
          this.isReconstitutionUnitDropdownOpen = false;
          this.isPrescribingStrengthUnitDropdownOpen = false;
          this.ingredients.forEach((ing) => {
            ing.isUnitDropdownOpen = false;
          });
        })();
      },
      error: (err) => {
        this.showDivUpdatedLoaderNewStrengthUnit = false;
        this.isButtonDisabledStrengthUnit = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err.error?.message || (this.isEditingStrengthUnit ? "Error updating strength unit. Please try again." : "Error saving strength unit. Please try again.");
        this.showDivAddToDataBaseNewStrengthUnit = true;
        console.error("Error saving strength unit: ", err);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.brand-dropdown-wrapper') &&
        !target.closest('.formulation-dropdown-wrapper') &&
        !target.closest('.lowest-package-dropdown-wrapper') &&
        !target.closest('.category-dropdown-wrapper') &&
        !target.closest('.route-of-admin-dropdown-wrapper') &&
        !target.closest('.strength-unit-dropdown-wrapper') &&
        !target.closest('.ingredient-item-dropdown-wrapper') &&
        !target.closest('.item-modal-category-dropdown-wrapper') &&
        !target.closest('.category-modal-parent-dropdown-wrapper') &&
        !target.closest('.category-modal-overlay') &&
        !target.closest('.delete-confirm-modal-overlay')) {
      this.closeAllStockItemModalDropdowns();
      this.isItemModalCategoryDropdownOpen = false;
      this.isCategoryModalParentDropdownOpen = false;
    }
  }

  // Active Ingredients & Strengths methods
  loadItems(): Promise<void> {
    return new Promise((resolve) => {
      this.api.getAllActiveIngredientsBusinessItem().subscribe({
        next: (res) => {
          this.itemList = this.normalizeActiveIngredients(res || []);
          this.filteredItemList = this.itemList;
          console.log("Items loaded: ", this.itemList);
          this.ingredients.forEach((ing) => {
            if (!ing.itemSearchQuery || !ing.itemSearchQuery.trim()) {
              ing.filteredItemList = [...this.itemList];
            } else {
              this.filterIngredientItems(this.ingredients.indexOf(ing));
            }
          });
          resolve();
        },
        error: (err) => {
          console.error("Error loading items: ", err);
          this.itemList = [];
          this.filteredItemList = [];
          this.ingredients.forEach((ing) => {
            ing.filteredItemList = [];
          });
          resolve();
        }
      });
    });
  }

  private normalizeActiveIngredients(items: any[]): any[] {
    const seenIds = new Set<number>();
    const seenNames = new Set<string>();
    const unique: any[] = [];

    for (const item of items || []) {
      if (!item) continue;
      const id = Number(item.id);
      const name = String(item.genericName || item.name || item.title || '').trim().toLowerCase();

      if (name) {
        if (seenNames.has(name)) continue;
        seenNames.add(name);
      }

      if (Number.isFinite(id) && id > 0) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }

      unique.push(item);
    }

    return unique;
  }

  loadIngredientUnits(): Promise<void> {
    return new Promise((resolve) => {
      this.api.getAllStrengthUnitsBusinessItem().subscribe({
        next: (res) => {
          this.ingredientUnitList = res || [];
          this.filteredIngredientUnitList = this.ingredientUnitList;
          console.log("Ingredient units loaded: ", this.ingredientUnitList);
          resolve();
        },
        error: (err) => {
          console.error("Error loading ingredient units: ", err);
          this.ingredientUnitList = [];
          this.filteredIngredientUnitList = [];
          resolve();
        }
      });
    });
  }

  addIngredient() {
    this.ingredients.unshift(this.createIngredientRow());
  }

  addIndicationRow(): void {
    this.indicationRows.push({
      rowId: this.indicationRowSeq++,
      id: null,
      text: '',
    });
  }

  removeIndicationRow(index: number): void {
    if (index < 0 || index >= this.indicationRows.length) {
      return;
    }
    this.indicationRows.splice(index, 1);
  }

  trackIndicationRow(_index: number, row: { rowId: number }): number {
    return row.rowId;
  }

  private setIndicationRowsFromData(data: any): void {
    this.indicationRowSeq = 1;
    this.indicationRows = [];
    const list = Array.isArray(data?.indications) ? data.indications : [];
    if (list.length) {
      for (const row of list) {
        const text = String(row?.text || '').trim();
        if (!text) {
          continue;
        }
        this.indicationRows.push({
          rowId: this.indicationRowSeq++,
          id: row?.id != null ? Number(row.id) : null,
          text,
        });
      }
      return;
    }
    const legacy = String(data?.indication || '').trim();
    if (!legacy) {
      return;
    }
    for (const part of legacy.split(/[;\n]+/)) {
      const text = part.trim();
      if (!text) {
        continue;
      }
      this.indicationRows.push({
        rowId: this.indicationRowSeq++,
        id: null,
        text,
      });
    }
  }

  private buildIndicationsPayload(): { id: number | null; text: string }[] {
    return (this.indicationRows || [])
      .map((row) => ({
        id: row?.id != null ? Number(row.id) : null,
        text: String(row?.text || '').trim(),
      }))
      .filter((row) => !!row.text);
  }

  private buildIndicationSummary(): string | null {
    const texts = this.buildIndicationsPayload().map((row) => row.text);
    return texts.length ? texts.join('; ') : null;
  }

  trackIngredientRow(_index: number, ingredient: { rowId: number }): number {
    return ingredient.rowId;
  }

  private createIngredientRow(overrides: Partial<{
    itemId: number | null;
    itemName: string;
    strength: number | null;
    unitId: number | null;
    unitName: string;
  }> = {}) {
    return {
      rowId: this.ingredientRowSeq++,
      itemId: null,
      itemName: '',
      strength: null,
      unitId: null,
      unitName: '',
      isItemDropdownOpen: false,
      isUnitDropdownOpen: false,
      itemSearchQuery: '',
      unitSearchQuery: '',
      filteredItemList: [...this.itemList],
      filteredUnitList: [...this.ingredientUnitList],
      ...overrides,
    };
  }

  removeIngredient(index: number) {
    this.ingredients.splice(index, 1);
  }

  toggleIngredientItemDropdown(index: number) {
    const wasOpen = this.ingredients[index].isItemDropdownOpen;
    this.closeAllStockItemModalDropdowns();
    this.ingredients[index].isItemDropdownOpen = !wasOpen;
  }

  toggleIngredientUnitDropdown(index: number) {
    const wasOpen = this.ingredients[index].isUnitDropdownOpen;
    this.closeAllStockItemModalDropdowns();
    this.ingredients[index].isUnitDropdownOpen = !wasOpen;
    
    if (this.ingredients[index].isUnitDropdownOpen) {
      // Always reload to ensure we have the latest data
      this.loadIngredientUnits();
      // Update filtered list after reload
      setTimeout(() => {
        this.ingredients[index].filteredUnitList = [...this.ingredientUnitList];
        if (this.ingredients[index].unitSearchQuery.trim()) {
          this.filterIngredientUnits(index);
        }
      }, 100);
    }
  }

  filterIngredientItems(index: number) {
    const query = this.ingredients[index].itemSearchQuery.toLowerCase().trim();
    if (!query) {
      this.ingredients[index].filteredItemList = [...this.itemList];
    } else {
      this.ingredients[index].filteredItemList = this.itemList.filter(item => 
        (item.title || '').toLowerCase().includes(query) ||
        (item.name || '').toLowerCase().includes(query) ||
        (item.genericName || '').toLowerCase().includes(query)
      );
    }
  }

  filterIngredientUnits(index: number) {
    const query = this.ingredients[index].unitSearchQuery.toLowerCase().trim();
    if (!query) {
      this.ingredients[index].filteredUnitList = [...this.ingredientUnitList];
    } else {
      this.ingredients[index].filteredUnitList = this.ingredientUnitList.filter(unit => 
        (unit.title || '').toLowerCase().includes(query) ||
        (unit.standardAbbreviation || '').toLowerCase().includes(query)
      );
    }
  }

  selectIngredientItem(index: number, item: any) {
    this.ingredients[index].itemId = item.id;
    this.ingredients[index].itemName = item.genericName || item.title || item.name || '';
    this.ingredients[index].isItemDropdownOpen = false;
    this.ingredients[index].itemSearchQuery = '';
    this.filterIngredientItems(index);
  }

  openItemModal(index: number) {
    this.currentIngredientIndexForNewItem = index;
    this.clearItemForm();
    this.isCollapsedNewItem = false;
    // Close the dropdown
    if (index >= 0 && index < this.ingredients.length) {
      this.ingredients[index].isItemDropdownOpen = false;
    }
    // Ensure categories are loaded
    if (this.categoryList.length === 0) {
      this.loadCategories();
    }
  }

  clearItemForm() {
    this.currentItem = {
      genericName: '',
      categoryId: null,
      contraIndication: '',
      indication: '',
      description: ''
    };
    this.showDivAddToDataBaseNewItem = false;
    this.showDivUpdatedLoaderNewItem = false;
    this.isButtonDisabledItem = false;
    this.isEditingItem = false;
    this.editingItemId = null;
    // Clear category selection
    this.clearItemModalCategorySelection();
  }

  // Item modal category dropdown methods
  toggleItemModalCategoryDropdown() {
    this.isItemModalCategoryDropdownOpen = !this.isItemModalCategoryDropdownOpen;
    // Close main category dropdown if open
    this.isCategoryDropdownOpen = false;
    if (this.isItemModalCategoryDropdownOpen) {
      this.expandRootCategories(this.expandedItemModalCategoryIds);
    }
  }

  filterItemModalCategories() {
    const query = this.itemModalCategorySearchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredCategoryList = [...this.categoryList];
      // Also update filtered tree for display
      this.filteredCategoryTree = [...this.categoryTree];
    } else {
      this.filteredCategoryList = this.categoryList.filter(cat => {
        const name = (cat.name || '').toLowerCase();
        const breadcrumb = (cat.breadcrumb || cat.name || '').toLowerCase();
        return name.includes(query) || breadcrumb.includes(query);
      });
      // Filter tree structure
      this.filteredCategoryTree = this.filterCategoryTree(this.categoryTree, query);
      this.expandAllFromTree(this.filteredCategoryTree, this.expandedItemModalCategoryIds);
    }
  }

  selectItemModalCategory(category: any) {
    const resolved = this.resolveCategoryNode(category);
    if (!resolved?.id) {
      this.clearItemModalCategorySelection();
      return;
    }

    this.selectedItemModalCategory = resolved;
    this.selectedItemModalCategoryName = resolved.name || '';
    this.currentItem.categoryId = resolved.id;
    this.isItemModalCategoryDropdownOpen = false;
    this.itemModalCategorySearchQuery = '';
    this.filterItemModalCategories();
  }

  clearItemModalCategorySelection() {
    this.selectedItemModalCategory = null;
    this.selectedItemModalCategoryName = '';
    this.currentItem.categoryId = null;
    this.itemModalCategorySearchQuery = '';
    this.filteredCategoryList = [...this.categoryList];
  }

  openCategoryModalFromItemModal() {
    this.captureCategoryDropdownSession(null);
    this.openCategoryModal(true, { skipSessionCapture: true });
  }

  closeItemModal() {
    this.isCollapsedNewItem = true;
    this.currentIngredientIndexForNewItem = -1;
    this.clearItemForm();
  }

  saveItem(data: any) {
    this.isButtonDisabledItem = true;
    this.showDivUpdatedLoaderNewItem = true;
    this.showDivAddToDataBaseNewItem = false;

    const itemData = {
      genericName: data.genericName || '',
      categoryId: data.categoryId ? Number(data.categoryId) : null,
      contraIndication: data.contraIndication || '',
      indication: data.indication || '',
      description: data.description || ''
    };
    const requestedItemName = (itemData.genericName || '').trim();
    const ingredientIndex = this.currentIngredientIndexForNewItem;

    console.log('Data to be sent to API for active ingredient:', itemData);
    console.log('Is editing:', this.isEditingItem, 'Editing ID:', this.editingItemId);

    const apiCall = this.isEditingItem && this.editingItemId
      ? this.api.updateActiveIngredientByIdBusinessItem(this.editingItemId, itemData)
      : this.api.addActiveIngredientBusinessItem(itemData);

    apiCall.subscribe({
      next: (res: any) => {
        this.showDivUpdatedLoaderNewItem = false;
        this.isButtonDisabledItem = false;

        if (res && res.message) {
          this.responseColor = res.message.includes('successfully') || res.message.includes('updated') || res.message.includes('saved') ? 'rgb(11, 155, 112)' : 'rgb(238, 16, 16)';
          this.responseMessage = res.message;
        } else {
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = this.isEditingItem ? "Item updated successfully!" : "Item added successfully!";
        }

        this.showDivAddToDataBaseNewItem = true;

        void this.reloadAndSelectAfterCreate(
          () => this.loadItems(),
          () => this.itemList,
          res,
          (item) => {
            if (ingredientIndex >= 0 && ingredientIndex < this.ingredients.length) {
              this.ingredients.forEach((ing) => {
                ing.filteredItemList = [...this.itemList];
              });
              this.selectIngredientItem(ingredientIndex, item);
            }
          },
          {
            editingId: this.isEditingItem ? this.editingItemId : null,
            requestedName: requestedItemName,
          }
        ).then(() => {
          this.closeItemModal();
          if (ingredientIndex >= 0 && ingredientIndex < this.ingredients.length) {
            this.ingredients[ingredientIndex].isItemDropdownOpen = false;
          }
        });
      },
      error: (err) => {
        this.showDivUpdatedLoaderNewItem = false;
        this.isButtonDisabledItem = false;
        this.responseColor = 'rgb(238, 16, 16)';
        this.responseMessage = err.error?.message || (this.isEditingItem ? "Error updating item. Please try again." : "Error saving item. Please try again.");
        this.showDivAddToDataBaseNewItem = true;
        console.error("Error saving item: ", err);
      }
    });
  }

  selectIngredientUnit(index: number, unit: any) {
    this.ingredients[index].unitId = unit.id;
    this.ingredients[index].unitName = unit.title || '';
    this.ingredients[index].isUnitDropdownOpen = false;
    this.ingredients[index].unitSearchQuery = '';
    this.filterIngredientUnits(index);
  }

  clearIngredientItemSelection(index: number) {
    this.ingredients[index].itemId = null;
    this.ingredients[index].itemName = '';
    this.ingredients[index].itemSearchQuery = '';
    this.ingredients[index].filteredItemList = [...this.itemList];
  }

  clearIngredientUnitSelection(index: number) {
    this.ingredients[index].unitId = null;
    this.ingredients[index].unitName = '';
    this.ingredients[index].unitSearchQuery = '';
    this.ingredients[index].filteredUnitList = [...this.ingredientUnitList];
  }

  // Edit and Delete methods
  editBrand(brand: any) {
    if (!brand || !brand.id) {
      console.error('Invalid brand data for editing');
      return;
    }
    
    this.isEditingBrand = true;
    this.editingBrandId = brand.id;
    this.currentBrand = {
      name: brand.name || '',
      manufacturerId: brand.manufacturerId || null,
      description: brand.description || ''
    };
    
    // Load and set manufacturer if manufacturerId exists
    if (brand.manufacturerId) {
      this.loadBrandManufacturerById(brand.manufacturerId);
    } else {
      this.currentBrandManufacturerName = 'Select manufacturer';
      this.currentBrandManufacturerId = null;
    }
    
    this.showDivAddToDataBaseNewBrand = false;
    this.showDivUpdatedLoaderNewBrand = false;
    this.isButtonDisabledBrand = false;
    this.isCollapsedNewBrand = false;
    this.isBrandDropdownOpen = false;
  }

  deleteBrand(brand: any) {
    if (!brand || !brand.id) {
      console.error('Invalid brand data for deletion');
      return;
    }

    const brandName = brand.name || 'this brand';
    if (confirm(`Are you sure you want to delete "${brandName}"? This action cannot be undone.`)) {
      this.isButtonDisabledBrand = true;
      this.showDivUpdatedLoaderNewBrand = true;
      this.showDivAddToDataBaseNewBrand = false;

      this.api.deleteBrandBusinessItem(brand.id).subscribe({
        next: (res: any) => {
          this.showDivUpdatedLoaderNewBrand = false;
          this.isButtonDisabledBrand = false;
          
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = res?.message || "Brand deleted successfully!";
          this.showDivAddToDataBaseNewBrand = true;

          // Reload brands
          setTimeout(() => {
            this.loadBrands();
            // Clear selection if deleted brand was selected
            if (this.selectedBrand && this.selectedBrand.id === brand.id) {
              this.clearBrandSelection();
            }
            setTimeout(() => {
              this.showDivAddToDataBaseNewBrand = false;
            }, 2000);
          }, 500);
        },
        error: (err) => {
          this.showDivUpdatedLoaderNewBrand = false;
          this.isButtonDisabledBrand = false;
          this.responseColor = 'rgb(238, 16, 16)';
          this.responseMessage = err.error?.message || "Error deleting brand. Please try again.";
          this.showDivAddToDataBaseNewBrand = true;
          console.error("Error deleting brand: ", err);
          setTimeout(() => {
            this.showDivAddToDataBaseNewBrand = false;
          }, 3000);
        }
      });
    }
  }

  editFormulation(formulation: any) {
    if (!formulation || !formulation.id) {
      console.error('Invalid formulation data for editing');
      return;
    }
    
    this.isEditingFormulation = true;
    this.editingFormulationId = formulation.id;
    this.currentFormulation = {
      name: formulation.name || '',
      description: formulation.description || ''
    };
    this.showDivAddToDataBaseNewFormulation = false;
    this.showDivUpdatedLoaderNewFormulation = false;
    this.isButtonDisabledFormulation = false;
    this.isCollapsedNewFormulation = false;
    this.isFormulationDropdownOpen = false;
  }

  deleteFormulation(formulation: any) {
    if (!formulation || !formulation.id) {
      console.error('Invalid formulation data for deletion');
      return;
    }

    const formulationName = formulation.name || 'this formulation';
    if (confirm(`Are you sure you want to delete "${formulationName}"? This action cannot be undone.`)) {
      this.isButtonDisabledFormulation = true;
      this.showDivUpdatedLoaderNewFormulation = true;
      this.showDivAddToDataBaseNewFormulation = false;

      this.api.deleteFormulationBusinessItem(formulation.id).subscribe({
        next: (res: any) => {
          this.showDivUpdatedLoaderNewFormulation = false;
          this.isButtonDisabledFormulation = false;
          
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = res?.message || "Formulation deleted successfully!";
          this.showDivAddToDataBaseNewFormulation = true;

          setTimeout(() => {
            this.loadFormulations();
            if (this.selectedFormulation && this.selectedFormulation.id === formulation.id) {
              this.clearFormulationSelection();
            }
            setTimeout(() => {
              this.showDivAddToDataBaseNewFormulation = false;
            }, 2000);
          }, 500);
        },
        error: (err) => {
          this.showDivUpdatedLoaderNewFormulation = false;
          this.isButtonDisabledFormulation = false;
          this.responseColor = 'rgb(238, 16, 16)';
          this.responseMessage = err.error?.message || "Error deleting formulation. Please try again.";
          this.showDivAddToDataBaseNewFormulation = true;
          console.error("Error deleting formulation: ", err);
          setTimeout(() => {
            this.showDivAddToDataBaseNewFormulation = false;
          }, 3000);
        }
      });
    }
  }

  editCategory(category: any, source: 'main' | 'item' | 'parent' = 'main', event?: MouseEvent) {
    event?.stopPropagation();
    if (!category || !category.id) {
      console.error('Invalid category data for editing');
      return;
    }

    this.captureCategoryDropdownSession(this.getCategoryParentId(category));
    this.categoryModalSource = source;
    
    this.isEditingCategory = true;
    this.editingCategoryId = category.id;
    this.currentCategory = {
      name: category.name || '',
      description: category.description || '',
      parentId: category.parentId || null
    };
    
    // Set parent category selection if exists
    if (category.parentId) {
      const parentCategory = this.categoryList.find((c: any) => c.id === category.parentId);
      if (parentCategory) {
        this.selectedCategoryModalParent = parentCategory;
        this.selectedCategoryModalParentName = parentCategory.name;
      }
    } else {
      this.clearCategoryModalParentSelection();
    }
    
    this.showDivAddToDataBaseNewCategory = false;
    this.showDivUpdatedLoaderNewCategory = false;
    this.isButtonDisabledCategory = false;
    this.isCollapsedNewCategory = false;
    if (source === 'item') {
      this.isItemModalCategoryDropdownOpen = false;
    } else if (source === 'parent') {
      this.isCategoryModalParentDropdownOpen = false;
    } else {
      this.isCategoryDropdownOpen = false;
    }
    if (this.categoryList.length === 0) {
      this.loadCategories();
    }
  }

  async deleteCategory(category: any): Promise<void> {
    if (!category || !category.id) {
      console.error('Invalid category data for deletion');
      return;
    }

    this.captureCategoryDropdownSession(this.getCategoryParentId(category));
    this.isPreparingCategoryDelete = true;
    try {
      await this.refreshCategoriesForDelete();
      const treeNode = this.findCategoryInTree(this.categoryTree, category.id) || category;
      this.categoryToDelete = treeNode;
      this.categoryDeletePreview = this.buildCategoryDeletePreview(treeNode);
      this.categoryDeleteOrder = this.getCategoryDeleteOrder(treeNode);
      this.showDeleteCategoryConfirmModal = true;
      document.body.style.overflow = 'hidden';
    } catch (err) {
      console.error('Error preparing category delete:', err);
      this.responseColor = 'rgb(238, 16, 16)';
      this.responseMessage = 'Could not load categories for deletion. Please try again.';
      this.showDivAddToDataBaseNewCategory = true;
      setTimeout(() => {
        this.showDivAddToDataBaseNewCategory = false;
      }, 3000);
    } finally {
      this.isPreparingCategoryDelete = false;
    }
  }

  closeDeleteCategoryConfirmModal(restoreDropdown = true): void {
    if (this.isDeletingCategory || this.isPreparingCategoryDelete) {
      return;
    }
    this.dismissDeleteCategoryConfirmModal(restoreDropdown);
  }

  private dismissDeleteCategoryConfirmModal(restoreDropdown = true): void {
    this.showDeleteCategoryConfirmModal = false;
    this.categoryToDelete = null;
    this.categoryDeletePreview = [];
    this.categoryDeleteOrder = [];
    this.categoryDeleteProgress = { current: 0, total: 0, name: '' };
    document.body.style.overflow = '';
    if (restoreDropdown) {
      this.restoreCategoryDropdownSession();
      this.clearCategoryDropdownSession();
    }
  }

  get categoryDeleteChildCount(): number {
    return Math.max(0, this.categoryDeletePreview.length - 1);
  }

  async confirmDeleteCategory(): Promise<void> {
    if (!this.categoryToDelete?.id) {
      this.closeDeleteCategoryConfirmModal();
      return;
    }

    const deletedIds = new Set<number>();
    const parentOfDeleted =
      this.categoryDropdownSession?.focusParentId ?? this.getCategoryParentId(this.categoryToDelete);
    this.isDeletingCategory = true;
    this.isButtonDisabledCategory = true;
    let deleteSucceeded = false;

    try {
      await this.refreshCategoriesForDelete();
      const treeNode = this.findCategoryInTree(this.categoryTree, this.categoryToDelete.id) || this.categoryToDelete;
      this.categoryDeleteOrder = this.getCategoryDeleteOrder(treeNode);
      this.categoryDeletePreview = this.buildCategoryDeletePreview(treeNode);

      if (!this.categoryDeleteOrder.length) {
        throw new Error('No categories found to delete.');
      }

      const previewById = new Map(
        this.categoryDeletePreview.map((item) => [item.id, item.name || 'Unnamed category'])
      );
      const total = this.categoryDeleteOrder.length;
      let lastMessage = 'Category deleted successfully!';
      let deletedCount = 0;

      for (let index = 0; index < this.categoryDeleteOrder.length; index++) {
        const id = this.categoryDeleteOrder[index];
        this.categoryDeleteProgress = {
          current: index + 1,
          total,
          name: previewById.get(id) || 'category'
        };

        const res: any = await firstValueFrom(this.api.deleteItemCategoryBusinessItem(id));
        if (res?.message && !res?.error) {
          lastMessage = res.message;
        }
        deletedIds.add(id);
        deletedCount++;
      }

      const remainingList = await firstValueFrom(this.api.getAllItemCategoriesBusinessItem());
      const remainingCategories = Array.isArray(remainingList) ? remainingList : [];
      const stillPresent = this.categoryDeleteOrder.filter((id) =>
        remainingCategories.some((cat) => Number(cat.id) === Number(id))
      );

      if (stillPresent.length) {
        throw new Error(
          `Could not remove ${stillPresent.length} of ${total} categories. Please refresh and try again.`
        );
      }

      if (this.selectedCategory && deletedIds.has(this.selectedCategory.id)) {
        this.clearCategorySelection();
      }
      if (this.selectedItemModalCategory && deletedIds.has(this.selectedItemModalCategory.id)) {
        this.clearItemModalCategorySelection();
      }
      if (this.selectedCategoryModalParent && deletedIds.has(this.selectedCategoryModalParent.id)) {
        this.clearCategoryModalParentSelection();
      }

      await this.refreshCategoriesPreservingDropdown(parentOfDeleted, deletedIds);

      this.responseColor = 'rgb(11, 155, 112)';
      this.responseMessage = deletedCount > 1
        ? `${lastMessage} (${deletedCount} categories removed)`
        : lastMessage;
      this.showDivAddToDataBaseNewCategory = true;
      this.restoreCategoryDropdownSession();
      this.clearCategoryDropdownSession();
      deleteSucceeded = true;

      setTimeout(() => {
        this.showDivAddToDataBaseNewCategory = false;
      }, 2500);
    } catch (err: any) {
      console.error('Error deleting category tree:', err);
      this.responseColor = 'rgb(238, 16, 16)';
      this.responseMessage = err?.error?.message || err?.message || 'Error deleting category. Please try again.';
      this.showDivAddToDataBaseNewCategory = true;
      this.restoreCategoryDropdownSession();
      this.clearCategoryDropdownSession();
      setTimeout(() => {
        this.showDivAddToDataBaseNewCategory = false;
      }, 4000);
    } finally {
      this.isDeletingCategory = false;
      this.isButtonDisabledCategory = false;
      this.categoryDeleteProgress = { current: 0, total: 0, name: '' };
      if (deleteSucceeded) {
        this.dismissDeleteCategoryConfirmModal(false);
      }
    }
  }

  private buildCategoryDeletePreview(root: any): { id: number; name: string; level: number; isRoot: boolean }[] {
    const preview: { id: number; name: string; level: number; isRoot: boolean }[] = [
      {
        id: root.id,
        name: root.name || 'Unnamed category',
        level: 0,
        isRoot: true
      }
    ];

    const addChildren = (node: any, level: number): void => {
      const children = this.getCategoryChildren(node);
      for (const child of children) {
        preview.push({
          id: child.id,
          name: child.name || 'Unnamed category',
          level,
          isRoot: false
        });
        addChildren(child, level + 1);
      }
    };

    addChildren(root, 1);
    return preview;
  }

  private getCategoryDeleteOrder(root: any): number[] {
    const order: number[] = [];
    const visit = (node: any): void => {
      const children = this.getCategoryChildren(node);
      for (const child of children) {
        visit(child);
      }
      order.push(Number(node.id));
    };
    visit(root);
    return order;
  }

  editRouteOfAdmin(route: any) {
    if (!route || !route.id) {
      console.error('Invalid route of admin data for editing');
      return;
    }
    
    this.isEditingRouteOfAdmin = true;
    this.editingRouteOfAdminId = route.id;
    this.currentRouteOfAdmin = {
      title: route.title || '',
      standardAbbreviation: route.standardAbbreviation || '',
      description: route.description || ''
    };
    this.showDivAddToDataBaseNewRouteOfAdmin = false;
    this.showDivUpdatedLoaderNewRouteOfAdmin = false;
    this.isButtonDisabledRouteOfAdmin = false;
    this.isCollapsedNewRouteOfAdmin = false;
    this.isRouteOfAdminDropdownOpen = false;
  }

  deleteRouteOfAdmin(route: any) {
    if (!route || !route.id) {
      console.error('Invalid route of admin data for deletion');
      return;
    }

    const routeName = route.title || 'this route of admin';
    if (confirm(`Are you sure you want to delete "${routeName}"? This action cannot be undone.`)) {
      this.isButtonDisabledRouteOfAdmin = true;
      this.showDivUpdatedLoaderNewRouteOfAdmin = true;
      this.showDivAddToDataBaseNewRouteOfAdmin = false;

      this.api.deleteRouteOfAdminBusinessItem(route.id).subscribe({
        next: (res: any) => {
          this.showDivUpdatedLoaderNewRouteOfAdmin = false;
          this.isButtonDisabledRouteOfAdmin = false;
          
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = res?.message || "Route of admin deleted successfully!";
          this.showDivAddToDataBaseNewRouteOfAdmin = true;

          setTimeout(() => {
            this.loadRoutesOfAdmin();
            if (this.selectedRouteOfAdmin && this.selectedRouteOfAdmin.id === route.id) {
              this.clearRouteOfAdminSelection();
            }
            setTimeout(() => {
              this.showDivAddToDataBaseNewRouteOfAdmin = false;
            }, 2000);
          }, 500);
        },
        error: (err) => {
          this.showDivUpdatedLoaderNewRouteOfAdmin = false;
          this.isButtonDisabledRouteOfAdmin = false;
          this.responseColor = 'rgb(238, 16, 16)';
          this.responseMessage = err.error?.message || "Error deleting route of admin. Please try again.";
          this.showDivAddToDataBaseNewRouteOfAdmin = true;
          console.error("Error deleting route of admin: ", err);
          setTimeout(() => {
            this.showDivAddToDataBaseNewRouteOfAdmin = false;
          }, 3000);
        }
      });
    }
  }

  editStrengthUnit(unit: any) {
    if (!unit || !unit.id) {
      console.error('Invalid strength unit data for editing');
      return;
    }
    
    this.isEditingStrengthUnit = true;
    this.editingStrengthUnitId = unit.id;
    this.currentStrengthUnit = {
      title: unit.title || '',
      standardAbbreviation: unit.standardAbbreviation || '',
      description: unit.description || ''
    };
    this.showDivAddToDataBaseNewStrengthUnit = false;
    this.showDivUpdatedLoaderNewStrengthUnit = false;
    this.isButtonDisabledStrengthUnit = false;
    this.isCollapsedNewStrengthUnit = false;
    this.isStrengthUnitDropdownOpen = false;
  }

  deleteStrengthUnit(unit: any) {
    if (!unit || !unit.id) {
      console.error('Invalid strength unit data for deletion');
      return;
    }

    const unitName = unit.title || 'this strength unit';
    if (confirm(`Are you sure you want to delete "${unitName}"? This action cannot be undone.`)) {
      this.isButtonDisabledStrengthUnit = true;
      this.showDivUpdatedLoaderNewStrengthUnit = true;
      this.showDivAddToDataBaseNewStrengthUnit = false;

      this.api.deleteStrengthUnitBusinessItem(unit.id).subscribe({
        next: (res: any) => {
          this.showDivUpdatedLoaderNewStrengthUnit = false;
          this.isButtonDisabledStrengthUnit = false;
          
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = res?.message || "Strength unit deleted successfully!";
          this.showDivAddToDataBaseNewStrengthUnit = true;

          setTimeout(() => {
            this.loadStrengthUnits();
            this.loadReconstitutionUnits(); // Also reload reconstitution units
            this.loadIngredientUnits(); // Also reload ingredient units
            // Update filtered lists for all ingredient unit dropdowns after reload
            setTimeout(() => {
              this.ingredients.forEach(ing => {
                ing.filteredUnitList = [...this.ingredientUnitList];
              });
            }, 100);
            if (this.selectedStrengthUnit && this.selectedStrengthUnit.id === unit.id) {
              this.clearStrengthUnitSelection();
            }
            if (this.selectedReconstitutionUnit && this.selectedReconstitutionUnit.id === unit.id) {
              this.clearReconstitutionUnitSelection();
            }
            // Clear selection if deleted unit was selected in any ingredient row
            this.ingredients.forEach(ing => {
              if (ing.unitId === unit.id) {
                ing.unitId = null;
                ing.unitName = '';
                ing.unitSearchQuery = '';
              }
            });
            setTimeout(() => {
              this.showDivAddToDataBaseNewStrengthUnit = false;
            }, 2000);
          }, 500);
        },
        error: (err) => {
          this.showDivUpdatedLoaderNewStrengthUnit = false;
          this.isButtonDisabledStrengthUnit = false;
          this.responseColor = 'rgb(238, 16, 16)';
          this.responseMessage = err.error?.message || "Error deleting strength unit. Please try again.";
          this.showDivAddToDataBaseNewStrengthUnit = true;
          console.error("Error deleting strength unit: ", err);
          setTimeout(() => {
            this.showDivAddToDataBaseNewStrengthUnit = false;
          }, 3000);
        }
      });
    }
  }

  editIngredientItem(index: number, item: any) {
    if (!item || !item.id) {
      console.error('Invalid item data for editing');
      return;
    }
    
    this.isEditingItem = true;
    this.editingItemId = item.id;
    this.currentIngredientIndexForNewItem = index;
    this.currentItem = {
      genericName: item.genericName || item.title || item.name || '',
      categoryId: item.categoryId || null,
      contraIndication: item.contraIndication || '',
      indication: item.indication || '',
      description: item.description || ''
    };
    
    // Set category selection if exists
    if (item.categoryId) {
      const category = this.categoryList.find((c: any) => c.id === item.categoryId);
      if (category) {
        this.selectedItemModalCategory = category;
        this.selectedItemModalCategoryName = category.name;
      }
    } else {
      this.clearItemModalCategorySelection();
    }
    
    this.showDivAddToDataBaseNewItem = false;
    this.showDivUpdatedLoaderNewItem = false;
    this.isButtonDisabledItem = false;
    this.isCollapsedNewItem = false;
    if (index >= 0 && index < this.ingredients.length) {
      this.ingredients[index].isItemDropdownOpen = false;
    }
    if (this.categoryList.length === 0) {
      this.loadCategories();
    }
  }

  deleteIngredientItem(index: number, item: any) {
    if (!item || !item.id) {
      console.error('Invalid item data for deletion');
      return;
    }

    const itemName = item.genericName || item.title || item.name || 'this item';
    if (confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
      this.isButtonDisabledItem = true;
      this.showDivUpdatedLoaderNewItem = true;
      this.showDivAddToDataBaseNewItem = false;

      this.api.deleteActiveIngredientByIdBusinessItem(item.id).subscribe({
        next: (res: any) => {
          this.showDivUpdatedLoaderNewItem = false;
          this.isButtonDisabledItem = false;
          
          this.responseColor = 'rgb(11, 155, 112)';
          this.responseMessage = res?.message || "Item deleted successfully!";
          this.showDivAddToDataBaseNewItem = true;

          setTimeout(() => {
            this.loadItems();
            // Update filtered lists for all ingredients
            this.ingredients.forEach(ing => {
              ing.filteredItemList = [...this.itemList];
            });
            // Clear selection if deleted item was selected in any ingredient row
            this.ingredients.forEach(ing => {
              if (ing.itemId === item.id) {
                ing.itemId = null;
                ing.itemName = '';
                ing.itemSearchQuery = '';
              }
            });
            setTimeout(() => {
              this.showDivAddToDataBaseNewItem = false;
            }, 2000);
          }, 500);
        },
        error: (err) => {
          this.showDivUpdatedLoaderNewItem = false;
          this.isButtonDisabledItem = false;
          this.responseColor = 'rgb(238, 16, 16)';
          this.responseMessage = err.error?.message || "Error deleting item. Please try again.";
          this.showDivAddToDataBaseNewItem = true;
          console.error("Error deleting item: ", err);
          setTimeout(() => {
            this.showDivAddToDataBaseNewItem = false;
          }, 3000);
        }
      });
    }
  }

  editReconstitutionUnit(unit: any) {
    // Reconstitution units use the same API as strength units
    this.editStrengthUnit(unit);
  }

  deleteReconstitutionUnit(unit: any) {
    // Reconstitution units use the same API as strength units
    this.deleteStrengthUnit(unit);
  }

  editIngredientUnit(index: number, unit: any) {
    // Ingredient units use the same API as strength units
    this.editStrengthUnit(unit);
  }

  deleteIngredientUnit(index: number, unit: any) {
    // Ingredient units use the same API as strength units
    this.deleteStrengthUnit(unit);
  }
}
