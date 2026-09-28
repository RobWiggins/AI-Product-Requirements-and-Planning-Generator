import dotenv from "dotenv";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { databaseUrl } from "./connection";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Single shared Prisma client for the API.
 *
 *   import { prisma } from "../db/prisma";
 *   const project = await prisma.project.findUnique({
 *     where: { id },
 *     include: { epics: { include: { userStories: true } } },
 *   });
 *
 * Prisma 7 talks to PostgreSQL through the `pg` driver adapter.
 */
const adapter = new PrismaPg({ connectionString: databaseUrl() });

export const prisma = new PrismaClient({ adapter });

export * from "../generated/prisma/client";
