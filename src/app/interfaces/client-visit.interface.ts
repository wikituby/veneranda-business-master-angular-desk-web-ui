export interface Client {
  id?: number;
  firstName: string;
  secondName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  profilePic?: string;
  clientGroup?: string;
}

export interface Visit {
  id?: number;
  clientId: number;
  visitDate: string;
  visitType: string;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface VitalSigns {
  id?: number;
  visitId: number;
  bloodPressure: string;
  temperature: string;
  heartRate: string;
  respiratoryRate: string;
  weight: string;
  height: string;
  takenBy: string;
  recordedAt: string;
}

export interface LabTest {
  id?: number;
  visitId: number;
  testName: string;
  testType: string;
  result?: string;
  normalRange?: string;
  status: 'pending' | 'completed' | 'cancelled';
  orderedBy: string;
  doneBy?: string;
  orderedAt: string;
  completedAt?: string;
}

export interface Scan {
  id?: number;
  visitId: number;
  scanType: string;
  scanName: string;
  result?: string;
  status: 'pending' | 'completed' | 'cancelled';
  orderedBy: string;
  doneBy?: string;
  orderedAt: string;
  completedAt?: string;
}

export interface Procedure {
  id?: number;
  visitId: number;
  procedureName: string;
  procedureType: string;
  description?: string;
  status: 'pending' | 'completed' | 'cancelled';
  orderedBy: string;
  doneBy?: string;
  orderedAt: string;
  completedAt?: string;
}

export interface Payment {
  id?: number;
  visitId: number;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'insurance';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentDate: string;
  reference?: string;
  notes?: string;
}

export interface Invoice {
  id?: number;
  visitId: number;
  invoiceNumber: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  netAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  createdAt: string;
  dueDate: string;
}

export interface CartItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
  availableQuantity: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
  success?: boolean;
}

