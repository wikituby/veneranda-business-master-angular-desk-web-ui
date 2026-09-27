import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { SearchableSelectOption } from '../../../../shared/searchable-select/searchable-select.component';

@Component({
  selector: 'app-shop-item-management',
  templateUrl: './shop-item-management.component.html',
  styleUrls: ['./shop-item-management.component.css'],
})
export class ShopItemManagementComponent implements OnInit {
  items: any[] = [];
  categories: any[] = [];
  lowestPackages: any[] = [];
  searchQuery = '';
  page = 1;
  itemsPerPage = 15;
  isLoading = false;
  isSaving = false;
  isDarkMode = false;
  showForm = false;
  showDeleteConfirm = false;
  deletingItem: any = null;
  responseMessage = '';
  responseColor = '';
  showFeedback = false;

  isAddingParentCategory = false;
  isAddingSubCategory = false;
  isAddingUnitOfMeasure = false;
  isAddingLastUnitOfMeasure = false;
  isAddingDosageUnit = false;
  isAddingFrequencyUnit = false;
  isAddingDurationUnit = false;
  isAddingRoute = false;

  form: any = this.emptyForm();

  private readonly defaultUnitOptions = ['each', 'vial', 'tablet', 'capsule', 'ml', 'bottle', 'ampule'];
  private readonly defaultLastUnitOptions = ['mg(s)', 'ml(s)', 'l(s)', 'g(s)', 'iu(s)', 'tab(s)'];
  private readonly defaultDosageUnitOptions = ['mg', 'g', 'ml', 'iu', 'tab', 'cap'];
  private readonly defaultFrequencyUnitOptions = ['per_day', 'per_week', 'per_month'];
  private readonly defaultDurationUnitOptions = ['days', 'weeks', 'months'];
  private readonly defaultRouteOptions = ['oral', 'iv', 'im', 'sc', 'topical', 'inhalation', 'other'];

  unitOptions: string[] = [...this.defaultUnitOptions];
  lastUnitOptions: string[] = [...this.defaultLastUnitOptions];
  dosageUnitOptions: string[] = [...this.defaultDosageUnitOptions];
  frequencyUnitOptions: string[] = [...this.defaultFrequencyUnitOptions];
  durationUnitOptions: string[] = [...this.defaultDurationUnitOptions];
  routeOptions: string[] = [...this.defaultRouteOptions];

