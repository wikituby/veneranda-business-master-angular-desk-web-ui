import { Component } from '@angular/core';

@Component({
  selector: 'app-book-appointment',
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.css']
})
export class BookAppointmentComponent {
  readonly contact = {
    phones: ['+256 784 411 848', '+256 704 968 736'],
    phoneLinks: ['tel:+256784411848', 'tel:+256704968736'],
    email: 'venerandabusinessmaster@gmail.com'
  };

  form = {
    fullName: '',
    phone: '',
    email: '',
    preferredDate: '',
    preferredTime: '',
    serviceType: 'Product demo',
    notes: ''
  };

  submitted = false;

  readonly serviceOptions = [
    'Product demo',
    'Register a business',
    'Inventory & stock walkthrough',
    'Sales & checkout training',
    'Desktop + mobile setup',
    'Billing & subscription',
    'Other'
  ];

  submitRequest(): void {
    if (!this.form.fullName.trim() || !this.form.phone.trim()) {
      return;
    }

    const subject = encodeURIComponent(
      `Veneranda Business Master — ${this.form.serviceType}`
    );
    const body = encodeURIComponent(
      [
        `Name: ${this.form.fullName}`,
        `Phone: ${this.form.phone}`,
        `Email: ${this.form.email || 'Not provided'}`,
        `Request: ${this.form.serviceType}`,
        `Preferred date: ${this.form.preferredDate || 'Flexible'}`,
        `Preferred time: ${this.form.preferredTime || 'Flexible'}`,
        '',
        'Notes:',
        this.form.notes || 'None'
      ].join('\n')
    );

    this.submitted = true;
    window.location.href = `mailto:${this.contact.email}?subject=${subject}&body=${body}`;
  }
}
