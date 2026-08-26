import dotenv from "dotenv";
import { prisma } from "../lib/db";

dotenv.config();

async function run() {
  try {
    console.log("\nFetching recent Email Logs...");
    const logs = await prisma.emaillog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });
    console.log("Recent Email Logs count:", logs.length);
    console.log(JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error("Error fetching email logs:", error instanceof Error && error.message ? error.message : error);
  }
}

run().then(() => prisma.$disconnect());
