import type { CollectedData } from "@/lib/types";

export type FieldKey = keyof CollectedData;

export type FieldMeta = {
  key: FieldKey;
  label: string;
  icon: string;
  /** Render a non-null field value for display. */
  format: (value: string | number) => string;
};

function capitalise(value: string | number): string {
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The five fields, in display order, with their panel metadata. */
export const FIELDS: FieldMeta[] = [
  {
    key: "property_type",
    label: "Property Type",
    icon: "🏠",
    format: capitalise,
  },
  {
    key: "annual_electricity_bill_gbp",
    label: "Annual Electricity Bill",
    icon: "⚡",
    format: (value) => `£${value} / year`,
  },
  {
    key: "number_of_occupants",
    label: "Occupants",
    icon: "👥",
    format: (value) => `${value} ${Number(value) === 1 ? "person" : "people"}`,
  },
  {
    key: "heating_system",
    label: "Heating System",
    icon: "🔥",
    format: capitalise,
  },
  {
    key: "solar_interest",
    label: "Solar Interest",
    icon: "☀️",
    format: capitalise,
  },
];
