import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { SubscriptionService } from './subscription.service';

export interface AccessibleDepartment {
  id: number;
  name: string;
  code?: string;
}

export interface AccessibleRoom {
  id: number;
  name: string;
  hospitalModuleId?: number;
  hospitalModuleName?: string;
}

export interface WorkContextState {
  departments: AccessibleDepartment[];
  rooms: AccessibleRoom[];
}

@Injectable({ providedIn: 'root' })
export class ActiveRoomService {
  private accessibleDepartments: AccessibleDepartment[] = [];
  private allAccessibleRooms: AccessibleRoom[] = [];
  private accessibleRooms: AccessibleRoom[] = [];

  constructor(
    private api: ApiService,
    private subscription: SubscriptionService
  ) {}

  /** Load departments & rooms the user may work in; auto-select defaults. */
  initializeFromSession(): Observable<WorkContextState> {
    if (!this.subscription.isActive()) {
      return of({ departments: [], rooms: [] });
    }
    return forkJoin({
      clinics: this.api.getBusinessClinics(),
      modules: this.api.getAllBusinessModules(),
    }).pipe(
      map(({ clinics, modules }) => {
        const moduleList = Array.isArray(modules) ? modules : [];
        const clinicList = Array.isArray(clinics) ? clinics : [];
        this.accessibleDepartments = this.filterAccessibleDepartments(moduleList);
        this.allAccessibleRooms = this.filterAccessibleRooms(clinicList);
        if (this.accessibleDepartments.length === 0) {
          this.accessibleDepartments = this.departmentsFromRooms();
        }
        this.preferPharmacyDepartmentForPharmacist();
        this.ensureActiveDepartmentSelected();
        this.refreshRoomsForActiveDepartment();
        this.ensureActiveRoomSelected();
        this.cachePharmacyModuleId(moduleList);
        return {
          departments: [...this.accessibleDepartments],
          rooms: [...this.accessibleRooms],
        };
      })
    );
  }

  private cachePharmacyModuleId(modules: any[]): void {
    const pharmacy = (modules || []).find(
      (m: any) => (m.code || '').toString().toUpperCase() === 'PHARMACY'
    );
    if (pharmacy?.id != null) {
      sessionStorage.setItem('pharmacyModuleId', String(pharmacy.id));
    }
  }

  private preferPharmacyDepartmentForPharmacist(): void {
    const role = (sessionStorage.getItem('userrole') || '').toLowerCase().trim();
    if (role !== 'pharmacist' && role !== 'pharmacy') {
      return;
    }
    const pharmacy = this.accessibleDepartments.find(
      d =>
        (d.code || '').toUpperCase() === 'PHARMACY' ||
        (d.name || '').toLowerCase().includes('pharmacy')
    );
    if (pharmacy) {
      sessionStorage.setItem('activeModuleId', String(pharmacy.id));
      sessionStorage.setItem('pharmacyModuleId', String(pharmacy.id));
    }
  }

  getAccessibleDepartments(): AccessibleDepartment[] {
    return [...this.accessibleDepartments];
  }

  getAccessibleRooms(): AccessibleRoom[] {
    return [...this.accessibleRooms];
  }

  /** All rooms the user may access (respects User Management assignments). */
  getAllAccessibleRoomsList(): AccessibleRoom[] {
    return [...this.allAccessibleRooms];
  }

  /** Rooms in a department that this user is assigned to (clinic ids first, else all rooms in dept). */
  getAssignedRoomsForDepartment(moduleId: number): AccessibleRoom[] {
    const inDept = this.allAccessibleRooms.filter(
      (r) => r.hospitalModuleId === moduleId
    );
    const assignedClinicIds = this.parseIds(sessionStorage.getItem('assignedClinicIds'));
    if (assignedClinicIds.length > 0) {
      const assignedInDept = inDept.filter((r) => assignedClinicIds.includes(r.id));
      if (assignedInDept.length > 0) {
        return assignedInDept;
      }
    }
    return inDept;
  }

  /**
   * Single unambiguous assignment: one assigned clinic, or one assigned dept with one assigned room.
   */
  resolveExplicitAssignedContext(): {
    department: AccessibleDepartment;
    room: AccessibleRoom;
  } | null {
    const assignedClinicIds = this.parseIds(sessionStorage.getItem('assignedClinicIds'));
    if (assignedClinicIds.length === 1) {
      const room = this.allAccessibleRooms.find((r) => r.id === assignedClinicIds[0]);
      if (room?.hospitalModuleId != null) {
        const dept = this.accessibleDepartments.find(
          (d) => d.id === room.hospitalModuleId
        );
        if (dept) {
          return { department: dept, room };
        }
      }
    }
    const assignedModuleIds = this.parseIds(sessionStorage.getItem('assignedModuleIds'));
    if (assignedModuleIds.length === 1) {
      const dept = this.accessibleDepartments.find((d) => d.id === assignedModuleIds[0]);
      if (!dept) {
        return null;
      }
      const rooms = this.getAssignedRoomsForDepartment(dept.id);
      if (rooms.length === 1) {
        return { department: dept, room: rooms[0] };
      }
    }
    return null;
  }

