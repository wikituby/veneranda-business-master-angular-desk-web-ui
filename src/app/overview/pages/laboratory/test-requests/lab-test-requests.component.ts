import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-lab-test-requests',
  templateUrl: './lab-test-requests.component.html',
  styleUrls: ['./lab-test-requests.component.css']
})
export class LabTestRequestsComponent implements OnInit {
  isDarkMode: boolean = false;
  searchQuery: string = '';
  statusFilter: string = '';
  testTypeFilter: string = '';
  priorityFilter: string = '';
  dateFilter: string = '';
  currentPage: number = 1;
  totalPages: number = 5;

  pendingTests: number = 24;
  inProgressTests: number = 12;
  completedTests: number = 48;
  criticalResults: number = 3;

  testRequests = [
    {
      requestId: 'LAB-2024-001',
      client: { name: 'John Doe', initials: 'JD', fileNo: 'P001234' },
      testName: 'Complete Blood Count',
      testCode: 'CBC',
      testType: 'hematology',
      requestedBy: 'Dr. Smith',
      department: 'General Medicine',
      priority: 'routine',
      status: 'pending',
      requestDate: '2024-01-20',
      requestTime: '09:15 AM'
    },
    {
      requestId: 'LAB-2024-002',
      client: { name: 'Jane Smith', initials: 'JS', fileNo: 'P001235' },
      testName: 'Blood Glucose',
      testCode: 'BG',
      testType: 'biochemistry',
      requestedBy: 'Dr. Johnson',
      department: 'Endocrinology',
      priority: 'urgent',
      status: 'in-progress',
      requestDate: '2024-01-20',
      requestTime: '09:30 AM'
    },
    {
      requestId: 'LAB-2024-003',
      client: { name: 'Michael Johnson', initials: 'MJ', fileNo: 'P001236' },
      testName: 'Culture & Sensitivity',
      testCode: 'C&S',
      testType: 'microbiology',
      requestedBy: 'Dr. Williams',
      department: 'Infectious Disease',
      priority: 'stat',
      status: 'completed',
      requestDate: '2024-01-19',
      requestTime: '02:45 PM'
    }
  ];

  get filteredRequests(): any[] {
    return this.testRequests.filter(request => {
      const matchesSearch = !this.searchQuery || 
        request.client.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        request.testName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        request.requestId.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesStatus = !this.statusFilter || request.status === this.statusFilter;
      const matchesType = !this.testTypeFilter || request.testType === this.testTypeFilter;
      const matchesPriority = !this.priorityFilter || request.priority === this.priorityFilter;
      
      return matchesSearch && matchesStatus && matchesType && matchesPriority;
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

  createNewRequest(): void {
    console.log('Create new test request');
  }

  viewDetails(request: any): void {
    console.log('View details:', request);
  }

  processRequest(request: any): void {
    console.log('Process request:', request);
  }

  viewResults(request: any): void {
    console.log('View results:', request);
  }

  printRequest(request: any): void {
    console.log('Print request:', request);
  }
}
