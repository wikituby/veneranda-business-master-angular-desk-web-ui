import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from 'src/app/services/api.service';
import { AuthenticationService } from 'src/app/services/authentication.service';
import jwt_decode from 'jwt-decode'; // Import the jwt-decode library
import { JwtPayload } from '../models/jwt-payload.interface';
import { DataService } from 'src/app/services/data.service';
import { ActivatedRoute, Router } from '@angular/router';
import { navigateAfterLogin } from '../navigate-after-login';
import { parseLoginFailure } from '../login-error.util';
import { ActiveRoomService } from 'src/app/services/active-room.service';
import { SubscriptionService } from 'src/app/services/subscription.service';
import { ApiConfigService } from 'src/app/services/api-config.service';
import {
  clearUserRolesFromSession,
  persistUserRolesToSession,
} from 'src/app/utils/user-roles.util';
import { notifyAuthSessionChanged } from 'src/app/utils/auth-session.util';
import { AccessControlService } from 'src/app/services/access-control.service';
import {
  DEFAULT_FACILITY_LOGO,
  DEFAULT_FACILITY_NAME,
  FacilityBrandingService,
} from 'src/app/services/facility-branding.service';
import { defaultContactValue } from 'src/app/utils/phone-contact.util';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login-mobile',
  templateUrl: './login-mobile.component.html',
  styleUrls: ['./login-mobile.component.css']
})
export class LoginMobileComponent implements OnInit, OnDestroy {

  data: any[] = [];
  userRole: any;
  notFound: boolean = false;
  loginErrorMessage: string = '';
  signupErrorMessage = '';
  signupSuccessMessage = '';
  signupBusy = false;
  forgotErrorMessage = '';
  forgotSuccessMessage = '';
  forgotBusy = false;
  authMode: 'login' | 'signup' | 'forgot' = 'login';

  type: string = "password";
  isText: boolean = false;
  showDivUpdatedLoaderDeleteClient: boolean = false;
  isLoadingNewClient: boolean = false;

  facilityName = DEFAULT_FACILITY_NAME;
  facilityLogoUrl = DEFAULT_FACILITY_LOGO;
  private brandSubs: Subscription[] = [];

  readonly featureSlides: Array<{
    image: string;
    title: string;
    description: string;
  }> = [
    {
      image: 'assets/images/hero/business/business_aisle.png',
      title: 'Every shelf, accounted for',
      description: 'Walk the aisle with stock that matches the system.'
    },
    {
      image: 'assets/images/hero/business/business_pos.png',
      title: 'Checkout that keeps pace',
      description: 'Scan, sell, and settle without the backlog.'
    },
    {
      image: 'assets/images/hero/business/business_managers.png',
      title: 'Close the day with clarity',
      description: 'Sales, expenses, and balances in one clear picture.'
    }
  ];

  currentFeatureSlide = 0;
  private featureSlideTimer: ReturnType<typeof setInterval> | null = null;

