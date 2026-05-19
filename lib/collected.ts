import type { CollectedData } from "@/lib/types";

/** The five field keys, in the order they are displayed in the UI. */
export const FIELD_KEYS = [
  "property_type",
  "annual_electricity_bill_gbp",
  "number_of_occupants",
  "heating_system",
  "solar_interest",
] as const;

/** A fresh assessment — nothing collected yet. */
export const EMPTY_COLLECTED: CollectedData = {
  property_type: null,
  annual_electricity_bill_gbp: null,
  number_of_occupants: null,
  heating_system: null,
  solar_interest: null,
};

/**
 * Safety merge. A field that is already non-null in `prev` is kept exactly as
 * it was; only null fields in `prev` may be filled in from `next`.
 *
 * This is the server-side guarantee against the field-regression bug: once a
 * field has been confirmed it can never revert to null, even if a later
 * extraction pass fails to spot it.
 */
export function mergeCollected(
  prev: CollectedData,
  next: CollectedData,
): CollectedData {
  return {
    property_type: prev.property_type ?? next.property_type,
    annual_electricity_bill_gbp:
      prev.annual_electricity_bill_gbp ?? next.annual_electricity_bill_gbp,
    number_of_occupants:
      prev.number_of_occupants ?? next.number_of_occupants,
    heating_system: prev.heating_system ?? next.heating_system,
    solar_interest: prev.solar_interest ?? next.solar_interest,
  };
}

/** How many of the five fields currently hold a confirmed value. */
export function countFilledFields(collected: CollectedData): number {
  return FIELD_KEYS.filter((key) => collected[key] !== null).length;
}

/** True once all five fields have been collected. */
export function isAssessmentComplete(collected: CollectedData): boolean {
  return countFilledFields(collected) === FIELD_KEYS.length;
}
