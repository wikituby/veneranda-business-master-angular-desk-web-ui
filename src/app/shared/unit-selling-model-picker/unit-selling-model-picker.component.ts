import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import {
  UnitSellingModel,
  UnitSellingModelPayload,
  findUnitSellingModelByNameKeyword,
} from './unit-selling-model.interface';

@Component({
  selector: 'app-unit-selling-model-picker',
  templateUrl: './unit-selling-model-picker.component.html',
  styleUrls: ['./unit-selling-model-picker.component.css'],
})
export class UnitSellingModelPickerComponent implements OnChanges, OnInit, OnDestroy {
  private static openDropdownInstance: UnitSellingModelPickerComponent | null = null;

  @ViewChild('editorBackdrop') editorBackdrop?: ElementRef<HTMLElement>;
  @ViewChild('dropdownToggle') dropdownToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('dropdownMenu') dropdownMenu?: ElementRef<HTMLElement>;
  @Input() stockItemId: number | null = null;
  @Input() shopItemId: number | null = null;
  @Input() procedureId: number | null = null;
  @Input() unitCostPrice: number | null = null;
  @Input() selectedModelId: number | null = null;
  @Input() label = 'Unit sell model';
  @Input() disabled = false;
  @Input() compact = false;
  /**
   * When set, prefer a model whose name contains this text
   * (e.g. "compassion" for Compassion-group clients).
   */
  @Input() preferredNameKeyword: string | null = null;
  /** Match client-visit toolbar action buttons (e.g. Service Request). */
  @Input() toolbarButton = false;
  /** Allow local draft models before a service record exists. */
  @Input() allowDraft = false;
  /**
   * Show a switch in front of the label:
   * ON  = fixed / predictable price via unit sell model dropdown
   * OFF = open price at point of sale (plain number field, no dropdown)
   */
  @Input() showPriceModeSwitch = false;
  /** When true, use unit sell model; when false, free selling price. */
  @Input() useUnitSellingModel = true;
  /** Plain selling price when useUnitSellingModel is false. */
  @Input() freeSellingPrice: number | null = null;

  @Output() selectedModelIdChange = new EventEmitter<number | null>();
  @Output() selectedModelChange = new EventEmitter<UnitSellingModel | null>();
  @Output() unitSellingPriceChange = new EventEmitter<number>();
  @Output() modelsChanged = new EventEmitter<void>();
  @Output() useUnitSellingModelChange = new EventEmitter<boolean>();
  @Output() freeSellingPriceChange = new EventEmitter<number | null>();

  models: UnitSellingModel[] = [];
  filteredModels: UnitSellingModel[] = [];
  searchText = '';
  dropdownOpen = false;
  loading = false;
  saving = false;
  error = '';

  showEditor = false;
  editingModel: UnitSellingModel | null = null;
  editorName = '';
  editorUnitsInBundle: number | null = 1;
  /** Raw text while typing — avoids browser number-input rounding (e.g. 50000 → 49998). */
  editorBundlePriceText = '';
  editorUnitSell: number | null = null;
  editorProfitMargin: number | null = null;

