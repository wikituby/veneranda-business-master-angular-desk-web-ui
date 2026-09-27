import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Client, Visit, VitalSigns, LabTest, Scan, Procedure, Payment, Invoice, LoadingState } from '../interfaces/client-visit.interface';

export interface ClientVisitState {
  currentClient: Client | null;
  currentVisit: Visit | null;
  vitals: VitalSigns[];
  labTests: LabTest[];
  scans: Scan[];
  procedures: Procedure[];
  payments: Payment[];
  invoices: Invoice[];
  loadingStates: {
    client: LoadingState;
    visit: LoadingState;
    vitals: LoadingState;
    labTests: LoadingState;
    scans: LoadingState;
    procedures: LoadingState;
    payments: LoadingState;
    invoices: LoadingState;
  };
}

const initialState: ClientVisitState = {
  currentClient: null,
  currentVisit: null,
  vitals: [],
  labTests: [],
  scans: [],
  procedures: [],
  payments: [],
  invoices: [],
  loadingStates: {
    client: { isLoading: false },
    visit: { isLoading: false },
    vitals: { isLoading: false },
    labTests: { isLoading: false },
    scans: { isLoading: false },
    procedures: { isLoading: false },
    payments: { isLoading: false },
    invoices: { isLoading: false }
  }
};

@Injectable({
  providedIn: 'root'
})
export class ClientVisitStateService {
  private stateSubject = new BehaviorSubject<ClientVisitState>(initialState);
  public state$ = this.stateSubject.asObservable();

  // Selectors
  public currentClient$ = this.state$.pipe(map(state => state.currentClient));
  public currentVisit$ = this.state$.pipe(map(state => state.currentVisit));
  public vitals$ = this.state$.pipe(map(state => state.vitals));
  public labTests$ = this.state$.pipe(map(state => state.labTests));
  public scans$ = this.state$.pipe(map(state => state.scans));
  public procedures$ = this.state$.pipe(map(state => state.procedures));
  public payments$ = this.state$.pipe(map(state => state.payments));
  public invoices$ = this.state$.pipe(map(state => state.invoices));

  public isLoading$ = this.state$.pipe(
    map(state => Object.values(state.loadingStates).some(loading => loading.isLoading))
  );

  public hasError$ = this.state$.pipe(
    map(state => Object.values(state.loadingStates).some(loading => !!loading.error))
  );

  public errors$ = this.state$.pipe(
    map(state => {
      const errors: string[] = [];
      Object.entries(state.loadingStates).forEach(([key, loading]) => {
        if (loading.error) {
          errors.push(`${key}: ${loading.error}`);
        }
      });
      return errors;
    })
  );

  // Actions
  setCurrentClient(client: Client | null): void {
    this.updateState({ currentClient: client });
  }

  setCurrentVisit(visit: Visit | null): void {
    this.updateState({ currentVisit: visit });
  }

  setVitals(vitals: VitalSigns[]): void {
    this.updateState({ vitals });
  }

  addVital(vital: VitalSigns): void {
    const currentState = this.stateSubject.value;
    this.updateState({ vitals: [...currentState.vitals, vital] });
  }

  updateVital(updatedVital: VitalSigns): void {
    const currentState = this.stateSubject.value;
    const vitals = currentState.vitals.map(vital => 
      vital.id === updatedVital.id ? updatedVital : vital
    );
    this.updateState({ vitals });
  }

  removeVital(vitalId: number): void {
    const currentState = this.stateSubject.value;
    const vitals = currentState.vitals.filter(vital => vital.id !== vitalId);
    this.updateState({ vitals });
  }

  setLabTests(labTests: LabTest[]): void {
    this.updateState({ labTests });
  }

  addLabTest(labTest: LabTest): void {
    const currentState = this.stateSubject.value;
    this.updateState({ labTests: [...currentState.labTests, labTest] });
  }

