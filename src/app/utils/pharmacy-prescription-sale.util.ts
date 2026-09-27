/** Shared pharmacy prescription line shape (OTC Rx tab + client order pharmacy tab). */
export interface PharmacyPrescriptionLine {
  id: number;
  itemName?: string;
  stockBatchId?: number | null;
  itemId?: number | null;
  quantity: number;
  prescribedQuantity: number;
  unitSellingPrice: number;
  unitBuy?: number;
  totalAmount: number;
  given: boolean;
  paid?: boolean;
  dispensed?: boolean;
  administered?: boolean;
  status?: string;
  amountPerFrequencyValue?: number | null;
  amountPerFrequencyUnit?: string;
  frequencyValue?: number | null;
  frequencyUnit?: unknown;
  durationValue?: number | null;
  durationUnit?: unknown;
  totalUnits?: number;
  instructions?: string;
  route?: string;
  dosage?: string;
}

export interface PharmacyReceiptLine {
  itemName: string;
  dosage: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  given?: boolean;
  statusNote?: string;
}

export function pharmacyNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function isPharmacyStatusGiven(status: unknown): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'given' || s === 'dispensed';
}

export function isPharmacyQueuePendingStatus(status: unknown): boolean {
  const s = String(status ?? '').toLowerCase();
  return (
    s !== 'given' &&
    s !== 'dispensed' &&
    s !== 'paid' &&
    s !== 'completed' &&
    s !== 'sold' &&
    s !== 'cancelled'
  );
}

function sumStockAtHand(items: any[]): number {
  return items.reduce((sum, item) => sum + Number(item?.stockAtHand ?? 0), 0);
}

function shopItemName(item: any): string {
  return String(item?.title ?? item?.itemName ?? item?.name ?? item?.stockItemName ?? '')
    .trim()
    .toLowerCase();
}

/**
 * Total stock for a drug.
 * - Batch mode (`itemList` rows have `_stockBatchId`): sum stock across batches for the same stock item.
 * - Shop-item mode: resolve by `itemId` or item name against shop products.
 */
export function getPharmacyItemTotalStock(
  row: { stockBatchId?: number | null; itemId?: number | null; itemName?: string },
  itemList: any[]
): number {
  const list = Array.isArray(itemList) ? itemList : [];
  const looksLikeBatches = list.some((i) => i?._stockBatchId != null && Number(i._stockBatchId) > 0);

  if (looksLikeBatches) {
    const batchId = row.stockBatchId;
    if (batchId != null && batchId > 0) {
      const anchor = list.find((item) => Number(item._stockBatchId) === Number(batchId));
      if (anchor) {
        const itemKey = String(anchor.stockItemId ?? anchor.stockItemName ?? '').trim();
        if (!itemKey) {
          return Number(anchor.stockAtHand ?? 0);
        }
        return sumStockAtHand(
          list.filter(
            (item) => String(item.stockItemId ?? item.stockItemName ?? '').trim() === itemKey
          )
        );
      }
    }
    // Prescription saved in item mode while UI is in batch mode — match by stock item id/name.
    if (row.itemId != null && Number(row.itemId) > 0) {
      const byId = list.filter(
        (item) =>
          Number(item.stockItemId) === Number(row.itemId) || Number(item.id) === Number(row.itemId)
      );
      if (byId.length) {
        return sumStockAtHand(byId);
      }
    }
    const name = String(row.itemName ?? '')
      .trim()
      .toLowerCase();
    if (name) {
      return sumStockAtHand(
        list.filter((item) => String(item.stockItemName ?? '').trim().toLowerCase() === name)
      );
    }
    return 0;
  }

  // Shop-item / stock-item mode
  if (row.itemId != null && Number(row.itemId) > 0) {
    const byId = list.filter((item) => Number(item?.id) === Number(row.itemId));
    if (byId.length) {
      return sumStockAtHand(byId);
    }
  }
  const name = String(row.itemName ?? '')
    .trim()
    .toLowerCase();
  if (name) {
    return sumStockAtHand(list.filter((item) => shopItemName(item) === name));
  }
  // Legacy: Rx still has stockBatchId but list is shop products — ignore batch id, try name only.
  return 0;
}

