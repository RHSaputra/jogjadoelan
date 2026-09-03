import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

async function main() {
  const adapter = new PrismaMariaDb({
    host: "localhost",
    port: 3306,
    user: "root",
    database: "jogjadoelan_db",
    connectionLimit: 2,
  });
  const p = new PrismaClient({ adapter });

  console.log("=== CHECKING ALL LOCAL MYSQL TABLES ===");
  const models = Object.keys(p).filter((k) => !k.startsWith("$") && !k.startsWith("_"));
  for (const m of models) {
    try {
      const count = await (p as any)[m].count();
      if (count > 0) {
        console.log(`Table '${m}': ${count} rows`);
      }
    } catch (e) {}
  }
  await p.$disconnect();
}

main().catch(console.error);
