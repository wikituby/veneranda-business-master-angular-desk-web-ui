import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService } from '../services/api.service';
import { ThemeService } from '../services/theme.service';

export type UserProfileTab =
  | 'biodata'
  | 'job'
  | 'policies'
  | 'contracts'
  | 'remuneration';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  profileImage = 'assets/images/vector.jpeg';
  fullName = 'User';
  role = 'Staff';
  email = '';
  contact = '';
  qualification = 'Not specified';
  bio = 'No personal biodata available.';
  userType = 'N/A';
  username = '';
  secondaryRoles = '';
  isDarkMode = false;
  private themeSub?: Subscription;

  readonly tabs: { id: UserProfileTab; label: string; icon: string }[] = [
    { id: 'biodata', label: 'Biodata', icon: 'bi-person-vcard' },
    { id: 'job', label: 'Job & Responsibilities', icon: 'bi-briefcase' },
    { id: 'policies', label: 'Policies & Violations', icon: 'bi-shield-exclamation' },
    { id: 'contracts', label: 'Contracts & Duty', icon: 'bi-file-earmark-text' },
    { id: 'remuneration', label: 'Remuneration & Wages', icon: 'bi-cash-stack' }
  ];
  activeTab: UserProfileTab = 'biodata';

  personalDetails: { label: string; value: string }[] = [];
  policyItems: { title: string; details: string }[] = [];
  responsibilityItems: { title: string; details: string }[] = [];
  violationItems: { title: string; details: string; status: string }[] = [];
  contractItems: { title: string; details: string; meta?: string }[] = [];
  dutyScheduleItems: { day: string; shift: string; station: string; hours: string }[] = [];
  remunerationItems: { label: string; value: string; hint?: string }[] = [];
  wageHistory: { period: string; gross: string; net: string; status: string }[] = [];

  profilePicUploadProgress = 0;
  profilePicUploading = false;
  profilePicUploadMessage = '';
  profilePicUploadError = '';
  showProfilePicChooser = false;
  private readonly profilePicMaxBytes = 5 * 1024 * 1024;
  profilePicHistory: string[] = [];
  private readonly profilePicHistoryLimit = 12;

  constructor(private api: ApiService, private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeSub = this.themeService.isDarkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });
    const username = sessionStorage.getItem('username') || '';
    const useremail = sessionStorage.getItem('useremail') || '';
    const userrole = sessionStorage.getItem('userrole') || '';
    const userType = sessionStorage.getItem('userType') || '';
    const profilePic = sessionStorage.getItem('userProfilePic') || '';
    const secondaryRoles = sessionStorage.getItem('userSecondaryRoles') || '';
    const userDetailsRaw = sessionStorage.getItem('userDetails');

    let details: any = {};
    if (userDetailsRaw) {
      try {
        details = JSON.parse(userDetailsRaw);
      } catch {
        details = {};
      }
    }

    this.username = details?.username || username || '—';
    this.fullName =
      details?.fullName ||
      details?.name ||
      [details?.firstName, details?.lastName].filter(Boolean).join(' ') ||
      username ||
      'User';
    this.role = details?.role || userrole || 'Staff';
    this.email = details?.email || useremail || 'N/A';
    this.contact = details?.contact || details?.phone || details?.mobile || 'N/A';
    this.qualification = details?.qualification || details?.education || 'Not specified';
    this.bio = details?.bio || details?.biodata || 'No personal biodata available.';
    this.userType = userType || details?.userType || 'N/A';
    this.secondaryRoles =
      secondaryRoles ||
      (Array.isArray(details?.secondaryRoles) ? details.secondaryRoles.join(', ') : details?.secondaryRoles) ||
      'None';
    this.profileImage = profilePic || details?.profileImage || details?.avatar || details?.profilePic || this.profileImage;

    const rawId = sessionStorage.getItem('userid');
    const userId = rawId != null && rawId !== '' ? Number(rawId) : NaN;
    if (Number.isFinite(userId) && userId > 0) {
      this.loadProfilePicHistory(userId);
    }

    this.personalDetails = [
      { label: 'Full name', value: this.fullName },
      { label: 'Username', value: this.username },
      { label: 'Primary role', value: this.role },
      { label: 'Secondary roles', value: this.secondaryRoles },
      { label: 'Email', value: this.email },
      { label: 'Contact', value: this.contact },
      { label: 'Qualification', value: this.qualification },
      { label: 'User type', value: this.userType }
    ];

    this.responsibilityItems = [
      {
        title: 'Job description',
        details: 'Maintain complete, accurate, and timely documentation for all assigned client interactions.'
      },
      {
        title: 'Client safety',
        details: 'Follow infection prevention procedures and escalate safety incidents immediately.'
      },
      {
        title: 'Team collaboration',
        details: 'Coordinate with departments for referrals, follow-ups, and continuity of care.'
      },
      {
        title: 'System stewardship',
        details: 'Use hospital systems responsibly, protect credentials, and report access issues promptly.'
      }
    ];

    this.policyItems = [
      {
        title: 'Code of Conduct',
        details: 'Follow professional standards and maintain client confidentiality at all times.'
      },
      {
        title: 'Data Privacy Policy',
        details: 'Use client information only for approved clinical and administrative workflows.'
      },
      {
        title: 'Attendance Policy',
        details: 'Staff are expected to maintain punctuality and complete shift handover properly.'
      },
      {
        title: 'Workplace Safety',
        details: 'Comply with occupational health guidelines, PPE requirements, and incident reporting.'
      }
    ];

    this.violationItems = [
      {
        title: 'No active violations',
        details: 'There are currently no violations recorded on this account.',
        status: 'clear'
      }
    ];

    this.contractItems = [
      {
        title: 'Employment Contract',
        details: 'Primary service contract covering role, reporting line, and agreed responsibilities.',
        meta: 'Active · Permanent'
      },
      {
        title: 'Confidentiality Agreement',
        details: 'NDA and data handling obligations for clinical and operational data.',
        meta: 'Signed'
      },
      {
        title: 'Duty roster acknowledgment',
        details: 'Staff confirm awareness of current station assignments and handover expectations.',
        meta: 'Current cycle'
      }
    ];

    this.dutyScheduleItems = [
      { day: 'Monday', shift: 'Morning', station: 'Assigned clinic', hours: '08:00 – 14:00' },
      { day: 'Tuesday', shift: 'Morning', station: 'Assigned clinic', hours: '08:00 – 14:00' },
      { day: 'Wednesday', shift: 'Afternoon', station: 'Assigned clinic', hours: '14:00 – 20:00' },
      { day: 'Thursday', shift: 'Morning', station: 'Assigned clinic', hours: '08:00 – 14:00' },
      { day: 'Friday', shift: 'Morning', station: 'Assigned clinic', hours: '08:00 – 14:00' }
    ];

    this.remunerationItems = [
      { label: 'Basic salary', value: 'UGX —', hint: 'Configured by HR / payroll' },
      { label: 'Allowances', value: 'UGX —', hint: 'Duty, housing, or transport where applicable' },
      { label: 'Statutory deductions', value: 'UGX —', hint: 'NSSF / PAYE and related items' },
      { label: 'Net pay (estimate)', value: 'UGX —', hint: 'Subject to current payroll cycle' }
    ];

    this.wageHistory = [
      { period: 'Current cycle', gross: '—', net: '—', status: 'Pending HR sync' },
      { period: 'Previous cycle', gross: '—', net: '—', status: 'Not linked yet' }
    ];
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  setActiveTab(tab: UserProfileTab): void {
    this.activeTab = tab;
  }

  violationStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'clear' || s === 'resolved') return 'up-status up-status-ok';
    if (s === 'warning' || s === 'pending') return 'up-status up-status-warn';
    return 'up-status up-status-bad';
  }

  async onProfilePictureSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.profilePicUploadError = '';
    this.profilePicUploadMessage = '';

    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.profilePicUploadError = 'Please choose an image file.';
      return;
    }
    if (file.size > this.profilePicMaxBytes) {
      this.profilePicUploadError = 'Image must be 5 MB or smaller.';
      return;
    }

    const rawId = sessionStorage.getItem('userid');
    const userId = rawId != null && rawId !== '' ? Number(rawId) : NaN;
    if (!Number.isFinite(userId) || userId < 1) {
      this.profilePicUploadError = 'Missing user id. Please sign in again.';
      return;
    }

    this.profilePicUploading = true;
    this.profilePicUploadProgress = 10;

    try {
      const croppedFile = await this.cropImageToSquare(file, 512);
      this.profilePicUploadProgress = 30;

      this.api.uploadProfilePictureToCloudinary(croppedFile).subscribe({
        next: (fileUrl: string) => {
          this.profilePicUploadProgress = 70;
          this.api.updateProfilePic(userId, fileUrl).subscribe({
            next: (res: any) => {
              const d = res?.data ?? res;
              const savedProfilePic = d?.profilePic ?? fileUrl;
              this.profileImage = savedProfilePic;
              sessionStorage.setItem('userProfilePic', savedProfilePic);
              this.saveProfilePicHistory(userId, savedProfilePic);
              const rawDetails = sessionStorage.getItem('userDetails');
              if (rawDetails) {
                try {
                  const details = JSON.parse(rawDetails);
                  details.profilePic = savedProfilePic;
                  sessionStorage.setItem('userDetails', JSON.stringify(details));
                } catch {
                  /* ignore */
                }
              }
              this.profilePicUploadMessage = 'Profile picture updated.';
              this.profilePicUploadProgress = 100;
              this.profilePicUploading = false;
              this.showProfilePicChooser = false;
            },
            error: (err: any) => {
              this.profilePicUploadError =
                err?.error?.message || err?.message || 'Failed to save profile picture.';
              this.profilePicUploadProgress = 0;
              this.profilePicUploading = false;
            }
          });
        },
        error: (err: any) => {
          this.profilePicUploadError = err?.message || 'Failed to upload image to Cloudinary.';
          this.profilePicUploadProgress = 0;
          this.profilePicUploading = false;
        }
      });
    } catch (err: any) {
      this.profilePicUploadError = err?.message || 'Upload failed while sending image to Cloudinary.';
      this.profilePicUploadProgress = 0;
      this.profilePicUploading = false;
    }
  }

  applyProfilePictureFromHistory(imageUrl: string): void {
    const rawId = sessionStorage.getItem('userid');
    const userId = rawId != null && rawId !== '' ? Number(rawId) : NaN;
    if (!Number.isFinite(userId) || userId < 1) {
      this.profilePicUploadError = 'Missing user id. Please sign in again.';
      return;
    }

    this.profilePicUploadError = '';
    this.profilePicUploadMessage = '';
    this.profilePicUploading = true;
    this.profilePicUploadProgress = 30;

    this.api.updateProfilePic(userId, imageUrl).subscribe({
      next: (res: any) => {
        const d = res?.data ?? res;
        const savedProfilePic = d?.profilePic ?? imageUrl;
        this.profileImage = savedProfilePic;
        sessionStorage.setItem('userProfilePic', savedProfilePic);
        this.saveProfilePicHistory(userId, savedProfilePic);
        this.profilePicUploadMessage = 'Profile picture updated.';
        this.profilePicUploadProgress = 100;
        this.profilePicUploading = false;
        this.showProfilePicChooser = false;
      },
      error: (err: any) => {
        this.profilePicUploadError =
          err?.error?.message || err?.message || 'Failed to save profile picture.';
        this.profilePicUploadProgress = 0;
        this.profilePicUploading = false;
      }
    });
  }

  removeProfilePictureFromHistory(imageUrl: string): void {
    const rawId = sessionStorage.getItem('userid');
    const userId = rawId != null && rawId !== '' ? Number(rawId) : NaN;
    if (!Number.isFinite(userId) || userId < 1) {
      return;
    }
    const key = this.getProfilePicHistoryKey(userId);
    this.profilePicHistory = this.profilePicHistory.filter((u) => u !== imageUrl);
    localStorage.setItem(key, JSON.stringify(this.profilePicHistory));
  }

  onProfileImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && img.src !== 'assets/images/vector.jpeg') {
      img.src = 'assets/images/vector.jpeg';
    }
  }

  private async cropImageToSquare(file: File, size: number = 512): Promise<File> {
    const img = await this.loadImageElement(file);
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    const side = Math.min(srcW, srcH);
    const sx = Math.floor((srcW - side) / 2);
    const sy = Math.floor((srcH - side) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not prepare image crop canvas.');
    }
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to crop image.'));
        },
        'image/jpeg',
        0.9
      );
    });

    const baseName = (file.name || 'profile').replace(/\.[^/.]+$/, '');
    return new File([blob], `${baseName}-square.jpg`, { type: 'image/jpeg' });
  }

  private loadImageElement(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Invalid image file.'));
        img.src = String(reader.result || '');
      };
      reader.onerror = () => reject(new Error('Could not read selected image.'));
      reader.readAsDataURL(file);
    });
  }

  private getProfilePicHistoryKey(userId: number): string {
    return `profilePicHistory_${userId}`;
  }

  private loadProfilePicHistory(userId: number): void {
    const key = this.getProfilePicHistoryKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      this.profilePicHistory = [];
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      this.profilePicHistory = Array.isArray(parsed) ? parsed.filter((u) => typeof u === 'string') : [];
    } catch {
      this.profilePicHistory = [];
    }
  }

  private saveProfilePicHistory(userId: number, imageUrl: string): void {
    const key = this.getProfilePicHistoryKey(userId);
    const merged = [imageUrl, ...this.profilePicHistory.filter((u) => u !== imageUrl)].slice(
      0,
      this.profilePicHistoryLimit
    );
    this.profilePicHistory = merged;
    localStorage.setItem(key, JSON.stringify(merged));
  }
}
