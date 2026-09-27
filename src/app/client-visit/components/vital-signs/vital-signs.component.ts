import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VitalSigns } from '../../../interfaces/client-visit.interface';

@Component({
  selector: 'app-vital-signs',
  templateUrl: './vital-signs.component.html',
  styleUrls: ['./vital-signs.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VitalSignsComponent implements OnInit {
  @Input() vitals: VitalSigns[] = [];
  @Input() visitId: number | null = null;
  @Input() isLoading = false;
  @Input() isUpdating = false;
  @Output() addVitals = new EventEmitter<VitalSigns>();
  @Output() updateVitals = new EventEmitter<{ id: number; vitals: Partial<VitalSigns> }>();
  @Output() deleteVitals = new EventEmitter<number>();

  vitalForm: FormGroup;
  isFormVisible = false;
  editingVitalId: number | null = null;

  constructor(private fb: FormBuilder) {
    this.vitalForm = this.createVitalForm();
  }

  ngOnInit(): void {
    // Initialize form
  }

  private createVitalForm(): FormGroup {
    return this.fb.group({
      bloodPressure: ['', [Validators.required, Validators.pattern(/^\d+\/\d+$/)]],
      temperature: ['', [Validators.required, Validators.min(30), Validators.max(45)]],
      heartRate: ['', [Validators.required, Validators.min(40), Validators.max(200)]],
      respiratoryRate: ['', [Validators.required, Validators.min(8), Validators.max(40)]],
      weight: ['', [Validators.required, Validators.min(20), Validators.max(300)]],
      height: ['', [Validators.required, Validators.min(50), Validators.max(250)]],
      takenBy: ['', Validators.required]
    });
  }

  showAddForm(): void {
    this.isFormVisible = true;
    this.editingVitalId = null;
    this.vitalForm.reset();
  }

  showEditForm(vital: VitalSigns): void {
    this.isFormVisible = true;
    this.editingVitalId = vital.id!;
    this.vitalForm.patchValue(vital);
  }

  hideForm(): void {
    this.isFormVisible = false;
    this.editingVitalId = null;
    this.vitalForm.reset();
  }

  onSubmit(): void {
    if (this.vitalForm.valid && this.visitId) {
      const vitalData: Omit<VitalSigns, 'id'> = {
        ...this.vitalForm.value,
        visitId: this.visitId,
        recordedAt: new Date().toISOString()
      };

      if (this.editingVitalId) {
        this.updateVitals.emit({
          id: this.editingVitalId,
          vitals: vitalData
        });
      } else {
        this.addVitals.emit(vitalData);
      }

      this.hideForm();
    }
  }

  onDelete(vitalId: number): void {
    if (confirm('Are you sure you want to delete this vital sign record?')) {
      this.deleteVitals.emit(vitalId);
    }
  }

  getFormControl(name: string) {
    return this.vitalForm.get(name);
  }

  hasError(controlName: string, errorType: string): boolean {
    const control = this.getFormControl(controlName);
    return !!(control && control.hasError(errorType) && control.touched);
  }
}
