import { z } from "zod";
import { hasAcceptedTotalTokens } from "../token-metrics";
import { TOOL_KEYS } from "../types";

const entrySchema = z
  .object({
    date: z.iso.date(),
    tool: z.enum(TOOL_KEYS),
    model: z.string().min(1).max(120),
    input: z.number().int().nonnegative(),
    output: z.number().int().nonnegative(),
    cacheRead: z.number().int().nonnegative(),
    cacheWrite: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (entry) => hasAcceptedTotalTokens(entry),
    "total must match the provider token total",
  );

const uploadSchema = z
  .object({
    deviceId: z.string().min(8).max(160),
    clientVersion: z.string().min(1).max(40),
    timezone: z.string().min(1).max(80),
    generatedAt: z.string().datetime(),
    entries: z.array(entrySchema).max(500),
  })
  .strict();

export type ParsedUploadPayload = z.infer<typeof uploadSchema>;

export function parseUploadPayload(input: unknown): ParsedUploadPayload {
  return uploadSchema.parse(input);
}
