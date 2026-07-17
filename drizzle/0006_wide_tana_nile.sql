CREATE TABLE "usage_snapshot_batches" (
	"snapshot_row_id" uuid NOT NULL,
	"batch_index" integer NOT NULL,
	"batch_hash" text NOT NULL,
	"row_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usage_snapshot_batches_snapshot_row_id_batch_index_pk" PRIMARY KEY("snapshot_row_id","batch_index"),
	CONSTRAINT "usage_snapshot_batches_index_nonnegative" CHECK ("usage_snapshot_batches"."batch_index" >= 0),
	CONSTRAINT "usage_snapshot_batches_row_count_nonnegative" CHECK ("usage_snapshot_batches"."row_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "usage_snapshot_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_row_id" uuid NOT NULL,
	"batch_index" integer NOT NULL,
	"usage_date" date NOT NULL,
	"tool" "tool" NOT NULL,
	"model" text NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"cache_read_tokens" bigint DEFAULT 0 NOT NULL,
	"cache_write_tokens" bigint DEFAULT 0 NOT NULL,
	"total_tokens" bigint DEFAULT 0 NOT NULL,
	"estimated_cost_micros" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_snapshot_rows_batch_index_nonnegative" CHECK ("usage_snapshot_rows"."batch_index" >= 0)
);
--> statement-breakpoint
CREATE TABLE "usage_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"device_id" uuid NOT NULL,
	"snapshot_id" text NOT NULL,
	"revision" integer NOT NULL,
	"batch_count" integer NOT NULL,
	"cutover_date" date NOT NULL,
	"status" text DEFAULT 'receiving' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"committed_at" timestamp,
	CONSTRAINT "usage_snapshots_batch_count_positive" CHECK ("usage_snapshots"."batch_count" > 0),
	CONSTRAINT "usage_snapshots_revision_positive" CHECK ("usage_snapshots"."revision" > 0),
	CONSTRAINT "usage_snapshots_status_valid" CHECK ("usage_snapshots"."status" in ('receiving', 'committed'))
);
--> statement-breakpoint
ALTER TABLE "daily_usage" ADD COLUMN "accounting_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_usage" ADD COLUMN "snapshot_id" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "accounting_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "cutover_date" date;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "snapshot_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_snapshot_batches" ADD CONSTRAINT "usage_snapshot_batches_snapshot_row_id_usage_snapshots_id_fk" FOREIGN KEY ("snapshot_row_id") REFERENCES "public"."usage_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_snapshot_rows" ADD CONSTRAINT "usage_snapshot_rows_snapshot_row_id_usage_snapshots_id_fk" FOREIGN KEY ("snapshot_row_id") REFERENCES "public"."usage_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_snapshots" ADD CONSTRAINT "usage_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_snapshots" ADD CONSTRAINT "usage_snapshots_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "usage_snapshot_rows_unique_idx" ON "usage_snapshot_rows" USING btree ("snapshot_row_id","usage_date","tool","model");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_snapshots_device_snapshot_idx" ON "usage_snapshots" USING btree ("user_id","device_id","snapshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_snapshots_one_receiving_idx" ON "usage_snapshots" USING btree ("user_id","device_id") WHERE "usage_snapshots"."status" = 'receiving';--> statement-breakpoint
CREATE INDEX "usage_snapshots_status_idx" ON "usage_snapshots" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_usage_accounting_unique_idx" ON "daily_usage" USING btree ("user_id","device_id","usage_date","tool","model","accounting_version");
