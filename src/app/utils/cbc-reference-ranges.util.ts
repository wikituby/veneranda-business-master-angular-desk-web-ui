/**
 * Age- and gender-aware CBC reference ranges for lab entry / interpretation.
 *
 * Bands:
 * - Neonate: <= 28 days
 * - Pediatric: > 28 days and < 18 years (child vs adolescent for red-cell indices)
 * - Adult: >= 18 years
 *
 * Ranges follow commonly published hematology intervals (SI-style units matching
 * the existing CBC form). Local analyzer IFUs may differ slightly.
 */

export type CbcAgeBand = 'neonate' | 'pediatric' | 'adult';
export type CbcGender = 'male' | 'female' | 'unknown';

export interface CbcResultField {
  key: string;
  label: string;
  unit: string;
  ref: string;
}

export interface CbcClientContext {
  ageYears: number | null;
  ageDays: number | null;
  band: CbcAgeBand;
  /** Within pediatric: under 12 vs 12-17 (gender matters more for adolescents). */
  pediatricSub: 'child' | 'adolescent' | null;
  gender: CbcGender;
  label: string;
}

type RefMap = Record<string, string>;

const CBC_META: Array<{ key: string; label: string; unit: string }> = [
  { key: 'wbc', label: 'WBC', unit: '10^9/L' },
  { key: 'lymph', label: 'LYMPH', unit: '10^9/L' },
  { key: 'mid', label: 'MID', unit: '10^9/L' },
  { key: 'gran', label: 'GRAN', unit: '10^9/L' },
  { key: 'lymphPercent', label: 'LYMPH %', unit: '%' },
  { key: 'midPercent', label: 'MID %', unit: '%' },
  { key: 'granPercent', label: 'GRAN %', unit: '%' },
  { key: 'hgb', label: 'HGB', unit: 'g/dL' },
  { key: 'rbc', label: 'RBC', unit: '10^12/L' },
  { key: 'hct', label: 'HCT', unit: '%' },
  { key: 'mcv', label: 'MCV', unit: 'fL' },
  { key: 'mch', label: 'MCH', unit: 'pg' },
  { key: 'mchc', label: 'MCHC', unit: 'g/dL' },
  { key: 'rdwCv', label: 'RDW-CV', unit: '%' },
  { key: 'rdwSd', label: 'RDW-SD', unit: 'fL' },
  { key: 'plt', label: 'PLT', unit: '10^9/L' },
  { key: 'mpv', label: 'MPV', unit: 'fL' },
  { key: 'pdw', label: 'PDW', unit: 'fL' },
  { key: 'pct', label: 'PCT', unit: '%' },
];

/** Shared indices that rarely differ by sex within a band. */
const SHARED_NEONATE: RefMap = {
  wbc: '9.0 - 30.0',
  lymph: '2.0 - 11.0',
  mid: '0.5 - 2.5',
  gran: '1.5 - 10.0',
  lymphPercent: '20 - 50',
  midPercent: '5 - 20',
  granPercent: '30 - 70',
  hgb: '13.5 - 22.0',
  rbc: '4.0 - 6.6',
  hct: '42 - 65',
  mcv: '95 - 120',
  mch: '31 - 37',
  mchc: '30 - 36',
  rdwCv: '11 - 18',
  rdwSd: '35 - 60',
  plt: '150 - 450',
  mpv: '7.0 - 12.0',
  pdw: '8 - 18',
  pct: '0.1 - 0.4',
};

const SHARED_PED_CHILD: RefMap = {
  wbc: '5.0 - 15.0',
  lymph: '1.5 - 7.0',
  mid: '0.2 - 1.8',
  gran: '1.5 - 8.5',
  lymphPercent: '30 - 60',
  midPercent: '3 - 15',
  granPercent: '30 - 60',
  hgb: '11.0 - 14.5',
  rbc: '3.8 - 5.2',
  hct: '33 - 42',
  mcv: '75 - 90',
  mch: '25 - 31',
  mchc: '32 - 36',
  rdwCv: '11 - 15',
  rdwSd: '35 - 56',
  plt: '150 - 450',
  mpv: '7.5 - 11.5',
  pdw: '9 - 17',
  pct: '0.1 - 0.3',
};

