import jsPDF from 'jspdf';
import { formatPharmacyMoney, PharmacyReceiptLine } from './pharmacy-prescription-sale.util';
import {
  buildCommercialDocumentPdf,
  commercialDocFilename,
  CommercialDocType,
  mapSaleToCommercialDoc,
} from './commercial-document-pdf.util';

export interface PharmacyReceiptPdfData {
  saleNo: string;
  saleDateLabel: string;
  saleTimeLabel: string;
  facilityName: string;
  facilityAddress?: string;
  facilityContact?: string;
  clientName?: string;
  receivedBy: string;
  paymentMethod: string;
  notes: string;
  includePrescribing: boolean;
  /** Shared commercial template title */
  docType?: CommercialDocType;
  lines: PharmacyReceiptLine[];
  subtotal: number;
  amountReceived: number;
  changeDue: number;
  thankYouMessage?: string;
  paymentTerms?: string;
}

export interface PharmacyReceiptPdfDeps {
  addLogoToPdf: (pdf: jsPDF, x: number, y: number, w: number, h: number) => boolean;
}

export function pharmacyReceiptPdfFilename(saleNo: string | undefined, docType: CommercialDocType = 'receipt'): string {
  return commercialDocFilename(docType, String(saleNo ?? 'rx'));
}

export function pharmacyReceiptPdfBlobUrl(pdf: jsPDF): string {
  const out = pdf.output('bloburl');
  if (typeof out === 'string') {
    return out;
  }
  if (out instanceof URL) {
    return out.href;
  }
  return String(out);
}

/** Build receipt / invoice / quotation PDF using the shared commercial template. */
export function buildPharmacyReceiptPdf(
  r: PharmacyReceiptPdfData,
  deps: PharmacyReceiptPdfDeps
): jsPDF {
  const docType: CommercialDocType = r.docType || 'receipt';
  const mapped = mapSaleToCommercialDoc({
    docType,
    saleNo: r.saleNo,
    saleDateLabel: r.saleDateLabel,
    saleTimeLabel: r.saleTimeLabel,
    facilityName: r.facilityName,
    facilityAddress: r.facilityAddress,
    facilityContact: r.facilityContact,
    clientName: r.clientName,
    receivedBy: r.receivedBy,
    paymentMethod: r.paymentMethod,
    notes: r.notes,
    thankYouMessage: r.thankYouMessage,
    paymentTerms: r.paymentTerms,
    lines: r.lines.map((l) => ({
      itemName: l.itemName,
      dosage: r.includePrescribing ? l.dosage : undefined,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      given: l.given,
    })),
    subtotal: r.subtotal,
    amountReceived: r.amountReceived,
    changeDue: r.changeDue,
  });

  return buildCommercialDocumentPdf(mapped, {
    addLogoToPdf: deps.addLogoToPdf,
    formatMoney: formatPharmacyMoney,
  });
}
