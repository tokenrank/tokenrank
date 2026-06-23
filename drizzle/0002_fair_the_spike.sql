CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_usage_input_tokens_nonnegative'
      AND conrelid = 'public.daily_usage'::regclass
  ) THEN
    ALTER TABLE "daily_usage" ADD CONSTRAINT "daily_usage_input_tokens_nonnegative" CHECK ("daily_usage"."input_tokens" >= 0);
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_usage_output_tokens_nonnegative'
      AND conrelid = 'public.daily_usage'::regclass
  ) THEN
    ALTER TABLE "daily_usage" ADD CONSTRAINT "daily_usage_output_tokens_nonnegative" CHECK ("daily_usage"."output_tokens" >= 0);
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_usage_cache_read_tokens_nonnegative'
      AND conrelid = 'public.daily_usage'::regclass
  ) THEN
    ALTER TABLE "daily_usage" ADD CONSTRAINT "daily_usage_cache_read_tokens_nonnegative" CHECK ("daily_usage"."cache_read_tokens" >= 0);
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_usage_cache_write_tokens_nonnegative'
      AND conrelid = 'public.daily_usage'::regclass
  ) THEN
    ALTER TABLE "daily_usage" ADD CONSTRAINT "daily_usage_cache_write_tokens_nonnegative" CHECK ("daily_usage"."cache_write_tokens" >= 0);
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_usage_total_tokens_nonnegative'
      AND conrelid = 'public.daily_usage'::regclass
  ) THEN
    ALTER TABLE "daily_usage" ADD CONSTRAINT "daily_usage_total_tokens_nonnegative" CHECK ("daily_usage"."total_tokens" >= 0);
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_usage_estimated_cost_micros_nonnegative'
      AND conrelid = 'public.daily_usage'::regclass
  ) THEN
    ALTER TABLE "daily_usage" ADD CONSTRAINT "daily_usage_estimated_cost_micros_nonnegative" CHECK ("daily_usage"."estimated_cost_micros" >= 0);
  END IF;
END $$;