  /** Set active department and room from User Management assignments. */
  applyWorkContext(department: AccessibleDepartment, room: AccessibleRoom | null): void {
    this.setActiveDepartment(department.id);
    if (room) {
      this.setActiveRoom(room.id);
    }
  }

  getActiveDepartmentId(): number | null {
    return this.parseStoredId('activeModuleId');
  }

  getActiveDepartment(): AccessibleDepartment | null {
    const id = this.getActiveDepartmentId();
    if (id == null) {
      return null;
    }
    return this.accessibleDepartments.find(d => d.id === id) ?? null;
  }

  getActiveRoomId(): number | null {
    return this.parseStoredId('activeClinicId');
  }

  getActiveRoom(): AccessibleRoom | null {
    const id = this.getActiveRoomId();
    if (id == null) {
      return null;
    }
    return this.accessibleRooms.find(r => r.id === id)
      ?? this.allAccessibleRooms.find(r => r.id === id)
      ?? null;
  }

  getActiveDepartmentLabel(): string {
    return this.getActiveDepartment()?.name || '';
  }

  getActiveRoomLabel(): string {
    const room = this.getActiveRoom();
    if (!room) {
      return '';
    }
    if (room.hospitalModuleName) {
      return `${room.name} (${room.hospitalModuleName})`;
    }
    return room.name;
  }

