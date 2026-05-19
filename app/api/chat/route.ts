import {
  createDataStreamResponse,
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

const MODEL = "llama-3.3-70b-versatile";

/** Phase 2 — the shape the extraction pass must return. */
const extractionSchema = z.object({
  property_type: z.string().nullable(),
  annual_electricity_bill_gbp: z.number().nullable(),
  number_of_occupants: z.number().int().nullable(),
  heating_system: z.string().nullable(),
  solar_interest: z.string().nullable(),
});

/** A CoreMessage's content can be a string or structured parts — flatten it. */
function asText(content: CoreMessage["content"]): string {
  return typeof content === "string" ? content : JSON.stringify(content);
}

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
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

  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        model: groq(MODEL),
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
              model: groq(MODEL),
              schema: extractionSchema,
              system: EXTRACTION_INSTRUCTIONS,
              temperature: 0,
              prompt:
                `Conversation so far:\n\n${transcript}\n\n` +
                `Extract each field's currently confirmed value, or null if it ` +
                `has not yet been confirmed by the homeowner.`,
            });

            // Safety merge — a field already confirmed in `currentCollected`
            // is never overwritten or regressed back to null.
            const merged = mergeCollected(collectedSoFar, object);

            dataStream.writeData({
              type: "collected",
              collected: merged,
              complete: isAssessmentComplete(merged),
            });
          } catch (error) {
            console.error("[api/chat] extraction failed:", error);
            // Best-effort: never lose ground — keep what was already collected.
            dataStream.writeData({
              type: "collected",
              collected: collectedSoFar,
              complete: isAssessmentComplete(collectedSoFar),
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
