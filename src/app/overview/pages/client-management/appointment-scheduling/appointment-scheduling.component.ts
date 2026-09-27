import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-appointment-scheduling',
  templateUrl: './appointment-scheduling.component.html',
  styleUrls: ['./appointment-scheduling.component.css']
})
export class AppointmentSchedulingComponent implements OnInit {
  isDarkMode: boolean = false;
  viewMode: string = 'list';
  searchQuery: string = '';
  doctorFilter: string = '';
  statusFilter: string = '';
  dateFilter: string = '';
  currentPage: number = 1;
  totalPages: number = 5;

  todayAppointments: number = 24;
  upcomingAppointments: number = 48;
  pendingAppointments: number = 12;
  completedToday: number = 18;

  appointments = [
    {
      id: '001',
      client: { name: 'John Doe', initials: 'JD', fileNo: 'P001234' },
      doctor: 'Dr. Smith',
      department: 'General Medicine',
      date: '2024-01-20',
      time: '10:00 AM',
      type: 'consultation',
      status: 'scheduled'
    },
    {
      id: '002',
      client: { name: 'Jane Smith', initials: 'JS', fileNo: 'P001235' },
      doctor: 'Dr. Johnson',
      department: 'Cardiology',
      date: '2024-01-20',
      time: '02:30 PM',
      type: 'follow-up',
      status: 'confirmed'
    },
    {
      id: '003',
      client: { name: 'Michael Johnson', initials: 'MJ', fileNo: 'P001236' },
      doctor: 'Dr. Williams',
      department: 'Pediatrics',
      date: '2024-01-21',
      time: '09:00 AM',
      type: 'consultation',
      status: 'scheduled'
    }
  ];

  get filteredAppointments(): any[] {
    return this.appointments.filter(apt => {
      const matchesSearch = !this.searchQuery || 
        apt.client.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        apt.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesDoctor = !this.doctorFilter || apt.doctor.toLowerCase().includes(this.doctorFilter.toLowerCase());
      const matchesStatus = !this.statusFilter || apt.status === this.statusFilter;
      return matchesSearch && matchesDoctor && matchesStatus;
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

  createAppointment(): void {
    console.log('Create appointment');
  }

  setViewMode(mode: string): void {
    this.viewMode = mode;
  }

  viewDetails(appointment: any): void {
    console.log('View details:', appointment);
  }

  editAppointment(appointment: any): void {
    console.log('Edit appointment:', appointment);
  }

  cancelAppointment(appointment: any): void {
    console.log('Cancel appointment:', appointment);
  }
}
