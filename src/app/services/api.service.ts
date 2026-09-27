import { HttpClient, HttpHeaders, HttpEventType } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiConfigService, SKIP_CONNECTION_HEADER } from './api-config.service';
import { API_CLOUD_BASE, API_VENERANDA_PUBLIC_BASE, getDevProxyBase, isAngularDevServer } from '../config/api-server.config';
import { Observable } from 'rxjs';
import { map, catchError, filter } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';
import { throwError, of } from 'rxjs';

import { AuthenticationService } from './authentication.service';

/** Matches backend `org.example.inventory.stock.services.payloads.requests.StockTransferRequest` (JSON field names). */
export interface StockTransferRequestPayload {
  stockBatchId: number;
  fromStoreId: number;
  toStoreId: number;
  qty: number;
  transferredBy: string;
}

/** Matches backend `StockTrackingRequest` (org.example.inventory.stock.services.payloads.requests). */
export interface StockTrackingRequestPayload {
  stockItemId: number;
  stockBeforeTransaction: number;
  transactionType: string; // "IN" | "OUT"
  quantityChanged: number;
  stockAfterTransaction: number;
}

export interface StockDosageRulePayload {
  title: string;
  matchLabel?: string | null;
  ruleLabel?: string | null;
  doseCalculationType?: 'FIXED' | 'WEIGHT_PER_DOSE' | 'WEIGHT_PER_DAY' | string | null;
  fixedDoseValue?: number | null;
  fixedDoseUnit?: string | null;
  weightDoseValue?: number | null;
  weightDoseUnit?: string | null;
  maxDoseValue?: number | null;
  maxDoseUnit?: string | null;
  minAgeYears?: number | null;
  maxAgeYears?: number | null;
  minWeightKg?: number | null;
  maxWeightKg?: number | null;
  route?: string | null;
  frequencyValue?: number | null;
  frequencyUnit?: number | null;
  durationValue?: number | null;
  durationUnit?: number | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  stockUnitsPerDose?: number | null;
  stockUnitLabel?: string | null;
  instructions?: string | null;
  specialScheduleText?: string | null;
  warning?: string | null;
  active?: boolean | null;
  sortOrder?: number | null;
}

export interface StockDosageRule extends StockDosageRulePayload {
  id: number;
  stockItemId: number;
  stockItemName?: string | null;
  creationDate?: string | null;
  updateDate?: string | null;
}

/** Matches backend `StockAdjustmentRequest` (org.example.inventory.stock.services.payloads.requests). */
export interface StockAdjustmentRequestPayload {
  /** Batch-mode inventory (`pharmacyUseStockBatch` true). */
  stockBatchId?: number | null;
  /** Shop-item mode (`pharmacyUseStockBatch` false). */
  itemId?: number | null;
  adjustmentTypeId: number;
  /** Signed: positive adds stock, negative removes */
  quantityChanged: number;
  reason?: string | null;
  /** ISO-8601 local date-time string; omit to use server "now" */
  date?: string | null;
  doneBy?: string | null;
}

/** Matches backend `AdjustmentTypeRequest`. */
export interface AdjustmentTypeRequestPayload {
  name: string;
  code: string;
  active?: boolean;
}