const SHARED_PED_ADOLESCENT_BASE: RefMap = {
  wbc: '4.5 - 13.0',
  lymph: '1.0 - 5.0',
  mid: '0.1 - 1.5',
  gran: '1.8 - 8.0',
  lymphPercent: '25 - 50',
  midPercent: '3 - 15',
  granPercent: '40 - 70',
  mcv: '78 - 95',
  mch: '26 - 32',
  mchc: '32 - 36',
  rdwCv: '11 - 15',
  rdwSd: '35 - 56',
  plt: '150 - 450',
  mpv: '7.5 - 11.5',
  pdw: '9 - 17',
  pct: '0.1 - 0.3',
};

const SHARED_ADULT_BASE: RefMap = {
  wbc: '4.0 - 11.0',
  lymph: '0.8 - 4.0',
  mid: '0.1 - 1.5',
  gran: '2.0 - 7.5',
  lymphPercent: '20 - 45',
  midPercent: '3 - 15',
  granPercent: '50 - 70',
  mcv: '80 - 100',
  mch: '27 - 33',
  mchc: '32 - 36',
  rdwCv: '11 - 15',
  rdwSd: '35 - 56',
  plt: '150 - 450',
  mpv: '7.5 - 11.5',
  pdw: '9 - 17',
  pct: '0.1 - 0.3',
};

function fieldsFromRefs(refs: RefMap): CbcResultField[] {
  return CBC_META.map((m) => ({
    ...m,
    ref: refs[m.key] || '-',
  }));
}

function withRedCell(
  base: RefMap,
  hgb: string,
  rbc: string,
  hct: string
): RefMap {
  return { ...base, hgb, rbc, hct };
}

function normalizeGender(gender: unknown): CbcGender {
  const g = (gender ?? '').toString().trim().toLowerCase();
  if (!g) {
    return 'unknown';
  }
  if (g === 'm' || g.startsWith('male') || g === 'boy') {
    return 'male';
  }
  if (g === 'f' || g.startsWith('female') || g === 'girl') {
    return 'female';
  }
  return 'unknown';
}

/** Parse free-text / numeric age into years (fractional OK). */
export function parseClientAgeYears(age: unknown): number | null {
  if (age == null || age === '') {
    return null;
  }
  if (typeof age === 'number' && Number.isFinite(age)) {
    return age >= 0 ? age : null;
  }
  const s = String(age).trim().toLowerCase();
  if (!s) {
    return null;
  }

  const asNum = Number(s.replace(/,/g, ''));
  if (!Number.isNaN(asNum) && /^-?\d+(\.\d+)?$/.test(s.replace(/,/g, ''))) {
    return asNum >= 0 ? asNum : null;
  }

  const dayMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:d|day|days)\b/);
  const weekMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:w|wk|wks|week|weeks)\b/);
  const monthMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:mo|mos|month|months)\b/);
  const yearMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:y|yr|yrs|year|years)\b/);

  let years = 0;
  let matched = false;
  if (yearMatch) {
    years += Number(yearMatch[1]);
    matched = true;
  }
  if (monthMatch) {
    years += Number(monthMatch[1]) / 12;
    matched = true;
  }
  if (weekMatch) {
    years += Number(weekMatch[1]) / 52.1775;
    matched = true;
  }
  if (dayMatch) {
    years += Number(dayMatch[1]) / 365.25;
    matched = true;
  }
  if (matched) {
    return years >= 0 ? years : null;
  }

  const leading = s.match(/^(\d+(?:\.\d+)?)/);
  if (leading) {
    const n = Number(leading[1]);
    return Number.isNaN(n) || n < 0 ? null : n;
  }
  return null;
}

export function ageYearsFromDateOfBirth(
  dob: unknown,
  asOf: Date = new Date()
): number | null {
  if (dob == null || dob === '') {
    return null;
  }
  const d = dob instanceof Date ? dob : new Date(String(dob));
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const ms = asOf.getTime() - d.getTime();
  if (ms < 0) {
    return null;
  }
  return ms / (365.25 * 24 * 60 * 60 * 1000);
}

