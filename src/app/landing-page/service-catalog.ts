export interface LandingServiceItem {
  slug: string;
  image: string;
  title: string;
  description: string;
  imagePosition?: string;
  category: 'offered' | 'upcoming';
  details: string[];
  highlights: string[];
}

/** Lifestyle photos shared with the landing hero slider. */
const HERO = {
  aisle: {
    image: 'assets/images/hero/business/business_aisle.png',
    imagePosition: '78% 40%'
  },
  pos: {
    image: 'assets/images/hero/business/business_pos.png',
    imagePosition: '70% 45%'
  },
  managers: {
    image: 'assets/images/hero/business/business_managers.png',
    imagePosition: '62% 38%'
  }
} as const;

/** Product modules shown on the public business landing page. */
export const LANDING_SERVICES: LandingServiceItem[] = [
  {
    slug: 'product-inventory',
    ...HERO.aisle,
    title: 'Product & inventory',
    description: 'Catalogue products, prices, barcodes, categories, and stock on hand across stores.',
    category: 'offered',
    details: [
      'Keep a clean product catalogue with SKUs, barcodes, selling units, cost and selling prices, reorder levels, and images.',
      'Organise items by category and shelf so staff can find and sell the right product quickly on desktop or mobile.',
      'Stock on hand stays visible so purchasing and sales decisions stay grounded in real inventory.'
    ],
    highlights: [
      'Product catalogue with pricing and barcodes',
      'Categories, units, and shelf positions',
      'Reorder levels and stock-on-hand visibility',
      'Works on desktop and the business mobile app'
    ]
  },
  {
    slug: 'stock-management',
    ...HERO.aisle,
    title: 'Stock management',
    description: 'Receive stock, adjust quantities, transfer between stores, take stock, and verify counts.',
    category: 'offered',
    details: [
      'Record goods received into the right store with quantities that update stock immediately.',
      'Run adjustments, transfers, stock taking, initialisation, and verification so physical counts match the system.',
      'Track movement history so managers can audit how stock changed over time.'
    ],
    highlights: [
      'Stock receive and receive records',
      'Adjustments, transfers, and tracking',
      'Stock taking, initialisation, and verify',
      'Clear audit trail for inventory moves'
    ]
  },
  {
    slug: 'sales-pos',
    ...HERO.pos,
    title: 'Sales & checkout',
    description: 'Point-of-sale checkout with barcodes, customer sales history, and day-to-day retail flow.',
    category: 'offered',
    details: [
      'Sell from an organised checkout that supports barcode lookup, cart lines, and customer attachment.',
      'Keep sales history available for follow-up, reporting, and customer account review.',
      'Designed for busy counters where speed and stock accuracy both matter.'
    ],
    highlights: [
      'Fast barcode-assisted checkout',
      'Customer-linked sales history',
      'Stock reduction tied to sales',
      'Desktop and mobile selling workflows'
    ]
  },
  {
    slug: 'client-management',
    ...HERO.managers,
    title: 'Client management',
    description: 'Maintain client profiles, contacts, next of kin, and account activity for credit or follow-up.',
    category: 'offered',
    details: [
      'Register clients with contact and address details so sales and credit can be tied to real people or businesses.',
      'Capture next-of-kin style contacts where your operation needs them for follow-up.',
      'Review account balances and transactions when clients buy on account.'
    ],
    highlights: [
      'Client registry with contact details',
      'Next-of-kin / related contacts',
      'Account balances and transactions',
      'Sales history by customer'
    ]
  },
  {
    slug: 'finance-expenses',
    ...HERO.managers,
    title: 'Finance & expenses',
    description: 'Track expenses, debt and loan payments, and keep day-to-day money movement visible.',
    category: 'offered',
    details: [
      'Capture operating expenses with categories so cash outflows are not lost in notebooks.',
      'Record debt and loan payments against clients or financing arrangements your business uses.',
      'Give owners a clearer picture of money leaving the business alongside sales.'
    ],
    highlights: [
      'Expense capture and categories',
      'Debt payment recording',
      'Loan registers and payments',
      'Finance visibility for owners'
    ]
  },
  {
    slug: 'reports-statements',
    ...HERO.managers,
    title: 'Reports & statements',
    description: 'Sales reports, stock reports, and operational statements for decisions that need numbers.',
    category: 'offered',
    details: [
      'Review sales performance and stock movement without exporting spreadsheets first.',
      'Use report screens to answer daily questions: what sold, what is low, and what moved between stores.',
      'Built for managers who need clarity at the end of a shift or week.'
    ],
    highlights: [
      'Sales history and sales reports',
      'Stock reports and movement views',
      'Operational statements for managers',
      'Desktop overview dashboards'
    ]
  },
  {
    slug: 'multi-store',
    ...HERO.aisle,
    title: 'Multi-store operations',
    description: 'Run more than one store or warehouse location with shared products and location-aware stock.',
    category: 'offered',
    details: [
      'Define stores and keep inventory context tied to the location staff are working in.',
      'Transfer stock between locations and keep receive / sell actions store-aware.',
      'Useful for shops with a main counter plus a back store or branch.'
    ],
    highlights: [
      'Store profiles and defaults',
      'Location-aware stock actions',
      'Inter-store transfers',
      'Shared product catalogue'
    ]
  },
  {
    slug: 'mobile-desktop',
    ...HERO.pos,
    title: 'Desktop + mobile',
    description: 'Angular desktop/web console and Flutter business app connected to the same Quarkus backend.',
    category: 'offered',
    details: [
      'Use the web console for deep inventory, finance, and reporting work at the office.',
      'Use the mobile business app for sales, stock checks, and field updates while staying on the same data.',
      'One backend means roles, items, clients, and sales stay consistent across devices.'
    ],
    highlights: [
      'Web Business Master console',
      'Flutter UI connected to live APIs',
      'Shared authentication and data',
      'Built for shop-floor and back-office'
    ]
  },
  {
    slug: 'ecommerce-sync',
    ...HERO.aisle,
    title: 'Online catalogue sync',
    description: 'Publish products to an online storefront and keep catalogue changes flowing from your core inventory.',
    category: 'upcoming',
    details: [
      'Upcoming work to push selected products from inventory into an online catalogue.',
      'Aimed at businesses that sell both over the counter and online without maintaining two product lists.',
      'Will respect stock and pricing rules defined in the core business system.'
    ],
    highlights: [
      'Select products for online listing',
      'Shared pricing from inventory',
      'Fewer double-entry catalogue updates',
      'Roadmap for omnichannel retail'
    ]
  },
  {
    slug: 'supplier-portal',
    ...HERO.pos,
    title: 'Supplier collaboration',
    description: 'Deeper supplier portals for purchase orders, deliveries, and shared stock visibility.',
    category: 'upcoming',
    details: [
      'Extend purchasing beyond receive screens into collaborative supplier workflows.',
      'Help buyers and suppliers agree on deliveries without chasing paper invoices alone.',
      'Builds on existing stock receive and store foundations already in the system.'
    ],
    highlights: [
      'Purchase order collaboration',
      'Delivery confirmation flows',
      'Supplier-facing visibility',
      'Tied to stock receive history'
    ]
  },
  {
    slug: 'advanced-analytics',
    ...HERO.managers,
    title: 'Advanced analytics',
    description: 'Trend dashboards for margins, fast movers, dead stock, and store comparisons.',
    category: 'upcoming',
    details: [
      'Layer richer analytics on top of sales and stock already captured daily.',
      'Highlight margin leakage, slow movers, and branch performance differences.',
      'Intended for owners who want foresight, not only end-of-day totals.'
    ],
    highlights: [
      'Margin and mix analysis',
      'Fast / slow mover insights',
      'Store comparison views',
      'Owner-ready trend dashboards'
    ]
  }
];

export function getLandingServiceBySlug(slug: string): LandingServiceItem | undefined {
  return LANDING_SERVICES.find((s) => s.slug === slug);
}

export function getOfferedServices(): LandingServiceItem[] {
  return LANDING_SERVICES.filter((s) => s.category === 'offered');
}

export function getUpcomingServices(): LandingServiceItem[] {
  return LANDING_SERVICES.filter((s) => s.category === 'upcoming');
}
