import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-pharmacy-dispensing',
  templateUrl: './pharmacy-dispensing.component.html',
  styleUrls: ['./pharmacy-dispensing.component.css']
})
export class PharmacyDispensingComponent implements OnInit {
  isDarkMode: boolean = false;
  searchQuery: string = '';
  priorityFilter: string = '';
  selectedPrescription: any = null;

  pendingPrescriptions: number = 18;
  dispensedToday: number = 45;
  lowStockItems: number = 7;
  todayRevenue: number = 12500;

  prescriptions = [
    {
      id: '001',
      date: '2024-01-20',
      client: { name: 'John Doe', initials: 'JD', fileNo: 'P001234', age: 45, gender: 'Male' },
      doctor: 'Dr. Smith',
      itemsCount: 3,
      status: 'pending',
      priority: 'normal',
      medications: [
        {
          name: 'Amoxicillin 500mg',
          dosage: '500mg',
          frequency: 'Twice daily',
          duration: '7 days',
          instructions: 'Take with food',
          quantity: 14,
          unit: 'tablets',
          stock: 150,
          price: 2.50,
          dispensedQuantity: 0
        },
        {
          name: 'Paracetamol 500mg',
          dosage: '500mg',
          frequency: 'As needed',
          duration: '5 days',
          instructions: 'Take for pain',
          quantity: 10,
          unit: 'tablets',
          stock: 200,
          price: 0.50,
          dispensedQuantity: 0
        },
        {
          name: 'Cough Syrup',
          dosage: '10ml',
          frequency: 'Three times daily',
          duration: '5 days',
          instructions: 'Shake well before use',
          quantity: 1,
          unit: 'bottle',
          stock: 0,
          price: 5.00,
          dispensedQuantity: 0
        }
      ]
    },
    {
      id: '002',
      date: '2024-01-20',
      client: { name: 'Jane Smith', initials: 'JS', fileNo: 'P001235', age: 32, gender: 'Female' },
      doctor: 'Dr. Johnson',
      itemsCount: 2,
      status: 'pending',
      priority: 'urgent',
      medications: [
        {
          name: 'Ibuprofen 400mg',
          dosage: '400mg',
          frequency: 'Three times daily',
          duration: '3 days',
          instructions: 'Take with meals',
          quantity: 9,
          unit: 'tablets',
          stock: 80,
          price: 1.50,
          dispensedQuantity: 0
        }
      ]
    }
  ];

  get filteredPrescriptions(): any[] {
    return this.prescriptions.filter(prescription => {
      const matchesSearch = !this.searchQuery || 
        prescription.client.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        prescription.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesPriority = !this.priorityFilter || prescription.priority === this.priorityFilter;
      
      return matchesSearch && matchesPriority;
    });
  }

  get dispensingSummary(): any[] {
    if (!this.selectedPrescription) return [];
    return this.selectedPrescription.medications
      .filter((med: any) => med.dispensedQuantity > 0)
      .map((med: any) => ({
        name: med.name,
        quantity: med.dispensedQuantity,
        unit: med.unit,
        price: med.price,
        total: med.dispensedQuantity * med.price
      }));
  }

  get totalAmount(): number {
    return this.dispensingSummary.reduce((sum, item) => sum + item.total, 0);
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

  newDispensing(): void {
    console.log('New dispensing');
  }

  selectPrescription(prescription: any): void {
    this.selectedPrescription = { ...prescription };
  }

  dispenseMedication(medication: any): void {
    medication.dispensedQuantity = medication.quantity;
  }

  partialDispense(medication: any): void {
    medication.dispensedQuantity = medication.stock;
  }

  completeDispensing(): void {
    console.log('Complete dispensing:', this.selectedPrescription);
  }
}
