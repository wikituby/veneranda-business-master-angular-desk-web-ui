import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Client, Visit, VitalSigns, LabTest, Scan, Procedure, Payment, Invoice } from '../../../interfaces/client-visit.interface';
import { ClientService } from '../../../services/client.service';
import { VisitManagementService } from '../../../services/visit-management.service';
import { ClientVisitStateService } from '../../../services/client-visit-state.service';

@Component({
  selector: 'app-client-visit-container',
  templateUrl: './client-visit-container.component.html',
  styleUrls: ['./client-visit-container.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientVisitContainerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State observables
  currentClient$ = this.stateService.currentClient$;
  currentVisit$ = this.stateService.currentVisit$;
  vitals$ = this.stateService.vitals$;
  labTests$ = this.stateService.labTests$;
  scans$ = this.stateService.scans$;
  procedures$ = this.stateService.procedures$;
  payments$ = this.stateService.payments$;
  invoices$ = this.stateService.invoices$;
  isLoading$ = this.stateService.isLoading$;
  hasError$ = this.stateService.hasError$;
  errors$ = this.stateService.errors$;

  constructor(
    private clientService: ClientService,
    private visitManagementService: VisitManagementService,
    private stateService: ClientVisitStateService
  ) {}

  ngOnInit(): void {
    // Initialize any required data
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    // Load any initial data if needed
  }

  // Client Management
  onClientSelected(client: Client): void {
    this.stateService.setCurrentClient(client);
    this.loadClientData(client.id!);
  }

  onEditClient(client: Client): void {
    // Handle client editing
    console.log('Edit client:', client);
  }

  onDeleteClient(clientId: number): void {
    if (confirm('Are you sure you want to delete this client?')) {
      this.clientService.deleteClient(clientId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.stateService.setCurrentClient(null);
            console.log('Client deleted successfully');
          },
          error: (error) => {
            console.error('Error deleting client:', error);
          }
        });
    }
  }

  private loadClientData(clientId: number): void {
    // Load client orders, vitals, etc.
    this.loadClientVisits(clientId);
  }

  private loadClientVisits(clientId: number): void {
    this.stateService.setLoadingState('visit', { isLoading: true });
    
    this.clientService.getClientVisits(clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (visits) => {
          // Handle visits data
          this.stateService.setLoadingState('visit', { isLoading: false });
        },
        error: (error) => {
          this.stateService.setLoadingState('visit', { 
            isLoading: false, 
            error: 'Failed to load client orders' 
          });
        }
      });
  }

  // Vital Signs Management
  onAddVitals(vitals: Omit<VitalSigns, 'id'>): void {
    this.stateService.setLoadingState('vitals', { isLoading: true });
    
    this.visitManagementService.createVitalSigns(vitals)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.stateService.addVital(response.data);
          this.stateService.setLoadingState('vitals', { isLoading: false, success: true });
        },
        error: (error) => {
          this.stateService.setLoadingState('vitals', { 
            isLoading: false, 
            error: 'Failed to add vital signs' 
          });
        }
      });
  }

  onUpdateVitals(updateData: { id: number; vitals: Partial<VitalSigns> }): void {
    this.stateService.setLoadingState('vitals', { isLoading: true });
    
    this.visitManagementService.updateVitalSigns(updateData.id, updateData.vitals)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.stateService.updateVital(response.data);
          this.stateService.setLoadingState('vitals', { isLoading: false, success: true });
        },
        error: (error) => {
          this.stateService.setLoadingState('vitals', { 
            isLoading: false, 
            error: 'Failed to update vital signs' 
          });
        }
      });
  }

  onDeleteVitals(vitalId: number): void {
    this.stateService.setLoadingState('vitals', { isLoading: true });
    
    this.visitManagementService.deleteVitalSigns(vitalId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.stateService.removeVital(vitalId);
          this.stateService.setLoadingState('vitals', { isLoading: false, success: true });
        },
        error: (error) => {
          this.stateService.setLoadingState('vitals', { 
            isLoading: false, 
            error: 'Failed to delete vital signs' 
          });
        }
      });
  }

  // Error handling
  onClearError(section: keyof ClientVisitStateService['stateSubject']['value']['loadingStates']): void {
    this.stateService.clearError(section);
  }
}
