import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-department-setup',
  templateUrl: './department-setup.component.html',
  styleUrls: ['./department-setup.component.css']
})
export class DepartmentSetupComponent implements OnInit {
  isDarkMode = false;
  searchQuery = '';
  statusFilter = '';
  isLoading = false;
  isSaving = false;
  responseMessage = '';
  responseError = '';

  totalDepartments = 0;
  activeDepartments = 0;

  modules: any[] = [];
  clinics: any[] = [];
  roles: any[] = [];

  showModuleModal = false;
  showClinicModal = false;
  editingModule: any = null;
  editingClinic: any = null;

  moduleForm = {
    code: '',
    name: '',
    description: '',
    active: true,
    sortOrder: null as number | null,
    routeKey: '',
    allowedRoles: [] as string[]
  };

  clinicForm = {
    hospitalModuleId: null as number | null,
    name: '',
    active: true,
    allowedRoles: [] as string[]
  };

  get filteredItems(): any[] {
    return this.modules.filter(item => {
      const q = this.searchQuery.trim().toLowerCase();
      const matchesSearch = !q ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.code || '').toLowerCase().includes(q);
      const matchesStatus =
        !this.statusFilter ||
        (this.statusFilter === 'active' && item.active) ||
        (this.statusFilter === 'inactive' && !item.active);
      return matchesSearch && matchesStatus;
    });
  }

  constructor(
    private router: Router,
    private api: ApiService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    if (!sessionStorage.getItem('username')) {
      this.router.navigate(['/login']);
      return;
    }
    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
    this.loadRoles();
    this.loadModules();
    this.loadClinics();
  }

  loadRoles(): void {
    this.api.getAllRoles().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : [];
        this.roles = raw
          .map((r: any) => (typeof r === 'string' ? r : r?.name))
          .filter(Boolean)
          .map((r: string) => String(r).trim())
          .filter((r: string) => r.length > 0);
      },
      error: () => {
        this.roles = [];
      },
    });
  }

  private rolesCsvToArray(csv: any): string[] {
    if (!csv || typeof csv !== 'string') {
      return [];
    }
    return csv
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  }

  private rolesArrayToCsv(arr: any): string | null {
    if (!Array.isArray(arr) || arr.length === 0) {
      return null;
    }
    const normalized = Array.from(
      new Set(arr.map((x: any) => String(x).trim().toLowerCase()).filter(Boolean))
    );
    return normalized.length ? normalized.join(',') : null;
  }

  toggleModuleRole(role: string, checked: boolean): void {
    if (!role) {
      return;
    }
    const current = Array.isArray(this.moduleForm.allowedRoles) ? this.moduleForm.allowedRoles : [];
    this.moduleForm.allowedRoles = checked
      ? Array.from(new Set([...current, role]))
      : current.filter((r) => r !== role);
  }

  toggleClinicRole(role: string, checked: boolean): void {
    if (!role) {
      return;
    }
    const current = Array.isArray(this.clinicForm.allowedRoles) ? this.clinicForm.allowedRoles : [];
    this.clinicForm.allowedRoles = checked
      ? Array.from(new Set([...current, role]))
      : current.filter((r) => r !== role);
  }

  loadModules(): void {
    this.isLoading = true;
    this.api.getAllBusinessModules().subscribe({
      next: (res: any) => {
        this.modules = Array.isArray(res) ? res : [];
        this.totalDepartments = this.modules.length;
        this.activeDepartments = this.modules.filter(m => m.active).length;
        this.isLoading = false;
      },
      error: () => {
        this.modules = [];
        this.isLoading = false;
      }
    });
  }

  loadClinics(): void {
    this.api.getBusinessClinics().subscribe({
      next: (res: any) => {
        this.clinics = Array.isArray(res) ? res : [];
      },
      error: () => {
        this.clinics = [];
      }
    });
  }

  clinicsForModule(moduleId: number): any[] {
    return this.clinics.filter(c => c.hospitalModuleId === moduleId);
  }

  createNew(): void {
    this.editingModule = null;
    this.moduleForm = {
      code: '',
      name: '',
      description: '',
      active: true,
      sortOrder: null,
      routeKey: '',
      allowedRoles: []
    };
    this.showModuleModal = true;
    this.responseMessage = '';
    this.responseError = '';
  }

  editItem(item: any): void {
    this.editingModule = item;
    this.moduleForm = {
      code: item.code || '',
      name: item.name || '',
      description: item.description || '',
      active: item.active !== false,
      sortOrder: item.sortOrder ?? null,
      routeKey: item.routeKey || '',
      allowedRoles: this.rolesCsvToArray(item.allowedRoles)
    };
    this.showModuleModal = true;
  }

  saveModule(): void {
    if (!this.moduleForm.name.trim()) {
      this.responseError = 'Department name is required';
      return;
    }
    this.isSaving = true;
    this.responseError = '';
    const payload: any = {
      ...this.moduleForm,
      allowedRoles: this.rolesArrayToCsv(this.moduleForm.allowedRoles),
    };
    const req = this.editingModule
      ? this.api.updateBusinessModule(this.editingModule.id, payload)
      : this.api.createBusinessModule(payload);

    req.subscribe({
      next: () => {
        this.isSaving = false;
        this.showModuleModal = false;
        this.responseMessage = 'Department saved';
        this.loadModules();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.responseError = err?.error?.message || 'Failed to save department';
      }
    });
  }

  deleteModule(item: any): void {
    if (!confirm(`Delete department "${item.name}"?`)) {
      return;
    }
    this.api.deleteBusinessModule(item.id).subscribe({
      next: () => {
        this.loadModules();
        this.loadClinics();
      },
      error: (err: any) => {
        alert(err?.error?.message || 'Could not delete department');
      }
    });
  }

  openClinicModal(module: any): void {
    this.editingClinic = null;
    this.clinicForm = {
      hospitalModuleId: module.id,
      name: '',
      active: true,
      allowedRoles: []
    };
    this.showClinicModal = true;
    this.responseError = '';
  }

  editClinic(clinic: any): void {
    this.editingClinic = clinic;
    this.clinicForm = {
      hospitalModuleId: clinic.hospitalModuleId,
      name: clinic.name || '',
      active: clinic.active !== false,
      allowedRoles: this.rolesCsvToArray(clinic.allowedRoles)
    };
    this.showClinicModal = true;
  }

  saveClinic(): void {
    if (!this.clinicForm.hospitalModuleId || !this.clinicForm.name.trim()) {
      this.responseError = 'Department and room/clinic name are required';
      return;
    }
    this.isSaving = true;
    const clinicPayload: any = {
      ...this.clinicForm,
      allowedRoles: this.rolesArrayToCsv(this.clinicForm.allowedRoles),
    };
    const req = this.editingClinic
      ? this.api.updateBusinessClinic(this.editingClinic.id, clinicPayload)
      : this.api.createBusinessClinic(clinicPayload as { hospitalModuleId: number; name: string; active?: boolean; allowedRoles?: string | null });

    req.subscribe({
      next: () => {
        this.isSaving = false;
        this.showClinicModal = false;
        this.loadClinics();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.responseError = err?.error?.message || 'Failed to save room/clinic';
      }
    });
  }

  deleteClinic(clinic: any): void {
    if (!confirm(`Delete room "${clinic.name}"?`)) {
      return;
    }
    this.api.deleteBusinessClinic(clinic.id).subscribe({
      next: () => this.loadClinics(),
      error: (err: any) => alert(err?.error?.message || 'Could not delete room')
    });
  }

  closeModals(): void {
    this.showModuleModal = false;
    this.showClinicModal = false;
  }
}
