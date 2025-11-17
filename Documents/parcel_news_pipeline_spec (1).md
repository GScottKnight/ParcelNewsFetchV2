# Parcel News Pipeline – Event & Extraction Spec

## 0. Purpose

This spec defines the data structures and behavior for a news-processing pipeline that:

1. Ingests UPS / FedEx–related news articles.
2. Uses LLMs in two stages:
   - Stage 1: Cheap relevance classification.
   - Stage 2: Detailed cost-impact extraction.
3. Collapses multiple articles about the **same underlying carrier event** into a single **CanonicalEvent**.
4. Produces calculator-grade, structured data so a downstream module can compute **shipper-specific cost impact** using their own historical shipment data.

No LLM calls are defined here; this is the contract between the LLM layer and the rest of the system.

---

## 1. Pipeline Overview

High-level flow:

1. **Ingestion & Pre-filter**
   - Scrape / pull articles + metadata.
   - Optional keyword / rules filter to discard obviously irrelevant content before LLMs.

2. **Stage 1 – Relevance Classification (cheap model)**
   - Input: article title, source, text.
   - Output: `Stage1RelevanceResult` (JSON).
   - Purpose: Decide whether to bother with Stage 2.

3. **Stage 2 – Article Extraction (expensive model)**
   - Input: article metadata + full text.
   - Output: `Stage2ArticleExtraction` (JSON).
   - Purpose: Extract structured levers, event type, and `normalized_event_signature`.

4. **Event Dedupe / Clustering**
   - Input: `Stage2ArticleExtraction`.
   - Use `normalized_event_signature` (plus optional similarity logic) to:
     - Create new `CanonicalEvent`, or
     - Merge article into existing event and update its levers/details.

5. **Downstream Calculator**
   - Consumes `CanonicalEvent` only (not raw articles).
   - Uses `levers[]` and `impact_formula_hint` to compute shipper-specific cost impact.

---

## 2. Data Models

### 2.1 Enumerations

These enums should be implemented explicitly.

**Carriers**
- `"UPS"`
- `"FedEx"`
- `"Other"`

**Source tiers**
- `"carrier_official"`
- `"major_news"`
- `"industry_press"`
- `"blog"`
- `"other"`

**Event types**
- `"annual_gri"`
- `"fuel_table_update"`
- `"new_surcharge"`
- `"surcharge_removed"`
- `"dim_formula_change"`
- `"min_charge_change"`
- `"peak_surcharge_announcement"`
- `"targeted_program_change"`
- `"contractual_change"`
- `"other"`

**Cost components**
- `"BaseTariff"`
- `"FSC"`
- `"AHC"`
- `"LPS"`
- `"DAS"`
- `"EDAS"`
- `"RAS"`
- `"MPC"`
- `"DIM"`
- `"PeakSurcharge"`
- `"Other"`

**Impact direction**
- `"increase"`
- `"decrease"`
- `"mixed"`
- `"unclear"`

**Geographic scope**
- `"US"`
- `"EU"`
- `"Global"`
- `"SpecificCountries"`
- `"Unknown"`

**Units**
- `"per_package"`
- `"per_lb"`
- `"per_kg"`
- `"per_shipment"`
- `"other"`

---

### 2.2 Stage 1 – Relevance Result (cheap model)

```jsonc
{
  "is_relevant": true,
  "relevance_reason": "Mentions UPS 2026 general rate increase affecting U.S. domestic services.",
  "carrier_mentions": ["UPS"],
  "is_cost_related": true,
  "source_tier": "major_news",
  "confidence": 0.93
}
```

---

### 2.3 Stage 2 – Article Extraction (big model)

