/**
 * The five property data points the assistant collects during the assessment.
 *
 * Shared between the API route (server-side extraction) and the client
 * (data panel + final JSON output). Every field is `null` until it has been
 * confirmed in conversation, and — by design — never regresses back to `null`.
 */
export type CollectedData = {
  property_type: string | null;
  annual_electricity_bill_gbp: number | null;
  number_of_occupants: number | null;
  heating_system: string | null;
  solar_interest: string | null;
};
