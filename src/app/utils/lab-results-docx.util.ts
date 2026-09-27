import {
  Document as DocxDocument,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  CbcResultField,
  CBC_RESULT_FIELDS,
  getCbcFieldsForClient,
} from './cbc-reference-ranges.util';

export type { CbcResultField } from './cbc-reference-ranges.util';
export { CBC_RESULT_FIELDS, getCbcFieldsForClient } from './cbc-reference-ranges.util';

/** Minimal API surface used by fetchProcedureReportForPdf$ */
export interface LabResultsDocxApi {
  getLabReportByRequestId(id: number): Observable<any>;
  getUrinalysisReportByRequestId(id: number): Observable<any>;
  getCbcReportByRequestId(id: number): Observable<any>;
  getParasitologyStoolReportByRequestId(id: number): Observable<any>;
  getGeneralLabReportByRequestId(id: number): Observable<any>;
}

export type ProcedureReportKind =
  | 'mrdt'
  | 'urinalysis'
  | 'cbc'
  | 'parasitology'
  | 'general';

export interface LabProcedureReportRow {
  item: any;
  kind: ProcedureReportKind;
  report: any;
}

export interface BuildAllLabResultsDocxOptions {
  clientName: string;
  visitId: string | number;
  visitDate?: string | Date | null;
  /** Procedure items with reports already fetched */
  labProcedureRows: LabProcedureReportRow[];
  clientAge?: string | number | null;
  clientDateOfBirth?: string | Date | null;
  clientGender?: string | null;
}

/** Word `w:sz` half-points; default body ~11pt (22). Lab export uses slightly smaller type. */
export const DOCX_LAB_FONT_BODY_HALF_PT = 20;
export const DOCX_LAB_FONT_SECTION_HALF_PT = 22;

export function isUltrasoundScanCategoryProcedure(item: any): boolean {
  if (!item) {
    return false;
  }
  const cat = (item.category || item.procedureCategory || item.serviceCategory || '')
    .toString()
    .toLowerCase();
  const name = (item.procedureRequestedName || '').toString().toLowerCase();
  if (cat.includes('ultrasound')) {
    return true;
  }
  if (cat.includes('ultrasound scan')) {
    return true;
  }
  if (name.includes('ultrasound') && name.includes('scan')) {
    return true;
  }
  return false;
}

