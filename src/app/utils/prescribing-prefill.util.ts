/** Standard dosage units for OTC / pharmacy prescribing dropdowns. */
import {
  parsePrescribingDosageJson,
} from '../config/stock-item-prescribing.config';

export const DOSAGE_UNIT_SELECT_OPTIONS: readonly string[] = [
  'mg',
  'g',
  'kg',
  'ml',
  'l',
  'iu',
  'tab(s)',
  'cap(s)',
];

/** Stock batch / stock item → treatment & OTC prescribing form fields. */
export interface PrescribingPrefillFields {
  amountPerFrequencyValue: number | null;
  amountPerFrequencyUnit: string;
  route: string;
}

/** Merge nested stock item fields onto the record used for dropdown selection. */
export function resolveStockPrescribingSource(record: any): Record<string, any> {
  if (!record) {
    return {};
  }
  const nested =
    record.stockItem ??
    record.consumableItems ??
    record.consumableItem ??
    record.item ??
    null;
  return nested ? { ...nested, ...record } : { ...record };
}

/** Map inventory prescribing strength unit title to a short dosage-unit label (mg, ml, tab(s), …). */
export function mapPrescribingUnitToDosageUnit(title: string): string {
  const raw = String(title ?? '').trim();
  if (!raw) {
    return '';
  }
  const t = raw.toLowerCase().replace(/\(s\)\s*$/i, '').trim();
  const exact = DOSAGE_UNIT_SELECT_OPTIONS.find((o) => o.toLowerCase() === t || o.toLowerCase() === raw.toLowerCase());
  if (exact) {
    return exact;
  }
  if (t.includes('tablet') || /\btab\b/.test(t)) {
    return 'tab(s)';
  }
  if (t.includes('capsule') || /\bcap\b/.test(t)) {
    return 'cap(s)';
  }
  if (t.includes('kilogram') || t === 'kg') {
    return 'kg';
  }
  if (t.includes('milligram') || /\bmg\b/.test(t) || t.endsWith('mg')) {
    return 'mg';
  }
  if (t.includes('millilit') || /\bml\b/.test(t) || t.endsWith('ml')) {
    return 'ml';
  }
  if (t.includes('liter') || t.includes('litre') || (t === 'l' && raw.length <= 2)) {
    return 'l';
  }
  if (t.includes('international unit') || /\biu\b/.test(t)) {
    return 'iu';
  }
  if (
    (t.includes('gram') && !t.includes('milligram') && !t.includes('kilogram')) ||
    (t === 'g' && raw.length <= 2)
  ) {
    return 'g';
  }
  return raw;
}

/** Prescribing strength unit title from stock item / batch (exact inventory label). */
export function isStandardDosageUnit(unit: string): boolean {
  const v = String(unit ?? '').trim().toLowerCase();
  if (!v) {
    return false;
  }
  return DOSAGE_UNIT_SELECT_OPTIONS.some((o) => o.toLowerCase() === v);
}

/** Map inventory unit label to a standard dropdown value when possible (e.g. Milligram → mg). */
export function normalizeDosageUnitForSelect(unit: string): string {
  const v = String(unit ?? '').trim();
  if (!v) {
    return '';
  }
  const match = DOSAGE_UNIT_SELECT_OPTIONS.find((o) => o.toLowerCase() === v.toLowerCase());
  if (match) {
    return match;
  }
  return mapPrescribingUnitToDosageUnit(v);
}

export function extractPrescribingStrengthUnitTitle(record: any): string {
  const src = resolveStockPrescribingSource(record);
  const abbrev =
    src['lastUnitOfPrescribingMeasureStrengthUnitAbbreviation'] ??
    src['prescribingStrengthUnitAbbreviation'] ??
    src['standardAbbreviation'] ??
    '';
  if (String(abbrev).trim()) {
    return String(abbrev).trim();
  }
  const raw =
    src['lastUnitOfPrescribingMeasureStrengthUnitTitle'] ??
    src['prescribingStrengthUnitTitle'] ??
    src['amountPerFrequencyUnit'] ??
    src['dosageUnit'] ??
    '';
  return String(raw).trim();
}

export function extractPrescribingPrefill(record: any): PrescribingPrefillFields {
  const src = resolveStockPrescribingSource(record);
  const dosageUnit = normalizeDosageUnitForSelect(extractPrescribingStrengthUnitTitle(record));
  const profiles = parsePrescribingDosageJson(
    src['prescribingDosageJson'] ?? record?.prescribingDosageJson
  );

  let amountPerFrequencyValue: number | null = null;
  for (const key of ['adult', 'pediatric', 'neonate', 'bodyWeight'] as const) {
    const row = profiles[key];
    if (row?.enabled && row.dose) {
      const n = Number(row.dose);
      if (Number.isFinite(n) && n > 0) {
        amountPerFrequencyValue = n;
        break;
      }
    }
  }
  const composition = src['totalCompositionValue'];
  if (amountPerFrequencyValue == null && composition != null && composition !== '') {
    const n = Number(composition);
    if (Number.isFinite(n)) {
      amountPerFrequencyValue = n;
    }
  }
  if (amountPerFrequencyValue == null) {
    const fallback = Number(src['lastUnitValue']);
    if (Number.isFinite(fallback) && fallback > 0) {
      amountPerFrequencyValue = fallback;
    }
  }

  const route =
    src['routeOfAdminTitle'] ??
    src['route'] ??
    src['routeOfAdministrationTitle'] ??
    src['routeOfAdminName'] ??
    src['selectedRouteOfAdminName'] ??
    '';

  return {
    amountPerFrequencyValue,
    amountPerFrequencyUnit: dosageUnit,
    route: String(route).trim(),
  };
}

