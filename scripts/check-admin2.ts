import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { URL } from "url";

const dbUrl = "mysql://root@127.0.0.1:3306/jogjadoelan_db";
const u = new URL(dbUrl);
const adapter = new PrismaMariaDb({
    host: u.hostname,
    port: 3306,
    user: "root",
    database: "jogjadoelan_db",
    connectionLimit: 1
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const admins = await prisma.adminuser.findMany();
  console.log('Admins in DB:', admins);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
