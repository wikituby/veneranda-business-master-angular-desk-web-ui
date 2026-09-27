import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-prescriptions',
  templateUrl: './prescriptions.component.html',
  styleUrls: ['./prescriptions.component.css']
})
export class PrescriptionsComponent implements OnInit {
  isDarkMode: boolean = false;
  searchQuery: string = '';
  statusFilter: string = '';
  doctorFilter: string = '';
  dateFilter: string = '';
  currentPage: number = 1;
  totalPages: number = 5;

  todayPrescriptions: number = 45;
  pendingDispensing: number = 18;
  completedToday: number = 27;
  activePrescriptions: number = 120;

  prescriptions = [
    {
      id: '001',
      client: { name: 'John Doe', initials: 'JD', fileNo: 'P001234' },
      doctor: 'Dr. Smith',
      department: 'General Medicine',
      medicationCount: 3,
      medicationPreview: 'Amoxicillin, Paracetamol, Cough Syrup',
      date: '2024-01-20',
      time: '09:15 AM',
      status: 'pending'
    },
    {
      id: '002',
      client: { name: 'Jane Smith', initials: 'JS', fileNo: 'P001235' },
      doctor: 'Dr. Johnson',
      department: 'Cardiology',
      medicationCount: 2,
      medicationPreview: 'Aspirin, Atorvastatin',
      date: '2024-01-20',
      time: '10:30 AM',
      status: 'dispensed'
    },
    {
      id: '003',
      client: { name: 'Michael Johnson', initials: 'MJ', fileNo: 'P001236' },
      doctor: 'Dr. Williams',
      department: 'Pediatrics',
      medicationCount: 4,
      medicationPreview: 'Amoxicillin, Ibuprofen, Antihistamine, Vitamins',
      date: '2024-01-19',
      time: '02:45 PM',
      status: 'completed'
    }
  ];

  get filteredPrescriptions(): any[] {
    return this.prescriptions.filter(prescription => {
      const matchesSearch = !this.searchQuery || 
        prescription.client.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        prescription.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesStatus = !this.statusFilter || prescription.status === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  constructor(
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  createNewPrescription(): void {
    console.log('Create new prescription');
  }

  viewPrescription(prescription: any): void {
    console.log('View prescription:', prescription);
  }

  printPrescription(prescription: any): void {
    console.log('Print prescription:', prescription);
  }

  editPrescription(prescription: any): void {
    console.log('Edit prescription:', prescription);
  }
}
