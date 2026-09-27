import jsPDF from 'jspdf';

/** Shared print layout — Quotation → Proforma → Sales Invoice → Receipt → EFRIS → Delivery Note. */
export type CommercialDocType =
  | 'quotation'
  | 'proforma'
  | 'sales_invoice'
  | 'receipt'
  | 'efris_receipt'
  | 'delivery_note';

export function normalizeCommercialDocType(
  docType: CommercialDocType | 'invoice' | string | null | undefined
): CommercialDocType {
  switch (String(docType || '').toLowerCase().replace(/-/g, '_')) {
    case 'quotation':
      return 'quotation';
    case 'proforma':
    case 'proforma_invoice':
      return 'proforma';
    case 'sales_invoice':
    case 'invoice':
      return 'sales_invoice';
    case 'efris_receipt':
    case 'efris':
    case 'efrisreceipt':
      return 'efris_receipt';
    case 'delivery_note':
    case 'delivery':
    case 'deliverynote':
      return 'delivery_note';
    default:
      return 'receipt';
  }
}

/** Stock is reduced only for sales invoice, receipt, and EFRIS receipt. */
export function commercialDocDeductsStock(docType: CommercialDocType | string): boolean {
  const t = normalizeCommercialDocType(docType);
  return t === 'sales_invoice' || t === 'receipt' || t === 'efris_receipt';
}

export function commercialDocShowsAmountReceived(docType: CommercialDocType | string): boolean {
  const t = normalizeCommercialDocType(docType);
  // Payment may be taken at any stage; it only prints on these documents.
  return (
    t === 'receipt' ||
    t === 'efris_receipt' ||
    t === 'sales_invoice' ||
    t === 'delivery_note'
  );
}

/** True when the POS may collect cash for this document stage (all stages). */
export function commercialDocAcceptsPayment(_docType?: CommercialDocType | string): boolean {
  return true;
}

export function commercialDocIsEfris(docType: CommercialDocType | string): boolean {
  return normalizeCommercialDocType(docType) === 'efris_receipt';
}

export function commercialDocIsDeliveryNote(docType: CommercialDocType | string): boolean {
  return normalizeCommercialDocType(docType) === 'delivery_note';
}

export interface CommercialDocLine {
  itemName: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  /** Absolute discount shown under the item name when > 0 */
  discountAmount?: number;
  /** Optional SKU / item code for delivery note Item # column */
  itemCode?: string;
}

/** EFRIS fiscal fields (URA returns real values; placeholders OK until live). */
export interface EfrisFiscalFields {
  sellerTin?: string;
  sellerLegalName?: string;
  deviceNo?: string;
  fdn?: string;
  verificationCode?: string;
  qrPayload?: string;
  issuedAtLabel?: string;
  /** When true, document is a printable template only (not yet fiscalised by URA). */
  templateOnly?: boolean;
}

export interface CommercialDocData {
  docType: CommercialDocType;
  /** Document number (sale no / invoice no / quote no) */
  docNo: string;
  dateLabel: string;
  timeLabel?: string;
  facilityName: string;
  facilityAddress?: string;
  facilityContact?: string;
  clientName?: string;
  clientAddress?: string;
  clientPhone?: string;
  /** Delivery note meta */
  orderNo?: string;
  customerId?: string;
  shippingMethod?: string;
  despatchDateLabel?: string;
  facilitySlogan?: string;
  enquiryContactName?: string;
  enquiryContactPhone?: string;
  /** Secondary left meta (PO, served by, quote validity, etc.) */
  referenceLabel?: string;
  referenceValue?: string;
  paymentMethod?: string;
  paymentDetails?: string;
  notes?: string;
  thankYouMessage?: string;
  paymentTerms?: string;
  lines: CommercialDocLine[];
  /** Money breakdown — omit fields that do not apply to the doc type */
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  amountReceived?: number;
  changeDue?: number;
  /** Remaining balance after amount paid. */
  amountDue?: number;
  /** Currency prefix shown before amounts */
  currencyPrefix?: string;
  /** Present when docType is efris_receipt */
  efris?: EfrisFiscalFields;
}

export interface CommercialDocPdfDeps {
  addLogoToPdf: (pdf: jsPDF, x: number, y: number, w: number, h: number) => boolean;
  formatMoney: (value: number) => string;
}

const ACCENT: [number, number, number] = [0, 174, 239];
const TEXT: [number, number, number] = [45, 55, 72];
const MUTED: [number, number, number] = [100, 116, 139];
const ZEBRA: [number, number, number] = [245, 247, 250];
const FOOTER_BG: [number, number, number] = [232, 236, 241];