/** Procedure display name: lowercase, trim, single spaces (routing lab PDF/Word + modal). */
export function normalizeProcedureRequestedNameForLabRouting(item: any): string {
  return (item?.procedureRequestedName || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function isUrinalysisProcedureName(requestName: string): boolean {
  return requestName === 'urinalysis' || requestName.includes('urinalysis');
}

export function getProcedureReportKindForPdf(item: any): ProcedureReportKind {
  const category = (item?.category || '').toString().toLowerCase().trim();
  const requestName = normalizeProcedureRequestedNameForLabRouting(item);
  if (category === 'malaria test') {
    return 'mrdt';
  }
  if (isUrinalysisProcedureName(requestName)) {
    return 'urinalysis';
  }
  if (requestName === 'cbc' || requestName.includes('cbc')) {
    return 'cbc';
  }
  if (
    requestName === 'parasitology stool' ||
    requestName === 'parasitologystool' ||
    requestName.includes('parasitology stool')
  ) {
    return 'parasitology';
  }
  return 'general';
}

function isMchOrMaternityCategoryName(name: string): boolean {
  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized === 'maternity' ||
    normalized === 'mch' ||
    normalized.includes('maternity') ||
    normalized.includes('mch')
  );
}

/** True when a requested procedure belongs to MCH / maternity service categories. */
export function isMaternityProcedureRequest(r: any): boolean {
  const vals = [
    r?.categoryParent,
    r?.categoryParentName,
    r?.procedureParentCategory,
    r?.parentCategory,
    r?.parentCategoryName,
    r?.parentPage,
    r?.procedure?.parentCategory,
    r?.procedure?.parentCategoryName,
    r?.procedure?.category?.parent?.name,
    r?.procedure?.category,
    r?.procedureCategory,
    r?.serviceParentCategory,
    r?.parentProcedureCategory,
    r?.category,
    r?.categoryName,
  ];
  if (vals.some((v) => isMchOrMaternityCategoryName(String(v || '')))) {
    return true;
  }
  const joined = [
    r?.procedureParentCategoryName,
    r?.parentCategoryName,
    r?.procedure?.categoryName,
    r?.procedureRequestedName,
    r?.exam,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return (
    joined.includes('maternity') ||
    joined.includes('mch') ||
    joined.includes('antenatal') ||
    joined.includes('postnatal') ||
    joined.includes('obstetric')
  );
}

/** Structured antenatal/postnatal form; other maternity services use the general report layout. */
export function usesAntenatalStructuredMchReport(item: any): boolean {
  const name = normalizeProcedureRequestedNameForLabRouting(item);
  const parent = String(item?.categoryParent || item?.parentCategory || '').toLowerCase();
  if (parent === 'maternity' || parent === 'mch') {
    const keywords = ['antenatal', 'postnatal', 'anc', 'obstetric', 'maternity visit'];
    if (keywords.some((k) => name.includes(k))) {
      return true;
    }
  }
  return ['antenatal', 'postnatal', 'anc visit', 'maternity visit'].some((k) => name.includes(k));
}

/** Non-imaging, non-specialized-lab procedures use GeneralLabReport. */
export function shouldUseGeneralLabReport(item: any): boolean {
  if (!item) {
    return false;
  }
  const category = (item.category || '').toString().toLowerCase();
  if (category === 'imaging' || isUltrasoundScanCategoryProcedure(item)) {
    return false;
  }
  return getProcedureReportKindForPdf(item) === 'general';
}

/** True only when procedure `category` is lab test (matches app `labTest` procedures). */
export function isLabTestCategoryProcedureForPdf(item: any): boolean {
  if (!item) {
    return false;
  }
  const cat = (item.category || '').toString().toLowerCase().replace(/\s+/g, '');
  return cat === 'labtest';
}

/**
 * Rows for “Lab results” Word export: lab-test invoice table plus matching rows from the
 * “other procedures” services table. De-duplicates by `id`.
 */
export function filterProceduresForCombinedLabDocxExport(
  labRows: any[] | null | undefined,
  otherRows: any[] | null | undefined
): any[] {
  const fromLab = (labRows || []).filter(
    (row) => !isUltrasoundScanCategoryProcedure(row)
  );
  const fromOther = (otherRows || []).filter(
    (row) =>
      !isUltrasoundScanCategoryProcedure(row) &&
      (isLabTestCategoryProcedureForPdf(row) ||
        getProcedureReportKindForPdf(row) !== 'general')
  );
  const seenIds = new Set<string | number>();
  const out: any[] = [];
  for (const row of fromLab) {
    const id = row?.id;
    if (id != null) {
      if (seenIds.has(id)) {
        continue;
      }
      seenIds.add(id);
    }
    out.push(row);
  }
  for (const row of fromOther) {
    const id = row?.id;
    if (id != null) {
      if (seenIds.has(id)) {
        continue;
      }
      seenIds.add(id);
    }
    out.push(row);
  }
  return out;
}

export function fetchProcedureReportForPdf$(
  api: LabResultsDocxApi,
  item: any
): Observable<LabProcedureReportRow> {
  const kind = getProcedureReportKindForPdf(item);
  let obs: Observable<any>;
  switch (kind) {
    case 'mrdt':
      obs = api.getLabReportByRequestId(item.id);
      break;
    case 'urinalysis':
      obs = api.getUrinalysisReportByRequestId(item.id);
      break;
    case 'cbc':
      obs = api.getCbcReportByRequestId(item.id);
      break;
    case 'parasitology':
      obs = api.getParasitologyStoolReportByRequestId(item.id);
      break;
    default:
      obs = api.getGeneralLabReportByRequestId(item.id);
  }
  return obs.pipe(
    map((res: any) => ({
      item,
      kind,
      report: res?.data ?? res ?? {},
    })),
    catchError(() => of({ item, kind, report: null as any }))
  );
}

export function pdfCellStr(v: any): string {
  if (v == null) {
    return '';
  }
  const s = String(v).trim();
  return s === '' ? '' : s;
}

export function formatVisitDateForLabDocx(visitDate: string | Date | null | undefined): string {
  if (visitDate == null || visitDate === '') {
    return '–';
  }
  const s = typeof visitDate === 'string' ? visitDate : String(visitDate);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function parseCbcRangeForView(ref: string): { low: number; high: number } | null {
  if (!ref) {
    return null;
  }
  const match = String(ref).match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  const low = Number(match[1]);
  const high = Number(match[2]);
  if (Number.isNaN(low) || Number.isNaN(high)) {
    return null;
  }
  return { low, high };
}

function parseCbcResultValueForView(value: any): number | null {
  if (value == null || value === '') {
    return null;
  }
  const normalized = String(value).replace(/,/g, '').trim();
  const numeric = Number(normalized);
  return Number.isNaN(numeric) ? null : numeric;
}

export function buildCbcInterpretationForView(resultValue: any, refRange: string): string {
  const parsedValue = parseCbcResultValueForView(resultValue);
  const parsedRange = parseCbcRangeForView(refRange);
  if (parsedValue == null || !parsedRange) {
    return '';
  }
  if (parsedValue < parsedRange.low) {
    return 'Low';
  }
  if (parsedValue > parsedRange.high) {
    return 'High';
  }
  return 'Normal';
}

/** CBC interpretation row for export built from an API report object. */
export function buildCbcInterpretationMapFromReport(
  report: any,
  clientAge?: unknown,
  clientDateOfBirth?: unknown,
  clientGender?: unknown
): Record<string, string> {
  const out: Record<string, string> = {};
  const rep = report && typeof report === 'object' ? report : {};
  const fields = getCbcFieldsForClient(clientAge, clientDateOfBirth, clientGender);
  for (const field of fields) {
    const raw =
      rep[field.key] ??
      (field.key === 'lymphPercent'
        ? rep.lymphPct
        : field.key === 'midPercent'
          ? rep.midPct
          : field.key === 'granPercent'
            ? rep.granPct
            : field.key === 'rdwCv'
              ? rep.rdwCV
              : field.key === 'rdwSd'
                ? rep.rdwSD
                : undefined);
    out[field.key] = buildCbcInterpretationForView(raw, field.ref);
  }
  return out;
}

export function getCbcTransposeDataForLabExport(
  report: any,
  procedureLabel: string,
  clientAge?: unknown,
  clientDateOfBirth?: unknown,
  clientGender?: unknown
): { title: string; paramHeaders: string[]; rowLabels: string[]; matrix: string[][] } {
  const rep = report && typeof report === 'object' ? report : {};
  const fields = getCbcFieldsForClient(clientAge, clientDateOfBirth, clientGender);
  const interp = buildCbcInterpretationMapFromReport(
    rep,
    clientAge,
    clientDateOfBirth,
    clientGender
  );
  const headers = fields.map((f) => f.label);
  const dash = '–';
  const matrix = [
    fields.map((f) => pdfCellStr(rep[f.key])),
    fields.map((f) => f.unit),
    fields.map((f) => f.ref),
    fields.map((f) => pdfCellStr(interp[f.key]) || dash),
  ];
  const title = `${procedureLabel.toUpperCase()} — CBC`;
  return {
    title,
    paramHeaders: headers,
    rowLabels: ['Result', 'Units', 'Ref ranges', 'Interpretation'],
    matrix,
  };
}

export function getUrinalysisTransposeDataForLabExport(
  report: any,
  procedureLabel: string
): { title: string; paramHeaders: string[]; rowLabels: string[]; matrix: string[][] } {
  const r = report && typeof report === 'object' ? report : {};
  const dash = '–';
  const pairs: Array<[string, string]> = [
    ['pH', r.ph],
    ['SG', r.sg],
    ['Protein', r.protein],
    ['Glucose', r.glucose],
    ['Ketones', r.ketones],
    ['Blood', r.blood],
    ['Bilirubin', r.bilirubin],
    ['Urobilinogen', r.urobilinogen],
    ['Nitrite', r.nitrite],
    ['Leukocyte E', r.leukocyteE || r.leukocyte],
    ['Epithelial cells', r.epithelialCells],
    ['pus cells', r.pusCellsWbcs || r.pusCells],
    ['Casts', r.casts],
    ['Red cells', r.redCells],
    ['Crystals', r.crystals],
    ['others', r.others || r.microscopicOthers],
    ['Color', r.color],
    ['Appear', r.appearance],
    ['Volume', r.volume],
  ];
  const headers = pairs.map((p) => p[0]);
  const vals = pairs.map((p) => pdfCellStr(p[1]));
  const matrix = [vals, headers.map(() => dash), headers.map(() => dash), headers.map(() => dash)];
  const title = `${procedureLabel.toUpperCase()} — URINALYSIS`;
  return {
    title,
    paramHeaders: headers,
    rowLabels: ['Result', 'Units', 'ref:', 'Interprt:'],
    matrix,
  };
}

export function getParasitologyTransposeDataForLabExport(
  report: any,
  procedureLabel: string
): { title: string; paramHeaders: string[]; rowLabels: string[]; matrix: string[][] } {
  const r = report && typeof report === 'object' ? report : {};
  const dash = '–';
  const pairs: Array<[string, string]> = [
    ['Ova', r.ova],
    ['Cysts', r.cysts],
    ['Larvae', r.larvae],
    ['Color', r.color],
    ['Consistency', r.consistency],
    ['Blood', r.blood],
    ['Mucus', r.mucus],
    ['Visible parasites', r.visibleParasites],
    ['Others', r.others],
  ];
  const headers = pairs.map((p) => p[0]);
  const vals = pairs.map((p) => pdfCellStr(p[1]));
  const matrix = [vals, headers.map(() => dash), headers.map(() => dash), headers.map(() => dash)];
  const title = `${procedureLabel.toUpperCase()} — PARASITOLOGY STOOL`;
  return {
    title,
    paramHeaders: headers,
    rowLabels: ['Result', 'Units', 'Ref ranges', 'Interpretation'],
    matrix,
  };
}

export function docxCellText(v: any): string {
  return v == null || String(v).trim() === '' ? '–' : String(v);
}

/** In-cell padding (DXA = twentieths of a point): small top / left emphasis. */
export function docxLabTableCellMargins() {
  return {
    marginUnitType: WidthType.DXA,
    top: 48,
    left: 72,
    bottom: 36,
    right: 48,
  } as const;
}

export function docxLabTableCell(children: readonly (Paragraph | Table)[]): TableCell {
  return new TableCell({
    margins: docxLabTableCellMargins(),
    children,
  });
}

export function docxLabTextRun(
  text: string,
  opts: { bold?: boolean; italics?: boolean; size?: number } = {}
): TextRun {
  return new TextRun({
    text,
    size: opts.size ?? DOCX_LAB_FONT_BODY_HALF_PT,
    bold: opts.bold,
    italics: opts.italics,
  });
}

export function pushDocxTransposedLabTable(
  children: unknown[],
  title: string,
  paramHeaders: string[],
  rowLabels: string[],
  matrix: string[][],
  overallTitleLine?: string | null
): void {
  const ot =
    overallTitleLine != null && String(overallTitleLine).trim() !== ''
      ? String(overallTitleLine).trim()
      : '';
  const titleRuns: TextRun[] = [
    docxLabTextRun(title, { bold: true, size: DOCX_LAB_FONT_SECTION_HALF_PT }),
  ];
  if (ot !== '') {
    titleRuns.push(
      docxLabTextRun(`     Overall title: ${ot}`, {
        italics: true,
        size: DOCX_LAB_FONT_SECTION_HALF_PT,
      })
    );
  }
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: titleRuns,
    })
  );
  const headerRow = new TableRow({
    children: [
      docxLabTableCell([new Paragraph('')]),
      ...paramHeaders.map((h) =>
        docxLabTableCell([
          new Paragraph({
            children: [docxLabTextRun(docxCellText(h), { bold: true })],
          }),
        ])
      ),
    ],
  });
  const bodyRows = rowLabels.map((label, r) => {
    return new TableRow({
      children: [
        docxLabTableCell([
          new Paragraph({
            children: [docxLabTextRun(label, { bold: true })],
          }),
        ]),
        ...paramHeaders.map((_, c) =>
          docxLabTableCell([
            new Paragraph({
              children: [docxLabTextRun(docxCellText(matrix[r]?.[c]))],
            }),
          ])
        ),
      ],
    });
  });
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...bodyRows],
    })
  );
  children.push(new Paragraph({ text: '' }));
}

