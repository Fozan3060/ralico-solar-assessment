"use client";

import type { JSONValue } from "ai";
import { useEffect, useState } from "react";

import { EMPTY_COLLECTED } from "@/lib/collected";
import type { CollectedData } from "@/lib/types";

type CollectedPart = {
  collected: CollectedData;
  bill_unknown?: boolean;
  complete: boolean;
};
type ErrorPart = { message?: string };

/**
 * Parses the AI SDK `data` stream into the assessment's runtime state.
 *
 * Walks the stream in order and takes the latest of EACH part type
 * independently — without this, a fallback `collected` part written in
 * the same response as an `extraction_error` would mask the error.
 */
export function useStreamingState(data: JSONValue[] | undefined) {
  const [collected, setCollected] = useState<CollectedData>(EMPTY_COLLECTED);
  const [billUnknown, setBillUnknown] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    let latestCollectedIdx = -1;
    let latestErrorIdx = -1;
    let latestCollectedPart: CollectedPart | undefined;
    let latestErrorPart: ErrorPart | undefined;

    for (let i = 0; i < data.length; i++) {
      const part = data[i];
      if (!part || typeof part !== "object" || Array.isArray(part)) continue;
      if (part.type === "collected") {
        latestCollectedIdx = i;
        latestCollectedPart = part as unknown as CollectedPart;
      } else if (part.type === "extraction_error") {
        latestErrorIdx = i;
        latestErrorPart = part as unknown as ErrorPart;
      }
    }

    if (latestCollectedPart) {
      setCollected(latestCollectedPart.collected);
      setBillUnknown(Boolean(latestCollectedPart.bill_unknown));
      setIsComplete(Boolean(latestCollectedPart.complete));
    }
    if (latestErrorPart && latestErrorIdx > latestCollectedIdx) {
      setExtractionError(
        latestErrorPart.message ?? "Extraction failed — try again.",
      );
    } else if (latestCollectedIdx > -1) {
      setExtractionError(null);
    }
  }, [data]);

  return {
    collected,
    billUnknown,
    isComplete,
    extractionError,
    setExtractionError,
  };
}