```jsonc
{
  "article_metadata": {
    "title": "UPS Announces 2026 General Rate Increase",
    "source_url": "https://example.com/ups-2026-gri",
    "source_name": "UPS",
    "publication_date": "2025-10-10",
    "source_tier": "carrier_official"
  },

  "event_summary": {
    "carrier": ["UPS"],
    "event_type": "annual_gri",
    "short_description": "UPS announces an average 5.9% increase to U.S. domestic package base rates effective Dec 26, 2026.",
    "announcement_date": "2025-10-10",
    "effective_date": "2026-12-26",
    "geographic_scope": "US",
    "countries": [],
    "impact_direction_overall": "increase",
    "details_available": true,
    "details_confidence": 0.9
  },

  "levers": [
    {
      "lever_id": "base_ups_ground_us",
      "cost_component": "BaseTariff",
      "change_type": "percent_increase",
      "impact_direction": "increase",

      "percent_change": 5.9,
      "absolute_change_per_unit": null,
      "unit": null,

      "service_scope": {
        "product_scope": ["Ground"],
        "service_codes": [],
        "zone_range": { "min": 2, "max": 8 },
        "weight_range_lbs": null
      },

      "dim_change": false,
      "dim_old_divisor": null,
      "dim_new_divisor": null,

      "min_charge_old": null,
      "min_charge_new": null,

      "peak_window": null,
      "peak_trigger_conditions": null,

      "details_available": true,
      "details_confidence": 0.9,

      "impact_formula_hint": "NewCharge = OldCharge * 1.059 for UPS U.S. Ground base rates, zones 2–8.",
      "supporting_snippets": [
        {
          "field": "percent_change",
          "quote": "UPS will increase its Ground service rates by an average of 5.9%.",
          "offset": 1234
        }
      ]
    }
  ],

  "event_signature_fields": {
    "carrier": "UPS",
    "primary_component": "BaseTariff",
    "event_type": "annual_gri",
    "effective_date": "2026-12-26",
    "geographic_scope": "US"
  },

  "normalized_event_signature": "UPS|BaseTariff|US|2026-12-26|annual_gri",

  "extraction_confidence_overall": 0.88,
  "notes": "No detailed surcharge table in this article; only mentions overall average increase."
}
```

---

### 2.4 Canonical Event (deduped)

```jsonc
{
  "event_id": "evt_01HXYZ123",
  "normalized_event_signature": "UPS|BaseTariff|US|2026-12-26|annual_gri",

  "carrier": "UPS",
  "event_type": "annual_gri",
  "primary_component": "BaseTariff",
  "short_description": "UPS 2026 U.S. domestic general rate increase.",
  "announcement_date": "2025-10-10",
  "effective_date": "2026-12-26",
  "geographic_scope": "US",
  "countries": [],

  "levers": [
    {
      "lever_id": "base_ups_ground_us",
      "cost_component": "BaseTariff",
      "change_type": "percent_increase",
      "impact_direction": "increase",
      "percent_change": 5.9,
      "absolute_change_per_unit": null,
      "unit": null,
      "service_scope": {
        "product_scope": ["Ground"],
        "service_codes": [],
        "zone_range": { "min": 2, "max": 8 },
        "weight_range_lbs": null
      },
      "dim_change": false,
      "dim_old_divisor": null,
      "dim_new_divisor": null,
      "min_charge_old": null,
      "min_charge_new": null,
      "peak_window": null,
      "peak_trigger_conditions": null,
      "details_available": true,
      "details_confidence": 0.92,
      "impact_formula_hint": "NewCharge = OldCharge * 1.059 for UPS U.S. Ground base rates, zones 2–8."
    }
  ],

  "source_articles": [
    {
      "article_id": "art_01",
      "source_url": "https://example.com/ups-press-release",
      "source_name": "UPS",
      "source_tier": "carrier_official",
      "publication_date": "2025-10-10",
      "used_for_levers": true
    },
    {
      "article_id": "art_02",
      "source_url": "https://logisticsnews.com/ups-2026-gri",
      "source_name": "Logistics News",
      "publication_date": "2025-10-11",
      "source_tier": "industry_press",
      "used_for_levers": false
    }
  ],

  "confidence_overall": 0.92,
  "created_at": "2025-10-10T12:00:00Z",
  "last_updated_at": "2025-10-11T09:00:00Z"
}
```

---

## 3. Stage 1 – Relevance Prompt

**System Prompt:**
(omitted here for brevity—same as earlier description)

**User Template:**
(omitted—same as earlier description)

---

## 4. Stage 2 – Extraction Prompt

**System Prompt:**
(full structured JSON schema from above)

**User Template:**
(includes metadata + full article text)

---

## 5. Event Dedupe Logic

- Use `normalized_event_signature` as primary key.
- Merge levers from multiple articles:
  - Prefer non-null numeric values.
  - Prefer carrier-official sources.
  - Higher confidence wins on conflicts.
- Only alert on **events**, not individual articles.

---

