import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import * as XLSX from 'xlsx';

export interface GroupInvoiceVisitLine {
  label: string;
  amount: number | null;
}

export interface GroupInvoiceVisitBlock {
  visitDate: string;
  clientId: string;
  clientName: string;
  age: string;
  sex: string;
  diagnosis: string;
  discount: number;
  visitTotal: number;
  lines: GroupInvoiceVisitLine[];
}

export interface GroupMedicalInvoiceExportInput {
  facilityName: string;
  groupName: string;
  periodLabel: string;
  exportDate: Date;
  grandTotal: number;
  visits: GroupInvoiceVisitBlock[];
}

const INVOICE_COLUMNS = [
  'DATE',
  'ID',
  'NAME',
  'AGE',
  'SEX',
  'DIAGNOSIS',
  'TREATMENT/PROCEDURE',
  'AMOUNT',
] as const;

function cellText(value: unknown): string {
  if (value == null) {
    return '';
  }
  return String(value).trim();
}

function invoiceText(text: string, bold = false): TextRun {
  return new TextRun({ text: cellText(text), bold, size: 20, font: 'Calibri' });
}

function invoiceParagraph(text: string, bold = false): Paragraph {
  return new Paragraph({ children: [invoiceText(text, bold)] });
}

function invoiceTableCell(text: string, bold = false): TableCell {
  return new TableCell({
    width: { size: 12.5, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [invoiceText(text, bold)] })],
  });
}

function formatShortDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '';
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const [y, m, day] = raw.slice(0, 10).split('-');
      return `${day}/${m}/${String(y).slice(-2)}`;
    }
    return raw;
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function formatExportDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatInvoiceAmount(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) {
    return '';
  }
  return `${Math.round(n).toLocaleString('en-US')}/=`;
}

