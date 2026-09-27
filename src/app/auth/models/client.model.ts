export interface Client {
    id: number;
    creationDate: string;
    nextOfKinAddress: string;
    nextOfKinContact: string;
    nextOfKinName: string;
    clientAddress: string;
    clientAge: number;
    clientContact: string;
    clientDateOfBirth: string;
    clientFileNo: string;
    clientFirstName: string;
    clientGender: string;
    clientNo: number;
    clientProfilePic: string;
    clientSecondName: string;
    relationship: string;
    clientVisits: ClientVisit[];
  }
  
  export interface ClientVisit {
    id: number;
    clientId: number;
    visitDate: string;
    visitName: string;
    visitNumber: number;
    visitReason: string;
    visitTime: string;
    visitType: string;
    consultation?: Consultation;
    inClientTreatments: InClientTreatment[];
    initialTriageVitals: InitialTriageVitals[];
    proceduresRequested: ProcedureRequested[];
    treatmentRequested: TreatmentRequested[];
    vitalsMonitoringChart: VitalsMonitoringChart[];
    recommendation?: Recommendation;
  }
  
  export interface Consultation {
    id: number;
    visitId: number;
    clinicalExamination: string;
    diagnosis: string;
    differentialDiagnosis: string;
    medicalHistory: string;
  }
  
  export interface InClientTreatment {
    id: number;
    visitId: number;
    administeredByInitials: string;
    dateGiven: string;
    dose: string;
    frequency: string;
    medicine: string;
    route: string;
    timeGiven: string;
  }
  
  export interface InitialTriageVitals {
    id: number;
    visitId: number;
    bloodPressure: string;
    heartRate: number;
    height: number;
    weight: number;
    respiratoryRate: number;
    spO2: number;
    temperature: number;
    dateTaken: string;
    timeTaken: string;
  }
  
  export interface ProcedureRequested {
    id: number;
    visitId: number;
    Report: string;
    doneBy: string;
    orderedBy: string;
    procedure: Procedure;
    quantity: number;
    unitSellingPrice: number;
    totalAmount: number;
  }
  
  export interface Procedure {
    id: number;
    procedureName: string;
    description: string;
    procedureType: string;
    category: string;
    unitCostPrice: number;
    unitSellingPrice: number;
  }
  
  export interface Recommendation {
    id: number;
    visitId: number;
    homeAdvice: string;
    prevention: string;
    recommendationType: string;
    reviewReturnDate: string;
  }
  
  export interface TreatmentRequested {
    id: number;
    item: TreatmentItem;
    quantity: number;
    unitSellingPrice: number;
    totalAmount: number;
  }
  
  export interface TreatmentItem {
    id: number;
    number: string;
    title: string;
    description: string;
    category: string;
    costPrice: number;
    sellingPrice: number;
  }
  
  export interface VitalsMonitoringChart {
    id: number;
    visitId: number;
    bloodPressure: string;
    pulseRate: number;
    respiratoryRate: number;
    spO2: number;
    temperature: number;
    map: number;
    initials: string;
    dateTime: string;
  }
  