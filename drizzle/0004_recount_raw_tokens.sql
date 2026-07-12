UPDATE "daily_usage"
SET "total_tokens" = CASE
  WHEN "tool" = 'codex' THEN "input_tokens" + "output_tokens"
  ELSE "input_tokens" + "output_tokens" + "cache_read_tokens" + "cache_write_tokens"
END
WHERE "total_tokens" IS DISTINCT FROM CASE
  WHEN "tool" = 'codex' THEN "input_tokens" + "output_tokens"
  ELSE "input_tokens" + "output_tokens" + "cache_read_tokens" + "cache_write_tokens"
END;