export function applyPrescribingPrefillToTreatmentForm(
  form: {
    amountPerFrequencyValue?: number | string | null;
    amountPerFrequencyUnit?: string;
    route?: string;
  },
  record: any
): void {
  const prefill = extractPrescribingPrefill(record);
  if (prefill.amountPerFrequencyValue != null) {
    form.amountPerFrequencyValue = prefill.amountPerFrequencyValue;
  }
  if (prefill.amountPerFrequencyUnit) {
    form.amountPerFrequencyUnit = prefill.amountPerFrequencyUnit;
  }
  if (prefill.route) {
    form.route = prefill.route;
  }
}

/** True when a numeric prescribing field was entered (null, blank, and 0 are treated as empty). */
export function hasPrescribingNumericValue(value: unknown): boolean {
  if (value == null || value === '') {
    return false;
  }
  const n = Number(value);
  if (Number.isFinite(n)) {
    return n !== 0;
  }
  return String(value).trim().length > 0;
}

/** Combined dose label for tables, e.g. `200mg`. */
export function formatDosageDisplay(value: unknown, unit: unknown): string {
  const hasV = hasPrescribingNumericValue(value);
  const u = String(unit ?? '').trim();
  if (!hasV && !u) {
    return '—';
  }
  if (!hasV) {
    return u;
  }
  const v = String(value);
  if (!u) {
    return v;
  }
  return `${v}${u}`;
}

/** Same display as client order pharmacy table: e.g. `2 X 1 (Day(s))`. */
export function formatFrequencyDisplay(
  totalUnits: unknown,
  frequencyValue: unknown,
  frequencyUnit: unknown
): string {
  const tu = hasPrescribingNumericValue(totalUnits) ? String(totalUnits) : '';
  const fv = hasPrescribingNumericValue(frequencyValue) ? String(frequencyValue) : '';
  const period = formatTreatmentPeriodUnit(frequencyUnit);
  if (!tu && !fv) {
    return '—';
  }
  return `${tu} X ${fv}${period ? ` (${period})` : ''}`;
}

export function formatTreatmentPeriodUnit(unit: unknown): string {
  const n = Number(unit);
  if (Number.isFinite(n) && Math.abs(n - 1 / 1440) < 0.000001) {
    return 'Minute(s)';
  }
  if (Number.isFinite(n) && Math.abs(n - 1 / 24) < 0.000001) {
    return 'Hour(s)';
  }
  if (n === 1) {
    return 'Day(s)';
  }
  if (n === 7) {
    return 'Week(s)';
  }
  if (n === 30) {
    return 'Month(s)';
  }
  const s = String(unit ?? '').trim();
  if (!s) {
    return '';
  }
  if (/^min/i.test(s)) {
    return 'Minute(s)';
  }
  if (/^hour/i.test(s)) {
    return 'Hour(s)';
  }
  if (/^day/i.test(s)) {
    return 'Day(s)';
  }
  if (/^week/i.test(s)) {
    return 'Week(s)';
  }
  if (/^month/i.test(s)) {
    return 'Month(s)';
  }
  return s;
}

/**
 * Map stored period labels (or day-fraction numbers) back to select [ngValue] fractions
 * used by pharmacy / OTC prescribing forms.
 */
export function parseTreatmentPeriodUnitToDayFraction(unit: unknown): number | null {
  if (unit == null || unit === '') {
    return null;
  }
  const n = Number(unit);
  if (Number.isFinite(n) && n > 0) {
    if (Math.abs(n - 1 / 1440) < 0.00001 || Math.abs(n - 0.00069444) < 0.00001) {
      return 1 / 1440;
    }
    if (Math.abs(n - 1 / 24) < 0.00001 || Math.abs(n - 0.04166667) < 0.00001) {
      return 1 / 24;
    }
    if (Math.abs(n - 1) < 0.00001) {
      return 1;
    }
    if (Math.abs(n - 7) < 0.00001) {
      return 7;
    }
    if (Math.abs(n - 30) < 0.00001) {
      return 30;
    }
    return n;
  }
  const s = String(unit).trim().toLowerCase();
  if (/^min/.test(s)) {
    return 1 / 1440;
  }
  if (/^hour/.test(s)) {
    return 1 / 24;
  }
  if (/^day/.test(s)) {
    return 1;
  }
  if (/^week/.test(s)) {
    return 7;
  }
  if (/^month/.test(s)) {
    return 30;
  }
  return null;
}