/** Query params for {@code Client-management/filter-visits} (VisitParametersRequest). */
export interface FilterVisitsQuery {
  visitGroup?: string;
  clientGroupId?: number;
  datefrom?: string;
  dateto?: string;
  clientName?: string;
  diagnosis?: string;
  procedureId?: number;
  ageFrom?: number;
  ageTo?: number;
  clientGender?: string;
  weightFrom?: number;
  weightTo?: number;
  treatmentItemId?: number;
  treatmentDrugName?: string;
  hasDebt?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private get apiBaseUrl(): string {
    return this.apiConfig.getBaseUrl();
  }
  private get baseUrl20(): string { return this.apiBaseUrl + '/Business-item'; }
  private get baseUrl3(): string { return this.apiBaseUrl + '/shop-item'; }
  private get baseUrl4(): string { return this.apiBaseUrl + '/shop-cart'; }
  private get baseUrl5(): string { return this.apiBaseUrl + '/Client-management'; }
  private get baseUrl6(): string { return this.apiBaseUrl + '/financial-management'; }
  private get baseUrl7(): string { return this.apiBaseUrl + '/diagnostics-management'; }
  private get baseUrl12(): string { return this.apiBaseUrl + '/stock-records'; }
  private get baseUrl8(): string { return this.apiBaseUrl + '/stock-item'; }
  private get baseUrl9(): string { return this.apiBaseUrl + '/assets'; }
  private get baseUrl10(): string { return this.apiBaseUrl + '/user-management'; }
  private get baseUrl11(): string { return this.apiBaseUrl + '/messages'; }
  private get baseUrlSubscription(): string { return this.apiBaseUrl + '/subscription'; }
  private get baseUrlBusinessSettings(): string { return this.apiBaseUrl + '/business-settings'; }
  private get baseUrlBackup(): string { return this.apiBaseUrl + '/backup'; }
  /** JAX-RS: StockTrackingController @Path("/stock-tracking"); app root-path is /health_care */
  private get stockTrackingBase(): string { return this.apiBaseUrl + '/stock-tracking'; }
  /** JAX-RS: ExpiryItemRegisterController @Path("/expiry-item-register") */
  private get expiryItemRegisterBase(): string { return this.apiBaseUrl + '/expiry-item-register'; }
  /** JAX-RS: StockAdjustmentController @Path("/stock-adjustment") */
  private get stockAdjustmentBase(): string { return this.apiBaseUrl + '/stock-adjustment'; }
  /** JAX-RS: AdjustmentTypeController @Path("/adjustment-type") */
  private get adjustmentTypeBase(): string { return this.apiBaseUrl + '/adjustment-type'; }
  /** JAX-RS: StockVerificationController @Path("/stock-verification") */
  private get stockVerificationBase(): string { return this.apiBaseUrl + '/stock-verification'; }
  private get stockInitializerBase(): string { return this.apiBaseUrl + '/stock-initializer'; }

  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService
  ) { }

  getItemsz() {

    return this.http.get(`${this.baseUrl3}/get-all-Items`).pipe(map((res: any) => {
      console.log(res.data);
      return res.data
      

    }))
  }

  getAllShopItems() {
    return this.http.get(`${this.baseUrl3}/get-all-Items`).pipe(
      map((res: any) => {
        if (res && res.data) {
          return res.data;
        }
        if (Array.isArray(res)) {
          return res;
        }
        return [];
      })
    );
  }

  getItemsForReOrder() {

    return this.http.get(`${this.baseUrl3}/get-all-Items-stock-below-reorder`).pipe(map((res: any) => {
      return res.data
      

    }))
  }

  getAllSuppliers() {
    return this.http.get(`${this.baseUrl3}/get-all-stock-suppliers`).pipe(
      map((res: any) => {
        console.log("Suppliers API response:", res);
        // Handle different response structures
        if (res && res.data) {
          console.log("Suppliers loaded:", res.data);
          return res.data;
        } else if (Array.isArray(res)) {
          console.log("Suppliers loaded (direct array):", res);
          return res;
        } else if (res && res.message && res.data) {
          console.log("Suppliers loaded (with message):", res.data);
          return res.data;
        } else {
          console.warn("Unexpected response structure:", res);
          return [];
        }
      }),
      catchError((error) => {
        console.error("Error in getAllSuppliers API call:", error);
        return throwError(() => error);
      })
    );
  }

  getAllSuppliersBusinessItem() {
    return this.http.get(`${this.baseUrl20}/get-all-stock-suppliers`).pipe(
      map((res: any) => {
        console.log("Suppliers API response:", res);
        if (res && res.data) {
          console.log("Suppliers loaded:", res.data);
          return res.data;
        } else if (Array.isArray(res)) {
          console.log("Suppliers loaded (direct array):", res);
          return res;
        } else if (res && res.message && res.data) {
          console.log("Suppliers loaded (with message):", res.data);
          return res.data;
        } else {
          console.warn("Unexpected response structure:", res);
          return [];
        }
      }),
      catchError((error) => {
        console.error("Error in getAllSuppliers API call:", error);
        return throwError(() => error);
      })
    );
  }

  createPurchaseOrder(data: any) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.getSessionToken()}`,
    });
    return this.http.post(`${this.baseUrl20}/purchase-orders`, data, { headers }).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  getPurchaseOrders() {
    return this.http.get(`${this.baseUrl20}/purchase-orders`).pipe(
      map((res: any) => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []))
    );
  }

  getPurchaseOrder(id: number) {
    return this.http.get(`${this.baseUrl20}/purchase-orders/${id}`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  updatePurchaseOrder(id: number, data: any) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.getSessionToken()}`,
    });
    return this.http.put(`${this.baseUrl20}/purchase-orders/${id}`, data, { headers }).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  saveSupplier(data: any) {
    const jwt = this.getSessionToken();
    console.log("JWT in header: " + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl3}/add-new-stock-supplier`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  saveSupplierBusinessItem(data: any) {
    const jwt = this.getSessionToken();
    console.log("JWT in header: " + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl20}/add-new-stock-supplier`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  // Stock Products (Consumable Products) API methods
  getAllStockItems() {
    return this.http.get(`${this.baseUrl8}/get-all-stock-items`).pipe(map((res: any) => {
      console.log("Stock items loaded:", res.data);
      return res.data;
    }))
  }

  createOrUpdateStockItem(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl8}/create-or-update-stock-item`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  getStockItemById(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.get(`${this.baseUrl8}/get-stock-item-by-id/${id}`, { headers }).pipe(map((res: any) => {
      console.log("Stock item API response (raw):", res);
      // Handle different response structures
      if (res && res.data) {
        console.log("Returning res.data:", res.data);
        return res.data;
      } else if (res && typeof res === 'object') {
        console.log("Returning res directly:", res);
        return res;
      } else {
        console.warn("Unexpected response structure:", res);
        return res;
      }
    }))
  }

  updateStockItem(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl8}/update/${id}`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  deleteStockItem(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl8}/delete/${id}`, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  getStockItemDosageRules(stockItemId: number, activeOnly = true): Observable<StockDosageRule[]> {
    const params = new HttpParams().set('activeOnly', String(activeOnly));
    return this.http.get(`${this.baseUrl8}/${stockItemId}/dosage-rules`, { params }).pipe(map((res: any) => {
      const data = res?.data;
      if (Array.isArray(data)) {
        return data;
      }
      return data ? [data] : [];
    }))
  }

  createStockItemDosageRule(stockItemId: number, data: StockDosageRulePayload) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl8}/${stockItemId}/dosage-rules`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  updateStockItemDosageRule(ruleId: number, data: StockDosageRulePayload) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl8}/dosage-rules/${ruleId}`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  deleteStockItemDosageRule(ruleId: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl8}/dosage-rules/${ruleId}`, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  getUnitSellingModels(stockItemId: number, unitCostPrice?: number | null) {
    let params = new HttpParams();
    if (unitCostPrice != null && Number.isFinite(Number(unitCostPrice))) {
      params = params.set('unitCostPrice', String(unitCostPrice));
    }
    return this.http.get(`${this.baseUrl8}/${stockItemId}/unit-selling-models`, { params }).pipe(map((res: any) => {
      return res?.data || [];
    }));
  }

  createUnitSellingModel(stockItemId: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    return this.http.post(`${this.baseUrl8}/${stockItemId}/unit-selling-models`, data, { headers }).pipe(map((res: any) => res));
  }

  updateUnitSellingModel(modelId: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    return this.http.put(`${this.baseUrl8}/unit-selling-models/${modelId}`, data, { headers }).pipe(map((res: any) => res));
  }

  deleteUnitSellingModel(modelId: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    return this.http.delete(`${this.baseUrl8}/unit-selling-models/${modelId}`, { headers }).pipe(map((res: any) => res));
  }

  getShopItemDosageRules(itemId: number, activeOnly = true): Observable<StockDosageRule[]> {
    const params = new HttpParams().set('activeOnly', String(activeOnly));
    return this.http.get(`${this.baseUrl3}/${itemId}/dosage-rules`, { params }).pipe(map((res: any) => {
      const data = res?.data;
      if (Array.isArray(data)) {
        return data;
      }
      return data ? [data] : [];
    }));
  }

  createShopItemDosageRule(itemId: number, data: StockDosageRulePayload) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    return this.http.post(`${this.baseUrl3}/${itemId}/dosage-rules`, data, { headers }).pipe(map((res: any) => res));
  }

  updateShopItemDosageRule(ruleId: number, data: StockDosageRulePayload) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    return this.http.put(`${this.baseUrl3}/dosage-rules/${ruleId}`, data, { headers }).pipe(map((res: any) => res));
  }

  deleteShopItemDosageRule(ruleId: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    return this.http.delete(`${this.baseUrl3}/dosage-rules/${ruleId}`, { headers }).pipe(map((res: any) => res));
  }

  getShopItemUnitSellingModels(itemId: number, unitCostPrice?: number | null) {
    let params = new HttpParams();
    if (unitCostPrice != null && Number.isFinite(Number(unitCostPrice))) {
      params = params.set('unitCostPrice', String(unitCostPrice));
    }
    return this.http.get(`${this.baseUrl3}/${itemId}/unit-selling-models`, { params }).pipe(map((res: any) => {
      return res?.data || [];
    }));
  }

  createShopItemUnitSellingModel(itemId: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    return this.http.post(`${this.baseUrl3}/${itemId}/unit-selling-models`, data, { headers }).pipe(map((res: any) => res));
  }

  updateShopItemUnitSellingModel(modelId: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    return this.http.put(`${this.baseUrl3}/unit-selling-models/${modelId}`, data, { headers }).pipe(map((res: any) => res));
  }

  deleteShopItemUnitSellingModel(modelId: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    return this.http.delete(`${this.baseUrl3}/unit-selling-models/${modelId}`, { headers }).pipe(map((res: any) => res));
  }

  getProcedureUnitSellingModels(procedureId: number, unitCostPrice?: number | null) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    let params = new HttpParams();
    const costText = unitCostPrice == null ? '' : String(unitCostPrice).trim();
    if (costText !== '' && Number.isFinite(Number(costText))) {
      params = params.set('unitCostPrice', costText);
    }
    return this.http.get(`${this.baseUrl5}/procedures/${procedureId}/unit-selling-models`, { headers, params }).pipe(map((res: any) => {
      return res?.data || [];
    }));
  }

  createProcedureUnitSellingModel(procedureId: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    });
    return this.http.post(`${this.baseUrl5}/procedures/${procedureId}/unit-selling-models`, data, { headers }).pipe(map((res: any) => res));
  }

  updateProcedureUnitSellingModel(modelId: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    });
    return this.http.put(`${this.baseUrl5}/procedures/unit-selling-models/${modelId}`, data, { headers }).pipe(map((res: any) => res));
  }

  deleteProcedureUnitSellingModel(modelId: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    return this.http.delete(`${this.baseUrl5}/procedures/unit-selling-models/${modelId}`, { headers }).pipe(map((res: any) => res));
  }

  filterStockItems(brandId?: number, categoryId?: number) {
    let params = new HttpParams();
    if (brandId) params = params.set('brandId', brandId.toString());
    if (categoryId) params = params.set('categoryId', categoryId.toString());
    
    return this.http.get(`${this.baseUrl8}/filter`, { params }).pipe(map((res: any) => {
      return res.data;
    }))
  }

  // Stock Batch API methods (Actual inventory tracking - stock on hand)
  getAllStockBatches(storeId?: number) {
    const params = storeId != null
      ? new HttpParams().set('storeId', String(storeId))
      : undefined;

    return this.http.get(`${this.baseUrl12}/get-all-stock-batches`, { params }).pipe(
      map((res: any) => {
        console.log("Stock batches loaded:", res?.data || res);
        return res?.data || res;
      })
    );
  }

  getStockBatchById(id: number) {
    return this.http.get(`${this.apiBaseUrl}/health_care/stock-records/get/${id}`).pipe(map((res: any) => {
      return res.data || res;
    }))
  }

  createStockBatch(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.apiBaseUrl}/health_care/stock-records/create`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  updateStockBatch(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl12}/update-stock-batch-fields/${id}`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  deleteStockBatch(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl12}/delete-stock-batch/${id}`, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  /** Expiry item register — ExpiryItemRegisterController */
  getAllExpiryItemRegisters(): Observable<any[]> {
    return this.http
      .get(`${this.expiryItemRegisterBase}/get-all-expiry-item-registers`)
      .pipe(
        map((res: any) => {
          const inner = res?.data;
          return Array.isArray(inner) ? inner : [];
        }),
        catchError((err) => {
          console.error('getAllExpiryItemRegisters failed:', err);
          return of([]);
        })
      );
  }

  addExpiryItemRegister(body: {
    stockItemId?: number | null;
    itemId?: number | null;
    batchNumber?: string | null;
    stockAtHand?: number | string | null;
    expiryDate?: string | null;
    dateOfStockRemoval?: string | null;
    removedBy?: string | null;
  }): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    return this.http
      .post(`${this.expiryItemRegisterBase}/add-new-expiry-item-register`, body, { headers })
      .pipe(
        map((res: any) => res),
        catchError((err) => throwError(() => err))
      );
  }

  // Stock Transfer API methods (JAX-RS: StockTransferController @Path /Business-item)
  getStockTransfers() {
    return this.http.get(`${this.baseUrl3}/stock-transfers`).pipe(
      map((res: any) => {
        if (Array.isArray(res)) {
          return res;
        }
        if (res?.data && Array.isArray(res.data)) {
          return res.data;
        }
        console.warn("Unexpected stock-transfers response:", res);
        return [];
      }),
      catchError((error) => {
        console.error("Error in getStockTransfers:", error);
        return throwError(() => error);
      })
    );
  }

  getStockTransfersBusinessItem() {
    return this.http.get(`${this.baseUrl20}/stock-transfers`).pipe(
      map((res: any) => {
        if (Array.isArray(res)) {
          return res;
        }
        if (res?.data && Array.isArray(res.data)) {
          return res.data;
        }
        console.warn("Unexpected stock-transfers response:", res);
        return [];
      }),
      catchError((error) => {
        console.error("Error in getStockTransfers:", error);
        return throwError(() => error);
      })
    );
  }

  // Assets API methods
  getAllAssets() {
    return this.http.get(`${this.baseUrl9}/all`).pipe(map((res: any) => {
      console.log("Assets loaded:", res.data);
      return res.data;
    }))
  }

  getAssetById(id: number) {
    return this.http.get(`${this.baseUrl9}/${id}`).pipe(map((res: any) => {
      return res.data;
    }))
  }

  addAsset(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl9}/add`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  updateAsset(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl9}/${id}`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  deleteAsset(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl9}/${id}`, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  // Stock Transfer API methods — POST body must match StockTransferRequest (stockBatchId, fromStoreId, toStoreId, qty, transferredBy)
  transferStock(data: StockTransferRequestPayload) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    const body: StockTransferRequestPayload = {
      stockBatchId: data.stockBatchId,
      fromStoreId: data.fromStoreId,
      toStoreId: data.toStoreId,
      qty: data.qty,
      transferredBy: data.transferredBy ?? '',
    };

    const url = `${this.baseUrl3}/transfer-stock`;
    console.log('[ApiService.transferStock] Sending POST', url, body);

    return this.http.post(url, body, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  transferStockBusinessItem(data: StockTransferRequestPayload) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    const body: StockTransferRequestPayload = {
      stockBatchId: data.stockBatchId,
      fromStoreId: data.fromStoreId,
      toStoreId: data.toStoreId,
      qty: data.qty,
      transferredBy: data.transferredBy ?? '',
    };

    const url = `${this.baseUrl20}/transfer-stock`;
    console.log('[ApiService.transferStock] Sending POST', url, body);

    return this.http.post(url, body, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  getTotalItemStock(id: number) {
    return this.http.get(`${this.baseUrl3}/total-item-stock/${id}`).pipe(map((res: any) => {
      return res.data || res;
    }))
  }

  // Stock Tracking API — StockTrackingController @Path("/stock-tracking")
  createStockTracking(data: StockTrackingRequestPayload) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    const body: StockTrackingRequestPayload = {
      stockItemId: data.stockItemId,
      stockBeforeTransaction: data.stockBeforeTransaction,
      transactionType: data.transactionType,
      quantityChanged: data.quantityChanged,
      stockAfterTransaction: data.stockAfterTransaction,
    };

    return this.http
      .post(`${this.stockTrackingBase}/create`, body, { headers })
      .pipe(
        map((res: any) => res),
        catchError((err) => {
          console.error('createStockTracking failed:', err);
          return throwError(() => err);
        })
      );
  }

  getAllStockTracking() {
    return this.http.get(`${this.stockTrackingBase}/all`).pipe(
      map((res: any) => {
        const data = res?.data ?? res;
        return Array.isArray(data) ? data : [];
      }),
      catchError((err) => {
        console.error('getAllStockTracking failed:', err);
        return throwError(() => err);
      })
    );
  }

  getStockTrackingById(id: number) {
    return this.http.get(`${this.stockTrackingBase}/${id}`).pipe(
      map((res: any) => res?.data ?? res),
      catchError((err) => {
        console.error('getStockTrackingById failed:', err);
        return throwError(() => err);
      })
    );
  }

  getStockTrackingByItem(stockItemId: number) {
    return this.http.get(`${this.stockTrackingBase}/item/${stockItemId}`).pipe(
      map((res: any) => {
        const data = res?.data ?? res;
        return Array.isArray(data) ? data : [];
      }),
      catchError((err) => {
        console.error('getStockTrackingByItem failed:', err);
        return throwError(() => err);
      })
    );
  }

  getTotalStockIn(stockItemId: number) {
    return this.http.get(`${this.stockTrackingBase}/total-in/${stockItemId}`).pipe(
      map((res: any) => res?.data ?? res),
      catchError((err) => {
        console.error('getTotalStockIn failed:', err);
        return throwError(() => err);
      })
    );
  }

  getTotalStockOut(stockItemId: number) {
    return this.http.get(`${this.stockTrackingBase}/total-out/${stockItemId}`).pipe(
      map((res: any) => res?.data ?? res),
      catchError((err) => {
        console.error('getTotalStockOut failed:', err);
        return throwError(() => err);
      })
    );
  }

  deleteStockTracking(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.stockTrackingBase}/delete/${id}`, { headers }).pipe(
      map((res: any) => res),
      catchError((err) => {
        console.error('deleteStockTracking failed:', err);
        return throwError(() => err);
      })
    );
  }

  // Stock Adjustment API — StockAdjustmentController @Path("/stock-adjustment")
  addStockAdjustment(data: StockAdjustmentRequestPayload) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    const body: Record<string, unknown> = {
      adjustmentTypeId: data.adjustmentTypeId,
      quantityChanged: data.quantityChanged,
    };
    if (data.stockBatchId != null && Number(data.stockBatchId) > 0) {
      body['stockBatchId'] = Number(data.stockBatchId);
    }
    if (data.itemId != null && Number(data.itemId) > 0) {
      body['itemId'] = Number(data.itemId);
    }
    if (data.reason != null && String(data.reason).trim() !== '') {
      body['reason'] = String(data.reason).trim();
    }
    if (data.date != null && String(data.date).trim() !== '') {
      body['date'] = String(data.date).trim();
    }
    if (data.doneBy != null && String(data.doneBy).trim() !== '') {
      body['doneBy'] = String(data.doneBy).trim();
    }
    return this.http
      .post(`${this.stockAdjustmentBase}/add-new-stock-adjustment`, body, { headers })
      .pipe(
        map((res: any) => res?.data ?? res),
        catchError((err) => {
          console.error('addStockAdjustment failed:', err);
          return throwError(() => err);
        })
      );
  }

  getAllStockAdjustments() {
    return this.http.get(`${this.stockAdjustmentBase}/get-all-stock-adjustments`).pipe(
      map((res: any) => {
        const d = res?.data ?? res;
        return Array.isArray(d) ? d : [];
      }),
      catchError((err) => {
        console.error('getAllStockAdjustments failed:', err);
        return throwError(() => err);
      })
    );
  }

  getStockAdjustmentById(id: number) {
    return this.http.get(`${this.stockAdjustmentBase}/get-stock-adjustment/${id}`).pipe(
      map((res: any) => res?.data ?? res),
      catchError((err) => {
        console.error('getStockAdjustmentById failed:', err);
        return throwError(() => err);
      })
    );
  }

  getStockAdjustmentsByBatch(stockBatchId: number) {
    return this.http
      .get(`${this.stockAdjustmentBase}/get-stock-adjustments-by-batch/${stockBatchId}`)
      .pipe(
        map((res: any) => {
          const d = res?.data ?? res;
          return Array.isArray(d) ? d : [];
        }),
        catchError((err) => {
          console.error('getStockAdjustmentsByBatch failed:', err);
          return throwError(() => err);
        })
      );
  }

  getStockVerificationCatalog() {
    const headers = this.authHeaders();
    return this.http.get(`${this.stockVerificationBase}/catalog`, { headers }).pipe(
      map((res: any) => res?.data ?? res),
      catchError((err) => {
        console.error('getStockVerificationCatalog failed:', err);
        return throwError(() => err);
      })
    );
  }

  getStockVerificationDashboard(storeId?: number) {
    const q = storeId != null ? `?storeId=${storeId}` : '';
    const headers = this.authHeaders();
    return this.http.get(`${this.stockVerificationBase}/dashboard${q}`, { headers }).pipe(
      map((res: any) => res?.data ?? res),
      catchError((err) => {
        console.error('getStockVerificationDashboard failed:', err);
        return throwError(() => err);
      })
    );
  }

  previewStockVerification(stockBatchId: number) {
    const headers = this.authHeaders();
    return this.http.get(`${this.stockVerificationBase}/preview/${stockBatchId}`, { headers }).pipe(
      map((res: any) => res?.data ?? res),
      catchError((err) => {
        console.error('previewStockVerification failed:', err);
        return throwError(() => err);
      })
    );
  }

  previewStockVerificationItem(itemId: number) {
    const headers = this.authHeaders();
    return this.http.get(`${this.stockVerificationBase}/preview-item/${itemId}`, { headers }).pipe(
      map((res: any) => res?.data ?? res),
      catchError((err) => {
        console.error('previewStockVerificationItem failed:', err);
        return throwError(() => err);
      })
    );
  }

  createStockVerification(body: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.stockVerificationBase}/create`, body, { headers }).pipe(
      map((res: any) => res),
      catchError((err) => {
        console.error('createStockVerification failed:', err);
        return throwError(() => err);
      })
    );
  }

  approveStockVerification(id: number, body: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.stockVerificationBase}/approve/${id}`, body, { headers }).pipe(
      map((res: any) => res),
      catchError((err) => {
        console.error('approveStockVerification failed:', err);
        return throwError(() => err);
      })
    );
  }

  getStockVerificationHistory(stockBatchId: number) {
    const headers = this.authHeaders();
    return this.http.get(`${this.stockVerificationBase}/by-batch/${stockBatchId}`, { headers }).pipe(
      map((res: any) => {
        const d = res?.data ?? res;
        return Array.isArray(d) ? d : [];
      }),
      catchError((err) => {
        console.error('getStockVerificationHistory failed:', err);
        return throwError(() => err);
      })
    );
  }

  getStockVerificationHistoryByItem(itemId: number) {
    const headers = this.authHeaders();
    return this.http.get(`${this.stockVerificationBase}/by-item/${itemId}`, { headers }).pipe(
      map((res: any) => {
        const d = res?.data ?? res;
        return Array.isArray(d) ? d : [];
      }),
      catchError((err) => {
        console.error('getStockVerificationHistoryByItem failed:', err);
        return throwError(() => err);
      })
    );
  }

  getStockInitializerDashboard(storeId?: number) {
    const q = storeId != null ? `?storeId=${storeId}` : '';
    return this.http.get(`${this.stockInitializerBase}/dashboard${q}`).pipe(
      map((res: any) => res?.data ?? res),
      catchError((err) => {
        console.error('getStockInitializerDashboard failed:', err);
        return throwError(() => err);
      })
    );
  }

  saveStockInitializerDraft(body: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.stockInitializerBase}/save-draft`, body, { headers }).pipe(
      map((res: any) => res),
      catchError((err) => {
        console.error('saveStockInitializerDraft failed:', err);
        return throwError(() => err);
      })
    );
  }

  finalizeStockInitializer(body: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.stockInitializerBase}/finalize`, body, { headers }).pipe(
      map((res: any) => res),
      catchError((err) => {
        console.error('finalizeStockInitializer failed:', err);
        return throwError(() => err);
      })
    );
  }

  // Adjustment types API — AdjustmentTypeController @Path("/adjustment-type")
  getAllAdjustmentTypes() {
    return this.http.get(`${this.adjustmentTypeBase}/get-all-adjustment-types`).pipe(
      map((res: any) => {
        const d = res?.data ?? res;
        return Array.isArray(d) ? d : [];
      }),
      catchError((err) => {
        console.error('getAllAdjustmentTypes failed:', err);
        return throwError(() => err);
      })
    );
  }

  getActiveAdjustmentTypes() {
    return this.http.get(`${this.adjustmentTypeBase}/get-active-adjustment-types`).pipe(
      map((res: any) => {
        const d = res?.data ?? res;
        return Array.isArray(d) ? d : [];
      }),
      catchError((err) => {
        console.error('getActiveAdjustmentTypes failed:', err);
        return throwError(() => err);
      })
    );
  }

  getAdjustmentTypeById(id: number) {
    return this.http.get(`${this.adjustmentTypeBase}/get-adjustment-type/${id}`).pipe(
      map((res: any) => res?.data ?? res),
      catchError((err) => {
        console.error('getAdjustmentTypeById failed:', err);
        return throwError(() => err);
      })
    );
  }

  addAdjustmentType(data: AdjustmentTypeRequestPayload) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    const body = {
      name: data.name.trim(),
      code: data.code.trim(),
      active: data.active !== false,
    };
    return this.http
      .post(`${this.adjustmentTypeBase}/add-new-adjustment-type`, body, { headers })
      .pipe(
        map((res: any) => res?.data ?? res),
        catchError((err) => {
          console.error('addAdjustmentType failed:', err);
          return throwError(() => err);
        })
      );
  }

  updateAdjustmentType(id: number, data: Partial<AdjustmentTypeRequestPayload>) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    const body: Record<string, unknown> = {};
    if (data.name != null) body['name'] = data.name;
    if (data.code != null) body['code'] = data.code;
    if (data.active != null) body['active'] = data.active;
    return this.http
      .put(`${this.adjustmentTypeBase}/update-adjustment-type/${id}`, body, { headers })
      .pipe(
        map((res: any) => res?.data ?? res),
        catchError((err) => {
          console.error('updateAdjustmentType failed:', err);
          return throwError(() => err);
        })
      );
  }

  deleteAdjustmentType(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    return this.http
      .delete(`${this.adjustmentTypeBase}/delete-adjustment-type/${id}`, { headers })
      .pipe(
        map((res: any) => res),
        catchError((err) => {
          console.error('deleteAdjustmentType failed:', err);
          return throwError(() => err);
        })
      );
  }

  // Brand API methods
  getAllBrands() {
    return this.http.get(`${this.baseUrl3}/get-all-brands`).pipe(map((res: any) => {
      console.log("Brands API response:", res);
      if (res && res.data) {
        console.log("Brands loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Brands loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected brand response structure:", res);
        return [];
      }
    }))
  }

  getAllBrandsBusinessItem() {
    return this.http.get(`${this.baseUrl20}/get-all-brands`).pipe(map((res: any) => {
      console.log("Brands API response:", res);
      if (res && res.data) {
        console.log("Brands loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Brands loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected brand response structure:", res);
        return [];
      }
    }))
  }

  addBrand(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl3}/add-new-brand`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  addBrandBusinessItem(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl20}/add-new-brand`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  updateBrand(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl3}/update-brand/${id}`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  updateBrandBusinessItem(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl20}/update-brand/${id}`, data, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  deleteBrand(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl3}/delete-brand/${id}`, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  deleteBrandBusinessItem(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl20}/delete-brand/${id}`, { headers }).pipe(map((res: any) => {
      return res;
    }))
  }

  // Manufacturer API methods
  getAllManufacturers() {
    return this.http.get(`${this.baseUrl3}/get-all-manufacturers`).pipe(
      map((res: any) => {
        console.log('Manufacturers API response:', res);
        if (res && res.data) {
          console.log('Manufacturers loaded:', res.data);
          return res.data;
        } else if (Array.isArray(res)) {
          console.log('Manufacturers loaded (direct array):', res);
          return res;
        } else {
          console.warn('Unexpected manufacturers response structure:', res);
          return [];
        }
      })
    );
  }

  getAllManufacturersBusinessItem() {
    return this.http.get(`${this.baseUrl20}/get-all-manufacturers`).pipe(
      map((res: any) => {
        console.log('Manufacturers API response:', res);
        if (res && res.data) {
          console.log('Manufacturers loaded:', res.data);
          return res.data;
        } else if (Array.isArray(res)) {
          console.log('Manufacturers loaded (direct array):', res);
          return res;
        } else {
          console.warn('Unexpected manufacturers response structure:', res);
          return [];
        }
      })
    );
  }

  addManufacturer(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl3}/add-new-manufacturer`, data, { headers }).pipe(
      map((res: any) => res)
    );
  }

  addManufacturerBusinessItem(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl20}/add-new-manufacturer`, data, { headers }).pipe(
      map((res: any) => res)
    );
  }

  updateManufacturer(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl3}/update-manufacturer/${id}`, data, { headers }).pipe(
      map((res: any) => res)
    );
  }

  updateManufacturerBusinessItem(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl20}/update-manufacturer/${id}`, data, { headers }).pipe(
      map((res: any) => res)
    );
  }

  deleteManufacturer(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl3}/delete-manufacturer/${id}`, { headers }).pipe(
      map((res: any) => res)
    );
  }

  deleteManufacturerBusinessItem(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl20}/delete-manufacturer/${id}`, { headers }).pipe(
      map((res: any) => res)
    );
  }

  // Formulation API methods
  getAllFormulations() {
    return this.http.get(`${this.baseUrl3}/all-formulations`).pipe(map((res: any) => {
      console.log("Formulations API response:", res);
      if (res && res.data) {
        console.log("Formulations loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Formulations loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected formulation response structure:", res);
        return [];
      }
    }))
  }

  getAllFormulationsBusinessItem() {
    return this.http.get(`${this.baseUrl20}/all-formulations`).pipe(map((res: any) => {
      console.log("Formulations API response:", res);
      if (res && res.data) {
        console.log("Formulations loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Formulations loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected formulation response structure:", res);
        return [];
      }
    }))
  }

  addFormulation(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl3}/add-new-formulation`, data, { headers }).pipe(
      map((res: any) => {
        console.log("Add formulation response:", res);
        return res;
      })
    );
  }

  addFormulationBusinessItem(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl20}/add-new-formulation`, data, { headers }).pipe(
      map((res: any) => {
        console.log("Add formulation response:", res);
        return res;
      })
    );
  }

  updateFormulation(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl3}/update-formulation/${id}`, data, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  updateFormulationBusinessItem(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl20}/update-formulation/${id}`, data, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  deleteFormulation(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl3}/delete-formulation/${id}`, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  deleteFormulationBusinessItem(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl20}/delete-formulation/${id}`, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  // Lowest Package API methods
  getAllLowestPackages() {
    return this.http.get(`${this.baseUrl3}/get-all-lowest-packages`).pipe(map((res: any) => {
      console.log("Lowest packages API response:", res);
      if (res && res.data) {
        console.log("Lowest packages loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Lowest packages loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected lowest package response structure:", res);
        return [];
      }
    }))
  }

  getAllLowestPackagesBusinessItem() {
    return this.http.get(`${this.baseUrl20}/get-all-lowest-packages`).pipe(map((res: any) => {
      console.log("Lowest packages API response:", res);
      if (res && res.data) {
        console.log("Lowest packages loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Lowest packages loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected lowest package response structure:", res);
        return [];
      }
    }))
  }

  addLowestPackage(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl3}/add-new-lowest-package`, data, { headers }).pipe(
      map((res: any) => {
        console.log("Add lowest package response:", res);
        return res;
      })
    );
  }

  addLowestPackageBusinessItem(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl20}/add-new-lowest-package`, data, { headers }).pipe(
      map((res: any) => {
        console.log("Add lowest package response:", res);
        return res;
      })
    );
  }

  updateLowestPackage(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl3}/update-lowest-package/${id}`, data, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  updateLowestPackageBusinessItem(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl20}/update-lowest-package/${id}`, data, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  deleteLowestPackage(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl3}/delete-lowest-package/${id}`, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  deleteLowestPackageBusinessItem(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl20}/delete-lowest-package/${id}`, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  // Item Category API methods
  getAllItemCategories() {
    return this.http.get(`${this.baseUrl3}/get-all-item-categories`).pipe(map((res: any) => {
      console.log("Item categories API response:", res);
      if (res && res.data) {
        console.log("Item categories loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Item categories loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected item category response structure:", res);
        return [];
      }
    }))
  }


  // Item Category API methods
  getAllItemCategoriesBusinessItem() {
    return this.http.get(`${this.baseUrl20}/get-all-item-categories`).pipe(map((res: any) => {
      console.log("Item categories API response:", res);
      if (res && res.data) {
        console.log("Item categories loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Item categories loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected item category response structure:", res);
        return [];
      }
    }))
  }


  getHighestParentItemCategory(id: number) {
    return this.http.get(`${this.baseUrl3}/get-highest-parent-item-category/${id}`).pipe(
      map((res: any) => {
        if (res?.data) {
          return res.data;
        }
        if (res?.result?.data) {
          return res.result.data;
        }
        return res;
      })
    );
  }

  getHighestParentItemCategoryBusinessItem(id: number) {
    return this.http.get(`${this.baseUrl20}/get-highest-parent-item-category/${id}`).pipe(
      map((res: any) => {
        if (res?.data) {
          return res.data;
        }
        if (res?.result?.data) {
          return res.result.data;
        }
        return res;
      })
    );
  }

  addItemCategory(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl3}/add-new-item-categories`, data, { headers }).pipe(
      map((res: any) => {
        console.log("Add item category response:", res);
        return res;
      })
    );
  }

  addItemCategoryBusinessItem(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl20}/add-new-item-categories`, data, { headers }).pipe(
      map((res: any) => {
        console.log("Add item category response:", res);
        return res;
      })
    );
  }

  updateItemCategory(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl3}/update-item-category/${id}`, data, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  updateItemCategoryBusinessItem(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl20}/update-item-category/${id}`, data, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  deleteItemCategory(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl3}/delete-item-category/${id}`, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  deleteItemCategoryBusinessItem(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl20}/delete-item-category/${id}`, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  // Route of Admin API methods
  getAllRoutesOfAdmin() {
    return this.http.get(`${this.baseUrl3}/get-all-route-of-admin`).pipe(map((res: any) => {
      console.log("Routes of admin API response:", res);
      if (res && res.data) {
        console.log("Routes of admin loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Routes of admin loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected route of admin response structure:", res);
        return [];
      }
    }))
  }

  getAllRoutesOfAdminBusinessItem() {
    return this.http.get(`${this.baseUrl20}/get-all-route-of-admin`).pipe(map((res: any) => {
      console.log("Routes of admin API response:", res);
      if (res && res.data) {
        console.log("Routes of admin loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Routes of admin loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected route of admin response structure:", res);
        return [];
      }
    }))
  }

  addRouteOfAdmin(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl3}/add-new-route-of-admin`, data, { headers }).pipe(
      map((res: any) => {
        console.log("Add route of admin response:", res);
        return res;
      })
    );
  }

  addRouteOfAdminBusinessItem(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl20}/add-new-route-of-admin`, data, { headers }).pipe(
      map((res: any) => {
        console.log("Add route of admin response:", res);
        return res;
      })
    );
  }

  updateRouteOfAdmin(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl3}/update-route-of-admin/${id}`, data, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  updateRouteOfAdminBusinessItem(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl20}/update-route-of-admin/${id}`, data, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  deleteRouteOfAdmin(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl3}/delete-route-of-admin/${id}`, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  deleteRouteOfAdminBusinessItem(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl20}/delete-route-of-admin/${id}`, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  // Strength Unit (Composition Unit) API methods
  getAllStrengthUnits() {
    return this.http.get(`${this.baseUrl3}/get-all-strength-units`).pipe(map((res: any) => {
      console.log("Strength units API response:", res);
      if (res && res.data) {
        console.log("Strength units loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Strength units loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected strength unit response structure:", res);
        return [];
      }
    }))
  }

  getAllStrengthUnitsBusinessItem() {
    return this.http.get(`${this.baseUrl20}/get-all-strength-units`).pipe(map((res: any) => {
      console.log("Strength units API response:", res);
      if (res && res.data) {
        console.log("Strength units loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Strength units loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected strength unit response structure:", res);
        return [];
      }
    }))
  }

  addStrengthUnit(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl3}/add-new-strength-unit`, data, { headers }).pipe(
      map((res: any) => {
        console.log("Add strength unit response:", res);
        return res;
      })
    );
  }

  addStrengthUnitBusinessItem(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl20}/add-new-strength-unit`, data, { headers }).pipe(
      map((res: any) => {
        console.log("Add strength unit response:", res);
        return res;
      })
    );
  }

  updateStrengthUnit(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl3}/update-strength-unit/${id}`, data, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  updateStrengthUnitBusinessItem(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl20}/update-strength-unit/${id}`, data, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  deleteStrengthUnit(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl3}/delete-strength-unit/${id}`, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  deleteStrengthUnitBusinessItem(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl20}/delete-strength-unit/${id}`, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  // Items (Active Ingredients) API methods
  getAllItems() {
    return this.http.get(`${this.baseUrl3}/get-all-Items`).pipe(map((res: any) => {
      console.log("Items API response:", res);
      if (res && res.data) {
        console.log("Items loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Items loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected items response structure:", res);
        return [];
      }
    }))
  }

  getAllActiveIngredients() {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
    return this.http.get(`${this.baseUrl3}/get-all-active-ingredients`, { headers }).pipe(map((res: any) => {
      if (res && res.data) {
        return res.data;
      }
      if (Array.isArray(res)) {
        return res;
      }
      return [];
    }));
  }

  getAllActiveIngredientsBusinessItem() {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
    return this.http.get(`${this.baseUrl20}/get-all-active-ingredients`, { headers }).pipe(map((res: any) => {
      if (res && res.data) {
        return res.data;
      }
      if (Array.isArray(res)) {
        return res;
      }
      return [];
    }));
  }

  addActiveIngredient(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl3}/add-new-active-ingredients`, data, { headers });
  }

  addActiveIngredientBusinessItem(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl20}/add-new-active-ingredients`, data, { headers });
  }

  updateActiveIngredientById(id: any, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
    return this.http.put(`${this.baseUrl3}/update-active-ingredient/` + id, data, { headers });
  }

  updateActiveIngredientByIdBusinessItem(id: any, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
    return this.http.put(`${this.baseUrl20}/update-active-ingredient/` + id, data, { headers });
  }

  deleteActiveIngredientById(id: number): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
    return this.http.delete(`${this.baseUrl3}/delete-active-ingredient/` + id, { headers });
  }

  deleteActiveIngredientByIdBusinessItem(id: number): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
    return this.http.delete(`${this.baseUrl20}/delete-active-ingredient/` + id, { headers });
  }

  // Strength API methods
  getAllStrengths() {
    return this.http.get(`${this.baseUrl3}/get-all-strengths`).pipe(map((res: any) => {
      console.log("Strengths API response:", res);
      if (res && res.data) {
        console.log("Strengths loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Strengths loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected strengths response structure:", res);
        return [];
      }
    }))
  }

  getAllStrengthsBusinessItem() {
    return this.http.get(`${this.baseUrl20}/get-all-strengths`).pipe(map((res: any) => {
      console.log("Strengths API response:", res);
      if (res && res.data) {
        console.log("Strengths loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Strengths loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected strengths response structure:", res);
        return [];
      }
    }))
  }

  getCompositionsByStockItemId(stockItemId: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.get(`${this.baseUrl3}/get-compositions-by-stock-item/${stockItemId}`, { headers }).pipe(map((res: any) => {
      console.log("Compositions API response:", res);
      if (res && res.data) {
        return res.data;
      } else if (Array.isArray(res)) {
        return res;
      } else {
        return [];
      }
    }))
  }

  getCompositionsByStockItemIdBusinessItem(stockItemId: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.get(`${this.baseUrl20}/get-compositions-by-stock-item/${stockItemId}`, { headers }).pipe(map((res: any) => {
      console.log("Compositions API response:", res);
      if (res && res.data) {
        return res.data;
      } else if (Array.isArray(res)) {
        return res;
      } else {
        return [];
      }
    }))
  }


  //get all services


  getAllServices() {
    return this.http.get(`${this.baseUrl5}/get-all-procedures`).pipe(
      map((res: any) => this.unwrapApiData(res))
    );
  }

  getDashboardSummary(from?: string, to?: string): Observable<any> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http.get(`${this.baseUrl5}/dashboard-summary`, { params }).pipe(
      map((res: any) => this.unwrapApiData(res))
    );
  }
  
  getAllItemsUsedInProcedure(id:any) {

    return this.http.get(`${this.baseUrl5}/items-used/${id}`).pipe(map((res: any) => {

      console.log(res.data);
      return res.data
      

    }))
  }



  getAllCategories() {

    return this.http.get(`${this.baseUrl5}/get-all-service-categories`).pipe(map((res: any) => {

      console.log(res.data);
      return res.data
      

    }))
  }

  getAllTypes() {

    return this.http.get(`${this.baseUrl5}/get-all-service-types`).pipe(map((res: any) => {

      console.log(res.data);
      return res.data
      

    }))
  }


















    
  getAllClientGroups() {

    return this.http.get(`${this.baseUrl5}/get-all-patient-groups`).pipe(map((res: any) => {

      console.log(res.data);
      return res.data
      

    }))
  }

  /** Business modules / departments for client queue routing. */
  getAllBusinessModules() {
    return this.http.get(`${this.baseUrl5}/get-all-business-modules`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  createBusinessModule(payload: {
    code?: string;
    name: string;
    description?: string;
    active?: boolean;
    sortOrder?: number;
    routeKey?: string;
    allowedRoles?: string | null;
  }) {
    return this.http.post(`${this.baseUrl5}/create-business-module`, payload).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  updateBusinessModule(id: number, payload: {
    code?: string;
    name?: string;
    description?: string;
    active?: boolean;
    sortOrder?: number;
    routeKey?: string;
    allowedRoles?: string | null;
  }) {
    return this.http.put(`${this.baseUrl5}/update-business-module/${id}`, payload).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  deleteBusinessModule(id: number) {
    return this.http.delete(`${this.baseUrl5}/delete-business-module/${id}`).pipe(
      map((res: any) => res)
    );
  }

  getBusinessClinics(moduleId?: number) {
    const params = moduleId != null ? `?moduleId=${moduleId}` : '';
    return this.http.get(`${this.baseUrl5}/get-business-clinics${params}`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  createBusinessClinic(payload: { hospitalModuleId: number; name: string; active?: boolean; allowedRoles?: string | null }) {
    return this.http.post(`${this.baseUrl5}/create-business-clinic`, payload).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  updateBusinessClinic(id: number, payload: { hospitalModuleId?: number; name?: string; active?: boolean; allowedRoles?: string | null }) {
    return this.http.put(`${this.baseUrl5}/update-business-clinic/${id}`, payload).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  deleteBusinessClinic(id: number) {
    return this.http.delete(`${this.baseUrl5}/delete-business-clinic/${id}`).pipe(
      map((res: any) => res)
    );
  }

  queueClient(payload: {
    clientId: number;
    clientVisitId?: number;
    fromModuleId: number;
    toModuleId: number;
    clinicId?: number;
    note?: string;
    visitDefaultScheme?: string;
    clientGroupId?: number;
    emergency?: boolean;
    revisit?: boolean;
    queuedBy?: string;
  }) {
    return this.http.post(`${this.baseUrl5}/queue-patient`, payload).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  dischargeClientFromQueue(payload: {
    clientId: number;
    clientVisitId?: number;
    fromModuleId?: number;
    note?: string;
    dischargedBy?: string;
  }) {
    return this.http.post(`${this.baseUrl5}/discharge-patient-from-queue`, payload).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  dischargeClientQueueEntry(id: number) {
    return this.http.patch(`${this.baseUrl5}/discharge-patient-queue-entry/${id}`, {}).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  getClientQueueEntries(toModuleId?: number, status?: string) {
    const params = this.buildQueueScopeParams();
    if (toModuleId != null) {
      params.set('toModuleId', String(toModuleId));
    }
    if (status) {
      params.set('status', status);
    }
    return this.http.get(`${this.baseUrl5}/get-patient-queue-entries?${params.toString()}`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  getLatestClientQueueEntries(
    limit: number = 100,
    view: 'current' | 'discharged' | 'referred' = 'current',
    /** When set, only clients queued to this department (current page). */
    pageModuleId?: number | null
  ) {
    const params = this.buildQueueScopeParams(pageModuleId);
    params.set('limit', String(limit));
    params.set('view', view);
    return this.http.get(
      `${this.baseUrl5}/get-latest-patient-queue-entries?${params.toString()}`
    ).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  /** Role + user-assigned departments/rooms for queue filtering. */
  private buildQueueScopeParams(pageModuleId?: number | null): URLSearchParams {
    const params = new URLSearchParams();
    const role = sessionStorage.getItem('userrole') || '';
    params.set('role', role);
    const roleNorm = role.toLowerCase().trim();

    let assignedModuleIds = '';
    if (pageModuleId != null && pageModuleId > 0) {
      assignedModuleIds = String(pageModuleId);
    } else {
      assignedModuleIds =
        sessionStorage.getItem('queuePageModuleId') ||
        sessionStorage.getItem('activeModuleId') ||
        sessionStorage.getItem('assignedModuleIds') ||
        '';
      if ((roleNorm === 'pharmacist' || roleNorm === 'pharmacy') && !assignedModuleIds) {
        const pharmacyId = sessionStorage.getItem('pharmacyModuleId');
        if (pharmacyId) {
          assignedModuleIds = pharmacyId;
        }
      }
    }

    const assignedClinicIds =
      sessionStorage.getItem('activeClinicId') ||
      sessionStorage.getItem('assignedClinicIds') ||
      '';
    if (assignedModuleIds) {
      params.set('assignedModuleIds', assignedModuleIds);
    }
    if (assignedClinicIds) {
      params.set('assignedClinicIds', assignedClinicIds);
    }
    return params;
  }

  updateTreatmentStatus(treatmentId: number | string, status: string): Observable<any> {
    return this.updateTreatmentLifecycleFlags(treatmentId, { status });
  }

  updateTreatmentLifecycleFlags(
    treatmentId: number | string,
    flags: {
      status?: string;
      paid?: boolean;
      dispensed?: boolean;
      administered?: boolean;
    }
  ): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    const body: Record<string, unknown> = {};
    if (flags.status != null && String(flags.status).trim() !== '') {
      body['status'] = flags.status;
    }
    if (flags.paid != null) {
      body['paid'] = flags.paid;
    }
    if (flags.dispensed != null) {
      body['dispensed'] = flags.dispensed;
    }
    if (flags.administered != null) {
      body['administered'] = flags.administered;
    }
    return this.http.patch(
      `${this.baseUrl5}/update-treatment-status/${treatmentId}`,
      body,
      { headers }
    ).pipe(map((res: any) => res?.data ?? res));
  }

  updateClientQueueEntry(id: number, payload: {
    emergency?: boolean;
    revisit?: boolean;
    note?: string;
    visitDefaultScheme?: string;
    clientGroupId?: number;
    fromModuleId?: number;
    toModuleId?: number;
    clinicId?: number;
    queuePosition?: number;
    status?: string;
    queuedBy?: string;
  }) {
    return this.http.patch(`${this.baseUrl5}/update-patient-queue-entry/${id}`, payload).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  getBusinessDirectory() {
    return this.http.get(`${this.baseUrl5}/get-business-directory`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  callClientQueueEntry(id: number) {
    return this.http.patch(`${this.baseUrl5}/call-patient-queue-entry/${id}`, {}).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  serveClientQueueEntry(id: number) {
    return this.http.patch(`${this.baseUrl5}/serve-patient-queue-entry/${id}`, {}).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  completeClientQueueEntry(id: number) {
    return this.http.patch(`${this.baseUrl5}/complete-patient-queue-entry/${id}`, {}).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  cancelClientQueueEntry(id: number) {
    return this.http.patch(`${this.baseUrl5}/cancel-patient-queue-entry/${id}`, {}).pipe(
      map((res: any) => res?.data ?? res)
    );
  }




    getAllExpenseCategories() {

    return this.http.get(`${this.baseUrl6}/get-all-expense-categories`).pipe(map((res: any) => {

      console.log(res.data);
      return res.data
      

    }))
  }



      getAllExpenseCategoriesExpenseAccount() {

    return this.http.get(`${this.baseUrl6}/get-all-expense-accounts`).pipe(map((res: any) => {

      console.log(res.data);
      return res.data
      

    }))
  }

  

  getAllStockReceived() {

    // Cache-bust so a just-saved receive is not served from a stale GET.
    const params = new HttpParams().set('_', String(Date.now()));
    return this.http.get(`${this.baseUrl3}/get-all-stock-receives`, { params }).pipe(map((res: any) => {
      console.log('getAllStockReceived raw:', res);
      if (Array.isArray(res)) {
        return res;
      }
      if (Array.isArray(res?.data)) {
        return res.data;
      }
      if (Array.isArray(res?.result?.data)) {
        return res.result.data;
      }
      if (Array.isArray(res?.content)) {
        return res.content;
      }
      return [];
    }))
  }


  getAllStockReceivedBusinessItem() {

    return this.http.get(`${this.baseUrl20}/get-all-stock-receives`).pipe(map((res: any) => {
      console.log(res.data);
      return res.data
      

    }))
  }


  updateSystem() {

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });


    return this.http.put(`${this.baseUrl5}/fix-procedure-requested-names/`, { headers }).pipe(map((res: any) => {
      console.log("this is my message",res.message);
      return res
      
  
    }))

  }




  takeVitals(id: any, data: any) {

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    //return this.http.post(this.baseUrl,data);
    //return this.http.post(`${this.baseUrl5}/create-new-InitialTriageVitals/`+ id, data, { headers });



    return this.http.post(`${this.baseUrl5}/create-new-InitialTriageVitals/` + id, data, { headers }).pipe(map((res: any) => {
      console.log("this is my message",res.message);
      return res
      
  
    }))

  }

  saveProcedure(id: any, data: any) {

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

  return this.http.post(`${this.baseUrl5}/create-new-procedure-requested/` + id, data, { headers }).pipe(map((res: any) => {
    console.log("this is my message",res.message);
    return res
    

  }))

}





savePayment(id: any, data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.post(`${this.baseUrl5}/create-new-payment/` + id, data, { headers }).pipe(map((res: any) => {
  console.log("this is my message",res.message);
  return res
  

}))

}

payAllClientDebt(clientId: any, data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrl5}/pay-all-patient-debt/${clientId}`, data, { headers }).pipe(
    map((res: any) => res)
  );
}