export function pushDocxFourColumnGeneralTable(
  children: unknown[],
  rows: Array<{ procedure: string; findings: string; notes: string; recommendations: string }>
): void {
  if (!rows.length) {
    return;
  }
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        docxLabTextRun('GENERAL LAB & RELATED REPORTS', {
          bold: true,
          size: DOCX_LAB_FONT_SECTION_HALF_PT,
        }),
      ],
    })
  );
  const hdrs = ['Procedure', 'Results / findings', 'Conclusion / notes', 'Recommendations'];
  const tableRows: TableRow[] = [
    new TableRow({
      children: hdrs.map((h) =>
        docxLabTableCell([
          new Paragraph({
            children: [docxLabTextRun(h, { bold: true })],
          }),
        ])
      ),
    }),
  ];
  for (const r of rows) {
    tableRows.push(
      new TableRow({
        children: [
          docxLabTableCell([
            new Paragraph({ children: [docxLabTextRun(docxCellText(r.procedure))] }),
          ]),
          docxLabTableCell([
            new Paragraph({ children: [docxLabTextRun(docxCellText(r.findings))] }),
          ]),
          docxLabTableCell([
            new Paragraph({ children: [docxLabTextRun(docxCellText(r.notes))] }),
          ]),
          docxLabTableCell([
            new Paragraph({
              children: [docxLabTextRun(docxCellText(r.recommendations))],
            }),
          ]),
        ],
      })
    );
  }
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    })
  );
  children.push(new Paragraph({ text: '' }));
}

