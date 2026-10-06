/**
 * Rolls back Prisma migrations using each folder's down.sql, then removes
 * those rows from `_prisma_migrations` so `prisma migrate deploy` can re-apply.
 *
 *   npm run prisma:rollback --workspace=server           # latest only
 *   npm run prisma:rollback --workspace=server -- --to 0 # all the way
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Client } from "pg";
import { databaseUrl } from "../src/db/connection";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const migrationsDir = path.resolve(__dirname, "../prisma/migrations");

function toZero(): boolean {
  const args = process.argv.slice(2);
  const to = args.indexOf("--to");
  return (to >= 0 && args[to + 1] === "0") || args.includes("--to=0") || args.includes("--all");
}

async function applied(client: Client): Promise<string[]> {
  const { rows } = await client.query<{ migration_name: string }>(
    `SELECT migration_name
     FROM _prisma_migrations
     WHERE rolled_back_at IS NULL AND finished_at IS NOT NULL
     ORDER BY finished_at DESC`,
  );
  return rows.map((r) => r.migration_name);
}

function downSql(name: string): string {
  const downPath = path.join(migrationsDir, name, "down.sql");
  if (!fs.existsSync(downPath)) {
    throw new Error(`No down.sql for ${name}`);
  }
  return fs.readFileSync(downPath, "utf8");
}

async function rollback(client: Client, name: string): Promise<void> {
  console.log(`Rolling back ${name}`);
  await client.query(downSql(name));
  await client.query(`DELETE FROM _prisma_migrations WHERE migration_name = $1`, [name]);
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();

  try {
    const names = await applied(client);
    const targets = toZero() ? names : names.slice(0, 1);
    if (targets.length === 0) {
      console.error("No applied migrations to roll back.");
      process.exitCode = 1;
      return;
    }

    await client.query("BEGIN");
    try {
      for (const name of targets) await rollback(client, name);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    console.log(toZero() ? "Rolled back to migration 0" : `Rolled back ${targets[0]}`);
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
