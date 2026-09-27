import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductsComponent } from './products/products.component';
import { CartComponent } from './cart/cart.component';
import { ProductDetailsComponent } from './product-details/product-details.component';
import { MensFashionComponent } from './mens-fashion/mens-fashion.component';
import { ItemManagementComponent } from './item-management/item-management.component';
import { StockReceiveComponent } from './stock-receive/stock-receive.component';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { ResetpasswordComponent } from './resetpassword/resetpassword.component';
import { SendemailComponent } from './sendemail/sendemail.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { BalanceSheetComponent } from './overview/pages/finance/balance-sheet/balance-sheet.component';
import { FormarrayexampleComponent } from './formarrayexample/formarrayexample.component';
import { Login2Component } from './login2/login2.component';
import { Login3Component } from './login3/login3.component';
import { Login4Component } from './auth/login4/login4.component';
import { ClientComponent } from './client/client.component';
import { ClientVisitComponent } from './client-visit/client-visit.component';
import { ServicesOfferedComponent } from './services-offered/services-offered.component';
import { OverviewComponent } from './overview/overview.component';
import { MainDashboardComponent } from './overview/dashboards/main-dashboard/main-dashboard.component';
import { LabDashboardComponent } from './overview/dashboards/lab-dashboard/lab-dashboard.component';
import { ClientDashboardComponent } from './overview/dashboards/client-dashboard/client-dashboard.component';
import { FinanceDashboardComponent } from './overview/dashboards/finance-dashboard/finance-dashboard.component';
import { InventoryDashboardComponent } from './overview/dashboards/inventory-dashboard/inventory-dashboard.component';
import { ReorderLevelsComponent as OverviewReorderLevelsComponent } from './overview/pages/inventory/reorder-levels/reorder-levels.component';
import { SuppliersComponent } from './overview/pages/inventory/suppliers/suppliers.component';
import { AssetManagementComponent } from './overview/pages/inventory/asset-management/asset-management.component';
import { StoreManagementComponent } from './overview/pages/inventory/store-management/store-management.component';
import { StoreReportsComponent } from './overview/pages/inventory/store-reports/store-reports.component';
import { StoreAnalyticsComponent } from './overview/pages/inventory/store-analytics/store-analytics.component';
import { StockManagementComponent } from './overview/pages/inventory/stock-management/stock-management.component';
import { StockTransferComponent } from './overview/pages/inventory/stock-transfer/stock-transfer.component';
import { StockTrackingComponent } from './overview/pages/inventory/stock-tracking/stock-tracking.component';
import { StockTakingComponent } from './overview/pages/inventory/stock-taking/stock-taking.component';
import { StockVerificationComponent } from './overview/pages/inventory/stock-verification/stock-verification.component';
import { StockInitializerComponent } from './overview/pages/inventory/stock-initializer/stock-initializer.component';
import { StockReceiveComponent as OverviewStockReceiveComponent } from './overview/pages/inventory/stock-receive/stock-receive.component';
import { ConsumableItemsComponent } from './overview/pages/inventory/consumable-items/consumable-items.component';
import { StockBatchComponent } from './overview/pages/inventory/stock-batch/stock-batch.component';
import { StockAdjustmentsComponent } from './overview/pages/inventory/stock-adjustments/stock-adjustments.component';
import { ExpiredItemsComponent } from './overview/pages/inventory/expired-items/expired-items.component';
import { ShopItemManagementComponent } from './overview/pages/inventory/shop-item-management/shop-item-management.component';
import { ShopItemReceiveComponent as OverviewShopItemReceiveComponent } from './overview/pages/inventory/shop-item-receive/shop-item-receive.component';
import { ManufacturersComponent } from './overview/pages/inventory/manufacturers/manufacturers.component';
import { AllClientsComponent } from './overview/pages/client-management/all-clients/all-clients.component';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { ServiceDetailComponent } from './service-detail/service-detail.component';
import { AboutPageComponent } from './about-page/about-page.component';
import { BookAppointmentComponent } from './book-appointment/book-appointment.component';
import { ContactPageComponent } from './contact-page/contact-page.component';
import { ConsultationV2Component } from './overview/pages/consultation-v2/consultation-v2.component';
import { ServicesManagementComponent } from './overview/pages/services-management/services-management.component';
import { ServiceCategoriesComponent } from './overview/pages/services-management/service-categories/service-categories.component';
import { ServiceTypesComponent } from './overview/pages/services-management/service-types/service-types.component';
import { ClientGroupsComponent } from './overview/pages/client-management/client-groups/client-groups.component';
// OPD Components
import { ConsultationComponent } from './overview/pages/opd/consultation/consultation.component';
import { PrescriptionsComponent } from './overview/pages/opd/prescriptions/prescriptions.component';
import { InvestigationsComponent } from './overview/pages/opd/investigations/investigations.component';
import { DiagnosisComponent } from './overview/pages/opd/diagnosis/diagnosis.component';
import { FollowUpsComponent } from './overview/pages/opd/follow-ups/follow-ups.component';
// IPD Components
import { BedManagementComponent } from './overview/pages/ipd/bed-management/bed-management.component';
import { AdmissionsComponent } from './overview/pages/ipd/admissions/admissions.component';
import { DischargesComponent } from './overview/pages/ipd/discharges/discharges.component';
import { NursingNotesComponent } from './overview/pages/ipd/nursing-notes/nursing-notes.component';
import { DoctorRoundsComponent } from './overview/pages/ipd/doctor-rounds/doctor-rounds.component';
import { MedicationChartsComponent } from './overview/pages/ipd/medication-charts/medication-charts.component';
import { ProceduresComponent } from './overview/pages/ipd/procedures/procedures.component';
import { TransfersComponent } from './overview/pages/ipd/transfers/transfers.component';
// Client Management Additional
import { ClientRegistrationComponent } from './overview/pages/client-management/client-registration/client-registration.component';
import { ClientProfileComponent } from './overview/pages/client-management/client-profile/client-profile.component';
import { VisitHistoryComponent } from './overview/pages/client-management/visit-history/visit-history.component';
import { AppointmentSchedulingComponent } from './overview/pages/client-management/appointment-scheduling/appointment-scheduling.component';
import { QueueManagementComponent } from './overview/pages/client-management/queue-management/queue-management.component';
import { ReferralManagementComponent } from './overview/pages/client-management/referral-management/referral-management.component';
// Laboratory Components
import { LabTestRequestsComponent } from './overview/pages/laboratory/test-requests/lab-test-requests.component';
import { SampleCollectionComponent } from './overview/pages/laboratory/sample-collection/sample-collection.component';
import { TestProcessingComponent } from './overview/pages/laboratory/test-processing/test-processing.component';
import { LabResultsComponent } from './overview/pages/laboratory/results/lab-results.component';
import { LabReportsComponent } from './overview/pages/laboratory/reports/lab-reports.component';
import { LabEquipmentTrackingComponent } from './overview/pages/laboratory/equipment-tracking/lab-equipment-tracking.component';
// Radiology Components
import { ScanRequestsComponent } from './overview/pages/radiology/scan-requests/scan-requests.component';
import { RadiologyReportsComponent } from './overview/pages/radiology/reports/radiology-reports.component';
import { PacsIntegrationComponent } from './overview/pages/radiology/pacs-integration/pacs-integration.component';
import { RadiologistWorklistComponent } from './overview/pages/radiology/radiologist-worklist/radiologist-worklist.component';
// Pharmacy Components
import { PharmacyDispensingComponent } from './overview/pages/pharmacy/dispensing/pharmacy-dispensing.component';
import { PharmacyPrescriptionManagementComponent } from './overview/pages/pharmacy/prescription-management/pharmacy-prescription-management.component';
import { PharmacyPricingComponent } from './overview/pages/pharmacy/pricing/pharmacy-pricing.component';
import { PharmacyPurchaseOrdersComponent } from './overview/pages/pharmacy/purchase-orders/pharmacy-purchase-orders.component';
import { PharmacyExpiryAlertsComponent } from './overview/pages/pharmacy/expiry-alerts/pharmacy-expiry-alerts.component';
import { PharmacySuppliersComponent } from './overview/pages/pharmacy/suppliers/pharmacy-suppliers.component';
import { OtcDispensaryComponent } from './overview/pages/pharmacy/otc-dispensary/otc-dispensary.component';
// HR Components
import { EmployeeRegistrationComponent } from './overview/pages/hr/employee-registration/employee-registration.component';
import { DepartmentAssignmentComponent } from './overview/pages/hr/department-assignment/department-assignment.component';
import { AttendanceComponent } from './overview/pages/hr/attendance/attendance.component';
import { LeaveManagementComponent } from './overview/pages/hr/leave/leave-management.component';
import { PayrollComponent } from './overview/pages/hr/payroll/payroll.component';
import { PerformanceTrackingComponent } from './overview/pages/hr/performance/performance-tracking.component';
// Finance Components
import { ServiceChargesComponent } from './overview/pages/finance/service-charges/service-charges.component';
import { CashierComponent } from './overview/pages/finance/cashier/cashier.component';
import { InsuranceBillingComponent } from './overview/pages/finance/insurance-billing/insurance-billing.component';
import { RefundsComponent } from './overview/pages/finance/refunds/refunds.component';
import { ExpensesComponent } from './overview/pages/finance/expenses/expenses.component';
import { ExpenseCategoriesComponent } from './overview/pages/finance/expense-categories/expense-categories.component';
import { ExpenseAccountsComponent } from './overview/pages/finance/expense-accounts/expense-accounts.component';
import { ExpenseTransactionsComponent } from './overview/pages/finance/expense-transactions/expense-transactions.component';
import { LoanManagementComponent } from './overview/pages/finance/loan-management/loan-management.component';
import { IncomeManagementComponent } from './overview/pages/finance/income-management/income-management.component';
import { IncomeTransactionsComponent } from './overview/pages/finance/income-transactions/income-transactions.component';
import { IncomeCategoriesComponent } from './overview/pages/finance/income-categories/income-categories.component';
import { IncomeAccountsComponent } from './overview/pages/finance/income-accounts/income-accounts.component';
import { ExpenseAnalyticsComponent } from './overview/pages/finance/expense-analytics/expense-analytics.component';
import { FinanceReportsComponent } from './overview/pages/finance/reports/finance-reports.component';
// Reports Components
import { DepartmentalReportsComponent } from './overview/pages/reports/departmental/departmental-reports.component';
import { RevenueReportsComponent } from './overview/pages/reports/revenue/revenue-reports.component';
import { DrugUtilizationComponent } from './overview/pages/reports/drug-utilization/drug-utilization.component';
import { LabStatisticsComponent } from './overview/pages/reports/lab-statistics/lab-statistics.component';
import { DailyAdmissionsComponent } from './overview/pages/reports/daily-admissions/daily-admissions.component';
import { RegulatoryReportsComponent } from './overview/pages/reports/regulatory-reports/regulatory-reports.component';
import { InventorySummaryComponent } from './overview/pages/reports/inventory-summary/inventory-summary.component';
// Administration Components
import { UserManagementComponent } from './overview/pages/administration/user-management/user-management.component';
import { AccessPermissionsComponent } from './overview/pages/administration/permissions/access-permissions.component';
import { DepartmentSetupComponent } from './overview/pages/administration/department-setup/department-setup.component';
import { SubscriptionComponent } from './overview/pages/administration/subscription/subscription.component';
import { SubscriptionPaymentComponent } from './overview/pages/administration/subscription/subscription-payment.component';
import { MobileMoneySettingsComponent } from './overview/pages/administration/subscription/mobile-money-settings.component';
import { BusinessSettingsComponent } from './overview/pages/administration/business-settings/business-settings.component';
import { SpecialPrivilegesComponent } from './overview/pages/administration/special-privileges/special-privileges.component';
import { SystemConfigurationComponent } from './overview/pages/administration/configuration/system-configuration.component';
import { DataBackupComponent } from './overview/pages/administration/backup/data-backup.component';
import { SystemDocumentationComponent } from './overview/pages/administration/system-documentation/system-documentation.component';
import { AuditLogsComponent } from './overview/pages/administration/audit-logs/audit-logs.component';
import { WebsiteContactMessagesComponent } from './overview/pages/administration/website-contact-messages/website-contact-messages.component';
// Support Services Components
import { LaundryComponent } from './overview/pages/support-services/laundry/laundry.component';
import { KitchenDietComponent } from './overview/pages/support-services/kitchen/kitchen-diet.component';
import { TransportAmbulanceComponent } from './overview/pages/support-services/transport/transport-ambulance.component';
import { HousekeepingComponent } from './overview/pages/support-services/housekeeping/housekeeping.component';
import { MaintenanceRequestsComponent } from './overview/pages/support-services/maintenance/maintenance-requests.component';
// Insurance Components
import { InsuranceRegistrationComponent } from './overview/pages/insurance/registration/insurance-registration.component';
import { PreAuthorizationComponent } from './overview/pages/insurance/pre-authorization/pre-authorization.component';
import { ClaimSubmissionsComponent } from './overview/pages/insurance/claims/claim-submissions.component';
import { ClaimTrackingComponent } from './overview/pages/insurance/claims/claim-tracking.component';
import { CorporateBillingComponent } from './overview/pages/insurance/corporate-billing/corporate-billing.component';
// Telemedicine Components
import { OnlineConsultationsComponent } from './overview/pages/telemedicine/online-consultations/online-consultations.component';
import { EPrescriptionsComponent } from './overview/pages/telemedicine/e-prescriptions/e-prescriptions.component';
import { VideoSchedulingComponent } from './overview/pages/telemedicine/video-scheduling/video-scheduling.component';
import { RemoteMonitoringComponent } from './overview/pages/telemedicine/remote-monitoring/remote-monitoring.component';
import { ClientPortalComponent } from './overview/pages/telemedicine/client-portal/client-portal.component';
// Clinical Decision Support Components
import { DrugInteractionsComponent } from './overview/pages/clinical-decision-support/drug-interactions/drug-interactions.component';
import { DiseaseProtocolsComponent } from './overview/pages/clinical-decision-support/protocols/disease-protocols.component';
import { TreatmentGuidelinesComponent } from './overview/pages/clinical-decision-support/guidelines/treatment-guidelines.component';
import { PredictiveAnalyticsComponent } from './overview/pages/clinical-decision-support/predictive-analytics/predictive-analytics.component';
// Security & Compliance Components
import { DataEncryptionComponent } from './overview/pages/security-compliance/data-encryption/data-encryption.component';
import { AccessHistoryComponent } from './overview/pages/security-compliance/access-history/access-history.component';
import { RoleControlsComponent } from './overview/pages/security-compliance/role-controls/role-controls.component';
import { ComplianceReportsComponent } from './overview/pages/security-compliance/compliance-reports/compliance-reports.component';
// Specialized Modules Components
import { BloodDonationsComponent } from './overview/pages/blood-bank/donations/blood-donations.component';
import { BloodScreeningComponent } from './overview/pages/blood-bank/screening/blood-screening.component';
import { BloodInventoryComponent } from './overview/pages/blood-bank/inventory/blood-inventory.component';
import { BodyManagementComponent } from './overview/pages/mortuary/body-management/body-management.component';
import { AutopsyComponent } from './overview/pages/mortuary/autopsy/autopsy.component';
import { ReleaseTrackingComponent } from './overview/pages/mortuary/release-tracking/release-tracking.component';
import { TheatreScheduleComponent } from './overview/pages/theatre/schedule/theatre-schedule.component';
import { TheatreRecordsComponent } from './overview/pages/theatre/records/theatre-records.component';
import { TheatreManagementComponent } from './overview/pages/theatre/management/theatre-management.component';
import { DialysisSessionsComponent } from './overview/pages/dialysis/sessions/dialysis-sessions.component';
import { DialysisClientDataComponent } from './overview/pages/dialysis/client-data/dialysis-client-data.component';
import { EquipmentMaintenanceComponent } from './overview/pages/equipment-maintenance/schedules/equipment-maintenance.component';
import { BusinessIntelligenceComponent } from './overview/pages/business-intelligence/dashboards/business-intelligence.component';
import { IntegrationHubComponent } from './overview/pages/integration-hub/external-lab/integration-hub.component';
// New components from old project
import { ExpiryDrugsComponent } from './expiry-drugs/expiry-drugs.component';
import { MessagesComponent } from './messages/messages.component';
import { HelpSupportComponent } from './help/help-support.component';
import { SettingsPrivacyComponent } from './settings-privacy/settings-privacy.component';
import { StoreManagementComponent as StandaloneStoreManagementComponent } from './store-management/store-management.component';
import { LoginMobileComponent } from './auth/login-mobile/login-mobile.component';
import { blockDashboardForClinicalRoleGuard } from './guards/block-dashboard-for-clinical-role.guard';
import { pageAccessGuard, topLevelPageAccessGuard } from './guards/page-access.guard';
import { subscriptionGuard, subscriptionChildGuard } from './guards/subscription.guard';
import { UserProfileComponent } from './user-profile/user-profile.component';

