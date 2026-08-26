import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username || "root"),
    password: u.password ? decodeURIComponent(u.password) : undefined,
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: 5,
  };
}

const url = process.env.DATABASE_URL!;
const adapter = new PrismaMariaDb(parseDbUrl(url));
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.auditlog.count();
  console.log("Total auditlog entries in DB:", count);
  if (count > 0) {
    const logs = await prisma.auditlog.findMany({ take: 5 });
    console.log("Sample logs:", JSON.stringify(logs, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
