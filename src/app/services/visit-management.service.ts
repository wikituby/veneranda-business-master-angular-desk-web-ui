import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { VitalSigns, LabTest, Scan, Procedure, Payment, Invoice, ApiResponse, PaginatedResponse } from '../interfaces/client-visit.interface';

@Injectable({
  providedIn: 'root'
})
export class VisitManagementService extends BaseService {
  private readonly clientEndpoint = '/course/Client-management';
  private readonly financialEndpoint = '/course/financial-management';
  private readonly diagnosticsEndpoint = '/course/diagnostics-management';

  // Vital Signs Management
  getVitalSigns(visitId: number): Observable<ApiResponse<VitalSigns[]>> {
    return this.get<ApiResponse<VitalSigns[]>>(`${this.clientEndpoint}/get-vitals/${visitId}`);
  }

  createVitalSigns(vitalSigns: Omit<VitalSigns, 'id'>): Observable<ApiResponse<VitalSigns>> {
    return this.post<ApiResponse<VitalSigns>>(`${this.clientEndpoint}/create-vitals`, vitalSigns);
  }

  updateVitalSigns(id: number, vitalSigns: Partial<VitalSigns>): Observable<ApiResponse<VitalSigns>> {
    return this.put<ApiResponse<VitalSigns>>(`${this.clientEndpoint}/update-vitals/${id}`, vitalSigns);
  }

  deleteVitalSigns(id: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`${this.clientEndpoint}/delete-vitals/${id}`);
  }

  // Lab Tests Management
  getLabTests(visitId: number): Observable<ApiResponse<LabTest[]>> {
    return this.get<ApiResponse<LabTest[]>>(`${this.diagnosticsEndpoint}/get-lab-tests/${visitId}`);
  }

  createLabTest(labTest: Omit<LabTest, 'id'>): Observable<ApiResponse<LabTest>> {
    return this.post<ApiResponse<LabTest>>(`${this.diagnosticsEndpoint}/create-lab-test`, labTest);
  }

  updateLabTest(id: number, labTest: Partial<LabTest>): Observable<ApiResponse<LabTest>> {
    return this.put<ApiResponse<LabTest>>(`${this.diagnosticsEndpoint}/update-lab-test/${id}`, labTest);
  }

  deleteLabTest(id: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`${this.diagnosticsEndpoint}/delete-lab-test/${id}`);
  }

  // Scans Management
  getScans(visitId: number): Observable<ApiResponse<Scan[]>> {
    return this.get<ApiResponse<Scan[]>>(`${this.diagnosticsEndpoint}/get-scans/${visitId}`);
  }

  createScan(scan: Omit<Scan, 'id'>): Observable<ApiResponse<Scan>> {
    return this.post<ApiResponse<Scan>>(`${this.diagnosticsEndpoint}/create-scan`, scan);
  }

  updateScan(id: number, scan: Partial<Scan>): Observable<ApiResponse<Scan>> {
    return this.put<ApiResponse<Scan>>(`${this.diagnosticsEndpoint}/update-scan/${id}`, scan);
  }

  deleteScan(id: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`${this.diagnosticsEndpoint}/delete-scan/${id}`);
  }

  // Procedures Management
  getProcedures(visitId: number): Observable<ApiResponse<Procedure[]>> {
    return this.get<ApiResponse<Procedure[]>>(`${this.clientEndpoint}/get-procedures/${visitId}`);
  }

  createProcedure(procedure: Omit<Procedure, 'id'>): Observable<ApiResponse<Procedure>> {
    return this.post<ApiResponse<Procedure>>(`${this.clientEndpoint}/create-procedure`, procedure);
  }

  updateProcedure(id: number, procedure: Partial<Procedure>): Observable<ApiResponse<Procedure>> {
    return this.put<ApiResponse<Procedure>>(`${this.clientEndpoint}/update-procedure/${id}`, procedure);
  }

  deleteProcedure(id: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`${this.clientEndpoint}/delete-procedure/${id}`);
  }

  // Payment Management
  getPayments(visitId: number): Observable<ApiResponse<Payment[]>> {
    return this.get<ApiResponse<Payment[]>>(`${this.financialEndpoint}/get-payments/${visitId}`);
  }

  createPayment(payment: Omit<Payment, 'id'>): Observable<ApiResponse<Payment>> {
    return this.post<ApiResponse<Payment>>(`${this.financialEndpoint}/create-payment`, payment);
  }

  updatePayment(id: number, payment: Partial<Payment>): Observable<ApiResponse<Payment>> {
    return this.put<ApiResponse<Payment>>(`${this.financialEndpoint}/update-payment/${id}`, payment);
  }

  deletePayment(id: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`${this.financialEndpoint}/delete-payment/${id}`);
  }

  // Invoice Management
  getInvoices(visitId: number): Observable<ApiResponse<Invoice[]>> {
    return this.get<ApiResponse<Invoice[]>>(`${this.financialEndpoint}/get-invoices/${visitId}`);
  }

  createInvoice(invoice: Omit<Invoice, 'id'>): Observable<ApiResponse<Invoice>> {
    return this.post<ApiResponse<Invoice>>(`${this.financialEndpoint}/create-invoice`, invoice);
  }

  updateInvoice(id: number, invoice: Partial<Invoice>): Observable<ApiResponse<Invoice>> {
    return this.put<ApiResponse<Invoice>>(`${this.financialEndpoint}/update-invoice/${id}`, invoice);
  }

  deleteInvoice(id: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`${this.financialEndpoint}/delete-invoice/${id}`);
  }
}
