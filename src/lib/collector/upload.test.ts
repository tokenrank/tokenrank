import { describe, expect, it } from "vitest";
import { parseUploadPayload } from "./upload";
import { TOOL_KEYS } from "../types";

const CONTENT_FIELD_KEYS = ["prompt", "content", "code"] as const;

describe("parseUploadPayload", () => {
  it("accepts valid aggregate rows", () => {
    const parsed = parseUploadPayload({
      deviceId: "device-1",
      clientVersion: "0.1.0",
      timezone: "Asia/Shanghai",
      generatedAt: "2026-06-22T12:00:00.000Z",
      entries: [
        {
          date: "2026-06-22",
          tool: "codex",
          model: "gpt-5.5",
          input: 100,
          output: 50,
          cacheRead: 200,
          cacheWrite: 10,
          total: 360,
        },
      ],
    });

    expect(parsed.entries[0].total).toBe(360);
  });

  it("accepts Codex provider totals that already include cached input", () => {
    const parsed = parseUploadPayload({
      deviceId: "device-1",
      clientVersion: "0.1.0",
      timezone: "Asia/Shanghai",
      generatedAt: "2026-06-22T12:00:00.000Z",
      entries: [
        {
          date: "2026-06-22",
          tool: "codex",
          model: "gpt-5.5",
          input: 1_000,
          output: 200,
          cacheRead: 800,
          cacheWrite: 0,
          total: 1_200,
        },
      ],
    });

    expect(parsed.entries[0].total).toBe(1_200);
  });

  it.each(CONTENT_FIELD_KEYS)("rejects top-level content field %s", (field) => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-1",
        clientVersion: "0.1.0",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-06-22T12:00:00.000Z",
        entries: [],
        [field]: "do not upload this",
      }),
    ).toThrow();
  });

  it.each(CONTENT_FIELD_KEYS)("rejects entry-level content field %s", (field) => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-1",
        clientVersion: "0.1.0",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-06-22T12:00:00.000Z",
        entries: [
          {
            date: "2026-06-22",
            tool: "codex",
            model: "gpt-5.5",
            input: 100,
            output: 50,
            cacheRead: 200,
            cacheWrite: 10,
            total: 360,
            [field]: "do not upload this",
          },
        ],
      }),
    ).toThrow();
  });

  it("accepts every supported tool", () => {
    const parsed = parseUploadPayload({
      deviceId: "device-1",
      clientVersion: "0.1.0",
      timezone: "Asia/Shanghai",
      generatedAt: "2026-06-22T12:00:00.000Z",
      entries: TOOL_KEYS.map((tool) => ({
        date: "2026-06-22",
        tool,
        model: `${tool}-demo`,
        input: 1,
        output: 2,
        cacheRead: 3,
        cacheWrite: 4,
        total: 10,
      })),
    });

    expect(parsed.entries).toHaveLength(TOOL_KEYS.length);
  });

  it("rejects unsupported tools", () => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-1",
        clientVersion: "0.1.0",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-06-22T12:00:00.000Z",
        entries: [
          {
            date: "2026-06-22",
            tool: "unknown",
            model: "model",
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            total: 0,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects negative counts", () => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-1",
        clientVersion: "0.1.0",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-06-22T12:00:00.000Z",
        entries: [
          {
            date: "2026-06-22",
            tool: "codex",
            model: "model",
            input: -1,
            output: 1,
            cacheRead: 0,
            cacheWrite: 0,
            total: 0,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects total mismatches", () => {
    expect(() =>
      parseUploadPayload({
        deviceId: "device-1",
        clientVersion: "0.1.0",
        timezone: "Asia/Shanghai",
        generatedAt: "2026-06-22T12:00:00.000Z",
        entries: [
          {
            date: "2026-06-22",
            tool: "codex",
            model: "model",
            input: 1,
            output: 2,
            cacheRead: 3,
            cacheWrite: 4,
            total: 11,
          },
        ],
      }),
    ).toThrow();
  });

  it.each(["2026-99-99", "2026-02-31"] as const)(
    "rejects invalid calendar date %s",
    (date) => {
      expect(() =>
        parseUploadPayload({
          deviceId: "device-1",
          clientVersion: "0.1.0",
          timezone: "Asia/Shanghai",
          generatedAt: "2026-06-22T12:00:00.000Z",
          entries: [
            {
              date,
              tool: "codex",
              model: "model",
              input: 1,
              output: 2,
              cacheRead: 3,
              cacheWrite: 4,
              total: 10,
            },
          ],
        }),
      ).toThrow();
    },
  );
});
