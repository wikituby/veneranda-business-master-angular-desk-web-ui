import { firstValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';
import {
  DEFAULT_DRUG_ROOT_NAME,
  DrugCategorySeedNode
} from '../config/default-drug-categories.config';

type CategoryCache = Map<string, number>;
type ChildrenIndex = Map<number, any[]>;

const DRUG_ROOT_CANDIDATES = [DEFAULT_DRUG_ROOT_NAME, 'DRUGS', 'drug'];

export type DrugCategorySyncMode = 'fresh' | 'incremental';

export interface DrugCategorySyncResult {
  added: number;
  skipped: number;
  failed: number;
  drugRootId: number | null;
  mode: DrugCategorySyncMode;
  failures: string[];
}

export type DrugCategorySyncProgress = {
  current: number;
  total: number;
  name: string;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function getCategoryParentId(cat: any): number | null {
  const raw = cat?.parentId ?? cat?.parentCategoryId ?? cat?.parent?.id ?? null;
  if (raw == null || raw === '') {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function cacheKey(name: string, parentId: number | null): string {
  return `${parentId ?? 'root'}:${normalizeName(name)}`;
}

function unwrapResponsePayload(res: any): any {
  if (res?.data?.entity != null) {
    return res.data.entity;
  }
  if (res?.entity != null) {
    return res.entity;
  }
  return res;
}

function extractCreateError(res: any): string | null {
  const payload = unwrapResponsePayload(res);
  const message = (payload?.message || res?.message || '').toString();
  const status = Number(payload?.status ?? res?.status ?? res?.code ?? 0);

  if (status >= 400) {
    return message || 'Failed to create category';
  }

  if (/already exists|not found|required|error/i.test(message) && !payload?.data?.id) {
    return message;
  }

  return null;
}

function extractCreatedCategoryId(res: any): number | null {
  const payload = unwrapResponsePayload(res);
  const candidates = [
    payload?.data?.id,
    payload?.id,
    res?.data?.entity?.data?.id,
    res?.data?.id,
    res?.data?.data?.id,
    res?.entity?.data?.id,
    res?.id,
    res?.result?.data?.id
  ];

  for (const candidate of candidates) {
    if (candidate == null || candidate === '') {
      continue;
    }
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function countDescendants(rootId: number, categories: any[]): number {
  const childrenIndex = buildChildrenIndex(categories);
  let count = 0;
  const queue = [rootId];

  while (queue.length) {
    const parentId = queue.shift()!;
    const children = childrenIndex.get(parentId) || [];
    count += children.length;
    for (const child of children) {
      queue.push(Number(child.id));
    }
  }

  return count;
}

function buildChildrenIndex(categories: any[]): ChildrenIndex {
  const index: ChildrenIndex = new Map();
  for (const cat of categories) {
    const parentId = getCategoryParentId(cat);
    if (parentId == null) {
      continue;
    }
    if (!index.has(parentId)) {
      index.set(parentId, []);
    }
    index.get(parentId)!.push(cat);
  }
  return index;
}

function resolveDrugRootId(categories: any[]): number | null {
  const roots = categories.filter((cat) => getCategoryParentId(cat) == null);
  let best: { id: number; descendants: number } | null = null;

  for (const candidate of DRUG_ROOT_CANDIDATES) {
    const norm = normalizeName(candidate);
    for (const cat of roots) {
      if (normalizeName(cat?.name || '') !== norm || cat?.id == null) {
        continue;
      }
      const id = Number(cat.id);
      const descendants = countDescendants(id, categories);
      if (!best || descendants > best.descendants) {
        best = { id, descendants };
      }
    }
  }

  return best?.id ?? null;
}

/** True when a DRUG / DRUGS / drug root category already exists in the database. */
export function hasDrugParentCategory(categories: any[]): boolean {
  return resolveDrugRootId(categories) != null;
}

function resolveDrugSyncMode(categories: any[]): DrugCategorySyncMode {
  if (!categories.length || !hasDrugParentCategory(categories)) {
    return 'fresh';
  }
  return 'incremental';
}

function indexCategories(categories: any[], cache: CategoryCache): void {
  for (const cat of categories) {
    if (!cat?.name || cat.id == null) {
      continue;
    }
    const parentId = getCategoryParentId(cat);
    cache.set(cacheKey(cat.name, parentId), Number(cat.id));
  }
}

function linkDrugRootAlias(categories: any[], cache: CategoryCache): void {
  const drugKey = cacheKey(DEFAULT_DRUG_ROOT_NAME, null);
  if (cache.has(drugKey)) {
    return;
  }

  const rootId = resolveDrugRootId(categories);
  if (rootId != null) {
    cache.set(drugKey, rootId);
  }
}

function findChildCategory(
  categories: any[],
  parentId: number,
  name: string
): any | null {
  const target = normalizeName(name);
  return categories.find(
    (cat) =>
      getCategoryParentId(cat) === parentId &&
      normalizeName(cat?.name || '') === target
  ) ?? null;
}

function resolveCategoryId(
  categories: any[],
  cache: CategoryCache,
  name: string,
  parentId: number | null
): number | null {
  const cached = cache.get(cacheKey(name, parentId));
  if (cached != null) {
    return cached;
  }

  if (parentId == null) {
    const drugRootId = cache.get(cacheKey(DEFAULT_DRUG_ROOT_NAME, null));
    if (drugRootId != null && normalizeName(name) === normalizeName(DEFAULT_DRUG_ROOT_NAME)) {
      return drugRootId;
    }
    const rootMatch = categories.find(
      (cat) =>
        getCategoryParentId(cat) == null &&
        normalizeName(cat?.name || '') === normalizeName(name)
    );
    return rootMatch?.id != null ? Number(rootMatch.id) : null;
  }

  const child = findChildCategory(categories, parentId, name);
  return child?.id != null ? Number(child.id) : null;
}

function hydrateCacheFromCategories(categories: any[], cache: CategoryCache): void {
  cache.clear();
  indexCategories(categories, cache);
  linkDrugRootAlias(categories, cache);
}

async function fetchCategories(api: ApiService): Promise<any[]> {
  const list = await firstValueFrom(api.getAllItemCategoriesBusinessItem());
  return Array.isArray(list) ? list : [];
}

function countWholeSubtree(node: DrugCategorySeedNode): number {
  let count = 1;
  for (const child of node.children || []) {
    count += countWholeSubtree(child);
  }
  return count;
}

function countMissingNodes(
  node: DrugCategorySeedNode,
  parentId: number | null,
  categories: any[],
  cache: CategoryCache
): number {
  const categoryId = resolveCategoryId(categories, cache, node.name, parentId);
  if (categoryId == null) {
    return countWholeSubtree(node);
  }

  let count = 0;
  for (const child of node.children || []) {
    count += countMissingNodes(child, categoryId, categories, cache);
  }
  return count;
}

/** Returns how many default DRUG categories are missing from the database. */
export function countMissingDrugCategories(
  categories: any[],
  root: DrugCategorySeedNode
): number {
  const cache: CategoryCache = new Map();
  hydrateCacheFromCategories(categories, cache);
  return countMissingNodes(root, null, categories, cache);
}

/** Returns true when a full seed or incremental top-up is required. */
export function isDrugCategoryTreeIncomplete(
  categories: any[],
  root: DrugCategorySeedNode
): boolean {
  if (!categories.length) {
    return true;
  }
  if (!hasDrugParentCategory(categories)) {
    return true;
  }
  return countMissingDrugCategories(categories, root) > 0;
}

async function ensureCategoryNode(
  api: ApiService,
  categories: any[],
  cache: CategoryCache,
  node: DrugCategorySeedNode,
  parentId: number | null,
  stats: DrugCategorySyncResult,
  onProgress?: (progress: DrugCategorySyncProgress) => void,
  progress?: { current: number; total: number }
): Promise<number | null> {
  let categoryId = resolveCategoryId(categories, cache, node.name, parentId);
  if (categoryId != null) {
    stats.skipped++;
    cache.set(cacheKey(node.name, parentId), categoryId);
    return categoryId;
  }

  if (progress && onProgress) {
    progress.current++;
    onProgress({
      current: progress.current,
      total: progress.total,
      name: node.name
    });
  }

  const payload = {
    name: node.name.trim(),
    parentId: parentId != null ? Number(parentId) : null
  };

  try {
    const res: any = await firstValueFrom(api.addItemCategoryBusinessItem(payload));
    const createError = extractCreateError(res);
    if (createError) {
      throw new Error(createError);
    }

    let createdId = extractCreatedCategoryId(res);
    if (createdId == null) {
      categories = await fetchCategories(api);
      hydrateCacheFromCategories(categories, cache);
      createdId = resolveCategoryId(categories, cache, node.name, parentId);
    }

    if (createdId != null) {
      cache.set(cacheKey(node.name, parentId), createdId);
      stats.added++;
      if (parentId == null) {
        stats.drugRootId = createdId;
      }
      return createdId;
    }

    throw new Error(`Could not resolve created category id for "${node.name}"`);
  } catch (err: any) {
    categories = await fetchCategories(api);
    hydrateCacheFromCategories(categories, cache);
    categoryId = resolveCategoryId(categories, cache, node.name, parentId);
    if (categoryId != null) {
      stats.skipped++;
      return categoryId;
    }

    stats.failed++;
    const label = parentId != null ? `"${node.name}" (parent ${parentId})` : `"${node.name}"`;
    stats.failures.push(`${label}: ${err?.message || 'Create failed'}`);
    return null;
  }
}

/**
 * Walks the configured tree depth-first: checks each child/grandchild against the
 * database under the correct parent, creates anything missing, then continues deeper.
 */
async function syncNodeTree(
  api: ApiService,
  categories: any[],
  cache: CategoryCache,
  node: DrugCategorySeedNode,
  parentId: number | null,
  stats: DrugCategorySyncResult,
  onProgress?: (progress: DrugCategorySyncProgress) => void,
  progress?: { current: number; total: number }
): Promise<any[]> {
  const categoryId = await ensureCategoryNode(
    api,
    categories,
    cache,
    node,
    parentId,
    stats,
    onProgress,
    progress
  );

  if (!node.children?.length) {
    return categories;
  }

  if (categoryId == null) {
    stats.failed += countWholeSubtree({ name: 'subtree', children: node.children }) - 1;
    stats.failures.push(`Skipped descendants of "${node.name}" because the parent could not be resolved.`);
    return categories;
  }

  for (const child of node.children) {
    categories = await syncNodeTree(
      api,
      categories,
      cache,
      child,
      categoryId,
      stats,
      onProgress,
      progress
    );
  }

  return categories;
}

/**
 * Ensures the DRUG hierarchy exists.
 * - No DRUG/DRUGS/drug parent (or empty DB): create the full default catalogue.
 * - Parent already exists: systematically scan every descendant level and add gaps.
 */
export async function syncDefaultDrugCategories(
  api: ApiService,
  root: DrugCategorySeedNode,
  onProgress?: (progress: DrugCategorySyncProgress) => void
): Promise<DrugCategorySyncResult> {
  let categories = await fetchCategories(api);
  const cache: CategoryCache = new Map();
  hydrateCacheFromCategories(categories, cache);

  const mode = resolveDrugSyncMode(categories);
  const stats: DrugCategorySyncResult = {
    added: 0,
    skipped: 0,
    failed: 0,
    drugRootId: mode === 'incremental' ? resolveDrugRootId(categories) : null,
    mode,
    failures: []
  };

  const workTotal = mode === 'fresh'
    ? countWholeSubtree(root)
    : countMissingNodes(root, null, categories, cache);

  if (workTotal === 0) {
    return stats;
  }

  const progress = { current: 0, total: workTotal };
  categories = await syncNodeTree(
    api,
    categories,
    cache,
    root,
    null,
    stats,
    onProgress,
    progress
  );

  if (stats.drugRootId == null) {
    hydrateCacheFromCategories(categories, cache);
    stats.drugRootId = resolveDrugRootId(categories);
  }

  return stats;
}
