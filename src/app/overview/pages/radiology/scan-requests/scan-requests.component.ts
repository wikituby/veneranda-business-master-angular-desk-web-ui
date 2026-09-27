import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-scan-requests',
  templateUrl: './scan-requests.component.html',
  styleUrls: ['./scan-requests.component.css']
})
export class ScanRequestsComponent implements OnInit {
  isDarkMode: boolean = false;
  searchQuery: string = '';
  scanTypeFilter: string = '';
  statusFilter: string = '';
  dateFilter: string = '';
  currentPage: number = 1;
  totalPages: number = 5;

  xrayRequests: number = 15;
  ctRequests: number = 8;
  mriRequests: number = 5;
  ultrasoundRequests: number = 12;

  requests = [
    {
      id: '001',
      client: { name: 'John Doe', initials: 'JD', fileNo: 'P001234' },
      scanType: 'xray',
      bodyPart: 'Chest',
      doctor: 'Dr. Smith',
      scheduleDate: '2024-01-20',
      scheduleTime: '10:00 AM',
      status: 'scheduled'
    },
    {
      id: '002',
      client: { name: 'Jane Smith', initials: 'JS', fileNo: 'P001235' },
      scanType: 'ct',
      bodyPart: 'Head',
      doctor: 'Dr. Johnson',
      scheduleDate: '2024-01-20',
      scheduleTime: '02:00 PM',
      status: 'completed'
    },
    {
      id: '003',
      client: { name: 'Michael Johnson', initials: 'MJ', fileNo: 'P001236' },
      scanType: 'mri',
      bodyPart: 'Spine',
      doctor: 'Dr. Williams',
      scheduleDate: '2024-01-21',
      scheduleTime: '09:00 AM',
      status: 'reported'
    }
  ];

  get filteredRequests(): any[] {
    return this.requests.filter(request => {
      const matchesSearch = !this.searchQuery || 
        request.client.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        request.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesType = !this.scanTypeFilter || request.scanType === this.scanTypeFilter;
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
  viewImages(request: any): void {}
  viewReport(request: any): void {}
  printRequest(request: any): void {}
}
