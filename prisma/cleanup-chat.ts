import { prisma } from "@/lib/db";

async function main() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  console.log("Cleaning up chat messages older than", cutoff.toISOString());
  const res = await prisma.chatsupportmessage.deleteMany({ where: { createdAt: { lt: cutoff } } });
  console.log("Deleted", res.count, "messages");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
