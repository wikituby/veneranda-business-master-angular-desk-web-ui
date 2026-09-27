import { StockDosageRule } from '../services/api.service';
import { normalizeDosageUnitForSelect } from './prescribing-prefill.util';

export interface StandardDosageOption {
  title: string;
  matchLabel: string;
  ruleLabel: string;
  calculatedDoseLabel: string;
  doseValue: number;
  doseUnit: string;
  frequencyValue: number;
  frequencyUnit: number;
  durationValue: number;
  durationUnit: number;
  route: string;
  quantity: number;
  totalUnits: number;
  instructions: string;
  warning?: string;
}

export interface StandardDosageContext {
  drugName: string;
  lastUnitValue: number;
  unitOfMeasure: string;
  clientAgeYears: number | null;
  clientWeightKg: number | null;
  currentDoseValue?: number | null;
  defaultRoute?: string;
  defaultDoseUnit?: string;
}

function positiveNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function positiveInteger(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function optionalNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundToHalf(value: number): number {
  return Math.max(0.5, Math.round(value * 2) / 2);
}

function formatTabletQuantity(value: number): string {
  if (value === 0.5) return '1/2';
  if (value === 1) return '1';
  if (value === 1.5) return '1 1/2';
  return String(value);
}

function selectedItemStrengthValue(ctx: StandardDosageContext, fallback: number): number {
  const currentDose = Number(ctx.currentDoseValue);
  if (Number.isFinite(currentDose) && currentDose > 0) {
    return currentDose;
  }
  const strength = Number(ctx.lastUnitValue);
  if (Number.isFinite(strength) && strength > 0) {
    return strength;
  }
  return fallback;
}

function createStandardDosageOption(
  option: Omit<StandardDosageOption, 'frequencyUnit' | 'durationUnit' | 'totalUnits'>
): StandardDosageOption {
  return {
    ...option,
    frequencyUnit: 1,
    durationUnit: 1,
    totalUnits: option.frequencyValue * option.durationValue,
  };
}

export function formatStandardDosageClientSummary(ctx: StandardDosageContext): string {
  const age = ctx.clientAgeYears;
  const weight = ctx.clientWeightKg;
  const ageLabel = age != null ? `${age} years` : 'Age not recorded';
  const weightLabel = weight != null ? `${weight} kg` : 'Weight not recorded';
  return `${ageLabel} | ${weightLabel}`;
}

export function isClientWeightMissing(ctx: StandardDosageContext): boolean {
  const weight = Number(ctx.clientWeightKg);
  return !Number.isFinite(weight) || weight <= 0;
}

function clientMatchesDosageRule(
  rule: StockDosageRule,
  age: number | null,
  weight: number | null
): boolean {
  if (age != null) {
    const minAge = optionalNumber(rule.minAgeYears);
    const maxAge = optionalNumber(rule.maxAgeYears);
    if (minAge != null && age < minAge) {
      return false;
    }
    if (maxAge != null && age > maxAge) {
      return false;
    }
  }

  if (weight != null) {
    const minWeight = optionalNumber(rule.minWeightKg);
    const maxWeight = optionalNumber(rule.maxWeightKg);
    if (minWeight != null && weight < minWeight) {
      return false;
    }
    if (maxWeight != null && weight > maxWeight) {
      return false;
    }
  }

  return true;
}

function buildRuleMatchLabel(
  rule: StockDosageRule,
  ctx: StandardDosageContext,
  age: number | null,
  weight: number | null
): string {
  const labels: string[] = [];
  if (rule.minAgeYears != null || rule.maxAgeYears != null) {
    labels.push(`Age ${rule.minAgeYears ?? '0'}-${rule.maxAgeYears ?? '+'} years`);
  }
  if (rule.minWeightKg != null || rule.maxWeightKg != null) {
    labels.push(`Weight ${rule.minWeightKg ?? '0'}-${rule.maxWeightKg ?? '+'} kg`);
  }
  if (!labels.length) {
    labels.push(formatStandardDosageClientSummary(ctx));
  } else if (age == null || weight == null) {
    labels.push('confirm missing age/weight if relevant');
  }
  return labels.join(' | ');
}

function buildRuleLabel(rule: StockDosageRule, ctx: StandardDosageContext, doseUnit: string): string {
  const calculationType = String(rule.doseCalculationType || '').toUpperCase();
  if (calculationType === 'WEIGHT_PER_DOSE' && rule.weightDoseValue != null) {
    return `${rule.weightDoseValue} ${doseUnit}/kg per dose`;
  }
  if (calculationType === 'WEIGHT_PER_DAY' && rule.weightDoseValue != null) {
    return `${rule.weightDoseValue} ${doseUnit}/kg per day`;
  }
  return `${rule.fixedDoseValue ?? selectedItemStrengthValue(ctx, ctx.lastUnitValue || 1)} ${doseUnit} per dose`;
}

function resolveRuleDose(
  rule: StockDosageRule,
  ctx: StandardDosageContext,
  weight: number | null,
  frequencyValue: number,
  doseUnit: string
): { value: number; label: string; warning?: string } {
  const calculationType = String(rule.doseCalculationType || '').toUpperCase();
  const fixedDose = positiveNumber(rule.fixedDoseValue, selectedItemStrengthValue(ctx, ctx.lastUnitValue || 1));
  const weightDose = positiveNumber(rule.weightDoseValue, 0);

  if ((calculationType === 'WEIGHT_PER_DOSE' || calculationType === 'WEIGHT_PER_DAY') && weightDose > 0) {
    if (weight == null) {
      return {
        value: fixedDose,
        label: 'Record client weight to calculate exact dose',
        warning: rule.warning || 'Weight is missing, so this rule is only a manual placeholder.',
      };
    }

    const rawDose =
      calculationType === 'WEIGHT_PER_DAY'
        ? (weight * weightDose) / Math.max(frequencyValue, 1)
        : weight * weightDose;
    const maxDose = positiveNumber(rule.maxDoseValue, 0);
    const dose = maxDose > 0 ? Math.min(rawDose, maxDose) : rawDose;
    const cappedLabel =
      maxDose > 0 && rawDose > maxDose ? `, capped at ${maxDose} ${rule.maxDoseUnit || doseUnit}` : '';
    return {
      value: roundToOne(dose),
      label: `${roundToOne(rawDose)} ${doseUnit} calculated from ${weight} kg${cappedLabel}`,
    };
  }

  return {
    value: fixedDose,
    label: `${fixedDose} ${doseUnit} per dose`,
  };
}

function createStandardDosageOptionFromRule(
  rule: StockDosageRule,
  ctx: StandardDosageContext
): StandardDosageOption | null {
  const age = ctx.clientAgeYears;
  const weight = ctx.clientWeightKg;
  if (!clientMatchesDosageRule(rule, age, weight)) {
    return null;
  }

  const frequencyValue = positiveNumber(rule.frequencyValue, 1);
  const durationValue = positiveNumber(rule.durationValue, 1);
  const frequencyUnit = positiveInteger(rule.frequencyUnit, 1);
  const durationUnit = positiveInteger(rule.durationUnit, 1);
  const doseUnit = normalizeDosageUnitForSelect(
    rule.fixedDoseUnit ||
      rule.weightDoseUnit ||
      ctx.defaultDoseUnit ||
      ctx.unitOfMeasure ||
      'unit(s)'
  );
  const doseResult = resolveRuleDose(rule, ctx, weight, frequencyValue, doseUnit);
  const lastUnitValue = ctx.lastUnitValue > 0 ? ctx.lastUnitValue : 1;
  const totalUnits = doseResult.value / lastUnitValue;
  const quantity = (frequencyValue * durationValue * doseResult.value) / lastUnitValue;
  const matchLabel = rule.matchLabel || buildRuleMatchLabel(rule, ctx, age, weight);
  const specialSchedule = String(rule.specialScheduleText || '').trim();
  const instructions = [rule.instructions, specialSchedule].filter(Boolean).join(' ');

  return {
    title: rule.title || 'Standard dose',
    matchLabel,
    ruleLabel: rule.ruleLabel || buildRuleLabel(rule, ctx, doseUnit),
    calculatedDoseLabel: doseResult.label,
    doseValue: doseResult.value,
    doseUnit,
    frequencyValue,
    frequencyUnit,
    durationValue,
    durationUnit,
    route: rule.route || ctx.defaultRoute || 'Oral',
    quantity,
    totalUnits,
    instructions: instructions || 'Use this dosage rule, then adjust any treatment fields as needed.',
    warning: doseResult.warning || rule.warning || undefined,
  };
}

function buildPcmDosageOptions(ctx: StandardDosageContext): StandardDosageOption[] {
  const age = ctx.clientAgeYears;
  const weight = ctx.clientWeightKg;
  const isChild = (age != null && age < 12) || (weight != null && weight < 40);
  const tabletStrength = selectedItemStrengthValue(ctx, 500);
  const options: StandardDosageOption[] = [];

  if (!isChild) {
    options.push(
      createStandardDosageOption({
        title: 'Standard adult dose',
        matchLabel: 'Adult / >= 40 kg',
        ruleLabel: 'PCM oral tab 500 mg: 1 tablet per dose',
        calculatedDoseLabel: '500 mg = 1 tablet',
        doseValue: tabletStrength,
        doseUnit: 'mg(s)',
        frequencyValue: 4,
        durationValue: 3,
        route: 'Oral',
        quantity: 12,
        instructions: 'Take 1 tablet every 6 hours when needed. Do not exceed 4 g per day.',
      }),
      createStandardDosageOption({
        title: 'Higher adult dose',
        matchLabel: 'Adult / severe pain or fever',
        ruleLabel: 'PCM oral tab 500 mg: 2 tablets per dose',
        calculatedDoseLabel: '1000 mg = 2 tablets',
        doseValue: tabletStrength * 2,
        doseUnit: 'mg(s)',
        frequencyValue: 3,
        durationValue: 3,
        route: 'Oral',
        quantity: 18,
        instructions: 'Take 2 tablets every 8 hours when needed. Do not exceed 4 g per day.',
      })
    );
    return options;
  }

  if (weight == null) {
    options.push(
      createStandardDosageOption({
        title: 'Child dose needs weight',
        matchLabel: 'Child client',
        ruleLabel: 'PCM: 10-15 mg/kg per dose',
        calculatedDoseLabel: 'Record weight to calculate dose',
        doseValue: tabletStrength,
        doseUnit: 'mg(s)',
        frequencyValue: 4,
        durationValue: 3,
        route: 'Oral',
        quantity: 12,
        instructions: 'Confirm client weight before using a tablet dose.',
        warning: 'Weight is missing, so this is only a manual placeholder.',
      })
    );
    return options;
  }

  [10, 15].forEach((mgPerKg) => {
    const calculatedDose = weight * mgPerKg;
    const tabletFraction = roundToHalf(calculatedDose / tabletStrength);
    const actualDose = tabletFraction * tabletStrength;
    const totalTabs = tabletFraction * 4 * 3;
    options.push(
      createStandardDosageOption({
        title: `${mgPerKg} mg/kg child dose`,
        matchLabel: `Child / ${weight} kg`,
        ruleLabel: `PCM: ${mgPerKg} mg/kg per dose`,
        calculatedDoseLabel: `${roundToOne(calculatedDose)} mg calculated, ${formatTabletQuantity(tabletFraction)} tablet = ${actualDose} mg`,
        doseValue: actualDose,
        doseUnit: 'mg(s)',
        frequencyValue: 4,
        durationValue: 3,
        route: 'Oral',
        quantity: totalTabs,
        instructions: `Give ${formatTabletQuantity(tabletFraction)} PCM 500 mg tablet every 6 hours when needed.`,
      })
    );
  });
  return options;
}

function buildArtesunateDosageOptions(ctx: StandardDosageContext): StandardDosageOption[] {
  const weight = ctx.clientWeightKg;
  const vialStrength = selectedItemStrengthValue(ctx, 60);
  if (weight == null) {
    return [
      createStandardDosageOption({
        title: 'Weight required',
        matchLabel: 'Artesunate IV dosing',
        ruleLabel: '2.4 mg/kg per dose',
        calculatedDoseLabel: 'Record client weight to calculate exact dose',
        doseValue: vialStrength,
        doseUnit: 'mg(s)',
        frequencyValue: 3,
        durationValue: 1,
        route: 'IV',
        quantity: 3,
        instructions: 'Confirm weight, then give at 0, 12 and 24 hours as per protocol.',
        warning: 'Weight is missing, so this should not be used as an automatic calculated dose.',
      }),
    ];
  }

  const dose = roundToOne(weight * 2.4);
  const vialsPerDose = Math.ceil(dose / vialStrength);
  const totalVials = vialsPerDose * 3;
  return [
    createStandardDosageOption({
      title: 'Initial severe malaria schedule',
      matchLabel: `${weight} kg client`,
      ruleLabel: 'Artesunate IV: 2.4 mg/kg at 0, 12 and 24 hours',
      calculatedDoseLabel: `${dose} mg per dose; use ${vialsPerDose} vial(s) of ${vialStrength} mg per dose`,
      doseValue: dose,
      doseUnit: 'mg(s)',
      frequencyValue: 3,
      durationValue: 1,
      route: 'IV',
      quantity: totalVials,
      instructions: `Give ${dose} mg IV at 0, 12 and 24 hours. Reconstitute per protocol; ${totalVials} vial(s) cover the first 3 doses.`,
    }),
  ];
}

function buildCommonFrequencyOptions(ctx: StandardDosageContext): StandardDosageOption[] {
  const unitValue = selectedItemStrengthValue(ctx, ctx.lastUnitValue || 1);
  const unit = normalizeDosageUnitForSelect(ctx.defaultDoseUnit || ctx.unitOfMeasure || 'unit(s)');
  const route = ctx.defaultRoute || 'Oral';
  return [
    createStandardDosageOption({
      title: 'Once daily',
      matchLabel: 'Common frequency',
      ruleLabel: '1 dose per day',
      calculatedDoseLabel: `${unitValue} ${unit} per dose`,
      doseValue: unitValue,
      doseUnit: unit,
      frequencyValue: 1,
      durationValue: 3,
      route,
      quantity: 3,
      instructions: 'Take once daily.',
    }),
    createStandardDosageOption({
      title: 'Twice daily',
      matchLabel: 'Common frequency',
      ruleLabel: '2 doses per day',
      calculatedDoseLabel: `${unitValue} ${unit} per dose`,
      doseValue: unitValue,
      doseUnit: unit,
      frequencyValue: 2,
      durationValue: 3,
      route,
      quantity: 6,
      instructions: 'Take twice daily.',
    }),
    createStandardDosageOption({
      title: 'Three times daily',
      matchLabel: 'Common frequency',
      ruleLabel: '3 doses per day',
      calculatedDoseLabel: `${unitValue} ${unit} per dose`,
      doseValue: unitValue,
      doseUnit: unit,
      frequencyValue: 3,
      durationValue: 3,
      route,
      quantity: 9,
      instructions: 'Take three times daily.',
    }),
  ];
}

function buildFallbackStandardDosageOptions(ctx: StandardDosageContext): StandardDosageOption[] {
  const drugName = String(ctx.drugName || '').toLowerCase();
  if (drugName.includes('artesunate')) {
    return buildArtesunateDosageOptions(ctx);
  }
  if (
    drugName.includes('pcm') ||
    drugName.includes('paracetamol') ||
    drugName.includes('acetaminophen')
  ) {
    return buildPcmDosageOptions(ctx);
  }
  return buildCommonFrequencyOptions(ctx);
}

export function buildStandardDosageOptionsFromRules(
  rules: StockDosageRule[],
  ctx: StandardDosageContext
): StandardDosageOption[] {
  const dbOptions = rules
    .filter((rule) => rule && rule.active !== false)
    .map((rule) => createStandardDosageOptionFromRule(rule, ctx))
    .filter((option): option is StandardDosageOption => !!option);

  if (dbOptions.length) {
    return dbOptions;
  }
  return buildFallbackStandardDosageOptions(ctx);
}
