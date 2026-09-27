import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-referral-management',
  templateUrl: './referral-management.component.html',
  styleUrls: ['./referral-management.component.css']
})
export class ReferralManagementComponent implements OnInit {
  isDarkMode: boolean = false;

  constructor(
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }
}
