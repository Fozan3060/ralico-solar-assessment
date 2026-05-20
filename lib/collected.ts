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
 * Safety merge. Defends against the field-regression bug — i.e. an extraction
 * pass dropping a previously-confirmed field back to null — while still
 * letting a legitimate *value* update through (the user correcting an answer).
 *
 * The rule per field: take the new extraction unless it is null, in which case
 * keep the old value. So `null → value` (newly filled), `value → null` (kept,
 * no regression), and `value → newValue` (correction accepted) all work.
 */
function preferNonNull<T>(next: T | null, prev: T | null): T | null {
  return next ?? prev;
}

export function mergeCollected(
  prev: CollectedData,
  next: CollectedData,
): CollectedData {
  return {
    property_type: preferNonNull(next.property_type, prev.property_type),
    annual_electricity_bill_gbp: preferNonNull(
      next.annual_electricity_bill_gbp,
      prev.annual_electricity_bill_gbp,
    ),
    number_of_occupants: preferNonNull(
      next.number_of_occupants,
      prev.number_of_occupants,
    ),
    heating_system: preferNonNull(next.heating_system, prev.heating_system),
    solar_interest: preferNonNull(next.solar_interest, prev.solar_interest),
  };
}

/** How many of the five fields currently hold a confirmed value. */
export function countFilledFields(collected: CollectedData): number {
  return FIELD_KEYS.filter((key) => collected[key] !== null).length;
}

/**
 * True once the assessment can be considered finished — either all five fields
 * have a value, or every field except the bill has a value AND the user has
 * explicitly said they don't know the bill (`billUnknown` true).
 */
export function isAssessmentComplete(
  collected: CollectedData,
  billUnknown = false,
): boolean {
  const allFilled = FIELD_KEYS.every((key) => collected[key] !== null);
  if (allFilled) return true;

  // Special case: bill is the one field we accept "I don't know" for.
  if (billUnknown) {
    return FIELD_KEYS.filter((k) => k !== "annual_electricity_bill_gbp").every(
      (k) => collected[k] !== null,
    );
  }

  return false;
}
