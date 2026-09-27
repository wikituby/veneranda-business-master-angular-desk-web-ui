import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import {
  ensureFromModuleInList,
  normalizeBusinessModules,
  pickDefaultFromModuleId,
  isQueueDischargeDestination,
  QUEUE_DISCHARGE_DESTINATION_ID,
  queueDestinationOptions,
} from '../../../../utils/queue-module.util';

type ViewTab = 'queues' | 'directory';

@Component({
  selector: 'app-queue-management',
  templateUrl: './queue-management.component.html',
  styleUrls: ['./queue-management.component.css']
})
export class QueueManagementComponent implements OnInit {
  isDarkMode = false;
  activeTab: ViewTab = 'queues';
  departmentFilter: number | null = null;
  isLoading = false;
  isSaving = false;
  responseError = '';

  waitingClients = 0;
  servingNow = 0;
  completedToday = 0;
  averageWaitTime = 0;

  /** All active modules (From field + department filter). */
  modules: any[] = [];
  /** Destinations the user may send clients to (role / assignment scoped). */
  toModules: any[] = [];
  clinics: any[] = [];
  queueEntries: any[] = [];
  directoryDepartments: any[] = [];
  directoryTotal = 0;
  clients: any[] = [];
  clientGroups: any[] = [];
  private readonly currentRole = (sessionStorage.getItem('userrole') || '').toLowerCase();

  showQueueModal = false;
  showClientPicker = false;
  clientSearch = '';

  selectedClient: any = null;
  queueForm = {
    fromModuleId: null as number | null,
    toModuleId: null as number | null,
    clinicId: null as number | null,
    note: '',
    visitDefaultScheme: '',
    clientGroupId: null as number | null,
    emergency: false,
    revisit: false,
    printQueueTicket: false,
    clientVisitId: null as number | null
  };

  readonly QUEUE_DISCHARGE_DESTINATION_ID = QUEUE_DISCHARGE_DESTINATION_ID;
  readonly isQueueDischargeDestination = isQueueDischargeDestination;

  get queueDestinationModules(): any[] {
    return queueDestinationOptions(this.toModules);
  }

  /** Group entries by destination module for queue cards. */
  get queueByDepartment(): { moduleId: number; department: string; status: string; clients: any[] }[] {
    const map = new Map<number, any[]>();
    for (const e of this.queueEntries) {
      const id = e.toModuleId;
      if (!map.has(id)) {
        map.set(id, []);
      }
      map.get(id)!.push({
        ...e,
        name: `${e.clientSurname || ''} ${e.clientOtherNames || ''}`.trim(),
        fileNo: e.clientFileNo,
        waitTime: e.waitMinutes ?? 0
      });
    }
    return Array.from(map.entries()).map(([moduleId, clients]) => ({
      moduleId,
      department: clients[0]?.toModuleName || 'Unknown',
      status: 'active',
      clients: clients.sort((a: any, b: any) => {
        if (!!a.emergency !== !!b.emergency) {
          return a.emergency ? -1 : 1;
        }
        const pa = a.queuePosition ?? 999999;
        const pb = b.queuePosition ?? 999999;
        if (pa !== pb) return pa - pb;
        const da = new Date(a.queuedAt as any).getTime();
        const db = new Date(b.queuedAt as any).getTime();
        return da - db;
      })
    }));
  }

  get filteredQueues() {
    if (this.departmentFilter == null) {
      return this.queueByDepartment;
    }
    return this.queueByDepartment.filter(q => q.moduleId === this.departmentFilter);
  }

  get filteredClientsForPicker(): any[] {
    const q = this.clientSearch.trim().toLowerCase();
    if (!q) {
      return this.clients.slice(0, 50);
    }
    return this.clients.filter(p => {
      const name = `${p.clientSecondName || ''} ${p.clientFirstName || ''}`.toLowerCase();
      const file = (p.clientFileNo || '').toLowerCase();
      return name.includes(q) || file.includes(q);
    }).slice(0, 50);
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
    this.loadModules();
    this.loadClientGroups();
    this.loadClients();
    this.refreshQueues();
  }

