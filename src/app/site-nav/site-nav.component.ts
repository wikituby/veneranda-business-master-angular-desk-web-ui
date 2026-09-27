import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import {
  getOfferedServices,
  getUpcomingServices,
  LandingServiceItem
} from '../landing-page/service-catalog';

@Component({
  selector: 'app-site-nav',
  templateUrl: './site-nav.component.html',
  styleUrls: ['./site-nav.component.css']
})
export class SiteNavComponent {
  readonly venerandaLogo = 'assets/images/veneranda-nav-logo.png';
  readonly offeredServices: LandingServiceItem[] = getOfferedServices();
  readonly upcomingServices: LandingServiceItem[] = getUpcomingServices();

  openMenu: 'services' | 'upcoming' | null = null;

  constructor(private router: Router) {}

  navigateToOverview(): void {
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.closeMenus();
    this.router.navigate(['/login'], { queryParams: { tab: 'signup' } });
  }

  toggleMenu(menu: 'services' | 'upcoming', event?: Event): void {
    event?.preventDefault();
    this.openMenu = this.openMenu === menu ? null : menu;
  }

  openOnHover(menu: 'services' | 'upcoming'): void {
    this.openMenu = menu;
  }

  closeMenus(): void {
    this.openMenu = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.site-nav-dropdown')) {
      this.closeMenus();
    }
  }
}