  updateLabTest(updatedLabTest: LabTest): void {
    const currentState = this.stateSubject.value;
    const labTests = currentState.labTests.map(test => 
      test.id === updatedLabTest.id ? updatedLabTest : test
    );
    this.updateState({ labTests });
  }

  removeLabTest(labTestId: number): void {
    const currentState = this.stateSubject.value;
    const labTests = currentState.labTests.filter(test => test.id !== labTestId);
    this.updateState({ labTests });
  }

  setScans(scans: Scan[]): void {
    this.updateState({ scans });
  }

  addScan(scan: Scan): void {
    const currentState = this.stateSubject.value;
    this.updateState({ scans: [...currentState.scans, scan] });
  }

  updateScan(updatedScan: Scan): void {
    const currentState = this.stateSubject.value;
    const scans = currentState.scans.map(scan => 
      scan.id === updatedScan.id ? updatedScan : scan
    );
    this.updateState({ scans });
  }

  removeScan(scanId: number): void {
    const currentState = this.stateSubject.value;
    const scans = currentState.scans.filter(scan => scan.id !== scanId);
    this.updateState({ scans });
  }

  setProcedures(procedures: Procedure[]): void {
    this.updateState({ procedures });
  }

  addProcedure(procedure: Procedure): void {
    const currentState = this.stateSubject.value;
    this.updateState({ procedures: [...currentState.procedures, procedure] });
  }

  updateProcedure(updatedProcedure: Procedure): void {
    const currentState = this.stateSubject.value;
    const procedures = currentState.procedures.map(proc => 
      proc.id === updatedProcedure.id ? updatedProcedure : proc
    );
    this.updateState({ procedures });
  }

  removeProcedure(procedureId: number): void {
    const currentState = this.stateSubject.value;
    const procedures = currentState.procedures.filter(proc => proc.id !== procedureId);
    this.updateState({ procedures });
  }

  setPayments(payments: Payment[]): void {
    this.updateState({ payments });
  }

  addPayment(payment: Payment): void {
    const currentState = this.stateSubject.value;
    this.updateState({ payments: [...currentState.payments, payment] });
  }

  updatePayment(updatedPayment: Payment): void {
    const currentState = this.stateSubject.value;
    const payments = currentState.payments.map(pay => 
      pay.id === updatedPayment.id ? updatedPayment : pay
    );
    this.updateState({ payments });
  }

  removePayment(paymentId: number): void {
    const currentState = this.stateSubject.value;
    const payments = currentState.payments.filter(pay => pay.id !== paymentId);
    this.updateState({ payments });
  }

  setInvoices(invoices: Invoice[]): void {
    this.updateState({ invoices });
  }

  addInvoice(invoice: Invoice): void {
    const currentState = this.stateSubject.value;
    this.updateState({ invoices: [...currentState.invoices, invoice] });
  }

  updateInvoice(updatedInvoice: Invoice): void {
    const currentState = this.stateSubject.value;
    const invoices = currentState.invoices.map(inv => 
      inv.id === updatedInvoice.id ? updatedInvoice : inv
    );
    this.updateState({ invoices });
  }

  removeInvoice(invoiceId: number): void {
    const currentState = this.stateSubject.value;
    const invoices = currentState.invoices.filter(inv => inv.id !== invoiceId);
    this.updateState({ invoices });
  }

  setLoadingState(section: keyof ClientVisitState['loadingStates'], loading: LoadingState): void {
    const currentState = this.stateSubject.value;
    this.updateState({
      loadingStates: {
        ...currentState.loadingStates,
        [section]: loading
      }
    });
  }

  clearError(section: keyof ClientVisitState['loadingStates']): void {
    const currentState = this.stateSubject.value;
    this.updateState({
      loadingStates: {
        ...currentState.loadingStates,
        [section]: { ...currentState.loadingStates[section], error: undefined }
      }
    });
  }

  resetState(): void {
    this.stateSubject.next(initialState);
  }

  private updateState(partialState: Partial<ClientVisitState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...partialState });
  }
}
