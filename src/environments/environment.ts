export const environment = {
  production: true,
  
  // Firebase Configuration
  firebaseConfig: {
    projectId: 'newstorageforuplodapp',
    appId: '1:475672285070:web:f7f3fceb0b2cdcbc4f9edf',
    storageBucket: 'newstorageforuplodapp.appspot.com',
    locationId: 'us-central',
    apiKey: 'AIzaSyAX_B8Zxzepughv_TMwr5QfYqZakuInBls',
    authDomain: 'newstorageforuplodapp.firebaseapp.com',
    messagingSenderId: '475672285070',
  },

  // API Configuration — ng serve uses proxy.conf.json → localhost:8080
  apiUrl: 'http://localhost:4800/health_care',
  apiTimeout: 30000,
  apiRetries: 2,
  
  // Feature Flags
  features: {
    enableLogging: true,
    enableErrorReporting: true,
    enablePerformanceMonitoring: false
  },
  
  // Pagination
  pagination: {
    defaultPageSize: 10,
    maxPageSize: 100
  }
};