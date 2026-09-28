/**
 * Builds the PostgreSQL connection string from the PG* variables in
 * server/.env so both `pg` and Prisma share one source of truth.
 * A fully-formed DATABASE_URL, if present, takes precedence.
 */
export function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.PGHOST ?? "localhost";
  const port = process.env.PGPORT ?? "5432";
  const database = process.env.PGDATABASE ?? "";
  const user = encodeURIComponent(process.env.PGUSER ?? "");
  const password = encodeURIComponent(process.env.PGPASSWORD ?? "");

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}