  constructor(
    private api: ApiService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!sessionStorage.getItem('username')) {
      this.router.navigate(['/login']);
      return;
    }
    this.themeService.isDarkMode$.subscribe((isDark) => (this.isDarkMode = isDark));
    this.loadCategories();
    this.loadLowestPackages();
    this.loadItems();
  }

  get parentCategories(): any[] {
    return (this.categories || []).filter((c) => this.isRootCategory(c));
  }

  get subCategories(): any[] {
    const parentId = this.form.parentCategoryId;
    if (parentId == null) {
      return [];
    }
    return (this.categories || []).filter(
      (c) => this.getCategoryParentId(c) === Number(parentId)
    );
  }

  get parentCategoryOptions(): SearchableSelectOption[] {
    return this.parentCategories.map((cat) => ({
      value: Number(cat.id),
      label: String(cat.name || 'Category'),
    }));
  }

  get subCategoryOptions(): SearchableSelectOption[] {
    return this.subCategories.map((cat) => ({
      value: Number(cat.id),
      label: String(cat.name || 'Sub category'),
    }));
  }

  get unitOfMeasureOptions(): SearchableSelectOption[] {
    return this.unitOptions.map((value) => ({ value, label: value }));
  }

  get lastUnitOfMeasureOptions(): SearchableSelectOption[] {
    return this.lastUnitOptions.map((value) => ({ value, label: value }));
  }

  get dosageUnitSelectOptions(): SearchableSelectOption[] {
    return this.dosageUnitOptions.map((value) => ({ value, label: value }));
  }

  get frequencyUnitSelectOptions(): SearchableSelectOption[] {
    return this.frequencyUnitOptions.map((value) => ({ value, label: value }));
  }

  get durationUnitSelectOptions(): SearchableSelectOption[] {
    return this.durationUnitOptions.map((value) => ({ value, label: value }));
  }

  get routeSelectOptions(): SearchableSelectOption[] {
    return this.routeOptions.map((value) => ({ value, label: value }));
  }

  get isDrugCategory(): boolean {
    const name = String(
      this.parentCategories.find((c) => Number(c.id) === Number(this.form.parentCategoryId))?.name ?? ''
    )
      .trim()
      .toLowerCase();
    return name === 'drug';
  }

  get filteredItems(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return this.items;
    }
    return this.items.filter((item) => {
      const blob = `${item?.title ?? ''} ${this.parentCategoryLabel(item)} ${this.categoryLabel(item)} ${item?.description ?? ''} ${item?.unitOfMeasure ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  }

  loadItems(): void {
    this.isLoading = true;
    this.api.getAllItems().subscribe({
      next: (res: any) => {
        this.items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.refreshUnitOptionsFromItems();
        this.page = 1;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.items = [];
        this.isLoading = false;
        this.flash(err?.error?.message || 'Could not load items.', true);
      },
    });
  }

  loadCategories(onDone?: () => void): void {
    this.api.getAllItemCategoriesBusinessItem().subscribe({
      next: (res: any) => {
        this.categories = this.normalizeList(res);
        onDone?.();
      },
      error: (err: any) => {
        this.categories = [];
        this.flash(err?.error?.message || 'Could not load categories.', true);
        onDone?.();
      },
    });
  }

  loadLowestPackages(): void {
    this.api.getAllLowestPackagesBusinessItem().subscribe({
      next: (res: any) => {
        this.lowestPackages = this.normalizeList(res);
        this.refreshUnitOptionsFromPackages();
      },
      error: () => {
        this.lowestPackages = [];
      },
    });
  }

  openCreate(): void {
    this.form = this.emptyForm();
    this.showForm = true;
    document.body.style.overflow = 'hidden';
    this.loadCategories();
    this.loadLowestPackages();
  }

  openEdit(item: any): void {
    const parentId =
      item?.parentCategory?.id ??
      item?.parentCategoryId ??
      item?.category?.parent?.id ??
      item?.category?.parentId ??
      item?.category?.parent_id ??
      (item?.category?.parent ? item.category.parent.id : item?.category?.id ?? item?.categoryId ?? null);
    const categoryId = item?.category?.id ?? item?.categoryId ?? null;
    this.ensureStringOption(this.unitOptions, item?.unitOfMeasure);
    this.ensureStringOption(this.lastUnitOptions, item?.lastUnitOfMeasure);
    this.ensureStringOption(this.dosageUnitOptions, item?.dosageUnit);
    this.ensureStringOption(this.frequencyUnitOptions, item?.frequencyUnit);
    this.ensureStringOption(this.durationUnitOptions, item?.durationUnit);
    this.ensureStringOption(this.routeOptions, item?.route);
    this.form = {
      id: item?.id ?? null,
      title: item?.title ?? '',
      description: item?.description ?? '',
      parentCategoryId: parentId != null ? Number(parentId) : null,
      subCategoryId:
        categoryId != null && Number(categoryId) !== Number(parentId)
          ? Number(categoryId)
          : null,
      image: item?.image ?? '',
      unitOfMeasure: item?.unitOfMeasure || 'each',
      lastUnitOfMeasure: item?.lastUnitOfMeasure || '',
      lastUnitValue: item?.lastUnitValue ?? null,
      stockAtHand: item?.stockAtHand ?? 0,
      sellingPrice: item?.sellingPrice ?? 0,
      costPrice: item?.costPrice ?? 0,
      reOrderLevel: item?.reOrderLevel ?? null,
      reOrderTo: item?.reOrderTo ?? null,
      unitSellingModelId: item?.unitSellingModelId ?? null,
      useUnitSellingModel: item?.useUnitSellingModel !== false,
      dosage: item?.dosage ?? null,
      dosageUnit: item?.dosageUnit ?? '',
      frequency: item?.frequency ?? null,
      frequencyUnit: item?.frequencyUnit ?? '',
      duration: item?.duration ?? null,
      durationUnit: item?.durationUnit ?? '',
      route: item?.route ?? '',
    };
    this.showForm = true;
    document.body.style.overflow = 'hidden';
    this.loadCategories();
    this.loadLowestPackages();
  }

  closeForm(): void {
    this.showForm = false;
    this.isSaving = false;
    document.body.style.overflow = 'auto';
  }

  onParentCategoryChange(): void {
    this.form.subCategoryId = null;
    if (!this.isDrugCategory) {
      this.clearDrugFields();
    }
  }

  onParentCategorySelected(value: any): void {
    const next =
      value == null || value === ''
        ? null
        : Number(value);
    this.form = {
      ...this.form,
      parentCategoryId: Number.isFinite(next as number) ? next : null,
      subCategoryId: null,
    };
    if (!this.isDrugCategory) {
      this.clearDrugFields();
    }
  }

  addParentCategory(name: string): void {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      return;
    }
    const existing = this.findCategoryByName(this.parentCategories, trimmed);
    if (existing) {
      this.form.parentCategoryId = Number(existing.id);
      this.onParentCategoryChange();
      this.flash('Category already exists — selected.', false);
      return;
    }
    this.isAddingParentCategory = true;
    this.api.addItemCategoryBusinessItem({ name: trimmed }).subscribe({
      next: (res: any) => {
        this.isAddingParentCategory = false;
        const createdId = this.resolveCreatedId(res);
        this.loadCategories(() => {
          if (createdId != null) {
            this.form.parentCategoryId = createdId;
            this.onParentCategoryChange();
          } else {
            const created = this.findCategoryByName(this.parentCategories, trimmed);
            if (created) {
              this.form.parentCategoryId = Number(created.id);
              this.onParentCategoryChange();
            }
          }
        });
        this.flash(res?.message || 'Parent category added.', false);
      },
      error: (err: any) => {
        this.isAddingParentCategory = false;
        const message = String(err?.error?.message || 'Could not create parent category.');
        if (/already exists/i.test(message)) {
          this.loadCategories(() => {
            const created = this.findCategoryByName(this.parentCategories, trimmed);
            if (created) {
              this.form.parentCategoryId = Number(created.id);
              this.onParentCategoryChange();
              this.flash('Category already exists — selected.', false);
              return;
            }
            this.flash(message, true);
          });
          return;
        }
        this.flash(message, true);
      },
    });
  }

  addSubCategory(name: string): void {
    const parentId = Number(this.form.parentCategoryId);
    const trimmed = String(name || '').trim();
    if (!Number.isFinite(parentId) || parentId <= 0) {
      this.flash('Select parent category first.', true);
      return;
    }
    if (!trimmed) {
      return;
    }
    const existing = this.findCategoryByName(this.subCategories, trimmed);
    if (existing) {
      this.form.subCategoryId = Number(existing.id);
      this.flash('Sub category already exists — selected.', false);
      return;
    }
    this.isAddingSubCategory = true;
    this.api.addItemCategoryBusinessItem({ name: trimmed, parentId }).subscribe({
      next: (res: any) => {
        this.isAddingSubCategory = false;
        const createdId = this.resolveCreatedId(res);
        this.loadCategories(() => {
          if (createdId != null) {
            this.form.subCategoryId = createdId;
          } else {
            const created = this.findCategoryByName(this.subCategories, trimmed);
            if (created) {
              this.form.subCategoryId = Number(created.id);
            }
          }
        });
        this.flash(res?.message || 'Sub category added.', false);
      },
      error: (err: any) => {
        this.isAddingSubCategory = false;
        const message = String(err?.error?.message || 'Could not create sub category.');
        if (/already exists/i.test(message)) {
          this.loadCategories(() => {
            const created = this.findCategoryByName(this.subCategories, trimmed);
            if (created) {
              this.form.subCategoryId = Number(created.id);
              this.flash('Sub category already exists — selected.', false);
              return;
            }
            this.flash(message, true);
          });
          return;
        }
        this.flash(message, true);
      },
    });
  }

  addUnitOfMeasure(name: string): void {
    this.createLowestPackageOption(name, (value) => {
      this.ensureStringOption(this.unitOptions, value);
      this.form.unitOfMeasure = value;
    }, 'isAddingUnitOfMeasure');
  }

  addLastUnitOfMeasure(name: string): void {
    this.createLowestPackageOption(name, (value) => {
      this.ensureStringOption(this.lastUnitOptions, value);
      this.form.lastUnitOfMeasure = value;
    }, 'isAddingLastUnitOfMeasure');
  }

  addDosageUnit(name: string): void {
    this.addLocalOption(name, this.dosageUnitOptions, (value) => (this.form.dosageUnit = value), 'isAddingDosageUnit');
  }

  addFrequencyUnit(name: string): void {
    this.addLocalOption(name, this.frequencyUnitOptions, (value) => (this.form.frequencyUnit = value), 'isAddingFrequencyUnit');
  }

  addDurationUnit(name: string): void {
    this.addLocalOption(name, this.durationUnitOptions, (value) => (this.form.durationUnit = value), 'isAddingDurationUnit');
  }

  addRoute(name: string): void {
    this.addLocalOption(name, this.routeOptions, (value) => (this.form.route = value), 'isAddingRoute');
  }

  saveItem(_form: NgForm): void {
    const title = String(this.form.title || '').trim();
    if (!title) {
      this.flash('Item name is required.', true);
      return;
    }
    const payload = this.buildPayload();
    const wasCreate = !this.form.id;
    this.isSaving = true;
    const request$ = wasCreate
      ? this.api.saveItem(payload)
      : this.api.updateItemById(this.form.id, payload);
    request$.subscribe({
      next: (res: any) => {
        const savedId = Number(res?.data?.id ?? res?.data ?? this.form.id);
        if (Number.isFinite(savedId) && savedId > 0) {
          this.form.id = savedId;
        }
        this.isSaving = false;
        this.flash(res?.message || (wasCreate ? 'Item added.' : 'Item saved.'), false);
        this.loadItems();
        if (!wasCreate) {
          this.closeForm();
        }
      },
      error: (err: any) => {
        this.isSaving = false;
        this.flash(err?.error?.message || 'Could not save item.', true);
      },
    });
  }

  confirmDelete(item: any): void {
    this.deletingItem = item;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletingItem = null;
  }

  deleteItem(): void {
    const id = this.deletingItem?.id;
    if (id == null) {
      return;
    }
    this.api.deleteItemById(id).subscribe({
      next: () => {
        this.flash('Item deleted.', false);
        this.cancelDelete();
        this.loadItems();
      },
      error: (err: any) => {
        this.flash(err?.error?.message || 'Could not delete item.', true);
      },
    });
  }

  parentCategoryLabel(item: any): string {
    if (item?.parentCategoryName) {
      return String(item.parentCategoryName);
    }
    if (item?.parentCategory?.name) {
      return String(item.parentCategory.name);
    }
    if (item?.category?.parent?.name) {
      return String(item.category.parent.name);
    }
    const parentId =
      item?.parentCategoryId ??
      item?.category?.parentId ??
      item?.category?.parent_id ??
      item?.category?.parent?.id ??
      null;
    if (parentId != null) {
      const match = (this.categories || []).find((c) => Number(c.id) === Number(parentId));
      if (match?.name) {
        return String(match.name);
      }
    }
    // If category itself is a root, treat it as the parent category.
    const categoryId = item?.categoryId ?? item?.category?.id ?? null;
    if (categoryId != null) {
      const cat = (this.categories || []).find((c) => Number(c.id) === Number(categoryId));
      if (cat && this.isRootCategory(cat) && cat.name) {
        return String(cat.name);
      }
      if (cat) {
        const rootId = this.getCategoryParentId(cat);
        const root = (this.categories || []).find((c) => Number(c.id) === Number(rootId));
        if (root?.name) {
          return String(root.name);
        }
      }
    }
    return '—';
  }

  categoryLabel(item: any): string {
    if (item?.categoryName) {
      return String(item.categoryName);
    }
    if (item?.category?.name) {
      return String(item.category.name);
    }
    if (typeof item?.category === 'string' && item.category.trim()) {
      return item.category;
    }
    if (item?.subCategory) {
      return String(item.subCategory);
    }
    return '—';
  }

  private createLowestPackageOption(
    name: string,
    onSuccess: (value: string) => void,
    loadingFlag: 'isAddingUnitOfMeasure' | 'isAddingLastUnitOfMeasure'
  ): void {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      return;
    }
    this[loadingFlag] = true;
    this.api
      .addLowestPackageBusinessItem({
        title: trimmed,
        standardAbbreviation: trimmed.slice(0, 8),
        description: '',
      })
      .subscribe({
        next: (res: any) => {
          this[loadingFlag] = false;
          this.loadLowestPackages();
          onSuccess(trimmed);
          this.flash(res?.message || 'Unit added.', false);
        },
        error: (err: any) => {
          this[loadingFlag] = false;
          this.flash(err?.error?.message || 'Could not add unit.', true);
        },
      });
  }

  private addLocalOption(
    name: string,
    target: string[],
    onSuccess: (value: string) => void,
    loadingFlag:
      | 'isAddingDosageUnit'
      | 'isAddingFrequencyUnit'
      | 'isAddingDurationUnit'
      | 'isAddingRoute'
  ): void {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      return;
    }
    this[loadingFlag] = true;
    this.ensureStringOption(target, trimmed);
    onSuccess(trimmed);
    this[loadingFlag] = false;
    this.flash('Option added.', false);
  }

  private refreshUnitOptionsFromItems(): void {
    for (const item of this.items || []) {
      this.ensureStringOption(this.unitOptions, item?.unitOfMeasure);
      this.ensureStringOption(this.lastUnitOptions, item?.lastUnitOfMeasure);
      this.ensureStringOption(this.dosageUnitOptions, item?.dosageUnit);
      this.ensureStringOption(this.frequencyUnitOptions, item?.frequencyUnit);
      this.ensureStringOption(this.durationUnitOptions, item?.durationUnit);
      this.ensureStringOption(this.routeOptions, item?.route);
    }
  }

  private refreshUnitOptionsFromPackages(): void {
    for (const pkg of this.lowestPackages || []) {
      const title = String(pkg?.title ?? pkg?.name ?? '').trim();
      if (title) {
        this.ensureStringOption(this.unitOptions, title);
        this.ensureStringOption(this.lastUnitOptions, title);
      }
    }
  }

  private ensureStringOption(list: string[], value: any): void {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
      return;
    }
    if (!list.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) {
      list.push(trimmed);
    }
  }

  private normalizeList(res: any): any[] {
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

  private findCategoryByName(list: any[], name: string): any | null {
    const needle = String(name || '').trim().toLowerCase();
    if (!needle) {
      return null;
    }
    return (
      (list || []).find((c) => String(c?.name || '').trim().toLowerCase() === needle) || null
    );
  }

  private getCategoryParentId(c: any): number | null {
    const raw = c?.parent?.id ?? c?.parentId ?? c?.parent_id;
    if (raw == null || raw === '') {
      return null;
    }
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private resolveCreatedId(res: any): number | null {
    const id = Number(
      res?.data?.id ?? res?.result?.data?.id ?? res?.id ?? res?.data ?? null
    );
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private isRootCategory(c: any): boolean {
    return this.getCategoryParentId(c) == null;
  }

  private buildPayload(): any {
    const parent = this.parentCategories.find(
      (c) => Number(c.id) === Number(this.form.parentCategoryId)
    );
    const sub = this.subCategories.find(
      (c) => Number(c.id) === Number(this.form.subCategoryId)
    );
    const drug = this.isDrugCategory;
    return {
      title: String(this.form.title || '').trim(),
      description: this.form.description || '',
      parentCategoryId: this.form.parentCategoryId || null,
      categoryId: this.form.subCategoryId || this.form.parentCategoryId || null,
      subCategory: sub?.name || parent?.name || '',
      image: this.form.image || '',
      unitOfMeasure: this.form.unitOfMeasure || '',
      lastUnitOfMeasure: this.form.lastUnitOfMeasure || '',
      lastUnitValue: this.form.lastUnitValue,
      stockAtHand: this.form.stockAtHand ?? 0,
      sellingPrice: this.form.sellingPrice ?? 0,
      costPrice: this.form.costPrice ?? 0,
      reOrderLevel: this.form.reOrderLevel,
      reOrderTo: this.form.reOrderTo,
      unitSellingModelId: this.form.useUnitSellingModel === false ? null : this.form.unitSellingModelId,
      useUnitSellingModel: this.form.useUnitSellingModel !== false,
      dosage: drug ? this.form.dosage : null,
      dosageUnit: drug ? this.form.dosageUnit : '',
      frequency: drug ? this.form.frequency : null,
      frequencyUnit: drug ? this.form.frequencyUnit : '',
      duration: drug ? this.form.duration : null,
      durationUnit: drug ? this.form.durationUnit : '',
      route: drug ? this.form.route : '',
    };
  }

  private emptyForm(): any {
    return {
      id: null,
      title: '',
      description: '',
      parentCategoryId: null,
      subCategoryId: null,
      image: '',
      unitOfMeasure: 'each',
      lastUnitOfMeasure: '',
      lastUnitValue: null,
      stockAtHand: 0,
      sellingPrice: 0,
      costPrice: 0,
      reOrderLevel: null,
      reOrderTo: null,
      unitSellingModelId: null,
      useUnitSellingModel: true,
      dosage: null,
      dosageUnit: '',
      frequency: null,
      frequencyUnit: '',
      duration: null,
      durationUnit: '',
      route: '',
    };
  }

  private clearDrugFields(): void {
    this.form.dosage = null;
    this.form.dosageUnit = '';
    this.form.frequency = null;
    this.form.frequencyUnit = '';
    this.form.duration = null;
    this.form.durationUnit = '';
    this.form.route = '';
  }

  private flash(message: string, isError: boolean): void {
    this.responseMessage = message;
    this.responseColor = isError ? '#dc2626' : 'rgb(11, 155, 112)';
    this.showFeedback = true;
    setTimeout(() => (this.showFeedback = false), isError ? 5000 : 4000);
  }
}