export function ageDaysFromDateOfBirth(
  dob: unknown,
  asOf: Date = new Date()
): number | null {
  if (dob == null || dob === '') {
    return null;
  }
  const d = dob instanceof Date ? dob : new Date(String(dob));
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const ms = asOf.getTime() - d.getTime();
  if (ms < 0) {
    return null;
  }
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function resolveCbcClientContext(
  clientAge?: unknown,
  clientDateOfBirth?: unknown,
  clientGender?: unknown,
  asOf: Date = new Date()
): CbcClientContext {
  const gender = normalizeGender(clientGender);
  const fromDobYears = ageYearsFromDateOfBirth(clientDateOfBirth, asOf);
  const fromDobDays = ageDaysFromDateOfBirth(clientDateOfBirth, asOf);
  const fromAgeYears = parseClientAgeYears(clientAge);

  // Prefer DOB when available (more precise for neonates).
  const ageYears =
    fromDobYears != null ? fromDobYears : fromAgeYears != null ? fromAgeYears : null;
  const ageDays =
    fromDobDays != null
      ? fromDobDays
      : ageYears != null
        ? Math.floor(ageYears * 365.25)
        : null;

  let band: CbcAgeBand = 'adult';
  let pediatricSub: CbcClientContext['pediatricSub'] = null;

  if (ageDays != null && ageDays <= 28) {
    band = 'neonate';
  } else if (ageYears != null && ageYears < 18) {
    band = 'pediatric';
    pediatricSub = ageYears < 12 ? 'child' : 'adolescent';
  } else if (ageYears == null && ageDays == null) {
    // Unknown age -> adult gender-blind fallback (matches legacy form).
    band = 'adult';
  } else {
    band = 'adult';
  }

  const genderLabel =
    gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Sex unknown';
  let bandLabel = 'Adult';
  if (band === 'neonate') {
    bandLabel = 'Neonate';
  } else if (band === 'pediatric') {
    bandLabel = pediatricSub === 'adolescent' ? 'Pediatric (adolescent)' : 'Pediatric';
  }

  return {
    ageYears,
    ageDays,
    band,
    pediatricSub,
    gender,
    label: bandLabel + ' · ' + genderLabel,
  };
}

function pickRefMap(ctx: CbcClientContext): RefMap {
  if (ctx.band === 'neonate') {
    return { ...SHARED_NEONATE };
  }

  if (ctx.band === 'pediatric') {
    if (ctx.pediatricSub === 'adolescent') {
      if (ctx.gender === 'male') {
        return withRedCell(SHARED_PED_ADOLESCENT_BASE, '12.5 - 16.5', '4.2 - 5.6', '37 - 49');
      }
      if (ctx.gender === 'female') {
        return withRedCell(SHARED_PED_ADOLESCENT_BASE, '12.0 - 15.0', '4.0 - 5.2', '36 - 46');
      }
      return withRedCell(SHARED_PED_ADOLESCENT_BASE, '12.0 - 16.5', '4.0 - 5.6', '36 - 49');
    }
    // Child / young pediatric — sex differences for HGB are small; slight split if known.
    if (ctx.gender === 'male') {
      return withRedCell(SHARED_PED_CHILD, '11.0 - 14.5', '3.9 - 5.3', '33 - 43');
    }
    if (ctx.gender === 'female') {
      return withRedCell(SHARED_PED_CHILD, '11.0 - 14.0', '3.8 - 5.2', '33 - 42');
    }
    return { ...SHARED_PED_CHILD };
  }

  // Adult
  if (ctx.gender === 'male') {
    return withRedCell(SHARED_ADULT_BASE, '13.5 - 17.5', '4.5 - 5.9', '41 - 53');
  }
  if (ctx.gender === 'female') {
    return withRedCell(SHARED_ADULT_BASE, '12.0 - 15.5', '4.0 - 5.2', '36 - 46');
  }
  // Legacy combined adult span when sex unknown
  return withRedCell(SHARED_ADULT_BASE, '12.0 - 17.5', '4.2 - 5.9', '36 - 50');
}

export function getCbcFieldsForClient(
  clientAge?: unknown,
  clientDateOfBirth?: unknown,
  clientGender?: unknown
): CbcResultField[] {
  const ctx = resolveCbcClientContext(clientAge, clientDateOfBirth, clientGender);
  return fieldsFromRefs(pickRefMap(ctx));
}

export function getCbcReferenceLabel(
  clientAge?: unknown,
  clientDateOfBirth?: unknown,
  clientGender?: unknown
): string {
  return resolveCbcClientContext(clientAge, clientDateOfBirth, clientGender).label;
}

/** Default / legacy adult combined ranges (sex unknown). */
export const CBC_RESULT_FIELDS: CbcResultField[] = getCbcFieldsForClient(null, null, null);