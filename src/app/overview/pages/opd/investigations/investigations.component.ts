import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-investigations',
  templateUrl: './investigations.component.html',
  styleUrls: ['./investigations.component.css']
})
export class InvestigationsComponent implements OnInit {
  isDarkMode: boolean = false;
  searchQuery: string = '';
  typeFilter: string = '';
  statusFilter: string = '';
  dateFilter: string = '';
  currentPage: number = 1;
  totalPages: number = 5;

  labRequests: number = 24;
  radiologyRequests: number = 18;
  pendingResults: number = 12;
  completedToday: number = 30;

  requests = [
    {
      id: '001',
      client: { name: 'John Doe', initials: 'JD', fileNo: 'P001234' },
      type: 'laboratory',
      testName: 'Complete Blood Count',
      testCode: 'CBC',
      doctor: 'Dr. Smith',
      date: '2024-01-20',
      time: '09:15 AM',
      status: 'pending'
    },
    {
      id: '002',
      client: { name: 'Jane Smith', initials: 'JS', fileNo: 'P001235' },
      type: 'radiology',
      testName: 'Chest X-Ray',
      testCode: 'CXR',
      doctor: 'Dr. Johnson',
      date: '2024-01-20',
      time: '10:30 AM',
      status: 'completed'
    }
  ];

  get filteredRequests(): any[] {
    return this.requests.filter(request => {
      const matchesSearch = !this.searchQuery || 
        request.client.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        request.testName.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesType = !this.typeFilter || request.type === this.typeFilter;
      const matchesStatus = !this.statusFilter || request.status === this.statusFilter;
      return matchesSearch && matchesType && matchesStatus;
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

  createRequest(): void {}
  viewDetails(request: any): void {}
  viewResults(request: any): void {}
  printRequest(request: any): void {}
}
