import type {
  Carrier,
  SourceTier,
  EventType,
  CostComponent,
  ImpactDirection,
  GeographicScope,
  Unit,
} from "./enums";

export interface Stage1RelevanceResult {
  is_relevant: boolean;
  relevance_reason: string;
  carrier_mentions: Carrier[];
  is_cost_related: boolean;
  source_tier: SourceTier;
  confidence: number; // 0-1
}

export interface ArticleMetadata {
  title: string;
  source_url: string;
  source_name: string;
  publication_date: string; // ISO date
  source_tier: SourceTier;
}

export interface EventSummary {
  carrier: Carrier[];
  event_type: EventType;
  short_description: string;
  announcement_date: string | null; // ISO date or null
  effective_date: string | null; // ISO date or null
  geographic_scope: GeographicScope;
  countries: string[];
  impact_direction_overall: ImpactDirection;
  details_available: boolean;
  details_confidence: number; // 0-1
}

export interface ServiceScope {
  product_scope: string[];
  service_codes: string[];
  zone_range: { min: number | null; max: number | null } | null;
  weight_range_lbs: { min: number | null; max: number | null } | null;
}

export interface LeverSnippet {
  field: string;
  quote: string;
  offset: number | null;
}

export interface Lever {
  lever_id: string;
  cost_component: CostComponent;
  change_type: string;
  impact_direction: ImpactDirection;
  percent_change: number | null;
  absolute_change_per_unit: number | null;
  unit: Unit | null;
  service_scope: ServiceScope;
  dim_change: boolean;
  dim_old_divisor: number | null;
  dim_new_divisor: number | null;
  min_charge_old: number | null;
  min_charge_new: number | null;
  peak_window: string | null;
  peak_trigger_conditions: string | null;
  details_available: boolean;
  details_confidence: number; // 0-1
  impact_formula_hint: string | null;
  supporting_snippets: LeverSnippet[];
}

export interface EventSignatureFields {
  carrier: Carrier;
  primary_component: CostComponent;
  event_type: EventType;
  effective_date: string | null; // ISO date or null
  geographic_scope: GeographicScope;
}

export interface Stage2ArticleExtraction {
  article_metadata: ArticleMetadata;
  event_summary: EventSummary;
  levers: Lever[];
  event_signature_fields: EventSignatureFields;
  normalized_event_signature: string;
  extraction_confidence_overall: number; // 0-1
  notes: string;
}

export interface CanonicalEventSourceArticle {
  article_id: string;
  source_url: string;
  source_name: string;
  publication_date: string;
  source_tier: SourceTier;
  used_for_levers: boolean;
}

export interface CanonicalEvent {
  event_id: string;
  normalized_event_signature: string;
  carrier: Carrier;
  event_type: EventType;
  primary_component: CostComponent;
  short_description: string;
  announcement_date: string | null;
  effective_date: string | null;
  geographic_scope: GeographicScope;
  countries: string[];
  levers: Lever[];
  source_articles: CanonicalEventSourceArticle[];
  confidence_overall: number;
  created_at: string;
  last_updated_at: string;
}
