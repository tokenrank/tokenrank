UPDATE "daily_usage"
SET "total_tokens" = CASE
  WHEN "tool" = 'codex' THEN GREATEST(0, "input_tokens" - "cache_read_tokens") + "output_tokens"
  ELSE "input_tokens" + "output_tokens"
END
WHERE "total_tokens" IS DISTINCT FROM CASE
  WHEN "tool" = 'codex' THEN GREATEST(0, "input_tokens" - "cache_read_tokens") + "output_tokens"
  ELSE "input_tokens" + "output_tokens"
END;