  /** Header summary: department and room. */
  getWorkContextSummary(): string {
    const dept = this.getActiveDepartmentLabel();
    const room = this.getActiveRoom()?.name || '';
    const parts: string[] = [];
    if (dept) {
      parts.push(`Dept: ${dept}`);
    }
    if (room) {
      parts.push(`Room: ${room}`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'No department or room';
  }

  canSwitchWorkContext(): boolean {
    return this.accessibleDepartments.length > 1 || this.allAccessibleRooms.length > 1;
  }

  /**
   * Align session department/room with the page the user opened.
   * Uses normal assignment rules first; MD/admin may follow any resolved module for display/queue.
   */
  syncDepartmentFromRoute(moduleId: number | null): void {
    if (moduleId == null || moduleId <= 0) {
      return;
    }
    if (this.setActiveDepartment(moduleId)) {
      return;
    }
    const role = (sessionStorage.getItem('userrole') || '').toLowerCase().trim();
    if (role !== 'md' && role !== 'admin') {
      return;
    }
    sessionStorage.setItem('activeModuleId', String(moduleId));
    this.refreshRoomsForActiveDepartment();
    const roomId = this.getActiveRoomId();
    if (
      roomId == null ||
      !this.accessibleRooms.some((r) => r.id === roomId)
    ) {
      const rooms = this.getAssignedRoomsForDepartment(moduleId);
      if (rooms.length > 0) {
        sessionStorage.setItem('activeClinicId', String(rooms[0].id));
      }
    }
  }

  setActiveDepartment(moduleId: number): boolean {
    if (!this.accessibleDepartments.some(d => d.id === moduleId)) {
      return false;
    }
    sessionStorage.setItem('activeModuleId', String(moduleId));
    this.refreshRoomsForActiveDepartment();
    const roomId = this.getActiveRoomId();
    if (roomId != null && !this.accessibleRooms.some(r => r.id === roomId)) {
      if (this.accessibleRooms.length > 0) {
        sessionStorage.setItem('activeClinicId', String(this.accessibleRooms[0].id));
      } else {
        sessionStorage.removeItem('activeClinicId');
      }
    } else if (roomId == null && this.accessibleRooms.length > 0) {
      sessionStorage.setItem('activeClinicId', String(this.accessibleRooms[0].id));
    }
    return true;
  }

  setActiveRoom(clinicId: number): boolean {
    const room = this.allAccessibleRooms.find(r => r.id === clinicId);
    if (!room) {
      return false;
    }
    if (
      this.getActiveDepartmentId() != null &&
      room.hospitalModuleId != null &&
      room.hospitalModuleId !== this.getActiveDepartmentId()
    ) {
      return false;
    }
    sessionStorage.setItem('activeClinicId', String(clinicId));
    if (room.hospitalModuleId != null) {
      const deptExists = this.accessibleDepartments.some(d => d.id === room.hospitalModuleId);
      if (deptExists) {
        sessionStorage.setItem('activeModuleId', String(room.hospitalModuleId));
        this.refreshRoomsForActiveDepartment();
      }
    }
    return true;
  }

  clearActiveRoom(): void {
    sessionStorage.removeItem('activeClinicId');
    sessionStorage.removeItem('activeModuleId');
    this.accessibleDepartments = [];
    this.allAccessibleRooms = [];
    this.accessibleRooms = [];
  }

  private departmentsFromRooms(): AccessibleDepartment[] {
    const byId = new Map<number, AccessibleDepartment>();
    for (const room of this.allAccessibleRooms) {
      if (room.hospitalModuleId == null || byId.has(room.hospitalModuleId)) {
        continue;
      }
      byId.set(room.hospitalModuleId, {
        id: room.hospitalModuleId,
        name: room.hospitalModuleName || 'Department',
      });
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private refreshRoomsForActiveDepartment(): void {
    const deptId = this.getActiveDepartmentId();
    if (deptId != null) {
      this.accessibleRooms = this.allAccessibleRooms.filter(
        r => r.hospitalModuleId === deptId
      );
    } else {
      this.accessibleRooms = [...this.allAccessibleRooms];
    }
  }

  private ensureActiveDepartmentSelected(): void {
    const currentId = this.getActiveDepartmentId();
    if (
      currentId != null &&
      this.accessibleDepartments.some(d => d.id === currentId)
    ) {
      return;
    }
    if (this.accessibleDepartments.length > 0) {
      sessionStorage.setItem(
        'activeModuleId',
        String(this.accessibleDepartments[0].id)
      );
    } else {
      sessionStorage.removeItem('activeModuleId');
    }
  }

  private ensureActiveRoomSelected(): void {
    const currentId = this.getActiveRoomId();
    if (
      currentId != null &&
      this.accessibleRooms.some(r => r.id === currentId)
    ) {
      return;
    }
    if (this.accessibleRooms.length > 0) {
      sessionStorage.setItem('activeClinicId', String(this.accessibleRooms[0].id));
    } else {
      sessionStorage.removeItem('activeClinicId');
    }
  }

  private filterAccessibleDepartments(modules: any[]): AccessibleDepartment[] {
    const active = modules.filter((m: any) => m.active !== false);
    const assignedModuleIds = this.parseIds(sessionStorage.getItem('assignedModuleIds'));
    const role = (sessionStorage.getItem('userrole') || '').toLowerCase().trim();

    let filtered: any[];
    if (assignedModuleIds.length > 0) {
      filtered = active.filter((m: any) => assignedModuleIds.includes(Number(m.id)));
    } else if (role === 'admin' || role === 'md') {
      filtered = active;
    } else {
      filtered = active.filter((m: any) =>
        this.isAllowedForRole(m?.allowedRoles, role)
      );
    }

    return filtered
      .map((m: any) => ({
        id: Number(m.id),
        name: m.name || 'Department',
        code: m.code,
      }))
      .filter((d: AccessibleDepartment) => !Number.isNaN(d.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private filterAccessibleRooms(clinics: any[]): AccessibleRoom[] {
    const active = clinics.filter((c: any) => c.active !== false);
    const assignedClinicIds = this.parseIds(sessionStorage.getItem('assignedClinicIds'));
    const assignedModuleIds = this.parseIds(sessionStorage.getItem('assignedModuleIds'));
    const role = (sessionStorage.getItem('userrole') || '').toLowerCase().trim();

    let filtered: any[];
    if (assignedClinicIds.length > 0) {
      filtered = active.filter((c: any) => assignedClinicIds.includes(Number(c.id)));
    } else if (assignedModuleIds.length > 0) {
      filtered = active.filter((c: any) =>
        assignedModuleIds.includes(Number(c.hospitalModuleId))
      );
    } else if (role === 'admin' || role === 'md') {
      filtered = active;
    } else {
      filtered = active.filter((c: any) =>
        this.isAllowedForRole(c?.allowedRoles, role)
      );
    }

    return filtered
      .map((c: any) => ({
        id: Number(c.id),
        name: c.name || 'Room',
        hospitalModuleId: c.hospitalModuleId != null ? Number(c.hospitalModuleId) : undefined,
        hospitalModuleName: c.hospitalModuleName,
      }))
      .filter((c: AccessibleRoom) => !Number.isNaN(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private parseStoredId(key: string): number | null {
    const raw = sessionStorage.getItem(key);
    if (!raw?.trim()) {
      return null;
    }
    const id = Number(raw.trim());
    return Number.isNaN(id) ? null : id;
  }

  private parseIds(csv: string | null): number[] {
    if (!csv?.trim()) {
      return [];
    }
    return csv
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => !Number.isNaN(n));
  }

  private isAllowedForRole(allowedRolesCsv: any, role: string): boolean {
    if (!role) {
      return false;
    }
    if (!allowedRolesCsv || typeof allowedRolesCsv !== 'string' || !allowedRolesCsv.trim()) {
      return true;
    }
    const allowed = allowedRolesCsv
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);
    return allowed.includes(role);
  }
}
