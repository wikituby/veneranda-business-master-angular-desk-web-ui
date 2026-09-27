import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-bed-management',
  templateUrl: './bed-management.component.html',
  styleUrls: ['./bed-management.component.css']
})
export class BedManagementComponent implements OnInit {
  isDarkMode: boolean = false;
  selectedWard: number = 1;
  viewMode: string = 'grid';
  
  totalBeds: number = 120;
  availableBeds: number = 45;
  reservedBeds: number = 8;
  maintenanceBeds: number = 3;

  wards = [
    { id: 1, name: 'General Ward', icon: 'bi-hospital', available: 25, total: 40 },
    { id: 2, name: 'ICU', icon: 'bi-heart-pulse', available: 5, total: 20 },
    { id: 3, name: 'Maternity', icon: 'bi-gender-female', available: 8, total: 30 },
    { id: 4, name: 'Pediatrics', icon: 'bi-emoji-smile', available: 7, total: 30 }
  ];

  beds = [
    { id: 1, wardId: 1, number: 'G-101', type: 'Standard', status: 'occupied', client: { name: 'John Doe', initials: 'JD', fileNo: 'P001234', age: 45 }, admissionDate: '2024-01-15', daysOccupied: 5 },
    { id: 2, wardId: 1, number: 'G-102', type: 'Standard', status: 'available', client: null, admissionDate: null, daysOccupied: null },
    { id: 3, wardId: 1, number: 'G-103', type: 'Standard', status: 'occupied', client: { name: 'Jane Smith', initials: 'JS', fileNo: 'P001235', age: 32 }, admissionDate: '2024-01-18', daysOccupied: 2 },
    { id: 4, wardId: 1, number: 'G-104', type: 'Standard', status: 'reserved', client: null, admissionDate: null, daysOccupied: null },
    { id: 5, wardId: 1, number: 'G-105', type: 'Standard', status: 'maintenance', client: null, admissionDate: null, daysOccupied: null },
    { id: 6, wardId: 2, number: 'ICU-01', type: 'ICU', status: 'occupied', client: { name: 'Michael Johnson', initials: 'MJ', fileNo: 'P001236', age: 55 }, admissionDate: '2024-01-19', daysOccupied: 1 },
    { id: 7, wardId: 2, number: 'ICU-02', type: 'ICU', status: 'available', client: null, admissionDate: null, daysOccupied: null },
    { id: 8, wardId: 3, number: 'M-201', type: 'Private', status: 'occupied', client: { name: 'Sarah Williams', initials: 'SW', fileNo: 'P001237', age: 28 }, admissionDate: '2024-01-20', daysOccupied: 0 }
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

  selectWard(wardId: number): void {
    this.selectedWard = wardId;
  }

  getWardName(): string {
    const ward = this.wards.find(w => w.id === this.selectedWard);
    return ward ? ward.name : 'Unknown';
  }

  getWardIcon(): string {
    const ward = this.wards.find(w => w.id === this.selectedWard);
    return ward ? ward.icon : 'bi-hospital';
  }

  getBedsForWard(): any[] {
    return this.beds.filter(bed => bed.wardId === this.selectedWard);
  }

  selectBed(bed: any): void {
    console.log('Selected bed:', bed);
  }

  assignBed(): void {
    console.log('Assign bed');
  }

  viewClientDetails(client: any): void {
    console.log('View client:', client);
  }

  transferClient(bed: any): void {
    console.log('Transfer client from bed:', bed);
  }

  assignBedToWard(bed: any): void {
    console.log('Assign client to bed:', bed);
  }
}
