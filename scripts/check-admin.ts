import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  const admins = await prisma.adminuser.findMany({
    select: {
      id: true,
      username: true,
      aktif: true,
      role: true,
      passwordHash: true
    }
  });
  console.log('Admins in DB:', admins);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