/** Cap quantity by available stock. Do not change PD / given billing flags. */
export function applyPharmacyStockAvailability(
  rows: PharmacyPrescriptionLine[],
  itemList: any[]
): void {
  for (const row of rows) {
    if (isPharmacyStatusGiven(row.status) || row.dispensed === true) {
      continue;
    }
    const prescribed =
      row.prescribedQuantity > 0 ? row.prescribedQuantity : Math.max(0, row.quantity);
    if (row.prescribedQuantity <= 0) {
      row.prescribedQuantity = prescribed;
    }
    const stock = getPharmacyItemTotalStock(row, itemList);
    if (stock > 0) {
      const targetQty = prescribed > 0 ? prescribed : 1;
      row.quantity = Math.min(targetQty, stock);
    } else {
      row.quantity = prescribed;
    }
    row.totalAmount = pharmacyLineAmount(row);
  }
}

export function pharmacyLineAmount(row: PharmacyPrescriptionLine): number {
  return pharmacyNum(row.quantity) * pharmacyNum(row.unitSellingPrice);
}

export function formatPharmacyMoney(amount: number): string {
  const n = pharmacyNum(amount);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Prefer entered amount received; fall back to sale total when blank. */
export function effectivePharmacyAmountReceived(
  amountReceived: number | null | undefined,
  total: number
): number {
  if (amountReceived != null && Number.isFinite(Number(amountReceived))) {
    return Number(amountReceived);
  }
  return pharmacyNum(total);
}

export function pharmacyRowStatusLabel(
  row: PharmacyPrescriptionLine,
  itemList: any[]
): string {
  if (row.given) {
    return 'Given';
  }
  if (getPharmacyItemTotalStock(row, itemList) <= 0) {
    return 'Not given · Out of stock';
  }
  return row.status || 'Not given';
}

export function pharmacyRowToSaleLine(
  row: PharmacyPrescriptionLine,
  parseFrequencyUnit?: (unit: unknown) => number | null,
  useStockBatch = true
): Record<string, unknown> {
  const parse = parseFrequencyUnit ?? (() => null);
  const line: Record<string, unknown> = {
    treatmentRequestedId: row.id,
    given: row.given,
    quantity: row.given ? row.quantity : row.prescribedQuantity || row.quantity,
    amountPerFrequencyValue: row.amountPerFrequencyValue ?? undefined,
    amountPerFrequencyUnit: row.amountPerFrequencyUnit || undefined,
    frequencyValue: row.frequencyValue ?? undefined,
    frequencyUnit: parse(row.frequencyUnit) ?? undefined,
    durationValue: row.durationValue ?? undefined,
    durationUnit: row.durationUnit ?? undefined,
    instructions: row.instructions || undefined,
    route: row.route || undefined,
  };
  if (useStockBatch) {
    if (row.stockBatchId != null && row.stockBatchId > 0) {
      line['stockBatchId'] = row.stockBatchId;
    }
  } else if (row.itemId != null && row.itemId > 0) {
    line['itemId'] = row.itemId;
  }
  return line;
}

export function pharmacyRowsToReceiptLines(
  rows: PharmacyPrescriptionLine[],
  dosageLabel: (row: PharmacyPrescriptionLine) => string,
  formatName: (name: string | undefined) => string
): PharmacyReceiptLine[] {
  return (rows || []).map((row) => ({
    itemName: formatName(row.itemName) || '—',
    dosage: dosageLabel(row) || '',
    quantity: pharmacyNum(row.quantity),
    unitPrice: pharmacyNum(row.unitSellingPrice),
    lineTotal: pharmacyLineAmount(row),
    given: row.given !== false,
    statusNote: row.given === false ? 'Not given' : undefined,
  }));
}

export function prescriptionRowOutOfStock(
  row: PharmacyPrescriptionLine,
  itemList: any[]
): boolean {
  return getPharmacyItemTotalStock(row, itemList) <= 0;
}