saveExpenseAccount(data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.post(`${this.baseUrl6}/create-new-expense-account`,data, { headers }).pipe(map((res: any) => {
  console.log("this is my message",res.message);
  return res
  

}))

}






saveExpense(data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.post(`${this.baseUrl6}/create-new-expense-transaction`, data, { headers }).pipe(map((res: any) => {
  console.log("this is my message",res.message);
  return res
  

}))

}









updateInvoiceWithDiscountAndTax(id: any, data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.put(`${this.baseUrl5}/update-invoice/` + id, data, { headers }).pipe(map((res: any) => {
  console.log("this is my message",res.message);
  return res
  

}))

}





createExpenseCategory(data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.post(`${this.baseUrl6}/create-new-expense-category`,data, { headers }).pipe(map((res: any) => {
  console.log("this is my message",res.message);
  return res
  

}))

}

updateExpenseCategory(id: number, data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  return this.http.put(`${this.baseUrl6}/update-expense-category/` + id, data, { headers }).pipe(map((res: any) => res));
}

deleteExpenseCategory(id: number): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  return this.http.delete(`${this.baseUrl6}/delete-expense-category/` + id, { headers });
}

updateExpenseAccount(id: number, data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  return this.http.put(`${this.baseUrl6}/update-expense-account/` + id, data, { headers }).pipe(map((res: any) => res));
}

