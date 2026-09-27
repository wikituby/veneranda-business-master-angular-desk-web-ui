import { Component } from '@angular/core';

@Component({
  selector: 'app-about-page',
  templateUrl: './about-page.component.html',
  styleUrls: ['./about-page.component.css']
})
export class AboutPageComponent {
  readonly defaultPersonImage = 'assets/images/default-person.svg';
  readonly aboutHeroImage = 'assets/images/hero/business/business_shop_floor.png';

  leadership = [
    {
      name: 'Product & support team',
      role: 'Customer success',
      description: 'Helps shops go live with inventory, sales, and day-to-day operations.'
    },
    {
      name: 'Engineering',
      role: 'Platform',
      description: 'Builds the desktop console, mobile app, and shared business backend.'
    },
    {
      name: 'Partnerships',
      role: 'Growth',
      description: 'Works with retailers and distributors adopting Veneranda Business Master.'
    }
  ];

  boardOfAdvisors: Array<{ name: string; role: string }> = [];

  personImage(person: { image?: string }): string {
    return person.image || this.defaultPersonImage;
  }
}