  eyeIcon: string = "bi bi-eye-slash-fill";
  loginForm!: FormGroup;
  signUpForm!: FormGroup;
  forgotForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService,
    private activeRoomService: ActiveRoomService,
    private subscription: SubscriptionService,
    private apiConfig: ApiConfigService,
    private facilityBranding: FacilityBrandingService,
    private accessControl: AccessControlService
  ) {}

  get connectedServerLabel(): string {
    return this.apiConfig.getDisplayBaseUrl();
  }

  changeServer(): void {
    this.apiConfig.resetPreLoginServerSelection();
  }

  setAuthMode(mode: 'login' | 'signup' | 'forgot'): void {
    this.authMode = mode;
    this.loginErrorMessage = '';
    this.notFound = false;
    this.signupErrorMessage = '';
    this.signupSuccessMessage = '';
    this.forgotErrorMessage = '';
    this.forgotSuccessMessage = '';
  }

  ngOnInit(): void {
    // Check if screen is wide, redirect to desktop login component
    if (!this.isSmallScreen()) {
      const tab = this.route.snapshot.queryParamMap.get('tab');
      this.router.navigate(['/login'], {
        queryParams:
          tab === 'signup' || tab === 'register'
            ? { tab: 'signup' }
            : tab === 'forgot' || tab === 'reset'
              ? { tab: 'forgot' }
              : {},
      });
      return;
    }

    this.bindFacilityBranding();
    this.startFeatureSlideshow();

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required ]
    });

    this.signUpForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      contact: [
        defaultContactValue(),
        [Validators.required, Validators.pattern(/^256[0-9]{9}$/)],
      ],
    });

    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'signup' || tab === 'register') {
      this.authMode = 'signup';
    } else if (tab === 'forgot' || tab === 'reset') {
      this.authMode = 'forgot';
    }
  }

  ngOnDestroy(): void {
    this.brandSubs.forEach((s) => s.unsubscribe());
    this.stopFeatureSlideshow();
  }

  get activeFeatureSlide() {
    return this.featureSlides[this.currentFeatureSlide];
  }

  goToFeatureSlide(index: number): void {
    if (index >= 0 && index < this.featureSlides.length) {
      this.currentFeatureSlide = index;
    }
  }

  private startFeatureSlideshow(): void {
    this.stopFeatureSlideshow();
    this.featureSlideTimer = setInterval(() => {
      this.currentFeatureSlide =
        (this.currentFeatureSlide + 1) % this.featureSlides.length;
    }, 4000);
  }

  private stopFeatureSlideshow(): void {
    if (this.featureSlideTimer) {
      clearInterval(this.featureSlideTimer);
      this.featureSlideTimer = null;
    }
  }

  private bindFacilityBranding(): void {
    const brand = this.facilityBranding.hydrateFromLocalAssets();
    this.facilityName = brand.facilityName;
    this.facilityLogoUrl = this.facilityBranding.getLoginLogoUrl();
    this.brandSubs.push(
      this.facilityBranding.loginFacilityName$.subscribe((name) => (this.facilityName = name)),
      this.facilityBranding.loginFacilityLogo$.subscribe((logo) => (this.facilityLogoUrl = logo))
    );
  }

  // Check if screen is small (mobile/tablet)
  isSmallScreen(): boolean {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 992; // Bootstrap's lg breakpoint (992px)
    }
    return true; // Default to mobile if window is undefined
  }

  // Listen to window resize events
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    const currentRoute = this.router.url;
    
    // If screen becomes wide, redirect to desktop login component
    if (!this.isSmallScreen() && currentRoute.includes('login-mobile')) {
      this.router.navigate(['/login'], {
        queryParams: this.authMode === 'signup' ? { tab: 'signup' } : {},
      });
    }
  }


  hideShowPassword() {
    this.isText = !this.isText;
    this.isText ? this.eyeIcon = "bi bi-eye-fill" : this.eyeIcon = "bi bi-eye-slash-fill";
    this.isText ? this.type = "text" : this.type = "password";
  }

  submitSignUp(): void {
    if (this.signUpForm.invalid || this.signupBusy) {
      this.signUpForm.markAllAsTouched();
      return;
    }
    this.signupBusy = true;
    this.signupErrorMessage = '';
    this.signupSuccessMessage = '';
    const data = this.signUpForm.value;
    this.authService.signUp(data).subscribe({
      next: () => {
        this.signupBusy = false;
        this.signupSuccessMessage = 'Account created. You can sign in now.';
        this.loginForm.patchValue({ email: data.email, password: data.password });
        this.setAuthMode('login');
      },
      error: (error: any) => {
        this.signupBusy = false;
        this.signupErrorMessage =
          error?.error?.message || error?.message || 'Signup failed. Try again.';
      },
    });
  }

  submitForgotPassword(): void {
    if (this.forgotForm.invalid || this.forgotBusy) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.forgotBusy = true;
    this.forgotErrorMessage = '';
    this.forgotSuccessMessage = '';
    const data = this.forgotForm.value;

    this.authService.sendEmail(data).subscribe({
      next: () => {
        this.forgotBusy = false;
        this.forgotSuccessMessage =
          'If that email is registered, a temporary password was sent. Sign in with it, then change your password in your profile.';
      },
      error: (error: any) => {
        this.forgotBusy = false;
        this.forgotErrorMessage =
          error?.error?.message ||
          error?.message ||
          'Could not send reset email. Check the address and try again.';
      },
    });
  }



  getUserFormData(data: any) {
    if (this.loginForm.invalid) {
      return;
    }

    this.showDivUpdatedLoaderDeleteClient = true;
    this.isLoadingNewClient = true;
    this.notFound = false;
    this.loginErrorMessage = '';
  
    this.authService.clientLogin(data).subscribe((result:any) => {

      console.log("User logged in successfully");

      console.log('userDetails', result.user);
      console.log('username', result.user.username);
      
      this.userRole = result.user.role;
      console.log(result.user.profilePic);
      
      console.log('user role', this.userRole);
      console.log('jwt', result.jwt);

      console.log('user email', JSON.stringify(result.user.email));

      // Save JWT token and user details in local storage
      //localStorage.setItem('jwtToken', result.jwt);
      sessionStorage.setItem('userDetails', JSON.stringify(result.user));
      sessionStorage.setItem('username', result.user.username);
      sessionStorage.setItem('userid', result.user.id);

      persistUserRolesToSession(result.user);
      sessionStorage.setItem('useremail', result.user.email);
      sessionStorage.setItem('userProfilePic', result.user.profilePic);
      sessionStorage.setItem('assignedModuleIds', result.user.assignedModuleIds || '');
      sessionStorage.setItem('assignedClinicIds', result.user.assignedClinicIds || '');
      sessionStorage.setItem('allowedPageRoutes', result.user.allowedPageRoutes || '');
      sessionStorage.setItem('hiddenPageComponents', result.user.hiddenPageComponents || '');
      sessionStorage.removeItem('activeClinicId');
      sessionStorage.removeItem('activeModuleId');
      //localStorage.setItem('jwt', result.jwt);

      sessionStorage.setItem('userType', result.userType); // If you want to store userType as well

      this.accessControl.refreshFromSession();
      this.subscription.refreshFromSession();
      notifyAuthSessionChanged();

      // Store the JWT token in an HttpOnly cookie
      this.authService.setSessionToken(result.jwt);

      this.checkSessionExpiry();

      this.showDivUpdatedLoaderDeleteClient = false;
      this.isLoadingNewClient = false;

      navigateAfterLogin(this.router, this.subscription, this.userRole, () => this.isSmallScreen(), this.activeRoomService);

    },(error:any) => {
      this.showDivUpdatedLoaderDeleteClient = false;
      this.isLoadingNewClient = false;

      const failure = parseLoginFailure(error);
      this.notFound = !failure.isInactive;
      this.loginErrorMessage = failure.isInactive ? failure.message : '';


      console.error('Error during login:', error.error.error);
      console.error('Error during login:', error.statusText);

      // You can display an error message to the user or perform any other error-related actions
      // For example, if you want to show an error message to the user:
      // this.errorMessage = error.message;

      // Clear any sensitive data from local storage (for security)
      sessionStorage.removeItem('userDetails');
      sessionStorage.removeItem('username');
      clearUserRolesFromSession();
      sessionStorage.removeItem('useremail');
      sessionStorage.removeItem('userProfilePic');
      sessionStorage.removeItem('assignedModuleIds');
      sessionStorage.removeItem('assignedClinicIds');
      sessionStorage.removeItem('allowedPageRoutes');
      sessionStorage.removeItem('hiddenPageComponents');
      sessionStorage.removeItem('activeClinicId');
      sessionStorage.removeItem('activeModuleId');
      this.activeRoomService.clearActiveRoom();

      // Optionally, you can also redirect the user to a login page or display an error message
      // this.router.navigate(['/login']);
    }
  );
}

  // In your auth service
  




  checkSessionExpiry() {
    // Get the token from local storage
    const token = this.api.getSessionToken();

    // Check if a token is present
    if (token) {
      // Decode the token using the JwtPayload interface for type assertion
      const tokenPayload = jwt_decode(token) as JwtPayload; // Use type assertion


      // Calculate expiration time in milliseconds
      const expirationTimeInSeconds = tokenPayload.exp; // Expiration time from backend in seconds
      
      const expirationTimeInMilliseconds = expirationTimeInSeconds * 1000; // Convert to milliseconds

    
      // Get the current time in milliseconds
      const currentTime = Date.now();

      // Compare the current time with the expiration time
      if (currentTime > expirationTimeInMilliseconds) {
        // If the token is expired, log the user out
        this.authService.logout();
        // Redirect to appropriate login based on screen size
        if (this.isSmallScreen()) {
          this.router.navigate(['/login-mobile']);
        } else {
          this.router.navigate(['/login']);
        }
      }
    }
  }

  noLogin(){
    sessionStorage.setItem('username', "Account");
    sessionStorage.setItem('userrole', "undefined");
    // Stay on mobile login if screen is small
    if (this.isSmallScreen()) {
      this.router.navigate(['/login-mobile']);
    } else {
      this.router.navigate(['/login']);
    }
  }


}
