export interface UnitSellingModel {
  id: number;
  stockItemId?: number;
  procedureId?: number;
  name: string;
  unitSellingPrice: number;
  unitsInBundle?: number | null;
  bundlePrice?: number | null;
  profitMargin?: number | null;
  sortOrder?: number | null;
  isDefault?: boolean | null;
  /** Client-only draft row before the parent record is saved. */
  isDraft?: boolean;
}

export function findUnitSellingModelByNameKeyword(
  models: Array<{ name?: string } | null | undefined> | null | undefined,
  keyword: string | null | undefined
): any | null {
  const needle = String(keyword || '').trim().toLowerCase();
  if (!needle || !Array.isArray(models) || !models.length) {
    return null;
  }
  return models.find((model) => String(model?.name || '').toLowerCase().includes(needle)) ?? null;
}

export function clientGroupUsesCompassionPricing(
  group: { groupNameShortForm?: string; groupName?: string } | null | undefined,
  fallbackName?: string | null
): boolean {
  const parts = [
    group?.groupNameShortForm,
    fallbackName,
    group?.groupName,
  ];
  return parts.some((part) => String(part || '').trim().toLowerCase().includes('compassion'));
}

export interface UnitSellingModelPayload {
  name: string;
  unitSellingPrice: number;
  unitsInBundle?: number | null;
  bundlePrice?: number | null;
  profitMargin?: number | null;
  sortOrder?: number | null;
  isDefault?: boolean | null;
}
