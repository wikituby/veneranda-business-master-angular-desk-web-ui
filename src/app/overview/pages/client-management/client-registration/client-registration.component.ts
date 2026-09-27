import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../../../services/theme.service';
import { defaultContactValue } from '../../../../utils/phone-contact.util';

@Component({
  selector: 'app-client-registration',
  templateUrl: './client-registration.component.html',
  styleUrls: ['./client-registration.component.css']
})
export class ClientRegistrationComponent implements OnInit {
  isDarkMode: boolean = false;
  
  clientData: any = {
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    phone: defaultContactValue(),
    email: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    bloodGroup: '',
    allergies: '',
    medicalHistory: '',
    emergencyName: '',
    emergencyPhone: defaultContactValue(),
    emergencyRelation: ''
  };

  recentRegistrations = [
    { name: 'John Doe', initials: 'JD', fileNo: 'P001234', date: '2 hours ago' },
    { name: 'Jane Smith', initials: 'JS', fileNo: 'P001235', date: '5 hours ago' },
    { name: 'Michael Johnson', initials: 'MJ', fileNo: 'P001236', date: '1 day ago' }
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

  registerClient(formData: any): void {
    console.log('Registering client:', formData);
    // Implement client registration logic
  }

  clearForm(): void {
    this.clientData = {
      firstName: '',
      lastName: '',
      middleName: '',
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
      phone: defaultContactValue(),
      email: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      bloodGroup: '',
      allergies: '',
      medicalHistory: '',
      emergencyName: '',
      emergencyPhone: defaultContactValue(),
      emergencyRelation: ''
    };
  }

  saveDraft(): void {
    console.log('Saving draft:', this.clientData);
    // Implement draft save logic
  }

  searchClient(): void {
    console.log('Search client');
  }

  importClients(): void {
    console.log('Import clients');
  }
}
