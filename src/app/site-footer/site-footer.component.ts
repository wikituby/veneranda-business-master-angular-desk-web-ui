import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-site-footer',
  templateUrl: './site-footer.component.html',
  styleUrls: ['./site-footer.component.css']
})
export class SiteFooterComponent {
  readonly venerandaLogo = 'assets/images/veneranda-business-logo.png';

  readonly contactDetails = {
    phones: ['+256 784 411 848', '+256 704 968 736'],
    phoneLinks: ['tel:+256784411848', 'tel:+256704968736'],
    email: 'venerandabusinessmaster@gmail.com',
    location: 'H5VH+6R, Lukwemigo'
  };

  constructor(private router: Router) {}

  navigateToOverview(): void {
    this.router.navigate(['/login']);
  }
}