deleteExpenseAccount(id: number): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  return this.http.delete(`${this.baseUrl6}/delete-expense-account/` + id, { headers });
}

updateExpenseTransaction(id: number, data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  return this.http.put(`${this.baseUrl6}/update-expense-transaction/` + id, data, { headers }).pipe(map((res: any) => res));

}







saveItem(data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.post(`${this.baseUrl3}/add-new-Items`, data, { headers }).pipe(map((res: any) => {
  //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  

}))

}


//new procedure or service

saveNewService(data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.post(`${this.baseUrl5}/create-new-procedure`, data, { headers }).pipe(map((res: any) => {
  //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  
}))

}



saveNewType(data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.post(`${this.baseUrl5}/create-new-service-type`, data, { headers }).pipe(map((res: any) => {
  //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  
}))

}



saveNewCategory(data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.post(`${this.baseUrl5}/add-new-procedure-categories`, data, { headers }).pipe(map((res: any) => {
  //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  
}))

}








saveItemUsedInService(data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.post(`${this.baseUrl5}/add-itemUsed`, data, { headers }).pipe(map((res: any) => {
  //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  

}))

}


updateServiceById(id:any,data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.put(`${this.baseUrl5}/update-service/` + id, data, { headers }).pipe(map((res: any) => {
    //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  

}))

}




updateTypeById(id:any,data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.put(`${this.baseUrl5}/update-service-type/` + id, data, { headers }).pipe(map((res: any) => {
    //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  

}))

}




updateCategoryById(id:any,data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.put(`${this.baseUrl5}/update-procedure-category/` + id, data, { headers }).pipe(map((res: any) => {
    //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  

}))

}


//update item



updateItemById(id:any,data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.put(`${this.baseUrl3}/update-item/` + id, data, { headers }).pipe(map((res: any) => {
    //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  

}))

}












// receive stock

receiveNewStock(data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);
  console.log("Sending data to receive-new-stock:", JSON.stringify(data, null, 2));

  if (!jwt) {
    console.error("No JWT token found!");
    return throwError(() => new Error("Authentication token not found"));
  }

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  });

// Must hit receive-new-stock (creates a Stock row + bumps item stock).
// /receive-stock only updates the shop item and does not appear in get-all-stock-receives.
const receiveUrl = `${this.baseUrl3}/receive-new-stock`;
console.info('[ApiService.receiveNewStock] POST', receiveUrl, data);
return this.http.post(receiveUrl, data, { headers }).pipe(
  map((res: any) => {
    console.info('[ApiService.receiveNewStock] response', res);
    return res;
  }),
  catchError((error) => {
    console.error("Error in receiveNewStock API call:", error);
    console.error("Error status:", error.status);
    console.error("Error message:", error.message);
    console.error("Error error:", error.error);
    return throwError(() => error);
  })
)

}

receiveNewStockBusinessItem(data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);
  console.log("Sending data to receive-new-stock:", JSON.stringify(data, null, 2));

  if (!jwt) {
    console.error("No JWT token found!");
    return throwError(() => new Error("Authentication token not found"));
  }

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  });

return this.http.post(`${this.baseUrl20}/receive-new-stock`, data, { headers }).pipe(
  map((res: any) => {
    console.log("Response from receive-new-stock:", res);
    return res;
  }),
  catchError((error) => {
    console.error("Error in receiveNewStock API call:", error);
    console.error("Error status:", error.status);
    console.error("Error message:", error.message);
    console.error("Error error:", error.error);
    return throwError(() => error);
  })
)

}






getItemByItsId(id: any) {

    return this.http.get(`${this.baseUrl3}/${id}`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );

}











saveTreatmentRequested(id: any, data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.post(`${this.baseUrl5}/create-new-treatmentRequest/` + id, data, { headers }).pipe(map((res: any) => {
  //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  

}))

}

updateTreatment(id: any, data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.put(`${this.baseUrl5}/update-treatmentRequest/` + id, data, { headers }).pipe(map((res: any) => {
  //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  

}))

}








// consultation

saveConsultation(id: any, data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.post(`${this.baseUrl5}/create-new-Consultation/` + id, data, { headers }).pipe(map((res: any) => {
  //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  

}))

}

  getConsultationDocumentsByVisit(visitId: number | string) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http
      .get(`${this.baseUrl5}/get-consultation-documents-by-visit/${visitId}`, { headers })
      .pipe(map((res: any) => res?.data ?? res));
  }

  createConsultationDocument(
    visitId: number | string,
    payload: {
      fileName: string;
      fileUrl: string;
      contentType?: string;
      fileSizeBytes?: number;
      description?: string;
      uploadedBy?: string;
    }
  ) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http
      .post(`${this.baseUrl5}/create-consultation-document/${visitId}`, payload, { headers })
      .pipe(map((res: any) => res?.data ?? res));
  }

  deleteConsultationDocument(documentId: number | string) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http
      .delete(`${this.baseUrl5}/delete-consultation-document/${documentId}`, { headers })
      .pipe(map((res: any) => res));
  }






updateScanReport(id: any, data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.put(`${this.baseUrl7}/update-scan-report/` + id, data, { headers }).pipe(map((res: any) => {
  //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  

}))

}


