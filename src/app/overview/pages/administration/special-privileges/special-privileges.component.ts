import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../../../services/theme.service';
import { FacilityBrandingService } from '../../../../services/facility-branding.service';
import { ApiService } from '../../../../services/api.service';
import { userHasRole } from '../../../../utils/user-roles.util';

@Component({
  selector: 'app-special-privileges',
  templateUrl: './special-privileges.component.html',
  styleUrls: ['./special-privileges.component.css', '../subscription/subscription.component.css'],
})
export class SpecialPrivilegesComponent implements OnInit {
  isDarkMode = false;
  isLoading = false;
  isSaving = false;
  responseMessage = '';
  responseColor = '';

  privilegeUsers: { id: number; username: string; role: string }[] = [];
  privilegeUsersLoading = false;
  clientGroups: { id: number; groupName: string }[] = [];
  clientGroupsLoading = false;

  privilegeOpenVisitIds = new Set<number>();
  privilegeDebtGroupAssignIds = new Set<number>();
  privilegeCreditAllowedGroupIds = new Set<number>();

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private facilityBranding: FacilityBrandingService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    if (!sessionStorage.getItem('username')) {
      this.router.navigate(['/login']);
      return;
    }
    if (!userHasRole('md')) {
      this.router.navigate(['/overview/main-dashboard']);
      return;
    }
    this.themeService.isDarkMode$.subscribe((isDark) => (this.isDarkMode = isDark));
    this.load();
    this.loadPrivilegeUsers();
    this.loadClientGroups();
  }

  get canEdit(): boolean {
    return userHasRole('md');
  }

  private load(): void {
    this.isLoading = true;
    this.facilityBranding.load().subscribe({
      next: (data) => {
        this.privilegeOpenVisitIds = new Set(this.parseIds(data?.privilegeOpenVisitUserIds));
        this.privilegeDebtGroupAssignIds = new Set(
          this.parseIds(data?.privilegeVenerandaGroupUserIds)
        );
        this.privilegeCreditAllowedGroupIds = new Set(
          this.parseIds(data?.privilegeCreditAllowedGroupIds)
        );
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.responseMessage = err?.error?.message || 'Failed to load Special Privileges.';
        this.responseColor = 'red';
      },
    });
  }

  private loadPrivilegeUsers(): void {
    this.privilegeUsersLoading = true;
    this.api.getAllUsers().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        this.privilegeUsers = (Array.isArray(list) ? list : [])
          .map((u: any) => ({
            id: Number(u?.id),
            username: String(u?.username || u?.email || `User ${u?.id}`),
            role: String(u?.role || ''),
          }))
          .filter((u: { id: number }) => Number.isFinite(u.id) && u.id > 0)
          .sort((a: { username: string }, b: { username: string }) =>
            a.username.localeCompare(b.username)
          );
        this.privilegeUsersLoading = false;
      },
      error: () => {
        this.privilegeUsers = [];
        this.privilegeUsersLoading = false;
      },
    });
  }

  private loadClientGroups(): void {
    this.clientGroupsLoading = true;
    this.api.getAllClientGroups().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        this.clientGroups = (Array.isArray(list) ? list : [])
          .map((g: any) => ({
            id: Number(g?.id),
            groupName: String(g?.groupName || g?.name || `Group ${g?.id}`),
          }))
          .filter((g: { id: number }) => Number.isFinite(g.id) && g.id > 0)
          .sort((a: { groupName: string }, b: { groupName: string }) =>
            a.groupName.localeCompare(b.groupName)
          );
        this.clientGroupsLoading = false;
      },
      error: () => {
        this.clientGroups = [];
        this.clientGroupsLoading = false;
      },
    });
  }

  toggleId(set: Set<number>, id: number, checked: boolean): void {
    if (!this.canEdit) {
      return;
    }
    if (checked) {
      set.add(id);
    } else {
      set.delete(id);
    }
  }

  isChecked(set: Set<number>, id: number): boolean {
    return set.has(id);
  }

  private parseIds(csv: string | null | undefined): number[] {
    if (!csv?.trim()) {
      return [];
    }
    return csv
      .split(',')
      .map((s) => Number(String(s).trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  save(): void {
    if (!this.canEdit || this.isSaving) {
      return;
    }
    this.isSaving = true;
    this.responseMessage = '';
    const payload = {
      privilegeOpenVisitUserIds: [...this.privilegeOpenVisitIds].join(','),
      privilegeVenerandaGroupUserIds: [...this.privilegeDebtGroupAssignIds].join(','),
      privilegeCreditAllowedGroupIds: [...this.privilegeCreditAllowedGroupIds].join(','),
    };
    this.facilityBranding.save(payload).subscribe({
      next: (data) => {
        this.privilegeOpenVisitIds = new Set(this.parseIds(data?.privilegeOpenVisitUserIds));
        this.privilegeDebtGroupAssignIds = new Set(
          this.parseIds(data?.privilegeVenerandaGroupUserIds)
        );
        this.privilegeCreditAllowedGroupIds = new Set(
          this.parseIds(data?.privilegeCreditAllowedGroupIds)
        );
        this.isSaving = false;
        this.responseMessage = 'Special privileges saved.';
        this.responseColor = 'green';
      },
      error: (err) => {
        this.isSaving = false;
        this.responseMessage =
          err?.error?.message || err?.message || 'Could not save Special Privileges.';
        this.responseColor = 'red';
      },
    });
  }
}