  private draftModels: UnitSellingModel[] = [];
  private nextDraftId = -1;
  dropdownMenuPortaled = false;
  private routerSub?: Subscription;
  private readonly onDocumentClickCapture = (event: Event) => {
    this.handleDocumentClick(event as MouseEvent);
  };

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    document.addEventListener('click', this.onDocumentClickCapture, true);
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationStart => event instanceof NavigationStart))
      .subscribe(() => this.dismissOverlays());
  }

  private handleDocumentClick(event: MouseEvent): void {
    if (this.isClickInsidePickerInteraction(event.target)) {
      return;
    }
    this.dismissOverlays();
  }

  private isClickInsidePickerInteraction(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) {
      return false;
    }
    return !!(
      el.closest('.usm-item-dropdown-toggle') ||
      el.closest('.usm-item-dropdown-menu') ||
      el.closest('.usm-editor-backdrop') ||
      el.closest('.usm-editor-card')
    );
  }

  private dismissOverlays(): void {
    if (this.dropdownOpen) {
      this.closeDropdown();
    }
    if (this.showEditor) {
      this.closeEditor();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (!this.dropdownOpen && !this.showEditor) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.dismissOverlays();
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    if (this.dropdownOpen) {
      this.closeDropdown();
    }
  }

  get isPickerEnabled(): boolean {
    return this.shouldUseDraftStorage()
      || this.hasValidProcedureId()
      || this.hasValidShopItemId()
      || this.hasValidStockItemId();
  }

  get isDraftMode(): boolean {
    return this.shouldUseDraftStorage();
  }

  /** True while the dropdown list or add/edit popup is open. */
  hasOpenOverlay(): boolean {
    return this.dropdownOpen || this.showEditor;
  }

  private shouldUseDraftStorage(): boolean {
    return this.allowDraft
      && !this.hasValidProcedureId()
      && !this.hasValidShopItemId()
      && !this.hasValidStockItemId();
  }

  private hasValidProcedureId(): boolean {
    const id = Number(this.procedureId);
    return Number.isFinite(id) && id > 0;
  }

  private hasValidShopItemId(): boolean {
    const id = Number(this.shopItemId);
    return Number.isFinite(id) && id > 0;
  }

  private hasValidStockItemId(): boolean {
    const id = Number(this.stockItemId);
    return Number.isFinite(id) && id > 0;
  }

  private isDraftModel(model: UnitSellingModel | null | undefined): boolean {
    return !!model && (model.isDraft === true || model.id < 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stockItemId'] || changes['shopItemId'] || changes['procedureId']) {
      this.closeDropdown();
    }
    if (changes['stockItemId'] || changes['shopItemId'] || changes['procedureId'] || changes['unitCostPrice'] || changes['allowDraft']) {
      this.loadModels();
    }
    if (changes['selectedModelId'] && !changes['stockItemId'] && !changes['shopItemId'] && !changes['procedureId'] && this.models.length) {
      this.applySelectedModelFromInput();
    }
    if (changes['preferredNameKeyword'] && this.models.length && !changes['stockItemId'] && !changes['shopItemId'] && !changes['procedureId']) {
      this.applySelectionAfterLoad(false);
    }
    if (changes['unitCostPrice'] && this.showEditor) {
      this.syncEditorDerivedPrices();
    }
  }

  get selectedLabel(): string {
    const model = this.models.find((m) => m.id === this.selectedModelId);
    if (!model) {
      return 'Choose unit sell model';
    }
    return `${model.name} · ${this.formatMoney(model.unitSellingPrice)}/unit`;
  }

  modelSummary(model: UnitSellingModel): string {
    const units = this.bundleUnits(model);
    const bundle = this.bundleAmount(model);
    const unitSell = Number(model.unitSellingPrice) || 0;
    const margin = model.profitMargin != null ? ` · Margin ${this.formatMoney(model.profitMargin)}` : '';
    return `${units} @ ${this.formatMoney(bundle)} → ${this.formatMoney(unitSell)}/unit${margin}`;
  }

  toggleDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.showPriceModeSwitch && !this.useUnitSellingModel) {
      return;
    }
    if (this.disabled || !this.isPickerEnabled) {
      return;
    }
    if (this.dropdownOpen) {
      this.closeDropdown();
      return;
    }
    UnitSellingModelPickerComponent.openDropdownInstance?.closeDropdown();
    UnitSellingModelPickerComponent.openDropdownInstance = this;
    this.dropdownOpen = true;
    this.searchText = '';
    this.onSearchChange();
    if (!this.models.length) {
      this.loadModels();
    }
    this.scheduleDropdownAttach();
  }

  /** Toggle fixed unit-sell-model pricing vs open price at sale. */
  togglePriceMode(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled) {
      return;
    }
    this.setUseUnitSellingModel(!this.useUnitSellingModel);
  }

  setUseUnitSellingModel(enabled: boolean): void {
    if (this.useUnitSellingModel === enabled) {
      return;
    }
    this.useUnitSellingModel = enabled;
    this.useUnitSellingModelChange.emit(enabled);
    if (!enabled) {
      this.closeDropdown();
      // Seed free price from the currently selected model when possible.
      const model = this.models.find((m) => m.id === this.selectedModelId);
      const fromModel = model != null ? Number(model.unitSellingPrice) || 0 : 0;
      const seed =
        this.freeSellingPrice != null && Number(this.freeSellingPrice) > 0
          ? Number(this.freeSellingPrice)
          : fromModel;
      this.freeSellingPrice = seed > 0 ? seed : null;
      this.freeSellingPriceChange.emit(this.freeSellingPrice);
      this.selectedModelId = null;
      this.selectedModelIdChange.emit(null);
      this.selectedModelChange.emit(null);
      this.unitSellingPriceChange.emit(Number(this.freeSellingPrice) || 0);
    } else if (this.isPickerEnabled) {
      this.loadModels(true);
    }
  }

  onFreePriceChange(value: number | string | null): void {
    const n = value == null || value === '' ? null : Number(value);
    this.freeSellingPrice = n != null && Number.isFinite(n) ? n : null;
    this.freeSellingPriceChange.emit(this.freeSellingPrice);
    this.unitSellingPriceChange.emit(Number(this.freeSellingPrice) || 0);
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
    if (UnitSellingModelPickerComponent.openDropdownInstance === this) {
      UnitSellingModelPickerComponent.openDropdownInstance = null;
    }
    this.restorePortaledDropdownMenu();
  }

  private restorePortaledDropdownMenu(): void {
    const menu = this.dropdownMenu?.nativeElement;
    const host = this.dropdownToggle?.nativeElement?.closest('.usm-item-dropdown');
    if (!menu) {
      this.dropdownMenuPortaled = false;
      return;
    }
    if (host && menu.parentElement === document.body) {
      host.appendChild(menu);
    }
    menu.style.position = '';
    menu.style.top = '';
    menu.style.left = '';
    menu.style.width = '';
    menu.style.zIndex = '';
    this.dropdownMenuPortaled = false;
  }

  onSearchChange(): void {
    const q = this.searchText.trim().toLowerCase();
    if (!q) {
      this.filteredModels = [...this.models];
      return;
    }
    this.filteredModels = this.models.filter((m) =>
      `${m.name} ${m.unitSellingPrice} ${m.bundlePrice ?? ''} ${m.unitsInBundle ?? ''} ${m.profitMargin ?? ''}`
        .toLowerCase()
        .includes(q)
    );
  }

  selectModel(model: UnitSellingModel, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.selectedModelId = model.id;
    this.closeDropdown();
    this.selectedModelIdChange.emit(model.id);
    this.selectedModelChange.emit(model);
    this.unitSellingPriceChange.emit(Number(model.unitSellingPrice) || 0);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.onDocumentClickCapture, true);
    this.routerSub?.unsubscribe();
    this.dismissOverlays();
    this.unlockBodyScroll();
    if (UnitSellingModelPickerComponent.openDropdownInstance === this) {
      UnitSellingModelPickerComponent.openDropdownInstance = null;
    }
  }

  openAddEditor(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.beginAddEditor();
  }

  /** Open the add editor from a parent component (e.g. services table modal). */
  openAddEditorFromParent(): void {
    this.beginAddEditor();
  }

  /** Open the edit editor from a parent component. */
  openEditEditorFromParent(model: UnitSellingModel): void {
    this.openEditEditor(model, { preventDefault: () => {}, stopPropagation: () => {} } as Event);
  }

  /** Delete a model from a parent component. */
  deleteModelFromParent(model: UnitSellingModel): void {
    this.deleteModel(model, { preventDefault: () => {}, stopPropagation: () => {} } as Event);
  }

  private beginAddEditor(): void {
    this.closeDropdown();
    this.editingModel = null;
    this.editorName = '';
    this.editorUnitsInBundle = 1;
    const cost = Number(this.unitCostPrice) || 0;
    this.editorBundlePriceText = cost > 0 ? this.formatMoneyInput(cost) : '';
    this.syncEditorDerivedPrices();
    this.showEditor = true;
    this.scheduleEditorAttach();
  }

  openEditEditor(model: UnitSellingModel, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeDropdown();
    this.editingModel = model;
    this.editorName = model.name;
    this.editorUnitsInBundle = this.bundleUnits(model);
    const bundle = this.bundleAmount(model);
    this.editorBundlePriceText = bundle > 0 ? this.formatMoneyInput(bundle) : '';
    this.syncEditorDerivedPrices();
    this.showEditor = true;
    this.scheduleEditorAttach();
  }

  closeEditor(): void {
    this.showEditor = false;
    this.editingModel = null;
    this.editorBundlePriceText = '';
    this.error = '';
    this.unlockBodyScroll();
  }

  private bodyScrollLocked = false;

  private scheduleDropdownAttach(): void {
    setTimeout(() => this.attachDropdownToBody(), 0);
  }

  private attachDropdownToBody(): void {
    const menu = this.dropdownMenu?.nativeElement;
    const toggle = this.dropdownToggle?.nativeElement;
    if (!menu || !toggle || !this.dropdownOpen) {
      return;
    }

    const rect = toggle.getBoundingClientRect();
    const width = Math.max(rect.width, 300);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }

    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${left}px`;
    menu.style.width = `${width}px`;
    // Above Consultation V2 / stacked modals (overlay ~200060–200070)
    menu.style.zIndex = '200120';

    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
      this.dropdownMenuPortaled = true;
    }
  }

  private scheduleEditorAttach(): void {
    setTimeout(() => this.attachEditorToBody(), 0);
  }

  private attachEditorToBody(): void {
    const backdrop = this.editorBackdrop?.nativeElement;
    if (!backdrop || backdrop.parentElement === document.body) {
      return;
    }
    document.body.appendChild(backdrop);
    if (!this.bodyScrollLocked) {
      document.body.style.overflow = 'hidden';
      this.bodyScrollLocked = true;
    }
  }

  private unlockBodyScroll(): void {
    if (!this.bodyScrollLocked) {
      return;
    }
    document.body.style.overflow = '';
    this.bodyScrollLocked = false;
  }

  onBundlePriceInput(value: string): void {
    this.editorBundlePriceText = value;
    this.syncEditorDerivedPrices();
  }

  onEditorUnitsChange(value: number | string | null): void {
    const units = Number(value);
    this.editorUnitsInBundle = Number.isFinite(units) && units > 0 ? Math.trunc(units) : null;
    this.syncEditorDerivedPrices();
  }

  preventNumberInputScroll(event: WheelEvent): void {
    event.preventDefault();
  }

  syncEditorDerivedPrices(): void {
    const units = Number(this.editorUnitsInBundle);
    const bundle = this.parseMoneyInput(this.editorBundlePriceText);
    const cost = Number(this.unitCostPrice) || 0;
    if (Number.isFinite(units) && units > 0 && bundle != null && bundle > 0) {
      this.editorUnitSell = this.roundMoney(bundle / units);
    } else {
      this.editorUnitSell = null;
    }
    const sell = Number(this.editorUnitSell) || 0;
    this.editorProfitMargin = sell > cost ? this.roundMoney(sell - cost) : 0;
  }

  private parseMoneyInput(value: string | number | null | undefined): number | null {
    if (value == null) {
      return null;
    }
    const text = String(value).trim().replace(/,/g, '');
    if (!text) {
      return null;
    }
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
  }

  private formatMoneyInput(value: number): string {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return '';
    }
    if (Number.isInteger(n)) {
      return String(n);
    }
    return String(this.roundMoney(n));
  }

  private isDuplicateModelName(name: string, excludeId?: number | null): boolean {
    const key = name.trim().toLowerCase();
    if (!key) {
      return false;
    }
    return this.models.some((m) => {
      if (excludeId != null && m.id === excludeId) {
        return false;
      }
      return (m.name || '').trim().toLowerCase() === key;
    });
  }

  saveEditor(): void {
    if (!this.isPickerEnabled) {
      return;
    }
    const name = this.editorName.trim();
    if (!name) {
      this.error = 'Model name is required.';
      return;
    }
    if (this.isDuplicateModelName(name, this.editingModel?.id ?? null)) {
      this.error = `A unit sell model named "${name}" already exists.`;
      return;
    }
    const units = Number(this.editorUnitsInBundle);
    const bundle = this.parseMoneyInput(this.editorBundlePriceText);
    const unitSellingPrice = Number(this.editorUnitSell);
    if (!Number.isFinite(units) || units <= 0) {
      this.error = 'Units in bundle must be greater than zero.';
      return;
    }
    if (bundle == null || bundle <= 0) {
      this.error = 'Bundle price must be greater than zero.';
      return;
    }
    if (!Number.isFinite(unitSellingPrice) || unitSellingPrice <= 0) {
      this.error = 'Unit sell could not be calculated.';
      return;
    }
    const payload: UnitSellingModelPayload = {
      name,
      unitsInBundle: Math.trunc(units),
      bundlePrice: this.roundMoney(bundle),
      unitSellingPrice: this.roundMoney(unitSellingPrice),
      profitMargin: this.roundMoney(Number(this.editorProfitMargin) || 0),
      isDefault: this.editingModel ? this.editingModel.isDefault ?? false : this.models.length === 0,
    };

    if (this.shouldUseDraftStorage() || this.isDraftModel(this.editingModel)) {
      this.saveDraftModel(payload);
      return;
    }

    if (!this.hasValidProcedureId() && !this.hasValidShopItemId() && !this.hasValidStockItemId()) {
      this.error = 'Select an item or service before saving this unit sell model.';
      return;
    }

    this.saving = true;
    this.error = '';
    const req = this.editingModel
      ? this.updateRemoteModel(this.editingModel.id, payload)
      : this.createRemoteModel(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.closeEditor();
        this.loadModels(true);
        this.modelsChanged.emit();
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Could not save unit sell model.';
      },
    });
  }

  deleteModel(model: UnitSellingModel, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm(`Delete unit sell model "${model.name}"?`)) {
      return;
    }
    if (this.isDraftMode || this.isDraftModel(model)) {
      this.draftModels = this.draftModels.filter((m) => m.id !== model.id);
      this.models = [...this.draftModels];
      this.filteredModels = [...this.models];
      if (this.selectedModelId === model.id) {
        this.selectedModelId = null;
        this.selectedModelIdChange.emit(null);
        this.selectedModelChange.emit(null);
        this.unitSellingPriceChange.emit(0);
      }
      this.modelsChanged.emit();
      return;
    }
    const req = this.hasValidProcedureId()
      ? this.api.deleteProcedureUnitSellingModel(model.id)
      : this.hasValidShopItemId()
        ? this.api.deleteShopItemUnitSellingModel(model.id)
        : this.api.deleteUnitSellingModel(model.id);
    req.subscribe({
      next: () => {
        if (this.selectedModelId === model.id) {
          this.selectedModelId = null;
          this.selectedModelIdChange.emit(null);
          this.selectedModelChange.emit(null);
          this.unitSellingPriceChange.emit(0);
        }
        this.loadModels(true);
        this.modelsChanged.emit();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Could not delete unit sell model.';
      },
    });
  }

  private saveDraftModel(payload: UnitSellingModelPayload): void {
    if (this.editingModel) {
      const idx = this.draftModels.findIndex((m) => m.id === this.editingModel!.id);
      if (idx >= 0) {
        this.draftModels[idx] = {
          ...this.draftModels[idx],
          name: payload.name,
          unitsInBundle: payload.unitsInBundle ?? 1,
          bundlePrice: payload.bundlePrice ?? null,
          unitSellingPrice: payload.unitSellingPrice,
          profitMargin: payload.profitMargin ?? null,
          isDefault: payload.isDefault ?? false,
          isDraft: true,
        };
      }
    } else {
      const draft: UnitSellingModel = {
        id: this.nextDraftId--,
        name: payload.name,
        unitsInBundle: payload.unitsInBundle ?? 1,
        bundlePrice: payload.bundlePrice ?? null,
        unitSellingPrice: payload.unitSellingPrice,
        profitMargin: payload.profitMargin ?? null,
        isDefault: payload.isDefault ?? this.draftModels.length === 0,
        isDraft: true,
      };
      this.draftModels.push(draft);
    }
    this.models = [...this.draftModels];
    this.filteredModels = [...this.models];
    const editedId = this.editingModel?.id ?? null;
    this.closeEditor();
    const selected =
      editedId != null
        ? this.models.find((m) => m.id === editedId) ?? this.models[this.models.length - 1]
        : this.models[this.models.length - 1];
    if (selected) {
      this.selectModel(selected);
    }
    this.modelsChanged.emit();
  }

  private createRemoteModel(payload: UnitSellingModelPayload) {
    if (this.hasValidProcedureId()) {
      return this.api.createProcedureUnitSellingModel(Number(this.procedureId), payload);
    }
    if (this.hasValidShopItemId()) {
      return this.api.createShopItemUnitSellingModel(Number(this.shopItemId), payload);
    }
    if (this.hasValidStockItemId()) {
      return this.api.createUnitSellingModel(Number(this.stockItemId), payload);
    }
    throw new Error('No item or service selected for unit sell model.');
  }

  private updateRemoteModel(modelId: number, payload: UnitSellingModelPayload) {
    if (modelId < 0) {
      throw new Error('Cannot update a draft unit sell model remotely.');
    }
    if (this.hasValidProcedureId()) {
      return this.api.updateProcedureUnitSellingModel(modelId, payload);
    }
    if (this.hasValidShopItemId()) {
      return this.api.updateShopItemUnitSellingModel(modelId, payload);
    }
    if (this.hasValidStockItemId()) {
      return this.api.updateUnitSellingModel(modelId, payload);
    }
    throw new Error('No item or service selected for unit sell model.');
  }

  private loadModels(keepSelection = false): void {
    if (this.showPriceModeSwitch && !this.useUnitSellingModel) {
      // Open-price mode: do not force model selection or wipe the free price.
      return;
    }
    if (!this.isPickerEnabled) {
      this.models = [];
      this.filteredModels = [];
      this.selectedModelId = null;
      this.selectedModelIdChange.emit(null);
      this.selectedModelChange.emit(null);
      if (!(this.showPriceModeSwitch && !this.useUnitSellingModel)) {
        this.unitSellingPriceChange.emit(0);
      }
      return;
    }

    if (this.isDraftMode) {
      this.models = [...this.draftModels];
      this.filteredModels = [...this.models];
      this.applySelectionAfterLoad(keepSelection);
      return;
    }

    this.loading = true;
    const req = this.hasValidProcedureId()
      ? this.api.getProcedureUnitSellingModels(Number(this.procedureId), this.unitCostPrice)
      : this.hasValidShopItemId()
        ? this.api.getShopItemUnitSellingModels(Number(this.shopItemId), this.unitCostPrice)
        : this.api.getUnitSellingModels(Number(this.stockItemId), this.unitCostPrice);
    req.subscribe({
      next: (rows) => {
        this.models = Array.isArray(rows) ? rows : [];
        this.filteredModels = [...this.models];
        this.loading = false;
        this.applySelectionAfterLoad(keepSelection);
      },
      error: () => {
        this.loading = false;
        this.models = [];
        this.filteredModels = [];
        this.unitSellingPriceChange.emit(0);
      },
    });
  }

  private applySelectionAfterLoad(keepSelection: boolean): void {
    if (keepSelection && this.selectedModelId != null) {
      const current = this.models.find((m) => m.id === this.selectedModelId);
      if (current) {
        this.selectModel(current);
        return;
      }
    }
    const keywordMatch = findUnitSellingModelByNameKeyword(this.models, this.preferredNameKeyword);
    if (keywordMatch) {
      this.selectModel(keywordMatch);
      return;
    }
    const preferredId = this.selectedModelId;
    if (preferredId != null) {
      const preferred = this.models.find((m) => m.id === preferredId);
      if (preferred) {
        this.selectModel(preferred);
        return;
      }
    }
    if (!keepSelection || this.selectedModelId == null) {
      const defaultModel =
        this.models.find((m) => m.isDefault) || this.models[0] || null;
      if (defaultModel) {
        this.selectModel(defaultModel);
      } else {
        this.unitSellingPriceChange.emit(0);
      }
    } else {
      const current = this.models.find((m) => m.id === this.selectedModelId);
      if (current) {
        this.selectModel(current);
      } else {
        this.unitSellingPriceChange.emit(0);
      }
    }
  }

  private applySelectedModelFromInput(): void {
    if (this.selectedModelId == null) {
      this.unitSellingPriceChange.emit(0);
      return;
    }
    const model = this.models.find((m) => m.id === this.selectedModelId);
    if (model) {
      this.selectModel(model);
    }
  }

  private bundleUnits(model: UnitSellingModel): number {
    const units = Number(model.unitsInBundle);
    return Number.isFinite(units) && units > 0 ? Math.trunc(units) : 1;
  }

  private bundleAmount(model: UnitSellingModel): number {
    const bundle = Number(model.bundlePrice);
    if (Number.isFinite(bundle) && bundle > 0) {
      return bundle;
    }
    const units = this.bundleUnits(model);
    return this.roundMoney((Number(model.unitSellingPrice) || 0) * units);
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  formatMoney(value: number | null | undefined): string {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return '0.00';
    }
    return n.toFixed(2);
  }
}