/**
 * Builds and downloads one landscape Word (.docx) with all lab tests for the visit
 * (same layout as consultations-center `exportAllLabResultsDocx`).
 * Caller is responsible for filtering procedures and fetching reports first.
 */
export async function buildAndDownloadAllLabResultsDocx(
  options: BuildAllLabResultsDocxOptions
): Promise<void> {
  const {
    clientName,
    visitId,
    visitDate,
    labProcedureRows,
    clientAge,
    clientDateOfBirth,
    clientGender,
  } = options;
  const children: unknown[] = [];
  const nm = (clientName || '').toString().trim();
  children.push(
    new Paragraph({
      children: [
        docxLabTextRun(
          `Client: ${nm || '–'}  |  Visit ID: ${visitId}  |  Visit date: ${formatVisitDateForLabDocx(visitDate)}`
        ),
      ],
    })
  );

  const generalRows: Array<{
    procedure: string;
    findings: string;
    notes: string;
    recommendations: string;
  }> = [];

  for (const entry of labProcedureRows) {
    const procName = (entry.item?.procedureRequestedName || 'Lab test').toString();
    const rep = entry.report && typeof entry.report === 'object' ? entry.report : {};
    const titleLine = pdfCellStr(rep.labReportTitle);

    if (entry.kind === 'cbc') {
      const d = getCbcTransposeDataForLabExport(
        rep,
        procName,
        clientAge,
        clientDateOfBirth,
        clientGender
      );
      pushDocxTransposedLabTable(children, d.title, d.paramHeaders, d.rowLabels, d.matrix);
      if (titleLine) {
        children.push(
          new Paragraph({
            children: [docxLabTextRun(`Overall title: ${titleLine}`, { italics: true })],
          })
        );
      }
    } else if (entry.kind === 'urinalysis') {
      const d = getUrinalysisTransposeDataForLabExport(rep, procName);
      pushDocxTransposedLabTable(
        children,
        d.title,
        d.paramHeaders,
        d.rowLabels,
        d.matrix,
        titleLine || undefined
      );
    } else if (entry.kind === 'parasitology') {
      const d = getParasitologyTransposeDataForLabExport(rep, procName);
      pushDocxTransposedLabTable(children, d.title, d.paramHeaders, d.rowLabels, d.matrix);
      if (titleLine) {
        children.push(
          new Paragraph({
            children: [docxLabTextRun(`Overall title: ${titleLine}`, { italics: true })],
          })
        );
      }
    } else if (entry.kind === 'mrdt') {
      const parts: string[] = [];
      const bs = pdfCellStr(rep.bs);
      const md = pdfCellStr(rep.mrdt);
      const rs = pdfCellStr(rep.result || rep.report || rep.findings);
      if (bs) {
        parts.push(`BS: ${bs}`);
      }
      if (md) {
        parts.push(`MRDT: ${md}`);
      }
      if (rs) {
        parts.push(`Result: ${rs}`);
      }
      generalRows.push({
        procedure: procName,
        findings: parts.length ? parts.join('  |  ') : '–',
        notes: pdfCellStr(rep.notes),
        recommendations: pdfCellStr(rep.recommendation),
      });
    } else if (entry.kind === 'general') {
      generalRows.push({
        procedure: procName,
        findings: pdfCellStr(rep.result || rep.report || rep.findings),
        notes: pdfCellStr(rep.notes),
        recommendations: pdfCellStr(rep.recommendation),
      });
    }
  }

  pushDocxFourColumnGeneralTable(children, generalRows);

  const doc = new DocxDocument({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
            /* Twips (dxa): ~Word “Narrow” — 0.5" top/bottom, 0.25" left/right */
            margin: {
              top: 720,
              bottom: 720,
              left: 360,
              right: 360,
              header: 360,
              footer: 360,
              gutter: 0,
            },
          },
        },
        children: children as any,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lab-results-all-visit-${visitId}.docx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
