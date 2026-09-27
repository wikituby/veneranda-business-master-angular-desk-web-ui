import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';
import { Client, Visit, ApiResponse, PaginatedResponse } from '../interfaces/client-visit.interface';

@Injectable({
  providedIn: 'root'
})
export class ClientService extends BaseService {
  private readonly endpoint = '/course/Client-management';

  // Client Management
  getAllClients(page: number = 0, size: number = 10): Observable<PaginatedResponse<Client>> {
    return this.get<PaginatedResponse<Client>>(`${this.endpoint}/get-all-patients?page=${page}&size=${size}`);
  }

  getClientById(id: number): Observable<ApiResponse<Client>> {
    return this.get<ApiResponse<Client>>(`${this.endpoint}/get-patient/${id}`);
  }

  createClient(client: Client): Observable<ApiResponse<Client>> {
    return this.post<ApiResponse<Client>>(`${this.endpoint}/create-client`, client);
  }

  updateClient(id: number, client: Partial<Client>): Observable<ApiResponse<Client>> {
    return this.put<ApiResponse<Client>>(`${this.endpoint}/update-patient/${id}`, client);
  }

  deleteClient(id: number): Observable<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`${this.endpoint}/delete-client/${id}`);
  }

  searchClients(searchTerm: string, page: number = 0, size: number = 10): Observable<PaginatedResponse<Client>> {
    return this.get<PaginatedResponse<Client>>(`${this.endpoint}/search-clients?search=${searchTerm}&page=${page}&size=${size}`);
  }

  // Visit Management
  getClientVisits(clientId: number, page: number = 0, size: number = 10): Observable<PaginatedResponse<Visit>> {
    return this.get<PaginatedResponse<Visit>>(`${this.endpoint}/get-client-visits/${clientId}?page=${page}&size=${size}`);
  }

  createVisit(visit: Omit<Visit, 'id'>): Observable<ApiResponse<Visit>> {
    return this.post<ApiResponse<Visit>>(`${this.endpoint}/create-visit`, visit);
  }

  updateVisit(id: number, visit: Partial<Visit>): Observable<ApiResponse<Visit>> {
    return this.put<ApiResponse<Visit>>(`${this.endpoint}/update-visit/${id}`, visit);
  }

  getVisitById(id: number): Observable<ApiResponse<Visit>> {
    return this.get<ApiResponse<Visit>>(`${this.endpoint}/get-visit/${id}`);
  }
}