export function commercialDocTitle(docType: CommercialDocType | string): string {
  switch (normalizeCommercialDocType(docType)) {
    case 'quotation':
      return 'Quotation';
    case 'proforma':
      return 'Proforma Invoice';
    case 'sales_invoice':
      return 'Sales Invoice';
    case 'efris_receipt':
      return 'EFRIS Receipt';
    case 'delivery_note':
      return 'Delivery Note';
    default:
      return 'Receipt';
  }
}

export function commercialDocNoLabel(docType: CommercialDocType | string): string {
  switch (normalizeCommercialDocType(docType)) {
    case 'quotation':
      return 'QUOTATION';
    case 'proforma':
      return 'PROFORMA';
    case 'sales_invoice':
      return 'SALES INVOICE';
    case 'efris_receipt':
      return 'EFRIS FDN';
    case 'delivery_note':
      return 'DELIVERY NOTE';
    default:
      return 'RECEIPT';
  }
}

export function commercialDocFilename(docType: CommercialDocType, docNo: string): string {
  const safe = String(docNo ?? docType).replace(/[^\w-]+/g, '-');
  return `${docType}-${safe}.pdf`;
}

export function commercialDocBlobUrl(pdf: jsPDF): string {
  const out = pdf.output('bloburl');
  if (typeof out === 'string') {
    return out;
  }
  if (out instanceof URL) {
    return out.href;
  }
  return String(out);
}

/**
 * Professional A4 commercial document: title + logo header, client/meta,
 * zebra item table (No / Item / Cost / Qty / Total), payment + totals, footer.
 */