updateLabReport(id: any, data: any) {

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

return this.http.put(`${this.baseUrl7}/update-malaria-report/` + id, data, { headers }).pipe(map((res: any) => {
  //console.log("this is my message",res.message);
  //console.log("this is my res",res);

  return res
  

}))

}










  addClient(data: any): Observable<any>  {

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    //return this.http.post(this.baseUrl,data);
    return this.http.post(`${this.baseUrl5}/create-new-patient`, data, { headers }).pipe(map((res: any) => {
      console.log("this is my message",res.message);
      return res
      

    }))
  }

  // Update client by id
  updateClientById(id: number, data: any): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl5}/update-patient/${id}`, data, { headers }).pipe(
      map((res: any) => {
        console.log("Client update response", res);
        return res;
      })
    );
  }



   createClientGroup(data: any): Observable<any>  {

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    //return this.http.post(this.baseUrl,data);
    return this.http.post(`${this.baseUrl5}/create-new-patient-group`, data, { headers }).pipe(map((res: any) => {
      console.log("this is my message",res.message);
      return res
      

    }))
  }

  updateClientGroup(id: number | string, data: any): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    return this.http
      .put(`${this.baseUrl5}/update-patient-group/${id}`, data, { headers })
      .pipe(map((res: any) => res));
  }







  addItem(data: any) {

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    //return this.http.post(this.baseUrl,data);
    return this.http.post(`${this.baseUrl3}/add-new-Items`, data, { headers });

  }




  createNewVisit(id: any, data: any) {

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    //return this.http.post(this.baseUrl,data);
    //return this.http.post(`${this.baseUrl5}/create-new-patient-visit/`+ id, data, { headers });


    return this.http.post(`${this.baseUrl5}/create-new-patient-visit/`+ id, data, { headers }).pipe(map((res: any) => {
      console.log("res",res);

      console.log("res data",res.data);
      return res
      

    }))

  }


  updateVisit(id: number, data: any) {

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });


    return this.http.put(`${this.baseUrl5}/update-patient-visit/` + id, data, { headers });
      
  }

  deleteClientVisit(id: number, userRole?: string) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    const role = encodeURIComponent(userRole || sessionStorage.getItem('userRole') || '');
    return this.http.delete(`${this.baseUrl5}/delete-patient-visit/${id}?userRole=${role}`, { headers });
  }

  




  getSessionToken(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.startsWith('sessionToken=')) {
        const token = trimmed.substring('sessionToken='.length);
        if (token) {
          return token;
        }
      }
    }
    const stored = sessionStorage.getItem('jwt');
    return stored && stored.trim() ? stored.trim() : null;
  }

  private authHeaders(): HttpHeaders {
    const jwt = this.getSessionToken();
    return jwt ? new HttpHeaders({ Authorization: `Bearer ${jwt}` }) : new HttpHeaders();
  }

  /** Normalizes mother-server JSON (`{ message, data }`) to an array or object. */
  private unwrapApiData(res: any): any {
    if (res == null) return [];
    if (Array.isArray(res)) return res;
    const data = res.data ?? res.result ?? res;
    return data ?? [];
  }

  getItems() {
    return this.http.get(`${this.baseUrl5}/get-all-patients`).pipe(
      map((res: any) => {
        const data = this.unwrapApiData(res);
        return Array.isArray(data) ? data : [];
      })
    );
  }

  /** Alias: client list for newer components. */
  getAllClients() {
    return this.getItems();
  }

  getClientById(id: number | string) {
    return this.http.get(`${this.baseUrl5}/get-patient/${id}`).pipe(map((res: any) => {
      const payload = res?.data ?? res?.client ?? res;
      if (payload && typeof payload === 'object' && payload.data) {
        return payload.data;
      }
      return payload;
    }));
  }

  /** OpenAI-compatible chat/completions proxy for Doctor Assistant agent. */
  doctorAssistantLlmChat(body: {
    messages: unknown[];
    tools?: unknown[];
    model?: string;
    apiKey?: string;
    temperature?: number;
  }) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl5}/doctor-assistant/llm-chat`, body, { headers }).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  /** Whether the server has a free/paid LLM provider configured (Groq, Ollama, etc.). */
  doctorAssistantLlmConfig() {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.get(`${this.baseUrl5}/doctor-assistant/llm-config`, { headers }).pipe(
      map((res: any) => res?.data ?? res)
    );
  }




  getClientsWithDebt() {

    return this.http.get(`${this.baseUrl5}/get-all-patients-with-debts`).pipe(map((res: any) => {
      console.log(res.data);
      return res.data
      

    }))
  }

  
  getClientsInGroup(id: any) {

    return this.http.get(`${this.baseUrl5}/get-all-patients-in-group/${id}`).pipe(map((res: any) => {
      console.log(res.data);
      return res.data
      

    }))
  }

  getAllScanProceduresRequested() {
    return this.http.get(`${this.baseUrl5}/get-all-ultrasound-scan-procedures`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }


  getAllLabProceduresRequested() {
    return this.http.get(`${this.baseUrl5}/get-all-lab-procedures`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }



  getInitialTriageVitalsForVisitId(id: any) {
    return this.http.get(`${this.baseUrl5}/get-patient-Visit-List-by-id/${id}`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }

  /** Lightweight visits/orders for pickers (no nested vitals/invoices). */
  listPatientVisitSummaries(patientId: number | string) {
    return this.http.get(`${this.baseUrl5}/get-patient-visit-summaries-by-id/${patientId}`).pipe(
      map((res: any) => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []))
    );
  }

  getConsultationForVisitId(id:any){
    return this.http.get(`${this.baseUrl5}/get-patient-Visit-List-by-id/${id}`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }

  getInitialVisitForClientId(id: any) {
    return this.http.get(`${this.baseUrl5}/get-latest-patient-visit-by-patient-id/${id}`).pipe(
      map((res: any) => {
        console.log(res?.data);
        return res?.data ?? null;
      })
    );
  }

  /** Full visit row for editing (per-visit demographics and metadata). */
  getClientVisitByVisitId(visitId: number | string) {
    return this.http.get(`${this.baseUrl5}/get-patient-visit-by-visit-id/${visitId}`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }




  getInvoiceForVisitId(id: any) {
    return this.http.get(`${this.baseUrl5}/get-invoice-by-visit-id/${id}`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }


  

/// bulk

addBulkItems(items: any[]) {
  return this.http.post(`${this.baseUrl3}/add-new-bulk-items`, items);
}

addBulkServices(items: any[]) {
  return this.http.post(`${this.baseUrl5}/create-bulk-procedures`, items);
}



addBulkClients(items: any[]) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrl5}/create-multiple-patients`, items, { headers });
}


  getDrugList() {
    return this.http.get(`${this.baseUrl3}/get-drugs`).pipe(
      map((res: any) => {
        console.log("all drugs", res);
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
      })
    );
  }


  getStoreList() {
    return this.http.get(`${this.baseUrl5}/get-all-stores`).pipe(
      map((res: any) => {
        console.log("all drugs",res.data);
        return res.data;
      })
    );
  }

  // Store Management API methods
  getAllStores() {
    return this.http.get(`${this.baseUrl5}/get-all-stores`).pipe(map((res: any) => {
      console.log("Stores API response:", res);
      if (res && res.data) {
        console.log("Stores loaded:", res.data);
        return res.data;
      } else if (Array.isArray(res)) {
        console.log("Stores loaded (direct array):", res);
        return res;
      } else {
        console.warn("Unexpected stores response structure:", res);
        return [];
      }
    }))
  }

  createStore(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.post(`${this.baseUrl5}/create-new-store`, data, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  updateStore(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.put(`${this.baseUrl5}/update-store/${id}`, data, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  deleteStore(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl5}/delete-store/${id}`, { headers }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }




    getExpenseAccountList() {
    return this.http.get(`${this.baseUrl6}/get-all-expense-accounts`).pipe(
      map((res: any) => {
        console.log("all drugs",res.data);
        return res.data;
      })
    );
  }


    getExpenseCategoryList() {
    return this.http.get(`${this.baseUrl6}/get-all-expense-categories`).pipe(
      map((res: any) => {
        console.log("all drugs",res.data);
        return res.data;
      })
    );
  }





  getLabTestList() {
    return this.http.get(`${this.baseUrl5}/get-all-labTest-procedures`).pipe(
      map((res: any) => this.unwrapApiData(res))
    );
  }

  getScanList() {
    return this.http.get(`${this.baseUrl5}/get-all-scan-procedures`).pipe(
      map((res: any) => this.unwrapApiData(res))
    );
  }

  getAllProcedureList() {
    return this.http.get(`${this.baseUrl5}/get-all-procedures`).pipe(
      map((res: any) => this.unwrapApiData(res))
    );
  }

  getAllProcedureCategories() {
    return this.http.get(`${this.baseUrl5}/get-all-procedure-categories`).pipe(
      map((res: any) => {
        const rows = res?.data ?? res;
        console.log('procedure categories', rows);
        return Array.isArray(rows) ? rows : [];
      })
    );
  }



  getOtherProcedureList() {
    return this.http.get(`${this.baseUrl5}/get-all-procedures`).pipe(
      map((res: any) => this.unwrapApiData(res))
    );
  }

  getOtherServiceList() {
    return this.http.get(`${this.baseUrl5}/get-all-procedure-categories`).pipe(
      map((res: any) => {
        const rows = res?.data || res;
        console.log("service categories (procedure categories)", rows);
        return Array.isArray(rows) ? rows : [];
      })
    );
  }

  deleteProcedureCategoryById(id: number): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
    return this.http.delete(`${this.baseUrl5}/delete-procedure-category/` + id, { headers });
  }


  getOtherServiceListType() {
    return this.http.get(`${this.baseUrl5}/get-all-service-types/`).pipe(
      map((res: any) => {
        console.log("other procedures",res.data);
        return res.data;
      })
    );
  }








  getClientGroupList() {
    return this.http.get(`${this.baseUrl5}/get-all-patient-groups`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }

  getClientGroupByGroupName(id: any) {
    return this.http.get(`${this.baseUrl5}/get-patient-group-by-id/${id}`).pipe(
      map((res: any) => {
        //console.log("this is the group",res.data);
        return res.data;
      })
    );
  }
  
  

  getPaymentsMadeByVisit(id: any){
    return this.http.get(`${this.baseUrl5}/get-payment-List-by-visit-id/${id}`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }


  
  getAllExpensesMade(){
    return this.http.get(`${this.baseUrl6}/get-all-expense-transactions`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }

  getAllLoans() {
    return this.http.get(`${this.baseUrl6}/get-all-loans`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  saveLoan(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl6}/create-new-loan`, data, { headers }).pipe(map((res: any) => res));
  }

  updateLoan(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.put(`${this.baseUrl6}/update-loan/` + id, data, { headers }).pipe(map((res: any) => res));
  }

  recordLoanRepayment(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl6}/record-loan-repayment/` + id, data, { headers }).pipe(map((res: any) => res));
  }

  deleteLoan(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.delete(`${this.baseUrl6}/delete-loan/` + id, { headers }).pipe(map((res: any) => res));
  }

  getIncomeSummary(params?: { dateFrom?: string; dateTo?: string; accountType?: string }) {
    let url = `${this.baseUrl6}/get-income-summary`;
    const q: string[] = [];
    if (params?.dateFrom) q.push(`dateFrom=${encodeURIComponent(params.dateFrom)}`);
    if (params?.dateTo) q.push(`dateTo=${encodeURIComponent(params.dateTo)}`);
    if (q.length) url += '?' + q.join('&');
    return this.http.get(url).pipe(map((res: any) => res));
  }

  getAllIncomeEntries(params?: { dateFrom?: string; dateTo?: string; accountType?: string }) {
    let url = `${this.baseUrl6}/get-all-income-entries`;
    const q: string[] = [];
    if (params?.dateFrom) q.push(`dateFrom=${encodeURIComponent(params.dateFrom)}`);
    if (params?.dateTo) q.push(`dateTo=${encodeURIComponent(params.dateTo)}`);
    if (params?.accountType) q.push(`accountType=${encodeURIComponent(params.accountType)}`);
    if (q.length) url += '?' + q.join('&');
    return this.http.get(url).pipe(map((res: any) => res?.data ?? res));
  }

  saveIncomeEntry(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl6}/create-new-income-entry`, data, { headers }).pipe(map((res: any) => res));
  }

  updateIncomeEntry(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.put(`${this.baseUrl6}/update-income-entry/` + id, data, { headers }).pipe(map((res: any) => res));
  }

  deleteIncomeEntry(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.delete(`${this.baseUrl6}/delete-income-entry/` + id, { headers }).pipe(map((res: any) => res));
  }

  getIncomeCategoryList() {
    return this.http.get(`${this.baseUrl6}/get-all-income-categories`).pipe(map((res: any) => res?.data ?? res));
  }

  createIncomeCategory(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl6}/create-new-income-category`, data, { headers }).pipe(map((res: any) => res));
  }

  updateIncomeCategory(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.put(`${this.baseUrl6}/update-income-category/` + id, data, { headers }).pipe(map((res: any) => res));
  }

  deleteIncomeCategory(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.delete(`${this.baseUrl6}/delete-income-category/` + id, { headers }).pipe(map((res: any) => res));
  }

  getIncomeAccountList() {
    return this.http.get(`${this.baseUrl6}/get-all-income-accounts`).pipe(map((res: any) => res?.data ?? res));
  }

  saveIncomeAccount(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl6}/create-new-income-account`, data, { headers }).pipe(map((res: any) => res));
  }

  updateIncomeAccount(id: number, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.put(`${this.baseUrl6}/update-income-account/` + id, data, { headers }).pipe(map((res: any) => res));
  }

  deleteIncomeAccount(id: number) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.delete(`${this.baseUrl6}/delete-income-account/` + id, { headers }).pipe(map((res: any) => res));
  }

  getIncomePaymentMethodList() {
    return this.http.get(`${this.baseUrl6}/get-all-income-payment-methods`).pipe(map((res: any) => res?.data ?? res));
  }

  createIncomePaymentMethod(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl6}/create-new-income-payment-method`, data, { headers }).pipe(map((res: any) => res));
  }

  getIncomeSourceList() {
    return this.http.get(`${this.baseUrl6}/get-all-income-sources`).pipe(map((res: any) => res?.data ?? res));
  }

  createIncomeSource(data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl6}/create-new-income-source`, data, { headers }).pipe(map((res: any) => res));
  }


  getLabTestProceduresByVisit(id: any){
    return this.http.get(`${this.baseUrl5}/get-procedure-Requested-with-type-LabTest-by-visit-id/${id}`).pipe(
      map((res: any) => {
        console.log("list of inital vitals",res.data);
        return res.data;
      })
    );
  }

  getInitialVitalsByVisit(id: any){
    return this.http.get(`${this.baseUrl5}/get-Initial-TriageVitals-visit-by-id/${id}`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }

  getOtherProceduresByVisit(id: any){
    return this.http.get(`${this.baseUrl5}/get-all-procedures-requested-by-visit-id/${id}`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }




  getConsultationsByVisit(id: any){
    return this.http.get(`${this.baseUrl5}/get-consultations-visit-by-id/${id}`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }

  getDiagnosesByVisit(visitId: number | string) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.get(`${this.baseUrl5}/get-diagnoses-by-visit/${visitId}`, { headers }).pipe(
      map((res: any) => res?.data ?? res ?? [])
    );
  }

  createDiagnosis(visitId: number | string, data: { name: string; severity?: string; kind?: string; notes?: string }) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl5}/create-diagnosis/${visitId}`, data, { headers }).pipe(
      map((res: any) => res)
    );
  }

  getAllDiagnosisTypes() {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.get(`${this.baseUrl5}/get-all-diagnosis-types`, { headers }).pipe(
      map((res: any) => (res?.data != null ? res.data : Array.isArray(res) ? res : []))
    );
  }

  createDiagnosisType(data: { title: string; description?: string }) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl5}/create-new-diagnosis-type`, data, { headers }).pipe(
      map((res: any) => res)
    );
  }

  updateDiagnosisType(id: number | string, data: { title: string; description?: string }) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.put(`${this.baseUrl5}/update-diagnosis-type/${id}`, data, { headers }).pipe(
      map((res: any) => res)
    );
  }

  deleteDiagnosisType(id: number | string) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.delete(`${this.baseUrl5}/delete-diagnosis-type/${id}`, { headers }).pipe(
      map((res: any) => res)
    );
  }

  updateDiagnosis(id: number | string, data: { name: string; severity?: string; kind?: string; notes?: string }) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.put(`${this.baseUrl5}/update-diagnosis/${id}`, data, { headers }).pipe(
      map((res: any) => res)
    );
  }

  deleteDiagnosis(id: number | string) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.delete(`${this.baseUrl5}/delete-diagnosis/${id}`, { headers }).pipe(
      map((res: any) => res)
    );
  }

  getPresentingComplaintsByVisit(visitId: number | string) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.get(`${this.baseUrl5}/get-presenting-complaints-by-visit/${visitId}`, { headers }).pipe(
      map((res: any) => res?.data ?? res ?? [])
    );
  }

  createPresentingComplaint(visitId: number | string, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl5}/create-presenting-complaint/${visitId}`, data, { headers }).pipe(
      map((res: any) => res)
    );
  }

  updatePresentingComplaint(id: number | string, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.put(`${this.baseUrl5}/update-presenting-complaint/${id}`, data, { headers }).pipe(
      map((res: any) => res)
    );
  }

  deletePresentingComplaint(id: number | string) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.delete(`${this.baseUrl5}/delete-presenting-complaint/${id}`, { headers }).pipe(
      map((res: any) => res)
    );
  }

  getPhysicalExaminationsByVisit(visitId: number | string) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.get(`${this.baseUrl5}/get-physical-examinations-by-visit/${visitId}`, { headers }).pipe(
      map((res: any) => res?.data ?? res ?? [])
    );
  }

  createPhysicalExamination(visitId: number | string, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.post(`${this.baseUrl5}/create-physical-examination/${visitId}`, data, { headers }).pipe(
      map((res: any) => res)
    );
  }

  updatePhysicalExamination(id: number | string, data: any) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.put(`${this.baseUrl5}/update-physical-examination/${id}`, data, { headers }).pipe(
      map((res: any) => res)
    );
  }

  deletePhysicalExamination(id: number | string) {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    return this.http.delete(`${this.baseUrl5}/delete-physical-examination/${id}`, { headers }).pipe(
      map((res: any) => res)
    );
  }

getScanReportByRequestId(id: number) {
  return this.http.get(`${this.baseUrl7}/get-scan-report-by-request-id/${id}`);
}

getLabReportByRequestId(id: number) {
  return this.http.get(`${this.baseUrl7}/get-malaria-report-by-request-id/${id}`);
}

getParasitologyStoolReportByRequestId(id: number) {
  return this.http.get(`${this.baseUrl7}/get-parasitology-stool-report-by-request-id/${id}`);
}

