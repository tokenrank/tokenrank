import { neon } from "@neondatabase/serverless";

const apply = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = neon(databaseUrl);

const rawTotalExpression = `
  CASE
    WHEN "tool" = 'codex' THEN "input_tokens" + "output_tokens"
    ELSE "input_tokens" + "output_tokens" + "cache_read_tokens" + "cache_write_tokens"
  END
`;

const mismatchedRows = await sql.query(`
  SELECT "tool", COUNT(*)::int AS "rows"
  FROM "daily_usage"
  WHERE "total_tokens" IS DISTINCT FROM ${rawTotalExpression}
  GROUP BY "tool"
  ORDER BY "rows" DESC, "tool" ASC
`);

console.log(JSON.stringify({ mode: apply ? "apply" : "check", mismatchedRows }, null, 2));

if (!apply || mismatchedRows.length === 0) {
  process.exit(0);
}

const updatedRows = await sql.query(`
  WITH updated AS (
    UPDATE "daily_usage"
    SET "total_tokens" = ${rawTotalExpression}
    WHERE "total_tokens" IS DISTINCT FROM ${rawTotalExpression}
    RETURNING "tool"
  )
  SELECT "tool", COUNT(*)::int AS "rows"
  FROM updated
  GROUP BY "tool"
  ORDER BY "rows" DESC, "tool" ASC
`);

console.log(JSON.stringify({ updatedRows }, null, 2));
