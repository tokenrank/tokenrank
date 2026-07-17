import { z } from "zod";
import { hasAcceptedTotalTokens } from "../token-metrics";
import { TOOL_KEYS } from "../types";

// Keep every downstream JS sum and estimated-cost multiplication inside the
// safe-integer range. Current pricing coefficients sum to less than 128.
const MAX_TOKEN_COMPONENT = Math.floor(Number.MAX_SAFE_INTEGER / 128);
const tokenComponentSchema = z.number().int().nonnegative().max(MAX_TOKEN_COMPONENT);
const tokenTotalSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

const entrySchema = z
  .object({
    date: z.iso.date(),
    tool: z.enum(TOOL_KEYS),
    model: z.string().min(1).max(120),
    input: tokenComponentSchema,
    output: tokenComponentSchema,
    cacheRead: tokenComponentSchema,
    cacheWrite: tokenComponentSchema,
    total: tokenTotalSchema,
  })
  .strict()
  .refine(
    (entry) => hasAcceptedTotalTokens(entry),
    "total must match the provider token total",
  );

const uploadBaseSchema = z.object({
  deviceId: z.string().min(8).max(160),
  clientVersion: z.string().min(1).max(40),
  timezone: z.string().min(1).max(80),
  generatedAt: z.string().datetime(),
  entries: z
    .array(entrySchema)
    .max(500)
    .superRefine((entries, context) => {
      const keys = new Set<string>();

      for (const [index, entry] of entries.entries()) {
        const key = `${entry.date}\u0000${entry.tool}\u0000${entry.model}`;

        if (keys.has(key)) {
          context.addIssue({
            code: "custom",
            message: "entries must not contain duplicate date, tool, and model keys",
            path: [index],
          });
        }

        keys.add(key);
      }
    }),
});

const legacyUploadSchema = uploadBaseSchema.strict();

const fullUploadSchema = uploadBaseSchema
  .extend({
    accountingVersion: z.literal(2),
    syncMode: z.literal("full"),
    snapshotId: z
      .string()
      .min(8)
      .max(160)
      .regex(/^[A-Za-z0-9_-]+$/),
    cutoverDate: z.iso.date(),
    batchHash: z.string().regex(/^[a-f0-9]{64}$/),
    batchIndex: z.number().int().nonnegative(),
    batchCount: z.number().int().positive().max(100),
  })
  .strict()
  .refine((payload) => payload.batchIndex < payload.batchCount, {
    message: "batchIndex must be less than batchCount",
    path: ["batchIndex"],
  })
  .refine(
    (payload) => payload.entries.every((entry) => entry.date >= payload.cutoverDate),
    {
      message: "full snapshot entries must be on or after cutoverDate",
      path: ["entries"],
    }
  );

const incrementalUploadSchema = uploadBaseSchema
  .extend({
    accountingVersion: z.literal(2),
    syncMode: z.literal("incremental"),
  })
  .strict();

const uploadSchema = z.union([
  fullUploadSchema,
  incrementalUploadSchema,
  legacyUploadSchema,
]);

export type ParsedUploadPayload = z.infer<typeof uploadSchema>;
export type ParsedV2UploadPayload =
  | z.infer<typeof fullUploadSchema>
  | z.infer<typeof incrementalUploadSchema>;
export type UploadSyncOptions =
  | {
      accountingVersion: 2;
      syncMode: "full";
      snapshotId: string;
      cutoverDate: string;
      batchHash: string;
      batchIndex: number;
      batchCount: number;
    }
  | {
      accountingVersion: 2;
      syncMode: "incremental";
    };

export function isV2UploadPayload(
  payload: ParsedUploadPayload,
): payload is ParsedV2UploadPayload {
  return "accountingVersion" in payload && payload.accountingVersion === 2;
}

export function toUploadSyncOptions(payload: ParsedV2UploadPayload): UploadSyncOptions {
  return payload.syncMode === "full"
    ? {
        accountingVersion: 2,
        syncMode: "full",
        snapshotId: payload.snapshotId,
        cutoverDate: payload.cutoverDate,
        batchHash: payload.batchHash,
        batchIndex: payload.batchIndex,
        batchCount: payload.batchCount,
      }
    : {
        accountingVersion: 2,
        syncMode: "incremental",
      };
}

export async function hashUploadEntries(entries: readonly unknown[]): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(entries));
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function parseUploadPayload(input: unknown): ParsedUploadPayload {
  return uploadSchema.parse(input);
}
