import path from "node:path";
import { config } from "dotenv";
import type { PrismaConfig } from "prisma";

config(); // load .env SEBELUM baca process.env

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL tidak ditemukan di .env");
}

export default {
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
} satisfies PrismaConfig;