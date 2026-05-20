import {
  createDataStreamResponse,
  formatDataStreamPart,
  generateObject,
  streamText,
  type CoreMessage,
} from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";

import type { CollectedData } from "@/lib/types";
import { EXTRACTION_INSTRUCTIONS, SYSTEM_PROMPT } from "@/lib/prompts";
import {
  EMPTY_COLLECTED,
  isAssessmentComplete,
  mergeCollected,
} from "@/lib/collected";

// Two Groq round-trips per request (converse + extract). Groq is fast, but
// give the serverless function enough headroom.
export const maxDuration = 30;

// Split the model per phase to optimise the user-perceived latency:
//   - chat (streamed to the user)  → fast 8B model for snappy time-to-first-token
//   - extraction (runs after text)  → quality 70B model for reliable structured output
const CHAT_MODEL = "llama-3.1-8b-instant";
const EXTRACTION_MODEL = "llama-3.3-70b-versatile";

/** Phase 2 — the shape the extraction pass must return. */
const extractionSchema = z.object({
  property_type: z.string().nullable(),
  annual_electricity_bill_gbp: z.number().nullable(),
  number_of_occupants: z.number().int().nullable(),
  heating_system: z.string().nullable(),
  solar_interest: z.string().nullable(),
  bill_unknown: z.boolean(),
});

/** Canned conversation used when MOCK_MODE is enabled. */
type MockTurn = {
  text: string;
  collected: CollectedData;
  bill_unknown: boolean;
  complete: boolean;
};

const MOCK_TURNS: MockTurn[] = [
  {
    text:
      "Hi! Welcome to Ralico — I'll help you see if solar would be a good fit for your home. To start, what type of property is it: detached, semi-detached, terraced, or a flat?",
    collected: { ...EMPTY_COLLECTED },
    bill_unknown: false,
    complete: false,
  },
  {
    text:
      "A flat — great. Roughly how much do you pay for electricity each year?",
    collected: { ...EMPTY_COLLECTED, property_type: "flat" },
    bill_unknown: false,
    complete: false,
  },
  {
    text:
      "Around £1,200 a year — noted. How many people live in your flat?",
    collected: {
      ...EMPTY_COLLECTED,
      property_type: "flat",
      annual_electricity_bill_gbp: 1200,
    },
    bill_unknown: false,
    complete: false,
  },
  {
    text:
      "Three people — got it. What kind of heating system do you have: gas boiler, oil, LPG, electric, or something else?",
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
    text:
      "Gas boiler. Last one — are you looking at just solar panels, or solar with battery storage?",
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
    text:
      "Solar with battery — excellent. Thanks for the chat; we have everything we need to put your snapshot together.",
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

/** A CoreMessage's content can be a string or structured parts — flatten it. */
function asText(content: CoreMessage["content"]): string {
  return typeof content === "string" ? content : JSON.stringify(content);
}

export async function POST(req: Request) {
  // Read per-request so dev-mode env edits take effect without a restart.
  // Mock mode (MOCK_MODE=true in .env.local) bypasses Groq entirely and
  // returns a scripted 5-turn conversation — useful for UI iteration.
  const mockMode = process.env.MOCK_MODE === "true";

  if (!mockMode && !process.env.GROQ_API_KEY) {
    return Response.json(
      { error: "GROQ_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages, currentCollected } = (body ?? {}) as {
    messages?: CoreMessage[];
    currentCollected?: Partial<CollectedData>;
  };

  const conversation: CoreMessage[] = Array.isArray(messages) ? messages : [];
  // Whatever the client already had — the floor that fields can never drop below.
  const collectedSoFar: CollectedData = {
    ...EMPTY_COLLECTED,
    ...(currentCollected ?? {}),
  };

  // ── MOCK MODE ──────────────────────────────────────────────────────────
  // Bypass Groq entirely and return a scripted streaming response so the UI
  // can be iterated on without consuming rate limits. The turn is picked
  // from the count of user messages already in the conversation.
  if (mockMode) {
    const userMessageCount = conversation.filter(
      (m) => m.role === "user",
    ).length;
    const turnIndex = Math.max(0, userMessageCount - 1);
    const mock = MOCK_TURNS[Math.min(turnIndex, MOCK_TURNS.length - 1)];

    return createDataStreamResponse({
      execute: async (dataStream) => {
        // Word-by-word streaming so the "streaming text" UX is preserved.
        const words = mock.text.split(/(\s+)/).filter(Boolean);
        for (const word of words) {
          dataStream.write(formatDataStreamPart("text", word));
          await new Promise((resolve) => setTimeout(resolve, 45));
        }

        // The panel update — same shape the real route emits.
        dataStream.writeData({
          type: "collected",
          collected: mock.collected,
          bill_unknown: mock.bill_unknown,
          complete: mock.complete,
        });
      },
    });
  }

  // ── REAL MODE ──────────────────────────────────────────────────────────
  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        model: groq(CHAT_MODEL),
        system: SYSTEM_PROMPT,
        messages: conversation,
        temperature: 0.6,
        // Phase 2: once the reply is fully generated, re-read the entire
        // conversation and extract the current state of all five fields.
        onFinish: async ({ text }) => {
          try {
            const transcript = [
              ...conversation.map(
                (m) =>
                  `${m.role === "user" ? "User" : "Assistant"}: ${asText(
                    m.content,
                  )}`,
              ),
              `Assistant: ${text}`,
            ].join("\n");

            const { object } = await generateObject({
              model: groq(EXTRACTION_MODEL),
              schema: extractionSchema,
              system: EXTRACTION_INSTRUCTIONS,
              temperature: 0,
              prompt:
                `Conversation so far:\n\n${transcript}\n\n` +
                `Extract each field's currently confirmed value, or null if it ` +
                `has not yet been confirmed by the homeowner.`,
            });

            // Pull the "metadata" flag out; the rest is regular CollectedData.
            const { bill_unknown, ...collectedFromExtraction } = object;

            // Safety merge — a field already confirmed in `currentCollected`
            // is never overwritten or regressed back to null.
            const merged = mergeCollected(collectedSoFar, collectedFromExtraction);

            dataStream.writeData({
              type: "collected",
              collected: merged,
              bill_unknown,
              complete: isAssessmentComplete(merged, bill_unknown),
            });
          } catch (error) {
            console.error("[api/chat] extraction failed:", error);
            // Surface the failure to the client so the panel doesn't silently
            // stay frozen — the user should see WHY their answer didn't land.
            // We deliberately do NOT also write a `collected` data part on
            // failure; the client retains its previous state from the last
            // successful extraction without us having to send a stale copy.
            const raw =
              error instanceof Error ? error.message : String(error);
            // Pull the human-friendly Groq message out of the wrapped payload
            // if present, otherwise fall back to the raw error string.
            let message = raw;
            const groqMatch = raw.match(
              /"message"\s*:\s*"((?:[^"\\]|\\.)*)"/,
            );
            if (groqMatch) message = groqMatch[1].replace(/\\"/g, '"');
            dataStream.writeData({
              type: "extraction_error",
              message,
            });
          }
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (error) => {
      console.error("[api/chat] stream error:", error);
      return "Sorry — something went wrong generating a response. Please try again.";
    },
  });
}
