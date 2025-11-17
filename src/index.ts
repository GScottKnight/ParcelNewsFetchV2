import { buildNormalizedEventSignature } from "./utils/eventSignature";
import type { Stage2ArticleExtraction } from "./models/types";

// Example placeholder demonstrating shape adherence; replace with real extraction output when wiring LLMs.
const exampleExtraction: Stage2ArticleExtraction = {
  article_metadata: {
    title: "Placeholder: UPS Announces GRI",
    source_url: "https://example.com/ups-gri",
    source_name: "Example News",
    publication_date: "2025-10-10",
    source_tier: "industry_press",
  },
  event_summary: {
    carrier: ["UPS"],
    event_type: "annual_gri",
    short_description: "UPS announces an average increase to U.S. domestic package base rates.",
    announcement_date: "2025-10-10",
    effective_date: "2026-12-26",
    geographic_scope: "US",
    countries: [],
    impact_direction_overall: "increase",
    details_available: true,
    details_confidence: 0.9,
  },
  levers: [
    {
      lever_id: "base_ups_ground_us",
      cost_component: "BaseTariff",
      change_type: "percent_increase",
      impact_direction: "increase",
      percent_change: 5.9,
      absolute_change_per_unit: null,
      unit: null,
      service_scope: {
        product_scope: ["Ground"],
        service_codes: [],
        zone_range: { min: 2, max: 8 },
        weight_range_lbs: null,
      },
      dim_change: false,
      dim_old_divisor: null,
      dim_new_divisor: null,
      min_charge_old: null,
      min_charge_new: null,
      peak_window: null,
      peak_trigger_conditions: null,
      details_available: true,
      details_confidence: 0.9,
      impact_formula_hint: "NewCharge = OldCharge * 1.059 for UPS U.S. Ground base rates, zones 2–8.",
      supporting_snippets: [
        {
          field: "percent_change",
          quote: "UPS will increase its Ground service rates by an average of 5.9%.",
          offset: 1234,
        },
      ],
    },
  ],
  event_signature_fields: {
    carrier: "UPS",
    primary_component: "BaseTariff",
    event_type: "annual_gri",
    effective_date: "2026-12-26",
    geographic_scope: "US",
  },
  normalized_event_signature: "",
  extraction_confidence_overall: 0.88,
  notes: "Placeholder extraction; replace with live LLM output.",
};

exampleExtraction.normalized_event_signature = buildNormalizedEventSignature(
  exampleExtraction.event_signature_fields,
);

// Temporary visibility to ensure pipeline shape compiles and signature builder works.
console.log("Normalized event signature", exampleExtraction.normalized_event_signature);
