export interface HelpFaqItem {
  id: string;
  question: string;
  answer: string;
  tags?: string[];
}

export const HELP_FAQ_ITEMS: HelpFaqItem[] = [
  {
    id: 'login',
    question: 'How do I sign in to the system?',
    answer:
      'Use the username and password provided by your facility administrator. Open the login page, enter your credentials, and you will be taken to the Overview dashboard or your role’s default screen. If login fails, confirm your password with admin or use password reset if enabled.',
    tags: ['login', 'password', 'access'],
  },
  {
    id: 'queue',
    question: 'How do I open a client from the queue?',
    answer:
      'Click Queue in the top header. Under Current, click the client name or the clipboard icon to open their visit. Use Edit (pencil) to change status, destination department, emergency flag, or notes.',
    tags: ['queue', 'client', 'visit'],
  },
  {
    id: 'visit-tabs',
    question: 'What are the main tabs on a client order?',
    answer:
      'Client bio (demographics), Initial vitals, Consultations (clinical notes and documents), Procedures (services), Treatment (pharmacy), Finance (charges and payments), and Printouts. Available tabs depend on your role and subscription modules.',
    tags: ['visit', 'consultation', 'vitals'],
  },
  {
    id: 'pharmacy',
    question: 'How do I dispense OTC or complete a pharmacy sale?',
    answer:
      'Go to Overview → Pharmacy (OTC Counter Sale). Add items to the cart, set quantities, then complete the sale. Use Products sold to review past sales and Doctor prescriptions for Rx lines sent from clinicians.',
    tags: ['pharmacy', 'otc', 'dispense'],
  },
  {
    id: 'stock',
    question: 'Where do I see low stock alerts?',
    answer:
      'Check Reorder Levels under Inventory, the dashboard Stock Alerts metric, or the bell icon Notifications in the header. Items below reorder level are listed there so you can receive or transfer stock in time.',
    tags: ['stock', 'inventory', 'reorder'],
  },
  {
    id: 'subscription',
    question: 'Why are some modules blocked or showing subscription warnings?',
    answer:
      'Your facility subscription controls which modules are active. If you see an expiry banner or cannot open a module, contact your administrator to renew under Administration → Subscription, or message customer care below.',
    tags: ['subscription', 'license', 'modules'],
  },
  {
    id: 'messages',
    question: 'How do I message another staff member?',
    answer:
      'Click the chat icon in the header for recent conversations, or open Messages from the same menu. Use + to start a new conversation with a colleague. Team messages are separate from customer care requests.',
    tags: ['messages', 'chat', 'staff'],
  },
  {
    id: 'documents',
    question: 'How do I upload consultation documents (PDF or images)?',
    answer:
      'On the client order Consultations tab, open the Uploaded documents accordion at the top. Choose a file (PDF or image), add an optional description, and save. Files are stored on Cloudinary and linked to that visit.',
    tags: ['documents', 'upload', 'consultation'],
  },
  {
    id: 'billing',
    question: 'How do I record a payment or check a client bill?',
    answer:
      'Open the client order Finance tab, or use Overview → Client Billing for facility-wide billing. Payments and invoices depend on your role; ask your cashier or admin if you do not see Finance options.',
    tags: ['billing', 'payment', 'invoice'],
  },
  {
    id: 'backup',
    question: 'Who can change business settings or run backups?',
    answer:
      'Only Admin or MD roles can update Business Settings, User Management, and Backups under Administration. Other staff should request changes through their supervisor or customer care.',
    tags: ['admin', 'settings', 'backup'],
  },
];

export const DEFAULT_CUSTOMER_CARE = {
  phone: '0784 411 848',
  email: 'support@vmdhealth.com',
  hours: 'Monday – Friday, 8:00 AM – 6:00 PM (EAT)',
  whatsapp: '0784 411 848',
};

export const CUSTOMER_CARE_CATEGORIES = [
  { value: 'technical', label: 'Technical issue (app not working)' },
  { value: 'billing', label: 'Billing or subscription' },
  { value: 'training', label: 'Training / how to use a feature' },
  { value: 'access', label: 'Account or access problem' },
  { value: 'data', label: 'Data correction request' },
  { value: 'other', label: 'Other' },
];
