import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-contact-page',
  templateUrl: './contact-page.component.html',
  styleUrls: ['./contact-page.component.css']
})
export class ContactPageComponent {
  readonly contact = {
    phones: ['+256 784 411 848', '+256 704 968 736'],
    phoneLinks: ['tel:+256784411848', 'tel:+256704968736'],
    email: 'venerandabusinessmaster@gmail.com',
    location: 'H5VH+6R, Lukwemigo',
    hours: [
      { day: 'Mon – Sat', note: 'Business support during working hours' },
      { day: 'Sunday', note: 'Email support — we reply next business day' }
    ]
  };

  form = {
    fullName: '',
    phone: '',
    email: '',
    subject: 'General enquiry',
    message: ''
  };

  submitting = false;
  submitted = false;
  submitError = '';
  submitSuccess = '';

  readonly subjects = [
    'General enquiry',
    'Register a business',
    'Demo / walkthrough',
    'Billing & subscription',
    'Technical support',
    'Partnership',
    'Other'
  ];

  readonly mapUrl: SafeResourceUrl;
  readonly mapsSearchUrl: string;

  constructor(
    private sanitizer: DomSanitizer,
    private api: ApiService
  ) {
    const query = encodeURIComponent('H5VH+6R, Lukwemigo');
    this.mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${query}&z=16&output=embed`
    );
  }

  submitContact(): void {
    if (!this.form.fullName.trim() || !this.form.phone.trim() || !this.form.message.trim()) {
      return;
    }
    if (this.submitting) {
      return;
    }

    this.submitting = true;
    this.submitError = '';
    this.submitSuccess = '';
    this.submitted = false;

    this.api
      .submitWebsiteContactMessage({
        fullName: this.form.fullName.trim(),
        phone: this.form.phone.trim(),
        email: this.form.email.trim(),
        subject: this.form.subject,
        message: this.form.message.trim()
      })
      .subscribe({
        next: (res) => {
          this.submitting = false;
          this.submitted = true;
          this.submitSuccess =
            res?.message ||
            'Your message was received. Veneranda Business Master will respond as soon as possible.';
          this.form = {
            fullName: '',
            phone: '',
            email: '',
            subject: 'General enquiry',
            message: ''
          };
        },
        error: (err) => {
          this.submitting = false;
          this.submitError =
            err?.error?.message ||
            'Could not send your message right now. Please call us or try again shortly.';
        }
      });
  }
}
