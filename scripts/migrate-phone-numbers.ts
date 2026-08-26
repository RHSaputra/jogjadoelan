import "dotenv/config";
import { prisma } from "../lib/db";
import { normalizeNoHp } from "../lib/phone-utils";

async function main() {
  console.log("Starting phone number migration...");

  // Migrasi User
  const users = await prisma.user.findMany({
    where: { noHp: { startsWith: "62" } },
  });
  let userCount = 0;
  for (const u of users) {
    if (!u.noHp) continue;
    const updated = normalizeNoHp(u.noHp);
    if (updated !== u.noHp) {
      await prisma.user.update({
        where: { id: u.id },
        data: { noHp: updated },
      });
      userCount++;
    }
  }
  console.log(`Migrated ${userCount} Users.`);

  // Migrasi AdminUser
  const admins = await prisma.adminuser.findMany({
    where: { noHp: { startsWith: "62" } },
  });
  let adminCount = 0;
  for (const a of admins) {
    if (!a.noHp) continue;
    const updated = normalizeNoHp(a.noHp);
    if (updated !== a.noHp) {
      await prisma.adminuser.update({
        where: { id: a.id },
        data: { noHp: updated },
      });
      adminCount++;
    }
  }
  console.log(`Migrated ${adminCount} AdminUsers.`);

  // Migrasi Alamat
  const alamats = await prisma.alamat.findMany({
    where: { noHp: { startsWith: "62" } },
  });
  let alamatCount = 0;
  for (const a of alamats) {
    if (!a.noHp) continue;
    const updated = normalizeNoHp(a.noHp);
    if (updated !== a.noHp) {
      await prisma.alamat.update({
        where: { id: a.id },
        data: { noHp: updated },
      });
      alamatCount++;
    }
  }
  console.log(`Migrated ${alamatCount} Alamats.`);

  // Migrasi Cabang (toko configuration)
  const tokos = await prisma.cabang.findMany({
    where: { noHp: { startsWith: "62" } },
  });
  let cabangCount = 0;
  for (const c of tokos) {
    const updated = normalizeNoHp(c.noHp || "");
    if (updated !== c.noHp) {
      await prisma.cabang.update({
        where: { id: c.id },
        data: { noHp: updated },
      });
      cabangCount++;
    }
  }
  console.log(`Migrated ${cabangCount} Cabangs.`);
  
  console.log("Migration complete.");
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