  loadModules(): void {
    this.api.getAllBusinessModules().subscribe({
      next: (res: any) => {
        const all = normalizeBusinessModules(res);
        const assigned = this.parseAssignedModuleIds();
        this.modules = all;
        if (assigned.length > 0) {
          this.toModules = all.filter((m: any) => assigned.includes(m.id));
        } else {
          this.toModules = all.filter((m: any) => this.isAllowedForCurrentRole(m?.allowedRoles));
        }
        if (!this.toModules.length) {
          this.toModules = all;
        }
        this.queueForm.fromModuleId = ensureFromModuleInList(
          this.queueForm.fromModuleId,
          this.modules
        );
        if (!this.queueForm.fromModuleId) {
          this.queueForm.fromModuleId = pickDefaultFromModuleId(this.modules);
        }
      }
    });
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

  loadClientGroups(): void {
    this.api.getAllClientGroups().subscribe({
      next: (res: any) => {
        this.clientGroups = Array.isArray(res) ? res : [];
      }
    });
  }

  loadClients(): void {
    this.api.getAllClients().subscribe({
      next: (res: any) => {
        this.clients = Array.isArray(res) ? res : [];
      }
    });
  }

  onToModuleChange(): void {
    this.queueForm.clinicId = null;
    if (isQueueDischargeDestination(this.queueForm.toModuleId)) {
      this.clinics = [];
      return;
    }
    if (this.queueForm.toModuleId) {
      this.api.getBusinessClinics(this.queueForm.toModuleId).subscribe({
        next: (res: any) => {
          const all = Array.isArray(res) ? res : [];
          this.clinics = all.filter((c: any) => c.active !== false).filter((c: any) => this.isAllowedForCurrentRole(c?.allowedRoles));
        }
      });
    } else {
      this.clinics = [];
    }
  }

  private isAllowedForCurrentRole(allowedRolesCsv: any): boolean {
    // Admins and MDs typically need broad access; keep them unrestricted.
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

  onSchemeChange(): void {
    const g = this.clientGroups.find(x => x.id === this.queueForm.clientGroupId);
    this.queueForm.visitDefaultScheme = g?.groupName || '';
  }

  refreshQueues(): void {
    this.isLoading = true;
    this.api.getClientQueueEntries(this.departmentFilter ?? undefined).subscribe({
      next: (res: any) => {
        this.queueEntries = Array.isArray(res) ? res : [];
        this.updateStats();
        this.isLoading = false;
      },
      error: () => {
        this.queueEntries = [];
        this.isLoading = false;
      }
    });
    if (this.activeTab === 'directory') {
      this.loadDirectory();
    }
  }

  loadDirectory(): void {
    this.api.getBusinessDirectory().subscribe({
      next: (res: any) => {
        this.directoryDepartments = res?.departments || [];
        this.directoryTotal = res?.totalClients ?? 0;
      }
    });
  }

  setTab(tab: ViewTab): void {
    this.activeTab = tab;
    if (tab === 'directory') {
      this.loadDirectory();
    }
  }

  updateStats(): void {
    this.waitingClients = this.queueEntries.filter(e => e.status === 'WAITING').length;
    this.servingNow = this.queueEntries.filter(e => e.status === 'SERVING' || e.status === 'CALLED').length;
    const waits = this.queueEntries.map(e => e.waitMinutes || 0).filter(w => w > 0);
    this.averageWaitTime = waits.length
      ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length)
      : 0;
  }

  addToQueue(): void {
    this.selectedClient = null;
    this.queueForm = {
      fromModuleId: this.queueForm.fromModuleId,
      toModuleId: null,
      clinicId: null,
      note: '',
      visitDefaultScheme: '',
      clientGroupId: null,
      emergency: false,
      revisit: false,
      printQueueTicket: false,
      clientVisitId: null
    };
    this.clinics = [];
    this.showClientPicker = true;
    this.responseError = '';
  }

  selectClientForQueue(client: any): void {
    this.selectedClient = client;
    this.showClientPicker = false;
    this.showQueueModal = true;
    this.queueForm.fromModuleId = ensureFromModuleInList(this.queueForm.fromModuleId, this.modules);
    if (client.clientGroup?.id) {
      this.queueForm.clientGroupId = client.clientGroup.id;
      this.queueForm.visitDefaultScheme = client.clientGroup.groupName || '';
    }
  }

  get clientHeaderAge(): string {
    if (!this.selectedClient) {
      return '';
    }
    if (this.selectedClient.clientAge != null) {
      return `${this.selectedClient.clientAge} yrs`;
    }
    return '';
  }

  submitQueue(): void {
    const isDischarge = isQueueDischargeDestination(this.queueForm.toModuleId);
    if (!this.selectedClient?.id) {
      this.responseError = 'Select client';
      return;
    }
    if (!isDischarge && !this.queueForm.fromModuleId) {
      this.responseError = 'Select client and from department';
      return;
    }
    if (!this.queueForm.toModuleId) {
      this.responseError = 'Select destination';
      return;
    }
    this.isSaving = true;
    this.responseError = '';
    const username = sessionStorage.getItem('username') || '';

    if (isDischarge) {
      this.api.dischargeClientFromQueue({
        clientId: this.selectedClient.id,
        note: this.queueForm.note,
        dischargedBy: username,
      }).subscribe({
        next: () => {
          this.isSaving = false;
          this.showQueueModal = false;
          this.refreshQueues();
        },
        error: (err: any) => {
          this.isSaving = false;
          this.responseError = err?.error?.message || 'Failed to discharge client';
        },
      });
      return;
    }

    const scheme = this.queueForm.visitDefaultScheme ||
      this.clientGroups.find(g => g.id === this.queueForm.clientGroupId)?.groupName || '';
    const fromModuleId = this.queueForm.fromModuleId;
    const toModuleId = this.queueForm.toModuleId;
    if (fromModuleId == null || toModuleId == null) {
      this.isSaving = false;
      this.responseError = 'Select From and To departments';
      return;
    }

    this.api.queueClient({
      clientId: this.selectedClient.id,
      clientVisitId: this.queueForm.clientVisitId ?? undefined,
      fromModuleId,
      toModuleId,
      clinicId: this.queueForm.clinicId ?? undefined,
      note: this.queueForm.note,
      visitDefaultScheme: scheme,
      clientGroupId: this.queueForm.clientGroupId ?? undefined,
      emergency: this.queueForm.emergency,
      revisit: this.queueForm.revisit,
      queuedBy: sessionStorage.getItem('username') || ''
    }).subscribe({
      next: (entry: any) => {
        this.isSaving = false;
        this.showQueueModal = false;
        if (this.queueForm.printQueueTicket && entry?.queueNumber) {
          this.printTicket(entry);
        }
        this.refreshQueues();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.responseError = err?.error?.message || 'Failed to queue client';
      }
    });
  }

  printTicket(entry: any): void {
    const w = window.open('', '_blank', 'width=400,height=320');
    if (!w) {
      return;
    }
    const p = this.selectedClient;
    w.document.write(`
      <html><head><title>Queue Ticket</title></head><body style="font-family:sans-serif;padding:16px">
      <h2>Queue Ticket</h2>
      <p><strong>${entry.queueNumber}</strong></p>
      <p>${p?.clientSecondName || ''} ${p?.clientFirstName || ''}</p>
      <p>OP: ${p?.clientFileNo || ''}</p>
      <p>To: ${entry.toModuleName || ''}</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  }

  callClient(client: any): void {
    this.api.callClientQueueEntry(client.id).subscribe({ next: () => this.refreshQueues() });
  }

  serveClient(client: any): void {
    this.api.serveClientQueueEntry(client.id).subscribe({ next: () => this.refreshQueues() });
  }

  removeClient(client: any): void {
    if (!confirm('Remove client from queue?')) {
      return;
    }
    this.api.cancelClientQueueEntry(client.id).subscribe({ next: () => this.refreshQueues() });
  }

  completeClient(client: any): void {
    this.api.completeClientQueueEntry(client.id).subscribe({ next: () => this.refreshQueues() });
  }

  toggleEmergency(client: any): void {
    const next = !client.emergency;
    this.api.updateClientQueueEntry(client.id, { emergency: next }).subscribe({
      next: () => this.refreshQueues(),
      error: () => this.refreshQueues(),
    });
  }

  moveUp(client: any, queue: { clients: any[] }): void {
    const idx = queue.clients.findIndex((p) => p.id === client.id);
    if (idx <= 0) return;
    const above = queue.clients[idx - 1];
    const curPos = client.queuePosition ?? idx + 1;
    const abovePos = above.queuePosition ?? idx;
    this.api.updateClientQueueEntry(client.id, { queuePosition: abovePos }).subscribe({
      next: () => {
        this.api.updateClientQueueEntry(above.id, { queuePosition: curPos }).subscribe({
          next: () => this.refreshQueues(),
          error: () => this.refreshQueues(),
        });
      },
      error: () => this.refreshQueues(),
    });
  }

  moveDown(client: any, queue: { clients: any[] }): void {
    const idx = queue.clients.findIndex((p) => p.id === client.id);
    if (idx < 0 || idx >= queue.clients.length - 1) return;
    const below = queue.clients[idx + 1];
    const curPos = client.queuePosition ?? idx + 1;
    const belowPos = below.queuePosition ?? idx + 2;
    this.api.updateClientQueueEntry(client.id, { queuePosition: belowPos }).subscribe({
      next: () => {
        this.api.updateClientQueueEntry(below.id, { queuePosition: curPos }).subscribe({
          next: () => this.refreshQueues(),
          error: () => this.refreshQueues(),
        });
      },
      error: () => this.refreshQueues(),
    });
  }

  callNext(queue: { clients: any[] }): void {
    const next = queue.clients.find(p => p.status === 'WAITING');
    if (next) {
      this.callClient(next);
    }
  }

  closeModals(): void {
    this.showQueueModal = false;
    this.showClientPicker = false;
  }
}
