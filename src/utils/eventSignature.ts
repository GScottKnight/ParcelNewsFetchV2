import type { EventSignatureFields } from "../models/types";

// Build normalized event signature aligning with the spec: Carrier|PrimaryComponent|Geo|EffectiveDate|EventType
export function buildNormalizedEventSignature(fields: EventSignatureFields): string {
  const carrier = fields.carrier ?? "Other";
  const component = fields.primary_component ?? "Other";
  const geo = fields.geographic_scope ?? "Unknown";
  const effectiveDate = fields.effective_date ?? "unknown";
  const eventType = fields.event_type ?? "other";

  return [carrier, component, geo, effectiveDate, eventType].join("|");
}