createParasitologyStoolReportByRequestId(id: number, data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.post(`${this.baseUrl7}/create-parasitology-stool-report/` + id, data, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

createParasitologyStoolReportByRequest(data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.post(`${this.baseUrl7}/create-parasitology-stool-report`, data, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

updateParasitologyStoolReport(id: any, data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.put(`${this.baseUrl7}/update-parasitology-stool-report/` + id, data, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

getCbcReportByRequestId(id: number) {
  return this.http.get(`${this.baseUrl7}/get-cbc-report-by-request-id/${id}`);
}

updateCbcReport(id: any, data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.put(`${this.baseUrl7}/update-cbc-report/` + id, data, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

getUrinalysisReportByRequestId(id: number) {
  return this.http.get(`${this.baseUrl7}/get-urinalysis-report-by-request-id/${id}`);
}

createUrinalysisReportByRequestId(id: number, data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.post(`${this.baseUrl7}/create-urinalysis-report/` + id, data, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

createUrinalysisReportByRequest(data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.post(`${this.baseUrl7}/create-urinalysis-report`, data, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

updateUrinalysisReport(id: any, data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.put(`${this.baseUrl7}/update-urinalysis-report/` + id, data, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

getGeneralLabReportByRequestId(id: number) {
  return this.http.get(`${this.baseUrl7}/get-general-lab-report-by-request-id/${id}`);
}

createGeneralLabReportByRequestId(id: number, data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.post(`${this.baseUrl7}/create-general-lab-report/` + id, data, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

createGeneralLabReportByRequest(data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.post(`${this.baseUrl7}/create-general-lab-report`, data, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

updateGeneralLabReport(id: any, data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.put(`${this.baseUrl7}/update-general-lab-report/` + id, data, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

getAllDentalProceduresRequested() {
  return this.http.get(`${this.baseUrl5}/get-all-dental-procedures`).pipe(
    map((res: any) => {
      const procedures = res.data || res || [];
      console.log('Dental procedures from API endpoint:', procedures);
      console.log('Number of dental procedures:', Array.isArray(procedures) ? procedures.length : 0);
      return Array.isArray(procedures) ? procedures : [];
    }),
    catchError((error) => {
      console.error('Error loading dental procedures from endpoint:', error);
      return [];
    })
  );
}

getAllMaternityProceduresRequested() {
  return this.http.get(`${this.baseUrl5}/get-all-maternity-procedures`).pipe(
    map((res: any) => {
      const procedures = res?.data ?? res ?? [];
      return Array.isArray(procedures) ? procedures : [];
    }),
    catchError((error) => {
      console.error('Error loading maternity procedures from endpoint:', error);
      return [];
    })
  );
}

getAllComplaints() {
  return this.http.get(`${this.baseUrl5}/get-all-complaints`).pipe(
    map((res: any) => {
      console.log(res.data);
      return res.data;
    })
  );
}

getAllComplaintTypes() {
  return this.http.get(`${this.baseUrl5}/get-all-complaint-types`).pipe(
    map((res: any) => {
      console.log(res.data);
      return res.data;
    })
  );
}

createComplaintType(data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrl5}/create-new-complaint-type`, data, { headers }).pipe(
    map((res: any) => {
      console.log(res);
      return res;
    })
  );
}

updateComplaintType(id: number | string, data: { title: string; description?: string }) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http.put(`${this.baseUrl5}/update-complaint-type/${id}`, data, { headers }).pipe(
    map((res: any) => res)
  );
}

deleteComplaintType(id: number | string) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http.delete(`${this.baseUrl5}/delete-complaint-type/${id}`, { headers }).pipe(
    map((res: any) => res)
  );
}

getAllSites() {
  return this.http.get(`${this.baseUrl5}/get-all-sites`).pipe(
    map((res: any) => {
      console.log(res.data);
      return res.data;
    })
  );
}

createSite(data: any) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrl5}/create-new-site`, data, { headers }).pipe(
    map((res: any) => {
      console.log(res);
      return res;
    })
  );
}

updateSite(id: number | string, data: { title: string; description?: string }) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http.put(`${this.baseUrl5}/update-complaint-site/${id}`, data, { headers }).pipe(
    map((res: any) => res)
  );
}

deleteSite(id: number | string) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http.delete(`${this.baseUrl5}/delete-complaint-site/${id}`, { headers }).pipe(
    map((res: any) => res)
  );
}

getAllComplaintOptions(category?: string) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  let params = new HttpParams();
  if (category != null && String(category).trim() !== '') {
    params = params.set('category', String(category).trim());
  }
  return this.http.get(`${this.baseUrl5}/get-all-complaint-options`, { headers, params }).pipe(
    map((res: any) => (res?.data != null ? res.data : Array.isArray(res) ? res : []))
  );
}

createComplaintOption(data: { category: string; title: string; description?: string }) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http.post(`${this.baseUrl5}/create-new-complaint-option`, data, { headers }).pipe(
    map((res: any) => res)
  );
}

updateComplaintOption(id: number | string, data: { category: string; title: string; description?: string }) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http.put(`${this.baseUrl5}/update-complaint-option/${id}`, data, { headers }).pipe(
    map((res: any) => res)
  );
}

deleteComplaintOption(id: number | string) {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http.delete(`${this.baseUrl5}/delete-complaint-option/${id}`, { headers }).pipe(
    map((res: any) => res)
  );
}

getAllClientVisits(options?: { fromDate?: string; toDate?: string }): Observable<any[]> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  let params = new HttpParams();
  if (options?.fromDate) params = params.set('fromDate', options.fromDate);
  if (options?.toDate) params = params.set('toDate', options.toDate);
  return this.http.get(`${this.baseUrl5}/get-all-patients-visits`, { headers, params }).pipe(
    map((res: any) => res?.data != null ? res.data : (Array.isArray(res) ? res : []))
  );
}

filterVisits(query: FilterVisitsQuery): Observable<any[]> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  let params = new HttpParams();
  if (query.visitGroup != null && String(query.visitGroup).trim() !== '') {
    params = params.set('visitGroup', String(query.visitGroup).trim());
  }
  if (query.clientGroupId != null && !Number.isNaN(Number(query.clientGroupId))) {
    params = params.set('clientGroupId', String(query.clientGroupId));
  }
  if (query.datefrom != null && String(query.datefrom).trim() !== '') {
    params = params.set('datefrom', String(query.datefrom).trim());
  }
  if (query.dateto != null && String(query.dateto).trim() !== '') {
    params = params.set('dateto', String(query.dateto).trim());
  }
  if (query.clientName != null && String(query.clientName).trim() !== '') {
    params = params.set('clientName', String(query.clientName).trim());
  }
  if (query.diagnosis != null && String(query.diagnosis).trim() !== '') {
    params = params.set('diagnosis', String(query.diagnosis).trim());
  }
  if (query.procedureId != null && !Number.isNaN(Number(query.procedureId))) {
    params = params.set('procedureId', String(query.procedureId));
  }
  if (query.ageFrom != null && !Number.isNaN(Number(query.ageFrom))) {
    params = params.set('ageFrom', String(query.ageFrom));
  }
  if (query.ageTo != null && !Number.isNaN(Number(query.ageTo))) {
    params = params.set('ageTo', String(query.ageTo));
  }
  if (query.clientGender != null && String(query.clientGender).trim() !== '') {
    params = params.set('clientGender', String(query.clientGender).trim());
  }
  if (query.weightFrom != null && !Number.isNaN(Number(query.weightFrom))) {
    params = params.set('weightFrom', String(query.weightFrom));
  }
  if (query.weightTo != null && !Number.isNaN(Number(query.weightTo))) {
    params = params.set('weightTo', String(query.weightTo));
  }
  if (query.treatmentItemId != null && !Number.isNaN(Number(query.treatmentItemId))) {
    params = params.set('treatmentItemId', String(query.treatmentItemId));
  }
  if (query.treatmentDrugName != null && String(query.treatmentDrugName).trim() !== '') {
    params = params.set('treatmentDrugName', String(query.treatmentDrugName).trim());
  }
  if (query.hasDebt === true) {
    params = params.set('hasDebt', 'true');
  } else if (query.hasDebt === false) {
    params = params.set('hasDebt', 'false');
  }
  return this.http.get(`${this.baseUrl5}/filter-visits`, { headers, params }).pipe(
    map((res: any) =>
      res?.data != null ? res.data : Array.isArray(res) ? res : []
    )
  );
}

/** HMIS 033b weekly epidemiological aggregate JSON for a date range. */
getHmis033bAggregate(datefrom: string, dateto: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  let params = new HttpParams()
    .set('from', String(datefrom || '').trim())
    .set('to', String(dateto || '').trim());
  return this.http.get(`${this.apiBaseUrl}/hmis/033b/aggregate`, { headers, params }).pipe(
    map((res: any) => (res?.data != null ? res.data : res))
  );
}

/** HMIS 033b weekly report PDF (official template overlay). */
exportHmis033bPdf(datefrom: string, dateto: string): Observable<Blob> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  let params = new HttpParams()
    .set('from', String(datefrom || '').trim())
    .set('to', String(dateto || '').trim());
  return this.http.get(`${this.apiBaseUrl}/hmis/033b/pdf`, {
    headers,
    params,
    responseType: 'blob',
  });
}

/** HMIS 105 monthly outpatient report PDF (official template overlay). */
exportHmis105Pdf(datefrom: string, dateto: string): Observable<Blob> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  let params = new HttpParams()
    .set('from', String(datefrom || '').trim())
    .set('to', String(dateto || '').trim());
  return this.http.get(`${this.apiBaseUrl}/hmis/105/pdf`, {
    headers,
    params,
    responseType: 'blob',
  });
}

getHmisTracerItems(datefrom?: string, dateto?: string): Observable<any[]> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  let params = new HttpParams();
  if (datefrom?.trim()) {
    params = params.set('from', datefrom.trim());
  }
  if (dateto?.trim()) {
    params = params.set('to', dateto.trim());
  }
  return this.http.get(`${this.apiBaseUrl}/hmis/tracer-items`, { headers, params }).pipe(
    map((res: any) => (res?.data != null ? res.data : res))
  );
}

updateHmisTracerItem(id: number, payload: { stockItemId?: number | null; shopItemId?: number | null }): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http.put(`${this.apiBaseUrl}/hmis/tracer-items/${id}`, payload, { headers }).pipe(
    map((res: any) => (res?.data != null ? res.data : res))
  );
}

/** Group invoice summary PDF for filtered visits (date range + visit group, etc.). */
exportGroupInvoicePeriodPdf(query: FilterVisitsQuery): Observable<Blob> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  let params = new HttpParams();
  if (query.visitGroup != null && String(query.visitGroup).trim() !== '') {
    params = params.set('visitGroup', String(query.visitGroup).trim());
  }
  if (query.clientGroupId != null && !Number.isNaN(Number(query.clientGroupId))) {
    params = params.set('clientGroupId', String(query.clientGroupId));
  }
  if (query.datefrom != null && String(query.datefrom).trim() !== '') {
    params = params.set('datefrom', String(query.datefrom).trim());
  }
  if (query.dateto != null && String(query.dateto).trim() !== '') {
    params = params.set('dateto', String(query.dateto).trim());
  }
  if (query.clientName != null && String(query.clientName).trim() !== '') {
    params = params.set('clientName', String(query.clientName).trim());
  }
  if (query.diagnosis != null && String(query.diagnosis).trim() !== '') {
    params = params.set('diagnosis', String(query.diagnosis).trim());
  }
  if (query.procedureId != null && !Number.isNaN(Number(query.procedureId))) {
    params = params.set('procedureId', String(query.procedureId));
  }
  if (query.ageFrom != null && !Number.isNaN(Number(query.ageFrom))) {
    params = params.set('ageFrom', String(query.ageFrom));
  }
  if (query.ageTo != null && !Number.isNaN(Number(query.ageTo))) {
    params = params.set('ageTo', String(query.ageTo));
  }
  if (query.clientGender != null && String(query.clientGender).trim() !== '') {
    params = params.set('clientGender', String(query.clientGender).trim());
  }
  if (query.weightFrom != null && !Number.isNaN(Number(query.weightFrom))) {
    params = params.set('weightFrom', String(query.weightFrom));
  }
  if (query.weightTo != null && !Number.isNaN(Number(query.weightTo))) {
    params = params.set('weightTo', String(query.weightTo));
  }
  if (query.treatmentItemId != null && !Number.isNaN(Number(query.treatmentItemId))) {
    params = params.set('treatmentItemId', String(query.treatmentItemId));
  }
  if (query.treatmentDrugName != null && String(query.treatmentDrugName).trim() !== '') {
    params = params.set('treatmentDrugName', String(query.treatmentDrugName).trim());
  }
  if (query.hasDebt === true) {
    params = params.set('hasDebt', 'true');
  } else if (query.hasDebt === false) {
    params = params.set('hasDebt', 'false');
  }
  return this.http.get(`${this.baseUrl5}/group/invoice-period/generate-pdf`, {
    headers,
    params,
    responseType: 'blob',
  });
}

/** Compassion-style group medical invoice Word export for filtered visits. */
exportGroupInvoicePeriodDocx(query: FilterVisitsQuery): Observable<Blob> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  let params = new HttpParams();
  if (query.visitGroup != null && String(query.visitGroup).trim() !== '') {
    params = params.set('visitGroup', String(query.visitGroup).trim());
  }
  if (query.clientGroupId != null && !Number.isNaN(Number(query.clientGroupId))) {
    params = params.set('clientGroupId', String(query.clientGroupId));
  }
  if (query.datefrom != null && String(query.datefrom).trim() !== '') {
    params = params.set('datefrom', String(query.datefrom).trim());
  }
  if (query.dateto != null && String(query.dateto).trim() !== '') {
    params = params.set('dateto', String(query.dateto).trim());
  }
  if (query.clientName != null && String(query.clientName).trim() !== '') {
    params = params.set('clientName', String(query.clientName).trim());
  }
  if (query.diagnosis != null && String(query.diagnosis).trim() !== '') {
    params = params.set('diagnosis', String(query.diagnosis).trim());
  }
  if (query.procedureId != null && !Number.isNaN(Number(query.procedureId))) {
    params = params.set('procedureId', String(query.procedureId));
  }
  if (query.ageFrom != null && !Number.isNaN(Number(query.ageFrom))) {
    params = params.set('ageFrom', String(query.ageFrom));
  }
  if (query.ageTo != null && !Number.isNaN(Number(query.ageTo))) {
    params = params.set('ageTo', String(query.ageTo));
  }
  if (query.clientGender != null && String(query.clientGender).trim() !== '') {
    params = params.set('clientGender', String(query.clientGender).trim());
  }
  if (query.weightFrom != null && !Number.isNaN(Number(query.weightFrom))) {
    params = params.set('weightFrom', String(query.weightFrom));
  }
  if (query.weightTo != null && !Number.isNaN(Number(query.weightTo))) {
    params = params.set('weightTo', String(query.weightTo));
  }
  if (query.treatmentItemId != null && !Number.isNaN(Number(query.treatmentItemId))) {
    params = params.set('treatmentItemId', String(query.treatmentItemId));
  }
  if (query.treatmentDrugName != null && String(query.treatmentDrugName).trim() !== '') {
    params = params.set('treatmentDrugName', String(query.treatmentDrugName).trim());
  }
  if (query.hasDebt === true) {
    params = params.set('hasDebt', 'true');
  } else if (query.hasDebt === false) {
    params = params.set('hasDebt', 'false');
  }
  const primaryUrl = `${this.baseUrl5}/group/invoice-period/generate-docx`;
  const docxRequest = (baseClientManagement: string) =>
    this.http.get(`${baseClientManagement}/group/invoice-period/generate-docx`, {
      headers,
      params,
      responseType: 'blob',
    });

  if (!isAngularDevServer()) {
    return docxRequest(this.baseUrl5);
  }

  const devBase = `${getDevProxyBase()}/Client-management`;
  const normalizedActive = this.baseUrl5.replace(/\/+$/, '');
  if (devBase.replace(/\/+$/, '') === normalizedActive) {
    return docxRequest(this.baseUrl5);
  }

  return docxRequest(this.baseUrl5).pipe(
    catchError(() => docxRequest(devBase))
  );
}

createTreatmentChart(treatmentRequestedId: number, data: any): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrl5}/create-treatment-chart/${treatmentRequestedId}`, data, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

updateTreatmentChart(id: number, data: any): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.put(`${this.baseUrl5}/update-treatment-chart/${id}`, data, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

getTreatmentChartByRequestId(treatmentRequestedId: number): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrl5}/get-treatment-chart-by-request-id/${treatmentRequestedId}`, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

getTreatmentChartsByRequestId(treatmentRequestedId: number | string): Observable<any[]> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http
    .get(`${this.baseUrl5}/get-treatment-charts-by-request-id/${treatmentRequestedId}/all`, { headers })
    .pipe(
      map((res: any) => (res?.data != null ? res.data : Array.isArray(res) ? res : []))
    );
}

getTreatmentChartsByVisitId(visitId: number | string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrl5}/get-treatment-charts-by-visit-id/${visitId}`, { headers }).pipe(
    map((res: any) => res?.data != null ? res.data : (Array.isArray(res) ? res : []))
  );
}

deleteTreatmentChart(id: number): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrl5}/delete-treatment-chart/${id}`, {}, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

createVisitSundry(visitId: number, data: { stockBatchId?: number; itemId?: number; quantity: number; usedBy?: string }): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrl5}/create-visit-sundry/${visitId}`, data, { headers });
}

getVisitSundriesByVisitId(visitId: number | string): Observable<any[]> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrl5}/get-visit-sundries-by-visit-id/${visitId}`, { headers }).pipe(
    map((res: any) => (res?.data != null ? res.data : Array.isArray(res) ? res : []))
  );
}

deleteVisitSundry(id: number): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.delete(`${this.baseUrl5}/delete-visit-sundry/${id}`, { headers });
}

// User Management Methods
getAllUsers(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrl10}/get-all-users`, { headers }).pipe(map((res: any) => {
    console.log(res.data);
    return res.data;
  }));
}

/**
 * Public staff directory for marketing pages (landing team carousel).
 * Always reads from api.venerandahospital.org (same host as Contact Us).
 * Backend allows unauthenticated GET /user-management/get-all-users.
 */
getPublicUsers(): Observable<any[]> {
  const headers = new HttpHeaders({ [SKIP_CONNECTION_HEADER]: '1' });
  return this.http
    .get(`${API_VENERANDA_PUBLIC_BASE}/user-management/get-all-users`, { headers })
    .pipe(
      map((res: any) => {
        const data = res?.data ?? res;
        return Array.isArray(data) ? data : [];
      }),
      catchError(() => of([]))
    );
}

createUser(data: any): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrl10}/create-user`, data, { headers }).pipe(map((res: any) => {
    console.log("user created", res);
    return res;
  }));
}

getSubscriptionStatus(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrlSubscription}/status`, { headers }).pipe(
    map((res: any) => {
      const payload = res?.data ?? res;
      if (payload && typeof payload === 'object' && payload.data != null && payload.active == null) {
        return payload.data;
      }
      return payload;
    })
  );
}

activateSubscription(token: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrlSubscription}/activate`, { token }, { headers }).pipe(map((res: any) => res));
}

cancelSubscription(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrlSubscription}/cancel`, {}, { headers }).pipe(map((res: any) => res));
}

getMobileMoneyProviders(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrlSubscription}/mobile-money/providers`, { headers }).pipe(map((res: any) => res));
}

initiateMobileMoneyPayment(data: {
  provider: string;
  phoneNumber: string;
  amount: number;
  currency?: string;
  note?: string;
}): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrlSubscription}/mobile-money/pay`, data, { headers }).pipe(map((res: any) => res));
}

getMobileMoneyPaymentStatus(referenceId: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http
    .get(`${this.baseUrlSubscription}/mobile-money/status/${encodeURIComponent(referenceId)}`, { headers })
    .pipe(map((res: any) => res));
}



getFlutterwaveProviders(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http.get(`${this.baseUrlSubscription}/flutterwave/providers`, { headers }).pipe(map((res: any) => res));
}

initiateFlutterwavePayment(data: {
  phoneNumber: string;
  amount: number;
  currency?: string;
  network?: string;
  email?: string;
  description?: string;
}): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http.post(`${this.baseUrlSubscription}/flutterwave/pay`, data, { headers }).pipe(map((res: any) => res));
}

getFlutterwavePaymentStatus(referenceId: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http
    .get(`${this.baseUrlSubscription}/flutterwave/status/${encodeURIComponent(referenceId)}`, { headers })
    .pipe(map((res: any) => res));
}

getFlutterwaveSettings(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http
    .get(`${this.baseUrlSubscription}/flutterwave/settings`, { headers })
    .pipe(map((res: any) => res?.data ?? res));
}

saveFlutterwaveSettings(data: any): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http
    .put(`${this.baseUrlSubscription}/flutterwave/settings`, data, { headers })
    .pipe(map((res: any) => res));
}
getDGatewayProviders(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrlSubscription}/dgateway/providers`, { headers }).pipe(map((res: any) => res));
}

