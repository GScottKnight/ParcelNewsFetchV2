import type { Lever } from "../models/types";

export function mergeLevers(existing: Lever[], incoming: Lever[]): Lever[] {
  const byId = new Map<string, Lever>();
  existing.forEach((l) => byId.set(l.lever_id, l));

  for (const lever of incoming) {
    const current = byId.get(lever.lever_id);
    if (!current) {
      byId.set(lever.lever_id, lever);
      continue;
    }
    const better = pickBetterLever(current, lever);
    byId.set(lever.lever_id, better);
  }
  return Array.from(byId.values());
}

function pickBetterLever(a: Lever, b: Lever): Lever {
  // Prefer non-null numeric values, higher confidence.
  const confA = a.details_confidence ?? 0;
  const confB = b.details_confidence ?? 0;

  const merged: Lever = { ...a };

  // Numeric fields: percent_change, absolute_change_per_unit, min_charge*, dim_divisors
  merged.percent_change = preferNumeric(a.percent_change, b.percent_change, confA, confB);
  merged.absolute_change_per_unit = preferNumeric(
    a.absolute_change_per_unit,
    b.absolute_change_per_unit,
    confA,
    confB,
  );
  merged.min_charge_old = preferNumeric(a.min_charge_old, b.min_charge_old, confA, confB);
  merged.min_charge_new = preferNumeric(a.min_charge_new, b.min_charge_new, confA, confB);
  merged.dim_old_divisor = preferNumeric(a.dim_old_divisor, b.dim_old_divisor, confA, confB);
  merged.dim_new_divisor = preferNumeric(a.dim_new_divisor, b.dim_new_divisor, confA, confB);

  // Non-numeric: prefer higher confidence entry.
  merged.change_type = preferString(a.change_type, b.change_type, confA, confB) || merged.change_type;
  merged.impact_formula_hint =
    preferString(a.impact_formula_hint, b.impact_formula_hint, confA, confB) ?? null;
  merged.impact_direction =
    (preferString(a.impact_direction, b.impact_direction, confA, confB) as Lever["impact_direction"]) ||
    merged.impact_direction;
  merged.service_scope = merged.service_scope || b.service_scope;

  // details_available, details_confidence
  merged.details_available = confB > confA ? b.details_available : a.details_available;
  merged.details_confidence = Math.max(confA, confB);

  // supporting_snippets: keep union (dedup by quote)
  const snippets = [...(a.supporting_snippets || []), ...(b.supporting_snippets || [])];
  const seen = new Set<string>();
  merged.supporting_snippets = snippets.filter((s) => {
    if (!s.quote) return false;
    if (seen.has(s.quote)) return false;
    seen.add(s.quote);
    return true;
  });

  return merged;
}

function preferNumeric(
  a: number | null | undefined,
  b: number | null | undefined,
  confA: number,
  confB: number,
): number | null {
  if (b !== null && b !== undefined) {
    if (a === null || a === undefined || confB >= confA) return b;
  }
  return a ?? null;
}

function preferString(
  a: string | null | undefined,
  b: string | null | undefined,
  confA: number,
  confB: number,
): string | null {
  if (b && (!a || confB >= confA)) return b;
  return a ?? null;
}
