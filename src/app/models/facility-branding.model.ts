export interface FacilityBranding {
  facilityId?: number | null;
  facilityLogoUrl?: string;
  facilityName?: string;
  facilityAddress?: string;
  subsidiaryLabel?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  email?: string;
  financeDepartmentName?: string;
  medicalRecordsDepartmentName?: string;
  diagnosticsDepartmentName?: string;
  bankName?: string;
  ugxAccountNumber?: string;
  usdAccountNumber?: string;
  thankYouMessage?: string;
  invoiceFooterContactLine?: string;
  financeHeaderLine?: string;
  medicalRecordsHeaderLine?: string;
  diagnosticsHeaderLine?: string;
  contactInquiryLine?: string;
  invoiceFooterMainLine?: string;
  thankYouLine?: string;
  /** true = sidebar shares space with page (default); false = hidden until expanded overlay */
  sidebarStacked?: boolean;
  /** true = OTC counter shows prescription fields by default */
  otcIncludePrescribing?: boolean;
  /** true = pharmacy inventory uses stock batches; false = shop products */
  pharmacyUseStockBatch?: boolean;
  /** CSV / JSON list of user ids allowed to open visits */
  privilegeOpenVisitUserIds?: string;
  /** CSV / JSON list of user ids in the Veneranda privilege group */
  privilegeVenerandaGroupUserIds?: string;
  /** CSV / JSON list of user ids in the credit privilege group */
  privilegeCreditGroupUserIds?: string;
  /** CSV / JSON list of group ids allowed for credit */
  privilegeCreditAllowedGroupIds?: string;
  hmisFacilityCode?: string;
  hmisFacilityLevel?: string;
  hmisDistrict?: string;
  hmisHsd?: string;
  hmisSubCounty?: string;
  hmisParish?: string;
}