initiateDGatewayPayment(data: {
  phoneNumber?: string;
  amount: number;
  currency?: string;
  description?: string;
  method?: string;
}): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrlSubscription}/dgateway/pay`, data, { headers }).pipe(map((res: any) => res));
}

getDGatewayPaymentStatus(referenceId: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http
    .get(`${this.baseUrlSubscription}/dgateway/status/${encodeURIComponent(referenceId)}`, { headers })
    .pipe(map((res: any) => res));
}

getDGatewaySettings(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http
    .get(`${this.baseUrlSubscription}/dgateway/settings`, { headers })
    .pipe(map((res: any) => res?.data ?? res));
}

saveDGatewaySettings(data: any): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http
    .put(`${this.baseUrlSubscription}/dgateway/settings`, data, { headers })
    .pipe(map((res: any) => res));
}
getMobileMoneySettings(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http
    .get(`${this.baseUrlSubscription}/mobile-money/settings`, { headers })
    .pipe(map((res: any) => res?.data ?? res));
}

saveMobileMoneySettings(data: any): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http
    .put(`${this.baseUrlSubscription}/mobile-money/settings`, data, { headers })
    .pipe(map((res: any) => res));
}

getBusinessSettings(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  return this.http.get(`${this.baseUrlBusinessSettings}`, { headers }).pipe(map((res: any) => res.data));
}

/** Pre-login branding (name/logo) from the connected server — no JWT required. */
getPublicBusinessSettings(): Observable<any> {
  const headers = new HttpHeaders({ 'X-Skip-Connection-Modal': '1' });
  return this.http
    .get(`${this.baseUrlBusinessSettings}/public`, { headers })
    .pipe(map((res: any) => res?.data ?? res));
}

updateBusinessSettings(data: any): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  return this.http.put(`${this.baseUrlBusinessSettings}`, data, { headers }).pipe(map((res: any) => res.data));
}

getBackupSettings(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  return this.http.get(`${this.baseUrlBackup}/settings`, { headers }).pipe(map((res: any) => res.data));
}

saveBackupSettings(data: any): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  return this.http.put(`${this.baseUrlBackup}/settings`, data, { headers }).pipe(map((res: any) => res));
}

runBackupNow(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  return this.http.post(`${this.baseUrlBackup}/run-now`, {}, { headers }).pipe(map((res: any) => res));
}

restoreBackupNow(source: 'local' | 'dropbox', path?: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  let url = `${this.baseUrlBackup}/restore-now?source=${encodeURIComponent(source)}`;
  const trimmed = (path || '').trim();
  if (trimmed) {
    url += `&path=${encodeURIComponent(trimmed)}`;
  }
  return this.http.post(url, {}, { headers }).pipe(map((res: any) => res));
}

logoutDropboxBackup(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ 'Authorization': `Bearer ${jwt}` });
  return this.http.post(`${this.baseUrlBackup}/dropbox-logout`, {}, { headers }).pipe(map((res: any) => res));
}

updateUser(id: number, data: any): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.put(`${this.baseUrl10}/update-user/${id}`, data, { headers }).pipe(map((res: any) => {
    console.log("this is my message", res.message);
    return res;
  }));
}

updateProfilePic(id: number, profilePic: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.put(`${this.baseUrl10}/update-profile-pic/${id}`, { profilePic }, { headers }).pipe(map((res: any) => {
    return res;
  }));
}

/** Persist locked UI defaults (e.g. registry page size). Pass null to clear. */
updateUiPreferences(
  id: number,
  prefs: { registryItemsPerPage?: number | null }
): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    Authorization: `Bearer ${jwt}`,
  });
  return this.http
    .put(`${this.baseUrl10}/update-ui-preferences/${id}`, prefs, { headers })
    .pipe(map((res: any) => res));
}

updatePassword(id: number, oldPassword: string, newPassword: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.put(
    `${this.baseUrl10}/update-password/${id}`,
    { oldPassword, newPassword },
    { headers }
  ).pipe(
    map((res: any) => res)
  );
}

getRoleEndpointAccessCatalog(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http
    .get(`${this.baseUrl10}/role-endpoint-access/catalog`, { headers })
    .pipe(map((res: any) => res?.data ?? res));
}

getAllRoleEndpointAccess(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  return this.http
    .get(`${this.baseUrl10}/role-endpoint-access`, { headers })
    .pipe(map((res: any) => res?.data ?? res));
}

getRoleEndpointAccess(role: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  const encoded = encodeURIComponent(role);
  return this.http
    .get(`${this.baseUrl10}/role-endpoint-access/${encoded}`, { headers })
    .pipe(map((res: any) => res?.data ?? res));
}

updateRoleEndpointAccess(role: string, endpointKeys: string[]): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({ Authorization: `Bearer ${jwt}` });
  const encoded = encodeURIComponent(role);
  return this.http
    .put(`${this.baseUrl10}/role-endpoint-access/${encoded}`, { endpointKeys }, { headers })
    .pipe(map((res: any) => res));
}

  private readonly cloudinaryCloudName = 'dynslbiy1';
  private readonly cloudinaryUploadPreset = 'profile_upload';

  uploadProfilePictureToCloudinary(file: File): Observable<string> {
    return this.uploadFileToCloudinary(file, 'image', 'profile-pictures');
  }

  /** Product catalog images — same Cloudinary unsigned preset as profile pictures. */
  uploadProductImageToCloudinary(file: File): Observable<string> {
    return this.uploadFileToCloudinary(file, 'image', 'product-images');
  }

  /**
   * Product image upload with progress (0–100).
   * Emits progress updates, then a final event with `done: true` and `url`.
   */
  uploadProductImageToCloudinaryWithProgress(
    file: File
  ): Observable<{ progress: number; done?: boolean; url?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.cloudinaryUploadPreset);
    formData.append('folder', 'product-images');

    return this.http
      .post<any>(
        `https://api.cloudinary.com/v1_1/${this.cloudinaryCloudName}/image/upload`,
        formData,
        { reportProgress: true, observe: 'events' }
      )
      .pipe(
        map((event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total || file.size || 1;
            const progress = Math.min(99, Math.round((100 * (event.loaded || 0)) / total));
            return { progress };
          }
          if (event.type === HttpEventType.Response) {
            const url = event.body?.secure_url;
            if (!url) {
              throw new Error('Cloudinary upload succeeded but secure_url was missing.');
            }
            return { progress: 100, done: true, url: String(url) };
          }
          return { progress: 0 };
        }),
        filter((e) => e.progress > 0 || !!e.done),
        catchError((err: any) => {
          const cloudinaryMessage =
            err?.error?.error?.message ||
            err?.error?.message ||
            (typeof err?.error === 'string' ? err.error : null);
          const message = cloudinaryMessage || err?.message || 'Cloudinary upload failed.';
          return throwError(() => new Error(message));
        })
      );
  }

  /** Absolute URL for a saved local product-image path (/stock-item/local-images/...). */
  resolveLocalProductImageUrl(localUrl: string | null | undefined): string | null {
    const value = String(localUrl || '').trim();
    if (!value) {
      return null;
    }
    // Never treat base64 data URLs as local folder images.
    if (value.toLowerCase().startsWith('data:') || value.toLowerCase().includes(';base64,')) {
      return null;
    }
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:')) {
      return value;
    }
    const path = value.startsWith('/') ? value : `/${value}`;
    return `${this.apiBaseUrl}${path}`;
  }

  /**
   * Copy an image file into the PC product-images folder on disk.
   * Returns relative localUrl only — never stores base64/image bytes in the DB.
   */
  saveProductImageLocally(file: File): Observable<{ localUrl: string; fileName?: string; localPath?: string }> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http
      .post<any>(`${this.baseUrl8}/local-images/upload`, formData, { headers })
      .pipe(
        map((res: any) => {
          const data = res?.data || res || {};
          const localUrl = String(data.localUrl || '').trim();
          if (!localUrl) {
            throw new Error('Local image save did not return a localUrl.');
          }
          if (localUrl.toLowerCase().startsWith('data:')) {
            throw new Error('Server returned an invalid local image URL.');
          }
          return {
            localUrl,
            fileName: data.fileName ? String(data.fileName) : undefined,
            localPath: data.localPath ? String(data.localPath) : undefined,
          };
        })
      );
  }

  /** Reject base64/data URLs — DB may only store http(s) or /stock-item/local-images/... */
  sanitizeProductImageUrlForDb(value: string | null | undefined): string | null {
    const text = String(value || '').trim();
    if (!text) {
      return null;
    }
    const lower = text.toLowerCase();
    if (lower.startsWith('data:') || lower.includes(';base64,')) {
      return null;
    }
    return text;
  }

  /**
   * Download a web image into the PC product-images folder.
   * Optionally updates StockItem.imageLocal / imageLocal2 / imageLocal3.
   */
  cacheProductImageFromWebUrl(
    webUrl: string,
    options?: { stockItemId?: number | null; slot?: 1 | 2 | 3 }
  ): Observable<{ localUrl: string; fileName?: string; localPath?: string }> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    return this.http
      .post<any>(
        `${this.baseUrl8}/local-images/cache-from-url`,
        {
          webUrl,
          stockItemId: options?.stockItemId ?? null,
          slot: options?.slot ?? 1,
        },
        { headers }
      )
      .pipe(
        map((res: any) => {
          const data = res?.data || res || {};
          const localUrl = String(data.localUrl || '').trim();
          if (!localUrl) {
            throw new Error('Local image cache did not return a localUrl.');
          }
          return {
            localUrl,
            fileName: data.fileName ? String(data.fileName) : undefined,
            localPath: data.localPath ? String(data.localPath) : undefined,
          };
        })
      );
  }

  /** Consultation tab documents — same unsigned preset as profile pictures; images use image API, other files use raw. */
  uploadConsultationDocumentToCloudinary(visitId: number | string, file: File): Observable<string> {
    const folder = `consultation-documents/visit-${visitId}`;
    const resourceType = this.cloudinaryResourceTypeForFile(file);
    return this.uploadFileToCloudinary(file, resourceType, folder);
  }

  private cloudinaryResourceTypeForFile(file: File): 'image' | 'raw' {
    const type = (file.type || '').toLowerCase();
    if (type.startsWith('image/')) {
      return 'image';
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
    return imageExts.includes(ext) ? 'image' : 'raw';
  }

  private uploadFileToCloudinary(
    file: File,
    resourceType: 'image' | 'raw' | 'auto',
    folder?: string
  ): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.cloudinaryUploadPreset);
    if (folder) {
      formData.append('folder', folder);
    }

    return this.http
      .post<any>(
        `https://api.cloudinary.com/v1_1/${this.cloudinaryCloudName}/${resourceType}/upload`,
        formData
      )
      .pipe(
        map((res: any) => {
          const url = res?.secure_url;
          if (!url) {
            throw new Error('Cloudinary upload succeeded but secure_url was missing.');
          }
          return String(url);
        }),
        catchError((err: any) => {
          const cloudinaryMessage =
            err?.error?.error?.message ||
            err?.error?.message ||
            (typeof err?.error === 'string' ? err.error : null);
          const message = cloudinaryMessage || err?.message || 'Cloudinary upload failed.';
          return throwError(() => new Error(message));
        })
      );
  }

/**
 * Backend: POST user-management/profile-picture/presigned-upload
 * Body: { userId, fileName, contentType }
 * Returns presigned S3 PUT URL plus the public file URL to store on the user record.
 * Response shape (any of): { data: { uploadUrl, fileUrl } } | { uploadUrl, fileUrl | publicUrl }
 */
getProfilePicturePresignedUpload(payload: {
  userId: number;
  fileName: string;
  contentType: string;
}): Observable<{ uploadUrl: string; fileUrl: string }> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  });
  return this.http
    .post<any>(`${this.baseUrl10}/profile-picture/presigned-upload`, payload, { headers })
    .pipe(
      map((res: any) => {
        const d = res?.data ?? res;
        const uploadUrl = d?.uploadUrl ?? d?.url;
        const fileUrl =
          d?.fileUrl ?? d?.publicUrl ?? d?.profilePicUrl ?? d?.assetUrl ?? d?.location;
        if (!uploadUrl || !fileUrl) {
          throw new Error(
            'Could not get S3 upload URL from server. Ensure profile-picture/presigned-upload is implemented.'
          );
        }
        return { uploadUrl: String(uploadUrl), fileUrl: String(fileUrl) };
      })
    );
}

/**
 * PUT the file to the presigned S3 URL. Emits 0–100 for upload progress, then completes.
 * Headers must match what the backend signed (usually Content-Type).
 */
uploadFileToPresignedUrl(
  uploadUrl: string,
  file: Blob,
  contentType: string
): Observable<number> {
  return new Observable<number>((observer) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (ev: ProgressEvent) => {
      if (ev.lengthComputable) {
        observer.next(Math.min(100, Math.round((ev.loaded / ev.total) * 100)));
      }
    };
    xhr.onerror = () => observer.error(new Error('Network error while uploading to storage'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        observer.next(100);
        observer.complete();
      } else {
        observer.error(
          new Error(xhr.responseText || xhr.statusText || `Upload failed (${xhr.status})`)
        );
      }
    };
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');
    xhr.send(file);
    return () => xhr.abort();
  });
}

getAllRoles(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrl10}/get-all-roles`, { headers }).pipe(map((res: any) => {
    const data = res?.data ?? res;
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.name)) {
      return data.name.map((role: string) => ({ name: role }));
    }
    return data;
  }));
}

createRole(name: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrl10}/create-role`, { name }, { headers });
}

updateRoleName(oldName: string, newName: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.put(`${this.baseUrl10}/update-role`, { oldName, newName }, { headers });
}

deleteRole(name: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  const encoded = encodeURIComponent(name);
  return this.http.delete(`${this.baseUrl10}/delete-role/${encoded}`, { headers });
}

getAllTitles(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrl10}/get-all-titles`, { headers }).pipe(map((res: any) => {
    console.log(res.data);
    return res.data;
  }));
}

getAllStaff(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrl10}/get-all-staff`, { headers }).pipe(map((res: any) => {
    console.log(res.data);
    return res.data;
  }));
}

// Messaging API Methods
getAllConversations(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrl11}/conversations`, { headers }).pipe(map((res: any) => {
    console.log('Conversations:', res.data);
    return res.data || [];
  }));
}

getMessagesUnreadCount(): Observable<number> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrl11}/unread-count`, { headers }).pipe(
    map((res: any) => Number(res?.data?.totalUnread ?? res?.totalUnread ?? 0) || 0)
  );
}

getConversationMessages(conversationId: number): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrl11}/conversations/${conversationId}/messages`, { headers }).pipe(map((res: any) => {
    console.log('Messages:', res.data);
    return res.data || [];
  }));
}

createConversation(recipientId: number): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrl11}/conversations`, { recipientId }, { headers }).pipe(map((res: any) => {
    console.log('Conversation created:', res.data);
    return res.data;
  }));
}

sendMessage(conversationId: number, text: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.post(`${this.baseUrl11}/conversations/${conversationId}/messages`, { text }, { headers }).pipe(map((res: any) => {
    console.log('Message sent:', res.data);
    return res.data;
  }));
}

getAvailableUsers(): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.get(`${this.baseUrl11}/users`, { headers }).pipe(map((res: any) => {
    console.log('Available users:', res.data);
    return res.data || [];
  }));
}

submitCustomerCareMessage(payload: {
  subject: string;
  category: string;
  message: string;
}): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  });
  return this.http
    .post<any>(`${this.apiBaseUrl}/support/customer-care`, payload, { headers })
    .pipe(map((res: any) => res?.data ?? res));
}

/** Public marketing-site contact form → api.venerandahospital.org (no JWT). */
submitWebsiteContactMessage(payload: {
  fullName: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
}): Observable<any> {
  const headers = new HttpHeaders({
    [SKIP_CONNECTION_HEADER]: '1',
    'Content-Type': 'application/json',
  });
  return this.http
    .post<any>(`${API_VENERANDA_PUBLIC_BASE}/support/website-contact/public`, payload, { headers })
    .pipe(
      map((res: any) => res?.data ?? res),
      catchError((err) => throwError(() => err))
    );
}

/** Admin inbox: list website contact messages from the connected clinic/cloud API. */
getWebsiteContactMessages(): Observable<any[]> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    Authorization: `Bearer ${jwt}`,
  });
  return this.http.get(`${this.apiBaseUrl}/support/website-contact`, { headers }).pipe(
    map((res: any) => {
      const data = res?.data ?? res;
      return Array.isArray(data) ? data : [];
    })
  );
}

updateWebsiteContactMessageStatus(id: number, status: string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  });
  return this.http
    .put(`${this.apiBaseUrl}/support/website-contact/${id}/status`, { status }, { headers })
    .pipe(map((res: any) => res?.data ?? res));
}

markConversationAsRead(conversationId: number | string): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http
    .put(`${this.baseUrl11}/conversations/${conversationId}/read`, {}, { headers })
    .pipe(map((res: any) => res?.data ?? res));
}



  





  getOtherProcedureRequestedById(id: any){
    return this.http.get(`${this.baseUrl5}/get-procedure-requested-by-id/${id}`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }



  getTreatmentRequestedByVisit(id: any){
    return this.http.get(`${this.baseUrl5}/get-treatment-requested-by-visit-id/${id}`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }

  



  geOtherProceduresByVisit(id: any){
    return this.http.get(`${this.baseUrl5}/get-other-procedures-by-visit-id/${id}`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }

  getUltrasoundScanProceduresByVisit
  (id: any){
    return this.http.get(`${this.baseUrl5}/get-ultrasound-scan-by-visit-id/${id}`).pipe(
      map((res: any) => {
        console.log(res.data);
        return res.data;
      })
    );
  }
  
  generateInvoice(id: any): Observable<any> {
    const url = `${this.baseUrl5}/create-new-Invoice`;
    return this.http.post<any>(url, { id });
  }
  


  getLabTestCostByVisit(id: any){
    return this.http.get(`${this.baseUrl5}/get-total-cost-of-every-service-by-visit-id/${id}`).pipe(
      map((res: any) => {
        console.log("register res data first",res.data);
        return res.data;

      })
      
    );
    
  }

  getTotalClientBalanceDue(id: any){
    return this.http.get(`${this.baseUrl5}/get-total-cost-of-every-service-by-patient-id/${id}`).pipe(
      map((res: any) => {
        console.log("register res data first",res.data);
        return res.data;

      })
      
    );
    
  }


  
  exportPdf(visitId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl5}/invoice/generate-pdf/${visitId}`, {
      responseType: 'blob', // Important to handle binary data
    });
  }

  /** GET statement/generate-pdf/{visitId} — medical statement PDF for a visit */
  exportMedicalStatementPdf(
    visitId: number,
    options?: {
      treatmentRequestedIds: number[];
      procedureRequestedIds?: number[];
      includeNextOfKin: boolean;
      includePaymentTable?: boolean;
      includeAmountColumns?: boolean;
      includeFooter?: boolean;
      documentType?: 'MEDICAL_REPORT' | 'DISCHARGE_FORM' | 'MEDICAL_FORM';
      includeClientName?: boolean;
      includeClientAddress?: boolean;
      includeClientGender?: boolean;
      includeClientAge?: boolean;
      includeClientContact?: boolean;
      includeVisitDate?: boolean;
      includeBalanceDue?: boolean;
    }
  ): Observable<Blob> {
    if (!options) {
      return this.http.get(`${this.baseUrl5}/statement/generate-pdf/${visitId}`, {
        responseType: 'blob',
      });
    }
    const documentType = options.documentType || 'MEDICAL_REPORT';
    return this.http.post(
      `${this.baseUrl5}/statement/generate-pdf/${visitId}`,
      {
        treatmentRequestedIds: options.treatmentRequestedIds,
        procedureRequestedIds: options.procedureRequestedIds ?? [],
        includeNextOfKin: options.includeNextOfKin,
        includePaymentTable: options.includePaymentTable !== false,
        includeAmountColumns: options.includeAmountColumns !== false,
        includeFooter: options.includeFooter !== false,
        documentType,
        includeClientName: options.includeClientName !== false,
        includeClientAddress: options.includeClientAddress !== false,
        includeClientGender: options.includeClientGender !== false,
        includeClientAge: options.includeClientAge !== false,
        includeClientContact: options.includeClientContact !== false,
        includeVisitDate: options.includeVisitDate !== false,
        includeBalanceDue: options.includeBalanceDue !== false,
      },
      {
        params: { documentType },
        headers: { 'Content-Type': 'application/json' },
        responseType: 'blob',
      }
    );
  }

exportScanResults(id: number): Observable<Blob> {
  const jwt = this.getSessionToken();
  console.log("this my jwt in header " + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.get<Blob>(`${this.baseUrl7}/scan-generate-pdf/${id}`, {
    headers,
    responseType: 'blob' as 'json' // 👈 TS workaround
  });
}


  

  
  



  getItemById() {

    return this.http.get(`${this.baseUrl5}/get-all-patients`).pipe(map((res: any) => {
      console.log(res.data);
      return res.data
      

    }))
  }



  signUp(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl3}/signup`, data);

  }



  updateItem(id: number, data: any): Observable<any> {

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });


    return this.http.put(`${this.baseUrl5}/update-patient/` + id, data, { headers }).pipe(map((res: any) => {
      console.log("this is my message",res.message);
      return res
      

    }))
  }







  updateVisitStatus(id: number, data: any): Observable<any> {

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });


    return this.http.put(`${this.baseUrl5}/update-patient-visit-status/` + id, data, { headers }).pipe(map((res: any) => {
      console.log("this is my message",res.message);
      return res
      

    }))
  }









  updateVital(id: number, data: any) {

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });


    //return this.http.put(`${this.baseUrl5}/update-vital/` + id, data, { headers });

    return this.http.put(`${this.baseUrl5}/update-vital/` + id, data, { headers }).pipe(map((res: any) => {
      console.log("this is my message",res.message);
      return res

    }))
      
  }


  updateProcedure(id: number, data: any) {

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });


  return this.http.put(`${this.baseUrl5}/update-procedure-requested/` + id, data, { headers }).pipe(map((res: any) => {
    console.log("this is my message",res.message);
    return res
    

  }))

}
  

  deleteAllItems() {

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    this.http.delete(`${this.baseUrl3}`, { headers })
      .subscribe();

  }



  deleteClientById(id: number): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
  
    return this.http.delete(`${this.baseUrl5}/delete-patient-by-id/` + id, { headers });
  }


  
  deleteVitalById(id: number): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
  
    return this.http.delete(`${this.baseUrl5}/delete-vital-by-id/` + id, { headers });
  }




  deleteProcedureRequestById(id: number): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });
  
    return this.http.delete(`${this.baseUrl5}/delete-requested-procedure-by-id/` + id, { headers });
  }

  
