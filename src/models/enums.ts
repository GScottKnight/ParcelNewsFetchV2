export type Carrier = "UPS" | "FedEx" | "Other";
export type SourceTier = "carrier_official" | "major_news" | "industry_press" | "blog" | "other";
export type EventType =
  | "annual_gri"
  | "fuel_table_update"
  | "new_surcharge"
  | "surcharge_removed"
  | "dim_formula_change"
  | "min_charge_change"
  | "peak_surcharge_announcement"
  | "targeted_program_change"
  | "contractual_change"
  | "other";
export type CostComponent =
  | "BaseTariff"
  | "FSC"
  | "AHC"
  | "LPS"
  | "DAS"
  | "EDAS"
  | "RAS"
  | "MPC"
  | "DIM"
  | "PeakSurcharge"
  | "Other";
export type ImpactDirection = "increase" | "decrease" | "mixed" | "unclear";
export type GeographicScope = "US" | "EU" | "Global" | "SpecificCountries" | "Unknown";
export type Unit = "per_package" | "per_lb" | "per_kg" | "per_shipment" | "other";
