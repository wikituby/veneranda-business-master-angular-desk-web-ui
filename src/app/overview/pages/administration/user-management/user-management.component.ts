import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { defaultContactValue } from '../../../../utils/phone-contact.util';
import {
  getSecondaryRoles,
  rolesToCsv,
  userHasAnyRole,
} from '../../../../utils/user-roles.util';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  isDarkMode = false;
  searchQuery = '';
  statusFilter = '';
  roleFilter = '';
  currentPage = 1;
  itemsPerPage = 10;

  usersList: any[] = [];
  rolesList: string[] = [];
  rolesLoading = false;
  isLoading = false;
  isSaving = false;
  isCreating = false;
  isResettingPassword = false;
  responseMessage = '';
  responseColor = '';

  showEditModal = false;
  showCreateModal = false;

  /** Field picker popup: 'create' | 'edit' | null */
  activeRolePicker: 'create' | 'edit' | null = null;
  activeStatusPicker: 'create' | 'edit' | null = null;
  rolePickerDropUp: Record<'create' | 'edit', boolean> = { create: false, edit: false };
  statusPickerDropUp: Record<'create' | 'edit', boolean> = { create: false, edit: false };
  rolePickerMenuStyle: Partial<Record<'create' | 'edit', Record<string, string>>> = {};
  statusPickerMenuStyle: Partial<Record<'create' | 'edit', Record<string, string>>> = {};
  private pickerScrollListener: (() => void) | null = null;
  rolePickerSearch = '';
  showNewRoleModal = false;
  newRoleModalContext: 'create' | 'edit' | null = null;
  newRoleName = '';
  showEditRoleModal = false;
  editRoleModalContext: 'create' | 'edit' | null = null;
  editRoleOriginalName = '';
  editRoleNewName = '';
  isRoleActionInProgress = false;
  businessModules: any[] = [];
  hospitalClinics: any[] = [];
  editForm = {
    id: null as number | null,
    username: '',
    email: '',
    role: '',
    secondaryRoles: [] as string[],
    status: 'active',
    contact: defaultContactValue(),
    assignedModuleIds: [] as number[],
    assignedClinicIds: [] as number[]
  };

  readonly defaultPassword = 'password123';
  createForm = {
    username: '',
    email: '',
    password: this.defaultPassword,
    contact: defaultContactValue(),
    role: '',
    secondaryRoles: [] as string[],
    status: 'active'
  };

  readonly statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'onleave', label: 'On Leave' }
  ];

  private readonly defaultRoles = [
    'md', 'MD', 'admin', 'ADMIN', 'sono', 'lab', 'clinician', 'doctor', 'customer', 'agent'
  ];

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    const userName = sessionStorage.getItem('username');

    if (!userName) {
      this.router.navigate(['/login4']);
      return;
    }

    if (!this.canManageUsers()) {
      this.router.navigate(['/overview']);
      return;
    }

    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    this.loadRoles();
    this.loadUsers();
    this.loadHospitalDirectory();
  }

  ngOnDestroy(): void {
    this.detachPickerScrollListener();
  }

  loadHospitalDirectory(): void {
    this.api.getAllBusinessModules().subscribe({
      next: (res: any) => {
        this.businessModules = (Array.isArray(res) ? res : [])
          .filter((m: any) => m.active !== false)
          .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.name).localeCompare(String(b.name)));
      },
      error: () => {
        this.businessModules = [];
      }
    });
    this.api.getBusinessClinics().subscribe({
      next: (res: any) => {
        this.hospitalClinics = (Array.isArray(res) ? res : []).filter((c: any) => c.active !== false);
      },
      error: () => {
        this.hospitalClinics = [];
      }
    });
  }

  clinicsForModule(moduleId: number): any[] {
    return this.hospitalClinics.filter(c => c.hospitalModuleId === moduleId);
  }

  isModuleAssigned(moduleId: number): boolean {
    return this.editForm.assignedModuleIds.includes(moduleId);
  }

  isClinicAssigned(clinicId: number): boolean {
    return this.editForm.assignedClinicIds.includes(clinicId);
  }

  toggleModuleAssignment(moduleId: number, checked: boolean): void {
    if (checked) {
      if (!this.editForm.assignedModuleIds.includes(moduleId)) {
        this.editForm.assignedModuleIds = [...this.editForm.assignedModuleIds, moduleId];
      }
      return;
    }
    this.editForm.assignedModuleIds = this.editForm.assignedModuleIds.filter(id => id !== moduleId);
    const clinicIds = this.clinicsForModule(moduleId).map(c => c.id);
    this.editForm.assignedClinicIds = this.editForm.assignedClinicIds.filter(id => !clinicIds.includes(id));
  }

  toggleClinicAssignment(clinicId: number, checked: boolean): void {
    if (checked) {
      if (!this.editForm.assignedClinicIds.includes(clinicId)) {
        this.editForm.assignedClinicIds = [...this.editForm.assignedClinicIds, clinicId];
      }
      return;
    }
    this.editForm.assignedClinicIds = this.editForm.assignedClinicIds.filter(id => id !== clinicId);
  }

  get assignedDepartmentCount(): number {
    return this.editForm.assignedModuleIds.length;
  }

  get assignedRoomCount(): number {
    return this.editForm.assignedClinicIds.length;
  }

  loadUsers(): void {
    this.isLoading = true;
    this.api.getAllUsers().subscribe({
      next: (response: any) => {
        this.applyUsersList(response);
        this.isLoading = false;
      },
      error: () => {
        this.usersList = [];
        this.syncPagination();
        this.isLoading = false;
        this.showFeedback('Failed to load users', 'error');
      }
    });
  }

  private applyUsersList(response: any): void {
    this.usersList = this.normalizeUsersResponse(response)
      .sort((a: any, b: any) => (b?.id ?? 0) - (a?.id ?? 0));
    this.syncPagination();
  }

  private normalizeUsersResponse(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    return [];
  }

  loadRoles(fresh = false): void {
    if (fresh) {
      this.rolesLoading = true;
    }
    this.api.getAllRoles().subscribe({
      next: (response: any) => {
        this.applyRolesResponse(response);
        this.rolesLoading = false;
      },
      error: () => {
        if (!this.rolesList.length) {
          this.rolesList = [...this.defaultRoles];
        }
        this.rolesLoading = false;
      }
    });
  }

  private applyRolesResponse(response: any): void {
    const fromApi = this.normalizeRolesResponse(response);
    this.rolesList = fromApi.length ? fromApi : [...this.defaultRoles];
  }

  private applyRolesFromMutationResponse(response: any): void {
    const payload = response?.data ?? response;
    this.applyRolesResponse(payload);
    this.loadUsers();
  }

  get filteredItems(): any[] {
    return this.usersList.filter(user => {
      const status = this.getUserStatus(user);
      const search = this.searchQuery.trim().toLowerCase();
      const matchesSearch = !search ||
        (user.username || '').toLowerCase().includes(search) ||
        (user.email || '').toLowerCase().includes(search) ||
        (user.role || '').toLowerCase().includes(search) ||
        getSecondaryRoles(user).some((r) => r.toLowerCase().includes(search)) ||
        (user.contact || '').toLowerCase().includes(search);
      const matchesStatus = !this.statusFilter || status === this.statusFilter;
      const matchesRole = !this.roleFilter ||
        (user.role || '').toLowerCase() === this.roleFilter.toLowerCase() ||
        getSecondaryRoles(user).some((r) => r.toLowerCase() === this.roleFilter.toLowerCase());
      return matchesSearch && matchesStatus && matchesRole;
    });
  }

  get paginatedItems(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredItems.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredItems.length / this.itemsPerPage));
  }

  getUserStatus(user: any): string {
    if (user?.status) {
      return String(user.status).toLowerCase();
    }
    if (user?.isActive !== undefined) {
      return user.isActive ? 'active' : 'inactive';
    }
    return 'active';
  }

  formatDisplayName(name: string | null | undefined): string {
    if (!name?.trim()) {
      return 'N/A';
    }
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  getUserDisplayName(user: any): string {
    return user?.username || user?.email || 'Unknown user';
  }

  getUserInitials(user: any): string {
    const username = (user?.username || '').trim();
    const email = (user?.email || '').trim();
    const source = username || email.split('@')[0] || '?';
    const parts = source.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (source.length >= 2) {
      return source.substring(0, 2).toUpperCase();
    }
    return source.substring(0, 1).toUpperCase();
  }

  getAvatarColor(user: any): string {
    const key = String(user?.id ?? user?.username ?? user?.email ?? '');
    const colors = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#06b6d4', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getProfilePic(user: any): string | null {
    const pic = user?.profilePic;
    return pic && String(pic).trim() ? String(pic) : null;
  }

  openCreateModal(): void {
    this.createForm = {
      username: '',
      email: '',
      password: this.defaultPassword,
      contact: defaultContactValue(),
      role: '',
      secondaryRoles: [],
      status: 'active'
    };
    this.resetRolePicker();
    this.responseMessage = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.isCreating = false;
    this.resetRolePicker();
  }

  saveNewUser(form: NgForm): void {
    if (!this.createForm.role?.trim()) {
      this.showFeedback('Select or add a role.', 'error');
      return;
    }
    if (form.invalid) {
      return;
    }

    this.isCreating = true;
    const createData = {
      username: this.createForm.username.trim(),
      email: this.createForm.email.trim(),
      password: this.createForm.password,
      contact: this.createForm.contact.trim(),
      role: this.createForm.role,
      secondaryRoles: this.secondaryRolesCsv(this.createForm.secondaryRoles, this.createForm.role),
      status: this.createForm.status,
      // Dashboard only until MD grants pages in Access Control (admin/md stay unrestricted).
      allowedPageRoutes:
        ['admin', 'md'].includes(String(this.createForm.role || '').toLowerCase().trim())
          ? '*'
          : 'main-dashboard',
    };

    this.api.createUser(createData).subscribe({
      next: (response: any) => {
        this.isCreating = false;
        this.applyUsersList(response?.data ?? response);
        this.searchQuery = '';
        this.statusFilter = '';
        this.roleFilter = '';
        this.currentPage = 1;
        this.showFeedback(response?.message || 'User created successfully', 'success');
        this.closeCreateModal();
      },
      error: (error: any) => {
        this.isCreating = false;
        this.showFeedback(this.extractApiError(error, 'Failed to create user'), 'error');
      }
    });
  }

  openEditModal(user: any): void {
    this.editForm = {
      id: user.id,
      username: user.username || '',
      email: user.email || '',
      role: user.role || '',
      secondaryRoles: getSecondaryRoles(user),
      status: this.getUserStatus(user),
      contact: user.contact?.trim() || defaultContactValue(),
      assignedModuleIds: this.parseIdCsv(user.assignedModuleIds),
      assignedClinicIds: this.parseIdCsv(user.assignedClinicIds)
    };
    this.ensureRoleInList(this.editForm.role);
    this.editForm.secondaryRoles.forEach((role) => this.ensureRoleInList(role));
    this.resetRolePicker();
    this.responseMessage = '';
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.isSaving = false;
    this.isResettingPassword = false;
    this.resetRolePicker();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showNewRoleModal || this.showEditRoleModal) {
      return;
    }
    if (this.activeRolePicker) {
      this.closeRolePicker();
    }
    if (this.activeStatusPicker) {
      this.closeStatusPicker();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.repositionOpenPickers();
  }

  isRolePickerOpen(context: 'create' | 'edit'): boolean {
    return this.activeRolePicker === context;
  }

  toggleRolePicker(context: 'create' | 'edit', event: Event): void {
    event.stopPropagation();
    if (this.activeRolePicker === context) {
      this.closeRolePicker();
      return;
    }
    this.closeStatusPicker();
    this.activeRolePicker = context;
    this.rolePickerSearch = '';
    this.schedulePickerPlacement('role', context);
  }

  closeRolePicker(): void {
    if (this.activeRolePicker) {
      delete this.rolePickerMenuStyle[this.activeRolePicker];
      this.rolePickerDropUp[this.activeRolePicker] = false;
    }
    this.activeRolePicker = null;
    this.rolePickerSearch = '';
    this.detachPickerScrollListener();
  }

  resetRolePicker(): void {
    this.closeRolePicker();
    this.closeStatusPicker();
    this.closeNewRoleModal();
    this.closeEditRoleModal();
  }

  isStatusPickerOpen(context: 'create' | 'edit'): boolean {
    return this.activeStatusPicker === context;
  }

  toggleStatusPicker(context: 'create' | 'edit', event: Event): void {
    event.stopPropagation();
    if (this.activeStatusPicker === context) {
      this.closeStatusPicker();
      return;
    }
    this.closeRolePicker();
    this.activeStatusPicker = context;
    this.schedulePickerPlacement('status', context);
  }

  closeStatusPicker(): void {
    if (this.activeStatusPicker) {
      delete this.statusPickerMenuStyle[this.activeStatusPicker];
      this.statusPickerDropUp[this.activeStatusPicker] = false;
    }
    this.activeStatusPicker = null;
    this.detachPickerScrollListener();
  }

  selectedStatusLabel(context: 'create' | 'edit'): string {
    const value = context === 'create' ? this.createForm.status : this.editForm.status;
    const option = this.statusOptions.find((o) => o.value === value);
    return option?.label ?? 'Select status';
  }

  selectStatus(context: 'create' | 'edit', value: string, event?: Event): void {
    event?.stopPropagation();
    if (context === 'create') {
      this.createForm.status = value;
    } else {
      this.editForm.status = value;
    }
    this.closeStatusPicker();
  }

  private schedulePickerPlacement(kind: 'role' | 'status', context: 'create' | 'edit'): void {
    setTimeout(() => {
      this.positionPickerMenu(kind, context);
      requestAnimationFrame(() => this.positionPickerMenu(kind, context));
    }, 0);
    this.attachPickerScrollListener(kind, context);
  }

  private repositionOpenPickers(): void {
    if (this.activeRolePicker) {
      this.positionPickerMenu('role', this.activeRolePicker);
    }
    if (this.activeStatusPicker) {
      this.positionPickerMenu('status', this.activeStatusPicker);
    }
  }

  private attachPickerScrollListener(kind: 'role' | 'status', context: 'create' | 'edit'): void {
    this.detachPickerScrollListener();
    const body = document.querySelector('.user-modal-body');
    if (!body) {
      return;
    }
    this.pickerScrollListener = () => this.positionPickerMenu(kind, context);
    body.addEventListener('scroll', this.pickerScrollListener, { passive: true });
  }

  private detachPickerScrollListener(): void {
    if (!this.pickerScrollListener) {
      return;
    }
    const body = document.querySelector('.user-modal-body');
    body?.removeEventListener('scroll', this.pickerScrollListener);
    this.pickerScrollListener = null;
  }

  private positionPickerMenu(kind: 'role' | 'status', context: 'create' | 'edit'): void {
    const pickerClass = kind === 'role' ? 'um-role-picker' : 'um-status-picker';
    const picker = document.querySelector(
      `.${pickerClass}[data-context="${context}"]`
    ) as HTMLElement | null;
    if (!picker) {
      return;
    }
    const trigger = picker.querySelector('.um-field-picker-trigger') as HTMLElement | null;
    const menu = picker.querySelector('.um-field-picker-menu') as HTMLElement | null;
    if (!trigger || !menu) {
      return;
    }

    const gap = 4;
    const padding = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const estimatedHeight = kind === 'role' ? 280 : 140;
    const menuHeight = Math.max(menu.offsetHeight, menu.scrollHeight, estimatedHeight);
    const modal = trigger.closest('.user-modal') as HTMLElement | null;
    const boundary = modal?.getBoundingClientRect() ?? {
      top: padding,
      bottom: window.innerHeight - padding
    };

    const spaceBelow = boundary.bottom - triggerRect.bottom - padding;
    const spaceAbove = triggerRect.top - boundary.top - padding;
    const dropUp = spaceBelow < menuHeight + gap && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      120,
      Math.floor((dropUp ? spaceAbove : spaceBelow) - gap)
    );

    const styles: Record<string, string> = {
      position: 'fixed',
      left: `${triggerRect.left}px`,
      width: `${triggerRect.width}px`,
      zIndex: '2100',
      maxHeight: `${maxHeight}px`,
      overflow: 'hidden'
    };

    if (dropUp) {
      styles['bottom'] = `${window.innerHeight - triggerRect.top + gap}px`;
      styles['top'] = 'auto';
    } else {
      styles['top'] = `${triggerRect.bottom + gap}px`;
      styles['bottom'] = 'auto';
    }

    if (kind === 'role') {
      this.rolePickerDropUp[context] = dropUp;
      this.rolePickerMenuStyle[context] = styles;
    } else {
      this.statusPickerDropUp[context] = dropUp;
      this.statusPickerMenuStyle[context] = styles;
    }
  }

  get filteredRolesForPicker(): string[] {
    const q = this.rolePickerSearch.trim().toLowerCase();
    const list = [...this.rolesList];
    if (!q) {
      return list;
    }
    return list.filter((role) => role.toLowerCase().includes(q));
  }

  get roleSearchHasNoExactMatch(): boolean {
    const q = this.rolePickerSearch.trim();
    if (!q) {
      return false;
    }
    return !this.rolesList.some((r) => r.toLowerCase() === q.toLowerCase());
  }

  selectedRoleLabel(context: 'create' | 'edit'): string {
    const role = context === 'create' ? this.createForm.role : this.editForm.role;
    return role?.trim() ? role.trim() : 'Select role';
  }

  selectRole(context: 'create' | 'edit', role: string, event?: Event): void {
    event?.stopPropagation();
    const value = role.trim();
    if (!value) {
      return;
    }
    this.ensureRoleInList(value);
    if (context === 'create') {
      this.createForm.role = value;
      this.createForm.secondaryRoles = this.createForm.secondaryRoles.filter(
        (r) => r.toLowerCase() !== value.toLowerCase()
      );
    } else {
      this.editForm.role = value;
      this.editForm.secondaryRoles = this.editForm.secondaryRoles.filter(
        (r) => r.toLowerCase() !== value.toLowerCase()
      );
    }
    this.closeRolePicker();
  }

  isSecondaryRoleSelected(context: 'create' | 'edit', role: string): boolean {
    const list = context === 'create' ? this.createForm.secondaryRoles : this.editForm.secondaryRoles;
    return list.some((r) => r.toLowerCase() === role.toLowerCase());
  }

  toggleSecondaryRole(context: 'create' | 'edit', role: string): void {
    const value = (role || '').trim();
    if (!value) {
      return;
    }
    const primary = (context === 'create' ? this.createForm.role : this.editForm.role) || '';
    if (primary && primary.toLowerCase() === value.toLowerCase()) {
      this.showFeedback('That role is already the primary role.', 'error');
      return;
    }
    const list = context === 'create' ? this.createForm.secondaryRoles : this.editForm.secondaryRoles;
    const exists = list.some((r) => r.toLowerCase() === value.toLowerCase());
    const next = exists
      ? list.filter((r) => r.toLowerCase() !== value.toLowerCase())
      : [...list, value];
    if (context === 'create') {
      this.createForm.secondaryRoles = next;
    } else {
      this.editForm.secondaryRoles = next;
    }
  }

  secondaryRolesOf(user: any): string[] {
    return getSecondaryRoles(user);
  }

  private secondaryRolesCsv(roles: string[], primary: string): string {
    const primaryKey = (primary || '').trim().toLowerCase();
    return rolesToCsv(
      (roles || []).filter((role) => role && role.toLowerCase() !== primaryKey)
    );
  }

  openNewRoleModal(context: 'create' | 'edit', event: Event): void {
    event.stopPropagation();
    this.newRoleModalContext = context;
    this.newRoleName = this.rolePickerSearch.trim();
    this.showNewRoleModal = true;
    this.closeRolePicker();
  }

  closeNewRoleModal(): void {
    this.showNewRoleModal = false;
    this.newRoleModalContext = null;
    this.newRoleName = '';
  }

  saveNewRoleFromModal(): void {
    const context = this.newRoleModalContext;
    if (!context) {
      return;
    }
    const name = this.newRoleName.trim();
    if (!name) {
      this.showFeedback('Enter a role name.', 'error');
      return;
    }
    this.isRoleActionInProgress = true;
    this.api.createRole(name).subscribe({
      next: (response: any) => {
        this.isRoleActionInProgress = false;
        this.applyRolesFromMutationResponse(response);
        this.selectRole(context, name);
        this.closeNewRoleModal();
        this.showFeedback(response?.message || 'Role created.', 'success');
      },
      error: (error: any) => {
        this.isRoleActionInProgress = false;
        this.showFeedback(this.extractApiError(error, 'Failed to create role.'), 'error');
      }
    });
  }

  useSearchTextAsRole(context: 'create' | 'edit', event: Event): void {
    event.stopPropagation();
    const name = this.rolePickerSearch.trim();
    if (!name) {
      return;
    }
    if (this.rolesList.some((r) => r.toLowerCase() === name.toLowerCase())) {
      this.selectRole(context, name);
      return;
    }
    this.isRoleActionInProgress = true;
    this.api.createRole(name).subscribe({
      next: (response: any) => {
        this.isRoleActionInProgress = false;
        this.applyRolesFromMutationResponse(response);
        this.selectRole(context, name);
        this.showFeedback(response?.message || 'Role created.', 'success');
      },
      error: (error: any) => {
        this.isRoleActionInProgress = false;
        this.showFeedback(this.extractApiError(error, 'Failed to create role.'), 'error');
      }
    });
  }

  openEditRoleModal(role: string, context: 'create' | 'edit', event: Event): void {
    event.stopPropagation();
    this.editRoleModalContext = context;
    this.editRoleOriginalName = role;
    this.editRoleNewName = role;
    this.showEditRoleModal = true;
    this.closeRolePicker();
  }

  closeEditRoleModal(): void {
    this.showEditRoleModal = false;
    this.editRoleModalContext = null;
    this.editRoleOriginalName = '';
    this.editRoleNewName = '';
  }

  saveEditRoleFromModal(): void {
    const oldName = this.editRoleOriginalName.trim();
    const newName = this.editRoleNewName.trim();
    if (!oldName || !newName) {
      this.showFeedback('Enter a role name.', 'error');
      return;
    }
    if (oldName.toLowerCase() === newName.toLowerCase()) {
      this.closeEditRoleModal();
      return;
    }
    if (this.rolesList.some((r) => r.toLowerCase() === newName.toLowerCase())) {
      this.showFeedback('A role with that name already exists.', 'error');
      return;
    }
    this.isRoleActionInProgress = true;
    this.api.updateRoleName(oldName, newName).subscribe({
      next: (response: any) => {
        this.isRoleActionInProgress = false;
        this.applyRolesFromMutationResponse(response);
        this.applyRoleRenameLocal(oldName, newName);
        this.closeEditRoleModal();
        this.showFeedback(response?.message || `Role renamed to "${newName}".`, 'success');
      },
      error: (error: any) => {
        this.isRoleActionInProgress = false;
        this.showFeedback(this.extractApiError(error, 'Failed to update role.'), 'error');
      }
    });
  }

  deleteRole(role: string, context: 'create' | 'edit', event: Event): void {
    event.stopPropagation();
    const roleName = role.trim();
    if (!roleName) {
      return;
    }
    if (!confirm(`Remove role "${roleName}" from the list?`)) {
      return;
    }
    this.isRoleActionInProgress = true;
    this.api.deleteRole(roleName).subscribe({
      next: (response: any) => {
        this.isRoleActionInProgress = false;
        this.applyRolesFromMutationResponse(response);
        if (context === 'create' && this.createForm.role?.toLowerCase() === roleName.toLowerCase()) {
          this.createForm.role = '';
        }
        if (context === 'edit' && this.editForm.role?.toLowerCase() === roleName.toLowerCase()) {
          this.editForm.role = '';
        }
        if (this.roleFilter?.toLowerCase() === roleName.toLowerCase()) {
          this.roleFilter = '';
        }
        this.showFeedback(response?.message || `Role "${roleName}" removed.`, 'success');
      },
      error: (error: any) => {
        this.isRoleActionInProgress = false;
        this.showFeedback(this.extractApiError(error, 'Failed to delete role.'), 'error');
      }
    });
  }

  private applyRoleRenameLocal(oldName: string, newName: string): void {
    const oldKey = oldName.toLowerCase();
    if (this.createForm.role?.toLowerCase() === oldKey) {
      this.createForm.role = newName;
    }
    if (this.editForm.role?.toLowerCase() === oldKey) {
      this.editForm.role = newName;
    }
    if (this.roleFilter?.toLowerCase() === oldKey) {
      this.roleFilter = newName;
    }
  }

  private ensureRoleInList(role: string): void {
    const trimmed = (role || '').trim();
    if (!trimmed) {
      return;
    }
    const exists = this.rolesList.some((r) => r.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      this.rolesList = this.mergeRoleLists(this.rolesList, [trimmed]);
    }
  }

  saveUserChanges(form: NgForm): void {
    if (!this.editForm.role?.trim()) {
      this.showFeedback('Select or add a role.', 'error');
      return;
    }
    if (!this.editForm.id || form.invalid) {
      return;
    }

    this.isSaving = true;
    const updateData = {
      username: this.editForm.username,
      email: this.editForm.email,
      role: this.editForm.role,
      secondaryRoles: this.secondaryRolesCsv(this.editForm.secondaryRoles, this.editForm.role),
      status: this.editForm.status,
      contact: this.editForm.contact,
      assignedModuleIds: this.idsToCsv(this.editForm.assignedModuleIds),
      assignedClinicIds: this.idsToCsv(this.editForm.assignedClinicIds)
    };

    this.api.updateUser(this.editForm.id, updateData).subscribe({
      next: (response: any) => {
        this.isSaving = false;
        this.showFeedback(response?.message || 'User updated successfully', 'success');
        this.closeEditModal();
        this.loadUsers();
      },
      error: (error: any) => {
        this.isSaving = false;
        this.showFeedback(this.extractApiError(error, 'Failed to update user'), 'error');
      }
    });
  }

  resetPassword(): void {
    if (!this.editForm.id || this.isSaving || this.isResettingPassword) {
      return;
    }
    const confirmed = window.confirm(
      `Reset password for "${this.editForm.username || 'this user'}" to the default (password123)?`
    );
    if (!confirmed) {
      return;
    }

    this.isResettingPassword = true;
    this.api.updateUser(this.editForm.id, { password: this.defaultPassword }).subscribe({
      next: (response: any) => {
        this.isResettingPassword = false;
        this.showFeedback(response?.message || 'Password reset to password123', 'success');
      },
      error: (error: any) => {
        this.isResettingPassword = false;
        this.showFeedback(this.extractApiError(error, 'Failed to reset password'), 'error');
      }
    });
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  refreshList(): void {
    this.loadUsers();
  }

  private canManageUsers(): boolean {
    return userHasAnyRole(['md', 'admin']);
  }

  private syncPagination(): void {
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  private normalizeRolesResponse(response: any): string[] {
    if (!response) {
      return [];
    }
    if (Array.isArray(response)) {
      return response
        .map((item: unknown) => {
          if (typeof item === 'string') {
            return item;
          }
          const row = item as { name?: string; role?: string };
          return row?.name || row?.role || '';
        })
        .filter((name: string) => Boolean(name));
    }
    if (response.name != null) {
      const names: unknown[] = Array.isArray(response.name)
        ? response.name
        : typeof response.name === 'object'
          ? Object.values(response.name as Record<string, unknown>)
          : [response.name];
      return names
        .map((item: unknown) => (typeof item === 'string' ? item : String(item)))
        .filter((name: string) => Boolean(name));
    }
    return [];
  }

  private mergeRoleLists(...lists: string[][]): string[] {
    const merged = new Set<string>();
    lists.flat().forEach(role => {
      if (role) {
        merged.add(String(role));
      }
    });
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }

  private extractApiError(error: any, fallback: string): string {
    const body = error?.error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    return body?.error || body?.message || error?.message || fallback;
  }

  private showFeedback(message: string, type: 'success' | 'error'): void {
    this.responseMessage = message;
    this.responseColor = type === 'success' ? '#16a34a' : '#dc2626';
    setTimeout(() => {
      this.responseMessage = '';
    }, 4000);
  }

  private parseIdCsv(csv: any): number[] {
    if (!csv || typeof csv !== 'string') {
      return [];
    }
    return csv
      .split(',')
      .map((s: string) => Number(s.trim()))
      .filter((n: number) => !Number.isNaN(n));
  }

  private idsToCsv(ids: number[]): string {
    if (!ids.length) {
      return '';
    }
    return Array.from(new Set(ids)).join(',');
  }
}