//delete traetment

deleteTreatmentRequestById(id: number): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.delete(`${this.baseUrl5}/delete-requested-treatment-by-id/` + id, { headers });
}
  


//delete expense

deleteExpense(id: number): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.delete(`${this.baseUrl6}/delete-expense-transaction/` + id, { headers });
}





//delete payment

deletePayment(id: number): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.delete(`${this.baseUrl5}/delete-payment-id/` + id, { headers });
}

updatePayment(id: number, data: any): Observable<any> {
  const jwt = this.getSessionToken();
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });
  return this.http.put(`${this.baseUrl5}/update-payment-id/` + id, data, { headers }).pipe(
    map((res: any) => res)
  );
}
  


deleteItemById(id: number): Observable<any>{

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl3}/delete-item/` + id, { headers });
      

  }

//delete service

deleteServiceById(id: number): Observable<any>{

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.delete(`${this.baseUrl5}/delete-service/` + id, { headers });
    

}






deleteItemUsedById(id: number): Observable<any>{

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.delete(`${this.baseUrl5}/delete-item-used-id/` + id, { headers });
    

}






deleteGroupById(id: number): Observable<any>{

  const jwt = this.getSessionToken()

  //const jwt = sessionStorage.getItem('jwt');
  console.log("this my jwt in header" + jwt);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${jwt}`,
  });

  return this.http.delete(`${this.baseUrl5}/delete-group/` + id, { headers });
    

}



  deleteStockReceivedById(id: number): Observable<any>{

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl3}/delete-stock-received/` + id, { headers });
      

  }


  deleteStockReceivedByIdBusinessItem(id: number): Observable<any>{

    const jwt = this.getSessionToken()

    //const jwt = sessionStorage.getItem('jwt');
    console.log("this my jwt in header" + jwt);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwt}`,
    });

    return this.http.delete(`${this.baseUrl20}/delete-stock-received/` + id, { headers });
      

  }







  addToCartDb(data:any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl4}/add-to-cart`, data);
    //http://localhost:8080/course/shop-cart/add-to-cart

  }


  getItemsAdvancedSearchDashBoard(data: any): Observable<any>{
    const toYyyyMmDd = (value: any): string => {
      if (!value) return '';
      if (typeof value === 'string') return value.substring(0, 10);
      if (typeof value === 'object' && value.year != null && value.month != null && value.day != null) {
        const y = String(value.year);
        const m = String(value.month).padStart(2, '0');
        const d = String(value.day).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return '';
    };

    const dateFromString = toYyyyMmDd(data.datefrom);
    const dateToString = toYyyyMmDd(data.dateto);

    const params = new HttpParams()
      .set('paidBy', data.paidBy ?? '')
      .set('receivedBy', data.receivedBy ?? '')
      .set('paymentForm', data.paymentForm ?? '')
      .set('datefrom', dateFromString)
      .set('dateto', dateToString);

    return this.http.get( `${this.baseUrl5}/get-payment-advanced-search`, { params }).pipe(
      map((res: any) => {
        // Handle the response and extract the desired data
        return res.data;
      })
    );
  }



  getItemsAdvancedSearch(data: any): Observable<any>{
   
      // Create a HttpParams object with the input field values
      // Assuming data.datefrom and data.dateto are date objects with year, month, and day properties
      const dateFrom = new Date(data.datefrom.year, data.datefrom.month - 1, data.datefrom.day);
      const dateTo = new Date(data.dateto.year, data.dateto.month - 1, data.dateto.day);

      // Convert the date objects to ISO strings and substring removes the time factor
      const dateFromString = dateFrom.toISOString().substring(0, 10); // "yyyy-MM-dd"
      const dateToString = dateTo.toISOString().substring(0, 10); // "yyyy-MM-dd"


      const params = new HttpParams()
        .set('category', data.category)
        .set('subCategory', data.subCategory)
        .set('datefrom', dateFromString)
        .set('dateto', dateToString)


        return this.http.get( `${this.baseUrl3}/get-Items-advanced-search`, { params }).pipe(
          map((res: any) => {
            // Handle the response and extract the desired data
            return res.data;
          })
        );

    }


  getItemsAdvancedSearchDteEmpty(data: any): Observable<any>{
   
    const params = new HttpParams()
      .set('category', data.category)
      .set('subCategory', data.subCategory)
      .set('title', data.title)

      return this.http.get(`${this.baseUrl3}/get-Items-advanced-search`, { params }).pipe(
        map((res: any) => {
          // Handle the response and extract the desired data
          return res.data;
        })
      );

  }



    getItemsAdvancedSearchDteEmptyDashBoard(data: any): Observable<any>{
   
    const params = new HttpParams()
      .set('paidBy', data.paidBy)
      .set('receivedBy', data.receivedBy)
      .set('paymentForm', data.paymentForm)

      return this.http.get(`${this.baseUrl5}/get-payment-advanced-search`, { params }).pipe(
        map((res: any) => {
          // Handle the response and extract the desired data
          return res.data;
        })
      );

  }






  getItemsAdvancedSearchPdf(storedFilter: any){

    const apiUrl =  `${this.baseUrl3}/generate-pdf`;
    // 'http://192.168.100.37:8080/shop/shop-item/generate-pdf';

   
    // Create a HttpParams object with the input field values
    // Assuming data.datefrom and data.dateto are date objects with year, month, and day properties
    const dateFrom = new Date(storedFilter.datefrom.year, storedFilter.datefrom.month - 1, storedFilter.datefrom.day);
    const dateTo = new Date(storedFilter.dateto.year, storedFilter.dateto.month - 1, storedFilter.dateto.day);

    // Convert the date objects to ISO strings and substring removes the time factor
    const dateFromString = dateFrom.toISOString().substring(0, 10); // "yyyy-MM-dd"
    const dateToString = dateTo.toISOString().substring(0, 10); // "yyyy-MM-dd"


    const params = new HttpParams()
      .set('category', storedFilter.category)
      .set('title', storedFilter.title)
      .set('datefrom', dateFromString)
      .set('dateto', dateToString)


      this.http
      .get(apiUrl, { responseType: 'blob', params, // Include the params object in the request
    })
      .subscribe((responseBlob: Blob) => {
        // Create a Blob URL for the PDF
        const pdfBlob = new Blob([responseBlob], { type: 'application/pdf' });
        const pdfUrl = window.URL.createObjectURL(pdfBlob);

        // Create a link element
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = 'shop_items.pdf'; // Set the desired file name

        // Programmatically click the link to trigger the download
        link.click();
      });

  }


getItemsAdvancedSearchDteEmptyPdf(storedFilter: any){

  const apiUrl = `${this.baseUrl3}/generate-pdf`;

 
  const params = new HttpParams()
    .set('category', storedFilter.category)
    .set('title', storedFilter.title)

    this.http
      .get(apiUrl, { responseType: 'blob', params, // Include the params object in the request
    })
      .subscribe((responseBlob: Blob) => {
        // Create a Blob URL for the PDF
        const pdfBlob = new Blob([responseBlob], { type: 'application/pdf' });
        const pdfUrl = window.URL.createObjectURL(pdfBlob);

        // Create a link element
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = 'shop_items.pdf'; // Set the desired file name

        // Programmatically click the link to trigger the download
        link.click();
      });

}


getItemsAdvancedSearchDteEmptyPdfUndefined(){

  const apiUrl = `${this.baseUrl3}/generate-pdf`;


    this.http
      .get(apiUrl, { responseType: 'blob'// Include the params object in the request
    })
      .subscribe((responseBlob: Blob) => {
        // Create a Blob URL for the PDF
        const pdfBlob = new Blob([responseBlob], { type: 'application/pdf' });
        const pdfUrl = window.URL.createObjectURL(pdfBlob);

        // Create a link element
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = 'shop_items.pdf'; // Set the desired file name

        // Programmatically click the link to trigger the download
        link.click();
      });

}

  /** OTC counter / visit pharmacy sale (pharmacy-otc API). */
  completeOtcPharmacySale(payload: {
    amountReceived: number;
    paymentForm: string;
    receivedBy: string;
    notes?: string;
    visitId?: number;
    /** Preferred: tag sale to a registered client. */
    patientId?: number;
    patientName?: string;
    /** @deprecated use patientName */
    clientName?: string;
    /** When false, dispense stock without recording a visit payment. */
    recordPayment?: boolean;
    /** quotation | sales_order | proforma | sales_invoice | receipt */
    documentType?: string;
    /** When false, save document without reducing stock. */
    deductStock?: boolean;
    /** Revise this existing sale (one document per type per order). */
    saleId?: number | null;
    /** Overall order discount (absolute). */
    discount?: number;
    /** Tax amount included in payable total. */
    tax?: number;
    /** Final payable = subtotal − discount + tax (stored as sale total). */
    payableTotal?: number;
    lines: unknown[];
  }): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    const body: Record<string, unknown> = {
      amountReceived: payload.amountReceived,
      paymentForm: payload.paymentForm,
      receivedBy: payload.receivedBy,
      notes: payload.notes,
      visitId: payload.visitId,
      patientId: payload.patientId,
      patientName: payload.patientName ?? payload.clientName,
      recordPayment: payload.recordPayment,
      documentType: payload.documentType,
      deductStock: payload.deductStock,
      saleId: payload.saleId != null && payload.saleId > 0 ? payload.saleId : undefined,
      discount:
        payload.discount != null && Number(payload.discount) > 0
          ? Number(payload.discount)
          : undefined,
      tax: payload.tax != null && Number(payload.tax) > 0 ? Number(payload.tax) : undefined,
      payableTotal:
        payload.payableTotal != null && Number(payload.payableTotal) > 0
          ? Number(payload.payableTotal)
          : undefined,
      lines: payload.lines,
    };
    return this.http.post(`${this.apiBaseUrl}/pharmacy-otc/complete-sale`, body, { headers });
  }

  /** Record payment on an OTC/order visit and apply it to unpaid sale totals. */
  payOtcOrderDebt(
    visitId: number,
    data: {
      amountToPay: number;
      paymentForm: string;
      status?: string;
      notes?: string;
      receivedBy?: string;
      paidBy?: string;
      dateOfPayment?: string;
      timeOfPayment?: string;
    }
  ): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    return this.http
      .post(`${this.apiBaseUrl}/pharmacy-otc/pay-order-debt/${visitId}`, data, { headers })
      .pipe(map((res: any) => res));
  }

  /** Apply payment across a client's unpaid OTC sales (oldest first). */
  payOtcClientDebt(
    patientId: number,
    data: {
      amountToPay: number;
      paymentForm: string;
      status?: string;
      notes?: string;
      receivedBy?: string;
    }
  ): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    return this.http
      .post(`${this.apiBaseUrl}/pharmacy-otc/pay-client-debt/${patientId}`, data, { headers })
      .pipe(map((res: any) => res));
  }

  /** Confirm goods delivered for an OTC/visit order; deducts deferred stock and requires a delivery note. */
  confirmOtcGoodsDelivery(visitId: number, deliveryNote: string): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    return this.http.post(
      `${this.apiBaseUrl}/pharmacy-otc/confirm-delivery/${visitId}`,
      { deliveryNote },
      { headers }
    );
  }

  /**
   * Create a missing commercial document on an order (visit) by cloning products
   * from previous pipeline documents. Also fills any missing stages up to documentType.
   */
  ensureOtcOrderDocument(visitId: number, documentType: string): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    const params = new HttpParams().set('documentType', documentType);
    return this.http
      .post(`${this.apiBaseUrl}/pharmacy-otc/ensure-document/${visitId}`, {}, { headers, params })
      .pipe(map((res: any) => res));
  }

  /** Realign OTC sale paid figures with active (non-reversed) visit payments. */
  reconcileOtcOrderPaid(visitId: number): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    return this.http
      .post(`${this.apiBaseUrl}/pharmacy-otc/reconcile-paid/${visitId}`, {}, { headers })
      .pipe(map((res: any) => res));
  }

  /** Activate or deactivate an OTC order (all sales on the visit, or one sale). */
  setOtcOrderActive(opts: {
    visitId?: number | null;
    saleId?: number | null;
    active: boolean;
  }): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    let params = new HttpParams().set('active', opts.active ? 'true' : 'false');
    if (opts.visitId != null && opts.visitId > 0) {
      params = params.set('visitId', String(opts.visitId));
    }
    if (opts.saleId != null && opts.saleId > 0) {
      params = params.set('saleId', String(opts.saleId));
    }
    return this.http
      .post(`${this.apiBaseUrl}/pharmacy-otc/set-order-active`, {}, { headers, params })
      .pipe(map((res: any) => res));
  }

  deletePharmacySoldLine(lineId: number, source: 'OTC' | 'RX'): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    const params = new HttpParams().set('source', source);
    return this.http.delete(`${this.apiBaseUrl}/pharmacy-otc/sold-line/${lineId}`, { headers, params });
  }

  listOtcPharmacySales(datefrom?: string, dateto?: string): Observable<any> {
    let params = new HttpParams();
    if (datefrom) {
      params = params.set('datefrom', datefrom);
    }
    if (dateto) {
      params = params.set('dateto', dateto);
    }
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    return this.http.get(`${this.apiBaseUrl}/pharmacy-otc/sales`, { params, headers }).pipe(
      map((res: any) => res?.data ?? res ?? [])
    );
  }

  /** Sale-level commercial documents (quotation / proforma / invoice / receipt) for a visit or client. */
  listOtcSaleDocuments(opts: {
    visitId?: number | null;
    patientId?: number | null;
    documentType?: string;
  }): Observable<any[]> {
    let params = new HttpParams();
    if (opts.visitId != null && opts.visitId > 0) {
      params = params.set('visitId', String(opts.visitId));
    }
    if (opts.patientId != null && opts.patientId > 0) {
      params = params.set('patientId', String(opts.patientId));
    }
    if (opts.documentType) {
      params = params.set('documentType', opts.documentType);
    }
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    return this.http.get(`${this.apiBaseUrl}/pharmacy-otc/sales/documents`, { params, headers }).pipe(
      map((res: any) => {
        const data = res?.data ?? res ?? [];
        return Array.isArray(data) ? data : [];
      })
    );
  }

  listPendingDoctorPrescriptions(toModuleId?: number | null): Observable<any> {
    const jwt = this.getSessionToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${jwt}`,
    });
    let params = new HttpParams();
    if (toModuleId != null && toModuleId > 0) {
      params = params.set('toModuleId', String(toModuleId));
    }
    return this.http
      .get(`${this.apiBaseUrl}/pharmacy-otc/doctor-prescriptions/pending`, { headers, params })
      .pipe(map((res: any) => res?.data ?? res ?? []));
  }
}