const routes: Routes = [
  {path:'', redirectTo:'landingpage', pathMatch:'full'},

  {path:'products', component:ProductsComponent},
  {path:'cart', component:CartComponent},
  {path:'product-details', component:ProductDetailsComponent},
  {path:'mens-fashion', component:MensFashionComponent},
  {path:'item-management', component: ItemManagementComponent},
  {path:'stock-receive', component: StockReceiveComponent},
  {path:'services-offered', component:ServicesOfferedComponent, canActivate: [subscriptionGuard]},
  {path:'reorder-levels', redirectTo:'overview/reorder-levels', pathMatch:'full'},
  {path:'client-visit', component: ClientVisitComponent, canActivate: [subscriptionGuard, topLevelPageAccessGuard]},

  { path: 'dashboard', redirectTo: 'overview/dashboard', pathMatch: 'full' },
  {
    path:'overview', 
    component:OverviewComponent,
    canActivate: [subscriptionGuard],
    canActivateChild: [subscriptionChildGuard, pageAccessGuard],
    children: [
      {path: '', redirectTo: 'main-dashboard', pathMatch:'full'},
      {path: 'main-dashboard', component: MainDashboardComponent},
      {path: 'lab-dashboard', component: LabDashboardComponent},
      {path: 'client-dashboard', component: ClientDashboardComponent},
      {path: 'finance-dashboard', component: FinanceDashboardComponent},
      {path: 'inventory-dashboard', component: InventoryDashboardComponent},
      {path: 'reorder-levels', component: OverviewReorderLevelsComponent},
      {path: 'suppliers', component: SuppliersComponent},
      {path: 'asset-management', component: AssetManagementComponent},
      {path: 'consumable-items', component: ConsumableItemsComponent},
      {path: 'store-management', component: StoreManagementComponent},
      {path: 'store-reports', component: StoreReportsComponent},
      {path: 'store-analytics', component: StoreAnalyticsComponent},
      {path: 'stock-management', component: StockManagementComponent},
      {path: 'stock-receive', component: OverviewStockReceiveComponent},
      {path: 'shop-item-management', component: ShopItemManagementComponent},
      {path: 'shop-item-receive', component: OverviewShopItemReceiveComponent},
      {path: 'stock-transfer', component: StockTransferComponent},
      {path: 'stock-tracking', component: StockTrackingComponent},
      {path: 'stock-taking', component: StockTakingComponent},
      {path: 'stock-verification', component: StockVerificationComponent},
      {path: 'stock-initializer', component: StockInitializerComponent},
      {path: 'expired-items', component: ExpiredItemsComponent},
      {path: 'stock-batch', component: StockBatchComponent},
      {path: 'adjustments', component: StockAdjustmentsComponent},
      {path: 'manufacturers', component: ManufacturersComponent},
      {path: 'all-clients', component: AllClientsComponent},
      {path: 'client-groups', component: ClientGroupsComponent},
      {path: 'client-registration', component: ClientRegistrationComponent},
      {path: 'client-profile', component: ClientProfileComponent},
      {path: 'visit-history', component: VisitHistoryComponent},
      {path: 'appointment-scheduling', component: AppointmentSchedulingComponent},
      {path: 'queue-management', component: QueueManagementComponent},
      {path: 'referral-management', component: ReferralManagementComponent},
      {path: 'opd-consultation', component: ConsultationComponent},
      {path: 'opd-prescriptions', component: PrescriptionsComponent},
      {path: 'opd-investigations', component: InvestigationsComponent},
      {path: 'opd-diagnosis', component: DiagnosisComponent},
      {path: 'opd-follow-ups', component: FollowUpsComponent},
      {path: 'bed-management', component: BedManagementComponent},
      {path: 'admissions', component: AdmissionsComponent},
      {path: 'discharges', component: DischargesComponent},
      {path: 'nursing-notes', component: NursingNotesComponent},
      {path: 'doctor-rounds', component: DoctorRoundsComponent},
      {path: 'medication-charts', component: MedicationChartsComponent},
      {path: 'procedures', component: ProceduresComponent},
      {path: 'transfers', component: TransfersComponent},
      {path: 'lab-test-requests', component: LabTestRequestsComponent},
      {path: 'sample-collection', component: SampleCollectionComponent},
      {path: 'test-processing', component: TestProcessingComponent},
      {path: 'lab-results', component: LabResultsComponent},
      {path: 'lab-reports', component: LabReportsComponent},
      {path: 'lab-equipment-tracking', component: LabEquipmentTrackingComponent},
      {path: 'scan-requests', component: ScanRequestsComponent},
      {path: 'radiology-reports', component: RadiologyReportsComponent},
      {path: 'pacs-integration', component: PacsIntegrationComponent},
      {path: 'radiologist-worklist', component: RadiologistWorklistComponent},
      {path: 'pharmacy-dispensing', component: PharmacyDispensingComponent},
      {path: 'otc-dispensary', component: OtcDispensaryComponent},
      {path: 'pharmacy-prescription-management', component: PharmacyPrescriptionManagementComponent},
      {path: 'pharmacy-pricing', component: PharmacyPricingComponent},
      {path: 'pharmacy-purchase-orders', component: PharmacyPurchaseOrdersComponent},
      {path: 'pharmacy-expiry-alerts', component: PharmacyExpiryAlertsComponent},
      {path: 'pharmacy-suppliers', component: PharmacySuppliersComponent},
      {path: 'employee-registration', component: EmployeeRegistrationComponent},
      {path: 'department-assignment', component: DepartmentAssignmentComponent},
      {path: 'attendance', component: AttendanceComponent},
      {path: 'leave-management', component: LeaveManagementComponent},
      {path: 'payroll', component: PayrollComponent},
      {path: 'performance-tracking', component: PerformanceTrackingComponent},
      {path: 'service-charges', component: ServiceChargesComponent},
      {path: 'cashier', component: CashierComponent},
      {path: 'insurance-billing', component: InsuranceBillingComponent},
      {path: 'refunds', component: RefundsComponent},
      {path: 'expenses', component: ExpensesComponent},
      {path: 'expense-categories', component: ExpenseCategoriesComponent},
      {path: 'expense-accounts', component: ExpenseAccountsComponent},
      {path: 'expense-transactions', component: ExpenseTransactionsComponent},
      {path: 'loan-management', component: LoanManagementComponent},
      {path: 'income-management', component: IncomeManagementComponent},
      {path: 'income-transactions', component: IncomeTransactionsComponent},
      {path: 'income-categories', component: IncomeCategoriesComponent},
      {path: 'income-accounts', component: IncomeAccountsComponent},
      {path: 'expense-analytics', component: ExpenseAnalyticsComponent},
      {path: 'finance-reports', component: FinanceReportsComponent},
      {path: 'departmental-reports', component: DepartmentalReportsComponent},
      {path: 'revenue-reports', component: RevenueReportsComponent},
      {path: 'drug-utilization', component: DrugUtilizationComponent},
      {path: 'lab-statistics', component: LabStatisticsComponent},
      {path: 'daily-admissions', component: DailyAdmissionsComponent},
      {path: 'regulatory-reports', component: RegulatoryReportsComponent},
      {path: 'inventory-summary', component: InventorySummaryComponent},
      {path: 'user-management', component: UserManagementComponent},
      {path: 'access-control', component: AccessPermissionsComponent},
      {path: 'access-permissions', redirectTo: 'access-control', pathMatch: 'full'},
      {path: 'subscription', component: SubscriptionComponent},
      {path: 'subscription/payment', component: SubscriptionPaymentComponent},
      {path: 'subscription/momo-settings', component: MobileMoneySettingsComponent},
      {path: 'mobile-money-settings', component: MobileMoneySettingsComponent},
      {path: 'business-settings', component: BusinessSettingsComponent},
      {path: 'special-privileges', component: SpecialPrivilegesComponent},
      {path: 'department-setup', component: DepartmentSetupComponent},
      {path: 'system-configuration', component: SystemConfigurationComponent},
      {path: 'data-backup', component: DataBackupComponent},
      {path: 'system-documentation', component: SystemDocumentationComponent},
      {path: 'documentation', redirectTo: 'system-documentation', pathMatch: 'full'},
      {path: 'audit-logs', component: AuditLogsComponent},
      {path: 'website-contact-messages', component: WebsiteContactMessagesComponent},
      {path: 'contact-messages', redirectTo: 'website-contact-messages', pathMatch: 'full'},
      {path: 'laundry', component: LaundryComponent},
      {path: 'kitchen-diet', component: KitchenDietComponent},
      {path: 'transport-ambulance', component: TransportAmbulanceComponent},
      {path: 'housekeeping', component: HousekeepingComponent},
      {path: 'maintenance-requests', component: MaintenanceRequestsComponent},
      {path: 'insurance-registration', component: InsuranceRegistrationComponent},
      {path: 'pre-authorization', component: PreAuthorizationComponent},
      {path: 'claim-submissions', component: ClaimSubmissionsComponent},
      {path: 'claim-tracking', component: ClaimTrackingComponent},
      {path: 'corporate-billing', component: CorporateBillingComponent},
      {path: 'online-consultations', component: OnlineConsultationsComponent},
      {path: 'e-prescriptions', component: EPrescriptionsComponent},
      {path: 'video-scheduling', component: VideoSchedulingComponent},
      {path: 'remote-monitoring', component: RemoteMonitoringComponent},
      {path: 'client-portal', component: ClientPortalComponent},
      {path: 'drug-interactions', component: DrugInteractionsComponent},
      {path: 'disease-protocols', component: DiseaseProtocolsComponent},
      {path: 'treatment-guidelines', component: TreatmentGuidelinesComponent},
      {path: 'predictive-analytics', component: PredictiveAnalyticsComponent},
      {path: 'data-encryption', component: DataEncryptionComponent},
      {path: 'access-history', component: AccessHistoryComponent},
      {path: 'role-controls', component: RoleControlsComponent},
      {path: 'compliance-reports', component: ComplianceReportsComponent},
      {path: 'blood-donations', component: BloodDonationsComponent},
      {path: 'blood-screening', component: BloodScreeningComponent},
      {path: 'blood-inventory', component: BloodInventoryComponent},
      {path: 'body-management', component: BodyManagementComponent},
      {path: 'autopsy', component: AutopsyComponent},
      {path: 'release-tracking', component: ReleaseTrackingComponent},
      {path: 'theatre-schedule', component: TheatreScheduleComponent},
      {path: 'theatre-records', component: TheatreRecordsComponent},
      {path: 'theatre-management', component: TheatreManagementComponent},
      {path: 'dialysis-sessions', component: DialysisSessionsComponent},
      {path: 'dialysis-client-data', component: DialysisClientDataComponent},
      {path: 'equipment-maintenance', component: EquipmentMaintenanceComponent},
      {path: 'business-intelligence', component: BusinessIntelligenceComponent},
      {path: 'integration-hub', component: IntegrationHubComponent},
      {path:'clienttransactions', component: ConsultationV2Component},
      {path:'consultation-v2', redirectTo: 'clienttransactions', pathMatch: 'full'},
      {path:'services-management', component: ServicesManagementComponent},
      {path:'service-categories', component: ServiceCategoriesComponent},
      {path:'service-types', component: ServiceTypesComponent},
      {path: 'messages', component: MessagesComponent},
      {path: 'user-profile', component: UserProfileComponent},
      {path: 'dashboard', component: BalanceSheetComponent, canActivate: [blockDashboardForClinicalRoleGuard]},
      {path: 'legacy-dashboard', component: DashboardComponent, canActivate: [blockDashboardForClinicalRoleGuard]}
    ]
  },
  {path:'client', component:ClientComponent, canActivate: [subscriptionGuard, topLevelPageAccessGuard]},
  {path:'near-expiry', component:ExpiryDrugsComponent, data:{tab:'near'}, canActivate: [subscriptionGuard]},
  {path:'expired-drugs', component:ExpiryDrugsComponent, data:{tab:'expired'}, canActivate: [subscriptionGuard]},
  {path:'messages', redirectTo: 'overview/messages', pathMatch: 'full'},
  {path:'help', component:HelpSupportComponent, canActivate: [subscriptionGuard]},
  {path:'settings-privacy', component:SettingsPrivacyComponent, canActivate: [subscriptionGuard]},
  {path:'store-management', component:StandaloneStoreManagementComponent, canActivate: [subscriptionGuard]},
  {path:'user-management', redirectTo: 'overview/user-management', pathMatch: 'full'},
  {path:'login-mobile', component:LoginMobileComponent},
  {path:'user-profile', redirectTo: 'overview/user-profile', pathMatch: 'full'},

  {path:'formarrayexample', component:FormarrayexampleComponent, canActivate: [subscriptionGuard]},

  {
    path: 'login2',
    component: Login2Component,
    data: { login2: true } // Indicate that this route is related to login
  },

  {
    path: 'login3',
    component: Login3Component,
    data: { login3: true } // Indicate that this route is related to login
  },

  {
    path: 'sendemail',
    component: SendemailComponent,
    data: { sendemail: true } // Indicate that this route is related to login
  },
  
  {
    path: 'resetpassword',
    component: ResetpasswordComponent,
    data: { resetpassword: true } // Indicate that this route is related to login
  },

  {
    path: 'login',
    component: LoginComponent,
    data: { login: true } // Indicate that this route is related to login
  },

  {path:'landingpage',
    component: LandingPageComponent,
    data: { landingpage: true }
  },
  {
    path: 'service/:slug',
    component: ServiceDetailComponent,
    data: { landingpage: true }
  },
  {
    path: 'about',
    component: AboutPageComponent,
    data: { landingpage: true }
  },
  {
    path: 'book-appointment',
    component: BookAppointmentComponent,
    data: { landingpage: true }
  },
  {
    path: 'contact',
    component: ContactPageComponent,
    data: { landingpage: true }
  },
  
  {
    path: 'signup',
    component: LoginComponent,
    data: { signup: true, authTab: 'signup' }
  },
  {
    path: 'login4',
    component: Login4Component,
    data: { login4: true } // Indicate that this route is related to login
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    useHash: true,
    anchorScrolling: 'enabled',
    scrollPositionRestoration: 'enabled',
    scrollOffset: [0, 88]
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }