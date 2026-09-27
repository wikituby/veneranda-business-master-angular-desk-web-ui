# ERP — Sales, Stock, and Stores

This is the operating side of the business manager: catalogue, warehouses, purchasing movement, checkout, and the documents that prove a sale.

## Sales documents (order to cash)

**Path:** **POS**, then **Products orders** for history.

| Document | Stock | Payment |
|----------|--------|---------|
| Quotation | Not deducted | Optional. Amount can stay empty |
| Proforma | Not deducted | Optional |
| Sales invoice | Deducted when the sale completes as a stock document | Recorded when money is received |
| Receipt | Deducted | Shows amount received |
| Delivery note | Records handover | Follows the order |

Pipeline on one order:

**Quotation → Proforma → Invoice → Receipt → Delivery**

Opening a later box can create that document from the products already sold, and fill any missing earlier stage. Confirm in the on-screen dialog before it is created.

### Checkout fields

- **Payment method** and **notes** are on one row under the cart. Notes stay editable even when a quotation does not take payment.
- **Amount received**, **amount due**, and **change** sit on the next row.
- Totals read in a line, for example **Paid: 100000**.

### Products orders

- Search placeholder covers orders, client names, and who served the sale.
- **Filter by date** is a popup: Today, Last month, Last 7 days, or a from–to range.
- The serial number counts down from the largest.
- The client column is wide enough to read the name.
- The active control is an icon. Confirm before turning an order off. Off means view, print, and share only.

### Payments

Each payment on an order can be **reversed** after you confirm. The row stays, marked reversed. Paid and debt use only payments that are not reversed.

## Product catalogue

**Path:** Inventory → **Products**.

Keep, for each item:

- Name, barcode, category, unit
- Cost and selling price (or a unit selling model)
- Reorder level and restock target
- Shelf, description, and images where you use them

Services live in the same selling flow and do not depend on a stock batch.

## Stock management

**Path:** Inventory → **Stock management**.

| Action | When to use it |
|--------|----------------|
| Receive | Goods arrive from a supplier into a store |
| Adjust | Correct a quantity that receiving or selling did not explain |
| Transfer | Move quantity from one store to another |
| Stock take | Count the shelf |
| Initialise | Set opening quantities for a new store or item |
| Verify | Confirm a count before it becomes the book quantity |
| Tracking | See how a quantity changed |

Receive into the store that physically holds the goods. Selling reduces the store you sell from when the document deducts stock.

## Stores

**Path:** Inventory → **Stores**.

A store is a counter, shop floor, or warehouse. The catalogue is shared. Quantities are not. Set the store staff are working in before receive, transfer, or sale.

## Partners

**Path:** Inventory → **Partners** (suppliers and related parties).

Record who you buy from so receipts of goods have a source. Deeper supplier portals for shared purchase orders are a later extension. Day-to-day buying is still: partner on file, then stock receive.

## Reports that close the loop

Use sales reports for what left the counter, and stock reports for what remains and what moved. The main dashboard is the short version of the same questions.

## Rules that prevent double books

- Do not sell a quantity the store does not hold unless your process explicitly allows a backorder.
- Do not edit a turned-off order. Turn it on again only when a supervisor accepts.
- Create a new order for a new document. Reuse an order only while editing that document.
- Reverse a wrong payment. Do not delete it from history.

*Documentation pack 2.0 — September 2026*
