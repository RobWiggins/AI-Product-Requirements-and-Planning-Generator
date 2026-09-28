// Prisma CLI configuration (prisma generate / migrate / db pull / studio).
// Runtime connections are configured separately in src/db/prisma.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";
import { databaseUrl } from "./src/db/connection";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl(),
  },
});
