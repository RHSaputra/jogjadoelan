import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  const adminUsers = await prisma.adminuser.findMany();
  const users = await prisma.user.findMany();
  const alamats = await prisma.alamat.findMany();
  const cabangs = await prisma.cabang.findMany();

  const invalidNumbers: { table: string; id: string; name: string; noHp: string }[] = [];

  const checkPhone = (table: string, id: string, name: string | null, noHp: string | null) => {
    if (!noHp) return;
    const isValid = /^08\d{8,11}$/.test(noHp);
    if (!isValid) {
      invalidNumbers.push({ table, id, name: name || "N/A", noHp });
    }
  };

  adminUsers.forEach((u) => checkPhone("adminuser", u.id, u.username, u.noHp));
  users.forEach((u) => checkPhone("user", u.id, u.username, u.noHp));
  alamats.forEach((a) => checkPhone("alamat", a.id, a.label, a.noHp));
  cabangs.forEach((c) => checkPhone("cabang", c.id, c.nama, c.noHp));

  console.log("INVALID PHONE NUMBERS FOUND:");
  console.table(invalidNumbers);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
