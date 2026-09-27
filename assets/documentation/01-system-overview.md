# Business Manager Overview

## Purpose

Veneranda Business Master is a **complete business manager**. It keeps the customer relationship (CRM) and the operating records (ERP) on one set of books so a shop, distributor, or service desk does not run sales in one notebook and stock in another.

One installation can run a single counter or several stores. Modules and user access decide what each person sees.

## CRM and ERP on one desk

```
CRM  — who you do business with
  Clients, contacts, groups, account balances, follow-up

        │  every sale and document is tied to a client and an order
        ▼

ERP  — how the business runs
  Catalogue → stock → quotation / invoice / receipt / delivery
  Expenses, debt, loans
  Reports across stores
```

| Layer | Typical question it answers |
|-------|-----------------------------|
| CRM | Who is this client, what do they owe, and what have they bought? |
| Sales ERP | What was quoted, invoiced, paid, and delivered? |
| Inventory ERP | What is on the shelf, in which store, and at what cost? |
| Finance ERP | What left the till, and which debts or loans are still open? |
| Reports | What sold, what is low, and how did stores move this period? |

## Commercial document chain

A sale is an **order**. Documents on that order follow a normal trading sequence. Each new checkout creates its own order. Editing a document can change the client and keeps the same order.

| Stage | Document | What it means |
|-------|----------|----------------|
| 1 | Quotation | Price offer. Stock is not deducted. |
| 2 | Proforma | Formal offer before payment. Stock is not deducted. |
| 3 | Sales invoice | Bill for the goods or services. |
| 4 | Receipt | Proof of payment. Stock is deducted when the sale is completed as a receipt or invoice that takes stock. |
| 5 | Delivery note | Goods handed over or dispatched. |

Staff can open a later stage from an earlier document. Missing earlier stages are filled from the products already on the order. A payment can be recorded and later reversed. Reversed payments stay on the list and are left out of the paid total.

## Main areas

### CRM — client management

- Client registry: name, contact, address, and related contacts
- Client groups for pricing, credit rules, or how you segment customers
- Account activity: balances, transactions, and sales history
- The same client record is used at the POS and on every commercial document

### ERP — product and inventory

- Product and service catalogue: names, barcodes, categories, units, cost, selling price, reorder level, shelf
- Stock on hand by store
- Receive, adjust, transfer, stock take, initialise, and verify
- Movement history for audit

### ERP — sales and checkout

- POS cart with barcode lookup, discounts, tax, and payment
- Attach a client, then create a **new order** for each document
- Products orders list: search, date filter, view, print, share, and turn an order off
- Turned-off orders can still be viewed and printed. They cannot be edited or extended with a new document

### ERP — finance

- Expense categories, accounts, and transactions
- Client debt and payments against an order
- Loan registers and loan payments
- Reports and the main dashboard for owners

### Multi-store

- Shared catalogue
- Stock and selling tied to a store
- Transfers between stores or a back warehouse and the counter

### Administration

- Users, roles, and page access
- Business name, branding, and working options
- Backup and audit of sensitive actions

## Where people work

| Surface | Use it for |
|---------|------------|
| Web console | Catalogue depth, finance, permissions, and reports |
| POS | Counter selling and commercial documents |
| Mobile business app | Floor sales and stock checks on the same data |
| Dashboard | A short picture of sales, stock, and money |

## Roles (typical)

| Role | Usual work |
|------|------------|
| Cashier / sales | POS, receipts, client attach |
| Storekeeper | Receive, transfer, counts, reorder |
| Accountant | Expenses, debt, loans, statements |
| Supervisor | Orders, reversals, reports |
| Administrator | Users, access, business settings |

Access is permission-based. A role only opens the pages it is allowed to use.

*Documentation pack 2.0 — September 2026*
