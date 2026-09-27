# ERP — Finance

Finance in the business manager is the money that is not the sales document itself: operating spend, client debt, and loans. Sales invoices and receipts stay on the order. This guide is how the rest of the cash picture is recorded.

**Path:** Overview → **Finance**.

## What belongs here

| Book | Question |
|------|----------|
| Expenses | What did the business pay to run? |
| Client debt | What is still owed on orders, and what was collected later? |
| Loans | What was borrowed or lent, and what instalment was paid? |
| Reports | What do sales, stock, and spend look like together? |

## Expenses — setup order

**Path:** Finance → **Expenses**.

Configure in this order. The page shows the same hint.

1. **Categories** — groups such as utilities, rent, transport, salaries, supplies
2. **Accounts** — a ledger under a category, such as electricity under utilities
3. **Transactions** — the actual payment: date, account, amount, and note

Do not post a transaction before its account exists. Do not create an account before its category exists.

### Category

1. Open **Categories**.
2. Choose **New category**.
3. Enter a name and an optional description.
4. Save.

### Account

1. Open **Accounts**.
2. Choose the category.
3. Name the account and save.

### Transaction

1. Open **Transactions**.
2. Pick the account, date, and amount.
3. Add a short note a manager can audit later (supplier, receipt number, period).
4. Save.

Examples: `Rent — March`, `Delivery fuel`, `Shop electricity`.

## Client debt

When a POS sale is saved for less than the total, and a client is attached, the remainder is **amount due** on that order.

- Receive a later payment from the order’s payment list.
- The balance after payment is shown before you confirm.
- **Reverse** a payment that was recorded in error. It stays visible and is excluded from the paid sum.
- Debt is per order and rolls into the client account so CRM and finance agree.

## Loans

Use the loan register for money the business borrows or tracks as a financing arrangement: principal, schedule, and each payment. Do not hide loan repayments inside a generic expense if you need the balance to remain visible. An expense category can still record the cash that left the till. The loan record is the balance.

## Close of period

1. Confirm sales documents for the dates you are closing (filter products orders).
2. Confirm expense transactions for the same dates.
3. Review open debt and open loans.
4. Read the sales and stock reports before you treat the dashboard as final.

## What finance does not replace

- A quotation is not income.
- A reversed payment is not deleted history.
- Stock adjustments are inventory, not expenses, unless you also paid a supplier. Pay the supplier as an expense or a receive. Do not do both for the same invoice without a clear note.

*Documentation pack 2.0 — September 2026*