export function buildCommercialDocumentPdf(
  data: CommercialDocData,
  deps: CommercialDocPdfDeps
): jsPDF {
  if (normalizeCommercialDocType(data.docType) === 'delivery_note') {
    return buildDeliveryNotePdf(data, deps);
  }

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const usable = pageW - margin * 2;
  const right = pageW - margin;
  const prefix = data.currencyPrefix ?? '';
  const money = (n: number) => `${prefix}${deps.formatMoney(n)}`.trim();

  // Column layout: No | Item Description | Cost | Qty | Total
  const colNo = { x: margin, w: usable * 0.08 };
  const colItem = { x: margin + usable * 0.08, w: usable * 0.42 };
  const colCost = { x: margin + usable * 0.5, w: usable * 0.18 };
  const colQty = { x: margin + usable * 0.68, w: usable * 0.12 };
  const colTotal = { x: margin + usable * 0.8, w: usable * 0.2 };

  let y = 16;

  const ensureSpace = (needMm: number) => {
    if (y + needMm > pageH - 42) {
      pdf.addPage();
      y = margin;
    }
  };

  const fillRect = (
    x: number,
    top: number,
    w: number,
    h: number,
    rgb: [number, number, number]
  ) => {
    pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
    pdf.rect(x, top, w, h, 'F');
  };

  const textLeft = (text: string, x: number, atY: number) => {
    pdf.text(text, x, atY);
  };

  const textCenterIn = (text: string, x: number, w: number, atY: number) => {
    const tw = pdf.getTextWidth(text);
    pdf.text(text, x + (w - tw) / 2, atY);
  };

  const textRightAt = (text: string, xRight: number, atY: number) => {
    const tw = pdf.getTextWidth(text);
    pdf.text(text, xRight - tw, atY);
  };

  // ----- Header: title left, logo right -----
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.text(commercialDocTitle(data.docType), margin, y + 10);

  const logoBoxW = 42;
  const logoBoxH = 22;
  const logoBoxX = right - logoBoxW;
  // White plate behind logo so the image stays visible (not washed by accent).
  fillRect(logoBoxX, y, logoBoxW, logoBoxH, [255, 255, 255]);
  pdf.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  pdf.setLineWidth(0.6);
  pdf.rect(logoBoxX, y, logoBoxW, logoBoxH, 'S');
  const logoDrawn = deps.addLogoToPdf(pdf, logoBoxX + 3, y + 2, logoBoxW - 6, logoBoxH - 4);
  if (!logoDrawn) {
    fillRect(logoBoxX, y, logoBoxW, logoBoxH, ACCENT);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    const shortName = (data.facilityName || 'Logo').slice(0, 12);
    textCenterIn(shortName, logoBoxX, logoBoxW, y + 13);
  }
  y += logoBoxH + 10;

  // ----- Client left / Doc meta right -----
  const metaTop = y;
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const clientLabel = (data.clientName || 'WALK-IN CUSTOMER').toUpperCase();
  pdf.text(clientLabel, margin, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  if (data.clientAddress?.trim()) {
    const addrLines = pdf.splitTextToSize(data.clientAddress.trim(), usable * 0.48);
    pdf.text(addrLines, margin, y);
    y += addrLines.length * 4.2;
  } else {
    pdf.text('Client', margin, y);
    y += 4.2;
  }

  y += 4;
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  const refLabel = (data.referenceLabel || defaultReferenceLabel(data.docType)).toUpperCase();
  pdf.text(refLabel, margin, y);
  y += 4.5;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.text(String(data.referenceValue || '-'), margin, y);
  const leftBottom = y + 2;

  // Right meta
  let ry = metaTop;
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  const docMeta = `${commercialDocNoLabel(data.docType)} #${data.docNo}`.toUpperCase();
  textRightAt(docMeta, right, ry);
  ry += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  const dateLine = data.timeLabel ? `${data.dateLabel}  ${data.timeLabel}` : data.dateLabel;
  textRightAt(dateLine, right, ry);

  y = Math.max(leftBottom, ry + 6) + 6;

  // ----- Table header -----
  const headerH = 8;
  ensureSpace(headerH + 20);
  fillRect(margin, y, usable, headerH, ACCENT);
  const headerBaseline = y + 5.5;
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  textCenterIn('No', colNo.x, colNo.w, headerBaseline);
  textLeft('Item Description', colItem.x + 1, headerBaseline);
  textRightAt('Cost', colCost.x + colCost.w - 1, headerBaseline);
  textCenterIn('Qty', colQty.x, colQty.w, headerBaseline);
  textRightAt('Total', colTotal.x + colTotal.w - 1, headerBaseline);
  y += headerH;

  // ----- Table rows -----
  const rowPad = 2.4;
  const lineH = 4.2;
  data.lines.forEach((line, index) => {
    const name = String(line.itemName || '-');
    const extra =
      line.description?.trim() ||
      (line.discountAmount && line.discountAmount > 0
        ? `Disc: ${money(line.discountAmount)}`
        : '');
    const nameLines = pdf.splitTextToSize(name, colItem.w - 2);
    const extraLines = extra ? pdf.splitTextToSize(extra, colItem.w - 2) : [];
    const contentLines = Math.max(nameLines.length + extraLines.length, 1);
    const rowH = Math.max(contentLines * lineH + rowPad * 2, 9);
    ensureSpace(rowH + 2);

    if (index % 2 === 1) {
      fillRect(margin, y, usable, rowH, ZEBRA);
    }

    const baseline = y + rowPad + lineH * 0.75;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    textCenterIn(String(index + 1), colNo.x, colNo.w, baseline);
    pdf.setFont('helvetica', 'bold');
    textLeft(nameLines[0] || '-', colItem.x + 1, baseline);
    if (nameLines.length > 1) {
      pdf.setFont('helvetica', 'normal');
      pdf.text(nameLines.slice(1), colItem.x + 1, baseline + lineH);
    }
    if (extraLines.length) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(220, 38, 38);
      pdf.text(extraLines, colItem.x + 1, baseline + nameLines.length * lineH);
      pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    }
    pdf.setFont('helvetica', 'normal');
    textRightAt(money(line.unitPrice), colCost.x + colCost.w - 1, baseline);
    textCenterIn(String(line.quantity ?? 0), colQty.x, colQty.w, baseline);
    textRightAt(money(line.lineTotal), colTotal.x + colTotal.w - 1, baseline);

    y += rowH;
  });

  if (!data.lines.length) {
    ensureSpace(12);
    fillRect(margin, y, usable, 10, ZEBRA);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    textCenterIn('No items', margin, usable, y + 6.5);
    y += 10;
  }

  y += 8;
  ensureSpace(48);

  // ----- Payment / notes left + totals right -----
  const totalsX = margin + usable * 0.55;
  const totalsW = usable * 0.45;
  const leftColW = usable * 0.48;
  let leftY = y;
  let rightY = y;

  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(paymentSectionTitle(data.docType), margin, leftY);
  leftY += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  const payLines: string[] = [];
  if (data.paymentMethod?.trim()) {
    payLines.push(data.paymentMethod.trim());
  }
  if (data.paymentDetails?.trim()) {
    payLines.push(...pdf.splitTextToSize(data.paymentDetails.trim(), leftColW));
  }
  if (data.docType === 'quotation') {
    payLines.push('This quotation is an estimate and does not confirm payment.');
  }
  if (data.docType === 'proforma') {
    payLines.push('This proforma invoice does not confirm stock reservation or payment.');
  }
  if (!payLines.length) {
    payLines.push('-');
  }
  pdf.text(payLines, margin, leftY);
  leftY += payLines.length * 4.2 + 2;

  const drawSumRow = (label: string, value: string, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.text(label, totalsX, rightY);
    textRightAt(value, right, rightY);
    rightY += 6;
  };

  drawSumRow('Subtotal', money(data.subtotal));
  drawSumRow('Discount', money(data.discount != null ? data.discount : 0));
  // Always include tax on commercial documents / receipts.
  drawSumRow('Tax', money(data.tax != null ? data.tax : 0));

  // Total bar (after subtotal / discount / tax)
  rightY += 1;
  const barH = 9;
  fillRect(totalsX, rightY - 6, totalsW, barH, ACCENT);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(totalLabel(data.docType), totalsX + 3, rightY);
  textRightAt(money(data.total), right - 2, rightY);
  rightY += 8;

  if (commercialDocShowsAmountReceived(data.docType)) {
    const received = data.amountReceived != null ? data.amountReceived : 0;
    const change =
      data.changeDue != null ? data.changeDue : Math.max(0, received - data.total);
    const due =
      data.amountDue != null
        ? data.amountDue
        : Math.max(0, data.total - received);
    drawSumRow('Amount paid', money(received));
    drawSumRow('Change', money(change));
    drawSumRow(due > 0 ? 'Amount due' : 'Outstanding', money(due));
  }

  // Thank-you + notes sit below payment/totals (closer to the footer)
  y = Math.max(leftY, rightY) + 16;
  ensureSpace(24);
  const thanks = data.thankYouMessage?.trim() || thanksForDoc(data.docType);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(thanks, margin, y);
  y += 6;

  if (data.notes?.trim()) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    const noteLines = pdf.splitTextToSize(`Notes: ${data.notes.trim()}`, usable);
    pdf.text(noteLines, margin, y);
    y += noteLines.length * 3.8;
  }

  // ----- EFRIS fiscal block (printable template) -----
  if (commercialDocIsEfris(data.docType)) {
    const e = data.efris || {};
    ensureSpace(52);
    y += 4;
    fillRect(margin, y, usable, 46, [248, 250, 252]);
    pdf.setDrawColor(0, 174, 239);
    pdf.setLineWidth(0.4);
    pdf.rect(margin, y, usable, 46);

    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('EFRIS FISCAL DETAILS', margin + 3, y + 6);
    if (e.templateOnly !== false) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(180, 83, 9);
      pdf.text('TEMPLATE — not yet fiscalised by URA', margin + 52, y + 6);
    }

    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const leftX = margin + 3;
    let ey = y + 12;
    pdf.text(`Seller TIN: ${e.sellerTin || 'TIN-PENDING'}`, leftX, ey);
    ey += 4.2;
    pdf.text(`Device: ${e.deviceNo || '-'}`, leftX, ey);
    ey += 4.2;
    pdf.setFont('helvetica', 'bold');
    pdf.text(`FDN: ${e.fdn || data.docNo}`, leftX, ey);
    ey += 4.2;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Verification: ${e.verificationCode || '-'}`, leftX, ey);
    ey += 4.2;
    pdf.text(`Issued: ${e.issuedAtLabel || `${data.dateLabel} ${data.timeLabel || ''}`.trim()}`, leftX, ey);

    // QR placeholder box (right side)
    const qrSize = 28;
    const qrX = right - qrSize - 4;
    const qrY = y + 9;
    pdf.setDrawColor(45, 55, 72);
    pdf.setLineWidth(0.5);
    pdf.rect(qrX, qrY, qrSize, qrSize);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.text('EFRIS', qrX + qrSize / 2, qrY + qrSize / 2 - 1, { align: 'center' });
    pdf.text('QR', qrX + qrSize / 2, qrY + qrSize / 2 + 3, { align: 'center' });
    y += 50;
  }

  y += 10;

  // ----- Footer -----
  const footerH = 28;
  if (y + footerH > pageH - 8) {
    pdf.addPage();
    y = margin;
  }
  const footerTop = pageH - footerH - 8;
  fillRect(margin, footerTop, usable, footerH, FOOTER_BG);

  let fy = footerTop + 6;
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text((data.facilityName || 'FACILITY').toUpperCase(), margin + 3, fy);
  fy += 4.5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  const addr = [data.facilityAddress, data.facilityContact].filter(Boolean).join('  |  ');
  if (addr) {
    const addrLines = pdf.splitTextToSize(addr, usable * 0.55);
    pdf.text(addrLines, margin + 3, fy);
    fy += addrLines.length * 3.6 + 2;
  } else {
    fy += 2;
  }

  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text(termsHeading(data.docType), margin + 3, fy);
  fy += 3.8;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  const terms =
    data.paymentTerms?.trim() ||
    defaultTerms(data.docType);
  const termLines = pdf.splitTextToSize(terms, usable - 8);
  pdf.text(termLines.slice(0, 2), margin + 3, fy);

  return pdf;
}

/**
 * Delivery Note layout (qty only): company + meta grid, shipping/invoice addresses,
 * Item# / Description / Ordered / Shipped / Outstanding, terms, signatures, footer.
 */
function buildDeliveryNotePdf(
  data: CommercialDocData,
  deps: CommercialDocPdfDeps
): jsPDF {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const usable = pageW - margin * 2;
  const right = pageW - margin;

  const company = (data.facilityName || 'Company').trim();
  const slogan =
    (data.facilitySlogan || '').trim() || 'Quality products · Reliable delivery';
  const orderDate = data.dateLabel || '';
  const despatchDate = data.despatchDateLabel || data.dateLabel || '';
  const orderNo = data.orderNo || data.docNo || '-';
  const dnNo = data.docNo || '-';
  const customerId = data.customerId || '-';
  const shippingMethod = data.shippingMethod || 'Hand delivery';
  const clientName = (data.clientName || 'Walk-in customer').trim();
  const clientAddr = (data.clientAddress || '').trim() || '—';
  const clientPhone = (data.clientPhone || '').trim() || '—';
  const facilityAddr = (data.facilityAddress || '').trim();
  const facilityContact = (data.facilityContact || '').trim();
  const enquiryName =
    (data.enquiryContactName || data.referenceValue || 'our team').trim();
  const enquiryPhone =
    (data.enquiryContactPhone || '').trim() ||
    facilityContact.split(/[|,]/)[0]?.replace(/^Tel:\s*/i, '').trim() ||
    '—';

  let y = 14;

  // —— Header: company left, Delivery Note + meta grid right ——
  const metaW = usable * 0.48;
  const metaX = right - metaW;
  const brandMaxW = metaX - margin - 6;

  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  const nameLines = pdf.splitTextToSize(company, brandMaxW);
  pdf.text(nameLines.slice(0, 2), margin, y + 5);
  let brandBottom = y + 5 + nameLines.slice(0, 2).length * 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  const sloganLines = pdf.splitTextToSize(slogan, brandMaxW);
  pdf.text(sloganLines.slice(0, 2), margin, brandBottom + 2);
  brandBottom += 2 + sloganLines.slice(0, 2).length * 4;

  // Logo accent strip under brand (optional)
  deps.addLogoToPdf(pdf, margin, brandBottom + 2, 28, 14);

  pdf.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Delivery Note', right, y + 5, { align: 'right' });

  const metaRows: Array<[string, string]> = [
    ['Order Date', orderDate],
    ['Order #', orderNo],
    ['Delivery Note #', dnNo],
    ['Customer ID', customerId],
    ['Despatch Date', despatchDate],
    ['Shipping Method', shippingMethod],
  ];
  let metaY = y + 12;
  const labelW = metaW * 0.42;
  const valueW = metaW * 0.58;
  const rowH = 6.2;
  pdf.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  pdf.setLineWidth(0.25);
  for (const [label, value] of metaRows) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.text(label, metaX, metaY + 4.2);
    pdf.rect(metaX + labelW, metaY, valueW, rowH);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    const vLines = pdf.splitTextToSize(String(value || '-'), valueW - 3);
    pdf.text(vLines[0] || '-', metaX + labelW + 1.5, metaY + 4.2);
    metaY += rowH;
  }

  y = Math.max(brandBottom + 20, metaY + 4);

  // —— Shipping / Invoice address blocks ——
  const gap = 4;
  const half = (usable - gap) / 2;
  const boxH = 32;
  const drawAddressBox = (x: number, title: string) => {
    pdf.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    pdf.rect(x, y, half, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(title, x + 3, y + 4.8);
    pdf.setDrawColor(180, 190, 200);
    pdf.setLineWidth(0.3);
    pdf.rect(x, y + 7, half, boxH - 7);
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    let ty = y + 12;
    const addrLines = [clientName, clientAddr, clientPhone].filter((l) => l && l !== '—');
    if (!addrLines.length) {
      addrLines.push(clientName || 'Walk-in customer');
    }
    for (const line of addrLines.slice(0, 5)) {
      const wrapped = pdf.splitTextToSize(line, half - 6);
      pdf.text(wrapped[0], x + 3, ty);
      ty += 4.5;
    }
  };
  drawAddressBox(margin, 'Shipping Address');
  drawAddressBox(margin + half + gap, 'Invoice Address');
  y += boxH + 8;

  // —— Qty table ——
  const colItem = { x: margin, w: usable * 0.14 };
  const colDesc = { x: margin + usable * 0.14, w: usable * 0.46 };
  const colOrd = { x: margin + usable * 0.6, w: usable * 0.13 };
  const colShip = { x: margin + usable * 0.73, w: usable * 0.13 };
  const colOut = { x: margin + usable * 0.86, w: usable * 0.14 };
  const headerH = 8;

  const drawTableHeader = () => {
    pdf.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    pdf.rect(margin, y, usable, headerH, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Item #', colItem.x + 2, y + 5.4);
    pdf.text('Description', colDesc.x + 2, y + 5.4);
    pdf.text('Ordered', colOrd.x + colOrd.w - 2, y + 5.4, { align: 'right' });
    pdf.text('Shipped', colShip.x + colShip.w - 2, y + 5.4, { align: 'right' });
    pdf.text('Outstanding', colOut.x + colOut.w - 2, y + 5.4, {
      align: 'right',
    });
    y += headerH;
  };

  drawTableHeader();

  const billed = data.lines.filter((l) => (l as { given?: boolean }).given !== false);
  const minRows = Math.max(billed.length, 8);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  for (let i = 0; i < minRows; i++) {
    const rowH = 7.2;
    if (y + rowH > pageH - 78) {
      pdf.addPage();
      y = margin;
      drawTableHeader();
    }
    if (i % 2 === 1) {
      pdf.setFillColor(ZEBRA[0], ZEBRA[1], ZEBRA[2]);
      pdf.rect(margin, y, usable, rowH, 'F');
    }
    const line = billed[i];
    if (line) {
      const itemNo = String((line as { itemCode?: string }).itemCode || i + 1);
      const desc =
        line.description?.trim()
          ? `${line.itemName} — ${line.description}`
          : line.itemName;
      const qty = line.quantity;
      const outstanding = '—';
      pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      pdf.text(itemNo, colItem.x + 2, y + 4.8);
      const descLines = pdf.splitTextToSize(desc, colDesc.w - 4);
      pdf.text(descLines[0] || '', colDesc.x + 2, y + 4.8);
      pdf.text(String(qty), colOrd.x + colOrd.w - 2, y + 4.8, { align: 'right' });
      pdf.text(String(qty), colShip.x + colShip.w - 2, y + 4.8, {
        align: 'right',
      });
      pdf.text(outstanding, colOut.x + colOut.w - 2, y + 4.8, {
        align: 'right',
      });
    }
    y += rowH;
  }

  // Bottom border under table
  pdf.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, right, y);
  y += 6;

  // Payment indication (amount paid / outstanding) — no pricing on line items
  if (commercialDocShowsAmountReceived(data.docType)) {
    const received = data.amountReceived != null ? data.amountReceived : 0;
    const dueTotal = data.total != null ? data.total : 0;
    const outstanding = Math.max(0, dueTotal - received);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    pdf.text(`Amount paid: ${deps.formatMoney(received)}`, margin, y + 4);
    pdf.text(`Outstanding: ${deps.formatMoney(outstanding)}`, right, y + 4, {
      align: 'right',
    });
    y += 8;
  }

  // —— Terms ——
  const terms = [
    'Notice must be given to us of any goods not received within 10 days taken from the date of despatch stated on this delivery note.',
    'Any shortage or damage must be reported within 72 hours of receipt of goods.',
    'Complaints can only be accepted if made in writing within 30 days of receipt of goods.',
    'No goods may be returned without prior authorisation from company.',
  ];
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  for (const t of terms) {
    const lines = pdf.splitTextToSize(t, usable);
    pdf.text(lines, pageW / 2, y, { align: 'center' });
    y += lines.length * 3.4 + 1.2;
  }
  y += 4;

  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(
    data.thankYouMessage?.trim() || 'Thank you for your business!',
    pageW / 2,
    y,
    { align: 'center' }
  );
  y += 10;

  // —— Signature row ——
  const sigW = usable / 3;
  const sigLabels = ['Signature', 'Print Name', 'Date'];
  pdf.setDrawColor(160, 170, 180);
  pdf.setLineWidth(0.35);
  for (let i = 0; i < 3; i++) {
    const sx = margin + i * sigW + 4;
    const sw = sigW - 10;
    pdf.line(sx, y, sx + sw, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    pdf.text(sigLabels[i], sx + sw / 2, y + 4.5, { align: 'center' });
  }
  y += 14;

  // —— Enquiry + facility footer ——
  pdf.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  pdf.setLineWidth(0.35);
  pdf.line(margin, y, right, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  const enquiry = `Should you have any enquiries concerning this delivery note, please contact ${enquiryName} on ${enquiryPhone}`;
  const enquiryLines = pdf.splitTextToSize(enquiry, usable);
  pdf.text(enquiryLines, pageW / 2, y, { align: 'center' });
  y += enquiryLines.length * 3.6 + 3;
  pdf.line(margin, y, right, y);
  y += 5;

  pdf.setFontSize(8);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  if (facilityAddr) {
    const a = pdf.splitTextToSize(facilityAddr, usable);
    pdf.text(a, pageW / 2, y, { align: 'center' });
    y += a.length * 3.5 + 1.5;
  }
  if (facilityContact) {
    const c = pdf.splitTextToSize(facilityContact, usable);
    pdf.text(c, pageW / 2, y, { align: 'center' });
  }

  return pdf;
}

function defaultReferenceLabel(docType: CommercialDocType): string {
  switch (normalizeCommercialDocType(docType)) {
    case 'quotation':
    case 'proforma':
      return 'Valid for';
    case 'sales_invoice':
      return 'Reference';
    default:
      return 'Served by';
  }
}

function paymentSectionTitle(docType: CommercialDocType): string {
  switch (normalizeCommercialDocType(docType)) {
    case 'quotation':
      return 'QUOTATION NOTES';
    case 'proforma':
      return 'PROFORMA NOTES';
    case 'delivery_note':
      return 'DELIVERY NOTES';
    default:
      return 'PAYMENT METHOD';
  }
}

function thanksForDoc(docType: CommercialDocType): string {
  switch (normalizeCommercialDocType(docType)) {
    case 'quotation':
    case 'proforma':
      return 'We look forward to your order.';
    case 'efris_receipt':
      return 'Thank you. Verify this e-receipt with URA EFRIS (QR / FDN).';
    case 'delivery_note':
      return 'Goods delivered. Please confirm receipt of items.';
    default:
      return 'Thank you.';
  }
}

function totalLabel(docType: CommercialDocType): string {
  switch (normalizeCommercialDocType(docType)) {
    case 'quotation':
      return 'Quoted total';
    case 'proforma':
      return 'Proforma total';
    case 'efris_receipt':
      return 'Gross total';
    case 'delivery_note':
      return 'Delivered total';
    default:
      return 'Total';
  }
}

function termsHeading(docType: CommercialDocType): string {
  switch (normalizeCommercialDocType(docType)) {
    case 'quotation':
      return 'QUOTATION TERMS';
    case 'proforma':
      return 'PROFORMA TERMS';
    case 'sales_invoice':
      return 'PAYMENT TERMS';
    case 'efris_receipt':
      return 'EFRIS TERMS';
    case 'delivery_note':
      return 'DELIVERY TERMS';
    default:
      return 'RECEIPT TERMS';
  }
}

function defaultTerms(docType: CommercialDocType): string {
  switch (normalizeCommercialDocType(docType)) {
    case 'quotation':
      return 'Prices are estimates and may change. Quotation does not reserve stock unless confirmed.';
    case 'proforma':
      return 'This is a proforma invoice and does not confirm stock reservation or payment.';
    case 'sales_invoice':
      return 'Payment is due as agreed. Please retain this sales invoice for your records.';
    case 'efris_receipt':
      return 'This EFRIS e-receipt template shows FDN, verification code, and QR for URA validation. Until live fiscalisation, values may be placeholders.';
    case 'delivery_note':
      return 'This delivery note confirms goods handed over. Retain it with the matching receipt or invoice.';
    default:
      return 'Goods sold are non-returnable unless defective. Please retain this receipt for your records.';
  }
}

/** Build printable placeholder EFRIS fields until live URA fiscalisation is wired. */
export function buildEfrisTemplateFields(input: {
  saleNo: string;
  facilityName: string;
  dateLabel: string;
  timeLabel?: string;
  sellerTin?: string | null;
  deviceNo?: string | null;
}): EfrisFiscalFields {
  const sale = String(input.saleNo || 'TEMP').replace(/[^\w-]+/g, '');
  const tin = String(input.sellerTin || '').trim() || 'TIN-PENDING';
  const device = String(input.deviceNo || '').trim() || `${tin}_01`;
  const fdn = `FDN-${sale}`;
  const verificationCode = String(
    Math.abs(
      Array.from(`${fdn}|${tin}`).reduce((h, ch) => ((h << 5) - h + ch.charCodeAt(0)) | 0, 0)
    )
  ).padStart(16, '0').slice(0, 20);
  const issuedAtLabel = [input.dateLabel, input.timeLabel].filter(Boolean).join(' ');
  const qrPayload = `EFRIS|FDN=${fdn}|VC=${verificationCode}|TIN=${tin}|DEV=${device}`;
  return {
    sellerTin: tin,
    sellerLegalName: input.facilityName,
    deviceNo: device,
    fdn,
    verificationCode,
    qrPayload,
    issuedAtLabel,
    templateOnly: true,
  };
}

/** Map a typical POS/pharmacy sale into commercial document data. */
export function mapSaleToCommercialDoc(input: {
  docType: CommercialDocType;
  saleNo: string;
  saleDateLabel: string;
  saleTimeLabel?: string;
  facilityName: string;
  facilityAddress?: string;
  facilityContact?: string;
  facilitySlogan?: string;
  clientName?: string;
  clientAddress?: string;
  clientPhone?: string;
  orderNo?: string;
  customerId?: string;
  shippingMethod?: string;
  despatchDateLabel?: string;
  enquiryContactName?: string;
  enquiryContactPhone?: string;
  receivedBy?: string;
  paymentMethod?: string;
  notes?: string;
  thankYouMessage?: string;
  paymentTerms?: string;
  lines: Array<{
    itemName: string;
    dosage?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    discountAmount?: number;
    given?: boolean;
    itemCode?: string;
  }>;
  subtotal: number;
  tax?: number;
  total?: number;
  amountReceived?: number;
  changeDue?: number;
  amountDue?: number;
  discount?: number;
  efris?: EfrisFiscalFields;
}): CommercialDocData {
  const billed = input.lines.filter((l) => l.given !== false);
  const lines: CommercialDocLine[] = billed.map((l) => ({
    itemName: l.itemName,
    description: l.dosage?.trim() || undefined,
    unitPrice: l.unitPrice,
    quantity: l.quantity,
    lineTotal: l.lineTotal,
    discountAmount: l.discountAmount,
    itemCode: l.itemCode,
  }));

  let referenceLabel = 'Served by';
  let referenceValue = input.receivedBy || '-';
  const docType = normalizeCommercialDocType(input.docType);
  if (docType === 'quotation' || docType === 'proforma') {
    referenceLabel = 'Valid for';
    referenceValue = '14 days';
  } else if (docType === 'sales_invoice') {
    referenceLabel = 'Reference';
    referenceValue = input.receivedBy ? `Attended by ${input.receivedBy}` : input.saleNo;
  } else if (docType === 'efris_receipt') {
    referenceLabel = 'Operator';
    referenceValue = input.receivedBy || '-';
  } else if (docType === 'delivery_note') {
    referenceLabel = 'Dispatched by';
    referenceValue = input.receivedBy || '-';
  }

  const tax = input.tax != null ? input.tax : 0;
  const discount = input.discount != null ? input.discount : 0;
  const total =
    input.total != null ? input.total : input.subtotal - discount + tax;

  const efris =
    docType === 'efris_receipt'
      ? input.efris ||
        buildEfrisTemplateFields({
          saleNo: input.saleNo,
          facilityName: input.facilityName,
          dateLabel: input.saleDateLabel,
          timeLabel: input.saleTimeLabel,
        })
      : undefined;

  return {
    docType,
    docNo: input.saleNo,
    dateLabel: input.saleDateLabel,
    timeLabel: input.saleTimeLabel,
    facilityName: input.facilityName,
    facilityAddress: input.facilityAddress,
    facilityContact: input.facilityContact,
    facilitySlogan: input.facilitySlogan,
    clientName: input.clientName,
    clientAddress: input.clientAddress,
    clientPhone: input.clientPhone,
    orderNo: input.orderNo || input.saleNo,
    customerId: input.customerId,
    shippingMethod: input.shippingMethod || (docType === 'delivery_note' ? 'Hand delivery' : undefined),
    despatchDateLabel: input.despatchDateLabel || input.saleDateLabel,
    enquiryContactName: input.enquiryContactName || input.receivedBy,
    enquiryContactPhone: input.enquiryContactPhone,
    referenceLabel,
    referenceValue,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    thankYouMessage:
      input.thankYouMessage ||
      (docType === 'delivery_note' ? 'Thank you for your business!' : undefined),
    paymentTerms: input.paymentTerms,
    lines,
    subtotal: input.subtotal,
    discount: discount,
    tax,
    total,
    amountReceived: commercialDocShowsAmountReceived(docType) ? input.amountReceived : undefined,
    changeDue: commercialDocShowsAmountReceived(docType) ? input.changeDue : undefined,
    amountDue: commercialDocShowsAmountReceived(docType)
      ? input.amountDue != null
        ? input.amountDue
        : Math.max(0, total - (input.amountReceived || 0))
      : undefined,
    efris,
  };
}
