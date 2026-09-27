import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-consultation',
  templateUrl: './consultation.component.html',
  styleUrls: ['./consultation.component.css']
})
export class ConsultationComponent implements OnInit {
  isDarkMode: boolean = false;
  searchQuery: string = '';
  selectedClient: any = null;

  filteredClients: any[] = [
    {
      clientFileNo: 'P001234',
      name: 'John Doe',
      initials: 'JD',
      fileNo: 'P001234',
      age: 45,
      gender: 'Male',
      status: 'waiting',
      waitTime: '15 min',
      appointmentTime: '09:00 AM',
      department: 'General Medicine',
      active: false,
      profilePic: 'assets/images/vector.jpeg',
      phone: '+256 700 000 000'
    },
    {
      clientFileNo: 'P001235',
      name: 'Jane Smith',
      initials: 'JS',
      fileNo: 'P001235',
      age: 32,
      gender: 'Female',
      status: 'in-progress',
      waitTime: '5 min',
      appointmentTime: '09:15 AM',
      department: 'Cardiology',
      active: true,
      profilePic: 'assets/images/vector.jpeg',
      phone: '+256 700 000 001'
    },
    {
      clientFileNo: 'P001236',
      name: 'Michael Johnson',
      initials: 'MJ',
      fileNo: 'P001236',
      age: 28,
      gender: 'Male',
      status: 'waiting',
      waitTime: '25 min',
      appointmentTime: '09:30 AM',
      department: 'Pediatrics',
      active: false,
      profilePic: 'assets/images/vector.jpeg',
      phone: '+256 700 000 002'
    }
  ];

  constructor(
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  startNewConsultation(): void {
    // Implementation for new consultation
    console.log('Starting new consultation');
  }

  startConsultation(client: any): void {
    this.selectedClient = client;
    // Update active status
    this.filteredClients.forEach(p => p.active = p.clientFileNo === client.clientFileNo);
  }
}
