import jsPDF from 'jspdf';
import { formatMoneyWholeDisplay } from './ugx-money.util';
import {
  buildCommercialDocumentPdf,
  commercialDocFilename,
  CommercialDocData,
  CommercialDocLine,
} from './commercial-document-pdf.util';

export interface PaymentReceiptPdfData {
  facilityName: string;
  facilityContactLine?: string;
  facilityAddress?: string;
  clientName: string;
  clientFileNo?: string;
  visitNumber?: string | number | null;
  visitDate?: string;
  receiptNo: string;
  amountPaid: number | string | null | undefined;
  paymentForm: string;
  status: string;
  notes: string;
  dateOfPayment: string;
  timeOfPayment: string;
  paidBy?: string;
  receivedBy?: string;
  invoiceTotal?: number | string | null | undefined;
  invoiceAmountPaid?: number | string | null | undefined;
  balanceDue?: number | string | null | undefined;
}

export interface PaymentStatementRow {
  amountPaid: number | string | null | undefined;
  paymentForm: string;
  status: string;
  notes: string;
  dateOfPayment: string;
  timeOfPayment: string;
  paidBy?: string;
  receivedBy?: string;
}

export interface PaymentStatementPdfData {
  facilityName: string;
  facilityContactLine?: string;
  facilityAddress?: string;
  clientName: string;
  clientFileNo?: string;
  visitNumber?: string | number | null;
  visitDate?: string;
  rows: PaymentStatementRow[];
  subtotal?: number | string | null | undefined;
  discount?: number | string | null | undefined;
  tax?: number | string | null | undefined;
  totalAmount?: number | string | null | undefined;
  amountPaid?: number | string | null | undefined;
  balanceDue?: number | string | null | undefined;
}

export interface PaymentPdfDeps {
  addLogoToPdf: (pdf: jsPDF, x: number, y: number, w: number, h: number) => boolean;
}

function moneyNum(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value: any): string {
  return formatMoneyWholeDisplay(value);
}

function textOrDash(value: any): string {
  const s = value == null ? '' : String(value).trim();
  return s || '-';
}

function downloadPdf(pdf: jsPDF, filename: string): void {
  const out = pdf.output('bloburl');
  const url = typeof out === 'string' ? out : out instanceof URL ? out.href : String(out);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => window.URL.revokeObjectURL(url), 1500);
}

function depsBridge(deps: PaymentPdfDeps) {
  return {
    addLogoToPdf: deps.addLogoToPdf,
    formatMoney: (n: number) => money(n),
  };
}

export function buildPaymentReceiptPdf(data: PaymentReceiptPdfData, deps: PaymentPdfDeps): jsPDF {
  const paid = moneyNum(data.amountPaid);
  const lines: CommercialDocLine[] = [
    {
      itemName: `Payment received (${textOrDash(data.paymentForm)})`,
      description: [
        data.status ? `Status: ${data.status}` : '',
        data.visitNumber != null ? `Visit ${data.visitNumber}` : '',
        data.clientFileNo ? `File ${data.clientFileNo}` : '',
      ]
        .filter(Boolean)
        .join(' · ') || undefined,
      unitPrice: paid,
      quantity: 1,
      lineTotal: paid,
    },
  ];

  const doc: CommercialDocData = {
    docType: 'receipt',
    docNo: textOrDash(data.receiptNo),
    dateLabel: textOrDash(data.dateOfPayment),
    timeLabel: textOrDash(data.timeOfPayment),
    facilityName: data.facilityName,
    facilityAddress: data.facilityAddress,
    facilityContact: data.facilityContactLine,
    clientName: data.clientName,
    referenceLabel: 'Received by',
    referenceValue: textOrDash(data.receivedBy || data.paidBy),
    paymentMethod: textOrDash(data.paymentForm),
    paymentDetails: [
      data.invoiceTotal != null ? `Invoice total: ${money(data.invoiceTotal)}` : '',
      data.invoiceAmountPaid != null ? `Total paid: ${money(data.invoiceAmountPaid)}` : '',
      data.balanceDue != null ? `Balance due: ${money(data.balanceDue)}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    notes: data.notes,
    lines,
    subtotal: paid,
    total: paid,
    amountReceived: paid,
    changeDue: 0,
  };

  return buildCommercialDocumentPdf(doc, depsBridge(deps));
}

export function buildPaymentStatementPdf(data: PaymentStatementPdfData, deps: PaymentPdfDeps): jsPDF {
  const rows = data.rows || [];
  const lines: CommercialDocLine[] = rows.length
    ? rows.map((row) => {
        const amt = moneyNum(row.amountPaid);
        return {
          itemName: `Payment · ${textOrDash(row.paymentForm)}`,
          description: [row.dateOfPayment, row.timeOfPayment, row.status, row.notes]
            .filter((x) => x != null && String(x).trim())
            .join(' · '),
          unitPrice: amt,
          quantity: 1,
          lineTotal: amt,
        };
      })
    : [
        {
          itemName: 'No payment records for this visit',
          unitPrice: 0,
          quantity: 0,
          lineTotal: 0,
        },
      ];

  const total = moneyNum(data.totalAmount ?? data.subtotal);
  const doc: CommercialDocData = {
    docType: 'sales_invoice',
    docNo: data.visitNumber != null ? String(data.visitNumber) : 'statement',
    dateLabel: textOrDash(data.visitDate) || new Date().toLocaleDateString(),
    facilityName: data.facilityName,
    facilityAddress: data.facilityAddress,
    facilityContact: data.facilityContactLine,
    clientName: data.clientName,
    clientAddress: data.clientFileNo ? `File No: ${data.clientFileNo}` : undefined,
    referenceLabel: 'Visit',
    referenceValue: textOrDash(data.visitNumber),
    paymentMethod: 'Statement of payments',
    paymentDetails:
      data.balanceDue != null ? `Balance due: ${money(data.balanceDue)}` : undefined,
    lines,
    subtotal: moneyNum(data.subtotal ?? total),
    discount: moneyNum(data.discount) || undefined,
    tax: moneyNum(data.tax) || undefined,
    total,
    amountReceived: moneyNum(data.amountPaid) || undefined,
  };

  return buildCommercialDocumentPdf(doc, depsBridge(deps));
}

export function downloadPaymentReceiptPdf(data: PaymentReceiptPdfData, deps: PaymentPdfDeps): void {
  const pdf = buildPaymentReceiptPdf(data, deps);
  downloadPdf(pdf, commercialDocFilename('receipt', data.receiptNo || 'payment'));
}

export function downloadPaymentStatementPdf(data: PaymentStatementPdfData, deps: PaymentPdfDeps): void {
  const pdf = buildPaymentStatementPdf(data, deps);
  const visit = data.visitNumber != null ? String(data.visitNumber) : 'visit';
  downloadPdf(pdf, commercialDocFilename('sales_invoice', visit));
}