function formatTitleCaseWords(value: unknown): string {
  const raw = cellText(value);
  if (!raw) {
    return '';
  }
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^\d/.test(word) || /^\d+$/.test(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function formatInvoiceAgeDisplay(value: string | null | undefined): string {
  const raw = cellText(value);
  if (!raw) {
    return '';
  }
  const match = raw.match(/^(\d+)([A-Za-z]+)$/);
  if (match) {
    const suffix = match[2];
    return `${match[1]}${suffix.charAt(0).toUpperCase()}${suffix.slice(1).toLowerCase()}`;
  }
  return formatTitleCaseWords(raw);
}

export function formatInvoiceAge(age: number | string | null | undefined): string {
  if (age == null || age === '') {
    return '';
  }
  const n = Number(age);
  if (Number.isFinite(n)) {
    return `${Math.round(n)}Yrs`;
  }
  const raw = String(age).trim();
  return /yrs?$/i.test(raw) ? raw : `${raw}Yrs`;
}

export function formatInvoiceSex(gender: string | null | undefined): string {
  const g = cellText(gender);
  if (!g) {
    return '';
  }
  return g.toLowerCase();
}

export function buildTreatmentPrescriptionLabel(row: any): string {
  const name = cellText(row?.itemName || row?.title || 'Treatment');
  const parts = [
    row?.amountPerFrequencyValue,
    row?.amountPerFrequencyUnit,
    row?.frequencyValue ? `${row.frequencyValue} X` : '',
    row?.frequencyUnit,
    row?.durationValue ? `FOR ${row.durationValue}` : '',
    row?.durationUnit,
    row?.instructions,
    row?.route,
  ]
    .filter((part) => part != null && String(part).trim() !== '')
    .map((part) => String(part).trim());
  const rx = parts.join(' ').trim();
  return rx ? `${name} ${rx}`.trim() : name;
}

export function buildProcedureLabel(row: any): string {
  return cellText(row?.procedureRequestedName || row?.procedureName || 'Procedure');
}

export function lineItemAmount(row: any): number {
  const total = Number(row?.totalAmount ?? row?.totalSell ?? row?.provisionalTotalAmount);
  if (Number.isFinite(total) && total > 0) {
    return total;
  }
  const qty = Number(row?.quantity ?? 1);
  const unit = Number(row?.unitSellingPrice ?? row?.sellingPrice ?? 0);
  if (Number.isFinite(qty) && Number.isFinite(unit)) {
    return qty * unit;
  }
  return 0;
}

export function getVisitDiscount(visit: any): number {
  const invoices = Array.isArray(visit?.invoice) ? visit.invoice : [];
  const discount = Number(invoices[0]?.discount ?? visit?.discount ?? 0);
  return Number.isFinite(discount) ? discount : 0;
}

export function extractClientIdFromSecondName(secondName: string | null | undefined): string {
  const raw = cellText(secondName);
  if (!raw) {
    return '';
  }
  const matches = raw.match(/\d+/g);
  return matches?.length ? matches[matches.length - 1] : '';
}

export function resolveInvoiceClientId(client: any, visit?: any): string {
  const fromSecondName = extractClientIdFromSecondName(
    client?.clientSecondName ?? client?.secondName ?? client?.lastName
  );
  if (fromSecondName) {
    return fromSecondName;
  }
  const fileNo = cellText(client?.clientFileNo ?? client?.fileNo);
  if (fileNo) {
    return fileNo;
  }
  const visitName = cellText(visit?.clientName);
  if (visitName) {
    const parts = visitName.split(/\s+/);
    if (parts.length > 1) {
      const fromVisitSecond = extractClientIdFromSecondName(parts[parts.length - 1]);
      if (fromVisitSecond) {
        return fromVisitSecond;
      }
    }
  }
  const id = client?.id ?? visit?.clientId;
  return id != null ? String(id) : '';
}

export function buildVisitLineItems(visit: any, treatments: any[]): GroupInvoiceVisitLine[] {
  const lines: GroupInvoiceVisitLine[] = [];
  const procedures = Array.isArray(visit?.proceduresRequested) ? visit.proceduresRequested : [];
  for (const proc of procedures) {
    lines.push({
      label: buildProcedureLabel(proc),
      amount: lineItemAmount(proc),
    });
  }
  for (const tx of Array.isArray(treatments) ? treatments : []) {
    lines.push({
      label: buildTreatmentPrescriptionLabel(tx),
      amount: lineItemAmount(tx),
    });
  }
  if (!lines.length) {
    lines.push({ label: 'Medical bills', amount: Number(visit?.totalAmount ?? 0) || null });
  }
  return lines;
}

export function buildPeriodLabel(fromDate?: string, toDate?: string): string {
  const pick = (fromDate || toDate || '').trim();
  if (!pick) {
    const now = new Date();
    return now.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  }
  const d = new Date(pick);
  if (Number.isNaN(d.getTime())) {
    return pick.toUpperCase();
  }
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

export function sortVisitsLatestFirst(visits: any[]): any[] {
  return [...visits].sort((a, b) => {
    const da = `${a?.visitDate ?? ''}T${a?.visitTime ?? ''}`;
    const db = `${b?.visitDate ?? ''}T${b?.visitTime ?? ''}`;
    const cmp = db.localeCompare(da);
    if (cmp !== 0) {
      return cmp;
    }
    return Number(b?.id ?? 0) - Number(a?.id ?? 0);
  });
}

function buildVisitTable(block: GroupInvoiceVisitBlock): Table {
  const headerRow = new TableRow({
    children: INVOICE_COLUMNS.map((h) => invoiceTableCell(h, true)),
  });

  const clientCols = [
    formatShortDate(block.visitDate),
    block.clientId,
    formatTitleCaseWords(block.clientName),
    formatInvoiceAgeDisplay(block.age),
    formatTitleCaseWords(block.sex),
    formatTitleCaseWords(block.diagnosis),
  ];

  const rows: TableRow[] = [headerRow];

  const lineRows = block.lines.length ? block.lines : [{ label: 'Medical bills', amount: block.visitTotal }];
  lineRows.forEach((line, index) => {
    const showClient = index === 0;
    const cols = showClient ? clientCols : ['', '', '', '', '', ''];
    rows.push(
      new TableRow({
        children: [
          invoiceTableCell(cols[0]),
          invoiceTableCell(cols[1]),
          invoiceTableCell(cols[2]),
          invoiceTableCell(cols[3]),
          invoiceTableCell(cols[4]),
          invoiceTableCell(cols[5]),
          invoiceTableCell(formatTitleCaseWords(line.label)),
          invoiceTableCell(formatInvoiceAmount(line.amount)),
        ],
      })
    );
  });

  rows.push(
    new TableRow({
      children: [
        invoiceTableCell(clientCols[0]),
        invoiceTableCell(clientCols[1]),
        invoiceTableCell(clientCols[2]),
        invoiceTableCell(clientCols[3]),
        invoiceTableCell(clientCols[4]),
        invoiceTableCell(clientCols[5]),
        invoiceTableCell('Discount', true),
        invoiceTableCell(block.discount > 0 ? String(Math.round(block.discount)) : ''),
      ],
    })
  );

  rows.push(
    new TableRow({
      children: [
        invoiceTableCell(clientCols[0]),
        invoiceTableCell(clientCols[1]),
        invoiceTableCell(clientCols[2]),
        invoiceTableCell(clientCols[3]),
        invoiceTableCell(clientCols[4]),
        invoiceTableCell(clientCols[5]),
        invoiceTableCell('Total Amount:', true),
        invoiceTableCell(formatInvoiceAmount(block.visitTotal), true),
      ],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

function buildGrandTotalTable(grandTotal: number): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [invoiceText('')] })],
          }),
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [invoiceText('Grand Total Bill:', true)] })],
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [invoiceText(formatInvoiceAmount(grandTotal), true)] }),
            ],
          }),
        ],
      }),
    ],
  });
}

export async function buildGroupMedicalInvoiceDocx(input: GroupMedicalInvoiceExportInput): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    invoiceParagraph(`INVOICE FOR MEDICAL BILLS ${input.periodLabel}`, true),
    invoiceParagraph(
      `FROM: Hospital/Health Center Name: ${input.facilityName}                                 DATE: ${formatExportDate(input.exportDate)}`
    ),
    invoiceParagraph(
      `TO: ${input.groupName}                                                            Total: ${formatInvoiceAmount(input.grandTotal)}`
    ),
    new Paragraph({ text: '' }),
  ];

  input.visits.forEach((visit, index) => {
    children.push(buildVisitTable(visit));
    if (index < input.visits.length - 1) {
      children.push(new Paragraph({ text: '' }));
    }
  });

  children.push(new Paragraph({ text: '' }));
  children.push(buildGrandTotalTable(input.grandTotal));
  children.push(
    new Paragraph({
      children: [
        invoiceText(
          'Prepared By: Finance Officer: Claire Ainomugisha                                         Signature/Stamp'
        ),
      ],
    })
  );

  const doc = new Document({
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function exportVisitsTableToExcel(rows: Record<string, unknown>[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Visits');
  XLSX.writeFile(wb, filename);
}

export function sanitizeFilenamePart(value: string): string {
  return value.replace(/[<>:"/\\|?*]+/g, '_').replace(/\s+/g, '_').slice(0, 80) || 'export';
}
