import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { getOfferedServices, getUpcomingServices } from './service-catalog';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css'],
  animations: [
    trigger('fadeIn', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('700ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class LandingPageComponent implements OnInit, OnDestroy {
  currentSlide = 0;
  autoSlideInterval: any;

  readonly brandName = 'Veneranda Business Master';

  slides = [
    {
      image: 'assets/images/hero/business/business_aisle.png',
      imagePosition: '78% 40%',
      scene: '01',
      kicker: 'Live inventory',
      title: 'Every shelf,\naccounted for',
      description:
        'Walk the aisle with stock that matches the system — receive, count, move, sell.'
    },
    {
      image: 'assets/images/hero/business/business_pos.png',
      imagePosition: '70% 45%',
      scene: '02',
      kicker: 'At the counter',
      title: 'Checkout that\nkeeps pace',
      description:
        'Scan, sell, and settle without the backlog — receipts and cash draw in one flow.'
    },
    {
      image: 'assets/images/hero/business/business_managers.png',
      imagePosition: '62% 38%',
      scene: '03',
      kicker: 'After hours',
      title: 'Close the day\nwith clarity',
      description:
        'Sales, expenses, and client balances — one picture owners can trust overnight.'
    }
  ];

  get slideIndexLabel(): string {
    const n = this.currentSlide + 1;
    const total = this.slides.length;
    return `${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  }

  get activeSlide() {
    return this.slides[this.currentSlide];
  }

  contactDetails = {
    phones: ['+256 784 411 848', '+256 704 968 736'],
    phoneLinks: ['tel:+256784411848', 'tel:+256704968736'],
    email: 'venerandabusinessmaster@gmail.com',
    location: 'Bugogo · Kyegegwa'
  };

  features = getOfferedServices();
  roadmap = getUpcomingServices();

  platforms = [
    {
      icon: 'bi-laptop',
      title: 'Desktop & web',
      text: 'Full Angular console for inventory depth, finance, multi-store control, and reporting.'
    },
    {
      icon: 'bi-phone',
      title: 'Mobile app',
      text: 'Flutter business app for sales, stock checks, and day-to-day work on the floor.'
    },
    {
      icon: 'bi-hdd-network',
      title: 'Shared backend',
      text: 'One Quarkus API and database so desktop and mobile stay on the same truth.'
    }
  ];

  outcomes = [
    {
      title: 'Fewer stock surprises',
      text: 'Receive, adjust, transfer, and verify so counters stop selling what is not on the shelf.'
    },
    {
      title: 'Faster checkout',
      text: 'Barcode-assisted sales with client history keep the queue moving without losing records.'
    },
    {
      title: 'Clearer cash picture',
      text: 'Expenses, debts, loans, and sales reports sit next to inventory — not in a separate notebook.'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    this.pauseAutoSlide();
  }

  startAutoSlide(): void {
    this.pauseAutoSlide();
    this.autoSlideInterval = setInterval(() => this.nextSlide(), 6000);
  }

  pauseAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
      this.autoSlideInterval = null;
    }
  }

  resumeAutoSlide(): void {
    this.startAutoSlide();
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  previousSlide(): void {
    this.currentSlide =
      this.currentSlide === 0 ? this.slides.length - 1 : this.currentSlide - 1;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  goLogin(): void {
    this.router.navigate(['/login']);
  }

  goRegister(): void {
    this.router.navigate(['/login'], { queryParams: { tab: 'signup' } });
  }
}
