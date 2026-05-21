import type { CollectedData } from "@/lib/types";
import { EMPTY_COLLECTED } from "@/lib/collected";

/**
 * Canned conversation used when `MOCK_MODE=true`. Bypasses Groq entirely
 * so the UI can be iterated on without consuming rate limits. Selecting a
 * turn is based on the count of user messages already in the conversation.
 */

export type MockTurn = {
  text: string;
  collected: CollectedData;
  bill_unknown: boolean;
  complete: boolean;
};

export const MOCK_TURNS: MockTurn[] = [
  {
    text: "Hi! Welcome to Ralico — I'll help you see if solar would be a good fit for your home. To start, what type of property is it: detached, semi-detached, terraced, or a flat?",
    collected: { ...EMPTY_COLLECTED },
    bill_unknown: false,
    complete: false,
  },
  {
    text: "A flat — great. Roughly how much do you pay for electricity each year?",
    collected: { ...EMPTY_COLLECTED, property_type: "flat" },
    bill_unknown: false,
    complete: false,
  },
  {
    text: "Around £1,200 a year — noted. How many people live in your flat?",
    collected: {
      ...EMPTY_COLLECTED,
      property_type: "flat",
      annual_electricity_bill_gbp: 1200,
    },
    bill_unknown: false,
    complete: false,
  },
  {
    text: "Three people — got it. What kind of heating system do you have: gas boiler, oil, LPG, electric, or something else?",
    collected: {
      ...EMPTY_COLLECTED,
      property_type: "flat",
      annual_electricity_bill_gbp: 1200,
      number_of_occupants: 3,
    },
    bill_unknown: false,
    complete: false,
  },
  {
    text: "Gas boiler. Last one — are you looking at just solar panels, or solar with battery storage?",
    collected: {
      ...EMPTY_COLLECTED,
      property_type: "flat",
      annual_electricity_bill_gbp: 1200,
      number_of_occupants: 3,
      heating_system: "gas boiler",
    },
    bill_unknown: false,
    complete: false,
  },
  {
    text: "Solar with battery — excellent. Thanks for the chat; we have everything we need to put your snapshot together.",
    collected: {
      property_type: "flat",
      annual_electricity_bill_gbp: 1200,
      number_of_occupants: 3,
      heating_system: "gas boiler",
      solar_interest: "solar plus battery storage",
    },
    bill_unknown: false,
    complete: true,
  },
];
