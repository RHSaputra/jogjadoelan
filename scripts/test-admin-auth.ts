import "dotenv/config";
import { prisma } from "../lib/db";
import bcrypt from "bcryptjs";

async function testAuthorize(usernameInput: string, passwordInput: string) {
  console.log(`\nTesting login for: "${usernameInput}" with password: "${passwordInput}"`);
  
  const loginId = usernameInput.trim();
  const admin = await prisma.adminuser.findFirst({
    where: {
      OR: [
        { username: loginId },
        { email: loginId.toLowerCase() },
      ],
    },
  });

  if (!admin) {
    console.log("-> GAGAL: Admin tidak ditemukan di database dengan username/email tersebut!");
    return null;
  }

  console.log("-> Admin ditemukan:", {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    aktif: admin.aktif,
    role: admin.role,
  });

  if (!admin.aktif) {
    console.log("-> GAGAL: Akun admin tidak aktif (aktif = false)!");
    return null;
  }

  const ok = await bcrypt.compare(passwordInput, admin.passwordHash);
  if (!ok) {
    console.log("-> GAGAL: Password salah! bcrypt.compare menghasilkan FALSE.");
    return null;
  }

  console.log("-> BERHASIL: Password cocok 100%! User payload:", {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
  });
  return admin;
}

async function main() {
  await testAuthorize("admin", "admin123");
  await testAuthorize("jogjadoelantechforlocal.id@gmail.com", "admin123");
  await testAuthorize("admin", "admin");
}

main().catch(console.error).finally(() => prisma.$disconnect());
