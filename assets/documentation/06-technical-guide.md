# Technical Guide

For people who install and support the business manager. Staff procedures are in the CRM and ERP guides.

## What is deployed

| Part | Role |
|------|------|
| Web console | Angular application for back office, POS, and administration |
| Mobile app | Flutter client for floor sales and stock, same accounts and items |
| API | Quarkus service. Browser and phone both call it |
| Database | Clients, orders, stock, finance, and users |

There is one backend. A sale on the phone and a sale on the desk write the same client, order, and stock records.

## How a sale is stored

| Record | Meaning |
|--------|---------|
| Client | CRM account |
| Order (visit) | One commercial file. A new document creates a new order unless the user is editing |
| Sale document | Quotation, proforma, invoice, receipt, or delivery note on that order |
| Payment | Money on the order. Status can be reversed |
| Stock movement | Quantity change in a store when the document deducts stock |

Editing updates the document and can point the same order at another client. It does not open the new-order dialog.

## Local development

Run the web console and the API on the machine you are testing. Do not publish a production site unless that release was requested.

| Service | Typical local address |
|---------|------------------------|
| Web console | `http://localhost:4800/` |
| API | `http://localhost:8080/` |

The console talks to the API using the configured base URL (direct or through the dev proxy). Sign-in uses a token stored for the session. An expired token sends the user back to login. That is expected.

## Repository layout (web)

```
ngwiki/
├── src/app/
│   ├── overview/          # CRM, ERP, finance, administration pages
│   ├── header/            # Toolbar, inventory menu, More
│   ├── auth/              # Sign in and registration
│   ├── services/          # API client and access control
│   └── config/            # Server URL and this documentation catalog
└── src/assets/documentation/   # These guides
```

POS and the products orders list are the business checkout. They use the same clients, orders, and stock as the rest of the console.

## Support checks

| Check | Healthy result |
|-------|----------------|
| Console opens | Login page with the business name |
| API listens | Port 8080 accepts connections |
| Sign in | Dashboard or POS loads menus for that role |
| Save a quotation | A new order number appears and stock is unchanged |
| Save a receipt | Stock in the selling store falls |
| Reverse a payment | Row remains, paid total drops |

Startup messages about unrelated database migrations can appear in development and still leave the API listening. If the console cannot load data, confirm the API process is up before changing application code.

## Documentation files

Guides in this folder are loaded by **System Documentation**. The sidebar list is `system-documentation.catalog.ts`. Edit the Markdown, keep the file name, and the page picks up the new text.

*Documentation pack 2.0 — September 2026*
