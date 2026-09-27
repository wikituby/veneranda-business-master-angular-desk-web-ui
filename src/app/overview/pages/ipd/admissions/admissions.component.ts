import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-admissions',
  templateUrl: './admissions.component.html',
  styleUrls: ['./admissions.component.css']
})
export class AdmissionsComponent implements OnInit {
  isDarkMode: boolean = false;
  searchQuery: string = '';
  wardFilter: string = '';
  statusFilter: string = '';
  dateFilter: string = '';
  currentPage: number = 1;
  totalPages: number = 5;

  todayAdmissions: number = 8;
  activeAdmissions: number = 75;
  pendingAdmissions: number = 3;
  bedOccupancy: number = 85;

  admissions = [
    {
      id: '001',
      client: { name: 'John Doe', initials: 'JD', fileNo: 'P001234', age: 45 },
      doctor: 'Dr. Smith',
      department: 'General Medicine',
      ward: 'General Ward',
      bed: 'G-101',
      admissionDate: '2024-01-20',
      admissionTime: '09:15 AM',
      diagnosis: 'Pneumonia',
      status: 'admitted'
    },
    {
      id: '002',
      client: { name: 'Jane Smith', initials: 'JS', fileNo: 'P001235', age: 32 },
      doctor: 'Dr. Johnson',
      department: 'Cardiology',
      ward: 'ICU',
      bed: 'ICU-01',
      admissionDate: '2024-01-20',
      admissionTime: '10:30 AM',
      diagnosis: 'Acute MI',
      status: 'admitted'
    },
    {
      id: '003',
      client: { name: 'Michael Johnson', initials: 'MJ', fileNo: 'P001236', age: 28 },
      doctor: 'Dr. Williams',
      department: 'Pediatrics',
      ward: 'Pediatrics',
      bed: 'P-201',
      admissionDate: '2024-01-19',
      admissionTime: '02:45 PM',
      diagnosis: 'Bronchitis',
      status: 'admitted'
    }
  ];

  get filteredAdmissions(): any[] {
    return this.admissions.filter(admission => {
      const matchesSearch = !this.searchQuery || 
        admission.client.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        admission.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesWard = !this.wardFilter || admission.ward.toLowerCase().includes(this.wardFilter.toLowerCase());
      const matchesStatus = !this.statusFilter || admission.status === this.statusFilter;
      
      return matchesSearch && matchesWard && matchesStatus;
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

  admitClient(): void {
    console.log('Admit client');
  }

  viewWards(): void {
    console.log('View wards');
  }

  viewBeds(): void {
    console.log('View beds');
  }

  emergencyAdmission(): void {
    console.log('Emergency admission');
  }

  viewDetails(admission: any): void {
    console.log('View details:', admission);
  }

  transferClient(admission: any): void {
    console.log('Transfer client:', admission);
  }

  dischargeClient(admission: any): void {
    console.log('Discharge client:', admission);
  }
}
